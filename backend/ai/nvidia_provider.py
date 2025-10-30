"""
NVIDIA API provider with support for NVIDIA NIM models
"""

import os
from typing import List, Optional, Dict, Any
import logging
from openai import OpenAI
import aiohttp
import json
from ..ai_providers import AIProvider, AIResponse

logger = logging.getLogger(__name__)

class NvidiaProvider(AIProvider):
    """NVIDIA API provider with support for NVIDIA NIM models"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        super().__init__("nvidia")
        self.api_key = api_key or os.getenv("NVIDIA_API_KEY")
        self.base_url = base_url or os.getenv("NVIDIA_API_BASE", "https://integrate.api.nvidia.com/v1")
        self.default_model = "nv-mistralai/mistral-nemo-12b-instruct"
        self.available_models = [
            "nv-mistralai/mistral-nemo-12b-instruct",
            "nv-ai-foundation/mistral-7b-instruct",
            "nv-ai-foundation/llama3-70b-instruct"
        ]
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" if self.api_key else ""
        }
    
    async def is_available(self) -> bool:
        """Check if the NVIDIA API is available"""
        if not self.api_key:
            return False
            
        try:
            async with self.session.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=5
            ) as response:
                return response.status == 200
        except Exception as e:
            logger.warning(f"NVIDIA API not available: {str(e)}")
            return False
    
    async def get_models(self) -> List[str]:
        """Get available models from NVIDIA API"""
        try:
            async with self.session.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, dict) and 'data' in data:
                        return [model['id'] for model in data['data']]
        except Exception as e:
            logger.error(f"Failed to fetch NVIDIA models: {str(e)}")
        
        return self.available_models
    
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
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.2),
                "top_p": kwargs.get("top_p", 0.7),
                "max_tokens": kwargs.get("max_tokens", 1024),
                "stream": False
            }
            
            url = f"{self.base_url}/chat/completions"
            
            async with self.session.post(
                url,
                headers=self.headers,
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
    ):
        """Stream generated text from NVIDIA's API"""
        model = model or self.default_model
        
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.2),
                "top_p": kwargs.get("top_p", 0.7),
                "max_tokens": kwargs.get("max_tokens", 1024),
                "stream": True
            }
            
            url = f"{self.base_url}/chat/completions"
            
            async with self.session.post(
                url,
                headers={**self.headers, "Accept": "text/event-stream"},
                json=payload,
                timeout=60
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"NVIDIA API error: {response.status} - {error_text}")
                
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
