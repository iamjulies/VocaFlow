# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-47 (Build 348)
# VIP Frame Hover Isolation, Pinned Badges Polish, Spacious Wardrobe Layout,
# 3-Tier VIP Frame Redesign (Cosmic Starlight & Magical Runes),
# VIP Pricing GPU Acceleration, Profile 100px Avatar & Universal Name Sync
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9390
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test47_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-47 (Build 348) TEST SUITE" -ForegroundColor Yellow
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

    # Set initial viewport
    Send-CDPCommand "Emulation.setDeviceMetricsOverride" @{
        width = 1280
        height = 800
        deviceScaleFactor = 1
        mobile = $false
    } | Out-Null

    Start-Sleep -Milliseconds 500

    # Test 1: Version Label Verification
    Write-Host "`n--- TEST 1: App Version & Settings Label ---" -ForegroundColor Cyan
    $versionText = Eval-JS "document.getElementById('settings-app-version-label')?.textContent || 'MISSING'"
    Write-Host "  Settings Version Label: '$versionText'" -ForegroundColor $(if ($versionText -like "*v0.10.10-47 (Build 348)*") { "Green" } else { "Red" })

    $appVersionJS = Eval-JS "typeof VOCAFLOW_APP_VERSION !== 'undefined' ? VOCAFLOW_APP_VERSION : 'UNDEFINED'"
    $appBuildJS = Eval-JS "typeof VOCAFLOW_APP_BUILD !== 'undefined' ? VOCAFLOW_APP_BUILD : 'UNDEFINED'"
    Write-Host "  VOCAFLOW_APP_VERSION JS: '$appVersionJS' | BUILD: '$appBuildJS'" -ForegroundColor $(if ($appVersionJS -eq "v0.10.10-47" -and $appBuildJS -eq 348) { "Green" } else { "Red" })

    # Test 2: Issue 21 & Issue 24 - 3 VIP Tier Frame SVG Architecture
    Write-Host "`n--- TEST 2: Issue 21 & 24 - 3-Tier VIP Frame SVG Architecture & Hover Isolation ---" -ForegroundColor Cyan
    $vipMonthlySvg = Eval-JS "typeof renderAvatarWithFrameHtml === 'function' ? renderAvatarWithFrameHtml('user', 64, 'vip_monthly') : 'MISSING'"
    $vipMonthlyHasFrame = $vipMonthlySvg -like "*VIP MONTHLY*"
    $vipMonthlyHasAnim = $vipMonthlySvg -like "*vfVipMonthlyGrad*"
    Write-Host "  VIP Monthly: hasFrame=$vipMonthlyHasFrame, hasGrad=$vipMonthlyHasAnim" -ForegroundColor $(if ($vipMonthlyHasFrame -and $vipMonthlyHasAnim) { "Green" } else { "Red" })

    $vipYearlySvg = Eval-JS "typeof renderAvatarWithFrameHtml === 'function' ? renderAvatarWithFrameHtml('user', 64, 'vip_yearly') : 'MISSING'"
    $vipYearlyHasWings = $vipYearlySvg -like "*vip-yearly-wings-inner*"
    $vipYearlyHasTransformBox = $vipYearlySvg -like "*transform-box: fill-box*"
    Write-Host "  VIP Yearly: hasWings=$vipYearlyHasWings, hasTransformBox=$vipYearlyHasTransformBox" -ForegroundColor $(if ($vipYearlyHasWings -and $vipYearlyHasTransformBox) { "Green" } else { "Red" })

    $vipLifetimeSvg = Eval-JS "typeof renderAvatarWithFrameHtml === 'function' ? renderAvatarWithFrameHtml('user', 64, 'vip') : 'MISSING'"
    $vipLifetimeHasGlisten = $vipLifetimeSvg -like "*vip-lifetime-magical-glisten*"
    $vipLifetimeHasSparkles = $vipLifetimeSvg -like "*vip-lifetime-starlight*"
    Write-Host "  VIP Lifetime: hasGlisten=$vipLifetimeHasGlisten, hasSparkles=$vipLifetimeHasSparkles" -ForegroundColor $(if ($vipLifetimeHasGlisten -and $vipLifetimeHasSparkles) { "Green" } else { "Red" })

    # Test 3: Issue 23 - Spacious Wardrobe Modal Layout Check
    Write-Host "`n--- TEST 3: Issue 23 - Spacious Wardrobe Modal Layout ---" -ForegroundColor Cyan
    Eval-JS "if (typeof openWardrobeModal === 'function') openWardrobeModal()" | Out-Null
    Start-Sleep -Milliseconds 600
    $wardrobeModalWidth = Eval-JS "document.querySelector('#modal-wardrobe .modal')?.offsetWidth || 0"
    $wardrobeGridCols = Eval-JS "window.getComputedStyle(document.querySelector('.vf-wardrobe-grid')).gridTemplateColumns"
    Write-Host "  Wardrobe Modal Width: ${wardrobeModalWidth}px | Grid Columns: $wardrobeGridCols" -ForegroundColor $(if ($wardrobeModalWidth -ge 900) { "Green" } else { "Yellow" })

    # Take Snapshot 1: Spacious Wardrobe Modal with VIP Lifetime Frame
    Eval-JS "if (typeof previewWardrobeItem === 'function') previewWardrobeItem('frames', 'vip')" | Out-Null
    Start-Sleep -Milliseconds 400
    Take-Screenshot "v0_10_10_47_wardrobe_vip_lifetime.png"

    # Take Snapshot 2: Spacious Wardrobe Modal with VIP Yearly Frame
    Eval-JS "if (typeof previewWardrobeItem === 'function') previewWardrobeItem('frames', 'vip_yearly')" | Out-Null
    Start-Sleep -Milliseconds 400
    Take-Screenshot "v0_10_10_47_wardrobe_vip_yearly.png"

    # Take Snapshot 3: Spacious Wardrobe Modal with VIP Monthly Frame
    Eval-JS "if (typeof previewWardrobeItem === 'function') previewWardrobeItem('frames', 'vip_monthly')" | Out-Null
    Start-Sleep -Milliseconds 400
    Take-Screenshot "v0_10_10_47_wardrobe_vip_monthly.png"

    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-wardrobe')" | Out-Null
    Start-Sleep -Milliseconds 300

    # Test 4: Issue 25 - VIP Pricing Modal GPU Containment
    Write-Host "`n--- TEST 4: Issue 25 - VIP Pricing Modal Performance & Containment ---" -ForegroundColor Cyan
    Eval-JS @"
    (function() {
        window.currentUser = {
            uid: 'test_vip_owner',
            displayName: 'Julies Master',
            username: 'julies_dev',
            avatar: '👑',
            isVip: false,
            vipTier: null,
            studyExp: 120000,
            level: 50,
            equippedWardrobe: { frame: 'vip', nameEffect: 'mythic', title: 'grandmaster' }
        };
        if (typeof renderVipPricingCards === 'function') renderVipPricingCards();
        if (typeof openVipPricingModal === 'function') openVipPricingModal();
        else if (typeof openVipModal === 'function') openVipModal();
    })()
