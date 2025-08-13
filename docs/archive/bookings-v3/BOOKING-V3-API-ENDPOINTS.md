# 🔗 **Booking System V3 - API Endpoints**

## 📋 **Tabla de Contenidos**
1. [Endpoints de Reservas](#endpoints-de-reservas)
2. [Endpoints de Clientes](#endpoints-de-clientes) 
3. [Endpoints de Cursos y Actividades](#endpoints-de-cursos-y-actividades)
4. [Endpoints de Skipro](#endpoints-de-skipro)
5. [Endpoints de Analytics](#endpoints-de-analytics)
6. [Endpoints de Sistema](#endpoints-de-sistema)

---

## **🎯 Endpoints de Reservas**

### **F3 & F6: Operaciones CRUD Reservas**

#### **GET /api/v3/bookings**
```typescript
// Obtener lista de reservas con filtros y paginación
interface BookingListRequest {
  page?: number;
  limit?: number;
  filters?: {
    status?: 'confirmed' | 'pending' | 'paid' | 'cancelled';
    type?: 'course' | 'activity' | 'material';
    clientId?: number;
    dateFrom?: string;
    dateTo?: string;
    monitorId?: number;
    sportId?: number;
  };
  sort?: {
    field: 'date' | 'client' | 'price' | 'status';
    direction: 'asc' | 'desc';
  };
}

interface BookingListResponse {
  success: boolean;
  data: {
    bookings: SkiProBooking[];
    pagination: {
      total: number;
      pages: number;
      current: number;
      limit: number;
    };
    kpis: SkiProKPIs;
  };
}
```

#### **GET /api/v3/bookings/{id}**
```typescript
// Obtener detalle completo de una reserva
interface BookingDetailResponse {
  success: boolean;
  data: {
    booking: SkiProBooking;
    timeline: BookingTimelineEvent[];
    relatedBookings: SkiProBooking[];
    profitability: {
      revenue: number;
      costs: number;
      margin: number;
      marginPercent: number;
    };
    conflicts?: ConflictAlert[];
  };
}
```

#### **POST /api/v3/bookings/smart-create**
```typescript
// Crear nueva reserva usando wizard inteligente
interface SmartBookingCreateRequest {
  client: {
    id?: number;
    data?: Partial<SkiProCliente>; // Para nuevos clientes
  };
  course: {
    id: number;
    type: 'course' | 'activity' | 'material';
  };
  schedule: {
    dates: string[];
    timeSlots: number[];
    monitorId?: number;
  };
  participants: Array<{
    firstName: string;
    lastName: string;
    age: number;
    level: string;
    notes?: string;
  }>;
  pricing: {
    basePrice: number;
    discounts: Array<{
      type: string;
      amount: number;
      code?: string;
    }>;
    totalPrice: number;
  };
  metadata: {
    source: 'wizard-v3' | 'api' | 'import';
    notes?: string;
    specialRequests?: string;
  };
}

interface SmartBookingCreateResponse {
  success: boolean;
  data: {
    booking: SkiProBooking;
    bookingNumber: string;
    confirmationCode: string;
    notifications: {
      clientNotified: boolean;
      monitorNotified: boolean;
      adminNotified: boolean;
    };
  };
  warnings?: string[];
}
```

#### **PUT /api/v3/bookings/{id}/smart-update**
```typescript
// Actualizar reserva con validación inteligente
interface SmartBookingUpdateRequest {
  changes: {
    dates?: string[];
    timeSlots?: number[];
    monitorId?: number;
    participants?: Array<Partial<BookingParticipant>>;
    status?: BookingStatus;
    notes?: string;
  };
  options: {
    validateRealTime: boolean;
    notifyClient: boolean;
    notifyMonitor: boolean;
    allowConflicts: boolean;
  };
}
```

#### **POST /api/v3/bookings/{id}/cancel**
```typescript
// Cancelar reserva
interface CancelBookingRequest {
  reason: string;
  refundAmount?: number;
  notifyClient: boolean;
  notifyMonitor: boolean;
}
```

### **F3: Endpoints de Lectura Avanzada**

#### **POST /api/v3/bookings/search**
```typescript
// Búsqueda avanzada de reservas
interface AdvancedSearchRequest {
  query?: string;
  filters: {
    dateRange: { start: string; end: string };
    status: BookingStatus[];
    types: BookingType[];
    priceRange: { min: number; max: number };
    clients: number[];
    monitors: number[];
    sports: number[];
  };
  aggregations?: {
    byStatus: boolean;
    byType: boolean;
    byMonth: boolean;
    revenue: boolean;
  };
}
```

#### **GET /api/v3/bookings/availability-matrix**
```typescript
// Matriz de disponibilidad
interface AvailabilityMatrixRequest {
  startDate: string;
  endDate: string;
  courseId?: number;
  sportId?: number;
  monitorId?: number;
}

interface AvailabilityMatrixResponse {
  success: boolean;
  data: {
    matrix: Array<{
      date: string;
      slots: Array<{
        time: string;
        available: boolean;
        capacity: number;
        booked: number;
        conflicts: string[];
      }>;
    }>;
    summary: {
      totalSlots: number;
      availableSlots: number;
      occupancyRate: number;
    };
  };
}
```

#### **POST /api/v3/bookings/detect-conflicts**
```typescript
// Detección de conflictos en tiempo real
interface ConflictDetectionRequest {
  bookingData: Partial<SmartBookingCreateRequest>;
  excludeBookingId?: number;
}

interface ConflictDetectionResponse {
  success: boolean;
  data: {
    conflicts: ConflictAlert[];
    suggestions: Array<{
      type: 'reschedule' | 'monitor_change' | 'split_booking';
      description: string;
      impact: 'low' | 'medium' | 'high';
      autoResolvable: boolean;
    }>;
  };
}
```

---

## **👥 Endpoints de Clientes**

### **F3: Gestión de Clientes**

#### **GET /api/v3/clients**
```typescript
// Lista de clientes con filtros
interface ClientListRequest {
  page?: number;
  limit?: number;
  search?: string;
  filters?: {
    active?: boolean;
    registrationDateFrom?: string;
    registrationDateTo?: string;
    level?: ClientLevel[];
    totalSpent?: { min: number; max: number };
  };
  include?: ('reservas' | 'analytics' | 'preferences')[];
}

interface ClientListResponse {
  success: boolean;
  data: {
    clients: SkiProCliente[];
    pagination: PaginationInfo;
    analytics: {
      totalClients: number;
      activeClients: number;
      averageSpent: number;
      topSpenders: SkiProCliente[];
    };
  };
}
```

#### **GET /api/v3/clients/{id}**
```typescript
// Perfil completo del cliente
interface ClientProfileResponse {
  success: boolean;
  data: {
    client: SkiProCliente;
    bookingHistory: SkiProHistorialReserva[];
    activeBookings: SkiProReservaActiva[];
    analytics: {
      totalSpent: number;
      totalBookings: number;
      completedCourses: number;
      cancelationRate: number;
      favoriteActivities: string[];
      preferredSchedule: {
        days: string[];
        times: string[];
      };
    };
    recommendations: Array<{
      type: 'course' | 'activity';
      item: any;
      reason: string;
      confidence: number;
    }>;
  };
}
```

#### **POST /api/v3/clients**
```typescript
// Crear nuevo cliente
interface CreateClientRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string;
  level?: ClientLevel;
  preferences?: {
    sports: number[];
    schedule: {
      preferredDays: string[];
      preferredTimes: string[];
    };
    notifications: {
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
    };
  };
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}
```

#### **PUT /api/v3/clients/{id}**
```typescript
// Actualizar cliente
interface UpdateClientRequest extends Partial<CreateClientRequest> {
  version: number; // Para control de concurrencia
}
```

#### **GET /api/v3/clients/search**
```typescript
// Búsqueda inteligente de clientes
interface ClientSearchRequest {
  query: string;
  filters?: {
    active?: boolean;
    hasActiveBookings?: boolean;
    level?: ClientLevel[];
  };
  limit?: number;
  includeInactive?: boolean;
}

interface ClientSearchResponse {
  success: boolean;
  data: {
    clients: Array<{
      id: number;
      displayName: string;
      email: string;
      phone: string;
      avatar?: string;
      activeBookings: number;
      totalSpent: number;
      lastBooking?: string;
      matchScore: number; // Relevancia de la búsqueda
    }>;
    suggestions: string[];
  };
}
```

---

## **🎓 Endpoints de Cursos y Actividades**

### **F3: Catálogo de Servicios**

#### **GET /api/v3/courses**
```typescript
// Lista de cursos con filtros
interface CourseListRequest {
  page?: number;
  limit?: number;
  filters?: {
    type?: 'course' | 'activity' | 'material';
    sportId?: number;
    level?: CourseLevel[];
    active?: boolean;
    priceRange?: { min: number; max: number };
    duration?: { min: number; max: number };
  };
  include?: ('schedule' | 'monitors' | 'analytics')[];
}

interface CourseListResponse {
  success: boolean;
  data: {
    courses: SkiProCurso[];
    pagination: PaginationInfo;
    filters: {
      sports: Array<{ id: number; name: string; count: number }>;
      levels: Array<{ id: string; name: string; count: number }>;
      priceRanges: Array<{ min: number; max: number; count: number }>;
    };
  };
}
```

#### **GET /api/v3/courses/{id}**
```typescript
// Detalle completo del curso
interface CourseDetailResponse {
  success: boolean;
  data: {
    course: SkiProCurso;
    schedule: Array<{
      date: string;
      timeSlots: Array<{
        start: string;
        end: string;
        monitorId: number;
        available: boolean;
        capacity: number;
        booked: number;
      }>;
    }>;
    monitors: Array<{
      id: number;
      name: string;
      avatar?: string;
      rating: number;
      specialties: string[];
    }>;
    analytics: {
      totalBookings: number;
      averageRating: number;
      occupancyRate: number;
      revenue: number;
      popularTimes: string[];
    };
    reviews: Array<{
      clientName: string;
      rating: number;
      comment: string;
      date: string;
    }>;
  };
}
```

#### **GET /api/v3/materials**
```typescript
// Catálogo de materiales
interface MaterialListResponse {
  success: boolean;
  data: {
    materials: Array<{
      id: number;
      name: string;
      description: string;
      type: string;
      dailyPrice: number;
      weeklyPrice: number;
      available: number;
      total: number;
      images: string[];
      specifications: Record<string, any>;
    }>;
    categories: Array<{
      id: string;
      name: string;
      materials: number[];
    }>;
  };
}
```

---

## **⚡ Endpoints de Skipro (Unificados)**

### **F4: Integración Completa Skipro**

#### **GET /api/v3/skipro/dashboard**
```typescript
// Dashboard principal de Skipro
interface SkiProDashboardResponse {
  success: boolean;
  data: {
    kpis: SkiProKPIs;
    recentBookings: SkiProBooking[];
    upcomingEvents: Array<{
      date: string;
      events: SkiProBooking[];
    }>;
    notifications: Array<{
      id: string;
      type: 'warning' | 'info' | 'success' | 'error';
      title: string;
      message: string;
      timestamp: string;
      read: boolean;
    }>;
    quickStats: {
      todayBookings: number;
      pendingPayments: number;
      conflictsToResolve: number;
      clientsToContact: number;
    };
  };
}
```

#### **GET /api/v3/skipro/bookings**
```typescript
// Lista especializada para interfaz Skipro
interface SkiProBookingListResponse {
  success: boolean;
  data: {
    bookings: SkiProBooking[];
    summary: {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      totalRevenue: number;
      averageValue: number;
    };
    filters: {
      availableTypes: SkiProTipoReserva[];
      dateRanges: Array<{
        label: string;
        start: string;
        end: string;
      }>;
    };
  };
}
```

#### **POST /api/v3/skipro/wizard/validate-step**
```typescript
// Validación por pasos del wizard
interface WizardStepValidationRequest {
  step: number;
  data: any;
  previousSteps: any[];
}

interface WizardStepValidationResponse {
  success: boolean;
  data: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: Array<{
      field: string;
      suggestion: any;
      reason: string;
    }>;
    nextStepData?: any; // Datos precargados para el siguiente paso
  };
}
```

---

## **📊 Endpoints de Analytics**

### **F8: Reportes y Métricas**

#### **GET /api/v3/analytics/overview**
```typescript
// Vista general de analytics
interface AnalyticsOverviewResponse {
  success: boolean;
  data: {
    period: {
      start: string;
      end: string;
      comparison?: string; // Período anterior para comparación
    };
    metrics: {
      totalBookings: { value: number; change: number };
      totalRevenue: { value: number; change: number };
      averageBookingValue: { value: number; change: number };
      clientRetention: { value: number; change: number };
      occupancyRate: { value: number; change: number };
    };
    trends: {
      bookingsByDay: Array<{ date: string; count: number; revenue: number }>;
      popularCourses: Array<{ courseId: number; name: string; bookings: number }>;
      topClients: Array<{ clientId: number; name: string; spent: number }>;
    };
    insights: Array<{
      type: 'opportunity' | 'warning' | 'trend';
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      actionable: boolean;
    }>;
  };
}
```

#### **POST /api/v3/analytics/custom-report**
```typescript
// Reportes personalizados
interface CustomReportRequest {
  name: string;
  dateRange: { start: string; end: string };
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  format: 'json' | 'csv' | 'pdf';
}
```

---

## **⚙️ Endpoints de Sistema**

### **F0: Configuración y Salud del Sistema**

#### **GET /api/v3/system/health**
```typescript
// Estado del sistema
interface SystemHealthResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'down';
    version: string;
    uptime: number;
    services: {
      database: { status: string; responseTime: number };
      cache: { status: string; hitRate: number };
      notifications: { status: string; queueSize: number };
      payments: { status: string; lastSync: string };
    };
    features: {
      intelligentBooking: boolean;
      realTimePricing: boolean;
      conflictDetection: boolean;
      aiRecommendations: boolean;
    };
  };
}
```

#### **GET /api/v3/system/config**
```typescript
// Configuración del sistema
interface SystemConfigResponse {
  success: boolean;
  data: {
    business: {
      name: string;
      timezone: string;
      currency: string;
      language: string;
      workingHours: { start: string; end: string };
      workingDays: string[];
    };
    booking: {
      advanceBookingDays: number;
      cancellationPolicyHours: number;
      overbookingAllowed: boolean;
      requirePaymentUpfront: boolean;
    };
    pricing: {
      dynamicPricingEnabled: boolean;
      discountRules: any[];
      taxRate: number;
    };
    notifications: {
      emailEnabled: boolean;
      smsEnabled: boolean;
      whatsappEnabled: boolean;
      templates: Record<string, any>;
    };
  };
}
```

---

## **🔧 Headers y Autenticación**

### **Headers Requeridos**
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-API-Version: v3
X-Client-Version: 3.0.0
X-Request-ID: {uuid}
```

### **Códigos de Response**
```typescript
// Códigos estándar
200: OK - Operación exitosa
201: Created - Recurso creado
400: Bad Request - Error en la petición
401: Unauthorized - No autenticado
403: Forbidden - Sin permisos
404: Not Found - Recurso no encontrado
409: Conflict - Conflicto de datos
422: Unprocessable Entity - Error de validación
429: Too Many Requests - Rate limit excedido
500: Internal Server Error - Error del servidor

// Códigos específicos de negocio
460: Booking Conflict - Conflicto de reserva
461: Availability Changed - Disponibilidad cambió
462: Payment Required - Pago requerido
463: Client Not Found - Cliente no encontrado
464: Course Full - Curso lleno
465: Invalid Schedule - Horario inválido
```

### **Rate Limiting**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## **📝 Notas de Implementación**

### **Fases de Desarrollo**
- **F3**: Implementar endpoints de lectura (GET)
- **F6**: Implementar endpoints de escritura (POST, PUT, DELETE)
- **F4**: Integrar datos reales en componentes
- **F7**: Conectar wizard con API real

### **Consideraciones de Performance**
- Usar paginación en todas las listas
- Implementar cache en endpoints frecuentes
- Compresión gzip en responses
- CDN para recursos estáticos

### **Monitoreo**
- Logs estructurados con request ID
- Métricas de latencia por endpoint
- Alertas por error rate
- Dashboard de salud del sistema

---

**¡API specification lista para implementación!** 🚀