# 🚀 Quick Start Guide - Phase 11 Features

## Overview
This guide helps you quickly get started with the new Phase 11 features: Layout Customization, Collaborative Editing, and CI/CD Pipeline.

---

## 1️⃣ Layout Customization

### Quick Start
1. **Open Layout Manager**: Click the "⚙️ Layout" button in the top toolbar
2. **Choose a Preset**: Select from 5 built-in presets
3. **Customize**: Toggle panels on/off and adjust sizes
4. **Done**: Changes save automatically!

### Available Presets

#### 🎯 Default
- All panels visible
- Balanced sizing
- Best for general development

#### 💻 Coding
- Maximized editor space
- Minimal distractions
- Chat and terminal hidden
- Perfect for focused coding

#### 🐛 Debugging
- Problems panel emphasized
- Terminal visible
- Great for troubleshooting

#### 📝 Reviewing
- Git panel prominent
- Good for code reviews
- Pull request workflows

#### ⚡ Minimal
- Only editor and sidebar
- Maximum screen space
- Distraction-free mode

### Panel Controls

**Visibility Toggles**:
- ☑️ Show Sidebar (file tree)
- ☑️ Show Chat Panel
- ☑️ Show Problems Panel
- ☑️ Show Git Panel
- ☑️ Show Terminal Panel

**Size Adjustments**:
- Sidebar Width: 200-600px
- Right Panel Width: 300-600px
- Chat Height: 200-600px
- Problems Height: 150-500px
- Git Height: 150-500px

### Tips
- 💡 Your layout preferences persist across sessions
- 💡 Drag the dividers between panels to resize
- 💡 Use presets as starting points, then customize
- 💡 Hide panels you don't need to maximize space

---

## 2️⃣ Collaborative Editing

### Quick Start
1. **Open Collaboration Panel**: Click "👥 Collab" button in toolbar
2. **Create Session**: Click "Create New Session"
3. **Enter Details**:
   - File path (e.g., `/project/src/main.py`)
   - Your name
4. **Share Session ID**: Copy and share with collaborators
5. **Start Collaborating**: Edit files in real-time!

### Joining a Session
1. Click "👥 Collab" button
2. Find the session in the list
3. Click "Join" button
4. Start editing!

### Features

#### Real-time Editing
- See changes as others type
- Instant synchronization
- No refresh needed

#### User Presence
- Color-coded avatars
- Active user count
- Last activity timestamps

#### Session Management
- Create unlimited sessions
- End sessions when done
- Auto-cleanup after 30 minutes of inactivity

### User Colors
Each user gets a unique color:
- 🔵 Blue
- 🟢 Green
- 🟣 Purple
- 🟠 Orange
- 🔴 Red
- 🟡 Yellow
- 🩷 Pink
- 🩵 Cyan

### Tips
- 💡 Use descriptive session names
- 💡 Communicate with team before editing
- 💡 Your name is saved for future sessions
- 💡 Sessions show version numbers for tracking
- 💡 End sessions when done to free resources

### Troubleshooting
- **Can't connect?** Check your WebSocket connection
- **Changes not syncing?** Refresh and rejoin
- **Session not found?** It may have auto-cleaned up
- **Too many users?** Consider creating separate sessions

---

## 3️⃣ CI/CD Pipeline

### Quick Start (GitHub)
1. **Push to GitHub**: Push your code to a GitHub repository
2. **Configure Secrets**: Add Docker Hub credentials
3. **Automatic**: Pipeline runs on every push!

### Required Secrets
Go to: Repository → Settings → Secrets and variables → Actions

Add these secrets:
```
DOCKER_USERNAME = your-dockerhub-username
DOCKER_PASSWORD = your-dockerhub-password
```

### What Runs Automatically

#### On Every Push
- ✅ Backend tests (pytest)
- ✅ Frontend tests (npm build)
- ✅ Code quality checks (Flake8, Mypy, ESLint)
- ✅ Security scanning (Trivy)
- ✅ Docker image build

#### On Pull Requests
- ✅ All tests
- ✅ Code quality checks
- ✅ Security scanning
- ✅ Build verification

#### On Release
- ✅ All tests
- ✅ Docker Hub publish
- ✅ GitHub Release creation
- ✅ Changelog generation
- ✅ Artifact uploads

