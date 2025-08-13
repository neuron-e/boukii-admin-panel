# Frontend API Usage Documentation - Boukii Admin Panel

Este documento describe todos los endpoints API que consume el frontend Angular y las estructuras de datos que maneja.

## Configuración Base

### Base URL
- **Desarrollo**: `https://dev.api.boukii.com/api`
- **Producción**: Se configura en `environment.prod.ts`

### Autenticación
- **Método**: Bearer Token
- **Header**: `Authorization: Bearer {token}`
- **Storage**: Token almacenado en `localStorage` como `boukiiUserToken`

### Formato de Respuesta Estándar
```typescript
interface ApiResponse {
    data: any;
    success: boolean;
    message: string;
}
```

## Endpoints por Funcionalidad

### 1. Autenticación

#### Login de Administrador
- **Endpoint**: `POST /admin/login`
- **Request**:
```typescript
{
    email: string;
    password: string;
}
```
- **Response**:
```typescript
{
    data: {
        user: UserObject;
        token: string;
    }
}
```
- **Servicio**: `AuthService`

### 2. Gestión de Escuelas

#### Obtener datos de escuela
- **Endpoint**: `GET /schools/{id}`
- **Headers**: Bearer token requerido
- **Response**: Datos completos de la escuela
- **Servicio**: `SchoolService`

### 3. Idiomas

#### Listar idiomas
- **Endpoint**: `GET /languages`
- **Query Params**: `perPage=1000&page=1`
- **Response**: Lista paginada de idiomas disponibles
- **Servicio**: `LangService`

### 4. Operaciones CRUD Genéricas

#### Listar entidades (paginado)
- **Endpoint**: `GET /{model}`
- **Query Params**:
  - `perPage`: Número de registros por página
  - `page`: Página actual
  - `order`: `asc` o `desc`
  - `orderColumn`: Columna para ordenar
  - `search`: Término de búsqueda
  - `exclude`: IDs a excluir
  - `with[]`: Relaciones a incluir
  - Filtros específicos por modelo
- **Servicio**: `ApiCrudService.list()`

#### Obtener todos los registros
- **Endpoint**: `GET /{model}/all`
- **Servicio**: `ApiCrudService.getAll()`

#### Obtener por ID
- **Endpoint**: `GET /{model}/{id}`
- **Servicio**: `ApiCrudService.getById()`

#### Crear registro
- **Endpoint**: `POST /{model}`
- **Request**: Objeto con datos del modelo
- **Servicio**: `ApiCrudService.create()`

#### Actualizar registro
- **Endpoint**: `PUT /{model}/{id}`
- **Request**: Objeto con datos actualizados
- **Servicio**: `ApiCrudService.update()`

#### Actualización masiva
- **Endpoint**: `PUT /{model}/multiple`
- **Request**: Array de objetos con IDs y datos
- **Servicio**: `ApiCrudService.massiveUpdate()`

#### Eliminar registro
- **Endpoint**: `DELETE /{model}/{id}`
- **Servicio**: `ApiCrudService.delete()`

#### Restaurar registro eliminado
- **Endpoint**: `POST /{model}/{id}/restore`
- **Servicio**: `ApiCrudService.restore()`

### 5. Traducción

#### Traducir texto
- **Endpoint**: `POST /translate`
- **Request**:
```typescript
{
    text: string;
    target_lang: string;
}
```
- **Servicio**: `ApiCrudService.translate()`

### 6. Gestión de Reservas

