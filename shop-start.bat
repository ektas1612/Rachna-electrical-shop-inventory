@echo off
title Rachna Electricals - Running

cd /d "%~dp0"

REM Sanity check
if not exist "backend\venv\Scripts\activate.bat" (
  echo ERROR: Please run "setup-windows.bat" first.
  echo.
  pause
  exit /b 1
)

if not exist "backend\shop.db" (
  echo ERROR: Database not found. Please run "setup-windows.bat" first.
  echo.
  pause
  exit /b 1
)

if not exist "frontend\dist\index.html" (
  echo ERROR: Frontend not built. Contact your developer.
  echo.
  pause
  exit /b 1
)

echo.
echo  Starting Rachna Electricals...
echo  Browser will open in a moment.
echo.
echo  Keep this window open while using the app.
echo.

call backend\venv\Scripts\activate.bat
cd backend

start "" http://localhost:8000
uvicorn app.main:app --host 127.0.0.1 --port 8000

echo.
echo  Server stopped. Press any key to close.
pause >nul