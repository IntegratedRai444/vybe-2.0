import os
from typing import Any, AsyncGenerator, Dict, List, Optional

import groq

from .base import BaseModelProvider


class GroqProvider(BaseModelProvider):
    """Provider for Groq models."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = groq.AsyncClient(api_key=config["api_key"])
        self.default_model = config.get("default_model", "llama3-70b-8192")

    def _check_availability(self) -> bool:
        """Check if Groq is available and update available_models."""
        try:
            # Groq doesn't have a direct way to list models via API
            # So we'll use the default model and a few known models
            self.available_models = [
                "llama3-70b-8192",
                "llama3-8b-8192",
                "mixtral-8x7b-32768",
                "gemma-7b-it",
            ]
            return True
        except Exception as e:
            print(f"Error checking Groq availability: {e}")
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
        """Generate text completion using Groq's API."""
        model = model or self.default_model
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error in Groq generate: {e}")
            raise

    async def stream_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Stream text completion using Groq's API."""
        model = model or self.default_model
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                stream=True,
                **kwargs,
            )

            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            print(f"Error in Groq stream_generate: {e}")
            raise

    async def embed(self, text: str, model: str = "llama3-70b-8192") -> List[float]:
        """
        Generate embeddings using Groq's API.
        Note: Groq doesn't have a direct embeddings API, so we'll use their chat completion
        as a workaround for demonstration purposes.
        """
        try:
            # This is a workaround since Groq doesn't have embeddings API
            # In a real implementation, you might want to use a different provider for embeddings
            # or implement a different approach
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": f"Return a numerical embedding for the following text: {text}",
                    }
                ],
                max_tokens=1024,
                temperature=0.0,
            )

            # This is a placeholder - in a real implementation, you'd need to process the response
            # to extract or generate embeddings
            return [0.0] * 1024  # Dummy embedding

        except Exception as e:
            print(f"Error in Groq embed (workaround): {e}")
            raise
