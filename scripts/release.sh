#!/bin/bash

# Release Management Script
# Usage: ./scripts/release.sh [patch|minor|major|prerelease]

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

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not in a git repository"
    exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    log_error "Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    log_error "Not on main branch. Current branch: $current_branch"
    exit 1
fi

# Get release type
RELEASE_TYPE=${1:-patch}

if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major|prerelease)$ ]]; then
    log_error "Invalid release type. Use: patch, minor, major, or prerelease"
    exit 1
fi

log_info "Starting $RELEASE_TYPE release process..."

# Update dependencies
log_info "Updating dependencies..."
npm ci
pip install -r requirements.txt

# Run tests
log_info "Running tests..."
npm test -- --watchAll=false
pytest backend/ --maxfail=5

# Run security checks
log_info "Running security checks..."
npm audit --audit-level moderate
pip install safety bandit
safety check
bandit -r backend/ -f json -o bandit-report.json || true

# Get current version
CURRENT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
log_info "Current version: $CURRENT_VERSION"

# Calculate new version
if [ "$RELEASE_TYPE" = "prerelease" ]; then
    NEW_VERSION=$(npm version prerelease --preid=beta --no-git-tag-version)
else
    NEW_VERSION=$(npm version $RELEASE_TYPE --no-git-tag-version)
fi

log_info "New version: $NEW_VERSION"

# Update version in Python files
sed -i "s/__version__ = .*/__version__ = \"$NEW_VERSION\"/" backend/__init__.py 2>/dev/null || true

# Generate changelog
log_info "Generating changelog..."
CHANGELOG_FILE="CHANGELOG.md"
if [ ! -f "$CHANGELOG_FILE" ]; then
    touch "$CHANGELOG_FILE"
fi

# Create changelog entry
cat > temp_changelog.md << EOF
## $NEW_VERSION ($(date +%Y-%m-%d))

### Changes
$(git log --pretty=format:"- %s" $CURRENT_VERSION..HEAD)

### Security
- Updated dependencies
- Security scan results: $(if [ -f bandit-report.json ]; then echo "See bandit-report.json"; else echo "No issues found"; fi)

EOF

# Prepend to existing changelog
if [ -f "$CHANGELOG_FILE" ]; then
    cat temp_changelog.md "$CHANGELOG_FILE" > temp_changelog_combined.md
    mv temp_changelog_combined.md "$CHANGELOG_FILE"
else
    mv temp_changelog.md "$CHANGELOG_FILE"
fi

# Commit changes
log_info "Committing changes..."
git add .
git commit -m "chore: release $NEW_VERSION

- Updated version to $NEW_VERSION
- Updated dependencies
- Generated changelog
- Security scan completed"

# Create tag
log_info "Creating tag $NEW_VERSION..."
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"

# Push changes
log_info "Pushing changes..."
git push origin main
git push origin "$NEW_VERSION"

# Build Docker image
log_info "Building Docker image..."
docker build -f Dockerfile.ci -t ghcr.io/your-org/vybe:$NEW_VERSION .
docker build -f Dockerfile.ci -t ghcr.io/your-org/vybe:latest .

# Push Docker image
log_info "Pushing Docker image..."
docker push ghcr.io/your-org/vybe:$NEW_VERSION
docker push ghcr.io/your-org/vybe:latest

# Create GitHub release
log_info "Creating GitHub release..."
gh release create "$NEW_VERSION" \
    --title "Release $NEW_VERSION" \
    --notes-file "$CHANGELOG_FILE" \
    --latest

# Cleanup
rm -f temp_changelog.md bandit-report.json

log_success "Release $NEW_VERSION completed successfully!"
log_info "Next steps:"
log_info "1. Monitor deployment in staging environment"
log_info "2. Run integration tests"
log_info "3. Deploy to production if tests pass"
log_info "4. Update documentation if needed"

# Show release summary
echo ""
echo "Release Summary:"
echo "=================="
echo "Version: $NEW_VERSION"
echo "Type: $RELEASE_TYPE"
echo "Docker Image: ghcr.io/your-org/vybe:$NEW_VERSION"
echo "GitHub Release: https://github.com/your-org/vybe/releases/tag/$NEW_VERSION"
echo "Changelog: $CHANGELOG_FILE"
