@echo off
chcp 65001 >nul
cd /d C:\ARMARIO\APP_PELUQUERIA\backend
echo Iniciando backend en puerto 5000...
node server.js
pause
