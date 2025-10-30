"""
Event service for handling WebSocket events
"""
from datetime import datetime
from typing import Dict, Any, Optional, List
from ..services.websocket_service import websocket_manager, WebSocketEvent
from ..models.package_models import PackageInfo, PackageVulnerability, PackageAuditResult
from ..models.deployment_models import DeploymentStatus, DeploymentLog, DeploymentTarget
from ..models.git_models import GitRepositoryInfo, GitCommit, GitBranch, GitFile

class EventService:
    """Service for handling WebSocket events"""
    
    # Deployment Events
    @staticmethod
    async def deployment_started(deployment_id: str, target: DeploymentTarget):
        """Broadcast deployment started event"""
        await websocket_manager.broadcast(
            f"deployments:{deployment_id}",
            WebSocketEvent.create_event(
                WebSocketEvent.DEPLOYMENT_STARTED,
                {
                    "deployment_id": deployment_id,
                    "target": target.dict(),
                    "status": "in_progress",
                    "start_time": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def deployment_progress(deployment_id: str, progress: int, message: str):
        """Broadcast deployment progress update"""
        await websocket_manager.broadcast(
            f"deployments:{deployment_id}",
            WebSocketEvent.create_event(
                WebSocketEvent.DEPLOYMENT_PROGRESS,
                {
                    "deployment_id": deployment_id,
                    "progress": progress,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def deployment_logs(deployment_id: str, logs: str, is_error: bool = False):
        """Broadcast deployment logs"""
        await websocket_manager.broadcast(
            f"deployments:{deployment_id}:logs",
            WebSocketEvent.create_event(
                WebSocketEvent.DEPLOYMENT_LOGS,
                {
                    "deployment_id": deployment_id,
                    "logs": logs,
                    "is_error": is_error,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def deployment_completed(deployment_id: str, result: Dict):
        """Broadcast deployment completion"""
        await websocket_manager.broadcast(
            f"deployments:{deployment_id}",
            WebSocketEvent.create_event(
                WebSocketEvent.DEPLOYMENT_COMPLETED,
                {
                    "deployment_id": deployment_id,
                    "status": "completed",
                    "result": result,
                    "end_time": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def deployment_failed(deployment_id: str, error: str):
        """Broadcast deployment failure"""
        await websocket_manager.broadcast(
            f"deployments:{deployment_id}",
            WebSocketEvent.create_event(
                WebSocketEvent.DEPLOYMENT_FAILED,
                {
                    "deployment_id": deployment_id,
                    "status": "failed",
                    "error": error,
                    "end_time": datetime.utcnow().isoformat()
                }
            )
        )

    # Git Events
    @staticmethod
    async def git_status_updated(repo_path: str, status: Dict):
        """Broadcast Git repository status update"""
        await websocket_manager.broadcast(
            f"git:{repo_path}:status",
            WebSocketEvent.create_event(
                WebSocketEvent.GIT_STATUS_UPDATED,
                {
                    "repo_path": repo_path,
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def git_branch_changed(repo_path: str, branch: str):
        """Broadcast Git branch change"""
        await websocket_manager.broadcast(
            f"git:{repo_path}:branch",
            WebSocketEvent.create_event(
                WebSocketEvent.GIT_BRANCH_CHANGED,
                {
                    "repo_path": repo_path,
                    "branch": branch,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def git_commit_created(repo_path: str, commit: GitCommit):
        """Broadcast Git commit creation"""
        await websocket_manager.broadcast(
            f"git:{repo_path}:commits",
            WebSocketEvent.create_event(
                WebSocketEvent.GIT_COMMIT_CREATED,
                {
                    "repo_path": repo_path,
                    "commit": commit.dict(),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        )

    # Package Events
    @staticmethod
    async def package_install_started(package_name: str, version: str):
        """Broadcast package installation started"""
        await websocket_manager.broadcast(
            f"packages:{package_name}",
            WebSocketEvent.create_event(
                WebSocketEvent.PACKAGE_INSTALL_STARTED,
                {
                    "package": package_name,
                    "version": version,
                    "status": "installing",
                    "start_time": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def package_install_progress(package_name: str, progress: int, message: str):
        """Broadcast package installation progress"""
        await websocket_manager.broadcast(
            f"packages:{package_name}:progress",
            WebSocketEvent.create_event(
                WebSocketEvent.PACKAGE_INSTALL_PROGRESS,
                {
                    "package": package_name,
                    "progress": progress,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def package_install_completed(package_name: str, result: Dict):
        """Broadcast package installation completed"""
        await websocket_manager.broadcast(
            f"packages:{package_name}",
            WebSocketEvent.create_event(
                WebSocketEvent.PACKAGE_INSTALL_COMPLETED,
                {
                    "package": package_name,
                    "status": "installed",
                    "result": result,
                    "end_time": datetime.utcnow().isoformat()
                }
            )
        )

    @staticmethod
    async def package_install_failed(package_name: str, error: str):
        """Broadcast package installation failure"""
        await websocket_manager.broadcast(
            f"packages:{package_name}",
            WebSocketEvent.create_event(
                WebSocketEvent.PACKAGE_INSTALL_FAILED,
                {
                    "package": package_name,
                    "status": "failed",
                    "error": error,
                    "end_time": datetime.utcnow().isoformat()
                }
            )
        )

# Global event service instance
event_service = EventService()
