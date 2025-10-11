import asyncio
import requests
from .cloud_client import cloud_client

# Pre-configured API keys
API_KEYS = {
    "groq": "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",
    "anthropic": "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",
    "openai": "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"
}

class AutoModelSwitcher:
    def __init__(self):
        self.fallback_order = ["groq", "anthropic", "openai", "ollama"]
        self.current_provider = "groq"
        
    async def check_ollama(self) -> bool:
        try:
            response = requests.get("http://127.0.0.1:11434/api/tags", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    async def check_cloud_provider(self, provider: str) -> bool:
        try:
            if provider == "groq":
                cloud_client.generate_groq("test", API_KEYS["groq"], "llama3-8b-8192")
            elif provider == "anthropic":
                cloud_client.setup_anthropic(API_KEYS["anthropic"])
                cloud_client.generate_anthropic("test", "claude-3-haiku-20240307")
            elif provider == "openai":
                cloud_client.setup_openai(API_KEYS["openai"])
                cloud_client.generate_openai("test", "gpt-3.5-turbo")
            return True
        except:
            return False
    
    async def get_best_provider(self) -> tuple[str, str, str]:
        # Try providers in order
        for provider in self.fallback_order:
            if provider == "ollama":
                if await self.check_ollama():
                    return ("ollama", "codellama:7b", "")
            else:
                if await self.check_cloud_provider(provider):
                    models = {
                        "groq": "llama3-8b-8192",
                        "anthropic": "claude-3-haiku-20240307", 
                        "openai": "gpt-3.5-turbo"
                    }
                    return (provider, models[provider], API_KEYS[provider])
        
        # Fallback to ollama without checking
        return ("ollama", "codellama:7b", "")

auto_switcher = AutoModelSwitcher()