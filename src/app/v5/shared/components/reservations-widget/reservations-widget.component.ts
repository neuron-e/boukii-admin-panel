import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { SeasonContextService } from '../../../core/services/season-context.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

interface BookingData {
  summary: {
    total: number;
    todayCount: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    todayRevenue: number;
  };
  timeline: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  recentBookings: Array<{
    id: number;
    clientName: string;
    clientEmail?: string;
    courseType: string;
    monitorName: string;
    startTime: string;
    status: string;
    amount: number;
  }>;
  comparison: {
    previousMonth: number;
    growth: number;
    weeklyAverage: number;
  };
}

@Component({
  selector: 'app-reservations-widget',
  templateUrl: './reservations-widget.component.html',
  styleUrls: ['./reservations-widget.component.scss']
})
export class ReservationsWidgetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private refreshInterval?: any;

  // Data
  bookingsData$ = new BehaviorSubject<BookingData | null>(null);
  currentPeriod = 'month'; // today, week, month
  
  // Loading states
  loading = true;
  error: string | null = null;
  lastUpdated: Date | null = null;

  // UI states
  showComparison = true;
  animateChanges = true;

  constructor(
    private seasonContext: SeasonContextService,
    private dashboardService: DashboardService,
    private notifications: NotificationService,
    private translate: TranslateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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
    console.log('🔄 ReservationsWidget: Initializing...');

    // Subscribe to season context changes
    this.seasonContext.currentSeason$
      .pipe(takeUntil(this.destroy$))
      .subscribe(season => {
        if (season) {
          console.log('📊 ReservationsWidget: Loading data for season:', season.name);
          this.loadBookingsData();
        } else {
          this.handleNoSeason();
        }
      });
  }

  private setupAutoRefresh(): void {
    // Refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      if (!this.loading) {
        this.loadBookingsData(false); // Silent refresh
      }
    }, 5 * 60 * 1000);
  }

  private clearAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  // ==================== DATA LOADING ====================

  async loadBookingsData(showLoading = true): Promise<void> {
    if (showLoading) {
      this.loading = true;
      this.error = null;
    }

    try {
      const currentSeason = this.seasonContext.getCurrentSeason();
      if (!currentSeason) {
        throw new Error('No hay temporada seleccionada');
      }

      // Call the dashboard service to get bookings data
      const params = {
        period: this.currentPeriod,
        season_id: currentSeason.id,
        school_id: currentSeason.school_id
      };

      console.log('📊 ReservationsWidget: Fetching bookings data with params:', params);

      // Use the dashboard service bookings endpoint
      const response = await this.dashboardService.getBookingsData(params);
      
      if (response?.success && response?.data) {
        const bookingsData: BookingData = {
          summary: {
            total: response.data.summary?.total || 0,
            todayCount: response.data.summary?.today || 0,
            confirmed: response.data.summary?.confirmed || 0,
            pending: response.data.summary?.pending || 0,
            cancelled: response.data.summary?.cancelled || 0,
            todayRevenue: response.data.summary?.todayRevenue || 0
          },
          timeline: response.data.timeline || [],
          statusDistribution: response.data.statusDistribution || [],
          recentBookings: response.data.recentBookings?.map((booking: any) => ({
            id: booking.id,
            clientName: booking.clientName || booking.client_name || 'Cliente',
            clientEmail: booking.clientEmail || booking.client_email,
            courseType: booking.courseType || booking.course_type || booking.course?.name || 'Curso',
            monitorName: booking.monitorName || booking.monitor_name || booking.monitor?.name || 'Sin asignar',
            startTime: booking.startTime || booking.start_time || booking.time || '--:--',
            status: booking.status || 'pending',
            amount: booking.amount || booking.price || booking.total_price || 0
          })) || [],
          comparison: {
            previousMonth: response.data.comparison?.previousMonth || 0,
            growth: response.data.comparison?.growth || 0,
            weeklyAverage: response.data.comparison?.weeklyAverage || 0
          }
        };

        this.bookingsData$.next(bookingsData);
        this.lastUpdated = new Date();
        console.log('✅ ReservationsWidget: Data loaded successfully:', {
          total: bookingsData.summary.total,
          today: bookingsData.summary.todayCount,
          revenue: bookingsData.summary.todayRevenue
        });

      } else {
        throw new Error(response?.message || 'Error al cargar datos de reservas');
      }

    } catch (error: any) {
      console.error('❌ ReservationsWidget: Error loading bookings data:', error);
      
      this.error = error.message || 'Error al cargar las reservas';
      
      if (showLoading) {
        this.notifications.showError(
          this.translate.instant('DASHBOARD.ERRORS.BOOKINGS_LOAD_FAILED')
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
    console.warn('⚠️ ReservationsWidget: No season available');
    this.loading = false;
    this.error = 'Selecciona una temporada para ver las reservas';
    this.bookingsData$.next(null);
  }

  private provideFallbackData(): void {
    console.log('🔄 ReservationsWidget: Providing fallback data');
    
    const fallbackData: BookingData = {
      summary: {
        total: 156,
        todayCount: 8,
        confirmed: 142,
        pending: 12,
        cancelled: 2,
        todayRevenue: 1240
      },
      timeline: [
        { date: '2024-12-01', count: 15, revenue: 1850 },
        { date: '2024-12-02', count: 12, revenue: 1420 },
        { date: '2024-12-03', count: 18, revenue: 2100 },
        { date: '2024-12-04', count: 8, revenue: 950 },
        { date: '2024-12-05', count: 22, revenue: 2650 },
        { date: '2024-12-06', count: 16, revenue: 1980 },
        { date: '2024-12-07', count: 14, revenue: 1680 }
      ],
      statusDistribution: [
        { status: 'confirmed', count: 142, percentage: 91.0 },
        { status: 'pending', count: 12, percentage: 7.7 },
        { status: 'cancelled', count: 2, percentage: 1.3 }
      ],
      recentBookings: [
        {
          id: 1203,
          clientName: 'Marie Dubois',
          clientEmail: 'marie.dubois@example.ch',
          courseType: 'Esquí Avanzado',
          monitorName: 'Jean-Pierre Martin',
          startTime: '10:00',
          status: 'confirmed',
          amount: 95
        },
        {
          id: 1204,
          clientName: 'Klaus Weber',
          clientEmail: 'klaus.weber@bluewin.ch',
          courseType: 'Snowboard Intermedio',
          monitorName: 'Sophie Müller',
          startTime: '14:00',
          status: 'pending',
          amount: 85
        },
        {
          id: 1205,
          clientName: 'Anna Rossi',
          clientEmail: 'anna.rossi@sunrise.ch',
          courseType: 'Esquí Principiante',
          monitorName: 'Marc Dubois',
          startTime: '09:00',
          status: 'confirmed',
          amount: 75
        }
      ],
      comparison: {
        previousMonth: 134,
        growth: 16.4,
        weeklyAverage: 18.2
      }
    };

    this.bookingsData$.next(fallbackData);
  }

  // ==================== UI INTERACTIONS ====================

  onPeriodChange(period: string): void {
    if (this.currentPeriod !== period) {
      this.currentPeriod = period;
      console.log('📊 ReservationsWidget: Period changed to:', period);
      this.loadBookingsData();
    }
  }

  async onRefresh(): Promise<void> {
    console.log('🔄 ReservationsWidget: Manual refresh triggered');
    await this.loadBookingsData();
    
    this.notifications.showSuccess(
      this.translate.instant('DASHBOARD.MESSAGES.BOOKINGS_REFRESHED')
    );
  }

  onViewAllBookings(): void {
    console.log('📊 ReservationsWidget: Navigating to bookings list');
    this.router.navigate(['/v5/bookings']);
  }

  onViewBookingDetail(bookingId: number): void {
    console.log('📊 ReservationsWidget: Navigating to booking detail:', bookingId);
    this.router.navigate(['/v5/bookings', bookingId]);
  }

  onCreateNewBooking(): void {
    console.log('📊 ReservationsWidget: Navigating to create new booking');
    this.router.navigate(['/v5/bookings/new']);
  }

  // ==================== TEMPLATE HELPERS ====================

  get currentData(): BookingData | null {
    return this.bookingsData$.value;
  }

  get hasData(): boolean {
    const data = this.currentData;
    return !!data && data.summary.total > 0;
  }

  get growthDirection(): 'up' | 'down' | 'neutral' {
    const growth = this.currentData?.comparison.growth || 0;
    if (growth > 0) return 'up';
    if (growth < 0) return 'down';
    return 'neutral';
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

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'confirmed': 'Confirmada',
      'pending': 'Pendiente',
      'cancelled': 'Cancelada',
      'completed': 'Completada'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getPeriodLabel(period: string): string {
    const labels: { [key: string]: string } = {
      'today': 'Hoy',
      'week': 'Semana',
      'month': 'Mes'
    };
    return labels[period] || period;
  }

  getClientInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  trackByBookingId(index: number, booking: any): number {
    return booking.id;
  }

  getMaxTimelineValue(): number {
    const timeline = this.currentData?.timeline || [];
    if (timeline.length === 0) return 1;
    
    return Math.max(...timeline.map(day => day.count));
  }

  getDayLabel(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es', { weekday: 'short' });
    }
  }
}