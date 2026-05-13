from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.salon.models import Aidata, MasterSchedule, Service, Status
from apps.users.models import AccessRight, Role, User


class Command(BaseCommand):
    help = "Seed reference data (roles, statuses, services, masters)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-ai-labeled",
            action="store_true",
            help="Не создавать демо-разметку Aidata (команда generate_ai_tests) для метрик AI-панели.",
        )

    def handle(self, *args, **options):
        client_role, _ = Role.objects.get_or_create(
            role_name="Client",
            defaults={"role_description": "Salon client"},
        )
        master_role, _ = Role.objects.get_or_create(
            role_name="Master",
            defaults={"role_description": "Salon master"},
        )
        admin_role, _ = Role.objects.get_or_create(
            role_name="Admin",
            defaults={"role_description": "Salon administrator"},
        )

        rights = [
            (admin_role, "manage", "all", "full"),
            (master_role, "read", "appointments", "own"),
            (client_role, "read", "appointments", "own"),
        ]
        for role, operation_name, access_object, permission in rights:
            AccessRight.objects.get_or_create(
                role=role,
                operation_name=operation_name,
                access_object=access_object,
                permission=permission,
            )

        # master_demo — тот же мастер, что в generate_ai_tests (AI-тесты); должен существовать до seed_ai_training_clients,
        # иначе у него останутся только pending-записи «AI test» и в статистике неявок будет 0 завершённых / 0 неявок.
        extra_masters_seed = [
            ("master_ivan", "Иван Петров", "ivan.petrov@example.com"),
            ("master_anna", "Анна Смирнова", "anna.smirnova@example.com"),
            ("master_dmitry", "Дмитрий Кузнецов", "dmitry.kuznetsov@example.com"),
            ("master_olga", "Ольга Васильева", "olga.vasileva@example.com"),
            ("master_demo", "Ольга Морозова", "master_demo@example.com"),
        ]
        extra_masters = []
        for username, full_name, email in extra_masters_seed:
            u, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    "full_name": full_name,
                    "email": email,
                    "role": master_role,
                },
            )
            u.full_name = full_name
            u.email = email
            u.role = master_role
            u.set_password("MasterPass123!")
            u.save()
            extra_masters.append(u)

        statuses = [
            ("pending", "Ожидает", "запись", "yellow"),
            ("confirmed", "Подтверждена", "запись", "green"),
            ("completed", "Завершена", "запись", "blue"),
            ("cancelled", "Отменена", "запись", "red"),
            ("no_show", "Неявка", "запись", "orange"),
        ]
        created_statuses = {}
        for code, name, group, color in statuses:
            status_obj, _ = Status.objects.get_or_create(
                status_code=code,
                defaults={
                    "status_name": name,
                    "status_group": group,
                    "color_indicator": color,
                },
            )
            # Keep existing statuses in sync with seed values
            changed = False
            if status_obj.status_name != name:
                status_obj.status_name = name
                changed = True
            if status_obj.status_group != group:
                status_obj.status_group = group
                changed = True
            if status_obj.color_indicator != color:
                status_obj.color_indicator = color
                changed = True
            if changed:
                status_obj.save(update_fields=["status_name", "status_group", "color_indicator"])
            created_statuses[code] = status_obj

        # Full service catalog (prices = "Барбер", used in the public price list)
        services_seed = [
            # Стрижка
            ("Стрижка", 60, Decimal("1690.00"), "Стрижка"),
            ("Стрижка ножницами", 75, Decimal("2290.00"), "Стрижка"),
            ("Детская стрижка", 45, Decimal("1490.00"), "Стрижка"),
            ("Стрижка машинкой (1-2 насадки)", 45, Decimal("1090.00"), "Стрижка"),
            ("Бритьё начисто шейвером", 45, Decimal("1390.00"), "Стрижка"),

            # Борода / Бритьё
            ("Моделирование бороды", 45, Decimal("1590.00"), "Борода / Бритьё"),
            ("Стрижка бороды и усов", 30, Decimal("1090.00"), "Борода / Бритьё"),
            ("Бритьё головы (опасной бритвой)", 60, Decimal("1790.00"), "Борода / Бритьё"),
            ("Королевское бритьё (опасной бритвой)", 60, Decimal("1790.00"), "Борода / Бритьё"),
            ("Премиальное бритьё Graham Hill", 60, Decimal("1890.00"), "Борода / Бритьё"),
            ("Премиальное моделирование бороды Graham Hill", 60, Decimal("1990.00"), "Борода / Бритьё"),

            # Комплексы
            ("Стрижка + моделирование бороды", 90, Decimal("3280.00"), "Комплексы"),
            ("Стрижка + моделирование бороды + воск", 105, Decimal("3980.00"), "Комплексы"),
            ("Стрижка + борода + уход + воск", 120, Decimal("5580.00"), "Комплексы"),
            ("Стрижка машинкой + стрижка бороды", 75, Decimal("2380.00"), "Комплексы"),

            # Уход за лицом
            ("Комплекс по уходу за кожей лица VOLCARE", 45, Decimal("1800.00"), "Уход за лицом"),
            ("Уход вокруг глаз RHEA", 30, Decimal("1700.00"), "Уход за лицом"),
            ("Комплекс London Grooming + скраб", 45, Decimal("2900.00"), "Уход за лицом"),
            ("Комплекс по уходу DEPOT", 60, Decimal("4000.00"), "Уход за лицом"),
            ("Восстанавливающая терапия RHEA + патчи", 90, Decimal("8000.00"), "Уход за лицом"),
        ]
        created_services = []
        for service_name, duration_minutes, price, category in services_seed:
            svc, _ = Service.objects.get_or_create(
                service_name=service_name,
                defaults={
                    "duration_minutes": duration_minutes,
                    "price": price,
                    "category": category,
                },
            )
            # keep existing services synced
            changed = False
            if svc.duration_minutes != duration_minutes:
                svc.duration_minutes = duration_minutes
                changed = True
            if svc.price != price:
                svc.price = price
                changed = True
            if (svc.category or "") != category:
                svc.category = category
                changed = True
            if changed:
                svc.save(update_fields=["duration_minutes", "price", "category"])
            created_services.append(svc)
        service = created_services[0]

        # If an old demo service exists, rename it to Russian and align category/price.
        legacy = Service.objects.filter(service_name__iexact="Men haircut").first()
        if legacy:
            existing_ru = Service.objects.filter(service_name__iexact="Мужская стрижка").exclude(pk=legacy.pk).first()
            if existing_ru:
                Appointment.objects.filter(service=legacy).update(service=existing_ru)
                legacy.delete()
            else:
                legacy.service_name = "Мужская стрижка"
                legacy.duration_minutes = 60
                legacy.price = Decimal("1200.00")
                legacy.category = "Стрижки"
                legacy.save(update_fields=["service_name", "duration_minutes", "price", "category"])

        for idx, m in enumerate(extra_masters, start=2):
            MasterSchedule.objects.get_or_create(
                master=m,
                day_of_week=idx if idx <= 7 else 1,
                start_time="11:00",
                end_time="19:00",
                defaults={"is_workday": True, "breaks": "14:00-15:00"},
            )
        self.stdout.write(self.style.SUCCESS("Seed data created or refreshed successfully."))

        if options.get("skip_ai_labeled"):
            return

        labeled_n = Aidata.objects.exclude(target_value__isnull=True).count()
        if labeled_n >= 20:
            self.stdout.write(
                self.style.WARNING(
                    f"Демо-разметка AI уже есть ({labeled_n} Aidata с target_value) — generate_ai_tests пропущен."
                )
            )
            return

        try:
            call_command("generate_ai_tests", n=24, threshold=0.5, notes="auto: seed_demo_data")
            call_command("align_demo_aidata")
            self.stdout.write(
                self.style.SUCCESS(
                    "Создана демо-разметка AI (Aidata.target_value). В AI-панели кнопка «Запустить» покажет N > 0 и метрики."
                )
            )
        except Exception as exc:
            self.stdout.write(
                self.style.WARNING(
                    f"Не удалось создать демо-разметку AI (нужны модель .cbm и catboost): {exc}"
                )
            )
