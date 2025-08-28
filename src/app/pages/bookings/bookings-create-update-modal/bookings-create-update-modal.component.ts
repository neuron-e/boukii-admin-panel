import { Component, EventEmitter, OnDestroy, OnInit, Output, Input, ChangeDetectorRef, Inject, Injectable } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Observable, Subscription, forkJoin, map, of, startWith } from 'rxjs';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ApiCrudService } from 'src/service/crud.service';
import { MatCalendar, MatCalendarCellCssClasses, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { Platform } from '@angular/cdk/platform';
import { DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import * as moment from 'moment';
import { DomSanitizer } from '@angular/platform-browser';
import { CalendarService } from 'src/service/calendar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmModalComponent } from '../../monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import { AddClientUserModalComponent } from '../../clients/add-client-user/add-client-user.component';
import { PasswordService } from 'src/service/password.service';
import { ClientCreateUpdateModalComponent } from '../../clients/client-create-update-modal/client-create-update-modal.component';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { AddClientSportModalComponent } from '../add-client-sport/add-client-sport.component';
import { Router } from '@angular/router';
import { MatSelectChange } from '@angular/material/select';
import { AddReductionModalComponent } from '../bookings-create-update/add-reduction/add-reduction.component';
import { AddDiscountBonusModalComponent } from '../bookings-create-update/add-discount-bonus/add-discount-bonus.component';
import { TranslateService } from '@ngx-translate/core';
import { SchoolService } from 'src/service/school.service';
@Injectable()
@Component({
  selector: 'custom-header-update-modal',
  template: `
    <div class="custom-header">
      <button mat-icon-button (click)="previousClicked()">
        <span class="material-icons">chevron_left</span>
      </button>
      <button mat-icon-button (click)="nextClicked()">
        <span class="material-icons">chevron_right</span>
      </button>
    </div>
  `,
  styles: [`
    .custom-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `]
})
export class CustomHeader {
  constructor(
    private calendar: MatCalendar<any>,
    private dateAdapter: DateAdapter<any>,
    private calendarService: CalendarService
  ) { }

  getFirstDayOfMonth(date: any): Date {
    return this.dateAdapter.createDate(
      this.dateAdapter.getYear(date),
      this.dateAdapter.getMonth(date),
      1
    );
  }

  previousClicked() {
    const newDate = this.dateAdapter.addCalendarMonths(this.calendar.activeDate, -1);
    this.calendar.activeDate = newDate;
    this.calendarService.notifyMonthChanged(this.getFirstDayOfMonth(newDate));
  }

  nextClicked() {
    const newDate = this.dateAdapter.addCalendarMonths(this.calendar.activeDate, 1);
    this.calendar.activeDate = newDate;
    this.calendarService.notifyMonthChanged(this.getFirstDayOfMonth(newDate));
  }
}
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  @Injectable()
  format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();
      return `${this._to2digit(day)}/${this._to2digit(month)}/${year}`;
    } else {
      return date.toDateString();
    }
  }

  private _to2digit(n: number) {
    return ('00' + n).slice(-2);
  }
}

@Component({
  selector: 'vex-bookings-create-update-modal',
  templateUrl: './bookings-create-update-modal.component.html',
  styleUrls: ['./bookings-create-update-modal.component.scss'],
  animations: [stagger20ms, fadeInUp400ms]
})
export class BookingsCreateUpdateModalComponent implements OnInit {

  privateIcon = 'https://api.boukii.com/storage/icons/prive_ski2x.png';
  collectifIcon = 'https://api.boukii.com/storage/icons/collectif_ski2x.png';
  customHeader = CustomHeader;
  @Input()
  public monthAndYear = new Date();

  @Output()
  public monthAndYearChange = new EventEmitter<Date | null>();

  borderActive: number = -1;
  showDetail: any = [];

  createComponent = BookingsCreateUpdateModalComponent;
  selectedDatePrivate = new Date();

  title = 'Título de la Reserva';
  titleMoniteur = 'Nombre monitor';
  usersCount = 5;
  duration = '3 horas';
  dates = ['03/11/2023', '04/11/2023', '05/11/2023']; // Ejemplo de fechas
  durations = null; // Ejemplo de duraciones
  persons = []; // Ejemplo de número de personas
  personsToBook = []; // Ejemplo de número de personas
  personsSelected = []; // Ejemplo de número de personas
  personsSelectedMultiple = [];
  reservedDates = [
    new Date(),
    new Date(),
    new Date(),
    new Date(),
    new Date(),
    // ... otras fechas
  ];
  userAvatar = '../../../../assets/img/avatar.png';
  userName = 'Nombre de Usuario';
  userNameSub = 'Nombre de Utilizador';
  userLevel = 'Intermedio';
  selectedButton: string = '1';
  selectedSubButton: string = '';
  bookingComplete: boolean = false;

  static id = 100;
  minDate: Date;
  selectedDate = null;
  selectedPrivateCoursesDate = moment();
  selectedItem: any = null;
  selectedCourseDateItem: any = null;
  selectedSubGroupItem: any = null;
  selectedSubGroupItemIndex: any = null;
  courseDates: any = [];
  selectedPrivateDates: any = [];
  reservableCourseDate: any = [];

  periodUnique = true;
  periodMultiple = false;
  sameMonitor = false;


  times: string[] = this.generateTimes();
  filteredTimes: Observable<string[]>;

  dateControl = new FormControl();
  timeControl = new FormControl();
  durationControl = new FormControl();
  personsControl = new FormControl();
  clientsForm = new FormControl();
  subClientForm = new FormControl();
  sportForm = new FormControl();
  levelForm = new FormControl();
  monitorsForm = new FormControl();

  filteredOptions: Observable<any[]>;
  filteredSubClients: Observable<any[]>;
  filteredSports: Observable<any[]>;
  filteredLevel: Observable<any[]>;
  filteredMonitors: Observable<any[]>;

  courseType: any = '';
  courseTypeId: any = null;
  opRem = 0;
  boukiiCare = 0;
  form: UntypedFormGroup;
  defaults: any = {
    price_total: null,
    has_cancellation_insurance: false,
    price_cancellation_insurance: 0,
    has_boukii_care: false,
    price_boukii_care: 0,
    currency: null,
    paid_total: null,
    paid: null,
    payrexx_reference: null,
    payrexx_transaction: null,
    attendance: null,
    payrexx_refund: null,
    notes: null,
    notes_school: null,
    school_id: null,
    client_main_id: null,
    payment_method_id: null,
    paxes: null,
    color: null,
  };

  defaultsBookingUser: any = {
    school_id: null,
    booking_id: null,
    client_id: null,
    course_subgroup_id: null,
    course_id: null,
    course_date_id: null,
    degree_id: null,
    course_group_id: null,
    monitor_id: null,
    hour_start: null,
    hour_end: null,
    price: null,
    currency: null,
    date: null,
    attended: null,
    color: null,
  };

  options: string[] = ['One', 'Two', 'Three'];
  mode: 'create' | 'update' = 'create';
  loading: boolean = true;
  loadingUtilizers: boolean = true;
  loadingCalendar: boolean = true;
  loadingDurations: boolean = true;
  sportTypeSelected: number = 1;
  selectedSport: any = null;

  languages = [];
  bookings = [];
  bookingsToCreate = [];
  clients = [];
  allClients = [];
  sportData = [];
  sportDataList = [];
  sportTypeData = [];
  levels = [];
  utilizers = [];
  courses = [];
  coursesMonth = [];
  monitors = [];
  season: any = [];
  allLevels: any = [];
  holidays: any = [];
  myHolidayDates: any = [];
  school = [];
  settings: any = [];
  user: any;
  mainIdSelected = true;
  reduction: any = null;
  finalPrice: any = null;
  finalPriceNoTaxes: any = null;
  bonus: any = [];
  totalPrice: any = 0;
  countries = MOCK_COUNTRIES;
  snackBarRef: any = null;
  schoolSettings: any = [];
  color = '';
  tva = 0;
  tvaPrice = 0;
  cancellationInsurance = 0;
  boukiiCarePrice = 0;

  private subscription: Subscription;

  constructor(private fb: UntypedFormBuilder, private dialog: MatDialog, private crudService: ApiCrudService, private calendarService: CalendarService, private dialogRef: MatDialogRef<any>,
    private snackbar: MatSnackBar, private passwordGen: PasswordService, private router: Router, public translateService: TranslateService, public schoolService: SchoolService, @Inject(MAT_DIALOG_DATA) public externalData: any) {

    this.minDate = new Date(); // Establecer la fecha mínima como la fecha actual
    this.subscription = this.calendarService.monthChanged$.subscribe(firstDayOfMonth => {
      this.handleMonthChange(firstDayOfMonth);
      this.selectedDatePrivate = firstDayOfMonth;
      this.selectedDate = firstDayOfMonth;
    });
  }

  ngOnInit() {
    this.getData();
  }

  getData() {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    this.form = this.fb.group({
      sportType: [1], // Posiblemente establezcas un valor predeterminado aquí
      sportForm: [null],
      courseType: [this.externalData && this.externalData.onlyPrivate ? 'privee' : ''],
      sport: [null],
      observations: [null],
      observations_school: [null],
      fromDate: [null],
      periodUnique: [false],
      periodMultiple: [false],
      sameMonitor: [false]
    });

    if (this.externalData && this.externalData.onlyPrivate) {
      this.courseTypeId = 2;
      this.courseType = 'privee';
    }

    this.getLanguages();
    this.getSports();
    this.getMonitors();
    this.getSeason();
    this.getSchool();

    forkJoin([this.getSportsType(), this.getClients(), this.getClientsAll()])
      .subscribe((data: any) => {
        this.sportTypeData = data[0].data.reverse();
        this.clients = data[1].data;
        this.allClients = data[2].data;

        this.filterSportsByType(true);

        this.filteredOptions = this.clientsForm.valueChanges.pipe(
          startWith(''),
          map((value: any) => typeof value === 'string' ? value : value?.full_name),
          map(full_name => full_name ? this._filter(full_name) : this.clients.slice(0, 50))
        );

        this.filteredSports = this.sportForm.valueChanges.pipe(
          startWith(''),
          map((value: any) => typeof value === 'string' ? value : value?.name),
          map(name => name ? this._filterSport(name) : this.sportData.slice())
        );

        this.filteredMonitors = this.monitorsForm.valueChanges.pipe(
          startWith(''),
          map((value: any) => typeof value === 'string' ? value : value?.full_name),
          map(full_name => full_name ? this._filterMonitor(full_name) : this.monitors.slice())
        );

        this.filteredTimes = this.timeControl.valueChanges
          .pipe(
            startWith(''),
            map(value => this._filterTime(value))
          );

        setTimeout(() => {

          this.filteredSports = of(this.sportData.filter(sport => sport.sport_type === this.sportTypeSelected));
          this.sportDataList = this.sportData.filter(sport => sport.sport_type === this.sportTypeSelected);
          this.selectSport(this.sportDataList[0]);

          if (this.externalData && this.externalData.client) {

            this.getUtilzers(this.externalData.client, true);
          } /*else {

              this.getUtilzers(this.clients[0], true);
            }*/
          //this.getDegrees(this.defaults.sport_id);


          setTimeout(() => {
            if (this.externalData && this.externalData.client) {

              this.clientsForm.patchValue(this.clients.find((c) => c.id === this.externalData.client.id));
              this.defaultsBookingUser.client_id = this.clients.find((c) => c.id === this.externalData.client.id).id;
            } /*else {
                this.clientsForm.patchValue(this.clients[0]);
              }*/
            this.loadingCalendar = false;
            this.loading = false;
          }, 800);
        }, 500);
      })
  }

