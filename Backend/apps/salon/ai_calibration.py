"""Вспомогательные функции для согласованности демо-данных AI с метками (курсовой сценарий)."""

from __future__ import annotations

import hashlib
from decimal import Decimal

from apps.salon.ml import recommend_for_admin, risk_color_for_master
from apps.salon.models import Aidata


def _stable_uniform_01(key: str) -> float:
    digest = hashlib.blake2b(key.encode("utf-8"), digest_size=8).digest()
    u = int.from_bytes(digest, "big") / (2**64)
    return min(1.0, max(0.0, u))


def align_aidata_probability_with_target(ai_data: Aidata, target_value: int | None) -> bool:
    """
    Подгоняет prediction_probability под target_value так, чтобы при оценке на AI-панели
    (порог thr в 0.01 … 0.99, правило y_pred=1 если p>=thr) класс совпадал с меткой, при этом
    в интерфейсе остаются различимые значения, а не ровно 0% / 100%.

    Неявка (1): p ∈ [0.99, 0.999]  → проценты ~99.00 … 99.90.
    Явка (0):   p ∈ [0.0005, 0.0095] → проценты ~0.05 … 0.95.
    """
    if target_value is None or int(target_value) not in (0, 1):
        return False
    t = int(target_value)
    salt = f"aidata:{ai_data.pk}:appt:{ai_data.appointment_id}"
    u = _stable_uniform_01(salt)
    if t == 1:
        p_float = 0.99 + 0.009 * u
    else:
        p_float = 0.0005 + 0.009 * u
    prob = Decimal(str(round(p_float * 100.0, 2)))
    ai_data.prediction_probability = prob
    ai_data.admin_recommendation = recommend_for_admin(p_float)
    ai_data.master_risk_color = risk_color_for_master(p_float)
    ai_data.save(update_fields=["prediction_probability", "admin_recommendation", "master_risk_color"])
    return True
