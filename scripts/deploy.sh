#!/bin/bash
# CI/CD manual deploy: rsync repo ke VPS, build image, up container.
set -euo pipefail

VPS_HOST="${VPS_HOST:-103.253.213.178}"
VPS_USER="${VPS_USER:-root}"
APP_DIR="/root/grosisr-prod"
REMOTE_DIR="$VPS_USER@$VPS_HOST:$APP_DIR"

echo "[1/5] Rsync repo ke VPS..."
export SSHPASS="${SSHPASS:?Set SSHPASS env var}"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .env \
  --exclude .env.production --exclude '*.log' --exclude .turbo \
  -e "sshpass -e ssh -o StrictHostKeyChecking=no" \
  . "$REMOTE_DIR/"

echo "[2/5] Pastikan .env.production ada di VPS..."
sshpass -e ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "
  if [ ! -f $APP_DIR/.env.production ]; then
    echo '.env.production missing — run bootstrap on VPS first'
    exit 1
  fi
"

echo "[3/5] Build image & up..."
sshpass -e ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "
  cd $APP_DIR
  docker compose -f docker-compose.prod.yml --env-file .env.production build
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d
  sleep 5
  docker compose -f docker-compose.prod.yml ps
"

echo "[4/5] Healthcheck container port 3002..."
curl -fsS http://127.0.0.1:3002/api/auth/session && echo " HEALTH_OK" || echo " healthcheck skipped"

echo "[5/5] Selesai. Buka https://employ.srvbenss.cloud"
