# backend/main.py
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Body, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import uuid
import asyncio

from orchestrator import handle_request, VECTOR_STORE
from indexer import index_project
from fastapi.middleware.cors import CORSMiddleware
from git_utils import repo_status, file_diff, stage_files, commit_repo, git_push, git_pull, git_remotes
from git import Repo
from mcp.main import MCPService
from mcp.models import ScanRequest, FixRequest, ExplainRequest
from mcp.scanner import CodeScanner
from mcp.config import MCPConfig
from database.chat_db import get_chat_db
from sandbox.vulnerability_scanner import get_vulnerability_scanner
from sandbox.secrets_detector import get_secrets_detector
from sandbox.docker_sandbox import get_sandbox
from collaboration.session_manager import session_manager, handle_websocket_message, User
import requests

# Initialize FastAPI app early so decorators work
app = FastAPI(title="Cursor‑Clone Backend")

# CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FolderNode(BaseModel):
    path: str          # relative to root
    name: str
    type: str          # "folder" or "file"
    children: List["FolderNode"] | None = None   # recursive

FolderNode.model_rebuild()

def build_tree(root: Path, rel: Path = Path("")) -> FolderNode:
    cur = root / rel
    node = FolderNode(
        path=str(rel),
        name=cur.name,
        type="folder",
        children=[],
    )
    for entry in sorted(cur.iterdir()):
        if entry.name.startswith("."):
            continue
        r = rel / entry.name
        if entry.is_dir():
            node.children.append(build_tree(root, r))
        else:
            node.children.append(
                FolderNode(path=str(r), name=entry.name, type="file", children=None)
            )
    return node

# Files/folders API aligned with frontend
@app.get("/files")
def list_files(root: str):
    root_path = Path(root).expanduser().resolve()
    if not root_path.is_dir():
        raise HTTPException(404, "Root not found")
    tree = build_tree(root_path)
    return tree

# Back-compat alias
@app.get("/folder")
def get_folder(root: str):
    return list_files(root)

# ----------------------------------------------------------------------
# 1️⃣  Project indexing -------------------------------------------------
# ----------------------------------------------------------------------
class IndexRequest(BaseModel):
    root: str                     # absolute path of the project folder

@app.post("/index")
async def index(req: IndexRequest):
    root = Path(req.root).expanduser().resolve()
    if not root.is_dir():
        raise HTTPException(404, f"Folder {root} not found")
    # (re)index – this can be long, so we run it in a thread pool
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, index_project, root, VECTOR_STORE)
    return {"status": "ok", "chunks": len(VECTOR_STORE.metadata)}


# ----------------------------------------------------------------------
# 2️⃣  Search – semantic retrieval ---------------------------------------
# ----------------------------------------------------------------------
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/search")
def search(req: SearchRequest):
    from ollama_client import embed
    q_vec = embed(req.query, model="all-minilm")
    results = VECTOR_STORE.search(q_vec, k=req.top_k)
    return {"chunks": results}


# ----------------------------------------------------------------------
# 3️⃣  Generation – LLM completion ---------------------------------------
# ----------------------------------------------------------------------
class GenerateRequest(BaseModel):
    prompt: str                # user prompt (e.g. “Write a test …”)
    file_path: str             # relative to project root (used for model routing)
    model: Optional[str] = None
    top_k: int = 5

@app.post("/generate")
def generate(req: GenerateRequest):
    answer = handle_request(
        user_prompt=req.prompt,
        file_path=req.file_path,
        model_override=req.model,
        top_k=req.top_k,
    )
    return {"answer": answer}


# ----------------------------------------------------------------------
# 4️⃣  File read / write -------------------------------------------------
# ----------------------------------------------------------------------
@app.get("/file")
def read_file(path: str, root: str):
    file_path = Path(root).expanduser().resolve() / path
    if not file_path.is_file():
        raise HTTPException(404, "File not found")
    return {"content": file_path.read_text(encoding="utf-8")}


@app.post("/file")
def write_file(path: str, root: str, content: str = Body(..., embed=True)):
    file_path = Path(root).expanduser().resolve() / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")
    return {"status": "saved"}

# New endpoints expected by frontend API client
@app.get("/file/content")
def get_file_content(path: str):
    p = Path(path).expanduser().resolve()
    if not p.is_file():
        raise HTTPException(404, "File not found")
    return {"content": p.read_text(encoding="utf-8", errors="ignore")}

class SaveRequest(BaseModel):
    path: str
    content: str

@app.post("/file/save")
def save_file(req: SaveRequest):
    p = Path(req.path).expanduser().resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(req.content, encoding="utf-8")
    return {"status": "saved"}

class CreateFileRequest(BaseModel):
    path: str
    content: Optional[str] = ""

@app.post("/file/create")
def create_file(req: CreateFileRequest):
    p = Path(req.path).expanduser().resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        raise HTTPException(400, "File already exists")
    p.write_text(req.content or "", encoding="utf-8")
    return {"status": "created"}

class RenameRequest(BaseModel):
    old_path: str
    new_path: str

@app.post("/file/rename")
def rename_file(req: RenameRequest):
    old_p = Path(req.old_path).expanduser().resolve()
    new_p = Path(req.new_path).expanduser().resolve()
    if not old_p.exists():
        raise HTTPException(404, "Source not found")
    new_p.parent.mkdir(parents=True, exist_ok=True)
    old_p.rename(new_p)
    return {"status": "renamed"}

