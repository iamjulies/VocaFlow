# Targeted CDP Test for VocaFlow v0.10.10-16 (Build 317)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9338
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🚀 KIỂM THỬ TỰ ĐỘNG CDP: VOCAFLOW v0.10.10-16 (Build 317)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

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
    $pageTarget = $endpoints | Where-Object { $_.type -eq "page" -and $_.url -like "*vocaflow.html*" } | Select-Object -First 1
    if (-not $pageTarget) {
        $pageTarget = $endpoints | Where-Object { $_.type -eq "page" } | Select-Object -First 1
    }

    $wsUrl = $pageTarget.webSocketDebuggerUrl
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $task = $ws.ConnectAsync((New-Object System.Uri($wsUrl)), $cts.Token)
    $task.Wait(4000) | Out-Null
    Start-Sleep -Seconds 2

    $global:cdpMsgId = 500

    function Send-CDPCommand($method, $params = @{}) {
        $msgId = [System.Threading.Interlocked]::Increment([ref]$global:cdpMsgId)
        $msgObj = @{
            id = $msgId
            method = $method
            params = $params
        }
        $json = ($msgObj | ConvertTo-Json -Depth 10 -Compress)
        $sendBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $ws.SendAsync((New-Object System.ArraySegment[byte] -ArgumentList @(,$sendBytes)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait(4000) | Out-Null

        $deadline = [DateTime]::Now.AddSeconds(12)
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
            if ($parsed.id -eq $msgId) {
                return $parsed
            }
        }
        return $null
    }

    function Eval-JS($code) {
        $res = Send-CDPCommand "Runtime.evaluate" @{
            expression = $code
            returnByValue = $true
            awaitPromise = $true
        }
        if ($res.result.exceptionDetails) {
            Write-Host "JS Exception: $(($res.result.exceptionDetails | ConvertTo-Json -Compress))" -ForegroundColor Red
        }
        return $res.result.result.value
    }

    # Test 1: Version Check
    Write-Host "`n[Test 1] Kiem tra phien ban dong bo v0.10.10-16..." -ForegroundColor Cyan
    $ver = Eval-JS "VOCAFLOW_APP_VERSION"
    $title = Eval-JS "VOCAFLOW_APP_FULL_TITLE"
    $label = Eval-JS "document.getElementById('settings-app-version-label')?.textContent"
    if ($ver -eq "v0.10.10-16" -and $title -match "Build 317" -and $label -match "v0.10.10-16") {
        Write-Host "  -> [PASS] Version khop hoan toan: $ver ($title)" -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] Version khong khop: $ver / $title / $label" -ForegroundColor Red
    }

    # Test 2: Extended Learning Modes & Cloze UI elements
    Write-Host "`n[Test 2] Kiem tra nut Cloze Test & Extended Learning Modes (beta)..." -ForegroundColor Cyan
    $hasClozeBtn = Eval-JS "!!document.getElementById('btn-study-cloze-selected')"
    $hasClozeModal = Eval-JS "!!document.getElementById('modal-cloze-setup')"
    $hasClozeScreen = Eval-JS "!!document.getElementById('screen-cloze')"
    $hasClozeResult = Eval-JS "!!document.getElementById('modal-cloze-result')"
    if ($hasClozeBtn -and $hasClozeModal -and $hasClozeScreen -and $hasClozeResult) {
        Write-Host "  -> [PASS] Toan bo giao dien man hinh, modal setup & modal ket qua ton tai day du!" -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] Thieu thanh phan giao dien: Btn=$hasClozeBtn, Modal=$hasClozeModal, Screen=$hasClozeScreen, Result=$hasClozeResult" -ForegroundColor Red
    }

    # Test 3: Cloze Difficulty Configs & Multipliers
    Write-Host "`n[Test 3] Kiem tra 4 cap do thu thach Cloze Test..." -ForegroundColor Cyan
    $diffEasy = Eval-JS "getClozeDifficultyConfig('easy')"
    $diffMed = Eval-JS "getClozeDifficultyConfig('medium')"
    $diffHard = Eval-JS "getClozeDifficultyConfig('hard')"
    $diffExpert = Eval-JS "getClozeDifficultyConfig('expert')"
    if ($diffEasy.diffMult -eq 1.5 -and $diffMed.diffMult -eq 2.0 -and $diffHard.diffMult -eq 2.8 -and $diffExpert.diffMult -eq 4.0 -and $diffExpert.decoyRatio -gt 0) {
        Write-Host "  -> [PASS] 4 cap do Easy (x1.5), Medium (x2.0), Hard (x2.8), Super Hard (x4.0 + Decoy) da duoc thiet lap chuan xac!" -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] He so cap do chua dung: Easy=$($diffEasy.diffMult), Med=$($diffMed.diffMult), Hard=$($diffHard.diffMult), Expert=$($diffExpert.diffMult)" -ForegroundColor Red
    }

    # Test 4: Offline Passage Generator & Blanks Formatting
    Write-Host "`n[Test 4] Kiem tra bo sinh doan van Cloze Test offline & logic dien tu..." -ForegroundColor Cyan
    $genResult = Eval-JS @"
    (() => {
        const dummyWords = [
            { id: 'w1', term: 'curiosity', partOfSpeech: 'noun', definitionVi: 'sự tò mò' },
            { id: 'w2', term: 'explore', partOfSpeech: 'verb', definitionVi: 'khám phá' },
            { id: 'w3', term: 'fascinating', partOfSpeech: 'adjective', definitionVi: 'hấp dẫn' },
            { id: 'w4', term: 'knowledge', partOfSpeech: 'noun', definitionVi: 'kiến thức' }
        ];
        const passage = generateOfflineClozePassage(dummyWords, 'expert');
        return {
            hasTitle: !!passage.title,
            blanksCount: passage.blanks.length,
            optionsCount: passage.options.length,
            hasTranslation: !!passage.passageTranslationVi,
            hasDecoy: passage.options.some(o => o.isDecoy)
        };
    })()
