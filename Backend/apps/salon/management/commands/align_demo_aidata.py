from django.core.management.base import BaseCommand

from apps.salon.ai_calibration import align_aidata_probability_with_target
from apps.salon.models import Aidata


class Command(BaseCommand):
    help = (
        "Подгоняет prediction_probability под target_value для Aidata, привязанных к записям "
        "с комментарием «AI test:…» (старые демо после обновления проекта). "
        "Вероятности остаются в узком диапазоне (не ровно 0/100%), класс при пороге 0.01–0.99 сохраняется."
    )

    def handle(self, *args, **options):
        qs = Aidata.objects.select_related("appointment").filter(
            appointment__comment__startswith="AI test:",
            target_value__isnull=False,
        )
        rows = list(qs)
        updated = 0
        for row in rows:
            if align_aidata_probability_with_target(row, int(row.target_value or 0)):
                updated += 1
        self.stdout.write(self.style.SUCCESS(f"Обновлено Aidata: {updated} из {len(rows)}."))
