Param(
  [string]$FrontPath = "",
  [string]$BackPath  = "",
  [switch]$FrontToBack,
  [switch]$BackToFront,
  [switch]$DryRun
)

function Resolve-RepoPath($hint, $fallbackRelative) {
  if ($hint -and (Test-Path $hint)) { return (Resolve-Path $hint).Path }
  $root = Split-Path -Parent $PSScriptRoot
  $path = Join-Path $root $fallbackRelative
  if (Test-Path $path) { return (Resolve-Path $path).Path }
  throw "No se pudo resolver la ruta $fallbackRelative"
}

$FrontRepo = Resolve-RepoPath $FrontPath "..\boukii-admin-panel"
$BackRepo  = Resolve-RepoPath $BackPath  "..\api-boukii"

function Sync-OneWay($srcRepo, $dstRepo) {
  $src = Join-Path $srcRepo "docs\shared"
  $dst = Join-Path $dstRepo  "docs\shared"
  if (!(Test-Path $src)) { throw "No existe $src" }
  if (!(Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }
  if ($DryRun) { Write-Host "[DRY] MIR $src -> $dst"; return }
  robocopy $src $dst /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-Host "OK: Synced $src → $dst"
}

if ($FrontToBack) { Sync-OneWay $FrontRepo $BackRepo }
elseif ($BackToFront) { Sync-OneWay $BackRepo $FrontRepo }
else { Write-Host "Usa -FrontToBack o -BackToFront (añade -DryRun)"; }

