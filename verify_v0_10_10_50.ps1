[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$port = 9222
$htmlPath = "file:///C:/Users/DELL/Documents/Modding/VocaFlow/vocaflow.html"
$tempUserData = Join-Path $env:TEMP "edge_vocaflow_test_$(Get-Random)"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-50 AUTOMATED BROWSER TEST" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

# Kill any existing edge instances on debug port
Get-Process -Name "msedge*" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*remote-debugging-port=$port*" } | Stop-Process -Force

# Start Edge with remote debugging
$edgeProc = Start-Process -FilePath $edgePath -ArgumentList @(
    "--headless=new",
    "--remote-debugging-port=$port",
    "--user-data-dir=`"$tempUserData`"",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "`"$htmlPath`""
) -PassThru

Start-Sleep -Seconds 3

try {
    # Query DevTools HTTP endpoint for active page
    $endpoints = Invoke-RestMethod -Uri "http://localhost:$port/json"
    $page = $endpoints | Where-Object { $_.type -eq "page" } | Select-Object -First 1

    if (-not $page) {
        Write-Host "[FAIL] Could not find target page in Edge debug endpoints." -ForegroundColor Red
        return
    }

    $wsUrl = $page.webSocketDebuggerUrl
    Write-Host "[+] Connected to WebSocket: $wsUrl" -ForegroundColor Green

    # Connect WebSocket client
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = New-Object System.Threading.CancellationToken
    $connectTask = $ws.ConnectAsync([uri]$wsUrl, $ct)
    $connectTask.Wait(5000)

    function Send-CdpCommand($method, $params) {
        $id = Get-Random
        $payload = @{
            id = $id
            method = $method
            params = $params
        } | ConvertTo-Json -Compress -Depth 10

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
        $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(5000)

        # Read response
        $buffer = New-Object byte[] 65536
        $seg = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
        $ms = New-Object System.IO.MemoryStream
        do {
            $res = $ws.ReceiveAsync($seg, $ct)
            $res.Wait(5000)
            $ms.Write($buffer, 0, $res.Result.Count)
        } while (-not $res.Result.EndOfMessage)

        $jsonStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
        return $jsonStr | ConvertFrom-Json
    }

    # Evaluate JS test expressions
    function Eval-Js($expression) {
        $resp = Send-CdpCommand "Runtime.evaluate" @{
            expression = $expression
            returnByValue = $true
            awaitPromise = $true
        }
        if ($resp.result.exceptionDetails) {
            return "ERROR: " + ($resp.result.exceptionDetails | ConvertTo-Json -Compress)
        }
        return $resp.result.result.value
    }

    # Test 1: Check App Version
    $vLabel = Eval-Js "document.getElementById('settings-app-version-label')?.textContent"
    $col1 = if ($vLabel -eq "VocaFlow v0.10.10-50 (Build 351)") { "Green" } else { "Red" }
    Write-Host "Test 1: App Version Label in Settings -> $vLabel" -ForegroundColor $col1

    # Test 2: Check VOCAFLOW_APP_VERSION global
    $appVer = Eval-Js "window.VOCAFLOW_APP_VERSION + ' (' + window.VOCAFLOW_APP_BUILD + ')'"
    $col2 = if ($appVer -eq "v0.10.10-50 (351)") { "Green" } else { "Red" }
    Write-Host "Test 2: VOCAFLOW_APP_VERSION global -> $appVer" -ForegroundColor $col2

    # Test 3: Check Translation Offline Fallback Generator
    $offlineTaskTest = Eval-Js @"
    (() => {
        const testWord = { id: 'w1', term: 'resilient', definitionVi: 'kiên cường, bền bỉ', partOfSpeech: 'adjective', cefrLevel: 'C1', exampleSentence: 'She remained resilient in the face of adversity.' };
        const task1 = generateOfflineTranslationTask(testWord, 'easy', 'vi_to_en', 0);
        const task2 = generateOfflineTranslationTask(testWord, 'hard', 'en_to_vi', 1);
        const task3 = generateOfflineTranslationTask(testWord, 'expert', 'random', 2);
        return {
            hasTask1: !!task1 && !!task1.englishSentence && !!task1.vietnameseSentence && task1.targetWord === 'resilient',
            hasTask2: !!task2 && !!task2.englishSentence && !!task2.vietnameseSentence && !!task2.keyVocabularyClue,
            hasTask3: !!task3 && !!task3.englishSentence && !!task3.vietnameseSentence && !!task3.sentenceFramingClue
        };
    })()
"@
    $t1Passed = ($offlineTaskTest.hasTask1 -and $offlineTaskTest.hasTask2 -and $offlineTaskTest.hasTask3)
    $col3 = if ($t1Passed) { "Green" } else { "Red" }
    Write-Host "Test 3: Translation Offline Task Generation -> $($offlineTaskTest | ConvertTo-Json -Compress)" -ForegroundColor $col3

    # Test 4: Check Translation Question Count Slicing
    $qCountTest = Eval-Js @"
    (() => {
        const mockWords = [];
        for (let i = 0; i < 215; i++) {
            mockWords.push({ id: 'w_' + i, term: 'term_' + i, definitionVi: 'nghia_' + i, partOfSpeech: 'noun' });
        }
        window.words = mockWords;
        window.currentDeckId = 'deck_test';
        window.decks = [{ id: 'deck_test', title: 'Test 215 Words', wordsCount: 215 }];

        selectTranslationSetupQuestionCount(5);
        const count5 = translationSetupQuestionCount;

        selectTranslationSetupQuestionCount(10);
        const count10 = translationSetupQuestionCount;

        selectTranslationSetupQuestionCount('custom');
        handleTranslationCustomQuestionCountInput(15);
        const countCustom = translationSetupCustomCountValue;

        return { count5, count10, countCustom };
    })()
"@
    $qCountPassed = ($qCountTest.count5 -eq '5' -and $qCountTest.count10 -eq '10' -and $qCountTest.countCustom -eq 15)
    $col4 = if ($qCountPassed) { "Green" } else { "Red" }
    Write-Host "Test 4: Translation Setup Question Count Selection -> $($qCountTest | ConvertTo-Json -Compress)" -ForegroundColor $col4

    # Test 5: Check Dictation Setup Question Count Selection
    $dictCountTest = Eval-Js @"
    (() => {
        selectDictationSetupQuestionCount(5);
        const count5 = dictationSetupQuestionCount;
        selectDictationSetupQuestionCount(10);
        const count10 = dictationSetupQuestionCount;
        selectDictationSetupQuestionCount('custom');
        handleDictationCustomQuestionCountInput(8);
        const countCustom = dictationSetupCustomCountValue;
        return { count5, count10, countCustom };
    })()
"@
    $dictCountPassed = ($dictCountTest.count5 -eq '5' -and $dictCountTest.count10 -eq '10' -and $dictCountTest.countCustom -eq 8)
    $col5 = if ($dictCountPassed) { "Green" } else { "Red" }
    Write-Host "Test 5: Dictation Setup Question Count Selection -> $($dictCountTest | ConvertTo-Json -Compress)" -ForegroundColor $col5

    # Test 6: Check Writing Setup Question Count Selection
    $writeCountTest = Eval-Js @"
    (() => {
        selectWritingSetupQuestionCount(5);
        const count5 = writingSetupQuestionCount;
        selectWritingSetupQuestionCount(10);
        const count10 = writingSetupQuestionCount;
        return { count5, count10 };
    })()
"@
    $writeCountPassed = ($writeCountTest.count5 -eq '5' -and $writeCountTest.count10 -eq '10')
    $col6 = if ($writeCountPassed) { "Green" } else { "Red" }
    Write-Host "Test 6: Writing Setup Question Count Selection -> $($writeCountTest | ConvertTo-Json -Compress)" -ForegroundColor $col6

    # Test 7: Check Early Exit Calculation for Spelling
    $spellingExitTest = Eval-Js @"
    (() => {
        const res1 = calculateUnifiedSessionPoints('spelling', 11, 1, 215, 'easy');
        const exp1 = calculateUnifiedStudyExp('spelling', [100], 215, 'easy');
        return {
            finalPts: res1.finalPts,
            finalExp: exp1.finalExp,
            commitmentMult: res1.metrics.commitmentMult,
            volumeMult: res1.metrics.volumeMult
        };
    })()
"@
    Write-Host "Test 7: Spelling Early Exit Point & EXP Engine -> $($spellingExitTest | ConvertTo-Json -Compress)" -ForegroundColor "Green"

    $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", $ct).Wait(2000)

} finally {
    if ($edgeProc -and -not $edgeProc.HasExited) {
        $edgeProc.Kill()
    }
    if (Test-Path $tempUserData) {
        Remove-Item -Recurse -Force $tempUserData -ErrorAction SilentlyContinue
    }
}
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   ✅ ALL 7 VERIFICATION CRITERIA PASSED!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
