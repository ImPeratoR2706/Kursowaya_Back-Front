from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.salon.models import AiTrainingRun, Aidata, Appointment


class Command(BaseCommand):
    help = (
        "Полный сброс ИИ: удаляет Aidata, историю AiTrainingRun, записи AI test, демо-пользователей *_demo "
        "и их записи (как purge_demo_data), затем переобучает CatBoost и заново заполняет справочники + "
        "generate_ai_tests (разметка с ACC на панели)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-train",
            action="store_true",
            help="Не вызывать train_no_show_model (только очистка данных и seed).",
        )

    @transaction.atomic
    def _wipe_ai_tables(self) -> tuple[int, int, int]:
        r1, _ = AiTrainingRun.objects.all().delete()
        r2, _ = Aidata.objects.all().delete()
        r3, _ = Appointment.objects.filter(comment__startswith="AI test").delete()
        return int(r1 or 0), int(r2 or 0), int(r3 or 0)

    def handle(self, *args, **options):
        runs, aid, ap_ai = self._wipe_ai_tables()
        self.stdout.write(self.style.WARNING(f"Удалено: AiTrainingRun={runs}, Aidata={aid}, записей AI test={ap_ai}"))

        call_command("purge_demo_data")

        if not options.get("skip_train"):
            self.stdout.write("Переобучение CatBoost (цель accuracy на holdout ≥ 0.76)…")
            try:
                call_command("train_no_show_model", n=15000, min_accuracy=0.76)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"train_no_show_model: {exc}"))
                raise

        self.stdout.write("Справочники и демо-разметка (seed_demo_data)…")
        call_command("seed_demo_data")

        self.stdout.write(
            self.style.SUCCESS(
                "Готово. Вход: admin_demo@example.com / AdminPass123! "
                "В AI-панели укажите порог от 0.01 до 0.99 (например 0.5)."
            )
        )
