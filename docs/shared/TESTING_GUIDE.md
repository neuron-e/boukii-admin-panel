# Guía de Testing - Boukii V5

## 🧪 Comandos por Tecnología

### Frontend (Angular 16)

#### Unit Tests - Jest
```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch

# Test específico
npm test -- --testNamePattern="AuthService"
npm test -- auth.service.spec.ts
```

#### Linting y Code Quality
```bash
# ESLint
npm run lint
npm run lint:fix

# TypeScript compiler check
npx tsc --noEmit --skipLibCheck

# Prettier format
npm run format
npm run format:check
```

#### E2E Tests - Cypress
```bash
# Abrir Cypress UI
npx cypress open

# Ejecutar todos los E2E tests
npx cypress run

# Test específico
npx cypress run --spec "cypress/e2e/v5-auth-flow-complete.cy.ts"

# Con browser específico
npx cypress run --browser chrome
```

#### Build Tests
```bash
# Build desarrollo
npm run build:development

# Build producción  
npm run build:production

# Build local
npm run build:local

# Servir build local
npm run serve:local
```

### Backend (Laravel 10+)

#### PHPUnit Tests
```bash
# Ejecutar toda la suite de tests
php artisan test

# Tests con coverage
php artisan test --coverage

# Tests específicos por grupo
php artisan test --group=api
php artisan test --group=v5
php artisan test --group=context

# Test específico
php artisan test tests/Feature/V5/AuthTest.php
php artisan test --filter testLoginRequiresValidCredentials
```

#### Pest Tests (alternativa moderna)
```bash
# Si Pest está configurado
./vendor/bin/pest

# Con coverage
./vendor/bin/pest --coverage

# Tests específicos
./vendor/bin/pest --filter="authentication"
```

#### Code Quality
```bash
# PHP CS Fixer (estilo de código)
./vendor/bin/php-cs-fixer fix

# PHPStan (análisis estático)
./vendor/bin/phpstan analyse

# Validar sintaxis
php -l app/V5/BaseV5Controller.php
```

#### Database Testing
```bash
# Migrar y seed para tests
php artisan migrate:fresh --seed --env=testing

# Solo seeds de prueba
php artisan db:seed --class=V5TestDataSeeder --env=testing

# Rollback migrations
php artisan migrate:rollback --env=testing
```

## 🎯 Estrategias de Testing por Módulo

### Authentication & Context

#### Validar en cada PR
```bash
# Backend - Context middleware
php artisan test --group=context
php artisan test tests/Feature/V5/ContextMiddlewareTest.php

# Frontend - Guards y interceptors  
npm test -- auth-v5.guard.spec.ts
npm test -- http-interceptor.service.spec.ts

# E2E - Flujo completo login → dashboard
npx cypress run --spec "cypress/e2e/v5-auth-flow-complete.cy.ts"
```

#### Test Cases Críticos
```yaml
Backend:
  - Login sin credenciales → 422
  - Login válido → token + schools disponibles
  - Request sin X-School-ID → 400
  - Request con school_id inválido → 403
  - Context middleware preserva school/season

Frontend:
  - AuthV5Guard bloquea rutas sin token
  - SeasonContextGuard valida contexto
  - HTTP interceptor añade headers automáticamente  
  - Logout limpia localStorage y contexto
```

### API Endpoints

#### Contract Testing
```bash
# Verificar estructura de responses
php artisan test --group=api-contracts

# Validar headers requeridos
curl -X GET http://api-boukii.test/api/v5/dashboard/stats \
  -H "Authorization: Bearer {token}" \
  -H "X-School-ID: 2" \
  -H "X-Season-ID: 1"

# Postman collection (si existe)
newman run postman/Boukii-V5.postman_collection.json
```

#### Performance Testing
```bash
# Apache Bench - endpoint críticos
ab -n 1000 -c 10 -H "Authorization: Bearer {token}" \
   -H "X-School-ID: 2" \
   http://api-boukii.test/api/v5/dashboard/stats

# Laravel Telescope para profiling
php artisan telescope:install
# Activar en config/telescope.php para testing
```

