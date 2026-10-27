[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Updating module headers and version constants to v1.0-3 Build 362..." -ForegroundColor Cyan

# 1. Modules & app.js
$files = Get-ChildItem -Path "$root\src\scripts\modules\*.js", "$root\src\scripts\app.js"
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $modified = $false
    if ($content.Contains('(v1.0-2 Build 361)')) {
        $content = $content.Replace('(v1.0-2 Build 361)', '(v1.0-3 Build 362)')
        $modified = $true
    }
    if ($content.Contains('v1.0-2 Build 361')) {
        $content = $content.Replace('v1.0-2 Build 361', 'v1.0-3 Build 362')
        $modified = $true
    }
    if ($f.Name -eq '02-state-core.js') {
        if ($content.Contains("const VOCAFLOW_APP_VERSION = 'v1.0-2';")) {
            $content = $content.Replace("const VOCAFLOW_APP_VERSION = 'v1.0-2';", "const VOCAFLOW_APP_VERSION = 'v1.0-3';")
            $modified = $true
        }
        if ($content.Contains("const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v1.0-2 (Build 361)';")) {
            $content = $content.Replace("const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v1.0-2 (Build 361)';", "const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v1.0-3 (Build 362)';")
            $modified = $true
        }
        if ($content.Contains("const VOCAFLOW_APP_BUILD = 361;")) {
            $content = $content.Replace("const VOCAFLOW_APP_BUILD = 361;", "const VOCAFLOW_APP_BUILD = 362;")
            $modified = $true
        }
    }
    if ($modified) {
        [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "  -> Updated $($f.Name)" -ForegroundColor Green
    }
}

# 2. modal-settings.html
$settingsFile = "$root\src\components\modals\modal-settings.html"
$settingsContent = [System.IO.File]::ReadAllText($settingsFile, [System.Text.Encoding]::UTF8)
if ($settingsContent.Contains("VocaFlow v1.0-2 (Build 361)")) {
    $settingsContent = $settingsContent.Replace("VocaFlow v1.0-2 (Build 361)", "VocaFlow v1.0-3 (Build 362)")
    [System.IO.File]::WriteAllText($settingsFile, $settingsContent, [System.Text.Encoding]::UTF8)
    Write-Host "  -> Updated modal-settings.html" -ForegroundColor Green
}

# 3. sw.js & Release_App/sw.js
foreach ($swPath in @("$root\sw.js", "$root\Release_App\sw.js")) {
    if (Test-Path $swPath) {
        $swContent = [System.IO.File]::ReadAllText($swPath, [System.Text.Encoding]::UTF8)
        if ($swContent.Contains("vocaflow-pwa-v1.0-2")) {
            $swContent = $swContent.Replace("vocaflow-pwa-v1.0-2", "vocaflow-pwa-v1.0-3")
            [System.IO.File]::WriteAllText($swPath, $swContent, [System.Text.Encoding]::UTF8)
            Write-Host "  -> Updated $swPath" -ForegroundColor Green
        }
    }
}

# 4. pubspec.yaml
$pubspecPath = "$root\pubspec.yaml"
$pubspecContent = [System.IO.File]::ReadAllText($pubspecPath, [System.Text.Encoding]::UTF8)
if ($pubspecContent.Contains("version: 1.0.2+361")) {
    $pubspecContent = $pubspecContent.Replace("version: 1.0.2+361", "version: 1.0.3+362")
    [System.IO.File]::WriteAllText($pubspecPath, $pubspecContent, [System.Text.Encoding]::UTF8)
    Write-Host "  -> Updated pubspec.yaml" -ForegroundColor Green
}

# 5. Program.cs & VocaFlow.csproj
$programCsPath = "$root\VocaFlow_Desktop\Program.cs"
if (Test-Path $programCsPath) {
    $csContent = [System.IO.File]::ReadAllText($programCsPath, [System.Text.Encoding]::UTF8)
    if ($csContent.Contains("VocaFlow v1.0-2")) {
        $csContent = $csContent.Replace("VocaFlow v1.0-2", "VocaFlow v1.0-3")
        [System.IO.File]::WriteAllText($programCsPath, $csContent, [System.Text.Encoding]::UTF8)
        Write-Host "  -> Updated Program.cs" -ForegroundColor Green
    }
}

$csprojPath = "$root\VocaFlow_Desktop\VocaFlow.csproj"
if (Test-Path $csprojPath) {
    $csprojContent = [System.IO.File]::ReadAllText($csprojPath, [System.Text.Encoding]::UTF8)
    $csprojContent = $csprojContent.Replace("<AssemblyVersion>1.0.2.361</AssemblyVersion>", "<AssemblyVersion>1.0.3.362</AssemblyVersion>")
    $csprojContent = $csprojContent.Replace("<FileVersion>1.0.2.361</FileVersion>", "<FileVersion>1.0.3.362</FileVersion>")
    [System.IO.File]::WriteAllText($csprojPath, $csprojContent, [System.Text.Encoding]::UTF8)
    Write-Host "  -> Updated VocaFlow.csproj" -ForegroundColor Green
}

# 6. push_github.ps1
$pushPath = "$root\GITHUB_RELEASE\push_github.ps1"
if (Test-Path $pushPath) {
    $pushContent = [System.IO.File]::ReadAllText($pushPath, [System.Text.Encoding]::UTF8)
    $pushContent = $pushContent.Replace("VocaFlow_v1.0-2_Windows_Portable.zip", "VocaFlow_v1.0-3_Windows_Portable.zip")
    $pushContent = $pushContent.Replace("Release v1.0-2 (Build 361)", "Release v1.0-3 (Build 362)")
    [System.IO.File]::WriteAllText($pushPath, $pushContent, [System.Text.Encoding]::UTF8)
    Write-Host "  -> Updated push_github.ps1" -ForegroundColor Green
}

# 7. Copy VOCAFLOW_OVERVIEW.txt to GITHUB_RELEASE
Copy-Item "$root\VOCAFLOW_OVERVIEW.txt" "$root\GITHUB_RELEASE\VOCAFLOW_OVERVIEW.txt" -Force
Write-Host "  -> Synchronized VOCAFLOW_OVERVIEW.txt to GITHUB_RELEASE" -ForegroundColor Green

Write-Host "`nAll version strings updated to v1.0-3 (Build 362)!" -ForegroundColor Green
