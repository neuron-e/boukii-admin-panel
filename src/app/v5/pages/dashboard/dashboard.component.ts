import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { SeasonContextService } from '../../core/services/season-context.service';
import { AuthV5Service, SeasonInfo, InitialLoginResponse } from '../../core/services/auth-v5.service';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardService, DashboardStats, RecentActivity, AlertItem, WeatherData, MonitorStats, CoursePrice } from '../../core/services/dashboard.service';
import { TranslateService } from '@ngx-translate/core';
import { PermissionsV5Service } from '../../core/services/permissions-v5.service';

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  lastLogin: Date;
  school: {
    id: number;
    name: string;
    location?: string;
  };
  permissions: string[];
  avatar?: string;
}

interface QuickAction {
  icon: string;
  labelKey: string;
  route: string;
  action: string;
  color: string;
  permission?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // User and session data
  currentUser: CurrentUser | null = null;
  currentSeason: any = null;

  // Season selection
  showSeasonSelector = false;
  availableSeasons: SeasonInfo[] = [];
  requiresSeasonSelection = false;

  // Dashboard data
  dashboardStats: DashboardStats | null = null;
  recentActivity: RecentActivity[] = [];
  criticalAlerts: AlertItem[] = [];
  weatherData: WeatherData | null = null;
  monitorStats: MonitorStats | null = null;
  
  // ✅ NEW: Cached dynamic data for synchronous access in templates
  cachedCoursePrices: CoursePrice[] = [];

  // Loading states
  loading = true;
  loadingStats = true;
  loadingActivity = true;
  loadingWeather = true;
  loadingUser = true;

  // Error states
  hasError = false;
  errorMessage = '';
  
  // Permission states
  hasSeasonAccess = true;
  hasAnyPermissions = true;

  // Quick actions with permissions
  quickActions: QuickAction[] = [
    {
      icon: 'add_circle',
      labelKey: 'DASHBOARD.QUICK_ACTIONS.NEW_BOOKING',
      route: '/v5/bookings',
      action: 'create',
      color: 'primary',
      permission: 'bookings.create'
    },
    {
      icon: 'person_add',
      labelKey: 'DASHBOARD.QUICK_ACTIONS.NEW_CLIENT',
      route: '/v5/clients',
      action: 'create',
      color: 'accent',
      permission: 'clients.create'
    },
    {
      icon: 'calendar_today',
      labelKey: 'DASHBOARD.QUICK_ACTIONS.PLANNER',
      route: '/v5/planner',
      action: 'view',
      color: 'primary',
      permission: 'planner.view'
    },
    {
      icon: 'school',
      labelKey: 'DASHBOARD.QUICK_ACTIONS.NEW_COURSE',
      route: '/v5/courses',
      action: 'create',
      color: 'accent',
      permission: 'courses.create'
    },
    {
      icon: 'assessment',
      labelKey: 'DASHBOARD.QUICK_ACTIONS.REPORTS',
      route: '/v5/reports',
      action: 'view',
      color: 'warn',
      permission: 'reports.view'
    },
    {
      icon: 'people',
      labelKey: 'DASHBOARD.QUICK_ACTIONS.MONITORS',
      route: '/v5/monitors',
      action: 'view',
      color: 'primary',
      permission: 'monitors.view'
    }
  ];

  // Filtered actions based on permissions
  availableActions: QuickAction[] = [];

  constructor(
    private router: Router,
    public seasonContext: SeasonContextService,
    private authService: AuthV5Service,
    private dashboardService: DashboardService,
    private notifications: NotificationService,
    private translate: TranslateService,
    private permissionsService: PermissionsV5Service
  ) {}

  ngOnInit(): void {
    // Initialize in proper sequence to avoid race conditions
    this.initializeComponent();
  }
  
