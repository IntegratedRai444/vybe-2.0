# backend/ai_providers.py
"""
Multi-provider AI client with support for Ollama, OpenAI, Anthropic, and Groq
with async support and enhanced error handling.
"""

import os
import json
import logging
import asyncio
import aiohttp
from typing import Dict, Any, Optional, List, Union, Tuple, AsyncGenerator, AsyncIterator
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
import time
import atexit
import aiohttp
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DEFAULT_TIMEOUT = 30
MAX_RETRIES = 3
RATE_LIMIT_DELAY = 1.0  # seconds

@dataclass
class AIResponse:
    """Standardized response from AI providers"""
    content: str
    model: str
    provider: str
    usage: Optional[Dict[str, int]] = None
    latency: Optional[float] = None
    error: Optional[str] = None

class AIProvider(ABC):
    """Abstract base class for AI providers with rate limiting and retries"""
    
    def __init__(self, provider_name: str):
        self.provider_name = provider_name
        self.last_request_time = 0
        self.rate_limit = RATE_LIMIT_DELAY
        self.session = None
        self.initialize_session()
    
    def initialize_session(self):
        """Initialize aiohttp session if not exists"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=DEFAULT_TIMEOUT)
            )
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def ensure_rate_limit(self):
        """Ensure we respect rate limits"""
        now = time.time()
        time_since_last = now - self.last_request_time
        if time_since_last < self.rate_limit:
            await asyncio.sleep(self.rate_limit - time_since_last)
        self.last_request_time = time.time()
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is available"""
        pass
    
    @abstractmethod
    async def generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        model: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate text using the provider"""
        pass
    
    @abstractmethod
    async def get_models(self) -> List[str]:
        """Get available models"""
        pass
    
    async def _make_request(
        self, 
        method: str, 
        url: str, 
        headers: Dict[str, str], 
        payload: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], int]:
        """Helper method to make HTTP requests with retries"""
        await self.ensure_rate_limit()
        last_error = None
        
        for attempt in range(MAX_RETRIES):
            try:
                async with self.session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=payload,
                    timeout=DEFAULT_TIMEOUT
                ) as response:
                    response_data = await response.json()
                    if response.status == 200:
                        return response_data, response.status
                    elif response.status == 429:  # Rate limited
                        retry_after = float(response.headers.get('Retry-After', 5))
                        logger.warning(f"Rate limited. Retrying after {retry_after} seconds...")
                        await asyncio.sleep(retry_after)
                        continue
                    else:
                        error_msg = response_data.get('error', {}).get('message', 'Unknown error')
                        raise Exception(f"API error: {error_msg}")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt + 1} failed: {last_error}")
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
        
        raise Exception(f"Failed after {MAX_RETRIES} attempts. Last error: {last_error}")

class OllamaProvider(AIProvider):
    """Ollama local AI provider"""
    
    def __init__(self, host: str = None):
        super().__init__("ollama")
        self.host = host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        self.available_models = [
            "llama3", "mistral", "codellama", "llama2", 
            "mixtral", "neural-chat", "wizardcoder"
        ]
        self.default_model = "llama3"
    
    async def is_available(self) -> bool:
        try:
            async with self.session.get(
                f"{self.host}/api/tags", 
                timeout=3
            ) as response:
                return response.status == 200
        except Exception as e:
            logger.warning(f"Ollama not available: {str(e)}")
            return False
    
    async def get_models(self) -> List[str]:
        try:
            async with self.session.get(f"{self.host}/api/tags") as response:
                if response.status == 200:
                    data = await response.json()
                    return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            logger.error(f"Failed to fetch Ollama models: {str(e)}")
        return self.available_models
    
    async def generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        model: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate text using Ollama"""
        start_time = time.time()
        model = model or self.default_model
        
        try:
            url = f"{self.host}/api/generate"
            payload = {
                "model": model,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
                "options": {
                    "temperature": kwargs.get("temperature", 0.7),
                    "top_p": kwargs.get("top_p", 0.9),
                    "max_tokens": kwargs.get("max_tokens", 1000)
                }
            }
            
            response_data, status = await self._make_request(
                "POST", url, self.session.headers, payload
            )
            response = response_data.get("response", "")
            latency = time.time() - start_time
            
            return AIResponse(
                content=response,
                model=model,
                provider=self.provider_name,
                latency=latency
            )
        except Exception as e:
            logger.error(f"Ollama generation error: {str(e)}")
            return AIResponse(
                content="",
                model=model,
                provider=self.provider_name,
                error=str(e)
            )