@app.delete("/file/delete")
def delete_file_or_folder(path: str):
    p = Path(path).expanduser().resolve()
    if not p.exists():
        return JSONResponse({"status": "not_found"}, status_code=404)
    if p.is_dir():
        import shutil
        shutil.rmtree(p)
    else:
        p.unlink()
    return {"status": "deleted"}

# ------------------- Git endpoints -------------------------
@app.get("/git/status")
def git_status(root: str):
    try:
        return repo_status(root)
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/git/diff")
def git_diff(root: str, path: str):
    try:
        return {"diff": file_diff(root, path)}
    except Exception as e:
        raise HTTPException(400, str(e))

class StageRequest(BaseModel):
    root: str
    paths: List[str]

@app.post("/git/stage")
def git_stage(req: StageRequest):
    try:
        stage_files(req.root, req.paths)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

class CommitRequest(BaseModel):
    root: str
    message: str

@app.post("/git/commit")
def git_commit(req: CommitRequest):
    try:
        sha = commit_repo(req.root, req.message)
        return {"status": "ok", "commit": sha}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/git/push")
def http_git_push(root: str, remote: str = "origin", branch: Optional[str] = None):
    res = git_push(root, remote, branch)
    if res.get("status") == "error":
        raise HTTPException(400, res.get("message", "push failed"))
    return res

@app.post("/git/pull")
def http_git_pull(root: str, remote: str = "origin", branch: Optional[str] = None):
    res = git_pull(root, remote, branch)
    if res.get("status") == "error":
        raise HTTPException(400, res.get("message", "pull failed"))
    return res

@app.get("/git/remotes")
def http_git_remotes(root: str):
    try:
        return git_remotes(root)
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/git/branches")
def http_git_branches(root: str):
    try:
        repo = Repo(root)
        branches = [h.name for h in repo.branches]
        current = repo.active_branch.name if not repo.head.is_detached else None
        return {"branches": branches, "current": current}
    except Exception as e:
        raise HTTPException(400, str(e))

class CheckoutRequest(BaseModel):
    root: str
    branch: str

@app.post("/git/checkout")
def http_git_checkout(req: CheckoutRequest):
    try:
        repo = Repo(req.root)
        repo.git.checkout(req.branch)
        return {"status": "ok", "current": req.branch}
    except Exception as e:
        raise HTTPException(400, str(e))

# Advanced Git endpoints
class UnstageRequest(BaseModel):
    root: str
    files: List[str]

@app.post("/git/unstage")
def git_unstage(req: UnstageRequest):
    try:
        repo = Repo(req.root)
        for file_path in req.files:
            repo.git.reset("HEAD", file_path)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

class BranchRequest(BaseModel):
    root: str
    name: str

@app.post("/git/branch")
def git_create_branch(req: BranchRequest):
    try:
        repo = Repo(req.root)
        new_branch = repo.create_head(req.name)
        return {"status": "ok", "branch": req.name}
    except Exception as e:
        raise HTTPException(400, str(e))

class DeleteBranchRequest(BaseModel):
    root: str
    name: str

@app.delete("/git/branch")
def git_delete_branch(req: DeleteBranchRequest):
    try:
        repo = Repo(req.root)
        repo.delete_head(req.name)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/git/conflicts")
def git_conflicts(root: str):
    try:
        repo = Repo(root)
        conflicts = []
        
        # Check for merge conflicts
        for item in repo.index.unmerged_blobs():
            conflicts.append({
                "file": item[0],
                "status": "unmerged",
                "conflicts": []
            })
        
        return {"conflicts": conflicts}
    except Exception as e:
        raise HTTPException(400, str(e))

class ResolveConflictRequest(BaseModel):
    root: str
    file: str
    resolution: str  # 'ours', 'theirs', 'manual'

@app.post("/git/resolve-conflict")
def git_resolve_conflict(req: ResolveConflictRequest):
    try:
        repo = Repo(req.root)
        
        if req.resolution == 'ours':
            repo.git.checkout('--ours', req.file)
        elif req.resolution == 'theirs':
            repo.git.checkout('--theirs', req.file)
        elif req.resolution == 'manual':
            # For manual resolution, just return - user will edit file manually
            pass
        
        # Add the resolved file
        repo.git.add(req.file)
        
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/git/branches/detailed")
def git_branches_detailed(root: str):
    try:
        repo = Repo(root)
        branches = []
        
        for branch in repo.branches:
            branch_info = {
                "name": branch.name,
                "current": branch == repo.active_branch,
                "ahead": 0,
                "behind": 0,
                "lastCommit": "",
                "author": ""
            }
            
            # Get commit info
            if branch.commit:
                branch_info["lastCommit"] = branch.commit.message.split('\n')[0][:50]
                branch_info["author"] = branch.commit.author.name
            
            # Get ahead/behind info (simplified)
            try:
                if branch.tracking_branch():
                    commits_ahead = list(repo.iter_commits(f"{branch.tracking_branch()}..{branch}"))
                    commits_behind = list(repo.iter_commits(f"{branch}..{branch.tracking_branch()}"))
                    branch_info["ahead"] = len(commits_ahead)
                    branch_info["behind"] = len(commits_behind)
            except:
                pass
            
            branches.append(branch_info)
        
        return {"branches": branches}
    except Exception as e:
        raise HTTPException(400, str(e))

