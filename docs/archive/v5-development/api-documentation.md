# Boukii API Documentation

## Información General

Esta es la documentación completa de la API de Boukii, un sistema de gestión de reservas para escuelas deportivas construido con Laravel. La API proporciona múltiples interfaces para diferentes tipos de usuarios y casos de uso.

**Base URL:** `http://your-domain.com/api`

## Autenticación

La API utiliza múltiples métodos de autenticación:

1. **Sanctum Token** - Para aplicaciones admin y profesores
2. **BookingPage Middleware** - Requiere school slug en el header
3. **UserRequired Middleware** - Control de acceso basado en roles
4. **Guest Access** - Para endpoints públicos

### Headers Requeridos

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}  # Para endpoints autenticados
X-School-Slug: {school-slug}  # Para endpoints de booking
```

## Formato de Respuesta Estándar

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {}, 
  "message": "Operación completada exitosamente"
}
```

### Respuesta con Paginación
```json
{
  "success": true,
  "data": [],
  "current_page": 1,
  "first_page_url": "http://api.example.com/resource?page=1",
  "from": 1,
  "last_page": 10,
  "last_page_url": "http://api.example.com/resource?page=10",
  "next_page_url": "http://api.example.com/resource?page=2",
  "path": "http://api.example.com/resource",
  "per_page": 15,
  "prev_page_url": null,
  "to": 15,
  "total": 150,
  "message": "Datos obtenidos exitosamente"
}
```

### Respuesta de Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "data": []
}
```

### Error de Validación
```json
{
  "success": false,
  "message": "Los datos proporcionados son inválidos",
  "errors": {
    "email": ["El campo email es requerido"],
    "price_total": ["El precio total debe ser un número"]
  }
}
```

## Códigos de Estado HTTP

- `200`: OK - Solicitud exitosa
- `201`: Created - Recurso creado exitosamente
- `400`: Bad Request - Parámetros de solicitud inválidos
- `401`: Unauthorized - Autenticación requerida
- `403`: Forbidden - Acceso denegado
- `404`: Not Found - Recurso no encontrado
- `422`: Unprocessable Entity - Errores de validación
- `500`: Internal Server Error - Error del servidor

## Parámetros de Consulta Comunes

- `page`: Número de página para paginación
- `perPage`: Elementos por página (default: 10)
- `search`: Término de búsqueda
- `with`: Cargar relaciones (ej: `with[]=client&with[]=course`)
- `order`: Orden de clasificación (`asc`|`desc`)
- `orderColumn`: Columna de ordenamiento
- `school_id`: Filtrar por escuela
- `status`: Filtrar por estado
- `course_type`: Filtrar por tipo de curso
- `start_date`/`end_date`: Filtros de rango de fechas

## 1. Endpoints Públicos (`/api/`)

### Autenticación y Recuperación de Contraseña

#### Enviar Link de Recuperación
```http
POST /api/forgot-password
Content-Type: application/json

{
  "email": "usuario@example.com"
}
```

#### Restablecer Contraseña
```http
PUT /api/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "email": "usuario@example.com", 
  "password": "nueva_contraseña",
  "password_confirmation": "nueva_contraseña"
}
```

### Disponibilidad y Traducción

#### Verificar Disponibilidad de Curso
```http
POST /api/availability
Content-Type: application/json

{
  "course_id": 10,
  "date": "2025-01-20",
  "participants": 2
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "spots_left": 6,
    "available_hours": ["09:00", "14:00"],
    "monitors_available": [25, 30]
  }
}
```

#### Obtener Horas Disponibles
```http
POST /api/availability/hours
Content-Type: application/json

{
  "course_id": 10,
  "date": "2025-01-20"
}
```

#### Servicio de Traducción
```http
POST /api/translate
Content-Type: application/json

