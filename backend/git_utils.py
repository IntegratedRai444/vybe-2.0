from git import Repo, InvalidGitRepositoryError
from pathlib import Path
import difflib

def open_repo(root: str) -> Repo:
    return Repo(root, search_parent_directories=True)

def repo_status(root: str):
    repo = open_repo(root)
    
    staged = []
    for item in repo.index.diff('HEAD'):
        status = 'A' # Added
        if item.new_file:
            status = 'A'
        elif item.deleted_file:
            status = 'D'
        elif item.renamed:
            status = 'R'
        else:
            status = 'M' # Modified
        staged.append({"path": item.a_path, "status": status})

    unstaged = []
    for item in repo.index.diff(None):
        unstaged.append({"path": item.a_path, "status": "M"})

    untracked = repo.untracked_files

    return {
        "staged": staged,
        "unstaged": unstaged,
        "untracked": [{"path": path, "status": "??"} for path in untracked]
    }

def file_diff(root: str, rel_path: str):
    repo = open_repo(root)
    try:
        blob = repo.head.commit.tree / rel_path
        old = blob.data_stream.read().decode()
    except Exception:
        old = ""
    new = Path(root) / rel_path
    if not new.is_file():
        return ""
    new_txt = new.read_text(encoding="utf-8", errors="ignore")
    diff = difflib.unified_diff(
        old.splitlines(),
        new_txt.splitlines(),
        fromfile="a/"+rel_path,
        tofile="b/"+rel_path,
        lineterm=""
    )
    return "\n".join(diff)

def stage_files(root: str, paths: list[str]):
    repo = open_repo(root)
    repo.index.add(paths)

def commit_repo(root: str, message: str):
    repo = open_repo(root)
    commit = repo.index.commit(message)
    return commit.hexsha

def git_push(root: str, remote: str = "origin", branch: str = None):
    """Push commits to remote repository"""
    repo = open_repo(root)
    
    if branch is None:
        branch = repo.active_branch.name
    
    try:
        origin = repo.remote(remote)
        push_info = origin.push(branch)
        
        results = []
        for info in push_info:
            results.append({
                "remote": remote,
                "branch": branch,
                "flags": info.flags,
                "summary": info.summary
            })
        
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def git_pull(root: str, remote: str = "origin", branch: str = None):
    """Pull changes from remote repository"""
    repo = open_repo(root)
    
    if branch is None:
        branch = repo.active_branch.name
    
    try:
        origin = repo.remote(remote)
        pull_info = origin.pull(branch)
        
        results = []
        for info in pull_info:
            results.append({
                "remote": remote,
                "branch": branch,
                "flags": info.flags,
                "commit": info.commit.hexsha if info.commit else None
            })
        
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def git_fetch(root: str, remote: str = "origin"):
    """Fetch changes from remote repository"""
    repo = open_repo(root)
    
    try:
        origin = repo.remote(remote)
        fetch_info = origin.fetch()
        
        results = []
        for info in fetch_info:
            results.append({
                "remote": remote,
                "ref": info.name,
                "flags": info.flags
            })
        
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def git_clone(url: str, target_dir: str, branch: str = None):
    """Clone a repository"""
    try:
        if branch:
            repo = Repo.clone_from(url, target_dir, branch=branch)
        else:
            repo = Repo.clone_from(url, target_dir)
        
        return {
            "status": "success",
            "path": target_dir,
            "branch": repo.active_branch.name
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def git_remotes(root: str):
    """List remote repositories"""
    repo = open_repo(root)
    
    remotes = []
    for remote in repo.remotes:
        remotes.append({
            "name": remote.name,
            "urls": list(remote.urls)
        })
    
    return {"remotes": remotes}

def git_add_remote(root: str, name: str, url: str):
    """Add a remote repository"""
    repo = open_repo(root)
    
    try:
        repo.create_remote(name, url)
        return {"status": "success", "remote": name, "url": url}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def git_remove_remote(root: str, name: str):
    """Remove a remote repository"""
    repo = open_repo(root)
    
    try:
        repo.delete_remote(name)
        return {"status": "success", "remote": name}
    except Exception as e:
        return {"status": "error", "message": str(e)}