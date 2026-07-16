#!/bin/bash
set -euo pipefail

# ── Заполнить под свой VPS ──────────────────────────────────
SSH_USER="root"                            # напр. root
SSH_HOST="81.200.119.179"                            # IP или spectra-calc.ru
SSH_PORT="22"
# ────────────────────────────────────────────────────────────

WEB_ROOT="/var/www/spectra-calc.ru"    # root из nginx.conf - сюда статика фронта
APP_DIR="/srv/spectra-calc"             # рабочая папка бэка: Dockerfile, dist, assets, .env, volumes
IMAGE="spectra-calc-back"
CONTAINER="spectra-calc-back"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH=(ssh -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}")
RSYNC_RSH="ssh -p ${SSH_PORT}"

if [[ -z "$SSH_USER" || -z "$SSH_HOST" ]]; then
  echo "Заполни SSH_USER и SSH_HOST в начале файла" >&2
  exit 1
fi

echo "==> [1/5] Сборка фронта"
cd "$ROOT/front"
npm ci
npm run build          # .env.production подставит пустой VITE_API_URL

# Страховка от главной тихой ошибки: если .env.production потеряется, Vite вошьёт
# дефолт из config.ts, и фронт в проде будет ходить на localhost браузера.
if grep -rq "localhost:3000" dist/assets/; then
  echo "ОШИБКА: в бандле остался localhost:3000 - проверь front/.env.production" >&2
  exit 1
fi

echo "==> [2/5] Сборка бэка"
cd "$ROOT/back"
npm ci
npm run build

echo "==> [3/5] Заливка статики в ${WEB_ROOT}"
rsync -az --delete -e "$RSYNC_RSH" "$ROOT/front/dist/" "${SSH_USER}@${SSH_HOST}:${WEB_ROOT}/"

echo "==> [4/5] Заливка бэка в ${APP_DIR}"
"${SSH[@]}" "mkdir -p ${APP_DIR}/storage ${APP_DIR}/logs"
# Без --delete на APP_DIR целиком: там лежат .env, storage/ и logs/, их сносить нельзя.
rsync -az --delete -e "$RSYNC_RSH" "$ROOT/back/dist/"   "${SSH_USER}@${SSH_HOST}:${APP_DIR}/dist/"
rsync -az --delete -e "$RSYNC_RSH" "$ROOT/back/assets/" "${SSH_USER}@${SSH_HOST}:${APP_DIR}/assets/"
rsync -az -e "$RSYNC_RSH" \
  "$ROOT/back/package.json" "$ROOT/back/package-lock.json" \
  "$ROOT/back/Dockerfile" "$ROOT/back/.dockerignore" \
  "${SSH_USER}@${SSH_HOST}:${APP_DIR}/"

echo "==> [5/5] Пересборка и перезапуск контейнера"
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
cd ${APP_DIR}

if [[ ! -f .env ]]; then
  echo "ОШИБКА: ${APP_DIR}/.env не найден - создай его (PUBLIC_BASE_URL, PORT и т.д.)" >&2
  exit 1
fi

docker build -t ${IMAGE} .
docker rm -f ${CONTAINER} 2>/dev/null || true
docker run -d --name ${CONTAINER} \\
  --restart unless-stopped \\
  -p 127.0.0.1:3000:3000 \\
  --env-file ${APP_DIR}/.env \\
  -v ${APP_DIR}/storage:/app/storage \\
  -v ${APP_DIR}/logs:/app/logs \\
  ${IMAGE}

sleep 2
docker logs --tail 20 ${CONTAINER}
EOF

echo "==> Готово: http://spectra-calc.ru"
