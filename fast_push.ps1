$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot
$token = (Get-Content -Path "$root\GITHUB_RELEASE\.git_token" -Raw).Trim()
$remote = "https://iamjulies:${token}@github.com/iamjulies/VocaFlow.git"

Write-Host "Pushing main to GitHub..." -ForegroundColor Cyan
& $git -C $root remote set-url origin $remote
& $git -C $root push origin main --force --progress
Write-Host "Push exit code: $LASTEXITCODE" -ForegroundColor Green
