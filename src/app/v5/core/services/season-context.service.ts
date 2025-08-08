import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Season } from '../models/season.interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthV5Service, SeasonInfo } from './auth-v5.service';

@Injectable({ providedIn: 'root' })
export class SeasonContextService {
  private currentSeasonSubject = new BehaviorSubject<Season | null>(null);
  private availableSeasonsSubject = new BehaviorSubject<Season[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private authV5Service?: AuthV5Service;

  readonly currentSeason$ = this.currentSeasonSubject.asObservable();
  readonly availableSeasons$ = this.availableSeasonsSubject.asObservable();
  readonly seasons$ = this.availableSeasonsSubject.asObservable(); // Alias for compatibility
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(private injector: Injector, private snackBar: MatSnackBar) {
    // Don't auto-initialize - wait for explicit initialization when user is authenticated
    console.log('🔧 SeasonContextService: Constructor called - waiting for explicit initialization');
  }

  private get authV5(): AuthV5Service {
    if (!this.authV5Service) {
      this.authV5Service = this.injector.get(AuthV5Service);
    }
    return this.authV5Service;
  }


  setCurrentSeason(seasonOrId: Season | number): void {
    let season: Season | undefined;
    
    if (typeof seasonOrId === 'number') {
      // Find season by ID
      season = this.availableSeasonsSubject.value.find(s => s.id === seasonOrId);
      if (!season) {
        console.error('Season not found with ID:', seasonOrId);
        return;
      }
    } else {
      season = seasonOrId;
    }

    const previousSeason = this.currentSeasonSubject.value;
    this.currentSeasonSubject.next(season);
    localStorage.setItem('boukii_current_season', JSON.stringify(season));
    window.dispatchEvent(
      new CustomEvent('boukii-season-changed', {
        detail: { previousSeason, currentSeason: season, timestamp: Date.now() },
      })
    );
    this.snackBar.open(`Temporada cambiada a: ${season.name}`, 'OK', {
      duration: 3000,
    });
  }

  getCurrentSeasonId(): number | null {
    return this.currentSeasonSubject.value?.id || null;
  }

  getCurrentSeason(): Season | null {
    return this.currentSeasonSubject.value;
  }

  canEditCurrentSeason(): boolean {
    const season = this.getCurrentSeason();
    return !!season && !season.is_closed && !season.is_historical;
  }

  clearCurrentSeason(): void {
    this.currentSeasonSubject.next(null);
    localStorage.removeItem('boukii_current_season');
    window.dispatchEvent(
      new CustomEvent('boukii-season-cleared', {
        detail: { timestamp: Date.now() },
      })
    );
  }

  setCurrentSeasonId(seasonId: number): void {
    this.setCurrentSeason(seasonId);
  }

  promptSeasonSelection(): void {
    this.snackBar.open('Seleccione una temporada', 'OK', { duration: 3000 });
  }

  /**
   * Initialize season context when user is authenticated
   */
  async initialize(): Promise<void> {
    console.log('🔄 SeasonContextService: Starting explicit initialization...');
    return this.initializeSeasonContext();
  }

  private async initializeSeasonContext(): Promise<void> {
    console.log('🔄 SeasonContextService: Starting initialization...');
    try {
      this.loadingSubject.next(true);
      console.log('🔄 SeasonContextService: Loading available seasons...');
      await this.loadAvailableSeasons();
      console.log('🔄 SeasonContextService: Initializing current season...');
      await this.initializeCurrentSeason();
      console.log('✅ SeasonContextService: Initialization completed');
    } catch (error) {
      console.error('❌ SeasonContextService: Initialization failed:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private async loadAvailableSeasons(): Promise<void> {
    console.log('🔄 SeasonContextService: Calling AuthV5Service.getAvailableSeasons()...');
    
    // Debug authentication state before calling API
    const authService = this.authV5;
    const currentUser = authService.getCurrentUser();
    const isAuthenticated = authService.isAuthenticated();
    
    console.log('🔍 SeasonContextService: Auth state check:', {
      isAuthenticated,
      hasUser: !!currentUser,
      userEmail: currentUser?.email || 'N/A'
    });
    
    if (!isAuthenticated || !currentUser) {
      console.error('❌ SeasonContextService: User not properly authenticated, skipping season loading');
      this.availableSeasonsSubject.next([]);
      return;
    }
    
    try {
      const seasons = await this.authV5.getAvailableSeasons().toPromise();
      console.log('📊 SeasonContextService: Received seasons response:', seasons);
      
      if (seasons && seasons.length > 0) {
        // Convert SeasonInfo[] to Season[] - interfaces are compatible
        this.availableSeasonsSubject.next(seasons as Season[]);
        console.log('✅ SeasonContextService: Loaded seasons from AuthV5Service:', seasons.length, seasons);
      } else {
        console.warn('⚠️ SeasonContextService: No seasons available from AuthV5Service, response:', seasons);
        this.availableSeasonsSubject.next([]);
      }
    } catch (error) {
      console.error('❌ SeasonContextService: Error loading seasons from AuthV5Service:', error);
      console.error('❌ SeasonContextService: Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText
      });
      this.availableSeasonsSubject.next([]);
    }
  }


  private async initializeCurrentSeason(): Promise<void> {
    // First check if there's a stored season preference
    const stored = localStorage.getItem('boukii_current_season');
    if (stored) {
      try {
        const season = JSON.parse(stored);
        // Verify this season still exists in available seasons
        const exists = this.availableSeasonsSubject.value.find(s => s.id === season.id);
        if (exists) {
          this.currentSeasonSubject.next(season);
          return;
        } else {
          // Clean up invalid stored season
          localStorage.removeItem('boukii_current_season');
        }
      } catch {
        localStorage.removeItem('boukii_current_season');
      }
    }

    const seasons = this.availableSeasonsSubject.value;
    
    // 1. Check for explicitly active season
    const activeSeason = seasons.find((s) => s.is_active);
    if (activeSeason) {
      this.setCurrentSeason(activeSeason);
      return;
    }

    // 2. Find season that covers current date
    const today = new Date();
    const currentSeason = seasons.find((s) => {
      const startDate = new Date(s.start_date);
      const endDate = new Date(s.end_date);
      return today >= startDate && today <= endDate;
    });
    
    if (currentSeason) {
      this.setCurrentSeason(currentSeason);
      return;
    }

    // 3. If multiple seasons exist, use most recent one
    if (seasons.length > 1) {
      const mostRecent = [...seasons].sort(
        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
      this.setCurrentSeason(mostRecent);
      // Show selection prompt
      this.snackBar.open(`Se encontraron ${seasons.length} temporadas. Usando: ${mostRecent.name}`, 'Cambiar', {
        duration: 5000,
      });
      return;
    }

    // 4. If only one season, use it
    if (seasons.length === 1) {
      this.setCurrentSeason(seasons[0]);
      return;
    }

    // 5. No seasons available - leave current season as null
    console.warn('⚠️ No seasons available from API');
    this.currentSeasonSubject.next(null);
  }

  /**
   * Public method to reload available seasons from the API
   */
  reloadAvailableSeasons(): Observable<Season[]> {
    this.loadingSubject.next(true);
    
    return this.authV5.getAvailableSeasons().pipe(
      map((seasons: SeasonInfo[]) => {
        const convertedSeasons = seasons as Season[];
        this.availableSeasonsSubject.next(convertedSeasons);
        this.loadingSubject.next(false);
        return convertedSeasons;
      })
    );
  }

  /**
   * Change to a different season
   */
  changeSeason(seasonId: number): Observable<boolean> {
    return new Observable<boolean>(observer => {
      console.log('🔄 SeasonContextService: Attempting to change season to ID:', seasonId);
      
      // First, check if the season exists in available seasons
      const seasons = this.availableSeasonsSubject.value;
      console.log('🔍 Available seasons for selection:', seasons.map(s => ({id: s.id, name: s.name})));
      
      const targetSeason = seasons.find(s => s.id === seasonId);
      
      if (!targetSeason) {
        console.error('❌ SeasonContextService: Season ID', seasonId, 'not found in available seasons');
        console.error('❌ Available season IDs:', seasons.map(s => s.id));
        observer.error(new Error('Season not found'));
        return;
      }

      console.log('✅ SeasonContextService: Target season found:', targetSeason.name, 'ID:', targetSeason.id);

      // If it's already the current season, just complete
      const currentSeason = this.currentSeasonSubject.value;
      if (currentSeason && currentSeason.id === seasonId) {
        console.log('ℹ️ SeasonContextService: Season', seasonId, 'already selected');
        observer.next(true);
        observer.complete();
        return;
      }

      // Set the new season
      this.setCurrentSeason(targetSeason);
      
      // Show success message
      this.snackBar.open(`Temporada cambiada a: ${targetSeason.name}`, 'Cerrar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Get available seasons
   */
  getAvailableSeasons(): Season[] {
    return this.availableSeasonsSubject.value;
  }
}
