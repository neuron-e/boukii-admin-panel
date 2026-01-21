import { Component, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { TableColumn } from '../../../../@vex/interfaces/table-column.interface';
import { defaultChartOptions } from '../../../../@vex/utils/default-chart-options';
import { DashboardService } from '../../../services/dashboard.service';
import {
  DashboardMetrics,
  RevenueMetrics,
  BookingActivity
} from '../../../interfaces/dashboard-metrics.interface';

@Component({
  selector: 'vex-dashboard-analytics',
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss']
})
export class DashboardAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Dashboard data
  dashboardMetrics: DashboardMetrics | null = null;
  seasonSummary: any = null;
  loading = true;
  user: any;
  date = moment();

  // Chart configurations
  occupancyChartOptions: any;
  trendChartOptions: any;
  revenueChartSeries: any[] = [];

  // Table configuration for recent bookings
  recentBookingsColumns: TableColumn<BookingActivity>[] = [
    {
      label: 'time',
      property: 'time',
      type: 'text'
    },
    {
      label: 'client',
      property: 'clientName',
      type: 'text'
    },
    {
      label: 'course',
      property: 'courseName',
      type: 'text'
    },
    {
      label: 'type',
      property: 'type',
      type: 'badge'
    },
    {
      label: 'status',
      property: 'status',
      type: 'badge'
    }
  ];

  constructor(
    private dashboardService: DashboardService,
    private translateService: TranslateService,
    private router: Router
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser') || '{}');
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    this.loadDashboardData();

    // Auto-refresh every 5 minutes
    setInterval(() => {
      this.loadDashboardData();
    }, 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga todos los datos del dashboard
   */
  loadDashboardData(): void {
    this.loading = true;

    forkJoin({
      metrics: this.dashboardService.getDashboardMetrics(this.date),
      seasonSummary: this.dashboardService.getSeasonSummary(this.date)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ metrics, seasonSummary }) => {
          this.dashboardMetrics = metrics;
          this.seasonSummary = seasonSummary;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard metrics:', error);
          this.loading = false;
          // Crear datos minimos para evitar cajas vacias
          this.dashboardMetrics = {
            alertas: { reservasHuerfanas: 0, cursosSinMonitor: 0, pagosPendientes: 0, conflictosHorarios: 0, capacidadCritica: 0 },
            revenue: { ingresosHoy: 0, ingresosSemana: 0, ingresosMes: 0, tendencia: 'stable', comparacionPeriodoAnterior: 0, moneda: 'EUR' },
            ocupacion: { cursosPrivados: { ocupados: 0, disponibles: 0, porcentaje: 0 }, cursosColectivos: { ocupados: 0, disponibles: 0, porcentaje: 0 }, total: { ocupados: 0, disponibles: 0, porcentaje: 0 } },
            proximasActividades: { proximasHoras: [], alertasCapacidad: [], monitorPendiente: [] },
            tendencias: { reservasUltimos30Dias: [0, 0, 0, 0, 0, 0, 0], fechas: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], comparacionPeriodoAnterior: { reservas: 0, ingresos: 0 } },
            quickStats: { reservasDia: 0, reservasCreadasDia: 0, ingresosHoy: 0, ocupacionActual: 0, alertasCriticas: 0 },
            lastUpdated: new Date().toISOString()
          };
          this.seasonSummary = null;
        }
      });
  }

  /**
   * Maneja el cambio de fecha del widget de meteo
   */
  emitDate(event: any): void {
    this.date = moment(event);
    this.loadDashboardData();
  }

  /**
   * Actualiza los datos de los graficos
   */
  private updateChartData(metrics: DashboardMetrics): void {
    // Charts removed from dashboard layout
  }

  /**
   * Inicializa las configuraciones de los graficos
   */
  private initializeChartOptions(): void {
    this.occupancyChartOptions = defaultChartOptions({
      chart: {
        type: 'donut',
        height: 200
      },
      colors: ['#4CAF50', '#FF9800'],
      legend: {
        show: true,
        position: 'bottom'
      }
    });

    this.trendChartOptions = defaultChartOptions({
      chart: {
        type: 'area',
        height: 300,
        toolbar: {
          show: false
        }
      },
      colors: ['#2196F3'],
      stroke: {
        curve: 'smooth'
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      }
    });
  }

  // Getters para facilitar el acceso a datos en el template

  get revenue(): RevenueMetrics | null {
    return this.dashboardMetrics?.revenue || null;
  }

  get upcomingActivities(): BookingActivity[] {
    return this.dashboardMetrics?.proximasActividades.proximasHoras || [];
  }

  // Métodos de navegación
  navigateToBookings(): void {
    this.router.navigate(['/bookings']);
  }

  navigateToOrphanedBookings(): void {
    this.router.navigate(['/bookings'], { queryParams: { filter: 'orphaned' } });
  }

  navigateToCourses(): void {
    this.router.navigate(['/courses-v2']);
  }

  navigateToAnalytics(): void {
    this.router.navigate(['/stats']);
  }

  navigateToClients(): void {
    this.router.navigate(['/clients']);
  }

  // Métodos de utilidad para el template
  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up': return 'mat:trending_up';
      case 'down': return 'mat:trending_down';
      default: return 'mat:trending_flat';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'pending': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  formatCurrency(amount: number): string {
    const activeSchool = Array.isArray(this.user?.schools)
      ? this.user.schools.find((school: any) => school?.active === true) || this.user.schools[0]
      : null;
    const currency = this.revenue?.moneda || this.seasonSummary?.currency || activeSchool?.currency || this.user?.schools?.[0]?.currency || 'EUR';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value}%`;
  }

  getLastUpdated(): string {
    if (!this.dashboardMetrics?.lastUpdated) return '';
    return moment(this.dashboardMetrics.lastUpdated).format('HH:mm');
  }

  formatDateLabel(date: moment.Moment): string {
    return date.format('DD/MM/YYYY');
  }

  getSeasonDateRange(): string {
    if (!this.seasonSummary?.season) {
      return '';
    }
    return `${this.seasonSummary.season.start_date} - ${this.seasonSummary.season.end_date}`;
  }

  // Quick actions
  createQuickBooking(): void {
    this.router.navigate(['/bookings/create']);
  }

  navigateToPlanner(): void {
    this.router.navigate(['/timeline'], {
      queryParams: { date: this.date.format('YYYY-MM-DD') }
    });
  }

  exportDailyReport(): void {
    // Navegar a analíticas con parámetros de exportación
    this.router.navigate(['/stats'], {
      queryParams: {
        export: 'daily',
        date: this.date.format('YYYY-MM-DD')
      }
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }
}
