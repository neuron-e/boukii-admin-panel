# 🚀 **Demo Setup - Booking System V3**

## 📋 **Guía Rápida de Configuración**

Esta guía te permite probar visualmente el nuevo sistema de reservas inteligente sin necesidad de endpoints reales.

### **🎯 Objetivos del Demo**
- ✅ Probar el wizard completo de 6 pasos
- ✅ Ver la funcionalidad de búsqueda inteligente de clientes
- ✅ Experimentar con las recomendaciones de IA
- ✅ Validar el sistema de precios dinámicos
- ✅ Probar la detección de conflictos
- ✅ Ver las animaciones y transiciones

---

## **🛠️ Configuración Inicial**

### **1. Servicios Mock Incluidos**

Los siguientes servicios mock están listos para usar:

```typescript
// Servicios principales
MockDataService              // Datos de prueba centralizados
SmartBookingServiceMock      // Lógica principal del wizard
SmartClientServiceMock       // Búsqueda de clientes
ClientAnalyticsServiceMock   // Analytics de clientes

// Servicios por paso del wizard
ActivitySelectionServiceMock     // Paso 2: Selección de actividades
ScheduleSelectionServiceMock     // Paso 3: Selección de horarios
ParticipantDetailsServiceMock    // Paso 4: Detalles participantes
PricingConfirmationServiceMock   // Paso 5: Pricing y confirmación
```

### **2. Configuración en el Módulo**

En tu `app.module.ts` o en el módulo correspondiente:

```typescript
import { NgModule } from '@angular/core';

// Servicios Mock
import { MockDataService } from './bookings-v3/services/mock/mock-data.service';
import { SmartBookingServiceMock } from './bookings-v3/services/mock/smart-booking.service.mock';
import { SmartClientServiceMock } from './bookings-v3/services/mock/smart-client.service.mock';
import { ClientAnalyticsServiceMock } from './bookings-v3/services/mock/client-analytics.service.mock';
import { ActivitySelectionServiceMock } from './bookings-v3/services/mock/activity-selection.service.mock';
import { ScheduleSelectionServiceMock } from './bookings-v3/services/mock/schedule-selection.service.mock';
import { ParticipantDetailsServiceMock } from './bookings-v3/services/mock/participant-details.service.mock';
import { PricingConfirmationServiceMock } from './bookings-v3/services/mock/pricing-confirmation.service.mock';

@NgModule({
  providers: [
    // Datos mock centralizados
    MockDataService,
    
    // Servicios mock específicos
    SmartBookingServiceMock,
    SmartClientServiceMock,
    ClientAnalyticsServiceMock,
    ActivitySelectionServiceMock,
    ScheduleSelectionServiceMock,
    ParticipantDetailsServiceMock,
    PricingConfirmationServiceMock,
    
    // Opcional: Inyectar como servicios reales
    // { provide: SmartBookingService, useClass: SmartBookingServiceMock },
    // { provide: SmartClientService, useClass: SmartClientServiceMock },
  ]
})
export class BookingsV3Module { }
```

### **3. Configuración del Componente Wizard**

En `booking-wizard.component.ts`, inyecta los servicios mock:

```typescript
import { Component, inject } from '@angular/core';
import { SmartBookingServiceMock } from '../services/mock/smart-booking.service.mock';
import { SmartClientServiceMock } from '../services/mock/smart-client.service.mock';

@Component({
  selector: 'app-booking-wizard',
  templateUrl: './booking-wizard.component.html',
  styleUrls: ['./booking-wizard.component.scss']
})
export class BookingWizardComponent {
  // Servicios mock
  private smartBookingService = inject(SmartBookingServiceMock);
  private smartClientService = inject(SmartClientServiceMock);
  
  // ... resto del código
}
```

---

## **🎮 Datos de Prueba Disponibles**

### **👤 Clientes Mock**
```typescript
// Disponibles en MockDataService.getMockClients()
[
  {
    id: 1,
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana.garcia@email.com',
    phone: '+34 600 123 456',
    level: 'intermediate',
    // ... más datos
  },
  // 9 clientes más con datos realistas
]
```

### **🎿 Cursos Mock**
```typescript
// Disponibles en MockDataService.getMockCourses()
[
  {
    id: 1,
    title: 'Esquí Alpino - Principiante',
    sport: { id: 1, name: 'Esquí Alpino' },
    level: 'beginner',
    maxParticipants: 8,
    price: 285,
    // ... más datos
  },
  // 5 cursos más variados
]
```

### **👨‍🏫 Monitores Mock**
```typescript
// Disponibles en MockDataService.getMockMonitors()
[
  {
    id: 1,
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    specialties: ['Esquí Alpino', 'Snowboard'],
    experience: 8,
    rating: 4.9,
    // ... más datos
  },
  // 3 monitores más
]
```

---

## **🧪 Escenarios de Prueba**

### **Escenario 1: Cliente Nuevo**
1. Inicia el wizard
2. En Paso 1: Busca "Juan" (no existe)
3. Crea cliente nuevo con datos ficticios
4. Continúa con el resto de pasos
5. **Resultado**: Wizard completo para cliente nuevo

