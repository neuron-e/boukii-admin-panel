# 🎨 PLAN FRONTEND ARQUITECTURA V5 - SIN DISEÑO

## 🎯 OBJETIVO: Arquitectura Angular Completa + Lógica de Negocio

Mientras desarrollamos backend y se crea el diseño, montamos toda la arquitectura Angular V5 con:
- ✅ Estructura modular completa
- ✅ Services con lógica de negocio
- ✅ Interfaces TypeScript definitivas  
- ✅ Routing y guards funcionales
- ✅ State management (Signals/NgRx)
- ✅ Formularios reactivos completos
- ✅ Componentes con template mínimo (`<div>Component Works</div>`)

**Al llegar el diseño: Solo reemplazar templates + añadir CSS**

---

## 📁 ESTRUCTURA ARQUITECTURAL COMPLETA

### **🏗️ Core Architecture**
```typescript
src/app/v5/
├── core/                           // 🔥 Servicios fundamentales
│   ├── services/
│   │   ├── api-v5.service.ts              // HTTP client configurado
│   │   ├── season-context.service.ts      // Context global temporadas
│   │   ├── auth-v5.service.ts             // Auth season-aware
│   │   ├── notification.service.ts        // Notifications centralizadas
│   │   ├── loading.service.ts             // Loading states global
│   │   ├── error-handler.service.ts       // Error handling
│   │   └── cache.service.ts               // Caching strategy
│   ├── guards/
│   │   ├── auth-v5.guard.ts              // Auth + season validation
│   │   ├── season-context.guard.ts        // Season context required
│   │   ├── module-active.guard.ts         // Módulo activado
│   │   └── permission.guard.ts            // Permissions por season
│   ├── interceptors/
│   │   ├── auth-v5.interceptor.ts         // Token + season headers
│   │   ├── loading.interceptor.ts         // Loading automático
│   │   ├── error.interceptor.ts          // Error handling
│   │   └── cache.interceptor.ts          // HTTP caching  
│   ├── models/                     // 📋 Interfaces TypeScript
│   │   ├── season.interface.ts
│   │   ├── school.interface.ts
│   │   ├── course.interface.ts
│   │   ├── booking.interface.ts
│   │   ├── client.interface.ts
│   │   ├── monitor.interface.ts
│   │   ├── rental.interface.ts
│   │   ├── api-response.interface.ts
│   │   └── common.interface.ts
│   └── utils/
│       ├── validators.ts                  // Custom validators
│       ├── formatters.ts                 // Data formatters
│       ├── constants.ts                  // App constants
│       └── helpers.ts                    // Utility functions

├── shared/                        // 🔧 Componentes compartidos
│   ├── components/
│   │   ├── season-selector/
│   │   │   ├── season-selector.component.ts
│   │   │   ├── season-selector.component.html    // Template mínimo
│   │   │   └── season-selector.component.scss    // Vacío por ahora
│   │   ├── loading-spinner/
│   │   ├── error-message/
│   │   ├── confirmation-dialog/
│   │   ├── data-table/                   // Table genérica
│   │   ├── form-field/                   // Form wrapper
│   │   ├── date-picker/                  // Date picker wrapper
│   │   └── file-upload/                  // Upload component
│   ├── directives/
│   │   ├── has-permission.directive.ts
│   │   ├── loading.directive.ts
│   │   └── auto-focus.directive.ts
│   └── pipes/
│       ├── currency-season.pipe.ts       // Currency por season
│       ├── date-season.pipe.ts          // Dates por season locale
│       ├── translate.pipe.ts            // i18n pipe
│       └── safe-html.pipe.ts            // Sanitización

├── features/                      // 🎯 Módulos de negocio
│   ├── seasons/                   // MÓDULO SEASONS
│   │   ├── seasons.module.ts
│   │   ├── seasons-routing.module.ts
│   │   ├── services/
│   │   │   ├── season.service.ts                 // CRUD + business logic
│   │   │   ├── season-snapshot.service.ts        // Snapshots immutables
│   │   │   └── season-cloning.service.ts         // Cloning logic
│   │   ├── pages/
│   │   │   ├── season-list/
│   │   │   │   ├── season-list.component.ts      // List con filtros
│   │   │   │   ├── season-list.component.html    // `<div>Season List Works</div>`
│   │   │   │   └── season-list.component.scss    // Vacío
│   │   │   ├── season-detail/
│   │   │   ├── season-form/
│   │   │   ├── season-dashboard/
│   │   │   ├── season-comparison/
│   │   │   ├── season-cloning/
│   │   │   ├── season-closure/
│   │   │   └── season-audit/
│   │   ├── components/
│   │   │   ├── season-card/
│   │   │   ├── season-stats/
│   │   │   ├── season-timeline/
│   │   │   └── season-clone-wizard/
│   │   └── state/                        // NgRx o Signals
│   │       ├── season.state.ts
│   │       ├── season.effects.ts
│   │       └── season.selectors.ts

│   ├── schools/                   // MÓDULO SCHOOLS  
│   │   ├── schools.module.ts
│   │   ├── services/
│   │   │   ├── school.service.ts
│   │   │   └── school-season-settings.service.ts
│   │   ├── pages/
│   │   │   ├── school-dashboard/
│   │   │   ├── school-configuration/
│   │   │   ├── school-modules-manager/
│   │   │   └── school-season-settings/
│   │   └── components/
│   │       ├── school-info-card/
│   │       ├── module-toggle/
│   │       └── season-settings-form/

│   ├── courses/                   // MÓDULO COURSES
│   │   ├── courses.module.ts
│   │   ├── services/
│   │   │   ├── course-season.service.ts
│   │   │   ├── course-pricing.service.ts
│   │   │   ├── course-availability.service.ts
│   │   │   └── course-templates.service.ts
│   │   ├── pages/
│   │   │   ├── course-list-season/
│   │   │   ├── course-form-season/
│   │   │   ├── course-calendar-season/
│   │   │   ├── course-pricing-season/
│   │   │   ├── course-group-management/
│   │   │   ├── course-availability/
│   │   │   ├── course-templates/
│   │   │   ├── course-duplication-wizard/
│   │   │   ├── course-history/
│   │   │   └── course-analytics-season/
│   │   ├── components/
│   │   │   ├── course-card-season/
│   │   │   ├── pricing-calculator/
│   │   │   ├── availability-calendar/
│   │   │   ├── course-group-tree/
│   │   │   └── course-stats-widget/
│   │   └── state/
│   │       ├── course.state.ts
│   │       └── course.effects.ts

│   ├── bookings/                  // MÓDULO BOOKINGS
│   │   ├── bookings.module.ts
│   │   ├── services/
│   │   │   ├── booking-season.service.ts
│   │   │   ├── booking-pricing-calculator.service.ts
│   │   │   ├── booking-payment.service.ts
│   │   │   ├── booking-communication.service.ts
│   │   │   └── booking-modification.service.ts
│   │   ├── pages/
│   │   │   ├── booking-list-season/
│   │   │   ├── booking-wizard-season/
│   │   │   ├── booking-detail-season/
│   │   │   ├── booking-calendar-season/
│   │   │   ├── booking-payment-manager/
│   │   │   ├── booking-communications/
│   │   │   ├── booking-modifications/
│   │   │   ├── booking-cancellation/
│   │   │   ├── booking-group-manager/
│   │   │   ├── booking-waitlist/
│   │   │   ├── booking-reports-season/
│   │   │   ├── booking-check-in/
│   │   │   └── booking-analytics/
│   │   ├── components/
│   │   │   ├── booking-card/
│   │   │   ├── booking-wizard-step/
│   │   │   ├── pricing-breakdown/
│   │   │   ├── payment-timeline/
│   │   │   ├── booking-status/
│   │   │   └── booking-calendar/
│   │   └── state/
│   │       ├── booking.state.ts
│   │       └── booking.effects.ts

│   ├── clients/                   // MÓDULO CLIENTS
│   │   ├── clients.module.ts
│   │   ├── services/
│   │   │   ├── client.service.ts
│   │   │   ├── client-communication.service.ts
│   │   │   ├── client-segmentation.service.ts
│   │   │   └── client-loyalty.service.ts
│   │   ├── pages/
│   │   │   ├── client-list/
│   │   │   ├── client-detail-season/
│   │   │   ├── client-form/
│   │   │   ├── client-booking-history/
│   │   │   ├── client-communications/
│   │   │   ├── client-segmentation/
│   │   │   ├── client-loyalty-dashboard/
│   │   │   └── client-import-export/
│   │   └── components/
│   │       ├── client-card/
│   │       ├── client-timeline/
│   │       ├── loyalty-widget/
│   │       └── segmentation-builder/

│   ├── monitors/                  // MÓDULO MONITORS
│   │   ├── monitors.module.ts
│   │   ├── services/
│   │   │   ├── monitor-season.service.ts
│   │   │   ├── monitor-availability.service.ts
│   │   │   ├── monitor-assignment.service.ts
│   │   │   ├── monitor-salary.service.ts
│   │   │   └── monitor-performance.service.ts
│   │   ├── pages/
│   │   │   ├── monitor-list-season/
│   │   │   ├── monitor-detail-season/
│   │   │   ├── monitor-availability-season/
│   │   │   ├── monitor-assignment/
│   │   │   ├── monitor-salaries-season/
│   │   │   ├── monitor-performance/
│   │   │   ├── monitor-schedule/
│   │   │   ├── monitor-certification/
│   │   │   ├── monitor-communication/
│   │   │   └── monitor-analytics/
│   │   └── components/
│   │       ├── monitor-card/
│   │       ├── availability-matrix/
│   │       ├── assignment-board/
│   │       ├── salary-calculator/
│   │       └── performance-chart/

│   ├── salaries/                  // MÓDULO SALARIES (NUEVO)
│   │   ├── salaries.module.ts
│   │   ├── services/
│   │   │   ├── salary-season.service.ts
│   │   │   ├── salary-calculator.service.ts
│   │   │   └── payroll.service.ts
│   │   ├── pages/
│   │   │   ├── salary-dashboard-season/
│   │   │   ├── salary-calculator-season/
│   │   │   ├── salary-payroll/
│   │   │   ├── salary-reports-season/
│   │   │   ├── salary-settings-season/
│   │   │   └── salary-history/
│   │   └── components/
│   │       ├── salary-card/
│   │       ├── payroll-table/
│   │       └── salary-breakdown/

│   ├── rental/                    // MÓDULO RENTAL (NUEVO)
│   │   ├── rental.module.ts
│   │   ├── services/
│   │   │   ├── rental-inventory.service.ts
│   │   │   ├── rental-booking.service.ts
│   │   │   ├── rental-availability.service.ts
│   │   │   ├── rental-pricing.service.ts
│   │   │   └── rental-analytics.service.ts
│   │   ├── pages/
│   │   │   ├── rental-inventory-list/
│   │   │   ├── rental-item-form/
│   │   │   ├── rental-category-manager/
│   │   │   ├── rental-maintenance/
│   │   │   ├── rental-booking-list/
│   │   │   ├── rental-booking-wizard/
│   │   │   ├── rental-availability-calendar/
│   │   │   ├── rental-checkout/
│   │   │   ├── rental-return/
│   │   │   ├── rental-waitlist/
│   │   │   ├── rental-extension/
│   │   │   ├── rental-dashboard/
│   │   │   ├── rental-revenue-analysis/
│   │   │   └── rental-client-analysis/
│   │   └── components/
│   │       ├── rental-item-card/
│   │       ├── availability-calendar/
│   │       ├── booking-timeline/
│   │       ├── checkout-pos/
│   │       └── rental-stats/

│   ├── analytics/                 // MÓDULO ANALYTICS
│   │   ├── analytics.module.ts
│   │   ├── services/
│   │   │   ├── analytics-season.service.ts
│   │   │   ├── revenue-analytics.service.ts
│   │   │   ├── predictive-analytics.service.ts
│   │   │   └── custom-reports.service.ts
│   │   ├── pages/
│   │   │   ├── analytics-dashboard-season/
│   │   │   ├── revenue-analytics-season/
│   │   │   ├── booking-analytics/
│   │   │   ├── client-analytics-season/
│   │   │   ├── course-performance-analytics/
│   │   │   ├── monitor-performance-analytics/
│   │   │   ├── financial-reports-season/
│   │   │   ├── operational-analytics/
│   │   │   ├── predictive-analytics/
│   │   │   ├── custom-report-builder/
│   │   │   ├── real-time-analytics/
│   │   │   └── competitive-analysis/
│   │   └── components/
│   │       ├── chart-wrapper/
│   │       ├── kpi-card/
│   │       ├── report-builder/
│   │       └── analytics-filter/

│   ├── settings/                  // MÓDULO SETTINGS
│   │   ├── settings.module.ts
│   │   ├── services/
│   │   │   ├── settings.service.ts
│   │   │   ├── user-management.service.ts
│   │   │   ├── integration.service.ts
│   │   │   └── notification-settings.service.ts
│   │   ├── pages/
│   │   │   ├── general-settings/
│   │   │   ├── user-management/
│   │   │   ├── role-permission-matrix/
│   │   │   ├── integration-settings/
│   │   │   ├── notification-settings/
│   │   │   ├── backup-restore/
│   │   │   ├── audit-log/
│   │   │   └── system-health/
│   │   └── components/
│   │       ├── settings-card/
│   │       ├── permission-matrix/
│   │       ├── integration-card/
│   │       └── audit-timeline/

│   └── weather/                   // MÓDULO WEATHER (Sin cambios)
│       ├── weather.module.ts
│       ├── services/
│       │   └── weather.service.ts
│       ├── pages/
│       │   ├── weather-dashboard/
│       │   ├── weather-station-management/
│       │   └── weather-alerts/
│       └── components/
│           ├── weather-widget/
│           └── weather-forecast/

├── layouts/                       // 🏠 Layouts de aplicación
│   ├── v5-layout/
│   │   ├── v5-layout.component.ts         // Layout principal
│   │   ├── v5-layout.component.html       // Template básico
│   │   └── v5-layout.component.scss       // Vacío
│   ├── auth-layout/
│   ├── public-layout/
│   ├── error-layout/
│   └── mobile-layout/

└── state/                         // 🔄 State management global
    ├── app.state.ts                       // State raíz
    ├── season/
    │   ├── season.state.ts                // Season context global
    │   ├── season.effects.ts
    │   └── season.selectors.ts
    ├── auth/
    │   ├── auth.state.ts
    │   ├── auth.effects.ts
    │   └── auth.selectors.ts
    └── ui/
        ├── loading.state.ts               // Loading global
        ├── notification.state.ts          // Notifications
        └── sidebar.state.ts               // UI state
```

