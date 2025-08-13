# Mecanismo de Sincronización de Documentación

## ⚠️ ADVERTENCIA CRÍTICA DE SEGURIDAD

**PELIGRO**: Los scripts automáticos de sync han sido **DESHABILITADOS** tras un incidente crítico donde el commit `bee26dd` eliminó 1226+ archivos de aplicación del backend, incluyendo controladores, modelos y comandos críticos.

**SOLO USAR SYNC MANUAL** con comandos específicos que no toquen archivos de aplicación.

## 🔄 Visión General

Este directorio contiene los archivos necesarios para sincronizar automáticamente la documentación compartida entre los repositorios frontend (boukii-admin-panel) y backend (api-boukii).

## 📂 Carpetas Sincronizadas

### `/docs/shared/`
Contiene documentación que debe mantenerse idéntica en ambos repositorios:
- `V5_OVERVIEW.md` - Resumen ejecutivo del proyecto V5
- `OPENAPI_README.md` - Especificaciones de API y contratos
- `PROMPTS_GUIDE.md` - Guías para interacción con IA
- `TESTING_GUIDE.md` - Comandos y estrategias de testing
- `WORKING_AGREEMENTS.md` - Convenciones del equipo

## ⚙️ Funcionamiento

### Sincronización Automática (GitHub Actions)
1. **Trigger**: Push a rama `v5` con cambios en `docs/shared/**`
2. **Condición**: El commit NO debe contener `docs-sync:` en el mensaje
3. **Acción**: GitHub Actions copia los cambios al repositorio hermano
4. **Commit automático**: Se crea con prefijo `docs-sync:` para evitar bucles

### ✅ Sincronización Manual Segura (PowerShell)

⚠️ **ÚNICOS COMANDOS AUTORIZADOS** - No usar scripts automáticos

```powershell
# Frontend → Backend (SOLO docs/shared/)
Copy-Item 'C:\Users\aym14\Documents\WebstormProjects\boukii\boukii-admin-panel\docs\shared\*' 'C:\laragon\www\api-boukii\docs\shared\' -Force

# Backend → Frontend (SOLO docs/shared/)  
Copy-Item 'C:\laragon\www\api-boukii\docs\shared\*' 'C:\Users\aym14\Documents\WebstormProjects\boukii\boukii-admin-panel\docs\shared\' -Force

# Verificar sync exitoso
Get-ChildItem 'C:\laragon\www\api-boukii\docs\shared\' | Measure-Object

# Desde backend → frontend
pwsh .\.docs-sync\ROBUST_SYNC.ps1 -BackToFront
```

## 🛡️ Protección Anti-Bucle

### Problema
Sin protección, el flujo sería:
1. Cambio en frontend → GitHub Actions → commit en backend
2. Commit en backend → GitHub Actions → commit en frontend
3. **Bucle infinito** 🔄

### Solución
- **Commits humanos**: `docs:`, `feat:`, `fix:`, etc. → **SÍ disparan sync**
- **Commits automáticos**: `docs-sync:` → **NO disparan sync**

### Implementación
```yaml
# En .github/workflows/sync-docs.yml
if: ${{ !contains(github.event.head_commit.message, 'docs-sync:') }}
```

## 🔧 Archivos del Mecanismo

### `ROBUST_SYNC.ps1`
Script PowerShell para sincronización manual entre repositorios locales.

### `.github/workflows/sync-docs.yml`
Workflow de GitHub Actions que se ejecuta automáticamente en cada push.

## 📋 Flujo de Trabajo Normal

### 1. Editar Documentación
```bash
# Editar cualquier archivo en docs/shared/
vim docs/shared/V5_OVERVIEW.md
```

### 2. Commit Normal
```bash
git add docs/shared/V5_OVERVIEW.md
git commit -m "docs: update V5 overview with new architecture details"
git push origin v5
```

### 3. Sincronización Automática
- GitHub Actions detecta el cambio
- Copia `docs/shared/` al repositorio hermano
- Crea commit con mensaje: `docs-sync: mirror shared docs from frontend → backend`

### 4. Resultado
- Ambos repositorios tienen la documentación idéntica
- Sin intervención manual necesaria

## ⚠️ Reglas Importantes

### ✅ Hacer
- Editar documentación en cualquier repositorio
- Usar prefijos estándar: `docs:`, `feat:`, `fix:`
- Sync manual si necesitas cambios inmediatos
- Resolver conflictos en PRs con diff visual

### ❌ No Hacer
- **NUNCA** usar prefijo `docs-sync:` manualmente
- No editar el mismo archivo simultáneamente en ambos repos
- No modificar archivos de workflow sin coordinar
- No bypasear el mecanismo anti-bucle

## 🐛 Troubleshooting

### Sync No Funciona
1. Verificar que PAT_SYNC existe como secret en GitHub
2. Comprobar permisos del token (Contents: Write)
3. Verificar que la rama `v5` existe en destino
4. Revisar logs en GitHub Actions

### Conflictos de Merge
1. Hacer pull del repositorio de destino
2. Resolver conflictos manualmente
3. Crear PR para review si es necesario
4. Preferir versión más reciente en caso de duda

### Token Expirado
1. Regenerar PAT en GitHub
2. Actualizar secret PAT_SYNC en ambos repositorios
3. Test con push pequeño para verificar

## 📊 Monitoring

### GitHub Actions
- Ve a "Actions" en cada repositorio
- Busca workflows "Sync Shared Docs"
- Verificar logs si hay fallos

### Commits de Sync
```bash
# Ver commits de sincronización
git log --oneline | grep "docs-sync:"

# Verificar último sync
git log -1 --grep="docs-sync:"
```

## 🔮 Evolución Futura

### Mejoras Planificadas
- [ ] Validación de sintaxis Markdown antes de sync
- [ ] Notificaciones Slack en caso de conflictos
- [ ] Dashboard de estado de sincronización
- [ ] Sync bidireccional de otros directorios (si necesario)

### Métricas
- Frecuencia de sincronización
- Tasa de éxito de workflows
- Tiempo promedio de propagación
- Conflictos detectados y resueltos

---
*Generado automáticamente el 2025-08-13*