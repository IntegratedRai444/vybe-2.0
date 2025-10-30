"""
MCP File Watcher Service
Handles real-time file system monitoring for the MCP system.
"""
import os
import time
import asyncio
import fnmatch
from pathlib import Path
from typing import Dict, List, Optional, Set, Callable, Awaitable
from dataclasses import dataclass
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from .models import FileChangeEvent, RealTimeScanConfig, ScanRequest
from .scanner import CodeScanner

logger = logging.getLogger(__name__)

@dataclass
class FileChangeHandler(FileSystemEventHandler):
    """Handles file system change events"""
    callback: Callable[[FileChangeEvent], Awaitable[None]]
    include_patterns: List[str] = None
    exclude_patterns: List[str] = None
    
    def __post_init__(self):
        self.include_patterns = self.include_patterns or ["*.py", "*.js", "*.ts", "*.jsx", "*.tsx"]
        self.exclude_patterns = self.exclude_patterns or [
            "**/node_modules/**", 
            "**/__pycache__/**",
            "**/.git/**",
            "**/.venv/**",
            "**/venv/**",
            "**/dist/**",
            "**/build/**"
        ]
    
    def _should_handle(self, path: str) -> bool:
        """Check if the file should be handled based on patterns"""
        # Skip directories
        if os.path.isdir(path):
            return False
            
        # Check include patterns
        if not any(fnmatch.fnmatch(path, p) for p in self.include_patterns):
            return False
            
        # Check exclude patterns
        if any(fnmatch.fnmatch(path, p) for p in self.exclude_patterns):
            return False
            
        return True
    
    def _create_event(self, event_type: str, src_path: str, is_directory: bool = False) -> FileChangeEvent:
        """Create a FileChangeEvent from a watchdog event"""
        return FileChangeEvent(
            event_type=event_type,
            src_path=src_path,
            is_directory=is_directory,
            timestamp=time.time()
        )
    
    def on_created(self, event: FileSystemEvent):
        if self._should_handle(event.src_path):
            change_event = self._create_event("created", event.src_path, event.is_directory)
            asyncio.create_task(self.callback(change_event))
    
    def on_modified(self, event: FileSystemEvent):
        if self._should_handle(event.src_path) and not event.is_directory:
            change_event = self._create_event("modified", event.src_path, event.is_directory)
            asyncio.create_task(self.callback(change_event))
    
    def on_deleted(self, event: FileSystemEvent):
        if self._should_handle(event.src_path):
            change_event = self._create_event("deleted", event.src_path, event.is_directory)
            asyncio.create_task(self.callback(change_event))
    
    def on_moved(self, event: FileSystemEvent):
        if self._should_handle(event.src_path) or (event.dest_path and self._should_handle(event.dest_path)):
            change_event = self._create_event("moved", event.src_path, event.is_directory)
            change_event.dest_path = event.dest_path
            asyncio.create_task(self.callback(change_event))