---

## 🗓️ CRONOGRAMA FRONTEND ARQUITECTURA

### **MARTES 28/01 - Core Architecture + Seasons Module**
```bash
⏰ 9:00-10:30: Core Services Foundation
# Crear servicios fundamentales
ng generate service v5/core/services/api-v5
ng generate service v5/core/services/season-context  
ng generate service v5/core/services/auth-v5
ng generate service v5/core/services/notification
ng generate service v5/core/services/loading

⏰ 10:30-12:00: Guards + Interceptors
ng generate guard v5/core/guards/auth-v5
ng generate guard v5/core/guards/season-context
ng generate interceptor v5/core/interceptors/auth-v5
ng generate interceptor v5/core/interceptors/loading

⏰ 14:00-15:30: Interfaces TypeScript
# Definir todas las interfaces Season + API Response
interfaces/season.interface.ts
interfaces/api-response.interface.ts
interfaces/common.interface.ts

⏰ 15:30-17:00: Seasons Module Complete  
ng generate module v5/features/seasons
ng generate service v5/features/seasons/services/season
# Crear todos los componentes season (8 componentes)
ng generate component v5/features/seasons/pages/season-list
ng generate component v5/features/seasons/pages/season-form
# ... resto de componentes

⏰ 17:00-18:00: Seasons State Management
# NgRx o Signals para seasons
seasons/state/season.state.ts
seasons/state/season.effects.ts
```

