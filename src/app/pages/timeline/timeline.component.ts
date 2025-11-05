import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  max,
  min,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks
} from 'date-fns';
import {ApiCrudService} from 'src/service/crud.service';
import {MonitorTransferPayload, MonitorsService} from 'src/service/monitors.service';
import {LEVELS} from 'src/app/static-data/level-data';
import {MOCK_COUNTRIES} from 'src/app/static-data/countries-data';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmModalComponent} from '../monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import {CalendarEditComponent} from '../monitors/monitor-detail/calendar/calendar-edit/calendar-edit.component';
import * as moment from 'moment';
import 'moment/locale/fr';
import {CourseDetailComponent} from '../courses-v2/course-detail/course-detail.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {
  CourseUserTransferTimelineComponent
} from './course-user-transfer-timeline/course-user-transfer-timeline.component';
import {TranslateService} from '@ngx-translate/core';
import {ConfirmUnmatchMonitorComponent} from './confirm-unmatch-monitor/confirm-unmatch-monitor.component';
import {firstValueFrom, Observable, of, Subject} from 'rxjs';
import {map, startWith, takeUntil} from 'rxjs/operators';
import {FormControl} from '@angular/forms';
import {DateAdapter} from '@angular/material/core';
import {Router} from '@angular/router';
import {EditDateComponent} from './edit-date/edit-date.component';
import {BookingDetailV2Component} from '../bookings-v2/booking-detail/booking-detail.component';
import {
  MonitorAssignmentDialogComponent,
  MonitorAssignmentDialogResult,
  MonitorAssignmentScope
} from './monitor-assignment-dialog/monitor-assignment-dialog.component';

moment.locale('fr');

