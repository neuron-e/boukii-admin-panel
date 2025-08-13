# Boukii V5 - Sistema de Revisión Técnica Completa 2025

## 📋 Resumen Ejecutivo

Este documento presenta una revisión exhaustiva del sistema Boukii V5, incluyendo el análisis completo del frontend Angular, backend Laravel y base de datos. La evaluación identifica el estado actual del sistema, problemas críticos encontrados, y proporciona un plan técnico completo para finalizar la V5 de forma profesional, limpia y escalable.

### 🎯 Objetivos Completados

- ✅ **Revisión arquitectural completa** de Angular y Laravel
- ✅ **Auditoría de seguridad** del sistema de autenticación
- ✅ **Análisis de base de datos** y estructura legacy
- ✅ **Evaluación de multi-tenancy** (escuelas y temporadas)
- ✅ **Estrategia de migración** de datos legacy
- ✅ **Plan de modularización** del sistema
- ✅ **Diseño de roles** superadmin vs admin escuela
- ✅ **Especificaciones técnicas** para módulo de alquiler
- ✅ **Plan de integración** para web pública y app móvil

---

## 🏗️ Arquitectura Actual del Sistema

### Frontend Angular (Admin Panel)

**Tecnologías Base:**
- Angular 16 con TypeScript
- Vex Theme Framework
- TailwindCSS + Angular Material
- RxJS para programación reactiva

**Arquitectura Dual Identificada:**
```
📁 src/app/
├── pages/           # ❌ Sistema Legacy (v1, v2, v3)
├── service/         # ❌ Servicios Legacy
└── v5/             # ✅ Arquitectura V5 Moderna
    ├── features/    # 13 módulos de características
    ├── core/        # Servicios centrales
    └── shared/      # Componentes compartidos
```

**Estado de Módulos V5:**
- ✅ **Implementados**: Auth, Dashboard, Seasons, Schools
- 🟡 **Parciales**: Equipment, Analytics, Payments
- ❌ **Faltantes**: Communications (backend), Public API integration

### Backend Laravel (API)

**Tecnologías Base:**
- Laravel 10 con PHP 8.1+
- Laravel Sanctum (autenticación)
- Spatie Permissions (roles)
- MySQL con arquitectura multi-tenant

**Estructura Modular V5:**
```
📁 app/V5/Modules/
├── Auth/           # ✅ Sistema de autenticación
├── Booking/        # ✅ Gestión de reservas
├── Season/         # ✅ Contexto de temporadas
├── School/         # ✅ Gestión de escuelas
├── Dashboard/      # ✅ Métricas y analíticas
└── [Missing]/      # ❌ Equipment, Payment, Communications
```

**Rutas API Organizadas:**
- `/api/v5/` - V5 moderno (parcial)
- `/api/admin/` - Sistema legacy (completo)
- `/api/teach/` - App móvil monitores (básico)
- `/api/public/` - Web pública (faltante)

---

## 🚨 Problemas Críticos Identificados

### 1. **CRÍTICO: Token Bearer Vacío**
**Problema:** `Authorization: Bearer ` (cadena vacía)
**Ubicación:** `src/service/api.service.ts:15-19`
```typescript
// ❌ PROBLEMA ACTUAL
const token = JSON.parse(localStorage.getItem('boukiiUserToken') || '');
headers = headers.set('Authorization', 'Bearer ' + token);
```

**Solución Inmediata:**
```typescript
// ✅ SOLUCIÓN
const rawToken = localStorage.getItem('boukiiUserToken');
let token = null;
if (rawToken) {
  try {
    token = rawToken.startsWith('"') ? JSON.parse(rawToken) : rawToken;
  } catch {
    token = rawToken;
  }
}
if (token && token.trim() !== '') {
  headers = headers.set('Authorization', `Bearer ${token.trim()}`);
}
```

### 2. **CRÍTICO: Guards Deshabilitados**
**Problema:** Autenticación y contexto de temporada deshabilitados
```typescript
// ❌ EN PRODUCCIÓN
canActivate(): boolean {
  // Temporalmente permitir acceso para desarrollo
  return true;
}
```

### 3. **ALTO: Dependencia Circular**
**Problema:** `SeasonContextService` ↔ `ApiV5Service`
**Impacto:** Bloqueo de inicialización, comportamiento indefinido

### 4. **ALTO: Aislamiento Multi-tenant Incompleto**
- School_id no validado consistentemente
- Riesgo de filtración de datos entre escuelas
- Contexto de temporada no aplicado universalmente

### 5. **MEDIO: Servicios de Autenticación Duales**
- AuthService (legacy) vs AuthV5Service
- Almacenamiento de tokens inconsistente
- Usuario de prueba hardcodeado en V5

---

## 🗄️ Estado de la Base de Datos

### Estructura Actual
- **72 tablas principales** con 14 escuelas y 6 temporadas
- **100+ registros** en booking_users, bookings, clients, courses
- **Índices de rendimiento** implementados recientemente
- **Foreign keys** parcialmente implementadas

### Problemas de Integridad Identificados
1. **Registros huérfanos** sin relaciones válidas
2. **Inconsistencias de estado** entre tablas relacionadas
3. **Falta de constraints** de integridad referencial
4. **Datos legacy** sin contexto de temporada

### Estructura V5 Propuesta
```sql
-- Nuevas tablas V5 planificadas
v5_bookings          # ✅ Reservas unificadas
v5_booking_extras    # ✅ Servicios adicionales modulares
v5_booking_equipment # ❌ Gestión de equipamiento
v5_booking_payments  # ❌ Flujo de pagos
v5_logs             # ✅ Sistema de logging empresarial
```

---

## 🔐 Sistema de Roles y Permisos

### Diseño Jerárquico Propuesto

| Funcionalidad | Superadmin | Admin Escuela | Monitor | Cliente |
|---------------|------------|---------------|---------|---------|
| **Gestión Global** |
| Crear escuelas | ✅ | ❌ | ❌ | ❌ |
| Configurar módulos | ✅ | ❌ | ❌ | ❌ |
| Pasarelas de pago | ✅ | ❌ | ❌ | ❌ |
| **Gestión Escuela** |
| Configurar escuela | ✅ | ✅ | ❌ | ❌ |
| Gestionar cursos | ✅ | ✅ | ✅ (limitado) | ❌ |
| Analíticas escuela | ✅ | ✅ | ❌ | ❌ |
| **Operaciones** |
| Reservas propias | ✅ | ✅ | ✅ | ✅ |
| Ver clientes | ✅ | ✅ | ✅ (solo vista) | ❌ |

### Implementación Técnica
```sql
-- Tabla de configuración por escuela
CREATE TABLE school_configurations (
    school_id BIGINT,
    config_key VARCHAR(255),
    config_value JSON,
    is_locked BOOLEAN DEFAULT FALSE, -- Bloqueado por superadmin
    ...
);

-- Configuración global (solo superadmin)
CREATE TABLE global_configurations (
    config_key VARCHAR(255) UNIQUE,
    config_value JSON,
    ...
);
```

---

## 🧩 Sistema de Modularización

### Módulos Requeridos vs Implementados

| Módulo | Frontend | Backend | Estado |
|--------|----------|---------|--------|
| **Cursos y Reservas** | ✅ V5 | ✅ V5 | Implementado |
| **Alquiler Equipamiento** | 🟡 Placeholder | ❌ Faltante | **Crítico** |
| **Estadísticas** | 🟡 Legacy | 🟡 Parcial | Migrar a V5 |
| **Web Pública** | ❌ Faltante | ❌ Faltante | **Alto** |
| **App Móvil** | ❌ Faltante | 🟡 Básico | **Alto** |
| **Pagos** | 🟡 Básico | 🟡 Básico | Completar |
| **Comunicaciones** | ✅ Frontend | ❌ Backend | **Medio** |

### Infraestructura de Gestión de Módulos Faltante
```sql
-- Sistema de activación de módulos por escuela
CREATE TABLE school_modules (
    school_id BIGINT,
    module_name VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    configuration JSON,
    ...
);
```

---

## 🏗️ Especificaciones Técnicas: Módulo de Alquiler

### Base de Datos Diseñada
```sql
-- Inventario de equipamiento
CREATE TABLE v5_rental_items (
    id BIGINT PRIMARY KEY,
    school_id BIGINT NOT NULL,
    season_id BIGINT NOT NULL,
    item_code VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    category_id BIGINT,
    total_quantity INT,
    available_quantity INT,
    daily_rate DECIMAL(8,2),
    deposit_amount DECIMAL(8,2),
    ...
);

-- Reservas de alquiler independientes
CREATE TABLE v5_rental_bookings (
    id BIGINT PRIMARY KEY,
    school_id BIGINT NOT NULL,
    season_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    rental_start_date DATE,
    rental_end_date DATE,
    total_amount DECIMAL(10,2),
    status ENUM('pending', 'confirmed', 'active', 'returned', 'completed'),
    ...
);
```

### API Endpoints Planificados
```
GET    /api/v5/equipment/inventory
POST   /api/v5/equipment/availability/check
POST   /api/v5/rentals                    # Alquiler independiente
POST   /api/v5/bookings/{id}/add-equipment # Integración con cursos
```

### Características Principales
- **Uso independiente** sin necesidad de cursos
- **Integración** con sistema de reservas existente
- **Gestión de stock** con detección de conflictos
- **Precios dinámicos** por temporada
- **Gestión de depósitos** y daños

---

## 📊 Estrategia de Migración de Datos Legacy

### Principios Fundamentales
1. **CERO pérdida de datos** - Preservación completa de información histórica
2. **Trazabilidad completa** - Mapeo legacy ↔ V5
3. **Rollback garantizado** - Capacidad de vuelta atrás
4. **Validación exhaustiva** - Integridad en cada paso

### Fases de Migración (6 fases)

#### Fase 1: Fundación (Semana 1)
- ✅ Infraestructura de logging y validación
- ✅ Sistema de mapeo de IDs legacy
- ✅ Herramientas de backup y rollback

#### Fase 2: Datos de Referencia (Semana 2)
- ✅ Migración de escuelas, deportes, estaciones
- ✅ Creación/asignación de temporadas
- ✅ Validación de integridad referencial

#### Fase 3: Gestión de Usuarios (Semana 3)
- ✅ Migración de usuarios, clientes, monitores
- ✅ Conversión del sistema de roles
- ✅ Asignación de contexto de temporada

#### Fase 4: Datos Complejos (Semana 4)
- ✅ Migración de cursos y reservas
- ✅ Preservación de relaciones complejas
- ✅ Migración de datos financieros

#### Fase 5: Validación (Semana 5)
- ✅ Testing exhaustivo de integridad
- ✅ Validación de business logic
- ✅ Pruebas de rendimiento

#### Fase 6: Go-Live (Semana 6)
- ✅ Cutover final y monitoreo
- ✅ Validación post-migración

### Implementación Técnica
```php
// Comando de migración principal
php artisan boukii:migrate-to-v5

// Opciones disponibles
--phase=users          # Migrar fase específica
--dry-run             # Modo de prueba
--batch-size=500      # Tamaño de lotes
--entity=courses      # Entidad específica
```

---

## 🌐 Integración Web Pública y App Móvil

### API Web Pública Diseñada
```
/api/public/v1/schools/{school_slug}/
├── info                     # Información básica y branding
├── courses                  # Catálogo de cursos disponibles
├── courses/{id}/availability # Verificar disponibilidad
├── bookings                 # Crear reserva sin autenticación
└── config                   # Configuración pública
```

### API App Móvil (Monitores)
```
/api/mobile/v1/
├── auth/login               # Autenticación monitores
├── monitor/schedule         # Horario del día
├── classes/{id}/attendance  # Marcar asistencia
└── schools/select          # Selección escuela/temporada
```

