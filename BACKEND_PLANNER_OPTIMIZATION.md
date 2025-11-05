# Optimización del API Planner - Reducción de Datos Frontend

**Fecha:** 2025-11-05
**Endpoint:** `/admin/getPlanner`
**Problema:** Con 77 monitores, el endpoint envía entre 30-60 MB de datos
**Objetivo:** Reducir la carga a ~2-5 MB máximo
**Reducción esperada:** 85-90% del tamaño actual

---

## Resumen Ejecutivo

### Hallazgos Críticos

1. **Datos no utilizados:** ~80% de los datos enviados no se usan en el frontend
2. **Relaciones innecesarias:** Se cargan objetos completos cuando solo se necesitan IDs
3. **Datos duplicados:** Información repetida en múltiples niveles de la estructura
4. **Overfetching masivo:** Se envían +50 campos cuando solo se usan 10-15

### Impacto Actual (77 monitores)

| Componente | Tamaño Actual | Tamaño Objetivo | Reducción |
|------------|---------------|-----------------|-----------|
| Monitors | ~15-20 MB | ~2-3 MB | 85% |
| Booking Users | ~10-15 MB | ~1-2 MB | 90% |
| Courses | ~8-12 MB | ~1-2 MB | 87% |
| **TOTAL** | **30-60 MB** | **4-7 MB** | **~88%** |

---

## 1. ESTRUCTURA DE DATOS ACTUAL vs OPTIMIZADA

### 1.1 Monitor Object

**ACTUAL (20+ campos enviados):**
```json
{
  "id": 123,
  "first_name": "Juan",
  "last_name": "García",
  "email": "juan@example.com",
  "phone": "+34123456789",
  "image": "https://...",
  "language1_id": 1,
  "language2_id": 2,
  "language3_id": 3,
  "created_at": "2024-01-01 10:00:00",
  "updated_at": "2024-05-01 15:30:00",
  "dni": "12345678A",
  "address": "Calle Principal 123",
  "city": "Madrid",
  "postal_code": "28001",
  "birth_date": "1990-05-15",
  "iban": "ES1234567890...",
  "notes": "...",
  "hasFullDayNwd": false,
  "sports": [
    {
      "id": 5,
      "name": "Esquí Alpino",
      "icon": "...",
      "icon_selected": "...",
      "created_at": "...",
      "updated_at": "...",
      "pivot": {
        "monitor_id": 123,
        "sport_id": 5,
        "created_at": "...",
        "updated_at": "..."
      },
      "authorizedDegrees": [
        {
          "id": 789,
          "monitor_sport_id": 456,
          "degree_id": 3,
          "created_at": "...",
          "updated_at": "...",
          "degree": {
            "id": 3,
            "name": "Nivel 3",
            "annotation": "N3",
            "color": "#FF5733",
            "sport_id": 5,
            "created_at": "...",
            "updated_at": "...",
            "order": 3
          }
        }
      ]
    }
  ]
}
```

**OPTIMIZADO (12 campos necesarios):**
```json
{
  "id": 123,
  "first_name": "Juan",
  "last_name": "García",
  "email": "juan@example.com",
  "phone": "+34123456789",
  "image": "https://...",
  "language1_id": 1,
  "language2_id": 2,
  "language3_id": 3,
  "hasFullDayNwd": false,
  "sports": [
    {
      "id": 5,
      "name": "Esquí Alpino",
      "icon_selected": "...",
      "authorizedDegrees": [
        {
          "degree_id": 3
        }
      ]
    }
  ]
}
```

**Campos a ELIMINAR:**
- `created_at`, `updated_at` (monitor y relaciones)
- `dni`, `address`, `city`, `postal_code`, `birth_date`, `iban`, `notes`
- `sports[].icon` (solo necesita `icon_selected`)
- `sports[].pivot` completo
- `sports[].authorizedDegrees[].id`, `monitor_sport_id`
- `sports[].authorizedDegrees[].degree` objeto completo (solo necesita `degree_id`)

**Reducción:** ~65% por monitor

---

### 1.2 Booking Users (bookings)

