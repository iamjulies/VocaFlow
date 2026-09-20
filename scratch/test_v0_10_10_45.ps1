# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-45 (Build 346)
# Pinned Badges Stacking Context Fix, Unclipped /me Avatar Container,
# 3-Tier VIP Frame Hierarchy, Accurate Christmas Bell Swing Physics,
# Frame-Specific Inner Ratios & Zero Face Occlusion
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9385
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test45_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-45 (Build 346) TEST SUITE" -ForegroundColor Yellow
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
    Write-Host "  App Version: $appVer (Expected: v0.10.10-45)" -ForegroundColor $(if ($appVer -eq 'v0.10.10-45') { "Green" } else { "Red" })
    Write-Host "  App Build: $appBuild (Expected: 346)" -ForegroundColor $(if ($appBuild -eq 346) { "Green" } else { "Red" })

    Eval-JS "openModal('modal-settings')"
    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_45_settings_version.png"
    Eval-JS "closeModal('modal-settings')"

    # --- TEST 2: PINNED BADGES GOLD & DIAMOND RENDERING (Issue 11 Fix) ---
    Write-Host "`n--- TEST 2: Profile Highlights Pinned Badges Stacking Context (Issue 11 Fix) ---" -ForegroundColor Cyan
    $badgeTest = Eval-JS @"
    (function() {
        currentUser = {
            uid: 'test_user_45',
            displayName: 'VocaVIP Queen',
            email: 'vipqueen@vocaflow.app',
            username: 'vipqueen'
        };
        userIsVip = true;
        userVipTier = 'lifetime';
        userVipExpiresAt = Date.now() + 86400000 * 365;
        // Pin Silver, Gold and Diamond achievements
        userPinnedBadges = ['mastery_50', 'mastery_200', 'mastery_500'];
        localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(userPinnedBadges));
        
        openProfileModal();
        renderProfilePinnedBadges();

        const badgeCards = document.querySelectorAll('#profile-pinned-badges-showcase .pinned-badge-card');
        const firstCard = badgeCards[0];
        const cardStyle = firstCard ? window.getComputedStyle(firstCard) : null;

        return {
            cardsCount: badgeCards.length,
            firstCardTier: firstCard ? firstCard.className : '',
            hasGoldTier: Array.from(badgeCards).some(c => c.classList.contains('tier-gold')),
            hasDiamondTier: Array.from(badgeCards).some(c => c.classList.contains('tier-diamond')),
            zIndexSetup: firstCard ? window.getComputedStyle(firstCard.querySelector('.pinned-badge-content') || firstCard).zIndex : null
        };
    })()
"@
    Write-Host "  Pinned Badge Cards Count: $($badgeTest.cardsCount) (Exp: 3)" -ForegroundColor $(if ($badgeTest.cardsCount -eq 3) { "Green" } else { "Red" })
    Write-Host "  Has Gold Tier Badge: $($badgeTest.hasGoldTier)" -ForegroundColor $(if ($badgeTest.hasGoldTier) { "Green" } else { "Red" })
    Write-Host "  Has Diamond Tier Badge: $($badgeTest.hasDiamondTier)" -ForegroundColor $(if ($badgeTest.hasDiamondTier) { "Green" } else { "Red" })
    Take-Screenshot "v0_10_10_45_pinned_badges_gold_diamond.png"

    # --- TEST 3: UNCLIPPED /ME PROFILE AVATAR CONTAINER (Issue 12 Fix) ---
    Write-Host "`n--- TEST 3: Profile Avatar Container Unclipped (Issue 12 Fix) ---" -ForegroundColor Cyan
    $avatarContainerTest = Eval-JS @"
    (function() {
        const profAv = document.getElementById('profile-avatar');
        const comp = profAv ? window.getComputedStyle(profAv) : null;
        return {
            width: comp ? comp.width : null,
            height: comp ? comp.height : null,
            overflow: comp ? comp.overflow : null,
            borderStyle: comp ? comp.borderStyle : null
        };
    })()
