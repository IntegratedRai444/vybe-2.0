"""
Generic Code Analyzer
Fallback analyzer for unsupported languages
"""
import re
from typing import List, Optional
import logging

from ..models import CodeIssue, IssueSeverity, IssueCategory

logger = logging.getLogger(__name__)

class GenericAnalyzer:
    """Generic code analyzer for basic checks"""
    
    def analyze(
        self,
        file_path: str,
        analyzers: Optional[List[str]] = None
    ) -> List[CodeIssue]:
        """Analyze file with basic checks"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # Run basic checks
            issues.extend(self._check_long_lines(file_path, lines))
            issues.extend(self._check_todos(file_path, lines))
            issues.extend(self._check_trailing_whitespace(file_path, lines))
            
        except Exception as e:
            logger.error(f"Generic analyzer error on {file_path}: {e}")
            
        return issues
    
    def _check_long_lines(self, file_path: str, lines: List[str]) -> List[CodeIssue]:
        """Check for lines that are too long"""
        issues = []
        max_length = 120
        
        for i, line in enumerate(lines, 1):
            if len(line.rstrip()) > max_length:
                issues.append(CodeIssue(
                    file_path=file_path,
                    line_number=i,
                    severity=IssueSeverity.INFO,
                    category=IssueCategory.STYLE,
                    message=f"Line too long ({len(line.rstrip())} > {max_length} characters)",
                    analyzer="generic"
                ))
                
        return issues
    
    def _check_todos(self, file_path: str, lines: List[str]) -> List[CodeIssue]:
        """Check for TODO/FIXME comments"""
        issues = []
        todo_pattern = re.compile(r'(TODO|FIXME|XXX|HACK)', re.IGNORECASE)
        
        for i, line in enumerate(lines, 1):
            match = todo_pattern.search(line)
            if match:
                issues.append(CodeIssue(
                    file_path=file_path,
                    line_number=i,
                    severity=IssueSeverity.INFO,
                    category=IssueCategory.STYLE,
                    message=f"Found {match.group(1)} comment",
                    analyzer="generic"
                ))
                
        return issues
    
    def _check_trailing_whitespace(self, file_path: str, lines: List[str]) -> List[CodeIssue]:
        """Check for trailing whitespace"""
        issues = []
        
        for i, line in enumerate(lines, 1):
            if line.rstrip() != line.rstrip('\n').rstrip('\r'):
                issues.append(CodeIssue(
                    file_path=file_path,
                    line_number=i,
                    severity=IssueSeverity.INFO,
                    category=IssueCategory.STYLE,
                    message="Trailing whitespace",
                    analyzer="generic"
                ))
                
        return issues