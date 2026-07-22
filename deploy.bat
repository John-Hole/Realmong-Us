@echo off
title Deploy Automatico - Realmong Us
color 0A
echo =============================================
echo      DEPLOY AUTOMATICO SU GITHUB / VERCEL
echo =============================================
echo.
echo 1. Aggiunta file modificati...
git add .

echo.
set /p msg="2. Inserisci una descrizione delle modifiche (oppure premi INVIO): "
if "%msg%"=="" set msg=Aggiornamento automatico del %date% %time%

echo.
echo 3. Creazione commit...
git commit -m "%msg%"

echo.
echo 4. Invio modifiche su GitHub (push)...
git push origin main

echo.
echo =============================================
echo    DEPLOY COMPLETATO! Vercel aggiornera la
echo    pagina online tra pochi secondi.
echo =============================================
echo.
pause
