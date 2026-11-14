@echo off
title Family Watch Together
echo ===================================================
echo     🎬 Family Watch Together
echo ===================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please download and install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] First time setup: Installing packages...
    call npm install
)

if not exist "server\dist\index.js" (
    echo [INFO] Building project...
    call npm run build
)

echo.
echo [OK] Opening Web Browser on http://localhost:5000 ...
start "" "http://localhost:5000"
echo.
echo [OK] Server is starting on port 5000 (Admin key: admin123)
echo Press Ctrl+C to stop the server anytime.
echo.
call npm start
pause

