import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalReservationReturnDialogData {
  reservation: any;
  partialOnly?: boolean;
}

@Component({
  selector: 'vex-rentals-reservation-return-dialog',
  templateUrl: './rentals-reservation-return-dialog.component.html',
  styleUrls: ['./rentals-reservation-return-dialog.component.scss']
})
export class RentalsReservationReturnDialogComponent {
  form = this.fb.group({
    mode: ['full', Validators.required],
    line_id: [null],
    quantity: [1]
  });

  lines: any[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<RentalsReservationReturnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: RentalReservationReturnDialogData
  ) {
    this.lines = this.buildLines(data?.reservation);
    const firstLineId = this.lines[0]?.id || null;
    if (data?.partialOnly) {
      this.form.patchValue({ mode: 'partial', line_id: firstLineId, quantity: 1 });
    } else {
      this.form.patchValue({ line_id: firstLineId, quantity: 1 });
    }
    this.bindValidators();
  }

  get partialOnly(): boolean {
    return !!this.data?.partialOnly;
  }

  get selectedLineMaxQty(): number {
    const lineId = Number(this.form.get('line_id')?.value || 0);
    const line = this.lines.find((entry) => Number(entry.id) === lineId);
    return Math.max(1, Number(line?.maxReturnQty || 1));
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const mode = String(this.form.get('mode')?.value || 'full');
    if (mode === 'full') {
      this.dialogRef.close({ mode: 'full' });
      return;
    }

    const lineId = Number(this.form.get('line_id')?.value || 0);
    const quantity = Number(this.form.get('quantity')?.value || 0);
    if (!lineId || quantity <= 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      mode: 'partial',
      return_lines: [{ line_id: lineId, quantity }]
    });
  }

  private bindValidators(): void {
    const modeControl = this.form.get('mode');
    const lineControl = this.form.get('line_id');
    const qtyControl = this.form.get('quantity');
    if (!modeControl || !lineControl || !qtyControl) return;

    const apply = () => {
      const partial = this.partialOnly || String(modeControl.value || 'full') === 'partial';
      if (partial) {
        lineControl.setValidators([Validators.required]);
        qtyControl.setValidators([Validators.required, Validators.min(1)]);
      } else {
        lineControl.clearValidators();
        qtyControl.clearValidators();
      }
      lineControl.updateValueAndValidity({ emitEvent: false });
      qtyControl.updateValueAndValidity({ emitEvent: false });
    };

    apply();
    modeControl.valueChanges.subscribe(() => apply());
  }

  private buildLines(reservation: any): any[] {
    const source = Array.isArray(reservation?.lines)
      ? reservation.lines
      : Array.isArray(reservation?.items)
        ? reservation.items
        : [];

    return source
      .map((line: any) => {
        const quantity = Number(line?.quantity || 0);
        const qtyAssigned = Number(line?.qty_assigned || 0);
        const maxReturnQty = Math.max(0, qtyAssigned || quantity);
        return {
          id: Number(line?.id || 0),
          label: line?.variant_name || line?.name || line?.item_name || `Line #${line?.id || '?'}`,
          quantity,
          qtyAssigned,
          maxReturnQty
        };
      })
      .filter((line: any) => line.id > 0 && line.maxReturnQty > 0);
  }
}

