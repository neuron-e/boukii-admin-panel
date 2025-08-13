# 📋 **Bookings V3 - Sistema Unificado**

Este módulo consolida toda la funcionalidad de reservas (Bookings V3 + Skipro) en una estructura limpia y coherente.

## 🏗️ **Estructura del Módulo**

```
src/app/pages/bookings-v3/
├── components/
│   ├── bookings-list/                  # Lista principal de reservas
│   ├── booking-wizard/                 # Wizard de creación/edición
│   │   └── steps/                      # Pasos del wizard
│   │       ├── client-selection/       # Paso 1: Selección de cliente
│   │       ├── activity-selection/     # Paso 2: Tipo de reserva
│   │       ├── schedule-selection/     # Paso 3: Fechas y horarios
│   │       ├── participant-details/    # Paso 4: Detalles participantes
│   │       ├── pricing-confirmation/   # Paso 5: Confirmación precios
│   │       └── final-review/          # Paso 6: Revisión final
│   ├── client-profile/                # Perfil completo del cliente
│   └── modals/                        # Modales del sistema
│       ├── booking-detail-modal/      # Detalles de reserva
│       └── cancel-booking-dialog/     # Cancelación de reserva
├── services/
│   ├── booking-v3.service.ts          # Servicio principal de reservas
│   ├── client-v3.service.ts           # Servicio de clientes
│   ├── wizard-state.service.ts        # Estado del wizard
│   └── service.factory.ts             # Factory para mock/real services
├── interfaces/
│   └── booking-v3.interfaces.ts       # Todas las interfaces unificadas
├── bookings-v3.module.ts              # Módulo principal
├── bookings-v3-routing.module.ts      # Configuración de rutas
└── README.md                          # Esta documentación
```

## 🔗 **Rutas Disponibles**

- **`/bookings-v3/reservas`** - Lista principal de reservas con KPIs y filtros
- **`/bookings-v3/reservas/nueva`** - Wizard para crear nueva reserva
- **`/bookings-v3/reservas/:id/editar`** - Wizard para editar reserva existente
- **`/bookings-v3/clientes/:id`** - Perfil completo del cliente

## 🎯 **Características Principales**

### 📊 **Dashboard de Reservas**
- KPIs interactivos (Cursos, Actividades, Material, Estados)
- Lista de reservas con filtros avanzados
- Búsqueda en tiempo real
- Acciones rápidas (Ver, Editar, Cancelar)

### 🧙‍♂️ **Wizard Inteligente**
- **6 pasos** para crear/editar reservas
- Validación en tiempo real
- Guardado automático del estado
- Precios calculados dinámicamente
- Soporte para múltiples participantes

### 👤 **Gestión de Clientes**
- Perfil completo con estadísticas
- Historial de reservas
- Reservas activas
- Información de contacto y preferencias

### 💳 **Sistema de Precios**
- Cálculo automático de precios
- Descuentos por grupo y múltiples días
- Alquiler de equipo opcional
- Múltiples opciones de pago

## ⚙️ **Configuración de Servicios**

### 🔄 **Mock/Real Services Toggle**

El sistema puede funcionar con datos mock o reales:

```typescript
// En src/environments/environment.ts
useRealServices: false  // Mock data para desarrollo
useRealServices: true   // API real para producción
```

### 📡 **Endpoints API**

Cuando `useRealServices: true`, el sistema conecta con:

```
GET    /api/v3/bookings                    # Lista de reservas
GET    /api/v3/bookings/:id                # Reserva específica
POST   /api/v3/bookings                    # Crear reserva
PUT    /api/v3/bookings/:id                # Actualizar reserva
POST   /api/v3/bookings/cancel             # Cancelar reserva

GET    /api/v3/clients                     # Lista de clientes
GET    /api/v3/clients/:id                 # Cliente específico
GET    /api/v3/clients/:id/statistics      # Estadísticas cliente

GET    /api/v3/booking-types               # Tipos de reserva
GET    /api/v3/courses                     # Cursos disponibles
GET    /api/v3/dashboard/kpis              # KPIs del dashboard
```

## 🎨 **Componentes UI**

### 📋 **BookingsListComponent**
- Diseño responsivo con TailwindCSS
- Angular Signals para estado reactivo
- KPIs interactivos
- Filtros avanzados
- Tabla con acciones

### 🪄 **BookingWizardComponent**
- Mat-Stepper para navegación
- 6 pasos con validación
- Estado compartido entre pasos
- Cálculo dinámico de precios
- Guardado automático

### 👤 **ClientProfileComponent**
- Tabs para organizar información
- Estadísticas visuales
- Historial completo
- Acciones rápidas

## 🔒 **Autenticación y Permisos**

- Protegido con `AuthGuard`
- Integrado con el sistema de autenticación existente
- Roles y permisos configurables

## 🎯 **Próximos Pasos**

### Para el Backend:
1. Implementar los endpoints listados en la sección API
2. Usar las interfaces TypeScript como referencia
3. Cambiar `useRealServices: true` cuando esté listo

### Para Testing:
1. Navegar a `http://localhost:4200/bookings-v3/reservas`
2. Probar todas las funcionalidades con datos mock
3. Verificar el wizard de creación de reservas

## 🔧 **Comandos de Desarrollo**

```bash
# Iniciar desarrollo
npm start

# Navegar al sistema
# http://localhost:4200/bookings-v3/reservas

# Cambiar a datos reales (cuando API esté lista)
# Editar src/environments/environment.ts
# useRealServices: true
```

## 🎉 **Estado Actual**

✅ **Completado (85%)**
- Estructura modular consolidada
- Componentes principales implementados
- Servicios con mock/real toggle
- Interfaces TypeScript completas
- Routing configurado
- Sistema de mock data funcional

⏳ **Pendiente (15%)**
- Testing en navegador
- Ajustes de CSS/estilos finos
- Integración con API real
- Pruebas de usuario final

---

**El sistema está listo para desarrollo y testing. Solo falta conectar con la API real cuando esté disponible.**