"""
Secrets Detector
Scans code for hardcoded secrets, API keys, passwords, etc.
"""
import re
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class SecretsDetector:
    """Detects hardcoded secrets in code"""
    
    # Regex patterns for common secrets
    PATTERNS = {
        "aws_access_key": {
            "pattern": r"AKIA[0-9A-Z]{16}",
            "description": "AWS Access Key ID",
            "severity": "Critical"
        },
        "aws_secret_key": {
            "pattern": r"aws_secret_access_key\s*=\s*['\"]([^'\"]+)['\"]",
            "description": "AWS Secret Access Key",
            "severity": "Critical"
        },
        "github_token": {
            "pattern": r"ghp_[0-9a-zA-Z]{36}",
            "description": "GitHub Personal Access Token",
            "severity": "Critical"
        },
        "github_oauth": {
            "pattern": r"gho_[0-9a-zA-Z]{36}",
            "description": "GitHub OAuth Token",
            "severity": "Critical"
        },
        "slack_token": {
            "pattern": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
            "description": "Slack Token",
            "severity": "High"
        },
        "slack_webhook": {
            "pattern": r"https://hooks\.slack\.com/services/T[a-zA-Z0-9_]+/B[a-zA-Z0-9_]+/[a-zA-Z0-9_]+",
            "description": "Slack Webhook URL",
            "severity": "High"
        },
        "google_api_key": {
            "pattern": r"AIza[0-9A-Za-z\\-_]{35}",
            "description": "Google API Key",
            "severity": "High"
        },
        "google_oauth": {
            "pattern": r"[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com",
            "description": "Google OAuth Client ID",
            "severity": "Medium"
        },
        "stripe_key": {
            "pattern": r"sk_live_[0-9a-zA-Z]{24}",
            "description": "Stripe Live Secret Key",
            "severity": "Critical"
        },
        "stripe_restricted": {
            "pattern": r"rk_live_[0-9a-zA-Z]{24}",
            "description": "Stripe Live Restricted Key",
            "severity": "High"
        },
        "twilio_api_key": {
            "pattern": r"SK[0-9a-fA-F]{32}",
            "description": "Twilio API Key",
            "severity": "High"
        },
        "mailgun_api_key": {
            "pattern": r"key-[0-9a-zA-Z]{32}",
            "description": "Mailgun API Key",
            "severity": "High"
        },
        "jwt_token": {
            "pattern": r"eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+",
            "description": "JWT Token",
            "severity": "High"
        },
        "private_key": {
            "pattern": r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
            "description": "Private Key",
            "severity": "Critical"
        },
        "generic_api_key": {
            "pattern": r"api[_-]?key\s*[=:]\s*['\"]([^'\"]{20,})['\"]",
            "description": "Generic API Key",
            "severity": "High"
        },
        "generic_secret": {
            "pattern": r"secret\s*[=:]\s*['\"]([^'\"]{20,})['\"]",
            "description": "Generic Secret",
            "severity": "High"
        },
        "password": {
            "pattern": r"password\s*[=:]\s*['\"]([^'\"]{8,})['\"]",
            "description": "Hardcoded Password",
            "severity": "High"
        },
        "database_url": {
            "pattern": r"(postgres|mysql|mongodb)://[^:]+:[^@]+@[^/]+",
            "description": "Database Connection String with Credentials",
            "severity": "Critical"
        },
        "bearer_token": {
            "pattern": r"Bearer\s+[A-Za-z0-9\-._~+/]+=*",
            "description": "Bearer Token",
            "severity": "High"
        },
        "basic_auth": {
            "pattern": r"Basic\s+[A-Za-z0-9+/]+=*",
            "description": "Basic Auth Credentials",
            "severity": "High"
        }
    }
    
    # File extensions to scan
    SCANNABLE_EXTENSIONS = {
        '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rb', '.php',
        '.cs', '.cpp', '.c', '.h', '.hpp', '.sh', '.bash', '.zsh',
        '.yaml', '.yml', '.json', '.xml', '.env', '.config', '.conf',
        '.properties', '.ini', '.toml'
    }
    
    # Patterns to exclude (likely false positives)
    EXCLUDE_PATTERNS = [
        r"example",
        r"sample",
        r"test",
        r"dummy",
        r"placeholder",
        r"your_.*_here",
        r"xxx+",
        r"000+",
        r"123+"
    ]
    
    def __init__(self):
        self.compiled_patterns = {}
        self.compiled_excludes = []
        
        # Compile patterns
        for name, info in self.PATTERNS.items():
            try:
                self.compiled_patterns[name] = {
                    "regex": re.compile(info["pattern"], re.IGNORECASE),
                    "description": info["description"],
                    "severity": info["severity"]
                }
            except re.error as e:
                logger.error(f"Invalid regex pattern for {name}: {e}")
        
        # Compile exclude patterns
        for pattern in self.EXCLUDE_PATTERNS:
            try:
                self.compiled_excludes.append(re.compile(pattern, re.IGNORECASE))
            except re.error as e:
                logger.error(f"Invalid exclude pattern {pattern}: {e}")
    
    def scan_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Scan a single file for secrets
        
        Args:
            file_path: Path to file to scan
            
        Returns:
            List of detected secrets
        """
        file_path = Path(file_path)
        
        # Check if file should be scanned
        if file_path.suffix not in self.SCANNABLE_EXTENSIONS:
            return []
        
        secrets = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
                
                for name, pattern_info in self.compiled_patterns.items():
                    regex = pattern_info["regex"]
                    
                    for match in regex.finditer(content):
                        matched_text = match.group(0)
                        
                        # Check if it's likely a false positive
                        if self._is_false_positive(matched_text):
                            continue
                        
                        # Find line number
                        line_num = content[:match.start()].count('\n') + 1
                        line_content = lines[line_num - 1] if line_num <= len(lines) else ""
                        
                        secrets.append({
                            "type": name,
                            "description": pattern_info["description"],
                            "severity": pattern_info["severity"],
                            "file": str(file_path),
                            "line": line_num,
                            "line_content": line_content.strip(),
                            "matched_text": matched_text[:50] + "..." if len(matched_text) > 50 else matched_text,
                            "position": match.start()
                        })
        
        except Exception as e:
            logger.error(f"Error scanning {file_path}: {e}")
        
        return secrets
    
    def scan_directory(
        self,
        directory: str,
        exclude_dirs: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Scan directory recursively for secrets
        
        Args:
            directory: Directory to scan
            exclude_dirs: Directories to exclude (e.g., node_modules, .git)
            
        Returns:
            Dict with scan results
        """
        if exclude_dirs is None:
            exclude_dirs = [
                'node_modules', '.git', '__pycache__', 'venv', 'env',
                '.venv', 'dist', 'build', '.next', '.nuxt', 'target'
            ]
        
        directory = Path(directory)
        all_secrets = []
        files_scanned = 0
        
        for file_path in directory.rglob('*'):
            # Skip directories
            if file_path.is_dir():
                continue
            
            # Skip excluded directories
            if any(excluded in file_path.parts for excluded in exclude_dirs):
                continue
            
            # Scan file
            secrets = self.scan_file(str(file_path))
            all_secrets.extend(secrets)
            files_scanned += 1
        
        # Categorize by severity
        critical = [s for s in all_secrets if s["severity"] == "Critical"]
        high = [s for s in all_secrets if s["severity"] == "High"]
        medium = [s for s in all_secrets if s["severity"] == "Medium"]
        low = [s for s in all_secrets if s["severity"] == "Low"]
        
        return {
            "secrets": all_secrets,
            "total_count": len(all_secrets),
            "files_scanned": files_scanned,
            "critical": len(critical),
            "high": len(high),
            "medium": len(medium),
            "low": len(low),
            "by_type": self._group_by_type(all_secrets)
        }
    
    def _is_false_positive(self, text: str) -> bool:
        """Check if matched text is likely a false positive"""
        for exclude_pattern in self.compiled_excludes:
            if exclude_pattern.search(text):
                return True
        return False
    
    def _group_by_type(self, secrets: List[Dict[str, Any]]) -> Dict[str, int]:
        """Group secrets by type"""
        by_type = {}
        for secret in secrets:
            secret_type = secret["type"]
            by_type[secret_type] = by_type.get(secret_type, 0) + 1
        return by_type
    
    def get_remediation_advice(self, secret_type: str) -> str:
        """Get remediation advice for a secret type"""
        advice = {
            "aws_access_key": "Rotate AWS credentials immediately. Use AWS IAM roles or AWS Secrets Manager.",
            "github_token": "Revoke the token on GitHub and generate a new one. Use GitHub Secrets for CI/CD.",
            "slack_token": "Revoke the token in Slack workspace settings. Use environment variables.",
            "google_api_key": "Restrict API key usage in Google Cloud Console. Use service accounts.",
            "stripe_key": "Rotate Stripe keys immediately. Use environment variables and Stripe's test mode.",
            "private_key": "Regenerate the key pair. Never commit private keys. Use key management services.",
            "database_url": "Change database password. Use environment variables or secret management.",
            "password": "Change the password immediately. Use environment variables or secret management.",
            "generic_api_key": "Rotate the API key. Store in environment variables or secret management.",
            "jwt_token": "Invalidate the token. Use short-lived tokens and secure storage."
        }
        
        return advice.get(
            secret_type,
            "Remove the secret from code. Use environment variables or a secret management service."
        )


# Global detector instance
_detector = None


def get_secrets_detector() -> SecretsDetector:
    """Get or create global secrets detector instance"""
    global _detector
    if _detector is None:
        _detector = SecretsDetector()
    return _detector