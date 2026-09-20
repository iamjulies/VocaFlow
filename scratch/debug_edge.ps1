[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$port = 9387
$htmlPath = "C:/Users/DELL/Documents/Modding/browser/vocaflow.html"
$fileUrl = "file:///$htmlPath"
$tempUserData = Join-Path $env:TEMP ("edge_cdp_test43_" + (Get-Random))

$edgeProcess = Start-Process -FilePath $edgePath -ArgumentList @(
    "--remote-debugging-port=$port",
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--user-data-dir=$tempUserData"
) -PassThru

Start-Sleep -Seconds 3

try {
    $endpoints = Invoke-RestMethod -Uri "http://localhost:$port/json" -TimeoutSec 10
    $pageTarget = $endpoints | Where-Object { $_.type -eq "page" } | Select-Object -First 1

    $wsUrl = $pageTarget.webSocketDebuggerUrl
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $ws.ConnectAsync((New-Object System.Uri($wsUrl)), $cts.Token).Wait(4000) | Out-Null

    $global:cdpMsgId = 1000
    $global:events = [System.Collections.Generic.List[string]]::new()

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
            if ($parsed.method) {
                $global:events.Add("$($parsed.method): $($parsed.params | ConvertTo-Json -Compress)")
            }
            if ($parsed.id -eq $msgId) { return $parsed }
        }
        return $null
    }

    Send-CDPCommand "Runtime.enable" | Out-Null
    Send-CDPCommand "Log.enable" | Out-Null
    Send-CDPCommand "Page.enable" | Out-Null

    Write-Host "Navigating to: $fileUrl"
    Send-CDPCommand "Page.navigate" @{ url = $fileUrl } | Out-Null
    Start-Sleep -Seconds 4

    # Drain any incoming events
    $ms = New-Object System.IO.MemoryStream
    $buffer = New-Object byte[] 65536
    for ($i = 0; $i -lt 20; $i++) {
        $ctsQuick = New-Object System.Threading.CancellationTokenSource
        $ctsQuick.CancelAfter(200)
        try {
            $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
            $recvResult = $ws.ReceiveAsync($segment, $ctsQuick.Token).Result
            $respStr = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $recvResult.Count)
            $parsed = $respStr | ConvertFrom-Json
            if ($parsed.method) {
                $global:events.Add("$($parsed.method): $($parsed.params | ConvertTo-Json -Compress)")
            }
        } catch {
            break
        }
    }

    Write-Host "`nCaptured Events count: $($global:events.Count)"
    foreach ($evt in $global:events) {
        Write-Host "  $evt" -ForegroundColor Yellow
    }

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