{
  "text": "Hello World",
  "target_language": "fr"
}
```

### Gestión de Recursos CRUD

Todos los recursos principales siguen el patrón REST estándar:

#### Estaciones (Stations)
```http
GET /api/stations?page=1&perPage=15&search=mountain
POST /api/stations
PUT /api/stations/{id}
DELETE /api/stations/{id}
```

**Modelo Station:**
```json
{
  "id": 1,
  "name": "Mountain Station",
  "address": "123 Alpine Road",
  "city": "Zermatt",
  "country": "Switzerland",
  "weather_code": "ZER123",
  "active": true,
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T10:00:00Z"
}
```

#### Escuelas (Schools)
```http
GET /api/schools
POST /api/schools
PUT /api/schools/{id}
DELETE /api/schools/{id}
PUT /api/schools/{id}/sports  # Actualizar deportes de la escuela
```

**Modelo School:**
```json
{
  "id": 1,
  "name": "Alpine Ski School",
  "slug": "alpine-ski-school",
  "email": "info@alpineskischool.com",
  "phone": "+41 27 967 12 34",
  "address": "Bahnhofstrasse 1",
  "city": "Zermatt",
  "country": "Switzerland",
  "website": "https://alpineskischool.com",
  "logo": "https://cdn.example.com/logo.png",
  "settings": {
    "currency": "CHF",
    "cancellation_policy": 24,
    "insurance_rate": 0.05
  },
  "active": true,
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T10:00:00Z"
}
```

#### Deportes (Sports)
```http
GET /api/sports
POST /api/sports
PUT /api/sports/{id}
DELETE /api/sports/{id}
```

**Modelo Sport:**
```json
{
  "id": 1,
  "name": "Ski",
  "description": "Alpine skiing instruction",
  "icon_collective": "ski-collective",
  "icon_private": "ski-private",
  "active": true,
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T10:00:00Z"
}
```

#### Cursos (Courses)
```http
GET /api/courses?school_id=1&course_type=1&active=1
POST /api/courses
PUT /api/courses/{id}
DELETE /api/courses/{id}
```

**Modelo Course:**
```json
{
  "id": 10,
  "course_type": 1,
  "is_flexible": false,
  "sport_id": 1,
  "school_id": 1,
  "name": "Beginner Ski Course",
  "short_description": "Perfect for beginners",
  "description": "Comprehensive beginner ski course with professional instruction",
  "price": 150.00,
  "currency": "CHF",
  "date_start": "2025-01-01",
  "date_end": "2025-03-31",
  "date_start_res": "2024-12-01",
  "date_end_res": "2025-03-25",
  "age_min": 6,
  "age_max": 65,
  "max_participants": 8,
  "confirm_attendance": true,
  "highlighted": false,
  "active": true,
  "unique": false,
  "online": false,
  "options": false,
  "image": "https://example.com/course-image.jpg",
  "claim_text": "Learn to ski with experts!",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T10:00:00Z"
}
```

**Tipos de Curso:**
- `1`: Colectivo (Cursos grupales)
- `2`: Privado (Lecciones individuales)
- `3`: Actividades (Eventos especiales)

#### Reservas (Bookings)
```http
GET /api/bookings?status=1&school_id=1&with[]=client&with[]=bookingUsers
POST /api/bookings
PUT /api/bookings/{id}
DELETE /api/bookings/{id}
```

**Modelo Booking:**
```json
{
  "id": 123,
  "school_id": 1,
  "client_main_id": 456,
  "user_id": 789,
  "price_total": 150.00,
  "has_cancellation_insurance": true,
  "price_cancellation_insurance": 15.00,
  "currency": "CHF",
  "payment_method_id": 3,
  "paid_total": 150.00,
  "paid": true,
  "payrexx_reference": "Boukii #123",
  "payrexx_transaction": null,
  "attendance": false,
  "payrexx_refund": false,
  "notes": "Special requirements",
  "notes_school": "Internal notes",
  "paxes": 2,
  "color": "#FF5733",
  "status": 1,
  "has_boukii_care": false,
  "price_boukii_care": 0.00,
  "has_tva": true,
  "price_tva": 12.00,
  "has_reduction": false,
  "price_reduction": 0.00,
  "basket": "{}",
  "source": "web",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z",
  "sport": "ski-collective",
  "bonus": false,
  "payment_method_status": "paid",
  "has_observations": false,
  "cancellation_status": "active",
  "payment_method": 3,
  "grouped_activities": [
    {
      "group_id": "grp_123",
      "sport": {
        "id": 1,
        "name": "Ski",
        "icon_collective": "ski-collective"
      },
      "course": {
        "id": 10,
        "name": "Beginner Ski Course",
        "course_type": 1
      },
      "dates": [
        {
          "id": 50,
          "date": "2025-01-20",
          "startHour": "09:00",
          "endHour": "12:00",
          "duration": "3h",
          "monitor": {
            "id": 25,
            "name": "John Instructor"
          },
          "utilizers": [
            {
              "id": 456,
              "first_name": "Alice",
              "last_name": "Smith",
              "birth_date": "1990-05-15"
            }
          ]
        }
      ],
      "total": 150.00,
      "status": 1
    }
  ],
  "vouchers_used_amount": 0.00
}
```

**Estados de Reserva:**
- `1`: Reserva activa
- `2`: Reserva cancelada  
- `3`: Reserva sin pagar (cancelación pendiente)

**Métodos de Pago:**
- `1`: Efectivo
- `2`: BoukiiPay (Tarjeta de crédito)
- `3`: Online (Tarjeta vía email)
- `4`: Otro
- `5`: Sin pago

#### Clientes (Clients)
```http
GET /api/clients?search=alice&school_id=1
POST /api/clients
PUT /api/clients/{id}
DELETE /api/clients/{id}
POST /api/clients/transfer  # Transferir clientes
```

**Modelo Client:**
```json
{
  "id": 456,
  "email": "alice.smith@example.com",
  "first_name": "Alice",
  "last_name": "Smith",
  "birth_date": "1990-05-15",
  "phone": "+41 79 123 45 67",
  "telephone": "+41 22 123 45 67",
  "address": "123 Main Street",
  "cp": "1201",
  "city": "Geneva",
  "province": "Geneva",
  "country": "Switzerland",
  "image": "https://example.com/client-avatar.jpg",
  "language1_id": 1,
  "nationality": "Swiss",
  "emergency_contact_name": "John Smith",
  "emergency_contact_phone": "+41 79 987 65 43",
  "notes": "VIP client",
  "active": true,
  "created_at": "2025-01-01T09:00:00Z",
  "updated_at": "2025-01-01T09:00:00Z"
}
```

#### Monitores (Monitors)
```http
GET /api/monitors?active_school=1&active=1
POST /api/monitors
PUT /api/monitors/{id}
DELETE /api/monitors/{id}
```

**Modelo Monitor:**
```json
{
  "id": 25,
  "first_name": "John",
  "last_name": "Instructor",
  "email": "john@alpineskischool.com",
  "phone": "+41 79 555 44 33",
  "active_school": 1,
  "active": true,
  "birth_date": "1985-03-15",
  "image": "https://example.com/monitor-photo.jpg",
  "notes": "Expert ski instructor",
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-01T08:00:00Z"
}
```

#### Pagos (Payments)
```http
GET /api/payments?booking_id=123
POST /api/payments
PUT /api/payments/{id}
DELETE /api/payments/{id}
```

**Modelo Payment:**  
```json
{
  "id": 100,
  "booking_id": 123,
  "amount": 150.00,
  "currency": "CHF",
  "status": "paid",
  "payment_method": "card",
  "payrexx_reference": "px_ref_12345",
  "notes": "Online payment via credit card",
  "processed_at": "2025-01-15T10:35:00Z",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:35:00Z"
}
```

**Estados de Pago:**
- `pending`: Pago iniciado pero no completado
- `paid`: Pago completado exitosamente
- `failed`: Pago fallido
- `refund`: Pago reembolsado
- `partial_refund`: Reembolso parcial procesado
- `no_refund`: Reembolso denegado/no procesado

#### Vouchers/Cupones
```http
GET /api/vouchers?active=1&school_id=1
POST /api/vouchers
PUT /api/vouchers/{id}
DELETE /api/vouchers/{id}
POST /api/vouchers/{id}/restore  # Restaurar voucher
```

**Modelo Voucher:**
```json
{
  "id": 200,
  "code": "SUMMER2025",
  "quantity": 50.00,
  "remaining_balance": 25.00,
  "currency": "CHF",
  "type": "discount",
  "active": true,
  "used": true,
  "payed": false,
  "valid_from": "2025-01-01",
  "valid_until": "2025-12-31",
  "client_id": 456,
  "school_id": 1,
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

## 2. Endpoints de Administrador (`/api/admin/`)

**Autenticación:** Token Sanctum con habilidad `admin:all`

### Autenticación de Admin

#### Login de Administrador
```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@alpineskischool.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@alpineskischool.com",
      "type": "admin"
    },
    "token": "1|abc123def456...",
    "abilities": ["admin:all"]
  },
  "message": "Login exitoso"
}
```

### Gestión de Cursos Avanzada

#### Exportar Detalles de Curso
```http
GET /api/admin/courses/{id}/export/{lang}
```

#### Estadísticas de Ventas de Curso
```http
GET /api/admin/courses/{id}/sells/
```

### Gestión de Clientes

#### Obtener Clientes Principales
```http
GET /api/admin/clients/mains?school_id=1
```

#### Obtener Utilizadores de Cliente
```http
GET /api/admin/clients/{id}/utilizers
```

#### Obtener Clientes por Curso
```http
GET /api/admin/clients/course/{id}
```

### Gestión de Monitores y Planificación

#### Obtener Monitores Disponibles
```http
POST /api/admin/monitors/available
Content-Type: application/json

{
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "sport_id": 1,
  "school_id": 1
}
```

#### Verificar Disponibilidad de Monitor Específico
```http
POST /api/admin/monitors/available/{id}
Content-Type: application/json

{
  "date": "2025-01-20",
  "hour_start": "09:00", 
  "hour_end": "12:00"
}
```

#### Obtener Datos de Planificación
```http
GET /api/admin/getPlanner?school_id=1&date_start=2025-01-01&date_end=2025-01-31&languages=1,2
```
Opcionalmente puede enviarse el parámetro `languages` con IDs separados por coma o como array para filtrar por los idiomas de los monitores.

The booking objects returned by this endpoint now include a `user_id` value representing the booking creator.

Responses for this endpoint are cached for up to 10 minutes. The cache key is built
from `school_id`, `date_start`, `date_end`, `monitor_id` and `languages` parameters.

Clear the cache or wait for expiration if planner data has changed.

#### Transferir Asignaciones de Monitor
```http
POST /api/admin/planner/monitors/transfer
Content-Type: application/json

{
  "from_monitor_id": 25,
  "to_monitor_id": 30,
  "date": "2025-01-20",
  "course_id": 10
}
```

### Gestión Avanzada de Reservas

#### Crear Reserva
```http
POST /api/admin/bookings
Content-Type: application/json

{
  "school_id": 1,
  "client_main_id": 456,
  "course_id": 10,
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "participants": [
    {
      "client_id": 456,
      "degree_id": 5
    }
  ],
  "monitor_id": 25,
  "payment_method_id": 3,
  "has_cancellation_insurance": true,
  "notes": "First time skiing"
}
```

#### Verificar Solapamiento de Reservas
```http
POST /api/admin/bookings/checkbooking
Content-Type: application/json

{
  "booking_id": 123,
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "monitor_id": 25,
  "course_id": 10
}
```

#### Procesar Pago de Reserva
```http
POST /api/admin/bookings/payments/{id}
Content-Type: application/json

{
  "amount": 150.00,
  "payment_method": "card",
  "notes": "Payment processed by admin"
}
```

#### Enviar Email de Reserva
```http
POST /api/admin/bookings/mail/{id}
Content-Type: application/json

{
  "template": "booking_confirmation",
  "language": "en"
}
```

#### Procesar Reembolso de Reserva
```http
POST /api/admin/bookings/refunds/{id}
Content-Type: application/json

{
  "amount": 150.00,
  "reason": "Customer cancellation",
  "refund_method": "original_payment_method"
}
```

#### Cancelar Reservas
```http
POST /api/admin/bookings/cancel
Content-Type: application/json

{
  "booking_ids": [123, 124, 125],
  "reason": "Bad weather conditions",
  "notify_clients": true,
  "process_refunds": true
}
```

#### Actualizar Reserva
```http
POST /api/admin/bookings/update
Content-Type: application/json

{
  "booking_id": 123,
  "new_date": "2025-01-21",
  "new_hour_start": "10:00",
  "new_hour_end": "13:00",
  "new_monitor_id": 30,
  "notify_client": true
}
```

#### Actualizar Pago de Reserva
```http
POST /api/admin/bookings/update/{id}/payment
Content-Type: application/json

{
  "payment_method_id": 2,
  "amount": 150.00,
  "paid": true
}
```

### Sistema de Analíticas Moderno

**Base URL:** `/api/admin/analytics/`

#### Resumen de Analíticas
```http
GET /api/admin/analytics/summary?school_id=1&period=month&start_date=2025-01-01&end_date=2025-01-31
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalPaid": 15750.50,
    "activeBookings": 125,
    "withInsurance": 35,
    "withVoucher": 18,
    "totalRefunds": 450.00,
    "netRevenue": 15300.50,
    "compared_to_previous": {
      "revenue_change": "+12.5%",
      "bookings_change": "+8.3%"
    }
  }
}
```

#### Analíticas de Cursos
```http
GET /api/admin/analytics/courses?school_id=1&course_type=1&period=week
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "courseId": 10,
      "courseName": "Beginner Ski Course",
      "courseType": 1,
      "totalRevenue": 3750.00,
      "totalBookings": 25,
      "averagePrice": 150.00,
      "completionRate": 92.5,
      "paymentMethods": {
        "cash": 1200.00,
        "card": 2100.00,
        "online": 450.00,
        "vouchers": 0.00,
        "pending": 0.00
      }
    }
  ]
}
```

#### Analíticas de Ingresos
```http
GET /api/admin/analytics/revenue?school_id=1&group_by=day&start_date=2025-01-01&end_date=2025-01-07
```

#### Dashboard Financiero Completo
```http
GET /api/admin/analytics/financial-dashboard?school_id=1&period=month
```

#### Comparación de Rendimiento
```http
GET /api/admin/analytics/performance-comparison?school_id=1&compare_period=month&current_start=2025-01-01&current_end=2025-01-31&previous_start=2024-12-01&previous_end=2024-12-31
```

#### Exportación de Datos

##### Exportar a CSV
```http
POST /api/admin/analytics/export/csv
Content-Type: application/json

{
  "school_id": 1,
  "report_type": "revenue",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "columns": ["date", "revenue", "bookings", "payment_method"]
}
```

##### Exportar a Excel
```http
POST /api/admin/analytics/export/excel
Content-Type: application/json

{
  "school_id": 1,
  "report_type": "courses",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "include_charts": true
}
```

##### Descargar Archivo Exportado
```http
GET /api/admin/analytics/download/{filename}
```

#### Analíticas Avanzadas

##### Ingresos por Período
```http
GET /api/admin/analytics/revenue-by-period?school_id=1&period=week&weeks=12
```

##### Análisis de Conversión
```http
GET /api/admin/analytics/conversion-analysis?school_id=1&period=month
```

##### Métricas en Tiempo Real
```http
GET /api/admin/analytics/realtime-metrics?school_id=1
```

##### Rendimiento de Deportes
```http
GET /api/admin/analytics/sports-performance?school_id=1&sport_ids[]=1&sport_ids[]=2
```

##### Comparación Estacional
```http
GET /api/admin/analytics/seasonal-comparison?school_id=1&current_season=2025&compare_seasons[]=2024&compare_seasons[]=2023
```

##### Insights de Clientes
```http
GET /api/admin/analytics/customer-insights?school_id=1&segment=returning_customers
```

##### Análisis de Capacidad
```http
GET /api/admin/analytics/capacity-analysis?school_id=1&course_ids[]=10&course_ids[]=11
```

#### Analíticas Específicas de Monitor

##### Analíticas Diarias de Monitor
```http
GET /api/admin/analytics/monitors/{monitorId}/daily?date=2025-01-20
```

##### Rendimiento de Monitor
```http
GET /api/admin/analytics/monitors/{monitorId}/performance?period=month&start_date=2025-01-01&end_date=2025-01-31
```

#### Dashboards Especializados

##### Dashboard Ejecutivo
```http
GET /api/admin/analytics/executive-dashboard?school_id=1&period=quarter
```

##### Dashboard Operacional
```http
GET /api/admin/analytics/operational-dashboard?school_id=1&date=2025-01-20
```

##### Análisis de Precios
```http
GET /api/admin/analytics/pricing-analysis?school_id=1&course_type=1
```

#### Configuración y Preferencias

##### Obtener Preferencias de Analíticas
```http
GET /api/admin/analytics/preferences?user_id=1
```

##### Guardar Preferencias de Analíticas
```http
POST /api/admin/analytics/preferences
Content-Type: application/json

{
  "user_id": 1,
  "default_period": "month",
  "default_chart_type": "line",
  "email_reports": true,
  "report_frequency": "weekly"
}
```

##### Ejecutar Consulta Personalizada
```http
POST /api/admin/analytics/custom-query
Content-Type: application/json

{
  "query": "SELECT COUNT(*) as total_bookings FROM bookings WHERE school_id = ? AND created_at >= ?",
  "params": [1, "2025-01-01"]
}
```

### Sistema de Finanzas

**Base URL:** `/api/admin/finance/`

#### Dashboard Financiero de Temporada
```http
GET /api/admin/finance/season-dashboard?school_id=1&season=2025
```

#### Exportar Dashboard de Temporada
```http
GET /api/admin/finance/season-dashboard/export?school_id=1&season=2025&format=excel
```

#### Detalles de Reservas
```http
GET /api/admin/finance/booking-details?school_id=1&booking_ids[]=123&booking_ids[]=124
```

#### Exportar Reservas Pendientes
```http
GET /api/admin/finance/export-pending-bookings?school_id=1&format=csv
```

#### Exportar Reservas Canceladas
```http
GET /api/admin/finance/export-cancelled-bookings?school_id=1&start_date=2025-01-01&end_date=2025-01-31
```

#### Exportar Reporte de Ventas Reales
```http
POST /api/admin/finance/export-real-sales
Content-Type: application/json

{
  "school_id": 1,
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "include_cancelled": false,
  "group_by": "course"
}
```

#### Finanzas Específicas de Curso

##### Estadísticas de Curso
```http
GET /api/admin/finance/courses/{courseId}/statistics?period=month&start_date=2025-01-01&end_date=2025-01-31
```

##### Exportar Estadísticas de Curso
```http
GET /api/admin/finance/courses/{courseId}/statistics/export?format=pdf&language=en
```

##### Comparar Curso con Similares
```http
GET /api/admin/finance/courses/{courseId}/statistics/compare?compare_courses[]=11&compare_courses[]=12&period=month
```

### Integraciones

**Base URL:** `/api/admin/integrations/`

#### Sincronizar Datos de Payrexx
```http
POST /api/admin/integrations/payrexx/sync
Content-Type: application/json

{
  "school_id": 1,
  "sync_pending": true,
  "sync_completed": false,
  "start_date": "2025-01-01"
}
```

#### Exportar a Google Analytics
```http
POST /api/admin/integrations/google-analytics/export
Content-Type: application/json

{
  "school_id": 1,
  "event_type": "booking_completed",
  "data": {
    "booking_id": 123,
    "revenue": 150.00,
    "course_type": "ski-collective"
  }
}
```

#### Webhook de Actualización en Tiempo Real
```http
POST /api/admin/integrations/webhook/realtime-update
Content-Type: application/json

{
  "event": "booking_created",
  "school_id": 1,
  "data": {
    "booking_id": 123,
    "course_id": 10,
    "client_id": 456
  }
}
```

### Email y Clima

#### Enviar Email
```http
POST /api/admin/mails/send
Content-Type: application/json

{
  "template_id": 1,
  "recipient_email": "client@example.com",
  "recipient_name": "Alice Smith",
  "data": {
    "booking_id": 123,
    "course_name": "Beginner Ski Course",
    "date": "2025-01-20"
  },
  "language": "en"
}
```

#### Pronóstico del Tiempo (12 horas)
```http
GET /api/admin/weather?station_id=1
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "station_id": 1,
    "station_name": "Zermatt",
    "current_time": "2025-01-15T14:00:00Z",
    "forecast": [
      {
        "time": "15:00",
        "temperature": -2,
        "weather": "Snow",
        "wind_speed": 15,
        "visibility": "Good"
      }
    ]
  }
}
```

#### Pronóstico del Tiempo (5 días)
```http
GET /api/admin/weather/week?station_id=1
```

## 3. Endpoints de Página de Reservas (`/api/slug/`)

**Autenticación:** Middleware BookingPage (requiere school slug en header)
**Header requerido:** `X-School-Slug: alpine-ski-school`

### Autenticación de Página de Reservas

#### Login de Página de Reservas
```http
POST /api/slug/login
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "email": "cliente@example.com",
  "password": "password123"
}
```

### Información de la Escuela

#### Obtener Información de la Escuela
```http
GET /api/slug/school
X-School-Slug: alpine-ski-school
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alpine Ski School",
    "slug": "alpine-ski-school",
    "logo": "https://cdn.example.com/logo.png",
    "contact": {
      "email": "info@alpineskischool.com",
      "phone": "+41 27 967 12 34",
      "address": "Bahnhofstrasse 1, Zermatt"
    },
    "settings": {
      "currency": "CHF",
      "languages": ["en", "fr", "de"],
      "cancellation_policy": 24,
      "booking_lead_time": 2
    }
  }
}
```

### Navegación y Reserva de Cursos

#### Listar Cursos Disponibles
```http
GET /api/slug/courses?active=1&course_type=1&sport_id=1
X-School-Slug: alpine-ski-school
```

#### Obtener Detalles de Curso
```http
GET /api/slug/courses/{id}
X-School-Slug: alpine-ski-school
```

#### Verificar Disponibilidad de Curso
```http
POST /api/slug/courses/availability/{id}
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "date": "2025-01-20",
  "participants": 2,
  "preferred_time": "morning"
}
```

### Gestión de Clientes

#### Obtener Clientes Principales
```http
GET /api/slug/clients/mains
X-School-Slug: alpine-ski-school
```

#### Crear Cliente
```http
POST /api/slug/clients
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "email": "nuevo@example.com",
  "first_name": "Juan",
  "last_name": "Pérez",
  "birth_date": "1985-06-20",
  "phone": "+41 79 123 45 67",
  "language1_id": 1
}
```

#### Obtener Utilizadores de Cliente
```http
GET /api/slug/clients/{id}/utilizers
X-School-Slug: alpine-ski-school
```

#### Crear Utilizadores
```http
POST /api/slug/client/{id}/utilizers
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "utilizers": [
    {
      "first_name": "Ana",
      "last_name": "Pérez",
      "birth_date": "2010-03-15",
      "relationship": "daughter"
    }
  ]
}
```

#### Obtener Voucher por Código
```http
GET /api/slug/client/{id}/voucher/{code}
X-School-Slug: alpine-ski-school
```

### Proceso de Reserva

#### Verificar Solapamiento de Reservas
```http
POST /api/slug/bookings/checkbooking
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "course_id": 10,
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "monitor_id": 25
}
```

#### Crear Reserva
```http
POST /api/slug/bookings
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "client_main_id": 456,
  "course_id": 10,
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "participants": [
    {
      "client_id": 456,
      "degree_id": 5
    }
  ],
  "monitor_id": 25,
  "payment_method_id": 3,
  "has_cancellation_insurance": true,
  "voucher_code": "SUMMER2025"
}
```

#### Procesar Pago
```http
POST /api/slug/bookings/payments/{id}
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "payment_method": "card",
  "amount": 150.00,
  "payrexx_token": "token_from_payrexx_widget"
}
```

#### Procesar Reembolso
```http
POST /api/slug/bookings/refunds/{id}
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "reason": "Client cancellation",
  "refund_amount": 150.00
}
```

#### Cancelar Reserva
```http
POST /api/slug/bookings/cancel
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "booking_id": 123,
  "reason": "Change of plans",
  "request_refund": true
}
```

### Disponibilidad de Monitores

#### Obtener Monitores Disponibles
```http
POST /api/slug/monitors/available
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "sport_id": 1
}
```

#### Verificar Disponibilidad de Monitor Específico
```http
POST /api/slug/monitors/available/{id}
Content-Type: application/json
X-School-Slug: alpine-ski-school

{
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00"
}
```

## 4. Endpoints de Aplicación de Profesores (`/api/teach/`)

**Autenticación:** Token Sanctum con habilidad `teach:all`

### Autenticación de Profesor

#### Login de Profesor/Monitor
```http
POST /api/teach/login
Content-Type: application/json

{
  "email": "instructor@alpineskischool.com",
  "password": "password123"
}
```

### Dashboard y Horario

#### Obtener Agenda de Monitor
```http
GET /api/teach/getAgenda?monitor_id=25&start_date=2025-01-15&end_date=2025-01-21
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-20",
      "bookings": [
        {
          "booking_id": 123,
          "course_name": "Beginner Ski Course",
          "start_time": "09:00",
          "end_time": "12:00",
          "participants": [
            {
              "id": 456,
              "name": "Alice Smith",
              "level": "Beginner"
            }
          ],
          "location": "Slope A",
          "weather": {
            "temperature": -2,
            "conditions": "Snow"
          }
        }
      ]
    }
  ]
}
```

#### Pronóstico del Tiempo (12 horas)
```http
GET /api/teach/weather?station_id=1
```

#### Pronóstico del Tiempo (Semana)
```http
GET /api/teach/weather/week?station_id=1
```

### Gestión de Monitor

#### Obtener Reservas Pasadas
```http
GET /api/teach/monitor/pastBookings?monitor_id=25&limit=20&page=1
```

### Gestión de Clientes

#### Listar Clientes del Monitor
```http
GET /api/teach/clients?monitor_id=25
```

#### Obtener Detalles de Cliente
```http
GET /api/teach/clients/{id}
```

#### Obtener Reservas de Cliente
```http
GET /api/teach/clients/{id}/bookings?status=1
```

### Información de Cursos

#### Obtener Detalles de Curso
```http
GET /api/teach/courses/{id}
```

## 5. Endpoints de Aplicación Deportiva (`/api/sports/`)

**Autenticación:** Middleware UserRequired con tipo de usuario 'client'

*Nota: Implementación mínima actual - preparada para futura aplicación móvil de clientes*

## 6. Endpoints de Superadministrador (`/api/superadmin/`)

**Autenticación:** Middleware UserRequired con tipo de usuario 'superadmin'

*Nota: Actualmente placeholder - sin endpoints específicos implementados*

## 7. Procesamiento de Pagos

### Notificación de Pago de Payrexx
```http
POST /api/payrexxNotification
Content-Type: application/json

{
  "transaction": {
    "id": 12345,
    "status": "confirmed",
    "amount": 15000,
    "currency": "CHF",
    "reference": "Boukii #123"
  },
  "signature": "webhook_signature_here"
}
```

### Finalización de Pago de Payrexx
```http
GET /api/payrexx/finish?transaction_id=12345&status=success
```

## 8. Endpoints de Utilidad y Mantenimiento

### Utilidades del Sistema

#### Restablecer Caché de Permisos
```http
ANY /api/users-permissions
```

#### Exportar Vouchers Utilizados
```http
GET /api/export/vouchers-used?school_id=1&start_date=2025-01-01&end_date=2025-01-31
```

### Endpoints de Depuración y Mantenimiento

#### Corregir Asignaciones de Subgrupos
```http
ANY /api/fix-subgroups
```

#### Corregir Duplicados de Reservas
```http
ANY /api/fix-bookings
```

#### Corregir Fechas Duplicadas de Cursos
```http
ANY /api/fix-dates
```

#### Corregir Datos de Usuarios de Reservas
```http
POST /api/fix-booking-users
Content-Type: application/json

{
  "booking_id": 123,
  "fix_type": "price_recalculation"
}
```

#### Probar Emails de Reservas
```http
ANY /api/mailtest/{bookingId}?template=booking_confirmation&language=en
```

#### Probar Emails de Recuperación de Contraseña
```http
ANY /api/mailtest?type=password_recovery&email=test@example.com
```

#### Probar Integración de Payrexx
```http
POST /api/testPayrexx
Content-Type: application/json

{
  "amount": 15000,
  "currency": "CHF",
  "purpose": "Test transaction"
}
```

### Análisis Financiero y Reportes

#### Obtener Datos Financieros de Curso
```http
POST /api/getCourseData
Content-Type: application/json

{
  "school_id": 1,
  "course_id": 10,
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}
```

#### Calcular Precios Totales (3 métodos diferentes)
```http
POST /api/calculateTotalPrices
Content-Type: application/json

{
  "method": 1,
  "school_id": 1,
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}
```

```http
GET /api/calculateTotalPrices1?school_id=1&method=alternative
```

### Procesamiento de Datos

#### Normalizar Estructura de Cursos
```http
POST /api/schools/{schoolId}/normalize-courses
Content-Type: application/json

{
  "fix_duplicates": true,
  "update_pricing": true,
  "recalculate_availability": true
}
```

## Modelos de Datos Principales

### BookingUser
```json
{
  "id": 789,
  "school_id": 1,
  "booking_id": 123,
  "client_id": 456,
  "accepted": true,
  "group_changed": false,
  "price": 150.00,
  "currency": "CHF",
  "course_subgroup_id": 15,
  "course_id": 10,
  "course_date_id": 50,
  "degree_id": 5,
  "course_group_id": 12,
  "monitor_id": 25,
  "group_id": "grp_123",
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "attended": false,
  "status": 1,
  "notes": "Client specific notes",
  "notes_school": "School internal notes",
  "color": "#FF5733",
  "duration": "03:00:00",
  "formattedDuration": "3h",
  "sport": "ski-collective"
}
```

### CourseDate
```json
{
  "id": 50,
  "course_id": 10,
  "date": "2025-01-20",
  "hour_start": "09:00",
  "hour_end": "12:00",
  "available_spots": 8,
  "booked_spots": 2,
  "monitor_id": 25,
  "weather_conditions": "Snow",
  "active": true
}
```

### MonitorNwd (Monitor Not Working Days)
```json
{
  "id": 100,
  "monitor_id": 25,
  "date": "2025-01-22",
  "hour_start": "09:00",
  "hour_end": "18:00",
  "reason": "Personal leave",
  "all_day": false,
  "recurring": false
}
```

### VouchersLog
```json
{
  "id": 300,
  "voucher_id": 200,
  "booking_id": 123,
  "amount_used": 25.00,
  "remaining_balance": 25.00,
  "used_at": "2025-01-15T10:30:00Z",
  "notes": "Partial voucher usage"
}
```

### EmailLog
```json
{
  "id": 400,
  "booking_id": 123,
  "recipient_email": "client@example.com",
  "subject": "Booking Confirmation",
  "template": "booking_confirmation",
  "language": "en",
  "status": "sent",
  "sent_at": "2025-01-15T10:32:00Z",
  "error_message": null
}
```

## Características Especiales

### 1. Soporte Multi-idioma
La API soporta contenido en múltiples idiomas:
- Español (es)
- Inglés (en) 
- Francés (fr)
- Alemán (de)
- Italiano (it)

### 2. Integración del Clima
Integración con API meteorológica para pronósticos de estaciones:
- Pronósticos de 12 horas
- Pronósticos de 5 días
- Condiciones actuales

### 3. Procesamiento de Pagos
Integración completa con Payrexx:
- Procesamiento de pagos
- Webhooks de notificación
- Manejo de reembolsos
- Múltiples métodos de pago

### 4. Sistema de Analíticas Avanzado
Sistema de reportes comprensivo:
- Analíticas en tiempo real
- Dashboards ejecutivos y operacionales
- Exportación multi-formato
- Consultas personalizadas
- Métricas de rendimiento

### 5. Sistema de Email
Notificaciones automatizadas:
- Confirmaciones de reservas
- Recordatorios de pagos
- Notificaciones de cancelación
- Plantillas personalizables por escuela

### 6. Sistema de Vouchers
Gestión completa de cupones:
- Códigos de descuento
- Vouchers prepagados
- Uso parcial de vouchers
- Historial de transacciones

### 7. Sistema de Evaluación
Seguimiento del progreso de clientes:
- Evaluaciones de habilidades
- Archivos adjuntos
- Objetivos cumplidos
- Seguimiento de progreso

### 8. Arquitectura Multi-tenant
Segregación de datos basada en escuelas:
- Datos aislados por escuela
- Configuraciones personalizables
- Usuarios específicos por escuela

## Ejemplos de Uso Completos

### Ejemplo 1: Crear una Reserva Completa

```javascript
// 1. Verificar disponibilidad
const availabilityResponse = await fetch('/api/availability', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-School-Slug': 'alpine-ski-school'
  },
  body: JSON.stringify({
    course_id: 10,
    date: '2025-01-20',
    participants: 2
  })
});

if (availabilityResponse.data.available) {
  // 2. Crear la reserva
  const bookingResponse = await fetch('/api/slug/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-School-Slug': 'alpine-ski-school'
    },
    body: JSON.stringify({
      client_main_id: 456,
      course_id: 10,
      date: '2025-01-20',
      hour_start: '09:00',
      hour_end: '12:00',
      participants: [
        { client_id: 456, degree_id: 5 },
        { client_id: 457, degree_id: 3 }
      ],
      monitor_id: 25,
      payment_method_id: 3,
      has_cancellation_insurance: true,
      voucher_code: 'SUMMER2025'
    })
  });

  // 3. Procesar el pago
  if (bookingResponse.success) {
    const paymentResponse = await fetch(`/api/slug/bookings/payments/${bookingResponse.data.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-School-Slug': 'alpine-ski-school'
      },
      body: JSON.stringify({
        payment_method: 'card',
        amount: bookingResponse.data.price_total,
        payrexx_token: 'token_from_payrexx_widget'
      })
    });
  }
}
```

### Ejemplo 2: Obtener Analíticas del Dashboard

```javascript
// Obtener resumen de analíticas
const analyticsResponse = await fetch('/api/admin/analytics/summary?school_id=1&period=month', {
  headers: {
    'Authorization': 'Bearer your-admin-token',
    'Accept': 'application/json'
  }
});

