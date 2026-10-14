@echo off
title AFT Converter - Installatie
echo ============================================
echo  AFT Converter v7 - Eerste keer instellen
echo ============================================
echo.
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python niet gevonden. Installeren via winget...
    winget install -e --id Python.Python.3.12 --silent
    echo.
    echo Herstart dit venster en dubbelklik opnieuw op install.bat
    pause
    exit
)
echo Python gevonden. Pakketten installeren...
pip install pandas openpyxl xlwt xlrd --quiet
echo.
echo ============================================
echo  Installatie klaar! Dubbelklik op start.bat
echo ============================================
pause
