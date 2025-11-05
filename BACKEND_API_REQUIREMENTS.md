# Requerimientos de API para Backend - Pantalla de Comunicaciones

Este documento especifica los endpoints que el backend debe implementar para la funcionalidad de la pantalla de comunicaciones.

## Endpoints Requeridos

### 1. Estadísticas de Suscriptores

**Endpoint:** `GET /admin/newsletters/subscriber-stats`

**Descripción:** Retorna estadísticas de suscriptores para mostrar en el modal de gestión de suscriptores.

**Respuesta Esperada:**
```json
{
  "success": true,
  "data": {
    "active": 5,           // Número de suscriptores activos (clientes con accepts_newsletter = true o activos en últimos 3 meses)
    "inactive": 0,         // Número de suscriptores inactivos
    "vip": 2,             // Número de suscriptores VIP (clientes con reservas recientes)
    "total": 82           // Total de suscriptores (active + inactive)
  }
}
```

**Notas:**
- Los números deben ser calculados correctamente desde la tabla de clientes
- `active`: Clientes que tienen `accepts_newsletter = true` O han tenido actividad en los últimos 3 meses
- `inactive`: Clientes que tienen `accepts_newsletter = false` Y no han tenido actividad reciente
- `vip`: Clientes que tienen `is_vip = true` O han realizado reservas en los últimos 30 días

**Estado Actual:** ❌ No implementado - Actualmente retorna números incorrectos (1993 activos, -1984 inactivos)

---

### 2. Lista de Suscriptores por Tipo

**Endpoint:** `GET /admin/newsletters/subscribers?type={type}`

**Parámetros Query:**
- `type` (string, requerido): Tipo de suscriptores a listar
  - Valores posibles: `all`, `active`, `inactive`, `vip`

**Descripción:** Retorna lista de suscriptores filtrada por tipo.

**Respuesta Esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Juan Pérez",              // O usar first_name + last_name
      "first_name": "Juan",
      "last_name": "Pérez",
      "email": "juan@email.com",
      "active": true,                    // true si accepts_newsletter o tuvo actividad reciente
      "accepts_newsletter": true,
      "vip": false,                      // O is_vip
      "is_vip": false,
      "created_at": "2024-01-15T10:30:00Z",
      "subscribed_at": "2024-01-15T10:30:00Z"  // Fecha en que se suscribió al newsletter
    },
    {
      "id": 2,
      "name": "María García",
      "first_name": "María",
      "last_name": "García",
      "email": "maria@email.com",
      "active": true,
      "accepts_newsletter": true,
      "vip": true,
      "is_vip": true,
      "created_at": "2024-02-01T14:20:00Z",
      "subscribed_at": "2024-02-05T09:15:00Z"
    }
  ]
}
```

**Filtros por Tipo:**
- `type=all`: Todos los clientes que tienen `accepts_newsletter = true`
- `type=active`: Clientes con `accepts_newsletter = true` Y han tenido actividad en últimos 3 meses
- `type=inactive`: Clientes con `accepts_newsletter = true` PERO sin actividad reciente
- `type=vip`: Clientes con `is_vip = true` O con reservas recientes

**Estado Actual:** ❌ No implementado - Frontend tiene fallback que carga `/admin/clients` y filtra en frontend

---

### 3. Exportar Suscriptores a CSV

**Endpoint:** `GET /admin/subscribers/export`

**Descripción:** Exporta la lista completa de suscriptores a un archivo CSV.

**Headers de Respuesta:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="subscribers_YYYY-MM-DD.csv"
```

**Contenido del CSV:**
```csv
ID,Nombre,Email,Estado,VIP,Fecha de Registro,Última Actividad
1,Juan Pérez,juan@email.com,Activo,No,2024-01-15,2024-11-01
2,María García,maria@email.com,Activo,Sí,2024-02-01,2024-11-04
3,Pedro López,pedro@email.com,Inactivo,No,2024-01-20,2024-06-15
```

**Columnas Requeridas:**
1. `ID`: ID del cliente
2. `Nombre`: Nombre completo del cliente
3. `Email`: Email del cliente
4. `Estado`: "Activo" o "Inactivo"
5. `VIP`: "Sí" o "No"
6. `Fecha de Registro`: Fecha de creación de la cuenta
7. `Última Actividad`: Fecha de última reserva o interacción

**Formato de Fechas:** `YYYY-MM-DD` (ISO 8601)

**Estado Actual:** ❌ No implementado - La ruta no existe en el backend

---

## Endpoints Alternativos (Fallback)

Si los endpoints específicos de newsletters no pueden implementarse inmediatamente, el frontend puede usar:

### Fallback 1: Cargar lista de clientes
**Endpoint Existente:** `GET /admin/clients`

El frontend puede filtrar y calcular stats localmente si retorna:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Cliente 1",
      "email": "cliente1@email.com",
      "active": true,
      "accepts_newsletter": true,
      "vip": false,
      "created_at": "2024-01-15T10:30:00Z",
      "last_booking_date": "2024-11-01T15:00:00Z"
    }
  ]
}
```

---

## Prioridad de Implementación

1. **Alta Prioridad:**
   - `GET /admin/newsletters/subscriber-stats` - Arreglar números incorrectos
   - `GET /admin/newsletters/subscribers?type={type}` - Para funcionalidad "Ver lista"

2. **Media Prioridad:**
   - `GET /admin/subscribers/export` - Para exportar a CSV

---

## Notas Adicionales

- Todos los endpoints deben retornar datos de la escuela del usuario autenticado (filtrar por `school_id`)
- Los endpoints deben soportar autenticación via token Bearer
- Los cálculos de "activo" vs "inactivo" deben ser consistentes en todos los endpoints
- Las fechas deben retornarse en formato ISO 8601 con timezone

---

## Problemas Actuales Detectados

1. **Números incorrectos en stats:**
   - Se muestra: 1993 activos, -1984 inactivos
   - Debería mostrar: números basados en la cantidad real de clientes (5 clientes, 77 monitores mencionados)

2. **Endpoint `/admin/clients/stats` no existe o retorna datos incorrectos**

3. **Endpoint `/admin/subscribers/export` no existe**

---

**Fecha de Creación:** 2025-11-05
**Actualizado Por:** Claude Code Assistant
