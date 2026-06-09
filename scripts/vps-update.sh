#!/usr/bin/env bash
# Chạy trên VPS sau khi đã deploy lần đầu:
#   cd /var/www/appwebmanager && bash scripts/vps-update.sh
#
# Nếu bị "Killed" → VPS thiếu RAM: thêm swap (xem DEPLOY.md) rồi chạy lại.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Giảm peak RAM khi npm ci / next build
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
export npm_config_audit=false
export npm_config_fund=false

# VPS Node 20: npm ci hay lỗi/treo — mặc định dùng npm install.
# Muốn npm ci: VPS_USE_NPM_CI=1 bash scripts/vps-update.sh
npm_install() {
  if [[ "${VPS_USE_NPM_CI:-}" == "1" && -f package-lock.json ]]; then
    npm ci --no-audit --no-fund "$@"
  else
    npm install --no-audit --no-fund "$@"
  fi
}

echo "==> Git pull..."
git pull --ff-only

echo "==> Backend (npm install + build)..."
cd "$ROOT/backend"
npm_install
npm run build
npm run db:push

echo "==> Frontend (npm install + build)..."
cd "$ROOT/frontends"
npm_install
npm run build

echo "==> Restart API..."
if pm2 describe api &>/dev/null; then
  pm2 restart api
else
  cd "$ROOT/backend"
  pm2 start npm --name api -- start
fi

pm2 save
echo "==> Xong. Ctrl+F5 trên trình duyệt nếu UI chưa đổi."
