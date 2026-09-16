# Snapshot of Cloze Test Result Panel
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9345
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_snap_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

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
    $pageTarget = $endpoints | Where-Object { $_.type -eq "page" } | Select-Object -First 1
    $wsUrl = $pageTarget.webSocketDebuggerUrl
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $ws.ConnectAsync((New-Object System.Uri($wsUrl)), $cts.Token).Wait(4000) | Out-Null
    Start-Sleep -Seconds 2

    $global:cdpMsgId = 700

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

    function Eval-JS($code) {
        $res = Send-CDPCommand "Runtime.evaluate" @{ expression = $code; returnByValue = $true; awaitPromise = $true }
        return $res.result.result.value
    }

    Eval-JS @"
    (async () => {
        currentDeckId = 'deck_test_cloze';
        decks = [{ id: 'deck_test_cloze', title: 'IELTS Reading Comprehension' }];
        words = [
            { id: 'w1', deckId: 'deck_test_cloze', term: 'knowledge', partOfSpeech: 'noun', definitionVi: 'kiến thức' },
            { id: 'w2', deckId: 'deck_test_cloze', term: 'practice', partOfSpeech: 'verb', definitionVi: 'thực hành' },
            { id: 'w3', deckId: 'deck_test_cloze', term: 'effective', partOfSpeech: 'adjective', definitionVi: 'hiệu quả' }
        ];

        await startClozeMode(false, words, 1);
        window.confirm = () => true;

        if (clozeCurrentPassage && clozeCurrentPassage.blanks) {
            clozeCurrentPassage.blanks.forEach((b, idx) => {
                if (clozeCurrentPassage.options[idx]) {
                    handleClozeChipClick(clozeCurrentPassage.options[idx].id);
                }
            });
        }
        submitClozeEvaluation();
        await new Promise(r => setTimeout(r, 600));
        document.getElementById('cloze-result-panel').scrollIntoView({ block: 'start' });
    })()
"@ | Out-Null

    Start-Sleep -Milliseconds 600
    $snap = Send-CDPCommand "Page.captureScreenshot" @{ format = "png" }
    if ($snap.result.data) {
        $imgPath = Join-Path $artifactDir "v0_10_10_16_cloze_result_feedback.png"
        [System.IO.File]::WriteAllBytes($imgPath, [System.Convert]::FromBase64String($snap.result.data))
        Write-Host "Snapshot saved: $imgPath" -ForegroundColor Green
    }
} finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", [System.Threading.CancellationToken]::None).Wait(2000) | Out-Null
    }
    if ($edgeProcess -and -not $edgeProcess.HasExited) {
        Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