#### Weekly (Mondays 9 AM UTC)
- ✅ Dependency updates
- ✅ Security audits
- ✅ Automatic PR creation

### Viewing Results
1. Go to your GitHub repository
2. Click "Actions" tab
3. See all workflow runs
4. Click any run for details

### Pipeline Jobs

#### 1. Backend Test
- Runs pytest
- Generates coverage report
- Uploads to Codecov

#### 2. Frontend Test
- Builds React app
- Runs linting
- Archives artifacts

#### 3. Code Quality
- Flake8 (Python linting)
- Mypy (type checking)
- Bandit (security)
- Black (formatting)
- isort (imports)

#### 4. Security Scan
- Trivy vulnerability scanner
- SARIF report to GitHub Security
- Fails on critical vulnerabilities

#### 5. Docker Build
- Multi-platform (amd64, arm64)
- Layer caching
- Pushes to Docker Hub

#### 6. Integration Test
- Docker Compose setup
- Health checks
- E2E tests

#### 7. Deploy Staging
- Runs on `develop` branch
- Automatic deployment

#### 8. Deploy Production
- Runs on releases
- Manual approval required

### Deployment Setup

#### Staging Deployment
Edit `.github/workflows/ci-cd.yml`:
```yaml
- name: Deploy to Staging
  run: |
    # Replace with your deployment commands
    # Examples:
    # ssh user@staging-server 'cd /app && docker-compose pull && docker-compose up -d'
    # kubectl apply -f k8s/staging/
    # terraform apply -var-file=staging.tfvars
```

#### Production Deployment
Edit `.github/workflows/ci-cd.yml`:
```yaml
- name: Deploy to Production
  run: |
    # Replace with your deployment commands
    # Examples:
    # ssh user@prod-server 'cd /app && docker-compose pull && docker-compose up -d'
    # kubectl apply -f k8s/production/
    # terraform apply -var-file=production.tfvars
```

### Creating a Release
1. Create a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Release workflow runs automatically
3. GitHub Release created with:
   - Changelog
   - Build artifacts
   - Docker images

### Tips
- 💡 Check Actions tab for build status
- 💡 Failed builds block merges (if configured)
- 💡 Security issues appear in Security tab
- 💡 Coverage reports on Codecov
- 💡 Docker images tagged with version and `latest`

### Troubleshooting
- **Build failing?** Check the logs in Actions tab
- **Docker push failing?** Verify secrets are set
- **Tests failing?** Run locally first: `pytest` or `npm test`
- **Deployment not working?** Update deployment commands

---

## 🎯 Common Workflows

### Solo Development
1. Use **Coding** layout preset
2. Hide collaboration panel
3. Let CI/CD run on push

### Team Collaboration
1. Use **Default** layout
2. Create collaboration session
3. Share session ID with team
4. Review CI/CD results together

### Code Review
1. Use **Reviewing** layout preset
2. Check Git panel for changes
3. Review CI/CD pipeline results
4. Approve/request changes

### Debugging
1. Use **Debugging** layout preset
2. Check Problems panel
3. Use Terminal for logs
4. Review security scan results

---

## 📚 Additional Resources

### Documentation
- `PROJECT_STATUS.md` - Complete project status
- `PHASE_11_COMPLETION.md` - Detailed implementation report
- `README.md` - General project documentation
- `USER_GUIDE.md` - Comprehensive user guide

### API Documentation
- Layout: localStorage-based (no API)
- Collaboration: `/collaboration/*` endpoints
- CI/CD: GitHub Actions (no API)

### Support
- Check GitHub Issues
- Review workflow logs
- Inspect browser console
- Check backend logs

---

## ⚡ Keyboard Shortcuts (Future)

*Note: These are planned enhancements*

- `Ctrl+Shift+L` - Open Layout Manager
- `Ctrl+Shift+C` - Open Collaboration Panel
- `Ctrl+1-5` - Switch layout presets
- `Ctrl+Shift+H` - Toggle sidebar

---

## 🎊 You're Ready!

You now have access to:
- ✅ Customizable workspace layouts
- ✅ Real-time collaborative editing
- ✅ Automated CI/CD pipeline

**Start building amazing things with Vybe AI OS!** 🚀

---

**Questions?** Check the documentation or create a GitHub issue.

**Built with ❤️ using Python, React, FastAPI, and AI**