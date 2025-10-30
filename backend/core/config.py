from pydantic import BaseSettings, Field, HttpUrl, PostgresDsn, validator
from typing import List, Optional, Dict, Any, Union
from functools import lru_cache
import secrets
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API Keys
    OPENAI_API_KEY: str = Field(..., env="OPENAI_API_KEY")
    ANTHROPIC_API_KEY: str = Field(..., env="ANTHROPIC_API_KEY")
    GROQ_API_KEY: str = Field(..., env="GROQ_API_KEY")
    NVIDIA_MISTRAL_API_KEY: str = Field(..., env="NVIDIA_MISTRAL_API_KEY")
    NVIDIA_KIMI_API_KEY: str = Field(..., env="NVIDIA_KIMI_API_KEY")
    NVIDIA_MIXTRAL_8X22B_API_KEY: str = Field(..., env="NVIDIA_MIXTRAL_8X22B_API_KEY")
    
    # Application Settings
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: PostgresDsn = Field(..., env="DATABASE_URL")
    
    # Security
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    CORS_ALLOWED_ORIGINS: List[HttpUrl] = []
    CSRF_TRUSTED_ORIGINS: List[HttpUrl] = []
    
    # Rate Limiting
    RATE_LIMIT: str = "100/hour"
    
    # JWT
    JWT_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @validator("CORS_ALLOWED_ORIGINS", "CSRF_TRUSTED_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
