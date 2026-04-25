$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$scriptPath = Join-Path $repoRoot 'installer\Recibox.iss'
$exePath = Join-Path $repoRoot 'release\win-unpacked\ReciBox.exe'
$iconPath = Join-Path $repoRoot 'assets\recibox.ico'
$iconScript = Join-Path $PSScriptRoot 'apply-icon.mjs'

$candidates = @()
$cmd = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if ($cmd) { $candidates += $cmd.Source }
$candidates += Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'
$candidates += Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'
$candidates += Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe'

$compiler = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $compiler) {
  throw 'ISCC.exe não encontrado. Instale o Inno Setup 6 ou coloque o compilador no PATH.'
}

& node $iconScript $exePath $iconPath
if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao aplicar o ícone no executável.'
}

& $compiler $scriptPath
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
