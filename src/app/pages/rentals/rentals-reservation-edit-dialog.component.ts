import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalReservationEditDialogData {
  reservation: any;
  pickupPoints: any[];
}

@Component({
  selector: 'vex-rentals-reservation-edit-dialog',
  templateUrl: './rentals-reservation-edit-dialog.component.html',
  styleUrls: ['./rentals-reservation-edit-dialog.component.scss']
})
export class RentalsReservationEditDialogComponent {
  form = this.fb.group({
    pickup_point_id: [null, Validators.required],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    start_time: ['09:00', Validators.required],
    end_time: ['17:00', Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<RentalsReservationEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: RentalReservationEditDialogData
  ) {
    const reservation = data?.reservation || {};
    this.form.patchValue({
      pickup_point_id: reservation?.pickup_point_id ?? null,
      start_date: this.dateOnly(reservation?.start_date),
      end_date: this.dateOnly(reservation?.end_date),
      start_time: this.timeOnly(reservation?.start_time, '09:00'),
      end_time: this.timeOnly(reservation?.end_time, '17:00')
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  private dateOnly(value: any): string {
    const text = String(value || '').trim();
    return text ? text.slice(0, 10) : '';
  }

  private timeOnly(value: any, fallback: string): string {
    const text = String(value || '').trim();
    if (!text) return fallback;
    return text.slice(0, 5);
  }
}

