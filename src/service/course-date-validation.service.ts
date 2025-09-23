import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiCrudService } from './crud.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../@vex/components/confirm-dialog/confirm-dialog.component';

export interface CourseDateValidationResult {
  canModify: boolean;
  canDelete: boolean;
  affectedBookings: any[];
  warningMessage: string;
}

export interface CourseDateModificationRequest {
  courseId: number;
  dateId: number;
  action: 'update' | 'delete';
  newDate?: string;
  newTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseDateValidationService {

  constructor(
    private crudService: ApiCrudService,
    private dialog: MatDialog
  ) {}

  /**
   * Valida si una fecha de curso se puede modificar/eliminar
   */
  validateCourseDateModification(courseId: number, dateId: number): Observable<CourseDateValidationResult> {
    return this.crudService.get(`/admin/courses/${courseId}`,
      ['bookingUsers', 'courseGroups.courseDates.courseSubgroups.bookingUsers.client']
    ).pipe(
      map((response: any) => {
        const course = response.data;
        const affectedBookings = this.findBookingsForDate(course, dateId);

        return {
          canModify: true, // Siempre se puede modificar con advertencia
          canDelete: affectedBookings.length === 0,
          affectedBookings,
          warningMessage: this.generateWarningMessage(affectedBookings, 'modify')
        };
      })
    );
  }

  /**
   * Encuentra todas las reservas afectadas por una fecha específica
   */
  private findBookingsForDate(course: any, dateId: number): any[] {
    const allBookings = course.booking_users || [];

    return allBookings.filter((booking: any) => {
      const bookingDateId = booking.course_date_id || booking.courseDateId;
      return bookingDateId === dateId;
    });
  }

  /**
   * Genera mensaje de advertencia personalizado
   */
  private generateWarningMessage(affectedBookings: any[], action: 'modify' | 'delete'): string {
    const count = affectedBookings.length;

    if (count === 0) {
      return action === 'delete'
        ? 'Esta fecha no tiene reservas activas y se puede eliminar sin problemas.'
        : 'Esta fecha no tiene reservas activas y se puede modificar sin problemas.';
    }

    const clientNames = affectedBookings
      .map(booking => `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim())
      .filter(name => name.length > 0)
      .slice(0, 3); // Mostrar máximo 3 nombres

    const namesList = clientNames.join(', ');
    const moreText = count > 3 ? ` y ${count - 3} más` : '';

    if (action === 'delete') {
      return `⚠️ ATENCIÓN: Esta fecha tiene ${count} reserva${count > 1 ? 's' : ''} activa${count > 1 ? 's' : ''} (${namesList}${moreText}).

No se puede eliminar sin antes cancelar o reasignar estas reservas.`;
    } else {
      return `⚠️ ATENCIÓN: Esta fecha tiene ${count} reserva${count > 1 ? 's' : ''} activa${count > 1 ? 's' : ''} (${namesList}${moreText}).

Los cambios afectarán a ${count > 1 ? 'estos clientes' : 'este cliente'}. ¿Desea continuar?`;
    }
  }

  /**
   * Muestra diálogo de confirmación para modificaciones de fecha
   */
  showCourseDateModificationDialog(
    request: CourseDateModificationRequest
  ): Observable<boolean> {
    return this.validateCourseDateModification(request.courseId, request.dateId).pipe(
      switchMap(validation => {
        // Si es eliminación y hay reservas, no permitir
        if (request.action === 'delete' && !validation.canDelete) {
          return this.showErrorDialog(
            'No se puede eliminar la fecha',
            validation.warningMessage + '\n\nPrimero debe cancelar o reasignar las reservas afectadas.'
          ).pipe(map(() => false));
        }

        // Si no hay reservas afectadas, permitir sin diálogo
        if (validation.affectedBookings.length === 0) {
          return of(true);
        }

        // Mostrar diálogo de confirmación con advertencia
        const title = request.action === 'delete'
          ? 'Confirmar eliminación de fecha'
          : 'Confirmar modificación de fecha';

        return this.showConfirmationDialog(title, validation.warningMessage);
      })
    );
  }

  /**
   * Muestra diálogo de confirmación
   */
  private showConfirmationDialog(title: string, message: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title,
        message,
        confirmText: 'Continuar',
        cancelText: 'Cancelar'
      },
      maxWidth: '500px'
    });

    return dialogRef.afterClosed();
  }

  /**
   * Muestra diálogo de error
   */
  private showErrorDialog(title: string, message: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title,
        message,
        confirmText: 'Entendido',
        cancelText: null, // Solo botón de aceptar
        isError: true
      },
      maxWidth: '500px'
    });

    return dialogRef.afterClosed();
  }

  /**
   * Valida múltiples fechas de una vez (útil para cambios masivos)
   */
  validateMultipleCourseDates(
    courseId: number,
    dateIds: number[]
  ): Observable<{ [dateId: number]: CourseDateValidationResult }> {
    const validations = dateIds.map(dateId =>
      this.validateCourseDateModification(courseId, dateId).pipe(
        map(result => ({ dateId, result }))
      )
    );

    return forkJoin(validations).pipe(
      map(results => {
        const validationMap: { [dateId: number]: CourseDateValidationResult } = {};
        results.forEach(({ dateId, result }) => {
          validationMap[dateId] = result;
        });
        return validationMap;
      })
    );
  }
}