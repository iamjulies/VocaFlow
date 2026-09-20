[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$content = [System.IO.File]::ReadAllText("vocaflow.html", [System.Text.Encoding]::UTF8)

$hasVipCrown = $content.Contains("royal-lifetime-crown")
$hasVipRibbon = $content.Contains("VIP LIFETIME")
$hasSilverStars = $content.Contains("vfSilverBadgeGrad")
$hasGoldStars = $content.Contains("vfGoldBadgeGrad")
$hasDiamondStars = $content.Contains("vfDiaBadgeGrad")
$hasVietnamTransform = $content.Contains("starRadiance") -and $content.Contains("transform-box: fill-box")
$hasBirthdayHatBob = $content.Contains("hatPartyBob")
$hasChristmasBell = $content.Contains("bellJingle")
$hasTetSway = $content.Contains("lanternSway")
$hasRotateLight = $content.Contains("rotateLight")

Write-Host "VIP Crown: $hasVipCrown"
Write-Host "VIP Ribbon: $hasVipRibbon"
Write-Host "Silver Stars Badge: $hasSilverStars"
Write-Host "Gold Stars Badge: $hasGoldStars"
Write-Host "Diamond Stars Badge: $hasDiamondStars"
Write-Host "Vietnam Center Star: $hasVietnamTransform"
Write-Host "Birthday Hat Bob: $hasBirthdayHatBob"
Write-Host "Christmas Bell Wobble: $hasChristmasBell"
Write-Host "Tet Lantern Sway: $hasTetSway"
Write-Host "RotateLight Hover Only: $hasRotateLight"
