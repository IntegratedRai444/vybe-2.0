"""
Git API Endpoints
"""

import json
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ...git.git_service import (
    FileStatus,
    GitBranch,
    GitCommit,
    GitFile,
    GitService,
    GitStatus,
)
from ...models.git_models import (
    GitBranchCreate,
    GitCommitCreate,
    GitConflictResolution,
    GitFileStatus,
    GitMergeRequest,
    GitRepositoryInfo,
)

router = APIRouter(prefix="/api/git", tags=["git"])
logger = logging.getLogger(__name__)

# In-memory store for GitService instances
git_services: Dict[str, GitService] = {}

def get_git_service(repo_path: str) -> GitService:
    """Get or create a GitService instance for the given repository"""
    if repo_path not in git_services:
        git_services[repo_path] = GitService(repo_path)
    return git_services[repo_path]

@router.get("/status", response_model=GitRepositoryInfo)
async def get_status(repo_path: str):
    """
    Get the current status of the Git repository
    """
    try:
        git = get_git_service(repo_path)
        status = git.get_status()

        # Convert GitFile objects to dictionaries
        files = [
            {
                "path": f.path,
                "status": f.status.value,
                "staged": f.staged,
                "conflict": f.conflict,
                "original_path": f.original_path
            }
            for f in status.files
        ]

        # Convert GitBranch objects to dictionaries
        branches = [
            {
                "name": b.name,
                "is_current": b.is_current,
                "is_remote": b.is_remote,
                "upstream": b.upstream,
                "ahead": b.ahead,
                "behind": b.behind,
                "last_commit": b.last_commit
            }
            for b in status.branches
        ]

        # Convert GitRemote objects to dictionaries
        remotes = [
            {
                "name": r.name,
                "url": r.url,
                "fetch": r.fetch,
                "push": r.push
            }
            for r in status.remotes
        ]

        return {
            "path": status.path,
            "current_branch": status.current_branch,
            "branches": branches,
            "remotes": remotes,
            "status": status.status.value,
            "files": files,
            "staged_files": [f for f in files if f["staged"]],
            "untracked_files": [f for f in files if f["status"] == FileStatus.UNTRACKED.value],
            "conflicts": status.conflicts,
            "ahead": status.ahead,
            "behind": status.behind,
            "last_commit": status.last_commit.dict() if status.last_commit else None
        }

    except Exception as e:
        logger.error(f"Error getting Git status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Git status: {str(e)}"
        )

@router.post("/init", status_code=status.HTTP_200_OK)
async def init_repository(repo_path: str):
    """
    Initialize a new Git repository
    """
    try:
        git = get_git_service(repo_path)
        success = git.init_repository()

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to initialize Git repository"
            )

        return {"status": "success", "message": "Git repository initialized"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing Git repository: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize Git repository: {str(e)}"
        )

@router.post("/clone", status_code=status.HTTP_200_OK)
async def clone_repository(
    repo_url: str,
    target_dir: Optional[str] = None,
    repo_path: Optional[str] = None
):
    """
    Clone a remote Git repository
    """
    try:
        if not repo_path:
            # If no repo_path is provided, use a temporary directory
            temp_dir = tempfile.mkdtemp()
            repo_path = str(Path(temp_dir) / (target_dir or Path(repo_url).stem))

        git = get_git_service(repo_path)
        success = git.clone_repository(repo_url, target_dir)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to clone repository: {repo_url}"
            )

        return {
            "status": "success",
            "message": f"Repository cloned to {repo_path}",
            "repo_path": repo_path
        }

    except HTTPException:
        raise
    except Exception as e:
        # Clean up temporary directory if it was created
        if 'temp_dir' in locals() and Path(temp_dir).exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

        logger.error(f"Error cloning repository: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clone repository: {str(e)}"
        )

@router.post("/stage", status_code=status.HTTP_200_OK)
async def stage_files(
    repo_path: str,
    files: List[str]
):
    """
    Stage files for commit
    """
    try:
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files specified to stage"
            )

        git = get_git_service(repo_path)
        success = git.stage_files(files)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to stage files"
            )

        return {"status": "success", "message": "Files staged successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error staging files: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stage files: {str(e)}"
        )

