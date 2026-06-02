# MySQL — hướng dẫn nhanh

Dự án đã chuyển từ SQLite (`dev.db`) sang **MySQL**.

## 1. Cài MySQL

- Windows: [XAMPP](https://www.apachefriends.org/) hoặc [MySQL Installer](https://dev.mysql.com/downloads/installer/)
- Bật service MySQL (port **3306**)

## 2. Tạo database

Mở phpMyAdmin hoặc MySQL CLI, chạy file `prisma/init-mysql.sql`:

```sql
CREATE DATABASE IF NOT EXISTS entdash
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## 3. Cấu hình `.env`

Sao chép từ `.env.example` hoặc sửa `DATABASE_URL`:

```env
DATABASE_URL="mysql://root:MAT_KHAU@localhost:3306/entdash"
```

| Trường hợp | Chuỗi kết nối |
|------------|----------------|
| XAMPP, root **không** mật khẩu | `mysql://root:@localhost:3306/entdash` |
| MySQL có mật khẩu root | `mysql://root:YourPass@localhost:3306/entdash` |

Nếu `npm run db:push` báo **P1000 Authentication failed** → sửa user/mật khẩu trong `.env` cho khớp MySQL của bạn.

## 4. Tạo bảng (Prisma)

```bash
cd backend
npm install
npm run db:generate
npm run db:push
```

**Đổi schema (mọi bảng dùng `id` INT tự tăng):** Nếu báo lỗi migration, reset DB dev:

```bash
npx prisma db push --force-reset
```

(Data cũ sẽ mất — tạo lại sau khi reset.)

## 5. Chạy app

```bash
npm run dev
```

Hoặc dùng `start.bat` ở thư mục gốc dự án.

## File cũ

- `dev.db` (SQLite) **không còn dùng** — có thể xóa sau khi MySQL chạy ổn.
- Dữ liệu cũ trong SQLite cần nhập lại hoặc migrate thủ công nếu cần giữ.

## Production (server)

Đổi `DATABASE_URL` trên server thành user/password host thật, ví dụ:

```env
DATABASE_URL="mysql://entdash:STRONG_PASS@127.0.0.1:3306/entdash"
```
