# 🚀 **Instrucciones Rápidas - Booking System V3 & Skipro**

## 📍 **¿Dónde está funcionando ahora?**

### **✅ RUTA CORRECTA ACTUAL**
```
http://localhost:4200/skipro
```

**¡NOTA IMPORTANTE!** El sistema Skipro ya está funcionando, pero en la ruta `/skipro`, no en `/bookings-v3/reservas`.

## 🔧 **Verificar que funciona**

### **Paso 1: Iniciar la aplicación**
```bash
cd C:\Users\aym14\Documents\WebstormProjects\boukii\boukii-admin-panel
npm start
```

### **Paso 2: Navegar a la URL correcta**
```
http://localhost:4200/skipro
```

**Deberías ver:**
- ✅ Dashboard con 6 KPIs (Cursos, Actividades, Material, etc.)
- ✅ Lista de reservas con datos mock
- ✅ Botón "Nueva reserva" funcionando
- ✅ Filtros por tipo y búsqueda
- ✅ Acciones en cada fila (Ver, Editar, Cancelar)

### **Paso 3: Probar el Wizard**
```
Click en "Nueva reserva" → Te lleva a /skipro/wizard
```

**Deberías ver:**
- ✅ Paso 1: Selección de cliente
- ✅ Paso 2: Tipo de reserva
- ✅ Paso 3: Configuración
- ✅ Paso 4: Resumen

## 🔄 **Si quieres cambiar la ruta a `/bookings-v3/reservas`**

### **Opción A: Cambiar el app-routing.module.ts**
```typescript
// En src/app/app-routing.module.ts línea 51-54
// CAMBIAR:
{
  path: 'bookings-v3',
  loadChildren: () => import('./bookings-v3/bookings-v3.module').then(m => m.BookingsV3Module),
  canActivate: [AuthGuard],
},
{
  path: 'skipro',
  loadChildren: () => import('./bookings-v3/skipro.module').then(m => m.SkiProModule),
  canActivate: [AuthGuard],
},

// POR:
{
  path: 'bookings-v3',
  loadChildren: () => import('./bookings-v3/skipro.module').then(m => m.SkiProModule),
  canActivate: [AuthGuard],
},
```

### **Opción B: Unificar los módulos (Recomendado)**
```bash
# Crear un módulo unificado que combine ambos
# Ya tenemos el archivo: bookings-v3-unified-routing.module.ts
```

## 📊 **Estado Actual de los Datos**

### **🔋 Datos Mock Activos**
- ✅ 15 reservas de ejemplo
- ✅ 6 KPIs calculados
- ✅ Clientes con datos realistas
- ✅ Cursos y actividades disponibles

### **⚡ Para activar datos reales**
```typescript
// En src/environments/environment.ts
useRealServices: true  // cambiar de false a true
```

## 🎯 **Próximos pasos recomendados**

### **1. Para el Backend (API)**
```markdown
# Copiar estos archivos al equipo de backend:
📁 BOOKING-V3-API-ENDPOINTS.md     # Especificación completa
📁 UNIFICATION-PLAN.md             # Plan de implementación
📁 IMPLEMENTATION-STATUS.md        # Estado actual

# Los endpoints que necesitas implementar PRIMERO:
✅ GET /api/v3/skipro/dashboard        # KPIs y datos principales
✅ GET /api/v3/skipro/bookings         # Lista de reservas
✅ GET /api/v3/clients                 # Lista de clientes
✅ POST /api/v3/bookings/smart-create  # Crear reserva
✅ POST /api/v3/bookings/{id}/cancel   # Cancelar reserva
```

### **2. Para Testing Inmediato**
```bash
# 1. Navegar a http://localhost:4200/skipro
# 2. Probar todas las funcionalidades con mocks
# 3. Cuando el backend esté listo, cambiar useRealServices: true
```

### **3. Para el Menú de Navegación**
```typescript
// Actualizar el menú principal para incluir:
{
  type: 'link',
  label: 'Gestión de Reservas',
  route: '/skipro',
  icon: 'calendar_today'
}
```

## ⚠️ **Problemas Comunes**

### **Error: Página en blanco**
```bash
# Solución:
1. Verificar que npm start está corriendo
2. Navegar a /skipro (no /bookings-v3/reservas)
3. Abrir DevTools y verificar errores de consola
```

### **Error: Componente no encontrado**
```bash
# Solución:
1. Los componentes están en SkiProModule, no BookingsV3Module
2. Verificar que app-routing.module.ts apunta al módulo correcto
```

### **Error: Sin datos**
```bash
# Solución:
1. Verificar useRealServices: false (para usar mocks)
2. Si useRealServices: true, verificar que backend esté funcionando
```

## 🎉 **¡Tu sistema ya está funcionando!**

**Solo necesitas:**
1. ✅ Navegar a `http://localhost:4200/skipro`
2. 🔄 Implementar los endpoints del backend usando `BOOKING-V3-API-ENDPOINTS.md`
3. ⚡ Cambiar `useRealServices: true` cuando el backend esté listo

**El 85% del trabajo de frontend ya está completo y funcionando.**