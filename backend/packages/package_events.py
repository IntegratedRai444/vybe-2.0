"""
Package-related WebSocket events
"""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class PackageEventTypes:
    """Package-related WebSocket event types"""
    PACKAGE_INSTALL_STARTED = "package:install_started"
    PACKAGE_INSTALL_OUTPUT = "package:install_output"
    PACKAGE_INSTALL_COMPLETED = "package:install_completed"
    PACKAGE_INSTALL_FAILED = "package:install_failed"
    PACKAGE_UNINSTALL_STARTED = "package:uninstall_started"
    PACKAGE_UNINSTALL_COMPLETED = "package:uninstall_completed"
    PACKAGE_UPDATE_STARTED = "package:update_started"
    PACKAGE_UPDATE_COMPLETED = "package:update_completed"
    PACKAGE_LIST_UPDATED = "package:list_updated"
    PACKAGE_OUTDATED = "package:outdated"

class PackageEventData(BaseModel):
    """Base package event data"""
    package_name: str
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    metadata: Dict[str, Any] = {}

class PackageInstallStartedData(PackageEventData):
    """Data for package installation started event"""
    version: str
    is_dev: bool = False

class PackageInstallOutputData(PackageEventData):
    """Data for package installation output event"""
    output: str

class PackageInstallCompletedData(PackageEventData):
    """Data for package installation completed event"""
    version: str
    is_dev: bool = False
    success: bool
    message: Optional[str] = None

class PackageUninstallData(PackageEventData):
    """Data for package uninstallation events"""
    success: bool
    message: Optional[str] = None

class PackageUpdateData(PackageEventData):
    """Data for package update events"""
    old_version: str
    new_version: str
    success: bool
    message: Optional[str] = None

class PackageListData(PackageEventData):
    """Data for package list events"""
    packages: List[Dict[str, Any]]
    total: int

class PackageOutdatedData(PackageEventData):
    """Data for outdated packages event"""
    current_version: str
    latest_version: str
    is_dev: bool = False
