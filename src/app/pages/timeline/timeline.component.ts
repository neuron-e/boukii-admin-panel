import {Component, AfterViewInit, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
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
import {MonitorTransferPayload, MonitorTransferPreviewPayload, MonitorsService} from 'src/service/monitors.service';
import {LEVELS} from 'src/app/static-data/level-data';
import {MOCK_COUNTRIES} from 'src/app/static-data/countries-data';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {ConfirmModalComponent} from '../monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import {GroupedBlockDeleteDialogComponent} from './grouped-block-delete-dialog/grouped-block-delete-dialog.component';
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
import {firstValueFrom, forkJoin, Observable, of, Subject} from 'rxjs';
import {map, startWith, takeUntil} from 'rxjs/operators';
import {FormControl} from '@angular/forms';
import {DateAdapter} from '@angular/material/core';
import {Router} from '@angular/router';
import {EditDateComponent} from './edit-date/edit-date.component';
import {BookingDetailV2Component} from '../bookings-v2/booking-detail/booking-detail.component';
import {
  MonitorAssignmentDialogComponent,
  MonitorAssignmentDialogResult,
  MonitorAssignmentScope,
  MonitorAssignmentDialogSummaryItem
} from './monitor-assignment-dialog/monitor-assignment-dialog.component';
import { MonitorAssignmentHelperService, MonitorAssignmentSlot } from 'src/app/shared/services/monitor-assignment-helper.service';
import { MonitorAssignmentLoadingDialogComponent } from 'src/app/shared/dialogs/monitor-partial-availability/monitor-assignment-loading-dialog.component';

moment.locale('fr');

@Component({
  selector: 'vex-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnDestroy, AfterViewInit {

  private destroy$ = new Subject<void>();
  private loadingDialogRef?: MatDialogRef<MonitorAssignmentLoadingDialogComponent>;
  private keydownHandler?: (event: KeyboardEvent) => void;
  // FIX: Sincronizar scroll horizontal
  private hoursScrollElement?: HTMLDivElement;
  private readonly plannerViewStorageKey = 'plannerViewState';

  hoursRange: string[];
  hoursRangeMinusLast: string[];
  hoursRangeMinutes: string[];

  monitorsForm: any[];
  private currentAssignmentSlots: MonitorAssignmentSlot[] = [];
  private currentAssignmentTargetSubgroupIds = new Set<number>();
  private monitorSelectOptionsCache: any[] = [];
  private monitorOptionsVersion = 0;
  private monitorSelectOptionsCacheVersion = -1;

  loadingMonitors = true;
  loading = true;
  deletingGroupedBlocks = false;

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
  selectedTaskKey: string | null = null;
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
  monitorSearchHint = '';

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
  private monitorMatchCache = new Map<string, boolean>();
  private monitorDegreeAuthCache = new Map<string, Promise<Set<number>>>();

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
  monitorAssignmentSubgroupIds: number[] = [];
  monitorAssignmentSelectedDates: string[] = [];
  monitorAssignmentDates: { value: string, label: string }[] = [];
  monitorSearchTerm: string = '';
  hasApiAvailability = false;
  @Input() filterCourseId: number | null = null;
  private assignmentBookingUsersCache = new Map<number, any[]>();

  constructor(private crudService: ApiCrudService, private monitorsService: MonitorsService, private dialog: MatDialog, public translateService: TranslateService,
    private snackbar: MatSnackBar, private dateAdapter: DateAdapter<Date>, private router: Router,
    private assignmentHelper: MonitorAssignmentHelperService) {
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

  /**
   * FIX: Inicializa referencias para sincronizacion de scroll
   */
  ngAfterViewInit(): void {
    const hoursScrollElements = document.querySelectorAll('.hours-scroll');
    if (hoursScrollElements.length > 0) {
      this.hoursScrollElement = hoursScrollElements[0] as HTMLDivElement;
    }
  }

  /**
   * FIX: Sincroniza el scroll del header de horas con el grid
   */
  syncHoursScroll(event: Event): void {
    const scrollLeft = (event.target as HTMLDivElement).scrollLeft;

    const hoursRows = document.querySelectorAll('.hours-row');
    hoursRows.forEach((row: Element) => {
      (row as HTMLDivElement).scrollLeft = scrollLeft;
    });
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
    this.keydownHandler = this.handleKeydownEvent.bind(this);
    document.addEventListener('keydown', this.keydownHandler);


    this.activeSchool = await this.getUser();
    await this.getLanguages();
    await this.getSports();
    await this.getSchoolSports();
    await this.getDegrees();
    this.crudService.list('/seasons', 1, 10000, 'asc', 'id', '&school_id=' + this.user.schools[0].id + '&is_active=1')
      .pipe(takeUntil(this.destroy$)).subscribe((season) => {
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

    this.loadSavedViewState();
    this.syncViewLabels();
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

  private syncViewLabels(): void {
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
  }

  updateView() {
    this.syncViewLabels();
    this.saveViewState();
    this.loadBookings(this.currentDate);
  }

  loadBookings(date: Date, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      this.loading = true;
    }
    let firstDate, lastDate;
    if (this.timelineView === 'week') {
      const startOfWeekDate = startOfWeek(date, { weekStartsOn: 1 });
      const endOfWeekDate = endOfWeek(date, { weekStartsOn: 1 });
      firstDate = moment(startOfWeekDate).format('YYYY-MM-DD');
      lastDate = moment(endOfWeekDate).format('YYYY-MM-DD');
      this.searchBookings(firstDate, lastDate, options);

      /*this.filteredTasks = this.tasksCalendarStyle.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= startOfWeekDate && taskDate <= endOfWeekDate;
      });*/
    } else if (this.timelineView === 'month') {
      const startMonth = startOfMonth(date);
      const endMonth = endOfMonth(date);
      firstDate = moment(startMonth).format('YYYY-MM-DD');
      lastDate = moment(endMonth).format('YYYY-MM-DD');
      this.searchBookings(firstDate, lastDate, options);

      /*this.filteredTasks = this.tasksCalendarStyle.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= startMonth && taskDate <= endMonth;
      });*/
    } else {
      const dateStr = date.toLocaleString().split('T')[0];
      firstDate = moment(date).format('YYYY-MM-DD');
      lastDate = firstDate;
      this.searchBookings(firstDate, lastDate, options);
      /*this.filteredTasks = this.tasksCalendarStyle.filter(task => task.date === dateStr);*/
    }

  }

  searchBookings(firstDate: string, lastDate: string, options: { silent?: boolean } = {}) {
    this.crudService.get('/admin/getPlanner?date_start=' + firstDate + '&date_end=' + lastDate + '&school_id=' + this.activeSchool + '&perPage=' + 99999).pipe(takeUntil(this.destroy$)).subscribe(
      (data: any) => {
        this.processData(data.data);
      },
      error => {
        if (!options.silent) {
          this.loading = false;
        }
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

            const courseType = bookingArray[0].course.course_type;
            // Private bookings: group shared sessions (same booking/group/date/time).
            if (courseType === 2) {
              const groupedBySession = bookingArray.reduce((acc, curr) => {
                const groupId = curr.group_id ?? curr.course_group_id ?? curr.course_subgroup_id ?? 'no-group';
                const bookingId = curr.booking_id ?? curr.id ?? 'no-booking';
                const key = `${bookingId}-${groupId}-${curr.date ?? ''}-${curr.hour_start}-${curr.hour_end}`;
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push(curr);
                return acc;
              }, {});

              Object.values(groupedBySession).forEach((sessionGroup: any[]) => {
                const resolvedMonitorId = sessionGroup.find(item => item?.monitor_id != null)?.monitor_id ?? null;
                if (resolvedMonitorId != null) {
                  sessionGroup.forEach(item => {
                    item.monitor_id = resolvedMonitorId;
                  });
                }
                bookingArrayComplete.push(sessionGroup);
              });
            } else if (courseType === 3 && bookingArray.length > 1) {
              // Activity bookings keep time grouping.
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
                    const representative = (groupedBookingArray[0]?.course?.course_type === 2)
                      ? (groupedBookingArray.find(entry => entry?.monitor_id != null) ?? groupedBookingArray[0])
                      : groupedBookingArray[0];
                    const firstBooking = { ...representative, bookings_number: groupedBookingArray.length, bookings_clients: groupedBookingArray };
                    allBookings.push(firstBooking);
                  }
                }
              } else {
                if (hasAtLeastOne && hasAtLeastOneBooking) {
                  if ((this.filterCollective || groupedBookingArray[0].course.course_type !== 1) &&
                    (this.filterPrivate || groupedBookingArray[0].course.course_type !== 2) &&
                    (this.filterActivity || groupedBookingArray[0].course.course_type === 3)) {
                    const representative = (groupedBookingArray[0]?.course?.course_type === 2)
                      ? (groupedBookingArray.find(entry => entry?.monitor_id != null) ?? groupedBookingArray[0])
                      : groupedBookingArray[0];
                    const firstBooking = { ...representative, bookings_number: groupedBookingArray.length, bookings_clients: groupedBookingArray };
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
        usersToProcess = booking.booking_users ?? booking.bookings_clients;
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

      if (this.filterCourseId) {
        const targetId = Number(this.filterCourseId);
        allBookings = allBookings.filter(booking => {
          const resolvedCourseId =
            booking?.course_id ??
            booking?.course?.id ??
            booking?.course_group?.course_id ??
            booking?.courseGroup?.course_id ??
            booking?.course_group?.course?.id ??
            booking?.courseGroup?.course?.id ??
            null;
          return Number(resolvedCourseId) === targetId;
        });
      }

      if (this.filterBookingUser && this.filterBookingUser.id) {
        const monitorIds = new Set<number | null>();
        allBookings.forEach(booking => {
          const monitorId = booking?.monitor_id ?? null;
          monitorIds.add(monitorId);
        });
        this.filteredMonitors = this.filteredMonitors.filter(monitor => monitorIds.has(monitor?.id ?? null));
        this.allMonitorsTimeline = this.allMonitorsTimeline.filter(monitor => monitorIds.has(monitor?.id ?? null));
        this.allMonitors = this.allMonitors.filter(monitor => monitorIds.has(monitor?.id ?? null));
      }

      //Convert them into TASKS

    allBookings.forEach(booking => {
      // Process if it's a CourseSubgroup (has course_group_id) or BookingUser without booking property
        const isSubgroup = booking.course_group_id != null;
      const isUnprocessedBooking = !booking.booking;

      if (isSubgroup || isUnprocessedBooking) {
        // For subgroups, get course from course_group.course; for booking_users, from booking.course
        const course = booking.course || booking.courseGroup?.course || booking.course_group?.course;
        const courseDate = course?.course_dates?.find((date: any) => date.id === booking.course_date_id);

        if (!booking.booking) {
          booking.booking = {
            id: booking.id
          };
        }

        booking.date = courseDate ? courseDate.date : null;
        booking.hour_start = courseDate ? courseDate.hour_start : null;
        booking.hour_end = courseDate ? courseDate.hour_end : null;

        // Filter by status = 1 (active bookings only) to get correct count
        // API returns booking_users (snake_case) for CourseSubgroup
        const rawBookingUsers = booking.booking_users || booking.bookingUsers || [];
        const activeBookingUsers = Array.isArray(rawBookingUsers)
          ? rawBookingUsers.filter((user: any) => user?.status === 1)
          : [];
        booking.bookings_number = activeBookingUsers.length;
        booking.bookings_clients = activeBookingUsers;

        // Ensure course reference is available for later processing
        if (!booking.course && course) {
          booking.course = course;
        }
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

        const computedSubgroupNumber = this.resolveBookingSubgroupOrder(booking);
        const subgroupNumber = booking.subgroup_number ?? computedSubgroupNumber;

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
          name: this.getCourseDisplayName(booking.course),
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
          course_subgroup_id: booking.course_subgroup_id
            ?? booking.subgroup_id
            ?? (booking.booking_users && booking.booking_users?.length > 0 ? booking.booking_users[0].course_subgroup_id : null),
          subgroup_number: subgroupNumber,
          total_subgroups: booking.total_subgroups,
          course: booking.course,
          meeting_point: booking.meeting_point,
          meeting_point_address: booking.meeting_point_address,
          meeting_point_instructions: booking.meeting_point_instructions,
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

  private getCourseDisplayName(course: any): string {
    const translated = this.extractDisplayName(course?.translations);
    if (translated) {
      return translated;
    }

    const fallback = this.extractDisplayName(course?.name);
    if (fallback) {
      return fallback;
    }

    return '';
  }

  private extractDisplayName(value: any): string {
    if (!value) return '';

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }

      try {
        const parsed = JSON.parse(value);
        return this.extractDisplayName(parsed);
      } catch {
        return '';
      }
    }

    if (typeof value === 'object') {
      const lang = this.translateService.currentLang || this.translateService.getDefaultLang();
      const candidate = (value as any)[lang];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
      if (candidate && typeof candidate === 'object' && candidate.name) {
        return candidate.name;
      }

      const objectValues = Object.values(value as Record<string, any>);
      for (const entry of objectValues) {
        const item = entry as any;
        if (typeof item === 'string' && item.trim()) {
          return item.trim();
        }
        if (item && typeof item === 'object') {
          if (item.name) {
            return item.name;
          }
        }
      }
    }

    return '';
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

    //Store ids that will be deleted (no monitor grouping)
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

    const buildMonitorGroupKey = (task: any): string | null => {
      if (task.course_id == null || task.monitor_id == null) {
        return null;
      }
      const courseType = task.course?.course_type ?? task.course_type ?? null;
      const baseKey = courseType == 1
        ? `${task.course_id}-${task.hour_start}-${task.hour_end}`
        : `${task.course_id}-${task.hour_start}-${task.hour_end}-${task.group_id}`;
      return `${task.monitor_id}-${task.date}-${baseKey}`;
    };

    const buildMonitorTaskKey = (task: any): string => {
      const bookingId = task?.booking_id ?? task?.id ?? 'none';
      const date = task?.date ?? 'no-date';
      const start = task?.hour_start ?? 'no-start';
      const monitorId = task?.monitor_id ?? 'no-monitor';
      const subgroupId = task?.course_subgroup_id ?? task?.subgroup_id ?? 'no-subgroup';
      return `${bookingId}-${date}-${start}-${monitorId}-${subgroupId}`;
    };

    // Remove the original tasks that were grouped -> NOT THE ONES THAT ALREADY HAVE MONITOR
    const filteredPlannerTasks = plannerTasks.filter(task =>
      !groupedTaskIds.has(task.booking_id) ||
      (groupedTaskIds.has(task.booking_id) && task.monitor_id)
    );

    // Group overlapping tasks per monitor (same behavior as "no monitor" column)
    const groupedMonitorTasks: any[] = [];
    const groupedMonitorTaskKeys = new Set<string>();
    const monitorTasks = filteredPlannerTasks.filter(task => task.monitor_id != null);
    const groupedByMonitor = monitorTasks.reduce((group, task) => {
      const key = buildMonitorGroupKey(task);
      if (!key) {
        return group;
      }
      (group[key] = group[key] || []).push(task);
      return group;
    }, {});

    Object.keys(groupedByMonitor).forEach(key => {
      const tasksForKey = groupedByMonitor[key] || [];
      if (tasksForKey.length <= 1) {
        return;
      }
      const baseTask = { ...tasksForKey[0], grouped_tasks: tasksForKey };
      groupedMonitorTasks.push(baseTask);
      tasksForKey.forEach(task => groupedMonitorTaskKeys.add(buildMonitorTaskKey(task)));
    });

    const finalPlannerTasks = filteredPlannerTasks.filter(task => {
      if (task.monitor_id == null) {
        return true;
      }
      return !groupedMonitorTaskKeys.has(buildMonitorTaskKey(task));
    });

    // Combine adjusted tasks with the rest
    this.plannerTasks = [
      ...finalPlannerTasks,
      ...Object.values(groupedByDate).flat(),
      ...groupedMonitorTasks
    ];
    this.bumpMonitorOptionsVersion();
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
        this.selectedTaskKey = null;
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
        if (!this.taskDetail.sport) {
          const courseSport = this.taskDetail?.course?.sport;
          this.taskDetail.sport = courseSport || this.sports.find(s => s.id === this.taskDetail?.sport_id) || null;
        }
        this.selectedTaskKey = this.getTaskSelectionKey(task);
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
    this.selectedTaskKey = null;
    this.showDetail = false;
    this.editedMonitor = null;
    this.showEditMonitor = false;
    this.resetMonitorAssignmentState();
    this.clearCurrentAssignmentContext();
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

      dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((userConfirmed: boolean) => {
      if (userConfirmed) {

          const data = this.buildMonitorAvailabilityPayload(this.taskDetail);

          firstValueFrom(this.crudService.post('/admin/monitors/available', data))
            .then(response => {
              this.monitorsForm = response.data;
              this.matchResults = {};
              this.monitorMatchCache.clear();
              this.monitorDegreeAuthCache.clear();
              this.showLoadingDialog('monitor_assignment.loading_matching');
              return this.updateMatchResults();
            })
            .then(() => {
              this.moveTask = true;
              this.taskMoved = task;
              this.moving = false;
              this.hideLoadingDialog();
            })
            .catch(error => {
              console.error('An error occurred:', error);
              this.moving = false;
              this.hideLoadingDialog();
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
      this.clearCurrentAssignmentContext();
    }
  }

  async moveMonitor(monitor: any, event: MouseEvent): Promise<void> {
    if (!this.moveTask || !this.taskDetail) {
      return;
    }

    event.stopPropagation();

    if (this.taskMoved && this.taskMoved.monitor_id === monitor.id) {
      this.moveTask = false;
      this.taskMoved = null;
      this.clearCurrentAssignmentContext();
      return;
    }

    const availabilityPayload = this.buildMonitorAvailabilityPayload(this.taskDetail);

    const performTransfer = async (): Promise<void> => {
      let response: any;
      this.showLoadingDialog('monitor_assignment.loading_checking');
      try {
        response = await firstValueFrom(this.crudService.post('/admin/monitors/available', availabilityPayload));
      } finally {
        this.hideLoadingDialog();
      }

      try {
        this.monitorsForm = response.data;

        if (!this.monitorMatchesCurrentSport(monitor)) {
          this.snackbar.open(this.translateService.instant('match_error_sport') + this.taskDetail.sport.name, 'OK', { duration: 3000 });
          return;
        }

        const selection = await firstValueFrom(this.openMonitorAssignmentDialog(monitor));
        if (!selection) {
          return;
        }

        this.applyMonitorAssignmentSelection(selection);

        const slots = this.buildSlotsForCurrentSelection();
        if (!slots.length) {
          this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
          return;
        }

        const canProceed = await this.confirmTimelinePastDates(slots);
        if (!canProceed) {
          return;
        }

        const resolvedSlots = await this.resolveTimelineSlotsAfterAvailability(monitor, slots);
        if (!resolvedSlots?.length) {
          return;
        }

        const success = await this.executeTimelineTransferForSlots(
          monitor,
          resolvedSlots,
          resolvedSlots.length === slots.length
        );
        if (success) {
          this.handleMonitorTransferSuccess();
        }
      } catch (error) {
        console.error('Error occurred while checking monitor availability:', error);
        this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      }
    };

    const needsConfirmation = await this.matchTeacher(monitor.id);
    if (needsConfirmation) {
      const dialogRef = this.dialog.open(ConfirmUnmatchMonitorComponent, {
        data: {
          booking: this.taskDetail,
          monitor,
          school_id: this.activeSchool
        }
      });

      const confirmed = await firstValueFrom(dialogRef.afterClosed());
      if (confirmed) {
        await performTransfer();
      }
    } else {
      await performTransfer();
    }
  }

  private monitorMatchesCurrentSport(monitor: any): boolean {
    if (!this.taskDetail) {
      return false;
    }
    if (!monitor || !monitor.id) {
      return true;
    }

    const targetSportId = this.taskDetail.sport_id;

    if (Array.isArray(monitor.sports) && monitor.sports.length) {
      return monitor.sports.some((sport: any) => Number(sport?.id) === targetSportId);
    }

    const sportDegreeSource = Array.isArray(monitor.monitorSportsDegrees)
      ? monitor.monitorSportsDegrees
      : Array.isArray(monitor.monitor_sports_degrees)
        ? monitor.monitor_sports_degrees
        : null;
    if (sportDegreeSource?.length) {
      return sportDegreeSource.some((entry: any) => Number(entry?.sport_id) === targetSportId);
    }

    if (this.isMonitorFromApiList(monitor)) {
      // Backend already filtered by sport/degree for availability results.
      return true;
    }

    const fallbackSportId = monitor?.sport_id ?? monitor?.sportId ?? monitor?.pivot?.sport_id;
    if (fallbackSportId != null) {
      return Number(fallbackSportId) === targetSportId;
    }

    return false;
  }

  private openMonitorAssignmentDialog(monitor: any): Observable<MonitorAssignmentDialogResult | undefined> {
    if (!this.taskDetail) return of(undefined);

    // Inicializa arrays/estado para el diálogo
    this.initializeMonitorAssignment(this.taskDetail); // <- tu método existente que carga monitorAssignmentDates, scope, etc.
    const defaultDate = this.taskDetail?.date || null;

    const summaryItems = this.buildMonitorAssignmentSummary();
    const targetSubgroupIds = this.collectSubgroupIdsForAssignment();
    const previewContext = this.buildMonitorTransferPreviewPayload();
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
        hasMultipleIntervals: this.taskDetail?.course?.course_type === 1 && this.hasMultipleIntervals(),
        allowAllOption: (this.monitorAssignmentDates?.length ?? 0) > 1,
        allowMultiScope: (this.monitorAssignmentDates?.length ?? 0) > 1,
        initialScope: this.monitorAssignmentScope as MonitorAssignmentScope,
        startDate: this.monitorAssignmentStartDate,
        endDate: this.monitorAssignmentEndDate,
        summaryItems,
        targetSubgroupIds,
        previewContext
      }
    });

    return dialogRef.afterClosed();
  }

  private applyMonitorAssignmentSelection(selection: MonitorAssignmentDialogResult): void {
    this.monitorAssignmentScope = selection.scope;
    this.monitorAssignmentStartDate = selection.startDate;
    this.monitorAssignmentEndDate = selection.endDate;
    this.monitorAssignmentSubgroupIds = selection.targetSubgroupIds ?? [];
    this.monitorAssignmentSelectedDates = (selection.selectedDates ?? []).filter(date => !!date);
    this.updateCurrentAssignmentContext();
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
    const baseCourseType = ctx?.course?.course_type ?? ctx?.course_type ?? null;
    let subgroupId = fallbackSubgroupId;

    if (!bookingUsers.length && baseCourseType === 1) {
      if (ctx.course_subgroup_id) {
        subgroupId = ctx.course_subgroup_id;
      } else if (ctx.subgroup_id) {
        subgroupId = ctx.subgroup_id;
      } else if (!ctx.all_clients?.length && ctx.booking_id) {
        // mantiene tu fallback actual
        subgroupId = ctx.booking_id;
        ctx.booking_id = null;
      }
    }
    if (baseCourseType !== 1) {
      subgroupId = null;
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
      course_subgroup_id: baseCourseType !== 1 ? null : (ctx.course_subgroup_id ?? ctx.subgroup_id ?? null),
      course_date_id: baseCourseType !== 1 && bookingUsers.length ? null : (ctx.course_date_id ?? null)
    };
  }

  private handleMonitorTransferSuccess(): void {
    this.moveTask = false;
    this.taskMoved = null;
    this.hideDetail();
    this.hideGrouped();
    this.loadBookings(this.currentDate, { silent: true });
    this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
    this.clearCurrentAssignmentContext();
  }

  private handleMonitorTransferError(error: any): void {
    this.moveTask = false;
    this.taskMoved = null;
    this.clearCurrentAssignmentContext();
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
    if (!date) {
      return null;
    }
    const birthDate = moment(date);
    if (!birthDate.isValid()) {
      return null;
    }
    const years = moment().diff(birthDate, 'years');
    return years > 0 ? years : null;
  }

  resolveBirthDate(entity: any): string | null {
    if (!entity) {
      return null;
    }
    return entity.birth_date
      ?? entity.birthDate
      ?? entity.birth_date_formatted
      ?? entity.birthDateFormatted
      ?? entity.user?.birth_date
      ?? entity.user?.birthDate
      ?? null;
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
    this.updateCurrentAssignmentContext();
    this.checkAvailableMonitors();
  }

  acceptBooking() {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      maxWidth: '100vw',
      panelClass: 'full-screen-dialog',
      data: { message: this.translateService.instant('accept_task'), title: this.translateService.instant('confirm_accept') }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((userConfirmed: boolean) => {
      if (userConfirmed) {
        this.crudService.update('/booking-users', { accepted: true }, this.taskDetail.id)
          .pipe(takeUntil(this.destroy$)).subscribe(() => {
            dialogRef.close(true)
            this.editedMonitor = null;
            this.showEditMonitor = false;
            this.hideDetail();
            this.loadBookings(this.currentDate, { silent: true });
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
    this.monitorAssignmentDates = this.buildMonitorAssignmentDates(task);

    // 2) Scope por defecto
    this.monitorAssignmentScope = 'single';

    // 3) Rango por defecto (primera y última del curso)
    this.monitorAssignmentStartDate = this.monitorAssignmentDates[0]?.value || null;
    this.monitorAssignmentEndDate   = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || this.monitorAssignmentStartDate;
    this.updateCurrentAssignmentContext();
    void this.refreshAssignmentDatesForPrivate(task);
  }

  private resetMonitorAssignmentState(): void {
    this.monitorAssignmentScope = 'single';
    this.monitorAssignmentStartDate = null;
    this.monitorAssignmentEndDate = null;
    this.monitorAssignmentDates = [];
    this.monitorAssignmentSelectedDates = [];
    this.updateCurrentAssignmentContext();
  }

  private updateCurrentAssignmentContext(): void {
    if (!this.taskDetail) {
      this.clearCurrentAssignmentContext();
      return;
    }
    this.currentAssignmentSlots = this.dedupeAssignmentSlots(this.buildSlotsForCurrentSelection());
    this.currentAssignmentTargetSubgroupIds = new Set(this.collectSubgroupIdsForAssignment());
    if (this.monitorAssignmentSelectedDates?.length) {
      this.currentAssignmentSlots = this.currentAssignmentSlots.filter(slot =>
        this.monitorAssignmentSelectedDates.some(date => this.getDateStrFromAny(date) === slot.date)
      );
    }
  }

  private dedupeAssignmentSlots(slots: MonitorAssignmentSlot[]): MonitorAssignmentSlot[] {
    const seen = new Set<string>();
    const deduped: MonitorAssignmentSlot[] = [];

    slots.forEach(slot => {
      const date = this.getDateStrFromAny(slot?.date) ?? slot?.date ?? '';
      const start = slot?.startTime ?? '';
      const end = slot?.endTime ?? '';
      const subgroupId = slot?.context?.subgroupId ?? slot?.context?.courseSubgroupId ?? 'none';
      const key = `${date}-${start}-${end}-${subgroupId}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      deduped.push({
        ...slot,
        date
      });
    });

    return deduped;
  }

  private clearCurrentAssignmentContext(): void {
    this.currentAssignmentSlots = [];
    this.currentAssignmentTargetSubgroupIds.clear();
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

    const dateSet = new Set<string>();
    const baseCourseType = task?.course?.course_type ?? task?.course_type ?? null;
    const isPrivateCourse = baseCourseType === 2;
    const taskCourseId = task?.course_id ?? task?.course?.id ?? null;
    const taskGroupId = task?.group_id ?? task?.course_group_id ?? null;
    const bookingUserIds = this.getBookingUserIdsFromTask(task);
    const hasExplicitBookingUsers = isPrivateCourse && bookingUserIds.length > 0;

    if (!isPrivateCourse) {
      const normalizedCourseDates = (task?.course?.course_dates ?? [])
        .map((cd: any) => this.getDateStrFromAny(cd))
        .filter((d: string | null) => !!d);
      normalizedCourseDates.forEach(d => dateSet.add(d!));
    }

    const fallbackDates = this.collectCourseDatesForTask(task);
    fallbackDates.forEach(date => dateSet.add(date));

    const assignmentBookingUsers = this.getAssignmentBookingUsers(task)
      .filter((entry: any) => {
        if (!isPrivateCourse) {
          return true;
        }
        if (hasExplicitBookingUsers) {
          const entryId = entry?.id ?? entry?.booking_user_id ?? entry?.bookingUserId ?? null;
          return entryId != null && bookingUserIds.includes(Number(entryId));
        }
        if (taskGroupId != null) {
          const entryGroupId = entry?.group_id ?? entry?.course_group_id ?? null;
          return Number(entryGroupId) === Number(taskGroupId);
        }
        return !taskCourseId || entry?.course_id === taskCourseId;
      });
    assignmentBookingUsers
      .map((entry: any) => this.getDateStrFromAny(entry))
      .filter((date: string | null) => !!date)
      .forEach((date: string) => dateSet.add(date));

    const relatedTasks = this.getRelatedTasks(task);

    relatedTasks
      .map((related: any) => this.getDateStrFromAny(related?.date))
      .filter((date: string | null) => !!date)
      .forEach((date: string) => dateSet.add(date));

    if (task?.date) {
      dateSet.add(task.date);
    }

    if (dateSet.size === 0) {
      this.collectCourseDatesForTask(task).forEach(date => dateSet.add(date));
      this.collectGroupedTaskDates(task).forEach(date => dateSet.add(date));
    }

    if (!isPrivateCourse && dateSet.size === 0 && task?.booking?.course_dates) {
      (task.booking.course_dates as any[])
        .filter(item => item?.date)
        .forEach(item => dateSet.add(item.date));
    }

    const bookingUsersFallback = task?.booking?.booking_users ?? task?.booking_users ?? [];
    if (dateSet.size === 0 && Array.isArray(bookingUsersFallback)) {
      bookingUsersFallback
        .filter((entry: any) => {
          if (!isPrivateCourse) {
            return true;
          }
          if (hasExplicitBookingUsers) {
            const entryId = entry?.id ?? entry?.booking_user_id ?? entry?.bookingUserId ?? null;
            return entryId != null && bookingUserIds.includes(Number(entryId));
          }
          if (taskGroupId != null) {
            const entryGroupId = entry?.group_id ?? entry?.course_group_id ?? null;
            return Number(entryGroupId) === Number(taskGroupId);
          }
          return !taskCourseId || entry?.course_id === taskCourseId;
        })
        .map((entry: any) => this.getDateStrFromAny(entry))
        .filter((date: string | null) => !!date)
        .forEach((date: string) => dateSet.add(date));
    }

    const uniqueDates = Array.from(dateSet).filter(Boolean);
    uniqueDates.sort((a, b) => moment(a).diff(moment(b)));

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
    const baseCourseType = task?.course?.course_type ?? task?.course_type ?? null;
    const isGroupCourse = baseCourseType === 1;

    return tasksSource.filter(candidate => {
      if (!candidate) return false;

      if (subgroupId && candidate.course_subgroup_id === subgroupId) return true;

      if (isGroupCourse && courseId && candidate.course_id === courseId) {
        return true;
      }

      if (isGroupCourse && bookingId && candidate.booking_id && candidate.booking_id === bookingId) return true;

      if (!isGroupCourse && bookingId && candidate.booking_id === bookingId) {
        if (!courseId) {
          return true;
        }
        return candidate.course_id === courseId;
      }

      return false;
    });
  }

  private getAssignmentBookingUsers(task: any): any[] {
    const bookingId = task?.booking_id ?? task?.booking?.id ?? null;
    if (!bookingId) {
      return [];
    }
    const cached = this.assignmentBookingUsersCache.get(bookingId);
    if (cached) {
      return cached;
    }
    const embedded = task?.__assignmentBookingUsers ?? task?.booking_users_all ?? task?.booking?.booking_users ?? task?.booking_users ?? null;
    if (Array.isArray(embedded) && embedded.length) {
      return embedded;
    }
    return [];
  }

  private async loadAssignmentBookingUsers(task: any): Promise<any[]> {
    const baseCourseType = task?.course?.course_type ?? task?.course_type ?? null;
    if (baseCourseType !== 2) {
      return [];
    }
    const bookingId = task?.booking_id ?? task?.booking?.id ?? null;
    if (!bookingId) {
      return [];
    }
    if (this.assignmentBookingUsersCache.has(bookingId)) {
      return this.assignmentBookingUsersCache.get(bookingId) as any[];
    }
    try {
      const response: any = await firstValueFrom(
        this.crudService.list('/booking-users', 1, 10000, 'asc', 'id', `&booking_id=${bookingId}&status=1`)
      );
      const bookingUsers = Array.isArray(response?.data) ? response.data : [];
      this.assignmentBookingUsersCache.set(bookingId, bookingUsers);
      task.__assignmentBookingUsers = bookingUsers;
      return bookingUsers;
    } catch {
      return [];
    }
  }

  private async refreshAssignmentDatesForPrivate(task: any): Promise<void> {
    const bookingUsers = await this.loadAssignmentBookingUsers(task);
    if (!bookingUsers.length) {
      return;
    }
    const nextDates = this.buildMonitorAssignmentDates(task);
    const currentKey = this.monitorAssignmentDates.map(item => item.value).join('|');
    const nextKey = nextDates.map(item => item.value).join('|');
    if (currentKey === nextKey) {
      return;
    }
    this.monitorAssignmentDates = nextDates;
    this.monitorAssignmentStartDate = this.monitorAssignmentDates[0]?.value || null;
    this.monitorAssignmentEndDate = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || this.monitorAssignmentStartDate;
    this.updateCurrentAssignmentContext();
  }

  private getTaskSelectionKey(task: any): string | null {
    if (!task) {
      return null;
    }
    if (task.id != null) {
      return `id-${task.id}`;
    }
    if (task.booking_id != null) {
      const date = task.date ?? '';
      const hour = task.hour_start ?? '';
      const monitor = task.monitor_id ?? 'none';
      const subgroup = task.course_subgroup_id ?? task.subgroup_id ?? 'none';
      const group = task.group_id ?? 'none';
      return `bk-${task.booking_id}-${date}-${hour}-${monitor}-${subgroup}-${group}`;
    }
    return null;
  }

  isGroupedTaskHighlighted(task: any): boolean {
    return !!(this.showGrouped && task?.booking_id && this.idGroupedTasks == task.booking_id && this.hourGrouped == task.hour_start && this.dateGrouped == task.date);
  }

  isTaskHighlighted(task: any): boolean {
    if (!task) {
      return false;
    }
    return !!this.selectedTaskKey && this.selectedTaskKey === this.getTaskSelectionKey(task);
  }

  onMonitorAssignmentScopeChange(scope: MonitorAssignmentScope): void {
    this.monitorAssignmentScope = scope;
    const defaultDate = this.taskDetail?.date || null;

    if (scope === 'single') {
      this.monitorAssignmentStartDate = defaultDate;
      this.monitorAssignmentEndDate = defaultDate;
      this.updateCurrentAssignmentContext();
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
      this.updateCurrentAssignmentContext();
      return;
    }

    const firstDate = this.monitorAssignmentDates[0]?.value || defaultDate;
    const lastDate = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || defaultDate;

    // NEW: Handle all (todo el curso)
    if (scope === 'all') {
      this.monitorAssignmentStartDate = firstDate;
      this.monitorAssignmentEndDate = lastDate;
      this.updateCurrentAssignmentContext();
      return;
    }

    if (scope === 'from') {
      this.monitorAssignmentStartDate = defaultDate ?? firstDate;
      this.monitorAssignmentEndDate = lastDate;
      this.updateCurrentAssignmentContext();
      return;
    }

    // Range scope
    this.monitorAssignmentStartDate = defaultDate ?? firstDate;
    this.monitorAssignmentEndDate = lastDate;
    this.ensureAssignmentRangeOrder();
    this.updateCurrentAssignmentContext();
  }

  onMonitorAssignmentStartChange(value: string): void {
    this.monitorAssignmentStartDate = value;
    if (this.monitorAssignmentScope === 'from') {
      this.monitorAssignmentEndDate = this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value || value;
    }
    if (this.monitorAssignmentScope === 'range') {
      this.ensureAssignmentRangeOrder();
    }
    this.updateCurrentAssignmentContext();
  }

  onMonitorAssignmentEndChange(value: string): void {
    this.monitorAssignmentEndDate = value;
    if (this.monitorAssignmentScope === 'range') {
      this.ensureAssignmentRangeOrder();
    }
    this.updateCurrentAssignmentContext();
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

    const baseCourseType = task?.course?.course_type ?? task?.course_type ?? null;
    const isPrivateCourse = baseCourseType === 2;
    const taskCourseId = task?.course_id ?? task?.course?.id ?? null;
    const taskGroupId = task?.group_id ?? task?.course_group_id ?? null;
    const bookingUserIds = this.getBookingUserIdsFromTask(task);
    const hasExplicitBookingUsers = isPrivateCourse && bookingUserIds.length > 0;

    // 1) si la tarea trae booking.course_dates
    const datesFromBooking = (task.booking?.course_dates ?? [])
      .map((d: any) => this.getDateStrFromAny(d))
      .filter((d: string | null) => !!d);

    if (datesFromBooking.length) {
      return Array.from(new Set(datesFromBooking)).sort();
    }

    if (isPrivateCourse) {
      const bookingUsers = this.getAssignmentBookingUsers(task)
        .filter((entry: any) => {
          if (hasExplicitBookingUsers) {
            const entryId = entry?.id ?? entry?.booking_user_id ?? entry?.bookingUserId ?? null;
            return entryId != null && bookingUserIds.includes(Number(entryId));
          }
          if (taskGroupId != null) {
            const entryGroupId = entry?.group_id ?? entry?.course_group_id ?? null;
            return Number(entryGroupId) === Number(taskGroupId);
          }
          return !taskCourseId || entry?.course_id === taskCourseId;
        });
      const bookingUserDates = bookingUsers
        .map((entry: any) => this.getDateStrFromAny(entry))
        .filter((d: string | null) => !!d);

      if (bookingUserDates.length) {
        return Array.from(new Set(bookingUserDates)).sort();
      }

      if (hasExplicitBookingUsers) {
        return [];
      }

      const datesFromPlanner = (Array.isArray(this.plannerTasks) ? this.plannerTasks : [])
        .filter(t => {
          if (t?.booking_id !== task.booking_id || !t?.date) {
            return false;
          }
          if (taskGroupId != null) {
            const entryGroupId = t?.group_id ?? t?.course_group_id ?? null;
            return Number(entryGroupId) === Number(taskGroupId);
          }
          return !taskCourseId || t?.course_id === taskCourseId;
        })
        .map(t => this.getDateStrFromAny(t?.date))
        .filter((d: string | null) => !!d);

      if (datesFromPlanner.length) {
        return Array.from(new Set(datesFromPlanner)).sort();
      }
    }

    // 2) si existen otras tasks del mismo curso en el planner
    const courseId = task.course_id;
    if (!courseId) return [];

    const datesFromPlanner = (Array.isArray(this.plannerTasks) ? this.plannerTasks : [])
      .filter(t => t?.course_id === courseId && t?.date)
      .map(t => this.getDateStrFromAny(t?.date))
      .filter((d: string | null) => !!d);

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

  private resolveSubgroupDatesId(task: any): string | number | null {
    if (!task) {
      return null;
    }

    const direct =
      task.subgroup_dates_id ??
      task.subgroupDatesId ??
      task.course_subgroup?.subgroup_dates_id ??
      task.course_subgroup?.subgroupDatesId ??
      null;
    if (direct != null) {
      return direct;
    }

    const subgroupId = task.course_subgroup_id ?? task.course_subgroup?.id ?? null;
    if (subgroupId == null) {
      return null;
    }

    const courseDates = task?.course?.course_dates ?? [];
    const normalizeId = (value: any) => (value == null ? null : Number(value));
    const targetId = normalizeId(subgroupId);

    const findInContainer = (container: any): string | number | null => {
      const subgroups = container?.course_subgroups ?? container?.courseSubgroups ?? container?.subgroups ?? [];
      for (const sub of subgroups) {
        if (normalizeId(sub?.id) === targetId) {
          const subgroupDatesId = sub?.subgroup_dates_id ?? sub?.subgroupDatesId ?? null;
          if (subgroupDatesId != null) {
            return subgroupDatesId;
          }
        }
      }
      return null;
    };

    for (const cd of courseDates) {
      const directMatch = findInContainer(cd);
      if (directMatch != null) {
        return directMatch;
      }
      const groups = cd?.course_groups ?? cd?.courseGroups ?? [];
      for (const group of groups) {
        const groupMatch = findInContainer(group);
        if (groupMatch != null) {
          return groupMatch;
        }
      }
    }

    return null;
  }

  private courseDateHasSubgroupDatesId(courseDate: any, subgroupDatesId: string): boolean {
    if (!courseDate || !subgroupDatesId) {
      return false;
    }
    const normalizeValue = (value: any) => (value == null ? null : String(value));

    const matchesContainer = (container: any): boolean => {
      const subgroups = container?.course_subgroups ?? container?.courseSubgroups ?? container?.subgroups ?? [];
      for (const sub of subgroups) {
        const candidate = normalizeValue(sub?.subgroup_dates_id ?? sub?.subgroupDatesId ?? null);
        if (candidate != null && candidate === subgroupDatesId) {
          return true;
        }
      }
      return false;
    };

    if (matchesContainer(courseDate)) {
      return true;
    }

    const groups = courseDate?.course_groups ?? courseDate?.courseGroups ?? [];
    for (const group of groups) {
      if (matchesContainer(group)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all dates that belong to the same interval as the given task
   */
  private getIntervalDatesForTask(task: any): string[] {
    if (!task) {
      return [];
    }

    const subgroupDatesId = this.resolveSubgroupDatesId(task);
    const courseDates = task?.course?.course_dates ?? [];
    if (subgroupDatesId != null && Array.isArray(courseDates) && courseDates.length) {
      const target = String(subgroupDatesId);
      const dateSet = new Set<string>();
      courseDates.forEach((cd: any) => {
        if (!this.courseDateHasSubgroupDatesId(cd, target)) {
          return;
        }
        const dateValue = this.getDateStrFromAny(cd?.date ?? cd);
        if (dateValue) {
          dateSet.add(dateValue);
        }
      });
      const dates = Array.from(dateSet).sort();
      if (dates.length) {
        return dates;
      }
    }

    if (!task.course_subgroup_id) {
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
      if (this.monitorAssignmentStartDate && this.monitorAssignmentEndDate) {
        startDate = this.monitorAssignmentStartDate;
        endDate = this.monitorAssignmentEndDate;
      } else {
        const intervalDates = this.getIntervalDatesForTask(this.taskDetail);
        if (intervalDates.length > 0) {
          startDate = intervalDates[0];
          endDate = intervalDates[intervalDates.length - 1];
        }
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
        const resolvedId = this.resolveBookingUserId(client);
        if (resolvedId != null) {
          bookingUserIds.add(resolvedId);
        }
      });
    });

    if (bookingUserIds.size === 0 && Array.isArray(baseTask.all_clients)) {
      baseTask.all_clients.forEach((client: any) => {
        const resolvedId = this.resolveBookingUserId(client);
        if (resolvedId != null) {
          bookingUserIds.add(resolvedId);
        }
      });
    }

    return Array.from(bookingUserIds);
  }

  private collectSubgroupIdsForAssignment(forceIncludeRelated = false): number[] {
    const baseTask = this.taskDetail;
    if (!baseTask) {
      return [];
    }

    const { start, end } = this.resolveAssignmentDateRange();
    const selectedDateSet = new Set(
      (this.monitorAssignmentSelectedDates ?? [])
        .map(value => this.getDateStrFromAny(value))
        .filter((value): value is string => !!value)
    );
    const subgroupIds = new Set<number>();
    const scope = this.monitorAssignmentScope;
    const baseSubgroupDatesId = this.resolveSubgroupDatesId(baseTask);
    const baseSubgroupId =
      baseTask.course_subgroup_id ??
      baseTask.subgroup_id ??
      null;

    const addCandidateSubgroup = (candidate: any) => {
      const subgroupId = candidate?.course_subgroup_id ?? candidate?.subgroup_id ?? null;
      if (subgroupId != null) {
        subgroupIds.add(subgroupId);
      }
    };

    const includeRelatedTasks = forceIncludeRelated || scope !== 'single';
    const enforceDateRange = !forceIncludeRelated;
    if (includeRelatedTasks) {
      const relatedTasks = this.getRelatedTasks(baseTask);
      relatedTasks.forEach(candidate => {
        const candidateDate = moment(candidate.date, 'YYYY-MM-DD');
        if (!candidateDate.isValid()) {
          return;
        }
        if (enforceDateRange) {
          if (candidateDate.isBefore(start) || candidateDate.isAfter(end)) {
            return;
          }
        }
        if (baseSubgroupDatesId != null) {
          const candidateDatesId = this.resolveSubgroupDatesId(candidate);
          if (candidateDatesId !== baseSubgroupDatesId) {
            return;
          }
        } else if (baseSubgroupId != null) {
          const candidateSubgroupId = candidate?.course_subgroup_id ?? candidate?.subgroup_id ?? null;
          if (candidateSubgroupId !== baseSubgroupId) {
            return;
          }
        }
        addCandidateSubgroup(candidate);
      });
    }

    addCandidateSubgroup(baseTask);

    return Array.from(subgroupIds);
  }

  private resolveTaskDegreeId(task: any): number | null {
    if (!task) {
      return null;
    }

    const candidates = [
      task.degree_id,
      task.degreeId,
      task.degree?.id,
      task.degree?.degree_id,
      task.course_subgroup?.degree_id,
      task.course_subgroup?.degree?.id,
      task.course_subgroup?.level_id
    ];

    for (const value of candidates) {
      if (typeof value === 'number') {
        return value;
      }
    }

    return null;
  }

  private isSameAssignmentDegree(baseDegreeId: number | null, candidate: any): boolean {
    if (baseDegreeId == null) {
      return true;
    }
    const candidateDegreeId = this.resolveTaskDegreeId(candidate);
    return candidateDegreeId == null ? false : candidateDegreeId === baseDegreeId;
  }

  getSelectedAssignmentSessionCount(): number {
    const startValue = this.monitorAssignmentStartDate;
    const endValue = this.monitorAssignmentEndDate || startValue;
    if (!startValue) {
      return 0;
    }
    const start = moment(this.getDateStrFromAny(startValue) ?? startValue, 'YYYY-MM-DD');
    const end = moment(this.getDateStrFromAny(endValue ?? startValue) ?? endValue ?? startValue, 'YYYY-MM-DD');
    if (!start.isValid() || !end.isValid()) {
      return 0;
    }
    const diff = end.diff(start, 'days');
    return Math.max(diff + 1, 1);
  }

  private buildFullMonitorTransferPayload(
    monitorId: number | null,
    options?: { courseDateId?: number | null; subgroupIds?: number[] }
  ) {
    const bookingUserIds = this.collectBookingUserIdsForAssignment();

    // Fechas seg?n el scope elegido en el preview (las mismas que usa el modal)
    const { start, end } = this.resolveAssignmentDateRange();

    const startDate = start.format('YYYY-MM-DD');

    const endDate   = end.format('YYYY-MM-DD');

    // Ids base de la tarea actual
    const ctx = this.taskDetail || {};
    const baseCourseType = ctx?.course?.course_type ?? ctx?.course_type ?? null;
    const courseId        = ctx.course_id ?? ctx.course?.id ?? null;
    const bookingId       = ctx.booking_id ?? null;
    const subgroupId      = ctx.course_subgroup_id ?? ctx.subgroup_id ?? null;
    const courseDateId    = ctx.course_date_id ?? null;
    const degreeId        = ctx.degree?.id ?? null;

    // fallback (como ten?as antes) si no hay BUs ni subgroup expl?cito
    let fallbackSubgroupId = subgroupId;

    if (!bookingUserIds.length && !fallbackSubgroupId) {
      if (!ctx.all_clients?.length && ctx.booking_id) {
        fallbackSubgroupId = ctx.booking_id; // (ojo: tu backend lo llama subgroup_id; aqu? mantenemos por compat)
      }

    }

    const scope = this.monitorAssignmentScope;
    const subgroupIdsSet = new Set<number>();
    if (baseCourseType === 1) {
      if (this.monitorAssignmentSubgroupIds?.length) {
        this.monitorAssignmentSubgroupIds.forEach(id => subgroupIdsSet.add(id));
      } else {
        this.collectSubgroupIdsForAssignment().forEach(id => subgroupIdsSet.add(id));
      }
      options?.subgroupIds?.forEach(id => {
        if (id != null) subgroupIdsSet.add(id);
      });

      if (ctx.course_subgroup_id != null) {
        subgroupIdsSet.add(ctx.course_subgroup_id);
      }
      if (ctx.subgroup_id != null) {
        subgroupIdsSet.add(ctx.subgroup_id);
      }

      if (fallbackSubgroupId != null) {
        subgroupIdsSet.add(fallbackSubgroupId);
      }

      if ((scope === 'all' || scope === 'from' || scope === 'range') && !this.monitorAssignmentSubgroupIds?.length) {
        this.collectSubgroupIdsForAssignment(true).forEach(id => subgroupIdsSet.add(id));
      }

      if (!bookingUserIds.length && subgroupIdsSet.size === 0 && !ctx.all_clients?.length && ctx.booking_id) {
        subgroupIdsSet.add(ctx.booking_id);
        ctx.booking_id = null;
      }
    }

    const subgroupIds = Array.from(subgroupIdsSet);

    const subgroupIdToUse = baseCourseType === 1
      ? (this.monitorAssignmentSubgroupIds?.[0] ?? subgroupId ?? subgroupIds[0] ?? fallbackSubgroupId ?? null)
      : null;

    let finalSubgroupIds = subgroupIds;
    if (baseCourseType === 1) {
      if (scope === 'single') {
        finalSubgroupIds = subgroupIdToUse != null ? [subgroupIdToUse] : [];
      } else if (this.monitorAssignmentSubgroupIds?.length) {
        finalSubgroupIds = Array.from(new Set(this.monitorAssignmentSubgroupIds));
      }
    }

    const payload: MonitorTransferPayload = {
      monitor_id: monitorId,
      booking_users: baseCourseType === 1 ? [] : bookingUserIds,

      scope,              // 'single'|'interval'|'all'|'from'|'range'
      start_date: startDate,
      end_date: endDate,
      course_id: courseId,
      booking_id: bookingId,
      subgroup_id: subgroupIdToUse,                 // en el backend lo recoges como subgroup_id
      course_subgroup_id: subgroupIdToUse ?? null,
      course_date_id: baseCourseType !== 1 && bookingUserIds.length ? null : courseDateId,
      subgroup_ids: finalSubgroupIds
    };

    if (scope !== 'single') {
      payload.course_date_id = null;
    }

    if (options?.courseDateId != null && scope === 'single') {
      payload.course_date_id = options.courseDateId;
    }

    if (options?.subgroupIds?.length && scope !== 'single') {
      payload.subgroup_ids = Array.from(new Set([...(payload.subgroup_ids ?? []), ...options.subgroupIds.filter(id => id != null) as number[]]));
    }

    return payload;
  }

  private buildMonitorTransferPreviewPayload(): MonitorTransferPreviewPayload | null {
    const ctx = this.taskDetail;
    if (!ctx) {
      return null;
    }

    const { start, end } = this.resolveAssignmentDateRange();
    const startDate = start?.format('YYYY-MM-DD') ?? null;
    const endDate = end?.format('YYYY-MM-DD') ?? startDate;
    const scope = this.monitorAssignmentScope;
    const courseId = ctx.course_id ?? ctx.course?.id ?? null;
    const subgroupId = ctx.course_subgroup_id ?? ctx.subgroup_id ?? ctx.booking_id ?? null;

    const payload: MonitorTransferPreviewPayload = {
      scope,
      start_date: startDate,
      end_date: endDate,
      course_id: courseId
    };

    if (subgroupId != null) {
      payload.subgroup_id = subgroupId;
    }
    return payload;
  }

  private buildSlotsForCurrentSelection(): MonitorAssignmentSlot[] {
    const baseTask = this.taskDetail;
    if (!baseTask) {
      return [];
    }

    const { start, end } = this.resolveAssignmentDateRange();
    const selectedDateSet = new Set(
      (this.monitorAssignmentSelectedDates ?? [])
        .map(value => this.getDateStrFromAny(value))
        .filter((value): value is string => !!value)
    );
    const selectedSubgroupIds = (this.monitorAssignmentSubgroupIds?.length
      ? this.monitorAssignmentSubgroupIds
      : []).filter(id => id != null);
    const targetSubgroupId = selectedSubgroupIds.length
      ? selectedSubgroupIds[0]
      : (baseTask.course_subgroup_id ?? baseTask.subgroup_id ?? null);
    const relatedTasks = this.getRelatedTasks(baseTask).filter(task => {
      if (!selectedSubgroupIds.length && targetSubgroupId == null) {
        return true;
      }
      const taskSubgroupId = task?.course_subgroup_id ?? task?.subgroup_id ?? null;
      if (selectedSubgroupIds.length) {
        return selectedSubgroupIds.some(id => Number(taskSubgroupId) === Number(id));
      }
      return Number(taskSubgroupId) === Number(targetSubgroupId);
    });
    const slots: MonitorAssignmentSlot[] = [];
    const seen = new Set<string>();

    const isGroupCourse = (baseTask.course?.course_type ?? baseTask.course_type) === 1;
    const courseDateEntries: Array<{ key: string; dateValue: string; cd: any }> = [];
    const courseDateKeys = new Set<string>();
    const registerCourseDate = (cd: any) => {
      const dateValue = this.getDateStrFromAny(cd?.date ?? cd);
      if (!dateValue) {
        return;
      }
      const key = `${dateValue}-${cd?.hour_start ?? ''}-${cd?.hour_end ?? ''}-${cd?.id ?? ''}`;
      if (courseDateKeys.has(key)) {
        return;
      }
      courseDateKeys.add(key);
      courseDateEntries.push({ key, dateValue, cd });
    };
    (baseTask.course?.course_dates ?? []).forEach(registerCourseDate);
    (baseTask.booking?.course_dates ?? []).forEach(registerCourseDate);

    const addSlot = (
      dateValue: string | null,
      startTime?: string,
      endTime?: string,
      courseDateId?: number | null,
      subgroupId?: number | null,
      currentMonitorOverride?: { id: number | null; name: string | null }
    ) => {
      if (!dateValue) {
        return;
      }
      const normalizedDate = this.getDateStrFromAny(dateValue) ?? dateValue;
      const taskDate = moment(normalizedDate, 'YYYY-MM-DD');
      if (!taskDate.isValid() || taskDate.isBefore(start) || taskDate.isAfter(end)) {
        return;
      }
      if (selectedDateSet.size && !selectedDateSet.has(normalizedDate)) {
        return;
      }
      const startLabel = startTime ?? baseTask.hour_start;
      const endLabel = endTime ?? baseTask.hour_end;
      const subgroupKey = subgroupId != null ? subgroupId : 'none';
      const key = `${normalizedDate}-${startLabel}-${endLabel}-${subgroupKey}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const label = this.assignmentHelper.formatSlotLabel(normalizedDate, startLabel, endLabel);
        const normalizedSubgroupId = subgroupId ?? baseTask.course_subgroup_id ?? null;
        const currentMonitorTask = this.findTaskForSubgroup(normalizedSubgroupId, normalizedDate);
      const courseSubgroupDetails = this.findCourseSubgroupDetails(normalizedSubgroupId, normalizedDate);
      const derivedMonitorInfo = currentMonitorTask
        ? {
            id: currentMonitorTask.monitor_id ?? currentMonitorTask.monitor?.id ?? null,
            name: this.getMonitorNameFromTask(currentMonitorTask)
          }
        : (courseSubgroupDetails
            ? { id: courseSubgroupDetails.monitorId, name: courseSubgroupDetails.monitorName }
            : this.findCurrentMonitorForSubgroup(normalizedSubgroupId, normalizedDate));
      const currentMonitorInfo = currentMonitorOverride?.id != null || currentMonitorOverride?.name
        ? currentMonitorOverride
        : derivedMonitorInfo;
        const baseLevelLabel =
        this.getLevelLabelFromTask(currentMonitorTask) ??
        courseSubgroupDetails?.levelLabel ??
        this.resolveCurrentLevelLabel();
        const subgroupOrderLabel = this.resolveSubgroupOrderLabel(normalizedSubgroupId, normalizedDate);
        const levelLabel = subgroupOrderLabel ? `${baseLevelLabel} ${subgroupOrderLabel}` : baseLevelLabel;
        slots.push({
          date: normalizedDate,
          startTime: startLabel,
          endTime: endLabel,
        degreeId: baseTask.degree_id,
        sportId: baseTask.sport_id,
        label,
          context: {
            courseDateId: courseDateId ?? null,
            subgroupId: normalizedSubgroupId,
            courseId: baseTask.course_id ?? baseTask.course?.id ?? null,
            currentMonitorId: currentMonitorInfo?.id ?? null,
          currentMonitorName: currentMonitorInfo?.name ?? null,
          levelLabel
        }
      });
    };

    addSlot(baseTask.date, baseTask.hour_start, baseTask.hour_end, baseTask.course_date_id, baseTask.course_subgroup_id);
      relatedTasks.forEach(task => addSlot(task.date, task.hour_start, task.hour_end, task.course_date_id, task.course_subgroup_id));

    const assignmentBookingUsers = this.getAssignmentBookingUsers(baseTask);
    assignmentBookingUsers.forEach((bookingUser: any) => {
      const dateValue = this.getDateStrFromAny(bookingUser);
      if (!dateValue) {
        return;
      }
      const monitorId = bookingUser?.monitor_id ?? bookingUser?.monitor?.id ?? null;
      const monitorName = this.getMonitorNameFromTask(bookingUser);
      addSlot(
        dateValue,
        bookingUser?.hour_start ?? baseTask.hour_start,
        bookingUser?.hour_end ?? baseTask.hour_end,
        bookingUser?.course_date_id ?? null,
        bookingUser?.course_subgroup_id ?? baseTask.course_subgroup_id ?? baseTask.subgroup_id ?? null,
        { id: monitorId, name: monitorName }
      );
    });

      if (isGroupCourse) {
        courseDateEntries.forEach(({ dateValue, cd }) => {
          const subgroups = (cd?.course_groups ?? [])
            .flatMap((group: any) => group?.course_subgroups ?? [])
            .map((sub: any) => sub?.id)
            .filter((id: any) => id != null);
          const filteredSubgroups = selectedSubgroupIds.length
            ? subgroups.filter((id: any) => selectedSubgroupIds.some(targetId => Number(id) === Number(targetId)))
            : (targetSubgroupId == null
              ? subgroups
              : subgroups.filter((id: any) => Number(id) === Number(targetSubgroupId)));

          if (filteredSubgroups.length) {
            filteredSubgroups.forEach(subId => {
              addSlot(
                dateValue,
                cd?.hour_start ?? baseTask.hour_start,
                cd?.hour_end ?? baseTask.hour_end,
                cd?.id ?? null,
                subId
              );
            });
          } else if (!selectedSubgroupIds.length && targetSubgroupId == null) {
            addSlot(
              dateValue,
              cd?.hour_start ?? baseTask.hour_start,
              cd?.hour_end ?? baseTask.hour_end,
              cd?.id ?? null,
              targetSubgroupId ?? baseTask.course_subgroup_id
            );
          }
        });

        if (!selectedSubgroupIds.length && targetSubgroupId == null) {
          const fallbackDates = this.collectCourseDatesForTask(baseTask);
          fallbackDates.forEach(dateValue => addSlot(dateValue, baseTask.hour_start, baseTask.hour_end, null, baseTask.course_subgroup_id));
        }
      }

      if (selectedDateSet.size) {
        const subgroupIdsForDates = selectedSubgroupIds.length
          ? selectedSubgroupIds
          : [targetSubgroupId ?? baseTask.course_subgroup_id].filter((id): id is number => id != null);
        Array.from(selectedDateSet).forEach(dateValue => {
          subgroupIdsForDates.forEach(subgroupId => {
            addSlot(dateValue, baseTask.hour_start, baseTask.hour_end, null, subgroupId);
          });
        });
      }

    return slots.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  private resolveMonitorFullName(monitor: any | null): string {
    if (!monitor) {
      return '';
    }
    const first = monitor.first_name ?? monitor.firstName ?? '';
    const last = monitor.last_name ?? monitor.lastName ?? '';
    const combined = `${first} ${last}`.trim();
    if (combined) {
      return combined;
    }
    return monitor.name ?? '';
  }

  private formatPersonName(first: string | null | undefined, last: string | null | undefined): string {
    return `${first ?? ''} ${last ?? ''}`.trim();
  }

  private getMonitorNameFromTask(task: any): string | null {
    if (!task) {
      return null;
    }
    if (task.monitor) {
      const name = this.resolveMonitorFullName(task.monitor);
      if (name) {
        return name;
      }
    }
    const first = task.monitor_first_name ?? task.monitor_firstName ?? task.monitor_first ?? task.monitorName?.split(' ')?.[0];
    const last = task.monitor_last_name ?? task.monitor_lastName ?? task.monitor_last ?? null;
    const fromFields = this.formatPersonName(first, last);
    if (fromFields) {
      return fromFields;
    }
    if (typeof task.monitor_name === 'string' && task.monitor_name.length) {
      return task.monitor_name;
    }
    return null;
  }

  private resolveCurrentLevelLabel(): string | null {
    const degree = this.taskDetail?.degree;
    if (degree?.name) {
      return degree.name;
    }
    if (degree?.annotation) {
      return degree.annotation;
    }
    const subgroupDegree = this.taskDetail?.course_subgroup?.degree ?? this.taskDetail?.course_subgroup?.level;
    if (subgroupDegree?.name) {
      return subgroupDegree.name;
    }
    if (typeof this.taskDetail?.degree_id === 'number') {
      return `${this.translateWithFallback('monitor_assignment.partial.level', 'Nivel')} ${this.taskDetail.degree_id}`;
    }
    return null;
  }

  private getLevelLabelFromTask(task: any): string | null {
    if (!task) {
      return null;
    }
    const subgroup = task.course_subgroup ?? task.courseSubgroup ?? null;
    if (subgroup?.name) {
      return subgroup.name;
    }
    if (subgroup?.label) {
      return subgroup.label;
    }
    const degree = subgroup?.degree ?? subgroup?.level ?? task.degree ?? null;
    if (typeof degree === 'string') {
      return degree;
    }
    if (degree?.name) {
      return degree.name;
    }
    if (degree?.annotation) {
      return degree.annotation;
    }
    if (task.level_label) {
      return task.level_label;
    }
    return null;
  }

  private buildMonitorAssignmentSummary(): MonitorAssignmentDialogSummaryItem[] {
    const originalScope = this.monitorAssignmentScope;
    const originalStart = this.monitorAssignmentStartDate;
    const originalEnd = this.monitorAssignmentEndDate;

    const firstDate = this.monitorAssignmentDates[0]?.value ?? originalStart;
    const lastDate =
      this.monitorAssignmentDates[this.monitorAssignmentDates.length - 1]?.value ?? originalEnd ?? firstDate;

    this.monitorAssignmentScope = 'range';
    this.monitorAssignmentStartDate = firstDate;
    this.monitorAssignmentEndDate = lastDate;

    const slots = this.buildSlotsForCurrentSelection();

    this.monitorAssignmentScope = originalScope;
    this.monitorAssignmentStartDate = originalStart;
    this.monitorAssignmentEndDate = originalEnd;

    return slots.map(slot => ({
      value: slot.date,
      dateLabel: slot.label ?? this.assignmentHelper.formatSlotLabel(slot.date, slot.startTime, slot.endTime),
      levelLabel: slot.context?.levelLabel ?? this.resolveCurrentLevelLabel(),
      currentMonitor: slot.context?.currentMonitorName ?? null,
      subgroupId: slot.context?.subgroupId ?? null
    }));
  }


  private findCurrentMonitorForSubgroup(subgroupId: number | null, dateValue?: string | null): { id: number | null; name: string | null } | null {
    if (!subgroupId) {
      return null;
    }
    const dateStr = dateValue ?? null;
    const tasksSource = Array.isArray(this.plannerTasks) ? this.plannerTasks : [];
    const holder = tasksSource.find(task => {
      if (task?.course_subgroup_id !== subgroupId) {
        return false;
      }
      if (!task?.monitor_id) {
        return false;
      }
      if (!dateStr) {
        return true;
      }
      return this.getDateStrFromAny(task?.date) === dateStr;
    });
    if (!holder) {
      return null;
    }
    return {
      id: holder.monitor_id ?? holder.monitor?.id ?? null,
      name: this.getMonitorNameFromTask(holder)
    };
  }

  private findTaskForSubgroup(subgroupId: number | null, dateValue?: string | null): any | null {
    if (!subgroupId) {
      return null;
    }
    const dateStr = dateValue ?? null;
    const tasksSource = Array.isArray(this.plannerTasks) ? this.plannerTasks : [];
    return tasksSource.find(task => {
      if (task?.course_subgroup_id !== subgroupId) {
        return false;
      }
      if (!dateStr) {
        return true;
      }
      return this.getDateStrFromAny(task?.date) === dateStr;
    }) ?? null;
  }

  private getSlotDetailsForDate(dateValue: string | null): { levelLabel: string | null; currentMonitor: string | null } {
    const normalizedDate = this.normalizeDateValue(dateValue);
    const subgroupId = this.taskDetail?.course_subgroup_id ?? null;
    let levelLabel = this.resolveCurrentLevelLabel();
    let currentMonitor: string | null = null;

    const task = this.findTaskForSubgroup(subgroupId, normalizedDate);
    if (task) {
      currentMonitor = this.getMonitorNameFromTask(task);
      levelLabel = this.getLevelLabelFromTask(task) ?? levelLabel;
    } else {
      const details = this.findCourseSubgroupDetails(subgroupId, normalizedDate);
      if (details) {
        currentMonitor = details.monitorName ?? currentMonitor;
        levelLabel = details.levelLabel ?? levelLabel;
      }
    }

    return { levelLabel, currentMonitor };
  }

  private normalizeDateValue(value: string | null): string | null {
    if (!value) {
      return null;
    }
    return this.getDateStrFromAny(value);
  }

  private findCourseSubgroupDetails(subgroupId: number | null, dateValue?: string | null): { monitorId: number | null; monitorName: string | null; levelLabel: string | null } | null {
    if (!subgroupId) {
      return null;
    }
    const course = this.taskDetail?.course;
    if (!course) {
      return null;
    }

    const normalizedDate = dateValue ? this.getDateStrFromAny(dateValue) : null;
    const normalizeId = (val: any) => (val == null ? null : Number(val));
    const targetId = normalizeId(subgroupId);
    if (targetId == null) {
      return null;
    }

    const buildDetails = (sub: any): { monitorId: number | null; monitorName: string | null; levelLabel: string | null } => {
      if (!sub) {
        return { monitorId: null, monitorName: null, levelLabel: null };
      }
      const monitor = sub.monitor ?? null;
      const monitorName = monitor ? this.resolveMonitorFullName(monitor) : (sub.monitor_name ?? null);
      const monitorId = sub.monitor_id ?? monitor?.id ?? null;
      const degree = sub.degree ?? sub.level ?? null;
      const levelLabel = degree?.name ?? degree?.annotation ?? sub.level_label ?? null;
      return { monitorId, monitorName, levelLabel };
    };

    const checkContainer = (container: any): { monitorId: number | null; monitorName: string | null; levelLabel: string | null } | null => {
      if (!container) {
        return null;
      }
      const subgroups = container.course_subgroups ?? container.courseSubgroups ?? container.subgroups ?? [];
      for (const sub of subgroups) {
        if (targetId === normalizeId(sub?.id)) {
          return buildDetails(sub);
        }
      }
      return null;
    };

    const courseDates = course.course_dates ?? [];
    for (const cd of courseDates) {
      if (normalizedDate) {
        const dateValueNormalized = this.getDateStrFromAny(cd?.date ?? cd?.date_start ?? cd?.date_start_res ?? null);
        if (dateValueNormalized !== normalizedDate) {
          continue;
        }
      }
      const direct = checkContainer(cd);
      if (direct) {
        return direct;
      }
      const groups = cd?.course_groups ?? cd?.courseGroups ?? [];
      for (const group of groups) {
        const details = checkContainer(group);
        if (details) {
          return details;
        }
      }
    }

    if (!normalizedDate) {
      const groups = course.course_groups ?? [];
      for (const group of groups) {
        const details = checkContainer(group);
        if (details) {
          return details;
        }
      }
    }

    return null;
  }

  private resolveSubgroupOrderLabel(subgroupId: number | null, dateValue?: string | null): string | null {
    if (!subgroupId || !this.taskDetail?.course) {
      return null;
    }

    const course = this.taskDetail.course;
    const normalizedDate = dateValue ? this.getDateStrFromAny(dateValue) : null;
    const normalizeId = (val: any) => (val == null ? null : Number(val));
    const targetId = normalizeId(subgroupId);

    const findOrderInContainer = (container: any): number | null => {
      if (!container) {
        return null;
      }
      const subgroups = container.course_subgroups ?? container.courseSubgroups ?? container.subgroups ?? [];
      const index = subgroups.findIndex((sub: any) => normalizeId(sub?.id) === targetId);
      return index >= 0 ? index + 1 : null;
    };

    const courseDates = course.course_dates ?? [];
    for (const cd of courseDates) {
      if (normalizedDate) {
        const dateValueNormalized = this.getDateStrFromAny(cd?.date ?? cd?.date_start ?? cd?.date_start_res ?? null);
        if (dateValueNormalized !== normalizedDate) {
          continue;
        }
      }
      const direct = findOrderInContainer(cd);
      if (direct != null) {
        return String(direct);
      }
      const groups = cd?.course_groups ?? cd?.courseGroups ?? [];
      for (const group of groups) {
        const order = findOrderInContainer(group);
        if (order != null) {
          return String(order);
        }
      }
    }

    const groups = course.course_groups ?? [];
    for (const group of groups) {
      const order = findOrderInContainer(group);
      if (order != null) {
        return String(order);
      }
    }

    const targetTask = this.findTaskForSubgroup(targetId, normalizedDate);
    const courseId = targetTask?.course_id ?? this.taskDetail?.course_id ?? course?.id ?? null;
    const groupId = targetTask?.course_group_id ?? this.taskDetail?.course_group_id ?? null;
    const degreeId = targetTask?.degree_id ?? this.taskDetail?.degree_id ?? null;
    const tasksSource = Array.isArray(this.plannerTasks) ? this.plannerTasks : [];
    const candidateIds = new Set<number>();

    tasksSource.forEach(task => {
      if (courseId != null && Number(task?.course_id) !== Number(courseId)) {
        return;
      }
      if (groupId != null && Number(task?.course_group_id) !== Number(groupId)) {
        return;
      }
      if (degreeId != null && Number(task?.degree_id) !== Number(degreeId)) {
        return;
      }
      if (normalizedDate && this.getDateStrFromAny(task?.date) !== normalizedDate) {
        return;
      }
      const subgroupRaw = task?.course_subgroup_id;
      const subgroupParsed = subgroupRaw == null ? null : Number(subgroupRaw);
      if (subgroupParsed != null && !Number.isNaN(subgroupParsed)) {
        candidateIds.add(subgroupParsed);
      }
    });

    if (candidateIds.size) {
      const orderedIds = Array.from(candidateIds).sort((a, b) => a - b);
      const idx = orderedIds.indexOf(targetId);
      if (idx >= 0) {
        return String(idx + 1);
      }
    }

    return null;
  }

  private resolveBookingSubgroupOrder(booking: any): number | null {
    if (!booking) {
      return null;
    }
    const subgroupId = booking.course_subgroup_id
      ?? booking.subgroup_id
      ?? booking?.booking_users?.[0]?.course_subgroup_id
      ?? null;
    if (!subgroupId) {
      return null;
    }

    const course = booking.course ?? booking.courseGroup?.course ?? booking.course_group?.course ?? null;
    if (!course) {
      return null;
    }

    const normalizeId = (value: any) => (value == null ? null : Number(value));
    const targetId = normalizeId(subgroupId);
    if (targetId == null || Number.isNaN(targetId)) {
      return null;
    }

    const matchInContainer = (container: any): number | null => {
      if (!container) {
        return null;
      }
      const subgroups = container?.course_subgroups ?? container?.courseSubgroups ?? container?.subgroups ?? [];
      const idx = subgroups.findIndex((sub: any) => normalizeId(sub?.id) === targetId);
      return idx >= 0 ? idx + 1 : null;
    };

    const dateId = booking.course_date_id ?? null;
    const dateValue = this.getDateStrFromAny(booking.date ?? booking.date_full ?? null);
    const courseDates = course.course_dates ?? [];

    for (const cd of courseDates) {
      if (dateId != null && normalizeId(cd?.id) !== normalizeId(dateId)) {
        continue;
      }
      if (dateId == null && dateValue) {
        const cdDate = this.getDateStrFromAny(cd?.date ?? cd?.date_start ?? cd?.date_start_res ?? null);
        if (cdDate && cdDate !== dateValue) {
          continue;
        }
      }
      const direct = matchInContainer(cd);
      if (direct != null) {
        return direct;
      }
      const groups = cd?.course_groups ?? cd?.courseGroups ?? [];
      for (const group of groups) {
        const order = matchInContainer(group);
        if (order != null) {
          return order;
        }
      }
    }

    const courseGroups = course.course_groups ?? [];
    for (const group of courseGroups) {
      const order = matchInContainer(group);
      if (order != null) {
        return order;
      }
    }

    const ids = new Set<number>();
    const collectFromContainer = (container: any) => {
      const subgroups = container?.course_subgroups ?? container?.courseSubgroups ?? container?.subgroups ?? [];
      subgroups.forEach((sub: any) => {
        const id = normalizeId(sub?.id);
        if (id != null && !Number.isNaN(id)) {
          ids.add(id);
        }
      });
    };

    courseGroups.forEach(collectFromContainer);
    courseDates.forEach((cd: any) => {
      collectFromContainer(cd);
      const groups = cd?.course_groups ?? cd?.courseGroups ?? [];
      groups.forEach(collectFromContainer);
    });

    if (ids.size) {
      const ordered = Array.from(ids).sort((a, b) => a - b);
      const idx = ordered.indexOf(targetId);
      if (idx >= 0) {
        return idx + 1;
      }
    }

    return null;
  }

  private timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && endA > startB;
  }

  private describeTaskAssignment(task: any): string {
    const courseName = task?.course?.name
      ?? task?.booking?.course?.name
      ?? task?.booking?.name
      ?? task?.course_name
      ?? null;
    const subgroupLabel = task?.course_subgroup?.name
      ?? task?.course_subgroup_label
      ?? (task?.course_subgroup_id ? `${this.translateWithFallback('monitor_assignment.partial.subgroup', 'Subgrupo')} ${task.course_subgroup_id}` : null);
    const bookingLabel = task?.booking?.code ?? task?.booking?.id ?? task?.booking_id ?? null;

    if (courseName && subgroupLabel) {
      return `${courseName} · ${subgroupLabel}`;
    }
    if (courseName) {
      return courseName;
    }
    if (bookingLabel) {
      return `${this.translateWithFallback('monitor_assignment.partial.booking', 'Reserva')} ${bookingLabel}`;
    }
    return this.translateWithFallback('monitor_assignment.partial.conflict_default', 'Otra sesión');
  }

  private describeMonitorConflicts(monitorId: number, slot: MonitorAssignmentSlot): string[] {
    return this.getMonitorConflictsForSlot(monitorId, slot).map(task => this.describeTaskAssignment(task));
  }

  private getMonitorConflictsForSlot(monitorId: number, slot: MonitorAssignmentSlot): any[] {
    if (!monitorId || !slot?.date || !slot?.startTime) {
      return [];
    }
    const date = slot.date;
    const slotStart = slot.startTime;
    const slotEnd = slot.endTime || slot.startTime;
    const tasksSource = Array.isArray(this.plannerTasks) ? this.plannerTasks : [];

    return tasksSource.filter(task => {
      if (task?.monitor_id !== monitorId) {
        return false;
      }
      if (this.getDateStrFromAny(task?.date) !== date) {
        return false;
      }
      if (!task?.hour_start || !task?.hour_end) {
        return false;
      }
      return this.timeRangesOverlap(task.hour_start, task.hour_end, slotStart, slotEnd);
    });
  }

  private monitorHasOverlapOutsideTargets(monitorId: number): boolean {
    if (!monitorId || !this.currentAssignmentSlots.length) {
      return false;
    }
    return this.currentAssignmentSlots.some(slot => {
      const conflicts = this.getMonitorConflictsForSlot(monitorId, slot);
      if (!conflicts.length) {
        return false;
      }
      if (!this.currentAssignmentTargetSubgroupIds.size) {
        return conflicts.length > 0;
      }
      return conflicts.some(task => {
        const subgroupId = task?.course_subgroup_id;
        if (subgroupId == null) {
          return true;
        }
        const numericId = Number(subgroupId);
        return Number.isNaN(numericId) || !this.currentAssignmentTargetSubgroupIds.has(numericId);
      });
    });
  }

  private async resolveTimelineSlotsAfterAvailability(monitor: any | null, slots: MonitorAssignmentSlot[]): Promise<MonitorAssignmentSlot[] | null> {
    if (!monitor?.id) {
      return slots;
    }

    slots = this.dedupeAssignmentSlots(slots);
    const availabilityContext = {
      bookingUserIds: this.collectBookingUserIdsForAssignment(),
      subgroupIds: this.extractSubgroupIdsFromSlots(slots),
      courseId: this.taskDetail?.course_id ?? this.taskDetail?.course?.id ?? null
    };
    if (!availabilityContext.subgroupIds.length && this.taskDetail) {
      availabilityContext.subgroupIds = this.collectSubgroupIdsForAssignment(true);
    }
    // Asegurar que se incluyan los subgrupos a transferir en las exclusiones de disponibilidad
    if (this.monitorAssignmentSubgroupIds.length) {
      availabilityContext.subgroupIds = Array.from(new Set([
        ...(availabilityContext.subgroupIds ?? []),
        ...this.monitorAssignmentSubgroupIds
      ]));
    }

    this.showLoadingDialog('monitor_assignment.loading_checking');
    let result;
    try {
      result = await this.assignmentHelper.checkMonitorAvailabilityForSlots(monitor.id, slots, availabilityContext);
    } finally {
      this.hideLoadingDialog();
    }
    if (monitor?.id) {
      result.blocked.forEach(slot => {
        slot.context = slot.context ?? {};
        slot.context.conflicts = this.describeMonitorConflicts(monitor.id, slot);
      });
    }

    if (result.blocked.length && this.monitorAssignmentScope === 'single') {
      const translationKey = 'monitor_assignment.partial.single_forbidden';
      const translated = this.translateService.instant(translationKey);
      const fallback = 'El monitor ya está ocupado en esa franja.';
      const message = translated === translationKey ? fallback : translated;
      this.snackbar.open(message, 'OK', { duration: 4000 });
      return null;
    }

    if (!result.blocked.length) {
      return slots;
    }

    const proceed = await this.assignmentHelper.confirmPartialAvailability(this.resolveMonitorFullName(monitor), result);
    if (!proceed) {
      return null;
    }

    if (!result.available.length) {
      this.snackbar.open(this.translateWithFallback('monitor_assignment.partial.no_available', 'El monitor no está disponible en ninguna de las fechas seleccionadas.'), 'OK', { duration: 3000 });
      return null;
    }

    return result.available;
  }

  private async confirmTimelinePastDates(slots: MonitorAssignmentSlot[]): Promise<boolean> {
    const hasPast = slots.some(slot => {
      const dateTime = moment(`${slot.date}T${slot.startTime || '00:00'}`);
      return dateTime.isValid() && dateTime.isBefore(moment());
    });

    if (!hasPast) {
      return true;
    }

    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: {
        title: this.translateWithFallback('monitor_assignment.past_warning_title', 'Fecha en el pasado'),
        message: this.translateWithFallback('monitor_assignment.past_warning_message', 'La fecha seleccionada es anterior a hoy. ¿Quieres continuar?')
      }
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    return !!confirmed;
  }

  private async executeTimelineTransferForSlots(
    monitor: any | null,
    slots: MonitorAssignmentSlot[],
    preserveOriginalScope: boolean
  ): Promise<boolean> {
    if (!slots.length) {
      return false;
    }

    const originalScope = this.monitorAssignmentScope;
    const originalStart = this.monitorAssignmentStartDate;
    const originalEnd = this.monitorAssignmentEndDate;
    const shouldPreserveScope = preserveOriginalScope;

    this.showLoadingDialog('monitor_assignment.loading_applying');
    try {
      if (shouldPreserveScope) {
        let subgroupsToUse = Array.from(
          new Set(
            slots
              .map(slot => slot.context?.subgroupId)
              .filter((id): id is number => id != null)
          )
        );
        if (!subgroupsToUse.length && this.monitorAssignmentSubgroupIds?.length) {
          subgroupsToUse = [...this.monitorAssignmentSubgroupIds];
        }

        // For different scopes, use appropriate subgroup collection:
        // - scope='all': use ALL subgroups of the SAME DEGREE in the course
        // - scope='from'/'range': use all related subgroups in date range (same degree)
        // - scope='single'/'interval': use only preview subgroups
        if (this.taskDetail) {
          if (this.monitorAssignmentScope === 'all' || this.monitorAssignmentScope === 'from' || this.monitorAssignmentScope === 'range') {
            // For wider scopes, keep only linked subgroup-date entries for the selected subgroup.
            subgroupsToUse = this.collectSubgroupIdsForAssignment(true);
          }
        }

        const payload = this.buildFullMonitorTransferPayload(monitor?.id ?? null, {
          subgroupIds: subgroupsToUse
        });

        if (!payload.booking_users.length && payload.subgroup_id === null && !payload.course_id) {
          this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
          return false;
        }

        await firstValueFrom(this.monitorsService.transferMonitor(payload));
      } else {
        const sequences = this.groupSlotsByConsecutiveDate(slots);

        for (const seq of sequences) {
          if (!seq.length) {
            continue;
          }
          this.monitorAssignmentScope = seq.length === 1 ? 'single' : 'range';
          this.monitorAssignmentStartDate = seq[0].date;
          this.monitorAssignmentEndDate = seq[seq.length - 1].date;

          const sequenceSubgroupIds = this.extractSubgroupIdsFromSlots(seq);
          const subgroupIdsToUse = sequenceSubgroupIds.length
            ? sequenceSubgroupIds
            : this.collectSubgroupIdsForAssignment(true);
          if (!subgroupIdsToUse.length && this.monitorAssignmentSubgroupIds?.length) {
            subgroupIdsToUse.push(...this.monitorAssignmentSubgroupIds);
          }
          if (!subgroupIdsToUse.length && this.taskDetail?.course_subgroup_id != null) {
            subgroupIdsToUse.push(this.taskDetail.course_subgroup_id);
          }
          const payload = this.buildFullMonitorTransferPayload(
            monitor?.id ?? null,
            {
              courseDateId: seq.length === 1 ? seq[0].context?.courseDateId ?? null : null,
              subgroupIds: subgroupIdsToUse.length ? subgroupIdsToUse : undefined
            }
          );

          if (!payload.booking_users.length && payload.subgroup_id === null && !payload.course_id) {
            this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
            return false;
          }

          await firstValueFrom(this.monitorsService.transferMonitor(payload));
        }
      }

      return true;
    } catch (error) {
      this.handleMonitorTransferError(error);
      return false;
    } finally {
      this.monitorAssignmentScope = originalScope;
      this.monitorAssignmentStartDate = originalStart;
      this.monitorAssignmentEndDate = originalEnd;
      this.hideLoadingDialog();
    }
  }

  private groupSlotsByConsecutiveDate(slots: MonitorAssignmentSlot[]): MonitorAssignmentSlot[][] {
    const sorted = [...slots].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const groups: MonitorAssignmentSlot[][] = [];
    let current: MonitorAssignmentSlot[] = [];

    sorted.forEach(slot => {
      if (!slot.date) {
        return;
      }
      if (!current.length) {
        current.push(slot);
        return;
      }
      const last = current[current.length - 1];
      const lastMoment = moment(last.date, 'YYYY-MM-DD');
      const currentMoment = moment(slot.date, 'YYYY-MM-DD');
      if (lastMoment.isValid() && currentMoment.isValid() && currentMoment.diff(lastMoment, 'days') === 1) {
        current.push(slot);
      } else {
        groups.push(current);
        current = [slot];
      }
    });

    if (current.length) {
      groups.push(current);
    }

    return groups;
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.translateService.instant(key);
    return translated === key ? fallback : translated;
  }

  private showLoadingDialog(messageKey: string): void {
    const message = this.translateWithFallback(messageKey, 'Traitement en cours...');
    if (this.loadingDialogRef) {
      this.loadingDialogRef.componentInstance.data.message = message;
      return;
    }
    this.loadingDialogRef = this.dialog.open(MonitorAssignmentLoadingDialogComponent, {
      disableClose: true,
      panelClass: 'monitor-assignment-loading-dialog',
      data: { message }
    });
  }

  private hideLoadingDialog(): void {
    this.loadingDialogRef?.close();
    this.loadingDialogRef = undefined;
  }


  async saveEditedMonitor() {
    const monitor = this.editedMonitor ?? null;
    const slots = this.buildSlotsForCurrentSelection();
    if (!slots.length) {
      this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      return;
    }

    const canProceed = await this.confirmTimelinePastDates(slots);
    if (!canProceed) {
      return;
    }

    const resolvedSlots = await this.resolveTimelineSlotsAfterAvailability(monitor, slots);
    if (!resolvedSlots?.length) {
      return;
    }

    const success = await this.executeTimelineTransferForSlots(
      monitor,
      resolvedSlots,
      resolvedSlots.length === slots.length
    );
    if (success) {
      this.editedMonitor = null;
      this.showEditMonitor = false;
      this.hideDetail();
      this.loadBookings(this.currentDate, { silent: true });
      this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
    }
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

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result) {
        this.getData();
      }
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

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
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
            .pipe(takeUntil(this.destroy$)).subscribe((data) => {

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
            .pipe(takeUntil(this.destroy$)).subscribe((data) => {

              this.getData();
              this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
            })
          }
        } else {

          const updateEdit = this.events[isOverlap[0].overlapedId].id;
          this.crudService.update('/monitor-nwds', isOverlap[0].dates[0], updateEdit)
            .pipe(takeUntil(this.destroy$)).subscribe((data) => {
              isOverlap[0].dates[1].start_time = data.data.end_time;
              this.crudService.create('/monitor-nwds', isOverlap[0].dates[1])
              .pipe(takeUntil(this.destroy$)).subscribe((data) => {

                this.getData();
                this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
              })
            })
          // hacer el update y el create
          this.snackbar.open(this.translateWithFallback('event_overlap', 'Overlap detected'), 'OK', { duration: 3000 });
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

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((userConfirmed: boolean) => {
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

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
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
            .pipe(takeUntil(this.destroy$)).subscribe((data) => {

              this.getData();
              this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
            })
          }
        } else {

          const updateEdit = this.events[isOverlap[0].overlapedId].id;
          this.crudService.update('/monitor-nwds', isOverlap[0].dates[0], updateEdit)
            .pipe(takeUntil(this.destroy$)).subscribe((data) => {
              isOverlap[0].dates[1].start_time = data.data.end_time;
              this.crudService.create('/monitor-nwds', isOverlap[0].dates[1])
              .pipe(takeUntil(this.destroy$)).subscribe((data) => {

                this.getData();
                this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
              })
            })
          // hacer el update y el create
          this.snackbar.open(this.translateWithFallback('event_overlap', 'Overlap detected'), 'OK', { duration: 3000 });
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

  private saveViewState(): void {
    const state = {
      timelineView: this.timelineView,
      currentDate: this.currentDate ? this.currentDate.toISOString() : null
    };
    localStorage.setItem(this.plannerViewStorageKey, JSON.stringify(state));
  }

  private loadSavedViewState(): void {
    const raw = localStorage.getItem(this.plannerViewStorageKey);
    if (!raw) {
      return;
    }
    try {
      const state = JSON.parse(raw);
      if (state?.timelineView) {
        this.timelineView = state.timelineView;
      }
      if (state?.currentDate) {
        const parsedDate = new Date(state.currentDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          this.currentDate = parsedDate;
          this.searchDate = parsedDate;
        }
      }
    } catch {
      // ignore malformed storage
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
      this.crudService.update('/monitor-nwds', firstBlockData, this.blockDetail.block_id).pipe(takeUntil(this.destroy$)).subscribe(
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
      this.crudService.post('/monitor-nwds', secondBlockData).pipe(takeUntil(this.destroy$)).subscribe(
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
      this.crudService.delete('/monitor-nwds', this.blockDetail.block_id).pipe(takeUntil(this.destroy$)).subscribe(
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

  getGroupedBlockIds(block: any = this.blockDetail): number[] {
    if (!block) return [];

    const tasksSource = Array.isArray(this.plannerTasks) ? this.plannerTasks : [];
    const signature = {
      date: this.normalizeBlockDate(block.date ?? block.start_date),
      hour_start: block.hour_start,
      hour_end: block.hour_end,
      full_day: !!block.full_day,
      name: block.name ?? null,
      type: block.type ?? null,
      user_nwd_subtype_id: block.user_nwd_subtype_id ?? null,
      color_block: block.color_block ?? null,
      school_id: block.school_id ?? null,
      station_id: block.station_id ?? null
    };

    const matches = tasksSource.filter(task => {
      if (!task?.block_id) return false;
      if (task.type !== signature.type) return false;
      const taskDate = this.normalizeBlockDate(task.date ?? task.start_date);
      if (!taskDate || taskDate !== signature.date) return false;
      if (!!task.full_day !== signature.full_day) return false;
      if ((task.name ?? null) !== signature.name) return false;
      if ((task.user_nwd_subtype_id ?? null) !== signature.user_nwd_subtype_id) return false;
      if ((task.color_block ?? null) !== signature.color_block) return false;
      if ((task.school_id ?? null) !== signature.school_id) return false;
      if ((task.station_id ?? null) !== signature.station_id) return false;
      if (!signature.full_day) {
        if (task.hour_start !== signature.hour_start) return false;
        if (task.hour_end !== signature.hour_end) return false;
      }
      return true;
    });

    const ids = matches.map(task => task.block_id).filter(Boolean);
    return Array.from(new Set(ids));
  }

  getGroupedBlockIdsForRange(block: any, rangeStart: moment.Moment, rangeEnd: moment.Moment): number[] {
    if (!block) return [];

    const tasksSource = Array.isArray(this.plannerTasks) ? this.plannerTasks : [];
    const signature = {
      hour_start: block.hour_start,
      hour_end: block.hour_end,
      full_day: !!block.full_day,
      name: block.name ?? null,
      type: block.type ?? null,
      user_nwd_subtype_id: block.user_nwd_subtype_id ?? null,
      color_block: block.color_block ?? null,
      school_id: block.school_id ?? null,
      station_id: block.station_id ?? null
    };

    const start = rangeStart.clone().startOf('day');
    const end = rangeEnd.clone().endOf('day');

    const matches = tasksSource.filter(task => {
      if (!task?.block_id) return false;
      if (task.type !== signature.type) return false;
      const taskDateValue = this.normalizeBlockDate(task.date ?? task.start_date);
      if (!taskDateValue) return false;
      const taskMoment = moment(taskDateValue, 'YYYY-MM-DD', true);
      if (!taskMoment.isValid() || !taskMoment.isBetween(start, end, 'day', '[]')) return false;
      if (!!task.full_day !== signature.full_day) return false;
      if ((task.name ?? null) !== signature.name) return false;
      if ((task.user_nwd_subtype_id ?? null) !== signature.user_nwd_subtype_id) return false;
      if ((task.color_block ?? null) !== signature.color_block) return false;
      if ((task.school_id ?? null) !== signature.school_id) return false;
      if ((task.station_id ?? null) !== signature.station_id) return false;
      if (!signature.full_day) {
        if (task.hour_start !== signature.hour_start) return false;
        if (task.hour_end !== signature.hour_end) return false;
      }
      return true;
    });

    const ids = matches.map(task => task.block_id).filter(Boolean);
    return Array.from(new Set(ids));
  }

  private normalizeBlockDate(value: any): string | null {
    if (!value) return null;
    const m = moment(value);
    if (!m.isValid()) return null;
    return m.format('YYYY-MM-DD');
  }

    deleteGroupedBlock(): void {
      if (!this.blockDetail) return;

      const ids = this.getGroupedBlockIds(this.blockDetail);
      if (ids.length <= 1) {
        this.deleteEditedBlock();
        return;
      }

      const dialogRef = this.dialog.open(GroupedBlockDeleteDialogComponent, {
        width: '560px',
        data: {
          title: this.translateService.instant('delete_grouped_block'),
          message: this.translateService.instant('delete_grouped_block_confirm'),
          dayLabel: this.translateService.instant('delete_grouped_block_option_day'),
          visibleLabel: this.translateService.instant('delete_grouped_block_option_visible'),
          cancelLabel: this.translateService.instant('cancel')
        }
      });

      dialogRef.afterClosed().subscribe((selection: 'day' | 'visible' | null) => {
        if (!selection) {
          return;
        }

        let idsToDelete = ids;
        if (selection === 'visible') {
          const baseDate = moment(this.currentDate);
          let rangeStart = baseDate.clone();
          let rangeEnd = baseDate.clone();

          if (this.timelineView === 'week') {
            rangeStart = baseDate.clone().startOf('isoWeek');
            rangeEnd = baseDate.clone().endOf('isoWeek');
          } else if (this.timelineView === 'month') {
            rangeStart = baseDate.clone().startOf('month');
            rangeEnd = baseDate.clone().endOf('month');
          }

          idsToDelete = this.getGroupedBlockIdsForRange(this.blockDetail, rangeStart, rangeEnd);
        }

        if (idsToDelete.length <= 1) {
          this.deleteEditedBlock();
          return;
        }

        this.deletingGroupedBlocks = true;
        this.crudService.post('/monitor-nwds/bulk-delete', { ids: idsToDelete })
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            () => {
              this.deletingGroupedBlocks = false;
              this.hideEditBlock();
              this.hideBlock();
              this.loadBookings(this.currentDate);
            },
            error => {
              this.deletingGroupedBlocks = false;
              console.error('Error deleting grouped blocks', error);
              this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
            }
          );
      });
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

    const data = this.buildMonitorAvailabilityPayload(this.taskDetail);

    this.crudService.post('/admin/monitors/available', data)
      .pipe(takeUntil(this.destroy$)).subscribe((response) => {
        this.monitorsForm = response.data;
        this.hasApiAvailability = Array.isArray(this.monitorsForm) && this.monitorsForm.length > 0;
        this.loadingMonitors = false;
        this.monitorSearchHint = this.buildMonitorSearchHint();
        this.bumpMonitorOptionsVersion();
      }, () => {
        this.loadingMonitors = false;
        this.monitorSearchHint = '';
        this.hasApiAvailability = false;
        this.bumpMonitorOptionsVersion();
      })
  }

  isMonitorTemporarilyBlocked(monitor: any): boolean {
    if (!this.moveTask || !monitor || monitor.id == null || !this.taskDetail) {
      return false;
    }
    return this.monitorHasOverlapOutsideTargets(monitor.id);
  }

  onMonitorSearchInput(event: Event): void {
    this.monitorSearchTerm = (event.target as HTMLInputElement)?.value ?? '';
  }

  get filteredMonitorOptions(): any[] {
    const term = (this.monitorSearchTerm || '').trim().toLowerCase();
    const monitors = this.getMonitorSelectOptions();
    const filtered = monitors.filter(monitor => {
      const name = this.getMonitorDisplayName(monitor).toLowerCase();
      return !term || name.includes(term);
    });
    return filtered.sort((a, b) => {
      const nameA = this.getMonitorDisplayName(a);
      const nameB = this.getMonitorDisplayName(b);
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Build monitor options for the modal select:
   * - Start with availability API results (monitorsForm).
   * - Add timeline monitors (visible on the grid) that match sport and are not busy,
   *   so users can still pick them with confirmation if needed.
   */
  getMonitorSelectOptions(): any[] {
    if (this.monitorSelectOptionsCacheVersion === this.monitorOptionsVersion) {
      return this.monitorSelectOptionsCache;
    }

    const apiList = Array.isArray(this.monitorsForm) ? this.monitorsForm : [];
    const timelineList = Array.isArray(this.filteredMonitors) ? this.filteredMonitors : [];
    const combined = apiList.length ? [...apiList, ...timelineList] : [...timelineList];

    const seen = new Set<number>();
    const options = combined.reduce((acc: any[], monitor: any) => {
      if (!monitor || monitor.id == null) {
        return acc;
      }
      if (seen.has(monitor.id)) {
        return acc;
      }
      seen.add(monitor.id);

      const matchesSport = this.monitorMatchesCurrentSport(monitor);
      if (!matchesSport && this.isMonitorFromApiList(monitor)) {
        return acc;
      }

      const option = { ...monitor };
      if (!matchesSport) {
        option.__sportMismatch = true;
        option.__sportMismatchMessage = this.translateWithFallback(
          'monitor_assignment.override_sport',
          'Deporte distinto al curso (requiere confirmación)'
        );
      }

      const busy = this.isMonitorBusyForCurrentTask(option);
      if (busy) {
        option.__busy = true;
        option.__busyMessage = this.translateWithFallback('monitor_assignment.conflict_default', 'Tiene un conflicto en este horario');
      }

      acc.push(option);
      return acc;
    }, []);

    const sorted = options.sort((a, b) => {
      const aApi = this.isMonitorFromApiList(a) ? 0 : 1;
      const bApi = this.isMonitorFromApiList(b) ? 0 : 1;
      return aApi - bApi || this.getMonitorDisplayName(a).localeCompare(this.getMonitorDisplayName(b));
    });

    this.monitorSelectOptionsCache = sorted;
    this.monitorSelectOptionsCacheVersion = this.monitorOptionsVersion;
    return sorted;
  }

  getMonitorSelectTotals(): { available: number; visible: number } {
    const apiList = Array.isArray(this.monitorsForm) ? this.monitorsForm : [];
    const options = this.getMonitorSelectOptions();
    return {
      available: apiList.filter(m => m && m.id != null && this.monitorMatchesCurrentSport(m)).length,
      visible: options.length
    };
  }

  private buildMonitorSearchHint(): string {
    const totals = this.getMonitorSelectTotals();
    if (!totals.visible) {
      return '';
    }
    if (totals.available && totals.visible >= totals.available) {
      return `${totals.visible} monitores compatibles`;
    }
    if (totals.available) {
      return `${totals.visible} de ${totals.available} monitores compatibles`;
    }
    return `${totals.visible} monitores visibles`;
  }

  isMonitorFromApiList(monitor: any): boolean {
    return Array.isArray(this.monitorsForm) && this.monitorsForm.some(m => m?.id === monitor?.id);
  }

  private isMonitorBusyForCurrentTask(monitor: any): boolean {
    if (!monitor || monitor.id == null || !this.taskDetail) {
      return false;
    }
    return this.monitorHasOverlapOutsideTargets(monitor.id);
  }

  async onMonitorSelected(monitor: any) {
    if (!monitor) {
      this.editedMonitor = null;
      return;
    }

    if (this.isMonitorFromApiList(monitor)) {
      this.editedMonitor = monitor;
      return;
    }

    // Not returned by availability API (nivel/idioma/otros). Ask for confirmation.
    const confirmed = await this.confirmMonitorOverride(monitor);
    if (confirmed) {
      this.editedMonitor = monitor;
    } else {
      this.editedMonitor = null;
    }
  }

  private async confirmMonitorOverride(monitor: any): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmUnmatchMonitorComponent, {
      data: {
        booking: this.taskDetail,
        monitor,
        school_id: this.activeSchool
      }
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    return !!confirmed;
  }


  private collectCourseSubgroupIdsForTask(task: any, filterByDegree: boolean = false): number[] {
    if (!task) return [];
    const subgroupIds = new Set<number>();
    const degreeId = filterByDegree ? this.resolveTaskDegreeId(task) : null;

    const addId = (value: any, subgroupDegree?: any) => {
      // If filterByDegree is enabled, only add if degree matches
      if (filterByDegree && degreeId != null) {
        const subgroupDegreeId = subgroupDegree?.degree_id ?? subgroupDegree?.degree?.id;
        if (subgroupDegreeId !== degreeId) {
          return; // Skip subgroups with different degree
        }
      }
      const numeric = Number(value);
      if (!Number.isNaN(numeric) && numeric !== 0) {
        subgroupIds.add(numeric);
      }
    };

    const baseSubgroup = task.course_subgroup_id ?? task.subgroup_id;
    addId(baseSubgroup, task.course_subgroup || task);

    const courseGroups = task.course?.course_groups ?? [];
    courseGroups.forEach((group: any) => {
      const subgroups = group?.course_subgroups ?? group?.subgroups ?? [];
      subgroups.forEach((subgroup: any) => addId(subgroup?.id, subgroup));
    });

    const courseDates = task.course?.course_dates ?? [];
    courseDates.forEach((date: any) => {
      const dateGroups = date?.course_groups ?? [];
      dateGroups.forEach((group: any) => {
        const subgroups = group?.course_subgroups ?? group?.subgroups ?? [];
        subgroups.forEach((subgroup: any) => addId(subgroup?.id, subgroup));
      });
      const dateSubgroups = date?.course_subgroups ?? date?.courseSubgroups ?? [];
      dateSubgroups.forEach((subgroup: any) => addId(subgroup?.id, subgroup));
    });

    (this.plannerTasks ?? [])
      .filter(t => t?.course_id === task.course_id)
      .forEach(t => addId(t.course_subgroup_id, t.course_subgroup || t));

    return Array.from(subgroupIds);
  }

  private bumpMonitorOptionsVersion(): void {
    this.monitorOptionsVersion++;
    if (this.monitorOptionsVersion > Number.MAX_SAFE_INTEGER - 1) {
      this.monitorOptionsVersion = 0;
    }
  }

  private resolveBookingUserId(client: any): number | null {
    if (!client) {
      return null;
    }
    if (client.booking_user_id != null) {
      return client.booking_user_id;
    }
    if (client.bookingUserId != null) {
      return client.bookingUserId;
    }
    if (client.booking_user?.id != null) {
      return client.booking_user.id;
    }
    return client.id ?? null;
  }

  isAttendedClient(client: any): boolean {
    if (!client) {
      return false;
    }
    return client.attended === true || client.attended === 1 || client.attendance === true || client.attendance === 1;
  }

  onAttendanceToggleClient(client: any, checked: boolean): void {
    const bookingUserId = this.resolveBookingUserId(client);
    if (!bookingUserId) {
      return;
    }
    const payload: any = {
      ...client,
      attended: checked,
      attendance: checked
    };
    ['client', 'created_at', 'deleted_at', 'updated_at'].forEach((k) => {
      if (k in payload) {
        delete payload[k];
      }
    });

    this.crudService.update('/booking-users', payload, bookingUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          client.attended = checked;
          client.attendance = checked;
          this.snackbar.open(
            this.translateService.instant('toast.registered_correctly'),
            '',
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error('Error updating attendance:', error);
          this.snackbar.open(
            'Error al actualizar asistencia',
            '',
            { duration: 3000 }
          );
        }
      });
  }

  private getBookingUserIdsFromTask(task: any): number[] {
    if (!task) {
      return [];
    }
    const ids = new Set<number>();
    const clients = Array.isArray(task.all_clients) ? task.all_clients : [];
    clients.forEach((client: any) => {
      const resolvedId = this.resolveBookingUserId(client);
      if (resolvedId != null) {
        ids.add(resolvedId);
      }
    });
    return Array.from(ids);
  }

  private buildMonitorAvailabilityPayload(task: any): any {
    if (!task) {
      return {};
    }
    const clientIds = (task.all_clients || [])
      .map((client: any) => client?.id)
      .filter((id: any) => id != null);

    const subgroupContextIds = this.collectCourseSubgroupIdsForTask(task);
    const fallbackSubgroup =
      task.course_subgroup_id && subgroupContextIds.indexOf(task.course_subgroup_id) === -1
        ? [task.course_subgroup_id]
        : [];

    return {
      sportId: task.sport_id,
      minimumDegreeId: task.degree_id || task.degree?.id,
      startTime: task.hour_start,
      endTime: task.hour_end,
      date: task.date,
      clientIds,
      bookingUserIds: this.getBookingUserIdsFromTask(task),
      subgroupIds: [...subgroupContextIds, ...fallbackSubgroup],
      courseId: task.course_id ?? task.course?.id ?? null
    };
  }

  private extractSubgroupIdsFromSlots(slots: MonitorAssignmentSlot[]): number[] {
    const ids = new Set<number>();
    slots.forEach(slot => {
      const rawId = slot?.context?.subgroupId ?? slot?.context?.courseSubgroupId;
      if (rawId == null) {
        return;
      }
      const parsed = Number(rawId);
      if (!Number.isNaN(parsed)) {
        ids.add(parsed);
      }
    });
    if (!ids.size && this.taskDetail) {
      this.collectSubgroupIdsForAssignment(true).forEach(id => ids.add(id));
      if (this.taskDetail?.course_subgroup_id != null) {
        ids.add(Number(this.taskDetail.course_subgroup_id));
      }
    }
    return Array.from(ids);
  }

  private getMonitorDisplayName(monitor: any): string {
    if (!monitor) {
      return '';
    }
    const first = monitor.first_name ?? monitor.firstName ?? '';
    const last = monitor.last_name ?? monitor.lastName ?? '';
    const combined = `${first} ${last}`.trim();
    if (combined) {
      return combined;
    }
    if (monitor.name) {
      return monitor.name;
    }
    return '';
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

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      if (data) {
        this.hideDetail();
        this.hideGrouped();
        this.loadBookings(this.currentDate, { silent: true });
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
        subgroupNumber: this.taskDetail.subgroup_number, currentDate: moment(this.taskDetail.date), degrees: this.taskDetail.degrees_sport, currentStudents: this.taskDetail.all_clients, currentMonitor: this.taskDetail.monitor
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      if (data) {
        dialogRef.close();
        this.hideDetail();
        this.hideGrouped();
        this.loadBookings(this.currentDate, { silent: true });
      }
    });
  }



  /**
   * Handle click events on the document to close modals when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Exclude clicks happening inside Material overlay containers (select panels, datepickers)
    const isMaterialOverlay = !!target.closest('.mat-select-panel, .mat-mdc-select-panel, .cdk-overlay-pane, .cdk-overlay-container, .cdk-overlay-backdrop, .mat-menu-panel, .mat-datepicker-popup, .mat-mdc-datepicker-popup, .mat-autocomplete-panel, .mat-mdc-autocomplete-panel, mat-option, mat-select, .mat-select-trigger, .mat-mdc-select-value');
    if (isMaterialOverlay) {
      return;
    }

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
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
    this.currentAssignmentSlots = [];
    this.currentAssignmentTargetSubgroupIds.clear();
    this.monitorSelectOptionsCache = [];
    this.monitorSelectOptionsCacheVersion = -1;
    this.destroy$.next();
    this.destroy$.complete();
  }

  isMatch(monitorId: any): boolean {
    return !!this.matchResults[monitorId];
  }

  async updateMatchResults() {
    const monitors = Array.isArray(this.filteredMonitors) ? this.filteredMonitors : [];
    const limit = 6;
    let index = 0;

    const worker = async () => {
      while (index < monitors.length) {
        const current = monitors[index];
        index++;
        if (!current?.id) {
          continue;
        }
        const match = await this.matchTeacher(current.id);
        this.matchResults[current.id] = match;
      }
    };

    const workers = new Array(Math.min(limit, monitors.length)).fill(null).map(() => worker());
    await Promise.all(workers);
  }

  async matchTeacher(monitorId: any): Promise<boolean> {
    let ret = false;

    if (monitorId !== null && this.monitorsForm) {
      const matchKey = this.buildMatchCacheKey(monitorId);
      if (this.monitorMatchCache.has(matchKey)) {
        return this.monitorMatchCache.get(matchKey) ?? false;
      }
      const monitor = this.allMonitors.find((m) => m.id === monitorId);
      if (!monitor) {
        return false;
      }
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
        let languageMismatch = false;
        const clients = Array.isArray(this.taskDetail?.all_clients) ? this.taskDetail.all_clients : [];
        for (const client of clients) {
          const clientLanguages = {
            "language1_id": client.client.language1_id,
            "language2_id": client.client.language2_id,
            "language3_id": client.client.language3_id,
            "language4_id": client.client.language4_id,
            "language5_id": client.client.language5_id,
            "language6_id": client.client.language6_id
          };

          if (!this.langMatch(monitorLanguages, clientLanguages)) {
            languageMismatch = true;
            break;
          }
        }

        ret = languageMismatch;

        if (!languageMismatch && clients.length > 0 && this.taskDetail.course.course_type !== 2) {
          const degreeId = this.taskDetail?.degree?.id ?? this.taskDetail?.degree_id ?? null;
          if (degreeId != null) {
            const authorizedDegrees = this.getAuthorizedDegreesFromMonitorSport(sport);
            if (authorizedDegrees.size > 0) {
              if (authorizedDegrees.has(degreeId)) {
                ret = true;
              }
            } else {
              const fetchedDegrees = await this.getMonitorAuthorizedDegrees(monitor.id, this.taskDetail.sport_id);
              if (fetchedDegrees.has(degreeId)) {
                ret = true;
              }
            }
          }
        }
      }
    }
    if (monitorId !== null) {
      this.monitorMatchCache.set(this.buildMatchCacheKey(monitorId), ret);
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

  private getAuthorizedDegreesFromMonitorSport(sport: any): Set<number> {
    const degrees = new Set<number>();
    if (!sport) {
      return degrees;
    }
    const authList = Array.isArray(sport.authorizedDegrees) ? sport.authorizedDegrees : [];
    authList.forEach((entry: any) => {
      const value = entry?.degree_id ?? entry?.degreeId ?? entry?.id ?? null;
      if (value != null) {
        degrees.add(Number(value));
      }
    });
    return degrees;
  }

  private buildMatchCacheKey(monitorId: number): string {
    const sportId = this.taskDetail?.sport_id ?? 'none';
    const degreeId = this.taskDetail?.degree?.id ?? this.taskDetail?.degree_id ?? 'none';
    const schoolId = this.activeSchool ?? 'none';
    return `${monitorId}-${sportId}-${degreeId}-${schoolId}`;
  }

  private async getMonitorAuthorizedDegrees(monitorId: number, sportId: number): Promise<Set<number>> {
    const key = `${monitorId}-${sportId}-${this.activeSchool ?? 'none'}`;
    if (this.monitorDegreeAuthCache.has(key)) {
      return this.monitorDegreeAuthCache.get(key) as Promise<Set<number>>;
    }

    const promise = (async () => {
      const degreesSet = new Set<number>();
      const data = await firstValueFrom(
        this.crudService.list(
          '/monitor-sports-degrees',
          1,
          1000,
          'desc',
          'id',
          '&monitor_id=' + monitorId + '&school_id=' + this.activeSchool + '&sport_id=' + sportId
        )
      );

      if (!data?.data?.length) {
        return degreesSet;
      }

      const monitorSportId = data.data[0].id;
      const authsD = await firstValueFrom(
        this.crudService.list(
          '/monitor-sport-authorized-degrees',
          1,
          1000,
          'desc',
          'id',
          '&monitor_id=' + monitorId + '&school_id=' + this.activeSchool + '&monitor_sport_id=' + monitorSportId
        )
      );

      if (Array.isArray(authsD?.data)) {
        authsD.data.forEach((element: any) => {
          if (element?.degree_id != null) {
            degreesSet.add(element.degree_id);
          }
        });
      }

      return degreesSet;
    })();

    this.monitorDegreeAuthCache.set(key, promise);
    return promise;
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