  clearInput() {
    this.levelForm.setValue('');
  }

  generateArray(paxes: number) {
    this.persons = [];
    for (let i = 1; i <= paxes; i++) {
      this.persons.push(i);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  filterSportsByType(onload = false) {
    if (this.snackBarRef !== null) {

      this.snackBarRef.dismiss();
    }

    this.selectedItem = null;
    this.sportTypeSelected = this.form.get('sportType').value;
    let selectedSportType = this.form.get('sportType').value;
    this.filteredSports = of(this.sportData.filter(sport => sport.sport_type === selectedSportType));
    this.sportDataList = this.sportData.filter(sport => sport.sport_type === selectedSportType);

    if (!onload) {
      const client = this.clients.find((c) => c.id === this.defaultsBookingUser.client_id);
      client.client_sports.forEach(sport => {

        if (sport.sport_id === this.defaults.sport_id && sport.school_id === this.user.schools[0].id) {
          const level = this.levels.find((l) => l.id === sport.degree_id);
          this.levelForm.patchValue(level);
          this.defaultsBookingUser.degree_id = level.id;
          this.getCourses(level, this.monthAndYear);
        }
      });
    }

  }

  setCourseType(type: string, id: number) {
    this.monthAndYear = new Date();
    if (this.snackBarRef !== null) {

      this.snackBarRef.dismiss();
    }
    this.courseType = type;
    this.courseTypeId = id;
    this.form.get("courseType").patchValue(id);

    const client = this.allClients.find((c) => c.id === this.defaultsBookingUser.client_id);
    let hasSport = false;

    if (client) {
      client.client_sports.forEach(sport => {

        if (sport.sport_id === this.defaults.sport_id && sport.school_id === this.user.schools[0].id) {
          const level = this.levels.find((l) => l.id === sport.degree_id);
          this.levelForm.patchValue(level);
          this.defaultsBookingUser.degree_id = level.id;
          hasSport = true;
          this.getCourses(level, this.monthAndYear);
        }
      });
    } else {
      const level = this.levelForm.value;
      this.levelForm.patchValue(level);
      this.defaultsBookingUser.degree_id = level.id;
      this.getCourses(level, this.monthAndYear);
    }


    if (!hasSport) {
      this.snackbar.open(this.translateService.instant('snackbar.booking.user_no_sport'), 'OK', { duration: 6000 });
    }
  }

  inUseDatesFilter = (d: Date): boolean => {
    if (!d) return false; // Si la fecha es nula o indefinida, no debería ser seleccionable.

    const formattedDate = moment(d).format('YYYY-MM-DD');
    const time = moment(d).startOf('day').valueOf(); // .getTime() es igual a .valueOf()

    // Encuentra si la fecha actual está en myHolidayDates.
    const isHoliday = this.myHolidayDates.some(x => x.getTime() === time);

    // Encuentra si la fecha actual está en selectedItem.course_dates y si es activa.
    const courseDate = this.selectedItem.course_dates.find(s => moment(s.date).format('YYYY-MM-DD') === formattedDate);
    const isActive = courseDate ? (courseDate.active || courseDate.active === 1) : false;

    // La fecha debería ser seleccionable si no es un día festivo y está activa (o sea, active no es falso ni 0).
    return !isHoliday && isActive;
  }

  selectItem(item: any) {
    this.color = '';
    if (this.snackBarRef !== null) {

      this.snackBarRef.dismiss();
    }

    if (item.course_type === 1) {
      if (this.selectedItem !== null && this.selectedItem?.id !== item.id) {
        this.reservableCourseDate = [];

      }
      this.courseDates = [];
      this.selectedItem = item;
      this.selectedSubGroupItem = null;
      this.courseDates.push(this.defaultsBookingUser);
    } else {


      this.generateArray(item.max_participants);
      this.courseDates = [];
      this.selectedPrivateDates = [];

      this.selectedItem = item;
      this.courseDates.push({
        school_id: this.user.schools[0].id,
        booking_id: null,
        client_id: this.defaultsBookingUser.client_id,
        course_subgroup_id: null,
        course_id: item.id,
        course_date_id: this.selectedItem.course_dates[0].id,
        date: this.selectedItem.course_dates[0].date,
        hour_start: null,
        hour_end: null,
        price: this.selectedItem.price,
        currency: this.selectedItem.currency,
        attended: false
      });

      item.course_dates.forEach(element => {
        this.selectedPrivateDates.push(moment(element.date).startOf('day').toDate())
      });

      if (item.is_flexible) {
        this.generateCourseDurations(item.course_dates[0].hour_start, item.course_dates[0].hour_end, item.duration.length == 9 ? this.transformTime(item.duration) : item.duration);
      } else {
        this.calculatePaxesPrivateFix();
      }

      if (this.externalData && this.externalData.onlyPrivate) {

        this.selectedItem.course_dates.forEach(element => {
          const dateLoop = moment(element.date).startOf('day').format('YYYY-MM-DD')
          if (dateLoop === this.externalData.date) {

            this.courseDates[0].course_date_id = element.id;
            this.courseDates[0].date = element.date;
          }
        });


      }
    }
  }

  transformTime(time: string): string {
    let duration = moment.duration(time);
    let hours = duration.hours();
    let minutes = duration.minutes();
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  }

  selectSubGroupItem(item: any, subGroupIndex: any) {
    this.selectedSubGroupItem = item;
    this.selectedSubGroupItemIndex = subGroupIndex;
  }

  addCourseDate() {
    this.courseDates.push({
      school_id: this.user.schools[0].id,
      booking_id: null,
      client_id: this.defaultsBookingUser.client_id,
      course_subgroup_id: null,
      course_id: this.selectedItem.id,
      hour_start: null,
      hour_end: null,
      price: this.selectedItem.price,
      currency: this.selectedItem.currency,
      date: null,
      attended: false
    });
  }

  addReservableCourseDate(item, event) {
    if (event.checked) {
      this.reservableCourseDate.push(item);
    } else {
      const index = this.reservableCourseDate.findIndex((c) => c.id === item.id);
      this.reservableCourseDate.splice(index, 1);
    }
  }

  setCourseDateItemPrivateNoFlexible(item: any, date: any) {

    this.selectedItem.course_dates.forEach(element => {
      if (moment(element.date).startOf('day').format('YYYY-MM-DD') === moment(date.value).startOf('day').format('YYYY-MM-DD')) {

        item.course_date_id = element.id;
        item.date = element.date;
      }
    });
  }

  calculateAvailableHours(selectedCourseDateItem: any, time: any, courseDateIndex: any) {

    // Obtener la fecha y hora actuales
    const now = moment();

    // Convertir la fecha del curso y la hora de inicio/fin a objetos moment
    const courseDate = moment(this.courseDates[courseDateIndex].date, 'YYYY-MM-DD'); // Asumiendo que tienes una propiedad 'date'
    const start = moment(selectedCourseDateItem.hour_start, 'HH:mm:ss');
    const end = moment(selectedCourseDateItem.hour_end, 'HH:mm:ss');

    // Convertir la hora proporcionada a un objeto moment (con la fecha del curso para comparaciones correctas)
    const hour = moment(`${selectedCourseDateItem.date} ${time}`, 'dd-MM-yyyy HH:mm');

    // Primero, comprueba si es el mismo día
    if (!now.isSame(courseDate, 'day')) {
      return false; // Si no es el mismo día, no es necesario comprobar la hora
    }

    // Si es el mismo día, comprueba si la hora actual es después de la hora proporcionada
    // y si la hora proporcionada está entre la hora de inicio y fin del curso
    return now.isAfter(hour) || (hour.isSameOrAfter(start) && hour.isSameOrBefore(end));
  }


  resetCourseDates() {
    if (this.courseDates.length > 1) {
      const firstDate = this.courseDates[0];
      this.courseDates = [];
      this.courseDates.push(firstDate);
    }
  }

  addAnotherCourse() {
    this.selectedItem = null;
    this.selectedCourseDateItem = null;
    this.selectedSubGroupItem = null;
    this.selectedSubGroupItemIndex = null;
    this.reservableCourseDate = [];
    this.periodMultiple = false;
    this.periodUnique = true;
    this.sameMonitor = false;
    this.showDetail = null;
    this.setCourseType(null, -1);
  }

  backToList() {
    this.selectedItem = null;
    this.selectedCourseDateItem = null;
    this.selectedSubGroupItem = null;
    this.selectedSubGroupItemIndex = null;
    this.reservableCourseDate = [];
    this.periodMultiple = false;
    this.periodUnique = true;
    this.sameMonitor = false;
    this.showDetail = null;
  }

  confirmBooking() {

    let paxes = 0;

    if (this.levelForm.value == null || this.levelForm.value == '') {
      this.snackbar.open(this.translateService.instant('choose_level'), 'OK', { duration: 3000 });
      return;
    }

    if (this.courseTypeId === 2 && this.checkAllFields()) {

      this.snackbar.open(this.sameMonitor ? this.translateService.instant('snackbar.booking.user_no_monitor') : this.translateService.instant('snackbar.booking.user_monitor'), 'OK', { duration: 3000 });
      return;
    }

    if (this.courseTypeId === 1 && this.selectedItem.is_flexible && this.reservableCourseDate.length === 0) {

      this.snackbar.open(this.translateService.instant('snackbar.booking.select_dates'), 'OK', { duration: 3000 });
      return;
    }

    const checkAval = { bookingUsers: [] };

    if (this.courseTypeId === 1 && !this.selectedItem.is_flexible) {

      this.selectedItem.course_dates.forEach(element => {
        checkAval.bookingUsers.push({
          client_id: this.defaultsBookingUser.client_id,
          hour_start: element.hour_start.replace(': 00'),
          hour_end: element.hour_end.replace(': 00'),
          date: moment(element.date).format('YYYY-MM-DD'),
        })
      });

    } else if (this.courseTypeId === 1 && this.selectedItem.is_flexible) {
      this.reservableCourseDate.forEach(element => {
        checkAval.bookingUsers.push({
          client_id: this.defaultsBookingUser.client_id,
          hour_start: element.hour_start.replace(': 00'),
          hour_end: element.hour_end.replace(': 00'),
          date: moment(element.date).format('YYYY-MM-DD'),
        })
      });
    } else if (this.courseTypeId === 2 && this.selectedItem.is_flexible) {
      this.courseDates.forEach(element => {
        checkAval.bookingUsers.push({
          client_id: element.client_id,
          hour_start: element.hour_start,
          hour_end: this.calculateHourEnd(element.hour_start, element.duration),
          date: moment(element.date).format('YYYY-MM-DD'),
        })
        if (this.personsSelectedMultiple[element.course_date_id]?.[element.hour_start]) {
          this.personsSelectedMultiple[element.course_date_id][element.hour_start].forEach((person) => {
            checkAval.bookingUsers.push({
              client_id: person.id,
              hour_start: element.hour_start,
              hour_end: this.calculateHourEnd(element.hour_start, element.duration),
              date: moment(element.date).format('YYYY-MM-DD'),
            });
          });
        }
      });
    } else {
      this.courseDates.forEach(element => {
        checkAval.bookingUsers.push({
          client_id: element.client_id,
          hour_start: element.hour_start,
          hour_end: this.calculateHourEnd(element.hour_start, this.selectedItem.duration),
          date: moment(element.date).format('YYYY-MM-DD'),
        })
        if (this.personsSelectedMultiple[element.course_date_id]?.[element.hour_start]) {
          this.personsSelectedMultiple[element.course_date_id][element.hour_start].forEach((person) => {
            checkAval.bookingUsers.push({
              client_id: person.id,
              hour_start: element.hour_start,
              hour_end: this.calculateHourEnd(element.hour_start, this.selectedItem.duration),
              date: moment(element.date).format('YYYY-MM-DD'),
            });
          });
        }
      });
    }

    this.crudService.post('/admin/bookings/checkbooking', checkAval)
      .subscribe((response) => {

        if (this.courseTypeId === 2 && this.selectedItem.is_flexible) {
          this.courseDates.forEach(item => {
            paxes = paxes + parseInt(item.paxes);
          })
        } else {
          paxes = 1;
        }

        let price = this.selectedItem.price;
        if (this.courseTypeId === 1 && this.selectedItem.is_flexible) {
          const discounts = typeof this.selectedItem.discounts === 'string' ? JSON.parse(this.selectedItem.discounts) : this.selectedItem.discounts;
          price = price * this.reservableCourseDate.length;
          discounts.forEach(element => {
            if (element.date === this.reservableCourseDate.length && element.percentage) {
              price = price - (price * (element.percentage / 100));
            }
          });
        }

        let data: any = {};
        data.price_total = this.selectedItem.is_flexible && this.selectedItem.course_type === 2 ? 0 : +price;
        data.has_cancellation_insurance = this.defaults.has_cancellation_insurance;
        data.price_cancellation_insurance = 0;
        data.has_boukii_care = this.defaults.has_boukii_care;
        data.price_boukii_care = 0;
        data.payment_method_id = this.defaults.payment_method_id;
        data.paid = this.defaults.payment_method_id === 1 ? true : this.defaults.paid;
        data.currency = this.selectedItem.currency;
        data.school_id = this.user.schools[0].id;
        data.client_main_id = this.defaults.client_main_id.id;
        data.notes = this.defaults.notes;
        data.notes_school = this.defaults.notes_school;
        data.paxes = paxes;
        data.courseDates = [];

        if (this.courseTypeId === 1 && !this.selectedItem.is_flexible) {
          this.selectedItem.course_dates.forEach(item => {
            if (this.canBook(item.date)) {
              let monitorId = null;
              let degreeId = null;
              let subgroupId = null;
              let groupId = null;
              let courseDateId = null;
              let monitorFind = false;
              item.course_groups.forEach(groups => {
                if (groups.degree_id === this.levelForm.value.id) {
                  if (!monitorFind) {
                    if (groups.course_subgroups[this.selectedSubGroupItemIndex].degree_id === this.levelForm.value.id) {
                      monitorId = groups.course_subgroups[this.selectedSubGroupItemIndex].monitor_id;
                      degreeId = groups.course_subgroups[this.selectedSubGroupItemIndex].degree_id;
                      subgroupId = groups.course_subgroups[this.selectedSubGroupItemIndex].id;
                      courseDateId = groups.course_date_id;
                      groupId = groups.id;
                      monitorFind = true;
                    }
                  }
                }

              })
              data.courseDates.push({
                school_id: this.user.schools[0].id,
                booking_id: null,
                client_id: this.courseDates[0].client_id,
                course_id: item.course_id,
                course_date_id: courseDateId,
                degree_id: degreeId,
                monitor_id: monitorId,
                subgroup_id: subgroupId,
                group_id: groupId,
                hour_start: item.hour_start,
                hour_end: item.hour_end,
                price: +this.selectedItem.price,
                currency: this.selectedItem.currency,
                course: this.selectedItem,
                date: moment(item.date, 'YYYY-MM-DD').format('YYYY-MM-DD')
              });
            }
          });
        } else if (this.courseTypeId === 1 && this.selectedItem.is_flexible) {
          this.reservableCourseDate.forEach(item => {
            if (this.canBook(item.date)) {
              let monitorId = null;
              let degreeId = null;
              let courseDateId = null;
              let subgroupId = null;
              let groupId = null;

              let monitorFind = false;
              item.course_groups.forEach(groups => {
                if (groups.degree_id === this.levelForm.value.id) {
                  if (!monitorFind) {
                    if (groups.course_subgroups[this.selectedSubGroupItemIndex].degree_id === this.levelForm.value.id) {
                      monitorId = groups.course_subgroups[this.selectedSubGroupItemIndex].monitor_id;
                      degreeId = groups.course_subgroups[this.selectedSubGroupItemIndex].degree_id;
                      subgroupId = groups.course_subgroups[this.selectedSubGroupItemIndex].id;
                      courseDateId = groups.course_date_id;
                      groupId = groups.id;
                      monitorFind = true;
                    }
                  }
                }

              });
              data.courseDates.push({
                school_id: this.user.schools[0].id,
                booking_id: null,
                client_id: this.courseDates[0].client_id,
                course_id: item.course_id,
                course_date_id: courseDateId,
                degree_id: degreeId,
                monitor_id: monitorId,
                group_id: groupId,
                subgroup_id: subgroupId,
                hour_start: item.hour_start,
                hour_end: item.hour_end,
                price: parseFloat(this.selectedItem.price),
                currency: this.selectedItem.currency,
                course: this.selectedItem,
                date: moment(item.date, 'YYYY-MM-DD').format('YYYY-MM-DD')
              });
            }
          });
        } else if (this.courseTypeId === 2 && this.selectedItem.is_flexible) {
          const priceRange = typeof this.selectedItem.price_range === 'string' ? JSON.parse(this.selectedItem.price_range) : this.selectedItem.price_range;

          this.courseDates.forEach(item => {
            data = {};
            data.has_cancellation_insurance = this.defaults.has_cancellation_insurance;
            data.price_cancellation_insurance = 0;
            data.has_boukii_care = this.defaults.has_boukii_care;
            data.price_boukii_care = 0;
            data.payment_method_id = this.defaults.payment_method_id;
            data.paid = this.defaults.payment_method_id === 1 ? true : this.defaults.paid;
            data.currency = this.selectedItem.currency;
            data.school_id = this.user.schools[0].id;
            data.client_main_id = this.defaults.client_main_id.id;
            data.notes = this.defaults.notes;
            data.notes_school = this.defaults.notes_school;
            data.paxes = paxes;
            data.courseDates = [];
            data.school_id = this.user.schools[0].id
            data.booking_id = null
            data.client_id = item.client_id
            data.course_id = item.course_id
            data.course_date_id = item.course_date_id
            data.degree_id = this.levelForm.value.id
            data.monitor_id = this.sameMonitor ? this.courseDates[0].monitor_id : item.monitor_id
            data.hour_start = item.hour_start
            data.hour_end = this.calculateHourEnd(item.hour_start, item.duration) //calcular en base a la duracion del curso

            data.currency = item.currency

            data.course = this.selectedItem
            data.date = moment(item.date, 'YYYY-MM-DD').format('YYYY-MM-DD')
            let people = [];
            if (this.personsSelectedMultiple[item.course_date_id]?.[item.hour_start]) {
              people = this.personsSelectedMultiple[item.course_date_id][item.hour_start]
              data.people = people;
            }
            data.paxes = people.length + 1
            const price = (parseFloat(priceRange.find((p) => p.intervalo === item.duration)[people.length + 1]));
            data.price = price
            data.price_total = price;
            data.courseDates.push(data);
            this.bookingsToCreate.push(data);
          });

        } else if (this.courseTypeId === 2 && !this.selectedItem.is_flexible) {
          this.courseDates.forEach(item => {
            data = {};
            data.has_cancellation_insurance = this.defaults.has_cancellation_insurance;
            data.price_cancellation_insurance = 0;
            data.has_boukii_care = this.defaults.has_boukii_care;
            data.price_boukii_care = 0;
            data.payment_method_id = this.defaults.payment_method_id;
            data.paid = this.defaults.payment_method_id === 1 ? true : this.defaults.paid;
            data.currency = this.selectedItem.currency;
            data.school_id = this.user.schools[0].id;
            data.client_main_id = this.defaults.client_main_id.id;
            data.notes = this.defaults.notes;
            data.notes_school = this.defaults.notes_school;
            data.paxes = paxes;
            data.courseDates = [];
            data.school_id = this.user.schools[0].id
            data.booking_id = null
            data.client_id = item.client_id
            data.course_id = item.course_id
            data.course_date_id = item.course_date_id
            data.degree_id = this.levelForm.value.id
            data.monitor_id = this.sameMonitor ? this.courseDates[0].monitor_id : item.monitor_id
            data.hour_start = item.hour_start
            data.hour_end = this.calculateHourEnd(item.hour_start, this.selectedItem.duration) //calcular en base a la duracion del curso

            data.currency = item.currency

            data.course = this.selectedItem
            data.date = moment(item.date, 'YYYY-MM-DD').format('YYYY-MM-DD')
            let people = [];
            if (this.personsSelectedMultiple[item.course_date_id]?.[item.hour_start]) {
              people = this.personsSelectedMultiple[item.course_date_id][item.hour_start]
              data.people = people;
            }
            data.paxes = people.length + 1
            data.price = parseFloat(item.price)
            data.price_total = price;
            data.courseDates.push(data);
            this.bookingsToCreate.push(data);
          });
        }

        if (this.courseTypeId !== 2) {
          this.bookingsToCreate.unshift(data);
        }
        this.showDetail = this.bookingsToCreate.length - 1;

        this.selectedItem = null;
        this.selectedCourseDateItem = null;
        this.selectedSubGroupItem = null;
        this.selectedSubGroupItemIndex = null;
        this.reservableCourseDate = [];
        this.clientsForm.disable();
      }, (error) => {
        this.snackbar.open(this.translateService.instant('snackbar.booking.overlap') +
          moment(error.error.data[0].date).format('YYYY-MM-DD') + ' | ' + error.error.data[0].hour_start + ' - ' + error.error.data[0].hour_end, 'OK', { duration: 3000 })
      });



  }

  save() {
    this.bookingComplete = true;
    this.addAnotherCourse();
    this.calculateFinalPrice();
    //this.create();
  }

  create() {

    this.loading = true;
    let data: any = {};
    const courseDates = [];
    const bookingExtras = [];

    this.bookingsToCreate.forEach((element, idx) => {
      element.courseDates.forEach(cs => {
        courseDates.push(cs);
        if (element.forfait) {

          bookingExtras.push({ forfait: element.forfait, course_date_id: cs.course_date_id });
        }
      });

      let paxes = 1;

      if (element.paxes && !isNaN(element.paxes)) {

        paxes = paxes + element.paxes;
      }
      data = {
        price_total: this.finalPrice,
        has_cancellation_insurance: this.defaults.has_cancellation_insurance,
        has_boukii_care: this.defaults.has_boukii_care,
        price_boukii_care: this.defaults.has_boukii_care ? this.defaults.price_boukii_care : 0,
        price_cancellation_insurance: this.defaults.has_cancellation_insurance ? this.defaults.price_cancellation_insurance : 0,
        has_tva: this.tvaPrice > 0,
        price_tva: this.tvaPrice,
        has_reduction: this.reduction !== null,
        price_reduction: this.reduction !== null ? this.reduction.appliedPrice : 0,
        currency: element.currency,
        paid_total: this.defaults.paid || this.defaults.payment_method_id === 1 ? this.finalPrice : 0,
        paid: element.paid,
        notes: element.notes,
        notes_school: element.notes_school,
        school_id: element.school_id,
        client_main_id: element.client_main_id,
        paxes: paxes,
        payment_method_id: this.defaults.payment_method_id,
        source: 'admin',
        user_id: this.user.id,
        color: this.color
      }


    });

    const clientsWithoutSelectedSport = [];
    this.bookingsToCreate.forEach(element => {
      const client = this.allClients.find((c) => c.id === element.courseDates[0].client_id);
      const bookSport = client?.client_sports?.find((c) => c.sport_id === element.courseDates[0].course.sport_id);
      if (!bookSport || bookSport === null) {

        clientsWithoutSelectedSport.push({
          client_id: element.courseDates[0].client_id,
          sport_id: element.courseDates[0].course.sport_id,
          degree_id: element.courseDates[0].degree_id,
          school_id: this.user.schools[0].id
        })
      }
    });

    clientsWithoutSelectedSport.forEach(element => { this.crudService.create('/client-sports', element).subscribe(() => { }) });

    this.crudService.create('/bookings', data)
      .subscribe((booking) => {
        this.processBonus(booking.data.id);
        let rqs = [];

        courseDates.forEach(item => {
          if (item.course.course_type === 1) {

            if (this.canBook(item.date)) {
              rqs.push({
                school_id: item.school_id,
                booking_id: booking.data.id,
                client_id: item.client_id,
                course_id: item.course_id,
                course_subgroup_id: item.subgroup_id,
                course_group_id: item.group_id,
                course_date_id: item.course_date_id,
                degree_id: item.degree_id,
                monitor_id: item.monitor_id,
                hour_start: item.hour_start,
                hour_end: item.hour_end,
                price: item.price,
                currency: item.currency,
                date: item.date,
                notes: item.notes,
                school_notes: item.school_notes,
                attended: false
              });
            }
          }

          if (item.course.course_type === 2) {
            rqs.push({
              school_id: item.school_id,
              booking_id: booking.data.id,
              client_id: item.client_id,
              course_id: item.course_id,
              course_date_id: item.course_date_id,
              monitor_id: item.monitor_id,
              hour_start: item.hour_start,
              hour_end: item.hour_end, //calcular en base a la duracion del curso
              price: item.price,
              currency: item.currency,
              paxes: item.paxes,
              notes: item.notes,
              school_notes: item.school_notes,
              degree_id: this.levelForm.value.id,
              date: moment(item.date, 'YYYY-MM-DD').format('YYYY-MM-DD')
            });
            let bookingC = this.bookingsToCreate.find((b) => b.course_date_id === item.course_date_id && b.hour_start == item.hour_start)
            if (bookingC?.people?.length) {
              bookingC.people.forEach(person => {
                rqs.push({
                  school_id: item.school_id,
                  booking_id: booking.data.id,
                  client_id: person.id,
                  course_id: item.course_id,
                  course_date_id: item.course_date_id,
                  monitor_id: item.monitor_id,
                  hour_start: item.hour_start,
                  hour_end: item.hour_end, //calcular en base a la duracion del curso
                  price: 0,
                  currency: item.currency,
                  paxes: item.paxes,
                  notes: item.notes,
                  school_notes: item.school_notes,
                  degree_id: item.degree_id,
                  date: moment(item.date, 'YYYY-MM-DD').format('YYYY-MM-DD')
                });
              })
            }
          }
        });

        rqs.forEach((rq, idx) => {
          const bExtra = bookingExtras.find((b) => b.course_date_id === rq.course_date_id);

          this.crudService.create('/booking-users', rq)
            .subscribe((bookingUser) => {
              if (bExtra) {
                const bookingUserExtra = {
                  booking_user_id: bookingUser.data.id,
                  course_extra_id: null,
                }
                const courseExtra = {
                  course_id: rq.course_id,
                  name: bExtra.forfait.id,
                  description: bExtra.forfait.name,
                  price: bExtra.forfait.price + ((bExtra.forfait.price * bExtra.forfait.tva) / 100),
                }
                this.crudService.create('/course-extras', courseExtra)
                  .subscribe((responseCourseExtra) => {
                    bookingUserExtra.course_extra_id = responseCourseExtra.data.id;
                    this.crudService.create('/booking-user-extras', bookingUserExtra).subscribe((bookExtra) => { })
                  })
              }
            });
        });
        setTimeout(() => {

          if (this.defaults.payment_method_id === 2 || this.defaults.payment_method_id === 3) {

            const bonuses = [];
            const extras = [];
            this.bonus.forEach(element => {
              bonuses.push(
                {
                  name: element.bonus.code,
                  quantity: 1,
                  price: -(element.bonus.quantity)
                }
              )
            });

            bookingExtras.forEach(element => {
              extras.push({ name: element.name, quantity: 1, price: parseFloat(element.price) });
            });

            const basket = {
              payment_method_id: this.defaults.payment_method_id,
              price_base: { name: this.bookingsToCreate.length > 1 ? 'MULTI' : this.bookingsToCreate[0].courseDates[0].course.name, quantity: 1, price: this.getBasePrice() },
              bonus: { total: this.bonus.length, bonuses: bonuses },
              reduction: { name: 'Reduction', quantity: 1, price: -(this.reduction) },
              boukii_care: { name: 'Boukii Care', quantity: 1, price: parseFloat(this.defaults.price_boukii_care) },
              cancellation_insurance: { name: 'Cancellation Insurance', quantity: 1, price: parseFloat(this.defaults.price_cancellation_insurance) },
              extras: { total: bookingExtras.length, extras: extras },
              tva: { name: 'TVA', quantity: 1, price: this.tvaPrice },
              price_total: parseFloat(this.finalPrice),
              paid_total: parseFloat(this.finalPrice),
              pending_amount: parseFloat(this.finalPrice)
            }

            this.crudService.update('/bookings', { basket: JSON.stringify(basket) }, booking.data.id)
              .subscribe(() => {

              })

            this.crudService.post('/admin/bookings/payments/' + booking.data.id, basket)
              .subscribe((result: any) => {
                if (this.defaults.payment_method_id === 2) {

                  window.open(result.data, "_self");
                } else {
                  this.goTo('/bookings/update/' + booking.data.id);
                }
                this.snackbar.open(this.translateService.instant('snackbar.booking.create'), 'OK', { duration: 3000 });
              })
          } else if (this.defaults.payment_method_id === 1 || this.defaults.payment_method_id === 4) {

            this.crudService.update('/bookings', {
              payment_method_id: this.defaults.payment_method_id,
              paid: this.defaults.paid, paid_total: this.defaults.paid ? this.finalPrice : 0
            }, booking.data.id)
              .subscribe(() => {

                this.crudService.create('/payments', { booking_id: booking.data.id, school_id: this.user.schools[0].id, amount: this.finalPrice, status: 'paid', notes: this.defaults.payment_method_id === 1 ? 'cash' : 'other' })
                  .subscribe(() => {

                    this.snackbar.open(this.translateService.instant('snackbar.booking.create'), 'OK', { duration: 1000 });
                    this.dialogRef.close();
                    //this.goTo('/bookings/update/'+booking.data.id);
                  })
              })
          } else {
            this.snackbar.open(this.translateService.instant('snackbar.booking.create'), 'OK', { duration: 1000 });
            this.dialogRef.close();
            //this.goTo('/bookings/update/'+booking.data.id);
          }

          this.crudService.post('/admin/bookings/mail/' + booking.data.id, {})
            .subscribe((data) => { })
        }, 1000);
      })

  }

  processBonus(bookingId: any) {
    if (this.bonus.length > 0) {
      this.bonus.forEach(element => {
        const data = {
          code: element.bonus.code,
          quantity: element.bonus.quantity,
          remaining_balance: element.bonus.quantity - element.bonus.reducePrice,
          payed: element.bonus.quantity - element.bonus.reducePrice === 0,
          client_id: element.bonus.client_id,
          school_id: this.user.schools[0].id
        };
        this.crudService.update('/vouchers', data, element.bonus.id)
          .subscribe((result) => {

            this.crudService.create('/vouchers-logs', { voucher_id: result.data.id, booking_id: bookingId, amount: element.bonus.reducePrice })
              .subscribe((vresult) => { })
          })
      });
    }
  }

  convertToInt(value: any) {
    return parseFloat(value);
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  update() {
    const booking = this.form.value;
    booking.id = this.defaults.id;

  }

  isCreateMode() {
    return this.mode === 'create';
  }

  isUpdateMode() {
    return this.mode === 'update';
  }


  // pasar a utils
  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.clients.filter(client => (client.first_name.toLowerCase().includes(filterValue) || client.last_name.toLowerCase().includes(filterValue)));
  }

  private _filterMonitor(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.monitors.filter(monitor => monitor.full_name.toLowerCase().includes(filterValue));
  }

  private _filterLevel(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.levels.filter(level => level.annotation.toLowerCase().includes(filterValue));
  }

  private _filterSport(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.sportData.filter(sport => sport.name.toLowerCase().includes(filterValue));
  }

  private _filterTime(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.times.filter(time => time.toLowerCase().includes(filterValue));
  }

  displayFn(client: any): string {
    return client && (client?.first_name && client?.last_name) ? client?.first_name + ' ' + client?.last_name : client?.first_name;
  }

  displayFnMoniteurs(monitor: any): string {
    return monitor && monitor.first_name && monitor.last_name ? monitor.first_name + ' ' + monitor.last_name : '';
  }

  displayFnSport(sport: any): string {
    return sport && sport.name ? sport.name : '';
  }

  displayFnLevel(level: any): string {
    return level && level?.name && level?.annotation ? level?.annotation + ' ' + level?.name : level?.name;
  }

  displayFnTime(time: any): string {
    return time && time.name ? time.name : '';
  }

  generateTimes(): string[] {
    let times = [];
    let dt = new Date(2023, 0, 1, 8, 0, 0, 0);
    const end = new Date(2023, 0, 1, 17, 55, 0, 0);

    while (dt <= end) {
      const time = ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2);
      times.push(time);
      dt.setMinutes(dt.getMinutes() + 5); // Incrementa en 5 minutos
    }
    return times;
  }

  openBookingModal() {

    const dialogRef = this.dialog.open(this.createComponent, {
      width: '90vw',
      height: '90vh',
      maxWidth: '100vw',  // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog'  // Si necesitas estilos adicionales
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {

      }
    });
  }

  selectMainUser(user: any) {
    this.defaultsBookingUser.client_id = user.id;
    const client = this.clients.find((c) => c.id === user.id);

    client.client_sports.forEach(sport => {

      if (sport.sport_id === this.defaults.sport_id && sport.school_id === this.user.schools[0].id) {
        const level = this.levels.find((l) => l.id === sport.degree_id);
        this.levelForm.patchValue(level);
        this.defaultsBookingUser.degree_id = level.id;
        this.getCourses(level, this.monthAndYear);
      }
    });
  }

  toggleBorder(index: number, utilizer: any) {
    this.mainIdSelected = false;
    this.borderActive = index;
    this.defaultsBookingUser.client_id = utilizer.id;
    const client = this.allClients.find((c) => c.id === utilizer.id);


    if (client && client?.client_sports?.length > 0) {
      let hasSport = false;
      client.client_sports.forEach(sport => {

        if (sport.sport_id === this.defaults.sport_id && sport.school_id === this.user.schools[0].id) {
          const level = this.levels.find((l) => l.id === sport.degree_id);
          this.levelForm.patchValue(level);
          this.defaultsBookingUser.degree_id = level.id;
          hasSport = true;
          this.getCourses(level, this.monthAndYear);
        }
      });

      /*if (!hasSport) {
        this.courses = [];
          this.snackBarRef = this.snackbar.open(this.translateService.instant('snackbar.booking.no_sport_1') + this.selectedSport.name + this.translateService.instant('snackbar.booking.no_sport_2'), this.translateService.instant('yes'), {duration: 10000});
          this.snackBarRef.onAction().subscribe(() => {
            this.addSportToUser(this.selectedSport.sport_id);
          });
      }*/
    } else {
      /*this.snackBarRef = this.snackbar.open(this.translateService.instant('snackbar.booking.no_sport_3'), this.translateService.instant('yes'), {duration: 10000});
      this.snackBarRef.onAction().subscribe(() => {
        this.addSportToUser(this.selectedSport.sport_id);
      });*/
    }

  }

  showDetailFn(id: number) {
    this.showDetail = id;
  }

  getClients() {
    return this.crudService.list('/admin/clients/mains', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id + '&active=1');/*
      .subscribe((data: any) => {
        this.clients = data.data;
        this.loading = false;

      })*/
  }

  getClientsAll() {
    return this.crudService.list('/clients', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id, '&with[]=clientSports');/*
      .subscribe((data: any) => {
        this.clients = data.data;
        this.loading = false;

      })*/
  }

  getSportsType() {
    return this.crudService.list('/sport-types', 1, 1000);/*
      .subscribe((data) => {
        this.sportTypeData = data.data.reverse();
      });*/
  }

  getSports() {
    this.crudService.list('/school-sports', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .subscribe((sport) => {
        this.sportData = sport.data.reverse();
        this.sportData.forEach(element => {
          this.crudService.get('/sports/' + element.sport_id)
            .subscribe((data) => {
              element.name = data.data.name;
              element.icon_selected = data.data.icon_selected;
              element.icon_unselected = data.data.icon_unselected;
              element.sport_type = data.data.sport_type;
            });
        });

      })

  }

  selectSport(sport: any) {
    if (this.snackBarRef !== null) {

      this.snackBarRef.dismiss();
    }
    this.defaults.sport_id = sport.sport_id;
    this.form.get("sport").patchValue(sport.sport_id);
    this.selectedSport = sport;
    this.courses = [];
    this.getDegrees(sport.sport_id);
  }

  getDegrees(sportId: number) {
    this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.user.schools[0].id + '&sport_id=' + sportId + '&active=1')
      .subscribe((data) => {
        this.levels = data.data.sort((a, b) => a.degree_order - b.degree_order);

        this.filteredLevel = this.levelForm.valueChanges.pipe(
          startWith(''),
          map((value: any) => typeof value === 'string' ? value : value?.annotation),
          map(annotation => annotation ? this._filterLevel(annotation) : this.levels.slice())
        );
        let hasSport = false;
        const client = this.allClients.find((c) => c.id === this.defaultsBookingUser.client_id);

        if (client) {
          client.client_sports.forEach(sport => {
            if (sport.sport_id === this.defaults.sport_id && sport.school_id === this.user.schools[0].id) {
              const level = this.levels.find((l) => l.id === sport.degree_id);
              this.levelForm.patchValue(level);
              this.defaultsBookingUser.degree_id = level.id;
              hasSport = true;
              this.getCourses(level, this.monthAndYear);
            }
          });
        }


        /*if (!hasSport && client.client_sports.length === 0) {
          this.snackBarRef = this.snackbar.open(this.translateService.instant('snackbar.booking.no_sport_3'), this.translateService.instant('yes'), {duration: 10000});
          this.snackBarRef.onAction().subscribe(() => {
            this.addSportToUser(this.selectedSport.sport_id);
          });
        } else if(!hasSport && client.client_sports.length > 0) {
          this.courses = [];
          this.snackBarRef = this.snackbar.open(this.translateService.instant('snackbar.booking.no_sport_1') + this.selectedSport.name + this.translateService.instant('snackbar.booking.no_sport_2'), this.translateService.instant('yes'), {duration: 10000});
          this.snackBarRef.onAction().subscribe(() => {
            this.addSportToUser(this.selectedSport.sport_id);
          });
        }*/
      })
  }


  addSportToUser(sportId = null) {

    const dialogRef = this.dialog.open(AddClientSportModalComponent, {
      maxWidth: '100vw',  // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales,
      data: { sport_id: sportId, title: 'Assign sport' }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {

        data.data.forEach(element => {

          this.crudService.create('/client-sports', { client_id: this.defaultsBookingUser.client_id, sport_id: element.sport_id, degree_id: element.level.id, school_id: this.user.schools[0].id })
            .subscribe(() => {
              this.crudService.list('/admin/clients/mains', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id + '&active=1')
                .subscribe((cl) => {
                  this.clients = cl.data;
                  const client = this.allClients.find((c) => c.id === this.defaultsBookingUser.client_id);
                  client.client_sports.forEach(sport => {
                    if (sport.sport_id === this.defaults.sport_id && sport.school_id === this.user.schools[0].id) {
                      const level = this.levels.find((l) => l.id === sport.degree_id);
                      this.levelForm.patchValue(level);
                      this.defaultsBookingUser.degree_id = level.id;
                      this.getCourses(level, this.monthAndYear);
                    }
                  });
                })
            })
        });
      }
    });
  }
  getUtilzers(client: any, onLoad = false, event: any = { isUserInput: true }) {
    if (event.isUserInput) {
      if (this.snackBarRef !== null) {

        this.snackBarRef.dismiss();
      }

      this.loadingUtilizers = true;
      this.utilizers = [];
      this.mainIdSelected = true;
      this.borderActive = -1;
      this.defaultsBookingUser.client_id = client.id;

      this.crudService.get('/admin/clients/' + client.id + '/utilizers')
        .subscribe((data: any) => {
          this.utilizers = data.data;
          if (!onLoad) {
            client.client_sports.forEach(sport => {
              if (sport.sport_id === this.defaults.sport_id && sport.school_id === this.user.schools[0].id) {
                const level = this.levels.find((l) => l.id === sport.degree_id);

                if (level) {
                  this.levelForm.patchValue(level);
                  this.defaultsBookingUser.degree_id = level?.id;
                  this.clientsForm.patchValue(client);
                  this.getCourses(level, this.monthAndYear)
                }
                ;
              }
            });
          }

          //this.getDegrees(this.defaults.sport_id);
          this.loadingUtilizers = false
        });
    }

  }

  getCourses(level: any, date: any, fromPrivate = false) {

    this.loadingCalendar = true;
    this.dateClass();
    this.privateDateClass();
    let today, minDate, maxDate;

    if (!fromPrivate) {
      if (date === null) {
        today = moment();
        minDate = moment().startOf('month').isBefore(today) ? today : moment().startOf('month');
        maxDate = moment().endOf('month');
      } else {
        today = moment();
        minDate = moment(date).startOf('month').isBefore(today) ? today : moment(date).startOf('month');
        maxDate = moment(date).endOf('month');
      }
    } else {
      minDate = moment(date);
      maxDate = moment(date);
    }

    const rq = {
      start_date: minDate.format('YYYY-MM-DD'),
      end_date: maxDate.format('YYYY-MM-DD'),
      course_type: this.courseTypeId,
      sport_id: this.form.value.sport,
      client_id: this.defaultsBookingUser.client_id,
      degree_id: level.id,
      get_lower_degrees: false,
      school_id: this.user.schools[0].id
    };

    this.crudService.post('/availability', rq)
      .subscribe((data) => {

        this.defaultsBookingUser.degree_id = level.id;
        this.courses = data.data;

        if (!fromPrivate) {

          this.coursesMonth = data.data;
        }

        if (this.courses.length === 0) {
          this.snackbar.open(this.translateService.instant('snackbar.booking.no_courses'), 'OK', { duration: 1500 });
        }
        this.loading = false;
        this.loadingCalendar = false;
      })
  }

  calculateAge(birthDateString) {
    if (birthDateString && birthDateString !== null) {
      const today = new Date();
      const birthDate = new Date(birthDateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } else {
      return 0;
    }

  }

  emitDateChange(event: any, fromPrivate = false): void {
    this.selectedItem = null;
    this.monthAndYear = moment(this.minDate).isAfter(moment(event.value)) ? this.minDate : event.value;
    this.getCourses(this.levelForm.value.id, this.monthAndYear, fromPrivate);
  }

  getMonitors() {
    this.crudService.list('/monitors', 1, 10000, 'asc', 'first_name', '&school_id=' + this.user.schools[0].id)
      .subscribe((data) => {
        this.monitors = data.data;
      })
  }

  addTimeToDate(timeString: any) {
    const match = timeString.match(/(\d+)h (\d+)min/);

    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);

      // Suponiendo que 'fecha' es tu fecha actual en Moment.js
      let fecha = moment();
      fecha.add(hours, 'hours').add(minutes, 'minutes');

      return fecha;
    } else {
      throw new Error('Formato de tiempo inválido');
    }
  }

