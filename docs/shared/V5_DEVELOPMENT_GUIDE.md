# Guía de Desarrollo - Boukii V5

## 🎯 Principios de Desarrollo

### 1. Multi-tenant First
Todo código debe considerar el contexto de escuela/temporada:
```typescript
// ❌ Incorrecto - Sin contexto
const clients = this.http.get<Client[]>('/api/clients');

// ✅ Correcto - Con contexto automático
const clients = this.apiV5.get<Client[]>('/clients'); // Headers automáticos
```

### 2. Context-Aware Architecture
```php
// ❌ Incorrecto - Query sin contexto
$bookings = Booking::all();

// ✅ Correcto - Query con contexto automático
$bookings = Booking::forCurrentContext()->get(); // Global scope aplicado
```

### 3. Permission-Driven Development
```typescript
// ❌ Incorrecto - UI sin validación de permisos
<button (click)="deleteClient()">Delete</button>

// ✅ Correcto - UI con permisos
<button 
  *ngIf="permissions.has('client.delete')"
  (click)="deleteClient()">
  Delete
</button>
```

## 🏗️ Patrones de Arquitectura

### Backend (Laravel)

#### 1. BaseV5Controller Pattern
```php
<?php

namespace App\V5\Controllers;

abstract class BaseV5Controller extends Controller
{
    /**
     * Usar en lugar de auth()->user()
     */
    protected function getCurrentUser(): User
    {
        return request()->get('current_user');
    }
    
    /**
     * Usar en lugar de queries manuales
     */
    protected function getCurrentSchool(): School
    {
        return request()->get('current_school');
    }
    
    /**
     * Siempre incluir contexto en responses
     */
    protected function successResponse($data, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'meta' => [
                'school_id' => $this->getCurrentSchool()->id,
                'season_id' => $this->getCurrentSeason()->id,
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }
}

// Implementación en controller específico
class ClientController extends BaseV5Controller
{
    public function index(): JsonResponse
    {
        $clients = Client::with(['bookings'])
            ->paginate(20);
            
        return $this->successResponse($clients);
    }
}
```

#### 2. Global Scopes para Multi-tenancy
```php
<?php

// app/Models/Client.php
class Client extends Model
{
    protected static function booted()
    {
        // Aplicar contexto automáticamente
        static::addGlobalScope('school', function (Builder $builder) {
            if (request()->has('current_school')) {
                $builder->where('school_id', request()->get('current_school')->id);
            }
        });
        
        // Al crear, asignar school_id automáticamente
        static::creating(function (Client $client) {
            if (!$client->school_id && request()->has('current_school')) {
                $client->school_id = request()->get('current_school')->id;
            }
        });
    }
}
```

#### 3. Service Layer Pattern
```php
<?php

namespace App\V5\Services;

class BookingService
{
    public function createBookingWithEquipment(CreateBookingRequest $request): Booking
    {
        return DB::transaction(function () use ($request) {
            // 1. Crear booking base
            $booking = Booking::create($request->bookingData());
            
            // 2. Procesar equipamiento si existe
            if ($request->hasEquipment()) {
                $equipment = app(EquipmentService::class)
                    ->reserveEquipment($booking, $request->equipmentData());
                $booking->equipment_rental_id = $equipment->id;
                $booking->save();
            }
            
            // 3. Procesar pagos
            if ($request->hasPayment()) {
                app(PaymentService::class)
                    ->processBookingPayment($booking, $request->paymentData());
            }
            
            // 4. Logs de auditoría
            Log::channel('v5_enterprise')->info('Booking created', [
                'booking_id' => $booking->id,
                'user_id' => auth()->id(),
                'school_id' => $booking->school_id,
                'season_id' => $booking->season_id
            ]);
            
            return $booking->fresh(['client', 'course', 'equipmentRental']);
        });
    }
}
```

### Frontend (Angular)

