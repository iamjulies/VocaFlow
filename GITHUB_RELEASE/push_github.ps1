# PowerShell Script - Auto Push VocaFlow to GitHub (1-Click Multi-Deploy)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "VocaFlow - Đẩy Toàn Diện Lên GitHub (Main + Gh-Pages + User IO)"

$root = (Get-Item $PSScriptRoot).Parent.FullName
$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$tokenFile = Join-Path $PSScriptRoot ".git_token"
$displayUrl = "https://github.com/iamjulies/VocaFlow.git"

Clear-Host
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW - ĐẨY CẬP NHẬT LÊN GITHUB TOÀN DIỆN" -ForegroundColor Yellow
Write-Host "   Repository: $displayUrl" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $git)) {
    Write-Host "[X] Không tìm thấy công cụ Git tại: $git" -ForegroundColor Red
    return
}

# Lấy Token bảo mật từ file cục bộ
$token = ""
if (Test-Path $tokenFile) {
    $token = (Get-Content -Path $tokenFile -Raw).Trim()
}

$vocaFlowRemote = if ($token) { "https://iamjulies:$token@github.com/iamjulies/VocaFlow.git" } else { "https://github.com/iamjulies/VocaFlow.git" }
$ioRemote = if ($token) { "https://iamjulies:$token@github.com/iamjulies/iamjulies.github.io.git" } else { "https://github.com/iamjulies/iamjulies.github.io.git" }

# 0. Biên dịch và cập nhật VocaFlow.exe song song từ VocaFlow_Desktop
Write-Host "[0/4] Đang biên dịch và cập nhật VocaFlow.exe mới nhất..." -ForegroundColor Cyan
$desktopDir = Join-Path $root "VocaFlow_Desktop"
if (Test-Path $desktopDir) {
    # Tắt tiến trình VocaFlow đang chạy nếu có để tránh lock file khi ghi đè
    Get-Process -Name "VocaFlow*" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 500
    
    & dotnet publish "$desktopDir\VocaFlow.csproj" -c Release -r win-x64 --no-self-contained
    $publishedExe = Join-Path $desktopDir "bin\Release\net8.0-windows\win-x64\publish\VocaFlow.exe"
    $publishedPdb = Join-Path $desktopDir "bin\Release\net8.0-windows\win-x64\publish\VocaFlow.pdb"
    if (Test-Path $publishedExe) {
        Copy-Item $publishedExe "$root\Release_App\VocaFlow.exe" -Force
        Copy-Item $publishedExe "$root\GITHUB_RELEASE\VocaFlow_Windows_App\VocaFlow.exe" -Force
        if (Test-Path $publishedPdb) {
            Copy-Item $publishedPdb "$root\Release_App\VocaFlow.pdb" -Force
            Copy-Item $publishedPdb "$root\GITHUB_RELEASE\VocaFlow_Windows_App\VocaFlow.pdb" -Force
        }
        Write-Host "  -> Đã biên dịch & cập nhật VocaFlow.exe vào Release_App thành công!" -ForegroundColor Green
    }
}

# 1. Đồng bộ file sang index.html và Release_App
Copy-Item "$root\vocaflow.html" "$root\index.html" -Force
Copy-Item "$root\vocaflow.html" "$root\Release_App\vocaflow.html" -Force
Copy-Item "$root\sw.js" "$root\Release_App\sw.js" -Force
Copy-Item "$root\vocaflow.html" "$root\GITHUB_RELEASE\vocaflow_web_single_file.html" -Force

# 2. Cập nhật bản ZIP phát hành mới nhất
Write-Host "[1/4] Đang cập nhật gói ZIP phát hành mới nhất..." -ForegroundColor Cyan
$stage = Join-Path $root "VocaFlow_Windows_Portable"
$zipPath = Join-Path $PSScriptRoot "VocaFlow_v0.10.9-alpha-1_Windows_Portable.zip"
$rootZipPath = Join-Path $root "VocaFlow_v0.10.9-alpha-1_Windows_Portable.zip"

try {
    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    New-Item -ItemType Directory -Path $stage | Out-Null
    Copy-Item (Join-Path $root "Release_App\*") -Destination $stage -Recurse -Force
    Compress-Archive -Path "$stage\*" -DestinationPath $zipPath -Force
    Copy-Item $zipPath -Destination $rootZipPath -Force
    # Đồng thời cập nhật gói tương thích v0.10.8 nếu cần
    Copy-Item $zipPath -Destination (Join-Path $PSScriptRoot "VocaFlow_v0.10.8_Windows_Portable.zip") -Force
    Copy-Item $zipPath -Destination (Join-Path $root "VocaFlow_v0.10.8_Windows_Portable.zip") -Force
    Remove-Item -Recurse -Force $stage
    Write-Host "  -> Đã tạo gói: VocaFlow_v0.10.9-alpha-1_Windows_Portable.zip" -ForegroundColor Green
} catch {
    Write-Host "  [!] Thông báo ZIP: $_" -ForegroundColor Yellow
}

# 3. Đẩy lên iamjulies/VocaFlow -> main
Write-Host ""
Write-Host "[2/4] Đang lưu và đẩy lên iamjulies/VocaFlow (main)..." -ForegroundColor Cyan
& $git -C $root remote remove origin 2>$null
& $git -C $root remote add origin $vocaFlowRemote
& $git -C $root branch -M main
& $git -C $root add .
$commitMsg = "feat: Release v0.10.9-alpha-1 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
& $git -C $root commit -m $commitMsg 2>$null
& $git -C $root push -u origin main --force

# 4. Đẩy lên iamjulies/VocaFlow -> gh-pages
Write-Host ""
Write-Host "[3/4] Đang cập nhật live site gh-pages..." -ForegroundColor Cyan
$ghPagesDir = Join-Path $env:TEMP "vocaflow_gh_pages_deploy"
if (Test-Path $ghPagesDir) { Remove-Item -Recurse -Force $ghPagesDir }
New-Item -ItemType Directory -Path $ghPagesDir | Out-Null

Copy-Item "$root\index.html" "$ghPagesDir\index.html" -Force
Copy-Item "$root\vocaflow.html" "$ghPagesDir\vocaflow.html" -Force
Copy-Item "$root\sw.js" "$ghPagesDir\sw.js" -Force
Copy-Item "$root\manifest.json" "$ghPagesDir\manifest.json" -Force
Copy-Item "$root\xlsx.full.min.js" "$ghPagesDir\xlsx.full.min.js" -Force
Copy-Item "$root\ads.txt" "$ghPagesDir\ads.txt" -Force
if (Test-Path "$root\icons") { Copy-Item "$root\icons" "$ghPagesDir\icons" -Recurse -Force }
if (Test-Path "$root\audio") { Copy-Item "$root\audio" "$ghPagesDir\audio" -Recurse -Force }
New-Item -ItemType File -Path "$ghPagesDir\.nojekyll" -Force | Out-Null

& $git -C $ghPagesDir init | Out-Null
& $git -C $ghPagesDir config user.email "dev@vocaflow.app"
& $git -C $ghPagesDir config user.name "iamjulies"
& $git -C $ghPagesDir remote add origin $vocaFlowRemote
& $git -C $ghPagesDir add .
& $git -C $ghPagesDir commit -m "deploy: GitHub Pages release $(Get-Date -Format 'yyyy-MM-dd HH:mm')" | Out-Null
& $git -C $ghPagesDir branch -M gh-pages
& $git -C $ghPagesDir push -u origin gh-pages --force

# 5. Đẩy lên iamjulies/iamjulies.github.io -> main
Write-Host ""
Write-Host "[4/4] Đang cập nhật live site iamjulies.github.io..." -ForegroundColor Cyan
$ioDir = Join-Path $env:TEMP "vocaflow_user_io_deploy"
if (Test-Path $ioDir) { Remove-Item -Recurse -Force $ioDir }
New-Item -ItemType Directory -Path $ioDir | Out-Null

Copy-Item "$root\index.html" "$ioDir\index.html" -Force
Copy-Item "$root\vocaflow.html" "$ioDir\vocaflow.html" -Force
Copy-Item "$root\sw.js" "$ioDir\sw.js" -Force
Copy-Item "$root\manifest.json" "$ioDir\manifest.json" -Force
Copy-Item "$root\xlsx.full.min.js" "$ioDir\xlsx.full.min.js" -Force
Copy-Item "$root\ads.txt" "$ioDir\ads.txt" -Force
if (Test-Path "$root\icons") { Copy-Item "$root\icons" "$ioDir\icons" -Recurse -Force }
if (Test-Path "$root\audio") { Copy-Item "$root\audio" "$ioDir\audio" -Recurse -Force }
New-Item -ItemType File -Path "$ioDir\.nojekyll" -Force | Out-Null

& $git -C $ioDir init | Out-Null
& $git -C $ioDir config user.email "dev@vocaflow.app"
& $git -C $ioDir config user.name "iamjulies"
& $git -C $ioDir remote add origin $ioRemote
& $git -C $ioDir add .
& $git -C $ioDir commit -m "feat: VocaFlow live sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')" | Out-Null
& $git -C $ioDir branch -M main
& $git -C $ioDir push -u origin main --force

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  🎉 HOÀN TẤT! ĐÃ ĐẨY CẬP NHẬT LÊN TOÀN BỘ 3 KHO GITHUB!" -ForegroundColor Green
Write-Host "  👉 Repository: https://github.com/iamjulies/VocaFlow" -ForegroundColor Cyan
Write-Host "  👉 Web Live PWA: https://iamjulies.github.io/VocaFlow/" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green
