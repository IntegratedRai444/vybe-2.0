"""
LLM-Powered Fix Generator
Uses AI to generate code fixes
"""
import os
import sys
from typing import List, Optional
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .models import CodeIssue, IssueFix
from .config import MCPConfig

logger = logging.getLogger(__name__)

class LLMFixer:
    """Generates code fixes using LLM"""
    
    def __init__(self, ollama_client=None):
        """Initialize with Ollama client"""
        self.ollama_client = ollama_client
        
    def generate_fixes(
        self,
        issues: List[CodeIssue],
        context_lines: int = 5
    ) -> List[IssueFix]:
        """Generate fixes for multiple issues"""
        fixes = []
        
        for issue in issues:
            try:
                fix = self.generate_fix(issue, context_lines)
                if fix:
                    fixes.append(fix)
            except Exception as e:
                logger.error(f"Failed to generate fix for {issue.file_path}:{issue.line_number}: {e}")
                
        return fixes
    
    def generate_fix(
        self,
        issue: CodeIssue,
        context_lines: int = 5
    ) -> Optional[IssueFix]:
        """Generate fix for a single issue"""
        
        # Get code context
        code_context = self._get_code_context(
            issue.file_path,
            issue.line_number,
            context_lines
        )
        
        if not code_context:
            logger.warning(f"Could not get context for {issue.file_path}:{issue.line_number}")
            return None
        
        # Get language
        language = MCPConfig.get_language(issue.file_path)
        
        # Build prompt
        prompt = MCPConfig.FIX_PROMPT_TEMPLATE.format(
            file_path=issue.file_path,
            line_number=issue.line_number,
            issue_description=issue.message,
            severity=issue.severity.value,
            category=issue.category.value,
            language=language,
            code_context=code_context
        )
        
        # Get fix from LLM
        try:
            response = self._call_llm(prompt)
            
            # Parse response
            analysis, fix_code, explanation = self._parse_llm_response(response)
            
            # Calculate confidence based on response quality
            confidence = self._calculate_confidence(response, issue)
            
            return IssueFix(
                issue=issue,
                analysis=analysis,
                fix_code=fix_code,
                explanation=explanation,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"LLM fix generation failed: {e}")
            return None
    
    def _get_code_context(
        self,
        file_path: str,
        line_number: int,
        context_lines: int
    ) -> Optional[str]:
        """Get code context around the issue"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # Calculate range
            start = max(0, line_number - context_lines - 1)
            end = min(len(lines), line_number + context_lines)
            
            # Get context with line numbers
            context = []
            for i in range(start, end):
                marker = ">>>" if i == line_number - 1 else "   "
                context.append(f"{marker} {i+1:4d} | {lines[i].rstrip()}")
                
            return "\n".join(context)
            
        except Exception as e:
            logger.error(f"Failed to get context: {e}")
            return None
    
    def _call_llm(self, prompt: str) -> str:
        """Call LLM for fix generation"""
        if not self.ollama_client:
            # Import here to avoid circular dependency
            from ollama_client import OllamaClient
            self.ollama_client = OllamaClient()
        
        try:
            # Use Ollama for fix generation
            response = self.ollama_client.chat(
                messages=[{"role": "user", "content": prompt}],
                model=None,  # Use default model
                stream=False
            )
            
            return response.get("message", {}).get("content", "")
            
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise
    
    def _parse_llm_response(self, response: str) -> tuple:
        """Parse LLM response into components"""
        analysis = ""
        fix_code = ""
        explanation = ""
        
        # Try to extract structured response
        lines = response.split("\n")
        current_section = None
        
        for line in lines:
            line_upper = line.upper().strip()
            
            if line_upper.startswith("ANALYSIS:"):
                current_section = "analysis"
                analysis = line[len("ANALYSIS:"):].strip()
            elif line_upper.startswith("FIX:"):
                current_section = "fix"
                fix_code = line[len("FIX:"):].strip()
            elif line_upper.startswith("EXPLANATION:"):
                current_section = "explanation"
                explanation = line[len("EXPLANATION:"):].strip()
            elif current_section == "analysis":
                analysis += "\n" + line
            elif current_section == "fix":
                fix_code += "\n" + line
            elif current_section == "explanation":
                explanation += "\n" + line
        
        # Fallback: use entire response if parsing failed
        if not analysis and not fix_code:
            analysis = response
            fix_code = response
            explanation = "AI-generated fix"
        
        return analysis.strip(), fix_code.strip(), explanation.strip()
    
    def _calculate_confidence(self, response: str, issue: CodeIssue) -> float:
        """Calculate confidence score for the fix"""
        confidence = 0.5  # Base confidence
        
        # Increase confidence if response is well-structured
        if "ANALYSIS:" in response and "FIX:" in response:
            confidence += 0.2
        
        # Increase confidence for simple issues
        if issue.severity in [IssueSeverity.INFO, IssueSeverity.WARNING]:
            confidence += 0.1
        
        # Increase confidence if fix contains code
        if "def " in response or "function " in response or "class " in response:
            confidence += 0.1
        
        # Decrease confidence for complex issues
        if issue.category in [IssueCategory.SECURITY, IssueCategory.BUG]:
            confidence -= 0.1
        
        return max(0.0, min(1.0, confidence))