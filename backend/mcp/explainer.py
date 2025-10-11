"""
Issue Explainer
Provides detailed explanations of code issues
"""
import logging
from typing import Optional, List

from .models import CodeIssue, ExplainResult
from .config import MCPConfig

logger = logging.getLogger(__name__)

class IssueExplainer:
    """Explains code issues using LLM"""
    
    def __init__(self, ollama_client=None):
        """Initialize with Ollama client"""
        self.ollama_client = ollama_client
        
    def explain_issue(
        self,
        issue: CodeIssue,
        include_examples: bool = True
    ) -> ExplainResult:
        """Explain a code issue"""
        
        # Build explanation prompt
        prompt = self._build_explanation_prompt(issue, include_examples)
        
        # Get explanation from LLM
        try:
            explanation = self._call_llm(prompt)
            
            # Parse examples if requested
            examples = []
            references = []
            
            if include_examples:
                examples, references = self._extract_examples_and_refs(explanation)
            
            return ExplainResult(
                issue=issue,
                explanation=explanation,
                examples=examples if examples else None,
                references=references if references else None
            )
            
        except Exception as e:
            logger.error(f"Failed to explain issue: {e}")
            # Return basic explanation
            return ExplainResult(
                issue=issue,
                explanation=f"Issue: {issue.message}\nCategory: {issue.category.value}\nSeverity: {issue.severity.value}",
                examples=None,
                references=None
            )
    
    def _build_explanation_prompt(self, issue: CodeIssue, include_examples: bool) -> str:
        """Build prompt for explanation"""
        prompt = f"""Explain this code issue in detail:

File: {issue.file_path}
Line: {issue.line_number}
Severity: {issue.severity.value}
Category: {issue.category.value}
Message: {issue.message}
Rule: {issue.rule_id or 'N/A'}
Analyzer: {issue.analyzer}

Provide:
1. What this issue means
2. Why it's a problem
3. How to fix it
4. Best practices to avoid it
"""
        
        if include_examples:
            prompt += "\n5. Code examples (good vs bad)"
        
        return prompt
    
    def _call_llm(self, prompt: str) -> str:
        """Call LLM for explanation"""
        if not self.ollama_client:
            from ollama_client import OllamaClient
            self.ollama_client = OllamaClient()
        
        try:
            response = self.ollama_client.chat(
                messages=[{"role": "user", "content": prompt}],
                model=None,
                stream=False
            )
            
            return response.get("message", {}).get("content", "")
            
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise
    
    def _extract_examples_and_refs(self, explanation: str) -> tuple:
        """Extract code examples and references from explanation"""
        examples = []
        references = []
        
        # Extract code blocks
        if "```" in explanation:
            parts = explanation.split("```")
            for i, part in enumerate(parts):
                if i % 2 == 1:  # Odd indices are code blocks
                    # Remove language identifier
                    lines = part.strip().split("\n")
                    if lines[0].strip() in ["python", "javascript", "typescript", "js", "ts"]:
                        code = "\n".join(lines[1:])
                    else:
                        code = part.strip()
                    examples.append(code)
        
        # Extract references (URLs)
        import re
        url_pattern = re.compile(r'https?://[^\s]+')
        references = url_pattern.findall(explanation)
        
        return examples, references