"""
20 обучающих клиентов (мужские ФИО), логин = email вида surname.i@mail.ru, пароль surname123!
У каждого ~20 записей с разным профилем статусов; время слотов разнесено по мастерам.
Не создаёт «Иванов Иван». Повторный запуск: --replace удаляет прежних trainclient_*.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.salon.business_hours import normalize_slot_start
from apps.salon.models import Appointment, Service, Status
from apps.users.models import Role, User

# (фамилия, имя, латиница фамилии, первая буква имени латиницей) — без Иванова Ивана
CLIENT_DEFS: list[tuple[str, str, str, str]] = [
    ("Петров", "Алексей", "petrov", "a"),
    ("Сидоров", "Михаил", "sidorov", "m"),
    ("Новиков", "Сергей", "novikov", "s"),
    ("Волков", "Виктор", "volkov", "v"),
    ("Алексеев", "Григорий", "alekseev", "g"),
    ("Лебедев", "Егор", "lebedev", "e"),
    ("Семёнов", "Артём", "semyonov", "a"),
    ("Егоров", "Роман", "egorov", "r"),
    ("Павлов", "Степан", "pavlov", "s"),
    ("Кузнецов", "Борис", "kuznetsov", "b"),
    ("Соловьёв", "Денис", "solovyov", "d"),
    ("Васильев", "Константин", "vasilyev", "k"),
    ("Зайцев", "Олег", "zaytsev", "o"),
    ("Попов", "Максим", "popov", "m"),
    ("Соколов", "Даниил", "sokolov", "d"),
    ("Михайлов", "Игорь", "mikhaylov", "i"),
    ("Фёдоров", "Пётр", "fyodorov", "p"),
    ("Николаев", "Станислав", "nikolaev", "s"),
    ("Орлов", "Павел", "orlov", "p"),
    ("Гришин", "Владимир", "grishin", "v"),
]


def _status_pattern(client_index: int) -> list[str]:
    """20 кодов статуса на клиента — у всех разный «портрет»."""
    n = 20
    p = client_index
    codes = ("pending", "confirmed", "completed", "cancelled", "no_show")
    patterns: list[list[str]] = [
        ["completed"] * n,
        ["cancelled"] * n,
        ["no_show"] * n,
        ["pending"] * n,
        ["confirmed"] * n,
        ["completed", "cancelled"] * 10,
        (["pending"] * 5 + ["confirmed"] * 5 + ["completed"] * 5 + ["cancelled"] * 5),
        (["completed"] * 10 + ["no_show"] * 10),
        (["cancelled"] * 7 + ["completed"] * 6 + ["no_show"] * 7),
        (["pending", "confirmed", "completed", "cancelled", "no_show"] * 4),
        (["completed"] * 15 + ["pending"] * 5),
        (["confirmed"] * 12 + ["cancelled"] * 8),
        (["no_show"] * 5 + ["completed"] * 10 + ["cancelled"] * 5),
        (["pending"] * 4 + ["confirmed"] * 4 + ["completed"] * 4 + ["cancelled"] * 4 + ["no_show"] * 4),
        (["completed", "completed", "cancelled", "no_show"] * 5),
        (["cancelled"] * 10 + ["completed"] * 6 + ["no_show"] * 4),
        (["confirmed"] * 8 + ["completed"] * 8 + ["pending"] * 4),
        (["completed"] * 4 + ["pending"] * 4 + ["cancelled"] * 4 + ["no_show"] * 4 + ["confirmed"] * 4),
        (["no_show", "completed", "pending"] * 6 + ["completed", "cancelled"]),
        (["pending"] * 10 + ["completed"] * 5 + ["no_show"] * 5),
    ]
    if p >= len(patterns):
        return [codes[i % len(codes)] for i in range(n)]
    row = patterns[p]
    return row[:n] if len(row) >= n else row + [row[-1]] * (n - len(row))


class Command(BaseCommand):
    help = "Создаёт 20 клиентов с @mail.ru и по ~20 записям (разные статусы) для обучения/демо ИИ."

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Удалить ранее созданных пользователей trainclient_* и их записи, затем создать заново.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if len(CLIENT_DEFS) != 20:
            raise CommandError("Ожидается ровно 20 клиентов в CLIENT_DEFS.")

        client_role = Role.objects.filter(role_name__iexact="client").first()
        if not client_role:
            raise CommandError("Нет роли Client. Выполните: python manage.py seed_demo_data")

        masters = list(User.objects.filter(role__role_name__iexact="master").order_by("id"))
        if not masters:
            raise CommandError("Нет мастеров в базе. Выполните: python manage.py seed_demo_data")

        services = list(Service.objects.order_by("id")[:8])
        if not services:
            raise CommandError("Нет услуг. Выполните: python manage.py seed_demo_data")

        statuses: dict[str, Status] = {
            s.status_code.lower(): s for s in Status.objects.all()
        }
        for code in ("pending", "confirmed", "completed", "cancelled", "no_show"):
            if code not in statuses:
                raise CommandError(f"В базе нет статуса «{code}». Запустите seed_demo_data.")

        if options.get("replace"):
            old_ids = list(User.objects.filter(username__startswith="trainclient_").values_list("id", flat=True))
            if old_ids:
                Appointment.objects.filter(client_id__in=old_ids).delete()
                deleted, _ = User.objects.filter(id__in=old_ids).delete()
                self.stdout.write(self.style.WARNING(f"Удалены прежние trainclient_*: пользователей {deleted}"))

        now = timezone.now()
        max_dur = max(int(s.duration_minutes or 60) for s in services)
        anchors: dict[int, datetime] = {}
        for i, m in enumerate(masters):
            base_day = now - timedelta(days=260 - i * 28)
            raw = base_day.replace(hour=10, minute=0, second=0, microsecond=0)
            anchors[m.id] = normalize_slot_start(raw, max_dur)
        per_master_cursor = dict(anchors)

        created_users = 0
        created_appts = 0

        for ci, (fam, name, sur_lat, ini_lat) in enumerate(CLIENT_DEFS):
            email = f"{sur_lat}.{ini_lat}@mail.ru"
            username = f"trainclient_{sur_lat}_{ini_lat}"
            if User.objects.filter(email__iexact=email).exclude(username=username).exists():
                raise CommandError(f"Email уже занят другим пользователем: {email}")

            Appointment.objects.filter(comment__startswith=f"seed_ai_clients:{username}").delete()

            user, u_created = User.objects.get_or_create(
                username=username,
                defaults={
                    "full_name": f"{fam} {name}",
                    "email": email,
                    "role": client_role,
                },
            )
            user.full_name = f"{fam} {name}"
            user.email = email
            user.role = client_role
            pwd = f"{sur_lat}123!"
            user.set_password(pwd)
            user.save()
            if u_created:
                created_users += 1

            pattern = _status_pattern(ci)
            pay_cycle = (
                Appointment.PaymentStatus.PAID,
                Appointment.PaymentStatus.UNPAID,
                Appointment.PaymentStatus.REFUNDED,
            )

            for ai in range(20):
                master = masters[(ci + ai) % len(masters)]
                svc = services[(ci + ai) % len(services)]
                st = statuses[pattern[ai]]
                duration = int(svc.duration_minutes or 60)
                start = normalize_slot_start(per_master_cursor[master.id], duration)
                per_master_cursor[master.id] = start + timedelta(minutes=duration + 40)

                appt = Appointment(
                    client=user,
                    master=master,
                    service=svc,
                    status=st,
                    start_datetime=start,
                    comment=f"seed_ai_clients:{username}:{ai+1}",
                    payment_status=pay_cycle[ai % 3],
                )
                appt.save()
                lead_days = 2 + (ai % 5)
                Appointment.objects.filter(pk=appt.pk).update(
                    created_at=start - timedelta(days=lead_days),
                )
                created_appts += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Готово: пользователей (новых) {created_users}, записей создано {created_appts}. "
                f"Логин — email (surname.i@mail.ru), пароль — surname123!"
            )
        )
        self.stdout.write("Пример: petrov.a@mail.ru / petrov123!")
