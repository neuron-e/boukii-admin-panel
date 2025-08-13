# 🔗 **Integration Guide - Booking System V3**

## 📋 **Tabla de Contenidos**
1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Integración con Servicios Reales](#integración-con-servicios-reales)
3. [Migración desde V2](#migración-desde-v2)
4. [Testing Strategy](#testing-strategy)
5. [Deployment Guide](#deployment-guide)
6. [Monitoring & Observability](#monitoring--observability)

---

## **🏗️ Arquitectura del Sistema**

### **Estructura de Carpetas**
```
src/app/bookings-v3/
├── components/
│   └── wizard/
│       ├── booking-wizard.component.ts
│       ├── booking-wizard.component.html
│       ├── booking-wizard.component.scss
│       └── steps/
│           ├── client-selection/
│           ├── activity-selection/
│           ├── schedule-selection/
│           ├── participant-details/
│           ├── pricing-confirmation/
│           └── final-review/
├── interfaces/
│   ├── booking-wizard.interfaces.ts
│   ├── booking-edit.interfaces.ts
│   └── shared.interfaces.ts
├── services/
│   ├── smart-booking.service.ts
│   ├── smart-client.service.ts
│   ├── client-analytics.service.ts
│   └── mock/
│       ├── mock-data.service.ts
│       ├── smart-booking.service.mock.ts
│       ├── smart-client.service.mock.ts
│       ├── client-analytics.service.mock.ts
│       ├── activity-selection.service.mock.ts
│       ├── schedule-selection.service.mock.ts
│       ├── participant-details.service.mock.ts
│       └── pricing-confirmation.service.mock.ts
├── DEMO-SETUP.md
├── INTEGRATION-GUIDE.md
├── booking-system-v3-api-specification.md
└── frontend-api-usage.md
```

### **Patrón de Arquitectura**

```typescript
// Service Layer Pattern
interface BookingServiceLayer {
  smartBooking: SmartBookingService;     // Core business logic
  smartClient: SmartClientService;       // Client management
  analytics: ClientAnalyticsService;     // Data insights
  pricing: PricingService;               // Dynamic pricing
  availability: AvailabilityService;     // Real-time availability
}

// State Management Pattern (Angular Signals)
interface WizardState {
  currentStep: WritableSignal<number>;
  formData: WritableSignal<BookingWizardData>;
  validationState: WritableSignal<ValidationState>;
  conflicts: WritableSignal<ConflictAlert[]>;
}
```

---

## **🔌 Integración con Servicios Reales**

### **1. Configuración de Environment**

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://api.boukii.com/v3',
  useRealServices: false, // Toggle para usar servicios reales
  mockApiDelay: 800, // Delay simulado para desarrollo
  features: {
    intelligentBooking: true,
    realTimePricing: true,
    conflictDetection: true,
  aiRecommendations: true
  }
};

### **Activar Servicios Reales en Desarrollo**

1. Cambia `useRealServices` a `true` en `src/environments/environment.ts`.
2. Ajusta `apiUrl` al dominio de tu backend real si es necesario.
3. Inicia la aplicación en modo producción para usar este entorno:

```bash
ng serve --configuration=production
```


// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.boukii.com/v3',
  useRealServices: true,
  features: {
    intelligentBooking: true,
    realTimePricing: true,
    conflictDetection: true,
    aiRecommendations: true
  }
};
```

### **2. Service Factory Pattern**

```typescript
// src/app/bookings-v3/services/service.factory.ts
import { inject, InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

// Tokens para servicios
export const SMART_BOOKING_SERVICE = new InjectionToken('SmartBookingService');
export const SMART_CLIENT_SERVICE = new InjectionToken('SmartClientService');
export const CLIENT_ANALYTICS_SERVICE = new InjectionToken('ClientAnalyticsService');

// Factory functions
export function smartBookingServiceFactory() {
  if (environment.useRealServices) {
    return inject(SmartBookingService);
  } else {
    return inject(SmartBookingServiceMock);
  }
}

export function smartClientServiceFactory() {
  if (environment.useRealServices) {
    return inject(SmartClientService);
  } else {
    return inject(SmartClientServiceMock);
  }
}

// Provider configuration
export const BOOKING_V3_PROVIDERS = [
  {
    provide: SMART_BOOKING_SERVICE,
    useFactory: smartBookingServiceFactory
  },
  {
    provide: SMART_CLIENT_SERVICE,
    useFactory: smartClientServiceFactory
  },
  // ... más providers
];
```

### **3. Implementación de Servicios Reales**

```typescript
// src/app/bookings-v3/services/smart-booking.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SmartBookingService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * Crear nueva reserva usando el wizard inteligente
   */
  createBooking(bookingData: BookingWizardData): Observable<BookingCreationResult> {
    return this.http.post<BookingCreationResult>(
      `${this.baseUrl}/bookings/smart-create`,
      bookingData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Obtener sugerencias inteligentes
   */
  getSmartSuggestions(context: SuggestionContext): Observable<SmartSuggestions> {
    const params = new URLSearchParams();
    params.append('context', JSON.stringify(context));
    
    return this.http.get<SmartSuggestions>(
      `${this.baseUrl}/ai/smart-suggestions?${params.toString()}`
    );
  }

  /**
   * Detectar conflictos en tiempo real
   */
  detectConflicts(bookingData: ConflictCheckData): Observable<ConflictAlert[]> {
    return this.http.post<ConflictAlert[]>(
      `${this.baseUrl}/bookings/detect-conflicts`,
      bookingData
    );
  }

  // ... implementar todos los métodos del mock service
}
```

### **4. HTTP Interceptors**

```typescript
// src/app/core/interceptors/booking-api.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { catchError, retry, timeout } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class BookingApiInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Add authentication headers
    const authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'X-API-Version': 'v3',
        'X-Client-Version': '3.0.0'
      }
    });

    return next.handle(authReq).pipe(
      timeout(30000), // 30 second timeout
      retry(2), // Retry failed requests twice
      catchError(error => {
        console.error('API Error:', error);
        return throwError(() => error);
      })
    );
  }

  private getAuthToken(): string {
    // Implement token retrieval logic
    return localStorage.getItem('auth_token') || '';
  }
}
```

---

## **⬆️ Migración desde V2**

### **1. Análisis de Compatibilidad**

```typescript
// src/app/bookings-v3/migration/compatibility.service.ts
@Injectable({
  providedIn: 'root'
})
export class MigrationCompatibilityService {
  
