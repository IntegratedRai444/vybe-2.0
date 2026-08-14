# backend/file_watcher.py
"""
File system watcher for real-time file change notifications
"""

import asyncio
import logging
import os
import threading
import time
from pathlib import Path
from typing import Callable, Dict, Optional, Set

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

logger = logging.getLogger(__name__)


class FileChangeHandler(FileSystemEventHandler):
    """Handles file system events"""

    def __init__(self, callback: Callable[[str, str, str], None]):
        self.callback = callback
        self.ignored_patterns = {
            ".git",
            "__pycache__",
            "node_modules",
            ".vscode",
            ".idea",
            "dist",
            "build",
            ".next",
            ".nuxt",
            "coverage",
        }
        self.ignored_extensions = {
            ".pyc",
            ".pyo",
            ".pyd",
            ".so",
            ".dll",
            ".dylib",
            ".log",
            ".tmp",
            ".temp",
            ".swp",
            ".swo",
        }

    def should_ignore(self, path: str) -> bool:
        """Check if path should be ignored"""
        path_obj = Path(path)

        # Check if any part of the path contains ignored patterns
        for part in path_obj.parts:
            if any(pattern in part for pattern in self.ignored_patterns):
                return True

        # Check file extension
        if path_obj.suffix in self.ignored_extensions:
            return True

        # Check if it's a hidden file
        if path_obj.name.startswith(".") and path_obj.name not in [
            ".env",
            ".gitignore",
        ]:
            return True

        return False

    def on_modified(self, event: FileSystemEvent):
        if not event.is_directory and not self.should_ignore(event.src_path):
            self.callback(event.src_path, "modified", "file")

    def on_created(self, event: FileSystemEvent):
        if not self.should_ignore(event.src_path):
            event_type = "directory" if event.is_directory else "file"
            self.callback(event.src_path, "created", event_type)

    def on_deleted(self, event: FileSystemEvent):
        if not self.should_ignore(event.src_path):
            event_type = "directory" if event.is_directory else "file"
            self.callback(event.src_path, "deleted", event_type)

    def on_moved(self, event: FileSystemEvent):
        if hasattr(event, "dest_path") and not self.should_ignore(event.src_path):
            event_type = "directory" if event.is_directory else "file"
            self.callback(event.src_path, "moved", event_type, event.dest_path)


class FileWatcher:
    """Watches file system changes and notifies clients"""

    def __init__(self):
        self.observers: Dict[str, Observer] = {}
        self.clients: Set[Callable] = set()
        self.watched_paths: Set[str] = set()
        self.lock = threading.Lock()

    def add_client(self, callback: Callable):
        """Add a client to receive file change notifications"""
        with self.lock:
            self.clients.add(callback)

    def remove_client(self, callback: Callable):
        """Remove a client"""
        with self.lock:
            self.clients.discard(callback)

    def watch_path(self, path: str) -> bool:
        """Start watching a path"""
        try:
            path = os.path.abspath(path)

            if not os.path.exists(path):
                logger.warning(f"Path does not exist: {path}")
                return False

            if path in self.watched_paths:
                logger.info(f"Path already being watched: {path}")
                return True

            # Create event handler
            handler = FileChangeHandler(self._on_file_change)

            # Create and start observer
            observer = Observer()
            observer.schedule(handler, path, recursive=True)
            observer.start()

            # Store observer
            with self.lock:
                self.observers[path] = observer
                self.watched_paths.add(path)

            logger.info(f"Started watching: {path}")
            return True

        except Exception as e:
            logger.error(f"Failed to watch path {path}: {e}")
            return False

    def unwatch_path(self, path: str) -> bool:
        """Stop watching a path"""
        try:
            path = os.path.abspath(path)

            with self.lock:
                if path not in self.observers:
                    return False

                observer = self.observers[path]
                observer.stop()
                observer.join(timeout=5)

                del self.observers[path]
                self.watched_paths.discard(path)

            logger.info(f"Stopped watching: {path}")
            return True

        except Exception as e:
            logger.error(f"Failed to unwatch path {path}: {e}")
            return False

    def get_watched_paths(self) -> Set[str]:
        """Get all currently watched paths"""
        with self.lock:
            return self.watched_paths.copy()

    def stop_all(self):
        """Stop all watchers"""
        with self.lock:
            for path, observer in self.observers.items():
                try:
                    observer.stop()
                    observer.join(timeout=5)
                except Exception as e:
                    logger.error(f"Error stopping observer for {path}: {e}")

            self.observers.clear()
            self.watched_paths.clear()
            self.clients.clear()

    def _on_file_change(
        self,
        file_path: str,
        change_type: str,
        file_type: str,
        dest_path: Optional[str] = None,
    ):
        """Handle file change events"""
        try:
            # Normalize path
            file_path = os.path.normpath(file_path)

            # Create event data
            event_data = {
                "path": file_path,
                "type": change_type,
                "file_type": file_type,
                "timestamp": time.time(),
            }

            if dest_path:
                event_data["dest_path"] = os.path.normpath(dest_path)

            # Notify all clients
            with self.lock:
                clients_to_remove = set()
                for client in self.clients:
                    try:
                        client(event_data)
                    except Exception as e:
                        logger.error(f"Error notifying client: {e}")
                        clients_to_remove.add(client)

                # Remove failed clients
                for client in clients_to_remove:
                    self.clients.discard(client)

            logger.debug(f"File change: {change_type} {file_type} {file_path}")

        except Exception as e:
            logger.error(f"Error handling file change: {e}")


# Global file watcher instance
file_watcher = FileWatcher()


# WebSocket connections for real-time updates
class FileWatcherWebSocket:
    """WebSocket handler for file watcher events"""

    def __init__(self):
        self.connections: Set = set()

    async def add_connection(self, websocket):
        """Add a WebSocket connection"""
        self.connections.add(websocket)

        # Add as file watcher client
        file_watcher.add_client(self._send_to_websocket)

    async def remove_connection(self, websocket):
        """Remove a WebSocket connection"""
        self.connections.discard(websocket)

        # If no more connections, remove from file watcher
        if not self.connections:
            file_watcher.remove_client(self._send_to_websocket)

    def _send_to_websocket(self, event_data: Dict):
        """Send event to all WebSocket connections"""
        if not self.connections:
            return

        import json

        message = json.dumps(event_data)

        # Send to all connections (in a real implementation, you'd use asyncio)
        connections_to_remove = set()
        for ws in self.connections:
            try:
                # This would need to be async in a real implementation
                # ws.send(message)
                pass
            except Exception as e:
                logger.error(f"Error sending to WebSocket: {e}")
                connections_to_remove.add(ws)

        # Remove failed connections
        for ws in connections_to_remove:
            self.connections.discard(ws)


# Global WebSocket handler
file_watcher_ws = FileWatcherWebSocket()
