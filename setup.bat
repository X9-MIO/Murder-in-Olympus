@echo off
echo ==========================================
echo Setting up Murder in Olympus Project...
echo ==========================================

echo.
echo [1/3] Setting up Python Backend...
cd backend
:: Check if the virtual environment already exists. If not, make one!
IF NOT EXIST "myvenv\" (
    echo Creating new virtual environment (myvenv)...
    python -m venv myvenv
)
:: Activate it and install dependencies
call venv\Scripts\activate
echo Installing Python dependencies...
pip install -r requirements.txt
cd ..

echo.
echo [2/3] Setting up Node Game Server...
cd game-server
echo Installing game server dependencies...
call npm install
cd ..

echo.
echo [3/3] Setting up Vite Frontend...
cd frontend
echo Installing frontend dependencies...
call npm install
cd ..

echo.
echo ==========================================
echo Setup Complete! All environments and dependencies are ready.
echo ==========================================
pause