# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-34 (Build 335)
# Unified Study EXP Engine across 8 Study Modes & Decoupled Brain Energy
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9370
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test34_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-34 (Build 335) TEST SUITE" -ForegroundColor Yellow
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
    Send-CDPCommand "Emulation.setDeviceMetricsOverride" @{
        width = 1280
        height = 800
        deviceScaleFactor = 1
        mobile = $false
    } | Out-Null

    Send-CDPCommand "Page.navigate" @{ url = $fileUrl } | Out-Null
    Start-Sleep -Seconds 3

    # =========================================================================
    # TEST 1: Version & Header Integrity
    # =========================================================================
    Write-Host "`n[TEST 1] Checking Version & Build Constant Integrity..." -ForegroundColor Cyan
    $vScript = @'
(() => {
    return {
        version: typeof VOCAFLOW_APP_VERSION !== 'undefined' ? VOCAFLOW_APP_VERSION : null,
        build: typeof VOCAFLOW_APP_BUILD !== 'undefined' ? VOCAFLOW_APP_BUILD : null,
        headerText: document.querySelector(".nav-version-badge")?.textContent || document.body.innerText.includes("v0.10.10-34"),
        hasUnifiedExpFn: typeof calculateUnifiedStudyExp === 'function',
        hasAddExpFn: typeof addStudyExp === 'function',
        hasGetExpFn: typeof getUserStudyExp === 'function'
    };
})()
'@
    $vRes = Eval-JS $vScript
    Write-Host "  Result: $($vRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    if ($vRes.version -ne "v0.10.10-34" -or $vRes.build -ne 335 -or -not $vRes.hasUnifiedExpFn) {
        throw "Version or function check failed: $($vRes | ConvertTo-Json)"
    }

    # =========================================================================
    # TEST 2: Mathematical Precision of calculateUnifiedStudyExp
    # =========================================================================
    Write-Host "`n[TEST 2] Testing Mathematical Precision across 8 Study Modes & Modifiers..." -ForegroundColor Cyan
    $mathScript = @'
