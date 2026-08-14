@echo off
echo 🚀 Setting up Ollama Auto-Start...
echo.

REM Check if Ollama is installed
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama not found in PATH
    echo Please install Ollama from https://ollama.ai
    pause
    exit /b 1
)

echo ✅ Ollama found in PATH

REM Check if Ollama is already running
ollama list >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama is already running!
    echo.
    echo Your models:
    ollama list
    echo.
    echo ✅ Auto-start is likely already configured
    pause
    exit /b 0
)

echo 📝 Ollama is not running. Setting up auto-start...

REM Method 1: Try to create Windows service (requires admin)
echo Attempting to create Windows service...
sc create ollama binPath= "ollama serve" start= auto DisplayName= "Ollama AI Service" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Windows service created successfully
    sc start ollama >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Ollama service started
        echo ✅ Ollama will now auto-start with Windows
        goto :success
    )
)

REM Method 2: Startup folder method (fallback)
echo 📁 Using startup folder method...
set "startup_folder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
echo @echo off > "%startup_folder%\start_ollama.bat"
echo start /min ollama serve >> "%startup_folder%\start_ollama.bat"
echo ✅ Added Ollama to Windows startup folder

REM Start Ollama now
echo 🚀 Starting Ollama...
start /min ollama serve

REM Wait a moment for Ollama to start
timeout /t 3 /nobreak >nul

REM Test if Ollama is working
ollama list >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama is now running!
    goto :success
) else (
    echo ⚠️ Ollama may take a moment to start
    echo Try running 'ollama list' in a few seconds
)

:success
echo.
echo 🎉 Setup complete!
echo.
echo Your available models:
ollama list 2>nul || echo (Ollama starting up...)
echo.
echo 💡 Ollama will now start automatically when Windows boots
echo 🚀 You can now use your IDE with local AI models!
echo.
pause
