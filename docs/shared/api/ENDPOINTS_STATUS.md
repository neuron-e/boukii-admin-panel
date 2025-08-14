# 🔗 Estado de Endpoints API - Boukii V5

*Última actualización: 2025-08-14*

## 📊 **Resumen de Estado**

| Módulo | Endpoints Disponibles | Estado | Frontend Integrado |
|--------|-----------------------|--------|-------------------|
| **Dashboard V5** | 3/3 | ✅ Operativo | ✅ ReservationsWidget |
| **Authentication V5** | 5/5 | ✅ Operativo | ✅ AuthService |
| **Clients V5** | 0/5 | ⏸️ Pendiente | ⏸️ T2.1.1 |
| **Courses V5** | 0/6 | ⏸️ Pendiente | ⏸️ T3.1.1 |
| **Bookings V5** | 0/5 | ⏸️ Pendiente | ⏸️ T4.1.1 |
| **Monitors V5** | 0/4 | ⏸️ Pendiente | ⏸️ T5.1.1 |

---

## 🎯 **Endpoints Dashboard V5** - ✅ OPERATIVO

### **Base URL**: `http://api-boukii.test/api/v5/dashboard`

| Endpoint | Método | Estado | Implementado | Consumido por Frontend |
|----------|--------|--------|--------------|----------------------|
| `/stats` | GET | ✅ | 2025-08-14 | ✅ ReservationsWidget |
| `/revenue` | GET | ✅ | 2025-08-14 | ⏸️ T1.2.2 (RevenueWidget) |
| `/bookings` | GET | ✅ | 2025-08-14 | ✅ ReservationsWidget |

#### **GET /api/v5/dashboard/stats**
```javascript
// Request Headers
{
  "Authorization": "Bearer {token}",
  "X-School-ID": "2", 
  "X-Season-ID": "14"
}

// Response Format
{
  "success": true,
  "message": "Dashboard stats loaded successfully",
  "data": {
    "bookings": {
      "total": 1703,
      "confirmed": 1560,
      "pending": 120,
      "cancelled": 23,
      "todayCount": 8,
      "weeklyGrowth": 12.5,
      "todayRevenue": 1240.0
    },
    "clients": {
      "total": 7500,
      "active": 6800,
      "newThisMonth": 145
    },
    // ... más datos
  }
}
```

#### **GET /api/v5/dashboard/revenue**
```javascript
// Query Parameters
{
  "period": "month|week|year", // opcional, default: month
  "days": 30,                  // opcional, rango personalizado
  "season_id": 14,            // opcional, override header
  "school_id": 2              // opcional, override header  
}

// Response Format
{
  "success": true,
  "data": {
    "summary": {
      "total": 204382.11,
      "paid": 189550.45,
      "pending": 14831.66,
      "growth": 16.4
    },
    "trends": [
      {"date": "2024-12-01", "revenue": 1850.0, "bookings": 15},
      {"date": "2024-12-02", "revenue": 1420.0, "bookings": 12}
    ]
    // ... más datos financieros
  }
}
```

#### **GET /api/v5/dashboard/bookings**
```javascript
// Query Parameters  
{
  "period": "today|week|month|quarter|year", // opcional, default: month
  "status": "pending|confirmed|cancelled",   // opcional, filtro por estado
  "start_date": "2024-12-01",               // opcional, fecha inicio
  "end_date": "2024-12-31",                 // opcional, fecha fin
  "season_id": 14,                          // opcional, override header
  "school_id": 2                            // opcional, override header
}

// Response Format
{
  "success": true,
  "data": {
    "summary": {
      "total": 1703,
      "today": 8,
      "confirmed": 1560,
      "pending": 120,
      "cancelled": 23,
      "todayRevenue": 1240.0
    },
    "timeline": [
      {"date": "2024-12-01", "count": 15, "revenue": 1850.0},
      {"date": "2024-12-02", "count": 12, "revenue": 1420.0}
    ],
    "recentBookings": [
      {
        "id": 1203,
        "clientName": "Marie Dubois",
        "clientEmail": "marie.dubois@example.ch",
        "courseType": "Esquí Avanzado",
        "monitorName": "Jean-Pierre Martin",
        "startTime": "10:00",
        "status": "confirmed",
        "amount": 95.0
      }
    ]
    // ... más datos de reservas
  }
}
```

---

## 🔐 **Endpoints Authentication V5** - ✅ OPERATIVO

### **Base URL**: `http://api-boukii.test/api/v5/auth`

