"""
MCP Configuration
"""
import os
from typing import Dict, List

class MCPConfig:
    """Configuration for MCP debugging system"""
    
    # Supported languages and their analyzers
    LANGUAGE_ANALYZERS = {
        "python": ["flake8", "mypy", "bandit"],
        "javascript": ["eslint"],
        "typescript": ["eslint", "tsc"],
        "jsx": ["eslint"],
        "tsx": ["eslint", "tsc"],
    }
    
    # File extensions mapping
    EXTENSION_MAP = {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "jsx",
        ".ts": "typescript",
        ".tsx": "tsx",
        ".mjs": "javascript",
        ".cjs": "javascript",
    }
    
    # Severity levels
    SEVERITY_LEVELS = ["error", "warning", "info", "hint"]
    
    # Issue categories
    ISSUE_CATEGORIES = {
        "syntax": "Syntax Errors",
        "type": "Type Errors",
        "security": "Security Issues",
        "style": "Style Issues",
        "performance": "Performance Issues",
        "bug": "Potential Bugs",
        "complexity": "Code Complexity",
        "import": "Import Issues",
    }
    
    # Analyzer configurations
    FLAKE8_CONFIG = {
        "max_line_length": 100,
        "ignore": ["E203", "W503"],  # Black compatibility
    }
    
    MYPY_CONFIG = {
        "strict": False,
        "ignore_missing_imports": True,
    }
    
    BANDIT_CONFIG = {
        "level": "medium",
        "confidence": "medium",
    }
    
    ESLINT_CONFIG = {
        "extends": ["eslint:recommended"],
    }
    
    # LLM Fix Generation
    FIX_PROMPT_TEMPLATE = """You are an expert code debugger. Analyze this issue and provide a fix.

File: {file_path}
Line: {line_number}
Issue: {issue_description}
Severity: {severity}
Category: {category}

Code Context:
```{language}
{code_context}
```

Provide:
1. Root cause analysis
2. Exact code fix (only the changed lines)
3. Explanation of the fix

Format your response as:
ANALYSIS: <your analysis>
FIX: <exact code to replace>
EXPLANATION: <why this fixes it>
"""
    
    # Patch application settings
    MAX_PATCH_SIZE = 1000  # Max lines to patch at once
    BACKUP_ENABLED = True
    DRY_RUN_DEFAULT = False
    
    @classmethod
    def get_language(cls, file_path: str) -> str:
        """Get language from file extension"""
        ext = os.path.splitext(file_path)[1].lower()
        return cls.EXTENSION_MAP.get(ext, "unknown")
    
    @classmethod
    def get_analyzers(cls, language: str) -> List[str]:
        """Get analyzers for a language"""
        return cls.LANGUAGE_ANALYZERS.get(language, [])