$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot

$lines = & $git -C $root rev-list --objects 79cccc5..HEAD
foreach ($line in $lines) {
    $parts = $line -split '\s+', 2
    $hash = $parts[0]
    $name = if ($parts.Length -gt 1) { $parts[1] } else { '' }
    $size = [int64](& $git -C $root cat-file -s $hash 2>$null)
    if ($size -gt 500KB) {
        Write-Host "$([Math]::Round($size / 1MB, 2)) MB  -  $name ($hash)" -ForegroundColor Yellow
    }
}
