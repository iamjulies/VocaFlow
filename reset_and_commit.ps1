$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot

Write-Host "Resetting previous bloated commit..." -ForegroundColor Cyan
& $git -C $root reset HEAD~1
& $git -C $root add .
$commitMsg = "feat: Release v0.10.10-48 (Build 349) $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
& $git -C $root commit -m $commitMsg

Write-Host "Commit created cleanly!" -ForegroundColor Green
