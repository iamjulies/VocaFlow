$git = "C:\Users\DELL\Documents\flutter_windows_3.47.0-stable\flutter\bin\mingit\cmd\git.exe"
$root = $PSScriptRoot
$token = (Get-Content -Path "$root\GITHUB_RELEASE\.git_token" -Raw).Trim()
$remote = "https://iamjulies:${token}@github.com/iamjulies/VocaFlow.git"

Write-Host "Resetting to 79cccc5 to eliminate bloated commit history..." -ForegroundColor Cyan
& $git -C $root reset --soft 79cccc5
& $git -C $root add .

# Clean up helper scripts so they don't clutter the repo if not needed, or keep them
& $git -C $root commit -m "feat: Release v0.10.10-48 (Build 349) Multi-Tier Gemini AI Engine Architecture"

Write-Host "Verifying objects in 79cccc5..HEAD..." -ForegroundColor Cyan
$lines = & $git -C $root rev-list --objects 79cccc5..HEAD
foreach ($line in $lines) {
    $parts = $line -split '\s+', 2
    $hash = $parts[0]
    $name = if ($parts.Length -gt 1) { $parts[1] } else { '' }
    $size = [int64](& $git -C $root cat-file -s $hash 2>$null)
    if ($size -gt 1MB) {
        Write-Host "  -> $([Math]::Round($size / 1MB, 2)) MB : $name" -ForegroundColor Yellow
    }
}

Write-Host "Pushing clean main branch to GitHub..." -ForegroundColor Cyan
& $git -C $root push $remote main --force --progress
Write-Host "Git push main result exit code: $LASTEXITCODE" -ForegroundColor Green
