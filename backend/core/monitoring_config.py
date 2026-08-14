"""
Monitoring configuration for Vybe 2.0 API
"""
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class MonitoringConfig(BaseModel):
    """Configuration for monitoring and metrics."""

    # Prometheus metrics
    enable_metrics: bool = True
    metrics_port: int = 8001
    metrics_path: str = "/metrics"

    # Request logging
    log_requests: bool = True
    log_responses: bool = True
    log_level: str = "INFO"

    # Rate limiting
    rate_limit_enabled: bool = True
    default_rate_limit: str = "100/minute"
    rate_limit_by_ip: bool = True

    # Performance monitoring
    enable_performance_metrics: bool = True
    slow_request_threshold_ms: int = 1000  # Log requests slower than this

    # Error tracking
    track_errors: bool = True
    error_reporting_enabled: bool = True

    # Health check endpoints
    health_check_path: str = "/health"
    ready_check_path: str = "/ready"

    # Request ID
    request_id_header: str = "X-Request-ID"

    class Config:
        env_prefix = "MONITORING_"


# Default configuration
config = MonitoringConfig()