# IntelliSense endpoints
class IntelliSenseRequest(BaseModel):
    content: str
    position: dict
    language: str
    filePath: str

class IntelliSenseRangeRequest(BaseModel):
    content: str
    range: dict
    language: str
    filePath: str

@app.post("/intellisense/suggestions")
def intellisense_suggestions(req: IntelliSenseRequest):
    """Provide code completion suggestions"""
    try:
        # Basic keyword suggestions based on language
        suggestions = []
        
        if req.language in ['py', 'python']:
            suggestions = [
                {"label": "def", "kind": "keyword", "detail": "Define function", "insertText": "def "},
                {"label": "class", "kind": "keyword", "detail": "Define class", "insertText": "class "},
                {"label": "if", "kind": "keyword", "detail": "If statement", "insertText": "if "},
                {"label": "for", "kind": "keyword", "detail": "For loop", "insertText": "for "},
                {"label": "while", "kind": "keyword", "detail": "While loop", "insertText": "while "},
                {"label": "import", "kind": "keyword", "detail": "Import module", "insertText": "import "},
                {"label": "from", "kind": "keyword", "detail": "From import", "insertText": "from "},
                {"label": "return", "kind": "keyword", "detail": "Return value", "insertText": "return "},
                {"label": "print", "kind": "function", "detail": "Print function", "insertText": "print()"},
            ]
        elif req.language in ['js', 'javascript', 'ts', 'typescript']:
            suggestions = [
                {"label": "function", "kind": "keyword", "detail": "Define function", "insertText": "function "},
                {"label": "const", "kind": "keyword", "detail": "Constant declaration", "insertText": "const "},
                {"label": "let", "kind": "keyword", "detail": "Variable declaration", "insertText": "let "},
                {"label": "var", "kind": "keyword", "detail": "Variable declaration", "insertText": "var "},
                {"label": "if", "kind": "keyword", "detail": "If statement", "insertText": "if "},
                {"label": "for", "kind": "keyword", "detail": "For loop", "insertText": "for "},
                {"label": "while", "kind": "keyword", "detail": "While loop", "insertText": "while "},
                {"label": "return", "kind": "keyword", "detail": "Return value", "insertText": "return "},
                {"label": "console.log", "kind": "function", "detail": "Console log", "insertText": "console.log()"},
            ]
        
        return suggestions
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/intellisense/hover")
def intellisense_hover(req: IntelliSenseRequest):
    """Provide hover information"""
    try:
        # Basic hover info - could be enhanced with AST parsing
        return {
            "title": "Symbol Information",
            "content": "Hover information would be provided here",
            "range": req.position
        }
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/intellisense/signature")
def intellisense_signature(req: IntelliSenseRequest):
    """Provide signature help"""
    try:
        return {
            "signatures": [
                {
                    "label": "function_name(param1, param2)",
                    "documentation": "Function documentation",
                    "parameters": [
                        {"label": "param1", "documentation": "First parameter"},
                        {"label": "param2", "documentation": "Second parameter"}
                    ]
                }
            ],
            "activeSignature": 0,
            "activeParameter": 0
        }
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/intellisense/actions")
def intellisense_actions(req: IntelliSenseRangeRequest):
    """Provide code actions"""
    try:
        return [
            {
                "title": "Quick Fix",
                "kind": "quickfix",
                "edit": {
                    "edits": [{
                        "resource": req.filePath,
                        "edit": {
                            "range": req.range,
                            "text": "Fixed code"
                        }
                    }]
                }
            }
        ]
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/intellisense/definition")
def intellisense_definition(req: IntelliSenseRequest):
    """Provide definition location"""
    try:
        return {
            "uri": req.filePath,
            "range": {
                "startLineNumber": 1,
                "endLineNumber": 1,
                "startColumn": 1,
                "endColumn": 10
            }
        }
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/intellisense/references")
def intellisense_references(req: IntelliSenseRequest):
    """Provide reference locations"""
    try:
        return [
            {
                "uri": req.filePath,
                "range": {
                    "startLineNumber": 1,
                    "endLineNumber": 1,
                    "startColumn": 1,
                    "endColumn": 10
                }
            }
        ]
    except Exception as e:
        raise HTTPException(400, str(e))

# Debug endpoints
class BreakpointRequest(BaseModel):
    file: str
    line: int

class DebugStartRequest(BaseModel):
    file: str

@app.get("/debug/breakpoints")
def get_breakpoints(file: str):
    """Get breakpoints for a file"""
    try:
        # Mock breakpoints - in real implementation, this would read from a database
        breakpoints = [
            {
                "id": "bp1",
                "file": file,
                "line": 10,
                "enabled": True,
                "condition": None,
                "hitCount": 0
            }
        ]
        return {"breakpoints": breakpoints}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/breakpoint/toggle")
def toggle_breakpoint(req: BreakpointRequest):
    """Toggle a breakpoint"""
    try:
        # Mock implementation - in real implementation, this would update a database
        return {"status": "ok", "enabled": True}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/start")
