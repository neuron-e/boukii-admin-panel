import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiCrudService } from 'src/service/crud.service';
import { ApiResponse } from '../interface/api-response';

/**
 * MEJORA CRÍTICA: Servicio de analytics y monitoring avanzado
 *
 * Funcionalidades:
 * - Tracking de eventos de usuario y sistema
 * - Métricas de performance en tiempo real
 * - Detección automática de problemas críticos
 * - Reportes detallados de uso y errores
 * - Dashboard de monitoreo para administradores
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  // Estado del sistema en tiempo real
  private systemHealthSubject = new BehaviorSubject<SystemHealth>({
    status: 'healthy',
    responseTime: 0,
    errorRate: 0,
    activeUsers: 0,
    memoryUsage: 0,
    lastUpdated: Date.now()
  });
  public systemHealth$ = this.systemHealthSubject.asObservable();

  // Métricas de booking en tiempo real
  private bookingMetricsSubject = new BehaviorSubject<BookingMetrics>({
    totalBookings: 0,
    successfulBookings: 0,
    failedBookings: 0,
    averageCompletionTime: 0,
    concurrentBookings: 0,
    capacityUtilization: 0,
    lastUpdated: Date.now()
  });
  public bookingMetrics$ = this.bookingMetricsSubject.asObservable();

  // Cola de eventos para batch processing
  private eventQueue: AnalyticsEvent[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 segundos

  // Cache de métricas para evitar recálculos
  private metricsCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minuto

  // Alertas activas
  private activeAlerts = new Set<string>();
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private crudService: ApiCrudService) {
    this.initializeAnalytics();
    this.startHealthMonitoring();
    this.startEventProcessing();
  }

  /**
   * MÉTODO PRINCIPAL: Track event de usuario/sistema
   */
  trackEvent(event: AnalyticsEventInput): void {
    const enrichedEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      screenResolution: `${screen.width}x${screen.height}`,
      metadata: {
        ...event.metadata,
        environment: this.getEnvironment(),
        version: this.getAppVersion()
      }
    };

    this.addEventToQueue(enrichedEvent);

    // Análisis inmediato para eventos críticos
    if (event.category === 'error' || event.category === 'performance' || event.critical) {
      this.analyzeEventImmediately(enrichedEvent);
    }
  }

  /**
   * MEJORA CRÍTICA: Track específico para reservas
   */
  trackBookingEvent(action: BookingAction, data: any): void {
    this.trackEvent({
      category: 'booking',
      action,
      label: `${action}_${data.courseType || 'unknown'}`,
      value: data.participantCount || 1,
      metadata: {
        courseId: data.courseId,
        courseName: data.courseName,
        courseType: data.courseType,
        participantCount: data.participantCount,
        selectedDate: data.selectedDate,
        sportLevel: data.sportLevel,
        completionTime: data.completionTime,
        errorDetails: data.errorDetails
      }
    });

    // Actualizar métricas de booking en tiempo real
    this.updateBookingMetrics(action, data);
  }

  /**
   * MEJORA CRÍTICA: Track performance metrics
   */
  trackPerformance(metric: PerformanceMetric): void {
    this.trackEvent({
      category: 'performance',
      action: metric.name,
      label: metric.operation,
      value: metric.duration,
      metadata: {
        ...metric,
        performanceEntry: performance.now()
      }
    });

    // Detectar problemas de performance
    if (metric.duration > metric.threshold) {
      this.createAlert({
        type: 'performance',
        severity: metric.duration > metric.threshold * 2 ? 'critical' : 'warning',
        message: `Operación lenta detectada: ${metric.operation} tardó ${metric.duration}ms`,
        metadata: metric
      });
    }
  }

  /**
   * MEJORA CRÍTICA: Obtener dashboard de métricas
   */
  getDashboardMetrics(): Observable<DashboardMetrics> {
    const cacheKey = 'dashboard_metrics';
    const cached = this.metricsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return new BehaviorSubject(cached.data).asObservable();
    }

    return this.crudService.get('/admin/analytics/dashboard').pipe(
      map((response: ApiResponse) => {
        const metrics: DashboardMetrics = {
          ...response.data,
          computedAt: Date.now()
        };

        this.metricsCache.set(cacheKey, {
          data: metrics,
          timestamp: Date.now()
        });

        return metrics;
      })
    );
  }

  /**
   * MEJORA CRÍTICA: Generar reporte detallado
   */
  generateReport(timeRange: TimeRange, filters?: ReportFilters): Observable<AnalyticsReport> {
    const requestData = {
      start_date: timeRange.startDate,
      end_date: timeRange.endDate,
      ...filters
    };

    return this.crudService.post('/admin/analytics/report', requestData).pipe(
      map((response: ApiResponse) => response.data as AnalyticsReport)
    );
  }

  /**
   * MEJORA CRÍTICA: Obtener eventos críticos recientes
   */
  getCriticalEvents(limit: number = 50): Observable<AnalyticsEvent[]> {
    return this.crudService.get('/admin/analytics/critical-events', [], { limit }).pipe(
      map((response: ApiResponse) => (response?.data || []) as AnalyticsEvent[])
    );
  }

  /**
   * Crear alerta del sistema
   */
  createAlert(alertData: AlertInput): void {
    const alertId = this.generateAlertId(alertData);

    if (this.activeAlerts.has(alertId)) {
      return; // Evitar alertas duplicadas
    }

    const alert: Alert = {
      ...alertData,
      id: alertId,
      timestamp: Date.now(),
      status: 'active'
    };

    this.activeAlerts.add(alertId);
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next([...currentAlerts, alert]);

    // Enviar alerta crítica al backend
    if (alert.severity === 'critical') {
      this.sendCriticalAlert(alert);
    }

    console.warn(`🚨 ALERTA [${alert.severity.toUpperCase()}]: ${alert.message}`, alert);
  }

  /**
   * Resolver alerta
   */
  resolveAlert(alertId: string): void {
    this.activeAlerts.delete(alertId);
    const currentAlerts = this.alertsSubject.value;
    const updatedAlerts = currentAlerts.map(alert =>
      alert.id === alertId ? { ...alert, status: 'resolved' as AlertStatus } : alert
    );
    this.alertsSubject.next(updatedAlerts);
  }

  // Métodos privados

  private initializeAnalytics(): void {
    // Track page load performance
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.trackPerformance({
        name: 'page_load',
        operation: 'initial_load',
        duration: loadTime,
        threshold: 3000
      });
    });

    // Track errors globales
    window.addEventListener('error', (event) => {
      this.trackEvent({
        category: 'error',
        action: 'javascript_error',
        label: event.error?.name || 'UnknownError',
        critical: true,
        metadata: {
          message: event.error?.message,
          stack: event.error?.stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent({
        category: 'error',
        action: 'unhandled_promise_rejection',
        label: 'PromiseRejection',
        critical: true,
        metadata: {
          reason: event.reason,
          promise: event.promise
        }
      });
    });
  }

  private startHealthMonitoring(): void {
    interval(10000).subscribe(() => { // Cada 10 segundos
      this.updateSystemHealth();
    });
  }

  private startEventProcessing(): void {
    interval(this.FLUSH_INTERVAL).subscribe(() => {
      this.flushEventQueue();
    });
  }

  private updateSystemHealth(): void {
    const startTime = performance.now();

    // Simular health check (en producción sería una llamada real al backend)
    Promise.resolve<SystemHealth>({
      status: 'healthy',
      responseTime: Math.random() * 100 + 50,
      errorRate: Math.random() * 5,
      activeUsers: Math.floor(Math.random() * 50) + 10,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      lastUpdated: Date.now()
    }).then(healthData => {
      const responseTime = performance.now() - startTime;

      const health: SystemHealth = {
        ...healthData,
        responseTime,
        lastUpdated: Date.now()
      };

      this.systemHealthSubject.next(health);

      // Detectar problemas de health
      if (health.responseTime > 1000) {
        this.createAlert({
          type: 'performance',
          severity: 'warning',
          message: `Tiempo de respuesta alto: ${Math.round(health.responseTime)}ms`
        });
      }

      if (health.errorRate > 10) {
        this.createAlert({
          type: 'error',
          severity: 'critical',
          message: `Tasa de error elevada: ${health.errorRate.toFixed(1)}%`
        });
      }
    });
  }

  private updateBookingMetrics(action: BookingAction, data: any): void {
    const currentMetrics = this.bookingMetricsSubject.value;
    const updatedMetrics = { ...currentMetrics };

    switch (action) {
      case 'booking_started':
        updatedMetrics.concurrentBookings++;
        break;
      case 'booking_completed':
        updatedMetrics.successfulBookings++;
        updatedMetrics.concurrentBookings--;
        if (data.completionTime) {
          updatedMetrics.averageCompletionTime =
            (updatedMetrics.averageCompletionTime + data.completionTime) / 2;
        }
        break;
      case 'booking_failed':
        updatedMetrics.failedBookings++;
        updatedMetrics.concurrentBookings--;
        break;
    }

    updatedMetrics.totalBookings = updatedMetrics.successfulBookings + updatedMetrics.failedBookings;
    updatedMetrics.lastUpdated = Date.now();

    this.bookingMetricsSubject.next(updatedMetrics);
  }

  private addEventToQueue(event: AnalyticsEvent): void {
    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushEventQueue();
    }
  }

  private flushEventQueue(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // DESACTIVADO: El endpoint /admin/analytics/events no existe (404)
    // TODO: Confirmar endpoint correcto para analytics events o crear en backend
    // Analytics: eventos no enviados - endpoint no disponible

    // this.crudService.post('/admin/analytics/events', { events }).subscribe({
    //   next: () => {}, // Eventos enviados correctamente
    //   error: (error) => {
    //     console.error('Error enviando eventos:', error);
    //     // Re-agregar eventos a la cola en caso de error
    //     this.eventQueue.unshift(...events);
    //   }
    // });
  }

  private analyzeEventImmediately(event: AnalyticsEvent): void {
    if (event.category === 'error') {
      this.createAlert({
        type: 'error',
        severity: event.critical ? 'critical' : 'warning',
        message: `Error detectado: ${event.action}`,
        metadata: event.metadata
      });
    }
  }

  private sendCriticalAlert(alert: Alert): void {
    this.crudService.post('/admin/alerts/critical', alert).subscribe({
      error: (error) => console.error('Error enviando alerta crítica:', error)
    });
  }

  // Métodos auxiliares

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(alert: AlertInput): string {
    return `alert_${alert.type}_${btoa(alert.message).substr(0, 10)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private getCurrentUserId(): string | null {
    try {
      const user = JSON.parse(localStorage.getItem('boukiiUser') || '{}');
      return user.id || null;
    } catch {
      return null;
    }
  }

  private getEnvironment(): string {
    return window.location.hostname.includes('localhost') ? 'development' : 'production';
  }

  private getAppVersion(): string {
    return '2.0.0'; // Aquí iría la versión real de la app
  }
}

// Interfaces y tipos

interface AnalyticsEventInput {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  critical?: boolean;
  metadata?: Record<string, any>;
}

interface AnalyticsEvent extends AnalyticsEventInput {
  id: string;
  timestamp: number;
  sessionId: string;
  userId: string | null;
  userAgent: string;
  url: string;
  screenResolution: string;
  metadata: Record<string, any>;
}

type EventCategory = 'booking' | 'navigation' | 'interaction' | 'error' | 'performance' | 'system';
type BookingAction = 'booking_started' | 'step_completed' | 'booking_completed' | 'booking_failed' | 'capacity_checked';

interface PerformanceMetric {
  name: string;
  operation: string;
  duration: number;
  threshold: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  activeUsers: number;
  memoryUsage: number;
  lastUpdated: number;
}

interface BookingMetrics {
  totalBookings: number;
  successfulBookings: number;
  failedBookings: number;
  averageCompletionTime: number;
  concurrentBookings: number;
  capacityUtilization: number;
  lastUpdated: number;
}

interface DashboardMetrics {
  systemHealth: SystemHealth;
  bookingMetrics: BookingMetrics;
  topErrors: Array<{error: string; count: number}>;
  slowestOperations: Array<{operation: string; avgTime: number}>;
  userActivity: Array<{hour: number; users: number}>;
  computedAt: number;
}

interface Alert {
  id: string;
  type: 'error' | 'performance' | 'capacity' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  status: AlertStatus;
  metadata?: Record<string, any>;
}

interface AlertInput {
  type: 'error' | 'performance' | 'capacity' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metadata?: Record<string, any>;
}

type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface TimeRange {
  startDate: string;
  endDate: string;
}

interface ReportFilters {
  userId?: string;
  category?: EventCategory;
  severity?: string;
}

interface AnalyticsReport {
  summary: {
    totalEvents: number;
    errorRate: number;
    averageResponseTime: number;
    topErrors: Array<{error: string; count: number}>;
  };
  details: AnalyticsEvent[];
  timeRange: TimeRange;
  generatedAt: number;
}