  getSeason() {
    this.crudService.list('/seasons', 1, 10000, 'asc', 'id', '&school_id=' + this.user.schools[0].id + '&is_active=1')
      .subscribe((season) => {
        this.season = season.data[0];
        this.holidays = this.season.vacation_days !== null && this.season.vacation_days !== '' ? JSON.parse(this.season.vacation_days) : [];

        this.holidays.forEach(element => {
          this.myHolidayDates.push(moment(element).toDate());
        });
      })
  }

  getSchool() {
    this.crudService.get('/schools/' + this.user.schools[0].id)
      .subscribe((school) => {
        this.school = school.data;
        this.settings = JSON.parse(school.data.settings);

        this.cancellationInsurance = parseFloat(this.settings?.taxes?.cancellation_insurance_percent);
        this.boukiiCarePrice = parseInt(this.settings?.taxes?.boukii_care_price);
        this.tva = parseFloat(this.settings?.taxes?.tva);
      })
  }

  dateClass() {

    return (date: Date): MatCalendarCellCssClasses => {
      const dates = this.compareCourseDates();
      const currentDate = moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD');
      if (dates.indexOf(currentDate) !== -1 && moment(this.minDate, 'YYYY-MM-DD').startOf('day').isSameOrBefore(moment(date, 'YYYY-MM-DD').startOf('day'))) {
        return 'with-course';
      } else {
        return;
      }

    };
  }

