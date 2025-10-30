"""
Code completion API endpoints for Vybe AI OS
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import os
import logging

# Import our completion service
from ..ai.code_completion import code_completion

logger = logging.getLogger(__name__)
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
        logger.error(f"Error in get_completions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Additional completion-related endpoints can be added here
# For example:
# - Get documentation for a symbol
# - Get function signatures
# - Get type information
# - Get quick fixes/refactoring suggestions
