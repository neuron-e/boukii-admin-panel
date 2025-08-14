import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { SeasonContextService } from '../../../core/services/season-context.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

// Vex Chart component
import { ChartComponent, ApexOptions } from '../../../../../@vex/components/chart/chart.component';

interface RevenueData {
  summary: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    pending: number;
    dailyAverage: number;
    completedRevenue: number;
    pendingRevenue: number;
    refundedRevenue: number;
  };
  timeline: Array<{
    date: string;
    total: number;
    completed: number;
    pending: number;
    refunded: number;
  }>;
  breakdown: {
    courseTypes: Array<{
      courseType: string;
      revenue: number;
      percentage: number;
      count: number;
    }>;
    paymentMethods: Array<{
      method: string;
      revenue: number;
      percentage: number;
      count: number;
    }>;
  };
  comparison: {
    previousMonth: number;
    growth: number;
    weeklyAverage: number;
    dailyGoal: number;
    progressToGoal: number;
  };
}

@Component({
  selector: 'app-revenue-widget',
  templateUrl: './revenue-widget.component.html',
  styleUrls: ['./revenue-widget.component.scss']
})
export class RevenueWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('chart') chart: ChartComponent;
  
  private destroy$ = new Subject<void>();
  private refreshInterval?: any;

  // Data
  revenueData$ = new BehaviorSubject<RevenueData | null>(null);
  currentPeriod = 'month'; // today, week, month, season
  
  // Chart configuration
  chartOptions: ApexOptions;
  
  // Loading states
  loading = true;
  error: string | null = null;
  lastUpdated: Date | null = null;

  // UI states
  showComparison = true;
  animateChanges = true;
  selectedView = 'trend'; // trend, breakdown, comparison

  constructor(
    private seasonContext: SeasonContextService,
    private dashboardService: DashboardService,
    private notifications: NotificationService,
    private translate: TranslateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    this.initializeWidget();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAutoRefresh();
  }

  // ==================== INITIALIZATION ====================

  private initializeWidget(): void {
    console.log('💰 RevenueWidget: Initializing...');

    // Subscribe to season context changes
    this.seasonContext.currentSeason$
      .pipe(takeUntil(this.destroy$))
      .subscribe(season => {
        if (season) {
          console.log('💰 RevenueWidget: Loading data for season:', season.name);
          this.loadRevenueData();
        } else {
          this.handleNoSeason();
        }
      });
  }

  private setupAutoRefresh(): void {
    // Refresh every 10 minutes
    this.refreshInterval = setInterval(() => {
      if (!this.loading) {
        this.loadRevenueData(false); // Silent refresh
      }
    }, 10 * 60 * 1000);
  }

  private clearAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private initializeChartOptions(): void {
    this.chartOptions = {
      series: [{
        name: 'Ingresos Completados',
        data: [],
        color: '#10B981'
      }, {
        name: 'Ingresos Pendientes',
        data: [],
        color: '#F59E0B'
      }],
      chart: {
        type: 'area',
        height: 300,
        toolbar: {
          show: false
        },
        animations: {
          enabled: true,
          speed: 800
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      xaxis: {
        type: 'datetime',
        categories: []
      },
      yaxis: {
        labels: {
          formatter: (value) => {
            return this.formatCurrency(value);
          }
        }
      },
      tooltip: {
        x: {
          format: 'dd/MM/yyyy'
        },
        y: {
          formatter: (value) => {
            return this.formatCurrency(value);
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
        }
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4
      },
      markers: {
        size: 4,
        colors: ['#10B981', '#F59E0B'],
        strokeColors: '#fff',
        strokeWidth: 2,
        hover: {
          size: 6
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: {
            height: 250
          }
        }
      }]
    };
  }

  // ==================== DATA LOADING ====================

  async loadRevenueData(showLoading = true): Promise<void> {
    if (showLoading) {
      this.loading = true;
      this.error = null;
    }

    try {
      const currentSeason = this.seasonContext.getCurrentSeason();
      if (!currentSeason) {
        throw new Error('No hay temporada seleccionada');
      }

      // Call the dashboard service to get revenue data
      const params = {
        period: this.currentPeriod,
        season_id: currentSeason.id,
        school_id: currentSeason.school_id
      };

      console.log('💰 RevenueWidget: Fetching revenue data with params:', params);

      // Use the dashboard service revenue endpoint
      const response = await this.dashboardService.getRevenueData(params);
      
      if (response?.success && response?.data) {
        const revenueData: RevenueData = {
          summary: {
            total: response.data.summary?.total || 0,
            thisMonth: response.data.summary?.thisMonth || 0,
            lastMonth: response.data.summary?.lastMonth || 0,
            growth: response.data.summary?.growth || 0,
            pending: response.data.summary?.pending || 0,
            dailyAverage: response.data.summary?.dailyAverage || 0,
            completedRevenue: response.data.summary?.completedRevenue || 0,
            pendingRevenue: response.data.summary?.pendingRevenue || 0,
            refundedRevenue: response.data.summary?.refundedRevenue || 0
          },
          timeline: response.data.timeline || [],
          breakdown: {
            courseTypes: response.data.breakdown?.courseTypes || [],
            paymentMethods: response.data.breakdown?.paymentMethods || []
          },
          comparison: {
            previousMonth: response.data.comparison?.previousMonth || 0,
            growth: response.data.comparison?.growth || 0,
            weeklyAverage: response.data.comparison?.weeklyAverage || 0,
            dailyGoal: response.data.comparison?.dailyGoal || 1500,
            progressToGoal: response.data.comparison?.progressToGoal || 0
          }
        };

        this.revenueData$.next(revenueData);
        this.updateChart(revenueData);
        this.lastUpdated = new Date();
        
        console.log('✅ RevenueWidget: Data loaded successfully:', {
          total: revenueData.summary.total,
          thisMonth: revenueData.summary.thisMonth,
          growth: revenueData.summary.growth
        });

      } else {
        throw new Error(response?.message || 'Error al cargar datos de ingresos');
      }

    } catch (error: any) {
      console.error('❌ RevenueWidget: Error loading revenue data:', error);
      
      this.error = error.message || 'Error al cargar los ingresos';
      
      if (showLoading) {
        this.notifications.showError(
          this.translate.instant('DASHBOARD.ERRORS.REVENUE_LOAD_FAILED')
        );
      }

      // Provide fallback data for development
      this.provideFallbackData();

    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private handleNoSeason(): void {
    console.warn('⚠️ RevenueWidget: No season available');
    this.loading = false;
    this.error = 'Selecciona una temporada para ver los ingresos';
    this.revenueData$.next(null);
  }

  private provideFallbackData(): void {
    console.log('🔄 RevenueWidget: Providing fallback data');
    
    const fallbackData: RevenueData = {
      summary: {
        total: 125750,
        thisMonth: 32500,
        lastMonth: 28900,
        growth: 12.4,
        pending: 4850,
        dailyAverage: 1083,
        completedRevenue: 118900,
        pendingRevenue: 4850,
        refundedRevenue: 2000
      },
      timeline: [
        { date: '2024-12-01', total: 4200, completed: 3800, pending: 400, refunded: 0 },
        { date: '2024-12-02', total: 3850, completed: 3450, pending: 400, refunded: 0 },
        { date: '2024-12-03', total: 5100, completed: 4850, pending: 250, refunded: 0 },
        { date: '2024-12-04', total: 2900, completed: 2650, pending: 250, refunded: 0 },
        { date: '2024-12-05', total: 6200, completed: 5950, pending: 250, refunded: 0 },
        { date: '2024-12-06', total: 4650, completed: 4200, pending: 450, refunded: 0 },
        { date: '2024-12-07', total: 3900, completed: 3400, pending: 500, refunded: 0 }
      ],
      breakdown: {
        courseTypes: [
          { courseType: 'Esquí Avanzado', revenue: 45200, percentage: 35.9, count: 128 },
          { courseType: 'Snowboard Intermedio', revenue: 32800, percentage: 26.1, count: 94 },
          { courseType: 'Esquí Principiante', revenue: 28400, percentage: 22.6, count: 102 },
          { courseType: 'Clases Privadas', revenue: 19350, percentage: 15.4, count: 28 }
        ],
        paymentMethods: [
          { method: 'Tarjeta', revenue: 89250, percentage: 71.0, count: 245 },
          { method: 'Transferencia', revenue: 28100, percentage: 22.3, count: 67 },
          { method: 'Efectivo', revenue: 8400, percentage: 6.7, count: 40 }
        ]
      },
      comparison: {
        previousMonth: 28900,
        growth: 12.4,
        weeklyAverage: 8125,
        dailyGoal: 1500,
        progressToGoal: 72.2
      }
    };

    this.revenueData$.next(fallbackData);
    this.updateChart(fallbackData);
  }

  // ==================== CHART UPDATE ====================

  private updateChart(data: RevenueData): void {
    if (!data.timeline || data.timeline.length === 0) return;

    const categories = data.timeline.map(item => item.date);
    const completedData = data.timeline.map(item => item.completed);
    const pendingData = data.timeline.map(item => item.pending);

    this.chartOptions = {
      ...this.chartOptions,
      series: [{
        name: 'Ingresos Completados',
        data: completedData,
        color: '#10B981'
      }, {
        name: 'Ingresos Pendientes',
        data: pendingData,
        color: '#F59E0B'
      }],
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: categories
      }
    };

    // Trigger chart update
    setTimeout(() => {
      if (this.chart) {
        this.chart.render();
      }
    }, 100);
  }

  // ==================== UI INTERACTIONS ====================

  onPeriodChange(period: string): void {
    if (this.currentPeriod !== period) {
      this.currentPeriod = period;
      console.log('💰 RevenueWidget: Period changed to:', period);
      this.loadRevenueData();
    }
  }

  onViewChange(view: string): void {
    if (this.selectedView !== view) {
      this.selectedView = view;
      console.log('💰 RevenueWidget: View changed to:', view);
      // Update chart based on selected view
      if (view === 'breakdown') {
        this.updateBreakdownChart();
      } else if (view === 'trend') {
        this.updateChart(this.currentData);
      }
    }
  }

  private updateBreakdownChart(): void {
    const data = this.currentData;
    if (!data || !data.breakdown.courseTypes.length) return;

    // Update chart for breakdown view (pie or bar chart)
    const courseData = data.breakdown.courseTypes.map(item => item.revenue);
    const courseLabels = data.breakdown.courseTypes.map(item => item.courseType);

    this.chartOptions = {
      ...this.chartOptions,
      chart: {
        ...this.chartOptions.chart,
        type: 'bar'
      },
      series: [{
        name: 'Ingresos por Tipo',
        data: courseData,
        color: '#3B82F6'
      }],
      xaxis: {
        categories: courseLabels,
        type: 'category'
      }
    };
  }

  async onRefresh(): Promise<void> {
    console.log('🔄 RevenueWidget: Manual refresh triggered');
    await this.loadRevenueData();
    
    this.notifications.showSuccess(
      this.translate.instant('DASHBOARD.MESSAGES.REVENUE_REFRESHED')
    );
  }

  onViewRevenue(): void {
    console.log('💰 RevenueWidget: Navigating to revenue page');
    this.router.navigate(['/v5/analytics/revenue']);
  }

  onViewBookings(): void {
    console.log('💰 RevenueWidget: Navigating to bookings');
    this.router.navigate(['/v5/bookings']);
  }

  // ==================== TEMPLATE HELPERS ====================

  get currentData(): RevenueData | null {
    return this.revenueData$.value;
  }

  get hasData(): boolean {
    const data = this.currentData;
    return !!data && data.summary.total > 0;
  }

  get growthDirection(): 'up' | 'down' | 'neutral' {
    const growth = this.currentData?.summary.growth || 0;
    if (growth > 0) return 'up';
    if (growth < 0) return 'down';
    return 'neutral';
  }

  get progressToGoal(): number {
    const data = this.currentData;
    if (!data) return 0;
    
    const dailyRevenue = data.summary.dailyAverage;
    const dailyGoal = data.comparison.dailyGoal;
    
    return dailyGoal > 0 ? Math.min((dailyRevenue / dailyGoal) * 100, 100) : 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercentage(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins}min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  }

  getPeriodLabel(period: string): string {
    const labels: { [key: string]: string } = {
      'today': 'Hoy',
      'week': 'Semana',
      'month': 'Mes',
      'season': 'Temporada'
    };
    return labels[period] || period;
  }

  getViewLabel(view: string): string {
    const labels: { [key: string]: string } = {
      'trend': 'Tendencia',
      'breakdown': 'Desglose',
      'comparison': 'Comparación'
    };
    return labels[view] || view;
  }

  trackByCourseType(index: number, item: any): string {
    return item.courseType;
  }

  trackByPaymentMethod(index: number, item: any): string {
    return item.method;
  }
}