**ACTUAL (50+ campos por booking):**
```json
{
  "id": 456,
  "booking_id": 789,
  "client_id": 111,
  "course_id": 222,
  "course_date_id": 333,
  "course_subgroup_id": 444,
  "monitor_id": 123,
  "date": "2025-01-15",
  "hour_start": "10:00:00",
  "hour_end": "12:00:00",
  "status": 1,
  "accepted": true,
  "degree_id": 3,
  "color": "green",
  "group_id": 555,
  "subgroup_number": 2,
  "total_subgroups": 5,
  "created_at": "...",
  "updated_at": "...",
  "deleted_at": null,
  "booking": {
    "id": 789,
    "user_id": 999,
    "school_id": 1,
    "status": 1,
    "paid": true,
    "created_at": "...",
    "updated_at": "...",
    "confirmation_code": "ABC123",
    "payment_method": "card",
    "total_amount": 150.00,
    "discount": 0,
    "notes": "...",
    "user": {
      "id": 999,
      "email": "user@example.com",
      "first_name": "María",
      "last_name": "López",
      "phone": "+34987654321",
      "created_at": "...",
      "updated_at": "...",
      "roles": [...],
      "permissions": [...]
    }
  },
  "client": {
    "id": 111,
    "first_name": "Pedro",
    "last_name": "Martínez",
    "birth_date": "2010-03-20",
    "language1_id": 1,
    "language2_id": null,
    "created_at": "...",
    "updated_at": "...",
    "email": "...",
    "phone": "...",
    "address": "...",
    "city": "...",
    "country": "...",
    "postal_code": "...",
    "notes": "...",
    "sports": [...]
  },
  "course": {
    "id": 222,
    "school_id": 1,
    "name": "Curso Esquí Principiantes",
    "sport_id": 5,
    "course_type": 1,
    "max_participants": 8,
    "date_start": "2025-01-10",
    "date_end": "2025-01-20",
    "price": 150.00,
    "description": "...",
    "image": "...",
    "active": 1,
    "created_at": "...",
    "updated_at": "...",
    "duration": "2h",
    "level": "beginner",
    "requirements": "...",
    "course_dates": [
      {
        "id": 333,
        "course_id": 222,
        "date": "2025-01-15",
        "hour_start": "10:00:00",
        "hour_end": "12:00:00",
        "active": 1,
        "created_at": "...",
        "updated_at": "...",
        "course_groups": [...]
      }
    ],
    "booking_users_active": [...]
  },
  "booking_users": [...]
}
```

**OPTIMIZADO (25 campos necesarios):**
```json
{
  "id": 456,
  "booking_id": 789,
  "client_id": 111,
  "course_id": 222,
  "course_date_id": 333,
  "course_subgroup_id": 444,
  "monitor_id": 123,
  "date": "2025-01-15",
  "hour_start": "10:00:00",
  "hour_end": "12:00:00",
  "status": 1,
  "accepted": true,
  "degree_id": 3,
  "color": "green",
  "group_id": 555,
  "subgroup_number": 2,
  "total_subgroups": 5,
  "booking": {
    "id": 789,
    "created_at": "2025-01-10 09:00:00",
    "paid": true,
    "user": {
      "id": 999,
      "first_name": "María",
      "last_name": "López"
    }
  },
  "client": {
    "id": 111,
    "first_name": "Pedro",
    "last_name": "Martínez",
    "birth_date": "2010-03-20",
    "language1_id": 1
  },
  "course": {
    "id": 222,
    "name": "Curso Esquí Principiantes",
    "sport_id": 5,
    "course_type": 1,
    "max_participants": 8,
    "date_start": "2025-01-10",
    "date_end": "2025-01-20",
    "course_dates": [
      {
        "id": 333,
        "date": "2025-01-15",
        "hour_start": "10:00:00",
        "hour_end": "12:00:00"
      }
    ]
  }
}
```

**Campos a ELIMINAR de booking:**
- `created_at`, `updated_at`, `deleted_at`
- `booking.school_id`, `booking.status`, `booking.confirmation_code`, `booking.payment_method`, `booking.total_amount`, `booking.discount`, `booking.notes`
- `booking.user` completo (solo necesita `id`, `first_name`, `last_name`)

**Campos a ELIMINAR de client:**
- `created_at`, `updated_at`
- `email`, `phone`, `address`, `city`, `country`, `postal_code`, `notes`
- `language2_id` (solo se usa `language1_id`)
- `sports` array completo

**Campos a ELIMINAR de course:**
- `school_id`, `price`, `description`, `image`, `active`, `created_at`, `updated_at`, `duration`, `level`, `requirements`
- `course_dates[].created_at`, `course_dates[].updated_at`, `course_dates[].active`
- `course_dates[].course_groups` (no se usa)
- `booking_users_active` (no se usa en timeline)

**Reducción:** ~80% por booking

---

### 1.3 NWDs (Non-Working Days)

