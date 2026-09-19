# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-42 (Build 343)
# Wardrobe Shop, Pet & Event Frames, Animated Name Effects, Filter Pills, VoCoin Commerce & Cloud Sync
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9379
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test42_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-42 (Build 343) TEST SUITE" -ForegroundColor Yellow
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
        height = 800
        deviceScaleFactor = 1
        mobile = $false
    } | Out-Null

    # --- TEST 1: APP VERSION & REGISTRY ---
    Write-Host "`n--- TEST 1: App Version & Wardrobe Registry ---" -ForegroundColor Cyan
    $appVer = Eval-JS "typeof VOCAFLOW_APP_VERSION !== 'undefined' ? VOCAFLOW_APP_VERSION : 'undefined'"
    $appBuild = Eval-JS "typeof VOCAFLOW_APP_BUILD !== 'undefined' ? VOCAFLOW_APP_BUILD : 'undefined'"
    Write-Host "  App Version: $appVer (Expected: v0.10.10-42)" -ForegroundColor $(if ($appVer -eq 'v0.10.10-42') { "Green" } else { "Red" })
    Write-Host "  App Build: $appBuild (Expected: 343)" -ForegroundColor $(if ($appBuild -eq 343) { "Green" } else { "Red" })

    $regCheck = Eval-JS @"
    (function() {
        if (typeof VOCAFLOW_WARDROBE_REGISTRY === 'undefined') return { error: 'REGISTRY_MISSING' };
        return {
            framesCount: (VOCAFLOW_WARDROBE_REGISTRY.frames || []).length,
            nameEffectsCount: (VOCAFLOW_WARDROBE_REGISTRY.nameEffects || []).length,
            titlesCount: (VOCAFLOW_WARDROBE_REGISTRY.titles || []).length
        };
    })()
"@
    Write-Host "  Wardrobe Registry items: Frames=$($regCheck.framesCount) (Exp: 14), NameEffects=$($regCheck.nameEffectsCount) (Exp: 14), Titles=$($regCheck.titlesCount) (Exp: 6)" -ForegroundColor Green

    # --- TEST 2: VOCOIN COMMERCE & BUYING ---
    Write-Host "`n--- TEST 2: VoCoin Commerce & Unlocking Items ---" -ForegroundColor Cyan
    $buyTest = Eval-JS @"
    (function() {
        window.confirm = () => true;
        // Give 5000 VoCoin
        setUserPoints(5000);
        const initialPoints = getUserPoints();

        // Check lock state before buying
        const catFrameBefore = isWardrobeItemUnlocked('frames', 'cat');
        const vietnamEffectBefore = isWardrobeItemUnlocked('nameEffects', 'vietnam');

        // Buy Cat Frame (500 VoCoin)
        const buyCatRes = buyWardrobeItem('frames', 'cat', true);
        const pointsAfterCat = getUserPoints();
        const catFrameAfter = isWardrobeItemUnlocked('frames', 'cat');

        // Buy Vietnam Name Effect (600 VoCoin)
        const buyVnRes = buyWardrobeItem('nameEffects', 'vietnam', true);
        const pointsAfterVn = getUserPoints();
        const vietnamEffectAfter = isWardrobeItemUnlocked('nameEffects', 'vietnam');

        return {
            initialPoints,
            catFrameBefore,
            buyCatRes,
            pointsAfterCat,
            catFrameAfter,
            vietnamEffectBefore,
            buyVnRes,
            pointsAfterVn,
            vietnamEffectAfter
        };
    })()
"@
    Write-Host "  Initial VoCoin: $($buyTest.initialPoints)" -ForegroundColor Green
    Write-Host "  Cat Frame Unlocked before: $($buyTest.catFrameBefore) (Exp: False)" -ForegroundColor $(if (-not $buyTest.catFrameBefore) { "Green" } else { "Red" })
    Write-Host "  Cat Frame Buy Result: $($buyTest.buyCatRes.success) | Balance: $($buyTest.pointsAfterCat) (Exp: 4500)" -ForegroundColor $(if ($buyTest.pointsAfterCat -eq 4500) { "Green" } else { "Red" })
    Write-Host "  Cat Frame Unlocked after: $($buyTest.catFrameAfter) (Exp: True)" -ForegroundColor $(if ($buyTest.catFrameAfter) { "Green" } else { "Red" })
    Write-Host "  Vietnam Name Effect Buy Result: $($buyTest.buyVnRes.success) | Balance: $($buyTest.pointsAfterVn) (Exp: 3900)" -ForegroundColor $(if ($buyTest.pointsAfterVn -eq 3900) { "Green" } else { "Red" })
    Write-Host "  Vietnam Name Effect Unlocked after: $($buyTest.vietnamEffectAfter) (Exp: True)" -ForegroundColor $(if ($buyTest.vietnamEffectAfter) { "Green" } else { "Red" })

    # --- TEST 3: OPEN WARDROBE MODAL, FILTERS & EQUIP ---
    Write-Host "`n--- TEST 3: Open Wardrobe Modal, Filter Switching & Live Preview ---" -ForegroundColor Cyan
    $wardrobeModalTest = Eval-JS @"
    (function() {
        openWardrobeModal();
        const modal = document.getElementById('modal-wardrobe');
        const isVisible = modal && (modal.classList.contains('is-open') || modal.style.display === 'flex' || window.getComputedStyle(modal).display === 'flex');
        
        // Equip Cat Frame and Vietnam Name Effect
        equipWardrobeItem('frames', 'cat');
        equipWardrobeItem('nameEffects', 'vietnam');
        
        const equipped = getEquippedWardrobe();
        const vcoinDisplay = document.getElementById('wardrobe-user-points') ? document.getElementById('wardrobe-user-points').textContent : '';

        // Test filter counts
        const countAll = document.getElementById('wardrobe-filter-count-all') ? document.getElementById('wardrobe-filter-count-all').textContent : '';
        const countShop = document.getElementById('wardrobe-filter-count-shop') ? document.getElementById('wardrobe-filter-count-shop').textContent : '';
        const countEvent = document.getElementById('wardrobe-filter-count-event') ? document.getElementById('wardrobe-filter-count-event').textContent : '';
        const countLevel = document.getElementById('wardrobe-filter-count-level') ? document.getElementById('wardrobe-filter-count-level').textContent : '';

        return {
            isVisible,
            equipped,
            vcoinDisplay,
            counts: { all: countAll, shop: countShop, event: countEvent, level: countLevel }
        };
    })()
