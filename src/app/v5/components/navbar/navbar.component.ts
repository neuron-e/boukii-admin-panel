import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthV5Service } from '../../core/services/auth-v5.service';
import { SeasonContextService } from '../../core/services/season-context.service';

interface User {
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'success';
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  searchTerm = '';
  darkMode = false;

  currentUser: User | null = null;
  currentSeason: any = null;
  availableSeasons: any[] = [];
  isLoadingSeasons = false;

  notificationCount = 3;

  recentNotifications: Notification[] = [
    {
      id: '1',
      title: 'Nueva reserva',
      message: 'María González ha creado una nueva reserva para curso principiante',
      time: 'Hace 5 min',
      read: false,
      type: 'info'
    },
    {
      id: '2',
      title: 'Pago pendiente',
      message: 'Carlos Ruiz tiene un pago pendiente por €75',
      time: 'Hace 15 min',
      read: false,
      type: 'warning'
    },
    {
      id: '3',
      title: 'Reserva cancelada',
      message: 'Diego López canceló su reserva de curso avanzado',
      time: 'Hace 1 hora',
      read: false,
      type: 'error'
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthV5Service,
    private seasonContext: SeasonContextService
  ) {}

  ngOnInit(): void {
    console.log('🚀 NavbarComponent initialized');
    this.loadUserPreferences();
    this.loadUserData();
    this.loadSeasonData();

    // Check if user is authenticated, if not redirect to login
    this.checkAuthenticationAndRedirect();

    // ✅ ENHANCED: Initialize season context if authenticated
    if (this.authService.isAuthenticated()) {
      console.log('🔄 NavbarComponent: User is authenticated, ensuring season context is initialized');
      this.seasonContext.initialize().catch(error => {
        console.error('❌ NavbarComponent: Error initializing season context:', error);
      });
    }

    // Debug: Check authentication status
    setTimeout(() => {
      console.log('🔍 Debug - Current user in navbar:', this.currentUser);
      console.log('🔍 Debug - Current season in navbar:', this.currentSeason);
      console.log('🔍 Debug - Auth service authenticated:', this.authService.isAuthenticated());
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserData(): void {
    // Subscribe to user data from AuthV5Service
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user) {
            this.currentUser = {
              name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario',
              email: user.email || 'no-email@boukii.com',
              role: this.formatUserRole(user.role) || 'Usuario',
              avatar: user.avatar_url || this.getDefaultAvatar()
            };
            console.log('🔄 User data loaded in navbar:', this.currentUser);
          } else {
            console.log('🔄 No user data available in navbar - checking if should logout');
            this.currentUser = null;
            this.checkAuthenticationAndRedirect();
          }
        },
        error: (error) => {
          console.error('❌ Error loading user data in navbar:', error);
          this.currentUser = null;
          this.checkAuthenticationAndRedirect();
        }
      });
  }

