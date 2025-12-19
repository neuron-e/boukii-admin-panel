import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, QueryList, ViewChildren } from '@angular/core';
import {AbstractControl, FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import {map, forkJoin, mergeMap, throwError, catchError, Subject, takeUntil, Subscription, firstValueFrom} from 'rxjs';
import { finalize } from 'rxjs/operators';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { ApiCrudService } from 'src/service/crud.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SchoolService } from 'src/service/school.service';
import { CoursesService } from 'src/service/courses.service';
import { MeetingPointService } from 'src/service/meeting-point.service';
import {TranslateService} from '@ngx-translate/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import { CourseDateValidationService } from 'src/service/course-date-validation.service';
import { CourseDateOverlapValidationService, CourseDateInfo, CourseDateValidationError } from 'src/service/course-date-overlap-validation.service';
import {CourseTimingModalComponent} from '../course-timing-modal/course-timing-modal.component';
import { IntervalSelectorModalComponent } from './interval-selector-modal/interval-selector-modal.component';
import { LevelSelectorDialogComponent } from '../level-selector-dialog/level-selector-dialog.component';
import { CourseDetailCardComponent } from 'src/@vex/components/flux-component/course-card/app.component';

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
  booking_users?: any[];
  booking_users_active?: any[];
}

interface IntervalGroupState {
  levelId: number | string;
  active: boolean;
  max_participants?: number;
  age_min?: number;
  age_max?: number;
  subgroups: IntervalSubgroupState[];
}

type IntervalGroupsState = Record<string, IntervalGroupState>;

type WeekDaysState = {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

@Component({
  selector: 'vex-courses-create-update',
  templateUrl: './courses-create-update.component.html',
  styleUrls: ['./courses-create-update.component.scss',],
  animations: [fadeInUp400ms, stagger20ms],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CoursesService]
})
export class CoursesCreateUpdateComponent implements OnInit, OnDestroy, AfterViewInit {
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
  meetingPoints: any[] = [];
  selectedMeetingPointId: number | null = null;
  monitors: any = [];
  schoolData: any = [];
  extras: any = []
  selectedExtrasForForm: any = []

  mode: 'create' | 'update' = 'create';
  loading: boolean = true;
  saving: boolean = false;
  translatingLangs: Set<string> = new Set<string>();
  bulkTranslationInProgress = false;
  baseTranslationDirty = false;
  translationListenerReady = false;
  manuallyEditedTranslations: Set<string> = new Set<string>();
  private translationWatcherAttached = false;
  private lastBaseTranslationSnapshot = { name: '', short_description: '', description: '' };
  private initialHeavySnapshot: string = '';
  extrasModal: boolean = false
  confirmModal: boolean = false
  editModal: boolean = false
  editFunctionName: string | null = null;
  editFunctionArgs: any[] = [];
  private priceRangeInitialized = false;

  // Memory Management: Subject for unsubscribing from observables
  private destroy$ = new Subject<void>();

  // DOM Optimization: Track which levels and subgroups are expanded
  // Only render vex-flux-disponibilidad when expanded (lazy DOM rendering)
  expandedLevels = new Set<string>();
  expandedSubgroups = new Set<string>();
  @ViewChildren(CourseDetailCardComponent) detailCards?: QueryList<CourseDetailCardComponent>;
  private detailCardsInitialized = false;
  private detailCardsChanges?: Subscription;
  private courseDatesChanges?: Subscription;
  private courseSyncLogId = 0;
  debugMode = false;
  studentDebugMode = false;
  // Track which interval tab is active for each subgroup to avoid rendering all 12 interval tabs
  selectedIntervalIndexBySubgroup = new Map<string, number>();

  /**
   * Get active interval tab index for a subgroup
   * Default to 0 if not set (first interval visible)
   */
  getSelectedIntervalIndexForSubgroup(level: any, subgroupIndex: number): number {
    const cacheKey = this.getSubgroupCacheKey(level, subgroupIndex);
    return this.selectedIntervalIndexBySubgroup.get(cacheKey) ?? 0;
  }