  private async initializeComponent(): Promise<void> {
    try {
      console.log('🔄 DashboardComponent: Starting initialization...');
      
      // ✅ ENHANCED: Debug token state at dashboard entry
      const tokenService = this.authService['tokenService'];
      console.log('🔍 DashboardComponent: Token state on entry:', {
        hasToken: !!tokenService.getToken(),
        tokenValid: tokenService.hasValidToken(),
        tokenLength: tokenService.getToken()?.length || 0,
        tokenStart: tokenService.getToken()?.substring(0, 20) + '...' || 'N/A',
        hasUser: !!tokenService.getCurrentUser(),
        hasSchool: !!tokenService.getCurrentSchool(),
        hasSeason: !!tokenService.getCurrentSeason()
      });
      
      // 1. First verify user is properly authenticated
      if (!this.authService.isAuthenticated()) {
        console.error('❌ DashboardComponent: User not authenticated, redirecting to login');
        this.router.navigate(['/v5/auth/login']);
        return;
      }
      
      // 2. Verify we have a valid token
      if (!this.authService.getCurrentUser()) {
        console.error('❌ DashboardComponent: No user context available');
        this.router.navigate(['/v5/auth/login']);
        return;
      }
      
      console.log('✅ DashboardComponent: User authentication verified');
      
      // 3. Load user data 
      this.loadUserData();
      
      // 4. Explicitly initialize SeasonContextService now that user is authenticated
      console.log('🔄 DashboardComponent: Initializing SeasonContextService...');
      await this.seasonContext.initialize();
      
      // ✅ ENHANCED: Wait for season context to be fully ready
      console.log('🔄 DashboardComponent: Waiting for season context to be ready...');
      const currentSeason = this.seasonContext.getCurrentSeason();
      if (!currentSeason) {
        console.warn('⚠️ DashboardComponent: No season context after initialize - checking again');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        const retryCurrentSeason = this.seasonContext.getCurrentSeason();
        console.log('🔍 DashboardComponent: Season after retry:', retryCurrentSeason?.name || 'Still none');
      }
      
      // 5. Check season selection status after seasons are loaded
      await this.checkSeasonSelectionStatus();
      
      // 6. Load dashboard data if we have a valid season
      this.loadDashboardData();
      
      // 7. Subscribe to realtime updates
      this.subscribeToRealtimeUpdates();
      
      // 8. Subscribe to permission updates
      this.subscribeToPermissionUpdates();
      
      // 9. Load additional data only if we have a season (avoid errors)
      if (this.currentSeason) {
        this.loadAlerts();
        this.loadRecentActivity();
      }
      
      console.log('✅ DashboardComponent: Initialization completed');
      
    } catch (error) {
      console.error('❌ DashboardComponent: Error initializing:', error);
      this.handleLoadingError(error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== USER DATA LOADING ====================

  private loadUserData(): void {
    this.loadingUser = true;

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user) {
            const school = this.authService.getCurrentSchool();
            this.currentUser = {
              id: user.id,
              name: user.name || 'Usuario',
              email: user.email,
              role: user.role || 'Usuario',
              lastLogin: new Date(user.last_login_at || Date.now()),
              school: {
                id: school?.id || 0,
                name: school?.name || 'Escuela de Esquí',
                location: school?.slug
              },
              permissions: user.permissions || [],
              avatar: user.avatar_url
            };

            this.filterQuickActionsByPermissions();
            this.loadingUser = false;

            this.authService.logUserAction('dashboard_viewed', {
              userId: this.currentUser.id,
              userName: this.currentUser.name
            });
          }
        },
        error: (error) => {
          console.error('Error loading user data:', error);
          this.notifications.showError(
            this.translate.instant('DASHBOARD.ERRORS.USER_LOAD_FAILED')
          );
          this.loadingUser = false;
        }
      });
  }

  private filterQuickActionsByPermissions(): void {
    if (!this.currentUser) {
      this.availableActions = [];
      return;
    }

    const permissions = this.permissionsService.getCurrentPermissions();
    if (!permissions) {
      this.availableActions = [];
      return;
    }

    this.availableActions = this.quickActions.filter(action => {
      // If no permission specified, show it
      if (!action.permission) return true;
      
      // Check specific permissions based on route
      switch (action.route) {
        case '/v5/bookings':
          return permissions.canManageBookings;
        case '/v5/clients':
          return permissions.canManageClients;
        case '/v5/planner':
          return permissions.canViewPlanner;
        case '/v5/courses':
          return permissions.canManageCourses;
        case '/v5/reports':
          return permissions.canViewReports;
        case '/v5/monitors':
          return permissions.canManageMonitors;
        default:
          // Fallback to checking user permissions directly
          return this.currentUser!.permissions.includes(action.permission);
      }
    });
  }

  // ==================== DASHBOARD DATA LOADING ====================

  private loadDashboardData(): void {
    console.log('📊 Loading dashboard data...');
    this.loading = true;

    // Subscribe to season changes for dashboard updates
    this.seasonContext.currentSeason$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (season) => {
          console.log('📊 Dashboard received season update:', season?.name || 'None');
          this.currentSeason = season;
          if (season) {
            this.loadStatsAndActivity(season.id);
          } else {
            // Don't call handleNoSeasonSelected here - it's already handled in checkSeasonSelectionStatus
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error in dashboard season subscription:', error);
          this.notifications.showError(
            this.translate.instant('DASHBOARD.ERRORS.SEASON_LOAD_FAILED')
          );
          this.handleLoadingError(error);
        }
      });
  }

  private async loadStatsAndActivity(seasonId: number): Promise<void> {
    try {
      // Load all dashboard data in parallel
      const promises = [
        this.loadDashboardStats(seasonId),
        this.loadRecentActivity(), // Now enabled - endpoints implemented
        this.loadAlerts(),         // Now enabled - endpoints implemented
        this.loadWeatherData(),
        this.loadMonitorStats(seasonId)
      ];

      await Promise.allSettled(promises);

      // ✅ NEW: Load dynamic data to replace hardcoded values
      await Promise.allSettled([
        this.enrichTodayReservations(),
        this.loadCoursePrices()
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.handleLoadingError(error);
    } finally {
      this.loading = false;
    }
  }

  private async loadDashboardStats(seasonId: number): Promise<void> {
    this.loadingStats = true;

    try {
      this.dashboardStats = await this.dashboardService.loadDashboardData(seasonId);

      this.authService.logUserAction('dashboard_stats_loaded', {
        seasonId,
        totalBookings: this.dashboardStats.bookings.total,
        totalRevenue: this.dashboardStats.revenue.thisMonth
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      this.notifications.showError(
        this.translate.instant('DASHBOARD.ERRORS.STATS_LOAD_FAILED')
      );
    } finally {
      this.loadingStats = false;
    }
  }

  private async loadRecentActivity(): Promise<void> {
    this.loadingActivity = true;

    try {
      this.recentActivity = await this.dashboardService.getRecentActivity(10);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      this.recentActivity = [];
    } finally {
      this.loadingActivity = false;
    }
  }

  private async loadAlerts(): Promise<void> {
    try {
      this.criticalAlerts = await this.dashboardService.getActiveAlerts();

      // Show critical alerts as notifications
      this.criticalAlerts
        .filter(alert => alert.type === 'critical')
        .forEach(alert => {
          this.notifications.showError(alert.message, 10000);
        });

    } catch (error) {
      console.error('Error loading alerts:', error);
      this.criticalAlerts = [];
    }
  }

  private async loadWeatherData(): Promise<void> {
    this.loadingWeather = true;

    try {
      this.weatherData = await this.dashboardService.getWeatherData();
    } catch (error) {
      console.error('Error loading weather data:', error);
      this.weatherData = null;
    } finally {
      this.loadingWeather = false;
    }
  }

  private async loadMonitorStats(seasonId: number): Promise<void> {
    try {
      this.monitorStats = await this.dashboardService.getMonitorStats(seasonId);
    } catch (error) {
      console.error('Error loading monitor stats:', error);
      this.monitorStats = null;
    }
  }

  // ==================== PERMISSION UPDATES ====================

  private subscribeToPermissionUpdates(): void {
    this.permissionsService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permissions => {
        if (permissions) {
          this.hasSeasonAccess = permissions.seasonAccess;
          this.hasAnyPermissions = this.permissionsService.hasAnySeasonalPermissions();
          
          console.log('🔐 Permissions updated:', {
            seasonAccess: this.hasSeasonAccess,
            hasAnyPermissions: this.hasAnyPermissions
          });
          
          // Update available quick actions based on permissions
          this.filterQuickActionsByPermissions();
          
          // Show warning if user has no seasonal permissions
          if (!this.hasAnyPermissions && this.hasSeasonAccess) {
            this.notifications.showWarning(
              'Tienes acceso limitado a esta temporada. Contacta con tu administrador para obtener más permisos.'
            );
          }
        }
      });
  }

  // ==================== REALTIME UPDATES ====================

  private subscribeToRealtimeUpdates(): void {
    // Subscribe to dashboard service observables for real-time updates
    this.dashboardService.dashboardStats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        if (stats) {
          this.dashboardStats = stats;
        }
      });

    this.dashboardService.recentActivity$
      .pipe(takeUntil(this.destroy$))
      .subscribe(activity => {
        this.recentActivity = activity;
      });

    this.dashboardService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.criticalAlerts = alerts;
      });
  }

  // ==================== USER INTERACTIONS ====================

  navigateToQuickAction(action: QuickAction): void {
    this.authService.logUserAction('quick_action_clicked', {
      action: action.action,
      route: action.route,
      labelKey: action.labelKey
    });

    if (action.action === 'create') {
      // For create actions, could open modals in the future
      this.router.navigate([action.route, 'new']);
    } else {
      this.router.navigate([action.route]);
    }
  }

  navigateToAlert(alert: AlertItem): void {
    this.authService.logUserAction('alert_clicked', {
      alertId: alert.id,
      alertType: alert.type,
      actionUrl: alert.actionUrl
    });

    if (alert.actionUrl) {
      this.router.navigate([alert.actionUrl]);
    }
  }

  async dismissAlert(alertId: string): Promise<void> {
    try {
      await this.dashboardService.dismissAlert(alertId);

      this.authService.logUserAction('alert_dismissed', { alertId });

      this.notifications.showSuccess(
        this.translate.instant('DASHBOARD.MESSAGES.ALERT_DISMISSED')
      );

    } catch (error) {
      console.error('Error dismissing alert:', error);
      this.notifications.showError(
        this.translate.instant('DASHBOARD.ERRORS.ALERT_DISMISS_FAILED')
      );
    }
  }

  async refreshDashboard(): Promise<void> {
    this.authService.logUserAction('dashboard_refreshed');

    this.notifications.showInfo(
      this.translate.instant('DASHBOARD.MESSAGES.REFRESHING')
    );

    try {
      await this.loadDashboardData();

      this.notifications.showSuccess(
        this.translate.instant('DASHBOARD.MESSAGES.REFRESH_SUCCESS')
      );

    } catch (error) {
      this.notifications.showError(
        this.translate.instant('DASHBOARD.ERRORS.REFRESH_FAILED')
      );
    }
  }

  // ==================== UTILITY METHODS ====================

  getActivityIcon(type: string): string {
    const icons = {
      booking: 'event_note',
      payment: 'payment',
      client: 'person_add',
      course: 'school',
      monitor: 'person',
      cancellation: 'cancel'
    };
    return icons[type as keyof typeof icons] || 'info';
  }

  getStatusColor(status: string): string {
    const colors = {
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      info: 'text-blue-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  }

  formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return this.translate.instant('DASHBOARD.TIME.JUST_NOW');
    } else if (diffMins < 60) {
      return this.translate.instant('DASHBOARD.TIME.MINUTES_AGO', { minutes: diffMins });
    } else if (diffHours < 24) {
      return this.translate.instant('DASHBOARD.TIME.HOURS_AGO', { hours: diffHours });
    } else {
      return this.translate.instant('DASHBOARD.TIME.DAYS_AGO', { days: diffDays });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  getWeatherIcon(condition: string): string {
    const icons = {
      'sunny': 'wb_sunny',
      'partly-cloudy': 'partly_cloudy_day',
      'cloudy': 'cloud',
      'rainy': 'rainy',
      'snowy': 'ac_unit',
      'stormy': 'thunderstorm'
    };
    return icons[condition as keyof typeof icons] || 'wb_sunny';
  }

  // ==================== ERROR HANDLING ====================

  private handleLoadingError(error: any): void {
    this.hasError = true;
    this.errorMessage = this.translate.instant('DASHBOARD.ERRORS.GENERAL_ERROR');
    this.loading = false;
    this.loadingStats = false;
    this.loadingActivity = false;
    this.loadingWeather = false;
  }

  private async checkSeasonSelectionStatus(): Promise<void> {
    try {
      console.log('🔍 Checking season selection status...');
      
      // Check if we have stored season selection requirements from initial login
      const storedSeasonData = localStorage.getItem('v5_season_selection_required');
      if (storedSeasonData) {
        const seasonData: InitialLoginResponse = JSON.parse(storedSeasonData);
        if (seasonData.requires_season_selection && seasonData.available_seasons) {
          console.log('📋 Using stored season selection data');
          this.requiresSeasonSelection = true;
          this.availableSeasons = seasonData.available_seasons;
          this.showSeasonSelector = true;
          return;
        }
      }

      // Use SeasonContextService as single source of truth
      const currentSeason = this.seasonContext.getCurrentSeason();
      const availableSeasons = this.seasonContext.getAvailableSeasons();

      console.log('📊 Season context status:', {
        currentSeason: currentSeason?.name || 'None',
        availableSeasons: availableSeasons.length
      });

      if (currentSeason) {
        // We have a valid season, don't show selector
        console.log('✅ Current season found, hiding selector');
        this.showSeasonSelector = false;
        this.requiresSeasonSelection = false;
        return;
      }

      // No current season - check if we have available seasons
      if (availableSeasons.length > 0) {
        console.log('📋 No current season but seasons available, showing selector');
        this.availableSeasons = availableSeasons as SeasonInfo[];
        this.requiresSeasonSelection = true;
        this.showSeasonSelector = true;
      } else {
        console.log('⚠️ No seasons available, will show create season option');
        this.handleNoSeasonsAvailable();
      }

    } catch (error) {
      console.error('Error checking season selection status:', error);
      this.handleLoadingError(error);
    }
  }

  private async loadAvailableSeasons(): Promise<void> {
    try {
      // Use SeasonContextService as single source of truth for seasons
      const seasons = await this.seasonContext.reloadAvailableSeasons().toPromise() || [];
      this.availableSeasons = seasons as SeasonInfo[]; // Cast to maintain component interface
      
      if (this.availableSeasons.length > 0) {
        this.requiresSeasonSelection = true;
        this.showSeasonSelector = true;
        console.log('🔄 Available seasons loaded, showing selector');
      } else {
        this.handleNoSeasonsAvailable();
      }
    } catch (error) {
      console.error('❌ Error loading available seasons:', error);
      this.handleNoSeasonsAvailable();
    }
  }

  private handleNoSeasonSelected(): void {
    // Load available seasons from SeasonContextService
    this.seasonContext.availableSeasons$
      .pipe(takeUntil(this.destroy$))
      .subscribe(seasons => {
        this.availableSeasons = seasons as SeasonInfo[]; // Cast to maintain component interface
        if (seasons.length > 0) {
          this.requiresSeasonSelection = true;
          this.showSeasonSelector = true;
        } else {
          this.handleNoSeasonsAvailable();
        }
      });

    this.loading = false;
  }

  private handleNoSeasonsAvailable(): void {
    this.requiresSeasonSelection = true;
    this.availableSeasons = [];
    this.showSeasonSelector = true;

    this.notifications.showInfo(
      'No hay temporadas disponibles. Debes crear una nueva temporada para continuar.'
    );

    this.loading = false;
  }

  // ==================== GETTERS FOR TEMPLATE ====================

  get totalActiveUsers(): number {
    if (!this.dashboardStats) return 0;
    return this.dashboardStats.clients.active + (this.monitorStats?.active || 0);
  }

  get todayRevenue(): number {
    return this.dashboardStats?.bookings.todayRevenue || 0;
  }

  get weatherTemperature(): string {
    if (!this.weatherData) return '--';
    return `${Math.round(this.weatherData.temperature)}°C`;
  }

  get isDataLoaded(): boolean {
    return !this.loading && !this.loadingStats && !this.loadingUser;
  }

  get hasAlerts(): boolean {
    return this.criticalAlerts.length > 0;
  }

  get criticalAlertsCount(): number {
    return this.criticalAlerts.filter(alert => alert.type === 'critical').length;
  }

  navigateToActivityDetail(actionUrl: string): void {
    this.router.navigate([actionUrl]);
  }

  navigateToRoute(route: string): void {
    this.router.navigate([route]);
  }

  // ==================== SEASON SELECTION HANDLERS ===================

  onSeasonSelected(season: SeasonInfo): void {
    console.log('✅ Season selected from modal:', season.name);

    // Clear stored season selection data
    localStorage.removeItem('v5_season_selection_required');

    // Hide selector
    this.showSeasonSelector = false;
    this.requiresSeasonSelection = false;

    // Update SeasonContextService - this will trigger the dashboard update
    this.seasonContext.setCurrentSeason(season as any);

    this.notifications.showSuccess(
      `Temporada "${season.name}" seleccionada correctamente`
    );
  }

  onNewSeasonCreated(season: SeasonInfo): void {
    console.log('✅ New season created from modal:', season.name);

    // Clear stored season selection data
    localStorage.removeItem('v5_season_selection_required');

    // Hide selector
    this.showSeasonSelector = false;
    this.requiresSeasonSelection = false;

    // Update SeasonContextService - this will trigger the dashboard update
    // Also reload available seasons to include the new one
    this.seasonContext.setCurrentSeason(season as any);
    this.seasonContext.reloadAvailableSeasons().subscribe();

    this.notifications.showSuccess(
      `Temporada "${season.name}" creada y seleccionada correctamente`
    );
  }

  onSeasonSelectorCancelled(): void {
    console.log('🔄 Season selector cancelled');

    // For now, just hide the selector but don't load data
    // In a real app, you might want to redirect to login or show an error
    this.showSeasonSelector = false;

    this.notifications.showWarning(
      'Es necesario seleccionar una temporada para usar el dashboard'
    );
  }

  // ==================== NEW TEMPLATE METHODS ====================

  get recentSessions() {
    return this.dashboardStats?.dailySessions?.slice(-7) || [];
  }

  get displayReservations() {
    return this.dashboardStats?.todayReservations?.slice(0, 8) || [];
  }

  getWeatherConditionText(condition: string): string {
    const conditions = {
      'sunny': 'Soleado',
      'partly-cloudy': 'Parcialmente nublado',
      'cloudy': 'Nublado',
      'rainy': 'Lluvioso',
      'snowy': 'Nevando',
      'stormy': 'Tormentoso'
    };
    return conditions[condition as keyof typeof conditions] || 'Soleado';
  }

  getDayName(index: number): string {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return days[index] || 'Lun';
  }

  getReservationTypeClass(courseType: string): string {
    if (courseType.toLowerCase().includes('privado')) return 'private';
    if (courseType.toLowerCase().includes('colectivo')) return 'collective';
    return 'collective';
  }

  getReservationTypeLabel(courseType: string): string {
    if (courseType.toLowerCase().includes('privado')) return 'Privado';
    return 'Colectivo';
  }

  getClientInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getClientEmail(name: string): string {
    // ✅ NEW: Check if reservation has enriched email data first
    const reservation = this.dashboardStats?.todayReservations?.find(r => r.clientName === name);
    if (reservation && (reservation as any).clientEmail) {
      return (reservation as any).clientEmail;
    }
    
    // Fallback to generated email
    const cleanName = name.toLowerCase().replace(/\s+/g, '.');
    return `${cleanName}@example.com`; // Clear fallback indication
  }

  getStatusLabel(status: string): string {
    const labels = {
      'confirmed': 'Confirmada',
      'pending': 'Pendiente',
      'cancelled': 'Cancelada'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getReservationPrice(courseType: string): number {
    // ✅ NEW: Check if we have cached dynamic prices first
    if (this.cachedCoursePrices && this.cachedCoursePrices.length > 0) {
      const matchedPrice = this.cachedCoursePrices.find(p => 
        courseType.toLowerCase().includes(p.courseType.toLowerCase()) && p.isActive
      );
      if (matchedPrice) {
        return matchedPrice.basePrice;
      }
    }

    // Fallback to hardcoded prices
    const prices = {
      'Principiante': 85,
      'Intermedio': 45,
      'Avanzado': 95,
      'Snowboard': 110,
      'Privado': 150,
      'Freestyle': 110,
      'Paralelo': 55,
      'Fondo': 40,
      'Competición': 150
    };

    // Find matching price based on course type
    for (const [key, price] of Object.entries(prices)) {
      if (courseType.includes(key)) {
        return price;
      }
    }

    return 85; // Default price
  }

  getTodayDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short'
    };
    return `Hoy ${today.toLocaleDateString('es-ES', options)}`;
  }

  // ==================== NEW DYNAMIC DATA METHODS ====================

  /**
   * Enriquecer reservaciones de hoy con datos reales de clientes
   */
  private async enrichTodayReservations(): Promise<void> {
    try {
      if (!this.dashboardStats?.todayReservations?.length) {
        console.log('📋 No today reservations to enrich');
        return;
      }

      console.log('🔄 Enriching today reservations with real client data...');
      
      const enrichedReservations = await this.dashboardService.enrichReservationsWithClientData(
        this.dashboardStats.todayReservations
      );

      // Update dashboard stats with enriched reservations
      if (this.dashboardStats) {
        this.dashboardStats.todayReservations = enrichedReservations;
        console.log('✅ Today reservations enriched with client emails');
      }

    } catch (error) {
      console.error('❌ Failed to enrich today reservations:', error);
    }
  }

  /**
   * Cargar precios de cursos dinámicos para reemplazar valores hardcodeados
   */
  private async loadCoursePrices(): Promise<void> {
    try {
      console.log('🔄 Loading dynamic course prices...');
      
      const seasonId = this.currentSeason?.id;
      const coursePrices = await this.dashboardService.getCoursePrices(seasonId);
      
      this.cachedCoursePrices = coursePrices;
      console.log('✅ Course prices loaded:', {
        count: coursePrices.length,
        prices: coursePrices.map(p => `${p.courseType}: €${p.basePrice}`)
      });

    } catch (error) {
      console.error('❌ Failed to load course prices:', error);
      this.cachedCoursePrices = []; // Reset to use fallback
    }
  }
}