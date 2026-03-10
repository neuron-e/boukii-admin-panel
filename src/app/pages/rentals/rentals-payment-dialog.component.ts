import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { RentalService } from 'src/service/rental.service';

export interface RentalPaymentDialogData {
  reservation: any;
  /** Pre-selected tab: 'manual' | 'paylink' | 'deposit' */
  tab?: 'manual' | 'paylink' | 'deposit';
}

@Component({
  selector: 'vex-rentals-payment-dialog',
  templateUrl: './rentals-payment-dialog.component.html'
})
export class RentalsPaymentDialogComponent implements OnInit {

  activeTab: 'manual' | 'paylink' | 'deposit' = 'manual';
  activeTabIndex = 0;
  loading = false;

  // Current payment info loaded from backend
  paymentInfo: any = null;
  loadingInfo = false;

  // Manual payment form
  manualForm = this.fb.group({
    amount:         [null as number | null, [Validators.required, Validators.min(0.01)]],
    payment_method: ['cash', Validators.required],
    notes:          ['']
  });

  // Payrexx link form
  paylinkForm = this.fb.group({
    amount:       [null as number | null],
    client_email: ['', Validators.email],
    send_email:   [false]
  });
  generatedLink = '';

  // Deposit form
  depositForm = this.fb.group({
    action:         ['hold', Validators.required],
    amount:         [null as number | null, [Validators.required, Validators.min(0.01)]],
    payment_method: ['cash', Validators.required],
    notes:          ['']
  });

  // Payrexx link returned from deposit hold
  depositPaymentLink = '';

  paymentMethods = [
    { value: 'cash',             label: 'rentals.pay_cash' },
    { value: 'card',             label: 'rentals.pay_card' },
    { value: 'payrexx_link',     label: 'rentals.pay_payrexx_link' },
    { value: 'payrexx_invoice',  label: 'rentals.pay_payrexx_invoice' },
    { value: 'invoice',          label: 'rentals.pay_invoice' },
  ];

  depositActions = [
    { value: 'hold',    label: 'rentals.deposit_hold' },
    { value: 'release', label: 'rentals.deposit_release' },
    { value: 'forfeit', label: 'rentals.deposit_forfeit' },
  ];