### Database & Migrations

#### Validación de Integridad
```bash
# Verificar que migrations son reversibles
php artisan migrate:rollback
php artisan migrate

# Verificar foreign keys
php artisan migrate:fresh --seed
php artisan db:show --counts

# SQLite integrity check (desarrollo)
sqlite3 database/data.sqlite "PRAGMA integrity_check;"
```

#### Seeders Testing
```bash
# Verificar seeds son idempotentes
php artisan db:seed --class=V5TestDataSeeder
php artisan db:seed --class=V5TestDataSeeder  # Segunda vez

# Verificar datos de prueba
php artisan tinker
>>> App\Models\User::where('email', 'admin@boukii-v5.com')->first()
>>> App\Models\School::find(2)->seasons()->where('is_active', true)->count()
```

## 📋 Checklist por PR

### Frontend
- [ ] `npm run lint` sin errores
- [ ] `npm test` todos los tests pasan
- [ ] `npm run build:development` exitoso  
- [ ] Cypress tests relevantes pasan
- [ ] No hay `console.log` o `debugger` en código
- [ ] TypeScript strict mode sin warnings

### Backend  
- [ ] `php artisan test` suite completa pasa
- [ ] `php artisan test --group=v5` tests V5 específicos
- [ ] Code coverage > 80% en nuevos archivos
- [ ] No hay `dd()`, `dump()` o debug code
- [ ] PSR-12 code style compliant

### E2E
- [ ] Al menos un test E2E para funcionalidad nueva
- [ ] Tests usan datos determinísticos (school 2)
- [ ] Screenshots generadas sin errores UI
- [ ] Test cleanup (logout, reset state)

## 🚨 Tests Críticos (nunca fallar)

### Smoke Tests
```bash
# Backend - API health
curl http://api-boukii.test/api/v5/health
php artisan route:list | grep "api/v5"

# Frontend - App boots
npm start &
sleep 30
curl http://localhost:4200/
kill %1
```

### Regression Tests
```bash
# Autenticación multi-escuela
npx cypress run --spec "cypress/e2e/v5-auth-flow-complete.cy.ts"

# Context headers en todas las requests
php artisan test tests/Feature/V5/ContextMiddlewareTest.php

# Dashboard carga sin errores
npm test -- dashboard.component.spec.ts
```

## 🔧 Configuración de Testing

### Jest Config (Frontend)
```javascript
// jest-v5.config.js
module.exports = {
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.module.ts',
    '!src/app/**/*.spec.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  }
};
```

### PHPUnit Config (Backend)
```xml
<!-- phpunit.xml -->
<testsuites>
    <testsuite name="V5">
        <directory suffix="Test.php">./tests/Feature/V5</directory>
        <directory suffix="Test.php">./tests/Unit/V5</directory>
    </testsuite>
</testsuites>

<groups>
    <include>
        <group>v5</group>
        <group>context</group>
        <group>api</group>
    </include>
</groups>
```

### Cypress Config
```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    env: {
      apiUrl: 'http://api-boukii.test/api/v5',
      testUser: 'admin@boukii-v5.com',
      testPassword: 'password'
    }
  }
});
```

## 🎯 Métricas de Calidad

### Coverage Mínimo
- **Backend**: 80% líneas, 70% branches
- **Frontend**: 80% statements, 70% branches  
- **E2E**: Cobertura de flujos críticos

### Performance
- **API Response**: < 200ms para endpoints críticos
- **Frontend Bundle**: < 2MB gzipped
- **Database Queries**: < 50ms promedio

### Reliability
- **Test Flakiness**: < 5% tests intermitentes
- **Build Success**: > 95% en CI/CD
- **Zero Regression**: En funcionalidades core

---
*Última actualización: 2025-08-13*