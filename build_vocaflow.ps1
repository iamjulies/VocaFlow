# =========================================================================
# VocaFlow - Build & Assembly Engine (CHIA ĐỂ TRỊ)
# Assembles src/ components into vocaflow.html and index.html
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$sw = [System.Diagnostics.Stopwatch]::StartNew()

$root = "C:\Users\DELL\Documents\Modding\browser"
$srcDir = Join-Path $root "src"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   VOCAFLOW BUILD SYSTEM - LAP GHEP 'CHIA DE TRI'" -ForegroundColor Yellow
Write-Host "   Nguon: $srcDir" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$templatePath = Join-Path $srcDir "app_template.html"
if (-not (Test-Path $templatePath)) {
    Write-Host "[X] Khong tim thay template tai: $templatePath" -ForegroundColor Red
    return
}

$template = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)

# 1. Styles
$stylePath = Join-Path $srcDir "styles\app.css"
$stylesContent = if (Test-Path $stylePath) { [System.IO.File]::ReadAllText($stylePath, [System.Text.Encoding]::UTF8) } else { "" }
$styleLinesCount = if (Test-Path $stylePath) { ([System.IO.File]::ReadAllLines($stylePath)).Length } else { 0 }
Write-Host "  [+] Da tai CSS: $styleLinesCount dong" -ForegroundColor Green

# 2. Icons SVG
$iconsPath = Join-Path $srcDir "components\icons.svg"
$iconsContent = if (Test-Path $iconsPath) { [System.IO.File]::ReadAllText($iconsPath, [System.Text.Encoding]::UTF8) } else { "" }
Write-Host "  [+] Da tai SVG Icons Sprite" -ForegroundColor Green

# 3. Header
$headerPath = Join-Path $srcDir "components\header.html"
$headerContent = if (Test-Path $headerPath) { [System.IO.File]::ReadAllText($headerPath, [System.Text.Encoding]::UTF8) } else { "" }
Write-Host "  [+] Da tai Header Navigation" -ForegroundColor Green

# 4. Screens
$screensOrder = @(
    "screen-decks.html",
    "screen-deck-detail.html",
    "screen-quiz.html",
    "screen-spelling.html",
    "screen-speaking.html",
    "screen-autofc.html"
)
$screensBuilder = [System.Text.StringBuilder]::new()
foreach ($sName in $screensOrder) {
    $sPath = Join-Path $srcDir "components\screens\$sName"
    if (Test-Path $sPath) {
        $screensBuilder.AppendLine([System.IO.File]::ReadAllText($sPath, [System.Text.Encoding]::UTF8)) | Out-Null
    }
}
$screensContent = $screensBuilder.ToString()
Write-Host "  [+] Da tai $($screensOrder.Count) Man hinh doc lap" -ForegroundColor Green

# 5. Modals
$modalsOrder = @(
    "modal-word.html",
    "modal-quiz-result.html",
    "modal-spelling-setup.html",
    "modal-speaking-setup.html",
    "modal-speaking-result.html",
    "modal-spelling-result.html",
    "modal-quiz-setup.html",
    "modal-ai-deck-studio.html",
    "modal-deck.html",
    "modal-import.html",
    "modal-user-guide.html",
    "modal-wallet-studio.html",
    "modal-shop.html",
    "modal-review-queue.html",
    "modal-feature-guest-lock.html",
    "modal-auth.html",
    "modal-public-profile.html",
    "modal-ai-mentor.html",
    "modal-notifications.html",
    "modal-subscribers-list.html",
    "modal-lucky-wheel.html",
    "modal-spin-purchase-payment.html",
    "modal-rewarded-ad.html",
    "modal-vip-pricing.html",
    "modal-referral.html",
    "modal-achievements.html",
    "modal-flow-calendar.html",
    "modal-profile.html",
    "modal-bug-report.html",
    "modal-bug-screenshot-viewer.html",
    "modal-bug-bounty-picker.html",
    "modal-settings.html",
    "modal-publisher.html",
    "modal-library.html",
    "modal-library-preview.html",
    "modal-community-upload.html"
)
$modalsBuilder = [System.Text.StringBuilder]::new()
$loadedModals = 0
foreach ($mName in $modalsOrder) {
    $mPath = Join-Path $srcDir "components\modals\$mName"
    if (Test-Path $mPath) {
        $modalsBuilder.AppendLine([System.IO.File]::ReadAllText($mPath, [System.Text.Encoding]::UTF8)) | Out-Null
        $loadedModals++
    } else {
        Write-Host "  [!] Canh bao: Thieu file modal: $mName" -ForegroundColor Yellow
    }
}
$modalsContent = $modalsBuilder.ToString()
Write-Host "  [+] Da tai $loadedModals Modals popup doc lap" -ForegroundColor Green

