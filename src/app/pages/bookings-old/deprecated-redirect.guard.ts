import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';

/**
 * Guard para redirigir desde bookings-old (DEPRECATED) a bookings-v2
 * 
 * RAZÓN: bookings-old tiene 29 lugares donde sobrescribe price_total del backend,
 * causando errores en pasarela de pago (ej: reserva 5608: 192€ → 2628€).
 * 
 * Ver: ops/decisions/ADR-0001-pricing-centralization.md
 * Ver: CAMBIOS_APLICADOS_2025-11-14.md
 */
@Injectable({
  providedIn: 'root'
})
export class DeprecatedRedirectGuard implements CanActivate {
  
  constructor(private router: Router) {}
  
  canActivate(route: ActivatedRouteSnapshot): boolean {
    console.error('❌ bookings-old is DEPRECATED and should not be used.');
    console.error('Redirecting to bookings-v2...');
    console.error('Reason: Price calculation errors (see ADR-0001-pricing-centralization.md)');
    
    // Mapear rutas de bookings-old a bookings-v2
    const path = route.routeConfig?.path || '';
    const params = route.params;
    
    if (path === 'create') {
      this.router.navigate(['/bookings-v2/create']);
    } else if (path === 'update/:id' && params['id']) {
      this.router.navigate(['/bookings-v2/detail', params['id']]);
    } else if (path === 'edit/:id' && params['id']) {
      this.router.navigate(['/bookings-v2/edit', params['id']]);
    } else {
      // Listado principal
      this.router.navigate(['/bookings-v2']);
    }
    
    return false; // Bloquear navegación a bookings-old
  }
}