### **MIÉRCOLES 29/01 - Schools + Auth Frontend**
```bash
⏰ 9:00-10:30: Schools Module Architecture
ng generate module v5/features/schools
ng generate service v5/features/schools/services/school
ng generate service v5/features/schools/services/school-season-settings
# Componentes schools (4 componentes)

⏰ 10:30-12:00: Auth V5 Integration
# Auth service season-aware
auth-v5.service.ts con season context
login/logout/permissions methods
Token + season management

⏰ 14:00-15:30: Shared Components Base
ng generate component v5/shared/components/season-selector
ng generate component v5/shared/components/loading-spinner
ng generate component v5/shared/components/error-message
ng generate component v5/shared/components/data-table

⏰ 15:30-17:00: Routing + Guards Setup
v5-routing.module.ts completo
Guards integration en todas las rutas
Lazy loading modules configuration

⏰ 17:00-18:00: Forms Architecture
# Reactive forms base para todos los módulos
FormBuilder + Custom validators
Form field components wrapper
```

### **JUEVES 30/01 - Courses + Bookings Frontend**
```bash
⏰ 9:00-11:00: Courses Module Complete
ng generate module v5/features/courses
# Services courses (4 servicios complejos)
course-season.service.ts
course-pricing.service.ts  
course-availability.service.ts
course-templates.service.ts

# Componentes courses (12 componentes)
ng generate component v5/features/courses/pages/course-list-season
# ... resto

⏰ 11:00-12:30: Bookings Module Architecture
ng generate module v5/features/bookings
# Services bookings (5 servicios críticos)  
booking-season.service.ts
booking-pricing-calculator.service.ts
booking-payment.service.ts

⏰ 14:00-15:30: Booking Wizard Logic
# Multi-step wizard sin template
BookingWizardComponent con step management
Form validation por step
Data flow entre steps

⏰ 15:30-17:00: Complex Components Logic
# Pricing calculator logic
PricingCalculatorComponent
AvailabilityCalendarComponent  
PaymentTimelineComponent

⏰ 17:00-18:00: State Management Advanced
# NgRx effects para operaciones complejas
courses.effects.ts
bookings.effects.ts
API integration completa
```

