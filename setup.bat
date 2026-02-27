@echo off
echo ==========================================
echo Setting up Murder in Olympus...
echo ==========================================

echo [1/3] Backend (Python)
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
call deactivate
cd ..

echo [2/3] Game Server (Node)
cd game-server
call npm install
cd ..

echo [3/3] Frontend (Vite)
cd frontend
call npm install
cd ..

echo ==========================================
echo Setup Complete!
echo ==========================================


pause