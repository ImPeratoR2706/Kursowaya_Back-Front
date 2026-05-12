from django.core.management.base import BaseCommand
from django.db import transaction

from apps.salon.models import Appointment
from apps.users.models import User


class Command(BaseCommand):
    help = "Удаляет демо-пользователей (*_demo) и связанные с ними записи."

    @transaction.atomic
    def handle(self, *args, **options):
        demo_users = list(User.objects.filter(username__iendswith="_demo"))
        if not demo_users:
            self.stdout.write(self.style.SUCCESS("Демо-пользователей не найдено."))
            return

        demo_ids = [u.id for u in demo_users]
        self.stdout.write(f"Найдено демо-пользователей: {[(u.id, u.username, u.email) for u in demo_users]}")

        appts = Appointment.objects.filter(client_id__in=demo_ids) | Appointment.objects.filter(master_id__in=demo_ids)
        appt_count = appts.distinct().count()
        self.stdout.write(f"Удаляем записей (Appointment): {appt_count}")
        appts.delete()

        # После удаления записей можно удалять пользователей (иначе Appointment.PROTECT).
        deleted = User.objects.filter(id__in=demo_ids).delete()
        self.stdout.write(self.style.SUCCESS(f"Удаление выполнено: {deleted}"))

