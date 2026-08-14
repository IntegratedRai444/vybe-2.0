"""
MCP API Routes
FastAPI endpoints for the MCP service
"""
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from ..mcp.models import (
    ExplainRequest,
    ExplainResult,
    FixRequest,
    FixResult,
    RealTimeScanConfig,
    ScanRequest,
    ScanResult,
)
from ..mcp.service import MCPService, get_mcp_service

router = APIRouter(
    prefix="/api/mcp",
    tags=["mcp"],
    responses={404: {"description": "Not found"}},
)


# Dependency to get MCP service
async def get_mcp() -> MCPService:
    """Get the MCP service instance"""
    try:
        return await get_mcp_service()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize MCP service: {str(e)}",
        )


@router.post("/scan", response_model=ScanResult)
async def scan_project(
    request: ScanRequest, mcp: MCPService = Depends(get_mcp)
) -> ScanResult:
    """
    Scan a project or file for issues
    """
    try:
        return await mcp.scan_project(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan failed: {str(e)}",
        )


@router.post("/fix", response_model=FixResult)
async def fix_issues(
    request: FixRequest, mcp: MCPService = Depends(get_mcp)
) -> FixResult:
    """
    Fix issues in the code
    """
    try:
        return await mcp.fix_issues(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fix operation failed: {str(e)}",
        )


@router.post("/explain", response_model=ExplainResult)
async def explain_issue(
    request: ExplainRequest, mcp: MCPService = Depends(get_mcp)
) -> ExplainResult:
    """
    Explain an issue in detail
    """
    try:
        return await mcp.explain_issue(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to explain issue: {str(e)}",
        )


@router.get("/health")
async def health_check(mcp: MCPService = Depends(get_mcp)) -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "ok"}


@router.post("/realtime/start")
async def start_realtime_scanning(
    config: Optional[RealTimeScanConfig] = None, mcp: MCPService = Depends(get_mcp)
) -> Dict[str, str]:
    """
    Start real-time file system scanning
    """
    try:
        # Reinitialize with new config if provided
        if config:
            global _global_service
            _global_service = None
            mcp = await get_mcp_service({"real_time_scan": config.dict()})

        await mcp.start()
        return {"status": "Real-time scanning started"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start real-time scanning: {str(e)}",
        )


@router.post("/realtime/stop")
async def stop_realtime_scanning(mcp: MCPService = Depends(get_mcp)) -> Dict[str, str]:
    """
    Stop real-time file system scanning
    """
    try:
        await mcp.stop()
        return {"status": "Real-time scanning stopped"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop real-time scanning: {str(e)}",
        )
