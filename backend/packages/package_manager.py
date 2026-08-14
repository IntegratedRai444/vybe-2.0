# backend/packages/package_manager.py
"""
Package Management Integration
Handles pip, npm, yarn package operations with UI integration
"""

import asyncio
import json
import logging
import os
import re
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class Package:
    name: str
    version: str
    description: str
    latest_version: Optional[str] = None
    is_outdated: bool = False
    is_dev_dependency: bool = False
    homepage: Optional[str] = None
    repository: Optional[str] = None
    license: Optional[str] = None
    dependencies: List[str] = None


class PackageManagerBase(ABC):
    """Base class for package managers"""

    @abstractmethod
    async def search_packages(self, query: str, limit: int = 20) -> List[Package]:
        """Search for packages"""
        pass

    @abstractmethod
    async def install_package(
        self, package_name: str, version: Optional[str] = None, dev: bool = False
    ) -> bool:
        """Install a package"""
        pass

    @abstractmethod
    async def uninstall_package(self, package_name: str) -> bool:
        """Uninstall a package"""
        pass

    @abstractmethod
    async def update_package(self, package_name: str) -> bool:
        """Update a package"""
        pass

    @abstractmethod
    async def list_installed(self) -> List[Package]:
        """List installed packages"""
        pass

    @abstractmethod
    async def list_outdated(self) -> List[Package]:
        """List outdated packages"""
        pass

    @abstractmethod
    async def get_package_info(self, package_name: str) -> Optional[Package]:
        """Get detailed package information"""
        pass