  get reservation(): any { return this.data.reservation; }
  get reservationTotal(): number { return Number(this.reservation?.total ?? 0); }
  get currency(): string { return this.reservation?.currency ?? 'CHF'; }
  get depositAmount(): number { return Number(this.paymentInfo?.deposit_amount ?? this.reservation?.deposit_amount ?? 0); }
  get depositStatus(): string { return this.paymentInfo?.deposit_status ?? this.reservation?.deposit_status ?? 'none'; }
  get hasPayment(): boolean { return !!this.paymentInfo?.payment; }
  get hasDepositPayment(): boolean { return !!this.paymentInfo?.deposit_payment; }
  get isHoldAction(): boolean { return this.depositForm.get('action')?.value === 'hold'; }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<RentalsPaymentDialogComponent>,
    private readonly rentalService: RentalService,
    private readonly snackBar: MatSnackBar,
    private readonly translateService: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: RentalPaymentDialogData
  ) {}

  onTabChange(index: number): void {
    this.activeTabIndex = index;
    this.activeTab = index === 0 ? 'manual' : index === 1 ? 'paylink' : 'deposit';
  }

  ngOnInit(): void {
    if (this.data.tab) {
      this.activeTab = this.data.tab;
      this.activeTabIndex = this.data.tab === 'manual' ? 0 : this.data.tab === 'paylink' ? 1 : 2;
    }
    this.manualForm.patchValue({ amount: this.reservationTotal });
    this.paylinkForm.patchValue({
      amount: this.reservationTotal,
      client_email: this.reservation?.client_email ?? ''
    });
    this.depositForm.patchValue({ amount: this.reservation?.deposit_amount ?? 0 });

    // Adjust validators dynamically when deposit action changes
    this.depositForm.get('action')?.valueChanges.subscribe(action => {
      const amountCtrl = this.depositForm.get('amount');
      const methodCtrl = this.depositForm.get('payment_method');
      if (action === 'hold') {
        amountCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
        methodCtrl?.setValidators([Validators.required]);
      } else {
        amountCtrl?.clearValidators();
        methodCtrl?.clearValidators();
      }
      amountCtrl?.updateValueAndValidity();
      methodCtrl?.updateValueAndValidity();
    });

    this.loadPaymentInfo();
  }

  loadPaymentInfo(): void {
    this.loadingInfo = true;
    this.rentalService.getPaymentInfo(this.reservation.id).subscribe({
      next: (res: any) => { this.paymentInfo = res?.data ?? null; this.loadingInfo = false; },
      error: () => { this.loadingInfo = false; }
    });
  }

  // ── Manual payment ──────────────────────────────────────────────────────────

  saveManual(): void {
    if (this.manualForm.invalid) { this.manualForm.markAllAsTouched(); return; }
    this.loading = true;
    const val = this.manualForm.value;
    this.rentalService.registerPayment(this.reservation.id, {
      amount:         Number(val.amount),
      payment_method: val.payment_method as any,
      notes:          val.notes ?? ''
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.toast('rentals.payment_registered');
        this.dialogRef.close({ action: 'payment_registered', data: res?.data });
      },
      error: (err: any) => {
        this.loading = false;
        this.toast(err?.error?.message ?? 'rentals.payment_error', true);
      }
    });
  }

  // ── Payrexx link ────────────────────────────────────────────────────────────

  generatePaylink(): void {
    this.loading = true;
    const val = this.paylinkForm.value;
    this.rentalService.createPaylink(this.reservation.id, {
      amount:       Number(val.amount) || undefined,
      client_email: val.client_email || undefined,
      send_email:   val.send_email ?? false
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.generatedLink = res?.data?.payment_link ?? '';
        if (!this.generatedLink) this.toast('rentals.paylink_error', true);
      },
      error: (err: any) => {
        this.loading = false;
        this.toast(err?.error?.message ?? 'rentals.paylink_error', true);
      }
    });
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.generatedLink).then(() => this.toast('rentals.link_copied'));
  }

  openLink(): void {
    if (this.generatedLink) window.open(this.generatedLink, '_blank');
  }

  // ── Deposit ─────────────────────────────────────────────────────────────────

  saveDeposit(): void {
    if (this.depositForm.invalid) { this.depositForm.markAllAsTouched(); return; }
    this.loading = true;
    const val = this.depositForm.value;
    const payload: any = { action: val.action, notes: val.notes ?? '' };
    if (val.action === 'hold') {
      payload.amount         = Number(val.amount);
      payload.payment_method = val.payment_method;
    }
    this.rentalService.manageDeposit(this.reservation.id, payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        const d = res?.data;
        if (d?.payment_link) {
          // Payrexx link generated — stay open so operator can copy/send the link
          this.depositPaymentLink = d.payment_link;
          this.toast('rentals.paylink_generated');
          this.loadPaymentInfo();
        } else {
          this.toast('rentals.deposit_updated');
          this.dialogRef.close({ action: 'deposit_updated', data: d });
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.toast(err?.error?.message ?? 'rentals.deposit_error', true);
      }
    });
  }

  copyDepositLink(): void {
    navigator.clipboard.writeText(this.depositPaymentLink).then(() => this.toast('rentals.link_copied'));
  }

  openDepositLink(): void {
    if (this.depositPaymentLink) window.open(this.depositPaymentLink, '_blank');
  }

  // ── Refund ──────────────────────────────────────────────────────────────────

  processRefund(): void {
    if (!confirm(this.translateService.instant('rentals.confirm_refund'))) return;
    this.loading = true;
    this.rentalService.refundPayment(this.reservation.id).subscribe({
      next: (res: any) => {
        this.loading = false;
        const d = res?.data;
        const msg = d?.manual_action_needed
          ? 'rentals.refund_manual_needed'
          : 'rentals.refund_success';
        this.toast(msg, d?.manual_action_needed);
        this.dialogRef.close({ action: 'refunded', data: d });
      },
      error: (err: any) => {
        this.loading = false;
        this.toast(err?.error?.message ?? 'rentals.refund_error', true);
      }
    });
  }

  close(): void { this.dialogRef.close(); }

  private toast(key: string, isError = false): void {
    this.snackBar.open(
      this.translateService.instant(key),
      this.translateService.instant('close'),
      { duration: isError ? 5000 : 3000, panelClass: isError ? ['snack-error'] : [] }
    );
  }
}
