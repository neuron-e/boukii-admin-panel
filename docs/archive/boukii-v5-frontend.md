# Boukii V5 Frontend - Documentación Técnica Completa

**Versión:** 1.0.0  
**Fecha:** 2025-01-06  
**Última Actualización:** Estandarización completa V5  

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Convenciones y Estándares](#convenciones-y-estándares)
4. [Sistema de Rutas y Guards](#sistema-de-rutas-y-guards)
5. [Patrón de Servicios](#patrón-de-servicios)
6. [Gestión de Contexto](#gestión-de-contexto)
7. [Internacionalización](#internacionalización)
8. [Nomenclatura Frontend ↔ Backend](#nomenclatura-frontend--backend)
9. [Ejemplos Completos](#ejemplos-completos)
10. [Testing](#testing)
11. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Introducción

El módulo **Boukii V5** es una refactorización completa del sistema frontend Angular que introduce:

- **Arquitectura modular** con separación clara de responsabilidades
- **Sistema de permisos jerárquicos** basado en contexto escuela/temporada
- **Integración perfecta** con la API V5 del backend
- **Manejo centralizado** de autenticación, contexto y errores
- **Internacionalización robusta** con soporte multi-idioma
- **Patrones estandarizados** para servicios, componentes y routing

### Objetivos del V5

1. ✅ **Consistencia**: Unificación total frontend-backend
2. ✅ **Escalabilidad**: Arquitectura modular para crecimiento
3. ✅ **Mantenibilidad**: Patrones claros y documentados
4. ✅ **Seguridad**: Sistema robusto de permisos y guards
5. ✅ **UX/UI**: Interfaz moderna e intuitiva

---

## 📂 Estructura de Carpetas

```
src/app/v5/
├── 📁 components/               # Componentes compartidos V5
│   ├── navbar/
│   └── sidebar/
├── 📁 core/                     # Servicios core y utilidades
│   ├── guards/                  # Guards de autenticación y contexto
│   │   ├── auth-v5.guard.ts
│   │   ├── season-context.guard.ts
│   │   └── permissions-v5.guard.ts
│   ├── interceptors/            # HTTP Interceptors
│   │   └── auth-v5.interceptor.ts
│   ├── models/                  # Interfaces y tipos TypeScript
│   │   ├── api-response.interface.ts
│   │   ├── user.interface.ts
│   │   └── season.interface.ts
│   ├── services/                # Servicios core del sistema
│   │   ├── api-v5.service.ts    # Servicio HTTP centralizado
│   │   ├── auth-v5.service.ts   # Autenticación V5
│   │   ├── season-context.service.ts
│   │   ├── dashboard.service.ts
│   │   └── logging.service.ts
│   └── utils/                   # Utilidades y helpers
├── 📁 features/                 # Módulos de funcionalidades
│   ├── auth/                    # Autenticación y login
│   ├── schools/                 # Gestión de escuelas
│   ├── seasons/                 # Gestión de temporadas
│   ├── bookings/                # Gestión de reservas
│   ├── clients/                 # Gestión de clientes
│   ├── courses/                 # Gestión de cursos
│   ├── monitors/                # Gestión de monitores
│   ├── analytics/               # Analytics avanzados
│   ├── communications/          # Sistema de comunicaciones
│   ├── equipment/               # Gestión de equipamiento
│   ├── payments/                # Pagos y facturación
│   ├── planner/                 # Planificador de horarios
│   ├── reports/                 # Reportes y estadísticas
│   └── settings/                # Configuración del sistema
├── 📁 pages/                    # Páginas principales
│   ├── welcome/                 # Dashboard principal V5
│   └── dashboard/               # Dashboard alternativo
├── 📁 shared/                   # Componentes compartidos específicos V5
│   └── components/
│       ├── season-selector/
│       └── insufficient-permissions/
├── v5-routing.module.ts         # Routing principal V5
└── v5.module.ts                 # Módulo principal V5
```

### Convenciones de Nomenclatura

#### Archivos y Carpetas
- **Módulos**: `kebab-case` (ej: `school-season-settings`)
- **Componentes**: `kebab-case.component.ts`
- **Servicios**: `kebab-case.service.ts`
- **Guards**: `kebab-case.guard.ts`
- **Interfaces**: `kebab-case.interface.ts`

#### Clases y Interfaces
- **Componentes**: `PascalCase` + `Component` (ej: `LoginComponent`)
- **Servicios**: `PascalCase` + `Service` (ej: `ApiV5Service`)
- **Guards**: `PascalCase` + `Guard` (ej: `AuthV5Guard`)
- **Interfaces**: `PascalCase` (ej: `Season`, `School`)

---

## 🔐 Sistema de Rutas y Guards

### Jerarquía de Protección

El sistema V5 implementa **4 niveles jerárquicos** de protección:

#### **Nivel 1: Acceso Público**
```typescript
// Sin guards - acceso libre
{
  path: 'login',
  component: LoginComponent
}
```

#### **Nivel 2: Autenticación Básica** 
```typescript
// Solo usuarios autenticados
{
  path: 'profile',
  canActivate: [AuthV5Guard],
  component: ProfileComponent
}
```

#### **Nivel 3: Contexto de Escuela**
```typescript
// Usuario autenticado + contexto escuela válido
{
  path: 'seasons',
  canActivate: [AuthV5Guard],
  loadChildren: () => import('./features/seasons/seasons.module').then(m => m.SeasonsModule)
}
```

#### **Nivel 4: Contexto Completo (Escuela + Temporada)**
```typescript
// Máximo nivel: usuario + escuela + temporada activa
{
  path: 'bookings',
  canActivate: [AuthV5Guard, SeasonContextGuard],
  loadChildren: () => import('./features/bookings/bookings.module').then(m => m.BookingsModule)
}
```

### Estructura de Routing Completa

```typescript
// src/app/v5/v5-routing.module.ts
const routes: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full'
  },
  
  // 🏠 PÁGINAS PRINCIPALES - Nivel 4
  {
    path: 'welcome',
    canActivate: [AuthV5Guard, SeasonContextGuard],
    loadChildren: () =>
      import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent)
  },
  
  // 🔐 AUTENTICACIÓN - Nivel 1 (Público)
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  
  // 🏫 GESTIÓN DE ESCUELAS - Nivel 3 (Contexto Escuela)
  {
    path: 'schools',
    canActivate: [AuthV5Guard],
    loadChildren: () =>
      import('./features/schools/schools.module').then(m => m.SchoolsModule)
  },
  
  // 📅 TEMPORADAS - Nivel 3 (Contexto Escuela)
  {
    path: 'seasons',
    canActivate: [AuthV5Guard],
    loadChildren: () =>
      import('./features/seasons/seasons.module').then(m => m.SeasonsModule)
  },
  
  // 📚 RESERVAS - Nivel 4 (Contexto Completo)
  {
    path: 'bookings',
    canActivate: [AuthV5Guard, SeasonContextGuard],
    loadChildren: () =>
      import('./features/bookings/bookings.module').then(m => m.BookingsModule)
  },
  
  // 👥 CLIENTES - Nivel 4 (Contexto Completo)
  {
    path: 'clients',
    canActivate: [AuthV5Guard, SeasonContextGuard],
    loadChildren: () =>
      import('./features/clients/clients.module').then(m => m.ClientsModule)
  },
  
  // 🎓 CURSOS - Nivel 4 (Contexto Completo)
  {
    path: 'courses',
    canActivate: [AuthV5Guard, SeasonContextGuard],
    loadChildren: () =>
      import('./features/courses/courses.module').then(m => m.CoursesModule)
  },
  
  // 👨‍🏫 MONITORES - Nivel 4 (Contexto Completo)
  {
    path: 'monitors',
    canActivate: [AuthV5Guard, SeasonContextGuard],
    loadChildren: () =>
      import('./features/monitors/monitors.module').then(m => m.MonitorsModule)
  },
  
  // 📊 ANALYTICS - Nivel 4 (Contexto Completo)
  {
    path: 'analytics',
    canActivate: [AuthV5Guard, SeasonContextGuard],
    loadChildren: () =>
      import('./features/analytics/analytics.module').then(m => m.AnalyticsModule)
  },
  
  // COMPATIBILIDAD LEGACY
  {
    path: 'reservations',
    redirectTo: 'bookings',
    pathMatch: 'full'
  }
];
```

### Implementación de Guards

#### **AuthV5Guard**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthV5Guard implements CanActivate {
  constructor(
    private authService: AuthV5Service,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (user) {
          return true;
        }
        
        this.router.navigate(['/v5/auth/login']);
        return false;
      }),
      take(1)
    );
  }
}
```

#### **SeasonContextGuard**
```typescript
@Injectable({ providedIn: 'root' })
export class SeasonContextGuard implements CanActivate {
  constructor(
    private seasonContext: SeasonContextService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.seasonContext.currentSeason$.pipe(
      map(season => {
        if (season) {
          return true;
        }
        
        this.router.navigate(['/v5/seasons/select']);
        return false;
      }),
      take(1)
    );
  }
}
```

---

## ⚙️ Patrón de Servicios

### Estructura Estándar de Servicios V5

Todos los servicios V5 siguen el mismo patrón estandarizado:

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiV5Service, ApiV5Response } from '../../../core/services/api-v5.service';
import { SeasonContextService } from '../../../core/services/season-context.service';

export interface [Entity] {
  id: number;
  season_id?: number;
  // ... campos específicos
  created_at: string;
  updated_at: string;
}

export interface Create[Entity]Request {
  // ... campos requeridos para crear
}

@Injectable({ providedIn: 'root' })
export class [Entity]Service {
  constructor(
    private apiV5: ApiV5Service,
    private seasonContext: SeasonContextService // Opcional según necesidad
  ) {}

  // OPERACIONES CRUD ESTÁNDAR
  
  get[Entity]s(): Observable<[Entity][]> {
    const seasonId = this.seasonContext.getCurrentSeasonId();
    const params = seasonId ? { season_id: seasonId } : undefined;

    return this.apiV5.get<ApiV5Response<[Entity][]>>('[entities]', params).pipe(
      map(response => response.success ? response.data : []),
      tap(entities => console.log(`[[Entity]Service] Loaded ${entities.length} entities`)),
      catchError(error => {
        console.error('[[Entity]Service] Error loading entities:', error);
        throw error;
      })
    );
  }

  get[Entity]ById(id: number): Observable<[Entity]> {
    return this.apiV5.get<ApiV5Response<[Entity]>>(`[entities]/${id}`).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error('[Entity] not found');
      }),
      tap(entity => console.log(`[[Entity]Service] Loaded entity:`, entity)),
      catchError(error => {
        console.error('[[Entity]Service] Error loading entity:', error);
        throw error;
      })
    );
  }

  create[Entity](data: Create[Entity]Request): Observable<[Entity]> {
    const seasonId = this.seasonContext.getCurrentSeasonId();
    const payload = seasonId ? { ...data, season_id: seasonId } : data;

    return this.apiV5.post<ApiV5Response<[Entity]>>('[entities]', payload).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to create [entity]');
      }),
      tap(entity => console.log(`[[Entity]Service] Created entity:`, entity)),
      catchError(error => {
        console.error('[[Entity]Service] Error creating entity:', error);
        throw error;
      })
    );
  }

  update[Entity](id: number, data: Partial<[Entity]>): Observable<[Entity]> {
    return this.apiV5.put<ApiV5Response<[Entity]>>(`[entities]/${id}`, data).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to update [entity]');
      }),
      tap(entity => console.log(`[[Entity]Service] Updated entity:`, entity)),
      catchError(error => {
        console.error('[[Entity]Service] Error updating entity:', error);
        throw error;
      })
    );
  }

  delete[Entity](id: number): Observable<void> {
    return this.apiV5.delete<ApiV5Response<void>>(`[entities]/${id}`).pipe(
      map(response => {
        if (!response.success) {
          throw new Error('Failed to delete [entity]');
        }
      }),
      tap(() => console.log(`[[Entity]Service] Deleted entity ${id}`)),
      catchError(error => {
        console.error('[[Entity]Service] Error deleting entity:', error);
        throw error;
      })
    );
  }
}
```

### ApiV5Service - Servicio HTTP Centralizado

```typescript
@Injectable({ providedIn: 'root' })
export class ApiV5Service {
  private baseUrlV5 = `${environment.apiUrl}/v5`;

  constructor(
    private http: HttpClient,
    private seasonContext: SeasonContextService,
    private notification: NotificationService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('boukiiUserToken')?.replace(/^["']|["']$/g, '');
    const seasonId = this.seasonContext.getCurrentSeasonId();

    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (seasonId !== null) {
      headers = headers.set('X-Season-Id', String(seasonId));
    }
    
    return headers.set('X-Client-Version', 'boukii-admin-v5.0');
  }

  // Métodos HTTP estándar
  get<T>(endpoint: string, params?: any): Observable<T> {
    // Implementación completa con headers, params y error handling
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    // Implementación completa
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    // Implementación completa
  }

  delete<T>(endpoint: string): Observable<T> {
    // Implementación completa
  }
}
```

---

## 🔄 Gestión de Contexto

### SeasonContextService

Gestiona el contexto de temporada activa en toda la aplicación:

```typescript
@Injectable({ providedIn: 'root' })
export class SeasonContextService {
  private currentSeasonSubject = new BehaviorSubject<Season | null>(null);
  private currentSchoolSubject = new BehaviorSubject<School | null>(null);

  // Observables públicos
  currentSeason$ = this.currentSeasonSubject.asObservable();
  currentSchool$ = this.currentSchoolSubject.asObservable();

  // Métodos de gestión
  setCurrentSeason(season: Season): void {
    this.currentSeasonSubject.next(season);
    this.updateLocalStorage(season);
  }

  getCurrentSeasonId(): number | null {
    return this.currentSeasonSubject.value?.id || null;
  }

  // Persistencia en localStorage
  private updateLocalStorage(season: Season): void {
    localStorage.setItem('currentSeason', JSON.stringify(season));
  }
}
```

### AuthV5Service

Maneja la autenticación con flujo de selección de temporada:

```typescript
@Injectable({ providedIn: 'root' })
export class AuthV5Service {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  // Flujo de login inicial (sin temporada)
  initialLogin(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/initial-login`, credentials);
  }

  // Selección de temporada
  selectSeason(seasonData: SeasonSelection): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/select-season`, seasonData);
  }

  // Login tradicional (con temporada)
  login(credentials: FullLoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);
  }
}
```

---

## 🌐 Internacionalización

### Configuración TranslateModule

```typescript
// v5.module.ts
@NgModule({
  imports: [
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
      isolate: false
    })
  ]
})
export class V5Module {}
```

### Estructura de Traducciones

```json
// src/assets/i18n/es.json
{
  "DASHBOARD": {
    "GREETING": "¡Hola, {{name}}!",
    "WELCOME_MESSAGE": "Bienvenido al panel de administración de {{school}}",
    
    "QUICK_ACTIONS": {
      "TITLE": "Acciones Rápidas",
      "NEW_BOOKING": "Nueva Reserva",
      "NEW_CLIENT": "Nuevo Cliente"
    },
    
    "STATS": {
      "BOOKINGS": {
        "TITLE": "Reservas",
        "TOTAL": "Total",
        "PENDING": "Pendientes",
        "CONFIRMED": "Confirmadas"
      }
    },
    
    "ERRORS": {
      "GENERAL_ERROR": "Error al cargar el dashboard",
      "RETRY": "Reintentar"
    }
  }
}
```

### Uso en Componentes

```typescript
export class WelcomeComponent implements OnInit {
  constructor(private translate: TranslateService) {}

  ngOnInit() {
    // Uso directo
    const greeting = this.translate.instant('DASHBOARD.GREETING', { name: 'Usuario' });
    
    // Con observable
    this.translate.get('DASHBOARD.ERRORS.GENERAL_ERROR').subscribe(
      message => console.log(message)
    );
  }
}
```

---

## 🔗 Nomenclatura Frontend ↔ Backend

### Correspondencia Exacta de Endpoints

| **Frontend Route** | **Backend Endpoint** | **Descripción** |
|-------------------|---------------------|----------------|
| `/v5/auth/login` | `POST /api/v5/auth/login` | Login tradicional |
| `/v5/auth/select-season` | `POST /api/v5/auth/select-season` | Selección temporada |
| `/v5/welcome` | `GET /api/v5/dashboard/stats` | Dashboard principal |
| `/v5/seasons` | `GET /api/v5/seasons` | Lista temporadas |
| `/v5/schools` | `GET /api/v5/schools` | Lista escuelas |
| `/v5/bookings` | `GET /api/v5/bookings` | Gestión reservas |
| `/v5/clients` | `GET /api/v5/clients` | Gestión clientes |
| `/v5/courses` | `GET /api/v5/courses` | Gestión cursos |
| `/v5/monitors` | `GET /api/v5/monitors` | Gestión monitores |

### Convenciones de Nomenclatura

#### ✅ **Correcto** - Terminología Unificada
- **`bookings`** (reservas) - ❌ NO `reservations`
- **`clients`** (clientes) - ❌ NO `customers` o `users`
- **`monitors`** (monitores) - ❌ NO `instructors` o `teachers`
- **`courses`** (cursos) - ❌ NO `lessons` o `classes`
- **`seasons`** (temporadas) - ❌ NO `periods` o `terms`

#### Headers Automáticos
```typescript
// Enviados automáticamente en cada request
{
  "Authorization": "Bearer {jwt_token}",
  "X-Season-Id": "{current_season_id}",
  "X-School-Id": "{current_school_id}",
  "X-Client-Version": "boukii-admin-v5.0",
  "X-Client-Type": "angular-admin"
}
```

---

## 📝 Ejemplos Completos

### Ejemplo: Componente + Servicio Completo

#### **CourseListComponent**
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourseService, CourseGroup } from '../services/course.service';

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss']
})
export class CourseListComponent implements OnInit, OnDestroy {
  courses: CourseGroup[] = [];
  loading = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private courseService: CourseService,
    private translate: TranslateService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCourses(): void {
    this.loading = true;
    this.error = null;

    this.courseService.getCourseGroups()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (courses) => {
          this.courses = courses;
          console.log(`Loaded ${courses.length} courses`);
        },
        error: (error) => {
          this.error = this.translate.instant('COURSES.ERRORS.LOAD_FAILED');
          console.error('Error loading courses:', error);
          
          this.snackBar.open(
            this.translate.instant('COURSES.ERRORS.LOAD_FAILED'),
            this.translate.instant('COMMON.CLOSE'),
            { duration: 5000 }
          );
        }
      });
  }

  onCreateCourse(): void {
    // Lógica para crear curso
  }

  onDeleteCourse(id: number): void {
    if (!confirm(this.translate.instant('COURSES.CONFIRM.DELETE'))) {
      return;
    }

    this.courseService.deleteCourse(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('COURSES.MESSAGES.DELETE_SUCCESS'),
            this.translate.instant('COMMON.CLOSE'),
            { duration: 3000 }
          );
          this.loadCourses(); // Recargar lista
        },
        error: (error) => {
          console.error('Error deleting course:', error);
          this.snackBar.open(
            this.translate.instant('COURSES.ERRORS.DELETE_FAILED'),
            this.translate.instant('COMMON.CLOSE'),
            { duration: 5000 }
          );
        }
      });
  }
}
```

#### **Template Correspondiente**
```html
<!-- course-list.component.html -->
<div class="course-list-container">
  <!-- Header -->
  <div class="header-section">
    <h1>{{ 'COURSES.TITLE' | translate }}</h1>
    <button 
      mat-raised-button 
      color="primary" 
      (click)="onCreateCourse()"
      [disabled]="loading">
      <mat-icon>add</mat-icon>
      {{ 'COURSES.NEW' | translate }}
    </button>
  </div>

  <!-- Loading State -->
  <div *ngIf="loading" class="loading-section">
    <mat-progress-spinner diameter="40"></mat-progress-spinner>
    <p>{{ 'COMMON.LOADING' | translate }}</p>
  </div>

  <!-- Error State -->
  <div *ngIf="error && !loading" class="error-section">
    <mat-icon color="warn">error</mat-icon>
    <p>{{ error }}</p>
    <button mat-button (click)="loadCourses()">
      {{ 'COMMON.RETRY' | translate }}
    </button>
  </div>

  <!-- Content -->
  <div *ngIf="!loading && !error" class="content-section">
    <!-- Empty State -->
    <div *ngIf="courses.length === 0" class="empty-state">
      <mat-icon>school</mat-icon>
      <h3>{{ 'COURSES.EMPTY.TITLE' | translate }}</h3>
      <p>{{ 'COURSES.EMPTY.DESCRIPTION' | translate }}</p>
    </div>

    <!-- Course Grid -->
    <div *ngIf="courses.length > 0" class="course-grid">
      <mat-card *ngFor="let course of courses" class="course-card">
        <mat-card-header>
          <mat-card-title>{{ course.name }}</mat-card-title>
          <mat-card-subtitle>
            {{ 'COURSES.LEVEL' | translate }}: {{ course.level }} | 
            {{ 'COURSES.CATEGORY' | translate }}: {{ course.category }}
          </mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <p *ngIf="course.description">{{ course.description }}</p>
          <div class="course-stats">
            <span>💰 {{ course.price }}€</span>
            <span>⏱️ {{ course.duration_minutes }}min</span>
            <span>👥 {{ course.max_participants }} max</span>
          </div>
        </mat-card-content>
        
        <mat-card-actions align="end">
          <button mat-button [routerLink]="['/v5/courses', course.id]">
            {{ 'COMMON.VIEW' | translate }}
          </button>
          <button mat-button [routerLink]="['/v5/courses', course.id, 'edit']">
            {{ 'COMMON.EDIT' | translate }}
          </button>
          <button 
            mat-button 
            color="warn" 
            (click)="onDeleteCourse(course.id)">
            {{ 'COMMON.DELETE' | translate }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  </div>
</div>
```

---

## 🧪 Testing

### Configuración Base Testing

#### **Karma Configuration**
```javascript
// karma.conf.js
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-headless'),
      require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    files: [
      'src/setup-jest.ts' // Mock setup
    ],
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, './coverage/boukii-admin-panel'),
      reports: ['html', 'lcovonly', 'text-summary'],
      fixWebpackSourcePaths: true
    },
    browsers: ['ChromeHeadless'],
    singleRun: true
  });
};
```

#### **Jest Configuration (Opcional)**
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testMatch: [
    '<rootDir>/src/app/v5/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/app/v5/**/*.ts',
    '!src/app/v5/**/*.spec.ts',
    '!src/app/v5/**/*.module.ts'
  ],
  coverageDirectory: 'coverage/v5',
  coverageReporters: ['html', 'text', 'lcov'],
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@env/(.*)$': '<rootDir>/src/environments/$1'
  }
};
```

