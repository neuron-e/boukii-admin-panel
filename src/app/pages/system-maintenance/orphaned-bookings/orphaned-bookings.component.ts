import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { OrphanedBookingsRepairService, OrphanedBooking } from 'src/app/services/orphaned-bookings-repair.service';
import { ConfirmModalComponent } from 'src/app/pages/monitors/monitor-detail/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-orphaned-bookings',
  templateUrl: './orphaned-bookings.component.html',
  styleUrls: ['./orphaned-bookings.component.scss']
})
export class OrphanedBookingsComponent implements OnInit {

  orphanedBookings: OrphanedBooking[] = [];
  stats: any = null;
  isLoading = true;
  selectedBookings: OrphanedBooking[] = [];

  // Filtros
  filterByCourseStatus: string = 'all';
  filterByBookingStatus: string = 'all';
  showAutoRepairableOnly = false;

  constructor(
    private repairService: OrphanedBookingsRepairService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadOrphanedBookings();
  }

  /**
   * Cargar reservas huérfanas y estadísticas
   */
  loadOrphanedBookings(): void {
    this.isLoading = true;

    this.repairService.detectOrphanedBookings().subscribe({
      next: (orphanedBookings) => {
        this.orphanedBookings = orphanedBookings;
        this.calculateStats();
        this.isLoading = false;

        if (orphanedBookings.length === 0) {
          this.snackBar.open(
            '✅ ¡Excelente! No se encontraron reservas huérfanas',
            'Cerrar',
            { duration: 3000 }
          );
        } else {
          this.snackBar.open(
            `⚠️ Se encontraron ${orphanedBookings.length} reservas huérfanas`,
            'Cerrar',
            { duration: 5000 }
          );
        }
      },
      error: (error) => {
        console.error('Error cargando reservas huérfanas:', error);
        this.isLoading = false;
        this.snackBar.open(
          '❌ Error cargando reservas huérfanas',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * Calcular estadísticas localmente
   */
  private calculateStats(): void {
    this.stats = {
      total_orphaned: this.orphanedBookings.length,
      by_course_status: {
        soft_deleted: this.orphanedBookings.filter(o => o.course_status === 'soft_deleted').length,
        hard_deleted: this.orphanedBookings.filter(o => o.course_status === 'hard_deleted').length,
        unknown: this.orphanedBookings.filter(o => o.course_status === 'unknown').length
      },
      by_booking_status: {
        active: this.orphanedBookings.filter(o => o.booking_status === 1).length,
        partial: this.orphanedBookings.filter(o => o.booking_status === 3).length
      },
      total_amount_affected: this.orphanedBookings.reduce((sum, o) => sum + o.total_amount, 0),
      auto_repairable: this.orphanedBookings.filter(o =>
        o.repair_options.some(option => option.auto_executable)
      ).length
    };
  }

  /**
   * Reparar una reserva individual
   */
  repairBooking(orphaned: OrphanedBooking, repairType: string): void {
    const repairOption = orphaned.repair_options.find(option => option.type === repairType);

    if (!repairOption) {
      this.snackBar.open('❌ Opción de reparación no válida', 'Cerrar', { duration: 3000 });
      return;
    }

    // Confirmación para acciones de riesgo
    if (repairOption.risk_level === 'high' || repairOption.risk_level === 'medium') {
      const dialogRef = this.dialog.open(ConfirmModalComponent, {
        data: {
          title: 'Confirmar Reparación',
          message: `¿Confirmas la reparación de la reserva #${orphaned.booking_id}?\n\nAcción: ${repairOption.description}\n\nRiesgo: ${repairOption.risk_level.toUpperCase()}`,
          confirmButtonText: 'Reparar'
        }
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.executeRepair(orphaned, repairType);
        }
      });
    } else {
      this.executeRepair(orphaned, repairType);
    }
  }

  /**
   * Ejecutar reparación
   */
  private executeRepair(orphaned: OrphanedBooking, repairType: string): void {
    this.repairService.repairOrphanedBooking(orphaned, repairType).subscribe({
      next: (result) => {
        // Remover de la lista tras reparación exitosa
        this.orphanedBookings = this.orphanedBookings.filter(o => o.booking_id !== orphaned.booking_id);
        this.calculateStats();

        this.snackBar.open(
          `✅ Reserva #${orphaned.booking_id} reparada exitosamente`,
          'Cerrar',
          { duration: 5000 }
        );
      },
      error: (error) => {
        console.error('Error reparando reserva:', error);
        this.snackBar.open(
          `❌ Error reparando reserva #${orphaned.booking_id}`,
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * Reparación masiva automática
   */
  autoRepairAll(): void {
    const autoRepairable = this.orphanedBookings.filter(orphaned =>
      orphaned.repair_options.some(option => option.auto_executable && option.risk_level === 'low')
    );

    if (autoRepairable.length === 0) {
      this.snackBar.open(
        'No hay reservas huérfanas con reparación automática de bajo riesgo',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: {
        title: 'Reparación Automática Masiva',
        message: `¿Confirmas la reparación automática de ${autoRepairable.length} reservas?\n\nSolo se procesarán acciones de BAJO RIESGO:\n- Restaurar cursos soft-deleted\n- No se cancelarán reservas automáticamente`,
        confirmButtonText: 'Proceder'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.executeAutoRepairAll(autoRepairable);
      }
    });
  }

  /**
   * Ejecutar reparación masiva
   */
  private executeAutoRepairAll(bookings: OrphanedBooking[]): void {
    let repaired = 0;
    let errors = 0;

    bookings.forEach((orphaned, index) => {
      // Solo reparaciones de bajo riesgo
      const lowRiskOption = orphaned.repair_options.find(option =>
        option.auto_executable && option.risk_level === 'low'
      );

      if (lowRiskOption) {
        setTimeout(() => {
          this.repairService.repairOrphanedBooking(orphaned, lowRiskOption.type).subscribe({
            next: () => {
              repaired++;
              this.orphanedBookings = this.orphanedBookings.filter(o => o.booking_id !== orphaned.booking_id);

              // Mostrar progreso final
              if (repaired + errors === bookings.length) {
                this.showMassRepairResults(repaired, errors);
                this.calculateStats();
              }
            },
            error: () => {
              errors++;
              if (repaired + errors === bookings.length) {
                this.showMassRepairResults(repaired, errors);
              }
            }
          });
        }, index * 500); // Espaciar peticiones 500ms
      }
    });
  }

  /**
   * Mostrar resultados de reparación masiva
   */
  private showMassRepairResults(repaired: number, errors: number): void {
    const message = `Reparación masiva completada:\n✅ ${repaired} reparadas\n❌ ${errors} errores`;

    this.snackBar.open(message, 'Cerrar', { duration: 8000 });
  }

  /**
   * Obtener filtros aplicados
   */
  get filteredBookings(): OrphanedBooking[] {
    let filtered = [...this.orphanedBookings];

    // Filtro por estado del curso
    if (this.filterByCourseStatus !== 'all') {
      filtered = filtered.filter(o => o.course_status === this.filterByCourseStatus);
    }

    // Filtro por estado de reserva
    if (this.filterByBookingStatus !== 'all') {
      filtered = filtered.filter(o => o.booking_status.toString() === this.filterByBookingStatus);
    }

    // Filtro solo auto-reparables
    if (this.showAutoRepairableOnly) {
      filtered = filtered.filter(o => o.repair_options.some(option => option.auto_executable));
    }

    return filtered;
  }

  /**
   * Obtener clase CSS para el estado del curso
   */
  getCourseStatusClass(status: string): string {
    switch (status) {
      case 'soft_deleted': return 'status-warning';
      case 'hard_deleted': return 'status-error';
      case 'active': return 'status-success';
      default: return 'status-unknown';
    }
  }

  /**
   * Obtener clase CSS para el estado de la reserva
   */
  getBookingStatusClass(status: number): string {
    switch (status) {
      case 1: return 'booking-active';
      case 3: return 'booking-partial';
      case 2: return 'booking-cancelled';
      default: return 'booking-unknown';
    }
  }

  /**
   * Refrescar datos
   */
  refresh(): void {
    this.loadOrphanedBookings();
  }
}