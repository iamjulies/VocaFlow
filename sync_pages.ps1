$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot
$token = (Get-Content -Path "$root\GITHUB_RELEASE\.git_token" -Raw).Trim()
$vocaFlowRemote = "https://iamjulies:${token}@github.com/iamjulies/VocaFlow.git"
$ioRemote = "https://iamjulies:${token}@github.com/iamjulies/iamjulies.github.io.git"

# 1. gh-pages
Write-Host "Syncing gh-pages..." -ForegroundColor Cyan
$ghPagesDir = Join-Path $env:TEMP "vocaflow_gh_pages_deploy"
if (Test-Path $ghPagesDir) { Remove-Item -Recurse -Force $ghPagesDir }
New-Item -ItemType Directory -Path $ghPagesDir | Out-Null

Copy-Item "$root\index.html" "$ghPagesDir\index.html" -Force
Copy-Item "$root\vocaflow.html" "$ghPagesDir\vocaflow.html" -Force
Copy-Item "$root\sw.js" "$ghPagesDir\sw.js" -Force
Copy-Item "$root\manifest.json" "$ghPagesDir\manifest.json" -Force
Copy-Item "$root\xlsx.full.min.js" "$ghPagesDir\xlsx.full.min.js" -Force
Copy-Item "$root\ads.txt" "$ghPagesDir\ads.txt" -Force
if (Test-Path "$root\404.html") { Copy-Item "$root\404.html" "$ghPagesDir\404.html" -Force }
if (Test-Path "$root\icons") { Copy-Item "$root\icons" "$ghPagesDir\icons" -Recurse -Force }
if (Test-Path "$root\audio") { Copy-Item "$root\audio" "$ghPagesDir\audio" -Recurse -Force }
New-Item -ItemType File -Path "$ghPagesDir\.nojekyll" -Force | Out-Null

& $git -C $ghPagesDir init | Out-Null
& $git -C $ghPagesDir config user.email "dev@vocaflow.app"
& $git -C $ghPagesDir config user.name "iamjulies"
& $git -C $ghPagesDir remote add origin $vocaFlowRemote
& $git -C $ghPagesDir add .
& $git -C $ghPagesDir commit -m "deploy: GitHub Pages release v0.10.10-48 (Build 349)" | Out-Null
& $git -C $ghPagesDir branch -M gh-pages
& $git -C $ghPagesDir push -u origin gh-pages --force

# 2. iamjulies.github.io
Write-Host "Syncing iamjulies.github.io..." -ForegroundColor Cyan
$ioDir = Join-Path $env:TEMP "vocaflow_user_io_deploy"
if (Test-Path $ioDir) { Remove-Item -Recurse -Force $ioDir }
New-Item -ItemType Directory -Path $ioDir | Out-Null

Copy-Item "$root\index.html" "$ioDir\index.html" -Force
Copy-Item "$root\vocaflow.html" "$ioDir\vocaflow.html" -Force
Copy-Item "$root\sw.js" "$ioDir\sw.js" -Force
Copy-Item "$root\manifest.json" "$ioDir\manifest.json" -Force
Copy-Item "$root\xlsx.full.min.js" "$ioDir\xlsx.full.min.js" -Force
Copy-Item "$root\ads.txt" "$ioDir\ads.txt" -Force
if (Test-Path "$root\404.html") { Copy-Item "$root\404.html" "$ioDir\404.html" -Force }
if (Test-Path "$root\icons") { Copy-Item "$root\icons" "$ioDir\icons" -Recurse -Force }
if (Test-Path "$root\audio") { Copy-Item "$root\audio" "$ioDir\audio" -Recurse -Force }
New-Item -ItemType File -Path "$ioDir\.nojekyll" -Force | Out-Null

& $git -C $ioDir init | Out-Null
& $git -C $ioDir config user.email "dev@vocaflow.app"
& $git -C $ioDir config user.name "iamjulies"
& $git -C $ioDir remote add origin $ioRemote
& $git -C $ioDir add .
& $git -C $ioDir commit -m "feat: VocaFlow live sync v0.10.10-48 (Build 349)" | Out-Null
& $git -C $ioDir branch -M main
& $git -C $ioDir push -u origin main --force
& $git -C $ioDir branch -M gh-pages
& $git -C $ioDir push -u origin gh-pages --force

Write-Host "All 3 repositories / branches deployed successfully!" -ForegroundColor Green
