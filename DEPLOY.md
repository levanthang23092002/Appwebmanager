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

Sửa `frontends/src/lib/api.ts` để production không gọi `localhost` (nhờ AI nếu chưa sửa).

```bash
cd /var/www/appwebmanager/frontends
echo VITE_API_URL= > .env.production
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
