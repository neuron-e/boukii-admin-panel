import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as moment from 'moment';
import { dropdownAnimation } from '../../../../../@vex/animations/dropdown.animation';
import { ApiCrudService } from '../../../../../service/crud.service';
import { SchoolService } from '../../../../../service/school.service';
import { TranslateService } from '@ngx-translate/core';
import { DateAdapter } from '@angular/material/core';

@Component({
  selector: 'vex-mail-compose',
  templateUrl: './mail-compose.component.html',
  styleUrls: ['./mail-compose.component.scss'],
  animations: [
    dropdownAnimation
  ],
  encapsulation: ViewEncapsulation.None
})
export class MailComposeComponent implements OnInit {

  currentPage = 1;
  pageSize = 5;
  editorConfig = {
    editable: true, // Asegura que se pueda escribir
    spellcheck: true,
    height: '300px', // Ajusta la altura
    minHeight: '300px',
    width: '100%',
    placeholder: 'Escribe aquí...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    sanitize: false, // Si tienes problemas con contenido HTML
  };
  coursesToSend: any = [];
  dropdownOpen = false;
  emailType: number = 1;
  emailSend: number = 1;
  selectedDateFrom: Date = new Date();
  selectedDateTo: Date = new Date();
  courses: any = [];
  mailType: any = 'booking_confirm';
  subjectFr: any = '';
  subjectEn: any = '';
  subjectEs: any = '';
  subjectIt: any = '';
  subjectDe: any = '';
  bodyFr: any = '';
  bodyEn: any = '';
  bodyEs: any = '';
  bodyIt: any = '';
  bodyDe: any = '';
  titleFr: any = '';
  titleEn: any = '';
  titleEs: any = '';
  titleIt: any = '';
  titleDe: any = '';
  selectedIndex = 0;
  generalSubjet: any = '';
  generalBody: any = '';
  today = new Date();
  school: any;
  currentMails: any = [];
  sendClients = false;
  sendMonitors = false;
  loading = true;
  loadingCourses = false;
  user: any;

