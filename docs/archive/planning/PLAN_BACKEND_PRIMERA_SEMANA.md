# 🚀 PLAN BACKEND V5 - PRIMERA SEMANA (28-31 Enero)

## 🎯 OBJETIVO: Backend Core + APIs Críticas Listas

Mientras el equipo de diseño trabaja en Figma, desarrollamos toda la lógica de negocio y APIs del backend V5, dejando el frontend con estructura funcional básica lista para recibir el diseño.

---

## 🗓️ MARTES 28 ENERO - MÓDULO SEASONS (Crítico)

### ⏰ Cronograma Detallado

#### **9:00-10:30: Database & Models**
```bash
# 1. Crear migración principal
php artisan make:migration create_seasons_table_v5
php artisan make:migration create_season_snapshots_table
php artisan make:migration create_season_settings_table

# 2. Definir relaciones
php artisan make:model Season
php artisan make:model SeasonSnapshot  
php artisan make:model SeasonSettings
```

#### **10:30-12:00: Repository Pattern**
```bash
# 3. Implementar repositories
app/V5/Repositories/SeasonRepository.php
app/V5/Repositories/SeasonSnapshotRepository.php

# 4. Base queries season-aware
- findBySeason()
- getCurrentSeason()
- getActiveSeasons()
- createSeasonSnapshot()
```

#### **14:00-15:30: Business Logic**
```bash
# 5. Services core
app/V5/Services/SeasonService.php
- createSeason()
- cloneSeason()
- closeSeason()
- activateSeason()

app/V5/Services/SeasonSnapshotService.php
- createImmutableSnapshot()
- validateSnapshot()
```

#### **15:30-17:00: API Endpoints**
```bash
# 6. Controller completo
app/V5/Controllers/SeasonController.php

GET    /v5/seasons                 # Lista temporadas
POST   /v5/seasons                 # Crear temporada
GET    /v5/seasons/{id}            # Detalle temporada
PUT    /v5/seasons/{id}            # Actualizar temporada
DELETE /v5/seasons/{id}            # Eliminar temporada
GET    /v5/seasons/current         # Temporada activa
POST   /v5/seasons/{id}/close      # Cerrar temporada
POST   /v5/seasons/{id}/clone      # Clonar temporada
```

#### **17:00-18:00: Testing**
```bash
# 7. Tests completos
tests/V5/Unit/SeasonServiceTest.php
tests/V5/Feature/SeasonApiTest.php
tests/V5/Integration/SeasonWorkflowTest.php

# Ejecutar y validar
vendor/bin/phpunit tests/V5/
```

### 🎯 **Entregables Martes:**
- ✅ Modelo Season completo con business logic
- ✅ APIs /v5/seasons funcionales al 100%
- ✅ Tests passing al 100%
- ✅ Documentación automática (Swagger)

---

## 🗓️ MIÉRCOLES 29 ENERO - SCHOOLS + AUTH V5

### ⏰ Cronograma Detallado

#### **9:00-10:30: School Season Context**
```bash
# 1. Migración school-season relationship
php artisan make:migration add_season_context_to_schools
php artisan make:migration create_school_season_settings_table

# 2. Refactorizar School model
app/Models/School.php → season relationships
app/V5/Models/SchoolSeasonSettings.php
```

#### **10:30-12:00: Auth Season-Aware** 
```bash
# 3. User season roles
php artisan make:migration create_user_season_roles_table
app/V5/Models/UserSeasonRole.php

# 4. Auth services V5
app/V5/Services/AuthV5Service.php
- loginWithSeasonContext()
- checkSeasonPermissions()
- assignSeasonRole()
```

#### **14:00-15:30: Middleware + Guards**
```bash
# 5. Season context automático
app/V5/Middleware/SeasonContextMiddleware.php
app/V5/Guards/SeasonPermissionGuard.php

# 6. Route protection
Route::middleware(['season.context', 'season.permission'])
```