### Características Clave
- **Web pública**: Reservas sin autenticación, branding personalizable
- **App móvil**: Multi-escuela, modo offline, notificaciones push
- **Configuración**: Administrable desde panel admin
- **Seguridad**: Rate limiting, validación, CORS apropiado

---

## 📈 Plan de Implementación V5 Completo

### Sprint 1: Problemas Críticos (Semana 1-2)
**Prioridad: CRÍTICA**
- [ ] **Arreglar token Bearer vacío** - ApiService.getHeaders()
- [ ] **Habilitar guards de autenticación** - AuthV5Guard, SeasonContextGuard
- [ ] **Resolver dependencia circular** - Reestructurar SeasonContextService
- [ ] **Implementar validación school_id** - Middleware V5
- [ ] **Remover usuario de prueba hardcodeado** - AuthV5Service

### Sprint 2: Unificación de Servicios (Semana 3-4)
**Prioridad: ALTA**
- [ ] **Migrar a AuthV5Service único** - Deprecar AuthService legacy
- [ ] **Estandarizar almacenamiento tokens** - Formato consistente
- [ ] **Implementar derivación school_id** - Desde contexto usuario
- [ ] **Completar gestión de temporadas** - Flujo selection/switch
- [ ] **Migrar componentes legacy** - A arquitectura V5

### Sprint 3: Módulo de Alquiler (Semana 5-7)
**Prioridad: ALTA**
- [ ] **Implementar schema base de datos** - v5_rental_* tables
- [ ] **Crear módulo Equipment V5** - Backend Controllers/Services
- [ ] **Desarrollar flujo alquiler independiente** - Frontend wizard
- [ ] **Integrar con sistema reservas** - Equipment en bookings
- [ ] **Implementar gestión de stock** - Availability engine

### Sprint 4: Roles y Permisos (Semana 8-9)
**Prioridad: MEDIA**
- [ ] **Implementar jerarquía de roles** - Superadmin vs School Admin
- [ ] **Crear gestión de escuelas** - Interface superadmin
- [ ] **Sistema configuración modular** - Activación/desactivación módulos
- [ ] **Migrar usuarios existentes** - A nuevo sistema roles
- [ ] **Panel configuración global** - Superadmin features

### Sprint 5: Integración Externa (Semana 10-12)
**Prioridad: MEDIA**
- [ ] **API Web Pública** - Endpoints públicos para reservas
- [ ] **Configuración branding** - Personalización por escuela
- [ ] **App Móvil API** - Endpoints monitores mejorados
- [ ] **Sistema notificaciones** - Push notifications
- [ ] **Modo offline básico** - App móvil

### Sprint 6: Migración y Testing (Semana 13-15)
**Prioridad: CRÍTICA**
- [ ] **Ejecutar migración legacy** - Estrategia 6 fases
- [ ] **Testing exhaustivo** - Todos los flujos V5
- [ ] **Optimización rendimiento** - Queries y caching
- [ ] **Documentación completa** - API y usuario final
- [ ] **Plan de rollback** - Procedimientos emergencia

### Sprint 7: Go-Live y Monitoreo (Semana 16)
**Prioridad: CRÍTICA**
- [ ] **Deployment producción** - V5 completo
- [ ] **Monitoreo en tiempo real** - Métricas y alertas
- [ ] **Soporte post-lanzamiento** - Resolución issues
- [ ] **Training usuarios** - Admin y monitores
- [ ] **Optimización continua** - Basada en feedback

---

## 🛡️ Consideraciones de Seguridad

### Vulnerabilidades Actuales
1. **CRÍTICO**: Guards deshabilitados en producción
2. **ALTO**: Token Bearer vacío permite acceso no autorizado
3. **MEDIO**: Usuario de prueba hardcodeado
4. **MEDIO**: CORS demasiado permisivo

### Medidas de Seguridad V5
```typescript
// Rate limiting por tipo de usuario
'public': '100/hour',
'mobile': '1000/hour', 
'admin': '5000/hour'

// Validación de entrada
- Sanitización input público
- Protección CSRF
- Prevención SQL injection

// Monitoreo
- Logging completo auditoría
- Detección intentos acceso no autorizado
- Alertas seguridad tiempo real
```

---

## 📊 Métricas de Éxito V5

### Técnicas
- **Disponibilidad**: >99.5% uptime
- **Rendimiento**: API response <200ms P95
- **Seguridad**: 0 vulnerabilidades críticas
- **Migración**: 100% datos migrados sin pérdida

### Funcionales
- **Multi-tenancy**: Aislamiento completo datos por escuela
- **Modularización**: Activación/desactivación módulos por escuela
- **Usabilidad**: Reducción 50% clicks para tareas comunes
- **Escalabilidad**: Soporte 10x escuelas actuales

---

## 🔧 Herramientas de Desarrollo

### Comandos Útiles
```bash
# Frontend
npm start                    # Servidor desarrollo
npm run build               # Build producción
npm run lint                # Linting

# Backend
php artisan boukii:migrate-to-v5  # Migración datos
php artisan v5:health-check       # Estado sistema V5
php artisan test                   # Test suite

# Base de datos
php artisan migrate:fresh --seed  # Reset completo DB
php artisan db:show               # Estado actual DB
```

### Entornos
- **Local**: `http://localhost:4200` + `http://api-boukii.test`
- **Desarrollo**: `dev.admin.boukii.com` + `dev.api.boukii.com`
- **Producción**: `admin.boukii.com` + `api.boukii.com`

---

## 📋 Checklist de Completitud V5

### ✅ **Completado**
- [x] Arquitectura base V5 frontend y backend
- [x] Sistema autenticación Sanctum + roles
- [x] Multi-tenancy escuelas + temporadas
- [x] Dashboard con métricas tiempo real
- [x] Gestión básica reservas y cursos
- [x] Logging y monitoreo sistema

### 🟡 **En Progreso**
- [ ] Migración completa componentes legacy → V5
- [ ] Sistema permisos granular por módulo
- [ ] Optimización rendimiento queries
- [ ] Testing automatizado exhaustivo

### ❌ **Pendiente (Crítico)**
- [ ] **Módulo alquiler equipamiento** - Funcionalidad completa
- [ ] **API web pública** - Reservas sin autenticación
- [ ] **App móvil monitores** - Features avanzados
- [ ] **Sistema roles jerárquico** - Superadmin vs School Admin
- [ ] **Migración datos legacy** - Estrategia 6 fases

---

## 🎯 Próximos Pasos Inmediatos

### Esta Semana (Crítico)
1. **Arreglar token Bearer vacío** - 2 horas
2. **Habilitar guards autenticación** - 4 horas  
3. **Resolver dependencia circular** - 6 horas
4. **Validar aislamiento multi-tenant** - 8 horas

### Siguientes 2 Semanas (Alto)
1. **Unificar servicios autenticación** - 16 horas
2. **Completar gestión temporadas** - 12 horas
3. **Migrar componentes críticos legacy** - 24 horas
4. **Implementar validaciones seguridad** - 8 horas

### Mes Siguiente (Medio)
1. **Desarrollar módulo alquiler** - 40 horas
2. **Implementar sistema roles** - 24 horas
3. **API web pública básica** - 32 horas
4. **Plan migración datos** - 16 horas

---

## 💡 Recomendaciones Técnicas

### Arquitectura
- **Mantener arquitectura V5** - No crear nuevos patrones legacy
- **Completar migración progresiva** - Evitar mantener sistemas duales
- **Implementar testing automático** - Prevenir regresiones
- **Documentar decisiones técnicas** - ADRs (Architecture Decision Records)

### Desarrollo
- **Code reviews obligatorios** - Especialmente cambios críticos seguridad
- **Branch strategy**: `main` → `develop` → `feature/*`
- **CI/CD pipeline**: Testing + deployment automatizado
- **Monitoring APM**: New Relic o similar para producción

### Operaciones
- **Backup automatizado** - Antes de cada deployment
- **Blue-green deployment** - Para zero-downtime
- **Feature flags** - Control gradual rollout features
- **Incident response plan** - Procedimientos emergencia documentados

---

## 📞 Contacto y Soporte

### Equipo Técnico
- **Lead Developer**: Responsable arquitectura V5
- **DevOps Engineer**: Deployment e infraestructura  
- **QA Engineer**: Testing y validación
- **Product Owner**: Definición requirements

### Documentación
- **API Docs**: `/docs/api/` - Documentación endpoints
- **User Guide**: `/docs/user/` - Manual usuario final
- **Technical Specs**: `/docs/technical/` - Especificaciones técnicas
- **Runbooks**: `/docs/ops/` - Procedimientos operaciones

---

---

## 🚀 DOCUMENTACIÓN TÉCNICA COMPLETA V5

### 📋 1. API PÚBLICA - DOCUMENTACIÓN COMPLETA

#### Estructura de Endpoints `/api/public`

**Endpoints Disponibles Actualmente:**
```
POST /api/public/forgot-password          # Reset de contraseña
PUT  /api/public/reset-password            # Confirmar reset
POST /api/public/availability              # Verificar disponibilidad
POST /api/public/availability/hours        # Obtener horas disponibles
POST /api/public/availability/matrix       # Matriz de disponibilidad
POST /api/public/availability/realtime-check # Verificación tiempo real

GET  /api/public/schools                   # Listado escuelas
GET  /api/public/courses                   # Catálogo cursos
GET  /api/public/stations                  # Estaciones disponibles
GET  /api/public/sports                    # Deportes disponibles
```

**Endpoints Requeridos para V5:**
```
GET  /api/public/schools/{slug}            # Info escuela por slug
GET  /api/public/schools/{slug}/courses    # Cursos de escuela específica
POST /api/public/schools/{slug}/bookings  # Crear reserva pública
GET  /api/public/schools/{slug}/config     # Configuración pública
POST /api/public/schools/{slug}/availability # Disponibilidad específica
```

#### Especificación de Seguridad

**Rate Limiting por Endpoint:**
```php
// Configuración por tipo de endpoint
'public_availability' => '30/minute',   // Consultas disponibilidad
'public_booking' => '5/minute',         // Creación reservas
'public_info' => '100/hour',            // Información general
'public_heavy' => '10/minute'           // Operaciones pesadas
```

**Headers Requeridos:**
```http
Content-Type: application/json
Accept: application/json
X-School-Slug: {school_slug}           # Requerido para endpoints específicos
X-User-Agent: Public-Web-v1.0          # Identificación cliente
```

**Autenticación (Opcional):**
```http
Authorization: Bearer {public_token}    # Solo para operaciones autenticadas
```

#### Formato de Respuesta Estándar

**Respuesta Exitosa:**
```json
{
  "success": true,
  "data": {
    "schools": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "per_page": 20,
      "total_items": 100
    }
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "v5.0",
    "rate_limit_remaining": 25
  }
}
```

**Respuesta de Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos proporcionados no son válidos",
    "details": {
      "field_errors": {
        "school_slug": ["El slug de la escuela es requerido"],
        "date": ["La fecha debe ser futura"]
      }
    }
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

#### Ejemplos Completos de Uso

