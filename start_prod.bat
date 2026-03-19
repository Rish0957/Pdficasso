@echo off
SETLOCAL

echo =========================================
echo   PDFicasso - Build and Start (STABLE)
echo =========================================
echo.

echo [1/3] Stopping existing "pdficasso-dev" containers...
docker compose -p pdficasso-dev down

echo [2/3] Building and starting "pdficasso-dev" (Frontend: 8082, Backend: 3001)...
docker compose -p pdficasso-dev up -d --build

echo [3/3] Cleaning up old images...
docker image prune -f

echo.
echo =========================================
echo   PDFicasso is now running!
echo   Frontend : http://localhost:8082
echo   Backend  : http://localhost:3001
echo =========================================
echo.
pause

ENDLOCAL
