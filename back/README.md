# SpectraCalc — backend (NestJS + TypeScript)

Обрабатывает карты КР-спектров: принимает ZIP со 100 спектрами и интервал, считает «полезную»
интенсивность каждого спектра, строит матрицу 10×10, статистику (μ, σ, Sr) и вердикт равномерности,
генерирует тепловую карту (PNG), PDF-отчёт, CSV и JSON. Единая точка входа для веб-клиента и
Telegram-бота. Всё на чистом TypeScript — без Python-сервиса.

## Запуск

```bash
npm install
cp .env.example .env      # заполнить BOT_TOKEN / BOT_PROXY_URL при необходимости
npm run build && npm start   # прод: node dist/main.js
# или для разработки:
npm run start:dev            # tsx watch
```

Сервер: `http://localhost:3000`. Артефакты отдаются статикой под `/files/<id>/…`.

### Переменные окружения (`.env`)

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `PORT` | порт HTTP | `3000` |
| `PUBLIC_BASE_URL` | база для абсолютных URL артефактов | `http://localhost:3000` |
| `CORS_ORIGIN` | разрешённые origin фронта (через запятую) | `http://localhost:5173` |
| `STORAGE_ROOT` | локальное хранилище результатов | `./storage` |
| `QUEUE_MAX` | лимит одновременных задач (свыше — 429) | `25` |
| `BOT_TOKEN` | токен Telegram-бота (пусто = бот выключен) | — |
| `BOT_PROXY_URL` | HTTP-прокси для трафика Telegram (Basic-auth в URL) | — |

`.env` в `.gitignore` — токен и прокси не попадают в репозиторий.

## HTTP API

`POST /api/calculate` — `multipart/form-data`:
- `archive` — .zip со 100 файлами спектров (`.txt`/`.esp`, две колонки: волновое число, интенсивность);
- `from`, `to` — границы интервала (см⁻¹).

Ответ `200` — JSON (`CalculationResult`): `id`, `interval`, `gridSize`, `matrix` (10×10),
`xTicks`/`yTicks`, `colorScaleMin/Max`, `peakLabel`, `stats` (`meanIntensity`, `stdDeviation`,
`sr`, `relStdDeviationPercent`, `category`, `categoryLabel`, …), `sourceFileName`, `computedAt`,
`files` (`heatmapPng`, `reportPdf`, `matrixCsv`, `metaJson`). Тот же JSON сохраняется как
`result.json` и парсится независимо ботом/сайтом.

Ошибки: `400` — некорректный вход (не 100 файлов, пустой спектр, нет точек в интервале);
`429` — очередь переполнена.

## Telegram-бот

Отправьте боту `.zip`-документ с подписью интервала (`590-625` или `/calc 590 625`) — вернёт
тепловую карту (PNG), PDF-отчёт и текстовую сводку. Использует ту же расчётную цепочку, что и HTTP.
Трафик Telegram идёт через `BOT_PROXY_URL` (в этом окружении Node не достаёт api.telegram.org напрямую).

## Архитектура (`src/`)

- `calc/` — расчётное ядро (парсинг ZIP/спектров, полезная интенсивность, матрица, статистика,
  категоризация). Чистая логика, без HTTP.
- `render/` — генерация артефактов: `heatmap/` (PNG через `@napi-rs/canvas`, bilinear-интерполяция +
  оси + колорбар), `pdf/` (`pdfkit`, шрифт Liberation Sans с кириллицей из `assets/fonts`), `csv/`.
- `storage/` — абстракция хранилища (`StorageService`); сейчас `LocalStorageService`, позже — S3.
- `queue/` — in-memory ограничитель одновременных задач (лимит `QUEUE_MAX`).
- `spectra/` — HTTP-слой: контроллер `POST /api/calculate` + оркестратор (`calc → render → storage`).
- `bot/` — Telegram-бот (grammy) + настройка прокси.
- `common/` — общие типы и константы (пороги Sr, размер сетки).

## Формула

Полезная интенсивность спектра: `Iполезн = Imax − (Ileft + Iright)/2`, где `Imax` — максимум в
интервале, `Ileft`/`Iright` — интенсивности на ближайших к границам точках. Матрица 10×10: первые
10 спектров — первая строка (Y=0, низ карты) и т.д. `Sr = σ/μ`. Категории: `<0.15` отлично,
`<0.20` приемлемо, `<0.30` удовлетворительно, `≥0.30` неприемлемо.
