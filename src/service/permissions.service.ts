import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  getCurrentUser(): any {
    const userStr = localStorage.getItem('boukiiUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  getPermissions(): string[] {
    const user = this.getCurrentUser();
    return (user?.permissions ?? user?.permission_names ?? []) as string[];
  }

  getRoles(): string[] {
    const user = this.getCurrentUser();
    return (user?.role_names ?? user?.roles ?? []) as string[];
  }

  hasPermission(permission: string): boolean {
    if (this.isSuperadmin()) {
      return true;
    }
    const permissions = this.getPermissions();
    if (!environment.permissionsStrict && !permissions.length && this.isAdmin()) {
      return true;
    }
    return permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    if (this.isSuperadmin()) {
      return true;
    }
    const current = this.getPermissions();
    if (!environment.permissionsStrict && !current.length && this.isAdmin()) {
      return true;
    }
    return permissions.some((perm) => this.hasPermission(perm));
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  isSuperadmin(): boolean {
    const user = this.getCurrentUser();
    return user?.type === 'superadmin' || user?.type === 4 || user?.type === '4';
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.type === 'admin' || user?.type === 1 || user?.type === '1';
  }
}