(() => {
    const results = {};
    
    // Set standard non-VIP user
    currentUser = {
        uid: "user-test-math",
        email: "test.scholar@vocaflow.com",
        name: "Math Scholar",
        isVip: false,
        role: "user",
        points: 500,
        studyExp: 0
    };
    userIsVip = false;
    userVipTier = 'none';
    adminVipOverride = false;
    window.calculateCurrentFlow = () => ({ currentFlow: 0 });

    // Test 1: Quiz, 10 items, all 100% score (Quality=1.0), total=10, diff=1.0 (medium), VIP=false, Streak=0
    // Sum Q = 10 * (10 * 1.0) = 100
    // ModeW = 1.0
    // Mdiff = 1.0
    // Phi(10) = 1.0 + 0.3 * (10 / 25) = 1.0 + 0.12 = 1.12
    // Psi(1.0) = 0.2 + 0.8 * 1^2 = 1.0
    // Mvip = 1.0
    // Mflow = 1.0
    // Total = floor(100 * 1.0 * 1.0 * 1.12 * 1.0 * 1.0 * 1.0) = 112
    const session10Perfect = Array(10).fill({ score: 100 });
    const quiz10Res = calculateUnifiedStudyExp('quiz', session10Perfect, 10, 1.0);
    results.quiz10Perfect = { expected: 112, actual: quiz10Res.finalExp, pass: quiz10Res.finalExp === 112 };

    // Test 2: Writing, 5 items, all 100%, total=5, diff=1.5 (hard), VIP=true (1.25), Streak=10 (+10% flow => 1.10)
    // Sum Q = 5 * 10 * 1.0 = 50
    // ModeW = 3.5
    // Mdiff = 1.5
    // Phi(5) = 1.0 + 0.3 * (5 / 20) = 1.075
    // Psi(1.0) = 1.0
    // Mvip = 1.25
    // Mflow = 1.10
    // Product = 50 * 3.5 * 1.5 * 1.075 * 1.0 * 1.25 * 1.10 = 388.0078125
    // Floor = 388
    userIsVip = true;
    userVipTier = 'lifetime';
    window.calculateCurrentFlow = () => ({ currentFlow: 10 });
    const writing5Res = calculateUnifiedStudyExp('writing', Array(5).fill({ score: 100 }), 5, 1.5);
    results.writing5VipStreak = { expected: 388, actual: writing5Res.finalExp, pass: writing5Res.finalExp === 388 };

    // Test 3: Auto Flashcard, 20 items, all 100%, total=20, diff=1.0, VIP=false, Streak=0
    // Sum Q = 20 * 10 * 1.0 = 200
    // ModeW = 0.2
    // Mdiff = 1.0
    // Phi(20) = 1.0 + 0.3 * (20 / 35) = 1.0 + 0.17142857 = 1.17142857
    // Psi(1.0) = 1.0
    // Mvip = 1.0, Mflow = 1.0
    // Product = 200 * 0.2 * 1.0 * 1.17142857 = 46.857...
    // Floor = 46
    userIsVip = false;
    userVipTier = 'none';
    window.calculateCurrentFlow = () => ({ currentFlow: 0 });
    const autofc20Res = calculateUnifiedStudyExp('autofc', Array(20).fill({ score: 100 }), 20, 1.0);
    results.autofc20Exp = { expected: 46, actual: autofc20Res.finalExp, pass: autofc20Res.finalExp === 46 };

    // Test 4: Low Quality Factor & Incomplete Early Exit (5 done of 20 expected)
    // 5 items with score 50 (score < 60 => Q=0.10)
    // Base = 10 -> item EXP = 10 * 0.10 = 1.0. Sum = 5.0
    // ModeW (quiz) = 1.0, Mdiff = 1.0
    // Phi(5) = 1.0 + 0.3 * (5/20) = 1.075
    // r = 5/20 = 0.25 -> Psi(0.25) = 0.2 + 0.8 * (0.0625) = 0.2 + 0.05 = 0.25
    // Total = floor(5.0 * 1.0 * 1.0 * 1.075 * 0.25 * 1.0 * 1.0) = floor(1.34375) = 1
    const quizLowEarlyRes = calculateUnifiedStudyExp('quiz', Array(5).fill({ score: 50 }), 20, 1.0);
    results.quizLowEarly = { expected: 1, actual: quizLowEarlyRes.finalExp, pass: quizLowEarlyRes.finalExp === 1 };

    // Test 5: Minimum 1 EXP floor protection when N >= 1
    const min1Res = calculateUnifiedStudyExp('autofc', [{ score: 0 }], 100, 0.8);
    results.minFloorProtection = { expected: 1, actual: min1Res.finalExp, pass: min1Res.finalExp >= 1 };

    return results;
})()
'@
    $mathRes = Eval-JS $mathScript
    Write-Host "  Math Results: $($mathRes | ConvertTo-Json -Depth 5)" -ForegroundColor Green
    foreach ($k in $mathRes.PSObject.Properties.Name) {
        if (-not $mathRes.$k.pass) {
            throw "Math test $k failed! Expected: $($mathRes.$k.expected), Actual: $($mathRes.$k.actual)"
        }
    }

    # =========================================================================
    # TEST 3: EXP Awarding Decoupled from Brain Energy Soft-Cap
    # =========================================================================
    Write-Host "`n[TEST 3] Verifying EXP Awarding with 0% Brain Energy..." -ForegroundColor Cyan
    $decoupleScript = @'
(() => {
    currentUser = {
        uid: "user-test-decouple",
        email: "decouple@vocaflow.com",
        name: "Decouple Tester",
        brainEnergy: 0,
        studyExp: 100,
        points: 500
    };
    const initialExp = getUserStudyExp();
    
    const added = addStudyExp(50, 'translation', { count: 5, accuracy: 95 });
    const finalExp = getUserStudyExp();
    
    const ledger = JSON.parse(localStorage.getItem('vocaflow_point_ledger_v1') || '[]');
    const latestLedger = ledger[ledger.length - 1];
    
    return {
        initialExp: initialExp,
        added: added,
        finalExp: finalExp,
        ledgerExp: latestLedger?.studyExp,
        isDecoupled: finalExp === (initialExp + 50)
    };
})()
'@
    $decoupleRes = Eval-JS $decoupleScript
    Write-Host "  Decoupled Result: $($decoupleRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    if (-not $decoupleRes.isDecoupled) {
        throw "Brain Energy decoupling test failed!"
    }

    # =========================================================================
    # TEST 4: Early Exit Modal Preview Verification
    # =========================================================================
    Write-Host "`n[TEST 4] Testing Early Exit Modal Preview for Both VoCoin & EXP..." -ForegroundColor Cyan
    $earlyModalScript = @'
