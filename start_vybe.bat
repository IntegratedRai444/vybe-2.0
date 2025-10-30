@echo off
echo Starting Vybe AI Development Environment...
start "" /B ollama serve
timeout /t 3 /nobreak >nul
start python run.py
start http://localhost:3000