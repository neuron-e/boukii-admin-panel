import { Component, EventEmitter, Input, OnInit, Output, } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-flux-disponibilidad',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class FluxDisponibilidadComponent implements OnInit {
  cambiarModal: boolean = false
  @Input() mode: 'create' | 'update' = "create"
  @Input() courseFormGroup!: UntypedFormGroup
  @Input() level!: any
  @Input() group!: any
  @Input() subgroup_index!: number

  @Output() monitorSelect = new EventEmitter<any>()
  @Output() viewTimes = new EventEmitter<any>()

  modified: any[] = []
  modified2: any[] = []
  selectedSubgroup: any;
  today: Date = new Date()
  ISODate = (n: number) => new Date(new Date().getTime() + n * 24 * 60 * 60 * 1000).toLocaleString()
  find = (array: any[], key: string, value: string) => array.find((a: any) => a[key] === value)

  displayFn = (value: any): string => value
  selectDate: number = 0
  constructor(private crudService: ApiCrudService, private snackbar: MatSnackBar, private translateService: TranslateService) { }
  getLanguages = () => this.crudService.list('/languages', 1, 1000).subscribe((data) => this.languages = data.data.reverse())
  getLanguage(id: any) {
    const lang: any = this.languages.find((c: any) => c.id == +id);
    return lang ? lang.code.toUpperCase() : 'NDF';
  }
  countries = MOCK_COUNTRIES;
  languages = [];
  getCountry(id: any) {
    const country = this.countries.find((c) => c.id == +id);
    return country ? country.name : 'NDF';
  }
  calculateAge(birthDateString: any) {
    if (birthDateString && birthDateString !== null) {
      const today = new Date();
      const birthDate = new Date(birthDateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    } else return 0;
  }
  async getAvailable(data: any) {
    return await firstValueFrom(this.crudService.post('/admin/monitors/available', data))
  }
  monitors!: any
  selectUser: any[] = []
  async getAvail(item: any) {
    const monitor = await this.getAvailable({ date: item.date, endTime: item.hour_end, minimumDegreeId: this.level.id, sportId: this.courseFormGroup.controls['sport_id'].value, startTime: item.hour_start })
    this.monitors = monitor.data
  }
  booking_users: any
  ngOnInit(): void {
    this.getAvail(this.courseFormGroup.controls['course_dates'].value[0])
    this.booking_users = this.courseFormGroup.controls['booking_users'].value.filter((user: any, index: any, self: any) =>
      index === self.findIndex((u: any) => u.client_id === user.client_id)
    );
  }

  changeMonitor(event: any) {
    const subIndex = event.date[0].course_subgroups.findIndex((a: any) => a.id === event.subgroup.id)
    for (const [index, date] of event.date.entries()) {
      if (date.course_subgroups[subIndex]?.id) {
        for (const selectedUser of this.selectUser) {
          const userToModify = this.courseFormGroup.controls['booking_users'].value.filter((user: any) => user.client.id === selectedUser.client.id && user.course_date_id === date.id);
          if (userToModify.length > 0) {
            for (const user of userToModify) {
              const data = {
                initialSubgroupId: user.course_subgroup_id,
                targetSubgroupId: date.course_subgroups[subIndex].id,
                clientIds: this.selectUser.map((a: any) => a.client_id),
                moveAllDays: true
              }
              this.crudService.post('/clients/transfer', data).subscribe(() => {
                user.course_group_id = date.course_subgroups[subIndex].course_group_id;
                user.course_subgroup_id = date.course_subgroups[subIndex].id;
                user.degree_id = date.course_subgroups[subIndex].degree_id;
                user.monitor_id = date.course_subgroups[subIndex].monitor_id;
                const course_groupsIndex = this.courseFormGroup.controls['course_dates'].value[index].course_groups.findIndex((a: any) => a.id === user.course_group_id)
                const course_subgroupsIndex = this.courseFormGroup.controls['course_dates'].value[index].course_groups[course_groupsIndex].course_subgroups.findIndex((a: any) => a.id === user.course_subgroup_id)
                this.courseFormGroup.controls['course_dates'].value[index].course_groups[course_groupsIndex].course_subgroups[course_subgroupsIndex].booking_users.push(user)
              })
            }
          }
        }
      } else {
        this.snackbar.open(
          this.translateService.instant("user_transfer_not_allowed"), "OK",
          //{ duration: 2000 }
        );
      }
    }
    this.cambiarModal = false
  }

  onCheckboxChange(event: any, item: any): void {
    if (event.checked) this.selectUser.push(item);
    else this.selectUser = this.selectUser.filter((selectedItem: any) => selectedItem !== item);
    this.modified2[item.id] = true
  }

  openTransferModal(){
    this.selectedSubgroup = this.group.course_subgroups[this.subgroup_index];
    this.cambiarModal = true;
  }

  Date = (v: string): Date => new Date(v)

  SelectMonitor(event: any, selectDate: any) {
    if (this.find(this.courseFormGroup.controls['course_dates'].value[selectDate].course_groups, 'degree_id', this.level.id).course_subgroups[this.subgroup_index].monitor_id != event.option.value.id) {
      this.monitorSelect.emit({ monitor: event.option.value, i: selectDate });
      this.modified[selectDate] = Boolean(this.find(this.courseFormGroup.controls['course_dates'].value[selectDate].course_groups, 'degree_id', this.level.id).course_subgroups[this.subgroup_index].monitor_id)
      const course_dates = this.courseFormGroup.controls['course_dates'].value
      for (const date in course_dates) {
        if (!this.find(course_dates[date].course_groups, 'degree_id', this.level.id).course_subgroups[this.subgroup_index].monitor_id) {
          this.getAvailable({ date: course_dates[date].date, endTime: course_dates[date].hour_end, minimumDegreeId: this.level.id, sportId: this.courseFormGroup.controls['sport_id'].value, startTime: course_dates[date].hour_start })
            .then((data) => {
              if (data.data.find((a: any) => a.id === event.option.value.id)) {
                this.monitorSelect.emit({ monitor: event.option.value, i: date });
                this.modified[date] = true
              }
            }
            )
        }
      }
    }
  }

  /**
   * Emit timing event for the subgroup
   * Abre el modal incluso si no hay alumnos (se mostrará vacío)
   */
  onTimingClick(): void {
    const subGroup = this.group.course_subgroups[this.subgroup_index];
    // Informar si no hay alumnos, pero no bloquear la acción
    const bookingUsers = this.courseFormGroup.controls['booking_users']?.value || [];
    const studentsInSubgroup = bookingUsers.filter((user: any) =>
      (user.course_subgroup_id ?? user.course_sub_group_id ?? user.course_sub_group?.id) === subGroup.id
    );
    if (studentsInSubgroup.length === 0) {
      this.snackbar.open(this.translateService.instant('no_user_reserved'), 'OK', { duration: 2000 });
    }

    // Determinar la fecha seleccionada actualmente
    const courseDates = this.courseFormGroup.controls['course_dates']?.value || [];
    const selectedDateObj = courseDates?.[this.selectDate] || courseDates?.[0] || null;

    this.viewTimes.emit({
      subGroup: subGroup,
      groupLevel: this.level,
      selectedDate: selectedDateObj
    });
  }

  /**
   * Mantener utilitario por compatibilidad (ya no se usa para deshabilitar)
   */
  hasStudents(): boolean {
    try {
      const subGroup = this.group?.course_subgroups?.[this.subgroup_index];
      if (!subGroup) return false;

      const courseDates = this.courseFormGroup.controls['course_dates']?.value || [];
      const currentDate = courseDates?.[this.selectDate] || courseDates?.[0];
      if (!currentDate) return false;

      // Prefer per-day active bookings when available (current day)
      const active = Array.isArray((currentDate as any).booking_users_active)
        ? (currentDate as any).booking_users_active
        : [];

      const hasInActiveForDay = active.some((u: any) => {
        const sgId = u?.course_subgroup_id ?? u?.course_sub_group_id ?? u?.course_sub_group?.id ?? null;
        return sgId === subGroup.id;
      });
      if (hasInActiveForDay) return true;

      // Check embedded booking_users inside course_groups -> course_subgroups for the selected day
      try {
        const groupForDay = (currentDate?.course_groups || []).find((g: any) => g?.degree_id === this.level?.id);
        const subgroupForDay = groupForDay?.course_subgroups?.[this.subgroup_index];
        if (subgroupForDay && Array.isArray(subgroupForDay.booking_users) && subgroupForDay.booking_users.length > 0) {
          return true;
        }
      } catch {}

      // Fallback: check global bookings filtered by current date
      const global = this.courseFormGroup.controls['booking_users']?.value || [];
      const hasGlobalForDay = global.some((u: any) => {
        const sgId = u?.course_subgroup_id ?? u?.course_sub_group_id ?? u?.course_sub_group?.id ?? null;
        if (sgId !== subGroup.id) return false;
        const cdId = u?.course_date_id ?? u?.course_date?.id ?? null;
        return cdId ? cdId === currentDate.id : true;
      });
      if (hasGlobalForDay) return true;

      // FINAL fallback: check across ALL days for this subgroup so the tooltip reflects availability in any day
      for (const cd of (courseDates || [])) {
        // per-day active
        const act = Array.isArray((cd as any).booking_users_active) ? (cd as any).booking_users_active : [];
        if (act.some((u: any) => {
          const sgId = u?.course_subgroup_id ?? u?.course_sub_group_id ?? u?.course_sub_group?.id ?? null;
          return sgId === subGroup.id;
        })) return true;

        // embedded booking_users by date
        const g = (cd?.course_groups || []).find((x: any) => x?.degree_id === this.level?.id);
        const sg = g?.course_subgroups?.[this.subgroup_index];
        if (sg && Array.isArray(sg.booking_users) && sg.booking_users.length > 0) return true;

        // global with date id
        if (global.some((u: any) => {
          const sgId = u?.course_subgroup_id ?? u?.course_sub_group_id ?? u?.course_sub_group?.id ?? null;
          if (sgId !== subGroup.id) return false;
          const cdId = u?.course_date_id ?? u?.course_date?.id ?? null;
          return cdId ? (cdId === (cd?.id ?? cd?.course_date_id)) : false;
        })) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Toggle acceptance status for a booking user
   */
  toggleAcceptance(bookingUser: any, accepted: boolean): void {
    if (!bookingUser || !bookingUser.id) {
      console.error('No booking user found');
      return;
    }

    console.log('Toggling acceptance for booking user:', bookingUser.id, 'to:', accepted);

    const payload = { accepted: accepted };

    this.crudService.update(`admin/booking-users/${bookingUser.id}/acceptance`, payload, '')
      .subscribe({
        next: (response: any) => {
          console.log('Acceptance updated successfully:', response);
          
          // Actualizar el objeto local
          bookingUser.accepted = accepted;
          
          // Mostrar mensaje de confirmación
          const message = accepted ? 
            this.translateService.instant('attendance.confirmed') : 
            this.translateService.instant('attendance.pending');
          
          this.snackbar.open(message, 'OK', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error updating acceptance:', error);
          this.snackbar.open('Error al actualizar confirmación', 'OK', { duration: 3000 });
        }
      });
  }
}
