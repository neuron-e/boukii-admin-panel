import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiCrudService } from '../../service/crud.service';
import {
  DashboardMetrics,
  CriticalAlerts,
  RevenueMetrics,
  OccupancyData,
  UpcomingActivities,
  TrendData,
  QuickStats,
  BookingActivity,
  Course
} from '../interfaces/dashboard-metrics.interface';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private user: any;

  constructor(private crudService: ApiCrudService) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser') || '{}');
  }

  /**
   * Obtiene todas las métricas del dashboard de una vez
   */
  getDashboardMetrics(selectedDate: moment.Moment = moment()): Observable<DashboardMetrics> {
    const schoolId = this.user.schools?.[0]?.id;
    if (!schoolId) {
      return of(this.getEmptyMetrics());
    }

    return forkJoin({
      alertas: this.getCriticalAlerts(selectedDate, schoolId),
      revenue: this.getRevenueMetrics(selectedDate, schoolId),
      ocupacion: this.getOccupancyData(selectedDate, schoolId),
      proximasActividades: this.getUpcomingActivities(selectedDate, schoolId),
      tendencias: this.getTrendData(selectedDate, schoolId),
      quickStats: this.getQuickStats(selectedDate, schoolId)
    }).pipe(
      map(data => ({
        ...data,
        lastUpdated: new Date().toISOString()
      })),
      catchError(error => {
        console.error('Error obteniendo métricas del dashboard:', error);
        return of(this.getEmptyMetrics());
      })
    );
  }

  /**
   * Obtiene alertas críticas del sistema
   */
  private getCriticalAlerts(date: moment.Moment, schoolId: number): Observable<CriticalAlerts> {
    const dateStr = date.format('YYYY-MM-DD');

    return forkJoin({
      // Reservas con problemas graves (sin procesar agresivamente)
      huerfanas: of(0), // Temporalmente desactivado para evitar falsos positivos

      // Cursos privados sin monitor
      sinMonitor: this.crudService.list('/booking-users', 1, 1000, 'desc', 'id',
        `&school_id=${schoolId}&date=${dateStr}&monitor_id=null&course_type=2`).pipe(
        map((response: any) => response?.data?.length || 0),
        catchError(() => of(0))
      ),

      // Pagos pendientes
      pagosPendientes: this.crudService.list('/bookings', 1, 1000, 'desc', 'id',
        `&school_id=${schoolId}&paid=false&status=1`).pipe(
        map((response: any) => response?.data?.length || 0),
        catchError(() => of(0))
      ),

      // Conflictos de horarios (simplificado por ahora)
      conflictos: of(0),

      // Capacidad crítica (>90%)
      capacidadCritica: this.getCriticalCapacityCourses(date, schoolId)
    }).pipe(
      map(results => ({
        reservasHuerfanas: results.huerfanas,
        cursosSinMonitor: results.sinMonitor,
        pagosPendientes: results.pagosPendientes,
        conflictosHorarios: results.conflictos,
        capacidadCritica: results.capacidadCritica
      }))
    );
  }

  /**
   * Obtiene métricas de ingresos
   */
  private getRevenueMetrics(date: moment.Moment, schoolId: number): Observable<RevenueMetrics> {
    const today = date.format('YYYY-MM-DD');
    const weekStart = date.clone().startOf('week').format('YYYY-MM-DD');
    const monthStart = date.clone().startOf('month').format('YYYY-MM-DD');

    return forkJoin({
      hoy: this.getRevenueForPeriod(today, today, schoolId),
      semana: this.getRevenueForPeriod(weekStart, today, schoolId),
      mes: this.getRevenueForPeriod(monthStart, today, schoolId)
    }).pipe(
      map(revenue => ({
        ingresosHoy: revenue.hoy,
        ingresosSemana: revenue.semana,
        ingresosMes: revenue.mes,
        tendencia: this.calculateTrend(revenue.hoy, revenue.semana),
        comparacionPeriodoAnterior: 0, // TODO: Implementar comparación
        moneda: this.user.schools?.[0]?.currency || 'EUR'
      }))
    );
  }

  /**
   * Obtiene datos de ocupación
   */
  private getOccupancyData(date: moment.Moment, schoolId: number): Observable<OccupancyData> {
    const dateStr = date.format('YYYY-MM-DD');

    return forkJoin({
      privados: this.getCourseOccupancy(dateStr, schoolId, 2),
      colectivos: this.getCourseOccupancy(dateStr, schoolId, 1)
    }).pipe(
      map(data => {
        const total = {
          ocupados: data.privados.ocupados + data.colectivos.ocupados,
          disponibles: data.privados.disponibles + data.colectivos.disponibles,
          porcentaje: 0
        };
        total.porcentaje = total.disponibles > 0
          ? Math.round((total.ocupados / (total.ocupados + total.disponibles)) * 100)
          : 0;

        return {
          cursosPrivados: data.privados,
          cursosColectivos: data.colectivos,
          total
        };
      })
    );
  }

  /**
   * Obtiene actividades próximas
   */
  private getUpcomingActivities(date: moment.Moment, schoolId: number): Observable<UpcomingActivities> {
    const dateStr = date.format('YYYY-MM-DD');

    return this.crudService.list('/booking-users', 1, 20, 'asc', 'id',
      `&school_id=${schoolId}&date=${dateStr}`, '', null, '',
      ['client', 'course', 'monitor']).pipe(
      map((response: any) => {
        const bookings = response?.data || [];

        const activities: BookingActivity[] = bookings.map((booking: any) => ({
          id: booking.id,
          clientName: booking.client?.first_name || 'Cliente',
          courseName: booking.course?.name || 'Curso',
          time: booking.hour_start || '00:00',
          type: booking.course?.course_type === 2 ? 'private' : 'collective',
          status: booking.monitor_id ? 'confirmed' : 'warning',
          monitor: booking.monitor?.first_name || undefined
        }));

        return {
          proximasHoras: activities.slice(0, 8),
          alertasCapacidad: [], // TODO: Implementar
          monitorPendiente: activities.filter(a => a.status === 'warning')
        };
      }),
      catchError(() => of({
        proximasHoras: [],
        alertasCapacidad: [],
        monitorPendiente: []
      }))
    );
  }

  /**
   * Obtiene datos de tendencias REALES (simplificado para evitar sobrecarga)
   */
  private getTrendData(date: moment.Moment, schoolId: number): Observable<TrendData> {
    // Por ahora, obtener datos de la última semana en lugar de 30 días para evitar 30 llamadas API
    const dates: string[] = [];
    const promises: Observable<number>[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = date.clone().subtract(i, 'days');
      const dateStr = d.format('YYYY-MM-DD');
      dates.push(d.format('DD/MM'));

      // Obtener reservas reales para cada día
      const dayBookings = this.crudService.list('/booking-users', 1, 1000, 'desc', 'id',
        `&school_id=${schoolId}&date=${dateStr}`).pipe(
        map((response: any) => response?.data?.length || 0),
        catchError(() => of(0))
      );

      promises.push(dayBookings);
    }

    return forkJoin(promises).pipe(
      map(bookings => ({
        reservasUltimos30Dias: bookings,
        fechas: dates,
        comparacionPeriodoAnterior: {
          reservas: 0, // TODO: Calcular comparación real
          ingresos: 0  // TODO: Calcular comparación real
        }
      })),
      catchError(() => {
        // Fallback en caso de error - devolver datos vacíos pero válidos
        console.warn('Error obteniendo datos de tendencias, usando fallback');
        return of({
          reservasUltimos30Dias: [0, 0, 0, 0, 0, 0, 0],
          fechas: ['Hace 6d', 'Hace 5d', 'Hace 4d', 'Hace 3d', 'Hace 2d', 'Ayer', 'Hoy'],
          comparacionPeriodoAnterior: {
            reservas: 0,
            ingresos: 0
          }
        });
      })
    );
  }

  /**
   * Obtiene estadísticas rápidas
   */
  private getQuickStats(date: moment.Moment, schoolId: number): Observable<QuickStats> {
    const dateStr = date.format('YYYY-MM-DD');

    return forkJoin({
      reservas: this.crudService.list('/booking-users', 1, 1000, 'desc', 'id',
        `&school_id=${schoolId}&date=${dateStr}`).pipe(
        map((response: any) => response?.data?.length || 0),
        catchError(() => of(0))
      ),
      ingresos: this.getRevenueForPeriod(dateStr, dateStr, schoolId)
    }).pipe(
      map(data => ({
        reservasHoy: data.reservas,
        ingresosHoy: data.ingresos,
        ocupacionActual: 0, // Se calculará desde ocupacion
        alertasCriticas: 0  // Se calculará desde alertas
      }))
    );
  }

  // Métodos auxiliares privados
  private getRevenueForPeriod(startDate: string, endDate: string, schoolId: number): Observable<number> {
    return this.crudService.list('/bookings', 1, 1000, 'desc', 'id',
      `&school_id=${schoolId}&date_start=${startDate}&date_end=${endDate}&paid=true`).pipe(
      map((response: any) => {
        const bookings = response?.data || [];
        return bookings.reduce((total: number, booking: any) => total + (parseFloat(booking.price_total) || 0), 0);
      }),
      catchError(() => of(0))
    );
  }

  private getCourseOccupancy(date: string, schoolId: number, courseType: number): Observable<{ocupados: number, disponibles: number, porcentaje: number}> {
    return this.crudService.list('/admin/courses', 1, 1000, 'desc', 'id',
      `&school_id=${schoolId}&date_start=${date}&course_type=${courseType}`,
      '', null, '', ['courseDates.courseSubgroups']).pipe(
      map((response: any) => {
        const courses = response?.data || [];
        let totalOcupados = 0;
        let totalDisponibles = 0;

        courses.forEach((course: any) => {
          const ocupados = course.total_occupied_places || 0;
          const disponibles = course.total_available_places || 0;
          totalOcupados += ocupados;
          totalDisponibles += disponibles;
        });

        const porcentaje = totalDisponibles > 0
          ? Math.round((totalOcupados / (totalOcupados + totalDisponibles)) * 100)
          : 0;

        return {
          ocupados: totalOcupados,
          disponibles: totalDisponibles,
          porcentaje
        };
      }),
      catchError(() => of({ ocupados: 0, disponibles: 0, porcentaje: 0 }))
    );
  }

  private getCriticalCapacityCourses(date: moment.Moment, schoolId: number): Observable<number> {
    // TODO: Implementar lógica para detectar cursos con >90% ocupación
    return of(0);
  }

  private calculateTrend(today: number, week: number): 'up' | 'down' | 'stable' {
    const dailyAverage = week / 7;
    const diff = today - dailyAverage;
    const threshold = dailyAverage * 0.1; // 10% threshold

    if (diff > threshold) return 'up';
    if (diff < -threshold) return 'down';
    return 'stable';
  }

  private getEmptyMetrics(): DashboardMetrics {
    return {
      alertas: {
        reservasHuerfanas: 0,
        cursosSinMonitor: 0,
        pagosPendientes: 0,
        conflictosHorarios: 0,
        capacidadCritica: 0
      },
      revenue: {
        ingresosHoy: 0,
        ingresosSemana: 0,
        ingresosMes: 0,
        tendencia: 'stable',
        comparacionPeriodoAnterior: 0,
        moneda: 'EUR'
      },
      ocupacion: {
        cursosPrivados: { ocupados: 0, disponibles: 0, porcentaje: 0 },
        cursosColectivos: { ocupados: 0, disponibles: 0, porcentaje: 0 },
        total: { ocupados: 0, disponibles: 0, porcentaje: 0 }
      },
      proximasActividades: {
        proximasHoras: [],
        alertasCapacidad: [],
        monitorPendiente: []
      },
      tendencias: {
        reservasUltimos30Dias: [],
        fechas: [],
        comparacionPeriodoAnterior: { reservas: 0, ingresos: 0 }
      },
      quickStats: {
        reservasHoy: 0,
        ingresosHoy: 0,
        ocupacionActual: 0,
        alertasCriticas: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }
}
