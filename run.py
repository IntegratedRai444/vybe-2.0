# run.py
import subprocess, sys, os

if __name__ == "__main__":
    # Make sure Ollama server is running; otherwise start it.
    try:
        import requests
        requests.get("http://127.0.0.1:11434/api/tags", timeout=2)
    except Exception:
        print("🔧 Starting Ollama daemon...")
        subprocess.Popen(["ollama", "serve"])
        print("⏳ Waiting for Ollama to become ready …")
        import time
        time.sleep(5)  # simple wait – you can replace with a proper health‑check loop.

    # Run the UI (which also spawns the FastAPI health endpoint)
    os.execvp(sys.executable, [sys.executable, "ui.py"])
