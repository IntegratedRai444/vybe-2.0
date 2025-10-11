"""
Tabby Integration
Code completion using Tabby server
"""
import requests
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class TabbyClient:
    """Client for Tabby code completion server"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        """Initialize Tabby client"""
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        
    def check_health(self) -> bool:
        """Check if Tabby server is running"""
        try:
            response = self.session.get(f"{self.base_url}/v1/health", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.debug(f"Tabby health check failed: {e}")
            return False
    
    def complete(
        self,
        prompt: str,
        language: Optional[str] = None,
        max_tokens: int = 100,
        temperature: float = 0.2
    ) -> Optional[str]:
        """Get code completion from Tabby"""
        if not self.check_health():
            logger.warning("Tabby server not available")
            return None
        
        try:
            payload = {
                "prompt": prompt,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            
            if language:
                payload["language"] = language
            
            response = self.session.post(
                f"{self.base_url}/v1/completions",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("text", "")
            else:
                logger.error(f"Tabby completion failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Tabby completion error: {e}")
        
        return None
    
    def complete_inline(
        self,
        code_before: str,
        code_after: str,
        language: Optional[str] = None
    ) -> Optional[str]:
        """Get inline completion"""
        prompt = code_before
        return self.complete(prompt, language=language, max_tokens=50)
    
    def get_info(self) -> Optional[Dict[str, Any]]:
        """Get Tabby server info"""
        try:
            response = self.session.get(f"{self.base_url}/v1/info", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get Tabby info: {e}")
        
        return None

# Singleton instance
_tabby_client: Optional[TabbyClient] = None

def get_tabby_client(base_url: str = "http://localhost:8080") -> TabbyClient:
    """Get or create Tabby client"""
    global _tabby_client
    
    if _tabby_client is None:
        _tabby_client = TabbyClient(base_url=base_url)
    
    return _tabby_client