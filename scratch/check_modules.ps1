$files = Get-ChildItem "C:\Users\DELL\Documents\Modding\browser\src\scripts\modules\*.js"
foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $ob = ([regex]::Matches($text, '\{')).Count
    $cb = ([regex]::Matches($text, '\}')).Count
    $op = ([regex]::Matches($text, '\(')).Count
    $cp = ([regex]::Matches($text, '\)')).Count
    $obk = ([regex]::Matches($text, '\[')).Count
    $cbk = ([regex]::Matches($text, '\]')).Count
    Write-Host "$($f.Name): Braces Diff: $($ob - $cb) | Parens Diff: $($op - $cp) | Brackets Diff: $($obk - $cbk)"
}
