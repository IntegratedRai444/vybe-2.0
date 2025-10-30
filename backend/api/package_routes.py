"""
Package Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from pathlib import Path
import logging

from ...packages.package_manager import package_manager
from ...models.package_models import Package, PackageSearchResult, PackageInstallRequest, PackageUninstallRequest

router = APIRouter(prefix="/api/packages", tags=["packages"])
logger = logging.getLogger(__name__)

@router.get("/search", response_model=List[PackageSearchResult])
async def search_packages(
    query: str,
    language: str = "python",
    limit: int = 20,
    project_root: str = ""
):
    """
    Search for packages in the registry
    """
    try:
        if not query:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query cannot be empty"
            )
            
        results = await package_manager.search_packages(
            project_root=project_root,
            language=language,
            query=query,
            limit=limit
        )
        return results
        
    except Exception as e:
        logger.error(f"Error searching packages: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search packages: {str(e)}"
        )

@router.post("/install", status_code=status.HTTP_200_OK)
async def install_package(install_request: PackageInstallRequest):
    """
    Install a package
    """
    try:
        success = await package_manager.install_package(
            project_root=install_request.project_root,
            language=install_request.language,
            package_name=install_request.package_name,
            version=install_request.version,
            dev=install_request.dev
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to install package {install_request.package_name}"
            )
            
        return {"status": "success", "message": f"Package {install_request.package_name} installed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error installing package: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to install package: {str(e)}"
        )

@router.post("/uninstall", status_code=status.HTTP_200_OK)
async def uninstall_package(uninstall_request: PackageUninstallRequest):
    """
    Uninstall a package
    """
    try:
        success = await package_manager.uninstall_package(
            project_root=uninstall_request.project_root,
            language=uninstall_request.language,
            package_name=uninstall_request.package_name
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to uninstall package {uninstall_request.package_name}"
            )
            
        return {"status": "success", "message": f"Package {uninstall_request.package_name} uninstalled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uninstalling package: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to uninstall package: {str(e)}"
        )

@router.post("/update", status_code=status.HTTP_200_OK)
async def update_package(
    project_root: str,
    language: str,
    package_name: str,
    version: Optional[str] = None
):
    """
    Update a package to the latest or specified version
    """
    try:
        success = await package_manager.update_package(
            project_root=project_root,
            language=language,
            package_name=package_name,
            version=version
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update package {package_name}"
            )
            
        return {"status": "success", "message": f"Package {package_name} updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating package: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update package: {str(e)}"
        )

@router.get("/installed", response_model=List[Package])
async def list_installed_packages(
    project_root: str,
    language: str,
    outdated: bool = False
):
    """
    List installed packages
    """
    try:
        if outdated:
            packages = await package_manager.list_outdated(
                project_root=project_root,
                language=language
            )
        else:
            packages = await package_manager.list_installed(
                project_root=project_root,
                language=language
            )
            
        return packages
        
    except Exception as e:
        logger.error(f"Error listing installed packages: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list installed packages: {str(e)}"
        )

@router.get("/info/{package_name}", response_model=Package)
async def get_package_info(
    package_name: str,
    project_root: str,
    language: str
):
    """
    Get detailed information about a package
    """
    try:
        package = await package_manager.get_package_info(
            project_root=project_root,
            language=language,
            package_name=package_name
        )
        
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Package {package_name} not found"
            )
            
        return package
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting package info: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get package info: {str(e)}"
        )

@router.post("/create-venv", status_code=status.HTTP_200_OK)
async def create_virtual_environment(
    project_root: str,
    language: str = "python"
):
    """
    Create a virtual environment for the project
    """
    try:
        success = await package_manager.create_virtual_environment(
            project_root=project_root,
            language=language
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create virtual environment"
            )
            
        return {"status": "success", "message": "Virtual environment created successfully"}
        
    except Exception as e:
        logger.error(f"Error creating virtual environment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create virtual environment: {str(e)}"
        )

@router.get("/audit", status_code=status.HTTP_200_OK)
async def audit_packages(
    project_root: str,
    language: str
):
    """
    Run a security audit on installed packages
    """
    try:
        if language == "python":
            # For Python, we can use pip-audit or safety
            try:
                import safety
                from safety import safety as safety_check
                from safety.formatter import report
                
                # Get installed packages
                packages = await package_manager.list_installed(
                    project_root=project_root,
                    language=language
                )
                
                # Convert to safety format
                requirements = []
                for pkg in packages:
                    requirements.append(f"{pkg.name}=={pkg.version}")
                
                # Run safety check
                vulns = safety_check.check(packages=requirements, key=None, db_mirror=None, cached=False, ignore_ids=None)
                
                # Format results
                result = report.get_report(
                    vulns,
                    checked_packages=len(packages),
                    db={"$meta": {"timestamp": "2023-01-01"}},  # Dummy timestamp
                    key=None,
                    brief_output=False,
                    output_report=False,
                    json_report=True,
                    bare_report=False,
                    checked_packages_paths=[],
                    found_packages=[]
                )
                
                return {
                    "status": "success",
                    "vulnerabilities": result.get("vulnerabilities", []),
                    "scanned_packages": len(packages)
                }
                
            except ImportError:
                logger.warning("safety package not installed. Install with: pip install safety")
                return {
                    "status": "warning",
                    "message": "safety package not installed. Install with: pip install safety",
                    "vulnerabilities": [],
                    "scanned_packages": 0
                }
                
        elif language in ["javascript", "typescript"]:
            # For Node.js, we can use npm audit or yarn audit
            try:
                import subprocess
                import json
                
                # Run npm/yarn audit
                if (Path(project_root) / "yarn.lock").exists():
                    result = subprocess.run(
                        ["yarn", "audit", "--json"],
                        cwd=project_root,
                        capture_output=True,
                        text=True
                    )
                else:
                    result = subprocess.run(
                        ["npm", "audit", "--json"],
                        cwd=project_root,
                        capture_output=True,
                        text=True
                    )
                
                if result.returncode not in [0, 1]:  # 1 means vulnerabilities found
                    raise Exception(f"Audit failed: {result.stderr}")
                
                # Parse audit results
                audit_results = []
                for line in result.stdout.split('\n'):
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        if data.get("type") == "auditAdvisory":
                            audit_results.append(data["data"])
                    except json.JSONDecodeError:
                        continue
                
                return {
                    "status": "success",
                    "vulnerabilities": audit_results,
                    "scanned_packages": len(audit_results)
                }
                
            except Exception as e:
                logger.error(f"Error running npm/yarn audit: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Failed to run audit: {str(e)}",
                    "vulnerabilities": [],
                    "scanned_packages": 0
                }
        
        else:
            return {
                "status": "warning",
                "message": f"Security audit not supported for language: {language}",
                "vulnerabilities": [],
                "scanned_packages": 0
            }
            
    except Exception as e:
        logger.error(f"Error auditing packages: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to audit packages: {str(e)}"
        )
