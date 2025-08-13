import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SeasonContextService } from './season-context.service';
import { TokenV5Service } from './token-v5.service';
import { NotificationService } from './notification.service';
import { ApiV5Response } from '../models/api-response.interface';

// Re-export for use in other services
export { ApiV5Response } from '../models/api-response.interface';

@Injectable({ providedIn: 'root' })
export class ApiV5Service {
  private baseUrlV5 = `${environment.apiUrl}/v5`;

  constructor(
    private http: HttpClient,
    private seasonContext: SeasonContextService,
    private tokenService: TokenV5Service,
    private notification: NotificationService
  ) {}

  private getHeaders(): HttpHeaders {
    console.log('🔍 ApiV5Service.getHeaders() - DEPRECATED: This service should rely on AuthV5Interceptor for headers');
    
    // ✅ Use TokenV5Service instead of localStorage directly
    const token = this.tokenService.getCurrentToken();
    const currentSchool = this.tokenService.getCurrentSchool();
    const currentSeason = this.tokenService.getCurrentSeason();

    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('🔐 ApiV5Service: Added Authorization header (token available)');
    } else {
      console.warn('⚠️ ApiV5Service: No token available for API call');
    }
    
    // ✅ Add school context if available
    if (currentSchool) {
      headers = headers.set('X-School-ID', String(currentSchool.id));
      console.log('🏫 ApiV5Service: Added X-School-ID header:', currentSchool.id);
    } else {
      console.warn('⚠️ ApiV5Service: No school context available');
    }
    
    // ✅ Add season context if available
    if (currentSeason) {
      headers = headers.set('X-Season-ID', String(currentSeason.id));
      console.log('🗓 ApiV5Service: Added X-Season-ID header:', currentSeason.id);
    } else {
      console.warn('⚠️ ApiV5Service: No season context available');
    }
    