#### 1. BaseV5Component Pattern
```typescript
export abstract class BaseV5Component implements OnInit, OnDestroy {
  protected destroy$ = new Subject<void>();
  protected permissions = inject(PermissionService);
  
  ngOnInit(): void {
    this.initComponent();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  protected abstract initComponent(): void;
  
  /**
   * Shortcut para unsubscribe automático
   */
  protected untilDestroyed<T>(): MonoTypeOperatorFunction<T> {
    return takeUntil(this.destroy$);
  }
  
  /**
   * Error handling estándar
   */
  protected handleError = (error: any) => {
    console.error('Component error:', error);
    this.notificationService.showError(error.message || 'An error occurred');
  }
}

// Implementación
@Component({
  selector: 'v5-clients-list',
  templateUrl: './clients-list.component.html'
})
export class ClientsListComponent extends BaseV5Component {
  clients$ = this.clientsService.getAll().pipe(
    this.untilDestroyed(),
    catchError(this.handleError)
  );
  
  protected initComponent(): void {
    // Lógica específica del componente
    this.loadClients();
  }
  
  private loadClients(): void {
    // Contexto automático via ApiV5Service
    this.clients$ = this.clientsService.getAll();
  }
}
```

#### 2. Feature Service Pattern
```typescript
@Injectable()
export class ClientsService {
  private clients$ = new BehaviorSubject<Client[]>([]);
  private loading$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<string | null>(null);
  
  constructor(private api: ApiV5Service) {}
  
  // Reactive state management
  getClients(): Observable<Client[]> {
    return this.clients$.asObservable();
  }
  
  getLoading(): Observable<boolean> {
    return this.loading$.asObservable();
  }
  
  // Actions que actualizan el state
  loadClients(): Observable<Client[]> {
    this.loading$.next(true);
    this.error$.next(null);
    
    return this.api.get<Client[]>('/clients').pipe(
      tap(clients => {
        this.clients$.next(clients);
        this.loading$.next(false);
      }),
      catchError(error => {
        this.loading$.next(false);
        this.error$.next(error.message);
        return throwError(() => error);
      })
    );
  }
  
  createClient(clientData: CreateClientRequest): Observable<Client> {
    return this.api.post<Client>('/clients', clientData).pipe(
      tap(newClient => {
        const current = this.clients$.value;
        this.clients$.next([...current, newClient]);
      })
    );
  }
  
  updateClient(id: number, data: UpdateClientRequest): Observable<Client> {
    return this.api.put<Client>(`/clients/${id}`, data).pipe(
      tap(updatedClient => {
        const current = this.clients$.value;
        const index = current.findIndex(c => c.id === id);
        if (index >= 0) {
          current[index] = updatedClient;
          this.clients$.next([...current]);
        }
      })
    );
  }
}
```

## 🔐 Manejo de Permisos

### Backend Permission Middleware
```php
<?php

// routes/api/v5.php
Route::middleware(['context.middleware', 'role.permission.middleware:client.read'])
    ->get('/clients', [ClientController::class, 'index']);

Route::middleware(['context.middleware', 'role.permission.middleware:client.create'])
    ->post('/clients', [ClientController::class, 'store']);
```

### Frontend Permission Service
```typescript
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private userPermissions: string[] = [];
  
  constructor(private tokenService: TokenV5Service) {
    this.tokenService.user$.pipe(
      filter(user => !!user)
    ).subscribe(user => {
      this.userPermissions = user.permissions || [];
    });
  }
  
  has(permission: string): boolean {
    return this.userPermissions.includes(permission);
  }
  
  hasAny(permissions: string[]): boolean {
    return permissions.some(p => this.has(p));
  }
  
  hasAll(permissions: string[]): boolean {
    return permissions.every(p => this.has(p));
  }
}

// Uso en componentes
@Component({
  template: `
    <button 
      *ngIf="permissions.has('client.create')"
      (click)="openCreateDialog()">
      Nuevo Cliente
    </button>
    
    <mat-menu>
      <button 
        mat-menu-item 
        *ngIf="permissions.has('client.edit')"
        (click)="editClient()">
        Editar
      </button>
      
      <button 
        mat-menu-item 
        *ngIf="permissions.has('client.delete')"
        (click)="deleteClient()"
        class="text-red-600">
        Eliminar
      </button>
    </mat-menu>
  `
})
export class ClientActionsComponent {
  constructor(public permissions: PermissionService) {}
}
```

