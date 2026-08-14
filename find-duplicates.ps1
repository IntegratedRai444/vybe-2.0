# Script to find duplicate, empty, and unused files/folders

$projectRoot = "c:\Users\OMEN\OneDrive\Documents\vybe 2.0"
$excludeDirs = @(
    "**\node_modules",
    "**\.git",
    "**\venv",
    "**\__pycache__",
    "**\.next",
    "**\dist",
    "**\build",
    "**\out",
    "**\.cache"
)

# Function to check if a path should be excluded
function Should-ExcludePath {
    param([string]$path)

    foreach ($pattern in $excludeDirs) {
        if ($path -like "$projectRoot\$pattern") {
            return $true
        }
    }
    return $false
}

# Find empty files and folders
Write-Host "`n=== FINDING EMPTY FILES AND FOLDERS ===`n" -ForegroundColor Yellow

# Find empty files
$emptyFiles = Get-ChildItem -Path $projectRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Length -eq 0 -and -not (Should-ExcludePath $_.FullName)
    } |
    Select-Object @{Name="Type";Expression={"File"}}, FullName, Length

# Find empty directories
$emptyDirs = Get-ChildItem -Path $projectRoot -Directory -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $dir = $_
        -not (Should-ExcludePath $dir.FullName) -and
        -not (Get-ChildItem -Path $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue | Select-Object -First 1)
    } |
    Select-Object @{Name="Type";Expression={"Directory"}}, FullName, @{Name="Length";Expression={"0"}}

# Combine and display empty items
$emptyItems = $emptyFiles + $emptyDirs
if ($emptyItems.Count -gt 0) {
    $emptyItems | Format-Table -AutoSize
    Write-Host "`nFound $($emptyItems.Count) empty items" -ForegroundColor Cyan
} else {
    Write-Host "No empty files or directories found (excluding node_modules, .git, etc.)" -ForegroundColor Green
}

# Find duplicate files by content
Write-Host "`n=== FINDING DUPLICATE FILES ===`n" -ForegroundColor Yellow

# Group files by size first (quick check)
$potentialDupes = Get-ChildItem -Path $projectRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { -not (Should-ExcludePath $_.FullName) } |
    Group-Object -Property Length |
    Where-Object { $_.Count -gt 1 } |
    ForEach-Object { $_.Group }

# Now group by content hash for files with same size
$duplicateGroups = $potentialDupes |
    Group-Object -Property {
        try {
            $hash = Get-FileHash -Path $_.FullName -Algorithm MD5 -ErrorAction Stop
            $hash.Hash
        } catch {
            $_.FullName  # If we can't read the file, use path as unique key
        }
    } |
    Where-Object { $_.Count -gt 1 } |
    Sort-Object -Property { $_.Group[0].Length } -Descending

# Display duplicate files
if ($duplicateGroups.Count -gt 0) {
    $duplicateGroups | ForEach-Object {
        $group = $_
        $sizeMB = [math]::Round($group.Group[0].Length / 1MB, 2)
        Write-Host "`nDuplicate Files (Size: $sizeMB MB):" -ForegroundColor Cyan
        $group.Group | Select-Object FullName, @{Name="Size (MB)";Expression={[math]::Round($_.Length / 1MB, 2)}} | Format-Table -AutoSize
    }
    Write-Host "`nFound $($duplicateGroups.Count) groups of duplicate files" -ForegroundColor Cyan
} else {
    Write-Host "No duplicate files found (based on content hash)" -ForegroundColor Green
}

# Find potentially unused files (e.g., .tmp, .bak, etc.)
Write-Host "`n=== FINDING POTENTIALLY UNUSED FILES ===`n" -ForegroundColor Yellow

$unusedPatterns = @(
    "*.tmp", "*.temp", "*.bak", "*.swp", "*.swo", "*.swn", "*~",
    "*.log", "*.dmp", "Thumbs.db", ".DS_Store", "desktop.ini"
)

$unusedFiles = $unusedPatterns | ForEach-Object {
    Get-ChildItem -Path $projectRoot -Filter $_ -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { -not (Should-ExcludePath $_.FullName) }
} | Select-Object FullName, Length, LastWriteTime | Sort-Object -Property LastWriteTime -Descending

if ($unusedFiles.Count -gt 0) {
    $unusedFiles | Format-Table -AutoSize
    Write-Host "`nFound $($unusedFiles.Count) potentially unused files" -ForegroundColor Cyan
} else {
    Write-Host "No potentially unused files found" -ForegroundColor Green
}

# Find large files
Write-Host "`n=== LARGE FILES (OVER 10 MB) ===`n" -ForegroundColor Yellow
$largeFiles = Get-ChildItem -Path $projectRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 10MB -and -not (Should-ExcludePath $_.FullName) } |
    Select-Object FullName, @{Name="Size (MB)";Expression={[math]::Round($_.Length / 1MB, 2)}} |
    Sort-Object -Property "Size (MB)" -Descending

if ($largeFiles.Count -gt 0) {
    $largeFiles | Format-Table -AutoSize
    Write-Host "`nFound $($largeFiles.Count) files larger than 10 MB" -ForegroundColor Cyan
} else {
    Write-Host "No files larger than 10 MB found" -ForegroundColor Green
}

Write-Host "`nAnalysis complete!" -ForegroundColor Green
