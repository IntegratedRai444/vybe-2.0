"""
Vybe 2.0 Backend API

This module serves as the main entry point for the Vybe 2.0 backend API, providing:
- Code analysis and linting
- AI-powered code generation and completion
- Git integration
- Debugging capabilities
- Package management
- Real-time collaboration

API Documentation:
- Swagger UI: /api/docs
- ReDoc: /api/redoc
"""

import asyncio
import hashlib
import json
import logging
import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Load environment variables from .env file
from dotenv import load_dotenv
from fastapi import (
    Body, 
    Depends, 
    FastAPI, 
    File, 
    HTTPException, 
    Request, 
    UploadFile, 
    WebSocket,
    status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

# Import monitoring, middleware and authentication
from .monitoring import setup_monitoring
from .core.middleware import setup_middleware
from .api.auth_routes import router as auth_router
from .core.auth import get_current_active_user

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Cache configuration
CACHE_DIR = Path(".analysis_cache")
CACHE_DIR.mkdir(exist_ok=True)

class CacheMiddleware(BaseHTTPMiddleware):
    """Middleware for caching responses."""
    async def dispatch(self, request: Request, call_next):
        # Skip caching for non-GET requests
        if request.method != 'GET':
            return await call_next(request)
            
        # Generate cache key from request
        cache_key = hashlib.md5(
            f"{request.url.path}:{request.url.query}".encode()
        ).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.json"
        
        # Return cached response if exists and not expired (5 minutes)
        if cache_file.exists():
            cache_data = json.loads(cache_file.read_text())
            if time.time() - cache_data['timestamp'] < 300:  # 5 minutes
                return JSONResponse(**cache_data['response'])
        
        # Process request
        response = await call_next(request)
        
        # Cache successful responses
        if response.status_code == 200:
            try:
                cache_data = {
                    'timestamp': time.time(),
                    'response': {
                        'content': response.body,
                        'status_code': response.status_code,
                        'headers': dict(response.headers),
                        'media_type': response.media_type
                    }
                }
                cache_file.write_text(json.dumps(cache_data, default=str))
            except Exception as e:
                logger.warning(f"Failed to cache response: {e}")
        
        return response

import requests
from ai_providers import get_ai_orchestrator
from code_intelligence import code_intelligence
from collaboration.session_manager import (
    User,
    handle_websocket_message,
    session_manager,
)
from dap.dap_manager import dap_manager
from database.chat_db import get_chat_db
from debugger_service import debugger_service
from fastapi.middleware.cors import CORSMiddleware
from file_watcher import file_watcher
from formatters import code_formatter
from git import Repo
from git_service import git_service
from git_services.advanced_git import get_advanced_git_service
from git_utils import (
    commit_repo,
    file_diff,
    git_pull,
    git_push,
    git_remotes,
    repo_status,
    stage_files,
)
from linters import code_linter
from lsp.lsp_manager import lsp_manager
from mcp.config import MCPConfig
from mcp.main import MCPService
from mcp.models import ExplainRequest, FixRequest, ScanRequest
from mcp.scanner import CodeScanner
from packages.package_manager import package_manager

# Import debug router
from routers import debug as debug_router
from sandbox.docker_sandbox import get_sandbox
from sandbox.secrets_detector import get_secrets_detector
from sandbox.vulnerability_scanner import get_vulnerability_scanner
from search.advanced_search import get_search_service
from settings_service import settings_service

from indexer import index_project
from orchestrator import VECTOR_STORE, handle_request

from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI
app = FastAPI(
    title="Vybe 2.0 API",
    description="Simple personal API for Vybe 2.0",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from api.simple_auth_routes import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])

# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1KB
app.add_middleware(CacheMiddleware)  # Add response caching

# Include debug router
app.include_router(debug_router.router)


# Health check endpoint
@app.get(
    "/health",
    tags=["system"],
    summary="Check API health status",
    description="""
    Check if the API is running and all required services are available.
    
    Returns:
        dict: Health status and timestamp
    """,
    responses={
        200: {"description": "API is healthy"},
        503: {"description": "One or more services are unavailable"}
    }
)
async def health_check():
    """
    Check the health of the API and its dependencies.
    
    This endpoint verifies:
    - Database connectivity
    - AI service availability
    - File system access
    - Memory usage
    
    Returns:
        dict: Health status and system information
    """
    try:
        # Check database connection
        db_status = await get_chat_db().ping()
        
        # Check AI services
        ai_status = await check_ai_availability()
        
        # Check file system
        try:
            test_file = CACHE_DIR / ".healthcheck"
            test_file.touch()
            test_file.unlink()
            fs_status = True
        except Exception as e:
            logger.error(f"Filesystem check failed: {e}")
            fs_status = False
        
        # Check memory usage
        import psutil
        memory = psutil.virtual_memory()
        
        status_ok = all([db_status, ai_status.get('available', False), fs_status])
        
        if not status_ok:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "degraded",
                    "services": {
                        "database": db_status,
                        "ai_services": ai_status,
                        "filesystem": fs_status
                    },
                    "memory": {
                        "total": f"{memory.total / (1024**3):.1f}GB",
                        "available": f"{memory.available / (1024**3):.1f}GB",
                        "used_percent": f"{memory.percent}%"
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
        return {
            "status": "ok",
            "services": {
                "database": True,
                "ai_services": ai_status,
                "filesystem": True
            },
            "system": {
                "memory": {
                    "total": f"{memory.total / (1024**3):.1f}GB",
                    "available": f"{memory.available / (1024**3):.1f}GB",
                    "used_percent": f"{memory.percent}%"
                },
                "cpu_cores": psutil.cpu_count(logical=False),
                "cpu_usage": f"{psutil.cpu_percent()}%"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@app.get("/providers/status")
async def get_providers_status():
    """Get status of all AI providers"""
    try:
        ai_orchestrator = await get_ai_orchestrator()
        providers = await ai_orchestrator.get_available_providers()

        # Find the first available provider as primary
        primary = None
        for name, status in providers.items():
            if status.get("available", False):
                primary = name
                break

        return {
            "providers": providers,
            "primary": primary,
            "fallback_order": getattr(ai_orchestrator, "fallback_order", []),
        }
    except Exception as e:
        return {"error": str(e), "providers": {}, "primary": None, "fallback_order": []}


# Code formatting endpoint
class FormatRequest(BaseModel):
    language: str
    code: str
    options: Optional[dict] = None


@app.post("/format")
def format_code_endpoint(req: FormatRequest):
    """Format code for the specified language"""
    try:
        result = code_formatter.format_code(req.language, req.code, req.options)
        return result
    except Exception as e:
        return {"formatted": req.code, "error": str(e), "success": False}


# Linting endpoints
class LintFileRequest(BaseModel):
    file_path: str
    project_root: str


class LintProjectRequest(BaseModel):
    project_root: str


@app.post("/lint/file")
def lint_file_endpoint(req: LintFileRequest):
    """Lint a single file"""
    try:
        result = code_linter.lint_file(req.file_path, req.project_root)
        return result
    except Exception as e:
        return {"diagnostics": [], "error": str(e), "success": False}


@app.post("/lint/project")
def lint_project_endpoint(req: LintProjectRequest):
    """Lint entire project"""
    try:
        result = code_linter.lint_project(req.project_root)
        return result
    except Exception as e:
        return {
            "file_diagnostics": {},
            "summary": {"total_files": 0, "total_issues": 0},
            "error": str(e),
            "success": False,
        }


# Providers status endpoint
@app.get("/providers/status")
def providers_status():
    """Check status of all AI providers and services"""
    status = {
        "backend": True,
        "file_system": True,
        "ai_providers": {
            "ollama": check_ai_availability(),
            "openai": False,  # TODO: Add OpenAI check
            "anthropic": False,  # TODO: Add Anthropic check
        },
        "services": {
            "git": check_git_availability(),
            "terminal": True,
            "indexing": True,
        },
        "timestamp": time.time(),
    }
    return status


def check_ai_availability():
    """Check if AI services are available"""
    try:
        import requests

        from config import OLLAMA_HOST

        # Try a simple request to Ollama
        response = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=3)
        return response.status_code == 200
    except:
        return False


def check_git_availability():
    """Check if Git is available"""
    try:
        import subprocess

        result = subprocess.run(["git", "--version"], capture_output=True, timeout=5)
        return result.returncode == 0
    except:
        return False


# Setup monitoring and middleware
setup_monitoring(app)
setup_middleware(app)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])

# CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FolderNode(BaseModel):
    path: str  # relative to root
    name: str
    type: str  # "folder" or "file"
    children: List["FolderNode"] | None = None  # recursive


FolderNode.model_rebuild()


def build_tree(
    root: Path, rel: Path = Path(""), max_depth: int = 10, current_depth: int = 0
) -> FolderNode:
    if current_depth > max_depth:
        return None

    cur = root / rel
    node = FolderNode(
        path=str(rel),
        name=cur.name if cur.name else str(cur),
        type="folder",
        children=[],
    )

    try:
        entries = sorted(cur.iterdir())
    except (PermissionError, FileNotFoundError):
        # Skip directories we cannot access or that disappeared mid-traversal
        return node

    for entry in entries:
        # Skip hidden files and common ignore patterns
        if entry.name.startswith(".") or entry.name in [
            "node_modules",
            "__pycache__",
            ".git",
            "dist",
            "build",
            ".next",
            ".vscode",
        ]:
            continue

        r = rel / entry.name
        try:
            if entry.is_dir():
                child_node = build_tree(root, r, max_depth, current_depth + 1)
                if child_node:
                    node.children.append(child_node)
            else:
                node.children.append(
                    FolderNode(path=str(r), name=entry.name, type="file", children=None)
                )
        except (PermissionError, OSError):
            # Skip files/folders we can't access
            continue

    return node


