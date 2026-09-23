$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot

$items = & $git -C $root ls-tree -r -l HEAD
foreach ($line in $items) {
    if ($line -match '^\d+\s+blob\s+\w+\s+(\d+)\s+(.+)$') {
        $size = [int64]$Matches[1]
        $path = $Matches[2]
        if ($size -gt 1MB) {
            Write-Host "$([Math]::Round($size / 1MB, 2)) MB  -  $path" -ForegroundColor Yellow
        }
    }
}
