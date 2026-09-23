$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$token = (Get-Content -Path "$PSScriptRoot\GITHUB_RELEASE\.git_token" -Raw).Trim()
$remote = "https://iamjulies:${token}@github.com/iamjulies/VocaFlow.git"

Write-Host "Configuring git and pushing main branch to GitHub..." -ForegroundColor Cyan
& $git config http.postBuffer 104857600
& $git push $remote main --force --progress -v
Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Green
