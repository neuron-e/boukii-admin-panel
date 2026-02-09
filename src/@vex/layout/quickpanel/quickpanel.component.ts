import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-quickpanel',
  templateUrl: './quickpanel.component.html',
  styleUrls: ['./quickpanel.component.scss']
})
export class QuickpanelComponent implements OnInit {

  date = moment().locale(this.translateService.currentLang).format('ll');
  dayName = moment().locale(this.translateService.currentLang).format('dddd');

  todayTasks: any = [];
  allTasks: any = [];

  currentPage = 1;
  pageSize = 5;
  currentPageAll = 1;
  pageSizeAll = 5;

  user: any;
  constructor(private crudService: ApiCrudService, private translateService: TranslateService) { }

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    if (this.user?.schools?.[0]?.id) {
      this.getTodayTasks();
      this.getAllTasks();
    }

  }

  getTodayTasks() {
    const schoolId = this.user?.schools?.[0]?.id;
    if (!schoolId) {
      this.todayTasks = [];
      return;
    }
    this.crudService.list('/tasks', 1, 10000, 'desc', 'id', '&school_id=' + schoolId + '&start_date=' + moment().format('YYYY-MM-DD') + '&end_date=' + moment().format('YYYY-MM-DD')).subscribe((tasks) => this.todayTasks = tasks.data)
  }

  getAllTasks() {
    const schoolId = this.user?.schools?.[0]?.id;
    if (!schoolId) {
      this.allTasks = [];
      return;
    }
    this.crudService.list('/tasks', 1, 10000, 'desc', 'id', '&school_id=' + schoolId + '&start_date=' + moment().add(1, 'd').format('YYYY-MM-DD'))
      .subscribe((tasks) => this.allTasks = tasks.data)
  }

  get paginatedCurrentTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.todayTasks.slice(startIndex, startIndex + this.pageSize);
  }

  get paginatedAllTasks() {
    const startIndex = (this.currentPageAll - 1) * this.pageSizeAll;
    return this.allTasks.slice(startIndex, startIndex + this.pageSizeAll);
  }

  nextPage() {
    this.currentPage++;
  }

  previousPage() {
    this.currentPage--;
  }

  nextPageAll() {
    this.currentPageAll++;
  }

  previousPageAll() {
    this.currentPageAll--;
  }

}
