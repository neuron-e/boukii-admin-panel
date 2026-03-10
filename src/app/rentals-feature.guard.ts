import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { RentalService } from 'src/service/rental.service';

@Injectable({
  providedIn: 'root'
})
export class RentalsFeatureGuard implements CanActivate {
  constructor(
    private readonly router: Router,
    private readonly rentalService: RentalService
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.rentalService.watchPolicy().pipe(
      take(1),
      switchMap((cachedPolicy) => {
        if (cachedPolicy !== null) {
          return of(cachedPolicy);
        }

        return this.rentalService.refreshPolicy().pipe(
          map((response: any) => this.rentalService.extractPolicy(response))
        );
      }),
      map((policy: any) => this.rentalService.isPolicyEnabled(policy) ? true : this.router.parseUrl('/home')),
      catchError(() => of(this.router.parseUrl('/home')))
    );
  }
}