| Endpoint | Método | Estado | Frontend Service | Implementado |
|----------|--------|--------|-----------------|--------------|
| `/login` | POST | ✅ | AuthV5Service | ✅ |
| `/logout` | POST | ✅ | AuthV5Service | ✅ |
| `/me` | GET | ✅ | AuthV5Service | ✅ |
| `/schools` | GET | ✅ | SeasonContextService | ✅ |
| `/schools/{id}/seasons` | GET | ✅ | SeasonContextService | ✅ |

---

## ⏸️ **Endpoints Pendientes por Implementar**

### **Clients V5** - 📅 Sprint T2.1.1
```
GET    /api/v5/clients              # Lista con filtros
POST   /api/v5/clients              # Crear cliente
GET    /api/v5/clients/{id}         # Detalle cliente  
PUT    /api/v5/clients/{id}         # Actualizar cliente
DELETE /api/v5/clients/{id}         # Eliminar cliente
```

### **Courses V5** - 📅 Sprint T3.1.1  
```
GET    /api/v5/courses              # Lista con filtros
POST   /api/v5/courses              # Crear curso
GET    /api/v5/courses/{id}         # Detalle curso
PUT    /api/v5/courses/{id}         # Actualizar curso
DELETE /api/v5/courses/{id}         # Eliminar curso
GET    /api/v5/courses/{id}/pricing # Precio dinámico
```

### **Bookings V5** - 📅 Sprint T4.1.1
```
GET    /api/v5/bookings             # Lista con filtros
POST   /api/v5/bookings             # Crear reserva
GET    /api/v5/bookings/{id}        # Detalle reserva
PUT    /api/v5/bookings/{id}        # Actualizar reserva
DELETE /api/v5/bookings/{id}        # Cancelar reserva
```

### **Monitors V5** - 📅 Sprint T5.1.1
```
GET    /api/v5/monitors             # Lista monitores
POST   /api/v5/monitors             # Crear monitor
GET    /api/v5/monitors/{id}        # Detalle monitor
PUT    /api/v5/monitors/{id}        # Actualizar monitor
```

---

## 🚨 **Problemas Conocidos y Resoluciones**

### **BLOCKER-001 - RESUELTO** ✅
- **Problema**: DashboardV5Controller buscaba `season_id` en tabla `bookings` (columna inexistente)
- **Solución**: Controller adaptado para usar filtros por fecha de temporada (diciembre-abril)
- **Estado**: ✅ Completamente resuelto y verificado
- **Fecha**: 2025-08-14

### **Schema Compatibility**
- **Situación**: Backend V5 diseñado para arquitectura multi-temporada pero BD actual tiene estructura legacy
- **Approach**: Quick Fix implementado - usar date ranges en lugar de season_id
- **Impacto**: Cero - funcionalidad completa mantenida

---

## 🔄 **Proceso de Actualización**

### **Para Backend Developers**:
1. **Al implementar nuevo endpoint**: Actualizar esta documentación con request/response examples
2. **Al cambiar API existente**: Marcar como "Breaking Change" y notificar frontend
3. **Al resolver bugs**: Documentar en sección "Problemas Conocidos"

### **Para Frontend Developers**:  
1. **Al integrar endpoint**: Marcar como "✅ Consumido por Frontend"
2. **Al encontrar problemas**: Reportar en sección "Problemas Conocidos" 
3. **Al implementar nueva funcionalidad**: Verificar endpoints disponibles aquí primero

### **Frecuencia de actualización**:
- **Diaria**: Durante desarrollo activo de sprint
- **Por commit**: Al implementar/cambiar endpoints
- **Al final de sprint**: Review completo y cleanup

---

## 🎯 **Próximos Endpoints Prioritarios (Sprint 2025-08-13-15)**

### **Miércoles 14 Agosto**: ✅ Dashboard completado
### **Jueves 14 Agosto**: Clients + Courses
1. **T2.1.1**: Implementar ClientV5Controller completo
2. **T3.1.1**: Implementar CourseV5Controller con pricing

### **Viernes 15 Agosto**: Bookings + Monitors  
3. **T4.1.1**: Implementar BookingV5Controller básico
4. **T5.1.1**: Implementar MonitorV5Controller

---

## 📞 **Contacto y Soporte**

- **Backend Issues**: Reportar en sprint tracking docs  
- **Frontend Integration**: Verificar primero esta documentación
- **Breaking Changes**: Se notificarán vía commit messages con prefijo `BREAKING:`

---

*📝 Este documento se actualiza automáticamente con cada cambio significativo de la API V5*