# Cypress E2E Tests para Boukii Admin Panel

Este directorio contiene los tests end-to-end (E2E) para validar el flujo completo de cursos y reservas en Boukii Admin Panel.

## 🚀 Quick Start

### Instalación
```bash
npm install
```

### Ejecutar tests
```bash
# Abrir Cypress Test Runner (modo interactivo)
npm run cypress:open

# Ejecutar todos los tests en modo headless
npm run cypress:run

# Ejecutar tests en Chrome
npm run cypress:run:chrome

# Ejecutar tests en Firefox
npm run cypress:run:firefox
```

## 📁 Estructura de Tests

### `/e2e/`
- **`courses-and-bookings-flow.cy.ts`** - Test principal que cubre todo el flujo de cursos y reservas
- **`bug-fixes-validation.cy.ts`** - Tests específicos para validar las correcciones de bugs
- **`performance-and-integration.cy.ts`** - Tests de rendimiento e integración

### `/fixtures/`
- **`courses.json`** - Datos de prueba para cursos (colectivos, privados, flexibles)
- **`clients.json`** - Datos de prueba para clientes y familias

### `/support/`
- **`commands.ts`** - Comandos personalizados de Cypress
- **`e2e.ts`** - Configuración global y setup

## 🧪 Tests Incluidos

### 1. Gestión de Cursos
- ✅ Creación de cursos colectivos
- ✅ Creación de cursos privados flexibles
- ✅ Visualización correcta de niveles y estudiantes
- ✅ Validación de campos requeridos

### 2. Flujo de Reservas
- ✅ Flujo completo de reserva para cursos colectivos
- ✅ Manejo correcto de cursos colectivos flexibles
- ✅ Visualización correcta del cliente en resumen de reserva
- ✅ Funcionalidad de duración en reservas

### 3. Validación de Bugs Corregidos
- ✅ **Bug #1**: Duración no funciona en reservas
- ✅ **Bug #2**: Lógica invertida de botones en cursos colectivos flex
- ✅ **Bug #3**: Cruce de clientes en resumen de reserva
- ✅ **Bug #4**: Estudiantes no se muestran en edición de niveles

### 4. Integración con Planificador
- ✅ Sincronización de reservas en calendario
- ✅ Edición de reservas desde planificador
- ✅ Filtrado de eventos por criterios

### 5. Tests de Rendimiento
- ✅ Tiempos de carga aceptables
- ✅ Manejo eficiente de múltiples cursos
- ✅ Responsividad durante creación de reservas

### 6. Manejo de Errores
- ✅ Errores de red
- ✅ Validación de formularios
- ✅ Expiración de sesión
- ✅ Conflictos de reservas

## 🎯 Comandos Personalizados

### `cy.login(email?, password?)`
Inicia sesión en la aplicación usando credenciales de prueba.

```typescript
cy.login() // Usa credenciales por defecto
cy.login('admin@test.com', 'password123') // Credenciales específicas
```

### `cy.createCourse(courseData)`
Crea un curso con los datos especificados.

```typescript
cy.createCourse({
  name: 'Curso de Prueba',
  sport_id: 1,
  course_type: 1,
  price: '50.00',
  is_flexible: false
})
```

### `cy.createBooking(bookingData)`
Crea una reserva completa.

```typescript
cy.createBooking({
  clientEmail: 'test@example.com',
  courseId: 123
})
```

### `cy.verifyNotification(message)`
Verifica que aparezca una notificación con el mensaje especificado.

```typescript
cy.verifyNotification('Course created successfully')
```

## 🔧 Configuración

### Variables de Entorno
Configuradas en `cypress.config.ts`:

```typescript
env: {
  API_URL: 'http://localhost:8000/api',
  TEST_EMAIL: 'admin@test.com',
  TEST_PASSWORD: 'password123'
}
```

### Data Attributes
Los tests usan `data-cy` attributes para seleccionar elementos:

