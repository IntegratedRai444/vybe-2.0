# Remove empty frontend directory if it exists
if (Test-Path "frontend/src/components/frontend") {
    Remove-Item -Recurse -Force "frontend/src/components/frontend"
}

# Create search directory if it doesn't exist
$searchDir = "frontend/src/components/search"
if (-not (Test-Path $searchDir)) {
    New-Item -ItemType Directory -Path $searchDir -Force
}

# Move search-related files
$searchFiles = @(
    "FileSearchModal.tsx",
    "SearchModal.tsx",
    "ProjectSearch.tsx",
    "SearchReplace.tsx"
)

foreach ($file in $searchFiles) {
    $source = "frontend/src/components/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $searchDir -Force
    }
}

# Create index.ts in search directory
@"
// Re-export all search-related components
export { default as FileSearchModal } from './FileSearchModal';
export { default as SearchModal } from './SearchModal';
export { default as ProjectSearch } from './ProjectSearch';
export { default as SearchReplace } from './SearchReplace';
"@ | Out-File -FilePath "$searchDir/index.ts" -Encoding utf8

Write-Host "Components have been reorganized successfully!" -ForegroundColor Green
