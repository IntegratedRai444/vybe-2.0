"""
Monitoring module for Vybe AI OS.
Provides Prometheus metrics and monitoring utilities.
"""
from prometheus_client import start_http_server, Counter, Histogram, Gauge
import time
from typing import Callable, Any, Awaitable
from fastapi import Request, Response

# Request metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP Requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['endpoint']
)

# Application specific metrics
AI_REQUESTS = Counter(
    'ai_requests_total',
    'Total AI API requests',
    ['provider', 'model', 'status']
)

AI_REQUEST_LATENCY = Histogram(
    'ai_request_duration_seconds',
    'AI request latency',
    ['provider', 'model']
)

# System metrics
MEMORY_USAGE = Gauge('memory_usage_bytes', 'Memory usage in bytes')
CPU_USAGE = Gauge('cpu_usage_percent', 'CPU usage percentage')


def monitor_requests(app):
    """Middleware to monitor HTTP requests."""
    @app.middleware("http")
    async def monitor_requests_middleware(request: Request, call_next) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code
        ).inc()
        
        REQUEST_LATENCY.labels(
            endpoint=request.url.path
        ).observe(process_time)
        
        return response
    
    return app


def track_ai_request(provider: str, model: str):
    """Decorator to track AI API requests."""
    def decorator(func: Callable[..., Awaitable[Any]]):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise e
            finally:
                duration = time.time() - start_time
                AI_REQUESTS.labels(
                    provider=provider,
                    model=model,
                    status=status
                ).inc()
                AI_REQUEST_LATENCY.labels(
                    provider=provider,
                    model=model
                ).observe(duration)
        return wrapper
    return decorator


def start_metrics_server(port: int = 8001):
    """Start the Prometheus metrics server."""
    start_http_server(port)
    
    # Start background tasks for system metrics
    import threading
    import psutil
    import time as t
    
    def update_system_metrics():
        while True:
            MEMORY_USAGE.set(psutil.Process().memory_info().rss)
            CPU_USAGE.set(psutil.cpu_percent())
            t.sleep(5)
    
    thread = threading.Thread(target=update_system_metrics, daemon=True)
    thread.start()
