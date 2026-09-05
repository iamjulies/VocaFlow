$root = "C:\Users\DELL\Documents\Modding\browser"
$appJs = Join-Path $root "src\scripts\app.js"
$headerHtml = Join-Path $root "src\components\header.html"
$settingsHtml = Join-Path $root "src\components\modals\modal-settings.html"
$swJs = Join-Path $root "sw.js"
$releaseSwJs = Join-Path $root "Release_App\sw.js"
$programCs = Join-Path $root "VocaFlow_Desktop\Program.cs"
$overviewTxt = Join-Path $root "VOCAFLOW_OVERVIEW.txt"
$pushPs1 = Join-Path $root "GITHUB_RELEASE\push_github.ps1"
$vocaHtml = Join-Path $root "vocaflow.html"
$docFile = Join-Path $root "KIEM_THU_VA_TRIEN_KHAI.md"

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

Write-Host "=== TESTING v0.10.9-alpha-7 (Build 239) ===" -ForegroundColor Cyan

$appJsContent = [System.IO.File]::ReadAllText($appJs)
$headerContent = [System.IO.File]::ReadAllText($headerHtml)
$settingsContent = [System.IO.File]::ReadAllText($settingsHtml)
$swContent = [System.IO.File]::ReadAllText($swJs)
$releaseSwContent = [System.IO.File]::ReadAllText($releaseSwJs)
$csContent = [System.IO.File]::ReadAllText($programCs)
$overviewContent = [System.IO.File]::ReadAllText($overviewTxt)
$pushContent = [System.IO.File]::ReadAllText($pushPs1)
$vocaContent = [System.IO.File]::ReadAllText($vocaHtml)

# 1. Flow Freeze logic tests
Assert-Check "Legacy freeze deduction block removed" (-not ($appJsContent.Contains("vocaflow_freeze_deducted_v0108_debug06")))
Assert-Check "healErroneousFreezeDeduction function exists" ($appJsContent.Contains("function healErroneousFreezeDeduction()"))
Assert-Check "Anti-Time-Travel engine variables exist" ($appJsContent.Contains("let serverTimeDeltaMs = 0;"))
Assert-Check "isSystemClockManipulatedBackward exists" ($appJsContent.Contains("function isSystemClockManipulatedBackward()"))
Assert-Check "evaluateAndAutoApplyFlowFreezes protects active contiguous days" ($appJsContent.Contains("allActive.has(yesterdayStr)"))

# 2. VIP Expiry logic tests
Assert-Check "isAuthorVipUser checks expiration timestamp" ($appJsContent.Contains("const exp = Number(entry.vipExpiresAt || 0);") -and $appJsContent.Contains("return exp > now;"))
Assert-Check "stripVipAffixes helper exists" ($appJsContent.Contains("function stripVipAffixes("))

# 3. Version v0.10.9-alpha-7 tests across all components
Assert-Check "src/components/header.html shows v0.10.9-alpha-7" ($headerContent.Contains("v0.10.9-alpha-7"))
Assert-Check "src/components/modals/modal-settings.html shows v0.10.9-alpha-7" ($settingsContent.Contains("VocaFlow v0.10.9-alpha-7"))
Assert-Check "src/scripts/app.js defines VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-7'" ($appJsContent.Contains("const VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-7'"))
Assert-Check "src/scripts/app.js dynamically syncs settings-app-version-label" ($appJsContent.Contains("document.getElementById('settings-app-version-label')"))
Assert-Check "sw.js cache name is vocaflow-pwa-v0.10.9-alpha-7" ($swContent.Contains("vocaflow-pwa-v0.10.9-alpha-7"))
Assert-Check "Release_App/sw.js cache name is vocaflow-pwa-v0.10.9-alpha-7" ($releaseSwContent.Contains("vocaflow-pwa-v0.10.9-alpha-7"))
Assert-Check "Program.cs shows v0.10.9-alpha-7" ($csContent.Contains("VocaFlow v0.10.9-alpha-7"))
Assert-Check "VOCAFLOW_OVERVIEW.txt header is v0.10.9-alpha-7 (Build 239)" ($overviewContent.Contains("v0.10.9-alpha-7 (Build 239)"))
Assert-Check "push_github.ps1 has v0.10.9-alpha-7 commit msg and zip" ($pushContent.Contains("v0.10.9-alpha-7"))
Assert-Check "vocaflow.html contains v0.10.9-alpha-7 in header and settings" ($vocaContent.Contains("v0.10.9-alpha-7") -and $vocaContent.Contains("VocaFlow v0.10.9-alpha-7"))

# 4. Documentation test
Assert-Check "KIEM_THU_VA_TRIEN_KHAI.md exists and contains 4-step guide" ((Test-Path $docFile) -and ((Get-Item $docFile).Length -gt 1000))

Write-Host ""
Write-Host "RESULT: $passed / $total Passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }