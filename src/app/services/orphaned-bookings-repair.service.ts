import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

export interface OrphanedBooking {
  booking_id: number;
  course_id: number;
  course_name?: string;
  client_name: string;
  booking_status: number;
  course_status: 'soft_deleted' | 'hard_deleted' | 'unknown';
  total_amount: number;
  booking_date: string;
  course_deleted_at?: string;
  repair_options: RepairOption[];
}

export interface RepairOption {
  type: 'restore_course' | 'transfer_booking' | 'cancel_booking' | 'manual_fix';
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  auto_executable: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrphanedBookingsRepairService {

  constructor(
    private crudService: ApiCrudService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  /**
   * PASO 1: Detectar todas las reservas huérfanas en el sistema
   */
  detectOrphanedBookings(): Observable<OrphanedBooking[]> {
    return this.crudService.get('/admin/bookings/orphaned-check').pipe(
      catchError(() => {
        // FALLBACK: Si no existe el endpoint, usar consulta manual
        return this.detectOrphanedBookingsManually();
      }),
      map((response: any) => {
        const orphanedBookings = response?.data || [];
        return orphanedBookings.map(booking => this.analyzeOrphanedBooking(booking));
      })
    );
  }

  /**
   * FALLBACK: Detección manual cuando no existe endpoint específico
   */
  private detectOrphanedBookingsManually(): Observable<any> {
    // 1. Obtener todas las reservas activas y parciales
    return this.crudService.get('/admin/bookings', ['course'], {
      status: '1,3', // Activas y parcialmente canceladas
      per_page: 1000
    }).pipe(
      switchMap((bookingsResponse: any) => {
        const bookings = bookingsResponse?.data?.data || [];

        // 2. Filtrar reservas sin curso o con curso nulo
        const potentialOrphans = bookings.filter(booking =>
          !booking.course || booking.course_id === null
        );

        // 3. Para cada reserva, verificar si el curso existe (incluyendo soft-deleted)
        const checkPromises = potentialOrphans.map(booking =>
          this.checkCourseStatus(booking.course_id).then(courseStatus => ({
            ...booking,
            course_status: courseStatus
          }))
        );

        return Promise.all(checkPromises);
      }),
      map(orphans => ({ data: orphans }))
    );
  }

  /**
   * Verificar el estado de un curso (activo, soft-deleted, hard-deleted)
   */
  private async checkCourseStatus(courseId: number): Promise<string> {
    try {
      // 1. Intentar obtener curso normal
      const normalResponse = await this.crudService.get(`/admin/courses/${courseId}`).toPromise();
      if (normalResponse?.success) {
        return 'active';
      }
    } catch (error) {
      // 2. Intentar con soft-deleted
      try {
        const trashedResponse = await this.crudService.get(`/admin/courses/${courseId}`, [], {
          with_trashed: true
        }).toPromise();

        if (trashedResponse?.success && trashedResponse.data.deleted_at) {
          return 'soft_deleted';
        }
      } catch (trashedError) {
        // 3. Hard deleted o no existe
        return 'hard_deleted';
      }
    }

    return 'unknown';
  }

  /**
   * Analizar una reserva huérfana y determinar opciones de reparación
   */
  private analyzeOrphanedBooking(booking: any): OrphanedBooking {
    const repairOptions: RepairOption[] = [];

    // Opción 1: Restaurar curso (si está soft-deleted)
    if (booking.course_status === 'soft_deleted') {
      repairOptions.push({
        type: 'restore_course',
        description: 'Restaurar el curso eliminado (recomendado si fue borrado por error)',
        risk_level: 'low',
        auto_executable: true
      });
    }

    // Opción 2: Transferir a otro curso similar
    repairOptions.push({
      type: 'transfer_booking',
      description: 'Transferir la reserva a un curso similar activo',
      risk_level: 'medium',
      auto_executable: false
    });

    // Opción 3: Cancelar reserva con reembolso
    if (booking.booking_status === 1) { // Solo si está activa
      repairOptions.push({
        type: 'cancel_booking',
        description: 'Cancelar la reserva y procesar reembolso automático',
        risk_level: 'medium',
        auto_executable: true
      });
    }

    // Opción 4: Reparación manual
    repairOptions.push({
      type: 'manual_fix',
      description: 'Reparación manual por administrador',
      risk_level: 'high',
      auto_executable: false
    });

    return {
      booking_id: booking.id,
      course_id: booking.course_id,
      course_name: booking.course?.name || `Curso eliminado #${booking.course_id}`,
      client_name: booking.client?.name || 'Cliente desconocido',
      booking_status: booking.status,
      course_status: booking.course_status,
      total_amount: booking.price_total || 0,
      booking_date: booking.created_at,
      course_deleted_at: booking.course?.deleted_at,
      repair_options: repairOptions
    };
  }

  /**
   * PASO 2: Ejecutar reparación automática
   */
  repairOrphanedBooking(orphaned: OrphanedBooking, repairType: string): Observable<any> {
    switch (repairType) {
      case 'restore_course':
        return this.restoreCourse(orphaned);

      case 'cancel_booking':
        return this.cancelBookingWithRefund(orphaned);

      case 'transfer_booking':
        return throwError('Transfer booking requires manual intervention');

      default:
        return throwError('Repair type not supported for automatic execution');
    }
  }

  /**
   * Restaurar curso soft-deleted
   */
  private restoreCourse(orphaned: OrphanedBooking): Observable<any> {
    return this.crudService.post(`/admin/courses/${orphaned.course_id}/restore`, {}).pipe(
      map(response => {
        this.snackBar.open(
          `✅ Curso "${orphaned.course_name}" restaurado exitosamente`,
          'Cerrar',
          { duration: 5000 }
        );
        return { success: true, action: 'course_restored' };
      }),
      catchError(error => {
        this.snackBar.open(
          `❌ Error restaurando curso: ${error.message}`,
          'Cerrar',
          { duration: 5000 }
        );
        return throwError(error);
      })
    );
  }

  /**
   * Cancelar reserva huérfana con reembolso automático
   */
  private cancelBookingWithRefund(orphaned: OrphanedBooking): Observable<any> {
    const cancellationData = {
      reason: `Cancelación automática - Curso #${orphaned.course_id} eliminado`,
      refund_type: 'auto', // Reembolso automático por sistema
      amount: orphaned.total_amount
    };

    return this.crudService.post(`/admin/bookings/${orphaned.booking_id}/cancel`, cancellationData).pipe(
      map(response => {
        this.snackBar.open(
          `✅ Reserva #${orphaned.booking_id} cancelada con reembolso automático`,
          'Cerrar',
          { duration: 5000 }
        );
        return { success: true, action: 'booking_cancelled' };
      }),
      catchError(error => {
        this.snackBar.open(
          `❌ Error cancelando reserva: ${error.message}`,
          'Cerrar',
          { duration: 5000 }
        );
        return throwError(error);
      })
    );
  }

  /**
   * PASO 3: Buscar cursos similares para transferencia manual
   */
  findSimilarCourses(orphaned: OrphanedBooking): Observable<any[]> {
    // Buscar cursos activos del mismo deporte y nivel
    return this.crudService.get('/admin/courses', [], {
      active: 1,
      sport_id: orphaned.course_id, // Esto necesitaría más lógica
      limit: 10
    }).pipe(
      map((response: any) => response?.data?.data || []),
      catchError(() => of([]))
    );
  }

  /**
   * Obtener estadísticas de reservas huérfanas
   */
  getOrphanedBookingsStats(): Observable<any> {
    return this.detectOrphanedBookings().pipe(
      map(orphanedBookings => {
        const stats = {
          total_orphaned: orphanedBookings.length,
          by_course_status: {
            soft_deleted: orphanedBookings.filter(o => o.course_status === 'soft_deleted').length,
            hard_deleted: orphanedBookings.filter(o => o.course_status === 'hard_deleted').length,
            unknown: orphanedBookings.filter(o => o.course_status === 'unknown').length
          },
          by_booking_status: {
            active: orphanedBookings.filter(o => o.booking_status === 1).length,
            partial: orphanedBookings.filter(o => o.booking_status === 3).length
          },
          total_amount_affected: orphanedBookings.reduce((sum, o) => sum + o.total_amount, 0),
          auto_repairable: orphanedBookings.filter(o =>
            o.repair_options.some(option => option.auto_executable)
          ).length
        };
        return stats;
      })
    );
  }
}