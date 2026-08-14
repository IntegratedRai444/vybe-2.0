import json
import os
from typing import Any, AsyncGenerator, Dict, List, Optional

import aiohttp

from .base import BaseModelProvider


class NvidiaProvider(BaseModelProvider):
    """Provider for NVIDIA AI Foundation Models."""

    BASE_URL = "https://integrate.api.nvidia.com/v1"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_keys = config
        self.available_models = []
        self._check_availability()

    def _check_availability(self) -> bool:
        """Check if NVIDIA AI is available and update available_models."""
        try:
            # Add all available models based on provided API keys
            if "mistral" in self.api_keys:
                self.available_models.append("mistralai/Mixtral-8x7B-Instruct-v0.1")
            if "kimi" in self.api_keys:
                self.available_models.append("kimi")
            if "mixtral" in self.api_keys:
                self.available_models.append("meta/llama3-70b-instruct")

            return len(self.available_models) > 0
        except Exception as e:
            print(f"Error checking NVIDIA AI availability: {e}")
            return False

    def _get_api_key_for_model(self, model: str) -> Optional[str]:
        """Get the appropriate API key for the given model."""
        if "mistral" in model.lower() and "mistral" in self.api_keys:
            return self.api_keys["mistral"]
        elif "kimi" in model.lower() and "kimi" in self.api_keys:
            return self.api_keys["kimi"]
        elif "llama" in model.lower() and "mixtral" in self.api_keys:
            return self.api_keys["mixtral"]
        return None

    async def _make_request(
        self, model: str, endpoint: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make a request to the NVIDIA AI API."""
        api_key = self._get_api_key_for_model(model)
        if not api_key:
            raise ValueError(f"No API key available for model: {model}")

        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(
                        f"NVIDIA API error: {response.status} - {error_text}"
                    )
                return await response.json()

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        """Generate text completion using NVIDIA's API."""
        model = model or self.available_models[0] if self.available_models else None
        if not model:
            raise ValueError("No model available")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }

        try:
            response = await self._make_request(model, "/chat/completions", payload)
            return response["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Error in NVIDIA generate: {e}")
            raise

    async def stream_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Stream text completion using NVIDIA's API."""
        model = model or self.available_models[0] if self.available_models else None
        if not model:
            raise ValueError("No model available")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
            **kwargs,
        }

        api_key = self._get_api_key_for_model(model)
        if not api_key:
            raise ValueError(f"No API key available for model: {model}")

        url = f"{self.BASE_URL}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(
                        f"NVIDIA API error: {response.status} - {error_text}"
                    )

                async for line in response.content:
                    if line.startswith(b"data: "):
                        chunk = line[6:].strip()
                        if chunk == b"[DONE]":
                            break
                        try:
                            data = json.loads(chunk)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue

    async def embed(
        self, text: str, model: str = "nomic-ai/nomic-embed-text-v1.5"
    ) -> List[float]:
        """Generate embeddings using NVIDIA's API."""
        try:
            payload = {"model": model, "input": text, "encoding_format": "float"}

            response = await self._make_request(model, "/embeddings", payload)
            return response["data"][0]["embedding"]
        except Exception as e:
            print(f"Error in NVIDIA embed: {e}")
            raise
