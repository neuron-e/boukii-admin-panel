import {Component, Inject, OnDestroy, OnInit, Optional} from '@angular/core';
import { ApiCrudService } from '../../../../service/crud.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../../../../service/courses.service';
import { TranslateService } from '@ngx-translate/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import {MonitorsCreateUpdateComponent} from '../../monitors/monitors-create-update/monitors-create-update.component';
import moment from 'moment';
import {MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourseTimingModalComponent } from '../course-timing-modal/course-timing-modal.component';
import {forkJoin, of, Subject} from 'rxjs';
import {catchError, finalize, map, switchMap, takeUntil} from 'rxjs/operators';
import {UntypedFormArray, UntypedFormControl} from '@angular/forms';

@Component({
  selector: 'vex-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss']
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  minDate = new Date(2000, 1, 1);
  nowDate = new Date()
  maxDate = new Date(2099, 12, 31);
  user: any;
  settings: any;
  id: number;
  loading: boolean = true;
  shortDescription: string = '';
  courseName: string = '';
  firstCombinationValue: number | null = null;
  description: string = '';
  ageRange: { age_min: number, age_max: number } = {age_min: 0, age_max: 0};
  shortestDuration: string | null = null;
  sendEmailModal: boolean = false
  toggleClaimText: boolean = false
  selectedFrom = null;
  selectedTo = null;
  selectedMonitorId = null;
  filter = '';
  totalPriceSell = 0;
  previewSubgroupCache: Record<string, any[]> = {};
  initialFormSnapshot: any = null;
  saving = false;
  private destroy$ = new Subject<void>();

  constructor(private crudService: ApiCrudService, private activatedRoute: ActivatedRoute,
              public dialog: MatDialog,
              private router: Router, public courses: CoursesService, public TranslateService: TranslateService,
              @Optional() @Inject(MAT_DIALOG_DATA) public incData: any, private snackBar: MatSnackBar) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.settings = this.parseSettings(this.user?.schools?.[0]?.settings);
    this.id = this.activatedRoute.snapshot.params.id;
  }

  detailData: any

  private normalizeDegreeKey(value: number | string | undefined | null): string | null {
    if (value == null) return null;
    return String(value);
  }

  private addSubgroupToCache(cache: Record<string, any[]>, degreeId: number | string | null, subgroup: any, preferredIndex?: number): void {
    const key = this.normalizeDegreeKey(degreeId);
    if (!key) {
      return;
    }

    cache[key] = cache[key] || [];
    const index = preferredIndex ?? subgroup?._index ?? subgroup?.index;
    if (index != null) {
      if (cache[key].some(existing => existing._index === index)) {
        return;
      }
    }

    if (subgroup?.id != null && cache[key].some(existing => existing.id === subgroup.id)) {
      return;
    } else if (cache[key].some(existing => existing.id === subgroup?.id)) {
      return;
    }

    cache[key].push({
      ...subgroup,
      _index: index ?? cache[key].length
    });
  }

  private parseSettings(raw: any): any {
    if (!raw) {
      return {};
    }
    if (typeof raw === 'object') {
      return raw;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return {};
  }

  private refreshPreviewSubgroupCache(): void {
    const cache: Record<string, any[]> = {};
    const courseDates = this.courses.courseFormGroup?.controls?.['course_dates']?.value || [];
    const rawTopLevelGroups =
      this.detailData?.course_groups ??
      this.detailData?.courseGroups ??
      this.detailData?.groups ??
      this.courses.courseFormGroup?.controls?.['course_groups']?.value ??
      this.courses.courseFormGroup?.controls?.['courseGroups']?.value ??
      [];
    const topLevelGroups = Array.isArray(rawTopLevelGroups)
      ? rawTopLevelGroups
      : Object.values(rawTopLevelGroups || {});

    courseDates.forEach((courseDate: any) => {
      const courseGroupsRaw = courseDate?.course_groups || courseDate?.courseGroups || [];
      const courseGroups = Array.isArray(courseGroupsRaw) ? courseGroupsRaw : Object.values(courseGroupsRaw || {});
      const hasGroups = Array.isArray(courseGroups) && courseGroups.length > 0;

      if (!hasGroups) {
        const dateSubgroups = courseDate?.course_subgroups || courseDate?.courseSubgroups || [];
        dateSubgroups.forEach((subgroup: any, idx: number) => {
          const degreeId = subgroup?.degree_id ?? subgroup?.degreeId ?? subgroup?.group_id ?? subgroup?.course_group_id;
          this.addSubgroupToCache(cache, degreeId, subgroup, idx);
        });
      }

      courseGroups.forEach((group: any) => {
        const degreeId = group?.degree_id ?? group?.degreeId ?? group?.id;
        const groupSubgroups = group?.course_subgroups || group?.courseSubgroups || [];
        groupSubgroups.forEach((subgroup: any, idx: number) => {
          this.addSubgroupToCache(cache, degreeId, subgroup, idx);
        });
      });
    });

    // Fallback: hydrate cache from top-level course_groups if course_dates are empty
    topLevelGroups.forEach((group: any) => {
      const degreeId = group?.degree_id ?? group?.degreeId ?? group?.degree?.id ?? group?.id;
      const subgroups = group?.course_subgroups || group?.courseSubgroups || [];
      subgroups.forEach((subgroup: any, idx: number) => {
        this.addSubgroupToCache(cache, degreeId, subgroup, idx);
      });
    });

    this.previewSubgroupCache = cache;
  }

  ngOnInit(): void {
    this.id = this.incData ? this.incData.id : this.activatedRoute.snapshot.params.id;
    this.loadCourseDetail();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCourseDetail(): void {
    this.loading = true;
    this.crudService.get('/admin/courses/' + this.id,
      ['courseGroups.degree', 'courseGroups.courseDates.courseSubgroups.bookingUsers.client',
        'courseGroups.courseDates.courseSubgroups.bookingUsers.booking',
        'bookingUsers.client', 'bookingUsers.booking', 'sport', 'courseExtras'])
      .pipe(
        takeUntil(this.destroy$),
        switchMap((data: any) => {
          this.detailData = data.data;

          const isFIXCourse = this.detailData.name?.toUpperCase().includes('FIX');
          const schoolId = this.detailData.school_id;
          const sportId = this.detailData.sport_id;

          const degrees$ = this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + schoolId + '&sport_id=' + sportId)
            .pipe(map((res: any) => res?.data || []));

          const stationId = this.detailData.station_id;
          const stations$ = stationId
            ? this.crudService.getById('/stations', stationId).pipe(
                map((res: any) => {
                  const data = res?.data ?? res;
                  return data ? [data] : [];
                }),
                catchError(() => of([]))
              )
            : of([]);

          const courseDates = this.detailData.course_dates || [];
          const embeddedUsers = this.collectBookingUsersFromDetailData(courseDates);
          const hasEmbeddedUsers = Array.isArray(embeddedUsers) && embeddedUsers.length > 0;
          const bookingUsers$ = hasEmbeddedUsers
            ? of(embeddedUsers)
            : this.crudService.list('/booking-users', 1, 10000, 'desc', 'id', '&school_id=' + schoolId + '&course_id=' + this.detailData.id + '&with[]=client')
                .pipe(
                  map((res: any) => res?.data || []),
                  catchError(() => of(embeddedUsers || []))
                );

          return forkJoin({degrees: degrees$, stations: stations$, bookingUsers: bookingUsers$, isFIXCourse: of(isFIXCourse)});
        }),
        catchError((error) => {
          console.error('Error loading course detail', error);
          this.snackBar.open(this.TranslateService.instant('snackbar.error'), this.TranslateService.instant('close'), {duration: 4000});
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe((result: any) => {
        if (!result) {
          return;
        }
        const {degrees, stations, bookingUsers, isFIXCourse} = result;

        const courseDates = this.detailData.course_dates || [];
        const originalCourseDates = Array.isArray(courseDates)
          ? JSON.parse(JSON.stringify(courseDates))
          : [];
        const rawTopLevelGroups =
          this.detailData?.course_groups ??
          this.detailData?.courseGroups ??
          this.detailData?.groups ??
          this.courses.courseFormGroup?.controls?.['course_groups']?.value ??
          this.courses.courseFormGroup?.controls?.['courseGroups']?.value ??
          [];
        const topLevelGroups = Array.isArray(rawTopLevelGroups)
          ? rawTopLevelGroups
          : Object.values(rawTopLevelGroups || {});

        // Identify all degree_ids referenced by the course (even if degree is inactive)
        const usedDegreeIds = new Set<number>();
        const collectDegreeIds = (groupsArr: any[]) => {
          groupsArr.forEach((group: any) => {
            const degreeId = group?.degree_id ?? group?.degreeId ?? group?.degree?.id;
            if (degreeId != null) {
              usedDegreeIds.add(Number(degreeId));
            }
          });
        };
        (courseDates || []).forEach((cs: any) => collectDegreeIds(cs?.course_groups || cs?.courseGroups || []));
        collectDegreeIds(topLevelGroups || []);

        // Build degrees list including inactive ones if they are referenced by the course
        this.detailData.degrees = [];
        const degreeMap = new Map<number, any>();
        (degrees || []).forEach((element: any) => {
          if (element?.id != null) {
            degreeMap.set(Number(element.id), element);
          }
          if (element?.active || usedDegreeIds.has(Number(element.id))) {
            this.detailData.degrees.push({...element, active: true});
          }
        });

        // Add placeholders for any used degrees missing from the fetched list
        usedDegreeIds.forEach((degId) => {
          if (!this.detailData.degrees.some((d: any) => Number(d.id) === Number(degId))) {
            const placeholder = degreeMap.get(Number(degId)) || {id: degId, level: '', annotation: '', color: '#607d8b'};
            this.detailData.degrees.push({...placeholder, active: true});
          }
        });

        this.detailData.degrees.forEach((level: any) => {
          const isUsed = usedDegreeIds.has(Number(level?.id));
          level.active = isUsed;
          level.visible = isUsed;
          const matchesCourseDates = courseDates.some((cs: any) =>
            (cs?.course_groups || []).some((group: any) => Number(group?.degree_id ?? group?.degreeId) === Number(level.id))
          );
          const matchesTopLevel = topLevelGroups.some((group: any) => {
            const degreeId = group?.degree_id ?? group?.degreeId ?? group?.degree?.id;
            return Number(degreeId) === Number(level.id);
          });

          if (matchesCourseDates || matchesTopLevel || isUsed) {
            level.active = true;
            level.old = true;
            level.visible = true;
          }
        });

        // If course_dates came without groups but we have top-level course_groups, build a synthetic entry
        try {
          const courseDatesArray = this.courses.courseFormGroup.get('course_dates') as UntypedFormArray;
          const currentDates = courseDatesArray?.value || [];
          const hasOriginalGroups = Array.isArray(originalCourseDates) && originalCourseDates.some((cd: any) =>
            Array.isArray(cd?.course_groups) && cd.course_groups.length > 0
          );
          const hasDateGroups = Array.isArray(currentDates) && currentDates.some((cd: any) =>
            Array.isArray(cd?.course_groups) && cd.course_groups.length > 0
          );
          if (!hasDateGroups && hasOriginalGroups && courseDatesArray) {
            courseDatesArray.clear();
            originalCourseDates.forEach((cd: any) => {
              courseDatesArray.push(new UntypedFormControl(cd));
            });
          } else if (!hasDateGroups && Array.isArray(topLevelGroups) && topLevelGroups.length > 0 && courseDatesArray) {
            courseDatesArray.clear();
            const baseDate = currentDates?.[0] ? {...currentDates[0]} : {
              date: this.detailData?.reservable_from || this.detailData?.start_date || null,
              date_end: this.detailData?.reservable_to || this.detailData?.end_date || null
            };
            baseDate.course_groups = topLevelGroups;
            courseDatesArray.push(new UntypedFormControl(baseDate));
          }
        } catch (e) {
          console.warn('Failed to hydrate course_dates from top-level groups', e);
        }

        this.refreshPreviewSubgroupCache();

        const duplicates = this.courses.countCourseDateSubgroupDuplicates(courseDates);
        if (duplicates > 0) {
          console.warn(`CourseDetail detected ${duplicates} duplicate subgroup rows on load; the data will be sanitized before rendering.`);
        }

        (stations || []).forEach((element: any) => {
          if (element.id === this.detailData.station_id) this.detailData.station = element
        });

        const users = (bookingUsers && bookingUsers.length > 0) ? bookingUsers : [];
        this.detailData.users = users;

        if (isFIXCourse && this.detailData.users.length > 0) {
          const uniqueBookings = new Set();
          this.detailData.users.forEach((user: any) => {
            const bookingId = user.booking_id || user.id;
            if (bookingId) uniqueBookings.add(bookingId);
          });
          this.detailData.total_reservations = uniqueBookings.size;
        }

        this.detailData.booking_users = this.detailData.users;
        this.courses.settcourseFormGroup(this.detailData)
        this.initialFormSnapshot = this.cloneValue(this.courses.courseFormGroup.getRawValue());

        if (this.courses.courseFormGroup && this.detailData.users.length > 0) {
          const patchData: any = {
            booking_users: this.detailData.users
          };

          if (isFIXCourse) {
            patchData.total_reservations = this.detailData.total_reservations;
          }

          this.courses.courseFormGroup.patchValue(patchData);
          this.refreshPreviewSubgroupCache();
        }

        this.toggleClaimText = Boolean(this.courses.courseFormGroup.controls['claim_text'].value)
      });
  }

  updateCourses() {
    this.saving = true;
    const { mode, payload, fullPayload } = this.buildUpdatePayload(true);

    const request$ = mode === 'patch'
      ? this.crudService.patch('/admin/courses', payload, this.id)
      : this.crudService.update('/admin/courses', payload, this.id);

    request$
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Course update failed', error);
          if (mode === 'patch') {
            return this.crudService.update('/admin/courses', fullPayload, this.id);
          }
          this.snackBar.open(this.TranslateService.instant('snackbar.error'), this.TranslateService.instant('close'), {duration: 4000});
          return of(null);
        }),
        finalize(() => this.saving = false)
      )
      .subscribe((response: any) => {
        if (response && response.success) {
          this.snackBar.open(this.TranslateService.instant('course_updated_successfully'), this.TranslateService.instant('close'), {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.initialFormSnapshot = this.cloneValue(this.courses.courseFormGroup.getRawValue());
        }
      });
  }

  filterData() {

    let filter = '';

    if (this.selectedFrom) {
      filter = filter + '&start_date=' + moment(this.selectedFrom).format('YYYY-MM-DD');
    }
    if (this.selectedTo) {
      filter = filter + '&end_date=' + moment(this.selectedTo).format('YYYY-MM-DD');
    }
    if (this.selectedMonitorId) {
      filter = filter + '&monitor_id=' + this.selectedMonitorId;
    }

    this.filter = filter;

  }

  calculateTotal(data) {
    this.totalPriceSell = data.reduce((sum, item) => sum + item.total_cost, 0);
  }

  goTo(route: string, query: any = null) {
    this.router.navigate([route], {queryParams: query});
  }

  DateDiff = (value1: string, value2: string): number => Math.round((new Date(value2).getTime() - new Date(value1).getTime()) / 1000 / 60 / 60 / 24)
  count = (array: any[], key: string) => Boolean(array.map((a: any) => a[key]).find((a: any) => a))

  columns: TableColumn<any>[] = [
    {label: 'Id', property: 'id', type: 'id', visible: true, cssClasses: ['font-medium']},
    {label: 'type', property: 'sport', type: 'booking_users_image', visible: true},
    {label: 'course', property: 'booking_users', type: 'booking_users', visible: true},
    {label: 'client', property: 'client_main', type: 'client', visible: true},
    {label: 'dates', property: 'dates', type: 'booking_dates', visible: true},
    {label: 'register', property: 'created_at', type: 'date', visible: true},
    //{ label: 'Options', property: 'options', type: 'text', visible: true },
    {label: 'op_rem_abr', property: 'has_cancellation_insurance', type: 'light', visible: true},
    {label: 'B. Care', property: 'has_boukii_care', type: 'light', visible: true},
    {label: 'price', property: 'price_total', type: 'price', visible: true},
    {label: 'method_paiment', property: 'payment_method_id', type: 'payment_method_id', visible: true},
    {label: 'bonus', property: 'bonus', type: 'light', visible: true},
    {label: 'paid', property: 'paid', type: 'payment_status', visible: true},
    {label: 'status', property: 'status', type: 'cancelation_status', visible: true},
    {label: 'Actions', property: 'actions', type: 'button', visible: true}
  ];

  columnsSalesCollective: TableColumn<any>[] = [
    {label: 'type', property: 'icon', type: 'booking_users_image', visible: true},
    {label: 'name', property: 'name', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'level', property: 'group_name', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'availability', property: 'available_places', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'sold', property: 'booked_places', type: 'text', visible: true},
    {label: 'cash', property: 'cash', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'other', property: 'other', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'T.Boukii', property: 'boukii', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'T.Boukii Web', property: 'boukii_web', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'Link', property: 'online', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'no_paid', property: 'no_paid', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'admin', property: 'admin', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'web', property: 'web', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'vouchers', property: 'vouchers', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'extras', property: 'extras', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'total', property: 'total_cost', type: 'price', visible: true},
  ];

  icon = '../../../assets/img/icons/cursos.svg';

  columnsSalesPrivate: TableColumn<any>[] = [
    {label: 'type', property: 'icon', type: 'booking_users_image', visible: true},
    {label: 'name', property: 'name', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'availability', property: 'available_places', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'sold', property: 'booked_places', type: 'text', visible: true},
    {label: 'cash', property: 'cash', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'other', property: 'other', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'T.Boukii', property: 'boukii', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'T.Boukii Web', property: 'boukii_web', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'Link', property: 'online', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'no_paid', property: 'no_paid', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'admin', property: 'admin', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'web', property: 'web', type: 'text', visible: true, cssClasses: ['font-medium']},
    {label: 'vouchers', property: 'vouchers', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'extras', property: 'extras', type: 'price', visible: true, cssClasses: ['font-medium']},
    {label: 'total', property: 'total_cost', type: 'price', visible: true},
  ];

  protected readonly createComponent = MonitorsCreateUpdateComponent;

  /**
   * Open timing modal for subgroup students (cronometraje)
   */
  openTimingModal(subGroup: any, groupLevel: any, selectedDate?: any): void {

    if (!subGroup || !groupLevel) {
      console.error('No hay datos de subgrupo o nivel para mostrar tiempos.');
      alert('No hay datos de subgrupo o nivel para mostrar tiempos.');
      return;
    }

    const courseDates = this.detailData?.course_dates || [];

    // Crear booking users con course_date_id para filtrado correcto por día
    const bookingUsersWithDates = this.collectBookingUsersFromDetailData(courseDates);

    const students = (this.detailData?.users || []).map((u: any) => ({
      id: u.client_id,
      first_name: u.client?.first_name,
      last_name: u.client?.last_name,
      birth_date: u.client?.birth_date,
      country: u.client?.country,
      image: u.client?.image
    }));

    try {
      const ref = this.dialog.open(CourseTimingModalComponent, {
        width: '80%',
        maxWidth: '1200px',
        data: {
          subGroup,
          groupLevel,
          courseId: this.id,
          courseDates,
          students,
          // Pasamos bookings enriquecidos con course_date_id para filtrar por día
          bookingUsers: bookingUsersWithDates,
          // Preseleccionar el día si viene del reloj con día seleccionado
          selectedCourseDateId: selectedDate?.id ?? null
        }
      });


      ref.afterOpened().subscribe(() => {
      });

      ref.afterClosed().subscribe(result => {
      });
    } catch (error) {
      console.error('Error al abrir modal:', error);
      alert('Error al abrir modal: ' + error);
    }
  }

  /**
   * Extrae booking users de la estructura de detailData y les asigna course_date_id
   * para el filtrado correcto por fecha en el modal de timing
   */
  private collectBookingUsersFromDetailData(courseDates: any[]): any[] {
    const result: any[] = [];
    try {

      for (const cd of courseDates) {
        const cdId = cd?.id ?? null;

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
                course_subgroup_id: sg?.id ?? bu?.course_subgroup_id ?? bu?.course_sub_group_id,
                accepted: bu?.accepted ?? null,
                attended: bu?.attended ?? bu?.attendance ?? null,
                date: cd?.date ?? null
              };
              result.push(mappedUser);
            }
          }
        }
      }

      // Si no hemos encontrado nada en la estructura embebida, usar los usuarios globales
      if (result.length === 0 && this.detailData?.users) {
        const globalUsers = this.detailData.users;

        // Enriquecer con course_date_id y course_subgroup_id basándonos en las fechas
        const enrichedUsers = globalUsers.map((user: any) => {
          // Intentar encontrar la fecha y subgrupo correspondiente
          let foundCourseDate = null;
          let foundSubgroup = null;

          for (const cd of courseDates) {
            for (const g of (cd?.course_groups || [])) {
              for (const sg of (g?.course_subgroups || [])) {
                if (user?.course_subgroup_id === sg?.id || user?.course_sub_group_id === sg?.id) {
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
            ...user,
            course_date_id: foundCourseDate?.id ?? user?.course_date_id ?? null,
            course_subgroup_id: foundSubgroup?.id ?? user?.course_subgroup_id ?? user?.course_sub_group_id ?? null
          };
        });
        return enrichedUsers;
      }

      return result;
    } catch (e) {
      console.warn('collectBookingUsersFromDetailData error:', e);
      return this.detailData?.users || [];
    }
  }

  private cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private areEqual(a: any, b: any): boolean {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }

  private buildSettingsPayload(formValue: any): string {
    if (formValue.course_type === 1) {
      const currentSettings = this.courses.courseFormGroup.controls['settings'].value || {};
      return JSON.stringify({
        ...currentSettings,
        useMultipleIntervals: formValue.useMultipleIntervals,
        multipleIntervals: formValue.useMultipleIntervals,
        mustBeConsecutive: formValue.mustBeConsecutive,
        mustStartFromFirst: formValue.mustStartFromFirst,
        intervals: formValue.intervals || [],
        intervals_config_mode: formValue.intervals_config_mode || 'unified'
      });
    }
    return JSON.stringify(this.courses.courseFormGroup.controls['settings'].value);
  }

  private buildUpdatePayload(preferPatch: boolean): { mode: 'patch' | 'put', payload: any, fullPayload: any } {
    const formValue = this.courses.courseFormGroup.getRawValue();
    const translations = JSON.stringify(this.courses.courseFormGroup.controls['translations'].value);
    const settings = this.buildSettingsPayload(formValue);

    const fullPayload = {
      ...formValue,
      translations,
      settings
    };

    const initial = this.initialFormSnapshot || {};
    const heavyKeys = ['course_dates', 'booking_users', 'courseGroups', 'course_groups', 'courseSubgroups', 'course_subgroups'];
    const hasHeavyChanges = heavyKeys.some(key => !this.areEqual(formValue[key], initial[key]));

    const alwaysInclude = ['course_type', 'sport_id', 'school_id'];
    const changedScalars: any = { id: this.id, translations, settings };

    Object.keys(formValue || {}).forEach((key) => {
      if (heavyKeys.includes(key)) {
        return;
      }
      if (alwaysInclude.includes(key) || !this.areEqual(formValue[key], initial[key])) {
        changedScalars[key] = formValue[key];
      }
    });

    if (preferPatch && !hasHeavyChanges) {
      return { mode: 'patch', payload: changedScalars, fullPayload };
    }

    return { mode: 'put', payload: fullPayload, fullPayload };
  }
}
