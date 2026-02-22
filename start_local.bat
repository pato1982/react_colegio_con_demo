@echo off
echo ==========================================
echo       INICIANDO ENTORNO LOCAL
echo ==========================================

echo 1. Iniciando Servidor Backend (Puerto 3001)...
start "Backend Server (Node.js)" cmd /k "cd server && npm start"

timeout /t 3

echo 2. Iniciando Frontend React (Puerto 5173)...
start "Frontend Client (Vite)" cmd /k "npm run dev"

echo.
echo ==========================================
echo    TODO LISTO - ABRIENDO NAVEGADOR
echo ==========================================
timeout /t 2
start http://localhost:5173