def start_debugging(req: DebugStartRequest):
    """Start debugging session"""
    try:
        # Mock debug session
        session = {
            "id": "debug_session_1",
            "name": f"Debug {req.file}",
            "status": "running",
            "currentFile": req.file,
            "currentLine": 1,
            "variables": [
                {"name": "x", "value": "10", "type": "int", "scope": "local"},
                {"name": "y", "value": "20", "type": "int", "scope": "local"}
            ],
            "callStack": [
                {"file": req.file, "line": 1, "function": "main()"},
                {"file": req.file, "line": 5, "function": "helper()"}
            ]
        }
        return {"session": session}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/stop")
def stop_debugging():
    """Stop debugging session"""
    try:
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/pause")
def pause_debugging():
    """Pause debugging session"""
    try:
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/resume")
def resume_debugging():
    """Resume debugging session"""
    try:
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/step-over")
def step_over():
    """Step over current line"""
    try:
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/step-into")
def step_into():
    """Step into function call"""
    try:
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/debug/step-out")
def step_out():
    """Step out of current function"""
    try:
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/debug/session")
def get_debug_session():
    """Get current debug session"""
    try:
        # Mock session - in real implementation, this would read from a database
        session = {
            "id": "debug_session_1",
            "name": "Debug Session",
            "status": "paused",
            "currentFile": "main.py",
            "currentLine": 15,
            "variables": [
                {"name": "x", "value": "10", "type": "int", "scope": "local"},
                {"name": "y", "value": "20", "type": "int", "scope": "local"}
            ],
            "callStack": [
                {"file": "main.py", "line": 15, "function": "main()"},
                {"file": "main.py", "line": 5, "function": "helper()"}
            ]
        }
        return {"session": session}
    except Exception as e:
        raise HTTPException(400, str(e))

# Terminal endpoints
class TerminalPasteRequest(BaseModel):
    text: str

class TerminalUploadRequest(BaseModel):
    content: str

