"""
Pydantic models for deployment API
"""
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field, validator, HttpUrl


class DeploymentStatus(str, Enum):
    """Deployment status values"""

    PENDING = "pending"
    BUILDING = "building"
    DEPLOYING = "deploying"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELED = "canceled"


class DeploymentProvider(str, Enum):
    """Supported deployment providers"""

    VERCEL = "vercel"
    NETLIFY = "netlify"
    AWS = "aws"
    CUSTOM = "custom"
    GITHUB_PAGES = "github_pages"
    GITLAB_PAGES = "gitlab_pages"
    FIREBASE = "firebase"
    HEROKU = "heroku"
    DIGITALOCEAN = "digitalocean"
    AZURE = "azure"
    GCP = "gcp"


class DeploymentTargetCreate(BaseModel):
    """Model for creating a new deployment target"""

    name: str = Field(..., description="Name of the deployment target")
    provider: DeploymentProvider = Field(..., description="Deployment provider")
    config: Dict[str, Any] = Field(
        default_factory=dict, description="Provider-specific configuration"
    )
    environment: Dict[str, str] = Field(
        default_factory=dict, description="Environment variables for the deployment"
    )


class DeploymentTargetUpdate(BaseModel):
    """Model for updating a deployment target"""

    name: Optional[str] = Field(None, description="Name of the deployment target")
    config: Optional[Dict[str, Any]] = Field(
        None, description="Provider-specific configuration"
    )
    environment: Optional[Dict[str, str]] = Field(
        None, description="Environment variables for the deployment"
    )
    is_active: Optional[bool] = Field(None, description="Whether the target is active")


class DeploymentStartRequest(BaseModel):
    """Model for starting a deployment"""

    target_id: str = Field(..., description="ID of the deployment target")
    commit_hash: Optional[str] = Field(
        None, description="Git commit hash to deploy (defaults to HEAD)"
    )
    branch: Optional[str] = Field(
        None, description="Git branch to deploy (defaults to current branch)"
    )
    environment: Optional[Dict[str, str]] = Field(
        None, description="Additional environment variables for this deployment"
    )


class DeploymentLog(BaseModel):
    """Model for deployment log entries"""

    timestamp: str = Field(..., description="Log timestamp")
    message: str = Field(..., description="Log message")
    level: str = Field("info", description="Log level (info, warning, error)")
    source: Optional[str] = Field(
        None,
        description="Source of the log entry (e.g., 'build', 'deploy', 'provider')",
    )


class DeploymentStatusResponse(BaseModel):
    """Model for deployment status response"""

    deployment_id: str = Field(..., description="Unique deployment ID")
    status: str = Field(..., description="Current deployment status")
    target_id: str = Field(..., description="ID of the deployment target")
    target_name: str = Field(..., description="Name of the deployment target")
    started_at: str = Field(..., description="Deployment start timestamp")
    completed_at: Optional[str] = Field(
        None, description="Deployment completion timestamp (if finished)"
    )
    url: Optional[HttpUrl] = Field(
        None, description="URL of the deployed application (if available)"
    )
    logs: List[DeploymentLog] = Field(
        default_factory=list, description="Deployment logs"
    )
    error: Optional[str] = Field(
        None, description="Error message if the deployment failed"
    )


class DeploymentProviderInfo(BaseModel):
    """Information about a deployment provider"""

    id: str = Field(..., description="Provider ID")
    name: str = Field(..., description="Display name")
    description: str = Field(..., description="Provider description")
    icon: Optional[str] = Field(None, description="URL to provider's icon")
    website: Optional[HttpUrl] = Field(None, description="Provider's website URL")
    config_schema: Dict[str, Any] = Field(
        default_factory=dict, description="JSON schema for provider configuration"
    )
    environment_schema: Dict[str, Any] = Field(
        default_factory=dict, description="JSON schema for environment variables"
    )
    supports_preview: bool = Field(
        False, description="Whether the provider supports preview deployments"
    )
    requires_authentication: bool = Field(
        True, description="Whether the provider requires authentication"
    )


class DeploymentEnvironment(BaseModel):
    """Deployment environment configuration"""

    name: str = Field(
        ..., description="Environment name (e.g., 'production', 'staging')"
    )
    branch: Optional[str] = Field(
        None, description="Git branch to deploy for this environment"
    )
    variables: Dict[str, str] = Field(
        default_factory=dict, description="Environment variables"
    )
    auto_deploy: bool = Field(
        False, description="Whether to automatically deploy when the branch is updated"
    )
    protected: bool = Field(
        False,
        description="Whether the environment is protected (requires manual deployment)",
    )


class DeploymentHook(BaseModel):
    """Deployment webhook configuration"""

    id: str = Field(..., description="Hook ID")
    url: HttpUrl = Field(..., description="Webhook URL")
    events: List[str] = Field(
        default_factory=lambda: ["deployment"],
        description="Events to trigger the webhook",
    )
    secret: Optional[str] = Field(
        None, description="Secret for verifying webhook payloads"
    )
    active: bool = Field(True, description="Whether the webhook is active")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


class DeploymentSettings(BaseModel):
    """Deployment settings for a project"""

    project_id: str = Field(..., description="Project ID")
    default_environment: str = Field(
        "production", description="Default deployment environment"
    )
    environments: Dict[str, DeploymentEnvironment] = Field(
        default_factory=dict, description="Environment configurations"
    )
    hooks: List[DeploymentHook] = Field(
        default_factory=list, description="Deployment webhooks"
    )
    build_command: Optional[str] = Field(None, description="Custom build command")
    output_directory: Optional[str] = Field(
        None, description="Directory containing build output"
    )
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
