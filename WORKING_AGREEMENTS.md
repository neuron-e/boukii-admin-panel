# Working Agreements - Boukii V5

## 🎯 Reglas de Desarrollo

### Ramas de Trabajo
- **Rama principal**: `v5` (frontend y backend)
- **Feature branches**: `feature/nombre-descriptivo`
- **Hotfix branches**: `hotfix/descripcion-fix`
- **Merge strategy**: Squash and merge para features

### Estándares de Commit

#### Prefijos Obligatorios
```yaml
feat:     # Nueva funcionalidad
fix:      # Bug fix
docs:     # Cambios en documentación
docs-sync:# Sincronización automática de docs (NO USAR MANUALMENTE)
style:    # Cambios de formato (sin afectar lógica)
refactor: # Refactoring de código  
perf:     # Mejoras de performance
test:     # Añadir o modificar tests
chore:    # Tasks de mantenimiento
ci:       # Cambios en CI/CD
```

#### Ejemplos de Buenos Commits
```bash
feat(auth): implement multi-school selection flow
fix(dashboard): resolve CORS errors from nonexistent endpoints  
docs(api): update OpenAPI schema for V5 endpoints
test(e2e): add complete auth flow validation
refactor(middleware): unify context validation logic
```

#### Evitar Commits Vagos
```bash
# ❌ Evitar
"fix stuff"
"update code"  
"changes"
"WIP"

# ✅ Usar
"fix(bookings): validate season context before creating booking"
"feat(clients): add multi-school client filtering"
```

### Etiquetas de Pull Requests

#### Labels Requeridos
```yaml
priority:high    # Crítico, bloquea desarrollo
priority:medium  # Importante, incluir en próximo sprint  
priority:low     # Nice-to-have, backlog

type:feature     # Nueva funcionalidad
type:bugfix      # Corrección de bug
type:hotfix      # Fix crítico para producción
type:refactor    # Mejora de código sin nuevas features

area:frontend    # Cambios en Angular
area:backend     # Cambios en Laravel  
area:fullstack   # Cambios en ambos
area:docs        # Solo documentación
area:ci          # Pipeline, deploy, etc.
```

#### Plantilla de PR
```markdown
## 🎯 Descripción
Breve descripción del cambio

## ✅ Tipo de Cambio
- [ ] Feature nueva
- [ ] Bug fix  
- [ ] Breaking change
- [ ] Documentation update

## 🧪 Testing
- [ ] Unit tests actualizados
- [ ] E2E tests pasan
- [ ] Manual testing completado

## 🔍 Checklist  
- [ ] Code review self-check
- [ ] No console.log/dump() en código
- [ ] Documentation actualizada
- [ ] Breaking changes documentados

## 📋 Screenshots/Evidence
[Si aplica - capturas de pantalla, logs, etc.]
```

### Breaking Changes

#### Definición
- Cambios en API que requieren actualización en cliente
- Modificaciones en database schema sin migración
- Cambios en autenticación o autorización
- Modificación de interfaces/contratos existentes

#### Proceso para Breaking Changes
1. **Discusión previa**: Issue/discussion antes de implementar
2. **Versionado**: Increment major version (v5 → v6)
3. **Migration guide**: Documentar pasos de migración
4. **Deprecation period**: 2 releases mínimo antes de remover

#### Ejemplos de Breaking Changes
```yaml
✅ Acceptable:
  - Añadir campo opcional a API response
  - Nuevo endpoint con nueva funcionalidad
  - Mejoras de performance sin cambio de interfaz

❌ Breaking Changes:
  - Remover campo de API response
  - Cambiar tipo de dato de campo existente  
  - Modificar estructura de autenticación
  - Cambiar URL de endpoints existentes
```

## 📝 Flujo de Edición de Docs

### Documentación Compartida (`/docs/shared/`)

#### Reglas de Edición
- **Editar en el repo donde estés trabajando** (front o back)
- **Commits humanos**: Usar prefijo `docs:`
- **Commits automáticos**: Sistema usa `docs-sync:` (no tocar)
- **Conflictos**: Resolver en PR con diff visual
- **Simultaneidad**: Evitar editar mismo archivo en ambos repos

