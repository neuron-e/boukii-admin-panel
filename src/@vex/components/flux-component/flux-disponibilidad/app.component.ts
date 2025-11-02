import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
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
export class FluxDisponibilidadComponent implements OnInit, OnChanges {
  cambiarModal: boolean = false
  @Input() mode: 'create' | 'update' = "create"
  @Input() courseFormGroup!: UntypedFormGroup
  @Input() level!: any
  @Input() group!: any
  @Input() subgroup_index!: number
  @Input() interval_id?: string | null = null // Optional interval filter

  @Output() monitorSelect = new EventEmitter<any>()
  @Output() viewTimes = new EventEmitter<any>()

  modified: any[] = []
  modified2: any[] = []
  selectedSubgroup: any;
  today: Date = new Date()
  ISODate = (n: number) => new Date(new Date().getTime() + n * 24 * 60 * 60 * 1000).toLocaleString()
  find = (array: any[], key: string, value: string) => array.find((a: any) => a[key] === value)

  displayFn = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;

    if (value.first_name || value.last_name) {
      return `${value.first_name ?? ''} ${value.last_name ?? ''}`.trim();
    }

    if (value.name || value.full_name || value.title) {
      return value.name || value.full_name || value.title || '';
    }

    if (value.monitor?.first_name || value.monitor?.last_name) {
      return `${value.monitor.first_name ?? ''} ${value.monitor.last_name ?? ''}`.trim();
    }

