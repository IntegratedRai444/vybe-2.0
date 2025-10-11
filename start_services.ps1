# Start Vybe AI OS Services
Write-Host "Starting Vybe AI OS..." -ForegroundColor Green

# Start Backend
Write-Host "Starting Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\OMEN\OneDrive\Documents\vybe 2.0'; python backend/main.py"

# Wait a moment
Start-Sleep -Seconds 3

# Start Frontend  
Write-Host "Starting Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\OMEN\OneDrive\Documents\vybe 2.0\frontend'; npm run dev"

Write-Host "Services are starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Please wait a moment for services to fully start." -ForegroundColor Yellow
