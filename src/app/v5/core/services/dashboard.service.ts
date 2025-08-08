import { Injectable } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, of } from 'rxjs';
import { map, shareReplay, catchError, tap } from 'rxjs/operators';
import { ApiV5Service } from './api-v5.service';
import { SeasonContextService } from './season-context.service';
import { LoggingService } from './logging.service';
import { ErrorHandlerService } from './error-handler.service';
import { ApiResponse, ApiV5Response } from '../models/api-response.interface';

export interface DashboardStats {
  bookings: BookingStats;
  clients: ClientStats;
  revenue: RevenueStats;
  courses: CourseStats;
  monitors: MonitorStats;
  weather: WeatherData;
  salesChannels: SalesChannelData[];
  dailySessions: DailySessionData[];
  todayReservations: TodayReservation[];
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  todayCount: number;
  weeklyGrowth: number;
  todayRevenue: number;
  pendingPayments: number;
}

export interface ClientStats {
  total: number;
  active: number;
  newThisMonth: number;
  vipClients: number;
  averageAge: number;
  topNationalities: string[];
}

export interface RevenueStats {
  thisMonth: number;
  lastMonth: number;
  growth: number;
  pending: number;
  dailyAverage: number;
  topPaymentMethod: string;
  totalThisSeason: number;
}

export interface CourseStats {
  active: number;
  upcoming: number;
  completedThisWeek: number;
  totalCapacity: number;
  occupancyRate: number;
  averageRating: number;
}

export interface MonitorStats {
  total: number;
  active: number;
  available: number;
  onLeave: number;
  newThisMonth: number;
  averageRating: number;
  hoursWorkedThisWeek: number;
}

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  windSpeed: number;
  humidity: number;
  visibility: number;
  forecast: DailyForecast[];
  lastUpdated: Date;
}

export interface DailyForecast {
  date: Date;
  minTemp: number;
  maxTemp: number;
  condition: string;
  precipitationChance: number;
}

export interface SalesChannelData {
  channel: string;
  bookings: number;
  revenue: number;
  percentage: number;
  growth: number;
}

export interface DailySessionData {
  date: Date;
  morningSlots: number;
  afternoonSlots: number;
  totalSessions: number;
  occupancy: number;
}

export interface TodayReservation {
  id: number;
  clientName: string;
  courseType: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'overdue';
  monitorName?: string;
}

export interface RecentActivity {
  id: string;
  type: 'booking' | 'payment' | 'client' | 'course' | 'monitor' | 'cancellation';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: any;
  actionUrl?: string;
}

export interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actionUrl?: string;
  actionLabel?: string;
  priority: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(null);
  private recentActivitySubject = new BehaviorSubject<RecentActivity[]>([]);
  private alertsSubject = new BehaviorSubject<AlertItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  dashboardStats$ = this.dashboardStatsSubject.asObservable();
  recentActivity$ = this.recentActivitySubject.asObservable();
  alerts$ = this.alertsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  constructor(
    private apiV5: ApiV5Service,
    private seasonContext: SeasonContextService,
    private logger: LoggingService,
    private errorHandler: ErrorHandlerService
  ) {}

  // ==================== MAIN DASHBOARD DATA ====================

  async loadDashboardData(seasonId?: number): Promise<DashboardStats> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    if (!targetSeasonId) {
      throw new Error('No season selected for dashboard');
    }

    this.loadingSubject.next(true);
    this.logger.info('Loading dashboard data', { seasonId: targetSeasonId });

    try {      
      // First verify authentication
      console.log('[DashboardService] Verificando autenticación...');
      await this.apiV5.testAuth().toPromise();
      console.log('[DashboardService] Autenticación verificada exitosamente');
      
      // Load all dashboard data from multiple endpoints
      
      const [
        statsResponse,
        dailySessionsResponse,
        todayReservationsResponse
      ] = await Promise.allSettled([
        this.apiV5.get<ApiV5Response<any>>(`dashboard/stats`, { season_id: targetSeasonId.toString() }).toPromise(),
        this.apiV5.get<ApiV5Response<DailySessionData[]>>(`dashboard/daily-sessions`, { season_id: targetSeasonId.toString() }).toPromise(),
        this.apiV5.get<ApiV5Response<TodayReservation[]>>(`dashboard/today-reservations`, { season_id: targetSeasonId.toString() }).toPromise()
      ]);

      // Process stats response
      let statsData = this.getEmptyDashboardData();
      if (statsResponse.status === 'fulfilled' && statsResponse.value?.success && statsResponse.value?.data) {
        const apiStats = statsResponse.value.data;
        
        // Map API response to expected dashboard stats structure
        statsData = {
          bookings: apiStats.bookings || this.getDefaultBookingStats(),
          clients: apiStats.clients || this.getDefaultClientStats(),
          revenue: apiStats.revenue || this.getDefaultRevenueStats(),
          courses: apiStats.courses || this.getDefaultCourseStats(),
          monitors: apiStats.monitors || this.getDefaultMonitorStats(),
          weather: apiStats.weather || this.getDefaultWeatherData(),
          salesChannels: apiStats.salesChannels || this.getDefaultSalesChannels(),
          dailySessions: [],
          todayReservations: []
        };
      } else if (statsResponse.status === 'rejected') {
        this.logger.error('Stats API call failed', { error: statsResponse.reason });
      }

      // Process daily sessions
      if (dailySessionsResponse.status === 'fulfilled' && dailySessionsResponse.value?.success && dailySessionsResponse.value?.data) {
        statsData.dailySessions = dailySessionsResponse.value.data;
      } else if (dailySessionsResponse.status === 'rejected') {
        this.logger.error('Daily sessions API call failed', { error: dailySessionsResponse.reason });
      }

      // Process today reservations
      if (todayReservationsResponse.status === 'fulfilled' && todayReservationsResponse.value?.success && todayReservationsResponse.value?.data) {
        statsData.todayReservations = todayReservationsResponse.value.data;
      } else if (todayReservationsResponse.status === 'rejected') {
        this.logger.error('Today reservations API call failed', { error: todayReservationsResponse.reason });
      }

      this.dashboardStatsSubject.next(statsData);
      this.logger.info('Dashboard data loaded from API', { 
        seasonId: targetSeasonId,
        bookingsCount: statsData.bookings.total,
        dailySessionsCount: statsData.dailySessions.length,
        todayReservationsCount: statsData.todayReservations.length
      });
      
      return statsData;

    } catch (error) {
      this.logger.error('Failed to load dashboard data', { seasonId: targetSeasonId, error });
      
      // Return empty data structure instead of fake data
      const emptyStats = this.getEmptyDashboardData();
      this.dashboardStatsSubject.next(emptyStats);
      return emptyStats;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  // ==================== INDIVIDUAL STAT LOADERS ====================

  async getBookingStats(seasonId?: number): Promise<BookingStats> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<BookingStats>>(`dashboard/bookings-stats`, {
          season_id: targetSeasonId?.toString() || ''
        })
        .toPromise();

      return response?.data || this.getDefaultBookingStats();

    } catch (error) {
      this.logger.error('Failed to load booking stats', { seasonId: targetSeasonId, error });
      return this.getDefaultBookingStats();
    }
  }

  async getClientStats(seasonId?: number): Promise<ClientStats> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<ClientStats>>(`dashboard/clients-stats`, {
          season_id: targetSeasonId?.toString() || ''
        })
        .toPromise();

      return response?.data || this.getDefaultClientStats();

    } catch (error) {
      this.logger.error('Failed to load client stats', { seasonId: targetSeasonId, error });
      return this.getDefaultClientStats();
    }
  }

  async getRevenueStats(seasonId?: number): Promise<RevenueStats> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<RevenueStats>>(`dashboard/revenue-stats`, {
          season_id: targetSeasonId?.toString() || ''
        })
        .toPromise();

      return response?.data || this.getDefaultRevenueStats();

    } catch (error) {
      this.logger.error('Failed to load revenue stats', { seasonId: targetSeasonId, error });
      return this.getDefaultRevenueStats();
    }
  }

  async getCourseStats(seasonId?: number): Promise<CourseStats> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<CourseStats>>(`dashboard/courses-stats`, {
          season_id: targetSeasonId?.toString() || ''
        })
        .toPromise();

      return response?.data || this.getDefaultCourseStats();

    } catch (error) {
      this.logger.error('Failed to load course stats', { seasonId: targetSeasonId, error });
      return this.getDefaultCourseStats();
    }
  }

  async getMonitorStats(seasonId?: number): Promise<MonitorStats> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<MonitorStats>>(`dashboard/monitors-stats`, {
          season_id: targetSeasonId?.toString() || ''
        })
        .toPromise();

      return response?.data || this.getDefaultMonitorStats();

    } catch (error) {
      this.logger.error('Failed to load monitor stats', { seasonId: targetSeasonId, error });
      return this.getDefaultMonitorStats();
    }
  }

  // ==================== WEATHER DATA ====================

  async getWeatherData(): Promise<WeatherData> {
    try {
      // Get current school location from season context
      const currentSeason = this.seasonContext.getCurrentSeason();
      const location = 'Madrid, Spain'; // TODO: Get from school settings when available

      const response = await this.apiV5
        .get<ApiResponse<WeatherData>>(`dashboard/weather`, {
          location: location
        })
        .toPromise();

      if (!response?.data) {
        return this.getDefaultWeatherData();
      }

      this.logger.info('Weather data loaded', { 
        location: response.data.location,
        temperature: response.data.temperature
      });

      return response.data;

    } catch (error) {
      this.logger.error('Failed to load weather data', { error });
      return this.getDefaultWeatherData();
    }
  }

  // ==================== SALES CHANNELS ====================

  async getSalesChannelData(seasonId?: number): Promise<SalesChannelData[]> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<SalesChannelData[]>>(`dashboard/sales-channels`, {
          season_id: targetSeasonId?.toString() || ''
        })
        .toPromise();

      return response?.data || this.getDefaultSalesChannels();

    } catch (error) {
      this.logger.error('Failed to load sales channel data', { seasonId: targetSeasonId, error });
      return this.getDefaultSalesChannels();
    }
  }

  // ==================== DAILY SESSIONS ====================

  async getDailySessionData(seasonId?: number, days: number = 7): Promise<DailySessionData[]> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<DailySessionData[]>>(`dashboard/daily-sessions`, {
          season_id: targetSeasonId?.toString() || '',
          days: days.toString()
        })
        .toPromise();

      return response?.data || this.getDefaultDailySessions();

    } catch (error) {
      this.logger.warn('Daily sessions endpoint not available, using mock data', { seasonId: targetSeasonId, error });
      // Use realistic mock data instead of empty data
      return this.getDefaultDailySessions();
    }
  }

  // ==================== TODAY'S RESERVATIONS ====================

  async getTodayReservations(seasonId?: number): Promise<TodayReservation[]> {
    const targetSeasonId = seasonId || this.seasonContext.getCurrentSeasonId();
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await this.apiV5
        .get<ApiResponse<TodayReservation[]>>(`dashboard/today-reservations`, {
          season_id: targetSeasonId?.toString() || '',
          date: today
        })
        .toPromise();

      return response?.data || [];

    } catch (error) {
      this.logger.error('Failed to load today reservations', { seasonId: targetSeasonId, error });
      return [];
    }
  }

  // ==================== RECENT ACTIVITY ====================

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const response = await this.apiV5
        .get<ApiV5Response<RecentActivity[]>>(`dashboard/recent-activity`, {
          limit: limit.toString()
        })
        .toPromise();

      const activities = (response?.success && response?.data) ? response.data : [];
      this.recentActivitySubject.next(activities);
      
      this.logger.info('Recent activity loaded', { count: activities.length });
      return activities;

    } catch (error) {
      this.logger.warn('Recent activity endpoint failed', { error: error.message });
      const emptyActivity: RecentActivity[] = [];
      this.recentActivitySubject.next(emptyActivity);
      return emptyActivity;
    }
  }

  // ==================== ALERTS ====================

  async getActiveAlerts(): Promise<AlertItem[]> {
    try {
      const response = await this.apiV5
        .get<ApiV5Response<AlertItem[]>>('dashboard/alerts')
        .toPromise();

      const alerts = (response?.success && response?.data) ? response.data : [];
      this.alertsSubject.next(alerts);
      
      this.logger.info('Alerts loaded', { count: alerts.length });
      return alerts;

    } catch (error) {
      this.logger.warn('Alerts endpoint failed', { error: error.message });
      const emptyAlerts: AlertItem[] = [];
      this.alertsSubject.next(emptyAlerts);
      return emptyAlerts;
    }
  }

  async dismissAlert(alertId: string): Promise<void> {
    try {
      await this.apiV5
        .delete(`dashboard/alerts/${alertId}`)
        .toPromise();

      // Update local alerts
      const currentAlerts = this.alertsSubject.value;
      const updatedAlerts = currentAlerts.filter(alert => alert.id !== alertId);
      this.alertsSubject.next(updatedAlerts);

      this.logger.info('Alert dismissed', { alertId });

    } catch (error) {
      this.logger.error('Failed to dismiss alert', { alertId, error });
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  refreshDashboard(): Promise<DashboardStats> {
    return this.loadDashboardData();
  }

  getCurrentStats(): DashboardStats | null {
    return this.dashboardStatsSubject.value;
  }

  // ==================== DEFAULT DATA (FALLBACKS) ====================

  private getDefaultBookingStats(): BookingStats {
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      todayCount: 0,
      weeklyGrowth: 0,
      todayRevenue: 0,
      pendingPayments: 0
    };
  }

  private getDefaultClientStats(): ClientStats {
    return {
      total: 0,
      active: 0,
      newThisMonth: 0,
      vipClients: 0,
      averageAge: 0,
      topNationalities: []
    };
  }

  private getDefaultRevenueStats(): RevenueStats {
    return {
      thisMonth: 0,
      lastMonth: 0,
      growth: 0,
      pending: 0,
      dailyAverage: 0,
      topPaymentMethod: 'Sin datos',
      totalThisSeason: 0
    };
  }

  private getDefaultCourseStats(): CourseStats {
    return {
      active: 0,
      upcoming: 0,
      completedThisWeek: 0,
      totalCapacity: 0,
      occupancyRate: 0,
      averageRating: 0
    };
  }

  private getDefaultMonitorStats(): MonitorStats {
    return {
      total: 0,
      active: 0,
      available: 0,
      onLeave: 0,
      newThisMonth: 0,
      averageRating: 0,
      hoursWorkedThisWeek: 0
    };
  }

  private getDefaultWeatherData(): WeatherData {
    return {
      location: 'Sin datos',
      temperature: 0,
      condition: 'partly-cloudy',
      windSpeed: 0,
      humidity: 0,
      visibility: 0,
      forecast: [],
      lastUpdated: new Date()
    };
  }

  private getDefaultSalesChannels(): SalesChannelData[] {
    return [
      { channel: 'Online', bookings: 0, revenue: 0, percentage: 0, growth: 0 },
      { channel: 'Teléfono', bookings: 0, revenue: 0, percentage: 0, growth: 0 },
      { channel: 'Presencial', bookings: 0, revenue: 0, percentage: 0, growth: 0 }
    ];
  }

  private getDefaultDailySessions(): DailySessionData[] {
    return [];
  }

  private getDefaultActivity(): RecentActivity[] {
    return [];
  }

  // ==================== EMPTY DATA METHODS ====================

  private getEmptyDashboardData(): DashboardStats {
    return {
      bookings: this.getDefaultBookingStats(),
      clients: this.getDefaultClientStats(),
      revenue: this.getDefaultRevenueStats(),
      courses: this.getDefaultCourseStats(),
      monitors: this.getDefaultMonitorStats(),
      weather: this.getDefaultWeatherData(),
      salesChannels: this.getDefaultSalesChannels(),
      dailySessions: this.getDefaultDailySessions(),
      todayReservations: []
    };
  }
}