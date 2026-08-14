"""
NVIDIA model configurations and API keys

Add your NVIDIA API keys here. For security, consider using environment variables
or a secrets manager in production.
"""

# Model configurations with their respective API keys and parameters
NVIDIA_MODEL_CONFIGS = {
    # Mistral Nemo 12B
    "nv-mistralai/mistral-nemo-12b-instruct": {
        "api_key_env": "NVIDIA_MISTRAL_API_KEY",  # Environment variable name
        "base_url": "https://integrate.api.nvidia.com/v1",
        "default_params": {
            "temperature": 0.2,
            "top_p": 0.7,
            "max_tokens": 1024,
            "stream": True,
        },
    },
    # Kimi K2 Instruct
    "moonshotai/kimi-k2-instruct-0905": {
        "api_key_env": "NVIDIA_KIMI_API_KEY",  # Environment variable name
        "base_url": "https://integrate.api.nvidia.com/v1",
        "default_params": {
            "temperature": 0.6,
            "top_p": 0.9,
            "max_tokens": 4096,
            "stream": True,
        },
    },
    # Add more models as needed
    "nv-ai-foundation/mistral-7b-instruct": {
        "api_key_env": "NVIDIA_MISTRAL7B_API_KEY",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "default_params": {
            "temperature": 0.7,
            "top_p": 0.8,
            "max_tokens": 2048,
            "stream": True,
        },
    },
}

# Default model to use when none is specified
DEFAULT_NVIDIA_MODEL = "nv-mistralai/mistral-nemo-12b-instruct"