  /**
   * Convertir datos V2 a formato V3
   */
  migrateBookingDataV2ToV3(v2Data: BookingV2Data): BookingWizardData {
    return {
      client: {
        id: v2Data.clientId,
        firstName: v2Data.clientName?.split(' ')[0],
        lastName: v2Data.clientName?.split(' ').slice(1).join(' '),
        // ... más mapeo
      },
      course: {
        id: v2Data.courseId,
        type: this.mapCourseType(v2Data.courseType),
        participants: v2Data.participantCount
      },
      // ... resto del mapeo
    };
  }

  /**
   * Validar compatibilidad de datos V2
   */
  validateV2Compatibility(v2Data: BookingV2Data): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!v2Data.clientId) {
      errors.push('Client ID requerido para migración');
    }

    if (!v2Data.courseId) {
      errors.push('Course ID requerido para migración');
    }

    // Validaciones específicas...

    return {
      isCompatible: errors.length === 0,
      errors,
      warnings,
      migrationStrategy: this.determineMigrationStrategy(v2Data)
    };
  }
}
```

### **2. Feature Flags**

```typescript
// src/app/core/services/feature-flag.service.ts
@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {
  private flags = new Map<string, boolean>();

  constructor() {
    this.initializeFlags();
  }

  isEnabled(flagName: string): boolean {
    return this.flags.get(flagName) ?? false;
  }

  private initializeFlags() {
    // Flags para migración gradual
    this.flags.set('wizard_v3_enabled', environment.features.intelligentBooking);
    this.flags.set('real_time_pricing', environment.features.realTimePricing);
    this.flags.set('conflict_detection', environment.features.conflictDetection);
    this.flags.set('ai_recommendations', environment.features.aiRecommendations);
    
    // Flags para rollback
    this.flags.set('fallback_to_v2', false);
    this.flags.set('dual_mode_enabled', true);
  }
}
```

### **3. Rollback Strategy**

```typescript
// src/app/bookings-v3/services/rollback.service.ts
@Injectable({
  providedIn: 'root'
})
export class RollbackService {
  
  /**
   * Detectar si necesitamos rollback a V2
   */
  shouldRollbackToV2(errorRate: number, userFeedback: number): boolean {
    return errorRate > 0.05 || userFeedback < 3.0;
  }

