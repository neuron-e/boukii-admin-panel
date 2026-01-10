import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {debounceTime, distinctUntilChanged, Subject, takeUntil} from 'rxjs';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {MatTableDataSource} from '@angular/material/table';
import {animate, state, style, transition, trigger} from '@angular/animations';
import moment from 'moment';
import Plotly from 'plotly.js-dist-min';

import {ApiCrudService} from '../../../service/crud.service';
import {BookingListModalComponent} from './booking-list-modal/booking-list-modal.component';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {CourseStatisticsModalComponent} from './course-statistics-modal/course-statistics-modal.component';
import {MonitorsLegacyComponent} from './monitors-legacy/monitors-legacy.component';

// ==================== INTERFACES ====================

interface SeasonDashboardData {
  season_info: {
    season_name: string;
    date_range: {
      start: string;
      end: string;
      total_days: number;
    };
    total_bookings: number;
    booking_classification: {
      total_bookings: number;
      production_count: number;
      test_count: number;
      cancelled_count: number;
      production_revenue: number;
      test_revenue: number;
      cancelled_revenue: number;
    };
  };
  executive_kpis: {
    total_production_bookings: number;
    total_clients: number;
    total_participants: number;
    revenue_expected: number;
    revenue_received: number;
    revenue_pending: number;
    collection_efficiency: number;
    consistency_rate: number;
    average_booking_value: number;
    unpaid_with_debt_amount?: number;
    unpaid_with_debt_count?: number;
    overpayment_amount?: number;
    overpayment_count?: number;
    fully_paid_count?: number;
    revenue_real?: number;
  };
  cache_metadata?: {
    is_cached: boolean;
    cache_status: 'hit' | 'miss' | 'refresh' | 'refresh_blocked';
    generated_at: string | null;
    cache_ttl_seconds: number;
  };
  booking_sources: {
    total_bookings: number;
    source_breakdown: Array<{
      source: string;
      bookings: number;
      percentage: number;
      unique_clients: number;
      revenue: number;
      avg_booking_value: number;
      consistency_rate: number;
    }>;
  };
  payment_methods: {
    total_payments: number;
    total_revenue: number;
    methods: Array<{
      method: string;
      display_name: string;
      count: number;
      percentage: number;
      revenue: number;
      revenue_percentage: number;
      avg_payment_amount: number;
    }>;
    online_vs_offline: {
      online: {
        revenue: number;
        count: number;
        revenue_percentage: number;
        count_percentage: number;
      };
      offline: {
        revenue: number;
        count: number;
        revenue_percentage: number;
        count_percentage: number;
      };
    };
  };
  booking_status_analysis: {
    [key: string]: {
      count: number;
      percentage: number;
      expected_revenue: number;
      received_revenue: number;
      pending_revenue: number;
      collection_efficiency: number;
      issues: number;
    };
  };
  financial_summary: {
    revenue_breakdown: {
      total_expected: number;
      total_received: number;
      total_pending: number;
      total_refunded: number;
    };
    consistency_metrics: {
      consistent_bookings: number;
      inconsistent_bookings: number;
      consistency_rate: number;
      major_discrepancies: number;
    };
    voucher_usage: {
      total_vouchers_used: number;
      total_voucher_amount: number;
      unique_vouchers: number;
    };
  };
  courses: Array<{
    id: number;
    name: string;
    type: number;
    sport: string;
    revenue: number;
    participants: number;
    unique_participants?: number;
    bookings: number;
    average_price: number;
    revenue_received: number;
    sales_conversion_rate: number;
    courses_sold: number;
    payment_methods: any;
    status_breakdown: any;
    source_breakdown: any;
  }>;
  critical_issues: {
    [key: string]: {
      count: number;
      items: Array<any>;
    };
  };
  executive_alerts: Array<{
    level: string;
    type: string;
    title: string;
    description: string;
    impact: string;
    action_required: boolean;
  }>;
  priority_recommendations: Array<{
    priority: string;
    category: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    timeline: string;
    actions: string[];
    expected_benefit: string;
  }>;
  trend_analysis: {
    monthly_breakdown: Array<{
      month: string;
      bookings: number;
      revenue: number;
      unique_clients: number;
      consistency_rate: number;
      avg_booking_value: number;
    }>;
    booking_velocity: {
      recent_production_bookings: number;
      bookings_per_week: number;
      trend_direction: string;
      quality_trend: string;
    };
  };
  performance_metrics: {
    execution_time_ms: number;
    total_bookings_analyzed: number;
    production_bookings_count: number;
    test_bookings_excluded: number;
    cancelled_bookings_count: number;
  };
}

interface AnalyticsFilters {
  startDate: string | null;
  endDate: string | null;
  presetRange: string | null;
  courseType: number[] | null;
  source: string[] | null;
  paymentMethod: string[] | null;
  sportId: number[] | null;
  onlyWeekends: boolean;
  onlyPaidBookings: boolean;
  includeRefunds: boolean;
  includeTestDetection: boolean;
  includePayrexxAnalysis: boolean;
  optimizationLevel: string;
}

// ==================== COMPONENT ====================

