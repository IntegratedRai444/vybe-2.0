# This script will rename files to use consistent kebab-case

# Change to the components directory
$componentsDir = "$PSScriptRoot\frontend\src\components\ui"

# Get all files with inconsistent casing
$files = Get-ChildItem -Path $componentsDir -Recurse -File | Where-Object {
    $_.Name -cmatch '[A-Z]' -and
    $_.Name -notmatch '^[A-Z]'
}

foreach ($file in $files) {
    $newName = $file.Name -creplace '([a-z])([A-Z])', '$1-$2'.ToLower()
    $newPath = Join-Path $file.DirectoryName $newName

    Write-Host "Renaming $($file.FullName) to $newPath"
    Rename-Item -Path $file.FullName -NewName $newName -Force
}

Write-Host "File renaming complete!"
