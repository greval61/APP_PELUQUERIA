@echo off
chcp 65001 >nul
start "Génesis - Backend" cmd /k "cd /d C:\ARMARIO\APP_PELUQUERIA\backend && node server.js"
start "Génesis - Frontend" cmd /k "cd /d C:\ARMARIO\APP_PELUQUERIA\frontend && if not exist node_modules (npm install) && npm start"
echo Ventanas iniciadas.
