"""Правила «салонных» окон для демо/тестовых записей: Пн–Пт 10:00–22:00, Сб–Вс 10:00–21:00."""

from __future__ import annotations

from datetime import datetime, time, timedelta

from django.utils import timezone as dj_tz


def closing_time_for_weekday(weekday: int) -> time:
    """weekday как в datetime.weekday(): 0=Пн … 6=Вс."""
    return time(21, 0) if weekday >= 5 else time(22, 0)


def normalize_slot_start(dt: datetime, duration_minutes: int) -> datetime:
    """
    Сдвигает начало записи на ближайший допустимый момент:
    открытие 10:00, окончание записи (start + duration) не позже закрытия в этот календарный день.
    """
    tz = dj_tz.get_current_timezone()
    if dj_tz.is_naive(dt):
        dt = dj_tz.make_aware(dt, tz)
    cur = dt.astimezone(tz)
    dur = timedelta(minutes=max(1, int(duration_minutes)))

    for _ in range(2000):
        day = cur.date()
        wd = cur.weekday()
        open_dt = datetime.combine(day, time(10, 0), tzinfo=tz)
        close_t = closing_time_for_weekday(wd)
        close_dt = datetime.combine(day, close_t, tzinfo=tz)

        if cur < open_dt:
            cur = open_dt
            continue

        if cur + dur > close_dt:
            cur = datetime.combine(day + timedelta(days=1), time(10, 0), tzinfo=tz)
            continue

        return cur.replace(second=0, microsecond=0)

    raise ValueError("Не удалось подобрать слот в пределах рабочих часов (слишком длинная услуга?).")