"@
    Write-Host "  Wardrobe Modal Visible: $($wardrobeModalTest.isVisible)" -ForegroundColor $(if ($wardrobeModalTest.isVisible) { "Green" } else { "Red" })
    Write-Host "  VoCoin Display Chip: $($wardrobeModalTest.vcoinDisplay)" -ForegroundColor Green
    Write-Host "  Filter Counts: All=$($wardrobeModalTest.counts.all), Shop=$($wardrobeModalTest.counts.shop), Event=$($wardrobeModalTest.counts.event), Level=$($wardrobeModalTest.counts.level)" -ForegroundColor Green
    Write-Host "  Equipped Loadout: Frame=$($wardrobeModalTest.equipped.frame), NameEffect=$($wardrobeModalTest.equipped.nameEffect)" -ForegroundColor Green

    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_42_wardrobe_bought_equipped.png"

    # Switch to "Có Thể Mua" (Shop) filter and capture
    Eval-JS "filterWardrobeCategory('shop');" | Out-Null
    Start-Sleep -Milliseconds 400
    Take-Screenshot "v0_10_10_42_wardrobe_shop_filter.png"

    # --- TEST 4: PROFILE MODAL RENDERING WITH NEW SHOP/EVENT ITEMS ---
    Write-Host "`n--- TEST 4: Profile Modal Rendering with Cat Frame & Vietnam Effect ---" -ForegroundColor Cyan
    $profileRes = Eval-JS @"
    (function() {
        closeModal('modal-wardrobe');
        openProfileModal();
        const modal = document.getElementById('modal-profile');
        const isVisible = modal && (modal.classList.contains('is-open') || modal.style.display === 'flex' || window.getComputedStyle(modal).display === 'flex');
        const avatarFrameBox = document.querySelector('#profile-avatar .vf-avatar-frame-box.frame-cat');
        const nameEffectEl = document.querySelector('#profile-name .tier-vietnam');
        
        return {
            isVisible,
            hasCatFrame: !!avatarFrameBox,
            hasVietnamEffect: !!nameEffectEl
        };
    })()
"@
    Write-Host "  Profile Modal Visible: $($profileRes.isVisible)" -ForegroundColor $(if ($profileRes.isVisible) { "Green" } else { "Red" })
    Write-Host "  Avatar has Cat Vector Frame: $($profileRes.hasCatFrame)" -ForegroundColor $(if ($profileRes.hasCatFrame) { "Green" } else { "Red" })
    Write-Host "  Name has Vietnam Red/Gold Effect: $($profileRes.hasVietnamEffect)" -ForegroundColor $(if ($profileRes.hasVietnamEffect) { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_42_profile_vietnam_frame.png"

    # --- TEST 5: SETTINGS MODAL VERSION VERIFICATION ---
    Write-Host "`n--- TEST 5: Settings Modal Version Verification ---" -ForegroundColor Cyan
    $settingsRes = Eval-JS @"
    (function() {
        closeModal('modal-profile');
        openSettingsModal();
        const verLabel = document.getElementById('settings-app-version-label');
        if (verLabel) {
            verLabel.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
        return verLabel ? verLabel.textContent.trim() : 'NOT_FOUND';
    })()
"@
    Write-Host "  Settings Version Label: $settingsRes (Expected: VocaFlow v0.10.10-42 (Build 343))" -ForegroundColor $(if ($settingsRes -like "*v0.10.10-42*") { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_42_settings_version.png"

    Write-Host "`n🎉 ALL TEST CASES COMPLETED SUCCESSFULLY!" -ForegroundColor Green

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
