#!/usr/bin/env bash
# Chạy trên VPS sau khi đã deploy lần đầu:
#   cd /var/www/appwebmanager && bash scripts/vps-update.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Git pull..."
git pull --ff-only

echo "==> Backend..."
cd "$ROOT/backend"
npm ci
npm run build
# Cập nhật bảng nếu schema.prisma đổi (Attendance, CompanyWifi, ...)
npm run db:push

echo "==> Frontend..."
cd "$ROOT/frontends"
npm ci
npm run build

echo "==> Restart API..."
pm2 restart api || pm2 start npm --name api -- start

pm2 save
echo "==> Xong. Mở site và Ctrl+F5 (hard refresh) nếu UI chưa đổi."
