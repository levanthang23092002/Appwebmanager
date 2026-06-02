@echo off
chcp 65001 >nul
echo ==============================================
echo   KHOI DONG HE THONG QUAN TRI EAGLE RISE
echo ==============================================
echo.

echo [1/3] Dang khoi dong Backend (Next.js) tren cong 3000...
start "Eagle Rise Backend" cmd /k "cd backend && npm run dev"

echo [2/3] Frontend HTML cu (giu nguyen) tren cong 8080...
start "Eagle Rise Frontend HTML" cmd /k "cd frontend && npx serve . -p 8080"

echo [3/3] Frontend React (moi) tren cong 5173...
start "Eagle Rise Frontend React" cmd /k "cd frontends && npm run dev"

echo.
echo Da gui lenh khoi dong! Hay cho khoang 5-10 giay de ca server chay xong.
echo.
echo ==============================================
echo   LINK TRUY CAP CUA BAN:
echo   React (moi)   : http://localhost:5173
echo   HTML (cu)     : http://localhost:8080
echo   Backend API   : http://localhost:3000
echo ==============================================
echo.
pause
