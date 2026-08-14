# Create necessary directories
$directories = @(
    "deployment/docker",
    "deployment/k8s",
    "docs/analysis",
    "tests/e2e",
    "tools/scripts",
    "config/requirements"
)

foreach ($dir in $directories) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir
    }
}

# Move Docker files
Move-Item -Path "Dockerfile" -Destination "deployment/docker/" -Force
Move-Item -Path "Dockerfile.ci" -Destination "deployment/docker/" -Force
Move-Item -Path "docker-compose*.yml" -Destination "deployment/docker/" -Force

# Move Kubernetes files
if (Test-Path "k8s") {
    Move-Item -Path "k8s/*" -Destination "deployment/k8s/" -Force
    Remove-Item -Path "k8s" -Recurse -Force
}

# Move documentation
$docs = @(
    "COMPLETION_SUMMARY.md",
    "CONTRIBUTING.md",
    "DEPLOYMENT.md",
    "DIRECT_FOLDER_OPENING_GUIDE.md",
    "FOLDER_FIX_README.md",
    "FOLDER_PICKER_FIX.md",
    "GMAIL_OAUTH_SETUP.md",
    "IDE_READY_GUIDE.md",
    "INFRASTRUCTURE.md",
    "INSTALLATION.md",
    "LSP_IMPLEMENTATION_COMPLETE.md",
    "PHASE_11_COMPLETION.md",
    "PROJECT_STATUS.md",
    "QUICK_FIX_GUIDE.md",
    "QUICK_START_PHASE11.md",
    "REAL_DEBUGGING_COMPLETE.md",
    "USER_GUIDE.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Move-Item -Path $doc -Destination "docs/" -Force
    }
}

# Move analysis files
$analysisFiles = @(
    "frontend_analysis.md",
    "frontend_file_usage_analysis.md",
    "unused_files_analysis.md",
    "unused_files_report.md"
)

foreach ($file in $analysisFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs/analysis/" -Force
    }
}

# Move test files
if (Test-Path "e2e_test.py") {
    Move-Item -Path "e2e_test.py" -Destination "tests/e2e/" -Force
}

if (Test-Path "test_websocket.py") {
    Move-Item -Path "test_websocket.py" -Destination "tests/e2e/" -Force
}

# Move tool scripts
$tools = @(
    "analyze_frontend.py",
    "analyze_imports.py",
    "find_unused_files.py",
    "find_unwanted_files.py",
    "indexer.py",
    "organize.ps1",
    "start_ide.py",
    "start_services.ps1",
    "start_vybe.bat",
    "vector_store.py",
    "what_you_dont_have_audit.py",
    "ui.py"
)

foreach ($tool in $tools) {
    if (Test-Path $tool) {
        Move-Item -Path $tool -Destination "tools/scripts/" -Force
    }
}

# Move configuration files
$configFiles = @(
    ".pre-commit-config.yaml",
    "config.py",
    "current_ide_features_audit.py",
    "diagnose_ide_issue.py"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "config/" -Force
    }
}

# Move environment files
if (Test-Path ".env") {
    Move-Item -Path ".env" -Destination "config/" -Force
}

if (Test-Path ".env.example") {
    Move-Item -Path ".env.example" -Destination "config/" -Force
}

# Move requirements files
$reqFiles = @(
    "requirements-dev.in",
    "requirements-dev.txt",
    "requirements.in",
    "requirements.txt"
)

foreach ($file in $reqFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "config/requirements/" -Force
    }
}

# Move data files
$dataFiles = @(
    "file_analysis.json",
    "unused-files-report.json"
)

foreach ($file in $dataFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "data/" -Force
    }
}

# Clean up empty directories
Get-ChildItem -Directory -Recurse | Where-Object { (Get-ChildItem -Path $_.FullName -Recurse -File).Count -eq 0 } | Remove-Item -Recurse -Force