@router.post("/unstage", status_code=status.HTTP_200_OK)
async def unstage_files(
    repo_path: str,
    files: List[str]
):
    """
    Unstage files
    """
    try:
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files specified to unstage"
            )

        git = get_git_service(repo_path)
        success = git.unstage_files(files)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to unstage files"
            )

        return {"status": "success", "message": "Files unstaged successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unstaging files: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unstage files: {str(e)}"
        )

@router.post("/commit", status_code=status.HTTP_200_OK)
async def create_commit(
    repo_path: str,
    commit_data: GitCommitCreate
):
    """
    Create a new commit
    """
    try:
        if not commit_data.message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Commit message cannot be empty"
            )

        git = get_git_service(repo_path)

        # Stage all files if requested
        if commit_data.all_files:
            git.stage_files(["."])

        # Create the commit
        success = git.commit(commit_data.message, all_files=commit_data.all_files)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create commit"
            )

        return {"status": "success", "message": "Commit created successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating commit: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create commit: {str(e)}"
        )

@router.get("/branches", response_model=List[Dict[str, Any]])
async def list_branches(
    repo_path: str,
    include_remotes: bool = True
):
    """
    List all branches
    """
    try:
        git = get_git_service(repo_path)
        status = git.get_status()

        branches = []
        for branch in status.branches:
            if not include_remotes and branch.is_remote:
                continue

            branches.append({
                "name": branch.name,
                "is_current": branch.is_current,
                "is_remote": branch.is_remote,
                "upstream": branch.upstream,
                "ahead": branch.ahead,
                "behind": branch.behind,
                "last_commit": branch.last_commit.dict() if branch.last_commit else None
            })

        return branches

    except Exception as e:
        logger.error(f"Error listing branches: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list branches: {str(e)}"
        )

@router.post("/branches", status_code=status.HTTP_200_OK)
async def create_branch(
    repo_path: str,
    branch_data: GitBranchCreate
):
    """
    Create a new branch
    """
    try:
        if not branch_data.name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Branch name cannot be empty"
            )

        git = get_git_service(repo_path)

        # Check if branch already exists
        status = git.get_status()
        if any(b.name == branch_data.name for b in status.branches):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Branch '{branch_data.name}' already exists"
            )

        # Create the branch
        success = git.create_branch(
            name=branch_data.name,
            checkout=branch_data.checkout
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create branch '{branch_data.name}'"
            )

        return {
            "status": "success",
            "message": f"Branch '{branch_data.name}' created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating branch: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create branch: {str(e)}"
        )

@router.post("/checkout", status_code=status.HTTP_200_OK)
async def checkout(
    repo_path: str,
    ref: str,
    create: bool = False
):
    """
    Checkout a branch or commit
    """
    try:
        if not ref:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reference cannot be empty"
            )

        git = get_git_service(repo_path)

        # Check if the reference exists
        status = git.get_status()
        if create and any(b.name == ref for b in status.branches):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Branch '{ref}' already exists"
            )

        success = git.checkout(ref, create=create)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to checkout '{ref}'"
            )

        action = "created and checked out" if create else "checked out"
        return {
            "status": "success",
            "message": f"Successfully {action} '{ref}'"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during checkout: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to checkout: {str(e)}"
        )

@router.post("/merge", status_code=status.HTTP_200_OK)
async def merge_branch(
    repo_path: str,
    merge_request: GitMergeRequest
):
    """
    Merge a branch into the current branch
    """
    try:
        if not merge_request.branch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Branch name cannot be empty"
            )

        git = get_git_service(repo_path)

        # Check if the branch exists
        status = git.get_status()
        if not any(b.name == merge_request.branch for b in status.branches):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Branch '{merge_request.branch}' not found"
            )

        # Perform the merge
        result = git.merge(merge_request.branch, no_ff=merge_request.no_ff)

        if not result['success']:
            if 'conflicts' in result and result['conflicts']:
                return {
                    "status": "conflict",
                    "message": "Merge conflicts detected",
                    "conflicts": result['conflicts']
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get('error', 'Merge failed')
                )

        return {
            "status": "success",
            "message": f"Successfully merged '{merge_request.branch}' into current branch"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during merge: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to merge: {str(e)}"
        )