### Ejemplo Test Unitario Completo

```typescript
// course.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CourseService, CourseGroup, CreateCourseRequest } from './course.service';
import { ApiV5Service } from '../../../core/services/api-v5.service';
import { SeasonContextService } from '../../../core/services/season-context.service';
import { environment } from '../../../../environments/environment';

describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;
  let mockSeasonContextService: jasmine.SpyObj<SeasonContextService>;
  let mockApiV5Service: jasmine.SpyObj<ApiV5Service>;

  const mockCourse: CourseGroup = {
    id: 1,
    season_id: 1,
    name: 'Surf Iniciación',
    description: 'Curso básico de surf',
    category: 'Surf',
    level: 'Beginner',
    duration_minutes: 120,
    max_participants: 8,
    min_participants: 2,
    price: 45.00,
    is_active: true,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z'
  };

  beforeEach(() => {
    const seasonSpy = jasmine.createSpyObj('SeasonContextService', ['getCurrentSeasonId']);
    const apiV5Spy = jasmine.createSpyObj('ApiV5Service', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CourseService,
        { provide: SeasonContextService, useValue: seasonSpy },
        { provide: ApiV5Service, useValue: apiV5Spy }
      ]
    });

    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
    mockSeasonContextService = TestBed.inject(SeasonContextService) as jasmine.SpyObj<SeasonContextService>;
    mockApiV5Service = TestBed.inject(ApiV5Service) as jasmine.SpyObj<ApiV5Service>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getCourseGroups', () => {
    it('should return courses with season context', (done) => {
      // Arrange
      const mockResponse = {
        success: true,
        data: [mockCourse]
      };
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(1);
      mockApiV5Service.get.and.returnValue(of(mockResponse));

      // Act
      service.getCourseGroups().subscribe(courses => {
        // Assert
        expect(courses).toEqual([mockCourse]);
        expect(mockApiV5Service.get).toHaveBeenCalledWith('courses', { season_id: 1 });
        expect(courses.length).toBe(1);
        expect(courses[0].name).toBe('Surf Iniciación');
        done();
      });
    });

    it('should handle API errors gracefully', (done) => {
      // Arrange
      const errorMessage = 'Server error';
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(1);
      mockApiV5Service.get.and.returnValue(throwError(errorMessage));

      // Act & Assert
      service.getCourseGroups().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBe(errorMessage);
          done();
        }
      });
    });
  });

  describe('createCourse', () => {
    it('should create course with season context', (done) => {
      // Arrange
      const createRequest: CreateCourseRequest = {
        name: 'Nuevo Curso',
        description: 'Descripción del curso',
        category: 'Surf',
        level: 'Intermediate',
        duration_minutes: 90,
        max_participants: 6,
        min_participants: 3,
        price: 55.00
      };
      
      const expectedPayload = {
        ...createRequest,
        season_id: 1
      };

      const mockResponse = {
        success: true,
        data: { ...mockCourse, ...createRequest, id: 2 }
      };

      mockSeasonContextService.getCurrentSeasonId.and.returnValue(1);
      mockApiV5Service.post.and.returnValue(of(mockResponse));

      // Act
      service.createCourse(createRequest).subscribe(course => {
        // Assert
        expect(course.name).toBe('Nuevo Curso');
        expect(mockApiV5Service.post).toHaveBeenCalledWith('courses', expectedPayload);
        done();
      });
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', (done) => {
      // Arrange
      const courseId = 1;
      const mockResponse = { success: true };
      mockApiV5Service.delete.and.returnValue(of(mockResponse));

      // Act
      service.deleteCourse(courseId).subscribe(() => {
        // Assert
        expect(mockApiV5Service.delete).toHaveBeenCalledWith(`courses/${courseId}`);
        done();
      });
    });

    it('should handle delete failure', (done) => {
      // Arrange
      const courseId = 1;
      const mockResponse = { success: false };
      mockApiV5Service.delete.and.returnValue(of(mockResponse));

      // Act & Assert
      service.deleteCourse(courseId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to delete course');
          done();
        }
      });
    });
  });
});
```

