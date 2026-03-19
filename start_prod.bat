@echo off
echo =========================================
echo PDF Splitter ^& Merger - Production Start
echo =========================================

echo [1/4] Closing any existing instances on ports 3001 and 5173...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3001') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T 2>NUL
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :5173') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T 2>NUL
)

echo [2/4] Building Backend...
cd backend
call npx tsc

echo [3/4] Building Frontend...
cd ..\frontend
call npm run build

echo [4/4] Starting Services...
cd ..
start "PDF Backend (Port 3001)" cmd /c "cd backend && node dist/index.js"
start "PDF Frontend (Port 5173)" cmd /c "cd frontend && npx serve -y -s dist -l 5173"

echo.
echo Process complete! 
echo - The Backend is running hidden on port 3001.
echo - The Frontend is running hidden on port 5173.
echo - Access your app at: http://localhost:5173
echo.
pause
