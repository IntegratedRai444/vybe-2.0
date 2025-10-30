"""
Code Completion Service for Vybe AI OS

This module provides a FastAPI application for code completion features.
"""

import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import our code completion service
from ai.code_completion import code_completion, CompletionItem

# Create FastAPI app
app = FastAPI(
    title="Vybe AI OS - Code Completion Service",
    description="AI-powered code completion service for Vybe AI OS",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Request/Response models
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

# API Endpoints
@app.post("/api/v1/code/completions", response_model=CompletionResponse)
async def get_completions(request: CompletionRequest):
    """
    Get code completion suggestions for the given code and cursor position
    
    Args:
        request: Completion request with code, cursor position, and context
        
    Returns:
        List of completion items with metadata
    """
    try:
        logger.info(f"Getting completions for {request.file_path} at position {request.cursor_pos}")
        
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
        logger.error(f"Error in get_completions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "code-completion",
        "version": "1.0.0"
    }

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

if __name__ == "__main__":
    # Run the FastAPI app with uvicorn
    uvicorn.run(
        "code_completion_app:app",
        host="0.0.0.0",
        port=8001,  # Use a different port than the main app
        reload=True,
        log_level="info"
    )
