# Cleanup Script for Vybe 2.0 Project
# This script will remove common temporary and generated files

$projectRoot = "c:\Users\OMEN\OneDrive\Documents\vybe 2.0"

# Common patterns to clean up
$cleanupPatterns = @(
    # Node.js
    "**/node_modules",
    "**/package-lock.json",
    "**/yarn.lock",
    "**/pnpm-lock.yaml",
    "**/.pnp*",

    # Build outputs
    "**/dist",
    "**/build",
    "**/.next",
    "**/out",
    "**/.nuxt",
    "**/.svelte-kit",
    "**/.vercel",
    "**/.netlify",
    "**/.cache",
    "**/coverage",

    # Environment files (back them up first!)
    # "**/.env.local",
    # "**/.env.development.local",
    # "**/.env.test.local",
    # "**/.env.production.local",

    # Logs
    "**/*.log",
    "**/npm-debug.log*",
    "**/yarn-debug.log*",
    "**/yarn-error.log*",

    # Editor/IDE
    "**/.idea",
    "**/.vscode",
    "**/.vs",
    "**/*.suo",
    "**/*.ntvs*",
    "**/*.njsproj",
    "**/*.sln",
    "**/*.sw?",

    # System files
    "**/Thumbs.db",
    "**/.DS_Store",
    "**/desktop.ini",

    # Temporary files
    "**/*.tmp",
    "**/*.temp",
    "**/*.bak",

    # Python
    "**/__pycache__",
    "**/*.pyc",
    "**/*.pyo",
    "**/*.pyd",
    "**/.Python",
    "**/venv",
    "**/env",
    "**/.env",
    "**/.venv",
    "**/env.bak",
    "**/venv.bak"
)

# Function to safely remove items
function Remove-ItemSafely {
    param([string]$path)

    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            Write-Host "Removed: $path" -ForegroundColor Red
        } catch {
            Write-Host "Error removing $path : $_" -ForegroundColor Yellow
        }
    }
}

# Create a backup of important files first
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$backupDir = "$projectRoot\backup_$timestamp"

Write-Host "Creating backup in $backupDir..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup important files before cleaning
$importantFiles = @(
    "package.json",
    "requirements.txt",
    ".env",
    "*.config.js",
    "*.config.ts",
    "*.json"
)

foreach ($file in $importantFiles) {
    $files = Get-ChildItem -Path $projectRoot -Filter $file -Recurse -File -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        $relativePath = $f.FullName.Substring($projectRoot.Length).TrimStart('\')
        $backupPath = Join-Path $backupDir (Split-Path $relativePath -Parent)

        if (-not (Test-Path $backupPath)) {
            New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        }

        Copy-Item -Path $f.FullName -Destination (Join-Path $backupPath $f.Name) -Force
    }
}

Write-Host "Backup completed. Starting cleanup..." -ForegroundColor Green

# Clean up files and directories
foreach ($pattern in $cleanupPatterns) {
    $items = Get-ChildItem -Path $projectRoot -Include $pattern -Recurse -Force -ErrorAction SilentlyContinue

    foreach ($item in $items) {
        Remove-ItemSafely -path $item.FullName
    }
}

# Clean up empty directories
Write-Host "`nCleaning up empty directories..." -ForegroundColor Cyan
Get-ChildItem -Path $projectRoot -Directory -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.GetFiles('*', 'AllDirectories').Count -eq 0 } |
    Sort-Object FullName -Descending |
    ForEach-Object {
        Write-Host "Removing empty directory: $($_.FullName)" -ForegroundColor DarkGray
        Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
    }

Write-Host "`nCleanup completed!" -ForegroundColor Green
Write-Host "A backup of important files was created in: $backupDir" -ForegroundColor Cyan
Write-Host "You can review the changes and then delete the backup if everything looks good." -ForegroundColor Cyan
