"""
Backend configuration settings for Vybe AI OS
"""

# Default AI model configurations
DEFAULT_CODE_MODEL = "gpt-4"  # Default model for code generation
DEFAULT_CHAT_MODEL = "gpt-4"  # Default model for chat interactions

# Model configurations for different languages
LANGUAGE_MODEL_MAP = {
    "python": "gpt-4",
    "javascript": "gpt-4",
    "typescript": "gpt-4",
    "java": "gpt-4",
    "cpp": "gpt-4",
    "go": "gpt-4",
    "rust": "gpt-4",
    "ruby": "gpt-4",
    "php": "gpt-4",
    "csharp": "gpt-4",
    "swift": "gpt-4",
    "kotlin": "gpt-4",
}

# Embedding model for semantic search
EMBEDDING_MODEL = "text-embedding-ada-002"

# Default model parameters
DEFAULT_MODEL_PARAMS = {
    "temperature": 0.2,
    "max_tokens": 2048,
    "top_p": 0.95,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0,
    "stop": None,
}

# Application settings
APP_NAME = "Vybe AI OS"
VERSION = "2.0.0"
DEBUG = True

# API settings
API_PREFIX = "/api"
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