// Obtener analíticas de cursos
const coursesAnalytics = await fetch('/api/admin/analytics/courses?school_id=1&course_type=1', {
  headers: {
    'Authorization': 'Bearer your-admin-token',
    'Accept': 'application/json'
  }
});

// Exportar datos a Excel
const exportResponse = await fetch('/api/admin/analytics/export/excel', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-admin-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    school_id: 1,
    report_type: 'revenue',
    start_date: '2025-01-01',
    end_date: '2025-01-31',
    include_charts: true
  })
});
```

### Ejemplo 3: Gestión de Clientes con Paginación

```javascript
// Obtener lista paginada de clientes
const clientsResponse = await fetch('/api/clients?page=1&perPage=20&search=alice&with[]=clientSports&orderColumn=first_name&order=asc', {
  headers: {
    'Accept': 'application/json'
  }
});

// Crear nuevo cliente
const newClientResponse = await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    email: 'nuevo@example.com',
    first_name: 'Juan',
    last_name: 'Pérez',
    birth_date: '1985-06-20',
    phone: '+41 79 123 45 67',
    address: 'Hauptstrasse 123',
    city: 'Zurich',
    country: 'Switzerland',
    language1_id: 1,
    emergency_contact_name: 'Maria Pérez',
    emergency_contact_phone: '+41 79 987 65 43'
  })
});

