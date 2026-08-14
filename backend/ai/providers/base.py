import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union


class BaseModelProvider(ABC):
    """Base class for all model providers."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.available_models: List[str] = []
        self._check_availability()

    @abstractmethod
    def _check_availability(self) -> bool:
        """Check if the provider is available and update available_models."""
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        """Generate text completion."""
        pass

    @abstractmethod
    def embed(self, text: str, model: str) -> List[float]:
        """Generate embeddings for the given text."""
        pass

    @abstractmethod
    def stream_generate(
        self,
        prompt: str,
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs,
    ) -> str:
        """Stream text completion."""
        pass

    def is_model_available(self, model_name: str) -> bool:
        """Check if a specific model is available."""
        return model_name in self.available_models

    def get_available_models(self) -> List[str]:
        """Get list of available models."""
        return self.available_models

    def _get_api_key(self, env_var: str) -> str:
        """Get API key from environment variable."""
        api_key = os.getenv(env_var)
        if not api_key:
            raise ValueError(f"API key not found in environment variable: {env_var}")
        return api_key