@router.post("/conflicts/resolve", status_code=status.HTTP_200_OK)
async def resolve_conflict(
    repo_path: str,
    resolution: GitConflictResolution
):
    """
    Resolve a merge conflict
    """
    try:
        if not resolution.file_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File path cannot be empty"
            )

        git = get_git_service(repo_path)

        # Write the resolved content to the file
        file_path = Path(repo_path) / resolution.file_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(resolution.content, encoding='utf-8')

        # Mark the file as resolved
        success = git.resolve_conflict(resolution.file_path, resolution.content)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to resolve conflict in {resolution.file_path}"
            )

        return {
            "status": "success",
            "message": f"Resolved conflict in {resolution.file_path}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving conflict: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve conflict: {str(e)}"
        )

@router.post("/push", status_code=status.HTTP_200_OK)
async def push_changes(
    repo_path: str,
    remote: str = "origin",
    branch: Optional[str] = None
):
    """
    Push changes to a remote repository
    """
    try:
        git = get_git_service(repo_path)

        # Check if the remote exists
        status = git.get_status()
        if not any(r.name == remote for r in status.remotes):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Remote '{remote}' not found"
            )

        # If no branch is specified, use the current branch
        if not branch:
            branch = status.current_branch

        success = git.push(remote, branch)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to push to {remote}/{branch}"
            )

        return {
            "status": "success",
            "message": f"Successfully pushed to {remote}/{branch}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pushing changes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to push changes: {str(e)}"
        )

@router.post("/pull", status_code=status.HTTP_200_OK)
async def pull_changes(
    repo_path: str,
    remote: str = "origin",
    branch: Optional[str] = None
):
    """
    Pull changes from a remote repository
    """
    try:
        git = get_git_service(repo_path)

        # Check if the remote exists
        status = git.get_status()
        if not any(r.name == remote for r in status.remotes):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Remote '{remote}' not found"
            )

        # If no branch is specified, use the current branch
        if not branch:
            branch = status.current_branch

        result = git.pull(remote, branch)

        if not result['success']:
            if 'conflicts' in result and result['conflicts']:
                return {
                    "status": "conflict",
                    "message": "Merge conflicts detected during pull",
                    "conflicts": result['conflicts']
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get('error', 'Pull failed')
                )

        return {
            "status": "success",
            "message": f"Successfully pulled from {remote}/{branch}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pulling changes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pull changes: {str(e)}"
        )

@router.get("/commits", response_model=List[Dict[str, Any]])
async def get_commit_history(
    repo_path: str,
    limit: int = 50,
    path: Optional[str] = None
):
    """
    Get commit history
    """
    try:
        git = get_git_service(repo_path)

        if path:
            # Get history for a specific file
            commits = git.get_file_history(path)
        else:
            # Get general commit history
            commits = git.get_commit_history(limit)

        # Convert GitCommit objects to dictionaries
        return [
            {
                "hash": c.hash,
                "author": c.author,
                "email": c.email,
                "date": c.date,
                "message": c.message,
                "refs": c.refs,
                "files_changed": c.files_changed
            }
            for c in commits
        ]

    except Exception as e:
        logger.error(f"Error getting commit history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get commit history: {str(e)}"
        )

@router.get("/file/history", response_model=List[Dict[str, Any]])
async def get_file_history(
    repo_path: str,
    file_path: str,
    limit: int = 50
):
    """
    Get the commit history for a specific file
    """
    try:
        if not file_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File path cannot be empty"
            )

        git = get_git_service(repo_path)

        # Get the file history
        history = git.get_file_history(file_path)[:limit]

        # Convert to a list of dictionaries
        return [
            {
                "commit": {
                    "hash": item["commit"]["hash"],
                    "message": item["commit"]["message"],
                    "author": item["commit"]["author"],
                    "date": item["commit"]["date"]
                },
                "content": item["content"]
            }
            for item in history
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file history: {str(e)}"
        )