### **Escenario 2: Cliente Existente**
1. Inicia el wizard  
2. En Paso 1: Busca "Ana" 
3. Selecciona Ana García de los resultados
4. Ve sus insights y recomendaciones
5. **Resultado**: Datos precargados y sugerencias

### **Escenario 3: Detección de Conflictos**
1. Completa hasta Paso 3 (horarios)
2. Selecciona fecha muy próxima
3. El sistema detectará conflictos simulados
4. **Resultado**: Alertas y resoluciones automáticas

### **Escenario 4: Pricing Dinámico**
1. Llega al Paso 5 (pricing)
2. Prueba diferentes códigos promocionales:
   - `EARLY20` (20% descuento)
   - `NEWCLIENT` (€30 fijo)
   - `INVALID` (código inválido)
3. **Resultado**: Cálculos dinámicos en tiempo real

---

## **🎯 Funcionalidades Destacadas**

### **Búsqueda Inteligente**
```typescript
// Simula búsqueda con scoring y razones
smartClientService.searchClients('ana').subscribe(results => {
  console.log(results); // Array con matchScore y matchReasons
});
```

### **Recomendaciones IA**
```typescript
// Sugerencias contextuales
smartBookingService.getSmartSuggestions({
  clientId: 1,
  date: new Date(),
  courseType: 'beginner'
}).subscribe(suggestions => {
  console.log(suggestions); // Cursos, horarios, monitores sugeridos
});
```

### **Validación Tiempo Real**
```typescript
// Validación dinámica de cada paso
smartBookingService.detectConflicts(bookingData).subscribe(conflicts => {
  console.log(conflicts); // Array de ConflictAlert con resoluciones
});
```

### **Pricing Dinámico**
```typescript
// Cálculo con factores múltiples
pricingService.calculateFinalPricing(data).subscribe(pricing => {
  console.log(pricing.dynamicFactors); // Demanda, temporada, clima, etc.
});
```

---

## **🎨 Elementos Visuales**

### **Estados de Carga**
- ⏳ Spinners durante búsquedas (600-900ms simulados)
- 🎯 Indicadores de progreso en validaciones
- ✨ Animaciones de transición entre pasos

### **Alertas y Notificaciones**
- ⚠️ Conflictos detectados con opciones de resolución
- ✅ Validaciones exitosas con feedback visual
- 💡 Sugerencias inteligentes con explicaciones

### **Componentes Interactivos**
- 🔍 Búsqueda con autocomplete y filtering
- 📅 Calendario interactivo con disponibilidad
- 🎛️ Controles dinámicos de precio
- 📊 Gráficos de insights de cliente

---

## **🚀 Comandos Útiles**

### **Desarrollo**
```bash
# Iniciar servidor de desarrollo
ng serve

# Navegar al wizard
# http://localhost:4200/bookings/wizard

# Ver logs de servicios mock en consola del navegador
# Todos los servicios mock usan console.log con emojis
```

### **Testing Visual**
```bash
# Para testing específico del wizard:
# 1. Abre DevTools (F12)
# 2. Ve a Console
# 3. Filtra por "[MOCK]" para ver logs de servicios
# 4. Prueba diferentes flujos del wizard
```

---

## **🔧 Personalización**

### **Modificar Datos Mock**
Edita `mock-data.service.ts` para cambiar:
- Clientes disponibles
- Cursos y precios
- Monitores y especialidades
- Horarios y disponibilidad

### **Simular Errores**
```typescript
// En cualquier servicio mock, modifica las probabilidades:
const success = Math.random() > 0.1; // 90% éxito -> cambiar a 0.5 para 50%
```

### **Ajustar Delays**
```typescript
// Cambia los setTimeout para simular diferentes velocidades de API:
setTimeout(() => {
  observer.next(result);
  observer.complete();
}, 2000); // Cambiar por 500 para respuestas más rápidas
```

---

## **📊 Métricas del Demo**

Durante las pruebas, el sistema simulará:

- **🎯 Precisión búsqueda**: 85-95% match score
- **⚡ Tiempo respuesta**: 400-2000ms realista
- **🤖 Recomendaciones IA**: 2-4 sugerencias por contexto
- **💰 Variación precios**: ±15% por factores dinámicos
- **⚠️ Tasa conflictos**: ~30% para mostrar resoluciones

---

## **🎉 Siguientes Pasos**

1. **Probar todos los escenarios** listados arriba
2. **Documentar bugs** o mejoras UX encontradas
3. **Revisar logs** de consola para entender el flujo
4. **Preparar feedback** para el equipo de desarrollo
5. **Planificar integración** con APIs reales

---

## **📞 Soporte**

Si encuentras problemas durante las pruebas:

1. **Revisa logs** en consola del navegador
2. **Verifica imports** de servicios mock
3. **Confirma configuración** del módulo
4. **Documenta pasos** para reproducir problemas

**¡El sistema está listo para demostrar toda la funcionalidad del nuevo wizard inteligente!** 🚀