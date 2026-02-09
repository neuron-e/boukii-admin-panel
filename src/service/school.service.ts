
import { Injectable } from '@angular/core';
import { ApiCrudService } from './crud.service';
import * as moment from 'moment';
import {Observable, of, tap} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SchoolService {

  public schoolSettings: any;
  user: any;
  constructor(private crudService: ApiCrudService) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
  }

  refreshSchoolData() {
    const schoolId = this.user?.schools?.[0]?.id;
    if (!schoolId) {
      return;
    }
    this.crudService.get('/schools/'+ schoolId)
      .subscribe((data) => {
        this.schoolSettings = data.data;
        if (data.data && data.data.payment_provider) {
          localStorage.setItem('paymentProvider', data.data.payment_provider);
        }
      })
  }

  getSchoolData(user = null, forceParam = false) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    if (this.user && !forceParam) {
      const schoolId = this.user?.schools?.[0]?.id;
      if (!schoolId) {
        return of(null);
      }
      return this.crudService.get('/schools/'+ schoolId).pipe(
        tap((res: any) => {
          if (res.data && res.data.payment_provider) {
            localStorage.setItem('paymentProvider', res.data.payment_provider);
          }
        })
      );
    } else {
      const schoolId = user?.schools?.[0]?.id;
      if (!schoolId) {
        return of(null);
      }
      return this.crudService.get('/schools/'+ schoolId).pipe(
        tap((res: any) => {
          if (res.data && res.data.payment_provider) {
            localStorage.setItem('paymentProvider', res.data.payment_provider);
          }
        })
      );

    }
  }

  getPaymentProvider(): 'payrexx' | 'payyo' {
    const provider = localStorage.getItem('paymentProvider');
    return provider === 'payyo' ? 'payyo' : 'payrexx';
  }
}

