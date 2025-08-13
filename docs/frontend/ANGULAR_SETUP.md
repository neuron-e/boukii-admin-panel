# Angular Setup - Boukii V5 Frontend

## 🚀 Quick Start

### Prerrequisitos
```bash
# Versiones requeridas
Node.js >= 18.0.0
npm >= 9.0.0
Angular CLI >= 16.0.0
```

### Instalación Inicial
```bash
# Clonar repositorio
git clone https://github.com/sysantonio/boukii-admin-panel.git
cd boukii-admin-panel

# Cambiar a rama v5
git checkout v5

# Instalar dependencias  
npm install

# Configurar environment
cp src/environments/environment.ts.example src/environments/environment.ts
```

## ⚙️ Configuración de Entornos

### Environments Disponibles
```typescript
// src/environments/environment.ts (desarrollo local)
export const environment = {
  production: false,
  apiUrl: 'http://api-boukii.test/api',
  appName: 'Boukii V5 Admin',
  enableDebug: true
};

// src/environments/environment.prod.ts (producción)  
export const environment = {
  production: true,
  apiUrl: 'https://api.boukii.com/api',
  appName: 'Boukii Admin',
  enableDebug: false
};
```

### Build Commands
```bash
# Desarrollo local
npm start                           # http://localhost:4200
npm run start2                      # Sin live reload

# Builds
npm run build                       # Desarrollo
npm run build:development           # Desarrollo específico
npm run build:production            # Producción optimizada
npm run build:local                 # Local con optimizaciones
```

## 🎨 Arquitectura Angular

### Estructura del Proyecto
```
src/
├── @vex/                          # Vex Theme Framework
│   ├── components/                # Componentes del tema
│   ├── layout/                    # Layouts (sidenav, toolbar)
│   ├── styles/                    # Estilos globales del tema
│   └── config/                    # Configuración del tema
├── app/
│   ├── core/                      # 🔧 Legacy core services
│   ├── pages/                     # 📱 Legacy pages
│   ├── service/                   # 🔧 Legacy global services
│   └── v5/                        # 🚀 V5 Architecture
│       ├── core/                  # Núcleo V5
│       │   ├── guards/            # Route guards
│       │   ├── interceptors/      # HTTP interceptors
│       │   ├── services/          # Core services
│       │   └── models/            # TypeScript interfaces
│       ├── features/              # Feature modules
│       │   ├── dashboard/
│       │   ├── clients/
│       │   ├── courses/
│       │   └── bookings/
│       ├── shared/                # Shared components
│       └── layout/                # V5 specific layouts
├── assets/                        # Static assets
├── environments/                  # Environment configs
└── styles/                        # Global project styles
```

### V5 Core Services

#### ApiV5Service
```typescript
@Injectable({ providedIn: 'root' })
export class ApiV5Service {
  private baseUrl = `${environment.apiUrl}/v5`;
  
  constructor(
    private http: HttpClient,
    private contextService: ContextService
  ) {}
  
  // Auto-inject context headers
  private getHeaders(): HttpHeaders {
    const context = this.contextService.getCurrentContextValue();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (context) {
      headers = headers
        .set('X-School-ID', context.school.id.toString())
        .set('X-Season-ID', context.season.id.toString());
    }
    
    return headers;
  }
  
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    });
  }
}
```

#### ContextService
```typescript
@Injectable({ providedIn: 'root' })
export class ContextService {
  private contextKey = 'boukii_v5_context';
  private currentContext$ = new BehaviorSubject<Context | null>(null);
  
  constructor() {
    this.restoreContext();
  }
  
  setContext(school: School, season: Season): void {
    const context: Context = { school, season };
    this.currentContext$.next(context);
    localStorage.setItem(this.contextKey, JSON.stringify(context));
  }
  
  getCurrentContext(): Observable<Context | null> {
    return this.currentContext$.asObservable();
  }
  
  getCurrentContextValue(): Context | null {
    return this.currentContext$.value;
  }
  
  clearContext(): void {
    this.currentContext$.next(null);
    localStorage.removeItem(this.contextKey);
  }
}
```

## 🛡️ Guards y Security

### AuthV5Guard
```typescript
@Injectable({ providedIn: 'root' })
export class AuthV5Guard implements CanActivate {
  constructor(
    private authService: AuthV5Service,
    private router: Router
  ) {}
  
  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }
    
    this.router.navigate(['/auth/login']);
    return false;
  }
}
```

### SeasonContextGuard  
```typescript
@Injectable({ providedIn: 'root' })
export class SeasonContextGuard implements CanActivate {
  constructor(
    private contextService: ContextService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const context = this.contextService.getCurrentContextValue();
    
    if (context?.school && context?.season) {
      return true;
    }
    
    // Store intended route for redirect after context setup
    const url = route.url.join('/');
    sessionStorage.setItem('intended_route', url);
    
    this.router.navigate(['/auth/school-selection']);
    return false;
  }
}
```

## 🎨 Component Patterns

### Base Component
```typescript
export abstract class BaseV5Component implements OnInit, OnDestroy {
  protected destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    this.initComponent();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  protected abstract initComponent(): void;
}
```

