import { Component, OnInit, OnDestroy, signal, TemplateRef, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';

import { DashboardService } from '../../../services/dashboard.service';
import type {
  SystemStats,
  TodayOperations,
  GroupCourse,
  PrivateCourse,
  ForecastDay,
  WeatherDay,
  CommercialPerformance,
  PaginatedList,
  GroupCapacitySummary,
  PrivateCapacitySummary,
  SystemDetailItem,
  SystemDetailType,
  SportBreakdown
} from '../../../services/dashboard.service';


interface AdminStat {
  label: string;
  value: number;
  detail?: string;
}

interface TodaysOperationCard {
  icon: string;
  label: string;
  value: number;
  caption?: string;
  isOccupancy?: boolean;
  occupancyPercent?: number;
  badges?: Array<{ icon?: string; iconUrl?: string; value: number; tone?: 'orange' | 'green' | 'purple'; label?: string }>;
}

interface CommercialCard {
  label: string;
  value: string;
}

@Component({
  selector: 'vex-dashboard-analytics',
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss']
})
export class DashboardAnalyticsComponent implements OnInit, OnDestroy {
  // Signals for reactive state
  systemStats = signal<SystemStats | null>(null);
  operations = signal<TodayOperations | null>(null);
  groupCourses = signal<PaginatedList<GroupCourse>>({ data: [], meta: { total: 0, per_page: 6, current_page: 1, last_page: 1 } });
  privateCourses = signal<PaginatedList<PrivateCourse>>({ data: [], meta: { total: 0, per_page: 6, current_page: 1, last_page: 1 } });
  groupSummary = signal<GroupCapacitySummary | null>(null);
  privateSummary = signal<PrivateCapacitySummary | null>(null);
  forecastDays = signal<ForecastDay[]>([]);
  forecastCurrency = signal<string>('CHF');
  weatherDays = signal<WeatherDay[]>([]);
  commercial = signal<CommercialPerformance | null>(null);
  selectedDate = signal<Date>(new Date());

  loading = signal<boolean>(false);

  groupPage = signal<number>(1);
  privatePage = signal<number>(1);
  perPage = 6;
  loadingMoreGroup = false;
  loadingMorePrivate = false;

  systemDetailItems = signal<SystemDetailItem[]>([]);
  systemDetailType = signal<SystemDetailType>('pending_payments');
  systemDetailLoading = signal<boolean>(false);

  @ViewChild('systemDetailDialog') systemDetailDialog?: TemplateRef<any>;

  constructor(
    private dashboardService: DashboardService,
    private translate: TranslateService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  refreshAll(): void {
    this.loading.set(true);
    const dateParam = this.formatDateParam(this.selectedDate());

    this.groupPage.set(1);
    this.privatePage.set(1);

    forkJoin({
      system: this.dashboardService.getSystemStats(dateParam),
      operations: this.dashboardService.getOperations(dateParam),
      courses: this.dashboardService.getCourses(this.groupPage(), this.privatePage(), this.perPage, dateParam),
      forecast: this.dashboardService.getForecast(7, dateParam),
      weather: this.dashboardService.getWeatherSummary(dateParam)
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (results) => {
          this.systemStats.set(results.system);
          this.operations.set(results.operations);
          this.groupCourses.set(results.courses.group_courses);
          this.privateCourses.set(results.courses.private_courses);
          this.groupSummary.set(results.courses.group_summary ?? null);
          this.privateSummary.set(results.courses.private_summary ?? null);
          this.forecastDays.set(results.forecast.forecast);
          this.forecastCurrency.set(results.forecast.currency);
          this.weatherDays.set(results.weather.forecast);
        },
        error: (err) => {
          console.error('Dashboard refresh error:', err);
        }
      });
  }

  loadCourses(): void {
    const dateParam = this.formatDateParam(this.selectedDate());
    this.dashboardService
      .getCourses(this.groupPage(), this.privatePage(), this.perPage, dateParam)
      .subscribe({
        next: (response) => {
          this.groupCourses.set(response.group_courses);
          this.privateCourses.set(response.private_courses);
          this.groupSummary.set(response.group_summary ?? null);
          this.privateSummary.set(response.private_summary ?? null);
        },
        error: (err) => {
          console.error('Courses load error:', err);
        }
      });
  }

  private loadGroupPage(page: number, append = false): void {
    const dateParam = this.formatDateParam(this.selectedDate());
    this.loadingMoreGroup = true;
    this.dashboardService
      .getCourses(page, this.privatePage(), this.perPage, dateParam)
      .subscribe({
        next: (response) => {
          const current = this.groupCourses();
          const nextList = append ? [...current.data, ...response.group_courses.data] : response.group_courses.data;
          this.groupCourses.set({ data: nextList, meta: response.group_courses.meta });
          this.privateCourses.set(response.private_courses);
          this.groupSummary.set(response.group_summary ?? this.groupSummary());
          this.privateSummary.set(response.private_summary ?? this.privateSummary());
          this.groupPage.set(page);
          this.loadingMoreGroup = false;
        },
        error: (err) => {
          console.error('Courses load error:', err);
          this.loadingMoreGroup = false;
        }
      });
  }

  private loadPrivatePage(page: number, append = false): void {
    const dateParam = this.formatDateParam(this.selectedDate());
    this.loadingMorePrivate = true;
    this.dashboardService
      .getCourses(this.groupPage(), page, this.perPage, dateParam)
      .subscribe({
        next: (response) => {
          const current = this.privateCourses();
          const nextList = append ? [...current.data, ...response.private_courses.data] : response.private_courses.data;
          this.privateCourses.set({ data: nextList, meta: response.private_courses.meta });
          this.groupCourses.set(response.group_courses);
          this.groupSummary.set(response.group_summary ?? this.groupSummary());
          this.privateSummary.set(response.private_summary ?? this.privateSummary());
          this.privatePage.set(page);
          this.loadingMorePrivate = false;
        },
        error: (err) => {
          console.error('Courses load error:', err);
          this.loadingMorePrivate = false;
        }
      });
  }

  setGroupPage(page: number): void {
    this.groupPage.set(page);
    this.loadGroupPage(page);
  }

  setPrivatePage(page: number): void {
    this.privatePage.set(page);
    this.loadPrivatePage(page);
  }

  // Getters for computed data
  get userName(): string {
    try {
      const raw = localStorage.getItem('boukiiUser');
      if (!raw) return '';
      const user = JSON.parse(raw);
      return user?.name || user?.full_name || user?.first_name || '';
    } catch {
      return '';
    }
  }

  get formattedDate(): string {
    const date = this.selectedDate();
    const day = date.getDate();
    const ordinal = this.getOrdinalSuffix(day);
    const monthName = date.toLocaleDateString(this.getLocale(), { month: 'long' });
    const year = date.getFullYear();
    return monthName + ' ' + day + ordinal + ', ' + year;
  }

  get weekdayName(): string {
    return this.selectedDate().toLocaleDateString(this.getLocale(), { weekday: 'long' });
  }

  private getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    const lastDigit = day % 10;
    if (lastDigit === 1) return 'st';
    if (lastDigit === 2) return 'nd';
    if (lastDigit === 3) return 'rd';
    return 'th';
  }

  private getLocale(): string {
    return this.translate.currentLang || 'en';
  }

  onDateChange(event: MatDatepickerInputEvent<Date>): void {
    if (!event.value) return;
    this.selectedDate.set(event.value);
    this.refreshAll();
  }

  onGroupScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 20;
    const meta = this.groupCourses().meta;
    if (nearBottom && !this.loadingMoreGroup && meta.current_page < meta.last_page) {
      this.loadGroupPage(meta.current_page + 1, true);
    }
  }

  onPrivateScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 20;
    const meta = this.privateCourses().meta;
    if (nearBottom && !this.loadingMorePrivate && meta.current_page < meta.last_page) {
      this.loadPrivatePage(meta.current_page + 1, true);
    }
  }

  openSystemDetails(type: SystemDetailType): void {
    this.systemDetailType.set(type);
    this.systemDetailLoading.set(true);
    const dateParam = this.formatDateParam(this.selectedDate());

    if (type === 'unassigned_all') {
      forkJoin({
        groups: this.dashboardService.getSystemDetails('unassigned_groups', dateParam),
        privates: this.dashboardService.getSystemDetails('unassigned_private', dateParam)
      }).subscribe({
        next: (response) => {
          const items: SystemDetailItem[] = [];
          if (response.groups.items?.length) {
            items.push(...response.groups.items.map(item => ({ ...item, detail_type: 'unassigned_groups' as SystemDetailType })));
          }
          if (response.privates.items?.length) {
            items.push(...response.privates.items.map(item => ({ ...item, detail_type: 'unassigned_private' as SystemDetailType })));
          }
          this.systemDetailItems.set(items);
          this.systemDetailLoading.set(false);
          this.openSystemDialog();
        },
        error: (err) => {
          console.error('System detail error:', err);
          this.systemDetailItems.set([]);
          this.systemDetailLoading.set(false);
          this.openSystemDialog();
        }
      });
      return;
    }

    this.dashboardService.getSystemDetails(type, dateParam).subscribe({
      next: (response) => {
        const items = (response.items ?? []).map(item => ({ ...item, detail_type: type as SystemDetailType }));
        this.systemDetailItems.set(items);
        this.systemDetailLoading.set(false);
        this.openSystemDialog();
      },
      error: (err) => {
        console.error('System detail error:', err);
        this.systemDetailItems.set([]);
        this.systemDetailLoading.set(false);
        this.openSystemDialog();
      }
    });
  }

  private openSystemDialog(): void {
    if (this.systemDetailDialog) {
      this.dialog.open(this.systemDetailDialog, {
        width: '840px',
        maxWidth: '95vw',
        panelClass: 'system-detail-dialog'
      });
    }
  }

  get systemDetailSections(): Array<{ title: string; type: SystemDetailType; items: SystemDetailItem[] }> {
    const type = this.systemDetailType();
    const items = this.systemDetailItems().filter(item => !item.section);

    if (type !== 'unassigned_all') {
      return [
        {
          title: this.systemDetailTitle,
          type,
          items
        }
      ];
    }

    const groupItems = items.filter(item => item.detail_type === 'unassigned_groups');
    const privateItems = items.filter(item => item.detail_type === 'unassigned_private');
    const sections: Array<{ title: string; type: SystemDetailType; items: SystemDetailItem[] }> = [];

    if (groupItems.length) {
      sections.push({
        title: this.translate.instant('dashboard.group_courses'),
        type: 'unassigned_groups',
        items: groupItems
      });
    }

    if (privateItems.length) {
      sections.push({
        title: this.translate.instant('dashboard.private_courses'),
        type: 'unassigned_private',
        items: privateItems
      });
    }

    return sections;
  }

  get systemDetailTitle(): string {
    const type = this.systemDetailType();
    const map: Record<SystemDetailType, string> = {
      pending_payments: 'dashboard.pending_payments',
      overbooked_groups: 'dashboard.overbooked_groups',
      unassigned_groups: 'dashboard.unassigned_group_subgroups',
      unassigned_private: 'dashboard.unassigned_private_sessions',
      unassigned_all: 'dashboard.unassigned_courses'
    };
    return this.translate.instant(map[type]);
  }

  get systemDetailEmptyLabel(): string {
    return this.translate.instant('dashboard.no_records');
  }

  getSystemMeta(item: SystemDetailItem): string[] {
    if (item.section) {
      return [];
    }
    const type = this.systemDetailType();
    const parts: string[] = [];

    if (item.time_label) {
      parts.push(`${this.translate.instant('dashboard.time')}: ${item.time_label}`);
    }

    if (typeof item.participants === 'number') {
      parts.push(`${this.translate.instant('dashboard.participants')}: ${item.participants}`);
    }

    if (type === 'pending_payments' && typeof item.total_due === 'number') {
      parts.push(`${this.translate.instant('amount')}: ${this.formatCurrency(item.total_due)}`);
    }

    if (type === 'overbooked_groups' && typeof item.max_participants === 'number') {
      parts.push(`${this.translate.instant('dashboard.capacity_limit')}: ${item.max_participants}`);
    }

    return parts;
  }

  getSystemTitle(item: SystemDetailItem): string {
    if (item.section) {
      return item.section;
    }
    const type = this.systemDetailType();
    if (type === 'pending_payments') {
      return item.client_name ? item.client_name : `${this.translate.instant('booking')} #${item.booking_id}`;
    }

    if (type === 'unassigned_private') {
      return item.client_name ? item.client_name : item.course_name ?? '';
    }

    return item.course_name ?? '';
  }

  getSystemSubtitle(item: SystemDetailItem): string | null {
    if (item.section) {
      return null;
    }
    const type = this.systemDetailType();
    if (type === 'pending_payments' && item.booking_id) {
      return `${this.translate.instant('booking')} #${item.booking_id}`;
    }
    if (type === 'overbooked_groups' && item.subgroup_id) {
      return `${this.translate.instant('dashboard.groups')}: ${item.subgroup_id}`;
    }
    if (type === 'unassigned_groups' && item.subgroup_id) {
      return `${this.translate.instant('dashboard.groups')}: ${item.subgroup_id}`;
    }
    return null;
  }

  getGroupSubgroupLabel(item: SystemDetailItem): string {
    const level = item.degree_name ? item.degree_name : '';
    const subgroup = item.subgroup_number != null
      ? String(item.subgroup_number)
      : (item.subgroup_id != null ? String(item.subgroup_id) : '');
    if (level && subgroup) {
      return `${level} ${subgroup}`;
    }
    return level || subgroup || '-';
  }

  private formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get systemAdminCards(): Array<{ icon: string; label: string; value: number; color: string }> {
    const stats = this.systemStats();
    const ops = this.operations();
    if (!stats || !ops) return [];
    return [
      { icon: 'payment', label: 'dashboard.pending_payments', value: stats.pending_payments, color: 'orange' },
      { icon: 'trending_up', label: 'dashboard.course_overbooking', value: stats.overbookings, color: 'red' },
      { icon: 'assignment', label: 'dashboard.unassigned_courses', value: stats.unassigned_courses, color: 'blue' },
      { icon: 'person_check', label: 'dashboard.free_monitors', value: ops.free_monitors, color: 'green' }
    ];
  }

  get adminSummaryStats(): AdminStat[] {
    const stats = this.systemStats();
    if (!stats) return [];

    const groupLabel = this.translate.instant('dashboard.group_subgroups');
    const privateLabel = this.translate.instant('dashboard.private_sessions');
    const groupCount = stats.unassigned_group_subgroups ?? 0;
    const privateCount = stats.unassigned_private_courses ?? 0;

    return [
      {
        label: this.translate.instant('dashboard.pending_payments'),
        value: stats.pending_payments
      },
      {
        label: this.translate.instant('dashboard.overbookings'),
        value: stats.overbookings
      },
      {
        label: this.translate.instant('dashboard.unassigned_courses'),
        value: stats.unassigned_courses,
        detail: `${groupLabel}: ${groupCount} \u00b7 ${privateLabel}: ${privateCount}`
      }
    ];
  }

  get todaysOperationsCards(): TodaysOperationCard[] {
    const ops = this.operations();
    if (!ops) return [];

    const groupBadges = this.buildSportBadges(ops.group_courses_sports);
    const privateBadges = this.buildSportBadges(ops.private_courses_sports);
    const freeMonitorBadges = this.buildSportBadges(ops.free_monitors_sports);
    const assignedBadges: TodaysOperationCard['badges'] = [
      {
        icon: 'groups',
        value: ops.assigned_monitors_group ?? 0,
        tone: 'orange'
      },
      {
        icon: 'person',
        value: ops.assigned_monitors_private ?? 0,
        tone: 'green'
      }
    ];

    return [
      {
        icon: 'groups',
        label: this.translate.instant('dashboard.group_course_groups'),
        value: ops.group_courses,
        caption: this.translate.instant('dashboard.scheduled_today'),
        badges: groupBadges
      },
      {
        icon: 'person',
        label: this.translate.instant('dashboard.private_courses'),
        value: ops.private_courses,
        caption: this.translate.instant('dashboard.scheduled_today'),
        badges: privateBadges
      },
      {
        icon: 'person_add',
        label: this.translate.instant('dashboard.assigned_monitors'),
        value: ops.assigned_monitors,
        caption: this.translate.instant('dashboard.active_now')
        ,
        badges: assignedBadges
      },
      {
        icon: 'person_off',
        label: this.translate.instant('dashboard.free_monitors'),
        value: ops.free_monitors,
        caption: ops.free_monitors_hours !== undefined
          ? `${ops.free_monitors_hours}h ${this.translate.instant('dashboard.hours_available')}`
          : this.translate.instant('dashboard.available_now'),
        badges: freeMonitorBadges
      },
      {
        icon: 'trending_up',
        label: this.translate.instant('dashboard.participants'),
        value: ops.unique_participants ?? 0,
        caption: this.translate.instant('dashboard.unique_participants')
      },
      {
        icon: 'calendar_today',
        label: this.translate.instant('dashboard.courses_today'),
        value: ops.courses_today,
        caption: this.translate.instant('dashboard.total_scheduled')
      }
    ];
  }

  private buildSportBadges(items?: SportBreakdown[]): TodaysOperationCard['badges'] {
    if (!items || items.length === 0) {
      return undefined;
    }
    const tones: Array<'orange' | 'green' | 'purple'> = ['orange', 'green', 'purple'];
    return items
      .filter((item) => item.count > 0)
      .map((item, index) => ({
        iconUrl: item.icon,
        value: item.count,
        tone: tones[index % tones.length],
        label: item.sport_name
      }));
  }

  get commercialCards(): CommercialCard[] {
    const comm = this.commercial();
    if (!comm) return [];

    return [
      {
        label: this.translate.instant('dashboard.net_income_today'),
        value: this.formatCurrency(comm.net_income_today, comm.currency)
      },
      {
        label: this.translate.instant('dashboard.net_income_week'),
        value: this.formatCurrency(comm.net_income_week, comm.currency)
      },
      {
        label: this.translate.instant('dashboard.net_income_month'),
        value: this.formatCurrency(comm.net_income_month, comm.currency)
      }
    ];
  }

  get overallCapacityPercent(): number {
    const ops = this.operations();
    return ops?.today_occupancy ?? 0;
  }

  get totalGroupParticipants(): number {
    return this.groupSummary()?.participants ?? this.groupCourses().data.reduce((sum, c) => sum + c.participants, 0);
  }

  get totalPrivateLessons(): number {
    return this.privateSummary()?.participants ?? this.privateCourses().data.reduce((sum, c) => sum + (c.participants ?? 0), 0);
  }

  get groupCapacityUsage(): number {
    return this.groupSummary()?.usage_percent ?? this.overallCapacityPercent;
  }

  get privateCapacityUsage(): number {
    return this.privateSummary()?.usage_percent ?? this.overallCapacityPercent;
  }

  formatCurrency(amount: number, currency = 'CHF'): string {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency
    }).format(amount);
  }

  formatWeatherDate(day: WeatherDay): string {
    if (day.timeLabel) return day.timeLabel;
    if (day.date) {
      try {
        const date = new Date(day.date);
        return date.toLocaleDateString(this.translate.currentLang || 'en', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return day.date;
      }
    }
    return '';
  }

  formatShortDate(date: Date): string {
    return date.toLocaleDateString(this.getLocale(), {
      month: 'short',
      day: 'numeric'
    });
  }

  formatForecastLabel(day: ForecastDay): string {
    try {
      const date = new Date(day.date);
      return date.toLocaleDateString(this.getLocale(), { weekday: 'long' });
    } catch {
      return day.label || day.date;
    }
  }

  formatForecastDate(day: ForecastDay): string {
    try {
      const date = new Date(day.date);
      return date.toLocaleDateString(this.getLocale(), { month: 'short', day: 'numeric' });
    } catch {
      return day.date;
    }
  }
formatWeatherTime(dateStr: string): string {    try {      const date = new Date(dateStr);      return date.toLocaleTimeString(this.getLocale(), {        hour: '2-digit',        minute: '2-digit',        hour12: false      });    } catch {      return '';    }  }

  getWeatherIconPath(icon: number | undefined): string {
    const safeIcon = Number(icon);
    if (!safeIcon) return '/assets/icons/weather/1.png';
    return `/assets/icons/weather/${safeIcon}@3x.png`;
  }

  get weatherSubtitle(): string {
    const hasHourly = this.weatherDays().some(day => !!day.timeLabel);
    return this.translate.instant(hasHourly ? 'dashboard.weather_twelve_hours' : 'dashboard.weather_five_days');
  }

  get weatherPlaceholderSlots(): number[] {
    return [1, 2, 3, 4, 5, 6];
  }

  getForecastMaxRevenue(): number {
    const max = Math.max(...this.forecastDays().map(d => d.expected_revenue), 1);
    return max || 1;
  }

  getForecastPercent(day: ForecastDay): number {
    const max = this.getForecastMaxRevenue();
    return max > 0 ? (day.expected_revenue / max) * 100 : 0;
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    if (trend === 'up') return 'mat:trending_up';
    if (trend === 'down') return 'mat:trending_down';
    return 'mat:trending_flat';
  }

  getTrendLabel(trend: 'up' | 'down' | 'stable'): string {
    return this.translate.instant(`dashboard.trend_${trend}`);
  }
}
