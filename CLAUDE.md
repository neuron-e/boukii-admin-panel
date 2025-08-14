# CLAUDE.md

Este archivo proporciona **instrucciones y estándares completos** para trabajar con **Boukii V5** usando **Claude Code**. 

Incluye información de **frontend (Angular 16)** y **backend (Laravel 10+)**, arquitectura, buenas prácticas, comandos de desarrollo, validación obligatoria, testing, y sincronización de documentación entre repos.

> **Repositorios**
> - **Backend Laravel**: `api-boukii` (rama `v5`) - `C:\laragon\www\api-boukii` 
> - **Frontend Angular**: `boukii-admin-panel` (rama `v5`) - Este repo
> - **Docs compartida**: `docs/shared/` (sincronizada entre ambos repos)

---

## 📂 Ubicaciones principales
- **Backend Laravel**: `C:\laragon\www\api-boukii` (URL local: `http://api-boukii.test`)
- **Frontend Angular**: Boukii Admin Panel V5 (Angular 16, tema Vex)

---

## 💻 Development Commands

### Backend (Laravel)
- **No usar** `php artisan serve` (Laragon ya sirve en `http://api-boukii.test`)
- `php artisan migrate` - Ejecutar migraciones
- `php artisan test` - Suite completa de tests
- `php artisan route:list` - Listar rutas
- `php artisan tinker` - Consola interactiva

#### Testing Backend
```bash
php artisan test                          # Suite completa
php artisan test --group=v5              # Solo tests V5
php artisan test --group=context         # Tests de contexto
php artisan test --coverage              # Con cobertura
php artisan test tests/Feature/V5/AuthTest.php  # Test específico
```

#### Calidad de Código Backend
```bash
vendor/bin/pint                          # Code style fixer
vendor/bin/phpstan analyse               # Static analysis
vendor/bin/php-cs-fixer fix              # CS fixer
```

### Frontend (Angular)
- `npm start` - Servidor de desarrollo
- `npm run start2` - Sin live reload
- `npm run build` - Compilación (memoria ampliada)
- `npm test` - Tests unitarios (Karma)
- `npm run lint` - Linting
- `npm run e2e` - Pruebas E2E

**Environments disponibles:**
- Producción: `ng build --configuration=production`
- Desarrollo: `ng build --configuration=development`  
- Local: `ng build --configuration=local`

### 🚨 **VALIDACIÓN OBLIGATORIA DESPUÉS DE CAMBIOS**

#### **FRONTEND - PROCESO OBLIGATORIO:**
```bash
# 1. COMPILACIÓN (obligatorio)
npm run build:development
# ✅ DEBE compilar sin errores

# 2. LINTING (obligatorio)
npm run lint
# ✅ DEBE pasar sin errores

# 3. TESTS (obligatorio)
npm test
# ✅ DEBE pasar todos los tests

# 4. VERIFICACIÓN VISUAL (recomendado)
npm start
# ✅ Navegar y verificar que la funcionalidad funciona
```

#### **BACKEND - PROCESO OBLIGATORIO:**
```bash
# 1. TESTS (obligatorio)
php artisan test
# ✅ DEBE pasar todos los tests

# 2. CALIDAD CÓDIGO (obligatorio)  
vendor/bin/pint
vendor/bin/phpstan analyse
# ✅ DEBE pasar sin errores críticos

# 3. VERIFICACIÓN API (recomendado)
php artisan route:list --path=v5
# ✅ Verificar que las rutas están disponibles
```

#### **⚠️ REGLAS CRÍTICAS:**
- **NUNCA commitear código que no compile**
- **NUNCA saltarse la validación** después de cambios
- **Si hay errores de compilación/test**: ARREGLARLOS antes de continuar
- **Si hay dudas sobre funcionamiento**: PROBARLO manualmente

---

## 🏗 Arquitectura General

### Backend (Laravel 10+)
- **Sistema multi-escuela y multi-temporada**
  - Cada request admin incluye `X-School-ID` y `X-Season-ID` 
  - Roles y permisos granulares por escuela y temporada
- **Middlewares clave**
  - `ContextMiddleware` unificado para validar contexto y permisos
  - `RolePermissionMiddleware` para autorización
- **Controladores y rutas**
  - Rutas en `routes/api/v5.php` 
  - Extender `BaseV5Controller`
  - Middleware stack: `auth:sanctum` → `context.middleware` → `role.permission.middleware`
