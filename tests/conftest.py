"""
Pytest configuration and fixtures for testing the Vybe AI backend.
"""
import pytest
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Fixture to provide a test API key for AI providers
@pytest.fixture
def test_api_keys():
    """Return a dictionary of test API keys from environment variables."""
    return {
        "openai": os.getenv("OPENAI_API_KEY"),
        "anthropic": os.getenv("ANTHROPIC_API_KEY"),
        "groq": os.getenv("GROQ_API_KEY"),
        "nvidia_mistral": os.getenv("NVIDIA_MISTRAL_API_KEY"),
        "nvidia_kimi": os.getenv("NVIDIA_KIMI_API_KEY"),
    }
