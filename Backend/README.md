# Backend — курсовой проект «Онлайн-запись в парикмахерскую»

Django + Django REST Framework, JWT, PostgreSQL, модуль прогноза неявки (CatBoost).

## Локальный запуск (Windows, PowerShell)

Пошаговые команды (копирование в терминал): **`ZAPUSK_PO_SHAGAM.txt`** в корне репозитория.

База: **PostgreSQL** (создайте БД и задайте пароль в `POSTGRES_PASSWORD`) или **SQLite** для локальной разработки: в PowerShell выполните `$env:USE_SQLITE = "1"` до `migrate` (файл `Backend/db.sqlite3`).

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

$env:POSTGRES_DB = "hair_salon_db"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "postgres"
$env:POSTGRES_HOST = "127.0.0.1"
$env:POSTGRES_PORT = "5432"

python manage.py migrate
python manage.py train_no_show_model --n 8000 --min-accuracy 0.75
python manage.py seed_demo_data
python manage.py runserver 127.0.0.1:8000
```

- **`train_no_show_model`** — создаёт/перезаписывает `apps/salon/ai_module/no_show_model.cbm` и `model_meta.json` (по умолчанию обучение на синтетике; см. `AI_MODULE_OPISANIE.txt`).
- **`seed_demo_data`** — справочники и демо-пользователи; если размеченных `Aidata` меньше 20, дополнительно вызывает **`generate_ai_tests`** (метки `target_value` для AI-панели). Отключить разметку: `seed_demo_data --skip-ai-labeled`.
- **`backfill_ai_data`** — пересчёт `Aidata` для всех записей при уже работающей модели.
- **`reset_ai_full`** — удалить Aidata, историю запусков, демо `*_demo`, переобучить `.cbm` и заново выполнить `seed_demo_data` (для «чистой» AI-панели).

## Docker

См. **`INSTRUKCIYA_DOCKER.txt`** в корне репозитория. При первом старте контейнера `backend`, если файла `.cbm` нет, выполняется `train_no_show_model`.

## Основные URL

- Swagger: `http://127.0.0.1:8000/api/docs/`
- OpenAPI: `http://127.0.0.1:8000/api/schema/`
- Админка: `http://127.0.0.1:8000/admin/`

## API (фрагмент)

- `/api/auth/register/`, `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/profile/`
- `/api/services/`, `/api/statuses/`, `/api/master-schedules/`, `/api/appointments/`
- `/api/appointments/{id}/predict-no-show/` — прогноз неявки (при недоступной модели — **503** и поле `detail`)
- `/api/ai-data/`, `/api/ai/model-info/`, `/api/ai-training-runs/`, `POST /api/ai-training-runs/run/` — оценка по размеченным `Aidata`, не обучение файла `.cbm`
- `/api/transactions/`, `/api/audit-logs/`

## AI-модуль

- Код признаков и инференса: `apps/salon/ml.py`
- Сохранение результатов: модель `Aidata`
- Подробное описание: **`AI_MODULE_OPISANIE.txt`** и **`INSTRUKCIYA_AI.txt`** в корне репозитория

## Примечания

- Настройки БД: переменные `POSTGRES_*` (см. `config/settings.py`).
- Зависимости ML: `numpy`, `pandas`, `catboost` перечислены в `requirements.txt`.
- Для **catboost** на Windows надёжнее **Python 3.12 или 3.13** (готовые колёса). На **3.14** `pip install` может падать при сборке из исходников — используйте venv с 3.12/3.13 или образ `python:3.12-slim` из `Backend/Dockerfile`.
