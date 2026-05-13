"""
Одноразово переводит существующие записи со статусами «Ожидает» (pending)
и «Подтверждена» (confirmed) в «Завершена», «Отменена» или «Неявка»
по детерминированному правилу (id % 3).
Новые записи не трогает — только то, что уже pending/confirmed в момент запуска.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.salon.models import Appointment, Status


def _buckets_for_ids(ids: list[int]) -> dict[str, list[int]]:
    out: dict[str, list[int]] = {"completed": [], "cancelled": [], "no_show": []}
    for pk in ids:
        r = pk % 3
        if r == 0:
            out["completed"].append(pk)
        elif r == 1:
            out["cancelled"].append(pk)
        else:
            out["no_show"].append(pk)
    return out


class Command(BaseCommand):
    help = (
        "Перевести все записи «Ожидает» (pending) и «Подтверждена» (confirmed) "
        "в completed / cancelled / no_show."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Только показать, сколько записей к каким статусам пойдёт, без изменений в БД.",
        )

    def handle(self, *args, **options):
        dry = bool(options.get("dry_run"))

        def _one(code: str) -> Status:
            st = Status.objects.filter(status_code__iexact=code).first()
            if st is None:
                raise CommandError(f"В базе нет статуса с кодом «{code}». Сначала выполните seed_demo_data.")
            return st

        pending = _one("pending")
        confirmed = _one("confirmed")
        completed = _one("completed")
        cancelled = _one("cancelled")
        no_show = _one("no_show")

        groups: list[tuple[str, int, list[int]]] = []
        for label, src in (
            ("Ожидает", pending.pk),
            ("Подтверждена", confirmed.pk),
        ):
            ids = list(Appointment.objects.filter(status_id=src).values_list("pk", flat=True))
            groups.append((label, src, ids))

        total_all = sum(len(ids) for _l, _s, ids in groups)
        if total_all == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    "Нет записей со статусами «Ожидает» и «Подтверждена» — ничего не сделано."
                )
            )
            return

        buckets_by_label: dict[str, dict[str, list[int]]] = {}
        for label, _src_pk, ids in groups:
            if not ids:
                self.stdout.write(f"«{label}»: записей нет.")
                continue
            b = _buckets_for_ids(ids)
            buckets_by_label[label] = b
            self.stdout.write(
                f"«{label}»: найдено {len(ids)}. "
                f"→ завершена: {len(b['completed'])}, "
                f"отменена: {len(b['cancelled'])}, "
                f"неявка: {len(b['no_show'])}."
            )

        if dry:
            self.stdout.write(self.style.WARNING("Режим --dry-run: изменения в БД не применены."))
            return

        mapping = (
            ("completed", completed.pk),
            ("cancelled", cancelled.pk),
            ("no_show", no_show.pk),
        )
        updated = 0
        chunk = 500
        with transaction.atomic():
            for label, _src_pk, ids in groups:
                if not ids:
                    continue
                b = buckets_by_label[label]
                for _tlabel, status_pk in mapping:
                    pks = b[_tlabel]
                    if not pks:
                        continue
                    for i in range(0, len(pks), chunk):
                        part = pks[i : i + chunk]
                        updated += Appointment.objects.filter(pk__in=part).update(status_id=status_pk)

        self.stdout.write(self.style.SUCCESS(f"Обновлено записей: {updated}."))