**1. Obtener Información de Escuela:**
```bash
curl -X GET "http://api-boukii.test/api/public/schools/escuela-deportiva-madrid" \
  -H "Accept: application/json" \
  -H "X-User-Agent: Public-Web-v1.0"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "school": {
      "id": 1,
      "slug": "escuela-deportiva-madrid",
      "name": "Escuela Deportiva Madrid",
      "description": "La mejor escuela de deportes de Madrid",
      "logo": "https://cdn.boukii.com/schools/1/logo.png",
      "contact_email": "info@deportivamadrid.es",
      "contact_phone": "+34 600 123 456",
      "address": "Calle Deportiva 123, Madrid",
      "sports": [
        {
          "id": 1,
          "name": "Tenis",
          "icon": "tennis-ball",
          "active": true
        },
        {
          "id": 2,
          "name": "Fútbol",
          "icon": "football",
          "active": true
        }
      ],
      "public_config": {
        "online_booking_enabled": true,
        "advance_booking_days": 30,
        "cancellation_hours": 24,
        "currency": "EUR",
        "timezone": "Europe/Madrid"
      }
    }
  }
}
```

**2. Verificar Disponibilidad:**
```bash
curl -X POST "http://api-boukii.test/api/public/availability" \
  -H "Content-Type: application/json" \
  -H "X-School-Slug: escuela-deportiva-madrid" \
  -d '{
    "course_id": 15,
    "date": "2025-01-20",
    "participants": 2,
    "duration": 60
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "available_slots": [
      {
        "time_start": "09:00",
        "time_end": "10:00",
        "price": 35.00,
        "currency": "EUR",
        "monitor_id": 12,
        "monitor_name": "Carlos García",
        "available_spots": 4
      },
      {
        "time_start": "11:00",
        "time_end": "12:00",
        "price": 35.00,
        "currency": "EUR",
        "monitor_id": 15,
        "monitor_name": "María López",
        "available_spots": 2
      }
    ],
    "total_slots": 2,
    "course": {
      "id": 15,
      "name": "Clase de Tenis Intermedio",
      "description": "Perfecto para jugadores con experiencia básica",
      "max_participants": 6,
      "duration_minutes": 60
    }
  }
}
```

**3. Crear Reserva Pública:**
```bash
curl -X POST "http://api-boukii.test/api/public/schools/escuela-deportiva-madrid/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 15,
    "date": "2025-01-20",
    "time_start": "09:00",
    "time_end": "10:00",
    "participants": [
      {
        "first_name": "Juan",
        "last_name": "Pérez",
        "email": "juan@email.com",
        "phone": "+34 600 111 222",
        "age": 25
      },
      {
        "first_name": "Ana",
        "last_name": "García",
        "email": "ana@email.com",
        "phone": "+34 600 333 444",
        "age": 28
      }
    ],
    "payment_method": "online",
    "special_requests": "Nivel principiante, primera vez"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "BK-2025-001234",
      "status": "pending_payment",
      "total_amount": 70.00,
      "currency": "EUR",
      "expires_at": "2025-01-15T11:00:00Z",
      "course": {
        "name": "Clase de Tenis Intermedio",
        "date": "2025-01-20",
        "time_start": "09:00",
        "time_end": "10:00"
      },
      "participants": [
        {
          "id": "P-001",
          "name": "Juan Pérez",
          "email": "juan@email.com"
        },
        {
          "id": "P-002",
          "name": "Ana García",
          "email": "ana@email.com"
        }
      ],
      "payment": {
        "payment_url": "https://pay.boukii.com/checkout/abc123",
        "payment_reference": "PAY-2025-001234",
        "expires_in": 1800
      }
    }
  }
}
```

#### Códigos de Error Específicos

| Código | HTTP | Descripción | Acción |
|--------|------|-------------|--------|
| `SCHOOL_NOT_FOUND` | 404 | Escuela no existe | Verificar slug |
| `COURSE_UNAVAILABLE` | 422 | Curso no disponible en fecha | Elegir otra fecha |
| `INSUFFICIENT_CAPACITY` | 422 | No hay suficiente capacidad | Reducir participantes |
| `BOOKING_EXPIRED` | 410 | Tiempo de reserva expirado | Crear nueva reserva |
| `RATE_LIMIT_EXCEEDED` | 429 | Demasiadas solicitudes | Esperar y reintentar |
| `INVALID_PAYMENT_METHOD` | 422 | Método de pago no válido | Usar método soportado |
| `VALIDATION_ERROR` | 422 | Datos de entrada inválidos | Corregir datos |
| `SCHOOL_BOOKING_DISABLED` | 403 | Reservas online deshabilitadas | Contactar escuela |

---

### 🔐 2. SISTEMA DE AUTENTICACIÓN Y TOKENS - FLUJO COMPLETO

#### Arquitectura de Autenticación V5

**Stack Tecnológico:**
- Laravel Sanctum para gestión de tokens
- Spatie Permission para roles y permisos
- JWT para tokens públicos (opcional)
- Multi-tenant con aislamiento por school_id

#### Flujo de Login Completo

**1. Login Request:**
```http
POST /api/v5/auth/login
Content-Type: application/json

{
  "email": "admin@escuela.com",
  "password": "password123",
  "school_id": 2,
  "season_id": 5,
  "remember_me": true
}
```

**2. Validación y Respuesta:**
```php
// AuthV5Controller@login
public function login(LoginRequest $request): JsonResponse
{
    try {
        // 1. Validar credenciales
        $credentials = $request->only('email', 'password');
        
        if (!Auth::attempt($credentials)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_CREDENTIALS',
                    'message' => 'Credenciales inválidas'
                ]
            ], 401);
        }
        
        $user = Auth::user();
        
        // 2. Verificar acceso a escuela
        if (!$user->hasAccessToSchool($request->school_id)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'SCHOOL_ACCESS_DENIED',
                    'message' => 'Sin acceso a esta escuela'
                ]
            ], 403);
        }
        
        // 3. Verificar acceso a temporada
        if (!$user->hasAccessToSeason($request->season_id, $request->school_id)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'SEASON_ACCESS_DENIED',
                    'message' => 'Sin acceso a esta temporada'
                ]
            ], 403);
        }
        
        // 4. Crear token con contexto
        $tokenName = "boukii-v5-{$user->id}-{$request->school_id}-{$request->season_id}";
        $abilities = $this->getUserAbilities($user, $request->school_id);
        
        $token = $user->createToken($tokenName, $abilities, [
            'school_id' => $request->school_id,
            'season_id' => $request->season_id,
            'expires_at' => $request->remember_me ? 
                now()->addDays(30) : now()->addHours(8)
        ]);
        
        // 5. Registrar sesión
        $this->logUserSession($user, $request);
        
        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token->plainTextToken,
                'token_type' => 'Bearer',
                'expires_at' => $token->accessToken->expires_at,
                'user' => new UserResource($user),
                'school' => new SchoolResource($user->getSchool($request->school_id)),
                'season' => new SeasonResource($user->getSeason($request->season_id)),
                'permissions' => $abilities
            ]
        ]);
        
    } catch (Exception $e) {
        Log::error('Login failed', [
            'user_email' => $request->email,
            'school_id' => $request->school_id,
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'INTERNAL_ERROR',
                'message' => 'Error interno del servidor'
            ]
        ], 500);
    }
}
```

#### Middleware de Contexto de Temporada

```php
// SeasonContextMiddleware
class SeasonContextMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'UNAUTHENTICATED']
            ], 401);
        }
        
        // Obtener contexto del token
        $token = $user->currentAccessToken();
        $schoolId = $token->getMetadata('school_id');
        $seasonId = $token->getMetadata('season_id');
        
        if (!$schoolId || !$seasonId) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MISSING_CONTEXT',
                    'message' => 'Contexto de escuela/temporada requerido'
                ]
            ], 400);
        }
        
        // Validar que el contexto sigue siendo válido
        if (!$user->hasAccessToSchool($schoolId) || 
            !$user->hasAccessToSeason($seasonId, $schoolId)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CONTEXT_EXPIRED',
                    'message' => 'Contexto expirado, re-login requerido'
                ]
            ], 401);
        }
        
        // Establecer contexto global
        app()->instance('current_school_id', $schoolId);
        app()->instance('current_season_id', $seasonId);
        
        // Agregar headers de respuesta
        $response = $next($request);
        $response->headers->set('X-Current-School-Id', $schoolId);
        $response->headers->set('X-Current-Season-Id', $seasonId);
        
        return $response;
    }
}
```

#### Gestión de Tokens y Sesiones

**Token Storage (Cliente):**
```typescript
// Frontend Angular - TokenService
export class TokenService {
  private readonly TOKEN_KEY = 'boukii_v5_token';
  private readonly CONTEXT_KEY = 'boukii_v5_context';
  
  storeAuthData(response: LoginResponse): void {
    const authData = {
      token: response.data.token,
      expires_at: response.data.expires_at,
      user: response.data.user,
      school: response.data.school,
      season: response.data.season,
      permissions: response.data.permissions
    };
    
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(authData));
    localStorage.setItem(this.CONTEXT_KEY, JSON.stringify({
      school_id: response.data.school.id,
      season_id: response.data.season.id
    }));
  }
  
  getToken(): string | null {
    const authData = this.getAuthData();
    return authData?.token || null;
  }
  
  isTokenValid(): boolean {
    const authData = this.getAuthData();
    if (!authData) return false;
    
    const expiresAt = new Date(authData.expires_at);
    return expiresAt > new Date();
  }
  
  clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.CONTEXT_KEY);
  }
  
  private getAuthData(): AuthData | null {
    try {
      const stored = localStorage.getItem(this.TOKEN_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
```

**HTTP Interceptor Corregido:**
```typescript
// auth-v5.interceptor.ts - VERSIÓN CORREGIDA
export class AuthV5Interceptor implements HttpInterceptor {
  constructor(private tokenService: TokenService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.tokenService.getToken();
    
    // SOLUCIÓN AL PROBLEMA DEL TOKEN VACÍO
    if (token && token.trim() !== '') {
      const authReq = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token.trim()}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return next.handle(authReq);
    }
    
    // Si no hay token válido, enviar sin header de autorización
    return next.handle(req);
  }
}
```

#### Seguridad y Validaciones

**Rate Limiting por Usuario:**
```php
// config/sanctum.php
'rate_limiting' => [
    'login' => '5/minute',
    'api_calls' => '1000/hour',
    'password_reset' => '3/hour'
],

// Middleware personalizado
class UserRateLimitMiddleware
{
    public function handle(Request $request, Closure $next, string $limit = '60')
    {
        $user = $request->user();
        $key = 'rate_limit:' . ($user ? $user->id : $request->ip());
        
        if (RateLimiter::tooManyAttempts($key, $limit)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RATE_LIMIT_EXCEEDED',
                    'message' => 'Demasiadas solicitudes',
                    'retry_after' => RateLimiter::availableIn($key)
                ]
            ], 429);
        }
        
        RateLimiter::hit($key);
        return $next($request);
    }
}
```

**Validación de Permisos Granular:**
```php
// PermissionMiddleware
class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        $user = $request->user();
        $schoolId = app('current_school_id');
        $seasonId = app('current_season_id');
        
        // Verificar permiso específico en contexto
        if (!$user->hasPermissionInContext($permission, $schoolId, $seasonId)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INSUFFICIENT_PERMISSIONS',
                    'message' => "Permiso requerido: {$permission}",
                    'required_permission' => $permission
                ]
            ], 403);
        }
        
        return $next($request);
    }
}
```

---

### 📅 3. GESTIÓN DE TEMPORADAS - ESTRATEGIA COMPLETA

#### Concepto de Temporada en V5

**Definición:** Una temporada representa un período académico/deportivo específico con:
- Fechas de inicio y fin definidas
- Configuración independiente de precios
- Datos aislados por temporada
- Posibilidad de múltiples temporadas activas

#### Modelo de Datos de Temporada

