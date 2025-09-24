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
    console.log('=== FLUX-DISPONIBILIDAD COMPONENT DEBUG ===');
    console.log('courseFormGroup booking_users:', this.courseFormGroup.controls['booking_users'].value);
    console.log('course_dates:', this.courseFormGroup.controls['course_dates'].value);

    // Check if each course_date has booking_users_active
    this.courseFormGroup.controls['course_dates'].value.forEach((date: any, index: number) => {
      console.log(`Date ${index} (${date.date}):`, {
        id: date.id,
        booking_users_active: date.booking_users_active,
        booking_users_active_length: date.booking_users_active?.length || 0
      });
    });

    this.getAvail(this.courseFormGroup.controls['course_dates'].value[0])
    this.booking_users = this.courseFormGroup.controls['booking_users'].value.filter((user: any, index: any, self: any) =>
      index === self.findIndex((u: any) => u.client_id === user.client_id)
    );

    console.log('Filtered booking_users:', this.booking_users);
    console.log('Level ID:', this.level?.id);
    console.log('Subgroup index:', this.subgroup_index);

    // Debug the filtering logic used in the template
    const selectedDate = this.selectDate || 0;
    const courseDates = this.courseFormGroup.controls['course_dates'].value;
    const selectedCourseDate = courseDates[selectedDate];
    console.log('Selected date index:', selectedDate);
    console.log('Selected course date:', selectedCourseDate);

    const levelGroup = selectedCourseDate?.course_groups?.find((g: any) => g.degree_id === this.level?.id);
    console.log('Level group found:', levelGroup);

    const targetSubgroup = levelGroup?.course_subgroups?.[this.subgroup_index];
    console.log('Target subgroup:', targetSubgroup);
    console.log('Target subgroup ID:', targetSubgroup?.id);

    // Check which users match the subgroup
    const bookingUsers = this.courseFormGroup.controls['booking_users'].value || [];
    bookingUsers.forEach((user: any, index: number) => {
      console.log(`User ${index}:`, {
        name: `${user.client?.first_name} ${user.client?.last_name}`,
        course_subgroup_id: user.course_subgroup_id,
        matches_subgroup: user.course_subgroup_id === targetSubgroup?.id,
        degree_id: user.degree_id
      });
    });

    console.log('====================================');
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
    // Usar la misma lógica que en el template: filtrar por degree_id
    const bookingUsers = this.booking_users || [];
    const studentsInSubgroup = bookingUsers.filter((user: any) => user.degree_id === this.level.id);

    console.log('=== TIMING CLICK DEBUG ===');
    console.log('Level ID:', this.level.id);
    console.log('SubGroup:', subGroup);
    console.log('Booking users available:', bookingUsers.length);
    console.log('Students in subgroup (by degree_id):', studentsInSubgroup);
    console.log('=========================');

    if (studentsInSubgroup.length === 0) {
      this.snackbar.open(this.translateService.instant('no_user_reserved'), 'OK', { duration: 2000 });
    }

    // Determinar la fecha seleccionada actualmente
    const courseDates = this.courseFormGroup.controls['course_dates']?.value || [];
    const selectedDateObj = courseDates?.[this.selectDate] || courseDates?.[0] || null;

    const timingData = {
      subGroup: subGroup,
      groupLevel: this.level,
      selectedDate: selectedDateObj,
      studentsInLevel: studentsInSubgroup  // Agregar los estudiantes encontrados
    };

    console.log('Emitting viewTimes with data:', timingData);

    this.viewTimes.emit(timingData);
  }

  /**
   * Check if there are students for this level using the same logic as the template
   */
  hasStudents(): boolean {
    try {
      // Use the same filtering logic as the template: filter by degree_id
      const bookingUsers = this.booking_users || [];
      const studentsInLevel = bookingUsers.filter((user: any) => user.degree_id === this.level?.id);

      console.log('hasStudents() check:', {
        level_id: this.level?.id,
        booking_users_count: bookingUsers.length,
        students_in_level_count: studentsInLevel.length,
        has_students: studentsInLevel.length > 0
      });

      return studentsInLevel.length > 0;
    } catch (error) {
      console.error('hasStudents() error:', error);
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