  private formatUserRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'school_admin': 'Administrador de Escuela',
      'superadmin': 'Super Administrador',
      'instructor': 'Instructor',
      'staff': 'Personal',
      'student': 'Estudiante'
    };
    return roleMap[role] || role;
  }

  private getDefaultAvatar(): string {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face';
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    // Implement search logic
    console.log('Searching for:', this.searchTerm);
  }

  setLanguage(language: string): void {
    // Implement language switching
    console.log('Setting language to:', language);
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    // Implement dark mode toggle
    if (this.darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  goToProfile(): void {
    console.log('🔄 Navigating to profile');
    this.router.navigate(['/v5/profile']);
  }

  goToNotifications(): void {
    console.log('🔄 Navigating to notifications');
    this.router.navigate(['/v5/notifications']);
  }

  // Método de debug para verificar el menú
  onUserMenuClick(): void {
    console.log('🔄 User menu clicked - Current user:', this.currentUser);
  }

  // Método para mostrar información del usuario
  showUserInfo(): void {
    if (this.currentUser) {
      console.log('👤 User info:', {
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
        avatar: this.currentUser.avatar
      });
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('✅ Logout successful');
        this.router.navigate(['/v5/auth/login']);
      },
      error: (error) => {
        console.error('❌ Error during logout:', error);
        // Still navigate to login even if there's an error
        this.router.navigate(['/v5/auth/login']);
      }
    });
  }

  private checkAuthenticationAndRedirect(): void {
    if (!this.authService.isAuthenticated()) {
      console.log('🔄 User not authenticated, redirecting to login');
      this.router.navigate(['/v5/auth/login']);
    }
  }

  private loadSeasonData(): void {
    // Subscribe to current season changes
    this.seasonContext.currentSeason$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (season) => {
          this.currentSeason = season;
          
          // ✅ ENHANCED: Check if we should redirect to seasons management
          if (!season && this.authService.isAuthenticated()) {
            this.handleNoActiveSeason();
          }
        },
        error: (error) => {
          console.error('❌ Error loading season data in navbar:', error);
          this.currentSeason = null;
          
          // Also check for redirection on error
          if (this.authService.isAuthenticated()) {
            this.handleNoActiveSeason();
          }
        }
      });

    // Subscribe to available seasons
    this.seasonContext.availableSeasons$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (seasons) => {
          this.availableSeasons = seasons || [];
        },
        error: (error) => {
          console.error('❌ Error loading available seasons in navbar:', error);
          this.availableSeasons = [];
        }
      });
  }

  getSeasonStatusClass(season?: any): string {
    const targetSeason = season || this.currentSeason;
    if (!targetSeason) return 'no-season';
    
    // ✅ ENHANCED: Use proper database validation for status
    if (targetSeason.is_closed) return 'closed';
    if (targetSeason.is_historical) return 'historical';
    if (targetSeason.is_active) return 'active';
    return 'inactive';
  }

  getSeasonStatusText(season?: any): string {
    const targetSeason = season || this.currentSeason;
    if (!targetSeason) return 'Sin temporada activa';
    
    // ✅ ENHANCED: More accurate status text based on database state
    if (targetSeason.is_closed) return 'Cerrada';
    if (targetSeason.is_historical) return 'Histórica';
    if (targetSeason.is_active) return 'Activa';
    return 'Inactiva';
  }

  private loadUserPreferences(): void {
    // Load user preferences from storage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      this.darkMode = JSON.parse(savedDarkMode);
      if (this.darkMode) {
        document.body.classList.add('dark-theme');
      }
    }
  }

  /**
   * Load available seasons when season selector is opened
   */
  onSeasonMenuOpen(): void {
    if (this.availableSeasons.length === 0 && !this.isLoadingSeasons) {
      this.loadAvailableSeasons();
    }
  }

  /**
   * Load available seasons from the API
   */
  private loadAvailableSeasons(): void {
    this.isLoadingSeasons = true;
    
    this.seasonContext.reloadAvailableSeasons()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (seasons) => {
          this.availableSeasons = seasons;
          this.isLoadingSeasons = false;
          console.log('✅ Available seasons loaded for selection:', seasons.length);
        },
        error: (error) => {
          console.error('❌ Error loading available seasons:', error);
          this.isLoadingSeasons = false;
        }
      });
  }

  /**
   * Change to a different season
   */
  selectSeason(season: any): void {
    if (!season || season.id === this.currentSeason?.id) {
      return;
    }

    console.log('🔄 Changing season from', this.currentSeason?.name, 'to', season.name);
    
    this.seasonContext.changeSeason(season.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Season changed successfully to:', season.name);
          // The currentSeason will be updated automatically via the subscription
        },
        error: (error) => {
          console.error('❌ Error changing season:', error);
          // TODO: Show error message to user
        }
      });
  }

  /**
   * Check if a season is currently selected
   */
  isSeasonSelected(season: any): boolean {
    return season?.id === this.currentSeason?.id;
  }

  /**
   * Open dialog to create a new season
   */
  openCreateSeasonDialog(): void {
    console.log('🔄 Opening create season dialog');
    // TODO: Implement season creation dialog
    // For now, just navigate to season management or show a placeholder
    this.router.navigate(['/v5/seasons/new']);
  }

  /**
   * Handle case when no active season exists
   */
  private handleNoActiveSeason(): void {
    const currentUrl = this.router.url;
    
    // ✅ ENHANCED: More restrictive conditions for redirection
    const isDashboardRoute = currentUrl.includes('/dashboard') || currentUrl.includes('/welcome');
    const isNotSeasonsRoute = !currentUrl.includes('/seasons');
    const hasAvailableSeasons = this.availableSeasons.length > 0;
    
    console.log('🔍 NavbarComponent: handleNoActiveSeason check:', {
      currentUrl,
      isDashboardRoute,
      isNotSeasonsRoute,
      hasAvailableSeasons,
      currentSeason: !!this.currentSeason,
      availableSeasonsCount: this.availableSeasons.length
    });
    
    // Only redirect if:
    // 1. We're on dashboard/welcome (routes that need season context)
    // 2. We're not already on seasons page
    // 3. There are available seasons but none is set as current
    if (isDashboardRoute && isNotSeasonsRoute && hasAvailableSeasons) {
      console.log('⚠️ NavbarComponent: Dashboard route needs season but none active, redirecting to seasons');
      
      setTimeout(() => {
        console.log('🔄 NavbarComponent: Redirecting to seasons page for context selection');
        this.router.navigate(['/v5/seasons'], {
          queryParams: { reason: 'dashboard-needs-season-context' }
        });
      }, 500); // Smaller delay
    } else {
      console.log('ℹ️ NavbarComponent: No redirection needed based on current conditions');
    }
  }
}
