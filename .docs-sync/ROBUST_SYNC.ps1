#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script robusto para sincronizar documentación compartida entre repositorios Boukii V5
.DESCRIPTION
    Sincroniza el contenido de /docs/shared/ entre frontend (boukii-admin-panel) y backend (api-boukii)
    usando robocopy para una sincronización eficiente y segura.
.PARAMETER FrontPath
    Ruta al repositorio frontend (por defecto intenta detectar automáticamente)
.PARAMETER BackPath
    Ruta al repositorio backend (por defecto intenta detectar automáticamente)
.PARAMETER FrontToBack
    Sincronizar desde frontend hacia backend
.PARAMETER BackToFront
    Sincronizar desde backend hacia frontend
.PARAMETER DryRun
    Mostrar qué se haría sin ejecutar cambios reales
.EXAMPLE
    .\ROBUST_SYNC.ps1 -FrontToBack
    Sincroniza docs/shared/ desde frontend a backend
.EXAMPLE
    .\ROBUST_SYNC.ps1 -BackToFront -DryRun
    Muestra qué archivos se sincronizarían desde backend a frontend sin hacer cambios
#>

param(
    [string]$FrontPath,
    [string]$BackPath,
    [switch]$FrontToBack,
    [switch]$BackToFront,
    [switch]$DryRun,
    [switch]$Verbose
)

# Configuración de colores para output
$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param($Message, $Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param($Message) Write-ColorOutput $Message "Green" }
function Write-Error { param($Message) Write-ColorOutput $Message "Red" }
function Write-Warning { param($Message) Write-ColorOutput $Message "Yellow" }
function Write-Info { param($Message) Write-ColorOutput $Message "Cyan" }

# Detectar rutas automáticamente si no se proporcionan
function Get-DefaultPaths {
    $scriptDir = Split-Path -Parent $MyInvocation.PSCommandPath
    $currentRepo = Split-Path -Parent $scriptDir
    
    # Determinar si estamos en frontend o backend
    $repoName = Split-Path -Leaf $currentRepo
    
    if ($repoName -eq "boukii-admin-panel") {
        # Estamos en frontend
        $detectedFront = $currentRepo
        $detectedBack = "C:\laragon\www\api-boukii"
    } elseif ($repoName -eq "api-boukii") {
        # Estamos en backend
        $detectedFront = "C:\Users\aym14\Documents\WebstormProjects\boukii\boukii-admin-panel"
        $detectedBack = $currentRepo
    } else {
        Write-Error "No se pudo detectar el tipo de repositorio. Usar parámetros explícitos."
        exit 1
    }
    
    return @{
        Frontend = $detectedFront
        Backend = $detectedBack
    }
}

# Validar que un directorio existe y contiene docs/shared
function Test-RepoStructure {
    param($Path, $RepoType)
    
    if (!(Test-Path $Path)) {
        Write-Error "Directorio $RepoType no existe: $Path"
        return $false
    }
    
    $docsSharedPath = Join-Path $Path "docs\shared"
    if (!(Test-Path $docsSharedPath)) {
        Write-Warning "Directorio docs\shared no existe en $RepoType. Se creará: $docsSharedPath"
        New-Item -ItemType Directory -Path $docsSharedPath -Force | Out-Null
    }
    
    return $true
}

# Realizar sincronización usando robocopy
function Sync-Directories {
    param($SourcePath, $DestPath, $Direction, $DryRun)
    
    $sourceShared = Join-Path $SourcePath "docs\shared"
    $destShared = Join-Path $DestPath "docs\shared"
    
    Write-Info "🔄 Sincronizando $Direction"
    Write-Info "   Origen: $sourceShared"
    Write-Info "   Destino: $destShared"
    
    # Opciones de robocopy
    $robocopyArgs = @(
        $sourceShared,
        $destShared,
        "/MIR",          # Mirror (sincronización completa)
        "/NFL",          # No File List (menos verbose)
        "/NDL",          # No Directory List
        "/NJH",          # No Job Header
        "/NJS",          # No Job Summary
        "/NP"            # No Progress
    )
    
    if ($DryRun) {
        $robocopyArgs += "/L"  # List only (dry run)
        Write-Warning "🔍 Modo DRY RUN - No se realizarán cambios reales"
    }
    
    if ($Verbose) {
        $robocopyArgs = $robocopyArgs | Where-Object { $_ -ne "/NFL" -and $_ -ne "/NDL" }
        Write-Info "Ejecutando: robocopy $($robocopyArgs -join ' ')"
    }
    
    # Ejecutar robocopy
    $result = & robocopy @robocopyArgs
    $exitCode = $LASTEXITCODE
    
    # Robocopy exit codes: 0-3 are success, 4+ are errors
    if ($exitCode -ge 0 -and $exitCode -le 3) {
        if ($DryRun) {
            Write-Success "✅ DRY RUN completado - Verificar archivos arriba"
        } else {
            Write-Success "✅ Sincronización completada exitosamente"
        }
        
        # Mostrar estadísticas si hay cambios
        if ($exitCode -eq 1 -or $exitCode -eq 3) {
            Write-Info "📊 Archivos fueron copiados o actualizados"
        } elseif ($exitCode -eq 0) {
            Write-Info "📊 No hay diferencias - Todo está actualizado"
        }
    } else {
        Write-Error "❌ Error en robocopy. Exit code: $exitCode"
        Write-Error "Resultado: $($result -join "`n")"
        exit $exitCode
    }
}

# Función principal
function Main {
    Write-Info "🚀 Boukii V5 - Robust Docs Sync"
    Write-Info "================================"
    
    # Obtener rutas
    $defaultPaths = Get-DefaultPaths
    $frontPath = if ($FrontPath) { $FrontPath } else { $defaultPaths.Frontend }
    $backPath = if ($BackPath) { $BackPath } else { $defaultPaths.Backend }
    
    Write-Info "📂 Frontend: $frontPath"
    Write-Info "📂 Backend:  $backPath"
    
    # Validar estructura de repositorios
    if (!(Test-RepoStructure $frontPath "Frontend")) { exit 1 }
    if (!(Test-RepoStructure $backPath "Backend")) { exit 1 }
    
    # Determinar dirección de sincronización
    if ($FrontToBack) {
        Sync-Directories $frontPath $backPath "Frontend → Backend" $DryRun
    } elseif ($BackToFront) {
        Sync-Directories $backPath $frontPath "Backend → Frontend" $DryRun
    } else {
        Write-Error "❌ Especificar dirección: -FrontToBack o -BackToFront"
        Write-Info ""
        Write-Info "Ejemplos:"
        Write-Info "  .\ROBUST_SYNC.ps1 -FrontToBack      # Frontend → Backend"
        Write-Info "  .\ROBUST_SYNC.ps1 -BackToFront     # Backend → Frontend"
        Write-Info "  .\ROBUST_SYNC.ps1 -FrontToBack -DryRun  # Ver cambios sin aplicar"
        exit 1
    }
    
    Write-Info ""
    Write-Success "🎉 Proceso completado"
    Write-Info "💡 Tip: Usa -DryRun para preview y -Verbose para más detalles"
}

# Ejecutar función principal
try {
    Main
} catch {
    Write-Error "💥 Error inesperado: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}