```sql
CREATE TABLE v5_seasons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    school_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('draft', 'active', 'closed', 'archived') DEFAULT 'draft',
    
    -- Configuración
    currency VARCHAR(3) DEFAULT 'EUR',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    booking_advance_days INT DEFAULT 30,
    cancellation_hours INT DEFAULT 24,
    
    -- Configuración de precios
    price_config JSON,
    -- Ejemplo: {"base_price": 35, "discounts": [...], "extras": [...]}
    
    -- Metadatos
    description TEXT,
    notes TEXT,
    created_by BIGINT,
    archived_at TIMESTAMP NULL,
    
    -- Configuración de clonado
    cloned_from_season_id BIGINT NULL,
    clone_config JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_school_slug (school_id, slug),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (cloned_from_season_id) REFERENCES v5_seasons(id),
    INDEX idx_school_status (school_id, status),
    INDEX idx_dates (start_date, end_date)
);
```

#### API de Gestión de Temporadas

**1. Listar Temporadas:**
```http
GET /api/v5/seasons?school_id=2&status=active

Response:
{
  "success": true,
  "data": {
    "seasons": [
      {
        "id": 5,
        "name": "Temporada 2024-2025",
        "slug": "temporada-2024-2025",
        "start_date": "2024-09-01",
        "end_date": "2025-06-30",
        "status": "active",
        "currency": "EUR",
        "stats": {
          "total_bookings": 1250,
          "active_courses": 45,
          "total_revenue": 87500.00
        }
      }
    ]
  }
}
```

**2. Crear Nueva Temporada:**
```http
POST /api/v5/seasons
Content-Type: application/json

{
  "school_id": 2,
  "name": "Temporada 2025-2026",
  "start_date": "2025-09-01",
  "end_date": "2026-06-30",
  "currency": "EUR",
  "timezone": "Europe/Madrid",
  "booking_advance_days": 45,
  "cancellation_hours": 48,
  "description": "Nueva temporada con precios actualizados",
  "price_config": {
    "base_price": 40,
    "early_bird_discount": 10,
    "group_discounts": [
      {"min_participants": 4, "discount_percent": 15},
      {"min_participants": 6, "discount_percent": 20}
    ]
  }
}
```

**3. Clonar Temporada:**
```http
POST /api/v5/seasons/5/clone
Content-Type: application/json

{
  "new_name": "Temporada 2025-2026",
  "start_date": "2025-09-01",
  "end_date": "2026-06-30",
  "clone_options": {
    "clone_courses": true,
    "clone_pricing": true,
    "clone_schedules": true,
    "clone_monitors": true,
    "update_prices_percent": 5,
    "exclude_data": ["bookings", "payments"]
  }
}
```

#### Contexto de Temporada en la Aplicación

**SeasonContextService (Angular):**
```typescript
@Injectable({
  providedIn: 'root'
})
export class SeasonContextService {
  private currentSeasonSubject = new BehaviorSubject<Season | null>(null);
  public currentSeason$ = this.currentSeasonSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private authService: AuthV5Service
  ) {
    this.initializeSeasonContext();
  }
  
  getCurrentSeason(): Season | null {
    return this.currentSeasonSubject.value;
  }
  
  switchSeason(seasonId: number): Observable<Season> {
    return this.http.post<ApiResponse<Season>>(
      '/api/v5/auth/season/switch',
      { season_id: seasonId }
    ).pipe(
      map(response => {
        if (response.success) {
          this.currentSeasonSubject.next(response.data);
          // Actualizar token con nuevo contexto
          this.authService.updateTokenContext({
            season_id: seasonId
          });
          return response.data;
        }
        throw new Error(response.error?.message || 'Error switching season');
      })
    );
  }
  
  getAvailableSeasons(): Observable<Season[]> {
    return this.http.get<ApiResponse<Season[]>>('/api/v5/seasons').pipe(
      map(response => response.success ? response.data : [])
    );
  }
  
  private initializeSeasonContext(): void {
    const storedContext = localStorage.getItem('boukii_v5_context');
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext);
        if (context.season_id) {
          this.loadSeason(context.season_id);
        }
      } catch (error) {
        console.error('Error loading season context:', error);
      }
    }
  }
  
  private loadSeason(seasonId: number): void {
    this.http.get<ApiResponse<Season>>(`/api/v5/seasons/${seasonId}`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.currentSeasonSubject.next(response.data);
          }
        },
        error: (error) => {
          console.error('Error loading season:', error);
        }
      });
  }
}
```

#### Filtrado Automático por Temporada

**Query Scope Global (Laravel):**
```php
// Trait para modelos que dependen de temporada
trait SeasonScoped
{
    protected static function bootSeasonScoped()
    {
        static::addGlobalScope('season', function (Builder $builder) {
            $seasonId = app('current_season_id');
            if ($seasonId) {
                $builder->where('season_id', $seasonId);
            }
        });
    }
    
    public function scopeWithoutSeasonScope(Builder $query)
    {
        return $query->withoutGlobalScope('season');
    }
    
    public function scopeForSeason(Builder $query, int $seasonId)
    {
        return $query->withoutGlobalScope('season')
                    ->where('season_id', $seasonId);
    }
}

// Uso en modelos
class V5Booking extends Model
{
    use SeasonScoped;
    
    // Automáticamente filtra por season_id del contexto actual
}

// Middleware para establecer contexto
class SeasonContextMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();
        $seasonId = $token?->getMetadata('season_id');
        
        if ($seasonId) {
            app()->instance('current_season_id', $seasonId);
        }
        
        return $next($request);
    }
}
```

#### Migración de Datos Entre Temporadas

**Comando de Migración:**
```php
// php artisan season:migrate-data {from_season} {to_season}
class MigrateSeasonDataCommand extends Command
{
    protected $signature = 'season:migrate-data 
                          {from_season : ID de temporada origen}
                          {to_season : ID de temporada destino}
                          {--entities=* : Entidades a migrar (courses,schedules,pricing)}
                          {--dry-run : Simular sin ejecutar}';
    
    public function handle(): int
    {
        $fromSeasonId = $this->argument('from_season');
        $toSeasonId = $this->argument('to_season');
        $entities = $this->option('entities') ?: ['courses', 'schedules', 'pricing'];
        $dryRun = $this->option('dry-run');
        
        $this->info("Migrando datos de temporada {$fromSeasonId} a {$toSeasonId}");
        
        foreach ($entities as $entity) {
            $this->migrateEntity($entity, $fromSeasonId, $toSeasonId, $dryRun);
        }
        
        return 0;
    }
    
    private function migrateEntity(string $entity, int $from, int $to, bool $dryRun): void
    {
        $migrator = $this->getMigrator($entity);
        $count = $migrator->migrate($from, $to, $dryRun);
        
        $action = $dryRun ? 'Se migrarían' : 'Migrados';
        $this->info("{$action} {$count} registros de {$entity}");
    }
}
```

---

### 🧪 4. TESTING COMPLETO - DOCUMENTACIÓN EXHAUSTIVA

#### Stack de Testing V5

**Backend (Laravel):**
- **Pest PHP** - Framework de testing moderno
- **PHPUnit** - Base para testing unitario
- **Laravel Dusk** - Testing browser automatizado
- **Factory Bot** - Generación de datos de prueba
- **Mockery** - Mocking y stubbing

**Frontend (Angular):**
- **Cypress** - Testing E2E y de integración
- **Jest** - Testing unitario
- **Angular Testing Utilities** - Testing de componentes
- **MSW (Mock Service Worker)** - Mocking de APIs

#### Configuración Pest para Backend

**Instalación y Configuración:**
```bash
# Instalar Pest
composer require pestphp/pest --dev
composer require pestphp/pest-plugin-laravel --dev

# Inicializar Pest
./vendor/bin/pest --init
```

**Configuración `tests/Pest.php`:**
```php
<?php

use App\Models\User;
use App\Models\School;
use App\Models\V5Season;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Base test case
uses(TestCase::class, RefreshDatabase::class)->in('Feature', 'Unit');

// Helper functions
function createUser(array $attributes = []): User
{
    return User::factory()->create($attributes);
}

function createSchool(array $attributes = []): School
{
    return School::factory()->create($attributes);
}

function createSeason(School $school, array $attributes = []): V5Season
{
    return V5Season::factory()->for($school)->create($attributes);
}

function actingAsUser(User $user, School $school, V5Season $season): TestCase
{
    return test()->actingAs($user)->withHeaders([
        'X-School-Id' => $school->id,
        'X-Season-Id' => $season->id,
    ]);
}

// Shared assertions
expect()->extend('toBeValidApiResponse', function () {
    return $this->toHaveKey('success')
                ->toHaveKey('data')
                ->toHaveKey('meta');
});

expect()->extend('toBeValidationError', function () {
    return $this->toHaveKey('success', false)
                ->toHaveKey('error')
                ->toHaveKey('error.code', 'VALIDATION_ERROR');
});
```

#### Testing de Autenticación V5

**tests/Feature/V5/AuthTest.php:**
```php
<?php

use App\Models\User;
use App\Models\School;
use App\Models\V5Season;

describe('V5 Authentication', function () {
    beforeEach(function () {
        $this->school = createSchool();
        $this->season = createSeason($this->school);
        $this->user = createUser([
            'email' => 'test@example.com',
            'password' => bcrypt('password123')
        ]);
        
        // Asignar usuario a escuela
        $this->user->schools()->attach($this->school->id);
        $this->user->seasons()->attach($this->season->id);
    });
    
    it('can login with valid credentials', function () {
        $response = $this->postJson('/api/v5/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
            'school_id' => $this->school->id,
            'season_id' => $this->season->id
        ]);
        
        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'token_type' => 'Bearer',
                        'user' => [
                            'email' => 'test@example.com'
                        ]
                    ]
                ]);
        
        expect($response->json('data.token'))->not->toBeEmpty();
        expect($response->json('data.expires_at'))->not->toBeEmpty();
    });
    
    it('rejects invalid credentials', function () {
        $response = $this->postJson('/api/v5/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
            'school_id' => $this->school->id,
            'season_id' => $this->season->id
        ]);
        
        $response->assertStatus(401)
                ->assertJson([
                    'success' => false,
                    'error' => [
                        'code' => 'INVALID_CREDENTIALS'
                    ]
                ]);
    });
    
    it('rejects access to unauthorized school', function () {
        $otherSchool = createSchool();
        
        $response = $this->postJson('/api/v5/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
            'school_id' => $otherSchool->id,
            'season_id' => $this->season->id
        ]);
        
        $response->assertStatus(403)
                ->assertJson([
                    'success' => false,
                    'error' => [
                        'code' => 'SCHOOL_ACCESS_DENIED'
                    ]
                ]);
    });
    
    it('validates required fields', function () {
        $response = $this->postJson('/api/v5/auth/login', []);
        
        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email', 'password', 'school_id', 'season_id']);
    });
    
    it('can access protected routes with token', function () {
        // Login first
        $loginResponse = $this->postJson('/api/v5/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
            'school_id' => $this->school->id,
            'season_id' => $this->season->id
        ]);
        
        $token = $loginResponse->json('data.token');
        
        // Access protected route
        $response = $this->withHeader('Authorization', "Bearer {$token}")
                        ->getJson('/api/v5/auth/me');
        
        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'user' => [
                            'email' => 'test@example.com'
                        ]
                    ]
                ]);
    });
});

describe('V5 Season Context', function () {
    beforeEach(function () {
        $this->school = createSchool();
        $this->season1 = createSeason($this->school, ['name' => 'Season 1']);
        $this->season2 = createSeason($this->school, ['name' => 'Season 2']);
        $this->user = createUser();
        
        $this->user->schools()->attach($this->school->id);
        $this->user->seasons()->attach([$this->season1->id, $this->season2->id]);
    });
    
    it('can switch between seasons', function () {
        // Login with season 1
        $loginResponse = $this->postJson('/api/v5/auth/login', [
            'email' => $this->user->email,
            'password' => 'password',
            'school_id' => $this->school->id,
            'season_id' => $this->season1->id
        ]);
        
        $token = $loginResponse->json('data.token');
        
        // Switch to season 2
        $response = $this->withHeader('Authorization', "Bearer {$token}")
                        ->postJson('/api/v5/auth/season/switch', [
                            'season_id' => $this->season2->id
                        ]);
        
        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'season' => [
                            'id' => $this->season2->id,
                            'name' => 'Season 2'
                        ]
                    ]
                ]);
    });
});
```

