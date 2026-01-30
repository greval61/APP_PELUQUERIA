@echo off
chcp 65001 >nul

echo Iniciando Backend...
start "Backend" cmd /k "cd /d C:\ARMARIO\APP_PELUQUERIA\backend && node server.js"

timeout /t 5 >nul

echo Iniciando Frontend...
start "Frontend" cmd /k "cd /d C:\ARMARIO\APP_PELUQUERIA\frontend && npm install && npm start"

timeout /t 8 >nul
echo Listo! Aplicacion en http://localhost:3000
echo Las ventanas Backend y Frontend estan abiertas.
pause