@app.get("/terminal/copy/{terminal_id}")
def copy_terminal_output(terminal_id: str):
    """Copy terminal output to clipboard"""
    try:
        # Mock implementation - in real implementation, this would get output from terminal
        return {"output": "Terminal output copied"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/terminal/paste/{terminal_id}")
def paste_to_terminal(terminal_id: str, req: TerminalPasteRequest):
    """Paste text to terminal"""
    try:
        # Mock implementation - in real implementation, this would send text to terminal
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/terminal/download/{terminal_id}")
def download_terminal_output(terminal_id: str):
    """Download terminal output as file"""
    try:
        # Mock implementation - in real implementation, this would get output from terminal
        output = "Terminal output content"
        return Response(
            content=output,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=terminal-{terminal_id}-output.txt"}
        )
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/terminal/upload/{terminal_id}")
def upload_to_terminal(terminal_id: str, req: TerminalUploadRequest):
    """Upload file content to terminal"""
    try:
        # Mock implementation - in real implementation, this would send content to terminal
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/terminal/shells")
def get_available_shells():
    """Get list of available shells"""
    try:
        shells = ['cmd.exe', 'powershell.exe', 'bash', 'zsh', 'fish']
        return {"shells": shells}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/terminal/split/{terminal_id}")
def split_terminal(terminal_id: str, direction: str = "horizontal"):
    """Split terminal into multiple panes"""
    try:
        # Mock implementation - in real implementation, this would create new terminal pane
        return {"status": "ok", "new_terminal_id": f"split_{terminal_id}_{direction}"}
    except Exception as e:
        raise HTTPException(400, str(e))

# Advanced file operations endpoints
class AdvancedSearchRequest(BaseModel):
    root: str
    query: str
    caseSensitive: bool = False
    wholeWord: bool = False
    regex: bool = False
    fileTypes: List[str] = []
    excludePatterns: List[str] = []
    includePatterns: List[str] = []

class BulkOperationRequest(BaseModel):
    type: str  # 'copy', 'move', 'delete', 'download', 'rename'
    files: List[str]
    destination: Optional[str] = None
    newName: Optional[str] = None

@app.get("/files/advanced")
def get_advanced_files(root: str):
    """Get files with advanced metadata"""
    try:
        root_path = Path(root).expanduser().resolve()
        if not root_path.is_dir():
            raise HTTPException(404, "Root not found")
        
        files = []
        for item in root_path.iterdir():
            if item.name.startswith('.'):
                continue
                
            stat = item.stat()
            files.append({
                "name": item.name,
                "path": str(item.relative_to(root_path)),
                "type": "folder" if item.is_dir() else "file",
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "selected": False
            })
        
        return {"files": files}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/search/advanced")
def advanced_search(req: AdvancedSearchRequest):
    """Perform advanced file search"""
    try:
        root_path = Path(req.root).expanduser().resolve()
        if not root_path.is_dir():
            raise HTTPException(404, "Root not found")
        
        results = []
        
        # Build search pattern
        if req.regex:
            try:
                pattern = re.compile(req.query, re.IGNORECASE if not req.caseSensitive else 0)
            except re.error:
                raise HTTPException(400, "Invalid regex pattern")
        else:
            query = req.query if req.caseSensitive else req.query.lower()
            if req.wholeWord:
                pattern = re.compile(r'\b' + re.escape(query) + r'\b')
            else:
                pattern = re.compile(re.escape(query), re.IGNORECASE if not req.caseSensitive else 0)
        
        # Search files
        for file_path in root_path.rglob('*'):
            if file_path.is_dir():
                continue
                
            # Apply file type filter
            if req.fileTypes:
                ext = file_path.suffix.lower().lstrip('.')
                if ext not in req.fileTypes:
                    continue
            
            # Apply include patterns
            if req.includePatterns:
                if not any(re.search(p, str(file_path)) for p in req.includePatterns):
                    continue
            
            # Apply exclude patterns
            if req.excludePatterns:
                if any(re.search(p, str(file_path)) for p in req.excludePatterns):
                    continue
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_num, line in enumerate(f, 1):
                        if pattern.search(line):
                            results.append({
                                "file": str(file_path.relative_to(root_path)),
                                "line": line_num,
                                "content": line.strip()
                            })
            except Exception:
                continue
        
        return {"results": results}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/files/bulk")
def bulk_file_operation(req: BulkOperationRequest):
    """Perform bulk file operations"""
    try:
        if req.type == 'copy':
            for file_path in req.files:
                if not req.destination:
                    raise HTTPException(400, "Destination required for copy operation")
                src = Path(file_path)
                dst = Path(req.destination) / src.name
                shutil.copy2(src, dst)
        
        elif req.type == 'move':
            for file_path in req.files:
                if not req.destination:
                    raise HTTPException(400, "Destination required for move operation")
                src = Path(file_path)
                dst = Path(req.destination) / src.name
                shutil.move(str(src), str(dst))
        
        elif req.type == 'delete':
            for file_path in req.files:
                path = Path(file_path)
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()
        
        elif req.type == 'download':
            # Create zip file with selected files
            import zipfile
            import tempfile
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp:
                with zipfile.ZipFile(tmp.name, 'w') as zipf:
                    for file_path in req.files:
                        path = Path(file_path)
                        if path.exists():
                            zipf.write(path, path.name)
                
                return Response(
                    content=open(tmp.name, 'rb').read(),
                    media_type="application/zip",
                    headers={"Content-Disposition": "attachment; filename=files.zip"}
                )
        
        elif req.type == 'rename':
            if len(req.files) != 1 or not req.newName:
                raise HTTPException(400, "Rename operation requires exactly one file and new name")
            
            old_path = Path(req.files[0])
            new_path = old_path.parent / req.newName
            old_path.rename(new_path)
        
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(400, str(e))


# Collaborative Editing Endpoints

class CollaborationJoinRequest(BaseModel):
    file_path: str
    user_name: str

class CollaborationMessage(BaseModel):
    type: str
    operation: Optional[str] = None
    position: Optional[int] = None
    content: Optional[str] = None
    length: Optional[int] = None
    selection: Optional[dict] = None

@app.get("/collaboration/sessions")
def get_collaboration_sessions():
    """Get all active collaboration sessions"""
    return {"sessions": session_manager.get_all_sessions()}

@app.post("/collaboration/session")
def create_collaboration_session(req: CollaborationJoinRequest):
    """Create or join a collaboration session"""
    try:
        session = session_manager.get_or_create_session(req.file_path)
        user = session_manager.create_user(req.user_name)
        
        return {
            "session_id": session.session_id,
            "user_id": user.id,
            "user_name": user.name,
            "user_color": user.color,
            "file_path": session.file_path,
            "active_users": session.get_active_users()
        }
    except Exception as e:
        raise HTTPException(400, str(e))

@app.delete("/collaboration/session/{session_id}")
def delete_collaboration_session(session_id: str):
    """Delete a collaboration session"""
    try:
        session_manager.delete_session(session_id)
        return {"message": "Session deleted"}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/collaboration/session/{session_id}")
def get_collaboration_session(session_id: str):
    """Get collaboration session information"""
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(404, "Session not found")
        
        return session.get_session_info()
    except Exception as e:
        raise HTTPException(400, str(e))

@app.websocket("/ws/file-watcher")
async def file_watcher_websocket(websocket: WebSocket):
    """WebSocket endpoint for file watching"""
    await websocket.accept()
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "File watcher connected"
        })
        
        # Handle messages
        while True:
            try:
                data = await websocket.receive_json()
                
                if data.get("type") == "start_watching":
                    project_root = data.get("projectRoot")
                    if project_root:
                        # Start watching the project directory
                        # This would integrate with a file watcher library like watchdog
                        await websocket.send_json({
                            "type": "watching_started",
                            "projectRoot": project_root
                        })
                        
            except Exception as e:
                print(f"File watcher error: {e}")
                break
                
    except Exception as e:
        print(f"File watcher WebSocket error: {e}")
    finally:
        await websocket.close()

