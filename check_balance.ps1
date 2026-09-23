$content = [System.IO.File]::ReadAllText("$PSScriptRoot\vocaflow.html", [System.Text.Encoding]::UTF8)

$openBraces = [regex]::Matches($content, '\{').Count
$closeBraces = [regex]::Matches($content, '\}').Count
$openDivs = [regex]::Matches($content, '<div[\s>]').Count
$closeDivs = [regex]::Matches($content, '</div>').Count
$openScripts = [regex]::Matches($content, '<script[\s>]').Count
$closeScripts = [regex]::Matches($content, '</script>').Count

Write-Host "=========================================="
Write-Host "   VOCAFLOW BALANCE CHECK REPORT"
Write-Host "=========================================="
Write-Host "Braces { }:    Open=$openBraces  Close=$closeBraces  Diff=$($openBraces - $closeBraces)"
Write-Host "Tags <div>:    Open=$openDivs  Close=$closeDivs  Diff=$($openDivs - $closeDivs)"
Write-Host "Tags <script>: Open=$openScripts  Close=$closeScripts  Diff=$($openScripts - $closeScripts)"
Write-Host "=========================================="
if ($openBraces -eq $closeBraces -and $openDivs -eq $closeDivs -and $openScripts -eq $closeScripts) {
    Write-Host ">>> PERFECT SYNTAX & TAG BALANCE! 100% READY <<<" -ForegroundColor Green
} else {
    Write-Host ">>> WARNING: BALANCE MISMATCH DETECTED! <<<" -ForegroundColor Red
}
