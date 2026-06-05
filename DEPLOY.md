# Deploy lên VPS

**Nhớ nhanh:** Đưa project lên VPS → **Node (PM2)** chạy `backend` → **MySQL** lưu data → **build** `frontends` ra `dist` → **Nginx** phục vụ web + chuyển `/api` sang backend.

**iNET Cloud Hosting** (OneHost) **không** chạy được app này. Cần **Cloud VPS** hoặc VPS có SSH.

---

## Bước 1: Vào VPS (SSH)

```bash
ssh root@IP_VPS_CUA_BAN
```

---

## Bước 2: Cài Node, MySQL, Nginx, PM2

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx
sudo npm install -g pm2
node -v
```

---

## Bước 3: Tạo database

```bash
sudo mysql
```

```sql
CREATE DATABASE entdash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'entdash'@'localhost' IDENTIFIED BY 'MatKhau123';
GRANT ALL PRIVILEGES ON entdash.* TO 'entdash'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Bước 4: Đưa code lên VPS

```bash
sudo mkdir -p /var/www/appwebmanager
sudo chown $USER:$USER /var/www/appwebmanager
cd /var/www/appwebmanager
git clone LINK_GITHUB_CUA_BAN .
```

Hoặc upload bằng WinSCP (bỏ `node_modules`, `.next`).

---

## Bước 5: Backend

```bash
cd /var/www/appwebmanager/backend
cp .env.example .env
nano .env
```

```env
DATABASE_URL="mysql://entdash:MatKhau123@127.0.0.1:3306/entdash"
JWT_SECRET="dat-chuoi-bi-mat-dai-32-ky-tu-tro-len"
APP_URL="https://ten-mien-cua-ban.com"
TELEGRAM_BOT_TOKEN="..."
```

```bash
npm ci
npm run build
npm run db:push
pm2 start npm --name api -- start
pm2 save
pm2 startup
```

---

## Bước 6: Frontend

Production **không cần** `VITE_API_URL` — frontend tự gọi API cùng domain (Nginx proxy `/api`).

```bash
cd /var/www/appwebmanager/frontends
npm ci
npm run build
```

---

## Bước 7: Domain + Nginx + SSL

Trỏ A record domain → IP VPS.

File `/etc/nginx/sites-available/appwebmanager` (đổi `app.example.com`):

```nginx
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    root /var/www/appwebmanager/frontends/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }

    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/appwebmanager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.example.com
```

Telegram: `APP_URL` phải đúng `https://domain` → `pm2 restart api`.

---

## Checklist

| ☐ | Việc |
|---|------|
| ☐ | SSH vào VPS |
| ☐ | Cài Node, MySQL, Nginx, PM2 |
| ☐ | Database `entdash` |
| ☐ | Code trên VPS |
| ☐ | Backend `pm2 status` |
| ☐ | Frontend `dist` |
| ☐ | Domain + HTTPS |

MySQL local dev: xem `backend/MYSQL.md`.

---

## Tạo tài khoản admin (trên VPS)

Chạy trên server (không copy hash từ file — mỗi lần `node -e` ra chuỗi khác):

```bash
cd /var/www/appwebmanager/backend
node -e "require('bcryptjs').hash('passworld123', 10).then(h => console.log(h))"
```

```bash
sudo mysql entdash
```

```sql
INSERT INTO User (name, email, password, role, status, salary, createdAt, updatedAt)
VALUES (
  'Admin',
  'hieuclbank@gmail.com',
  '$2b$10$9rIk.uv0aukZM5Tca2QHzu4rvPHdHxX8SGkdNF3N/z2UnaE/CFKn6',
  'admin',
  'APPROVED',
  0,
  NOW(),
  NOW()
);

cd /var/www/appwebmanager/backend
node -e "require('bcryptjs').hash('HuuHieu123@', 10).then(console.log)"
```

Email đăng nhập phải **trùng từng ký tự** với cột `email` (ví dụ `...@gmai.com` khác `...@gmail.com`).

Nếu email đã tồn tại:

```sql
UPDATE User SET role = 'admin', status = 'APPROVED' WHERE email = 'email@example.com';
```

Đăng nhập trả **404** trong Network (POST) = không có user với email đó. **405** (GET) có thể bỏ qua.