@app.websocket("/collaboration/ws/{session_id}/{user_id}")
async def collaboration_websocket(websocket: WebSocket, session_id: str, user_id: str):
    """WebSocket endpoint for real-time collaboration"""
    await websocket.accept()
    
    try:
        session = session_manager.get_session(session_id)
        if not session:
            await websocket.close(code=1000, reason="Session not found")
            return
        
        user = session.users.get(user_id)
        if not user:
            await websocket.close(code=1000, reason="User not found")
            return
        
        # Add user to session
        session.add_user(user, websocket)
        
        # Send initial sync
        await websocket.send_json({
            "type": "sync",
            "content": session.content,
            "version": session.version,
            "users": session.get_active_users()
        })
        
        # Notify other users
        await session.broadcast({
            "type": "user_joined",
            "user": user.to_dict()
        }, exclude_user=user_id)
        
        # Handle messages
        while True:
            try:
                data = await websocket.receive_json()
                response = await handle_websocket_message(session, user, data)
                
                if response:
                    await websocket.send_json(response)
                    
            except Exception as e:
                print(f"Error handling message: {e}")
                break
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Remove user from session
        if session and user_id in session.users:
            session.remove_user(user_id)
            
            # Notify other users
            await session.broadcast({
                "type": "user_left",
                "user_id": user_id
            })
            
            # Close session if no users left
            if len(session.users) == 0:
                session_manager.delete_session(session_id)


