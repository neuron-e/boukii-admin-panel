#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sincronización bidireccional CORREGIDA para documentación Boukii V5
.DESCRIPTION
    Sincroniza correctamente docs/shared/ entre frontend y backend
    Mantiene docs/backend/ y docs/frontend/ específicos de cada repo
.PARAMETER Direction
    'to-backend' o 'to-frontend' para indicar dirección del sync
.EXAMPLE
    .\BIDIRECTIONAL_SYNC.ps1 -Direction to-backend
    Sincroniza docs/shared/ desde frontend a backend
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("to-backend", "to-frontend")]
    [string]$Direction
)

# Rutas de los repositorios
$FrontendRepo = "C:\Users\aym14\Documents\WebstormProjects\boukii\boukii-admin-panel"
$BackendRepo = "C:\laragon\www\api-boukii"

# Verificar que ambos repos existen
if (-not (Test-Path $FrontendRepo)) {
    Write-Error "Frontend repository not found at: $FrontendRepo"
    exit 1
}

if (-not (Test-Path $BackendRepo)) {
    Write-Error "Backend repository not found at: $BackendRepo"
    exit 1
}

Write-Host "🔄 Starting bidirectional documentation sync..." -ForegroundColor Cyan

if ($Direction -eq "to-backend") {
    Write-Host "📤 Syncing docs/shared/ from FRONTEND → BACKEND" -ForegroundColor Green
    
    # Crear estructura si no existe
    $BackendDocsShared = Join-Path $BackendRepo "docs\shared"
    if (-not (Test-Path $BackendDocsShared)) {
        New-Item -ItemType Directory -Path $BackendDocsShared -Force | Out-Null
        Write-Host "   Created docs/shared/ in backend" -ForegroundColor Yellow
    }
    
    # Sincronizar archivos
    $SourcePath = Join-Path $FrontendRepo "docs\shared\*"
    Copy-Item -Path $SourcePath -Destination $BackendDocsShared -Recurse -Force
    
    Write-Host "   ✅ Synchronized shared docs to backend" -ForegroundColor Green
    
}
elseif ($Direction -eq "to-frontend") {
    Write-Host "📥 Syncing docs/shared/ from BACKEND → FRONTEND" -ForegroundColor Blue
    
    # Crear estructura si no existe
    $FrontendDocsShared = Join-Path $FrontendRepo "docs\shared"
    if (-not (Test-Path $FrontendDocsShared)) {
        New-Item -ItemType Directory -Path $FrontendDocsShared -Force | Out-Null
        Write-Host "   Created docs/shared/ in frontend" -ForegroundColor Yellow
    }
    
    # Sincronizar archivos
    $SourcePath = Join-Path $BackendRepo "docs\shared\*"
    Copy-Item -Path $SourcePath -Destination $FrontendDocsShared -Recurse -Force
    
    Write-Host "   ✅ Synchronized shared docs to frontend" -ForegroundColor Blue
}

# Mostrar estadísticas
$SharedFiles = Get-ChildItem -Path (Join-Path $FrontendRepo "docs\shared") -File -Recurse | Measure-Object
Write-Host "📊 Sync completed: $($SharedFiles.Count) shared files synchronized" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Magenta
Write-Host "   1. Review changes in target repository" -ForegroundColor White
Write-Host "   2. Commit and push if changes look correct" -ForegroundColor White
Write-Host "   3. Always test sync before making major changes" -ForegroundColor White

Write-Host ""
Write-Host "✨ Documentation sync completed successfully!" -ForegroundColor Green