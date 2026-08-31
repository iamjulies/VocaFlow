# PowerShell Script - Auto Push VocaFlow to GitHub (1-Click)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "VocaFlow - Đẩy Code Lên GitHub (iamjulies/VocaFlow)"

$root = (Get-Item $PSScriptRoot).Parent.FullName
$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$tokenFile = Join-Path $PSScriptRoot ".git_token"
$displayUrl = "https://github.com/iamjulies/VocaFlow.git"

Clear-Host
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW - ĐẨY CẬP NHẬT LÊN GITHUB (1-CLICK)" -ForegroundColor Yellow
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

if ($token) {
    $repoUrl = "https://iamjulies:$token@github.com/iamjulies/VocaFlow.git"
} else {
    $repoUrl = "https://github.com/iamjulies/VocaFlow.git"
}

# 1. Cập nhật bản ZIP phát hành mới nhất
Write-Host "[1/3] Đang cập nhật gói ZIP phát hành mới nhất..." -ForegroundColor Cyan
$stage = Join-Path $root "VocaFlow_Windows_Portable"
$zipPath = Join-Path $PSScriptRoot "VocaFlow_v0.10.8_Windows_Portable.zip"
$rootZipPath = Join-Path $root "VocaFlow_v0.10.8_Windows_Portable.zip"

try {
    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    New-Item -ItemType Directory -Path $stage | Out-Null
    Copy-Item (Join-Path $root "Release_App\*") -Destination $stage -Recurse -Force
    Compress-Archive -Path "$stage\*" -DestinationPath $zipPath -Force
    Copy-Item $zipPath -Destination $rootZipPath -Force
    Remove-Item -Recurse -Force $stage
    Write-Host "  -> Đã tạo gói: VocaFlow_v0.0.1_Windows_Portable.zip" -ForegroundColor Green
} catch {
    Write-Host "  [!] Thông báo ZIP: $_" -ForegroundColor Yellow
}

# 2. Đồng bộ Git và Commit
Write-Host ""
Write-Host "[2/3] Đang lưu các thay đổi mới nhất..." -ForegroundColor Cyan
& $git -C $root remote remove origin 2>$null
& $git -C $root remote add origin $repoUrl
& $git -C $root branch -M main

& $git -C $root add .
$commitMsg = "feat: Update VocaFlow $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
& $git -C $root commit -m $commitMsg 2>$null

# 3. Đẩy lên GitHub
Write-Host ""
Write-Host "[3/3] Đang đẩy lên GitHub..." -ForegroundColor Cyan
& $git -C $root push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  🎉 CHÚC MỪNG! ĐÃ ĐẨY LÊN GITHUB THÀNH CÔNG 100%!" -ForegroundColor Green
    Write-Host "  👉 Xem ngay tại: https://github.com/iamjulies/VocaFlow" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[!] Đẩy code gặp trục trặc, vui lòng kiểm tra kết nối mạng." -ForegroundColor Red
}
