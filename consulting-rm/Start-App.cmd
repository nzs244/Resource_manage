@echo off
setlocal
REM Resource Hub — start dev server and open the app in your browser.
REM Double-click this file, or run: Start-App.cmd
REM (Do not double-click launch.mjs — Windows may open Visual Studio instead of Node.)

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install LTS from https://nodejs.org/ then try again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Vite not found. Run: npm install
  pause
  exit /b 1
)

echo.
echo Starting dev server — browser should open to http://localhost:5173
echo Press Ctrl+C in this window to stop.
echo.

node "%~dp0node_modules\vite\bin\vite.js" --open
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo Server exited with an error.
  pause
)
exit /b %EXITCODE%
