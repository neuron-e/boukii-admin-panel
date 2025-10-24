import { Component, EventEmitter, Input, OnInit, Output, } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { ApiCrudService } from 'src/service/crud.service';
import { MonitorsService } from 'src/service/monitors.service';

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
  assignmentScope: 'single' | 'interval' | 'from' | 'range' = 'single';
  assignmentStartIndex = 0;
  assignmentEndIndex = 0;
  constructor(private crudService: ApiCrudService, private monitorsService: MonitorsService, private snackbar: MatSnackBar, private translateService: TranslateService) { }
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
  monitors: any = null

  private getCourseDates(): any[] {
    return this.courseFormGroup?.controls?.['course_dates']?.value || [];
  }

  selectUser: any[] = []
  async getAvail(item: any) {
    const monitor = await this.getAvailable({ date: item.date, endTime: item.hour_end, minimumDegreeId: this.level.id, sportId: this.courseFormGroup.controls['sport_id'].value, startTime: item.hour_start })
    this.monitors = monitor.data
  }
  booking_users: any
  onAssignmentScopeChange(scope: 'single' | 'interval' | 'from' | 'range'): void {
    this.assignmentScope = scope;
    const total = this.getCourseDates().length;
    if (scope === 'single' || total <= 1) {
      this.assignmentStartIndex = this.selectDate;
      this.assignmentEndIndex = this.selectDate;
      return;
    }
    if (scope === 'interval') {
      // Asignar monitor a todas las fechas del intervalo actual
      const currentIntervalIndexes = this.getIntervalDateIndexes();
      if (currentIntervalIndexes.length > 0) {
        this.assignmentStartIndex = currentIntervalIndexes[0];
        this.assignmentEndIndex = currentIntervalIndexes[currentIntervalIndexes.length - 1];
      }
      return;
    }
    if (scope === 'from') {
      this.assignmentStartIndex = this.selectDate;
      this.assignmentEndIndex = total > 0 ? total - 1 : this.selectDate;
      return;
    }
    const lastIndex = total > 0 ? total - 1 : this.selectDate;
    this.assignmentStartIndex = this.selectDate;
    this.assignmentEndIndex = Math.min(Math.max(this.assignmentEndIndex, this.selectDate), lastIndex);
  }

  onAssignmentStartIndexChange(value: number): void {
    this.assignmentStartIndex = value;
    if (this.assignmentScope === 'range' && this.assignmentStartIndex > this.assignmentEndIndex) {
      this.assignmentEndIndex = value;
    }
  }

  onAssignmentEndIndexChange(value: number): void {
    this.assignmentEndIndex = value;
    if (this.assignmentScope === 'range' && this.assignmentEndIndex < this.assignmentStartIndex) {
      this.assignmentStartIndex = value;
    }
  }

  onSelectDate(index: number, item: any): void {
    this.selectDate = index;
    if (this.assignmentScope === 'single') {
      this.assignmentStartIndex = index;
      this.assignmentEndIndex = index;
    } else if (this.assignmentScope === 'from' && this.assignmentStartIndex > index) {
      this.assignmentStartIndex = index;
    }
    this.getAvail(item);
  }

  private resolveAssignmentIndexes(selectDate: number): { startIndex: number; endIndex: number } {
    const total = this.getCourseDates().length;
    if (total === 0) {
      return { startIndex: selectDate, endIndex: selectDate };
    }
    if (this.assignmentScope === 'single' || total === 1) {
      return { startIndex: selectDate, endIndex: selectDate };
    }
    if (this.assignmentScope === 'interval') {
      const intervalIndexes = this.getIntervalDateIndexes();
      if (intervalIndexes.length > 0) {
        return { startIndex: intervalIndexes[0], endIndex: intervalIndexes[intervalIndexes.length - 1] };
      }
      return { startIndex: selectDate, endIndex: selectDate };
    }
    if (this.assignmentScope === 'from') {
      const startIdx = Math.min(Math.max(this.assignmentStartIndex, 0), total - 1);
      return { startIndex: startIdx, endIndex: total - 1 };
    }
    const startIdx = Math.min(this.assignmentStartIndex, this.assignmentEndIndex);
    const endIdx = Math.max(this.assignmentStartIndex, this.assignmentEndIndex);
    return {
      startIndex: Math.max(0, Math.min(startIdx, total - 1)),
      endIndex: Math.max(0, Math.min(endIdx, total - 1))
    };
  }

  private buildTargetIndexes(startIndex: number, endIndex: number): number[] {
    const indexes: number[] = [];
    for (let idx = startIndex; idx <= endIndex; idx++) {
      indexes.push(idx);
    }
    return indexes;
  }

  private collectBookingUserIds(indexes: number[]): number[] {
    const bookingUsers = this.courseFormGroup?.controls['booking_users']?.value || [];
    const dates = this.getCourseDates();
    const result = new Set<number>();
    const levelId = this.level?.id;

    indexes.forEach(idx => {
      const date = dates[idx];
      if (!date) {
        return;
      }
      const group = date?.course_groups?.find((g: any) => g.degree_id === levelId);
      const subgroup = group?.course_subgroups?.[this.subgroup_index];
      const subgroupId = subgroup?.id;
      if (!subgroupId) {
        return;
      }
      bookingUsers.forEach((user: any) => {
        if (user?.course_date_id === date?.id && user?.course_subgroup_id === subgroupId && user?.id != null) {
          result.add(user.id);
        }
      });
    });

    return Array.from(result);
  }

  private resolveFallbackSubgroupId(index: number): number | null {
    const date = this.getCourseDates()[index];
    if (!date) {
      return null;
    }
    const levelGroup = date?.course_groups?.find((g: any) => g.degree_id === this.level?.id);
    const subgroup = levelGroup?.course_subgroups?.[this.subgroup_index];
    return subgroup?.id ?? null;
  }

  getAssignmentSelectedDays(): number {
    const { startIndex, endIndex } = this.resolveAssignmentIndexes(this.selectDate);
    if (startIndex > endIndex) {
      return 0;
    }
    return endIndex - startIndex + 1;
  }

  /**
   * Verifica si hay múltiples intervalos configurados
   */
  hasMultipleIntervals(): boolean {
    try {
      const courseDates = this.getCourseDates();
      if (!courseDates || courseDates.length === 0) {
        return false;
      }

      // Obtener todos los interval_id únicos
      const intervalIds = new Set(courseDates.map(date => date.interval_id).filter(id => id != null));
      return intervalIds.size > 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene los índices de las fechas que pertenecen al intervalo de la fecha seleccionada
   */
  private getIntervalDateIndexes(): number[] {
    try {
      const courseDates = this.getCourseDates();
      if (!courseDates || courseDates.length === 0) {
        return [];
      }

      const selectedDate = courseDates[this.selectDate];
      if (!selectedDate) {
        return [];
      }

      const selectedIntervalId = selectedDate.interval_id;

      // Si no hay interval_id, considerar todas las fechas del mismo horario
      if (selectedIntervalId == null) {
        return courseDates
          .map((date, index) => ({ date, index }))
          .filter(item => item.date.interval_id == null)
          .map(item => item.index);
      }

      // Obtener todas las fechas con el mismo interval_id
      return courseDates
        .map((date, index) => ({ date, index }))
        .filter(item => item.date.interval_id === selectedIntervalId || String(item.date.interval_id) === String(selectedIntervalId))
        .map(item => item.index);
    } catch (error) {
      return [];
    }
  }

  ngOnInit(): void {
    const totalDates = this.getCourseDates().length;
    this.assignmentStartIndex = this.selectDate;
    this.assignmentEndIndex = totalDates > 0 ? totalDates - 1 : this.selectDate;
    if (totalDates <= 1) {
      this.assignmentScope = 'single';
    }

    // NO cargar monitores disponibles automáticamente para evitar colapsar la API
    // Los monitores se cargarán solo cuando el usuario haga clic en una fecha
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

  async SelectMonitor(event: any, selectDate: number) {
    const selectedMonitor = event?.option?.value ?? null;
    const monitorId = selectedMonitor ? selectedMonitor.id : null;
    const courseDates = this.getCourseDates();
    const baseGroup = courseDates?.[selectDate]?.course_groups?.find((g: any) => g.degree_id === this.level?.id);
    const baseSubgroup = baseGroup?.course_subgroups?.[this.subgroup_index];

    if (baseSubgroup && baseSubgroup.monitor_id === monitorId) {
      return;
    }

    const { startIndex, endIndex } = this.resolveAssignmentIndexes(selectDate);
    const targetIndexes = this.buildTargetIndexes(startIndex, endIndex);
    const bookingUserIds = this.collectBookingUserIds(targetIndexes);

    let subgroupId: number | null = null;
    if (!bookingUserIds.length && targetIndexes.length === 1) {
      subgroupId = this.resolveFallbackSubgroupId(targetIndexes[0]);
    }

    const payload = {
      monitor_id: monitorId,
      booking_users: bookingUserIds,
      subgroup_id: subgroupId
    };

    try {
      await firstValueFrom(this.monitorsService.transferMonitor(payload));

      targetIndexes.forEach(idx => {
        this.monitorSelect.emit({ monitor: selectedMonitor, i: idx });
        this.modified[idx] = true;
      });

      this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Error occurred while assigning monitor:', error);
      if (error?.error?.message && error.error.message.includes('Overlap')) {
        this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
      } else {
        this.snackbar.open(this.translateService.instant('event_overlap'), 'OK', { duration: 3000 });
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
      return studentsInLevel.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Toggle acceptance status for a booking user
   */
  toggleAcceptance(bookingUser: any, accepted: boolean): void {
    if (!bookingUser || !bookingUser.id) {
      return;
    }

    const payload = { accepted: accepted };

    this.crudService.update(`admin/booking-users/${bookingUser.id}/acceptance`, payload, '')
      .subscribe({
        next: (response: any) => {
          // Actualizar el objeto local
          bookingUser.accepted = accepted;

          // Mostrar mensaje de confirmación
          const message = accepted ?
            this.translateService.instant('attendance.confirmed') :
            this.translateService.instant('attendance.pending');

          this.snackbar.open(message, 'OK', { duration: 3000 });
        },
        error: (error) => {
          this.snackbar.open('Error al actualizar confirmación', 'OK', { duration: 3000 });
        }
      });
  }

  /**
   * Get student count for a specific date and subgroup
   * Returns format like "3/8" (current students / max capacity)
   */
  getStudentCount(dateItem: any): string {
    try {
      // Find the level group for this date
      const levelGroup = dateItem?.course_groups?.find((g: any) => g.degree_id === this.level?.id);
      const subgroup = levelGroup?.course_subgroups?.[this.subgroup_index];

      if (!subgroup) {
        return '0/0';
      }

      // Count students in this subgroup for this date
      // Students are in booking_users_active filtered by course_date_id and course_subgroup_id
      const bookingUsersActive = dateItem?.booking_users_active || [];
      const studentsInSubgroup = bookingUsersActive.filter((user: any) =>
        user.course_subgroup_id === subgroup.id
      );

      const currentCount = studentsInSubgroup.length;
      const maxCapacity = this.level?.max_participants || 0;

      return `${currentCount}/${maxCapacity}`;
    } catch (error) {
      return '0/0';
    }
  }
}