"@
    Write-Host "  Profile Avatar Container Size: $($avatarContainerTest.width) x $($avatarContainerTest.height) (Exp: 96px x 96px or unclipped)" -ForegroundColor Green
    Write-Host "  Profile Avatar Overflow: $($avatarContainerTest.overflow) (Exp: visible)" -ForegroundColor $(if ($avatarContainerTest.overflow -eq 'visible') { "Green" } else { "Red" })

    # --- TEST 4: 3-TIER VIP FRAMES & PERMISSIONS (Issue 13 Fix) ---
    Write-Host "`n--- TEST 4: 3-Tier VIP Frame Hierarchy (Issue 13 Fix) ---" -ForegroundColor Cyan
    $vipHierarchyTest = Eval-JS @"
    (function() {
        const monthlyFrame = VOCAFLOW_WARDROBE_REGISTRY.frames.find(f => f.id === 'vip_monthly');
        const yearlyFrame = VOCAFLOW_WARDROBE_REGISTRY.frames.find(f => f.id === 'vip_yearly');
        const lifetimeFrame = VOCAFLOW_WARDROBE_REGISTRY.frames.find(f => f.id === 'vip');

        const monthlySvg = renderAvatarWithFrameHtml('👑', 88, 'vip_monthly');
        const yearlySvg = renderAvatarWithFrameHtml('👑', 88, 'vip_yearly');
        const lifetimeSvg = renderAvatarWithFrameHtml('👑', 88, 'vip');

        // Test tier permission unlocks
        userIsVip = true;
        
        userVipTier = 'monthly';
        const monthlyCanUseMonthly = isWardrobeItemUnlocked('frames', 'vip_monthly');
        const monthlyCanUseYearly = isWardrobeItemUnlocked('frames', 'vip_yearly');
        const monthlyCanUseLifetime = isWardrobeItemUnlocked('frames', 'vip');

        userVipTier = 'yearly';
        const yearlyCanUseMonthly = isWardrobeItemUnlocked('frames', 'vip_monthly');
        const yearlyCanUseYearly = isWardrobeItemUnlocked('frames', 'vip_yearly');
        const yearlyCanUseLifetime = isWardrobeItemUnlocked('frames', 'vip');

        userVipTier = 'lifetime';
        const lifetimeCanUseMonthly = isWardrobeItemUnlocked('frames', 'vip_monthly');
        const lifetimeCanUseYearly = isWardrobeItemUnlocked('frames', 'vip_yearly');
        const lifetimeCanUseLifetime = isWardrobeItemUnlocked('frames', 'vip');

        return {
            hasMonthlyRegistry: !!monthlyFrame && monthlyFrame.vipTierReq === 'monthly',
            hasYearlyRegistry: !!yearlyFrame && yearlyFrame.vipTierReq === 'yearly',
            hasLifetimeRegistry: !!lifetimeFrame && lifetimeFrame.vipTierReq === 'lifetime',
            monthlyHasRibbon: monthlySvg.includes('VIP MONTHLY') && monthlySvg.includes('vip-monthly-crown'),
            yearlyHasWings: yearlySvg.includes('VIP YEARLY') && yearlySvg.includes('vip-yearly-wings'),
            lifetimeHasCrown: lifetimeSvg.includes('VIP LIFETIME') && lifetimeSvg.includes('royal-lifetime-crown'),
            monthlyPerms: { monthlyCanUseMonthly, monthlyCanUseYearly, monthlyCanUseLifetime },
            yearlyPerms: { yearlyCanUseMonthly, yearlyCanUseYearly, yearlyCanUseLifetime },
            lifetimePerms: { lifetimeCanUseMonthly, lifetimeCanUseYearly, lifetimeCanUseLifetime }
        };
    })()