# 6. Scripts
$scriptsBuilder = [System.Text.StringBuilder]::new()
$scriptsDir = Join-Path $srcDir "scripts"
$scriptFiles = Get-ChildItem $scriptsDir -Filter "*.js" | Sort-Object Name
foreach ($sf in $scriptFiles) {
    $scriptsBuilder.AppendLine([System.IO.File]::ReadAllText($sf.FullName, [System.Text.Encoding]::UTF8)) | Out-Null
}
$scriptsContent = $scriptsBuilder.ToString()
Write-Host "  [+] Da tai $($scriptFiles.Count) Modules JavaScript" -ForegroundColor Green

# 7. Assembling into template
$out = $template
$out = $out.Replace('<!-- INJECT:STYLES -->', $stylesContent)
$out = $out.Replace('<!-- INJECT:ICONS -->', $iconsContent)
$out = $out.Replace('<!-- INJECT:HEADER -->', $headerContent)
$out = $out.Replace('<!-- INJECT:SCREENS -->', $screensContent)
$out = $out.Replace('<!-- INJECT:MODALS -->', $modalsContent)
$out = $out.Replace('<!-- INJECT:SCRIPTS -->', $scriptsContent)

# 8. Output files
$vocaOut = Join-Path $root "vocaflow.html"
$indexOut = Join-Path $root "index.html"
[System.IO.File]::WriteAllText($vocaOut, $out, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($indexOut, $out, [System.Text.Encoding]::UTF8)

# Đồng bộ tự động vào Release_App & GITHUB_RELEASE
$releaseAppHtml = Join-Path $root "Release_App\vocaflow.html"
if (Test-Path (Join-Path $root "Release_App")) {
    [System.IO.File]::WriteAllText($releaseAppHtml, $out, [System.Text.Encoding]::UTF8)
    Copy-Item (Join-Path $root "sw.js") (Join-Path $root "Release_App\sw.js") -Force
}
$ghReleaseHtml = Join-Path $root "GITHUB_RELEASE\vocaflow_web_single_file.html"
if (Test-Path (Join-Path $root "GITHUB_RELEASE")) {
    [System.IO.File]::WriteAllText($ghReleaseHtml, $out, [System.Text.Encoding]::UTF8)
}
$ghWinHtml = Join-Path $root "GITHUB_RELEASE\VocaFlow_Windows_App\vocaflow.html"
if (Test-Path (Split-Path $ghWinHtml)) {
    [System.IO.File]::WriteAllText($ghWinHtml, $out, [System.Text.Encoding]::UTF8)
}

$sw.Stop()
$totalLines = [System.IO.File]::ReadAllLines($vocaOut).Length
$sizeKB = [Math]::Round((Get-Item $vocaOut).Length / 1KB, 1)

Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  XUAT BAN THANH CONG!" -ForegroundColor Green
Write-Host "  File: vocaflow.html va index.html" -ForegroundColor White
Write-Host "  Tong so dong: $totalLines dong ($sizeKB KB)" -ForegroundColor White
Write-Host "  Thoi gian lap ghep: $($sw.ElapsedMilliseconds) ms" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
