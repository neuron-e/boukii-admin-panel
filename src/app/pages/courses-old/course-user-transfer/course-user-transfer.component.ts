import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatAccordion } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-course-user-transfer',
  templateUrl: './course-user-transfer.component.html',
  styleUrls: ['./course-user-transfer.component.scss']
})
export class CourseUserTransferComponent implements OnInit {
  @ViewChild(MatAccordion) accordion: MatAccordion;

  courseSubGroups: any = [];
  currentStudents: any = [];
  studentToChange: any = [];
  languages: any = [];
  subGroupsToChange: any = null;
  clients: any = [];
  course: any = [];
  countries = MOCK_COUNTRIES;
  loading = true;
  user: any;

  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private crudService: ApiCrudService,
   private snackbar: MatSnackBar, private translateService: TranslateService) {

  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.getLanguages();
    this.getClients();
    this.getData();


    //this.readSubGroups();
  }

  getData() {
    this.courseSubGroups = [];
    this.currentStudents = [];
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
        this.course.booking_users_active.forEach(element => {
          const exists = this.currentStudents.some(student => student.client_id === element.client_id);

          if (!exists) {
            const course = this.course.course_dates.find((c) => moment(c.date, 'YYYY-MM-DD').format('YYYY-MM-DD') === this.defaults.currentDate.format('YYYY-MM-DD'));
            if (course) {

              if (element.course_subgroup_id === this.defaults.subgroup.id) {
                this.currentStudents.push(element);
              }
            }
          }
        });
        this.loading = false;


        /*this.crudService.list('/booking-users', 1, 10000, 'desc', 'id', '&course_id='+this.defaults.id)
            .subscribe((result) => {
              if (result.data.length > 0) {
                result.data.forEach(element => {
                  const exists = this.currentStudents.some(student => student.client_id === element.client_id);

                  if (!exists) {
                    const course = this.course.course_dates.find((c) => moment(c.date, 'YYYY-MM-DD').format('YYYY-MM-DD') === this.defaults.currentDate.format('YYYY-MM-DD'));
                    if (course) {

                      if (element.course_subgroup_id === this.defaults.subgroup.id) {
                        this.currentStudents.push(element);
                      }
                      /!*const group = course.course_groups.find((g) => g.course_date_id === element.course_date_id);

                      if (group) {

                        group.course_subgroups.forEach(sb => {
                          if (sb.id === this.defaults.subgroup.id) {

                            this.currentStudents.push(element);
                          }
                        });
                      }*!/
                    }
                  }
                });
              }
              this.loading = false;
            });*/


      })
  }

  getClients() {
    this.crudService.list('/clients', 1, 100000, 'desc', 'id', '&school_id='+this.user.schools[0].id)
      .subscribe((data: any) => {
        this.clients = data.data;

      })
  }

  getClient(id: any) {
    if (id && id !== null) {
      return this.clients.find((c) => c.id === id);
    }
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

  onCheckboxChange(selectedIndex: number, isChecked: boolean, subGroup: any) {
    this.subGroupsToChange = subGroup;
    if (isChecked) {
      this.courseSubGroups.forEach((item, index) => {
        if (index !== selectedIndex) {
          item.checked = false; // Deseleccionar todos los otros checkboxes
        }
      });
    }
  }

  transferStudent() {
    const data = {
      initialSubgroupId: this.defaults.subgroup.id,
      targetSubgroupId: this.subGroupsToChange.id,
      clientIds: [],
      moveAllDays: true
    }
    this.studentToChange.forEach(element => {
      data.clientIds.push(element.client_id);
    });

    this.crudService.post('/clients/transfer', data)
      .subscribe((data) => {
        this.snackbar.open(this.translateService.instant('snackbar.course.trasnfer_user'), 'OK', {duration: 3000});
        this.getData();
      })
  }

  getUserInSubGroup(subgroup: any) {
    let ret = 0;
    this.course.booking_users.forEach(element => {
      if (element.course_subgroup_id === subgroup.id && element.status === 1) {
        ret = ret + 1;
      }
    });

    return ret;
  }

  isSameGroup(subgroup: any) {

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