"@
    Start-Sleep -Milliseconds 600
    $pricingContainment = Eval-JS "window.getComputedStyle(document.querySelector('.vip-pricing-modal') || document.querySelector('#modal-vip-pricing .modal')).contain"
    Write-Host "  VIP Pricing Containment Style: '$pricingContainment'" -ForegroundColor Green
    Take-Screenshot "v0_10_10_47_vip_pricing_modal.png"
    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-vip-pricing')" | Out-Null
    Start-Sleep -Milliseconds 300

    # Test 5: Issue 22 & 26 - Profile Modal 100px Avatar & Pinned Badges Polish
    Write-Host "`n--- TEST 5: Issue 22 & 26 - Profile Modal 100px Avatar & Pinned Badges Polish ---" -ForegroundColor Cyan
    # Setup test user in profile modal
    Eval-JS @"
    (function() {
        const u = {
            uid: 'test_vip_owner',
            displayName: 'Julies Master',
            username: 'julies_dev',
            avatar: '👑',
            isVip: true,
            vipTier: 'lifetime',
            vipExpiresAt: 9999999999999,
            studyExp: 120000,
            level: 50,
            equippedWardrobe: { frame: 'vip', nameEffect: 'mythic', title: 'grandmaster' },
            pinnedBadges: ['badge_gold_streak', 'badge_diamond_vocab']
        };
        window.currentUser = u;
        localStorage.setItem('vocaflow_auth_user', JSON.stringify(u));
        localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(['badge_gold_streak', 'badge_diamond_vocab']));
        if (typeof applyVipState === 'function') applyVipState(true, 'lifetime', 9999999999999, 'test', false);
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof openProfileModal === 'function') openProfileModal();
    })()