@Component({
  selector: 'vex-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
  animations: [
    trigger('slideDown', [
      state('in', style({height: '*'})),
      transition(':enter', [
        style({height: 0, opacity: 0}),
        animate('300ms ease-in-out', style({height: '*', opacity: 1}))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({height: 0, opacity: 0}))
      ])
    ])
  ]
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {

  // ==================== VIEW CHILDREN ====================
  @ViewChild('revenueChart', { static: false }) revenueChartRef!: ElementRef;
  @ViewChild('courseTypeRevenueChart', { static: false }) courseTypeRevenueChartRef!: ElementRef;
  @ViewChild('paymentMethodsChart', { static: false }) paymentMethodsChartRef!: ElementRef;
  @ViewChild('paymentTrendsChart', { static: false }) paymentTrendsChartRef!: ElementRef;
  @ViewChild('topCoursesChart', { static: false }) topCoursesChartRef!: ElementRef;
  @ViewChild('completionRatesChart', { static: false }) completionRatesChartRef!: ElementRef;
  @ViewChild('sourcesChart', { static: false }) sourcesChartRef!: ElementRef;
  @ViewChild(MonitorsLegacyComponent, { static: false }) monitorsLegacyComponent!: MonitorsLegacyComponent;

  // ==================== FORM CONTROLS ====================
  filterForm: FormGroup;

  // ==================== DATA PROPERTIES ====================
  dashboardData: SeasonDashboardData | null = null;
  cacheMetadata: SeasonDashboardData['cache_metadata'] | null = null;
  cacheNoticeKey: string | null = null;
  exportFormat: 'csv' | 'excel' = 'csv';
  revenueTableData = new MatTableDataSource<any>([]);
  coursesTableData = new MatTableDataSource<any>([]);
  public courseTypeBookingsSummary: any[] = [];
  // ==================== UI STATE ====================
  loading = false;
  activeTab = 'revenue'; // ← AÑADIR ESTA LÍNEA
  activeTabIndex = 0;
  showAdvancedFilters = false;
  fullDashboardLoaded = false;
  fullDashboardLoading = false;
  tabLoading: { [key: string]: boolean } = {
    revenue: false,
    payments: false,
    courses: false,
    sources: false,
    monitors: false
  };

  // ==================== USER DATA ====================
  user: any;
  currency = 'CHF';
  allSports: any[] = [];

  // ==================== TABLE COLUMNS ====================
  revenueDisplayedColumns: string[] = ['month', 'revenue', 'bookings', 'averageValue', 'clients', 'consistencyRate'];
  coursesDisplayedColumns: string[] = ['courseName', 'courseType', 'totalRevenue', 'totalBookings', 'averagePrice', 'participants', 'actions'];

  // ==================== CHART COLORS ====================
  chartColors = {
    primary: '#3A57A7',
    secondary: '#FCB859',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#2196F3',
    gradient: ['#3A57A7', '#FCB859', '#4CAF50', '#FF9800', '#F44336', '#2196F3']
  };

  // ==================== COURSE TYPE COLORS CONFIGURATION ====================

  private readonly courseTypeColors = {
    1: '#FAC710', // Colectivo - Amarillo/Dorado
    2: '#8FD14F', // Privado - Verde
    3: '#00beff', // Actividad - Azul
    collective: '#FAC710',
    private: '#8FD14F',
    activity: '#00beff'
  };

  // ==================== DESTROY SUBJECT ====================
  private destroy$ = new Subject<void>();

  // ==================== TABS CONFIGURATION (ACTUALIZADO) ====================
  tabs = [
    { id: 'revenue', label: 'revenue_analysis', icon: 'monetization_on' },
    { id: 'payments', label: 'payment_methods', icon: 'payment' },
    { id: 'courses', label: 'courses_analysis', icon: 'school' },
    { id: 'sources', label: 'booking_sources', icon: 'source' },
    { id: 'monitors', label: 'monitors_tab', icon: 'person' } // ← NUEVA
  ];

  // ==================== MODAL PROPERTIES ====================
  showPendingModal = false;
  showCancelledModal = false;
  pendingBookings: any[] = [];
  cancelledBookings: any[] = [];
  loadingPendingBookings = false;
  loadingCancelledBookings = false;

  // ==================== CONSTRUCTOR ====================
  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private translateService: TranslateService,
    private apiService: ApiCrudService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
    this.loadUserData();
    this.loadMasterData();

    this.activeTab = this.tabs[0].id; // Inicializar con primera pestaña
  }

  // ==================== LIFECYCLE METHODS ====================

  ngOnInit(): void {
    this.setupFilterSubscriptions();
    this.loadAnalyticsData();
  }

  ngAfterViewInit(): void {
    // Los gráficos se crearán cuando los datos estén disponibles
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== INITIALIZATION ====================

  private initializeForm(): void {
    const today = moment();
    const currentMonth = today.month(); // 0 = enero, 10 = noviembre

    let startDate: string;
    let endDate: string;

    // Temporada va de Noviembre a Mayo del siguiente año
    if (currentMonth >= 10) {
      // Noviembre o Diciembre → temporada ACTUAL: Nov (este año) - Mayo (año siguiente)
      startDate = moment().month(10).startOf('month').format('YYYY-MM-DD');
      endDate = moment().add(1, 'year').month(4).endOf('month').format('YYYY-MM-DD');
    } else if (currentMonth <= 4) {
      // Enero a Mayo → temporada ACTUAL: Nov (año anterior) - Mayo (este año)
      startDate = moment().subtract(1, 'year').month(10).startOf('month').format('YYYY-MM-DD');
      endDate = moment().month(4).endOf('month').format('YYYY-MM-DD');
    } else {
      // Junio a Octubre → fuera de temporada, mostrar temporada MÁS RECIENTE: Nov (año anterior) - Mayo (este año)
      startDate = moment().subtract(1, 'year').month(10).startOf('month').format('YYYY-MM-DD');
      endDate = moment().month(4).endOf('month').format('YYYY-MM-DD');
    }

    this.filterForm = this.fb.group({
      startDate: new FormControl(startDate),
      endDate: new FormControl(endDate),
      presetRange: new FormControl(''),
      dateFilter: new FormControl('created_at'),
      courseType: new FormControl([]),
      source: new FormControl([]),
      paymentMethod: new FormControl([]),
      sportId: new FormControl([]),
      onlyWeekends: new FormControl(false),
      onlyPaidBookings: new FormControl(false),
      includeRefunds: new FormControl(true),
      includeTestDetection: new FormControl(false),
      includePayrexxAnalysis: new FormControl(false),
      optimizationLevel: new FormControl('fast')
    });
  }

  private loadUserData(): void {
    const userStr = localStorage.getItem('boukiiUser');
    if (userStr) {
      this.user = JSON.parse(userStr);
      this.currency = this.user?.school?.currency || 'CHF';
    }
  }

  private loadMasterData(): void {
    // Cargar deportes
    this.apiService.get('/sports').subscribe({
      next: (response) => {
        this.allSports = response.data || [];
      },
      error: (error) => console.error('Error loading sports:', error)
    });
  }

  private setupFilterSubscriptions(): void {
    // Escuchar cambios en los filtros con debounce
    this.filterForm.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.loading) {
        this.loadAnalyticsData();
      }
    });
  }

  // ==================== COLOR HELPER METHODS ====================

  /**
   * 🎨 Obtener color por tipo de curso (número)
   */
  public getCourseTypeColor(courseType: number): string {
    return this.courseTypeColors[courseType] || this.chartColors.primary;
  }

  /**
   * 🎨 Obtener color por nombre de tipo de curso
   */
  private getCourseTypeColorByName(typeName: string): string {
    const typeMap: { [key: string]: number } = {
      'collective': 1,
      'course_colective': 1,
      'colectivo': 1,
      'private': 2,
      'course_private': 2,
      'privado': 2,
      'activity': 3,
      'actividad': 3
    };

    const courseType = typeMap[typeName.toLowerCase()];
    return courseType ? this.courseTypeColors[courseType] : this.chartColors.primary;
  }

  /**
   * 🎨 Obtener array de colores para gráficos de tipos de curso
   */
  private getCourseTypeColorsArray(): string[] {
    return [
      this.courseTypeColors[1], // Colectivo
      this.courseTypeColors[2], // Privado
      this.courseTypeColors[3]  // Actividad
    ];
  }

  // ==================== DATA LOADING ====================

  public loadAnalyticsData(forceRefresh: boolean = false): void {
    this.loading = true;
    const filters = this.buildFiltersObject();
    if (!filters.school_id) {
      this.loading = false;
      this.showMessage(this.translateService.instant('analytics_school_missing'), 'warning');
      return;
    }

    if (forceRefresh) {
      filters.refresh_cache = true;
      this.showMessage(this.translateService.instant('analytics_cache_refreshing'), 'info');
    }

    // Usar principalmente el endpoint season-dashboard
    this.apiService.get('/admin/finance/season-dashboard', [], filters).subscribe({
      next: (response) => {
        this.processSeasonDashboardData(response.data);
        this.loading = false;
        this.cdr.detectChanges();

        // Crear gráficos después de que los datos estén listos
        setTimeout(() => this.createChartsForTab(this.activeTab), 100);
        this.maybeLoadFullDashboard(this.activeTab);
      },
      error: (error) => {
        console.error('❌ Error loading analytics data:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildFiltersObject(): any {
    const formValue = this.filterForm.value;

    const filters: any = {
      school_id: this.user?.schools?.[0]?.id ?? this.user?.school?.id ?? null,
      start_date: formValue.startDate,
      end_date: formValue.endDate,
      date_filter: formValue.dateFilter,
      include_test_detection: formValue.includeTestDetection,
      include_payrexx_analysis: formValue.includePayrexxAnalysis,
      optimization_level: formValue.optimizationLevel,
      cache_ttl: 1800,
      lean_response: true
    };

    // Filtros opcionales
    if (formValue.courseType?.length) {
      filters.course_type = formValue.courseType.join(',');
    }
    if (formValue.source?.length) {
      filters.source = formValue.source.join(',');
    }
    if (formValue.paymentMethod?.length) {
      filters.payment_method = formValue.paymentMethod.join(',');
    }
    if (formValue.sportId?.length) {
      filters.sport_id = formValue.sportId.join(',');
    }
    if (formValue.onlyWeekends) {
      filters.only_weekends = true;
    }
    if (formValue.onlyPaidBookings) {
      filters.only_paid = true;
    }
    if (!formValue.includeRefunds) {
      filters.exclude_refunds = true;
    }

    return filters;
  }

  private processSeasonDashboardData(data: SeasonDashboardData): void {

    this.dashboardData = data;
    this.cacheMetadata = data?.cache_metadata ?? null;
    this.updateCacheNotice();

    // Actualizar datos de las tablas
    this.updateTableData();
  }

  private updateCacheNotice(): void {
    if (!this.cacheMetadata) {
      this.cacheNoticeKey = null;
      return;
    }

    switch (this.cacheMetadata.cache_status) {
      case 'hit':
        this.cacheNoticeKey = null;
        break;
      case 'refresh':
        this.cacheNoticeKey = 'analytics_cache_notice_refresh';
        break;
      case 'refresh_blocked':
        this.cacheNoticeKey = 'analytics_cache_notice_refresh_blocked';
        break;
      case 'miss':
      default:
        this.cacheNoticeKey = 'analytics_cache_notice_miss';
        break;
    }
  }

  private updateTableData(): void {
    if (!this.dashboardData) return;

    // ✅ Procesar datos de revenue con fechas formateadas
    this.revenueTableData.data = (this.dashboardData.trend_analysis?.monthly_breakdown || []).map(item => ({
      ...item,
      month: this.formatDateWithMonthName(item.month), // ✅ FORMATEAR MES AQUÍ
      month_original: item.month // Mantener original para ordenamiento si es necesario
    }));

    // Tabla de cursos (sin cambios)
    this.coursesTableData.data = this.dashboardData.courses || [];
  }

  // ==================== CHART CREATION ====================

  private createChartsForTab(tabId: string): void {
    if (!this.dashboardData) return;

    try {
      switch (tabId) {
        case 'revenue':
          this.createRevenueChart();
          this.createCourseTypeRevenueChart();
          break;
        case 'payments':
          this.createPaymentMethodsChart();
          this.createPaymentTrendsChart();
          break;
        case 'courses':
          this.createTopCoursesChart();
          this.createCompletionRatesChart();
          break;
        case 'sources':
          this.createSourcesChart();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('�?O Error creating charts:', error);
    }
  }

  private createRevenueChart(): void {
    if (!this.revenueChartRef?.nativeElement || !this.dashboardData) return;

    const data = this.dashboardData.trend_analysis?.monthly_breakdown || [];

    if (data.length === 0) {
      // Mostrar mensaje de sin datos
      const layout = {
        xaxis: { visible: false },
        yaxis: { visible: false },
        annotations: [{
          text: this.translateService.instant('no_data_available'),
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 16, color: '#999' }
        }]
      };
      Plotly.newPlot(this.revenueChartRef.nativeElement, [], layout, { responsive: true });
      return;
    }

    // ✅ ARREGLO: Procesar las fechas correctamente
    const processedData = data.map(item => ({
      ...item,
      month_formatted: this.formatDateWithMonthName(item.month),
      month_original: item.month
    }));

    // Usar barras si hay pocos datos (3 o menos), líneas si hay más
    const chartType = data.length <= 3 ? 'bar' : 'scatter';
    const trace: any = {
      x: processedData.map(d => d.month_formatted),
      y: processedData.map(d => d.revenue),
      type: chartType,
      name: this.translateService.instant('revenue'),
      marker: {
        color: this.chartColors.primary,
        size: 10
      },
      text: processedData.map(d => `${d.revenue.toFixed(2)} ${this.currency}`),
      textposition: 'outside',
      textfont: { size: 12 }
    };

    if (chartType === 'scatter') {
      trace.mode = 'lines+markers+text';
      trace.line = { color: this.chartColors.primary, width: 3 };
    }

    const layout = {
      title: false,
      xaxis: {
        title: this.translateService.instant('month') || 'Mes',
        tickangle: data.length > 6 ? -45 : 0
      },
      yaxis: {
        title: `${this.translateService.instant('revenue')} (${this.currency})`,
        rangemode: 'tozero'
      },
      margin: { l: 80, r: 40, t: 40, b: data.length > 6 ? 100 : 60 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      showlegend: false,
      bargap: 0.3
    };

    Plotly.newPlot(this.revenueChartRef.nativeElement, [trace], layout, { responsive: true });
  }

  private createCourseTypeRevenueChart(): void {

    // Verificación del elemento DOM
    if (!this.courseTypeRevenueChartRef?.nativeElement) {
      console.error('❌ Elemento DOM del gráfico no está disponible');
      return;
    }

    // Verificación de datos principales
    if (!this.dashboardData) {
      console.error('❌ dashboardData no está disponible');
      return;
    }

    const courses = this.dashboardData.courses || [];
    const typeBreakdown = (this.dashboardData as any).course_type_breakdown || [];

    if (courses.length === 0 && typeBreakdown.length === 0) {
      console.warn('?? No hay cursos disponibles');
      this.showEmptyChart();
      return;
    }

    const typeStats: { [typeName: string]: any } = {};

    // Procesar datos con logging detallado
    for (const course of courses) {

      const typeName = this.getCourseTypeName(course.type);
      const revenue = course.revenue || 0;

      if (!typeStats[typeName]) {
        typeStats[typeName] = {
          typeName,
          revenue: 0,
          bookings: 0,
          participants: 0,
            unique_participants: 0,
            revenue_received: 0,
          conversion_rate_sum: 0,
          course_count: 0
        };
      }

      typeStats[typeName].revenue += revenue;
      typeStats[typeName].bookings += course.bookings || 0;
      typeStats[typeName].participants += course.participants || 0;
      typeStats[typeName].unique_participants += course.unique_participants || 0;
      typeStats[typeName].revenue_received += course.revenue_received || 0;
      typeStats[typeName].conversion_rate_sum += course.sales_conversion_rate || 0;
      typeStats[typeName].course_count += course.courses_sold || 0;
    }

    if (courses.length === 0 && typeBreakdown.length > 0) {
      for (const item of typeBreakdown) {
        const typeName = this.getCourseTypeName(item.type);
        const revenue = item.revenue || 0;

        if (!typeStats[typeName]) {
          typeStats[typeName] = {
            typeName,
            revenue: 0,
            bookings: 0,
            participants: 0,
            unique_participants: 0,
            revenue_received: 0,
            conversion_rate_sum: 0,
            course_count: 0
          };
        }

        typeStats[typeName].revenue += revenue;
        typeStats[typeName].bookings += item.bookings || 0;
        typeStats[typeName].participants += item.participants || 0;
        typeStats[typeName].unique_participants += item.unique_participants || 0;
        typeStats[typeName].course_count += item.courses_sold || 0;
      }
    }
    // Verificar que tenemos datos válidos
    const hasValidData = Object.values(typeStats).some(stat => stat.revenue > 0);

    if (!hasValidData) {
      console.warn('⚠️ No hay datos de revenue válidos para mostrar');
      this.showEmptyChart();
      return;
    }

    // Preparar datos para el gráfico
    try {
      const labels = Object.keys(typeStats).map(type => {
        const translated = this.translateService.instant(type);
        return translated;
      });

      const values = Object.values(typeStats).map(stat => stat.revenue);
      const colors = Object.keys(typeStats).map(type => {
        const color = this.getCourseTypeColorByName(type);
        return color;
      });

      // Preparar datos adicionales para mostrar bookings
      const bookingsData = Object.values(typeStats).map(stat => stat.bookings);
      const totalBookings = bookingsData.reduce((sum, bookings) => sum + bookings, 0);
      const coursesSoldData = Object.values(typeStats).map(stat => stat.course_count); // ← NUEVA LÍNEA
      const totalRevenue = values.reduce((sum, revenue) => sum + revenue, 0);
      const totalCoursesSold = coursesSoldData.reduce((sum, courses) => sum + courses, 0);

      // Configurar el gráfico
      const revenueLabel = this.translateService.instant('revenue');
      const bookingsLabel = this.translateService.instant('bookings');
      const coursesSoldLabel = this.translateService.instant('courses_sold');
      const participantsLabel = this.translateService.instant('participants');

      const trace = {
        values,
        labels,
        type: 'pie',
        marker: { colors },
        textinfo: 'label+percent',
        texttemplate: '%{label}<br>%{percent}',

        // ✅ Crear hover text manual (100% funcional)
        hovertemplate: '%{hovertext}<extra></extra>',
        hovertext: Object.values(typeStats).map((stats: any) => {
          const typeName = this.translateService.instant(stats.typeName);
          const participants = stats.unique_participants > 0
            ? stats.unique_participants
            : stats.participants;
          return `<b>${typeName}</b><br>` +
            `${revenueLabel}: ${stats.revenue.toFixed(2)} ${this.currency}<br>` +
            `${bookingsLabel}: ${stats.bookings}<br>` +
            `${coursesSoldLabel}: ${stats.course_count}<br>` +
            `${participantsLabel}: ${participants}`;
        })
      };

// 🔧 CAMBIO ADICIONAL: Asegurar que typeStats tenga el campo typeName
// Modifica esta parte en tu loop de procesamiento:

      for (const course of courses) {

        const typeName = this.getCourseTypeName(course.type);
        const revenue = course.revenue || 0;

        if (!typeStats[typeName]) {
          typeStats[typeName] = {
            typeName,        // ← ASEGURAR QUE ESTE CAMPO ESTÉ AQUÍ
            revenue: 0,
            bookings: 0,
            participants: 0,
            unique_participants: 0,
            revenue_received: 0,
            conversion_rate_sum: 0,
            course_count: 0
          };
        }
      }


      const layout = {
        title: {
          text: this.translateService.instant('revenue_by_course_type'),
          font: { size: 16 }
        },
        margin: { l: 20, r: 20, t: 40, b: 20 },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        showlegend: true,
        legend: {
          orientation: 'v',
          x: 1.02,
          y: 0.5
        }
      };

      const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
      };

      Plotly.newPlot(
        this.courseTypeRevenueChartRef.nativeElement,
        [trace],
        layout,
        config
      ).then(() => {
        this.displayBookingsSummary(typeStats, totalBookings, totalRevenue, totalCoursesSold);
      }).catch(error => {
        console.error('❌ Error al crear el gráfico:', error);
      });

      // Opcional: Almacenar las estadísticas para uso posterior
     // this.courseTypeStats = typeStats;

    } catch (error) {
      console.error('❌ Error durante la creación del gráfico:', error);
      this.showEmptyChart();
    }
  }

  // Método para mostrar resumen detallado de bookings y revenue
  private displayBookingsSummary(typeStats: any, totalBookings: number, totalRevenue: number, totalCoursesSold: number): void {

    Object.entries(typeStats).forEach(([typeName, stats]: [string, any]) => {
      const bookingPercentage = totalBookings > 0 ? ((stats.bookings / totalBookings) * 100).toFixed(1) : '0';
      const coursePercentage = totalCoursesSold > 0 ? ((stats.course_count / totalCoursesSold) * 100).toFixed(1) : '0';
      const revenuePercentage = totalRevenue > 0 ? ((stats.revenue / totalRevenue) * 100).toFixed(1) : '0';
      const avgRevenuePerBooking = stats.bookings > 0 ? (stats.revenue / stats.bookings).toFixed(2) : '0';
      const avgRevenuePerCourse = stats.course_count > 0 ? (stats.revenue / stats.course_count).toFixed(2) : '0';
    });

    // También crear el array para uso en el template si lo necesitas
    this.courseTypeBookingsSummary = Object.entries(typeStats).map(([typeName, stats]: [string, any]) => ({
      type: typeName,
      typeName: this.translateService.instant(typeName),
      bookings: stats.bookings,
      courses_sold: stats.course_count, // ← NUEVA LÍNEA
      revenue: stats.revenue,
      participants: stats.participants,
      revenueReceived: stats.revenue_received,
      avgRevenuePerBooking: stats.bookings > 0 ? stats.revenue / stats.bookings : 0,
      avgRevenuePerCourse: stats.course_count > 0 ? stats.revenue / stats.course_count : 0, // ← NUEVA LÍNEA
      bookingPercentage: totalBookings > 0 ? (stats.bookings / totalBookings) * 100 : 0,
      coursePercentage: totalCoursesSold > 0 ? (stats.course_count / totalCoursesSold) * 100 : 0, // ← NUEVA LÍNEA
      revenuePercentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
    }));
  }

// Método auxiliar para mostrar un gráfico vacío con mensaje
  private showEmptyChart(): void {
    if (!this.courseTypeRevenueChartRef?.nativeElement) return;

    const trace = {
      values: [1],
      labels: [this.translateService.instant('no_data_available')],
      type: 'pie',
      marker: { colors: ['#E0E0E0'] },
      textinfo: 'label',
      hoverinfo: 'none'
    };

    const layout = {
      title: {
        text: this.translateService.instant('revenue_by_course_type'),
        font: { size: 16 }
      },
      margin: { l: 20, r: 20, t: 40, b: 20 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      showlegend: false,
      annotations: [{
        text: this.translateService.instant('no_data_to_display'),
        x: 0.5,
        y: 0.5,
        showarrow: false,
        font: { size: 14, color: '#666' }
      }]
    };

    Plotly.newPlot(
      this.courseTypeRevenueChartRef.nativeElement,
      [trace],
      layout,
      { responsive: true, displayModeBar: false }
    );
  }
  private createPaymentMethodsChart(): void {
    if (!this.paymentMethodsChartRef?.nativeElement || !this.dashboardData) return;

    const methods = this.dashboardData.payment_methods?.methods || [];

    const trace = {
      values: methods.map(m => m.revenue),
      labels: methods.map(m => m.display_name),
      type: 'pie',
      marker: { colors: this.chartColors.gradient }
    };

    const layout = {
      title: false,
      margin: { l: 20, r: 20, t: 20, b: 20 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)'
    };

    Plotly.newPlot(this.paymentMethodsChartRef.nativeElement, [trace], layout, { responsive: true });
  }

  private createPaymentTrendsChart(): void {
    if (!this.paymentTrendsChartRef?.nativeElement || !this.dashboardData) return;

    const onlineVsOffline = this.dashboardData.payment_methods?.online_vs_offline;

    if (!onlineVsOffline) return;

    const onlineLabel = this.translateService.instant('online');
    const offlineLabel = this.translateService.instant('offline');
    const paymentTypeLabel = this.translateService.instant('payment_type');
    const revenueLabel = this.translateService.instant('revenue');

    const trace = {
      x: [onlineLabel, offlineLabel],
      y: [onlineVsOffline.online.revenue, onlineVsOffline.offline.revenue],
      type: 'bar',
      marker: { color: [this.chartColors.info, this.chartColors.secondary] }
    };

    const layout = {
      title: false,
      xaxis: { title: paymentTypeLabel },
      yaxis: { title: `${revenueLabel} (${this.currency})` },
      margin: { l: 60, r: 20, t: 20, b: 40 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)'
    };

    Plotly.newPlot(this.paymentTrendsChartRef.nativeElement, [trace], layout, { responsive: true });
  }

  private createTopCoursesChart(): void {
    if (!this.topCoursesChartRef?.nativeElement || !this.dashboardData) return;

    const courses = this.dashboardData.courses || [];
    console.log('📊 [COURSES DEBUG] Total courses:', courses.length, courses);

    // Ordenar por ingresos (mayor a menor) y tomar top 10
    const topCourses = courses
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .reverse(); // Invertir para que los mayores queden arriba

    console.log('📊 [COURSES DEBUG] Top courses for chart:', topCourses.length, topCourses);

    // ✅ APLICAR COLORES POR TIPO DE CURSO
    const colors = topCourses.map(course => this.getCourseTypeColor(course.type));

    const revenueLabel = this.translateService.instant('revenue');

    const trace = {
      x: topCourses.map(c => c.revenue),
      y: topCourses.map(c => this.shortenCourseName(c.name)),
      type: 'bar',
      orientation: 'h',
      marker: { color: colors },
      text: topCourses.map(c => `${this.formatCurrency(c.revenue)}`),
      textposition: 'auto',
      hovertemplate: '<b>%{customdata}</b><br>' +
                     `${revenueLabel}: %{x:,.0f} ${this.currency}<br>` +
                     '<extra></extra>',
      customdata: topCourses.map(c => c.name) // Nombre completo en hover
    };

    const layout = {
      title: false,
      xaxis: { title: `${revenueLabel} (${this.currency})` },
      yaxis: {
        automargin: true,
        tickfont: { size: 11 }
      },
      margin: { l: 200, r: 40, t: 20, b: 60 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      height: 450
    };

    Plotly.newPlot(this.topCoursesChartRef.nativeElement, [trace], layout, { responsive: true });
  }

  private createCompletionRatesChart(): void {
    if (!this.completionRatesChartRef?.nativeElement || !this.dashboardData) return;

    const courses = this.dashboardData.courses || [];

    // Ordenar por número de reservas (mayor a menor) y tomar top 10, luego invertir
    const topCoursesByBookings = courses
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)
      .reverse(); // Invertir para que los mayores queden arriba

    // ✅ APLICAR COLORES POR TIPO DE CURSO
    const colors = topCoursesByBookings.map(course => this.getCourseTypeColor(course.type));

    const bookingsLabel = this.translateService.instant('bookings');

    const trace = {
      x: topCoursesByBookings.map(c => c.bookings),
      y: topCoursesByBookings.map(c => this.shortenCourseName(c.name)),
      type: 'bar',
      orientation: 'h',
      marker: { color: colors },
      text: topCoursesByBookings.map(c => `${c.bookings} ${bookingsLabel}`),
      textposition: 'auto',
      hovertemplate: '<b>%{customdata}</b><br>' +
                     `${this.translateService.instant('bookings_count')}: %{x}<br>` +
                     '<extra></extra>',
      customdata: topCoursesByBookings.map(c => c.name) // Nombre completo en hover
    };

    const layout = {
      title: false,
      xaxis: { title: this.translateService.instant('number_of_bookings') },
      yaxis: {
        automargin: true,
        tickfont: { size: 11 }
      },
      margin: { l: 200, r: 40, t: 20, b: 60 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      height: 450
    };

    Plotly.newPlot(this.completionRatesChartRef.nativeElement, [trace], layout, { responsive: true });
  }

  private createSourcesChart(): void {
    if (!this.sourcesChartRef?.nativeElement || !this.dashboardData) return;

    const sources = this.getBookingSourceBreakdown();

    const trace = {
      values: sources.map(s => s.revenue),
      labels: sources.map(s => s.source),
      type: 'pie',
      marker: { colors: this.chartColors.gradient }
    };

    const layout = {
      title: false,
      margin: { l: 20, r: 20, t: 20, b: 20 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)'
    };

    Plotly.newPlot(this.sourcesChartRef.nativeElement, [trace], layout, { responsive: true });
  }

  public getBookingSourceBreakdown(): Array<{
    source: string;
    bookings: number;
    percentage: number;
    unique_clients: number;
    revenue: number;
    avg_booking_value: number;
    consistency_rate?: number;
  }> {
    const sources = this.dashboardData?.booking_sources?.source_breakdown || [];
    if (!sources.length) return [];

    const merged: { [key: string]: any } = {};
    sources.forEach((source) => {
      const key = source.source === 'booking_page' ? 'web' : source.source;
      if (!merged[key]) {
        merged[key] = {
          source: key,
          bookings: 0,
          percentage: 0,
          unique_clients: 0,
          revenue: 0,
          avg_booking_value: 0,
          consistency_rate: source.consistency_rate || 0
        };
      }
      merged[key].bookings += source.bookings || 0;
      merged[key].unique_clients += source.unique_clients || 0;
      merged[key].revenue += source.revenue || 0;
    });

    const totalBookings = Object.values(merged).reduce((sum, item) => sum + item.bookings, 0);
    Object.values(merged).forEach((item: any) => {
      item.percentage = totalBookings > 0 ? Math.round((item.bookings / totalBookings) * 100 * 100) / 100 : 0;
      item.avg_booking_value = item.bookings > 0 ? Math.round((item.revenue / item.bookings) * 100) / 100 : 0;
      item.revenue = Math.round(item.revenue * 100) / 100;
    });

    return Object.values(merged).sort((a: any, b: any) => b.bookings - a.bookings);
  }

  public onPendingRevenueClick(): void {
    if (!this.dashboardData?.executive_kpis?.revenue_pending ||
      this.dashboardData.executive_kpis.revenue_pending <= 0) {
      this.showMessage(this.translateService.instant('analytics_no_pending_bookings'), 'info');
      return;
    }

    this.showMessage(this.translateService.instant('analytics_loading_pending_bookings'), 'info');
    this.loadPendingBookingsDetailed();
  }

  // 📋 CLICK EN KPI DE PENDIENTES DE COBRO (solo con deuda)
  public onUnpaidWithDebtClick(): void {
    if (!this.dashboardData?.executive_kpis?.unpaid_with_debt_count ||
      this.dashboardData.executive_kpis.unpaid_with_debt_count <= 0) {
      this.showMessage(this.translateService.instant('analytics_no_unpaid_with_debt_bookings'), 'info');
      return;
    }

    this.showMessage(this.translateService.instant('analytics_loading_unpaid_with_debt_bookings'), 'info');
    this.loadUnpaidWithDebtBookings();
  }

  // 📋 CLICK EN KPI DE SOBREPAGOS
  public onOverpaymentClick(): void {
    if (!this.dashboardData?.executive_kpis?.overpayment_count ||
      this.dashboardData.executive_kpis.overpayment_count <= 0) {
      this.showMessage(this.translateService.instant('analytics_no_overpayment_bookings'), 'info');
      return;
    }

    this.showMessage(this.translateService.instant('analytics_loading_overpayment_bookings'), 'info');
    this.loadOverpaymentBookings();
  }

  // 📋 CLICK EN KPI DE COMPLETAMENTE PAGADAS
  public onFullyPaidClick(): void {
    if (!this.dashboardData?.executive_kpis?.fully_paid_count ||
      this.dashboardData.executive_kpis.fully_paid_count <= 0) {
      this.showMessage(this.translateService.instant('analytics_no_fully_paid_bookings'), 'info');
      return;
    }

    this.showMessage(this.translateService.instant('analytics_loading_fully_paid_bookings'), 'info');
    this.loadFullyPaidBookings();
  }

  // 📋 CARGAR RESERVAS COMPLETAMENTE PAGADAS
  private loadFullyPaidBookings(): void {
    const filters = this.buildFiltersObject();
    filters.payment_category = 'fully_paid';

    this.apiService.get('/admin/finance/booking-details', [], filters).subscribe({
      next: (response) => {
        if (!response.data?.bookings?.length) {
          this.showMessage(this.translateService.instant('analytics_no_fully_paid_bookings_found'), 'warning');
          return;
        }

        const fullyPaidBookingsData = {
          title: this.translateService.instant('analytics_fully_paid_bookings_title', {
            count: response.data.bookings.length
          }),
          type: 'fully_paid',
          bookings: response.data.bookings,
          currency: this.currency,
          financial_summary: response.data.financial_summary
        };

        this.openBookingListModal(fullyPaidBookingsData);
      },
      error: (error) => {
        console.error('Error cargando reservas completamente pagadas:', error);
        this.showMessage(this.translateService.instant('analytics_error_loading_fully_paid_bookings'), 'error');
      }
    });
  }

  // 📋 CARGAR RESERVAS PENDIENTES CON DETALLE
  private loadPendingBookingsDetailed(): void {
    const filters = this.buildFiltersObject();
    filters.only_pending = true;

    this.apiService.get('/admin/finance/booking-details', [], filters).subscribe({
      next: (response) => {
        if (!response.data?.bookings?.length) {
          this.showMessage(this.translateService.instant('analytics_no_pending_bookings_found'), 'warning');
          return;
        }

        const pendingBookingsData = {
          title: this.translateService.instant('analytics_pending_bookings_title', {
            count: response.data.bookings.length
          }),
          type: 'pending',
          bookings: response.data.bookings,
          currency: this.currency,
          financial_summary: response.data.financial_summary,
          payment_classification: response.data.payment_classification
        };

        this.openBookingListModal(pendingBookingsData);
      },
      error: (error) => {
        console.error('Error cargando reservas pendientes:', error);
        this.showMessage(this.translateService.instant('analytics_error_loading_pending_bookings'), 'error');
      }
    });
  }

  public onCancelledBookingsClick(): void {
    if (!this.dashboardData?.season_info?.booking_classification?.cancelled_count ||
      this.dashboardData.season_info.booking_classification.cancelled_count <= 0) {
      this.showMessage(this.translateService.instant('analytics_no_cancelled_bookings'), 'info');
      return;
    }

    this.showMessage(this.translateService.instant('analytics_loading_cancelled_bookings'), 'info');
    this.loadCancelledBookingsDetailed();
  }

  private loadCancelledBookingsDetailed(): void {
    const filters = this.buildFiltersObject();
    filters.only_cancelled = true;

    this.apiService.get('/admin/finance/booking-details', [], filters).subscribe({
      next: (response) => {
        if (!response.data?.bookings?.length) {
          this.showMessage(this.translateService.instant('analytics_no_cancelled_bookings_found'), 'warning');
          return;
        }

        const cancelledBookingsData = {
          title: this.translateService.instant('analytics_cancelled_bookings_title', {
            count: response.data.bookings.length
          }),
          type: 'cancelled',
          bookings: response.data.bookings,
          currency: this.currency
        };

        this.openBookingListModal(cancelledBookingsData);
      },
      error: (error) => {
        console.error('Error cargando reservas canceladas:', error);
        this.showMessage(this.translateService.instant('analytics_error_loading_cancelled_bookings'), 'error');
      }
    });
  }

  // 📋 CARGAR RESERVAS CON DEUDA PENDIENTE
  private loadUnpaidWithDebtBookings(): void {
    const filters = this.buildFiltersObject();
    filters.payment_category = 'unpaid_with_debt';

    this.apiService.get('/admin/finance/booking-details', [], filters).subscribe({
      next: (response) => {
        if (!response.data?.bookings?.length) {
          this.showMessage(this.translateService.instant('analytics_no_unpaid_with_debt_bookings_found'), 'warning');
          return;
        }

        const unpaidBookingsData = {
          title: this.translateService.instant('analytics_unpaid_with_debt_bookings_title', {
            count: response.data.bookings.length
          }),
          type: 'unpaid_with_debt',
          bookings: response.data.bookings,
          currency: this.currency,
          financial_summary: response.data.financial_summary,
          payment_classification: response.data.payment_classification
        };

        this.openBookingListModal(unpaidBookingsData);
      },
      error: (error) => {
        console.error('Error cargando reservas con deuda:', error);
        this.showMessage(this.translateService.instant('analytics_error_loading_unpaid_with_debt_bookings'), 'error');
      }
    });
  }

  // 📋 CARGAR RESERVAS CON SOBREPAGO
  private loadOverpaymentBookings(): void {
    const filters = this.buildFiltersObject();
    filters.payment_category = 'overpayment';

    this.apiService.get('/admin/finance/booking-details', [], filters).subscribe({
      next: (response) => {
        if (!response.data?.bookings?.length) {
          this.showMessage(this.translateService.instant('analytics_no_overpayment_bookings_found'), 'warning');
          return;
        }

        const overpaymentBookingsData = {
          title: this.translateService.instant('analytics_overpayment_bookings_title', {
            count: response.data.bookings.length
          }),
          type: 'overpayment',
          bookings: response.data.bookings,
          currency: this.currency,
          financial_summary: response.data.financial_summary,
          payment_classification: response.data.payment_classification
        };

        this.openBookingListModal(overpaymentBookingsData);
      },
      error: (error) => {
        console.error('Error cargando reservas con sobrepago:', error);
        this.showMessage(this.translateService.instant('analytics_error_loading_overpayment_bookings'), 'error');
      }
    });
  }

  // 📊 OBTENER TOTAL DE RESERVAS CON DESBALANCE
  public getTotalImbalanceCount(): number {
    if (!this.dashboardData?.executive_kpis) {
      return 0;
    }
    const unpaidCount = Number(this.dashboardData.executive_kpis.unpaid_with_debt_count) || 0;
    const overpaymentCount = Number(this.dashboardData.executive_kpis.overpayment_count) || 0;
    return unpaidCount + overpaymentCount;
  }

  // 📊 OBTENER SUBTITLE FORMATEADO PARA DESBALANCES
  public getImbalanceSubtitle(): string {
    const total = this.getTotalImbalanceCount();
    return this.translateService.instant('analytics_bookings_with_imbalance', { count: total });
  }

  // 📊 CALCULAR PORCENTAJE DE PAGADO (sobre lo que se debe, no sobre el total esperado)
  public getPaymentPercentage(): number {
    if (!this.dashboardData?.executive_kpis) {
      return 0;
    }
    const received = this.dashboardData.executive_kpis.revenue_received || 0;
    const unpaidWithDebt = this.dashboardData.executive_kpis.unpaid_with_debt_amount || 0;
    const totalDue = received + unpaidWithDebt; // Lo que se debe = lo recibido + lo que falta

    if (totalDue === 0) return 100;
    return Math.round((received / totalDue) * 100);
  }

  // 📊 CALCULAR PORCENTAJE DE PENDIENTES DE COBRO
  public getUnpaidPercentage(): number {
    if (!this.dashboardData?.executive_kpis) {
      return 0;
    }
    const unpaidWithDebt = this.dashboardData.executive_kpis.unpaid_with_debt_amount || 0;
    const expected = this.dashboardData.executive_kpis.revenue_expected || 0;

    if (expected === 0) return 0;
    return Math.round((unpaidWithDebt / expected) * 100);
  }

  // 📊 CALCULAR PORCENTAJE DE SOBREPAGOS
  public getOverpaymentPercentage(): number {
    if (!this.dashboardData?.executive_kpis) {
      return 0;
    }
    const overpayment = this.dashboardData.executive_kpis.overpayment_amount || 0;
    const expected = this.dashboardData.executive_kpis.revenue_expected || 0;

    if (expected === 0) return 0;
    return Math.round((overpayment / expected) * 100);
  }

  // 📊 CALCULAR PORCENTAJE DE DESBALANCES NETOS
  public getNetImbalancePercentage(): number {
    if (!this.dashboardData?.executive_kpis) {
      return 0;
    }
    const unpaidWithDebt = this.dashboardData.executive_kpis.unpaid_with_debt_amount || 0;
    const overpayment = this.dashboardData.executive_kpis.overpayment_amount || 0;
    const netImbalance = unpaidWithDebt - overpayment;
    const expected = this.dashboardData.executive_kpis.revenue_expected || 0;

    if (expected === 0) return 0;
    return Math.round((netImbalance / expected) * 100);
  }

  private openBookingListModal(data: any): void {
    const dialogRef = this.dialog.open(BookingListModalComponent, {
      width: '95vw',
      maxWidth: '1400px',
      height: '85vh',
      maxHeight: '800px',
      data: data,
      panelClass: 'booking-list-modal',
      disableClose: false,
      autoFocus: false
    });

    // Manejar acciones del modal
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.handleModalAction(result);
      }
    });
  }

// 🎬 MANEJAR ACCIONES DEL MODAL
  private handleModalAction(result: any): void {
    switch (result.action) {
      case 'export':
        this.handleExportAllBookings(result);
        break;

      case 'export_single':
        this.handleExportSingleBooking(result);
        break;

      case 'view_details':
        this.handleViewBookingDetails(result);
        break;

      default:
    }
  }

// 📤 MANEJAR EXPORTACIÓN DE TODAS LAS RESERVAS
  private handleExportAllBookings(result: any): void {
    const exportType = result.type;
    const exportTypeLabel = this.translateService.instant(`analytics_export_type_${exportType}`);
    const filePrefix = this.translateService.instant('analytics_bookings_export_file_prefix');
    const fileName = `${filePrefix}_${exportTypeLabel}_${this.getCurrentDateString()}`;

    this.showMessage(this.translateService.instant('analytics_exporting_bookings', {
      count: result.data.length
    }), 'info');

    if (exportType === 'pending' || exportType === 'cancelled') {
      const filters = {
        ...this.buildFiltersObject(),
        [`only_${exportType}`]: true,
        format: 'csv'
      };

      const endpoint = exportType === 'pending'
        ? '/admin/finance/export-pending-bookings'
        : '/admin/finance/export-cancelled-bookings';

      this.apiService.get(endpoint, [], filters).subscribe({
        next: (response) => {
          if (response.data?.download_url) {
            window.open(response.data.download_url, '_blank');
            this.showMessage(this.translateService.instant('analytics_export_bookings_completed', {
              count: result.data.length
            }), 'success');
          } else {
            this.showMessage(this.translateService.instant('analytics_export_error'), 'error');
          }
        },
        error: (error) => {
          console.error('Error exportando reservas:', error);
          this.showMessage(this.translateService.instant('analytics_export_error'), 'error');
        }
      });
      return;
    }

    const csvContent = this.createBookingListCsv(result.data || [], exportType, result.title);
    this.downloadCsvContent(csvContent, fileName);
    this.showMessage(this.translateService.instant('analytics_export_bookings_completed', {
      count: result.data.length
    }), 'success');
  }

// 📤 MANEJAR EXPORTACIÓN DE RESERVA INDIVIDUAL
  private handleExportSingleBooking(result: any): void {
    const booking = result.booking;

    this.showMessage(this.translateService.instant('analytics_exporting_single_booking', {
      id: booking.id
    }), 'info');

    // Crear un mini CSV para la reserva individual
    const csvContent = this.createSingleBookingCsv(booking, result.type);
    const bookingPrefix = this.translateService.instant('analytics_single_booking_export_file_prefix');
    const fileName = `${bookingPrefix}_${booking.id}_${this.getCurrentDateString()}.csv`;

    this.downloadCsvContent(csvContent, fileName);
    this.showMessage(this.translateService.instant('analytics_single_booking_exported', {
      id: booking.id
    }), 'success');
  }

// 👁️ MANEJAR VER DETALLES DE RESERVA
  private handleViewBookingDetails(result: any): void {
    const booking = result.booking;

    if (booking.id) {
      // Navegar al detalle de la reserva
      this.router.navigate(['/admin/bookings', booking.id]);
    } else {
      this.showMessage(this.translateService.instant('analytics_booking_id_unavailable'), 'warning');
    }
  }

// 📄 CREAR CSV PARA RESERVA INDIVIDUAL
  private createSingleBookingCsv(booking: any, type: string): string {
    let csvContent = '\xEF\xBB\xBF'; // BOM for UTF-8

    csvContent += `${this.translateService.instant('analytics_booking_details_title', { id: booking.id })}\n`;
    csvContent += `${this.translateService.instant('analytics_generated_at')}: ${new Date().toLocaleString(this.getLocale())}\n\n`;

    // Headers
    if (type === 'pending') {
      csvContent += `"${this.translateService.instant('field_label')}","${this.translateService.instant('value_label')}"\n`;
      csvContent += `"${this.translateService.instant('id')}","${booking.id}"\n`;
      csvContent += `"${this.translateService.instant('client')}","${booking.client_name}"\n`;
      csvContent += `"${this.translateService.instant('email_label')}","${booking.client_email}"\n`;
      csvContent += `"${this.translateService.instant('date')}","${booking.booking_date}"\n`;
      csvContent += `"${this.translateService.instant('total_amount')}","${this.formatCurrencyForCsv(booking.amount)}"\n`;
      csvContent += `"${this.translateService.instant('received')}","${this.formatCurrencyForCsv(booking.received_amount)}"\n`;
      csvContent += `"${this.translateService.instant('pending')}","${this.formatCurrencyForCsv(booking.pending_amount)}"\n`;
      csvContent += `"${this.translateService.instant('status')}","${booking.status}"\n`;
    } else {
      csvContent += `"${this.translateService.instant('field_label')}","${this.translateService.instant('value_label')}"\n`;
      csvContent += `"${this.translateService.instant('id')}","${booking.id}"\n`;
      csvContent += `"${this.translateService.instant('client')}","${booking.client_name}"\n`;
      csvContent += `"${this.translateService.instant('email_label')}","${booking.client_email}"\n`;
      csvContent += `"${this.translateService.instant('date')}","${booking.booking_date}"\n`;
      csvContent += `"${this.translateService.instant('amount')}","${this.formatCurrencyForCsv(booking.amount)}"\n`;
      csvContent += `"${this.translateService.instant('status')}","${booking.status}"\n`;
    }

    return csvContent;
  }

  private createBookingListCsv(bookings: any[], type: string, title?: string): string {
    let csvContent = '\xEF\xBB\xBF'; // BOM for UTF-8

    const typeLabel = this.translateService.instant(`analytics_export_type_${type}`);
    const headerTitle = title || `${this.translateService.instant('analytics_bookings_export_file_prefix')} ${typeLabel}`;
    csvContent += `${headerTitle}\n`;
    csvContent += `${this.translateService.instant('analytics_generated_at')}: ${new Date().toLocaleString(this.getLocale())}\n\n`;

    csvContent += `"${this.translateService.instant('id')}","${this.translateService.instant('client')}","${this.translateService.instant('email_label')}","${this.translateService.instant('date')}","${this.translateService.instant('total_amount')}","${this.translateService.instant('received')}","${this.translateService.instant('pending')}","${this.translateService.instant('status')}"\n`;

    bookings.forEach((booking) => {
      const row = [
        booking.id ?? '',
        booking.client_name ?? '',
        booking.client_email ?? '',
        booking.booking_date ?? '',
        this.formatCurrencyForCsv(booking.amount ?? 0),
        this.formatCurrencyForCsv(booking.received_amount ?? 0),
        this.formatCurrencyForCsv(booking.pending_amount ?? 0),
        booking.status ?? ''
      ];

      const escapedRow = row.map((field) => `"${String(field).replace(/\"/g, '""')}"`);
      csvContent += `${escapedRow.join(',')}\n`;
    });

    return csvContent;
  }

// 💰 FORMATEAR CURRENCY PARA CSV
  private formatCurrencyForCsv(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return new Intl.NumberFormat(this.getLocale(), {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(0);
    }
    return new Intl.NumberFormat(this.getLocale(), {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

// 📅 OBTENER FECHA ACTUAL COMO STRING
  private getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0].replace(/-/g, '');
  }

  /**
   * Procesar fechas para mostrar nombres de meses
   */
  private processDateLabels(dates: string[]): string[] {
    return dates.map(date => this.formatDateWithMonthName(date));
  }

  /**
   * Crear configuración de eje X con fechas traducidas
   */
  private createTranslatedXAxisConfig(dates: string[]) {
    const translatedLabels = this.processDateLabels(dates);

    return {
      title: this.translateService.instant('dates'),
      tickmode: 'array',
      tickvals: dates,
      ticktext: translatedLabels,
      tickangle: -45, // Rotar las etiquetas para mejor legibilidad
    };
  }

  /**
   * Formatear fechas con nombres de meses traducidos
   */
  private formatDateWithMonthName(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = moment(dateString);

      // Si el formato es "YYYY-MM", procesarlo correctamente
      if (dateString.match(/^\d{4}-\d{2}$/)) {
        const year = date.format('YYYY');
        const monthNumber = date.format('MM');

        // Mapear número de mes a nombre
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];

        const monthIndex = parseInt(monthNumber, 10) - 1;
        const monthKey = monthNames[monthIndex];

        const translatedMonth = this.translateService.instant(`months.${monthKey}`);
        return `${translatedMonth} ${year}`;
      }

      // Para otros formatos, usar moment
      const monthKey = date.format('MMMM').toLowerCase();
      const year = date.format('YYYY');
      const translatedMonth = this.translateService.instant(`months.${monthKey}`);

      return `${translatedMonth} ${year}`;

    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return dateString; // Fallback al original
    }
  }

// 💾 DESCARGAR CONTENIDO CSV
  private downloadCsvContent(content: string, fileName: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

// 💬 MOSTRAR MENSAJE AL USUARIO
  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const config = {
      duration: 4000,
      horizontalPosition: 'end' as const,
      verticalPosition: 'top' as const,
      panelClass: [`snackbar-${type}`]
    };

    this.snackBar.open(message, this.translateService.instant('close'), config);
  }

  private getLocale(): string {
    const lang = this.translateService.currentLang || 'en';
    const localeMap: { [key: string]: string } = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT'
    };

    return localeMap[lang] || lang;
  }

// 6. EXPORTAR RESERVAS PENDIENTES
  private exportPendingBookings(): void {
    const filters = { ...this.buildFiltersObject(), only_pending: true, format: 'csv' };

    this.apiService.get('/admin/finance/export-pending-bookings', [], filters).subscribe({
      next: (response) => {
        if (response.data?.download_url) {
          window.open(response.data.download_url, '_blank');
        }
      },
      error: (error) => console.error('Error exportando reservas pendientes:', error)
    });
  }

// 7. EXPORTAR RESERVAS CANCELADAS
  private exportCancelledBookings(): void {
    const filters = { ...this.buildFiltersObject(), only_cancelled: true, format: 'csv' };

    this.apiService.get('/admin/finance/export-cancelled-bookings', [], filters).subscribe({
      next: (response) => {
        if (response.data?.download_url) {
          window.open(response.data.download_url, '_blank');
        }
      },
      error: (error) => console.error('Error exportando reservas canceladas:', error)
    });
  }


  private loadPendingBookings(): void {
    this.loadingPendingBookings = true;

    // Simular carga de datos - esto se conectará al backend más tarde
    setTimeout(() => {
      this.pendingBookings = [
        {
          id: 12345,
          client_name: 'Juan Pérez',
          client_email: 'juan@example.com',
          booking_date: '2024-12-15',
          amount: 150.00,
          pending_amount: 75.00,
          status: 'active'
        },
        {
          id: 12346,
          client_name: 'María García',
          client_email: 'maria@example.com',
          booking_date: '2024-12-16',
          amount: 200.00,
          pending_amount: 200.00,
          status: 'active'
        }
      ];
      this.loadingPendingBookings = false;
    }, 1000);
  }

  private loadCancelledBookings(): void {
    this.loadingCancelledBookings = true;

    // Simular carga de datos - esto se conectará al backend más tarde
    setTimeout(() => {
      this.cancelledBookings = [
        {
          id: 12340,
          client_name: 'Carlos López',
          client_email: 'carlos@example.com',
          booking_date: '2024-12-10',
          amount: 180.00,
          status: 'cancelled'
        },
        {
          id: 12341,
          client_name: 'Ana Martínez',
          client_email: 'ana@example.com',
          booking_date: '2024-12-11',
          amount: 95.00,
          status: 'cancelled'
        }
      ];
      this.loadingCancelledBookings = false;
    }, 1000);
  }

  // ==================== MODAL EVENT HANDLERS ====================

  public onViewBookingDetails(booking: any): void {
    // TODO: Navegar al detalle de la reserva
  }

  public onEditBooking(booking: any): void {
    // TODO: Abrir formulario de edición
  }

  public onExportBooking(booking: any): void {
    // TODO: Exportar reserva individual
  }

  public onExportAllBookings(bookings: any[]): void {
    // TODO: Exportar todas las reservas del modal
  }

  // ==================== TAB MANAGEMENT (ACTUALIZADO) ====================

  onTabChange(event: MatTabChangeEvent): void {
    this.activeTabIndex = event.index;
    this.activeTab = this.tabs[event.index].id;
    this.maybeLoadFullDashboard(this.activeTab);
    setTimeout(() => this.createChartsForTab(this.activeTab), 100);
        this.maybeLoadFullDashboard(this.activeTab);
  }

  public onPresetRangeChange(event: any): void {
    const value = event.value;
    if (!value) return;

    let startDate: moment.Moment;
    let endDate: moment.Moment = moment();

    switch (value) {
      case 'today':
        startDate = moment().startOf('day');
        endDate = moment().endOf('day');
        break;
      case 'yesterday':
        startDate = moment().subtract(1, 'day').startOf('day');
        endDate = moment().subtract(1, 'day').endOf('day');
        break;
      case 'this_week':
        startDate = moment().startOf('week');
        break;
      case 'last_week':
        startDate = moment().subtract(1, 'week').startOf('week');
        endDate = moment().subtract(1, 'week').endOf('week');
        break;
      case 'this_month':
        startDate = moment().startOf('month');
        break;
      case 'last_month':
        startDate = moment().subtract(1, 'month').startOf('month');
        endDate = moment().subtract(1, 'month').endOf('month');
        break;
      case 'this_quarter':
        startDate = moment().startOf('quarter');
        break;
      case 'last_quarter':
        startDate = moment().subtract(1, 'quarter').startOf('quarter');
        endDate = moment().subtract(1, 'quarter').endOf('quarter');
        break;
      case 'this_year':
        startDate = moment().startOf('year');
        break;
      case 'last_year':
        startDate = moment().subtract(1, 'year').startOf('year');
        endDate = moment().subtract(1, 'year').endOf('year');
        break;
      default:
        return;
    }

    this.filterForm.patchValue({
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD')
    });
  }

  public applyFilters(): void {
    this.loadAnalyticsData();
  }

  public refreshData(): void {
    this.loadAnalyticsData(true);
  }
  private resetTabLoading(): void {
    Object.keys(this.tabLoading).forEach((key) => {
      this.tabLoading[key] = false;
    });
  }

  private requiresFullData(tabId: string): boolean {
    return ['revenue', 'courses'].includes(tabId);
  }

  private resolveFullOptimizationLevel(): string {
    const level = this.filterForm?.value?.optimizationLevel;
    if (level && level !== 'fast') {
      return level;
    }

    return 'balanced';
  }

  private maybeLoadFullDashboard(tabId: string): void {
    if (!this.dashboardData) return;
    if (!this.requiresFullData(tabId)) return;
    if (this.fullDashboardLoaded || this.fullDashboardLoading) return;

    const filters = this.buildFiltersObject();
    if (!filters.school_id) return;
    this.fullDashboardLoading = true;
    this.tabLoading[tabId] = true;

    this.apiService.get('/admin/finance/season-dashboard', [], filters).subscribe({
      next: (response) => {
        this.processSeasonDashboardData(response.data);
        this.fullDashboardLoaded = true;
        this.fullDashboardLoading = false;
        this.resetTabLoading();
        this.cdr.detectChanges();
        setTimeout(() => this.createChartsForTab(this.activeTab), 100);
        this.maybeLoadFullDashboard(this.activeTab);
      },
      error: (error) => {
        console.error('�?O Error loading full analytics data:', error);
        this.fullDashboardLoading = false;
        this.resetTabLoading();
        this.cdr.detectChanges();
      }
    });
  }
  public toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  public onExportData(): void {
    if (!this.dashboardData) {
      this.showMessage(this.translateService.instant('analytics_no_data_to_export'), 'warning');
      return;
    }

    // Check which tab is active and export accordingly
    if (this.activeTab === 'monitors') {
      this.exportMonitorsData();
    } else {
      this.exportDashboardData();
    }
  }

  private exportDashboardData(): void {
    const filters = this.buildFiltersObject();
    const exportFilters = {
      ...filters,
      format: this.exportFormat,
      locale: this.translateService.currentLang,
      sections: ['executive_summary', 'financial_kpis', 'booking_analysis', 'critical_issues']
    };

    this.showMessage(this.translateService.instant('analytics_export_dashboard_in_progress'), 'info');

    this.apiService.get('/admin/finance/season-dashboard/export', [], exportFilters).subscribe({
      next: (response) => {
        if (response.data?.download_url) {
          window.open(response.data.download_url, '_blank');
          this.showMessage(this.translateService.instant('analytics_export_dashboard_done'), 'success');
        } else {
          // Fallback: if no download_url, export locally
          this.exportDashboardDataLocally();
        }
      },
      error: (error) => {
        console.error('❌ Export error:', error);
        // Fallback to local export on error
        this.exportDashboardDataLocally();
      }
    });
  }

  private exportDashboardDataLocally(): void {
    this.showMessage(this.translateService.instant('analytics_export_dashboard_local_in_progress'), 'info');
    const csvContent = this.generateDashboardCsv();
    const filePrefix = this.translateService.instant('analytics_dashboard_export_file_prefix');
    const fileName = `${filePrefix}_${this.getCurrentDateString()}.csv`;
    this.downloadCsvContent(csvContent, fileName);
    this.showMessage(this.translateService.instant('analytics_export_dashboard_local_done'), 'success');
  }

  private exportMonitorsData(): void {

    // Check if monitors component is available
    if (!this.monitorsLegacyComponent) {
      this.showMessage(this.translateService.instant('analytics_monitors_component_unavailable'), 'warning');
      console.error('❌ MonitorsLegacyComponent is not available');
      return;
    }

    // Get local data from the child component
    const monitorsData = this.monitorsLegacyComponent.monitorsData;

    if (!monitorsData || monitorsData.length === 0) {
      this.showMessage(this.translateService.instant('analytics_no_monitors_data'), 'warning');
      console.warn('⚠️ No monitors data available for export');
      return;
    }
    this.showMessage(this.translateService.instant('analytics_exporting_monitors'), 'info');

    // Generate CSV from local data
    const csvContent = this.generateMonitorsCsv(monitorsData);
    const filePrefix = this.translateService.instant('analytics_monitors_export_file_prefix');
    const fileName = `${filePrefix}_${this.getCurrentDateString()}.csv`;

    // Download the CSV
    this.downloadCsvContent(csvContent, fileName);
    this.showMessage(this.translateService.instant('analytics_monitors_export_done', {
      count: monitorsData.length
    }), 'success');
  }


  private generateMonitorsCsv(monitorsData: any[]): string {
    let csvContent = '\uFEFF'; // UTF-8 BOM

    // Add export metadata
    csvContent += `"${this.translateService.instant('analytics_monitors_export_title')}"\n`;
    csvContent += `"${this.translateService.instant('analytics_export_date')}: ${new Date().toLocaleString(this.getLocale())}"\n`;
    csvContent += `"${this.translateService.instant('analytics_date_range')}: ${this.filterForm.value.startDate} - ${this.filterForm.value.endDate}"\n`;
    csvContent += `"${this.translateService.instant('analytics_total_monitors')}: ${monitorsData.length}"\n\n`;

    // Header
    csvContent += `"${this.translateService.instant('monitor')}",`;
    csvContent += `"${this.translateService.instant('sport')}",`;
    csvContent += `"${this.translateService.instant('collective_hours_abbr')}",`;
    csvContent += `"${this.translateService.instant('private_hours_abbr')}",`;
    csvContent += `"${this.translateService.instant('activities_hours_abbr')}",`;
    csvContent += `"${this.translateService.instant('nwd_hours_abbr')}",`;
    csvContent += `"${this.translateService.instant('total_hours')}",`;
    csvContent += `"${this.translateService.instant('price_per_hour')}",`;
    csvContent += `"${this.translateService.instant('total')}"\n`;

    // Data rows
    monitorsData.forEach(monitor => {
      const row = [
        `"${monitor.monitor || ''}"`,
        `"${monitor.sport || ''}"`,
        `"${monitor.hours_collective || 0}"`,
        `"${monitor.hours_private || 0}"`,
        `"${monitor.hours_activities || 0}"`,
        `"${monitor.hours_nwd_payed || 0}"`,
        `"${monitor.total_hours || 0}"`,
        `"${this.formatNumberForCsv(monitor.hour_price)}"`,
        `"${this.formatNumberForCsv(monitor.total_cost)}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    // Totals row
    const totalHours = monitorsData.reduce((sum, m) => {
      const hours = typeof m.total_hours === 'number' ? m.total_hours : 0;
      return sum + hours;
    }, 0);

    const totalCost = monitorsData.reduce((sum, m) => {
      const cost = typeof m.total_cost === 'number' ? m.total_cost : 0;
      return sum + cost;
    }, 0);

    csvContent += '\n';
    csvContent += `"${this.translateService.instant('total').toUpperCase()}","","","","","","${totalHours}","","${this.formatNumberForCsv(totalCost)}"\n`;

    return csvContent;
  }

  /**
   * Format number for CSV export
   */
  private formatNumberForCsv(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    return new Intl.NumberFormat(this.getLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private generateDashboardCsv(): string {
    let csvContent = '\uFEFF'; // UTF-8 BOM

    csvContent += `"${this.translateService.instant('analytics_dashboard_export_title')}"\n`;
    csvContent += `"${this.translateService.instant('analytics_export_date')}: ${new Date().toLocaleString(this.getLocale())}"\n`;
    csvContent += `"${this.translateService.instant('analytics_date_range')}: ${this.filterForm.value.startDate} - ${this.filterForm.value.endDate}"\n\n`;

    // Executive Summary
    csvContent += `"${this.translateService.instant('analytics_executive_summary_title')}"\n`;
    csvContent += `"${this.translateService.instant('total_revenue')}","${this.formatCurrencyForCsv(this.dashboardData?.executive_kpis?.revenue_expected)}"\n`;
    csvContent += `"${this.translateService.instant('total_bookings')}","${this.dashboardData?.season_info?.total_bookings || 0}"\n`;
    csvContent += `"${this.translateService.instant('pending_revenue')}","${this.formatCurrencyForCsv(this.dashboardData?.executive_kpis?.revenue_pending)}"\n`;
    csvContent += `"${this.translateService.instant('unique_participants')}","${this.dashboardData?.executive_kpis?.total_participants || 0}"\n`;
    csvContent += `"${this.translateService.instant('unique_clients')}","${this.dashboardData?.executive_kpis?.total_clients || 0}"\n\n`;

    // Revenue by Month
    if (this.dashboardData?.trend_analysis?.monthly_breakdown?.length) {
      csvContent += `"${this.translateService.instant('analytics_revenue_by_month_title')}"\n`;
      csvContent += `"${this.translateService.instant('month')}","${this.translateService.instant('revenue')}","${this.translateService.instant('bookings')}","${this.translateService.instant('average_value')}","${this.translateService.instant('unique_clients')}"\n`;
      this.dashboardData.trend_analysis.monthly_breakdown.forEach((item: any) => {
        csvContent += `"${this.formatDateWithMonthName(item.month)}","${this.formatCurrencyForCsv(item.revenue)}","${item.bookings}","${this.formatCurrencyForCsv(item.avg_booking_value)}","${item.unique_clients}"\n`;
      });
      csvContent += '\n';
    }

    // Courses
    if (this.dashboardData?.courses?.length) {
      csvContent += `"${this.translateService.instant('analytics_courses_title')}"\n`;
      csvContent += `"${this.translateService.instant('course_name')}","${this.translateService.instant('type')}","${this.translateService.instant('revenue')}","${this.translateService.instant('bookings')}","${this.translateService.instant('avg_price')}","${this.translateService.instant('participants')}"\n`;
      this.dashboardData.courses.forEach((course: any) => {
        csvContent += `"${course.name}","${this.translateService.instant(this.getCourseTypeName(course.type))}","${this.formatCurrencyForCsv(course.revenue)}","${course.bookings}","${this.formatCurrencyForCsv(course.average_price)}","${course.participants}"\n`;
      });
    }

    return csvContent;
  }

  public filterCourses(event: any): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.coursesTableData.filter = filterValue.trim().toLowerCase();
  }

  public viewCourseDetails(course: any): void {
    if (!course?.id) {
      this.showMessage(this.translateService.instant('analytics_course_id_unavailable'), 'warning');
      return;
    }

    // Preparar datos para el modal
    const modalData = {
      courseId: course.id,
      courseName: course.name || this.translateService.instant('analytics_course_fallback_name', { id: course.id }),
      courseType: course.type,
      sport: course.sport,
      dateFilter: this.filterForm.value.dateFilter,
      optimizationLevel: this.filterForm.value.optimizationLevel,
      dateRange: this.filterForm.value.startDate && this.filterForm.value.endDate ? {
        start: this.filterForm.value.startDate,
        end: this.filterForm.value.endDate
      } : undefined
    };

    // Abrir modal
    const dialogRef = this.dialog.open(CourseStatisticsModalComponent, {
      width: '85vw',
      maxWidth: '1200px',
      height: '80vh',
      maxHeight: '800px',
      data: modalData,
      panelClass: 'course-statistics-modal-overlay',
      disableClose: false,
      autoFocus: false,
      restoreFocus: true,
      hasBackdrop: true,
      backdropClass: 'modal-backdrop'
    });

    // Manejar el cierre del modal
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.handleCourseModalAction(result, course);
      }
    });
  }

  private handleCourseModalAction(result: any, course: any): void {
    switch (result.action) {
      case 'export':
        this.exportSingleCourseStatistics(result.courseId, course);
        break;

      case 'refresh':
        // Refrescar datos del dashboard
        this.loadAnalyticsData();
        break;

      default:
    }
  }

  private exportSingleCourseStatistics(courseId: number, course: any): void {
    this.showMessage(this.translateService.instant('analytics_exporting_course_stats', {
      course: course.name
    }), 'info');

    const filters = {
      ...this.buildFiltersObject(),
      course_id: courseId,
      format: 'csv'
    };

    this.apiService.get(`/admin/finance/courses/${courseId}/statistics/export`, [], filters).subscribe({
      next: (response) => {
        if (response.data?.download_url) {
          window.open(response.data.download_url, '_blank');
          this.showMessage(this.translateService.instant('analytics_course_stats_exported', {
            course: course.name
          }), 'success');
        } else {
          this.showMessage(this.translateService.instant('analytics_export_error'), 'error');
        }
      },
      error: (error) => {
        console.error('Error exportando estadísticas del curso:', error);
        this.showMessage(this.translateService.instant('analytics_export_error'), 'error');
      }
    });
  }

  public exportCourseData(course: any): void {
    this.exportSingleCourseStatistics(course.id, course);
  }

// Agregar estos métodos al analytics.component.ts

  public navigateToCourseBookings(course: any): void {
    if (course?.id) {
      this.router.navigate(['/admin/bookings'], {
        queryParams: { courseId: course.id }
      });
    }
  }

  public navigateToCourseEdit(course: any): void {
    if (course?.id) {
      this.router.navigate(['/admin/courses', course.id, 'edit']);
    }
  }

// Método helper para formatear monedas
  public formatCurrency(amount: number): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return new Intl.NumberFormat(this.getLocale(), {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(0);
    }

    return new Intl.NumberFormat(this.getLocale(), {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Método helper para acortar nombres de curso largos
  private shortenCourseName(name: string): string {
    if (!name) return '';
    const maxLength = 45;
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }


// ==================== GETTERS FOR TEMPLATE ====================

  get analyticsData() {
    if (!this.dashboardData) return null;

    const kpis = this.dashboardData.executive_kpis;
    const classification = this.dashboardData.season_info.booking_classification;

    return {
      totalRevenue: kpis.revenue_expected,
      totalBookings: kpis.total_production_bookings,
      totalParticipants: kpis.total_participants,
      averageBookingValue: kpis.average_booking_value,
      collectionEfficiency: kpis.collection_efficiency,
      pendingRevenue: kpis.revenue_pending,
      paymentMethods: this.dashboardData.payment_methods?.methods || [],
      bookingSources: this.dashboardData.booking_sources?.source_breakdown || [],
      courseAnalytics: this.dashboardData.courses || [],
      revenueOverTime: this.dashboardData.trend_analysis?.monthly_breakdown || []
    };
  }

// ==================== UTILITY METHODS ====================

  public getTrend(current: number, previous?: number): 'up' | 'down' | 'stable' {
    if (!previous || previous === 0) return 'stable';
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }

  public getTrendValue(current: number, previous?: number): number {
    if (!previous || previous === 0) return 0;
    return Math.abs(((current - previous) / previous) * 100);
  }

  public getCourseTypeName(type: number): string {
    switch (type) {
      case 1: return 'collective';
      case 2: return 'private';
      case 3: return 'activity';
      default: return 'unknown';
    }
  }

  public getComparisonClass(current: number, previous?: number): string {
    const trend = this.getTrend(current, previous);
    return trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral';
  }

  public getComparisonValue(current: number, previous?: number): string {
    if (!previous || previous === 0) return this.translateService.instant('not_available');
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  }

  getTotalRevenue(): number {
    if (!this.dashboardData?.payment_methods?.total_revenue) {
      // Fallback: calcular desde el array de methods
      const methods = this.dashboardData?.payment_methods?.methods || [];
      return methods.reduce((total: number, method: any) => total + (method.revenue || 0), 0);
    }

    return this.dashboardData.payment_methods.total_revenue;
  }

  getTotalTransactions(): number {
    if (!this.dashboardData?.payment_methods?.total_payments) {
      // Fallback: calcular desde el array de methods
      const methods = this.dashboardData?.payment_methods?.methods || [];
      return methods.reduce((total: number, method: any) => total + (method.count || 0), 0);
    }

    return this.dashboardData.payment_methods.total_payments;
  }

  getMostUsedPaymentMethod(): string {
    const methods = this.dashboardData?.payment_methods?.methods || [];
    if (methods.length === 0) return this.translateService.instant('not_available');

    let maxRevenue = 0;
    let mostUsedMethod = this.translateService.instant('not_available');

    methods.forEach((method: any) => {
      if (method.revenue > maxRevenue) {
        maxRevenue = method.revenue;
        mostUsedMethod = method.display_name || this.getPaymentMethodDisplayName(method.method);
      }
    });

    return mostUsedMethod;
  }

  getMostUsedPaymentPercentage(): number {
    const methods = this.dashboardData?.payment_methods?.methods || [];
    if (methods.length === 0) return 0;

    let maxRevenuePercentage = 0;
    methods.forEach((method: any) => {
      if (method.revenue_percentage > maxRevenuePercentage) {
        maxRevenuePercentage = method.revenue_percentage;
      }
    });

    return Math.round(maxRevenuePercentage);
  }

  getPaymentMethodsArray(): any[] {
    const methods = this.dashboardData?.payment_methods?.methods || [];

    return methods.map((method: any) => ({
      key: method.method,
      display_name: method.display_name || this.getPaymentMethodDisplayName(method.method),
      revenue: method.revenue || 0,
      count: method.count || 0,
      revenue_percentage: method.revenue_percentage || 0
    }));
  }

  /**
   * Get display name for payment method
   */
  getPaymentMethodDisplayName(method: string): string {
    const keyMap: { [key: string]: string } = {
      cash: 'cash',
      card: 'card',
      online: 'online',
      vouchers: 'voucher',
      pending: 'pending',
      bank_transfer: 'bank_transfer',
      paypal: 'paypal'
    };

    const key = keyMap[method];
    if (key) {
      const translated = this.translateService.instant(key);
      if (translated && translated !== key) {
        return translated;
      }
    }

    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  /**
   * Get icon for payment method
   */
  getPaymentMethodIcon(method: string): string {
    const icons: { [key: string]: string } = {
      'cash': 'payments',
      'card': 'credit_card',
      'online': 'language',
      'vouchers': 'card_giftcard',
      'pending': 'schedule',
      'bank_transfer': 'account_balance',
      'paypal': 'payment'
    };

    return icons[method] || 'payment';
  }

  /**
   * Get CSS class for payment method icon
   */
  getPaymentMethodIconClass(method: string): string {
    return `mat-icon ${method}-icon`;
  }

  /**
   * Get CSS class for revenue bar
   */
  getPaymentMethodBarClass(method: string): string {
    return `${method}-bar`;
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    if (!value && value !== 0) return '0%';

    return new Intl.NumberFormat(this.getLocale(), {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }
}
















