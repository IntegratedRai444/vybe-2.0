"""
MCP Main Service
Orchestrates scanning, fixing, and explaining
"""
import logging
from typing import Optional

from .scanner import CodeScanner
from .llm_fixer import LLMFixer
from .patch_executor import PatchExecutor
from .explainer import IssueExplainer
from .models import (
    ScanRequest, ScanResult,
    FixRequest, FixResult,
    ExplainRequest, ExplainResult
)

logger = logging.getLogger(__name__)

class MCPService:
    """Main MCP service orchestrator"""
    
    def __init__(self, ollama_client=None):
        """Initialize MCP service"""
        self.scanner = CodeScanner()
        self.fixer = LLMFixer(ollama_client)
        self.executor = PatchExecutor()
        self.explainer = IssueExplainer(ollama_client)
        
    def scan_project(self, request: ScanRequest) -> ScanResult:
        """Scan project for issues"""
        logger.info(f"Scanning project: {request.project_path}")
        
        result = self.scanner.scan_project(
            project_path=request.project_path,
            languages=request.languages,
            analyzers=request.analyzers
        )
        
        logger.info(f"Scan complete: {result.total_issues} issues found")
        return result
    
    def fix_issues(self, request: FixRequest) -> FixResult:
        """Fix issues in project"""
        logger.info(f"Fixing issues in: {request.project_path}")
        
        # If no specific issues provided, scan first
        if not request.issues:
            scan_result = self.scanner.scan_project(request.project_path)
            issues = scan_result.issues
        else:
            issues = request.issues
        
        if not issues:
            logger.info("No issues to fix")
            return FixResult(
                total_issues=0,
                fixed_issues=0,
                failed_fixes=0,
                fixes=[],
                applied=False,
                errors=[]
            )
        
        # Generate fixes
        logger.info(f"Generating fixes for {len(issues)} issues...")
        fixes = self.fixer.generate_fixes(issues)
        
        # Apply fixes if requested
        applied = False
        errors = []
        
        if request.auto_apply:
            logger.info(f"Applying {len(fixes)} fixes...")
            try:
                results = self.executor.apply_fixes(
                    fixes,
                    dry_run=request.dry_run,
                    auto_backup=True
                )
                applied = not request.dry_run
                
                if results["failed"]:
                    errors = [f"Failed to apply fix for {f.issue.file_path}:{f.issue.line_number}" 
                             for f in results["failed"]]
                    
            except Exception as e:
                logger.error(f"Failed to apply fixes: {e}")
                errors.append(str(e))
        
        return FixResult(
            total_issues=len(issues),
            fixed_issues=len(fixes),
            failed_fixes=len(issues) - len(fixes),
            fixes=fixes,
            applied=applied,
            errors=errors
        )
    
    def explain_issue(self, request: ExplainRequest) -> ExplainResult:
        """Explain an issue"""
        logger.info(f"Explaining issue: {request.issue.file_path}:{request.issue.line_number}")
        
        result = self.explainer.explain_issue(
            request.issue,
            include_examples=request.include_examples
        )
        
        return result
    
    def get_summary(self, scan_result: ScanResult) -> dict:
        """Get summary of scan results"""
        return {
            "total_files": scan_result.total_files,
            "scanned_files": scan_result.scanned_files,
            "total_issues": scan_result.total_issues,
            "by_severity": scan_result.issues_by_severity,
            "by_category": scan_result.issues_by_category,
            "scan_time": scan_result.scan_time,
            "top_issues": self._get_top_issues(scan_result.issues, limit=10)
        }
    
    def _get_top_issues(self, issues, limit=10):
        """Get top issues by severity"""
        # Sort by severity (error > warning > info > hint)
        severity_order = {"error": 0, "warning": 1, "info": 2, "hint": 3}
        sorted_issues = sorted(
            issues,
            key=lambda i: severity_order.get(i.severity.value, 999)
        )
        
        return [
            {
                "file": issue.file_path,
                "line": issue.line_number,
                "severity": issue.severity.value,
                "category": issue.category.value,
                "message": issue.message
            }
            for issue in sorted_issues[:limit]
        ]