class PipManager(PackageManagerBase):
    """Python pip package manager"""

    def __init__(self, project_root: str):
        self.project_root = project_root
        self.requirements_file = Path(project_root) / "requirements.txt"
        self.venv_path = self._find_venv()
        self.pip_cmd = self._get_pip_command()

    def _find_venv(self) -> Optional[Path]:
        """Find virtual environment"""
        possible_venvs = [
            Path(self.project_root) / "venv",
            Path(self.project_root) / ".venv",
            Path(self.project_root) / "env",
            Path(os.environ.get("VIRTUAL_ENV", ""))
            if os.environ.get("VIRTUAL_ENV")
            else None,
        ]

        for venv_path in possible_venvs:
            if venv_path and venv_path.exists():
                return venv_path

        return None

    def _get_pip_command(self) -> List[str]:
        """Get pip command with virtual environment"""
        if self.venv_path:
            if os.name == "nt":  # Windows
                pip_path = self.venv_path / "Scripts" / "pip.exe"
            else:  # Unix-like
                pip_path = self.venv_path / "bin" / "pip"

            if pip_path.exists():
                return [str(pip_path)]

        return ["pip"]

    async def search_packages(self, query: str, limit: int = 20) -> List[Package]:
        """Search PyPI for packages"""
        try:
            # Use PyPI JSON API
            import aiohttp

            async with aiohttp.ClientSession() as session:
                url = f"https://pypi.org/pypi/{query}/json"
                try:
                    async with session.get(url) as response:
                        if response.status == 200:
                            data = await response.json()
                            info = data.get("info", {})

                            package = Package(
                                name=info.get("name", query),
                                version=info.get("version", ""),
                                description=info.get("summary", ""),
                                homepage=info.get("home_page"),
                                license=info.get("license"),
                                repository=info.get("project_urls", {}).get(
                                    "Repository"
                                ),
                            )
                            return [package]
                except:
                    pass

                # Fallback: search using pip search alternative
                search_url = f"https://pypi.org/simple/{query}/"
                try:
                    async with session.get(search_url) as response:
                        if response.status == 200:
                            # Basic package found
                            package = Package(
                                name=query,
                                version="latest",
                                description=f"Package: {query}",
                            )
                            return [package]
                except:
                    pass

            return []

        except Exception as e:
            logger.error(f"Error searching packages: {e}")
            return []

    async def install_package(
        self, package_name: str, version: Optional[str] = None, dev: bool = False
    ) -> bool:
        """Install a Python package"""
        try:
            package_spec = f"{package_name}=={version}" if version else package_name
            cmd = self.pip_cmd + ["install", package_spec]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                # Update requirements.txt if it exists
                if self.requirements_file.exists():
                    await self._update_requirements_file(package_name, version)

                logger.info(f"Successfully installed {package_spec}")
                return True
            else:
                logger.error(f"Failed to install {package_spec}: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error installing package {package_name}: {e}")
            return False

    async def uninstall_package(self, package_name: str) -> bool:
        """Uninstall a Python package"""
        try:
            cmd = self.pip_cmd + ["uninstall", package_name, "-y"]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                # Remove from requirements.txt if it exists
                if self.requirements_file.exists():
                    await self._remove_from_requirements_file(package_name)

                logger.info(f"Successfully uninstalled {package_name}")
                return True
            else:
                logger.error(f"Failed to uninstall {package_name}: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error uninstalling package {package_name}: {e}")
            return False

    async def update_package(self, package_name: str) -> bool:
        """Update a Python package"""
        try:
            cmd = self.pip_cmd + ["install", "--upgrade", package_name]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f"Successfully updated {package_name}")
                return True
            else:
                logger.error(f"Failed to update {package_name}: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error updating package {package_name}: {e}")
            return False

    async def list_installed(self) -> List[Package]:
        """List installed Python packages"""
        try:
            cmd = self.pip_cmd + ["list", "--format=json"]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                packages_data = json.loads(stdout.decode())
                packages = []

                for pkg_data in packages_data:
                    package = Package(
                        name=pkg_data["name"],
                        version=pkg_data["version"],
                        description=f"Installed Python package",
                    )
                    packages.append(package)

                return packages
            else:
                logger.error(f"Failed to list packages: {stderr.decode()}")
                return []

        except Exception as e:
            logger.error(f"Error listing packages: {e}")
            return []

    async def list_outdated(self) -> List[Package]:
        """List outdated Python packages"""
        try:
            cmd = self.pip_cmd + ["list", "--outdated", "--format=json"]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                packages_data = json.loads(stdout.decode())
                packages = []

                for pkg_data in packages_data:
                    package = Package(
                        name=pkg_data["name"],
                        version=pkg_data["version"],
                        latest_version=pkg_data["latest_version"],
                        description=f"Outdated Python package",
                        is_outdated=True,
                    )
                    packages.append(package)

                return packages
            else:
                return []  # No outdated packages or error

        except Exception as e:
            logger.error(f"Error listing outdated packages: {e}")
            return []

    async def get_package_info(self, package_name: str) -> Optional[Package]:
        """Get detailed package information"""
        try:
            cmd = self.pip_cmd + ["show", package_name]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                output = stdout.decode()
                info = {}

                for line in output.split("\n"):
                    if ":" in line:
                        key, value = line.split(":", 1)
                        info[key.strip()] = value.strip()

                package = Package(
                    name=info.get("Name", package_name),
                    version=info.get("Version", ""),
                    description=info.get("Summary", ""),
                    homepage=info.get("Home-page"),
                    license=info.get("License"),
                    dependencies=info.get("Requires", "").split(", ")
                    if info.get("Requires")
                    else [],
                )

                return package
            else:
                return None

        except Exception as e:
            logger.error(f"Error getting package info for {package_name}: {e}")
            return None

    async def _update_requirements_file(
        self, package_name: str, version: Optional[str]
    ):
        """Update requirements.txt file"""
        try:
            if not self.requirements_file.exists():
                self.requirements_file.touch()

            content = self.requirements_file.read_text()
            lines = content.split("\n")

            # Remove existing entry
            lines = [
                line for line in lines if not line.strip().startswith(package_name)
            ]

            # Add new entry
            package_spec = f"{package_name}=={version}" if version else package_name
            lines.append(package_spec)

            # Write back
            self.requirements_file.write_text("\n".join(lines))

        except Exception as e:
            logger.error(f"Error updating requirements.txt: {e}")

    async def _remove_from_requirements_file(self, package_name: str):
        """Remove package from requirements.txt"""
        try:
            if not self.requirements_file.exists():
                return

            content = self.requirements_file.read_text()
            lines = content.split("\n")

            # Remove entry
            lines = [
                line for line in lines if not line.strip().startswith(package_name)
            ]

            # Write back
            self.requirements_file.write_text("\n".join(lines))

        except Exception as e:
            logger.error(f"Error removing from requirements.txt: {e}")

    async def create_virtual_environment(self) -> bool:
        """Create a virtual environment"""
        try:
            venv_path = Path(self.project_root) / "venv"

            if venv_path.exists():
                return True  # Already exists

            cmd = ["python", "-m", "venv", str(venv_path)]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                self.venv_path = venv_path
                self.pip_cmd = self._get_pip_command()
                logger.info(f"Created virtual environment at {venv_path}")
                return True
            else:
                logger.error(f"Failed to create virtual environment: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error creating virtual environment: {e}")
            return False


