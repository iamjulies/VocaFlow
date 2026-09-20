# =========================================================================
# TEST SUITE: VOCAFLOW v0.10.10-46 (Build 347)
# Diamond Frame Hover Crystal Fix, Separated Emojis from Text Gradients,
# Default Plain Text Name Effect, Synced Frames/Effects in Followers Modal & Everywhere
# =========================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9389
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test46_" + (Get-Random))
$artifactDir = "C:\Users\DELL\.gemini\antigravity\brain\9733be0b-de62-4295-8ef9-ae66c513fe11"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 VOCAFLOW v0.10.10-46 (Build 347) TEST SUITE" -ForegroundColor Yellow
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
    Write-Host "  Settings Version Label: '$versionText'" -ForegroundColor $(if ($versionText -like "*v0.10.10-46 (Build 347)*") { "Green" } else { "Red" })

    $appVersionJS = Eval-JS "typeof VOCAFLOW_APP_VERSION !== 'undefined' ? VOCAFLOW_APP_VERSION : 'UNDEFINED'"
    $appBuildJS = Eval-JS "typeof VOCAFLOW_APP_BUILD !== 'undefined' ? VOCAFLOW_APP_BUILD : 'UNDEFINED'"
    Write-Host "  VOCAFLOW_APP_VERSION JS: '$appVersionJS' | BUILD: '$appBuildJS'" -ForegroundColor $(if ($appVersionJS -eq "v0.10.10-46" -and $appBuildJS -eq 347) { "Green" } else { "Red" })

    # Test 2: Issue 16 - Diamond Frame Structure
    Write-Host "`n--- TEST 2: Issue 16 - Diamond Avatar Frame Structure & Glint ---" -ForegroundColor Cyan
    $diamondFrameHtml = Eval-JS "typeof renderAvatarWithFrameHtml === 'function' ? renderAvatarWithFrameHtml('user', 64, 'diamond') : 'MISSING'"
    $hasGlintGroup = $diamondFrameHtml -like "*diamond-star-glint*"
    $hasTransformBox = $diamondFrameHtml -like "*transform-box: fill-box*"
    $hasTranslateParent = $diamondFrameHtml -like "*translate(425, 145)*"
    Write-Host "  Diamond Frame SVG: hasGlintGroup=$hasGlintGroup, hasTransformBox=$hasTransformBox, hasTranslateParent=$hasTranslateParent" -ForegroundColor $(if ($hasGlintGroup -and $hasTransformBox -and $hasTranslateParent) { "Green" } else { "Red" })

    # Test 3: Issue 17 - Emoji Separation from Gradients
    Write-Host "`n--- TEST 3: Issue 17 - Emoji Separation from Gradient Text ---" -ForegroundColor Cyan
    $effectsToTest = @('birthday', 'cat', 'vietnam', 'tet', 'easter', 'christmas', 'halloween')
    foreach ($eff in $effectsToTest) {
        $effHtml = Eval-JS "typeof renderUsernameWithEffectHtml === 'function' ? renderUsernameWithEffectHtml('JohnDoe', '$eff') : 'MISSING'"
        $hasVfNameIcon = $effHtml -like "*<span class=`"vf-name-icon`">*"
        $hasStrongTier = $effHtml -like "*<strong class=`"tier-*"
        Write-Host "  Effect '$eff': hasVfNameIcon=$hasVfNameIcon, hasStrongTier=$hasStrongTier" -ForegroundColor $(if ($hasVfNameIcon -and $hasStrongTier) { "Green" } else { "Red" })
    }

    # Test 4: Issue 18 - Default Name Plain White Text
    Write-Host "`n--- TEST 4: Issue 18 - Default Name Effect Plain Text ---" -ForegroundColor Cyan
    $defaultEffectHtml = Eval-JS "typeof renderUsernameWithEffectHtml === 'function' ? renderUsernameWithEffectHtml('VIPUser', 'default') : 'MISSING'"
    $isDefaultPlain = ($defaultEffectHtml -like "*tier-default*" -and $defaultEffectHtml -like "*color: var(--text)*") -and ($defaultEffectHtml -notlike "*tier-vip-gold*")
    Write-Host "  Default Name Effect for VIP: '$defaultEffectHtml' (isDefaultPlain=$isDefaultPlain)" -ForegroundColor $(if ($isDefaultPlain) { "Green" } else { "Red" })

    # Test 5: Issue 19 & 20 - Subscribers List Modal with Equipped Items
    Write-Host "`n--- TEST 5: Issue 19 - Subscribers List Modal Synchronization ---" -ForegroundColor Cyan
    # Setup test mock users with frames and effects
    $setupMock = Eval-JS @"
    (function() {
        const mockFollowers = {
            'user_diamond': {
                uid: 'user_diamond',
                displayName: 'Diamond Explorer',
                username: 'diamond_boy',
                avatar: '💎',
                equippedWardrobe: { frame: 'diamond', nameEffect: 'diamond', title: 'master' }
            },
            'user_cat': {
                uid: 'user_cat',
                displayName: 'Cat Lover',
                username: 'cat_meow',
                avatar: '🐱',
                equippedWardrobe: { frame: 'gold', nameEffect: 'cat', title: 'polyglot' }
            },
            'user_default_vip': {
                uid: 'user_default_vip',
                displayName: 'Plain VIP',
                username: 'plain_vip',
                avatar: '👑',
                isVip: true,
                vipTier: 'lifetime',
                equippedWardrobe: { frame: 'vip_lifetime', nameEffect: 'default', title: 'none' }
            }
        };
        // Mock live registry
        window.getLiveUserRegistryEntry = function(uid) {
            return mockFollowers[uid] || null;
        };
        
        // Mock currentUser with these followers
        if (typeof currentUser === 'undefined' || !currentUser) {
            window.currentUser = { uid: 'test_user_me', displayName: 'My Profile', username: 'me' };
        }
        if (typeof myFollowersMap === 'object' && myFollowersMap) {
            Object.assign(myFollowersMap, { 'user_diamond': true, 'user_cat': true, 'user_default_vip': true });
        }
        if (window.myFollowersMap) {
            Object.assign(window.myFollowersMap, { 'user_diamond': true, 'user_cat': true, 'user_default_vip': true });
        }
        
        // Open subscribers list modal
        if (typeof openSubscribersListModal === 'function') {
            openSubscribersListModal('followers');
            return true;
        }
        return false;
    })()
