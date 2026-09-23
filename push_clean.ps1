$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot
$token = (Get-Content -Path "$root\GITHUB_RELEASE\.git_token" -Raw).Trim()
$remote = "https://iamjulies:${token}@github.com/iamjulies/VocaFlow.git"

& $git -C $root config --unset http.postBuffer 2>$null
& $git -C $root config http.version HTTP/1.1
& $git -C $root config http.lowSpeedLimit 1000
& $git -C $root config http.lowSpeedTime 300

Write-Host "Pushing main branch to GitHub with HTTP/1.1 and streaming packfile..." -ForegroundColor Cyan
& $git -C $root push $remote main --force --progress
Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Green
