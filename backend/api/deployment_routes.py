"""
Deployment API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional, Dict, Any
from pathlib import Path
import logging
import json
import uuid

from ...deployment.deployment_service import deployment_service, DeploymentTarget, Deployment, DeploymentStatus, DeploymentProvider
from ...models.deployment_models import (
    DeploymentTargetCreate, 
    DeploymentTargetUpdate,
    DeploymentStartRequest,
    DeploymentLog,
    DeploymentStatusResponse
)

router = APIRouter(prefix="/api/deployments", tags=["deployments"])
logger = logging.getLogger(__name__)

# In-memory store for active deployments
active_deployments: Dict[str, Deployment] = {}

@router.post("/targets", response_model=DeploymentTarget)
async def create_deployment_target(target_data: DeploymentTargetCreate):
    """
    Create a new deployment target
    """
    try:
        # Convert Pydantic model to dict and remove None values
        target_dict = target_data.dict(exclude_unset=True)
        
        # Create the target
        target = deployment_service.add_target(
            name=target_dict["name"],
            provider=target_dict["provider"],
            config=target_dict.get("config", {})
        )
        
        # Update environment variables if provided
        if "environment" in target_dict:
            deployment_service.update_target(
                target.id,
                environment=target_dict["environment"]
            )
            # Refresh target to get updated environment
            target = deployment_service.get_target(target.id)
        
        return target
        
    except Exception as e:
        logger.error(f"Error creating deployment target: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create deployment target: {str(e)}"
        )

@router.get("/targets", response_model=List[DeploymentTarget])
async def list_deployment_targets():
    """
    List all deployment targets
    """
    try:
        return deployment_service.list_targets()
    except Exception as e:
        logger.error(f"Error listing deployment targets: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list deployment targets"
        )

@router.get("/targets/{target_id}", response_model=DeploymentTarget)
async def get_deployment_target(target_id: str):
    """
    Get a deployment target by ID
    """
    target = deployment_service.get_target(target_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deployment target {target_id} not found"
        )
    return target

@router.put("/targets/{target_id}", response_model=DeploymentTarget)
async def update_deployment_target(
    target_id: str, 
    target_update: DeploymentTargetUpdate
):
    """
    Update a deployment target
    """
    try:
        # Get existing target
        target = deployment_service.get_target(target_id)
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deployment target {target_id} not found"
            )
        
        # Convert Pydantic model to dict and remove None values
        update_data = target_update.dict(exclude_unset=True)
        
        # Update the target
        updated_target = deployment_service.update_target(target_id, **update_data)
        if not updated_target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Failed to update deployment target {target_id}"
            )
            
        return updated_target
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating deployment target: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update deployment target: {str(e)}"
        )

@router.delete("/targets/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deployment_target(target_id: str):
    """
    Delete a deployment target
    """
    try:
        if not deployment_service.remove_target(target_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deployment target {target_id} not found"
            )
    except Exception as e:
        logger.error(f"Error deleting deployment target: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete deployment target: {str(e)}"
        )

@router.post("/deploy", response_model=DeploymentStatusResponse)
async def start_deployment(
    deployment_request: DeploymentStartRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new deployment
    """
    try:
        # Get the target
        target = deployment_service.get_target(deployment_request.target_id)
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deployment target {deployment_request.target_id} not found"
            )
        
        # Create a new deployment
        deployment_id = f"deploy-{uuid.uuid4().hex[:8]}"        
        deployment = Deployment(
            id=deployment_id,
            target_id=target.id,
            status=DeploymentStatus.PENDING,
            commit_hash=deployment_request.commit_hash,
            branch=deployment_request.branch
        )
        
        # Store the deployment
        active_deployments[deployment_id] = deployment
        
        # Start deployment in background
        background_tasks.add_task(
            run_deployment,
            deployment_id=deployment_id,
            target=target,
            commit_hash=deployment_request.commit_hash,
            branch=deployment_request.branch
        )
        
        return {
            "deployment_id": deployment_id,
            "status": deployment.status.value,
            "target_id": target.id,
            "target_name": target.name,
            "started_at": deployment.created_at,
            "url": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting deployment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start deployment: {str(e)}"
        )

@router.get("/deployments/{deployment_id}", response_model=DeploymentStatusResponse)
async def get_deployment_status(deployment_id: str):
    """
    Get the status of a deployment
    """
    deployment = active_deployments.get(deployment_id)
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deployment {deployment_id} not found"
        )
    
    target = deployment_service.get_target(deployment.target_id)
    
    return {
        "deployment_id": deployment.id,
        "status": deployment.status.value,
        "target_id": deployment.target_id,
        "target_name": target.name if target else "Unknown",
        "started_at": deployment.created_at,
        "completed_at": deployment.updated_at if deployment.status in [
            DeploymentStatus.SUCCESS, 
            DeploymentStatus.FAILED, 
            DeploymentStatus.CANCELED
        ] else None,
        "url": deployment.url,
        "logs": deployment.logs[-100:],  # Return only the last 100 log entries
        "error": deployment.error
    }