- **Base de datos**
  - Tabla `user_season_roles` con migración formal
  - Seeds idempotentes usando `updateOrCreate`
  - Usuarios de prueba: `admin@boukii-v5.com`, `multi@boukii-v5.com`
- **Logs estructurados**
  - Canal `v5_enterprise` con contexto (`user_id`, `school_id`, `season_id`)

### Frontend (Angular 16)
- **Tema base**: Vex + TailwindCSS + Angular Material
- **Flujo multi-escuela/temporada**
  1. Login
  2. Si solo 1 school → auto-selección
  3. Si varias → selector de escuela
  4. Una vez seleccionada:
    - Si solo 1 season activa → auto-selección
    - Si varias → modal de selección con opción de crear (si permisos)
  5. Guardar `school_id` y `season_id` en `localStorage`
  6. Interceptor HTTP inyecta `X-School-ID` y `X-Season-ID` en todas las peticiones
- **Servicios clave**
  - `AuthV5Service` - Autenticación y contexto
  - `SeasonContextService` - Gestión de temporadas
  - `DashboardService` - Datos del dashboard
- **Guards**
  - `AuthV5Guard` - Protección de rutas
  - `SeasonContextGuard` - Verificación de contexto
- **UI dinámica**
  - Menús y acciones según permisos backend
  - Sidebar y navbar visibles en todo el flujo admin

---

## 🎨 Frontend Architecture Overview (Angular 16)

**Key Directories:**
- `src/@vex/` - Vex theme framework components, layouts, utilities
- `src/app/v5/pages/` - Páginas V5 (dashboard, clients, courses, bookings, monitors)
- `src/app/v5/core/services/` - Servicios core para API, auth y lógica de negocio
- `src/environments/` - Configuración por entorno

**Core Technologies:**
- Angular 16 (TypeScript)
- Angular Material
- TailwindCSS (custom config)
- RxJS
- Firebase Auth
- ApexCharts
- Otros: Calendar, QR, export Excel, etc.

**Main Features:**
- Dashboard V5 con widgets dinámicos
- Sistema de autenticación multi-escuela/temporada
- Gestión de clientes, cursos, reservas, monitores
- Widgets avanzados con datos en tiempo real
- Calendario integrado
- Chat interno
- Análisis y reporting

**Key Services:**
- `ApiV5Service` - Cliente HTTP con headers de contexto
- `AuthV5Service` - Autenticación y gestión de usuarios
- `SeasonContextService` - Gestión de contexto multi-tenant
- `DashboardService` - Datos del dashboard y analytics
- `TokenV5Service` - Gestión de tokens JWT

**Component Architecture:**
- Modular basado en Vex
- Componentes V5 en `src/app/v5/`
- Widgets dinámicos en `src/app/v5/shared/components/`
- Layout con sidenav, toolbar, footer

---

## 🔐 Seguridad & Cumplimiento (GDPR-by-design)

### Backend (Laravel)
- **PII/PHI**: Definir `PII_SENSITIVE_KEYS` para redactar en logs
- **Secrets**: Solo en `.env` / secret store, nunca en código
- **Mass assignment**: Usar `$fillable`, nunca `guarded=[]`
- **Policies/Gates**: Toda operación pasa por Policy + middleware
- **Rate limiting**: Límites estrictos en rutas públicas
- **CORS**: Restringir a dominios de confianza
- **Uploads**: Validar tamaño/tipo/conteo
- **Auditoría**: Canal `audit` + tabla `audits`

### Frontend (Angular)
- **JWT Storage**: Tokens en localStorage con expiración
- **HTTP Interceptors**: Headers de contexto automáticos
- **Route Guards**: Protección de rutas sensibles
- **Form Validation**: Validación client + server side
- **XSS Protection**: Sanitización de inputs
- **CSRF**: Tokens en formularios críticos

---

## 🧾 Logging y Observabilidad

### Backend Logging (JSON estructurado)
```php
// Contexto automático en todos los logs
Log::info('Dashboard loaded', [
    'user_id' => $userId,
    'school_id' => $schoolId,
    'season_id' => $seasonId,
    'endpoint' => '/api/v5/dashboard/stats'
]);
```

### Frontend Logging
```typescript
// Error handling en servicios
this.logger.error('DashboardService', 'Error loading data', error);
this.errorHandler.handleError(error, 'loadDashboardData');
```

---

## 📐 Estándares de API V5