class NpmManager(PackageManagerBase):
    """Node.js npm package manager"""

    def __init__(self, project_root: str):
        self.project_root = project_root
        self.package_json = Path(project_root) / "package.json"
        self.npm_cmd = ["npm"]

    async def search_packages(self, query: str, limit: int = 20) -> List[Package]:
        """Search npm registry for packages"""
        try:
            cmd = self.npm_cmd + ["search", query, "--json"]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                packages_data = json.loads(stdout.decode())
                packages = []

                for pkg_data in packages_data[:limit]:
                    package = Package(
                        name=pkg_data.get("name", ""),
                        version=pkg_data.get("version", ""),
                        description=pkg_data.get("description", ""),
                        homepage=pkg_data.get("links", {}).get("homepage"),
                        repository=pkg_data.get("links", {}).get("repository"),
                    )
                    packages.append(package)

                return packages
            else:
                return []

        except Exception as e:
            logger.error(f"Error searching npm packages: {e}")
            return []

    async def install_package(
        self, package_name: str, version: Optional[str] = None, dev: bool = False
    ) -> bool:
        """Install an npm package"""
        try:
            package_spec = f"{package_name}@{version}" if version else package_name
            cmd = self.npm_cmd + ["install", package_spec]

            if dev:
                cmd.append("--save-dev")
            else:
                cmd.append("--save")

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f"Successfully installed {package_spec}")
                return True
            else:
                logger.error(f"Failed to install {package_spec}: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error installing npm package {package_name}: {e}")
            return False

    async def uninstall_package(self, package_name: str) -> bool:
        """Uninstall an npm package"""
        try:
            cmd = self.npm_cmd + ["uninstall", package_name]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f"Successfully uninstalled {package_name}")
                return True
            else:
                logger.error(f"Failed to uninstall {package_name}: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error uninstalling npm package {package_name}: {e}")
            return False

    async def update_package(self, package_name: str) -> bool:
        """Update an npm package"""
        try:
            cmd = self.npm_cmd + ["update", package_name]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f"Successfully updated {package_name}")
                return True
            else:
                logger.error(f"Failed to update {package_name}: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error updating npm package {package_name}: {e}")
            return False

    async def list_installed(self) -> List[Package]:
        """List installed npm packages"""
        try:
            cmd = self.npm_cmd + ["list", "--json", "--depth=0"]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                data = json.loads(stdout.decode())
                dependencies = data.get("dependencies", {})
                packages = []

                for name, info in dependencies.items():
                    package = Package(
                        name=name,
                        version=info.get("version", ""),
                        description="Installed npm package",
                    )
                    packages.append(package)

                return packages
            else:
                return []

        except Exception as e:
            logger.error(f"Error listing npm packages: {e}")
            return []

    async def list_outdated(self) -> List[Package]:
        """List outdated npm packages"""
        try:
            cmd = self.npm_cmd + ["outdated", "--json"]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            # npm outdated returns exit code 1 when there are outdated packages
            if stdout:
                try:
                    data = json.loads(stdout.decode())
                    packages = []

                    for name, info in data.items():
                        package = Package(
                            name=name,
                            version=info.get("current", ""),
                            latest_version=info.get("latest", ""),
                            description="Outdated npm package",
                            is_outdated=True,
                        )
                        packages.append(package)

                    return packages
                except json.JSONDecodeError:
                    return []
            else:
                return []

        except Exception as e:
            logger.error(f"Error listing outdated npm packages: {e}")
            return []

    async def get_package_info(self, package_name: str) -> Optional[Package]:
        """Get detailed npm package information"""
        try:
            cmd = self.npm_cmd + ["info", package_name, "--json"]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                data = json.loads(stdout.decode())

                package = Package(
                    name=data.get("name", package_name),
                    version=data.get("version", ""),
                    description=data.get("description", ""),
                    homepage=data.get("homepage"),
                    repository=data.get("repository", {}).get("url")
                    if isinstance(data.get("repository"), dict)
                    else data.get("repository"),
                    license=data.get("license"),
                    dependencies=list(data.get("dependencies", {}).keys())
                    if data.get("dependencies")
                    else [],
                )

                return package
            else:
                return None

        except Exception as e:
            logger.error(f"Error getting npm package info for {package_name}: {e}")
            return None


class PackageManager:
    """Main package manager that handles multiple ecosystems"""

    def __init__(self):
        self.managers: Dict[str, PackageManagerBase] = {}

    def get_manager(
        self, project_root: str, language: str
    ) -> Optional[PackageManagerBase]:
        """Get appropriate package manager for language/project"""
        key = f"{project_root}:{language}"

        if key not in self.managers:
            if language == "python":
                self.managers[key] = PipManager(project_root)
            elif language in ["javascript", "typescript"]:
                self.managers[key] = NpmManager(project_root)
            else:
                return None

        return self.managers[key]

    async def search_packages(
        self, project_root: str, language: str, query: str, limit: int = 20
    ) -> List[Package]:
        """Search for packages"""
        manager = self.get_manager(project_root, language)
        if manager:
            return await manager.search_packages(query, limit)
        return []

    async def install_package(
        self,
        project_root: str,
        language: str,
        package_name: str,
        version: Optional[str] = None,
        dev: bool = False,
    ) -> bool:
        """Install a package"""
        manager = self.get_manager(project_root, language)
        if manager:
            return await manager.install_package(package_name, version, dev)
        return False

    async def uninstall_package(
        self, project_root: str, language: str, package_name: str
    ) -> bool:
        """Uninstall a package"""
        manager = self.get_manager(project_root, language)
        if manager:
            return await manager.uninstall_package(package_name)
        return False

    async def update_package(
        self, project_root: str, language: str, package_name: str
    ) -> bool:
        """Update a package"""
        manager = self.get_manager(project_root, language)
        if manager:
            return await manager.update_package(package_name)
        return False

    async def list_installed(self, project_root: str, language: str) -> List[Package]:
        """List installed packages"""
        manager = self.get_manager(project_root, language)
        if manager:
            return await manager.list_installed()
        return []

    async def list_outdated(self, project_root: str, language: str) -> List[Package]:
        """List outdated packages"""
        manager = self.get_manager(project_root, language)
        if manager:
            return await manager.list_outdated()
        return []

    async def get_package_info(
        self, project_root: str, language: str, package_name: str
    ) -> Optional[Package]:
        """Get package information"""
        manager = self.get_manager(project_root, language)
        if manager:
            return await manager.get_package_info(package_name)
        return None

    async def create_virtual_environment(
        self, project_root: str, language: str
    ) -> bool:
        """Create virtual environment (Python only)"""
        if language == "python":
            manager = self.get_manager(project_root, language)
            if isinstance(manager, PipManager):
                return await manager.create_virtual_environment()
        return False


# Global package manager instance
package_manager = PackageManager()
