"""
Monitoring and metrics module for Vybe 2.0 API.
Handles Prometheus metrics, health checks, and system monitoring.
"""
import time
import psutil
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from .monitoring_config import config

logger = logging.getLogger(__name__)
router = APIRouter(tags=["monitoring"])


@router.get("/health", summary="Health check endpoint")
async def health_check() -> Dict[str, Any]:
    """
    Perform a health check of the application and its dependencies.

    Returns:
        Dict with health status and system information
    """
    try:
        # Check system resources
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        status = {
            "status": "healthy",
            "timestamp": time.time(),
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": memory.percent,
                "memory_used_gb": memory.used / (1024**3),
                "memory_total_gb": memory.total / (1024**3),
                "disk_percent": disk.percent,
                "disk_used_gb": disk.used / (1024**3),
                "disk_total_gb": disk.total / (1024**3),
            },
            "services": {
                "database": True,  # Add actual DB health check
                "cache": True,  # Add cache health check
                "ai_services": True,  # Add AI services health check
            },
        }

        return status

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=503, detail="Service Unavailable")


@router.get("/metrics", summary="Prometheus metrics endpoint")
async def metrics() -> bytes:
    """
    Expose Prometheus metrics.
    This endpoint is used by Prometheus to scrape application metrics.
    """
    return generate_latest()


@router.get("/readiness", summary="Readiness probe")
async def readiness() -> Dict[str, str]:
    """
    Kubernetes readiness probe endpoint.
    Indicates whether the application is ready to receive traffic.
    """
    # Add readiness checks here (e.g., database connection, cache, etc.)
    return {"status": "ready"}


@router.get("/liveness", summary="Liveness probe")
async def liveness() -> Dict[str, str]:
    """
    Kubernetes liveness probe endpoint.
    Indicates whether the application is running.
    """
    return {"status": "alive"}


def setup_monitoring(app):
    """Set up monitoring endpoints and middleware."""
    # Add monitoring routes
    app.include_router(router, prefix="/api")

    # Add Prometheus metrics endpoint
    @app.get("/metrics")
    async def metrics_endpoint():
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

    logger.info("Monitoring and metrics endpoints configured")
