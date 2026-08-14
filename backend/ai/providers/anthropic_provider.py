import os
from typing import Any, AsyncGenerator, Dict, List, Optional

import anthropic

from .base import BaseModelProvider


class AnthropicProvider(BaseModelProvider):
    """Provider for Anthropic models."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = anthropic.AsyncAnthropic(api_key=config["api_key"])
        self.default_model = config.get("default_model", "claude-3-opus-20240229")

    def _check_availability(self) -> bool:
        """Check if Anthropic is available and update available_models."""
        try:
            # Anthropic doesn't have a direct way to list models via API
            # So we'll just use the default model and a few known models
            self.available_models = [
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-2.1",
                "claude-2.0",
                "claude-instant-1.2",
            ]
            return True
        except Exception as e:
            print(f"Error checking Anthropic availability: {e}")
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
        """Generate text completion using Anthropic's API."""
        model = model or self.default_model

        try:
            message = await self.client.messages.create(
                model=model,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
            return message.content[0].text
        except Exception as e:
            print(f"Error in Anthropic generate: {e}")
            raise

    async def stream_generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Stream text completion using Anthropic's API."""
        model = model or self.default_model

        try:
            with self.client.messages.stream(
                model=model,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                **kwargs,
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as e:
            print(f"Error in Anthropic stream_generate: {e}")
            raise

    async def embed(
        self, text: str, model: str = "claude-3-opus-20240229"
    ) -> List[float]:
        """
        Generate embeddings using Anthropic's API.
        Note: Anthropic doesn't have a direct embeddings API, so we'll use their chat completion
        as a workaround for demonstration purposes.
        """
        try:
            # This is a workaround since Anthropic doesn't have embeddings API
            # In a real implementation, you might want to use a different provider for embeddings
            # or implement a different approach
            response = await self.client.messages.create(
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
            print(f"Error in Anthropic embed (workaround): {e}")
            raise