  privateDateClass() {

    return (date: Date): MatCalendarCellCssClasses => {
      const dates = this.comparePrivateCourseDates();
      const currentDate = moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD');
      if (dates.indexOf(currentDate) !== -1 && moment(this.minDate).startOf('day').isSameOrBefore(moment(date).startOf('day'))) {
        return 'with-course-private';
      } else {
        return;
      }

    };
  }

  canBook(date: any) {
    const incomingDate = moment(date, 'YYYY-MM-DD').startOf('day');
    const minDate = moment(this.minDate, 'YYYY-MM-DD').startOf('day');
    return incomingDate.isSameOrAfter(minDate);
  }

  getLevelColor(id: any) {
    if (id && id !== null) {
      return this.levels.find((l) => l.id === id).color;

    }
  }

  getLevelOrder(id: any) {
    if (id && id !== null) {
      return this.levels.find((l) => l.id === id).degree_order;

    }
  }

  getLevelName(id: any) {
    if (id && id !== null) {

      const level = this.levels.find((l) => l.id === id);
      return level?.annotation + ' - ' + level?.name;
    }
  }

  getMonitorAvatar(id: number) {

    if (id && id === null) {
      return this.userAvatar;
    } else {

      const monitor = this.monitors.find((m) => m.id === id);
      return monitor?.image ? monitor.image : this.userAvatar;
    }
  }

