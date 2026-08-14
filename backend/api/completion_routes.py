""
API routes for code completion
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Optional, List, Any
from pydantic import BaseModel

# Import our completion service
from ..ai.code_completion import code_completion, CompletionItem

router = APIRouter()

class CompletionRequest(BaseModel):
    """Request model for code completion"""
    code: str
    cursor_pos: int
    file_path: str
    language: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class CompletionResponse(BaseModel):
    """Response model for code completion"""
    completions: List[Dict[str, Any]]
    is_incomplete: bool = False

@router.post("/completions", response_model=CompletionResponse)
async def get_completions(request: CompletionRequest):
    """
    Get code completion suggestions for the given code and cursor position

    Args:
        request: Completion request with code, cursor position, and context

    Returns:
        List of completion items with metadata
    """
    try:
        completions = await code_completion.get_completions(
            code=request.code,
            cursor_pos=request.cursor_pos,
            file_path=request.file_path,
            language=request.language,
            context=request.context or {}
        )

        return CompletionResponse(
            completions=completions,
            is_incomplete=len(completions) >= 50  # Indicate if there are more results
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add the router to the FastAPI app in your main.py or similar
# from fastapi import FastAPI
# from .api.completion_routes import router as completion_router
# app = FastAPI()
# app.include_router(completion_router, prefix="/api/v1")