class FileWatcher:
    """Watches file system for changes and triggers scans"""
    
    def __init__(self, scanner: CodeScanner, config: Optional[RealTimeScanConfig] = None):
        self.scanner = scanner
        self.config = config or RealTimeScanConfig()
        self.observer = Observer()
        self.watched_paths: Dict[str, FileChangeHandler] = {}
        self._is_running = False
        self._scan_queue: asyncio.Queue = asyncio.Queue()
        self._processing_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start the file watcher and processing loop"""
        if self._is_running:
            return
            
        self._is_running = True
        self._processing_task = asyncio.create_task(self._process_scan_queue())
        self.observer.start()
        logger.info("File watcher started")
    
    async def stop(self):
        """Stop the file watcher and clean up"""
        if not self._is_running:
            return
            
        self._is_running = False
        self.observer.stop()
        self.observer.join()
        
        if self._processing_task:
            self._processing_task.cancel()
            try:
                await self._processing_task
            except asyncio.CancelledError:
                pass
                
        logger.info("File watcher stopped")
    
    def watch_path(self, path: str):
        """Start watching a directory for changes"""
        if not os.path.isdir(path):
            logger.warning(f"Cannot watch non-directory path: {path}")
            return
            
        if path in self.watched_paths:
            logger.debug(f"Already watching path: {path}")
            return
            
        handler = FileChangeHandler(
            callback=self._handle_file_change,
            include_patterns=self.config.include_patterns,
            exclude_patterns=self.config.exclude_patterns
        )
        
        self.observer.schedule(handler, path, recursive=True)
        self.watched_paths[path] = handler
        logger.info(f"Started watching path: {path}")
    
    def unwatch_path(self, path: str):
        """Stop watching a directory"""
        if path not in self.watched_paths:
            return
            
        # This is a bit tricky with watchdog's API
        for observer in self.observer.emitters:
            if observer.watch.path == path:
                self.observer.unschedule(observer)
                break
                
        del self.watched_paths[path]
        logger.info(f"Stopped watching path: {path}")
    
    async def _handle_file_change(self, event: FileChangeEvent):
        """Handle file change events"""
        if not self._should_process_event(event):
            return
            
        logger.debug(f"File change detected: {event.event_type} {event.src_path}")
        await self._scan_queue.put(event)
    
    def _should_process_event(self, event: FileChangeEvent) -> bool:
        """Determine if an event should be processed"""
        # Skip directories
        if event.is_directory:
            return False
            
        # Skip temporary files
        if event.src_path.endswith('~') or (event.src_path.startswith('.') and '~' in event.src_path):
            return False
            
        # Skip files that don't match include patterns
        if not any(fnmatch.fnmatch(event.src_path, p) for p in self.config.include_patterns):
            return False
            
        # Skip files that match exclude patterns
        if any(fnmatch.fnmatch(event.src_path, p) for p in self.config.exclude_patterns):
            return False
            
        return True
    
    async def _process_scan_queue(self):
        """Process file change events from the queue"""
        pending_scan = None
        last_scan_time = 0
        
        while self._is_running:
            try:
                # Get the next event with a timeout
                try:
                    event = await asyncio.wait_for(self._scan_queue.get(), timeout=0.1)
                except asyncio.TimeoutError:
                    event = None
                
                # If we have an event, update pending scan
                if event:
                    pending_scan = event
                    
                # Process pending scan if we have one and debounce time has passed
                current_time = time.time()
                if pending_scan and (current_time - last_scan_time) >= (self.config.debounce_ms / 1000):
                    try:
                        await self._process_file_change(pending_scan)
                        last_scan_time = current_time
                        pending_scan = None
                    except Exception as e:
                        logger.error(f"Error processing file change: {e}", exc_info=True)
                
                # Small sleep to prevent busy waiting
                await asyncio.sleep(0.01)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scan queue processing: {e}", exc_info=True)
                await asyncio.sleep(1)  # Prevent tight loop on errors
    
    async def _process_file_change(self, event: FileChangeEvent):
        """Process a file change event"""
        if event.event_type == "deleted":
            # Handle file deletion
            await self._handle_file_deletion(event.src_path)
        elif os.path.isfile(event.src_path):
            # Handle file modification or creation
            scan_request = ScanRequest(
                project_path=os.path.dirname(event.src_path),
                file_path=event.src_path,
                scan_type="on-save"
            )
            
            try:
                await self.scanner.scan_project(scan_request)
            except Exception as e:
                logger.error(f"Error scanning {event.src_path}: {e}")
    
    async def _handle_file_deletion(self, file_path: str):
        """Handle file deletion"""
        # Remove any cached issues for this file
        if hasattr(self.scanner, '_issue_cache'):
            self.scanner._issue_cache.pop(file_path, None)
            
        logger.info(f"File deleted: {file_path}")

# Singleton instance
file_watcher: Optional[FileWatcher] = None

async def get_file_watcher(scanner: Optional[CodeScanner] = None, 
                         config: Optional[RealTimeScanConfig] = None) -> FileWatcher:
    """Get or create the global file watcher instance"""
    global file_watcher
    
    if file_watcher is None:
        if scanner is None:
            raise ValueError("Scanner is required for first-time file watcher creation")
        file_watcher = FileWatcher(scanner, config or RealTimeScanConfig())
        
    return file_watcher
