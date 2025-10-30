# backend/git_service.py
"""
Enhanced Git service with advanced features
"""

import os
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class GitService:
    """Enhanced Git operations service"""
    
    def __init__(self):
        self.git_command = "git"
    
    def is_git_repo(self, path: str) -> bool:
        """Check if path is a git repository"""
        try:
            result = subprocess.run(
                [self.git_command, "rev-parse", "--git-dir"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
    
    def get_repo_info(self, path: str) -> Dict[str, Any]:
        """Get repository information"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository"}
            
            # Get current branch
            branch_result = subprocess.run(
                [self.git_command, "branch", "--show-current"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=5
            )
            current_branch = branch_result.stdout.strip() if branch_result.returncode == 0 else "unknown"
            
            # Get remote info
            remote_result = subprocess.run(
                [self.git_command, "remote", "-v"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            remotes = {}
            if remote_result.returncode == 0:
                for line in remote_result.stdout.strip().split('\n'):
                    if line:
                        parts = line.split()
                        if len(parts) >= 2:
                            name = parts[0]
                            url = parts[1]
                            if name not in remotes:
                                remotes[name] = url
            
            # Get last commit
            commit_result = subprocess.run(
                [self.git_command, "log", "-1", "--format=%H|%an|%ae|%ad|%s"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            last_commit = None
            if commit_result.returncode == 0 and commit_result.stdout.strip():
                parts = commit_result.stdout.strip().split('|')
                if len(parts) >= 5:
                    last_commit = {
                        "hash": parts[0],
                        "author_name": parts[1],
                        "author_email": parts[2],
                        "date": parts[3],
                        "message": parts[4]
                    }
            
            return {
                "is_repo": True,
                "current_branch": current_branch,
                "remotes": remotes,
                "last_commit": last_commit,
                "path": path
            }
            
        except Exception as e:
            logger.error(f"Error getting repo info: {e}")
            return {"error": str(e)}
    
    def get_commit_history(self, path: str, limit: int = 50, branch: Optional[str] = None) -> Dict[str, Any]:
        """Get commit history"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "commits": []}
            
            cmd = [self.git_command, "log", f"--max-count={limit}", 
                   "--format=%H|%an|%ae|%ad|%s|%P"]
            
            if branch:
                cmd.append(branch)
            
            result = subprocess.run(
                cmd,
                cwd=path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                return {"error": result.stderr, "commits": []}
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split('|')
                    if len(parts) >= 5:
                        commit = {
                            "hash": parts[0],
                            "short_hash": parts[0][:8],
                            "author_name": parts[1],
                            "author_email": parts[2],
                            "date": parts[3],
                            "message": parts[4],
                            "parents": parts[5].split() if len(parts) > 5 and parts[5] else []
                        }
                        commits.append(commit)
            
            return {"commits": commits, "total": len(commits)}
            
        except Exception as e:
            logger.error(f"Error getting commit history: {e}")
            return {"error": str(e), "commits": []}
    
    def get_branches(self, path: str, include_remote: bool = True) -> Dict[str, Any]:
        """Get all branches"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "branches": []}
            
            # Get local branches
            local_result = subprocess.run(
                [self.git_command, "branch", "-v"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            branches = []
            current_branch = None
            
            if local_result.returncode == 0:
                for line in local_result.stdout.strip().split('\n'):
                    if line.strip():
                        is_current = line.startswith('*')
                        line = line.lstrip('* ').strip()
                        parts = line.split()
                        if len(parts) >= 2:
                            name = parts[0]
                            hash_commit = parts[1]
                            message = ' '.join(parts[2:]) if len(parts) > 2 else ""
                            
                            branch_info = {
                                "name": name,
                                "hash": hash_commit,
                                "message": message,
                                "is_current": is_current,
                                "type": "local"
                            }
                            branches.append(branch_info)
                            
                            if is_current:
                                current_branch = name
            
            # Get remote branches if requested
            if include_remote:
                remote_result = subprocess.run(
                    [self.git_command, "branch", "-r", "-v"],
                    cwd=path,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if remote_result.returncode == 0:
                    for line in remote_result.stdout.strip().split('\n'):
                        if line.strip() and not 'HEAD ->' in line:
                            line = line.strip()
                            parts = line.split()
                            if len(parts) >= 2:
                                name = parts[0]
                                hash_commit = parts[1]
                                message = ' '.join(parts[2:]) if len(parts) > 2 else ""
                                
                                branch_info = {
                                    "name": name,
                                    "hash": hash_commit,
                                    "message": message,
                                    "is_current": False,
                                    "type": "remote"
                                }
                                branches.append(branch_info)
            
            return {
                "branches": branches,
                "current_branch": current_branch,
                "total": len(branches)
            }
            
        except Exception as e:
            logger.error(f"Error getting branches: {e}")
            return {"error": str(e), "branches": []}
    
    def get_file_blame(self, path: str, file_path: str) -> Dict[str, Any]:
        """Get git blame for a file"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "blame": []}
            
            result = subprocess.run(
                [self.git_command, "blame", "--porcelain", file_path],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                return {"error": result.stderr, "blame": []}
            
            blame_info = []
            current_commit = {}
            
            for line in result.stdout.split('\n'):
                if not line:
                    continue
                
                if line[0].isalnum():  # Commit hash line
                    parts = line.split()
                    if len(parts) >= 3:
                        current_commit = {
                            "hash": parts[0],
                            "line_number": int(parts[2])
                        }
                elif line.startswith('author '):
                    current_commit["author"] = line[7:]
                elif line.startswith('author-time '):
                    timestamp = int(line[12:])
                    current_commit["date"] = datetime.fromtimestamp(timestamp).isoformat()
                elif line.startswith('summary '):
                    current_commit["message"] = line[8:]
                elif line.startswith('\t'):  # Code line
                    current_commit["code"] = line[1:]
                    blame_info.append(current_commit.copy())
            
            return {"blame": blame_info, "file": file_path}
            
        except Exception as e:
            logger.error(f"Error getting file blame: {e}")
            return {"error": str(e), "blame": []}
    
    def get_stash_list(self, path: str) -> Dict[str, Any]:
        """Get stash list"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "stashes": []}
            
            result = subprocess.run(
                [self.git_command, "stash", "list", "--format=%gd|%gs|%gD"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return {"error": result.stderr, "stashes": []}
            
            stashes = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split('|')
                    if len(parts) >= 2:
                        stash = {
                            "name": parts[0],
                            "message": parts[1],
                            "date": parts[2] if len(parts) > 2 else ""
                        }
                        stashes.append(stash)
            
            return {"stashes": stashes, "total": len(stashes)}
            
        except Exception as e:
            logger.error(f"Error getting stash list: {e}")
            return {"error": str(e), "stashes": []}
    
    def create_stash(self, path: str, message: Optional[str] = None, include_untracked: bool = False) -> Dict[str, Any]:
        """Create a new stash"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "success": False}
            
            cmd = [self.git_command, "stash", "push"]
            
            if include_untracked:
                cmd.append("-u")
            
            if message:
                cmd.extend(["-m", message])
            
            result = subprocess.run(
                cmd,
                cwd=path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                "success": result.returncode == 0,
                "message": result.stdout if result.returncode == 0 else result.stderr
            }
            
        except Exception as e:
            logger.error(f"Error creating stash: {e}")
            return {"error": str(e), "success": False}
    
    def apply_stash(self, path: str, stash_name: str = "stash@{0}") -> Dict[str, Any]:
        """Apply a stash"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "success": False}
            
            result = subprocess.run(
                [self.git_command, "stash", "apply", stash_name],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                "success": result.returncode == 0,
                "message": result.stdout if result.returncode == 0 else result.stderr
            }
            
        except Exception as e:
            logger.error(f"Error applying stash: {e}")
            return {"error": str(e), "success": False}
    
    def get_merge_conflicts(self, path: str) -> Dict[str, Any]:
        """Get merge conflict information"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "conflicts": []}
            
            # Get unmerged files
            result = subprocess.run(
                [self.git_command, "diff", "--name-only", "--diff-filter=U"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return {"error": result.stderr, "conflicts": []}
            
            conflict_files = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    conflict_files.append({
                        "file": line,
                        "status": "unmerged"
                    })
            
            return {"conflicts": conflict_files, "total": len(conflict_files)}
            
        except Exception as e:
            logger.error(f"Error getting merge conflicts: {e}")
            return {"error": str(e), "conflicts": []}
    
    def resolve_conflict(self, path: str, file_path: str, resolution: str) -> Dict[str, Any]:
        """Resolve merge conflict"""
        try:
            if not self.is_git_repo(path):
                return {"error": "Not a git repository", "success": False}
            
            if resolution == "ours":
                result = subprocess.run(
                    [self.git_command, "checkout", "--ours", file_path],
                    cwd=path,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
            elif resolution == "theirs":
                result = subprocess.run(
                    [self.git_command, "checkout", "--theirs", file_path],
                    cwd=path,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
            else:
                return {"error": "Invalid resolution type", "success": False}
            
            if result.returncode == 0:
                # Add the resolved file
                add_result = subprocess.run(
                    [self.git_command, "add", file_path],
                    cwd=path,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                return {
                    "success": add_result.returncode == 0,
                    "message": "Conflict resolved and staged"
                }
            
            return {
                "success": False,
                "message": result.stderr
            }
            
        except Exception as e:
            logger.error(f"Error resolving conflict: {e}")
            return {"error": str(e), "success": False}

# Global git service instance
git_service = GitService()