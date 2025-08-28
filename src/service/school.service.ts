
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
    this.crudService.get('/schools/'+this.user.schools[0].id)
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
      return this.crudService.get('/schools/'+this.user.schools[0].id).pipe(
        tap((res: any) => {
          if (res.data && res.data.payment_provider) {
            localStorage.setItem('paymentProvider', res.data.payment_provider);
          }
        })
      );
    } else {
      return this.crudService.get('/schools/'+user.schools[0].id).pipe(
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

