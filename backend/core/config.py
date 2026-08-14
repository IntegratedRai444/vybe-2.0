import os
import secrets
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv
from pydantic import Field, HttpUrl, PostgresDsn, validator
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    # Security Settings
    SECRET_KEY: str = Field(
        default_factory=secrets.token_urlsafe,
        description="Secret key for signing JWT tokens",
        env="SECRET_KEY",
    )
    ALGORITHM: str = Field(
        default="HS256", description="Algorithm used for JWT token signing"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="Access token expiration time in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7, description="Refresh token expiration time in days"
    )
    SECURE_COOKIES: bool = Field(
        default=True,
        description="Set secure flag on cookies (should be True in production)",
    )
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        description="Allowed CORS origins",
    )
    RATE_LIMIT: str = Field(
        default="1000/day, 100/hour, 10/minute",
        description="Rate limiting configuration",
    )

    # API Keys
    OPENAI_API_KEY: str = Field(..., env="OPENAI_API_KEY")
    ANTHROPIC_API_KEY: str = Field(..., env="ANTHROPIC_API_KEY")
    GROQ_API_KEY: str = Field(..., env="GROQ_API_KEY")
    NVIDIA_MISTRAL_API_KEY: str = Field(..., env="NVIDIA_MISTRAL_API_KEY")
    NVIDIA_KIMI_API_KEY: str = Field(..., env="NVIDIA_KIMI_API_KEY")
    NVIDIA_MIXTRAL_8X22B_API_KEY: str = Field(..., env="NVIDIA_MIXTRAL_8X22B_API_KEY")
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
