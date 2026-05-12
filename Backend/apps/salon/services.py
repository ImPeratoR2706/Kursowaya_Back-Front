from __future__ import annotations

from apps.salon.ml import get_model_info, predict_no_show
from apps.salon.models import Aidata, Appointment


class AiInferenceUnavailable(Exception):
    """Нет файла модели, не установлены catboost/pandas/numpy или ошибка загрузки .cbm."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def supports_ai_prediction(appointment: Appointment) -> bool:
    return bool(
        appointment.client_id
        and appointment.master_id
        and appointment.service_id
        and appointment.start_datetime
    )


def upsert_ai_data_for_appointment(
    appointment: Appointment,
    *,
    feature_overrides: dict | None = None,
    target_value: int | None = None,
    requested_model_version: str | None = None,
) -> Aidata | None:
    if not supports_ai_prediction(appointment):
        return None

    try:
        prediction = predict_no_show(appointment, feature_overrides)
    except FileNotFoundError as exc:
        raise AiInferenceUnavailable(
            "Файл модели no_show_model.cbm не найден. Выполните: python manage.py train_no_show_model"
        ) from exc
    except RuntimeError as exc:
        msg = str(exc).lower()
        if "catboost" in msg or "pandas" in msg or "numpy" in msg:
            raise AiInferenceUnavailable(
                "Не установлены зависимости ML (catboost, pandas, numpy). Установите: pip install -r requirements.txt"
            ) from exc
        raise
    except ImportError as exc:
        raise AiInferenceUnavailable(
            "Не установлены зависимости ML (catboost, pandas, numpy). Установите: pip install -r requirements.txt"
        ) from exc
    model_info = get_model_info()
    probability_percent = round(float(prediction["no_show_probability"]) * 100.0, 2)
    model_version = requested_model_version or model_info.get("model_version") or "catboost-no-show-v1"

    defaults: dict = {
        "input_features": prediction["feature_snapshot"],
        "prediction_probability": probability_percent,
        "admin_recommendation": prediction["admin_recommendation"],
        "master_risk_color": prediction["master_risk_color"],
        "inference_time_ms": prediction["inference_time_ms"],
        "model_version": model_version,
    }
    # Не передавать target_value=None — иначе update_or_create сбросит разметку в NULL.
    if target_value is not None:
        defaults["target_value"] = target_value

    ai_data, _ = Aidata.objects.update_or_create(
        appointment=appointment,
        defaults=defaults,
    )
    return ai_data


def backfill_ai_data_for_appointments(queryset=None) -> dict[str, int | bool | str]:
    appointments = queryset or Appointment.objects.select_related(
        "client",
        "master",
        "service",
        "status",
    ).all()
    processed = 0
    created_or_updated = 0
    skipped = 0
    ai_unavailable = False

    for appointment in appointments:
        processed += 1
        if not supports_ai_prediction(appointment):
            skipped += 1
            continue
        if ai_unavailable:
            skipped += 1
            continue
        try:
            ai_data = upsert_ai_data_for_appointment(appointment)
        except AiInferenceUnavailable:
            ai_unavailable = True
            skipped += 1
            continue
        created_or_updated += 1

    model_info = get_model_info()
    return {
        "processed": processed,
        "created_or_updated": created_or_updated,
        "skipped": skipped,
        "is_trained": bool(model_info.get("is_trained")),
        "model_version": model_info.get("model_version", ""),
        "ai_inference_unavailable": ai_unavailable,
    }