// Actualizar cliente existente
const updateClientResponse = await fetch('/api/clients/456', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    phone: '+41 79 999 88 77',
    notes: 'Cliente VIP actualizado'
  })
});
```

## Notas de Implementación para Angular

### 1. Manejo de Autenticación
```typescript
// Servicio de autenticación
@Injectable()
export class AuthService {
  private token$ = new BehaviorSubject<string | null>(null);
  
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/admin/login', credentials)
      .pipe(
        tap(response => {
          this.token$.next(response.data.token);
          localStorage.setItem('token', response.data.token);
        })
      );
  }
  
  getAuthHeaders(): HttpHeaders {
    const token = this.token$.value;
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }
}
```

### 2. Interceptor para Headers Automáticos
```typescript
@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authReq = req.clone({
      headers: req.headers
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
    });
    
    return next.handle(authReq);
  }
}
```

### 3. Tipos TypeScript
```typescript
export interface BookingResponse {
  success: boolean;
  data: Booking;
  message: string;
}

export interface Booking {
  id: number;
  school_id: number;
  client_main_id: number;
  price_total: number;
  currency: string;
  status: number;
  grouped_activities: GroupedActivity[];
  // ... otros campos
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  message: string;
}
```

### 4. Manejo de Errores
```typescript
@Injectable()
export class ErrorHandlerService {
  handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Log del error
    console.error('API Error:', error);
    
    // Mostrar mensaje al usuario
    this.snackBar.open(errorMessage, 'Cerrar', { duration: 5000 });
    
    return throwError(() => new Error(errorMessage));
  }
}
```

Esta documentación proporciona una guía completa para integrar tu aplicación Angular con la API de Boukii. Incluye todos los endpoints disponibles, estructuras de datos, ejemplos de uso y mejores prácticas para la implementación.