#### **15:30-17:00: API Endpoints**
```bash
# 7. Controllers
app/V5/Controllers/SchoolV5Controller.php
app/V5/Controllers/AuthV5Controller.php

GET    /v5/schools?season_id={id}     # Schools por temporada
POST   /v5/auth/login                 # Login con season context  
GET    /v5/auth/permissions           # Permisos por temporada
POST   /v5/auth/season/switch         # Cambiar temporada activa
```

#### **17:00-18:00: Integration Testing**
```bash
# 8. Tests integración
tests/V5/Feature/AuthSeasonTest.php
tests/V5/Feature/SchoolSeasonTest.php
tests/V5/Integration/SeasonContextTest.php
```

### 🎯 **Entregables Miércoles:**
- ✅ Sistema auth season-aware funcional
- ✅ Middleware season context automático
- ✅ School-season relationships working
- ✅ Permission system por temporada

---

## 🗓️ JUEVES 30 ENERO - COURSES V5 (Rediseño Total)

### ⏰ Cronograma Detallado

#### **9:00-11:00: Models Revolution**
```bash
# 1. Nuevos modelos course season-aware
php artisan make:migration create_season_courses_table
php artisan make:migration create_course_season_pricing_table  
php artisan make:migration create_course_season_availability_table

# 2. Models con business logic
app/V5/Models/SeasonCourse.php
app/V5/Models/CourseSeasonPricing.php
app/V5/Models/CourseSeasonAvailability.php
```

#### **11:00-12:30: Services Complejos**
```bash
# 3. Business logic avanzada
app/V5/Services/CourseSeasonService.php
- createCourseInSeason()
- calculateSeasonalPricing()
- checkSeasonalAvailability()

app/V5/Services/CoursePricingService.php
- calculateFlexiblePricing()
- applySeasonalDiscounts()
- generatePricingSnapshot()
```

#### **14:00-15:30: Availability Engine**
```bash
# 4. Sistema disponibilidad
app/V5/Services/CourseAvailabilityService.php
- calculateRealTimeSlots()
- handleOverbooking()
- manageWaitlist()

# 5. Repository optimization
app/V5/Repositories/CourseSeasonRepository.php
- Complex queries con joins optimizados
- Caching strategies
```

#### **15:30-17:00: API Endpoints**
```bash
# 6. Controller completo
app/V5/Controllers/CourseV5Controller.php

GET    /v5/courses?season_id={id}        # Cursos por temporada
POST   /v5/courses                       # Crear curso en temporada
PUT    /v5/courses/{id}/pricing          # Actualizar precios temporada
GET    /v5/courses/{id}/availability     # Disponibilidad real-time
POST   /v5/courses/{id}/duplicate        # Duplicar a otra temporada
```

#### **17:00-18:00: Performance Testing**
```bash
# 7. Tests performance + business logic
tests/V5/Performance/CourseAvailabilityTest.php
tests/V5/Unit/CoursePricingCalculationTest.php
tests/V5/Feature/CourseSeasonWorkflowTest.php
```

### 🎯 **Entregables Jueves:**
- ✅ Course system season-aware completo
- ✅ Pricing engine con cálculos complejos
- ✅ Availability engine real-time
- ✅ Performance optimizado

---

## 🗓️ VIERNES 31 ENERO - BOOKINGS V5 (Arquitectura Nueva)

### ⏰ Cronograma Detallado

#### **9:00-11:00: Models Immutable**
```bash
# 1. Booking season-aware con snapshots
php artisan make:migration create_season_bookings_table
php artisan make:migration create_booking_price_snapshots_table
php artisan make:migration create_booking_season_payments_table

# 2. Models con immutability
app/V5/Models/SeasonBooking.php
app/V5/Models/BookingPriceSnapshot.php  
app/V5/Models/BookingSeasonPayment.php
```

#### **11:00-12:30: Calculator Engine**
```bash
# 3. Pricing calculator V5
app/V5/Services/BookingPriceCalculatorV5.php
- calculateWithSeasonContext()
- createImmutableSnapshot()
- applyVouchersAndDiscounts()

# 4. Booking workflow
app/V5/Services/BookingSeasonService.php
- createBookingWithSnapshot()
- modifyBookingImmutable()
- cancelBookingWithRefund()
```