### **VIERNES 31/01 - Resto Módulos + Integration**
```bash
⏰ 9:00-10:30: Clients + Monitors Modules
ng generate module v5/features/clients
ng generate module v5/features/monitors
# Services + componentes básicos

⏰ 10:30-12:00: New Modules (Salaries + Rental)
ng generate module v5/features/salaries  
ng generate module v5/features/rental
# Arquitectura completa módulos nuevos

⏰ 14:00-15:30: Analytics + Settings Modules
ng generate module v5/features/analytics
ng generate module v5/features/settings
# Complex chart components logic
# Settings forms architecture

⏰ 15:30-17:00: Mobile Architecture
# Mobile-specific components
ng generate component v5/mobile/auth-mobile
ng generate component v5/mobile/booking-mobile
# Responsive services

⏰ 17:00-18:00: Integration Testing
# Services integration con backend APIs
Mock data flowing correctly
Routing end-to-end functional
State management working
```

---

## 💼 SERVICIOS BUSINESS LOGIC DETALLADOS

### **🏫 SeasonContextService (Core)**
```typescript
@Injectable({ providedIn: 'root' })
export class SeasonContextService {
  private currentSeasonSubject = new BehaviorSubject<Season | null>(null);
  public currentSeason$ = this.currentSeasonSubject.asObservable();
  
  private availableSeasonsSubject = new BehaviorSubject<Season[]>([]);
  public availableSeasons$ = this.availableSeasonsSubject.asObservable();

  constructor(private apiV5: ApiV5Service) {}

  // Business logic methods sin implementación visual
  async loadAvailableSeasons(schoolId: number): Promise<Season[]> {
    // Cargar temporadas disponibles
  }

  setCurrentSeason(season: Season): void {
    // Cambiar temporada activa + events
    this.currentSeasonSubject.next(season);
    this.broadcastSeasonChange(season);
  }

  canEditCurrentSeason(): boolean {
    // Business rules para edición
  }

  getCurrentSeasonId(): number | null {
    return this.currentSeasonSubject.value?.id || null;
  }

  private broadcastSeasonChange(season: Season): void {
    // Evento global para components
    window.dispatchEvent(new CustomEvent('boukii-season-changed', {
      detail: { season }
    }));
  }
}
```