  constructor(private cd: ChangeDetectorRef, private crudService: ApiCrudService, private schoolService: SchoolService,
    private dialogRef: MatDialogRef<MailComposeComponent>, private snackbar: MatSnackBar,
    private translateService: TranslateService, private dateAdapter: DateAdapter<Date>) { }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.dateAdapter.setLocale(this.translateService.getDefaultLang());
    this.dateAdapter.getFirstDayOfWeek = () => { return 1; }
    this.schoolService.getSchoolData(this.user)
      .subscribe((data) => {
        this.school = data.data;
        this.crudService.list('/mails', 1, 1000, 'desc', 'id', '&school_id=' + this.school.id)
          .subscribe((mails) => {
            this.currentMails = mails.data;

            const mailFr = this.currentMails.find((m) => m.type === this.mailType && m.lang === 'fr');
            const mailEn = this.currentMails.find((m) => m.type === this.mailType && m.lang === 'en');
            const mailEs = this.currentMails.find((m) => m.type === this.mailType && m.lang === 'es');
            const mailDe = this.currentMails.find((m) => m.type === this.mailType && m.lang === 'de');
            const mailIt = this.currentMails.find((m) => m.type === this.mailType && m.lang === 'it');

            this.subjectFr = mailFr?.subject;
            this.bodyFr = mailFr?.body;
            this.titleFr = mailFr?.title;

            this.subjectEn = mailEn?.subject;
            this.bodyEn = mailEn?.body;
            this.titleEn = mailEn?.title;

            this.subjectEs = mailEs?.subject;
            this.bodyEs = mailEs?.body;
            this.titleEs = mailEs?.title;

            this.subjectDe = mailDe?.subject;
            this.bodyDe = mailDe?.body;
            this.titleIt = mailDe?.title;

            this.subjectIt = mailIt?.subject;
            this.bodyIt = mailIt?.body;
            this.titleDe = mailIt?.title;

            this.loading = false;
          })
      })
  }

  get paginatedCourses() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.courses.slice(startIndex, startIndex + this.pageSize);
  }

  nextPage() {
    this.currentPage++;
  }

  previousPage() {
    this.currentPage--;
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    this.cd.markForCheck();
  }

  addToCourses(id: number) {
    if (this.coursesToSend.length == 0) {
      this.coursesToSend.push(id);
    } else {
      const index = this.coursesToSend.findIndex((c) => c === id);
      if (index > -1) {
        this.coursesToSend.splice(index, 1);
      } else {
        this.coursesToSend.push(id);
      }
    }
  }

  isSelected(id: number) {
    return this.coursesToSend.findIndex((c) => c === id) !== -1;
  }

  selectAll(event: any) {
    if (event.checked) {
      this.coursesToSend = [];

      this.courses.forEach(element => {
        this.coursesToSend.push(element.id);
      });
    } else {
      this.coursesToSend = [];
    }
  }

  sendMail() {
    const data = {
      start_date: this.selectedDateFrom,
      end_date: this.selectedDateTo,
      course_ids: this.emailType === 2 ? this.coursesToSend : [],
      subject: this.generalSubjet,
      body: this.generalBody,
      monitors: this.sendMonitors,
      clients: this.sendClients
    };
    this.crudService.post('/admin/mails/send', data)
      .subscribe((res) => {
        this.dialogRef.close();

      })
  }

  saveDefaultMail() {
    const data = [
      [{
        type: this.mailType,
        subject: this.subjectFr,
        body: this.bodyFr,
        title: this.titleFr,
        school_id: this.school.id,
        lang: 'fr'
      }],
      [{
        type: this.mailType,
        subject: this.subjectEn,
        body: this.bodyEn,
        title: this.titleEn,
        school_id: this.school.id,
        lang: 'en'
      }],
      [{
        type: this.mailType,
        subject: this.subjectEs,
        body: this.bodyEs,
        title: this.titleEs,
        school_id: this.school.id,
        lang: 'es'
      }],
      [{
        type: this.mailType,
        subject: this.subjectDe,
        body: this.bodyDe,
        title: this.titleIt,
        school_id: this.school.id,
        lang: 'de'
      }],
      [{
        type: this.mailType,
        subject: this.subjectIt,
        body: this.bodyIt,
        title: this.titleDe,
        school_id: this.school.id,
        lang: 'it'
      }]
    ];

    for (let i = 0; i < 5; i++) {

      const existMail = this.currentMails.find((c) => c.lang === data[i][0].lang && c.type === data[i][0].type);

      if (existMail) {

        const updateData = {
          type: this.mailType,
          subject: data[i][0].subject,
          body: data[i][0].body,
          title: data[i][0].title,
          school_id: this.school.id,
          lang: data[i][0].lang
        }

        this.crudService.update('/mails', updateData, existMail.id)
          .subscribe((res) => {

            if (i === 4) {

              this.snackbar.open('Se ha configurado el email por defecto', 'OK', { duration: 3000 });
              this.dialogRef.close();
            }

          })
      } else {
        this.crudService.post('/mails', data[i][0])
          .subscribe((res) => {

            if (i === 4) {

              this.snackbar.open('Se ha configurado el email por defecto', 'OK', { duration: 3000 });
              this.dialogRef.close();
            }

          })
      }

    }

  }

  setCurrentMailType() {
    const mail = this.currentMails.find((m) => m.type === this.mailType);

    if (mail) {
      const frMail = this.currentMails.find((m) => m.lang === 'fr');

      this.bodyFr = frMail?.body;
      this.subjectFr = frMail?.subject;
    } else {
      this.bodyFr = '';
      this.subjectFr = '';
    }
    if (mail) {
      const enMail = this.currentMails.find((m) => m.lang === 'en');

      this.bodyEn = enMail?.body;
      this.subjectEn = enMail?.subject;
    } else {
      this.bodyEn = '';
      this.subjectEn = '';
    }
    if (mail) {
      const esMail = this.currentMails.find((m) => m.lang === 'es');

      this.bodyEs = esMail?.body;
      this.subjectEs = esMail?.subject;
    } else {
      this.bodyEs = '';
      this.subjectEs = '';
    }
    if (mail) {
      const deMail = this.currentMails.find((m) => m.lang === 'de');
      this.bodyDe = deMail?.body;
      this.subjectDe = deMail?.subject;
    } else {
      this.bodyDe = '';
      this.subjectDe = '';
    }
    if (mail) {
      const itMail = this.currentMails.find((m) => m.lang === 'it');

      this.bodyIt = itMail?.body;
      this.subjectIt = itMail?.subject;
    } else {
      this.bodyIt = '';
      this.subjectIt = '';
    }
  }

  searchCourses() {
    this.loadingCourses = true;
    this.crudService.list(
      '/admin/courses',
      1,
      1000,
      'desc',
      'id',
      '&school_id=' + this.school.id + '&start_date=' + moment(this.selectedDateFrom).format('YYYY-MM-DD') + '&end_date=' + moment(this.selectedDateTo).format('YYYY-MM-DD'),
      '',
      null,
      '',
      ['sport', 'station']
    )
      .subscribe((data) => {
        this.courses = data.data;
        this.loadingCourses = false;
      })
  }

  onTabChange(event: any) {
    this.selectedIndex = event.index;
    this.setCurrentMailType();
  }
}