#### Workflow Normal
```bash
# 1. Editar documentación en repo actual
vim docs/shared/V5_OVERVIEW.md

# 2. Commit con prefijo docs:
git add docs/shared/V5_OVERVIEW.md
git commit -m "docs: update V5 overview with new modules"

# 3. Push a rama v5
git push origin v5

# 4. GitHub Actions sincroniza automáticamente al otro repo
# (commit automático con prefijo docs-sync:)
```

#### Sync Manual (si necesitas inmediatez)
```powershell
# Frontend → Backend
pwsh .\.docs-sync\ROBUST_SYNC.ps1 -FrontToBack

# Backend → Frontend  
pwsh .\.docs-sync\ROBUST_SYNC.ps1 -BackToFront
```

#### Anti-bucle Protection
- Commits con mensaje `docs-sync:` **NO** disparan nueva sincronización
- Evita loops infinitos entre repositorios
- Solo commits "humanos" (`docs:`, `feat:`, etc.) sincronizan

### Documentación Específica

#### Frontend (`/docs/frontend/`)
- Arquitectura Angular específica
- Guías de componentes Vex
- Setup y configuración local
- **NO se sincroniza** (solo frontend)

#### Backend (`/docs/backend/`)  
- Arquitectura Laravel específica
- Database schemas y migrations
- API endpoints detallados
- **NO se sincroniza** (solo backend)

## 🚀 Deployment y Releases

### Ambientes
```yaml
Development:
  Frontend: http://localhost:4200
  Backend: http://api-boukii.test
  
Staging:
  Frontend: https://admin-staging.boukii.com  
  Backend: https://api-staging.boukii.com
  
Production:
  Frontend: https://admin.boukii.com
  Backend: https://api.boukii.com
```

### Release Process
1. **Feature freeze** en rama `v5`
2. **Testing completo**: Unit + E2E + Manual
3. **Create release branch**: `release/v5.x.0`
4. **Deploy to staging**: Validación final
5. **Tag release**: `v5.x.0` con changelog
6. **Deploy to production**: Con rollback plan
7. **Post-deploy verification**: Smoke tests

### Rollback Strategy
- **Database**: Migrations reversibles obligatorias
- **Frontend**: Deploy anterior disponible en CDN
- **Backend**: Container anterior en registry
- **DNS**: Cambio inmediato a versión estable

## 🔧 Tools y Configuración

### IDEs y Extensions
```yaml
VS Code Extensions:
  - Angular Language Service
  - PHP Intelephense  
  - Laravel Blade Snippets
  - GitLens
  - Thunder Client (API testing)
  - OpenAPI (Swagger) Editor

PhpStorm:
  - Laravel Plugin
  - .env files support
  - Database tools
  - Git integration
```

### Git Hooks (recomendados)
```bash
# Pre-commit hook
#!/bin/sh
# Ejecutar linting antes de commit
npm run lint && php artisan test --group=fast

# Pre-push hook  
#!/bin/sh
# Ejecutar tests completos antes de push
npm test && php artisan test
```

### Conventional Commits
- Seguir estándar [Conventional Commits](https://www.conventionalcommits.org/)
- Usar herramientas como `commitizen` para asegurar formato
- Generar changelog automático desde commits

## 🛠 Troubleshooting Común

### Sincronización de Docs
```bash
# Si sync no funciona, verificar:
1. PAT_SYNC secret configurado en ambos repos
2. Permisos del token (Contents: Write)  
3. Rama de destino existe (v5)
4. No hay conflictos de merge

# Debug manual:
git log --oneline | grep "docs-sync:"
```

### Context Headers
```bash
# Si requests fallan por contexto:
1. Verificar headers en DevTools Network tab
2. localStorage debe tener school_id y season_id
3. Interceptor HTTP debe estar registrado
4. Backend middleware debe procesar headers
```

### Build Failures
```bash
# Frontend
npm ci         # Clean install
rm -rf dist/   # Clean build folder
npm run build:development

# Backend
composer install --no-dev  # Production deps only
php artisan config:clear    # Clear cache
php artisan route:clear
```

---

## 📞 Escalation y Support

### Blocking Issues
1. **Slack/Teams**: Notificación inmediata al team
2. **GitHub Issues**: Con label `priority:high`
3. **Direct contact**: Para issues críticos de producción

### Code Review
- **2 approvals** mínimo para cambios en core
- **1 approval** para features nuevas
- **Self-merge** solo para docs y fixes menores

---
*Última actualización: 2025-08-13*