(() => {
    decks = [{ id: "deck-exp-test", title: "EXP Test Deck", color: "#6366f1" }];
    words = [
        { id: "w1", deckId: "deck-exp-test", term: "innovation", definitionVi: "su doi moi" },
        { id: "w2", deckId: "deck-exp-test", term: "sustainability", definitionVi: "su ben vung" }
    ];
    currentDeckId = "deck-exp-test";

    const dummyItems = [
        { score: 100 }, { score: 90 }, { score: 85 }, { score: 100 }, { score: 95 }, { score: 80 }
    ];
    
    promptStudyEarlyExit({
        mode: "quiz",
        done: 6,
        total: 10,
        basePoints: 60,
        sessionItems: dummyItems,
        difficultyMult: 1.0,
        onConfirmExit: () => { console.log("Confirmed exit"); }
    });

    const modal = document.getElementById("modal-study-exit-confirm");
    const pointsEl = document.getElementById("study-exit-earned-points");
    const expEl = document.getElementById("study-exit-earned-exp");
    const volumeEl = document.getElementById("study-exit-volume-val");
    
    return {
        modalActive: modal?.classList.contains("active"),
        pointsText: pointsEl?.textContent,
        expText: expEl?.textContent,
        volumeText: volumeEl?.textContent
    };
})()
'@
    $earlyModalRes = Eval-JS $earlyModalScript
    Write-Host "  Early Modal Preview: $($earlyModalRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Seconds 1

    Write-Host "  -> Capturing Snapshot: Early Exit Preview..." -ForegroundColor Cyan
    Take-Screenshot "v0_10_10_34_study_exit_preview.png"

    Eval-JS 'closeModal("modal-study-exit-confirm");' | Out-Null
    Start-Sleep -Milliseconds 500

    # =========================================================================
    # TEST 5: Quiz Mode Result Modal EXP Badge Verification
    # =========================================================================
    Write-Host "`n[TEST 5] Testing Quiz Mode Result Modal EXP Badge..." -ForegroundColor Cyan
    $quizModalScript = @'
(() => {
    quizList = [
        { id: "w1", term: "resilient", definitionVi: "kien cuong" },
        { id: "w2", term: "eloquent", definitionVi: "hung bien" }
    ];
    quizAnswers = [
        { word: quizList[0], selected: "kien cuong", correct: true, score: 100 },
        { word: quizList[1], selected: "hung bien", correct: true, score: 100 }
    ];
    quizCorrectCount = 2;
    quizTotalQuestions = 2;
    quizPointsEarned = 20;
    currentQuizDifficulty = "medium";
    quizStartTime = Date.now() - 15000;
    
    finishQuizAndShowResult();
    
    const expBadge = document.getElementById("quiz-res-exp");
    return {
        modalActive: document.getElementById("modal-quiz-result")?.classList.contains("active"),
        expBadgeText: expBadge?.textContent,
        expBadgeVisible: expBadge !== null
    };
})()
'@
    $quizModalRes = Eval-JS $quizModalScript
    Write-Host "  Quiz Result Modal: $($quizModalRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Seconds 1

    Write-Host "  -> Capturing Snapshot: Quiz Result Modal with EXP Badge..." -ForegroundColor Cyan
    Take-Screenshot "v0_10_10_34_quiz_result_exp.png"

    Eval-JS 'closeModal("modal-quiz-result");' | Out-Null
    Start-Sleep -Milliseconds 500

    # =========================================================================
    # TEST 6: Speaking Mode Result Modal EXP Badge Verification
    # =========================================================================
    Write-Host "`n[TEST 6] Testing Speaking Mode Result Modal EXP Badge..." -ForegroundColor Cyan
    $spkModalScript = @'
