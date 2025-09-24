# Guía de Data Attributes para Tests E2E

Para que los tests de Cypress funcionen correctamente, es necesario agregar atributos `data-cy` a los elementos interactivos de la aplicación.

## 🎯 Elementos Requeridos

### Páginas de Cursos

#### Lista de Cursos (`/courses`)
```html
<div data-cy="courses-list">
  <button data-cy="create-course-button">Crear Curso</button>
  <div data-cy="course-card" *ngFor="let course of courses">
    <h3 data-cy="course-name">{{ course.name }}</h3>
    <span data-cy="course-price">{{ course.price }}</span>
    <span data-cy="course-type">{{ course.course_type === 1 ? 'Colectivo' : 'Privado' }}</span>
  </div>
</div>
```

#### Creación de Cursos
```html
<form data-cy="course-form">
  <input data-cy="course-name-input" formControlName="name" />
  <div data-cy="course-name-error" *ngIf="errors.name">Campo requerido</div>

  <select data-cy="course-sport-select" formControlName="sport_id">
    <option data-cy="sport-option-{{sport.id}}" *ngFor="let sport of sports" [value]="sport.id">
      {{ sport.name }}
    </option>
  </select>
  <div data-cy="course-sport-error" *ngIf="errors.sport">Campo requerido</div>

  <select data-cy="course-type-select" formControlName="course_type">
    <option value="1">Colectivo</option>
    <option value="2">Privado</option>
  </select>

  <input data-cy="course-price-input" formControlName="price" />
  <div data-cy="course-price-error" *ngIf="errors.price">Campo requerido</div>

  <input data-cy="course-duration-input" formControlName="duration" />
  <input data-cy="course-max-participants-input" formControlName="max_participants" />

  <input data-cy="course-flexible-checkbox" type="checkbox" formControlName="is_flexible" />

  <!-- Fechas del curso -->
  <div data-cy="course-dates-section">
    <button data-cy="add-course-date-button">Agregar Fecha</button>
    <div data-cy="course-date-{{i}}" *ngFor="let date of courseDates; let i = index">
      <input data-cy="course-date-{{i}}" type="date" />
      <input data-cy="course-start-time-{{i}}" type="time" />
      <input data-cy="course-end-time-{{i}}" type="time" />
    </div>
  </div>

  <button data-cy="save-course-button">Guardar Curso</button>
</form>
```

#### Detalle de Curso
```html
<div data-cy="course-detail">
  <h1 data-cy="course-detail-name">{{ course.name }}</h1>
  <span data-cy="course-detail-price">{{ course.price }}</span>
  <span data-cy="course-detail-type">{{ course.course_type === 1 ? 'Colectivo' : 'Privado' }}</span>
  <span data-cy="course-flexible-badge" *ngIf="course.is_flexible">Flexible</span>

  <!-- Niveles y estudiantes -->
  <div data-cy="course-levels-section">
    <div data-cy="level-item" *ngFor="let level of levels">
      <span data-cy="level-active-indicator" *ngIf="level.active">●</span>
      <span data-cy="level-visible-badge" *ngIf="level.visible">Visible</span>
      <span data-cy="level-active-badge" *ngIf="level.active">Activo</span>

      <div data-cy="level-students-list" *ngIf="level.expanded">
        <div data-cy="student-item" *ngFor="let student of level.students">
          <span data-cy="student-name">{{ student.first_name }} {{ student.last_name }}</span>
        </div>
      </div>
      <span data-cy="level-students-count">{{ level.students?.length || 0 }}</span>
    </div>
  </div>

  <div data-cy="course-bookings">
    <!-- Lista de reservas del curso -->
  </div>
</div>
```

### Páginas de Reservas

