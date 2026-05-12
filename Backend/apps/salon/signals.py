import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.salon.models import Appointment
from apps.salon.services import AiInferenceUnavailable, upsert_ai_data_for_appointment

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Appointment)
def ensure_ai_data_for_appointment(sender, instance: Appointment, **kwargs):
    # Записи из generate_ai_tests обрабатываются командой (разметка + выравнивание вероятностей).
    if (instance.comment or "").startswith("AI test"):
        return
    try:
        upsert_ai_data_for_appointment(instance)
    except AiInferenceUnavailable as exc:
        logger.warning("AI: пропуск после сохранения записи id=%s — %s", instance.pk, exc.message)
    except Exception:
        logger.exception("AI: неожиданная ошибка после сохранения записи id=%s", instance.pk)
