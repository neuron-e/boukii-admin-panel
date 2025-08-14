# 🚨 SCRIPT DE REPARACIÓN CRÍTICA - DOCS SYNC
# Mueve archivos de documentación de la raíz de vuelta a docs/shared/
# Problema: El sync automático movió archivos shared a la raíz incorrectamente

Write-Host "🚨 REPARANDO SINCRONIZACIÓN DE DOCUMENTACIÓN" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red

$rootPath = Split-Path -Parent $PSScriptRoot
$sharedDocsPath = Join-Path $rootPath "docs\shared"

# Crear directorio docs/shared si no existe
if (!(Test-Path $sharedDocsPath)) {
    New-Item -ItemType Directory -Path $sharedDocsPath -Force | Out-Null
    Write-Host "✅ Creado directorio: docs/shared/" -ForegroundColor Green
}

# Lista de archivos que deben estar en docs/shared/ (excluyendo CLAUDE.md que debe quedarse en raíz)
$filesToMove = @(
    "OPENAPI_README.md",
    "PROMPTS_GUIDE.md", 
    "SPRINT_TEMPLATE.md",
    "TESTING_GUIDE.md",
    "TEST_SYNC.md",
    "V5_ARCHITECTURE.md",
    "V5_AUTH_FLOW.md", 
    "V5_DEVELOPMENT_GUIDE.md",
    "V5_EQUIPMENT_MODULE.md",
    "V5_OVERVIEW.md",
    "WORKING_AGREEMENTS.md"
)

Write-Host "`n📂 MOVIENDO ARCHIVOS DE RAÍZ A docs/shared/:" -ForegroundColor Yellow

$movedCount = 0
$skippedCount = 0

foreach ($fileName in $filesToMove) {
    $sourcePath = Join-Path $rootPath $fileName
    $destPath = Join-Path $sharedDocsPath $fileName
    
    if (Test-Path $sourcePath) {
        try {
            Move-Item $sourcePath $destPath -Force
            Write-Host "✅ Movido: $fileName → docs/shared/" -ForegroundColor Green
            $movedCount++
        } catch {
            Write-Host "❌ ERROR moviendo $fileName : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  No encontrado: $fileName (ya estaba en su lugar)" -ForegroundColor Yellow
        $skippedCount++
    }
}

Write-Host "`n📊 RESUMEN DE REPARACIÓN:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "✅ Archivos movidos: $movedCount" -ForegroundColor Green
Write-Host "⚠️  Archivos omitidos: $skippedCount" -ForegroundColor Yellow

# Verificar que docs/shared tiene contenido
$sharedFiles = Get-ChildItem $sharedDocsPath -Recurse -File | Measure-Object
Write-Host "📁 Total archivos en docs/shared/: $($sharedFiles.Count)" -ForegroundColor Cyan

Write-Host "`n🔧 SIGUIENTES PASOS RECOMENDADOS:" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host "1. Verificar que los archivos están en docs/shared/ correctamente"
Write-Host "2. Hacer commit de esta reparación"
Write-Host "3. Revisar configuración de GitHub Actions para evitar que se repita"
Write-Host "4. Probar sync manual para confirmar que funciona correctamente"

Write-Host "`n✅ REPARACIÓN COMPLETADA" -ForegroundColor Green