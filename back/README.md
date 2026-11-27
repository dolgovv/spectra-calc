# SpectraCalc - backend (NestJS + TypeScript)

Обрабатывает карты КР-спектров: принимает ZIP со 100 спектрами и интервал, считает «полезную»
интенсивность каждого спектра, строит матрицу 10×10, статистику (μ, σ, Sr) и вердикт равномерности,
генерирует тепловую карту (PNG), PDF-отчёт, CSV и JSON для веб-клиента. Всё на чистом TypeScript -
без Python-сервиса.

## Запуск

```bash
npm install
cp .env.example .env
npm run build && npm start   # прод: node dist/main.js
# или для разработки:
npm run start:dev            # tsx watch
```

Сервер: `http://localhost:3000`. Артефакты отдаются статикой под `/files/<id>/…`.

### Переменные окружения (`.env`)

| Переменная        | Назначение                                          | По умолчанию            |
| ----------------- | --------------------------------------------------- | ----------------------- |
| `PORT`            | порт HTTP                                           | `3000`                  |
| `PUBLIC_BASE_URL` | база для абсолютных URL артефактов                  | `http://localhost:3000` |
| `CORS_ORIGIN`     | разрешённые origin фронта (через запятую)           | `http://localhost:5173` |
| `STORAGE_ROOT`    | локальное хранилище результатов                     | `./storage`             |
| `QUEUE_MAX`       | лимит одновременных задач (свыше - 429)             | `25`                    |
| `DATA_ROOT`       | приватные данные: база админки и исходные архивы    | `./data`                |
| `ADMIN_PASSWORD`  | пароль `/admin`; пусто - админка выключена          | -                       |
| `ARCHIVE_TTL_DAYS`| срок хранения исходных архивов, дней (0 - всегда)   | `30`                    |
| `LOG_RETENTION_DAYS` | срок хранения логов и посещений, дней (0 - всегда) | `90`                 |

## HTTP API

`POST /api/calculate` - `multipart/form-data`:

- `archive` - .zip со 100 файлами спектров (`.txt`/`.esp`, две колонки: волновое число, интенсивность);
- `from`, `to` - границы интервала (см⁻¹).

Ответ `200` - JSON (`CalculationResult`): `id`, `interval`, `gridSize`, `matrix` (10×10),
`xTicks`/`yTicks`, `colorScaleMin/Max`, `peakLabel`, `stats` (`meanIntensity`, `stdDeviation`,
`sr`, `relStdDeviationPercent`, `category`, `categoryLabel`, …), `sourceFileName`, `computedAt`,
`files` (`heatmapPng`, `reportPdf`, `matrixCsv`, `metaJson`). Тот же JSON сохраняется как
`result.json`.

Ошибки: `400` - некорректный вход (не 100 файлов, пустой спектр, нет точек в интервале);
`429` - очередь переполнена.

Каждая попытка расчёта с архивом записывается: параметры, IP, браузер, итог (результат или текст
ошибки), а сам архив сохраняется в `DATA_ROOT/archives/<id>.zip`.

`GET /api/health` - для healthcheck контейнера, в лог запросов не пишется.

`POST /api/track` - просмотр страницы от SPA (`path`, `referrer`, urlencoded), всегда `204`.

### Админка (`/api/admin`)

Вход: `POST /api/admin/login` `{ "password": "…" }` → HttpOnly-cookie `spectra_admin` на 7 дней
(подписана ключом из пароля: смена пароля разлогинивает). 10 неверных попыток с одного IP - 429 на
15 минут. Без `ADMIN_PASSWORD` все эндпоинты отвечают 404.

| Метод и путь                                   | Что отдаёт                                          |
| ---------------------------------------------- | --------------------------------------------------- |
| `GET  /session`                                | `200`, если сессия жива, иначе `401`                |
| `POST /logout`                                 | сбрасывает cookie                                   |
| `GET  /overview?days=30&tz=180`                | посещения и расчёты по дням в поясе админа, топы    |
| `GET  /requests?limit&offset&status&search&admin` | лог запросов; `admin=1` - вместе с запросами админки |
| `GET  /requests/summary?days&tz&admin`         | сводка по эндпоинтам                                |
| `GET  /calculations?limit&offset&status`       | журнал расчётов                                     |
| `GET  /calculations/:id`                       | запись + полный результат                           |
| `GET  /calculations/:id/archive`               | исходный ZIP под исходным именем                    |
| `GET  /calculations/:id/files/:name`           | `heatmap.png`, `report.pdf`, `matrix.csv`, `result.json`, собранные из результата |

## Архитектура (`src/`)

- `calc/` - расчётное ядро (парсинг ZIP/спектров, полезная интенсивность, матрица, статистика,
  категоризация). Чистая логика, без HTTP.
- `render/` - генерация артефактов: `heatmap/` (PNG через `@napi-rs/canvas`, bilinear-интерполяция +
  оси + колорбар), `pdf/` (`pdfkit`, шрифт Liberation Sans с кириллицей из `assets/fonts`), `csv/`.
- `storage/` - абстракция хранилища (`StorageService`); сейчас `LocalStorageService`, позже - S3.
- `queue/` - in-memory ограничитель одновременных задач (лимит `QUEUE_MAX`).
- `spectra/` - HTTP-слой: контроллер `POST /api/calculate` + оркестратор (`calc → render → storage`).
- `analytics/` - SQLite (`node:sqlite`) в `DATA_ROOT`: лог запросов (middleware), посещения,
  журнал расчётов с архивами, очистка по срокам хранения.
- `admin/` - вход, guard и API админки.
- `common/` - общие типы и константы (пороги Sr, размер сетки).

## Формула

Полезная интенсивность спектра: `Iполезн = Imax − (Ileft + Iright)/2`, где `Imax` - максимум в
интервале, `Ileft`/`Iright` - интенсивности на ближайших к границам точках. Матрица 10×10: первые
10 спектров - первая строка (Y=0, низ карты) и т.д. `Sr = σ/μ`. Категории: `<0.15` отлично,
`<0.20` приемлемо, `<0.30` удовлетворительно, `≥0.30` неприемлемо.
