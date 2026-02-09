import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { PermissionsService } from 'src/service/permissions.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsPermissionGuard implements CanActivate {

  constructor(private router: Router, private permissions: PermissionsService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    const user = this.permissions.getCurrentUser();

    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    if (!this.hasAnalyticsPermissions(user)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }

  private hasAnalyticsPermissions(user: any): boolean {
    if (!user) {
      return false;
    }
    if (this.permissions.isSuperadmin() || this.permissions.isAdmin()) {
      return true;
    }
    return this.permissions.hasAnyPermission(['analytics.view', 'statistics.view']);
  }
}