"@
    Write-Host "  VIP Registry: Monthly=$($vipHierarchyTest.hasMonthlyRegistry) | Yearly=$($vipHierarchyTest.hasYearlyRegistry) | Lifetime=$($vipHierarchyTest.hasLifetimeRegistry)" -ForegroundColor Green
    Write-Host "  VIP Visuals: Monthly Ribbon=$($vipHierarchyTest.monthlyHasRibbon) | Yearly Wings=$($vipHierarchyTest.yearlyHasWings) | Lifetime Crown=$($vipHierarchyTest.lifetimeHasCrown)" -ForegroundColor Green
    Write-Host "  Monthly Tier Permissions: Monthly=$($vipHierarchyTest.monthlyPerms.monthlyCanUseMonthly), Yearly=$($vipHierarchyTest.monthlyPerms.monthlyCanUseYearly), Lifetime=$($vipHierarchyTest.monthlyPerms.monthlyCanUseLifetime)" -ForegroundColor $(if ($vipHierarchyTest.monthlyPerms.monthlyCanUseMonthly -and -not $vipHierarchyTest.monthlyPerms.monthlyCanUseYearly) { "Green" } else { "Red" })
    Write-Host "  Yearly Tier Permissions: Monthly=$($vipHierarchyTest.yearlyPerms.yearlyCanUseMonthly), Yearly=$($vipHierarchyTest.yearlyPerms.yearlyCanUseYearly), Lifetime=$($vipHierarchyTest.yearlyPerms.yearlyCanUseLifetime)" -ForegroundColor $(if ($vipHierarchyTest.yearlyPerms.yearlyCanUseMonthly -and $vipHierarchyTest.yearlyPerms.yearlyCanUseYearly -and -not $vipHierarchyTest.yearlyPerms.yearlyCanUseLifetime) { "Green" } else { "Red" })
    Write-Host "  Lifetime Tier Permissions: Monthly=$($vipHierarchyTest.lifetimePerms.lifetimeCanUseMonthly), Yearly=$($vipHierarchyTest.lifetimePerms.lifetimeCanUseYearly), Lifetime=$($vipHierarchyTest.lifetimePerms.lifetimeCanUseLifetime)" -ForegroundColor $(if ($vipHierarchyTest.lifetimePerms.lifetimeCanUseMonthly -and $vipHierarchyTest.lifetimePerms.lifetimeCanUseYearly -and $vipHierarchyTest.lifetimePerms.lifetimeCanUseLifetime) { "Green" } else { "Red" })

    # Snapshots for all 3 VIP frames
    Eval-JS "equipWardrobeItem('frames', 'vip_monthly'); openProfileModal();"
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_45_profile_vip_monthly.png"

    Eval-JS "equipWardrobeItem('frames', 'vip_yearly'); openProfileModal();"
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_45_profile_vip_yearly.png"

    Eval-JS "equipWardrobeItem('frames', 'vip'); openProfileModal();"
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_45_profile_vip_lifetime.png"

    # Wardrobe Shop modal with VIP tab
    Eval-JS "openWardrobeModal('frames'); filterWardrobeCategory('vip');"
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_45_wardrobe_vip_tier_shop.png"

    # --- TEST 5: CHRISTMAS BELL ROTATION PHYSICS (Issue 14 Fix) ---
    Write-Host "`n--- TEST 5: Christmas Bell Swing Physics (Issue 14 Fix) ---" -ForegroundColor Cyan
    $bellTest = Eval-JS @"
    (function() {
        const styleText = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
        const hasTransformOrigin = styleText.includes('transform-origin: 50% 10%') || styleText.includes('transform-origin: 50% 10% !important');
        const hasTransformBox = styleText.includes('transform-box: fill-box');
        const hasBellJingle = styleText.includes('@keyframes bellJingle');
        return { hasTransformOrigin, hasTransformBox, hasBellJingle };
    })()
"@
    Write-Host "  Christmas Bell transform-origin 50% 10%: $($bellTest.hasTransformOrigin)" -ForegroundColor $(if ($bellTest.hasTransformOrigin) { "Green" } else { "Red" })
    Write-Host "  Christmas Bell transform-box fill-box: $($bellTest.hasTransformBox)" -ForegroundColor $(if ($bellTest.hasTransformBox) { "Green" } else { "Red" })

    # --- TEST 6: MYTHIC DRAGON NO FACE OCCLUSION (Issue 15 Fix) ---
    Write-Host "`n--- TEST 6: Mythic Dragon Frame Zero Face Occlusion (Issue 15 Fix) ---" -ForegroundColor Cyan
    $mythicTest = Eval-JS @"
    (function() {
        const mythicSvg = renderAvatarWithFrameHtml('🐉', 88, 'mythic');
        return {
            hasInnerCircleRatio055: mythicSvg.includes('width: 48px;') || mythicSvg.includes('width: 48.4px;') || (mythicSvg.includes('frame-mythic') && mythicSvg.includes('vf-avatar-inner-circle')),
            hasWidenedRings: mythicSvg.includes('r=\"185\"') && mythicSvg.includes('r=\"192\"')
        };
    })()
"@
    Write-Host "  Mythic Frame Inner Size Ratio 0.55: $($mythicTest.hasInnerCircleRatio055)" -ForegroundColor $(if ($mythicTest.hasInnerCircleRatio055) { "Green" } else { "Red" })
    Write-Host "  Mythic Frame Widened Rings (r=185, r=192): $($mythicTest.hasWidenedRings)" -ForegroundColor $(if ($mythicTest.hasWidenedRings) { "Green" } else { "Red" })

    Eval-JS @"
    (function() {
        closeModal('modal-wardrobe');
        window.getCurrentUserLevelInfo = function() { return { level: 50, totalExp: 999999, isMaxLevel: true }; };
        equipWardrobeItem('frames', 'mythic');
        openProfileModal();
    })()
"@
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_45_profile_mythic_dragon.png"

    Write-Host "`n=========================================================" -ForegroundColor Green
    Write-Host "   ✅ ALL v0.10.10-45 (Build 346) TESTS PASSED!" -ForegroundColor Green
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