@Component({
  selector: 'vex-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  hoursRange: string[];
  hoursRangeMinusLast: string[];
  hoursRangeMinutes: string[];

  monitorsForm: any[];

  loadingMonitors = true;
  loading = true;

  tasksCalendarStyle: any[];
  filteredTasks: any[];
  currentDate = new Date();
  timelineView: string = 'day';
  currentWeek: string = '';
  weekDays: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  currentMonth: string = '';
  weeksInMonth: any[] = [];
  firstDayOfMonth: number;

  allMonitors: any[] = [];
  allMonitorsTimeline: any[] = [];
  filteredMonitors: any[] = [];
  plannerTasks: any[] = [];
  vacationDays: any[];

  user: any = null;
  activeSchool: any = null;
  languages: any[] = [];
  sports: any[] = [];
  sportsReceived: any[] = [];
  degrees: any[] = [];
  showGrouped: boolean = false;
  groupedTasks: any[] = [];
  idGroupedTasks: any;
  hourGrouped: any;
  dateGrouped: any;
  showDetail: boolean = false;
  idDetail: any;
  hourDetail: any;
  dateDetail: any;
  monitorDetail: any;
  subgroupDetail: any;
  taskDetail: any;
  showBlock: boolean = false;
  idBlock: any;
  blockDetail: any;
  groupedByColor = {};
  colorKeys: string[] = []; // Aquí almacenaremos las claves de colores
  mockLevels = LEVELS;

  showEditMonitor: boolean = false;
  editedMonitor: any;
  moveTask: boolean = false;
  moving: boolean = false;
  taskMoved: any;
  showEditBlock: boolean = false;

  showFilter: boolean = false;
  checkedSports = new Set();
  filterMonitor: any = null;
  filterFree: boolean = true;
  filterOccupied: boolean = false;
  filterCollective: boolean = true;
  filterActivity: boolean = true;
  filterPrivate: boolean = true;
  filterNwd: boolean = true;
  filterBlockPayed: boolean = true;
  filterBlockNotPayed: boolean = true;

  allHoursDay: boolean = false;
  startTimeDay: string;
  endTimeDay: string;
  nameBlockDay: string;
  divideDay: boolean = false;
  startTimeDivision: string;
  endTimeDivision: string;
  searchDate: any;

  matchResults: { [monitorId: string]: boolean } = {};

  nullMonitor: any = { id: null };
  filterBookingUser: any;
  allBookingUsers: any[] = [];
  userControl = new FormControl();
  monitorControl = new FormControl();
  filteredUsers: Observable<any[]>;
  filteredMonitorsO: Observable<any[]>;

  monitorAssignmentScope: 'single' | 'interval' | 'all' | 'from' | 'range' = 'single';
  monitorAssignmentStartDate: string | null = null;
  monitorAssignmentEndDate: string | null = null;
  monitorAssignmentDates: { value: string, label: string }[] = [];

  constructor(private crudService: ApiCrudService, private monitorsService: MonitorsService, private dialog: MatDialog, public translateService: TranslateService,
    private snackbar: MatSnackBar, private dateAdapter: DateAdapter<Date>, private router: Router) {
    this.dateAdapter.setLocale(this.translateService.getDefaultLang());
    this.dateAdapter.getFirstDayOfWeek = () => { return 1; }
    this.mockLevels.forEach(level => {
      if (!this.groupedByColor[level.color]) {
        this.groupedByColor[level.color] = [];
      }
      this.groupedByColor[level.color].push(level);
    });

    this.colorKeys = Object.keys(this.groupedByColor);
  }

  async ngOnInit() {
    this.getData();

    this.filteredUsers = this.userControl.valueChanges
      .pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.first_name),
        map(name => name ? this._filter(name) : this.allBookingUsers.slice())
      );

    this.filteredMonitorsO = this.monitorControl.valueChanges
      .pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.first_name),
        map(name => name ? this._filterMonitor(name) : this.allMonitors.slice())
      );
  }

  displayFn(user: any): string {
    return user && user.first_name ? user.first_name + ' ' + user.last_name : '';
  }

  displayMonitorFn(user: any): string {
    return user && user.first_name ? user.first_name + ' ' + user.last_name : '';
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();

    return this.allBookingUsers.filter(option =>
      option?.first_name.toLowerCase().includes(filterValue) ||
      option?.last_name.toLowerCase().includes(filterValue)
    );
  }

  private _filterMonitor(name: string): any[] {
    const filterValue = name.toLowerCase();

    return this.allMonitors.filter(option =>
      option.id !== null && (
        option?.first_name.toLowerCase().includes(filterValue) ||
        option?.last_name.toLowerCase().includes(filterValue))
    );
  }

  setBookingUser(event: any, user: any) {
    if (event.isUserInput) {
      this.filterBookingUser = user;
    }
  }

  setMonitorUser(event: any, user: any) {
    if (event.isUserInput) {
      this.filterMonitor = user.id;
    }
  }

  goToTimeline(monitor: any) {
    // Navegar a la página de detalle del monitor con un parámetro adicional en la URL para seleccionar la pestaña
    this.router.navigate(['/monitors/update', monitor.id], { queryParams: { tab: 'timeline' } });
  }




  async getData() {
    this.loading = true;
    this.showGrouped = false;
    this.showDetail = false;
    //ESC to close moveMonitor
    document.addEventListener('keydown', this.handleKeydownEvent.bind(this));
    this.destroy$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      document.removeEventListener('keydown', this.handleKeydownEvent.bind(this));
    });
    //ESC to close moveMonitor

    this.activeSchool = await this.getUser();
    await this.getLanguages();
    await this.getSports();
    await this.getSchoolSports();
    await this.getDegrees();
    this.crudService.list('/seasons', 1, 10000, 'asc', 'id', '&school_id=' + this.user.schools[0].id + '&is_active=1')
      .subscribe((season) => {
        let hour_start = '08:00';
        let hour_end = '18:00';
        if (season.data.length > 0) {
          this.vacationDays = JSON.parse(season.data[0].vacation_days);
          hour_start = season.data[0].hour_start ? season.data[0].hour_start.substring(0, 5) : '08:00';
          hour_end = season.data[0].hour_end ? season.data[0].hour_end.substring(0, 5) : '18:00';
        }
        this.hoursRange = this.generateHoursRange(hour_start, hour_end);
        this.hoursRangeMinusLast = this.hoursRange.slice(0, -1);
        this.hoursRangeMinutes = this.generateHoursRangeMinutes(hour_start, hour_end);
      })

    await this.calculateWeeksInMonth();
    //await this.calculateTaskPositions();

    //BRING PREVIOUS FILTERS
    this.loadSavedFilters();
    this.loadBookings(this.currentDate);
  }

  onDateChange() {
    this.currentDate = this.searchDate;
    this.timelineView === 'day';
    this.updateView();
  }

  async getUser() {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    const activeSchool = this.user.schools.find(school => school.active === true);
    if (activeSchool) {
      return activeSchool.id;
    } else {
      return null;
    }
  }

  async getLanguages() {
    try {
      const data: any = await this.crudService.get('/languages?&perPage=' + 99999).toPromise();
      this.languages = data.data;
    } catch (error) {
    }
  }

  async getSports() {
    try {
      const data: any = await this.crudService.get('/sports?perPage=' + 99999).toPromise();
      this.sportsReceived = data.data;
    } catch (error) {
    }
  }

  async getSchoolSports() {
    try {
      const data: any = await this.crudService.get('/school-sports?school_id=' + this.activeSchool + '&perPage=' + 99999).toPromise();
      this.sports = this.sportsReceived.filter(sport =>
        data.data.some(newSport => newSport.sport_id === sport.id)
      );
      this.sports.forEach(sport => this.checkedSports.add(sport.id));
    } catch (error) {
    }
  }

  async getDegrees() {
    try {
      const data: any = await this.crudService.get('/degrees?school_id=' + this.activeSchool + '&perPage=' + 10000).toPromise();
      this.degrees = data.data.sort((a, b) => a.degree_order - b.degree_order);
      this.degrees.forEach((degree: any) => {
        degree.inactive_color = this.lightenColor(degree.color, 30);
      });
    } catch (error) {
    }
  }

  private lightenColor(hexColor: string, percent: number): string {
    let r: any = parseInt(hexColor.substring(1, 3), 16);
    let g: any = parseInt(hexColor.substring(3, 5), 16);
    let b: any = parseInt(hexColor.substring(5, 7), 16);

    // Increase the lightness
    r = Math.round(r + (255 - r) * percent / 100);
    g = Math.round(g + (255 - g) * percent / 100);
    b = Math.round(b + (255 - b) * percent / 100);

    // Convert RGB back to hex
    r = r.toString(16).padStart(2, '0');
    g = g.toString(16).padStart(2, '0');
    b = b.toString(16).padStart(2, '0');

    return '#' + r + g + b;
  }

  goToPrevious() {
    this.loading = true;
    if (this.timelineView === 'day') {
      this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() - 1));
    } else if (this.timelineView === 'week') {
      this.currentDate = subWeeks(this.currentDate, 1);
    } else if (this.timelineView === 'month') {
      this.currentDate = subMonths(this.currentDate, 1);
    }
    this.updateView();
  }

  goToNext() {
    this.loading = true;

    if (this.timelineView === 'day') {
      this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() + 1));
    } else if (this.timelineView === 'week') {
      this.currentDate = addWeeks(this.currentDate, 1);
    } else if (this.timelineView === 'month') {
      this.currentDate = addMonths(this.currentDate, 1);
    }
    this.updateView();
  }

  changeView(newView: string) {
    this.loading = true;
    this.timelineView = newView;
    this.updateView();
  }

  updateView() {
    if (this.timelineView === 'week') {
      const start = startOfWeek(this.currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(this.currentDate, { weekStartsOn: 1 });
      this.currentWeek = `${format(start, 'dd')} - ${format(end, 'dd MMMM yyyy')}`;
    } else if (this.timelineView === 'month') {
      this.currentMonth = format(this.currentDate, 'MMMM yyyy');
      this.calculateWeeksInMonth();
    } else {
      this.currentWeek = '';
    }
    this.loadBookings(this.currentDate);
  }

  loadBookings(date: Date) {
    let firstDate, lastDate;
    if (this.timelineView === 'week') {
      const startOfWeekDate = startOfWeek(date, { weekStartsOn: 1 });
      const endOfWeekDate = endOfWeek(date, { weekStartsOn: 1 });
      firstDate = moment(startOfWeekDate).format('YYYY-MM-DD');
      lastDate = moment(endOfWeekDate).format('YYYY-MM-DD');
      this.searchBookings(firstDate, lastDate);

      /*this.filteredTasks = this.tasksCalendarStyle.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= startOfWeekDate && taskDate <= endOfWeekDate;
      });*/
    } else if (this.timelineView === 'month') {
      const startMonth = startOfMonth(date);
      const endMonth = endOfMonth(date);
      firstDate = moment(startMonth).format('YYYY-MM-DD');
      lastDate = moment(endMonth).format('YYYY-MM-DD');
      this.searchBookings(firstDate, lastDate);

      /*this.filteredTasks = this.tasksCalendarStyle.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= startMonth && taskDate <= endMonth;
      });*/
    } else {
      const dateStr = date.toLocaleString().split('T')[0];
      firstDate = moment(date).format('YYYY-MM-DD');
      lastDate = firstDate;
      this.searchBookings(firstDate, lastDate);
      /*this.filteredTasks = this.tasksCalendarStyle.filter(task => task.date === dateStr);*/
    }

  }

  searchBookings(firstDate: string, lastDate: string) {
    this.crudService.get('/admin/getPlanner?date_start=' + firstDate + '&date_end=' + lastDate + '&school_id=' + this.activeSchool + '&perPage=' + 99999).subscribe(
      (data: any) => {
        this.processData(data.data);
      },
      error => {
      }
    );
  }

  normalizeToArray(data: any) {
    //Nwds sometimes as object sometimes as array
    if (Array.isArray(data)) {
      return data;
    }
    if (typeof data === 'object') {
      return Object.values(data);
    }
    return [];
  }

  processData(data: any) {
    this.allMonitors = [{
      id: null
    }];
    if (this.filterMonitor) {
      this.filteredMonitors = [];
    }
    else {
      this.filteredMonitors = [{
        id: null
      }];
    }
    let allNwds = [];
    let allBookings = [];

    for (const key in data) {
      const item = data[key];
      let hasAtLeastOne = true;

      // Save all monitors
      if (item.monitor) {
        if (!this.areAllChecked()) {
          hasAtLeastOne = item.monitor.sports.length > 0 && item.monitor.sports.some(sport => this.checkedSports.has(sport.id));
        }

        if (item.monitor.id && item.monitor.sports && Array.isArray(item.monitor.sports) && item.monitor.sports.length > 0) {
          item.monitor.sports.forEach((sportObject: any, index: any) => {
            const degrees_sport = this.degrees.filter(degree => degree.sport_id === sportObject.id);
            sportObject.degrees_sport = degrees_sport;

            let highestDegreeId = null;
            if (sportObject.authorizedDegrees && Array.isArray(sportObject.authorizedDegrees) && sportObject.authorizedDegrees.length > 0) {
              const highestAuthorizedDegree = sportObject.authorizedDegrees.reduce((prev, current) => {
                return (prev.degree_id > current.degree_id) ? prev : current;
              });
              highestDegreeId = highestAuthorizedDegree.degree_id;
            }
            sportObject.authorized_degree_id = highestDegreeId;

            //Check the first
            if (index === 0) {
              item.monitor.sport_degrees_check = 0;
            }
          });
        }
        this.allMonitors.push(item.monitor);
      }

      // Process 'monitor' field
      // Filter by free +/ occupied
      if (item.monitor && (this.filterFree && !item.monitor?.hasFullDayNwd) || (this.filterOccupied && item.monitor?.hasFullDayNwd)) {
        if (this.filterMonitor) {
          if (item.monitor && item.monitor.id == this.filterMonitor && hasAtLeastOne && item.monitor.sports.length > 0) {
            this.filteredMonitors.push(item.monitor);
          }
          if (item.monitor && hasAtLeastOne && item.monitor.sports.length > 0) {
            this.allMonitorsTimeline.push(item.monitor);
          }
        }
        else {
          if (item.monitor && hasAtLeastOne && item.monitor.sports.length > 0) {
            this.filteredMonitors.push(item.monitor);
            this.allMonitorsTimeline.push(item.monitor);
          }
        }
      }
      if (item.nwds) {
        const nwdsArray = this.normalizeToArray(item.nwds);
        if (this.filterMonitor && hasAtLeastOne) {
          for (const nwd of nwdsArray) {
            if (nwd.monitor_id === this.filterMonitor) {
              if ((this.filterNwd || nwd.user_nwd_subtype_id !== 1) &&
                (this.filterBlockPayed || nwd.user_nwd_subtype_id !== 2) &&
                (this.filterBlockNotPayed || nwd.user_nwd_subtype_id !== 3)) {
                allNwds.push(nwd);
              }
            } else {
              //If one doesn't match -> break loop
              break;
            }
          }
        }
        else {
          if (hasAtLeastOne) {
            const filteredNwds = nwdsArray.filter(nwd =>
              (this.filterNwd || nwd.user_nwd_subtype_id !== 1) &&
              (this.filterBlockPayed || nwd.user_nwd_subtype_id !== 2) &&
              (this.filterBlockNotPayed || nwd.user_nwd_subtype_id !== 3)
            );
            allNwds.push(...filteredNwds);
          }
        }
      }

      let hasAtLeastOneBooking = true;

      // Process 'bookings' field
      /*NO NEED TO GROUP WHEN CHANGE IN CALL*/
      /*allBookings.push(...item.bookings);*/
      if (item.bookings && typeof item.bookings === 'object') {
        for (const bookingKey in item.bookings) {
          let bookingArray = item.bookings[bookingKey];
          if (!Array.isArray(bookingArray)) {
            bookingArray = [bookingArray];
          }

          let bookingArrayComplete = [];

          if (Array.isArray(bookingArray) && bookingArray.length > 0) {

            //Check if private bookings have the the same hours - and group them
            if ((bookingArray[0].course.course_type === 2 || bookingArray[0].course.course_type === 3) && bookingArray.length > 1) {
              const groupedByTime = bookingArray.reduce((acc, curr) => {
                const timeKey = `${curr.hour_start}-${curr.hour_end}`;
                if (!acc[timeKey]) {
                  acc[timeKey] = [];
                }
                acc[timeKey].push(curr);
                return acc;
              }, {});
              for (const group in groupedByTime) {
                bookingArrayComplete.push(groupedByTime[group]);
              }

            } else {
              bookingArrayComplete.push(bookingArray);
            }

            //Do the same but for each separate group
            for (const groupedBookingArray of bookingArrayComplete) {

              if (!this.areAllChecked()) {
                hasAtLeastOneBooking = this.checkedSports.has(groupedBookingArray[0].course.sport_id);
              }
              if (this.filterMonitor && hasAtLeastOne && hasAtLeastOneBooking) {
                if (groupedBookingArray[0].monitor_id === this.filterMonitor) {
                  if ((this.filterCollective || groupedBookingArray[0].course.course_type !== 1) &&
                    (this.filterPrivate || groupedBookingArray[0].course.course_type !== 2) &&
                    (this.filterActivity || groupedBookingArray[0].course.course_type === 3)) {
                    const firstBooking = { ...groupedBookingArray[0], bookings_number: groupedBookingArray.length, bookings_clients: groupedBookingArray };
                    allBookings.push(firstBooking);
                  }
                }
              } else {
                if (hasAtLeastOne && hasAtLeastOneBooking) {
                  if ((this.filterCollective || groupedBookingArray[0].course.course_type !== 1) &&
                    (this.filterPrivate || groupedBookingArray[0].course.course_type !== 2) &&
                    (this.filterActivity || groupedBookingArray[0].course.course_type === 3)) {
                    const firstBooking = { ...groupedBookingArray[0], bookings_number: groupedBookingArray.length, bookings_clients: groupedBookingArray };
                    allBookings.push(firstBooking);
                  }
                }
              }

            }
          }
        }
      }
    }
    this.filteredMonitors = this.filteredMonitors.sort((a: any, b: any) => {
      if (a.id === null && b.id !== null) return -1;
      if (b.id === null && a.id !== null) return 1;
      return (a.first_name + a.last_name).localeCompare(b.first_name + b.last_name);
    });

    //ADD all bookingusers and then filter them.
    //get bookingusers
    let allBookingUsers = [];

    allBookings.forEach(booking => {
      // Private or colective
      let usersToProcess = [];
      if (booking.course.course_type === 2 || booking.course.course_type === 3) {
        usersToProcess = booking.bookings_clients;
      } else if (booking.course.course_type === 1) {
        usersToProcess = booking.booking_users;
      }

      usersToProcess.forEach(userObj => {
        const client = (userObj.client || userObj);
        const clientInfo = { id: client.id, first_name: client.first_name, last_name: client.last_name };
        const isExistingUser = allBookingUsers.some(user => user.id === clientInfo.id);

        if (!isExistingUser) {
          allBookingUsers.push(clientInfo);
        }
      });
    });

    //Saved object to filter
    if (this.filterBookingUser && !allBookingUsers.some(user => user.id === this.filterBookingUser.id)) {
      allBookingUsers.push(this.filterBookingUser);
    }

    allBookingUsers.sort((a, b) => a.first_name.localeCompare(b.first_name));
    this.allBookingUsers = allBookingUsers;

    //filter the bookings if bookinguser
    if (this.filterBookingUser && this.filterBookingUser.id) {
      const filteredBookings = allBookings.filter(booking => {
        let usersToCheck = [];
        if (booking.course.course_type === 2 || booking.course.course_type === 3) {
          usersToCheck = booking.bookings_clients.map(clientObj => clientObj.client);
        } else if (booking.course.course_type === 1) {
          usersToCheck = booking.booking_users.map(clientObj => clientObj.client);
        }

        return usersToCheck.some(user => user.id === this.filterBookingUser.id);
      });

      allBookings = filteredBookings;
    }

    //Convert them into TASKS

    allBookings.forEach(booking => {
      if (!booking.booking) {
        // Construct the booking object
        const courseDate = booking.course.course_dates.find(date => date.id === booking.course_date_id);

        booking.booking = {
          id: booking.id
        };
        booking.date = courseDate ? courseDate.date : null;
        booking.hour_start = courseDate ? courseDate.hour_start : null;
        booking.hour_end = courseDate ? courseDate.hour_end : null;
        booking.bookings_number = booking.booking_users?.length;
        booking.bookings_clients = booking.booking_users;
      }
    });

    let tasksCalendar: any = [
      //BOOKINGS
      ...allBookings.map(booking => {
        let type;
        switch (booking.course.course_type) {
          case 1:
            type = 'collective';
            break;
          case 2:
            type = 'private';
            break;
          case 3:
            type = 'activity';
            break;
          default:
            type = 'unknown';
        }

        const dateTotalAndIndex = (booking.course.course_type === 2 || booking.course.course_type === 3) ? { date_total: 0, date_index: 0 } : {
          date_total: booking.course.course_dates.length,
          date_index: this.getPositionDate(booking.course.course_dates, booking.course_date_id)
        };

        //Get Sport and Degree objects
        const sport = this.sports.find(s => s.id === booking.course.sport_id);
        const degrees_sport = this.degrees.filter(degree => degree.sport_id === booking.course.sport_id);
        let degree = {};
        let booking_color = null;
        if (type == 'collective') {
          degree = this.degrees.find(degree => degree.id === booking.degree_id) || degrees_sport[0];
        }
        else if (type == 'private') {
          const sportObject = booking?.bookings_clients?.[0]?.client?.sports?.find(
            sport => sport.id === booking?.course?.sport_id
          );
          if (sportObject && sportObject.pivot && sportObject.pivot.degree_id) {
            degree = this.degrees.find(degree => degree.id === sportObject.pivot.degree_id);
          }
          if (!degree) {
            degree = degrees_sport[0];
          }
          degree = this.degrees.find(degree => degree.id === booking.degree_id) || degrees_sport[0];

          //Booking color
          booking_color = booking.color;
        } else if (type == 'activity') {
          const sportObject = booking?.bookings_clients?.[0]?.client?.sports?.find(
            sport => sport.id === booking?.course?.sport_id
          );


          if (sportObject && sportObject.pivot && sportObject.pivot.degree_id) {
            degree = this.degrees.find(degree => degree.id === sportObject.pivot.degree_id);
          }
          if (!degree) {
            degree = degrees_sport[0];
          }
          degree = this.degrees.find(degree => degree.id === booking.degree_id) || degrees_sport[0];

          //Booking color
          booking_color = booking.color;
        }


        let monitor = null;
        if (booking.monitor_id) {
          monitor = this.filteredMonitors.find(monitor => monitor.id === booking.monitor_id) || null;
        }

        return {
          id: booking?.id,
          booking_id: booking?.booking?.id,
          booking_color: booking_color,
          date: moment(booking.date).format('YYYY-MM-DD'),
          group_id: booking?.group_id,
          date_full: booking.date,
          date_start: moment(booking.course.date_start).format('YYYY-MM-DD'),
          created_at: booking.booking.created_at,
          date_end: moment(booking.course.date_end).format('YYYY-MM-DD'),
          hour_start: booking.hour_start.substring(0, 5),
          hour_end: booking.hour_end ? booking.hour_end.substring(0, 5) : this.hoursRange[this.hoursRange.length - 1],
          type: type,
          name: booking.course.name,
          sport_id: booking.course.sport_id,
          sport: sport,
          degree_id: booking.degree_id,
          degree: degree,
          degrees_sport: degrees_sport,
          clients_number: booking.bookings_number,
          all_clients: booking.bookings_clients,
          max_participants: booking.course.max_participants,
          monitor_id: booking.monitor_id,
          monitor: monitor,
          course_id: booking.course_id,
          course_date_id: booking.course_date_id,
          course_subgroup_id: booking.booking_users && booking.booking_users?.length > 0 ? booking.booking_users[0].course_subgroup_id : null,
          subgroup_number: booking.subgroup_number,
          total_subgroups: booking.total_subgroups,
          course: booking.course,
          accepted: booking.accepted,
          paid: booking?.booking?.paid,
          user: booking?.booking?.user,
          ...dateTotalAndIndex
        };
      }),
      //NWDS -> for active_school
      ...allNwds.map(nwd => {
        let type;
        if (nwd.user_nwd_subtype_id === 1) {
          type = 'block_personal';
        } else if (nwd.user_nwd_subtype_id === 2) {
          type = 'block_payed';
        } else if (nwd.user_nwd_subtype_id === 3) {
          type = 'block_no_payed';
        } else {
          type = 'unknown';
        }
        const hourTimesNwd = nwd.full_day ? {
          hour_start: this.hoursRange[0],
          hour_end: this.hoursRange[this.hoursRange.length - 1]
        } : {
          hour_start: nwd.start_time.substring(0, 5),
          hour_end: nwd.end_time.substring(0, 5)
        };

        let monitor = null;
        if (nwd.monitor_id) {
          monitor = this.filteredMonitors.find(monitor => monitor.id === nwd.monitor_id) || null;
        }

        return {
          school_id: nwd.school_id,
          station_id: nwd.station_id,
          block_id: nwd.id,
          date: moment(nwd.start_date).format('YYYY-MM-DD'),
          date_format: moment(nwd.start_date).format('YYYY-MM-DD'),
          full_day: nwd.full_day,
          type: type,
          color: nwd.user_nwd_subtype_id === 1 ? '#bbbbbb' : nwd.color,
          name: nwd.description,
          monitor_id: nwd.monitor_id,
          monitor: monitor,
          user_nwd_subtype_id: nwd.user_nwd_subtype_id,
          color_block: nwd.color,
          start_date: nwd.start_date,
          end_date: nwd.end_date,
          ...hourTimesNwd
        };
      })
    ];

    this.calculateTaskPositions(tasksCalendar);
  }

  getPositionDate(courseDates: any[], courseDateId: string): number {
    const index = courseDates.findIndex(date => date.id === courseDateId);
    return index >= 0 ? index + 1 : 0;
  }

  async calculateWeeksInMonth() {
    const startMonth = startOfMonth(this.currentDate);
    const endMonth = endOfMonth(this.currentDate);
    this.firstDayOfMonth = startMonth.getDay(); // Devuelve el día de la semana (0 para domingo, 1 para lunes, etc.)

    this.weeksInMonth = [];
    let currentWeekStart = startOfWeek(startMonth, { weekStartsOn: 1 });

    while (currentWeekStart <= endMonth) {
      const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

      const adjustedStart = max([startMonth, currentWeekStart]);
      const adjustedEnd = min([endMonth, currentWeekEnd]);

      const week = {
        startWeek: format(currentWeekStart, 'yyyy-MM-dd'),
        startDayInt: adjustedStart.getDate(),
        startDay: this.formatDayWithFrenchInitial(adjustedStart),
        endDay: this.formatDayWithFrenchInitial(adjustedEnd)
      };

      this.weeksInMonth.push(week);
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
  }

  calculateDayNumber(dayIndex: number, weekIndex: number, starDayWeek: number): number {
    //isDayInMonth(dayIndex, weekIndex) ? (week.startDayInt + dayIndex - (weekIndex === 0 && firstDayOfMonth !== 0 ? firstDayOfMonth - 1 : 0)) : ''
    if (weekIndex === 0 && this.firstDayOfMonth === 0) {
      // Si el primer día del mes es domingo y estamos en la primera semana, ajustar el cálculo
      return 1; // Añadir 1 ya que el primer día debe ser 1
    } else if (weekIndex === 0) {
      // Si estamos en la primera semana pero el primer día no es domingo, ajustar según el primer día
      return starDayWeek + dayIndex - this.firstDayOfMonth + 1
    } else {
      // Para semanas después de la primera
      return starDayWeek + dayIndex
    }
  }


  formatDayWithFrenchInitial(date: Date): string {
    const frenchDayInitials = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
    const dayOfWeek = getDay(date);
    const initial = frenchDayInitials[dayOfWeek];
    return `${initial} ${format(date, 'd')}`;
  }

  isDayInMonth(dayIndex: number, weekIndex: number): boolean {
    const week = this.weeksInMonth[weekIndex];
    const weekStartDate = new Date(week.startWeek);
    const specificDate = addDays(weekStartDate, dayIndex);
    if (isSameMonth(specificDate, this.currentDate)) {
      return !this.vacationDays.includes(moment(specificDate).format('YYYY-MM-DD'));
    }
    else {
      return false;
    }
  }

  isDayVisibleWeek(dayIndex: number) {
    const startOfWeek = moment(this.currentDate).startOf('isoWeek');
    const specificDate = startOfWeek.add(dayIndex, 'days');
    return !this.vacationDays.includes(moment(specificDate).format('YYYY-MM-DD'));
  }

  isDayVisibleDay(): boolean {
    // Si vacationDays es undefined o null, asumimos que no hay días de vacaciones
    if (!this.vacationDays) {
      return true;
    }

    // Verificamos si la fecha actual está en la lista de días de vacaciones
    return !this.vacationDays.includes(moment(this.currentDate).format('YYYY-MM-DD'));
  }
  generateHoursRange(start: string, end: string): string[] {
    const startTime = this.parseTime(start);
    const endTime = this.parseTime(end);
    let currentTime = new Date(startTime);
    let times = [];

    while (currentTime <= endTime) {
      times.push(this.formatTime(currentTime));
      currentTime.setHours(currentTime.getHours() + 1);
    }

    return times;
  }

  generateHoursRangeMinutes(start: string, end: string): string[] {
    const startTime = this.parseTime(start);
    const endTime = this.parseTime(end);
    let currentTime = new Date(startTime);
    let times = [];

    while (currentTime <= endTime) {
      times.push(this.formatTime(currentTime));
      currentTime = new Date(currentTime.getTime() + 5 * 60000);
    }

    return times;
  }

  async calculateTaskPositions(tasks: any) {
    const pixelsPerMinute = 150 / 60;
    const pixelsPerMinuteWeek = 300 / ((this.hoursRange.length - 1) * 60);
    let plannerTasks = tasks
      .filter(task => {
        const monitorIndex = this.filteredMonitors.findIndex(m => m.id === task.monitor_id);
        if (!(monitorIndex >= 0)) {
        }
        return monitorIndex >= 0;
      })
      .map((task: any) => {
        //Style for days

        //Check start time is inside hours range
        const firstTimeRange = this.parseTime(this.hoursRange[0]);
        const startTime = this.parseTime(task.hour_start);
        if (startTime < firstTimeRange) {
          startTime.setHours(firstTimeRange.getHours(), firstTimeRange.getMinutes(), 0, 0);
        }

        const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const rangeStart = this.parseTime(this.hoursRange[0]);
        const rangeStartMinutes = rangeStart.getHours() * 60 + rangeStart.getMinutes();
        const leftMinutes = startMinutes - rangeStartMinutes;
        const leftPixels = leftMinutes * pixelsPerMinute;

        //Check end time is inside hours range
        const lastTimeRange = this.parseTime(this.hoursRange[this.hoursRange.length - 1]);
        const endTime = this.parseTime(task.hour_end);
        if (endTime > lastTimeRange) {
          endTime.setHours(lastTimeRange.getHours(), lastTimeRange.getMinutes(), 0, 0);
        }

        const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
        const durationMinutes = endMinutes - startMinutes;
        const widthPixels = durationMinutes * pixelsPerMinute;

        const monitorIndex = this.filteredMonitors.findIndex(m => m.id === task.monitor_id);
        const topPixels = monitorIndex * 100;

        const style = {
          'left': `${leftPixels}px`,
          'width': `${widthPixels}px`,
          'top': `${topPixels}px`
        };

        //Style for weeks
        const taskDate = new Date(task.date);
        const dayOfWeek = taskDate.getDay();
        const initialLeftOffset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 300;

        const startTimeWeek = this.parseTime(task.hour_start);
        if (startTimeWeek < firstTimeRange) {
          startTimeWeek.setHours(firstTimeRange.getHours(), firstTimeRange.getMinutes(), 0, 0);
        }

        const rangeStartWeek = this.parseTime(this.hoursRange[0]);
        const startMinutesWeek = startTimeWeek.getHours() * 60 + startTimeWeek.getMinutes();
        const rangeStartMinutesWeek = rangeStartWeek.getHours() * 60 + rangeStartWeek.getMinutes();
        const leftMinutesWeek = startMinutesWeek - rangeStartMinutesWeek;
        const additionalLeftPixels = leftMinutesWeek * pixelsPerMinuteWeek;

        //Check end time is inside hours range
        const endTimeWeek = this.parseTime(task.hour_end);
        if (endTimeWeek > lastTimeRange) {
          endTimeWeek.setHours(lastTimeRange.getHours(), lastTimeRange.getMinutes(), 0, 0);
        }
        const endMinutesWeek = endTimeWeek.getHours() * 60 + endTimeWeek.getMinutes();
        const durationMinutesWeek = endMinutesWeek - startMinutesWeek;
        const widthPixelsWeek = durationMinutesWeek * pixelsPerMinuteWeek;

        const styleWeek = {
          'left': `${initialLeftOffset + additionalLeftPixels}px`,
          'width': `${widthPixelsWeek}px`,
          'top': `${topPixels}px`
        };

        //Style for months
        const taskMonthInfo = this.getMonthWeekInfo(task.date);
        const topPixelsMonth = (taskMonthInfo.weekIndex * 100) + (monitorIndex * taskMonthInfo.totalWeeks * 100);

        const styleMonth = {
          'left': styleWeek.left,
          'width': styleWeek.width,
          'top': `${topPixelsMonth}px`
        };

        //Background color of block tasks
        if (task.type === 'block_personal' || task.type === 'block_payed' || task.type === 'block_no_payed') {
          style['background-color'] = this.hexToRgbA(task.color, 0.4);
          styleWeek['background-color'] = this.hexToRgbA(task.color, 0.4);
          styleMonth['background-color'] = this.hexToRgbA(task.color, 0.4);
        }

        return {
          ...task,
          style,
          styleWeek,
          styleMonth,
          class: `task-${task.type}`
        };
      });

    // Separating tasks with monitor_id = null and grouping by date
    const noMonitorTasks = plannerTasks.filter(task => task.monitor_id === null);
    const groupedByDate = noMonitorTasks.reduce((group, task) => {
      (group[task.date] = group[task.date] || []).push(task);
      return group;
    }, {});

    //Store ids that will be deleted
    let groupedTaskIds = new Set();

    // Process each group to adjust overlapping tasks
    Object.keys(groupedByDate).forEach(date => {
      const tasksForDate = groupedByDate[date];

      // Group tasks by course_id, hour_start, and hour_end if course_id is not null
      const groupedByCourseTime = tasksForDate.reduce((group, task) => {
        if (task.course_id != null) {
          if (task.course.course_type == 1) {
            var key = `${task.course_id}-${task.hour_start}-${task.hour_end}`;
          } else {
            key = `${task.course_id}-${task.hour_start}-${task.hour_end}-${task.group_id}`;
          }

          if (!group[key]) {
            group[key] = {
              ...task, // Take the first task's details
              grouped_tasks: [] // Initialize the array for grouped tasks
            };
          }
          group[key].grouped_tasks.push(task);
          groupedTaskIds.add(task.booking_id);
        } else {
          // If course_id is null, keep the task as an individual task
          (group["__singleTasks__"] = group["__singleTasks__"] || []).push(task);
        }
        return group;
      }, {});

      // Flatten the grouped tasks into an array
      const flattenedTasks = [].concat(...Object.values(groupedByCourseTime));

      // Sort flattened tasks by start time
      flattenedTasks.sort((a, b) => {
        const timeA = this.parseTime(a.hour_start).getTime();
        const timeB = this.parseTime(b.hour_start).getTime();
        return timeA - timeB;
      });

      // Initialize an array to store the overlapping task groups
      let overlappingGroups = [];

      flattenedTasks.forEach(task => {
        let placed = false;
        for (let group of overlappingGroups) {
          // Check if the task overlaps with the group
          if (group.some(t => !(this.parseTime(t.hour_end) <= this.parseTime(task.hour_start) || this.parseTime(t.hour_start) >= this.parseTime(task.hour_end)))) {
            // If it overlaps, add to the group and set placed to true
            group.push(task);
            placed = true;
            break;
          }
        }

        // If the task did not fit in any group, create a new group
        if (!placed) overlappingGroups.push([task]);
      });

      // Assign heights and tops based on the groups
      overlappingGroups.forEach((group, index) => {
        const height = 100 / group.length;
        group.forEach((task, idx) => {
          task.style = {
            ...task.style,
            'height': `${height}px`,
            'top': `${height * idx}px`
          };
          task.styleWeek = {
            ...task.styleWeek,
            'height': `${height}px`,
            'top': `${height * idx}px`
          };
          task.styleMonth = {
            ...task.styleMonth,
            'height': `${height}px`,
            'top': `${parseInt(task.styleMonth.top, 10) + (height * idx)}px`
          };
        });
      });

      // Replace the tasks for the date with the processed tasks
      groupedByDate[date] = overlappingGroups.flat();
    });

    // Remove the original tasks that were grouped -> NOT THE ONES THAT ALREADY HAVE MONITOR
    const filteredPlannerTasks = plannerTasks.filter(task =>
      !groupedTaskIds.has(task.booking_id) ||
      (groupedTaskIds.has(task.booking_id) && task.monitor_id)
    );

    // Combine adjusted tasks with the rest
    this.plannerTasks = [...filteredPlannerTasks, ...Object.values(groupedByDate).flat()];
    this.loading = false;
  }

  hexToRgbA(hex: string, transparency = 1) {
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!rgb) {
      return null;
    }
    const r = parseInt(rgb[1], 16);
    const g = parseInt(rgb[2], 16);
    const b = parseInt(rgb[3], 16);
    return `rgba(${r},${g},${b},${transparency})`;
  }

  getMonthWeekInfo(dateString: any) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    //Week index
    const startDay = firstDayOfMonth.getDay() || 7;
    //Subtract 1 so that it starts on 0
    let weekIndex = Math.ceil((date.getDate() + startDay - 1) / 7) - 1;

    //Total weeks
    const lastDayWeekDay = lastDayOfMonth.getDay() || 7;
    const daysInLastWeek = 7 - lastDayWeekDay;
    const totalWeeks = Math.ceil((lastDayOfMonth.getDate() + daysInLastWeek) / 7);

    return {
      weekIndex,
      totalWeeks
    };
  }


  parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    return time;
  }

  formatTime(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  // LOGIC

  toggleDetail(task: any, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    if (task.booking_id) {
      if (task.grouped_tasks && task.grouped_tasks.length > 1) {
        //Open Modal grouped courses
        this.groupedTasks = task.grouped_tasks;
        this.idGroupedTasks = task.booking_id;
        this.hourGrouped = task.hour_start;
        this.dateGrouped = task.date;
        this.taskDetail = null;
        this.idDetail = null;
        this.showGrouped = true;
      }
      else {
        //Load course
        if (this.groupedTasks && this.groupedTasks.includes(task)) {
          this.showGrouped = true;
        } else {
          this.showGrouped = false;
          this.groupedTasks = task.grouped_tasks;
          this.idGroupedTasks = task.booking_id;
        }
        this.idDetail = task.booking_id;
        this.hourDetail = task.hour_start;
        this.dateDetail = task.date;
        this.monitorDetail = task.monitor_id;
        this.subgroupDetail = task.course_subgroup_id;
        this.taskDetail = task;
        this.showDetail = true;
        this.initializeMonitorAssignment(task);

      // Cargar disponibles para el selector del preview:
        this.checkAvailableMonitors();
      }
      this.hideBlock();
      this.hideEditBlock();
    }
  }

  toggleBlock(block: any, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.idBlock = block.block_id;
    this.blockDetail = block;
    this.hideDetail();
    this.hideEditBlock();
    this.showBlock = true;
  }

  hideDetail() {
    this.idDetail = null;
    this.hourDetail = null;
    this.dateDetail = null;
    this.monitorDetail = null;
    this.subgroupDetail = null;
    this.taskDetail = null;
    this.showDetail = false;
    this.editedMonitor = null;
    this.showEditMonitor = false;
    this.resetMonitorAssignmentState();
  }

  hideBlock() {
    this.idBlock = null;
    this.blockDetail = null;
    this.showBlock = false;
  }

  hideGrouped() {
    this.groupedTasks = [];
    this.idGroupedTasks = null;
    this.hourGrouped = null;
    this.dateGrouped = null;
    this.showGrouped = false;
  }

  toggleDetailMove(task: any, event: any) {
    this.moving = true;
    this.taskDetail = task;
    this.initializeMonitorAssignment(task);
    event.preventDefault();
    if (task.booking_id) {
      const dialogRef = this.dialog.open(ConfirmModalComponent, {
        maxWidth: '100vw',
        panelClass: 'full-screen-dialog',
        data: { message: this.translateService.instant('move_task'), title: this.translateService.instant('confirm_move') }
      });

      dialogRef.afterClosed().subscribe((userConfirmed: boolean) => {
        if (userConfirmed) {

          const clientIds = (this.taskDetail.all_clients || []).map((client) => client.id);

          const data = {
            sportId: this.taskDetail.sport_id,
            minimumDegreeId: this.taskDetail.degree_id || this.taskDetail.degree.id,
            startTime: this.taskDetail.hour_start,
            endTime: this.taskDetail.hour_end,
            date: this.taskDetail.date,
            clientIds: clientIds
          };

          firstValueFrom(this.crudService.post('/admin/monitors/available', data))
            .then(response => {
              this.monitorsForm = response.data;
              return this.updateMatchResults();
            })
            .then(() => {
              this.moveTask = true;
              this.taskMoved = task;
              this.moving = false;
            })
            .catch(error => {
              console.error('An error occurred:', error);
              this.moving = false;
            });
        } else {
          this.moving = false;
        }
      });
    }
  }

  handleKeydownEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.hideDetailMove();
    }
  }

  hideDetailMove() {
    if (this.moveTask) {
      this.moveTask = false;
      this.taskMoved = null;
    }
  }

  moveMonitor(monitor: any, event: MouseEvent): void {
    // Stop event propagation immediately if in move mode to prevent interference with preview/modal closing
    if (this.moveTask) {
      event.stopPropagation();
    }

    let ret = this.checkMonitorSport(monitor);
    if (this.taskDetail) {
      const clientIds = this.taskDetail?.all_clients?.map((client) => client.id);

    if (this.moveTask && this.taskMoved && this.taskMoved.monitor_id === monitor.id) {
      this.moveTask = false;
      this.taskMoved = null;
      return;
    }

    const availabilityPayload = {
      sportId: this.taskDetail?.sport_id,
      minimumDegreeId: this.taskDetail?.degree_id || this.taskDetail?.degree?.id,
      startTime: this.taskDetail?.hour_start,
      endTime: this.taskDetail?.hour_end,
      date: this.taskDetail?.date,
      clientIds: (this.taskDetail?.all_clients || []).map((client: any) => client.id)
    };

    const fallbackSubgroupId = !this.taskDetail?.all_clients?.length ? (this.taskDetail?.booking_id ?? null) : null;

    const proceedWithTransfer = () => {
      this.crudService.post('/admin/monitors/available', availabilityPayload)
        .subscribe((response) => {
          this.monitorsForm = response.data;

          if (this.moveTask && !this.monitorMatchesCurrentSport(monitor)) {
            this.snackbar.open(this.translateService.instant('match_error_sport') + this.taskDetail.sport.name, 'OK', { duration: 3000 });
            return;
          }

          if (this.moveTask && event) {
            event.stopPropagation();
          }

          this.openMonitorAssignmentDialog(monitor)
            .subscribe((selection) => {
              if (!selection) {
                return;
              }

              this.applyMonitorAssignmentSelection(selection);

              const payload = this.buildMonitorTransferPayload(monitor?.id ?? null, fallbackSubgroupId);

              if (!payload.booking_users.length && payload.subgroup_id === null) {
                this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
                return;
              }

              this.monitorsService.transferMonitor(payload)
                .subscribe(
                  () => this.handleMonitorTransferSuccess(),
                  (error) => this.handleMonitorTransferError(error)
                );
            });
        }, (error) => {
          console.error('Error occurred while checking monitor availability:', error);
          this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
        });
    };

    this.matchTeacher(monitor.id).then((needsConfirmation) => {
      if (needsConfirmation) {
        const dialogRef = this.dialog.open(ConfirmUnmatchMonitorComponent, {
          data: {
            booking: this.taskDetail,
            monitor,
            school_id: this.activeSchool
          }
        });

        dialogRef.afterClosed().subscribe((confirmed) => {
          if (confirmed) {
            proceedWithTransfer();
          }
        });
      } else {
        proceedWithTransfer();
      }
    });
  }

  private monitorMatchesCurrentSport(monitor: any): boolean {
    if (!this.taskDetail) {
      return false;
    }
    if (!monitor || !monitor.id) {
      return true;
    }
    if (!Array.isArray(monitor.sports)) {
      return false;
    }
    return monitor.sports.some((sport: any) => sport && sport.id === this.taskDetail.sport_id);
  }

  private openMonitorAssignmentDialog(monitor: any): Observable<MonitorAssignmentDialogResult | undefined> {
    if (!this.taskDetail) return of(undefined);

    // Inicializa arrays/estado para el diálogo
    this.initializeMonitorAssignment(this.taskDetail); // <- tu método existente que carga monitorAssignmentDates, scope, etc.
    const defaultDate = this.taskDetail?.date || null;

    const dialogRef = this.dialog.open(MonitorAssignmentDialogComponent, {
      width: '420px',
      disableClose: true,
      autoFocus: false,
      data: {
        monitor,
        // YA SON OPCIONES {value,label} (no hay que remapear nada)
        dates: this.monitorAssignmentDates, // <-- aquí estaba el bug (antes hacía ({ .option }))
        defaultDate,
        intervalDates: this.getIntervalDatesForTask(this.taskDetail),
        hasMultipleIntervals: this.hasMultipleIntervals(),
        allowAllOption: (this.monitorAssignmentDates?.length ?? 0) > 1,
        initialScope: this.monitorAssignmentScope as MonitorAssignmentScope,
        startDate: this.monitorAssignmentStartDate,
        endDate: this.monitorAssignmentEndDate
      }
    });

    return dialogRef.afterClosed();
  }

  private applyMonitorAssignmentSelection(selection: MonitorAssignmentDialogResult): void {
    this.monitorAssignmentScope = selection.scope;
    this.monitorAssignmentStartDate = selection.startDate;
    this.monitorAssignmentEndDate = selection.endDate;
  }

  private buildMonitorTransferPayload(
    monitorId: number | null,
    fallbackSubgroupId: number | null
  ): MonitorTransferPayload {
    const bookingUsers = this.collectBookingUserIdsForAssignment();

    // Scope y rango que vienen del modal / preview:
    const scope = this.monitorAssignmentScope; // 'single' | 'interval' | 'all' | 'from' | 'range'
    const { start, end } = this.resolveAssignmentDateRange();

    // Contexto de la tarea actual
    const ctx = this.taskDetail || {};
    let subgroupId = fallbackSubgroupId;

    if (!bookingUsers.length) {
      if (ctx.course_subgroup_id) {
        subgroupId = ctx.course_subgroup_id;
      } else if (!ctx.all_clients?.length && ctx.booking_id) {
        // mantiene tu fallback actual
        subgroupId = ctx.booking_id;
        ctx.booking_id = null;
      }
    }

    return {
      monitor_id: monitorId,
      booking_users: bookingUsers,
      subgroup_id: subgroupId,

      // NUEVO:
      scope,
      start_date: start.format('YYYY-MM-DD'),
      end_date:   end.format('YYYY-MM-DD'),

      course_id: ctx.course_id ?? null,
      booking_id: ctx.booking_id ?? null,
      course_subgroup_id: ctx.course_subgroup_id ?? null,
      course_date_id: ctx.course_date_id ?? null
    };
  }

  private handleMonitorTransferSuccess(): void {
    this.moveTask = false;
    this.taskMoved = null;
    this.hideDetail();
    this.hideGrouped();
    this.loadBookings(this.currentDate);
    this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
  }

  private handleMonitorTransferError(error: any): void {
    this.moveTask = false;
    this.taskMoved = null;
    console.error('Error occurred:', error);
    const message = error?.error?.message;
    if (message && message.includes('Overlap detected')) {
      this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
    } else {
      this.snackbar.open(this.translateService.instant('event_overlap'), 'OK', { duration: 3000 });
    }
  }

  getDateFormatLong(date: string) {
    return moment(date).format('dddd, D MMMM YYYY');
  }

  getHourRangeFormat(hour_start: string, hour_end: string) {
    return hour_start.substring(0, 5) + ' - ' + hour_end.substring(0, 5);
  }

  getHoursMinutes(hour_start: string, hour_end: string) {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return { hours, minutes };
    };

    const startTime = parseTime(hour_start);
    const endTime = parseTime(hour_end);

    let durationHours = endTime.hours - startTime.hours;
    let durationMinutes = endTime.minutes - startTime.minutes;

    if (durationMinutes < 0) {
      durationHours--;
      durationMinutes += 60;
    }

    return `${durationHours}h${durationMinutes}m`;
  }

  getBirthYears(date: string) {
    const birthDate = moment(date);
    return moment().diff(birthDate, 'years');
  }

  getLanguageById(languageId: number): string {
    const language = this.languages.find(c => c.id === languageId);
    return language ? language.code.toUpperCase() : '';
  }

  getCountryById(countryId: number): string {
    const country = MOCK_COUNTRIES.find(c => c.id === countryId);
    return country ? country.code : 'Aucun';
  }

  getClientDegree(sport_id: any, sports: any) {
    const sportObject = sports.find(sport => sport.id === sport_id);
    if (sportObject && sportObject.pivot && sportObject.pivot.degree_id) {
      return sportObject.pivot.degree_id;
    }
    else {
      return 0;
    }
  }

  openEditMonitor() {
    this.editedMonitor = null;
    this.showEditMonitor = true;
    this.checkAvailableMonitors();
  }

  acceptBooking() {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      maxWidth: '100vw',
      panelClass: 'full-screen-dialog',
      data: { message: this.translateService.instant('accept_task'), title: this.translateService.instant('confirm_accept') }
    });

    dialogRef.afterClosed().subscribe((userConfirmed: boolean) => {
      if (userConfirmed) {
        this.crudService.update('/booking-users', { accepted: true }, this.taskDetail.id)
          .subscribe(() => {
            dialogRef.close(true)
            this.editedMonitor = null;
            this.showEditMonitor = false;
            this.hideDetail();
            this.loadBookings(this.currentDate);
          });
      } else {

      }
    });
  }

  searchMonitorMatch(id: any) {

    let ret = true;
    if (this.monitorsForm && id) {
      this.monitorsForm.forEach(element => {
        if (element.id === id) {
          ret = false;
        }
      });
    }
    return ret;
  }

  hideEditMonitor() {
    this.editedMonitor = null;
    this.showEditMonitor = false;
  }

  private initializeMonitorAssignment(task: any): void {
    // 1) Construye TODAS las fechas del curso para el selector del modal
    const courseDates = task?.course?.course_dates ?? [];
    this.monitorAssignmentDates = courseDates.map((cd: any) => ({
      value: cd.date,
      label: cd.date
    }));

    // 2) Scope por defecto
    this.monitorAssignmentScope = 'single';

    // 3) Rango por defecto (primera y última del curso)
    this.monitorAssignmentStartDate = this.monitorAssignmentDates[0]?.value || null;
    this.monitorAssignmentEndDate   = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || this.monitorAssignmentStartDate;
  }

  private resetMonitorAssignmentState(): void {
    this.monitorAssignmentScope = 'single';
    this.monitorAssignmentStartDate = null;
    this.monitorAssignmentEndDate = null;
    this.monitorAssignmentDates = [];
  }

  /** Extrae fechas del curso con tolerancia a distintos campos (date, date_full, etc.) */
  private getDateStrFromAny(item: any): string | null {
    if (!item) return null;
    // formato preferente YYYY-MM-DD en 'date'
    if (typeof item.date === 'string' && item.date.length >= 10) return item.date.slice(0, 10);
    // a veces viene 'date_full' en ISO con 'Z'
    if (typeof item.date_full === 'string' && item.date_full.length >= 10) return item.date_full.slice(0, 10);
    // por si llega como string directo
    if (typeof item === 'string' && item.length >= 10) return item.slice(0, 10);
    return null;
  }

  private buildMonitorAssignmentDates(task: any): { value: string, label: string }[] {
    if (!task) {
      return [];
    }

    debugger;

    const dateSet = new Set<string>();
    const relatedTasks = this.getRelatedTasks(task);

    relatedTasks
      .map((related: any) => related?.date)
      .filter((date: string) => !!date)
      .forEach((date: string) => dateSet.add(date));

    if (task?.date) {
      dateSet.add(task.date);
    }

    if (dateSet.size === 0) {
      this.collectCourseDatesForTask(task).forEach(date => dateSet.add(date));
      this.collectGroupedTaskDates(task).forEach(date => dateSet.add(date));
    }

    if (dateSet.size === 0 && task?.booking?.course_dates) {
      (task.booking.course_dates as any[])
        .filter(item => item?.date)
        .forEach(item => dateSet.add(item.date));
    }

    const uniqueDates = Array.from(dateSet).filter(Boolean);
    uniqueDates.sort((a, b) => a.localeCompare(b));

    return uniqueDates.map(date => ({
      value: date,
      label: moment(date).format('DD/MM/YYYY')
    }));
  }

  private getRelatedTasks(task: any): any[] {
    if (!task) return [];

    const courseId = task.course_id;
    const subgroupId = task.course_subgroup_id;
    const bookingId = task.booking_id;
    const tasksSource = Array.isArray(this.plannerTasks) ? this.plannerTasks : [];

    return tasksSource.filter(candidate => {
      if (!candidate) return false;

      // 1) mismo intervalo / subgrupo
      if (subgroupId && candidate.course_subgroup_id === subgroupId) return true;

      // 2) mismo curso (todas las fechas del curso)
      if (courseId && candidate.course_id === courseId) return true;

      // 3) misma sesión (fallback)
      if (bookingId && candidate.booking_id && candidate.booking_id === bookingId) return true;

      return false;
    });
  }

  onMonitorAssignmentScopeChange(scope: 'single' | 'from' | 'range'): void {
    // Force 'single' scope for private courses (course_type !== 1)
    if (this.taskDetail?.course?.course_type !== 1) {
      scope = 'single';
    }

    this.monitorAssignmentScope = scope;
    const defaultDate = this.taskDetail?.date || null;

    if (scope === 'single') {
      this.monitorAssignmentStartDate = defaultDate;
      this.monitorAssignmentEndDate = defaultDate;
      return;
    }

    // NEW: Handle interval scope
    if (scope === 'interval') {
      const intervalDates = this.getIntervalDatesForTask(this.taskDetail);
      if (intervalDates.length > 0) {
        this.monitorAssignmentStartDate = intervalDates[0];
        this.monitorAssignmentEndDate = intervalDates[intervalDates.length - 1];
      } else {
        this.monitorAssignmentStartDate = defaultDate;
        this.monitorAssignmentEndDate = defaultDate;
      }
      return;
    }

    const firstDate = this.monitorAssignmentDates[0]?.value || defaultDate;
    const lastDate = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || defaultDate;

    // NEW: Handle all (todo el curso)
    if (scope === 'all') {
      this.monitorAssignmentStartDate = firstDate;
      this.monitorAssignmentEndDate = lastDate;
      return;
    }

    if (scope === 'from') {
      this.monitorAssignmentStartDate = defaultDate ?? firstDate;
      this.monitorAssignmentEndDate = lastDate;
      return;
    }

    // Range scope
    this.monitorAssignmentStartDate = defaultDate ?? firstDate;
    this.monitorAssignmentEndDate = lastDate;
    this.ensureAssignmentRangeOrder();
  }

  onMonitorAssignmentStartChange(value: string): void {
    this.monitorAssignmentStartDate = value;
    if (this.monitorAssignmentScope === 'from') {
      this.monitorAssignmentEndDate = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || value;
    }
    if (this.monitorAssignmentScope === 'range') {
      this.ensureAssignmentRangeOrder();
    }
  }

  onMonitorAssignmentEndChange(value: string): void {
    this.monitorAssignmentEndDate = value;
    if (this.monitorAssignmentScope === 'range') {
      this.ensureAssignmentRangeOrder();
    }
  }

  private ensureAssignmentRangeOrder(): void {
    if (this.monitorAssignmentScope !== 'range') {
      return;
    }
    if (!this.monitorAssignmentStartDate || !this.monitorAssignmentEndDate) {
      return;
    }
    if (this.monitorAssignmentStartDate > this.monitorAssignmentEndDate) {
      const temp = this.monitorAssignmentStartDate;
      this.monitorAssignmentStartDate = this.monitorAssignmentEndDate;
      this.monitorAssignmentEndDate = temp;
    }
  }

  private collectCourseDatesFromCourse(task: any): string[] {
    const set = new Set<string>();

    // 1) curso anidado en la tarea
    const arr = task?.course?.course_dates ?? [];
    if (Array.isArray(arr) && arr.length) {
      arr.forEach((cd: any) => {
        const d = this.getDateStrFromAny(cd);
        if (d) set.add(d);
      });
    }

    // 2) por seguridad añade la propia fecha de la tarea
    const selfDate = this.getDateStrFromAny(task);
    if (selfDate) set.add(selfDate);

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  private collectCourseDatesForTask(task: any): any[] {
    if (!task) return [];

    // 1) si la tarea trae booking.course_dates
    const datesFromBooking = (task.booking?.course_dates ?? [])
      .map((d: any) => d?.date)
      .filter((d: string) => !!d);

    if (datesFromBooking.length) {
      return Array.from(new Set(datesFromBooking)).sort();
    }

    // 2) si existen otras tasks del mismo curso en el planner
    const courseId = task.course_id;
    if (!courseId) return [];

    const datesFromPlanner = (Array.isArray(this.plannerTasks) ? this.plannerTasks : [])
      .filter(t => t?.course_id === courseId && t?.date)
      .map(t => t.date);

    return Array.from(new Set(datesFromPlanner)).sort();
  }

  private collectCourseDateOptionsForTask(task: any): Array<{ value: string; label: string }> {
    const dates = this.collectCourseDatesForTask(task);
    return dates.map(d => ({ value: d, label: d })); // formatea si quieres a locale
  }

/*  private collectCourseDateOptionsForTask(task: any): Array<{ value: string; label: string }> {
    const dateSet = new Set<string>();

    // 1) Fechas desde task.course.course_dates (admin)
    const courseDates = task?.course?.course_dates ?? [];
    courseDates.forEach((cd: any) => {
      if (cd?.date) dateSet.add(cd.date);
    });

    // 2) Fechas desde booking.course_dates (si viene de una reserva concreta)
    const bookingDates = task?.booking?.course_dates ?? [];
    bookingDates.forEach((bd: any) => {
      if (bd?.date) dateSet.add(bd.date);
    });

    // 3) Fechas visibles en planner para ese curso (por si no llegaron anidadas)
    const courseId = task?.course_id ?? task?.course?.id;
    if (courseId && Array.isArray(this.plannerTasks)) {
      this.plannerTasks
        .filter(t => t.course_id === courseId && !!t.date)
        .forEach(t => dateSet.add(t.date));
    }

    const uniqueDates = Array.from(dateSet).sort();
    return uniqueDates.map(d => ({ value: d, label: d })); // Si quieres, formatea el label a locale
  }*/

  private collectGroupedTaskDates(task: any): string[] {
    if (!task?.booking_id) return [];
    const bookingId = task.booking_id;

    const dates = (Array.isArray(this.plannerTasks) ? this.plannerTasks : [])
      .filter(t => t?.booking_id === bookingId && t?.date)
      .map(t => t.date);

    return Array.from(new Set(dates)).sort();
  }

  /**
   * Get all dates that belong to the same interval as the given task
   */
  private getIntervalDatesForTask(task: any): string[] {
    if (!task || !task.course_subgroup_id) {
      return this.collectCourseDatesForTask(task);
    }

    // Find all tasks with the same course_subgroup_id (same interval)
    const intervalTasks = this.plannerTasks.filter(t =>
      t.course_subgroup_id === task.course_subgroup_id
    );

    // Extract and sort unique dates
    const dates = Array.from(new Set(
      intervalTasks
        .map(t => t.date)
        .filter(date => !!date)
    )).sort();

    if (dates.length === 0) {
      return this.collectCourseDatesForTask(task);
    }

    return dates;
  }

  /**
   * Check if the current task's course has multiple intervals
   */
  hasMultipleIntervals(): boolean {
    if (!this.taskDetail) {
      return false;
    }

    // Check if there are multiple unique subgroups for this course
    const courseId = this.taskDetail.course_id;
    if (!courseId) {
      return false;
    }

    const subgroups = new Set(
      this.plannerTasks
        .filter(t => t.course_id === courseId && t.course_subgroup_id)
        .map(t => t.course_subgroup_id)
    );

    if (subgroups.size > 1) {
      return true;
    }

    const course = this.taskDetail.course;
    if (!course || !Array.isArray(course.course_dates)) {
      return false;
    }

    const courseSubgroupIds = new Set<number>();
    course.course_dates.forEach((courseDate: any) => {
      if (!Array.isArray(courseDate?.course_groups)) {
        return;
      }
      courseDate.course_groups.forEach((group: any) => {
        if (!Array.isArray(group?.course_subgroups)) {
          return;
        }
        group.course_subgroups.forEach((subgroup: any) => {
          if (subgroup?.id) {
            courseSubgroupIds.add(subgroup.id);
          }
        });
      });
    });

    return courseSubgroupIds.size > 1;
  }
  private resolveAssignmentDateRange(): { start: moment.Moment, end: moment.Moment } {
    const fallbackDate = this.taskDetail?.date || moment().format('YYYY-MM-DD');
    let startDate = this.monitorAssignmentStartDate || fallbackDate;
    let endDate = this.monitorAssignmentEndDate || startDate;

    if (this.monitorAssignmentScope === 'interval') {
      const intervalDates = this.getIntervalDatesForTask(this.taskDetail);
      if (intervalDates.length > 0) {
        startDate = intervalDates[0];
        endDate = intervalDates[intervalDates.length - 1];
      }
    } else if (this.monitorAssignmentScope === 'from') {
      const last = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || endDate;
      endDate = last;
    } else if (this.monitorAssignmentScope === 'single') {
      startDate = this.taskDetail?.date || startDate;
      endDate = startDate;
    }

    if (moment(startDate).isAfter(moment(endDate))) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    return {
      start: moment(startDate, 'YYYY-MM-DD'),
      end: moment(endDate, 'YYYY-MM-DD')
    };
  }
  private collectBookingUserIdsForAssignment(): number[] {
    const baseTask = this.taskDetail;
    if (!baseTask) {
      return [];
    }

    const relatedTasks = this.getRelatedTasks(baseTask);
    const { start, end } = this.resolveAssignmentDateRange();
    const bookingUserIds = new Set<number>();

    relatedTasks.forEach(candidate => {
      const candidateDate = moment(candidate.date, 'YYYY-MM-DD');
      if (!candidateDate.isValid()) {
        return;
      }
      if (candidateDate.isBefore(start) || candidateDate.isAfter(end)) {
        return;
      }
      const clients = Array.isArray(candidate.all_clients) ? candidate.all_clients : [];
      clients.forEach((client: any) => {
        if (client && client.id != null) {
          bookingUserIds.add(client.id);
        }
      });
    });

    if (bookingUserIds.size === 0 && Array.isArray(baseTask.all_clients)) {
      baseTask.all_clients.forEach((client: any) => {
        if (client && client.id != null) {
          bookingUserIds.add(client.id);
        }
      });
    }

    return Array.from(bookingUserIds);
  }

  getSelectedAssignmentSessionCount(): number {
    const baseTask = this.taskDetail;
    if (!baseTask) {
      return 0;
    }
    const relatedTasks = this.getRelatedTasks(baseTask);
    const { start, end } = this.resolveAssignmentDateRange();
    const dates = new Set<string>();

    relatedTasks.forEach(candidate => {
      const candidateDate = moment(candidate.date, 'YYYY-MM-DD');
      if (candidateDate.isValid() && !candidateDate.isBefore(start) && !candidateDate.isAfter(end)) {
        dates.add(candidate.date);
      }
    });

    if (dates.size === 0 && baseTask.date) {
      dates.add(baseTask.date);
    }

    return dates.size;
  }

  private buildFullMonitorTransferPayload(monitorId: number | null) {
    const bookingUserIds = this.collectBookingUserIdsForAssignment();

    // Fechas según el scope elegido en el preview (las mismas que usa el modal)
    const { start, end } = this.resolveAssignmentDateRange();
    const startDate = start.format('YYYY-MM-DD');
    const endDate   = end.format('YYYY-MM-DD');

    // Ids base de la tarea actual
    const courseId        = this.taskDetail?.course_id ?? this.taskDetail?.course?.id ?? null;
    const bookingId       = this.taskDetail?.booking_id ?? null;
    const subgroupId      = this.taskDetail?.course_subgroup_id ?? null;
    const courseDateId    = this.taskDetail?.course_date_id ?? null;
    const degreeId        = this.taskDetail?.degree?.id ?? null;

    // fallback (como tenías antes) si no hay BU’s ni subgroup explícito
    let fallbackSubgroupId = subgroupId;
    if (!bookingUserIds.length && !fallbackSubgroupId) {
      if (!this.taskDetail?.all_clients?.length && this.taskDetail?.booking_id) {
        fallbackSubgroupId = this.taskDetail.booking_id; // (ojo: tu backend lo llama subgroup_id; aquí mantenemos por compat)
      }
    }

    return {
      // lo que ya tenías
      monitor_id: monitorId,
      booking_users: bookingUserIds,

      // NUEVO: el backend los espera
      scope: this.monitorAssignmentScope,              // 'single'|'interval'|'all'|'from'|'range'
      start_date: startDate,
      end_date: endDate,
      course_id: courseId,
      booking_id: bookingId,
      subgroup_id: fallbackSubgroupId,                 // en el backend lo recoges como subgroup_id
      course_date_id: courseDateId,
      degree_id: degreeId
    };
  }

  saveEditedMonitor() {
    const monitorId = this.editedMonitor ? this.editedMonitor.id : null;

    // payload completo con scope/fechas/ids/degree
    const payload = this.buildFullMonitorTransferPayload(monitorId);

    if (!payload.booking_users.length && !payload.subgroup_id && !payload.course_id) {
      this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      return;
    }

    this.monitorsService.transferMonitor(payload).subscribe(
      () => {
        this.editedMonitor = null;
        this.showEditMonitor = false;
        this.hideDetail();
        this.loadBookings(this.currentDate);
        this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
      },
      (error) => {
        console.error('Error occurred:', error);
        const msg = error?.error?.message || '';
        if (msg.includes('Overlap')) {
          this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
        } else {
          this.snackbar.open(this.translateService.instant('event_overlap'), 'OK', { duration: 3000 });
        }
      }
    );
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  goToEditCourse() {
    const dialogRef = this.dialog.open(CourseDetailComponent, {
      width: '100%',
      height: '1200px',
      maxWidth: '90vw',
      panelClass: 'full-screen-dialog',
      data: {
        id: this.taskDetail.course.id
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {

      }

      this.getData();
    });
  }

  handleDbClickEvent(action: string, event: any, type: string, position: any, monitor_id: any, hourDay?: any, positionWeek?: any): void {

    if (type == 'day' && !this.isDayVisibleDay()) {
      return;
    }
    if (type == 'week' && !this.isDayVisibleWeek(position)) {
      return;
    }
    if (type == 'month' && !this.isDayInMonth(position, positionWeek)) {
      return;
    }
    /* GET DATE,HOUR,MONITOR -> DOUBLE CLICK */

    let dateInfo;
    let currentDate = moment(this.currentDate);

    switch (type) {
      case 'day':
        dateInfo = {
          date: this.currentDate,
          date_format: moment(this.currentDate).format('YYYY-MM-DD'),
          hour: position,
          monitor_id: monitor_id
        };
        break;
      case 'week':
        let mondayOfWeek = currentDate.clone().startOf('isoWeek');
        let weekDayDate = mondayOfWeek.add(position, 'days');
        dateInfo = {
          date: moment(weekDayDate).format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (zz)'),
          date_format: moment(weekDayDate).format('YYYY-MM-DD'),
          hour: hourDay,
          monitor_id: monitor_id
        };
        break;
      case 'month':
        let firstDayOfMonth = currentDate.clone().startOf('month');
        let startOfWeek = firstDayOfMonth.add(positionWeek, 'weeks');
        startOfWeek.startOf('isoWeek');
        let monthDayDate = startOfWeek.add(position, 'days');
        dateInfo = {
          date: moment(monthDayDate).format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (zz)'),
          date_format: moment(monthDayDate).format('YYYY-MM-DD'),
          hour: hourDay,
          monitor_id: monitor_id
        };
        break;
      default:
        throw new Error('Invalid type');
    }


    /* END DATA DOUBLE CLICK */

    const dialogRef = this.dialog.open(CalendarEditComponent, {
      data: {
        event,
        monitor_id: dateInfo.monitor_id,
        date_param: dateInfo.date_format,
        hour_start: dateInfo.hour,
        monitor: this.allMonitorsTimeline.find((m) => m.id === monitor_id)
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {

        if (result.end_date && moment(result.end_date).isAfter(result.start_date)) {
          //RANGE OF DATES
          const dates = [];
          let currentDate = moment(result.start_date);
          const endDate = moment(result.end_date);

          while (currentDate <= endDate) {
            dates.push(currentDate.format('YYYY-MM-DD'));
            currentDate = currentDate.add(1, 'days');
          }

          //Promise for each date
          const promises = dates.map(date => {
            const data = {
              default: false, user_nwd_subtype_id: result.user_nwd_subtype_id, color: result.color, monitor_id: dateInfo.monitor_id, start_date: date, end_date: date, start_time: result.full_day ? null : `${result.start_time}:00`, end_time: result.full_day ? null : `${result.end_time}:00`, full_day: result.full_day, station_id: result.station_id, school_id: result.school_id, description: result.description
            };
            return this.crudService.create('/monitor-nwds', data).toPromise();
          });

          Promise.allSettled(promises).then(results => {
            const failedDates = [];
            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                failedDates.push(dates[index]);
              }
            });

            this.loadBookings(this.currentDate);
            if (failedDates.length === 0) {
              this.snackbar.open(this.translateService.instant('all_events_created'), 'OK', { duration: 3000 });
            } else {
              this.snackbar.open(`${this.translateService.instant('some_dates_overlap')} : ${failedDates.join(', ')}`, 'OK', { duration: 4000 });
            }
          }).catch(error => {
            console.error('Error in range dates:', error);
            this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
          });

        }
        else {
          //ONLY 1 DAY
          const data = {
            default: false, user_nwd_subtype_id: result.user_nwd_subtype_id, color: result.color, monitor_id: dateInfo.monitor_id, start_date: result.start_date, end_date: result.end_date, start_time: result.full_day ? null : `${result.start_time}:00`, end_time: result.full_day ? null : `${result.end_time}:00`, full_day: result.full_day, station_id: result.station_id, school_id: result.school_id, description: result.description
          }
          this.crudService.create('/monitor-nwds', data)
            .subscribe((data) => {

              //this.getData();
              this.loadBookings(this.currentDate);
              this.snackbar.open(this.translateService.instant('event_created'), 'OK', { duration: 3000 });
            },
              (error) => {
                // Error handling code
                console.error('Error occurred:', error);
                if (error.error && error.error.message && error.error.message == "El monitor está ocupado durante ese tiempo y no se puede crear el MonitorNwd") {
                  this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
                }
                else {
                  this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
                }
              })
        }


        //CHANGE
        /*let id = 1
        result.monitor_id = id;

        const isOverlap = this.eventService.isOverlap(this.events, result);
        if (isOverlap.length === 0) {
          if (result.user_nwd_subtype_id !== 0) {

            this.crudService.create('/monitor-nwds', result)
            .subscribe((data) => {

              this.getData();
              this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
            })
          }
        } else {

          const updateEdit = this.events[isOverlap[0].overlapedId].id;
          this.crudService.update('/monitor-nwds', isOverlap[0].dates[0], updateEdit)
            .subscribe((data) => {
              isOverlap[0].dates[1].start_time = data.data.end_time;
              this.crudService.create('/monitor-nwds', isOverlap[0].dates[1])
              .subscribe((data) => {

                this.getData();
                this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
              })
            })
          // hacer el update y el create
          this.snackbar.open('Existe un solapamiento', 'OK', {duration: 3000});
        }*/
        this.getData();
      } else {
        this.getData();
      }
    });
  }

  toggleBlockGeneral() {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      maxWidth: '100vw',
      panelClass: 'full-screen-dialog',
      data: { message: this.translateService.instant('create_general_blockage'), title: this.translateService.instant('general_blockage') }
    });

    dialogRef.afterClosed().subscribe((userConfirmed: boolean) => {
      if (userConfirmed) {
        this.createBlockGeneral();
      }
    });
  }

  createBlockGeneral(): void {

    let currentDateFormat = moment(this.currentDate).format('YYYY-MM-DD');
    const dialogRef = this.dialog.open(CalendarEditComponent, {
      data: {
        block_general: true,
        date_param: currentDateFormat,
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {

        //ONLY 1 DAY
        const promises = this.allMonitorsTimeline.map(monitor => {
          const data = {
            user_nwd_subtype_id: result.user_nwd_subtype_id,
            color: result.color,
            monitor_id: monitor.id,
            start_date: result.start_date,
            end_date: result.end_date,
            start_time: result.full_day ? null : `${result.start_time}:00`,
            end_time: result.full_day ? null : `${result.end_time}:00`,
            full_day: result.full_day,
            station_id: result.station_id,
            school_id: result.school_id,
            description: result.description
          };

          return this.crudService.create('/monitor-nwds', data).toPromise();
        });

        const failedMonitors = [];

        Promise.allSettled(promises).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              const monitor = this.allMonitorsTimeline[index];
              failedMonitors.push(`${monitor.first_name} ${monitor.last_name}`);
            }
          });

          this.loadBookings(this.currentDate);
          if (failedMonitors.length === 0) {
            this.snackbar.open(this.translateService.instant('all_events_created'), 'OK', { duration: 3000 });
          } else {
            //this.snackbar.open(`${this.translateService.instant('some_monitors_overlap')} : ${failedMonitors.join(', ')}`, 'OK', { duration: 4000 });
            this.snackbar.open(this.translateService.instant('some_monitors_overlap'), 'OK', { duration: 4000 });
          }
        }).catch(error => {
          console.error('Error in block general:', error);
          this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
        });



        //CHANGE
        /*let id = 1
        result.monitor_id = id;

        const isOverlap = this.eventService.isOverlap(this.events, result);
        if (isOverlap.length === 0) {
          if (result.user_nwd_subtype_id !== 0) {

            this.crudService.create('/monitor-nwds', result)
            .subscribe((data) => {

              this.getData();
              this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
            })
          }
        } else {

          const updateEdit = this.events[isOverlap[0].overlapedId].id;
          this.crudService.update('/monitor-nwds', isOverlap[0].dates[0], updateEdit)
            .subscribe((data) => {
              isOverlap[0].dates[1].start_time = data.data.end_time;
              this.crudService.create('/monitor-nwds', isOverlap[0].dates[1])
              .subscribe((data) => {

                this.getData();
                this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
              })
            })
          // hacer el update y el create
          this.snackbar.open('Existe un solapamiento', 'OK', {duration: 3000});
        }*/

      }
    });
  }

  /* FILTER */
  onCheckChange(sportId: number, isChecked: boolean) {
    if (isChecked) {
      this.checkedSports.add(sportId);
    } else {
      this.checkedSports.delete(sportId);
    }
  }

  areAllChecked() {
    return this.checkedSports.size === this.sports.length;
  }

  compareUsers(user1: any, user2: any): boolean {
    return user1 && user2 ? user1.id === user2.id && user1.first_name === user2.first_name && user1.last_name === user2.last_name : user1 === user2;
  }

  showResetFilters() {
    return !(this.areAllChecked() && this.filterMonitor == null && this.filterBookingUser == null &&
      this.filterFree && !this.filterOccupied &&
      this.filterCollective && this.filterPrivate && this.filterNwd && this.filterActivity &&
      this.filterBlockPayed && this.filterBlockNotPayed);
  }

  applyFilters() {
    this.showFilter = false;
    this.saveFilters();
    this.loadBookings(this.currentDate);
  }

  saveFilters() {
    const filterOptions = {
      checkedSports: Array.from(this.checkedSports),
      filterMonitor: this.filterMonitor,
      filterBookingUser: this.filterBookingUser,
      filterFree: this.filterFree,
      filterOccupied: this.filterOccupied,
      filterCollective: this.filterCollective,
      filterActivity: this.filterActivity,
      filterPrivate: this.filterPrivate,
      filterNwd: this.filterNwd,
      filterBlockPayed: this.filterBlockPayed,
      filterBlockNotPayed: this.filterBlockNotPayed,
    };

    localStorage.setItem('filterOptions', JSON.stringify(filterOptions));
  }

  loadSavedFilters() {
    const filterOptions = localStorage.getItem('filterOptions');
    if (filterOptions) {
      const options = JSON.parse(filterOptions);

      this.checkedSports = new Set(options.checkedSports);
      this.filterMonitor = options.filterMonitor;
      this.filterBookingUser = options.filterBookingUser,
        this.filterFree = options.filterFree;
      this.filterOccupied = options.filterOccupied;
      this.filterCollective = options.filterCollective;
      this.filterActivity = options.filterActivity;
      this.filterPrivate = options.filterPrivate;
      this.filterNwd = options.filterNwd;
      this.filterBlockPayed = options.filterBlockPayed;
      this.filterBlockNotPayed = options.filterBlockNotPayed;
    }
  }

  resetFilters() {
    this.checkedSports.clear();
    this.sports.forEach(sport => this.checkedSports.add(sport.id));
    this.filterMonitor = null;
    this.filterBookingUser = null;
    this.filterFree = true;
    this.filterOccupied = false;
    this.filterCollective = true;
    this.filterActivity = true;
    this.filterPrivate = true;
    this.filterNwd = true;
    this.filterBlockPayed = true;
    this.filterBlockNotPayed = true;

    //Remove saved filters
    localStorage.removeItem('filterOptions');
    this.showFilter = false;
    this.loadBookings(this.currentDate);
  }

  /* Edit blocks */

  openEditBlock() {
    this.allHoursDay = this.blockDetail.full_day;
    this.startTimeDay = this.blockDetail.hour_start;
    this.endTimeDay = this.blockDetail.hour_end;
    this.nameBlockDay = this.blockDetail.name;
    this.divideDay = false;
    this.startTimeDivision = '';
    this.endTimeDivision = '';
    this.showEditBlock = true;
  }

  hideEditBlock() {
    this.showEditBlock = false;
  }

  onStartTimeDayChange() {
    const filteredEndHours = this.filteredEndHoursDay;

    if (!filteredEndHours.includes(this.endTimeDay)) {
      this.endTimeDay = filteredEndHours[0] || '';
    }
  }

  get filteredEndHoursDay() {
    const startIndex = this.hoursRangeMinutes.indexOf(this.startTimeDay);
    return this.hoursRangeMinutes.slice(startIndex + 1);
  }

  onStartTimeDivisionChange() {
    const filteredEndHours = this.filteredEndHoursDivision;
    if (!filteredEndHours.includes(this.endTimeDivision)) {
      this.endTimeDivision = filteredEndHours[0] || '';
    }
  }

  get filteredStartHoursDivision() {
    const startIndex = this.allHoursDay ? this.hoursRangeMinutes.indexOf(this.hoursRangeMinutes[0]) : this.hoursRangeMinutes.indexOf(this.startTimeDay);
    const endIndex = this.allHoursDay ? this.hoursRangeMinutes.indexOf(this.hoursRangeMinutes[this.hoursRangeMinutes.length - 1]) : this.hoursRangeMinutes.indexOf(this.endTimeDay);
    return this.hoursRangeMinutes.slice(startIndex + 1, endIndex - 1);
  }

  get filteredEndHoursDivision() {
    const defaultStartIndex = this.calculateDefaultStartTimeDivisionIndex();
    const startIndex = this.startTimeDivision ? this.hoursRangeMinutes.indexOf(this.startTimeDivision) : defaultStartIndex;
    const endIndex = this.allHoursDay ? this.hoursRangeMinutes.indexOf(this.hoursRangeMinutes[this.hoursRangeMinutes.length - 1]) : this.hoursRangeMinutes.indexOf(this.endTimeDay);
    return this.hoursRangeMinutes.slice(startIndex + 1, endIndex);
  }

  calculateDefaultStartTimeDivisionIndex() {
    const blockStartTimeIndex = this.allHoursDay ? this.hoursRangeMinutes.indexOf(this.hoursRangeMinutes[0]) : this.hoursRangeMinutes.indexOf(this.startTimeDay);
    return blockStartTimeIndex + 1;
  }

  isButtonDayEnabled() {
    if (this.divideDay) {
      return this.nameBlockDay && this.startTimeDivision && this.endTimeDivision && (this.allHoursDay || (this.startTimeDay && this.endTimeDay));
    } else {
      return this.nameBlockDay && (this.allHoursDay || (this.startTimeDay && this.endTimeDay));
    }
  }

  saveEditedBlock() {
    const commonData = {
      monitor_id: this.blockDetail.monitor_id,
      school_id: this.blockDetail.school_id,
      station_id: this.blockDetail.station_id,
      description: this.nameBlockDay,
      color: this.blockDetail.color_block,
      user_nwd_subtype_id: this.blockDetail.user_nwd_subtype_id,
    };
    let firstBlockData: any = { ...commonData, start_date: this.blockDetail.start_date, end_date: this.blockDetail.end_date };
    let secondBlockData: any;

    // Calculate time moments
    firstBlockData.start_time = this.allHoursDay ? `${this.hoursRangeMinutes[0]}:00` : `${this.startTimeDay}:00`;
    firstBlockData.end_time = this.divideDay ? `${this.startTimeDivision}:00` : (this.allHoursDay ? `${this.hoursRangeMinutes[this.hoursRangeMinutes.length - 1]}:00` : `${this.endTimeDay}:00`);
    firstBlockData.full_day = this.allHoursDay && !this.divideDay;


    // Function update first block -> CALL LATER
    const updateFirstBlock = () => {
      this.crudService.update('/monitor-nwds', firstBlockData, this.blockDetail.block_id).subscribe(
        response => {
          if (this.divideDay) {
            createSecondBlock();
          } else {
            finalizeUpdate();
          }
        },
        error => {
          handleErrorUpdatingBlock(error);
        }
      );
    };

    const createSecondBlock = () => {
      secondBlockData = { ...commonData, start_date: this.blockDetail.start_date, end_date: this.blockDetail.end_date, start_time: `${this.endTimeDivision}:00`, end_time: `${this.endTimeDay}:00`, full_day: false };
      this.crudService.post('/monitor-nwds', secondBlockData).subscribe(
        secondResponse => {
          finalizeUpdate();
        },
        error => {
          handleErrorCreatingBlock(error);
        }
      );
    };

    const finalizeUpdate = () => {
      this.hideEditBlock();
      this.hideBlock();
      this.loadBookings(this.currentDate);
      this.snackbar.open(this.translateService.instant('event_edited'), 'OK', { duration: 3000 });
    };

    const handleErrorUpdatingBlock = (error: any) => {
      console.error('Error occurred:', error);
      if (error.error && error.error.message && error.error.message == "El monitor está ocupado durante ese tiempo y no se puede actualizar el MonitorNwd") {
        this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
      }
      else {
        this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      }
    };

    const handleErrorCreatingBlock = (error: any) => {
      console.error('Error occurred:', error);
      if (error.error && error.error.message && error.error.message == "El monitor está ocupado durante ese tiempo y no se puede actualizar el MonitorNwd") {
        this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
      }
      else {
        this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      }
    };

    // Start Update Process
    updateFirstBlock();
  }

  deleteEditedBlock() {
    const isConfirmed = confirm('Êtes-vous sûr de vouloir supprimer le blocage?');
    if (isConfirmed) {
      this.crudService.delete('/monitor-nwds', this.blockDetail.block_id).subscribe(
        response => {
          this.hideEditBlock();
          this.hideBlock();
          this.loadBookings(this.currentDate);
        },
        error => {
        }
      );
    }
  }

  getDayOfWeek(dayIndex: number): number {
    const startOfWeek = moment(this.currentDate).startOf('isoWeek');
    const specificDate = startOfWeek.add(dayIndex, 'days');
    return specificDate.date();
  }

  /*
  getDayOfMonth(weekIndex: number, dayIndex: number): string {
    const startOfWeek = moment(startOfMonth(this.currentDate)).add(weekIndex, 'weeks');
    const specificDate = startOfWeek.startOf('isoWeek').add(dayIndex, 'days');
    if (specificDate.month() === this.currentDate.getMonth()) {
        return specificDate.format('D');
    }
    return '';
  }
  */

  checkAvailableMonitors() {

    this.loadingMonitors = true;

    const clientIds = (this.taskDetail.all_clients || []).map((client) => client.id);
    const data = {
      sportId: this.taskDetail.sport_id,
      minimumDegreeId: this.taskDetail.degree_id || this.taskDetail.degree.id,
      startTime: this.taskDetail.hour_start,
      endTime: this.taskDetail.hour_end,
      date: this.taskDetail.date,
      clientId: clientIds
    };

    this.crudService.post('/admin/monitors/available', data)
      .subscribe((response) => {
        this.monitorsForm = response.data;
        this.loadingMonitors = false;
      })
  }

  detailBooking(bookingId = null) {
    let id = bookingId !== null ? bookingId : this.taskDetail.booking_id;
    //this.router.navigate(["bookings/update/" + id]);
    const dialogRef = this.dialog.open(BookingDetailV2Component, {
      width: '100%',
      height: '1200px',
      maxWidth: '90vw',
      panelClass: 'full-screen-dialog',
      data: {
        id: bookingId !== null ? bookingId : this.taskDetail.booking_id,
        isModal:true
      }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {
        this.snackbar.open(this.translateService.instant('snackbar.booking.create'), 'OK', { duration: 3000 });
      }
    });
  }

  editBooking(bookingId = null) {
    let id = bookingId !== null ? bookingId : this.taskDetail.booking_id;

    const dialogRef = this.dialog.open(EditDateComponent, {
      width: "60vw",
      maxWidth: "100vw",
      panelClass: "full-screen-dialog",
      data: this.taskDetail
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {
        this.hideDetail();
        this.hideGrouped();
        this.loadBookings(this.currentDate);
        /*          const bookingLog = {
                    booking_id: this.id,
                    action: 'update booking',
                    description: 'update booking',
                    user_id: this.user.id,
                    before_change: 'confirmed',
                    school_id: this.user.schools[0].id
                  }

                  this.crudService.post('/booking-logs', bookingLog).subscribe(() => {});*/

      }
    });
  }

  openUserTransfer() {
    const dialogRef = this.dialog.open(CourseUserTransferTimelineComponent, {
      width: '800px',
      height: '800px',
      maxWidth: '100vw',  // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales
      data: {
        degree: this.taskDetail.degree, subgroup: this.taskDetail.course_subgroup_id, id: this.taskDetail.course_id,
        subgroupNumber: this.taskDetail.subgroup_number, currentDate: moment(this.taskDetail.date), degrees: this.taskDetail.degrees_sport, currentStudents: this.taskDetail.all_clients
      }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {
        dialogRef.close();
        this.hideDetail();
        this.hideGrouped();
        this.loadBookings(this.currentDate);
      }
    });
  }



  /**
   * Handle click events on the document to close modals when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Excluir clicks en overlays de Material Angular (dropdowns, datepickers, etc.)
    const isMaterialOverlay = target.closest('.mat-select-panel, .cdk-overlay-pane, .mat-menu-panel, .mat-datepicker-popup, .mat-autocomplete-panel');

    // Close grouped tasks modal (left sidebar) if clicking outside
    if (this.showGrouped) {
      const groupedModal = target.closest('.modal-grouped');
      if (!groupedModal && !isMaterialOverlay) {
        this.hideGrouped();
      }
    }

    // Close detail modal (right sidebar) if clicking outside
    if (this.showDetail) {
      const detailModal = target.closest('.col-right, .box-detail-timeline');
      if (!detailModal && !isMaterialOverlay) {
        this.hideDetail();
      }
    }

    // Close block detail modal if clicking outside
    if (this.showBlock) {
      const blockModal = target.closest('.box-detail-timeline');
      if (!blockModal && !isMaterialOverlay) {
        this.hideBlock();
      }
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isMatch(monitorId: any): boolean {
    return !!this.matchResults[monitorId];
  }

  async updateMatchResults() {
    const promises = this.filteredMonitors.map(async (monitor) => {
      const match = await this.matchTeacher(monitor.id);
      this.matchResults[monitor.id] = match;
    });

    await Promise.all(promises);
  }

  async matchTeacher(monitorId: any): Promise<boolean> {
    let ret = false;

    if (monitorId !== null && this.monitorsForm) {
      const monitor = this.allMonitors.find((m) => m.id === monitorId);
      const monitorLanguages = {
        "language1_id": monitor.language1_id,
        "language2_id": monitor.language2_id,
        "language3_id": monitor.language3_id,
        "language4_id": monitor.language4_id,
        "language5_id": monitor.language5_id,
        "language6_id": monitor.language6_id
      };

      const sport = monitor.sports.find((s) => s.id === this.taskDetail.sport_id);
      if (!sport) {
        ret = true;
      } else {
        for (const client of this.taskDetail.all_clients) {
          const clientLanguages = {
            "language1_id": client.client.language1_id,
            "language2_id": client.client.language2_id,
            "language3_id": client.client.language3_id,
            "language4_id": client.client.language4_id,
            "language5_id": client.client.language5_id,
            "language6_id": client.client.language6_id
          };

          if (this.langMatch(monitorLanguages, clientLanguages)) {
            ret = false;
          }
          else {
            ret = true;
            break;
          }

          if (this.taskDetail.course.course_type !== 2) {
            const data = await firstValueFrom(this.crudService.list('/monitor-sports-degrees', 1, 1000, 'desc', 'id', '&monitor_id=' + monitor.id + '&school_id=' + this.activeSchool + '&sport_id=' + this.taskDetail.sport_id));

            if (data.data.length > 0) {
              const authsD = await firstValueFrom(this.crudService.list('/monitor-sport-authorized-degrees', 1, 1000, 'desc', 'id', '&monitor_id=' + monitor.id + '&school_id=' + this.activeSchool + '&monitor_sport_id=' + data.data[0].id));

              for (const element of authsD.data) {
                if (element.degree_id === this.taskDetail.degree.id) {
                  ret = true;
                  break;
                }
              }
            }

          }
        }
      }
    }
    return ret;
  }

  langMatch(objeto1, objeto2) {
    for (const key1 in objeto1) {
      if (objeto1[key1] !== null) {
        for (const key2 in objeto2) {
          if (objeto1[key1] === objeto2[key2]) {
            return true; // Retorna verdadero si encuentra una coincidencia
          }
        }
      }
    }
    return false;
  }

  //Change degree wheel in monitor
  changeMonitorDegree(monitor: any, index: number): void {
    monitor.sport_degrees_check = index;
  }

  getDegree(id: any) {
    if (id && id !== null) {
      return this.degrees.find((l) => l.id === id);

    }
  }

  encontrarPrimeraCombinacionConValores(data: any) {
    if (data !== null) {
      for (const intervalo of data) {
        // Usamos Object.values para obtener los valores del objeto y Object.keys para excluir 'intervalo'
        if (Object.keys(intervalo).some(key => key !== 'intervalo' && intervalo[key] !== null)) {
          return intervalo;
        }
      }
      return null; // Devuelve null si no encuentra ninguna combinación válida
    }

  }

  encontrarPrimeraClaveConValor(obj: any): string | null {
    if (obj !== null) {
      for (const clave of Object.keys(obj)) {
        if (obj[clave] !== null && clave !== 'intervalo') {
          return obj[clave];
        }
      }
      return null;
    }

  }

  protected readonly parseInt = parseInt;
}
