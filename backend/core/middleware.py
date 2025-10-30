from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from typing import Callable, Awaitable
import time
import logging

from .config import settings
from .security import rate_limit_key_builder

# Configure logging
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(
    key_func=rate_limit_key_builder,
    default_limits=[settings.RATE_LIMIT]
)

class RateLimitMiddleware(SlowAPIMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[JSONResponse]]
    ) -> JSONResponse:
        # Add rate limiting headers
        response = await super().dispatch(request, call_next)
        rate_limit = getattr(request.state, "rate_limit", None)
        
        if rate_limit:
            response.headers["X-RateLimit-Limit"] = str(rate_limit.limit)
            response.headers["X-RateLimit-Remaining"] = str(rate_limit.remaining)
            response.headers["X-RateLimit-Reset"] = str(rate_limit.reset - int(time.time()))
        
        return response

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with JSON responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
        headers={
            "Retry-After": str(exc.retry_after),
            "X-RateLimit-Limit": str(request.state.rate_limit.limit),
            "X-RateLimit-Remaining": str(request.state.rate_limit.remaining),
            "X-RateLimit-Reset": str(request.state.rate_limit.reset - int(time.time())),
        },
    )

def setup_middleware(app):
    """Set up all middleware for the application."""
    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    
    # Security headers
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'"
        return response
    
    # Request logging
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        logger.info(
            "%s %s %s %s %s %s",
            request.method,
            request.url.path,
            response.status_code,
            f"{process_time:.2f}ms",
            request.client.host if request.client else "unknown",
            request.headers.get("user-agent", "")
        )
        
        return response