#### Creación de Reservas (`/bookings/create`)
```html
<!-- Paso 1: Selección de Cliente -->
<form data-cy="booking-form">
  <div data-cy="client-selection-step">
    <input data-cy="client-search-input" placeholder="Buscar cliente..." />
    <div data-cy="client-option" *ngFor="let client of filteredClients">
      {{ client.first_name }} {{ client.last_name }}
    </div>
    <div data-cy="selected-client-name" *ngIf="selectedClient">
      {{ selectedClient.first_name }} {{ selectedClient.last_name }}
    </div>
    <div data-cy="client-required-error" *ngIf="!selectedClient">Cliente requerido</div>
  </div>

  <!-- Paso 2: Participantes -->
  <div data-cy="participants-section">
    <span data-cy="participants-count">{{ utilizers.length }}</span>
  </div>

  <!-- Paso 3: Deporte y Nivel -->
  <div data-cy="sport-level-step">
    <select data-cy="sport-select">
      <option data-cy="sport-option" *ngFor="let sport of sports" [value]="sport.id">
        {{ sport.name }}
      </option>
    </select>
    <select data-cy="level-select">
      <option data-cy="level-option" *ngFor="let level of levels" [value]="level.id">
        {{ level.name }}
      </option>
    </select>
  </div>

  <!-- Paso 4: Selección de Curso -->
  <div data-cy="course-selection-step">
    <button data-cy="course-tab-collective">Colectivo</button>
    <button data-cy="course-tab-private">Privado</button>

    <div data-cy="course-card" *ngFor="let course of availableCourses">
      <div data-cy="course-card-{{course.id}}">{{ course.name }}</div>
    </div>
  </div>

  <!-- Paso 5: Detalles -->
  <div data-cy="details-step">
    <!-- Para cursos regulares -->
    <input data-cy="date-input" type="date" />
    <select data-cy="hour-select">
      <option *ngFor="let hour of availableHours" [value]="hour">{{ hour }}</option>
    </select>
    <input data-cy="duration-field" [readonly]="!course.is_flexible" />
    <select data-cy="duration-select" *ngIf="course.is_flexible">
      <option *ngFor="let duration of possibleDurations" [value]="duration">{{ duration }}</option>
    </select>

    <!-- Para cursos colectivos flexibles -->
    <div data-cy="flex-course-dates" *ngIf="course.is_flexible && course.course_type === 1">
      <div data-cy="flex-date-item" *ngFor="let date of course.course_dates; let i = index">
        <input data-cy="flex-date-checkbox" data-cy="flexible-date-checkbox" type="checkbox" />
        <select data-cy="extras-select" [disabled]="!date.selected">
          <option *ngFor="let extra of availableExtras" [value]="extra.id">{{ extra.name }}</option>
        </select>
      </div>
    </div>

    <input data-cy="date-checkbox" type="checkbox" />
    <div data-cy="availability-status">{{ availabilityStatus }}</div>
    <div data-cy="conflict-warning" *ngIf="hasConflict">Conflicto de horario</div>
  </div>

  <!-- Paso 6: Observaciones -->
  <div data-cy="observations-step">
    <textarea data-cy="client-observations" placeholder="Observaciones del cliente"></textarea>
  </div>

  <button data-cy="next-step-button">Siguiente</button>
  <button data-cy="complete-booking-button">Completar Reserva</button>
  <button data-cy="save-activity-button">Guardar Actividad</button>
</form>
```

#### Lista de Reservas (`/bookings`)
```html
<div data-cy="bookings-list">
  <div data-cy="booking-row" *ngFor="let booking of bookings">
    {{ booking.client.first_name }} {{ booking.client.last_name }}
  </div>
</div>
```

#### Resumen de Reserva
```html
<div data-cy="booking-summary">
  <div data-cy="client-header-name">{{ mainClient.first_name }} {{ mainClient.last_name }}</div>

  <div data-cy="booking-client-name">{{ client.first_name }} {{ client.last_name }}</div>
  <div data-cy="booking-summary-client-name">{{ client.first_name }} {{ client.last_name }}</div>
  <div data-cy="booking-summary-client-email">{{ client.email }}</div>

  <button data-cy="add-activity-button">Agregar Actividad</button>
  <button data-cy="edit-activity-button">Editar Actividad</button>
  <button data-cy="back-to-summary-button">Volver al Resumen</button>
  <button data-cy="return-to-summary-button">Regresar al Resumen</button>
  <button data-cy="save-booking-button">Guardar Reserva</button>
</div>
```

