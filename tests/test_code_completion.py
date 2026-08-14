"""
Tests for the AI-powered code completion service.
"""

import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from ai.code_completion import CodeCompletionService, CompletionItem


@pytest.fixture
def completion_service():
    """Create a code completion service instance for testing."""
    service = CodeCompletionService()
    # Clear any cached completions
    service._completion_cache = {}
    service._last_request_time = {}
    return service


@pytest.mark.asyncio
async def test_detect_language(completion_service):
    """Test language detection from file extensions."""
    # Python files
    assert completion_service.detect_language("test.py") == "python"
    assert completion_service.detect_language("module/__init__.py") == "python"

    # Web files
    assert completion_service.detect_language("index.html") == "html"
    assert completion_service.detect_language("styles/main.css") == "css"

    # Special cases
    assert completion_service.detect_language("Dockerfile") == "dockerfile"
    assert completion_service.detect_language("Makefile") == "makefile"
    assert completion_service.detect_language(".gitignore") == "gitignore"


@pytest.mark.asyncio
async def test_get_code_context(completion_service):
    """Test code context extraction."""
    code = """import os
from pathlib import Path

def example():
    x = 1
    return x

class TestClass:
    pass
"""
    context = completion_service._get_code_context(
        code, 50, "python"
    )  # Position is after 'x = 1'

    assert "os" in context["imports"]
    assert "pathlib" in context["imports"]
    assert "example" in context["functions"]
    assert "TestClass" in context["classes"]
    assert context["line"].strip() == "x = 1"
    assert not context["in_comment"]
    assert not context["in_string"]


@pytest.mark.asyncio
async def test_multi_line_completions(completion_service):
    """Test generation of multi-line completions."""
    context = {
        "language": "python",
        "classes": ["TestClass"],
        "line": "class ",
        "indent_level": 0,
    }

    completions = completion_service._generate_multi_line_completions(context)

    # Should include class templates
    class_templates = [c for c in completions if "class " in c.label]
    assert len(class_templates) > 0

    # Should include class-specific completions
    class_specific = [c for c in completions if "TestClass" in c.label]
    assert len(class_specific) > 0


@pytest.mark.asyncio
async def test_local_completions(completion_service):
    """Test generation of local completions."""
    context = {
        "language": "python",
        "imports": {"os", "sys"},
        "variables": {"count", "total"},
        "functions": {"calculate", "process"},
        "classes": ["TestClass"],
        "line": "def ",
        "in_comment": False,
        "in_string": False,
    }

    completions = completion_service._get_local_completions("", "python", context)

    # Should include function templates
    assert any("def " in c["label"] for c in completions)

    # Should include local variables and functions
    assert any(c["label"] == "count" for c in completions)
    assert any(c["label"] == "calculate()" for c in completions)


@pytest.mark.asyncio
async def test_completion_integration(completion_service):
    """Test the complete completion flow."""
    code = """import os

def example():
    return os.path."""

    # Mock AI completions
    with patch.object(
        completion_service, "_get_ai_completions", new_callable=AsyncMock
    ) as mock_ai:
        mock_ai.return_value = [
            {
                "label": "os.path.join()",
                "kind": "function",
                "documentation": "Join path components",
                "score": 0.95,
                "insertText": "os.path.join($0)",
            }
        ]

        completions = await completion_service.get_completions(
            code=code, cursor_pos=len(code), file_path="test.py"
        )

    # Should include both local and AI completions
    assert len(completions) > 0
    assert any("join" in c["label"] for c in completions)


@pytest.mark.asyncio
async def test_context_aware_filtering(completion_service):
    """Test that completions are filtered based on context."""
    # In an import statement
    context = {
        "language": "python",
        "line": "import ",
        "in_comment": False,
        "in_string": False,
    }

    completions = completion_service._get_local_completions("", "python", context)
    # Should not show keywords in import context
    assert not any(c["kind"] == "keyword" for c in completions)
    # Should show module imports
    assert any(c["kind"] == "module" for c in completions)


@pytest.mark.asyncio
async def test_caching(completion_service):
    """Test that completions are properly cached."""
    code = "def example():"
    cache_key = f"test.py:0:{hash(code)}"

    # First call - should not be cached
    completions1 = await completion_service.get_completions(
        code=code, cursor_pos=len(code), file_path="test.py"
    )

    # Should be cached now
    assert cache_key in completion_service._completion_cache

    # Mock the actual completion generation
    with patch.object(
        completion_service, "_generate_completions", new_callable=AsyncMock
    ) as mock_gen:
        # Second call with same input - should use cache
        completions2 = await completion_service.get_completions(
            code=code, cursor_pos=len(code), file_path="test.py"
        )

        # Should not call generate_completions again
        mock_gen.assert_not_called()

    # Results should be the same
    assert completions1 == completions2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
