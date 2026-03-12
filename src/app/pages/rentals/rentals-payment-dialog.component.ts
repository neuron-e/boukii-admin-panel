import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { RentalService } from 'src/service/rental.service';

export interface RentalPaymentDialogData {
  reservation: any;
  liveTotal?: number | null;
  /** Pre-selected tab: 'manual' | 'paylink' | 'deposit' */
  tab?: 'manual' | 'paylink' | 'deposit';
}

@Component({
  selector: 'vex-rentals-payment-dialog',
  templateUrl: './rentals-payment-dialog.component.html',
  styleUrls: ['./rentals-payment-dialog.component.scss']
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

  refundForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    refund_method: ['cash', Validators.required],
    notes: [''],
    voucher_name: ['']
  });

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
  get reservationTotal(): number {
    const live = Number(this.data?.liveTotal ?? NaN);
    if (!Number.isNaN(live) && live >= 0) return live;
    return Number(
      this.reservation?.total
      ?? this.reservation?.total_price
      ?? this.reservation?.amount_due
      ?? 0
    );
  }
  get currency(): string {
    return this.resolveCurrencyCandidate(this.reservation?.currency, this.schoolCurrencyFromUser());
  }
  get depositAmount(): number { return Number(this.paymentInfo?.deposit_amount ?? this.reservation?.deposit_amount ?? 0); }
  get depositStatus(): string { return this.paymentInfo?.deposit_status ?? this.reservation?.deposit_status ?? 'none'; }
  get hasPayment(): boolean { return !!this.paymentInfo?.payment; }
  get hasDepositPayment(): boolean { return !!this.paymentInfo?.deposit_payment; }
  get isHoldAction(): boolean { return this.depositForm.get('action')?.value === 'hold'; }
  get refundableAmount(): number {
    const paid = Number(this.paymentInfo?.payment?.amount ?? 0);
    const alreadyRefunded = Number((this.paymentInfo?.refunds || []).reduce((acc: number, row: any) => acc + Number(row?.amount || 0), 0));
    return Math.max(0, paid - alreadyRefunded);
  }

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
    this.refundForm.patchValue({
      amount: this.refundableAmount || this.reservationTotal,
      refund_method: this.paymentInfo?.payment?.payrexx_reference ? 'payrexx' : 'cash'
    });
  }

  loadPaymentInfo(): void {
    this.loadingInfo = true;
    this.rentalService.getPaymentInfo(this.reservation.id).subscribe({
      next: (res: any) => {
        this.paymentInfo = res?.data ?? null;
        const preferredMethod = this.paymentInfo?.payment?.payrexx_reference ? 'payrexx' : 'cash';
        this.refundForm.patchValue({
          amount: this.refundableAmount || this.reservationTotal,
          refund_method: preferredMethod
        }, { emitEvent: false });
        this.loadingInfo = false;
      },
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
    if (this.refundForm.invalid) { this.refundForm.markAllAsTouched(); return; }
    if (!confirm(this.translateService.instant('rentals.confirm_refund'))) return;
    this.loading = true;
    const val = this.refundForm.getRawValue();
    this.rentalService.refundPayment(this.reservation.id, {
      amount: Number(val.amount || 0),
      refund_method: (val.refund_method as any) || 'cash',
      notes: val.notes || '',
      voucher_name: val.voucher_name || undefined,
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        const d = res?.data;
        const msg = d?.manual_action_needed
          ? 'rentals.refund_manual_needed'
          : 'rentals.refund_success';
        this.toast(msg, d?.manual_action_needed);
        this.loadPaymentInfo();
        this.dialogRef.close({ action: 'refunded', data: d });
      },
      error: (err: any) => {
        this.loading = false;
        this.toast(err?.error?.message ?? 'rentals.refund_error', true);
      }
    });
  }

  close(): void { this.dialogRef.close(); }

  private schoolCurrencyFromUser(): string {
    const raw = localStorage.getItem('boukiiUser');
    if (!raw) return '';
    try {
      const user = JSON.parse(raw);
      return this.resolveCurrencyCandidate(
        user?.school?.taxes?.currency,
        user?.school?.currency,
        user?.schools?.[0]?.taxes?.currency,
        user?.schools?.[0]?.currency
      );
    } catch {
      return '';
    }
  }

  private resolveCurrencyCandidate(...candidates: any[]): string {
    const detected = candidates
      .map((candidate) => String(candidate || '').trim().toUpperCase())
      .find((candidate) => candidate.length > 0);
    return detected || '';
  }

  private toast(key: string, isError = false): void {
    this.snackBar.open(
      this.translateService.instant(key),
      this.translateService.instant('close'),
      { duration: isError ? 5000 : 3000, panelClass: isError ? ['snack-error'] : [] }
    );
  }
}
