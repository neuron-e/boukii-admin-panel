import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, finalize, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { TokenV5Service, LoginResponse, UserContext } from './token-v5.service';
import { ApiV5Service, ApiV5Response } from './api-v5.service';

export interface LoginRequest {
  email: string;
  password: string;
  school_id: number;
  season_id: number;
  remember_me?: boolean;
}

export interface InitialLoginRequest {
  email: string;
  password: string;
  school_id: number;
  remember_me?: boolean;
}

export interface CheckUserRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface CheckUserResponse {
  user: UserContext;
  schools: SchoolInfo[];
  requires_school_selection: boolean;
  temp_token?: string;
}

export interface SchoolSelectionRequest {
  school_id: number;
  remember_me?: boolean;
}

export interface SchoolInfo {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  logo_url?: string; // Backward compatibility
  address?: string;
  active?: boolean;
  user_role?: string;
  can_administer?: boolean;
}

export interface SeasonSelectionRequest {
  season_id?: number;
  create_new_season?: boolean;
  new_season_data?: {
    name: string;
    start_date: string;
    end_date: string;
  };
}

export interface SeasonInfo {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current?: boolean;
  is_historical?: boolean;
}

export interface InitialLoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  requires_season_selection: boolean;
  available_seasons: SeasonInfo[];
  current_season?: SeasonInfo;
  user: TokenV5Service['getCurrentUser'] extends () => infer T ? T : any;
  school: TokenV5Service['getCurrentSchool'] extends () => infer T ? T : any;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error_code?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserContext | null;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthV5Service {
  private readonly apiUrl = `${environment.apiUrl}/v5/auth`;

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null
  });

  public authState$ = this.authStateSubject.asObservable();

  // Observable específico para el usuario actual (requerido por componentes)
  public currentUser$ = this.authStateSubject.pipe(
    map(state => state.user)
  );

  constructor(
    private http: HttpClient,
    private tokenService: TokenV5Service,
    private router: Router,
    private apiV5Service: ApiV5Service
  ) {
    this.initializeAuthState();
  }

  /**
   * Inicializar estado de autenticación desde localStorage
   */
  private initializeAuthState(): void {
    console.log('🔐 AuthV5Service: Initializing auth state...');
    
    // Force sync from localStorage first
    const hasValidToken = this.tokenService.hasValidToken(); // This will sync if needed
    const user = this.tokenService.getCurrentUser();
    const school = this.tokenService.getCurrentSchool();
    const rawToken = this.tokenService.getToken();

    const isAuthenticated = hasValidToken && !!user && !!school;

    this.updateAuthState({
      isAuthenticated,
      isLoading: false,
      user: user,
      error: null
    });

    console.log('🔐 AuthV5Service: Auth state initialized:', {
      isAuthenticated,
      user: user?.email || 'NO_USER',
      school: school?.name || 'NO_SCHOOL',
      hasToken: !!rawToken,
      hasValidToken,
      tokenLength: rawToken?.length || 0,
      tokenStart: rawToken?.substring(0, 15) + '...' || 'N/A'
    });
  }

  /**
   * Realizar login
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.updateAuthState({ ...this.getCurrentState(), isLoading: true, error: null });

    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/login`, credentials)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Login failed');
          }
          return response.data;
        }),
        tap(loginData => {
          // Guardar datos del login
          this.tokenService.saveLoginData(loginData);

          // Actualizar estado de autenticación
          this.updateAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: loginData.user,
            error: null
          });

          console.log('✅ Login successful:', {
            user: loginData.user.email,
            school: loginData.school.name,
            season: loginData.season.name
          });
        }),
        catchError(error => {
          const errorMessage = this.extractErrorMessage(error);

          this.updateAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: errorMessage
          });

          console.error('❌ Login failed:', errorMessage, error);
          return throwError(() => new Error(errorMessage));
        }),
        finalize(() => {
          // Asegurar que loading se desactive
          const currentState = this.getCurrentState();
          if (currentState.isLoading) {
            this.updateAuthState({ ...currentState, isLoading: false });
          }
        })
      );
  }

  /**
   * Realizar logout
   */
  logout(navigateToLogin = true): Observable<void> {
    this.updateAuthState({ ...this.getCurrentState(), isLoading: true });

    const token = this.tokenService.getToken();

    if (!token) {
      // Si no hay token, solo limpiar datos locales
      this.performLocalLogout(navigateToLogin);
      return of(void 0);
    }

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/logout`, {})
      .pipe(
        tap(() => {
          console.log('✅ Server logout successful');
        }),
        catchError(error => {
          console.warn('⚠ Server logout failed, proceeding with local logout:', error);
          return of({ success: true }); // Continuar con logout local
        }),
        tap(() => {
          this.performLocalLogout(navigateToLogin);
        }),
        map(() => void 0)
      );
  }

  /**
   * Logout local (limpiar datos sin llamar al servidor)
   */
  private performLocalLogout(navigateToLogin = true): void {
    this.tokenService.clearAll();

    this.updateAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null
    });

    if (navigateToLogin) {
      this.router.navigate(['/v5/auth/login']);
    }

    console.log('✅ Local logout completed');
  }

  /**
   * Obtener información del usuario actual desde el servidor
   */
  getCurrentUserInfo(): Observable<UserContext> {
    console.log('🔄 AuthV5Service: Making /me API call to fetch user info');
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/me`)
      .pipe(
        tap(response => {
          // Cast to any for flexible property access
          const flexResponse = response as any;
          console.log('🔍 AuthV5Service: Raw API response for /me:', {
            response: response,
            hasResponse: !!response,
            responseType: typeof response,
            responseKeys: response ? Object.keys(response) : 'NO_RESPONSE',
            success: response?.success,
            message: response?.message || 'NO_MESSAGE',
            hasData: !!response?.data,
            dataType: typeof response?.data,
            dataKeys: response?.data ? Object.keys(response.data) : 'NO_DATA',
            dataContent: response?.data, // ✅ Show actual data content
            hasUser: !!response?.data?.user,
            userKeys: response?.data?.user ? Object.keys(response.data.user) : 'NO_USER',
            // ✅ Check if user is directly in response
            hasDirectUser: !!flexResponse?.user,
            directUserKeys: flexResponse?.user ? Object.keys(flexResponse.user) : 'NO_DIRECT_USER'
          });
        }),
        map(response => {
          if (!response.success) {
            console.error('❌ AuthV5Service: API response indicates failure:', response.message);
            throw new Error(response.message || 'Failed to fetch user info');
          }
          
          // ✅ FLEXIBLE: Try multiple possible user locations in response
          const flexResponse = response as any;
          let user = response.data?.user || response.data || flexResponse.user || null;
          
          // ✅ If data is directly the user (no nested structure)
          if (response.data && response.data.email && !response.data.user) {
            user = response.data;
          }
          
          console.log('✅ AuthV5Service: Extracted user from API response:', {
            hasUser: !!user,
            userEmail: user?.email || 'NO_EMAIL',
            userName: user?.name || 'NO_NAME',
            userId: user?.id || 'NO_ID',
            extractionMethod: user === response.data?.user ? 'data.user' : 
                             user === response.data ? 'data' : 
                             user === flexResponse.user ? 'user' : 'none'
          });
          
          if (!user) {
            console.error('❌ AuthV5Service: No user found in any expected location');
            throw new Error('User data not found in API response');
          }
          
          return user;
        }),
        tap(user => {
          // Actualizar datos del usuario en el servicio de tokens
          this.tokenService.updateUserData(user);

          // Actualizar estado de autenticación
          this.updateAuthState({
            ...this.getCurrentState(),
            user: user
          });
        }),
        catchError(error => {
          console.error('❌ Failed to fetch user info:', error);

          // Si el token no es válido, hacer logout
          if (error.status === 401) {
            this.performLocalLogout();
          }

          return throwError(() => error);
        })
      );
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.getCurrentState().isAuthenticated;
  }

  /**
   * Verificar si se está cargando
   */
  isLoading(): boolean {
    return this.getCurrentState().isLoading;
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): UserContext | null {
    return this.getCurrentState().user;
  }

  /**
   * Obtener escuela actual
   */
  getCurrentSchool() {
    return this.tokenService.getCurrentSchool();
  }

  /**
   * Obtener temporada actual
   */
  getCurrentSeason() {
    return this.tokenService.getCurrentSeason();
  }

  /**
   * Obtener error actual
   */
  getCurrentError(): string | null {
    return this.getCurrentState().error;
  }

  /**
   * Limpiar errores
   */
  clearError(): void {
    this.updateAuthState({ ...this.getCurrentState(), error: null });
  }

  /**
   * ✅ NEW: Force refresh auth state from TokenV5Service
   * Useful after school selection when data might be out of sync
   */
  forceRefreshAuthState(): void {
    console.log('🔄 AuthV5Service: Force refreshing auth state...');
    this.initializeAuthState();
  }

  /**
   * Verificar permisos del usuario
   */
  hasPermission(permission: string): boolean {
    return this.tokenService.hasPermission(permission);
  }

  /**
   * Verificar múltiples permisos
   */
  hasAnyPermission(permissions: string[]): boolean {
    return this.tokenService.hasAnyPermission(permissions);
  }

  /**
   * Verificar rol del usuario
   */
  hasRole(role: string): boolean {
    return this.tokenService.hasRole(role);
  }

  /**
   * Verificar múltiples roles
   */
  hasAnyRole(roles: string[]): boolean {
    return this.tokenService.hasAnyRole(roles);
  }

  /**
   * Refrescar token si está próximo a expirar
   */
  refreshTokenIfNeeded(): Observable<boolean> {
    if (!this.tokenService.hasValidToken()) {
      console.log('🔄 Token invalid, logout required');
      this.performLocalLogout();
      return of(false);
    }

    const tokenInfo = this.tokenService.getTokenExpirationInfo();
    if (!tokenInfo) {
      return of(false);
    }

    // Si faltan menos de 30 minutos, refrescar obteniendo nueva info del usuario
    if (tokenInfo.minutes_remaining < 30) {
      console.log('🔄 Token expires soon, refreshing user info');
      return this.getCurrentUserInfo().pipe(
        map(() => true),
        catchError(() => {
          this.performLocalLogout();
          return of(false);
        })
      );
    }

    return of(true);
  }

  /**
   * Verificar credenciales del usuario y determinar si necesita seleccionar escuela
   */
  checkUser(credentials: CheckUserRequest): Observable<CheckUserResponse> {
    this.updateAuthState({ ...this.getCurrentState(), isLoading: true, error: null });

    return this.http.post<ApiResponse<CheckUserResponse>>(`${this.apiUrl}/check-user`, credentials)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Authentication failed');
          }
          return response.data;
        }),
        tap(data => {
          console.log('🔍 DEBUG: Received data from checkUser API:', JSON.stringify(data, null, 2));
          
          // Lógica simplificada: solo verificar número de escuelas
          if (data.requires_school_selection && data.schools && data.schools.length > 1) {
            // Usuario multi-escuela - guardar token temporal y escuelas disponibles
            if (data.temp_token) {
              console.log('💾 Saving temp token for multi-school user');
              this.tokenService.setTempToken(data.temp_token);
            }
            
            // Guardar escuelas disponibles
            localStorage.setItem('v5_temp_schools', JSON.stringify(data.schools));

            this.updateAuthState({
              isAuthenticated: false, // No autenticado hasta seleccionar escuela
              isLoading: false,
              user: data.user,
              error: null
            });

            console.log('✅ Multi-school user detected:', {
              user: data.user.email,
              schoolCount: data.schools.length,
              requiresSelection: true
            });
          } else if (!data.requires_school_selection && data.schools && data.schools.length === 1) {
            // Usuario single-escuela - guardar token temporal para auto-selección
            console.log('✅ Single school user - preparing for auto-selection:', {
              user: data.user.email,
              school: data.schools[0].name
            });

            if (data.temp_token) {
              console.log('💾 Saving temp token for single school user');
              this.tokenService.setTempToken(data.temp_token);
            }

            this.updateAuthState({
              isAuthenticated: false, // Aún necesita completar login con escuela
              isLoading: false,
              user: data.user,
              error: null
            });
          } else {
            console.error('❌ No schools found for user');
            throw new Error('User has no associated schools');
          }
        }),
        catchError(error => {
          const errorMessage = this.extractErrorMessage(error);

          this.updateAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: errorMessage
          });

          console.error('❌ Check user failed:', errorMessage, error);
          return throwError(() => new Error(errorMessage));
        }),
        finalize(() => {
          const currentState = this.getCurrentState();
          if (currentState.isLoading) {
            this.updateAuthState({ ...currentState, isLoading: false });
          }
        })
      );
  }

  /**
   * Seleccionar escuela para completar el login
   * ✅ Enhanced with automatic season detection and selection
   */
  selectSchool(schoolData: SchoolSelectionRequest): Observable<LoginResponse> {
    console.log('🔄 AuthV5Service.selectSchool called with:', schoolData);
    console.log('🔍 Current token info:', {
      hasToken: !!this.tokenService.getToken(),
      hasTempToken: !!this.tokenService.getTempToken(),
      currentToken: !!this.tokenService.getCurrentToken()
    });

    this.updateAuthState({ ...this.getCurrentState(), isLoading: true, error: null });

    // Crear headers con Authorization manual
    const token = this.tokenService.getCurrentToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('🔐 Manually adding Authorization header:', token ? `Bearer ${token.substring(0, 10)}...` : 'NO TOKEN');

    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/select-school`, schoolData, { headers })
      .pipe(
        switchMap(response => {
          console.log('✅ SelectSchool API response FULL:', {
            success: response.success,
            message: response.message,
            data: response.data,
            rawResponse: JSON.stringify(response, null, 2)
          });
          
          if (!response.success) {
            console.error('❌ Backend returned success: false', {
              message: response.message,
              fullResponse: response
            });
            throw new Error(response.message || 'School selection failed');
          }
          
          const loginData = response.data;
          console.log('🔄 Processing loginData from backend:', {
            hasLoginData: !!loginData,
            loginDataType: typeof loginData,
            loginDataKeys: loginData ? Object.keys(loginData) : 'NO_DATA',
            hasToken: !!(loginData?.token || loginData?.access_token),
            tokenField: loginData?.token ? 'token' : loginData?.access_token ? 'access_token' : 'NONE'
          });
          
          // ✅ NEW: Check if we have season data, if not, try automatic selection
          if (!loginData.season && loginData.school) {
            console.log('🔍 No season in response, attempting automatic season selection...');
            return this.autoSelectSeason(loginData);
          }
          
          console.log('🔍 CRITICAL: About to return loginData to tap(), data:', loginData);
          return of(loginData);
        }),
        tap(loginData => {
          console.log('🔍 CRITICAL: TAP OPERATOR EXECUTING - reached tap with loginData');
          console.log('🔍 AuthV5Service.selectSchool - About to save login data:', {
            loginDataType: typeof loginData,
            hasUser: !!loginData.user,
            hasSchool: !!loginData.school,
            hasSeason: !!loginData.season,
            hasToken: !!(loginData.token || loginData.access_token),
            keys: Object.keys(loginData)
          });
          
          // ✅ CRITICAL DEBUG: Check token comparison
          const tempToken = this.tokenService.getTempToken();
          const newToken = loginData.token || loginData.access_token;
          console.log('🔍 Token comparison:', {
            tempTokenExists: !!tempToken,
            newTokenExists: !!newToken,
            tokensAreDifferent: tempToken !== newToken,
            tempTokenStart: tempToken?.substring(0, 15) + '...' || 'N/A',
            newTokenStart: newToken?.substring(0, 15) + '...' || 'N/A'
          });
          
          // Guardar datos completos del login con escuela (y temporada si está disponible)
          try {
            console.log('🔄 About to call saveLoginData with:', {
              hasData: !!loginData,
              dataKeys: loginData ? Object.keys(loginData) : 'NO_DATA',
              hasUser: !!loginData?.user,
              hasSchool: !!loginData?.school, 
              hasToken: !!(loginData?.token || loginData?.access_token),
              fullData: JSON.stringify(loginData, null, 2)
            });
            
            this.tokenService.saveLoginData(loginData);
            console.log('✅ Token saved successfully after school selection');
          } catch (error) {
            console.error('❌ CRITICAL: Failed to save token after school selection:', error);
            console.error('❌ Error details:', {
              message: error.message,
              stack: error.stack,
              loginData: loginData
            });
            throw error;
          }

          // ✅ CRITICAL: Verify token was saved before clearing temp token
          const savedToken = this.tokenService.getToken();
          const originalToken = newToken;
          
          // Direct localStorage check
          const directTokenCheck = localStorage.getItem('boukii_v5_token');
          const directUserCheck = localStorage.getItem('boukii_v5_user');
          const directSchoolCheck = localStorage.getItem('boukii_v5_school');
          
          console.log('🔍 Verification: Token after save:', {
            hasSavedToken: !!savedToken,
            tokenLength: savedToken?.length || 0,
            tokenStart: savedToken?.substring(0, 15) + '...' || 'N/A',
            tokensMatch: savedToken === originalToken,
            originalTokenStart: originalToken?.substring(0, 15) + '...' || 'N/A',
            localStorageDirectCheck: {
              hasTokenInLS: !!directTokenCheck,
              hasUserInLS: !!directUserCheck,
              hasSchoolInLS: !!directSchoolCheck,
              tokenInLSStart: directTokenCheck ? JSON.parse(directTokenCheck)?.access_token?.substring(0, 15) + '...' : 'N/A'
            }
          });

          // Limpiar token temporal y datos relacionados SOLO si tenemos token normal guardado
          if (savedToken) {
            this.tokenService.clearTempToken();
            localStorage.removeItem('v5_temp_schools');
            console.log('✅ Temp token cleared after verifying normal token is saved');
          } else {
            console.error('❌ CRITICAL: Cannot clear temp token - normal token not saved!');
            throw new Error('Token saving failed - cannot proceed');
          }

          // Actualizar estado de autenticación
          this.updateAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: loginData.user,
            error: null
          });
          
          // ✅ CRITICAL: Force emit auth state after small delay to ensure components react
          setTimeout(() => {
            console.log('🔄 AuthV5Service: Force emitting auth state after school selection complete');
            this.updateAuthState({
              isAuthenticated: true,
              isLoading: false,
              user: loginData.user,
              error: null
            });
            
            // Also force refresh to ensure TokenV5Service BehaviorSubjects are in sync
            this.forceRefreshAuthState();
          }, 100);

          console.log('✅ School selection successful:', {
            user: loginData.user?.email,
            school: loginData.school?.name,
            season: loginData.season?.name || 'No season selected'
          });
        }),
        catchError(error => {
          const errorMessage = this.extractErrorMessage(error);

          console.error('❌ CRITICAL: School selection completely failed:', {
            error: error,
            errorMessage: errorMessage,
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            errorBody: error.error,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
          });

          this.updateAuthState({
            ...this.getCurrentState(),
            isLoading: false,
            error: errorMessage
          });

          console.error('❌ School selection failed:', errorMessage, error);
          return throwError(() => new Error(errorMessage));
        }),
        finalize(() => {
          const currentState = this.getCurrentState();
          if (currentState.isLoading) {
            this.updateAuthState({ ...currentState, isLoading: false });
          }
        })
      );
  }

  /**
   * ✅ NEW: Automatic season selection after school selection
   */
  private autoSelectSeason(partialLoginData: LoginResponse): Observable<LoginResponse> {
    console.log('🔄 Attempting automatic season selection...');
    
    // First, check if there's a current active season via /v5/seasons/current
    const token = this.tokenService.getCurrentToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-School-ID': partialLoginData.school?.id.toString() || ''
    });

    return this.http.get<ApiV5Response<SeasonInfo>>(`${environment.apiUrl}/v5/seasons/current`, { headers })
      .pipe(
        switchMap(seasonResponse => {
          if (seasonResponse.success && seasonResponse.data) {
            console.log('✅ Found current active season:', seasonResponse.data.name);
            
            // Enhance the login data with the found season
            const enhancedLoginData: LoginResponse = {
              ...partialLoginData,
              season: {
                id: seasonResponse.data.id,
                name: seasonResponse.data.name,
                start_date: seasonResponse.data.start_date,
                end_date: seasonResponse.data.end_date,
                is_active: seasonResponse.data.is_active,
                is_current: true
              }
            };
            
            return of(enhancedLoginData);
          } else {
            // No current season found, try to get available seasons and pick the best one
            console.log('⚠️ No current active season, checking available seasons...');
            return this.selectBestAvailableSeason(partialLoginData);
          }
        }),
        catchError(error => {
          console.log('⚠️ Error getting current season, falling back to available seasons:', error.message);
          return this.selectBestAvailableSeason(partialLoginData);
        })
      );
  }

  /**
   * ✅ NEW: Select the best available season from all seasons
   */
  private selectBestAvailableSeason(partialLoginData: LoginResponse): Observable<LoginResponse> {
    console.log('🔄 Selecting best available season from all seasons...');
    
    const token = this.tokenService.getCurrentToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-School-ID': partialLoginData.school?.id.toString() || ''
    });

    return this.http.get<ApiV5Response<SeasonInfo[]>>(`${environment.apiUrl}/v5/seasons`, { headers })
      .pipe(
        map(seasonsResponse => {
          if (!seasonsResponse.success || !seasonsResponse.data || seasonsResponse.data.length === 0) {
            console.log('⚠️ No seasons available - proceeding without season selection');
            return partialLoginData; // Return as is, user will need to create a season
          }

          const seasons = seasonsResponse.data;
          console.log(`🔍 Found ${seasons.length} available seasons:`, seasons.map(s => ({ id: s.id, name: s.name, is_active: s.is_active })));

          // Season selection logic (prioritized):
          // 1. Find explicitly active season
          let bestSeason = seasons.find(s => s.is_active);
          
          if (!bestSeason) {
            // 2. Find season that covers current date
            const today = new Date();
            bestSeason = seasons.find(s => {
              const startDate = new Date(s.start_date);
              const endDate = new Date(s.end_date);
              return today >= startDate && today <= endDate;
            });
          }
          
          if (!bestSeason && seasons.length === 1) {
            // 3. If only one season exists, use it
            bestSeason = seasons[0];
          }
          
          if (!bestSeason) {
            // 4. Use the most recent season (latest start_date)
            bestSeason = [...seasons].sort((a, b) => 
              new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            )[0];
          }

          if (bestSeason) {
            console.log('✅ Auto-selected season:', bestSeason.name);
            
            const enhancedLoginData: LoginResponse = {
              ...partialLoginData,
              season: {
                id: bestSeason.id,
                name: bestSeason.name,
                start_date: bestSeason.start_date,
                end_date: bestSeason.end_date,
                is_active: bestSeason.is_active,
                is_current: true
              }
            };
            
            return enhancedLoginData;
          } else {
            console.log('⚠️ Could not determine best season - proceeding without season');
            return partialLoginData;
          }
        }),
        catchError(error => {
          console.error('❌ Error fetching seasons for auto-selection:', error);
          console.log('⚠️ Proceeding without automatic season selection');
          return of(partialLoginData); // Continue without season
        })
      );
  }

  /**
   * Login inicial sin selección de temporada
   */
  initialLogin(credentials: InitialLoginRequest): Observable<InitialLoginResponse> {
    this.updateAuthState({ ...this.getCurrentState(), isLoading: true, error: null });

    return this.http.post<ApiResponse<InitialLoginResponse>>(`${this.apiUrl}/initial-login`, credentials)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Login failed');
          }
          return response.data;
        }),
        tap(loginData => {
          // Guardar datos del login inicial (sin temporada)
          this.tokenService.savePartialLoginData(loginData);

          // Actualizar estado de autenticación
          this.updateAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: loginData.user,
            error: null
          });

          console.log('✅ Initial login successful:', {
            user: loginData.user.email,
            school: loginData.school.name,
            requiresSeasonSelection: loginData.requires_season_selection
          });
        }),
        catchError(error => {
          const errorMessage = this.extractErrorMessage(error);

          this.updateAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: errorMessage
          });

          console.error('❌ Initial login failed:', errorMessage, error);
          return throwError(() => new Error(errorMessage));
        }),
        finalize(() => {
          // Asegurar que loading se desactive
          const currentState = this.getCurrentState();
          if (currentState.isLoading) {
            this.updateAuthState({ ...currentState, isLoading: false });
          }
        })
      );
  }

  /**
   * Seleccionar temporada después del login inicial
   */
  selectSeason(seasonData: SeasonSelectionRequest): Observable<LoginResponse> {
    this.updateAuthState({ ...this.getCurrentState(), isLoading: true, error: null });

    // Check if we need to create a new season first
    if (seasonData.create_new_season && seasonData.new_season_data) {
      console.log('🔄 Creating new season first, then selecting it');
      return this.createAndSelectSeason(seasonData);
    }

    // Regular season selection
    return this.performSeasonSelection(seasonData);
  }

  private createAndSelectSeason(seasonData: SeasonSelectionRequest): Observable<LoginResponse> {
    console.log('🔄 AuthV5Service.createAndSelectSeason - Using ApiV5Service for season creation');
    console.log('🔍 New season data:', seasonData.new_season_data);
    
    // ✅ Use ApiV5Service instead of direct HttpClient to ensure proper context injection
    return this.apiV5Service.post<any>('seasons', seasonData.new_season_data)
      .pipe(
        switchMap((createResponse: ApiV5Response<any>) => {
          if (!createResponse.success) {
            throw new Error(createResponse.message || 'Failed to create season');
          }

          console.log('✅ Season created successfully via ApiV5Service:', createResponse.data);

          // Now select the newly created season
          const selectData: SeasonSelectionRequest = {
            season_id: createResponse.data.id
          };

          return this.performSeasonSelection(selectData);
        })
      );
  }

  private performSeasonSelection(seasonData: SeasonSelectionRequest): Observable<LoginResponse> {
    const currentToken = this.tokenService.getCurrentToken();
    console.log('🔍 performSeasonSelection - currentToken:', currentToken ? currentToken.substring(0, 10) + '...' : 'null');

    const headers = {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    };

    console.log('🔍 performSeasonSelection - seasonData:', seasonData);

    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/select-season`, seasonData, { headers })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Season selection failed');
          }
          return response.data;
        }),
        tap(loginData => {
          // Guardar datos completos del login con temporada
          this.tokenService.saveLoginData(loginData);

          // Actualizar estado de autenticación
          this.updateAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: loginData.user,
            error: null
          });

          console.log('✅ Season selection successful:', {
            user: loginData.user.email,
            school: loginData.school.name,
            season: loginData.season.name
          });
        }),
        catchError(error => {
          console.error('❌ Season selection failed - Full error:', error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error body:', error.error);

          // Agregar información específica del error 422
          if (error.status === 422) {
            console.error('❌ Validation Error (422):', {
              message: error.error?.message,
              errors: error.error?.errors,
              data: error.error?.data
            });
          }

          const errorMessage = this.extractErrorMessage(error);

          this.updateAuthState({
            ...this.getCurrentState(),
            isLoading: false,
            error: errorMessage
          });

          return throwError(() => new Error(errorMessage));
        }),
        finalize(() => {
          // Asegurar que loading se desactive
          const currentState = this.getCurrentState();
          if (currentState.isLoading) {
            this.updateAuthState({ ...currentState, isLoading: false });
          }
        })
      );
  }

  /**
   * Obtener temporadas disponibles para la escuela actual
   */
  getAvailableSeasons(): Observable<SeasonInfo[]> {
    console.log('🔄 AuthV5Service: getAvailableSeasons() called');
    const currentToken = this.tokenService.getCurrentToken();
    
    console.log('🔍 AuthV5Service: Token check:', {
      hasToken: !!currentToken,
      tokenPreview: currentToken ? currentToken.substring(0, 10) + '...' : 'NO TOKEN'
    });
    
    if (!currentToken) {
      console.warn('⚠️ AuthV5Service: No token available for getAvailableSeasons');
      return throwError(() => new Error('No authentication token available'));
    }
    
    console.log('🌐 AuthV5Service: Making request via ApiV5Service with school context headers');
    
    // ✅ Use ApiV5Service instead of direct HttpClient to ensure school context headers are included
    return this.apiV5Service.get<SeasonInfo[]>('seasons')
      .pipe(
        map((response: ApiV5Response<SeasonInfo[]>) => {
          console.log('📊 AuthV5Service: Received response:', response);
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch seasons');
          }
          console.log('✅ AuthV5Service: Returning seasons data:', response.data);
          return response.data;
        }),
        catchError(error => {
          console.error('❌ AuthV5Service: Failed to fetch available seasons:', error);
          console.error('❌ AuthV5Service: Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          return throwError(() => error);
        })
      );
  }

  /**
   * Registrar acción del usuario para analytics
   */
  logUserAction(action: string, payload?: any): Observable<void> {
    const user = this.getCurrentUser();
    const school = this.tokenService.getCurrentSchool();
    const season = this.tokenService.getCurrentSeason();

    if (!user) {
      console.warn('Cannot log user action: no authenticated user');
      return of(void 0);
    }

    const logData = {
      action,
      payload: payload || {},
      user_id: user.id,
      user_email: user.email,
      school_id: school?.id,
      school_name: school?.name,
      season_id: season?.id,
      season_name: season?.name,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href
    };

    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/v5/user/logs`, logData)
      .pipe(
        tap(() => {
          console.log('📊 User action logged:', action, payload);
        }),
        catchError(error => {
          // Log de forma silenciosa - no mostrar errores al usuario
          console.warn('Failed to log user action:', error);
          return of(void 0);
        }),
        map(() => void 0)
      );
  }

  /**
   * Obtener datos temporales para selección de escuela
   */
  getTempUserData(): { user: UserContext, schools: SchoolInfo[] } | null {
    const currentUser = this.getCurrentUser();
    const tempToken = this.tokenService.getTempToken();

    // Si hay un token temporal, significa que hay datos temporales disponibles
    if (tempToken && currentUser) {
      // Get schools from stored auth response
      const storedSchools = localStorage.getItem('v5_temp_schools');
      let schools: SchoolInfo[] = [];
      
      if (storedSchools) {
        try {
          schools = JSON.parse(storedSchools);
        } catch (error) {
          console.warn('Failed to parse stored schools:', error);
        }
      }

      return {
        user: currentUser,
        schools: schools
      };
    }

    return null;
  }

  /**
   * Métodos de utilidad
   */
  private getCurrentState(): AuthState {
    return this.authStateSubject.value;
  }

  private updateAuthState(newState: Partial<AuthState>): void {
    const currentState = this.getCurrentState();
    this.authStateSubject.next({ ...currentState, ...newState });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }

    switch (error.status) {
      case 401:
        return 'Invalid credentials or session expired';
      case 403:
        return 'Access denied. Check your permissions.';
      case 422:
        return 'Invalid data provided. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      case 0:
        return 'Connection error. Please check your internet connection.';
      default:
        return `An error occurred (${error.status}). Please try again.`;
    }
  }
}
