@echo off
SETLOCAL

:: Store the root directory
SET ROOT_DIR=%~dp0

echo =========================================
echo   PDFicasso - Start Services
echo =========================================
echo.

echo [1/2] Closing any existing instances on ports 3001 and 5173...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o 2^>NUL ^| findstr ":3001 "') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >NUL 2>&1
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o 2^>NUL ^| findstr ":5173 "') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >NUL 2>&1
)
echo    Done.

echo [2/2] Starting Services...
start "PDFicasso Backend (Port 3001)" cmd /k "cd /d "%ROOT_DIR%backend" && node dist/index.js"
start "PDFicasso Frontend (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && npx -y serve -s dist -l 5173"

echo.
echo =========================================
echo   PDFicasso is now running!
echo   Backend  : http://localhost:3001
echo   Frontend : http://localhost:5173
echo =========================================
echo.
pause

ENDLOCAL
