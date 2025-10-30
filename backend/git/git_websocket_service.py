"""
Git WebSocket Service
Handles Git operations with WebSocket event emissions
"""
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any, Union
import logging

from .git_service import GitService, GitRepository, GitBranch, GitCommit, GitRemote, GitFile
from .git_events import (
    GitEventTypes,
    BranchEventData,
    CommitEventData,
    StatusEventData,
    RemoteEventData,
    MergeRebaseEventData,
    StashEventData,
    GitErrorEventData
)
from ..services.websocket_service import websocket_manager

logger = logging.getLogger(__name__)

class GitWebSocketService:
    """Git service with WebSocket event integration"""
    
    def __init__(self, repo_path: Union[str, Path]):
        """Initialize with the repository path"""
        self.repo_path = str(repo_path) if isinstance(repo_path, Path) else repo_path
        self.git_service = GitService(self.repo_path)
    
    async def _emit_event(self, event_type: str, data: Dict[str, Any]):
        """Emit a WebSocket event for this repository"""
        channel = f"git:{self.repo_path}"
        await websocket_manager.broadcast(
            channel=channel,
            event_type=event_type,
            data=data
        )
    
    async def _emit_error(self, command: str, error: str, stderr: Optional[str] = None):
        """Emit a Git error event"""
        await self._emit_event(
            GitEventTypes.GIT_ERROR,
            GitErrorEventData(
                repository=self.repo_path,
                command=command,
                error=str(error),
                stderr=stderr
            ).dict()
        )
    
    async def get_status(self) -> GitRepository:
        """Get repository status and emit status update event"""
        try:
            repo = self.git_service.get_status()
            
            # Emit status update
            await self._emit_event(
                GitEventTypes.STATUS_UPDATED,
                StatusEventData(
                    repository=self.repo_path,
                    branch=repo.current_branch,
                    ahead=repo.ahead,
                    behind=repo.behind,
                    staged=[f.path for f in repo.staged_files],
                    unstaged=[f.path for f in repo.files if not f.staged],
                    untracked=[f.path for f in repo.untracked_files],
                    has_conflicts=any(f.conflict for f in repo.files)
                ).dict()
            )
            
            return repo
            
        except Exception as e:
            await self._emit_error("git status", str(e))
            raise
    
    async def stage_files(self, paths: List[str]) -> None:
        """Stage files and emit stage change event"""
        try:
            self.git_service.stage_files(paths)
            
            # Emit stage change event
            await self._emit_event(
                GitEventTypes.STAGE_CHANGED,
                {
                    "repository": self.repo_path,
                    "files": paths,
                    "action": "staged"
                }
            )
            
            # Update status
            await self.get_status()
            
        except Exception as e:
            await self._emit_error(f"git add {' '.join(paths)}", str(e))
            raise
    
    async def unstage_files(self, paths: List[str]) -> None:
        """Unstage files and emit stage change event"""
        try:
            self.git_service.unstage_files(paths)
            
            # Emit stage change event
            await self._emit_event(
                GitEventTypes.STAGE_CHANGED,
                {
                    "repository": self.repo_path,
                    "files": paths,
                    "action": "unstaged"
                }
            )
            
            # Update status
            await self.get_status()
            
        except Exception as e:
            await self._emit_error(f"git reset -- {' '.join(paths)}", str(e))
            raise
    
    async def commit(self, message: str, all_files: bool = False) -> str:
        """Create a commit and emit commit created event"""
        try:
            # Get status before commit to know what's being committed
            status = self.git_service.get_status()
            files_changed = [f.path for f in status.staged_files]
            
            # Create commit
            commit_hash = self.git_service.commit(message, all_files=all_files)
            
            # Get commit details
            commit = self.git_service._get_commit(commit_hash)
            
            # Emit commit created event
            await self._emit_event(
                GitEventTypes.COMMIT_CREATED,
                CommitEventData(
                    repository=self.repo_path,
                    commit_hash=commit_hash,
                    message=message,
                    author=commit.author,
                    timestamp=commit.date,
                    files_changed=files_changed
                ).dict()
            )
            
            # Update status
            await self.get_status()
            
            return commit_hash
            
        except Exception as e:
            await self._emit_error("git commit", str(e))
            raise
    
    async def create_branch(self, name: str, checkout: bool = True) -> GitBranch:
        """Create a new branch and emit branch created event"""
        try:
            branch = self.git_service.create_branch(name, checkout=checkout)
            
            # Emit branch created event
            await self._emit_event(
                GitEventTypes.BRANCH_CREATED,
                BranchEventData(
                    repository=self.repo_path,
                    branch_name=name,
                    is_current=checkout
                ).dict()
            )
            
            # Update status
            await self.get_status()
            
            return branch
            
        except Exception as e:
            await self._emit_error(f"git branch {name}", str(e))
            raise
    
    async def checkout(self, ref: str, create: bool = False) -> None:
        """Checkout a branch/commit and emit branch checked out event"""
        try:
            # Check if this is a branch checkout
            is_branch = any(
                branch.name == ref or f"origin/{branch.name}" == ref 
                for branch in self.git_service._list_branches()
            )
            
            self.git_service.checkout(ref, create=create)
            
            if is_branch:
                # Emit branch checked out event
                await self._emit_event(
                    GitEventTypes.BRANCH_CHECKED_OUT,
                    BranchEventData(
                        repository=self.repo_path,
                        branch_name=ref,
                        is_current=True
                    ).dict()
                )
            
            # Update status
            await self.get_status()
            
        except Exception as e:
            await self._emit_error(f"git checkout {ref}", str(e))
            raise
    
    async def push(self, remote: str = 'origin', branch: Optional[str] = None) -> None:
        """Push changes and emit push completed event"""
        try:
            # Get current branch if not specified
            if branch is None:
                branch = self.git_service._get_current_branch()
            
            # Push changes
            self.git_service.push(remote, branch)
            
            # Emit push completed event
            await self._emit_event(
                GitEventTypes.PUSH_COMPLETED,
                RemoteEventData(
                    repository=self.repo_path,
                    remote_name=remote,
                    url=f"{remote}/{branch}",
                    action="push",
                    success=True,
                    message=f"Pushed to {remote}/{branch}"
                ).dict()
            )
            
            # Update status
            await self.get_status()
            
        except Exception as e:
            await self._emit_error(f"git push {remote} {branch or ''}", str(e))
            raise
    
    async def pull(self, remote: str = 'origin', branch: Optional[str] = None) -> None:
        """Pull changes and emit pull completed event"""
        try:
            # Get current branch if not specified
            if branch is None:
                branch = self.git_service._get_current_branch()
            
            # Pull changes
            self.git_service.pull(remote, branch)
            
            # Emit pull completed event
            await self._emit_event(
                GitEventTypes.PULL_COMPLETED,
                RemoteEventData(
                    repository=self.repo_path,
                    remote_name=remote,
                    url=f"{remote}/{branch}",
                    action="pull",
                    success=True,
                    message=f"Pulled from {remote}/{branch}"
                ).dict()
            )
            
            # Update status
            await self.get_status()
            
        except Exception as e:
            await self._emit_error(f"git pull {remote} {branch or ''}", str(e))
            raise
    
    async def merge(self, branch: str, no_ff: bool = True) -> None:
        """Merge a branch and emit merge events"""
        try:
            current_branch = self.git_service._get_current_branch()
            
            # Emit merge started event
            await self._emit_event(
                GitEventTypes.MERGE_STARTED,
                MergeRebaseEventData(
                    repository=self.repo_path,
                    source=branch,
                    target=current_branch,
                    success=False,
                    message=f"Starting merge of {branch} into {current_branch}"
                ).dict()
            )
            
            # Perform merge
            self.git_service.merge(branch, no_ff=no_ff)
            
            # Emit merge completed event
            await self._emit_event(
                GitEventTypes.MERGE_COMPLETED,
                MergeRebaseEventData(
                    repository=self.repo_path,
                    source=branch,
                    target=current_branch,
                    success=True,
                    message=f"Successfully merged {branch} into {current_branch}"
                ).dict()
            )
            
            # Update status
            await self.get_status()
            
        except Exception as e:
            error_msg = str(e)
            await self._emit_event(
                GitEventTypes.MERGE_COMPLETED,
                MergeRebaseEventData(
                    repository=self.repo_path,
                    source=branch,
                    target=current_branch,
                    success=False,
                    message=f"Merge failed: {error_msg}"
                ).dict()
            )
            await self._emit_error(f"git merge {branch}", error_msg)
            raise
    
    async def stash(self, message: str = '') -> None:
        """Stash changes and emit stash created event"""
        try:
            # Get status before stash to know what's being stashed
            status = self.git_service.get_status()
            files = [f.path for f in status.files + status.untracked_files]
            
            # Create stash
            stash_id = self.git_service.stash(message)
            
            # Emit stash created event
            await self._emit_event(
                GitEventTypes.STASH_CREATED,
                StashEventData(
                    repository=self.repo_path,
                    stash_id=stash_id,
                    message=message or "WIP",
                    files=files
                ).dict()
            )
            
            # Update status
            await self.get_status()
            
        except Exception as e:
            await self._emit_error("git stash", str(e))
            raise

# Global instance
git_ws_service = GitWebSocketService(Path.cwd())