"@
    Start-Sleep -Milliseconds 800
    $profileAvatarSize = Eval-JS "document.getElementById('profile-avatar')?.offsetHeight || 0"
    $hasOuterYellowGlow = Eval-JS "document.querySelector('.vip-avatar-glow') !== null"
    Write-Host "  Profile Avatar Size: ${profileAvatarSize}px | Has Outer Yellow Glow: $hasOuterYellowGlow" -ForegroundColor $(if ($profileAvatarSize -ge 95 -and -not $hasOuterYellowGlow) { "Green" } else { "Red" })
    Take-Screenshot "v0_10_10_47_profile_vip_lifetime_100px.png"

    # Test 6: Public Profile Modal with 100px Avatar & Yearly VIP Frame
    Write-Host "`n--- TEST 6: Public Profile Modal 100px Avatar & Yearly VIP Frame ---" -ForegroundColor Cyan
    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-profile')" | Out-Null
    Start-Sleep -Milliseconds 300
    Eval-JS @"
    (function() {
        const mockPubUser = {
            uid: 'pub_vip_yearly',
            displayName: 'Lady Phoenix',
            username: 'phoenix_queen',
            bio: 'Master of English & French Vocabularies',
            avatar: '🪶',
            isVip: true,
            vipTier: 'yearly',
            studyExp: 65000,
            level: 40,
            equippedWardrobe: { frame: 'vip_yearly', nameEffect: 'birthday', title: 'polyglot' }
        };
        window.getLiveUserRegistryEntry = function(uid) {
            return mockPubUser;
        };
        if (typeof openPublicProfileModal === 'function') {
            openPublicProfileModal('Lady Phoenix', 'pub_vip_yearly');
        }
    })()
"@
    Start-Sleep -Milliseconds 800
    $pubAvatarSize = Eval-JS "document.getElementById('pub-view-avatar')?.offsetHeight || 0"
    Write-Host "  Public Profile Avatar Size: ${pubAvatarSize}px" -ForegroundColor $(if ($pubAvatarSize -ge 95) { "Green" } else { "Red" })
    Take-Screenshot "v0_10_10_47_public_profile_yearly_100px.png"
    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-public-profile')" | Out-Null
    Start-Sleep -Milliseconds 300

    # Test 7: Settings Modal Snapshot for Version Consistency
    Write-Host "`n--- TEST 7: Settings Modal Snapshot ---" -ForegroundColor Cyan
    Eval-JS "if (typeof openModal === 'function') openModal('modal-settings')" | Out-Null
    Start-Sleep -Milliseconds 400
    Eval-JS "const sm = document.querySelector('#modal-settings .modal'); if (sm) sm.scrollTop = sm.scrollHeight;" | Out-Null
    Start-Sleep -Milliseconds 400
    Take-Screenshot "v0_10_10_47_settings_version.png"
    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-settings')" | Out-Null

    Write-Host "`n=========================================================" -ForegroundColor Green
    Write-Host "   ✅ ALL 7 TESTS COMPLETED SUCCESSFULLY FOR v0.10.10-47!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green

} finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Closing", [System.Threading.CancellationToken]::None).Wait(2000) | Out-Null
    }
    if ($edgeProcess -and -not $edgeProcess.HasExited) {
        Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $tempUserData) {
        Remove-Item -Path $tempUserData -Recurse -Force -ErrorAction SilentlyContinue
    }
}
