"""
Git Service
Handles Git repository operations including staging, committing, branching, merging, etc.
"""

import logging
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)


class GitStatus(Enum):
    CLEAN = "clean"
    UNTRACKED = "untracked"
    MODIFIED = "modified"
    STAGED = "staged"
    CONFLICT = "conflict"
    AHEAD = "ahead"
    BEHIND = "behind"
    DIVERGED = "diverged"


class FileStatus(Enum):
    UNTRACKED = "untracked"
    MODIFIED = "modified"
    DELETED = "deleted"
    RENAMED = "renamed"
    COPIED = "copied"
    UPDATED = "updated"
    CONFLICT = "conflict"


@dataclass
class GitFile:
    path: str
    status: FileStatus
    staged: bool = False
    conflict: bool = False
    original_path: Optional[str] = None


@dataclass
class GitBranch:
    name: str
    is_current: bool = False
    is_remote: bool = False
    upstream: Optional[str] = None
    ahead: int = 0
    behind: int = 0
    last_commit: Optional[Dict[str, Any]] = None


@dataclass
class GitCommit:
    hash: str
    author: str
    email: str
    date: str
    message: str
    refs: List[str] = field(default_factory=list)
    files_changed: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class GitRemote:
    name: str
    url: str
    fetch: str
    push: str


@dataclass
class GitRepository:
    path: str
    current_branch: str
    branches: List[GitBranch] = field(default_factory=list)
    remotes: List[GitRemote] = field(default_factory=list)
    status: GitStatus = GitStatus.CLEAN
    files: List[GitFile] = field(default_factory=list)
    staged_files: List[GitFile] = field(default_factory=list)
    untracked_files: List[GitFile] = field(default_factory=list)
    conflicts: List[Dict[str, Any]] = field(default_factory=list)
    last_commit: Optional[GitCommit] = None
    ahead: int = 0
    behind: int = 0


