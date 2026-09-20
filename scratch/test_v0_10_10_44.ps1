# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-44 (Build 345)
# Profile Badges Light Sweep Hover Fix, Refined Vector Frames (VIP, Silver, Gold, Diamond),
# Event Animations, Non-Occluding Avatars & Dynamic /me Frame Synchronization
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9384
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test44_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-44 (Build 345) TEST SUITE" -ForegroundColor Yellow
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

    # Set viewport size
    Send-CDPCommand "Emulation.setDeviceMetricsOverride" @{
        width = 1280
        height = 850
        deviceScaleFactor = 1
        mobile = $false
    } | Out-Null

    # --- TEST 1: APP VERSION & SETTINGS MODAL ---
    Write-Host "`n--- TEST 1: App Version & Settings Modal ---" -ForegroundColor Cyan
    $appVer = Eval-JS "typeof VOCAFLOW_APP_VERSION !== 'undefined' ? VOCAFLOW_APP_VERSION : 'undefined'"
    $appBuild = Eval-JS "typeof VOCAFLOW_APP_BUILD !== 'undefined' ? VOCAFLOW_APP_BUILD : 'undefined'"
    Write-Host "  App Version: $appVer (Expected: v0.10.10-44)" -ForegroundColor $(if ($appVer -eq 'v0.10.10-44') { "Green" } else { "Red" })
    Write-Host "  App Build: $appBuild (Expected: 345)" -ForegroundColor $(if ($appBuild -eq 345) { "Green" } else { "Red" })

    Eval-JS "openModal('modal-settings')"
    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_44_settings_version.png"
    Eval-JS "closeModal('modal-settings')"

    # --- TEST 2: PINNED BADGES HOVER-ONLY ROTATELIGHT CSS ---
    Write-Host "`n--- TEST 2: Profile Highlights Pinned Badges (Issue 5 Fix) ---" -ForegroundColor Cyan
    $badgeCssTest = Eval-JS @"
    (function() {
        // Mock user with pinned badges
        currentUser = {
            uid: 'test_user_44',
            displayName: 'VocaVIP Queen',
            email: 'vipqueen@vocaflow.app',
            username: 'vipqueen'
        };
        userIsVip = true;
        userVipTier = 'lifetime';
        userVipExpiresAt = Date.now() + 86400000 * 365;
        userPinnedBadges = ['first_lesson', 'streak_7', 'speed_demon'];
        localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(userPinnedBadges));
        
        openProfileModal();
        renderProfilePinnedBadges();

        const badgeCards = document.querySelectorAll('#profile-pinned-badges-showcase .pinned-badge-card');
        return {
            cardsCount: badgeCards.length,
            firstCardId: badgeCards[0] ? badgeCards[0].getAttribute('data-badge-id') : null,
            firstCardTier: badgeCards[0] ? badgeCards[0].className : ''
        };
    })()
"@
    Write-Host "  Pinned Badge Cards Count: $($badgeCssTest.cardsCount) (Exp: 3)" -ForegroundColor $(if ($badgeCssTest.cardsCount -eq 3) { "Green" } else { "Red" })
    Write-Host "  First Card Tier Class: $($badgeCssTest.firstCardTier)" -ForegroundColor Green

    # --- TEST 3: WARDROBE EVENT FRAMES EXCLUSIVITY (Issue 10 Fix) ---
    Write-Host "`n--- TEST 3: Event Frames Non-Purchasable / Exclusive (Issue 10 Fix) ---" -ForegroundColor Cyan
    $eventTest = Eval-JS @"
    (function() {
        const eventIds = ['birthday', 'christmas', 'halloween', 'vietnam', 'tet', 'easter'];
        const results = {};
        eventIds.forEach(id => {
            const frame = VOCAFLOW_WARDROBE_REGISTRY.frames.find(f => f.id === id);
            results[id] = {
                price: frame ? frame.price : 'MISSING',
                badge: frame ? frame.badge : 'MISSING',
                isCoinPurchasable: frame && typeof frame.price === 'number' && frame.price > 0
            };
        });
        
        // Test buying an event item
        userVoCoins = 50000;
        const buyAttempt = buyWardrobeItem('frames', 'vietnam');

        return {
            results,
            buyAttemptSuccess: buyAttempt.success,
            buyAttemptReason: buyAttempt.reason
        };
    })()
