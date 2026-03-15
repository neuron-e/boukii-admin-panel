import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from 'src/@vex/components/confirm-dialog/confirm-dialog.component';
import { RentalService } from 'src/service/rental.service';
import { RentalsPaymentDialogComponent } from './rentals-payment-dialog.component';
import { RentalsReservationReturnDialogComponent } from './rentals-reservation-return-dialog.component';
import { RentalsDamageDialogComponent } from './rentals-damage-dialog.component';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'vex-rentals-reservation-detail',
  templateUrl: './rentals-reservation-detail.component.html',
  styleUrls: ['./rentals-reservation-detail.component.scss']
})
export class RentalsReservationDetailComponent implements OnInit {
  loading = true;
  loadingPayment = false;
  reservationId = 0;
  reservation: any = null;
  reservationEvents: any[] = [];
  paymentInfo: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rentalService: RentalService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.reservationId = Number(this.route.snapshot.paramMap.get('reservationId') || 0);
    if (!this.reservationId) {
      this.goBack();
      return;
    }
    this.loadReservation();
    this.loadReservationEvents();
    this.loadPaymentInfo();
  }

  goBack(): void {
    this.router.navigate(['/rentals/list']);
  }

  editReservation(): void {
    if (!this.reservationId) return;
    this.router.navigate(['/rentals/reservation', this.reservationId, 'edit']);
  }

  openLinkedBooking(): void {
    const bookingId = Number(this.reservation?.booking_id || 0);
    if (!bookingId) return;
    this.router.navigate(['/bookings/update', bookingId]);
  }

  contactCustomer(): void {
    const email = String(this.reservationClient()?.email || '').trim();
    const phone = String(this.reservationClient()?.phone || this.reservationClient()?.mobile || '').trim();
    if (email) {
      window.open(`mailto:${email}`, '_blank');
      return;
    }
    if (phone) {
      window.open(`tel:${phone}`, '_self');
      return;
    }
    this.toast('No hay datos de contacto disponibles');
  }

  openHandoverConfirm(): void {
    if (!this.canMarkPickedUp()) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar entrega',
        message: `Se marcará la reserva como entregada y se asignarán automáticamente las unidades disponibles para ${this.reservationTotalItems()} item${this.reservationTotalItems() === 1 ? '' : 's'}.`,
        confirmText: 'Registrar entrega',
        cancelText: 'Cancelar',
        variant: 'rental'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.executeHandover();
    });
  }

  openReturnFlow(partialOnly = false): void {
    if (!this.canProcessReturn()) return;
    const dialogRef = this.dialog.open(RentalsReservationReturnDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      data: {
        reservation: this.reservation,
        partialOnly,
        assignments: this.currentActiveAssignments()
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const payload = result.mode === 'partial' && Array.isArray(result.return_lines)
        ? { return_lines: result.return_lines }
        : {};

      this.rentalService.returnUnits(this.reservationId, payload).subscribe({
        next: () => this.completeReturnFollowUp(result),
        error: () => this.toast('No se pudo procesar la devolución')
      });
    });
  }

  reportDamage(): void {
    if (!this.canReportDamage()) return;
    const lines = this.damageAssignableEntries();
    if (!lines.length) {
      this.toast('No hay unidades asignadas disponibles para registrar daño');
      return;
    }
    const dialogRef = this.dialog.open(RentalsDamageDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: { reservation: this.reservation, lines }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.rentalService.registerDamage(this.reservationId, result).subscribe({
        next: () => {
          this.toast('Daño registrado');
          this.reloadAll();
        },
        error: () => this.toast('No se pudo registrar el daño')
      });
    });
  }

  openPaymentDialog(tab: 'manual' | 'paylink' | 'deposit' = 'manual'): void {
    if (!this.reservation?.id) return;
    const dialogRef = this.dialog.open(RentalsPaymentDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      data: { reservation: this.reservation, liveTotal: this.totalAmount(), tab },
      panelClass: 'rental-payment-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action) {
        this.loadPaymentInfo();
        this.loadReservation();
      }
    });
  }

  pageTitle(): string {
    return 'Detalle de Reserva';
  }

  statusKey(): string {
    const raw = String(this.reservation?.status || 'pending').trim().toLowerCase();
    return raw || 'pending';
  }

  statusLabel(): string {
    switch (this.statusKey()) {
      case 'assigned':
        return 'Asignado';
      case 'checked_out':
        return 'Entregado';
      case 'partial_return':
        return 'Devolución parcial';
      case 'returned':
        return 'Devuelto';
      case 'completed':
        return 'Completado';
      case 'overdue':
        return 'Retrasado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendiente';
    }
  }

  leadIconName(): string {
    switch (this.statusKey()) {
      case 'checked_out':
      case 'active':
        return 'check_circle';
      case 'overdue':
        return 'error';
      case 'partial_return':
        return 'assignment_return';
      case 'returned':
      case 'completed':
        return 'task_alt';
      case 'cancelled':
        return 'cancel';
      default:
        return 'schedule';
    }
  }

  leadIconTone(): string {
    switch (this.statusKey()) {
      case 'checked_out':
      case 'active':
        return 'checked-out';
      case 'overdue':
        return 'overdue';
      case 'partial_return':
        return 'partial-return';
      case 'returned':
      case 'completed':
        return 'returned';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  reservationClient(): any {
    return this.reservation?.client || {};
  }

  reservationClientName(): string {
    const direct = String(this.reservation?.client_name || '').trim();
    const client = this.reservationClient();
    const firstName = String(client?.first_name || '').trim();
    const lastName = String(client?.last_name || '').trim();
    return direct || `${firstName} ${lastName}`.trim() || '—';
  }

  reservationClientEmail(): string {
    return String(this.reservationClient()?.email || this.reservation?.email || '').trim() || '—';
  }

  reservationClientPhone(): string {
    return String(this.reservationClient()?.phone || this.reservationClient()?.mobile || this.reservation?.phone || '').trim() || '—';
  }

  reservationLines(): any[] {
    if (!this.reservation) return [];
    if (Array.isArray(this.reservation?.lines)) return this.reservation.lines;
    if (Array.isArray(this.reservation?.lines_preview)) return this.reservation.lines_preview;
    if (Array.isArray(this.reservation?.items)) return this.reservation.items;
    if (Array.isArray(this.reservation?.rental_items)) return this.reservation.rental_items;
    return [];
  }

  reservationLineLabel(line: any): string {
    const explicitVariantName = String(line?.variant_name || '').trim();
    const explicitItemName = String(line?.item_name || '').trim();
    if (explicitVariantName) return explicitVariantName;
    if (explicitItemName) return explicitItemName;
    return String(line?.name || '').trim() || `#${line?.id || '-'}`;
  }

  reservationLineSize(line: any): string {
    return String(line?.variant_size_label || line?.size_label || '').trim() || '—';
  }

  reservationLineSubtitle(line: any): string {
    const brand = String(line?.item_brand || '').trim();
    const model = String(line?.item_model || '').trim();
    const sku = String(line?.variant_sku || line?.sku || '').trim();
    return [brand, model, sku].filter(Boolean).join(' · ');
  }

  reservationTotalItems(): number {
    const lines = this.reservationLines();
    if (!lines.length) return 0;
    return lines.reduce((sum, line) => sum + Number(line?.quantity || line?.qty || 0), 0);
  }

  reservationCurrency(): string {
    return String(this.reservation?.currency || this.reservation?.price_currency || 'CHF').trim() || 'CHF';
  }

  reservationDateRangeLabel(): string {
    const start = this.formatDate(this.reservation?.start_date);
    const end = this.formatDate(this.reservation?.end_date);
    if (start && end) return `${start} - ${end}`;
    return start || end || '—';
  }

  reservationDurationDays(): number {
    const start = this.dateOnly(this.reservation?.start_date);
    const end = this.dateOnly(this.reservation?.end_date);
    if (!start || !end) return 0;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    return Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
  }

  reservationPickupTime(): string {
    return String(this.reservation?.pickup_time || this.reservation?.start_time || '').trim() || '—';
  }

  reservationPickupPointLabel(): string {
    return String(
      this.reservation?.pickup_point_name ||
      this.reservation?.pickup_point?.name ||
      this.reservation?.pickup_point_label ||
      ''
    ).trim() || '—';
  }

  totalAmount(): number {
    return Number(this.reservation?.total_price ?? this.reservation?.total ?? 0);
  }

  paidAmount(): number {
    return Number(
      this.paymentInfo?.payment?.amount
      ?? this.reservation?.amount_paid
      ?? this.reservation?.paid_total
      ?? 0
    );
  }

  depositAmount(): number {
    return Number(this.paymentInfo?.deposit_amount ?? this.reservation?.deposit_amount ?? this.reservation?.deposit ?? 0);
  }

  balanceDue(): number {
    return Number(Math.max(0, this.totalAmount() - this.paidAmount()));
  }

  overpaidAmount(): number {
    return Number(Math.max(0, this.paidAmount() - this.totalAmount()));
  }

  paymentStatusLabel(): string {
    if (this.overpaidAmount() > 0) return 'Saldo a favor';
    if (this.balanceDue() > 0) return 'Pago Pendiente';
    return 'Pagado Completamente';
  }

  paymentStatusHint(): string {
    if (this.overpaidAmount() > 0) {
      return `Hay ${this.overpaidAmount().toFixed(2)} ${this.reservationCurrency()} a devolver o dejar como crédito`;
    }
    if (this.balanceDue() > 0) {
      return `Faltan ${this.balanceDue().toFixed(2)} ${this.reservationCurrency()} por cobrar`;
    }
    return 'No hay pagos pendientes';
  }

  paymentStatusTone(): 'green' | 'amber' | 'blue' {
    if (this.overpaidAmount() > 0) return 'blue';
    if (this.balanceDue() > 0) return 'amber';
    return 'green';
  }

  paymentHistoryEntries(): Array<{ icon: string; title: string; subtitle: string; amount: number; tone: 'green' | 'blue' | 'gray' }> {
    const entries: Array<{ icon: string; title: string; subtitle: string; amount: number; tone: 'green' | 'blue' | 'gray' }> = [];
    const payment = this.paymentInfo?.payment;
    const depositPayment = this.paymentInfo?.deposit_payment;
    const currency = this.reservationCurrency();

    if (payment) {
      entries.push({
        icon: 'check_circle',
        title: 'Pago Recibido',
        subtitle: this.paymentSubtitle(payment, currency),
        amount: Number(payment?.amount || 0),
        tone: 'green'
      });
    }

    if (depositPayment) {
      const depositStatus = String(this.paymentInfo?.deposit_status || '').toLowerCase();
      entries.push({
        icon: depositStatus === 'released' ? 'task_alt' : 'savings',
        title: depositStatus === 'released' ? 'Depósito Devuelto' : 'Depósito Retenido',
        subtitle: this.paymentSubtitle(depositPayment, currency),
        amount: Number(depositPayment?.amount || 0),
        tone: 'blue'
      });
    }

    const refunds = Array.isArray(this.paymentInfo?.refunds) ? this.paymentInfo.refunds : [];
    refunds.forEach((refund: any) => {
      entries.push({
        icon: 'reply',
        title: `Devolución (${String(refund?.payment_method || 'manual').toUpperCase()})`,
        subtitle: this.paymentSubtitle(refund, currency),
        amount: Number(refund?.amount || 0),
        tone: 'gray'
      });
    });

    return entries;
  }

  hasNotes(): boolean {
    return String(this.reservation?.notes || this.reservation?.customer_notes || '').trim().length > 0;
  }

  notesText(): string {
    return String(this.reservation?.notes || this.reservation?.customer_notes || '').trim();
  }

  canMarkPickedUp(): boolean {
    const status = this.statusKey();
    return (status === 'pending' || status === 'assigned') && this.reservationTotalItems() > 0;
  }

  canProcessReturn(): boolean {
    const status = this.statusKey();
    return status === 'checked_out' || status === 'active' || status === 'overdue' || status === 'partial_return';
  }

  canReportDamage(): boolean {
    const status = this.statusKey();
    return status === 'checked_out' || status === 'active' || status === 'overdue' || status === 'partial_return' || status === 'returned' || status === 'completed';
  }

  trackById = (_: number, item: any) => Number(item?.id || 0);

  private reloadAll(): void {
    this.loadReservation();
    this.loadReservationEvents();
    this.loadPaymentInfo();
  }

  private loadReservation(): void {
    this.loading = true;
    this.rentalService.getReservation(this.reservationId).subscribe({
      next: (response: any) => {
        const payload = response?.data?.data ?? response?.data ?? response ?? null;
        this.reservation = payload?.id ? payload : null;
        this.loading = false;
      },
      error: () => {
        this.toast('No se pudo cargar la reserva');
        this.loading = false;
      }
    });
  }

  private loadReservationEvents(): void {
    this.rentalService.getReservationEvents(this.reservationId).subscribe({
      next: (response: any) => {
        this.reservationEvents = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.reservationEvents = [];
      }
    });
  }

  private loadPaymentInfo(): void {
    this.loadingPayment = true;
    this.rentalService.getPaymentInfo(this.reservationId).subscribe({
      next: (response: any) => {
        this.paymentInfo = response?.data ?? null;
        this.loadingPayment = false;
      },
      error: () => {
        this.paymentInfo = null;
        this.loadingPayment = false;
      }
    });
  }

  private paymentSubtitle(payment: any, currency: string): string {
    const created = String(payment?.created_at || '').trim();
    const method = String(payment?.payment_method || '').trim();
    const status = String(payment?.status || '').trim();
    const parts = [method, status].filter((part) => part.length > 0);
    const right = parts.join(' · ');
    if (created && right) return `${created} · ${right}`;
    if (created) return created;
    if (right) return right;
    return currency;
  }

  private formatDate(value: any): string {
    const text = String(value || '').trim();
    if (!text) return '';
    return this.datePipe.transform(text, 'dd/MM/yyyy') || text;
  }

  private dateOnly(value: any): string {
    return String(value || '').trim().slice(0, 10);
  }

  private executeHandover(): void {
    this.rentalService.autoAssign(this.reservationId).subscribe({
      next: () => {
        this.rentalService.updateReservation(this.reservationId, { status: 'checked_out' }).subscribe({
          next: () => {
            this.toast('Entrega registrada');
            this.reloadAll();
          },
          error: () => this.toast('No se pudo actualizar el estado de entrega')
        });
      },
      error: () => this.toast('No se pudieron asignar las unidades para la entrega')
    });
  }

  private currentActiveAssignments(): Array<{ assignment_id: number; line_id: number; unit_id: number; label: string }> {
    const assignments = Array.isArray(this.reservation?.unit_assignments) ? this.reservation.unit_assignments : [];
    const lines = this.reservationLines();
    const lineById = new Map<number, any>(lines.map((line) => [Number(line?.id || 0), line]));
    const returnedUnitIds = new Set<number>(
      assignments
        .filter((assignment: any) => String(assignment?.assignment_type || '').toLowerCase() === 'returned')
        .map((assignment: any) => Number(assignment?.rental_unit_id || 0))
        .filter((unitId: number) => unitId > 0)
    );

    return assignments
      .filter((assignment: any) => {
        const type = String(assignment?.assignment_type || '').toLowerCase();
        const unitId = Number(assignment?.rental_unit_id || 0);
        return (type === 'assigned' || type === 'checked_out') && unitId > 0 && !returnedUnitIds.has(unitId);
      })
      .map((assignment: any) => {
        const lineId = Number(assignment?.rental_reservation_line_id || 0);
        const line = lineById.get(lineId);
        return {
          assignment_id: Number(assignment?.id || 0),
          line_id: lineId,
          unit_id: Number(assignment?.rental_unit_id || 0),
          label: this.reservationLineLabel(line || assignment)
        };
      })
      .filter((assignment: any) => assignment.assignment_id > 0 && assignment.line_id > 0 && assignment.unit_id > 0);
  }

  private damageAssignableEntries(): Array<{ id: number; line_id: number; label: string }> {
    const assignments = Array.isArray(this.reservation?.unit_assignments) ? this.reservation.unit_assignments : [];
    const lines = this.reservationLines();
    const lineById = new Map<number, any>(lines.map((line) => [Number(line?.id || 0), line]));

    return assignments
      .filter((assignment: any) => {
        const type = String(assignment?.assignment_type || '').toLowerCase();
        return type === 'assigned' || type === 'checked_out';
      })
      .map((assignment: any) => {
        const lineId = Number(assignment?.rental_reservation_line_id || 0);
        const unitId = Number(assignment?.rental_unit_id || 0);
        const line = lineById.get(lineId);
        return {
          id: Number(assignment?.id || 0),
          line_id: lineId,
          label: `${this.reservationLineLabel(line || assignment)} · Unidad #${unitId}`
        };
      })
      .filter((entry) => entry.id > 0 && entry.line_id > 0);
  }

  private completeReturnFollowUp(result: any): void {
    const maintenance = result?.maintenance?.enabled
      ? Array.from(new Set((result?.maintenance?.unit_ids || []).map((unitId: any) => Number(unitId)).filter((unitId: number) => unitId > 0)))
      : [];

    const maintenanceCalls = maintenance.length
      ? maintenance.map((unitId: number) =>
          this.rentalService.setUnitMaintenance(
            unitId,
            String(result?.maintenance?.reason || 'Returned to maintenance').trim(),
            String(result?.maintenance?.condition || 'maintenance').trim() || 'maintenance'
          )
        )
      : [];

    const damageCall = result?.damage?.enabled
      ? this.rentalService.registerDamage(this.reservationId, result.damage)
      : of(null);

    const followUp$ = maintenanceCalls.length
      ? forkJoin([...maintenanceCalls, damageCall])
      : forkJoin([damageCall]);

    followUp$.subscribe({
      next: () => {
        this.toast('Devolución registrada');
        this.reloadAll();
        this.maybePromptPaymentReview(result);
      },
      error: () => {
        this.toast('La devolución se registró, pero hubo un problema en mantenimiento o daños');
        this.reloadAll();
      }
    });
  }

  private maybePromptPaymentReview(result: any): void {
    const damageCost = Number(result?.damage?.damage_cost || 0);
    if (damageCost <= 0 && this.depositAmount() <= 0) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Revisar depósito y cobros',
        message: damageCost > 0
          ? `Se registró un daño de ${damageCost.toFixed(2)} ${this.reservationCurrency()}. Revisa ahora el depósito y el cobro asociado.`
          : 'La devolución se registró. Puedes revisar ahora el depósito asociado a la reserva.',
        confirmText: 'Abrir pagos',
        cancelText: 'Más tarde',
        variant: 'rental'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.openPaymentDialog(this.depositAmount() > 0 ? 'deposit' : 'manual');
      }
    });
  }

  private toast(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3200 });
  }
}
