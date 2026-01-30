@echo off
chcp 65001 >nul
echo Comprobando Node.js y npm...
node -v >nul 2>&1
if ERRORLEVEL 1 (
  echo Node.js no encontrado. Descarga e instala Node.js LTS desde https://nodejs.org y vuelve a intentarlo.
  pause
  exit /b 1
)
npm -v >nul 2>&1
if ERRORLEVEL 1 (
  echo npm no encontrado. Revisa la instalacion de Node.js.
  pause
  exit /b 1
)
echo Node.js y npm detectados.
echo.

REM Instalar dependencias backend
cd /d C:\ARMARIO\APP_PELUQUERIA\backend
if exist package.json (
  echo Instalando dependencias backend...
  npm install
) else (
  echo package.json no encontrado en backend, verifica la ruta.
  pause
  exit /b 1
)

REM Inicializar base de datos (si existe pregunta en consola)
echo Iniciando script de base de datos (si no existe la creara)...
node db.js

REM Instalar dependencias frontend
cd /d C:\ARMARIO\APP_PELUQUERIA\frontend
if exist package.json (
  echo Instalando dependencias frontend...
  npm install
) else (
  echo package.json no encontrado en frontend, verifica la ruta.
  pause
  exit /b 1
)

echo.
echo Configuracion completada. Usa start-backend.bat / start-frontend.bat o start-all.bat para arrancar la aplicacion.
pause