**ACTUAL:**
```json
{
  "id": 100,
  "monitor_id": 123,
  "school_id": 1,
  "start_date": "2025-01-15",
  "end_date": "2025-01-15",
  "hour_start": "10:00:00",
  "hour_end": "14:00:00",
  "full_day": false,
  "user_nwd_subtype_id": 1,
  "notes": "Dentista",
  "created_at": "...",
  "updated_at": "...",
  "deleted_at": null,
  "user_nwd_subtype": {
    "id": 1,
    "name": "Personal",
    "color": "#FF0000",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**OPTIMIZADO:**
```json
{
  "id": 100,
  "monitor_id": 123,
  "start_date": "2025-01-15",
  "end_date": "2025-01-15",
  "hour_start": "10:00:00",
  "hour_end": "14:00:00",
  "full_day": false,
  "user_nwd_subtype_id": 1,
  "name": "Dentista"
}
```

**Campos a ELIMINAR:**
- `school_id`, `created_at`, `updated_at`, `deleted_at`, `notes`
- `user_nwd_subtype` objeto completo (solo necesita el `id`)

**Reducción:** ~60% por NWD

---

## 2. IMPLEMENTACIÓN EN LARAVEL

### 2.1 Método Optimizado: `performPlannerQuery()`

**Ubicación:** `app/Http/Controllers/Admin/PlannerController.php`

```php
public function performPlannerQuery($dateStart, $dateEnd, $schoolId, $monitorIds = null)
{
    // === PARTE 1: MONITORS ===

    $monitorsQuery = Monitor::query()
        ->select([
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'image',
            'language1_id',
            'language2_id',
            'language3_id'
        ])
        ->where('school_id', $schoolId)
        ->with([
            'sports' => function($query) {
                $query->select([
                    'sports.id',
                    'sports.name',
                    'sports.icon_selected'
                ]);
            },
            'sports.authorizedDegrees' => function($query) use ($schoolId) {
                $query->select([
                    'monitor_sport_authorized_degrees.degree_id',
                    'monitor_sport_authorized_degrees.monitor_sport_id'
                ])
                ->whereHas('monitorSport', function($q) use ($schoolId) {
                    $q->where('school_id', $schoolId);
                });
            }
        ]);

    // Full Day NWDs - Batch loading
    $fullDayNwds = MonitorNwd::select(['monitor_id', 'start_date', 'end_date'])
        ->where('school_id', $schoolId)
        ->where('full_day', true)
        ->where('start_date', '<=', $dateEnd)
        ->where('end_date', '>=', $dateStart)
        ->get()
        ->groupBy('monitor_id');

    if ($monitorIds) {
        $monitorsQuery->whereIn('id', $monitorIds);
    }

    $monitors = $monitorsQuery->get();

    // Add hasFullDayNwd flag efficiently
    $monitors->transform(function ($monitor) use ($fullDayNwds, $dateStart, $dateEnd) {
        $daysWithinRange = $this->getDatesInRange($dateStart, $dateEnd);
        $monitor->hasFullDayNwd = false;

        if (isset($fullDayNwds[$monitor->id])) {
            foreach ($fullDayNwds[$monitor->id] as $nwd) {
                foreach ($daysWithinRange as $day) {
                    if ($day >= $nwd->start_date && $day <= $nwd->end_date) {
                        $monitor->hasFullDayNwd = true;
                        break 2;
                    }
                }
            }
        }

        return $monitor;
    });

    // === PARTE 2: BOOKINGS ===

    $bookingsQuery = BookingUser::query()
        ->select([
            'booking_users.id',
            'booking_users.booking_id',
            'booking_users.client_id',
            'booking_users.course_id',
            'booking_users.course_date_id',
            'booking_users.course_subgroup_id',
            'booking_users.monitor_id',
            'booking_users.date',
            'booking_users.hour_start',
            'booking_users.hour_end',
            'booking_users.status',
            'booking_users.accepted',
            'booking_users.degree_id',
            'booking_users.color',
            'booking_users.group_id',
            'booking_users.subgroup_number',
            'booking_users.total_subgroups'
        ])
        ->join('bookings', 'booking_users.booking_id', '=', 'bookings.id')
        ->where('booking_users.school_id', $schoolId)
        ->where('bookings.status', '!=', 2) // Not cancelled
        ->whereBetween('booking_users.date', [$dateStart, $dateEnd])
        ->with([
            // Booking minimal
            'booking' => function($query) {
                $query->select([
                    'id',
                    'created_at',
                    'paid',
                    'user_id'
                ]);
            },
            'booking.user' => function($query) {
                $query->select([
                    'id',
                    'first_name',
                    'last_name'
                ]);
            },
            // Client minimal
            'client' => function($query) {
                $query->select([
                    'id',
                    'first_name',
                    'last_name',
                    'birth_date',
                    'language1_id'
                ]);
            },
            // Course minimal
            'course' => function($query) {
                $query->select([
                    'id',
                    'name',
                    'sport_id',
                    'course_type',
                    'max_participants',
                    'date_start',
                    'date_end'
                ]);
            },
            'course.courseDates' => function($query) use ($dateStart, $dateEnd) {
                $query->select([
                    'id',
                    'course_id',
                    'date',
                    'hour_start',
                    'hour_end'
                ])
                ->whereBetween('date', [$dateStart, $dateEnd]);
            }
        ]);

    if ($monitorIds) {
        $bookingsQuery->whereIn('booking_users.monitor_id', $monitorIds);
    }

    $bookings = $bookingsQuery->get();

    // === PARTE 3: NWDs ===

    $nwdsQuery = MonitorNwd::query()
        ->select([
            'id',
            'monitor_id',
            'start_date',
            'end_date',
            'hour_start',
            'hour_end',
            'full_day',
            'user_nwd_subtype_id',
            'notes as name'
        ])
        ->where('school_id', $schoolId)
        ->where('start_date', '<=', $dateEnd)
        ->where('end_date', '>=', $dateStart);

    if ($monitorIds) {
        $nwdsQuery->whereIn('monitor_id', $monitorIds);
    }

    $nwds = $nwdsQuery->get();

    // === PARTE 4: AGRUPAR RESULTADOS ===

    // Agrupar bookings según la lógica actual
    $groupedBookings = [];

    foreach ($bookings as $booking) {
        $groupKey = $this->generateBookingGroupKey($booking);

        if (!isset($groupedBookings[$groupKey])) {
            $groupedBookings[$groupKey] = [];
        }

        $groupedBookings[$groupKey][] = $booking;
    }

    // Estructurar respuesta por monitor
    $result = [];

    foreach ($monitors as $monitor) {
        $monitorBookings = [];
        $monitorNwds = [];

        // Filtrar bookings de este monitor
        foreach ($groupedBookings as $key => $bookingGroup) {
            if ($bookingGroup[0]->monitor_id === $monitor->id) {
                $monitorBookings[$key] = $bookingGroup;
            }
        }

        // Filtrar NWDs de este monitor
        $monitorNwds = $nwds->where('monitor_id', $monitor->id)->values();

        $result[] = [
            'monitor' => $monitor,
            'bookings' => $monitorBookings,
            'nwds' => $monitorNwds
        ];
    }

    // Agregar bookings sin monitor asignado
    $unassignedBookings = [];
    foreach ($groupedBookings as $key => $bookingGroup) {
        if ($bookingGroup[0]->monitor_id === null) {
            $unassignedBookings[$key] = $bookingGroup;
        }
    }

    if (!empty($unassignedBookings)) {
        $result[] = [
            'monitor' => ['id' => null],
            'bookings' => $unassignedBookings,
            'nwds' => []
        ];
    }

    return $result;
}

