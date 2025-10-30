"""
Comprehensive tests for AI provider implementations.
"""
import pytest
import os
import sys
import asyncio
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock, ANY

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))
from ai_providers import (
    AIOrchestrator, 
    NvidiaProvider, 
    OllamaProvider,
    OpenAIProvider,
    GroqProvider,
    AnthropicProvider,
    get_ai_orchestrator,
    AIResponse
)

# Test Fixtures
@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing."""
    with patch.dict(os.environ, {
        "NVIDIA_MISTRAL_API_KEY": "test_nvidia_key",
        "OPENAI_API_KEY": "test_openai_key",
        "ANTHROPIC_API_KEY": "test_anthropic_key",
        "GROQ_API_KEY": "test_groq_key",
        "OLLAMA_HOST": "http://test-ollama:11434"
    }):
        yield

@pytest.fixture()
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def mock_ai_orchestrator():
    """Create a mock AI orchestrator for testing."""
    with patch('ai_providers.NvidiaProvider.is_available', return_value=True), \
         patch('ai_providers.OpenAIProvider.is_available', return_value=True), \
         patch('ai_providers.AnthropicProvider.is_available', return_value=True), \
         patch('ai_providers.GroqProvider.is_available', return_value=True), \
         patch('ai_providers.OllamaProvider.is_available', return_value=True):
        
        orchestrator = await get_ai_orchestrator()
        yield orchestrator
        await orchestrator.close()

# Test Cases
class TestNvidiaProvider:
    """Test cases for NvidiaProvider."""
    
    @pytest.fixture()
    def nvidia_provider(self, mock_env_vars):
        """Create a NvidiaProvider instance for testing."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            provider = NvidiaProvider()
            yield provider
            # Cleanup if needed

    @pytest.mark.asyncio
    async def test_initialization(self, nvidia_provider):
        """Test NvidiaProvider initialization."""
        assert nvidia_provider is not None
        assert hasattr(nvidia_provider, 'available_models')
        assert hasattr(nvidia_provider, 'model_configs')
        assert hasattr(nvidia_provider, 'model_stats')

    @pytest.mark.asyncio
    async def test_is_available(self, nvidia_provider):
        """Test is_available method."""
        with patch.object(nvidia_provider, 'available_models', ['test-model']):
            assert await nvidia_provider.is_available() is True
        
        with patch.object(nvidia_provider, 'available_models', []):
            assert await nvidia_provider.is_available() is False

    @pytest.mark.asyncio
    async def test_generate(self, nvidia_provider):
        """Test text generation."""
        mock_response = {
            'choices': [{'message': {'content': 'Test response'}}],
            'usage': {'total_tokens': 10}
        }
        
        with patch.object(nvidia_provider, '_generate_single', return_value=('Test response', {'total_tokens': 10}, 0.5, None)):
            response = await nvidia_provider.generate("Test prompt")
            assert isinstance(response, AIResponse)
            assert response.content == 'Test response'
            assert response.model == nvidia_provider.default_model
            assert response.provider == 'nvidia'
            assert response.latency > 0

class TestOllamaProvider:
    """Test cases for OllamaProvider."""
    
    @pytest.fixture
    def ollama_provider(self, mock_env_vars):
        """Create an OllamaProvider instance for testing."""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            provider = OllamaProvider()
            yield provider

    @pytest.mark.asyncio
    async def test_initialization(self, ollama_provider):
        """Test OllamaProvider initialization."""
        assert ollama_provider is not None
        assert hasattr(ollama_provider, 'available_models')
        assert hasattr(ollama_provider, 'default_model')

    @pytest.mark.asyncio
    async def test_generate(self, ollama_provider):
        """Test text generation."""
        mock_response = {
            'response': 'Test response',
            'done': True
        }
        
        with patch.object(ollama_provider, '_make_request', return_value=(mock_response, 200)):
            response = await ollama_provider.generate("Test prompt")
            assert isinstance(response, AIResponse)
            assert response.content == 'Test response'

