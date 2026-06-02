# Appwebmanager

Quản lý task, chi phí, nhân sự — frontend React (Vite) + backend Next.js API + MySQL (Prisma).

## Chạy local

```bash
# Backend
cd backend
cp .env.example .env   # sửa DATABASE_URL, JWT_SECRET...
npm install
npm run db:push
npm run dev

# Frontend (terminal khác)
cd frontends
cp .env.example .env
npm install
npm run dev
```

MySQL: xem `backend/MYSQL.md`.

## Deploy VPS

Xem `DEPLOY.md`.
