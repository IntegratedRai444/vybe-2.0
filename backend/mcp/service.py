"""
MCP Service
Main service that orchestrates the MCP system components
"""
import asyncio
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from .cache import ScanCache, get_global_cache
from .file_watcher import FileWatcher, get_file_watcher
from .models import (
    ExplainRequest,
    ExplainResult,
    FileChangeEvent,
    FixRequest,
    FixResult,
    RealTimeScanConfig,
    ScanRequest,
    ScanResult,
)
from .scanner import CodeScanner

logger = logging.getLogger(__name__)


class MCPService:
    """
    Main MCP service that coordinates scanning, fixing, and explaining code issues.

    This service acts as the main entry point for all MCP functionality and manages
    the lifecycle of the file watcher and cache.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the MCP service.

        Args:
            config: Optional configuration dictionary
        """
        self.config = self._load_config(config or {})
        self.scanner = CodeScanner()
        self.cache = get_global_cache()
        self.file_watcher: Optional[FileWatcher] = None
        self._is_running = False
        self._scan_tasks: Set[asyncio.Task] = set()

    def _load_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Load and validate configuration"""
        default_config = {
            "real_time_scan": {
                "enabled": True,
                "debounce_ms": 1000,
                "include_patterns": ["*.py", "*.js", "*.ts", "*.jsx", "*.tsx"],
                "exclude_patterns": [
                    "**/node_modules/**",
                    "**/__pycache__/**",
                    "**/.git/**",
                    "**/.venv/**",
                    "**/venv/**",
                    "**/dist/**",
                    "**/build/**",
                    "**/*.min.js",
                    "**/*.bundle.js",
                ],
                "max_file_size_mb": 5,
            },
            "cache": {"enabled": True, "ttl_seconds": 3600},
            "scanner": {"max_workers": min(8, (os.cpu_count() or 4) * 2)},
        }

        # Merge with provided config
        return self._deep_merge(default_config, config)

    def _deep_merge(self, base: Dict, update: Dict) -> Dict:
        """Deep merge two dictionaries"""
        result = base.copy()
        for key, value in update.items():
            if (
                key in result
                and isinstance(result[key], dict)
                and isinstance(value, dict)
            ):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    async def start(self):
        """Start the MCP service"""
        if self._is_running:
            return

        logger.info("Starting MCP service...")

        # Initialize file watcher if real-time scanning is enabled
        if self.config["real_time_scan"]["enabled"]:
            rt_config = RealTimeScanConfig(
                enabled=True,
                debounce_ms=self.config["real_time_scan"]["debounce_ms"],
                include_patterns=self.config["real_time_scan"]["include_patterns"],
                exclude_patterns=self.config["real_time_scan"]["exclude_patterns"],
            )

            self.file_watcher = await get_file_watcher(self.scanner, rt_config)
            await self.file_watcher.start()

        self._is_running = True
        logger.info("MCP service started")

    async def stop(self):
        """Stop the MCP service"""
        if not self._is_running:
            return

        logger.info("Stopping MCP service...")

        # Cancel any pending scan tasks
        for task in self._scan_tasks:
            if not task.done():
                task.cancel()

        # Stop the file watcher
        if self.file_watcher:
            await self.file_watcher.stop()

        # Wait for pending tasks to complete
        if self._scan_tasks:
            await asyncio.wait(
                self._scan_tasks, timeout=5.0, return_when=asyncio.ALL_COMPLETED
            )

        self._is_running = False
        logger.info("MCP service stopped")

    async def scan_project(self, request: ScanRequest) -> ScanResult:
        """
        Scan a project or file for issues.

        Args:
            request: Scan request parameters

        Returns:
            ScanResult containing found issues
        """
        # Check cache first if this is a file scan
        if request.file_path and self.config["cache"]["enabled"]:
            cached_issues = self.cache.get_issues_for_file(request.file_path)
            if cached_issues is not None:
                logger.debug(f"Using cached issues for {request.file_path}")
                return self._create_scan_result(
                    request, files_scanned=1, issues=cached_issues
                )

        # Perform the scan
        result = await self.scanner.scan_project(request)

        # Cache the results
        if request.file_path and self.config["cache"]["enabled"]:
            self.cache.cache_issues_for_file(request.file_path, result.issues)

        return result

    async def fix_issues(self, request: FixRequest) -> FixResult:
        """
        Fix issues in the code.

        Args:
            request: Fix request parameters

        Returns:
            FixResult containing fix information
        """
        # If no specific issues provided, scan first
        if not request.issues:
            scan_request = ScanRequest(
                project_path=request.project_path,
                file_path=request.file_path,
                scan_type="incremental",
            )
            scan_result = await self.scan_project(scan_request)
            request.issues = scan_result.issues

        # Generate fixes (implementation depends on the scanner)
        fixes = await self.scanner.fix_issues(request)

        # Invalidate cache for fixed files
        if self.config["cache"]["enabled"] and fixes.fixes:
            fixed_files = {fix.issue.file_path for fix in fixes.fixes}
            for file_path in fixed_files:
                self.cache.invalidate_file(file_path)

        return fixes

    async def explain_issue(self, request: ExplainRequest) -> ExplainResult:
        """
        Explain an issue in detail.

        Args:
            request: Explanation request

        Returns:
            Detailed explanation of the issue
        """
        # Implementation depends on the scanner
        return await self.scanner.explain_issue(request)

    def _create_scan_result(
        self,
        request: ScanRequest,
        files_scanned: int,
        issues: List[CodeIssue],
        scan_time: float = 0.0,
    ) -> ScanResult:
        """Helper to create a ScanResult from scan data"""
        return ScanResult(
            project_path=request.project_path,
            file_path=request.file_path,
            total_files=files_scanned,
            scanned_files=files_scanned,
            total_issues=len(issues),
            issues_by_severity=self._count_by_severity(issues),
            issues_by_category=self._count_by_category(issues),
            issues=issues,
            scan_time=scan_time,
            scan_type=request.scan_type,
            timestamp=time.time(),
        )

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

    async def handle_file_change(self, event: FileChangeEvent):
        """
        Handle a file change event from the file watcher.

        Args:
            event: File change event
        """
        if not self._is_running or not self.config["real_time_scan"]["enabled"]:
            return

        # Skip directories and non-source files
        if event.is_directory or not any(
            fnmatch.fnmatch(event.src_path, p)
            for p in self.config["real_time_scan"]["include_patterns"]
        ):
            return

        # Create a scan task
        task = asyncio.create_task(self._process_file_change(event))
        self._scan_tasks.add(task)
        task.add_done_callback(self._scan_task_done)

    async def _process_file_change(self, event: FileChangeEvent):
        """Process a file change event"""
        if event.event_type == "deleted":
            # Handle file deletion
            self.cache.invalidate_file(event.src_path)
            logger.info(f"File deleted: {event.src_path}")
            return

        # Skip if file doesn't exist or is too large
        if not os.path.isfile(event.src_path):
            return

        max_size = self.config["real_time_scan"]["max_file_size_mb"] * 1024 * 1024
        if os.path.getsize(event.src_path) > max_size:
            logger.debug(f"Skipping large file: {event.src_path}")
            return

        # Perform the scan
        try:
            request = ScanRequest(
                project_path=os.path.dirname(event.src_path),
                file_path=event.src_path,
                scan_type="on-save",
            )

            result = await self.scan_project(request)

            # Notify listeners (e.g., WebSocket clients, UI updates)
            await self._notify_scan_complete(result)

        except Exception as e:
            logger.error(f"Error processing file change {event.src_path}: {e}")

    async def _notify_scan_complete(self, result: ScanResult):
        """Notify listeners about a completed scan"""
        # TODO: Implement notification system (e.g., WebSocket)
        pass

    def _scan_task_done(self, task: asyncio.Task):
        """Callback when a scan task is done"""
        self._scan_tasks.discard(task)

        # Handle any exceptions
        try:
            task.result()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in scan task: {e}")


# Global service instance
_global_service: Optional[MCPService] = None


async def get_mcp_service(config: Optional[Dict[str, Any]] = None) -> MCPService:
    """Get or create the global MCP service instance"""
    global _global_service
    if _global_service is None:
        _global_service = MCPService(config or {})
        await _global_service.start()
    return _global_service
