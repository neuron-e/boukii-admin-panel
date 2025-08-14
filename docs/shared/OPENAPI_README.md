# OpenAPI Documentation - Boukii V5

## 📝 Especificación de API

### Ubicación del Schema
- **Archivo principal**: `openapi/boukii-v5.yaml` (pendiente de crear)
- **Documentación generada**: Swagger UI en desarrollo

## 🔧 Generación y Actualización

### Comando de Generación (Laravel)
```bash
# Generar documentación automática desde anotaciones
php artisan l5-swagger:generate

# Validar schema OpenAPI
php artisan api:validate-schema
```

### Comando de Generación (Angular)
```bash
# Generar clientes TypeScript desde OpenAPI
npm run generate:api-client

# Validar contratos de API
npm run validate:api-contracts
```

## 📋 Estructura del Schema

### Authentication
- **Bearer Token**: JWT via Sanctum
- **Context Headers**: `X-School-ID`, `X-Season-ID`
- **Scopes**: Por escuela y temporada

### Endpoints Principales

#### Authentication
- `POST /api/v5/auth/login`
- `POST /api/v5/auth/logout`
- `GET /api/v5/auth/me`

#### Schools & Context
- `GET /api/v5/schools`
- `POST /api/v5/schools/{id}/select`
- `GET /api/v5/seasons`
- `POST /api/v5/seasons`

#### Core Modules
- `GET /api/v5/dashboard/stats`
- `GET /api/v5/clients`
- `GET /api/v5/courses`
- `GET /api/v5/bookings`
- `GET /api/v5/monitors`

## 🎯 Convenciones de API

### Request Headers
```yaml
headers:
  Authorization: "Bearer {token}"
  X-School-ID: "integer|required"
  X-Season-ID: "integer|required"
  Content-Type: "application/json"
```

### Response Format
```yaml
success_response:
  success: true
  data: {}
  meta:
    pagination: {}
    context:
      school_id: integer
      season_id: integer

error_response:
  success: false
  message: string
  errors: {}
```

### Validación
- **Request validation**: Laravel Form Requests
- **Response validation**: OpenAPI schema
- **Type safety**: TypeScript interfaces

## 🧪 Testing de API

### Postman Collection
- **Archivo**: `postman/Boukii-V5.postman_collection.json`
- **Environment**: Variables de entorno por ambiente
- **Tests**: Validación automática de responses

### Contract Testing
```bash
# Backend - validar responses contra schema
php artisan test --group=api-contracts

# Frontend - validar requests contra schema  
npm run test:api-contracts
```

## 🔄 Workflow de Actualización

### 1. Modificar Endpoints
- Actualizar controlador Laravel
- Añadir/modificar anotaciones OpenAPI
- Actualizar tests

### 2. Regenerar Documentación
```bash
php artisan l5-swagger:generate
```

### 3. Actualizar Frontend
```bash
npm run generate:api-client
```

### 4. Validar Cambios
- Tests de contratos
- Validación en Postman
- Review de breaking changes

## 📚 Herramientas

### Swagger UI
- **Desarrollo**: http://api-boukii.test/api/documentation
- **Staging**: https://api-staging.boukii.com/api/documentation

### Editores
- **Swagger Editor**: Para edición manual del schema
- **Insomnia**: Cliente alternativo a Postman
- **VS Code**: Extensions para OpenAPI

## 🚨 Breaking Changes

### Versionado
- **Major**: Cambios incompatibles en v5 → v6
- **Minor**: Nuevos endpoints, campos opcionales
- **Patch**: Fixes, documentación

### Notificación
- Changelog detallado en cada release
- Migration guide para versiones major
- Deprecation notices con 2 releases de antelación

---

## 🎯 TODO

- [ ] Crear archivo `openapi/boukii-v5.yaml` inicial
- [ ] Configurar l5-swagger en Laravel  
- [ ] Generar cliente TypeScript automático
- [ ] Setup contract testing
- [ ] Crear Postman collection completa

---

*Última actualización: 2025-08-13*
