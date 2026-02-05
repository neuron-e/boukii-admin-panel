import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiCrudService } from '../../../../service/crud.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'vex-course-detail-nivel',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class CourseDetailCardNivelComponent implements OnInit, OnDestroy, OnChanges {

  @Input() courseFormGroup!: UntypedFormGroup
  @Input() checkbox: boolean = false
  @Input() selectedSubgroup: any;
  @Input() hideTimingButton: boolean = false;
  @Input() expandByDefault: boolean = false; // Expand all levels by default (for sidebar view)
  @Input() subgroupCache: Record<string, any[]> = {};
  @Input() simplifiedView: boolean = false;
  @Output() changeMonitor = new EventEmitter<any>()
  @Output() viewTimes = new EventEmitter<{ subGroup: any, groupLevel: any, selectedDate?: any }>()

  today: Date = new Date()
  courseDates: any[] = [];
  private subgroupsPerDegree = new Map<string, any[]>();
  private subscriptions = new Subscription();

  // Track collapsed state for each subgroup (key format: "degreeId_subgroupIndex")
  collapsedSubgroups: { [key: string]: boolean } = {}

  ngOnInit() {
    this.refreshCourseDatesCache();
    this.subscribeToFormChanges();

    // Initialize all subgroups as COLLAPSED by default
    try {
      if (Array.isArray(this.courseDates)) {
        this.courseDates.forEach((cd: any) => {
          const courseGroups = cd.course_groups || [];
          courseGroups.forEach((group: any) => {
            const degreeId = group.id || group.degree_id;
            const subgroups = group.course_subgroups || [];
            subgroups.forEach((_: any, index: number) => {
              const key = `${degreeId}_${index}`;
              this.collapsedSubgroups[key] = true; // Initialize as COLLAPSED
            });
          });
        });
      }
    } catch (e) {
      console.warn('Failed to initialize collapsed subgroups:', e);
    }

    // If expandByDefault is true, initialize all levels as expanded (modal: true)
    if (this.expandByDefault) {
      try {
        const levels = this.courseFormGroup?.controls?.['levelGrop']?.value || [];
        if (Array.isArray(levels)) {
          levels.forEach((level: any) => {
            if (level) {
              level.modal = true; // Expand the level to show dates, intervals, monitors
            }
          });
        }
      } catch (e) {
        console.warn('Failed to expand levels by default:', e);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['courseFormGroup']) {
      this.refreshCourseDatesCache();
      this.subscribeToFormChanges();
    }

    if (changes['subgroupCache']) {
      this.subgroupsPerDegree.clear();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  constructor(
    private snackBar: MatSnackBar,
    private crudService: ApiCrudService,
    private translateService: TranslateService
  ) {}

  find = (array: any[], key: string, value: string) => array.find((a: any) => a[key] === value)
  DateISO = (value: string) => value ? new Date(value).toLocaleString().split(" ")[0].replace("/", ".").replace("/", ".") : ''
  DateDiff = (value1: string, value2: string): number => Math.round((new Date(value2).getTime() - new Date(value1).getTime()) / 1000 / 60 / 60 / 24)
  Date = (v: string): Date => new Date(v)
  numUsersArray(value: number): number[] {
    return Array.from({ length: value }, (_, i) => i);
  }
  // Prefer course_dates; fallback to course_dates_prev or camelCase equivalents
  getCourseDates(): any[] {
    try {
      const cg = this.courseFormGroup?.controls;
      if (!cg) return [];
      const cd = cg['course_dates']?.value;
      if (Array.isArray(cd) && cd.length) return cd;
      const cdp = cg['course_dates_prev']?.value;
      if (Array.isArray(cdp) && cdp.length) return cdp;
      // Robust fallback if some callers inject camelCase
      const anyValue = (this.courseFormGroup as any)?.value || {};
      const cdCamel = Array.isArray((anyValue as any).courseDates) ? (anyValue as any).courseDates : [];
      const cdpCamel = Array.isArray((anyValue as any).courseDatesPrev) ? (anyValue as any).courseDatesPrev : [];
      if (cdCamel.length) return cdCamel;
      if (cdpCamel.length) return cdpCamel;
    } catch {}
    return [];
  }

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

  private normId(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeId(value: any): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = String(value).trim();
    return normalized === '' ? null : normalized;
  }

  private userCourseDateId(u: any): number | null {
    return this.normId(u?.course_date_id ?? u?.courseDateId ?? u?.course_date?.id ?? u?.courseDate?.id);
  }

  private userSubgroupId(u: any): number | null {
    return this.normId(
      u?.course_subgroup_id ??
      u?.course_sub_group_id ??
      u?.course_sub_group?.id ??
      u?.courseSubGroupId ??
      u?.courseSubGroup?.id
    );
  }

  private userDegreeId(u: any): number | null {
    return this.normId(u?.degree_id ?? u?.degreeId);
  }

  private getSubgroupsForCourseDateDegree(courseDate: any, degreeId: number): any[] {
    const deg = this.normId(degreeId);
    if (!courseDate || deg == null) return [];

    // ✅ NEW structure: courseDate.course_subgroups
    const dateSubs = (courseDate.course_subgroups || courseDate.courseSubgroups || [])
      .filter((sg: any) => this.normId(sg?.degree_id ?? sg?.degreeId) === deg);

    if (dateSubs.length) {
      return [...dateSubs].sort((a, b) =>
        String(a?.subgroup_dates_id ?? a?.id ?? '').localeCompare(
          String(b?.subgroup_dates_id ?? b?.id ?? ''),
          undefined,
          { numeric: true }
        )
      );
    }

    // fallback old structure: course_groups -> course_subgroups
    const groups = courseDate.course_groups || courseDate.courseGroups || [];
    const group = groups.find((g: any) => this.normId(g?.degree_id ?? g?.degreeId) === deg);
    const subs = (group?.course_subgroups || group?.courseSubgroups || []) as any[];

    return [...subs].sort((a, b) =>
      String(a?.subgroup_dates_id ?? a?.id ?? '').localeCompare(
        String(b?.subgroup_dates_id ?? b?.id ?? ''),
        undefined,
        { numeric: true }
      )
    );
  }

  getSubgroupForCourseDateIndex(courseDate: any, degreeId: number, index: number): any | null {
    const subs = this.getSubgroupsForCourseDateDegree(courseDate, degreeId);
    return subs[index] ?? null;
  }

  getUsersForCourseDateSubgroupIndex(bookingUsers: any, degreeId: number, courseDate: any, index: number): any[] {
    const deg = this.normId(degreeId);
    const cdId = this.normId(courseDate?.id);
    const subG = this.getSubgroupForCourseDateIndex(courseDate, degreeId, index);
    const sgId = this.normId(subG?.id);

    if (deg == null || cdId == null || sgId == null) return [];

    const targetDateStr = courseDate?.date ? new Date(courseDate.date).toDateString() : null;

    return this.asArray(bookingUsers).filter((u: any) => {
      if (u?.status === 2) return false;
      if (this.normId(u?.degree_id ?? u?.degreeId) !== deg) return false;

      const uCd = this.normId(u?.course_date_id ?? u?.courseDateId);
      if (uCd != null) {
        if (uCd !== cdId) return false;
      } else if (targetDateStr && u?.date) {
        if (new Date(u.date).toDateString() !== targetDateStr) return false;
      } else {
        return false;
      }

      const uSg = this.normId(
        u?.course_subgroup_id ?? u?.course_sub_group_id ?? u?.course_sub_group?.id ?? u?.courseSubGroupId ?? u?.courseSubGroup?.id
      );
      return uSg === sgId;
    });
  }

  getUsersForSpecificDateInSubgroup(
    bookingUsers: any,
    degreeId: number,
    courseDateId: number,
    subgroupId: number | null | undefined
  ): any[] {
    try {
      const deg = this.normId(degreeId);
      const cdId = this.normId(courseDateId);
      const sgId = this.normId(subgroupId);

      if (deg == null || cdId == null) return [];

      return this.asArray(bookingUsers).filter((u: any) => {
        if (u?.status === 2) return false; // cancelled
        if (this.userDegreeId(u) !== deg) return false;
        if (this.userCourseDateId(u) !== cdId) return false;
        if (sgId != null && this.userSubgroupId(u) !== sgId) return false;
        return true;
      });
    } catch (e) {
      console.warn('getUsersForSpecificDateInSubgroup failed:', e);
      return [];
    }
  }

// ✅ (para empty slots)
  getUniqueClientsCountForSpecificDateSubgroup(
    bookingUsers: any,
    degreeId: number,
    courseDateId: number,
    subgroupId: number | null | undefined
  ): number {
    const users = this.getUsersForSpecificDateInSubgroup(bookingUsers, degreeId, courseDateId, subgroupId);
    const set = new Set<number | string>();
    for (const u of users) {
      const id = u?.client_id ?? u?.client?.id ?? u?.id;
      if (id != null) set.add(id);
    }
    return set.size;
  }

/*  getUsersForSpecificDateInSubgroup(
    bookingUsers: any,
    degreeId: number,
    courseDateId: number,
    subgroupIndex: number,
    subgroupId?: number | null
  ): any[] {
    const users = this.asArray(bookingUsers);

    const courseDates = (this.courseDates?.length ? this.courseDates : this.getCourseDates());
    const targetDate = courseDates.find((cd: any) => Number(cd?.id) === Number(courseDateId));
    const targetDateStr = targetDate?.date ? new Date(targetDate.date).toDateString() : null;

    const idsFromIndex = this.getSubgroupIdsForIndex(courseDates, degreeId, subgroupIndex);
    const subgroupIds = new Set<number>(
      [subgroupId, ...idsFromIndex]
        .filter((v: any) => v != null)
        .map((v: any) => Number(v))
        .filter((v: any) => !Number.isNaN(v))
    );

    return users.filter((user: any) => {
      const userDegreeId = user?.degree_id ?? user?.degreeId;
      if (userDegreeId !== degreeId) return false;
      if (user?.status === 2) return false;

      const userSubgroupId = this.getUserSubgroupId(user);
      if (subgroupIds.size && (userSubgroupId == null || !subgroupIds.has(Number(userSubgroupId)))) return false;

      const userCourseDateId = this.getUserCourseDateId(user);
      if (userCourseDateId != null && Number(userCourseDateId) === Number(courseDateId)) return true;

      // fallback por fecha real si hiciera falta
      if (targetDateStr && user?.date) {
        return new Date(user.date).toDateString() === targetDateStr;
      }

      return false;
    });
  }*/

  private extractIntervalsFromSettings(): any[] {
    try {
      const settingsControl = this.courseFormGroup?.controls?.['settings'];
      let rawSettings = settingsControl ? settingsControl.value : null;
      if (!rawSettings && (this.courseFormGroup as any)?.value) {
        rawSettings = (this.courseFormGroup as any).value.settings;
      }
      if (!rawSettings) {
        return [];
      }
      const settings = typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings;
      if (settings && Array.isArray(settings.intervals)) {
        return settings.intervals;
      }
      if (settings?.intervalConfiguration && Array.isArray(settings.intervalConfiguration.intervals)) {
        return settings.intervalConfiguration.intervals;
      }
    } catch (error) {
      console.warn('extractIntervalsFromSettings failed', error);
    }
    return [];
  }

  private formatIntervalRange(start: any, end: any): string {
    const buildLabel = (value: any) => {
      if (!value) {
        return null;
      }
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.toLocaleDateString();
    };
    const startLabel = buildLabel(start);
    const endLabel = buildLabel(end);
    if (startLabel && endLabel) {
      return `${startLabel} - ${endLabel}`;
    }
    return startLabel || endLabel || '';
  }

  private getIntervalIndexFromCourseDates(intervalId: any): number | null {
    if (intervalId === undefined || intervalId === null) {
      return null;
    }
    const key = String(intervalId);
    const dates = (this.courseDates && this.courseDates.length) ? this.courseDates : this.getCourseDates();
    const seen: string[] = [];
    dates.forEach(cd => {
      const currentId = cd?.interval_id ?? cd?.intervalId ?? null;
      const currentKey = currentId === null || currentId === undefined ? '__null__' : String(currentId);
      if (!seen.includes(currentKey)) {
        seen.push(currentKey);
      }
    });
    const idx = seen.indexOf(key);
    return idx >= 0 ? idx : null;
  }

  getIntervalLabelForCourseDate(courseDate: any): string | null {
    if (!courseDate) {
      return null;
    }

    const directName = courseDate?.interval_name ?? courseDate?.intervalName ?? courseDate?.interval?.name;
    if (directName) {
      return directName;
    }

    const intervalId = courseDate?.interval_id ?? courseDate?.intervalId ?? courseDate?.interval?.id ?? null;
    if (intervalId == null) {
      return null;
    }

    const intervals = this.extractIntervalsFromSettings();
    const key = String(intervalId);
    let foundIndex = -1;
    const match = intervals.find((interval: any, idx: number) => {
      const candidateKey = interval?.id ?? interval?.interval_id ?? interval?.intervalId ?? idx;
      if (String(candidateKey) === key) {
        foundIndex = idx;
        return true;
      }
      return false;
    });

    const fallbackIndex = this.getIntervalIndexFromCourseDates(intervalId);
    const numericIndex = foundIndex >= 0 ? foundIndex + 1 : (fallbackIndex != null ? fallbackIndex + 1 : null);
    const baseLabel = `${this.translateService.instant('interval')} ${numericIndex ?? key}`;

    if (match) {
      if (match.name) {
        return match.name;
      }
      const range = this.formatIntervalRange(match.startDate ?? match.start_date, match.endDate ?? match.end_date);
      if (range) {
        return `${baseLabel} · ${range}`;
      }
      return baseLabel;
    }

    return baseLabel;
  }
  // Helpers to robustly navigate snake/camel case API responses
  private groupsOf(cd: any): any[] {
    return (cd?.course_groups || cd?.courseGroups || []) as any[];
  }
  private subgroupsOf(g: any): any[] {
    return (g?.course_subgroups || g?.courseSubgroups || []) as any[];
  }
  private bookingsOf(sg: any): any[] {
    return (sg?.booking_users || sg?.bookingUsers || []) as any[];
  }
  private degreeIdOf(g: any): number | null {
    return (g?.degree_id ?? g?.degreeId ?? null) as number | null;
  }
  private subgroupIdOf(u: any): number | null {
    return (u?.course_subgroup_id ?? u?.course_sub_group_id ?? u?.course_sub_group?.id ?? u?.courseSubGroupId ?? u?.courseSubGroup?.id ?? null) as number | null;
  }
  private groupIdOf(u: any): number | null {
    return (u?.course_group_id ?? u?.group_id ?? u?.courseGroupId ?? null) as number | null;
  }
  private perDayActive(cd: any): any[] {
    return (Array.isArray(cd?.booking_users_active) ? cd.booking_users_active : (Array.isArray(cd?.bookingUsersActive) ? cd.bookingUsersActive : [])) as any[];
  }
  // Devuelve los subgrupos para un degree buscando el primer course_date que los contenga
  getSubgroupsForDegree(courseDates: any[], degreeId: number): any[] {
    if (!Array.isArray(courseDates)) return [];
    for (const cd of courseDates) {
      const group = this.groupsOf(cd).find((g: any) => this.degreeIdOf(g) === degreeId);
      const subs = this.subgroupsOf(group || {});
      if (subs.length) return subs;
    }
    return [];
  }
  private refreshCourseDatesCache(next?: any): void {
    const resolved = Array.isArray(next) ? next : this.getCourseDates();
    this.courseDates = Array.isArray(resolved) ? resolved : [];
    this.subgroupsPerDegree.clear();
  }

  private subscribeToFormChanges(): void {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    const courseDatesControl = this.courseFormGroup?.get('course_dates');
    if (courseDatesControl?.valueChanges) {
      this.subscriptions.add(courseDatesControl.valueChanges.subscribe((dates: any) => {
        this.refreshCourseDatesCache(dates);
      }));
    }

    const courseDatesPrevControl = this.courseFormGroup?.get('course_dates_prev');
    if (courseDatesPrevControl?.valueChanges) {
      this.subscriptions.add(courseDatesPrevControl.valueChanges.subscribe((dates: any) => {
        // Solo usar course_dates_prev como respaldo cuando course_dates esté vacío
        if (!this.courseDates?.length) {
          this.refreshCourseDatesCache(dates);
        }
      }));
    }
  }

  private normalizeDegreeKey(value: number | string | undefined | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  }

  getSubgroupsForDegreeCached(degreeId: number): any[] {
    const key = this.normalizeDegreeKey(degreeId);
    if (!key) {
      return [];
    }

    const cached = this.subgroupsPerDegree.get(key);
    if (cached) {
      return cached;
    }

    const computed = this.getAllUniqueSubgroupsForDegree(this.courseDates, degreeId);
    this.subgroupsPerDegree.set(key, computed);
    return computed;
  }

  private getCachedSubgroupsForDegree(degreeId: number): any[] | null {
    if (degreeId == null) {
      return null;
    }

    const key = String(degreeId);
    const cached = this.subgroupCache?.[key];
    if (!Array.isArray(cached) || cached.length === 0) {
      return null;
    }

    return cached.map(subgroup => ({ ...subgroup }));
  }

  /**
   * Devuelve TODOS los subgrupos únicos para un degree a través de TODOS los course_dates
   * Útil cuando hay configuración por intervalos y diferentes intervalos tienen diferente número de subgrupos
   * HYBRID: Try both cd.course_subgroups (new) and course_groups.course_subgroups (old)
   */
  getAllUniqueSubgroupsForDegree(courseDates: any[], degreeId: number): any[] {
    if (!Array.isArray(courseDates)) return [];

    const computed = this.computeUniqueSubgroupsFromDates(courseDates, degreeId);
    const cached = this.getCachedSubgroupsForDegree(degreeId);
    if (!cached || !cached.length) {
      return computed;
    }

    const computedMap = new Map<string, any>();
    computed.forEach((subgroup) => {
      const key = this.normalizeId(subgroup?.id);
      if (key) {
        computedMap.set(key, subgroup);
      }
    });

    const merged: any[] = [];
    cached.forEach((cacheEntry, idx) => {
      const key = this.normalizeId(cacheEntry?.id);
      const actual = key ? computedMap.get(key) : null;
      const base = actual ?? cacheEntry;
      const mergedEntry = {
        ...base,
        ...(cacheEntry ?? {}),
        _index: idx
      };
      merged.push(mergedEntry);
    });

    computed.forEach((subgroup) => {
      const key = this.normalizeId(subgroup?.id);
      const alreadyPresent = merged.some(
        (entry) => this.normalizeId(entry?.id) === key && key !== null
      );
      if (!alreadyPresent) {
        merged.push(subgroup);
      }
    });

    return merged;
  }

  private computeUniqueSubgroupsFromDates(courseDates: any[], degreeId: number): any[] {
    const maxSubgroupsCount = Math.max(...courseDates.map(cd => {
      const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
      const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
        (sg?.degree_id ?? sg?.degreeId) === degreeId
      );
      if (dateLevelSubgroups.length > 0) {
        return dateLevelSubgroups.length;
      }
      const group = this.groupsOf(cd).find((g: any) => this.degreeIdOf(g) === degreeId);
      return this.subgroupsOf(group || {}).length;
    }), 0);

    const uniqueSubgroups: any[] = [];
    for (let i = 0; i < maxSubgroupsCount; i++) {
      for (const cd of courseDates) {
        const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
        const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
          (sg?.degree_id ?? sg?.degreeId) === degreeId
        );
        if (dateLevelSubgroups[i]) {
          uniqueSubgroups.push({ ...dateLevelSubgroups[i] });
          break;
        }
        const group = this.groupsOf(cd).find((g: any) => this.degreeIdOf(g) === degreeId);
        const subgroup = this.subgroupsOf(group || {})[i];
        if (subgroup) {
          uniqueSubgroups.push({ ...subgroup });
          break;
        }
      }
    }

    return this.orderSubgroupsByBookingPresence(uniqueSubgroups);
  }
  
  private extractBookingUsersFromSubgroup(subgroup: any): any[] {
    if (!subgroup) {
      return [];
    }

    const activeBookings = this.asArray(subgroup.booking_users_active || subgroup.bookingUsersActive);
    if (activeBookings.length) {
      return activeBookings;
    }

    return this.asArray(subgroup.booking_users || subgroup.bookingUsers);
  }

  private orderSubgroupsByBookingPresence(subgroups: any[]): any[] {
    if (!Array.isArray(subgroups)) {
      return [];
    }

    const withBookings = subgroups.filter(sg => this.extractBookingUsersFromSubgroup(sg).length > 0);
    const withoutBookings = subgroups.filter(sg => this.extractBookingUsersFromSubgroup(sg).length === 0);
    const ordered = [...withBookings, ...withoutBookings];

    ordered.forEach((subgroup, index) => {
      if (subgroup) {
        subgroup._index = index;
      }
    });

    return ordered;
  }

  /**
   * Obtiene las fechas (course_dates) que tienen un subgrupo específico (por índice) para un degree
   * HYBRID: Try both cd.course_subgroups (new) and course_groups.course_subgroups (old)
   */
  getCourseDatesForSubgroupIndex(courseDates: any[], degreeId: number, subgroupIndex: number): any[] {
    if (!Array.isArray(courseDates)) return [];

    return courseDates.filter(cd => {
      // Try new structure first: course_subgroups at date level
      const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
      const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
        (sg?.degree_id ?? sg?.degreeId) === degreeId
      );
      if (dateLevelSubgroups.length > subgroupIndex && dateLevelSubgroups[subgroupIndex] != null) {
        return true;
      }

      // Fallback to old structure: course_subgroups inside course_groups
      const group = this.groupsOf(cd).find((g: any) => this.degreeIdOf(g) === degreeId);
      const subgroups = this.subgroupsOf(group || {});
      return subgroups.length > subgroupIndex && subgroups[subgroupIndex] != null;
    });
  }
  // Obtiene los IDs de subgrupo para un índice concreto (posición) a lo largo de todas las fechas
  // HYBRID: Try both cd.course_subgroups (new) and course_groups.course_subgroups (old)
  getSubgroupIdsForIndex(courseDates: any[], degreeId: number, index: number): number[] {
    if (!Array.isArray(courseDates)) return [];
    const ids = new Set<number>();
    for (const cd of courseDates) {
      // Try new structure first
      const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
      const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
        (sg?.degree_id ?? sg?.degreeId) === degreeId
      );
      const sgNew = dateLevelSubgroups[index];
      if (sgNew?.id != null) {
        ids.add(sgNew.id);
        continue;
      }

      // Fallback to old structure
      const group = this.groupsOf(cd).find((g: any) => this.degreeIdOf(g) === degreeId);
      const sg = this.subgroupsOf(group || {})?.[index];
      if (sg?.id != null) ids.add(sg.id);
    }
    return Array.from(ids);
  }
  // Obtiene los IDs de grupos (course_group) de un degree a lo largo de todas las fechas
  getGroupIdsForDegree(courseDates: any[], degreeId: number): number[] {
    if (!Array.isArray(courseDates)) return [];
    const ids = new Set<number>();
    for (const cd of courseDates) {
      this.groupsOf(cd).forEach((g: any) => {
        if (this.degreeIdOf(g) === degreeId && g?.id != null) ids.add(g.id);
      });
    }
    return Array.from(ids);
  }
  // Devuelve usuarios únicos por subgrupo (por índice) deduplicados por client_id
  getUsersForSubgroupIndexUnique(bookingUsers: any, courseDates: any[], degreeId: number, index: number): any[] {
    try {
      const all = this.getUsersForSubgroupIndexAll(bookingUsers, courseDates, degreeId, index);
      const byClient = new Map<number | string, any>();
      for (const u of all) {
        const key = u?.client_id ?? u?.client?.id ?? u?.id;
        if (key != null && !byClient.has(key)) byClient.set(key, u);
      }
      return Array.from(byClient.values());
    } catch {
      return [];
    }
  }

  // Devuelve todos los registros de usuarios para un subgrupo (por índice), sin deduplicar
  // CONTADOR: Clientes únicos por subgrupo (para el contador del header)
  getUniqueClientsCountForSubgroup(bookingUsers: any, degreeId: number): number {
    try {
      const users = this.asArray(bookingUsers);
      const uniqueClients = new Set<string | number>();

      for (const user of users) {
        const userDegreeId = user?.degree_id ?? user?.degreeId;
        if (userDegreeId === degreeId) {
          const clientId = user?.client_id ?? user?.client?.id ?? user?.id;
          if (clientId != null) {
            uniqueClients.add(clientId);
          }
        }
      }
      return uniqueClients.size;
    } catch (e) {
      console.warn("getUniqueClientsCountForSubgroup failed:", e);
      return 0;
    }
  }

  // NUEVO: Usuarios para una fecha específica
  // Usuarios para una fecha específica - lógica simple y correcta
  getUsersForSpecificDate(bookingUsers: any, degreeId: number, courseDateId: number): any[] {
    try {
      const users = this.asArray(bookingUsers);

      const matchingUsers = users.filter((user: any) => {
        const userDegreeId = user?.degree_id ?? user?.degreeId;
        const userCourseDateId = user?.course_date_id ?? user?.courseDateId;

        // For FIX courses, try matching by date instead of course_date_id if IDs don't match
        let matches = userDegreeId === degreeId && userCourseDateId === courseDateId;

        // If no match and this is a FIX course, try matching by date
        if (!matches && user?.date && courseDateId) {
          // Get the course date object to compare actual dates
          const courseDates = (this.courseDates && this.courseDates.length) ? this.courseDates : this.getCourseDates();
          const targetDate = courseDates.find(cd => cd.id === courseDateId);

          if (targetDate && user.date) {
            const userDate = new Date(user.date).toDateString();
            const targetDateStr = new Date(targetDate.date).toDateString();
            matches = userDegreeId === degreeId && userDate === targetDateStr;
          }
        }

        return matches;
      });

      return matchingUsers;
    } catch (e) {
      console.warn("getUsersForSpecificDate failed:", e);
      return [];
    }
  }
  // LISTADO: Mantener método original pero simplificado
  getUsersForSubgroupIndexAll(bookingUsers: any, courseDates: any[], degreeId: number, index: number): any[] {
    try {
      const users = this.asArray(bookingUsers);
      const subgroupIds = this.getSubgroupIdsForIndex(courseDates, degreeId, index);
      if (!subgroupIds.length) {
        return [];
      }

      const allowedIds = new Set(subgroupIds.map(id => String(id)));

      return users.filter((user: any) => {
        const userDegreeId = this.userDegreeId(user);
        if (userDegreeId !== degreeId) {
          return false;
        }
        const userSubgroupId = this.userSubgroupId(user);
        if (userSubgroupId == null) {
          return false;
        }
        return allowedIds.has(String(userSubgroupId));
      });
    } catch (e) {
      console.warn("getUsersForSubgroupIndexAll failed:", e);
      return [];
    }
  }

  // Capacidad de un subgrupo (por índice). Usa valor del primer día si es consistente, o el del propio subgrupo visible
  getSubgroupCapacity(courseDates: any[], degreeId: number, index: number, fallback: number): number {
    if (!Array.isArray(courseDates) || !courseDates.length) return fallback ?? 0;
    for (const cd of courseDates) {
      const group = this.groupsOf(cd).find((g: any) => this.degreeIdOf(g) === degreeId);
      const sg = this.subgroupsOf(group || {})?.[index];
      if (sg?.max_participants != null) return sg.max_participants;
    }
    return fallback ?? 0;
  }

  getSubgroupDateIds(levelId: number, subgroupIndex: number): number[] {
    if (levelId == null) return [];
    const dates = this.getCourseDatesForSubgroupIndex(this.courseDates, levelId, subgroupIndex);
    return dates
      .map(date => this.normId(date?.id))
      .filter((id): id is number => id != null)
      .map(id => Number(id))
      .filter(id => !Number.isNaN(id));
  }

  getUserInSubGroup(subgroup: any): number {
    const subgroupId = this.normId(subgroup?.id);
    if (subgroupId == null) {
      return 0;
    }

    const bookingUsers = this.asArray(this.courseFormGroup?.controls?.['booking_users']?.value);
    const uniqueClientIds = new Set<number | string>();

    for (const user of bookingUsers) {
      if (!user) continue;
      if (Number(user?.status) === 2) continue;

      const userSubgroupId = this.normId(
        user?.course_subgroup_id ??
        user?.course_sub_group_id ??
        user?.course_sub_group?.id ??
        user?.courseSubGroupId ??
        user?.courseSubGroup?.id
      );

      if (userSubgroupId !== subgroupId) {
        continue;
      }

      const clientId = user?.client_id ?? user?.client?.id ?? user?.id;
      if (clientId != null) {
        uniqueClientIds.add(clientId);
      }
    }

    return uniqueClientIds.size;
  }

  isDefaultSubgroup(subgroup: any): boolean {
    if (!subgroup) {
      return false;
    }
    const targetId = this.normId(subgroup?.id);
    const currentId = this.normId(
      this.selectedSubgroup?.id ??
      this.selectedSubgroup?.course_subgroup_id ??
      this.selectedSubgroup?.courseSubgroupId
    );
    return targetId != null && currentId != null && targetId === currentId;
  }

  /**
   * Get capacity indicator for a specific date in a subgroup
   * Returns string like "1/6" (occupied/total)
   */
  getCapacityIndicatorForDate(bookingUsers: any, degreeId: number, subgroupIndex: number, courseDateId: number, totalCapacity: number): string {
    const usersInDate = this.getUsersForSpecificDateInSubgroup(bookingUsers, degreeId, courseDateId, subgroupIndex);
    const occupied = usersInDate.length;
    return `${occupied}/${totalCapacity}`;
  }
  getUniqueClientsCountForSubgroupIndex(bookingUsers: any, courseDates: any[], degreeId: number, index: number): number {
    return this.getUsersForSubgroupIndexUnique(bookingUsers, courseDates, degreeId, index).length;
  }
  // Ensure we always iterate arrays in templates
  asArray<T = any>(val: any): T[] {
    try {
      if (Array.isArray(val)) return val as T[];
      if (typeof val === 'string') return JSON.parse(val || '[]') as T[];
    } catch (e) {
      console.warn('asArray parse failed, defaulting to []', e);
    }
    return [] as T[];
  }
  // Total de paxes únicos asignados a un degree (deduplicado por client_id)
  findBookingUsers(bookingUsers: any, courseDates: any[], degreeId: number): number {
    try {
      const users = this.asArray(bookingUsers);
      if (!Array.isArray(courseDates) || !courseDates.length) return users.length || 0;

      const uniques = new Set<number | string>();

      // 1) Per-day activos
      for (const cd of (courseDates || [])) {
        const act = this.perDayActive(cd);
        for (const u of act) {
          const g = this.groupsOf(cd).find((x: any) => this.degreeIdOf(x) === degreeId);
          const subgroupList = new Set(this.subgroupsOf(g || {}).map((sg: any) => sg?.id).filter((id: any) => id != null));
          const sg = this.subgroupIdOf(u);
          if (subgroupList.has(sg)) {
            const key = u?.client_id ?? u?.client?.id ?? u?.id;
            if (key != null) uniques.add(key);
          }
        }
      }
      // 2) Embebidos por subgrupo en cada fecha
      for (const cd of (courseDates || [])) {
        const group = this.groupsOf(cd).find((x: any) => this.degreeIdOf(x) === degreeId);
        for (const sg of (this.subgroupsOf(group || {}))) {
          for (const u of (this.bookingsOf(sg))) {
            const key = u?.client_id ?? u?.client?.id ?? u?.id;
            if (key != null) uniques.add(key);
          }
        }
      }
      // 3) Fallback: booking_users globales del formulario
      if (users.length) {
        const groupIds = new Set(this.getGroupIdsForDegree(courseDates, degreeId));
        const subgroupIds = new Set<number>();
        for (const cd of (courseDates || [])) {
          const g = this.groupsOf(cd).find((x: any) => this.degreeIdOf(x) === degreeId);
          (this.subgroupsOf(g || {})).forEach((sg: any) => { if (sg?.id != null) subgroupIds.add(sg.id); });
        }
        for (const u of users) {
          const cg = this.groupIdOf(u);
          const sg = this.subgroupIdOf(u);
          const match = (cg != null && groupIds.has(cg)) || (sg != null && subgroupIds.has(sg));
          if (match) {
            const key = u?.client_id ?? u?.client?.id ?? u?.id;
            if (key != null) uniques.add(key);
          }
        }
      }
      return uniques.size;
    } catch (e) {
      console.warn('findBookingUsers failed:', e);
      return 0;
    }
  }

  countGroups(courseDates: any[], degreeId: number): number {
    if (!Array.isArray(courseDates) || !courseDates.length) return 0;
    const sum = courseDates
      .flatMap((date: any) => this.groupsOf(date))
      .filter((group: any) => this.degreeIdOf(group) === degreeId).length;
    return Math.round(sum / courseDates.length);
  }
  countSubgroups(courseDates: any[], degreeId: number): number {
    if (!Array.isArray(courseDates) || !courseDates.length) return 0;
    const cached = this.getCachedSubgroupsForDegree(degreeId);
    if (cached) {
      return cached.length;
    }
    // HYBRID: Try both structures
    const sum = courseDates
      .flatMap((cd: any) => {
        // Try new structure first
        const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
        const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
          (sg?.degree_id ?? sg?.degreeId) === degreeId
        );
        if (dateLevelSubgroups.length > 0) {
          return dateLevelSubgroups;
        }

        // Fallback to old structure
        const group = this.groupsOf(cd).find((g: any) => this.degreeIdOf(g) === degreeId);
        return this.subgroupsOf(group || {}).filter((sg: any) =>
          (sg?.degree_id ?? sg?.degreeId) === degreeId
        );
      }).length;
    return Math.round(sum / courseDates.length);
  }
  onTimingClick(subGroup: any, groupLevel: any, selectedDate?: any): void {
    this.viewTimes.emit({ subGroup, groupLevel, selectedDate });
  }

  toggleSubgroup(degreeId: string, subgroupIndex: number): void {
    const key = `${degreeId}_${subgroupIndex}`;
    this.collapsedSubgroups[key] = !this.collapsedSubgroups[key];
  }

  isSubgroupCollapsed(degreeId: string, subgroupIndex: number): boolean {
    const key = `${degreeId}_${subgroupIndex}`;
    return this.collapsedSubgroups[key] || false;
  }
  // Attendance functionality
  isAttended(user: any): boolean {
    if (!user) return false;
    const a = (user.attended === true || user.attended === 1);
    const b = (user.attendance === true || user.attendance === 1);
    return !!(a || b);
  }
  onAttendanceToggle(user: any, checked: boolean): void {

    if (!user || !user.id) {
      return;
    }
    // Preparar payload similar a teach
    const payload: any = {
      ...user,
      attended: checked,
      attendance: checked
    };

    // Limpiar campos innecesarios
    ['client', 'created_at', 'deleted_at', 'updated_at'].forEach((k) => {
      if (k in payload) delete (payload as any)[k];
    });

    // Actualizar via API
    this.crudService.update('/booking-users', payload, user.id)
      .subscribe({
        next: () => {
          // Actualizar el objeto local
          user.attended = checked;
          user.attendance = checked;

          // Mostrar mensaje de éxito
          this.snackBar.open(
            this.translateService.instant('toast.registered_correctly'),
            '',
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error('Error updating attendance:', error);
          this.snackBar.open(
            'Error al actualizar asistencia',
            '',
            { duration: 3000 }
          );
        }
      });
  }
  // Enhanced method to get users for a specific subgroup index
  getUsersForSubgroupIndexEnhanced(bookingUsers: any, courseDates: any[], degreeId: number, index: number): any[] {

    const collected: any[] = [];
    const uniqueClientIds = new Set<string | number>();

    // Get from embedded structure in course dates
    if (Array.isArray(courseDates)) {
      for (const cd of courseDates) {
        const groups = cd?.course_groups || cd?.courseGroups || [];

        for (const group of groups) {
          const groupDegreeId = group?.degree_id ?? group?.degreeId;
          if (groupDegreeId === degreeId) {
            const subgroups = group?.course_subgroups || group?.courseSubgroups || [];
            const targetSubgroup = subgroups[index];

            if (targetSubgroup) {
              const bookings = targetSubgroup?.booking_users || targetSubgroup?.bookingUsers || [];

              for (const booking of bookings) {
                const clientId = booking?.client_id ?? booking?.client?.id ?? booking?.id;
                if (clientId != null && !uniqueClientIds.has(clientId)) {
                  uniqueClientIds.add(clientId);
                  // Add date information
                  const userWithDate = {
                    ...booking,
                    date: cd?.date || booking?.date,
                    course_date_id: cd?.id || booking?.course_date_id
                  };
                  collected.push(userWithDate);
                }
              }
            }
          }
        }
      }
    }
    // Check booking_users_active from course_dates if no users found in embedded structure
    if (collected.length === 0) {

      // Get the subgroup IDs for this index across all course dates to match against
      const subgroupIds = this.getSubgroupIdsForIndex(courseDates, degreeId, index);

      for (const cd of courseDates) {
        const bookingUsersActive = cd?.booking_users_active || cd?.bookingUsersActive || [];

        for (const booking of bookingUsersActive) {
          const bookingDegreeId = booking?.degree_id ?? booking?.degreeId;
          const bookingSubgroupId = booking?.course_subgroup_id ?? booking?.course_sub_group_id ?? booking?.course_sub_group?.id ?? booking?.courseSubGroupId ?? booking?.courseSubGroup?.id;

          if (bookingDegreeId === degreeId && subgroupIds.includes(bookingSubgroupId)) {
            const clientId = booking?.client_id ?? booking?.client?.id ?? booking?.id;
            if (clientId != null && !uniqueClientIds.has(clientId)) {
              uniqueClientIds.add(clientId);
              // Add date information
              const userWithDate = {
                ...booking,
                date: cd?.date || booking?.date,
                course_date_id: cd?.id || booking?.course_date_id
              };
              collected.push(userWithDate);
            }
          }
        }
      }
    }
    // Final fallback: Check root level booking_users if still no users found
    if (collected.length === 0) {

      // Get the subgroup IDs for this index across all course dates to match against
      const subgroupIds = this.getSubgroupIdsForIndex(courseDates, degreeId, index);

      for (const booking of bookingUsers) {
        const bookingDegreeId = booking?.degree_id ?? booking?.degreeId;
        const bookingSubgroupId = booking?.course_subgroup_id ?? booking?.course_sub_group_id ?? booking?.course_sub_group?.id ?? booking?.courseSubGroupId ?? booking?.courseSubGroup?.id;

        if (bookingDegreeId === degreeId && subgroupIds.includes(bookingSubgroupId)) {
          const clientId = booking?.client_id ?? booking?.client?.id ?? booking?.id;
          if (clientId != null && !uniqueClientIds.has(clientId)) {
            uniqueClientIds.add(clientId);
            collected.push(booking);
          }
        }
      }
    }

    return collected;
  }
  // Enhanced method to count booking users for a degree
  countBookingUsersForDegree(bookingUsers: any, courseDates: any[], degreeId: number): number {

    const uniques = new Set<string | number>();

    // First, try to get from embedded structure in course dates
    if (Array.isArray(courseDates)) {
      for (const cd of courseDates) {
        const groups = cd?.course_groups || cd?.courseGroups || [];

        for (const group of groups) {
          const groupDegreeId = group?.degree_id ?? group?.degreeId;
          if (groupDegreeId === degreeId) {
            const subgroups = group?.course_subgroups || group?.courseSubgroups || [];

            for (const subgroup of subgroups) {
              const bookings = subgroup?.booking_users || subgroup?.bookingUsers || [];

              for (const booking of bookings) {
                const clientId = booking?.client_id ?? booking?.client?.id ?? booking?.id;
                if (clientId != null) {
                  uniques.add(clientId);
                }
              }
            }
          }
        }
      }
    }
    // Fallback: Check root level booking_users if no users found in embedded structure
    if (uniques.size === 0 && Array.isArray(bookingUsers)) {
      for (const booking of bookingUsers) {
        const bookingDegreeId = booking?.degree_id ?? booking?.degreeId;
        if (bookingDegreeId === degreeId) {
          const clientId = booking?.client_id ?? booking?.client?.id ?? booking?.id;
          if (clientId != null) {
            uniques.add(clientId);
          }
        }
      }
    }

    return uniques.size;
  }
  // Helper para verificar si la fecha es pasada (para mostrar el checkbox de attendance)
  isDatePast(date: string): boolean {
    if (!date) return false;
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate <= today;
  }
}
