from typing import Dict, List, Optional, Type, Union, Any
import importlib
import logging
from pathlib import Path

from config.settings import settings
from .providers.base import BaseModelProvider

logger = logging.getLogger(__name__)

class ModelFactory:
    """Factory class for creating and managing model providers."""
    
    _instance = None
    _providers: Dict[str, BaseModelProvider] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._load_providers()
            self._initialized = True
    
    def _load_providers(self):
        """Load all available model providers."""
        provider_path = Path(__file__).parent / 'providers'
        
        # Import all provider modules
        for provider_file in provider_path.glob('*.py'):
            if provider_file.stem != '__init__' and provider_file.stem != 'base':
                try:
                    module_name = f"ai.providers.{provider_file.stem}"
                    module = importlib.import_module(module_name)
                    provider_class = getattr(module, f"{provider_file.stem.capitalize()}Provider", None)
                    
                    if provider_class and provider_class != BaseModelProvider:
                        provider_name = provider_file.stem.lower()
                        config = settings.get_provider_config(provider_name)
                        
                        # Only initialize if required config is present
                        if self._validate_provider_config(provider_name, config):
                            try:
                                self._providers[provider_name] = provider_class(config)
                                logger.info(f"Initialized provider: {provider_name}")
                            except Exception as e:
                                logger.warning(f"Failed to initialize {provider_name}: {str(e)}")
                except ImportError as e:
                    logger.warning(f"Failed to import provider {provider_file.stem}: {str(e)}")
    
    def _validate_provider_config(self, provider_name: str, config: Dict[str, Any]) -> bool:
        """Validate if the provider has the required configuration."""
        required_configs = {
            'openai': ['api_key'],
            'anthropic': ['api_key'],
            'groq': ['api_key'],
            'ollama': ['base_url'],
            'lm_studio': ['base_url'],
            'tabby': ['base_url']
        }
        
        if provider_name not in required_configs:
            return False
            
        for key in required_configs[provider_name]:
            if not config.get(key):
                return False
                
        return True
    
    def get_provider(self, provider_name: str) -> Optional[BaseModelProvider]:
        """Get a provider by name."""
        return self._providers.get(provider_name.lower())
    
    def get_available_providers(self) -> List[str]:
        """Get a list of available provider names."""
        return list(self._providers.keys())
    
    def get_available_models(self) -> Dict[str, List[str]]:
        """Get all available models across all providers."""
        models = {}
        for provider_name, provider in self._providers.items():
            try:
                models[provider_name] = provider.get_available_models()
            except Exception as e:
                logger.warning(f"Failed to get models from {provider_name}: {str(e)}")
                models[provider_name] = []
        return models
    
    def get_model_provider(self, model_name: str) -> Optional[BaseModelProvider]:
        """Get the provider that can handle the given model."""
        for provider in self._providers.values():
            if hasattr(provider, 'is_model_available') and provider.is_model_available(model_name):
                return provider
        return None

# Create a singleton instance
model_factory = ModelFactory()

def get_model_factory() -> ModelFactory:
    """Get the model factory instance."""
    return model_factory
