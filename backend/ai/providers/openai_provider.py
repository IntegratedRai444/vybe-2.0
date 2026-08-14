import os
from typing import Any, AsyncGenerator, Dict, List, Optional

import openai

from .base import BaseModelProvider


class OpenAIProvider(BaseModelProvider):
    """Provider for OpenAI models."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = openai.OpenAI(api_key=config["api_key"])
        self.default_model = config.get("default_model", "gpt-4-turbo")

    def _check_availability(self) -> bool:
        """Check if OpenAI is available and update available_models."""
        try:
            models = self.client.models.list()
            self.available_models = [model.id for model in models.data]
            return True
        except Exception as e:
            print(f"Error checking OpenAI availability: {e}")
            self.available_models = [self.default_model]
            return False

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        """Generate text completion using OpenAI's API."""
        model = model or self.default_model
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error in OpenAI generate: {e}")
            raise

    async def stream_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Stream text completion using OpenAI's API."""
        model = model or self.default_model
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                stream=True,
                **kwargs,
            )

            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            print(f"Error in OpenAI stream_generate: {e}")
            raise

    async def embed(
        self, text: str, model: str = "text-embedding-3-small"
    ) -> List[float]:
        """Generate embeddings using OpenAI's API."""
        try:
            response = self.client.embeddings.create(input=text, model=model)
            return response.data[0].embedding
        except Exception as e:
            print(f"Error in OpenAI embed: {e}")
            raise