/**
 * Generar clave de agrupación según nueva lógica
 */
private function generateBookingGroupKey($booking)
{
    $courseType = $booking->course->course_type;

    // Cursos privados (type 2) y actividades (type 3): agrupar por course_id-course_date_id
    if ($courseType === 2 || $courseType === 3) {
        return "{$booking->course_id}-{$booking->course_date_id}";
    }

    // Cursos colectivos (type 1): agrupar individualmente
    return "{$booking->course_id}-{$booking->course_date_id}-{$booking->booking_id}";
}
```

### 2.2 Consideraciones de Performance

**Índices de Base de Datos Necesarios:**

```sql
-- Tabla booking_users
CREATE INDEX idx_booking_users_school_date ON booking_users(school_id, date);
CREATE INDEX idx_booking_users_monitor_date ON booking_users(monitor_id, date);

-- Tabla monitor_nwds
CREATE INDEX idx_monitor_nwds_school_dates ON monitor_nwds(school_id, start_date, end_date);
CREATE INDEX idx_monitor_nwds_monitor_dates ON monitor_nwds(monitor_id, start_date, end_date);

-- Tabla course_dates
CREATE INDEX idx_course_dates_course_date ON course_dates(course_id, date);

-- Tabla monitors
CREATE INDEX idx_monitors_school ON monitors(school_id);
```

---

## 3. VALIDACIÓN DE CAMPOS USADOS EN FRONTEND

### 3.1 Timeline Component (timeline.component.ts)

**Líneas donde se usan los datos:**

#### Monitor Fields (Líneas 162-203 del HTML):
- ✅ `monitor.id` - Identificación
- ✅ `monitor.sports` - Array de deportes
- ✅ `monitor.sports[].id` - ID del deporte
- ✅ `monitor.sports[].name` - Nombre del deporte
- ✅ `monitor.sports[].icon_selected` - Icono seleccionado
- ✅ `monitor.sports[].degrees_sport` - Grados del deporte (calculado en frontend desde `this.degrees`)
- ✅ `monitor.sports[].authorized_degree_id` - ID del grado autorizado (calculado desde `authorizedDegrees`)
- ✅ `monitor.image` - Imagen del monitor
- ✅ `monitor.language1_id`, `language2_id`, `language3_id` - Idiomas
- ✅ `monitor.first_name`, `last_name` - Nombre
- ✅ `monitor.email` - Email
- ✅ `monitor.phone` - Teléfono
- ✅ `monitor.hasFullDayNwd` - Flag de día completo no trabajable
- ❌ Resto de campos NO SE USAN

#### Task/Booking Fields (Líneas 276-397 del HTML):
- ✅ `task.booking_id` - ID de la reserva
- ✅ `task.hour_start` - Hora inicio
- ✅ `task.date` - Fecha
- ✅ `task.monitor_id` - ID del monitor
- ✅ `task.type` - Tipo (collective/private/activity)
- ✅ `task.sport.icon_selected` - Icono del deporte
- ✅ `task.name` - Nombre del curso
- ✅ `task.all_clients[0].client.first_name` - Nombre del cliente
- ✅ `task.all_clients[0].client.last_name` - Apellido del cliente
- ✅ `task.all_clients[0].client.language1_id` - Idioma del cliente
- ✅ `task.all_clients[0].client.birth_date` - Fecha nacimiento del cliente
- ✅ `task.degree.color` - Color del nivel
- ✅ `task.degree.annotation` - Anotación del nivel
- ✅ `task.subgroup_number` - Número del subgrupo
- ✅ `task.clients_number` - Número de clientes
- ✅ `task.max_participants` - Máximo de participantes
- ✅ `task.booking_color` - Color de la reserva (private/activity)
- ✅ `task.accepted` - Si está aceptada
- ❌ Resto de campos NO SE USAN directamente en el render

### 3.2 EditDateComponent (edit-date.component.ts)

**Campos usados (Líneas 33-37, 144-165):**
- ✅ `defaults.course_date_id` - ID de la fecha del curso
- ✅ `defaults.course.course_dates` - Array de fechas del curso
- ✅ `defaults.course.course_dates[].id` - ID de la fecha
- ✅ `defaults.course.course_dates[].date` - Fecha
- ✅ `defaults.course.course_dates[].hour_start` - Hora inicio
- ✅ `defaults.course.course_dates[].hour_end` - Hora fin
- ✅ `defaults.all_clients` - Array de clientes
- ✅ `defaults.all_clients[].id` - ID del booking_user
- ✅ `defaults.all_clients[].client_id` - ID del cliente
- ✅ `defaults.all_clients[].hour_start` - Hora inicio
- ✅ `defaults.all_clients[].hour_end` - Hora fin
- ✅ `defaults.monitor_id` - ID del monitor
- ✅ `defaults.booking_id` - ID de la reserva

**Campos NO USADOS:**
- ❌ `defaults.course.name`, `sport_id`, `max_participants`, etc. (solo se usan las fechas)
- ❌ Toda la información del `booking` object
- ❌ Toda la información del `client` object (solo se necesita el ID)

### 3.3 CourseUserTransferTimelineComponent

**Campos usados (Líneas 40-75, 163-182):**
- ✅ `defaults.id` - ID del curso
- ✅ `defaults.degrees` - Array de niveles (se pasa desde el parent)
- ✅ `defaults.degrees[].color` - Color del nivel
- ✅ `defaults.currentStudents` - Array de estudiantes actuales
- ✅ `defaults.currentDate` - Fecha actual
- ✅ `defaults.subgroup` - ID del subgrupo inicial

**Nota:** Este componente hace un fetch adicional del curso completo (`/admin/courses/{id}`), por lo que no depende tanto de los datos del planner.

---

## 4. TESTING Y VALIDACIÓN

### 4.1 Tests Unitarios

**Crear:** `tests/Unit/PlannerOptimizationTest.php`

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Http\Controllers\Admin\PlannerController;

class PlannerOptimizationTest extends TestCase
{
    /**
     * Verificar que solo se envían los campos necesarios de monitor
     */
    public function test_monitor_fields_optimization()
    {
        $response = $this->json('GET', '/admin/getPlanner', [
            'date_start' => '2025-01-01',
            'date_end' => '2025-01-07',
            'school_id' => 1
        ]);

        $response->assertStatus(200);

        $monitor = $response->json('data.0.monitor');

        // Campos que DEBEN estar
        $this->assertArrayHasKey('id', $monitor);
        $this->assertArrayHasKey('first_name', $monitor);
        $this->assertArrayHasKey('last_name', $monitor);
        $this->assertArrayHasKey('email', $monitor);
        $this->assertArrayHasKey('phone', $monitor);
        $this->assertArrayHasKey('image', $monitor);
        $this->assertArrayHasKey('language1_id', $monitor);
        $this->assertArrayHasKey('hasFullDayNwd', $monitor);
        $this->assertArrayHasKey('sports', $monitor);

        // Campos que NO DEBEN estar
        $this->assertArrayNotHasKey('dni', $monitor);
        $this->assertArrayNotHasKey('address', $monitor);
        $this->assertArrayNotHasKey('iban', $monitor);
        $this->assertArrayNotHasKey('created_at', $monitor);
    }

    /**
     * Verificar que solo se envían los campos necesarios de booking
     */
    public function test_booking_fields_optimization()
    {
        $response = $this->json('GET', '/admin/getPlanner', [
            'date_start' => '2025-01-01',
            'date_end' => '2025-01-07',
            'school_id' => 1
        ]);

        $response->assertStatus(200);

        $bookings = $response->json('data.0.bookings');

        if (!empty($bookings)) {
            $booking = reset($bookings)[0]; // Primer booking del primer grupo

            // Campos que DEBEN estar
            $this->assertArrayHasKey('id', $booking);
            $this->assertArrayHasKey('booking_id', $booking);
            $this->assertArrayHasKey('course_id', $booking);
            $this->assertArrayHasKey('client', $booking);
            $this->assertArrayHasKey('course', $booking);

            // Client fields
            $this->assertArrayHasKey('first_name', $booking['client']);
            $this->assertArrayHasKey('last_name', $booking['client']);
            $this->assertArrayHasKey('language1_id', $booking['client']);
            $this->assertArrayNotHasKey('email', $booking['client']);
            $this->assertArrayNotHasKey('address', $booking['client']);

            // Course fields
            $this->assertArrayHasKey('name', $booking['course']);
            $this->assertArrayHasKey('sport_id', $booking['course']);
            $this->assertArrayNotHasKey('description', $booking['course']);
            $this->assertArrayNotHasKey('price', $booking['course']);
        }
    }

    /**
     * Verificar que el tamaño de la respuesta está dentro del límite
     */
    public function test_response_size_is_optimized()
    {
        // Test con 77 monitores
        $response = $this->json('GET', '/admin/getPlanner', [
            'date_start' => '2025-01-01',
            'date_end' => '2025-01-07',
            'school_id' => 1
        ]);

        $response->assertStatus(200);

        $responseSize = strlen(json_encode($response->json()));
        $responseSizeMB = $responseSize / (1024 * 1024);

        // Debe ser menor a 10 MB (idealmente < 7 MB)
        $this->assertLessThan(10, $responseSizeMB,
            "Response size is {$responseSizeMB}MB, should be less than 10MB");
    }
}
```

