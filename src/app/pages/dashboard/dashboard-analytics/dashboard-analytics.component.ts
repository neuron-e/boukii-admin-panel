import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { defaultChartOptions } from 'src/@vex/utils/default-chart-options';
import { Order, tableSalesData } from 'src/app/static-data/table-sales-data';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-dashboard-analytics',
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss']
})
export class DashboardAnalyticsComponent implements OnInit {

  tableColumns: TableColumn<any>[] = [
    {
      label: 'ID',
      property: 'id',
      type: 'text'
    },

    {
      label: this.TranslateService.instant('type'),
      property: 'type',
      type: 'booking_users_image'
    },
    { label: this.TranslateService.instant('course'), property: 'booking_users', type: 'booking_users' },
    { label: this.TranslateService.instant('client'), property: 'client_main', type: 'client' },

  ];

  userSessionsSeries: ApexAxisChartSeries = [
    {
      name: this.TranslateService.instant('users'),
      data: [10, 50, 26, 50, 38, 60, 50, 25, 61, 80, 40, 60]
    },
    {
      name: this.TranslateService.instant('Sessions'),
      data: [5, 21, 42, 70, 41, 20, 35, 50, 10, 15, 30, 50]
    }
  ];

  salesSeries: ApexAxisChartSeries = [
    {
      name: this.TranslateService.instant('Sales'),
      data: [28, 40, 36, 0, 52, 38, 60, 55, 99, 54, 38, 87]
    }
  ];

  pageViewsSeries: ApexAxisChartSeries = [
    {
      name: this.TranslateService.instant('Page Views'),
      data: [405, 800, 200, 600, 105, 788, 600, 204]
    }
  ];

  uniqueUsersSeries: ApexAxisChartSeries = [
    {
      name: this.TranslateService.instant('Unique Users'),
      data: [356, 806, 600, 754, 432, 854, 555, 1004]
    }
  ];

  uniqueUsersOptions = defaultChartOptions({
    chart: {
      type: 'area',
      height: 100
    },
    colors: ['#ff9800']
  });

  user: any;
  blockages = [];
  meteo = [];
  dispoPrivate = 0;
  dispoCol = 0;
  bookings = 0;
  bookingList = [];

  date = moment();
  constructor(private crudService: ApiCrudService, private TranslateService: TranslateService) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
  }

  ngOnInit(): void {
    this.getData();
  }

  getData() {
    this.getBlockages();
    this.getCourses();
    this.getBookings();
  }

  emitDate(event: any) {
    this.date = moment(event);
    this.getData();
  }

  getBlockages() {
    this.crudService.list('/school-colors', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .subscribe((data) => {
        this.blockages = data.data.length;
      })
  }

  getCourses() {
    this.crudService.list(
      '/admin/courses',
      1,
      10000,
      'desc',
      'id',
      '&school_id=' + this.user.schools[0].id + '&date_start=' + this.date.format('YYYY-MM-DD') + '&course_type=1',
      '',
      null,
      '',
      ['sport', 'courseDates.courseSubgroups']
    )
      .subscribe((data) => {
        this.dispoCol = data.data.reduce((accumulator, currentObject) => {
          return accumulator + currentObject.total_available_places;
        }, 0);

      })
    this.crudService.list(
      '/admin/courses',
      1,
      10000,
      'desc',
      'id',
      '&school_id=' + this.user.schools[0].id + '&date_start=' + this.date.format('YYYY-MM-DD') + '&course_type=2',
      '',
      null,
      '',
      ['sport', 'courseDates.courseSubgroups']
    )
      .subscribe((data) => {
        this.dispoPrivate = data.data.reduce((accumulator, currentObject) => {
          return accumulator + currentObject.total_available_places;
        }, 0);

      })
  }

  getBookings() {
    this.bookingList = [];
    this.crudService.list('/booking-users', 1, 10000, 'desc', 'id',
      '&school_id=' + this.user.schools[0].id + '&date=' + this.date.format('YYYY-MM-DD'), '', null, null, ['client'])
      .subscribe((data) => {
        this.bookings = data.data.length;

        let bookingIds = new Set();
        data.data.forEach(item => {
          if (item.booking_id !== undefined && item.booking_id !== null) {
            bookingIds.add(item.booking_id);
          }
        });

        // Si necesitas el resultado como un array
        let uniqueBookingIds = Array.from(bookingIds);

        uniqueBookingIds.forEach(element => {
          this.crudService.get('/bookings/' + element, ['clientMain', 'bookingUsers.course'])
            .subscribe((bo) => {
              this.bookingList = this.bookingList.concat(bo.data);
            })
        });
      })
  }

  getPaidBookings() {
    return this.bookingList.filter((b) => !b.paid).length;
  }

  getPrivateNoAssigned() {

    let ret = 0;
    this.bookingList.forEach(element => {

      element.booking_users.forEach(bu => {
        if (bu.course.course_type === 2 && bu.monitor_id === null) {
          ret = ret + 1;

        }
      });
    });

    return ret;
  }

  getColNoAssigned() {

    let ret = 0;
    this.bookingList.forEach(element => {

      element.booking_users.forEach(bu => {
        if (bu.course.course_type === 1 && bu.monitor_id === null) {
          ret = ret + 1;

        }
      });
    });

    return ret;
  }
}
