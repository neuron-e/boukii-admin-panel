import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SuperadminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const user = this.getUser();
    if (user?.type === 'superadmin' || user?.type === 4) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }

  private getUser(): any {
    const raw = localStorage.getItem('boukiiUser');
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