class OpenAIProvider(AIProvider):
    """OpenAI API provider with support for latest models and streaming"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__("openai")
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1").rstrip('/')
        self.default_model = "gpt-4-turbo-preview"
        self.available_models = [
            "gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo",
            "gpt-4-32k", "gpt-4-vision-preview"
        ]
        self._rate_limit_remaining = 60  # Default RPM for free tier
        self._rate_limit_reset = 0
        
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with API key and content type"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "OpenAI-Beta": "assistants=v2"  # For future use with assistants
        }
    
    async def is_available(self) -> bool:
        """Check if the provider is available and has valid credentials"""
        if not self.api_key:
            return False
            
        try:
            # Quick ping to validate the API key
            async with self.session.get(
                f"{self.base_url}/models",
                headers=self._get_headers(),
                timeout=5
            ) as response:
                if response.status == 200:
                    return True
                elif response.status == 401:  # Invalid API key
                    logger.error("Invalid OpenAI API key")
                    return False
                # Handle rate limiting
                elif response.status == 429:
                    remaining = int(response.headers.get('x-ratelimit-remaining-requests', 0))
                    reset_time = int(response.headers.get('x-ratelimit-reset-requests', 60))
                    self._rate_limit_remaining = remaining
                    self._rate_limit_reset = time.time() + reset_time
                    logger.warning(f"OpenAI rate limited. Resets in {reset_time}s")
                return False
        except Exception as e:
            logger.error(f"OpenAI availability check failed: {str(e)}")
            return False
    
    async def get_models(self) -> List[str]:
        """Get list of available models from OpenAI API"""
        try:
            async with self.session.get(
                f"{self.base_url}/models",
                headers=self._get_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return [model['id'] for model in data.get('data', []) 
                           if model['id'].startswith(('gpt-4', 'gpt-3.5'))]
        except Exception as e:
            logger.error(f"Failed to fetch OpenAI models: {str(e)}")
        
        return self.available_models
    
    async def generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        model: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate text using OpenAI's chat completion API"""
        start_time = time.time()
        model = model or self.default_model
        
        try:
            # Check rate limits before making request
            await self._check_rate_limits()
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.7),
                "max_tokens": kwargs.get("max_tokens", 2000),
                "top_p": kwargs.get("top_p", 1.0),
                "frequency_penalty": kwargs.get("frequency_penalty", 0.0),
                "presence_penalty": kwargs.get("presence_penalty", 0.0),
                "stream": False
            }
            
            if "functions" in kwargs:
                payload["functions"] = kwargs["functions"]
                payload["function_call"] = kwargs.get("function_call", "auto")
            
            response_data, status = await self._make_request(
                "POST",
                f"{self.base_url}/chat/completions",
                self._get_headers(),
                payload
            )
            
            # Update rate limit info from headers if available
            self._update_rate_limits(response_data.get('headers', {}))
            
            if "error" in response_data:
                raise Exception(response_data["error"]["message"])
                
            content = response_data["choices"][0]["message"]["content"]
            usage = response_data.get("usage", {})
            
            return AIResponse(
                content=content,
                model=model,
                provider=self.provider_name,
                usage={
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0)
                },
                latency=time.time() - start_time
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"OpenAI generation error: {error_msg}")
            return AIResponse(
                content="",
                model=model,
                provider=self.provider_name,
                error=error_msg,
                latency=time.time() - start_time
            )
    
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream generated text from OpenAI's API"""
        model = model or self.default_model
        
        try:
            # Check rate limits before making request
            await self._check_rate_limits()
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.7),
                "max_tokens": kwargs.get("max_tokens", 2000),
                "top_p": kwargs.get("top_p", 1.0),
                "stream": True
            }
            
            # Make streaming request
            async with self.session.post(
                f"{self.base_url}/chat/completions",
                headers={
                    **self._get_headers(),
                    "Accept": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                },
                json=payload
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    yield {"error": f"OpenAI API error: {error}"}
                    return
                
                buffer = ""
                async for line in response.content:
                    if line.startswith(b'data: '):
                        data = line[6:].strip()
                        if data == b'[DONE]':
                            break
                            
                        try:
                            chunk = json.loads(data)
                            if 'choices' in chunk and chunk['choices']:
                                delta = chunk['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    buffer += delta['content']
                                    yield {
                                        "content": delta['content'],
                                        "done": False,
                                        "model": model,
                                        "provider": self.provider_name
                                    }
                        except json.JSONDecodeError:
                            continue
                
                # Final yield with complete response
                yield {
                    "content": buffer,
                    "done": True,
                    "model": model,
                    "provider": self.provider_name
                }
                
        except Exception as e:
            logger.error(f"OpenAI streaming error: {str(e)}")
            yield {"error": str(e), "done": True}
    
    async def _check_rate_limits(self):
        """Check and respect rate limits"""
        now = time.time()
        if now < self._rate_limit_reset and self._rate_limit_remaining <= 0:
            wait_time = self._rate_limit_reset - now + 1
            logger.warning(f"Rate limit reached. Waiting {wait_time:.1f}s")
            await asyncio.sleep(wait_time)
    
    def _update_rate_limits(self, headers: Dict[str, str]):
        """Update rate limit info from response headers"""
        if not headers:
            return
            
        remaining = headers.get('x-ratelimit-remaining-requests')
        reset = headers.get('x-ratelimit-reset-requests')
        
        if remaining is not None:
            try:
                self._rate_limit_remaining = int(remaining)
            except (ValueError, TypeError):
                pass
                
        if reset is not None:
            try:
                self._rate_limit_reset = int(reset)
            except (ValueError, TypeError):
                pass

class NvidiaProvider(AIProvider):
    """NVIDIA API provider with support for multiple models and concurrent requests"""
    
    def __init__(self, api_keys: Optional[Dict[str, str]] = None):
        super().__init__("nvidia")
        
        # Load API keys from environment variables if not provided
        self.api_keys = {
            "mistral": os.getenv("NVIDIA_MISTRAL_API_KEY"),
            "kimi": os.getenv("NVIDIA_KIMI_API_KEY"),
            "mixtral": os.getenv("NVIDIA_MIXTRAL_8X22B_API_KEY")
        }
        
        # Override with provided API keys
        if api_keys:
            self.api_keys.update(api_keys)
        
        # Model configurations with load balancing weights
        self.model_configs = {
            "mistralai/mixtral-8x22b-instruct-v0.1": {
                "api_key": self.api_keys["mixtral"],
                "base_url": "https://integrate.api.nvidia.com/v1",
                "weight": 0.5,  # Higher weight = more requests
                "default_params": {
                    "temperature": 0.5,
                    "top_p": 1.0,
                    "max_tokens": 1024,
                    "stream": True
                }
            },
            "nv-mistralai/mistral-nemo-12b-instruct": {
                "api_key": self.api_keys["mistral"],
                "base_url": "https://integrate.api.nvidia.com/v1",
                "weight": 0.3,
                "default_params": {
                    "temperature": 0.2,
                    "top_p": 0.7,
                    "max_tokens": 1024,
                    "stream": True
                }
            },
            "moonshotai/kimi-k2-instruct-0905": {
                "api_key": self.api_keys["kimi"],
                "base_url": "https://integrate.api.nvidia.com/v1",
                "weight": 0.2,
                "default_params": {
                    "temperature": 0.6,
                    "top_p": 0.9,
                    "max_tokens": 4096,
                    "stream": True
                }
            }
        }
        
        # Set available models (only those with API keys)
        self.available_models = [
            model_id for model_id, config in self.model_configs.items()
            if config["api_key"]
        ]
        
        # Initialize model stats for load balancing
        self.model_stats = {
            model_id: {
                'requests': 0,
                'errors': 0,
                'avg_latency': 0.0,
                'last_used': 0.0
            }
            for model_id in self.available_models
        }
        
        self.default_model = self._select_best_model()
        
    def _select_best_model(self) -> Optional[str]:
        """Select the best model based on weights and stats"""
        if not self.available_models:
            return None
            
        # Calculate scores for each model
        scores = []
        current_time = time.time()
        
        for model_id in self.available_models:
            config = self.model_configs[model_id]
            stats = self.model_stats[model_id]
            
            # Base weight from config
            score = config["weight"]
            
            # Adjust based on recent errors
            total_requests = stats['requests'] + stats['errors']
            if total_requests > 0:
                error_rate = stats['errors'] / total_requests
                score *= (1.0 - error_rate * 0.5)  # Reduce score by up to 50% for error rate
            
            # Slight preference for less used models
            score = score / (1 + stats['requests'] * 0.1)
            
            # Slight boost for recently used models
            if stats['last_used'] > 0:
                hours_since_use = (current_time - stats['last_used']) / 3600
                score *= (1.0 + 0.2 * (1.0 / (1.0 + hours_since_use)))
                
            scores.append((model_id, score))
        
        # Select model with highest score
        if not scores:
            return None
            
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[0][0]
    
    def _get_model_config(self, model_id: str) -> Dict[str, Any]:
        """Get configuration for a specific model"""
        if model_id not in self.model_configs:
            raise ValueError(f"Model {model_id} is not configured")
            
        config = self.model_configs[model_id]
        if not config["api_key"]:
            raise ValueError(f"No API key available for model {model_id}")
            
        return config
        
    async def is_available(self) -> bool:
        """Check if any NVIDIA model is available"""
        return len(self.available_models) > 0
        
    async def get_models(self) -> List[str]:
        """Get available models from NVIDIA API"""
        return self.available_models
        
    async def _generate_single(
        self,
        model: str,
        messages: List[Dict[str, str]],
        params: Dict[str, Any]
    ) -> Tuple[Optional[str], Optional[Dict], float, Optional[str]]:
        """Generate text using a single model"""
        start_time = time.time()
        config = self._get_model_config(model)
        stats = self.model_stats[model]
        
        try:
            # Prepare the request payload
            payload = {
                "model": model,
                "messages": messages,
                **{k: v for k, v in params.items() if k != 'stream'},
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
                response.raise_for_status()
                response_data = await response.json()
                
                # Update stats
                latency = time.time() - start_time
                stats['requests'] += 1
                stats['avg_latency'] = (
                    (stats['avg_latency'] * (stats['requests'] - 1) + latency) 
                    / stats['requests']
                )
                stats['last_used'] = time.time()
                
                return (
                    response_data['choices'][0]['message']['content'],
                    response_data.get('usage'),
                    latency,
                    None
                )
                
        except Exception as e:
            stats['errors'] += 1
            logger.error(f"NVIDIA generation error for {model}: {str(e)}")
            return None, None, 0.0, str(e)
    
    async def generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        model: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate text using NVIDIA's API with load balancing"""
        start_time = time.time()
        
        # Prepare messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        # Get parameters, allowing model-specific overrides
        default_params = self.model_configs[model or self.default_model]["default_params"]
        params = {**default_params, **kwargs}
        
        if model:
            # If a specific model is requested, use only that one
            selected_models = [model]
        else:
            # Otherwise, use all available models with load balancing
            selected_models = self.available_models
        
        # Create tasks for all selected models
        tasks = [
            self._generate_single(
                model=model_id,
                messages=messages,
                params={
                    **params,
                    **self.model_configs[model_id]["default_params"]
                }
            )
            for model_id in selected_models
        ]
        
        # Wait for the first successful response
        for future in asyncio.as_completed(tasks):
            content, usage, latency, error = await future
            if content is not None:
                return AIResponse(
                    content=content,
                    model=model or self.default_model,
                    provider=self.provider_name,
                    usage=usage,
                    latency=latency
                )
        
        # If we get here, all models failed
        return AIResponse(
            content="",
            model=model or self.default_model,
            provider=self.provider_name,
            error="All model requests failed"
        )
    
    async def stream_generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncIterator[str]:
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
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"NVIDIA API error: {response.status} - {error_text}")
                
                buffer = b""
                async for chunk in response.content:
                    if not chunk:
                        continue
                        
                    buffer += chunk
                    while b'\n\n' in buffer:
                        line, buffer = buffer.split(b'\n\n', 1)
                        if line.startswith(b'data: ') and line[6:].strip() != b'[DONE]':
                            try:
                                data = json.loads(line[6:])
                                if 'choices' in data and len(data['choices']) > 0:
                                    delta = data['choices'][0].get('delta', {})
                                    if 'content' in delta:
                                        yield delta['content']
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"Error in NVIDIA streaming: {str(e)}")
            raise

# Mock AnthropicProvider for testing
class GroqProvider(AIProvider):
    """Mock Groq provider for testing"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__("groq")
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.available_models = ["mixtral-8x7b-32768", "llama2-70b-4096"]
        self.default_model = "mixtral-8x7b-32768"
    
    async def is_available(self) -> bool:
        """Check if the provider is available."""
        return bool(self.api_key)
    
    async def get_models(self) -> List[str]:
        """Get available models."""
        return self.available_models
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate text using the Groq API."""
        model = model or self.default_model
        return AIResponse(
            content=f"Mock Groq response to: {prompt}",
            model=model,
            provider=self.provider_name
        )
    
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[AIResponse, None]:
        """Stream generated text from the Groq API."""
        model = model or self.default_model
        response = f"Mock Groq streaming response to: {prompt}"
        for word in response.split():
            yield AIResponse(
                content=word + " ",
                model=model,
                provider=self.provider_name
            )
            await asyncio.sleep(0.01)


class AnthropicProvider(AIProvider):
    """Mock Anthropic provider for testing"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__("anthropic")
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.available_models = ["claude-3-opus-20240229", "claude-3-sonnet-20240229"]
        self.default_model = "claude-3-sonnet-20240229"
    
    async def is_available(self) -> bool:
        """Check if the provider is available."""
        return bool(self.api_key)
    
    async def get_models(self) -> List[str]:
        """Get available models."""
        return self.available_models
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate text using the Anthropic API."""
        model = model or self.default_model
        return AIResponse(
            content=f"Mock Anthropic response to: {prompt}",
            model=model,
            provider=self.provider_name
        )
    
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[AIResponse, None]:
        """Stream generated text from the Anthropic API."""
        model = model or self.default_model
        response = f"Mock streaming response to: {prompt}"
        for word in response.split():
            yield AIResponse(
                content=word + " ",
                model=model,
                provider=self.provider_name
            )
            await asyncio.sleep(0.01)


class AIOrchestrator:
    """Orchestrates multiple AI providers with concurrent execution and load balancing"""
    
    def __init__(self):
        # Initialize all available providers
        self.providers = {
            "nvidia": NvidiaProvider(),
            "openai": OpenAIProvider(),
            "anthropic": AnthropicProvider(),
            "groq": GroqProvider(),
            "ollama": OllamaProvider()  # Local fallback
        }
        
        # Provider weights (higher = more traffic)
        self.provider_weights = {
            "nvidia": 0.4,    # High weight for NVIDIA's multiple models
            "groq": 0.25,     # Fast responses
            "openai": 0.2,    # Reliable but slower
            "anthropic": 0.15,# Specialized for complex tasks
            "ollama": 0.1     # Local fallback with lower weight
        }
        
        # Track provider stats for load balancing
        self.provider_stats = {
            name: {
                'requests': 0,
                'errors': 0,
                'avg_latency': 0.0,
                'last_used': 0.0,
                'concurrent_requests': 0,
                'max_concurrent': 0
            }
            for name in self.providers
        }
        
        # Initialize available providers (will be populated in initialize())
        self.available_providers = []
        self._initialized = False
        
    async def initialize(self):
        """Initialize the orchestrator asynchronously."""
        if not self._initialized:
            await self._update_available_providers()
            self._initialized = True
        
    async def _update_available_providers(self):
        """Check which providers are currently available"""
        self.available_providers = []
        
        # First check Ollama specifically
        if "ollama" in self.providers:
            try:
                if await self.providers["ollama"].is_available():
                    # If Ollama is available, add it first to be preferred
                    self.available_providers.append("ollama")
            except Exception as e:
                logger.warning(f"Error checking Ollama availability: {str(e)}")
        
        # Check other providers
        for name, provider in self.providers.items():
            if name == "ollama":
                continue  # Already checked Ollama
                
            try:
                if await self._is_provider_available(provider):
                    self.available_providers.append(name)
            except Exception as e:
                logger.warning(f"Error checking {name} availability: {str(e)}")
        
        # If only Ollama is available, that's fine - we'll use it
        if not self.available_providers and "ollama" in self.providers:
            logger.info("Only Ollama is available, using as fallback")
            self.available_providers = ["ollama"]
    
    async def _is_provider_available(self, provider: AIProvider) -> bool:
        """Check if a provider is available and has valid config"""
        try:
            return await provider.is_available()
        except Exception as e:
            logger.warning(f"Error checking provider availability: {str(e)}")
            return False
    
    def _select_providers(self, count: int = 2) -> List[str]:
        """Select best providers based on weights and current load"""
        if not self.available_providers:
            return []
            
        # Calculate scores for each provider
        scores = []
        current_time = time.time()
        
        for name in self.available_providers:
            stats = self.provider_stats[name]
            weight = self.provider_weights.get(name, 0.1)
            
            # Calculate score based on weight, errors, and current load
            score = weight
            
            # Adjust for error rate
            total_requests = stats['requests'] + stats['errors']
            if total_requests > 0:
                error_rate = stats['errors'] / total_requests
                score *= (1.0 - error_rate * 0.5)  # Reduce score by up to 50% for errors
            
            # Adjust for concurrent requests
            if stats['max_concurrent'] > 0:
                load_factor = 1.0 / (1.0 + stats['concurrent_requests'] / max(1, stats['max_concurrent']))
                score *= (0.5 + 0.5 * load_factor)  # Reduce score based on load
            
            # Slight preference for recently used providers
            if stats['last_used'] > 0:
                hours_since_use = (current_time - stats['last_used']) / 3600
                score *= (1.0 + 0.1 * (1.0 / (1.0 + hours_since_use)))
                
            scores.append((name, score))
        
        # Sort by score and select top N
        scores.sort(key=lambda x: x[1], reverse=True)
        return [name for name, _ in scores[:count]]
        
    async def close(self):
        """Clean up all provider sessions"""
        for provider in self.providers.values():
            await provider.close()
    
    def get_best_provider(self) -> str:
        """Get the best available provider based on stats and weights"""
        available_providers = []
        
        for name, stats in self.provider_stats.items():
            if name not in self.providers:
                continue
                
            # Calculate score based on success rate and weight
            total = stats['success'] + stats['errors']
            success_rate = stats['success'] / total if total > 0 else 1.0
            
            # Age factor (prefer recently used providers)
            age_factor = 1.0 - min(1.0, (time.time() - stats['last_used']) / 3600)
            
            # Combine factors
            score = (
                self.provider_weights.get(name, 0.1) * 
                success_rate * 
                (1.0 + age_factor * 0.5)  # Up to 50% boost for recent usage
            )
            
            available_providers.append((name, score))
        
        # Sort by score (highest first)
        available_providers.sort(key=lambda x: x[1], reverse=True)
        return available_providers[0][0] if available_providers else self.fallback_order[0]
    
    def update_stats(self, provider_name: str, success: bool, latency: float):
        """Update provider statistics"""
        if provider_name not in self.provider_stats:
            return
            
        stats = self.provider_stats[provider_name]
        if success:
            stats['success'] += 1
            # Update average latency (exponential moving average)
            alpha = 0.1  # Smoothing factor
            if stats['avg_latency'] == 0:
                stats['avg_latency'] = latency
            else:
                stats['avg_latency'] = alpha * latency + (1 - alpha) * stats['avg_latency']
        else:
            stats['errors'] += 1
            
        stats['last_used'] = time.time()
    
    async def get_available_providers(self) -> Dict[str, bool]:
        """Check which providers are available"""
        results = {}
        for name, provider in self.providers.items():
            try:
                results[name] = await provider.is_available()
            except Exception as e:
                logger.warning(f"Error checking {name} availability: {str(e)}")
                results[name] = False
        return results
    
    async def _execute_with_provider(
        self,
        provider_name: str,
        prompt: str,
        system_prompt: str = "",
        **kwargs
    ) -> AIResponse:
        """Execute generation with a specific provider and track stats"""
        provider = self.providers[provider_name]
        stats = self.provider_stats[provider_name]
        
        # Update concurrency stats
        stats['concurrent_requests'] += 1
        stats['max_concurrent'] = max(
            stats['max_concurrent'], 
            stats['concurrent_requests']
        )
        
        start_time = time.time()
        try:
            response = await provider.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                **kwargs
            )
            
            # Update stats on success
            stats['requests'] += 1
            stats['last_used'] = time.time()
            stats['avg_latency'] = (
                stats['avg_latency'] * (stats['requests'] - 1) + 
                (time.time() - start_time)
            ) / stats['requests']
            
            return response
            
        except Exception as e:
            stats['errors'] += 1
            logger.warning(f"Provider {provider_name} failed: {e}")
            raise
            
        finally:
            stats['concurrent_requests'] -= 1
    
    async def generate(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        provider: Optional[str] = None,
        max_concurrent: int = 3,
        **kwargs
    ) -> AIResponse:
        """Generate text using multiple providers concurrently with load balancing
        
        Args:
            prompt: The input prompt
            system_prompt: Optional system message
            provider: Specific provider to use (if None, uses load balancing)
            max_concurrent: Maximum number of providers to try simultaneously
            **kwargs: Additional parameters for the generation
            
        Returns:
            AIResponse with the generated content
        """
        # Update available providers
        await self._update_available_providers()
        if not self.available_providers:
            raise RuntimeError("No AI providers available")
        
        # If specific provider is requested, use only that one
        if provider:
            if provider not in self.available_providers:
                raise ValueError(f"Provider {provider} is not available")
            return await self._execute_with_provider(
                provider_name=provider,
                prompt=prompt,
                system_prompt=system_prompt,
                **kwargs
            )
        
        # Select best providers based on load and performance
        selected_providers = self._select_providers(
            min(max_concurrent, len(self.available_providers))
        )
        
        if not selected_providers:
            raise RuntimeError("No suitable providers available")
        
        # Create tasks for all selected providers
        tasks = []
        for provider_name in selected_providers:
            task = asyncio.create_task(
                self._execute_with_provider(
                    provider_name=provider_name,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    **kwargs
                )
            )
            tasks.append((provider_name, task))
        
        # Wait for the first successful response
        errors = {}
        for provider_name, task in tasks:
            try:
                # Add a small timeout to prevent hanging on slow providers
                result = await asyncio.wait_for(task, timeout=60)
                
                # Cancel other tasks
                for _, t in tasks:
                    if not t.done():
                        t.cancel()
                
                return result
                
            except asyncio.TimeoutError:
                errors[provider_name] = "Request timed out"
                logger.warning(f"Provider {provider_name} timed out")
                continue
                
            except Exception as e:
                errors[provider_name] = str(e)
                continue
        
        # If we get here, all providers failed
        error_msg = ", ".join(f"{k}: {v}" for k, v in errors.items())
        logger.error(f"All providers failed: {error_msg}")
        raise RuntimeError(f"All providers failed: {error_msg}")
    
    async def get_models_for_provider(self, provider_name: str) -> List[str]:
        """Get models for a specific provider"""
        if provider_name in self.providers:
            return await self.providers[provider_name].get_models()
        return []