# Files/folders API aligned with frontend
@app.get("/files")
def list_files(root: str):
    """List files with better error handling"""
    try:
        root_path = Path(root).expanduser().resolve()
        if not root_path.exists():
            raise HTTPException(404, f"Directory not found: {root}")
        if not root_path.is_dir():
            raise HTTPException(400, f"Path is not a directory: {root}")

        tree = build_tree(root_path)
        if not tree:
            raise HTTPException(500, "Failed to build file tree")

        return tree
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error listing files: {str(e)}")


# Back-compat alias
@app.get("/folder")
def get_folder(root: str):
    return list_files(root)


# ----------------------------------------------------------------------
# 1️⃣  Project indexing -------------------------------------------------
# ----------------------------------------------------------------------
class IndexRequest(BaseModel):
    root: str  # absolute path of the project folder


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
    prompt: str  # user prompt (e.g. “Write a test …”)
    file_path: str  # relative to project root (used for model routing)
    model: Optional[str] = None
    top_k: int = 5


@app.post("/generate")
def generate(req: GenerateRequest):
    """Generate AI response with proper error handling"""
    try:
        answer = handle_request(
            user_prompt=req.prompt,
            file_path=req.file_path,
            model_override=req.model,
            top_k=req.top_k,
        )
        return {"answer": answer, "error": None}
    except Exception as e:
        # Log the error but don't crash
        import logging

        logging.error(f"AI generation error: {e}")
        return {
            "answer": f"Sorry, I'm currently unavailable. Error: {str(e)}",
            "error": str(e),
            "fallback": True,
        }


# Chat API endpoint
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    root: Optional[str] = None
    current_file: Optional[str] = None


@app.post("/chat")
def chat_with_ai(req: ChatRequest):
    """Chat with AI assistant using multi-provider support"""
    try:
        # Build context from current file and project
        context_info = ""
        if req.current_file and req.root:
            try:
                from file_handler import file_handler

                file_result = file_handler.read_file(req.current_file)
                if not file_result.get("error"):
                    context_info = f"Current file ({req.current_file}):\n{file_result['content'][:2000]}...\n\n"
            except:
                pass

        # Add any additional context
        if req.context:
            context_info += f"Additional context:\n{req.context}\n\n"

        # Create system prompt
        system_prompt = "You are a helpful AI coding assistant. You help developers with code, debugging, explanations, and programming questions."

        # Create the full prompt
        full_prompt = f"{context_info}User question: {req.message}"

        # Use the AI orchestrator
        result = ai_orchestrator.generate(
            prompt=full_prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=1500,
        )

        return {
            "response": result["response"],
            "provider_used": result["provider_used"],
            "success": result["success"],
            "error": result["error"],
            "context_used": bool(context_info),
        }

    except Exception as e:
        import logging

        logging.error(f"Chat error: {e}")
        return {
            "response": f"Sorry, I'm having trouble right now. Error: {str(e)}",
            "error": str(e),
            "success": False,
            "provider_used": None,
        }


# Add a simple chat endpoint
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


@app.post("/chat")
def chat(req: ChatRequest):
    """Simple chat endpoint"""
    try:
        # Use the generate endpoint internally
        gen_req = GenerateRequest(
            prompt=req.message, file_path=req.context or "chat.txt", model=None, top_k=3
        )
        return generate(gen_req)
    except Exception as e:
        return {"answer": f"Chat service unavailable: {str(e)}", "error": str(e)}


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
    """Get file content with proper error handling"""
    try:
        from file_handler import file_handler

        result = file_handler.read_file(path)
        if result.get("error"):
            if "not found" in result["error"].lower():
                raise HTTPException(404, result["error"])
            else:
                raise HTTPException(400, result["error"])
        return {"content": result["content"]}
    except ImportError:
        # Fallback to original implementation
        p = Path(path).expanduser().resolve()
        if not p.is_file():
            raise HTTPException(404, "File not found")
        return {"content": p.read_text(encoding="utf-8", errors="ignore")}


class SaveRequest(BaseModel):
    path: str
    content: str


@app.post("/file/save")
def save_file(req: SaveRequest):
    """Save file with proper error handling"""
    try:
        from file_handler import file_handler

        result = file_handler.write_file(req.path, req.content)
        if not result.get("success"):
            raise HTTPException(400, result.get("error", "Failed to save file"))
        return {"status": "saved"}
    except ImportError:
        # Fallback to original implementation
        p = Path(req.path).expanduser().resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(req.content, encoding="utf-8")
        return {"status": "saved"}


class CreateFileRequest(BaseModel):
    path: str
    content: Optional[str] = ""


@app.post("/file/create")
def create_file(req: CreateFileRequest):
    """Create new file with proper error handling"""
    try:
        from file_handler import file_handler

        result = file_handler.create_file(req.path, req.content or "")
        if not result.get("success"):
            if "already exists" in result.get("error", "").lower():
                raise HTTPException(400, "File already exists")
            else:
                raise HTTPException(400, result.get("error", "Failed to create file"))
        return {"status": "created"}
    except ImportError:
        # Fallback to original implementation
        p = Path(req.path).expanduser().resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        if p.exists():
            raise HTTPException(400, "File already exists")
        p.write_text(req.content or "", encoding="utf-8")
        return {"status": "created"}


class CreateFolderRequest(BaseModel):
    path: str


@app.post("/folder/create")
def create_folder(req: CreateFolderRequest):
    """Create new folder with proper error handling"""
    try:
        from file_handler import file_handler

        result = file_handler.create_folder(req.path)
        if not result.get("success"):
            raise HTTPException(400, result.get("error", "Failed to create folder"))
        return {"status": "created", "message": result.get("message", "Folder created")}
    except ImportError:
        # Fallback to original implementation
        p = Path(req.path).expanduser().resolve()
        p.mkdir(parents=True, exist_ok=True)
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
    """Delete file or folder with proper error handling"""
    try:
        from file_handler import file_handler

        result = file_handler.delete_file(path)
        if not result.get("success"):
            if "not found" in result.get("error", "").lower():
                return JSONResponse({"status": "not_found"}, status_code=404)
            else:
                raise HTTPException(400, result.get("error", "Failed to delete"))
        return {"status": "deleted"}
    except ImportError:
        # Fallback to original implementation
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
            conflicts.append({"file": item[0], "status": "unmerged", "conflicts": []})

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

        if req.resolution == "ours":
            repo.git.checkout("--ours", req.file)
        elif req.resolution == "theirs":
            repo.git.checkout("--theirs", req.file)
        elif req.resolution == "manual":
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
                "author": "",
            }

            # Get commit info
            if branch.commit:
                branch_info["lastCommit"] = branch.commit.message.split("\n")[0][:50]
                branch_info["author"] = branch.commit.author.name

            # Get ahead/behind info (simplified)
            try:
                if branch.tracking_branch():
                    commits_ahead = list(
                        repo.iter_commits(f"{branch.tracking_branch()}..{branch}")
                    )
                    commits_behind = list(
                        repo.iter_commits(f"{branch}..{branch.tracking_branch()}")
                    )
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

        if req.language in ["py", "python"]:
            suggestions = [
                {
                    "label": "def",
                    "kind": "keyword",
                    "detail": "Define function",
                    "insertText": "def ",
                },
                {
                    "label": "class",
                    "kind": "keyword",
                    "detail": "Define class",
                    "insertText": "class ",
                },
                {
                    "label": "if",
                    "kind": "keyword",
                    "detail": "If statement",
                    "insertText": "if ",
                },
                {
                    "label": "for",
                    "kind": "keyword",
                    "detail": "For loop",
                    "insertText": "for ",
                },
                {
                    "label": "while",
                    "kind": "keyword",
                    "detail": "While loop",
                    "insertText": "while ",
                },
                {
                    "label": "import",
                    "kind": "keyword",
                    "detail": "Import module",
                    "insertText": "import ",
                },
                {
                    "label": "from",
                    "kind": "keyword",
                    "detail": "From import",
                    "insertText": "from ",
                },
                {
                    "label": "return",
                    "kind": "keyword",
                    "detail": "Return value",
                    "insertText": "return ",
                },
                {
                    "label": "print",
                    "kind": "function",
                    "detail": "Print function",
                    "insertText": "print()",
                },
            ]
        elif req.language in ["js", "javascript", "ts", "typescript"]:
            suggestions = [
                {
                    "label": "function",
                    "kind": "keyword",
                    "detail": "Define function",
                    "insertText": "function ",
                },
                {
                    "label": "const",
                    "kind": "keyword",
                    "detail": "Constant declaration",
                    "insertText": "const ",
                },
                {
                    "label": "let",
                    "kind": "keyword",
                    "detail": "Variable declaration",
                    "insertText": "let ",
                },
                {
                    "label": "var",
                    "kind": "keyword",
                    "detail": "Variable declaration",
                    "insertText": "var ",
                },
                {
                    "label": "if",
                    "kind": "keyword",
                    "detail": "If statement",
                    "insertText": "if ",
                },
                {
                    "label": "for",
                    "kind": "keyword",
                    "detail": "For loop",
                    "insertText": "for ",
                },
                {
                    "label": "while",
                    "kind": "keyword",
                    "detail": "While loop",
                    "insertText": "while ",
                },
                {
                    "label": "return",
                    "kind": "keyword",
                    "detail": "Return value",
                    "insertText": "return ",
                },
                {
                    "label": "console.log",
                    "kind": "function",
                    "detail": "Console log",
                    "insertText": "console.log()",
                },
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
            "range": req.position,
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
                        {"label": "param2", "documentation": "Second parameter"},
                    ],
                }
            ],
            "activeSignature": 0,
            "activeParameter": 0,
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
                    "edits": [
                        {
                            "resource": req.filePath,
                            "edit": {"range": req.range, "text": "Fixed code"},
                        }
                    ]
                },
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
                "endColumn": 10,
            },
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
                    "endColumn": 10,
                },
            }
        ]
    except Exception as e:
        raise HTTPException(400, str(e))