  /**
   * Ejecutar rollback a V2
   */
  executeRollback(): void {
    // Disable V3 features
    environment.features.intelligentBooking = false;
    
    // Redirect to V2 wizard
    this.router.navigate(['/bookings/wizard-v2']);
    
    // Log rollback event
    this.analytics.trackEvent('rollback_to_v2', {
      timestamp: new Date(),
      reason: 'automated_rollback'
    });
  }
}
```

---

## **🧪 Testing Strategy**

### **1. Unit Testing**

```typescript
// src/app/bookings-v3/services/smart-booking.service.spec.ts
describe('SmartBookingService', () => {
  let service: SmartBookingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SmartBookingService]
    });
    service = TestBed.inject(SmartBookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create booking successfully', () => {
    const mockBookingData: BookingWizardData = {
      // ... mock data
    };
    
    const mockResponse: BookingCreationResult = {
      success: true,
      data: { booking: { id: 123, bookingNumber: 'BOK123' } }
    };

    service.createBooking(mockBookingData).subscribe(result => {
      expect(result.success).toBeTruthy();
      expect(result.data.booking.id).toBe(123);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/bookings/smart-create`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  afterEach(() => {
    httpMock.verify();
  });
});
```

### **2. Integration Testing**

```typescript
// src/app/bookings-v3/wizard/booking-wizard.component.integration.spec.ts
describe('BookingWizard Integration', () => {
  let component: BookingWizardComponent;
  let fixture: ComponentFixture<BookingWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingWizardComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule],
      providers: [
        // Use mock services for integration tests
        { provide: SmartBookingService, useClass: SmartBookingServiceMock },
        { provide: SmartClientService, useClass: SmartClientServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingWizardComponent);
    component = fixture.componentInstance;
  });

  it('should complete full wizard flow', async () => {
    // Step 1: Client selection
    component.selectClient({ id: 1, firstName: 'Test', lastName: 'User' });
    await fixture.whenStable();
    
    // Step 2: Activity selection  
    component.selectCourse({ id: 1, title: 'Test Course' });
    await fixture.whenStable();

    // Step 3: Schedule selection
    component.selectSchedule({ dates: ['2024-01-01'], timeSlots: [1] });
    await fixture.whenStable();

    // Step 4: Participant details
    component.addParticipant({ firstName: 'John', lastName: 'Doe', age: 25 });
    await fixture.whenStable();

    // Step 5: Pricing confirmation
    component.confirmPricing();
    await fixture.whenStable();

    // Step 6: Final review and booking
    component.createBooking();
    await fixture.whenStable();

    expect(component.wizardState().currentStep).toBe(6);
    expect(component.wizardState().isComplete).toBeTruthy();
  });
});
```

### **3. E2E Testing**

```typescript
// e2e/booking-wizard.e2e-spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Wizard V3', () => {
  test('should complete booking flow for new client', async ({ page }) => {
    await page.goto('/bookings/wizard');

    // Step 1: Create new client
    await page.fill('[data-testid="client-search"]', 'New Client');
    await page.click('[data-testid="create-new-client"]');
    await page.fill('[data-testid="client-firstname"]', 'John');
    await page.fill('[data-testid="client-lastname"]', 'Doe');
    await page.fill('[data-testid="client-email"]', 'john@example.com');
    await page.click('[data-testid="next-step"]');

    // Step 2: Select course
    await page.click('[data-testid="course-1"]');
    await page.click('[data-testid="next-step"]');

    // Step 3: Select schedule
    await page.click('[data-testid="calendar-date-tomorrow"]');
    await page.click('[data-testid="timeslot-morning"]');
    await page.click('[data-testid="next-step"]');

    // Step 4: Add participants
    await page.fill('[data-testid="participant-firstname-0"]', 'John');
    await page.fill('[data-testid="participant-lastname-0"]', 'Doe');
    await page.fill('[data-testid="participant-age-0"]', '25');
    await page.selectOption('[data-testid="participant-level-0"]', 'beginner');
    await page.click('[data-testid="next-step"]');

    // Step 5: Confirm pricing
    await page.click('[data-testid="accept-terms"]');
    await page.click('[data-testid="next-step"]');

    // Step 6: Final booking
    await page.click('[data-testid="create-booking"]');
    
    // Verify success
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
    const bookingNumber = await page.locator('[data-testid="booking-number"]').textContent();
    expect(bookingNumber).toMatch(/BOK\d+/);
  });
});
```

---

## **🚀 Deployment Guide**

### **1. Build Configuration**

```json
// angular.json - configuración de build
{
  "projects": {
    "boukii-admin-panel": {
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/boukii-admin-panel",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": "src/polyfills.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.scss",
              "src/app/bookings-v3/wizard/booking-wizard.component.scss"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                }
              ],
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### **2. Docker Configuration**

```dockerfile
# Dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:prod

FROM nginx:alpine
COPY --from=build /app/dist/boukii-admin-panel /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Handle Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass https://api.boukii.com/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### **3. CI/CD Pipeline**

```yaml
# .github/workflows/deploy.yml
name: Deploy Booking System V3

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Run E2E tests
        run: npm run e2e:ci

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build:prod
      
      - name: Build Docker image
        run: docker build -t boukii-admin:${{ github.sha }} .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deploy logic here
          echo "Deploying to production..."
```

---

## **📊 Monitoring & Observability**

### **1. Error Tracking**

```typescript
// src/app/core/services/error-tracking.service.ts
@Injectable({
  providedIn: 'root'
})
export class ErrorTrackingService {
  
  /**
   * Track booking wizard errors
   */
  trackWizardError(error: any, step: number, context: any) {
    const errorData = {
      error: error.message,
      stack: error.stack,
      step,
      context,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Send to monitoring service
    this.sendToMonitoring('wizard_error', errorData);
  }

  /**
   * Track API errors
   */
  trackApiError(error: any, endpoint: string, payload: any) {
    const errorData = {
      endpoint,
      error: error.message,
      status: error.status,
      payload,
      timestamp: new Date()
    };

    this.sendToMonitoring('api_error', errorData);
  }

  private sendToMonitoring(event: string, data: any) {
    // Implement monitoring service integration
    console.error(`[${event}]`, data);
    
    // Example: Sentry integration
    // Sentry.captureException(new Error(event), { extra: data });
  }
}
```

### **2. Performance Metrics**

```typescript
// src/app/bookings-v3/services/performance.service.ts
@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metrics = new Map<string, number>();

  /**
   * Measure wizard step completion time
   */
  measureStepTime(stepName: string, startTime: number) {
    const duration = performance.now() - startTime;
    this.metrics.set(`step_${stepName}_duration`, duration);
    
    // Send to analytics
    this.trackMetric('wizard_step_duration', {
      step: stepName,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Measure API response times
   */
  measureApiResponse(endpoint: string, startTime: number) {
    const duration = performance.now() - startTime;
    this.metrics.set(`api_${endpoint}_duration`, duration);
    
    this.trackMetric('api_response_time', {
      endpoint,
      duration,
      timestamp: new Date()
    });
  }

  private trackMetric(metricName: string, data: any) {
    // Send to analytics service
    console.log(`[METRIC] ${metricName}:`, data);
  }
}
```

### **3. Business Metrics**

```typescript
// src/app/bookings-v3/services/analytics.service.ts
@Injectable({
  providedIn: 'root'
})
export class BookingAnalyticsService {
  
  /**
   * Track booking conversion funnel
   */
  trackConversionFunnel(step: number, action: 'enter' | 'exit' | 'complete') {
    const event = {
      step,
      action,
      timestamp: new Date(),
      sessionId: this.getSessionId()
    };

    this.trackEvent('conversion_funnel', event);
  }

  /**
   * Track AI recommendation usage
   */
  trackRecommendationUsage(type: string, accepted: boolean, confidence: number) {
    this.trackEvent('ai_recommendation', {
      type,
      accepted,
      confidence,
      timestamp: new Date()
    });
  }

  /**
   * Track pricing optimization
   */
  trackPricingOptimization(originalPrice: number, finalPrice: number, factors: any) {
    this.trackEvent('pricing_optimization', {
      originalPrice,
      finalPrice,
      savings: originalPrice - finalPrice,
      factors,
      timestamp: new Date()
    });
  }

  private trackEvent(eventName: string, data: any) {
    // Send to business analytics
    console.log(`[ANALYTICS] ${eventName}:`, data);
  }

  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }
}
```

---

## **✅ Checklist de Implementación**

### **Pre-Implementation**
- [ ] Revisar especificación de API V3
- [ ] Configurar ambiente de desarrollo
- [ ] Instalar dependencias adicionales
- [ ] Configurar feature flags

### **Development Phase**
- [ ] Implementar servicios reales
- [ ] Configurar interceptors HTTP  
- [ ] Implementar manejo de errores
- [ ] Crear tests unitarios
- [ ] Configurar mocks para desarrollo

### **Testing Phase**
- [ ] Tests unitarios (>80% coverage)
- [ ] Tests de integración
- [ ] Tests E2E críticos
- [ ] Performance testing
- [ ] Security testing

### **Pre-Production**
- [ ] Configurar monitoring
- [ ] Configurar alertas
- [ ] Preparar rollback plan
- [ ] Documentar runbooks
- [ ] Training del equipo

### **Production Deployment**
- [ ] Feature flag gradual rollout
- [ ] Monitor error rates
- [ ] Validar métricas de negocio
- [ ] Recopilar feedback usuarios
- [ ] Documentar lecciones aprendidas

---

## **📞 Contacto y Soporte**

Para implementación y soporte técnico:

- **Equipo Frontend**: frontend-team@boukii.com
- **Equipo Backend**: backend-team@boukii.com  
- **DevOps**: devops-team@boukii.com
- **QA**: qa-team@boukii.com

**Documentación adicional disponible en**:
- [API Specification](./booking-system-v3-api-specification.md)
- [Demo Setup Guide](./DEMO-SETUP.md)
- [Frontend API Usage](./frontend-api-usage.md)

---

**¡Sistema listo para implementación en producción!** 🚀