# Guía de Prompts para IA - Boukii V5

## 🎯 Estilo y Convenciones

### Comunicación con Claude
- **Directo y conciso**: Máximo 4 líneas de respuesta
- **Sin explicaciones innecesarias**: Evitar preámbulos y postámbulos
- **Foco en la tarea**: Solo abordar lo solicitado específicamente
- **Uso de herramientas**: Preferir TodoWrite para tareas complejas

### Estructura de Prompts

```markdown
## Contexto base
[Descripción del sistema, arquitectura relevante]

## Tarea específica  
[Qué necesita hacer exactamente]

## Tests requeridos
[Qué validar después del cambio]

## Validación manual
[Pasos para comprobar que funciona]
```

## 📝 Plantillas de Prompts

### Para Desarrollo Frontend (Angular)

```markdown
# Contexto: Boukii V5 Frontend (Angular 16 + Vex Theme)
- Arquitectura: Multi-escuela, contexto por temporada
- Servicios: ApiService con headers X-School-ID, X-Season-ID
- Guards: AuthV5Guard, SeasonContextGuard
- Intercepción: HTTP interceptor para contexto automático

# Tarea: [DESCRIPCIÓN ESPECÍFICA]

# Validar:
- npm run lint sin errores
- npm run build:development exitoso
- Tests unitarios pasan
- Funcionalidad en http://localhost:4200

# Notas:
- Seguir convenciones Vex + Angular Material
- Nunca hardcodear school_id o season_id
- Usar servicios existentes (ApiService, AuthService)
```

### Para Desarrollo Backend (Laravel)

```markdown
# Contexto: Boukii V5 Backend (Laravel 10+)
- Middleware: ContextMiddleware (X-School-ID, X-Season-ID)
- Auth: Sanctum con context en tokens
- Base URL: http://api-boukii.test
- DB: SQLite en desarrollo, MySQL en producción

# Tarea: [DESCRIPCIÓN ESPECÍFICA]

# Validar:
- php artisan test sin fallos
- php artisan route:list muestra endpoint
- Respuesta JSON con formato estándar {success, data, meta}
- Headers de contexto requeridos en rutas admin

# Notas:
- Extender BaseV5Controller para endpoints V5
- Usar Form Requests para validación
- Log en canal 'v5_enterprise' con contexto
```

### Para Testing E2E

```markdown
# Contexto: Tests E2E con Cypress
- Usuarios de prueba: admin@boukii-v5.com, multi@boukii-v5.com  
- School 2 con temporadas activas
- Flujo: Login → School → Season → Dashboard

# Tarea: [ESCENARIO DE PRUEBA]

# Validar:
- npx cypress run pasa todos los tests
- Capturas de pantalla en cypress/screenshots
- Intercepción de requests con headers correctos
- Estados de UI según permisos del usuario

# Notas:
- Usar datos determinísticos (school 2)
- Verificar headers X-School-ID y X-Season-ID
- Tests independientes y reproducibles
```

## 🔍 Secciones Fijas

### 1. Contexto Base (siempre incluir)
```yaml
Sistema: Boukii V5 - Gestión de escuelas de esquí/snow
Frontend: Angular 16 + Vex + TailwindCSS  
Backend: Laravel 10+ + Sanctum
Arquitectura: Multi-escuela, multi-temporada
Auth: Context headers obligatorios
```

### 2. Comandos de Desarrollo
```bash
# Frontend
npm start                    # Desarrollo
npm run build:development   # Build
npm run lint                 # Linting
npm test                     # Unit tests

# Backend  
php artisan serve            # NO usar, ya en Laragon
php artisan migrate          # Migraciones
php artisan test             # Test suite
php artisan tinker          # Console
```

### 3. Tests Mínimos
```yaml
Backend:
  - php artisan test --group=api
  - Endpoints responden con contexto
  - Middleware valida school/season
  
Frontend:
  - npm run lint
  - npm run build:development  
  - Guards funcionan correctamente
  - Interceptor añade headers
```

### 4. Validación Manual
```yaml
Login Flow:
  1. http://localhost:4200/auth/login
  2. admin@boukii-v5.com / password
  3. Selector de escuela (si múltiples)
  4. Selector de temporada (si múltiples)  
  5. Dashboard con datos contextualizados

API Testing:
  1. POST /api/v5/auth/login
  2. Headers X-School-ID, X-Season-ID
  3. Verificar responses JSON estándar
  4. Logs en storage/logs/laravel.log
```

## 📋 Ejemplos Específicos

### Crear Nuevo Módulo
```markdown
Implementa el módulo Equipment V5 (frontend + backend):

Frontend:
- Componente EquipmentListComponent en src/app/pages/equipment/
- Servicio EquipmentService con CRUD completo
- Routing en equipment.module.ts
- Guards: AuthV5Guard, SeasonContextGuard

Backend:  
- Controlador V5\EquipmentController extends BaseV5Controller
- Modelo Equipment con relaciones School/Season
- Form Requests: StoreEquipmentRequest, UpdateEquipmentRequest
- Rutas en routes/api/v5.php con middleware context

Tests:
- Unit: EquipmentService, EquipmentController
- E2E: equipment-crud-flow.cy.ts

Validar que el CRUD funciona con contexto multi-escuela.
```

### Debug de Issue
```markdown
El dashboard no carga métricas de reservas. Debug paso a paso:

1. Verificar en DevTools:
   - Request a /api/v5/dashboard/stats incluye headers
   - Response 200 con data estructura correcta
   
2. Backend logs:
   - tail -f storage/logs/laravel.log
   - Verificar queries ejecutadas
   - Context middleware funcionando
   
3. Frontend service:
   - DashboardService.getStats() retorna Observable
   - Error handling correcto
   - Cache invalidation si aplica

4. Componente:
   - Suscripción a service observable  
   - Loading states manejados
   - Error states mostrados al usuario

Reporta hallazgos específicos, no suposiciones.
```

## 🚨 Qué NO Hacer

### ❌ Prompts Vagos
```markdown
"Arregla el login" 
"El dashboard no funciona"
"Haz que se vea mejor"
```

### ❌ Sin Contexto
```markdown
"Crea un componente para mostrar datos"
# ¿Qué datos? ¿Qué contexto? ¿Qué validaciones?
```

### ❌ Múltiples Tareas
```markdown
"Implementa authentication, dashboard, y arregla el CSS"
# Una tarea específica por prompt
```

## ✅ Buenas Prácticas

### ✅ Prompts Específicos  
```markdown
"Implementa AuthV5Guard que valide token Sanctum y redirija a /auth/school-selection si falta X-School-ID header"
```

### ✅ Con Criterios de Éxito
```markdown
"El guard debe permitir acceso solo si:
1. Token válido en localStorage
2. Headers X-School-ID y X-Season-ID presentes  
3. Usuario tiene permisos para la escuela"
```

### ✅ Validación Clara
```markdown
"Validar que /dashboard retorna 403 sin contexto headers y 200 con headers correctos usando Postman"
```

---
*Última actualización: 2025-08-13*