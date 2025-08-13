import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Season } from '../../../core/models/season.interface';
import { ApiV5Service } from '../../../core/services/api-v5.service';
import { SeasonContextService } from '../../../core/services/season-context.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiV5Response } from '../../../core/models/api-response.interface';

export interface CreateSeasonRequest {
  name: string;
  start_date: string;
  end_date: string;
  // school_id is automatically added by ApiV5Service
}

export interface CloneSeasonRequest {
  name: string;
  start_date: string;
  end_date: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeasonService {
  private apiV5 = inject(ApiV5Service);
  private seasonContext = inject(SeasonContextService);
  private notification = inject(NotificationService);

  private seasonsSubject = new BehaviorSubject<Season[]>([]);
  public seasons$ = this.seasonsSubject.asObservable();

  constructor() {}

  /**
   * Get all seasons for current school
   * School context is automatically handled by ApiV5Service and AuthV5Interceptor
   */
  getSeasons(): Observable<Season[]> {
    console.log('🔄 SeasonService.getSeasons: Making request to seasons endpoint');
    
    return this.apiV5.get<Season[]>('seasons').pipe(
      map((response: ApiV5Response<Season[]>) => {
        console.log('✅ SeasonService.getSeasons: Response received:', response);
        if (response.success) {
          const seasons = response.data;
          console.log('✅ SeasonService.getSeasons: Seasons loaded:', seasons.length, seasons);
          this.seasonsSubject.next(seasons);
          return seasons;
        }
        console.warn('⚠️ SeasonService.getSeasons: Response not successful:', response);
        return [];
      }),
      catchError(error => {
        console.error('❌ SeasonService.getSeasons: Error occurred:', error);
        console.error('❌ SeasonService.getSeasons: Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.notification.error('Error al cargar las temporadas');
        throw error;
      })
    );
  }

  /**
   * Get single season by ID
   */
  getSeason(id: number): Observable<Season> {
    return this.apiV5.get<Season>(`seasons/${id}`).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Season not found');
      }),
      catchError(error => {
        this.notification.error('Error al cargar la temporada');
        throw error;
      })
    );
  }

  /**
   * Get current active season for school
   * School context is automatically handled by ApiV5Service and AuthV5Interceptor
   */
  getCurrentSeason(): Observable<Season> {
    return this.apiV5.get<Season>(`seasons/current`).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Current season not found');
      }),
      catchError(error => {
        this.notification.error('No se encontró una temporada activa');
        throw error;
      })
    );
  }

  /**
   * Create new season
   */
  createSeason(seasonData: CreateSeasonRequest): Observable<Season> {
    console.log('🔄 SeasonService.createSeason called with:', seasonData);
    
    return this.apiV5.post<Season>('seasons', seasonData).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          console.log('✅ SeasonService: Season created successfully:', response.data);
          return response.data;
        }
        throw new Error('Failed to create season');
      }),
      tap(season => {
        this.notification.success('Temporada creada exitosamente');
        this.refreshSeasons();
      }),
      catchError(error => {
        console.error('❌ SeasonService: Error creating season:', error);
        this.notification.error('Error al crear la temporada');
        throw error;
      })
    );
  }

  /**
   * Update existing season
   */
  updateSeason(id: number, seasonData: Partial<Season>): Observable<Season> {
    return this.apiV5.put<Season>(`seasons/${id}`, seasonData).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to update season');
      }),
      tap(season => {
        this.notification.success('Temporada actualizada exitosamente');
        this.refreshSeasons();
      }),
      catchError(error => {
        this.notification.error('Error al actualizar la temporada');
        throw error;
      })
    );
  }

  /**
   * Delete season
   */
  deleteSeason(id: number): Observable<void> {
    return this.apiV5.delete<void>(`seasons/${id}`).pipe(
      map((response: ApiV5Response<void>) => {
        if (!response.success) {
          throw new Error('Failed to delete season');
        }
      }),
      tap(() => {
        this.notification.success('Temporada eliminada exitosamente');
        this.refreshSeasons();
      }),
      catchError(error => {
        this.notification.error('Error al eliminar la temporada');
        throw error;
      })
    );
  }

  /**
   * Activate season (set as active)
   */
  activateSeason(id: number): Observable<Season> {
    return this.apiV5.post<Season>(`seasons/${id}/activate`, {}).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to activate season');
      }),
      tap(season => {
        this.notification.success('Temporada activada exitosamente');
        this.refreshSeasons();
        // Update current season in context
        this.seasonContext.setCurrentSeason(season.id);
      }),
      catchError(error => {
        this.notification.error('Error al activar la temporada');
        throw error;
      })
    );
  }

  /**
   * Deactivate season (remove active status)
   */
  deactivateSeason(id: number): Observable<Season> {
    return this.apiV5.post<Season>(`seasons/${id}/deactivate`, {}).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to deactivate season');
      }),
      tap(season => {
        this.notification.success('Temporada desactivada exitosamente');
        this.refreshSeasons();
      }),
      catchError(error => {
        this.notification.error('Error al desactivar la temporada');
        throw error;
      })
    );
  }

  /**
   * Close season (mark as historical)
   */
  closeSeason(id: number): Observable<Season> {
    return this.apiV5.post<Season>(`seasons/${id}/close`, {}).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to close season');
      }),
      tap(season => {
        this.notification.success('Temporada cerrada exitosamente');
        this.refreshSeasons();
      }),
      catchError(error => {
        this.notification.error('Error al cerrar la temporada');
        throw error;
      })
    );
  }

  /**
   * Clone season with new dates
   */
  cloneSeason(id: number, cloneData: CloneSeasonRequest): Observable<Season> {
    return this.apiV5.post<Season>(`seasons/${id}/clone`, cloneData).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to clone season');
      }),
      tap(season => {
        this.notification.success('Temporada clonada exitosamente');
        this.refreshSeasons();
      }),
      catchError(error => {
        this.notification.error('Error al clonar la temporada');
        throw error;
      })
    );
  }

  /**
   * Reopen closed season
   */
  reopenSeason(id: number): Observable<Season> {
    return this.apiV5.post<Season>(`seasons/${id}/reopen`, {}).pipe(
      map((response: ApiV5Response<Season>) => {
        if (response.success) {
          return response.data;
        }
        throw new Error('Failed to reopen season');
      }),
      tap(season => {
        this.notification.success('Temporada reabierta exitosamente');
        this.refreshSeasons();
      }),
      catchError(error => {
        this.notification.error('Error al reabrir la temporada');
        throw error;
      })
    );
  }

  /**
   * Refresh seasons list
   */
  private refreshSeasons(): void {
    this.getSeasons().subscribe();
  }

  /**
   * Get seasons statistics
   */
  getSeasonsStats(): Observable<{
    total: number;
    active: number;
    closed: number;
    historical: number;
  }> {
    return this.seasons$.pipe(
      map(seasons => ({
        total: seasons.length,
        active: seasons.filter(s => s.is_active && !s.is_closed).length,
        closed: seasons.filter(s => s.is_closed).length,
        historical: seasons.filter(s => s.is_historical).length
      }))
    );
  }
}
