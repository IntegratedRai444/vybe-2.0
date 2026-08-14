# File Analysis Script for Vybe 2.0 Project
# This script will analyze and count files in your project

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

# Get all files and group by extension
Write-Host "Scanning files in $projectRoot ..." -ForegroundColor Cyan
Write-Host "This may take a while for large projects...`n" -ForegroundColor Yellow

$files = Get-ChildItem -Path $projectRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $file = $_
        $excludeDirs | ForEach-Object { 
            if ($file.FullName -like "$projectRoot\$_") { return $false }
        }
        return $true
    }

# Get total count and size
$totalCount = $files.Count
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum

# Group by extension
$extGroups = $files | Group-Object -Property Extension | 
    Sort-Object -Property Count -Descending |
    Select-Object @{Name="Extension";Expression={if($_.Name -eq '') {'.noext'} else {$_.Name}}},
                  @{Name="Count";Expression={$_.Count}},
                  @{Name="Size (MB)";Expression={[math]::Round(($_.Group | Measure-Object -Property Length -Sum).Sum / 1MB, 2)}}

# Get largest files
$largestFiles = $files | 
    Sort-Object -Property Length -Descending | 
    Select-Object -First 10 | 
    Select-Object @{Name="Size (MB)";Expression={[math]::Round($_.Length / 1MB, 2)}}, Name, FullName

# Get largest directories
$dirs = Get-ChildItem -Path $projectRoot -Directory -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $dir = $_
        $excludeDirs | ForEach-Object { 
            if ($dir.FullName -like "$projectRoot\$_") { return $false }
        }
        return $true
    } |
    Select-Object @{Name="Path";Expression={$_.FullName}},
                  @{Name="FileCount";Expression={
                      (Get-ChildItem -Path $_.FullName -File -Recurse -Force -ErrorAction SilentlyContinue | 
                       Where-Object { $_.FullName -notlike "*\node_modules\*" }).Count
                  }},
                  @{Name="Size (MB)";Expression={
                      [math]::Round((Get-ChildItem -Path $_.FullName -File -Recurse -Force -ErrorAction SilentlyContinue | 
                                    Where-Object { $_.FullName -notlike "*\node_modules\*" } | 
                                    Measure-Object -Property Length -Sum).Sum / 1MB, 2)
                  }}

$largestDirs = $dirs | Sort-Object -Property "Size (MB)" -Descending | Select-Object -First 10

# Display results
Write-Host "`n=== FILE ANALYSIS REPORT ===`n" -ForegroundColor Green

# Total files and size
Write-Host "Total Files: $totalCount" -ForegroundColor Cyan
Write-Host "Total Size: $([math]::Round($totalSize / 1GB, 2)) GB`n" -ForegroundColor Cyan

# Files by extension
Write-Host "`n=== FILES BY EXTENSION ===" -ForegroundColor Yellow
$extGroups | Format-Table -AutoSize

# Largest files
Write-Host "`n=== LARGEST FILES ===" -ForegroundColor Yellow
$largestFiles | Format-Table -AutoSize

# Largest directories
Write-Host "`n=== LARGEST DIRECTORIES ===" -ForegroundColor Yellow
$largestDirs | Format-Table -AutoSize

Write-Host "`nAnalysis complete!" -ForegroundColor Green