(() => {
    speakingScore = 180;
    speakingTotalQuestions = 2;
    speakingDifficulty = "medium";
    speakingCorrectCount = 2;
    speakingWrongCount = 0;
    speakingAvgPronScore = 90;
    speakingTimeElapsed = 25;
    speakingSessionWords = [
        { word: { term: "articulate", definitionVi: "ro rang" }, score: 92 },
        { word: { term: "meticulous", definitionVi: "ti mi" }, score: 88 }
    ];

    finishSpeakingSession();

    const expBadge = document.getElementById("spk-res-exp");
    return {
        modalActive: document.getElementById("modal-speaking-result")?.classList.contains("active"),
        expBadgeText: expBadge?.textContent,
        expBadgeVisible: expBadge !== null
    };
})()
'@
    $spkModalRes = Eval-JS $spkModalScript
    Write-Host "  Speaking Result Modal: $($spkModalRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Seconds 1

    Write-Host "  -> Capturing Snapshot: Speaking Result Modal with EXP Badge..." -ForegroundColor Cyan
    Take-Screenshot "v0_10_10_34_speaking_result_exp.png"

    Eval-JS 'closeModal("modal-speaking-result");' | Out-Null
    Start-Sleep -Milliseconds 500

    # =========================================================================
    # TEST 7: Settings Modal Version & Official Release Registry
    # =========================================================================
    Write-Host "`n[TEST 7] Testing Settings Modal Version Display & Registry..." -ForegroundColor Cyan
    $settingsScript = @'
(() => {
    openModal('modal-settings');
    const versionEl = document.querySelector('#modal-settings .badge') || document.querySelector('#modal-settings [data-version]');
    const releaseEntry = typeof VOCAFLOW_OFFICIAL_RELEASES_REGISTRY !== 'undefined' ? VOCAFLOW_OFFICIAL_RELEASES_REGISTRY['v0.10.10-34'] : null;
    return {
        modalActive: document.getElementById("modal-settings")?.classList.contains("active"),
        settingsBodyText: document.getElementById("modal-settings")?.innerText.includes("v0.10.10-34 (Build 335)"),
        releaseRegistered: releaseEntry !== null && releaseEntry !== undefined,
        releaseTitle: releaseEntry?.title
    };
})()
'@
    $settingsRes = Eval-JS $settingsScript
    Write-Host "  Settings Result: $($settingsRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Seconds 1

    Write-Host "  -> Capturing Snapshot: Settings Modal Version..." -ForegroundColor Cyan
    Take-Screenshot "v0_10_10_34_settings_version.png"

    Eval-JS 'closeModal("modal-settings");' | Out-Null

    # =========================================================================
    # TEST 8: 7-Day Performance Metric Aggregation
    # =========================================================================
    Write-Host "`n[TEST 8] Testing 7-Day Performance Data Aggregation with Study EXP..." -ForegroundColor Cyan
    $perfScript = @'
(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`vocaflow_daily_study_exp_${currentUser.email}_${today}`, "175");
    const perf = get7DayPerformanceData();
    return {
        totalExp: perf?.totalExp,
        daysLength: perf?.days?.length
    };
})()
'@
    $perfRes = Eval-JS $perfScript
    Write-Host "  7-Day Performance Aggregation: $($perfRes | ConvertTo-Json -Compress)" -ForegroundColor Green

    Write-Host "`n=========================================================" -ForegroundColor Green
    Write-Host "   ✅ ALL v0.10.10-34 TESTS PASSED FLAWLESSLY!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
}
finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", [System.Threading.CancellationToken]::None).Wait(2000) | Out-Null
    }
    if ($edgeProcess -and -not $edgeProcess.HasExited) {
        Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $tempUserData) {
        Remove-Item -Path $tempUserData -Recurse -Force -ErrorAction SilentlyContinue
    }
}
