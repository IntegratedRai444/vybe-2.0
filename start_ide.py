#!/usr/bin/env python3
"""
Vybe AI OS Startup Script
Starts the complete IDE with proper error handling and service checks
"""

import os
import sys
import time
import subprocess
import threading
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VybeIDEStarter:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.services_status = {
            "backend": False,
            "frontend": False,
            "ollama": False
        }
    
    def check_dependencies(self):
        """Check if required dependencies are available"""
        logger.info("Checking dependencies...")
        
        # Check Python
        if sys.version_info < (3, 8):
            logger.error("Python 3.8+ is required")
            return False
        
        # Check Node.js
        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode != 0:
                logger.error("Node.js is not installed")
                return False
            logger.info(f"Node.js version: {result.stdout.strip()}")
        except FileNotFoundError:
            logger.error("Node.js is not installed")
            return False
        
        # Check if backend dependencies are installed
        try:
            import fastapi
            import uvicorn
            logger.info("Backend dependencies are available")
        except ImportError as e:
            logger.error(f"Backend dependencies missing: {e}")
            logger.info("Run: pip install -r requirements.txt")
            return False
        
        # Check if frontend dependencies are installed
        frontend_node_modules = Path("frontend/node_modules")
        if not frontend_node_modules.exists():
            logger.error("Frontend dependencies not installed")
            logger.info("Run: cd frontend && npm install")
            return False
        
        logger.info("All dependencies are available")
        return True
    
    def check_ollama(self):
        """Check if Ollama is available (optional)"""
        try:
            result = subprocess.run(["ollama", "list"], capture_output=True, timeout=5)
            if result.returncode == 0:
                logger.info("Ollama is available")
                self.services_status["ollama"] = True
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        
        logger.warning("Ollama is not available - AI features will be limited")
        return False
    
    def start_backend(self):
        """Start the backend server"""
        logger.info("Starting backend server...")
        
        try:
            # Check if backend directory exists
            backend_dir = Path("backend")
            if not backend_dir.exists():
                logger.error("Backend directory not found")
                return False
            
            # Check if main.py exists
            main_py = backend_dir / "main.py"
            if not main_py.exists():
                logger.error("backend/main.py not found")
                return False
            
            # Start the backend server
            self.backend_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
                cwd=backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            
            # Wait and check if it started
            logger.info("Waiting for backend to start...")
            for i in range(10):  # Wait up to 10 seconds
                time.sleep(1)
                if self.backend_process.poll() is not None:
                    # Process died
                    stdout, _ = self.backend_process.communicate()
                    logger.error(f"Backend server failed to start. Output: {stdout}")
                    return False
                
                # Check if server is responding
                try:
                    import requests
                    response = requests.get("http://127.0.0.1:8000/health", timeout=2)
                    if response.status_code == 200:
                        logger.info("Backend server started successfully")
                        self.services_status["backend"] = True
                        return True
                except:
                    continue
            
            logger.error("Backend server did not respond within 10 seconds")
            return False
                
        except Exception as e:
            logger.error(f"Error starting backend: {e}")
            return False
    
    def start_frontend(self):
        """Start the frontend development server"""
        logger.info("Starting frontend server...")
        
        try:
            # Change to frontend directory
            frontend_dir = Path("frontend")
            if not frontend_dir.exists():
                logger.error("Frontend directory not found")
                return False
            
            # Start the frontend server
            self.frontend_process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait a bit and check if it started
            time.sleep(5)
            if self.frontend_process.poll() is None:
                logger.info("Frontend server started successfully")
                self.services_status["frontend"] = True
                return True
            else:
                logger.error("Frontend server failed to start")
                return False
                
        except Exception as e:
            logger.error(f"Error starting frontend: {e}")
            return False
    
    def monitor_services(self):
        """Monitor running services"""
        while True:
            time.sleep(10)
            
            # Check backend
            if self.backend_process and self.backend_process.poll() is not None:
                logger.error("Backend server stopped unexpectedly")
                self.services_status["backend"] = False
            
            # Check frontend
            if self.frontend_process and self.frontend_process.poll() is not None:
                logger.error("Frontend server stopped unexpectedly")
                self.services_status["frontend"] = False
    
    def cleanup(self):
        """Clean up processes"""
        logger.info("Shutting down services...")
        
        if self.backend_process:
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
        
        if self.frontend_process:
            self.frontend_process.terminate()
            try:
                self.frontend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
        
        logger.info("Cleanup complete")
    
    def start(self):
        """Start the complete IDE"""
        logger.info("🚀 Starting Vybe AI OS...")
        
        try:
            # Check dependencies
            if not self.check_dependencies():
                return False
            
            # Check optional services
            self.check_ollama()
            
            # Start backend
            if not self.start_backend():
                return False
            
            # Start frontend
            if not self.start_frontend():
                self.cleanup()
                return False
            
            # Print status
            logger.info("✅ Vybe AI OS is running!")
            logger.info("📝 Frontend: http://localhost:5173")
            logger.info("🔧 Backend API: http://localhost:8000")
            logger.info("📚 API Docs: http://localhost:8000/docs")
            
            if self.services_status["ollama"]:
                logger.info("🤖 AI Services: Available")
            else:
                logger.info("🤖 AI Services: Limited (install Ollama for full AI features)")
            
            logger.info("Press Ctrl+C to stop")
            
            # Start monitoring in background
            monitor_thread = threading.Thread(target=self.monitor_services, daemon=True)
            monitor_thread.start()
            
            # Wait for interrupt
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("Received shutdown signal")
            
            return True
            
        except Exception as e:
            logger.error(f"Startup error: {e}")
            return False
        finally:
            self.cleanup()

def main():
    """Main entry point"""
    starter = VybeIDEStarter()
    success = starter.start()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()