# Eagle Rise — React (frontends)

Giao diện React **1:1** với thư mục `frontend/` (HTML tĩnh), có thêm:

- Responsive toàn bộ thiết bị (sidebar mobile, grid co giãn)
- Cỡ chữ fluid (`clamp`) theo viewport

Thư mục `frontend/` **không bị xóa** — vẫn chạy độc lập trên cổng 8080.

## Chạy

```bash
# Terminal 1 — Backend API
cd backend
npm run dev

# Terminal 2 — React UI (mới)
cd frontends
npm install
npm run dev
```

Mở: **http://localhost:5173**

Đổi cổng API: tạo file `.env` từ `.env.example` hoặc `localStorage.setItem('API_PORT', '3000')`.

## Cấu trúc

- `src/styles/style.css` — CSS gốc Eagle Rise
- `src/styles/responsive.css` — typography & breakpoint bổ sung
- `src/pages/` — từng màn (Dashboard, HR, Finance, Tasks, Costs, Login, Register)
- `src/lib/auth.tsx` — đăng nhập, phân quyền menu

## Logo

Đặt file `logo.png` vào `frontends/public/` (copy từ `frontend/logo.png` nếu có).
