"""
JavaScript/TypeScript Code Analyzer
Uses ESLint
"""
import subprocess
import json
import os
from typing import List, Optional
import logging

from ..models import CodeIssue, IssueSeverity, IssueCategory
from ..config import MCPConfig

logger = logging.getLogger(__name__)

class JSAnalyzer:
    """Analyzes JavaScript/TypeScript code for issues"""
    
    def analyze(
        self,
        file_path: str,
        analyzers: Optional[List[str]] = None
    ) -> List[CodeIssue]:
        """Analyze JS/TS file"""
        issues = []
        
        # Run ESLint
        issues.extend(self._run_eslint(file_path))
        
        return issues
    
    def _run_eslint(self, file_path: str) -> List[CodeIssue]:
        """Run ESLint"""
        issues = []
        
        try:
            # Try to find local eslint first
            eslint_cmd = self._find_eslint()
            
            if not eslint_cmd:
                logger.warning("ESLint not found")
                return issues
            
            # Run eslint with JSON output
            result = subprocess.run(
                [eslint_cmd, "--format=json", file_path],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.path.dirname(file_path)
            )
            
            # Parse output
            if result.stdout:
                data = json.loads(result.stdout)
                for file_result in data:
                    for message in file_result.get("messages", []):
                        issues.append(self._parse_eslint_issue(file_path, message))
                        
        except subprocess.TimeoutExpired:
            logger.error(f"ESLint timeout on {file_path}")
        except FileNotFoundError:
            logger.warning("ESLint not installed")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ESLint output: {e}")
        except Exception as e:
            logger.error(f"ESLint error: {e}")
            
        return issues
    
    def _find_eslint(self) -> Optional[str]:
        """Find ESLint executable"""
        # Try npx first
        try:
            subprocess.run(["npx", "--version"], capture_output=True, timeout=5)
            return "npx"
        except:
            pass
        
        # Try global eslint
        try:
            subprocess.run(["eslint", "--version"], capture_output=True, timeout=5)
            return "eslint"
        except:
            pass
            
        return None
    
    def _parse_eslint_issue(self, file_path: str, data: dict) -> CodeIssue:
        """Parse ESLint message"""
        severity_map = {
            2: IssueSeverity.ERROR,
            1: IssueSeverity.WARNING,
            0: IssueSeverity.INFO
        }
        
        severity = severity_map.get(data.get("severity", 1), IssueSeverity.WARNING)
        category = self._map_eslint_category(data.get("ruleId", ""))
        
        return CodeIssue(
            file_path=file_path,
            line_number=data.get("line", 0),
            column=data.get("column"),
            severity=severity,
            category=category,
            message=data.get("message", ""),
            rule_id=data.get("ruleId"),
            analyzer="eslint"
        )
    
    def _map_eslint_category(self, rule_id: str) -> IssueCategory:
        """Map ESLint rule to category"""
        if not rule_id:
            return IssueCategory.STYLE
            
        rule_lower = rule_id.lower()
        
        if "security" in rule_lower or "no-eval" in rule_lower:
            return IssueCategory.SECURITY
        elif "complexity" in rule_lower:
            return IssueCategory.COMPLEXITY
        elif "import" in rule_lower:
            return IssueCategory.IMPORT
        elif "no-unused" in rule_lower or "no-undef" in rule_lower:
            return IssueCategory.BUG
        else:
            return IssueCategory.STYLE