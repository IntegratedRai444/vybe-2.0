"""
MCP Caching Layer
Handles caching of scan results and file metadata
"""
import hashlib
import json
import logging
import os
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from .models import CodeIssue, FileChangeEvent, ScanResult

logger = logging.getLogger(__name__)


class ScanCache:
    """
    Caching layer for scan results and file metadata.

    Features:
    - In-memory caching with periodic persistence
    - File change detection
    - Cache invalidation
    - TTL-based expiration
    """

    def __init__(self, cache_dir: Optional[str] = None, ttl_seconds: int = 3600):
        """
        Initialize the cache.

        Args:
            cache_dir: Directory to store cache files. If None, uses system temp dir.
            ttl_seconds: Time-to-live for cache entries in seconds.
        """
        self.cache_dir = cache_dir or os.path.join(
            os.path.expanduser("~"), ".vybe", "cache", "mcp"
        )
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, Dict] = {}
        self._file_hashes: Dict[str, str] = {}
        self._last_cleanup = 0
        self._dirty = False

        # Ensure cache directory exists
        os.makedirs(self.cache_dir, exist_ok=True)

        # Load existing cache
        self._load_cache()

    def _get_cache_file(self, key: str) -> str:
        """Get the cache file path for a key"""
        # Create a filesystem-safe key
        safe_key = hashlib.md5(key.encode("utf-8")).hexdigest()
        return os.path.join(self.cache_dir, f"{safe_key}.json")

    def _load_cache(self):
        """Load cache from disk"""
        try:
            for cache_file in Path(self.cache_dir).glob("*.json"):
                try:
                    with open(cache_file, "r") as f:
                        data = json.load(f)
                        if self._is_cache_entry_valid(data):
                            self._cache[data["key"]] = data
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"Invalid cache file {cache_file}: {e}")
                    os.unlink(cache_file)
        except Exception as e:
            logger.error(f"Error loading cache: {e}")

    def _save_cache(self):
        """Save cache to disk"""
        if not self._dirty:
            return

        try:
            for key, data in self._cache.items():
                cache_file = self._get_cache_file(key)
                with open(cache_file, "w") as f:
                    json.dump(data, f, indent=2)

            self._dirty = False
            logger.debug("Cache saved to disk")
        except Exception as e:
            logger.error(f"Error saving cache: {e}")

    def _is_cache_entry_valid(self, entry: Dict) -> bool:
        """Check if a cache entry is still valid"""
        if not isinstance(entry, dict):
            return False

        required_keys = {"key", "timestamp", "expires_at"}
        if not all(k in entry for k in required_keys):
            return False

        # Check if entry has expired
        if entry["expires_at"] < time.time():
            return False

        # Check if the file has changed
        if "file_path" in entry and os.path.exists(entry["file_path"]):
            file_hash = self._compute_file_hash(entry["file_path"])
            if file_hash != entry.get("file_hash"):
                return False

        return True

    def _compute_file_hash(self, file_path: str) -> str:
        """Compute a hash of a file's contents"""
        hasher = hashlib.md5()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except (IOError, OSError):
            return ""

    def _cleanup(self):
        """Clean up expired cache entries"""
        current_time = time.time()

        # Only clean up every 5 minutes
        if current_time - self._last_cleanup < 300:
            return

        initial_count = len(self._cache)
        expired_keys = [
            key
            for key, entry in self._cache.items()
            if not self._is_cache_entry_valid(entry)
        ]

        for key in expired_keys:
            self._cache.pop(key, None)

        self._last_cleanup = current_time
        self._dirty = True

        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or expired
        """
        self._cleanup()

        entry = self._cache.get(key)
        if not entry or not self._is_cache_entry_valid(entry):
            return None

        return entry.get("value")

    def set(
        self,
        key: str,
        value: Any,
        file_path: Optional[str] = None,
        ttl: Optional[int] = None,
    ):
        """
        Set a value in the cache.

        Args:
            key: Cache key
            value: Value to cache (must be JSON-serializable)
            file_path: Optional file path to associate with this entry
            ttl: Time-to-live in seconds (overrides default)
        """
        current_time = time.time()
        expires_at = current_time + (ttl or self.ttl_seconds)

        entry = {
            "key": key,
            "value": value,
            "timestamp": current_time,
            "expires_at": expires_at,
        }

        if file_path and os.path.exists(file_path):
            entry["file_path"] = file_path
            entry["file_hash"] = self._compute_file_hash(file_path)

        self._cache[key] = entry
        self._dirty = True

    def delete(self, key: str):
        """Remove an entry from the cache"""
        if key in self._cache:
            del self._cache[key]
            self._dirty = True

    def clear(self):
        """Clear the entire cache"""
        self._cache.clear()
        self._dirty = True

    def get_issues_for_file(self, file_path: str) -> List[CodeIssue]:
        """
        Get cached issues for a file.

        Args:
            file_path: Path to the file

        Returns:
            List of CodeIssue objects or empty list if not found
        """
        cache_key = f"issues:{os.path.abspath(file_path)}"
        cached = self.get(cache_key)

        if not cached or not isinstance(cached, list):
            return []

        try:
            return [
                CodeIssue(**issue) if isinstance(issue, dict) else issue
                for issue in cached
            ]
        except Exception as e:
            logger.error(f"Error deserializing cached issues: {e}")
            return []

    def cache_issues_for_file(self, file_path: str, issues: List[CodeIssue]):
        """
        Cache issues for a file.

        Args:
            file_path: Path to the file
            issues: List of CodeIssue objects
        """
        cache_key = f"issues:{os.path.abspath(file_path)}"
        self.set(cache_key, [asdict(issue) for issue in issues], file_path=file_path)

    def invalidate_file(self, file_path: str):
        """Invalidate cache entries for a specific file"""
        abs_path = os.path.abspath(file_path)
        cache_key = f"issues:{abs_path}"
        self.delete(cache_key)

    def invalidate_directory(self, directory: str):
        """Invalidate cache entries for all files in a directory"""
        abs_dir = os.path.abspath(directory)
        prefix = f"issues:{abs_dir}"

        keys_to_delete = [k for k in self._cache if k.startswith(prefix)]
        for key in keys_to_delete:
            self.delete(key)

    def __del__(self):
        """Ensure cache is saved when the object is destroyed"""
        self._save_cache()


# Global cache instance
_global_cache: Optional[ScanCache] = None


def get_global_cache() -> ScanCache:
    """Get or create the global cache instance"""
    global _global_cache
    if _global_cache is None:
        _global_cache = ScanCache()
    return _global_cache
