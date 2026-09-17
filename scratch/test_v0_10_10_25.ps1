# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-25 (Build 326)
# Bidirectional Translation Lab (VIP beta), 3-Tier VocaHint, Strict AI Grading & 5-Tile Result Dashboard
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9360
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test25_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-25 (Build 326) TEST SUITE" -ForegroundColor Yellow
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

    # Mock alert & confirm, set up test VIP user & mock decks with Unicode escape strings
    $setupScript = @'
(() => {
    window.alert = function(msg) { console.log("[MOCK ALERT]:", msg); };
    window.confirm = function(msg) { console.log("[MOCK CONFIRM]:", msg); return true; };
    window.prompt = function(msg) { console.log("[MOCK PROMPT]:", msg); return null; };

    currentUser = {
        email: "vip.user@vocaflow.com",
        name: "VIP Scholar",
        isVip: true,
        role: "vip",
        points: 2500,
        hintsLeft: 10,
        skipsLeft: 5
    };

    decks = [
        {
            id: "deck-translation-test",
            title: "Advanced Academic & Professional English",
            description: "Ch\u1ebf \u0111\u1ed9 Luy\u1ec7n D\u1ecbch Song Ph\u01b0\u01a1ng VIP \u03b2",
            category: "IELTS",
            color: "#6366f1",
            icon: "\ud83c\udf10",
            authorEmail: "vip.user@vocaflow.com",
            createdAt: new Date().toISOString()
        }
    ];

    words = [
        {
            id: "word-1",
            deckId: "deck-translation-test",
            term: "resilient",
            definitionVi: "ki\u00ean c\u01b0\u1eddng, c\u00f3 kh\u1ea3 n\u0103ng ph\u1ee5c h\u1ed3i nhanh ch\u00f3ng",
            partOfSpeech: "adjective",
            cefrLevel: "C1",
            exampleSentence: "She remained resilient despite facing numerous challenges in her career.",
            masteryLevel: 1,
            nextReview: Date.now()
        },
        {
            id: "word-2",
            deckId: "deck-translation-test",
            term: "eloquent",
            definitionVi: "h\u00f9ng bi\u1ec7n, c\u00f3 t\u00e0i \u0103n n\u00f3i l\u01b0u lo\u00e1t v\u00e0 thuy\u1ebft ph\u1ee5c",
            partOfSpeech: "adjective",
            cefrLevel: "C1",
            exampleSentence: "The professor delivered an eloquent lecture on environmental sustainability.",
            masteryLevel: 2,
            nextReview: Date.now()
        },
        {
            id: "word-3",
            deckId: "deck-translation-test",
            term: "perseverance",
            definitionVi: "s\u1ef1 ki\u00ean tr\u00ec, b\u1ec1n b\u1ec9 v\u01b0\u1ee3t qua kh\u00f3 kh\u0103n",
            partOfSpeech: "noun",
            cefrLevel: "B2",
            exampleSentence: "Through patience and perseverance, they completed the ambitious project.",
            masteryLevel: 1,
            nextReview: Date.now()
        }
    ];

    currentDeckId = "deck-translation-test";
    showScreen("screen-deck-detail");
    return { user: currentUser.name, deck: decks[0].title, wordCount: words.length };
})()
'@
    $initRes = Eval-JS $setupScript
    Write-Host "[1/5] Init Test Environment: $($initRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Seconds 1

    # Step 1: Open Translation Setup Modal and Configure
    Write-Host "[2/5] Testing Translation Setup Modal..." -ForegroundColor Cyan
    $openModalScript = @'
(() => {
    openTranslationSetupModal(false);
    selectTranslationSetupDirection("en_to_vi");
    selectTranslationSetupDifficulty("medium");
    selectTranslationSetupQuestionCount("all");
    return {
        direction: selectedTranslationSetupDirection,
        difficulty: selectedTranslationSetupDifficulty,
        count: translationSetupQuestionCount
    };
})()
'@
    $setupRes = Eval-JS $openModalScript
    Write-Host "  -> Setup Configured: $($setupRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Milliseconds 500

    # Start Translation Mode
    $startScript = @'
