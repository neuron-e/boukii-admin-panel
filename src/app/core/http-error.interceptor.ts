import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ApiErrorShape {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | string> | null;
  code?: string | number | null;
}

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let normalized: ApiErrorShape = {
          success: false,
          message: 'Unexpected error',
          errors: null,
          code: error.status,
        };

        if (error.error) {
          const e = error.error;
          normalized = {
            success: !!e.success === false,
            message: e.message || error.message || 'Unexpected error',
            errors: e.errors || null,
            code: e.code ?? error.status,
          };
        }

        // Detectar errores de autenticación (401) o no autorizado (403)
        if (error.status === 401 || (error.status === 403 && this.isUnauthenticatedMessage(normalized.message))) {
          this.handleAuthenticationError();
        }

        return throwError(() => normalized);
      })
    );
  }

  /**
   * Verifica si el mensaje indica un problema de autenticación
   */
  private isUnauthenticatedMessage(message: string): boolean {
    const authMessages = [
      'unauthenticated',
      'unauthorized',
      'token expired',
      'invalid token',
      'session expired'
    ];
    return authMessages.some(msg => message.toLowerCase().includes(msg));
  }

  /**
   * Maneja errores de autenticación: limpia el almacenamiento y redirige al login
   */
  private handleAuthenticationError(): void {
    // Limpiar localStorage
    localStorage.removeItem('boukiiToken');
    localStorage.removeItem('boukiiUser');
    localStorage.removeItem('selectedSchool');

    // Mostrar mensaje al usuario
    this.snackBar.open(
      'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      }
    );

    // Redirigir al login
    this.router.navigate(['/login']);
  }
}