## 🧪 Testing Best Practices

### Backend Tests
```php
<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

class ClientControllerTest extends TestCase
{
    use RefreshDatabase;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(V5TestDataSeeder::class);
    }
    
    public function test_can_list_clients_for_current_school(): void
    {
        $user = User::factory()->create();
        $school = School::factory()->create();
        $season = Season::factory()->for($school)->create();
        
        // Crear clientes para esta escuela
        Client::factory()->count(3)->for($school)->create();
        
        // Crear clientes para otra escuela (no deben aparecer)
        Client::factory()->count(2)->create();
        
        Sanctum::actingAs($user);
        
        $response = $this->getJson('/api/v5/clients', [
            'X-School-ID' => $school->id,
            'X-Season-ID' => $season->id
        ]);
        
        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'name', 'email', 'school_id']
                ],
                'meta' => ['school_id', 'season_id']
            ]);
    }
}
```

### Frontend Tests
```typescript
// clients.service.spec.ts
describe('ClientsService', () => {
  let service: ClientsService;
  let httpMock: HttpTestingController;
  let apiService: jasmine.SpyObj<ApiV5Service>;
  
  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiV5Service', ['get', 'post', 'put', 'delete']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ClientsService,
        { provide: ApiV5Service, useValue: spy }
      ]
    });
    
    service = TestBed.inject(ClientsService);
    apiService = TestBed.inject(ApiV5Service) as jasmine.SpyObj<ApiV5Service>;
  });
  
  it('should load clients and update state', () => {
    const mockClients = [
      { id: 1, name: 'Client 1', email: 'client1@example.com' },
      { id: 2, name: 'Client 2', email: 'client2@example.com' }
    ];
    
    apiService.get.and.returnValue(of(mockClients));
    
    service.loadClients().subscribe();
    
    service.getClients().subscribe(clients => {
      expect(clients).toEqual(mockClients);
    });
    
    expect(apiService.get).toHaveBeenCalledWith('/clients');
  });
});
```

### E2E Tests
```typescript
// cypress/e2e/clients.cy.ts
describe('Clients Management', () => {
  beforeEach(() => {
    cy.login('admin@boukii-v5.com', 'password123');
    cy.selectSchool('ESS Veveyse');
  });
  
  it('should create a new client', () => {
    cy.visit('/v5/clients');
    cy.get('[data-cy=add-client]').click();
    
    cy.get('[data-cy=client-name]').type('Test Client');
    cy.get('[data-cy=client-email]').type('test@example.com');
    cy.get('[data-cy=client-phone]').type('+41123456789');
    
    cy.get('[data-cy=save-client]').click();
    
    cy.get('.snackbar').should('contain', 'Client created successfully');
    cy.get('[data-cy=clients-table]').should('contain', 'Test Client');
  });
  
  it('should respect permissions', () => {
    cy.loginAs('staff@boukii-v5.com'); // User without delete permission
    cy.visit('/v5/clients');
    
    cy.get('[data-cy=client-actions]').first().click();
    cy.get('[data-cy=delete-client]').should('not.exist');
  });
});

// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      selectSchool(schoolName: string): Chainable<void>;
      loginAs(email: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/v5/login');
  cy.get('[data-cy=email]').type(email);
  cy.get('[data-cy=password]').type(password);
  cy.get('[data-cy=login-button]').click();
});

Cypress.Commands.add('selectSchool', (schoolName: string) => {
  cy.get(`[data-cy=school-card]:contains("${schoolName}")`).click();
});
```

## 📝 Code Style & Conventions

### TypeScript/Angular
```typescript
// ✅ Nombres descriptivos
interface BookingWithClientAndCourse {
  id: number;
  client: Client;
  course: Course;
  // ...
}

// ✅ Observables con $ suffix
clients$: Observable<Client[]>;
loading$: Observable<boolean>;

// ✅ Métodos de lifecycle descriptivos
ngOnInit(): void {
  this.initializeComponent();
  this.loadInitialData();
  this.setupSubscriptions();
}

// ✅ Error handling consistente
private handleApiError = (error: HttpErrorResponse) => {
  const message = error.error?.message || 'An unexpected error occurred';
  this.notificationService.showError(message);
  console.error('API Error:', error);
}
```

