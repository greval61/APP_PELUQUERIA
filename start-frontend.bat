@echo off
chcp 65001 >nul
cd /d C:\ARMARIO\APP_PELUQUERIA\frontend
if not exist node_modules (
  echo Instalando dependencias frontend...
  npm install
)
echo Iniciando frontend (http://localhost:3000)...
npm start
pause