# ----------------------------------------------------------------------
# 5️⃣  WebSocket – streaming tokens (optional, nice for UI) ------------
# ----------------------------------------------------------------------
@app.websocket("/ws")
async def ws(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            if data["type"] == "generate":
                # forward to orchestrator and stream token by token
                prompt = data["prompt"]
                file_path = data["file_path"]
                model = data.get("model")
                # Dummy streaming – the Ollama client can stream if you set stream=True
                # Here we just send the whole answer at once for brevity
                answer = handle_request(prompt, file_path, model_override=model)
                await ws.send_json({"type": "answer", "text": answer})
    except Exception as e:
        await ws.close()
from terminal import terminal_session

# ------------------- Terminal (WebSocket) -------------------------
@app.websocket("/ws/terminal")
async def terminal_ws(ws: WebSocket):
    # Delegate to terminal_session helper
    await terminal_session(ws)

# ------------------- MCP routes -------------------------
mcp_service = MCPService()

@app.get("/mcp/health")
def mcp_health():
    # Basic health info; could be extended to verify tool availability
    return {"status": "ok"}

@app.post("/mcp/scan")
def mcp_scan(req: ScanRequest):
    result = mcp_service.scan_project(req)
    return result.dict()

@app.post("/mcp/fix")
def mcp_fix(req: FixRequest):
    result = mcp_service.fix_issues(req)
    return result.dict()

@app.post("/mcp/explain")
def mcp_explain(req: ExplainRequest):
    result = mcp_service.explain_issue(req)
    return result.dict()

class MCPDebugRequest(BaseModel):
    root: str
    auto_fix: bool = False
    dry_run: bool = True

@app.post("/mcp/debug")
def mcp_debug(req: MCPDebugRequest):
    scan = mcp_service.scan_project(ScanRequest(project_path=req.root))
    fix_result = None
    if req.auto_fix:
        fix_result = mcp_service.fix_issues(FixRequest(project_path=req.root, issues=scan.issues, auto_apply=True, dry_run=req.dry_run))
    summary = mcp_service.get_summary(scan)
    return {
        "scan": scan.dict(),
        "fix": fix_result.dict() if fix_result else None,
        "summary": summary,
    }

# ------------------- Lint endpoint -------------------------
scanner = CodeScanner()

@app.get("/lint")
def lint_file_endpoint(path: str, root: Optional[str] = None):
    # Resolve file path
    p = Path(path)
    if root:
        # If path is relative, make it absolute against root
        if not p.is_absolute():
            p = Path(root).expanduser().resolve() / path.lstrip("/\\")
    p = p.expanduser().resolve()
    if not p.is_file():
        raise HTTPException(404, "File not found")

    language = MCPConfig.get_language(str(p))
    try:
        issues = scanner._scan_file(str(p))  # reuse internal logic
    except Exception as e:
        raise HTTPException(400, f"Lint failed: {e}")

    # Map to frontend-friendly diagnostics
    diagnostics = [
        {
            "line": max(0, i.line_number - 1),
            "column": (i.column or 1) - 1,
            "message": i.message,
            "severity": i.severity.value,
            "rule": i.rule_id,
            "analyzer": i.analyzer,
            "category": i.category.value,
        }
        for i in issues
    ]
    return {"diagnostics": diagnostics, "language": language}

@app.get("/lint/project")
def lint_project_endpoint(root: str):
    """Lint entire project and return all diagnostics"""
    project_root = Path(root).expanduser().resolve()
    if not project_root.is_dir():
        raise HTTPException(404, "Project root not found")
    
    try:
        # Scan all files in project
        all_files = []
        for ext in ['.py', '.js', '.ts', '.jsx', '.tsx']:
            all_files.extend(project_root.rglob(f'*{ext}'))
        
        # Filter out common ignored directories
        ignored_dirs = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', 'env', '.env'}
        filtered_files = [
            f for f in all_files 
            if not any(part in ignored_dirs for part in f.parts)
        ]
        
        file_diagnostics = {}
        total_issues = 0
        
        for file_path in filtered_files:
            try:
                language = MCPConfig.get_language(str(file_path))
                issues = scanner._scan_file(str(file_path))
                
                if issues:
                    file_diagnostics[str(file_path)] = [
                        {
                            "line": max(0, i.line_number - 1),
                            "column": (i.column or 1) - 1,
                            "message": i.message,
                            "severity": i.severity.value,
                            "rule": i.rule_id,
                            "analyzer": i.analyzer,
                            "category": i.category.value,
                        }
                        for i in issues
                    ]
                    total_issues += len(issues)
                    
            except Exception as e:
                # Skip files that can't be scanned
                continue
        
        return {
            "file_diagnostics": file_diagnostics,
            "summary": {
                "total_files_scanned": len(filtered_files),
                "files_with_issues": len(file_diagnostics),
                "total_issues": total_issues
            }
        }
        
    except Exception as e:
        raise HTTPException(500, f"Project linting failed: {str(e)}")

# ------------------- Chat endpoints -------------------------

class ChatMessageRequest(BaseModel):
    message: str
    root: Optional[str] = None
    current_file: Optional[str] = None

@app.post("/chat")
def chat(req: ChatMessageRequest):
    # Simple synchronous response using orchestrator
    file_path = req.current_file or ""
    answer = handle_request(req.message, file_path)
    return {"answer": answer}

db = get_chat_db()

class CreateSessionRequest(BaseModel):
    title: str
    metadata: Optional[dict] = None

@app.post("/chat/session/create")
def chat_session_create(req: CreateSessionRequest):
    sid = db.create_session(req.title, metadata=req.metadata)
    return {"session_id": sid}

class AddMessageRequest(BaseModel):
    session_id: str
    role: str
    content: str
    metadata: Optional[dict] = None

@app.post("/chat/message/add")
def chat_message_add(req: AddMessageRequest):
    mid = db.add_message(req.session_id, req.role, req.content, req.metadata)
    return {"message_id": mid}

@app.get("/chat/session/{session_id}")
def chat_session_get(session_id: str):
    s = db.get_session(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    return s

class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    metadata: Optional[dict] = None

@app.put("/chat/session/{session_id}")
def chat_session_update(session_id: str, req: UpdateSessionRequest):
    db.update_session(session_id, name=req.title, metadata=req.metadata)
    return {"status": "ok"}

@app.delete("/chat/session/{session_id}")
def chat_session_delete(session_id: str):
    db.delete_session(session_id)
    return {"status": "deleted"}

@app.get("/chat/session/{session_id}/messages")
def chat_session_messages(session_id: str, limit: Optional[int] = None, offset: int = 0):
    return {"messages": db.get_messages(session_id, limit=limit, offset=offset)}

@app.get("/chat/sessions")
def chat_sessions(limit: Optional[int] = 50, offset: int = 0):
    return {"sessions": db.list_sessions(limit=limit or 50, offset=offset)}

@app.delete("/chat/message/{message_id}")
def chat_message_delete(message_id: str):
    db.delete_message(message_id)
    return {"status": "deleted"}

@app.get("/chat/search")
def chat_search(query: str, session_id: Optional[str] = None, limit: int = 50):
    return {"results": db.search_messages(query, session_id=session_id, limit=limit)}

@app.get("/chat/session/{session_id}/export")
def chat_export(session_id: str, format: str = "json"):
    content = db.export_session(session_id, format=format)
    return {"content": content, "format": format}

@app.get("/chat/stats")
def chat_stats():
    return db.get_stats()

# ------------------- Security & Sandbox endpoints -------------------------

@app.get("/security/scan/full")
def security_scan_full(project_path: Optional[str] = None):
    root = project_path or os.getcwd()
    vuln = get_vulnerability_scanner().scan_project(root)
    secrets = get_secrets_detector().scan_directory(root)
    return {"vulnerabilities": vuln, "secrets": secrets}

class VulnScanRequest(BaseModel):
    project_path: Optional[str] = None

@app.post("/security/scan/vulnerabilities")
def security_scan_vulns(req: VulnScanRequest):
    root = req.project_path or os.getcwd()
    return get_vulnerability_scanner().scan_project(root)

class SecretsScanRequest(BaseModel):
    project_path: Optional[str] = None
    exclude_dirs: Optional[List[str]] = None

@app.post("/security/scan/secrets")
def security_scan_secrets(req: SecretsScanRequest):
    root = req.project_path or os.getcwd()
    return get_secrets_detector().scan_directory(root, exclude_dirs=req.exclude_dirs)

@app.get("/security/remediation/{secret_type}")
def security_remediation(secret_type: str):
    return {"advice": get_secrets_detector().get_remediation_advice(secret_type)}

class PythonSandboxRequest(BaseModel):
    code: str
    timeout: Optional[int] = 30
    memory_limit: Optional[str] = "256m"

@app.post("/sandbox/execute/python")
def sandbox_execute_python(req: PythonSandboxRequest):
    return get_sandbox().execute_python(req.code, timeout=req.timeout or 30, memory_limit=req.memory_limit or "256m")

class JavaScriptSandboxRequest(BaseModel):
    code: str
    timeout: Optional[int] = 30

@app.post("/sandbox/execute/javascript")
def sandbox_execute_js(req: JavaScriptSandboxRequest):
    return get_sandbox().execute_javascript(req.code, timeout=req.timeout or 30)

class ShellSandboxRequest(BaseModel):
    command: str
    timeout: Optional[int] = 30
    allowed_commands: Optional[List[str]] = None

@app.post("/sandbox/execute/shell")
def sandbox_execute_shell(req: ShellSandboxRequest):
    return get_sandbox().execute_shell(req.command, timeout=req.timeout or 30, allowed_commands=req.allowed_commands)

@app.get("/sandbox/health")
def sandbox_health():
    sb = get_sandbox()
    return {"docker_available": sb.is_available()}

# ------------------- Code Formatting -------------------------

class FormatRequest(BaseModel):
    language: str  # 'python' | 'javascript' | 'typescript'
    code: str
    options: Optional[dict] = None

def _format_with_black(code: str, line_length: int = 100) -> str:
    try:
        import black
        mode = black.Mode(line_length=line_length)
        return black.format_str(code, mode=mode)
    except Exception as e:
        raise HTTPException(400, f"Black formatting failed: {e}")

def _format_with_prettier(code: str, parser: str = "babel") -> str:
    import subprocess, json, tempfile
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(code)
            temp_path = f.name
        cmd = [
            "npx", "--yes", "prettier@3",
            "--parser", parser,
            temp_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if result.returncode != 0:
            raise HTTPException(400, result.stderr or "Prettier failed")
        return result.stdout
    except FileNotFoundError:
        raise HTTPException(400, "Prettier (npx) not available")
    except Exception as e:
        raise HTTPException(400, f"Prettier error: {e}")

@app.post("/format")
def format_code(req: FormatRequest):
    lang = req.language.lower()
    if lang == "python":
        line_length = (req.options or {}).get("line_length", 100)
        formatted = _format_with_black(req.code, line_length=line_length)
        return {"formatted": formatted}
    elif lang in ("javascript", "typescript"):
        parser = "babel" if lang == "javascript" else "typescript"
        formatted = _format_with_prettier(req.code, parser=parser)
        return {"formatted": formatted}
    else:
        raise HTTPException(400, f"Unsupported language: {req.language}")

# ------------------- Providers status -------------------------

@app.get("/providers/status")
def providers_status():
    status = {
        "ollama": False,
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
        "groq": bool(os.getenv("GROQ_API_KEY")),
    }
    try:
        r = requests.get(f"{os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434')}/api/tags", timeout=2)
        status["ollama"] = r.ok
    except Exception:
        status["ollama"] = False
    return status

# ------------------- Package Manager -------------------------

@app.get("/packages")
def list_packages(root: str):
    root_path = Path(root).expanduser().resolve()
    data = {"npm": None, "pip": None}
    # npm
    pkg_json = root_path / "package.json"
    if pkg_json.exists():
        try:
            import json
            pkg = json.loads(pkg_json.read_text(encoding="utf-8"))
            data["npm"] = {
                "dependencies": pkg.get("dependencies", {}),
                "devDependencies": pkg.get("devDependencies", {}),
            }
        except Exception:
            data["npm"] = {"error": "invalid package.json"}
    # pip
    req = root_path / "requirements.txt"
    if req.exists():
        pip_deps = {}
        for line in req.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "==" in line:
                name, ver = line.split("==", 1)
                pip_deps[name.strip()] = ver.strip()
            else:
                pip_deps[line] = "*"
        data["pip"] = pip_deps
    return data

class InstallPackageRequest(BaseModel):
    root: str
    package: str
    manager: str  # 'npm' | 'pip'

@app.post("/packages/install")
def install_package(req: InstallPackageRequest):
    import subprocess
    cwd = Path(req.root).expanduser().resolve()
    if req.manager == "npm":
        cmd = ["npm", "install", req.package]
    elif req.manager == "pip":
        cmd = ["pip", "install", req.package]
    else:
        raise HTTPException(400, "unknown manager")
    try:
        result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=300)
        return {"status": "ok" if result.returncode == 0 else "error", "stdout": result.stdout, "stderr": result.stderr}
    except Exception as e:
        raise HTTPException(400, str(e))

# ------------------- Collaboration -------------------------

class CreateCollabSessionRequest(BaseModel):
    file_path: str

@app.post("/collab/session")
def create_collab_session(req: CreateCollabSessionRequest):
    session = session_manager.get_or_create_session(req.file_path)
    return session.get_session_info()

@app.get("/collab/sessions")
def list_collab_sessions():
    return {"sessions": session_manager.get_all_sessions()}

@app.websocket("/ws/collab")
async def collab_ws(ws: WebSocket):
    await ws.accept()
    session = None
    user = None
    try:
        init = await ws.receive_json()
        session_id = init.get("session_id")
        user_name = init.get("user_name", "Guest")
        file_path = init.get("file_path")
        # Resolve session
        if session_id:
            session = session_manager.get_session(session_id)
        elif file_path:
            session = session_manager.get_or_create_session(file_path)
        else:
            await ws.send_json({"type": "error", "message": "session_id or file_path required"})
            await ws.close()
            return
        # Create user and join
        user = session_manager.create_user(user_name)
        session.add_user(user, ws)
        # Send initial sync
        await ws.send_json({
            "type": "sync",
            "content": session.content,
            "version": session.version,
            "users": session.get_active_users(),
            "session": session.get_session_info(),
        })
        # Broadcast presence
        await session.broadcast({"type": "join", "user": user.to_dict()}, exclude_user=user.id)
        # Main loop
        while True:
            msg = await ws.receive_json()
            response = await handle_websocket_message(session, user, msg)
            if response:
                await ws.send_json(response)
    except Exception:
        pass
    finally:
        if session and user:
            session.remove_user(user.id)
            try:
                await session.broadcast({"type": "leave", "user": user.to_dict()})
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)