#### **14:00-15:30: Payment Integration**
```bash
# 5. Payment system season-aware
app/V5/Services/PaymentSeasonService.php
- processSeasonPayment()
- calculateSeasonRefund()
- handlePaymentFailure()

# 6. Repository optimization
app/V5/Repositories/BookingSeasonRepository.php
- Complex aggregations
- Financial calculations
```

#### **15:30-17:00: API Endpoints**
```bash
# 7. Controller completo
app/V5/Controllers/BookingV5Controller.php

GET    /v5/bookings?season_id={id}     # Bookings por temporada
POST   /v5/bookings                    # Crear booking con snapshot
PUT    /v5/bookings/{id}/modify        # Modificar con nuevo snapshot
POST   /v5/bookings/{id}/cancel        # Cancelar con refund calculation
GET    /v5/bookings/{id}/history       # Historia inmutable
```

#### **17:00-18:00: Financial Testing**
```bash
# 8. Tests financieros críticos
tests/V5/Financial/BookingCalculationTest.php
tests/V5/Financial/PaymentIntegrityTest.php
tests/V5/Feature/BookingWorkflowTest.php

# Validation: Cálculos al céntimo exacto
```

### 🎯 **Entregables Viernes:**
- ✅ Booking system immutable completo
- ✅ Payment integration season-aware
- ✅ Financial calculations validated
- ✅ Booking workflow end-to-end

---

## 🧪 TESTING STRATEGY SEMANAL

### **Daily Testing (30min/día)**
```bash
# Cada día al finalizar
vendor/bin/phpunit tests/V5/ --coverage-html coverage
vendor/bin/pint --test
php artisan l5-swagger:generate
```

### **Integration Testing (Viernes tarde)**
```bash
# End-to-end workflow
tests/V5/Integration/CompleteSeasonWorkflowTest.php
- Create season → Create courses → Create bookings → Process payments
- Validate data consistency
- Performance benchmarks
```

### **Data Integrity Validation**
```bash
# Financial consistency
tests/V5/Financial/DataIntegrityTest.php
- All calculations match expected results
- No rounding errors
- Payment totals balance
```

---

## 📱 FRONTEND BÁSICO PARALELO

### **Estructura Sin Diseño (1 hora/día)**
```bash
# Componentes funcionales básicos
ng generate component v5/seasons/season-list
ng generate component v5/seasons/season-form  
ng generate component v5/courses/course-list
ng generate component v5/bookings/booking-list

# Services conectados a APIs
ng generate service v5/seasons/season
ng generate service v5/courses/course
ng generate service v5/bookings/booking

# Routing funcional
v5/seasons → /v5/seasons
v5/courses → /v5/courses  
v5/bookings → /v5/bookings
```

---

## 🎯 CRITERIOS DE ÉXITO SEMANAL

### **Performance Targets**
- ✅ API response time < 200ms
- ✅ Database queries optimizadas
- ✅ Concurrent user handling tested

### **Business Logic Validation**
- ✅ Season immutability working
- ✅ Financial calculations precise
- ✅ Data integrity maintained

### **Code Quality**
- ✅ Test coverage > 90%
- ✅ Code style consistent (Pint)
- ✅ API documentation complete

### **Ready for Design Integration**
- ✅ All APIs documented y funcionales
- ✅ Frontend structure preparada
- ✅ Mock data flowing correctly

---

## 🚀 SIGUIENTE SEMANA (3-7 Feb) 

Una vez el diseño esté listo:
1. **Integración Design System** → Angular components
2. **Módulo Rental** → Backend + Frontend complete
3. **Advanced Analytics** → Dashboard con nuevos datos
4. **Mobile optimization** → Responsive implementation

**¿Empezamos mañana martes con el Módulo Seasons?** 🚀
