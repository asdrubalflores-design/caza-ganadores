@echo off
title Caza-Ganadores
echo.
echo   ====================================================
echo    Iniciando Caza-Ganadores...
echo    Se abrira tu navegador en unos segundos.
echo    Para apagar la app: cierra esta ventana.
echo   ====================================================
echo.
cd /d "C:\Users\pc\Documents\claude"
start "" http://localhost:3000
"C:\Program Files\nodejs\node.exe" server.js
pause
