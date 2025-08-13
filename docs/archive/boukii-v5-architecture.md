# Boukii V5 - Arquitectura del Sistema

## 📋 Índice
1. [Visión General](#visión-general)
2. [Estructura Frontend Angular](#estructura-frontend-angular)
3. [Estructura Backend Laravel](#estructura-backend-laravel)
4. [Arquitectura de Módulos](#arquitectura-de-módulos)
5. [Convenciones de Código](#convenciones-de-código)
6. [Estado Actual de Módulos](#estado-actual-de-módulos)
7. [Componentes Legacy](#componentes-legacy)
8. [Infraestructura Transversal](#infraestructura-transversal)
9. [Recomendaciones y Mejoras](#recomendaciones-y-mejoras)
10. [Plan de Acción](#plan-de-acción)

---

## Visión General

Boukii V5 es una plataforma modular de gestión para escuelas deportivas que implementa una arquitectura **multi-tenant** basada en escuelas y temporadas (seasons). El sistema está diseñado para ser escalable, mantenible y compatible con sistemas legacy existentes.

### Tecnologías Base
- **Frontend**: Angular 16 + TypeScript + TailwindCSS + Angular Material
- **Backend**: Laravel 10 + PHP 8.1+ + MySQL
- **Autenticación**: Laravel Sanctum + JWT
- **Permisos**: Spatie Laravel Permission
- **Multi-tenancy**: School-based isolation + Season context

### Principios Arquitectónicos
1. **Modularidad**: Cada funcionalidad como módulo independiente
2. **Multi-tenancy**: Aislamiento por escuela y temporada
3. **Escalabilidad**: Diseño para crecimiento horizontal
4. **Mantenibilidad**: Código limpio y documentado
5. **Compatibilidad**: Convivencia con sistemas legacy

---

## Estructura Frontend Angular

### Organización Principal
```
src/
├── @vex/                           # Framework Vex Theme
│   ├── components/                 # Componentes base Vex
│   ├── layout/                     # Layouts del sistema
│   └── styles/                     # Estilos globales
├── app/
│   ├── core/                       # 🔧 Core services legacy
│   │   ├── services/              
│   │   └── guards/                
│   ├── pages/                      # 📱 Páginas legacy
│   │   ├── analytics/             
│   │   ├── bookings/              
│   │   ├── courses/               
│   │   └── [otros módulos legacy]
│   ├── service/                    # 🔧 Servicios legacy globales
│   │   ├── api.service.ts         
│   │   └── auth.service.ts        
│   └── v5/                         # 🚀 Nueva arquitectura V5
│       ├── core/                   # Núcleo V5
│       ├── features/               # Módulos de características
│       ├── shared/                 # Componentes compartidos
│       └── design-system/          # Sistema de diseño
├── assets/                         # Recursos estáticos
├── environments/                   # Configuraciones entorno
└── styles/                         # Estilos globales proyecto
```

### Arquitectura V5 Detallada

#### Core V5 (`src/app/v5/core/`)
```
core/
├── guards/                         # Guards de seguridad
│   ├── auth-v5.guard.ts           # Autenticación V5
│   ├── season-context.guard.ts    # Contexto de temporada
│   └── role-hierarchy.guard.ts    # Jerarquía de roles
├── interceptors/                   # Interceptores HTTP
│   ├── auth-v5.interceptor.ts     # Headers autenticación
│   ├── loading.interceptor.ts     # Estado de carga
│   ├── error.interceptor.ts       # Manejo errores
│   └── cache.interceptor.ts       # Cache responses
├── services/                       # Servicios centrales
│   ├── api-v5.service.ts          # Cliente HTTP principal
│   ├── auth-v5.service.ts         # Autenticación V5
│   ├── season-context.service.ts  # Contexto temporada
│   ├── notification.service.ts    # Notificaciones
│   └── permission.service.ts      # Gestión permisos
├── models/                         # Interfaces y tipos
│   ├── auth.interface.ts          # Tipos autenticación
│   ├── season.interface.ts        # Tipos temporada
│   ├── booking.interface.ts       # Tipos reservas
│   └── [otros interfaces]
└── utils/                          # Utilidades
    ├── validators.ts              # Validadores custom
    ├── date.utils.ts              # Utilidades fecha
    └── format.utils.ts            # Formateo datos
```

#### Features V5 (`src/app/v5/features/`)
```
features/
├── analytics/                      # 📊 Módulo Analytics
│   ├── analytics.module.ts        
│   ├── analytics-routing.module.ts
│   ├── components/                
│   │   ├── dashboard/             
│   │   ├── reports/               
│   │   └── charts/                
│   └── services/                  
│       └── analytics.service.ts   
├── auth/                          # 🔐 Módulo Autenticación
├── bookings/                      # 📅 Módulo Reservas
├── clients/                       # 👥 Módulo Clientes
├── communications/                # 💬 Módulo Comunicaciones
├── courses/                       # 🎓 Módulo Cursos
├── equipment/                     # 🎿 Módulo Equipamiento
├── monitors/                      # 👨‍🏫 Módulo Monitores
├── payments/                      # 💳 Módulo Pagos
├── planner/                       # 📋 Módulo Planificador
├── reports/                       # 📈 Módulo Reportes
├── schools/                       # 🏫 Módulo Escuelas
├── seasons/                       # 📆 Módulo Temporadas
└── settings/                      # ⚙️ Módulo Configuración
```

#### Shared V5 (`src/app/v5/shared/`)
```
shared/
├── components/                     # Componentes reutilizables
│   ├── ui/                        # Componentes UI básicos
│   │   ├── button/               
│   │   ├── card/                 
│   │   ├── modal/                
│   │   └── table/                
│   ├── forms/                     # Componentes formularios
│   │   ├── date-picker/          
│   │   ├── select/               
│   │   └── validation/           
│   └── business/                  # Componentes negocio
│       ├── season-selector/      
│       ├── school-context/       
│       └── permission-checker/   
├── directives/                    # Directivas custom
│   ├── permission.directive.ts   # Control permisos
│   ├── loading.directive.ts      # Estados carga
│   └── tooltip.directive.ts      # Tooltips
├── pipes/                         # Pipes custom
│   ├── currency.pipe.ts          # Formato moneda
│   ├── date-format.pipe.ts       # Formato fecha
│   └── permission.pipe.ts        # Filtro permisos
└── validators/                    # Validadores
    ├── season.validators.ts      # Validación temporadas
    └── business.validators.ts    # Validación negocio
```

---

## Estructura Backend Laravel

### Organización Principal
```
app/
├── Console/                        # Comandos Artisan
│   └── Commands/                  
│       ├── V5DataMigration.php    # Migración datos V5
│       └── SystemHealthCheck.php  # Verificación sistema
├── Http/                          # Capa HTTP
│   ├── Controllers/               # 📱 Controladores legacy
│   │   ├── Admin/                # Admin legacy
│   │   ├── API/                  # API legacy
│   │   └── [otros controladores]
│   ├── Middleware/                # Middleware global
│   │   ├── Authenticate.php      
│   │   ├── VerifyCsrfToken.php   
│   │   └── TrustProxies.php      
│   ├── Requests/                  # Form requests
│   └── Resources/                 # API resources
├── Models/                        # 🗄️ Modelos Eloquent legacy
│   ├── User.php                  
│   ├── School.php                
│   ├── Season.php                
│   └── [otros modelos]
├── Repositories/                  # 🗃️ Patrón Repository
├── Services/                      # 🔧 Servicios de negocio
└── V5/                           # 🚀 Nueva arquitectura V5
    ├── Base/                     # Clases base V5
    ├── Modules/                  # Módulos V5
    ├── Middleware/               # Middleware V5
    └── Services/                 # Servicios V5
```

### Arquitectura V5 Backend Detallada

#### Base V5 (`app/V5/Base/`)
```
Base/
├── Controllers/                   # Controladores base
│   ├── BaseController.php        # Controller base común
│   └── BaseResourceController.php # CRUD base
├── Models/                        # Modelos base
│   ├── BaseModel.php             # Modelo base común
│   └── BaseSeasonModel.php       # Modelo con season context
├── Repositories/                  # Repositories base
│   ├── BaseRepository.php        # Repository base
│   └── BaseSeasonRepository.php  # Repository season-aware
├── Services/                      # Servicios base
│   ├── BaseService.php           # Servicio base
│   └── BaseSeasonService.php     # Servicio season-aware
├── Requests/                      # Requests base
│   └── BaseFormRequest.php       # Form request base
└── Traits/                        # Traits comunes
    ├── HasSchoolContext.php      # Context escuela
    ├── HasSeasonContext.php      # Context temporada
    └── HasLogging.php            # Logging automático
```

#### Módulos V5 (`app/V5/Modules/`)
```
Modules/
├── Auth/                          # 🔐 Módulo Autenticación
│   ├── Controllers/              
│   │   └── AuthV5Controller.php  
│   ├── Services/                 
│   │   └── AuthV5Service.php     
│   ├── Requests/                 
│   │   └── LoginRequest.php      
│   └── Routes/                   
│       └── auth.php              
├── Booking/                       # 📅 Módulo Reservas
│   ├── Controllers/              
│   │   ├── BookingV5Controller.php
│   │   └── BookingParticipantController.php
│   ├── Models/                   
│   │   ├── V5Booking.php         
│   │   └── V5BookingParticipant.php
│   ├── Services/                 
│   │   ├── BookingV5Service.php  
│   │   └── BookingValidationService.php
│   ├── Repositories/             
│   │   └── BookingV5Repository.php
│   └── Routes/                   
│       └── booking.php           
├── Season/                        # 📆 Módulo Temporadas
├── School/                        # 🏫 Módulo Escuelas
├── Dashboard/                     # 📊 Módulo Dashboard
├── HealthCheck/                   # 🏥 Módulo Health Check
└── [otros módulos]
```

#### Middleware V5 (`app/V5/Middleware/`)
```
Middleware/
├── SeasonContextMiddleware.php    # Inyección contexto season
├── SeasonPermissionMiddleware.php # Permisos por season
├── SchoolAccessMiddleware.php     # Acceso por escuela
├── RequestLoggingMiddleware.php   # Logging requests V5
└── ModuleAccessMiddleware.php     # Acceso por módulo
```

---

## Arquitectura de Módulos

### Patrón de Módulo Estándar

Cada módulo V5 sigue una estructura consistente que facilita el mantenimiento y la escalabilidad:

#### Frontend (Angular)
```
module-name/
├── module-name.module.ts          # Definición módulo
├── module-name-routing.module.ts  # Rutas módulo
├── components/                    # Componentes específicos
│   ├── list/                     # Lista/grid entidades
│   ├── detail/                   # Detalle entidad
│   ├── form/                     # Formulario CRUD
│   └── [otros componentes]
├── services/                      # Servicios módulo
│   ├── module-name.service.ts    # Servicio principal
│   └── module-name-api.service.ts # Servicio API
├── models/                        # Interfaces/tipos
│   └── module-name.interface.ts  
├── guards/                        # Guards específicos
└── resolvers/                     # Resolvers datos
```

#### Backend (Laravel)
```
ModuleName/
├── Controllers/                   # Controladores
│   ├── ModuleNameController.php  # CRUD principal
│   └── [otros controladores]
├── Models/                        # Modelos Eloquent
│   └── ModuleName.php            
├── Services/                      # Lógica negocio
│   ├── ModuleNameService.php     
│   └── [otros servicios]
├── Repositories/                  # Acceso datos
│   └── ModuleNameRepository.php  
├── Requests/                      # Validación requests
│   ├── StoreModuleNameRequest.php
│   └── UpdateModuleNameRequest.php
├── Resources/                     # Transformación API
│   └── ModuleNameResource.php    
├── Events/                        # Eventos dominio
├── Listeners/                     # Listeners eventos
├── Jobs/                          # Jobs asíncronos
├── Policies/                      # Políticas acceso
├── Rules/                         # Reglas validación
└── Routes/                        # Rutas módulo
    └── module-name.php           
```

### Cómo Añadir un Módulo Nuevo

#### 1. Frontend Angular

**Paso 1: Generar estructura**
```bash
# Crear módulo base
ng generate module v5/features/new-module --routing

# Crear componentes principales
ng generate component v5/features/new-module/components/list
ng generate component v5/features/new-module/components/detail
ng generate component v5/features/new-module/components/form

# Crear servicios
ng generate service v5/features/new-module/services/new-module
ng generate service v5/features/new-module/services/new-module-api
```

**Paso 2: Configurar interfaces**
```typescript
// src/app/v5/features/new-module/models/new-module.interface.ts
export interface NewModule {
  id: number;
  school_id: number;
  season_id: number;
  name: string;
  // ... otros campos
  created_at: string;
  updated_at: string;
}

export interface NewModuleFormData {
  name: string;
  // ... campos formulario
}

export interface NewModuleListResponse {
  data: NewModule[];
  pagination: PaginationInfo;
}
```

**Paso 3: Implementar servicio**
```typescript
// src/app/v5/features/new-module/services/new-module.service.ts
@Injectable({
  providedIn: 'root'
})
export class NewModuleService extends BaseService {
  constructor(
    private apiService: ApiV5Service,
    private seasonContext: SeasonContextService
  ) {
    super();
  }

  getList(): Observable<NewModule[]> {
    const seasonId = this.seasonContext.getCurrentSeason()?.id;
    return this.apiService.get<NewModule[]>(`/v5/new-module`, {
      params: { season_id: seasonId }
    });
  }

  getById(id: number): Observable<NewModule> {
    return this.apiService.get<NewModule>(`/v5/new-module/${id}`);
  }

  create(data: NewModuleFormData): Observable<NewModule> {
    return this.apiService.post<NewModule>('/v5/new-module', data);
  }

  update(id: number, data: NewModuleFormData): Observable<NewModule> {
    return this.apiService.put<NewModule>(`/v5/new-module/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.apiService.delete<void>(`/v5/new-module/${id}`);
  }
}
```

**Paso 4: Configurar rutas**
```typescript
// src/app/v5/features/new-module/new-module-routing.module.ts
const routes: Routes = [
  {
    path: '',
    component: NewModuleListComponent,
    canActivate: [AuthV5Guard, SeasonContextGuard],
    data: {
      requiredPermission: 'view new-module',
      title: 'Nuevo Módulo'
    }
  },
  {
    path: 'create',
    component: NewModuleFormComponent,
    canActivate: [AuthV5Guard, SeasonContextGuard],
    data: {
      requiredPermission: 'create new-module',
      title: 'Crear Nuevo Módulo'
    }
  },
  {
    path: ':id',
    component: NewModuleDetailComponent,
    canActivate: [AuthV5Guard, SeasonContextGuard],
    data: {
      requiredPermission: 'view new-module',
      title: 'Detalle Nuevo Módulo'
    }
  },
  {
    path: ':id/edit',
    component: NewModuleFormComponent,
    canActivate: [AuthV5Guard, SeasonContextGuard],
    data: {
      requiredPermission: 'update new-module',
      title: 'Editar Nuevo Módulo'
    }
  }
];
```

#### 2. Backend Laravel

**Paso 1: Crear estructura módulo**
```bash
# Crear directorio módulo
mkdir -p app/V5/Modules/NewModule/{Controllers,Models,Services,Repositories,Requests,Resources,Routes}

# Crear migración
php artisan make:migration create_new_module_table

# Crear modelo
php artisan make:model NewModule
```

**Paso 2: Implementar controlador**
```php
// app/V5/Modules/NewModule/Controllers/NewModuleController.php
<?php

namespace App\V5\Modules\NewModule\Controllers;

use App\V5\Base\Controllers\BaseResourceController;
use App\V5\Modules\NewModule\Services\NewModuleService;
use App\V5\Modules\NewModule\Requests\StoreNewModuleRequest;
use App\V5\Modules\NewModule\Requests\UpdateNewModuleRequest;

class NewModuleController extends BaseResourceController
{
    public function __construct(
        protected NewModuleService $service
    ) {
        parent::__construct();
        
        // Aplicar middleware season context
        $this->middleware(['season.context', 'season.permission']);
        
        // Aplicar permisos
        $this->middleware('permission:view new-module')->only(['index', 'show']);
        $this->middleware('permission:create new-module')->only(['store']);
        $this->middleware('permission:update new-module')->only(['update']);
        $this->middleware('permission:delete new-module')->only(['destroy']);
    }

    public function index(Request $request)
    {
        $seasonId = $request->get('season_id');
        $schoolId = $request->user()->getCurrentSchoolId();
        
        $items = $this->service->getBySchoolAndSeason($schoolId, $seasonId);
        
        return $this->respondWithData($items);
    }

    public function store(StoreNewModuleRequest $request)
    {
        $data = $request->validated();
        $data['school_id'] = $request->user()->getCurrentSchoolId();
        $data['season_id'] = $request->get('season_id');
        
        $item = $this->service->create($data);
        
        return $this->respondWithData($item, 'Elemento creado exitosamente', 201);
    }

    // ... otros métodos CRUD
}
```

**Paso 3: Crear modelo**
```php
// app/V5/Modules/NewModule/Models/NewModule.php
<?php

namespace App\V5\Modules\NewModule\Models;

use App\V5\Base\Models\BaseSeasonModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class NewModule extends BaseSeasonModel
{
    use SoftDeletes;

    protected $table = 'new_module';

    protected $fillable = [
        'school_id',
        'season_id',
        'name',
        'description',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    // Relaciones
    public function school()
    {
        return $this->belongsTo(School::class);
    }

    public function season()
    {
        return $this->belongsTo(Season::class);
    }

    // Scopes automáticos del BaseSeasonModel
    // - scopeForSchool($query, $schoolId)
    // - scopeForSeason($query, $seasonId)
    // - scopeForSchoolAndSeason($query, $schoolId, $seasonId)
}
```

**Paso 4: Crear servicio**
```php
// app/V5/Modules/NewModule/Services/NewModuleService.php
<?php

namespace App\V5\Modules\NewModule\Services;

use App\V5\Base\Services\BaseSeasonService;
use App\V5\Modules\NewModule\Models\NewModule;
use App\V5\Modules\NewModule\Repositories\NewModuleRepository;

class NewModuleService extends BaseSeasonService
{
    public function __construct(
        protected NewModuleRepository $repository
    ) {
        parent::__construct($repository);
    }

    public function getBySchoolAndSeason(int $schoolId, int $seasonId): Collection
    {
        return $this->repository->findBySchoolAndSeason($schoolId, $seasonId);
    }

    public function create(array $data): NewModule
    {
        // Validaciones específicas de negocio
        $this->validateBusinessRules($data);
        
        // Crear elemento
        $item = $this->repository->create($data);
        
        // Disparar evento
        event(new NewModuleCreated($item));
        
        return $item;
    }

    protected function validateBusinessRules(array $data): void
    {
        // Validaciones específicas del módulo
        // Ejemplo: verificar que no existe duplicado
        $exists = $this->repository->existsByNameAndSchoolAndSeason(
            $data['name'],
            $data['school_id'],
            $data['season_id']
        );
        
        if ($exists) {
            throw new ValidationException('Ya existe un elemento con ese nombre en esta temporada');
        }
    }
}
```

**Paso 5: Registrar rutas**
```php
// app/V5/Modules/NewModule/Routes/new-module.php
<?php

use App\V5\Modules\NewModule\Controllers\NewModuleController;

Route::middleware(['auth:sanctum', 'season.context', 'season.permission'])
    ->prefix('v5/new-module')
    ->group(function () {
        Route::get('/', [NewModuleController::class, 'index']);
        Route::post('/', [NewModuleController::class, 'store']);
        Route::get('/{id}', [NewModuleController::class, 'show']);
        Route::put('/{id}', [NewModuleController::class, 'update']);
        Route::delete('/{id}', [NewModuleController::class, 'destroy']);
    });
```

**Paso 6: Registrar en V5ServiceProvider**
```php
// app/V5/V5ServiceProvider.php
public function boot()
{
    // Cargar rutas del módulo
    $this->loadRoutesFrom(app_path('V5/Modules/NewModule/Routes/new-module.php'));
    
    // Registrar otros bindings si es necesario
}
```

---

## Convenciones de Código

### Naming Conventions

#### Frontend Angular
```typescript
// Archivos y directorios
kebab-case                     // feature-module, user-list.component.ts
PascalCase                     // Clases: UserListComponent, UserService
camelCase                      // Variables y métodos: userList, getUserById()
SCREAMING_SNAKE_CASE          // Constantes: API_BASE_URL, MAX_ITEMS_PER_PAGE

// Componentes
[feature]-[type].component.ts  // user-list.component.ts, booking-form.component.ts
[feature].service.ts           // user.service.ts, booking.service.ts
[feature].interface.ts         // user.interface.ts, booking.interface.ts

// Selectores
app-[feature]-[type]          // app-user-list, app-booking-form
v5-[feature]-[type]           // v5-season-selector, v5-permission-checker
```

#### Backend Laravel
```php
// Archivos y clases
PascalCase                     // UserController, BookingService, Season
snake_case                     // Archivos: user_controller.php, database tables: booking_users
camelCase                      // Métodos: getUserById(), createBooking()
SCREAMING_SNAKE_CASE          // Constantes: MAX_PARTICIPANTS, DEFAULT_SEASON_DURATION

// Rutas
kebab-case                     // /api/v5/booking-users, /admin/course-management
snake_case                     // Parámetros: {user_id}, {season_id}

// Base de datos
snake_case                     // Tablas: booking_users, course_dates
snake_case                     // Columnas: created_at, school_id, season_id
```

### Estructura de Archivos

#### Componente Angular Estándar
```typescript
// feature-component.component.ts
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'v5-feature-component',
  templateUrl: './feature-component.component.html',
  styleUrls: ['./feature-component.component.scss']
})
export class FeatureComponentComponent implements OnInit, OnDestroy {
  @Input() inputProperty: SomeType;
  @Output() outputEvent = new EventEmitter<SomeType>();

  // Propiedades públicas
  public data$: Observable<SomeType[]>;
  public loading = false;
  public error: string | null = null;

  // Propiedades privadas
  private destroy$ = new Subject<void>();

  constructor(
    private featureService: FeatureService,
    private seasonContext: SeasonContextService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.loading = true;
    this.featureService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.data$ = of(data);
          this.loading = false;
        },
        error: (error) => {
          this.error = error.message;
          this.loading = false;
        }
      });
  }

  public onActionClick(item: SomeType): void {
    this.outputEvent.emit(item);
  }
}
```

#### Controlador Laravel Estándar
```php
<?php

namespace App\V5\Modules\Feature\Controllers;

use App\V5\Base\Controllers\BaseResourceController;
use App\V5\Modules\Feature\Services\FeatureService;
use App\V5\Modules\Feature\Requests\StoreFeatureRequest;
use App\V5\Modules\Feature\Requests\UpdateFeatureRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FeatureController extends BaseResourceController
{
    public function __construct(
        protected FeatureService $service
    ) {
        parent::__construct();
        $this->applyStandardMiddleware();
        $this->applyPermissionMiddleware('feature');
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $this->getFiltersFromRequest($request);
            $items = $this->service->getFilteredList($filters);
            
            return $this->respondWithData($items);
        } catch (\Exception $e) {
            return $this->respondWithError('Error al obtener la lista', $e);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreFeatureRequest $request): JsonResponse
    {
        try {
            $data = $this->prepareDataForCreation($request);
            $item = $this->service->create($data);
            
            return $this->respondWithData($item, 'Elemento creado exitosamente', 201);
        } catch (\Exception $e) {
            return $this->respondWithError('Error al crear el elemento', $e);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $item = $this->service->getById($id);
            
            return $this->respondWithData($item);
        } catch (\Exception $e) {
            return $this->respondWithError('Elemento no encontrado', $e);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateFeatureRequest $request, int $id): JsonResponse
    {
        try {
            $data = $this->prepareDataForUpdate($request);
            $item = $this->service->update($id, $data);
            
            return $this->respondWithData($item, 'Elemento actualizado exitosamente');
        } catch (\Exception $e) {
            return $this->respondWithError('Error al actualizar el elemento', $e);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->service->delete($id);
            
            return $this->respondWithMessage('Elemento eliminado exitosamente');
        } catch (\Exception $e) {
            return $this->respondWithError('Error al eliminar el elemento', $e);
        }
    }

    private function prepareDataForCreation(StoreFeatureRequest $request): array
    {
        $data = $request->validated();
        $data['school_id'] = $request->user()->getCurrentSchoolId();
        $data['season_id'] = $request->get('season_id');
        
        return $data;
    }

    private function prepareDataForUpdate(UpdateFeatureRequest $request): array
    {
        return $request->validated();
    }
}
```

---

## Estado Actual de Módulos

### Matriz de Estado por Módulo

| Módulo | Frontend | Backend | Base Datos | API Routes | Tests | Estado |
|--------|----------|---------|------------|------------|-------|--------|
| **Auth** | ✅ V5 Completo | ✅ V5 Completo | ✅ Implementado | ✅ `/api/v5/auth/*` | ❌ Pendiente | **Operacional** |
| **Seasons** | ✅ V5 Completo | ✅ V5 Completo | ✅ Implementado | ✅ `/api/v5/seasons/*` | ❌ Pendiente | **Operacional** |
| **Schools** | ✅ V5 Completo | ✅ V5 Completo | ✅ Implementado | ✅ `/api/v5/schools/*` | ❌ Pendiente | **Operacional** |
| **Dashboard** | ✅ V5 Completo | ✅ V5 Completo | ✅ Implementado | ✅ `/api/v5/dashboard/*` | ❌ Pendiente | **Operacional** |
| **Bookings** | 🟡 V5 Parcial | 🟡 V5 Parcial | ✅ Implementado | 🟡 Parcial `/api/v5/bookings/*` | ❌ Pendiente | **En Desarrollo** |
| **Clients** | 🟡 V5 Básico | ❌ Legacy Only | ✅ Implementado | ❌ Solo `/api/admin/clients` | ❌ Pendiente | **Migración Pendiente** |
| **Courses** | 🟡 V5 Básico | ❌ Legacy Only | ✅ Implementado | ❌ Solo `/api/admin/courses` | ❌ Pendiente | **Migración Pendiente** |
| **Monitors** | 🟡 V5 Básico | ❌ Legacy Only | ✅ Implementado | ❌ Solo `/api/admin/monitors` | ❌ Pendiente | **Migración Pendiente** |
| **Analytics** | 🟡 Legacy + V5 | 🟡 Legacy + V5 | ✅ Implementado | 🟡 Mixto | ❌ Pendiente | **Inconsistente** |
| **Equipment** | ❌ Placeholder | ❌ Faltante | 🟡 Esquema V5 | ❌ No existe | ❌ Pendiente | **Crítico - Faltante** |
| **Payments** | 🟡 Legacy Basic | 🟡 Legacy Basic | ✅ Implementado | 🟡 Basic `/api/admin/payments` | ❌ Pendiente | **Mejora Necesaria** |
| **Communications** | ✅ V5 Frontend | ❌ Backend Faltante | 🟡 Parcial | ❌ No existe | ❌ Pendiente | **Backend Crítico** |
| **Reports** | 🟡 Legacy | 🟡 Legacy | ✅ Implementado | 🟡 Legacy `/api/admin/reports` | ❌ Pendiente | **V5 Pendiente** |
| **Settings** | 🟡 Básico | 🟡 Básico | ✅ Implementado | 🟡 Básico | ❌ Pendiente | **Expansión Necesaria** |

### Detalle por Módulo

#### ✅ Módulos Operacionales (V5 Completo)

**Auth (Autenticación)**
- **Frontend**: Login, logout, gestión tokens, guards implementados
- **Backend**: Laravel Sanctum, middleware, permisos
- **API**: `/api/v5/auth/login`, `/api/v5/auth/me`, `/api/v5/auth/permissions`
- **Estado**: Funcional pero con issues (token Bearer vacío)

**Seasons (Temporadas)**
- **Frontend**: Selector temporada, contexto, cambio temporada
- **Backend**: CRUD completo, middleware contexto
- **API**: `/api/v5/seasons`, `/api/v5/seasons/current`
- **Estado**: Funcional con dependencia circular a resolver

**Schools (Escuelas)**
- **Frontend**: Gestión básica escuelas
- **Backend**: CRUD, configuración por escuela
- **API**: `/api/v5/schools`
- **Estado**: Funcional, falta sistema superadmin

**Dashboard (Panel Principal)**
- **Frontend**: Widgets, métricas tiempo real, navegación rápida
- **Backend**: Agregaciones, estadísticas, alertas
- **API**: `/api/v5/dashboard/stats`, `/api/v5/dashboard/alerts`
- **Estado**: Funcional con datos mock

#### 🟡 Módulos Parciales (Requieren Trabajo)

**Bookings (Reservas)**
- **Frontend**: Wizard V5 parcial, listado básico
- **Backend**: Modelo V5, controlador básico
- **Faltante**: Integración completa equipamiento, pagos, workflows
- **Prioridad**: Alta

**Analytics (Analíticas)**
- **Estado**: Dual legacy/V5, inconsistente
- **Problema**: Múltiples implementaciones
- **Acción**: Consolidar en V5

**Clients/Courses/Monitors**
- **Estado**: Frontend V5 básico, backend solo legacy
- **Problema**: Falta migración completa
- **Acción**: Migrar completamente a V5

#### ❌ Módulos Críticos Faltantes

**Equipment (Equipamiento)**
- **Estado**: Solo placeholder frontend, backend inexistente
- **Impacto**: Funcionalidad clave del negocio
- **Prioridad**: Crítica
- **Estimación**: 3-4 semanas desarrollo completo

**Communications (Comunicaciones)**
- **Estado**: Frontend existe, backend completamente faltante
- **Impacto**: Chat, notificaciones, mensajería
- **Prioridad**: Media-Alta
- **Estimación**: 2-3 semanas

---

## Componentes Legacy

### Sistema Legacy Identificado

El sistema mantiene una arquitectura dual con componentes legacy que deben ser migrados progresivamente:

#### Frontend Legacy (`src/app/pages/`)
```
pages/
├── analytics/                     # 📊 Analytics v1-v3
│   ├── analytics-v1/             # ⚠️ Deprecado
│   ├── analytics-v2/             # ⚠️ En uso, migrar
│   └── analytics-v3/             # ⚠️ En uso, migrar
├── booking/                       # 📅 Reservas legacy
│   ├── booking-v1/               # ❌ Deprecado
│   ├── booking-v2/               # ⚠️ En uso
│   └── booking-v3/               # ⚠️ En uso activo
├── courses/                       # 🎓 Cursos legacy
│   ├── courses-v1/               # ❌ Deprecado
│   ├── courses-v2/               # ⚠️ En uso
│   └── course-management/        # ⚠️ En uso activo
├── dashboard/                     # 📱 Dashboard legacy
│   └── dashboard-analytics/      # ⚠️ Migrar a V5
├── clients/                       # 👥 Clientes legacy
│   ├── clients-v1/               # ❌ Deprecado
│   └── clients-v2/               # ⚠️ En uso activo
└── [otros módulos legacy]
```

#### Backend Legacy (`app/Http/Controllers/`)
```
Controllers/
├── Admin/                         # 🔧 Controladores admin legacy
│   ├── AnalyticsController.php   # ⚠️ En uso, duplicado con V5
│   ├── BookingController.php     # ⚠️ En uso, migrar
│   ├── CourseController.php      # ⚠️ En uso activo
│   ├── ClientController.php      # ⚠️ En uso activo
│   ├── MonitorController.php     # ⚠️ En uso activo
│   └── [otros controladores]
├── API/                           # 📡 API legacy
│   ├── BookingAPIController.php  # ⚠️ En uso
│   ├── CourseAPIController.php   # ⚠️ En uso
│   └── [otros APIs]
└── [otros controladores legacy]
```

### Plan de Migración Legacy

#### Prioridad 1 (Crítica) - Semanas 1-4
1. **Clients Legacy → V5**
   - Migrar `ClientController` → `ClientV5Controller`
   - Convertir `clients-v2` → `v5/features/clients`
   - Preservar funcionalidad existente

2. **Courses Legacy → V5**
   - Migrar `CourseController` → `CourseV5Controller`
   - Convertir `course-management` → `v5/features/courses`
   - Mantener compatibilidad booking system

3. **Monitors Legacy → V5**
   - Migrar `MonitorController` → `MonitorV5Controller`
   - Convertir gestión monitores → `v5/features/monitors`
   - Integrar con app móvil

#### Prioridad 2 (Alta) - Semanas 5-8
1. **Bookings V3 → V5**
   - Completar migración `booking-v3` → `v5/features/bookings`
   - Integrar con equipamiento y pagos
   - Deprecar versiones v1, v2

2. **Analytics Legacy → V5**
   - Consolidar `analytics-v2/v3` → `v5/features/analytics`
   - Eliminar duplicación con dashboard V5
   - Mantener reportes históricos

#### Prioridad 3 (Media) - Semanas 9-12
1. **Dashboard Legacy → V5**
   - Migrar `dashboard-analytics` → dashboard V5
   - Consolidar widgets y métricas
   - Mejorar tiempo real

2. **API Legacy → V5**
   - Migrar endpoints críticos `/api/admin/*` → `/api/v5/*`
   - Mantener compatibilidad temporal
   - Deprecar progresivamente

### Estrategia de Compatibilidad

#### Período de Transición (6 meses)
```php
// Ejemplo: Redirección temporal en rutas legacy
Route::middleware(['legacy.compatibility'])
    ->prefix('admin/clients')
    ->group(function () {
        // Redirigir a V5 manteniendo funcionalidad
        Route::get('/', [LegacyCompatibilityController::class, 'redirectToV5']);
    });
```

#### Logging de Uso Legacy
```typescript
// Frontend: Track uso componentes legacy
@Component({
  selector: 'app-legacy-component',
  template: '...'
})
export class LegacyComponent implements OnInit {
  ngOnInit() {
    // Log uso para métricas migración
    this.analytics.trackLegacyUsage('legacy-component');
  }
}
```

---

## Infraestructura Transversal

### Guards (Guardias de Seguridad)

#### Guards Actuales

| Guard | Ubicación | Propósito | Estado |
|-------|-----------|-----------|--------|
| **AuthGuard** | `src/app/auth.guard.ts` | Autenticación legacy | ⚠️ Deprecar |
| **AuthV5Guard** | `src/app/v5/core/guards/auth-v5.guard.ts` | Autenticación V5 | ⚠️ Deshabilitado |
| **SeasonContextGuard** | `src/app/v5/core/guards/season-context.guard.ts` | Contexto temporada | ⚠️ Deshabilitado |
| **AnalyticsPermissionGuard** | `src/app/analytics-permission.guard.ts` | Permisos analíticas | ✅ Activo |

#### Guards Necesarios (Faltantes)
```typescript
// src/app/v5/core/guards/role-hierarchy.guard.ts
@Injectable()
export class RoleHierarchyGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRole = route.data['requiredRole'];
    const requiredPermission = route.data['requiredPermission'];
    const scope = route.data['scope'] || 'school';
    
    return this.checkHierarchicalAccess(requiredRole, requiredPermission, scope);
  }
}

// src/app/v5/core/guards/module-access.guard.ts
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredModule = route.data['requiredModule'];
    return this.moduleService.isModuleActiveForCurrentSchool(requiredModule);
  }
}

// src/app/v5/core/guards/school-access.guard.ts
@Injectable()
export class SchoolAccessGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const schoolId = route.params['schoolId'];
    return this.authService.canAccessSchool(schoolId);
  }
}
```

### Interceptors (Interceptores HTTP)

#### Interceptors Actuales
```typescript
// src/app/v5/core/interceptors/auth-v5.interceptor.ts
@Injectable()
export class AuthV5Interceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ✅ Inyecta token autenticación
    // ✅ Añade headers season context
    // ⚠️ Problemas con token Bearer vacío
  }
}

// src/app/v5/core/interceptors/loading.interceptor.ts
@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  // ✅ Gestiona estado loading global
}

// src/app/v5/core/interceptors/error.interceptor.ts
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  // ✅ Manejo errores HTTP centralizados
}
```

#### Interceptors Faltantes
```typescript
// Cache interceptor para optimización
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Implementar cache inteligente para GET requests
    // Invalidar cache en POST/PUT/DELETE
  }
}

// Retry interceptor para resiliencia
@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Retry automático en fallos de red
    // Exponential backoff
  }
}
```

### Pipes (Transformadores de Datos)

#### Pipes Existentes
```typescript
// src/app/core/pipes/ (legacy)
- CurrencyFormatPipe     // ⚠️ Migrar a V5
- DateFormatPipe         // ⚠️ Migrar a V5
- SafeHtmlPipe           // ⚠️ Migrar a V5
```

#### Pipes V5 Necesarios
```typescript
// src/app/v5/shared/pipes/
export class PermissionPipe implements PipeTransform {
  transform(items: any[], permission: string, context?: any): any[] {
    // Filtrar items por permisos usuario
  }
}

export class SeasonFilterPipe implements PipeTransform {
  transform(items: any[], seasonId?: number): any[] {
    // Filtrar items por temporada actual
  }
}

export class ModuleFilterPipe implements PipeTransform {
  transform(items: any[], moduleRequired: string): any[] {
    // Filtrar por módulos activos escuela
  }
}

export class CurrencyV5Pipe implements PipeTransform {
  transform(value: number, currency = 'EUR', locale = 'es-ES'): string {
    // Formato moneda con configuración escuela
  }
}

export class DateSeasonPipe implements PipeTransform {
  transform(date: Date | string, format?: string): string {
    // Formato fecha respetando configuración temporada
  }
}
```

### Directivas

#### Directivas Faltantes V5
```typescript
// src/app/v5/shared/directives/permission.directive.ts
@Directive({
  selector: '[v5Permission]'
})
export class PermissionDirective implements OnInit {
  @Input() v5Permission: string;
  @Input() v5PermissionScope: 'global' | 'school' | 'season' = 'school';
  
  ngOnInit() {
    const hasPermission = this.permissionService.hasPermission(
      this.v5Permission, 
      this.v5PermissionScope
    );
    
    if (!hasPermission) {
      this.viewContainer.clear();
    }
  }
}

// src/app/v5/shared/directives/module-access.directive.ts
@Directive({
  selector: '[v5ModuleAccess]'
})
export class ModuleAccessDirective implements OnInit {
  @Input() v5ModuleAccess: string;
  
  ngOnInit() {
    const moduleActive = this.moduleService.isModuleActive(this.v5ModuleAccess);
    
    if (!moduleActive) {
      this.viewContainer.clear();
    }
  }
}

// src/app/v5/shared/directives/loading.directive.ts
@Directive({
  selector: '[v5Loading]'
})
export class LoadingDirective {
  @Input() v5Loading: boolean;
  
  @HostBinding('class.loading') get isLoading() {
    return this.v5Loading;
  }
  
  @HostBinding('attr.disabled') get isDisabled() {
    return this.v5Loading ? true : null;
  }
}
```

---

## Recomendaciones y Mejoras

### 1. Problemas Críticos a Resolver Inmediatamente

#### Seguridad
- **Token Bearer Vacío**: Arreglar `src/service/api.service.ts` líneas 15-19
- **Guards Deshabilitados**: Habilitar `AuthV5Guard` y `SeasonContextGuard`
- **Usuario Hardcodeado**: Remover test user de `AuthV5Service`

#### Arquitectura
- **Dependencia Circular**: Resolver `SeasonContextService` ↔ `ApiV5Service`
- **Servicios Duales**: Consolidar `AuthService` → `AuthV5Service`
- **Multi-tenant**: Aplicar validación `school_id` consistente

### 2. Mejoras de Arquitectura

#### Implementar Patrón Repository Completo
```typescript
// Frontend: Implementar patrón Repository
@Injectable()
export class BaseRepository<T> {
  constructor(private apiService: ApiV5Service) {}
  
  getAll(filters?: any): Observable<T[]> {
    return this.apiService.get<T[]>(this.endpoint, { params: filters });
  }
  
  getById(id: number): Observable<T> {
    return this.apiService.get<T>(`${this.endpoint}/${id}`);
  }
  
  create(data: Partial<T>): Observable<T> {
    return this.apiService.post<T>(this.endpoint, data);
  }
  
  update(id: number, data: Partial<T>): Observable<T> {
    return this.apiService.put<T>(`${this.endpoint}/${id}`, data);
  }
  
  delete(id: number): Observable<void> {
    return this.apiService.delete<void>(`${this.endpoint}/${id}`);
  }
  
  protected abstract get endpoint(): string;
}
```

#### State Management Centralizado
```typescript
// Implementar NgRx o similar para estado complejo
@Injectable()
export class GlobalStateService {
  private state$ = new BehaviorSubject<AppState>(initialState);
  
  get currentState(): AppState {
    return this.state$.value;
  }
  
  updateState(updates: Partial<AppState>): void {
    const newState = { ...this.currentState, ...updates };
    this.state$.next(newState);
  }
  
  select<K extends keyof AppState>(key: K): Observable<AppState[K]> {
    return this.state$.pipe(
      map(state => state[key]),
      distinctUntilChanged()
    );
  }
}
```

### 3. Performance y Optimización

#### Lazy Loading Completo
```typescript
// Implementar lazy loading para todos los módulos
const routes: Routes = [
  {
    path: 'v5',
    loadChildren: () => import('./v5/v5.module').then(m => m.V5Module),
    canActivate: [AuthV5Guard]
  },
  {
    path: 'v5/bookings',
    loadChildren: () => import('./v5/features/bookings/bookings.module').then(m => m.BookingsModule),
    canActivate: [AuthV5Guard, SeasonContextGuard, ModuleAccessGuard],
    data: { requiredModule: 'bookings' }
  }
];
```

#### Caching Strategy
```typescript
@Injectable()
export class CacheService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  get<T>(key: string, factory: () => Observable<T>, ttl = 300000): Observable<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return of(cached.data);
    }
    
    return factory().pipe(
      tap(data => {
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });
      })
    );
  }
}
```

### 4. Testing Strategy

#### Testing Framework Setup
```typescript
// Configurar testing comprehensivo
describe('FeatureComponent', () => {
  let component: FeatureComponent;
  let fixture: ComponentFixture<FeatureComponent>;
  let mockFeatureService: jasmine.SpyObj<FeatureService>;
  let mockSeasonContext: jasmine.SpyObj<SeasonContextService>;

  beforeEach(async () => {
    const featureServiceSpy = jasmine.createSpyObj('FeatureService', ['getData']);
    const seasonContextSpy = jasmine.createSpyObj('SeasonContextService', ['getCurrentSeason']);

    await TestBed.configureTestingModule({
      declarations: [FeatureComponent],
      providers: [
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: SeasonContextService, useValue: seasonContextSpy }
      ]
    }).compileComponents();

    mockFeatureService = TestBed.inject(FeatureService) as jasmine.SpyObj<FeatureService>;
    mockSeasonContext = TestBed.inject(SeasonContextService) as jasmine.SpyObj<SeasonContextService>;
  });

  // Tests específicos...
});
```

### 5. Documentación y Mantenibilidad

#### API Documentation
```typescript
// Implementar OpenAPI/Swagger documentation
/**
 * @swagger
 * /api/v5/bookings:
 *   get:
 *     summary: Get bookings list
 *     parameters:
 *       - name: season_id
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
```

#### Component Documentation
```typescript
/**
 * Component for managing booking list and operations
 * 
 * @example
 * ```html
 * <v5-booking-list 
 *   [filters]="bookingFilters"
 *   (bookingSelected)="onBookingSelected($event)">
 * </v5-booking-list>
 * ```
 * 
 * @requires SeasonContextService for season filtering
 * @requires AuthV5Service for permissions
 */
@Component({
  selector: 'v5-booking-list',
  // ...
})
export class BookingListComponent {
  // ...
}
```

---

## Plan de Acción

### Sprint 1: Estabilización (Semana 1-2)
**Objetivo**: Resolver problemas críticos de seguridad y estabilidad

**Tareas Críticas**:
- [ ] **Arreglar token Bearer vacío** - `src/service/api.service.ts`
- [ ] **Habilitar guards V5** - `AuthV5Guard`, `SeasonContextGuard`
- [ ] **Resolver dependencia circular** - Reestructurar `SeasonContextService`
- [ ] **Remover usuario hardcodeado** - `AuthV5Service`
- [ ] **Implementar validación school_id** - Middleware consistente

**Criterios de Éxito**:
- Autenticación funciona correctamente
- No hay tokens vacíos en requests
- Guards protegen rutas apropiadamente
- Multi-tenancy aislado por escuela

### Sprint 2: Unificación (Semana 3-4)
**Objetivo**: Consolidar servicios duales y estandarizar V5

**Tareas**:
- [ ] **Migrar a AuthV5Service único** - Deprecar `AuthService` legacy
- [ ] **Estandarizar almacenamiento tokens** - Formato consistente
- [ ] **Completar gestión temporadas** - Flujo selection/cambio
- [ ] **Implementar guards faltantes** - `RoleHierarchyGuard`, `ModuleAccessGuard`
- [ ] **Migrar interceptors críticos** - Consolidar en V5

**Criterios de Éxito**:
- Un solo servicio autenticación activo
- Gestión temporadas completamente funcional
- Guards implementados y activos
- Interceptors V5 funcionando

### Sprint 3: Módulos Críticos (Semana 5-8)
**Objetivo**: Completar módulos críticos faltantes

**Tareas**:
- [ ] **Implementar módulo Equipment completo** - Frontend + Backend
- [ ] **Completar módulo Communications** - Backend faltante
- [ ] **Migrar Clients legacy → V5** - CRUD completo
- [ ] **Migrar Courses legacy → V5** - CRUD completo
- [ ] **Migrar Monitors legacy → V5** - CRUD completo

**Criterios de Éxito**:
- Módulo Equipment operacional
- Backend Communications implementado
- Módulos Clients/Courses/Monitors migrados
- APIs V5 reemplazan legacy

### Sprint 4: Sistema de Roles (Semana 9-10)
**Objetivo**: Implementar jerarquía roles y permisos

**Tareas**:
- [ ] **Implementar sistema superadmin** - Roles jerárquicos
- [ ] **Crear gestión escuelas** - Interface superadmin
- [ ] **Sistema configuración modular** - Activación/desactivación
- [ ] **Migrar usuarios existentes** - Nuevo sistema roles
- [ ] **Interface configuración global** - Panel superadmin

**Criterios de Éxito**:
- Superadmin puede gestionar escuelas
- Sistema roles jerárquico funcional
- Configuración modular operativa
- Usuarios migrados correctamente

### Sprint 5: Testing y Calidad (Semana 11-12)
**Objetivo**: Implementar testing y mejorar calidad código

**Tareas**:
- [ ] **Testing unitario frontend** - Cobertura >80%
- [ ] **Testing unitario backend** - Cobertura >80%
- [ ] **Testing integración** - Flujos críticos
- [ ] **Testing E2E** - Casos uso principales
- [ ] **Linting y quality gates** - Estándares código

**Criterios de Éxito**:
- Tests automatizados implementados
- Cobertura testing objetivo alcanzada
- Quality gates pasan en CI/CD
- Documentación técnica actualizada

### Sprint 6: Optimización (Semana 13-14)
**Objetivo**: Optimizar performance y preparar producción

**Tareas**:
- [ ] **Optimización queries** - Performance backend
- [ ] **Implementar caching** - Strategy frontend/backend
- [ ] **Lazy loading completo** - Módulos Angular
- [ ] **Bundle optimization** - Tamaño aplicación
- [ ] **Monitoring y logging** - Sistema producción

**Criterios de Éxito**:
- Performance objectives alcanzados
- Caching estrategia implementada
- Bundles optimizados
- Monitoring operacional

---

**Documento generado**: `boukii-v5-architecture.md`  
**Fecha**: 3 de agosto de 2025  
**Versión**: 1.0  
**Estado**: Completo para implementación

**Próximo documento**: `boukii-v5-routes-and-auth.md`