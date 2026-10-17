@echo off
title Rachna Electricals - First Time Setup
color 0A

cd /d "%~dp0"

echo.
echo  ============================================
echo    Rachna Electricals - FIRST TIME SETUP
echo  ============================================
echo.
echo  This will take 3-5 minutes.
echo  Run this only ONCE.
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python is not installed.
  echo.
  echo Download from https://www.python.org/downloads/
  echo During install, tick "Add Python to PATH".
  echo.
  pause
  exit /b 1
)

echo  Python found.
echo.

REM Create venv if missing
if not exist "backend\venv\Scripts\activate.bat" (
  echo  Creating Python environment...
  cd backend
  python -m venv venv
  call venv\Scripts\activate.bat
  echo.
  echo  Installing dependencies (this may take 2-3 minutes)...
  pip install -r requirements.txt
  cd ..
  echo  Done.
) else (
  echo  Python environment already exists.
)

REM Seed database if missing
if not exist "backend\shop.db" (
  echo.
  echo  Loading product catalog and opening balances...
  cd backend
  call venv\Scripts\activate.bat
  python -m scripts.seed_products
  cd ..
  echo  Done.
) else (
  echo  Database already exists. Skipping seed.
)

echo.
echo  ============================================
echo    SETUP COMPLETE
echo  ============================================
echo.
echo  You can now start the app by double-clicking
echo  "shop-start.bat".
echo.
pause