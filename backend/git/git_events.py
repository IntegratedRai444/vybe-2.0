"""
Git-related WebSocket events
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class GitEventTypes:
    """Git-related WebSocket event types"""

    # Branch events
    BRANCH_CREATED = "git:branch_created"
    BRANCH_DELETED = "git:branch_deleted"
    BRANCH_CHECKED_OUT = "git:branch_checked_out"

    # Commit events
    COMMIT_CREATED = "git:commit_created"
    COMMIT_PUSHED = "git:commit_pushed"

    # Status events
    STATUS_UPDATED = "git:status_updated"
    STAGE_CHANGED = "git:stage_changed"

    # Remote events
    REMOTE_UPDATED = "git:remote_updated"
    PULL_COMPLETED = "git:pull_completed"
    PUSH_COMPLETED = "git:push_completed"

    # Merge/Rebase events
    MERGE_STARTED = "git:merge_started"
    MERGE_COMPLETED = "git:merge_completed"
    REBASE_STARTED = "git:rebase_started"
    REBASE_COMPLETED = "git:rebase_completed"

    # Stash events
    STASH_CREATED = "git:stash_created"
    STASH_APPLIED = "git:stash_applied"

    # Error events
    GIT_ERROR = "git:error"


class GitEventData(BaseModel):
    """Base Git event data"""

    repository: str
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    metadata: Dict[str, Any] = {}


class BranchEventData(GitEventData):
    """Branch-related event data"""

    branch_name: str
    is_current: bool = False


class CommitEventData(GitEventData):
    """Commit-related event data"""

    commit_hash: str
    message: str
    author: str
    timestamp: float
    files_changed: List[str] = []
    insertions: int = 0
    deletions: int = 0


class StatusEventData(GitEventData):
    """Repository status event data"""

    branch: str
    ahead: int = 0
    behind: int = 0
    staged: List[str] = []
    unstaged: List[str] = []
    untracked: List[str] = []
    has_conflicts: bool = False


class RemoteEventData(GitEventData):
    """Remote repository event data"""

    remote_name: str
    url: str
    action: str  # 'fetch', 'push', 'pull', etc.
    success: bool
    message: Optional[str] = None


class MergeRebaseEventData(GitEventData):
    """Merge/Rebase event data"""

    source: str
    target: str
    success: bool
    conflicts: List[str] = []
    message: Optional[str] = None


class StashEventData(GitEventData):
    """Stash event data"""

    stash_id: str
    message: str
    files: List[str] = []


class GitErrorEventData(GitEventData):
    """Git error event data"""

    command: str
    error: str
    stderr: Optional[str] = None
