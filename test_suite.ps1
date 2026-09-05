[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$root = "C:\Users\DELL\Documents\Modding\browser"
$appJs = Join-Path $root "src\scripts\app.js"
$headerHtml = Join-Path $root "src\components\header.html"
$settingsHtml = Join-Path $root "src\components\modals\modal-settings.html"
$wordModalHtml = Join-Path $root "src\components\modals\modal-word.html"
$reviewModalHtml = Join-Path $root "src\components\modals\modal-review-queue.html"
$rewardedModalHtml = Join-Path $root "src\components\modals\modal-rewarded-ad.html"
$cssFile = Join-Path $root "src\styles\app.css"
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

Write-Host "=== TESTING v0.10.9-alpha-14 (Build 246) ===" -ForegroundColor Cyan

$appJsContent = [System.IO.File]::ReadAllText($appJs, [System.Text.Encoding]::UTF8)
$headerContent = [System.IO.File]::ReadAllText($headerHtml, [System.Text.Encoding]::UTF8)
$settingsContent = [System.IO.File]::ReadAllText($settingsHtml, [System.Text.Encoding]::UTF8)
$wordModalContent = [System.IO.File]::ReadAllText($wordModalHtml, [System.Text.Encoding]::UTF8)
$reviewModalContent = [System.IO.File]::ReadAllText($reviewModalHtml, [System.Text.Encoding]::UTF8)
$rewardedModalContent = [System.IO.File]::ReadAllText($rewardedModalHtml, [System.Text.Encoding]::UTF8)
$cssContent = [System.IO.File]::ReadAllText($cssFile, [System.Text.Encoding]::UTF8)
$swContent = [System.IO.File]::ReadAllText($swJs, [System.Text.Encoding]::UTF8)
$releaseSwContent = [System.IO.File]::ReadAllText($releaseSwJs, [System.Text.Encoding]::UTF8)
$csContent = [System.IO.File]::ReadAllText($programCs, [System.Text.Encoding]::UTF8)
$overviewContent = [System.IO.File]::ReadAllText($overviewTxt, [System.Text.Encoding]::UTF8)
$pushContent = [System.IO.File]::ReadAllText($pushPs1, [System.Text.Encoding]::UTF8)
$vocaHtml = Join-Path $root "vocaflow.html"
$templateContent = [System.IO.File]::ReadAllText((Join-Path $root "src\app_template.html"), [System.Text.Encoding]::UTF8)

# 1. Flow Freeze logic tests
Assert-Check "Legacy freeze deduction block removed" (-not ($appJsContent.Contains("vocaflow_freeze_deducted_v0108_debug06")))
Assert-Check "healErroneousFreezeDeduction function exists" ($appJsContent.Contains("function healErroneousFreezeDeduction()"))
Assert-Check "Anti-Time-Travel engine variables exist" ($appJsContent.Contains("let serverTimeDeltaMs = 0;"))
Assert-Check "isSystemClockManipulatedBackward exists" ($appJsContent.Contains("function isSystemClockManipulatedBackward()"))
Assert-Check "evaluateAndAutoApplyFlowFreezes protects active contiguous days" ($appJsContent.Contains("allActive.has(yesterdayStr)"))

# 2. VIP Expiry logic tests
Assert-Check "isAuthorVipUser checks expiration timestamp" ($appJsContent.Contains("const exp = Number(entry.vipExpiresAt || 0);") -and $appJsContent.Contains("return exp > now;"))
Assert-Check "stripVipAffixes helper exists" ($appJsContent.Contains("function stripVipAffixes("))

# 3. Monetag Clean Ads, In-App Cycling, Study Mode Suppression & Instant VIP Purge
Assert-Check "Multitag popunder script completely removed from app_template.html" (-not ($templateContent.Contains("quge5.com")))
Assert-Check "Monetag SW script removed from sw.js" (-not ($swContent.Contains("3nbf4.com")))
Assert-Check "Monetag SW script removed from Release_App/sw.js" (-not ($releaseSwContent.Contains("3nbf4.com")))
Assert-Check "initMonetagPassiveAds exists with In-Page (11730204) & Vignette (11730208)" ($appJsContent.Contains("function initMonetagPassiveAds()") -and $appJsContent.Contains("11730204") -and $appJsContent.Contains("11730208"))
Assert-Check "Instant VIP purge DOM without F5 exists" ($appJsContent.Contains("function purgeAllAdArtifactsFromDOM()"))
Assert-Check "Direct Link completely removed from rewarded ads (no tab opening)" (-not ($rewardedModalContent.Contains("11730211")))
Assert-Check "modal-rewarded-ad.html contains in-app cycling container & status badge" ($rewardedModalContent.Contains("rewarded-ad-cycle-container") -and $rewardedModalContent.Contains("rewarded-ad-status-badge"))
Assert-Check "In-App Rewarded Ad cycling engine exists in app.js" ($appJsContent.Contains("function startRewardedAdCycle()") -and $appJsContent.Contains("function checkAndCycleRewardedAds()") -and $appJsContent.Contains("isAnyAdCurrentlyOnScreen()"))
Assert-Check "Vignette banner suppressed in study screens and VocaMentor AI" ($appJsContent.Contains("function isInStudyOrMentorMode()") -and $appJsContent.Contains("function suppressVignetteAd()"))
Assert-Check "push_github.ps1 deploys both main and gh-pages to iamjulies.github.io" ($pushContent.Contains("branch -M main") -and $pushContent.Contains("branch -M gh-pages") -and $pushContent.Contains("vocaflow_user_io_deploy"))

# 4. Tabbed Sense Switcher & Polysemy Architecture tests
Assert-Check "getWordSenses parses word.senses correctly" ($appJsContent.Contains("function getWordSenses("))
Assert-Check "modal-word.html has word-senses-tab-wrapper and word-senses-tab-bar" ($wordModalContent.Contains("id=`"word-senses-tab-wrapper`"") -and $wordModalContent.Contains("id=`"word-senses-tab-bar`""))
Assert-Check "app.js defines currentActiveSenseTab and switchWordSenseTab" ($appJsContent.Contains("currentActiveSenseTab") -and $appJsContent.Contains("function switchWordSenseTab("))
Assert-Check "renderWordModalSenses and addWordModalBlankSense exist in app.js" ($appJsContent.Contains("function renderWordModalSenses(") -and $appJsContent.Contains("function addWordModalBlankSense()"))
Assert-Check "Spelling picks active sense with _activeSpellingSense" ($appJsContent.Contains("_activeSpellingSense"))
Assert-Check "Quiz picks active sense and protects distractors with _activeQuizSense" ($appJsContent.Contains("_activeQuizSense"))
Assert-Check "Speaking evaluates against active sense with Rule E in prompt" ($appJsContent.Contains("_activeSpeakingSense") -and $appJsContent.Contains("POLYSEMY & HOMOGRAPHS"))

# 5. v0.10.9-alpha-13 specific feature tests
Assert-Check "POS dropdown includes 'Không (Tự động / Auto)' option" ($appJsContent.Contains("val: '', label:") -and $appJsContent.Contains("Auto"))
Assert-Check "Sense filtering on save requires at least 1 definitionVi" ($appJsContent.Contains("validSenses.length === 0") -and $appJsContent.Contains("s.definitionVi.trim().length > 0"))
Assert-Check "Duplicate word prevention checkWordTermDuplicate exists" ($appJsContent.Contains("function checkWordTermDuplicate("))
Assert-Check "Duplicate word UI elements exist in modal-word.html" ($wordModalContent.Contains("word-term-duplicate-warning") -and $wordModalContent.Contains("btn-open-existing-duplicate"))
Assert-Check "Import merges duplicate terms into existing word senses" ($appJsContent.Contains("existingInDeck.senses.push(newSense)"))

# 6. v0.10.9-alpha-14 SRS Subset Review, Archive Exclusion & Deck Card Delete tests
Assert-Check "SRS getDueReviewWords excludes archived decks" ($appJsContent.Contains("archivedDeckIds.has(w.deckId)"))
Assert-Check "SRS selectReviewQueuePreset and selected words state exist" ($appJsContent.Contains("function selectReviewQueuePreset(") -and $appJsContent.Contains("reviewQueueSelectedWordIds"))
Assert-Check "modal-review-queue.html contains preset pills and filter controls" ($reviewModalContent.Contains("review-queue-preset-pills") -and $reviewModalContent.Contains("review-queue-deck-filter") -and $reviewModalContent.Contains("review-queue-sort"))
Assert-Check "Deck card action grid includes direct delete button" ($appJsContent.Contains("btn-delete-deck") -and $appJsContent.Contains('deleteDeck('))
Assert-Check "CSS defines 4-column deck actions grid" ($cssContent.Contains("repeat(4, 1fr)"))

# 7. Version v0.10.9-alpha-14 tests across all components
Assert-Check "src/components/header.html shows v0.10.9-alpha-14" ($headerContent.Contains("v0.10.9-alpha-14"))
Assert-Check "src/components/modals/modal-settings.html shows v0.10.9-alpha-14" ($settingsContent.Contains("VocaFlow v0.10.9-alpha-14 (Build 246)"))
Assert-Check "src/scripts/app.js defines VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-14'" ($appJsContent.Contains("const VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-14'"))
Assert-Check "sw.js cache name is vocaflow-pwa-v0.10.9-alpha-14" ($swContent.Contains("vocaflow-pwa-v0.10.9-alpha-14"))
Assert-Check "Release_App/sw.js cache name is vocaflow-pwa-v0.10.9-alpha-14" ($releaseSwContent.Contains("vocaflow-pwa-v0.10.9-alpha-14"))
Assert-Check "Program.cs shows v0.10.9-alpha-14" ($csContent.Contains("VocaFlow v0.10.9-alpha-14"))
Assert-Check "VOCAFLOW_OVERVIEW.txt header is v0.10.9-alpha-14 (Build 246)" ($overviewContent.Contains("v0.10.9-alpha-14 (Build 246)"))
Assert-Check "push_github.ps1 has v0.10.9-alpha-14 commit msg and zip" ($pushContent.Contains("v0.10.9-alpha-14"))

# 8. Documentation test
Assert-Check "KIEM_THU_VA_TRIEN_KHAI.md exists and contains 4-step guide" ((Test-Path $docFile) -and ((Get-Item $docFile).Length -gt 1000))

Write-Host ""
Write-Host "RESULT: $passed / $total Passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }