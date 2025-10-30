import uvicorn
from backend.main import app
import threading

def start_ollama():
    import subprocess
    try:
        subprocess.Popen(["ollama", "serve"])
    except Exception as e:
        print(f"Note: Could not start Ollama - {e}")

if __name__ == "__main__":
    # Start Ollama in background
    ollama_thread = threading.Thread(target=start_ollama, daemon=True)
    ollama_thread.start()
    
    # Start the FastAPI server
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1
    )