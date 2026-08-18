# VocaFlow Publisher - Excel / JSON Deck to Global Cloud Library Tool
param(
    [string]$FilePath,
    [string]$Title,
    [string]$Description = "Bộ từ vựng chia sẻ từ VocaFlow Publisher",
    [string]$Category = "THPT",
    [string]$Icon = "📘"
)

$RTDB_URL = "https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app"

if (-not $FilePath) {
    Write-Host "==================================================" -ForegroundColor Yellow
    Write-Host "🚀 VOCAFLOW CLOUD DECK PUBLISHER" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Yellow
    $FilePath = Read-Host "Nhap duong dan file Excel (.xlsx) hoac JSON"
}

if (-not (Test-Path $FilePath)) {
    Write-Host "❌ File khong ton tai: $FilePath" -ForegroundColor Red
    exit
}

if (-not $Title) {
    $Title = Read-Host "Nhap Ten Bo Tu (vd: Tieng Anh 10 Global Success, IELTS 500)"
}

Write-Host "`n⏳ Dang doc va xu ly du lieu tu: $FilePath ..." -ForegroundColor Cyan

# If JSON
if ($FilePath.EndsWith(".json")) {
    $jsonRaw = Get-Content $FilePath -Raw -Encoding UTF8
    $words = $jsonRaw | ConvertFrom-Json
    if ($words -is [PSCustomObject] -and $words.words) { $words = $words.words }
} else {
    Write-Host "Doi voi Excel, ban co the upload truc tiep tren giao dien VocaFlow hoac chuyen sang JSON!"
    exit
}

$deckId = "pub_deck_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$payload = @{
    id = $deckId
    title = $Title
    description = $Description
    category = $Category
    icon = $Icon
    totalWords = $words.Count
    words = $words
    publishedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json -Depth 5

$url = "$RTDB_URL/publicLibraryDecks/$deckId.json"
Invoke-RestMethod -Uri $url -Method Put -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -ContentType "application/json; charset=utf-8"
Write-Host "🎉 Phat hanh thanh cong bo tu '$Title' ($($words.Count) tu) len Thu Vien Toan Cau!" -ForegroundColor Green
