import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { DashboardComponent } from './dashboard.component';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { SeasonContextService } from '../../core/services/season-context.service';
import { AuthV5Service } from '../../core/services/auth-v5.service';
import { NotificationService } from '../../core/services/notification.service';
import { PermissionsV5Service } from '../../core/services/permissions-v5.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: jasmine.SpyObj<DashboardService>;
  let mockSeasonContext: jasmine.SpyObj<SeasonContextService>;
  let mockAuthService: jasmine.SpyObj<AuthV5Service>;
  let mockNotifications: jasmine.SpyObj<NotificationService>;
  let mockPermissionsService: jasmine.SpyObj<PermissionsV5Service>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockDashboardStats: DashboardStats = {
    bookings: {
      total: 347,
      pending: 23,
      confirmed: 298,
      cancelled: 26,
      todayCount: 12,
      weeklyGrowth: 15.3,
      todayRevenue: 2450.00,
      pendingPayments: 5
    },
    clients: {
      total: 156,
      active: 142,  
      newThisMonth: 18,
      vipClients: 12,
      averageAge: 32.5,
      topNationalities: ['Spanish', 'French', 'German']
    },
    revenue: {
      thisMonth: 28450.00,
      lastMonth: 24200.00,
      growth: 17.6,
      pending: 3200.00,
      dailyAverage: 945.83,
      topPaymentMethod: 'Credit Card',
      totalThisSeason: 125000.00
    },
    courses: {
      active: 8,
      upcoming: 3,
      completedThisWeek: 5,
      totalCapacity: 120,
      occupancyRate: 78.5,
      averageRating: 4.7
    },
    monitors: {
      total: 15,
      active: 12,
      available: 8,
      onLeave: 2,
      newThisMonth: 1,
      averageRating: 4.6,
      hoursWorkedThisWeek: 240
    },
    weather: {
      location: 'Sierra Nevada, Spain',
      temperature: -2.5,
      condition: 'snowy',
      windSpeed: 15,
      humidity: 85,
      visibility: 8,
      forecast: [{
        date: new Date('2024-08-03'),
        minTemp: -5,
        maxTemp: 2,
        condition: 'partly-cloudy',
        precipitationChance: 20
      }],
      lastUpdated: new Date()
    },
    salesChannels: [{
      channel: 'Online',
      bookings: 195,
      revenue: 18450.00,
      percentage: 65.0,
      growth: 12.5
    }],
    dailySessions: [{
      date: new Date('2024-08-01'),
      morningSlots: 12,
      afternoonSlots: 8,
      totalSessions: 20,
      occupancy: 85.0
    }],
    todayReservations: [{
      id: 1234,
      clientName: 'María González',
      courseType: 'Curso Principiante',
      startTime: '09:00',
      endTime: '12:00',
      status: 'confirmed',
      paymentStatus: 'paid',
      monitorName: 'Carlos Ruiz'
    }]
  };

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@test.com',
    role: 'admin',
    permissions: ['bookings.create', 'clients.create', 'courses.create'],
    school: { id: 1, name: 'Test School', slug: 'test-school' }
  };

  const mockSeason = {
    id: 1,
    name: 'Test Season 2025',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    is_active: true,
    is_closed: false,
    is_historical: false,
    school_id: 1,
    created_at: '2025-01-01T00:00:00Z'
  };

  const mockPermissions = {
    canViewDashboard: true,
    canManageBookings: true,
    canManageClients: true,
    canManageCourses: true,
    canManageMonitors: true,
    canViewReports: false,
    canManageSettings: true,
    canAccessAnalytics: true,
    canViewPlanner: true,
    canManageEquipment: true,
    canManageBonuses: true,
    canManageCommunications: true,
    canManagePayments: true,
    canManageAdmins: false,
    seasonAccess: true
  };

  beforeEach(async () => {
    const dashboardServiceSpy = jasmine.createSpyObj('DashboardService', 
      ['loadDashboardData', 'getRecentActivity', 'getActiveAlerts', 'getWeatherData', 'getMonitorStats', 'dismissAlert'],
      {
        dashboardStats$: new BehaviorSubject(mockDashboardStats),
        recentActivity$: new BehaviorSubject([]),
        alerts$: new BehaviorSubject([])
      }
    );
    
    const seasonContextSpy = jasmine.createSpyObj('SeasonContextService', 
      ['getCurrentSeason', 'getAvailableSeasons', 'initialize', 'setCurrentSeason'], {
        currentSeason$: new BehaviorSubject(mockSeason),
        availableSeasons$: new BehaviorSubject([mockSeason])
      }
    );
    
    const authServiceSpy = jasmine.createSpyObj('AuthV5Service', 
      ['isAuthenticated', 'getCurrentUser', 'getCurrentSchool', 'logUserAction'], {
        currentUser$: new BehaviorSubject(mockUser)
      }
    );
    
    const permissionsServiceSpy = jasmine.createSpyObj('PermissionsV5Service', 
      ['getCurrentPermissions', 'hasAnySeasonalPermissions'], {
        permissions$: new BehaviorSubject(mockPermissions)
      }
    );
    
    const notificationsSpy = jasmine.createSpyObj('NotificationService', 
      ['showSuccess', 'showError', 'showWarning', 'showInfo']
    );
    
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        MatIconModule,
        MatButtonModule
      ],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: SeasonContextService, useValue: seasonContextSpy },
        { provide: AuthV5Service, useValue: authServiceSpy },
        { provide: PermissionsV5Service, useValue: permissionsServiceSpy },
        { provide: NotificationService, useValue: notificationsSpy },
        { provide: Router, useValue: routerSpy },
        TranslateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    
    mockDashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    mockSeasonContext = TestBed.inject(SeasonContextService) as jasmine.SpyObj<SeasonContextService>;
    mockAuthService = TestBed.inject(AuthV5Service) as jasmine.SpyObj<AuthV5Service>;
    mockPermissionsService = TestBed.inject(PermissionsV5Service) as jasmine.SpyObj<PermissionsV5Service>;
    mockNotifications = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup service spy return values
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getCurrentUser.and.returnValue(mockUser);
    mockAuthService.getCurrentSchool.and.returnValue(mockUser.school);
    mockSeasonContext.getCurrentSeason.and.returnValue(mockSeason);
    mockSeasonContext.getAvailableSeasons.and.returnValue([mockSeason]);
    mockSeasonContext.initialize.and.returnValue(Promise.resolve());
    mockPermissionsService.getCurrentPermissions.and.returnValue(mockPermissions);
    mockPermissionsService.hasAnySeasonalPermissions.and.returnValue(true);
    
    mockDashboardService.loadDashboardData.and.returnValue(Promise.resolve(mockDashboardStats));
    mockDashboardService.getRecentActivity.and.returnValue(Promise.resolve([]));
    mockDashboardService.getActiveAlerts.and.returnValue(Promise.resolve([]));
    mockDashboardService.getWeatherData.and.returnValue(Promise.resolve(mockDashboardStats.weather));
    mockDashboardService.getMonitorStats.and.returnValue(Promise.resolve(mockDashboardStats.monitors));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component correctly when user is authenticated', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockSeasonContext.initialize).toHaveBeenCalled();
    expect(component.currentUser).toEqual(jasmine.objectContaining({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email
    }));
  });

  it('should redirect to login if user is not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    
    component.ngOnInit();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/v5/auth/login']);
  });

  it('should load dashboard data on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockDashboardService.loadDashboardData).toHaveBeenCalledWith(1);
    expect(component.dashboardStats).toEqual(mockDashboardStats);
  });

  it('should filter quick actions by user permissions', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.availableActions.length).toBeGreaterThan(0);
    // Check that actions with permissions are correctly filtered
    const bookingAction = component.availableActions.find(a => a.route === '/v5/bookings');
    const reportAction = component.availableActions.find(a => a.route === '/v5/reports');
    
    expect(bookingAction).toBeDefined(); // Should be available (canManageBookings: true)
    expect(reportAction).toBeUndefined(); // Should not be available (canViewReports: false)
  });

  it('should navigate to quick action route', () => {
    const mockAction = {
      icon: 'add_circle',
      labelKey: 'DASHBOARD.QUICK_ACTIONS.NEW_BOOKING',
      route: '/v5/bookings',
      action: 'create',
      color: 'primary'
    };

    component.navigateToQuickAction(mockAction);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/v5/bookings', 'new']);
    expect(mockAuthService.logUserAction).toHaveBeenCalledWith('quick_action_clicked', jasmine.any(Object));
  });

  it('should handle season selection correctly', () => {
    const mockSeasonInfo = {
      id: 2,
      name: 'New Season',
      start_date: '2024-12-01',
      end_date: '2025-04-30',
      is_active: true,
      is_closed: false,
      is_historical: false,
      school_id: 1,
      created_at: '2024-01-01T00:00:00Z'
    };

    component.onSeasonSelected(mockSeasonInfo);

    expect(mockSeasonContext.setCurrentSeason).toHaveBeenCalledWith(mockSeasonInfo);
    expect(component.showSeasonSelector).toBe(false);
    expect(component.requiresSeasonSelection).toBe(false);
    expect(mockNotifications.showSuccess).toHaveBeenCalled();
  });

  it('should refresh dashboard data', async () => {
    spyOn(mockDashboardService, 'loadDashboardData').and.returnValue(Promise.resolve(mockDashboardStats));
    
    await component.refreshDashboard();

    expect(mockNotifications.showInfo).toHaveBeenCalled();
    expect(mockAuthService.logUserAction).toHaveBeenCalledWith('dashboard_refreshed');
  });

  it('should format currency correctly', () => {
    const result = component.formatCurrency(1234.56);
    expect(result).toBe('1.234,56 €');
  });

  it('should format percentage correctly', () => {
    expect(component.formatPercentage(15.3)).toBe('+15.3%');
    expect(component.formatPercentage(-5.2)).toBe('-5.2%');
  });

  it('should get weather icon for condition', () => {
    expect(component.getWeatherIcon('sunny')).toBe('wb_sunny');
    expect(component.getWeatherIcon('snowy')).toBe('ac_unit');
    expect(component.getWeatherIcon('unknown')).toBe('wb_sunny');
  });

  it('should calculate recent sessions correctly', () => {
    component.dashboardStats = mockDashboardStats;
    const sessions = component.recentSessions;
    
    expect(sessions.length).toBe(1);
    expect(sessions[0]).toEqual(mockDashboardStats.dailySessions[0]);
  });

  it('should handle no dashboard stats gracefully', () => {
    component.dashboardStats = null;
    
    expect(component.todayRevenue).toBe(0);
    expect(component.totalActiveUsers).toBe(0);
    expect(component.recentSessions.length).toBe(0);
  });

  it('should dismiss alert successfully', async () => {
    mockDashboardService.dismissAlert.and.returnValue(Promise.resolve());
    
    await component.dismissAlert('test-alert-id');

    expect(mockDashboardService.dismissAlert).toHaveBeenCalledWith('test-alert-id');
    expect(mockNotifications.showSuccess).toHaveBeenCalled();
    expect(mockAuthService.logUserAction).toHaveBeenCalledWith('alert_dismissed', { alertId: 'test-alert-id' });
  });

  it('should handle alert dismissal error', async () => {
    mockDashboardService.dismissAlert.and.returnValue(Promise.reject(new Error('Network error')));
    
    await component.dismissAlert('test-alert-id');

    expect(mockNotifications.showError).toHaveBeenCalled();
  });

  it('should show season selector when required', async () => {
    mockSeasonContext.getCurrentSeason.and.returnValue(null);
    component.requiresSeasonSelection = true;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showSeasonSelector).toBe(true);
  });

  it('should handle permission updates correctly', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // Simulate permission update
    const updatedPermissions = { ...mockPermissions, canManageBookings: false };
    mockPermissionsService.getCurrentPermissions.and.returnValue(updatedPermissions);
    
    // Trigger permission update by emitting new permissions
    (mockPermissionsService.permissions$ as BehaviorSubject<any>).next(updatedPermissions);
    
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.hasSeasonAccess).toBe(updatedPermissions.seasonAccess);
  });

  it('should handle weather data display correctly', () => {
    component.weatherData = mockDashboardStats.weather;
    
    expect(component.weatherTemperature).toBe('-3°C');
    expect(component.getWeatherConditionText('snowy')).toBe('Nevando');
  });

  it('should calculate client initials correctly', () => {
    expect(component.getClientInitials('María González')).toBe('MG');
    expect(component.getClientInitials('Juan Pablo Pérez García')).toBe('JP');
  });

  it('should get reservation price based on course type', () => {
    expect(component.getReservationPrice('Principiante')).toBe(85);
    expect(component.getReservationPrice('Privado Advanced')).toBe(150);
    expect(component.getReservationPrice('Unknown Type')).toBe(85);
  });
});