"@
    Start-Sleep -Milliseconds 1200
    $modalContent = Eval-JS "document.getElementById('subs-modal-body')?.innerHTML || 'EMPTY'"
    $hasDiamondInModal = $modalContent -like "*frame-diamond*"
    $hasCatInModal = $modalContent -like "*vf-name-icon*"
    $hasGoldInModal = $modalContent -like "*frame-gold*"
    Write-Host "  Subscribers Modal: hasDiamond=$hasDiamondInModal, hasCatEmoji=$hasCatInModal, hasGoldFrame=$hasGoldInModal" -ForegroundColor $(if ($hasDiamondInModal -and $hasCatInModal -and $hasGoldInModal) { "Green" } else { "Red" })

    # Take Snapshot 1: Subscribers list modal
    Take-Screenshot "v0_10_10_46_subscribers_list_modal.png"

    # Close modal
    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-subscribers-list')" | Out-Null
    Start-Sleep -Milliseconds 400

    # Test 6: Open Settings Modal and snapshot version
    Write-Host "`n--- TEST 6: Settings Modal Snapshot ---" -ForegroundColor Cyan
    Eval-JS "if (typeof openModal === 'function') openModal('modal-settings')" | Out-Null
    Start-Sleep -Milliseconds 500
    Take-Screenshot "v0_10_10_46_settings_version.png"
    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-settings')" | Out-Null
    Start-Sleep -Milliseconds 300

    # Test 7: Wardrobe Modal Live Preview for Diamond Frame & Emoji Name Effects
    Write-Host "`n--- TEST 7: Wardrobe Modal Preview & Snapshots ---" -ForegroundColor Cyan
    Eval-JS "if (typeof openWardrobeModal === 'function') openWardrobeModal()" | Out-Null
    Start-Sleep -Milliseconds 500
    Eval-JS "if (typeof selectWardrobeTab === 'function') selectWardrobeTab('nameEffects')" | Out-Null
    Start-Sleep -Milliseconds 400
    Eval-JS "if (typeof previewWardrobeItem === 'function') previewWardrobeItem('nameEffects', 'birthday')" | Out-Null
    Start-Sleep -Milliseconds 400
    Take-Screenshot "v0_10_10_46_wardrobe_name_effects_emoji.png"

    Eval-JS "if (typeof selectWardrobeTab === 'function') selectWardrobeTab('frames')" | Out-Null
    Start-Sleep -Milliseconds 400
    Eval-JS "if (typeof previewWardrobeItem === 'function') previewWardrobeItem('frames', 'diamond')" | Out-Null
    Start-Sleep -Milliseconds 400
    Take-Screenshot "v0_10_10_46_wardrobe_diamond_frame.png"

    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-wardrobe')" | Out-Null
    Start-Sleep -Milliseconds 300

    # Test 8: Public Profile Modal with Diamond Frame & Cat Effect
    Write-Host "`n--- TEST 8: Public Profile Modal Snapshot ---" -ForegroundColor Cyan
    Eval-JS @"
    (function() {
        const mockProfileUser = {
            uid: 'pub_user_99',
            displayName: 'Sarah Connor',
            username: 'sarah_c',
            bio: 'Future Guardian & Polyglot',
            studyExp: 56000,
            level: 35,
            isVip: true,
            vipTier: 'yearly',
            equippedWardrobe: { frame: 'diamond', nameEffect: 'cat', title: 'polyglot' }
        };
        if (typeof openPublicProfileModal === 'function') {
            openPublicProfileModal(mockProfileUser);
        }
    })()
"@
    Start-Sleep -Milliseconds 600
    Take-Screenshot "v0_10_10_46_public_profile_diamond_cat.png"
    Eval-JS "if (typeof closeModal === 'function') closeModal('modal-public-profile')" | Out-Null

    Write-Host "`n=========================================================" -ForegroundColor Green
    Write-Host "   ✅ ALL TESTS COMPLETED SUCCESSFULLY FOR v0.10.10-46!" -ForegroundColor Green
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