### 4.2 Tests de Integración

**Validar en Timeline:**

1. **Verificar que el timeline carga correctamente**
   ```typescript
   // En timeline.component.spec.ts
   it('should load timeline with optimized data', () => {
     // Mock the optimized response
     const mockData = { ... };

     component.processData(mockData);

     expect(component.filteredMonitors.length).toBeGreaterThan(0);
     expect(component.tasksCalendar.length).toBeGreaterThan(0);
   });
   ```

2. **Verificar que los modales funcionan**
   ```typescript
   it('should open edit-date modal with minimal data', () => {
     const taskDetail = {
       course_date_id: 1,
       course: {
         course_dates: [...]
       },
       all_clients: [...]
     };

     // Abrir modal
     component.toggleDetail(taskDetail);

     // Verificar que se abre correctamente
     expect(dialogSpy).toHaveBeenCalled();
   });
   ```

### 4.3 Tests de Performance

**Benchmark del endpoint:**

```bash
# Test con Apache Bench
ab -n 100 -c 10 "http://localhost/api/admin/getPlanner?date_start=2025-01-01&date_end=2025-01-07&school_id=1"

# Métricas esperadas:
# - Response time: < 500ms (actualmente puede ser > 5s)
# - Response size: < 7MB (actualmente 30-60MB)
# - Memory usage: < 50MB (actualmente puede llegar a 200MB+)
```

