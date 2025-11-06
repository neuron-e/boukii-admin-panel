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
  private _cachedDatesForSubgroup: Array<{ date: any, index: number }> | null = null;
  private _cachedIntervalHeaders: Array<{ name: string; colspan: number }> | null = null;
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

  private getUserSubgroupId(user: any): number | null {
    return (user?.course_subgroup_id ??
      user?.course_sub_group_id ??
      user?.course_sub_group?.id ??
      user?.courseSubGroupId ??
      user?.courseSubGroup?.id ??
      null) as number | null;
  }

  private getUserCourseDateId(user: any): number | null {
    return (user?.course_date_id ??
      user?.courseDateId ??
      user?.course_date?.id ??
      user?.courseDate?.id ??
      null) as number | null;
  }

  private toArray<T = any>(val: any): T[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as T[];
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed as T[] : [];
      } catch {
        return [];
      }
    }
    if (typeof val === 'object') {
      const values = Object.values(val);
      if (values.every(v => typeof v === 'string' && (v as string).length <= 2)) {
        try {
          const parsed = JSON.parse(values.join(''));
          return Array.isArray(parsed) ? parsed as T[] : [];
        } catch {
          return [];
        }
      }
    }
    return [];
  }

  private getSettingsObject(): any {
    try {
      const control = this.courseFormGroup?.controls?.['settings'];
      let raw = control ? control.value : undefined;
      if (!raw && (this.courseFormGroup as any)?.value) {
        raw = (this.courseFormGroup as any).value.settings;
      }
      if (!raw) return {};
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
      }
      if (Array.isArray(raw)) {
        try { return JSON.parse(raw.join('')); } catch { return {}; }
      }
      if (typeof raw === 'object') {
        const values = Object.values(raw);
        if (values.every(v => typeof v === 'string' && (v as string).length <= 2)) {
          try { return JSON.parse(values.join('')); } catch { return raw; }
        }
        return raw;
      }
      return raw;
    } catch {
      return {};
    }
  }

  private extractIntervals(): any[] {
    const settings = this.getSettingsObject();
    if (settings) {
      if (Array.isArray(settings.intervals)) return settings.intervals;
      if (settings?.intervalConfiguration?.intervals) return settings.intervalConfiguration.intervals;
    }
    return [];
  }

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
    const courseDates = this.getCourseDates();
    for (let idx = startIndex; idx <= endIndex; idx++) {
      if (this.getSubgroupForDate(courseDates[idx])) {
        indexes.push(idx);
      }
    }
    return indexes;
  }

  getDatesForSubgroup(): Array<{ date: any, index: number }> {
    if (this._cachedDatesForSubgroup !== null) {
      return this._cachedDatesForSubgroup;
    }

    const courseDates = this.getCourseDates();
    const result: Array<{ date: any, index: number }> = [];
    courseDates.forEach((date, index) => {
      const subgroup = this.getSubgroupForDate(date);
      if (!subgroup) {
        return;
      }
      const dateId = date?.id ?? null;
      const subgroupDateId = subgroup?.course_date_id ?? subgroup?.courseDateId ?? null;
      if (dateId && subgroupDateId && subgroupDateId !== dateId) {
        return;
      }
      result.push({ date, index });
    });

    this._cachedDatesForSubgroup = result;
    return result;
  }

  private invalidateDatesCache(): void {
    this._cachedDatesForSubgroup = null;
    this._cachedIntervalHeaders = null;
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
      const subgroup = this.getSubgroupForDate(date);
      const subgroupId = subgroup?.id;
      if (!subgroupId) {
        return;
      }
      bookingUsers.forEach((user: any) => {
        const userCourseDateId = this.getUserCourseDateId(user);
        const userSubgroupId = this.getUserSubgroupId(user);
        if (userCourseDateId === date?.id && userSubgroupId === subgroupId && user?.id != null) {
          result.add(user.id);
        }
      });
    });

    return Array.from(result);
  }

  private resolveFallbackSubgroupId(index: number): number | null {
    const date = this.getCourseDates()[index];
    const subgroup = this.getSubgroupForDate(date);
    return subgroup?.id ?? null;
  }

  getAssignmentSelectedDays(): number {
    const { startIndex, endIndex } = this.resolveAssignmentIndexes(this.selectDate);
    return this.buildTargetIndexes(startIndex, endIndex).length || 0;
  }

  /**
   * Verifica si hay mÃºltiples intervalos configurados
   */
  hasMultipleIntervals(): boolean {
    try {
      const courseDates = this.getCourseDates();
      if (!courseDates || courseDates.length === 0) {
        return false;
      }

      // Obtener todos los interval_id Ãºnicos
      const intervalIds = new Set(courseDates.map(date => date.interval_id).filter(id => id != null));
      return intervalIds.size > 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene los Ã­ndices de las fechas que pertenecen al intervalo de la fecha seleccionada
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

  /**
   * Obtiene los grupos de intervalos para mostrar headers visuales
   * Retorna un array con el nombre del intervalo y el colspan (cantidad de fechas)
   */
  getIntervalHeaders(): Array<{ name: string; colspan: number }> {
    if (this._cachedIntervalHeaders !== null) {
      return this._cachedIntervalHeaders;
    }

    try {
      if (!this.hasMultipleIntervals()) {
        this._cachedIntervalHeaders = [];
        return [];
      }

      const datesForSubgroup = this.getDatesForSubgroup();
      if (datesForSubgroup.length === 0) {
        this._cachedIntervalHeaders = [];
        return [];
      }

      const intervals = this.extractIntervals();
      const headers: Array<{ name: string; colspan: number }> = [];
      let currentIntervalId: any = null;
      let currentCount = 0;
      let currentIntervalName = '';

      datesForSubgroup.forEach((entry, idx) => {
        const date = entry.date;
        const intervalId = date.interval_id;

        if (intervalId !== currentIntervalId) {
          // Guardar el grupo anterior si existe
          if (currentCount > 0) {
            headers.push({ name: currentIntervalName, colspan: currentCount });
          }

          // Iniciar nuevo grupo
          currentIntervalId = intervalId;
          currentCount = 1;

          // Buscar el nombre del intervalo
          const interval = intervals.find((i: any) =>
            String(i.id) === String(intervalId) || i.id === intervalId
          );
          currentIntervalName = interval?.name || `Semana ${headers.length + 1}`;
        } else {
          currentCount++;
        }
      });

      // Agregar el último grupo
      if (currentCount > 0) {
        headers.push({ name: currentIntervalName, colspan: currentCount });
      }

      this._cachedIntervalHeaders = headers;
      return headers;
    } catch (error) {
      console.error('Error generating interval headers:', error);
      this._cachedIntervalHeaders = [];
      return [];
    }
  }

  ngOnInit(): void {
    const availableDates = this.getDatesForSubgroup();
    if (availableDates.length) {
      this.selectDate = availableDates[0].index;
    } else {
      this.selectDate = 0;
    }

    const totalDates = this.getCourseDates().length;
    this.assignmentStartIndex = this.selectDate;
    this.assignmentEndIndex = totalDates > 0 ? totalDates - 1 : this.selectDate;
    if (availableDates.length <= 1) {
      this.assignmentScope = 'single';
    }

    // Cargar monitores disponibles de la primera fecha automáticamente
    if (availableDates.length > 0) {
      this.getAvail(availableDates[0].date);
    }

    const bookingUsers = this.courseFormGroup?.controls['booking_users']?.value || [];
    this.booking_users = bookingUsers.filter((user: any, index: any, self: any) =>
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
    this.invalidateDatesCache();
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
  @Input() intervalIndex!: number;

  async SelectMonitor(event: any, selectDate: number) {
    const selectedMonitor = event?.option?.value ?? null;
    const monitorId = selectedMonitor ? selectedMonitor.id : null;
    const courseDates = this.getCourseDates();
    const baseSubgroup = this.getSubgroupForDate(courseDates?.[selectDate]);

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

      this.invalidateDatesCache();
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
   * Abre el modal incluso si no hay alumnos (se mostrarÃ¡ vacÃ­o)
   */
  onTimingClick(): void {
    const courseDates = this.getCourseDates();
    const selectedDateObj = courseDates?.[this.selectDate] || courseDates?.[0] || null;
    const subGroup = this.getSubgroupForDate(selectedDateObj) ?? this.group.course_subgroups?.[this.subgroup_index];

    const subgroupIds = this.getSubgroupIdsAcrossDates();
    const bookingUsers = this.courseFormGroup?.controls['booking_users']?.value || [];
    const seenStudents = new Set<number | string>();
    const studentsInSubgroup: any[] = [];
    const pushStudent = (user: any) => {
      if (!user) return;
      const key = user?.id ?? user?.booking_user_id ?? user?.client_id ?? user?.client?.id;
      if (key == null || seenStudents.has(key)) return;
      seenStudents.add(key);
      studentsInSubgroup.push(user);
    };

    bookingUsers.forEach((user: any) => {
      if ((user?.degree_id ?? user?.degreeId) !== this.level?.id) return;
      const userSubgroupId = this.getUserSubgroupId(user);
      if (userSubgroupId != null && subgroupIds.has(userSubgroupId)) {
        pushStudent(user);
      }
    });

    if (!studentsInSubgroup.length) {
      courseDates.forEach(date => {
        const subgroup = this.getSubgroupForDate(date);
        if (!subgroup?.id) return;
        this.toArray(date?.booking_users_active).forEach(user => {
          const userSubgroupId = this.getUserSubgroupId(user);
          if (userSubgroupId === subgroup.id) {
            pushStudent(user);
          }
        });
        this.toArray(subgroup?.booking_users).forEach(user => pushStudent(user));
      });
    }

    if (studentsInSubgroup.length === 0) {
      this.snackbar.open(this.translateService.instant('no_user_reserved'), 'OK', { duration: 2000 });
    }

    const timingData = {
      subGroup: subGroup,
      groupLevel: this.level,
      selectedDate: selectedDateObj,
      studentsInLevel: studentsInSubgroup
    };

    this.viewTimes.emit(timingData);
  }

  /**
   * Check if there are students for this level using the same logic as the template
   */
  hasStudents(): boolean {
    try {
      const courseDates = this.getCourseDates();
      for (const date of courseDates) {
        const subgroup = this.getSubgroupForDate(date);
        if (!subgroup) continue;
        const bookingUsersActive = this.toArray(date?.booking_users_active);
        if (bookingUsersActive.some((user: any) => this.getUserSubgroupId(user) === subgroup.id)) {
          return true;
        }
        const embeddedUsers = this.toArray(subgroup?.booking_users);
        if (embeddedUsers.length) {
          return true;
        }
      }

      const globalUsers = this.courseFormGroup?.controls['booking_users']?.value || [];
      return globalUsers.some((user: any) => {
        if ((user?.degree_id ?? user?.degreeId) !== this.level?.id) return;
        const userSubgroupId = this.getUserSubgroupId(user);
        if (userSubgroupId == null) return false;
        return courseDates.some(date => {
          const subgroup = this.getSubgroupForDate(date);
          return subgroup?.id === userSubgroupId;
        });
      });
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

          // Mostrar mensaje de confirmaciÃ³n
          const message = accepted ?
            this.translateService.instant('attendance.confirmed') :
            this.translateService.instant('attendance.pending');

          this.snackbar.open(message, 'OK', { duration: 3000 });
        },
        error: (error) => {
          this.snackbar.open('Error al actualizar confirmaciÃ³n', 'OK', { duration: 3000 });
        }
      });
  }

  /**
   * Get student count for a specific date and subgroup
   * Returns format like "3/8" (current students / max capacity)
   */
  getStudentCount(dateItem: any): string {
    try {
      const subgroup = this.getSubgroupForDate(dateItem);
      if (!subgroup) {
        return '-';
      }

      const bookingUsersActive = this.toArray(dateItem?.booking_users_active);
      let currentCount = bookingUsersActive.filter((user: any) => {
        const userSubgroupId = this.getUserSubgroupId(user);
        return userSubgroupId === subgroup.id;
      }).length;

      if (currentCount === 0) {
        const embeddedUsers = this.toArray(subgroup?.booking_users);
        currentCount = embeddedUsers.length;
      }

      const maxCapacity =
        subgroup?.max_participants ??
        this.group?.course_subgroups?.[this.subgroup_index]?.max_participants ??
        this.level?.max_participants ??
        this.courseFormGroup?.controls?.['max_participants']?.value ??
        0;

      return `${currentCount}/${maxCapacity || 0}`;
    } catch (error) {
      return '0/0';
    }
  }

  getSubgroupForDate(date: any): any | null {
    if (!date || !this.level?.id) return null;
    const degreeId = this.level.id;

    const dateId = date?.id ?? null;
    const dateLevelSubgroups = this.toArray(date?.course_subgroups || date?.courseSubgroups)
      .filter((sg: any) => (sg?.degree_id ?? sg?.degreeId) === degreeId)
      .filter((sg: any) => {
        const sgDateId = sg?.course_date_id ?? sg?.courseDateId ?? null;
        return !dateId || !sgDateId || sgDateId === dateId;
      });
    if (dateLevelSubgroups.length > this.subgroup_index) {
      return dateLevelSubgroups[this.subgroup_index];
    }

    const group = (date?.course_groups || [])
      .find((g: any) => (g?.degree_id ?? g?.degreeId) === degreeId);
    const groupSubgroups = this.toArray(group?.course_subgroups || group?.courseSubgroups)
      .filter((sg: any) => {
        const sgDateId = sg?.course_date_id ?? sg?.courseDateId ?? null;
        return !dateId || !sgDateId || sgDateId === dateId;
      });
    if (groupSubgroups.length > this.subgroup_index) {
      return groupSubgroups[this.subgroup_index];
    }

    return null;
  }

  private getSubgroupIdsAcrossDates(): Set<number> {
    const ids = new Set<number>();
    const courseDates = this.getCourseDates();
    courseDates.forEach(date => {
      const subgroup = this.getSubgroupForDate(date);
      if (subgroup?.id != null) {
        ids.add(subgroup.id);
      }
    });
    return ids;
  }
}










