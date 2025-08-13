# Boukii V5 - Resumen Ejecutivo

## 🎯 Dominios y Módulos Principales

### Frontend (Angular 16)
- **Dashboard V5**: Widgets dinámicos, métricas en tiempo real
- **Clients**: CRUD completo, gestión multi-escuela  
- **Courses**: Gestión de cursos con contexto temporal
- **Bookings**: Sistema de reservas avanzado
- **Monitors**: Gestión de instructores y asignaciones
- **Analytics**: Reporting y análisis por escuela/temporada

### Backend (Laravel 10+)
- **Multi-School System**: Contexto por escuela y temporada
- **Authentication**: Sanctum + context headers
- **Permissions**: Sistema granular por escuela/temporada
- **V5 API**: Endpoints unificados con middleware de contexto

## 🏗 Arquitectura

### Flujo de Autenticación
1. **Login** → Obtener schools disponibles
2. **School Selection** → Si múltiples escuelas
3. **Season Selection** → Si múltiples temporadas activas
4. **Dashboard Access** → Con contexto establecido

### Headers de Contexto
- `X-School-ID`: Escuela activa
- `X-Season-ID`: Temporada activa
- `Authorization`: Bearer token

### Ramas Activas
- **Frontend**: `v5` (boukii-admin-panel)
- **Backend**: `v5` (api-boukii)

## 🔄 CI/CD y Workflows

### Commits y PRs
- Prefijos: `feat:`, `fix:`, `docs:`, `docs-sync:`
- PRs requieren review antes de merge
- Tests automáticos en pipeline

### Sincronización de Docs
- `/docs/shared/` se sincroniza automáticamente entre repos
- Anti-bucle: commits con `docs-sync:` no disparan nueva sync
- Script local disponible para sync manual

## 📂 Carpeta Shared

Esta carpeta contiene documentación que debe mantenerse sincronizada entre frontend y backend:

- **V5_OVERVIEW.md**: Este archivo
- **OPENAPI_README.md**: Especificaciones de API
- **PROMPTS_GUIDE.md**: Guías para IA/Claude
- **TESTING_GUIDE.md**: Comandos y estrategias de testing
- **WORKING_AGREEMENTS.md**: Convenciones del equipo

## 🚀 Quick Start

### Frontend
```bash
npm install
npm start  # Desarrollo con live reload
npm run build:development
```

### Backend
```bash
composer install
php artisan migrate
php artisan db:seed --class=V5TestDataSeeder
```

### Acceso Local
- Frontend: http://localhost:4200
- Backend: http://api-boukii.test

## 📋 Estado Actual V5

✅ **Completado**
- Sistema de autenticación multi-escuela
- Context middleware unificado
- Guards y interceptors
- Seeds y datos de prueba

🔄 **En Desarrollo** 
- Dashboard widgets dinámicos
- Módulos CRUD completos
- Tests E2E comprehensive

⏳ **Pendiente**
- Performance optimización
- Documentación OpenAPI completa
- Deploy automatizado

---
*Última actualización: 2025-08-13*