"""
Порог p >= T для бинаризации при расчёте метрик (оценка на размеченных Aidata).

Значение приходит из API или CLI; перед использованием приводится к (0.01, 0.99),
чтобы не ломать правило классификации.
"""

from __future__ import annotations

DEFAULT_CLASSIFICATION_THRESHOLD = 0.50


def parse_classification_threshold(raw, default: float | None = None) -> float:
    """Парсинг порога; default по умолчанию — DEFAULT_CLASSIFICATION_THRESHOLD."""
    d = float(default if default is not None else DEFAULT_CLASSIFICATION_THRESHOLD)
    if raw is None or (isinstance(raw, str) and not str(raw).strip()):
        t = d
    else:
        try:
            t = float(raw)
        except (TypeError, ValueError):
            t = d
    return min(max(t, 0.01), 0.99)