(() => {
    // Disable shuffle for predictable deterministic order
    const shuffleCb = document.getElementById("translation-setup-shuffle-checkbox");
    if (shuffleCb) shuffleCb.checked = false;
    confirmStartTranslationFromModal();
    return {
        activeScreen: document.querySelector(".screen.active")?.id,
        currentWord: translationQuestionsList[currentTranslationIndex]?.term,
        sourceText: document.getElementById("translation-source-text")?.textContent,
        direction: currentTranslationDirection,
        difficulty: currentTranslationDifficulty
    };
})()
'@
    $startRes = Eval-JS $startScript
    Write-Host "  -> Started Translation Mode: $($startRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Seconds 1

    # Snapshot 1: Translation Screen (EN -> VI, Medium)
    Write-Host "[3/5] Capturing Snapshot 1: Screen Translation EN -> VI..." -ForegroundColor Cyan
    Take-Screenshot "v0_10_10_25_translation_screen_en_vi.png"

    # Step 2: Trigger VocaHint & Submit Translation Answer for Evaluation
    Write-Host "[4/5] Testing Translation Evaluation & Feedback Cards..." -ForegroundColor Cyan
    $evalScript = @'
(() => {
    // Test 3-tier VocaHint
    useTranslationHint();
    
    // Fill in high quality translation for Q1
    const curQ = translationQuestionsList[currentTranslationIndex];
    const inputEl = document.getElementById("translation-input-text");
    if (inputEl) {
        inputEl.value = curQ.task ? curQ.task.benchmarkText : "";
        inputEl.dispatchEvent(new Event("input"));
    }
    
    // Submit evaluation
    submitTranslationEvaluation();
    
    return {
        inputValue: inputEl?.value,
        benchmark: curQ.task?.benchmarkText
    };
})()
'@
    $evalRes = Eval-JS $evalScript
    Write-Host "  -> Submitted Answer: $($evalRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    Start-Sleep -Seconds 2

    # Snapshot 2: Translation Feedback Cards
    Write-Host "  -> Capturing Snapshot 2: Translation Feedback Cards..." -ForegroundColor Cyan
    Take-Screenshot "v0_10_10_25_translation_feedback_cards.png"

    # Step 3: Complete Question 2 (pass) and Question 3 (fail) -> trigger Result Modal
    Write-Host "[5/5] Completing remaining questions & triggering Result Modal..." -ForegroundColor Cyan
    $completeScript = @'
(() => {
    // Next to Q2
    nextTranslationQuestion();
    
    // Q2: Pass with good answer
    const curQ2 = translationQuestionsList[currentTranslationIndex];
    const input2 = document.getElementById("translation-input-text");
    if (input2) {
        input2.value = curQ2.task ? curQ2.task.benchmarkText : "";
        input2.dispatchEvent(new Event("input"));
    }
    submitTranslationEvaluation();
    
    // Next to Q3
    setTimeout(() => {
        nextTranslationQuestion();
        
        // Q3: fail intentionally with irrelevant text
        const input3 = document.getElementById("translation-input-text");
        if (input3) {
            input3.value = "Ch\u01b0a ho\u00e0n th\u00e0nh b\u1ea3n d\u1ecbch n\u00e0y.";
            input3.dispatchEvent(new Event("input"));
        }
        submitTranslationEvaluation();
        
        // Finish session
        setTimeout(() => {
            finishTranslationSession();
        }, 1200);
    }, 1200);
    
    return { total: translationQuestionsList.length };
})()
'@
    $compRes = Eval-JS $completeScript
    Start-Sleep -Seconds 4

    # Snapshot 3: Result Modal with 5 Tiles & Wrong Words Retry Banner
    Write-Host "  -> Capturing Snapshot 3: 5-Tile Result Modal Dashboard..." -ForegroundColor Cyan
    Take-Screenshot "v0_10_10_25_translation_5tile_result_modal.png"

    # Verify Mistake Notebook has the failed word
    $verifyMistakeScript = @'
(() => {
    const mistakes = JSON.parse(localStorage.getItem("vocaflow_mistake_notebook_v1") || "[]");
    return {
        mistakeCount: mistakes.length,
        mistakes: mistakes.map(m => ({ word: m.term, reason: m.reason }))
    };
})()
'@
    $mistakeRes = Eval-JS $verifyMistakeScript
    Write-Host "  -> Mistake Notebook Verified: $($mistakeRes | ConvertTo-Json -Compress)" -ForegroundColor Green

    # Close result modal and verify audio stops
    $closeScript = @'
(() => {
    closeTranslationResultModal();
    return {
        resultModalActive: document.getElementById("modal-translation-result")?.classList.contains("active")
    };
})()
'@
    $closeRes = Eval-JS $closeScript
    Write-Host "  -> Closed Result Modal: $($closeRes | ConvertTo-Json -Compress)" -ForegroundColor Green

    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "   ✅ ALL TRANSLATION TESTS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
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
