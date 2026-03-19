@echo off
SETLOCAL

:: Store the root directory
SET ROOT_DIR=%~dp0

echo =========================================
echo   Pdficasso - Production Start
echo =========================================
echo.

echo [1/5] Closing any existing instances on ports 3001 and 5173...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o 2^>NUL ^| findstr ":3001 "') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >NUL 2>&1
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o 2^>NUL ^| findstr ":5173 "') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >NUL 2>&1
)
echo    Done.

echo [2/5] Installing dependencies (if needed)...
cd /d "%ROOT_DIR%backend"
call npm install --silent
cd /d "%ROOT_DIR%frontend"
call npm install --silent
echo    Done.

echo [3/5] Building Backend (TypeScript)...
cd /d "%ROOT_DIR%backend"
call npx tsc
IF %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Backend build failed!
    pause
    exit /b 1
)
echo    Done.

echo [4/5] Building Frontend (Vite)...
cd /d "%ROOT_DIR%frontend"
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Frontend build failed!
    pause
    exit /b 1
)
echo    Done.

echo [5/5] Starting Services...
cd /d "%ROOT_DIR%"
start "Pdficasso Backend (Port 3001)" cmd /k "cd /d "%ROOT_DIR%backend" && node dist/index.js"
start "Pdficasso Frontend (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && npx -y serve -s dist -l 5173"

echo.
echo =========================================
echo   Pdficasso is now running!
echo   Backend  : http://localhost:3001
echo   Frontend : http://localhost:5173
echo =========================================
echo.
pause

ENDLOCAL