class GitService:
    """Service for interacting with Git repositories"""

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path).absolute()
        self._ensure_repo()

    def _ensure_repo(self):
        """Ensure the repository exists and is a Git repository"""
        if not (self.repo_path / ".git").exists():
            self._run_git(["init"])

    def _run_git(self, args: List[str], cwd: Optional[Path] = None, **kwargs) -> str:
        """Run a Git command and return its output"""
        cmd = ["git"] + args
        cwd = cwd or self.repo_path

        try:
            result = subprocess.run(
                cmd, cwd=str(cwd), capture_output=True, text=True, check=True, **kwargs
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            logger.error(f"Git command failed: {' '.join(cmd)}")
            logger.error(f"Error: {e.stderr}")
            raise

    def get_status(self) -> GitRepository:
        """Get the current status of the repository"""
        repo = GitRepository(
            path=str(self.repo_path),
            current_branch=self._get_current_branch(),
            branches=self._list_branches(),
            remotes=self._list_remotes(),
            status=GitStatus.CLEAN,
        )

        # Get status of all files
        status_output = self._run_git(["status", "--porcelain", "-uall"])
        repo.files = self._parse_status_output(status_output)

        # Check for untracked files
        repo.untracked_files = [
            f for f in repo.files if f.status == FileStatus.UNTRACKED
        ]

        # Check for staged changes
        repo.staged_files = [f for f in repo.files if f.staged]

        # Check for conflicts
        conflict_files = [f for f in repo.files if f.conflict]
        if conflict_files:
            repo.status = GitStatus.CONFLICT
            repo.conflicts = self._get_conflicts()

        # Check if working directory is clean
        if not repo.files:
            repo.status = GitStatus.CLEAN
        elif any(f.staged for f in repo.files):
            repo.status = GitStatus.STAGED
        else:
            repo.status = GitStatus.MODIFIED

        # Get branch tracking information
        repo.ahead, repo.behind = self._get_ahead_behind()

        if repo.ahead > 0 and repo.behind > 0:
            repo.status = GitStatus.DIVERGED
        elif repo.ahead > 0:
            repo.status = GitStatus.AHEAD
        elif repo.behind > 0:
            repo.status = GitStatus.BEHIND

        # Get last commit
        try:
            repo.last_commit = self._get_last_commit()
        except subprocess.CalledProcessError:
            # No commits yet
            pass

        return repo

    def _parse_status_output(self, status_output: str) -> List[GitFile]:
        """Parse the output of 'git status --porcelain'"""
        files = []

        for line in status_output.split("\n"):
            if not line.strip():
                continue

            # Parse status line (XY PATH -> ORIG_PATH)
            # X = staged status, Y = working tree status
            # See https://git-scm.com/docs/git-status#_short_format
            match = re.match(r"([ MADRCU?!])([ MADRCU?!])\s+(.+?)(?: -> (.+))?$", line)
            if not match:
                continue

            staged_status, unstaged_status, path1, path2 = match.groups()
            path = path2 if path2 else path1
            original_path = path1 if path2 else None

            # Determine file status
            status = None
            conflict = False

            # Check for merge conflicts
            if staged_status in ("U", "A", "D") or unstaged_status in ("U", "D"):
                status = FileStatus.CONFLICT
                conflict = True
            # Check for staged changes
            elif staged_status != " ":
                if staged_status == "M":
                    status = FileStatus.MODIFIED
                elif staged_status == "A":
                    status = FileStatus.UPDATED
                elif staged_status == "D":
                    status = FileStatus.DELETED
                elif staged_status == "R":
                    status = FileStatus.RENAMED
                elif staged_status == "C":
                    status = FileStatus.COPIED
            # Check for unstaged changes
            elif unstaged_status != " ":
                if unstaged_status == "M":
                    status = FileStatus.MODIFIED
                elif unstaged_status == "?":
                    status = FileStatus.UNTRACKED
                elif unstaged_status == "D":
                    status = FileStatus.DELETED

            if status is not None:
                files.append(
                    GitFile(
                        path=path,
                        status=status,
                        staged=staged_status != " ",
                        conflict=conflict,
                        original_path=original_path if original_path != path else None,
                    )
                )

        return files

    def _get_conflicts(self) -> List[Dict[str, Any]]:
        """Get information about merge conflicts"""
        conflicts = []

        try:
            # Get list of unmerged files
            unmerged = self._run_git(["diff", "--name-only", "--diff-filter=U"])

            for file_path in unmerged.split("\n"):
                if not file_path.strip():
                    continue

                # Get conflict markers
                file_content = (self.repo_path / file_path).read_text(
                    encoding="utf-8", errors="ignore"
                )
                conflict_markers = re.findall(
                    r"<<<<<<<.*?\n(.*?)\n=======\n(.*?)\n>>>>>>>",
                    file_content,
                    re.DOTALL,
                )

                conflicts.append(
                    {
                        "file": file_path,
                        "conflicts": [
                            {"ours": ours.strip(), "theirs": theirs.strip()}
                            for ours, theirs in conflict_markers
                        ],
                    }
                )
        except Exception as e:
            logger.error(f"Error getting conflicts: {e}")

        return conflicts

    def _get_current_branch(self) -> str:
        """Get the name of the current branch"""
        try:
            return self._run_git(["rev-parse", "--abbrev-ref", "HEAD"])
        except subprocess.CalledProcessError:
            # No commits yet
            return "main"  # Default branch name

    def _list_branches(self) -> List[GitBranch]:
        """List all local and remote branches"""
        branches = []
        current_branch = self._get_current_branch()

        # Get local branches
        local_branches = self._run_git(
            ["branch", "--list", "--format=%(refname:short)"]
        ).split("\n")
        for branch in local_branches:
            if not branch.strip():
                continue

            is_current = branch == current_branch
            upstream = None
            ahead = behind = 0

            # Get upstream branch and tracking info
            try:
                upstream = self._run_git(
                    ["rev-parse", "--abbrev-ref", f"{branch}@{{upstream}}"]
                )

                # Get ahead/behind counts
                counts = self._run_git(
                    [
                        "rev-list",
                        "--left-right",
                        "--count",
                        f"{branch}...{branch}@{{upstream}}",
                    ]
                )
                ahead, behind = map(int, counts.split())
            except subprocess.CalledProcessError:
                pass

            # Get last commit
            last_commit = None
            try:
                last_commit = self._get_commit(f"{branch}~0")
            except subprocess.CalledProcessError:
                pass

            branches.append(
                GitBranch(
                    name=branch,
                    is_current=is_current,
                    is_remote=False,
                    upstream=upstream,
                    ahead=ahead,
                    behind=behind,
                    last_commit=last_commit,
                )
            )

        # Get remote branches (excluding remotes/origin/HEAD -> origin/main)
        remote_branches = self._run_git(
            ["branch", "-r", "--list", "--format=%(refname:short)"]
        ).split("\n")
        for branch in remote_branches:
            if not branch.strip() or " -> " in branch or branch.endswith("/HEAD"):
                continue

            # Check if we already have this as a local tracking branch
            if any(b.upstream == branch for b in branches):
                continue

            # Get last commit
            last_commit = None
            try:
                last_commit = self._get_commit(f"{branch}~0")
            except subprocess.CalledProcessError:
                pass

            branches.append(
                GitBranch(name=branch, is_remote=True, last_commit=last_commit)
            )

        return branches

    def _list_remotes(self) -> List[GitRemote]:
        """List all remotes"""
        remotes = []

        try:
            remote_names = self._run_git(["remote"]).split("\n")

            for name in remote_names:
                if not name.strip():
                    continue

                url = self._run_git(["remote", "get-url", name])
                fetch = self._run_git(["remote", "get-url", "--push", name])
                push = self._run_git(["remote", "get-url", "--push", name])

                remotes.append(GitRemote(name=name, url=url, fetch=fetch, push=push))
        except subprocess.CalledProcessError:
            pass

        return remotes

    def _get_ahead_behind(self) -> Tuple[int, int]:
        """Get number of commits ahead/behind upstream"""
        try:
            branch = self._get_current_branch()
            counts = self._run_git(
                [
                    "rev-list",
                    "--left-right",
                    "--count",
                    f"{branch}...{branch}@{{upstream}}",
                ]
            )
            return tuple(map(int, counts.split()))
        except subprocess.CalledProcessError:
            return 0, 0

    def _get_last_commit(self) -> GitCommit:
        """Get the last commit on the current branch"""
        return self._get_commit("HEAD")

    def _get_commit(self, ref: str) -> GitCommit:
        """Get commit information for a specific reference"""
        # Get commit details
        commit_format = "%H%n%an%n%ae%n%ad%n%B%n%n%N"
        commit_info = self._run_git(
            ["show", "--no-patch", f"--format={commit_format}", "--date=iso", ref]
        ).split("\n", 5)

        if len(commit_info) < 5:
            raise ValueError(f"Invalid commit reference: {ref}")

        commit_hash, author, email, date, *rest = commit_info
        message = rest[0] if rest else ""

        # Get refs (branches, tags) pointing to this commit
        refs = self._run_git(["show-ref", "--heads", "--tags", "-d", "--dereference"])

        matching_refs = []
        for line in refs.split("\n"):
            if not line.strip():
                continue

            ref_hash, ref_name = line.split(" ", 1)
            if ref_hash == commit_hash:
                # Clean up ref name (remove 'refs/heads/' or 'refs/tags/')
                for prefix in ("refs/heads/", "refs/tags/"):
                    if ref_name.startswith(prefix):
                        ref_name = ref_name[len(prefix) :]
                        break
                matching_refs.append(ref_name)

        # Get files changed in this commit
        files = []
        try:
            files_output = self._run_git(
                ["show", "--name-status", "--pretty=format:", "--no-renames", ref]
            )

            for line in files_output.split("\n"):
                if not line.strip():
                    continue

                status, path = line.split("\t", 1)
                files.append({"status": status, "path": path})
        except subprocess.CalledProcessError:
            pass

        return GitCommit(
            hash=commit_hash,
            author=author,
            email=email,
            date=date,
            message=message.strip(),
            refs=matching_refs,
            files_changed=files,
        )

    # --- High-level Git operations ---

    def stage_files(self, paths: List[str]) -> bool:
        """Stage files for commit"""
        if not paths:
            return False

        try:
            self._run_git(["add", "--"] + paths)
            return True
        except subprocess.CalledProcessError:
            return False

    def unstage_files(self, paths: List[str]) -> bool:
        """Unstage files"""
        if not paths:
            return False

        try:
            self._run_git(["restore", "--staged", "--"] + paths)
            return True
        except subprocess.CalledProcessError:
            return False

    def discard_changes(self, paths: List[str]) -> bool:
        """Discard changes in working directory"""
        if not paths:
            return False

        try:
            # For unstaged changes
            self._run_git(["checkout", "--"] + paths)
            return True
        except subprocess.CalledProcessError:
            return False

    def commit(self, message: str, all_files: bool = False) -> bool:
        """Create a new commit"""
        try:
            if all_files:
                self._run_git(["add", "."])

            self._run_git(["commit", "-m", message])
            return True
        except subprocess.CalledProcessError:
            return False

    def create_branch(self, name: str, checkout: bool = True) -> bool:
        """Create a new branch"""
        try:
            if checkout:
                self._run_git(["checkout", "-b", name])
            else:
                self._run_git(["branch", name])
            return True
        except subprocess.CalledProcessError:
            return False

    def delete_branch(self, name: str, force: bool = False) -> bool:
        """Delete a branch"""
        try:
            args = ["branch", "--delete"]
            if force:
                args.append("--force")
            args.append(name)

            self._run_git(args)
            return True
        except subprocess.CalledProcessError:
            return False

    def checkout(self, ref: str, create: bool = False) -> bool:
        """Checkout a branch or commit"""
        try:
            if create:
                self._run_git(["checkout", "-b", ref])
            else:
                self._run_git(["checkout", ref])
            return True
        except subprocess.CalledProcessError:
            return False

    def merge(self, branch: str, no_ff: bool = True) -> Dict[str, Any]:
        """Merge a branch into the current branch"""
        try:
            args = ["merge"]
            if no_ff:
                args.append("--no-ff")
            args.append(branch)

            output = self._run_git(args)
            return {"success": True, "message": output}
        except subprocess.CalledProcessError as e:
            return {
                "success": False,
                "error": e.stderr,
                "conflicts": self._get_conflicts() if "conflict" in e.stderr else [],
            }

    def abort_merge(self) -> bool:
        """Abort an in-progress merge"""
        try:
            self._run_git(["merge", "--abort"])
            return True
        except subprocess.CalledProcessError:
            return False

    def resolve_conflict(self, file_path: str, content: str) -> bool:
        """Resolve a merge conflict by providing the resolved content"""
        try:
            # Write the resolved content to the file
            (self.repo_path / file_path).write_text(content, encoding="utf-8")

            # Mark as resolved
            self._run_git(["add", file_path])
            return True
        except Exception as e:
            logger.error(f"Error resolving conflict: {e}")
            return False

    def push(self, remote: str = "origin", branch: Optional[str] = None) -> bool:
        """Push changes to a remote repository"""
        try:
            if branch is None:
                branch = self._get_current_branch()

            self._run_git(["push", "--set-upstream", remote, branch])
            return True
        except subprocess.CalledProcessError:
            return False

    def pull(
        self, remote: str = "origin", branch: Optional[str] = None
    ) -> Dict[str, Any]:
        """Pull changes from a remote repository"""
        try:
            if branch is None:
                branch = self._get_current_branch()

            output = self._run_git(["pull", remote, branch])
            return {"success": True, "message": output}
        except subprocess.CalledProcessError as e:
            return {
                "success": False,
                "error": e.stderr,
                "conflicts": self._get_conflicts() if "conflict" in e.stderr else [],
            }

    def fetch(self, remote: str = "origin") -> bool:
        """Fetch changes from a remote repository"""
        try:
            self._run_git(["fetch", remote])
            return True
        except subprocess.CalledProcessError:
            return False

    def get_commit_history(self, limit: int = 50) -> List[GitCommit]:
        """Get commit history"""
        try:
            # Get commit hashes
            commit_hashes = self._run_git(
                ["log", f"-n {limit}", "--pretty=format:%H", "--no-merges"]
            ).split("\n")

            # Get details for each commit
            commits = []
            for commit_hash in commit_hashes:
                if not commit_hash.strip():
                    continue

                try:
                    commit = self._get_commit(commit_hash)
                    commits.append(commit)
                except (subprocess.CalledProcessError, ValueError):
                    continue

            return commits

        except subprocess.CalledProcessError:
            return []

    def get_file_history(self, file_path: str) -> List[Dict[str, Any]]:
        """Get commit history for a specific file"""
        try:
            # Get commit hashes that modified the file
            commits = self._run_git(
                [
                    "log",
                    "--follow",
                    "--pretty=format:%H",
                    "--no-merges",
                    "--",
                    file_path,
                ]
            ).split("\n")

            history = []
            for commit_hash in commits:
                if not commit_hash.strip():
                    continue

                try:
                    # Get commit details
                    commit = self._get_commit(commit_hash)

                    # Get file content at this commit
                    try:
                        content = self._run_git(["show", f"{commit_hash}:{file_path}"])
                    except subprocess.CalledProcessError:
                        content = "[File not found at this commit]"

                    history.append(
                        {
                            "commit": {
                                "hash": commit.hash,
                                "message": commit.message,
                                "author": commit.author,
                                "date": commit.date,
                            },
                            "content": content,
                        }
                    )
                except (subprocess.CalledProcessError, ValueError):
                    continue

            return history

        except subprocess.CalledProcessError:
            return []

    def get_file_at_commit(self, file_path: str, commit_hash: str) -> Optional[str]:
        """Get the content of a file at a specific commit"""
        try:
            return self._run_git(["show", f"{commit_hash}:{file_path}"])
        except subprocess.CalledProcessError:
            return None

    def create_tag(
        self, name: str, message: str = "", commit_hash: str = "HEAD"
    ) -> bool:
        """Create a new tag"""
        try:
            if message:
                self._run_git(["tag", "-a", name, "-m", message, commit_hash])
            else:
                self._run_git(["tag", name, commit_hash])
            return True
        except subprocess.CalledProcessError:
            return False

    def delete_tag(self, name: str) -> bool:
        """Delete a tag"""
        try:
            self._run_git(["tag", "-d", name])
            return True
        except subprocess.CalledProcessError:
            return False

    def push_tag(self, name: str, remote: str = "origin") -> bool:
        """Push a tag to a remote repository"""
        try:
            self._run_git(["push", remote, name])
            return True
        except subprocess.CalledProcessError:
            return False

    def stash(self, message: str = "") -> bool:
        """Stash changes in the working directory"""
        try:
            args = ["stash", "push"]
            if message:
                args.extend(["-m", message])
            self._run_git(args)
            return True
        except subprocess.CalledProcessError:
            return False

    def stash_list(self) -> List[Dict[str, str]]:
        """List stashed changes"""
        try:
            stashes = []
            stash_list = self._run_git(["stash", "list"])

            for line in stash_list.split("\n"):
                if not line.strip():
                    continue

                # Format: stash@{0}: On branch: message
                match = re.match(r"^stash@\{(\d+)\}: (.*?)(?:: (.*))?$", line)
                if match:
                    index, branch, message = match.groups()
                    stashes.append(
                        {
                            "index": int(index),
                            "branch": branch.split(" ")[
                                -1
                            ],  # Extract branch name from "On branch name"
                            "message": message or "",
                        }
                    )

            return stashes

        except subprocess.CalledProcessError:
            return []

    def stash_apply(self, stash_ref: str = "stash@{0}") -> bool:
        """Apply a stashed change"""
        try:
            self._run_git(["stash", "apply", stash_ref])
            return True
        except subprocess.CalledProcessError:
            return False

    def stash_drop(self, stash_ref: str = "stash@{0}") -> bool:
        """Drop a stashed change"""
        try:
            self._run_git(["stash", "drop", stash_ref])
            return True
        except subprocess.CalledProcessError:
            return False

    def reset(self, commit: str = "HEAD", mode: str = "mixed") -> bool:
        """Reset the current HEAD to the specified state"""
        try:
            self._run_git(["reset", f"--{mode}", commit])
            return True
        except subprocess.CalledProcessError:
            return False

    def revert(self, commit_hash: str) -> bool:
        """Revert a commit"""
        try:
            self._run_git(["revert", "--no-commit", commit_hash])
            return True
        except subprocess.CalledProcessError:
            return False

    def cherry_pick(self, commit_hash: str) -> Dict[str, Any]:
        """Apply the changes from an existing commit"""
        try:
            output = self._run_git(["cherry-pick", commit_hash])
            return {"success": True, "message": output}
        except subprocess.CalledProcessError as e:
            return {
                "success": False,
                "error": e.stderr,
                "conflicts": self._get_conflicts() if "conflict" in e.stderr else [],
            }

    def init_repository(self) -> bool:
        """Initialize a new Git repository"""
        try:
            self._run_git(["init"])
            return True
        except subprocess.CalledProcessError:
            return False

    def clone_repository(self, url: str, target_dir: Optional[str] = None) -> bool:
        """Clone a remote repository"""
        try:
            args = ["clone", url]
            if target_dir:
                args.append(target_dir)

            # Clone into a temporary directory first
            with tempfile.TemporaryDirectory() as tmp_dir:
                self._run_git(args, cwd=Path(tmp_dir))

                # Move to the target directory
                if target_dir:
                    src_dir = Path(tmp_dir) / target_dir
                else:
                    # Extract repo name from URL
                    repo_name = url.split("/")[-1].replace(".git", "")
                    src_dir = Path(tmp_dir) / repo_name

                # If target directory exists, merge contents
                if self.repo_path.exists():
                    # Copy all files except .git directory
                    for item in src_dir.glob("*"):
                        if item.name != ".git":
                            dest = self.repo_path / item.name
                            if item.is_dir():
                                shutil.copytree(item, dest, dirs_exist_ok=True)
                            else:
                                shutil.copy2(item, dest)
                else:
                    # Move the entire directory
                    shutil.move(str(src_dir), str(self.repo_path))

            return True

        except (subprocess.CalledProcessError, OSError) as e:
            logger.error(f"Error cloning repository: {e}")
            return False


# Global Git service instance
git_service = GitService(Path.cwd())