---

## Cập nhật code mới (đã deploy rồi)

### Trên máy bạn (mỗi lần sửa xong)

```bash
cd E:\wordSpace\Thang_wroking\Appwebmanager
git add .
git commit -m "Mo ta thay doi"
git push origin main
```

(Nhánh khác `main` thì đổi cho đúng.)

### Trên VPS — lấy code mới

**Cách 1 — một lệnh (khuyên dùng):**

```bash
cd /var/www/appwebmanager
git pull --ff-only
bash scripts/vps-update.sh
```

**Cách 2 — từng bước:**

```bash
cd /var/www/appwebmanager
git pull --ff-only

# Xem vừa đổi gì (tùy chọn)
git log -3 --oneline
git diff HEAD~1 --stat

cd backend
npm ci && npm run build
npm run db:push          # chỉ cần khi có bảng/cột mới trong prisma/schema.prisma
pm2 restart api

cd ../frontends
npm ci && npm run build
```

Trình duyệt: **Ctrl+F5** (hoặc xóa cache) để thấy giao diện mới.

### Khi nào cần làm gì?

| Thay đổi trên GitHub | Trên VPS |
|----------------------|----------|
| Chỉ `frontends/` (UI, CSS) | `git pull` → build frontend |
| Chỉ `backend/src/` (API) | `git pull` → build backend → `pm2 restart api` |
| `backend/prisma/schema.prisma` | Thêm **`npm run db:push`** (giữ data, thêm bảng/cột) |
| WiFi chấm công | Admin thêm trong app, hoặc chạy `backend/prisma/seed-attendance-wifi.sql` |
| Đổi Nginx / domain | Sửa file nginx, `sudo nginx -t && sudo systemctl reload nginx` |

**Không ghi đè:** file `backend/.env` trên VPS (git không commit `.env`). Sau pull vẫn giữ mật khẩu DB / JWT cũ.

### VPS báo `Killed` khi `npm ci` (hết RAM)

VPS 1GB RAM thường bị Linux **OOM killer** tắt `npm`. Làm **một lần**:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

Rồi chạy lại `bash scripts/vps-update.sh`.

Hoặc cài từng phần (ít peak RAM hơn):

```bash
cd /var/www/appwebmanager/backend
NODE_OPTIONS=--max-old-space-size=768 npm ci --no-audit --no-fund
npm run build
npm run db:push
pm2 restart api

cd ../frontends
NODE_OPTIONS=--max-old-space-size=768 npm ci --no-audit --no-fund
npm run build
```

Cảnh báo `EBADENGINE` Prisma/node 22 trên Node 20 thường **chỉ là warn**, không phải nguyên nhân `Killed`.

### Lỗi thường gặp khi update

| Lỗi | Cách xử lý |
|-----|------------|
| `npm ci` → `Killed` | Thêm swap 2GB (mục trên) hoặc nâng RAM VPS |
| `git pull` conflict | `git stash` hoặc sửa conflict; tránh sửa code trực tiếp trên VPS |
| `P1000` / DB | Kiểm tra `DATABASE_URL` trong `backend/.env` |
| `db:push` báo mất data | Đọc kỹ câu hỏi Prisma; backup DB trước: `mysqldump entdash > backup.sql` |
| Site cũ, API mới | Hard refresh; kiểm tra `frontends/dist` có file mới (`ls -la dist`) |
| 502 Bad Gateway | `pm2 status` → `pm2 logs api` — API chưa chạy hoặc crash sau build |
| Frontend OK, API 500 | `bash scripts/vps-backend-check.sh` — build backend + `db:push` + restart PM2 |
| `companyWifi` / table không tồn tại | `cd backend && npm run db:push` |
| `DATABASE_URL chưa được cấu hình` | PM2 chạy sai thư mục — `cd backend && pm2 delete api && pm2 start npm --name api -- start` |
| Login 404 | User chưa có trên DB production — tạo admin như mục trên |

### Upload WinSCP (không dùng Git)

Copy **đè** thư mục đã sửa (bỏ `node_modules`, `.next`, `dist`), rồi chạy build + `pm2 restart api` như trên. Dễ sót file — nên dùng `git pull` nếu được.

