"""
MCP Data Models
"""
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class IssueSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    HINT = "hint"


class IssueCategory(str, Enum):
    SYNTAX = "syntax"
    TYPE = "type"
    SECURITY = "security"
    STYLE = "style"
    PERFORMANCE = "performance"
    BUG = "bug"
    COMPLEXITY = "complexity"
    IMPORT = "import"


class CodeIssue(BaseModel):
    """Represents a single code issue"""

    file_path: str
    line_number: int
    column: Optional[int] = None
    severity: IssueSeverity
    category: IssueCategory
    message: str
    rule_id: Optional[str] = None
    analyzer: str  # Which tool found it
    code_snippet: Optional[str] = None


class IssueFix(BaseModel):
    """Represents a fix for an issue"""

    issue: CodeIssue
    analysis: str
    fix_code: str
    explanation: str
    confidence: float  # 0.0 to 1.0


class ScanRequest(BaseModel):
    """Request to scan a project or file"""

    project_path: str
    file_path: Optional[str] = None  # If specified, scan only this file
    languages: Optional[List[str]] = None
    analyzers: Optional[List[str]] = None
    scan_type: str = "full"  # 'full', 'incremental', or 'on-save'


class ScanResult(BaseModel):
    """Result of a code scan"""

    project_path: str
    file_path: Optional[str] = None
    total_files: int
    scanned_files: int
    total_issues: int
    issues_by_severity: Dict[str, int]
    issues_by_category: Dict[str, int]
    issues: List[CodeIssue]
    scan_time: float
    scan_type: str
    timestamp: float


class FileChangeEvent(BaseModel):
    """Represents a file change event for real-time scanning"""

    event_type: str  # 'created', 'modified', 'deleted', 'moved'
    src_path: str
    dest_path: Optional[str] = None
    timestamp: float


class RealTimeScanConfig(BaseModel):
    """Configuration for real-time scanning"""

    enabled: bool = True
    debounce_ms: int = 500
    include_patterns: List[str] = ["*.py", "*.js", "*.ts", "*.jsx", "*.tsx"]
    exclude_patterns: List[str] = ["**/node_modules/**", "**/__pycache__/**"]
    max_file_size_mb: int = 5


class FixRequest(BaseModel):
    """Request to fix issues"""

    project_path: str
    issues: Optional[List[CodeIssue]] = None  # If None, fix all
    auto_apply: bool = False
    dry_run: bool = True


class FixResult(BaseModel):
    """Result of fix operation"""

    total_issues: int
    fixed_issues: int
    failed_fixes: int
    fixes: List[IssueFix]
    applied: bool
    errors: List[str]


class ExplainRequest(BaseModel):
    """Request to explain an issue"""

    issue: CodeIssue
    include_examples: bool = True


class ExplainResult(BaseModel):
    """Explanation of an issue"""

    issue: CodeIssue
    explanation: str
    examples: Optional[List[str]] = None
    references: Optional[List[str]] = None
