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
      const activeSchool = user?.school || user?.schools?.[0] || null;
      const schoolId = Number(
        activeSchool?.id || user?.school_id || user?.schools?.[0]?.id || 0
      );
      const schoolName = String(
        activeSchool?.name || user?.school_name || ''
      ).trim().toLowerCase();
      const allowedIds = this.getAllowedSchoolIds();
      const allowedNames = this.getAllowedSchoolNames();

      return (schoolId > 0 && allowedIds.includes(schoolId))
        || (!!schoolName && allowedNames.includes(schoolName));
    } catch {
      return false;
    }
  }

  private getAllowedSchoolIds(): number[] {
    const fromEnv = (environment as any).rentalFeatureSchoolIds;
    if (Array.isArray(fromEnv) && fromEnv.length) {
      return fromEnv.map((id: any) => Number(id)).filter((id: number) => id > 0);
    }
    return [1];
  }

  private getAllowedSchoolNames(): string[] {
    const fromEnv = (environment as any).rentalFeatureSchoolNames;
    if (Array.isArray(fromEnv) && fromEnv.length) {
      return fromEnv
        .map((name: any) => String(name || '').trim().toLowerCase())
        .filter((name: string) => !!name);
    }

    return ['school testing'];
  }
}
