@echo off
:: Garantisce che lo script si sposti nella cartella corrente del progetto anche se aperto da un collegamento estern
cd /d "%~dp0"

title Deploy Automatico - Realmong Us
color 0A
echo =============================================
echo      DEPLOY AUTOMATICO SU GITHUB / VERCEL
echo =============================================
echo Cartella di lavoro: %CD%
echo.
echo 1. Aggiunta file modificati...
git add .

echo.
echo 2. Creazione commit automatico con data e ora...
git commit -m "Deploy %date% %time%"

echo.
echo 3. Invio modifiche su GitHub (push)...
git push origin main

echo.
echo =============================================
echo    DEPLOY COMPLETATO CON SUCCESSO!
echo    Vercel aggiornera il sito tra pochi secondi.
echo =============================================
echo.
timeout /t 3
