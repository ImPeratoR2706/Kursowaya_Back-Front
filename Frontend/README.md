# Frontend (React + Vite)

Интерфейс курсового проекта «Онлайн-запись в парикмахерскую».

## Запуск локально

Из каталога `Frontend`:

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 8080
```

Откройте `http://127.0.0.1:8080/`. Backend по умолчанию ожидается на `http://127.0.0.1:8000` (см. `src/lib/api.ts` и при необходимости `.env` / `VITE_*`).

## Запуск всего стека

- **Пошагово (что вводить в PowerShell):** `ZAPUSK_PO_SHAGAM.txt` в корне репозитория.
- **Docker:** `INSTRUKCIYA_DOCKER.txt` (`docker compose up -d --build`).
- **Backend:** `Backend/README.md`.
- **ИИ:** `INSTRUKCIYA_AI.txt`, `AI_MODULE_OPISANIE.txt`.
