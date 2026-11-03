# Runs the browser tests through headless Edge and prints only failures.
# From the project folder: powershell -ExecutionPolicy Bypass -File tests\browser\run-tests.ps1 -dist dist\Kaytia_POS_BackOffice_v1_8_0.html
# Optional: -names "hr-test,bk-test"
param([string]$sp, [Parameter(Mandatory)][string]$dist, [string[]]$names)
if (-not $sp) { $sp = Split-Path -Parent $MyInvocation.MyCommand.Path }
$dist = (Resolve-Path $dist).Path
$skip = '^(make-|lic-console|allp2-test|tabs-test|prset-test|set-test|fresh-test|xl-test|xl2-test|it2-test)|-shot'
$files = if ($names) { ($names -split ",") | ForEach-Object { Get-Item "$sp\$_.js" } } else { Get-ChildItem "$sp\*-test.js" | Where-Object { $_.Name -notmatch $skip } }
$n = 0
foreach ($f in $files) {
  $n++
  $o = & node $f.FullName $dist 2>$null
  if (-not $o) { "$($f.Name): NO RESULT"; continue }
  $o | Select-String -Pattern '^X |^ERR|NO RESULT' | ForEach-Object { $l = $_.Line; "$($f.Name): " + $l.Substring(0, [Math]::Min(190, $l.Length)) }
}
"ran $n tests"