@router.get("/deployments", response_model=List[DeploymentStatusResponse])
async def list_deployments(limit: int = 10):
    """
    List recent deployments
    """
    try:
        # Get all deployments, sorted by creation time (newest first)
        all_deployments = sorted(
            active_deployments.values(),
            key=lambda d: d.created_at,
            reverse=True
        )
        
        # Limit the number of deployments to return
        recent_deployments = all_deployments[:limit]
        
        # Format the response
        result = []
        for deployment in recent_deployments:
            target = deployment_service.get_target(deployment.target_id)
            
            result.append({
                "deployment_id": deployment.id,
                "status": deployment.status.value,
                "target_id": deployment.target_id,
                "target_name": target.name if target else "Unknown",
                "started_at": deployment.created_at,
                "completed_at": deployment.updated_at if deployment.status in [
                    DeploymentStatus.SUCCESS, 
                    DeploymentStatus.FAILED, 
                    DeploymentStatus.CANCELED
                ] else None,
                "url": deployment.url,
                "error": deployment.error
            })
            
        return result
        
    except Exception as e:
        logger.error(f"Error listing deployments: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list deployments"
        )

@router.get("/deployments/{deployment_id}/logs", response_model=List[DeploymentLog])
async def get_deployment_logs(deployment_id: str, limit: int = 100):
    """
    Get logs for a deployment
    """
    deployment = active_deployments.get(deployment_id)
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deployment {deployment_id} not found"
        )
    
    # Return the most recent logs, up to the specified limit
    logs = deployment.logs[-limit:] if deployment.logs else []
    
    return [{"message": log} for log in logs]

@router.post("/deployments/{deployment_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_deployment(deployment_id: str):
    """
    Cancel a running deployment
    """
    deployment = active_deployments.get(deployment_id)
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deployment {deployment_id} not found"
        )
    
    if deployment.status not in [
        DeploymentStatus.PENDING,
        DeploymentStatus.BUILDING,
        DeploymentStatus.DEPLOYING
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel deployment in {deployment.status.value} state"
        )
    
    # Update deployment status
    deployment.status = DeploymentStatus.CANCELED
    deployment.updated_at = datetime.utcnow().isoformat()
    deployment.logs.append(f"[{datetime.utcnow().isoformat()}] Deployment was canceled by user")
    
    # TODO: Implement actual cancellation of the deployment process
    # This would involve killing any running subprocesses, etc.
    
    return {"status": "success", "message": "Deployment cancellation requested"}

# Background task to run the deployment
async def run_deployment(
    deployment_id: str,
    target: DeploymentTarget,
    commit_hash: Optional[str] = None,
    branch: Optional[str] = None
):
    """
    Run the deployment in the background
    """
    deployment = active_deployments.get(deployment_id)
    if not deployment:
        logger.error(f"Deployment {deployment_id} not found")
        return
    
    try:
        # Update deployment status
        deployment.status = DeploymentStatus.BUILDING
        deployment.logs.append(f"[{datetime.utcnow().isoformat()}] Starting deployment to {target.name}...")
        
        # Run the deployment
        deployment_service.deploy(target.id, commit_hash, branch)
        
        # Update deployment status based on result
        deployment = deployment_service.get_deployment_status(deployment_id)
        if deployment.status == DeploymentStatus.SUCCESS:
            deployment.logs.append(f"[{datetime.utcnow().isoformat()}] Deployment completed successfully")
        else:
            deployment.logs.append(f"[{datetime.utcnow().isoformat()}] Deployment failed: {deployment.error}")
        
    except Exception as e:
        logger.error(f"Error in deployment {deployment_id}: {str(e)}", exc_info=True)
        
        # Update deployment status to failed
        if deployment:
            deployment.status = DeploymentStatus.FAILED
            deployment.error = str(e)
            deployment.updated_at = datetime.utcnow().isoformat()
            deployment.logs.append(f"[{datetime.utcnow().isoformat()}] Deployment error: {str(e)}")
    
    # Update the deployment in the active deployments
    active_deployments[deployment_id] = deployment

# Helper function to get the current timestamp
def get_current_timestamp() -> str:
    """Get the current timestamp in ISO format"""
    return datetime.utcnow().isoformat()
