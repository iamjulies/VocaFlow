$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot
$token = (Get-Content -Path "$root\GITHUB_RELEASE\.git_token" -Raw).Trim()
$remote = "https://iamjulies:${token}@github.com/iamjulies/VocaFlow.git"

Write-Host "Expiring reflog and pruning unreachable git objects..." -ForegroundColor Cyan
& $git -C $root reflog expire --expire=now --all
& $git -C $root gc --prune=now

Write-Host "Pushing main branch to GitHub..." -ForegroundColor Cyan
& $git -C $root push $remote main --force --progress -v
Write-Host "Git push completed with code: $LASTEXITCODE" -ForegroundColor Green