# Global orchestrator instance with lazy loading
_ai_orchestrator = None
_initialization_lock = asyncio.Lock()

async def get_ai_orchestrator() -> AIOrchestrator:
    """Get the global AI orchestrator instance, creating and initializing it if necessary."""
    global _ai_orchestrator
    
    if _ai_orchestrator is None:
        async with _initialization_lock:
            if _ai_orchestrator is None:  # Double-checked locking pattern
                _ai_orchestrator = AIOrchestrator()
                await _ai_orchestrator.initialize()
    
    return _ai_orchestrator

# For backward compatibility with synchronous code
def get_ai_orchestrator_sync() -> AIOrchestrator:
    """Synchronous version of get_ai_orchestrator. Use only when async is not possible."""
    global _ai_orchestrator
    
    if _ai_orchestrator is None:
        loop = asyncio.new_event_loop()
        try:
            _ai_orchestrator = loop.run_until_complete(get_ai_orchestrator())
        finally:
            loop.close()
    
    return _ai_orchestrator

# Register cleanup for application shutdown
async def cleanup():
    """Clean up resources on application exit"""
    global _ai_orchestrator
    if _ai_orchestrator is not None:
        await _ai_orchestrator.close()
        _ai_orchestrator = None

# Register the cleanup function to run on normal program termination
atexit.register(lambda: asyncio.run(cleanup()))