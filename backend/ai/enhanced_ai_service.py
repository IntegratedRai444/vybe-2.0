"""
Enhanced AI Service with advanced features for code analysis, debugging, and security.
"""
import ast
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, AsyncGenerator
import aiohttp
import json
import logging
from pathlib import Path

from .code_analysis import CodeAnalyzer
from .security_scanner import SecurityScanner
from .debugger import Debugger
from ..models import AIResponse, CodeSnippet, SecurityIssue, DebugSession

logger = logging.getLogger(__name__)


@dataclass
class AIServiceConfig:
    """Configuration for the AI service."""

    model: str = "gpt-4-turbo"
    temperature: float = 0.2
    max_tokens: int = 2048
    timeout: int = 30
    enable_security_scan: bool = True
    enable_code_analysis: bool = True
    enable_debugging: bool = True


class EnhancedAIService:
    """Enhanced AI service with advanced code intelligence features."""

    def __init__(self, config: Optional[AIServiceConfig] = None):
        self.config = config or AIServiceConfig()
        self.analyzer = CodeAnalyzer()
        self.security_scanner = SecurityScanner()
        self.debugger = Debugger()
        self.session = aiohttp.ClientSession()

    async def analyze_code(
        self, code: str, language: str, file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Perform comprehensive code analysis."""
        analysis = {
            "complexity": await self.analyzer.calculate_complexity(code, language),
            "quality_metrics": await self.analyzer.analyze_quality(code, language),
            "security_issues": [],
            "suggestions": [],
            "documentation": {},
        }

        if self.config.enable_security_scan:
            analysis["security_issues"] = await self.security_scanner.scan_code(
                code, language, file_path
            )

        if self.config.enable_code_analysis:
            analysis["suggestions"] = await self.analyzer.generate_suggestions(
                code, language, file_path
            )

            analysis["documentation"] = await self.analyzer.generate_documentation(
                code, language
            )

        return analysis

    async def debug_code(
        self,
        code: str,
        language: str,
        breakpoints: Optional[List[int]] = None,
        variables: Optional[Dict[str, Any]] = None,
    ) -> DebugSession:
        """Debug code with breakpoints and variable inspection."""
        if not self.config.enable_debugging:
            raise ValueError("Debugging is not enabled in the configuration")

        return await self.debugger.start_session(
            code=code,
            language=language,
            breakpoints=breakpoints or [],
            variables=variables or {},
        )

    async def generate_code(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        language: Optional[str] = None,
        **kwargs,
    ) -> AIResponse:
        """Generate code using AI with context awareness."""
        system_prompt = self._build_system_prompt(context, language)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        try:
            async with self.session.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.model,
                    "messages": messages,
                    "temperature": self.config.temperature,
                    "max_tokens": self.config.max_tokens,
                    **kwargs,
                },
                timeout=self.config.timeout,
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    raise Exception(f"AI API error: {error}")

                data = await response.json()
                return AIResponse(
                    content=data["choices"][0]["message"]["content"],
                    model=self.config.model,
                    provider="openai",
                )
        except Exception as e:
            logger.error(f"Error generating code: {str(e)}")
            raise

    def _build_system_prompt(
        self, context: Optional[Dict[str, Any]] = None, language: Optional[str] = None
    ) -> str:
        """Build a system prompt with context."""
        prompt = """
        You are an expert AI coding assistant. Your task is to help with programming 
        tasks, including code generation, debugging, and explanation.
        """

        if language:
            prompt += f"\nThe code language is {language}."

        if context:
            if "file_structure" in context:
                prompt += "\n\nProject structure:\n" + "\n".join(
                    context["file_structure"]
                )

            if "related_code" in context:
                prompt += "\n\nRelated code snippets:"
                for snippet in context["related_code"]:
                    prompt += f"\n\n--- {snippet['file']} ---\n{snippet['code']}"

        return prompt.strip()

    async def close(self):
        """Clean up resources."""
        await self.session.close()
        await self.analyzer.close()
        await self.security_scanner.close()
        await self.debugger.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
