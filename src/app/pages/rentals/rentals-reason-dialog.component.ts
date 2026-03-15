import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalsReasonDialogData {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  initialValue?: string;
}

@Component({
  selector: 'vex-rentals-reason-dialog',
  templateUrl: './rentals-reason-dialog.component.html',
  styleUrls: ['./rentals-reason-dialog.component.scss']
})
export class RentalsReasonDialogComponent {
  readonly form = this.fb.group({
    reason: [this.data.initialValue || '', this.data.required ? [Validators.required] : []]
  });

  constructor(
    private readonly fb: FormBuilder,
    public readonly dialogRef: MatDialogRef<RentalsReasonDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: RentalsReasonDialogData
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(String(this.form.get('reason')?.value || '').trim());
  }
}