### **💰 BookingPricingCalculatorService**
```typescript
@Injectable()
export class BookingPricingCalculatorService {
  constructor(
    private apiV5: ApiV5Service,
    private seasonContext: SeasonContextService
  ) {}

  async calculateBookingPrice(request: BookingPriceRequest): Promise<BookingPriceBreakdown> {
    // Lógica compleja pricing con season context
    const seasonId = this.seasonContext.getCurrentSeasonId();
    
    // 1. Get course seasonal pricing
    const coursePrice = await this.getCourseSeasonalPrice(request.courseId, seasonId);
    
    // 2. Apply participant calculations
    const participantTotal = this.calculateParticipantPricing(coursePrice, request.participants);
    
    // 3. Apply discounts and vouchers
    const discountedTotal = await this.applyDiscountsAndVouchers(participantTotal, request);
    
    // 4. Add extras (insurance, equipment, etc.)
    const finalTotal = this.addExtras(discountedTotal, request.extras);
    
    return {
      subtotal: participantTotal,
      discounts: discountedTotal.discounts,
      extras: finalTotal.extras,
      total: finalTotal.total,
      breakdown: finalTotal.breakdown
    };
  }

  private calculateParticipantPricing(coursePrice: CourseSeasonPricing, participants: number): number {
    // Flexible vs Fixed pricing logic
  }

  // Más métodos business logic...
}
```

