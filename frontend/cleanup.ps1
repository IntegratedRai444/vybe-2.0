# Cleanup script for unused files

# List of files and directories to remove
$filesToRemove = @(
    "src\components\ai",
    "src\hooks\useGitWebSocket.ts",
    "src\hooks\usePackageManager.ts",
    "src\hooks\useDeployment.ts",
    "src\services\aiService.ts",
    "src\services\debuggerService.ts",
    "src\services\gitWebSocketService.ts",
    "src\store\aiSettingsStore.ts",
    "src\components\FileTabs.tsx",
    "src\components\FileContextMenu.tsx",
    "src\utils\performance.ts",
    "src\utils\stringUtils.ts"
)

# Create backup directory if it doesn't exist
$backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup and remove files
foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        $backupPath = Join-Path $backupDir (Split-Path $file -Leaf)
        Write-Host "Backing up $file to $backupPath"
        Copy-Item -Path $file -Destination $backupPath -Recurse -Force
        
        Write-Host "Removing $file"
        Remove-Item -Path $file -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "Cleanup completed. Backups saved to $backupDir" -ForegroundColor Green
