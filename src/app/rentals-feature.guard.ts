import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RentalsFeatureGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.isAllowedSchool()) {
      return true;
    }

    return this.router.parseUrl('/home');
  }

  private isAllowedSchool(): boolean {
    const raw = localStorage.getItem('boukiiUser');
    if (!raw) return false;

    try {
      const user = JSON.parse(raw);
      const schoolId = Number(user?.schools?.[0]?.id || user?.school_id || 0);
      if (!schoolId) return false;

      const allowedIds = this.getAllowedSchoolIds();
      return allowedIds.includes(schoolId);
    } catch {
      return false;
    }
  }

  private getAllowedSchoolIds(): number[] {
    const fromEnv = (environment as any).rentalFeatureSchoolIds;
    if (Array.isArray(fromEnv) && fromEnv.length) {
      return fromEnv.map((id: any) => Number(id)).filter((id: number) => id > 0);
    }
    return [15];
  }
}

