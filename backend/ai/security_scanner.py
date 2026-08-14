"""
Security scanner for detecting vulnerabilities and security issues in code.
"""
import ast
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import aiohttp

logger = logging.getLogger(__name__)


class SecurityScanner:
    """Scans code for security vulnerabilities and sensitive information."""

    def __init__(self):
        self.rules = self._load_security_rules()
        self.secret_patterns = self._load_secret_patterns()
        self.session = aiohttp.ClientSession()

    async def close(self):
        """Close the HTTP session."""
        await self.session.close()

    def _load_security_rules(self) -> List[Dict[str, Any]]:
        """Load security rules from configuration."""
        # TODO: Load from external configuration
        return [
            {
                "id": "hardcoded_secret",
                "pattern": r'(password|secret|api[_-]?key|token|auth|credential)[\s=:]+["\']?([a-zA-Z0-9_\-+=/]+)["\']?',
                "severity": "high",
                "description": "Potential hardcoded secret detected",
            },
            {
                "id": "sql_injection",
                "pattern": r"execute\([\s\S]*?\+.*?\b(select|insert|update|delete|drop|create|alter)\b",
                "severity": "critical",
                "description": "Potential SQL injection vulnerability",
            },
            {
                "id": "xss_vulnerability",
                "pattern": r"document\.(write|writeln|innerHTML|outerHTML)\s*\(",
                "severity": "high",
                "description": "Potential XSS vulnerability",
            },
            {
                "id": "shell_injection",
                "pattern": r"(os\.system|subprocess\.run|subprocess\.Popen)\([\s\S]*?\+",
                "severity": "critical",
                "description": "Potential shell injection vulnerability",
            },
            {
                "id": "insecure_random",
                "pattern": r"random\.(randint|choice|random|sample|shuffle)\s*\(",
                "severity": "medium",
                "description": "Insecure random number generation",
            },
        ]

    def _load_secret_patterns(self) -> List[Dict[str, str]]:
        """Load patterns for detecting secrets and sensitive information."""
        return [
            {"name": "API Key", "pattern": r"[a-zA-Z0-9]{32,}"},
            {"name": "AWS Access Key", "pattern": r"AKIA[0-9A-Z]{16}"},
            {
                "name": "AWS Secret Key",
                "pattern": r"(?i)aws[\w\s,:-]*[\'\"]*[0-9a-zA-Z/+]{40}[\'\"]*",
            },
            {
                "name": "JWT Token",
                "pattern": r"eyJ[a-zA-Z0-9_=]+\.[a-zA-Z0-9_=]+\.?[a-zA-Z0-9_.+/=]*",
            },
            {
                "name": "Email Address",
                "pattern": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
            },
            {"name": "IP Address", "pattern": r"\b(?:\d{1,3}\.){3}\d{1,3}\b"},
            {
                "name": "Credit Card Number",
                "pattern": r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b",
            },
        ]

    async def scan_code(
        self, code: str, language: str, file_path: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Scan code for security vulnerabilities and sensitive information.

        Args:
            code: The source code to scan
            language: Programming language of the code
            file_path: Optional path to the file being scanned

        Returns:
            List of security issues found
        """
        issues = []

        # Scan for security vulnerabilities
        for rule in self.rules:
            matches = re.finditer(rule["pattern"], code, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                line_number = code[: match.start()].count("\n") + 1
                line_content = code.split("\n")[line_number - 1].strip()

                issues.append(
                    {
                        "type": "vulnerability",
                        "rule_id": rule["id"],
                        "severity": rule["severity"],
                        "message": rule["description"],
                        "location": {
                            "file": file_path,
                            "line": line_number,
                            "column": match.start() - code[: match.start()].rfind("\n")
                            if "\n" in code[: match.start()]
                            else match.start() + 1,
                            "snippet": line_content,
                        },
                        "code": match.group(0),
                        "language": language,
                    }
                )

        # Scan for secrets and sensitive information
        for secret in self.secret_patterns:
            matches = re.finditer(secret["pattern"], code)
            for match in matches:
                line_number = code[: match.start()].count("\n") + 1
                line_content = code.split("\n")[line_number - 1].strip()

                # Skip common false positives
                if self._is_false_positive(match.group(0), line_content, language):
                    continue

                issues.append(
                    {
                        "type": "secret",
                        "rule_id": "potential_secret",
                        "severity": "critical",
                        "message": f'Potential {secret["name"]} detected',
                        "location": {
                            "file": file_path,
                            "line": line_number,
                            "column": match.start() - code[: match.start()].rfind("\n")
                            if "\n" in code[: match.start()]
                            else match.start() + 1,
                            "snippet": line_content,
                        },
                        "code": match.group(0),
                        "language": language,
                    }
                )

        # Check for dependency vulnerabilities if requirements file
        if file_path and any(
            file_path.endswith(ext)
            for ext in ["requirements.txt", "package.json", "Gemfile"]
        ):
            try:
                dependency_issues = await self._check_dependency_vulnerabilities(
                    code, file_path
                )
                issues.extend(dependency_issues)
            except Exception as e:
                logger.warning(f"Failed to check dependency vulnerabilities: {str(e)}")

        return issues

    def _is_false_positive(self, match: str, line: str, language: str) -> bool:
        """Check if a potential secret is a false positive."""
        # Skip common false positives
        false_positives = [
            "example",
            "test",
            "dummy",
            "placeholder",
            "change_me",
            "your_",
            "my_",
            "api_key",
            "secret_key",
            "password",
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::1",
        ]

        # Check if match is in false positives
        if any(fp.lower() in match.lower() for fp in false_positives):
            return True

        # Check if line is commented out
        if language in ["python", "ruby"] and line.lstrip().startswith("#"):
            return True

        if language in ["javascript", "typescript"] and "//" in line:
            comment_start = line.find("//")
            if match in line[comment_start:]:
                return True

        return False

    async def _check_dependency_vulnerabilities(
        self, content: str, file_path: str
    ) -> List[Dict[str, Any]]:
        """Check for known vulnerabilities in dependencies."""
        issues = []

        if file_path.endswith("requirements.txt"):
            # Parse Python dependencies
            for line in content.split("\n"):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue

                # Extract package name and version
                parts = re.split(r"[=<>!~]", line, 1)
                if not parts:
                    continue

                package = parts[0].strip()
                version = parts[1].strip() if len(parts) > 1 else "any"

                # TODO: Check against vulnerability database
                # This is a placeholder for actual vulnerability checking
                if package in ["django", "flask"] and version < "2.0.0":
                    issues.append(
                        {
                            "type": "vulnerability",
                            "rule_id": "outdated_dependency",
                            "severity": "high",
                            "message": f"Outdated dependency: {package} {version} has known vulnerabilities",
                            "location": {
                                "file": file_path,
                                "line": content.split("\n").index(line) + 1,
                                "column": 1,
                                "snippet": line,
                            },
                            "code": line,
                            "language": "python",
                            "fix": f"Upgrade {package} to the latest version",
                        }
                    )

        # Similar logic for other package managers (package.json, Gemfile, etc.)

        return issues

    async def scan_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Scan a file for security issues."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            language = self._detect_language(file_path)
            return await self.scan_code(content, language, file_path)

        except Exception as e:
            logger.error(f"Error scanning file {file_path}: {str(e)}")
            return []

    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension."""
        ext = Path(file_path).suffix.lower()

        language_map = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".java": "java",
            ".c": "c",
            ".cpp": "cpp",
            ".cs": "csharp",
            ".go": "go",
            ".rb": "ruby",
            ".php": "php",
            ".rs": "rust",
            ".swift": "swift",
            ".kt": "kotlin",
            ".scala": "scala",
            ".sh": "shell",
            ".html": "html",
            ".css": "css",
            ".sql": "sql",
            ".json": "json",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".toml": "toml",
            ".md": "markdown",
            ".dockerfile": "dockerfile",
            ".tf": "terraform",
            ".hcl": "hcl",
            ".tfvars": "hcl",
            ".tfstate": "json",
        }

        return language_map.get(ext, "text")