  getMonitorName(id: number) {
    if (id && id !== null) {

      const monitor = this.monitors.find((m) => m.id === id);

      return monitor?.first_name + ' ' + monitor?.last_name;
    }
  }

  getMonitorLang(id: number) {
    if (id && id !== null) {

      const monitor = this.monitors.find((m) => m.id === id);

      return +monitor?.language1_id;
    }
  }

  getClientLang(id: number) {
    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      return +client?.language1_id;
    }
  }

  getClientProvince(id: number) {
    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      return +client?.province;
    }
  }

  getMonitorProvince(id: number) {
    if (id && id !== null) {

      const monitor = this.monitors.find((m) => m.id === id);

      return +monitor?.province;
    }
  }

  getMonitorBirth(id: number) {
    if (id && id !== null) {

      const monitor = this.monitors.find((m) => m.id === id);

      return monitor?.birth_date;
    }
  }

  getClientAvatar(id: number) {

    if (id === null) {
      return this.userAvatar;
    } else {

      const client = this.allClients.find((m) => m.id === id);
      return client?.image !== '' && client?.image !== null ? client?.image : this.userAvatar;
    }
  }

  getUtilizer(id: any) {
    if (id !== null) {

      return this.utilizers.find((u) => u.id === id);
    }
  }

  getClientName(id: number) {
    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      return client?.first_name + ' ' + client?.last_name;
    }
  }

  getClient(id: number) {
    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      return client;
    }
  }

  getCourse(id: number) {

    if (id && id !== null) {
      const course = this.courses.find((m) => m.id === id);

      return course;
    }

  }


  getClientAvatarUtilizer(id: number) {

    if (id === null) {
      return this.userAvatar;
    } else {

      const client = this.allClients.find((m) => m.id === id);
      if (client) {

        return client?.image !== '' && client?.image !== null ? client?.image : this.userAvatar;
      } else {
        const utilizer = this.getUtilizer(id);
        return utilizer?.image !== '' ? utilizer?.image : this.userAvatar;

      }
    }
  }

  getLanguageUtilizer(id: any) {
    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      if (client) {
        const lang = this.languages.find((c) => c.id == client?.language1_id);
        return lang ? lang.code.toUpperCase() : 'NDF';
      } else {
        const utilizer = this.getUtilizer(id);

        const lang = this.languages.find((c) => c.id == utilizer?.language1_id);
        return lang ? lang.code.toUpperCase() : 'NDF';
      }
    }
  }

  getCountryUtilizer(id: any) {
    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      if (client) {
        const country = this.countries.find((c) => c.id == client?.country);
        return country ? country.name : 'NDF';
      } else {
        const utilizer = this.getUtilizer(id);

        const country = this.countries.find((c) => c.id == utilizer?.country);
        return country ? country.name : 'NDF';
      }
    }
  }

  calculateAgeUtilizer(id) {

    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      if (client) {
        if (client?.birth_date && client?.birth_date !== null) {
          const today = new Date();
          const birthDate = new Date(client?.birth_date);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          return age;
        } else {
          return 0;
        }
      } else {
        const utilizer = this.getUtilizer(id);

        if (utilizer?.birth_date && utilizer?.birth_date !== null) {
          const today = new Date();
          const birthDate = new Date(utilizer.birth_date);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          return age;
        } else {
          return 0;
        }
      }
    }


  }

  getClientNameUtilizer(id: number) {
    if (id && id !== null) {

      const client = this.allClients.find((m) => m.id === id);

      if (client) {

        return client?.first_name + ' ' + client?.last_name;
      } else {
        const utilizer = this.getUtilizer(id);
        return utilizer?.first_name + ' ' + utilizer?.last_name;

      }

    }
  }

  compareCourseDates() {
    let ret = [];
    this.courses.forEach(course => {
      course.course_dates.forEach(courseDate => {
        ret.push(moment(courseDate.date, 'YYYY-MM-DD').format('YYYY-MM-DD'));
      });
    });

    return ret;
  }

  comparePrivateCourseDates() {
    let ret = [];
    this.coursesMonth.forEach(course => {
      course.course_dates.forEach(courseDate => {
        ret.push(moment(courseDate.date, 'YYYY-MM-DD').format('YYYY-MM-DD'));
      });
    });

    return ret;
  }

  handleDateChange(event: any) {
    this.selectedDate = event;
    this.getCourses(this.levelForm.value, event, true);
  }

  handleMonthChange(firstDayOfMonth: Date) {
    this.selectedItem = null;
    this.monthAndYear = moment(this.minDate).isAfter(moment(firstDayOfMonth)) ? this.minDate : firstDayOfMonth;
    this.getCourses(this.levelForm.value, this.monthAndYear);
  }

  setClientsNotes(event: any, item: any) {
    item.courseDates.forEach(element => {
      element.school_notes = event.target.value;

    });
  }

  setSchoolNotes(event: any, item: any) {

    item.courseDates.forEach(element => {
      element.school_notes = event.target.value;

    });
  }

  public monthChanged(value: any, widget: any): void {
    this.selectedItem = null;
    this.monthAndYear = moment(this.minDate).isAfter(moment(value)) ? this.minDate : value;
    this.getCourses(this.levelForm.value.id, this.monthAndYear);

    widget.close();
  }

  checkAllFields() {
    let ret = false;

    for (let i = 0; i < this.courseDates.length; i++) {
      if ((!this.courseDates[i].date && this.courseDates[i].date === null) || this.courseDates[i].hour_start === null) {
        if (this.sameMonitor && this.courseDates[0].monitor_id === null) {
          ret = true;
          break;
        }
        ret = true;
        break;
      }
    }

    return ret;
  }

  getBookableCourses(dates: any) {
    return dates.find((d) => this.canBook(d.date))?.course_groups;
  }

  calculateHourEnd(hour: any, duration: any) {
    if (duration.includes('h') && (duration.includes('min') || duration.includes('m'))) {
      const hours = duration.split(' ')[0].replace('h', '');
      const minutes = duration.split(' ')[1].replace('min', '').replace('m', '');

      return moment(hour, 'HH:mm').add(hours, 'h').add(minutes, 'm').format('HH:mm');
    } else if (duration.includes('h')) {
      const hours = duration.split(' ')[0].replace('h', '');

      return moment(hour, 'HH:mm').add(hours, 'h').format('HH:mm');
    } else {
      const minutes = duration.split(' ')[0].replace('min', '').replace('m', '');

      return moment(hour, 'HH:mm').add(minutes, 'm').format('HH:mm');
    }
  }

  getAvailableWeekDays(settings: any) {
    if (settings !== null) {
      const data = typeof settings === 'string' ? JSON.parse(settings) : settings;
      let ret = null;
      if (data !== null) {
        if (data.weekDays.monday) {
          ret = ret === null ? 'Monday' : ret + ' - ' + 'Monday';
        }
        if (data.weekDays.tuesday) {
          ret = ret === null ? 'Tuesday' : ret + ' - ' + 'Tuesday';
        }
        if (data.weekDays.wednesday) {
          ret = ret === null ? 'Wednesday' : ret + ' - ' + 'Wednesday';
        }
        if (data.weekDays.thursday) {
          ret = ret === null ? 'Thursday' : ret + ' - ' + 'Thursday';
        }
        if (data.weekDays.friday) {
          ret = ret === null ? 'Friday' : ret + ' - ' + 'Friday';
        }
        if (data.weekDays.saturday) {
          ret = ret === null ? 'Saturday' : ret + ' - ' + 'Saturday';
        }
        if (data.weekDays.sunday) {
          ret = ret === null ? 'Sunday' : ret + ' - ' + 'Sunday';
        }
      }
      return ret;
    }

  }

  getBasePrice() {
    let ret = 0;

    this.bookingsToCreate.forEach(element => {
      ret = ret + ((!element.courseDates[0].course.is_flexible && element.courseDates[0].course.course_type === 2)
        ? element.price_total * element.courseDates.length : element.price_total);
    });

    return ret;
  }

  setForfait(event: any, forfait: any, booking: any, bookingIndex: number) {

    if (event.source.checked) {
      booking.forfait = forfait;
      this.calculateFinalPrice();
    } else {
      booking.forfait = null;
      this.calculateFinalPrice();
    }
  }

  deleteBooking(index: number) {


    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      maxWidth: '100vw',  // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales,
      data: { message: this.translateService.instant('delete_text'), title: this.translateService.instant('delete_title') }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {

        this.bookingsToCreate.splice(index, 1);

        if (this.bookingsToCreate.length === 0) {
          this.clientsForm.enable();
          this.bookingComplete = false;
        }
      }
    });
  }

  addBonus() {
    const dialogRef = this.dialog.open(AddDiscountBonusModalComponent, {
      width: '600px',
      data: {
        client_id: this.bookingsToCreate[0].client_main_id,
        school_id: this.bookingsToCreate[0].school_id,
        currentPrice: this.finalPriceNoTaxes,
        appliedBonus: this.bonus,
        currency: this.bookingsToCreate[0].currency
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.calculateFinalPrice();
        this.bonus.push(result);
        this.calculateFinalPrice();
      }
    });
  }

  addReduction() {
    const dialogRef = this.dialog.open(AddReductionModalComponent, {
      width: '300px',
      data: {
        currentPrice: this.finalPriceNoTaxes
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.calculateFinalPrice();
        this.reduction = result;
        this.reduction.appliedPrice = this.calculateReduction();
        this.calculateFinalPrice();
      }
    });
  }

  calculateReduction() {

    if (this.reduction.type === 1) {
      return (this.getBasePrice() * this.reduction.discount) / 100;
    } else {
      return this.reduction.discount > this.getBasePrice() ? this.getBasePrice() : this.reduction.discount;
    }
  }

  calculateBonusDiscount() {
    let ret = 0;
    this.bonus.forEach(element => {

      if (ret < this.finalPrice) {

        if (element.bonus.remaining_balance > this.finalPrice) {
          ret = this.getBasePrice();
        } else {
          ret = element.bonus.remaining_balance;
        }
      }
    });

    return ret;
  }


  calculateRem(event: any) {
    if (event.source.checked) {
      this.opRem = this.getBasePrice() * this.cancellationInsurance;
      this.defaults.has_cancellation_insurance = event.source.checked;
      this.defaults.price_cancellation_insurance = this.getBasePrice() * this.cancellationInsurance;
      this.calculateFinalPrice();
      return this.getBasePrice() * this.cancellationInsurance;
    } else {
      this.opRem = 0;
      this.defaults.has_cancellation_insurance = event.source.checked;
      this.defaults.price_cancellation_insurance = 0;
      this.calculateFinalPrice();
      return 0;
    }
  }

  calculateBoukiiCare(event: any) {
    if (event.source.checked) {
      this.boukiiCare = this.boukiiCarePrice * this.getBookingPaxes() * this.getBookingDates();
      this.calculateFinalPrice();
      this.defaults.has_boukii_care = event.source.checked;
      this.defaults.price_boukii_care = this.boukiiCarePrice * this.getBookingPaxes() * this.getBookingDates();
      return this.getBasePrice() + this.boukiiCarePrice;
    } else {
      this.boukiiCare = 0;
      this.calculateFinalPrice();
      this.defaults.has_boukii_care = event.source.checked;
      this.defaults.price_boukii_care = 0;
      return 0;
    }
  }

  addClient() {

    const dialogRef = this.dialog.open(ClientCreateUpdateModalComponent, {
      width: '1000px', // Asegurarse de que no haya un ancho máximo
      height: '1000px', // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales,
      data: { id: this.user.schools[0].id }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {

        this.crudService.list('/admin/clients/mains', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id + '&active=1')
          .subscribe((cl: any) => {
            const newClient = cl.data.find((c) => c.id = data.data.id);
            this.clientsForm.patchValue(newClient);
            this.defaults.client_main_id = newClient;
            this.getUtilzers(data.data.id, true);

          })

      }
    })
  }


  addUtilisateur() {

    const dialogRef = this.dialog.open(AddClientUserModalComponent, {
      width: '600px',  // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales,
      data: { id: this.user.schools[0].id }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {

        if (data.action === 'add') {
          this.crudService.create('/clients-utilizers', { client_id: data.ret, main_id: this.defaults.client_main_id.id })
            .subscribe((res) => {
              this.getUtilzers(this.defaults.client_main_id, true);
            })
        } else {
          const user = {
            username: data.data.name,
            email: this.defaults.client_main_id.email,
            password: this.passwordGen.generateRandomPassword(12),
            image: null,
            type: 'client',
            active: true,
          }

          const client = {
            email: this.defaults.client_main_id.email,
            first_name: data.data.name,
            last_name: data.data.surname,
            birth_date: moment(data.data.fromDate).format('YYYY-MM-DD'),
            phone: this.defaults.client_main_id.phone,
            telephone: this.defaults.client_main_id.telephone,
            address: this.defaults.client_main_id.address,
            cp: this.defaults.client_main_id.cp,
            city: this.defaults.client_main_id.city,
            province: this.defaults.client_main_id.province,
            country: this.defaults.client_main_id.country,
            image: null,
            language1_id: null,
            language2_id: null,
            language3_id: null,
            language4_id: null,
            language5_id: null,
            language6_id: null,
            user_id: null,
            station_id: this.defaults.client_main_id.station_id
          }

          this.setLanguages(data.data.languages, client);

          this.crudService.create('/users', user)
            .subscribe((user) => {
              client.user_id = user.data.id;

              this.crudService.create('/clients', client)
                .subscribe((clientCreated) => {
                  this.snackbar.open(this.translateService.instant('snackbar.client.create'), 'OK', { duration: 3000 });

                  this.crudService.create('/clients-schools', { client_id: clientCreated.data.id, school_id: this.user.schools[0].id, accepted_at: moment().toDate() })
                    .subscribe((clientSchool) => {

                      setTimeout(() => {
                        this.crudService.create('/clients-utilizers', { client_id: clientCreated.data.id, main_id: this.defaults.client_main_id.id })
                          .subscribe((res) => {
                            this.getUtilzers(this.defaults.client_main_id, true);
                          })
                      }, 1000);
                    });

                })
            })
        }
      }
    });

  }

  setLanguages(langs: any, dataToModify: any) {
    if (langs.length >= 1) {

      dataToModify.language1_id = langs[0].id;
    } if (langs.length >= 2) {

      dataToModify.language2_id = langs[1].id;
    } if (langs.length >= 3) {

      dataToModify.language3_id = langs[2].id;
    } if (langs.length >= 4) {

      dataToModify.language4_id = langs[3].id;
    } if (langs.length >= 5) {

      dataToModify.language5_id = langs[4].id;
    } if (langs.length === 6) {

      dataToModify.language6_id = langs[5].id;
    }
  }

  getLanguage(id: any) {
    const lang = this.languages.find((c) => c.id == +id);
    return lang ? lang.code.toUpperCase() : 'NDF';
  }

  getLanguages() {
    this.crudService.list('/languages', 1, 1000)
      .subscribe((data) => {
        this.languages = data.data.reverse();

      })
  }

  getCountry(id: any) {
    const country = this.countries.find((c) => c.id == id);
    return country ? country.name : 'NDF';
  }

  calculateFinalPrice() {
    let price = this.getBasePrice();

    //forfait primero

    this.bookingsToCreate.forEach(element => {
      if (element.forfait) {

        price = price + (element.forfait.price * element.courseDates.length * element.paxes) + (element.forfait.price * element.courseDates.length * element.paxes * (element.forfait.tva / 100));
      }
    });

    if (this.reduction !== null) {
      if (this.reduction.type === 1) {
        price = price - ((this.getBasePrice() * this.reduction.discount) / 100);
      } else {
        price = price - (this.reduction.discount > price ? this.getBasePrice() : this.reduction.discount);
      }
    }

    if (this.bonus !== null && price > 0) {
      this.bonus.forEach(element => {
        if (price > 0) {

          if (element.bonus.remaining_balance > price) {
            price = price - price;
          } else {
            price = price - element.bonus.remaining_balance;
          }
        }
      });
    }

    if (this.defaults.has_cancellation_insurance) {
      price = price + (this.getBasePrice() * this.cancellationInsurance);
    }

    if (this.defaults.has_boukii_care) {
      // coger valores de reglajes
      price = price + (this.boukiiCarePrice * this.getBookingPaxes() * this.getBookingDates());
    }

    // añadir desde reglajes el tva
    if (this.tva && !isNaN(this.tva)) {
      this.finalPrice = price + (price * this.tva);
      this.tvaPrice = (price * this.tva);
    } else {
      this.finalPrice = price;
    }
    this.finalPriceNoTaxes = price;
  }

  deleteBonus(index: number) {
    this.bonus.splice(index, 1);
    this.calculateFinalPrice();
  }

  filterByCourseHours(startTime: string, endTime: string, mainDuration: string, interval: string): string[] {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const intervalParts = interval.split(' ');
    const mainDurationParts = mainDuration.split(' ');

    let intervalHours = 0;
    let intervalMinutes = 0;
    let mainDurationHours = 0;
    let mainDurationMinutes = 0;

    intervalParts.forEach(part => {
      if (part.includes('h')) {
        intervalHours = parseInt(part, 10);
      } else if (part.includes('min')) {
        intervalMinutes = parseInt(part, 10);
      }
    });

    mainDurationParts.forEach(part => {
      if (part.includes('h')) {
        mainDurationHours = parseInt(part, 10);
      } else if (part.includes('min')) {
        mainDurationMinutes = parseInt(part, 10);
      }
    });

    let currentHours = startHours;
    let currentMinutes = startMinutes;
    const result = [];

    while (true) {
      let nextIntervalEndHours = currentHours + mainDurationHours;
      let nextIntervalEndMinutes = currentMinutes + mainDurationMinutes;

      nextIntervalEndHours += Math.floor(nextIntervalEndMinutes / 60);
      nextIntervalEndMinutes %= 60;

      if (nextIntervalEndHours > endHours || (nextIntervalEndHours === endHours && nextIntervalEndMinutes > endMinutes)) {
        break;
      }

      result.push(`${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`);

      currentMinutes += intervalMinutes;
      currentHours += intervalHours + Math.floor(currentMinutes / 60);
      currentMinutes %= 60;

      if (currentHours > endHours || (currentHours === endHours && currentMinutes >= endMinutes)) {
        break;
      }
    }

    return result.find((r) => r === this.externalData.hour);
  }

  generateCourseHours(startTime: string, endTime: string, mainDuration: string, interval: string): string[] {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const intervalParts = interval.split(' ');
    const mainDurationParts = mainDuration.split(' ');

    let intervalHours = 0;
    let intervalMinutes = 0;
    let mainDurationHours = 0;
    let mainDurationMinutes = 0;

    intervalParts.forEach(part => {
      if (part.includes('h')) {
        intervalHours = parseInt(part, 10);
      } else if (part.includes('min')) {
        intervalMinutes = parseInt(part, 10);
      }
    });

    mainDurationParts.forEach(part => {
      if (part.includes('h')) {
        mainDurationHours = parseInt(part, 10);
      } else if (part.includes('min')) {
        mainDurationMinutes = parseInt(part, 10);
      }
    });

    let currentHours = startHours;
    let currentMinutes = startMinutes;
    const result = [];

    while (true) {
      let nextIntervalEndHours = currentHours + mainDurationHours;
      let nextIntervalEndMinutes = currentMinutes + mainDurationMinutes;

      nextIntervalEndHours += Math.floor(nextIntervalEndMinutes / 60);
      nextIntervalEndMinutes %= 60;

      if (nextIntervalEndHours > endHours || (nextIntervalEndHours === endHours && nextIntervalEndMinutes > endMinutes)) {
        break;
      }

      result.push(`${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`);

      currentMinutes += intervalMinutes;
      currentHours += intervalHours + Math.floor(currentMinutes / 60);
      currentMinutes %= 60;

      if (currentHours > endHours || (currentHours === endHours && currentMinutes >= endMinutes)) {
        break;
      }
    }

    return result;
  }

  generateCourseDurations(startTime: any, endTime: any, interval: any) {


    if (interval.includes(':')) {
      interval = this.transformTime(interval);
    }
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const formatMinutes = (totalMinutes) => {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours > 0 ? hours + 'h' : ''} ${minutes > 0 ? minutes + 'm' : ''}`.trim();
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const intervalMatch = interval.match(/(\d+)(h|min)/g);
    let intervalTotalMinutes = 0;

    if (intervalMatch) {
      intervalMatch.forEach(part => {
        if (part.includes('h')) {
          intervalTotalMinutes += parseInt(part, 10) * 60;
        } else if (part.includes('min')) {
          intervalTotalMinutes += parseInt(part, 10);
        }
      });
    } else {
      console.error("Interval format is not correct.");
      return [];
    }

    const durations = [];
    for (let minutes = startMinutes + intervalTotalMinutes; minutes <= endMinutes; minutes += 5) {
      durations.push(formatMinutes(minutes - startMinutes));
    }

    const tableDurations = [];
    const tablePaxes = [];

    const priceRangeCourse = typeof this.selectedItem.price_range === 'string' ? JSON.parse(this.selectedItem.price_range) : this.selectedItem.price_range;
    durations.forEach(element => {
      const priceRange = priceRangeCourse ? priceRangeCourse.find((p) => p.intervalo === element) : null;
      if (priceRange && priceRange.intervalo === element) {

        if (this.extractValues(priceRange)[0] && (+this.extractValues(priceRange)[0].key) <= this.selectedItem.max_participants) {
          tableDurations.push(this.extractValues(priceRange)[0].interval);



          this.extractValues(priceRange).forEach(element => {
            const pax = element.key;

            if (pax && tablePaxes.length === 0 || pax && tablePaxes.length > 0 && !tablePaxes.find((p) => p === pax)) {
              tablePaxes.push(element.key);
            }
          });
        }

      }
    });

    this.durations = tableDurations;
    this.persons = tablePaxes;
  }

  calculateAvailablePaxes(event: any) {
    const paxes = [];

    const priceRange = typeof this.selectedItem.price_range === 'string' ? JSON.parse(this.selectedItem.price_range) : this.selectedItem.price_range;
    const data = priceRange.find(p => p.intervalo === event);

    this.extractValues(data).forEach(element => {
      const pax = element.key;

      if (pax && paxes.length === 0 || pax && paxes.length > 0 && !paxes.find((p) => p === pax)) {
        paxes.push(element.key);
      }
    });

    this.persons = paxes;
    this.personsToBook = [];
    if (this.mainIdSelected) {
      this.personsToBook = this.utilizers;

    } else {
      const data = this.utilizers.filter((u) => u.id !== this.defaultsBookingUser.client_id);
      data.push(this.defaults.client_main_id);

      this.personsToBook = data;
    }
  }

  calculatePaxesPrivateFix() {
    if (this.mainIdSelected) {
      this.personsToBook = this.utilizers;

    } else {
      const data = this.utilizers.filter((u) => u.id !== this.defaultsBookingUser.client_id);
      data.push(this.defaults.client_main_id);

      this.personsToBook = data;
    }
  }

  onSelectionChangePaxes(event: any, courseDate: any) {
    const value = event.source.value;

    // Verifica si this.personsSelectedMultiple[i] existe
    if (!this.personsSelectedMultiple[courseDate.course_date_id]) {
      // Si no existe, inicialízalo como un array vacío
      this.personsSelectedMultiple[courseDate.course_date_id] = [];
    }

    if (!this.personsSelectedMultiple[courseDate.course_date_id][courseDate.hour_start]) {
      // Si no existe, inicialízalo como un array vacío
      this.personsSelectedMultiple[courseDate.course_date_id][courseDate.hour_start] = [];
    }
    let personsSelected = this.personsSelectedMultiple[courseDate.course_date_id][courseDate.hour_start]
    const index = personsSelected.findIndex((p) => p.id === value.id);

    if (personsSelected.length + 1 >= this.getCourse(courseDate.course_id).max_participants && index === -1) {
      this.snackbar.open(this.translateService.instant('pax_limit_reached') + (+personsSelected.length + 1), 'OK', { duration: 3000 });
      return;
    } else {
      if (personsSelected.length === 0 || index === -1) {
        personsSelected.push(value);
      } else {
        personsSelected.pop(value)
      }
    }

    // Ahora puedes hacer lo que necesites con las personas seleccionadas
    courseDate.paxes = personsSelected.length;
    this.checkAvailableMonitors(courseDate.hour_start, courseDate.duration, courseDate.date);
  }

  extractValues(data: any): { key: string, value: string, interval: string }[] {
    let results = [];

    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] != null && key !== "intervalo") {
        results.push({ key: key, value: data[key], interval: data["intervalo"] });
      }
    }

    return results;
  }

  getBookingPaxes() {
    let ret = 0;
    this.bookingsToCreate.forEach(element => {
      ret = ret + element.paxes;
    });

    return ret;
  }

  getBookingDates() {
    let ret = 0;
    this.bookingsToCreate.forEach(element => {
      ret = ret + element.courseDates.length;
    });

    return ret;
  }

  itemExist(item: any) {
    return this.reservableCourseDate.find((r) => r.id === item.id);
  }

  checkAvailableMonitors(start: any, duration: any, date) {

    let data: any;
    if (this.selectedItem.is_flexible) {
      data = {
        sportId: this.defaults.sport_id,
        minimumDegreeId: this.levelForm.value.id,
        startTime: start,
        endTime: this.calculateHourEnd(start, duration),
        date: moment(date).format('YYYY-MM-DD'),
        clientIds: [this.clientsForm.value.id]
      };
    } else {
      data = {
        sportId: this.defaults.sport_id,
        minimumDegreeId: this.levelForm.value.id,
        startTime: start,
        endTime: this.calculateHourEnd(start, this.selectedItem.duration),
        date: moment(date).format('YYYY-MM-DD'),
        clientIds: [this.clientsForm.value.id]
      };
    }

    this.crudService.post('/admin/monitors/available', data)
      .subscribe((response) => {
        this.monitors = response.data;
        this.filteredMonitors = this.monitorsForm.valueChanges.pipe(
          startWith(''),
          map((value: any) => typeof value === 'string' ? value : value?.full_name),
          map(full_name => full_name ? this._filterMonitor(full_name) : this.monitors.slice())
        );

        if (response.data.length === 0) {

          this.snackbar.open(this.translateService.instant('snackbar.booking.no_match'), 'OK', { duration: 3000 });
        }
      })
  }

  isNanValue(value) {
    return isNaN(value);
  }

  getMaxDate() {
    return moment(this.selectedItem.course_dates[this.selectedItem.course_dates.length - 1].date).toDate();
  }

  setPaid(event: any) {
    this.defaults.paid = event.source.checked;
  }

  getAllDegrees() {
    this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.user.schools[0].id + '&active=1')
      .subscribe((data) => {
        this.allLevels = data.data;
      })
  }

  getDegree(id: any) {
    if (id && id !== null) {
      return this.allLevels.find((l) => l.id === id);

    }
  }
}
