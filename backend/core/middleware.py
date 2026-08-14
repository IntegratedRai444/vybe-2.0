import logging
import time
import uuid
from datetime import datetime
from typing import Awaitable, Callable, Dict, Any, Optional

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from prometheus_client import Counter, Histogram

from .config import settings
from .security import rate_limit_key_builder
from .monitoring_config import config

# Configure logging
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=rate_limit_key_builder, default_limits=[settings.RATE_LIMIT])

# Prometheus metrics
REQUEST_COUNTER = Counter(
    "http_requests_total", "Total HTTP Requests", ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)


# Request context for storing request-specific data
class RequestContext:
    def __init__(self):
        self.request_id = None
        self.start_time = None
        self.user_id = None
        self.client_ip = None
        self.user_agent = None


# Store request context in request state
async def get_request_context(request: Request) -> RequestContext:
    if not hasattr(request.state, "context"):
        request.state.context = RequestContext()
    return request.state.context


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
            response.headers["X-RateLimit-Reset"] = str(
                rate_limit.reset - int(time.time())
            )

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

    # Request context and ID middleware
    @app.middleware("http")
    async def add_request_context(request: Request, call_next) -> Response:
        # Initialize request context
        ctx = await get_request_context(request)
        ctx.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        ctx.start_time = time.time()
        ctx.client_ip = request.client.host if request.client else "unknown"
        ctx.user_agent = request.headers.get("user-agent", "")

        # Add request ID to response headers
        response = await call_next(request)
        response.headers["X-Request-ID"] = ctx.request_id
        return response

    # Security headers middleware
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next) -> Response:
        response = await call_next(request)

        # Security headers
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
        }

        for header, value in security_headers.items():
            if header not in response.headers:
                response.headers[header] = value

        return response

    # Request logging and metrics middleware
    @app.middleware("http")
    async def log_requests_and_metrics(request: Request, call_next) -> Response:
        ctx = await get_request_context(request)
        start_time = time.time()

        # Log request
        logger.info(
            "Request: %s %s (ID: %s, IP: %s, User-Agent: %s)",
            request.method,
            request.url.path,
            ctx.request_id,
            ctx.client_ip,
            ctx.user_agent,
        )

        # Process request
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000

            # Log response
            logger.info(
                "Response: %s %s - %d (%.2fms)",
                request.method,
                request.url.path,
                response.status_code,
                process_time,
            )

            # Record metrics
            REQUEST_COUNTER.labels(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
            ).inc()

            REQUEST_LATENCY.labels(
                method=request.method, endpoint=request.url.path
            ).observe(time.time() - start_time)

            # Add performance headers
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

            return response

        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                "Request failed: %s %s - %s (%.2fms)",
                request.method,
                request.url.path,
                str(e),
                process_time,
                exc_info=True,
            )
            raise
