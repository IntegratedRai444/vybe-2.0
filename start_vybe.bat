@echo off
echo Starting Vybe AI OS...

echo Starting Backend...
start "Vybe Backend" cmd /k "cd /d "C:\Users\OMEN\OneDrive\Documents\vybe 2.0" && python backend/main.py"

echo Starting Frontend...
start "Vybe Frontend" cmd /k "cd /d "C:\Users\OMEN\OneDrive\Documents\vybe 2.0\frontend" && npm run dev"

echo Services starting... Please wait a moment.
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:5173
pause
