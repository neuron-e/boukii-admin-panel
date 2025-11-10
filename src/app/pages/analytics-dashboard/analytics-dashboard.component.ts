import { Component, OnInit, OnDestroy } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { ApiCrudService } from 'src/service/crud.service';
import { VisualFeedbackService } from 'src/app/services/visual-feedback.service';
import { Observable, interval, Subscription } from 'rxjs';
import { switchMap, takeUntil, startWith } from 'rxjs/operators';
import { Subject } from 'rxjs';

/**
 * MEJORA CRÍTICA: Dashboard de Analytics y Monitoring para Administradores
 *
 * Componente principal para monitorear:
 * - Métricas del sistema en tiempo real
 * - Estado de salud de la aplicación
 * - Eventos críticos y alertas
 * - Performance y estadísticas de reservas
 * - Tendencias de uso y errores
 */
@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss']
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private refreshInterval$ = interval(30000); // Actualizar cada 30 segundos
  private subscriptions: Subscription[] = [];

  // Estado de carga
  isLoading = true;
  lastUpdated: Date = new Date();

  // Datos del dashboard
  dashboardMetrics: any = null;
  systemHealth: any = null;
  criticalEvents: any[] = [];
  recentAlerts: any[] = [];

  // Configuración del dashboard
  showRealTimeUpdates = true;
  autoRefresh = true;
  refreshIntervalSeconds = 30;

  // Métricas destacadas para cards principales
  highlightedMetrics = {
    totalBookingsToday: 0,
    systemStatus: 'healthy',
    averageResponseTime: 0,
    errorRatePercentage: 0,
    activeUsers: 0,
    criticalAlerts: 0
  };

  constructor(
    private analytics: AnalyticsService,
    private crudService: ApiCrudService,
    private feedback: VisualFeedbackService
  ) {}

  ngOnInit(): void {
    this.analytics.trackEvent({
      category: 'navigation',
      action: 'dashboard_accessed',
      label: 'analytics_dashboard',
      metadata: {
        user_role: 'admin',
        timestamp: Date.now()
      }
    });

    this.initializeDashboard();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Inicializar datos del dashboard
   */
  private initializeDashboard(): void {
    this.feedback.setLoading('dashboard_init', true, 'Cargando métricas del sistema...');

    this.loadDashboardData().subscribe({
      next: (success) => {
        if (success) {
          this.isLoading = false;
          this.feedback.setLoading('dashboard_init', false);
          this.feedback.success('Dashboard cargado correctamente');
        }
      },
      error: (error) => {
        console.error('Error initializing dashboard:', error);
        this.isLoading = false;
        this.feedback.setLoading('dashboard_init', false);
        this.feedback.error('Error cargando el dashboard', {
          action: 'Reintentar',
          onAction: () => this.initializeDashboard()
        });

        this.analytics.trackEvent({
          category: 'error',
          action: 'dashboard_load_failed',
          label: 'initialization_error',
          critical: true,
          metadata: {
            error_message: error.message,
            error_stack: error.stack
          }
        });
      }
    });
  }

  /**
   * Configurar actualizaciones en tiempo real
   */
  private setupRealTimeUpdates(): void {
    if (this.autoRefresh) {
      const refreshSub = this.refreshInterval$
        .pipe(
          startWith(0), // Cargar inmediatamente
          switchMap(() => this.loadDashboardData()),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: () => {
            this.lastUpdated = new Date();
          },
          error: (error) => {
            console.error('Error en actualización automática:', error);
            this.analytics.trackEvent({
              category: 'error',
              action: 'auto_refresh_failed',
              label: 'dashboard_update_error',
              metadata: { error_message: error.message }
            });
          }
        });

      this.subscriptions.push(refreshSub);
    }

    // Suscribirse a alertas en tiempo real
    const alertsSub = this.analytics.alerts$.subscribe(alerts => {
      this.recentAlerts = alerts.slice(0, 10); // Mostrar últimas 10 alertas
      this.highlightedMetrics.criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    });

    this.subscriptions.push(alertsSub);
  }

  /**
   * Cargar todos los datos del dashboard
   */
  private loadDashboardData(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      Promise.all([
        this.loadDashboardMetrics(),
        this.loadSystemHealth(),
        this.loadCriticalEvents()
      ]).then(() => {
        this.updateHighlightedMetrics();
        observer.next(true);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Cargar métricas principales del dashboard
   */
  private async loadDashboardMetrics(): Promise<void> {
    try {
      const response = await this.crudService.get('/admin/analytics-monitoring/dashboard').toPromise();

      if (response?.success) {
        this.dashboardMetrics = response.data;

        this.analytics.trackEvent({
          category: 'system',
          action: 'dashboard_metrics_loaded',
          label: 'successful_load',
          value: Object.keys(response.data).length,
          metadata: {
            metrics_count: Object.keys(response.data).length,
            computed_at: response.data.computed_at
          }
        });
      }
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Cargar métricas de salud del sistema
   */
  private async loadSystemHealth(): Promise<void> {
    try {
      const response = await this.crudService.get('/admin/analytics-monitoring/system-health').toPromise();

      if (response?.success) {
        this.systemHealth = response.data;

        // Track problemas de salud del sistema
        if (response.data.status !== 'healthy') {
          this.analytics.trackEvent({
            category: 'system',
            action: 'system_health_degraded',
            label: response.data.status,
            critical: response.data.status === 'unhealthy',
            metadata: {
              status: response.data.status,
              response_time: response.data.response_time,
              error_rate: response.data.error_rate,
              active_users: response.data.active_users
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading system health:', error);
      throw error;
    }
  }

  /**
   * Cargar eventos críticos recientes
   */
  private async loadCriticalEvents(): Promise<void> {
    try {
      const response = await this.crudService.get('/admin/analytics-monitoring/critical-events', [], {
        limit: 20
      }).toPromise();

      if (response?.success) {
        this.criticalEvents = response.data || [];
      }
    } catch (error) {
      console.error('Error loading critical events:', error);
      // No lanzar error para eventos críticos ya que no es crítico para el dashboard
    }
  }

  /**
   * Actualizar métricas destacadas
   */
  private updateHighlightedMetrics(): void {
    if (this.dashboardMetrics) {
      this.highlightedMetrics = {
        totalBookingsToday: this.dashboardMetrics.booking_metrics?.total_bookings_today || 0,
        systemStatus: this.systemHealth?.status || 'unknown',
        averageResponseTime: Math.round(this.systemHealth?.response_time || 0),
        errorRatePercentage: Math.round((this.systemHealth?.error_rate || 0) * 10) / 10,
        activeUsers: this.systemHealth?.active_users || 0,
        criticalAlerts: this.recentAlerts.filter(alert => alert.severity === 'critical').length
      };
    }
  }

  /**
   * Refrescar manualmente el dashboard
   */
  refreshDashboard(): void {
    this.analytics.trackEvent({
      category: 'interaction',
      action: 'dashboard_manual_refresh',
      label: 'admin_action'
    });

    this.feedback.setLoading('manual_refresh', true, 'Actualizando dashboard...');

    this.loadDashboardData().subscribe({
      next: () => {
        this.feedback.setLoading('manual_refresh', false);
        this.feedback.success('Dashboard actualizado correctamente');
        this.lastUpdated = new Date();
      },
      error: () => {
        this.feedback.setLoading('manual_refresh', false);
        this.feedback.error('Error actualizando el dashboard');
      }
    });
  }

  /**
   * Alternar actualizaciones automáticas
   */
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;

    this.analytics.trackEvent({
      category: 'interaction',
      action: 'auto_refresh_toggled',
      label: this.autoRefresh ? 'enabled' : 'disabled'
    });

    if (this.autoRefresh) {
      this.setupRealTimeUpdates();
      this.feedback.info('Actualizaciones automáticas activadas');
    } else {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions = [];
      this.feedback.info('Actualizaciones automáticas desactivadas');
    }
  }

  /**
   * Resolver una alerta
   */
  resolveAlert(alertId: string): void {
    this.analytics.resolveAlert(alertId);

    this.analytics.trackEvent({
      category: 'interaction',
      action: 'alert_resolved',
      label: 'admin_action',
      metadata: { alert_id: alertId }
    });

    this.feedback.success('Alerta resuelta correctamente');
  }

  /**
   * Ver detalles de un evento crítico
   */
  viewEventDetails(event: any): void {
    this.analytics.trackEvent({
      category: 'interaction',
      action: 'critical_event_viewed',
      label: event.action,
      metadata: { event_id: event.id }
    });
  }

  /**
   * Exportar reporte del dashboard
   */
  exportDashboardReport(): void {
    this.analytics.trackEvent({
      category: 'interaction',
      action: 'dashboard_export_requested',
      label: 'admin_action'
    });

    this.feedback.setLoading('export', true, 'Generando reporte...');

    const reportData = {
      start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ayer
      end_date: new Date().toISOString().split('T')[0], // Hoy
      category: null,
      severity: null
    };

    this.crudService.post('/admin/analytics-monitoring/report', reportData).subscribe({
      next: (response) => {
        this.feedback.setLoading('export', false);
        if (response?.success) {
          this.feedback.success('Reporte generado correctamente');
          // Aquí se podría descargar el reporte o mostrar un enlace
        }
      },
      error: () => {
        this.feedback.setLoading('export', false);
        this.feedback.error('Error generando el reporte');
      }
    });
  }

  /**
   * Obtener clase CSS para el estado del sistema
   */
  getSystemStatusClass(status: string): string {
    switch (status) {
      case 'healthy': return 'status-healthy';
      case 'degraded': return 'status-warning';
      case 'unhealthy': return 'status-error';
      default: return 'status-unknown';
    }
  }

  /**
   * Obtener icono para el estado del sistema
   */
  getSystemStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return 'check_circle';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'help';
    }
  }

  /**
   * Formatear tiempo de respuesta
   */
  formatResponseTime(time: number): string {
    if (time < 1000) {
      return `${Math.round(time)}ms`;
    } else {
      return `${(time / 1000).toFixed(1)}s`;
    }
  }

  /**
   * Obtener color para la métrica según su valor
   */
  getMetricColor(metric: string, value: number): string {
    switch (metric) {
      case 'responseTime':
        if (value < 500) return 'text-success';
        if (value < 1000) return 'text-warning';
        return 'text-danger';
      case 'errorRate':
        if (value < 1) return 'text-success';
        if (value < 5) return 'text-warning';
        return 'text-danger';
      default:
        return 'text-primary';
    }
  }
}