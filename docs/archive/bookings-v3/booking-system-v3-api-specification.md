# 🚀 **Boukii Booking System V3 - API Specification**

## 📋 **Tabla de Contenidos**
1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Wizard Inteligente](#wizard-inteligente)
4. [Gestión de Reservas](#gestión-de-reservas)
5. [Gestión de Clientes](#gestión-de-clientes)
6. [Disponibilidad y Horarios](#disponibilidad-y-horarios)
7. [Pricing Dinámico](#pricing-dinámico)
8. [Inteligencia Artificial](#inteligencia-artificial)
9. [Edición de Reservas](#edición-de-reservas)
10. [Analytics y Métricas](#analytics-y-métricas)
11. [Comunicaciones](#comunicaciones)
12. [Operaciones Masivas](#operaciones-masivas)
13. [Webhooks y Tiempo Real](#webhooks-y-tiempo-real)

---

## 🎯 **Introducción**

Esta especificación define los nuevos endpoints para el **Sistema de Reservas Inteligente V3** de Boukii. El sistema incluye:

- **Wizard inteligente** con 6 pasos optimizados
- **IA integrada** para sugerencias y validaciones
- **Pricing dinámico** en tiempo real
- **Detección predictiva** de conflictos
- **Validación en tiempo real**
- **Gestión avanzada** de cambios

### **Base URL**
```
https://api.boukii.com/v3
```

### **Versioning**
- **V3**: Sistema completo con IA
- **V2**: APIs actuales (mantener compatibilidad)
- **V1**: APIs legacy (deprecar gradualmente)

---

## 🔐 **Autenticación**

Todos los endpoints requieren autenticación Bearer token.

```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## 🧙‍♂️ **Wizard Inteligente**

### **1. Crear Reserva con Wizard**
```http
POST /bookings/smart-create
```

**Request Body:**
```typescript
{
  // Datos del cliente
  client: {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    level?: string;
    isNew?: boolean;
  };
  
  // Datos del curso
  course: {
    id: number;
    type: 'group' | 'private' | 'semi_private';
    participants: number;
  };
  
  // Fechas y horarios
  schedule: {
    dates: string[]; // ISO dates
    timeSlots: number[];
    timezone: string;
  };
  
  // Monitor (opcional, puede auto-asignarse)
  monitor?: {
    id?: number;
    autoAssign?: boolean;
    preferences?: string[];
  };
  
  // Participantes
  participants: Array<{
    firstName: string;
    lastName: string;
    age: number;
    level: string;
    medicalConditions?: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  }>;
  
  // Pricing y extras
  pricing: {
    acceptDynamicPricing: boolean;
    promoCode?: string;
    paymentMethod?: string;
    paymentSchedule?: 'immediate' | 'installments';
  };
  
  // Metadata
  metadata: {
    source: 'wizard_v3';
    wizardVersion: string;
    validationPassed: boolean;
    createdVia: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    booking: {
      id: number;
      bookingNumber: string;
      status: 'confirmed' | 'pending_payment';
      totalPrice: number;
      finalBreakdown: PriceBreakdown;
      paymentInstructions?: PaymentInstructions;
    };
    recommendations: {
      similarCourses: Course[];
      upgrades: CourseUpgrade[];
      addOns: ExtraService[];
    };
    notifications: {
      clientNotified: boolean;
      confirmationSent: boolean;
      scheduleShared: boolean;
    };
  };
  warnings?: string[];
  message: string;
}
```

### **2. Guardar Borrador del Wizard**
```http
POST /bookings/drafts
```

**Request Body:**
```typescript
{
  data: {
    currentStep: number;
    stepData: any;
    formData: any;
  };
  metadata: {
    userId: number;
    sessionId: string;
    timestamp: string;
    expiresAt: string;
  };
}
```

### **3. Validar Paso del Wizard**
```http
POST /bookings/validate-step
```

**Request Body:**
```typescript
{
  step: number; // 1-6
  data: any;
  context: {
    previousSteps: any[];
    clientData?: any;
    sessionId: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    isValid: boolean;
    canProceed: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    suggestions: ValidationSuggestion[];
    nextStepPreload?: any; // Datos para precargar siguiente paso
  };
}
```

---

## 📚 **Gestión de Reservas**

### **41. Listar Reservas**
```http
GET /bookings?type={tipo}&status={status}&page={page}&perPage={perPage}
```

**Query Parameters:**
- `type`: `cursos` | `actividades` | `material`
- `status`: Estado de la reserva
- `page`: Número de página
- `perPage`: Registros por página

**Response Example:**
```typescript
{
  success: boolean;
  data: {
    bookings: Booking[];
    meta: PaginationMeta;
  };
}
```

### **42. Crear Reserva**
```http
POST /bookings
```

**Request Body:**
```typescript
{
  client_id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  participants: number;
  notes?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Booking;
  message: string;
}
```

### **43. Cancelar Reserva**
```http
POST /bookings/{id}/cancel
```

**Request Body:**
```typescript
{
  reason: string;
  notifyClient: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    bookingId: number;
    status: 'canceled';
    refundAmount?: number;
  };
  message: string;
}
```

### **44. Obtener KPIs de Reservas**
```http
GET /bookings/kpis?type={tipo}&start_date={start}&end_date={end}
```

**Query Parameters:**
- `type`: `cursos` | `actividades` | `material`
- `start_date`: Fecha inicial
- `end_date`: Fecha final

**Response Example:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    confirmed: number;
    canceled: number;
    revenueExpected: number;
    revenueReceived: number;
  };
}
```

---

## 👥 **Gestión de Clientes**

### **4. Búsqueda Inteligente de Clientes**
```http
GET /clients/smart-search?q={query}&limit={limit}&include_insights={boolean}
```

**Query Parameters:**
- `q`: Término de búsqueda (nombre, email, teléfono)
- `limit`: Número máximo de resultados (default: 10)
- `include_insights`: Incluir insights del cliente (default: false)
- `fuzzy`: Búsqueda difusa habilitada (default: true)

**Response:**
```typescript
{
  success: boolean;
  data: {
    results: Array<{
      client: Client;
      matchScore: number; // 0-100
      matchReasons: string[];
      insights?: {
        bookingHistory: BookingHistoryItem[];
        preferences: ClientPreferences;
        riskProfile: ClientRiskProfile;
        suggestedCourses: CourseTypeSuggestion[];
      };
    }>;
    searchMetrics: {
      totalResults: number;
      searchTime: number;
      query: string;
    };
  };
}
```

### **5. Obtener Clientes Recientes/Favoritos**
```http
GET /clients/recent?limit={limit}
GET /clients/favorites?limit={limit}
```

### **6. Crear Cliente con Validación**
```http
POST /clients/smart-create
```

**Request Body:**
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  level: string;
  preferences?: {
    sports: number[];
    timeSlots: string[];
    communicationChannel: string;
  };
  notes?: string;
  source: 'wizard' | 'admin' | 'import';
}
```

### **7. Insights de Cliente**
```http
GET /clients/{id}/insights
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    profile: ClientProfile;
    metrics: ClientMetrics;
    preferences: ClientPreferences;
    bookingHistory: BookingHistoryItem[];
    riskProfile: ClientRiskProfile;
    suggestedCourses: CourseTypeSuggestion[];
    seasonalPatterns: SeasonalActivity[];
    loyaltyInfo: {
      tier: string;
      points: number;
      benefits: string[];
    };
  };
}
```

---

## 📅 **Disponibilidad y Horarios**

### **8. Matriz de Disponibilidad**
```http
POST /availability/matrix
```

**Request Body:**
```typescript
{
  startDate: string; // ISO date
  endDate: string;
  courseId?: number;
  sportId?: number;
  participantCount?: number;
  filters?: {
    monitorIds?: number[];
    timeSlots?: number[];
    levels?: string[];
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    matrix: Array<{
      date: string;
      slots: Array<{
        timeSlot: TimeSlot;
        availability: {
          total: number;
          available: number;
          booked: number;
          blocked: number;
        };
        monitors: Array<{
          monitor: Monitor;
          available: boolean;
          capacity: number;
          currentLoad: number;
        }>;
        pricing: {
          basePrice: number;
          dynamicPrice: number;
          demandMultiplier: number;
        };
        weather?: WeatherInfo;
        recommendations: {
          score: number;
          reasons: string[];
        };
      }>;
    }>;
    summary: {
      totalSlots: number;
      availableSlots: number;
      optimalSlots: number;
      averagePrice: number;
    };
  };
}
```

### **9. Slots Óptimos**
```http
POST /availability/optimal-slots
```

**Request Body:**
```typescript
{
  courseId: number;
  participantCount: number;
  preferredDates: string[];
  clientPreferences?: {
    timePreferences: string[];
    monitorPreferences: number[];
    budgetRange?: { min: number; max: number };
  };
  criteria?: {
    weather: number;    // Weight 0-1
    price: number;      // Weight 0-1
    monitor: number;    // Weight 0-1
    crowd: number;      // Weight 0-1
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    optimalSlots: Array<{
      date: string;
      timeSlot: TimeSlot;
      score: number; // 0-100
      reasons: Array<{
        factor: string;
        impact: number;
        description: string;
      }>;
      monitor: Monitor;
      pricing: PriceBreakdown;
      weather: WeatherInfo;
      availability: {
        spotsLeft: number;
        competitionLevel: 'low' | 'medium' | 'high';
      };
    }>;
    alternatives: Array<{
      type: 'date' | 'time' | 'course';
      suggestion: any;
      reason: string;
      score: number;
    }>;
  };
}
```

### **10. Verificar Disponibilidad en Tiempo Real**
```http
POST /availability/realtime-check
```

**Request Body:**
```typescript
{
  courseId: number;
  dates: string[];
  participantCount: number;
  monitorId?: number;
  timeSlots?: number[];
}
```

---

## 💰 **Pricing Dinámico**

### **11. Calcular Precio Dinámico**
```http
POST /pricing/calculate-dynamic
```

**Request Body:**
```typescript
{
  courseId: number;
  dates: string[];
  participantCount: number;
  clientId?: number;
  promoCode?: string;
  timeSlots?: number[];
  addOns?: number[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    breakdown: PriceBreakdown;
    dynamicFactors: {
      demandMultiplier: number;
      seasonalAdjustment: number;
      weatherImpact: number;
      lastMinuteDiscount: number;
      earlyBirdDiscount: number;
      loyaltyDiscount: number;
      groupDiscount: number;
    };
    comparison: {
      basePrice: number;
      finalPrice: number;
      savings: number;
      savingsPercentage: number;
    };
    validity: {
      expiresAt: string;
      conditions: string[];
    };
    alternatives: Array<{
      modification: string;
      newPrice: number;
      savings: number;
    }>;
  };
}
```

### **12. Ofertas Promocionales**
```http
GET /pricing/promotional-offers?client_id={id}&course_id={id}&date={date}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    offers: Array<{
      id: number;
      name: string;
      description: string;
      type: 'percentage' | 'fixed' | 'bogo' | 'upgrade';
      value: number;
      conditions: string[];
      validUntil: string;
      autoApply: boolean;
      priority: number;
      estimatedSavings: number;
    }>;
    personalizedOffers: Array<{
      // Ofertas específicas para este cliente
      reason: string;
      confidence: number;
    }>;
  };
}
```

### **13. Planes de Pago**
```http
GET /pricing/payment-plans?amount={amount}&client_id={id}
```

---

## 🤖 **Inteligencia Artificial**

### **14. Sugerencias Inteligentes**
```http
GET /ai/smart-suggestions?context={json}
```

**Query Parameters:**
- `context`: JSON con contexto (cliente, fecha, tipo de curso, etc.)

**Response:**
```typescript
{
  success: boolean;
  data: {
    courseSuggestions: Array<{
      course: Course;
      confidence: number;
      reasons: string[];
      suitabilityScore: number;
    }>;
    scheduleSuggestions: Array<{
      dates: string[];
      timeSlots: TimeSlot[];
      score: number;
      benefits: string[];
    }>;
    monitorSuggestions: Array<{
      monitor: Monitor;
      compatibilityScore: number;
      reasons: string[];
    }>;
    bundleSuggestions: Array<{
      name: string;
      courses: Course[];
      discount: number;
      popularity: number;
    }>;
  };
}
```

### **15. Recomendaciones de Cursos**
```http
GET /ai/course-recommendations?client_id={id}&season_id={id}&sport_id={id}
```

### **16. Análisis Predictivo**
```http
POST /ai/predictive-analysis
```

**Request Body:**
```typescript
{
  type: 'demand' | 'cancellation' | 'satisfaction' | 'revenue';
  timeframe: string; // "7d", "30d", "season"
  parameters: {
    courseIds?: number[];
    clientSegments?: string[];
    weatherScenarios?: string[];
  };
}
```

---

## ✏️ **Edición de Reservas**

### **17. Cargar Datos para Edición**
```http
GET /bookings/{id}/edit-data
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    booking: EnhancedBooking;
    editableFields: EditableField[];
    constraints: EditConstraint[];
    quickActions: QuickActionGroup[];
    relatedData: {
      alternatives: AlternativeOption[];
      impactAnalysis: ChangeImpactAnalysis;
    };
    history: BookingChange[];
  };
}
```

### **18. Actualizar con Validación**
```http
PUT /bookings/{id}/smart-update
```

**Request Body:**
```typescript
{
  changes: {
    [fieldName: string]: {
      oldValue: any;
      newValue: any;
      reason?: string;
    };
  };
  options: {
    validateRealTime: boolean;
    notifyClient: boolean;
    autoResolveConflicts: boolean;
    dryRun?: boolean; // Solo validar, no aplicar
  };
  metadata: {
    changedBy: number;
    reason: string;
    source: 'admin' | 'client' | 'system';
  };
}
```

### **19. Analizar Impacto de Cambios**
```http
POST /bookings/{id}/analyze-impact
```

**Request Body:**
```typescript
{
  proposedChanges: {
    [fieldName: string]: any;
  };
  options: {
    includeFinancialImpact: boolean;
    includeClientImpact: boolean;
    includeOperationalImpact: boolean;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    affectedSystems: string[];
    financialImpact: {
      priceChange: number;
      refundRequired: number;
      additionalCharges: number;
      netImpact: number;
    };
    operationalImpact: {
      monitorReassignment: boolean;
      capacityImpact: number;
      scheduleConflicts: ConflictAlert[];
    };
    clientImpact: {
      notificationRequired: boolean;
      satisfactionRisk: number;
      compensationSuggested: boolean;
    };
    recommendations: string[];
    approvalRequired: boolean;
  };
}
```

### **20. Opciones de Reprogramación**
```http
GET /bookings/{id}/reschedule-options?preferred_dates={dates}&flexibility={days}
```

### **21. Historial de Cambios**
```http
GET /bookings/{id}/change-history?limit={limit}&include_system={boolean}
```

---

## 🔍 **Detección de Conflictos**

### **22. Detectar Conflictos**
```http
POST /bookings/detect-conflicts
```

**Request Body:**
```typescript
{
  bookingData: {
    courseId: number;
    dates: string[];
    monitorId?: number;
    participantCount: number;
  };
  scope: 'booking' | 'schedule' | 'resource' | 'all';
  timeframe?: {
    start: string;
    end: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    conflicts: Array<{
      id: string;
      type: 'schedule' | 'monitor' | 'capacity' | 'resource' | 'policy';
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      affectedBookings: number[];
      resolutions: Array<{
        id: string;
        title: string;
        description: string;
        automatic: boolean;
        cost: number;
        effort: 'low' | 'medium' | 'high';
      }>;
    }>;
    summary: {
      totalConflicts: number;
      criticalConflicts: number;
      autoResolvable: number;
    };
  };
}
```

### **23. Resolver Conflictos**
```http
POST /bookings/resolve-conflicts
```

**Request Body:**
```typescript
{
  resolutions: Array<{
    conflictId: string;
    resolutionId: string;
    parameters?: any;
    approvedBy?: number;
  }>;
  options: {
    notifyAffectedClients: boolean;
    generateReport: boolean;
  };
}
```

---

## 📊 **Analytics y Métricas**

### **24. Métricas de Reserva**
```http
GET /bookings/{id}/metrics
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    performance: BookingMetrics;
    financial: {
      revenue: number;
      profit: number;
      marginPercentage: number;
      costBreakdown: any;
    };
    satisfaction: {
      score: number;
      reviews: ClientFeedback[];
      nps: number;
    };
    operational: {
      utilizationRate: number;
      efficiencyScore: number;
      resourceUsage: any;
    };
  };
}
```

### **25. Análisis de Rentabilidad**
```http
GET /bookings/{id}/profitability
```

### **26. Sugerencias de Optimización**
```http
GET /analytics/optimization-suggestions?type={type}&timeframe={timeframe}
```

---

## 💬 **Comunicaciones**

### **27. Enviar Notificación Inteligente**
```http
POST /bookings/{id}/send-smart-notification
```

**Request Body:**
```typescript
{
  type: NotificationType;
  channel: 'email' | 'sms' | 'push' | 'whatsapp' | 'auto';
  customization: {
    personalizeContent: boolean;
    includeRecommendations: boolean;
    attachDocuments: boolean;
  };
  scheduling: {
    sendAt?: string; // ISO datetime
    respectBusinessHours: boolean;
    timezone: string;
  };
  content?: {
    subject?: string;
    message?: string;
    templateVariables?: any;
  };
}
```

### **28. Templates Personalizados**
```http
GET /communications/templates-personalized?client_id={id}&type={type}&language={lang}
```

### **29. Auto Follow-up**
```http
POST /communications/auto-follow-up
```

**Request Body:**
```typescript
{
  bookingId: number;
  trigger: 'post_booking' | 'pre_start' | 'post_completion' | 'no_show';
  delay: number; // minutes
  conditions: {
    onlyIfNoResponse?: boolean;
    skipIfRescheduled?: boolean;
    respectOptOut?: boolean;
  };
}
```

---

## 🔄 **Operaciones Masivas**

### **30. Operaciones Bulk**
```http
POST /bookings/bulk-operations
```

**Request Body:**
```typescript
{
  operations: Array<{
    type: 'update' | 'cancel' | 'reschedule' | 'notify' | 'refund';
    bookingIds: number[];
    parameters: any;
    conditions?: {
      skipIfStarted?: boolean;
      requireConfirmation?: boolean;
      notifyClients?: boolean;
    };
  }>;
  options: {
    parallel: boolean;
    rollbackOnError: boolean;
    generateReport: boolean;
  };
}
```

### **31. Duplicar Reserva Inteligente**
```http
POST /bookings/{id}/duplicate-smart
```

**Request Body:**
```typescript
{
  modifications?: {
    clientId?: number;
    dates?: string[];
    participantCount?: number;
  };
  options: {
    optimizeForNewDate: boolean;
    suggestBestSlots: boolean;
    applyCurrentPricing: boolean;
    copyNotes: boolean;
  };
}
```

---

## 🌤️ **Integraciones Externas**

### **32. Pronóstico del Tiempo**
```http
GET /weather/forecast?location={location}&dates[]={dates}&include_ski_conditions={boolean}
```

### **33. Condiciones de Esquí**
```http
GET /external/ski-conditions?resort_id={id}&date={date}
```

---

## 🔗 **Webhooks y Tiempo Real**

### **34. Configurar Webhook**
```http
POST /webhooks/configure
```

**Request Body:**
```typescript
{
  url: string;
  events: string[];
  secret: string;
  filters?: {
    bookingIds?: number[];
    clientIds?: number[];
    courseIds?: number[];
  };
  retry: {
    maxAttempts: number;
    backoffStrategy: 'linear' | 'exponential';
  };
}
```

### **35. Updates en Tiempo Real**
```http
GET /bookings/{id}/realtime-updates
```

### **36. Server-Sent Events**
```http
GET /events/stream?types[]={types}&bookings[]={ids}
```

---

## 📈 **Caché y Performance**

### **37. Limpiar Caché**
```http
DELETE /cache/clear?scope={scope}&pattern={pattern}
```

### **38. Estado del Caché**
```http
GET /cache/status
```

---

## 🛠️ **Utilidades del Sistema**

### **39. Validación Completa**
```http
POST /system/validate-complete
```

### **40. Estado del Sistema**
```http
GET /system/health
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'down';
    version: string;
    uptime: number;
    services: {
      database: 'up' | 'down';
      cache: 'up' | 'down';
      ai: 'up' | 'down';
      weather: 'up' | 'down';
      payments: 'up' | 'down';
    };
    metrics: {
      requestsPerMinute: number;
      averageResponseTime: number;
      errorRate: number;
    };
  };
}
```

---

## 📝 **Códigos de Error**

### **Errores del Sistema**
- `SYSTEM_001`: Error interno del servidor
- `SYSTEM_002`: Servicio temporalmente no disponible
- `SYSTEM_003`: Límite de rate exceeded

### **Errores de Validación**
- `VALIDATION_001`: Datos requeridos faltantes
- `VALIDATION_002`: Formato de datos inválido
- `VALIDATION_003`: Reglas de negocio violadas

### **Errores de Disponibilidad**
- `AVAILABILITY_001`: No hay slots disponibles
- `AVAILABILITY_002`: Monitor no disponible
- `AVAILABILITY_003`: Capacidad excedida

### **Errores de Conflictos**
- `CONFLICT_001`: Conflicto de horarios
- `CONFLICT_002`: Recurso ya reservado
- `CONFLICT_003`: Restricciones de política

### **Errores de Pricing**
- `PRICING_001`: Error en cálculo de precios
- `PRICING_002`: Promoción no válida
- `PRICING_003`: Método de pago no aceptado

---

## 🚀 **Implementación Gradual**

### **Fase 1: Core Functionality**
1. ✅ Wizard endpoints (1-3)
2. ✅ Client management (4-7)
3. ✅ Basic availability (8-10)

### **Fase 2: Intelligence Layer**
4. ⏳ Dynamic pricing (11-13)
5. ⏳ AI suggestions (14-16)
6. ⏳ Conflict detection (22-23)

### **Fase 3: Advanced Features**
7. ⏳ Booking editing (17-21)
8. ⏳ Analytics (24-26)
9. ⏳ Communications (27-29)

### **Fase 4: Enterprise Features**
10. ⏳ Bulk operations (30-31)
11. ⏳ External integrations (32-33)
12. ⏳ Real-time features (34-36)

---

## 📚 **Recursos Adicionales**

### **Documentación**
- [Guía de Implementación](./implementation-guide.md)
- [Ejemplos de Código](./code-examples.md)
- [Casos de Uso](./use-cases.md)

### **Testing**
- [Ambiente de Pruebas](https://api-sandbox.boukii.com/v3)
- [Postman Collection](./boukii-v3.postman_collection.json)
- [Datos de Prueba](./test-data.json)

### **Herramientas**
- [SDK JavaScript](https://github.com/boukii/js-sdk-v3)
- [Swagger UI](https://api.boukii.com/v3/docs)
- [GraphQL Playground](https://api.boukii.com/v3/graphql)

---

## 🎯 **Próximos Pasos**

1. **Revisar especificación** con el equipo de backend
2. **Priorizar endpoints** según necesidades de negocio
3. **Crear ambiente de desarrollo** con datos de prueba
4. **Implementar gradualmente** siguiendo las fases
5. **Documentar casos de uso** específicos
6. **Configurar monitoreo** y alertas
7. **Planificar testing** integral
8. **Preparar migración** desde V2

---

**¿Dudas o sugerencias sobre la especificación? ¡Contacta al equipo de desarrollo!** 🚀