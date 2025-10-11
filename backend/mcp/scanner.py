"""
MCP Code Scanner
Multi-language static analysis scanner
"""
import os
import time
from typing import List, Dict, Optional
from pathlib import Path
import logging

from .models import CodeIssue, ScanResult, IssueSeverity, IssueCategory
from .config import MCPConfig
from .analyzers.python_analyzer import PythonAnalyzer
from .analyzers.js_analyzer import JSAnalyzer
from .analyzers.generic_analyzer import GenericAnalyzer

logger = logging.getLogger(__name__)

class CodeScanner:
    """Scans code for issues using multiple analyzers"""
    
    def __init__(self):
        self.analyzers = {
            "python": PythonAnalyzer(),
            "javascript": JSAnalyzer(),
            "typescript": JSAnalyzer(),
            "jsx": JSAnalyzer(),
            "tsx": JSAnalyzer(),
        }
        self.generic_analyzer = GenericAnalyzer()
        
    def scan_project(
        self,
        project_path: str,
        languages: Optional[List[str]] = None,
        analyzers: Optional[List[str]] = None
    ) -> ScanResult:
        """Scan entire project for issues"""
        start_time = time.time()
        
        logger.info(f"Starting scan of project: {project_path}")
        
        # Collect all files
        files_to_scan = self._collect_files(project_path, languages)
        total_files = len(files_to_scan)
        
        logger.info(f"Found {total_files} files to scan")
        
        # Scan each file
        all_issues: List[CodeIssue] = []
        scanned_files = 0
        
        for file_path in files_to_scan:
            try:
                issues = self._scan_file(file_path, analyzers)
                all_issues.extend(issues)
                scanned_files += 1
            except Exception as e:
                logger.error(f"Error scanning {file_path}: {e}")
                
        # Aggregate results
        scan_time = time.time() - start_time
        
        issues_by_severity = self._count_by_severity(all_issues)
        issues_by_category = self._count_by_category(all_issues)
        
        logger.info(f"Scan complete: {len(all_issues)} issues found in {scan_time:.2f}s")
        
        return ScanResult(
            project_path=project_path,
            total_files=total_files,
            scanned_files=scanned_files,
            total_issues=len(all_issues),
            issues_by_severity=issues_by_severity,
            issues_by_category=issues_by_category,
            issues=all_issues,
            scan_time=scan_time
        )
    
    def _collect_files(
        self,
        project_path: str,
        languages: Optional[List[str]] = None
    ) -> List[str]:
        """Collect all files to scan"""
        files = []
        project_root = Path(project_path)
        
        # Directories to skip
        skip_dirs = {
            "node_modules", "__pycache__", ".git", ".venv", "venv",
            "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache"
        }
        
        for root, dirs, filenames in os.walk(project_root):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            
            for filename in filenames:
                file_path = os.path.join(root, filename)
                language = MCPConfig.get_language(file_path)
                
                # Filter by language if specified
                if languages and language not in languages:
                    continue
                    
                if language != "unknown":
                    files.append(file_path)
                    
        return files
    
    def _scan_file(
        self,
        file_path: str,
        analyzers: Optional[List[str]] = None
    ) -> List[CodeIssue]:
        """Scan a single file"""
        language = MCPConfig.get_language(file_path)
        
        # Get appropriate analyzer
        analyzer = self.analyzers.get(language, self.generic_analyzer)
        
        # Run analysis
        issues = analyzer.analyze(file_path, analyzers)
        
        return issues
    
    def _count_by_severity(self, issues: List[CodeIssue]) -> Dict[str, int]:
        """Count issues by severity"""
        counts = {severity.value: 0 for severity in IssueSeverity}
        for issue in issues:
            counts[issue.severity.value] += 1
        return counts
    
    def _count_by_category(self, issues: List[CodeIssue]) -> Dict[str, int]:
        """Count issues by category"""
        counts = {category.value: 0 for category in IssueCategory}
        for issue in issues:
            counts[issue.category.value] += 1
        return counts