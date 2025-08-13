# CLAUDE.md

Este archivo proporciona instrucciones y contexto para **Claude Code** (claude.ai/code) al trabajar con el repositorio de **Boukii V5**.

Incluye información de **frontend (Angular 16)** y **backend (Laravel 10+)**, arquitectura, buenas prácticas, comandos de desarrollo, manejo de contexto multi-escuela/temporada, logs, manejo de errores y plan de pruebas.

---

## 📂 Ubicaciones principales
- **Backend Laravel**: `C:\laragon\www\api-boukii`
- **Frontend Angular**: Boukii Admin Panel V5 (Angular 16, tema Vex)

---

## 💻 Development Commands

### Backend (Laravel)
- `php artisan serve` - Iniciar servidor local (no usar, ya está en Laragon) la url es: http://api-boukii.test
- `php artisan migrate` - Ejecutar migraciones
- `php artisan test` - Ejecutar suite de tests
- `php artisan route:list` - Listar rutas
- `php artisan tinker` - Consola interactiva

### Frontend (Angular)
- `npm start` - Inicia el servidor de desarrollo
- `npm run start2` - Inicia sin live reload
- `npm run build` - Compila la aplicación (memoria ampliada)
- `npm test` - Ejecuta tests unitarios (Karma)
- `npm run lint` - Ejecuta linting
- `npm run e2e` - Ejecuta pruebas E2E

**Environments disponibles:**
- Producción: `ng build --configuration=production`
- Desarrollo: `ng build --configuration=development`
- Local: `ng build --configuration=local`

---

## 🏗 Arquitectura General

### Backend (Laravel 10+)
- **Sistema multi-escuela y multi-temporada**
  - Cada request admin incluye `X-School-ID` y `X-Season-ID`
  - Roles y permisos por escuela y temporada
- **Middlewares clave**
  - Unificar `SchoolContextMiddleware` y `SeasonContextMiddleware` en `ContextMiddleware`
  - `RolePermissionMiddleware` y `SeasonPermissionGuard` → unificar
- **Controladores y rutas**
  - Rutas en `routes/api/v5.php`
  - Eliminar duplicados (`routes/api/v5-unified.php`, backups)
- **Base de datos**
  - Tabla `user_season_roles` con migración formal
  - Seeds seguros usando `updateOrCreate`
  - Usuarios de prueba:
    - `admin@boukii-v5.com` (multi-school: school 2 y otra)
    - `multi@boukii-v5.com` (solo school 2)
  - School 2 debe tener al menos una season activa
- **Flujo protegido**
  - Todas las rutas admin deben pasar por:
    - `auth:sanctum`
    - `context.middleware`
    - `role.permission.middleware`

---

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
- **ContextService**
  - Gestiona selección y persistencia del contexto
- **Guards**
  - `AuthV5Guard`
  - `SeasonContextGuard`
- **UI dinámica**
  - Menús y acciones según permisos backend
  - Sidebar y navbar visibles en todo el flujo admin

---

## 🎨 Frontend Architecture Overview (Angular 16)

**Key Directories:**
- `src/@vex/` - Vex theme framework components, layouts, utilities
- `src/app/pages/` - Páginas principales (dashboard, analytics, bookings, courses, etc.)
- `src/service/` - Servicios core para API, auth y lógica de negocio
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
- Dashboard con widgets
- Gestión de clientes
- Gestión de cursos/reservas (v1 y v2)
- Gestión de monitores
- Calendario integrado
- Chat interno
- Análisis y reporting
- Gestión de usuarios admin

**Key Services:**
- `ApiService` - Cliente HTTP con headers de auth
- `AuthService` - Autenticación y usuarios
- `ConfigService` - Configuración de tema
- Servicios por dominio (analytics, bookings, courses...)

**Component Architecture:**
- Modular (Vex)
- Componentes en `src/app/components/`
- Widgets en `src/@vex/components/widgets/`
- Layout con sidenav, toolbar, footer

**Styling:**
- TailwindCSS + SCSS
- Theming dinámico con CSS vars
- Material Design themes

**API Integration:**
- Base URL por environment
- JWT en `localStorage`
- HTTP interceptors

**State Management:**
- Servicios + RxJS
- Estado UI por componente
- ConfigService para layout/theme

**Internationalization:**
- ngx-translate
- Archivos en `src/assets/i18n/` (EN, ES, FR, DE, IT)

---

## ⚠️ Buenas Prácticas

### Seeds
- Siempre `updateOrCreate`
- Nunca borrar datos reales
- Probar en **staging** antes de prod

### Código
- PSR-4 en Laravel
- Convenciones Angular
- Evitar duplicación
- Lógica compleja en `Services`/`Repositories`
- Validar contexto y permisos de forma unificada

### Logs
- Canal `v5_enterprise` con:
  - `user_id`, `school_id`, `season_id`, endpoint y método
- Separar:
  - Errores API
  - Errores de permisos
  - Auditoría

### Error Handling
- `V5ExceptionHandler` para respuestas JSON estándar:
  ```json
  {
    "success": false,
    "message": "Error message",
    "errors": { ... }
  }

## 📚 Documentación

- Consolidar en `docs/V5_OVERVIEW.md`
- Incluir diagramas de flujo del proceso login → selección de escuela → selección de temporada → dashboard.
- Actualizar contratos de API (OpenAPI/Swagger) para school y season context.
- Archivar documentación antigua en `docs/archive/` (archivos obsoletos, planes antiguos, backups, scripts no usados).

---

## 🧪 Plan de Tests

### Backend (Laravel)
**Unit Tests**
- `ContextMiddleware`
- `RolePermissionMiddleware`

**Feature Tests**
- Login con una escuela (acceso directo)
- Login con varias escuelas (selector de escuela)
- Selección de temporada (simple y múltiple)
- Creación de temporada (con y sin permisos)
- Acceso sin contexto → debe devolver error

---

### Frontend (Angular)
**Unit Tests**
- `ContextService`
- HTTP Interceptor (envío de `X-School-ID` y `X-Season-ID`)
- Guards (AuthV5Guard, SeasonContextGuard)

**Component Tests**
- Selector de escuela
- Selector de temporada

---

### E2E (Cypress)
- **Escenario 1:** single-school / single-season → dashboard directo
- **Escenario 2:** multi-school → selector escuela → auto-selección de temporada
- **Escenario 3:** multi-season → selector temporada
- **Escenario 4:** creación de temporada
- Verificar que todos los requests incluyen los headers `X-School-ID` y `X-Season-ID`

---

## ✅ Checklist "Ready for Production"

- [ ] `docs/V5_OVERVIEW.md` actualizado y validado
- [ ] Middleware de contexto unificado (`ContextMiddleware`)
- [ ] `RolePermissionMiddleware` adaptado para permisos por escuela y temporada
- [ ] Controladores y rutas unificados (sin duplicados)
- [ ] Seeds seguros con `updateOrCreate` y creación de usuarios de prueba
- [ ] Interceptor y guards en Angular funcionando
- [ ] UI dinámica según permisos del usuario
- [ ] Suite de tests en verde (Laravel, Angular y Cypress)
- [ ] Logs con contexto (`user_id`, `school_id`, `season_id`) activos
- [ ] Validación manual en entorno de **staging**
