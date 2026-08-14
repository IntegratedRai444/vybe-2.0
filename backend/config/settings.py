import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    # Application settings
    DEBUG: bool = os.getenv("ENVIRONMENT", "development").lower() == "development"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Model providers configuration
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    # API Keys
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")

    # API Base URLs
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    LM_STUDIO_BASE_URL: str = os.getenv(
        "LM_STUDIO_BASE_URL", "http://localhost:1234/v1"
    )
    TABBY_BASE_URL: str = os.getenv("TABBY_BASE_URL", "http://localhost:5000/v1")

    # Model configurations
    DEFAULT_TEMPERATURE: float = 0.2
    DEFAULT_MAX_TOKENS: int = 4096

    # Cache settings
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600  # 1 hour

    # Rate limiting
    RATE_LIMIT: int = int(os.getenv("RATE_LIMIT", "60"))  # requests per minute

    # Logging configuration
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    @property
    def model_providers(self) -> Dict[str, Dict[str, Any]]:
        """Configuration for each model provider."""
        return {
            "ollama": {"base_url": self.OLLAMA_HOST, "timeout": 300, "priority": 1},
            "openai": {
                "api_key": self.OPENAI_API_KEY,
                "base_url": self.OPENAI_BASE_URL,
                "priority": 2,
            },
            "anthropic": {"api_key": self.ANTHROPIC_API_KEY, "priority": 3},
            "groq": {"api_key": self.GROQ_API_KEY, "priority": 4},
            "lm_studio": {"base_url": self.LM_STUDIO_BASE_URL, "priority": 5},
            "tabby": {"base_url": self.TABBY_BASE_URL, "priority": 6},
        }

    def get_provider_config(self, provider_name: str) -> Dict[str, Any]:
        """Get configuration for a specific provider."""
        return self.model_providers.get(provider_name.lower(), {})


# Create settings instance
settings = Settings()

# For backward compatibility
config = settings