# LSP Integration Endpoints
class LSPRequest(BaseModel):
    file_path: str
    line: int
    character: int
    language: str
    content: Optional[str] = None


class LSPStartRequest(BaseModel):
    language: str
    root_path: str


@app.post("/lsp/start")
async def start_lsp_server(req: LSPStartRequest):
    """Start LSP server for a language"""
    try:
        success = await lsp_manager.start_server(req.language, req.root_path)
        return {"success": success, "language": req.language}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/lsp/completions")
async def get_lsp_completions(req: LSPRequest):
    """Get LSP completions"""
    try:
        completions = await lsp_manager.get_completions(
            req.file_path, req.line, req.character, req.language
        )
        return {
            "completions": [
                {
                    "label": c.label,
                    "kind": c.kind,
                    "detail": c.detail,
                    "documentation": c.documentation,
                    "insertText": c.insert_text,
                    "sortText": c.sort_text,
                }
                for c in completions
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/lsp/hover")
async def get_lsp_hover(req: LSPRequest):
    """Get LSP hover information"""
    try:
        hover_info = await lsp_manager.get_hover(
            req.file_path, req.line, req.character, req.language
        )
        return {"hover": hover_info}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/lsp/definition")
async def get_lsp_definition(req: LSPRequest):
    """Get LSP definition"""
    try:
        definition = await lsp_manager.goto_definition(
            req.file_path, req.line, req.character, req.language
        )
        return {"definition": definition}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/lsp/references")
async def get_lsp_references(req: LSPRequest):
    """Get LSP references"""
    try:
        references = await lsp_manager.find_references(
            req.file_path, req.line, req.character, req.language
        )
        return {"references": references}
    except Exception as e:
        raise HTTPException(400, str(e))


class LSPDocumentRequest(BaseModel):
    file_path: str
    content: str
    language: str
    version: Optional[int] = 1


@app.post("/lsp/document/open")
async def lsp_document_open(req: LSPDocumentRequest):
    """Notify LSP that document was opened"""
    try:
        await lsp_manager.did_open_document(req.file_path, req.content, req.language)
        return {"success": True}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/lsp/document/change")
async def lsp_document_change(req: LSPDocumentRequest):
    """Notify LSP that document was changed"""
    try:
        await lsp_manager.did_change_document(
            req.file_path, req.content, req.version, req.language
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/lsp/document/close")
async def lsp_document_close(req: LSPDocumentRequest):
    """Notify LSP that document was closed"""
    try:
        await lsp_manager.did_close_document(req.file_path, req.language)
        return {"success": True}
    except Exception as e:
        raise HTTPException(400, str(e))


# Real Debug Adapter Protocol (DAP) Endpoints
class DAPCreateSessionRequest(BaseModel):
    language: str
    program: str
    args: Optional[List[str]] = None


class DAPBreakpointRequest(BaseModel):
    session_id: str
    file_path: str
    breakpoints: List[Dict[str, Any]]


class DAPThreadRequest(BaseModel):
    session_id: str
    thread_id: int


class DAPEvaluateRequest(BaseModel):
    session_id: str
    expression: str
    frame_id: Optional[int] = None


@app.post("/dap/session/create")
async def create_debug_session(req: DAPCreateSessionRequest):
    """Create a new debug session"""
    try:
        session_id = await dap_manager.create_session(
            req.language, req.program, req.args
        )
        if session_id:
            return {"session_id": session_id, "success": True}
        else:
            return {"error": "Failed to create debug session", "success": False}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/launch")
async def launch_debug_session(session_id: str):
    """Launch a debug session"""
    try:
        success = await dap_manager.launch_session(session_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/attach")
async def attach_debug_session(session_id: str, port: int):
    """Attach to a running process"""
    try:
        success = await dap_manager.attach_session(session_id, port)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/terminate")
async def terminate_debug_session(session_id: str):
    """Terminate a debug session"""
    try:
        success = await dap_manager.terminate_session(session_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/breakpoints")
async def set_breakpoints(req: DAPBreakpointRequest):
    """Set breakpoints"""
    try:
        breakpoints = await dap_manager.set_breakpoints(
            req.session_id, req.file_path, req.breakpoints
        )
        return {
            "breakpoints": [
                {
                    "id": bp.id,
                    "file": bp.file,
                    "line": bp.line,
                    "condition": bp.condition,
                    "enabled": bp.enabled,
                    "verified": bp.verified,
                }
                for bp in breakpoints
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/continue")
async def continue_execution(session_id: str, thread_id: Optional[int] = None):
    """Continue execution"""
    try:
        success = await dap_manager.continue_execution(session_id, thread_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/step-over")
async def step_over(session_id: str, req: DAPThreadRequest):
    """Step over current line"""
    try:
        success = await dap_manager.step_over(req.session_id, req.thread_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/step-into")
async def step_into(session_id: str, req: DAPThreadRequest):
    """Step into function call"""
    try:
        success = await dap_manager.step_into(req.session_id, req.thread_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/step-out")
async def step_out(session_id: str, req: DAPThreadRequest):
    """Step out of current function"""
    try:
        success = await dap_manager.step_out(req.session_id, req.thread_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/pause")
async def pause_execution(session_id: str, req: DAPThreadRequest):
    """Pause execution"""
    try:
        success = await dap_manager.pause_execution(req.session_id, req.thread_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/dap/session/{session_id}/threads")
async def get_threads(session_id: str):
    """Get threads"""
    try:
        threads = await dap_manager.get_threads(session_id)
        return {"threads": [{"id": t.id, "name": t.name} for t in threads]}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/dap/session/{session_id}/stack-trace/{thread_id}")
async def get_stack_trace(session_id: str, thread_id: int):
    """Get stack trace"""
    try:
        frames = await dap_manager.get_stack_trace(session_id, thread_id)
        return {
            "stack_frames": [
                {
                    "id": f.id,
                    "name": f.name,
                    "source": f.source,
                    "line": f.line,
                    "column": f.column,
                    "end_line": f.end_line,
                    "end_column": f.end_column,
                }
                for f in frames
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/dap/session/{session_id}/variables/{variables_reference}")
async def get_variables(session_id: str, variables_reference: int):
    """Get variables"""
    try:
        variables = await dap_manager.get_variables(session_id, variables_reference)
        return {
            "variables": [
                {
                    "name": v.name,
                    "value": v.value,
                    "type": v.type,
                    "variables_reference": v.variables_reference,
                    "named_variables": v.named_variables,
                    "indexed_variables": v.indexed_variables,
                }
                for v in variables
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/dap/session/{session_id}/evaluate")
async def evaluate_expression(session_id: str, req: DAPEvaluateRequest):
    """Evaluate expression"""
    try:
        result = await dap_manager.evaluate_expression(
            req.session_id, req.expression, req.frame_id
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/dap/sessions")
async def list_debug_sessions():
    """List all debug sessions"""
    try:
        sessions = dap_manager.list_sessions()
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(400, str(e))


# Package Management Endpoints
class PackageSearchRequest(BaseModel):
    project_root: str
    language: str
    query: str
    limit: Optional[int] = 20


class PackageInstallRequest(BaseModel):
    project_root: str
    language: str
    package_name: str
    version: Optional[str] = None
    dev: Optional[bool] = False


class PackageOperationRequest(BaseModel):
    project_root: str
    language: str
    package_name: str


class PackageListRequest(BaseModel):
    project_root: str
    language: str


@app.post("/packages/search")
async def search_packages(req: PackageSearchRequest):
    """Search for packages"""
    try:
        packages = await package_manager.search_packages(
            req.project_root, req.language, req.query, req.limit
        )
        return {
            "packages": [
                {
                    "name": p.name,
                    "version": p.version,
                    "description": p.description,
                    "latest_version": p.latest_version,
                    "is_outdated": p.is_outdated,
                    "homepage": p.homepage,
                    "repository": p.repository,
                    "license": p.license,
                }
                for p in packages
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/packages/install")
async def install_package(req: PackageInstallRequest):
    """Install a package"""
    try:
        success = await package_manager.install_package(
            req.project_root, req.language, req.package_name, req.version, req.dev
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/packages/uninstall")
async def uninstall_package(req: PackageOperationRequest):
    """Uninstall a package"""
    try:
        success = await package_manager.uninstall_package(
            req.project_root, req.language, req.package_name
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/packages/update")
async def update_package(req: PackageOperationRequest):
    """Update a package"""
    try:
        success = await package_manager.update_package(
            req.project_root, req.language, req.package_name
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/packages/installed")
async def list_installed_packages(req: PackageListRequest):
    """List installed packages"""
    try:
        packages = await package_manager.list_installed(req.project_root, req.language)
        return {
            "packages": [
                {
                    "name": p.name,
                    "version": p.version,
                    "description": p.description,
                    "is_dev_dependency": p.is_dev_dependency,
                }
                for p in packages
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/packages/outdated")
async def list_outdated_packages(req: PackageListRequest):
    """List outdated packages"""
    try:
        packages = await package_manager.list_outdated(req.project_root, req.language)
        return {
            "packages": [
                {
                    "name": p.name,
                    "version": p.version,
                    "latest_version": p.latest_version,
                    "description": p.description,
                }
                for p in packages
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/packages/info")
async def get_package_info(req: PackageOperationRequest):
    """Get package information"""
    try:
        package = await package_manager.get_package_info(
            req.project_root, req.language, req.package_name
        )
        if package:
            return {
                "package": {
                    "name": package.name,
                    "version": package.version,
                    "description": package.description,
                    "homepage": package.homepage,
                    "repository": package.repository,
                    "license": package.license,
                    "dependencies": package.dependencies,
                }
            }
        else:
            return {"package": None}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/packages/create-venv")
async def create_virtual_environment(req: PackageListRequest):
    """Create virtual environment (Python only)"""
    try:
        success = await package_manager.create_virtual_environment(
            req.project_root, req.language
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


# Advanced Git Endpoints
class GitRepoRequest(BaseModel):
    repo_path: str


class GitBlameRequest(BaseModel):
    repo_path: str
    file_path: str
    start_line: Optional[int] = 1
    end_line: Optional[int] = None


class GitStashRequest(BaseModel):
    repo_path: str
    message: Optional[str] = None
    include_untracked: Optional[bool] = False


class GitStashOperationRequest(BaseModel):
    repo_path: str
    stash_index: int


class GitConflictResolveRequest(BaseModel):
    repo_path: str
    file_path: str
    resolution: str  # 'ours', 'theirs', 'manual'
    content: Optional[str] = None


class GitBranchCompareRequest(BaseModel):
    repo_path: str
    branch1: str
    branch2: str


@app.post("/git/advanced/commit-graph")
def get_commit_graph(
    req: GitRepoRequest, max_count: int = 100, branch: Optional[str] = None
):
    """Get commit graph with branch information"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        commits = git_service.get_commit_graph(max_count, branch)

        return {
            "commits": [
                {
                    "hash": c.hash,
                    "short_hash": c.short_hash,
                    "author": c.author,
                    "author_email": c.author_email,
                    "date": c.date.isoformat(),
                    "message": c.message,
                    "parents": c.parents,
                    "refs": c.refs or [],
                }
                for c in commits
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/branches-detailed")
def get_detailed_branches(req: GitRepoRequest):
    """Get detailed branch information"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        branches = git_service.get_detailed_branches()

        return {
            "branches": [
                {
                    "name": b.name,
                    "current": b.current,
                    "remote": b.remote,
                    "ahead": b.ahead,
                    "behind": b.behind,
                    "last_commit": {
                        "hash": b.last_commit.hash,
                        "short_hash": b.last_commit.short_hash,
                        "author": b.last_commit.author,
                        "date": b.last_commit.date.isoformat(),
                        "message": b.last_commit.message,
                    }
                    if b.last_commit
                    else None,
                }
                for b in branches
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/blame")
def get_blame_info(req: GitBlameRequest):
    """Get blame information for a file"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        blame_info = git_service.get_blame_info(
            req.file_path, req.start_line, req.end_line
        )

        return {
            "blame": [
                {
                    "line_number": b.line_number,
                    "commit_hash": b.commit_hash,
                    "author": b.author,
                    "date": b.date.isoformat(),
                    "content": b.content,
                }
                for b in blame_info
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/stash/list")
def get_stash_list(req: GitRepoRequest):
    """Get list of stashes"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        stashes = git_service.get_stash_list()

        return {
            "stashes": [
                {
                    "index": s.index,
                    "message": s.message,
                    "branch": s.branch,
                    "date": s.date.isoformat(),
                    "hash": s.hash,
                }
                for s in stashes
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/stash/create")
def create_stash(req: GitStashRequest):
    """Create a new stash"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        success = git_service.create_stash(req.message, req.include_untracked)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/stash/apply")
def apply_stash(req: GitStashOperationRequest):
    """Apply a stash"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        success = git_service.apply_stash(req.stash_index)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/stash/pop")
def pop_stash(req: GitStashOperationRequest):
    """Pop a stash"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        success = git_service.pop_stash(req.stash_index)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/stash/drop")
def drop_stash(req: GitStashOperationRequest):
    """Drop a stash"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        success = git_service.drop_stash(req.stash_index)
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/conflicts")
def get_merge_conflicts(req: GitRepoRequest):
    """Get merge conflicts"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        conflicts = git_service.get_merge_conflicts()

        return {
            "conflicts": [
                {
                    "file_path": c.file_path,
                    "resolved": c.resolved,
                    "markers": [
                        {
                            "start_line": m.start_line,
                            "end_line": m.end_line,
                            "conflict_type": m.conflict_type,
                            "content": m.content,
                        }
                        for m in c.markers
                    ],
                }
                for c in conflicts
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/resolve-conflict")
def resolve_conflict(req: GitConflictResolveRequest):
    """Resolve a merge conflict"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        success = git_service.resolve_conflict(
            req.file_path, req.resolution, req.content
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/file-history")
def get_file_history(req: GitBlameRequest, max_count: int = 50):
    """Get commit history for a file"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        commits = git_service.get_file_history(req.file_path, max_count)

        return {
            "commits": [
                {
                    "hash": c.hash,
                    "short_hash": c.short_hash,
                    "author": c.author,
                    "date": c.date.isoformat(),
                    "message": c.message,
                }
                for c in commits
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/git/advanced/compare-branches")
def compare_branches(req: GitBranchCompareRequest):
    """Compare two branches"""
    try:
        git_service = get_advanced_git_service(req.repo_path)
        comparison = git_service.compare_branches(req.branch1, req.branch2)
        return comparison
    except Exception as e:
        raise HTTPException(400, str(e))


# Advanced Search and Replace Endpoints
class SearchRequest(BaseModel):
    project_root: str
    query: str
    pattern_type: Optional[str] = "text"  # 'text', 'regex', 'word'
    case_sensitive: Optional[bool] = False
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    max_results: Optional[int] = 1000
    context_lines: Optional[int] = 2


class ReplaceRequest(BaseModel):
    project_root: str
    search_result: Dict[str, Any]  # SearchResult as dict
    replacement: str
    selected_matches: Optional[List[int]] = None


class ExportRequest(BaseModel):
    search_result: Dict[str, Any]  # SearchResult as dict
    format: Optional[str] = "json"  # 'json', 'csv', 'text'


@app.post("/search/files")
def search_in_files(req: SearchRequest):
    """Search for text in files"""
    try:
        search_service = get_search_service(req.project_root)
        result = search_service.search_in_files(
            query=req.query,
            pattern_type=req.pattern_type,
            case_sensitive=req.case_sensitive,
            include_patterns=req.include_patterns,
            exclude_patterns=req.exclude_patterns,
            max_results=req.max_results,
            context_lines=req.context_lines,
        )

        return {
            "query": result.query,
            "pattern_type": result.pattern_type,
            "case_sensitive": result.case_sensitive,
            "total_matches": result.total_matches,
            "files_searched": result.files_searched,
            "search_time": result.search_time,
            "timestamp": result.timestamp.isoformat(),
            "matches": [
                {
                    "file_path": m.file_path,
                    "line_number": m.line_number,
                    "column_start": m.column_start,
                    "column_end": m.column_end,
                    "line_content": m.line_content,
                    "match_text": m.match_text,
                    "context_before": m.context_before,
                    "context_after": m.context_after,
                }
                for m in result.matches
            ],
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/search/replace-preview")
def get_replace_preview(req: ReplaceRequest):
    """Get preview of replacements"""
    try:
        search_service = get_search_service(req.project_root)

        # Reconstruct SearchResult from dict
        from datetime import datetime

        from search.advanced_search import SearchMatch, SearchResult

        matches = []
        for m_data in req.search_result["matches"]:
            match = SearchMatch(
                file_path=m_data["file_path"],
                line_number=m_data["line_number"],
                column_start=m_data["column_start"],
                column_end=m_data["column_end"],
                line_content=m_data["line_content"],
                match_text=m_data["match_text"],
                context_before=m_data.get("context_before"),
                context_after=m_data.get("context_after"),
            )
            matches.append(match)

        search_result = SearchResult(
            query=req.search_result["query"],
            pattern_type=req.search_result["pattern_type"],
            case_sensitive=req.search_result["case_sensitive"],
            matches=matches,
            total_matches=req.search_result["total_matches"],
            files_searched=req.search_result["files_searched"],
            search_time=req.search_result["search_time"],
            timestamp=datetime.fromisoformat(req.search_result["timestamp"]),
        )

        previews = search_service.get_replace_preview(search_result, req.replacement)

        return {
            "previews": [
                {
                    "original_match": {
                        "file_path": p.original_match.file_path,
                        "line_number": p.original_match.line_number,
                        "line_content": p.original_match.line_content,
                        "match_text": p.original_match.match_text,
                    },
                    "replacement_text": p.replacement_text,
                    "new_line_content": p.new_line_content,
                }
                for p in previews
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/search/replace")
def execute_replace(req: ReplaceRequest):
    """Execute replacements"""
    try:
        search_service = get_search_service(req.project_root)

        # Reconstruct SearchResult from dict (same as preview)
        from datetime import datetime

        from search.advanced_search import SearchMatch, SearchResult

        matches = []
        for m_data in req.search_result["matches"]:
            match = SearchMatch(
                file_path=m_data["file_path"],
                line_number=m_data["line_number"],
                column_start=m_data["column_start"],
                column_end=m_data["column_end"],
                line_content=m_data["line_content"],
                match_text=m_data["match_text"],
                context_before=m_data.get("context_before"),
                context_after=m_data.get("context_after"),
            )
            matches.append(match)

        search_result = SearchResult(
            query=req.search_result["query"],
            pattern_type=req.search_result["pattern_type"],
            case_sensitive=req.search_result["case_sensitive"],
            matches=matches,
            total_matches=req.search_result["total_matches"],
            files_searched=req.search_result["files_searched"],
            search_time=req.search_result["search_time"],
            timestamp=datetime.fromisoformat(req.search_result["timestamp"]),
        )

        result = search_service.execute_replace(
            search_result, req.replacement, req.selected_matches
        )
        return result
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/search/history")
def get_search_history(project_root: str, limit: int = 50):
    """Get search history"""
    try:
        search_service = get_search_service(project_root)
        history = search_service.get_search_history(limit)

        return {
            "history": [
                {
                    "query": h.query,
                    "pattern_type": h.pattern_type,
                    "case_sensitive": h.case_sensitive,
                    "include_patterns": h.include_patterns,
                    "exclude_patterns": h.exclude_patterns,
                    "timestamp": h.timestamp.isoformat(),
                    "result_count": h.result_count,
                }
                for h in history
            ]
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@app.delete("/search/history")
def clear_search_history(project_root: str):
    """Clear search history"""
    try:
        search_service = get_search_service(project_root)
        search_service.clear_search_history()
        return {"success": True}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/search/export")
def export_search_results(req: ExportRequest):
    """Export search results"""
    try:
        # Reconstruct SearchResult from dict
        from datetime import datetime

        from search.advanced_search import SearchMatch, SearchResult

        matches = []
        for m_data in req.search_result["matches"]:
            match = SearchMatch(
                file_path=m_data["file_path"],
                line_number=m_data["line_number"],
                column_start=m_data["column_start"],
                column_end=m_data["column_end"],
                line_content=m_data["line_content"],
                match_text=m_data["match_text"],
                context_before=m_data.get("context_before"),
                context_after=m_data.get("context_after"),
            )
            matches.append(match)

        search_result = SearchResult(
            query=req.search_result["query"],
            pattern_type=req.search_result["pattern_type"],
            case_sensitive=req.search_result["case_sensitive"],
            matches=matches,
            total_matches=req.search_result["total_matches"],
            files_searched=req.search_result["files_searched"],
            search_time=req.search_result["search_time"],
            timestamp=datetime.fromisoformat(req.search_result["timestamp"]),
        )

        # Use a dummy search service for export (doesn't need project root)
        from search.advanced_search import AdvancedSearchService

        search_service = AdvancedSearchService(".")

        exported_data = search_service.export_search_results(search_result, req.format)

        return {"data": exported_data, "format": req.format}
    except Exception as e:
        raise HTTPException(400, str(e))


# Direct Code Generation Endpoints
class CodeGenerationRequest(BaseModel):
    prompt: str
    language: Optional[str] = "python"
    file_path: Optional[str] = None
    insert_at_cursor: Optional[bool] = True
    context: Optional[str] = None


@app.post("/ai/generate-code")
async def generate_code_direct(req: CodeGenerationRequest):
    """Generate code directly from prompt"""
    try:
        # Create a coding-focused system prompt
        system_prompt = f"""You are an expert {req.language} programmer. Generate clean, well-commented, production-ready code.

Rules:
1. Only return the code, no explanations unless asked
2. Include proper error handling
3. Follow best practices for {req.language}
4. Make code readable and maintainable
5. Add brief comments for complex logic"""

        # Add context if provided
        full_prompt = req.prompt
        if req.context:
            full_prompt = f"Context: {req.context}\n\nTask: {req.prompt}"

        # Generate code using AI orchestrator
        result = ai_orchestrator.generate(
            prompt=full_prompt,
            system_prompt=system_prompt,
            temperature=0.3,  # Lower temperature for more consistent code
            max_tokens=2000,
        )

        if result["success"]:
            return {
                "code": result["response"],
                "language": req.language,
                "provider_used": result["provider_used"],
                "success": True,
            }
        else:
            return {"code": "", "error": result["error"], "success": False}

    except Exception as e:
        return {"code": "", "error": str(e), "success": False}


@app.post("/ai/explain-code")
async def explain_code(req: CodeGenerationRequest):
    """Explain code functionality"""
    try:
        system_prompt = """You are a code mentor. Explain code clearly and concisely.

Rules:
1. Explain what the code does
2. Highlight key concepts
3. Mention any potential issues
4. Suggest improvements if relevant
5. Keep explanations beginner-friendly but technically accurate"""

        result = ai_orchestrator.generate(
            prompt=f"Explain this {req.language} code:\n\n{req.prompt}",
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=1000,
        )

        if result["success"]:
            return {
                "explanation": result["response"],
                "provider_used": result["provider_used"],
                "success": True,
            }
        else:
            return {
                "explanation": "Unable to explain code at this time.",
                "error": result["error"],
                "success": False,
            }

    except Exception as e:
        return {
            "explanation": "Error occurred while explaining code.",
            "error": str(e),
            "success": False,
        }


@app.post("/ai/fix-code")
async def fix_code(req: CodeGenerationRequest):
    """Fix code issues"""
    try:
        system_prompt = f"""You are a {req.language} debugging expert. Fix code issues and improve code quality.

Rules:
1. Identify and fix syntax errors
2. Improve logic and performance
3. Add proper error handling
4. Follow {req.language} best practices
5. Return only the corrected code
6. Add comments explaining fixes if significant changes made"""

        result = ai_orchestrator.generate(
            prompt=f"Fix this {req.language} code:\n\n{req.prompt}",
            system_prompt=system_prompt,
            temperature=0.2,  # Very low temperature for consistent fixes
            max_tokens=2000,
        )

        if result["success"]:
            return {
                "fixed_code": result["response"],
                "provider_used": result["provider_used"],
                "success": True,
            }
        else:
            return {
                "fixed_code": req.prompt,  # Return original if fix fails
                "error": result["error"],
                "success": False,
            }

    except Exception as e:
        return {"fixed_code": req.prompt, "error": str(e), "success": False}


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
                "hitCount": 0,
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
                {"name": "y", "value": "20", "type": "int", "scope": "local"},
            ],
            "callStack": [
                {"file": req.file, "line": 1, "function": "main()"},
                {"file": req.file, "line": 5, "function": "helper()"},
            ],
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
                {"name": "y", "value": "20", "type": "int", "scope": "local"},
            ],
            "callStack": [
                {"file": "main.py", "line": 15, "function": "main()"},
                {"file": "main.py", "line": 5, "function": "helper()"},
            ],
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
            headers={
                "Content-Disposition": f"attachment; filename=terminal-{terminal_id}-output.txt"
            },
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
        shells = ["cmd.exe", "powershell.exe", "bash", "zsh", "fish"]
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
            if item.name.startswith("."):
                continue

            stat = item.stat()
            files.append(
                {
                    "name": item.name,
                    "path": str(item.relative_to(root_path)),
                    "type": "folder" if item.is_dir() else "file",
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "selected": False,
                }
            )

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
                pattern = re.compile(
                    req.query, re.IGNORECASE if not req.caseSensitive else 0
                )
            except re.error:
                raise HTTPException(400, "Invalid regex pattern")
        else:
            query = req.query if req.caseSensitive else req.query.lower()
            if req.wholeWord:
                pattern = re.compile(r"\b" + re.escape(query) + r"\b")
            else:
                pattern = re.compile(
                    re.escape(query), re.IGNORECASE if not req.caseSensitive else 0
                )

        # Search files
        for file_path in root_path.rglob("*"):
            if file_path.is_dir():
                continue

            # Apply file type filter
            if req.fileTypes:
                ext = file_path.suffix.lower().lstrip(".")
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
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        if pattern.search(line):
                            results.append(
                                {
                                    "file": str(file_path.relative_to(root_path)),
                                    "line": line_num,
                                    "content": line.strip(),
                                }
                            )
            except Exception:
                continue

        return {"results": results}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/files/bulk")
def bulk_file_operation(req: BulkOperationRequest):
    """Perform bulk file operations"""
    try:
        if req.type == "copy":
            for file_path in req.files:
                if not req.destination:
                    raise HTTPException(400, "Destination required for copy operation")
                src = Path(file_path)
                dst = Path(req.destination) / src.name
                shutil.copy2(src, dst)

        elif req.type == "move":
            for file_path in req.files:
                if not req.destination:
                    raise HTTPException(400, "Destination required for move operation")
                src = Path(file_path)
                dst = Path(req.destination) / src.name
                shutil.move(str(src), str(dst))

        elif req.type == "delete":
            for file_path in req.files:
                path = Path(file_path)
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()

        elif req.type == "download":
            # Create zip file with selected files
            import tempfile
            import zipfile

            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                with zipfile.ZipFile(tmp.name, "w") as zipf:
                    for file_path in req.files:
                        path = Path(file_path)
                        if path.exists():
                            zipf.write(path, path.name)

                return Response(
                    content=open(tmp.name, "rb").read(),
                    media_type="application/zip",
                    headers={"Content-Disposition": "attachment; filename=files.zip"},
                )

        elif req.type == "rename":
            if len(req.files) != 1 or not req.newName:
                raise HTTPException(
                    400, "Rename operation requires exactly one file and new name"
                )

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
            "active_users": session.get_active_users(),
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
        await websocket.send_json(
            {"type": "connected", "message": "File watcher connected"}
        )

        # Handle messages
        while True:
            try:
                data = await websocket.receive_json()

                if data.get("type") == "start_watching":
                    project_root = data.get("projectRoot")
                    if project_root:
                        # Start watching the project directory
                        # This would integrate with a file watcher library like watchdog
                        await websocket.send_json(
                            {"type": "watching_started", "projectRoot": project_root}
                        )

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
        await websocket.send_json(
            {
                "type": "sync",
                "content": session.content,
                "version": session.version,
                "users": session.get_active_users(),
            }
        )

        # Notify other users
        await session.broadcast(
            {"type": "user_joined", "user": user.to_dict()}, exclude_user=user_id
        )

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
            await session.broadcast({"type": "user_left", "user_id": user_id})

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


import logging

from terminal import terminal_session


# Code completion endpoint
class CompletionRequest(BaseModel):
    code: str
    cursor_pos: int
    file_path: str
    language: Optional[str] = None


@app.post("/complete")
def get_code_completion(req: CompletionRequest):
    """Get enhanced code completion suggestions"""
    try:
        result = code_intelligence.get_completions(
            req.code, req.cursor_pos, req.file_path, req.language
        )
        return result

    except Exception as e:
        return {"completions": [], "error": str(e), "success": False}


# Additional code intelligence endpoints
class HoverRequest(BaseModel):
    code: str
    cursor_pos: int
    file_path: str


class SignatureRequest(BaseModel):
    code: str
    cursor_pos: int
    file_path: str


class DefinitionRequest(BaseModel):
    code: str
    cursor_pos: int
    file_path: str


class ReferencesRequest(BaseModel):
    code: str
    cursor_pos: int
    file_path: str


@app.post("/hover")
def get_hover_info(req: HoverRequest):
    """Get hover information for symbol at cursor"""
    try:
        result = code_intelligence.get_hover_info(
            req.code, req.cursor_pos, req.file_path
        )
        return result
    except Exception as e:
        return {"info": None, "error": str(e), "success": False}


@app.post("/signature")
def get_signature_help(req: SignatureRequest):
    """Get function signature help"""
    try:
        result = code_intelligence.get_signature_help(
            req.code, req.cursor_pos, req.file_path
        )
        return result
    except Exception as e:
        return {"signatures": [], "error": str(e), "success": False}


@app.post("/definition")
def find_definition(req: DefinitionRequest):
    """Find definition of symbol at cursor"""
    try:
        result = code_intelligence.find_definition(
            req.code, req.cursor_pos, req.file_path
        )
        return result
    except Exception as e:
        return {"locations": [], "error": str(e), "success": False}


@app.post("/references")
def find_references(req: ReferencesRequest):
    """Find all references to symbol at cursor"""
    try:
        result = code_intelligence.find_references(
            req.code, req.cursor_pos, req.file_path
        )
        return result
    except Exception as e:
        return {"references": [], "error": str(e), "success": False}


# File watching endpoints
class WatchRequest(BaseModel):
    path: str


@app.post("/watch/start")
def start_watching(req: WatchRequest):
    """Start watching a directory for file changes"""
    try:
        success = file_watcher.watch_path(req.path)
        return {
            "success": success,
            "path": req.path,
            "message": "Started watching" if success else "Failed to start watching",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/watch/stop")
def stop_watching(req: WatchRequest):
    """Stop watching a directory"""
    try:
        success = file_watcher.unwatch_path(req.path)
        return {
            "success": success,
            "path": req.path,
            "message": "Stopped watching" if success else "Path was not being watched",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/watch/status")
def get_watch_status():
    """Get status of all watched paths"""
    try:
        watched_paths = list(file_watcher.get_watched_paths())
        return {
            "watched_paths": watched_paths,
            "count": len(watched_paths),
            "success": True,
        }
    except Exception as e:
        return {"watched_paths": [], "count": 0, "error": str(e), "success": False}


# Enhanced Git endpoints
@app.get("/git/info")
def get_git_repo_info(root: str):
    """Get comprehensive repository information"""
    try:
        result = git_service.get_repo_info(root)
        return result
    except Exception as e:
        return {"error": str(e)}


@app.get("/git/history")
def get_commit_history(root: str, limit: int = 50, branch: Optional[str] = None):
    """Get commit history"""
    try:
        result = git_service.get_commit_history(root, limit, branch)
        return result
    except Exception as e:
        return {"error": str(e), "commits": []}


@app.get("/git/branches/detailed")
def get_detailed_branches(root: str, include_remote: bool = True):
    """Get detailed branch information"""
    try:
        result = git_service.get_branches(root, include_remote)
        return result
    except Exception as e:
        return {"error": str(e), "branches": []}


@app.get("/git/blame")
def get_file_blame(root: str, file_path: str):
    """Get git blame for a file"""
    try:
        result = git_service.get_file_blame(root, file_path)
        return result
    except Exception as e:
        return {"error": str(e), "blame": []}


@app.get("/git/stash")
def get_stash_list(root: str):
    """Get list of stashes"""
    try:
        result = git_service.get_stash_list(root)
        return result
    except Exception as e:
        return {"error": str(e), "stashes": []}


class StashRequest(BaseModel):
    root: str
    message: Optional[str] = None
    include_untracked: bool = False


@app.post("/git/stash/create")
def create_stash(req: StashRequest):
    """Create a new stash"""
    try:
        result = git_service.create_stash(req.root, req.message, req.include_untracked)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


class ApplyStashRequest(BaseModel):
    root: str
    stash_name: str = "stash@{0}"


@app.post("/git/stash/apply")
def apply_stash(req: ApplyStashRequest):
    """Apply a stash"""
    try:
        result = git_service.apply_stash(req.root, req.stash_name)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.get("/git/conflicts")
def get_merge_conflicts(root: str):
    """Get merge conflict information"""
    try:
        result = git_service.get_merge_conflicts(root)
        return result
    except Exception as e:
        return {"error": str(e), "conflicts": []}


class ResolveConflictRequest(BaseModel):
    root: str
    file_path: str
    resolution: str  # 'ours' or 'theirs'


@app.post("/git/conflicts/resolve")
def resolve_merge_conflict(req: ResolveConflictRequest):
    """Resolve a merge conflict"""
    try:
        result = git_service.resolve_conflict(req.root, req.file_path, req.resolution)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


# Debugging endpoints
class CreateDebugSessionRequest(BaseModel):
    file_path: str
    language: Optional[str] = None


class BreakpointRequest(BaseModel):
    session_id: str
    line: int
    condition: Optional[str] = None


class DebugActionRequest(BaseModel):
    session_id: str


class EvaluateRequest(BaseModel):
    session_id: str
    expression: str


@app.post("/debug/session/create")
def create_debug_session(req: CreateDebugSessionRequest):
    """Create a new debug session"""
    try:
        result = debugger_service.create_session(req.file_path, req.language)
        return result
    except Exception as e:
        return {"error": str(e), "session": None}


@app.get("/debug/sessions")
def list_debug_sessions():
    """List all active debug sessions"""
    try:
        sessions = debugger_service.list_sessions()
        return {"sessions": sessions, "total": len(sessions)}
    except Exception as e:
        return {"error": str(e), "sessions": []}


@app.get("/debug/session/{session_id}")
def get_debug_session(session_id: str):
    """Get debug session details"""
    try:
        session = debugger_service.get_session(session_id)
        if session:
            return {"session": session.to_dict()}
        else:
            return {"error": "Session not found", "session": None}
    except Exception as e:
        return {"error": str(e), "session": None}


@app.delete("/debug/session/{session_id}")
def terminate_debug_session(session_id: str):
    """Terminate a debug session"""
    try:
        result = debugger_service.terminate_session(session_id)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/breakpoint/set")
def set_breakpoint(req: BreakpointRequest):
    """Set a breakpoint"""
    try:
        result = debugger_service.set_breakpoint(
            req.session_id, req.line, req.condition
        )
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/breakpoint/remove")
def remove_breakpoint(req: BreakpointRequest):
    """Remove a breakpoint"""
    try:
        result = debugger_service.remove_breakpoint(req.session_id, req.line)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/start")
def start_debugging(req: DebugActionRequest):
    """Start debugging session"""
    try:
        result = debugger_service.start_debugging(req.session_id)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/pause")
def pause_debugging(req: DebugActionRequest):
    """Pause debugging session"""
    try:
        result = debugger_service.pause_debugging(req.session_id)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/resume")
def resume_debugging(req: DebugActionRequest):
    """Resume debugging session"""
    try:
        result = debugger_service.resume_debugging(req.session_id)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/step/over")
def step_over(req: DebugActionRequest):
    """Step over current line"""
    try:
        result = debugger_service.step_over(req.session_id)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/step/into")
def step_into(req: DebugActionRequest):
    """Step into function call"""
    try:
        result = debugger_service.step_into(req.session_id)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/debug/step/out")
def step_out(req: DebugActionRequest):
    """Step out of current function"""
    try:
        result = debugger_service.step_out(req.session_id)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


@app.get("/debug/variables/{session_id}")
def get_debug_variables(session_id: str, scope: str = "local"):
    """Get variables in debug session"""
    try:
        result = debugger_service.get_variables(session_id, scope)
        return result
    except Exception as e:
        return {"error": str(e), "variables": {}}


@app.post("/debug/evaluate")
def evaluate_expression(req: EvaluateRequest):
    """Evaluate expression in debug context"""
    try:
        result = debugger_service.evaluate_expression(req.session_id, req.expression)
        return result
    except Exception as e:
        return {"error": str(e), "result": None, "success": False}


# Settings endpoints
@app.get("/settings")
def get_settings(workspace_path: Optional[str] = None):
    """Get all settings"""
    try:
        settings = settings_service.get_settings(workspace_path)
        return {"settings": settings, "success": True}
    except Exception as e:
        return {"error": str(e), "settings": {}, "success": False}


@app.get("/settings/{key_path:path}")
def get_setting(key_path: str, workspace_path: Optional[str] = None):
    """Get a specific setting"""
    try:
        value = settings_service.get_setting(key_path, workspace_path)
        return {"value": value, "key": key_path, "success": True}
    except Exception as e:
        return {"error": str(e), "value": None, "success": False}


class UpdateSettingRequest(BaseModel):
    key_path: str
    value: Any
    scope: str = "user"  # "user" or "workspace"
    workspace_path: Optional[str] = None


@app.post("/settings/update")
def update_setting(req: UpdateSettingRequest):
    """Update a setting"""
    try:
        if req.scope == "workspace" and req.workspace_path:
            success = settings_service.update_workspace_setting(
                req.workspace_path, req.key_path, req.value
            )
        else:
            success = settings_service.update_user_setting(req.key_path, req.value)

        return {
            "success": success,
            "message": "Setting updated" if success else "Failed to update setting",
        }
    except Exception as e:
        return {"error": str(e), "success": False}


@app.post("/settings/reset")
def reset_settings(scope: str = "user"):
    """Reset settings to defaults"""
    try:
        success = settings_service.reset_settings(scope)
        return {
            "success": success,
            "message": "Settings reset" if success else "Failed to reset settings",
        }
    except Exception as e:
        return {"error": str(e), "success": False}


@app.get("/settings/export")
def export_settings(workspace_path: Optional[str] = None):
    """Export current settings"""
    try:
        settings = settings_service.export_settings(workspace_path)
        return {"settings": settings, "success": True}
    except Exception as e:
        return {"error": str(e), "settings": {}, "success": False}


class ImportSettingsRequest(BaseModel):
    settings: Dict[str, Any]
    scope: str = "user"


@app.post("/settings/import")
def import_settings(req: ImportSettingsRequest):
    """Import settings"""
    try:
        success = settings_service.import_settings(req.settings, req.scope)
        return {
            "success": success,
            "message": "Settings imported" if success else "Failed to import settings",
        }
    except Exception as e:
        return {"error": str(e), "success": False}


@app.get("/keybindings")
def get_keybindings():
    """Get keyboard shortcuts"""
    try:
        keybindings = settings_service.get_keybindings()
        return {"keybindings": keybindings, "success": True}
    except Exception as e:
        return {"error": str(e), "keybindings": {}, "success": False}


class UpdateKeybindingRequest(BaseModel):
    command: str
    keybinding: str


@app.post("/keybindings/update")
def update_keybinding(req: UpdateKeybindingRequest):
    """Update a keyboard shortcut"""
    try:
        success = settings_service.update_keybinding(req.command, req.keybinding)
        return {
            "success": success,
            "message": "Keybinding updated"
            if success
            else "Failed to update keybinding",
        }
    except Exception as e:
        return {"error": str(e), "success": False}


# Project-wide search and replace
class SearchInFilesRequest(BaseModel):
    root: str
    query: str
    caseSensitive: bool = False
    wholeWord: bool = False
    regex: bool = False
    includePattern: Optional[str] = None
    excludePattern: Optional[str] = None


class ReplaceInFilesRequest(BaseModel):
    root: str
    query: str
    replacement: str
    caseSensitive: bool = False
    wholeWord: bool = False
    regex: bool = False
    includePattern: Optional[str] = None
    excludePattern: Optional[str] = None


@app.post("/search/files")
def search_in_files(req: SearchInFilesRequest):
    """Search for text across multiple files"""
    try:
        import os
        import re
        from pathlib import Path

        results = []
        root_path = Path(req.root)

        if not root_path.exists():
            return {"error": "Root path not found", "results": []}

        # Build search pattern
        flags = 0 if req.caseSensitive else re.IGNORECASE

        if req.regex:
            try:
                pattern = re.compile(req.query, flags)
            except re.error as e:
                return {"error": f"Invalid regex: {str(e)}", "results": []}
        else:
            escaped_query = re.escape(req.query)
            if req.wholeWord:
                escaped_query = r"\b" + escaped_query + r"\b"
            pattern = re.compile(escaped_query, flags)

        # Search files
        for file_path in root_path.rglob("*"):
            if file_path.is_file():
                # Skip binary files and common ignore patterns
                if file_path.suffix in [".pyc", ".exe", ".dll", ".so", ".dylib"] or any(
                    ignore in str(file_path)
                    for ignore in [".git", "__pycache__", "node_modules"]
                ):
                    continue

                # Apply include/exclude patterns
                if req.includePattern and not re.search(
                    req.includePattern, str(file_path)
                ):
                    continue
                if req.excludePattern and re.search(req.excludePattern, str(file_path)):
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line_num, line in enumerate(f, 1):
                            matches = list(pattern.finditer(line))
                            for match in matches:
                                results.append(
                                    {
                                        "file": str(file_path.relative_to(root_path)),
                                        "line": line_num,
                                        "column": match.start() + 1,
                                        "text": line.strip(),
                                        "match": match.group(),
                                    }
                                )
                except Exception:
                    continue

        return {
            "results": results[:1000],  # Limit results
            "total": len(results),
            "query": req.query,
        }

    except Exception as e:
        return {"error": str(e), "results": []}


@app.post("/search/replace")
def replace_in_files(req: ReplaceInFilesRequest):
    """Replace text across multiple files"""
    try:
        import os
        import re
        from pathlib import Path

        replaced_files = []
        total_replacements = 0
        root_path = Path(req.root)

        if not root_path.exists():
            return {"error": "Root path not found", "replaced_files": []}

        # Build search pattern
        flags = 0 if req.caseSensitive else re.IGNORECASE

        if req.regex:
            try:
                pattern = re.compile(req.query, flags)
            except re.error as e:
                return {"error": f"Invalid regex: {str(e)}", "replaced_files": []}
        else:
            escaped_query = re.escape(req.query)
            if req.wholeWord:
                escaped_query = r"\b" + escaped_query + r"\b"
            pattern = re.compile(escaped_query, flags)

        # Replace in files
        for file_path in root_path.rglob("*"):
            if file_path.is_file():
                # Skip binary files and common ignore patterns
                if file_path.suffix in [".pyc", ".exe", ".dll", ".so", ".dylib"] or any(
                    ignore in str(file_path)
                    for ignore in [".git", "__pycache__", "node_modules"]
                ):
                    continue

                # Apply include/exclude patterns
                if req.includePattern and not re.search(
                    req.includePattern, str(file_path)
                ):
                    continue
                if req.excludePattern and re.search(req.excludePattern, str(file_path)):
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    new_content, count = pattern.subn(req.replacement, content)

                    if count > 0:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(new_content)

                        replaced_files.append(
                            {
                                "file": str(file_path.relative_to(root_path)),
                                "replacements": count,
                            }
                        )
                        total_replacements += count

                except Exception:
                    continue

        return {
            "replaced_files": replaced_files,
            "total_replacements": total_replacements,
            "query": req.query,
            "replacement": req.replacement,
        }

    except Exception as e:
        return {"error": str(e), "replaced_files": []}


# ------------------- Terminal (WebSocket) -------------------------
@app.websocket("/ws/terminal")
async def terminal_ws(ws: WebSocket):
    """WebSocket endpoint for terminal sessions"""
    try:
        # Delegate to terminal_session helper
        await terminal_session(ws)
    except Exception as e:
        logging.error(f"Terminal WebSocket error: {e}")
        try:
            await ws.close()
        except:
            pass


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
        fix_result = mcp_service.fix_issues(
            FixRequest(
                project_path=req.root,
                issues=scan.issues,
                auto_apply=True,
                dry_run=req.dry_run,
            )
        )
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
        for ext in [".py", ".js", ".ts", ".jsx", ".tsx"]:
            all_files.extend(project_root.rglob(f"*{ext}"))

        # Filter out common ignored directories
        ignored_dirs = {
            ".git",
            "__pycache__",
            "node_modules",
            ".venv",
            "venv",
            "env",
            ".env",
        }
        filtered_files = [
            f for f in all_files if not any(part in ignored_dirs for part in f.parts)
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
                "total_issues": total_issues,
            },
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
def chat_session_messages(
    session_id: str, limit: Optional[int] = None, offset: int = 0
):
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
    return get_sandbox().execute_python(
        req.code, timeout=req.timeout or 30, memory_limit=req.memory_limit or "256m"
    )


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
    return get_sandbox().execute_shell(
        req.command, timeout=req.timeout or 30, allowed_commands=req.allowed_commands
    )


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
    import json
    import subprocess
    import tempfile

    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        ) as f:
            f.write(code)
            temp_path = f.name
        cmd = ["npx", "--yes", "prettier@3", "--parser", parser, temp_path]
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
        r = requests.get(
            f"{os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434')}/api/tags", timeout=2
        )
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
        result = subprocess.run(
            cmd, cwd=str(cwd), capture_output=True, text=True, timeout=300
        )
        return {
            "status": "ok" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
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
            await ws.send_json(
                {"type": "error", "message": "session_id or file_path required"}
            )
            await ws.close()
            return
        # Create user and join
        user = session_manager.create_user(user_name)
        session.add_user(user, ws)
        # Send initial sync
        await ws.send_json(
            {
                "type": "sync",
                "content": session.content,
                "version": session.version,
                "users": session.get_active_users(),
                "session": session.get_session_info(),
            }
        )
        # Broadcast presence
        await session.broadcast(
            {"type": "join", "user": user.to_dict()}, exclude_user=user.id
        )
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


# ==================== LSP (Language Server Protocol) ENDPOINTS ====================


class LSPStartRequest(BaseModel):
    language: str
    root_path: str


class LSPDocumentRequest(BaseModel):
    file_path: str
    content: str
    language: str
    version: Optional[int] = None


class LSPPositionRequest(BaseModel):
    file_path: str
    line: int
    character: int
    language: str


@app.post("/lsp/start")
async def start_lsp_server(req: LSPStartRequest):
    """Start LSP server for language"""
    try:
        success = await lsp_manager.start_server(req.language, req.root_path)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error starting LSP server: {e}")
        return {"success": False, "error": str(e)}


@app.post("/lsp/document/open")
async def lsp_document_open(req: LSPDocumentRequest):
    """Notify LSP that document was opened"""
    try:
        await lsp_manager.did_open_document(req.file_path, req.content, req.language)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error opening LSP document: {e}")
        return {"success": False, "error": str(e)}


@app.post("/lsp/document/change")
async def lsp_document_change(req: LSPDocumentRequest):
    """Notify LSP that document was changed"""
    try:
        await lsp_manager.did_change_document(
            req.file_path, req.content, req.version or 1, req.language
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error changing LSP document: {e}")
        return {"success": False, "error": str(e)}


@app.post("/lsp/completions")
async def lsp_completions(req: LSPPositionRequest):
    """Get LSP completions"""
    try:
        completions = await lsp_manager.get_completions(
            req.file_path, req.line, req.character, req.language
        )
        return {
            "completions": [
                {
                    "label": c.label,
                    "kind": c.kind,
                    "detail": c.detail,
                    "documentation": c.documentation,
                    "insertText": c.insert_text,
                    "sortText": c.sort_text,
                }
                for c in completions
            ]
        }
    except Exception as e:
        logger.error(f"Error getting LSP completions: {e}")
        return {"completions": []}


@app.post("/lsp/hover")
async def lsp_hover(req: LSPPositionRequest):
    """Get LSP hover information"""
    try:
        hover = await lsp_manager.get_hover(
            req.file_path, req.line, req.character, req.language
        )
        return {"hover": hover}
    except Exception as e:
        logger.error(f"Error getting LSP hover: {e}")
        return {"hover": None}


@app.post("/lsp/definition")
async def lsp_definition(req: LSPPositionRequest):
    """Get LSP definition"""
    try:
        definition = await lsp_manager.goto_definition(
            req.file_path, req.line, req.character, req.language
        )
        return {"definition": definition}
    except Exception as e:
        logger.error(f"Error getting LSP definition: {e}")
        return {"definition": None}


@app.post("/lsp/references")
async def lsp_references(req: LSPPositionRequest):
    """Get LSP references"""
    try:
        references = await lsp_manager.find_references(
            req.file_path, req.line, req.character, req.language
        )
        return {"references": references}
    except Exception as e:
        logger.error(f"Error getting LSP references: {e}")
        return {"references": []}


# ==================== DAP (Debug Adapter Protocol) ENDPOINTS ====================


class DAPCreateSessionRequest(BaseModel):
    language: str
    program: str
    args: Optional[List[str]] = None


class DAPBreakpointsRequest(BaseModel):
    session_id: str
    file_path: str
    breakpoints: List[Dict[str, Any]]


class DAPStepRequest(BaseModel):
    session_id: str
    thread_id: Optional[int] = None


class DAPEvaluateRequest(BaseModel):
    session_id: str
    expression: str
    frame_id: Optional[int] = None


@app.post("/dap/session/create")
async def create_dap_session(req: DAPCreateSessionRequest):
    """Create a new DAP debug session"""
    try:
        session_id = await dap_manager.create_session(
            language=req.language, program=req.program, args=req.args or []
        )

        if session_id:
            return {"success": True, "session_id": session_id}
        else:
            return {"success": False, "error": "Failed to create debug session"}

    except Exception as e:
        logger.error(f"Error creating DAP session: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/launch")
async def launch_dap_session(session_id: str):
    """Launch a DAP debug session"""
    try:
        success = await dap_manager.launch_session(session_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error launching DAP session: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/attach")
async def attach_dap_session(session_id: str, port: int):
    """Attach to a running process"""
    try:
        success = await dap_manager.attach_session(session_id, port)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error attaching DAP session: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/terminate")
async def terminate_dap_session(session_id: str):
    """Terminate a DAP debug session"""
    try:
        success = await dap_manager.terminate_session(session_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error terminating DAP session: {e}")
        return {"success": False, "error": str(e)}


@app.get("/dap/sessions")
async def list_dap_sessions():
    """List all DAP debug sessions"""
    try:
        sessions = dap_manager.list_sessions()
        return {"sessions": sessions}
    except Exception as e:
        logger.error(f"Error listing DAP sessions: {e}")
        return {"sessions": []}


@app.post("/dap/breakpoints")
async def set_dap_breakpoints(req: DAPBreakpointsRequest):
    """Set breakpoints in a debug session"""
    try:
        breakpoints = await dap_manager.set_breakpoints(
            session_id=req.session_id,
            file_path=req.file_path,
            breakpoints=req.breakpoints,
        )
        return {
            "success": True,
            "breakpoints": [
                {
                    "id": bp.id,
                    "file": bp.file,
                    "line": bp.line,
                    "enabled": bp.enabled,
                    "verified": bp.verified,
                    "condition": bp.condition,
                    "hit_condition": bp.hit_condition,
                }
                for bp in breakpoints
            ],
        }
    except Exception as e:
        logger.error(f"Error setting DAP breakpoints: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/continue")
async def continue_dap_execution(session_id: str, thread_id: Optional[int] = None):
    """Continue execution in debug session"""
    try:
        success = await dap_manager.continue_execution(session_id, thread_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error continuing DAP execution: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/step-over")
async def step_over_dap(session_id: str, req: DAPStepRequest):
    """Step over in debug session"""
    try:
        success = await dap_manager.step_over(session_id, req.thread_id or 1)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error stepping over in DAP: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/step-into")
async def step_into_dap(session_id: str, req: DAPStepRequest):
    """Step into in debug session"""
    try:
        success = await dap_manager.step_into(session_id, req.thread_id or 1)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error stepping into in DAP: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/step-out")
async def step_out_dap(session_id: str, req: DAPStepRequest):
    """Step out in debug session"""
    try:
        success = await dap_manager.step_out(session_id, req.thread_id or 1)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error stepping out in DAP: {e}")
        return {"success": False, "error": str(e)}


@app.post("/dap/session/{session_id}/pause")
async def pause_dap_execution(session_id: str, req: DAPStepRequest):
    """Pause execution in debug session"""
    try:
        success = await dap_manager.pause_execution(session_id, req.thread_id or 1)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error pausing DAP execution: {e}")
        return {"success": False, "error": str(e)}


@app.get("/dap/session/{session_id}/threads")
async def get_dap_threads(session_id: str):
    """Get threads in debug session"""
    try:
        threads = await dap_manager.get_threads(session_id)
        return {"threads": [{"id": t.id, "name": t.name} for t in threads]}
    except Exception as e:
        logger.error(f"Error getting DAP threads: {e}")
        return {"threads": []}


@app.get("/dap/session/{session_id}/stack-trace/{thread_id}")
async def get_dap_stack_trace(session_id: str, thread_id: int):
    """Get stack trace for thread"""
    try:
        frames = await dap_manager.get_stack_trace(session_id, thread_id)
        return {
            "stack_frames": [
                {
                    "id": f.id,
                    "name": f.name,
                    "source": f.source,
                    "line": f.line,
                    "column": f.column,
                    "end_line": f.end_line,
                    "end_column": f.end_column,
                }
                for f in frames
            ]
        }
    except Exception as e:
        logger.error(f"Error getting DAP stack trace: {e}")
        return {"stack_frames": []}


@app.get("/dap/session/{session_id}/variables/{variables_reference}")
async def get_dap_variables(session_id: str, variables_reference: int):
    """Get variables for scope"""
    try:
        variables = await dap_manager.get_variables(session_id, variables_reference)
        return {
            "variables": [
                {
                    "name": v.name,
                    "value": v.value,
                    "type": v.type,
                    "variables_reference": v.variables_reference,
                    "named_variables": v.named_variables,
                    "indexed_variables": v.indexed_variables,
                }
                for v in variables
            ]
        }
    except Exception as e:
        logger.error(f"Error getting DAP variables: {e}")
        return {"variables": []}


@app.post("/dap/session/{session_id}/evaluate")
async def evaluate_dap_expression(session_id: str, req: DAPEvaluateRequest):
    """Evaluate expression in debug context"""
    try:
        result = await dap_manager.evaluate_expression(
            session_id=session_id, expression=req.expression, frame_id=req.frame_id
        )
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Error evaluating DAP expression: {e}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
