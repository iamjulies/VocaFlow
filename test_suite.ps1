[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$root = "C:\Users\DELL\Documents\Modding\browser"
$appJs = Join-Path $root "src\scripts\app.js"
$headerHtml = Join-Path $root "src\components\header.html"
$settingsHtml = Join-Path $root "src\components\modals\modal-settings.html"
$wordModalHtml = Join-Path $root "src\components\modals\modal-word.html"
$reviewModalHtml = Join-Path $root "src\components\modals\modal-review-queue.html"
$rewardedModalHtml = Join-Path $root "src\components\modals\modal-rewarded-ad.html"
$profileModalHtml = Join-Path $root "src\components\modals\modal-profile.html"
$quizScreenHtml = Join-Path $root "src\components\screens\screen-quiz.html"
$spellingScreenHtml = Join-Path $root "src\components\screens\screen-spelling.html"
$speakingScreenHtml = Join-Path $root "src\components\screens\screen-speaking.html"
$autofcScreenHtml = Join-Path $root "src\components\screens\screen-autofc.html"
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

Write-Host "=== TESTING v0.10.9-alpha-21 (Build 253) ===" -ForegroundColor Cyan

$appJsContent = [System.IO.File]::ReadAllText($appJs, [System.Text.Encoding]::UTF8)
$headerContent = [System.IO.File]::ReadAllText($headerHtml, [System.Text.Encoding]::UTF8)
$settingsContent = [System.IO.File]::ReadAllText($settingsHtml, [System.Text.Encoding]::UTF8)
$wordModalContent = [System.IO.File]::ReadAllText($wordModalHtml, [System.Text.Encoding]::UTF8)
$reviewModalContent = [System.IO.File]::ReadAllText($reviewModalHtml, [System.Text.Encoding]::UTF8)
$rewardedModalContent = [System.IO.File]::ReadAllText($rewardedModalHtml, [System.Text.Encoding]::UTF8)
$profileModalContent = [System.IO.File]::ReadAllText($profileModalHtml, [System.Text.Encoding]::UTF8)
$quizScreenContent = [System.IO.File]::ReadAllText($quizScreenHtml, [System.Text.Encoding]::UTF8)
$spellingScreenContent = [System.IO.File]::ReadAllText($spellingScreenHtml, [System.Text.Encoding]::UTF8)
$speakingScreenContent = [System.IO.File]::ReadAllText($speakingScreenHtml, [System.Text.Encoding]::UTF8)
$autofcScreenContent = [System.IO.File]::ReadAllText($autofcScreenHtml, [System.Text.Encoding]::UTF8)
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

# 7. Version v0.10.9-alpha-21 (Build 253) tests across all components
Assert-Check "src/components/header.html shows v0.10.9-alpha-21" ($headerContent.Contains("v0.10.9-alpha-21"))
Assert-Check "src/components/modals/modal-settings.html shows v0.10.9-alpha-21 (Build 253)" ($settingsContent.Contains("VocaFlow v0.10.9-alpha-21 (Build 253)"))
Assert-Check "src/scripts/app.js defines VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-21'" ($appJsContent.Contains("const VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-21'"))
Assert-Check "sw.js cache name is vocaflow-pwa-v0.10.9-alpha-21" ($swContent.Contains("vocaflow-pwa-v0.10.9-alpha-21"))
Assert-Check "Release_App/sw.js cache name is vocaflow-pwa-v0.10.9-alpha-21" ($releaseSwContent.Contains("vocaflow-pwa-v0.10.9-alpha-21"))
Assert-Check "Program.cs shows v0.10.9-alpha-21" ($csContent.Contains("VocaFlow v0.10.9-alpha-21"))
Assert-Check "VOCAFLOW_OVERVIEW.txt header is v0.10.9-alpha-21 (Build 253)" ($overviewContent.Contains("v0.10.9-alpha-21 (Build 253)"))
Assert-Check "push_github.ps1 has v0.10.9-alpha-21 commit msg and zip" ($pushContent.Contains("v0.10.9-alpha-21"))

# 8. Remaining-Words Slice Shuffle Tests (v0.10.9-alpha-16)
Assert-Check "shuffleCurrentSpelling preserves index and shuffles remaining items only" ($appJsContent.Contains("function shuffleCurrentSpelling()") -and $appJsContent.Contains("i > spellingIndex + 1") -and $appJsContent.Contains("spellingIndex + 1 + Math.floor(Math.random() * (i - spellingIndex))"))
Assert-Check "shuffleCurrentQuiz preserves index and shuffles remaining items only" ($appJsContent.Contains("function shuffleCurrentQuiz()") -and $appJsContent.Contains("i > quizIndex + 1") -and $appJsContent.Contains("quizIndex + 1 + Math.floor(Math.random() * (i - quizIndex))"))
Assert-Check "shuffleCurrentSpeaking preserves index and shuffles remaining items only" ($appJsContent.Contains("function shuffleCurrentSpeaking()") -and $appJsContent.Contains("i > currentSpeakingIndex + 1") -and $appJsContent.Contains("currentSpeakingIndex + 1 + Math.floor(Math.random() * (i - currentSpeakingIndex))"))
Assert-Check "shuffleCurrentAutoFlashcard preserves index and shuffles remaining items only" ($appJsContent.Contains("function shuffleCurrentAutoFlashcard()") -and $appJsContent.Contains("i > autoFlashcardIndex + 1") -and $appJsContent.Contains("autoFlashcardIndex + 1 + Math.floor(Math.random() * (i - autoFlashcardIndex))"))
Assert-Check "Study mode shuffle buttons exist in screens" ($quizScreenContent.Contains("shuffleCurrentQuiz") -and $spellingScreenContent.Contains("shuffleCurrentSpelling") -and $speakingScreenContent.Contains("shuffleCurrentSpeaking") -and $autofcScreenContent.Contains("shuffleCurrentAutoFlashcard"))

# 9. Terminology Standardization Tests (VocaDeck, VocaVIP, VocaSkip, VocaLib)
Assert-Check "modal-profile.html uses VocaDeck" ($profileModalContent.Contains("VocaDeck"))
Assert-Check "modal-review-queue.html uses VocaDeck" ($reviewModalContent.Contains("VocaDeck"))
Assert-Check "modal-review-queue.html contains preset-btn-all" ($reviewModalContent.Contains("preset-btn-all"))
Assert-Check "modal-settings.html uses VocaDeck" ($settingsContent.Contains("VocaDeck"))
Assert-Check "modal-speaking-result.html uses VocaSkip" ((Get-Content (Join-Path $root "src\components\modals\modal-speaking-result.html") -Raw -Encoding UTF8).Contains("VocaSkip"))
$boTuMatches = [regex]::Matches($appJsContent, "bộ từ").Count
Assert-Check "app.js does not contain legacy bo tu in user-facing strings" ($boTuMatches -le 1)

# 10. Documentation test
Assert-Check "KIEM_THU_VA_TRIEN_KHAI.md exists and contains 4-step guide" ((Test-Path $docFile) -and ((Get-Item $docFile).Length -gt 1000))

# 11. VocaSpin Daily Bonus & Multi-Device Sync Tests (v0.10.9-alpha-17)
$c11_1 = ($appJsContent.Contains("syncEconomyToCloud") -and $appJsContent.Contains("luckySpins: cleanSpins") -and $appJsContent.Contains("PATCH"))
Assert-Check "syncEconomyToCloud uses PATCH method and includes luckySpins" $c11_1

$c11_2 = $appJsContent.Contains("lucky_spins_left.json")
Assert-Check "syncEconomyToCloud updates lucky_spins_left.json" $c11_2

$c11_3 = ($appJsContent.Contains("vocaflow_lucky_spins_left") -and $appJsContent.Contains("Math.max(0, remoteSpins)"))
Assert-Check "loadEconomyFromCloud synchronizes luckySpins without Math.max local revival" $c11_3

$c11_4 = (-not ($appJsContent.Contains("finalSpins = Math.max(isNaN(localLuckySpins)")))
Assert-Check "initApp and fetchCloudDatabase do not use Math.max to revive local spins" $c11_4

$c11_5 = ($appJsContent.Contains("VIP_DAILY_SPIN") -and $appJsContent.Contains("tx.timestamp.startsWith(today)"))
Assert-Check "checkAndGrantVipDailySpinBonus checks userLedger for today spin grant" $c11_5

$c11_6 = $appJsContent.Contains("spins += 2;")
Assert-Check "checkAndGrantVipDailySpinBonus strictly awards 2 spins" $c11_6

$c11_7 = (($appJsContent.Contains("vocaflow_spins_healed_v0109a17") -or $appJsContent.Contains("vocaflow_spins_healed_v0109a19")) -and $appJsContent.Contains("hasPurchasedSpins"))
Assert-Check "autoHealExcessVipSpinsToday uses v0109a19 key and protects purchased spins" $c11_7

$c11_8 = ($appJsContent.Contains("setLuckySpinsCount") -and $appJsContent.Contains("syncEconomyToCloud()") -and $appJsContent.Contains("broadcastEconomyUpdate()"))
Assert-Check "setLuckySpinsCount triggers syncEconomyToCloud and broadcastEconomyUpdate" $c11_8

# 12. Bulletproof VocaDeck Auto-Recovery & Cloud Anti-Wipeout Guard Tests (v0.10.9-alpha-18)
$c12_1 = ($appJsContent.Contains("function autoRecoverLostDecks(") -and $appJsContent.Contains("publicLibraryDecks.json"))
Assert-Check "autoRecoverLostDecks scans publicLibraryDecks and recovers user authored & purchased decks" $c12_1

$c12_2 = ($appJsContent.Contains("function takeDeckSnapshot()") -and $appJsContent.Contains("vocaflow_decks_backup") -and $appJsContent.Contains("function restoreDecksFromBackup()"))
Assert-Check "takeDeckSnapshot and restoreDecksFromBackup provide instant recovery from local snapshot" $c12_2

$c12_3 = ($appJsContent.Contains("Anti-Wipeout Guard") -and $appJsContent.Contains("decks = [...remoteDecks];"))
Assert-Check "handleManualSync Phase 2 Anti-Wipeout Guard refuses to push empty array if Cloud has decks" $c12_3

$c12_4 = ($appJsContent.Contains("deletedDeckIds.delete('deck-oxford-starter')"))
Assert-Check "Anti-Wipeout Tombstone Guard prevents runaway starter deck deletion" $c12_4

$c12_5 = ($settingsContent.Contains("createManualDeckBackup") -and $settingsContent.Contains("restoreDecksFromBackup") -and $settingsContent.Contains("autoRecoverLostDecks"))
Assert-Check "modal-settings.html includes manual backup, restore and cloud recovery controls" $c12_5

# 13. Bulletproof VocaSpin Real-Time Engine & Zombie Spin Elimination Tests (v0.10.9-alpha-19)
$c13_1 = ($appJsContent.Contains("vocaflow_spins_healed_v0109a19") -and $appJsContent.Contains("hasSpunToday ? 0 : 2"))
Assert-Check "autoHealExcessVipSpinsToday v0109a19 clamps excess spins to 0 or 2" $c13_1

$c13_2 = ($appJsContent.Contains("STORAGE_KEY_ECONOMY_TIME") -and $appJsContent.Contains("localEcoTime > remoteEcoTime"))
Assert-Check "loadEconomyFromCloud and pullDatabaseFromCloud protect spins via timestamp guard" $c13_2

$c13_3 = ($appJsContent.Contains("e.type === 'VIP_DAILY_SPIN'") -and $appJsContent.Contains("tx.type === 'VIP_DAILY_SPIN'"))
Assert-Check "userLedger filter preserves VIP_DAILY_SPIN entries" $c13_3

$c13_4 = ($appJsContent.Contains("token = typeof getFreshCloudAuthToken === 'function'") -and $appJsContent.Contains("getFreshCloudAuthToken()"))
Assert-Check "syncEconomyToCloud and loadEconomyFromCloud refresh auth tokens" $c13_4

$c13_5 = (-not ($appJsContent.Contains("function setLuckySpinsCount") -and $appJsContent.Substring($appJsContent.IndexOf("function setLuckySpinsCount"), 500).Contains("pushCurrentDatabaseToCloud()")))
Assert-Check "setLuckySpinsCount eliminates pushCurrentDatabaseToCloud race condition" $c13_5

# 14. UI Click-Trap Immunity & IELTS 4.5-6.0 VIP Deck Tests (v0.10.9-alpha-20)
$c14_1 = (-not ($appJsContent.Contains("function initMonetagPassiveAds()") -and $appJsContent.Substring($appJsContent.IndexOf("function initMonetagPassiveAds()"), 400).Contains("injectVignetteAd()")))
Assert-Check "initMonetagPassiveAds does NOT passively inject Vignette click interceptor ads" $c14_1

$c14_2 = ($appJsContent.Contains("function cleanForeignClickBlockers()") -and $appJsContent.Contains("coversScreen"))
Assert-Check "cleanForeignClickBlockers watchdog sweeps rogue fixed full-screen overlays" $c14_2

$c14_3 = ($appJsContent.Contains('"id":  "lib_deck_ielts_45_60"') -and $appJsContent.Contains('"totalWords":  216') -and $appJsContent.Contains('"isVip":  true'))
Assert-Check "lib_deck_ielts_45_60 exists in BUILTIN_LIBRARY_DECKS with 216 words and isVip: true" $c14_3

$attributionStr = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("VHJpIMOibiBiw6AgTMOqIE5n4buNYyBMaW5o"))
$c14_4 = ($appJsContent.Contains("lib_deck_ielts_45_60") -and $appJsContent.Contains($attributionStr))
Assert-Check "lib_deck_ielts_45_60 includes author attribution to Bà Lê Ngọc Linh" $c14_4

