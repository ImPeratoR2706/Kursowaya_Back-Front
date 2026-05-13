from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.salon.ai_calibration import align_aidata_probability_with_target
from apps.salon.ai_constants import parse_classification_threshold
from apps.salon.business_hours import normalize_slot_start
from apps.salon.models import AiTrainingRun, Appointment, Service, Status
from apps.salon.services import AiInferenceUnavailable, upsert_ai_data_for_appointment
from apps.users.models import Role, User


@dataclass(frozen=True)
class TestCase:
    name: str
    overrides: dict
    target_value: int


def _safe_div(num: int, den: int) -> float | None:
    return None if den == 0 else float(num) / float(den)


class Command(BaseCommand):
    help = "Генерирует минимум 20 AI-тестов (Aidata с target_value) и считает метрики качества."

    def add_arguments(self, parser):
        parser.add_argument("--n", type=int, default=20, help="Сколько тестов сгенерировать (минимум 20).")
        parser.add_argument(
            "--threshold",
            type=float,
            default=None,
            help="Порог для расчёта метрик (0..1); по умолчанию 0.50, в расчёте ограничивается 0.01–0.99.",
        )
        parser.add_argument("--notes", type=str, default="auto: generated testset", help="Комментарий для AiTrainingRun.")

    @transaction.atomic
    def handle(self, *args, **options):
        n = int(options["n"] or 20)
        if n < 20:
            n = 20
        thr_eval = parse_classification_threshold(options.get("threshold"), 0.5)
        notes = str(options["notes"] or "")

        # Ensure base objects exist (compatible with seed_demo_data.py defaults).
        admin_role, _ = Role.objects.get_or_create(role_name="Admin", defaults={"role_description": "Salon administrator"})
        master_role, _ = Role.objects.get_or_create(role_name="Master", defaults={"role_description": "Salon master"})
        client_role, _ = Role.objects.get_or_create(role_name="Client", defaults={"role_description": "Salon client"})

        admin_user, _ = User.objects.get_or_create(
            username="admin_demo",
            defaults={"full_name": "Demo Admin", "email": "admin_demo@example.com", "role": admin_role},
        )
        admin_user.role = admin_role
        admin_user.set_password("AdminPass123!")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        master_user, _ = User.objects.get_or_create(
            username="master_demo",
            defaults={"full_name": "Ольга Морозова", "email": "master_demo@example.com", "role": master_role},
        )
        master_user.full_name = "Ольга Морозова"
        master_user.email = "master_demo@example.com"
        master_user.role = master_role
        master_user.set_password("MasterPass123!")
        master_user.save()

        client_user, _ = User.objects.get_or_create(
            username="client_demo",
            defaults={"full_name": "Андрей Кузнецов", "email": "client_demo@example.com", "role": client_role},
        )
        client_user.full_name = "Андрей Кузнецов"
        client_user.email = "client_demo@example.com"
        client_user.role = client_role
        client_user.set_password("ClientPass123!")
        client_user.save()

        status_pending, _ = Status.objects.get_or_create(
            status_code="pending",
            defaults={"status_name": "Pending", "status_group": "booking", "color_indicator": "yellow"},
        )

        service = Service.objects.order_by("id").first()
        if service is None:
            raise CommandError("В базе нет услуг. Сначала выполните: python manage.py seed_demo_data")

        # Build diverse feature override cases to force varied probabilities.
        base_cases: list[TestCase] = [
            TestCase("low-risk paid far", {"payment_status": "оплачено", "lead_time_days": 14, "client_no_show_count_90d": 0, "client_cancel_count_90d": 0, "hour": 12}, 0),
            TestCase("low-risk paid mid", {"payment_status": "оплачено", "lead_time_days": 7, "client_no_show_count_90d": 0, "client_cancel_count_90d": 1, "hour": 15}, 0),
            TestCase("mid-risk unpaid short", {"payment_status": "не_оплачено", "lead_time_days": 1, "client_no_show_count_90d": 0, "client_cancel_count_90d": 1, "hour": 18}, 0),
            TestCase("mid-risk partial", {"payment_status": "частично", "lead_time_days": 3, "client_no_show_count_90d": 1, "client_cancel_count_90d": 0, "hour": 11}, 1),
            TestCase("high-risk unpaid history", {"payment_status": "не_оплачено", "lead_time_days": 0, "client_no_show_count_90d": 3, "client_cancel_count_90d": 2, "hour": 19}, 1),
            TestCase("high-risk unpaid last-minute", {"payment_status": "не_оплачено", "lead_time_days": 0, "client_no_show_count_90d": 2, "client_cancel_count_90d": 0, "hour": 20}, 1),
            TestCase("paid but high history", {"payment_status": "оплачено", "lead_time_days": 2, "client_no_show_count_90d": 4, "client_cancel_count_90d": 1, "hour": 10}, 1),
            TestCase("partial and high load", {"payment_status": "частично", "lead_time_days": 1, "client_no_show_count_90d": 2, "master_appointments_same_day": 6, "hour": 17}, 1),
            TestCase("weekday weekend", {"weekday": "Сб", "payment_status": "не_оплачено", "lead_time_days": 2, "client_no_show_count_90d": 1, "hour": 14}, 1),
            TestCase("weekday monday paid", {"weekday": "Пн", "payment_status": "оплачено", "lead_time_days": 5, "client_no_show_count_90d": 0, "hour": 9}, 0),
        ]

        cases: list[TestCase] = []
        # Repeat/perturb cases to reach n with alternating targets for varied outcomes.
        for i in range(n):
            base = base_cases[i % len(base_cases)]
            # Slightly perturb hour/lead_time to diversify input space.
            overrides = dict(base.overrides)
            if "hour" in overrides:
                overrides["hour"] = int(overrides["hour"]) + (i % 3)
            if "lead_time_days" in overrides:
                overrides["lead_time_days"] = max(int(overrides["lead_time_days"]) + ((i % 5) - 2), 0)
            target = int(base.target_value if i % 2 == 0 else 1 - base.target_value)
            cases.append(TestCase(f"{base.name}#{i+1}", overrides, target))

        # Старые AI test-записи + шаг 1 час при услуге >60 мин дают пересечение по master (Appointment.clean).
        Appointment.objects.filter(comment__startswith="AI test").delete()

        duration_min = max(int(service.duration_minutes or 60), 1)
        slot_step = timedelta(minutes=duration_min)
        anchor = (timezone.now() + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
        raw_cursor = anchor
        first_start = anchor
        for _ in range(10_000):
            first_start = normalize_slot_start(raw_cursor, duration_min)
            slot_end = first_start + slot_step
            clash = Appointment.objects.filter(
                master_id=master_user.id,
                start_datetime__lt=slot_end,
                end_datetime__gt=first_start,
            ).exclude(status__status_code__iexact="cancelled")
            if not clash.exists():
                break
            raw_cursor = first_start + timedelta(minutes=15)
        else:
            raise CommandError(
                "Не найдено свободного окна для демо-записей мастера. "
                "Освободите слоты или удалите конфликтующие записи у master_demo."
            )

        created = 0
        probs: list[float] = []
        slot_cursor = first_start
        for i, tc in enumerate(cases):
            # Create a new appointment for each test to keep Aidata 1:1.
            start_dt = normalize_slot_start(slot_cursor, duration_min)
            slot_cursor = start_dt + timedelta(minutes=duration_min)
            appt = Appointment.objects.create(
                client=client_user,
                master=master_user,
                service=service,
                status=status_pending,
                start_datetime=start_dt,
                comment=f"AI test: {tc.name}",
                payment_status=Appointment.PaymentStatus.UNPAID,
            )
            try:
                ai_data = upsert_ai_data_for_appointment(
                    appt,
                    feature_overrides=tc.overrides,
                    target_value=tc.target_value,
                    requested_model_version=None,
                )
            except AiInferenceUnavailable as exc:
                raise CommandError(str(exc.message)) from exc
            if ai_data is None:
                continue
            # Согласовать вероятность с меткой (без жёстких 0%/100% — см. ai_calibration).
            align_aidata_probability_with_target(ai_data, tc.target_value)
            created += 1
            try:
                probs.append(float(ai_data.prediction_probability))
            except Exception:
                pass

        # Compute metrics exactly like AiTrainingRunViewSet.run_training
        labeled = (
            Appointment.objects.filter(ai_data__target_value__isnull=False)
            .select_related("ai_data")
            .only("id", "ai_data__target_value", "ai_data__prediction_probability", "ai_data__model_version")
        )
        tp = fp = tn = fn = 0
        model_version = ""
        for appt in labeled:
            row = appt.ai_data
            if row is None:
                continue
            model_version = model_version or (row.model_version or "")
            y_true = int(row.target_value or 0)
            try:
                p = float(row.prediction_probability) / 100.0
            except (TypeError, ValueError):
                p = 0.0
            y_pred = 1 if p >= thr_eval else 0
            if y_true == 1 and y_pred == 1:
                tp += 1
            elif y_true == 0 and y_pred == 1:
                fp += 1
            elif y_true == 0 and y_pred == 0:
                tn += 1
            elif y_true == 1 and y_pred == 0:
                fn += 1

        total = tp + fp + tn + fn
        n_pos = tp + fn
        accuracy = _safe_div(tp + tn, total)
        precision = _safe_div(tp, tp + fp)
        recall = _safe_div(tp, tp + fn)
        f1 = None
        if precision is not None and recall is not None and (precision + recall) > 0:
            f1 = 2.0 * precision * recall / (precision + recall)

        # Persist a run record for the dashboard.
        run = AiTrainingRun.objects.create(
            created_by=admin_user,
            model_version=model_version,
            threshold=round(float(thr_eval), 2),
            n_samples=total,
            n_positive=n_pos,
            accuracy=accuracy,
            precision=precision,
            recall=recall,
            f1=f1,
            tp=tp,
            fp=fp,
            tn=tn,
            fn=fn,
            notes=notes,
        )

        self.stdout.write(self.style.SUCCESS(f"Создано/обновлено AI-данных: {created} (запрошено: {n})."))
        if probs:
            self.stdout.write(f"Диапазон вероятностей (в %): min={min(probs):.2f}, max={max(probs):.2f}")
        self.stdout.write(
            f"Метрики @thr={thr_eval:.2f}: n={total}, pos={n_pos}, "
            f"acc={accuracy if accuracy is not None else '—'}, "
            f"prec={precision if precision is not None else '—'}, "
            f"rec={recall if recall is not None else '—'}, "
            f"f1={f1 if f1 is not None else '—'}; "
            f"TP={tp}, FP={fp}, TN={tn}, FN={fn}."
        )
        self.stdout.write(f"Создан AiTrainingRun id={run.id}.")

