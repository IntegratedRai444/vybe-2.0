#!/bin/bash

# Deployment Automation Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get environment
ENVIRONMENT=${1:-staging}

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment. Use: staging or production"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT..."

# Check prerequisites
log_info "Checking prerequisites..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
fi

# Check if kubectl is available (for Kubernetes deployment)
if command -v kubectl > /dev/null 2>&1; then
    KUBECTL_AVAILABLE=true
    log_info "Kubectl found - will use Kubernetes deployment"
else
    KUBECTL_AVAILABLE=false
    log_info "Kubectl not found - will use Docker Compose deployment"
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    log_error "Docker Compose is not available"
    exit 1
fi

# Get latest version
LATEST_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "latest")
log_info "Deploying version: $LATEST_VERSION"

# Set environment variables
export VERSION=$LATEST_VERSION
export ENVIRONMENT=$ENVIRONMENT

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Run tests
log_info "Running tests..."
npm test -- --watchAll=false
pytest backend/ --maxfail=5

# Security scan
log_info "Running security scan..."
npm audit --audit-level moderate
pip install safety bandit
safety check
bandit -r backend/ -f json -o bandit-report.json || true

# Build Docker image
log_info "Building Docker image..."
docker build -f Dockerfile.ci -t ghcr.io/your-org/vybe:$LATEST_VERSION .
docker build -f Dockerfile.ci -t ghcr.io/your-org/vybe:latest .

# Deploy based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    log_info "Deploying to staging environment..."
    
    if [ "$KUBECTL_AVAILABLE" = true ]; then
        # Kubernetes deployment
        kubectl apply -f k8s/staging/
        kubectl rollout status deployment/vybe-staging -n staging --timeout=300s
    else
        # Docker Compose deployment
        docker-compose -f docker-compose.staging.yml down
        docker-compose -f docker-compose.staging.yml up -d
    fi
    
    # Health check
    log_info "Performing health check..."
    sleep 30
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Staging deployment successful"
    else
        log_error "Staging deployment failed - health check failed"
        exit 1
    fi
    
elif [ "$ENVIRONMENT" = "production" ]; then
    log_info "Deploying to production environment..."
    
    # Confirm production deployment
    read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Production deployment cancelled"
        exit 0
    fi
    
    if [ "$KUBECTL_AVAILABLE" = true ]; then
        # Kubernetes deployment
        kubectl apply -f k8s/production/
        kubectl rollout status deployment/vybe-production -n production --timeout=600s
    else
        # Docker Compose deployment
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml up -d
    fi
    
    # Health check
    log_info "Performing health check..."
    sleep 60
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Production deployment successful"
    else
        log_error "Production deployment failed - health check failed"
        exit 1
    fi
fi

# Post-deployment tasks
log_info "Running post-deployment tasks..."

# Update monitoring
if [ -f "scripts/update-monitoring.sh" ]; then
    ./scripts/update-monitoring.sh $ENVIRONMENT
fi

# Send notifications
if [ -f "scripts/notify.sh" ]; then
    ./scripts/notify.sh "deployment" "$ENVIRONMENT" "$LATEST_VERSION"
fi

# Cleanup
rm -f bandit-report.json

log_success "Deployment to $ENVIRONMENT completed successfully!"
log_info "Version: $LATEST_VERSION"
log_info "Environment: $ENVIRONMENT"
log_info "Health check: http://localhost:8000/health"

# Show deployment summary
echo ""
echo "Deployment Summary:"
echo "==================="
echo "Environment: $ENVIRONMENT"
echo "Version: $LATEST_VERSION"
echo "Status: Success"
echo "Health Check: http://localhost:8000/health"
echo "Logs: docker-compose logs -f vybe-$ENVIRONMENT"