#### Testing de API Pública

**tests/Feature/PublicApi/SchoolInfoTest.php:**
```php
<?php

use App\Models\School;
use App\Models\Course;
use App\Models\Sport;

describe('Public API - School Information', function () {
    beforeEach(function () {
        $this->school = createSchool([
            'slug' => 'test-school',
            'name' => 'Test School',
            'public_booking_enabled' => true
        ]);
        
        $this->sport = Sport::factory()->create(['name' => 'Tennis']);
        $this->school->sports()->attach($this->sport->id);
        
        $this->course = Course::factory()->for($this->school)->create([
            'name' => 'Tennis Beginner',
            'sport_id' => $this->sport->id,
            'public_visible' => true
        ]);
    });
    
    it('returns school information by slug', function () {
        $response = $this->getJson('/api/public/schools/test-school');
        
        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'school' => [
                            'slug' => 'test-school',
                            'name' => 'Test School',
                            'public_config' => [
                                'online_booking_enabled' => true
                            ]
                        ]
                    ]
                ]);
    });
    
    it('returns 404 for non-existent school', function () {
        $response = $this->getJson('/api/public/schools/non-existent');
        
        $response->assertStatus(404)
                ->assertJson([
                    'success' => false,
                    'error' => [
                        'code' => 'SCHOOL_NOT_FOUND'
                    ]
                ]);
    });
    
    it('returns school courses', function () {
        $response = $this->getJson('/api/public/schools/test-school/courses');
        
        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'courses' => [
                            [
                                'name' => 'Tennis Beginner',
                                'sport' => [
                                    'name' => 'Tennis'
                                ]
                            ]
                        ]
                    ]
                ]);
    });
    
    it('applies rate limiting to public endpoints', function () {
        // Simular múltiples requests
        for ($i = 0; $i < 35; $i++) {
            $response = $this->getJson('/api/public/schools/test-school');
        }
        
        // El request 35 debería ser bloqueado
        $response->assertStatus(429)
                ->assertJson([
                    'success' => false,
                    'error' => [
                        'code' => 'RATE_LIMIT_EXCEEDED'
                    ]
                ]);
    });
});
```

#### Testing Frontend con Cypress

**cypress/e2e/v5-auth.cy.ts:**
```typescript
describe('V5 Authentication Flow', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('POST', '/api/v5/auth/login', {
      fixture: 'v5-login-success.json'
    }).as('loginRequest');
    
    cy.intercept('GET', '/api/v5/schools', {
      fixture: 'v5-schools.json'
    }).as('schoolsRequest');
    
    cy.visit('/v5/login');
  });
  
  it('should login successfully with valid credentials', () => {
    // Fill login form
    cy.get('[data-cy=email-input]').type('admin@test.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=school-select]').select('Test School');
    cy.get('[data-cy=season-select]').select('2024-2025');
    
    // Submit form
    cy.get('[data-cy=login-button]').click();
    
    // Verify API call
    cy.wait('@loginRequest').then((interception) => {
      expect(interception.request.body).to.include({
        email: 'admin@test.com',
        password: 'password123'
      });
    });
    
    // Verify redirect to dashboard
    cy.url().should('include', '/v5/dashboard');
    
    // Verify user info displayed
    cy.get('[data-cy=user-menu]').should('contain', 'admin@test.com');
    cy.get('[data-cy=current-school]').should('contain', 'Test School');
    cy.get('[data-cy=current-season]').should('contain', '2024-2025');
  });
  
  it('should show error for invalid credentials', () => {
    cy.intercept('POST', '/api/v5/auth/login', {
      statusCode: 401,
      body: {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales inválidas'
        }
      }
    }).as('loginError');
    
    cy.get('[data-cy=email-input]').type('wrong@test.com');
    cy.get('[data-cy=password-input]').type('wrongpassword');
    cy.get('[data-cy=login-button]').click();
    
    cy.wait('@loginError');
    
    cy.get('[data-cy=error-message]')
      .should('be.visible')
      .and('contain', 'Credenciales inválidas');
  });
  
  it('should maintain session on page refresh', () => {
    // Mock successful login
    cy.window().then((win) => {
      win.localStorage.setItem('boukii_v5_token', JSON.stringify({
        token: 'mock-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        user: { email: 'admin@test.com' },
        school: { id: 1, name: 'Test School' },
        season: { id: 1, name: '2024-2025' }
      }));
    });
    
    cy.intercept('GET', '/api/v5/auth/me', {
      body: {
        success: true,
        data: {
          user: { email: 'admin@test.com' }
        }
      }
    }).as('meRequest');
    
    // Visit dashboard directly
    cy.visit('/v5/dashboard');
    
    // Should not redirect to login
    cy.url().should('include', '/v5/dashboard');
    cy.get('[data-cy=user-menu]').should('contain', 'admin@test.com');
  });
});
```

#### Testing de Performance

**tests/Performance/DashboardPerformanceTest.php:**
```php
<?php

use App\Models\User;
use App\Models\School;
use App\Models\V5Season;
use App\Models\V5Booking;
use Illuminate\Support\Facades\DB;

describe('Dashboard Performance Tests', function () {
    beforeEach(function () {
        $this->school = createSchool();
        $this->season = createSeason($this->school);
        $this->user = createUser();
        
        // Crear datos de prueba masivos
        V5Booking::factory(1000)->for($this->school)->for($this->season)->create();
    });
    
    it('loads dashboard stats efficiently', function () {
        $queryCount = 0;
        
        DB::listen(function ($query) use (&$queryCount) {
            $queryCount++;
        });
        
        $startTime = microtime(true);
        
        actingAsUser($this->user, $this->school, $this->season)
            ->getJson('/api/v5/dashboard/stats')
            ->assertStatus(200);
        
        $executionTime = microtime(true) - $startTime;
        
        // Assertions de performance
        expect($queryCount)->toBeLessThan(10); // No más de 10 queries
        expect($executionTime)->toBeLessThan(0.5); // Menos de 500ms
    });
    
    it('handles concurrent requests efficiently', function () {
        $responses = [];
        $promises = [];
        
        // Simular 10 requests concurrentes
        for ($i = 0; $i < 10; $i++) {
            $promises[] = async(function () {
                return actingAsUser($this->user, $this->school, $this->season)
                    ->getJson('/api/v5/dashboard/stats');
            });
        }
        
        $responses = await($promises);
        
        // Todos los requests deben ser exitosos
        foreach ($responses as $response) {
            expect($response->status())->toBe(200);
        }
    });
});
```

#### Configuración de CI/CD para Testing

**GitHub Actions - .github/workflows/tests.yml:**
```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: boukii_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.1'
          extensions: dom, curl, libxml, mbstring, zip, pcntl, pdo, sqlite, pdo_sqlite, bcmath, soap, intl, gd, exif, iconv
      
      - name: Install dependencies
        working-directory: ./api
        run: composer install --no-progress --prefer-dist --optimize-autoloader
      
      - name: Copy environment file
        working-directory: ./api
        run: cp .env.testing .env
      
      - name: Generate app key
        working-directory: ./api
        run: php artisan key:generate
      
      - name: Run migrations
        working-directory: ./api
        run: php artisan migrate --force
      
      - name: Run Pest tests
        working-directory: ./api
        run: ./vendor/bin/pest --coverage --min=80
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./api/coverage.xml
  
  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: admin-panel/package-lock.json
      
      - name: Install dependencies
        working-directory: ./admin-panel
        run: npm ci
      
      - name: Run unit tests
        working-directory: ./admin-panel
        run: npm run test:ci
      
      - name: Run E2E tests
        working-directory: ./admin-panel
        run: npm run e2e:ci
      
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: admin-panel/cypress/screenshots
```

*Documento generado el 3 de agosto de 2025 por el sistema de análisis técnico Boukii V5*

---

### 🚨 5. ESTRATEGIA DE MANEJO DE ERRORES Y LOGGING

#### Arquitectura de Manejo de Errores V5

**Stack de Logging:**
- **Laravel Log** - Sistema base de logging
- **Monolog** - Procesamiento y formateo de logs
- **Elasticsearch + Kibana** - Almacenamiento y visualización (producción)
- **Sentry** - Monitoring de errores en tiempo real
- **Structured Logging** - Formato JSON para anlisis

#### Clasificación de Errores

**Niveles de Severidad:**
```php
// config/logging.php
'channels' => [
    'v5_emergency' => [
        'driver' => 'stack',
        'channels' => ['sentry', 'slack', 'file'],
        'level' => 'emergency'
    ],
    'v5_critical' => [
        'driver' => 'stack', 
        'channels' => ['sentry', 'database', 'file'],
        'level' => 'critical'
    ],
    'v5_error' => [
        'driver' => 'stack',
        'channels' => ['sentry', 'file'],
        'level' => 'error'
    ],
    'v5_warning' => [
        'driver' => 'file',
        'level' => 'warning'
    ],
    'v5_info' => [
        'driver' => 'daily',
        'level' => 'info',
        'days' => 30
    ],
    'v5_debug' => [
        'driver' => 'daily',
        'level' => 'debug',
        'days' => 7
    ]
];
```

**Categorías de Errores:**
```php
// app/V5/Core/Logging/ErrorCategories.php
class ErrorCategories
{
    // Errores de negocio
    const BUSINESS_VALIDATION = 'business.validation';
    const BOOKING_CONFLICT = 'business.booking.conflict';
    const PAYMENT_FAILED = 'business.payment.failed';
    const SEASON_CLOSED = 'business.season.closed';
    
    // Errores técnicos
    const DATABASE_ERROR = 'technical.database';
    const API_ERROR = 'technical.api';
    const CACHE_ERROR = 'technical.cache';
    const QUEUE_ERROR = 'technical.queue';
    
    // Errores de seguridad
    const AUTH_FAILED = 'security.auth.failed';
    const PERMISSION_DENIED = 'security.permission.denied';
    const RATE_LIMIT_EXCEEDED = 'security.rate_limit';
    const SUSPICIOUS_ACTIVITY = 'security.suspicious';
    
    // Errores de integración
    const EXTERNAL_API_ERROR = 'integration.external_api';
    const PAYMENT_GATEWAY_ERROR = 'integration.payment_gateway';
    const EMAIL_SERVICE_ERROR = 'integration.email_service';
}
```

#### Sistema de Logging Estructurado

