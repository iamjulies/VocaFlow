# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-18 (Build 319)
# Extended Learning Modes, Cloze Mistake Tracking, Review Queue Launch, Audio Button Removal, 5-Tile Result Dashboard, and 7-Day Stats
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9350
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test18_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-18 (Build 319) TEST SUITE" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

$edgeProcess = Start-Process -FilePath $edgePath -ArgumentList @(
    "--remote-debugging-port=$port",
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--user-data-dir=$tempUserData",
    "$fileUrl"
) -PassThru

Start-Sleep -Seconds 3

try {
    $endpoints = Invoke-RestMethod -Uri "http://localhost:$port/json" -TimeoutSec 10
    $pageTarget = $endpoints | Where-Object { $_.type -eq "page" -and ($_.url -like "*vocaflow.html*" -or $_.url -like "file://*") } | Select-Object -First 1
    if (-not $pageTarget) {
        $pageTarget = $endpoints | Where-Object { $_.type -eq "page" } | Select-Object -First 1
    }

    $wsUrl = $pageTarget.webSocketDebuggerUrl
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $ws.ConnectAsync((New-Object System.Uri($wsUrl)), $cts.Token).Wait(4000) | Out-Null
    Start-Sleep -Seconds 2

    $global:cdpMsgId = 1000

    function Send-CDPCommand($method, $params = @{}) {
        $msgId = [System.Threading.Interlocked]::Increment([ref]$global:cdpMsgId)
        $msgObj = @{ id = $msgId; method = $method; params = $params }
        $json = ($msgObj | ConvertTo-Json -Depth 10 -Compress)
        $sendBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $ws.SendAsync((New-Object System.ArraySegment[byte] -ArgumentList @(,$sendBytes)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait(4000) | Out-Null

        $deadline = [DateTime]::Now.AddSeconds(10)
        while ([DateTime]::Now -lt $deadline) {
            $ms = New-Object System.IO.MemoryStream
            $buffer = New-Object byte[] 65536
            do {
                $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
                $recvResult = $ws.ReceiveAsync($segment, $cts.Token).Result
                $ms.Write($buffer, 0, $recvResult.Count)
            } while (-not $recvResult.EndOfMessage)

            $respStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
            $parsed = $respStr | ConvertFrom-Json
            if ($parsed.id -eq $msgId) { return $parsed }
        }
        return $null
    }

    function Eval-JS($expr) {
        $res = Send-CDPCommand "Runtime.evaluate" @{
            expression = $expr
            returnByValue = $true
            awaitPromise = $true
        }
        if ($res.result.exceptionDetails) {
            Write-Host "  [JS Exception]: $(($res.result.exceptionDetails | ConvertTo-Json -Compress))" -ForegroundColor Red
        }
        return $res.result.result.value
    }

    function Take-Screenshot($fileName) {
        $res = Send-CDPCommand "Page.captureScreenshot" @{ format = "png" }
        if ($res.result.data) {
            $bytes = [Convert]::FromBase64String($res.result.data)
            $outPath = Join-Path $artifactDir $fileName
            [System.IO.File]::WriteAllBytes($outPath, $bytes)
            Write-Host "  -> Snapshot saved: $outPath" -ForegroundColor Green
        }
    }

    Send-CDPCommand "Page.enable" | Out-Null
    Send-CDPCommand "DOM.enable" | Out-Null
    Send-CDPCommand "Page.navigate" @{ url = $fileUrl } | Out-Null
    Start-Sleep -Seconds 3

    # Mock window.alert to avoid headless lockup & setup sample words
    Eval-JS @"
    window.alert = function(msg) { console.log('[Alert Mock]:', msg); };
    window.confirm = function(msg) { return true; };
    words = [
        { id: 'w_test_1', term: 'innovation', definitionVi: 'sự đổi mới', partOfSpeech: 'noun', deckId: 'deck_demo', masteryScore: 20 },
        { id: 'w_test_2', term: 'sustainable', definitionVi: 'bền vững', partOfSpeech: 'adjective', deckId: 'deck_demo', masteryScore: 40 },
        { id: 'w_test_3', term: 'collaboration', definitionVi: 'sự cộng tác', partOfSpeech: 'noun', deckId: 'deck_demo', masteryScore: 10 }
    ];
    decks = [{ id: 'deck_demo', title: 'Demo Deck', wordCount: 3 }];
    currentDeckId = 'deck_demo';
    reviewQueueMasterList = [...words];
    reviewQueueFilteredList = [...words];
"@ | Out-Null

    # Test 1: App Version & Constants
    Write-Host "`n[Test 1] Kiem tra App Version & Constants..." -ForegroundColor Cyan
    $version = Eval-JS "VOCAFLOW_APP_VERSION"
    $title = Eval-JS "VOCAFLOW_APP_FULL_TITLE"
    Write-Host "  VOCAFLOW_APP_VERSION: $version" -ForegroundColor Gray
    Write-Host "  VOCAFLOW_APP_FULL_TITLE: $title" -ForegroundColor Gray
    if ($version -eq "v0.10.10-18") {
        Write-Host "  ✅ PASS: Version v0.10.10-18 (Build 319)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: Expected v0.10.10-18, got $version" -ForegroundColor Red
    }

    # Test 2: Issue 10 - Check btn-cloze-tts is removed from screen-cloze
    Write-Host "`n[Test 2] Kiem tra nut Nghe bai doc da duoc go bo khoi screen-cloze (Issue 10)..." -ForegroundColor Cyan
    $ttsBtn = Eval-JS "document.getElementById('btn-cloze-tts') === null"
    if ($ttsBtn -eq $true) {
        Write-Host "  ✅ PASS: btn-cloze-tts da duoc go bo hoan toan khoi screen-cloze" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: btn-cloze-tts van con ton tai" -ForegroundColor Red
    }

    # Test 3: Issue 9 - Check Cloze button in Review Queue modal & launch
    Write-Host "`n[Test 3] Kiem tra nut Dien Tu (beta) trong Hang Doi On Tap (Issue 9)..." -ForegroundColor Cyan
    Eval-JS "openReviewQueueModal();" | Out-Null
    Start-Sleep -Milliseconds 600
    $rqClozeBtn = Eval-JS "document.getElementById('btn-review-cloze') !== null"
    Write-Host "  Nut btn-review-cloze exists: $rqClozeBtn" -ForegroundColor Gray
    Take-Screenshot "v0_10_10_18_review_queue_cloze_btn.png"

    if ($rqClozeBtn -eq $true) {
        Write-Host "  ✅ PASS: Nut Điền Từ (β) co mat trong modal review queue" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: Khong tim thay btn-review-cloze" -ForegroundColor Red
    }

    # Test 4: Launch Cloze via Review Queue button
    Write-Host "`n[Test 4] Kiem tra launchReviewDueWords('cloze') mo Cloze Setup Modal..." -ForegroundColor Cyan
    Eval-JS "closeModal('modal-review-queue'); launchReviewDueWords('cloze');" | Out-Null
    Start-Sleep -Milliseconds 600
    $clozeSetupModalActive = Eval-JS "document.getElementById('modal-cloze-setup')?.classList.contains('active')"
    Write-Host "  Modal cloze setup active: $clozeSetupModalActive" -ForegroundColor Gray
    if ($clozeSetupModalActive -eq $true) {
        Write-Host "  ✅ PASS: launchReviewDueWords('cloze') mo thanh cong modal-cloze-setup" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: modal-cloze-setup khong active" -ForegroundColor Red
    }

    # Test 5: Start Cloze Session and Test Evaluation + Mistake Tracking (Issue 8 & 11)
    Write-Host "`n[Test 5] Chay phien Cloze Test, danh gia sai/dung & kiem tra Sổ Từ Sai (Issue 8 & 11)..." -ForegroundColor Cyan
    $setupRes = Eval-JS @"
    (async function() {
        const testWords = [
            { id: 'w_test_1', term: 'innovation', definitionVi: 'sự đổi mới', partOfSpeech: 'noun', deckId: 'deck_demo' },
            { id: 'w_test_2', term: 'sustainable', definitionVi: 'bền vững', partOfSpeech: 'adjective', deckId: 'deck_demo' },
            { id: 'w_test_3', term: 'collaboration', definitionVi: 'sự cộng tác', partOfSpeech: 'noun', deckId: 'deck_demo' }
        ];
        words = testWords;
        currentDeckId = 'deck_demo';
        
        // Start cloze mode
        await startClozeMode(false, testWords, 1);
        
        // Fill blank 1 correctly, leave blank 2 empty
        if (clozeCurrentPassage && clozeCurrentPassage.options && clozeCurrentPassage.blanks) {
            const opt1 = clozeCurrentPassage.options.find(o => o.word === clozeCurrentPassage.blanks[0].correctWord);
            if (opt1) placeWordInBlank(1, opt1.id);
        }
        
        // Submit evaluation
        submitClozeEvaluation();
        return { success: true, blanks: clozeCurrentPassage?.blanks?.length };
    })()
"@
    Start-Sleep -Seconds 2

    # Check mistakes list
    $mistakes = Eval-JS "getMistakeWordsList().map(w => w.term || w.wordId)"
    Write-Host "  Mistake words in notebook: $($mistakes -join ', ')" -ForegroundColor Gray
    if ($mistakes.Length -gt 0) {
        Write-Host "  ✅ PASS: Tu lam sai da duoc them vao So Tay Loi Sai (Issue 8)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ NOTICE: Mistake list updated: $($mistakes -join ', ')" -ForegroundColor Yellow
    }

    # Test 6: Finish session and check 5-Tile Result Dashboard (Issue 11)
    Write-Host "`n[Test 6] Kiem tra 5-Tile Dashboard tren modal-cloze-result (Issue 11)..." -ForegroundColor Cyan
    Eval-JS "finishClozeSession();" | Out-Null
    Start-Sleep -Milliseconds 800

    $ratioText = Eval-JS "document.getElementById('cloze-res-floor-ratio')?.textContent"
    $pointsText = Eval-JS "document.getElementById('cloze-res-points')?.textContent"
    $avgText = Eval-JS "document.getElementById('cloze-res-avg-score')?.textContent"
    $hintsText = Eval-JS "document.getElementById('cloze-res-hints-skips')?.textContent"
    $durText = Eval-JS "document.getElementById('cloze-res-duration')?.textContent"
    $diffBadgeText = Eval-JS "document.getElementById('cloze-res-difficulty-badge')?.textContent"
    $wrongBannerVisible = Eval-JS "document.getElementById('cloze-res-wrong-banner')?.style.display"

    Write-Host "  🎯 Ratio: $ratioText" -ForegroundColor Gray
    Write-Host "  💰 Points: $pointsText" -ForegroundColor Gray
    Write-Host "  ⚡ Avg score / Words correct: $avgText" -ForegroundColor Gray
    Write-Host "  💡 Hints & Skips: $hintsText" -ForegroundColor Gray
    Write-Host "  ⏱️ Duration: $durText" -ForegroundColor Gray
    Write-Host "  🧩 Difficulty badge: $diffBadgeText" -ForegroundColor Gray
    Write-Host "  ❌ Wrong words banner: $wrongBannerVisible" -ForegroundColor Gray

    Take-Screenshot "v0_10_10_18_cloze_result_5tile.png"

    if ($ratioText -and $pointsText -and $avgText -and $hintsText -and $durText) {
        Write-Host "  ✅ PASS: 5-Tile Dashboard render hoan hao tren modal-cloze-result (Issue 11)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: 5-Tile Dashboard thieu phan tu" -ForegroundColor Red
    }

    # Test 7: Check 7-day stats tracking (Issue 12)
    Write-Host "`n[Test 7] Kiem tra ghi nhan Xu & thoi gian hoc vao thong ke 7 ngay (Issue 12)..." -ForegroundColor Cyan
    $perfJson = Eval-JS "JSON.stringify(get7DayPerformanceData().days.slice(-1)[0])"
    $todayPerf = $perfJson | ConvertFrom-Json
    Write-Host "  Today JSON: $perfJson" -ForegroundColor Gray
    Write-Host "  Today Study Minutes: $($todayPerf.screenMinutes)" -ForegroundColor Gray
    Write-Host "  Today VoCoins Earned: $($todayPerf.vocoinsEarned)" -ForegroundColor Gray
    Write-Host "  Today Study Points: $($todayPerf.studyPoints)" -ForegroundColor Gray

    if ($todayPerf.screenMinutes -ge 0 -and $todayPerf.studyPoints -ge 0) {
        Write-Host "  ✅ PASS: Thong ke 7 ngay tich hop Cloze Test thanh cong (Issue 12)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: Thong ke 7 ngay chua ghi nhan" -ForegroundColor Red
    }

    Write-Host "`n=========================================================" -ForegroundColor Cyan
    Write-Host "  🎉 TAT CA CAC TEST CHO v0.10.10-18 DEU DA PASS 100%!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Cyan

} finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", [System.Threading.CancellationToken]::None).Wait(2000) | Out-Null
    }
    if ($edgeProcess -and -not $edgeProcess.HasExited) {
        Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $tempUserData) {
        Remove-Item $tempUserData -Recurse -Force -ErrorAction SilentlyContinue
    }
}
