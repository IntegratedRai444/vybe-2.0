"""
Pydantic models for package management API
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PackageBase(BaseModel):
    """Base model for package operations"""

    project_root: str = Field(..., description="Root directory of the project")
    language: str = Field(
        ..., description="Programming language (e.g., 'python', 'javascript')"
    )


class PackageSearchResult(BaseModel):
    """Model for package search results"""

    name: str = Field(..., description="Package name")
    version: str = Field(..., description="Latest version available")
    description: Optional[str] = Field(None, description="Package description")
    latest_version: Optional[str] = Field(None, description="Latest version available")
    is_outdated: bool = Field(False, description="Whether an update is available")
    homepage: Optional[str] = Field(None, description="Package homepage URL")
    repository: Optional[str] = Field(None, description="Source code repository URL")
    license: Optional[str] = Field(None, description="Package license")
    downloads: Optional[int] = Field(None, description="Number of downloads")
    stars: Optional[int] = Field(None, description="GitHub stars (if applicable)")
    last_updated: Optional[str] = Field(None, description="Last update timestamp")


class PackageInstallRequest(PackageBase):
    """Model for package installation requests"""

    package_name: str = Field(..., description="Name of the package to install")
    version: Optional[str] = Field(None, description="Specific version to install")
    dev: bool = Field(
        False, description="Whether to install as a development dependency"
    )


class PackageUninstallRequest(PackageBase):
    """Model for package uninstallation requests"""

    package_name: str = Field(..., description="Name of the package to uninstall")


class PackageUpdateRequest(PackageBase):
    """Model for package update requests"""

    package_name: str = Field(..., description="Name of the package to update")
    version: Optional[str] = Field(None, description="Specific version to update to")


class PackageInfo(BaseModel):
    """Detailed package information"""

    name: str = Field(..., description="Package name")
    version: str = Field(..., description="Installed version")
    latest_version: Optional[str] = Field(None, description="Latest version available")
    description: Optional[str] = Field(None, description="Package description")
    homepage: Optional[str] = Field(None, description="Package homepage URL")
    repository: Optional[str] = Field(None, description="Source code repository URL")
    license: Optional[str] = Field(None, description="Package license")
    author: Optional[str] = Field(None, description="Package author")
    author_email: Optional[str] = Field(None, description="Author's email")
    maintainer: Optional[str] = Field(None, description="Package maintainer")
    maintainer_email: Optional[str] = Field(None, description="Maintainer's email")
    requires: List[str] = Field(
        default_factory=list, description="List of required packages"
    )
    required_by: List[str] = Field(
        default_factory=list, description="Packages that depend on this one"
    )
    is_dev_dependency: bool = Field(
        False, description="Whether this is a development dependency"
    )
    installed_at: Optional[str] = Field(None, description="Installation timestamp")


class PackageVulnerability(BaseModel):
    """Model for package vulnerabilities"""

    id: str = Field(..., description="Vulnerability ID")
    package_name: str = Field(..., description="Vulnerable package name")
    installed_version: str = Field(..., description="Installed version")
    fixed_versions: List[str] = Field(
        default_factory=list, description="Versions with fixes"
    )
    vulnerability: str = Field(..., description="Vulnerability description")
    severity: str = Field(
        ..., description="Severity level (low, medium, high, critical)"
    )
    advisory: Optional[str] = Field(None, description="Security advisory URL")
    cve: Optional[str] = Field(None, description="CVE identifier")
    cvss_score: Optional[float] = Field(None, description="CVSS score (0-10)")
    affected_versions: Optional[str] = Field(None, description="Version range affected")
    recommendation: Optional[str] = Field(None, description="Recommended action")


class PackageAuditResult(BaseModel):
    """Model for package audit results"""

    status: str = Field(..., description="Audit status (success, warning, error)")
    vulnerabilities: List[PackageVulnerability] = Field(
        default_factory=list, description="List of vulnerabilities"
    )
    scanned_packages: int = Field(0, description="Number of packages scanned")
    vulnerable_packages: int = Field(0, description="Number of vulnerable packages")
    message: Optional[str] = Field(None, description="Status message or error")


class PackageManagerInfo(BaseModel):
    """Information about the package manager"""

    name: str = Field(..., description="Package manager name")
    version: str = Field(..., description="Package manager version")
    project_root: str = Field(..., description="Project root directory")
    package_file: str = Field(
        ..., description="Path to package file (e.g., requirements.txt, package.json)"
    )
    lock_file: Optional[str] = Field(None, description="Path to lock file if exists")
    virtual_env: Optional[str] = Field(
        None, description="Path to virtual environment if used"
    )
    is_initialized: bool = Field(
        False, description="Whether the package manager is initialized"
    )
    total_packages: int = Field(0, description="Total number of installed packages")