### PHP/Laravel
```php
<?php

// ✅ Resource classes para responses
class ClientResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'created_at' => $this->created_at->toISOString(),
            'bookings_count' => $this->whenLoaded('bookings', fn() => $this->bookings->count()),
            'permissions' => $this->when($this->shouldShowPermissions($request), [
                'can_edit' => $request->user()->can('update', $this->resource),
                'can_delete' => $request->user()->can('delete', $this->resource),
            ])
        ];
    }
}

// ✅ Form Request para validación
class StoreClientRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:clients,email',
            'phone' => 'nullable|string|max:20',
        ];
    }
    
    public function messages(): array
    {
        return [
            'email.unique' => 'A client with this email already exists in your school.',
        ];
    }
}
```

## 🚀 Performance Best Practices

### Backend
```php
<?php

// ✅ Eager loading para evitar N+1
$clients = Client::with(['bookings.course', 'equipmentRentals'])
    ->paginate(20);

// ✅ Query optimization
$popularCourses = Course::select('id', 'name')
    ->withCount(['bookings as bookings_count'])
    ->orderByDesc('bookings_count')
    ->limit(10)
    ->get();

// ✅ Caching estratégico
public function getSchoolStats(): array
{
    return Cache::tags(['school:' . $this->getCurrentSchool()->id])
        ->remember('stats', 3600, function () {
            return [
                'total_clients' => Client::count(),
                'total_bookings' => Booking::count(),
                'revenue_this_month' => Booking::thisMonth()->sum('total_amount'),
            ];
        });
}
```

### Frontend
```typescript
// ✅ OnPush change detection
@Component({
  selector: 'v5-client-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class ClientCardComponent {
  @Input() client!: Client;
}

// ✅ Lazy loading modules
const routes: Routes = [
  {
    path: 'clients',
    loadChildren: () => import('./clients/clients.module').then(m => m.ClientsModule)
  }
];

// ✅ Virtual scrolling para listas largas
<cdk-virtual-scroll-viewport itemSize="60" class="viewport">
  <div *cdkVirtualFor="let client of clients$" class="client-item">
    {{ client.name }}
  </div>
</cdk-virtual-scroll-viewport>

// ✅ Debounced search
@Component({
  template: `
    <input 
      [formControl]="searchControl" 
      placeholder="Search clients..."
    >
  `
})
export class ClientSearchComponent implements OnInit {
  searchControl = new FormControl('');
  
  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.clientsService.search(query))
    ).subscribe();
  }
}
```

## 📋 Checklist para PRs

### Backend
- [ ] Todos los endpoints requieren autenticación
- [ ] Context middleware aplicado en rutas protegidas
- [ ] Permission middleware en operaciones sensibles
- [ ] Global scopes aplicados en modelos multi-tenant
- [ ] Validación de datos con Form Requests
- [ ] Tests de feature para endpoints principales
- [ ] Logs de auditoría en operaciones críticas
- [ ] Resource classes para responses consistentes

### Frontend
- [ ] Componentes extienden BaseV5Component
- [ ] Servicios manejan estado reactivamente
- [ ] Permisos validados en templates
- [ ] Error handling implementado
- [ ] Tests unitarios para lógica de negocio
- [ ] Cypress tests para flujos críticos
- [ ] Lazy loading configurado correctamente
- [ ] OnPush change detection donde sea posible

### General
- [ ] No hay secrets hardcodeados
- [ ] Documentación actualizada
- [ ] Breaking changes documentados
- [ ] Performance considerado (especialmente queries)
- [ ] Accesibilidad básica implementada
- [ ] Responsive design verificado

---
*Guía técnica actualizada*  
*Última modificación: 2025-08-13*  
*Sincronizado automáticamente entre repositorios*