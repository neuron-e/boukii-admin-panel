import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ApiCrudService } from '../../service/crud.service';
import { ApiResponse } from '../interface/api-response';

export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface PaginatedList<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SystemStats {
  pending_payments: number;
  overbookings: number;
  unassigned_courses: number;
  unassigned_group_subgroups?: number;
  unassigned_private_courses?: number;
}

export interface TodayOperations {
  courses_today: number;
  group_courses: number;
  private_courses: number;
  assigned_courses?: number;
  assigned_monitors: number;
  assigned_monitors_group?: number;
  assigned_monitors_private?: number;
  free_monitors: number;
  free_monitors_hours?: number;
  today_occupancy: number;
  unique_participants?: number;
  group_courses_sports?: SportBreakdown[];
  private_courses_sports?: SportBreakdown[];
  free_monitors_sports?: SportBreakdown[];
}

export interface SportBreakdown {
  sport_id: number;
  sport_name: string;
  icon?: string;
  count: number;
}

export interface GroupCourse {
  course_id: number;
  course_name: string;
  course_icon?: string | null;
  groups_count: number;
  assigned_monitors: number;
  participants: number;
  pending_payments: number;
  start_time?: string;
  end_time?: string;
  time_label?: string;
  monitors?: string[];
  currency?: string;
}

export interface PrivateCourse {
  id: number;
  course_name: string;
  course_icon?: string | null;
  client_name?: string;
  monitor_name?: string;
  is_paid: boolean;
  start_time?: string;
  end_time?: string;
  duration?: string;
  duration_hours?: number;
  date?: string;
  status: 'assigned' | 'pending';
  price: number;
  participants?: number;
  currency?: string;
  time_label?: string;
  course_type?: string;
}

export interface ForecastDay {
  date: string;
  label: string;
  bookings: number;
  participants: number;
  expected_revenue: number;
  pending_payments: number;
  assigned_monitors: number;
  private_courses?: number;
  group_courses?: number;
  courses?: number;
  unassigned?: number;
  free_monitors?: number;
  unpaid?: number;
  occupancy_percent?: number;
}

export interface ForecastResponse {
  forecast: ForecastDay[];
  currency: string;
}

export interface WeatherDay {
  date?: string;
  timeLabel?: string;
  minTemp?: number;
  maxTemp?: number;
  phrase?: string;
  icon?: number;
}

export interface WeatherResponse {
  forecast: WeatherDay[];
}

export interface CommercialPerformance {
  net_income_today: number;
  net_income_week: number;
  net_income_month: number;
  trend: 'up' | 'down' | 'stable';
  pending_payments: number;
  expected_revenue_today: number;
  total_bookings_today: number;
  boukii_revenue_estimate: number;
  currency: string;
}

export type SystemDetailType =
  | 'pending_payments'
  | 'overbooked_groups'
  | 'unassigned_groups'
  | 'unassigned_private'
  | 'free_monitors'
  | 'unassigned_all';

export interface SystemDetailItem {
  booking_id?: number;
  client_name?: string | null;
  monitor_name?: string | null;
  participants?: number;
  total_due?: number;
  course_name?: string;
  subgroup_id?: number;
  subgroup_number?: number | null;
  degree_name?: string | null;
  degree_order?: number | null;
  max_participants?: number;
  time_label?: string | null;
  section?: string;
  detail_type?: SystemDetailType;
}

export interface SystemDetailsResponse {
  type: SystemDetailType;
  date: string;
  items: SystemDetailItem[];
}

export interface CoursesCapacityResponse {
  group_courses: PaginatedList<GroupCourse>;
  private_courses: PaginatedList<PrivateCourse>;
  group_summary?: GroupCapacitySummary;
  private_summary?: PrivateCapacitySummary;
}

export interface GroupCapacitySummary {
  spots_sold: number;
  spots_available: number;
  spots_remaining: number;
  usage_percent: number;
  participants: number;
  groups: number;
}

export interface PrivateCapacitySummary {
  hours_sold: number;
  hours_available: number;
  hours_remaining: number;
  usage_percent: number;
  participants: number;
  courses_today: number;
  window_hours?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private defaultCurrency = 'CHF';

  constructor(private crudService: ApiCrudService) {}

  private getSchoolId(): number | null {
    try {
      const raw = localStorage.getItem('boukiiUser');
      if (!raw) return null;
      const user = JSON.parse(raw);
      const schoolId = user?.school?.id || user?.schools?.[0]?.id;
      return schoolId ? Number(schoolId) : null;
    } catch {
      return null;
    }
  }

  getSystemStats(date?: string): Observable<SystemStats> {
    const fallback: SystemStats = {
      pending_payments: 0,
      overbookings: 0,
      unassigned_courses: 0
    };
    return this.safeGet('/admin/dashboard/system', fallback, date ? { date } : {});
  }

  getOperations(date?: string): Observable<TodayOperations> {
    const fallback: TodayOperations = {
      courses_today: 0,
      group_courses: 0,
      private_courses: 0,
      assigned_monitors: 0,
      free_monitors: 0,
      today_occupancy: 0
    };
    return this.safeGet('/admin/dashboard/operations', fallback, date ? { date } : {});
  }