### Request/Response Format
```json
// Request Headers (obligatorios para rutas admin)
{
  "Authorization": "Bearer {jwt_token}",
  "X-School-ID": "2",
  "X-Season-ID": "14",
  "Content-Type": "application/json"
}

// Success Response
{
  "success": true,
  "message": "Data retrieved successfully", 
  "data": { /* payload */ },
  "meta": { "pagination": {...} }
}

// Error Response (RFC 7807)
{
  "type": "https://boukii.app/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "The provided data is invalid",
  "code": "VALIDATION_ERROR",
  "errors": { "email": ["Invalid email format"] },
  "request_id": "uuid-here"
}
```

### Endpoints Disponibles (V5)
- `GET /api/v5/dashboard/stats` - Métricas generales
- `GET /api/v5/dashboard/revenue` - Datos financieros
- `GET /api/v5/dashboard/bookings` - Reservas con filtros
- `POST /api/v5/auth/login` - Login multi-escuela
- `GET /api/v5/auth/schools` - Escuelas disponibles
- Ver `docs/shared/api/ENDPOINTS_STATUS.md` para inventario completo

---

## 🧪 Testing Strategy

### Backend Testing (Laravel)
```bash
# Pirámide de testing: 70% unit, 25% integration, 5% E2E
php artisan test --testsuite=Unit        # Tests unitarios
php artisan test --testsuite=Feature     # Tests de integración
php artisan test --group=v5             # Tests específicos V5
php artisan test --coverage              # Cobertura (mínimo 80%)
```

**Casos críticos:**
- Login multi-escuela con tokens contextuales
- Middleware de contexto (validación headers)
- Permisos por escuela/temporada
- Respuestas API con formato estándar
- Manejo de errores y logging

### Frontend Testing (Angular)
```bash
# Tests unitarios
npm test                                 # Karma + Jasmine
npm run test:watch                       # Modo watch
npm run test:coverage                    # Con cobertura

# Tests E2E
npm run e2e                             # Cypress E2E
```

**Casos críticos:**
- Flujo de autenticación completo
- Interceptors HTTP (headers de contexto)
- Guards de rutas
- Servicios de API (mocking)
- Componentes de dashboard

---

## ⚠️ Buenas Prácticas V5

### Backend (Laravel)
- Extender `BaseV5Controller` para endpoints V5
- Usar Form Requests para validación
- Respuestas JSON consistentes
- Context filtering en queries Eloquent
- Logs estructurados con contexto
- Seeds idempotentes con `updateOrCreate`

### Frontend (Angular)
- Seguir estructura de módulos V5
- Usar servicios para lógica de negocio
- Implementar loading states y error handling
- Componentes reactivos con OnPush
- Interceptors para headers automáticos
- Guards para protección de rutas

---

## 🔄 Sincronización de Documentación

### Carpetas Editables por Claude
- `docs/shared/` - Documentación sincronizada entre frontend y backend
  - `docs/shared/api/` - Documentación de endpoints y contratos API
  - `docs/shared/status/` - Estados de integración cross-repo  
  - `docs/shared/fixes/` - Documentación de fixes técnicos críticos
- `docs/frontend/` - Documentación específica del frontend (solo en este repo)
- `docs/backend/` - Documentación específica del backend (solo en backend repo)
- `CLAUDE.md` - Instrucciones para IA (en ambos repos)

### Reglas de Commits
- **Cambios normales**: `docs: descripción del cambio`
- **Commits de sync automática**: `docs-sync: descripción` (NUNCA usar manualmente)
- **Anti-bucle**: Commits con `docs-sync:` NO disparan nueva sincronización

### Proceso de Sync
1. Editar documentación en `/docs/shared/` del repo actual
2. Commit con prefijo `docs:`
3. GitHub Actions sincroniza automáticamente al otro repo
4. Para sync inmediata usar script: `.docs-sync/ROBUST_SYNC.ps1`

### ⚠️ Importante
- NUNCA tocar código sin crear PR primero
- Nunca usar prefijo `docs-sync:` manualmente
- Si el commit contiene `docs-sync:`, no se dispara otra sincronización

---

## 🧪 Plan de Tests

### Backend (Laravel)
**Unit Tests**
- `ContextMiddleware` - Validación de headers y contexto
- `BaseV5Controller` - Helpers y context injection
- `SeasonService` - Lógica de temporadas

**Feature Tests**
- Login con una escuela (acceso directo)
- Login con varias escuelas (selector de escuela)
- Selección de temporada (simple y múltiple)
- Creación de temporada (con y sin permisos)
- Acceso sin contexto → debe devolver error
- Dashboard endpoints con datos reales

