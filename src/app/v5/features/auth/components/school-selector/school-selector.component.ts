import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthV5Service, SchoolInfo, CheckUserResponse } from '../../../../core/services/auth-v5.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-school-selector',
  templateUrl: './school-selector.component.html',
  styleUrls: ['./school-selector.component.scss']
})
export class SchoolSelectorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  availableSchools: SchoolInfo[] = [];
  selectedSchoolId: number | null = null;
  isLoading = false;
  error: string | null = null;
  userData: any = null;
  requiresSchoolSelection = true; // ✅ FIXED: Initialize as true since we're in school selector

  constructor(
    private authService: AuthV5Service,
    private router: Router,
    private loadingService: LoadingService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadSchoolSelectionData();
    this.subscribeToAuthState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar datos de selección de escuela desde el estado de autenticación
   */
  private loadSchoolSelectionData(): void {
    // Obtener datos temporales del localStorage o estado del servicio
    const tempData = this.authService.getTempUserData();
    
    if (tempData && tempData.schools) {
      this.userData = tempData.user;
      this.availableSchools = tempData.schools;
      console.log('📚 Loaded school selection data:', {
        user: this.userData,
        schools: this.availableSchools
      });
    } else {
      console.warn('⚠️ No temp data found, redirecting to login');
      this.router.navigate(['/v5/auth/login']);
    }
  }

  /**
   * Suscribirse a cambios en el estado de autenticación
   */
  private subscribeToAuthState(): void {
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isLoading = state.isLoading;
        this.error = state.error;
        
        console.log('🔍 SchoolSelector: Auth state changed:', {
          isAuthenticated: state.isAuthenticated,
          isLoading: state.isLoading,
          hasUser: !!state.user,
          userEmail: state.user?.email || 'N/A'
        });
        
        // ✅ FIXED: Only proceed with navigation if we've completed school selection
        // Don't navigate just because we're authenticated with temp token
        if (state.isAuthenticated && !state.isLoading && state.user && !this.requiresSchoolSelection) {
          console.log('✅ SchoolSelector: Auth state indicates success AND school selected - starting navigation process');
          this.onLoginSuccess();
        } else if (state.isAuthenticated && !state.isLoading && state.user && this.requiresSchoolSelection) {
          console.log('🔄 SchoolSelector: Authenticated but still requires school selection - staying on selector');
        }
      });
  }

  /**
   * Seleccionar una escuela
   */
  selectSchool(schoolId: number): void {
    this.selectedSchoolId = schoolId;
  }

  /**
   * Confirmar selección de escuela y completar login
   */
  confirmSchoolSelection(): void {
    if (!this.selectedSchoolId) {
      this.notificationService.showError('Por favor selecciona una escuela');
      return;
    }

    this.clearError();
    
    const schoolData = {
      school_id: this.selectedSchoolId,
      remember_me: false // TODO: Obtener de un checkbox si es necesario
    };

    console.log('🔄 Starting school selection...', schoolData);
    console.log('🔍 Current tokens:', {
      token: this.authService['tokenService'].getToken(),
      tempToken: this.authService['tokenService'].getTempToken(),
      currentToken: this.authService['tokenService'].getCurrentToken()
    });

    this.authService.selectSchool(schoolData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ SchoolSelector: School selection successful', {
            response: response,
            hasSchool: !!response.school,
            hasUser: !!response.user,
            hasToken: !!(response.token || response.access_token),
            responseKeys: response ? Object.keys(response) : 'NO_RESPONSE'
          });
          this.notificationService.showSuccess(`Acceso exitoso a ${response.school.name}`);
          
          // ✅ CRITICAL: Mark that school selection is complete
          this.requiresSchoolSelection = false;
          console.log('✅ SchoolSelector: Marked requiresSchoolSelection = false, refreshing auth state');
          
          // ✅ NEW: Force refresh auth state to sync with localStorage
          this.authService.forceRefreshAuthState();
          
          // ✅ ENHANCED: Force navigation after small delay to allow auth state refresh
          setTimeout(() => {
            console.log('🔄 SchoolSelector: Forcing navigation after school selection complete');
            this.onLoginSuccess();
          }, 300);
        },
        error: (error) => {
          console.error('❌ SchoolSelector: School selection failed', {
            error: error,
            message: error.message,
            status: error.status,
            url: error.url,
            body: error.error
          });
          console.error('❌ Full error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          this.error = error.message || 'Failed to select school';
          this.notificationService.showError(this.error);
        }
      });
  }

  /**
   * Cancelar selección y volver al login
   */
  cancelSelection(): void {
    // Limpiar datos de autenticación temporal
    this.authService.logout(false);
    this.router.navigate(['/v5/auth/login']);
  }

  /**
   * Limpiar errores
   */
  clearError(): void {
    this.error = null;
    this.authService.clearError();
  }

  /**
   * Manejar login exitoso
   */
  private onLoginSuccess(): void {
    console.log('🔄 SchoolSelector: Login success detected, waiting for token synchronization...');
    
    // ✅ ENHANCED: Verificar token con delays más largos y mejor lógica
    const checkTokenAndNavigate = (attempt: number = 1) => {
      const tokenService = this.authService['tokenService'];
      const hasValidToken = tokenService.hasValidToken();
      const currentUser = this.authService.getCurrentUser();
      const currentSchool = this.authService.getCurrentSchool();
      const rawToken = tokenService.getToken();
      
      console.log(`🔍 SchoolSelector: Verification attempt ${attempt}/10:`, {
        hasValidToken,
        hasCurrentUser: !!currentUser,
        hasSchool: !!currentSchool,
        hasRawToken: !!rawToken,
        userEmail: currentUser?.email || 'N/A',
        schoolName: currentSchool?.name || 'N/A',
        tokenLength: rawToken?.length || 0,
        tokenStart: rawToken?.substring(0, 15) + '...' || 'N/A'
      });
      
      if (hasValidToken && currentUser && currentSchool && rawToken) {
        console.log('✅ SchoolSelector: All tokens and context verified, navigating to dashboard');
        this.router.navigate(['/v5/dashboard']);
      } else if (attempt < 10) {
        // Retry up to 10 times with exponential backoff
        const delay = Math.min(attempt * 200, 1000); // Max 1000ms delay
        console.log(`⏳ SchoolSelector: Token/context not ready, retrying in ${delay}ms...`);
        setTimeout(() => checkTokenAndNavigate(attempt + 1), delay);
      } else {
        console.error('❌ SchoolSelector: Failed to verify token after 10 attempts');
        console.error('❌ SchoolSelector: Final state:', {
          hasValidToken,
          hasCurrentUser: !!currentUser,
          hasSchool: !!currentSchool,
          hasRawToken: !!rawToken
        });
        
        // Force navigation as last resort but show warning
        this.notificationService.showWarning('Redirigiendo al dashboard...');
        setTimeout(() => {
          this.router.navigate(['/v5/dashboard']);
        }, 500);
      }
    };
    
    // Start verification with initial delay to allow for token saving
    setTimeout(() => checkTokenAndNavigate(), 200);
  }

  /**
   * Obtener escuela seleccionada
   */
  getSelectedSchool(): SchoolInfo | null {
    if (!this.selectedSchoolId) return null;
    return this.availableSchools.find(school => school.id === this.selectedSchoolId) || null;
  }

  /**
   * Verificar si una escuela está seleccionada
   */
  isSchoolSelected(schoolId: number): boolean {
    return this.selectedSchoolId === schoolId;
  }
}