import json
import os
from functools import wraps
from typing import Any, Dict, Optional

import requests
from flask import Blueprint, jsonify, request

ai_bp = Blueprint("ai", __name__)

# In-memory storage for API keys (in production, use a secure storage solution)
ai_config = {
    "ollama": {
        "base_url": "http://localhost:11434",
        "api_key": None,
        "models": ["llama3:latest", "codellama:7b-instruct", "deepseek-coder:6.7b"],
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "api_key": None,
        "models": ["gpt-4", "gpt-3.5-turbo"],
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com/v1",
        "api_key": None,
        "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key": None,
        "models": ["llama3-70b-8192", "mixtral-8x7b-32768"],
    },
}


def get_provider_config(provider: str) -> Dict[str, Any]:
    """Get configuration for a specific AI provider."""
    return ai_config.get(provider, {})


def requires_auth(f):
    """Decorator to check if the request is authenticated."""

    @wraps(f)
    def decorated(*args, **kwargs):
        # In a real app, implement proper authentication here
        return f(*args, **kwargs)

    return decorated


@ai_bp.route("/api/ai/providers", methods=["GET"])
@requires_auth
def list_providers():
    """List all available AI providers and their status."""
    providers = []
    for provider, config in ai_config.items():
        providers.append(
            {
                "id": provider,
                "name": provider.capitalize(),
                "is_configured": config["api_key"] is not None,
                "models": config["models"],
            }
        )
    return jsonify(providers)


@ai_bp.route("/api/ai/configure", methods=["POST"])
@requires_auth
def configure_provider():
    """Configure an AI provider with API key and settings."""
    data = request.get_json()
    provider = data.get("provider")
    api_key = data.get("api_key")
    base_url = data.get("base_url")

    if not provider or provider not in ai_config:
        return jsonify({"error": "Invalid provider"}), 400

    if api_key:
        ai_config[provider]["api_key"] = api_key
    if base_url:
        ai_config[provider]["base_url"] = base_url

    return jsonify({"status": "success", "provider": provider, "configured": True})


@ai_bp.route("/api/ai/chat", methods=["POST"])
@requires_auth
def chat():
    """Handle chat completion requests and route to the appropriate provider."""
    data = request.get_json()
    provider = data.get("provider", "ollama")
    model = data.get("model")
    messages = data.get("messages", [])
    temperature = data.get("temperature", 0.7)

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    provider_config = get_provider_config(provider)
    if not provider_config:
        return jsonify({"error": "Invalid provider"}), 400

    if not provider_config.get("api_key") and provider != "ollama":
        return (
            jsonify({"error": f"{provider.capitalize()} API key not configured"}),
            400,
        )

    # Route to the appropriate provider handler
    try:
        if provider == "ollama":
            response = handle_ollama_request(
                provider_config, model, messages, temperature
            )
        elif provider == "openai":
            response = handle_openai_request(
                provider_config, model, messages, temperature
            )
        elif provider == "anthropic":
            response = handle_anthropic_request(
                provider_config, model, messages, temperature
            )
        elif provider == "groq":
            response = handle_groq_request(
                provider_config, model, messages, temperature
            )
        else:
            return jsonify({"error": "Provider not implemented"}), 501

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def handle_ollama_request(
    config: Dict[str, Any], model: str, messages: list, temperature: float
) -> Dict[str, Any]:
    """Handle requests to the Ollama API."""
    url = f"{config['base_url']}/api/chat"
    headers = {"Content-Type": "application/json"}

    payload = {
        "model": model or config["models"][0],
        "messages": messages,
        "options": {"temperature": temperature},
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


def handle_openai_request(
    config: Dict[str, Any], model: str, messages: list, temperature: float
) -> Dict[str, Any]:
    """Handle requests to the OpenAI API."""
    url = f"{config['base_url']}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}",
    }

    payload = {
        "model": model or config["models"][0],
        "messages": messages,
        "temperature": temperature,
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


def handle_anthropic_request(
    config: Dict[str, Any], model: str, messages: list, temperature: float
) -> Dict[str, Any]:
    """Handle requests to the Anthropic API."""
    url = f"{config['base_url']}/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": config["api_key"],
        "anthropic-version": "2023-06-01",
    }

    # Convert to Anthropic's message format if needed
    system_messages = [m["content"] for m in messages if m["role"] == "system"]
    user_messages = [m["content"] for m in messages if m["role"] == "user"]

    payload = {
        "model": model or config["models"][0],
        "max_tokens": 4000,
        "temperature": temperature,
        "system": "\n".join(system_messages) if system_messages else None,
        "messages": [{"role": "user", "content": "\n".join(user_messages)}],
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


def handle_groq_request(
    config: Dict[str, Any], model: str, messages: list, temperature: float
) -> Dict[str, Any]:
    """Handle requests to the Groq API."""
    url = f"{config['base_url']}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}",
    }

    payload = {
        "model": model or config["models"][0],
        "messages": messages,
        "temperature": temperature,
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


# Add error handlers
@ai_bp.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


@ai_bp.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500
