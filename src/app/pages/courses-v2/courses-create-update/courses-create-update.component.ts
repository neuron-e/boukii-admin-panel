import { Component, OnInit } from '@angular/core';
import {AbstractControl, FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import {map, forkJoin, mergeMap, throwError, catchError} from 'rxjs';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { ApiCrudService } from 'src/service/crud.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SchoolService } from 'src/service/school.service';
import { CoursesService } from 'src/service/courses.service';
import {TranslateService} from '@ngx-translate/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import { CourseTimingModalComponent } from '../../courses/course-timing-modal/course-timing-modal.component';
import { CourseDateValidationService } from 'src/service/course-date-validation.service';
import { CourseDateOverlapValidationService, CourseDateInfo, CourseDateValidationError } from 'src/service/course-date-overlap-validation.service';

interface CourseDate {
  date: string;
  hour_start: string;
  hour_end?: string;
  duration?: number | string;
  interval_id?: string;
  order?: number;
  [key: string]: any;
}

interface IntervalSubgroupState {
  id?: number | string;
  degree_id?: number | string;
  max_participants?: number;
  active: boolean;
  monitor?: any;
  monitor_id?: number;
  key: string;
}

interface IntervalGroupState {
  levelId: number | string;
  active: boolean;
  max_participants?: number;
  subgroups: IntervalSubgroupState[];
}

type IntervalGroupsState = Record<string, IntervalGroupState>;

@Component({
  selector: 'vex-courses-create-update',
  templateUrl: './courses-create-update.component.html',
  styleUrls: ['./courses-create-update.component.scss',],
  animations: [fadeInUp400ms, stagger20ms]
})
export class CoursesCreateUpdateComponent implements OnInit {
  dataSource: any;
  editingIndex: number | null = null;

  ModalFlux: number = +this.activatedRoute.snapshot.queryParamMap['params'].step || 0
  ModalProgress: { Name: string, Modal: number }[] = [
    { Name: "sport", Modal: 0 },
    { Name: "details", Modal: 1 },
    { Name: "dates", Modal: 2 },
    { Name: "details", Modal: 3 },
    { Name: "extras", Modal: 4 },
    { Name: "langs", Modal: 5 },
  ]
  Translate: { Code: string, Name: string }[] = [
    { Code: "fr", Name: "French" },
    { Code: "de", Name: "German" },
    { Code: "en", Name: "English" },
    { Code: "it", Name: "Italian" },
    { Code: "es", Name: "Spanish" },
  ]

  PeriodoFecha: number = 0
  extrasFormGroup: UntypedFormGroup; //crear extras nuevas
  nowDate: Date = new Date()
  sportData: any = [];
  sportDataList: any = [];
  sportTypeData: any = [];
  stations: any = [];
  monitors: any = [];
  schoolData: any = [];
  extras: any = []

  mode: 'create' | 'update' = 'create';
  loading: boolean = true;
  extrasModal: boolean = false
  confirmModal: boolean = false
  editModal: boolean = false
  editFunctionName: string | null = null;
  editFunctionArgs: any[] = [];

  setEditFunction(functionName: string, ...args: any[]) {
    this.editFunctionName = functionName;
    this.editFunctionArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  }

  executeEditFunction() {
    if (this.editFunctionName && typeof this[this.editFunctionName] === 'function') {
      this[this.editFunctionName](...this.editFunctionArgs);
    }
    this.editModal = false;
  }

  translateExpandedIndex: number = 0
  user: any;
  id: any = null;
  // Array simple para intervalos
  intervals: any[];
  useMultipleIntervals = false;
  mustBeConsecutive = false;
  mustStartFromFirst = false;

  // Configuración de niveles por intervalo
  configureLevelsByInterval = false;
  intervalLevelsConfig: Record<number, any> = {}; // Configuración de niveles por intervalo

  intervalGroupsMap: Record<string, IntervalGroupsState> = {};
  intervalGroups: IntervalGroupsState[] = [];
  selectedIntervalIndexForGroups = 0;
  selectedIntervalKeyForGroups: string | null = null;
  selectedIntervalTabIndex = 0; // Para las pestañas en la sección de detalles
  selectedIntervalFilterIndex = 0; // 0 = all intervals, 1+ = specific interval (index - 1)

  get canConfigureIntervalGroups(): boolean {
    return !!this.courses?.courseFormGroup?.controls?.['is_flexible']?.value
      && !!this.useMultipleIntervals
      && Array.isArray(this.intervals)
      && this.intervals.length > 1;
  }

  get isIntervalGroupModeActive(): boolean {
    const control = this.courses?.courseFormGroup?.get('use_interval_groups');
    return this.canConfigureIntervalGroups && !!control?.value;
  }

  private enforceIntervalGroupAvailability(): void {
    const control = this.courses?.courseFormGroup?.get('use_interval_groups');
    if (!control) {
      return;
    }

    const canUse = this.canConfigureIntervalGroups;
    if (!canUse) {
      if (control.value) {
        control.setValue(false, { emitEvent: false });
      }
      if (control.enabled) {
        control.disable({ emitEvent: false });
      }
    } else if (control.disabled) {
      control.enable({ emitEvent: false });
    }
  }

  private baseIntervalGroupTemplate: IntervalGroupsState = {};
  private intervalGroupSyncHandle: any = null;

  // Discount system properties
  enableMultiDateDiscounts = false;
  discountsByDates: any[] = [];

  // Flag to prevent sync during bulk schedule application
  private _applyingBulkSchedule = false;

  // Date selection method properties (global fallback)
  selectedDateMethod: 'consecutive' | 'weekly' | 'manual' = 'consecutive';
  weeklyPattern: { [key: string]: boolean } = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false
  };
  consecutiveDaysCount: number = 5;
  maxSelectableDates: number = 15;

  get isSingleIntervalMode(): boolean {
    const courseTypeControl = this.courses?.courseFormGroup?.get('course_type');
    const isFlexibleControl = this.courses?.courseFormGroup?.get('is_flexible');

    const courseType = Number(courseTypeControl?.value);
    const isFlexibleValue = isFlexibleControl?.value;
    const isFlexible =
      isFlexibleValue === true ||
      isFlexibleValue === 1 ||
      isFlexibleValue === '1' ||
      isFlexibleValue === 'true';

    return courseType === 1 && !isFlexible;
  }

  private ensureSingleIntervalForNonFlexible(): any | null {
    this.intervals = Array.isArray(this.intervals) ? this.intervals : [];

    // Force using a single interval whenever the multiple interval toggle is off.
    const shouldEnforceSingleInterval = !this.useMultipleIntervals || this.isSingleIntervalMode;

    if (shouldEnforceSingleInterval) {
      if (this.intervals.length === 0) {
        const defaultInterval = this.createDefaultInterval();
        this.intervals = [defaultInterval];
      } else if (this.intervals.length > 1) {
        const [firstInterval] = this.intervals;
        this.intervals = [firstInterval];
      }
    } else if (this.intervals.length === 0) {
      const defaultInterval = this.createDefaultInterval();
      this.intervals = [defaultInterval];
    }

    if (this.intervals.length === 0) {
      return null;
    }

    if (!Array.isArray(this.intervals[0].dates)) {
      this.intervals[0].dates = [];
    }

    return this.intervals[0];
  }

  private normalizeCourseDateKey(date: CourseDate): string {
    const normalizedDate = date?.date ?? '';
    const normalizedHour = date?.hour_start ?? '';
    return `${normalizedDate}T${normalizedHour}`;
  }

  private upsertSingleIntervalDates(dates: CourseDate[]): CourseDate[] {
    // PROTECCI├ôN: No ejecutar durante aplicaci├│n de horario masivo
    if (this._applyingBulkSchedule) {
      return dates; // Retornar las fechas tal como vinieron
    }

    const targetInterval = this.ensureSingleIntervalForNonFlexible();

    if (!targetInterval) {
      return [];
    }

    const existingDates = Array.isArray(targetInterval.dates) ? [...targetInterval.dates] : [];
    const incomingDates = Array.isArray(dates) ? [...dates] : [];

    const combinedDates = [...existingDates, ...incomingDates].filter(date => !!date && !!date.date && !!date.hour_start);
    const dedupedMap = new Map<string, CourseDate>();

    combinedDates.forEach(date => {
      const key = this.normalizeCourseDateKey(date);

      if (!key.trim()) {
        return;
      }

      const normalizedDate: CourseDate = {
        ...date,
        interval_id: date.interval_id || targetInterval.id
      };

      if (dedupedMap.has(key)) {
        dedupedMap.set(key, {
          ...dedupedMap.get(key),
          ...normalizedDate
        });
      } else {
        dedupedMap.set(key, { ...normalizedDate });
      }
    });

    const dedupedDates = Array.from(dedupedMap.values());

    dedupedDates.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.hour_start || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.hour_start || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });

    dedupedDates.forEach((date, index) => {
      date.order = index + 1;
      if (!date.interval_id) {
        date.interval_id = targetInterval.id;
      }
    });

    this.intervals[0].dates = dedupedDates.map(date => ({ ...date }));

    return this.intervals[0].dates;
  }

  private getCurrentSettingsObject(): any {
    try {
      const rawSettings = this.courses.courseFormGroup?.get('settings')?.value;
      if (!rawSettings) {
        return {};
      }

      return typeof rawSettings === 'string'
        ? JSON.parse(rawSettings)
        : { ...rawSettings };
    } catch (error) {
      console.warn('Unable to parse current settings', error);
      return {};
    }
  }

  private translateKey(key: string, fallback: string): string {
    try {
      const translated = this.translateService?.instant?.(key);
      if (translated && translated !== key) {
        return translated;
      }
    } catch (error) {
      // Ignore translation errors and use fallback
    }
    return fallback;
  }

  private createSubgroupState(subgroup: any, levelId: number | string, index: number): IntervalSubgroupState {
    const subgroupId = subgroup?.id;
    const key = subgroupId != null
      ? `id-${subgroupId}`
      : subgroup?.key || `level-${levelId}-sg-${index}`;

    return {
      id: subgroupId ?? subgroup?.subgroup_id ?? undefined,
      degree_id: subgroup?.degree_id ?? levelId,
      max_participants: subgroup?.max_participants ?? undefined,
      active: subgroup?.active !== false,
      monitor: subgroup?.monitor ?? undefined,
      monitor_id: subgroup?.monitor_id ?? undefined,
      key
    };
  }

  private createGroupStateFromGroup(group: any): IntervalGroupState {
    const levelId = group?.degree_id ?? group?.id;
    const baseSubgroups = Array.isArray(group?.course_subgroups)
      ? group.course_subgroups
      : Array.isArray(group?.subgroups)
        ? group.subgroups
        : [];

    const subgroups = baseSubgroups.map((subgroup: any, index: number) =>
      this.createSubgroupState(subgroup, levelId, index)
    );

    const maxParticipants = group?.max_participants
      ?? (subgroups.length > 0 ? subgroups[0].max_participants : undefined);

    return {
      levelId,
      active: true,
      max_participants: maxParticipants,
      subgroups
    };
  }

  private createGroupStateFromLevel(level: any): IntervalGroupState {
    const levelId = level?.id ?? level?.degree_id;
    const subgroupsSource = Array.isArray(level?.course_subgroups)
      ? level.course_subgroups
      : Array.isArray(level?.subgroups)
        ? level.subgroups
        : [];

    const subgroups = subgroupsSource.map((subgroup: any, index: number) =>
      this.createSubgroupState(subgroup, levelId, index)
    );

    if (subgroups.length === 0) {
      subgroups.push(this.createSubgroupState({ max_participants: level?.max_participants }, levelId, 0));
    }

    return {
      levelId,
      active: !!level?.active,
      max_participants: level?.max_participants ?? undefined,
      subgroups
    };
  }

  private cloneGroupState(state: IntervalGroupState): IntervalGroupState {
    return {
      levelId: state.levelId,
      active: state.active,
      max_participants: state.max_participants,
      subgroups: (state.subgroups || []).map(subgroup => ({ ...subgroup }))
    };
  }

  private cloneGroupsStateMap(state: IntervalGroupsState): IntervalGroupsState {
    const cloned: IntervalGroupsState = {};
    Object.keys(state || {}).forEach(key => {
      cloned[key] = this.cloneGroupState(state[key]);
    });
    return cloned;
  }

  private cloneIntervalGroupsState(list: IntervalGroupsState[]): IntervalGroupsState[] {
    if (!Array.isArray(list)) {
      return [];
    }

    return list.map(state => this.cloneGroupsStateMap(state));
  }

  private cloneIntervalGroupsMap(source: Record<string, IntervalGroupsState>): Record<string, IntervalGroupsState> {
    const cloned: Record<string, IntervalGroupsState> = {};
    Object.keys(source || {}).forEach(key => {
      cloned[key] = this.cloneGroupsStateMap(source[key]);
    });
    return cloned;
  }

  private serializeIntervalGroupsAsArray(): IntervalGroupsState[] {
    const template = this.ensureIntervalGroupTemplate();
    const intervals = Array.isArray(this.intervals) ? this.intervals : [];
    if (intervals.length === 0) {
      return [this.mergeGroupStates(template)];
    }
    return intervals.map((interval, index) => {
      const key = this.resolveIntervalKey(interval, index);
      const config = this.intervalGroupsMap?.[key];
      return this.cloneGroupsStateMap(config ?? this.mergeGroupStates(template));
    });
  }

  private serializeIntervalGroupsById(): Record<string, IntervalGroupsState> {
    const result: Record<string, IntervalGroupsState> = {};
    Object.keys(this.intervalGroupsMap || {}).forEach(key => {
      result[key] = this.cloneGroupsStateMap(this.intervalGroupsMap[key]);
    });
    return result;
  }

  private mergeSubgroups(base: IntervalSubgroupState[], existing: IntervalSubgroupState[] | undefined): IntervalSubgroupState[] {
    const result: IntervalSubgroupState[] = [];
    const existingMap = new Map<string, IntervalSubgroupState>();

    (existing || []).forEach(subgroup => {
      if (subgroup?.key) {
        existingMap.set(subgroup.key, { ...subgroup });
      }
    });

    base.forEach(baseSubgroup => {
      const existingSubgroup = baseSubgroup?.key ? existingMap.get(baseSubgroup.key) : undefined;
      if (existingSubgroup) {
        result.push({
          ...baseSubgroup,
          ...existingSubgroup,
          key: baseSubgroup.key
        });
        existingMap.delete(baseSubgroup.key);
      } else {
        result.push({ ...baseSubgroup });
      }
    });

    existingMap.forEach(subgroup => {
      result.push({ ...subgroup });
    });

    return result;
  }

  private mergeGroupStates(template: IntervalGroupsState, existing?: IntervalGroupsState): IntervalGroupsState {
    const merged: IntervalGroupsState = {};

    Object.keys(template || {}).forEach(levelKey => {
      const templateGroup = template[levelKey];
      const existingGroup = existing?.[levelKey];

      if (existingGroup) {
        merged[levelKey] = {
          levelId: existingGroup.levelId ?? templateGroup.levelId,
          active: existingGroup.active,
          max_participants: existingGroup.max_participants ?? templateGroup.max_participants,
          subgroups: this.mergeSubgroups(templateGroup.subgroups, existingGroup.subgroups)
        };
      } else {
        merged[levelKey] = this.cloneGroupState(templateGroup);
      }
    });

    if (existing) {
      Object.keys(existing).forEach(levelKey => {
        if (!merged[levelKey]) {
          merged[levelKey] = this.cloneGroupState(existing[levelKey]);
        }
      });
    }

    return merged;
  }

  private buildGlobalIntervalGroupTemplate(): IntervalGroupsState {
    const template: IntervalGroupsState = {};
    const baseGroups = this.getCourseDateGroups();

    if (Array.isArray(baseGroups) && baseGroups.length > 0) {
      baseGroups.forEach(group => {
        const levelId = group?.degree_id ?? group?.id;
        if (levelId == null) {
          return;
        }
        template[String(levelId)] = this.createGroupStateFromGroup(group);
      });
    }

    const levels = this.courses.courseFormGroup?.controls?.['levelGrop']?.value || [];
    levels.forEach((level: any) => {
      const levelId = level?.id ?? level?.degree_id;
      if (levelId == null) {
        return;
      }
      const key = String(levelId);
      if (!template[key]) {
        template[key] = this.createGroupStateFromLevel(level);
      }
    });

    return template;
  }

  private ensureIntervalGroupTemplate(): IntervalGroupsState {
    if (!this.baseIntervalGroupTemplate || Object.keys(this.baseIntervalGroupTemplate).length === 0) {
      this.baseIntervalGroupTemplate = this.buildGlobalIntervalGroupTemplate();
    }

    return this.baseIntervalGroupTemplate;
  }

  private ensureIntervalGroupsAlignment(): void {
    const template = this.ensureIntervalGroupTemplate();
    if (!this.intervalGroupsMap || typeof this.intervalGroupsMap !== 'object') {
      this.intervalGroupsMap = {};
    }

    const intervals = Array.isArray(this.intervals) ? this.intervals : [];
    const aligned: Record<string, IntervalGroupsState> = {};

    intervals.forEach((interval, index) => {
      const key = this.resolveIntervalKey(interval, index);
      const existing = this.intervalGroupsMap[key];
      aligned[key] = this.mergeGroupStates(template, existing);
    });

    if (intervals.length === 0) {
      const fallback = Object.keys(this.intervalGroupsMap)[0];
      if (fallback) {
        aligned[fallback] = this.mergeGroupStates(template, this.intervalGroupsMap[fallback]);
      }
    }

    const previousKey = this.selectedIntervalKeyForGroups;
    this.intervalGroupsMap = aligned;
    this.ensureSelectedIntervalSelection(previousKey);
    this.syncIntervalGroupsArray();
  }

  private syncIntervalGroupsArray(): void {
    const intervals = Array.isArray(this.intervals) ? this.intervals : [];

    if (intervals.length === 0) {
      const fallbackKey = Object.keys(this.intervalGroupsMap || {})[0];
      this.intervalGroups = fallbackKey ? [this.intervalGroupsMap[fallbackKey]] : [];
      return;
    }

    this.intervalGroups = intervals.map((interval, index) => {
      const key = this.resolveIntervalKey(interval, index);
      const existing = this.intervalGroupsMap?.[key];
      if (existing) {
        return existing;
      }
      const template = this.ensureIntervalGroupTemplate();
      const defaultConfig = this.mergeGroupStates(template);
      this.intervalGroupsMap[key] = defaultConfig;
      return defaultConfig;
    });
  }

  private ensureSelectedIntervalSelection(previousKey?: string | null): void {
    const intervals = Array.isArray(this.intervals) ? this.intervals : [];

    if (intervals.length === 0) {
      this.selectedIntervalIndexForGroups = 0;
      this.selectedIntervalKeyForGroups = null;
      return;
    }

    const desiredKey = previousKey ?? this.selectedIntervalKeyForGroups;
    if (desiredKey) {
      const foundIndex = intervals.findIndex((interval, idx) => this.resolveIntervalKey(interval, idx) === desiredKey);
      if (foundIndex >= 0) {
        this.selectedIntervalIndexForGroups = foundIndex;
        this.selectedIntervalKeyForGroups = desiredKey;
        return;
      }
    }

    this.selectedIntervalIndexForGroups = Math.min(this.selectedIntervalIndexForGroups, intervals.length - 1);
    if (this.selectedIntervalIndexForGroups < 0) {
      this.selectedIntervalIndexForGroups = 0;
    }
    this.selectedIntervalKeyForGroups = this.resolveIntervalKey(
      intervals[this.selectedIntervalIndexForGroups],
      this.selectedIntervalIndexForGroups
    );
  }

  resolveIntervalKey(interval: any, index: number): string {
    if (!interval) {
      return 'tmp-' + String(index);
    }

    if (interval.id !== undefined && interval.id !== null && interval.id !== '') {
      return String(interval.id);
    }

    const currentKey = (interval as any).__clientKey;
    if (!currentKey) {
      (interval as any).__clientKey = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    return String((interval as any).__clientKey);
  }

  getIntervalState(interval: any, index: number): IntervalGroupsState | null {
    const key = this.resolveIntervalKey(interval, index);
    return this.intervalGroupsMap?.[key] ?? null;
  }

  getIntervalStateByIndex(index: number): IntervalGroupsState | null {
    if (!Array.isArray(this.intervals) || index < 0 || index >= this.intervals.length) {
      return null;
    }
    return this.getIntervalState(this.intervals[index], index);
  }

  getSelectedIntervalState(): IntervalGroupsState | null {
    return this.getIntervalStateByIndex(this.selectedIntervalIndexForGroups);
  }

  private cloneCourseGroups(groups: any[]): any[] {
    if (!Array.isArray(groups)) {
      return [];
    }

    return groups.map(group => ({
      ...group,
      course_subgroups: Array.isArray(group?.course_subgroups)
        ? group.course_subgroups.map((subgroup: any) => ({ ...subgroup }))
        : [],
      subgroups: Array.isArray(group?.subgroups)
        ? group.subgroups.map((subgroup: any) => ({ ...subgroup }))
        : Array.isArray(group?.course_subgroups)
          ? group.course_subgroups.map((subgroup: any) => ({ ...subgroup }))
          : []
    }));
  }

  private buildCourseSubgroupsForInterval(levelId: string, config: IntervalGroupState, baseGroup: any): any[] {
    const baseSubgroups = Array.isArray(baseGroup?.course_subgroups)
      ? baseGroup.course_subgroups
      : Array.isArray(baseGroup?.subgroups)
        ? baseGroup.subgroups
        : [];

    const baseMap = new Map<string, any>();
    baseSubgroups.forEach((subgroup: any, index: number) => {
      const key = subgroup?.id != null ? `id-${subgroup.id}` : `base-${index}`;
      baseMap.set(key, subgroup);
    });

    const configuredSubgroups: any[] = [];

    (config.subgroups || []).forEach((subgroupConfig, index) => {
      if (subgroupConfig?.active === false) {
        return;
      }

      const key = subgroupConfig?.key || (subgroupConfig?.id != null ? `id-${subgroupConfig.id}` : `cfg-${index}`);
      const base = baseMap.get(key);

      const merged = {
        ...(base ? { ...base } : {
          degree_id: subgroupConfig?.degree_id ?? config.levelId ?? levelId
        })
      };

      merged.max_participants = subgroupConfig?.max_participants
        ?? merged.max_participants
        ?? config.max_participants
        ?? undefined;

      if (subgroupConfig?.monitor !== undefined) {
        merged.monitor = subgroupConfig.monitor;
      }
      if (subgroupConfig?.monitor_id !== undefined) {
        merged.monitor_id = subgroupConfig.monitor_id;
      }
      if (subgroupConfig?.id !== undefined) {
        merged.id = subgroupConfig.id;
      }

      configuredSubgroups.push(merged);
    });

    if (configuredSubgroups.length === 0 && baseSubgroups.length > 0) {
      baseSubgroups.forEach((subgroup: any) => {
        configuredSubgroups.push({ ...subgroup });
      });
    }

    if (configuredSubgroups.length === 0) {
      configuredSubgroups.push({
        degree_id: config.levelId ?? levelId,
        max_participants: config.max_participants ?? undefined
      });
    }

    return configuredSubgroups;
  }

  private buildCourseGroupsForInterval(interval: any, intervalIndex: number): any[] {
    const baseGroups = this.getCourseDateGroups();
    const useIntervalGroups = !!this.courses.courseFormGroup?.get('use_interval_groups')?.value;
    if (!useIntervalGroups) {
      return this.cloneCourseGroups(baseGroups);
    }

    const key = this.resolveIntervalKey(interval, intervalIndex);
    const intervalConfig = this.intervalGroupsMap?.[key];

    if (!intervalConfig) {
      return this.cloneCourseGroups(baseGroups);
    }

    const result: any[] = [];
    const baseGroupMap = new Map<string, any>();
    (baseGroups || []).forEach(group => {
      const levelId = group?.degree_id ?? group?.id;
      if (levelId != null) {
        baseGroupMap.set(String(levelId), group);
      }
    });

    Object.keys(intervalConfig).forEach(levelKey => {
      const config = intervalConfig[levelKey];
      if (!config || config.active === false) {
        return;
      }

      const baseGroup = baseGroupMap.get(levelKey);
      const groupClone = baseGroup ? { ...baseGroup } : { degree_id: config.levelId ?? levelKey };

      groupClone.max_participants = config.max_participants
        ?? groupClone.max_participants
        ?? undefined;

      const subgroups = this.buildCourseSubgroupsForInterval(levelKey, config, baseGroup);
      groupClone.course_subgroups = subgroups.map(subgroup => ({ ...subgroup }));
      groupClone.subgroups = groupClone.course_subgroups.map((subgroup: any) => ({ ...subgroup }));

      result.push(groupClone);
    });

    return result;
  }

  private refreshIntervalGroupStateFromSettings(): void {
    this.baseIntervalGroupTemplate = {};
    const settings = this.getCurrentSettingsObject();

    let groupsMap: Record<string, IntervalGroupsState> | null = null;

    if (settings && typeof settings === 'object') {
      if (settings.intervalGroupsById && typeof settings.intervalGroupsById === 'object') {
        groupsMap = this.cloneIntervalGroupsMap(settings.intervalGroupsById);
      } else if (Array.isArray(settings.intervalGroups)) {
        const intervals = Array.isArray(this.intervals) ? this.intervals : [];
        groupsMap = {};
        settings.intervalGroups.forEach((groupState: IntervalGroupsState, idx: number) => {
          const interval = intervals[idx];
          const key = interval ? this.resolveIntervalKey(interval, idx) : `idx-${idx}`;
          groupsMap[key] = this.cloneGroupsStateMap(groupState);
        });
      }
    }

    if (groupsMap) {
      this.intervalGroupsMap = groupsMap;
    } else {
      this.intervalGroupsMap = this.buildIntervalGroupsFromCourseDates();
    }

    this.ensureIntervalGroupsAlignment();
    this.enforceIntervalGroupAvailability();
  }

  private buildIntervalGroupsFromCourseDates(): Record<string, IntervalGroupsState> {
    const template = this.ensureIntervalGroupTemplate();
    const courseDates = this.courses.courseFormGroup?.get('course_dates')?.value || [];
    const grouped: Record<string, IntervalGroupsState> = {};

    (courseDates || []).forEach((courseDate: any) => {
      const intervalId = courseDate?.interval_id != null
        ? String(courseDate.interval_id)
        : '0';

      if (!grouped[intervalId]) {
        grouped[intervalId] = this.mergeGroupStates(template);
      }

      const dateGroups = courseDate?.course_groups || courseDate?.groups || [];
      (dateGroups || []).forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.id;
        if (levelId == null) {
          return;
        }
        const levelKey = String(levelId);
        const existing = grouped[intervalId][levelKey];
        const fromGroup = this.createGroupStateFromGroup(group);
        grouped[intervalId][levelKey] = {
          levelId,
          active: true,
          max_participants: fromGroup.max_participants ?? existing?.max_participants,
          subgroups: this.mergeSubgroups(existing?.subgroups || [], fromGroup.subgroups)
        };
      });
    });

    const intervals = Array.isArray(this.intervals) ? this.intervals : [];
    const result: Record<string, IntervalGroupsState> = {};

    intervals.forEach((interval, index) => {
      const key = this.resolveIntervalKey(interval, index);
      const stored = grouped[key];
      result[key] = stored ? this.mergeGroupStates(template, stored) : this.mergeGroupStates(template);
      if (stored) {
        delete grouped[key];
      }
    });

    Object.keys(grouped).forEach(key => {
      if (!result[key]) {
        result[key] = this.mergeGroupStates(template, grouped[key]);
      }
    });

    if (Object.keys(result).length === 0) {
      const fallbackKey = intervals.length
        ? this.resolveIntervalKey(intervals[0], 0)
        : 'default';
      result[fallbackKey] = this.mergeGroupStates(template);
    }

    return result;
  }

  private scheduleIntervalGroupsSync(): void {
    if (this.intervalGroupSyncHandle) {
      clearTimeout(this.intervalGroupSyncHandle);
    }

    this.intervalGroupSyncHandle = setTimeout(() => {
      this.intervalGroupSyncHandle = null;
      this.syncIntervalsToCourseFormGroup();
    }, 120);
  }

  private createIntervalBasedOnPrevious(previousInterval: any): any {
    const baseInterval = this.buildIntervalTemplate();

    if (!previousInterval) {
      return baseInterval;
    }

    const prevStart = previousInterval?.startDate ? new Date(previousInterval.startDate) : null;
    const prevEnd = previousInterval?.endDate ? new Date(previousInterval.endDate) : null;

    if (prevEnd) {
      const nextDay = new Date(prevEnd);
      nextDay.setDate(prevEnd.getDate() + 1);
      baseInterval.startDate = nextDay.toISOString().split('T')[0];
      baseInterval.reservableStartDate = baseInterval.startDate;
    }

    if (prevStart && prevEnd) {
      const diffDays = Math.max(Math.round((prevEnd.getTime() - prevStart.getTime()) / 86400000) + 1, 1);
      const newEnd = new Date(baseInterval.startDate);
      newEnd.setDate(newEnd.getDate() + diffDays - 1);
      baseInterval.endDate = newEnd.toISOString().split('T')[0];
      baseInterval.reservableEndDate = baseInterval.endDate;
      baseInterval.consecutiveDaysCount = diffDays;
    }

    baseInterval.dateGenerationMethod = previousInterval?.dateGenerationMethod || baseInterval.dateGenerationMethod;
    baseInterval.weeklyPattern = previousInterval?.weeklyPattern
      ? { ...previousInterval.weeklyPattern }
      : baseInterval.weeklyPattern;
    baseInterval.mustBeConsecutive = previousInterval?.mustBeConsecutive ?? baseInterval.mustBeConsecutive;
    baseInterval.mustStartFromFirst = previousInterval?.mustStartFromFirst ?? baseInterval.mustStartFromFirst;
    baseInterval.scheduleStartTime = previousInterval?.scheduleStartTime || baseInterval.scheduleStartTime;
    baseInterval.scheduleDuration = previousInterval?.scheduleDuration || baseInterval.scheduleDuration;

    if (Array.isArray(previousInterval?.dates) && previousInterval.dates.length > 0) {
      const prevFirstDate = previousInterval.dates[0]?.date ? new Date(previousInterval.dates[0].date) : null;
      const newFirstDate = baseInterval.startDate ? new Date(baseInterval.startDate) : null;
      const offset = prevFirstDate && newFirstDate
        ? Math.round((newFirstDate.getTime() - prevFirstDate.getTime()) / 86400000)
        : 0;

      baseInterval.dates = previousInterval.dates.map((date: any, index: number) => {
        const newDate = date?.date ? new Date(date.date) : newFirstDate;
        if (newDate) {
          newDate.setDate(newDate.getDate() + offset);
        }
        return {
          ...date,
          id: undefined,
          interval_id: baseInterval.id,
          date: newDate ? newDate.toISOString().split('T')[0] : baseInterval.startDate,
          order: index + 1
        };
      });
    }

    return baseInterval;
  }

  private applyAutoGenerationForInterval(intervalIndex: number, previousInterval: any): void {
    const interval = this.intervals?.[intervalIndex];
    if (!interval) {
      return;
    }

    if (interval.dateGenerationMethod === 'consecutive') {
      this.generateIntervalConsecutiveDates(intervalIndex);
    } else if (interval.dateGenerationMethod === 'weekly') {
      this.generateIntervalWeeklyDates(intervalIndex);
    } else if (!Array.isArray(interval.dates) || interval.dates.length === 0) {
      if (previousInterval?.dates?.length) {
        this.intervals[intervalIndex].dates = previousInterval.dates.map((date: any, index: number) => ({
          ...date,
          id: undefined,
          interval_id: interval.id,
          order: index + 1
        }));
        this.syncIntervalsToCourseFormGroup();
      } else {
        this.addCourseDateToInterval(intervalIndex);
      }
    } else {
      this.syncIntervalsToCourseFormGroup();
    }
  }

  private adjustIntervalDatesWithinRange(intervalIndex: number): void {
    const interval = this.intervals?.[intervalIndex];
    if (!interval || !Array.isArray(interval.dates)) {
      return;
    }

    const start = interval.startDate ? new Date(interval.startDate) : null;
    const end = interval.endDate ? new Date(interval.endDate) : null;

    if (!start || !end) {
      return;
    }

    interval.dates = interval.dates.filter((date: any) => {
      if (!date?.date) {
        return false;
      }
      const current = new Date(date.date);
      return current >= start && current <= end;
    });

    interval.dates.forEach((date: any, index: number) => {
      date.order = index + 1;
      date.interval_id = interval.id;
    });

    this.scheduleIntervalGroupsSync();
  }

  trackInterval(index: number, interval: any): string {
    return interval?.id ? String(interval.id) : `interval-${index}`;
  }

  trackIntervalDate(index: number, date: any): string {
    const key = date?.id ?? date?.order ?? `${date?.date || 'date'}-${date?.hour_start || index}`;
    return String(key);
  }

  trackLevel(index: number, level: any): string {
    return level?.id ? String(level.id) : `level-${index}`;
  }

  trackIntervalSubgroup(index: number, subgroup: any): string {
    if (subgroup?.id != null) {
      return `subgroup-${subgroup.id}`;
    }
    if (subgroup?.key) {
      return subgroup.key;
    }
    return `subgroup-${index}`;
  }

  // Obtener las fechas de curso filtradas por intervalo
  getCourseDatesForInterval(intervalIndex: number): any[] {
    if (!this.useMultipleIntervals || !Array.isArray(this.intervals) || intervalIndex >= this.intervals.length) {
      return this.courses?.courseFormGroup?.controls['course_dates']?.value || [];
    }

    const interval = this.intervals[intervalIndex];
    const intervalId = interval?.id;
    const courseDates = this.courses?.courseFormGroup?.controls['course_dates']?.value || [];

    // Filtrar las fechas que pertenecen a este intervalo
    return courseDates.filter(cd => cd.interval_id === intervalId || cd.interval_id === String(intervalId));
  }

  // Verificar si un nivel tiene grupos en un intervalo específico
  hasGroupsInInterval(level: any, intervalIndex: number): boolean {
    const courseDates = this.getCourseDatesForInterval(intervalIndex);
    if (!courseDates.length || !courseDates[0]?.course_groups) {
      return false;
    }

    return courseDates.some(cd => {
      const group = this.find(cd.course_groups, 'degree_id', level.id);
      return group && group.course_subgroups && group.course_subgroups.length > 0;
    });
  }

  // Obtener los course_groups de un nivel para un intervalo específico
  getGroupsForInterval(level: any, intervalIndex: number): any[] {
    const courseDates = this.getCourseDatesForInterval(intervalIndex);
    const allGroups: any[] = [];

    courseDates.forEach(cd => {
      if (cd.course_groups) {
        const group = this.find(cd.course_groups, 'degree_id', level.id);
        if (group && !allGroups.find(g => g.degree_id === group.degree_id)) {
          allGroups.push(group);
        }
      }
    });

    return allGroups;
  }

  // Manejar cambio de tab de intervalo
  onIntervalTabChange(index: number): void {
    this.selectedIntervalTabIndex = index;
  }

  // Cache para getAllSubgroupsForLevel
  private allSubgroupsCache: Map<number, any[]> = new Map();

  // Obtener todos los subgrupos únicos de un nivel a través de todas las fechas del curso
  // IMPORTANTE: Los subgrupos se identifican por su ÍNDICE, no por su ID
  // Un mismo índice representa el mismo subgrupo a través de todas las fechas
  getAllSubgroupsForLevel(level: any): any[] {
    if (!level?.id) return [];

    // Usar cache para evitar búsquedas repetidas
    if (this.allSubgroupsCache.has(level.id)) {
      return this.allSubgroupsCache.get(level.id)!;
    }

    const courseDates = this.courses?.courseFormGroup?.controls['course_dates']?.value || [];
    const subgroupsByIndex = new Map<number, any>();

    // Recorrer todas las fechas para encontrar el número máximo de subgrupos
    courseDates.forEach((courseDate: any) => {
      if (courseDate.course_groups) {
        const levelGroup = this.find(courseDate.course_groups, 'degree_id', level.id);
        if (levelGroup && levelGroup.course_subgroups) {
          levelGroup.course_subgroups.forEach((subgroup: any, index: number) => {
            // La clave es SOLO el índice - esto agrupa subgrupos por posición
            if (!subgroupsByIndex.has(index)) {
              subgroupsByIndex.set(index, {
                ...subgroup,
                _index: index,
                _levelId: level.id
              });
            }
          });
        }
      }
    });

    // Convertir a array ordenado por índice
    const result = Array.from(subgroupsByIndex.entries())
      .sort(([indexA], [indexB]) => indexA - indexB)
      .map(([_, subgroup]) => subgroup);

    this.allSubgroupsCache.set(level.id, result);
    return result;
  }


  // Verificar si un nivel tiene subgrupos en alguna fecha
  levelHasSubgroups(level: any): boolean {
    const courseDates = this.courses?.courseFormGroup?.controls['course_dates']?.value || [];

    return courseDates.some((courseDate: any) => {
      if (courseDate.course_groups) {
        const levelGroup = this.find(courseDate.course_groups, 'degree_id', level.id);
        return levelGroup && levelGroup.course_subgroups && levelGroup.course_subgroups.length > 0;
      }
      return false;
    });
  }

  // Cache para getGroupForLevel
  private groupForLevelCache: Map<number, any> = new Map();

  // Obtener el grupo de un nivel de cualquier fecha (para pasar al componente de disponibilidad)
  getGroupForLevel(level: any): any {
    if (!level?.id) return null;

    // Usar cache para evitar búsquedas repetidas
    if (this.groupForLevelCache.has(level.id)) {
      return this.groupForLevelCache.get(level.id);
    }

    const courseDates = this.courses?.courseFormGroup?.controls['course_dates']?.value || [];

    for (const courseDate of courseDates) {
      if (courseDate.course_groups) {
        const levelGroup = this.find(courseDate.course_groups, 'degree_id', level.id);
        if (levelGroup) {
          this.groupForLevelCache.set(level.id, levelGroup);
          return levelGroup;
        }
      }
    }

    this.groupForLevelCache.set(level.id, null);
    return null;
  }

  // Limpiar cache cuando cambian los datos
  private clearGroupCache(): void {
    this.groupForLevelCache.clear();
    this.allSubgroupsCache.clear();
  }

  // ============================================
  // FUNCIONES PARA CONFIGURACIÓN POR INTERVALOS
  // ============================================

  onConfigureLevelsByIntervalChange(): void {
    if (this.configureLevelsByInterval) {
      // Inicializar configuración para cada intervalo
      this.initializeIntervalLevelsConfig();
    } else {
      // Limpiar configuración de intervalos
      this.intervalLevelsConfig = {};
    }
  }

  private initializeIntervalLevelsConfig(): void {
    this.intervals?.forEach((interval, idx) => {
      if (!this.intervalLevelsConfig[idx]) {
        this.intervalLevelsConfig[idx] = {
          levels: {},
          subgroups: {}
        };
      }
    });
  }

  getIntervalLabel(interval: any, index: number): string {
    if (interval.name) {
      return interval.name;
    }
    const startDate = interval.startDate ? new Date(interval.startDate) : null;
    const endDate = interval.endDate ? new Date(interval.endDate) : null;

    if (startDate && endDate) {
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}`;
      };
      return `${this.translateService.instant('interval')} ${index + 1}: ${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    return `${this.translateService.instant('interval')} ${index + 1}`;
  }

  selectLevelForInterval(intervalIdx: number, event: any, levelIdx: number): void {
    if (!this.intervalLevelsConfig[intervalIdx]) {
      this.intervalLevelsConfig[intervalIdx] = { levels: {}, subgroups: {} };
    }

    const level = this.courses.courseFormGroup.controls['levelGrop'].value[levelIdx];
    const isActive = !level.active;

    this.intervalLevelsConfig[intervalIdx].levels[level.id] = isActive;

    if (isActive && !this.intervalLevelsConfig[intervalIdx].subgroups[level.id]) {
      // Crear al menos un subgrupo por defecto
      this.intervalLevelsConfig[intervalIdx].subgroups[level.id] = [{ index: 0 }];
    }
  }

  addLevelSubgroupForInterval(intervalIdx: number, level: any, subgroupIdx: number, add: boolean): void {
    if (!this.intervalLevelsConfig[intervalIdx]) {
      this.intervalLevelsConfig[intervalIdx] = { levels: {}, subgroups: {} };
    }

    if (!this.intervalLevelsConfig[intervalIdx].subgroups[level.id]) {
      this.intervalLevelsConfig[intervalIdx].subgroups[level.id] = [];
    }

    if (add) {
      const newIndex = this.intervalLevelsConfig[intervalIdx].subgroups[level.id].length;
      this.intervalLevelsConfig[intervalIdx].subgroups[level.id].push({ index: newIndex });
    }
  }

  removeLevelSubgroupForInterval(intervalIdx: number, level: any, subgroupIdx: number): void {
    if (this.intervalLevelsConfig[intervalIdx]?.subgroups[level.id]) {
      this.intervalLevelsConfig[intervalIdx].subgroups[level.id].splice(subgroupIdx, 1);
    }
  }

  getSubgroupsForIntervalLevel(intervalIdx: number, levelId: number): any[] {
    return this.intervalLevelsConfig[intervalIdx]?.subgroups[levelId] || [];
  }

  copyIntervalConfigToAll(sourceIntervalIdx: number): void {
    const sourceConfig = this.intervalLevelsConfig[sourceIntervalIdx];

    if (!sourceConfig) {
      return;
    }

    // Copiar configuración a todos los demás intervalos
    this.intervals?.forEach((_, idx) => {
      if (idx !== sourceIntervalIdx) {
        this.intervalLevelsConfig[idx] = {
          levels: { ...sourceConfig.levels },
          subgroups: JSON.parse(JSON.stringify(sourceConfig.subgroups))
        };
      }
    });

    this.snackBar.open(
      this.translateService.instant('configuration_copied_to_all_intervals'),
      'OK',
      { duration: 3000 }
    );
  }

  constructor(private fb: UntypedFormBuilder, public dialog: MatDialog,
              private crudService: ApiCrudService, private activatedRoute: ActivatedRoute,
              public router: Router, private schoolService: SchoolService,
              private snackBar: MatSnackBar,
    private courseDateValidation: CourseDateValidationService,
    private dateOverlapValidation: CourseDateOverlapValidationService,
    public translateService: TranslateService,
    public courses: CoursesService
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.id = this.activatedRoute.snapshot.params.id;
    this.ModalFlux = +this.activatedRoute.snapshot.queryParamMap['params'].step || 0
  }
  detailData: any;

  ngOnInit() {
    this.initializeExtras();
    this.mode = this.id ? 'update' : 'create';
    // Ensure intervals is always an array
    this.intervals = Array.isArray(this.intervals) ? this.intervals : [];

    const requests = {
      sports: this.getSports(),
      stations: this.getStations(),
      ...(this.mode === "update" && { monitors: this.getMonitors() }),
    };

    forkJoin(requests).subscribe(({ sports, stations, monitors }) => {
      this.sportData = sports;
      this.stations = stations;
      if (this.mode === "update") {
        this.monitors = monitors;
        this.loadCourseData();
      } else {
        this.setupCreateMode();
      }
      this.initializeExtrasForm();
      this.loadSchoolData();
    });
  }

  private initializeExtras() {
    try {
      const storedUser = localStorage.getItem("boukiiUser");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const settings =  typeof user?.schools?.[0]?.settings === 'string' ? JSON.parse(user.schools[0].settings) : null;
      this.extras = settings?.extras
        ? [...settings.extras.food, ...settings.extras.forfait, ...settings.extras.transport]
        : [];
    } catch (error) {
      console.error("Error loading extras from localStorage:", error);
      this.extras = [];
    }
  }

  private setupCreateMode() {
    this.courses.resetcourseFormGroup();
    this.courses.courseFormGroup.patchValue({
      sport_id: this.sportData[0]?.sport_id || null,
      station_id: this.stations[0]?.id || null,
      duration: this.courses.duration[0] || null,
      school_id: this.user.schools?.[0]?.id || null,
      hour_min: this.courses.hours[0] || null,
      hour_max: this.courses.hours[4] || null,
    });

    // Initialize course_dates with a default entry for new courses
    this.courses.courseFormGroup.patchValue({
      course_dates: [{
        date: new Date(),
        date_end: new Date(),
        hour_start: this.courses.hours[0],
        duration: this.courses.duration[0] // Will be replaced by hour_end for private courses
      }]
    });

    // Initialize intervals array for new courses
    if (!this.intervals || this.intervals.length === 0) {
      this.intervals = [this.createDefaultInterval()];
    }

    this.refreshIntervalGroupStateFromSettings();
    this.enforceIntervalGroupAvailability();

    this.Confirm(0);
    this.loading = false
   //setTimeout(() => (), 0);
  }

  private loadCourseData() {
    this.crudService
      .get(`/admin/courses/${this.id}`, [
        "courseGroups.degree",
        "courseGroups.courseDates.courseSubgroups.bookingUsers.client",
        "sport",
        "booking_users_active.client",
        "booking_users_active.course_sub_group",
        "booking_users_active.monitor"
      ])
      .subscribe((response: any) => {
        this.detailData = response.data;
        this.detailData.station = this.detailData.station || null;
        this.mergeCourseExtras();
        let hasMultipleIntervals = false;

        if (this.detailData.settings) {
          try {
            const settings = typeof this.detailData.settings === 'string'
              ? JSON.parse(this.detailData.settings)
              : this.detailData.settings;

            if (settings.multipleIntervals) {
              hasMultipleIntervals = true;
              this.useMultipleIntervals = true;
              this.mustBeConsecutive = settings.mustBeConsecutive || false;
              this.mustStartFromFirst = settings.mustStartFromFirst || false;
            }

            // Restore interval configuration if available (from new or old format)
            const intervalsSource = settings.intervals || settings.intervalConfiguration?.intervals;
            if (intervalsSource && Array.isArray(intervalsSource)) {
              this.useMultipleIntervals = settings.useMultipleIntervals || settings.intervalConfiguration?.useMultipleIntervals || false;
              this.intervals = intervalsSource.map(interval => ({
                ...interval,
                // Ensure weeklyPattern exists
                weeklyPattern: interval.weeklyPattern || {
                  monday: false,
                  tuesday: false,
                  wednesday: false,
                  thursday: false,
                  friday: false,
                  saturday: false,
                  sunday: false
                },
                // Ensure schedule fields exist
                scheduleStartTime: interval.scheduleStartTime || this.courses.hours?.[0] || '',
                scheduleDuration: interval.scheduleDuration || this.courses.duration?.[0] || ''
              }));
            }
          } catch (error) {
            console.error("Error parsing settings:", error);
          }
        }
        // Initialize tab based on periods: 0 = uniperiod, 1 = multiperiod
        // Allow users to access both tabs regardless of period count
        if (this.detailData?.settings?.periods?.length > 1) {
          this.PeriodoFecha = 1; // Show multiperiod tab for multiple periods
        } else {
          this.PeriodoFecha = 0; // Default to uniperiod for single period, but user can switch
        }
        this.courses.settcourseFormGroup(this.detailData);
        this.courses.courseFormGroup.patchValue({ extras: this.detailData.course_extras || [] });
        this.getDegrees();
        // Si tiene intervalos m├║ltiples, cargarlos
        if (hasMultipleIntervals && this.detailData.course_type === 1) {
          // Cargar los intervalos despu├®s de que el FormGroup est├® listo
          this.loadIntervalsFromCourse(this.detailData, this);
        } else if (this.detailData.course_type === 1) {
          // Inicializar al menos un intervalo para cursos que no tienen m├║ltiples intervalos
          if (!this.intervals || this.intervals.length === 0) {
            this.intervals = [this.createDefaultInterval()];
          }
        }

        // Cargar descuentos existentes
        this.loadDiscountsFromCourse();
        this.enforceIntervalGroupAvailability();
        this.refreshIntervalGroupStateFromSettings();
        this.loading = false
       // setTimeout(() => (this.loading = false), 0);
      });
  }

  /**
   * M├®todo seguro para obtener el array de intervalos desde el FormGroup principal
   * Este m├®todo garantiza que siempre se devuelva un FormArray, incluso si a├║n no est├í inicializado
   */
  getIntervalsArray(): FormArray {
    // Verificar si el FormGroup principal existe
    if (!this.courses.courseFormGroup) {
      console.warn('courseFormGroup no est├í inicializado. Devolviendo un FormArray vac├¡o.');
      return this.fb.array([]);
    }

    // Intentar obtener el FormArray de intervals_ui
    const intervals = this.courses.courseFormGroup.get('intervals_ui');

    // Si el control no existe o no es un FormArray, devolver uno vac├¡o
    if (!intervals || !(intervals instanceof FormArray)) {
      console.warn('intervals_ui no est├í inicializado o no es un FormArray. Devolviendo un FormArray vac├¡o.');

      // Si el control no existe pero el FormGroup s├¡, podemos intentar inicializarlo
      if (this.courses.courseFormGroup) {
        const emptyArray = this.fb.array([]);
        this.courses.courseFormGroup.setControl('intervals_ui', emptyArray);
        return emptyArray;
      }

      // Como fallback, devolvemos un array vac├¡o
      return this.fb.array([]);
    }

    // Si todo est├í bien, devolver el FormArray
    return intervals as FormArray;
  }

  private mergeCourseExtras() {
    // Cargar extras de settings frescos desde localStorage para evitar duplicados
    let settingsExtras = [];
    try {
      const storedUser = localStorage.getItem("boukiiUser");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const settings = typeof user?.schools?.[0]?.settings === 'string'
        ? JSON.parse(user.schools[0].settings)
        : user?.schools?.[0]?.settings;

      if (settings?.extras) {
        settingsExtras = [
          ...(settings.extras.food || []),
          ...(settings.extras.forfait || []),
          ...(settings.extras.transport || [])
        ];
      }
    } catch (error) {
      console.error("Error loading extras from localStorage:", error);
    }

    // Formatear extras de configuraci├│n
    const formattedSettingsExtras = settingsExtras.map(extra => ({
      id: extra.id.toString(),
      name: extra.name,
      product: extra.product,
      price: parseFloat(extra.price) || 0,
      tva: extra.tva || 0,
      status: extra.status || false,
      active: false,
    }));

    // Formatear extras del curso
    const formattedCourseExtras = (this.detailData.course_extras || []).map(extra => ({
      id: extra.id.toString(),
      name: extra.name,
      product: extra.name,
      price: parseFloat(extra.price) || 0,
      tva: 0,
      status: true,
      active: true,
    }));

    // Unir sin duplicados usando un Map para garantizar unicidad por ID
    const extrasMap = new Map();

    // Primero agregar extras de settings
    formattedSettingsExtras.forEach(extra => {
      extrasMap.set(extra.id, extra);
    });

    // Luego agregar/sobrescribir con extras del curso (tienen prioridad)
    formattedCourseExtras.forEach(extra => {
      extrasMap.set(extra.id, extra);
    });

    // Convertir Map a array
    this.extras = Array.from(extrasMap.values());
  }

  private initializeExtrasForm() {
    this.extrasFormGroup = this.fb.group({
      id: ["", Validators.required],
      product: ["", Validators.required],
      name: ["", Validators.required],
      price: [1, Validators.required],
      tva: [21, Validators.required],
      status: [true, Validators.required],
    });
  }

  private loadSchoolData() {
    this.schoolService.getSchoolData().subscribe(data => {
      this.schoolData = data.data;
    });
  }

  createExtras() {
    const formData = this.extrasFormGroup.getRawValue();
    formData.id = formData.id || "aFOR-" + formData.name + formData.product + formData.price;

    if (this.editingIndex !== null) {
      this.extras[this.editingIndex] = formData; // Actualiza el extra en lugar de crear uno nuevo
    } else {
      this.extras.push(formData); // Agrega un nuevo extra
    }

    this.extrasModal = false;
    this.resetExtraForm();
  }

  /**
   * Verifica si un extra es temporal (creado localmente, no guardado en BD)
   */
  isTemporaryExtra(extraId: any): boolean {
    return String(extraId).startsWith('aFOR-');
  }

  resetExtraForm() {
    this.extrasFormGroup.reset({
      id: "",
      product: "",
      name: "",
      price: 1,
      tva: 21,
      status: true,
    });
    this.editingIndex = null;
  }

  editExtra(index: number) {
    this.editingIndex = index;
    this.extrasFormGroup.setValue(this.extras[index]);
    this.extrasModal = true;
  }

  getSportsType = () => this.crudService.list('/sport-types', 1, 1000).pipe(map(data => data.data));
  getMonitors = () => this.crudService.list('/monitors', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id).pipe(map(data => data.data));
  getSports = () => this.crudService.list('/school-sports', 1, 10000, 'asc', 'id', '&school_id=' + this.user.schools[0].id, null, null, null, ['sport']).pipe(map(sport => sport.data));

  getStations = () => this.crudService.list('/stations-schools', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id).pipe(
    map(station => station.data),
    mergeMap(stations => forkJoin(stations.map((element: any) => this.crudService.get('/stations/' + element.station_id).pipe(map(data => data.data)))))
  );

  getDegrees = () => this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.courses.courseFormGroup.controls['school_id'].value + '&sport_id=' + this.courses.courseFormGroup.controls['sport_id'].value).subscribe((data) => {
    // Initialize detailData if it doesn't exist
    if (!this.detailData) {
      this.detailData = {};
    }
    this.detailData.degrees = [];
    data.data.forEach((element: any) => {
      if (element.active) this.detailData.degrees.push({ ...element, }); //Subgrupo: this.getSubGroups(element.id)
    });

    const levelGrop = this.detailData.degrees.map((level: any) => ({
      ...level,
      active: false,
    }));

    if (this.detailData.course_dates && Array.isArray(this.detailData.course_dates)) {
      levelGrop.forEach((level: any) => {
        this.detailData.course_dates.forEach((cs: any) => {
          if (cs.course_groups && Array.isArray(cs.course_groups)) {
            cs.course_groups.forEach((group: any) => {
              if (group.degree_id === level.id) {
                level.active = true;
                level.old = true;
                group.age_min = level.age_min;
                group.age_max = level.age_max;

                if (group.course_subgroups && Array.isArray(group.course_subgroups) && group.course_subgroups.length > 0) {
                  level.max_participants = group.course_subgroups[0].max_participants;
                  level.course_subgroups = group.course_subgroups;
                }

                level.visible = false;
              }
            });
          }
        });
      });

      levelGrop.sort((a: any) => (a.active ? -1 : 1));
    }

    this.courses.courseFormGroup.patchValue({ levelGrop });
    this.baseIntervalGroupTemplate = {};
    this.ensureIntervalGroupsAlignment();
  });

  Confirm(add: number) {
    this.courses.courseFormGroup.markAsUntouched()
    if ( this.courses.courseFormGroup.controls['course_type'].value === 2 &&
      !this.courses.courseFormGroup.controls['is_flexible'].value && this.ModalFlux === 2) {
      add = add + 1;
    }
    this.ModalFlux += add
    if (this.ModalFlux === 1) {
      if (!this.courses.courseFormGroup.controls["course_type"].value) this.courses.courseFormGroup.patchValue({ course_type: 1 })
      this.courses.courseFormGroup.patchValue({
        icon: this.sportData.find((a: any) => a.sport_id === this.courses.courseFormGroup.controls['sport_id'].value).sport.icon_unselected
      })
      this.getDegrees();
    } else if (this.ModalFlux === 2) {
      if (
        this.courses.courseFormGroup.controls["name"].status === 'VALID' &&
        this.courses.courseFormGroup.controls["short_description"].status === 'VALID' &&
        this.courses.courseFormGroup.controls["description"].status === 'VALID' &&
        this.courses.courseFormGroup.controls["price"].status === 'VALID' &&
        this.courses.courseFormGroup.controls["max_participants"].status === 'VALID' &&
        (
          this.courses.courseFormGroup.controls['course_type'].value > 1 &&
          this.courses.courseFormGroup.controls["age_min"].status === 'VALID' &&
          this.courses.courseFormGroup.controls["age_max"].status === 'VALID' ||
          this.courses.courseFormGroup.controls['course_type'].value === 1
        )
      ) {
        if (this.mode === 'create') {

          setTimeout(async () => {
            const languages = ['fr', 'en', 'de', 'es', 'it'];
            const { name, short_description, description } = this.courses.courseFormGroup.controls;

            // Inicializamos el objeto de traducciones con valores vac├¡os
            const translations: Record<string, any> = {};
            languages.forEach(lang => {
              translations[lang] = {
                name: '',
                short_description: '',
                description: ''
              };
            });

            try {
              const translationResults = await Promise.allSettled(
                languages.map(async (lang) => {
                  try {
                    const translatedName = await this.crudService.translateText(name.value, lang.toUpperCase()).toPromise();
                    const translatedShortDescription = await this.crudService.translateText(short_description.value, lang.toUpperCase()).toPromise();
                    const translatedDescription = await this.crudService.translateText(description.value, lang.toUpperCase()).toPromise();

                    return {
                      lang,
                      name: translatedName?.data?.translations?.[0]?.text || '',
                      short_description: translatedShortDescription?.data?.translations?.[0]?.text || '',
                      description: translatedDescription?.data?.translations?.[0]?.text || '',
                    };
                  } catch (error) {
                    console.error(`Error translating to ${lang}:`, error);
                    return { lang, name: '', short_description: '', description: '' }; // Retorna un objeto vac├¡o si hay error
                  }
                })
              );

              // Asignamos los valores traducidos (si existen)
              translationResults.forEach((result) => {
                if (result.status === "fulfilled" && result.value) {
                  translations[result.value.lang] = {
                    name: result.value.name,
                    short_description: result.value.short_description,
                    description: result.value.description,
                  };
                }
              });

              this.courses.courseFormGroup.patchValue({ translations });

            } catch (error) {
              console.error("Unexpected error in translation process:", error);
            }
          }, 1000);
        }
      } else {
        this.courses.courseFormGroup.markAllAsTouched()
        this.ModalFlux -= add
      }
    } else if (this.ModalFlux === 3) {
      if (
        this.courses.courseFormGroup.controls["date_start"].status === 'VALID' &&
        this.courses.courseFormGroup.controls["date_end"].status === 'VALID'
      ) {
      } else {
        this.courses.courseFormGroup.markAllAsTouched()
        this.ModalFlux -= add
      }
      if (this.courses.courseFormGroup.controls['course_type'].value === 2) {
        const settings = JSON.parse(this.user.schools[0].settings);
        let durations = this.courses.getFilteredDuration(settings);

        // Usar directamente el max_participants configurado en el formulario
        const maxParticipants = this.courses.courseFormGroup.controls["max_participants"].value || 6;

        let Range = this.generarIntervalos(
          maxParticipants,
          durations.length,
          durations
        );

        const priceRanges = settings.prices_range.prices.map(p => ({
          ...p,
          intervalo: p.intervalo.replace(/^(\d+)h$/, "$1h 0min") // Convierte "1h" en "1h0min" para que coincida con durations
        }));

        // Asignar los precios a los intervalos correctos
        Range = Range.map(intervalo => {
          const matchingPrice = priceRanges.find(p => p.intervalo === intervalo.intervalo);
          return matchingPrice ? { ...intervalo, ...matchingPrice } : intervalo;
        });

        this.courses.courseFormGroup.patchValue({ price_range: Range });
      }
    }
    else if (this.ModalFlux === 4) {
      if (this.courses.courseFormGroup.controls['course_type'].value === 1) {
        if (this.courses.courseFormGroup.controls['levelGrop'].value.some((item: any) => item.active)) {
        } else {
          this.ModalFlux -= add
        }
      } else if (this.courses.courseFormGroup.controls['course_type'].value === 2) {
      } else {
        const groups = this.courses.courseFormGroup.controls['settings'].value.groups;
        if (groups.every((group: any) => group.groupName && group.ageMin > 0 && group.ageMax > 0 && group.price > 0)) {
        } else {
          this.courses.courseFormGroup.controls['settings'].markAllAsTouched()
          this.ModalFlux -= add
        }
      }
    }
    else if (this.ModalFlux === 6) {
      this.ModalFlux--
      this.confirmModal = true
    }
  }

  async translateCourse(lang: string): Promise<void> {
    this.loading = true;
    try {
      const translations = this.courses.courseFormGroup.controls['translations'].value || {};
      const currentTranslation = translations[lang] || {};

      const translatedName = await this.crudService.translateText(this.courses.courseFormGroup.value.name, lang.toUpperCase()).toPromise();
      const translatedShortDescription = await this.crudService.translateText(this.courses.courseFormGroup.value.short_description, lang.toUpperCase()).toPromise();
      const translatedDescription = await this.crudService.translateText(this.courses.courseFormGroup.value.description, lang.toUpperCase()).toPromise();

      // Actualizar solo los valores traducidos sin afectar los dem├ís idiomas
      this.courses.courseFormGroup.patchValue({
        translations: {
          ...translations,
          [lang]: {
            name: translatedName?.data?.translations?.[0]?.text || currentTranslation.name,
            short_description: translatedShortDescription?.data?.translations?.[0]?.text || currentTranslation.short_description,
            description: translatedDescription?.data?.translations?.[0]?.text || currentTranslation.description,
          },
        },
      });

    } catch (error) {
      console.error(`Error translating to ${lang}:`, error);
    } finally {
      this.loading = false;
    }
  }

  find = (array: any[], key: string, value: string | boolean) => array.find((a: any) => value ? a[key] === value : a[key])
  filter = (array: any[], key: string, value: string | boolean) => array.filter((a: any) => value ? a[key] === value : a[key])

  selectLevel = (event: any, i: number) => {
    const levelGrop = this.courses.courseFormGroup.controls['levelGrop'].value
    const course_dates = this.courses.courseFormGroup.controls['course_dates'].value
    levelGrop[i].active = event.target.checked
    if (event.target.checked) {
/*      levelGrop[i].age_min = this.courses.courseFormGroup.controls['age_min'].value
      levelGrop[i].age_max = this.courses.courseFormGroup.controls['age_max'].value*/
      levelGrop[i].max_participants = this.courses.courseFormGroup.controls['max_participants'].value
      for (const course of course_dates) {
        if (this.mode === "create") {
          course.course_groups = [...course.course_groups, { ...levelGrop[i], degree_id: levelGrop[i].id, course_subgroups: [] }]
          course.groups = [...course.groups, { ...levelGrop[i], degree_id: levelGrop[i].id, subgroups: [] }]
        }
        else {
          course.course_groups = [...course.course_groups, { ...levelGrop[i], degree_id: levelGrop[i].id, course_id: this.courses.courseFormGroup.controls['id'].value, course_subgroups: [] }]
        }
      }
    } else {
      for (const course of course_dates) {
        course.course_groups = course.course_groups.filter((a: any) => a.id !== levelGrop[i].id)
        if (this.mode === "create") course.groups = course.groups.filter((a: any) => a.id !== levelGrop[i].id)
      }
    }
    this.courses.courseFormGroup.patchValue({ levelGrop, course_dates })
    if (event.target.checked) this.addLevelSubgroup(levelGrop[i], 0, true)
  }

  addLevelSubgroup = (level: any, j: number, add: boolean) => {
    const course_dates = this.courses.courseFormGroup.controls['course_dates'].value.map((course: any) => {
      // Verificamos en course_groups
      for (const group in course.course_groups) {
        if (course.course_groups[group].degree_id === level.id) {
          if (add) {
            if (this.mode === "create") {
              course.groups[group].subgroups = [
                ...course.groups[group].subgroups,
                { degree_id: level.id, max_participants: level.max_participants, monitor: null, monitor_id: null }
              ];
            }
            course.course_groups[group].course_subgroups = [
              ...course.course_groups[group].course_subgroups,
              { degree_id: level.id, max_participants: level.max_participants, monitor: null, monitor_id: null }
            ];
          } else {
            if (this.mode === "create") {
              course.groups[group].subgroups = course.groups[group].subgroups.filter((_, index: number) => index !== j);
            }
            course.course_groups[group].course_subgroups = course.course_groups[group].course_subgroups.filter((_, index: number) => index !== j);
          }
        }
      }

      // Eliminamos tambi├®n en course_subgroups del propio course_date
      if (!add && course.course_subgroups) {
        course.course_subgroups = course.course_subgroups.filter((_, index: number) => index !== j);
      }

      return course; // Retornamos el course modificado
    });

    this.courses.courseFormGroup.patchValue({ course_dates });
  };

  selectExtra = (event: any, item: any, i: number) => {
    if (this.courses.courseFormGroup.controls['course_type'].value === 3) {
      this.courses.courseFormGroup.controls['settings'].value.groups = JSON.parse(JSON.stringify(this.courses.courseFormGroup.controls['settings'].value.groups))
      if (event.checked || !this.courses.courseFormGroup.controls['settings'].value.groups[i].extras.find((a: any) => a.id === item.id)) this.courses.courseFormGroup.controls['settings'].value.groups[i].extras.push(item)
      else this.courses.courseFormGroup.controls['settings'].value.groups[i].extras = this.courses.courseFormGroup.controls['settings'].value.groups[i].extras.filter((a: any) => a.id !== item.id)
    } else {
      const extras = this.courses.courseFormGroup.controls['extras'].value
      if (event.checked || !extras.find((a: any) => a.id === item.id)) this.courses.courseFormGroup.patchValue({ extras: [...extras, item] })
      else this.courses.courseFormGroup.patchValue({ extras: extras.filter((a: any) => a.id !== item.id) })
    }
  }

  selectWeek = (day: string, event: any) => {
    const settings = this.courses.courseFormGroup.controls['settings'].value
    if (day === "0") settings.weekDays = { monday: event.checked, tuesday: event.checked, wednesday: event.checked, thursday: event.checked, friday: event.checked, saturday: event.checked, sunday: event.checked }
    else settings.weekDays[day] = event.checked
    this.courses.courseFormGroup.patchValue({ settings: settings })
  }

  setModalProgress() {
    const courseFormGroup = this.courses.courseFormGroup.getRawValue()
    if (courseFormGroup.course_type === 1) {
      this.ModalProgress = [
         { Name: "sport", Modal: 0 },
        { Name: "data", Modal: 1 },
        { Name: "dates", Modal: 2 },
        { Name: "levels", Modal: 3 },
        { Name: "extras", Modal: 4 },
        { Name: "langs", Modal: 5 },
      ];
    } else if (courseFormGroup.course_type === 2) {
      this.ModalProgress = [
        { Name: "sport", Modal: 0 },
        { Name: "data", Modal: 1 },
        { Name: "dates", Modal: 2 },
      ];
      if (courseFormGroup.is_flexible) {
        this.ModalProgress.push({ Name: "details", Modal: 3 });
        this.ModalProgress.push({ Name: "extras", Modal: 4 });
        this.ModalProgress.push({ Name: "langs", Modal: 5 });
      } else {
        this.ModalProgress.push({ Name: "extras", Modal: 4 });
        this.ModalProgress.push({ Name: "langs", Modal: 5 });
      }
    }
  }

  // Opci├│n 3: M├®todo gen├®rico para obtener cualquier FormArray de un FormGroup
  getFormArray(formGroup: AbstractControl, name: string): AbstractControl[] {
    const formArray = formGroup?.get(name) as FormArray;
    return formArray?.controls || [];
  }

  endCourse() {
    // Sync inline changes (dates/hours/durations) before building payload
    try {
      this.syncIntervalsToCourseFormGroup();
      // No necesitamos normalizar los datos, el backend espera el formato original
    } catch (e) {
      console.warn('Unable to sync/recalculate dates before save:', e);
    }

    const courseFormGroup = this.courses.courseFormGroup.getRawValue()
    const conflicts = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(courseFormGroup.course_dates)
    );

    if (conflicts.length > 0) {
      const summary = this.dateOverlapValidation.getValidationSummary(conflicts);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    // Si no hay conflictos continuamos con el flujo normal manteniendo la carga ├║til original
    if (courseFormGroup.course_type === 1 && this.useMultipleIntervals) {
      // Configurar los intervalos en settings
      const intervals = [];

      this.intervalsUI.controls.forEach((intervalControl) => {
        const interval = intervalControl as FormGroup;
        intervals.push({
          id: interval.get('id').value,
          name: interval.get('name').value
        });
      });

      // Actualizar settings con la configuraci├│n de intervalos
      courseFormGroup.settings = {
        ...courseFormGroup.settings,
        multipleIntervals: true,
        intervals: Array.isArray(this.intervals) ? this.intervals : [],
        mustStartFromFirst: this.mustStartFromFirst,
        mustBeConsecutive: this.mustBeConsecutive
      };
    }

    if (courseFormGroup.course_type === 1 && courseFormGroup.course_dates && courseFormGroup.levelGrop) {
      courseFormGroup.course_dates.forEach((courseDate: any) => {
        if (courseDate.course_groups) {
          // Transform course_groups to groups and course_subgroups to subgroups for backend compatibility
          courseDate.groups = courseDate.course_groups.map((group: any) => {
            const transformedGroup = { ...group };

            // Transform course_subgroups to subgroups
            if (group.course_subgroups && Array.isArray(group.course_subgroups)) {
              transformedGroup.subgroups = group.course_subgroups;
              // Remove the old field name
              delete transformedGroup.course_subgroups;
            }

            // Buscar en levelGrop el que tenga el mismo degree_id que el id del grupo
            const matchingLevel = courseFormGroup.levelGrop.find((level: any) => level.id === group.degree_id);

            if (matchingLevel) {
              // Asignar los valores de age_min y age_max del levelGrop al grupo
              transformedGroup.age_min = parseInt(matchingLevel.age_min);
              transformedGroup.age_max = parseInt(matchingLevel.age_max);
            }

            return transformedGroup;
          });
        }
      });
    }
    courseFormGroup.translations = JSON.stringify(this.courses.courseFormGroup.controls['translations'].value)
    courseFormGroup.course_type === 1 ? courseFormGroup.settings : courseFormGroup.settings = this.courses.courseFormGroup.controls['settings'].value

    // DEBUG: Verificar que price_range est├® incluido

    // FIXED: Asegurar que price_range se incluya en el payload del curso
    if (this.courses.courseFormGroup.controls['price_range'].value) {
      courseFormGroup.price_range = this.courses.courseFormGroup.controls['price_range'].value;
    }

    if (this.mode === "create") {
      this.crudService.create('/admin/courses', courseFormGroup)
        .pipe(
          catchError((error) => {
            console.error("Error al crear el curso:", error);
            this.showErrorMessage("Hubo un problema al crear el curso. Int├®ntalo de nuevo.");
            return throwError(() => error);
          })
        )
        .subscribe((data:any) => {
          if (data.success) {
            this.router.navigate(["/courses/detail/" + data.data.id]);
          } else {
            this.showErrorMessage(data.message || "No se pudo crear el curso.");
          }
        });
    } else {
      this.crudService.update('/admin/courses', courseFormGroup, this.id)
        .pipe(
          catchError((error:any) => {
            console.error("Error al actualizar el curso:", error);
            this.showErrorMessage("Hubo un problema al actualizar el curso. Int├®ntalo de nuevo.");
            return throwError(() => error);
          })
        )
        .subscribe((data) => {
          if (data.success) {
            this.router.navigate(["/courses/detail/" + data.data.id]);
          } else {
            this.showErrorMessage(data.message || "No se pudo actualizar el curso.");
          }
        });
    }
  }

  showErrorMessage(message: string) {
    this.snackBar.open(message, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
  }

  getNumberArray = (num: number): any[] => ['intervalo', ...Array.from({ length: num }, (_, i) => `${i + 1}`)];

  getFilteredDurationsForTable(): string[] {
    const settings = JSON.parse(this.user.schools[0].settings);
    return this.courses.getFilteredDuration(settings);
  }

  generarIntervalos = (personas: number, intervalo: number, duracion: string[]): any[] => {
    const resultado = [];
    for (let i = 0; i < intervalo; i++) {
      const obj = { intervalo: duracion[i] };
      for (let j = 1; j <= personas; j++) obj[j] = null
      resultado.push(obj);
    } return resultado;
  }

  addCategory = () => this.courses.courseFormGroup.controls['settings'].value.groups.push({ ...this.courses.default_activity_groups })

  addCourseDate = () => {
    const course_date = this.courses.courseFormGroup.controls['course_dates'].value
    const data = JSON.parse(JSON.stringify(course_date[course_date.length - 1]))
    delete data.id
    const newDate = new Date(course_date[course_date.length - 1].date);
    newDate.setDate(newDate.getDate() + 1);

    // Mantener el formato original de la fecha
    const newCourseDate = {
      ...data,
      date: newDate
    };

    // Validar conflictos antes de agregar - solo para validaci├│n, no modificamos los datos originales
    const validationError = this.dateOverlapValidation.validateNewCourseDate(
      {
        date: newDate.toISOString().split('T')[0],
        hour_start: newCourseDate.hour_start,
        hour_end: newCourseDate.hour_end,
        duration: newCourseDate.duration
      },
      course_date.map((cd: any) => ({
        date: typeof cd.date === 'string' ? cd.date : new Date(cd.date).toISOString().split('T')[0],
        hour_start: cd.hour_start,
        hour_end: cd.hour_end,
        duration: cd.duration
      }))
    );

    if (validationError) {
      this.snackBar.open(validationError.message, 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    course_date.push(newCourseDate)
    this.courses.courseFormGroup.patchValue({ course_dates: course_date })
    this.snackBar.open('Fecha agregada correctamente', '', { duration: 3000 });
  }
  createIntervalUI(): FormGroup {
    return this.fb.group({
      id: [Date.now().toString()],
      name: ['Intervalo ' + (this.intervalsUI.length + 1)], // Nombre predeterminado significativo
      dates: this.fb.array([])
    });
  }

  get intervalsUI(): FormArray {
    return this.courses.courseFormGroup ?
      (this.courses.courseFormGroup.get('intervals_ui') as FormArray) :
      null;
  }

  createCourseDate(): FormGroup {
    return this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      hour: [this.courses.hours[0], Validators.required],
      interval_id: [''],
      order: [0]
    });
  }

  updateDuration(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.courses.courseFormGroup.patchValue({duration: value});
    this.syncIntervalsToCourseFormGroup();
  }

  syncIntervalsToCourseDates() {
    if (!this.useMultipleIntervals) return;

    const courseDates = [];
    const intervals = this.intervalsUI.controls;

    intervals.forEach((intervalControl) => {
      const interval = intervalControl as FormGroup;
      const intervalId = interval.get('id').value;
      const intervalName = interval.get('name').value;
      const datesArray = interval.get('dates') as FormArray;

      // Convertir las fechas del intervalo a course_dates
      datesArray.controls.forEach((dateControl, j) => {
        const date = dateControl.get('date').value;
        const hour = dateControl.get('hour').value;

        if (date && hour) {
          courseDates.push({
            date: date,
            hour_start: hour,
            hour_end: this.courses.addMinutesToTime(hour, this.courses.courseFormGroup.get('duration').value),
            duration: this.courses.courseFormGroup.get('duration').value,
            interval_id: intervalId,
            interval_name: intervalName,
            order: j + 1,
            course_groups: this.getCourseDateGroups()
          });
        }
      });
    });

    // Actualizar el course_dates en el formulario
    if (courseDates.length > 0) {
      this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
    }
  }

  onMultipleIntervalsChange() {
    if (this.useMultipleIntervals) {
      // Si no hay intervalos, inicializar con uno vac├¡o
      if (!this.intervals || this.intervals.length === 0) {
        this.addIntervalUI(0);
      }
      // Si ya hay intervalos, no hacer nada para evitar duplicados
    } else {
      // Si se desactiva, mantener el array de course_dates normal y vaciar los intervalos
      this.resetToSingleInterval();
    }

    // Sincronizar con course_dates
    this.ensureIntervalGroupsAlignment();
    this.syncIntervalsToCourseFormGroup();

  }

  // A├▒adir un nuevo intervalo
  addIntervalUI(i:number) {
    const previousInterval = Array.isArray(this.intervals) && this.intervals.length > 0
      ? this.intervals[this.intervals.length - 1]
      : null;

    if (!this.useMultipleIntervals) {
      this.useMultipleIntervals = true;
    }

    const newIntervalBase = this.createIntervalBasedOnPrevious(previousInterval);
    const newInterval = {
      ...newIntervalBase,
      id: Date.now().toString(),
      name: `${this.translateService.instant('interval')} ${this.intervals.length + 1}`
    };

    this.intervals.push(newInterval);

    const intervalIndex = this.intervals.length - 1;

    this.ensureIntervalGroupsAlignment();

    const newKey = this.resolveIntervalKey(newInterval, intervalIndex);
    const template = this.ensureIntervalGroupTemplate();

    if (previousInterval) {
      const previousKey = this.resolveIntervalKey(previousInterval, intervalIndex - 1);
      const previousConfig = this.intervalGroupsMap?.[previousKey];
      this.intervalGroupsMap[newKey] = previousConfig
        ? this.cloneGroupsStateMap(previousConfig)
        : this.mergeGroupStates(template);
    } else {
      this.intervalGroupsMap[newKey] = this.mergeGroupStates(template, this.intervalGroupsMap?.[newKey]);
    }
    this.syncIntervalGroupsArray();

    this.invalidateDisplayIntervalsCache();
    this.applyAutoGenerationForInterval(intervalIndex, previousInterval);
    this.ensureSelectedIntervalSelection(newKey);
    this.selectedIntervalIndexForGroups = intervalIndex;
    this.selectedIntervalKeyForGroups = newKey;
    this.enforceIntervalGroupAvailability();
  }

  // Eliminar un intervalo
  removeIntervalUI(index: number) {
    if (index >= 0 && index < this.intervals.length) {
      this.intervals.splice(index, 1);
      const keysToKeep: Record<string, true> = {};
      this.intervals.forEach((interval, idx) => {
        const key = this.resolveIntervalKey(interval, idx);
        keysToKeep[key] = true;
      });
      Object.keys(this.intervalGroupsMap).forEach(key => {
        if (!keysToKeep[key]) {
          delete this.intervalGroupsMap[key];
        }
      });
      this.syncIntervalsToCourseFormGroup();
      this.ensureIntervalGroupsAlignment();
      this.ensureSelectedIntervalSelection();
      // Invalidar cache para forzar recalculo en próximo render
      this.invalidateDisplayIntervalsCache();
      this.enforceIntervalGroupAvailability();
    }
  }



  // A├▒adir una fecha a un intervalo
  addCourseDateToInterval(intervalIndex: number) {
    this.ensureSingleIntervalForNonFlexible();

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;

    const interval = this.intervals[intervalIndex];
    interval.dates = Array.isArray(interval.dates) ? interval.dates : [];
    let newDate = interval.startDate || new Date().toISOString().split('T')[0];

    // Si ya hay fechas, generar la siguiente fecha
    if (interval.dates.length > 0) {
      const lastDateStr = interval.dates[interval.dates.length - 1].date;
      if (lastDateStr) {
        const lastDate = new Date(lastDateStr);
        lastDate.setDate(lastDate.getDate() + 1);
        const proposedDate = lastDate.toISOString().split('T')[0];

        // Solo usar la fecha propuesta si est├í dentro del rango
        if (interval.endDate && proposedDate <= interval.endDate) {
          newDate = proposedDate;
        } else {
          newDate = interval.startDate || new Date().toISOString().split('T')[0];
        }
      }
    }

    const hourStart = this.courses.hours[0];
    const duration = this.courses.duration[0];
    const computedHourEnd = this.courses.addMinutesToTime(hourStart, duration);
    const newCourseDateInfo: CourseDateInfo = {
      date: newDate,
      hour_start: hourStart,
      hour_end: computedHourEnd
    };

    const durationInMinutes = this.parseDurationToMinutes(duration);
    if (typeof durationInMinutes === 'number') {
      newCourseDateInfo.duration = durationInMinutes;
    }

    const existingCourseDatesInfo = this.convertToCourseDateInfos(
      this.generateCourseDatesFromIntervals(this.intervals)
    );
    const validationError = this.dateOverlapValidation.validateNewCourseDate(newCourseDateInfo, existingCourseDatesInfo);

    if (validationError) {
      this.showErrorMessage(validationError.message);
      return;
    }

    const previousIntervals = this.cloneIntervals(this.intervals);
    const newCourseDate: CourseDate = {
      date: newDate,
      hour_start: hourStart,
      hour_end: computedHourEnd,
      duration: duration,
      interval_id: interval.id,
      order: interval.dates.length + 1
    };

    if (this.isSingleIntervalMode && intervalIndex === 0) {
      this.upsertSingleIntervalDates([newCourseDate]);
    } else {
      interval.dates = [...interval.dates, { ...newCourseDate }];
    }

    const synced = this.syncIntervalsToCourseFormGroup();
    if (!synced) {
      this.intervals = previousIntervals;
    }
  }

  // Eliminar una fecha de un intervalo
  async removeCourseDateFromInterval(intervalIndex: number, dateIndex: number) {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;
    const interval = this.intervals[intervalIndex];
    if (dateIndex < 0 || dateIndex >= interval.dates.length) return;
    const dateToRemove = interval.dates[dateIndex];

    // Only validate for existing course dates (update mode)
    if (this.mode === 'update' && dateToRemove?.id && this.id) {
      try {
        const canProceed = await this.courseDateValidation.showCourseDateModificationDialog({
          courseId: this.id,
          dateId: dateToRemove.id,
          action: 'delete'
        }).toPromise();

        if (canProceed) {
          interval.dates.splice(dateIndex, 1);
          this.syncIntervalsToCourseFormGroup();
          this.snackBar.open('Fecha del intervalo eliminada correctamente', '', { duration: 3000 });
        }
      } catch (error) {
        console.error('Error validating interval date deletion:', error);
        // If validation fails, still allow deletion but warn user
        interval.dates.splice(dateIndex, 1);
        this.syncIntervalsToCourseFormGroup();
        this.snackBar.open('Fecha del intervalo eliminada (validaci├│n fall├│)', '', { duration: 3000 });
      }
    } else {
      // For new courses or dates without ID, delete directly
      interval.dates.splice(dateIndex, 1);
      this.syncIntervalsToCourseFormGroup();
    }
  }

  private cloneCourseDates(courseDates: any[] | null | undefined): any[] {
    if (!Array.isArray(courseDates)) {
      return [];
    }

    return courseDates.map(date => ({ ...date }));
  }

  private cloneIntervals(intervals: any[] | null | undefined): any[] {
    if (!Array.isArray(intervals)) {
      return [];
    }

    return intervals.map(interval => ({
      ...interval,
      dates: Array.isArray(interval.dates) ? interval.dates.map((date: any) => ({ ...date })) : []
    }));
  }

  private parseDurationToMinutes(duration: any): number | undefined {
    if (typeof duration === 'number' && !isNaN(duration)) {
      return duration;
    }

    if (typeof duration === 'string') {
      if (/^\d+$/.test(duration)) {
        return parseInt(duration, 10);
      }

      const regex = /(?:(\d+)h)?\s*(\d+)?\s*min?/i;
      const match = duration.match(regex);
      if (match) {
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const totalMinutes = hours * 60 + minutes;
        return isNaN(totalMinutes) ? undefined : totalMinutes;
      }
    }

    return undefined;
  }

  private convertToCourseDateInfos(courseDates: any[]): CourseDateInfo[] {
    if (!Array.isArray(courseDates)) {
      return [];
    }

    return courseDates
      .filter(date => date?.date && date?.hour_start)
      .map((date: any) => {
        const formattedDate = typeof date.date === 'string'
          ? date.date
          : new Date(date.date).toISOString().split('T')[0];
        const hourStart = date.hour_start;
        const durationNumber = this.parseDurationToMinutes(date.duration);
        const endTimeSource = date.hour_end ?? this.courses.addMinutesToTime(hourStart, date.duration ?? durationNumber ?? 0);

        const info: CourseDateInfo = {
          date: formattedDate,
          hour_start: hourStart,
          hour_end: endTimeSource
        };

        if (typeof durationNumber === 'number') {
          info.duration = durationNumber;
        }

        return info;
      });
  }

  private showValidationSummary(errors: CourseDateValidationError[]): void {
    if (!errors || errors.length === 0) {
      return;
    }

    const summary = this.dateOverlapValidation.getValidationSummary(errors);
    this.showErrorMessage(summary || 'Se detectaron conflictos en las fechas seleccionadas');
  }

  private generateCourseDatesFromIntervals(intervals: any[]): any[] {
    if (!Array.isArray(intervals)) {
      return [];
    }

    const courseDates: any[] = [];

    intervals.forEach((interval, index) => {
      if (!interval?.dates || !Array.isArray(interval.dates)) {
        return;
      }

      const baseGroups = this.buildCourseGroupsForInterval(interval, index);

      interval.dates.forEach((dateObj: any) => {
        if (!dateObj?.date || !dateObj?.hour_start) {
          return;
        }

        const duration = dateObj.duration;
        const computedHourEnd = dateObj.hour_end || this.courses.addMinutesToTime(dateObj.hour_start, duration ?? 0);
        const courseGroups = this.cloneCourseGroups(baseGroups);
        const groupsPayload = courseGroups.map(group => {
          const { course_subgroups, subgroups, ...rest } = group;
          return {
            ...rest,
            subgroups: (course_subgroups || subgroups || []).map((subgroup: any) => ({ ...subgroup }))
          };
        });

        courseDates.push({
          ...dateObj,
          hour_end: computedHourEnd,
          duration: duration,
          interval_id: interval.id,
          order: dateObj.order,
          course_groups: courseGroups,
          groups: groupsPayload
        });
      });
    });

    return courseDates;
  }

  // Sincronizar datos de intervalos con el FormGroup del curso
  syncIntervalsToCourseFormGroup(): boolean {

    if (!this.courses.courseFormGroup) {
      return false;
    }

    this.ensureIntervalGroupsAlignment();

    // Skip sync during bulk schedule application to prevent duplicates
    if (this._applyingBulkSchedule) {
      return true;
    }

    const previousCourseDates = this.cloneCourseDates(this.courses.courseFormGroup.get('course_dates')?.value);

    const generatedCourseDates = this.generateCourseDatesFromIntervals(this.intervals);

    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(generatedCourseDates)
    );

    if (validationErrors.length > 0) {
      this.showValidationSummary(validationErrors);
      this.courses.courseFormGroup.patchValue({ course_dates: previousCourseDates });
      return false;
    }

    if (generatedCourseDates.length > 0) {

      this.courses.courseFormGroup.patchValue({
        course_dates: generatedCourseDates
      });

      setTimeout(() => {
        this.courses.courseFormGroup.controls['course_dates'].updateValueAndValidity();
        this.getDegrees();
      }, 100);
    }

    this.saveIntervalSettings();

    return true;
  }

  private saveIntervalSettings(): void {
    // Prepare interval settings for persistence
    let currentSettings = {};
    try {
      const existingSettings = this.courses.courseFormGroup.get('settings')?.value;
      if (existingSettings) {
        currentSettings = typeof existingSettings === 'string'
          ? JSON.parse(existingSettings)
          : existingSettings;
      }
    } catch (error) {
      console.error('Error parsing existing settings:', error);
    }

    const updatedSettings = {
      ...currentSettings,
      useMultipleIntervals: this.useMultipleIntervals,
      multipleIntervals: this.useMultipleIntervals,
      mustBeConsecutive: this.mustBeConsecutive,
      mustStartFromFirst: this.mustStartFromFirst,
      intervals_config_mode: this.courses.courseFormGroup.get('intervals_config_mode')?.value || 'unified',
      intervals: this.intervals,
      intervalConfiguration: {
        intervals: this.intervals,
        useMultipleIntervals: this.useMultipleIntervals
      },
      intervalGroups: this.serializeIntervalGroupsAsArray(),
      intervalGroupsById: this.serializeIntervalGroupsById()
    };

    this.courses.courseFormGroup.patchValue({
      settings: JSON.stringify(updatedSettings)
    });

  }

  // Obtener los grupos de curso para cada fecha nueva
  getCourseDateGroups() {
    const existingDates = this.courses.courseFormGroup.get('course_dates').value;
    if (existingDates && existingDates.length > 0 && existingDates[0].course_groups) {
      return JSON.parse(JSON.stringify(existingDates[0].course_groups));
    }
    return [];
  }

  // Validar cambios en fechas de intervalos
  validateAndUpdateIntervalDate(intervalIndex: number, dateIndex: number, newDate: string) {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;
    const interval = this.intervals[intervalIndex];
    if (dateIndex < 0 || dateIndex >= interval.dates.length) return;

    const oldDate = interval.dates[dateIndex].date;
    interval.dates[dateIndex].date = newDate;

    // Obtener todas las fechas existentes para validaci├│n
    const allDates = this.generateCourseDatesFromIntervals(this.intervals);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(allDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      interval.dates[dateIndex].date = oldDate;
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
      // Sincronizar con el formulario si la validaci├│n pasa
      this.syncIntervalsToCourseFormGroup();
    }
  }

  // Validar cambios en horas de intervalos
  validateAndUpdateIntervalHour(intervalIndex: number, dateIndex: number, newHour: string) {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;
    const interval = this.intervals[intervalIndex];
    if (dateIndex < 0 || dateIndex >= interval.dates.length) return;

    const oldHour = interval.dates[dateIndex].hour_start;
    interval.dates[dateIndex].hour_start = newHour;

    // Obtener todas las fechas existentes para validaci├│n
    const allDates = this.generateCourseDatesFromIntervals(this.intervals);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(allDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      interval.dates[dateIndex].hour_start = oldHour;
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
      // Sincronizar con el formulario si la validaci├│n pasa
      this.syncIntervalsToCourseFormGroup();
    }
  }

  // Validar cambios en fechas principales
  validateAndUpdateMainDate(dateIndex: number, newDate: string) {
    const courseDates = this.courses.courseFormGroup.controls['course_dates'].value;
    if (dateIndex < 0 || dateIndex >= courseDates.length) return;

    const oldDate = courseDates[dateIndex].date;
    courseDates[dateIndex].date = newDate;

    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(courseDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      courseDates[dateIndex].date = oldDate;
      this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
      this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
    }
  }

  // Validar cambios en horas principales
  validateAndUpdateMainHour(dateIndex: number, newHour: string, hourType: 'hour_start' | 'hour_end') {
    const courseDates = this.courses.courseFormGroup.controls['course_dates'].value;
    if (dateIndex < 0 || dateIndex >= courseDates.length) return;

    const oldHour = courseDates[dateIndex][hourType];
    courseDates[dateIndex][hourType] = newHour;

    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(courseDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      courseDates[dateIndex][hourType] = oldHour;
      this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
      this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
    }
  }

  // Validar cambios en duraci├│n principal
  validateAndUpdateMainDuration(dateIndex: number, newDuration: string) {
    const courseDates = this.courses.courseFormGroup.controls['course_dates'].value;
    if (dateIndex < 0 || dateIndex >= courseDates.length) return;

    const oldDuration = courseDates[dateIndex].duration;
    const oldHourEnd = courseDates[dateIndex].hour_end;

    courseDates[dateIndex].duration = newDuration;
    courseDates[dateIndex].hour_end = this.courses.addMinutesToTime(courseDates[dateIndex].hour_start, newDuration);

    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(courseDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      courseDates[dateIndex].duration = oldDuration;
      courseDates[dateIndex].hour_end = oldHourEnd;
      this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
      this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
    }
  }

  // Manejar cambio de per├¡odo (uni/multi per├¡odo)
  onPeriodChange(selectedIndex: number) {
    this.PeriodoFecha = selectedIndex;

    if (selectedIndex === 0) {
      // Cambio a per├¡odo ├║nico - asegurar que course_dates tiene los campos necesarios
      const currentDates = this.courses.courseFormGroup.controls['course_dates'].value;

      if (currentDates && currentDates.length > 0) {
        const firstDate = currentDates[0];
        // Asegurar que el primer elemento tenga todas las propiedades necesarias
        const courseType = this.courses.courseFormGroup.controls['course_type'].value;
        const validFirstDate = {
          ...firstDate,
          hour_start: firstDate.hour_start || this.courses.hours[0],
          date: firstDate.date || new Date(),
          date_end: firstDate.date_end || firstDate.date || new Date()
        };

        // Para cursos privados (course_type > 1), agregar hour_end
        if (courseType > 1) {
          validFirstDate.hour_end = firstDate.hour_end || this.courses.hours[this.courses.hours.length - 1];
        } else {
          // Para cursos colectivos (course_type === 1), agregar duration
          validFirstDate.duration = firstDate.duration || this.courses.duration[0];
        }

        this.courses.courseFormGroup.patchValue({
          course_dates: [validFirstDate]
        });
      } else {
        // Crear una fecha por defecto si no hay ninguna
        const courseType = this.courses.courseFormGroup.controls['course_type'].value;
        const defaultDate: any = {
          date: new Date(),
          date_end: new Date(),
          hour_start: this.courses.hours[0]
        };

        // Para cursos privados (course_type > 1), agregar hour_end
        if (courseType > 1) {
          defaultDate.hour_end = this.courses.hours[this.courses.hours.length - 1];
        } else {
          // Para cursos colectivos (course_type === 1), agregar duration
          defaultDate.duration = this.courses.duration[0];
        }

        this.courses.courseFormGroup.patchValue({
          course_dates: [defaultDate]
        });
      }
    }
  }

  // Resetear a un solo intervalo
  resetToSingleInterval() {
    // FIXED: Mantener solo el primer intervalo si existe, o crear uno por defecto
    if (this.intervals && this.intervals.length > 0) {
      // Preservar las fechas del primer intervalo y descartar el resto
      const firstInterval = { ...this.intervals[0] };
      this.intervals = [firstInterval];
    } else {
      this.intervals = [this.createDefaultInterval()];
    }

    const template = this.ensureIntervalGroupTemplate();
    const firstInterval = this.intervals[0];
    const firstKey = this.resolveIntervalKey(firstInterval, 0);
    const previousConfig = this.intervalGroupsMap?.[firstKey];
    this.intervalGroupsMap = {
      [firstKey]: this.mergeGroupStates(template, previousConfig)
    };

    this.ensureSelectedIntervalSelection(firstKey);
    this.ensureIntervalGroupsAlignment();

    // Asegurarnos de que course_dates tiene al menos una fecha
    const courseDates = this.courses.courseFormGroup.get('course_dates').value;
    if (!courseDates || courseDates.length === 0) {
      this.courses.courseFormGroup.patchValue({
        course_dates: [{ ...this.courses.default_course_dates }]
      });
    }

    this.syncIntervalsToCourseFormGroup();
    // Forzar invalidaci├│n del cache de display intervals
    this.invalidateDisplayIntervalsCache();
    this.enforceIntervalGroupAvailability();
  }

  // M├®todos de generaci├│n de fechas por intervalo
  generateIntervalConsecutiveDates(intervalIndex: number) {
    this.ensureSingleIntervalForNonFlexible();

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;

    const interval = this.intervals[intervalIndex];
    const count = interval.consecutiveDaysCount || 5;

    if (!interval.startDate || !interval.endDate) {
      return;
    }

    const startDate = new Date(interval.startDate);
    const endDate = new Date(interval.endDate);
    const generatedDates: CourseDate[] = [];

    for (let i = 0; i < count; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      if (currentDate <= endDate) {
        generatedDates.push({
          date: currentDate.toISOString().split('T')[0],
          hour_start: this.courses.hours[0],
          duration: this.courses.duration[0],
          interval_id: interval.id,
          order: i + 1
        });
      } else {
        break;
      }
    }

    // Validar las fechas generadas antes de aplicarlas
    const allDates = this.generateCourseDatesFromIntervals(this.intervals);
    // Reemplazar las fechas del intervalo actual con las nuevas para validaci├│n
    const testAllDates = allDates.filter(d => d.interval_id !== interval.id).concat(generatedDates);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(testAllDates)
    );

    if (validationErrors.length > 0) {
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    const previousIntervals = this.cloneIntervals(this.intervals);

    if (this.isSingleIntervalMode && intervalIndex === 0) {
      this.upsertSingleIntervalDates(generatedDates);
      const synced = this.syncIntervalsToCourseFormGroup();
      if (!synced) {
        this.intervals = previousIntervals;
      }
      return;
    }

    this.intervals[intervalIndex].dates = generatedDates.map(date => ({ ...date }));
    const synced = this.syncIntervalsToCourseFormGroup();
    if (!synced) {
      this.intervals = previousIntervals;
    }
  }

  generateIntervalWeeklyDates(intervalIndex: number) {
    this.ensureSingleIntervalForNonFlexible();

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;

    const interval = this.intervals[intervalIndex];

    if (!interval.weeklyPattern) {
      interval.weeklyPattern = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      };
    }

    const pattern = interval.weeklyPattern;

    if (!this.hasSelectedWeekdaysForInterval(intervalIndex)) {
      return;
    }

    if (!interval.startDate || !interval.endDate) {
      return;
    }

    const selectedDays: number[] = [];
    if (pattern.monday) selectedDays.push(1);
    if (pattern.tuesday) selectedDays.push(2);
    if (pattern.wednesday) selectedDays.push(3);
    if (pattern.thursday) selectedDays.push(4);
    if (pattern.friday) selectedDays.push(5);
    if (pattern.saturday) selectedDays.push(6);
    if (pattern.sunday) selectedDays.push(0);

    const startDate = new Date(interval.startDate);
    const endDate = new Date(interval.endDate);
    const generatedDates: CourseDate[] = [];
    let generatedCount = 0;

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      if (selectedDays.includes(dayOfWeek)) {
        generatedDates.push({
          date: currentDate.toISOString().split('T')[0],
          hour_start: this.courses.hours[0],
          duration: this.courses.duration[0],
          interval_id: interval.id,
          order: generatedCount + 1
        });
        generatedCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Validar las fechas generadas antes de aplicarlas
    const allDates = this.generateCourseDatesFromIntervals(this.intervals);
    // Reemplazar las fechas del intervalo actual con las nuevas para validaci├│n
    const testAllDates = allDates.filter(d => d.interval_id !== interval.id).concat(generatedDates);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(testAllDates)
    );

    if (validationErrors.length > 0) {
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    const previousIntervals = this.cloneIntervals(this.intervals);

    if (this.isSingleIntervalMode && intervalIndex === 0) {
      this.upsertSingleIntervalDates(generatedDates);
      const synced = this.syncIntervalsToCourseFormGroup();
      if (!synced) {
        this.intervals = previousIntervals;
      }
      return;
    }

    this.intervals[intervalIndex].dates = generatedDates.map(date => ({ ...date }));
    const synced = this.syncIntervalsToCourseFormGroup();
    if (!synced) {
      this.intervals = previousIntervals;
    }
  }

  hasSelectedWeekdaysForInterval(intervalIndex: number): boolean {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return false;

    const pattern = this.intervals[intervalIndex].weeklyPattern;
    if (!pattern) return false;

    return pattern.monday || pattern.tuesday || pattern.wednesday ||
           pattern.thursday || pattern.friday || pattern.saturday || pattern.sunday;
  }

  setIntervalDateGenerationMethod(intervalIndex: number, method: 'consecutive' | 'weekly' | 'manual') {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;

    this.intervals[intervalIndex].dateGenerationMethod = method;

    // Si cambia a manual, no hacer nada autom├íticamente
    if (method === 'manual') {
      return;
    }

    // Si cambia a consecutive o weekly, generar fechas autom├íticamente
    if (method === 'consecutive') {
      this.generateIntervalConsecutiveDates(intervalIndex);
    } else if (method === 'weekly') {
      this.generateIntervalWeeklyDates(intervalIndex);
    }
  }

  toggleIntervalWeekday(intervalIndex: number, day: string) {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;

    const interval = this.intervals[intervalIndex];

    // Initialize weeklyPattern if it doesn't exist
    if (!interval.weeklyPattern) {
      interval.weeklyPattern = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      };
    }

    interval.weeklyPattern[day] = !interval.weeklyPattern[day];

    // Si est├í en modo weekly, regenerar fechas
    if (interval.dateGenerationMethod === 'weekly') {
      this.generateIntervalWeeklyDates(intervalIndex);
    }
  }

  onIntervalPanelOpened(intervalIndex: number): void {
    this.selectedIntervalIndexForGroups = intervalIndex;
    const interval = this.intervals?.[intervalIndex];
    if (interval) {
      this.selectedIntervalKeyForGroups = this.resolveIntervalKey(interval, intervalIndex);
    }
    this.ensureIntervalGroupsAlignment();
  }

  copyGlobalGroupsToInterval(intervalIndex: number): void {
    this.ensureIntervalGroupsAlignment();
    const template = this.ensureIntervalGroupTemplate();
    if (!template) {
      return;
    }

    const interval = this.intervals?.[intervalIndex];
    if (!interval) {
      return;
    }

    const key = this.resolveIntervalKey(interval, intervalIndex);
    this.intervalGroupsMap[key] = this.mergeGroupStates(template);
    this.syncIntervalGroupsArray();
    this.scheduleIntervalGroupsSync();

    const message = this.translateKey('interval_groups_copied', 'Configuración copiada del intervalo base');
    this.snackBar.open(message, '', { duration: 2500 });
  }

  onIntervalGroupActiveChange(levelId: number | string, intervalIndex: number): void {
    this.ensureIntervalGroupsAlignment();
    const interval = this.intervals?.[intervalIndex];
    if (!interval) {
      return;
    }

    const key = this.resolveIntervalKey(interval, intervalIndex);
    const intervalConfig = this.intervalGroupsMap?.[key];
    if (!intervalConfig) {
      return;
    }

    const config = intervalConfig[String(levelId)];
    if (!config) {
      return;
    }

    if (config.active === false) {
      config.subgroups = (config.subgroups || []).map(subgroup => ({ ...subgroup, active: false }));
    } else if (!config.subgroups.some(subgroup => subgroup.active !== false)) {
      config.subgroups = (config.subgroups || []).map((subgroup, index) => ({
        ...subgroup,
        active: index === 0
      }));
    }

    this.scheduleIntervalGroupsSync();
  }

  onIntervalGroupConfigChange(intervalIndex: number): void {
    this.ensureIntervalGroupsAlignment();
    this.scheduleIntervalGroupsSync();
  }

  saveIntervalGroups(intervalIndex: number): void {
    this.ensureIntervalGroupsAlignment();
    this.syncIntervalsToCourseFormGroup();
    const message = this.translateKey('interval_groups_saved', 'Configuración de intervalos guardada');
    this.snackBar.open(message, '', { duration: 2500 });
  }

  onIntervalStartDateChange(intervalIndex: number, value: string): void {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      return;
    }

    const interval = this.intervals[intervalIndex];
    interval.startDate = value;

    if (interval.endDate && interval.endDate < value) {
      interval.endDate = value;
    }

    this.handleIntervalDateRangeChange(intervalIndex);
  }

  onIntervalEndDateChange(intervalIndex: number, value: string): void {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      return;
    }

    const interval = this.intervals[intervalIndex];
    interval.endDate = value;

    if (interval.startDate && interval.startDate > value) {
      interval.startDate = value;
    }

    this.handleIntervalDateRangeChange(intervalIndex);
  }

  handleIntervalDateRangeChange(intervalIndex: number): void {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      return;
    }

    const interval = this.intervals[intervalIndex];
    const start = interval.startDate ? new Date(interval.startDate) : null;
    const end = interval.endDate ? new Date(interval.endDate) : null;

    if (!start || !end) {
      return;
    }

    if (end < start) {
      interval.endDate = interval.startDate;
    }

    const diffDays = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1);

    if (interval.dateGenerationMethod === 'consecutive' || interval.mustBeConsecutive || this.mustBeConsecutive) {
      interval.consecutiveDaysCount = diffDays;
      this.generateIntervalConsecutiveDates(intervalIndex);
      return;
    }

    if (interval.dateGenerationMethod === 'weekly') {
      this.generateIntervalWeeklyDates(intervalIndex);
      return;
    }

    this.adjustIntervalDatesWithinRange(intervalIndex);
  }

  // Cargar intervalos desde un curso existente
  loadIntervalsFromCourse(courseData: any, component: any) {
    // Comprobar si el curso tiene configuraci├│n de intervalos m├║ltiples
    if (courseData.settings) {
      try {
        const settings = courseData.settings;

        // Si tiene configuraci├│n de intervalos m├║ltiples
        if (settings.multipleIntervals) {
          // Activar el switch en el componente
          component.useMultipleIntervals = true;
          component.mustBeConsecutive = settings.mustBeConsecutive || false;
          component.mustStartFromFirst = settings.mustStartFromFirst || false;

          // Agrupar las fechas por intervalos
          const courseDates = courseData.course_dates || [];
          const intervalMap: { [key: string]: any } = {};

          // Agrupar por interval_id
          courseDates.forEach(date => {
            const intervalId = String(date.interval_id || 'default');

            if (!intervalMap[intervalId]) {
              const matchingInterval = settings.intervals?.find(i => String(i.id) === intervalId);

              intervalMap[intervalId] = {
                id: intervalId,
                name: date.interval_name || matchingInterval?.name || 'Intervalo',
                order: matchingInterval?.order || 0,
                // PRESERVE configuration properties from settings
                mustBeConsecutive: matchingInterval?.mustBeConsecutive ?? false,
                mustStartFromFirst: matchingInterval?.mustStartFromFirst ?? false,
                reservableStartDate: matchingInterval?.reservableStartDate || '',
                reservableEndDate: matchingInterval?.reservableEndDate || '',
                weeklyPattern: matchingInterval?.weeklyPattern || {
                  monday: false, tuesday: false, wednesday: false, thursday: false,
                  friday: false, saturday: false, sunday: false
                },
                scheduleStartTime: matchingInterval?.scheduleStartTime || this.courses.hours?.[0] || '',
                scheduleDuration: matchingInterval?.scheduleDuration || this.courses.duration?.[0] || '',
                startDate: matchingInterval?.startDate || '',
                endDate: matchingInterval?.endDate || '',
                dateGenerationMethod: matchingInterval?.dateGenerationMethod || 'manual',
                consecutiveDaysCount: matchingInterval?.consecutiveDaysCount || 2,
                selectedWeekdays: matchingInterval?.selectedWeekdays || [],
                limitAvailableDates: matchingInterval?.limitAvailableDates ?? false,
                maxSelectableDates: matchingInterval?.maxSelectableDates || 10,
                dates: []
              };
            }

            intervalMap[intervalId].dates.push({
              date: date.date,
              hour_start: date.hour_start,
              hour_end: date.hour_end,
              duration: date.duration,
              order: date.order || 0
            });
          });

          // Convertir a array ordenado por `order`
          const intervalGroups = Object.values(intervalMap).sort((a: any, b: any) => a.order - b.order);

          // Actualizar el array de fechas en el formulario
          const datesArray = this.courses.courseFormGroup.controls['course_dates'] as FormArray;

          // Limpiar fechas actuales
          while (datesArray.length > 0) {
            datesArray.removeAt(0);
          }

          this.intervals = Array.isArray(intervalGroups) ? intervalGroups : [];

          // A├▒adir fechas agrupadas por intervalos
/*          Object.values(intervalGroups).forEach((group: any, groupIndex) => {
            // Ordenar fechas por orden
            const sortedDates = [...group.dates].sort((a, b) => a.order - b.order);

            // A├▒adir cada fecha al FormArray
            sortedDates.forEach((dateInfo, dateIndex) => {
              // Crear un nuevo objeto de fecha
              const newDate = {
                date: typeof dateInfo.date === 'string' ? dateInfo.date : new Date(dateInfo.date).toISOString().split('T')[0],
                hour_start: dateInfo.hour_start,
                hour_end: dateInfo.hour_end,
                interval_id: group.id,
                order: dateInfo.order || dateIndex
              };

              // A├▒adir al FormArray
              datesArray.push(this.fb.control(newDate));
            });
          });*/

          // Actualizar settings en el formulario
          const updatedSettings = {
            ...this.courses.courseFormGroup.controls['settings'].value,
            multipleIntervals: true,
            mustBeConsecutive: component.mustBeConsecutive,
            mustStartFromFirst: component.mustStartFromFirst,
            intervals: Object.values(intervalGroups).map((group:any) => ({
              id: group.id,
              name: group.name
            }))
          };

          this.courses.courseFormGroup.patchValue({
            settings: updatedSettings
          });

          this.refreshIntervalGroupStateFromSettings();
        }
      } catch (error) {
        console.error("Error parsing course settings:", error);
      }
    } else {
      // Si no tiene intervalos, inicializar con los valores por defecto
      //this.initializeDefaultInterval();
    }
  }

  monitorSelect(event: any, level: any, j: number) {
    let course_dates = this.courses.courseFormGroup.controls['course_dates'].value
    course_dates[event.i].course_groups[course_dates[event.i].course_groups.findIndex((a: any) => a.degree_id === level.id)].course_subgroups[j].monitor = event.monitor
    course_dates[event.i].course_groups[course_dates[event.i].course_groups.findIndex((a: any) => a.degree_id === level.id)].course_subgroups[j].monitor_id = event.monitor.id
    this.courses.courseFormGroup.patchValue({ course_dates })
  }
  async deleteCourseDate(i: number) {
    const courseDates = this.courses.courseFormGroup.controls['course_dates'].value;
    const courseDate = courseDates[i];

    // Only validate for existing course dates (update mode)
    if (this.mode === 'update' && courseDate?.id && this.id) {
      try {
        const canProceed = await this.courseDateValidation.showCourseDateModificationDialog({
          courseId: this.id,
          dateId: courseDate.id,
          action: 'delete'
        }).toPromise();

        if (canProceed) {
          courseDates.splice(i, 1);
          this.snackBar.open('Fecha eliminada correctamente', '', { duration: 3000 });
        }
      } catch (error) {
        console.error('Error validating course date deletion:', error);
        // If validation fails, still allow deletion but warn user
        courseDates.splice(i, 1);
        this.snackBar.open('Fecha eliminada (validaci├│n fall├│)', '', { duration: 3000 });
      }
    } else {
      // For new courses or dates without ID, delete directly
      courseDates.splice(i, 1);
    }
  }
  /**
   * Open timing modal for subgroup students (cronometraje)
   * Abre el modal aunque no haya alumnos (se mostrar├í vac├¡o)
   */
  openTimingModal(subGroup: any, groupLevel: any, selectedDate?: any): void {

    if (!subGroup || !groupLevel) {
      console.error('No hay datos de subgrupo o nivel para mostrar tiempos.');
      return;
    }

    // Usar la misma l├│gica que flux-disponibilidad: filtrar por degree_id del nivel
    const bookingUsers = this.courses.courseFormGroup.controls['booking_users']?.value || [];

    // Filtrar por degree_id en lugar de course_subgroup_id
    const studentsInSubgroup = bookingUsers.filter((user: any) => user.degree_id === groupLevel.id);

    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];

    // Si no los encontramos en globales, verificar embebidos por fecha
    let hasAny = studentsInSubgroup.length > 0;
    if (!hasAny) {
      for (const cd of (courseDates || [])) {
        const group = (cd?.course_groups || []).find((g: any) => g?.degree_id === groupLevel?.id);
        const sg = group?.course_subgroups?.find((s: any) => (s?.id === subGroup?.id));
        if (sg && Array.isArray(sg.booking_users) && sg.booking_users.length > 0) { hasAny = true; break; }
      }
    }

    if (!hasAny) {
      this.snackBar.open('No hay alumnos registrados en este subgrupo. Abrimos el cronometraje igualmente.', 'OK', { duration: 2500 });
    }

    // Abrir el modal tradicional de tiempos, con lista (posible vac├¡a)
    this.openTimingModalDialog(subGroup, groupLevel, courseDates, studentsInSubgroup, selectedDate);
  }

  /**
   * Abre la pantalla de cronometraje en tiempo real
   */
  private openChronoScreen(subGroup: any, courseDates: any[]): void {
    if (!courseDates.length) {
      this.snackBar.open('No hay fechas de curso disponibles.', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    // Para simplicidad, usar la primera fecha disponible
    const firstDate = courseDates[0];
    const chronoUrl = `/chrono/${this.id}/${firstDate.id}?courseName=${encodeURIComponent(this.courses.courseFormGroup.get('name')?.value || 'Curso')}&courseDate=${encodeURIComponent(firstDate.date)}`;

    // Abrir en nueva pesta├▒a
    window.open(chronoUrl, '_blank');
  }

  // Discount management methods
  onMultiDateDiscountChange(): void {
    if (this.enableMultiDateDiscounts) {
      // Initialize with a default discount
      if (this.discountsByDates.length === 0) {
        this.discountsByDates = [
          { dates: 2, type: 'percentage', value: 10 }
        ];
      }
    }
    this.updateDiscountsInForm();
  }

  addNewDiscount(): void {
    const lastDiscount = this.discountsByDates[this.discountsByDates.length - 1];
    const newDates = lastDiscount ? lastDiscount.dates + 1 : 2;

    this.discountsByDates.push({
      dates: newDates,
      type: 'percentage',
      value: 10
    });

    this.validateDiscountDates();
    this.updateDiscountsInForm();
  }

  removeDiscount(index: number): void {
    if (this.discountsByDates.length > 1) {
      this.discountsByDates.splice(index, 1);
      this.updateDiscountsInForm();
    }
  }

  validateDiscountDates(): void {
    // Sort discounts by dates quantity to avoid conflicts
    this.discountsByDates.sort((a, b) => a.dates - b.dates);

    // Ensure no duplicate dates quantities
    const datesSet = new Set();
    this.discountsByDates = this.discountsByDates.filter(discount => {
      if (datesSet.has(discount.dates)) {
        return false;
      }
      datesSet.add(discount.dates);
      return true;
    });

    this.updateDiscountsInForm();
  }

  private updateDiscountsInForm(): void {
    if (this.enableMultiDateDiscounts && this.discountsByDates.length > 0) {
      const discountsForDB = this.discountsByDates.map(discount => ({
        date: discount.dates,
        discount: discount.value,
        type: discount.type === 'percentage' ? 1 : 2
      }));

      this.courses.courseFormGroup.patchValue({
        discounts: JSON.stringify(discountsForDB)
      });
    } else {
      this.courses.courseFormGroup.patchValue({
        discounts: null
      });
    }
  }

  private loadDiscountsFromCourse(): void {
    if (this.detailData && this.detailData.discounts) {
      try {
        let discounts;
        if (typeof this.detailData.discounts === 'string') {
          discounts = JSON.parse(this.detailData.discounts);
        } else {
          discounts = this.detailData.discounts;
        }

        if (discounts && discounts.length > 0) {
          this.enableMultiDateDiscounts = true;
          this.discountsByDates = discounts.map((discount: any) => ({
            dates: discount.date,
            type: discount.type === 1 ? 'percentage' : 'fixed',
            value: discount.discount
          }));
        }
      } catch (error) {
        console.error('Error parsing discounts:', error);
        this.enableMultiDateDiscounts = false;
        this.discountsByDates = [{ dates: 2, type: 'percentage', value: 10 }];
      }
    }
  }

  // Date generation methods
  toggleWeekday(day: string): void {
    this.weeklyPattern[day] = !this.weeklyPattern[day];
  }

  hasSelectedWeekdays(): boolean {
    return Object.values(this.weeklyPattern).some(selected => selected);
  }

  generateConsecutiveDates(): void {
    if (!this.courses.courseFormGroup.get('date_start_res')?.value) {
      return;
    }

    const startDate = new Date(this.courses.courseFormGroup.get('date_start_res')?.value);
    const courseDates = [];

    for (let i = 0; i < this.consecutiveDaysCount; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      courseDates.push({
        date: currentDate.toISOString().split('T')[0],
        hour_start: '09:00',
        hour_end: '10:00',
        duration: 60
      });
    }

    this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
    this.snackBar.open(
      this.translateService.instant('consecutive_dates_generated').replace('{count}', this.consecutiveDaysCount.toString()),
      'OK',
      { duration: 3000 }
    );
  }

  generateWeeklyDates(): void {
    if (!this.courses.courseFormGroup.get('date_start_res')?.value ||
        !this.courses.courseFormGroup.get('date_end_res')?.value) {
      return;
    }

    const startDate = new Date(this.courses.courseFormGroup.get('date_start_res')?.value);
    const endDate = new Date(this.courses.courseFormGroup.get('date_end_res')?.value);
    const courseDates = [];

    // Mapeo de d├¡as de la semana
    const dayMapping = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0
    };

    const selectedDays = Object.keys(this.weeklyPattern)
      .filter(day => this.weeklyPattern[day])
      .map(day => dayMapping[day]);

    const currentDate = new Date(startDate);
    let generatedCount = 0;

    while (currentDate <= endDate && generatedCount < this.maxSelectableDates) {
      if (selectedDays.includes(currentDate.getDay())) {
        courseDates.push({
          date: currentDate.toISOString().split('T')[0],
          hour_start: '09:00',
          hour_end: '10:00',
          duration: 60
        });
        generatedCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.courses.courseFormGroup.patchValue({ course_dates: courseDates });
    this.snackBar.open(
      this.translateService.instant('weekly_dates_generated').replace('{count}', courseDates.length.toString()),
      'OK',
      { duration: 3000 }
    );
  }

  /**
   * Abre el modal tradicional de gesti├│n de tiempos
   */
  private openTimingModalDialog(subGroup: any, groupLevel: any, courseDates: any[], studentsInSubgroup: any[], selectedDate?: any): void {

    // Construir bookingUsers con course_date_id para que el modal filtre por d├¡a igual que en detalle
    const bookingUsersWithDates = this.collectBookingUsersWithDates(courseDates);

    // Base de alumnos a partir de bookingUsers enriquecidos (por si no hay globales)
    const studentsBase = Array.from(new Map((bookingUsersWithDates || []).map((bu: any) => [
      bu?.client_id,
      {
        id: bu?.client_id,
        first_name: bu?.client?.first_name,
        last_name: bu?.client?.last_name,
        birth_date: bu?.client?.birth_date,
        country: bu?.client?.country,
        image: bu?.client?.image
      }
    ])).values());

    // Lista de alumnos del subgrupo (si est├í disponible), si no, fallback a base
    const students = (studentsInSubgroup && studentsInSubgroup.length > 0)
      ? studentsInSubgroup.map((u: any) => ({
          id: u.client_id,
          first_name: u.client?.first_name,
          last_name: u.client?.last_name,
          birth_date: u.client?.birth_date,
          country: u.client?.country,
          image: u.client?.image
        }))
      : Array.from(studentsBase);

    try {
      const ref = this.dialog.open(CourseTimingModalComponent, {
        width: '80%',
        maxWidth: '1200px',
        data: {
          subGroup,
          groupLevel,
          courseId: this.id,
          courseDates,
          // Lista global por compatibilidad (el modal filtrar├í por d├¡a)
          students,
          // Pasar booking users enriquecidos con course_date_id para filtrado por d├¡a
          bookingUsers: bookingUsersWithDates,
          // Preselecci├│n de d├¡a
          selectedCourseDateId: selectedDate?.id ?? selectedDate?.course_date_id ?? null
        }
      });

      ref.afterOpened().subscribe(() => {
      });

      ref.afterClosed().subscribe(result => {
        // Modal cerrado
      });
    } catch (error) {
      console.error('Error al abrir modal desde courses-v2 create-update:', error);
    }
  }

  /**
   * Aplana los booking_users embebidos en course_dates -> course_groups -> course_subgroups
   * y les a├▒ade course_date_id para que el modal pueda filtrar por d├¡a.
   */
  private collectBookingUsersWithDates(courseDates: any[]): any[] {
    const result: any[] = [];
    try {
      const dates = Array.isArray(courseDates)
        ? courseDates
        : (this.courses.courseFormGroup.controls['course_dates']?.value || []);

      for (const cd of dates) {
        const cdId = cd?.id ?? cd?.course_date_id ?? null;

        const groups = Array.isArray(cd?.course_groups) ? cd.course_groups : [];
        for (const g of groups) {
          const subgroups = Array.isArray(g?.course_subgroups) ? g.course_subgroups : [];
          for (const sg of subgroups) {
            const bookings = Array.isArray(sg?.booking_users) ? sg.booking_users : [];

            for (const bu of bookings) {
              const client = bu?.client || {};
              const clientId = bu?.client_id ?? client?.id ?? bu?.id;
              const mappedUser = {
                id: bu?.id,
                client_id: clientId,
                client,
                course_date_id: cdId,
                course_group_id: g?.id ?? bu?.course_group_id,
                course_subgroup_id: sg?.id ?? bu?.course_subgroup_id ?? bu?.course_sub_group_id ?? bu?.course_sub_group?.id,
                accepted: bu?.accepted ?? null,
                attended: bu?.attended ?? bu?.attendance ?? null,
                date: cd?.date ?? null
              };
              result.push(mappedUser);
            }
          }
        }
      }

      // Si no hemos encontrado nada, usar fallback al control global actual
      if (result.length === 0) {
        const fallback = this.courses.courseFormGroup.controls['booking_users']?.value || [];

        // Para el fallback, necesitamos asignar course_date_id y course_subgroup_id correctos
        // bas├índonos en las fechas disponibles
        const enrichedFallback = fallback.map((bu: any) => {
          // Intentar encontrar la fecha y subgrupo correcto para este booking user
          let foundCourseDate = null;
          let foundSubgroup = null;

          for (const cd of dates) {
            for (const g of (cd?.course_groups || [])) {
              for (const sg of (g?.course_subgroups || [])) {
                // Comparar por course_subgroup_id si est├í disponible
                if (bu?.course_subgroup_id === sg?.id || bu?.course_sub_group_id === sg?.id) {
                  foundCourseDate = cd;
                  foundSubgroup = sg;
                  break;
                }
              }
              if (foundSubgroup) break;
            }
            if (foundSubgroup) break;
          }

          return {
            ...bu,
            course_date_id: foundCourseDate?.id ?? bu?.course_date_id ?? null,
            course_subgroup_id: foundSubgroup?.id ?? bu?.course_subgroup_id ?? bu?.course_sub_group_id ?? null
          };
        });

        return Array.isArray(enrichedFallback) ? enrichedFallback : [];
      }
      return result;
    } catch (e) {
      console.warn('collectBookingUsersWithDates fallback by error:', e);
      const fallback = this.courses.courseFormGroup.controls['booking_users']?.value || [];
      return Array.isArray(fallback) ? fallback : [];
    }
  }

  hasGeneratedDates(): boolean {
    // Check if there are dates generated through intervals
    if (this.useMultipleIntervals && this.intervals?.length > 0) {
      return this.intervals.some(interval => interval.dates && interval.dates.length > 0);
    }
    // Check if there are course dates (at least 1 for single period courses)
    const courseDates = this.courses.courseFormGroup.controls['course_dates'].value;
    return courseDates && courseDates.length > 0;
  }

  openBulkScheduleDialog(): void {
    // For now, use a simple prompt-based approach
    // TODO: Create a proper dialog component
    const startTime = prompt('Hora de inicio (formato HH:MM):', '09:00');
    const duration = prompt('Duraci├│n en minutos:', '60');

    if (startTime && duration) {
      this.applyBulkSchedule(startTime, duration);
    }
  }

  applyBulkSchedule(startTime: string, duration: string): void {
    if (!startTime || !duration) {
      this.showErrorMessage('Por favor, establece primero las horas de inicio y fin');
      return;
    }

    const courseDates = this.courses.courseFormGroup.controls['course_dates'].value;
    if (!courseDates || courseDates.length === 0) {
      this.showErrorMessage('No hay fechas de curso disponibles para actualizar');
      return;
    }

    const previousCourseDates = this.cloneCourseDates(courseDates);
    const updatedCourseDates = courseDates.map((date: any) => ({
      ...date,
      hour_start: startTime,
      duration: duration,
      hour_end: this.courses.addMinutesToTime(startTime, duration)
    }));

    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(updatedCourseDates)
    );

    if (validationErrors.length > 0) {
      this.showValidationSummary(validationErrors);
      return;
    }

    if (this.useMultipleIntervals && Array.isArray(this.intervals) && this.intervals.length > 0) {
      const previousIntervals = this.cloneIntervals(this.intervals);
      const updatedIntervals = this.intervals.map(interval => ({
        ...interval,
        dates: Array.isArray(interval.dates)
          ? interval.dates.map((date: any) => ({
            ...date,
            hour_start: startTime,
            duration: duration,
            hour_end: this.courses.addMinutesToTime(startTime, duration)
          }))
          : []
      }));

      this.intervals = updatedIntervals;
      const synced = this.syncIntervalsToCourseFormGroup();

      if (!synced) {
        this.intervals = previousIntervals;
        this.courses.courseFormGroup.patchValue({ course_dates: previousCourseDates });
        return;
      }
    } else {
      this.courses.courseFormGroup.patchValue({ course_dates: updatedCourseDates });
    }

    this.snackBar.open('Horario aplicado a todas las fechas exitosamente', 'OK', { duration: 3000 });
  }

  applyBulkScheduleToInterval(intervalIndex: number, startTime: string, duration: string): boolean {
    this.ensureSingleIntervalForNonFlexible();

    if (!startTime || !duration) {
      this.showErrorMessage('Por favor, establece primero las horas de inicio y fin');
      return false;
    }

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      this.showErrorMessage('Intervalo no v├ílido');
      return false;
    }

    const interval = this.intervals[intervalIndex];
    interval.dates = Array.isArray(interval.dates) ? interval.dates : [];
    if (!interval.dates || interval.dates.length === 0) {
      this.showErrorMessage('Este intervalo no tiene fechas disponibles para actualizar');
      return false;
    }

    const previousIntervals = this.cloneIntervals(this.intervals);
    const updatedIntervalDates: CourseDate[] = interval.dates.map((date: any) => ({
      ...date,
      hour_start: startTime,
      duration: duration,
      hour_end: this.courses.addMinutesToTime(startTime, duration)
    }));

    if (this.isSingleIntervalMode && intervalIndex === 0) {
      // ACTUALIZACI├ôN DIRECTA: Reemplazar las fechas del intervalo directamente
      interval.dates = updatedIntervalDates;

      const generatedCourseDates = this.generateCourseDatesFromIntervals(this.intervals);
      const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
        this.convertToCourseDateInfos(generatedCourseDates)
      );

      if (validationErrors.length > 0) {
        this.showValidationSummary(validationErrors);
        this.intervals = previousIntervals;
        return false;
      }

      const synced = this.syncIntervalsToCourseFormGroup();
      if (!synced) {
        this.intervals = previousIntervals;
        return false;
      }

      this.snackBar.open(`Horario aplicado al intervalo ${intervalIndex + 1} exitosamente`, 'OK', { duration: 3000 });
      return true;
    }

    const tentativeIntervals = this.cloneIntervals(this.intervals);
    tentativeIntervals[intervalIndex].dates = updatedIntervalDates.map(date => ({ ...date }));

    const generatedCourseDates = this.generateCourseDatesFromIntervals(tentativeIntervals);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(generatedCourseDates)
    );

    if (validationErrors.length > 0) {
      this.showValidationSummary(validationErrors);
      this.intervals = previousIntervals;
      return false;
    }

    this.intervals[intervalIndex].dates = updatedIntervalDates.map(date => ({ ...date }));

    const synced = this.syncIntervalsToCourseFormGroup();
    if (!synced) {
      this.intervals = previousIntervals;
      return false;
    }

    this.snackBar.open(`Horario aplicado al intervalo ${intervalIndex + 1} exitosamente`, 'OK', { duration: 3000 });
    return true;
  }

  // M├®todos para manejar los selectores inline de horario
  getIntervalScheduleStartTime(intervalIndex: number): string {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return '';
    const interval = this.intervals[intervalIndex];
    return interval.scheduleStartTime || this.courses.hours[0] || '';
  }

  setIntervalScheduleStartTime(intervalIndex: number, startTime: string): void {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;
    if (!this.intervals[intervalIndex].scheduleStartTime) {
      this.intervals[intervalIndex].scheduleStartTime = startTime;
    } else {
      this.intervals[intervalIndex].scheduleStartTime = startTime;
    }
  }

  getIntervalScheduleDuration(intervalIndex: number): string {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return '';
    const interval = this.intervals[intervalIndex];
    return interval.scheduleDuration || this.courses.duration[0] || '';
  }

  setIntervalScheduleDuration(intervalIndex: number, duration: string): void {
    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) return;
    if (!this.intervals[intervalIndex].scheduleDuration) {
      this.intervals[intervalIndex].scheduleDuration = duration;
    } else {
      this.intervals[intervalIndex].scheduleDuration = duration;
    }
  }

  applyBulkScheduleToIntervalInline(intervalIndex: number): void {

    // Activar flag para prevenir interferencias durante la aplicaci├│n
    this._applyingBulkSchedule = true;

    const startTime = this.getIntervalScheduleStartTime(intervalIndex);
    const duration = this.getIntervalScheduleDuration(intervalIndex);

    if (!startTime || !duration) {
      this.showErrorMessage('Por favor, selecciona la hora de inicio y duraci├│n');
      this._applyingBulkSchedule = false; // Resetear flag antes de salir
      return;
    }

    const success = this.applyBulkScheduleToInterval(intervalIndex, startTime, duration);

    // Resetear flag al final de la operaci├│n
    this._applyingBulkSchedule = false;
  }

  // Variables para los selectores de horario masivo para fechas individuales
  individualScheduleStartTime: string = '';
  individualScheduleDuration: string = '';

  // M├®todos para aplicar horario masivo a fechas individuales
  applyBulkScheduleToIndividualDates(): void {

    // Activar flag para prevenir sync durante la aplicaci├│n
    this._applyingBulkSchedule = true;

    const startTime = this.getIndividualScheduleStartTime();
    const duration = this.getIndividualScheduleDuration();

    if (!startTime || !duration) {
      this.showErrorMessage('Por favor, selecciona la hora de inicio y duraci├│n');
      this._applyingBulkSchedule = false;
      return;
    }

    // NUEVO ENFOQUE: Actualizar directamente las fechas en los intervalos
    // en lugar de usar patchValue que puede estar causando duplicaciones
    this.updateIntervalDatesDirectly(startTime, duration);

    this.snackBar.open(`Horario aplicado exitosamente a todas las fechas`, 'OK', { duration: 3000 });

    // Resetear flag al final de la operaci├│n exitosa
    this._applyingBulkSchedule = false;
  }

  // NUEVA FUNCI├ôN: Actualizar fechas directamente en los intervalos
  private updateIntervalDatesDirectly(startTime: string, duration: string): void {
    if (!this.intervals || this.intervals.length === 0) {
      return;
    }

    this.intervals.forEach((interval: any) => {
      if (!Array.isArray(interval?.dates)) {
        return;
      }

      interval.dates.forEach((date: any) => {
        // Actualizar directamente los valores
        date.hour_start = startTime;
        date.duration = duration;
        date.hour_end = this.courses.addMinutesToTime(startTime, duration);
      });
    });

    // Restaurar sync
    this.syncIntervalsToCourseFormGroup();

  }

  // M├®todos para manejar los selectores inline de horario para fechas individuales
  getIndividualScheduleStartTime(): string {
    return this.individualScheduleStartTime || this.courses.hours?.[0] || '';
  }

  setIndividualScheduleStartTime(startTime: string): void {
    this.individualScheduleStartTime = startTime;
  }

  getIndividualScheduleDuration(): string {
    return this.individualScheduleDuration || this.courses.duration?.[0] || '';
  }

  setIndividualScheduleDuration(duration: string): void {
    this.individualScheduleDuration = duration;
  }

  private buildIntervalTemplate(): any {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      id: Date.now().toString(),
      name: `${this.translateService?.instant('interval') || 'Interval'} 1`,
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: tomorrow.toISOString().split('T')[0],
      dateGenerationMethod: 'manual',
      consecutiveDaysCount: 2,
      selectedWeekdays: [],
      dates: [],
      mustBeConsecutive: false,
      mustStartFromFirst: false,
      limitAvailableDates: false,
      maxSelectableDates: 10,
      reservableStartDate: tomorrow.toISOString().split('T')[0],
      reservableEndDate: tomorrow.toISOString().split('T')[0],
      weeklyPattern: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      scheduleStartTime: this.courses.hours?.[0] || '',
      scheduleDuration: this.courses.duration?.[0] || ''
    };
  }

  createDefaultInterval(): any {
    // Solo crear un nuevo intervalo si realmente no hay ninguno
    if (!this.intervals || this.intervals.length === 0) {
      return this.buildIntervalTemplate();
    }

    return this.intervals[0];
  }

  // Cached display intervals to avoid recreating on every render
  private _displayIntervals: any[] = [];
  private _lastIntervalState: any = null;

  getDisplayIntervals(): any[] {
    // Create a state signature to detect changes
    const currentState = {
      intervalsCount: this.intervals?.length || 0,
      useMultipleIntervals: this.useMultipleIntervals,
      intervalsHash: this.intervals?.map(i => i.id).join(',') || ''
    };

    // Only recalculate if state has changed
    if (JSON.stringify(currentState) !== JSON.stringify(this._lastIntervalState)) {
      // Ensure intervals array exists, but don't create new ones unnecessarily
      if (!this.intervals || this.intervals.length === 0) {
        this.intervals = [];
        const defaultInterval = this.createDefaultInterval();
        this.intervals.push(defaultInterval);
      }

      if (this.useMultipleIntervals) {
        // Return direct reference to intervals, not a copy, so ngModel bindings work
        this._displayIntervals = this.intervals;
      } else {
        // FIXED: En modo intervalo ├║nico, solo mostrar el primer intervalo SIN modificar this.intervals
        this._displayIntervals = this.intervals.length > 0 ? [this.intervals[0]] : [];
      }

      this._lastIntervalState = currentState;
    }

    return this._displayIntervals;
  }

  // Helper method to invalidate display intervals cache when intervals change
  private invalidateDisplayIntervalsCache(): void {
    this._lastIntervalState = null;
  }

  /**
   * Apply global configuration to all intervals
   */
  applyGlobalConfigToAllIntervals(): void {
    if (!this.intervals || this.intervals.length === 0) {
      return;
    }

    this.intervals.forEach((interval) => {
      if (!interval) {
        return;
      }

      interval.mustBeConsecutive = this.mustBeConsecutive;
      interval.mustStartFromFirst = this.mustStartFromFirst;
    });

    this.syncIntervalsToCourseFormGroup();
    this.snackBar.open('Configuraci├│n global aplicada a todos los intervalos', 'OK', { duration: 3000 });
  }

  /**
   * Handle intervals config mode change (unified/independent)
   */
  onIntervalsConfigModeChange(isIndependent: boolean): void {
    const newMode = isIndependent ? 'independent' : 'unified';
    this.courses.courseFormGroup.patchValue({
      intervals_config_mode: newMode
    });
  }

  /**
   * Handle intervals changes from the intervals manager component
   */
  onIntervalsChanged(intervals: any[]): void {
    if (!Array.isArray(intervals)) {
      return;
    }

    this.intervals = intervals.map(interval => ({ ...interval }));
    this.ensureIntervalGroupsAlignment();
    this.invalidateDisplayIntervalsCache();
    this.syncIntervalsToCourseFormGroup();
    this.enforceIntervalGroupAvailability();
  }
}