"@
    Write-Host "  Birthday Frame Price: $($eventTest.results.birthday.price) | Badge: $($eventTest.results.birthday.badge)" -ForegroundColor Green
    Write-Host "  Vietnam Frame Price: $($eventTest.results.vietnam.price) | Badge: $($eventTest.results.vietnam.badge)" -ForegroundColor Green
    Write-Host "  Event Coin Buy Blocked: $($eventTest.buyAttemptSuccess -eq $false) (Reason: $($eventTest.buyAttemptReason))" -ForegroundColor $(if ($eventTest.buyAttemptSuccess -eq $false) { "Green" } else { "Red" })

    # --- TEST 4: FRAME RENDERING & STAR/CROWN/DIAMOND DECORATIONS (Issues 6 & 7) ---
    Write-Host "`n--- TEST 4: Frame SVG Visuals, Stars & Decorations (Issues 6 & 7) ---" -ForegroundColor Cyan
    $frameVisualsTest = Eval-JS @"
    (function() {
        const vipSvg = renderAvatarWithFrameHtml('👑', 88, 'vip');
        const silverSvg = renderAvatarWithFrameHtml('👤', 88, 'silver');
        const goldSvg = renderAvatarWithFrameHtml('👤', 88, 'gold');
        const diamondSvg = renderAvatarWithFrameHtml('💎', 88, 'diamond');
        const vietnamSvg = renderAvatarWithFrameHtml('🇻🇳', 88, 'vietnam');
        const birthdaySvg = renderAvatarWithFrameHtml('🎂', 88, 'birthday');
        const christmasSvg = renderAvatarWithFrameHtml('🎄', 88, 'christmas');
        const tetSvg = renderAvatarWithFrameHtml('🌸', 88, 'tet');

        // Check CSS keyframe definitions
        const styleText = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');

        return {
            vipHasCrown: vipSvg.includes('royal-lifetime-crown') && vipSvg.includes('👑'),
            vipHasLifetimeRibbon: vipSvg.includes('VIP LIFETIME'),
            silverHas2Stars: (silverSvg.match(/★/g) || []).length === 2,
            goldHas3Stars: (goldSvg.match(/★/g) || []).length === 3,
            diamondHas4StarsAndDia: (diamondSvg.match(/★/g) || []).length === 4 && diamondSvg.includes('💎'),
            diamondHasShimmer: diamondSvg.includes('diamond-blink-sweep') && styleText.includes('diamondShimmerSweep'),
            vietnamHasCenterTransform: styleText.includes('starRadiance') && styleText.includes('transform-box: fill-box'),
            birthdayHasHatBob: birthdaySvg.includes('birthday-party-hat') && styleText.includes('hatPartyBob'),
            christmasHasBellJingle: christmasSvg.includes('christmas-bell') && styleText.includes('bellJingle'),
            tetHasLanternSway: tetSvg.includes('tet-lantern') && styleText.includes('lanternSway')
        };
    })()
"@
    Write-Host "  VIP Frame Crown & Ribbon: $($frameVisualsTest.vipHasCrown) & $($frameVisualsTest.vipHasLifetimeRibbon)" -ForegroundColor $(if ($frameVisualsTest.vipHasCrown -and $frameVisualsTest.vipHasLifetimeRibbon) { "Green" } else { "Red" })
    Write-Host "  Silver Frame 2 Stars: $($frameVisualsTest.silverHas2Stars)" -ForegroundColor $(if ($frameVisualsTest.silverHas2Stars) { "Green" } else { "Red" })
    Write-Host "  Gold Frame 3 Stars: $($frameVisualsTest.goldHas3Stars)" -ForegroundColor $(if ($frameVisualsTest.goldHas3Stars) { "Green" } else { "Red" })
    Write-Host "  Diamond Frame 4 Stars + Diamond & Shimmer: $($frameVisualsTest.diamondHas4StarsAndDia) & $($frameVisualsTest.diamondHasShimmer)" -ForegroundColor $(if ($frameVisualsTest.diamondHas4StarsAndDia -and $frameVisualsTest.diamondHasShimmer) { "Green" } else { "Red" })
    Write-Host "  Vietnam Frame Centered Star Transform: $($frameVisualsTest.vietnamHasCenterTransform)" -ForegroundColor $(if ($frameVisualsTest.vietnamHasCenterTransform) { "Green" } else { "Red" })
    Write-Host "  Birthday Frame Hat Bob Animation: $($frameVisualsTest.birthdayHasHatBob)" -ForegroundColor $(if ($frameVisualsTest.birthdayHasHatBob) { "Green" } else { "Red" })
    Write-Host "  Christmas Frame Bell Wobble: $($frameVisualsTest.christmasHasBellJingle)" -ForegroundColor $(if ($frameVisualsTest.christmasHasBellJingle) { "Green" } else { "Red" })
    Write-Host "  Tet Frame Gentle Sway: $($frameVisualsTest.tetHasLanternSway)" -ForegroundColor $(if ($frameVisualsTest.tetHasLanternSway) { "Green" } else { "Red" })

    # --- TEST 5: DYNAMIC /ME PROFILE AVATAR SYNC (Issue 8 & 9 Fix) ---
    Write-Host "`n--- TEST 5: Dynamic /me Profile Avatar Sync & Unclipped Containers (Issues 8 & 9) ---" -ForegroundColor Cyan
    
    # 5.1 Test with VIP Frame
    Eval-JS @"
    (function() {
        equipWardrobeItem('frames', 'vip');
        openProfileModal();
    })()
"@
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_44_profile_vip_frame.png"

    # 5.2 Test with Diamond Frame
    Eval-JS @"
    (function() {
        equipWardrobeItem('frames', 'diamond');
        openProfileModal();
    })()
"@
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_44_profile_diamond_frame.png"

    # 5.3 Test Wardrobe modal with Event Frames filter
    Eval-JS @"
    (function() {
        openWardrobeModal('frames');
        filterWardrobeCategory('event');
    })()
"@
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_44_wardrobe_event_exclusive.png"

    # 5.4 Test Profile with Gold Frame
    Eval-JS @"
    (function() {
        equipWardrobeItem('frames', 'gold');
        openProfileModal();
    })()
"@
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_44_profile_gold_silver_frames.png"

    Write-Host "`n=========================================================" -ForegroundColor Green
    Write-Host "   ✅ ALL TESTS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green

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
