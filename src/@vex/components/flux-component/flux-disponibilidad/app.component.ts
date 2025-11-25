import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { ApiCrudService } from 'src/service/crud.service';
import { MonitorTransferPayload, MonitorsService } from 'src/service/monitors.service';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MonitorAssignmentDialogData, MonitorAssignmentDialogResult, MonitorAssignmentDialogComponent, MonitorAssignmentScope, MonitorAssignmentDialogDateOption } from 'src/app/pages/timeline/monitor-assignment-dialog/monitor-assignment-dialog.component';
import { ConfirmModalComponent } from 'src/app/pages/monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import { MonitorAssignmentLoadingDialogComponent } from 'src/app/shared/dialogs/monitor-partial-availability/monitor-assignment-loading-dialog.component';
import { MonitorAssignmentSyncService, MonitorAssignmentSyncEvent } from 'src/app/shared/services/monitor-assignment-sync.service';
import { MonitorAssignmentHelperService, MonitorAssignmentSlot } from 'src/app/shared/services/monitor-assignment-helper.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'vex-flux-disponibilidad',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FluxDisponibilidadComponent implements OnInit, OnDestroy {
  cambiarModal: boolean = false
  @Input() mode: 'create' | 'update' = "create"
  @Input() courseFormGroup!: UntypedFormGroup
  @Input() level!: any
  @Input() group!: any
  @Input() subgroup_index!: number
  @Input() set interval_id(value: string | null | undefined) {
    this._interval_id = value || null;
    this.invalidateDatesCache();
  }
  get interval_id(): string | null | undefined {
    return this._interval_id;
  }
  private _interval_id: string | null | undefined = null;

  @Input() set intervalIndex(value: number | undefined) {
    if (value !== undefined && value !== null) {
      // Convertir intervalIndex al interval_id correspondiente
      try {
        const intervals = this.extractIntervals();
        if (intervals && intervals.length > value && intervals[value]) {
          this.interval_id = String(intervals[value].id);
        }
      } catch (error) {
        console.warn('Error extracting intervals in intervalIndex setter:', error);
      }
    }
  }

  @Output() monitorSelect = new EventEmitter<any>()
  @Output() viewTimes = new EventEmitter<any>()

  modified: any[] = []
  modified2: any[] = []
  private availabilityCache = new Map<number, any[]>();
  private monitorSelectionInProgress = false;
  private static instanceCounter = 0;
  private readonly componentInstanceId = `flux-${++FluxDisponibilidadComponent.instanceCounter}`;
  private syncSub?: Subscription;
  private loadingDialogRef?: MatDialogRef<MonitorAssignmentLoadingDialogComponent>;
  selectedSubgroup: any;
  today: Date = new Date()
  ISODate = (n: number) => new Date(new Date().getTime() + n * 24 * 60 * 60 * 1000).toLocaleString()
  find = (array: any[], key: string, value: string) => array.find((a: any) => a[key] === value)

  displayFn = (value: any): string => value
  selectDate: number = 0
  assignmentScope: 'single' | 'interval' | 'from' | 'range' | 'all' = 'single';
  assignmentStartIndex = 0;
  assignmentEndIndex = 0;
  private _cachedDatesForSubgroup: Array<{ date: any, index: number }> | null = null;
  private _cachedIntervalHeaders: Array<{ name: string; colspan: number }> | null = null;

  // Cache for template to avoid calling getDatesForSubgroup() multiple times per render cycle
  cachedDatesForTemplate: Array<{ date: any, index: number }> = [];

  constructor(
    private crudService: ApiCrudService,
    private monitorsService: MonitorsService,
    private snackbar: MatSnackBar,
    private translateService: TranslateService,
    private dialog: MatDialog,
    private assignmentSync: MonitorAssignmentSyncService,
    private assignmentHelper: MonitorAssignmentHelperService,
    private cdr: ChangeDetectorRef
  ) { }
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
  monitors: any[] = [];
  monitorSearchTerm: string = '';

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

  private isCollectiveCourse(): boolean {
    const value = Number(this.courseFormGroup?.controls?.['course_type']?.value);
    if (Number.isNaN(value)) {
      return true;
    }
    return value === 1;
  }

  private normalizeId(value: any): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = String(value).trim();
    return normalized === '' ? null : normalized;
  }

  private resolveIntervalId(date: any): any {
    if (!date) {
      return null;
    }
    return date.interval_id ?? date.intervalId ?? date.interval?.id ?? date.course_interval_id ?? date.courseIntervalId ?? null;
  }

  selectUser: any[] = []
  async getAvail(item: any, index?: number): Promise<void> {
    const targetIndex = index ?? this.selectDate;
    if (!item) {
      this.availabilityCache.delete(targetIndex);
      if (targetIndex === this.selectDate) {
        this.monitors = [];
      }
      return;
    }

    const bookingUserIds = this.collectBookingUserIds([targetIndex]);
    const subgroupIds = this.collectSubgroupIds([targetIndex]);
    const payload = {
      date: item.date,
      endTime: item.hour_end,
      minimumDegreeId: this.level.id,
      sportId: this.courseFormGroup.controls['sport_id'].value,
      startTime: item.hour_start,
      bookingUserIds,
      subgroupIds,
      courseId: this.courseFormGroup?.controls['id']?.value ?? null
    };

    try {
      const monitor = await this.getAvailable(payload);
      const sortedList = this.sortMonitorsList(monitor.data || []);
      this.availabilityCache.set(targetIndex, sortedList);
      if (targetIndex === this.selectDate) {
        this.monitors = sortedList;
      }
    } catch (error) {
      console.error('Error loading monitor availability for date', payload, error);
      this.availabilityCache.delete(targetIndex);
      if (targetIndex === this.selectDate) {
        this.monitors = [];
      }
    }

    // Mark for check to trigger change detection with OnPush
    this.cdr.markForCheck();
  }
  booking_users: any

  private getSelectedDateForCurrentSubgroup(): any | null {
    const courseDates = this.getCourseDates();
    if (!courseDates.length) {
      return null;
    }

    const safeIndex = Math.min(Math.max(this.selectDate, 0), courseDates.length - 1);
    const candidate = courseDates[safeIndex];

    if (candidate && this.getSubgroupForDate(candidate)) {
      return candidate;
    }

    const visibleDates = this.getDatesForSubgroup();
    if (visibleDates.length > 0) {
      return visibleDates[0].date;
    }

    return null;
  }

  private collectUsersForSelectedDate(): any[] {
    const selectedDate = this.getSelectedDateForCurrentSubgroup();
    if (!selectedDate) {
      return [];
    }

    const levelId = this.normalizeId(this.level?.id ?? this.level?.degree_id);
    const selectedSubgroup = this.getSubgroupForDate(selectedDate);
    const selectedSubgroupId = this.normalizeId(selectedSubgroup?.id);
    const selectedDateId = this.normalizeId(selectedDate?.id);

    const seen = new Set<string | number>();
    const result: any[] = [];

    const pushUser = (user: any, enforceDateMatch: boolean) => {
      if (!user) {
        return;
      }

      const userLevelId = this.normalizeId(user?.degree_id ?? user?.degreeId ?? user?.degree?.id);
      if (levelId && userLevelId && userLevelId !== levelId) {
        return;
      }

      const userSubgroupId = this.normalizeId(this.getUserSubgroupId(user));
      if (selectedSubgroupId) {
        if (!userSubgroupId || userSubgroupId !== selectedSubgroupId) {
          return;
        }
      }

      if (enforceDateMatch) {
        const userDateId = this.normalizeId(this.getUserCourseDateId(user));

        if (selectedDateId) {
          if (!userDateId || userDateId !== selectedDateId) {
            return;
          }
        } else if (userDateId) {
          return;
        }
      }

      const clientId = user?.client_id ??
        user?.client?.id ??
        user?.booking_user_id ??
        user?.id;

      if (clientId == null || seen.has(clientId)) {
        return;
      }

      seen.add(clientId);
      result.push(user);
    };

    this.toArray(selectedDate?.booking_users_active).forEach(user => pushUser(user, false));
    this.toArray(selectedDate?.booking_users).forEach(user => pushUser(user, false));
    this.toArray(selectedSubgroup?.booking_users).forEach(user => pushUser(user, true));

    const globalBookingUsers = this.courseFormGroup?.controls['booking_users']?.value || [];
    globalBookingUsers.forEach(user => pushUser(user, true));

    return result;
  }

  /**
   * Obtiene solo los usuarios que tienen reserva en la fecha seleccionada (selectDate)
   * Útil para mostrar solo los alumnos relevantes cuando se hace clic en una fecha específica
   */
  getUsersForSelectedDate(): any[] {
    return this.collectUsersForSelectedDate();
  }

  /**
   * Obtiene los usuarios que pertenecen al subgrupo actual Y que tienen reservas en las fechas visibles
   * Filtra por:
   * - level.id (degree_id)
   * - subgroup_index (el subgrupo específico de este componente)
   * - interval_id si está configurado
   * - Que el usuario tenga reserva en alguna de las fechas visibles
   */
  getFilteredBookingUsers(): any[] {
    return this.collectUsersForSelectedDate();
  }

  onAssignmentScopeChange(scope: 'single' | 'interval' | 'from' | 'range' | 'all'): void {
    if (!this.isCollectiveCourse()) {
      this.assignmentScope = 'single';
      this.assignmentStartIndex = this.selectDate;
      this.assignmentEndIndex = this.selectDate;
      return;
    }
    this.assignmentScope = scope;
    const total = this.getCourseDates().length;
    if (scope === 'single' || total <= 1) {
      this.assignmentStartIndex = this.selectDate;
      this.assignmentEndIndex = this.selectDate;
      return;
    }
    if (scope === 'all') {
      this.assignmentStartIndex = 0;
      this.assignmentEndIndex = total > 0 ? total - 1 : this.selectDate;
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
    const cached = this.availabilityCache.get(index);
    if (cached) {
      this.monitors = cached;
    } else {
      this.getAvail(item, index);
    }
  }

  private resolveAssignmentIndexes(selectDate: number): { startIndex: number; endIndex: number } {
    const total = this.getCourseDates().length;
    if (total === 0) {
      return { startIndex: selectDate, endIndex: selectDate };
    }
    if (this.assignmentScope === 'single' || total === 1) {
      return { startIndex: selectDate, endIndex: selectDate };
    }
    if (this.assignmentScope === 'all') {
      return { startIndex: 0, endIndex: total - 1 };
    }
    if (this.assignmentScope === 'interval') {
      if (this.assignmentStartIndex !== undefined && this.assignmentEndIndex !== undefined && this.assignmentStartIndex !== this.assignmentEndIndex) {
        const startIdx = Math.max(0, Math.min(this.assignmentStartIndex, total - 1));
        const endIdx = Math.max(0, Math.min(this.assignmentEndIndex, total - 1));
        return {
          startIndex: Math.min(startIdx, endIdx),
          endIndex: Math.max(startIdx, endIdx)
        };
      }
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

  private buildTargetIndexesFromSelection(selectDate: number): number[] {
    const { startIndex, endIndex } = this.resolveAssignmentIndexes(selectDate);
    return this.buildTargetIndexes(startIndex, endIndex);
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
    this.availabilityCache.clear();

    // Update template cache when interval changes
    this.cachedDatesForTemplate = this.getDatesForSubgroup();
    this.rebuildLegendState();

    // Mark for check to trigger change detection with OnPush
    this.cdr.markForCheck();
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

  onMonitorSearchInput(event: Event): void {
    this.monitorSearchTerm = (event.target as HTMLInputElement)?.value ?? '';
  }

  get filteredMonitorsForSelect(): any[] {
    const term = (this.monitorSearchTerm || '').trim().toLowerCase();
    return (this.monitors || []).filter(monitor => {
      const label = this.getMonitorDisplayName(monitor).toLowerCase();
      return !term || label.includes(term);
    });
  }

  private sortMonitorsList(list: any[]): any[] {
    return [...(list || [])].sort((a, b) => {
      const nameA = this.getMonitorDisplayName(a);
      const nameB = this.getMonitorDisplayName(b);
      return nameA.localeCompare(nameB);
    });
  }

  getMonitorDisplayName(monitor: any): string {
    if (!monitor) return '';
    const first = monitor.first_name ?? monitor.firstName ?? '';
    const last = monitor.last_name ?? monitor.lastName ?? '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    if (monitor.name) return monitor.name;
    return '';
  }

  getSelectedMonitorForDate(index: number = this.selectDate): any | null {
    const courseDates = this.getCourseDates();
    const date = courseDates?.[index];
    const subgroup = this.getSubgroupForDate(date);
    return subgroup?.monitor ?? null;
  }

  getSelectedMonitorIdForDate(): number | null {
    return this.getSelectedMonitorIdForIndex(this.selectDate);
  }

  private getSelectedMonitorIdForIndex(index: number): number | null {
    const subgroup = this.getSubgroupForDate(this.getCourseDates()?.[index]);
    if (!subgroup) {
      return null;
    }
    if (subgroup.monitor?.id != null) {
      return subgroup.monitor.id;
    }
    if (subgroup.monitor_id != null) {
      return subgroup.monitor_id;
    }
    return null;
  }

  shouldShowSelectedMonitorOption(): boolean {
    const selectedMonitor = this.getSelectedMonitorForDate();
    if (!selectedMonitor) {
      return false;
    }
    return !this.filteredMonitorsForSelect.some(m => m.id === selectedMonitor.id);
  }

  getSelectedMonitorDisplayName(): string {
    return this.getMonitorDisplayName(this.getSelectedMonitorForDate());
  }

  private findMonitorById(id: number | null | undefined): any | null {
    if (id === null || id === undefined) {
      return null;
    }
    const byFiltered = this.filteredMonitorsForSelect.find(m => m.id === id);
    if (byFiltered) {
      return byFiltered;
    }
    const selectedMonitor = this.getSelectedMonitorForDate();
    if (selectedMonitor?.id === id) {
      return selectedMonitor;
    }
    return (this.monitors || []).find(m => m.id === id) ?? null;
  }

  private collectSubgroupIds(indexes: number[]): number[] {
    const dates = this.getCourseDates();
    const ids = new Set<number>();

    indexes.forEach(idx => {
      const date = dates[idx];
      if (!date) {
        return;
      }
      const subgroup = this.getSubgroupForDate(date);
      if (subgroup?.id) {
        ids.add(subgroup.id);
      }
    });

    return Array.from(ids);
  }

  private buildMonitorTransferPayload(
    monitorId: number | null,
    indexes: number[],
    scopeOverride?: MonitorAssignmentScope
  ): MonitorTransferPayload {
    const bookingUserIds = this.collectBookingUserIds(indexes);
    const { startDate, endDate } = this.resolveAssignmentDateRangeFromIndexes(indexes);
    const courseDates = this.getCourseDates();
    const primaryDate = courseDates[indexes[0]] || null;
    const subgroup = this.getSubgroupForDate(primaryDate);
    const courseId = this.courseFormGroup?.controls['id']?.value ?? null;
    const subgroupIds = this.collectSubgroupIds(indexes);
    const scopeToUse = scopeOverride ?? this.assignmentScope;
    const finalScope: MonitorAssignmentScope = this.isCollectiveCourse() ? scopeToUse : 'single';

    const payload: MonitorTransferPayload = {
      monitor_id: monitorId,
      booking_users: bookingUserIds,
      scope: finalScope,
      start_date: startDate,
      end_date: endDate,
      course_id: courseId,
      booking_id: null,
      subgroup_id: subgroup?.id ?? null,
      course_subgroup_id: subgroup?.id ?? null,
      course_date_id: finalScope === 'single' ? primaryDate?.id ?? null : null,
      subgroup_ids: subgroupIds
    };

    if (finalScope !== 'single') {
      payload.course_date_id = null;
    }

    return payload;
  }

  private resolveAssignmentDateRangeFromIndexes(indexes: number[]): { startDate: string | null; endDate: string | null } {
    if (!indexes.length) {
      return { startDate: null, endDate: null };
    }

    const courseDates = this.getCourseDates();
    const sorted = indexes.slice().sort((a, b) => a - b);
    const startDate = this.normalizeCourseDateValue(courseDates[sorted[0]]);
    const endDate = this.normalizeCourseDateValue(courseDates[sorted[sorted.length - 1]]);

    return {
      startDate,
      endDate
    };
  }

  private normalizeCourseDateValue(date: any): string | null {
    if (!date) {
      return null;
    }
    const raw = date?.date ?? date?.date_start ?? date?.date_start_res ?? date?.date_end ?? date?.dateEnd ?? date?.dateFormatted ?? date;
    if (!raw) {
      return null;
    }

    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      return typeof raw === 'string' ? raw : null;
    }
    return parsed.toISOString().slice(0, 10);
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
          const intervalId = this.resolveIntervalId(item.date);
          return intervalId === selectedIntervalId || String(intervalId ?? '') === String(selectedIntervalId ?? '');
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
    // Cache the dates to avoid multiple function calls in template
    this.cachedDatesForTemplate = this.getDatesForSubgroup();
    const availableDates = this.cachedDatesForTemplate;

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
      this.getAvail(availableDates[0].date, this.selectDate);
    }

    const bookingUsers = this.courseFormGroup?.controls['booking_users']?.value || [];
    this.booking_users = bookingUsers.filter((user: any, index: any, self: any) =>
      index === self.findIndex((u: any) => u.client_id === user.client_id)
    );

    this.rebuildLegendState();

    const courseId = this.courseFormGroup?.controls?.['id']?.value ?? null;
    this.syncSub = this.assignmentSync.changes$.subscribe(event => {
      if (event.sourceId === this.componentInstanceId) {
        return;
      }
      if (event.courseId && courseId && Number(event.courseId) !== Number(courseId)) {
        return;
      }
      this.handleExternalAssignmentEvent();
    });

    // Mark for check to ensure OnPush change detection runs after init
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
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
    // Obtener el subgrupo de la fecha seleccionada actual
    const courseDates = this.getCourseDates();
    const selectedDate = courseDates[this.selectDate];
    this.selectedSubgroup = this.getSubgroupForDate(selectedDate);

    // Fallback al método anterior si no encontramos el subgrupo
    if (!this.selectedSubgroup) {
      this.selectedSubgroup = this.group?.course_subgroups?.[this.subgroup_index];
    }

    this.cambiarModal = true;
  }

  Date = (v: string): Date => new Date(v)

  async onMonitorSelectionChange(event: MatSelectChange, selectDate: number): Promise<void> {
    const previousMonitorId = this.getSelectedMonitorIdForIndex(selectDate);
    if (this.monitorSelectionInProgress) {
      this.restoreSelectValue(event.source, previousMonitorId);
      return;
    }

    if ((event.value ?? null) === previousMonitorId) {
      return;
    }

    this.monitorSelectionInProgress = true;
    try {
      const selectedMonitor = this.findMonitorById(event.value ?? null);
      const success = await this.runMonitorSelectionFlow(selectedMonitor ?? null, selectDate);
      if (!success) {
        this.restoreSelectValue(event.source, previousMonitorId);
      }
    } finally {
      this.monitorSelectionInProgress = false;
    }
  }

  private async runMonitorSelectionFlow(monitor: any | null, selectDate: number): Promise<boolean> {
    const courseDates = this.getCourseDates();
    const baseDate = courseDates?.[selectDate];
    if (!baseDate) {
      return false;
    }

    const confirmed = await this.confirmPastDateIfNeeded(baseDate);
    if (!confirmed) {
      return false;
    }

    if (!this.isCollectiveCourse()) {
      this.assignmentScope = 'single';
      this.assignmentStartIndex = selectDate;
      this.assignmentEndIndex = selectDate;
    } else {
      const scopeSelection = await this.openMonitorAssignmentScopeDialog(monitor, selectDate);
      if (!scopeSelection) {
        return false;
      }
      this.applyDialogSelection(scopeSelection, selectDate);
    }

    const originalIndexes = this.buildTargetIndexesFromSelection(selectDate);
    if (!originalIndexes.length) {
      return false;
    }

    const filteredIndexes = await this.filterIndexesByAvailability(monitor, originalIndexes);
    if (!filteredIndexes?.length) {
      return false;
    }

    const forceSplit = filteredIndexes.length !== originalIndexes.length;
    const affectedIndexes = await this.applyMonitorSelection(
      monitor,
      selectDate,
      filteredIndexes,
      { forceSplitSequences: forceSplit }
    );
    if (!affectedIndexes.length) {
      return false;
    }

    await this.refreshAvailabilityForIndexes(affectedIndexes);
    this.rebuildLegendState(affectedIndexes);
    return true;
  }

  private async confirmPastDateIfNeeded(date: any): Promise<boolean> {
    if (!this.isSessionInPast(date)) {
      return true;
    }

    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: {
        title: this.translateWithFallback('monitor_assignment.past_warning_title', 'Fecha en el pasado'),
        message: this.translateWithFallback('monitor_assignment.past_warning_message', 'La fecha seleccionada es anterior a hoy. ¿Quieres continuar?'),
        confirmButtonText: this.translateWithFallback('continue', 'Continuar'),
        cancelButtonText: this.translateWithFallback('cancel', 'Cancelar')
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    return !!result;
  }

  private async openMonitorAssignmentScopeDialog(monitor: any | null, selectDate: number): Promise<MonitorAssignmentDialogResult | undefined> {
    const dateOptions = this.buildMonitorAssignmentDates();
    if (!dateOptions.length) {
      return undefined;
    }

    const courseDates = this.getCourseDates();
    const normalizedDefault = this.normalizeCourseDateValue(courseDates?.[selectDate]);
    const startDateValue = this.normalizeCourseDateValue(courseDates?.[this.assignmentStartIndex]);
    const endDateValue = this.normalizeCourseDateValue(courseDates?.[this.assignmentEndIndex]);

    const dialogData: MonitorAssignmentDialogData = {
      monitor,
      dates: dateOptions,
      defaultDate: normalizedDefault ?? dateOptions[0]?.value ?? null,
      intervalDates: this.buildIntervalDateValues(),
      hasMultipleIntervals: this.hasMultipleIntervals(),
      allowAllOption: dateOptions.length > 1,
      initialScope: (this.assignmentScope as MonitorAssignmentScope) ?? 'single',
      startDate: startDateValue ?? normalizedDefault ?? dateOptions[0]?.value ?? null,
      endDate: endDateValue ?? normalizedDefault ?? dateOptions[0]?.value ?? null
    };

    const dialogRef = this.dialog.open(MonitorAssignmentDialogComponent, {
      width: '420px',
      disableClose: true,
      autoFocus: false,
      data: dialogData
    });

    return await firstValueFrom(dialogRef.afterClosed());
  }

  private applyDialogSelection(selection: MonitorAssignmentDialogResult, selectDate: number): void {
    this.assignmentScope = selection.scope;
    const total = this.getCourseDates().length;
    const startIndex = this.findDateIndexByValue(selection.startDate);
    const endIndex = this.findDateIndexByValue(selection.endDate);

    if (selection.scope === 'single') {
      this.assignmentStartIndex = selectDate;
      this.assignmentEndIndex = selectDate;
      return;
    }

    if (selection.scope === 'all') {
      this.assignmentStartIndex = 0;
      this.assignmentEndIndex = total > 0 ? total - 1 : selectDate;
      return;
    }

    if (selection.scope === 'interval') {
      if (startIndex !== null && endIndex !== null) {
        this.assignmentStartIndex = startIndex;
        this.assignmentEndIndex = endIndex;
      } else {
        const indexes = this.getIntervalDateIndexes();
        this.assignmentStartIndex = indexes[0] ?? selectDate;
        this.assignmentEndIndex = indexes[indexes.length - 1] ?? selectDate;
      }
      return;
    }

    if (selection.scope === 'from') {
      this.assignmentStartIndex = startIndex ?? selectDate;
      this.assignmentEndIndex = total > 0 ? total - 1 : selectDate;
      return;
    }

    if (selection.scope === 'range') {
      const normalizedStart = startIndex ?? selectDate;
      const normalizedEnd = endIndex ?? normalizedStart;
      this.assignmentStartIndex = Math.min(normalizedStart, normalizedEnd);
      this.assignmentEndIndex = Math.max(normalizedStart, normalizedEnd);
      return;
    }
  }

  private async filterIndexesByAvailability(
    monitor: any | null,
    targetIndexes: number[]
  ): Promise<number[] | null> {
    if (!monitor?.id) {
      return targetIndexes;
    }

    const slots = this.buildSlotsFromIndexes(targetIndexes);
    if (!slots.length) {
      return [];
    }

    const availabilityContext = {
      bookingUserIds: this.collectBookingUserIds(targetIndexes),
      subgroupIds: this.collectSubgroupIds(targetIndexes),
      courseId: this.courseFormGroup?.controls['id']?.value ?? null
    };

    this.showLoadingDialog('monitor_assignment.loading_checking');
    let checkResult;
    try {
      checkResult = await this.assignmentHelper.checkMonitorAvailabilityForSlots(monitor.id, slots, availabilityContext);
    } finally {
      this.hideLoadingDialog();
    }
    if (!checkResult.blocked.length) {
      return targetIndexes;
    }

    const proceed = await this.assignmentHelper.confirmPartialAvailability(
      this.getMonitorDisplayName(monitor),
      checkResult
    );
    if (!proceed) {
      return null;
    }

    if (!checkResult.available.length) {
      this.snackbar.open(this.translateWithFallback('monitor_assignment.partial.no_available', 'El monitor no está disponible en ninguna de las fechas seleccionadas.'), 'OK', { duration: 4000 });
      return null;
    }

    return checkResult.available
      .map(slot => slot.context?.['index'])
      .filter((index): index is number => typeof index === 'number');
  }

  private buildSlotsFromIndexes(indexes: number[]): MonitorAssignmentSlot[] {
    const courseDates = this.getCourseDates();
    const sportId = this.courseFormGroup?.controls?.['sport_id']?.value ?? null;
    const slots: MonitorAssignmentSlot[] = [];

    indexes.forEach(idx => {
      const dateEntry = courseDates[idx];
      if (!dateEntry) {
        return;
      }

      const dateValue = this.normalizeCourseDateValue(dateEntry);
      const startTime = dateEntry?.hour_start ?? dateEntry?.start_time;
      const endTime = dateEntry?.hour_end ?? dateEntry?.end_time ?? startTime;

      if (!dateValue || !startTime) {
        return;
      }

      const label = this.assignmentHelper.formatSlotLabel(dateValue, startTime, endTime);

      const subgroup = this.getSubgroupForDate(dateEntry);
      const courseId = this.courseFormGroup?.controls?.['id']?.value ?? null;

      slots.push({
        date: dateValue,
        startTime,
        endTime,
        degreeId: this.level?.id,
        sportId,
        label,
        context: {
          index: idx,
          subgroupId: subgroup?.id ?? null,
          courseSubgroupId: subgroup?.id ?? null,
          courseId,
          currentMonitorId: subgroup?.monitor?.id ?? subgroup?.monitor_id ?? null,
          currentMonitorName: subgroup?.monitor ? this.getMonitorDisplayName(subgroup.monitor) : null
        }
      });
    });

    return slots;
  }

  private findDateIndexByValue(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const courseDates = this.getCourseDates();
    for (let i = 0; i < courseDates.length; i++) {
      if (this.normalizeCourseDateValue(courseDates[i]) === normalized) {
        return i;
      }
    }
    return null;
  }

  private async applyMonitorSelection(
    monitor: any | null,
    selectDate: number,
    targetIndexesOverride?: number[],
    options?: { forceSplitSequences?: boolean }
  ): Promise<number[]> {
    const courseDates = this.getCourseDates();
    const baseSubgroup = this.getSubgroupForDate(courseDates?.[selectDate]);
    const monitorId = monitor?.id ?? null;

    if (baseSubgroup && (baseSubgroup.monitor_id === monitorId || baseSubgroup.monitor?.id === monitorId)) {
      return [];
    }

    const targetIndexes = targetIndexesOverride ?? this.buildTargetIndexesFromSelection(selectDate);
    if (!targetIndexes.length) {
      return [];
    }

    if (options?.forceSplitSequences) {
      return this.applyMonitorSelectionInChunks(monitor, targetIndexes);
    }

    const payload = this.buildMonitorTransferPayload(monitorId, targetIndexes);

    if (!payload.booking_users.length && !payload.subgroup_id) {
      this.snackbar.open(this.translateService.instant('error'), 'OK', { duration: 3000 });
      return [];
    }

    this.showLoadingDialog('monitor_assignment.loading_applying');
    try {
      await firstValueFrom(this.monitorsService.transferMonitor(payload));

      targetIndexes.forEach(idx => {
        this.monitorSelect.emit({ monitor, i: idx });
        this.flagLocalMonitorChange(idx, monitor);
      });

      this.invalidateDatesCache();
      this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
      this.assignmentSync.broadcastChange(this.buildSyncEvent(monitorId, targetIndexes));
      return targetIndexes;
    } catch (error) {
      console.error('Error occurred while assigning monitor:', error);
      if (error?.error?.message && error.error.message.includes('Overlap')) {
        this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
      } else {
        this.snackbar.open(this.translateService.instant('event_overlap'), 'OK', { duration: 3000 });
      }
      return [];
    } finally {
      this.hideLoadingDialog();
    }
  }

  private async applyMonitorSelectionInChunks(monitor: any | null, indexes: number[]): Promise<number[]> {
    const monitorId = monitor?.id ?? null;
    const applied: number[] = [];
    const sequences = this.splitIndexesIntoChunks(indexes);

    this.showLoadingDialog('monitor_assignment.loading_applying');
    try {
      for (const seq of sequences) {
        const scopeOverride: MonitorAssignmentScope = seq.length === 1 ? 'single' : 'range';
        const payload = this.buildMonitorTransferPayload(monitorId, seq, scopeOverride);

        if (!payload.booking_users.length && !payload.subgroup_id) {
          continue;
        }

        try {
          await firstValueFrom(this.monitorsService.transferMonitor(payload));
          seq.forEach(idx => {
            this.monitorSelect.emit({ monitor, i: idx });
            this.flagLocalMonitorChange(idx, monitor);
            applied.push(idx);
          });
        } catch (error) {
          console.error('Error occurred while assigning monitor chunk:', error);
          if (error?.error?.message && error.error.message.includes('Overlap')) {
            this.snackbar.open(this.translateService.instant('monitor_busy'), 'OK', { duration: 3000 });
          } else {
            this.snackbar.open(this.translateService.instant('event_overlap'), 'OK', { duration: 3000 });
          }
          break;
        }
      }
    } finally {
      this.hideLoadingDialog();
    }

    if (applied.length) {
      this.invalidateDatesCache();
      this.snackbar.open(this.translateService.instant('snackbar.monitor.update'), 'OK', { duration: 3000 });
      this.assignmentSync.broadcastChange(this.buildSyncEvent(monitorId, applied));
    }

    return applied;
  }

  private flagLocalMonitorChange(index: number, monitor: any | null): void {
    try {
      const courseDates = this.getCourseDates();
      const targetDate = courseDates[index];
      const subgroup = this.getSubgroupForDate(targetDate);
      if (subgroup) {
        subgroup.monitor = monitor ?? null;
        subgroup.monitor_id = monitor?.id ?? null;
        subgroup.monitor_modified = true;
      }
      this.modified[index] = !!subgroup?.monitor_modified;
    } catch (error) {
      console.warn('Unable to flag monitor change', error);
    }
  }

  private async refreshAvailabilityForIndexes(indexes: number[]): Promise<void> {
    const uniqueIndexes = Array.from(new Set(indexes));
    const courseDates = this.getCourseDates();
    for (const idx of uniqueIndexes) {
      const date = courseDates[idx];
      if (!date) {
        continue;
      }
      await this.getAvail(date, idx);
    }
  }

  private rebuildLegendState(indexes?: number[]): void {
    const indices = indexes && indexes.length ? indexes : this.getDatesForSubgroup().map(entry => entry.index);
    const unique = Array.from(new Set(indices));
    const courseDates = this.getCourseDates();
    unique.forEach(idx => {
      const subgroup = this.getSubgroupForDate(courseDates[idx]);
      this.modified[idx] = !!subgroup?.monitor_modified;
    });
  }

  private restoreSelectValue(select: MatSelect, value: number | null): void {
    if (!select) {
      return;
    }
    Promise.resolve().then(() => {
      if (typeof (select as any).writeValue === 'function') {
        (select as any).writeValue(value);
      } else {
        (select as any).value = value;
      }
    });
  }

  private buildMonitorAssignmentDates(): MonitorAssignmentDialogDateOption[] {
    const entries = this.getDatesForSubgroup();
    const options: MonitorAssignmentDialogDateOption[] = [];
    entries.forEach(entry => {
      const value = this.normalizeCourseDateValue(entry.date);
      if (!value) {
        return;
      }
      options.push({
        value,
        label: this.formatDateLabel(value)
      });
    });
    return options;
  }

  private buildIntervalDateValues(): string[] {
    const courseDates = this.getCourseDates();
    return this.getIntervalDateIndexes()
      .map(idx => this.normalizeCourseDateValue(courseDates[idx]))
      .filter((value): value is string => !!value);
  }

  private isSessionInPast(date: any): boolean {
    const reference = this.buildDateFromParts(date?.date, date?.hour_start ?? date?.hour_end);
    if (!reference) {
      return false;
    }
    return reference.getTime() < Date.now();
  }

  private buildDateFromParts(dateValue?: string, timeValue?: string): Date | null {
    if (!dateValue) {
      return null;
    }
    const normalizedTime = timeValue && timeValue.includes(':') ? timeValue : '00:00';
    const composed = `${dateValue}T${normalizedTime.length === 5 ? `${normalizedTime}:00` : normalizedTime}`;
    const parsed = new Date(composed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDateLabel(value: string): string {
    try {
      const locale = this.translateService.currentLang || 'es-ES';
      return formatDate(value, 'dd/MM/yyyy', locale);
    } catch {
      return value;
    }
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.translateService.instant(key);
    return translated === key ? fallback : translated;
  }

  private splitIndexesIntoChunks(indexes: number[]): number[][] {
    const sorted = [...indexes].sort((a, b) => a - b);
    const chunks: number[][] = [];
    let currentChunk: number[] = [];

    sorted.forEach(index => {
      if (!currentChunk.length) {
        currentChunk.push(index);
        return;
      }
      const last = currentChunk[currentChunk.length - 1];
      if (index === last + 1) {
        currentChunk.push(index);
      } else {
        chunks.push(currentChunk);
        currentChunk = [index];
      }
    });

    if (currentChunk.length) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private buildSyncEvent(monitorId: number | null, indexes: number[]): MonitorAssignmentSyncEvent {
    const courseId = this.courseFormGroup?.controls?.['id']?.value ?? null;
    const courseDates = this.getCourseDates();
    const slotKeys = indexes.map(idx => {
      const date = courseDates[idx];
      const dateLabel = this.normalizeCourseDateValue(date) ?? `idx-${idx}`;
      return `${dateLabel}-${this.level?.id ?? 'lvl'}-${this.subgroup_index}`;
    });
    return {
      sourceId: this.componentInstanceId,
      courseId,
      monitorId,
      slotKeys
    };
  }

  private showLoadingDialog(messageKey: string): void {
    const message = this.translateWithFallback(messageKey, 'Procesando...');
    if (this.loadingDialogRef) {
      this.loadingDialogRef.componentInstance.data.message = message;
      return;
    }
    this.loadingDialogRef = this.dialog.open(MonitorAssignmentLoadingDialogComponent, {
      disableClose: true,
      panelClass: 'monitor-assignment-loading-dialog',
      data: { message }
    });
  }

  private hideLoadingDialog(): void {
    this.loadingDialogRef?.close();
    this.loadingDialogRef = undefined;
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
   * Check if a user belongs to this subgroup in any date
   */
  isUserInSubgroup(user: any): boolean {
    try {
      const courseDates = this.getCourseDates();
      const subgroupIds = this.getSubgroupIdsAcrossDates();
      const userSubgroupId = this.getUserSubgroupId(user);

      if (userSubgroupId != null && subgroupIds.has(userSubgroupId)) {
        return true;
      }

      // Check in each date's booking_users_active
      for (const date of courseDates) {
        const subgroup = this.getSubgroupForDate(date);
        if (!subgroup) continue;

        const bookingUsersActive = this.toArray(date?.booking_users_active);
        const foundInActive = bookingUsersActive.some((u: any) =>
          u.client_id === user.client_id && this.getUserSubgroupId(u) === subgroup.id
        );

        if (foundInActive) return true;

        const embeddedUsers = this.toArray(subgroup?.booking_users);
        if (embeddedUsers.some((u: any) => u.client_id === user.client_id)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
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

      // Fallback: count from global booking_users if still 0
      if (currentCount === 0) {
        const bookingUsers = this.courseFormGroup?.controls['booking_users']?.value || [];
        const globalCount = bookingUsers.filter((u: any) => {
          const userDegreeId = u?.degree_id ?? u?.degreeId;
          const userCourseDateId = this.getUserCourseDateId(u);
          const userSubgroupId = this.getUserSubgroupId(u);
          return userDegreeId === this.level?.id &&
                 userCourseDateId === dateItem?.id &&
                 userSubgroupId === subgroup.id;
        }).length;
        currentCount = globalCount;
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

  private handleExternalAssignmentEvent(): void {
    try {
      this.availabilityCache.clear();
      const courseDates = this.getCourseDates();
      const currentDate = courseDates?.[this.selectDate];
      if (currentDate) {
        this.getAvail(currentDate, this.selectDate);
      }
      this.rebuildLegendState();
    } catch (error) {
      console.warn('Unable to refresh availability after external update', error);
    }
  }

  // TrackBy functions for *ngFor optimization
  trackByEntryIndex(index: number, item: any): any {
    return item?.index ?? index;
  }

  trackByMonitorId(index: number, item: any): any {
    return item?.id ?? index;
  }

  trackByUserId(index: number, item: any): any {
    return item?.id ?? item?.client_id ?? index;
  }
}