  getCourses(groupPage = 1, privatePage = 1, perPage = 6, date?: string): Observable<CoursesCapacityResponse> {
    const fallback: CoursesCapacityResponse = {
      group_courses: this.emptyPaginatedList(),
      private_courses: this.emptyPaginatedList()
    };
    return this.safeGet(
      '/admin/dashboard/courses',
      fallback,
      {
        group_page: groupPage,
        private_page: privatePage,
        per_page: perPage,
        ...(date ? { date } : {})
      }
    );
  }

  getForecast(days = 7, date?: string): Observable<ForecastResponse> {
    const fallback: ForecastResponse = {
      forecast: [],
      currency: this.defaultCurrency
    };
    return this.safeGet('/admin/dashboard/forecast', fallback, { days, ...(date ? { date } : {}) });
  }

  getCommercial(date?: string): Observable<CommercialPerformance> {
    const fallback: CommercialPerformance = {
      net_income_today: 0,
      net_income_week: 0,
      net_income_month: 0,
      trend: 'stable',
      pending_payments: 0,
      expected_revenue_today: 0,
      total_bookings_today: 0,
      boukii_revenue_estimate: 0,
      currency: this.defaultCurrency
    };
    return this.safeGet('/admin/dashboard/commercial', fallback, date ? { date } : {});
  }

  getSystemDetails(type: SystemDetailType, date?: string): Observable<SystemDetailsResponse> {
    const fallback: SystemDetailsResponse = { type, date: date ?? '', items: [] };
    return this.safeGet('/admin/dashboard/system-details', fallback, { type, ...(date ? { date } : {}) });
  }

  private getWeather12Hours(date?: string): Observable<WeatherResponse> {
    const fallback: WeatherResponse = { forecast: [] };
    const schoolId = this.getSchoolId();
    const requestFilters = {
      ...(schoolId ? { school_id: schoolId } : {}),
      ...(date ? { date } : {})
    };

    return this.crudService.get('/admin/weather', [], requestFilters).pipe(
      map((response: ApiResponse) => {
        if (response?.success && response?.data) {
          const normalized = (response.data as any[]).map((item) => ({
            timeLabel: item.time ?? item.timeLabel,
            minTemp: item.temperature ?? item.minTemp,
            maxTemp: item.temperature ?? item.maxTemp,
            icon: item.icon
          }));
          return { forecast: normalized as WeatherDay[] };
        }
        return fallback;
      }),
      catchError(() => of(fallback))
    );
  }

  private getWeatherSlots(date?: string): Observable<WeatherResponse> {
    const fallback: WeatherResponse = { forecast: [] };
    const schoolId = this.getSchoolId();
    const requestFilters = {
      ...(schoolId ? { school_id: schoolId } : {}),
      ...(date ? { date } : {})
    };

    return this.crudService.get('/admin/weather/slots', [], requestFilters).pipe(
      map((response: ApiResponse) => {
        if (response?.success && response?.data) {
          const normalized = (response.data as any[]).map((item) => ({
            timeLabel: item.time ?? item.timeLabel,
            minTemp: item.temperature ?? item.minTemp,
            maxTemp: item.temperature ?? item.maxTemp,
            icon: item.icon
          }));
          return { forecast: normalized as WeatherDay[] };
        }
        return fallback;
      }),
      catchError(() => of(fallback))
    );
  }

  private getWeather5Days(date?: string): Observable<WeatherResponse> {
    const fallback: WeatherResponse = { forecast: [] };
    const schoolId = this.getSchoolId();
    const requestFilters = {
      ...(schoolId ? { school_id: schoolId } : {}),
      ...(date ? { date } : {})
    };

    return this.crudService.get('/admin/weather/week', [], requestFilters).pipe(
      map((response: ApiResponse) => {
        if (response?.success && response?.data) {
          return { forecast: response.data as WeatherDay[] };
        }
        return fallback;
      }),
      catchError(() => of(fallback))
    );
  }

  getWeatherSummary(date?: string): Observable<WeatherResponse> {
    return this.getWeatherSlots(date).pipe(
      switchMap((payload) => {
        if (payload?.forecast?.length) {
          return of(payload);
        }
        return this.getWeather12Hours(date).pipe(
          switchMap((fallbackPayload) => {
            if (fallbackPayload?.forecast?.length) {
              return of(fallbackPayload);
            }
            return this.getWeather5Days(date);
          })
        );
      })
    );
  }

  private safeGet<T>(url: string, fallback: T, filters: any = {}): Observable<T> {
    const schoolId = this.getSchoolId();
    const requestFilters = {
      ...filters,
      ...(schoolId && !('school_id' in filters) ? { school_id: schoolId } : {})
    };

    return this.crudService.get(url, [], requestFilters).pipe(
      map((response: ApiResponse) => {
        if (response?.success && response?.data) {
          return response.data as T;
        }
        return fallback;
      }),
      catchError(() => of(fallback))
    );
  }

  private emptyPaginatedList<T>(): PaginatedList<T> {
    return {
      data: [],
      meta: {
        total: 0,
        per_page: 0,
        current_page: 1,
        last_page: 1
      }
    };
  }
}