### **📅 CourseAvailabilityService**
```typescript
@Injectable()
export class CourseAvailabilityService {
  constructor(private apiV5: ApiV5Service) {}

  async checkRealTimeAvailability(courseId: number, dateRange: DateRange): Promise<AvailabilityMatrix> {
    // Complex availability calculation
    // - Existing bookings
    // - Monitor availability  
    // - Course capacity
    // - Season constraints
  }

  async getAvailableSlots(courseId: number, date: Date): Promise<TimeSlot[]> {
    // Real-time slots calculation
  }

  canBookSlot(slot: TimeSlot, participants: number): BookingValidation {
    // Validation logic con business rules
  }
}
```

---

## 📋 INTERFACES TYPESCRIPT DEFINITIVAS

### **🏫 Season Interfaces**
```typescript
// interfaces/season.interface.ts
export interface Season {
  id: number;
  school_id: number;
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  is_current: boolean;
  is_closed: boolean;
  settings: SeasonSettings;
  created_at: Date;
  updated_at: Date;
}

export interface SeasonSettings {
  currency: string;
  locale: string;
  timezone: string;
  business_rules: SeasonBusinessRules;
  pricing_rules: SeasonPricingRules;
}

export interface SeasonBusinessRules {
  allow_overbooking: boolean;
  max_advance_booking_days: number;
  cancellation_policy: CancellationPolicy;
  refund_rules: RefundRules;
}

export interface SeasonSnapshot {
  id: number;
  season_id: number;
  snapshot_type: 'closure' | 'audit' | 'backup';
  snapshot_data: any;
  is_immutable: boolean;
  created_at: Date;
}

// ... más interfaces season
```

### **🎿 Course Interfaces**
```typescript
// interfaces/course.interface.ts
export interface SeasonCourse {
  id: number;
  season_id: number;
  school_id: number;
  name: string;
  description: string;
  course_group_id: number;
  course_subgroup_id?: number;
  pricing: CourseSeasonPricing;
  availability: CourseSeasonAvailability;
  settings: CourseSettings;
  created_at: Date;
  updated_at: Date;
}

export interface CourseSeasonPricing {
  id: number;
  course_id: number;
  season_id: number;
  pricing_type: 'flexible' | 'fixed';
  base_price: number;
  min_participants: number;
  max_participants: number;
  price_breaks: PriceBreak[];
  extras: CourseExtra[];
}

export interface PriceBreak {
  participant_count: number;
  price_per_participant: number;
  total_price: number;
}

// ... más interfaces course
```

