# SAFE Documentation Sync - Only touches docs/ directory
# NEVER modifies application files

param([string]$Direction = "to-backend")

$Frontend = "C:\Users\aym14\Documents\WebstormProjects\boukii\boukii-admin-panel"
$Backend = "C:\laragon\www\api-boukii"

Write-Host "🔒 SAFE Documentation Sync Started" -ForegroundColor Green
Write-Host "📋 SCOPE: ONLY docs/ directory - NO application files" -ForegroundColor Yellow

if ($Direction -eq "to-backend") {
    Write-Host "📤 Syncing docs/shared/ from Frontend → Backend" -ForegroundColor Cyan
    
    # Verify source exists
    if (!(Test-Path "$Frontend\docs\shared")) {
        Write-Error "Source docs/shared not found in frontend"
        exit 1
    }
    
    # Create target if needed
    if (!(Test-Path "$Backend\docs\shared")) {
        New-Item -ItemType Directory -Path "$Backend\docs\shared" -Force
        Write-Host "   Created docs/shared/ in backend" -ForegroundColor Yellow
    }
    
    # SAFE copy - only specific files, never delete anything
    $sharedFiles = Get-ChildItem "$Frontend\docs\shared\*.md"
    foreach ($file in $sharedFiles) {
        Copy-Item $file.FullName "$Backend\docs\shared\" -Force
        Write-Host "   ✅ Synced: $($file.Name)" -ForegroundColor Green
    }
}

if ($Direction -eq "to-frontend") {
    Write-Host "📥 Syncing docs/shared/ from Backend → Frontend" -ForegroundColor Blue
    
    # Similar safe operation for reverse direction
    if (!(Test-Path "$Backend\docs\shared")) {
        Write-Error "Source docs/shared not found in backend"
        exit 1
    }
    
    if (!(Test-Path "$Frontend\docs\shared")) {
        New-Item -ItemType Directory -Path "$Frontend\docs\shared" -Force
        Write-Host "   Created docs/shared/ in frontend" -ForegroundColor Yellow
    }
    
    $sharedFiles = Get-ChildItem "$Backend\docs\shared\*.md"
    foreach ($file in $sharedFiles) {
        Copy-Item $file.FullName "$Frontend\docs\shared\" -Force
        Write-Host "   ✅ Synced: $($file.Name)" -ForegroundColor Blue
    }
}

Write-Host ""
Write-Host "✨ SAFE sync completed - Application files untouched" -ForegroundColor Green
Write-Host "📊 Remember to commit changes manually in target repo" -ForegroundColor Yellow