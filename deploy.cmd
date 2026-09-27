@echo off
rem 7K Note - deploy (double-click or type: deploy)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
echo.
pause