@router.get("/file/at-commit", response_model=Dict[str, Any])
async def get_file_at_commit(
    repo_path: str,
    file_path: str,
    commit_hash: str
):
    """
    Get the content of a file at a specific commit
    """
    try:
        if not file_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File path cannot be empty"
            }

        if not commit_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Commit hash cannot be empty"
            )

        git = get_git_service(repo_path)

        # Get the file content at the specified commit
        content = git.get_file_at_commit(file_path, commit_hash)

        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{file_path}' not found at commit {commit_hash}"
            )

        # Get commit details
        commit = git._get_commit(commit_hash)

        return {
            "commit": {
                "hash": commit.hash,
                "message": commit.message,
                "author": commit.author,
                "date": commit.date
            },
            "file_path": file_path,
            "content": content
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file at commit: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file at commit: {str(e)}"
        )

@router.post("/stash", status_code=status.HTTP_200_OK)
async def stash_changes(
    repo_path: str,
    message: str = ""
):
    """
    Stash changes in the working directory
    """
    try:
        git = get_git_service(repo_path)
        success = git.stash(message)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to stash changes"
            )

        return {"status": "success", "message": "Changes stashed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stashing changes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stash changes: {str(e)}"
        )

@router.get("/stash/list", response_model=List[Dict[str, Any]])
async def list_stashes(repo_path: str):
    """
    List all stashed changes
    """
    try:
        git = get_git_service(repo_path)
        stashes = git.stash_list()

        return [
            {
                "index": s["index"],
                "branch": s["branch"],
                "message": s["message"]
            }
            for s in stashes
        ]

    except Exception as e:
        logger.error(f"Error listing stashes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list stashes: {str(e)}"
        )

@router.post("/stash/apply", status_code=status.HTTP_200_OK)
async def apply_stash(
    repo_path: str,
    stash_ref: str = "stash@{0}"
):
    """
    Apply a stashed change
    """
    try:
        git = get_git_service(repo_path)
        success = git.stash_apply(stash_ref)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to apply stash {stash_ref}"
            )

        return {"status": "success", "message": f"Applied stash {stash_ref}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying stash: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply stash: {str(e)}"
        )

@router.post("/stash/drop", status_code=status.HTTP_200_OK)
async def drop_stash(
    repo_path: str,
    stash_ref: str = "stash@{0}"
):
    """
    Drop a stashed change
    """
    try:
        git = get_git_service(repo_path)
        success = git.stash_drop(stash_ref)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to drop stash {stash_ref}"
            )

        return {"status": "success", "message": f"Dropped stash {stash_ref}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error dropping stash: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to drop stash: {str(e)}"
        )

@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_changes(
    repo_path: str,
    commit: str = "HEAD",
    mode: str = "mixed"
):
    """
    Reset the current HEAD to the specified state
    """
    try:
        git = get_git_service(repo_path)
        success = git.reset(commit, mode)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to reset to {commit}"
            )

        return {"status": "success", "message": f"Reset to {commit}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset: {str(e)}"
        )

@router.post("/revert", status_code=status.HTTP_200_OK)
async def revert_commit(
    repo_path: str,
    commit_hash: str
):
    """
    Revert a commit
    """
    try:
        if not commit_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Commit hash cannot be empty"
            )

        git = get_git_service(repo_path)
        success = git.revert(commit_hash)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to revert commit {commit_hash}"
            )

        return {"status": "success", "message": f"Reverted commit {commit_hash}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reverting commit: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revert commit: {str(e)}"
        )

@router.post("/cherry-pick", status_code=status.HTTP_200_OK)
async def cherry_pick_commit(
    repo_path: str,
    commit_hash: str
):
    """
    Cherry-pick a commit
    """
    try:
        if not commit_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Commit hash cannot be empty"
            )

        git = get_git_service(repo_path)
        result = git.cherry_pick(commit_hash)

        if not result['success']:
            if 'conflicts' in result and result['conflicts']:
                return {
                    "status": "conflict",
                    "message": "Merge conflicts detected during cherry-pick",
                    "conflicts": result['conflicts']
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get('error', 'Cherry-pick failed')
                )

        return {
            "status": "success",
            "message": f"Successfully cherry-picked commit {commit_hash}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cherry-picking commit: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cherry-pick commit: {str(e)}"
        )