**Logger V5 Personalizado:**
```php
// app/V5/Core/Logging/V5Logger.php
class V5Logger
{
    private LoggerInterface $logger;
    private array $defaultContext;
    
    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
        $this->defaultContext = [
            'version' => 'v5',
            'environment' => app()->environment(),
            'timestamp' => now()->toISOString(),
            'server' => gethostname(),
            'request_id' => request()->header('X-Request-ID') ?? Str::uuid()
        ];
    }
    
    public function logBusinessError(
        string $category,
        string $message,
        array $context = [],
        ?User $user = null,
        ?int $schoolId = null
    ): void {
        $this->log('error', $message, array_merge($context, [
            'category' => $category,
            'type' => 'business_error',
            'user_id' => $user?->id,
            'school_id' => $schoolId ?? app('current_school_id'),
            'season_id' => app('current_season_id'),
            'user_agent' => request()->userAgent(),
            'ip_address' => request()->ip(),
            'trace_id' => $this->generateTraceId()
        ]));
    }
    
    public function logSecurityEvent(
        string $event,
        string $message,
        array $context = [],
        ?User $user = null
    ): void {
        $this->log('warning', $message, array_merge($context, [
            'category' => ErrorCategories::SUSPICIOUS_ACTIVITY,
            'type' => 'security_event',
            'event' => $event,
            'user_id' => $user?->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'session_id' => session()->getId(),
            'risk_level' => $this->calculateRiskLevel($event, $context)
        ]));
        
        // Enviar alerta inmediata para eventos críticos
        if ($this->isCriticalSecurityEvent($event)) {
            $this->sendSecurityAlert($event, $message, $context);
        }
    }
    
    public function logApiCall(
        string $method,
        string $endpoint,
        int $statusCode,
        float $responseTime,
        array $context = []
    ): void {
        $this->log('info', "API Call: {$method} {$endpoint}", array_merge($context, [
            'category' => 'api.call',
            'type' => 'api_metrics',
            'method' => $method,
            'endpoint' => $endpoint,
            'status_code' => $statusCode,
            'response_time_ms' => round($responseTime * 1000, 2),
            'success' => $statusCode < 400
        ]));
    }
    
    public function logPerformanceMetric(
        string $operation,
        float $duration,
        array $metrics = []
    ): void {
        $this->log('info', "Performance: {$operation}", array_merge($metrics, [
            'category' => 'performance.metric',
            'type' => 'performance',
            'operation' => $operation,
            'duration_ms' => round($duration * 1000, 2),
            'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            'peak_memory_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2)
        ]));
    }
    
    private function log(string $level, string $message, array $context): void
    {
        $fullContext = array_merge($this->defaultContext, $context);
        $this->logger->log($level, $message, $fullContext);
    }
    
    private function generateTraceId(): string
    {
        return 'trace_' . Str::random(16);
    }
    
    private function calculateRiskLevel(string $event, array $context): string
    {
        $highRiskEvents = [
            'multiple_failed_logins',
            'privilege_escalation_attempt',
            'suspicious_data_access'
        ];
        
        return in_array($event, $highRiskEvents) ? 'high' : 'medium';
    }
}
```

#### Exception Handling Global

**Handler de Excepciones V5:**
```php
// app/V5/Core/Exceptions/V5ExceptionHandler.php
class V5ExceptionHandler
{
    private V5Logger $logger;
    private ErrorResponseFactory $responseFactory;
    
    public function handle(Throwable $exception, Request $request): JsonResponse
    {
        // Log the exception
        $this->logException($exception, $request);
        
        // Generate appropriate response
        return $this->generateErrorResponse($exception, $request);
    }
    
    private function logException(Throwable $exception, Request $request): void
    {
        $context = [
            'exception_class' => get_class($exception),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'request_data' => $this->sanitizeRequestData($request->all()),
            'url' => $request->fullUrl(),
            'method' => $request->method()
        ];
        
        if ($exception instanceof V5BusinessException) {
            $this->logger->logBusinessError(
                $exception->getCategory(),
                $exception->getMessage(),
                $context,
                $request->user(),
                $exception->getSchoolId()
            );
        } elseif ($exception instanceof V5SecurityException) {
            $this->logger->logSecurityEvent(
                $exception->getSecurityEvent(),
                $exception->getMessage(),
                $context,
                $request->user()
            );
        } else {
            $this->logger->logTechnicalError(
                $exception->getMessage(),
                $context
            );
        }
    }
    
    private function generateErrorResponse(Throwable $exception, Request $request): JsonResponse
    {
        if ($exception instanceof V5BusinessException) {
            return $this->responseFactory->businessError(
                $exception->getErrorCode(),
                $exception->getMessage(),
                $exception->getErrorDetails(),
                $exception->getHttpStatus()
            );
        }
        
        if ($exception instanceof ValidationException) {
            return $this->responseFactory->validationError(
                $exception->errors()
            );
        }
        
        if ($exception instanceof AuthenticationException) {
            return $this->responseFactory->authenticationError();
        }
        
        if ($exception instanceof AuthorizationException) {
            return $this->responseFactory->authorizationError();
        }
        
        // Fallback para errores no manejados
        return $this->responseFactory->internalServerError(
            app()->isProduction() ? 'Error interno del servidor' : $exception->getMessage()
        );
    }
    
    private function sanitizeRequestData(array $data): array
    {
        $sensitiveFields = ['password', 'token', 'card_number', 'cvv'];
        
        return collect($data)->map(function ($value, $key) use ($sensitiveFields) {
            if (in_array(strtolower($key), $sensitiveFields)) {
                return '[REDACTED]';
            }
            return $value;
        })->toArray();
    }
}
```

#### Factory de Respuestas de Error

```php
// app/V5/Core/Http/ErrorResponseFactory.php
class ErrorResponseFactory
{
    public function businessError(
        string $code,
        string $message,
        array $details = [],
        int $httpStatus = 422
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'type' => 'business_error',
                'details' => $details
            ],
            'meta' => $this->getErrorMeta()
        ], $httpStatus);
    }
    
    public function validationError(array $errors): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'VALIDATION_ERROR',
                'message' => 'Los datos proporcionados no son válidos',
                'type' => 'validation_error',
                'details' => [
                    'field_errors' => $errors
                ]
            ],
            'meta' => $this->getErrorMeta()
        ], 422);
    }
    
    public function authenticationError(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'UNAUTHENTICATED',
                'message' => 'Credenciales de autenticación requeridas',
                'type' => 'authentication_error'
            ],
            'meta' => $this->getErrorMeta()
        ], 401);
    }
    
    public function authorizationError(string $permission = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'INSUFFICIENT_PERMISSIONS',
                'message' => 'Permisos insuficientes para realizar esta acción',
                'type' => 'authorization_error',
                'details' => $permission ? ['required_permission' => $permission] : []
            ],
            'meta' => $this->getErrorMeta()
        ], 403);
    }
    
    public function rateLimitError(int $retryAfter): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'RATE_LIMIT_EXCEEDED',
                'message' => 'Demasiadas solicitudes. Intente nuevamente más tarde.',
                'type' => 'rate_limit_error',
                'details' => [
                    'retry_after_seconds' => $retryAfter
                ]
            ],
            'meta' => $this->getErrorMeta()
        ], 429);
    }
    
    private function getErrorMeta(): array
    {
        return [
            'timestamp' => now()->toISOString(),
            'request_id' => request()->header('X-Request-ID') ?? Str::uuid(),
            'version' => 'v5.0'
        ];
    }
}
```

#### Excepciones Personalizadas V5

```php
// app/V5/Core/Exceptions/V5BusinessException.php
class V5BusinessException extends Exception
{
    private string $errorCode;
    private string $category;
    private array $errorDetails;
    private int $httpStatus;
    private ?int $schoolId;
    
    public function __construct(
        string $errorCode,
        string $message,
        string $category = ErrorCategories::BUSINESS_VALIDATION,
        array $errorDetails = [],
        int $httpStatus = 422,
        ?int $schoolId = null
    ) {
        parent::__construct($message);
        
        $this->errorCode = $errorCode;
        $this->category = $category;
        $this->errorDetails = $errorDetails;
        $this->httpStatus = $httpStatus;
        $this->schoolId = $schoolId;
    }
    
    public function getErrorCode(): string { return $this->errorCode; }
    public function getCategory(): string { return $this->category; }
    public function getErrorDetails(): array { return $this->errorDetails; }
    public function getHttpStatus(): int { return $this->httpStatus; }
    public function getSchoolId(): ?int { return $this->schoolId; }
}

// Ejemplos de uso específico
class BookingConflictException extends V5BusinessException
{
    public function __construct(array $conflictDetails, ?int $schoolId = null)
    {
        parent::__construct(
            'BOOKING_CONFLICT',
            'Conflicto de reserva detectado',
            ErrorCategories::BOOKING_CONFLICT,
            $conflictDetails,
            409,
            $schoolId
        );
    }
}

class SeasonClosedException extends V5BusinessException
{
    public function __construct(int $seasonId, ?int $schoolId = null)
    {
        parent::__construct(
            'SEASON_CLOSED',
            'La temporada está cerrada para nuevas reservas',
            ErrorCategories::SEASON_CLOSED,
            ['season_id' => $seasonId],
            422,
            $schoolId
        );
    }
}
```

#### Monitoring y Alertas

**Configuración Sentry:**
```php
// config/sentry.php
return [
    'dsn' => env('SENTRY_LARAVEL_DSN'),
    'environment' => env('APP_ENV'),
    'release' => env('SENTRY_RELEASE'),
    
    'breadcrumbs' => [
        'logs' => true,
        'sql_queries' => env('APP_ENV') !== 'production',
        'sql_bindings' => false
    ],
    
    'context' => [
        'user' => true,
        'tags' => [
            'version' => 'v5',
            'school_id' => app('current_school_id'),
            'season_id' => app('current_season_id')
        ]
    ],
    
    'error_types' => E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED,
    
    'sample_rate' => env('APP_ENV') === 'production' ? 0.1 : 1.0
];
```

**Alertas de Slack:**
```php
// config/logging.php
'slack' => [
    'driver' => 'slack',
    'url' => env('LOG_SLACK_WEBHOOK_URL'),
    'username' => 'Boukii V5 Errors',
    'emoji' => ':boom:',
    'level' => 'critical',
    'context' => true
],

// Middleware para alertas críticas
class CriticalErrorAlertMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        try {
            return $next($request);
        } catch (Throwable $exception) {
            if ($this->isCriticalError($exception)) {
                $this->sendSlackAlert($exception, $request);
            }
            throw $exception;
        }
    }
    
    private function isCriticalError(Throwable $exception): bool
    {
        return $exception instanceof DatabaseException ||
               $exception instanceof PaymentGatewayException ||
               str_contains($exception->getMessage(), 'SQLSTATE');
    }
}
```

#### Dashboard de Monitoreo

**Métricas de Error en Tiempo Real:**
```php
// app/V5/Modules/Monitoring/Controllers/ErrorMetricsController.php
class ErrorMetricsController extends Controller
{
    public function getErrorMetrics(Request $request): JsonResponse
    {
        $schoolId = app('current_school_id');
        $timeframe = $request->input('timeframe', '24h');
        
        $metrics = [
            'error_rate' => $this->getErrorRate($schoolId, $timeframe),
            'errors_by_category' => $this->getErrorsByCategory($schoolId, $timeframe),
            'critical_errors' => $this->getCriticalErrors($schoolId, $timeframe),
            'performance_issues' => $this->getPerformanceIssues($schoolId, $timeframe),
            'security_events' => $this->getSecurityEvents($schoolId, $timeframe)
        ];
        
        return response()->json([
            'success' => true,
            'data' => $metrics
        ]);
    }
    
    private function getErrorRate(int $schoolId, string $timeframe): array
    {
        $since = $this->parseTimeframe($timeframe);
        
        $totalRequests = DB::table('v5_api_logs')
            ->where('school_id', $schoolId)
            ->where('created_at', '>=', $since)
            ->count();
            
        $errorRequests = DB::table('v5_api_logs')
            ->where('school_id', $schoolId)
            ->where('created_at', '>=', $since)
            ->where('status_code', '>=', 400)
            ->count();
            
        return [
            'total_requests' => $totalRequests,
            'error_requests' => $errorRequests,
            'error_rate_percent' => $totalRequests > 0 ? 
                round(($errorRequests / $totalRequests) * 100, 2) : 0
        ];
    }
}
```