class TestAIOrchestrator:
    """Test cases for AIOrchestrator."""
    
    @pytest.mark.asyncio
    async def test_initialization(self, mock_ai_orchestrator):
        """Test AIOrchestrator initialization with all providers."""
        assert mock_ai_orchestrator is not None
        assert len(mock_ai_orchestrator.providers) > 0
        assert "nvidia" in mock_ai_orchestrator.providers
        assert "openai" in mock_ai_orchestrator.providers
        assert "anthropic" in mock_ai_orchestrator.providers
        assert "groq" in mock_ai_orchestrator.providers
        assert "ollama" in mock_ai_orchestrator.providers

    @pytest.mark.asyncio
    async def test_get_available_providers(self, mock_ai_orchestrator):
        """Test getting available providers."""
        providers = await mock_ai_orchestrator.get_available_providers()
        assert isinstance(providers, dict)
        assert all(key in providers for key in ["nvidia", "openai", "anthropic", "groq", "ollama"])

    @pytest.mark.asyncio
    async def test_generate_text(self, mock_ai_orchestrator):
        """Test text generation through the orchestrator."""
        mock_response = AIResponse(
            content="Test response",
            model="test-model",
            provider="test-provider"
        )
        
        with patch.object(mock_ai_orchestrator.providers["nvidia"], 'generate', return_value=mock_response):
            response = await mock_ai_orchestrator.generate_text(
                "nvidia",
                "Test prompt",
                "Test system prompt"
            )
            assert response == mock_response

    @pytest.mark.asyncio
    async def test_stream_text(self, mock_ai_orchestrator):
        """Test streaming text generation."""
        async def mock_stream():
            yield "Test "
            yield "streaming "
            yield "response"
        
        with patch.object(mock_ai_orchestrator.providers["nvidia"], 'stream_generate', return_value=mock_stream()):
            chunks = []
            async for chunk in mock_ai_orchestrator.stream_text("nvidia", "Test prompt"):
                chunks.append(chunk)
            
            assert "".join(chunks) == "Test streaming response"

# Test utility functions
class TestUtilityFunctions:
    """Test utility functions in ai_providers module."""
    
    @pytest.mark.asyncio
    async def test_get_ai_orchestrator_singleton(self, mock_env_vars):
        """Test that get_ai_orchestrator returns a singleton instance."""
        with patch('ai_providers.AIOrchestrator') as mock_orchestrator:
            mock_orchestrator.return_value.initialize = AsyncMock()
            
            # First call should create a new instance
            orchestrator1 = await get_ai_orchestrator()
            # Second call should return the same instance
            orchestrator2 = await get_ai_orchestrator()
            
            assert orchestrator1 is orchestrator2
            mock_orchestrator.assert_called_once()

# Test error handling
class TestErrorHandling:
    """Test error handling in AI providers."""
    
    @pytest.mark.asyncio
    async def test_provider_timeout(self, mock_ai_orchestrator):
        """Test handling of provider timeouts."""
        with patch.object(mock_ai_orchestrator.providers["nvidia"], 'generate', 
                         side_effect=asyncio.TimeoutError("Request timed out")) as mock_generate:
            
            response = await mock_ai_orchestrator.generate_text(
                "nvidia",
                "Test prompt"
            )
            
            assert response.error is not None
            assert "timed out" in response.error.lower()

    @pytest.mark.asyncio
    async def test_provider_error(self, mock_ai_orchestrator):
        """Test handling of provider errors."""
        with patch.object(mock_ai_orchestrator.providers["openai"], 'generate', 
                         side_effect=Exception("API Error")) as mock_generate:
            
            response = await mock_ai_orchestrator.generate_text(
                "openai",
                "Test prompt"
            )
            
            assert response.error is not None
            assert "api error" in response.error.lower()

# Test concurrency
class TestConcurrency:
    """Test concurrent operations with AI providers."""
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, mock_ai_orchestrator):
        """Test handling of concurrent requests."""
        async def mock_generate(*args, **kwargs):
            await asyncio.sleep(0.1)  # Simulate processing time
            return AIResponse(
                content=f"Response to {args[0]}",
                model="test-model",
                provider="test-provider"
            )
        
        with patch.object(mock_ai_orchestrator.providers["nvidia"], 'generate', mock_generate):
            # Create multiple concurrent requests
            tasks = [
                mock_ai_orchestrator.generate_text("nvidia", f"Test {i}")
                for i in range(5)
            ]
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Verify all requests completed successfully
            assert len(responses) == 5
            assert all(isinstance(r, AIResponse) for r in responses)
