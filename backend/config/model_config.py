from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field


class ModelProvider(str, Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    LM_STUDIO = "lm_studio"
    TABBY = "tabby"
    TRANSFORMERS = "transformers"


class ModelConfig(BaseModel):
    name: str
    provider: ModelProvider
    base_url: Optional[str] = None
    api_key_env: Optional[str] = None
    context_length: int = 4096
    is_available: bool = True
    priority: int = 1  # Lower number = higher priority


# Default model configurations
DEFAULT_MODELS = {
    # Local models (Ollama)
    "codellama:7b-instruct": ModelConfig(
        name="codellama:7b-instruct",
        provider=ModelProvider.OLLAMA,
        context_length=16384,
    ),
    "llama3:latest": ModelConfig(
        name="llama3:latest",
        provider=ModelProvider.OLLAMA,
        context_length=8192,
    ),
    "nomic-embed-text": ModelConfig(
        name="nomic-embed-text",
        provider=ModelProvider.OLLAMA,
    ),
    # Cloud models (OpenAI)
    "gpt-4-turbo": ModelConfig(
        name="gpt-4-turbo",
        provider=ModelProvider.OPENAI,
        api_key_env="OPENAI_API_KEY",
        base_url="https://api.openai.com/v1",
        context_length=128000,
    ),
    # Cloud models (Anthropic)
    "claude-3-opus-20240229": ModelConfig(
        name="claude-3-opus-20240229",
        provider=ModelProvider.ANTHROPIC,
        api_key_env="ANTHROPIC_API_KEY",
        base_url="https://api.anthropic.com",
        context_length=200000,
    ),
    # Cloud models (Groq)
    "llama3-70b-8192": ModelConfig(
        name="llama3-70b-8192",
        provider=ModelProvider.GROQ,
        api_key_env="GROQ_API_KEY",
        base_url="https://api.groq.com/openai/v1",
        context_length=8192,
    ),
}


# Model selection strategy
class ModelSelection(str, Enum):
    AUTO = "auto"  # Automatically select best available model
    LOCAL_ONLY = "local_only"  # Only use local models
    CLOUD_ONLY = "cloud_only"  # Only use cloud models
    SPECIFIC = "specific"  # Use specific model


# Default configuration
DEFAULT_CONFIG = {
    "model_selection": ModelSelection.AUTO,
    "preferred_models": [
        "gpt-4-turbo",
        "claude-3-opus-20240229",
        "llama3-70b-8192",
        "codellama:7b-instruct",
        "llama3:latest",
    ],
    "fallback_models": ["llama3:latest"],
    "embedding_model": "nomic-embed-text",
    "default_temperature": 0.2,
    "max_tokens": 4096,
}

# Language to model mapping
LANGUAGE_MODEL_MAP = {
    "py": "codellama:7b-instruct",
    "js": "llama3:latest",
    "ts": "llama3:latest",
    "cpp": "llama3:latest",
    "c": "llama3:latest",
    "java": "llama3:latest",
    "go": "llama3:latest",
    "*": "llama3:latest",
}


def get_model_config(model_name: str) -> ModelConfig:
    """Get model configuration with fallback to default if not found."""
    return DEFAULT_MODELS.get(
        model_name, ModelConfig(name=model_name, provider=ModelProvider.OLLAMA)
    )