---

## 🎯 Mejores Prácticas

### 1. **Arquitectura y Organización**
- ✅ Un módulo por funcionalidad principal
- ✅ Servicios inyectables con `providedIn: 'root'`
- ✅ Interfaces TypeScript para todos los datos
- ✅ Separación clara entre presentación y lógica

### 2. **Manejo de Errores**
- ✅ `catchError` en todos los observables HTTP
- ✅ Logging centralizado con `LoggingService`
- ✅ Mensajes de error traducidos
- ✅ Fallbacks y estados de error en UI

### 3. **Performance**
- ✅ Lazy loading para todos los módulos
- ✅ OnPush change detection donde sea posible
- ✅ `takeUntil` para prevenir memory leaks
- ✅ `shareReplay` para cachear requests comunes

### 4. **Seguridad**
- ✅ Guards en todas las rutas sensibles
- ✅ Headers de autenticación automáticos
- ✅ Validación de contexto en cada request
- ✅ Sanitización de inputs

### 5. **Testing**
- ✅ Cobertura mínima del 80% en servicios core
- ✅ Mocks para todas las dependencias externas
- ✅ Tests E2E para flujos críticos
- ✅ Configuración CI/CD con tests automáticos

### 6. **Documentación**
- ✅ TSDoc en métodos públicos complejos
- ✅ README por módulo con ejemplos
- ✅ Changelog con breaking changes
- ✅ Documentación de APIs actualizada

---

## 📚 Recursos y Referencias

### Documentación Oficial
- [Angular Style Guide](https://angular.io/guide/styleguide)
- [RxJS Best Practices](https://rxjs.dev/guide/operators)
- [Angular Testing Guide](https://angular.io/guide/testing)

### Herramientas de Desarrollo
- **VS Code Extensions**: Angular Language Service, Auto Rename Tag
- **Chrome Extensions**: Angular DevTools, Redux DevTools
- **CLI Commands**: `ng generate`, `ng test`, `ng build --prod`

### APIs Backend V5
- **Base URL**: `${environment.apiUrl}/v5`
- **Documentación**: `/docs/api/v5-overview.md`
- **Postman Collection**: Disponible en el equipo

---

**📝 Documento actualizado:** 2025-01-06  
**✅ Estado:** Estandarización V5 Completa  
**🔄 Próxima revisión:** Tras implementación de nuevas funcionalidades