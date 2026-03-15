import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalDamageDialogData {
  reservation: any;
  lines: Array<{ id: number; line_id?: number; label: string }>;
}

@Component({
  selector: 'vex-rentals-damage-dialog',
  templateUrl: './rentals-damage-dialog.component.html'
})
export class RentalsDamageDialogComponent {
  form = this.fb.group({
    assignment_id: [null as number | null, Validators.required],
    line_id: [null as number | null],
    severity: ['minor', Validators.required],
    description: ['', Validators.required],
    damage_cost: [0 as number, [Validators.required, Validators.min(0)]],
    condition: ['damaged']
  });

  get depositAmount(): number {
    return Number(this.data?.reservation?.deposit_amount ?? 0);
  }

  get depositStatus(): string {
    return String(this.data?.reservation?.deposit_status ?? 'none');
  }

  get damageCost(): number {
    return Number(this.form.get('damage_cost')?.value ?? 0);
  }

  get currency(): string {
    return this.resolveCurrencyCandidate(
      this.data?.reservation?.currency,
      this.schoolCurrencyFromUser()
    );
  }

  get depositCoversAll(): boolean {
    return this.depositAmount >= this.damageCost && this.depositAmount > 0;
  }

  get depositSuggestion(): string {
    if (this.depositAmount <= 0) return '';
    if (this.damageCost <= 0) return '';
    if (this.depositCoversAll) return 'deposit_covers_all';
    return 'deposit_partial';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<RentalsDamageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RentalDamageDialogData
  ) {}

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const assignmentId = Number(this.form.get('assignment_id')?.value || 0);
    const selected = this.data.lines.find((line) => Number(line.id) === assignmentId) || null;
    this.dialogRef.close({
      ...this.form.value,
      assignment_id: assignmentId,
      line_id: Number(selected?.line_id || 0) || null,
      notes: this.form.value.description,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

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
}