### Planificador/Scheduler (`/scheduler`)
```html
<div data-cy="scheduler">
  <div data-cy="calendar-view">
    <div data-cy="booking-event" *ngFor="let event of calendarEvents">
      {{ event.title }}
    </div>
  </div>

  <!-- Filtros -->
  <select data-cy="sport-filter">
    <option data-cy="sport-option" *ngFor="let sport of sports" [value]="sport.id">{{ sport.name }}</option>
  </select>
  <button data-cy="apply-filter">Aplicar Filtro</button>

  <div data-cy="date-range-filter">
    <input data-cy="start-date" type="date" />
    <input data-cy="end-date" type="date" />
    <button data-cy="apply-date-filter">Aplicar</button>
  </div>

  <!-- Modal de detalles -->
  <div data-cy="event-details-modal" data-cy="booking-detail-modal">
    <div data-cy="event-client-name" data-cy="booking-detail-client">{{ event.client.name }}</div>
    <button data-cy="edit-booking-button">Editar Reserva</button>
    <button data-cy="modal-close">×</button>
  </div>

  <!-- Confirmación de reprogramación -->
  <div data-cy="reschedule-confirmation">
    <button data-cy="confirm-reschedule">Confirmar</button>
  </div>
</div>
```

### Elementos Globales

#### Navegación
```html
<nav data-cy="main-navigation">
  <button data-cy="mobile-menu-button">☰</button>
  <div data-cy="mobile-menu">
    <a data-cy="mobile-create-course">Crear Curso</a>
  </div>
</nav>

<div data-cy="user-menu">
  <select data-cy="language-selector">
    <option data-cy="language-es" value="es">Español</option>
    <option data-cy="language-en" value="en">English</option>
    <option data-cy="language-fr" value="fr">Français</option>
  </select>
</div>
```

#### Notificaciones
```html
<div data-cy="notification" data-cy="error-message">
  {{ notificationMessage }}
</div>
```

#### Login
```html
<form data-cy="login-form">
  <input data-cy="email-input" type="email" />
  <input data-cy="password-input" type="password" />
  <button data-cy="login-button">Iniciar Sesión</button>
</form>
```

#### Botones de Acción
```html
<button data-cy="retry-button">Reintentar</button>
<button data-cy="mobile-next-button">Siguiente</button>
```

#### Títulos de Página
```html
<h1 data-cy="page-title">{{ pageTitle }}</h1>
```

## 📋 Checklist de Implementación

### Para Desarrolladores:
- [ ] Agregar `data-cy` a todos los botones interactivos
- [ ] Agregar `data-cy` a todos los inputs y selects
- [ ] Agregar `data-cy` a elementos de navegación
- [ ] Agregar `data-cy` a mensajes de error/éxito
- [ ] Agregar `data-cy` a modales y sus botones
- [ ] Agregar `data-cy` a listas y elementos repetidos con índices únicos
- [ ] Agregar `data-cy` a indicadores de estado (loading, error, success)

### Convenciones de Naming:
- **Botones**: `{action}-button` (ej: `create-course-button`, `save-booking-button`)
- **Inputs**: `{field}-input` (ej: `course-name-input`, `client-search-input`)
- **Selects**: `{field}-select` (ej: `sport-select`, `level-select`)
- **Opciones**: `{type}-option` o `{type}-option-{id}` (ej: `sport-option`, `sport-option-1`)
- **Errores**: `{field}-error` (ej: `course-name-error`, `client-required-error`)
- **Listas**: `{type}-list` (ej: `courses-list`, `bookings-list`)
- **Items**: `{type}-item` (ej: `course-card`, `student-item`)
- **Secciones**: `{type}-section` (ej: `course-levels-section`, `participants-section`)

### Elementos Dinámicos:
```html
<!-- Con índices -->
<div data-cy="course-date-{{i}}" *ngFor="let date of dates; let i = index">

<!-- Con IDs -->
<div data-cy="course-card-{{course.id}}" *ngFor="let course of courses">

<!-- Estados condicionales -->
<span data-cy="level-active-badge" *ngIf="level.active">
<span data-cy="level-visible-badge" *ngIf="level.visible">
```

¡Con estos atributos, los tests de Cypress podrán validar completamente el flujo de cursos y reservas!