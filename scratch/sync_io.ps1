# Sync to iamjulies.github.io
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = "C:\Users\DELL\Documents\Modding\browser"
$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$tokenFile = Join-Path $root "GITHUB_RELEASE\.git_token"
$token = (Get-Content -Path $tokenFile -Raw).Trim()
$ioRemote = "https://iamjulies:$token@github.com/iamjulies/iamjulies.github.io.git"

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
& $git -C $ioDir config http.postBuffer 524288000
& $git -C $ioDir remote add origin $ioRemote
& $git -C $ioDir add .
& $git -C $ioDir commit -m "feat: VocaFlow v0.10.10-36 (Build 337) live sync" | Out-Null
& $git -C $ioDir branch -M main
Write-Host "Pushing to iamjulies.github.io (main)..."
& $git -C $ioDir push -u origin main --force
Write-Host "Pushing to iamjulies.github.io (gh-pages)..."
& $git -C $ioDir branch -M gh-pages
& $git -C $ioDir push -u origin gh-pages --force
Write-Host "Sync Complete!" -ForegroundColor Green
