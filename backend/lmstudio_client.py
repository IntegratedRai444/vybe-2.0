"""
LM Studio Integration
Local model inference using LM Studio
"""
import requests
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

class LMStudioClient:
    """Client for LM Studio local server"""
    
    def __init__(self, base_url: str = "http://localhost:1234"):
        """Initialize LM Studio client"""
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        
    def check_health(self) -> bool:
        """Check if LM Studio server is running"""
        try:
            response = self.session.get(f"{self.base_url}/v1/models", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.debug(f"LM Studio health check failed: {e}")
            return False
    
    def list_models(self) -> List[str]:
        """List available models"""
        try:
            response = self.session.get(f"{self.base_url}/v1/models", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [model["id"] for model in data.get("data", [])]
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
        
        return []
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Optional[str]:
        """Chat completion"""
        if not self.check_health():
            logger.warning("LM Studio server not available")
            return None
        
        try:
            payload = {
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": stream
            }
            
            if model:
                payload["model"] = model
            
            response = self.session.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")
            else:
                logger.error(f"LM Studio chat failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"LM Studio chat error: {e}")
        
        return None
    
    def complete(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Optional[str]:
        """Text completion"""
        if not self.check_health():
            logger.warning("LM Studio server not available")
            return None
        
        try:
            payload = {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            if model:
                payload["model"] = model
            
            response = self.session.post(
                f"{self.base_url}/v1/completions",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("text", "")
            else:
                logger.error(f"LM Studio completion failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"LM Studio completion error: {e}")
        
        return None
    
    def get_model_info(self) -> Optional[Dict[str, Any]]:
        """Get current model info"""
        try:
            response = self.session.get(f"{self.base_url}/v1/models", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = data.get("data", [])
                if models:
                    return models[0]
        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
        
        return None

# Singleton instance
_lmstudio_client: Optional[LMStudioClient] = None

def get_lmstudio_client(base_url: str = "http://localhost:1234") -> LMStudioClient:
    """Get or create LM Studio client"""
    global _lmstudio_client
    
    if _lmstudio_client is None:
        _lmstudio_client = LMStudioClient(base_url=base_url)
    
    return _lmstudio_client