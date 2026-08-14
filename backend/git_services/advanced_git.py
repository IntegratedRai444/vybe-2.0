# backend/git/advanced_git.py
"""
Advanced Git Features
Visual merge conflict resolution, Git graph, blame annotations, stash management
"""

import logging
import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class GitCommit:
    hash: str
    short_hash: str
    author: str
    author_email: str
    date: datetime
    message: str
    parents: List[str]
    refs: List[str] = None


@dataclass
class GitBranch:
    name: str
    current: bool
    remote: Optional[str] = None
    ahead: int = 0
    behind: int = 0
    last_commit: Optional[GitCommit] = None


@dataclass
class GitStash:
    index: int
    message: str
    branch: str
    date: datetime
    hash: str


@dataclass
class BlameInfo:
    line_number: int
    commit_hash: str
    author: str
    date: datetime
    content: str


@dataclass
class ConflictMarker:
    start_line: int
    end_line: int
    conflict_type: str  # 'ours', 'theirs', 'base'
    content: str


@dataclass
class MergeConflict:
    file_path: str
    markers: List[ConflictMarker]
    resolved: bool = False


class AdvancedGitService:
    """Advanced Git operations service"""

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path).resolve()
        if not self._is_git_repo():
            raise ValueError(f"Not a git repository: {repo_path}")

    def _is_git_repo(self) -> bool:
        """Check if directory is a git repository"""
        return (self.repo_path / ".git").exists()

    def _run_git_command(
        self, args: List[str], capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """Run git command and return result"""
        cmd = ["git"] + args
        return subprocess.run(
            cmd,
            cwd=self.repo_path,
            capture_output=capture_output,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

    def get_commit_graph(
        self, max_count: int = 100, branch: Optional[str] = None
    ) -> List[GitCommit]:
        """Get commit graph with branch information"""
        try:
            args = [
                "log",
                "--graph",
                "--pretty=format:%H|%h|%an|%ae|%ad|%s|%P|%D",
                "--date=iso",
                f"--max-count={max_count}",
            ]

            if branch:
                args.append(branch)
            else:
                args.append("--all")

            result = self._run_git_command(args)

            if result.returncode != 0:
                logger.error(f"Git log failed: {result.stderr}")
                return []

            commits = []
            for line in result.stdout.split("\n"):
                if "|" in line:
                    # Remove graph characters
                    clean_line = re.sub(r"^[|\\\s*/]+", "", line)
                    if "|" in clean_line:
                        parts = clean_line.split("|")
                        if len(parts) >= 6:
                            commit = GitCommit(
                                hash=parts[0],
                                short_hash=parts[1],
                                author=parts[2],
                                author_email=parts[3],
                                date=datetime.fromisoformat(parts[4].replace(" ", "T")),
                                message=parts[5],
                                parents=parts[6].split()
                                if len(parts) > 6 and parts[6]
                                else [],
                                refs=parts[7].split(", ")
                                if len(parts) > 7 and parts[7]
                                else [],
                            )
                            commits.append(commit)

            return commits

        except Exception as e:
            logger.error(f"Error getting commit graph: {e}")
            return []

    def get_detailed_branches(self) -> List[GitBranch]:
        """Get detailed branch information with ahead/behind counts"""
        try:
            # Get all branches with tracking info
            result = self._run_git_command(
                [
                    "for-each-ref",
                    "--format=%(refname:short)|%(upstream:short)|%(upstream:track)|%(objectname)|%(authordate:iso)",
                    "refs/heads/",
                ]
            )

            if result.returncode != 0:
                return []

            # Get current branch
            current_result = self._run_git_command(["branch", "--show-current"])
            current_branch = (
                current_result.stdout.strip() if current_result.returncode == 0 else ""
            )

            branches = []
            for line in result.stdout.split("\n"):
                if line.strip():
                    parts = line.split("|")
                    if len(parts) >= 4:
                        branch_name = parts[0]
                        upstream = parts[1] if parts[1] else None
                        track_info = parts[2] if len(parts) > 2 else ""
                        commit_hash = parts[3]

                        # Parse ahead/behind from track info
                        ahead, behind = 0, 0
                        if track_info:
                            ahead_match = re.search(r"ahead (\d+)", track_info)
                            behind_match = re.search(r"behind (\d+)", track_info)
                            ahead = int(ahead_match.group(1)) if ahead_match else 0
                            behind = int(behind_match.group(1)) if behind_match else 0

                        # Get last commit info
                        last_commit = self._get_commit_info(commit_hash)

                        branch = GitBranch(
                            name=branch_name,
                            current=branch_name == current_branch,
                            remote=upstream,
                            ahead=ahead,
                            behind=behind,
                            last_commit=last_commit,
                        )
                        branches.append(branch)

            return branches

        except Exception as e:
            logger.error(f"Error getting detailed branches: {e}")
            return []

    def _get_commit_info(self, commit_hash: str) -> Optional[GitCommit]:
        """Get commit information for a specific hash"""
        try:
            result = self._run_git_command(
                [
                    "show",
                    "--format=%H|%h|%an|%ae|%ad|%s|%P",
                    "--date=iso",
                    "--no-patch",
                    commit_hash,
                ]
            )

            if result.returncode == 0 and result.stdout.strip():
                parts = result.stdout.strip().split("|")
                if len(parts) >= 6:
                    return GitCommit(
                        hash=parts[0],
                        short_hash=parts[1],
                        author=parts[2],
                        author_email=parts[3],
                        date=datetime.fromisoformat(parts[4].replace(" ", "T")),
                        message=parts[5],
                        parents=parts[6].split() if len(parts) > 6 and parts[6] else [],
                    )

            return None

        except Exception as e:
            logger.error(f"Error getting commit info: {e}")
            return None

    def get_blame_info(
        self, file_path: str, start_line: int = 1, end_line: Optional[int] = None
    ) -> List[BlameInfo]:
        """Get blame information for a file"""
        try:
            args = ["blame", "--porcelain"]

            if end_line:
                args.extend(["-L", f"{start_line},{end_line}"])
            elif start_line > 1:
                args.extend(["-L", f"{start_line},+1"])

            args.append(file_path)

            result = self._run_git_command(args)

            if result.returncode != 0:
                logger.error(f"Git blame failed: {result.stderr}")
                return []

            blame_info = []
            lines = result.stdout.split("\n")
            i = 0

            while i < len(lines):
                line = lines[i].strip()
                if not line:
                    i += 1
                    continue

                # Parse blame output
                if re.match(r"^[0-9a-f]{40}", line):
                    parts = line.split()
                    commit_hash = parts[0]
                    line_number = int(parts[2])

                    # Look for author and date in following lines
                    author = ""
                    date = None
                    content = ""

                    j = i + 1
                    while j < len(lines) and not re.match(r"^[0-9a-f]{40}", lines[j]):
                        if lines[j].startswith("author "):
                            author = lines[j][7:]
                        elif lines[j].startswith("author-time "):
                            timestamp = int(lines[j][12:])
                            date = datetime.fromtimestamp(timestamp)
                        elif lines[j].startswith("\t"):
                            content = lines[j][1:]
                            break
                        j += 1

                    if date:
                        blame_info.append(
                            BlameInfo(
                                line_number=line_number,
                                commit_hash=commit_hash[:8],
                                author=author,
                                date=date,
                                content=content,
                            )
                        )

                    i = j + 1
                else:
                    i += 1

            return blame_info

        except Exception as e:
            logger.error(f"Error getting blame info: {e}")
            return []

    def get_stash_list(self) -> List[GitStash]:
        """Get list of stashes"""
        try:
            result = self._run_git_command(
                ["stash", "list", "--format=%gd|%s|%gD|%ad|%H", "--date=iso"]
            )

            if result.returncode != 0:
                return []

            stashes = []
            for line in result.stdout.split("\n"):
                if line.strip():
                    parts = line.split("|")
                    if len(parts) >= 5:
                        # Extract stash index from stash@{n}
                        stash_ref = parts[0]
                        index_match = re.search(r"stash@\{(\d+)\}", stash_ref)
                        index = int(index_match.group(1)) if index_match else 0

                        stash = GitStash(
                            index=index,
                            message=parts[1],
                            branch=parts[2].split(": ")[-1]
                            if ": " in parts[2]
                            else parts[2],
                            date=datetime.fromisoformat(parts[3].replace(" ", "T")),
                            hash=parts[4],
                        )
                        stashes.append(stash)

            return stashes

        except Exception as e:
            logger.error(f"Error getting stash list: {e}")
            return []

    def create_stash(
        self, message: Optional[str] = None, include_untracked: bool = False
    ) -> bool:
        """Create a new stash"""
        try:
            args = ["stash", "push"]

            if message:
                args.extend(["-m", message])

            if include_untracked:
                args.append("-u")

            result = self._run_git_command(args)
            return result.returncode == 0

        except Exception as e:
            logger.error(f"Error creating stash: {e}")
            return False

    def apply_stash(self, stash_index: int = 0) -> bool:
        """Apply a stash"""
        try:
            result = self._run_git_command(
                ["stash", "apply", f"stash@{{{stash_index}}}"]
            )
            return result.returncode == 0

        except Exception as e:
            logger.error(f"Error applying stash: {e}")
            return False

    def pop_stash(self, stash_index: int = 0) -> bool:
        """Pop a stash (apply and remove)"""
        try:
            result = self._run_git_command(["stash", "pop", f"stash@{{{stash_index}}}"])
            return result.returncode == 0

        except Exception as e:
            logger.error(f"Error popping stash: {e}")
            return False

    def drop_stash(self, stash_index: int = 0) -> bool:
        """Drop a stash"""
        try:
            result = self._run_git_command(
                ["stash", "drop", f"stash@{{{stash_index}}}"]
            )
            return result.returncode == 0

        except Exception as e:
            logger.error(f"Error dropping stash: {e}")
            return False

    def get_merge_conflicts(self) -> List[MergeConflict]:
        """Get merge conflicts in the repository"""
        try:
            # Get files with conflicts
            result = self._run_git_command(["diff", "--name-only", "--diff-filter=U"])

            if result.returncode != 0:
                return []

            conflict_files = [f.strip() for f in result.stdout.split("\n") if f.strip()]
            conflicts = []

            for file_path in conflict_files:
                file_conflicts = self._parse_conflict_markers(file_path)
                if file_conflicts:
                    conflicts.append(
                        MergeConflict(file_path=file_path, markers=file_conflicts)
                    )

            return conflicts

        except Exception as e:
            logger.error(f"Error getting merge conflicts: {e}")
            return []

    def _parse_conflict_markers(self, file_path: str) -> List[ConflictMarker]:
        """Parse conflict markers in a file"""
        try:
            full_path = self.repo_path / file_path
            if not full_path.exists():
                return []

            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            markers = []
            i = 0

            while i < len(lines):
                line = lines[i].strip()

                if line.startswith("<<<<<<<"):
                    # Start of conflict - "ours"
                    start_line = i + 1
                    content_lines = []
                    i += 1

                    # Find the separator or end
                    while i < len(lines):
                        if lines[i].strip().startswith("======="):
                            # Found separator
                            markers.append(
                                ConflictMarker(
                                    start_line=start_line,
                                    end_line=i,
                                    conflict_type="ours",
                                    content="".join(content_lines),
                                )
                            )

                            # Now parse "theirs" section
                            start_line = i + 1
                            content_lines = []
                            i += 1

                            while i < len(lines):
                                if lines[i].strip().startswith(">>>>>>>"):
                                    markers.append(
                                        ConflictMarker(
                                            start_line=start_line,
                                            end_line=i,
                                            conflict_type="theirs",
                                            content="".join(content_lines),
                                        )
                                    )
                                    break
                                else:
                                    content_lines.append(lines[i])
                                    i += 1
                            break
                        else:
                            content_lines.append(lines[i])
                            i += 1

                i += 1

            return markers

        except Exception as e:
            logger.error(f"Error parsing conflict markers: {e}")
            return []

    def resolve_conflict(
        self, file_path: str, resolution: str, content: Optional[str] = None
    ) -> bool:
        """Resolve a merge conflict"""
        try:
            full_path = self.repo_path / file_path

            if resolution == "ours":
                # Use our version
                result = self._run_git_command(["checkout", "--ours", file_path])
            elif resolution == "theirs":
                # Use their version
                result = self._run_git_command(["checkout", "--theirs", file_path])
            elif resolution == "manual" and content is not None:
                # Use provided content
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)
                result = subprocess.CompletedProcess([], 0)
            else:
                return False

            if result.returncode == 0:
                # Stage the resolved file
                stage_result = self._run_git_command(["add", file_path])
                return stage_result.returncode == 0

            return False

        except Exception as e:
            logger.error(f"Error resolving conflict: {e}")
            return False

    def get_file_history(self, file_path: str, max_count: int = 50) -> List[GitCommit]:
        """Get commit history for a specific file"""
        try:
            result = self._run_git_command(
                [
                    "log",
                    "--follow",
                    "--format=%H|%h|%an|%ae|%ad|%s|%P",
                    "--date=iso",
                    f"--max-count={max_count}",
                    "--",
                    file_path,
                ]
            )

            if result.returncode != 0:
                return []

            commits = []
            for line in result.stdout.split("\n"):
                if line.strip() and "|" in line:
                    parts = line.split("|")
                    if len(parts) >= 6:
                        commit = GitCommit(
                            hash=parts[0],
                            short_hash=parts[1],
                            author=parts[2],
                            author_email=parts[3],
                            date=datetime.fromisoformat(parts[4].replace(" ", "T")),
                            message=parts[5],
                            parents=parts[6].split()
                            if len(parts) > 6 and parts[6]
                            else [],
                        )
                        commits.append(commit)

            return commits

        except Exception as e:
            logger.error(f"Error getting file history: {e}")
            return []

    def compare_branches(self, branch1: str, branch2: str) -> Dict[str, Any]:
        """Compare two branches"""
        try:
            # Get commits in branch1 but not in branch2
            ahead_result = self._run_git_command(
                ["log", "--oneline", f"{branch2}..{branch1}"]
            )

            # Get commits in branch2 but not in branch1
            behind_result = self._run_git_command(
                ["log", "--oneline", f"{branch1}..{branch2}"]
            )

            # Get file differences
            diff_result = self._run_git_command(
                ["diff", "--name-status", f"{branch1}...{branch2}"]
            )

            ahead_commits = [
                line.strip() for line in ahead_result.stdout.split("\n") if line.strip()
            ]
            behind_commits = [
                line.strip()
                for line in behind_result.stdout.split("\n")
                if line.strip()
            ]

            file_changes = []
            if diff_result.returncode == 0:
                for line in diff_result.stdout.split("\n"):
                    if line.strip():
                        parts = line.split("\t")
                        if len(parts) >= 2:
                            file_changes.append({"status": parts[0], "file": parts[1]})

            return {
                "ahead_commits": ahead_commits,
                "behind_commits": behind_commits,
                "file_changes": file_changes,
                "ahead_count": len(ahead_commits),
                "behind_count": len(behind_commits),
            }

        except Exception as e:
            logger.error(f"Error comparing branches: {e}")
            return {
                "ahead_commits": [],
                "behind_commits": [],
                "file_changes": [],
                "ahead_count": 0,
                "behind_count": 0,
            }


# Global instance will be created per repository
def get_advanced_git_service(repo_path: str) -> AdvancedGitService:
    """Get advanced git service for a repository"""
    return AdvancedGitService(repo_path)
