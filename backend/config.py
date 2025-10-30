import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, List, Optional, Union

# Load environment variables from .env file
load_dotenv()

# ======================
# Application Settings
# ======================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
SECRET_KEY = os.getenv("SECRET_KEY")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ======================
# AI Model Configuration
# ======================
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_CODE_MODEL = os.getenv("DEFAULT_CODE_MODEL", "codellama:7b-instruct")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-minilm")
FINE_TUNED_MODEL = os.getenv("FINE_TUNED_MODEL", "vybe-coder")

# Model selection based on file extension
LANGUAGE_MODEL_MAP = {
    "py": os.getenv("PYTHON_MODEL", FINE_TUNED_MODEL),
    "js": os.getenv("JAVASCRIPT_MODEL", "llama3:latest"),
    "ts": os.getenv("TYPESCRIPT_MODEL", "llama3:latest"),
    "cpp": os.getenv("CPP_MODEL", "llama3:latest"),
    "c": os.getenv("C_MODEL", "llama3:latest"),
    "java": os.getenv("JAVA_MODEL", "llama3:latest"),
    "go": os.getenv("GO_MODEL", "llama3:latest"),
    "*": DEFAULT_CODE_MODEL,
}

# ======================
# AI Provider API Keys
# ======================
# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# Anthropic
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# NVIDIA AI Endpoints
NVIDIA_MISTRAL_API_KEY = os.getenv("NVIDIA_MISTRAL_API_KEY")
NVIDIA_KIMI_API_KEY = os.getenv("NVIDIA_KIMI_API_KEY")
NVIDIA_MIXTRAL_8X22B_API_KEY = os.getenv("NVIDIA_MIXTRAL_8X22B_API_KEY")

# Ollama (Local)
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")

# ======================
# Database Configuration
# ======================
DATABASE_URL = os.getenv("DATABASE_URL")

# ======================
# JWT Authentication
# ======================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# ======================
# Security Settings
# ======================
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,::1").split(",")
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
RATE_LIMIT = os.getenv("RATE_LIMIT", "100/hour")

# ======================
# Email Configuration
# ======================
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")

# ======================
# File Processing
# ======================
CHUNK_SIZE_LINES = int(os.getenv("CHUNK_SIZE_LINES", "300"))
CHUNK_OVERLAP_LINES = int(os.getenv("CHUNK_OVERLAP_LINES", "30"))
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "384"))

# ======================
# Session Settings
# ======================
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")
SESSION_LIFETIME = int(os.getenv("SESSION_LIFETIME", "86400"))  # 24 hours

# ======================
# Feature Flags
# ======================
ENABLE_ANALYTICS = os.getenv("ENABLE_ANALYTICS", "false").lower() == "true"
ENABLE_TELEMETRY = os.getenv("ENABLE_TELEMETRY", "false").lower() == "true"
INDEX_DIR = Path("./faiss_index")
INDEX_DIR.mkdir(parents=True, exist_ok=True)

GRADIO_PORT = 7860
FASTAPI_PORT = 8000
OLLAMA_HOST = "http://127.0.0.1:11434"