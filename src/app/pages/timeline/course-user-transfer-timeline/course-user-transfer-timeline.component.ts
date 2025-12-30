import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAccordion } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-course-user-transfer-timeline',
  templateUrl: './course-user-transfer-timeline.component.html',
  styleUrls: ['./course-user-transfer-timeline.component.scss']
})
export class CourseUserTransferTimelineComponent implements OnInit {
  @ViewChild(MatAccordion) accordion: MatAccordion;

  courseSubGroups: any = [];
  currentStudents: any = [];
  studentToChange: any = [];
  languages: any = [];
  subGroupsToChange: any = null;
  course: any = [];
  countries = MOCK_COUNTRIES;
  loading = true;
  user: any;
  groupedByColor = {};
  colorKeys: string[] = [];
  transferScope: 'single' | 'future' | 'all' = 'all';

  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private crudService: ApiCrudService, private translateService: TranslateService,
  private snackbar: MatSnackBar, private dialogRef: MatDialogRef<any>) {

  }

  ngOnInit(): void {
    this.getLanguages();
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    this.defaults.degrees.forEach(level => {
      if (!this.groupedByColor[level.color]) {
        this.groupedByColor[level.color] = [];
      }
      this.groupedByColor[level.color].push(level);
    });

    this.colorKeys = Object.keys(this.groupedByColor);

    this.getData();


    //this.readSubGroups();
  }

  getData() {
    this.courseSubGroups = [];
    this.currentStudents = this.defaults.currentStudents;
    this.crudService.get('/admin/courses/'+this.defaults.id)
      .subscribe((data) => {
        this.course = data.data;

        this.course.course_dates.forEach(element => {
          if (moment(element.date, 'YYYY-MM-DD').format('YYYY-MM-DD') === this.defaults.currentDate.format('YYYY-MM-DD')) {
            element.course_groups.forEach(group => {
              group.course_subgroups.forEach(subgroup => {
                this.courseSubGroups.push(subgroup);
              });
            });
          }

        });

        this.loading = false;
      })
  }

  calculateAge(birthDateString) {
    if(birthDateString && birthDateString !== null) {
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

  addToStudentChangeList(event: any, item: any, idx: number) {
    if (event.checked) {
      this.studentToChange.push(item);
    } else {
      this.studentToChange.splice(idx, 1);
    }
  }

  onCheckboxChange(isChecked: boolean, subGroup: any) {
    this.subGroupsToChange = subGroup;
    if (isChecked) {
      this.courseSubGroups.forEach((item) => {
        item.checked = item.id === subGroup.id;
      });
    }
  }

  transferStudent() {
    const data = {
      initialSubgroupId: this.defaults.subgroup,
      targetSubgroupId: this.subGroupsToChange.id,
      clientIds: [],
      scope: this.transferScope,
      scope_date: moment(this.defaults.currentDate).format('YYYY-MM-DD'),
      moveAllDays: this.transferScope === 'all'
    }
    this.studentToChange.forEach(element => {
      data.clientIds.push(element.client_id);
    });

    this.crudService.post('/clients/transfer', data)
      .subscribe((data) => {
        this.snackbar.open(this.translateService.instant('snackbar.course.trasnfer_user'), 'OK', {duration: 3000});
        this.dialogRef.close(true);
      })
  }

  getUserInSubGroup(subgroup: any) {
    let ret = 0;
    this.course.booking_users_active.forEach(element => {
      if (element.course_subgroup_id === subgroup.id && element.status === 1) {
        ret = ret + 1;
      }
    });

    return ret;
  }

  getCourseSubgroups(level: any) {
    let ret = [];

    this.courseSubGroups.forEach(element => {
      if (element.degree_id === level.id) {
        ret.push(element);
      }
    });

    return ret;
  }
}