Los nuevos servicios de la API V3 exponen endpoints adicionales para gestionar
reservas con filtros y creación inteligente:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET`  | `/bookings` | Listar reservas con filtros y paginación |
| `GET`  | `/bookings/kpis` | Métricas resumidas de reservas |
| `POST` | `/bookings` | Crear una reserva tradicional |
| `POST` | `/bookings/smart-create` | Crear reserva con lógica inteligente |
| `PATCH` | `/bookings/{id}` | Actualizar datos parciales de una reserva |
| `POST` | `/bookings/{id}/cancel` | Cancelar una reserva existente |
| `GET`  | `/clients/smart-search` | Búsqueda avanzada de clientes |
| `POST` | `/pricing/calculate-dynamic` | Calcular precio dinámico |

#### Ejemplo de creación de reserva inteligente
```http
POST /bookings/smart-create
{
  "client_id": 1,
  "course_id": 2,
  "dates": ["2024-01-05"],
  "participants": 2
}
```

#### Ejemplo de cancelación
```http
POST /bookings/123/cancel
{
  "reason": "client_request",
  "notifyClient": true
}
```

#### Crear log de reserva
- **Endpoint**: `POST /booking-logs`
- **Request**:
```typescript
interface BookingLog {
    booking_id: number;
    action: string;
    description?: string;
    before_change: string;
    user_id: number;
    school_id?: number;
    reason?: string;
}
```

#### Crear pago
- **Endpoint**: `POST /payments`
- **Request**:
```typescript
interface Payment {
    booking_id: number;
    school_id: number;
    amount: number;
    status: string;
    notes: string;
}
```

#### Actualizar usuario de reserva
- **Endpoint**: `PUT /booking-users`
- **Request**: Datos del usuario de reserva con status actualizado

#### Cancelar usuarios de reserva
- **Endpoint**: `POST /admin/bookings/cancel`
- **Request**: Array de IDs de usuarios de reserva

#### Procesar reembolso
- **Endpoint**: `POST /admin/bookings/refunds/{bookingId}`
- **Request**: Datos del reembolso

#### Crear voucher
- **Endpoint**: `POST /vouchers`
- **Request**:
```typescript
interface VoucherData {
    code: string;
    quantity: number;
    remaining_balance: number;
    payed: boolean;
    client_id: number;
    school_id: number;
}
```

#### Crear log de voucher
- **Endpoint**: `POST /vouchers-logs`

#### Actualizar estado de reserva
- **Endpoint**: `PUT /bookings`
- **Request**: Objeto de reserva con status actualizado

**Servicio**: `BookingService`

#### Wizard Inteligente V3
- **Crear reserva inteligente**: `POST /bookings/smart-create`
- **Guardar borrador**: `POST /bookings/drafts`
- **Validar paso**: `POST /bookings/validate-step`
- **Obtener sugerencias**: `GET /ai/smart-suggestions`
- **Detectar conflictos**: `POST /bookings/detect-conflicts`

### 7. Analytics Profesional

#### Dashboard de temporada
- **Endpoint**: `GET /admin/finance/season-dashboard`
- **Query Params**: Filtros de analytics
- **Response**: `SeasonDashboard` interface
- **Incluye**: KPIs ejecutivos, fuentes de reserva, métodos de pago, métricas financieras

#### Análisis de ingresos por período
- **Endpoint**: `GET /admin/analytics/revenue-by-period`
- **Query Params**: Filtros + `period_type` (daily/weekly/monthly)
- **Response**: `RevenueByPeriod` interface

#### Analytics detallado de cursos
- **Endpoint**: `GET /admin/analytics/courses-detailed`
- **Response**: `CourseAnalytics` interface
- **Incluye**: Datos por curso, rentabilidad, tasas de finalización

#### Eficiencia de monitores
- **Endpoint**: `GET /admin/analytics/monitors-efficiency`
- **Response**: `MonitorAnalytics` interface

#### Análisis de conversión
- **Endpoint**: `GET /admin/analytics/conversion-analysis`
- **Response**: `ConversionAnalysis` interface

#### Predicciones y tendencias
- **Endpoint**: `GET /admin/analytics/trends-prediction`
- **Query Params**: Período de predicción
- **Response**: Datos de tendencias futuras

#### Métricas en tiempo real
- **Endpoint**: `GET /admin/analytics/realtime-metrics`
- **Response**: `RealtimeMetrics` interface

#### Analytics diario de monitor
- **Endpoint**: `GET /admin/analytics/monitors/{id}/daily`
- **Query Params**: Rango de fechas

#### Rendimiento de monitor
- **Endpoint**: `GET /admin/analytics/monitors/{id}/performance`
- **Query Params**: Período de análisis

#### Dashboard de exportación
- **Endpoint**: `GET /admin/finance/export-dashboard`
- **Response**: Datos para dashboard de finanzas

#### Exportar resumen ejecutivo
- **Endpoint**: `POST /admin/analytics/export/executive-summary`
- **Request**: `ExportOptions` interface
- **Response**: Archivo generado

#### Exportar análisis detallado
- **Endpoint**: `POST /admin/analytics/export/detailed-analysis`
- **Request**: `ExportOptions` interface
- **Response**: Archivo generado

#### Descargar exportación
- **Endpoint**: `GET /admin/finance/download-export/{filename}`
- **Response**: Archivo para descarga

#### Gestión de preferencias
- **Endpoint**: `GET /admin/analytics/preferences`
- **Endpoint**: `POST /admin/analytics/preferences`
- **Request/Response**: `AnalyticsPreferences` interface

#### Gestión de alertas
- **Endpoint**: `GET /admin/analytics/alerts`
- **Endpoint**: `POST /admin/analytics/alerts`
- **Endpoint**: `DELETE /admin/analytics/alerts/{id}`
- **Interface**: `AnalyticsAlert`

#### Comparar períodos
- **Endpoint**: `POST /admin/analytics/compare-periods`
- **Request**: Dos rangos de fechas para comparar

#### Datos de benchmark
- **Endpoint**: `GET /admin/analytics/benchmarks`
- **Response**: Datos comparativos del sector

#### Gestión de caché
- **Endpoint**: `DELETE /admin/analytics/cache/clear`
- **Endpoint**: `GET /admin/analytics/cache/status`

**Servicio**: `AnalyticsProfessionalService`

### 8. Exportación de Analytics

#### Exportar dashboard
- **Endpoint**: `POST /admin/analytics/export/dashboard`
- **Request**: `ExportOptions`

#### Exportar resumen ejecutivo
- **Endpoint**: `POST /admin/analytics/export/executive-summary`
- **Request**: `ExportOptions`

#### Exportar análisis detallado
- **Endpoint**: `POST /admin/analytics/export/detailed-analysis`
- **Request**: `ExportOptions`

#### Descargar archivo exportado
- **Endpoint**: `GET /admin/finance/download-export/{filename}`

**Servicio**: `AnalyticsExportService`

### 9. Sistema de Correo

#### Listar correos
- **Endpoint**: `GET /mails`
- **Query Params**: 
  - `perPage=1000&page=1`
  - `order=desc&orderColumn=id`
  - `school_id` (filtro)
- **Response**: Lista paginada de correos

#### Listar logs de email
- **Endpoint**: `GET /email-logs`
- **Query Params**:
  - `perPage=10000&page=1`
  - `order=desc&orderColumn=id`
  - `school_id` (filtro)
- **Response**: Lista de logs de envío

**Servicio**: `MailService`

## Interfaces TypeScript Principales

### Filtros de Analytics
```typescript
export interface AnalyticsFilters {
  school_id: number;
  start_date?: string;
  end_date?: string;
  season_id?: number;
  course_type?: number;
  source?: string;
  sport_id?: number;
  only_weekends?: boolean;
  optimization_level?: 'fast' | 'balanced' | 'detailed';
  include_test_detection?: boolean;
  include_payrexx_analysis?: boolean;
}
```

### KPIs Ejecutivos
```typescript
export interface ExecutiveKpis {
  totalBookings: number;
  totalClients: number;
  totalParticipants: number;
  revenueExpected: number;
  revenueReceived: number;
  revenuePending: number;
  collectionEfficiency: number;
  consistencyRate: number;
  averageBookingValue: number;
}
```

### Datos de Reserva para Creación
```typescript
export interface BookingCreateData {
  school_id: number;
  client_main_id: number;
  user_id: number;
  price_total: number;
  has_cancellation_insurance: boolean;
  has_boukii_care: boolean;
  has_reduction: boolean;
  has_tva: boolean;
  price_cancellation_insurance: number;
  price_reduction: number;
  price_boukii_care: number;
  price_tva: number;
  source: 'admin';
  payment_method_id: number | null;
  selectedPaymentOption: string | null;
  paid_total: number;
  paid: boolean;
  notes: string;
  notes_school: string;
  paxes: number;
  status: number;
  color: string;
  vouchers: any[];
  reduction: any;
  basket: any[] | null;
  cart: any[] | null;
}
```

### Opciones de Exportación
```typescript
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  sections?: string[];
  includeCharts?: boolean;
  includeRawData?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}
