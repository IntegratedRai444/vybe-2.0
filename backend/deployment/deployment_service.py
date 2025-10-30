"""
Deployment Service
Handles deployment to various platforms (Vercel, Netlify, AWS, etc.)
"""

import os
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field
from enum import Enum
import logging
import yaml
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

class DeploymentStatus(str, Enum):
    PENDING = "pending"
    BUILDING = "building"
    DEPLOYING = "deploying"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELED = "canceled"

class DeploymentProvider(str, Enum):
    VERCEL = "vercel"
    NETLIFY = "netlify"
    AWS = "aws"
    CUSTOM = "custom"

@dataclass
class DeploymentTarget:
    id: str
    name: str
    provider: DeploymentProvider
    config: Dict[str, Any]
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_deployed: Optional[str] = None
    environment: Dict[str, str] = field(default_factory=dict)
    is_active: bool = True

@dataclass
class Deployment:
    id: str
    target_id: str
    status: DeploymentStatus
    logs: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    commit_hash: Optional[str] = None
    branch: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None

class DeploymentService:
    """Handles deployment operations for various platforms"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.deployments_dir = self.project_root / ".vybe" / "deployments"
        self.targets_file = self.deployments_dir / "targets.json"
        self._ensure_deployments_dir()
        self.targets: Dict[str, DeploymentTarget] = self._load_targets()
        self.active_deployments: Dict[str, Deployment] = {}
    
    def _ensure_deployments_dir(self):
        """Ensure the deployments directory exists"""
        self.deployments_dir.mkdir(parents=True, exist_ok=True)
        if not self.targets_file.exists():
            self.targets_file.write_text("{}")
    
    def _load_targets(self) -> Dict[str, DeploymentTarget]:
        """Load deployment targets from disk"""
        if not self.targets_file.exists():
            return {}
        
        try:
            data = json.loads(self.targets_file.read_text())
            return {
                target_id: DeploymentTarget(id=target_id, **target_data)
                for target_id, target_data in data.items()
            }
        except Exception as e:
            logger.error(f"Failed to load deployment targets: {e}")
            return {}
    
    def _save_targets(self):
        """Save deployment targets to disk"""
        data = {
            target_id: {
                k: v for k, v in asdict(target).items() 
                if k != 'id'
            }
            for target_id, target in self.targets.items()
        }
        self.targets_file.write_text(json.dumps(data, indent=2))
    
    def add_target(self, name: str, provider: str, config: Dict[str, Any]) -> DeploymentTarget:
        """Add a new deployment target"""
        target_id = f"target_{len(self.targets) + 1}"
        target = DeploymentTarget(
            id=target_id,
            name=name,
            provider=DeploymentProvider(provider),
            config=config
        )
        self.targets[target_id] = target
        self._save_targets()
        return target
    
    def update_target(self, target_id: str, **updates) -> Optional[DeploymentTarget]:
        """Update an existing deployment target"""
        if target_id not in self.targets:
            return None
        
        target = self.targets[target_id]
        for key, value in updates.items():
            if hasattr(target, key):
                setattr(target, key, value)
        
        target.updated_at = datetime.utcnow().isoformat()
        self._save_targets()
        return target
    
    def remove_target(self, target_id: str) -> bool:
        """Remove a deployment target"""
        if target_id in self.targets:
            del self.targets[target_id]
            self._save_targets()
            return True
        return False
    
    def get_target(self, target_id: str) -> Optional[DeploymentTarget]:
        """Get a deployment target by ID"""
        return self.targets.get(target_id)
    
    def list_targets(self) -> List[DeploymentTarget]:
        """List all deployment targets"""
        return list(self.targets.values())
    
    async def deploy(self, target_id: str, commit_hash: Optional[str] = None, 
                    branch: Optional[str] = None) -> Deployment:
        """Deploy the project to the specified target"""
        target = self.get_target(target_id)
        if not target:
            raise ValueError(f"Deployment target {target_id} not found")
        
        deployment_id = f"deploy_{len(self.active_deployments) + 1}"
        deployment = Deployment(
            id=deployment_id,
            target_id=target_id,
            status=DeploymentStatus.PENDING,
            commit_hash=commit_hash,
            branch=branch
        )
        
        self.active_deployments[deployment_id] = deployment
        
        try:
            # Run deployment in background
            asyncio.create_task(self._run_deployment(deployment, target))
            return deployment
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED
            deployment.error = str(e)
            logger.error(f"Deployment failed: {e}", exc_info=True)
            return deployment
    
    async def _run_deployment(self, deployment: Deployment, target: DeploymentTarget):
        """Execute the deployment process"""
        try:
            deployment.status = DeploymentStatus.BUILDING
            self._log_deployment(deployment, "Starting deployment...")
            
            # Create a temporary directory for the build
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Copy project files (excluding node_modules, .git, etc.)
                self._log_deployment(deployment, "Preparing build files...")
                self._copy_project_files(temp_path)
                
                # Run build based on project type
                build_success = await self._run_build(deployment, temp_path)
                if not build_success:
                    deployment.status = DeploymentStatus.FAILED
                    deployment.error = "Build failed"
                    return
                
                # Deploy based on provider
                deployment.status = DeploymentStatus.DEPLOYING
                self._log_deployment(deployment, f"Deploying to {target.provider}...")
                
                deploy_result = await self._deploy_to_provider(
                    deployment, target, temp_path
                )
                
                if deploy_result.get('success'):
                    deployment.status = DeploymentStatus.SUCCESS
                    deployment.url = deploy_result.get('url')
                    target.last_deployed = datetime.utcnow().isoformat()
                    self._save_targets()
                    self._log_deployment(deployment, "Deployment successful!")
                else:
                    deployment.status = DeploymentStatus.FAILED
                    deployment.error = deploy_result.get('error', 'Deployment failed')
                    self._log_deployment(deployment, f"Deployment failed: {deployment.error}")
        
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED
            deployment.error = str(e)
            self._log_deployment(deployment, f"Deployment error: {e}")
            logger.error(f"Deployment error: {e}", exc_info=True)
        
        finally:
            # Clean up
            if deployment.id in self.active_deployments:
                self.active_deployments[deployment.id] = deployment
    
    def _copy_project_files(self, dest_dir: Path):
        """Copy project files to build directory"""
        exclude = {
            '.git', '.github', '.gitignore',
            'node_modules', '__pycache__', '.pytest_cache',
            '.venv', 'venv', 'env', '.env', '.env.local',
            '*.log', '*.tmp', '.DS_Store'
        }
        
        def should_exclude(path: Path) -> bool:
            for pattern in exclude:
                if pattern.startswith('*'):
                    if path.name.endswith(pattern[1:]):
                        return True
                elif path.name == pattern:
                    return True
            return False
        
        for item in self.project_root.glob('*'):
            if should_exclude(item):
                continue
                
            dest = dest_dir / item.name
            if item.is_dir():
                shutil.copytree(item, dest, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dest)
    
    async def _run_build(self, deployment: Deployment, build_dir: Path) -> bool:
        """Run build process for the project"""
        self._log_deployment(deployment, "Running build process...")
        
        # Check for package.json (Node.js) or requirements.txt (Python)
        if (build_dir / 'package.json').exists():
            return await self._run_npm_build(deployment, build_dir)
        elif (build_dir / 'requirements.txt').exists():
            return await self._run_python_build(deployment, build_dir)
        
        # No build needed for static sites
        return True
    
    async def _run_npm_build(self, deployment: Deployment, build_dir: Path) -> bool:
        """Run npm/yarn build process"""
        self._log_deployment(deployment, "Running npm build...")
        
        try:
            # Install dependencies
            if (build_dir / 'yarn.lock').exists():
                self._log_deployment(deployment, "Installing dependencies with yarn...")
                subprocess.run(
                    ['yarn', 'install', '--frozen-lockfile'],
                    cwd=str(build_dir),
                    check=True,
                    capture_output=True,
                    text=True
                )
            else:
                self._log_deployment(deployment, "Installing dependencies with npm...")
                subprocess.run(
                    ['npm', 'ci'],
                    cwd=str(build_dir),
                    check=True,
                    capture_output=True,
                    text=True
                )
            
            # Run build script if it exists
            package_json = json.loads((build_dir / 'package.json').read_text())
            if 'scripts' in package_json and 'build' in package_json['scripts']:
                self._log_deployment(deployment, "Running build script...")
                subprocess.run(
                    ['npm', 'run', 'build'],
                    cwd=str(build_dir),
                    check=True,
                    capture_output=True,
                    text=True
                )
            
            return True
            
        except subprocess.CalledProcessError as e:
            self._log_deployment(deployment, f"Build failed: {e.stderr}")
            return False
        except Exception as e:
            self._log_deployment(deployment, f"Build error: {str(e)}")
            return False
    
    async def _run_python_build(self, deployment: Deployment, build_dir: Path) -> bool:
        """Run Python build process"""
        self._log_deployment(deployment, "Running Python build...")
        
        try:
            # Create virtual environment
            venv_dir = build_dir / '.venv'
            self._log_deployment(deployment, "Creating virtual environment...")
            subprocess.run(
                [sys.executable, '-m', 'venv', str(venv_dir)],
                check=True,
                capture_output=True,
                text=True
            )
            
            # Install dependencies
            pip = str(venv_dir / 'bin' / 'pip')
            self._log_deployment(deployment, "Installing dependencies...")
            subprocess.run(
                [pip, 'install', '-r', 'requirements.txt'],
                cwd=str(build_dir),
                check=True,
                capture_output=True,
                text=True
            )
            
            # Run setup.py if it exists
            if (build_dir / 'setup.py').exists():
                self._log_deployment(deployment, "Running setup.py...")
                subprocess.run(
                    [pip, 'install', '-e', '.'],
                    cwd=str(build_dir),
                    check=True,
                    capture_output=True,
                    text=True
                )
            
            return True
            
        except subprocess.CalledProcessError as e:
            self._log_deployment(deployment, f"Build failed: {e.stderr}")
            return False
        except Exception as e:
            self._log_deployment(deployment, f"Build error: {str(e)}")
            return False
    
    async def _deploy_to_provider(
        self, 
        deployment: Deployment, 
        target: DeploymentTarget,
        build_dir: Path
    ) -> Dict[str, Any]:
        """Deploy the built application to the specified provider"""
        try:
            if target.provider == DeploymentProvider.VERCEL:
                return await self._deploy_to_vercel(deployment, target, build_dir)
            elif target.provider == DeploymentProvider.NETLIFY:
                return await self._deploy_to_netlify(deployment, target, build_dir)
            elif target.provider == DeploymentProvider.AWS:
                return await self._deploy_to_aws(deployment, target, build_dir)
            else:
                return await self._deploy_custom(deployment, target, build_dir)
        except Exception as e:
            logger.error(f"Deployment to {target.provider} failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _deploy_to_vercel(
        self, 
        deployment: Deployment, 
        target: DeploymentTarget,
        build_dir: Path
    ) -> Dict[str, Any]:
        """Deploy to Vercel"""
        self._log_deployment(deployment, "Deploying to Vercel...")
        
        try:
            # Check if Vercel CLI is installed
            try:
                subprocess.run(
                    ['vercel', '--version'],
                    check=True,
                    capture_output=True,
                    text=True
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                self._log_deployment(deployment, "Installing Vercel CLI...")
                subprocess.run(
                    ['npm', 'install', '-g', 'vercel'],
                    check=True,
                    capture_output=True,
                    text=True
                )
            
            # Run Vercel deployment
            cmd = [
                'vercel', '--confirm', '--prod',
                '--token', target.config.get('token', '')
            ]
            
            if 'project_id' in target.config:
                cmd.extend(['--scope', target.config['project_id']])
            
            # Set environment variables
            env = os.environ.copy()
            for key, value in target.environment.items():
                env[f"VERCEL_{key}"] = value
            
            self._log_deployment(deployment, "Running Vercel deployment...")
            result = subprocess.run(
                cmd,
                cwd=str(build_dir),
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"Vercel deployment failed: {result.stderr}")
            
            # Parse deployment URL from output
            url = None
            for line in result.stdout.split('\n'):
                if line.startswith('https://'):
                    url = line.strip()
                    break
            
            return {
                'success': True,
                'url': url
            }
            
        except subprocess.CalledProcessError as e:
            return {
                'success': False,
                'error': f"Vercel deployment failed: {e.stderr}"
            }
    
    async def _deploy_to_netlify(
        self, 
        deployment: Deployment, 
        target: DeploymentTarget,
        build_dir: Path
    ) -> Dict[str, Any]:
        """Deploy to Netlify"""
        self._log_deployment(deployment, "Deploying to Netlify...")
        
        try:
            # Check if Netlify CLI is installed
            try:
                subprocess.run(
                    ['netlify', '--version'],
                    check=True,
                    capture_output=True,
                    text=True
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                self._log_deployment(deployment, "Installing Netlify CLI...")
                subprocess.run(
                    ['npm', 'install', '-g', 'netlify-cli'],
                    check=True,
                    capture_output=True,
                    text=True
                )
            
            # Login if needed
            subprocess.run(
                ['netlify', 'login'],
                check=True,
                input=f"{target.config.get('token', '')}\n",
                text=True,
                capture_output=True
            )
            
            # Deploy
            cmd = [
                'netlify', 'deploy', '--prod',
                '--auth', target.config.get('token', '')
            ]
            
            if 'site_id' in target.config:
                cmd.extend(['--site', target.config['site_id']])
            
            self._log_deployment(deployment, "Running Netlify deployment...")
            result = subprocess.run(
                cmd,
                cwd=str(build_dir),
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"Netlify deployment failed: {result.stderr}")
            
            # Parse deployment URL from output
            url = None
            for line in result.stdout.split('\n'):
                if 'Website URL:' in line:
                    url = line.split('Website URL:')[1].strip()
                    break
            
            return {
                'success': True,
                'url': url
            }
            
        except subprocess.CalledProcessError as e:
            return {
                'success': False,
                'error': f"Netlify deployment failed: {e.stderr}"
            }
    
    async def _deploy_to_aws(
        self, 
        deployment: Deployment, 
        target: DeploymentTarget,
        build_dir: Path
    ) -> Dict[str, Any]:
        """Deploy to AWS (S3 + CloudFront)"""
        self._log_deployment(deployment, "Deploying to AWS...")
        
        try:
            # Check if AWS CLI is installed
            try:
                subprocess.run(
                    ['aws', '--version'],
                    check=True,
                    capture_output=True,
                    text=True
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                self._log_deployment(deployment, "Please install AWS CLI first")
                return {
                    'success': False,
                    'error': 'AWS CLI is not installed'
                }
            
            # Configure AWS credentials
            aws_config = {
                'aws_access_key_id': target.config.get('access_key_id', ''),
                'aws_secret_access_key': target.config.get('secret_access_key', ''),
                'region': target.config.get('region', 'us-east-1')
            }
            
            # Upload to S3
            bucket_name = target.config.get('bucket_name')
            if not bucket_name:
                return {
                    'success': False,
                    'error': 'S3 bucket name is required'
                }
            
            self._log_deployment(deployment, f"Uploading to S3 bucket: {bucket_name}")
            
            # Sync files to S3
            cmd = [
                'aws', 's3', 'sync',
                '--delete',
                '--acl', 'public-read',
                str(build_dir), f"s3://{bucket_name}"
            ]
            
            # Set environment variables for AWS CLI
            env = os.environ.copy()
            env.update({
                'AWS_ACCESS_KEY_ID': aws_config['aws_access_key_id'],
                'AWS_SECRET_ACCESS_KEY': aws_config['aws_secret_access_key'],
                'AWS_DEFAULT_REGION': aws_config['region']
            })
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"S3 upload failed: {result.stderr}")
            
            # Invalidate CloudFront cache if distribution ID is provided
            if 'cloudfront_distribution_id' in target.config:
                self._log_deployment(deployment, "Invalidating CloudFront cache...")
                
                cmd = [
                    'aws', 'cloudfront', 'create-invalidation',
                    '--distribution-id', target.config['cloudfront_distribution_id'],
                    '--paths', '/*'
                ]
                
                result = subprocess.run(
                    cmd,
                    env=env,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    self._log_deployment(
                        deployment,
                        f"Warning: Failed to invalidate CloudFront cache: {result.stderr}"
                    )
            
            return {
                'success': True,
                'url': f"https://{bucket_name}.s3-website-{aws_config['region']}.amazonaws.com"
            }
            
        except subprocess.CalledProcessError as e:
            return {
                'success': False,
                'error': f"AWS deployment failed: {e.stderr}"
            }
    
    async def _deploy_custom(
        self, 
        deployment: Deployment, 
        target: DeploymentTarget,
        build_dir: Path
    ) -> Dict[str, Any]:
        """Deploy using a custom command"""
        self._log_deployment(deployment, "Running custom deployment...")
        
        try:
            if 'command' not in target.config:
                return {
                    'success': False,
                    'error': 'No custom command specified'
                }
            
            # Run custom command
            cmd = target.config['command']
            if isinstance(cmd, str):
                import shlex
                cmd = shlex.split(cmd)
            
            env = os.environ.copy()
            env.update(target.environment)
            
            result = subprocess.run(
                cmd,
                cwd=str(build_dir),
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"Custom deployment failed: {result.stderr}")
            
            return {
                'success': True,
                'output': result.stdout
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Custom deployment failed: {str(e)}"
            }
    
    def _log_deployment(self, deployment: Deployment, message: str):
        """Add a log message to the deployment"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        deployment.logs.append(log_entry)
        deployment.updated_at = datetime.utcnow().isoformat()
        logger.info(f"Deployment {deployment.id}: {message}")
    
    def get_deployment_status(self, deployment_id: str) -> Optional[Deployment]:
        """Get the status of a deployment"""
        return self.active_deployments.get(deployment_id)
    
    def list_deployments(self) -> List[Deployment]:
        """List all active and recent deployments"""
        return list(self.active_deployments.values())
    
    def cancel_deployment(self, deployment_id: str) -> bool:
        """Cancel an in-progress deployment"""
        if deployment_id in self.active_deployments:
            deployment = self.active_deployments[deployment_id]
            if deployment.status in [DeploymentStatus.PENDING, DeploymentStatus.BUILDING, DeploymentStatus.DEPLOYING]:
                deployment.status = DeploymentStatus.CANCELED
                deployment.updated_at = datetime.utcnow().isoformat()
                self._log_deployment(deployment, "Deployment was canceled")
                return True
        return False

# Global deployment service instance
deployment_service = DeploymentService(Path.cwd())
