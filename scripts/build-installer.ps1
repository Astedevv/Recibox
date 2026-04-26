$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$scriptPath = Join-Path $repoRoot 'installer\Recibox.iss'
$buildDir = if ($env:RECIBOX_BUILD_DIR) { $env:RECIBOX_BUILD_DIR } else { 'release\win-unpacked' }
$installerOutDir = if ($env:RECIBOX_INSTALLER_OUT_DIR) { $env:RECIBOX_INSTALLER_OUT_DIR } else { 'release\installer' }
$exePath = Join-Path $repoRoot (Join-Path $buildDir 'ReciBox.exe')
$iconPath = Join-Path $repoRoot 'assets\recibox.ico'
$iconScript = Join-Path $PSScriptRoot 'apply-icon.mjs'
$sourceDir = Join-Path $repoRoot $buildDir
$outputDir = Join-Path $repoRoot $installerOutDir
$patchExeIcon = $env:RECIBOX_PATCH_EXE_ICON -eq 'true'

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

if ($patchExeIcon) {
  & node $iconScript $exePath $iconPath
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao aplicar o ícone no executável.'
  }
}

& $compiler "/DMySourceDir=$sourceDir" "/DMyOutputDir=$outputDir" $scriptPath
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