    return headers.set('X-Client-Version', 'boukii-admin-v5.0');
  }

  get<T>(endpoint: string, params?: any): Observable<ApiV5Response<T>> {
    console.log(`🔄 ApiV5Service.get(${endpoint}) - Headers handled by AuthV5Interceptor`);
    return this.http
      .get<ApiV5Response<T>>(`${this.baseUrlV5}/${endpoint}`, {
        params: this.addSeasonParam(params, endpoint),
      })
      .pipe(catchError((e) => this.handleError(e)), shareReplay(1));
  }

  post<T>(endpoint: string, body: any): Observable<ApiV5Response<T>> {
    // Don't add season_id to auth endpoints or seasons management
    const authEndpoints = ['auth/me', 'auth/login', 'auth/logout', 'auth/check-user', 'auth/select-school', 'auth/select-season'];
    const seasonEndpoints = ['seasons']; // ✅ AGREGADO: Excluir rutas de seasons
    const skipEndpoints = [...authEndpoints, ...seasonEndpoints];
    const shouldAddSeasonId = !skipEndpoints.some(ep => endpoint.includes(ep));
    
    console.log(`🔄 ApiV5Service.post(${endpoint}):`, {
      shouldAddSeasonId,
      hasSchoolContext: !!this.tokenService.getCurrentSchool(),
      hasSeasonContext: !!this.tokenService.getCurrentSeason()
    });
    
    // ✅ Add school_id to body when needed (ensures backend has school context)
    const currentSchool = this.tokenService.getCurrentSchool();
    let enrichedBody = { ...body };
    
    if (shouldAddSeasonId && currentSchool) {
      enrichedBody.school_id = currentSchool.id;
      console.log('🏫 ApiV5Service: Added school_id to request body:', currentSchool.id);
      
      // Also add season_id if available
      const currentSeason = this.tokenService.getCurrentSeason();
      if (currentSeason) {
        enrichedBody.season_id = currentSeason.id;
        console.log('🗓 ApiV5Service: Added season_id to request body:', currentSeason.id);
      }
    }

    return this.http
      .post<ApiV5Response<T>>(`${this.baseUrlV5}/${endpoint}`, enrichedBody)
      .pipe(catchError((e) => this.handleError(e)));
  }

  put<T>(endpoint: string, body: any): Observable<ApiV5Response<T>> {
    console.log(`🔄 ApiV5Service.put(${endpoint})`);
    
    // ✅ Check if should add season_id (don't add for seasons management)
    const seasonEndpoints = ['seasons'];
    const shouldAddSeasonId = !seasonEndpoints.some(ep => endpoint.includes(ep));
    
    // ✅ Add school_id and season_id to body when needed
    const currentSchool = this.tokenService.getCurrentSchool();
    const currentSeason = this.tokenService.getCurrentSeason();
    let enrichedBody = { ...body };
    
    if (currentSchool) {
      enrichedBody.school_id = currentSchool.id;
      console.log('🏫 ApiV5Service: Added school_id to PUT body:', currentSchool.id);
    }
    
    if (currentSeason && shouldAddSeasonId) {
      enrichedBody.season_id = currentSeason.id;
      console.log('🗓 ApiV5Service: Added season_id to PUT body:', currentSeason.id);
    } else if (!shouldAddSeasonId) {
      console.log('⏭️ ApiV5Service: Skipping season_id for seasons endpoint:', endpoint);
    }

    return this.http
      .put<ApiV5Response<T>>(`${this.baseUrlV5}/${endpoint}`, enrichedBody)
      .pipe(catchError((e) => this.handleError(e)));
  }

  patch<T>(endpoint: string, body: any): Observable<ApiV5Response<T>> {
    console.log(`🔄 ApiV5Service.patch(${endpoint})`);
    
    // ✅ Check if should add season_id (don't add for seasons management)
    const seasonEndpoints = ['seasons'];
    const shouldAddSeasonId = !seasonEndpoints.some(ep => endpoint.includes(ep));
    
    // ✅ Add school_id and season_id to body when needed
    const currentSchool = this.tokenService.getCurrentSchool();
    const currentSeason = this.tokenService.getCurrentSeason();
    let enrichedBody = { ...body };
    
    if (currentSchool) {
      enrichedBody.school_id = currentSchool.id;
      console.log('🏫 ApiV5Service: Added school_id to PATCH body:', currentSchool.id);
    }
    
    if (currentSeason && shouldAddSeasonId) {
      enrichedBody.season_id = currentSeason.id;
      console.log('🗓 ApiV5Service: Added season_id to PATCH body:', currentSeason.id);
    } else if (!shouldAddSeasonId) {
      console.log('⏭️ ApiV5Service: Skipping season_id for seasons endpoint:', endpoint);
    }

    return this.http
      .patch<ApiV5Response<T>>(`${this.baseUrlV5}/${endpoint}`, enrichedBody)
      .pipe(catchError((e) => this.handleError(e)));
  }

  delete<T>(endpoint: string, params?: any): Observable<ApiV5Response<T>> {
    console.log(`🔄 ApiV5Service.delete(${endpoint}) - Headers handled by AuthV5Interceptor`);
    return this.http
      .delete<ApiV5Response<T>>(`${this.baseUrlV5}/${endpoint}`, {
        params: this.addSeasonParam(params, endpoint),
      })
      .pipe(catchError((e) => this.handleError(e)));
  }

  // Test endpoint to verify authentication
  testAuth(): Observable<ApiV5Response<any>> {
    console.log('[ApiV5Service] Testing authentication...');
    return this.get('auth/me').pipe(
      catchError((error) => {
        console.error('[ApiV5Service] Auth test failed:', error);
        return throwError(error);
      })
    );
  }

  private addSeasonParam(params?: HttpParams, endpoint?: string): HttpParams {
    // Don't add season_id to authentication endpoints or seasons management
    const authEndpoints = ['auth/me', 'auth/login', 'auth/logout', 'auth/check-user', 'auth/select-school', 'auth/select-season'];
    const alertEndpoints = ['dashboard/alerts', 'dashboard/recent-activity'];
    const seasonEndpoints = ['seasons']; // ✅ AGREGADO: Excluir rutas de seasons
    
    const skipEndpoints = [...authEndpoints, ...alertEndpoints, ...seasonEndpoints];
    
    if (endpoint && skipEndpoints.some(ep => endpoint.includes(ep))) {
      console.log(`🔄 ApiV5Service: Skipping season params for endpoint: ${endpoint}`);
      return params || new HttpParams();
    }
    
    // ✅ Use TokenV5Service for consistency
    const currentSchool = this.tokenService.getCurrentSchool();
    const currentSeason = this.tokenService.getCurrentSeason();
    
    if (!params) {
      params = new HttpParams();
    }
    
    if (currentSchool) {
      params = params.set('school_id', currentSchool.id.toString());
      console.log('🏫 ApiV5Service: Added school_id to query params:', currentSchool.id);
    }
    
    if (currentSeason) {
      params = params.set('season_id', currentSeason.id.toString());
      console.log('🗓 ApiV5Service: Added season_id to query params:', currentSeason.id);
    }
    
    return params;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('ApiV5Service Error:', {
      status: error.status,
      message: error.message,
      url: error.url,
      error: error.error
    });

    if (error.status === 422 && (error as any).error?.season_required) {
      this.seasonContext.promptSeasonSelection();
    } else if (error.status === 0) {
      this.notification.error('Error de conexión - Verificar que el servidor esté corriendo en api-boukii.test');
    } else if (error.status === 404) {
      this.notification.error('Endpoint no encontrado - Verificar rutas de la API');
    } else if (error.status >= 500) {
      this.notification.error('Error del servidor - Verificar logs de Laravel');
    } else {
      this.notification.error(`Error ${error.status}: ${error.message}`);
    }
    
    return throwError(() => error);
  }
}
