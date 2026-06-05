#!/usr/bin/env bash
# Kiểm tra + sửa backend trên VPS: cd /var/www/appwebmanager && bash scripts/vps-backend-check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"

cd "$BACKEND"

echo "=== 1. .env ==="
if [[ ! -f .env ]]; then
  echo "THIẾU backend/.env — copy từ .env.example và sửa DATABASE_URL, JWT_SECRET"
  exit 1
fi
grep -E '^(DATABASE_URL|JWT_SECRET)=' .env | sed 's/=.*/=***/' || true

echo ""
echo "=== 2. MySQL / Prisma ==="
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
npm run db:push

echo ""
echo "=== 3. Build backend ==="
npm run build

echo ""
echo "=== 4. PM2 ==="
if pm2 describe api &>/dev/null; then
  pm2 restart api
else
  pm2 start npm --name api -- start
fi
sleep 2
pm2 status api

echo ""
echo "=== 5. Test API local ==="
curl -s -o /dev/null -w "GET /api/attendance/wifi → HTTP %{http_code}\n" http://127.0.0.1:3000/api/attendance/wifi || echo "curl failed — xem: pm2 logs api --lines 50"

echo ""
echo "Xong. Nếu HTTP 401 = API chạy OK (cần đăng nhập). 502/000 = API chưa lên."
