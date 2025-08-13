# Script simple y funcional para sync de documentación Boukii V5

param([string]$Direction = "to-backend")

$Frontend = "C:\Users\aym14\Documents\WebstormProjects\boukii\boukii-admin-panel"
$Backend = "C:\laragon\www\api-boukii"

Write-Host "🔄 Syncing documentation..." -ForegroundColor Cyan

if ($Direction -eq "to-backend") {
    Write-Host "📤 Frontend → Backend" -ForegroundColor Green
    
    # Crear carpeta si no existe
    if (-not (Test-Path "$Backend\docs\shared")) {
        New-Item -ItemType Directory -Path "$Backend\docs\shared" -Force
    }
    
    # Copiar archivos
    Copy-Item "$Frontend\docs\shared\*" "$Backend\docs\shared\" -Force
    Write-Host "✅ Shared docs synchronized to backend" -ForegroundColor Green
}

if ($Direction -eq "to-frontend") {
    Write-Host "📥 Backend → Frontend" -ForegroundColor Blue
    
    # Crear carpeta si no existe
    if (-not (Test-Path "$Frontend\docs\shared")) {
        New-Item -ItemType Directory -Path "$Frontend\docs\shared" -Force
    }
    
    # Copiar archivos
    Copy-Item "$Backend\docs\shared\*" "$Frontend\docs\shared\" -Force
    Write-Host "✅ Shared docs synchronized to frontend" -ForegroundColor Blue
}

Write-Host "✨ Sync completed!" -ForegroundColor Green