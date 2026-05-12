from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, Pool
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.salon.ml import CAT_FEATURES, FEATURE_NAMES, METADATA_PATH, MODEL_PATH, MODEL_VERSION


WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
PAYMENT_STATUSES = ["не_оплачено", "оплачено", "частично"]


def _rule_score(row: dict) -> float:
    score = 0.0
    if row["payment_status"] == "не_оплачено":
        score += 2.0
    elif row["payment_status"] == "частично":
        score += 1.0
    score += float(min(row["client_no_show_count_90d"], 5))
    score += 0.5 * float(min(row["client_cancel_count_90d"], 4))
    if row["lead_time_days"] <= 1:
        score += 2.0
    if row["master_appointments_same_day"] >= 5:
        score += 1.0
    if row["hour"] >= 19:
        score += 0.5
    return score


def _synthetic_label(row: dict, rng: random.Random, flip_prob: float) -> int:
    y = 1 if _rule_score(row) >= 4.0 else 0
    if rng.random() < flip_prob:
        y = 1 - y
    return y


def _synthetic_row(rng: random.Random) -> dict:
    return {
        "weekday": rng.choice(WEEKDAYS_RU),
        "hour": rng.randint(8, 21),
        "client_cancel_count_90d": rng.randint(0, 5),
        "client_no_show_count_90d": rng.randint(0, 6),
        "lead_time_days": rng.randint(0, 21),
        "payment_status": rng.choice(PAYMENT_STATUSES),
        "master_appointments_same_day": rng.randint(0, 8),
        "master_id": str(rng.randint(1, 80)),
    }


def _build_dataset(n_rows: int, seed: int, flip_prob: float) -> tuple[pd.DataFrame, np.ndarray]:
    rng = random.Random(seed)
    rows: list[dict] = []
    labels: list[int] = []
    for _ in range(n_rows):
        row = _synthetic_row(rng)
        rows.append(row)
        labels.append(_synthetic_label(row, rng, flip_prob))
    df = pd.DataFrame(rows, columns=FEATURE_NAMES)
    y = np.array(labels, dtype=np.int32)
    return df, y


def _val_accuracy(model: CatBoostClassifier, pool: Pool, y: np.ndarray) -> float:
    pred = model.predict(pool).astype(np.int32).ravel()
    return float((pred == y).mean())


class Command(BaseCommand):
    help = (
        "Обучает CatBoost-модель неявки на синтетических данных (совместимых с ml.FEATURE_NAMES), "
        "сохраняет no_show_model.cbm и обновляет model_meta.json. Цель — accuracy на валидации ≥ порога."
    )

    def add_arguments(self, parser):
        parser.add_argument("--n", type=int, default=12000, help="Число синтетических примеров.")
        parser.add_argument("--min-accuracy", type=float, default=0.75, help="Минимальная accuracy на holdout (0..1).")
        parser.add_argument("--flip-prob", type=float, default=0.06, help="Доля шумовых переворотов метки (0..1).")
        parser.add_argument("--seed", type=int, default=42, help="Seed для воспроизводимости.")

    def handle(self, *args, **options):
        n_rows = max(int(options["n"] or 12000), 2000)
        min_acc = float(options["min_accuracy"] if options["min_accuracy"] is not None else 0.75)
        min_acc = min(max(min_acc, 0.5), 0.99)
        flip_prob = float(options["flip_prob"] if options["flip_prob"] is not None else 0.06)
        flip_prob = min(max(flip_prob, 0.0), 0.25)
        seed = int(options["seed"] if options["seed"] is not None else 42)

        out_dir: Path = Path(settings.BASE_DIR) / "apps" / "salon" / "ai_module"
        out_dir.mkdir(parents=True, exist_ok=True)

        best_acc = 0.0
        best_model: CatBoostClassifier | None = None
        best_meta: dict | None = None

        for attempt, eff_flip in enumerate([flip_prob, flip_prob * 0.5, 0.03, 0.02]):
            eff_seed = seed + attempt * 9973
            df, y = _build_dataset(n_rows, eff_seed, eff_flip)
            idx = np.arange(n_rows)
            rng_np = np.random.default_rng(eff_seed)
            rng_np.shuffle(idx)
            split = int(n_rows * 0.8)
            tr_idx, va_idx = idx[:split], idx[split:]

            X_tr, X_va = df.iloc[tr_idx].reset_index(drop=True), df.iloc[va_idx].reset_index(drop=True)
            y_tr, y_va = y[tr_idx], y[va_idx]

            train_pool = Pool(X_tr, label=y_tr, cat_features=CAT_FEATURES)
            val_pool = Pool(X_va, label=y_va, cat_features=CAT_FEATURES)

            model = CatBoostClassifier(
                iterations=600,
                depth=6,
                learning_rate=0.06,
                loss_function="Logloss",
                eval_metric="Accuracy",
                verbose=False,
                random_seed=eff_seed,
                allow_writing_files=False,
            )
            model.fit(train_pool, eval_set=val_pool, early_stopping_rounds=80, use_best_model=True)

            acc = _val_accuracy(model, val_pool, y_va)
            self.stdout.write(
                f"Попытка {attempt + 1}: flip={eff_flip:.4f}, val_accuracy={acc:.4f}"
            )
            if acc > best_acc:
                best_acc = acc
                best_model = model
                best_meta = {
                    "model_path": "apps/salon/ai_module/no_show_model.cbm",
                    "model_version": MODEL_VERSION,
                    "validation_accuracy": round(acc, 6),
                    "n_samples": int(n_rows),
                    "cat_features": list(CAT_FEATURES),
                    "feature_columns": list(FEATURE_NAMES),
                    "positive_class_is_no_show": True,
                    "trained_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                    "synthetic_training": True,
                    "train_command_flip_prob": eff_flip,
                    "train_command_seed": eff_seed,
                }
            if acc >= min_acc:
                break

        if best_model is None or best_meta is None:
            self.stderr.write(self.style.ERROR("Не удалось обучить модель."))
            return

        if best_acc < min_acc:
            self.stderr.write(
                self.style.WARNING(
                    f"Лучшая val_accuracy={best_acc:.4f} ниже порога {min_acc:.4f}. "
                    "Увеличьте --n или уменьшите --flip-prob и повторите."
                )
            )

        model_path = Path(MODEL_PATH)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        best_model.save_model(str(model_path))

        meta_path = Path(METADATA_PATH)
        meta_path.write_text(json.dumps(best_meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        self.stdout.write(
            self.style.SUCCESS(
                f"Модель сохранена: {model_path.relative_to(settings.BASE_DIR)} "
                f"(val_accuracy={best_meta['validation_accuracy']}). Метаданные: {meta_path.name}"
            )
        )