    return '';
  }
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
  monitors: any[] | null = null

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

  private getSubgroupsArray(source: any): any[] {
    if (!source) {
      return [];
    }
    return this.toArray(
      source?.course_subgroups ||
      source?.courseSubgroups ||
      source?.subgroups ||
      source?.course_interval_subgroups ||
      source?.intervalSubgroups
    );
  }

  private resolveSubgroupIdFromDate(index: number): number | null {
    const courseDates = this.getCourseDates();
    const date = courseDates[index];
    if (!date || !this.level?.id) {
      return null;
    }

    const resolvedSubgroup = this.getSubgroupForDate(date);
    const resolvedId = this.extractSubgroupId(resolvedSubgroup);
    if (resolvedId != null) {
      return resolvedId;
    }

    const degreeId = this.level.id;
    const courseGroups = this.toArray(date?.course_groups);
    const subgroupCandidates = this.getSubgroupsArray(date);
    if (subgroupCandidates.length > this.subgroup_index) {
      const candidate = subgroupCandidates[this.subgroup_index];
      const id = this.extractSubgroupId(candidate);
      if (id != null) {
        return id;
      }
    }
    for (const group of courseGroups) {
      if ((group?.degree_id ?? group?.degreeId) !== degreeId) {
        continue;
      }

      const candidates = this.getSubgroupsArray(group);
      if (this.subgroup_index < candidates.length) {
        const candidate = candidates[this.subgroup_index];
        const id = this.extractSubgroupId(candidate);
        if (id != null) {
          return id;
        }
      }
    }

    return null;
  }

  private extractSubgroupId(subgroup: any): number | null {
    if (!subgroup) {
      return null;
    }

    const candidates = [
      subgroup.id,
      subgroup.course_subgroup_id,
      subgroup.courseSubgroupId,
      subgroup.subgroup_id,
      subgroup.course_sub_group_id,
      subgroup.course_sub_group?.id,
      subgroup._id,
      subgroup.temp_id
    ].filter(value => value !== undefined && value !== null && value !== '');

    if (!candidates.length) {
      return null;
    }

    const numeric = Number(candidates[0]);
    if (Number.isNaN(numeric)) {
      return null;
    }

    return numeric > 0 ? numeric : null;
  }

  private hydrateSubgroupIdentity(target: any, fallback: any, group: any, date: any): void {
    if (!target) {
      return;
    }

    const existingId = this.extractSubgroupId(target);
    const fallbackId = this.extractSubgroupId(fallback);

    if (existingId == null && fallbackId != null) {
      if (target.id == null) target.id = fallbackId;
      if (target.course_subgroup_id == null) target.course_subgroup_id = fallbackId;
      if (target.courseSubgroupId == null) target.courseSubgroupId = fallbackId;
      if (target.subgroup_id == null) target.subgroup_id = fallbackId;
      if (target.temp_id == null) target.temp_id = fallbackId;
    }

    const groupId =
      target?.course_group_id ??
      target?.courseGroupId ??
      fallback?.course_group_id ??
      fallback?.courseGroupId ??
      fallback?.course_group?.id ??
      group?.id ??
      null;
    if (groupId != null) {
      target.course_group_id = groupId;
      target.courseGroupId = groupId;
    }

    const resolvedDegree =
      target?.degree_id ??
      target?.degreeId ??
      fallback?.degree_id ??
      fallback?.degreeId ??
      this.level?.id ??
      null;
    if (resolvedDegree != null) {
      target.degree_id = resolvedDegree;
      target.degreeId = resolvedDegree;
    }

    const resolvedDateId =
      target?.course_date_id ??
      target?.courseDateId ??
      fallback?.course_date_id ??
      fallback?.courseDateId ??
      date?.id ??
      null;
    if (resolvedDateId != null) {
      target.course_date_id = resolvedDateId;
      target.courseDateId = resolvedDateId;
    }

    const maxParticipants =
      target?.max_participants ??
      fallback?.max_participants ??
      group?.max_participants ??
      this.level?.max_participants ??
      this.courseFormGroup?.controls?.['max_participants']?.value ??
      null;
    if (maxParticipants != null) {
      target.max_participants = maxParticipants;
    }
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
      if (values.length === 0) {
        return [];
      }
      if (values.every(v => typeof v === 'string' && (v as string).length <= 2)) {
        try {
          const parsed = JSON.parse(values.join(''));
          return Array.isArray(parsed) ? parsed as T[] : values as T[];
        } catch {
          return values as T[];
        }
      }
      return values as T[];
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

  private resolveIntervalId(date: any): any {
    if (!date) {
      return null;
    }
    return date.interval_id ?? date.intervalId ?? date.interval?.id ?? date.course_interval_id ?? date.courseIntervalId ?? null;
  }


  selectUser: any[] = []
  async getAvail(item: any) {
    const monitor = await this.getAvailable({ date: item.date, endTime: item.hour_end, minimumDegreeId: this.level.id, sportId: this.courseFormGroup.controls['sport_id'].value, startTime: item.hour_start })
    this.monitors = Array.isArray(monitor?.data) ? monitor.data : [];
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

      // Filter by interval_id if provided
      if (this.interval_id != null) {
        const currentIntervalId = this.resolveIntervalId(date);
        if (this.interval_id === '__null__') {
          if (currentIntervalId != null) {
            return;
          }
        } else if (String(currentIntervalId ?? '') !== String(this.interval_id)) {
          return;
        }
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

    indexes.forEach(idx => {
      const date = dates[idx];
      if (!date) {
        return;
      }

      const subgroup = this.getSubgroupForDate(date);
      const subgroupId = this.extractSubgroupId(subgroup) ?? this.resolveSubgroupIdFromDate(idx);
      if (!subgroupId) {
        return;
      }

      const currentDateId = date?.id ?? null;

      bookingUsers.forEach((user: any) => {
        const userCourseDateId = this.getUserCourseDateId(user);
        const userSubgroupId = this.getUserSubgroupId(user);
        if (
          user?.id != null &&
          (currentDateId == null || userCourseDateId === currentDateId) &&
          userSubgroupId === subgroupId
        ) {
          result.add(user.id);
        }
      });
    });

    return Array.from(result);
  }

  private getMonitorIdAt(index: number): number | null {
    const dates = this.getCourseDates();
    const date = dates[index];
    if (!date) {
      return null;
    }

    const subgroup = this.getSubgroupForDate(date);
    if (subgroup) {
      const monitorId =
        subgroup?.monitor_id ??
        subgroup?.monitorId ??
        subgroup?.monitor?.id ??
        null;
      if (monitorId !== null && monitorId !== undefined && monitorId !== '') {
        const numeric = Number(monitorId);
        if (!Number.isNaN(numeric)) {
          return numeric;
        }
      }
    }

    const fallbackGroupSubgroups = this.getSubgroupsArray(this.group);
    const fallbackSubgroup = fallbackGroupSubgroups.length > this.subgroup_index
      ? fallbackGroupSubgroups[this.subgroup_index]
      : null;
    if (fallbackSubgroup) {
      const fallbackMonitorId =
        fallbackSubgroup?.monitor_id ??
        fallbackSubgroup?.monitorId ??
        fallbackSubgroup?.monitor?.id ??
        null;
      if (fallbackMonitorId !== null && fallbackMonitorId !== undefined && fallbackMonitorId !== '') {
        const numeric = Number(fallbackMonitorId);
        if (!Number.isNaN(numeric)) {
          return numeric;
        }
      }
    }

    return null;
  }

  private resolveFallbackSubgroupId(index: number): number | null {
    const date = this.getCourseDates()[index];
    const dateSubgroup = this.getSubgroupForDate(date);

    // Si el subgroup de la fecha tiene ID, usarlo
    const dateSubgroupId = this.extractSubgroupId(dateSubgroup);
    if (dateSubgroupId != null) {
      console.log('[resolveFallbackSubgroupId] Found subgroup ID from date:', dateSubgroupId);
      return dateSubgroupId;
    }

    const dateDerivedId = this.resolveSubgroupIdFromDate(index);
    if (dateDerivedId != null) {
      console.log('[resolveFallbackSubgroupId] Found subgroup ID from course date data:', dateDerivedId);
      return dateDerivedId;
    }

    // Si no, usar el subgroup del group (que tiene los IDs guardados)
    const groupSubgroups = this.getSubgroupsArray(this.group);
    const matchingSubgroup = groupSubgroups.find((sg: any) =>
      (sg?.degree_id ?? sg?.degreeId) === this.level?.id
    );

    const matchingSubgroupId = this.extractSubgroupId(matchingSubgroup);
    if (matchingSubgroupId != null) {
      console.log('[resolveFallbackSubgroupId] Found subgroup ID from group:', matchingSubgroupId);
      return matchingSubgroupId;
    }

    // Si hay múltiples subgrupos del mismo nivel, usar el índice
    const levelSubgroups = groupSubgroups.filter((sg: any) =>
      (sg?.degree_id ?? sg?.degreeId) === this.level?.id
    );
    if (levelSubgroups.length > this.subgroup_index) {
      const subgroupId = this.extractSubgroupId(levelSubgroups[this.subgroup_index]);
      if (subgroupId != null) {
        console.log('[resolveFallbackSubgroupId] Found subgroup ID by index:', subgroupId);
        return subgroupId;
      }
    }

    console.warn('[resolveFallbackSubgroupId] No subgroup ID found. date:', date, 'dateSubgroup:', dateSubgroup, 'group:', this.group);
    return null;
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
      const intervalIds = new Set(courseDates.map(date => String(this.resolveIntervalId(date) ?? 'null')));
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

      const selectedIntervalId = this.resolveIntervalId(selectedDate);

      // Si no hay interval_id, considerar todas las fechas del mismo horario
      if (selectedIntervalId == null) {
        return courseDates
          .map((date, index) => ({ date, index }))
          .filter(item => this.resolveIntervalId(item.date) == null)
          .map(item => item.index);
      }

      // Obtener todas las fechas con el mismo interval_id
      return courseDates
        .map((date, index) => ({ date, index }))
        .filter(item => {
          const itemIntervalId = this.resolveIntervalId(item.date);
          return itemIntervalId === selectedIntervalId || String(itemIntervalId) === String(selectedIntervalId);
        })
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
      let currentIntervalKey: string | null = null;
      let currentCount = 0;
      let currentIntervalName = '';

      datesForSubgroup.forEach((entry) => {
        const date = entry.date;
        const intervalId = this.resolveIntervalId(date);
        const intervalKey = String(intervalId ?? 'null');

        if (intervalKey !== currentIntervalKey) {
          // Guardar el grupo anterior si existe
          if (currentCount > 0) {
            headers.push({ name: currentIntervalName, colspan: currentCount });
          }

          // Iniciar nuevo grupo
          currentIntervalKey = intervalKey;
          currentCount = 1;

          // Buscar el nombre del intervalo
          const interval = intervals.find((i: any) => {
            const candidate = i?.id ?? i?.intervalId ?? i?.interval_id ?? null;
            return String(candidate ?? 'null') === intervalKey;
          });
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

  ngOnChanges(changes: SimpleChanges): void {
    // Invalidate cache when interval_id changes
    if (changes['interval_id']) {
      this.invalidateDatesCache();
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
    const groupSubgroups = this.getSubgroupsArray(this.group);
    this.selectedSubgroup = groupSubgroups.length > this.subgroup_index ? groupSubgroups[this.subgroup_index] : null;
    this.cambiarModal = true;
  }

  Date = (v: string): Date => new Date(v)

  async SelectMonitor(event: any, selectDate: number) {
    const monitorCandidate = this.normalizeMonitorSelection(event?.option?.value ?? event ?? null);
    const monitorIdRaw = monitorCandidate?.id ?? monitorCandidate?.monitor_id ?? null;
    const monitorId = monitorIdRaw !== null && monitorIdRaw !== undefined && monitorIdRaw !== ''
      ? Number(monitorIdRaw)
      : null;
    const courseDates = this.getCourseDates();
    const baseSubgroup = this.getSubgroupForDate(courseDates?.[selectDate]);

    console.log('[SelectMonitor] Start:', { monitorCandidate, monitorId, selectDate, baseSubgroup });

    if (monitorId == null || Number.isNaN(monitorId)) {
      console.warn('[SelectMonitor] Unable to resolve monitor ID from selection:', event);
      this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      return;
    }

    if (monitorCandidate && monitorId != null && !Number.isNaN(monitorId)) {
      monitorCandidate.id = monitorId;
    }
    const baseMonitorIdRaw = baseSubgroup?.monitor_id ?? baseSubgroup?.monitorId ?? baseSubgroup?.monitor?.id ?? null;
    const baseMonitorId = baseMonitorIdRaw !== null && baseMonitorIdRaw !== undefined && baseMonitorIdRaw !== ''
      ? Number(baseMonitorIdRaw)
      : null;

    if (baseMonitorId !== null && !Number.isNaN(baseMonitorId) && baseMonitorId === monitorId) {
      console.log('[SelectMonitor] Monitor already assigned, skipping');
      return;
    }

    const { startIndex, endIndex } = this.resolveAssignmentIndexes(selectDate);
    const targetIndexes = this.buildTargetIndexes(startIndex, endIndex);
    if (targetIndexes.length === 0) {
      console.warn('[SelectMonitor] No target indexes resolved for assignment.');
      this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      return;
    }

    const bookingUserIds = this.collectBookingUserIds(targetIndexes);

    console.log('[SelectMonitor] Indexes and users:', { startIndex, endIndex, targetIndexes, bookingUserIds });

    const applyLocalUpdate = () => {
      const changeStates: Record<number, 'assigned' | 'modified'> = {};
      targetIndexes.forEach(idx => {
        const existingMonitorId = this.getMonitorIdAt(idx);
        let changeState: 'assigned' | 'modified' = 'assigned';
        if (existingMonitorId !== null) {
          if (monitorId === null || monitorId !== existingMonitorId) {
            changeState = 'modified';
          }
        }
        changeStates[idx] = changeState;
        this.modified[idx] = changeState === 'modified';
      });
      this.monitorSelect.emit({
        monitor: monitorCandidate,
        indexes: [...targetIndexes],
        scope: this.assignmentScope,
        changeStates
      });
      this.invalidateDatesCache();
    };

    const isUpdateMode = this.mode === 'update';
    let callsMade = 0;
    let apiError: any = null;
    let unresolvedSubgroups = false;

    try {
      if (isUpdateMode) {
        const primarySubgroupId = this.resolveFallbackSubgroupId(targetIndexes[0]);
        if (!primarySubgroupId && bookingUserIds.length > 0) {
          console.warn('[SelectMonitor] Unable to resolve subgroup ID for monitor re-assignment with booking users.');
          unresolvedSubgroups = true;
        }

        if (bookingUserIds.length > 0 && primarySubgroupId != null) {
          const payload = {
            monitor_id: monitorId,
            booking_users: bookingUserIds,
            subgroup_id: primarySubgroupId
          };
          console.log('[SelectMonitor] Calling API with users:', payload);
          await firstValueFrom(this.monitorsService.transferMonitor(payload));
          callsMade++;
        } else if (bookingUserIds.length === 0) {
          console.log('[SelectMonitor] No users, will call API per subgroup');
          for (const idx of targetIndexes) {
            const subgroupId = this.resolveFallbackSubgroupId(idx);
            console.log('[SelectMonitor] Processing index:', idx, 'subgroupId:', subgroupId);
            if (subgroupId != null) {
              const payload = {
                monitor_id: monitorId,
                booking_users: [],
                subgroup_id: subgroupId
              };
              console.log('[SelectMonitor] Calling API for subgroup:', payload);
              await firstValueFrom(this.monitorsService.transferMonitor(payload));
              callsMade++;
            } else {
              console.warn('[SelectMonitor] No subgroup ID for index:', idx);
              unresolvedSubgroups = true;
            }
          }
        } else if (bookingUserIds.length > 0) {
          unresolvedSubgroups = true;
        }
      }

      console.log('[SelectMonitor] Total API calls made:', callsMade);
    } catch (error) {
      apiError = error;
      console.error('[SelectMonitor] Error occurred while assigning monitor:', error);
      if (error?.error?.message && error.error.message.includes('Overlap')) {
        this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
      } else {
        this.snackbar.open(this.translateService.instant('event_overlap'), 'OK', { duration: 3000 });
      }
    }

    if (!apiError) {
      applyLocalUpdate();
      if (callsMade > 0) {
        this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
      }
      if (unresolvedSubgroups) {
        this.snackbar.open('Guarda el curso primero para que este monitor se sincronice con la base de datos.', 'OK', { duration: 4000 });
      }
    }
  }

  private normalizeMonitorSelection(rawValue: any): any | null {
    if (rawValue == null) {
      return null;
    }

    const monitorList = Array.isArray(this.monitors) ? this.monitors : [];

    if (typeof rawValue === 'object') {
      if (rawValue.monitor && typeof rawValue.monitor === 'object') {
        return rawValue.monitor;
      }
      return rawValue;
    }

    const numericId = Number(rawValue);
    if (!Number.isNaN(numericId)) {
      const found =
        monitorList.find((monitor: any) => Number(monitor?.id) === numericId) ??
        monitorList.find((monitor: any) => Number(monitor?.monitor_id) === numericId) ??
        monitorList.find((monitor: any) => Number(monitor?.monitor?.id) === numericId)?.monitor;

      if (found) {
        return found.monitor ? found.monitor : found;
      }

      return { id: numericId };
    }

    return null;
  }

  /**
   * Emit timing event for the subgroup
   * Abre el modal incluso si no hay alumnos (se mostrarÃ¡ vacÃ­o)
   */
  onTimingClick(): void {
    const courseDates = this.getCourseDates();
    const selectedDateObj = courseDates?.[this.selectDate] || courseDates?.[0] || null;
    const fallbackSubgroups = this.getSubgroupsArray(this.group);
    const subGroup = this.getSubgroupForDate(selectedDateObj) ?? (fallbackSubgroups.length > this.subgroup_index ? fallbackSubgroups[this.subgroup_index] : null);

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
      const subgroupId = this.extractSubgroupId(subgroup);
        if (subgroupId == null) {
          return;
        }
        this.toArray(date?.booking_users_active).forEach(user => {
          const userSubgroupId = this.getUserSubgroupId(user);
          if (userSubgroupId === subgroupId) {
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
      const subgroupId = this.extractSubgroupId(subgroup);
        if (subgroupId == null) continue;
        const bookingUsersActive = this.toArray(date?.booking_users_active);
        if (bookingUsersActive.some((user: any) => this.getUserSubgroupId(user) === subgroupId)) {
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
        const subgroupId = this.extractSubgroupId(subgroup);
          return subgroupId === userSubgroupId;
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
      const bookingUsersActive = this.toArray(dateItem?.booking_users_active);
      const fallbackGroupSubgroups = this.getSubgroupsArray(this.group);
      const fallbackSubgroup = fallbackGroupSubgroups.length > this.subgroup_index ? fallbackGroupSubgroups[this.subgroup_index] : null;
      const fallbackSubgroupId = this.extractSubgroupId(fallbackSubgroup);
      const subgroupId = this.extractSubgroupId(subgroup) ?? fallbackSubgroupId;

      let currentCount = 0;
      if (subgroupId != null) {
        currentCount = bookingUsersActive.filter((user: any) => {
          const userSubgroupId = this.getUserSubgroupId(user);
          return userSubgroupId === subgroupId;
        }).length;
      }

      if (currentCount === 0) {
        const embeddedUsers = this.toArray(subgroup?.booking_users ?? fallbackSubgroup?.booking_users);
        currentCount = embeddedUsers.length;
      }

      const maxCapacity =
        subgroup?.max_participants ??
        fallbackSubgroup?.max_participants ??
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
    const dateLevelSubgroups = this.getSubgroupsArray(date)
      .filter((sg: any) => (sg?.degree_id ?? sg?.degreeId) === degreeId)
      .filter((sg: any) => {
        const sgDateId = sg?.course_date_id ?? sg?.courseDateId ?? sg?.date_id ?? null;
        return !dateId || !sgDateId || sgDateId === dateId;
      });

    const group = (date?.course_groups || [])
      .find((g: any) => (g?.degree_id ?? g?.degreeId) === degreeId);
    const groupSubgroups = this.getSubgroupsArray(group)
      .filter((sg: any) => {
        const sgDateId = sg?.course_date_id ?? sg?.courseDateId ?? sg?.date_id ?? null;
        return !dateId || !sgDateId || sgDateId === dateId;
      });

    if (dateLevelSubgroups.length > this.subgroup_index) {
      const candidate = dateLevelSubgroups[this.subgroup_index];
      const fallback = groupSubgroups.length > this.subgroup_index ? groupSubgroups[this.subgroup_index] : null;
      this.hydrateSubgroupIdentity(candidate, fallback, group, date);
      return candidate;
    }

    if (groupSubgroups.length > this.subgroup_index) {
      const candidate = groupSubgroups[this.subgroup_index];
      this.hydrateSubgroupIdentity(candidate, candidate, group, date);
      return candidate;
    }

    return null;
  }

  private getSubgroupIdsAcrossDates(): Set<number> {
    const ids = new Set<number>();
    const courseDates = this.getCourseDates();
    courseDates.forEach(date => {
      const subgroup = this.getSubgroupForDate(date);
      const subgroupId = this.extractSubgroupId(subgroup);
      if (subgroupId != null) {
        ids.add(subgroupId);
      }
    });
    return ids;
  }
}











