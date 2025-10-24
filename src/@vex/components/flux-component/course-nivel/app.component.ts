import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiCrudService } from '../../../../service/crud.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-course-detail-nivel',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class CourseDetailCardNivelComponent implements OnInit {

  @Input() courseFormGroup!: UntypedFormGroup
  @Input() checkbox: boolean = false
  @Input() selectedSubgroup: any;
  @Input() hideTimingButton: boolean = false;
  @Output() changeMonitor = new EventEmitter<any>()
  @Output() viewTimes = new EventEmitter<{ subGroup: any, groupLevel: any, selectedDate?: any }>()

  today: Date = new Date()

  // Track collapsed state for each subgroup (key format: "degreeId_subgroupIndex")
  collapsedSubgroups: { [key: string]: boolean } = {}

  ngOnInit() {
    // Component initialization without debug logs
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
  // Obtiene los IDs de subgrupo para un índice concreto (posición) a lo largo de todas las fechas
  getSubgroupIdsForIndex(courseDates: any[], degreeId: number, index: number): number[] {
    if (!Array.isArray(courseDates)) return [];
    const ids = new Set<number>();
    for (const cd of courseDates) {
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
          const courseDates = this.getCourseDates();
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

      // Filtrar por degree_id
      const matchingUsers = users.filter((user: any) => {
        const userDegreeId = user?.degree_id ?? user?.degreeId;
        return userDegreeId === degreeId;
      });

      return matchingUsers;
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

  /**
   * Get capacity indicator for a specific date in a subgroup
   * Returns string like "1/6" (occupied/total)
   */
  getCapacityIndicatorForDate(bookingUsers: any, degreeId: number, subgroupIndex: number, courseDateId: number, totalCapacity: number): string {
    const usersInDate = this.getUsersForSpecificDate(bookingUsers, degreeId, courseDateId);
    const occupied = usersInDate.length;
    return `${occupied}/${totalCapacity}`;
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
    const sum = courseDates
      .flatMap((date: any) => this.groupsOf(date))
      .filter((group: any) => this.degreeIdOf(group) === degreeId)
      .flatMap((group: any) => this.subgroupsOf(group))
      .filter((subgroup: any) => (subgroup?.degree_id ?? subgroup?.degreeId) === degreeId).length;
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
    this.crudService.update('/admin/booking-users', payload, user.id)
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