---

## 5. PLAN DE IMPLEMENTACIÓN

### Fase 1: Backend Optimization (2-3 días)

**Prioridad: ALTA**

1. ✅ **Día 1: Modificar PlannerController**
   - Implementar método `performPlannerQuery()` optimizado
   - Agregar selects específicos para cada relación
   - Implementar batch loading de authorized degrees y full day NWDs
   - Testing unitario

2. ✅ **Día 2: Optimizar Modelos**
   - Crear Resource classes para estructurar respuestas:
     - `MonitorPlannerResource.php`
     - `BookingPlannerResource.php`
     - `NwdPlannerResource.php`
   - Implementar `toArray()` methods con solo campos necesarios

3. ✅ **Día 3: Testing e Índices**
   - Crear/verificar índices de base de datos
   - Tests de integración
   - Benchmark de performance
   - Ajustes finales

### Fase 2: Validación Frontend (1 día)

**Prioridad: ALTA**

1. ✅ **Verificar timeline.component.ts**
   - Asegurar que `processData()` funciona con nueva estructura
   - Verificar que todos los datos necesarios están presentes
   - Testing en entorno de desarrollo

2. ✅ **Verificar modales**
   - EditDateComponent
   - CourseUserTransferTimelineComponent
   - Otros modales relacionados

