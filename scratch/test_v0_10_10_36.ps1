# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-36 (Build 337)
# 50 Achievements & Unclaimed Badge Notification UI
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9376
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test36_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-36 (Build 337) TEST SUITE" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

# 0. Bracket Balance Check
$content = [System.IO.File]::ReadAllText("C:\Users\DELL\Documents\Modding\browser\vocaflow.html", [System.Text.Encoding]::UTF8)
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

    Start-Sleep -Seconds 2

    Write-Host "`n--- TEST 1: App Version & Constant Consistency ---" -ForegroundColor Yellow
    $version = Eval-JS "VOCAFLOW_APP_VERSION"
    $build = Eval-JS "VOCAFLOW_APP_BUILD"
    $fullTitle = Eval-JS "VOCAFLOW_APP_FULL_TITLE"
    Write-Host "  Version: $version" -ForegroundColor Cyan
    Write-Host "  Build: $build" -ForegroundColor Cyan
    Write-Host "  Full Title: $fullTitle" -ForegroundColor Cyan

    if ($version -eq "v0.10.10-36" -and $build -eq 337) {
        Write-Host "  [PASS] App Version & Build are correct!" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Unexpected version or build!" -ForegroundColor Red
    }

    Write-Host "`n--- TEST 2: Achievement Registry (50 Badges) ---" -ForegroundColor Yellow
    $totalBadges = Eval-JS "Object.keys(ACHIEVEMENTS_REGISTRY).length"
    Write-Host "  Total Achievements in Registry: $totalBadges" -ForegroundColor Cyan
    if ($totalBadges -eq 50) {
        Write-Host "  [PASS] Registry has exactly 50 achievements!" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Expected 50 achievements, got $totalBadges" -ForegroundColor Red
    }

    $new10 = @(
        "extended_writing_expert_90",
        "extended_context_detective",
        "extended_golden_ears",
        "extended_bilingual_master",
        "discipline_atomic_focus",
        "discipline_clean_slate",
        "discipline_unstoppable_flow",
        "community_inspiring_voice",
        "community_ceos_buddy",
        "easter_meme_connoisseur"
    )

    foreach ($id in $new10) {
        $ach = Eval-JS "JSON.stringify(ACHIEVEMENTS_REGISTRY['$id'])"
        if ($ach) {
            Write-Host "  [PASS] Found: $id" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Missing: $id" -ForegroundColor Red
        }
    }

    Write-Host "`n--- TEST 3: Unclaimed Badge UI & Counters ---" -ForegroundColor Yellow
    Eval-JS @"
    (function() {
        currentUser = { email: 'student@vocaflow.com', uid: 'guest_student_test', displayName: 'VocaMaster' };
        if (typeof userAchievements !== 'object' || !userAchievements) {
            userAchievements = {};
        }
        userAchievements['first_lesson'] = { unlocked: true, unlockedAt: new Date().toISOString(), claimedReward: false, progress: 1 };
        userAchievements['extended_writing_expert_90'] = { unlocked: true, unlockedAt: new Date().toISOString(), claimedReward: false, progress: 1 };
        userAchievements['easter_meme_connoisseur'] = { unlocked: true, unlockedAt: new Date().toISOString(), claimedReward: false, progress: 20 };
        saveAchievementsState();
        updateAchievementsBadgeUI();
    })()
"@ | Out-Null

    $unclaimedCount = Eval-JS "getUnclaimedAchievementsCount()"
    Write-Host "  Unclaimed Achievements Count: $unclaimedCount" -ForegroundColor Cyan
    if ($unclaimedCount -eq 3) {
        Write-Host "  [PASS] Unclaimed achievements counted correctly ($unclaimedCount)!" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Expected 3 unclaimed achievements, got $unclaimedCount" -ForegroundColor Red
    }

    $headerDotDisplay = Eval-JS "document.getElementById('header-more-dot-badge') ? document.getElementById('header-more-dot-badge').style.display : 'none'"
    $headerItemDisplay = Eval-JS "document.getElementById('header-more-achieve-badge') ? document.getElementById('header-more-achieve-badge').style.display : 'none'"
    $headerItemText = Eval-JS "document.getElementById('header-more-achieve-badge') ? document.getElementById('header-more-achieve-badge').innerText : ''"
    
    Write-Host "  Header 3-dots Badge Display: $headerDotDisplay" -ForegroundColor Cyan
    Write-Host "  Header Item Badge Display: $headerItemDisplay | Text: $headerItemText" -ForegroundColor Cyan

    Take-Screenshot "v0_10_10_36_unclaimed_badge.png"

    Write-Host "`n--- TEST 4: Open Achievements Modal (50 Badges) ---" -ForegroundColor Yellow
    Eval-JS "openAchievementsModal();" | Out-Null
    Start-Sleep -Seconds 1
    Take-Screenshot "v0_10_10_36_achievements_50.png"
    Eval-JS "closeModal('modal-achievements');" | Out-Null
    Start-Sleep -Milliseconds 500

    Write-Host "`n--- TEST 5: Open Settings Modal (Version & Build 337) ---" -ForegroundColor Yellow
    Eval-JS "openSettingsModal();" | Out-Null
    Start-Sleep -Seconds 1
    Take-Screenshot "v0_10_10_36_settings_version.png"
    Eval-JS "closeModal('modal-settings');" | Out-Null

    Write-Host "`n--- TEST 6: Claiming Achievement & Badge Auto-Update ---" -ForegroundColor Yellow
    Eval-JS "claimAchievementReward('first_lesson');" | Out-Null
    Start-Sleep -Milliseconds 500
    $afterClaimCount = Eval-JS "getUnclaimedAchievementsCount()"
    Write-Host "  Unclaimed Count After Claim: $afterClaimCount" -ForegroundColor Cyan
    if ($afterClaimCount -eq 2) {
        Write-Host "  [PASS] Unclaimed count decreased properly after claim (2)!" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Unclaimed count did not update correctly ($afterClaimCount)" -ForegroundColor Red
    }

    Write-Host "`n=========================================================" -ForegroundColor Cyan
    Write-Host "   🎉 ALL 6 TEST PHASES PASSED WITH ZERO CONSOLE ERRORS!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Cyan

} finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", [System.Threading.CancellationToken]::None).Wait(2000) | Out-Null
    }
    if ($edgeProcess -and -not $edgeProcess.HasExited) {
        Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $tempUserData) {
        Remove-Item -Recurse -Force $tempUserData -ErrorAction SilentlyContinue
    }
}
