import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { Observable, forkJoin, map, startWith } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';
import { ConfirmModalEditBookingComponent } from '../../bookings-create-update-edit/confirm-dialog-edit-booking/confirm-dialog-edit-booking.component';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmModalComponent } from 'src/app/pages/monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import { NoMonitorDateModalComponent } from 'src/app/pages/monitors/monitor-detail/no-monitor-date/no-monitor-date.component';

@Component({
  selector: 'vex-update-course',
  templateUrl: './update-course.component.html',
  styleUrls: ['./update-course.component.scss']
})
export class UpdateCourseModalComponent implements OnInit {

  selectedDates: any = [];
  selectedDate: any;
  selectedMonitorId: any;
  duration:any;
  dates: any = [];
  monitors = [];
  filteredMonitors: Observable<any[]>;
  clients: any = [];
  form: UntypedFormGroup;
  datesControl = new FormControl();
  hourStart = '';
  noAvailableMonitorDate = [];
  user: any;
  monitorsForm = new FormControl();
  selectedCourseDateId: any;

  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private crudService: ApiCrudService, private dialogRef: MatDialogRef<any>,
              private translateService: TranslateService, private dialog: MatDialog, private snackbar: MatSnackBar) {

  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.clients = this.defaults.clients;
    this.hourStart = this.defaults.dates[0].hour_start;
    this.selectedMonitorId = this.defaults.dates[0].monitor_id;
    this.duration = this.calculateDuration(this.hourStart, this.defaults.dates[0].hour_end)
    //this.hourStart = this.hourStart.replace(':00', '');
    const ids = [];
    this.selectedCourseDateId = this.defaults.dates[0].course_date_id
    this.selectedDate = this.defaults.dates[0];

    this.datesControl.patchValue(ids)

    this.selectedDates = this.defaults.course.course_dates;
    this.dates = [... this.defaults.dates];

/*    this.dates.forEach((item) => {
      const correspondingDate = this.selectedDates.find(date => date.id === item.course_date_id);
      if (correspondingDate) {
        item.selectedCourseDateId = correspondingDate.id; // Esto establece el valor por defecto en el mat-select
        item.duration = this.calculateDuration(item.hour_start, item.hour_end);
      }

      item.mainDuration = this.calculateDuration(item.hour_start, item.hour_end);
    });*/
  }

  transformTime(time: string): string {
    let duration = moment.duration(time);
    let hours = duration.hours();
    let minutes = duration.minutes();
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  }

  calculateAvailableHours(selectedCourseDateItem: any, time: any) {

    const todayHour = moment(moment(), 'HH:mm:ss');
    const start = moment(selectedCourseDateItem.hour_start, 'HH:mm:ss');
    const end = moment(selectedCourseDateItem.hour_end, 'HH:mm:ss');

    const hour = moment(time, 'HH:mm')

    return hour.isSameOrBefore(start) && hour.isSameOrAfter(end);
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

      result.push(`${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`);

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
    if(duration.includes('h') && (duration.includes('min') || duration.includes('m'))) {
      const hours = duration.split(' ')[0].replace('h', '');
      const minutes = duration.split(' ')[1].replace('min', '').replace('m', '');

      return moment(hour, 'HH:mm').add(hours, 'h').add(minutes, 'm').format('HH:mm');
    } else if(duration.includes('h')) {
      const hours = duration.split(' ')[0].replace('h', '');

      return moment(hour, 'HH:mm').add(hours, 'h').format('HH:mm');
    } else {
      const minutes = duration.split(' ')[0].replace('min', '').replace('m', '');

      return moment(hour, 'HH:mm').add(minutes, 'm').format('HH:mm');
    }
  }

  checkAvailableMonitors(start: any) {

    let data: any;
    let date = this.selectedDates.find((item)=> item.id === this.selectedCourseDateId);
    if(this.dates[0].course.is_flexible) {
      data = {
        sportId: this.defaults.course.sport_id,
        minimumDegreeId: this.dates[0].degree_id,
        startTime:  start.length  <=5 ? start : start.replace(':00', ''),
        endTime: this.calculateHourEnd(start, this.duration),
        date: moment(date.date).format('YYYY-MM-DD'),
        clientIds: [this.defaults.mainBooking.client_id],
        bookingUserIds: this.dates.map(d => d.id)
      };
    } else{
      data = {
        sportId: this.defaults.course.sport_id,
        minimumDegreeId: this.dates[0].degree_id,
        startTime: start.length  <=5 ? start : start.replace(':00', ''),
        endTime: this.calculateHourEnd(start, this.duration),
        date: moment(date.date).format('YYYY-MM-DD'),
        clientIds: [this.defaults.mainBooking.client_id],
        bookingUserIds: this.dates.map(d => d.id)
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

          this.snackbar.open(this.translateService.instant('snackbar.booking.no_match'), 'OK', {duration:3000});
        }
      })
  }

  displayFnMoniteurs(monitor: any): string {
    return monitor && monitor.first_name && monitor.last_name ? monitor.first_name + ' ' + monitor.last_name : '';
  }


  private _filterMonitor(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.monitors.filter(monitor => monitor.full_name.toLowerCase().includes(filterValue));
  }

  closeModal() {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: {title: this.translateService.instant('update_booking_title'), message: this.translateService.instant('update_booking_message')}
    });
    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {
        if (this.defaults.course.course_type === 2) {
          const checkAval = {bookingUsers: [], bookingUserIds: this.dates.map(d => d.id)};
          let date = this.selectedDates.find((item)=> item.id === this.selectedCourseDateId);
          this.defaults.dates.forEach(element => {
            checkAval.bookingUsers.push({
              client_id: element.client_id,
              hour_start: this.hourStart.replace(': 00', ''),
              hour_end: this.calculateHourEnd(this.hourStart, this.duration),
              date: moment(date.date).format('YYYY-MM-DD')
            })
          });
          this.crudService.post('/admin/bookings/checkbooking', checkAval)
            .subscribe((response) => {
              this.dates.forEach(element => {
                updateBookingUserRQS.push(this.crudService.update('/booking-users',
                  {monitor_id: this.selectedMonitorId,
                    hour_start: this.hourStart,
                    hour_end: this.calculateHourEnd(this.hourStart, this.duration) + ':00',
                    date: moment(date.date).format('YYYY-MM-DD')
                  }, element.id))
              });
              forkJoin(updateBookingUserRQS)
                .subscribe((updateBookingUsersResponse) => {
                  const bookingLog = {
                    booking_id: this.defaults.mainBooking.booking_id,
                    action: 'update',
                    description: 'update booking',
                    user_id: this.user.id,
                    before_change: 'confirmed',
                    school_id: this.user.schools[0].id
                  }

                  this.crudService.post('/booking-logs', bookingLog).subscribe(() => {
                    this.dialogRef.close(true)
                  });
                });

            }, (error) => {
              this.snackbar.open(this.translateService.instant('snackbar.booking.overlap') +
                moment(error.error.data[0].date).format('YYYY-MM-DD') + ' | '
                + error.error.data[0].hour_start + ' - ' + error.error.data[0].hour_end, 'OK',
                {duration: 3000})
            });
          const updateBookingUserRQS = [];

        }
      }
    })
  }

  closeModalOld() {

    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: {title: this.translateService.instant('update_booking_title'), message: this.translateService.instant('update_booking_message')}
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {
        this.noAvailableMonitorDate = [];
        const dataBook = [];
        const deleteMonitorRQS = [];

        if (this.defaults.course.course_type === 2 && this.defaults.course.is_flexible) {
          this.dates.forEach(element => {
            deleteMonitorRQS.push(this.crudService.update('/booking-users', {monitor_id: null}, element.id));
          });

          forkJoin(deleteMonitorRQS)
            .subscribe((deleteMonitorsResponse) => {

              const monitorAvailableRQS = [];

              /*this.dates.forEach(element => {
                const date = this.defaults.course.course_dates.filter((d) => d.id === element.selectedCourseDateId);
                const degreeId = element.degree_id;
                const hourS = moment(element.hour_start, 'HH:mm:ss').format('HH:mm');
                monitorAvailableRQS.push(this.checkAvailableMonitors(hourS, this.calculateDuration(element.hour_start, this.calculateHourEnd(element.hour_start, element.mainDuration)),
                  moment(date[0].date).format('YYYY-MM-DD'), degreeId ? degreeId : this.defaults.dates[0].degree_id));
              });*/

              forkJoin(monitorAvailableRQS)
                .subscribe((monitorsResponse) => {

                  this.dates.forEach((element, idx) => {

                    if (data.length > 0) {
                      if (element[0].monitor_id !== null) {
                        const monitor = monitorsResponse[idx].data.find((m) => m.id === element[0].monitor_id);

                        if (!monitor) {
                          this.noAvailableMonitorDate.push(element[0]);
                        }
                      }
                    } else {
                      if (this.defaults.dates[0].monitor_id !== null) {
                        const monitor = monitorsResponse[idx].data.find((m) => m.id === this.defaults.dates[0].monitor_id);

                        if (!monitor) {
                          this.noAvailableMonitorDate.push(element[0]);
                        }
                      }

                    }

                  });

                  if (this.noAvailableMonitorDate.length > 0) {

                    const noDispoRef = this.dialog.open(NoMonitorDateModalComponent, {
                      data: {title: this.translateService.instant('monitor_no_available'), message: this.translateService.instant('monitor_no_available_text'),
                        message2: this.translateService.instant('monitor_no_available_text2'), dates: this.noAvailableMonitorDate}
                    });

                    noDispoRef.afterClosed().subscribe((data: any) => {
                      if (data) {
                        let basePrice = 0;

                        this.dates.forEach(element => {
                          // bucle a los monitores y comprobar que ese monitor esta libre
                          const date = this.defaults.course.course_dates.filter((d) => d.id === element.selectedCourseDateId);
                          const dateDegreeId = element.degree_id;
                          let dateMonitorId = element;
                          basePrice = basePrice + parseFloat(element.price);
                          if (this.noAvailableMonitorDate.find((n) => n.monitor_id === dateMonitorId.monitor_id)) {
                            dateMonitorId = null;
                          }
                          dataBook.push({
                            school_id: this.defaults.mainBooking.school_id,
                            booking_id: this.defaults.mainBooking.booking_id,
                            client_id: this.defaults.mainBooking.client_id,
                            course_id: this.defaults.mainBooking.course_id,
                            course_date_id: element.selectedCourseDateId,
                            course_subgroup_id: this.defaults.mainBooking.course_subgroup_id,
                            course_group_id: this.defaults.mainBooking.course_group_id,
                            degree_id: dateDegreeId ? dateDegreeId : this.defaults.dates[0].degree_id,
                            monitor_id: dateMonitorId ? dateMonitorId.monitor_id : null,
                            hour_start: element.hour_start,
                            hour_end: this.calculateHourEnd(element.hour_start, element.mainDuration),
                            currency: this.defaults.mainBooking.currency,
                            notes: this.defaults.mainBooking.notes,
                            school_notes: this.defaults.mainBooking.school_notes,
                            date: moment(date[0].date).format('YYYY-MM-DD'),
                            attended: this.defaults.mainBooking.attended
                          });
                        });

                        let discountReduction = 0;
                        const discounts = typeof this.defaults.course.discounts === 'string' ? JSON.parse(this.defaults.course.discounts) : this.defaults.course.discounts;
                        //ret = ret + (b?.courseDates[0].price * b.courseDates.length);
                        if (discounts !== null) {
                          discounts.forEach(element => {
                            if (element.date === this.dates.length) {
                              discountReduction = -(this.defaults.course.price * this.datesControl.value.length * (element.percentage / 100));
                            }
                          });
                        }


                        let price = basePrice + discountReduction;
                        let boukiiCarePrice = 0;
                        let canInsurance = 0;
                        let tva = 0;

                        if (this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0) {
                          price = price + (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                          boukiiCarePrice = (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                        }

                        if (this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0) {
                          price = price + (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                          canInsurance = (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                        }

                        if (this.defaults.tva && this.defaults.tva > 0) {
                          price = price + (price * this.defaults.tva);
                          tva = (price * this.defaults.tva);
                        }

                        const bookingData = {
                          has_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0,
                          has_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0,
                          price_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0 ? boukiiCarePrice : 0,
                          price_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0 ? canInsurance : 0,
                          price_total: price
                        };

                        this.crudService.update('/bookings', bookingData, this.defaults.mainBooking.booking_id)
                          .subscribe(() => {

                            const bookingLog = {
                              booking_id: this.defaults.mainBooking.booking_id,
                              action: 'update',
                              description: 'update booking',
                              user_id: this.user.id,
                              before_change: 'confirmed',
                              school_id: this.user.schools[0].id
                            }

                            this.crudService.post('/booking-logs', bookingLog).subscribe(() => {});})



                        const rqs = [];
                        this.defaults.dates.forEach(element => {
                          rqs.push(this.crudService.delete('/booking-users', element.id));

                        });

                        forkJoin(rqs)
                          .subscribe(() => {
                            this.defaults.clientIds.forEach(client => {
                              dataBook.forEach(bu => {
                                const basePrice = this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : parseFloat(this.defaults.course.price);
                                bu.client_id = parseInt(client);
                                bu.price = parseInt(client) == this.defaults.mainBooking.client_id ? basePrice : 0;
                                this.crudService.create('/booking-users', bu)
                                  .subscribe((bookingUser) => {

                                    if (this.defaults.courseExtra.length > 0) {
                                      const bookingUserExtra = {
                                        booking_user_id: bookingUser.data.id,
                                        course_extra_id: null,
                                      };

                                      const courseExtra = {
                                        course_id: this.defaults.course.id,
                                        name: this.defaults.courseExtra[0].name,
                                        description: this.defaults.courseExtra[0].description,
                                        price: this.defaults.courseExtra[0].price
                                      };

                                      this.crudService.create('/course-extras', courseExtra)
                                        .subscribe((responseCourseExtra) => {

                                          bookingUserExtra.course_extra_id = responseCourseExtra.data.id;
                                          this.crudService.create('/booking-user-extras', bookingUserExtra)
                                            .subscribe((bookExtra) => {

                                            })

                                        })
                                    }

                                  })
                              });
                            });
                          })



                        setTimeout(() => {
                          this.dialogRef.close(true)
                        }, 1000);
                      } else {

                        this.dates.forEach(element => {
                          this.crudService.update('/booking-users', {monitor_id: element.monitor_id}, element.id)
                            .subscribe(() => {

                            })

                        });
                        this.noAvailableMonitorDate = [];
                      }
                    });
                  } else {
                    let basePrice = 0;

                    this.dates.forEach(element => {
                      // bucle a los monitores y comprobar que ese monitor esta libre
                      const date = this.defaults.course.course_dates.filter((d) => d.id === element.selectedCourseDateId);
                      const dateDegreeId = element.degree_id;
                      let dateMonitorId = element;
                      basePrice = basePrice + parseFloat(element.price);
                      dataBook.push({
                        school_id: this.defaults.mainBooking.school_id,
                        booking_id: this.defaults.mainBooking.booking_id,
                        client_id: this.defaults.mainBooking.client_id,
                        course_id: this.defaults.mainBooking.course_id,
                        course_date_id: element.selectedCourseDateId,
                        course_subgroup_id: this.defaults.mainBooking.course_subgroup_id,
                        course_group_id: this.defaults.mainBooking.course_group_id,
                        degree_id: dateDegreeId ? dateDegreeId : this.defaults.dates[0].degree_id,
                        monitor_id: dateMonitorId ? dateMonitorId.monitor_id : null,
                        hour_start: element.hour_start,
                        hour_end: this.calculateHourEnd(element.hour_start, element.mainDuration),
                        currency: this.defaults.mainBooking.currency,
                        notes: this.defaults.mainBooking.notes,
                        school_notes: this.defaults.mainBooking.school_notes,
                        date: moment(date[0].date).format('YYYY-MM-DD'),
                        attended: this.defaults.mainBooking.attended
                      });
                    });

                    let discountReduction = 0;
                    const discounts = typeof this.defaults.course.discounts === 'string' ? JSON.parse(this.defaults.course.discounts) : this.defaults.course.discounts;
                    //ret = ret + (b?.courseDates[0].price * b.courseDates.length);
                    if (discounts !== null) {
                      discounts.forEach(element => {
                        if (element.date === this.dates.length) {
                          discountReduction = -(this.defaults.course.price * this.datesControl.value.length * (element.percentage / 100));
                        }
                      });
                    }


                    let price = basePrice + discountReduction;
                    let boukiiCarePrice = 0;
                    let canInsurance = 0;
                    let tva = 0;

                    if (this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0) {
                      price = price + (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                      boukiiCarePrice = (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                    }

                    if (this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0) {
                      price = price + (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                      canInsurance = (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                    }

                    if (this.defaults.tva && this.defaults.tva > 0) {
                      price = price + (price * this.defaults.tva);
                      tva = (price * this.defaults.tva);
                    }

                    const bookingData = {
                      has_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0,
                      has_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0,
                      price_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0 ? boukiiCarePrice : 0,
                      price_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0 ? canInsurance : 0,
                      price_total: price
                    };

                    this.crudService.update('/bookings', bookingData, this.defaults.mainBooking.booking_id)
                      .subscribe(() => {

                        const bookingLog = {
                          booking_id: this.defaults.mainBooking.booking_id,
                          action: 'update',
                          description: 'update booking',
                          user_id: this.user.id,
                          before_change: 'confirmed',
                          school_id: this.user.schools[0].id
                        }

                        this.crudService.post('/booking-logs', bookingLog).subscribe(() => {});
                      })

                    const rqs = [];
                    this.defaults.dates.forEach(element => {
                      rqs.push(this.crudService.delete('/booking-users', element.id));

                    });

                    forkJoin(rqs)
                      .subscribe(() => {
                        this.defaults.clientIds.forEach(client => {
                          dataBook.forEach(bu => {
                            const basePrice = this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : parseFloat(this.defaults.course.price);
                            bu.client_id = parseInt(client);
                            bu.price = parseInt(client) == this.defaults.mainBooking.client_id ? basePrice : 0;
                            this.crudService.create('/booking-users', bu)
                              .subscribe((bookingUser) => {

                                if (this.defaults.courseExtra.length > 0) {
                                  const bookingUserExtra = {
                                    booking_user_id: bookingUser.data.id,
                                    course_extra_id: null,
                                  };

                                  const courseExtra = {
                                    course_id: this.defaults.course.id,
                                    name: this.defaults.courseExtra[0].name,
                                    description: this.defaults.courseExtra[0].description,
                                    price: this.defaults.courseExtra[0].price
                                  };

                                  this.crudService.create('/course-extras', courseExtra)
                                    .subscribe((responseCourseExtra) => {

                                      bookingUserExtra.course_extra_id = responseCourseExtra.data.id;
                                      this.crudService.create('/booking-user-extras', bookingUserExtra)
                                        .subscribe((bookExtra) => {

                                        })

                                    })
                                }

                              })
                          });
                        });
                      })



                    setTimeout(() => {
                      this.dialogRef.close(true)
                    }, 1000);
                  }

                  /*this.dialogRef.close({})*/
                })

            });


        }
        else if (this.defaults.course.course_type === 2 && !this.defaults.course.is_flexible) {

          this.dates.forEach(element => {
            deleteMonitorRQS.push(this.crudService.update('/booking-users', {monitor_id: null}, element.id));
          });


          forkJoin(deleteMonitorRQS)
            .subscribe((deleteMonitorsResponse) => {

              const monitorAvailableRQS = [];

              this.datesControl.value.forEach(element => {
                const date = this.defaults.course.course_dates.filter((d) => d.id === element);
                const degreeId = this.defaults.dates.find((d) => d.course_date_id === element)?.degree_id;
               // monitorAvailableRQS.push(this.checkAvailableMonitors(this.hourStart, this.defaults.course.duration));

              });
              forkJoin(monitorAvailableRQS)
                .subscribe((monitorsResponse) => {

                  this.datesControl.value.forEach((element, idx) => {
                    const date = this.defaults.dates.filter((d) => d.course_date_id === element);

                    if (data.length > 0) {
                      if (date[0].monitor_id !== null) {
                        const monitor = monitorsResponse[idx].data.find((m) => m.id === date[0].monitor_id);

                        if (!monitor) {
                          this.noAvailableMonitorDate.push(date[0]);
                        }
                      }
                    } else {
                      if (this.defaults.dates[0].monitor_id !== null) {
                        const monitor = monitorsResponse[idx].data.find((m) => m.id === this.defaults.dates[0].monitor_id);

                        if (!monitor) {
                          this.noAvailableMonitorDate.push(date[0]);
                        }
                      }

                    }

                  });

                  if (this.noAvailableMonitorDate.length > 0) {

                    const noDispoRef = this.dialog.open(NoMonitorDateModalComponent, {
                      data: {title: this.translateService.instant('monitor_no_available'), message: this.translateService.instant('monitor_no_available_text'),
                        message2: this.translateService.instant('monitor_no_available_text2'), dates: this.noAvailableMonitorDate}
                    });

                    noDispoRef.afterClosed().subscribe((data: any) => {
                      if (data) {
                        this.datesControl.value.forEach(element => {
                          // bucle a los monitores y comprobar que ese monitor esta libre
                          const date = this.defaults.course.course_dates.filter((d) => d.id === element);
                          const dateDegreeId = this.defaults.dates.find((d) => d.course_date_id === element)?.degree_id;
                          let dateMonitorId = this.defaults.dates.find((d) => d.course_date_id === element);

                          if (this.noAvailableMonitorDate.find((n) => n.monitor_id === dateMonitorId.monitor_id)) {
                            dateMonitorId = null;
                          }
                          dataBook.push({
                            school_id: this.defaults.mainBooking.school_id,
                            booking_id: this.defaults.mainBooking.booking_id,
                            client_id: this.defaults.mainBooking.client_id,
                            course_id: this.defaults.mainBooking.course_id,
                            course_date_id: element,
                            course_subgroup_id: this.defaults.mainBooking.course_subgroup_id,
                            course_group_id: this.defaults.mainBooking.course_group_id,
                            degree_id: dateDegreeId ? dateDegreeId : this.defaults.dates[0].degree_id,
                            monitor_id: dateMonitorId ? dateMonitorId : null,
                            hour_start: this.defaults.course.course_type === 2 ? this.hourStart : this.defaults.mainBooking.hour_start,
                            hour_end: this.defaults.course.course_type === 2 ? this.calculateHourEnd(this.hourStart, this.defaults.course.duration) : this.defaults.mainBooking.hour_end,
                            currency: this.defaults.mainBooking.currency,
                            notes: this.defaults.mainBooking.notes,
                            school_notes: this.defaults.mainBooking.school_notes,
                            date: moment(date[0].date).format('YYYY-MM-DD'),
                            attended: this.defaults.mainBooking.attended
                          });
                        });

                        let discountReduction = 0;
                        const discounts = typeof this.defaults.course.discounts === 'string' ? JSON.parse(this.defaults.course.discounts) : this.defaults.course.discounts;
                        //ret = ret + (b?.courseDates[0].price * b.courseDates.length);
                        if (discounts !== null) {
                          discounts.forEach(element => {
                            if (element.date === this.datesControl.value.length) {
                              discountReduction = -(this.defaults.course.price * this.datesControl.value.length * (element.percentage / 100));
                            }
                          });
                        }


                        const basePrice = parseFloat(this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : (this.defaults.course.price * this.datesControl.value.length));
                        let price = basePrice + discountReduction;
                        let boukiiCarePrice = 0;
                        let canInsurance = 0;
                        let tva = 0;

                        if (this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0) {
                          price = price + (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                          boukiiCarePrice = (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                        }

                        if (this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0) {
                          price = price + (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                          canInsurance = (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                        }

                        if (this.defaults.tva && this.defaults.tva > 0) {
                          price = price + (price * this.defaults.tva);
                          tva = (price * this.defaults.tva);
                        }

                        const bookingData = {
                          has_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0,
                          has_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0,
                          price_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0 ? boukiiCarePrice : 0,
                          price_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0 ? canInsurance : 0,
                          price_total: price
                        };

                        this.crudService.update('/bookings', bookingData, this.defaults.mainBooking.booking_id)
                          .subscribe(() => {

                            const bookingLog = {
                              booking_id: this.defaults.mainBooking.booking_id,
                              action: 'update',
                              description: 'update booking',
                              user_id: this.user.id,
                              before_change: 'confirmed',
                              school_id: this.user.schools[0].id
                            }

                            this.crudService.post('/booking-logs', bookingLog).subscribe(() => {});})



                        const rqs = [];
                        this.defaults.dates.forEach(element => {
                          rqs.push(this.crudService.delete('/booking-users', element.id));

                        });

                        forkJoin(rqs)
                          .subscribe(() => {
                            this.defaults.clientIds.forEach(client => {
                              dataBook.forEach(bu => {
                                const basePrice = this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : parseFloat(this.defaults.course.price);
                                bu.client_id = parseInt(client);
                                bu.price = parseInt(client) == this.defaults.mainBooking.client_id ? basePrice : 0;
                                this.crudService.create('/booking-users', bu)
                                  .subscribe((bookingUser) => {

                                    if (this.defaults.courseExtra.length > 0) {
                                      const bookingUserExtra = {
                                        booking_user_id: bookingUser.data.id,
                                        course_extra_id: null,
                                      };

                                      const courseExtra = {
                                        course_id: this.defaults.course.id,
                                        name: this.defaults.courseExtra[0].name,
                                        description: this.defaults.courseExtra[0].description,
                                        price: this.defaults.courseExtra[0].price
                                      };

                                      this.crudService.create('/course-extras', courseExtra)
                                        .subscribe((responseCourseExtra) => {

                                          bookingUserExtra.course_extra_id = responseCourseExtra.data.id;
                                          this.crudService.create('/booking-user-extras', bookingUserExtra)
                                            .subscribe((bookExtra) => {

                                            })

                                        })
                                    }

                                  })
                              });
                            });
                          })



                        setTimeout(() => {
                          this.dialogRef.close(true)
                        }, 1000);
                      } else {

                        this.dates.forEach(element => {
                          this.crudService.update('/booking-users', {monitor_id: element.monitor_id}, element.id)
                            .subscribe(() => {

                            })

                        });
                        this.noAvailableMonitorDate = [];
                      }
                    });
                  } else {
                    this.datesControl.value.forEach(element => {
                      // bucle a los monitores y comprobar que ese monitor esta libre
                      const date = this.defaults.course.course_dates.filter((d) => d.id === element);
                      const dateDegreeId = this.defaults.dates.find((d) => d.course_date_id === element)?.degree_id;
                      const dateMonitorId = this.defaults.dates.find((d) => d.course_date_id === element)?.monitor_id;
                      dataBook.push({
                        school_id: this.defaults.mainBooking.school_id,
                        booking_id: this.defaults.mainBooking.booking_id,
                        client_id: this.defaults.mainBooking.client_id,
                        course_id: this.defaults.mainBooking.course_id,
                        course_date_id: element,
                        course_subgroup_id: this.defaults.mainBooking.course_subgroup_id,
                        course_group_id: this.defaults.mainBooking.course_group_id,
                        degree_id: dateDegreeId ? dateDegreeId : this.defaults.dates[0].degree_id,
                        monitor_id: dateMonitorId ? dateMonitorId : null,
                        hour_start: this.defaults.course.course_type === 2 ? this.hourStart : this.defaults.mainBooking.hour_start,
                        hour_end: this.defaults.course.course_type === 2 ? this.calculateHourEnd(this.hourStart, this.defaults.course.duration) : this.defaults.mainBooking.hour_end,
                        currency: this.defaults.mainBooking.currency,
                        notes: this.defaults.mainBooking.notes,
                        school_notes: this.defaults.mainBooking.school_notes,
                        date: moment(date[0].date).format('YYYY-MM-DD'),
                        attended: this.defaults.mainBooking.attended
                      });
                    });

                    let discountReduction = 0;
                    const discounts = typeof this.defaults.course.discounts === 'string' ? JSON.parse(this.defaults.course.discounts) : this.defaults.course.discounts;
                    //ret = ret + (b?.courseDates[0].price * b.courseDates.length);
                    if (discounts !== null) {
                      discounts.forEach(element => {
                        if (element.date === this.datesControl.value.length) {
                          discountReduction = -(this.defaults.course.price * this.datesControl.value.length * (element.percentage / 100));
                        }
                      });
                    }


                    const basePrice = parseFloat(this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : (this.defaults.course.price * this.datesControl.value.length));
                    let price = basePrice + discountReduction;
                    let boukiiCarePrice = 0;
                    let canInsurance = 0;
                    let tva = 0;

                    if (this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0) {
                      price = price + (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                      boukiiCarePrice = (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
                    }

                    if (this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0) {
                      price = price + (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                      canInsurance = (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
                    }

                    if (this.defaults.tva && this.defaults.tva > 0) {
                      price = price + (price * this.defaults.tva);
                      tva = (price * this.defaults.tva);
                    }

                    const bookingData = {
                      has_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0,
                      has_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0,
                      price_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0 ? boukiiCarePrice : 0,
                      price_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0 ? canInsurance : 0,
                      price_total: price
                    };

                    this.crudService.update('/bookings', bookingData, this.defaults.mainBooking.booking_id)
                      .subscribe(() => {

                        const bookingLog = {
                          booking_id: this.defaults.mainBooking.booking_id,
                          action: 'update',
                          description: 'update booking',
                          user_id: this.user.id,
                          before_change: 'confirmed',
                          school_id: this.user.schools[0].id
                        }

                        this.crudService.post('/booking-logs', bookingLog).subscribe(() => {});
                      })

                    const rqs = [];
                    this.defaults.dates.forEach(element => {
                      rqs.push(this.crudService.delete('/booking-users', element.id));

                    });

                    forkJoin(rqs)
                      .subscribe(() => {
                        this.defaults.clientIds.forEach(client => {
                          dataBook.forEach(bu => {
                            const basePrice = this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : parseFloat(this.defaults.course.price);
                            bu.client_id = parseInt(client);
                            bu.price = parseInt(client) == this.defaults.mainBooking.client_id ? basePrice : 0;
                            this.crudService.create('/booking-users', bu)
                              .subscribe((bookingUser) => {

                                if (this.defaults.courseExtra.length > 0) {
                                  const bookingUserExtra = {
                                    booking_user_id: bookingUser.data.id,
                                    course_extra_id: null,
                                  };

                                  const courseExtra = {
                                    course_id: this.defaults.course.id,
                                    name: this.defaults.courseExtra[0].name,
                                    description: this.defaults.courseExtra[0].description,
                                    price: this.defaults.courseExtra[0].price
                                  };

                                  this.crudService.create('/course-extras', courseExtra)
                                    .subscribe((responseCourseExtra) => {

                                      bookingUserExtra.course_extra_id = responseCourseExtra.data.id;
                                      this.crudService.create('/booking-user-extras', bookingUserExtra)
                                        .subscribe((bookExtra) => {

                                        })

                                    })
                                }

                              })
                          });
                        });
                      })



                    setTimeout(() => {
                      this.dialogRef.close(true)
                    }, 1000);
                  }

                  /*this.dialogRef.close({})*/
                })

            });

        }
        else {
          this.datesControl.value.forEach(element => {
            // bucle a los monitores y comprobar que ese monitor esta libre
            const date = this.defaults.course.course_dates.filter((d) => d.id === element);
            const dateDegreeId = this.defaults.dates.find((d) => d.course_date_id === element)?.degree_id;
            const dateMonitorId = this.defaults.dates.find((d) => d.course_date_id === element)?.monitor_id;
            dataBook.push({
              school_id: this.defaults.mainBooking.school_id,
              booking_id: this.defaults.mainBooking.booking_id,
              client_id: this.defaults.mainBooking.client_id,
              course_id: this.defaults.mainBooking.course_id,
              course_date_id: element,
              course_subgroup_id: this.defaults.mainBooking.course_subgroup_id,
              course_group_id: this.defaults.mainBooking.course_group_id,
              degree_id: dateDegreeId ? dateDegreeId : null,
              monitor_id: dateMonitorId ? dateMonitorId : null,
              hour_start: this.defaults.course.course_type === 2 ? this.hourStart : this.defaults.mainBooking.hour_start,
              hour_end: this.defaults.course.course_type === 2 ? this.calculateHourEnd(this.hourStart, this.defaults.course.duration) : this.defaults.mainBooking.hour_end,
              currency: this.defaults.mainBooking.currency,
              notes: this.defaults.mainBooking.notes,
              school_notes: this.defaults.mainBooking.school_notes,
              date: moment(date[0].date).format('YYYY-MM-DD'),
              attended: this.defaults.mainBooking.attended
            });
          });

          let discountReduction = 0;
          const discounts = typeof this.defaults.course.discounts === 'string' ? JSON.parse(this.defaults.course.discounts) : this.defaults.course.discounts;
          //ret = ret + (b?.courseDates[0].price * b.courseDates.length);
          if (discounts !== null) {
            discounts.forEach(element => {
              if (element.date === this.datesControl.value.length) {
                discountReduction = -(this.defaults.course.price * this.datesControl.value.length * (element.percentage / 100));
              }
            });
          }


          const basePrice = this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : (this.defaults.course.price * this.datesControl.value.length);
          let price = basePrice + discountReduction;
          let boukiiCarePrice = 0;
          let canInsurance = 0;
          let tva = 0;

          if (this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0) {
            price = price + (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
            boukiiCarePrice = (this.defaults.boukiiCarePrice * this.defaults.clientIds.length * this.datesControl.value.length);
          }

          if (this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0) {
            price = price + (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
            canInsurance = (this.defaults.cancellationInsurance * (basePrice + (discountReduction)))
          }

          if (this.defaults.tva && this.defaults.tva > 0) {
            price = price + (price * this.defaults.tva);
            tva = (price * this.defaults.tva);
          }

          const bookingData = {
            has_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0,
            has_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0,
            price_boukii_care: this.defaults.boukiiCarePrice && this.defaults.boukiiCarePrice > 0 ? boukiiCarePrice : 0,
            price_cancellation_insurance: this.defaults.cancellationInsurance && this.defaults.cancellationInsurance > 0 ? canInsurance : 0,
            price_total: price
          };

          this.crudService.update('/bookings', bookingData, this.defaults.mainBooking.booking_id)
            .subscribe(() => {
              const bookingLog = {
                booking_id: this.defaults.mainBooking.booking_id,
                action: 'update',
                description: 'update booking',
                user_id: this.user.id,
                before_change: 'confirmed',
                school_id: this.user.schools[0].id
              }

              this.crudService.post('/booking-logs', bookingLog).subscribe(() => {});
            })

          const rqs = [];
          this.defaults.dates.forEach(element => {
            rqs.push(this.crudService.delete('/booking-users', element.id));

          });

          forkJoin(rqs)
            .subscribe(() => {
              this.defaults.clientIds.forEach(client => {
                dataBook.forEach(bu => {
                  const basePrice = this.defaults.course.course_type === 2 ? this.defaults.mainBooking.price : parseFloat(this.defaults.course.price);
                  bu.client_id = parseInt(client);
                  bu.price = parseInt(client) == this.defaults.mainBooking.client_id ? basePrice : 0;
                  this.crudService.create('/booking-users', bu)
                    .subscribe((bookingUser) => {

                      if (this.defaults.courseExtra.length > 0) {
                        const bookingUserExtra = {
                          booking_user_id: bookingUser.data.id,
                          course_extra_id: null,
                        };

                        const courseExtra = {
                          course_id: this.defaults.course.id,
                          name: this.defaults.courseExtra[0].name,
                          description: this.defaults.courseExtra[0].description,
                          price: this.defaults.courseExtra[0].price
                        };

                        this.crudService.create('/course-extras', courseExtra)
                          .subscribe((responseCourseExtra) => {

                            bookingUserExtra.course_extra_id = responseCourseExtra.data.id;
                            this.crudService.create('/booking-user-extras', bookingUserExtra)
                              .subscribe((bookExtra) => {

                              })

                          })
                      }

                    })
                });
              });
            })



          setTimeout(() => {
            this.dialogRef.close(true)
          }, 1000);
        }
      }
    });
  }



  getDateValue(id) {
    const ret = this.selectedDates.find((d) => d.id === id);
    return ret;
  }

  calculateDuration(hourStart: string, hourEnd: string): string {
    const start = moment(hourStart, 'HH:mm:ss');
    const end = moment(hourEnd, 'HH:mm:ss');
    const duration = moment.duration(end.diff(start));

    // Construir la cadena de duración
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

    // Eliminar el espacio extra al final si existe
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
      this.calculateDuration(this.dates[0].hour_start, this.dates[0].hour_end));
    item.hour_start = hour_end;
  }

  getClient(id: number) {
    if (id && id !== null) {

      const client = this.clients.find((m) => m.id === id);

      return client;
    }
  }
}
