"""
Docker Sandbox for Safe Code Execution
Provides isolated environment for running untrusted code
"""
import docker
import tempfile
import os
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class DockerSandbox:
    """Manages Docker containers for safe code execution"""
    
    def __init__(self, image: str = "python:3.11-slim"):
        """
        Initialize Docker sandbox
        
        Args:
            image: Docker image to use for execution
        """
        try:
            self.client = docker.from_env()
            self.image = image
            self._ensure_image()
        except Exception as e:
            logger.warning(f"Docker not available: {e}")
            self.client = None
    
    def _ensure_image(self):
        """Ensure the Docker image is available"""
        try:
            self.client.images.get(self.image)
            logger.info(f"Docker image {self.image} found")
        except docker.errors.ImageNotFound:
            logger.info(f"Pulling Docker image {self.image}...")
            self.client.images.pull(self.image)
            logger.info(f"Docker image {self.image} pulled successfully")
    
    def is_available(self) -> bool:
        """Check if Docker is available"""
        return self.client is not None
    
    def execute_python(
        self,
        code: str,
        timeout: int = 30,
        memory_limit: str = "256m",
        cpu_quota: int = 50000,
        network_disabled: bool = True
    ) -> Dict[str, Any]:
        """
        Execute Python code in isolated Docker container
        
        Args:
            code: Python code to execute
            timeout: Execution timeout in seconds
            memory_limit: Memory limit (e.g., "256m", "1g")
            cpu_quota: CPU quota (100000 = 1 CPU)
            network_disabled: Disable network access
            
        Returns:
            Dict with stdout, stderr, exit_code, and error
        """
        if not self.is_available():
            return {
                "stdout": "",
                "stderr": "Docker not available",
                "exit_code": -1,
                "error": "Docker daemon not running or not installed"
            }
        
        # Create temporary file for code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Create container with security restrictions
            container = self.client.containers.run(
                self.image,
                command=f"python /code/{os.path.basename(temp_file)}",
                volumes={
                    os.path.dirname(temp_file): {
                        'bind': '/code',
                        'mode': 'ro'  # Read-only
                    }
                },
                mem_limit=memory_limit,
                cpu_quota=cpu_quota,
                network_disabled=network_disabled,
                detach=True,
                remove=False,
                security_opt=['no-new-privileges'],
                cap_drop=['ALL'],  # Drop all capabilities
                read_only=True,  # Read-only root filesystem
                tmpfs={'/tmp': 'size=100M,mode=1777'}  # Writable tmp
            )
            
            # Wait for execution with timeout
            try:
                result = container.wait(timeout=timeout)
                exit_code = result['StatusCode']
                
                # Get logs
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
                
                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": exit_code,
                    "error": None
                }
            except Exception as e:
                # Timeout or other error
                container.kill()
                return {
                    "stdout": "",
                    "stderr": str(e),
                    "exit_code": -1,
                    "error": f"Execution timeout or error: {str(e)}"
                }
            finally:
                # Cleanup container
                try:
                    container.remove(force=True)
                except:
                    pass
        
        finally:
            # Cleanup temp file
            try:
                os.unlink(temp_file)
            except:
                pass
    
    def execute_javascript(
        self,
        code: str,
        timeout: int = 30,
        memory_limit: str = "256m"
    ) -> Dict[str, Any]:
        """Execute JavaScript code in Node.js container"""
        if not self.is_available():
            return {
                "stdout": "",
                "stderr": "Docker not available",
                "exit_code": -1,
                "error": "Docker daemon not running"
            }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            container = self.client.containers.run(
                "node:18-slim",
                command=f"node /code/{os.path.basename(temp_file)}",
                volumes={
                    os.path.dirname(temp_file): {
                        'bind': '/code',
                        'mode': 'ro'
                    }
                },
                mem_limit=memory_limit,
                network_disabled=True,
                detach=True,
                remove=False,
                security_opt=['no-new-privileges'],
                cap_drop=['ALL']
            )
            
            try:
                result = container.wait(timeout=timeout)
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
                
                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": result['StatusCode'],
                    "error": None
                }
            except Exception as e:
                container.kill()
                return {
                    "stdout": "",
                    "stderr": str(e),
                    "exit_code": -1,
                    "error": f"Execution error: {str(e)}"
                }
            finally:
                try:
                    container.remove(force=True)
                except:
                    pass
        finally:
            try:
                os.unlink(temp_file)
            except:
                pass
    
    def execute_shell(
        self,
        command: str,
        timeout: int = 30,
        allowed_commands: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Execute shell command in container
        
        Args:
            command: Shell command to execute
            timeout: Timeout in seconds
            allowed_commands: List of allowed commands (whitelist)
        """
        if not self.is_available():
            return {
                "stdout": "",
                "stderr": "Docker not available",
                "exit_code": -1,
                "error": "Docker daemon not running"
            }
        
        # Check whitelist
        if allowed_commands:
            cmd_name = command.split()[0]
            if cmd_name not in allowed_commands:
                return {
                    "stdout": "",
                    "stderr": f"Command '{cmd_name}' not allowed",
                    "exit_code": -1,
                    "error": f"Command not in whitelist: {cmd_name}"
                }
        
        try:
            container = self.client.containers.run(
                "alpine:latest",
                command=f"sh -c '{command}'",
                mem_limit="128m",
                network_disabled=True,
                detach=True,
                remove=False,
                security_opt=['no-new-privileges'],
                cap_drop=['ALL']
            )
            
            try:
                result = container.wait(timeout=timeout)
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
                
                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": result['StatusCode'],
                    "error": None
                }
            except Exception as e:
                container.kill()
                return {
                    "stdout": "",
                    "stderr": str(e),
                    "exit_code": -1,
                    "error": f"Execution error: {str(e)}"
                }
            finally:
                try:
                    container.remove(force=True)
                except:
                    pass
        except Exception as e:
            return {
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1,
                "error": f"Container error: {str(e)}"
            }
    
    def cleanup_all(self):
        """Remove all sandbox containers"""
        if not self.is_available():
            return
        
        try:
            containers = self.client.containers.list(
                all=True,
                filters={"ancestor": self.image}
            )
            for container in containers:
                try:
                    container.remove(force=True)
                except:
                    pass
            logger.info(f"Cleaned up {len(containers)} containers")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


# Global sandbox instance
_sandbox = None


def get_sandbox() -> DockerSandbox:
    """Get or create global sandbox instance"""
    global _sandbox
    if _sandbox is None:
        _sandbox = DockerSandbox()
    return _sandbox