"""
Deployment-related WebSocket events
"""
from typing import Dict, Any, Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime

DeploymentStatus = Literal[
    "pending",
    "building",
    "deploying",
    "success",
    "failed",
    "cancelled"
]

class DeploymentEventTypes:
    """Deployment-related WebSocket event types"""
    DEPLOYMENT_STARTED = "deployment:started"
    DEPLOYMENT_STATUS_UPDATE = "deployment:status_update"
    DEPLOYMENT_LOGS = "deployment:logs"
    DEPLOYMENT_COMPLETED = "deployment:completed"
    DEPLOYMENT_FAILED = "deployment:failed"
    DEPLOYMENT_CANCELLED = "deployment:cancelled"

class DeploymentEventData(BaseModel):
    """Base deployment event data"""
    deployment_id: str
    project_id: str
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    metadata: Dict[str, Any] = {}

class DeploymentStartedData(DeploymentEventData):
    """Data for deployment started event"""
    target: str
    branch: str
    commit_hash: str
    environment: str = "production"

class DeploymentStatusUpdateData(DeploymentEventData):
    """Data for deployment status update event"""
    status: DeploymentStatus
    progress: int = Field(..., ge=0, le=100)
    message: Optional[str] = None

class DeploymentLogData(DeploymentEventData):
    """Data for deployment log event"""
    log: str
    level: Literal["info", "warning", "error"] = "info"
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())

class DeploymentCompletedData(DeploymentEventData):
    """Data for deployment completed event"""
    status: Literal["success", "failed", "cancelled"]
    duration: float
    url: Optional[str] = None
    error: Optional[str] = None

class DeploymentTargetInfo(BaseModel):
    """Information about a deployment target"""
    id: str
    name: str
    type: str  # e.g., "vercel", "netlify", "custom"
    url: Optional[str] = None
    is_active: bool = True

class DeploymentInfo(DeploymentEventData):
    """Complete deployment information"""
    status: DeploymentStatus
    target: DeploymentTargetInfo
    branch: str
    commit_hash: str
    environment: str
    started_at: float
    completed_at: Optional[float] = None
    duration: Optional[float] = None
    logs: List[DeploymentLogData] = []
    metadata: Dict[str, Any] = {}
    
    @property
    def is_complete(self) -> bool:
        return self.status in ["success", "failed", "cancelled"]