### Frontend (Angular)
**Unit Tests**
- `AuthV5Service` - Autenticación y contexto
- `SeasonContextService` - Gestión de temporadas
- HTTP Interceptor - Envío de headers de contexto
- Guards (`AuthV5Guard`, `SeasonContextGuard`)

**Component Tests**
- `SeasonSelectorComponent` - Selector de temporada
- `DashboardComponent` - Dashboard principal
- `ReservationsWidgetComponent` - Widget de reservas

### E2E (Cypress)
- **Escenario 1**: single-school / single-season → dashboard directo
- **Escenario 2**: multi-school → selector escuela → auto-selección temporada
- **Escenario 3**: multi-season → selector temporada
- **Escenario 4**: creación de temporada
- Verificar que todos los requests incluyen headers `X-School-ID` y `X-Season-ID`

---

## ✅ Checklist "Ready for Production"

### Backend
- [ ] Middleware de contexto unificado (`ContextMiddleware`)
- [ ] `BaseV5Controller` con helpers estándar
- [ ] Controladores y rutas V5 sin duplicados
- [ ] Seeds seguros con `updateOrCreate` y usuarios de prueba
- [ ] Suite de tests en verde (Laravel)
- [ ] Logs con contexto (`user_id`, `school_id`, `season_id`) activos
- [ ] API endpoints documentados en `docs/shared/api/`

### Frontend  
- [ ] Interceptor y guards funcionando
- [ ] UI dinámica según permisos del usuario
- [ ] Widgets dinámicos con datos reales
- [ ] Suite de tests en verde (Angular + Cypress)
- [ ] Build sin errores en todos los environments
- [ ] Validación post-cambios implementada

### Documentación
- [ ] `docs/shared/api/ENDPOINTS_STATUS.md` actualizado
- [ ] `docs/shared/status/INTEGRATION_MATRIX.md` completo
- [ ] CLAUDE.md actualizado en ambos repos
- [ ] Sprint documentation completada
- [ ] Validación manual en entorno de **staging**

---

## 🧭 Guardrails para IA (Claude/Codex)

### Áreas Permitidas
**Backend**: `app/`, `routes/api/v5.php`, `app/Http/**`, `app/V5/**`, `tests/**`, `docs/**`
**Frontend**: `src/app/v5/`, `src/environments/`, `docs/**`, tests/**`

### Prohibiciones
- Nunca tocar `.env` o secrets
- No datos reales en issues/PR (usar sintéticos)
- No commits destructivos sin diff previo
- No saltarse validación post-cambios

### Commits Standards
- Trabajo normal: `feat|fix|refactor|docs|test: ...`
- Sincronía docs (CI): `docs-sync: ...` (solo CI)
- Breaking changes: `feat!: ...` o `BREAKING:`

### PR Template (obligatorio)
```md
## Motivación
<!-- ¿Qué problema resuelve? -->

## Cambios  
<!-- Lista de cambios principales -->

## Validación Realizada
- [ ] ✅ Frontend compila sin errores (`npm run build`)
- [ ] ✅ Tests pasan (`npm test` / `php artisan test`)
- [ ] ✅ Linting pasa (`npm run lint` / `vendor/bin/pint`)
- [ ] ✅ Verificación manual funcionando

## Riesgos
<!-- Datos, migraciones, performance -->

## Rollback Plan
<!-- Plan de reversión si es necesario -->
```

---

## 📞 Contexto Legacy (para referencia)

### Sistemas Existentes
- **Booking** (motor complejo de precios/pagos/vouchers)
- **Course** (flexible/privado/fijo por grupos) 
- **Client** (multi-idioma, utilizers)
- **Monitor** (títulos/horarios)

### Servicios Legacy
- `BookingPriceCalculatorService`, `AnalyticsService`, `PayrexxService`, `SeasonFinanceService`

### Migración a V5
- Nuevas features → `/api/v5/` únicamente
- Mantener compatibilidad legacy mientras se migra
- Controladores V5 deben extender `BaseV5Controller`
- Logs estructurados con contexto estándar

---

*Última actualización: 2025-08-14*

---

# important-instruction-reminders
**VALIDACIÓN POST-CAMBIOS ES OBLIGATORIA:**
1. **Compilación** sin errores
2. **Tests** pasando
3. **Linting** limpio
4. **Verificación manual** cuando sea posible

NUNCA commitear código que no compile o que rompa tests existentes.