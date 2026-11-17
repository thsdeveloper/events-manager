param([string]$MetaEditor = 'C:\Program Files\MetaTrader 5\MetaEditor64.exe')
$ErrorActionPreference = 'Stop'
$buildDir = Join-Path ([IO.Path]::GetTempPath()) ('Stormer123-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $buildDir | Out-Null
foreach ($name in @('Stormer123.mq5','Stormer123Core.mqh')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $buildDir
}
$logPath = Join-Path $buildDir 'compile.log'
$compileArgs = '/compile:"' + (Join-Path $buildDir 'Stormer123.mq5') + '" /log:"' + $logPath + '"'
Start-Process -FilePath $MetaEditor -ArgumentList $compileArgs -WindowStyle Hidden -Wait
$log = Get-Content -LiteralPath $logPath -Raw
if ($log -notmatch '0 errors, 0 warnings') { throw $log }
Copy-Item -LiteralPath (Join-Path $buildDir 'Stormer123.ex5') -Destination $PSScriptRoot
Copy-Item -LiteralPath $logPath -Destination $PSScriptRoot
Write-Output 'MetaEditor: 0 errors, 0 warnings. Stormer123.ex5 generated.'