### Fase 3: Deployment y Monitoreo (1 día)

**Prioridad: MEDIA**

1. ✅ **Desplegar a staging**
   - Aplicar migraciones de índices
   - Desplegar código backend
   - Testing completo en staging

2. ✅ **Monitoreo**
   - Verificar logs de errores
   - Monitorear tiempos de respuesta
   - Verificar uso de memoria

3. ✅ **Desplegar a producción**
   - Ventana de mantenimiento (opcional)
   - Deploy gradual si es posible
   - Monitoreo intensivo primeras 24h

---

## 6. ROLLBACK PLAN

### Si hay problemas en producción:

**Opción 1: Rollback Inmediato**
```bash
# Revertir commit
git revert <commit-hash>
git push origin main

# Desplegar versión anterior
php artisan migrate:rollback --step=1
```

**Opción 2: Feature Flag**

Implementar feature flag en el controller:

```php
public function getPlanner(Request $request)
{
    $useOptimized = config('features.optimized_planner', false);

    if ($useOptimized) {
        return $this->getOptimizedPlanner($request);
    } else {
        return $this->getOriginalPlanner($request);
    }
}
```

En `.env`:
```
OPTIMIZED_PLANNER_ENABLED=false
```

---

## 7. MÉTRICAS DE ÉXITO

### KPIs a Monitorear:

| Métrica | Valor Actual | Objetivo | Método de Medición |
|---------|--------------|----------|-------------------|
| Response Size | 30-60 MB | < 7 MB | Network tab / Logs |
| Response Time | 5-30 s | < 1 s | Application Performance Monitoring |
| Memory Usage | 200+ MB | < 50 MB | Server metrics |
| Error Rate | ? | < 0.1% | Error logging |
| User Load Time | 10-60 s | < 3 s | Frontend performance |

### Alertas a Configurar:

1. **Response time > 2s** → Alerta inmediata
2. **Response size > 10MB** → Alerta warning
3. **Error rate > 1%** → Alerta crítica
4. **Memory usage > 100MB** → Alerta warning

---

## 8. DOCUMENTACIÓN ADICIONAL

### Campos Detallados por Entidad

#### Monitor
```php
// ENVIAR SOLO:
[
    'id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'image',
    'language1_id',
    'language2_id',
    'language3_id',
    'hasFullDayNwd', // Calculado
    'sports' => [
        'id',
        'name',
        'icon_selected',
        'authorizedDegrees' => [
            'degree_id'
        ]
    ]
]
```

