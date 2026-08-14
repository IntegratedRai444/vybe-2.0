import os

import requests

from .cloud_client import cloud_client

# Retrieve API keys from environment variables
API_KEYS = {
    "groq": os.getenv("GROQ_API_KEY", ""),
    "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
    "openai": os.getenv("OPENAI_API_KEY", ""),
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
                        "openai": "gpt-3.5-turbo",
                    }
                    return (provider, models[provider], API_KEYS[provider])

        # Fallback to ollama without checking
        return ("ollama", "codellama:7b", "")


auto_switcher = AutoModelSwitcher()
