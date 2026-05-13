#!/usr/bin/env bash
# Деплой Next.js (standalone) на сервер в REMOTE_PATH.
# После rsync скрипт сам делает pm2 restart (см. PM2_APP ниже).
# Секреты — только в .env на сервере.
#
# Рестарт вручную с этой же машины (если не хотите автоматический шаг — закомментируйте блок PM2 внизу):
#   ssh -i bash_scripts/matchai-server.pem -o StrictHostKeyChecking=accept-new ubuntu@ec2-40-172-162-13.me-central-1.compute.amazonaws.com \
#     "cd /var/www/oracle && pm2 restart oracle --update-env"
#
# Рестарт, зайдя на сервер по SSH:
#   cd /var/www/oracle && pm2 restart oracle --update-env

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_FILE="$PROJECT_ROOT/bash_scripts/matchai-server.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST="ec2-40-172-162-13.me-central-1.compute.amazonaws.com"
REMOTE_PATH="/var/www/oracle"
PM2_APP="oracle"

STANDALONE_DIR="$PROJECT_ROOT/.next/standalone"

if [ ! -f "$KEY_FILE" ]; then
  echo "SSH ключ не найден: $KEY_FILE" >&2
  exit 1
fi

cd "$PROJECT_ROOT"

RSYNC_RSH="ssh -i ${KEY_FILE} -o StrictHostKeyChecking=accept-new"

echo "→ Установка зависимостей и production-сборка"
if command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile
  yarn build
else
  echo "yarn не найден, используем npm ci && npm run build" >&2
  npm ci
  npm run build
fi

if [ ! -f "$STANDALONE_DIR/server.js" ]; then
  echo "Нет $STANDALONE_DIR/server.js — в next.config.ts должно быть output: \"standalone\"" >&2
  exit 1
fi

echo "→ Копирование .next/static и public внутрь standalone (нужно для next start / server.js)"
mkdir -p "$STANDALONE_DIR/.next"
rm -rf "$STANDALONE_DIR/.next/static"
cp -R "$PROJECT_ROOT/.next/static" "$STANDALONE_DIR/.next/static"
rm -rf "$STANDALONE_DIR/public"
if [ -d "$PROJECT_ROOT/public" ]; then
  cp -R "$PROJECT_ROOT/public" "$STANDALONE_DIR/public"
fi

echo "→ Создание каталога на сервере (если ещё нет)"
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new "${REMOTE_USER}@${REMOTE_HOST}" \
  "sudo mkdir -p '${REMOTE_PATH}' && sudo chown -R '${REMOTE_USER}:${REMOTE_USER}' '${REMOTE_PATH}'"

echo "→ rsync standalone → ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
rsync -avz --delete \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '.DS_Store' \
  -e "$RSYNC_RSH" \
  "${STANDALONE_DIR}/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"

echo "→ PM2: перезапуск ${PM2_APP} на сервере"
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new "${REMOTE_USER}@${REMOTE_HOST}" \
  "cd '${REMOTE_PATH}' && pm2 restart '${PM2_APP}' --update-env"

echo "Готово: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH} (pm2: ${PM2_APP})"