#### BookingUser
```php
// ENVIAR SOLO:
[
    'id',
    'booking_id',
    'client_id',
    'course_id',
    'course_date_id',
    'course_subgroup_id',
    'monitor_id',
    'date',
    'hour_start',
    'hour_end',
    'status',
    'accepted',
    'degree_id',
    'color',
    'group_id',
    'subgroup_number',
    'total_subgroups',
    'booking' => [
        'id',
        'created_at',
        'paid',
        'user' => [
            'id',
            'first_name',
            'last_name'
        ]
    ],
    'client' => [
        'id',
        'first_name',
        'last_name',
        'birth_date',
        'language1_id'
    ],
    'course' => [
        'id',
        'name',
        'sport_id',
        'course_type',
        'max_participants',
        'date_start',
        'date_end',
        'course_dates' => [
            'id',
            'date',
            'hour_start',
            'hour_end'
        ]
    ]
]
```

#### MonitorNwd
```php
// ENVIAR SOLO:
[
    'id',
    'monitor_id',
    'start_date',
    'end_date',
    'hour_start',
    'hour_end',
    'full_day',
    'user_nwd_subtype_id',
    'name' // Alias de 'notes'
]
```

---

## 9. PREGUNTAS FRECUENTES (FAQ)

### Q: ¿Por qué no usar paginación?
**A:** El planner necesita todos los datos de la semana/mes para renderizar correctamente. Paginación complicaría la UX.

### Q: ¿Por qué no usar GraphQL?
**A:** Requiere refactorización mayor. Esta optimización con REST es más rápida de implementar y logra resultados similares.

### Q: ¿Esto romperá otras pantallas?
**A:** No. Esta optimización es específica para el endpoint `/admin/getPlanner`. Otros endpoints no se ven afectados.

### Q: ¿Necesitamos versionar el API?
**A:** No es necesario si los campos enviados son un subset de los anteriores. El frontend ignora campos que no usa.

### Q: ¿Qué pasa con los datos en caché?
**A:** Si hay caché del planner, limpiar después del deploy:
```php
Cache::tags(['planner'])->flush();
```

---

## 10. CONTACTO Y SOPORTE

Para dudas o problemas relacionados con esta optimización:

- **Desarrollador Backend:** [Nombre]
- **Desarrollador Frontend:** [Nombre]
- **DevOps:** [Nombre]

**Issue Tracker:** [URL del repositorio]/issues

---

## ANEXO A: Laravel Resource Classes

### MonitorPlannerResource.php
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class MonitorPlannerResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'image' => $this->image,
            'language1_id' => $this->language1_id,
            'language2_id' => $this->language2_id,
            'language3_id' => $this->language3_id,
            'hasFullDayNwd' => $this->hasFullDayNwd ?? false,
            'sports' => SportPlannerResource::collection($this->whenLoaded('sports'))
        ];
    }
}
```

### BookingPlannerResource.php
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BookingPlannerResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'booking_id' => $this->booking_id,
            'client_id' => $this->client_id,
            'course_id' => $this->course_id,
            'course_date_id' => $this->course_date_id,
            'course_subgroup_id' => $this->course_subgroup_id,
            'monitor_id' => $this->monitor_id,
            'date' => $this->date,
            'hour_start' => $this->hour_start,
            'hour_end' => $this->hour_end,
            'status' => $this->status,
            'accepted' => $this->accepted,
            'degree_id' => $this->degree_id,
            'color' => $this->color,
            'group_id' => $this->group_id,
            'subgroup_number' => $this->subgroup_number,
            'total_subgroups' => $this->total_subgroups,
            'booking' => [
                'id' => $this->booking->id,
                'created_at' => $this->booking->created_at,
                'paid' => $this->booking->paid,
                'user' => [
                    'id' => $this->booking->user->id,
                    'first_name' => $this->booking->user->first_name,
                    'last_name' => $this->booking->user->last_name,
                ]
            ],
            'client' => [
                'id' => $this->client->id,
                'first_name' => $this->client->first_name,
                'last_name' => $this->client->last_name,
                'birth_date' => $this->client->birth_date,
                'language1_id' => $this->client->language1_id,
            ],
            'course' => [
                'id' => $this->course->id,
                'name' => $this->course->name,
                'sport_id' => $this->course->sport_id,
                'course_type' => $this->course->course_type,
                'max_participants' => $this->course->max_participants,
                'date_start' => $this->course->date_start,
                'date_end' => $this->course->date_end,
                'course_dates' => $this->course->courseDates->map(function($date) {
                    return [
                        'id' => $date->id,
                        'date' => $date->date,
                        'hour_start' => $date->hour_start,
                        'hour_end' => $date->hour_end,
                    ];
                })
            ]
        ];
    }
}
```

---

**Fin del documento**

**Versión:** 1.0
**Última actualización:** 2025-11-05
**Autor:** Claude (AI Assistant)
**Revisor:** [Pendiente]
