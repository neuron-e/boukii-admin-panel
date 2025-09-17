import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { BehaviorSubject, Observable, ObservedValueOf, combineLatest, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiCrudService } from '../../../../service/crud.service';
import { SchoolService } from '../../../../service/school.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class MailService {

  mails = new BehaviorSubject<any[]>(this.sortAscending([]));
  mails$ = this.mails.asObservable();

  filterValue = new BehaviorSubject<string>(null);
  filterValue$ = this.filterValue.asObservable();
  filteredMails$:any = new Observable();
  school: any;
  user: any;

  constructor(private crudService: ApiCrudService, private schoolService: SchoolService, private translateService: TranslateService) {

    this.getData();
  }

  getData() {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    this.schoolService.getSchoolData(this.user)
      .subscribe((data) => {
        this.school = data.data;
        const rqs = [];
        rqs.push(this.crudService.list('/mails', 1, 1000, 'desc', 'id', '&school_id='+this.school.id));
        rqs.push(this.crudService.list('/email-logs', 1, 10000, 'desc', 'id', '&school_id='+this.school.id));

        forkJoin(rqs)
          .subscribe((mails) => {
            const currentMails = [];

            mails.forEach(element => {
              element.data.forEach(mail => {

                currentMails.push(mail);
              });
            });

            if(currentMails.length > 0) {
              const mails = currentMails.filter((c) => c.lang === this.translateService.currentLang || !c.lang);

              if (mails) {
                this.mails.next(mails)
                this.filteredMails$ = combineLatest(
                  this.mails$,
                  this.filterValue$
                ).pipe(
                  map(([mails, filterValue]) => filterValue ? mails?.filter(mail => JSON.stringify(mail).toLowerCase().includes(filterValue?.toLowerCase())) : mails)
                );
              }
            }
          })
      })
  }

  markMailAsRead(mailId: any['id']) {
    const mail = this.getMailById(mailId);

    if (mail.read) {
      return;
    }

    this.updateMail(mailId, {
      read: true
    });
  }

  updateMail(mailId: any['id'], update: Partial<any>) {
    const mails = [
      ...this.mails.getValue().filter(m => m.id !== mailId),
      {
        ...this.getMailById(mailId),
        ...update
      }
    ];

    this.mails.next(this.sortAscending(mails));
  }

  sortAscending(mails: any[]) {
    return mails.slice().sort((a, b) => DateTime.fromISO(a.date) > DateTime.fromISO(b.date) ? -1 : 1);
  }

  getMailById(mailId: any['id']) {
    return this.mails.getValue().find(m => m.id === mailId);
  }
}
