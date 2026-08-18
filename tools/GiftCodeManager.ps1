# VocaFlow Publisher Gift Code Manager (PowerShell Edition)
$RTDB_URL = "https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app"

function Show-Menu {
    Clear-Host
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "👑 VOCAFLOW PUBLISHER GIFT CODE STUDIO (POWERSHELL)" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "1. Xem danh sach ma qua tang tren Cloud"
    Write-Host "2. Tao ma qua tang moi phat hanh len Cloud"
    Write-Host "3. Xoa ma qua tang khoi Cloud"
    Write-Host "4. Thoat"
    Write-Host ""
}

function List-Codes {
    try {
        $res = Invoke-RestMethod -Uri "$RTDB_URL/giftCodes.json" -Method Get
        Write-Host "`n--- DANH SACH MA QUANG TANG TRUCTUYEN ---" -ForegroundColor Green
        if (-not $res) {
            Write-Host "Chua co ma nao tren Cloud." -ForegroundColor DarkGray
        } else {
            $res.PSObject.Properties | ForEach-Object {
                $c = $_.Value
                Write-Host "🎁 MA: $($c.code) | +$($c.hints) Goi Y | +$($c.points)d | Ngay: $($c.createdAt.Substring(0,10))" -ForegroundColor Cyan
            }
        }
    } catch {
        Write-Host "Loi ket noi: $_" -ForegroundColor Red
    }
}

function Create-Code {
    $code = Read-Host "Nhap ten ma (vd: SUMMER50, EVENT2026)"
    $code = $code.Trim().ToUpper()
    if (-not $code) { return }
    $hints = [int](Read-Host "So luot goi y tang (vd: 50)")
    $points = [int](Read-Host "So diem vi tang (vd: 200)")

    $payload = @{
        code = $code
        hints = $hints
        points = $points
        isActive = $true
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    } | ConvertTo-Json

    try {
        $res = Invoke-RestMethod -Uri "$RTDB_URL/giftCodes/$code.json" -Method Put -Body $payload -ContentType "application/json"
        Write-Host "`n🎉 Phat hanh thanh cong ma '$code' len Cloud (+${hints} Goi Y, +${points}d)!" -ForegroundColor Green
    } catch {
        Write-Host "Loi phat hanh: $_" -ForegroundColor Red
    }
}

function Delete-Code {
    $code = Read-Host "Nhap ma can xoa khoi Cloud"
    $code = $code.Trim().ToUpper()
    if (-not $code) { return }
    try {
        Invoke-RestMethod -Uri "$RTDB_URL/giftCodes/$code.json" -Method Delete
        Write-Host "`n🗑️ Da xoa ma '$code' khoi Cloud!" -ForegroundColor Yellow
    } catch {
        Write-Host "Loi xoa: $_" -ForegroundColor Red
    }
}

# Main Loop
while ($true) {
    Show-Menu
    $choice = Read-Host "Chon thao tac (1-4)"
    switch ($choice) {
        "1" { List-Codes; Read-Host "`nNhan Enter de tiep tuc..." }
        "2" { Create-Code; Read-Host "`nNhan Enter de tiep tuc..." }
        "3" { Delete-Code; Read-Host "`nNhan Enter de tiep tuc..." }
        "4" { exit }
    }
}