  /**
   * Inject booking_users arrays into course_dates/course_groups structure
   * so downstream components and caches can render existing students.
   * Uses booking_users_* relations plus the nested course_subgroups.bookingUsers payload
   * returned by the course detail endpoint.
   */
  private attachBookingUsersToCourseDates(detailData: any): void {
    if (!detailData) {
      return;
    }

    const courseDates = Array.isArray(detailData.course_dates) ? detailData.course_dates : [];
    this.assignSubgroupKeysInCourseDates(courseDates);
    if (!courseDates.length) {
      return;
    }

    const bookingSources = [
      detailData.booking_users_active,
      detailData.booking_users,
      detailData.bookingUsersActive,
      detailData.bookingUsers
    ];
    let bookingUsers: any[] = [];
    for (const source of bookingSources) {
      if (Array.isArray(source) && source.length) {
        bookingUsers = source;
        break;
      }
    }

    const normalizeId = (value: any): string | null => {
      if (value === undefined || value === null) {
        return null;
      }
      const normalized = String(value).trim();
      return normalized === '' ? null : normalized;
    };
    const buildKey = (dateId: any, subgroupId: any): string | null => {
      const normalizedDateId = normalizeId(dateId);
      const normalizedSubgroupId = normalizeId(subgroupId);
      if (!normalizedDateId || !normalizedSubgroupId) {
        return null;
      }
      return `${normalizedDateId}::${normalizedSubgroupId}`;
    };
    const cloneUsers = (list: any[]): any[] => list.map(user => ({ ...user }));
    const extractBookingList = (entity: any): any[] => {
      if (!entity || typeof entity !== 'object') {
        return [];
      }
      const candidates = [
        entity.booking_users_active,
        entity.booking_users,
        entity.bookingUsersActive,
        entity.bookingUsers,
        entity.booking_users_confirmed,
        entity.bookingUsersConfirmed
      ];
      for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length) {
          return candidate;
        }
      }
      return [];
    };
    const buildUserSignature = (user: any): string | null => {
      const rawId = normalizeId(user?.id);
      if (rawId) {
        return `id:${rawId}`;
      }
      const bookingId = normalizeId(user?.booking_id ?? user?.bookingId);
      const clientId = normalizeId(user?.client_id ?? user?.client?.id);
      const courseDateId = normalizeId(user?.course_date_id ?? user?.course_date?.id ?? user?.courseDate?.id);
      const subgroupId = normalizeId(
        user?.course_subgroup_id ??
        user?.course_sub_group_id ??
        user?.course_sub_group?.id ??
        user?.courseSubGroupId ??
        user?.courseSubGroup?.id
      );
      return `client:${clientId ?? 'x'}|date:${courseDateId ?? 'x'}|sg:${subgroupId ?? 'x'}|booking:${bookingId ?? 'x'}`;
    };
    const pushUniqueUsers = (users: any[], target: any[], seen: Set<string>) => {
      if (!Array.isArray(users) || !users.length) {
        return;
      }
      users.forEach(user => {
        const signature = buildUserSignature(user);
        if (!signature || seen.has(signature)) {
          return;
        }
        seen.add(signature);
        target.push({ ...user });
      });
    };

    const groupedUsers = new Map<string, any[]>();
    bookingUsers.forEach(user => {
      const dateId = user?.course_date_id ?? user?.course_date?.id ?? user?.courseDateId ?? user?.courseDate?.id ?? null;
      const subgroupId = user?.course_subgroup_id
        ?? user?.course_sub_group_id
        ?? user?.course_sub_group?.id
        ?? user?.courseSubGroupId
        ?? user?.courseSubGroup?.id
        ?? null;
      const key = buildKey(dateId, subgroupId);
      if (!key) {
        return;
      }
      if (!groupedUsers.has(key)) {
        groupedUsers.set(key, []);
      }
      groupedUsers.get(key)!.push(user);
    });

    const canonicalUsersBySubgroup = new Map<string, any[]>();
    const canonicalUsersByKey = new Map<string, any[]>();
    const resolveUsersForSubgroup = (dateId: string | null, subgroup: any): any[] => {
      // 1) Detectar "subgrupo nuevo" aunque se pierda __isNew en el sync:
      const rawSubgroupId = subgroup?.id ?? subgroup?.course_subgroup_id ?? subgroup?.subgroup_id;
      const subgroupId = normalizeId(rawSubgroupId);

      const isNumericId = subgroupId != null && /^\d+$/.test(String(subgroupId));
      if (subgroup?.__isNew || !isNumericId) {
        // importantísimo: dejarlo limpio también en el objeto (por si la UI lo lee directo)
        subgroup.booking_users = [];
        subgroup.booking_users_active = [];
        subgroup.booking_users_confirmed = [];
        return [];
      }

      const fallbackDateId = dateId ?? normalizeId(subgroup?.course_date_id ?? subgroup?.courseDateId);
      const key = fallbackDateId ? buildKey(fallbackDateId, subgroupId) : null;

      // 2) Si backend NO tiene bookingUsers para este (date, subgroup), NO heredar nada "inline"
      const hasBackendUsers = !!(key && groupedUsers.has(key) && groupedUsers.get(key)!.length);

      if (!hasBackendUsers) {
        subgroup.booking_users = [];
        subgroup.booking_users_active = [];
        subgroup.booking_users_confirmed = [];
        return [];
      }

      // 3) Ya que hay usuarios reales para ese key, los devolvemos desde groupedUsers
      return cloneUsers(groupedUsers.get(key)!);
    };
    const assignUsersToSubgroup = (dateId: string | null, subgroup: any): any[] => {
      const users = resolveUsersForSubgroup(dateId, subgroup);
      subgroup.booking_users = cloneUsers(users);
      subgroup.booking_users_active = cloneUsers(users);
      return users;
    };

    const globalUsers: any[] = [];
    const globalSeen = new Set<string>();

    courseDates.forEach(date => {
      const dateId = normalizeId(date?.id ?? date?.course_date_id ?? date?.courseDateId);
      const aggregateForDate: any[] = [];
      const aggregateSeen = new Set<string>();
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];

      groups.forEach(group => {
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach(subgroup => {
          const users = assignUsersToSubgroup(dateId, subgroup);
          pushUniqueUsers(users, aggregateForDate, aggregateSeen);
          pushUniqueUsers(users, globalUsers, globalSeen);
        });
      });

      const flattened = Array.isArray(date?.course_subgroups) ? date.course_subgroups : [];
      flattened.forEach(subgroup => {
        const users = assignUsersToSubgroup(dateId, subgroup);
        pushUniqueUsers(users, aggregateForDate, aggregateSeen);
        pushUniqueUsers(users, globalUsers, globalSeen);
      });

      if (aggregateForDate.length) {
        date.booking_users = cloneUsers(aggregateForDate);
        date.booking_users_active = cloneUsers(aggregateForDate);
      } else {
        date.booking_users = Array.isArray(date.booking_users) ? date.booking_users : [];
        date.booking_users_active = Array.isArray(date.booking_users_active) ? date.booking_users_active : [];
      }
    });

    if (!bookingUsers.length && globalUsers.length) {
      detailData.booking_users_active = cloneUsers(globalUsers);
      detailData.booking_users = cloneUsers(globalUsers);
    }
  }

  /**
   * Set active interval tab for a subgroup
   * Called when user clicks a different interval tab
   */
  setSelectedIntervalIndexForSubgroup(level: any, subgroupIndex: number, intervalIndex: number): void {
    const cacheKey = this.getSubgroupCacheKey(level, subgroupIndex);
    this.selectedIntervalIndexBySubgroup.set(cacheKey, intervalIndex);
  }

  private collectSubgroupSummary(): { left: Record<string, number>, right: Record<string, number>, map: Record<string, number> } {
    const courseDates = this.courses.courseFormGroup.get('course_dates')?.value || [];
    const leftCounts: Record<string, number> = {};
    const rightCounts: Record<string, number> = {};
    const mapCounts: Record<string, number> = {};

    const levelGrop = this.courses.courseFormGroup?.controls?.['levelGrop']?.value || [];
    levelGrop.forEach((level: any) => {
      const levelId = level?.id ?? level?.degree_id;
      if (levelId == null) {
        return;
      }
      const subgroups = this.getAllUniqueSubgroupsForLevel(level);
      leftCounts[String(levelId)] = subgroups.length;
    });

    courseDates.forEach((cd: any) => {
      (cd.course_groups || []).forEach((group: any) => {
        const degree = String(group.degree_id || group.id);
        rightCounts[degree] = Math.max(rightCounts[degree] || 0, (group.course_subgroups || []).length);
      });
    });

    Object.values(this.intervalGroupsMap || {}).forEach(intervalState => {
      Object.values(intervalState || {}).forEach(levelState => {
        const key = String(levelState.levelId || levelState.subgroups?.[0]?.degree_id || 'unknown');
        mapCounts[key] = Math.max(mapCounts[key] || 0, (levelState.subgroups || []).length);
      });
    });

    return { left: leftCounts, right: rightCounts, map: mapCounts };
  }

  private logSubgroupState(stage: string): void {
    if (!this.debugMode) {
      return;
    }
    const summary = this.collectSubgroupSummary();
    this.courseSyncLogId += 1;
    // this.debugLog('subgroup-sync', { stage, courseSyncLogId: this.courseSyncLogId, summary });
  }

  private logCourseDatesSnapshot(stage: string): void {
    if (!this.debugMode) {
      return;
    }
    const courseDates = this.courses.courseFormGroup.get('course_dates')?.value || [];
    const snapshot = courseDates.map((cd: any, index: number) => {
      const courseGroups = Array.isArray(cd?.course_groups) ? cd.course_groups : [];
      const summary = courseGroups.map((group: any) => ({
        level: group?.degree_id,
        subgroups: (group?.course_subgroups || []).length
      }));
      return { index: index + 1, date: cd?.date, summary };
    });
    // this.debugLog('course-dates-snapshot', { stage, snapshot });
  }

  private logStudentDebug(event: string, payload: any): void {
    if (!this.studentDebugMode) {
      return;
    }
    try {
      const serialized = JSON.stringify(payload, null, 2);
      console.log(`[StudentsDebug:${event}] ${serialized}`);
    } catch {
      console.log(`[StudentsDebug:${event}]`, payload);
    }
  }

  private summarizeSubgroupsForLog(subgroups: any[]): Array<{ index: number; subgroupId: any; bookingUsers: number }> {
    if (!Array.isArray(subgroups)) {
      return [];
    }
    return subgroups.map((subgroup: any, idx: number) => ({
      index: subgroup?._index ?? idx,
      subgroupId: subgroup?.id ?? subgroup?.subgroup_id ?? subgroup?.course_subgroup_id ?? null,
      bookingUsers: Array.isArray(subgroup?.booking_users) ? subgroup.booking_users.length : 0
    }));
  }

  private parseNumber(value: any): number | null {
    const num = parseInt(String(value), 10);
    return Number.isFinite(num) ? num : null;
  }

  /**
   * Ensure age and max participants edits on levels/subgroups are propagated to course_dates and intervalGroupsMap.
   * This keeps the payload consistent for admin + booking consumers.
   */
  private syncLevelAndSubgroupConstraints(): void {
    const levelControl = this.courses.courseFormGroup.get('levelGrop');
    const courseDatesControl = this.courses.courseFormGroup.get('course_dates');
    const levels = Array.isArray(levelControl?.value) ? [...levelControl.value] : [];
    const courseDates = Array.isArray(courseDatesControl?.value) ? [...courseDatesControl.value] : [];

    let minAge: number | null = null;
    let maxAge: number | null = null;

    levels.forEach((level, idx) => {
      const ageMin = this.parseNumber(level.age_min);
      const ageMax = this.parseNumber(level.age_max);
      const maxParticipants = this.parseNumber(level.max_participants);

      if (ageMin != null) {
        level.age_min = ageMin;
        minAge = minAge == null ? ageMin : Math.min(minAge, ageMin);
      }
      if (ageMax != null) {
        level.age_max = ageMax;
        maxAge = maxAge == null ? ageMax : Math.max(maxAge, ageMax);
      }
      if (maxParticipants != null) {
        level.max_participants = maxParticipants;
      }
      levels[idx] = { ...level };

      // Propagate to course_dates groups/subgroups
      courseDates.forEach((cd: any) => {
        const courseGroups = cd?.course_groups || cd?.courseGroups || [];
        courseGroups.forEach((group: any) => {
          if ((group?.degree_id ?? group?.degreeId) === (level?.id ?? level?.degree_id)) {
            if (ageMin != null) group.age_min = ageMin;
            if (ageMax != null) group.age_max = ageMax;
            if (maxParticipants != null) {
              group.max_participants = maxParticipants;
              // Don't overwrite subgroup max_participants if already set
              // Each subgroup can have its own capacity
              const subgroups = group.course_subgroups || group.courseSubgroups || [];
              subgroups.forEach((sg: any) => {
                if (sg.max_participants == null) {
                  sg.max_participants = maxParticipants;
                }
              });
            }
          }
        });
      });

      // Propagate to intervalGroupsMap
      if (this.intervalGroupsMap) {
        Object.values(this.intervalGroupsMap).forEach((intervalState: any) => {
          const levelState = intervalState?.[String(level?.id ?? level?.degree_id)];
          if (levelState) {
            if (ageMin != null) levelState.age_min = ageMin;
            if (ageMax != null) levelState.age_max = ageMax;
            if (maxParticipants != null) {
              levelState.max_participants = maxParticipants;
              // Don't overwrite subgroup max_participants if already set
              if (Array.isArray(levelState.subgroups)) {
                levelState.subgroups.forEach((sg: any) => {
                  if (sg.max_participants == null) {
                    sg.max_participants = maxParticipants;
                  }
                });
              }
            }
          }
        });
      }
    });

    if (levelControl) {
      levelControl.setValue(levels, { emitEvent: false });
      levelControl.markAsDirty();
    }
    if (courseDatesControl) {
      courseDatesControl.setValue(courseDates, { emitEvent: false });
      courseDatesControl.markAsDirty();
    }

    // Sync global course age bounds (used by backend validators/booking flows)
    const courseType = this.courses.courseFormGroup.get('course_type')?.value;
    const ageMinControl = this.courses.courseFormGroup.get('age_min');
    const ageMaxControl = this.courses.courseFormGroup.get('age_max');

    if (courseType === 1) {
      // Colectivos: mantener límites amplios a nivel curso y delegar la restricción a los grupos
      if (ageMinControl) {
        ageMinControl.setValue(1, { emitEvent: false });
        ageMinControl.markAsDirty();
      }
      if (ageMaxControl) {
        ageMaxControl.setValue(99, { emitEvent: false });
        ageMaxControl.markAsDirty();
      }
    } else {
      // Privados/otros: reflejar los rangos editados
      if (ageMinControl && minAge != null) {
        ageMinControl.setValue(minAge, { emitEvent: false });
        ageMinControl.markAsDirty();
      }
      if (ageMaxControl && maxAge != null) {
        ageMaxControl.setValue(maxAge, { emitEvent: false });
        ageMaxControl.markAsDirty();
      }
    }
  }

  /**
   * Toggle level expansion state
   * When expanded, subgroups and their flux-disponibilidad components render
   */
  toggleLevel(level: any): void {
    const key = level.id || JSON.stringify(level);
    if (this.expandedLevels.has(key)) {
      this.expandedLevels.delete(key);
    } else {
      this.expandedLevels.add(key);
    }
  }

  /**
   * Toggle subgroup expansion state
   * When expanded, its flux-disponibilidad component renders
   */
  toggleSubgroup(level: any, subgroupIndex: number): void {
    const cacheKey = this.getSubgroupCacheKey(level, subgroupIndex);
    if (this.expandedSubgroups.has(cacheKey)) {
      this.expandedSubgroups.delete(cacheKey);
    } else {
      this.expandedSubgroups.add(cacheKey);
    }
  }

  onLevelAgeChange(level: any, field: 'age_min' | 'age_max', rawValue: any): void {
    const parsed = this.parseNumber(rawValue);
    if (parsed == null) {
      return;
    }

    const levelId = level?.id ?? level?.degree_id;
    if (levelId == null) {
      return;
    }

    // Update level object
    if (field === 'age_min') {
      level.age_min = parsed;
      if (level.age_max != null && parsed > level.age_max) {
        level.age_max = parsed;
      }
    } else {
      level.age_max = parsed;
      if (level.age_min != null && parsed < level.age_min) {
        level.age_min = parsed;
      }
    }

    let updated = false;

    // Update levelGrop in form
    const levelControl = this.courses.courseFormGroup.get('levelGrop');
    if (levelControl) {
      const levels = Array.isArray(levelControl.value) ? [...levelControl.value] : [];
      const idx = levels.findIndex((l: any) => (l?.id ?? l?.degree_id) === levelId);
      if (idx !== -1) {
        levels[idx] = { ...level };
        levelControl.setValue(levels, { emitEvent: false });
        levelControl.markAsDirty();
        updated = true;
      }
    }

    // Also update course_dates directly (similar to updateSubgroupMaxParticipants)
    const courseDatesControl = this.courses.courseFormGroup.get('course_dates');
    const courseDates = Array.isArray(courseDatesControl?.value) ? [...courseDatesControl.value] : [];

    courseDates.forEach((cd: any) => {
      const courseGroups = cd?.course_groups || cd?.courseGroups || [];
      courseGroups.forEach((group: any) => {
        if ((group?.degree_id ?? group?.degreeId) === levelId) {
          group.age_min = level.age_min;
          group.age_max = level.age_max;
          updated = true;
        }
      });
    });

    if (courseDatesControl && updated) {
      courseDatesControl.setValue(courseDates, { emitEvent: false });
      courseDatesControl.markAsDirty();
    }

    // Also update intervalGroupsMap
    if (this.intervalGroupsMap) {
      Object.values(this.intervalGroupsMap).forEach((intervalState: any) => {
        const levelState = intervalState?.[String(levelId)];
        if (levelState) {
          levelState.age_min = level.age_min;
          levelState.age_max = level.age_max;
        }
      });
    }

    if (updated) {
      // NOTE: We don't call syncLevelAndSubgroupConstraints() here because we've already
      // manually updated levelGrop, course_dates, and intervalGroupsMap above.
      // Calling sync would be redundant and might overwrite our changes.
      // Sync will be called on save in endCourse().
      this.cdr.detectChanges();
    }
  }

  isLevelExpanded(level: any): boolean {
    const key = level.id || JSON.stringify(level);
    return this.expandedLevels.has(key);
  }

  isSubgroupExpanded(level: any, subgroupIndex: number): boolean {
    const cacheKey = this.getSubgroupCacheKey(level, subgroupIndex);
    return this.expandedSubgroups.has(cacheKey);
  }

  /**
   * Update age_min or age_max for a specific level in a specific interval.
   * This allows per-interval age configuration in flexible collective courses.
   */
  onIntervalLevelAgeChange(intervalIdx: number, level: any, field: 'age_min' | 'age_max', rawValue: any): void {
    const parsed = this.parseNumber(rawValue);
    if (parsed == null) {
      return;
    }

    const levelId = level?.id ?? level?.degree_id;
    if (levelId == null) {
      return;
    }

    if (!this.intervals || intervalIdx == null || intervalIdx >= this.intervals.length) {
      return;
    }

    const intervalKey = this.resolveIntervalKey(this.intervals[intervalIdx], intervalIdx);
    if (!intervalKey) {
      return;
    }

    // Ensure intervalGroupsMap and interval state exist
    if (!this.intervalGroupsMap) {
      this.intervalGroupsMap = {};
    }
    if (!this.intervalGroupsMap[intervalKey]) {
      this.intervalGroupsMap[intervalKey] = {};
    }

    const intervalState = this.intervalGroupsMap[intervalKey];
    const levelKey = String(levelId);

    // Ensure level state exists in this interval
    if (!intervalState[levelKey]) {
      intervalState[levelKey] = {
        levelId: levelId,
        active: true,
        subgroups: [],
        age_min: level.age_min,
        age_max: level.age_max
      };
    }

    const levelState = intervalState[levelKey];

    // Update the age field with validation
    if (field === 'age_min') {
      levelState.age_min = parsed;
      // Adjust age_max if needed
      if (levelState.age_max != null && parsed > levelState.age_max) {
        levelState.age_max = parsed;
      }
    } else {
      levelState.age_max = parsed;
      // Adjust age_min if needed
      if (levelState.age_min != null && parsed < levelState.age_min) {
        levelState.age_min = parsed;
      }
    }

    // Update course_dates for this specific interval
    const courseDatesControl = this.courses.courseFormGroup.get('course_dates');
    const courseDates = Array.isArray(courseDatesControl?.value) ? [...courseDatesControl.value] : [];

    let updated = false;
    courseDates.forEach((cd: any) => {
      // Only update course_dates that belong to this interval
      const cdIntervalKey = this.getIntervalKeyForDate(cd);
      if (cdIntervalKey === intervalKey) {
        const courseGroups = cd?.course_groups || cd?.courseGroups || [];
        courseGroups.forEach((group: any) => {
          if ((group?.degree_id ?? group?.degreeId) === levelId) {
            group.age_min = levelState.age_min;
            group.age_max = levelState.age_max;
            updated = true;
          }
        });
      }
    });

    if (courseDatesControl && updated) {
      courseDatesControl.setValue(courseDates, { emitEvent: false });
      courseDatesControl.markAsDirty();
    }

    if (updated) {
      this.cdr.detectChanges();
    }
  }

  /**
   * Get the age value (age_min or age_max) for a level in a specific interval as a number.
   * Returns the interval-specific value if available, otherwise falls back to the level's global value.
   */
  getIntervalLevelAgeNumber(intervalIdx: number, level: any, field: 'age_min' | 'age_max'): number | null {
    if (intervalIdx == null || !this.intervalGroupsMap || !this.intervals) {
      return level?.[field] ?? null;
    }

    const levelId = level?.id ?? level?.degree_id;
    if (levelId == null) {
      return level?.[field] ?? null;
    }

    const intervalKey = this.resolveIntervalKey(this.intervals[intervalIdx], intervalIdx);
    const intervalState = this.intervalGroupsMap[intervalKey];
    if (!intervalState) {
      return level?.[field] ?? null;
    }

    const levelState = intervalState[String(levelId)];
    if (!levelState) {
      return level?.[field] ?? null;
    }

    return levelState[field] ?? level?.[field] ?? null;
  }

  /**
   * Get the age value (age_min or age_max) for a level in a specific interval as a string.
   * For use with [value] binding which expects string.
   */
  getIntervalLevelAge(intervalIdx: number, level: any, field: 'age_min' | 'age_max'): string | null {
    const val = this.getIntervalLevelAgeNumber(intervalIdx, level, field);
    return val != null ? String(val) : null;
  }

  private refreshCourseDetailCards(): void {
    if (!this.detailCardsInitialized || !this.detailCards?.length) {
      return;
    }
    this.detailCards.forEach(card => card.refreshCourseDates());
  }

  /**
   * Expande niveles y el primer subgrupo por defecto en modo update
   * para que se renderice disponibilidad sin clics iniciales.
   */
  private autoExpandLevelsForUpdate(): void {
    if (this.mode !== 'update') {
      return;
    }

    const levels = this.courses?.courseFormGroup?.controls?.['levelGrop']?.value || [];

    levels.forEach((level: any) => {
      if (!level?.active) {
        return;
      }

      const levelKey = level.id || JSON.stringify(level);
      this.expandedLevels.add(levelKey);

      const subgroups = this.getAllUniqueSubgroupsForLevel(level);
      subgroups.forEach((subgroup: any) => {
        const subIndex = subgroup?._index ?? 0;
        const subKey = this.buildSubgroupStateKeyFromObject(level, subgroup, subIndex);
        this.expandedSubgroups.add(subKey);
      });
    });
  }

  /**
   * Asegura que detailData.course_dates tenga course_groups/subgrupos, usando courseGroups si viene vacío
   * Necesario para que los resúmenes (vex-course-detail-card/nivel) puedan pintar fechas y subgrupos.
   */
  private ensureCourseDatesFromGroups(detailData: any): void {
    if (!detailData) {
      return;
    }

    const groups = detailData.courseGroups || detailData.course_groups || [];
    const courseDates = Array.isArray(detailData.course_dates) ? detailData.course_dates : [];

    // Mapear subgrupos por course_date_id desde courseGroups.* relations
    const subgroupsByDateId = new Map<any, any[]>();
    const courseGroupsByDateId = new Map<any, any[]>();

    if (Array.isArray(groups)) {
      groups.forEach((group: any) => {
        const courseDatesFromGroup = group?.courseDates || group?.course_dates || [];
        courseDatesFromGroup.forEach((cd: any) => {
          const dateId = cd?.id ?? `${cd?.date ?? ''}-${cd?.hour_start ?? ''}`;
          if (!dateId) {
            return;
          }
          const subgroups = cd?.courseSubgroups || cd?.course_subgroups || [];
          const entry = {
            ...group,
            course_subgroups: subgroups
          };
          if (!courseGroupsByDateId.has(dateId)) {
            courseGroupsByDateId.set(dateId, []);
          }
          courseGroupsByDateId.get(dateId).push(entry);
          if (!subgroupsByDateId.has(dateId)) {
            subgroupsByDateId.set(dateId, []);
          }
          subgroupsByDateId.get(dateId).push(...subgroups);
        });
      });
    }

    // Si ya hay course_groups pero sin subgrupos, completar
    courseDates.forEach((cd: any, idx: number) => {
      const dateId = cd?.id ?? `${cd?.date ?? ''}-${cd?.hour_start ?? ''}`;
      const existingGroups = Array.isArray(cd?.course_groups) ? cd.course_groups : [];
      const hasSubgroups = existingGroups.some((g: any) => Array.isArray(g?.course_subgroups) && g.course_subgroups.length);
      if (hasSubgroups) {
        return;
      }
      const replacementGroups = courseGroupsByDateId.get(dateId);
      if (replacementGroups && replacementGroups.length) {
        courseDates[idx] = {
          ...cd,
          course_groups: replacementGroups
        };
      }
    });

    // Si no había course_dates con groups, reconstruir desde courseGroups
    const hasCourseGroupsInDates =
      courseDates.length &&
      courseDates.some((cd: any) => Array.isArray(cd?.course_groups) && cd.course_groups.length);

    if (!hasCourseGroupsInDates && courseGroupsByDateId.size > 0) {
      detailData.course_dates = Array.from(courseGroupsByDateId.entries()).map(([_, groupsForDate]) => {
        const sample = groupsForDate[0]?.courseDates?.[0] || groupsForDate[0]?.course_dates?.[0] || {};
        return {
          ...sample,
          course_groups: groupsForDate
        };
      });
    } else {
      detailData.course_dates = courseDates;
    }
  }

  private buildLevelCacheId(level: any): string {
    const candidate = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (candidate != null) {
      return String(candidate);
    }
    if (level && typeof level === 'object') {
      try {
        return JSON.stringify(level);
      } catch {
        return 'level-unknown';
      }
    }
    return String(level ?? 'level-unknown');
  }

  private getSubgroupKeyForLevel(level: any, subgroupIndex: number): string | null {
    const uniqueSubgroups = this.getAllUniqueSubgroupsForLevel(level);
    const subgroup = uniqueSubgroups?.[subgroupIndex];
    if (!subgroup) {
      return null;
    }
    const fallbackLevelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    return this.ensureSubgroupKey(subgroup, fallbackLevelId);
  }

  private getSubgroupCacheKey(level: any, subgroupIndex: number): string {
    const levelId = this.buildLevelCacheId(level);
    const subgroupKey = this.getSubgroupKeyForLevel(level, subgroupIndex) ?? `idx-${subgroupIndex}`;
    return `${levelId}_${subgroupKey}`;
  }

  private buildSubgroupIntervalMapKey(level: any, subgroupIndex: number): string {
    const levelId = this.buildLevelCacheId(level);
    const subgroupKey = this.getSubgroupKeyForLevel(level, subgroupIndex) ?? `idx-${subgroupIndex}`;
    return `${levelId}_${subgroupKey}`;
  }

  private buildSubgroupStateKeyFromObject(level: any, subgroup: any, fallbackIndex?: number): string {
    const levelId = this.buildLevelCacheId(level);
    const fallbackLevelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    const subgroupKey = this.ensureSubgroupKey(subgroup, fallbackLevelId);
    const normalizedKey = subgroupKey || `idx-${fallbackIndex ?? 0}`;
    return `${levelId}_${normalizedKey}`;
  }

  private ensureSubgroupKey(subgroup: any, fallbackLevelId?: string | number): string {
    if (!subgroup || typeof subgroup !== 'object') {
      return '';
    }

    const subgroupDatesId = subgroup.subgroup_dates_id ?? subgroup.subgroupDatesId;
    const candidateId = subgroup.id ?? subgroup.course_subgroup_id ?? subgroup.subgroup_id;
    let key: string;
    if (subgroupDatesId != null && String(subgroupDatesId).trim()) {
      key = `sgd-${String(subgroupDatesId).trim()}`;
      if (subgroup.key !== key) {
        subgroup.key = key;
      }
      return subgroup.key;
    }

    if (typeof subgroup.key === 'string' && subgroup.key.trim()) {
      return subgroup.key;
    } else if (candidateId != null && String(candidateId).trim()) {
      key = `sg-${String(candidateId).trim()}`;
    } else {
      const levelId = fallbackLevelId ?? subgroup.degree_id ?? subgroup.degreeId ?? 'unknown';
      key = `cfg-${levelId}-${Date.now()}-${this.intervalSubgroupKeySeed++}`;
    }

    subgroup.key = key;
    return key;
  }

  private assignSubgroupKeysInCourseDates(courseDates: any[] | undefined): void {
    if (!Array.isArray(courseDates)) {
      return;
    }

    courseDates.forEach((date: any) => {
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.degreeId;
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any) => this.ensureSubgroupKey(subgroup, levelId));
      });

      const rawDateSubgroups = Array.isArray(date?.course_subgroups) ? date.course_subgroups : [];
      rawDateSubgroups.forEach((subgroup: any) => {
        const levelId = subgroup?.degree_id ?? subgroup?.degreeId;
        this.ensureSubgroupKey(subgroup, levelId);
      });
    });
  }

  private cloneSubgroupUsers(list: any[] | undefined): any[] {
    if (!Array.isArray(list) || !list.length) {
      return [];
    }
    return list.map(user => ({ ...user }));
  }

  private buildCourseDateLookupKey(date: any): string {
    const dateId = date?.id ?? date?.course_date_id ?? date?.courseDateId;
    if (dateId != null && String(dateId).trim()) {
      return `id-${String(dateId).trim()}`;
    }
    const normalizedDate = this.normalizeCourseDateKey(date as CourseDate);
    const intervalId = this.normalizeIntervalIdentifier(
      date?.interval_id ?? date?.intervalId ?? date?.course_interval_id ?? date?.courseIntervalId
    );
    return `val-${normalizedDate}-${intervalId}`;
  }

  private buildSubgroupIdLookup(courseDates: any[]): Map<string, { id?: any }> {
    const lookup = new Map<string, { id?: any }>();

    courseDates.forEach((date: any) => {
      const dateKey = this.buildCourseDateLookupKey(date);
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.degreeId;
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any) => {
          const key = subgroup?.key ?? this.ensureSubgroupKey(subgroup, levelId);
          const subgroupId = subgroup?.id ?? subgroup?.course_subgroup_id ?? subgroup?.subgroup_id;
          if (!key || subgroupId == null) {
            return;
          }
          const lookupKey = `${dateKey}|${key}`;
          lookup.set(lookupKey, { id: subgroupId });
        });
      });
    });

    return lookup;
  }

  private buildSubgroupIdIndexLookup(courseDates: any[]): Map<string, { id?: any }> {
    const lookup = new Map<string, { id?: any }>();

    courseDates.forEach((date: any) => {
      const intervalKey = this.normalizeIntervalIdentifier(
        date?.interval_id ?? date?.intervalId ?? date?.course_interval_id ?? date?.courseIntervalId
      );
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.degreeId;
        if (levelId == null) {
          return;
        }
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any, index: number) => {
          const subgroupId = subgroup?.id ?? subgroup?.course_subgroup_id ?? subgroup?.subgroup_id;
          if (subgroupId == null) {
            return;
          }
          const key = `${intervalKey}|${levelId}|idx-${index}`;
          lookup.set(key, { id: subgroupId });
        });
      });
    });

    return lookup;
  }

  private buildSubgroupDatesIdLookup(courseDates: any[]): Map<string, string> {
    const lookup = new Map<string, string>();

    courseDates.forEach((date: any) => {
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any) => {
          const subgroupId = subgroup?.id ?? subgroup?.course_subgroup_id ?? subgroup?.subgroup_id;
          const subgroupDatesId = subgroup?.subgroup_dates_id ?? subgroup?.subgroupDatesId;
          if (subgroupId == null || subgroupDatesId == null) {
            return;
          }
          const key = String(subgroupId).trim();
          const value = String(subgroupDatesId).trim();
          if (!key || !value) {
            return;
          }
          lookup.set(key, value);
        });
      });
    });

    return lookup;
  }
  private buildSubgroupDatesIdIndexLookup(courseDates: any[]): Map<string, string> {
    const lookup = new Map<string, string>();

    courseDates.forEach((date: any) => {
      const intervalKey = this.normalizeIntervalIdentifier(
        date?.interval_id ?? date?.intervalId ?? date?.course_interval_id ?? date?.courseIntervalId
      );
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.degreeId;
        if (levelId == null) {
          return;
        }
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any, index: number) => {
          const subgroupDatesId = subgroup?.subgroup_dates_id ?? subgroup?.subgroupDatesId;
          if (!subgroupDatesId) {
            return;
          }
          const key = `${intervalKey}|${levelId}|idx-${index}`;
          if (!lookup.has(key)) {
            lookup.set(key, String(subgroupDatesId));
          }
        });
      });
    });

    return lookup;
  }

  private hydrateIntervalGroupsFromCourseDates(groupsMap: Record<string, IntervalGroupsState> | null): void {
    if (!groupsMap) {
      return;
    }
    const courseDates = this.courses.courseFormGroup?.get('course_dates')?.value || [];
    if (!Array.isArray(courseDates) || courseDates.length === 0) {
      return;
    }
    const datesIdLookup = this.buildSubgroupDatesIdLookup(courseDates);
    const datesIndexLookup = this.buildSubgroupDatesIdIndexLookup(courseDates);

    Object.entries(groupsMap).forEach(([intervalKey, intervalState]) => {
      const normalizedIntervalKey = this.normalizeIntervalIdentifier(intervalKey);
      Object.values(intervalState || {}).forEach((levelState: IntervalGroupState) => {
        const subgroups = Array.isArray(levelState?.subgroups) ? levelState.subgroups : [];
        const fallbackLevelId = subgroups[0]?.degree_id;
        const levelId = levelState?.levelId ?? fallbackLevelId;
        subgroups.forEach((subgroup: any, index: number) => {
          if (!subgroup || typeof subgroup !== 'object') {
            return;
          }
          if (subgroup?.subgroup_dates_id == null && subgroup?.subgroupDatesId == null) {
            const subgroupId = subgroup?.id ?? subgroup?.course_subgroup_id ?? subgroup?.subgroup_id;
            if (subgroupId != null) {
              const match = datesIdLookup.get(String(subgroupId));
              if (match) {
                subgroup.subgroup_dates_id = match;
              }
            }
            if (!subgroup?.subgroup_dates_id && levelId != null) {
              const indexKey = `${normalizedIntervalKey}|${levelId}|idx-${index}`;
              const indexMatch = datesIndexLookup.get(indexKey);
              if (indexMatch) {
                subgroup.subgroup_dates_id = indexMatch;
              }
            }
          }
          this.ensureSubgroupKey(subgroup, levelId);
        });
      });
    });
  }

  private applySubgroupIdLookupToCourseDates(
    courseDates: any[],
    lookup: Map<string, { id?: any }>,
    indexLookup: Map<string, { id?: any }>
  ): void {
    if (!Array.isArray(courseDates)) {
      return;
    }

    courseDates.forEach((date: any) => {
      const intervalKey = this.normalizeIntervalIdentifier(
        date?.interval_id ?? date?.intervalId ?? date?.course_interval_id ?? date?.courseIntervalId
      );
      const dateKey = this.buildCourseDateLookupKey(date);
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.degreeId;
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any, index: number) => {
          const key = subgroup?.key ?? this.ensureSubgroupKey(subgroup, levelId);
          if (key) {
            const lookupKey = `${dateKey}|${key}`;
            const match = lookup.get(lookupKey);
            if (match?.id != null && subgroup?.id !== match.id) {
              subgroup.id = match.id;
              return;
            }
          }
          if (levelId != null) {
            const indexKey = `${intervalKey}|${levelId}|idx-${index}`;
            const indexMatch = indexLookup.get(indexKey);
            if (indexMatch?.id != null && subgroup?.id !== indexMatch.id) {
              subgroup.id = indexMatch.id;
            }
          }
        });
      });
    });
  }

  private validateSubgroupPayloadIntegrity(courseDates: any[]): { valid: boolean; message?: string } {
    if (!Array.isArray(courseDates)) {
      return { valid: true };
    }

    let missingDatesIdCount = 0;
    let missingIdWithBookingsCount = 0;

    courseDates.forEach((date: any) => {
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any) => {
          const subgroupDatesId = subgroup?.subgroup_dates_id ?? subgroup?.subgroupDatesId;
          if (!subgroupDatesId) {
            missingDatesIdCount += 1;
          }
          const hasBookings = Array.isArray(subgroup?.booking_users_active)
            ? subgroup.booking_users_active.length > 0
            : Array.isArray(subgroup?.booking_users)
              ? subgroup.booking_users.length > 0
              : false;
          if (hasBookings && subgroup?.id == null) {
            missingIdWithBookingsCount += 1;
          }
        });
      });
    });

    if (missingDatesIdCount > 0) {
      return {
        valid: false,
        message: 'Faltan subgroup_dates_id en algunos subgrupos. Recarga la p\u00e1gina e int\u00e9ntalo de nuevo.'
      };
    }

    if (missingIdWithBookingsCount > 0) {
      return {
        valid: false,
        message: 'Faltan IDs de subgrupo en subgrupos con alumnos. Refresca y vuelve a intentarlo.'
      };
    }

    return { valid: true };
  }

  private buildSubgroupBookingLookup(courseDates: any[]): Map<string, { booking_users: any[], booking_users_active: any[], booking_users_confirmed?: any[] }> {
    const lookup = new Map<string, { booking_users: any[], booking_users_active: any[], booking_users_confirmed?: any[] }>();
    courseDates.forEach((date: any) => {
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.degreeId;
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any) => {
          const key = subgroup?.key ?? this.ensureSubgroupKey(subgroup, levelId);
          if (!key) {
            return;
          }
          const bookingData = {
            booking_users: this.cloneSubgroupUsers(subgroup.booking_users_active || subgroup.booking_users || subgroup.bookingUsersActive || subgroup.bookingUsers),
            booking_users_active: this.cloneSubgroupUsers(subgroup.booking_users_active || subgroup.booking_users || subgroup.bookingUsersActive || subgroup.bookingUsers),
            booking_users_confirmed: this.cloneSubgroupUsers(subgroup.booking_users_confirmed || subgroup.bookingUsersConfirmed)
          };
          lookup.set(key, bookingData);
        });
      });

      const fallbackSubgroups = Array.isArray(date?.course_subgroups) ? date.course_subgroups : [];
      fallbackSubgroups.forEach((subgroup: any) => {
        const levelId = subgroup?.degree_id ?? subgroup?.degreeId;
        const key = subgroup?.key ?? this.ensureSubgroupKey(subgroup, levelId);
        if (!key) {
          return;
        }
        const bookingData = {
          booking_users: this.cloneSubgroupUsers(subgroup.booking_users_active || subgroup.booking_users || subgroup.bookingUsersActive || subgroup.bookingUsers),
          booking_users_active: this.cloneSubgroupUsers(subgroup.booking_users_active || subgroup.booking_users || subgroup.bookingUsersActive || subgroup.bookingUsers),
          booking_users_confirmed: this.cloneSubgroupUsers(subgroup.booking_users_confirmed || subgroup.bookingUsersConfirmed)
        };
        lookup.set(key, bookingData);
      });
    });
    return lookup;
  }

  private applyBookingLookupToCourseDates(courseDates: any[], lookup: Map<string, { booking_users: any[], booking_users_active: any[], booking_users_confirmed?: any[] }>): void {
    if (!Array.isArray(courseDates)) {
      return;
    }

    courseDates.forEach((date: any) => {
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      groups.forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.degreeId;
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        subgroups.forEach((subgroup: any) => {
          const key = subgroup?.key ?? this.ensureSubgroupKey(subgroup, levelId);
          if (!key) {
            return;
          }
          const bookingData = lookup.get(key);
          if (bookingData) {
            subgroup.booking_users = this.cloneSubgroupUsers(bookingData.booking_users);
            subgroup.booking_users_active = this.cloneSubgroupUsers(bookingData.booking_users_active);
            if (bookingData.booking_users_confirmed) {
              subgroup.booking_users_confirmed = this.cloneSubgroupUsers(bookingData.booking_users_confirmed);
            }
          }
        });
      });

      const fallbackSubgroups = Array.isArray(date?.course_subgroups) ? date.course_subgroups : [];
      fallbackSubgroups.forEach((subgroup: any) => {
        const levelId = subgroup?.degree_id ?? subgroup?.degreeId;
        const key = subgroup?.key ?? this.ensureSubgroupKey(subgroup, levelId);
        if (!key) {
          return;
        }
        const bookingData = lookup.get(key);
        if (bookingData) {
          subgroup.booking_users = this.cloneSubgroupUsers(bookingData.booking_users);
          subgroup.booking_users_active = this.cloneSubgroupUsers(bookingData.booking_users_active);
          if (bookingData.booking_users_confirmed) {
            subgroup.booking_users_confirmed = this.cloneSubgroupUsers(bookingData.booking_users_confirmed);
          }
        }
      });
    });
  }

  setEditFunction(functionName: string, ...args: any[]) {
    this.editFunctionName = functionName;
    this.editFunctionArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  }

  executeEditFunction() {
    if (this.editFunctionName && typeof this[this.editFunctionName] === 'function') {
      // If we're invoking the course save, keep the modal open so the loader is visible
      if (this.editFunctionName === 'endCourse') {
        const result = (this as any)[this.editFunctionName](...this.editFunctionArgs);
        if (result instanceof Promise) {
          result.catch((err: any) => console.error(err));
        }
        return;
      }

      const result = (this as any)[this.editFunctionName](...this.editFunctionArgs);
      if (result instanceof Promise) {
        result.catch((err: any) => console.error(err));
      }
    }
    this.editModal = false;
  }

  translateExpandedIndex: number = 0
  user: any;
  id: any = null;
  // Array simple para intervalos
  intervals: any[];
  // Mapa de intervalos por nivel y subgrupo: "levelId_subgroupIndex" -> intervals[]
  subgroupIntervalsMap: Map<string, any[]> = new Map();
  useMultipleIntervals = false;
  mustBeConsecutive = false;
  mustStartFromFirst = false;

  // Configuración de niveles por intervalo
  configureLevelsByInterval = false;
  intervalGroupsMap: Record<string, IntervalGroupsState> = {};
  intervalGroups: IntervalGroupsState[] = [];
  selectedIntervalIndexForGroups = 0;
  selectedIntervalKeyForGroups: string | null = null;
  selectedIntervalTabIndex = 0; // Para las pestañas en la sección de detalles

  // Caché para optimizar las funciones de subgrupos
  private _uniqueSubgroupsCache = new Map<string, any[]>();
  private _subgroupDatesCache = new Map<string, any[]>();
  private _intervalsForSubgroupCache = new Map<string, any[]>();
  previewSubgroupCache: Record<string, any[]> = {};
  private _lastCourseDatesLength = 0;
  private _isRecalculatingSubgroups = false;
  private buildUniqueSubgroupsFromCourseDates(level: any, courseDates: any[]): any[] {
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (levelId == null) {
      return [];
    }

    const subgroupCounts = courseDates.map((cd: any) => {
      if (this.configureLevelsByInterval) {
        const courseGroups = cd?.course_groups || cd?.courseGroups || [];
        let group = null;
        if (Array.isArray(courseGroups)) {
          group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
        } else {
          for (const g of Object.values(courseGroups || {})) {
            if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
              group = g;
              break;
            }
          }
        }
        return (group?.course_subgroups || group?.courseSubgroups || []).length;
      }
      const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
      const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
        (sg?.degree_id ?? sg?.degreeId) === levelId
      );
      if (dateLevelSubgroups.length > 0) {
        return dateLevelSubgroups.length;
      }
      const courseGroups = cd?.course_groups || cd?.courseGroups || [];
      let group = null;
      if (Array.isArray(courseGroups)) {
        group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
      } else {
        for (const g of Object.values(courseGroups || {})) {
          if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
            group = g;
            break;
          }
        }
      }
      return (group?.course_subgroups || group?.courseSubgroups || []).length;
    });

    const maxSubgroupsCount = Math.max(...subgroupCounts, 0);
    const uniqueSubgroups: any[] = [];

    for (let i = 0; i < maxSubgroupsCount; i++) {
      for (const cd of courseDates) {
        if (this.configureLevelsByInterval) {
          const courseGroups = cd?.course_groups || cd?.courseGroups || [];
          let group = null;
          if (Array.isArray(courseGroups)) {
            group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
          } else {
            for (const g of Object.values(courseGroups || {})) {
              if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
                group = g;
                break;
              }
            }
          }
          const subgroup = (group?.course_subgroups || group?.courseSubgroups || [])[i];
          if (subgroup) {
            this.ensureSubgroupKey(subgroup, levelId);
            uniqueSubgroups.push({
              ...subgroup,
              _index: i,
              _level: level
            });
            break;
          }
        } else {
          const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
          const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
            (sg?.degree_id ?? sg?.degreeId) === levelId
          );
          if (dateLevelSubgroups[i]) {
            this.ensureSubgroupKey(dateLevelSubgroups[i], levelId);
            uniqueSubgroups.push({
              ...dateLevelSubgroups[i],
              _index: i,
              _level: level
            });
            break;
          }
          const courseGroups = cd?.course_groups || cd?.courseGroups || [];
          let group = null;
          if (Array.isArray(courseGroups)) {
            group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
          } else {
            for (const g of Object.values(courseGroups || {})) {
              if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
                group = g;
                break;
              }
            }
          }
          const subgroup = (group?.course_subgroups || group?.courseSubgroups || [])[i];
          if (subgroup) {
            this.ensureSubgroupKey(subgroup, levelId);
            uniqueSubgroups.push({
              ...subgroup,
              _index: i,
              _level: level
            });
            break;
          }
        }
      }
    }

    return uniqueSubgroups;
  }

  private getSubgroupsFromIntervalMap(levelId: number | string): any[] {
    const levelKey = String(levelId);
    const uniqueSubgroups: any[] = [];
    const seenKeys = new Set<string>();

    const intervals = Array.isArray(this.intervals) ? this.intervals : [];
    const intervalKeys = intervals.map((interval, idx) => this.resolveIntervalKey(interval, idx));
    const orderedStates = intervalKeys.length
      ? intervalKeys.map(key => this.intervalGroupsMap?.[key]).filter(Boolean)
      : Object.values(this.intervalGroupsMap || {});

    orderedStates.forEach(intervalState => {
      const levelState = intervalState?.[levelKey];
      if (!levelState?.subgroups?.length) {
        return;
      }
      levelState.subgroups.forEach((subgroup) => {
        const subgroupKey = this.ensureSubgroupKey(subgroup, levelId);
        if (!subgroupKey || seenKeys.has(subgroupKey)) {
          return;
        }
        uniqueSubgroups.push({
          ...subgroup,
          _level: levelId,
          _index: uniqueSubgroups.length
        });
        seenKeys.add(subgroupKey);
      });
    });

    return uniqueSubgroups;
  }
  selectedIntervalFilterIndex = 0; // 0 = all intervals, 1+ = specific interval (index - 1)
  private intervalSubgroupKeySeed = 0;
  // Slot map to keep subgroup_dates_id stable across dates/intervals per level/subgroup index
  private subgroupDatesIdSlotMap = new Map<string, string>();

  // SISTEMA DE DEBUG LOGS DESHABILITADO PARA REDUCIR CONSUMO DE MEMORIA
  // Buffer de logs consumía ~500MB-1GB en memoria + localStorage
  // Métodos convertidos a NO-OP para prevenir errores runtime (8 llamadas + window refs)

  private debugLog(event: string, payload?: any): void {
    // NO-OP: Disabled to save memory (~500MB-1GB). Previously logged events to buffer.
    return;
  }

  private exportDebugLogsToFile(): void {
    // NO-OP: Disabled to save memory. Previously exported logs to JSON file.
    return;
  }

  private pushDebugLogsToBackend(): void {
    // NO-OP: Disabled to save memory. Previously sent logs to backend API.
    return;
  }

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
  private readonly weekDayKeys: Array<keyof WeekDaysState> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Discount system properties
  enableMultiDateDiscounts = false;
  discountsByDates: any[] = [];
  enableIntervalDiscounts = false; // Para habilitar descuentos específicos por intervalo

  // Flag to prevent sync during bulk schedule application
  private _applyingBulkSchedule = false;

  // Date selection method properties (global fallback)
  weeklyPattern: WeekDaysState = this.defaultWeekDays();
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

  private normalizeIntervalIdentifier(value: any): string {
    if (value === undefined || value === null) {
      return '__null__';
    }
    const raw = typeof value === 'object' && value !== null && 'id' in value
      ? (value as any).id
      : value;
    const normalized = String(raw).trim();
    return normalized === '' ? '__null__' : normalized;
  }

  private resolveIntervalIndexFromValue(value: any): number {
    if (!Array.isArray(this.intervals)) {
      return -1;
    }

    if (typeof value === 'number' && value >= 0 && value < this.intervals.length) {
      return value;
    }

    const targetId = this.normalizeIntervalIdentifier(value);
    return this.intervals.findIndex((interval: any, idx: number) => {
      const currentId = this.normalizeIntervalIdentifier(
        interval?.id ?? interval?.interval_id ?? interval?.tempId ?? interval?.key ?? idx
      );
      return currentId === targetId;
    });
  }

  private upsertSingleIntervalDates(dates: CourseDate[]): CourseDate[] {
    // PROTECCI+ôN: No ejecutar durante aplicaci+¦n de horario masivo
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

    // CRITICAL FIX: Preserve booking_users array to fix students not appearing in Step 3
    // When intervalGroupsMap is rebuilt from course_dates, we must retain the booking_users
    // that were loaded via API (nested in course_dates > course_groups > course_subgroups)
    const bookingUsers = Array.isArray(subgroup?.booking_users)
      ? [...subgroup.booking_users]  // Deep copy the array
      : [];

    return {
      id: subgroupId ?? subgroup?.subgroup_id ?? undefined,
      degree_id: subgroup?.degree_id ?? levelId,
      max_participants: subgroup?.max_participants ?? undefined,
      active: subgroup?.active !== false,
      monitor: subgroup?.monitor ?? undefined,
      monitor_id: subgroup?.monitor_id ?? undefined,
      booking_users: bookingUsers,  // Preserve booking_users here
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
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    const subgroupsSource = Array.isArray(level?.course_subgroups)
      ? level.course_subgroups
      : Array.isArray(level?.subgroups)
        ? level.subgroups
        : [];

    const subgroups = subgroupsSource.map((subgroup: any, index: number) =>
      this.createSubgroupState(subgroup, levelId, index)
    );

    // IMPORTANTE: En modo configureLevelsByInterval, NO crear subgrupos por defecto
    // El usuario debe crearlos explícitamente con "Agregar Subgrupo"
    // En modo simple (no configureLevelsByInterval), crear un subgrupo por defecto para que no quede vacío
    if (subgroups.length === 0 && !this.configureLevelsByInterval) {
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
      subgroups: (state.subgroups || []).map(subgroup => this.cloneSubgroupForCopy(subgroup))
    };
  }

  private cloneSubgroupForCopy(subgroup: IntervalSubgroupState): IntervalSubgroupState {
    return {
      ...subgroup,
      booking_users: [],
      booking_users_active: []
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
    // Si ya hay subgrupos configurados (existing), priorizarlos completamente
    if (Array.isArray(existing) && existing.length > 0) {
      return existing.map(subgroup => ({ ...subgroup }));
    }

    const result: IntervalSubgroupState[] = [];
    (base || []).forEach(baseSubgroup => {
      result.push({ ...baseSubgroup });
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
      // Si ya tenemos grupos desde course_dates, evitar añadir niveles extra que no existan en esas fechas
      return template;
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

    // En modo configureLevelsByInterval, NO crear estados por defecto desde template
    // Solo incluir los intervalos que tienen un estado explícito
    if (this.configureLevelsByInterval) {
      this.intervalGroups = intervals
        .map((interval, index) => {
          const key = this.resolveIntervalKey(interval, index);
          return this.intervalGroupsMap?.[key];
        })
        .filter(state => state != null); // Solo incluir intervalos con estado explícito
    } else {
      // En modo simple, crear estados por defecto desde template
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
    // IMPORTANTE: NO usar baseGroup para subgrupos cuando configuramos por intervalos
    // porque causaría acumulación (los course_dates ya tienen subgrupos de sincronizaciones previas)
    // Solo usamos baseGroup para obtener IDs de subgrupos existentes si están en modo update


    const baseMap = new Map<string, any>();

    // Solo crear el mapa base si tenemos subgrupos con ID (modo update)
    if (this.mode === 'update' && baseGroup) {
      const baseSubgroups = Array.isArray(baseGroup?.course_subgroups)
        ? baseGroup.course_subgroups
        : Array.isArray(baseGroup?.subgroups)
          ? baseGroup.subgroups
          : [];

      baseSubgroups.forEach((subgroup: any) => {
        if (subgroup?.id != null) {
          const key = `id-${subgroup.id}`;
          baseMap.set(key, subgroup);
        }
      });
    }

    const configuredSubgroups: any[] = [];

    // Construir subgrupos SOLO desde el mapa de configuración
    (config.subgroups || []).forEach((subgroupConfig, index) => {
      if (subgroupConfig?.active === false) {
        return;
      }

      const subgroupKey = this.ensureSubgroupKey(subgroupConfig, config.levelId ?? levelId);
      // Solo buscar en base si tiene ID (para preservar IDs en update)
      const base = subgroupConfig?.id != null ? baseMap.get(`id-${subgroupConfig.id}`) : null;

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
      if (base?.id != null) {
        merged.id = base.id;
      }
      if (subgroupKey) {
        merged.key = subgroupKey;
      }

      const isNew = subgroupConfig?.id == null; // nuevo: sin id numérico
      if (isNew) {
        merged.booking_users = [];
        merged.booking_users_active = [];
        // opcional si existe en tu modelo:
        merged.booking_users_confirmed = [];
      }

      configuredSubgroups.push(merged);
    });


    // En modo por intervalos, NO crear subgrupos por defecto
    // El usuario debe hacerlo explícitamente con "Agregar Subgrupo"
    // Esto evita la creación automática de subgrupos no deseados

    return configuredSubgroups;
  }

  private buildCourseGroupsForInterval(interval: any, intervalIndex: number): any[] {
    const useIntervalGroups = this.configureLevelsByInterval;

    if (!useIntervalGroups) {
      // Modo simple: usar TODOS los niveles activos de levelGrop
      const baseGroups = this.getCourseDateGroups();
      return this.cloneCourseGroups(baseGroups);
    }

    // Modo por intervalos: usar SOLO los grupos activos en ese intervalo específico
    const key = this.resolveIntervalKey(interval, intervalIndex);
    const intervalConfig = this.intervalGroupsMap?.[key];

    if (!intervalConfig) {
      return [];
    }

    const result: any[] = [];
    const levelGrop = this.courses.courseFormGroup?.get('levelGrop')?.value || [];
    const levelGropMap = new Map<string, any>();

    // Crear mapa de levelGrop para obtener datos completos del nivel
    levelGrop.forEach((level: any) => {
      levelGropMap.set(String(level?.id ?? level?.degree_id), level);
    });

    // Iterar sobre intervalConfig y SOLO incluir los grupos activos en este intervalo
    Object.keys(intervalConfig).forEach(levelKey => {
      const config = intervalConfig[levelKey];

      // IMPORTANTE: Solo incluir si está activo en este intervalo específico
      if (!config || config.active === false) {
        return;
      }

      // Obtener datos del nivel desde levelGrop
      const levelData = levelGropMap.get(levelKey);
      if (!levelData) {
        return;
      }

      const subgroups = this.buildCourseSubgroupsForInterval(levelKey, config, null);

      const levelId = levelData?.id ?? levelData?.degree_id;
      const groupClone: any = {
        degree_id: levelId,
        id: levelId,
        course_id: this.mode === 'update'
          ? (this.courses.courseFormGroup?.controls?.['id']?.value ?? this.id ?? null)
          : undefined,
        annotation: levelData.annotation,
        level: levelData.level,
        color: levelData.color,
        icon: levelData.icon,
        // Use age values from intervalConfig (intervalGroupsMap) if available, otherwise fallback to levelData
        age_min: config.age_min ?? levelData.age_min,
        age_max: config.age_max ?? levelData.age_max,
        max_participants: config.max_participants ?? levelData.max_participants ?? undefined,
        course_subgroups: subgroups.map(subgroup => ({ ...subgroup }))
      };

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
      this.hydrateIntervalGroupsFromCourseDates(groupsMap);
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
    const shouldLogStudents = this.studentDebugMode;
    const courseDatesSummary = shouldLogStudents
      ? courseDates.map((courseDate: any, index: number) => {
        let groupsForSummary = courseDate?.course_groups || courseDate?.groups || [];
        if (!Array.isArray(groupsForSummary)) {
          groupsForSummary = Object.values(groupsForSummary || {});
        }
        const normalizedGroups = Array.isArray(groupsForSummary) ? groupsForSummary : [];
        return {
          index,
          date: courseDate?.date ?? null,
          intervalId: courseDate?.interval_id ?? null,
          groups: normalizedGroups.map((group: any) => {
            const groupSubgroups = Array.isArray(group?.course_subgroups)
              ? group.course_subgroups
              : Array.isArray(group?.subgroups)
                ? group.subgroups
                : [];
            return {
              levelId: group?.degree_id ?? group?.id ?? null,
              subgroups: this.summarizeSubgroupsForLog(groupSubgroups)
            };
          })
        };
      })
      : null;

    // FIX #489: En lugar de fusionar subgrupos de múltiples fechas (causando acumulación),
    // encontrar la fecha con más subgrupos para cada nivel en cada intervalo
    const maxSubgroupsPerIntervalLevel: Record<string, Record<string, any>> = {};

    (courseDates || []).forEach((courseDate: any) => {
      const intervalId = courseDate?.interval_id != null
        ? String(courseDate.interval_id)
        : '0';

      if (!maxSubgroupsPerIntervalLevel[intervalId]) {
        maxSubgroupsPerIntervalLevel[intervalId] = {};
      }

      // Manejar tanto Array como Object (Map) para course_groups
      let dateGroups = courseDate?.course_groups || courseDate?.groups || [];
      if (!Array.isArray(dateGroups)) {
        dateGroups = Object.values(dateGroups);
      }
      (dateGroups || []).forEach((group: any) => {
        const levelId = group?.degree_id ?? group?.id;
        if (levelId == null) {
          return;
        }
        const levelKey = String(levelId);
        const currentSubgroups = Array.isArray(group?.course_subgroups)
          ? group.course_subgroups
          : Array.isArray(group?.subgroups)
            ? group.subgroups
            : [];

        // Tomar el grupo con MÁS subgrupos, no fusionarlos
        const existingGroup = maxSubgroupsPerIntervalLevel[intervalId][levelKey];
        const existingSubgroupsCount = existingGroup?.course_subgroups?.length || 0;

        if (!existingGroup || currentSubgroups.length > existingSubgroupsCount) {
          maxSubgroupsPerIntervalLevel[intervalId][levelKey] = group;
        }
      });
    });

    // Ahora construir el grouped usando los grupos con máximo número de subgrupos
    Object.keys(maxSubgroupsPerIntervalLevel).forEach(intervalId => {
      if (!grouped[intervalId]) {
        grouped[intervalId] = this.mergeGroupStates(template);
        Object.keys(grouped[intervalId]).forEach(levelKey => {
          const levelState = grouped[intervalId][levelKey];
          if (levelState) {
            levelState.active = false;
            levelState.subgroups = (levelState.subgroups || []).map(subgroup => ({
              ...subgroup,
              active: subgroup?.active === true
            }));
          }
        });
      }

      Object.keys(maxSubgroupsPerIntervalLevel[intervalId]).forEach(levelKey => {
        const group = maxSubgroupsPerIntervalLevel[intervalId][levelKey];
        const fromGroup = this.createGroupStateFromGroup(group);
        grouped[intervalId][levelKey] = {
          levelId: fromGroup.levelId,
          active: true,
          max_participants: fromGroup.max_participants,
          age_min: group?.age_min,
          age_max: group?.age_max,
          subgroups: fromGroup.subgroups  // NO fusionar, solo usar el grupo con más subgrupos
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

    if (shouldLogStudents) {
      if (courseDatesSummary) {
        this.logStudentDebug('course-dates:snapshot', courseDatesSummary);
      }
      const intervalSummary = Object.entries(result).map(([intervalKey, levelState]) => ({
        intervalKey,
        levels: Object.entries(levelState || {}).map(([levelKey, state]) => ({
          levelId: levelKey,
          active: state?.active !== false,
          subgroups: this.summarizeSubgroupsForLog(state?.subgroups || [])
        }))
      }));
      this.logStudentDebug('interval-map:rebuilt', intervalSummary);
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
      const group = this.find(cd.course_groups, 'degree_id', (level?.id ?? level?.degree_id));
      return group && group.course_subgroups && group.course_subgroups.length > 0;
    });
  }

  // Obtener los course_groups de un nivel para un intervalo específico
  getGroupsForInterval(level: any, intervalIndex: number): any[] {
    const courseDates = this.getCourseDatesForInterval(intervalIndex);
    const allGroups: any[] = [];

    courseDates.forEach(cd => {
      if (cd.course_groups) {
        const group = this.find(cd.course_groups, 'degree_id', (level?.id ?? level?.degree_id));
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
    /*    if (this.allSubgroupsCache.has(level.id)) {
          return this.allSubgroupsCache.get(level.id)!;
        }*/

    const courseDates = this.courses?.courseFormGroup?.controls['course_dates']?.value || [];
    const subgroupsByIndex = new Map<number, any>();

    // Recorrer todas las fechas para encontrar el número máximo de subgrupos
    courseDates.forEach((courseDate: any) => {
      if (courseDate.course_groups) {
        const levelGroup = this.find(courseDate.course_groups, 'degree_id', (level?.id ?? level?.degree_id));
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
        const levelGroup = this.find(courseDate.course_groups, 'degree_id', (level?.id ?? level?.degree_id));
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
        // course_groups puede ser un objeto/map, convertir a array si es necesario
        const groupsArray = Array.isArray(courseDate.course_groups)
          ? courseDate.course_groups
          : Object.values(courseDate.course_groups);

        const levelGroup = groupsArray.find((g: any) => g && g.degree_id === (level?.id ?? level?.degree_id));
        if (levelGroup) {
          this.groupForLevelCache.set((level?.id ?? level?.degree_id), levelGroup);
          return levelGroup;
        }
      }
    }

    this.groupForLevelCache.set((level?.id ?? level?.degree_id), null);
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
    const intervalControl = this.courses?.courseFormGroup?.get('use_interval_groups');
    if (this.configureLevelsByInterval) {
      intervalControl?.setValue(true);
      this.courses?.courseFormGroup?.patchValue({
        intervals_config_mode: 'independent'
      });
      this.invalidateIntervalGroupTemplate();
      this.ensureIntervalGroupsAlignment();
      // No es necesario llamar a sync aquí, se hará al final
    } else {
      intervalControl?.setValue(false);

      intervalControl?.setValue(false);
      this.courses?.courseFormGroup?.patchValue({
        intervals_config_mode: 'unified'
      });

      // --- CAMBIOS CLAVE AQUÍ ---
      // 1. Invalida la plantilla para forzar su reconstrucción.
      this.invalidateIntervalGroupTemplate();

      // 2. BORRA todas las configuraciones de grupos guardadas para los intervalos.
      this.intervalGroupsMap = {};

      // 3. Limpiamos los subgrupos de course_dates ya que volvemos al modo unificado
      // En modo unificado, los subgrupos se manejan por nivel globalmente, no por intervalo
      this.cleanIntervalSpecificSubgroups();

      // 4. Vuelve a alinear los grupos. Al estar el mapa vacío, usará la configuración global para todos.
      this.ensureIntervalGroupsAlignment();
    }

    // Sincroniza siempre al final para aplicar los cambios
    this.syncIntervalGroupsArray();
    this.scheduleIntervalGroupsSync();
  }

  /**
   * Limpia los subgrupos específicos de intervalos cuando se desactiva el modo de configuración por intervalos
   * Mantiene solo el primer subgrupo de cada nivel en todas las fechas
   */
  private cleanIntervalSpecificSubgroups(): void {
    const course_dates = this.courses?.courseFormGroup?.controls['course_dates']?.value || [];

    course_dates.forEach((courseDate: any) => {
      if (courseDate.course_groups && Array.isArray(courseDate.course_groups)) {
        courseDate.course_groups.forEach((group: any) => {
          // Si tiene subgrupos, mantener solo el primero
          if (group.course_subgroups && Array.isArray(group.course_subgroups) && group.course_subgroups.length > 0) {
            group.course_subgroups = [group.course_subgroups[0]];
          }
          // Hacer lo mismo con groups.subgroups si existe
          if (courseDate.groups && Array.isArray(courseDate.groups)) {
            courseDate.groups.forEach((g: any) => {
              if (g.degree_id === group.degree_id && g.subgroups && Array.isArray(g.subgroups) && g.subgroups.length > 0) {
                g.subgroups = [g.subgroups[0]];
              }
            });
          }
        });
      }
    });

    this.courses.courseFormGroup.patchValue({ course_dates });
    this.clearGroupCache();
  }

  private invalidateIntervalGroupTemplate(): void {
    this.baseIntervalGroupTemplate = {};
  }

  private getIntervalKeyForIndex(intervalIdx: number): string | null {
    if (!Array.isArray(this.intervals) || intervalIdx < 0 || intervalIdx >= this.intervals.length) {
      return null;
    }
    const interval = this.intervals[intervalIdx];
    const key = this.resolveIntervalKey(interval, intervalIdx);
    return key;
  }

  private ensureIntervalGroupState(intervalIdx: number, level: any): IntervalGroupState | null {
    // NO llamar a ensureIntervalGroupsAlignment() aquí porque causa duplicación
    // de subgrupos al regenerar el template desde course_dates que ya fueron sincronizados

    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (levelId == null) {
      return null;
    }

    const intervalKey = this.getIntervalKeyForIndex(intervalIdx);
    if (!intervalKey) {
      return null;
    }

    // Asegurar que el mapa de intervalos existe
    if (!this.intervalGroupsMap) {
      this.intervalGroupsMap = {};
    }

    // Asegurar que existe el estado para este intervalo
    if (!this.intervalGroupsMap[intervalKey]) {
      this.intervalGroupsMap[intervalKey] = {};
    }

    const levelKey = String(levelId);
    const intervalState = this.intervalGroupsMap[intervalKey];

    // Asegurar que existe el estado para este nivel en este intervalo
    if (!intervalState[levelKey]) {
      // Al crear un nuevo estado, copiar los subgrupos existentes desde course_dates
      const newState = this.createGroupStateFromLevel(level);

      // Leer subgrupos existentes desde course_dates para este nivel/intervalo
      const courseDates = this.courses.courseFormGroup?.get('course_dates')?.value || [];
      const existingSubgroups = new Map<string, any>();

      courseDates.forEach((cd: any) => {
        const courseGroups = cd?.course_groups || [];
        const groupForThisLevel = Array.isArray(courseGroups)
          ? courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId)
          : courseGroups[String(levelId)];

        if (groupForThisLevel?.course_subgroups) {
          groupForThisLevel.course_subgroups.forEach((sg: any) => {
            const key = sg?.id ?? sg?.key;
            if (key && !existingSubgroups.has(key)) {
              existingSubgroups.set(key, sg);
            }
          });
        }
      });

      // Si hay subgrupos existentes, agregarlos al nuevo estado
      if (existingSubgroups.size > 0) {
        newState.subgroups = Array.from(existingSubgroups.values()).map((sg: any, idx: number) =>
          this.createSubgroupState(sg, levelId, idx)
        );
      }

      intervalState[levelKey] = newState;
    }

    const config = intervalState[levelKey];

    // Asegurarse de que el array de subgrupos existe
    if (!config.subgroups) {
      config.subgroups = [];
    }

    if (config.max_participants == null) {
      config.max_participants = level?.max_participants ?? undefined;
    }

    return config;
  }

  private createIntervalSubgroupState(levelId: number | string, maxParticipants?: number): IntervalSubgroupState {
    const key = `cfg-${levelId}-${Date.now()}-${this.intervalSubgroupKeySeed++}`;
    return {
      degree_id: levelId,
      max_participants: maxParticipants ?? undefined,
      active: true,
      key
    };
  }

  isLevelActiveForInterval(intervalIdx: number, level: any): boolean {
    const state = this.ensureIntervalGroupState(intervalIdx, level);
    if (!state) {
      return false;
    }
    return state.active !== false;
  }

  onIntervalLevelToggle(intervalIdx: number, level: any, active: boolean): void {
    const state = this.ensureIntervalGroupState(intervalIdx, level);
    if (!state) {
      return;
    }

    level.active = active;
    state.active = active;

    if (active && (!state.subgroups || state.subgroups.length === 0)) {
      const levelId = level?.id ?? level?.degree_id;
      state.subgroups = [this.createIntervalSubgroupState(levelId, level?.max_participants)];
    }

    if (!active) {
      state.subgroups = (state.subgroups || []).map(subgroup => ({ ...subgroup, active: false }));
    }

    this.syncIntervalGroupsArray();
    this.scheduleIntervalGroupsSync();
  }

  getIntervalLevelSubgroups(intervalIdx: number, level: any): IntervalSubgroupState[] {
    const state = this.ensureIntervalGroupState(intervalIdx, level);
    return [...(state?.subgroups || [])];
  }

  private addIntervalLevelSubgroupWithoutSync(intervalIdx: number, level: any): IntervalSubgroupState | null {
    const state = this.ensureIntervalGroupState(intervalIdx, level);
    if (!state) {
      return null;
    }

    // Asegura que el nivel quede activo en este intervalo al crear un subgrupo
    level.active = true;
    state.active = true;

    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    const maxParticipants = level?.max_participants ?? state.max_participants ?? this.courses.courseFormGroup.controls['max_participants']?.value;
    const newSubgroup = this.createIntervalSubgroupState(levelId, maxParticipants);

    delete (newSubgroup as any).id;

// MUY IMPORTANTE: limpiar variantes de id que luego usa attachBookingUsersToCourseDates
    delete (newSubgroup as any).course_subgroup_id;
    delete (newSubgroup as any).subgroup_id;
    delete (newSubgroup as any).courseSubgroupId;

    (newSubgroup as any).__isNew = true;

    newSubgroup.booking_users = [];
    newSubgroup.booking_users_active = [];

    // Asegúrate de que el array existe antes de añadir
    if (!Array.isArray(state.subgroups)) {
      state.subgroups = [];
    }

    state.subgroups = [...state.subgroups, newSubgroup];
    // NO limpiar el cache aquí - se limpiará después de sincronizar course_dates
    // clearSubgroupsCache() se llama desde syncIntervalsToCourseFormGroup()

    return newSubgroup;
  }

  private sanitizeNewSubgroup(subgroup: any): any {
    const sg = { ...subgroup };

    // Importantísimo: evitar que “matchée” contra subgrupos existentes
    delete sg.id;
    delete sg.subgroup_id;
    delete sg.course_subgroup_id;

    // Asegurar arrays limpios
    sg.booking_users = [];
    sg.booking_users_active = [];

    // Limpiar monitor también
    sg.monitor = null;
    sg.monitor_id = null;

    return sg;
  }

  private addSubgroupToCourseDates(intervalIdx: number, level: any, subgroup: any): void {
    const courseDatesArray = this.courses.courseFormGroup.get("course_dates") as FormArray;
    const courseDates = courseDatesArray?.getRawValue?.() || courseDatesArray?.value || [];
    const interval = this.intervals?.[intervalIdx];
    const intervalId = interval?.id ?? intervalIdx;
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (!levelId || !courseDatesArray) {
      return;
    }

    courseDates.forEach((cd: any) => {
      const cdIntervalId = cd?.interval_id ?? cd?.intervalId ?? null;
      if (String(cdIntervalId ?? intervalIdx) !== String(intervalId)) {
        return;
      }
      const groups = Array.isArray(cd.course_groups) ? cd.course_groups : [];
      let targetGroup = groups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
      if (!targetGroup) {
        targetGroup = {
          degree_id: levelId,
          course_subgroups: []
        };
        groups.push(targetGroup);
      }
      if (!Array.isArray(targetGroup.course_subgroups)) {
        targetGroup.course_subgroups = [];
      }
      const sanitizedSubgroup = {
        ...subgroup,
        booking_users: [],
        booking_users_active: [],
        monitor: null,
        monitor_id: null
      };
      targetGroup.course_subgroups.push(sanitizedSubgroup);
      cd.course_groups = groups;
    });

    courseDates.forEach((cd: any, idx: number) => {
      courseDatesArray.at(idx).setValue(cd, { emitEvent: false });
    });
    courseDatesArray.updateValueAndValidity({ emitEvent: true });

    // También reflejar en intervals[intervalIdx].dates para que el generador lo conserve
    if (interval && Array.isArray(interval.dates)) {
      interval.dates = interval.dates.map((d: any) => {
        const cdIntervalId = d?.interval_id ?? d?.intervalId ?? null;
        if (String(cdIntervalId ?? intervalIdx) !== String(intervalId)) {
          return d;
        }
        const groups = Array.isArray(d.course_groups) ? d.course_groups : [];
        let targetGroup = groups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
        if (!targetGroup) {
          targetGroup = { degree_id: levelId, course_subgroups: [] };
          groups.push(targetGroup);
        }
        if (!Array.isArray(targetGroup.course_subgroups)) {
          targetGroup.course_subgroups = [];
        }
        targetGroup.course_subgroups.push({
          ...subgroup,
          booking_users: [],
          booking_users_active: [],
          monitor: null,
          monitor_id: null
        });
        return { ...d, course_groups: groups };
      });
    }
  }

  /**
   * Obtiene un subgrupo plantilla para un nivel en un intervalo dado (limpio de monitor/ids)
   */
  private getTemplateSubgroupForInterval(levelId: number | string, intervalIdx: number): IntervalSubgroupState {
    const interval = this.intervals?.[intervalIdx];
    const intervalId = interval?.id ?? intervalIdx;
    const courseDates = this.courses.courseFormGroup.get('course_dates')?.value || [];

    // Buscar en course_dates por intervalo y nivel
    for (const cd of courseDates) {
      const cdIntervalId = cd?.interval_id ?? cd?.intervalId ?? null;
      if (String(cdIntervalId ?? intervalIdx) !== String(intervalId)) {
        continue;
      }
      const groups = Array.isArray(cd.course_groups) ? cd.course_groups : [];
      const targetGroup = groups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
      if (targetGroup && Array.isArray(targetGroup.course_subgroups) && targetGroup.course_subgroups.length) {
        const clone = { ...targetGroup.course_subgroups[targetGroup.course_subgroups.length - 1] };
        delete clone.id;
        delete clone.monitor;
        delete clone.monitor_id;
        clone.booking_users = [];
        clone.booking_users_active = [];
        clone.key = `cfg-${levelId}-${Date.now()}-${this.intervalSubgroupKeySeed++}`;
        return clone;
      }
    }

    // Fallback: usar estado de intervalGroupsMap si existe
    const state = this.ensureIntervalGroupState(intervalIdx, { id: levelId, degree_id: levelId, degreeId: levelId });
    const last = state?.subgroups?.[state.subgroups.length - 1];
    if (last) {
      const clone = { ...last };
      delete clone.id;
      delete clone.monitor;
      delete clone.monitor_id;
      clone.booking_users = [];
      clone.booking_users_active = [];
      clone.key = `cfg-${levelId}-${Date.now()}-${this.intervalSubgroupKeySeed++}`;
      return clone;
    }

    // Último recurso: crear uno nuevo
    return this.createIntervalSubgroupState(levelId, state?.max_participants);
  }

  addIntervalLevelSubgroup(intervalIdx: number, level: any): void {
    const state = this.ensureIntervalGroupState(intervalIdx, level);
    if (state) {
      state.active = true;
    }
    const created = this.addIntervalLevelSubgroupWithoutSync(intervalIdx, level);
    if (!created) {
      return;
    }
    this.syncIntervalGroupsArray();
    this.clearGroupCache();
    // Recalcular course_dates completo para garantizar coherencia (incluye subgrupo recién añadido)
    this.syncIntervalsToCourseFormGroup();
    this.clearSubgroupsCache();
    this.cdr.detectChanges();
  }
  removeIntervalLevelSubgroup(intervalIdx: number, level: any, subgroupIdx: number): void {
    if (this.hasActiveBookingUsersForSubgroup(level, subgroupIdx)) {
      this.snackBar.open(
        'No se puede eliminar este subgrupo porque tiene reservas activas asociadas',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    if (this.hasAnyBookingUsersForSubgroup(level, subgroupIdx)) {
      this.snackBar.open(
        'No se puede eliminar este subgrupo porque tiene reservas registradas; elimina los bookings primero',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    const state = this.ensureIntervalGroupState(intervalIdx, level);
    if (!state || !Array.isArray(state.subgroups)) {
      return;
    }

    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    const targetKey = this.getSubgroupKeyForLevel(level, subgroupIdx);
    const stateIndex = targetKey
      ? state.subgroups.findIndex((entry: any) => this.ensureSubgroupKey(entry, levelId) === targetKey)
      : subgroupIdx;

    if (stateIndex < 0 || stateIndex >= state.subgroups.length) {
      return;
    }

    // Reemplaza splice por filter para crear un nuevo array (inmutabilidad)
    state.subgroups = state.subgroups.filter((_, index: number) => index !== stateIndex);

    this.syncIntervalGroupsArray();
    this.clearGroupCache();

    // Reflejar eliminación en course_dates para que la UI se actualice sin esperar sincronización completa
    this.removeSubgroupFromCourseDates(intervalIdx, level, subgroupIdx, targetKey);

    // Recalcular course_dates completo para garantizar coherencia (igual que addIntervalLevelSubgroup)
    this.syncIntervalsToCourseFormGroup();
    this.clearSubgroupsCache();
    this.cdr.detectChanges();
  }

  private removeSubgroupFromCourseDates(intervalIdx: number, level: any, subgroupIdx: number, targetKey?: string | null): void {
    const courseDatesArray = this.courses.courseFormGroup.get("course_dates") as FormArray;
    const courseDates = courseDatesArray?.getRawValue?.() || courseDatesArray?.value || [];
    const interval = this.intervals?.[intervalIdx];
    const intervalId = interval?.id ?? intervalIdx;
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (!levelId || !courseDatesArray) return;

    courseDates.forEach((cd: any) => {
      const cdIntervalId = cd?.interval_id ?? cd?.intervalId ?? null;
      if (String(cdIntervalId ?? intervalIdx) !== String(intervalId)) {
        return;
      }
      const groups = Array.isArray(cd.course_groups) ? cd.course_groups : [];
      const targetGroup = groups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
      if (!targetGroup || !Array.isArray(targetGroup.course_subgroups)) {
        return;
      }
      targetGroup.course_subgroups = targetGroup.course_subgroups.filter((entry: any, idx: number) => {
        if (targetKey) {
          return this.ensureSubgroupKey(entry, levelId) !== targetKey;
        }
        return idx !== subgroupIdx;
      });
      cd.course_groups = groups;
    });

    courseDates.forEach((cd: any, idx: number) => {
      courseDatesArray.at(idx).setValue(cd, { emitEvent: false });
    });
    courseDatesArray.updateValueAndValidity({ emitEvent: true });

    // Remover también de intervals[intervalIdx].dates
    if (interval && Array.isArray(interval.dates)) {
      interval.dates = interval.dates.map((d: any) => {
        const cdIntervalId = d?.interval_id ?? d?.intervalId ?? null;
        if (String(cdIntervalId ?? intervalIdx) !== String(intervalId)) {
          return d;
        }
        const groups = Array.isArray(d.course_groups) ? d.course_groups : [];
        const targetGroup = groups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
        if (targetGroup && Array.isArray(targetGroup.course_subgroups)) {
          targetGroup.course_subgroups = targetGroup.course_subgroups.filter((entry: any, idx: number) => {
            if (targetKey) {
              return this.ensureSubgroupKey(entry, levelId) !== targetKey;
            }
            return idx !== subgroupIdx;
          });
        }
        return { ...d, course_groups: groups };
      });
    }
  }

  /**
   * Abre modal para seleccionar intervalos antes de eliminar subgrupo.
   * Modal: mostrar siempre (si no hay intervalos, no hace nada).
   */
  openIntervalSelectorForRemoveSubgroup(level: any, subgroupIdx: number): void {
    if (this.hasActiveBookingUsersForSubgroup(level, subgroupIdx)) {
      this.snackBar.open(
        'No se puede eliminar este subgrupo porque tiene reservas activas asociadas',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    if (this.hasAnyBookingUsersForSubgroup(level, subgroupIdx)) {
      this.snackBar.open(
        'No se puede eliminar este subgrupo porque tiene reservas registradas; elimina los bookings primero',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    const intervalsWithSubgroup = this.getSubgroupIntervals(level, subgroupIdx);
    const hasIntervals = Array.isArray(intervalsWithSubgroup) && intervalsWithSubgroup.length > 0;
    const courseType = this.courses?.courseFormGroup?.controls?.['course_type']?.value;
    const isFlexible = this.courses?.courseFormGroup?.controls?.['is_flexible']?.value;
    const forceSimple = courseType === 1 && !isFlexible;

    // this.debugLog('removeSubgroup:entry', {
    //   levelId: level?.id ?? level?.degree_id,
    //   subgroupIdx,
    //   hasIntervals,
    //   configureLevelsByInterval: this.configureLevelsByInterval,
    //   useMultipleIntervals: this.useMultipleIntervals,
    //   courseType,
    //   isFlexible,
    //   forceSimple
    // });
    this.pushDebugLogsToBackend();

    // Sin intervalos: eliminar directamente en modo simple
    if (!hasIntervals || forceSimple) {
      this.addLevelSubgroup(level, subgroupIdx, false);
      this.clearGroupCache();
      this.clearSubgroupsCache();
      this._uniqueSubgroupsCache.clear();
      this.refreshPreviewSubgroupCache();
      this.cdr.detectChanges();
      return;
    }

    // Pasar datos crudos al modal (funciona para 1 o múltiples intervalos)
    const courseDates = this.courses.courseFormGroup.get('course_dates')?.value || [];
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;

    // Usar Promise microtask para evitar loops de change detection
    Promise.resolve().then(() => {
      const dialogRef = this.dialog.open(IntervalSelectorModalComponent, {
        width: '450px',
        data: {
          intervals: intervalsWithSubgroup,
          level: level,
          action: 'remove-subgroup',
          subgroupIndex: subgroupIdx,
          courseDates: courseDates,
          levelId: levelId
        }
      });

      dialogRef.afterClosed().pipe(
        takeUntil(this.destroy$)
      ).subscribe((result: any) => {
        if (!result) return;

        const selectedIndices: number[] = result.selectAll
          ? intervalsWithSubgroup.map((_, idx) => idx)
          : result.selectedIndices || [];

        selectedIndices.forEach((idx: number) => {
          const selectedInterval = intervalsWithSubgroup[idx];
          const intervalIdx = this.intervals.findIndex((i: any) => i.id === selectedInterval.id);
          if (intervalIdx >= 0) {
            this.removeIntervalLevelSubgroup(intervalIdx, level, subgroupIdx);
          }
        });
      });
    });
  }

  /**
   * Maneja el click de eliminar subgrupo en UPDATE mode
   */
  onSubgroupDeleteClick(level: any, uniqueSubgroup: any): void {
    const confirmed = confirm(`¿Eliminar el subgrupo ${("00" + (uniqueSubgroup._index + 1)).slice(-2)} de ${level.annotation} ${level.level}?`);
    if (confirmed) {
      this.removeIntervalLevelSubgroup(0, level, uniqueSubgroup._index);
    }
  }

  /**
   * Abre modal para añadir subgrupo
   */
  openIntervalSelectorForAddSubgroup(level: any): void {
    const intervalsWithData = Array.isArray(this.intervals) ? this.intervals : [];
    const useIntervalConfig = this.configureLevelsByInterval || (this.useMultipleIntervals && intervalsWithData.length > 0);

    // Sin intervalos disponibles, forzar alta directa de subgrupo
    if (!intervalsWithData || intervalsWithData.length === 0) {
      const currentSubgroups = this.getAllUniqueSubgroupsForLevel(level) || [];
      const nextIndex = currentSubgroups.length;
      this.addLevelSubgroup(level, nextIndex, true);
      this.clearGroupCache();
      this.clearSubgroupsCache();
      this.cdr.detectChanges();
      return;
    }

    // Caso simple (sin intervalos configurables): añadir directamente al formulario
    if (!useIntervalConfig) {
      const currentSubgroups = this.getAllUniqueSubgroupsForLevel(level) || [];
      const nextIndex = currentSubgroups.length;
      this.addLevelSubgroup(level, nextIndex, true);
      this.clearGroupCache();
      this.clearSubgroupsCache();
      this._uniqueSubgroupsCache.clear();
      this.refreshPreviewSubgroupCache();
      this.cdr.detectChanges();
      return;
    }

    // Asegurar al menos un intervalo en modo multi-intervalo
    if (intervalsWithData.length === 0 && this.useMultipleIntervals) {
      this.intervals = [this.createDefaultInterval()];
    }

    const courseDates = this.courses.courseFormGroup.get('course_dates')?.value || [];
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;

    // Usar microtask para evitar loops de change detection (funciona para 1 o múltiples)
    Promise.resolve().then(() => {
      const dialogRef = this.dialog.open(IntervalSelectorModalComponent, {
        width: '450px',
        data: {
          intervals: intervalsWithData,
          level: level,
          action: 'add-subgroup',
          subgroupIndex: this.getAllUniqueSubgroupsForLevel(level).length,
          courseDates: courseDates,
          levelId: levelId
        }
      });

      dialogRef.afterClosed().pipe(
        takeUntil(this.destroy$)
      ).subscribe((result: any) => {
        if (!result) {
          return;
        }

        const createdEntries: Array<{ idx: number, subgroup: IntervalSubgroupState }> = [];

        // Aplicar en lote sin sincronizar en cada inserción
        if (result.selectAll) {
          this.intervals.forEach((_, idx) => {
            const sg = this.addIntervalLevelSubgroupWithoutSync(idx, level);
            if (sg) {
              createdEntries.push({ idx, subgroup: sg });
            }
          });
        } else {
          result.selectedIndices.forEach((value: number) => {
            const intervalIdx = this.resolveIntervalIndexFromValue(value);
            if (intervalIdx < 0) {
              return;
            }
            const sg = this.addIntervalLevelSubgroupWithoutSync(intervalIdx, level);
            if (sg) {
              createdEntries.push({ idx: intervalIdx, subgroup: sg });
            }
          });
        }

        // Invalidar el template cacheado para forzar regeneración desde cero (como en addLevelToIntervalsConfig)
        this.invalidateIntervalGroupTemplate();

        // Sincronizar una sola vez para evitar ráfagas (MISMO ORDEN QUE addLevelToIntervalsConfig)
        this.syncIntervalGroupsArray();
        this.syncIntervalsToCourseFormGroup();
        this.clearGroupCache();

        // CRÍTICO: Forzar actualización de levelGrop para que el template reconozca los cambios
        // Esto es lo que hace addLevelToIntervalsConfig pero faltaba aquí
        const levelGrop = this.courses.courseFormGroup.controls['levelGrop']?.value || [];
        this.courses.courseFormGroup.patchValue({ levelGrop });

        // NO llamar clearSubgroupsCache aquí - syncIntervalsToCourseFormGroup ya lo hace
        this.cdr.detectChanges();
      });
    });
  }

  /**
   * Elimina un grupo completo con selección de intervalos
   */
  deleteGroupWithIntervalSelector(level: any): void {
    const bookingUsers = this.courses.courseFormGroup.controls['booking_users']?.value || [];
    const hasBookings = bookingUsers.some((user: any) => user.degree_id === (level?.id ?? level?.degree_id));

    if (hasBookings) {
      alert(`No se puede eliminar el grupo "${level.annotation} ${level.level}" porque contiene reservas sin anular.`);
      return;
    }

    const levelId = level?.id ?? level?.degree_id;

    // En modo por intervalos, verificar en intervalGroupsMap
    if (this.configureLevelsByInterval) {
      const intervalsWithGroup: any[] = [];

      // Buscar en intervalGroupsMap cuáles intervalos tienen este grupo activo
      Object.entries(this.intervalGroupsMap).forEach(([key, intervalState]) => {
        if (intervalState && intervalState[levelId] && intervalState[levelId].active) {
          // Encontrar el intervalo correspondiente
          const interval = this.intervals.find(i => this.resolveIntervalKey(i, this.intervals.indexOf(i)) === key);
          if (interval) {
            intervalsWithGroup.push(interval);
          }
        }
      });

      if (intervalsWithGroup.length === 0) {
        // No intervals configured - just delete the group directly
        this.deleteGroupForAllIntervals(level);
        return;
      }

      // Usar microtask para evitar loops de change detection
      Promise.resolve().then(() => {
        const dialogRef = this.dialog.open(IntervalSelectorModalComponent, {
          width: '450px',
          data: {
            intervals: intervalsWithGroup,
            level: level,
            action: 'remove-group',
            levelId: levelId
          }
        });

        dialogRef.afterClosed().pipe(
          takeUntil(this.destroy$)
        ).subscribe((result: any) => {
          if (!result) return;

          if (result.selectAll) {
            this.deleteGroupForAllIntervals(level);
          } else {
            result.selectedIndices.forEach((idx: number) => {
              const selectedInterval = intervalsWithGroup[idx];
              const actualIdx = this.intervals.findIndex((i: any) => i.id === selectedInterval.id);
              if (actualIdx >= 0) {
                this.deleteGroupFromInterval(actualIdx, level);
              }
            });
          }
        });
      });
    } else {
      // Modo simple: buscar en course_dates
      const courseDates = this.courses.courseFormGroup.get('course_dates')?.value || [];
      const intervalsWithGroup = new Set<number>();

      if (Array.isArray(courseDates)) {
        courseDates.forEach((courseDate: any) => {
          if (courseDate.course_groups) {
            Object.values(courseDate.course_groups).forEach((group: any) => {
              if (group && (group.degree_id === levelId)) {
                intervalsWithGroup.add(courseDate.interval_id);
              }
            });
          }
        });
      }

      // Si no hay intervalos con este grupo, no hacer nada
      if (intervalsWithGroup.size === 0) {
        return;
      }

      // Crear lista de intervalos que tienen este grupo
      const intervalsWithThisGroup = this.intervals.filter((interval: any) =>
        intervalsWithGroup.has(interval.id)
      );

      const courseDatesForModal = this.courses.courseFormGroup.get('course_dates')?.value || [];

      // Usar microtask para evitar loops de change detection
      Promise.resolve().then(() => {
        const dialogRef = this.dialog.open(IntervalSelectorModalComponent, {
          width: '450px',
          data: {
            intervals: intervalsWithThisGroup,
            level: level,
            action: 'remove-group',
            courseDates: courseDatesForModal,
            levelId: levelId
          }
        });

        dialogRef.afterClosed().pipe(
          takeUntil(this.destroy$)
        ).subscribe((result: any) => {
          if (!result) return;

          if (result.selectAll) {
            this.deleteGroupForAllIntervals(level);
          } else {
            result.selectedIndices.forEach((idx: number) => {
              const selectedInterval = intervalsWithThisGroup[idx];
              const actualIdx = this.intervals.findIndex((i: any) => i.id === selectedInterval.id);
              if (actualIdx >= 0) {
                this.deleteGroupFromInterval(actualIdx, level);
              }
            });
          }
        });
      });
    }
  }

  /**
   * Abre un diálogo para seleccionar un grupo (nivel) inactivo y agregarlo al curso
   */
  openAddGroupDialog(): void {
    const levelGrop = this.courses.courseFormGroup.controls['levelGrop']?.value || [];

    // Filtrar solo los niveles inactivos
    const inactiveLevels = levelGrop.filter((level: any) => !level.active);

    if (inactiveLevels.length === 0) {
      alert('Todos los grupos disponibles ya están añadidos al curso.');
      return;
    }

    // Si solo hay un nivel inactivo, agregarlo directamente sin diálogo
    if (inactiveLevels.length === 1) {
      const levelIndex = levelGrop.findIndex((l: any) => l.id === inactiveLevels[0].id);
      if (levelIndex >= 0) {
        this.addLevelToGroups(levelIndex);
      }
      return;
    }

    // Para múltiples niveles inactivos, abrir un diálogo de selección
    Promise.resolve().then(() => {
      const dialogRef = this.dialog.open(LevelSelectorDialogComponent, {
        width: '450px',
        data: {
          levels: inactiveLevels,
          title: 'Seleccionar Grupo',
          message: 'Selecciona el grupo que deseas agregar al curso'
        }
      });

      dialogRef.afterClosed().pipe(
        takeUntil(this.destroy$)
      ).subscribe((selectedLevel: any) => {
        if (!selectedLevel) return;

        // Encontrar el índice del nivel seleccionado en el array levelGrop
        const levelIndex = levelGrop.findIndex((l: any) => l.id === selectedLevel.id);
        if (levelIndex >= 0) {
          this.addLevelToGroups(levelIndex);
        }
      });
    });
  }

  /**
   * Agrega un nivel a los grupos (maneja tanto modo normal como por intervalos)
   */
  private addLevelToGroups(levelIndex: number): void {
    // Si estamos configurando por intervalos, usamos lógica diferente
    if (this.configureLevelsByInterval) {
      this.addLevelToIntervalsConfig(levelIndex);
    } else {
      // Si NO configuramos por intervalos, usamos selectLevel
      this.selectLevel(true, levelIndex);
    }
  }

  /**
   * Agrega un nivel a la configuración por intervalos sin activarlo automáticamente
   */
  private addLevelToIntervalsConfig(levelIndex: number): void {
    const levelGrop = this.courses.courseFormGroup.controls['levelGrop'].value;
    const level = levelGrop[levelIndex];

    if (!level) return;

    // Marcar el nivel como activo
    level.active = true;
    if (level.max_participants == null || level.max_participants === '') {
      level.max_participants = this.courses.courseFormGroup.controls['max_participants']?.value ?? null;
    }

    // Ensegurar que existe en el mapa de intervalos
    const intervalsCount = Array.isArray(this.intervals) ? this.intervals.length : 0;

    for (let idx = 0; idx < intervalsCount; idx++) {
      const state = this.ensureIntervalGroupState(idx, level);
      if (state) {
        // NO activar automáticamente, dejar que el usuario lo haga manualmente
        state.active = false;
        state.subgroups = [];
      }
    }

    // Actualizar el formulario
    this.courses.courseFormGroup.patchValue({ levelGrop });
    this.invalidateIntervalGroupTemplate();
    this.syncIntervalGroupsArray();
    this.syncIntervalsToCourseFormGroup();
    this.clearGroupCache();
  }

  /**
   * Elimina grupo de todos los intervalos
   */
  private deleteGroupForAllIntervals(level: any): void {
    const courseDatesControl = this.courses.courseFormGroup.controls['course_dates'];
    const currentCourseDates = courseDatesControl.value || [];
    const levelId = level?.id ?? level?.degree_id;

    // Marcar el grupo como inactivo en levelGrop
    const levelGrop = this.courses.courseFormGroup.controls['levelGrop']?.value || [];
    const levelIndex = levelGrop.findIndex((l: any) => l.id === levelId);
    if (levelIndex >= 0) {
      levelGrop[levelIndex].active = false;
      this.courses.courseFormGroup.patchValue({ levelGrop });
    }

    // En modo por intervalos, limpiar de intervalGroupsMap
    if (this.configureLevelsByInterval) {
      Object.keys(this.intervalGroupsMap).forEach(intervalKey => {
        const intervalState = this.intervalGroupsMap[intervalKey];
        if (intervalState && intervalState[levelId]) {
          intervalState[levelId].active = false;
          intervalState[levelId].subgroups = [];
        }
      });
    }

    currentCourseDates.forEach((course: any) => {
      const groupsToDelete: string[] = [];
      for (const group in course.course_groups) {
        if (course.course_groups[group].degree_id === levelId) {
          groupsToDelete.push(group);
        }
      }
      groupsToDelete.forEach(group => {
        delete course.course_groups[group];
      });
    });

    courseDatesControl.markAsDirty();
    this.clearGroupCache();
    this.clearSubgroupsCache();
    this.syncIntervalGroupsArray();
    this.syncIntervalsToCourseFormGroup();
    this.cdr.detectChanges();
  }

  /**
   * Elimina un grupo de un intervalo específico
   */
  private deleteGroupFromInterval(intervalIdx: number, level: any): void {
    const courseDatesControl = this.courses.courseFormGroup.controls['course_dates'];
    const currentCourseDates = courseDatesControl.value || [];
    const levelId = level?.id ?? level?.degree_id;
    const targetIntervalId = this.intervals[intervalIdx]?.id;
    const interval = this.intervals[intervalIdx];

    // En modo por intervalos, también marcar el grupo como inactivo en intervalGroupsMap
    if (this.configureLevelsByInterval && interval) {
      const key = this.resolveIntervalKey(interval, intervalIdx);
      const intervalState = this.intervalGroupsMap?.[key];
      if (intervalState && intervalState[levelId]) {
        intervalState[levelId].active = false;
        intervalState[levelId].subgroups = [];
      }
    }

    currentCourseDates.forEach((course: any) => {
      if (course.interval_id === targetIntervalId && course.course_groups) {
        const groupsToDelete: string[] = [];
        for (const group in course.course_groups) {
          if (course.course_groups[group].degree_id === levelId) {
            groupsToDelete.push(group);
          }
        }
        groupsToDelete.forEach(group => {
          delete course.course_groups[group];
        });
      }
    });

    courseDatesControl.markAsDirty();
    this.clearGroupCache();
    this.clearSubgroupsCache();
    this.syncIntervalGroupsArray();
    this.syncIntervalsToCourseFormGroup();
    this.cdr.detectChanges();
  }

  /**
   * Obtiene el label del intervalo para un subgrupo
   */
  getIntervalLabelForSubgroup(level: any, subgroupIndex: number): string {
    return '';
  }

  /**
   * Maneja el toggle de un nivel
   */
  handleLevelToggle(event: any, levelIdx: number, level: any): void {
    // Placeholder
  }

  /**
   * TrackBy function para subgrupos
   */
  trackSubgroup(index: number, item: any): any {
    return item._index ?? index;
  }

  // ============================================
  // NUEVOS MÉTODOS PARA GESTIÓN DE NIVELES Y SUBGRUPOS
  // ============================================

  /**
   * Activa/desactiva un nivel para todos los intervalos
   */
  onLevelToggleForIntervals(level: any, active: boolean): void {
    if (active) {
      // Activar el nivel en todos los intervalos
      if (this.intervals && this.intervals.length > 0) {
        this.intervals.forEach((interval, idx) => {
          const state = this.ensureIntervalGroupState(idx, level);
          if (state) {
            state.active = true;
            if (!state.subgroups || state.subgroups.length === 0) {
              const levelId = level?.id ?? level?.degree_id;
              state.subgroups = [this.createIntervalSubgroupState(levelId, level?.max_participants)];
            }
          }
        });
      }
    } else {
      // Desactivar el nivel en todos los intervalos
      if (this.intervals && this.intervals.length > 0) {
        this.intervals.forEach((interval, idx) => {
          const state = this.ensureIntervalGroupState(idx, level);
          if (state) {
            state.active = false;
            state.subgroups = (state.subgroups || []).map(subgroup => ({ ...subgroup, active: false }));
          }
        });
      }
    }

    this.syncIntervalGroupsArray();
    // Sincronizar inmediatamente para que la UI se actualice
    this.syncIntervalsToCourseFormGroup();

    // Forzar actualización inmediata de la UI
    this.courses.courseFormGroup.controls['course_dates'].updateValueAndValidity();

    // Limpiar cache DESPUÉS de sincronizar
    this.clearSubgroupsCache();

    // Forzar detección de cambios de Angular
    this.cdr.detectChanges();
  }

  /**
   * Añade un subgrupo a un nivel en TODOS los intervalos
   */
  addSubgroupToLevel(level: any): void {
    if (!this.intervals || this.intervals.length === 0) {
      console.error('? No intervals available');
      return;
    }

    const levelId = level?.id ?? level?.degree_id;
    const maxParticipants = level?.max_participants ?? this.courses.courseFormGroup.controls['max_participants']?.value;

    this.intervals.forEach((interval, idx) => {
      const state = this.ensureIntervalGroupState(idx, level);

      if (state) {
        const newSubgroup = this.createIntervalSubgroupState(levelId, maxParticipants);

        if (!state.subgroups) {
          state.subgroups = [];
        }

        state.subgroups.push(newSubgroup);
      } else {
        console.error(`? No state for interval ${idx}`);
      }
    });

    this.syncIntervalGroupsArray();

    // Sincronizar INMEDIATAMENTE en lugar de programar para después
    this.syncIntervalsToCourseFormGroup();

    // Forzar actualización inmediata de la UI
    this.courses.courseFormGroup.controls['course_dates'].updateValueAndValidity();

    // Limpiar cache DESPUÉS de sincronizar
    this.clearSubgroupsCache();

    // Forzar detección de cambios de Angular
    this.cdr.detectChanges();
  }

  /**
   * Elimina un nivel de todos los intervalos (solo si no tiene reservas)
   */
  removeLevelFromIntervals(level: any): void {
    if (this.hasActiveBookingUsersForLevel(level)) {
      this.snackBar.open(
        'No se puede eliminar este nivel porque tiene reservas activas asociadas',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    if (this.hasAnyBookingUsersForLevel(level)) {
      this.snackBar.open(
        'No se puede eliminar este nivel porque tiene reservas registradas; elimina los bookings primero',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    // Confirmar eliminación
    if (!confirm(`¿Está seguro de que desea eliminar el nivel ${level.annotation} ${level.level}?`)) {
      return;
    }

    // Desactivar el nivel
    level.active = false;

    // Eliminar de todos los intervalos
    if (this.intervals && this.intervals.length > 0) {
      this.intervals.forEach((interval, idx) => {
        const state = this.ensureIntervalGroupState(idx, level);
        if (state) {
          state.active = false;
          state.subgroups = [];
        }
      });
    }

    this.syncIntervalGroupsArray();
    this.scheduleIntervalGroupsSync();

    // Forzar actualización inmediata de la UI
    this.courses.courseFormGroup.controls['course_dates'].updateValueAndValidity();

    // Limpiar cache DESPUÉS de sincronizar
    this.clearGroupCache();
    this.clearSubgroupsCache();

    // Forzar detección de cambios de Angular
    this.cdr.detectChanges();
  }

  private hasActiveBookingUsersForSubgroup(level: any, subgroupIndex: number): boolean {
    const users = this.getBookingUsersForSubgroup(level, subgroupIndex);
    return users.some(user => this.isBookingUserActive(user));
  }

  private hasAnyBookingUsersForSubgroup(level: any, subgroupIndex: number): boolean {
    return this.getBookingUsersForSubgroup(level, subgroupIndex).length > 0;
  }

  private hasActiveBookingUsersForLevel(level: any): boolean {
    const users = this.getBookingUsersForLevel(level);
    return users.some(user => this.isBookingUserActive(user));
  }

  private hasAnyBookingUsersForLevel(level: any): boolean {
    return this.getBookingUsersForLevel(level).length > 0;
  }

  private getBookingUsersForSubgroup(level: any, subgroupIndex: number): any[] {
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (levelId == null) {
      return [];
    }

    const targetKey = this.getSubgroupKeyForLevel(level, subgroupIndex);
    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];
    const collected: any[] = [];

    courseDates.forEach((cd: any) => {
      const groups = Array.isArray(cd?.course_groups) ? cd.course_groups : cd?.courseGroups || [];

      const targetGroup = groups.find((group: any) => (group?.degree_id ?? group?.degreeId) === levelId);
      if (targetGroup) {
        const groupSubgroups = Array.isArray(targetGroup.course_subgroups)
          ? targetGroup.course_subgroups
          : targetGroup.courseSubgroups || [];
        if (targetKey) {
          const subgroup = groupSubgroups.find((entry: any) =>
            this.ensureSubgroupKey(entry, levelId) === targetKey
          );
          if (subgroup) {
            collected.push(...this.extractBookingUsersFromSubgroup(subgroup));
          } else if (groupSubgroups[subgroupIndex]) {
            collected.push(...this.extractBookingUsersFromSubgroup(groupSubgroups[subgroupIndex]));
          }
        } else {
          const subgroup = groupSubgroups[subgroupIndex];
          if (subgroup) {
            collected.push(...this.extractBookingUsersFromSubgroup(subgroup));
          }
        }
      }

      const fallbackSubgroups = Array.isArray(cd?.course_subgroups)
        ? cd.course_subgroups
        : cd?.courseSubgroups || [];
      if (targetKey) {
        const fallbackSubgroup = fallbackSubgroups.find((entry: any) =>
          (entry?.degree_id ?? entry?.degreeId) === levelId &&
          this.ensureSubgroupKey(entry, levelId) === targetKey
        );
        if (fallbackSubgroup) {
          collected.push(...this.extractBookingUsersFromSubgroup(fallbackSubgroup));
        } else {
          const fallbackByIndex = fallbackSubgroups[subgroupIndex];
          if (fallbackByIndex && (fallbackByIndex?.degree_id ?? fallbackByIndex?.degreeId) === levelId) {
            collected.push(...this.extractBookingUsersFromSubgroup(fallbackByIndex));
          }
        }
      } else {
        const fallbackSubgroup = fallbackSubgroups[subgroupIndex];
        if (fallbackSubgroup && (fallbackSubgroup?.degree_id ?? fallbackSubgroup?.degreeId) === levelId) {
          collected.push(...this.extractBookingUsersFromSubgroup(fallbackSubgroup));
        }
      }
    });

    return collected;
  }

  private getBookingUsersForLevel(level: any): any[] {
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (levelId == null) {
      return [];
    }

    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];
    const collected: any[] = [];

    courseDates.forEach((cd: any) => {
      const groups = Array.isArray(cd?.course_groups) ? cd.course_groups : cd?.courseGroups || [];
      const targetGroup = groups.find((group: any) => (group?.degree_id ?? group?.degreeId) === levelId);
      if (targetGroup) {
        const subgroups = Array.isArray(targetGroup.course_subgroups)
          ? targetGroup.course_subgroups
          : targetGroup.courseSubgroups || [];
        subgroups.forEach((subgroup: any) => {
          collected.push(...this.extractBookingUsersFromSubgroup(subgroup));
        });
      }

      const fallbackSubgroups = Array.isArray(cd?.course_subgroups)
        ? cd.course_subgroups
        : cd?.courseSubgroups || [];
      fallbackSubgroups.forEach((subgroup: any) => {
        if ((subgroup?.degree_id ?? subgroup?.degreeId) === levelId) {
          collected.push(...this.extractBookingUsersFromSubgroup(subgroup));
        }
      });
    });

    return collected;
  }

  private extractBookingUsersFromSubgroup(subgroup: any): any[] {
    if (!subgroup) {
      return [];
    }

    if (Array.isArray(subgroup.booking_users_active) && subgroup.booking_users_active.length > 0) {
      return subgroup.booking_users_active;
    }

    if (Array.isArray(subgroup.bookingUsersActive) && subgroup.bookingUsersActive.length > 0) {
      return subgroup.bookingUsersActive;
    }

    if (Array.isArray(subgroup.booking_users) && subgroup.booking_users.length > 0) {
      return subgroup.booking_users;
    }

    if (Array.isArray(subgroup.bookingUsers) && subgroup.bookingUsers.length > 0) {
      return subgroup.bookingUsers;
    }

    return [];
  }

  private isBookingUserActive(user: any): boolean {
    if (!user) {
      return false;
    }

    const isActive = (value: any): boolean => value === 1 || value === '1';

    if (isActive(user.status) || isActive(user.booking?.status) || isActive(user.booking_status)) {
      return true;
    }

    return false;
  }

  private orderSubgroupsByBookingPresence(subgroups: any[]): any[] {
    if (!Array.isArray(subgroups)) {
      return [];
    }

    const ordered = [...subgroups];

    ordered.forEach((subgroup, index) => {
      if (subgroup) {
        subgroup._index = index;
      }
    });

    return ordered;
  }

  /**
   * Elimina un subgrupo de un nivel en TODOS los intervalos (solo si no tiene reservas)
   */
  removeSubgroupFromLevel(level: any, subgroupIndex: number): void {
    if (this.hasActiveBookingUsersForSubgroup(level, subgroupIndex)) {
      this.snackBar.open(
        'No se puede eliminar este subgrupo porque tiene reservas activas asociadas',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    if (this.hasAnyBookingUsersForSubgroup(level, subgroupIndex)) {
      this.snackBar.open(
        'No se puede eliminar este subgrupo porque tiene reservas registradas; elimina los bookings primero',
        'Cerrar',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    // Confirmar eliminación
    if (!confirm(`¿Está seguro de que desea eliminar el subgrupo ${level.annotation} ${level.level} ${("00"+(subgroupIndex+1)).slice(-2)}?`)) {
      return;
    }

    // Eliminar el subgrupo de todos los intervalos
    if (this.intervals && this.intervals.length > 0) {
      const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
      const targetKey = this.getSubgroupKeyForLevel(level, subgroupIndex);
      this.intervals.forEach((interval, idx) => {
        const state = this.ensureIntervalGroupState(idx, level);
        if (state && Array.isArray(state.subgroups)) {
          const stateIndex = targetKey
            ? state.subgroups.findIndex((entry: any) => this.ensureSubgroupKey(entry, levelId) === targetKey)
            : subgroupIndex;
          if (stateIndex >= 0) {
            state.subgroups = state.subgroups.filter((_, index: number) => index !== stateIndex);
          }
        }
      });
    }

    this.syncIntervalGroupsArray();
    this.syncIntervalsToCourseFormGroup();

    // Forzar actualización inmediata de la UI
    this.courses.courseFormGroup.controls['course_dates'].updateValueAndValidity();

    // Limpiar cache DESPUÉS de sincronizar
    this.clearGroupCache();
    this.clearSubgroupsCache();

    // Forzar detección de cambios de Angular
    this.cdr.detectChanges();
  }

  /**
   * Limpia el caché de subgrupos cuando hay cambios en course_dates
   */
  private clearSubgroupsCache(): void {
    // Guard against recursive cache clearing during recalculation
    if (this._isRecalculatingSubgroups) {
      return;
    }

    this._uniqueSubgroupsCache.clear();
    this._subgroupDatesCache.clear();
    this._intervalsForSubgroupCache.clear();

    this._isRecalculatingSubgroups = true;
    try {
      this.recalculateAllSubgroupIntervals();
      this.prefillSubgroupCacheFromIntervalMap();
      this.refreshPreviewSubgroupCache();
    } finally {
      this._isRecalculatingSubgroups = false;
    }
  }

  /**
   * Rellena _uniqueSubgroupsCache usando intervalGroupsMap cuando la información está disponible
   */
  private prefillSubgroupCacheFromIntervalMap(): void {
    const levelGrop = this.courses?.courseFormGroup?.controls?.['levelGrop']?.value || [];
    const courseDates = this.courses?.courseFormGroup?.controls?.['course_dates']?.value || [];
    if (Array.isArray(courseDates) && courseDates.length > 0) {
      levelGrop.forEach((level: any) => {
        const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
        if (levelId == null) {
          return;
        }
        const cacheKey = `level_${levelId}`;
        if (this._uniqueSubgroupsCache.has(cacheKey)) {
          return;
        }
        const fromDates = this.buildUniqueSubgroupsFromCourseDates(level, courseDates);
        if (!fromDates.length) {
          return;
        }
        const ordered = this.orderSubgroupsByBookingPresence(fromDates);
        this._uniqueSubgroupsCache.set(cacheKey, ordered);
      });
      return;
    }

    levelGrop.forEach((level: any) => {
      const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
      if (levelId == null) {
        return;
      }
      const cacheKey = `level_${levelId}`;
      if (this._uniqueSubgroupsCache.has(cacheKey)) {
        return;
      }
      const mapSubgroups = this.getSubgroupsFromIntervalMap(levelId);
      if (!mapSubgroups.length) {
        return;
      }
      mapSubgroups.forEach(subgroup => this.ensureSubgroupKey(subgroup, levelId));
      const normalized = mapSubgroups.map((subgroup, index) => ({
        ...subgroup,
        _level: level,
        _index: subgroup._index ?? index
      }));
      const ordered = this.orderSubgroupsByBookingPresence(normalized);
      this._uniqueSubgroupsCache.set(cacheKey, ordered);
    });
  }
  private normalizeSubgroupCacheKey(rawKey: string): string {
    const prefix = 'level_';
    if (rawKey.startsWith(prefix)) {
      return rawKey.slice(prefix.length);
    }
    return rawKey;
  }

  private refreshPreviewSubgroupCache(): void {
    const snapshot: Record<string, any[]> = {};
    this._uniqueSubgroupsCache.forEach((subgroups, key) => {
      const normalizedKey = this.normalizeSubgroupCacheKey(key);
      snapshot[normalizedKey] = (subgroups || []).map(subgroup => ({ ...subgroup }));
    });
    this.previewSubgroupCache = snapshot;
    const payload = Object.entries(snapshot).map(([levelId, subgroups]) => ({
      levelId,
      subgroups: this.summarizeSubgroupsForLog(subgroups as any[])
    }));
    this.logStudentDebug('preview-cache:snapshot', payload);
  }

  /**
   * Obtiene todos los subgrupos únicos para un nivel a través de TODOS los course_dates
   * Útil cuando hay configuración por intervalos y diferentes intervalos tienen diferente número de subgrupos
   */
  getAllUniqueSubgroupsForLevel(level: any): any[] {
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    const cacheKey = `level_${levelId}`;
    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];
    if (Array.isArray(courseDates) && courseDates.length > 0) {
      if (this._uniqueSubgroupsCache.has(cacheKey)) {
        return [...this._uniqueSubgroupsCache.get(cacheKey)!];
      }
      const fromDates = this.buildUniqueSubgroupsFromCourseDates(level, courseDates);
      if (fromDates.length > 0) {
        const orderedForCache = this.orderSubgroupsByBookingPresence(fromDates);
        this._uniqueSubgroupsCache.set(cacheKey, orderedForCache);
        return [...orderedForCache];
      }
    }

    if (this._uniqueSubgroupsCache.has(cacheKey)) {
      return [...this._uniqueSubgroupsCache.get(cacheKey)!];
    }

    if (!Array.isArray(courseDates) || courseDates.length === 0) {
      return [];
    }

    const subgroupCounts = courseDates.map((cd, idx) => {
      if (this.configureLevelsByInterval) {
        const courseGroups = cd?.course_groups || cd?.courseGroups || [];
        let group = null;
        if (Array.isArray(courseGroups)) {
          group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
        } else {
          for (const g of Object.values(courseGroups)) {
            if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
              group = g;
              break;
            }
          }
        }
        const count = (group?.course_subgroups || group?.courseSubgroups || []).length;
        return count;
      }
      const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
      const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
        (sg?.degree_id ?? sg?.degreeId) === levelId
      );
      if (dateLevelSubgroups.length > 0) {
        return dateLevelSubgroups.length;
      }
      const courseGroups = cd?.course_groups || cd?.courseGroups || [];
      let group = null;
      if (Array.isArray(courseGroups)) {
        group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
      } else {
        for (const g of Object.values(courseGroups)) {
          if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
            group = g;
            break;
          }
        }
      }
      const count = (group?.course_subgroups || group?.courseSubgroups || []).length;
      return count;
    });

    const maxSubgroupsCount = Math.max(...subgroupCounts, 0);

    const uniqueSubgroups: any[] = [];
    for (let i = 0; i < maxSubgroupsCount; i++) {
      for (const cd of courseDates) {
        if (this.configureLevelsByInterval) {
          const courseGroups = cd?.course_groups || cd?.courseGroups || [];
          let group = null;
          if (Array.isArray(courseGroups)) {
            group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
          } else {
            for (const g of Object.values(courseGroups)) {
              if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
                group = g;
                break;
              }
            }
          }
          const subgroup = (group?.course_subgroups || group?.courseSubgroups || [])[i];
          if (subgroup) {
            this.ensureSubgroupKey(subgroup, levelId);
            uniqueSubgroups.push({
              ...subgroup,
              _index: i,
              _level: level
            });
            break;
          }
        } else {
          const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
          const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
            (sg?.degree_id ?? sg?.degreeId) === levelId
          );
          if (dateLevelSubgroups[i]) {
            this.ensureSubgroupKey(dateLevelSubgroups[i], levelId);
            uniqueSubgroups.push({
              ...dateLevelSubgroups[i],
              _index: i,
              _level: level
            });
            break;
          }
          const courseGroups = cd?.course_groups || cd?.courseGroups || [];
          let group = null;
          if (Array.isArray(courseGroups)) {
            group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId);
          } else {
            for (const g of Object.values(courseGroups)) {
              if ((g as any)?.degree_id === levelId || (g as any)?.degreeId === levelId) {
                group = g;
                break;
              }
            }
          }
          const subgroup = (group?.course_subgroups || group?.courseSubgroups || [])[i];
          if (subgroup) {
            this.ensureSubgroupKey(subgroup, levelId);
            uniqueSubgroups.push({
              ...subgroup,
              _index: i,
              _level: level
            });
            break;
          }
        }
      }
    }

    const orderedUniqueSubgroups = this.orderSubgroupsByBookingPresence(uniqueSubgroups);
    this._uniqueSubgroupsCache.set(cacheKey, orderedUniqueSubgroups);
    return orderedUniqueSubgroups;
  }
  /**
   * PHASE 2 FIX: Helper method to find a subgroup in original course_dates
   * This ensures we can enrich subgroups from intervalGroupsMap with booking_users
   * from the original nested structure loaded by the API
   */
  private findSubgroupInCourseDates(subgroupId: number): any | null {
    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];

    for (const date of courseDates) {
      const groups = date.course_groups || [];
      for (const group of groups) {
        const subgroups = group.course_subgroups || [];
        const found = subgroups.find((sg: any) => sg.id === subgroupId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private findSubgroupByKeyInCourseDates(targetKey: string): any | null {
    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];

    for (const date of courseDates) {
      const groups = Array.isArray(date?.course_groups) ? date.course_groups : [];
      for (const group of groups) {
        const levelId = group?.degree_id ?? group?.degreeId;
        const subgroups = Array.isArray(group?.course_subgroups) ? group.course_subgroups : [];
        const found = subgroups.find((sg: any) =>
          this.ensureSubgroupKey(sg, levelId) === targetKey
        );
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Pre-calcula todos los intervalos para todos los niveles y subgrupos
   * Esto se llama después de cargar el curso para poblar el mapa
   */
  private recalculateAllSubgroupIntervals(): void {
    this.subgroupIntervalsMap.clear();

    if (!this.intervals || !Array.isArray(this.intervals) || this.intervals.length === 0) {
      return;
    }

    const levelGrop = this.courses.courseFormGroup.controls['levelGrop']?.value || [];

    levelGrop.forEach((level: any) => {
      const uniqueSubgroups = this.getAllUniqueSubgroupsForLevel(level);
      uniqueSubgroups.forEach((subgroup: any) => {
        const filteredIntervals = this.getIntervalsForLevelSubgroup(level, subgroup._index);
        const key = this.buildSubgroupIntervalMapKey(level, subgroup._index ?? 0);
        this.subgroupIntervalsMap.set(key, filteredIntervals);
      });
    });
  }

  /**
   * Obtiene intervalos pre-calculados del mapa
   */
  getSubgroupIntervals(level: any, subgroupIndex: number): any[] {
    const key = this.buildSubgroupIntervalMapKey(level, subgroupIndex);
    if (!this.subgroupIntervalsMap.has(key)) {
      // Only calculate for this specific level, not all levels
      const filteredIntervals = this.getIntervalsForLevelSubgroup(level, subgroupIndex);
      this.subgroupIntervalsMap.set(key, filteredIntervals);
    }
    return this.subgroupIntervalsMap.get(key) || [];
  }

  /**
   * Obtiene los intervalos que tienen datos para un subgrupo específico de un nivel
   * Filtra this.intervals para devolver solo aquellos que tienen fechas con ese subgrupo
   */
  private getIntervalsForLevelSubgroup(level: any, subgroupIndex: number): any[] {
    // Si no hay intervalos configurados, retornar array vacío
    if (!this.intervals || !Array.isArray(this.intervals) || this.intervals.length === 0) {
      return [];
    }

    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];
    if (!Array.isArray(courseDates) || courseDates.length === 0) {
      return [];
    }

    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (levelId == null) {
      return [];
    }

    // Verificar caché
    const targetKey = this.getSubgroupKeyForLevel(level, subgroupIndex);
    const cacheKey = targetKey
      ? `intervals_${levelId}_${targetKey}`
      : `intervals_${levelId}_${subgroupIndex}`;
    if (this._intervalsForSubgroupCache.has(cacheKey)) {
      return this._intervalsForSubgroupCache.get(cacheKey)!;
    }

    // Obtener todos los interval_id únicos que tienen este subgrupo
    const intervalIdsWithSubgroup = new Set<string>();

    courseDates.forEach((cd: any) => {
      // Verificar si esta fecha tiene el subgrupo en la posición indicada
      let hasSubgroup = false;

      const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
      const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
        (sg?.degree_id ?? sg?.degreeId) === levelId
      );
      if (targetKey) {
        if (dateLevelSubgroups.some((sg: any) => this.ensureSubgroupKey(sg, levelId) === targetKey)) {
          hasSubgroup = true;
        } else if (dateLevelSubgroups.length > subgroupIndex && dateLevelSubgroups[subgroupIndex]) {
          hasSubgroup = true;
        }
      } else if (dateLevelSubgroups.length > subgroupIndex && dateLevelSubgroups[subgroupIndex]) {
        hasSubgroup = true;
      }

      // Fallback to old structure if not found
      if (!hasSubgroup) {
        const group = (cd?.course_groups || cd?.courseGroups || []).find((g: any) =>
          (g?.degree_id ?? g?.degreeId) === levelId
        );
        const subgroups = group?.course_subgroups || group?.courseSubgroups || [];
        if (targetKey) {
          if (subgroups.some((sg: any) => this.ensureSubgroupKey(sg, levelId) === targetKey)) {
            hasSubgroup = true;
          } else if (subgroups[subgroupIndex]) {
            hasSubgroup = true;
          }
        } else if (subgroups[subgroupIndex]) {
          hasSubgroup = true;
        }
      }

      // Si tiene el subgrupo, agregar su interval_id al set
      if (hasSubgroup) {
        const intervalId = this.normalizeIntervalIdentifier(cd?.interval_id ?? cd?.intervalId);
        // Incluir null/undefined como un intervalo válido (para fechas sin intervalo asignado)
        intervalIdsWithSubgroup.add(intervalId);
      }
    });

    // Filtrar this.intervals para devolver solo los que están en el set
    const filteredIntervals = this.intervals.filter((interval: any) => {
      const intervalId = this.normalizeIntervalIdentifier(
        interval?.id ?? interval?.interval_id ?? interval?.tempId ?? interval?.key
      );
      return intervalIdsWithSubgroup.has(intervalId);
    });

    // Guardar en caché
    this._intervalsForSubgroupCache.set(cacheKey, filteredIntervals);

    return filteredIntervals;
  }

  /**
   * Obtiene las fechas (course_dates) que tienen un subgrupo específico (por índice) para un nivel
   * HYBRID: Try both structures
   */
  getCourseDatesForLevelSubgroupIndex(level: any, subgroupIndex: number): any[] {
    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];
    if (!Array.isArray(courseDates) || courseDates.length === 0) {
      return [];
    }

    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    const targetKey = this.getSubgroupKeyForLevel(level, subgroupIndex);
    const cacheKey = targetKey
      ? `dates_${levelId}_${targetKey}`
      : `dates_${levelId}_${subgroupIndex}`;

    // Verificar caché
    if (this._subgroupDatesCache.has(cacheKey)) {
      return this._subgroupDatesCache.get(cacheKey)!;
    }

    const result = courseDates.filter(cd => {
      const dateSubgroups = cd?.course_subgroups || cd?.courseSubgroups || [];
      const dateLevelSubgroups = dateSubgroups.filter((sg: any) =>
        (sg?.degree_id ?? sg?.degreeId) === levelId
      );
      if (targetKey) {
        if (dateLevelSubgroups.some((sg: any) => this.ensureSubgroupKey(sg, levelId) === targetKey)) {
          return true;
        }
        if (dateLevelSubgroups.length > subgroupIndex && dateLevelSubgroups[subgroupIndex] != null) {
          return true;
        }
      } else if (dateLevelSubgroups.length > subgroupIndex && dateLevelSubgroups[subgroupIndex] != null) {
        return true;
      }

      // Fallback to old structure: course_subgroups inside course_groups
      const group = (cd?.course_groups || cd?.courseGroups || []).find((g: any) =>
        (g?.degree_id ?? g?.degreeId) === levelId
      );
      const subgroups = group?.course_subgroups || group?.courseSubgroups || [];
      if (targetKey) {
        if (subgroups.some((sg: any) => this.ensureSubgroupKey(sg, levelId) === targetKey)) {
          return true;
        }
        return subgroups.length > subgroupIndex && subgroups[subgroupIndex] != null;
      }
      return subgroups.length > subgroupIndex && subgroups[subgroupIndex] != null;
    });

    // Guardar en caché
    this._subgroupDatesCache.set(cacheKey, result);

    return result;
  }

  /**
   * Verifica si un subgrupo específico tiene fechas en un intervalo dado
   */
  subgroupHasDatesInInterval(level: any, subgroupIndex: number, intervalId: any): boolean {
    const dates = this.getCourseDatesForLevelSubgroupIndex(level, subgroupIndex);
    const targetIntervalId = this.normalizeIntervalIdentifier(intervalId);
    return dates.some(cd => {
      const currentIntervalId = this.normalizeIntervalIdentifier(cd?.interval_id ?? cd?.intervalId);
      return currentIntervalId === targetIntervalId;
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

  copyIntervalConfigToAll(sourceIntervalIdx: number): void {
    this.ensureIntervalGroupsAlignment();

    const sourceKey = this.getIntervalKeyForIndex(sourceIntervalIdx);
    if (!sourceKey) {
      return;
    }

    const sourceConfig = this.intervalGroupsMap[sourceKey];
    if (!sourceConfig) {
      return;
    }

    Object.keys(this.intervalGroupsMap).forEach(key => {
      if (key === sourceKey) {
        return;
      }
      this.intervalGroupsMap[key] = this.cloneGroupsStateMap(sourceConfig);
    });

    this.syncIntervalGroupsArray();
    this.scheduleIntervalGroupsSync();

    this.snackBar.open(
      this.translateService.instant('configuration_copied_to_all_intervals'),
      'OK',
      { duration: 3000 }
    );
  }

  constructor(private fb: UntypedFormBuilder, public dialog: MatDialog,
              private crudService: ApiCrudService, private activatedRoute: ActivatedRoute,
              public router: Router, private schoolService: SchoolService,
              private meetingPointService: MeetingPointService,
              private snackBar: MatSnackBar,
              private courseDateValidation: CourseDateValidationService,
              private dateOverlapValidation: CourseDateOverlapValidationService,
              public translateService: TranslateService,
              public courses: CoursesService,
              private cdr: ChangeDetectorRef,
              private ngZone: NgZone
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.id = this.activatedRoute.snapshot.params.id;
    this.ModalFlux = +this.activatedRoute.snapshot.queryParamMap['params'].step || 0
  }
  detailData: any;

  ngOnInit() {
    if (typeof window !== 'undefined') {
      (window as any).__exportCourseDebugLogs = () => this.exportDebugLogsToFile();
      (window as any).__getCourseDebugLogs = () => (window as any).__COURSE_DEBUG_LOGS || [];
      (window as any).__pushCourseDebugLogs = () => this.pushDebugLogsToBackend();
    }
    this.initializeExtras();
    const courseDatesControl = this.courses.courseFormGroup?.get('course_dates');
    if (courseDatesControl) {
      this.courseDatesChanges = courseDatesControl.valueChanges.subscribe(() => this.refreshCourseDetailCards());
    }
    this.mode = this.id ? 'update' : 'create';
    if (this.mode === 'create') {
      // Refrescar settings de escuela para defaults (price_range) y snapshot de usuario
      this.getFreshSchoolSettings();
    }
    // Ensure intervals is always an array
    this.intervals = Array.isArray(this.intervals) ? this.intervals : [];

    const requests = {
      sports: this.getSports(),
      stations: this.getStations(),
      meetingPoints: this.meetingPointService.list(),
      ...(this.mode === "update" && { monitors: this.getMonitors() }),
    };

    forkJoin(requests).pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ sports, stations, meetingPoints, monitors }) => {
      this.sportData = sports;
      this.stations = stations;
      this.meetingPoints = meetingPoints || [];
      if (this.mode === "update") {
        this.monitors = monitors;
        this.loadCourseData();
      } else {
        this.setupCreateMode();
      }
      this.initializeExtrasForm();
      this.loadSchoolData();
      // Mark component for check when data arrives (required for OnPush change detection)
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      const win = window as any;
      delete win.__exportCourseDebugLogs;
      delete win.__getCourseDebugLogs;
      delete win.__pushCourseDebugLogs;
    }
    // 1. Clear timeout
    if (this.intervalGroupSyncHandle) {
      clearTimeout(this.intervalGroupSyncHandle);
      this.intervalGroupSyncHandle = null;
    }
    if (this.detailCardsChanges) {
      this.detailCardsChanges.unsubscribe();
      this.detailCardsChanges = undefined;
    }
    if (this.courseDatesChanges) {
      this.courseDatesChanges.unsubscribe();
      this.courseDatesChanges = undefined;
    }

    // 2. Clear all caches (7 Map/Set collections)
    if (this._uniqueSubgroupsCache) {
      this._uniqueSubgroupsCache.clear();
    }
    if (this._subgroupDatesCache) {
      this._subgroupDatesCache.clear();
    }
    if (this._intervalsForSubgroupCache) {
      this._intervalsForSubgroupCache.clear();
    }
    if (this.allSubgroupsCache) {
      this.allSubgroupsCache.clear();
    }
    if (this.groupForLevelCache) {
      this.groupForLevelCache.clear();
    }
    if (this.expandedLevels) {
      this.expandedLevels.clear();
    }
    if (this.expandedSubgroups) {
      this.expandedSubgroups.clear();
    }
    if (this.selectedIntervalIndexBySubgroup) {
      this.selectedIntervalIndexBySubgroup.clear();
    }
    this.destroy$.next();
    this.destroy$.complete();

    // 3. Nullify large arrays to allow GC
    if (this.sportData) this.sportData = [];
    if (this.stations) this.stations = [];
    if (this.monitors) this.monitors = [];
    if (this.intervals) this.intervals = [];

    // 4. Cleanup FormGroup if exists
    if (this.courses?.courseFormGroup) {
      this.courses.courseFormGroup.reset();
    }

    // 5. Clear map data structures
    if (this.intervalGroupsMap) {
      Object.keys(this.intervalGroupsMap).forEach(key => {
        delete this.intervalGroupsMap[key];
      });
    }
    if (this.subgroupIntervalsMap) {
      this.subgroupIntervalsMap.clear();
    }

    // 6. Emit completion to all subscribers and complete the Subject
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.detailCardsInitialized = true;
    this.refreshCourseDetailCards();
    this.detailCardsChanges = this.detailCards?.changes.subscribe(() => this.refreshCourseDetailCards());
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
    const defaultHourStart = this.courses.courseFormGroup.controls['hour_min']?.value || this.courses.hours[0];
    const defaultDuration = this.courses.courseFormGroup.controls['duration']?.value || this.courses.duration[0];
    const defaultCourseDate = {
      date: new Date(),
      date_end: new Date(),
      hour_start: defaultHourStart,
      hour_end: this.courses.addMinutesToTime(defaultHourStart, defaultDuration) || this.courses.hours?.[1] || defaultHourStart,
      duration: defaultDuration, // Will be replaced by hour_end for private courses
      weekDays: this.defaultWeekDays()
    };
    this.replaceCourseDatesArray([defaultCourseDate]);
    this.syncPrivatePeriodsFromForm();

    // Initialize intervals array for new courses
    if (!this.intervals || this.intervals.length === 0) {
      this.intervals = [this.createDefaultInterval()];
    }

    this.refreshIntervalGroupStateFromSettings();
    this.syncWeeklyPatternFromSettings();
    this.enforceIntervalGroupAvailability();
    this.syncMeetingPointSelection(true);

    this.Confirm(0);
    this.initTranslationTracking();
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
      .pipe(takeUntil(this.destroy$))
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

              // FORZAR detección de cambios
              this.cdr.detectChanges();
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
        // Reconstruir course_dates desde courseGroups si vienen sin course_groups (para resúmenes)
        this.ensureCourseDatesFromGroups(this.detailData);
        this.assignSubgroupKeysInCourseDates(this.detailData.course_dates);
        this.attachBookingUsersToCourseDates(this.detailData);
        const duplicates = this.courses.countCourseDateSubgroupDuplicates(this.detailData.course_dates);
        if (duplicates > 0) {
          console.warn(`CoursesCreateUpdate detected ${duplicates} duplicate subgroup rows from the GET payload; sanitizing before initializing the form.`);
        }
        this.seedSubgroupDatesIdMapFromCourseDates(this.detailData.course_dates);
        this.courses.settcourseFormGroup(this.detailData);
        this.syncMeetingPointSelection();
        this.syncWeeklyPatternFromSettings();
        // Usar los extras seleccionados que se guardaron en mergeCourseExtras()
        this.courses.courseFormGroup.patchValue({ extras: this.selectedExtrasForForm || [] });

        // Detectar intervalos automáticamente desde course_dates
        const courseDates = this.detailData.course_dates || [];
        const uniqueIntervalIds = new Set(courseDates.map((d: any) => d.interval_id).filter(Boolean));
        const hasCourseGroupsInDates = courseDates.some((cd: any) => Array.isArray(cd?.course_groups) && cd.course_groups.length > 0);
        const hasMultipleIntervalsFromDates = uniqueIntervalIds.size > 1;

        // Si tiene intervalos m+¦ltiples (ya sea por settings o por detección automática), cargarlos ANTES de getDegrees
        if ((hasMultipleIntervals || hasMultipleIntervalsFromDates) && this.detailData.course_type === 1) {
          // Si no está configurado en settings pero tiene múltiples intervalos en fechas, activar automáticamente
          if (!hasMultipleIntervals && hasMultipleIntervalsFromDates) {
            // A partir de aquí debemos tratarlo como multi-intervalo para que el resto del flujo funcione
            hasMultipleIntervals = true;
            this.useMultipleIntervals = true;
            // Añadir al settings para que se detecte correctamente
            if (!this.detailData.settings) {
              this.detailData.settings = {};
            }
            this.detailData.settings.multipleIntervals = true;
          }
          // Cargar los intervalos despu+®s de que el FormGroup est+® listo
          this.loadIntervalsFromCourse(this.detailData, this);
        } else if (this.detailData.course_type === 1) {
          // Inicializar al menos un intervalo para cursos que no tienen m+¦ltiples intervalos
          if (!this.intervals || this.intervals.length === 0) {
            this.intervals = [this.createDefaultInterval()];
          }
        }

        // Si el curso tiene múltiples intervalos, activar automáticamente la configuración por intervalos
        // IMPORTANTE: Configurar ANTES de getDegrees para que el caché se construya correctamente
        if (hasMultipleIntervals && this.detailData.course_type === 1) {
          this.configureLevelsByInterval = true;
          // También actualizar el control del formulario
          this.courses?.courseFormGroup?.get('use_interval_groups')?.setValue(true, { emitEvent: false });
        } else {
          this.configureLevelsByInterval = this.isIntervalGroupModeActive;
        }

        // IMPORTANTE: Cargar el estado de los grupos de intervalos ANTES de sincronizar
        // para que intervalGroupsMap esté poblado cuando buildCourseGroupsForInterval() lo consulte
        if (this.configureLevelsByInterval) {
          if (hasCourseGroupsInDates) {
            this.intervalGroupsMap = this.buildIntervalGroupsFromCourseDates();
          } else {
            this.refreshIntervalGroupStateFromSettings();
          }

          // FIX #6: Asegurar que levelGrop esté poblado con los niveles del curso
          // buildCourseGroupsForInterval() necesita levelGrop para mapear los niveles
          const currentLevelGrop = this.courses?.courseFormGroup?.get('levelGrop')?.value || [];

          if (currentLevelGrop.length === 0) {
            let degreesMap = new Map<number, any>();

            // FIX #8: Extract level IDs from intervalGroupsMap and course_subgroups
            // to populate levelGrop when it's empty
            const courseDatesList = this.detailData?.course_dates || [];

            // Iterate through course_dates and extract unique degree_ids from course_subgroups
            courseDatesList.forEach((cd: any) => {
              const courseSubgroups = cd.course_subgroups || cd.courseSubgroups || [];
              courseSubgroups.forEach((subgroup: any) => {
                const degreeId = subgroup.degree_id || subgroup.degreeId;
                if (degreeId && !degreesMap.has(degreeId)) {
                  degreesMap.set(degreeId, {
                    id: degreeId,
                    degree_id: degreeId,
                    level: subgroup.level || subgroup.name || 'Level ' + degreeId,
                    name: subgroup.name,
                    color: subgroup.color,
                    icon: subgroup.icon
                  });
                }
              });
            });

            const degrees = Array.from(degreesMap.values());
            if (degrees.length > 0) {
              this.courses?.courseFormGroup?.patchValue({ levelGrop: degrees });
            }
          }

          // FIX #7: Activar niveles en intervalGroupsMap basado en levelGrop
          // Los niveles en levelGrop deben estar activos en intervalGroupsMap
          const updatedLevelGrop = this.courses?.courseFormGroup?.get('levelGrop')?.value || [];
          const levelGropIds = new Set(updatedLevelGrop.map((l: any) => String(l.id)));

          // Activar los niveles en intervalGroupsMap que están en levelGrop
          Object.keys(this.intervalGroupsMap).forEach(key => {
            const intervalConfig = this.intervalGroupsMap[key];
            Object.keys(intervalConfig).forEach(levelKey => {
              if (levelGropIds.has(levelKey) && intervalConfig[levelKey]) {
                // Activar este nivel
                intervalConfig[levelKey].active = true;
              }
            });
          });
        }

        // Sincronizar intervalGroupsMap a course_dates ANTES de getDegrees
        // para que course_dates[0].course_groups[i].course_subgroups esté disponible
        // cuando getAllUniqueSubgroupsForLevel() intente leerlo
        if (this.configureLevelsByInterval) {
          this.syncIntervalsToCourseFormGroup();
        }

        // Llamar getDegrees DESPUÉS de sincronizar para que lea los course_dates correctamente
        this.getDegrees();

        // Cargar descuentos existentes
        this.loadDiscountsFromCourse();
        this.enforceIntervalGroupAvailability();
        // NO llamar refreshIntervalGroupStateFromSettings aquí porque sobrescribe el intervalGroupsMap
        // que acabamos de construir correctamente desde course_dates en loadIntervalsFromCourse

        if (this.configureLevelsByInterval) {
          this.invalidateIntervalGroupTemplate();
          this.ensureIntervalGroupsAlignment();
          this.scheduleIntervalGroupsSync();
        }
        this.initTranslationTracking();
        this.initialHeavySnapshot = this.buildHeavySnapshot();
        this.loading = false
        // setTimeout(() => (this.loading = false), 0);
      });
  }

  /**
   * M+®todo seguro para obtener el array de intervalos desde el FormGroup principal
   * Este m+®todo garantiza que siempre se devuelva un FormArray, incluso si a+¦n no est+í inicializado
   */
  getIntervalsArray(): FormArray {
    // Verificar si el FormGroup principal existe
    if (!this.courses.courseFormGroup) {
      console.warn('courseFormGroup no est+í inicializado. Devolviendo un FormArray vac+¡o.');
      return this.fb.array([]);
    }

    // Intentar obtener el FormArray de intervals_ui
    const intervals = this.courses.courseFormGroup.get('intervals_ui');

    // Si el control no existe o no es un FormArray, devolver uno vac+¡o
    if (!intervals || !(intervals instanceof FormArray)) {
      console.warn('intervals_ui no est+í inicializado o no es un FormArray. Devolviendo un FormArray vac+¡o.');

      // Si el control no existe pero el FormGroup s+¡, podemos intentar inicializarlo
      if (this.courses.courseFormGroup) {
        const emptyArray = this.fb.array([]);
        this.courses.courseFormGroup.setControl('intervals_ui', emptyArray);
        return emptyArray;
      }

      // Como fallback, devolvemos un array vac+¡o
      return this.fb.array([]);
    }

    // Si todo est+í bien, devolver el FormArray
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

    // Formatear extras de configuración
    const formattedSettingsExtras = settingsExtras.map(extra => ({
      id: extra.id.toString(),
      name: extra.name,
      product: extra.product,
      price: parseFloat(extra.price) || 0,
      tva: extra.tva || 0,
      status: extra.status || false,
    }));

    // Crear un helper para comparar extras (maneja campos invertidos por datos legacy)
    const createExtraKeys = (name: string, productOrDesc: string | undefined) => {
      const keys = [];
      if (productOrDesc) {
        keys.push(`${name}|${productOrDesc}`);      // Formato normal
        keys.push(`${productOrDesc}|${name}`);       // Formato invertido (legacy)
      }
      keys.push(`${name}|`);                         // Solo name (sin product)
      return keys;
    };

    // Crear un Set con todas las claves posibles de extras seleccionados (course_extras)
    const selectedExtraKeys = new Set<string>();
    (this.detailData.course_extras || []).forEach(extra => {
      const keys = createExtraKeys(extra.name, extra.description);
      keys.forEach(k => selectedExtraKeys.add(k));
    });

    // Unir settings extras sin duplicados (usar name como clave principal)
    const extrasMap = new Map();

    formattedSettingsExtras.forEach(extra => {
      // Usar solo el name como clave para evitar duplicados
      const primaryKey = extra.name;

      // Si ya existe este extra, mantener el que tenga product definido
      if (extrasMap.has(primaryKey)) {
        const existing = extrasMap.get(primaryKey);
        // Sobrescribir solo si el nuevo tiene product y el existente no
        if (extra.product && !existing.product) {
          extrasMap.set(primaryKey, extra);
        }
      } else {
        extrasMap.set(primaryKey, extra);
      }
    });

    this.extras = Array.from(extrasMap.values());

    // Guardar los extras seleccionados para usarlos después
    this.selectedExtrasForForm = this.extras.filter(extra => {
      const possibleKeys = createExtraKeys(extra.name, extra.product);
      return possibleKeys.some(k => selectedExtraKeys.has(k));
    });
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
    this.schoolService.getSchoolData().pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.schoolData = data.data;
      this.cdr.markForCheck();
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

  /**
   * Elimina un extra temporal del array y del FormControl si está seleccionado
   */
  deleteTemporaryExtra(index: number, item: any) {
    const matchesExtra = (a: any, b: any) => {
      return (a.name === b.name && a.product === b.product) ||
             (a.name === b.product && a.product === b.name) ||
             (a.name === b.name && !a.product && !b.product);
    };

    // Eliminar del array de extras
    this.extras.splice(index, 1);

    // Eliminar del FormControl si está seleccionado
    if (this.courses.courseFormGroup.controls['course_type'].value === 3) {
      // Para cursos tipo 3, eliminar de todos los grupos
      const groups = this.courses.courseFormGroup.controls['settings']?.value?.groups;
      if (groups) {
        groups.forEach((group: any) => {
          if (group.extras) {
            group.extras = group.extras.filter((a: any) => !matchesExtra(a, item));
          }
        });
      }
    } else {
      // Para otros tipos de curso
      const extras = this.courses.courseFormGroup.controls['extras']?.value || [];
      this.courses.courseFormGroup.patchValue({
        extras: extras.filter((a: any) => !matchesExtra(a, item))
      });
    }
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

  private applyMeetingPointData(meetingPoint: any | null) {
    const payload = {
      meeting_point: meetingPoint?.name || '',
      meeting_point_address: meetingPoint?.address || '',
      meeting_point_instructions: meetingPoint?.instructions || ''
    };
    this.courses.courseFormGroup.patchValue(payload, { emitEvent: false });
    this.selectedMeetingPointId = meetingPoint?.id ?? null;
  }

  private syncMeetingPointSelection(isNewCourse: boolean = false) {
    if (!this.meetingPoints.length) {
      if (isNewCourse) {
        this.applyMeetingPointData(null);
      }
      return;
    }

    const currentName = this.courses.courseFormGroup.controls['meeting_point']?.value;
    const matchingPoint = this.meetingPoints.find(point => point.name === currentName);

    if (matchingPoint) {
      this.applyMeetingPointData(matchingPoint);
      return;
    }

    if (isNewCourse) {
      this.applyMeetingPointData(this.meetingPoints[0]);
    } else {
      this.applyMeetingPointData(null);
    }
  }

  onMeetingPointSelected(meetingPointId: number | null) {
    if (meetingPointId === null || meetingPointId === undefined) {
      this.applyMeetingPointData(null);
      return;
    }

    const selectedPoint = this.meetingPoints.find(point => point.id === meetingPointId);
    this.applyMeetingPointData(selectedPoint || null);
  }

  getDegrees = () => this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.courses.courseFormGroup.controls['school_id'].value + '&sport_id=' + this.courses.courseFormGroup.controls['sport_id'].value).pipe(takeUntil(this.destroy$)).subscribe((data) => {
    // Initialize detailData if it doesn't exist
    if (!this.detailData) {
      this.detailData = {};
    }
    this.detailData.degrees = [];
    data.data.forEach((element: any) => {
      // Incluir TODOS los grados, tanto activos como inactivos
      this.detailData.degrees.push({ ...element, }); //Subgrupo: this.getSubGroups(element.id)
    });

    // Leer del FormArray para detectar cuáles niveles están en course_dates
    const courseDatesFromForm = this.courses.courseFormGroup.controls['course_dates']?.value || [];

    // Crear un Set con los IDs de niveles que están en course_dates
    const levelsInCourseDates = new Set<number>();
    if (courseDatesFromForm && Array.isArray(courseDatesFromForm)) {
      courseDatesFromForm.forEach((cs: any) => {
        // IMPORTANTE: Check BOTH structures:
        // 1. NEW structure: course_subgroups at date level
        if (cs.course_subgroups && Array.isArray(cs.course_subgroups)) {
          cs.course_subgroups.forEach((subgroup: any) => {
            if (subgroup && subgroup.degree_id) {
              levelsInCourseDates.add(subgroup.degree_id);
            }
          });
        }

        // 2. OLD structure: course_subgroups inside course_groups
        if (cs.course_groups) {
          const groupsArray = Array.isArray(cs.course_groups)
            ? cs.course_groups
            : Object.values(cs.course_groups);
          groupsArray.forEach((group: any) => {
            if (group && group.degree_id) {
              levelsInCourseDates.add(group.degree_id);
            }
          });
        }
      });
    }

    // Obtener el estado actual de levelGrop para preservar selecciones y valores
    const currentLevelGrop = this.courses.courseFormGroup.controls['levelGrop']?.value || [];
    const currentStateMap = new Map<number, any>();
    currentLevelGrop.forEach((level: any) => {
      if (level?.id) {
        currentStateMap.set((level?.id ?? level?.degree_id), {
          active: level.active,
          max_participants: level.max_participants,
          age_min: level.age_min,
          age_max: level.age_max
        });
      }
    });

    // Crear levelGrop con TODOS los grados
    const levelGrop = this.detailData.degrees.map((level: any) => {
      const currentState = currentStateMap.get(level?.id ?? level?.degree_id);

      // Determinar si está activo:
      // 1. Si está en course_dates, activo = true
      // 2. Si el usuario lo había seleccionado antes, mantener su estado
      // 3. Si no, inactivo = false
      let isActive = levelsInCourseDates.has(level?.id ?? level?.degree_id);
      if (currentState?.active !== undefined && currentLevelGrop.length > 0) {
        isActive = currentState.active;
      }

      return {
        ...level,
        active: isActive,
        max_participants: currentState?.max_participants ?? level.max_participants,
        // Preservar age_min/age_max del currentState si existen (valores del curso cargado)
        age_min: currentState?.age_min ?? level.age_min,
        age_max: currentState?.age_max ?? level.age_max,
      };
    });

    // FIX: Actualizar datos desde course_dates SIEMPRE (no solo en primera carga)
    // Tomar valores del PRIMER grupo encontrado (no sobreescribir con grupos subsecuentes)

    const firstDetailGroups = this.getFirstCourseDateGroupsFromDetail();
    const levelIdsWithDetailAges = new Set<number | string>();

    if (firstDetailGroups.length) {
      levelGrop.forEach((level: any) => {
        const levelId = level?.id ?? level?.degree_id;
        if (levelId == null) {
          return;
        }

        const matchingGroup = firstDetailGroups.find((group: any) => (group?.degree_id ?? group?.id ?? group?.degreeId) === levelId);
        if (!matchingGroup) {
          return;
        }

        const resolvedAgeMin = this.getSavedAgeFromGroup(matchingGroup, 'age_min');
        const resolvedAgeMax = this.getSavedAgeFromGroup(matchingGroup, 'age_max');
        if (resolvedAgeMin == null && resolvedAgeMax == null) {
          return;
        }

        if (resolvedAgeMin != null) {
          level.age_min = resolvedAgeMin;
        }
        if (resolvedAgeMax != null) {
          level.age_max = resolvedAgeMax;
        }

        this.applySavedGroupToLevel(level, matchingGroup);
        levelIdsWithDetailAges.add(levelId);
      });
    }

    if (courseDatesFromForm.length > 0) {
      levelGrop.forEach((level: any) => {
        const levelId = level?.id ?? level?.degree_id;
        if (levelId == null) {
          return;
        }

        if (levelIdsWithDetailAges.has(levelId)) {
          return;
        }

        let fallbackCandidate: {
          group: any;
          resolvedAgeMin: number | null;
          resolvedAgeMax: number | null;
        } | null = null;

        let matchedAges = false;

        outerLoop:
        for (const cs of courseDatesFromForm) {
          const groupsArray = cs.course_groups
            ? (Array.isArray(cs.course_groups) ? cs.course_groups : Object.values(cs.course_groups))
            : [];

          for (const group of groupsArray) {
            if (group && (group.degree_id ?? group.id ?? group.degreeId) === levelId) {

              const resolvedAgeMin =
                this.getSavedAgeFromGroup(group, 'age_min') ??
                this.getSavedAgeFromCourseDate(cs, group.degree_id ?? (levelId), 'age_min');
              const resolvedAgeMax =
                this.getSavedAgeFromGroup(group, 'age_max') ??
                this.getSavedAgeFromCourseDate(cs, group.degree_id ?? (levelId), 'age_max');

              const hasAges = resolvedAgeMin != null || resolvedAgeMax != null;

              if (!fallbackCandidate) {
                fallbackCandidate = { group, resolvedAgeMin, resolvedAgeMax };
              }

              if (hasAges) {
                if (resolvedAgeMin != null) {
                  level.age_min = resolvedAgeMin;
                }

                if (resolvedAgeMax != null) {
                  level.age_max = resolvedAgeMax;
                }

                this.applySavedGroupToLevel(level, group);
                matchedAges = true;
                break outerLoop;
              }
            }
          }
        }

        if (!matchedAges && fallbackCandidate) {
          if (fallbackCandidate.resolvedAgeMin != null) {
            level.age_min = fallbackCandidate.resolvedAgeMin;
          }

          if (fallbackCandidate.resolvedAgeMax != null) {
            level.age_max = fallbackCandidate.resolvedAgeMax;
          }

          this.applySavedGroupToLevel(level, fallbackCandidate.group);
        }
      });
    }

    // Ordenar: activos primero
    levelGrop.sort((a: any) => (a.active ? -1 : 1));

    this.courses.courseFormGroup.patchValue({ levelGrop });

    // Solo regenerar template si es la primera vez o si cambió el deporte/escuela
    if (currentLevelGrop.length === 0) {
      this.baseIntervalGroupTemplate = {};
      this.ensureIntervalGroupsAlignment();
    }

    // LIMPIAR CACHÉ antes de recalcular subgrupos
    this.clearSubgroupsCache();  // This already calls recalculateAllSubgroupIntervals() internally
    this.clearGroupCache();

    // FORZAR detección de cambios después de cargar niveles
    this.cdr.detectChanges();
  });

  private getSavedAgeFromGroup(group: any, field: 'age_min' | 'age_max'): number | null {
    if (!group) {
      return null;
    }

    if (group[field] != null) {
      return this.parseNumber(group[field]) ?? group[field];
    }

    const nested = Array.isArray(group.course_subgroups)
      ? group.course_subgroups
      : Array.isArray(group.subgroups)
        ? group.subgroups
        : [];

    for (const subgroup of nested) {
      if (subgroup && subgroup[field] != null) {
        return this.parseNumber(subgroup[field]) ?? subgroup[field];
      }
    }

    return null;
  }

  private getSavedAgeFromCourseDate(courseDate: any, levelId: number | null | undefined, field: 'age_min' | 'age_max'): number | null {
    if (!courseDate || levelId == null) {
      return null;
    }

    const normalizedSubgroups = Array.isArray(courseDate.course_subgroups)
      ? courseDate.course_subgroups
      : Array.isArray(courseDate.subgroups)
        ? courseDate.subgroups
        : [];

    for (const subgroup of normalizedSubgroups) {
      if ((subgroup?.degree_id ?? subgroup?.degreeId) == levelId && subgroup[field] != null) {
        return this.parseNumber(subgroup[field]) ?? subgroup[field];
      }
    }

    return null;
  }

  private applySavedGroupToLevel(level: any, group: any): void {
    level.old = true;
    if (group.course_subgroups && Array.isArray(group.course_subgroups) && group.course_subgroups.length > 0) {
      level.max_participants = group.course_subgroups[0].max_participants;
      level.course_subgroups = group.course_subgroups;
    }
    level.visible = false;
  }

  private getFirstCourseDateGroupsFromDetail(): any[] {
    const firstDate = Array.isArray(this.detailData?.course_dates) ? this.detailData.course_dates[0] : null;
    if (!firstDate) {
      return [];
    }

    const groups = firstDate.course_groups ?? firstDate.groups;
    if (!groups) {
      return [];
    }

    if (Array.isArray(groups)) {
      return groups;
    }

    return Object.values(groups);
  }

  private getTranslationsValue(): any {
    const control = this.courses?.courseFormGroup?.controls?.['translations'];
    let translations = control ? control.value : {};
    if (typeof translations === 'string') {
      try {
        translations = JSON.parse(translations) || {};
      } catch {
        translations = {};
      }
    }
    return translations || {};
  }

  private captureBaseTranslationSnapshot(): void {
    const controls = this.courses?.courseFormGroup?.controls;
    if (!controls) {
      return;
    }
    this.lastBaseTranslationSnapshot = {
      name: controls['name']?.value || '',
      short_description: controls['short_description']?.value || '',
      description: controls['description']?.value || ''
    };
  }

  private initTranslationTracking(): void {
    const controls = this.courses?.courseFormGroup?.controls;
    if (!controls) {
      return;
    }

    if (!this.translationWatcherAttached) {
      ['name', 'short_description', 'description'].forEach((field) => {
        const control = controls[field];
        if (control?.valueChanges) {
          control.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              if (!this.translationListenerReady) {
                return;
              }
              this.baseTranslationDirty = true;
            });
        }
      });
      this.translationWatcherAttached = true;
    }

    this.translationListenerReady = false;
    this.captureBaseTranslationSnapshot();
    this.baseTranslationDirty = false;
    this.translationListenerReady = true;
  }

  private async getFreshSchoolSettings(): Promise<any> {
    try {
      const schoolId = this.user?.schools?.[0]?.id;
      if (!schoolId) {
        return this.user?.schools?.[0]?.settings || {};
      }
      const res: any = await firstValueFrom(this.crudService.get(`/schools/${schoolId}`));
      const settings = res?.data?.settings;
      if (settings) {
        const parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
        // Actualizar snapshot local del usuario para evitar defaults obsoletos
        const raw = localStorage.getItem('boukiiUser');
        if (raw) {
          const parsedUser = JSON.parse(raw);
          if (parsedUser?.schools?.length) {
            parsedUser.schools[0].settings = parsedSettings;
            localStorage.setItem('boukiiUser', JSON.stringify(parsedUser));
            this.user = parsedUser;
          }
        }
        return parsedSettings;
      }
    } catch (e) {
      console.warn('No se pudo refrescar settings de la escuela, se usan settings locales.', e);
    }
    return this.user?.schools?.[0]?.settings || {};
  }

  private normalizeTranslationsPayload(translations: any): any {
    if (typeof translations === 'string') {
      try {
        translations = JSON.parse(translations) || {};
      } catch {
        translations = {};
      }
    }
    return translations || {};
  }

  private buildHeavySnapshot(): string {
    try {
      const raw = this.courses?.courseFormGroup?.getRawValue?.() || {};
      const settings = raw?.settings;
      const normalizedSettings = typeof settings === 'string' ? settings : JSON.stringify(settings || {});
      const sanitizedDates = this.courses ? this.courses.sanitizeCourseDatesStructure(raw.course_dates || []) : (raw.course_dates || []);
      return JSON.stringify({
        course_dates: sanitizedDates,
        settings: normalizedSettings,
        levelGrop: raw.levelGrop,
        extras: raw.extras,
        price_range: raw.price_range,
        course_type: raw.course_type,
        is_flexible: raw.is_flexible,
      });
    } catch {
      return '';
    }
  }

  /**
   * Detecta cambios REALES en campos pesados comparando contadores y valores clave
   * en lugar de comparar JSON completos (que dan falsos positivos)
   */
  private detectRealHeavyChanges(): boolean {
    if (!this.initialHeavySnapshot || !this.courses?.courseFormGroup) {
      return false; // Sin snapshot inicial, asumir que no hay cambios pesados
    }

    try {
      const initial = JSON.parse(this.initialHeavySnapshot);
      const current = this.courses.courseFormGroup.getRawValue();

      // Comparar contadores de arrays (más confiable que comparar objetos completos)
      const courseDatesCountChanged = (initial.course_dates?.length || 0) !== (current.course_dates?.length || 0);
      const levelGropCountChanged = (initial.levelGrop?.length || 0) !== (current.levelGrop?.length || 0);
      const extrasCountChanged = (initial.extras?.length || 0) !== (current.extras?.length || 0);

      // Comparar campos escalares simples
      const courseTypeChanged = initial.course_type !== current.course_type;
      const isFlexibleChanged = initial.is_flexible !== current.is_flexible;

      // Comparar price_range por longitud y stringify simple
      const priceRangeChanged = JSON.stringify(initial.price_range || []) !== JSON.stringify(current.price_range || []);

      // Hashes ligeros de campos relevantes (edades y cupos por grupo/subgrupo)
      const initialLevelSignature = this.buildLevelStructureHash(initial.levelGrop);
      const currentLevelSignature = this.buildLevelStructureHash(current.levelGrop);
      const levelStructureChanged = initialLevelSignature !== currentLevelSignature;

      const initialSubgroupsSignature = this.buildCourseDateStructureHash(initial.course_dates);
      const currentSubgroupsSignature = this.buildCourseDateStructureHash(current.course_dates);
      const subgroupStructureChanged = initialSubgroupsSignature !== currentSubgroupsSignature;

      const heavyChangeDetected = courseDatesCountChanged || levelGropCountChanged ||
                                   extrasCountChanged || courseTypeChanged ||
                                   isFlexibleChanged || priceRangeChanged ||
                                   levelStructureChanged || subgroupStructureChanged;

      return heavyChangeDetected;
    } catch (error) {
      console.error('[detectRealHeavyChanges] Error:', error);
      return false; // En caso de error, asumir que no hay cambios pesados (usar PATCH)
    }
  }

  private buildLevelStructureHash(levels: any[]): string {
    if (!Array.isArray(levels) || !levels.length) {
      return '[]';
    }

    const normalized = levels.map((level: any) => {
      const id = level?.id ?? level?.degree_id ?? level?.degreeId ?? null;
      const ageMin = this.parseNumber(level?.age_min);
      const ageMax = this.parseNumber(level?.age_max);
      const maxParticipants = this.parseNumber(level?.max_participants);
      const subgroups = this.normalizeSubgroupSnapshot(level?.course_subgroups || level?.subgroups);

      return {
        ...(id != null ? { id: String(id) } : {}),
        ...(ageMin != null ? { age_min: ageMin } : {}),
        ...(ageMax != null ? { age_max: ageMax } : {}),
        ...(maxParticipants != null ? { max_participants: maxParticipants } : {}),
        ...(subgroups ? { subgroups } : {})
      };
    });

    return JSON.stringify(normalized);
  }

  private buildCourseDateStructureHash(courseDates: any[]): string {
    if (!Array.isArray(courseDates) || !courseDates.length) {
      return '[]';
    }

    const normalized = courseDates.map((courseDate: any) => {
      const courseGroups = Array.isArray(courseDate?.course_groups) ? courseDate.course_groups : [];
      const groups = courseGroups.map((group: any) => {
        const degreeId = group?.degree_id ?? group?.degreeId ?? group?.id ?? null;
        const ageMin = this.parseNumber(group?.age_min);
        const ageMax = this.parseNumber(group?.age_max);
        const maxParticipants = this.parseNumber(group?.max_participants);
        const subgroups = this.normalizeSubgroupSnapshot(group?.course_subgroups || group?.subgroups);

        return {
          ...(degreeId != null ? { degree_id: String(degreeId) } : {}),
          ...(ageMin != null ? { age_min: ageMin } : {}),
          ...(ageMax != null ? { age_max: ageMax } : {}),
          ...(maxParticipants != null ? { max_participants: maxParticipants } : {}),
          ...(subgroups ? { subgroups } : {})
        };
      });

      return {
        ...(courseDate?.id != null ? { id: String(courseDate.id) } : {}),
        ...(courseDate?.interval_id != null ? { interval_id: String(courseDate.interval_id) } : {}),
        groups
      };
    });

    return JSON.stringify(normalized);
  }

  private normalizeSubgroupSnapshot(subgroups: any): any[] | null {
    if (!Array.isArray(subgroups) || !subgroups.length) {
      return null;
    }

    return subgroups.map((subgroup: any) => {
      const slotId = subgroup?.subgroup_dates_id ?? subgroup?.id ?? subgroup?.degree_id ?? null;
      const ageMin = this.parseNumber(subgroup?.age_min);
      const ageMax = this.parseNumber(subgroup?.age_max);
      const maxParticipants = this.parseNumber(subgroup?.max_participants);

      return {
        ...(slotId != null ? { slot: String(slotId) } : {}),
        ...(ageMin != null ? { age_min: ageMin } : {}),
        ...(ageMax != null ? { age_max: ageMax } : {}),
        ...(maxParticipants != null ? { max_participants: maxParticipants } : {})
      };
    });
  }

  /**
   * Detecta si SOLO cambiaron campos ligeros (textos, traducciones, etc.)
   * usando el estado dirty del FormGroup
   */
  private onlyLightweightFieldsChanged(): boolean {
    if (!this.courses?.courseFormGroup) {
      return false;
    }

    const form = this.courses.courseFormGroup;

    // Campos ligeros que pueden usar PATCH
    const lightweightFields = [
      'name',
      'description',
      'short_description',
      'translations',
      'claim_text',
      'summary',
      'image'
    ];

    // Campos pesados que requieren UPDATE completo
    const heavyFields = [
      'course_dates',
      'levelGrop',
      'extras',
      'price_range',
      'settings',
      'course_type',
      'is_flexible'
    ];

    // Verificar si algún campo pesado cambió
    const heavyFieldChanged = heavyFields.some(field => {
      const control = form.get(field);
      return control && control.dirty;
    });

    if (heavyFieldChanged) {
      return false;
    }

    // Verificar si al menos un campo ligero cambió
    const lightweightFieldChanged = lightweightFields.some(field => {
      const control = form.get(field);
      return control && control.dirty;
    });

    return lightweightFieldChanged && !heavyFieldChanged;
  }

  private hasHeavyChanges(): boolean {
    if (!this.initialHeavySnapshot) {
      console.warn('[hasHeavyChanges] No initial snapshot, assuming heavy changes');
      return true;
    }
    const current = this.buildHeavySnapshot();
    const hasChanges = current !== this.initialHeavySnapshot;

    return hasChanges;
  }

  private async translateViaApi(languages?: string[], trackLang?: string): Promise<boolean> {
    if (!this.id) {
      return false;
    }

    const formValue = this.courses?.courseFormGroup?.value || {};
    const { name, short_description, description } = formValue;
    if (!name || !short_description || !description) {
      return false;
    }

    const payload: any = { name, short_description, description };
    const langs = languages && languages.length ? languages : this.Translate.map(t => t.Code);
    if (langs?.length) {
      payload.languages = langs;
    }

    if (trackLang) {
      this.translatingLangs.add(trackLang);
    } else {
      this.bulkTranslationInProgress = true;
    }
    this.cdr.markForCheck();

    try {
      const response: any = await this.crudService.translateCourse(this.id, payload).toPromise();
      if (response?.success && response?.data?.translations) {
        const updated = this.normalizeTranslationsPayload(response.data.translations);
        const merged = { ...this.getTranslationsValue(), ...updated };
        this.courses.courseFormGroup.patchValue({ translations: merged }, { emitEvent: false });
        this.baseTranslationDirty = false;
        this.captureBaseTranslationSnapshot();
        this.manuallyEditedTranslations.clear();
        if (response?.data?.fallback_enqueued) {
          this.snackBar.open('Translations will continue in background', this.translateService.instant('close'), {
            duration: 4000
          });
        }
        return true;
      }
      this.showErrorMessage(response?.message || 'No se pudo traducir el curso.');
      return false;
    } catch (error) {
      console.error('Error translating course', error);
      this.showErrorMessage('Error translating course.');
      return false;
    } finally {
      if (trackLang) {
        this.translatingLangs.delete(trackLang);
      } else {
        this.bulkTranslationInProgress = false;
      }
      this.cdr.markForCheck();
    }
  }

  private async autoTranslateFromBaseIfNeeded(): Promise<void> {
    if (this.mode !== 'update' || !this.baseTranslationDirty || this.bulkTranslationInProgress) {
      return;
    }

    await this.translateViaApi();
  }

  onTranslationFieldChange(lang: string, field: 'name' | 'short_description' | 'description', value: any): void {
    const translations = this.getTranslationsValue();
    const langData = translations[lang] || { name: '', short_description: '', description: '' };
    const nextValue = value?.html ?? value ?? '';

    translations[lang] = {
      ...langData,
      [field]: nextValue
    };

    this.courses.courseFormGroup.patchValue({ translations }, { emitEvent: false });
    this.manuallyEditedTranslations.add(lang);
  }

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

            // Inicializamos el objeto de traducciones con valores vac+¡os
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
                    return { lang, name: '', short_description: '', description: '' }; // Retorna un objeto vac+¡o si hay error
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
        } else {
          this.autoTranslateFromBaseIfNeeded();
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
      // Solo aplicar price_range de settings al CREAR cursos nuevos (flex privados) y si aún no se inicializó
      if (!this.priceRangeInitialized &&
        this.courses.courseFormGroup.controls['course_type'].value === 2 &&
        this.mode === 'create') {
        const currentRange = this.courses.courseFormGroup.controls['price_range'].value;
        const hasCustomRange = Array.isArray(currentRange) && currentRange.some((row: any) => {
          if (!row || typeof row !== 'object') return false;
          const entries = Object.entries(row).filter(([key]) => key !== 'intervalo');
          return entries.some(([, val]) => val);
        });
        if (!hasCustomRange) {
          this.getFreshSchoolSettings().then((settings) => {
            const durations = this.courses.getFilteredDuration(settings);
            const maxParticipants = this.courses.courseFormGroup.controls["max_participants"].value || 6;

            let Range = this.generarIntervalos(
              maxParticipants,
              durations.length,
              durations
            );

            const priceRanges = settings?.prices_range?.prices?.map((p: any) => ({
              ...p,
              intervalo: p.intervalo.replace(/^(\d+)h$/, "$1h 0min") // Convierte "1h" en "1h0min" para que coincida con durations
            })) || [];

            Range = Range.map(intervalo => {
              const matchingPrice = priceRanges.find((p: any) => p.intervalo === intervalo.intervalo);
              return matchingPrice ? { ...intervalo, ...matchingPrice } : intervalo;
            });

            this.courses.courseFormGroup.patchValue({ price_range: Range });
            this.priceRangeInitialized = true;
            this.cdr.markForCheck();
          });
        } else {
          this.priceRangeInitialized = true;
        }
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
    if (this.ModalFlux === 5) {
      this.autoTranslateFromBaseIfNeeded();
    }
  }

  onPrimaryAction(): void {
    if (this.mode === 'create') {
      this.Confirm(1);
      return;
    }
    this.openEditConfirmation();
  }

  private openEditConfirmation(): void {
    this.editModal = true;
    this.setEditFunction('endCourse');
  }

  async translateCourse(lang: string): Promise<void> {
    if (this.translatingLangs.has(lang) || this.bulkTranslationInProgress) {
      return;
    }

    if (this.mode === 'create' || !this.id) {
      // En modo creación usamos la traducción directa para pre-rellenar antes de guardar
      this.translatingLangs.add(lang);
      this.cdr.markForCheck();
      try {
        const translations = this.getTranslationsValue();
        const currentTranslation = translations[lang] || {};

        const translatedName = await this.crudService.translateText(this.courses.courseFormGroup.value.name, lang.toUpperCase()).toPromise();
        const translatedShortDescription = await this.crudService.translateText(this.courses.courseFormGroup.value.short_description, lang.toUpperCase()).toPromise();
        const translatedDescription = await this.crudService.translateText(this.courses.courseFormGroup.value.description, lang.toUpperCase()).toPromise();

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
        this.manuallyEditedTranslations.delete(lang);

      } catch (error) {
        console.error(`Error translating to ${lang}:`, error);
      } finally {
        this.translatingLangs.delete(lang);
        this.cdr.markForCheck();
      }
      return;
    }

    await this.translateViaApi([lang], lang);
  }

  private async ensureTranslationsBeforeSave(): Promise<void> {
    if (this.mode !== 'update' || !this.baseTranslationDirty || this.bulkTranslationInProgress) {
      return;
    }
    await this.translateViaApi();
  }

  find = (array: any[], key: string, value: string | boolean) => array.find((a: any) => value ? a[key] === value : a[key])
  filter = (array: any[], key: string, value: string | boolean) => array.filter((a: any) => value ? a[key] === value : a[key])

  selectLevel = (event: any, i: number) => {
    const levelGrop = this.courses.courseFormGroup.controls['levelGrop'].value;
    const course_dates = this.courses.courseFormGroup.controls['course_dates'].value;
    let isActive: boolean;
    if (typeof event === 'boolean') {
      isActive = event;
    } else if (event?.checked !== undefined) {
      isActive = event.checked;
    } else if (event?.target?.checked !== undefined) {
      isActive = event.target.checked;
    } else {
      isActive = !levelGrop[i].active;
    }

    levelGrop[i].active = isActive;
    if (isActive && (levelGrop[i].max_participants == null || levelGrop[i].max_participants === '')) {
      levelGrop[i].max_participants = this.courses.courseFormGroup.controls['max_participants']?.value ?? null;
    }

    if (isActive) {
      levelGrop[i].max_participants = levelGrop[i].max_participants ?? this.courses.courseFormGroup.controls['max_participants'].value;

      // Si estamos configurando niveles DIFERENTES por intervalo
      if (this.configureLevelsByInterval) {
        // En modo por intervalos, NO marcar como activo en todos los intervalos aún
        // Abrir modal primero para que el usuario seleccione dónde activarlo
        this.courses.courseFormGroup.patchValue({ levelGrop });
        this.invalidateIntervalGroupTemplate();

        Promise.resolve().then(() => {
          const dialogRef = this.dialog.open(IntervalSelectorModalComponent, {
            width: '450px',
            data: {
              intervals: this.intervals,
              level: levelGrop[i],
              action: 'add-subgroup'
            }
          });

          dialogRef.afterClosed().pipe(
            takeUntil(this.destroy$)
          ).subscribe((result: any) => {
            if (!result) {
              // Revert the level to inactive since user cancelled
              const levelGrop = this.courses.courseFormGroup.controls['levelGrop'].value;
              levelGrop[i].active = false;
              this.courses.courseFormGroup.patchValue({ levelGrop });
              this.invalidateIntervalGroupTemplate();
              return;
            }

            const selectedIndices: number[] = result.selectAll
              ? this.intervals.map((_, idx) => idx)
              : result.selectedIndices || [];

            // Crear estado SOLO para los intervalos seleccionados
            // NO crear estados para los intervalos no seleccionados
            selectedIndices.forEach((idx: number) => {
              // Asegurar que el estado existe (sin subgrupos por defecto en modo configureLevelsByInterval)
              const state = this.ensureIntervalGroupState(idx, levelGrop[i]);
              if (state) {
                state.active = true;

                // NO agregar subgrupo automáticamente - dejar que el usuario lo agregue manualmente
                // Agregar subgrupo automático causaba duplicados (1 + 1 generado por sync = 2 subgrupos)
              }
            });

            // Sincronizar SOLO UNA VEZ al final
            this.syncIntervalGroupsArray();
            this.clearGroupCache();
            this.syncIntervalsToCourseFormGroup();

            // Forzar detección de cambios para que la UI se actualice inmediatamente
            this.cdr.detectChanges();
          });
        });
        return; // Salir aquí, la sincronización ocurre dentro del modal
      } else {
        // Si NO se configuran por intervalos, modificar course_dates directamente
        for (const course of course_dates) {
          if (this.mode === "create") {
            course.course_groups = [...course.course_groups, { ...levelGrop[i], degree_id: levelGrop[i].id, course_subgroups: [] }];
            course.groups = [...course.groups, { ...levelGrop[i], degree_id: levelGrop[i].id, subgroups: [] }];
          }
          else {
            course.course_groups = [...course.course_groups, { ...levelGrop[i], degree_id: levelGrop[i].id, course_id: this.courses.courseFormGroup.controls['id'].value, course_subgroups: [] }];
          }
        }
      }
    } else {
      // Al desactivar, limpiar tanto de course_dates como del mapa
      for (const course of course_dates) {
        course.course_groups = course.course_groups.filter((a: any) => a.degree_id !== levelGrop[i].id);
        if (this.mode === "create") course.groups = course.groups.filter((a: any) => a.id !== levelGrop[i].id);
      }

      // Además, lo limpiamos del mapa de configuraciones de intervalos.
      Object.keys(this.intervalGroupsMap).forEach(intervalKey => {
        const intervalState = this.intervalGroupsMap[intervalKey];
        if (intervalState && intervalState[levelGrop[i].id]) {
          intervalState[levelGrop[i].id].active = false;
          intervalState[levelGrop[i].id].subgroups = [];
        }
      });
    }

    this.courses.courseFormGroup.patchValue({ levelGrop });

    // Solo actualizar course_dates directamente si NO configuramos por intervalos
    if (!this.configureLevelsByInterval) {
      this.courses.courseFormGroup.patchValue({ course_dates });
      if (isActive) {
        this.addLevelSubgroup(levelGrop[i], 0, true);
      }
    }

    this.clearGroupCache();
  }

  addLevelSubgroup = (level: any, j: number, add: boolean) => {
    // Si estamos en modo por intervalos o múltiples intervalos, delegar siempre en la lógica de intervalos
    const courseType = this.courses?.courseFormGroup?.controls?.['course_type']?.value;
    const isFlexible = this.courses?.courseFormGroup?.controls?.['is_flexible']?.value;
    const forceSimple = courseType === 1 && !isFlexible;
    const levelId = Number(level?.id ?? level?.degree_id);

    // Forzar flags simples para cursos colectivos fijos para evitar ramas de intervalos
    if (forceSimple) {
      this.configureLevelsByInterval = false;
      this.useMultipleIntervals = false;
      if (!Array.isArray(this.intervals)) {
        this.intervals = [];
      }
    }

    // this.debugLog('addLevelSubgroup:entry', {
    //   levelId,
    //   j,
    //   add,
    //   configureLevelsByInterval: this.configureLevelsByInterval,
    //   useMultipleIntervals: this.useMultipleIntervals,
    //   courseType,
    //   isFlexible,
    //   forceSimple
    // });
    this.pushDebugLogsToBackend();
    if (!levelId) {
      return;
    }

    if (forceSimple) {
      this.configureLevelsByInterval = false;
      this.useMultipleIntervals = false;
      if (!Array.isArray(this.intervals)) {
        this.intervals = [];
      }
    }

    if (!forceSimple && (this.configureLevelsByInterval || this.useMultipleIntervals)) {
      if (!Array.isArray(this.intervals) || this.intervals.length === 0) {
        this.intervals = [this.createDefaultInterval()];
      }
      const targetIdx = Math.max(0, Math.min(this.intervals.length - 1, this.selectedIntervalIndexForGroups || 0));
      if (add) {
        this.addIntervalLevelSubgroup(targetIdx, level);
      } else {
        this.removeIntervalLevelSubgroup(targetIdx, level, j);
      }
      return;
    }

    // this.debugLog('addLevelSubgroup:start', {
    //   levelId: level?.id ?? level?.degree_id,
    //   add,
    //   j,
    //   courseDatesLen: this.courses.courseFormGroup.controls['course_dates']?.value?.length || 0
    // });

    const course_dates = this.courses.courseFormGroup.controls['course_dates'].value.map((course: any) => {
      const intervalKey = this.getIntervalKeyForDate(course) || 'default';
      course.course_groups = Array.isArray(course.course_groups) ? course.course_groups : [];
      course.groups = Array.isArray(course.groups)
        ? course.groups
        : course.course_groups.map((g: any) => ({
          ...g,
          subgroups: Array.isArray(g.course_subgroups) ? g.course_subgroups.map((sg: any) => ({ ...sg })) : []
        }));
      let foundGroup = false;
      // Verificamos en course_groups
      for (const group in course.course_groups) {
        if (Number(course.course_groups[group].degree_id) === levelId) {
          foundGroup = true;
          if (!Array.isArray(course.course_groups[group].course_subgroups)) {
            course.course_groups[group].course_subgroups = [];
          }
          const currentSubgroups = course.course_groups[group].course_subgroups;
          const nextIndex = currentSubgroups.length;
          const newSubgroup = {
            degree_id: levelId,
            max_participants: level.max_participants,
            monitor: null,
            monitor_id: null
          };
          const slotKey = this.getSubgroupSlotKey(intervalKey, levelId, newSubgroup, nextIndex);
          const nextSubgroupId = this.subgroupDatesIdSlotMap.get(slotKey) || `SGTMP-${intervalKey}-${levelId}-${nextIndex + 1}`;
          this.subgroupDatesIdSlotMap.set(slotKey, nextSubgroupId);

          if (add) {
            if (this.mode === "create") {
              course.groups[group].subgroups = [
                ...course.groups[group].subgroups,
                { ...newSubgroup, subgroup_dates_id: nextSubgroupId }
              ];
            }
            course.course_groups[group].course_subgroups = [
              ...course.course_groups[group].course_subgroups,
              { ...newSubgroup, subgroup_dates_id: nextSubgroupId }
            ];
          } else {
            if (this.mode === "create") {
              course.groups[group].subgroups = course.groups[group].subgroups.filter((_, index: number) => index !== j);
            }
            course.course_groups[group].course_subgroups = course.course_groups[group].course_subgroups.filter((_, index: number) => index !== j);
          }
        }
      }

      // Si no existía el grupo para este nivel y queremos añadir, crear uno nuevo
      if (add && !foundGroup) {
        const maxParticipants = level?.max_participants ?? this.courses.courseFormGroup.controls['max_participants']?.value;
        const newSubgroup = {
          degree_id: levelId,
          max_participants: maxParticipants,
          monitor: null,
          monitor_id: null
        };
        const slotKey = this.getSubgroupSlotKey(intervalKey, levelId, newSubgroup, 0);
        const nextSubgroupId = this.subgroupDatesIdSlotMap.get(slotKey) || `SGTMP-${intervalKey}-${levelId}-1`;
        this.subgroupDatesIdSlotMap.set(slotKey, nextSubgroupId);

        const newGroup: any = {
          degree_id: levelId,
          age_min: level.age_min,
          age_max: level.age_max,
          max_participants: maxParticipants,
          course_subgroups: [
            { ...newSubgroup, subgroup_dates_id: nextSubgroupId }
          ]
        };

        course.course_groups = [...course.course_groups, newGroup];

        if (this.mode === "create") {
          const newGroupForView = {
            ...newGroup,
            subgroups: newGroup.course_subgroups.map((sg: any) => ({ ...sg }))
          };
          course.groups = [...course.groups, newGroupForView];
        }
      }

      // Eliminamos también en course_subgroups del propio course_date
      if (!add && course.course_subgroups) {
        course.course_subgroups = course.course_subgroups.filter((_: any, index: number) => index !== j);
      }

      return { ...course, course_groups: [...(course.course_groups || [])], groups: [...(course.groups || [])] }; // FIX: Crear nuevo objeto para detectar cambios // Retornamos el course modificado
    });

    // FIX A.7: setValue con nuevo array para forzar detección de cambios
    const courseDatesControl = this.courses.courseFormGroup.get("course_dates");
    if (courseDatesControl) {
      courseDatesControl.setValue([...course_dates]);
      courseDatesControl.markAsDirty();
    }

    // FIX A.8: Poblar caché DIRECTAMENTE con datos nuevos ANTES de detectChanges
    this._uniqueSubgroupsCache.clear();
    const levelGrop = this.courses?.courseFormGroup?.controls?.['levelGrop']?.value || [];
    levelGrop.forEach((lvl: any) => {
      const lvlId = lvl?.id ?? lvl?.degree_id ?? lvl?.degreeId;
      if (lvlId == null) return;

      const cacheKey = `level_${lvlId}`;
      const uniqueSubgroups: any[] = [];

      // Construir uniqueSubgroups desde course_dates actualizado
      course_dates.forEach((cd: any) => {
        const courseGroups = cd?.course_groups || cd?.courseGroups || [];
        let group = null;
        if (Array.isArray(courseGroups)) {
          group = courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === lvlId);
        }
        const subgroups = group?.course_subgroups || group?.courseSubgroups || [];
        subgroups.forEach((sg: any, idx: number) => {
          if (!uniqueSubgroups[idx]) {
            uniqueSubgroups[idx] = { ...sg, _index: idx, _level: lvl };
          }
        });
      });

      if (uniqueSubgroups.length > 0) {
        this._uniqueSubgroupsCache.set(cacheKey, uniqueSubgroups);
      }
    });

    this.refreshPreviewSubgroupCache();
    this.cdr.detectChanges(); // FIX: Forzar detección inmediata en lugar de markForCheck

    // NO sincronizar con el mapa aquí, esta función es solo para modificación directa
    // La sincronización del mapa se hace en selectLevel si es necesario
  };

  onInlineAddSubgroup(level: any, event?: any): void {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    const count = this.getAllUniqueSubgroupsForLevel(level)?.length || 0;
    // this.debugLog('inlineAddSubgroup:click', { levelId: level?.id ?? level?.degree_id, currentCount: count, hasIntervals: this.useMultipleIntervals, configureLevelsByInterval: this.configureLevelsByInterval });
    this.pushDebugLogsToBackend();
    this.addLevelSubgroup(level, count, true);
    this.refreshPreviewSubgroupCache();
    this.cdr.detectChanges();  // FIX A.10: Forzar detección inmediata
  }

  isExtraSelected(item: any, groupIndex: number): boolean {
    const matchesExtra = (a: any, b: any) => {
      // Comparar de múltiples formas para manejar datos legacy invertidos
      return (a.name === b.name && a.product === b.product) ||
             (a.name === b.product && a.product === b.name) ||
             (a.name === b.name && !a.product && !b.product);
    };

    if (this.courses.courseFormGroup.controls['course_type'].value === 3) {
      const groups = this.courses.courseFormGroup.controls['settings']?.value?.groups;
      if (!groups || !groups[groupIndex] || !groups[groupIndex].extras) {
        return false;
      }
      return groups[groupIndex].extras.some((a: any) => matchesExtra(a, item));
    } else {
      const extras = this.courses.courseFormGroup.controls['extras']?.value || [];
      return extras.some((a: any) => matchesExtra(a, item));
    }
  }

  selectExtra = (event: any, item: any, i: number) => {
    const matchesExtra = (a: any, b: any) => {
      return (a.name === b.name && a.product === b.product) ||
             (a.name === b.product && a.product === b.name) ||
             (a.name === b.name && !a.product && !b.product);
    };

    if (this.courses.courseFormGroup.controls['course_type'].value === 3) {
      this.courses.courseFormGroup.controls['settings'].value.groups = JSON.parse(JSON.stringify(this.courses.courseFormGroup.controls['settings'].value.groups))

      if (event.checked) {
        // Agregar el extra solo si no existe ya
        const exists = this.courses.courseFormGroup.controls['settings'].value.groups[i].extras.find(
          (a: any) => matchesExtra(a, item)
        );
        if (!exists) {
          this.courses.courseFormGroup.controls['settings'].value.groups[i].extras.push(item)
        }
      } else {
        // Eliminar el extra
        this.courses.courseFormGroup.controls['settings'].value.groups[i].extras =
          this.courses.courseFormGroup.controls['settings'].value.groups[i].extras.filter(
            (a: any) => !matchesExtra(a, item)
          )
      }
    } else {
      const extras = this.courses.courseFormGroup.controls['extras'].value || []

      if (event.checked) {
        // Agregar el extra solo si no existe ya
        const exists = extras.find((a: any) => matchesExtra(a, item));
        if (!exists) {
          this.courses.courseFormGroup.patchValue({ extras: [...extras, item] })
        }
      } else {
        // Eliminar el extra
        this.courses.courseFormGroup.patchValue({
          extras: extras.filter((a: any) => !matchesExtra(a, item))
        })
      }
    }
  }

  private defaultWeekDays(): WeekDaysState {
    return {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    };
  }

  private ensureWeekDaysObject(value: any): WeekDaysState {
    const base = this.defaultWeekDays();
    if (!value) {
      return { ...base };
    }
    this.weekDayKeys.forEach(key => {
      base[key] = !!value[key];
    });
    return base;
  }

  getCourseDateWeekDays(index: number): WeekDaysState {
    const courseDates = this.courses.courseFormGroup.controls['course_dates']?.value || [];
    const courseDate = courseDates[index];
    if (courseDate?.weekDays) {
      return this.ensureWeekDaysObject(courseDate.weekDays);
    }
    return this.ensureWeekDaysObject(this.courses.courseFormGroup.controls['settings']?.value?.weekDays);
  }

  areAllWeekdaysSelected(index: number): boolean {
    const weekDays = this.getCourseDateWeekDays(index);
    return this.weekDayKeys.every(day => weekDays[day]);
  }

  setCourseDateAllWeekdays(index: number, checked: boolean): void {
    const next = this.defaultWeekDays();
    this.weekDayKeys.forEach(day => next[day] = checked);
    this.updateCourseDateWeekDays(index, next);
  }

  toggleCourseDateWeekday(index: number, day: keyof WeekDaysState | string, checked: boolean): void {
    const dayKey = day as keyof WeekDaysState;
    const current = this.getCourseDateWeekDays(index);
    const next = { ...current, [dayKey]: checked };
    this.updateCourseDateWeekDays(index, next);
  }

  private updateCourseDateWeekDays(index: number, nextWeekDays: WeekDaysState): void {
    const courseDates = this.cloneCourseDates(this.courses.courseFormGroup.controls['course_dates']?.value);
    if (!courseDates[index]) {
      return;
    }
    courseDates[index].weekDays = nextWeekDays;
    this.replaceCourseDatesArray(courseDates);
    this.updateSettingsPeriodsFromCourseDates(courseDates);
    this.weeklyPattern = nextWeekDays;
  }

  private isPrivateCourse(): boolean {
    const courseTypeControl = this.courses?.courseFormGroup?.controls?.['course_type'];
    const courseType = Number(courseTypeControl?.value);
    return !isNaN(courseType) && courseType > 1;
  }

  private getWeekDaysSnapshot(): { [key: string]: boolean } {
    const settingsValue = this.extractSettingsPayload(this.courses.courseFormGroup.controls['settings']);
    const weekDays = settingsValue?.weekDays || {};
    return {
      monday: !!weekDays.monday,
      tuesday: !!weekDays.tuesday,
      wednesday: !!weekDays.wednesday,
      thursday: !!weekDays.thursday,
      friday: !!weekDays.friday,
      saturday: !!weekDays.saturday,
      sunday: !!weekDays.sunday
    };
  }

  private replaceCourseDatesArray(nextCourseDates: any[]): void {
    const courseDatesArray = this.courses.courseFormGroup.get('course_dates') as FormArray;
    if (!courseDatesArray) {
      this.courses.courseFormGroup.patchValue({ course_dates: nextCourseDates });
      return;
    }

    while (courseDatesArray.length > 0) {
      courseDatesArray.removeAt(0);
    }

    nextCourseDates.forEach(dateData => {
      courseDatesArray.push(this.fb.control(dateData));
    });

    courseDatesArray.updateValueAndValidity({ emitEvent: true });
    courseDatesArray.markAsDirty();
  }

  private buildPeriodsFromCourseDates(courseDates: any[]): any[] {
    if (!Array.isArray(courseDates)) {
      return [];
    }

    const weekDaysSnapshot = this.getWeekDaysSnapshot();

    return courseDates
      .map((courseDate: any) => {
        const start = this.normalizeDateValue(courseDate?.date);
        const end = this.normalizeDateValue(courseDate?.date_end) || start;

        if (!start) {
          return null;
        }

        return {
          date: start,
          date_end: end,
          hour_start: courseDate?.hour_start || this.courses.hours?.[0] || '09:00',
          hour_end: courseDate?.hour_end
            || (courseDate?.hour_start
              ? this.courses.addMinutesToTime(courseDate.hour_start, courseDate.duration || this.courses.courseFormGroup.controls['duration']?.value || '1h 0min')
              : this.courses.hours?.[1] || '10:00'),
          active: courseDate?.active !== false,
          weekDays: courseDate?.weekDays || weekDaysSnapshot
        };
      })
      .filter((period): period is any => !!period);
  }

  private updateSettingsPeriodsFromCourseDates(courseDates: any[]): void {
    if (!this.isPrivateCourse()) {
      return;
    }

    const currentSettings = this.extractSettingsPayload(this.courses.courseFormGroup.controls['settings']);
    const periods = this.buildPeriodsFromCourseDates(courseDates);
    const derivedWeekDays = periods[0]?.weekDays || this.ensureWeekDaysObject(currentSettings?.weekDays);
    const nextSettings = {
      ...currentSettings,
      weekDays: derivedWeekDays,
      periods
    };

    this.courses.courseFormGroup.patchValue({
      settings: nextSettings
    }, { emitEvent: false });
  }

  private syncPrivatePeriodsFromForm(): void {
    if (!this.isPrivateCourse()) {
      return;
    }
    const courseDates = this.cloneCourseDates(this.courses.courseFormGroup.controls['course_dates']?.value);
    this.updateSettingsPeriodsFromCourseDates(courseDates);

    this.setModalProgress();
  }

  setModalProgress(): void {
    const courseFormGroup = (typeof this.courses?.courseFormGroup?.getRawValue === 'function')
      ? this.courses.courseFormGroup.getRawValue()
      : this.courses.courseFormGroup?.value;

    if (!courseFormGroup) {
      return;
    }

    if (courseFormGroup.course_type !== 1) {
      courseFormGroup.course_dates = this.normalizeManualCourseDatesForPayload();
    }

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

    this.cdr.markForCheck();
  }

  // Opci+¦n 3: M+®todo gen+®rico para obtener cualquier FormArray de un FormGroup
  getFormArray(formGroup: AbstractControl, name: string): AbstractControl[] {
    const formArray = formGroup?.get(name) as FormArray;
    return formArray?.controls || [];
  }

  private extractSettingsPayload(value: any): any {
    if (!value) {
      return {};
    }

    if (value instanceof AbstractControl) {
      if (typeof (value as any).getRawValue === 'function') {
        try {
          return (value as any).getRawValue() || {};
        } catch {
          return (value as any).value || {};
        }
      }
      return (value as any).value || {};
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) || {};
      } catch {
        return {};
      }
    }

    if (typeof value === 'object') {
      return value || {};
    }

    return {};
  }

  async endCourse() {
    if (this.saving) {
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    this.loading = true;
    try {
    // Sync inline changes (dates/hours/durations) before building payload
    try {
      const syncResult = this.syncIntervalsToCourseFormGroup();
      // No necesitamos normalizar los datos, el backend espera el formato original
    } catch (e) {
      console.warn('Unable to sync/recalculate dates before save:', e);
    }

    // Refrescar traducciones antes de guardar (solo update)
    await this.ensureTranslationsBeforeSave();

    // Sincronizar edades y aforo por nivel/subgrupo con el estado del formulario
    this.syncLevelAndSubgroupConstraints();

    // Log early snapshot of course_dates before any validation/error
    this.logSubgroupState('beforeSave');
    this.logCourseDatesSnapshot('beforeSave');
    try {
      const raw = this.courses.courseFormGroup.getRawValue();
      const summary = (raw?.course_dates || []).map((cd: any) => ({
        date: cd?.date,
        interval_id: cd?.interval_id,
        groups: (cd?.course_groups || []).map((g: any) => ({
          degree_id: g?.degree_id,
          subgroups: (g?.course_subgroups || []).map((sg: any, idx: number) => ({
            idx,
            subgroup_dates_id: sg?.subgroup_dates_id,
            max_participants: sg?.max_participants
          }))
        }))
      }));
      // this.debugLog('payload:course_dates', { course_dates: summary });
      this.pushDebugLogsToBackend();
    } catch (e) {
      console.warn('Failed to log payload summary', e);
    }

    // this.debugLog('endCourse:pushLogs');
    this.pushDebugLogsToBackend();

    const courseFormGroup = this.courses.courseFormGroup.getRawValue()
    const preNormalizeDates = this.cloneCourseDates(courseFormGroup.course_dates || []);
    const sanitizedDates = this.courses.sanitizeCourseDatesStructure(courseFormGroup.course_dates || []);
    if ((courseFormGroup.course_dates?.length || 0) !== sanitizedDates.length) {
      console.warn(`Sanitized ${((courseFormGroup.course_dates?.length || 0) - sanitizedDates.length)} duplicate subgroup rows before saving.`);
    }
    courseFormGroup.course_dates = sanitizedDates;
    this.courses.courseFormGroup.patchValue({ course_dates: sanitizedDates }, { emitEvent: false });

    if (courseFormGroup.course_type === 1) {
      courseFormGroup.course_dates = this.normalizeCollectiveCourseDates(courseFormGroup.course_dates);
    } else {
      courseFormGroup.course_dates = this.normalizeManualCourseDatesForPayload();
    }

    if (Array.isArray(courseFormGroup.course_dates)) {
      const levelGrop = Array.isArray(courseFormGroup.levelGrop) ? courseFormGroup.levelGrop : [];
      courseFormGroup.course_dates = this.applyLevelAgesToCourseDates(courseFormGroup.course_dates, levelGrop);
    }
    if (Array.isArray(courseFormGroup.course_dates)) {
      const subgroupIdLookup = this.buildSubgroupIdLookup(preNormalizeDates);
      const subgroupIdIndexLookup = this.buildSubgroupIdIndexLookup(preNormalizeDates);
      this.applySubgroupIdLookupToCourseDates(courseFormGroup.course_dates, subgroupIdLookup, subgroupIdIndexLookup);
      this.assignSubgroupKeysInCourseDates(courseFormGroup.course_dates);
      const integrityCheck = this.validateSubgroupPayloadIntegrity(courseFormGroup.course_dates);
      if (!integrityCheck.valid) {
        this.showErrorMessage(integrityCheck.message || 'Estructura de subgrupos incompleta. Reint\u00e9ntalo.');
        this.saving = false;
        this.confirmModal = false;
        this.cdr.markForCheck();
        return;
      }
    }
    const conflicts = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(courseFormGroup.course_dates)
    );

    if (conflicts.length > 0) {
      const summary = this.dateOverlapValidation.getValidationSummary(conflicts);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      this.saving = false;
      this.confirmModal = false;
      this.cdr.markForCheck();
      return;
    }

    // Si no hay conflictos continuamos con el flujo normal manteniendo la carga +¦til original
    const currentSettings = this.extractSettingsPayload(courseFormGroup.settings);

    if (courseFormGroup.course_type !== 1) {
      const privateSettings = this.extractSettingsPayload(this.courses.courseFormGroup.controls['settings']);
      const mappedPeriods = this.buildPeriodsFromCourseDates(courseFormGroup.course_dates);
      courseFormGroup.settings = {
        ...currentSettings,
        ...privateSettings,
        periods: mappedPeriods
      };
    } else {
      courseFormGroup.settings = currentSettings;
    }

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

      // Actualizar settings con la configuraci+¦n de intervalos
      courseFormGroup.settings = {
        ...currentSettings,
        multipleIntervals: true,
        intervals: Array.isArray(this.intervals) ? this.intervals : [],
        mustStartFromFirst: this.mustStartFromFirst,
        mustBeConsecutive: this.mustBeConsecutive
      };

      // Si hay descuentos por intervalos, eliminar la configuración global de descuentos
      if (this.hasIntervalDiscounts()) {
        courseFormGroup.discounts = null;
        this.enableMultiDateDiscounts = false;
        this.discountsByDates = [];
      }
    }

    if (courseFormGroup.course_type === 1 && courseFormGroup.course_dates && courseFormGroup.levelGrop) {
      const courseId = courseFormGroup.id || this.id;  // Get course_id from form or component property

      courseFormGroup.course_dates.forEach((courseDate: any) => {
        if (courseDate.course_groups) {
          // Transform course_groups to groups and course_subgroups to subgroups for backend compatibility
          courseDate.groups = courseDate.course_groups.map((group: any) => {
            const transformedGroup = { ...group };

            // IMPORTANT: Add course_id and course_date_id to the group (required by backend)
            transformedGroup.course_id = courseId;
            transformedGroup.course_date_id = courseDate.id;

            // Transform course_subgroups to subgroups
            if (group.course_subgroups && Array.isArray(group.course_subgroups)) {
              transformedGroup.subgroups = group.course_subgroups.map((subgroup: any) => ({
                ...subgroup,
                id: subgroup?.id ?? subgroup?.course_subgroup_id ?? subgroup?.subgroup_id,
                subgroup_dates_id: subgroup?.subgroup_dates_id ?? subgroup?.subgroupDatesId
              }));
              // Remove the old field name
              delete transformedGroup.course_subgroups;
            }

            // Buscar en levelGrop el que tenga el mismo degree_id que el id del grupo
            const matchingLevel = courseFormGroup.levelGrop.find((level: any) => {
              const levelId = level?.id ?? level?.degree_id;
              if (levelId == null || group.degree_id == null) {
                return false;
              }
              return String(levelId) === String(group.degree_id);
            });

            if (matchingLevel) {
              // ALWAYS apply levelGrop ages to overwrite any existing values
              // This ensures that when a user changes age_min/age_max in the levels,
              // the changes are reflected in all groups on save
              const parsedMin = parseInt(matchingLevel.age_min);
              const parsedMax = parseInt(matchingLevel.age_max);
              if (!isNaN(parsedMin)) {
                transformedGroup.age_min = parsedMin;
              }
              if (!isNaN(parsedMax)) {
                transformedGroup.age_max = parsedMax;
              }
            }

            return transformedGroup;
          });
        }
      });
    }
    const translationsValue = this.getTranslationsValue();
    courseFormGroup.translations = JSON.stringify(translationsValue);
    if (courseFormGroup.course_type !== 1) {
      courseFormGroup.settings = this.extractSettingsPayload(this.courses.courseFormGroup.controls['settings']);
    } else if (!courseFormGroup.settings) {
      courseFormGroup.settings = currentSettings;
    }

    // FIXED: Asegurar que price_range se incluya en el payload del curso
    if (this.courses.courseFormGroup.controls['price_range'].value) {
      courseFormGroup.price_range = this.courses.courseFormGroup.controls['price_range'].value;
    }

    if (this.mode === "update") {
      try {
        const compactDates = (courseFormGroup?.course_dates || []).map((cd: any) => ({
          id: cd?.id,
          date: cd?.date,
          groups: (cd?.course_groups || []).map((g: any) => ({
            id: g?.id,
            degree_id: g?.degree_id,
            subgroups: (g?.course_subgroups || []).map((sg: any, idx: number) => ({
              idx,
              id: sg?.id,
              subgroup_dates_id: sg?.subgroup_dates_id
            }))
          }))
        }));
        // this.debugLog('update:submit', { course_id: courseFormGroup.id ?? this.id ?? null, course_dates: compactDates });
        this.pushDebugLogsToBackend();
      } catch (e) {
        console.warn('Failed to log update submit payload', e);
      }
    }

    if (this.mode === "create") {
        this.crudService.create('/admin/courses', courseFormGroup)
          .pipe(
            catchError((error) => {
              console.error("Error al crear el curso:", error);
              this.showErrorMessage("Hubo un problema al crear el curso. Int+®ntalo de nuevo.");
              return throwError(() => error);
            }),
          finalize(() => {
            this.saving = false;
            this.confirmModal = false;
            this.editModal = false;
            this.cdr.markForCheck();
          })
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe((data:any) => {
          if (data.success) {
            // FIX B.3: Mostrar toast de confirmación
            this.snackBar.open(this.translateService.instant('course_created_successfully'), this.translateService.instant('close'), {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(["/courses/detail/" + data.data.id]);
          } else {
            this.showErrorMessage(data.message || "No se pudo crear el curso.");
          }
        });
    } else {
      const baseOnlyPayload: any = {
        name: courseFormGroup.name,
        short_description: courseFormGroup.short_description,
        description: courseFormGroup.description,
        translations: courseFormGroup.translations,
        claim_text: courseFormGroup.claim_text,
        summary: courseFormGroup.summary,
        age_min: courseFormGroup.age_min,
        age_max: courseFormGroup.age_max,
      };

      // DETECCIÓN INTELIGENTE: Verificar si REALMENTE cambiaron campos pesados
      // comparando tamaños de arrays y contadores clave
      const realHeavyChanges = this.detectRealHeavyChanges();

      let canUsePatch = false;

      if (this.mode === 'update') {
        if (realHeavyChanges) {
          // Cambios pesados detectados (fechas, niveles, grupos)
          canUsePatch = false;
        } else {
          // Solo cambios ligeros, usar PATCH optimizado
          canUsePatch = true;
        }
      }
      const save$ = canUsePatch
          ? this.crudService.patch('/admin/courses', baseOnlyPayload, this.id)
          : this.crudService.update('/admin/courses', courseFormGroup, this.id);

        save$
          .pipe(
            catchError((error:any) => {
              console.error("Error al actualizar el curso:", error);
              // this.debugLog('update:error', { course_id: courseFormGroup.id ?? this.id ?? null, message: error?.message, status: error?.status });
              this.pushDebugLogsToBackend();
              this.showErrorMessage("Hubo un problema al actualizar el curso. Int+®ntalo de nuevo.");
              return throwError(() => error);
            }),
          finalize(() => {
            this.saving = false;
            this.confirmModal = false;
            this.editModal = false;
            this.cdr.markForCheck();
          })
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe((data) => {
          if (data.success) {
            // this.debugLog('update:success', { course_id: data?.data?.id ?? this.id ?? null, message: data?.message });
            this.pushDebugLogsToBackend();
            // FIX B.3: Mostrar toast de confirmación
            this.snackBar.open(this.translateService.instant('course_updated_successfully'), this.translateService.instant('close'), {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(["/courses/detail/" + data.data.id]);
          } else {
            // this.debugLog('update:response-not-success', { course_id: this.id ?? courseFormGroup.id ?? null, message: data?.message });
            this.pushDebugLogsToBackend();
            this.showErrorMessage(data.message || "No se pudo actualizar el curso.");
          }
        });
    }
    } catch (e) {
      console.error('Unexpected error while saving course', e);
      this.saving = false;
      this.cdr.markForCheck();
      throw e;
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
    if (this.isPrivateCourse()) {
      const nextCourses = this.cloneCourseDates(course_date);
      const lastPeriod = nextCourses[nextCourses.length - 1];
      const fallbackDate = this.normalizeDateValue(lastPeriod?.date_end || lastPeriod?.date) || new Date().toISOString().split('T')[0];
      const defaultDuration = lastPeriod?.duration || this.courses.courseFormGroup.controls['duration']?.value || this.courses.duration?.[0];
      const defaultStart = this.courses.courseFormGroup.controls['hour_min']?.value || this.courses.hours?.[0] || '09:00';
      const startHour = lastPeriod?.hour_start || defaultStart;
      const computedEnd = lastPeriod?.hour_end
        || (startHour ? this.courses.addMinutesToTime(startHour, defaultDuration) : null)
        || this.courses.courseFormGroup.controls['hour_max']?.value
        || this.courses.hours?.[1]
        || startHour;

      const newPeriod = {
        ...lastPeriod,
        id: null,
        date: fallbackDate,
        date_end: fallbackDate,
        hour_start: startHour,
        hour_end: computedEnd,
        duration: defaultDuration,
        active: true,
        weekDays: this.ensureWeekDaysObject(lastPeriod?.weekDays)
      };

      nextCourses.push(newPeriod);
      this.replaceCourseDatesArray(nextCourses);
      this.updateSettingsPeriodsFromCourseDates(nextCourses);
      this.snackBar.open(this.translateService.instant('add_date') || 'Periodo añadido', '', { duration: 3000 });
      return;
    }

    const data = JSON.parse(JSON.stringify(course_date[course_date.length - 1]))
    delete data.id
    const newDate = new Date(course_date[course_date.length - 1].date);
    newDate.setDate(newDate.getDate() + 1);

    // Mantener el formato original de la fecha
    const newCourseDate = {
      ...data,
      date: newDate
    };

    // Validar conflictos antes de agregar - solo para validaci+¦n, no modificamos los datos originales
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
      // Si no hay intervalos, inicializar con uno vac+¡o
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

  // A+¦adir un nuevo intervalo
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
    if (this.useMultipleIntervals && this.intervals.length <= 1) {
      this.snackBar.open('No se puede eliminar el último intervalo.', 'OK', { duration: 3000 });
      return;
    }
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



  // A+¦adir una fecha a un intervalo
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

        // Solo usar la fecha propuesta si est+í dentro del rango
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
        this.snackBar.open('Fecha del intervalo eliminada (validaci+¦n fall+¦)', '', { duration: 3000 });
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

  private getIntervalKeyForDate(date: any): string {
    const intervals = Array.isArray(this.intervals) ? this.intervals : [];
    const intervalIdFromDate = date?.interval_id;
    if (intervalIdFromDate !== undefined && intervalIdFromDate !== null) {
      return String(intervalIdFromDate);
    }
    if (intervals.length === 1) {
      return this.resolveIntervalKey(intervals[0], 0);
    }
    return 'default';
  }

  private getSubgroupSlotKey(intervalKey: string, levelId: any, subgroup: any, fallbackIndex?: number): string {
    const subgroupDatesId = subgroup?.subgroup_dates_id ?? subgroup?.subgroupDatesId;
    if (subgroupDatesId != null && String(subgroupDatesId).trim()) {
      return `${intervalKey}|${String(levelId)}|sgd-${String(subgroupDatesId).trim()}`;
    }
    const subgroupKey = this.ensureSubgroupKey(subgroup, levelId) || `idx-${fallbackIndex ?? 0}`;
    return `${intervalKey}|${String(levelId)}|${subgroupKey}`;
  }

  private seedSubgroupDatesIdMapFromCourseDates(courseDates: any[]): void {
    const dates = Array.isArray(courseDates) ? courseDates : [];
    dates.forEach((cd: any) => {
      const intervalKey = this.getIntervalKeyForDate(cd);
      const groups = Array.isArray(cd?.course_groups) ? cd.course_groups : [];
      groups.forEach((g: any, gIdx: number) => {
        const levelId = g?.degree_id ?? g?.id ?? gIdx;
        const subgroups = Array.isArray(g?.course_subgroups)
          ? g.course_subgroups
          : Array.isArray(g?.subgroups)
            ? g.subgroups
            : [];
        subgroups.forEach((sg: any, subIdx: number) => {
          const slotKey = this.getSubgroupSlotKey(intervalKey, levelId, sg, subIdx);
          if (sg?.subgroup_dates_id && !this.subgroupDatesIdSlotMap.has(slotKey)) {
            this.subgroupDatesIdSlotMap.set(slotKey, String(sg.subgroup_dates_id));
          }
        });
      });
    });
  }

  private ensureSubgroupDatesIdsForGroups(groups: any[], intervalKey: string): any[] {
    const mapped = Array.isArray(groups) ? groups : [];
    return mapped.map((group: any) => {
      const levelId = group?.degree_id ?? group?.id;
      const subgroups = Array.isArray(group?.course_subgroups)
        ? group.course_subgroups
        : Array.isArray(group?.subgroups)
          ? group.subgroups
          : [];

      const normalizedSubs = subgroups.map((sg: any, idx: number) => {
        const slotKey = this.getSubgroupSlotKey(intervalKey, levelId, sg, idx);
        let subgroupId = this.subgroupDatesIdSlotMap.get(slotKey);
        if (!subgroupId) {
          subgroupId = sg?.subgroup_dates_id;
        }
        if (!subgroupId) {
          subgroupId = `SGTMP-${intervalKey}-${levelId}-${idx + 1}-${this.subgroupDatesIdSlotMap.size + 1}`;
        }
        // Persist in slot map for later dates (override duplicates to enforce per-slot uniqueness)
        this.subgroupDatesIdSlotMap.set(slotKey, subgroupId);
        // this.debugLog('ensureSubgroupDatesIdsForGroups:subgroupId', { intervalKey, levelId, slotKey, subgroupId });
        return {
          ...sg,
          subgroup_dates_id: subgroupId
        };
      });

      return {
        ...group,
        course_subgroups: normalizedSubs,
        subgroups: normalizedSubs.map((sg: any) => ({ ...sg }))
      };
    });
  }

  /**
   * Normalize collective course dates so every date carries a consistent course_groups/subgroups structure.
   * Prefers interval-specific configuration when available, otherwise falls back to existing data or defaults.
   */
  private normalizeCollectiveCourseDates(courseDates: any[]): any[] {
    const dates = Array.isArray(courseDates) ? courseDates : [];
    const intervals = Array.isArray(this.intervals) ? this.intervals : [];
    const defaultGroups = this.getCourseDateGroups();
    const canUseIntervalGroups = this.configureLevelsByInterval
      || this.isIntervalGroupModeActive
      || this.useMultipleIntervals;

    return dates.map((date) => {
      const normalizedDate: any = { ...date };
      let groups: any[] = Array.isArray(date?.course_groups)
        ? this.cloneCourseGroups(date.course_groups)
        : [];

      if (canUseIntervalGroups && intervals.length) {
        const targetKey = date?.interval_id != null ? String(date.interval_id) : null;
        let intervalIndex = -1;

        if (targetKey) {
          intervalIndex = intervals.findIndex((interval, idx) =>
            this.resolveIntervalKey(interval, idx) === targetKey
          );
        }

        if (intervalIndex === -1 && intervals.length === 1) {
          intervalIndex = 0;
        }

        if (intervalIndex >= 0) {
          const intervalGroups = this.buildCourseGroupsForInterval(intervals[intervalIndex], intervalIndex);
          if (Array.isArray(intervalGroups) && intervalGroups.length > 0) {
            groups = this.cloneCourseGroups(intervalGroups);
          }
        }
      }

      if ((!groups || groups.length === 0) && Array.isArray(defaultGroups) && defaultGroups.length > 0) {
        groups = this.cloneCourseGroups(defaultGroups);
      }

      const normalizedGroups = (groups || []).map((group: any) => {
        const subgroupsSource = Array.isArray(group.course_subgroups)
          ? group.course_subgroups
          : Array.isArray(group.subgroups)
            ? group.subgroups
            : [];

        const normalizedSubgroups = subgroupsSource.map((sg: any, subIdx: number) => ({
          ...sg,
          degree_id: sg?.degree_id ?? group?.degree_id,
          active: sg?.active !== false,
          order: sg?.order ?? subIdx + 1
        }));

        return {
          ...group,
          course_subgroups: normalizedSubgroups,
          subgroups: normalizedSubgroups.map((sg: any) => ({ ...sg }))
        };
      });

      const intervalKey = this.getIntervalKeyForDate(date);
      const groupsWithIds = this.ensureSubgroupDatesIdsForGroups(normalizedGroups, intervalKey);

      normalizedDate.course_groups = groupsWithIds;
      if (groupsWithIds.length) {
        normalizedDate.groups = groupsWithIds.map((g: any) => ({
          ...g,
          subgroups: Array.isArray(g.course_subgroups)
            ? g.course_subgroups.map((sg: any) => ({ ...sg }))
            : []
        }));
      }

      return normalizedDate;
    });
  }

  private normalizeManualCourseDatesForPayload(): any[] {
    const courseDatesControl = this.courses.courseFormGroup?.get('course_dates');
    if (!courseDatesControl) {
      return [];
    }

    const rawCourseDates = this.cloneCourseDates(courseDatesControl.value);
    if (!rawCourseDates.length) {
      return [];
    }

    return rawCourseDates
      .map((courseDate: any, index: number) => {
        if (!courseDate) {
          return null;
        }

        const normalizedDate: any = { ...courseDate };
        normalizedDate.date = this.normalizeDateValue(courseDate.date);
        if (courseDate.date_end) {
          normalizedDate.date_end = this.normalizeDateValue(courseDate.date_end);
        }
        normalizedDate.hour_start = courseDate.hour_start || null;
        normalizedDate.hour_end = courseDate.hour_end
          || (courseDate.hour_start && courseDate.duration
            ? this.courses.addMinutesToTime(courseDate.hour_start, courseDate.duration)
            : null);
        normalizedDate.duration = courseDate.duration;
        normalizedDate.order = courseDate.order ?? index + 1;

        if (!Array.isArray(normalizedDate.course_groups)) {
          normalizedDate.course_groups = [];
        }
        if (!Array.isArray(normalizedDate.groups)) {
          normalizedDate.groups = [];
        }
        if (this.isPrivateCourse()) {
          normalizedDate.weekDays = courseDate.weekDays || this.getWeekDaysSnapshot();
        }

        delete normalizedDate.$$index;
        delete normalizedDate.$$hashKey;

      return (normalizedDate.date && normalizedDate.hour_start) ? normalizedDate : null;
      })
      .filter((courseDate: any): courseDate is any => !!courseDate);
  }

  private applyLevelAgesToCourseDates(courseDates: any[], levelGrop: any[]): any[] {
    if (!Array.isArray(courseDates)) {
      return [];
    }

    const ageMap = this.buildLevelAgeMap(levelGrop);
    if (!ageMap.size) {
      return courseDates;
    }

    return courseDates.map(courseDate => this.applyLevelAgesToCourseDate(courseDate, ageMap));
  }

  private buildLevelAgeMap(levels: any[]): Map<string, { age_min?: number; age_max?: number }> {
    const map = new Map<string, { age_min?: number; age_max?: number }>();
    if (!Array.isArray(levels)) {
      return map;
    }
    levels.forEach(level => {
      const levelId = level?.id ?? level?.degree_id;
      if (levelId == null) {
        return;
      }
      const ageMin = this.parseNumber(level.age_min);
      const ageMax = this.parseNumber(level.age_max);
      if (ageMin == null && ageMax == null) {
        return;
      }
      map.set(String(levelId), {
        ...(ageMin != null ? { age_min: ageMin } : {}),
        ...(ageMax != null ? { age_max: ageMax } : {})
      });
    });
    return map;
  }

  private applyLevelAgesToCourseDate(courseDate: any, ageMap: Map<string, { age_min?: number; age_max?: number }>): any {
    if (!courseDate || !ageMap.size) {
      return courseDate;
    }

    const updatedDate = { ...courseDate };
    const groups = Array.isArray(updatedDate.course_groups) ? updatedDate.course_groups.map((group: any) => ({ ...group })) : [];
    updatedDate.course_groups = groups.map(group => this.applyLevelAgesToGroup(group, ageMap));

    if (Array.isArray(updatedDate.groups)) {
      updatedDate.groups = updatedDate.course_groups.map((group: any) => ({
        ...group,
        subgroups: Array.isArray(group.course_subgroups) ? group.course_subgroups.map((subgroup: any) => ({ ...subgroup })) : []
      }));
    }

    return updatedDate;
  }

  private applyLevelAgesToGroup(group: any, ageMap: Map<string, { age_min?: number; age_max?: number }>): any {
    const normalizedGroup = { ...group };
    const rawSubgroups = Array.isArray(group?.course_subgroups)
      ? group.course_subgroups
      : Array.isArray(group?.subgroups)
        ? group.subgroups
        : [];
    const clonedSubgroups = rawSubgroups.map((subgroup: any) => ({ ...subgroup }));
    const levelId = String(group?.degree_id ?? group?.id ?? group?.degreeId ?? '');
    const bounds = ageMap.get(levelId);

    if (bounds) {
      // ALWAYS apply ages from levelGrop to overwrite any existing values
      // This ensures that when a user changes age_min/age_max in the levels,
      // the changes are reflected in all groups/subgroups on save
      if (bounds.age_min != null) {
        normalizedGroup.age_min = bounds.age_min;
      }
      if (bounds.age_max != null) {
        normalizedGroup.age_max = bounds.age_max;
      }
      clonedSubgroups.forEach(subgroup => {
        if (bounds.age_min != null) {
          subgroup.age_min = bounds.age_min;
        }
        if (bounds.age_max != null) {
          subgroup.age_max = bounds.age_max;
        }
      });
    }

    normalizedGroup.course_subgroups = clonedSubgroups;
    normalizedGroup.subgroups = clonedSubgroups.map((subgroup: any) => ({ ...subgroup }));
    return normalizedGroup;
  }


  private normalizeDateValue(value: any): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      if (trimmed.length >= 10 && trimmed[4] === '-' && trimmed[7] === '-') {
        return trimmed.substring(0, 10);
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return trimmed;
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
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
    let totalSubgroupsGenerated = 0;

    intervals.forEach((interval, index) => {
      if (!interval?.dates || !Array.isArray(interval.dates)) {
        return;
      }
      const baseGroups = this.buildCourseGroupsForInterval(interval, index);
      const intervalKey = this.resolveIntervalKey(interval, index);

      interval.dates.forEach((dateObj: any, dateIdx: any) => {
        if (!dateObj?.date || !dateObj?.hour_start) {
          return;
        }

        const duration = dateObj.duration;
        const computedHourEnd = dateObj.hour_end || this.courses.addMinutesToTime(dateObj.hour_start, duration ?? 0);
        const courseGroups = this.ensureSubgroupDatesIdsForGroups(
          this.cloneCourseGroups(baseGroups),
          intervalKey
        );
        courseGroups.forEach((g: any) => {
          totalSubgroupsGenerated += g.course_subgroups?.length || 0;
        });
        const groupsPayload = courseGroups.map(group => {
          const { course_subgroups, subgroups, ...rest } = group;
          return {
            ...rest,
            subgroups: (course_subgroups || subgroups || []).map((subgroup: any) => ({ ...subgroup }))
          };
        });

        const newDate = {
          ...dateObj,
          hour_end: computedHourEnd,
          duration: duration,
          interval_id: interval.id,
          order: dateObj.order,
          course_groups: courseGroups,
          groups: groupsPayload
        };
        courseDates.push(newDate);
      });
    });
    return courseDates;
  }

  // Sincronizar datos de intervalos con el FormGroup del curso
  syncIntervalsToCourseFormGroup(): boolean {
    // FIX B.1: Guardar settings ANTES de cualquier validación o early return
    // para asegurar que mustBeConsecutive y mustStartFromFirst se preserven
    this.saveIntervalSettings();
    if (!this.courses.courseFormGroup) {
      return false;
    }

    // NO llamar a ensureIntervalGroupsAlignment() aquí
    // porque regeneraría el template desde course_dates que estamos a punto de generar
    // causando acumulación de subgrupos en cada ciclo de sincronización

    // Skip sync during bulk schedule application to prevent duplicates
    if (this._applyingBulkSchedule) {
      return true;
    }

    const previousCourseDates = this.cloneCourseDates(this.courses.courseFormGroup.get('course_dates')?.value);
    this.assignSubgroupKeysInCourseDates(previousCourseDates);
    this.subgroupDatesIdSlotMap.clear();
    this.seedSubgroupDatesIdMapFromCourseDates(previousCourseDates);
    this.hydrateIntervalGroupsFromCourseDates(this.intervalGroupsMap);
    const generatedCourseDates = this.generateCourseDatesFromIntervals(this.intervals);
    this.assignSubgroupKeysInCourseDates(generatedCourseDates);
    const bookingLookup = this.buildSubgroupBookingLookup(previousCourseDates);
    this.applyBookingLookupToCourseDates(generatedCourseDates, bookingLookup);
    const subgroupIdLookup = this.buildSubgroupIdLookup(previousCourseDates);
    const subgroupIdIndexLookup = this.buildSubgroupIdIndexLookup(previousCourseDates);
    this.applySubgroupIdLookupToCourseDates(generatedCourseDates, subgroupIdLookup, subgroupIdIndexLookup);

    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(generatedCourseDates)
    );

    if (validationErrors.length > 0) {
      this.showValidationSummary(validationErrors);
      this.courses.courseFormGroup.patchValue({ course_dates: previousCourseDates });
      return false;
    }

    if (generatedCourseDates.length > 0) {

      // NO usar patchValue en FormArray - hay que manipularlo directamente
      const courseDatesArray = this.courses.courseFormGroup.get('course_dates') as FormArray;

      // Limpiar el FormArray
      while (courseDatesArray.length > 0) {
        courseDatesArray.removeAt(0);
      }

      // Agregar cada fecha al FormArray como FormControl simple
      // NO usar fb.group() porque convierte arrays anidados en FormControls
      generatedCourseDates.forEach((dateData: any) => {
        courseDatesArray.push(this.fb.control(dateData));
      });

      // FIX A.2: emitEvent false evita que el template se renderice antes de actualizar el caché
      // Forzar actualización inmediata del FormArray para que se refleje en la UI
      courseDatesArray.updateValueAndValidity({ emitEvent: false });
      courseDatesArray.markAsDirty();

    }

    // Limpiar caché DESPUÉS de sincronizar (no antes, para que no interfiera con la generación)
      this.clearSubgroupsCache();
      this.prefillSubgroupCacheFromIntervalMap();
      this.cdr.detectChanges();  // Forzar detección DESPUÉS de actualizar caché
      this.refreshPreviewSubgroupCache();
      this.refreshCourseDetailCards();
      this.logSubgroupState('syncIntervalsToCourseFormGroup');
      this.logCourseDatesSnapshot('syncIntervalsToCourseFormGroup');

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

    // FIX B.2: Actualizar tanto el campo settings como los FormControls individuales
    // para que el payload incluya mustBeConsecutive y mustStartFromFirst
    this.courses.courseFormGroup.patchValue({
      settings: JSON.stringify(updatedSettings),
      mustBeConsecutive: this.mustBeConsecutive,
      mustStartFromFirst: this.mustStartFromFirst,
      useMultipleIntervals: this.useMultipleIntervals,
      intervals: this.intervals
    }, { emitEvent: false });

  }

  // Obtener los grupos de curso para cada fecha nueva
  getCourseDateGroups() {
    // Primero intentar obtener de fechas existentes
    const existingDates = this.courses.courseFormGroup.get('course_dates').value;
    if (existingDates && existingDates.length > 0 && existingDates[0].course_groups) {
      return JSON.parse(JSON.stringify(existingDates[0].course_groups));
    }

    // Si no hay fechas, construir desde levelGrop (caso de curso nuevo)
    const levelGrop = this.courses.courseFormGroup.get('levelGrop')?.value || [];
    const activeLevels = levelGrop.filter((level: any) => level.active);

    if (activeLevels.length === 0) {
      return [];
    }

    // Construir course_groups desde los niveles activos
    return activeLevels.map((level: any) => ({
      degree_id: (level?.id ?? level?.degree_id),
      age_min: level.age_min,
      age_max: level.age_max,
      max_participants: level.max_participants || this.courses.courseFormGroup.get('max_participants')?.value,
      course_subgroups: [{
        degree_id: (level?.id ?? level?.degree_id),
        active: true,
        max_participants: level.max_participants || this.courses.courseFormGroup.get('max_participants')?.value
      }]
    }));
  }

  // Validar cambios en fechas de intervalos
  validateAndUpdateIntervalDate(intervalIndex: number, dateIndex: number, newDate: string) {

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      console.warn('?? Invalid intervalIndex:', intervalIndex);
      return;
    }
    const interval = this.intervals[intervalIndex];
    if (dateIndex < 0 || dateIndex >= interval.dates.length) {
      console.warn('?? Invalid dateIndex:', dateIndex);
      return;
    }

    const oldDate = interval.dates[dateIndex].date;
    interval.dates[dateIndex].date = newDate;

    // Obtener todas las fechas existentes para validaci+¦n
    const allDates = this.generateCourseDatesFromIntervals(this.intervals);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(allDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      console.warn('?? Validation errors, reverting date change');
      interval.dates[dateIndex].date = oldDate;
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
      this.syncIntervalsToCourseFormGroup();
    }
  }

  // Validar cambios en horas de intervalos
  validateAndUpdateIntervalHour(intervalIndex: number, dateIndex: number, newHour: string) {

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      console.warn('?? Invalid intervalIndex:', intervalIndex);
      return;
    }
    const interval = this.intervals[intervalIndex];
    if (dateIndex < 0 || dateIndex >= interval.dates.length) {
      console.warn('?? Invalid dateIndex:', dateIndex);
      return;
    }

    const oldHour = interval.dates[dateIndex].hour_start;
    interval.dates[dateIndex].hour_start = newHour;

    // Recalcular hour_end basado en la nueva hora y duración actual
    const duration = interval.dates[dateIndex].duration;
    if (duration) {
      const newHourEnd = this.courses.addMinutesToTime(newHour, duration);
      interval.dates[dateIndex].hour_end = newHourEnd;
    }

    // Obtener todas las fechas existentes para validación
    const allDates = this.generateCourseDatesFromIntervals(this.intervals);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(allDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      console.warn('?? Validation errors, reverting hour change');
      interval.dates[dateIndex].hour_start = oldHour;
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
      this.syncIntervalsToCourseFormGroup();
    }
  }

  // Validar cambios en duración de intervalos
  validateAndUpdateIntervalDuration(intervalIndex: number, dateIndex: number, newDuration: string) {

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      console.warn('?? Invalid intervalIndex:', intervalIndex);
      return;
    }
    const interval = this.intervals[intervalIndex];
    if (dateIndex < 0 || dateIndex >= interval.dates.length) {
      console.warn('?? Invalid dateIndex:', dateIndex);
      return;
    }

    const oldDuration = interval.dates[dateIndex].duration;
    interval.dates[dateIndex].duration = newDuration;

    // Recalcular hour_end basado en hour_start y nueva duración
    const hourStart = interval.dates[dateIndex].hour_start;
    if (hourStart) {
      const newHourEnd = this.courses.addMinutesToTime(hourStart, newDuration);
      interval.dates[dateIndex].hour_end = newHourEnd;
    }

    // Obtener todas las fechas existentes para validación
    const allDates = this.generateCourseDatesFromIntervals(this.intervals);
    const validationErrors = this.dateOverlapValidation.validateAllCourseDates(
      this.convertToCourseDateInfos(allDates)
    );

    if (validationErrors.length > 0) {
      // Revertir el cambio si hay errores
      console.warn('?? Validation errors, reverting duration change');
      interval.dates[dateIndex].duration = oldDuration;
      const summary = this.dateOverlapValidation.getValidationSummary(validationErrors);
      this.snackBar.open(summary, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } else {
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
      this.syncPrivatePeriodsFromForm();
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
      this.syncPrivatePeriodsFromForm();
    }
  }

  // Validar cambios en duraci+¦n principal
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
      this.syncPrivatePeriodsFromForm();
    }
  }

  // Manejar cambio de per+¡odo (uni/multi per+¡odo)
  onPeriodChange(selectedIndex: number) {
    this.PeriodoFecha = selectedIndex;

    if (selectedIndex === 0) {
      // Cambio a per+¡odo +¦nico - asegurar que course_dates tiene los campos necesarios
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
    // Forzar invalidaci+¦n del cache de display intervals
    this.invalidateDisplayIntervalsCache();
    this.enforceIntervalGroupAvailability();
  }

  // M+®todos de generaci+¦n de fechas por intervalo
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
    // Reemplazar las fechas del intervalo actual con las nuevas para validaci+¦n
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
    // Reemplazar las fechas del intervalo actual con las nuevas para validaci+¦n
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

    // Si cambia a manual, no hacer nada autom+íticamente
    if (method === 'manual') {
      return;
    }

    // Si cambia a consecutive o weekly, generar fechas autom+íticamente
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

    // Si est+í en modo weekly, regenerar fechas
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
    // Comprobar si el curso tiene configuraci+¦n de intervalos m+¦ltiples
    if (courseData.settings) {
      try {
        const settings = courseData.settings;

        // Agrupar las fechas por intervalos
        const courseDates = courseData.course_dates || [];

        // Detectar automáticamente si hay múltiples intervalos
        const uniqueIntervalIds = new Set(courseDates.map((d: any) => d.interval_id).filter(Boolean));
        const hasMultipleIntervalsFromDates = uniqueIntervalIds.size > 1;

        // Si tiene configuraci+¦n de intervalos m+¦ltiples O detectamos múltiples intervalos en fechas
        if (settings.multipleIntervals || hasMultipleIntervalsFromDates) {
          // Activar el switch en el componente
          component.useMultipleIntervals = true;
          component.mustBeConsecutive = settings.mustBeConsecutive || false;
          component.mustStartFromFirst = settings.mustStartFromFirst || false;

          const intervalMap: { [key: string]: any } = {};

          // Agrupar por interval_id
          courseDates.forEach(date => {
            const intervalId = String(date.interval_id || 'default');
            const matchingInterval = settings.intervals?.find(i => String(i.id) === intervalId);

            if (!intervalMap[intervalId]) {
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
                discounts: matchingInterval?.discounts || [], // Cargar descuentos del intervalo
                dates: []
              };
            }

            // Preservar el objeto de fecha completo, incluyendo course_groups
            const preservedDate = {
              ...date, // Preservar TODOS los campos incluyendo course_groups, id, etc.
              interval_id: intervalId,
              interval_name: date.interval_name || matchingInterval?.name || 'Intervalo',
              order: date.order || 0
            };
            intervalMap[intervalId].dates.push(preservedDate);
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

          // Detectar si algún intervalo tiene descuentos y habilitar el toggle
          component.enableIntervalDiscounts = this.intervals.some(interval =>
            interval.discounts && Array.isArray(interval.discounts) && interval.discounts.length > 0
          );

          // FORZAR detección de cambios para que Angular actualice la vista
          this.cdr.detectChanges();

          // A+¦adir fechas agrupadas por intervalos
          Object.values(intervalGroups).forEach((group: any, groupIndex) => {
            // Ordenar fechas por orden
            const sortedDates = [...group.dates].sort((a, b) => a.order - b.order);

            // A+¦adir cada fecha al FormArray
            sortedDates.forEach((dateInfo, dateIndex) => {
              // Usar el objeto completo que ya tiene todos los campos preservados
              // Solo normalizar la fecha si es necesario
              const normalizedDate = {
                ...dateInfo,
                date: typeof dateInfo.date === 'string' ? dateInfo.date : new Date(dateInfo.date).toISOString().split('T')[0],
                interval_id: group.id,
                interval_name: group.name,
                order: dateInfo.order || dateIndex
              };

              // A+¦adir al FormArray
              datesArray.push(this.fb.control(normalizedDate));
            });
          });

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

          // NO incluir intervalGroupsById para forzar reconstrucción desde course_dates
          const { intervalGroupsById, ...settingsWithoutGroups } = updatedSettings as any;

          this.courses.courseFormGroup.patchValue({
            settings: settingsWithoutGroups
          });

          // Forzar reconstrucción desde course_dates en lugar de usar settings viejos
          this.intervalGroupsMap = this.buildIntervalGroupsFromCourseDates();
          this.ensureIntervalGroupsAlignment();
          this.enforceIntervalGroupAvailability();
        }
      } catch (error) {
      }
    } else {
      // Si no tiene intervalos, inicializar con los valores por defecto
      //this.initializeDefaultInterval();
    }
  }

  monitorSelect(event: any, level: any, j: number) {
    let course_dates = this.courses.courseFormGroup.controls['course_dates'].value
    const groupIndex = course_dates[event.i].course_groups.findIndex((a: any) => a.degree_id === (level?.id ?? level?.degree_id));
    if (groupIndex === -1) {
      return;
    }
    const subgroup = course_dates[event.i].course_groups[groupIndex].course_subgroups[j];
    if (!subgroup) {
      return;
    }
    subgroup.monitor = event.monitor ?? null;
    subgroup.monitor_id = event.monitor?.id ?? null;
    subgroup.monitor_modified = true;
    this.courses.courseFormGroup.patchValue({ course_dates })
  }
  onFluxTransfer(): void {
    this.loadCourseData();
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
        this.snackBar.open('Fecha eliminada (validaci+¦n fall+¦)', '', { duration: 3000 });
      }
    } else {
      // For new courses or dates without ID, delete directly
      courseDates.splice(i, 1);
    }
    if (this.isPrivateCourse()) {
      this.replaceCourseDatesArray(courseDates);
      this.updateSettingsPeriodsFromCourseDates(courseDates);
    }
  }
  /**
   * Open timing modal for subgroup students (cronometraje)
   * Abre el modal aunque no haya alumnos (se mostrar+í vac+¡o)
   */
  openTimingModal(subGroup: any, groupLevel: any, selectedDate?: any): void {

    if (!subGroup || !groupLevel) {
      console.error('No hay datos de subgrupo o nivel para mostrar tiempos.');
      return;
    }

    // Usar la misma l+¦gica que flux-disponibilidad: filtrar por degree_id del nivel
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

    // Abrir el modal tradicional de tiempos, con lista (posible vac+¡a)
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

    // Abrir en nueva pesta+¦a
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

  onIntervalDiscountChange(): void {

    if (this.enableIntervalDiscounts) {
      // Inicializar descuentos para cada intervalo si no tienen
      this.intervals.forEach((interval, index) => {
        if (!interval.discounts || interval.discounts.length === 0) {
          interval.discounts = [
            { dates: 2, type: 'percentage', value: 10 }
          ];
        }
      });
    } else {
      // Limpiar descuentos de todos los intervalos
      this.intervals.forEach((interval, index) => {
        interval.discounts = [];
      });
    }

    // Sincronizar cambios
    this.syncIntervalsToCourseFormGroup();
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

  // Interval discounts management methods
  addIntervalDiscount(intervalIndex: number): void {

    if (!this.intervals[intervalIndex].discounts) {
      this.intervals[intervalIndex].discounts = [];
    }

    const lastDiscount = this.intervals[intervalIndex].discounts[this.intervals[intervalIndex].discounts.length - 1];
    const newDates = lastDiscount ? lastDiscount.dates + 1 : 2;

    this.intervals[intervalIndex].discounts.push({
      dates: newDates,
      type: 'percentage',
      value: 10
    });

    this.validateIntervalDiscounts(intervalIndex);

    // Sincronizar con el FormArray para guardar cambios
    this.syncIntervalsToCourseFormGroup();
  }

  removeIntervalDiscount(intervalIndex: number, discountIndex: number): void {

    if (this.intervals[intervalIndex].discounts && this.intervals[intervalIndex].discounts.length > 1) {
      this.intervals[intervalIndex].discounts.splice(discountIndex, 1);

      // Sincronizar con el FormArray para guardar cambios
      this.syncIntervalsToCourseFormGroup();
    }
  }

  validateIntervalDiscounts(intervalIndex: number): void {
    if (!this.intervals[intervalIndex].discounts) {
      return;
    }

    // Sort discounts by dates quantity to avoid conflicts
    this.intervals[intervalIndex].discounts.sort((a, b) => a.dates - b.dates);

    // Ensure no duplicate dates quantities
    const datesSet = new Set();
    this.intervals[intervalIndex].discounts = this.intervals[intervalIndex].discounts.filter(discount => {
      if (datesSet.has(discount.dates)) {
        return false;
      }
      datesSet.add(discount.dates);
      return true;
    });

    // Sincronizar con el FormArray para guardar cambios
    this.syncIntervalsToCourseFormGroup();
  }

  hasIntervalDiscounts(): boolean {
    if (!this.intervals || !Array.isArray(this.intervals)) {
      return false;
    }

    return this.intervals.some(interval =>
      interval.discounts && Array.isArray(interval.discounts) && interval.discounts.length > 0
    );
  }

  // Date generation methods
  toggleWeekday(day: string): void {
    this.weeklyPattern[day] = !this.weeklyPattern[day];
  }

  private syncWeeklyPatternFromSettings(): void {
    try {
      const settings = this.courses.courseFormGroup?.controls?.['settings']?.value;
      const weekDays = settings?.weekDays || {};
      this.weeklyPattern = {
        monday: !!weekDays.monday,
        tuesday: !!weekDays.tuesday,
        wednesday: !!weekDays.wednesday,
        thursday: !!weekDays.thursday,
        friday: !!weekDays.friday,
        saturday: !!weekDays.saturday,
        sunday: !!weekDays.sunday
      };
    } catch {
      this.weeklyPattern = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      };
    }
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

    // Mapeo de d+¡as de la semana
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
   * Abre el modal tradicional de gesti+¦n de tiempos
   */
  private openTimingModalDialog(subGroup: any, groupLevel: any, courseDates: any[], studentsInSubgroup: any[], selectedDate?: any): void {

    // Construir bookingUsers con course_date_id para que el modal filtre por d+¡a igual que en detalle
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

    // Lista de alumnos del subgrupo (si est+í disponible), si no, fallback a base
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
          // Lista global por compatibilidad (el modal filtrar+í por d+¡a)
          students,
          // Pasar booking users enriquecidos con course_date_id para filtrado por d+¡a
          bookingUsers: bookingUsersWithDates,
          // Preselecci+¦n de d+¡a
          selectedCourseDateId: selectedDate?.id ?? selectedDate?.course_date_id ?? null
        }
      });

      ref.afterOpened().pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
      });

      ref.afterClosed().pipe(
        takeUntil(this.destroy$)
      ).subscribe(result => {
        // Modal cerrado
      });
    } catch (error) {
      console.error('Error al abrir modal desde courses-v2 create-update:', error);
    }
  }

  /**
   * Aplana los booking_users embebidos en course_dates -> course_groups -> course_subgroups
   * y les a+¦ade course_date_id para que el modal pueda filtrar por d+¡a.
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
        // bas+índonos en las fechas disponibles
        const enrichedFallback = fallback.map((bu: any) => {
          // Intentar encontrar la fecha y subgrupo correcto para este booking user
          let foundCourseDate = null;
          let foundSubgroup = null;

          for (const cd of dates) {
            for (const g of (cd?.course_groups || [])) {
              for (const sg of (g?.course_subgroups || [])) {
                // Comparar por course_subgroup_id si est+í disponible
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
    const duration = prompt('Duraci+¦n en minutos:', '60');

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
    this.syncPrivatePeriodsFromForm();
  }

  applyBulkScheduleToInterval(intervalIndex: number, startTime: string, duration: string): boolean {
    this.ensureSingleIntervalForNonFlexible();

    if (!startTime || !duration) {
      this.showErrorMessage('Por favor, establece primero las horas de inicio y fin');
      return false;
    }

    if (intervalIndex < 0 || intervalIndex >= this.intervals.length) {
      this.showErrorMessage('Intervalo no v+ílido');
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
      // ACTUALIZACI+ôN DIRECTA: Reemplazar las fechas del intervalo directamente
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

  // M+®todos para manejar los selectores inline de horario
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

    // Activar flag para prevenir interferencias durante la aplicaci+¦n
    this._applyingBulkSchedule = true;

    const startTime = this.getIntervalScheduleStartTime(intervalIndex);
    const duration = this.getIntervalScheduleDuration(intervalIndex);

    if (!startTime || !duration) {
      this.showErrorMessage('Por favor, selecciona la hora de inicio y duraci+¦n');
      this._applyingBulkSchedule = false; // Resetear flag antes de salir
      return;
    }
    const success = this.applyBulkScheduleToInterval(intervalIndex, startTime, duration);

    // Resetear flag al final de la operaci+¦n
    this._applyingBulkSchedule = false;

    // CRÍTICO: Sincronizar con el FormArray ahora que el flag está resetado
    if (success) {
      this.syncIntervalsToCourseFormGroup();
    } else {
      console.warn('?? Bulk schedule application failed');
    }
  }

  // Variables para los selectores de horario masivo para fechas individuales
  individualScheduleStartTime: string = '';
  individualScheduleDuration: string = '';

  // M+®todos para aplicar horario masivo a fechas individuales
  applyBulkScheduleToIndividualDates(): void {

    const startTime = this.getIndividualScheduleStartTime();
    const duration = this.getIndividualScheduleDuration();

    if (!startTime || !duration) {
      this.showErrorMessage('Por favor, selecciona la hora de inicio y duraci+¦n');
      return;
    }

    // Actualizar directamente las fechas en los intervalos
    if (!this.intervals || this.intervals.length === 0) {
      return;
    }

    this.intervals.forEach((interval: any) => {
      if (!Array.isArray(interval?.dates)) {
        return;
      }

      interval.dates.forEach((date: any) => {
        date.hour_start = startTime;
        date.duration = duration;
        date.hour_end = this.courses.addMinutesToTime(startTime, duration);
      });
    });

    // Sincronizar con el FormArray
    this.syncIntervalsToCourseFormGroup();

    this.snackBar.open(`Horario aplicado exitosamente a todas las fechas`, 'OK', { duration: 3000 });
    this.syncPrivatePeriodsFromForm();
  }

  // M+®todos para manejar los selectores inline de horario para fechas individuales
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
      scheduleDuration: this.courses.duration?.[0] || '',
      discounts: [] // Array de descuentos por fechas para este intervalo específico
    };
  }

  createDefaultInterval(): any {
    // Solo crear un nuevo intervalo si realmente no hay ninguno
    if (!this.intervals || this.intervals.length === 0) {
      return this.buildIntervalTemplate();
    }

    return this.intervals[0];
  }

  get displayIntervals(): any[] {
    // Si el modo multi-intervalo está desactivado, muestra solo el primer intervalo.
    if (!this.useMultipleIntervals) {
      return this.intervals.length > 0 ? [this.intervals[0]] : [];
    }
    // Si está activado, muéstralos todos.
    return this.intervals;
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
        // FIXED: En modo intervalo +¦nico, solo mostrar el primer intervalo SIN modificar this.intervals
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
    this.snackBar.open('Configuraci+¦n global aplicada a todos los intervalos', 'OK', { duration: 3000 });
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

  // FIX E.1: Actualizar max_participants de un subgrupo específico en todas las fechas
  updateSubgroupMaxParticipants(level: any, subgroupIndex: number, newValue: number, uniqueSubgroup?: any): void {
    const levelId = level?.id ?? level?.degree_id ?? level?.degreeId;
    if (levelId == null || subgroupIndex == null) {
      return;
    }

    const maxParticipants = parseInt(String(newValue), 10);
    if (isNaN(maxParticipants) || maxParticipants < 1) {
      return;
    }

    if (uniqueSubgroup) {
      uniqueSubgroup.max_participants = maxParticipants;
    }

    level.max_participants = maxParticipants;
    const levelControl = this.courses.courseFormGroup.get('levelGrop');
    if (levelControl) {
      const currentLevels = Array.isArray(levelControl.value) ? [...levelControl.value] : [];
      const levelIndex = currentLevels.findIndex((l: any) => (l?.id ?? l?.degree_id) === levelId);
      if (levelIndex !== -1) {
        currentLevels[levelIndex] = {
          ...currentLevels[levelIndex],
          max_participants: maxParticipants
        };
        levelControl.setValue(currentLevels, { emitEvent: false });
        levelControl.markAsDirty();
      }
    }

    // Actualizar en course_dates
    const courseDates = this.courses.courseFormGroup.get('course_dates')?.value || [];
    let updated = false;

    courseDates.forEach((cd: any) => {
      const courseGroups = cd?.course_groups || cd?.courseGroups || [];
      const group = Array.isArray(courseGroups)
        ? courseGroups.find((g: any) => (g?.degree_id ?? g?.degreeId) === levelId)
        : null;

      if (group) {
        const subgroups = group?.course_subgroups || group?.courseSubgroups || [];
        if (subgroups[subgroupIndex]) {
          subgroups[subgroupIndex].max_participants = maxParticipants;
          updated = true;
        }
      }

      const dateLevelSubgroups = (cd?.course_subgroups || cd?.courseSubgroups || [])
        .filter((sg: any) => (sg?.degree_id ?? sg?.degreeId) === levelId);
      if (dateLevelSubgroups[subgroupIndex]) {
        dateLevelSubgroups[subgroupIndex].max_participants = maxParticipants;
        updated = true;
      }
    });

    // Actualizar en intervalGroupsMap si existe
    if (this.configureLevelsByInterval || this.useMultipleIntervals) {
      Object.values(this.intervalGroupsMap || {}).forEach((intervalState: any) => {
        const levelKey = String(levelId);
        const levelState = intervalState?.[levelKey];
        if (levelState?.subgroups?.[subgroupIndex]) {
          levelState.subgroups[subgroupIndex].max_participants = maxParticipants;
          updated = true;
        }
      });
    }

    if (updated) {
      // Forzar actualización del FormArray con nueva referencia
      const courseDatesControl = this.courses.courseFormGroup.get('course_dates');
      if (courseDatesControl) {
        courseDatesControl.setValue([...courseDates]);
        courseDatesControl.markAsDirty();
      }

      // Limpiar caché para forzar recalcular
      this.clearSubgroupsCache();

      // NOTE: We don't call syncLevelAndSubgroupConstraints() here because it would
      // overwrite the subgroup-specific max_participants we just set with the level's
      // max_participants. Sync will be called on save in endCourse().
      this.cdr.detectChanges();
    }
  }
}