### Feature Component Example
```typescript
@Component({
  selector: 'v5-clients-list',
  template: `
    <div class="v5-container">
      <v5-page-header 
        [title]="'Clients'" 
        [breadcrumb]="breadcrumb"
        [actions]="headerActions">
      </v5-page-header>
      
      <v5-data-table 
        [data]="clients$ | async"
        [columns]="columns"
        [loading]="loading$ | async"
        (actionClick)="handleAction($event)">
      </v5-data-table>
    </div>
  `
})
export class ClientsListComponent extends BaseV5Component {
  clients$ = this.clientService.getAll();
  loading$ = this.clientService.loading$;
  
  columns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'actions', label: 'Actions', type: 'actions' }
  ];
  
  constructor(private clientService: ClientsService) {
    super();
  }
  
  protected initComponent(): void {
    // Component initialization
  }
}
```

## 📦 Feature Module Structure

### Example: Clients Module
```typescript
// clients.module.ts
@NgModule({
  declarations: [
    ClientsListComponent,
    ClientDetailComponent,
    ClientFormComponent
  ],
  imports: [
    CommonModule,
    ClientsRoutingModule,
    SharedModule,
    VexModule
  ]
})
export class ClientsModule {}

// clients-routing.module.ts
const routes: Routes = [
  {
    path: '',
    component: ClientsListComponent,
    canActivate: [AuthV5Guard, SeasonContextGuard],
    data: { permission: 'client.read' }
  },
  {
    path: 'new',
    component: ClientFormComponent,
    canActivate: [AuthV5Guard, SeasonContextGuard],
    data: { permission: 'client.create' }
  }
];

// clients.service.ts
@Injectable()
export class ClientsService {
  private clients$ = new BehaviorSubject<Client[]>([]);
  private loading$ = new BehaviorSubject<boolean>(false);
  
  constructor(private api: ApiV5Service) {}
  
  getAll(): Observable<Client[]> {
    this.loading$.next(true);
    return this.api.get<Client[]>('/clients').pipe(
      tap(clients => {
        this.clients$.next(clients);
        this.loading$.next(false);
      }),
      catchError(error => {
        this.loading$.next(false);
        return throwError(error);
      })
    );
  }
}
```

## 🎭 Theming con Vex

### Theme Configuration
```typescript
// src/@vex/config/config.service.ts
@Injectable({ providedIn: 'root' })
export class ConfigService {
  defaultConfigs: Config = {
    id: 'boukii-v5',
    name: 'Boukii V5',
    imgSrc: '//assets/img/boukii-logo.svg',
    scheme: 'auto', // 'dark' | 'light' | 'auto'
    style: 'default', // 'default' | 'rounded'
    theme: 'boukii-blue',
    layout: 'vertical', // 'horizontal' | 'vertical'
    boxed: false,
    sidenav: {
      title: 'Boukii V5',
      imageUrl: '//assets/img/logo.svg',
      showCollapsePin: true
    }
  };
}
```

### Custom Styling
```scss
// src/styles/_boukii-theme.scss
@import '@angular/material/theming';

$boukii-primary: mat-palette($mat-blue, 700, 500, 900);
$boukii-accent: mat-palette($mat-orange, 500, 300, 700);
$boukii-warn: mat-palette($mat-red);

$boukii-theme: mat-light-theme((
  color: (
    primary: $boukii-primary,
    accent: $boukii-accent,
    warn: $boukii-warn,
  )
));

@include mat-core-theme($boukii-theme);
```

## 🧪 Testing Setup

### Unit Tests
```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

### E2E Tests
```bash
# Cypress tests
npm run e2e

# Cypress interactivo
npm run cypress:open
```

### Test Example
```typescript
// client.service.spec.ts
describe('ClientsService', () => {
  let service: ClientsService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClientsService]
    });
    service = TestBed.inject(ClientsService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should fetch clients', () => {
    const mockClients = [{ id: 1, name: 'Test Client' }];
    
    service.getAll().subscribe(clients => {
      expect(clients).toEqual(mockClients);
    });
    
    const req = httpMock.expectOne('/api/v5/clients');
    expect(req.request.method).toBe('GET');
    req.flush(mockClients);
  });
});
```

## 📱 PWA Configuration

### Service Worker
```typescript
// app.module.ts
@NgModule({
  imports: [
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production
    })
  ]
})
export class AppModule {}
```

### Manifest
```json
// src/manifest.json
{
  "name": "Boukii V5 Admin",
  "short_name": "Boukii Admin",
  "theme_color": "#1976d2",
  "background_color": "#fafafa",
  "display": "standalone",
  "scope": "./",
  "start_url": "./"
}
```

## 🔧 Development Tools

### Angular CLI Extensions
```bash
# Generar componente
ng generate component v5/features/clients/components/client-card

# Generar servicio
ng generate service v5/features/clients/services/clients

# Generar módulo con routing
ng generate module v5/features/bookings --routing
```

### Debugging
```typescript
// Habilitar debug en development
if (!environment.production) {
  // Angular DevTools
  import('@angular/platform-browser-dynamic')
    .then(({ enableDebugTools }) => enableDebugTools);
}
```

## 📋 Checklist de Desarrollo

### Antes de commit
- [ ] `npm run lint` sin errores
- [ ] `npm run build:development` exitoso
- [ ] Tests unitarios pasan
- [ ] No hay `console.log` o `debugger`
- [ ] TypeScript strict mode sin warnings

### Antes de PR
- [ ] E2E tests relevantes ejecutados
- [ ] Documentación actualizada
- [ ] Code review self-check completado
- [ ] Breaking changes documentados

---
*Específico para el repositorio frontend*  
*Última actualización: 2025-08-13*