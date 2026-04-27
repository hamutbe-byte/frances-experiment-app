@echo off
setlocal

cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in C:\Program Files\nodejs.
  echo Please install Node.js LTS first, then try again.
  pause
  exit /b 1
)

if not exist "node_modules\next" (
  echo Dependencies were not found. Installing them now...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b %errorlevel%
  )
)

echo.
echo Building Frances experiment app for faster production mode...
echo.

call npm.cmd run build
if errorlevel 1 (
  echo.
  echo npm run build failed.
  pause
  exit /b %errorlevel%
)

echo.
echo Starting Frances experiment app...
echo Open http://localhost:3000 in your browser.
echo Press Ctrl+C in this window to stop the server.
echo.

call npm.cmd run start

echo.
echo The server stopped or failed to start.
pause