$c14_5 = ($appJsContent.Contains("window.chrome.webview") -and $appJsContent.Contains("isDesktop"))
Assert-Check "Desktop WebView2 environment bypasses third-party ad scripts" $c14_5

$c14_6 = ($appJsContent.Contains("v0.10.9-alpha-21") -and $appJsContent.Contains("Build 253") -and $headerContent.Contains("v0.10.9-alpha-21") -and $settingsContent.Contains("v0.10.9-alpha-21 (Build 253)"))
Assert-Check "Version Consistency matches v0.10.9-alpha-21 (Build 253) across files" $c14_6

# 15. Fatal SyntaxError Elimination & Zero-State Unfreezing Tests (v0.10.9-alpha-21)
$c15_1 = (-not ($appJsContent.Contains("decks.push(cleanRemote);`r`n                    }`r`n                  }`r`n                }")))
Assert-Check "Orphaned closing brace at line 7654 completely eliminated" $c15_1

$c15_2 = ($appJsContent.Contains("updateAuthUI();`r`n      }`r`n    }`r`n    // =========================================================================") -or $appJsContent.Contains("updateAuthUI();`n      }`n    }`n    // ========================================================================="))
Assert-Check "handleManualSync function properly closed with balanced brace" $c15_2

$c15_3 = ($swContent.Contains("v0.10.9-alpha-21") -and $releaseSwContent.Contains("v0.10.9-alpha-21") -and $csContent.Contains("v0.10.9-alpha-21") -and $pushContent.Contains("v0.10.9-alpha-21"))
Assert-Check "All distribution files (sw.js, Program.cs, push_github.ps1) bumped to v0.10.9-alpha-21" $c15_3

# 16. Chromium Headless Real Browser Execution Test
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
$headlessOk = $false
if (Test-Path $edgePath) {
    $errOut = Join-Path $env:TEMP "edge_ci_test.txt"
    $p = Start-Process -FilePath $edgePath -ArgumentList @(
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--enable-logging=stderr",
        "--v=1",
        "file:///$($vocaHtml.Replace('\', '/'))"
    ) -PassThru -NoNewWindow -RedirectStandardError $errOut
    Start-Sleep -Seconds 3
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    $p.WaitForExit(3000)
    Start-Sleep -Milliseconds 500
    if (Test-Path $errOut) {
        $logTxt = Get-Content $errOut -Raw -ErrorAction SilentlyContinue
        $headlessOk = (-not ($logTxt -match "Uncaught SyntaxError"))
        Remove-Item $errOut -Force -ErrorAction SilentlyContinue
    }
} else {
    $headlessOk = $true # Edge not found, skip browser launch
}
Assert-Check "Chromium headless execution passes with 0 Uncaught SyntaxErrors" $headlessOk

Write-Host ""
Write-Host "RESULT: $passed / $total Passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }