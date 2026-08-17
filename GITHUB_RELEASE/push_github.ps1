# PowerShell Script - Push VocaFlow to GitHub
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "VocaFlow - Đẩy Code Lên GitHub (iamjulies/VocaFlow)"

$root = (Get-Item $PSScriptRoot).Parent.FullName
$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$repoUrl = "https://github.com/iamjulies/VocaFlow.git"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW - ĐẨY CODE LÊN GITHUB" -ForegroundColor Yellow
Write-Host "   Repository: $repoUrl" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $git)) {
    Write-Host "[X] Không tìm thấy công cụ Git tại: $git" -ForegroundColor Red
    return
}

# 1. Cập nhật bản ZIP phát hành mới nhất
Write-Host "[1/4] Đang đóng gói bản ZIP phát hành mới nhất..." -ForegroundColor Cyan
$stage = Join-Path $root "VocaFlow_Windows_Portable"
$zipPath = Join-Path $PSScriptRoot "VocaFlow_v0.0.1_Windows_Portable.zip"
$rootZipPath = Join-Path $root "VocaFlow_v0.0.1_Windows_Portable.zip"

try {
    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    New-Item -ItemType Directory -Path $stage | Out-Null
    Copy-Item (Join-Path $root "Release_App\*") -Destination $stage -Recurse -Force
    Compress-Archive -Path "$stage\*" -DestinationPath $zipPath -Force
    Copy-Item $zipPath -Destination $rootZipPath -Force
    Remove-Item -Recurse -Force $stage
    Write-Host "  -> Đã tạo file: VocaFlow_v0.0.1_Windows_Portable.zip" -ForegroundColor Green
} catch {
    Write-Host "  [!] Lưu ý đóng gói ZIP: $_" -ForegroundColor Yellow
}

# 2. Cấu hình Git Remote
Write-Host ""
Write-Host "[2/4] Đang cấu hình liên kết GitHub..." -ForegroundColor Cyan
& $git -C $root remote remove origin 2>$null
& $git -C $root remote add origin $repoUrl
& $git -C $root branch -M main
& $git -C $root config credential.helper manager

# 3. Chuẩn bị Commit
Write-Host ""
Write-Host "[3/4] Đang chuẩn bị các tệp thay đổi..." -ForegroundColor Cyan
& $git -C $root add .
& $git -C $root commit -m "feat: VocaFlow v0.0.1 with 3D Flashcards, Quiz, IPA keyboard, and Excel sync" 2>$null

# 4. Đẩy lên GitHub
Write-Host ""
Write-Host "[4/4] Đang đẩy lên GitHub..." -ForegroundColor Cyan
Write-Host "  (Nếu có cửa sổ GitHub / trình duyệt hiện lên, bạn chỉ cần bấm 'Sign in' / 'Authorize')" -ForegroundColor Yellow
Write-Host ""

& $git -C $root push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  🎉 CHÚC MỪNG! ĐÃ ĐẨY LÊN GITHUB THÀNH CÔNG RỰC RỠ!" -ForegroundColor Green
    Write-Host "  👉 Kiểm tra tại: https://github.com/iamjulies/VocaFlow" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Yellow
    Write-Host "  [!] Nếu GitHub yêu cầu đăng nhập, bạn hãy hoàn tất" -ForegroundColor Yellow
    Write-Host "  trên trình duyệt rồi chạy lại file này nhé!" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Yellow
}