---

### 🚀 6. CI/CD Y WORKFLOW DE GIT - DOCUMENTACIÓN COMPLETA

#### Estrategia de Branching - GitFlow Adaptado

**Estructura de Ramas:**
```
main                    # Producción estable
│
├── develop            # Integración de desarrollo
│   ├── feature/v5-auth-improvements
│   ├── feature/v5-equipment-module
│   └── feature/v5-public-api
│
├── release/v5.1.0     # Preparación de release
│
└── hotfix/fix-token-bug  # Correcciones urgentes
```

**Convenciones de Naming:**
```bash
# Features
feature/v5-{module}-{description}
feature/v5-auth-token-validation
feature/v5-season-management
feature/v5-equipment-rental

# Bug fixes
bugfix/v5-{module}-{issue}
bugfix/v5-auth-bearer-empty-token
bugfix/v5-dashboard-performance

# Hotfixes
hotfix/v5-{critical-issue}
hotfix/v5-security-vulnerability
hotfix/v5-payment-gateway-error

# Releases
release/v5.{major}.{minor}
release/v5.1.0
release/v5.2.0
```

#### Workflow de Desarrollo

**1. Feature Development:**
```bash
# Crear nueva feature desde develop
git checkout develop
git pull origin develop
git checkout -b feature/v5-equipment-module

# Desarrollo con commits descriptivos
git add .
git commit -m "feat(v5-equipment): add equipment inventory model

- Create V5EquipmentItem model with school and season scope
- Add equipment categories and pricing structure
- Implement availability checking logic

Resolves: #V5-123"

# Push y crear PR
git push origin feature/v5-equipment-module
# Crear Pull Request en GitHub/GitLab
```

**2. Code Review Process:**
```yaml
# .github/pull_request_template.md
## 🔍 Descripción del Cambio

### 🎟️ Tipo de cambio
- [ ] 🎆 Nueva funcionalidad (feature)
- [ ] 🐛 Corrección de bug
- [ ] 🔧 Refactorización
- [ ] 📝 Documentación
- [ ] ⚡ Mejora de rendimiento

### 🛠️ Cambios realizados
- [ ] Backend (Laravel/PHP)
- [ ] Frontend (Angular/TypeScript) 
- [ ] Base de datos (migraciones)
- [ ] Tests
- [ ] Documentación

### ✅ Checklist
- [ ] El código sigue las convenciones del proyecto
- [ ] Se han añadido tests para los nuevos cambios
- [ ] Todos los tests pasan
- [ ] Se ha actualizado la documentación
- [ ] No hay secrets o credenciales hardcodeadas
- [ ] Se han manejado todos los casos edge

### 🧪 Testing
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Testing manual

### 📝 Notas adicionales
[Cualquier información adicional relevante para el revisor]
```

#### Pipeline CI/CD Completo

**.github/workflows/v5-ci-cd.yml:**
```yaml
name: Boukii V5 CI/CD Pipeline

on:
  push:
    branches: [ main, develop, 'feature/**', 'release/**' ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  PHP_VERSION: '8.1'
  MYSQL_VERSION: '8.0'

jobs:
  # ============ VALIDACIÓN DE CÓDIGO ============
  code-quality:
    name: 🔍 Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      - name: 🔧 Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          extensions: dom, curl, libxml, mbstring, zip, pcntl, pdo, sqlite, pdo_sqlite, bcmath, soap, intl, gd, exif, iconv
          coverage: xdebug
          
      - name: 📦 Cache Composer dependencies
        uses: actions/cache@v3
        with:
          path: /tmp/composer-cache
          key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}
          
      - name: 🚀 Install PHP dependencies
        working-directory: ./api
        run: |
          composer install --no-interaction --prefer-dist --optimize-autoloader
          
      - name: 🔍 PHP Code Style (Laravel Pint)
        working-directory: ./api
        run: ./vendor/bin/pint --test
        
      - name: 🔍 PHP Static Analysis (PHPStan)
        working-directory: ./api
        run: ./vendor/bin/phpstan analyse --memory-limit=2G
        
      - name: 🔍 Security Vulnerabilities
        working-directory: ./api
        run: composer audit
        
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: admin-panel/package-lock.json
          
      - name: 🚀 Install Node.js dependencies
        working-directory: ./admin-panel
        run: npm ci
        
      - name: 🔍 TypeScript Compilation
        working-directory: ./admin-panel
        run: npm run build:check
        
      - name: 🔍 ESLint Analysis
        working-directory: ./admin-panel
        run: npm run lint:check
        
      - name: 🔍 Angular Build
        working-directory: ./admin-panel
        run: npm run build:prod

  # ============ TESTS BACKEND ============
  backend-tests:
    name: 🧪 Backend Tests
    runs-on: ubuntu-latest
    needs: code-quality
    
    services:
      mysql:
        image: mysql:${{ env.MYSQL_VERSION }}
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: boukii_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
      
      redis:
        image: redis:7.0
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      - name: 🔧 Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          extensions: dom, curl, libxml, mbstring, zip, pcntl, pdo, sqlite, pdo_sqlite, bcmath, soap, intl, gd, exif, iconv
          coverage: xdebug
          
      - name: 📦 Cache Composer dependencies
        uses: actions/cache@v3
        with:
          path: /tmp/composer-cache
          key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}
          
      - name: 🚀 Install dependencies
        working-directory: ./api
        run: composer install --no-interaction --prefer-dist --optimize-autoloader
        
      - name: 🔧 Setup environment
        working-directory: ./api
        run: |
          cp .env.testing .env
          php artisan key:generate
          php artisan config:clear
          php artisan cache:clear
          
      - name: 🔄 Run migrations
        working-directory: ./api
        run: php artisan migrate --force
        
      - name: 🌱 Seed test data
        working-directory: ./api
        run: php artisan db:seed --class=TestSeeder
        
      - name: 🧪 Run Pest Tests
        working-directory: ./api
        run: |
          ./vendor/bin/pest \
            --coverage \
            --coverage-clover=coverage.xml \
            --coverage-html=coverage-html \
            --min=80 \
            --parallel
            
      - name: 📄 Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./api/coverage.xml
          flags: backend
          name: backend-coverage
          
      - name: 📊 Store coverage artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: backend-coverage-report
          path: ./api/coverage-html

  # ============ TESTS FRONTEND ============
  frontend-tests:
    name: 🎭 Frontend Tests
    runs-on: ubuntu-latest
    needs: code-quality
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: admin-panel/package-lock.json
          
      - name: 🚀 Install dependencies
        working-directory: ./admin-panel
        run: npm ci
        
      - name: 🧪 Run unit tests
        working-directory: ./admin-panel
        run: npm run test:ci -- --coverage --watchAll=false
        
      - name: 📄 Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./admin-panel/coverage/lcov.info
          flags: frontend
          name: frontend-coverage

  # ============ TESTS E2E ============
  e2e-tests:
    name: 🎭 E2E Tests
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    services:
      mysql:
        image: mysql:${{ env.MYSQL_VERSION }}
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: boukii_e2e
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      - name: 🔧 Setup PHP & Node.js
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          extensions: dom, curl, libxml, mbstring, zip, pcntl, pdo, sqlite, pdo_sqlite, bcmath, soap, intl, gd, exif, iconv
          
      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: admin-panel/package-lock.json
          
      - name: 🚀 Install backend dependencies
        working-directory: ./api
        run: composer install --no-interaction --prefer-dist --optimize-autoloader
        
      - name: 🚀 Install frontend dependencies
        working-directory: ./admin-panel
        run: npm ci
        
      - name: 🔧 Setup backend environment
        working-directory: ./api
        run: |
          cp .env.e2e .env
          php artisan key:generate
          php artisan migrate --force
          php artisan db:seed --class=E2ESeeder
          
      - name: 🚀 Start backend server
        working-directory: ./api
        run: php artisan serve --host=0.0.0.0 --port=8000 &
        
      - name: 🚀 Build frontend
        working-directory: ./admin-panel
        run: npm run build:e2e
        
      - name: 🚀 Start frontend server
        working-directory: ./admin-panel
        run: npm run serve:e2e &
        
      - name: ⏳ Wait for servers
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:8000/api/health; do sleep 2; done'
          timeout 60 bash -c 'until curl -f http://localhost:4200; do sleep 2; done'
          
      - name: 🎭 Run Cypress E2E tests
        working-directory: ./admin-panel
        run: npm run e2e:ci
        
      - name: 📸 Upload E2E artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots-videos
          path: |
            admin-panel/cypress/screenshots
            admin-panel/cypress/videos

  # ============ SECURITY SCAN ============
  security-scan:
    name: 🔒 Security Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      - name: 🔍 SAST Scan (Semgrep)
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/laravel
            p/typescript
            
      - name: 🔍 Container Security (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: 📄 Upload security results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # ============ DEPLOYMENT ============
  deploy-staging:
    name: 🚀 Deploy to Staging
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests, e2e-tests]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      - name: 🔧 Setup deployment tools
        run: |
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl
          sudo mv kubectl /usr/local/bin/
          
      - name: 🏠 Configure Kubernetes
        run: |
          echo "${{ secrets.KUBECONFIG_STAGING }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
          
      - name: 📬 Build and push Docker images
        env:
          DOCKER_REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: |
          echo $DOCKER_PASSWORD | docker login $DOCKER_REGISTRY -u $DOCKER_USERNAME --password-stdin
          
          # Build backend image
          docker build -t $DOCKER_REGISTRY/boukii-api:staging-${{ github.sha }} ./api
          docker push $DOCKER_REGISTRY/boukii-api:staging-${{ github.sha }}
          
          # Build frontend image
          docker build -t $DOCKER_REGISTRY/boukii-admin:staging-${{ github.sha }} ./admin-panel
          docker push $DOCKER_REGISTRY/boukii-admin:staging-${{ github.sha }}
          
      - name: 🚀 Deploy to staging
        run: |
          export KUBECONFIG=kubeconfig
          
          # Update backend deployment
          kubectl set image deployment/boukii-api-staging \
            api=${{ secrets.DOCKER_REGISTRY }}/boukii-api:staging-${{ github.sha }} \
            -n boukii-staging
            
          # Update frontend deployment
          kubectl set image deployment/boukii-admin-staging \
            admin=${{ secrets.DOCKER_REGISTRY }}/boukii-admin:staging-${{ github.sha }} \
            -n boukii-staging
            
          # Wait for rollout
          kubectl rollout status deployment/boukii-api-staging -n boukii-staging
          kubectl rollout status deployment/boukii-admin-staging -n boukii-staging
          
      - name: 🧪 Run smoke tests
        run: |
          curl -f https://staging-api.boukii.com/api/health || exit 1
          curl -f https://staging.admin.boukii.com/health || exit 1

  deploy-production:
    name: 🎆 Deploy to Production
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests, e2e-tests, security-scan]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      # Similar deployment steps pero para producción
      # con aprobación manual requerida
        
      - name: 📊 Create deployment metrics
        run: |
          curl -X POST ${{ secrets.METRICS_WEBHOOK }} \
            -H "Content-Type: application/json" \
            -d '{
              "event": "deployment",
              "environment": "production",
              "version": "${{ github.sha }}",
              "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            }'
```

#### Herramientas de Desarrollo

**Pre-commit Hooks (.husky/pre-commit):**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Backend checks
echo "🔧 PHP Code Style..."
cd api && ./vendor/bin/pint --test || exit 1

echo "🔍 PHPStan Analysis..."
cd api && ./vendor/bin/phpstan analyse --error-format=github || exit 1