```

## Patrones de Uso Comunes

### Paginación Estándar
```typescript
{
  perPage: number;
  page: number;
  order: 'asc' | 'desc';
  orderColumn: string;
  search?: string;
}
```

### Filtros por Escuela
Todos los endpoints incluyen `school_id` como parámetro de filtro para multi-tenancy.

### Relaciones (Eager Loading)
Se usa el parámetro `with[]` para cargar relaciones:
```
GET /courses?with[]=monitors&with[]=sport&with[]=level
```

### Manejo de Errores
- Códigos HTTP estándar
- Respuestas siempre incluyen `success` boolean
- Mensajes de error en el campo `message`

### Caché
- Analytics tienen sistema de caché integrado
- Endpoints de gestión de caché disponibles
- TTL configurable por tipo de datos

## Consideraciones para el Backend Laravel

### Autenticación
- Implementar middleware de autenticación Bearer token
- Validar tokens JWT en cada request protegido
- Gestionar expiración y renovación de tokens

### Paginación
- Usar `LengthAwarePaginator` de Laravel
- Responder con meta información de paginación
- Soportar parámetros de ordenamiento dinámico

### Filtros
- Implementar filtros mediante query scopes
- Validar parámetros de filtro
- Optimizar queries para filtros complejos

### Relaciones
- Soportar eager loading con `with[]` parameters
- Optimizar N+1 queries
- Validar relaciones permitidas

### Validación
- Usar Form Requests para validación
- Validar todas las interfaces TypeScript definidas
- Retornar errores de validación en formato consistente

### Performance
- Implementar caché Redis para analytics
- Usar database indexes apropiados
- Considerar queue jobs para exportaciones pesadas

### Multi-tenancy
- Filtrar todos los datos por `school_id`
- Implementar middleware de tenant isolation
- Validar permisos por escuela