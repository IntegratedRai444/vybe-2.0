import importlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import (
    ANTHROPIC_API_KEY,
    DEFAULT_CODE_MODEL,
    GROQ_API_KEY,
    NVIDIA_KIMI_API_KEY,
    NVIDIA_MISTRAL_API_KEY,
    NVIDIA_MIXTRAL_8X22B_API_KEY,
    OLLAMA_HOST,
    OLLAMA_MODEL,
    OPENAI_API_KEY,
)

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages multiple AI model providers with fallback support."""

    def __init__(self):
        self.providers: Dict[str, Any] = {}
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize all available model providers."""
        # Initialize OpenAI provider if API key is available
        if OPENAI_API_KEY:
            try:
                from .providers.openai_provider import OpenAIProvider

                self.providers["openai"] = OpenAIProvider(
                    {"api_key": OPENAI_API_KEY, "default_model": "gpt-4-turbo"}
                )
                logger.info("OpenAI provider initialized")
            except ImportError as e:
                logger.warning(f"Failed to initialize OpenAI provider: {e}")

        # Initialize Anthropic provider if API key is available
        if ANTHROPIC_API_KEY:
            try:
                from .providers.anthropic_provider import AnthropicProvider

                self.providers["anthropic"] = AnthropicProvider(
                    {
                        "api_key": ANTHROPIC_API_KEY,
                        "default_model": "claude-3-opus-20240229",
                    }
                )
                logger.info("Anthropic provider initialized")
            except ImportError as e:
                logger.warning(f"Failed to initialize Anthropic provider: {e}")

        # Initialize Groq provider if API key is available
        if GROQ_API_KEY:
            try:
                from .providers.groq_provider import GroqProvider

                self.providers["groq"] = GroqProvider(
                    {"api_key": GROQ_API_KEY, "default_model": "llama3-70b-8192"}
                )
                logger.info("Groq provider initialized")
            except ImportError as e:
                logger.warning(f"Failed to initialize Groq provider: {e}")

        # Initialize NVIDIA providers if any API key is available
        nvidia_config = {}
        if NVIDIA_MISTRAL_API_KEY:
            nvidia_config["mistral"] = NVIDIA_MISTRAL_API_KEY
        if NVIDIA_KIMI_API_KEY:
            nvidia_config["kimi"] = NVIDIA_KIMI_API_KEY
        if NVIDIA_MIXTRAL_8X22B_API_KEY:
            nvidia_config["mixtral"] = NVIDIA_MIXTRAL_8X22B_API_KEY

        if nvidia_config:
            try:
                from .providers.nvidia_provider import NvidiaProvider

                self.providers["nvidia"] = NvidiaProvider(nvidia_config)
                logger.info("NVIDIA provider initialized with available models")
            except ImportError as e:
                logger.warning(f"Failed to initialize NVIDIA provider: {e}")

        # Always initialize Ollama provider as a fallback
        try:
            from .providers.ollama import OllamaProvider

            self.providers["ollama"] = OllamaProvider(
                {"base_url": OLLAMA_HOST, "default_model": OLLAMA_MODEL}
            )
            logger.info("Ollama provider initialized")
        except ImportError as e:
            logger.warning(f"Failed to initialize Ollama provider: {e}")

    def get_provider(self, provider_name: str) -> Optional[Any]:
        """Get a specific provider by name."""
        return self.providers.get(provider_name.lower())

    def get_available_providers(self) -> List[str]:
        """Get a list of available provider names."""
        return list(self.providers.keys())

    async def generate(
        self,
        prompt: str,
        provider_name: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs,
    ) -> str:
        """
        Generate text using the specified provider or try all available providers.

        Args:
            prompt: The input prompt
            provider_name: Optional specific provider to use
            model: Optional specific model to use
            **kwargs: Additional arguments to pass to the provider

        Returns:
            Generated text from the first successful provider

        Raises:
            RuntimeError: If no provider is available or all providers fail
        """
        if provider_name:
            # Use the specified provider
            provider = self.get_provider(provider_name)
            if not provider:
                raise RuntimeError(f"Provider '{provider_name}' not available")

            try:
                return await provider.generate(prompt, model=model, **kwargs)
            except Exception as e:
                raise RuntimeError(f"Error from {provider_name}: {str(e)}")
        else:
            # Try all available providers in order
            for name, provider in self.providers.items():
                try:
                    return await provider.generate(prompt, model=model, **kwargs)
                except Exception as e:
                    logger.warning(f"Provider {name} failed: {str(e)}")
                    continue

            raise RuntimeError("No available providers could process the request")


# Create a singleton instance
model_manager = ModelManager()
