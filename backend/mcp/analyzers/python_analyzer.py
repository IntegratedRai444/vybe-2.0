"""
Python Code Analyzer
Uses Flake8, Mypy, and Bandit
"""
import subprocess
import json
import os
from typing import List, Optional
import logging

from ..models import CodeIssue, IssueSeverity, IssueCategory
from ..config import MCPConfig

logger = logging.getLogger(__name__)

class PythonAnalyzer:
    """Analyzes Python code for issues"""
    
    def analyze(
        self,
        file_path: str,
        analyzers: Optional[List[str]] = None
    ) -> List[CodeIssue]:
        """Analyze Python file"""
        issues = []
        
        # Default to all Python analyzers
        if analyzers is None:
            analyzers = MCPConfig.get_analyzers("python")
        
        # Run each analyzer
        if "flake8" in analyzers:
            issues.extend(self._run_flake8(file_path))
            
        if "mypy" in analyzers:
            issues.extend(self._run_mypy(file_path))
            
        if "bandit" in analyzers:
            issues.extend(self._run_bandit(file_path))
            
        return issues
    
    def _run_flake8(self, file_path: str) -> List[CodeIssue]:
        """Run Flake8 linter"""
        issues = []
        
        try:
            # Run flake8 with JSON output
            result = subprocess.run(
                ["flake8", "--format=json", file_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Parse output
            if result.stdout:
                try:
                    data = json.loads(result.stdout)
                    for file_issues in data.values():
                        for issue_data in file_issues:
                            issues.append(self._parse_flake8_issue(file_path, issue_data))
                except json.JSONDecodeError:
                    # Fallback to text parsing
                    issues.extend(self._parse_flake8_text(file_path, result.stdout))
                    
        except subprocess.TimeoutExpired:
            logger.error(f"Flake8 timeout on {file_path}")
        except FileNotFoundError:
            logger.warning("Flake8 not installed")
        except Exception as e:
            logger.error(f"Flake8 error: {e}")
            
        return issues
    
    def _parse_flake8_issue(self, file_path: str, data: dict) -> CodeIssue:
        """Parse Flake8 JSON issue"""
        severity = self._map_flake8_severity(data.get("code", ""))
        category = self._map_flake8_category(data.get("code", ""))
        
        return CodeIssue(
            file_path=file_path,
            line_number=data.get("line_number", 0),
            column=data.get("column_number"),
            severity=severity,
            category=category,
            message=data.get("text", ""),
            rule_id=data.get("code"),
            analyzer="flake8"
        )
    
    def _parse_flake8_text(self, file_path: str, output: str) -> List[CodeIssue]:
        """Parse Flake8 text output"""
        issues = []
        for line in output.strip().split("\n"):
            if not line:
                continue
            try:
                # Format: file:line:col: code message
                parts = line.split(":", 3)
                if len(parts) >= 4:
                    line_num = int(parts[1])
                    col = int(parts[2])
                    rest = parts[3].strip()
                    code = rest.split()[0]
                    message = rest[len(code):].strip()
                    
                    issues.append(CodeIssue(
                        file_path=file_path,
                        line_number=line_num,
                        column=col,
                        severity=self._map_flake8_severity(code),
                        category=self._map_flake8_category(code),
                        message=message,
                        rule_id=code,
                        analyzer="flake8"
                    ))
            except Exception as e:
                logger.debug(f"Failed to parse flake8 line: {line}")
                
        return issues
    
    def _run_mypy(self, file_path: str) -> List[CodeIssue]:
        """Run Mypy type checker"""
        issues = []
        
        try:
            result = subprocess.run(
                ["mypy", "--show-column-numbers", "--no-error-summary", file_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Parse output
            for line in result.stdout.strip().split("\n"):
                if not line or "Success" in line:
                    continue
                    
                issue = self._parse_mypy_line(file_path, line)
                if issue:
                    issues.append(issue)
                    
        except subprocess.TimeoutExpired:
            logger.error(f"Mypy timeout on {file_path}")
        except FileNotFoundError:
            logger.warning("Mypy not installed")
        except Exception as e:
            logger.error(f"Mypy error: {e}")
            
        return issues
    
    def _parse_mypy_line(self, file_path: str, line: str) -> Optional[CodeIssue]:
        """Parse Mypy output line"""
        try:
            # Format: file:line:col: severity: message
            parts = line.split(":", 4)
            if len(parts) >= 4:
                line_num = int(parts[1])
                col = int(parts[2]) if parts[2].strip().isdigit() else None
                severity_str = parts[3].strip()
                message = parts[4].strip() if len(parts) > 4 else ""
                
                severity = IssueSeverity.ERROR if "error" in severity_str.lower() else IssueSeverity.WARNING
                
                return CodeIssue(
                    file_path=file_path,
                    line_number=line_num,
                    column=col,
                    severity=severity,
                    category=IssueCategory.TYPE,
                    message=message,
                    analyzer="mypy"
                )
        except Exception as e:
            logger.debug(f"Failed to parse mypy line: {line}")
            
        return None
    
    def _run_bandit(self, file_path: str) -> List[CodeIssue]:
        """Run Bandit security scanner"""
        issues = []
        
        try:
            result = subprocess.run(
                ["bandit", "-f", "json", file_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Parse JSON output
            if result.stdout:
                data = json.loads(result.stdout)
                for result_item in data.get("results", []):
                    issues.append(self._parse_bandit_issue(file_path, result_item))
                    
        except subprocess.TimeoutExpired:
            logger.error(f"Bandit timeout on {file_path}")
        except FileNotFoundError:
            logger.warning("Bandit not installed")
        except Exception as e:
            logger.error(f"Bandit error: {e}")
            
        return issues
    
    def _parse_bandit_issue(self, file_path: str, data: dict) -> CodeIssue:
        """Parse Bandit JSON issue"""
        severity_map = {
            "HIGH": IssueSeverity.ERROR,
            "MEDIUM": IssueSeverity.WARNING,
            "LOW": IssueSeverity.INFO
        }
        
        severity = severity_map.get(data.get("issue_severity", "MEDIUM"), IssueSeverity.WARNING)
        
        return CodeIssue(
            file_path=file_path,
            line_number=data.get("line_number", 0),
            column=None,
            severity=severity,
            category=IssueCategory.SECURITY,
            message=data.get("issue_text", ""),
            rule_id=data.get("test_id"),
            analyzer="bandit",
            code_snippet=data.get("code")
        )
    
    def _map_flake8_severity(self, code: str) -> IssueSeverity:
        """Map Flake8 code to severity"""
        if code.startswith("E"):
            return IssueSeverity.ERROR
        elif code.startswith("W"):
            return IssueSeverity.WARNING
        else:
            return IssueSeverity.INFO
    
    def _map_flake8_category(self, code: str) -> IssueCategory:
        """Map Flake8 code to category"""
        if code.startswith("E9") or code.startswith("F"):
            return IssueCategory.SYNTAX
        elif code.startswith("E") or code.startswith("W"):
            return IssueCategory.STYLE
        elif code.startswith("C"):
            return IssueCategory.COMPLEXITY
        else:
            return IssueCategory.STYLE