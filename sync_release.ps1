[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = $PSScriptRoot

Write-Host "=========================================="
Write-Host "   VOCAFLOW RELEASE SYNC & PACKAGING"
Write-Host "=========================================="

# 1. Sync HTML and assets
Write-Host "[1/4] Syncing HTML & Assets..." -ForegroundColor Cyan
Copy-Item "$root\vocaflow.html" "$root\index.html" -Force
Copy-Item "$root\vocaflow.html" "$root\Release_App\vocaflow.html" -Force
Copy-Item "$root\vocaflow.html" "$root\GITHUB_RELEASE\vocaflow_web_single_file.html" -Force
Copy-Item "$root\vocaflow.html" "$root\GITHUB_RELEASE\VocaFlow_Windows_App\vocaflow.html" -Force

Copy-Item "$root\sw.js" "$root\Release_App\sw.js" -Force
Copy-Item "$root\sw.js" "$root\GITHUB_RELEASE\VocaFlow_Windows_App\sw.js" -Force
Copy-Item "$root\manifest.json" "$root\Release_App\manifest.json" -Force
Copy-Item "$root\manifest.json" "$root\GITHUB_RELEASE\VocaFlow_Windows_App\manifest.json" -Force

# 2. Copy compiled binary
Write-Host "[2/4] Copying compiled Desktop application..." -ForegroundColor Cyan
$publishedExe = "$root\VocaFlow_Desktop\bin\Release\net8.0-windows\win-x64\publish\VocaFlow.exe"
$publishedPdb = "$root\VocaFlow_Desktop\bin\Release\net8.0-windows\win-x64\publish\VocaFlow.pdb"
if (Test-Path $publishedExe) {
    Copy-Item $publishedExe "$root\Release_App\VocaFlow.exe" -Force
    Copy-Item $publishedExe "$root\GITHUB_RELEASE\VocaFlow_Windows_App\VocaFlow.exe" -Force
    if (Test-Path $publishedPdb) {
        Copy-Item $publishedPdb "$root\Release_App\VocaFlow.pdb" -Force
        Copy-Item $publishedPdb "$root\GITHUB_RELEASE\VocaFlow_Windows_App\VocaFlow.pdb" -Force
    }
    Write-Host "  -> VocaFlow.exe synced successfully!" -ForegroundColor Green
} else {
    Write-Host "  [!] Warning: Published VocaFlow.exe not found at $publishedExe" -ForegroundColor Yellow
}

# 3. Create Portable ZIP
Write-Host "[3/4] Creating Portable ZIP package..." -ForegroundColor Cyan
$version = "v0.10.10-48"
$zipName = "VocaFlow_${version}_Windows_Portable.zip"
$zipReleasePath = "$root\GITHUB_RELEASE\$zipName"
$zipRootPath = "$root\$zipName"
$releaseAppDir = "$root\Release_App"

# Clean old zip files
Get-ChildItem -Path "$root" -Filter "VocaFlow_*_Windows_Portable.zip" | Remove-Item -Force
Get-ChildItem -Path "$root\GITHUB_RELEASE" -Filter "VocaFlow_*_Windows_Portable.zip" | Remove-Item -Force

if (Test-Path $releaseAppDir) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($releaseAppDir, $zipReleasePath)
    Copy-Item $zipReleasePath $zipRootPath -Force
    Write-Host "  -> Created: $zipName ($([Math]::Round((Get-Item $zipRootPath).Length / 1MB, 2)) MB)" -ForegroundColor Green
}

Write-Host "[4/4] Release Sync Completed Successfully!" -ForegroundColor Green
Write-Host "=========================================="