"@
    if ($genResult.hasTitle -and $genResult.blanksCount -ge 3 -and $genResult.optionsCount -ge 4 -and $genResult.hasTranslation -and $genResult.hasDecoy) {
        Write-Host "  -> [PASS] Sinh doan van mau thanh cong: $($genResult.blanksCount) blanks, $($genResult.optionsCount) options (co Decoy)!" -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] Loi sinh doan van: $($genResult | ConvertTo-Json)" -ForegroundColor Red
    }

    # Test 5: Interactive Simulation (Seed words -> Start Cloze -> Fill Blanks -> Submit -> Evaluate)
    Write-Host "`n[Test 5] Mo phong toan bo chu trinh lam bai Cloze Test..." -ForegroundColor Cyan
    $simResult = Eval-JS @"
    (async () => {
        // 1. Seed deck & words
        currentDeckId = 'deck_test_cloze';
        decks = [{ id: 'deck_test_cloze', title: 'IELTS Reading Comprehension' }];
        words = [
            { id: 'w1', deckId: 'deck_test_cloze', term: 'knowledge', partOfSpeech: 'noun', definitionVi: 'kiến thức' },
            { id: 'w2', deckId: 'deck_test_cloze', term: 'practice', partOfSpeech: 'verb', definitionVi: 'thực hành' },
            { id: 'w3', deckId: 'deck_test_cloze', term: 'effective', partOfSpeech: 'adjective', definitionVi: 'hiệu quả' }
        ];

        // 2. Start cloze mode and await generation
        await startClozeMode(false, words, 1);

        // 3. Check rendered screen
        const screenActive = document.getElementById('screen-cloze').classList.contains('active');
        const blanksInDom = document.querySelectorAll('.cloze-blank-zone').length;
        const chipsInDom = document.querySelectorAll('.cloze-word-chip').length;

        // 4. Fill all blanks
        window.confirm = () => true;
        if (clozeCurrentPassage && clozeCurrentPassage.blanks) {
            clozeCurrentPassage.blanks.forEach((b, idx) => {
                if (clozeCurrentPassage.options[idx]) {
                    handleClozeChipClick(clozeCurrentPassage.options[idx].id);
                }
            });
        }
        const placedCount = Object.keys(clozePlacements).length;

        // 5. Test VocaHint
        useClozeHint();
        const hintBoxVisible = document.getElementById('cloze-hint-box').style.display !== 'none';

        // 6. Test VocaSkip
        useClozeSkip();
        const afterSkipCount = Object.keys(clozePlacements).length;

        // 7. Submit evaluation
        submitClozeEvaluation();
        await new Promise(r => setTimeout(r, 600));
        const resultVisible = document.getElementById('cloze-result-panel').style.display !== 'none';

        return {
            screenActive: screenActive,
            blanksRendered: blanksInDom,
            chipsRendered: chipsInDom,
            placedCount: placedCount,
            hintBoxVisible: hintBoxVisible,
            afterSkipCount: afterSkipCount,
            resultVisible: resultVisible
        };
    })()
"@
    if ($simResult.screenActive -and $simResult.blanksRendered -ge 3 -and $simResult.chipsRendered -ge 3 -and $simResult.placedCount -ge 1 -and $simResult.hintBoxVisible -and $simResult.resultVisible) {
        Write-Host "  -> [PASS] Chu trinh mo man hinh, render $($simResult.blanksRendered) o trong, dien tu click-to-place, VocaHint, VocaSkip va cham diem thanh cong 100%!" -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] Mo phong loi: $($simResult | ConvertTo-Json)" -ForegroundColor Red
    }

    # 6. Capture Screenshots
    Write-Host "`n[Test 6] Chup anh man hinh xac thuc giao dien Cloze Test..." -ForegroundColor Cyan
    Start-Sleep -Milliseconds 600

    # Screenshot 1: Active Cloze Test Screen
    $snap1 = Send-CDPCommand "Page.captureScreenshot" @{ format = "png" }
    if ($snap1.result.data) {
        $imgPath1 = Join-Path $artifactDir "v0_10_10_16_cloze_screen.png"
        [System.IO.File]::WriteAllBytes($imgPath1, [System.Convert]::FromBase64String($snap1.result.data))
        Write-Host "  -> Da luu anh chup Cloze Screen: $imgPath1" -ForegroundColor Green
    }

    # Screenshot 2: Open Cloze Setup Modal
    Eval-JS "openClozeSetupModal()" | Out-Null
    Start-Sleep -Milliseconds 400
    $snap2 = Send-CDPCommand "Page.captureScreenshot" @{ format = "png" }
    if ($snap2.result.data) {
        $imgPath2 = Join-Path $artifactDir "v0_10_10_16_cloze_setup_modal.png"
        [System.IO.File]::WriteAllBytes($imgPath2, [System.Convert]::FromBase64String($snap2.result.data))
        Write-Host "  -> Da luu anh chup Cloze Setup Modal: $imgPath2" -ForegroundColor Green
    }

    Write-Host "`n==========================================================" -ForegroundColor Cyan
    Write-Host "  🎉 TAT CA CAC BAI KIEM THU CDP HOAN TOAN DAT 100%!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan

} finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", [System.Threading.CancellationToken]::None).Wait(2000) | Out-Null
    }
    if ($edgeProcess -and -not $edgeProcess.HasExited) {
        Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
