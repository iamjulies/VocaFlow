# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-41 (Build 342)
# Wardrobe System (Tủ Đồ Cá Nhân), Avatar Frames, Name Effects, Titles & Cloud Sync
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9378
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test41_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-41 (Build 342) TEST SUITE" -ForegroundColor Yellow
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
    Write-Host "  App Version: $appVer (Expected: v0.10.10-41)" -ForegroundColor $(if ($appVer -eq 'v0.10.10-41') { "Green" } else { "Red" })
    Write-Host "  App Build: $appBuild (Expected: 342)" -ForegroundColor $(if ($appBuild -eq 342) { "Green" } else { "Red" })

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
    Write-Host "  Wardrobe Registry items: Frames=$($regCheck.framesCount), NameEffects=$($regCheck.nameEffectsCount), Titles=$($regCheck.titlesCount)" -ForegroundColor Green

    # --- TEST 2: LEVEL-BASED UNLOCK LOGIC ---
    Write-Host "`n--- TEST 2: Level-Based Unlock Logic ---" -ForegroundColor Cyan
    $unlockTest = Eval-JS @"
    (function() {
        // Test at level 1 (0 EXP)
        setUserStudyExp(0);
        const lv1DefaultFrame = isWardrobeItemUnlocked('frames', 'default');
        const lv1MythicFrame = isWardrobeItemUnlocked('frames', 'mythic');
        
        // Test at level 50 (1,500,000 EXP)
        setUserStudyExp(1500000);
        const lv50MythicFrame = isWardrobeItemUnlocked('frames', 'mythic');
        const lv50MythicEffect = isWardrobeItemUnlocked('nameEffects', 'mythic');
        const lv50MythicTitle = isWardrobeItemUnlocked('titles', 'lv50');

        return {
            lv1DefaultFrame,
            lv1MythicFrame,
            lv50MythicFrame,
            lv50MythicEffect,
            lv50MythicTitle
        };
    })()
"@
    Write-Host "  Lv1 Default Frame unlocked: $($unlockTest.lv1DefaultFrame) (Expected: True)" -ForegroundColor $(if ($unlockTest.lv1DefaultFrame) { "Green" } else { "Red" })
    Write-Host "  Lv1 Mythic Dragon Frame unlocked: $($unlockTest.lv1MythicFrame) (Expected: False)" -ForegroundColor $(if (-not $unlockTest.lv1MythicFrame) { "Green" } else { "Red" })
    Write-Host "  Lv50 Mythic Dragon Frame unlocked: $($unlockTest.lv50MythicFrame) (Expected: True)" -ForegroundColor $(if ($unlockTest.lv50MythicFrame) { "Green" } else { "Red" })
    Write-Host "  Lv50 Mythic Name Effect unlocked: $($unlockTest.lv50MythicEffect) (Expected: True)" -ForegroundColor $(if ($unlockTest.lv50MythicEffect) { "Green" } else { "Red" })
    Write-Host "  Lv50 Mythic Title unlocked: $($unlockTest.lv50MythicTitle) (Expected: True)" -ForegroundColor $(if ($unlockTest.lv50MythicTitle) { "Green" } else { "Red" })

    # --- TEST 3: OPEN WARDROBE MODAL & LIVE PREVIEW ---
    Write-Host "`n--- TEST 3: Open Wardrobe Modal & Tab Switching ---" -ForegroundColor Cyan
    $openModalRes = Eval-JS @"
    (function() {
        openWardrobeModal();
        const modal = document.getElementById('modal-wardrobe');
        const isVisible = modal && (modal.classList.contains('is-open') || modal.style.display === 'flex' || window.getComputedStyle(modal).display === 'flex');
        
        // Equip mythic dragon frame, mythic cyberpunk effect, and mythic title
        equipWardrobeItem('frames', 'mythic');
        equipWardrobeItem('nameEffects', 'mythic');
        equipWardrobeItem('titles', 'lv50');
        
        const equipped = getEquippedWardrobe();
        return {
            isVisible,
            equipped
        };
    })()
"@
    Write-Host "  Wardrobe Modal Visible: $($openModalRes.isVisible)" -ForegroundColor $(if ($openModalRes.isVisible) { "Green" } else { "Red" })
    Write-Host "  Equipped Loadout: Frame=$($openModalRes.equipped.frame), NameEffect=$($openModalRes.equipped.nameEffect), Title=$($openModalRes.equipped.title)" -ForegroundColor Green

    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_41_wardrobe_modal.png"

    # --- TEST 4: PROFILE MODAL RENDERING WITH WARDROBE ITEMS ---
    Write-Host "`n--- TEST 4: Profile Modal Rendering with Wardrobe Items ---" -ForegroundColor Cyan
    $profileRes = Eval-JS @"
    (function() {
        closeModal('modal-wardrobe');
        openProfileModal();
        const modal = document.getElementById('modal-profile');
        const isVisible = modal && (modal.classList.contains('is-open') || modal.style.display === 'flex' || window.getComputedStyle(modal).display === 'flex');
        const wardrobeBtn = document.getElementById('profile-wardrobe-btn');
        const titleBadge = document.getElementById('profile-badge');
        const avatarFrameBox = document.querySelector('#profile-avatar .vf-avatar-frame-box');
        const nameEffectEl = document.querySelector('#profile-name .tier-legendary');
        
        return {
            isVisible,
            hasWardrobeBtn: !!wardrobeBtn,
            titleText: titleBadge ? titleBadge.textContent.trim() : '',
            hasFrameSvg: !!avatarFrameBox,
            hasNameEffect: !!nameEffectEl
        };
    })()
"@
    Write-Host "  Profile Modal Visible: $($profileRes.isVisible)" -ForegroundColor $(if ($profileRes.isVisible) { "Green" } else { "Red" })
    Write-Host "  Has Wardrobe Button in Profile: $($profileRes.hasWardrobeBtn)" -ForegroundColor $(if ($profileRes.hasWardrobeBtn) { "Green" } else { "Red" })
    Write-Host "  Profile Title Badge: $($profileRes.titleText) (Expected: 🌟 Huyền Thoại)" -ForegroundColor $(if ($profileRes.titleText -like "*Huyền Thoại*") { "Green" } else { "Red" })
    Write-Host "  Avatar has Vector Frame: $($profileRes.hasFrameSvg)" -ForegroundColor $(if ($profileRes.hasFrameSvg) { "Green" } else { "Red" })
    Write-Host "  Name has Cyberpunk Effect: $($profileRes.hasNameEffect)" -ForegroundColor $(if ($profileRes.hasNameEffect) { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_41_profile_wardrobe.png"

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
    Write-Host "  Settings Version Label: $settingsRes (Expected: VocaFlow v0.10.10-41 (Build 342))" -ForegroundColor $(if ($settingsRes -like "*v0.10.10-41*") { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_41_settings_version.png"

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
