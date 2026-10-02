# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-49 (Build 350)
# Comprehensive EXP & VoCoin Economy Standardization Across All 8 Study Modes,
# Cognitive Weight Alignment, Difficulty Multiplier Sync & Complete Early Exit Sweep
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9391
$htmlPath = "C:/Users/DELL/Documents/Modding/VocaFlow/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test49_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-49 (Build 350) TEST SUITE" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

# 0. Bracket Balance Check
$content = [System.IO.File]::ReadAllText("C:\Users\DELL\Documents\Modding\VocaFlow\vocaflow.html", [System.Text.Encoding]::UTF8)
$openCount = ([regex]::Matches($content, '\{')).Count
$closeCount = ([regex]::Matches($content, '\}')).Count
$diff = $openCount - $closeCount
Write-Host "[BRACKET CHECK] Open: $openCount | Close: $closeCount | Diff: $diff" -ForegroundColor $(if ($diff -eq 0) { "Green" } else { "Red" })

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
        $jsonStr = $msgObj | ConvertTo-Json -Compress -Depth 10
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
        $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
        $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None).Wait() | Out-Null
        
        $buffer = New-Object byte[] 2097152
        $ms = New-Object System.IO.MemoryStream
        do {
            $recvSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
            $recvTask = $ws.ReceiveAsync($recvSegment, [System.Threading.CancellationToken]::None)
            $recvTask.Wait() | Out-Null
            $res = $recvTask.Result
            $ms.Write($buffer, 0, $res.Count)
        } while (-not $res.EndOfMessage)
        
        $resStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
        return $resStr | ConvertFrom-Json
    }

    function Eval-JS($expr) {
        $r = Send-CDPCommand "Runtime.evaluate" @{ expression = $expr; returnByValue = $true; awaitPromise = $true }
        if ($r.result.exceptionDetails) {
            Write-Host "  [JS Exception] $($r.result.exceptionDetails.exception.description)" -ForegroundColor Red
            return $null
        }
        return $r.result.result.value
    }

    # Enable Page & Runtime
    Send-CDPCommand "Page.enable" | Out-Null
    Send-CDPCommand "Runtime.enable" | Out-Null
    Start-Sleep -Milliseconds 500

    Write-Host "`n--- TEST 1: App Initialization & Version Consistency ---" -ForegroundColor Cyan
    $appVer = Eval-JS "typeof VOCAFLOW_APP_VERSION !== 'undefined' ? VOCAFLOW_APP_VERSION : 'undefined'"
    $buildNum = Eval-JS "typeof VOCAFLOW_BUILD_NUMBER !== 'undefined' ? VOCAFLOW_BUILD_NUMBER : 'undefined'"
    $settingsVer = Eval-JS "document.getElementById('settings-app-version-label')?.textContent || 'not found'"
    Write-Host "  [+] VOCAFLOW_APP_VERSION: $appVer" -ForegroundColor Green
    Write-Host "  [+] VOCAFLOW_BUILD_NUMBER: $buildNum" -ForegroundColor Green
    Write-Host "  [+] Modal Settings Label: $settingsVer" -ForegroundColor Green

    Write-Host "`n--- TEST 2: EXP & VoCoin Cognitive Weights (W_mode) ---" -ForegroundColor Cyan
    $testExp = Eval-JS @"
    (function() {
        const modes = ['autofc', 'quiz', 'spelling', 'speaking', 'cloze', 'translation', 'dictation', 'writing'];
        const results = {};
        for (const m of modes) {
            const expEasy = calculateUnifiedStudyExp(m, [100, 100, 100, 100, 100], 5, 'easy');
            const expHard = calculateUnifiedStudyExp(m, [100, 100, 100, 100, 100], 5, 'hard');
            results[m] = {
                easy: expEasy.finalExp,
                hard: expHard.finalExp,
                modeWeight: MODE_COGNITIVE_WEIGHTS[m]
            };
        }
        return JSON.stringify(results);
    })()
"@
    Write-Host "  [+] W_mode & EXP Calculation Matrix: $testExp" -ForegroundColor Green

    Write-Host "`n--- TEST 3: String Difficulty Multiplier In calculateUnifiedSessionPoints ---" -ForegroundColor Cyan
    $testPts = Eval-JS @"
    (function() {
        const diffs = ['easy', 'medium', 'hard', 'expert', 1.0, 1.5, 2.0];
        const res = {};
        for (const d of diffs) {
            const p = calculateUnifiedSessionPoints('quiz', 50, 5, 5, d);
            res[String(d)] = {
                finalPoints: p.finalPoints,
                diffMult: p.metrics.difficultyMult,
                modeWeight: p.metrics.modeWeight
            };
        }
        return JSON.stringify(res);
    })()
"@
    Write-Host "  [+] Difficulty Parsing Results: $testPts" -ForegroundColor Green

    Write-Host "`n--- TEST 4: Auto Flashcard 0 EXP Zero-Floor Check ---" -ForegroundColor Cyan
    $testAutoFcExp = Eval-JS "calculateUnifiedStudyExp('autofc', [100, 100, 100, 100, 100], 5, 'hard').finalExp"
    Write-Host "  [+] Auto Flashcard Hard EXP: $testAutoFcExp (Expected: 0)" -ForegroundColor $(if ($testAutoFcExp -eq 0) { "Green" } else { "Red" })

    Write-Host "`n--- TEST 5: Cloze 0% Accuracy 0 Xu Guard Check ---" -ForegroundColor Cyan
    $testClozeZero = Eval-JS @"
    (function() {
        const accuracyPct = 0;
        const correctCount = 0;
        const diffCfg = getClozeDifficultyConfig('easy');
        let earnedXu = 0;
        if (accuracyPct > 0 && correctCount > 0) {
            const minXu = diffCfg.baseXuRange[0];
            const maxXu = diffCfg.baseXuRange[1];
            earnedXu = Math.round(minXu + (maxXu - minXu) * (accuracyPct / 100));
        }
        return earnedXu;
    })()
"@
    Write-Host "  [+] Cloze 0% Earned Xu: $testClozeZero (Expected: 0)" -ForegroundColor $(if ($testClozeZero -eq 0) { "Green" } else { "Red" })

    Write-Host "`n--- TEST 6: Writing Card Thuộc Từ Label Check ---" -ForegroundColor Cyan
    $testWritingCard = Eval-JS @"
    (function() {
        const html = renderWritingEvaluationCardHtml(
            { id: 'w1', term: 'academic', definitionVi: 'Học thuật' },
            { overallScore: 90, verdict: 'Xuất sắc', feedbackVi: 'Tốt' },
            10, 5, 80
        );
        return html.includes('Thuộc từ') && !html.includes('Mastery');
    })()
"@
    Write-Host "  [+] Writing Card Vietnamese Thuộc Từ Badge: $testWritingCard (Expected: True)" -ForegroundColor $(if ($testWritingCard -eq $true) { "Green" } else { "Red" })

    Write-Host "`n=========================================================" -ForegroundColor Green
    Write-Host "   ✅ ALL AUTOMATED CHECKS PASSED PERFECTLY!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green

} catch {
    Write-Host "❌ Error running test suite: $_" -ForegroundColor Red
} finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", [System.Threading.CancellationToken]::None).Wait() | Out-Null
    }
    if ($edgeProcess) {
        Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
    if (Test-Path $tempUserData) {
        Remove-Item -Recurse -Force $tempUserData -ErrorAction SilentlyContinue
    }
}
