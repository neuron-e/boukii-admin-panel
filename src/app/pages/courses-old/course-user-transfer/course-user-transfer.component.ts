import { Component, Inject, OnInit } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
  courseSubGroups: any = [];
  currentStudents: any = [];
  selectedSubgroupId: number | null = null;
  selectedStudentIds = new Set<number>();
  selectAllStudents = false;
  languages: any = [];
  subGroupsToChange: any = null;
  clients: any = [];
  course: any = [];
  countries = MOCK_COUNTRIES;
  loading = true;
  user: any;
  transferring: boolean = false;
  subgroupDaysCache = new Map<number, number>();

  constructor(
    private dialogRef: MatDialogRef<CourseUserTransferComponent>,
    @Inject(MAT_DIALOG_DATA) public defaults: any,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    private translateService: TranslateService
  ) {

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
    this.selectedStudentIds.clear();
    this.selectAllStudents = false;
    this.subGroupsToChange = null;
    this.selectedSubgroupId = null;
    this.subgroupDaysCache.clear();
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

  toggleSelectAllStudents(event: MatCheckboxChange) {
    const isChecked = !!event?.checked;
    this.selectAllStudents = isChecked;
    this.selectedStudentIds.clear();

    if (isChecked) {
      this.currentStudents.forEach((student) => {
        const clientId = this.normalizeId(student?.client_id);
        if (clientId != null) {
          this.selectedStudentIds.add(clientId);
        }
      });
    }
    this.syncSelectAllState();
  }

  toggleStudentSelection(event: MatCheckboxChange, student: any) {
    const clientId = this.normalizeId(student?.client_id);
    if (clientId == null) {
      return;
    }

    if (event.checked) {
      this.selectedStudentIds.add(clientId);
    } else {
      this.selectedStudentIds.delete(clientId);
    }

    this.syncSelectAllState();
  }

  isStudentSelected(student: any): boolean {
    const clientId = this.normalizeId(student?.client_id);
    return clientId != null && this.selectedStudentIds.has(clientId);
  }

  transferStudent() {
    const clientIds = Array.from(this.selectedStudentIds);
    if (!this.subGroupsToChange || clientIds.length === 0) {
      return;
    }

    const payload = {
      initialSubgroupId: this.defaults.subgroup.id,
      targetSubgroupId: this.subGroupsToChange.id,
      clientIds,
      moveAllDays: true
    };

    this.transferring = true;

    this.crudService.post('/clients/transfer', payload)
      .subscribe({
        next: () => {
          this.transferring = false;
          this.snackbar.open(
            this.translateService.instant('snackbar.course.transfer_user') || 'Transfer completed',
            'OK',
            { duration: 3000 }
          );
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Transfer failed', error);
          this.transferring = false;
          const errorMsg = error?.error?.message || this.translateService.instant('snackbar.error') || 'Transfer failed';
          this.snackbar.open(errorMsg, 'OK', { duration: 4000 });
        }
      });
  }

  getUserInSubGroup(subgroup: any): number {
    if (!subgroup) {
      return 0;
    }

    const uniqueUsers = new Set<number>();
    const bookingSources = [
      ...(Array.isArray(this.course?.booking_users) ? this.course.booking_users : []),
      ...(Array.isArray(this.course?.booking_users_active) ? this.course.booking_users_active : [])
    ];

    bookingSources.forEach((booking) => {
      if (!this.matchesSubgroup(booking, subgroup)) {
        return;
      }

      if (Number(booking?.status) === 2) {
        return;
      }

      const clientId = this.normalizeId(booking?.client_id ?? booking?.client?.id ?? booking?.id);
      if (clientId != null) {
        uniqueUsers.add(clientId);
      }
    });

    return uniqueUsers.size;
  }

  onSubgroupSelectionChange(value: any) {
    const normalized = this.normalizeId(value);
    if (normalized == null) {
      this.subGroupsToChange = null;
      this.selectedSubgroupId = null;
      return;
    }

    this.subGroupsToChange = this.courseSubGroups.find((group) => this.normalizeId(group?.id) === normalized) || null;
    this.selectedSubgroupId = normalized;
  }

  getSubgroupName(subgroup: any): string {
    if (!subgroup) {
      return '';
    }

    const pieces: string[] = [];
    if (subgroup?.annotation) {
      pieces.push(subgroup.annotation);
    }
    if (subgroup?.name && !pieces.includes(subgroup.name)) {
      pieces.push(subgroup.name);
    }
    if (pieces.length) {
      return pieces.join(' · ');
    }

    const fallbackId = this.normalizeId(subgroup?.id);
    return fallbackId != null ? `#${fallbackId}` : '';
  }

  getSubgroupCapacityValue(subgroup: any): number {
    const candidate = this.normalizeId(subgroup?.max_participants ?? subgroup?.maxParticipants ?? subgroup?.capacity);
    if (candidate != null) {
      return candidate;
    }

    return this.normalizeId(this.defaults?.subgroup?.max_participants) ?? 0;
  }

  getSubgroupDaysCount(subgroup: any): number {
    const subgroupId = this.normalizeId(subgroup?.id);
    if (subgroupId == null) {
      return 0;
    }

    if (this.subgroupDaysCache.has(subgroupId)) {
      return this.subgroupDaysCache.get(subgroupId)!;
    }

    const days = new Set<number>();
    (this.course?.course_dates || []).forEach((courseDate) => {
      const groups = courseDate?.course_groups || [];
      groups.forEach((group) => {
        const subgroups = group?.course_subgroups || [];
        subgroups.forEach((sg) => {
          if (this.normalizeId(sg?.id) === subgroupId) {
            const dateId = this.normalizeId(courseDate?.id);
            if (dateId != null) {
              days.add(dateId);
            }
          }
        });
      });
    });

    const count = days.size;
    this.subgroupDaysCache.set(subgroupId, count);
    return count;
  }

  isDefaultSubgroup(subgroup: any): boolean {
    return this.normalizeId(subgroup?.id) === this.normalizeId(this.defaults?.subgroup?.id);
  }

  canTransfer(): boolean {
    return !!this.subGroupsToChange && this.selectedStudentIds.size > 0 && !this.transferring;
  }

  private matchesSubgroup(record: any, subgroup: any): boolean {
    if (!record || !subgroup) {
      return false;
    }
    const targetId = this.normalizeId(subgroup?.id);
    const recordId = this.normalizeId(
      record?.course_subgroup_id ??
      record?.course_subgroup?.id ??
      record?.course_sub_group_id ??
      record?.course_sub_group?.id ??
      record?.courseSubgroupId ??
      record?.courseSubGroupId
    );
    return targetId != null && recordId != null && targetId === recordId;
  }

  private normalizeId(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private syncSelectAllState(): void {
    const selectable = this.currentStudents.reduce((count, student) => {
      return this.normalizeId(student?.client_id) != null ? count + 1 : count;
    }, 0);

    this.selectAllStudents = selectable > 0 && this.selectedStudentIds.size === selectable;
  }
}
