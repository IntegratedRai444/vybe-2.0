# backend/file_handler.py
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class FileHandler:
    """Handles local file system operations with proper error handling"""

    def __init__(self):
        self.supported_text_extensions = {
            ".py",
            ".js",
            ".ts",
            ".tsx",
            ".jsx",
            ".html",
            ".css",
            ".scss",
            ".sass",
            ".json",
            ".xml",
            ".yaml",
            ".yml",
            ".md",
            ".txt",
            ".csv",
            ".sql",
            ".php",
            ".java",
            ".cpp",
            ".c",
            ".h",
            ".hpp",
            ".cs",
            ".rb",
            ".go",
            ".rs",
            ".swift",
            ".kt",
            ".scala",
            ".sh",
            ".bat",
            ".ps1",
            ".dockerfile",
            ".gitignore",
            ".env",
            ".ini",
            ".cfg",
            ".conf",
            ".toml",
            ".lock",
        }

    def is_text_file(self, file_path: str) -> bool:
        """Check if a file is likely a text file"""
        path = Path(file_path)

        # Check extension
        if path.suffix.lower() in self.supported_text_extensions:
            return True

        # Check if file has no extension but is likely text
        if not path.suffix:
            try:
                with open(file_path, "rb") as f:
                    chunk = f.read(1024)
                    # Check if it's mostly text
                    text_chars = sum(
                        1
                        for byte in chunk
                        if byte < 128 and (byte >= 32 or byte in [9, 10, 13])
                    )
                    return text_chars / len(chunk) > 0.95 if chunk else True
            except:
                return False

        return False

    def read_file(self, file_path: str) -> Dict[str, Any]:
        """Read file content with proper error handling"""
        try:
            path = Path(file_path).resolve()

            if not path.exists():
                return {"error": "File not found", "content": None}

            if not path.is_file():
                return {"error": "Path is not a file", "content": None}

            # Check if it's a text file
            if not self.is_text_file(str(path)):
                return {
                    "error": "File is not a text file",
                    "content": None,
                    "binary": True,
                }

            # Read the file
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                return {"content": content, "error": None}
            except UnicodeDecodeError:
                # Try with different encodings
                for encoding in ["latin-1", "cp1252", "iso-8859-1"]:
                    try:
                        with open(path, "r", encoding=encoding) as f:
                            content = f.read()
                        return {"content": content, "error": None, "encoding": encoding}
                    except:
                        continue
                return {"error": "Could not decode file", "content": None}

        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            return {"error": str(e), "content": None}

    def write_file(self, file_path: str, content: str) -> Dict[str, Any]:
        """Write file content with proper error handling"""
        try:
            path = Path(file_path).resolve()

            # Create parent directories if they don't exist
            path.parent.mkdir(parents=True, exist_ok=True)

            # Write the file
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)

            return {"success": True, "error": None}

        except Exception as e:
            logger.error(f"Error writing file {file_path}: {e}")
            return {"success": False, "error": str(e)}

    def create_file(self, file_path: str, content: str = "") -> Dict[str, Any]:
        """Create a new file"""
        try:
            path = Path(file_path).resolve()

            if path.exists():
                return {"success": False, "error": "File already exists"}

            return self.write_file(file_path, content)

        except Exception as e:
            logger.error(f"Error creating file {file_path}: {e}")
            return {"success": False, "error": str(e)}

    def create_folder(self, folder_path: str) -> Dict[str, Any]:
        """Create a new folder"""
        try:
            path = Path(folder_path).resolve()

            if path.exists():
                if path.is_dir():
                    return {"success": True, "message": "Folder already exists"}
                else:
                    return {
                        "success": False,
                        "error": "Path exists but is not a folder",
                    }

            path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created folder: {path}")
            return {"success": True, "message": f"Folder created: {path}"}

        except Exception as e:
            logger.error(f"Error creating folder {folder_path}: {e}")
            return {"success": False, "error": str(e)}

    def delete_file(self, file_path: str) -> Dict[str, Any]:
        """Delete a file or directory"""
        try:
            path = Path(file_path).resolve()

            if not path.exists():
                return {"success": False, "error": "File not found"}

            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()

            return {"success": True, "error": None}

        except Exception as e:
            logger.error(f"Error deleting {file_path}: {e}")
            return {"success": False, "error": str(e)}

    def rename_file(self, old_path: str, new_path: str) -> Dict[str, Any]:
        """Rename/move a file or directory"""
        try:
            old = Path(old_path).resolve()
            new = Path(new_path).resolve()

            if not old.exists():
                return {"success": False, "error": "Source file not found"}

            if new.exists():
                return {"success": False, "error": "Destination already exists"}

            # Create parent directory if needed
            new.parent.mkdir(parents=True, exist_ok=True)

            old.rename(new)
            return {"success": True, "error": None}

        except Exception as e:
            logger.error(f"Error renaming {old_path} to {new_path}: {e}")
            return {"success": False, "error": str(e)}

    def list_directory(self, dir_path: str) -> Dict[str, Any]:
        """List directory contents with metadata"""
        try:
            path = Path(dir_path).resolve()

            if not path.exists():
                return {"error": "Directory not found", "files": []}

            if not path.is_dir():
                return {"error": "Path is not a directory", "files": []}

            files = []
            try:
                for item in sorted(path.iterdir()):
                    # Skip hidden files and directories
                    if item.name.startswith("."):
                        continue

                    try:
                        stat = item.stat()
                        files.append(
                            {
                                "name": item.name,
                                "path": str(item.relative_to(path.parent)),
                                "type": "folder" if item.is_dir() else "file",
                                "size": stat.st_size if item.is_file() else 0,
                                "modified": stat.st_mtime,
                                "is_text": self.is_text_file(str(item))
                                if item.is_file()
                                else False,
                            }
                        )
                    except (PermissionError, OSError):
                        # Skip files we can't access
                        continue

            except PermissionError:
                return {"error": "Permission denied", "files": []}

            return {"files": files, "error": None}

        except Exception as e:
            logger.error(f"Error listing directory {dir_path}: {e}")
            return {"error": str(e), "files": []}

    def build_file_tree(self, root_path: str, max_depth: int = 10) -> Dict[str, Any]:
        """Build a hierarchical file tree"""
        try:
            root = Path(root_path).resolve()

            if not root.exists():
                return {"error": "Root directory not found", "tree": None}

            if not root.is_dir():
                return {"error": "Root path is not a directory", "tree": None}

            def build_node(path: Path, current_depth: int = 0) -> Dict[str, Any]:
                if current_depth > max_depth:
                    return None

                try:
                    stat = path.stat()
                    node = {
                        "name": path.name,
                        "path": str(path.relative_to(root)),
                        "type": "folder" if path.is_dir() else "file",
                        "size": stat.st_size if path.is_file() else 0,
                        "modified": stat.st_mtime,
                    }

                    if path.is_dir():
                        node["children"] = []
                        try:
                            for child in sorted(path.iterdir()):
                                # Skip hidden files and common ignore patterns
                                if child.name.startswith(".") or child.name in [
                                    "node_modules",
                                    "__pycache__",
                                    ".git",
                                    "dist",
                                    "build",
                                ]:
                                    continue

                                child_node = build_node(child, current_depth + 1)
                                if child_node:
                                    node["children"].append(child_node)
                        except PermissionError:
                            pass
                    else:
                        node["is_text"] = self.is_text_file(str(path))

                    return node

                except (PermissionError, OSError):
                    return None

            tree = build_node(root)
            return {"tree": tree, "error": None}

        except Exception as e:
            logger.error(f"Error building file tree for {root_path}: {e}")
            return {"error": str(e), "tree": None}

    def search_files(
        self, root_path: str, query: str, max_results: int = 100
    ) -> Dict[str, Any]:
        """Search for files by name"""
        try:
            root = Path(root_path).resolve()

            if not root.exists() or not root.is_dir():
                return {"error": "Invalid root directory", "results": []}

            results = []
            query_lower = query.lower()

            def search_recursive(path: Path, depth: int = 0):
                if depth > 10 or len(results) >= max_results:
                    return

                try:
                    for item in path.iterdir():
                        if item.name.startswith("."):
                            continue

                        if query_lower in item.name.lower():
                            results.append(
                                {
                                    "name": item.name,
                                    "path": str(item.relative_to(root)),
                                    "type": "folder" if item.is_dir() else "file",
                                    "is_text": self.is_text_file(str(item))
                                    if item.is_file()
                                    else False,
                                }
                            )

                        if item.is_dir() and len(results) < max_results:
                            search_recursive(item, depth + 1)

                except PermissionError:
                    pass

            search_recursive(root)
            return {"results": results, "error": None}

        except Exception as e:
            logger.error(f"Error searching files in {root_path}: {e}")
            return {"error": str(e), "results": []}


# Global instance
file_handler = FileHandler()
