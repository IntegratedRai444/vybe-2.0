"""
NVIDIA API provider with support for NVIDIA NIM models with multiple API key support
"""

import os
import time
import json
import logging
from typing import List, Optional, Dict, Any, AsyncGenerator, Union
import aiohttp

from ..ai_providers import AIProvider, AIResponse
from config.nvidia_config import NVIDIA_MODEL_CONFIGS, DEFAULT_NVIDIA_MODEL

logger = logging.getLogger(__name__)

class NvidiaProvider(AIProvider):
    """NVIDIA API provider with support for NVIDIA NIM models"""
    
    def __init__(self, api_keys: Optional[Dict[str, str]] = None):
        super().__init__("nvidia")
        self.model_configs = NVIDIA_MODEL_CONFIGS
        self.default_model = DEFAULT_NVIDIA_MODEL
        
        # Load API keys from environment variables if not provided
        self.api_keys = {}
        for model_id, config in self.model_configs.items():
            env_var = config["api_key_env"]
            self.api_keys[model_id] = os.getenv(env_var)
            
        # Override with provided API keys
        if api_keys:
            for model_id, key in api_keys.items():
                if model_id in self.model_configs:
                    self.api_keys[model_id] = key
                    
        # Set available models (only those with API keys)
        self.available_models = [
            model_id for model_id in self.model_configs 
            if self.api_keys.get(model_id)
        ]
        
        self.headers = {
            "Content-Type": "application/json"
        }
    
    async def is_available(self) -> bool:
        """Check if any NVIDIA model is available"""
        return len(self.available_models) > 0
        
    def _get_model_config(self, model_id: str) -> Dict[str, Any]:
        """Get configuration for a specific model"""
        if model_id not in self.model_configs:
            raise ValueError(f"Model {model_id} is not configured")
            
        if not self.api_keys.get(model_id):
            raise ValueError(f"No API key found for model {model_id}")
            
        return {
            **self.model_configs[model_id],
            "api_key": self.api_keys[model_id]
        }
    
    async def get_models(self) -> List[Dict[str, Any]]:
        """Get available models with their configurations"""
        return [
            {
                "model_id": model_id,
                "config": {
                    "base_url": config["base_url"],
                    "default_params": config["default_params"]
                }
            }
            for model_id, config in self.model_configs.items()
            if model_id in self.available_models
        ]
    
    async def generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        model: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate text using NVIDIA's API"""
        start_time = time.time()
        model = model or self.default_model
        
        try:
            # Get model configuration
            config = self._get_model_config(model)
            
            # Prepare messages
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Get default parameters and override with any provided kwargs
            params = {**config["default_params"], **kwargs}
            
            # Prepare the request payload
            payload = {
                "model": model,
                "messages": messages,
                **{k: v for k, v in params.items() if k != 'stream'},  # Remove stream from params
                "stream": False
            }
            
            # Make the API request
            async with self.session.post(
                f"{config['base_url']}/chat/completions",
                headers={
                    "Authorization": f"Bearer {config['api_key']}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=60
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"NVIDIA API error: {response.status} - {error_text}")
                
                response_data = await response.json()
                content = response_data['choices'][0]['message']['content']
                latency = time.time() - start_time
                
                return AIResponse(
                    content=content,
                    model=model,
                    provider=self.provider_name,
                    latency=latency,
                    usage=response_data.get('usage')
                )
                
        except Exception as e:
            logger.error(f"NVIDIA generation error: {str(e)}")
            return AIResponse(
                content="",
                model=model,
                provider=self.provider_name,
                error=str(e)
            )
    
    async def stream_generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream generated text from NVIDIA's API"""
        model = model or self.default_model
        
        try:
            # Get model configuration
            config = self._get_model_config(model)
            
            # Prepare messages
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Get default parameters and override with any provided kwargs
            params = {**config["default_params"], **kwargs}
            
            # Prepare the request payload
            payload = {
                "model": model,
                "messages": messages,
                **{k: v for k, v in params.items() if k != 'stream'},  # Remove stream from params
                "stream": True
            }
            
            # Make the API request
            async with self.session.post(
                f"{config['base_url']}/chat/completions",
                headers={
                    "Authorization": f"Bearer {config['api_key']}",
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream"
                },
                json=payload,
                timeout=60
            ) as response:
                buffer = ""
                async for line in response.content:
                    if line.startswith(b'data: '):
                        chunk = line[6:].strip()
                        if chunk == b'[DONE]':
                            break
                            
                        try:
                            data = json.loads(chunk)
                            if 'choices' in data and len(data['choices']) > 0:
                                delta = data['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    yield delta['content']
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse chunk: {chunk}")
                            continue
        except Exception as e:
            logger.error(f"NVIDIA streaming error: {str(e)}")
            raise
