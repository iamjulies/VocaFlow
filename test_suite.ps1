$root = "C:\Users\DELL\Documents\Modding\browser"
$appJs = Join-Path $root "src\scripts\app.js"
$headerHtml = Join-Path $root "src\components\header.html"
$settingsHtml = Join-Path $root "src\components\modals\modal-settings.html"
$wordModalHtml = Join-Path $root "src\components\modals\modal-word.html"
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

Write-Host "=== TESTING v0.10.9-alpha-9 (Build 241) ===" -ForegroundColor Cyan

$appJsContent = [System.IO.File]::ReadAllText($appJs)
$headerContent = [System.IO.File]::ReadAllText($headerHtml)
$settingsContent = [System.IO.File]::ReadAllText($settingsHtml)
$wordModalContent = [System.IO.File]::ReadAllText($wordModalHtml)
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

# 3. Monetag Service Worker Integration & Dual-Branch Deploy tests
Assert-Check "sw.js contains Monetag options and Zone ID 11729611" ($swContent.Contains("5gvci.com") -and $swContent.Contains("11729611"))
Assert-Check "Release_App/sw.js contains Monetag options and Zone ID 11729611" ($releaseSwContent.Contains("5gvci.com") -and $releaseSwContent.Contains("11729611"))
Assert-Check "push_github.ps1 deploys both main and gh-pages to iamjulies.github.io" ($pushContent.Contains("branch -M main") -and $pushContent.Contains("branch -M gh-pages") -and $pushContent.Contains("vocaflow_user_io_deploy"))

# 4. Tabbed Sense Switcher & Polysemy Architecture tests
Assert-Check "getWordSenses parses word.senses correctly" ($appJsContent.Contains("function getWordSenses("))
Assert-Check "modal-word.html has word-senses-tab-wrapper and word-senses-tab-bar" ($wordModalContent.Contains("id=`"word-senses-tab-wrapper`"") -and $wordModalContent.Contains("id=`"word-senses-tab-bar`""))
Assert-Check "app.js defines currentActiveSenseTab and switchWordSenseTab" ($appJsContent.Contains("currentActiveSenseTab") -and $appJsContent.Contains("function switchWordSenseTab("))
Assert-Check "openWordModal and editWord reset currentActiveSenseTab to 0" ($appJsContent.Contains("function openWordModal() {`r`n      currentActiveSenseTab = 0;") -or $appJsContent.Contains("function openWordModal() {`n      currentActiveSenseTab = 0;"))
Assert-Check "renderWordModalSenses and addWordModalBlankSense exist in app.js" ($appJsContent.Contains("function renderWordModalSenses(") -and $appJsContent.Contains("function addWordModalBlankSense()"))
Assert-Check "Spelling picks active sense with _activeSpellingSense" ($appJsContent.Contains("_activeSpellingSense"))
Assert-Check "Quiz picks active sense and protects distractors with _activeQuizSense" ($appJsContent.Contains("_activeQuizSense"))
Assert-Check "Speaking evaluates against active sense with Rule E in prompt" ($appJsContent.Contains("_activeSpeakingSense") -and $appJsContent.Contains("POLYSEMY & HOMOGRAPHS"))

# 5. Version v0.10.9-alpha-9 tests across all components
Assert-Check "src/components/header.html shows v0.10.9-alpha-9" ($headerContent.Contains("v0.10.9-alpha-9"))
Assert-Check "src/components/modals/modal-settings.html shows v0.10.9-alpha-9" ($settingsContent.Contains("VocaFlow v0.10.9-alpha-9"))
Assert-Check "src/scripts/app.js defines VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-9'" ($appJsContent.Contains("const VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-9'"))
Assert-Check "sw.js cache name is vocaflow-pwa-v0.10.9-alpha-9" ($swContent.Contains("vocaflow-pwa-v0.10.9-alpha-9"))
Assert-Check "Release_App/sw.js cache name is vocaflow-pwa-v0.10.9-alpha-9" ($releaseSwContent.Contains("vocaflow-pwa-v0.10.9-alpha-9"))
Assert-Check "Program.cs shows v0.10.9-alpha-9" ($csContent.Contains("VocaFlow v0.10.9-alpha-9"))
Assert-Check "VOCAFLOW_OVERVIEW.txt header is v0.10.9-alpha-9 (Build 241)" ($overviewContent.Contains("v0.10.9-alpha-9 (Build 241)"))
Assert-Check "push_github.ps1 has v0.10.9-alpha-9 commit msg and zip" ($pushContent.Contains("v0.10.9-alpha-9"))

# 6. Documentation test
Assert-Check "KIEM_THU_VA_TRIEN_KHAI.md exists and contains 4-step guide" ((Test-Path $docFile) -and ((Get-Item $docFile).Length -gt 1000))

Write-Host ""
Write-Host "RESULT: $passed / $total Passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }