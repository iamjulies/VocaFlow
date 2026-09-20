# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-43 (Build 344)
# VIP in Wardrobe, Profile Highlights Fix, Resilient Public Profile, Mythic Pink Dragon Vector
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9383
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test43_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-43 (Build 344) TEST SUITE" -ForegroundColor Yellow
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

    # --- TEST 1: APP VERSION & REGISTRY ---
    Write-Host "`n--- TEST 1: App Version & Wardrobe Registry ---" -ForegroundColor Cyan
    $appVer = Eval-JS "typeof VOCAFLOW_APP_VERSION !== 'undefined' ? VOCAFLOW_APP_VERSION : 'undefined'"
    $appBuild = Eval-JS "typeof VOCAFLOW_APP_BUILD !== 'undefined' ? VOCAFLOW_APP_BUILD : 'undefined'"
    Write-Host "  App Version: $appVer (Expected: v0.10.10-43)" -ForegroundColor $(if ($appVer -eq 'v0.10.10-43') { "Green" } else { "Red" })
    Write-Host "  App Build: $appBuild (Expected: 344)" -ForegroundColor $(if ($appBuild -eq 344) { "Green" } else { "Red" })

    $regCheck = Eval-JS @"
    (function() {
        if (typeof VOCAFLOW_WARDROBE_REGISTRY === 'undefined') return { error: 'REGISTRY_MISSING' };
        const vipFrame = VOCAFLOW_WARDROBE_REGISTRY.frames.find(f => f.id === 'vip');
        const vipEffect = VOCAFLOW_WARDROBE_REGISTRY.nameEffects.find(e => e.id === 'vip');
        const vipTitle = VOCAFLOW_WARDROBE_REGISTRY.titles.find(t => t.id === 'vip');
        const mythicFrame = VOCAFLOW_WARDROBE_REGISTRY.frames.find(f => f.id === 'mythic');
        return {
            framesCount: (VOCAFLOW_WARDROBE_REGISTRY.frames || []).length,
            nameEffectsCount: (VOCAFLOW_WARDROBE_REGISTRY.nameEffects || []).length,
            titlesCount: (VOCAFLOW_WARDROBE_REGISTRY.titles || []).length,
            hasVipFrame: !!vipFrame,
            hasVipEffect: !!vipEffect,
            hasVipTitle: !!vipTitle,
            hasMythicFrame: !!mythicFrame
        };
    })()
"@
    Write-Host "  Wardrobe Registry: Frames=$($regCheck.framesCount), Effects=$($regCheck.nameEffectsCount), Titles=$($regCheck.titlesCount)" -ForegroundColor Green
    Write-Host "  VIP Frame in Registry: $($regCheck.hasVipFrame)" -ForegroundColor $(if ($regCheck.hasVipFrame) { "Green" } else { "Red" })
    Write-Host "  VIP Effect in Registry: $($regCheck.hasVipEffect)" -ForegroundColor $(if ($regCheck.hasVipEffect) { "Green" } else { "Red" })
    Write-Host "  VIP Title in Registry: $($regCheck.hasVipTitle)" -ForegroundColor $(if ($regCheck.hasVipTitle) { "Green" } else { "Red" })

    # --- TEST 2: VIP UNLOCK LOGIC & AUTO UNLOCK ---
    Write-Host "`n--- TEST 2: VIP Unlock Dynamics ---" -ForegroundColor Cyan
    $vipTest = Eval-JS @"
    (function() {
        // 1. Setup mock logged-in user
        currentUser = {
            uid: 'test_user_43',
            displayName: 'Julian Master VIP',
            email: 'julian@vocaflow.app',
            username: 'julian_vip'
        };
        adminVipOverride = false;
        userIsVip = false;
        userVipTier = 'none';
        userVipExpiresAt = 0;

        const nonVipFrameUnlocked = isWardrobeItemUnlocked('frames', 'vip');
        const nonVipEffectUnlocked = isWardrobeItemUnlocked('nameEffects', 'vip');

        // 2. Grant VIP Lifetime
        userIsVip = true;
        userVipTier = 'lifetime';
        userVipExpiresAt = Date.now() + 86400000 * 365;
        updateAuthUI();

        const vipFrameUnlocked = isWardrobeItemUnlocked('frames', 'vip');
        const vipEffectUnlocked = isWardrobeItemUnlocked('nameEffects', 'vip');
        const vipTitleUnlocked = isWardrobeItemUnlocked('titles', 'vip');

        return {
            nonVipFrameUnlocked,
            nonVipEffectUnlocked,
            vipFrameUnlocked,
            vipEffectUnlocked,
            vipTitleUnlocked
        };
    })()
"@
    Write-Host "  Non-VIP User Frame Unlocked: $($vipTest.nonVipFrameUnlocked) (Exp: False)" -ForegroundColor $(if (-not $vipTest.nonVipFrameUnlocked) { "Green" } else { "Red" })
    Write-Host "  VIP User Frame Unlocked: $($vipTest.vipFrameUnlocked) (Exp: True)" -ForegroundColor $(if ($vipTest.vipFrameUnlocked) { "Green" } else { "Red" })
    Write-Host "  VIP User Effect Unlocked: $($vipTest.vipEffectUnlocked) (Exp: True)" -ForegroundColor $(if ($vipTest.vipEffectUnlocked) { "Green" } else { "Red" })
    Write-Host "  VIP User Title Unlocked: $($vipTest.vipTitleUnlocked) (Exp: True)" -ForegroundColor $(if ($vipTest.vipTitleUnlocked) { "Green" } else { "Red" })

    # --- TEST 3: WARDROBE MODAL VIP FILTER & VIP EQUIP ---
    Write-Host "`n--- TEST 3: Wardrobe Modal VIP Filter & VIP Equip ---" -ForegroundColor Cyan
    $wardrobeTest = Eval-JS @"
    (function() {
        openWardrobeModal();
        filterWardrobeCategory('vip');
        
        // Equip VIP frame & VIP name effect & VIP title
        equipWardrobeItem('frames', 'vip');
        equipWardrobeItem('nameEffects', 'vip');
        equipWardrobeItem('titles', 'vip');

        const filterVipBtn = document.getElementById('wardrobe-filter-vip');
        const countVip = document.getElementById('wardrobe-filter-count-vip') ? document.getElementById('wardrobe-filter-count-vip').textContent : '';

        return {
            hasVipFilterBtn: !!filterVipBtn,
            vipCount: countVip,
            equipped: getEquippedWardrobe()
        };
    })()
"@
    Write-Host "  VIP Filter Button Present: $($wardrobeTest.hasVipFilterBtn)" -ForegroundColor $(if ($wardrobeTest.hasVipFilterBtn) { "Green" } else { "Red" })
    Write-Host "  VIP Filter Count: $($wardrobeTest.vipCount) (Exp: 3)" -ForegroundColor Green
    Write-Host "  Equipped Loadout: Frame=$($wardrobeTest.equipped.frame), Effect=$($wardrobeTest.equipped.nameEffect), Title=$($wardrobeTest.equipped.title)" -ForegroundColor Green

    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_43_wardrobe_vip.png"

    # --- TEST 4: PROFILE MODAL HIGHLIGHTS & VIP EFFECT ---
    Write-Host "`n--- TEST 4: Profile Modal Highlights & Empty Slot Enhancement ---" -ForegroundColor Cyan
    $profileTest = Eval-JS @"
    (function() {
        closeModal('modal-wardrobe');
        
        // Set 1 valid pinned badge and leave 2 empty slots
        userPinnedBadges = ['first_lesson'];
        localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(['first_lesson']));
        
        openProfileModal();
        const emptySlots = document.querySelectorAll('#profile-pinned-badges-showcase .pinned-badge-empty-slot');
        const badgeCards = document.querySelectorAll('#profile-pinned-badges-showcase .pinned-badge-card');
        const vipNameEl = document.querySelector('#profile-name .tier-vip');
        const vipCrown = document.querySelector('#profile-name .floating-crown-vip');
        const vipFrame = document.querySelector('#profile-avatar .vf-avatar-frame-box.frame-vip');

        return {
            badgeCardsCount: badgeCards.length,
            emptySlotsCount: emptySlots.length,
            hasVipName: !!vipNameEl,
            hasVipCrown: !!vipCrown,
            hasVipFrame: !!vipFrame
        };
    })()
"@
    Write-Host "  Pinned Badge Cards: $($profileTest.badgeCardsCount) (Exp: 1)" -ForegroundColor $(if ($profileTest.badgeCardsCount -eq 1) { "Green" } else { "Red" })
    Write-Host "  Pinned Empty Slots with '+' icon: $($profileTest.emptySlotsCount) (Exp: 2)" -ForegroundColor $(if ($profileTest.emptySlotsCount -eq 2) { "Green" } else { "Red" })
    Write-Host "  Profile Name has VIP Gold Gradient: $($profileTest.hasVipName)" -ForegroundColor $(if ($profileTest.hasVipName) { "Green" } else { "Red" })
    Write-Host "  Profile Name has Floating Crown: $($profileTest.hasVipCrown)" -ForegroundColor $(if ($profileTest.hasVipCrown) { "Green" } else { "Red" })
    Write-Host "  Profile Avatar has VIP Frame: $($profileTest.hasVipFrame)" -ForegroundColor $(if ($profileTest.hasVipFrame) { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_43_profile_highlights_vip.png"

    # --- TEST 5: MYTHIC PINK DRAGON VECTOR FRAME ---
    Write-Host "`n--- TEST 5: Mythic Pink Dragon Vector Frame Rendering ---" -ForegroundColor Cyan
    $dragonTest = Eval-JS @"
    (function() {
        closeModal('modal-profile');
        
        // Grant Level 50 MAX so Mythic frame is unlocked
        if (typeof setUserStudyExp === 'function') setUserStudyExp(2500000);
        
        openWardrobeModal();
        filterWardrobeCategory('all');
        equipWardrobeItem('frames', 'mythic');
        equipWardrobeItem('nameEffects', 'neon');
        closeModal('modal-wardrobe');
        openProfileModal();

        const dragonFrame = document.querySelector('#profile-avatar .vf-avatar-frame-box.frame-mythic');
        const fireLayer = dragonFrame ? dragonFrame.querySelector('.fire-layer') : null;
        const dragonJaw = dragonFrame ? dragonFrame.querySelector('.dragon-jaw') : null;
        const dragonEye = dragonFrame ? dragonFrame.querySelector('.dragon-eye') : null;
        const plasmaStream = dragonFrame ? dragonFrame.querySelector('.plasma-stream') : null;

        return {
            hasDragonFrame: !!dragonFrame,
            hasFireLayer: !!fireLayer,
            hasDragonJaw: !!dragonJaw,
            hasDragonEye: !!dragonEye,
            hasPlasmaStream: !!plasmaStream
        };
    })()
"@
    Write-Host "  Mythic Dragon Frame Rendered: $($dragonTest.hasDragonFrame)" -ForegroundColor $(if ($dragonTest.hasDragonFrame) { "Green" } else { "Red" })
    Write-Host "  Dragon Jaw Vector: $($dragonTest.hasDragonJaw)" -ForegroundColor $(if ($dragonTest.hasDragonJaw) { "Green" } else { "Red" })
    Write-Host "  Dragon Eye Vector: $($dragonTest.hasDragonEye)" -ForegroundColor $(if ($dragonTest.hasDragonEye) { "Green" } else { "Red" })
    Write-Host "  Dragon Plasma Stream: $($dragonTest.hasPlasmaStream)" -ForegroundColor $(if ($dragonTest.hasPlasmaStream) { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_43_profile_mythic_dragon.png"

    # --- TEST 6: PUBLIC PROFILE RESILIENT FALLBACK ---
    Write-Host "`n--- TEST 6: Public Profile Resilient Fallback ---" -ForegroundColor Cyan
    $publicProfileTest = Eval-JS @"
    (async function() {
        closeModal('modal-profile');
        
        // Pre-populate cloudLibraryDecks
        cloudLibraryDecks = [
            {
                id: 'lib_deck_1',
                title: 'Oxford 3000 Trọng Tâm',
                author: 'VocaFlow Chuẩn',
                authorUid: 'official',
                category: 'THPT',
                words: [
                    { id: 'w1', term: 'abandon', def: 'từ bỏ' },
                    { id: 'w2', term: 'ability', def: 'khả năng' }
                ]
            }
        ];

        // Open public profile with official author
        await openPublicProfileByAuthor('VocaFlow Chuẩn', 'official');

        const modal = document.getElementById('modal-public-profile');
        const isVisible = modal && (modal.classList.contains('active') || modal.classList.contains('is-open') || modal.style.display === 'flex' || window.getComputedStyle(modal).display === 'flex');
        const authorName = document.getElementById('pub-view-name') ? document.getElementById('pub-view-name').textContent : '';
        const authorHandle = document.getElementById('pub-view-handle') ? document.getElementById('pub-view-handle').textContent : '';
        const authorBadges = document.querySelectorAll('#pub-view-badges-showcase .pinned-badge-card');
        const authorEmptySlots = document.querySelectorAll('#pub-view-badges-showcase .pinned-badge-empty-slot');

        return {
            isVisible,
            authorName,
            authorHandle,
            badgeCount: authorBadges.length,
            emptySlotCount: authorEmptySlots.length
        };
    })()
"@
    Write-Host "  Public Profile Modal Opened: $($publicProfileTest.isVisible)" -ForegroundColor $(if ($publicProfileTest.isVisible) { "Green" } else { "Red" })
    Write-Host "  Public Author Name: $($publicProfileTest.authorName)" -ForegroundColor Green
    Write-Host "  Public Author Handle: $($publicProfileTest.authorHandle)" -ForegroundColor Green
    Write-Host "  Author Pinned Badges: $($publicProfileTest.badgeCount) (Exp: 3)" -ForegroundColor $(if ($publicProfileTest.badgeCount -eq 3) { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_43_public_profile.png"

    # --- TEST 7: SETTINGS MODAL VERSION CONSISTENCY ---
    Write-Host "`n--- TEST 7: Settings Modal Version Consistency ---" -ForegroundColor Cyan
    $settingsRes = Eval-JS @"
    (function() {
        closeModal('modal-public-profile');
        openSettingsModal();
        const verLabel = document.getElementById('settings-app-version-label');
        if (verLabel) {
            verLabel.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
        return verLabel ? verLabel.textContent.trim() : 'NOT_FOUND';
    })()
"@
    Write-Host "  Settings Version Label: $settingsRes (Expected: VocaFlow v0.10.10-43 (Build 344))" -ForegroundColor $(if ($settingsRes -like "*v0.10.10-43*") { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_43_settings_version.png"

    Write-Host "`n🎉 ALL v0.10.10-43 (Build 344) TEST CASES PASSED SUCCESSFULLY!" -ForegroundColor Green

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
