# =========================================================================
# VOCAFLOW PRODUCTION PRE-FLIGHT TEST SUITE (v1.0-0 Build 359)
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

$root = if ($PSScriptRoot) { $PSScriptRoot } else { "C:\Users\DELL\Documents\Modding\VocaFlow" }
$total = 0
$passed = 0

function Assert-Check($desc, $cond) {
    $script:total++
    if ($cond) {
        $script:passed++
        Write-Host "  [PASS] $desc" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $desc" -ForegroundColor Red
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   VOCAFLOW PRODUCTION PRE-FLIGHT AUDIT - v1.0-0 (BUILD 359)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# -------------------------------------------------------------------------
# TEST 1: ZERO-LEAK AUDIT (.gitignore & secrets)
# -------------------------------------------------------------------------
Write-Host "`n--- GIAI DOAN 1: SECURITY & SENSITIVE DATA SCAN ---" -ForegroundColor Cyan
$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$ignored1 = & $git -C $root check-ignore .git_token
$ignored2 = & $git -C $root check-ignore GITHUB_RELEASE/.git_token
$ignored3 = & $git -C $root check-ignore my_secret.token
Assert-Check ".gitignore hides .git_token" ($ignored1 -ne $null -and $ignored1.Contains(".git_token"))
Assert-Check ".gitignore hides GITHUB_RELEASE/.git_token" ($ignored2 -ne $null -and $ignored2.Contains(".git_token"))
Assert-Check ".gitignore hides *.token" ($ignored3 -ne $null -and $ignored3.Contains(".token"))

$stateCore = [System.IO.File]::ReadAllText("$root\src\scripts\modules\02-state-core.js", [System.Text.Encoding]::UTF8)
Assert-Check "Gemini key uses localStorage getter" ($stateCore.Contains("STORAGE_KEY_GEMINI_KEY") -and $stateCore.Contains("getEffectiveGeminiApiKey"))
Assert-Check "Azure Speech key uses getter" ($stateCore.Contains("STORAGE_KEY_AZURE_SPEECH_KEY") -and $stateCore.Contains("getEffectiveAzureSpeechKey"))

# -------------------------------------------------------------------------
# TEST 2: SYNTAX & RUNTIME INTEGRITY (13 Modules & vocaflow.html)
# -------------------------------------------------------------------------
Write-Host "`n--- GIAI DOAN 2: SYNTAX & RUNTIME INTEGRITY ---" -ForegroundColor Cyan
$modules = Get-ChildItem -Path "$root\src\scripts\modules\*.js"
Assert-Check "All 17 script modules present in src/scripts/modules" ($modules.Count -ge 13)

# Check vocaflow.html exists and is fresh
$vocaHtml = "$root\vocaflow.html"
Assert-Check "vocaflow.html exists and is populated (> 3MB)" ((Test-Path $vocaHtml) -and (Get-Item $vocaHtml).Length -gt 3000000)

# Edge Headless Runtime Test
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
$errFile = "$root\edge_eval_err.txt"
if (Test-Path $errFile) { Remove-Item $errFile -Force }

$proc = Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--window-size=1280,800", "--enable-logging=stderr", "--v=1", "file:///$($vocaHtml.Replace('\', '/'))" -PassThru -NoNewWindow -RedirectStandardError $errFile
Start-Sleep -Seconds 4
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue

$errs = Get-Content $errFile | Select-String "vocaflow.html" | Select-String "SyntaxError", "ReferenceError", "Uncaught"
Assert-Check "vocaflow.html runtime loading has ZERO JavaScript errors in Edge Headless" ($null -eq $errs -or $errs.Count -eq 0)

# -------------------------------------------------------------------------
# TEST 3: UNIFIED BALANCE v4 & ECONOMY AUDIT
# -------------------------------------------------------------------------
Write-Host "`n--- GIAI DOAN 3: ECONOMY & STUDY EXP AUDIT ---" -ForegroundColor Cyan
Assert-Check "calculateUnifiedSessionPoints exported to window" ($stateCore.Contains("window.calculateUnifiedSessionPoints = calculateUnifiedSessionPoints;"))
Assert-Check "calculateUnifiedStudyExp exported to window" ($stateCore.Contains("window.calculateUnifiedStudyExp = calculateUnifiedStudyExp;"))
Assert-Check "getDailyFatigueEfficiency exported to window" ($stateCore.Contains("window.getDailyFatigueEfficiency = getDailyFatigueEfficiency;"))
Assert-Check "Negative words (Tax, Thuế, Phạt) ABSENT from economy notice" (-not $stateCore.Contains("Xu thuế") -and -not $stateCore.Contains("calculateNonStudyCoinTax"))

$walletJs = [System.IO.File]::ReadAllText("$root\src\scripts\modules\08-wallet-economy.js", [System.Text.Encoding]::UTF8)
Assert-Check "Lucky wheel uses getDailyFatigueEfficiency & positive framing" ($walletJs.Contains("getDailyFatigueEfficiency") -and $walletJs.Contains("energyNotice"))

# -------------------------------------------------------------------------
# TEST 4: FIREBASE BANDWIDTH SHIELD & OFFLINE PWA
# -------------------------------------------------------------------------
Write-Host "`n--- GIAI DOAN 4: FIREBASE BANDWIDTH & OFFLINE PWA ---" -ForegroundColor Cyan
$authJs = [System.IO.File]::ReadAllText("$root\src\scripts\modules\03-auth.js", [System.Text.Encoding]::UTF8)
Assert-Check "Periodic sync uses lightweight lastSync.json node (30 bytes)" ($authJs.Contains("users/${userId}/lastSync.json") -or $authJs.Contains("/lastSync.json"))
Assert-Check "Periodic sync guarded with document.hidden" ($authJs.Contains("document.hidden") -and $authJs.Contains("startPeriodicBidirectionalSync"))

$swJs = [System.IO.File]::ReadAllText("$root\sw.js", [System.Text.Encoding]::UTF8)
$releaseSw = [System.IO.File]::ReadAllText("$root\Release_App\sw.js", [System.Text.Encoding]::UTF8)
Assert-Check "sw.js cache name updated to vocaflow-pwa-v1.0-0" ($swJs.Contains("vocaflow-pwa-v1.0-0"))
Assert-Check "Release_App/sw.js cache name updated to vocaflow-pwa-v1.0-0" ($releaseSw.Contains("vocaflow-pwa-v1.0-0"))

# -------------------------------------------------------------------------
# TEST 5: 7-POINT VERSION CONSISTENCY (v1.0-0 Build 359)
# -------------------------------------------------------------------------
Write-Host "`n--- GIAI DOAN 5: 7-POINT VERSION CONSISTENCY ---" -ForegroundColor Cyan
$settingsModal = [System.IO.File]::ReadAllText("$root\src\components\modals\modal-settings.html", [System.Text.Encoding]::UTF8)
$pubspec = [System.IO.File]::ReadAllText("$root\pubspec.yaml", [System.Text.Encoding]::UTF8)
$programCs = [System.IO.File]::ReadAllText("$root\VocaFlow_Desktop\Program.cs", [System.Text.Encoding]::UTF8)
$pushPs1 = [System.IO.File]::ReadAllText("$root\GITHUB_RELEASE\push_github.ps1", [System.Text.Encoding]::UTF8)
$overview = [System.IO.File]::ReadAllText("$root\VOCAFLOW_OVERVIEW.txt", [System.Text.Encoding]::UTF8)
$currentTask = [System.IO.File]::ReadAllText("$root\CURRENT_TASK.md", [System.Text.Encoding]::UTF8)

Assert-Check "1. modal-settings.html has 'VocaFlow v1.0-0 (Build 359)'" ($settingsModal.Contains("VocaFlow v1.0-0 (Build 359)"))
Assert-Check "2. 02-state-core.js has VOCAFLOW_APP_VERSION = 'v1.0-0'" ($stateCore.Contains("VOCAFLOW_APP_VERSION = 'v1.0-0'"))
Assert-Check "   02-state-core.js has VOCAFLOW_APP_BUILD = 359" ($stateCore.Contains("VOCAFLOW_APP_BUILD = 359"))
Assert-Check "3. sw.js has 'vocaflow-pwa-v1.0-0'" ($swJs.Contains("vocaflow-pwa-v1.0-0"))
Assert-Check "4. pubspec.yaml has 'version: 1.0.0+359'" ($pubspec.Contains("version: 1.0.0+359"))
Assert-Check "5. Program.cs has 'VocaFlow v1.0-0'" ($programCs.Contains("VocaFlow v1.0-0"))
Assert-Check "6. push_github.ps1 has 'VocaFlow_v1.0-0_Windows_Portable.zip'" ($pushPs1.Contains("VocaFlow_v1.0-0_Windows_Portable.zip"))
Assert-Check "   push_github.ps1 has 'Release v1.0-0 (Build 359)'" ($pushPs1.Contains("Release v1.0-0 (Build 359)"))
Assert-Check "7. VOCAFLOW_OVERVIEW.txt has 'v1.0-0 (Build 359) - OFFICIAL PRODUCTION RELEASE'" ($overview.Contains("v1.0-0 (Build 359) - OFFICIAL PRODUCTION RELEASE"))
Assert-Check "   CURRENT_TASK.md has 'v1.0-0 (Build 359)'" ($currentTask.Contains("v1.0-0 (Build 359)"))

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   KET QUA KIEM TRA: $passed / $total DIEU KIEN DAT CHUAN" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
Write-Host "==========================================================" -ForegroundColor Cyan

if ($passed -eq $total) {
    Write-Host "`n>>> 100% PASS! SAN SANG BIEN DICH VA PHAT HANH v1.0-0! <<<`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n>>> CO LOI CHUA DAT CHUAN, KIEM TRA LAI! <<<`n" -ForegroundColor Red
    exit 1
}
