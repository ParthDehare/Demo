@echo off
REM VaultMind 2.0 - Complete Stack Startup
REM Run Backend + Frontend

echo ====================================================
echo VaultMind 2.0 - Data Fusion Engine Startup
echo ====================================================
echo.

echo [1/4] Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

echo.
echo [2/4] Installing/Verifying Python dependencies...
pip install -q fastapi uvicorn pandas torch
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Starting FastAPI Backend on http://127.0.0.1:8000...
start "VaultMind Backend" cmd /k "cd /d d:\DEmo && python main.py"

echo.
echo [4/4] Waiting 3 seconds for backend to start...
timeout /t 3

echo.
echo [5/5] Starting React Frontend on http://localhost:5173...
start "VaultMind Frontend" cmd /k "cd /d d:\DEmo\frontend && npm run dev"

echo.
echo ====================================================
echo ✅ Stack Starting!
echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to continue monitoring...
echo ====================================================
pause
