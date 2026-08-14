"""
Pydantic models for Git API
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, HttpUrl, validator


class GitFileStatus(str, Enum):
    """Git file status values"""

    UNTRACKED = "untracked"
    MODIFIED = "modified"
    DELETED = "deleted"
    RENAMED = "renamed"
    COPIED = "copied"
    UPDATED = "updated"
    CONFLICT = "conflict"


class GitStatus(str, Enum):
    """Git repository status values"""

    CLEAN = "clean"
    UNTRACKED = "untracked"
    MODIFIED = "modified"
    STAGED = "staged"
    CONFLICT = "conflict"
    AHEAD = "ahead"
    BEHIND = "behind"
    DIVERGED = "diverged"


class GitFile(BaseModel):
    """Model for a file in Git"""

    path: str = Field(..., description="File path relative to repository root")
    status: GitFileStatus = Field(..., description="File status")
    staged: bool = Field(False, description="Whether the file is staged")
    conflict: bool = Field(False, description="Whether the file has conflicts")
    original_path: Optional[str] = Field(
        None, description="Original path (for renamed/copied files)"
    )


class GitBranch(BaseModel):
    """Model for a Git branch"""

    name: str = Field(..., description="Branch name")
    is_current: bool = Field(False, description="Whether this is the current branch")
    is_remote: bool = Field(False, description="Whether this is a remote branch")
    upstream: Optional[str] = Field(
        None, description="Upstream branch name (if tracked)"
    )
    ahead: int = Field(0, description="Number of commits ahead of upstream")
    behind: int = Field(0, description="Number of commits behind upstream")
    last_commit: Optional[Dict[str, Any]] = Field(
        None, description="Last commit on this branch"
    )


class GitRemote(BaseModel):
    """Model for a Git remote"""

    name: str = Field(..., description="Remote name")
    url: str = Field(..., description="Remote URL")
    fetch: str = Field(..., description="Fetch URL")
    push: str = Field(..., description="Push URL")


class GitCommit(BaseModel):
    """Model for a Git commit"""

    hash: str = Field(..., description="Commit hash")
    author: str = Field(..., description="Author name")
    email: str = Field(..., description="Author email")
    date: str = Field(..., description="Commit date")
    message: str = Field(..., description="Commit message")
    refs: List[str] = Field(default_factory=list, description="Branch/tag references")
    files_changed: List[Dict[str, Any]] = Field(
        default_factory=list, description="List of changed files"
    )


class GitRepositoryInfo(BaseModel):
    """Model for Git repository information"""

    path: str = Field(..., description="Repository path")
    current_branch: str = Field(..., description="Current branch name")
    branches: List[GitBranch] = Field(
        default_factory=list, description="List of branches"
    )
    remotes: List[GitRemote] = Field(
        default_factory=list, description="List of remotes"
    )
    status: GitStatus = Field(..., description="Repository status")
    files: List[GitFile] = Field(
        default_factory=list, description="List of files with status"
    )
    staged_files: List[GitFile] = Field(
        default_factory=list, description="List of staged files"
    )
    untracked_files: List[GitFile] = Field(
        default_factory=list, description="List of untracked files"
    )
    conflicts: List[Dict[str, Any]] = Field(
        default_factory=list, description="List of merge conflicts"
    )
    ahead: int = Field(0, description="Number of commits ahead of upstream")
    behind: int = Field(0, description="Number of commits behind upstream")
    last_commit: Optional[Dict[str, Any]] = Field(
        None, description="Last commit information"
    )


class GitCommitCreate(BaseModel):
    """Model for creating a new commit"""

    message: str = Field(..., description="Commit message")
    files: Optional[List[str]] = Field(
        None, description="Specific files to include in the commit"
    )
    all_files: bool = Field(False, description="Whether to include all changed files")
    amend: bool = Field(False, description="Whether to amend the previous commit")


class GitBranchCreate(BaseModel):
    """Model for creating a new branch"""

    name: str = Field(..., description="Branch name")
    checkout: bool = Field(True, description="Whether to checkout the new branch")
    start_point: Optional[str] = Field(
        None, description="Starting point for the new branch (commit, branch, or tag)"
    )


class GitMergeRequest(BaseModel):
    """Model for a merge request"""

    branch: str = Field(..., description="Branch to merge from")
    no_ff: bool = Field(
        True,
        description="Create a merge commit even when the merge resolves as a fast-forward",
    )
    commit_message: Optional[str] = Field(
        None, description="Custom merge commit message"
    )


class GitConflictResolution(BaseModel):
    """Model for resolving a merge conflict"""

    file_path: str = Field(..., description="Path to the conflicted file")
    content: str = Field(..., description="Resolved file content")
    resolution_type: str = Field(
        "theirs", description="Resolution type (ours, theirs, custom)"
    )


class GitStash(BaseModel):
    """Model for a Git stash"""

    id: str = Field(..., description="Stash ID")
    branch: str = Field(..., description="Branch the stash was created on")
    message: str = Field(..., description="Stash message")
    created_at: str = Field(..., description="Creation timestamp")
    files: List[Dict[str, Any]] = Field(
        default_factory=list, description="List of stashed files"
    )


class GitTag(BaseModel):
    """Model for a Git tag"""

    name: str = Field(..., description="Tag name")
    commit: str = Field(..., description="Commit hash")
    message: Optional[str] = Field(None, description="Tag message")
    tagger: Optional[Dict[str, str]] = Field(
        None, description="Tagger information (name, email, date)"
    )


class GitDiff(BaseModel):
    """Model for a Git diff"""

    file: str = Field(..., description="File path")
    changes: str = Field(..., description="Diff content")
    is_binary: bool = Field(False, description="Whether the file is binary")
    old_mode: Optional[str] = Field(None, description="Old file mode")
    new_mode: Optional[str] = Field(None, description="New file mode")
    similarity_index: Optional[int] = Field(
        None, description="Similarity index for renames/copies"
    )


class GitBlameHunk(BaseModel):
    """Model for a Git blame hunk"""

    commit: str = Field(..., description="Commit hash")
    author: str = Field(..., description="Author name")
    author_email: str = Field(..., description="Author email")
    author_time: str = Field(..., description="Author time")
    author_tz: str = Field(..., description="Author timezone")
    committer: str = Field(..., description="Committer name")
    committer_email: str = Field(..., description="Committer email")
    committer_time: str = Field(..., description="Commit time")
    committer_tz: str = Field(..., description="Committer timezone")
    summary: str = Field(..., description="Commit summary")
    previous: Optional[str] = Field(None, description="Previous commit hash")
    filename: str = Field(..., description="File name")
    start_line: int = Field(..., description="Start line number")
    num_lines: int = Field(..., description="Number of lines")
    content: str = Field(..., description="Line content")


class GitRepositoryConfig(BaseModel):
    """Model for Git repository configuration"""

    core: Dict[str, Any] = Field(default_factory=dict, description="Core configuration")
    remote: Dict[str, Dict[str, str]] = Field(
        default_factory=dict, description="Remote configurations"
    )
    branch: Dict[str, Dict[str, str]] = Field(
        default_factory=dict, description="Branch configurations"
    )
    user: Dict[str, str] = Field(default_factory=dict, description="User configuration")
    alias: Dict[str, str] = Field(default_factory=dict, description="Command aliases")
