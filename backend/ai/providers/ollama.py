import json
from typing import Any, Dict, Generator, List, Optional

import requests

from ....config.model_config import ModelConfig
from .base import BaseModelProvider


class OllamaProvider(BaseModelProvider):
    """Provider for local Ollama models."""

    def __init__(self, config: Dict[str, Any]):
        self.base_url = config.get("base_url", "http://localhost:11434")
        self.timeout = config.get("timeout", 300)
        super().__init__(config)

    def _check_availability(self) -> bool:
        """Check if Ollama is available and get available models."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                self.available_models = [model["name"] for model in models]
                return True
        except (requests.RequestException, json.JSONDecodeError):
            pass
        self.available_models = []
        return False

    def _request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make a request to the Ollama API."""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=self.timeout,
                stream=payload.get("stream", False),
            )
            response.raise_for_status()

            if payload.get("stream", False):
                return response

            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ollama API request failed: {str(e)}")

    def generate(
        self,
        prompt: str,
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        """Generate text completion using Ollama."""
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                **kwargs,
            },
        }

        if system_prompt:
            payload["system"] = system_prompt

        response = self._request("/api/generate", payload)
        return response.get("response", "")

    def stream_generate(
        self,
        prompt: str,
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs,
    ) -> Generator[str, None, None]:
        """Stream text completion using Ollama."""
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True,
            "options": {"temperature": temperature, **kwargs},
        }

        if system_prompt:
            payload["system"] = system_prompt

        response = self._request("/api/generate", payload)

        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line)
                    if "response" in data:
                        yield data["response"]
                except json.JSONDecodeError:
                    continue

    def embed(self, text: str, model: str) -> List[float]:
        """Generate embeddings using Ollama."""
        payload = {"model": model, "prompt": text}

        response = self._request("/api/embeddings", payload)
        return response.get("embedding", [])