echo "🧪 Quick Tests..."
cd api && ./vendor/bin/pest --stop-on-failure || exit 1

# Frontend checks
echo "🔍 TypeScript Check..."
cd admin-panel && npm run build:check || exit 1

echo "🔍 ESLint..."
cd admin-panel && npm run lint:fix || exit 1

echo "✅ All checks passed!"
```

---

### 📋 7. DOCUMENTACIÓN TÉCNICA EXPORTABLE

#### OpenAPI/Swagger - Especificación Completa

**Generación Automática con L5-Swagger:**
```php
// config/l5-swagger.php
return [
    'default' => 'v5',
    'documentations' => [
        'v5' => [
            'api' => [
                'title' => 'Boukii V5 API Documentation',
                'version' => '5.0.0',
                'description' => 'Documentación completa de la API V5 de Boukii'
            ],
            'routes' => [
                'api' => '/api/v5/documentation'
            ],
            'paths' => [
                'docs' => storage_path('api-docs/v5'),
                'docs_json' => 'v5-api-docs.json',
                'docs_yaml' => 'v5-api-docs.yaml'
            ]
        ]
    ]
];
```

**Anotaciones OpenAPI en Controladores:**
```php
/**
 * @OA\Info(
 *     version="5.0.0",
 *     title="Boukii V5 API",
 *     description="API completa para la gestión de escuelas deportivas multi-tenant con contexto de temporadas",
 *     @OA\Contact(
 *         email="api@boukii.com",
 *         name="Boukii API Support"
 *     ),
 *     @OA\License(
 *         name="Proprietary",
 *         url="https://boukii.com/license"
 *     )
 * )
 * 
 * @OA\Server(
 *     url="https://api.boukii.com/api/v5",
 *     description="Producción"
 * )
 * 
 * @OA\Server(
 *     url="https://staging-api.boukii.com/api/v5",
 *     description="Staging"
 * )
 * 
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Token de autenticación Bearer obtenido del endpoint de login"
 * )
 */
class V5ApiController extends Controller
{
    /**
     * @OA\Post(
     *     path="/auth/login",
     *     summary="Autenticación de usuario",
     *     description="Autentica un usuario y devuelve un token de acceso con contexto de escuela y temporada",
     *     operationId="authLogin",
     *     tags={"Authentication"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email", "password", "school_id", "season_id"},
     *             @OA\Property(property="email", type="string", format="email", example="admin@escuela.com"),
     *             @OA\Property(property="password", type="string", format="password", example="password123"),
     *             @OA\Property(property="school_id", type="integer", example=2),
     *             @OA\Property(property="season_id", type="integer", example=5),
     *             @OA\Property(property="remember_me", type="boolean", example=false)
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Autenticación exitosa",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="token", type="string", example="1|abc123..."),
     *                 @OA\Property(property="token_type", type="string", example="Bearer"),
     *                 @OA\Property(property="expires_at", type="string", format="datetime", example="2025-01-16T10:30:00Z"),
     *                 @OA\Property(property="user", ref="#/components/schemas/User"),
     *                 @OA\Property(property="school", ref="#/components/schemas/School"),
     *                 @OA\Property(property="season", ref="#/components/schemas/Season"),
     *                 @OA\Property(property="permissions", type="array", @OA\Items(type="string"))
     *             ),
     *             @OA\Property(property="meta", ref="#/components/schemas/ResponseMeta")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Credenciales inválidas",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Acceso denegado a escuela o temporada",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // Implementation...
    }
}
```

**Schemas Reutilizables:**
```php
/**
 * @OA\Schema(
 *     schema="User",
 *     type="object",
 *     title="Usuario",
 *     description="Modelo de usuario del sistema",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="email", type="string", format="email", example="admin@escuela.com"),
 *     @OA\Property(property="first_name", type="string", example="Juan"),
 *     @OA\Property(property="last_name", type="string", example="Pérez"),
 *     @OA\Property(property="role", type="string", example="admin"),
 *     @OA\Property(property="created_at", type="string", format="datetime"),
 *     @OA\Property(property="updated_at", type="string", format="datetime")
 * )
 * 
 * @OA\Schema(
 *     schema="ErrorResponse",
 *     type="object",
 *     title="Respuesta de Error",
 *     @OA\Property(property="success", type="boolean", example=false),
 *     @OA\Property(
 *         property="error",
 *         type="object",
 *         @OA\Property(property="code", type="string", example="VALIDATION_ERROR"),
 *         @OA\Property(property="message", type="string", example="Los datos proporcionados no son válidos"),
 *         @OA\Property(property="type", type="string", example="validation_error"),
 *         @OA\Property(property="details", type="object")
 *     ),
 *     @OA\Property(property="meta", ref="#/components/schemas/ResponseMeta")
 * )
 */
class SchemaDefinitions {}
```

#### Generación de Documentación en Múltiples Formatos

**Comando Artisan Personalizado:**
```php
// app/Console/Commands/GenerateDocsCommand.php
class GenerateDocsCommand extends Command
{
    protected $signature = 'docs:generate 
                          {--format=all : Formato de salida (json|yaml|html|pdf|all)}
                          {--output= : Directorio de salida}
                          {--version=v5 : Versión de la API}';
    
    public function handle(): int
    {
        $format = $this->option('format');
        $version = $this->option('version');
        $outputDir = $this->option('output') ?? storage_path('docs');
        
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }
        
        $this->info("Generando documentación {$version} en formato {$format}...");
        
        if ($format === 'all' || $format === 'json') {
            $this->generateJson($version, $outputDir);
        }
        
        if ($format === 'all' || $format === 'yaml') {
            $this->generateYaml($version, $outputDir);
        }
        
        if ($format === 'all' || $format === 'html') {
            $this->generateHtml($version, $outputDir);
        }
        
        if ($format === 'all' || $format === 'pdf') {
            $this->generatePdf($version, $outputDir);
        }
        
        $this->info("✅ Documentación generada exitosamente en {$outputDir}");
        
        return 0;
    }
    
    private function generateJson(string $version, string $outputDir): void
    {
        Artisan::call('l5-swagger:generate', ['--version' => $version]);
        
        $sourcePath = storage_path("api-docs/{$version}/{$version}-api-docs.json");
        $targetPath = "{$outputDir}/boukii-{$version}-api.json";
        
        copy($sourcePath, $targetPath);
        $this->line("✅ JSON: {$targetPath}");
    }
    
    private function generateHtml(string $version, string $outputDir): void
    {
        $jsonPath = storage_path("api-docs/{$version}/{$version}-api-docs.json");
        $swagger = json_decode(file_get_contents($jsonPath), true);
        
        $html = view('docs.swagger-ui', [
            'title' => "Boukii {$version} API Documentation",
            'spec_url' => "/api/{$version}/documentation/json",
            'swagger_data' => $swagger
        ])->render();
        
        $htmlPath = "{$outputDir}/boukii-{$version}-api.html";
        file_put_contents($htmlPath, $html);
        
        $this->line("✅ HTML: {$htmlPath}");
    }
    
    private function generatePdf(string $version, string $outputDir): void
    {
        $this->info("Generando PDF...");
        
        // Usar wkhtmltopdf o similar
        $htmlPath = "{$outputDir}/boukii-{$version}-api.html";
        $pdfPath = "{$outputDir}/boukii-{$version}-api.pdf";
        
        $command = "wkhtmltopdf --page-size A4 --orientation Portrait {$htmlPath} {$pdfPath}";
        exec($command, $output, $returnCode);
        
        if ($returnCode === 0) {
            $this->line("✅ PDF: {$pdfPath}");
        } else {
            $this->error("❌ Error generando PDF");
        }
    }
}
```

#### Documentación Interactiva con Postman

**Colección Postman Autogenerada:**
```php
// app/Console/Commands/GeneratePostmanCommand.php
class GeneratePostmanCommand extends Command
{
    protected $signature = 'docs:postman {--output=}';
    
    public function handle(): int
    {
        $outputDir = $this->option('output') ?? storage_path('docs');
        
        $collection = [
            'info' => [
                'name' => 'Boukii V5 API',
                'description' => 'Colección completa de endpoints V5',
                'version' => '5.0.0',
                'schema' => 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            ],
            'auth' => [
                'type' => 'bearer',
                'bearer' => [
                    [
                        'key' => 'token',
                        'value' => '{{access_token}}',
                        'type' => 'string'
                    ]
                ]
            ],
            'variable' => [
                [
                    'key' => 'base_url',
                    'value' => 'https://api.boukii.com/api/v5',
                    'type' => 'string'
                ],
                [
                    'key' => 'access_token',
                    'value' => '',
                    'type' => 'string'
                ]
            ],
            'item' => $this->generateEndpoints()
        ];
        
        $collectionPath = "{$outputDir}/Boukii-V5-API.postman_collection.json";
        file_put_contents($collectionPath, json_encode($collection, JSON_PRETTY_PRINT));
        
        $this->info("✅ Colección Postman generada: {$collectionPath}");
        
        return 0;
    }
    
    private function generateEndpoints(): array
    {
        return [
            [
                'name' => 'Authentication',
                'item' => [
                    [
                        'name' => 'Login',
                        'request' => [
                            'method' => 'POST',
                            'header' => [
                                [
                                    'key' => 'Content-Type',
                                    'value' => 'application/json'
                                ]
                            ],
                            'body' => [
                                'mode' => 'raw',
                                'raw' => json_encode([
                                    'email' => 'admin@escuela.com',
                                    'password' => 'password123',
                                    'school_id' => 2,
                                    'season_id' => 5
                                ], JSON_PRETTY_PRINT)
                            ],
                            'url' => [
                                'raw' => '{{base_url}}/auth/login',
                                'host' => ['{{base_url}}'],
                                'path' => ['auth', 'login']
                            ]
                        ],
                        'event' => [
                            [
                                'listen' => 'test',
                                'script' => [
                                    'exec' => [
                                        'if (pm.response.code === 200) {',
                                        '    const response = pm.response.json();',
                                        '    pm.environment.set("access_token", response.data.token);',
                                        '}'
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
            // Más endpoints...
        ];
    }
}
```

#### Documentación para Desarrolladores

**README.md Completo:**
```markdown
# 🏀 Boukii V5 - Sistema de Gestión Deportiva

## 📦 Instalación Rápida

### Requisitos Previos
- PHP 8.1+
- Node.js 18+
- MySQL 8.0+
- Redis 7.0+
- Composer
- NPM

### Backend (Laravel)
```bash
# Clonar repositorio
git clone https://github.com/boukii/boukii-v5.git
cd boukii-v5/api

# Instalar dependencias
composer install

# Configurar entorno
cp .env.example .env
php artisan key:generate

# Configurar base de datos
php artisan migrate
php artisan db:seed

# Iniciar servidor
php artisan serve
```

### Frontend (Angular)
```bash
cd ../admin-panel
npm install
npm start
```

## 📚 Documentación Disponible

| Tipo | URL | Descripción |
|------|-----|-------------|
| **API Docs** | `/api/v5/documentation` | Documentación interactiva Swagger |
| **Postman** | `/docs/postman` | Colección Postman |
| **Technical** | `/docs/technical` | Documentación técnica completa |
| **User Guide** | `/docs/user` | Manual de usuario |
| **Architecture** | `/docs/architecture` | Diagramas y arquitectura |

## 🧪 Testing

```bash
# Backend
composer test
composer test:coverage

# Frontend  
npm test
npm run e2e
```

## 🚀 Deployment

```bash
# Generar documentación
php artisan docs:generate --format=all

# Build producción
npm run build:prod

# Deploy
./deploy.sh production
```
```

*Versión: 2.0 | Estado: Completo | Próxima revisión: Actualización post-implementación*