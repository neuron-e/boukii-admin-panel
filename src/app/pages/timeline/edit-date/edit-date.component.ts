import {Component, Inject, OnInit} from '@angular/core';
import {UntypedFormGroup} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {ApiCrudService} from '../../../../service/crud.service';
import {UtilsService} from '../../../../service/utils.service';
import {TranslateService} from '@ngx-translate/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import moment from 'moment/moment';
import {ConfirmModalComponent} from '../../monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import {forkJoin} from 'rxjs';

@Component({
  selector: 'vex-edit-date',
  templateUrl: './edit-date.component.html',
  styleUrls: ['./edit-date.component.scss']
})
export class EditDateComponent implements OnInit {

  form: UntypedFormGroup;
  user: any;
  hourStart = '';
  duration: any;
  selectedCourseDateId;
  date;

  // Calendar properties
  selectedDate: Date | null = null;
  availableDates: Set<string> = new Set();
  minDate: Date;
  maxDate: Date;
  loading = true;

  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private crudService: ApiCrudService, private dialogRef: MatDialogRef<any>,
              private translateService: TranslateService, private dialog: MatDialog, private snackbar: MatSnackBar,
              private utilsService: UtilsService) {
  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.selectedCourseDateId = this.defaults.course_date_id;
    this.date = this.defaults.course.course_dates.find(i => i.id === this.selectedCourseDateId);
    this.hourStart = this.defaults.all_clients[0].hour_start;
    this.duration = this.calculateDuration(this.hourStart, this.defaults.all_clients[0].hour_end);

    // Set initial selected date
    if (this.date?.date) {
      this.selectedDate = moment(this.date.date).toDate();
    }

    // Load available dates from course
    this.loadAvailableDates();
  }

  private loadAvailableDates(): void {
    this.loading = true;
    const courseId = this.defaults.course_id || this.defaults.course?.id;

    if (!courseId) {
      this.useLocalCourseDates();
      return;
    }

    // Fetch fresh course data from API
    this.crudService.getById('/courses', courseId).subscribe({
      next: (response: any) => {
        const course = response?.data || response;
        this.processCourseDates(course);
        this.loading = false;
      },
      error: () => {
        // Fallback to local data
        this.useLocalCourseDates();
        this.loading = false;
      }
    });
  }

  private useLocalCourseDates(): void {
    this.processCourseDates(this.defaults.course);
  }

  private processCourseDates(course: any): void {
    const courseType = course?.course_type;
    const today = moment().startOf('day');

    if (courseType === 1) {
      // Group courses: use course_dates directly
      const courseDates = course?.course_dates || [];
      courseDates.forEach((cd: any) => {
        if (cd?.date && moment(cd.date).isSameOrAfter(today)) {
          this.availableDates.add(moment(cd.date).format('YYYY-MM-DD'));
        }
      });
    } else {
      // Private/Flex courses: generate dates from periods or date range
      const settings = typeof course?.settings === 'string'
        ? JSON.parse(course.settings || '{}')
        : (course?.settings || {});

      const periods = settings?.periods || [];

      if (periods.length > 0) {
        // Generate dates from periods
        periods.forEach((period: any) => {
          const start = moment(period.dateFrom || period.date_start || period.date);
          const end = moment(period.dateTo || period.date_end || period.date);

          if (start.isValid() && end.isValid()) {
            const current = start.clone();
            while (current.isSameOrBefore(end)) {
              if (current.isSameOrAfter(today)) {
                this.availableDates.add(current.format('YYYY-MM-DD'));
              }
              current.add(1, 'day');
            }
          }
        });
      } else {
        // Use course date range
        const dateStart = moment(course?.date_start);
        const dateEnd = moment(course?.date_end);

        if (dateStart.isValid() && dateEnd.isValid()) {
          const current = dateStart.clone();
          while (current.isSameOrBefore(dateEnd)) {
            if (current.isSameOrAfter(today)) {
              this.availableDates.add(current.format('YYYY-MM-DD'));
            }
            current.add(1, 'day');
          }
        }
      }
    }

    // Set min/max dates for calendar
    if (this.availableDates.size > 0) {
      const sortedDates = Array.from(this.availableDates).sort();
      this.minDate = moment(sortedDates[0]).toDate();
      this.maxDate = moment(sortedDates[sortedDates.length - 1]).toDate();
    } else {
      // Fallback
      this.minDate = new Date();
      this.maxDate = moment().add(1, 'year').toDate();
    }
  }

  // Calendar date filter - only allow available dates
  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const dateStr = moment(date).format('YYYY-MM-DD');
    return this.availableDates.has(dateStr);
  };

  // Calendar date class - highlight available dates
  dateClass = (date: Date): string => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    if (this.availableDates.has(dateStr)) {
      return 'available-date';
    }
    return '';
  };

  onDateSelected(date: Date | null): void {
    if (!date) return;

    this.selectedDate = date;
    const dateStr = moment(date).format('YYYY-MM-DD');

    // Find matching course_date if exists (for group courses)
    const matchingCourseDate = this.defaults.course.course_dates?.find(
      (cd: any) => moment(cd.date).format('YYYY-MM-DD') === dateStr
    );

    if (matchingCourseDate) {
      this.selectedCourseDateId = matchingCourseDate.id;
      this.date = matchingCourseDate;
    } else {
      // For private courses, create a virtual course date entry
      this.selectedCourseDateId = null;
      this.date = {
        date: dateStr,
        hour_start: this.defaults.course.hour_start || '09:00:00',
        hour_end: this.defaults.course.hour_end || '17:00:00'
      };
    }
  }

  calculateAvailableHours(selectedCourseDateItem: any, time: any) {
    const todayHour = moment(moment(), 'HH:mm:ss');
    const start = moment(selectedCourseDateItem.hour_start, 'HH:mm:ss');
    const end = moment(selectedCourseDateItem.hour_end, 'HH:mm:ss');
    const hour = moment(time, 'HH:mm');
    return hour.isSameOrBefore(start) && hour.isSameOrAfter(end);
  }

  isValidTime(time: string): boolean {
    const start = moment(this.date?.hour_start || this.defaults.course.course_dates[0].hour_start, 'HH:mm:ss');
    const end = moment(this.date?.hour_end || this.defaults.course.course_dates[0].hour_end, 'HH:mm:ss');
    const selected = moment(time, 'HH:mm');
    return selected.isSameOrAfter(start) && selected.isSameOrBefore(end);
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

  isAfter(date: any) {
    return moment(date.date).isAfter(moment());
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

  closeModal() {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: {
        title: this.translateService.instant('update_booking_title'),
        message: this.translateService.instant('update_booking_message')
      }
    });
    dialogRef.afterClosed().subscribe((data: any) => {
      const updateBookingUserRQS = [];
      if (data) {
        const checkAval = {bookingUsers: [], bookingUserIds: this.defaults.all_clients.map(d => d.id)};
        const selectedDateStr = this.selectedDate ? moment(this.selectedDate).format('YYYY-MM-DD') : this.date?.date;

        this.defaults.all_clients.forEach(element => {
          checkAval.bookingUsers.push({
            monitor_id: this.defaults.monitor_id,
            id: element.id,
            client_id: element.client_id,
            hour_start: this.hourStart.replace(': 00', '').replace(':00', ''),
            hour_end: this.calculateHourEnd(this.hourStart, this.duration),
            date: selectedDateStr,
            degree_id: this.defaults.degree_id
          });
        });

        this.crudService.post('/admin/bookings/checkbooking', checkAval)
          .subscribe((response) => {
            this.defaults.all_clients.forEach(element => {
              updateBookingUserRQS.push(this.crudService.update('/booking-users',
                {
                  hour_start: this.hourStart,
                  hour_end: this.calculateHourEnd(this.hourStart, this.duration) + ':00',
                  date: selectedDateStr,
                  course_date_id: this.selectedCourseDateId,
                  degree_id: this.defaults.degree_id
                }, element.id));
            });
            forkJoin(updateBookingUserRQS)
              .subscribe((updateBookingUsersResponse) => {
                const bookingLog = {
                  booking_id: this.defaults.booking_id,
                  action: 'update',
                  description: 'update booking',
                  user_id: this.user.id,
                  before_change: 'confirmed',
                  school_id: this.user.schools[0].id
                };

                this.crudService.post('/booking-logs', bookingLog).subscribe(() => {
                  this.dialogRef.close(true);
                });
              });
          }, (error) => {
            const overlapMessage = this.utilsService.formatBookingOverlapMessage(error?.error?.data);
            this.snackbar.open(overlapMessage, 'OK', {
              duration: 4000,
              panelClass: ['snackbar-multiline']
            });
          });
      }
    });
  }

  calculateDuration(hourStart: string, hourEnd: string): string {
    const start = moment(hourStart, 'HH:mm:ss');
    const end = moment(hourEnd, 'HH:mm:ss');
    const duration = moment.duration(end.diff(start));

    let durationStr = "";
    if (duration.hours() > 0) {
      durationStr += `${duration.hours()}h `;
    }
    if (duration.minutes() > 0 || duration.hours() > 0) {
      durationStr += `${duration.minutes()}m `;
    }
    if (duration.seconds() > 0 && duration.minutes() === 0 && duration.hours() === 0) {
      durationStr += `${duration.seconds()}s`;
    }

    durationStr = durationStr.trim();
    return durationStr;
  }

  setHourStart(event: any, time: any, item: any) {
    if (event.isUserInput) {
      item.hour_start = time;
      this.hourStart = time;
    }
  }

  setHourEnd(item: any) {
    let hour_end = this.calculateHourEnd(item.hour_start,
      this.calculateDuration(this.date.hour_start, this.date.hour_end));
    item.hour_start = hour_end;
  }

  getSelectedDateLabel(): string {
    if (!this.selectedDate) return '';
    return moment(this.selectedDate).format('DD/MM/YYYY');
  }
}
