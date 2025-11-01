import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-add-discount-bonus',
  templateUrl: './add-discount-bonus.component.html',
  styleUrls: ['./add-discount-bonus.component.scss']
})
export class AddDiscountBonusModalComponent implements OnInit {

  bonuses: any[] = [];
  bonus: any;
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public defaults: any,
    private crudService: ApiCrudService,
    private dialogRef: MatDialogRef<any>,
    private snackBar: MatSnackBar,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadBonuses();
  }

  private loadBonuses(): void {
    const schoolId = this.defaults?.school_id;
    const clientId = this.defaults?.client_id;

    const userVouchers$ = clientId
      ? this.crudService.list(
          '/vouchers',
          1,
          10000,
          'desc',
          'id',
          '',
          '',
          null,
          `&school_id=${schoolId}&client_id=${clientId}&payed=0`
        )
      : of({ data: [] });

    const genericVouchers$ = this.crudService.get(
      `/vouchers/generic?school_id=${schoolId}&available_only=1`
    );

    this.loading = true;
    forkJoin([userVouchers$, genericVouchers$]).subscribe({
      next: ([userResponse, genericResponse]) => {
        const userBonuses = this.ensureArray(userResponse?.data);
        const genericBonuses = this.ensureArray(genericResponse?.data);
        this.bonuses = this.mergeVoucherLists(this.bonuses, userBonuses, genericBonuses).filter(
          (voucher) => !voucher.payed && this.getRemainingBalance(voucher) > 0
        );
      },
      error: () => {
        this.bonuses = [];
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  closeModal(): void {
    if (!this.bonus) {
      this.snackBar.open(this.translateService.instant('text_select_client_voucher'), 'OK', { duration: 3000 });
      return;
    }

    const originalBalance = parseFloat(this.bonus?.remaining_balance ?? 0);
    const safeBalance = isNaN(originalBalance) ? 0 : originalBalance;
    const amountToUse = Math.max(
      0,
      Math.min(safeBalance, this.defaults?.currentPrice ?? safeBalance)
    );
    const remainingAfter = Number((safeBalance - amountToUse).toFixed(2));

    const payload = {
      ...this.bonus,
      reducePrice: amountToUse,
      original_balance: safeBalance,
      remaining_balance: safeBalance,
      remaining_balance_after: remainingAfter
    };

    this.dialogRef.close({
      bonus: payload
    });
  }

  private ensureArray(data: any): any[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : [data];
  }

  private mergeVoucherLists(...lists: any[][]): any[] {
    const voucherMap = new Map<number, any>();

    lists
      .filter(Boolean)
      .forEach((list) => {
        list.forEach((item) => {
          const normalized = this.normalizeVoucher(item);
          if (!normalized?.id) {
            return;
          }

          const existing = voucherMap.get(normalized.id);
          voucherMap.set(
            normalized.id,
            existing ? { ...existing, ...normalized } : normalized
          );
        });
      });

    return Array.from(voucherMap.values());
  }

  private normalizeVoucher(voucher: any): any | null {
    if (!voucher) {
      return null;
    }

    const normalized = { ...voucher };
    normalized.id = Number(normalized.id ?? normalized.voucher_id ?? null);
    if (!normalized.id) {
      return null;
    }

    normalized.remaining_balance = this.getRemainingBalance(normalized);
    normalized.quantity = parseFloat(normalized.quantity ?? 0);
    normalized.is_generic =
      normalized.is_generic !== undefined
        ? normalized.is_generic
        : normalized.client_id == null;

    return normalized;
  }

  private getRemainingBalance(voucher: any): number {
    const value = voucher?.remaining_balance ?? voucher?.remaining_balance_after ?? 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  isInUse(id: number) {
    let inUse = false;
    this.defaults.appliedBonus.forEach(element => {
      if (element.bonus.id === id) {
        inUse = true;
      }
    });

    return inUse;
  }
}