### **📋 Booking Interfaces**
```typescript
// interfaces/booking.interface.ts
export interface SeasonBooking {
  id: number;
  season_id: number;
  school_id: number;
  course_id: number;
  client_id: number;
  status: BookingStatus;
  participants: BookingParticipant[];
  pricing_snapshot: BookingPriceSnapshot;
  payments: BookingSeasonPayment[];
  created_at: Date;
  updated_at: Date;
}

export interface BookingPriceSnapshot {
  id: number;
  booking_id: number;
  snapshot_data: {
    course_price: CourseSeasonPricing;
    calculation_breakdown: PricingBreakdown;
    applied_discounts: AppliedDiscount[];
    extras: BookingExtra[];
    total_calculation: TotalCalculation;
  };
  is_immutable: boolean;
  created_at: Date;
}

export type BookingStatus = 
  | 'pending'
  | 'confirmed' 
  | 'paid'
  | 'cancelled'
  | 'completed'
  | 'no_show';

// ... más interfaces booking
```

---

## 🔄 STATE MANAGEMENT ARCHITECTURE

### **🏫 Season State (NgRx)**
```typescript
// state/season/season.state.ts
export interface SeasonState {
  currentSeason: Season | null;
  availableSeasons: Season[];
  loading: boolean;
  error: string | null;
  seasonStats: SeasonStats | null;
}

// state/season/season.effects.ts
@Injectable()
export class SeasonEffects {
  loadAvailableSeasons$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SeasonActions.loadAvailableSeasons),
      switchMap(action =>
        this.seasonService.getAvailableSeasons(action.schoolId).pipe(
          map(seasons => SeasonActions.loadAvailableSeasonsSuccess({ seasons })),
          catchError(error => of(SeasonActions.loadAvailableSeasonsFailure({ error })))
        )
      )
    )
  );

  setCurrentSeason$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SeasonActions.setCurrentSeason),
      tap(action => {
        this.seasonContextService.setCurrentSeason(action.season);
      })
    ), { dispatch: false }
  );
}
```

### **📋 Booking State (Signals - Angular 17+)**
```typescript
// state/booking/booking.state.ts
@Injectable({ providedIn: 'root' })
export class BookingStateService {
  private bookingListSignal = signal<SeasonBooking[]>([]);
  private currentBookingSignal = signal<SeasonBooking | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Read-only computed signals
  public bookingList = this.bookingListSignal.asReadonly();
  public currentBooking = this.currentBookingSignal.asReadonly();
  public loading = this.loadingSignal.asReadonly();
  public error = this.errorSignal.asReadonly();

  // Computed derived state
  public totalBookings = computed(() => this.bookingList().length);
  public confirmedBookings = computed(() => 
    this.bookingList().filter(b => b.status === 'confirmed')
  );

  constructor(private bookingService: BookingSeasonService) {}

  async loadBookings(seasonId: number): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const bookings = await this.bookingService.getBookingsBySeason(seasonId);
      this.bookingListSignal.set(bookings);
      this.errorSignal.set(null);
    } catch (error) {
      this.errorSignal.set(error.message);
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
```

---

## 📱 FORMULARIOS REACTIVOS ARQUITECTURA

### **🏫 Season Form**
```typescript
// features/seasons/components/season-form/season-form.component.ts
@Component({
  selector: 'app-season-form',
  template: `<div>Season Form Component Works - Ready for Design</div>`,
  styleUrls: ['./season-form.component.scss'] // Vacío
})
export class SeasonFormComponent implements OnInit {
  seasonForm: FormGroup;
  submitted = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private seasonService: SeasonService,
    private seasonContext: SeasonContextService
  ) {
    this.buildForm();
  }

  private buildForm(): void {
    this.seasonForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      start_date: ['', [Validators.required, this.dateValidator]],
      end_date: ['', [Validators.required, this.dateValidator]],
      settings: this.fb.group({
        currency: ['EUR', Validators.required],
        locale: ['es', Validators.required],
        timezone: ['Europe/Madrid', Validators.required],
        business_rules: this.fb.group({
          allow_overbooking: [false],
          max_advance_booking_days: [90, [Validators.min(1), Validators.max(365)]],
          cancellation_policy: this.fb.group({
            free_cancellation_hours: [24],
            partial_refund_percentage: [50],
            cancellation_fee: [0]
          })
        })
      })
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    if (this.seasonForm.invalid) {
      this.markFormGroupTouched(this.seasonForm);
      return;
    }

    this.loading = true;
    try {
      const seasonData = this.seasonForm.value;
      const newSeason = await this.seasonService.createSeason(seasonData);
      
      // Update context
      await this.seasonContext.loadAvailableSeasons(newSeason.school_id);
      
      // Navigate or emit success
      this.onSeasonCreated.emit(newSeason);
    } catch (error) {
      this.handleFormError(error);
    } finally {
      this.loading = false;
    }
  }

  // Form validation helpers
  private dateValidator(control: AbstractControl): ValidationErrors | null {
    // Custom date validation
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    // Mark all fields as touched for validation display
  }

  private handleFormError(error: any): void {
    // Error handling logic
  }

  @Output() onSeasonCreated = new EventEmitter<Season>();
}
```