```html
<button data-cy="create-course-button">Crear Curso</button>
<input data-cy="course-name-input" />
<div data-cy="course-card">...</div>
```

## 📊 Casos de Prueba Específicos

### Duración en Reservas (Bug Fix #1)
```typescript
// Verifica que el campo duración funcione correctamente
cy.get('[data-cy="duration-field"]').should('be.visible')
cy.get('[data-cy="duration-field"]').should('not.be.empty')
cy.get('[data-cy="duration-select"]').select('1h')
```

### Cursos Colectivos Flex (Bug Fix #2)
```typescript
// Verifica comportamiento correcto de checkboxes
cy.get('[data-cy="flex-date-checkbox"]').first().check()
cy.get('[data-cy="flex-date-checkbox"]').first().should('be.checked')
cy.get('[data-cy="extras-select"]').should('not.be.disabled')
```

### Consistencia de Cliente (Bug Fix #3)
```typescript
// Verifica que el cliente se mantenga correcto en el resumen
cy.get('[data-cy="booking-client-name"]')
  .should('contain', 'Juan Pérez')
cy.get('[data-cy="add-activity-button"]').click()
cy.get('[data-cy="booking-client-name"]')
  .should('still.contain', 'Juan Pérez')
```

### Estudiantes en Niveles (Bug Fix #4)
```typescript
// Verifica que los estudiantes sean visibles en los niveles
cy.get('[data-cy="level-item"]').first().click()
cy.get('[data-cy="level-students-list"]').should('be.visible')
cy.get('[data-cy="student-item"]').should('exist')
```

## 🚦 Ejecutar Tests Específicos

```bash
# Solo tests del flujo principal
npx cypress run --spec "cypress/e2e/courses-and-bookings-flow.cy.ts"

# Solo validación de bugs
npx cypress run --spec "cypress/e2e/bug-fixes-validation.cy.ts"

# Solo tests de rendimiento
npx cypress run --spec "cypress/e2e/performance-and-integration.cy.ts"
```

## 📈 Métricas y Reportes

Los tests incluyen verificaciones de rendimiento:

```typescript
it('should load within acceptable time', () => {
  const startTime = performance.now()
  cy.visit('/courses')
  cy.get('[data-cy="courses-list"]').should('be.visible')
  cy.then(() => {
    const loadTime = performance.now() - startTime
    expect(loadTime).to.be.lessThan(3000) // 3 segundos máximo
  })
})
```

## 🔍 Debugging

### Modo Debug
```bash
# Abrir en modo debug
npx cypress open --config watchForFileChanges=true

# Ejecutar con logs detallados
DEBUG=cypress:* npm run cypress:run
```

### Screenshots y Videos
- Screenshots automáticos en fallos
- Videos de ejecución completa
- Ubicación: `cypress/screenshots/` y `cypress/videos/`

## 🏗️ Integración CI/CD

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: |
    npm ci
    npm run start &
    npm run cypress:run
```

### Docker
```dockerfile
FROM cypress/browsers:node18.12.0-chrome107
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "cypress:run"]
```

## 📝 Mantenimiento

### Actualizar Datos de Prueba
1. Modificar archivos en `/fixtures/`
2. Verificar que tests sigan funcionando
3. Actualizar comandos personalizados si es necesario

### Agregar Nuevos Tests
1. Crear archivo `.cy.ts` en `/e2e/`
2. Usar comandos personalizados existentes
3. Seguir patrones de naming con `data-cy`
4. Incluir validaciones de rendimiento

## 🤝 Contribución

1. Todos los elementos interactivos deben tener `data-cy` attributes
2. Tests deben ser independientes entre sí
3. Usar fixtures para datos de prueba
4. Incluir verificaciones de rendimiento
5. Documentar nuevos comandos personalizados

¡Estos tests garantizan que todas las funcionalidades críticas de cursos y reservas funcionen correctamente!