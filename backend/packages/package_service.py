"""
Package Service with WebSocket integration
Handles package operations with real-time updates
"""
import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..services.websocket_service import websocket_manager
from .package_events import (
    PackageEventTypes,
    PackageInstallCompletedData,
    PackageInstallOutputData,
    PackageInstallStartedData,
    PackageListData,
    PackageOutdatedData,
    PackageUninstallData,
    PackageUpdateData,
)
from .package_manager import Package, PackageManager

logger = logging.getLogger(__name__)


class PackageService:
    """Service for package operations with WebSocket integration"""

    def __init__(self):
        self.package_manager = PackageManager()

    async def _emit_event(
        self, event_type: str, data: Dict[str, Any], channel: str = "packages"
    ):
        """Emit a WebSocket event"""
        await websocket_manager.broadcast(
            channel=channel, event_type=event_type, data=data
        )

    async def install_package(
        self,
        project_root: str,
        language: str,
        package_name: str,
        version: Optional[str] = None,
        dev: bool = False,
    ) -> bool:
        """Install a package with WebSocket events"""
        try:
            # Emit installation started event
            await self._emit_event(
                PackageEventTypes.PACKAGE_INSTALL_STARTED,
                PackageInstallStartedData(
                    package_name=package_name, version=version or "latest", is_dev=dev
                ).dict(),
            )

            # Get the appropriate package manager
            manager = self.package_manager.get_manager(project_root, language)
            if not manager:
                raise ValueError(f"No package manager found for {language}")

            # Install the package
            success = await manager.install_package(
                package_name=package_name, version=version, dev=dev
            )

            # Emit installation completed event
            await self._emit_event(
                PackageEventTypes.PACKAGE_INSTALL_COMPLETED,
                PackageInstallCompletedData(
                    package_name=package_name,
                    version=version or "latest",
                    is_dev=dev,
                    success=success,
                    message=f"Successfully installed {package_name}"
                    if success
                    else f"Failed to install {package_name}",
                ).dict(),
            )

            # Update package list
            await self.list_installed(project_root, language)

            return success

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in install_package: {error_msg}")
            await self._emit_event(
                PackageEventTypes.PACKAGE_INSTALL_FAILED,
                PackageInstallCompletedData(
                    package_name=package_name,
                    version=version or "latest",
                    is_dev=dev,
                    success=False,
                    message=error_msg,
                ).dict(),
            )
            return False

    async def uninstall_package(
        self, project_root: str, language: str, package_name: str
    ) -> bool:
        """Uninstall a package with WebSocket events"""
        try:
            manager = self.package_manager.get_manager(project_root, language)
            if not manager:
                raise ValueError(f"No package manager found for {language}")

            success = await manager.uninstall_package(package_name)

            await self._emit_event(
                PackageEventTypes.PACKAGE_UNINSTALL_COMPLETED,
                PackageUninstallData(
                    package_name=package_name,
                    success=success,
                    message=f"Successfully uninstalled {package_name}"
                    if success
                    else f"Failed to uninstall {package_name}",
                ).dict(),
            )

            # Update package list
            await self.list_installed(project_root, language)

            return success

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in uninstall_package: {error_msg}")
            return False

    async def update_package(
        self, project_root: str, language: str, package_name: str
    ) -> bool:
        """Update a package with WebSocket events"""
        try:
            manager = self.package_manager.get_manager(project_root, language)
            if not manager:
                raise ValueError(f"No package manager found for {language}")

            # Get current version before updating
            pkg_info = await manager.get_package_info(package_name)
            old_version = pkg_info.version if pkg_info else "unknown"

            success = await manager.update_package(package_name)

            # Get new version after update
            new_version = old_version
            if success:
                updated_info = await manager.get_package_info(package_name)
                if updated_info:
                    new_version = updated_info.version

            await self._emit_event(
                PackageEventTypes.PACKAGE_UPDATE_COMPLETED,
                PackageUpdateData(
                    package_name=package_name,
                    old_version=old_version,
                    new_version=new_version,
                    success=success,
                    message=f"Successfully updated {package_name}"
                    if success
                    else f"Failed to update {package_name}",
                ).dict(),
            )

            # Update package list and outdated packages
            await asyncio.gather(
                self.list_installed(project_root, language),
                self.list_outdated(project_root, language),
            )

            return success

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in update_package: {error_msg}")
            return False

    async def list_installed(
        self, project_root: str, language: str
    ) -> List[Dict[str, Any]]:
        """List installed packages with WebSocket events"""
        try:
            manager = self.package_manager.get_manager(project_root, language)
            if not manager:
                raise ValueError(f"No package manager found for {language}")

            packages = await manager.list_installed()
            package_dicts = [
                {
                    "name": pkg.name,
                    "version": pkg.version,
                    "description": getattr(pkg, "description", ""),
                    "latest_version": getattr(pkg, "latest_version", ""),
                    "is_outdated": getattr(pkg, "is_outdated", False),
                    "is_dev_dependency": getattr(pkg, "is_dev_dependency", False),
                }
                for pkg in packages
            ]

            await self._emit_event(
                PackageEventTypes.PACKAGE_LIST_UPDATED,
                PackageListData(
                    package_name="all", packages=package_dicts, total=len(package_dicts)
                ).dict(),
            )

            return package_dicts

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error listing installed packages: {error_msg}")
            return []

    async def list_outdated(
        self, project_root: str, language: str
    ) -> List[Dict[str, Any]]:
        """List outdated packages with WebSocket events"""
        try:
            manager = self.package_manager.get_manager(project_root, language)
            if not manager:
                raise ValueError(f"No package manager found for {language}")

            outdated_pkgs = await manager.list_outdated()

            for pkg in outdated_pkgs:
                await self._emit_event(
                    PackageEventTypes.PACKAGE_OUTDATED,
                    PackageOutdatedData(
                        package_name=pkg.name,
                        current_version=pkg.version,
                        latest_version=pkg.latest_version or pkg.version,
                        is_dev=getattr(pkg, "is_dev_dependency", False),
                    ).dict(),
                )

            return [
                {
                    "name": pkg.name,
                    "current_version": pkg.version,
                    "latest_version": pkg.latest_version or pkg.version,
                    "is_dev_dependency": getattr(pkg, "is_dev_dependency", False),
                }
                for pkg in outdated_pkgs
            ]

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error listing outdated packages: {error_msg}")
            return []


# Global instance
package_service = PackageService()