---

## 🧪 TESTING ARCHITECTURE

### **Unit Tests Template**
```typescript
// Every component gets basic test structure
describe('SeasonListComponent', () => {
  let component: SeasonListComponent;
  let fixture: ComponentFixture<SeasonListComponent>;
  let seasonService: jasmine.SpyObj<SeasonService>;
  let seasonContext: jasmine.SpyObj<SeasonContextService>;

  beforeEach(async () => {
    const seasonServiceSpy = jasmine.createSpyObj('SeasonService', ['getSeasons']);
    const seasonContextSpy = jasmine.createSpyObj('SeasonContextService', ['setCurrentSeason']);

    await TestBed.configureTestingModule({
      declarations: [SeasonListComponent],
      providers: [
        { provide: SeasonService, useValue: seasonServiceSpy },
        { provide: SeasonContextService, useValue: seasonContextSpy }
      ]
    }).compileComponents();

    seasonService = TestBed.inject(SeasonService) as jasmine.SpyObj<SeasonService>;
    seasonContext = TestBed.inject(SeasonContextService) as jasmine.SpyObj<SeasonContextService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load seasons on init', () => {
    // Test business logic
  });

  it('should handle season selection', () => {
    // Test interactions
  });
});
```

---

## 🎯 ENTREGABLES POR DÍA

### **Martes 28/01:**
- ✅ Core services + guards + interceptors funcionales
- ✅ Season module completo con business logic
- ✅ State management season working
- ✅ Interfaces TypeScript definitivas

### **Miércoles 29/01:**
- ✅ Schools + Auth modules funcionales
- ✅ Shared components base arquitectura
- ✅ Routing completo con guards
- ✅ Forms reactive architecture

### **Jueves 30/01:**
- ✅ Courses + Bookings modules completos
- ✅ Complex business logic implemented
- ✅ Advanced state management
- ✅ Integration APIs working

### **Viernes 31/01:**
- ✅ Todos los módulos creados
- ✅ Mobile architecture base
- ✅ Integration testing passed
- ✅ Ready for design implementation

---

## 🚀 VENTAJAS DE ESTA ESTRATEGIA

### **✅ Desarrollo Acelerado Post-Diseño**
```bash
# Cuando llegue el diseño Figma:
1. Reemplazar templates mínimos → HTML real
2. Añadir SCSS → Styles reales  
3. Business logic + forms YA FUNCIONANDO
4. Integration APIs YA CONECTADAS
Result: Implementación visual en 2-3 días vs 2-3 semanas
```

### **✅ Testing Desde Día 1**
```bash
# Business logic testing inmediato
npm run test:watch
# API integration testing
npm run e2e:api
# State management testing
npm run test:state
```

### **✅ Arquitectura Sólida**
```bash
# Separación clara concerns
Business Logic ≠ Visual Design
Data Flow ≠ UI Components  
API Integration ≠ Templates
```

**¿Empezamos mañana martes con la arquitectura core + seasons module?** 🚀

Esta estrategia nos dará una implementación **súper rápida** cuando llegue el diseño, porque toda la lógica estará lista y solo necesitaremos "vestir" los componentes.
