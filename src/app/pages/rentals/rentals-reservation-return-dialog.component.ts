import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalReservationReturnDialogData {
  reservation: any;
  partialOnly?: boolean;
  assignments?: Array<{
    assignment_id: number;
    line_id: number;
    unit_id: number;
    label: string;
  }>;
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
    quantity: [1],
    send_to_maintenance: [false],
    maintenance_reason: [''],
    maintenance_condition: ['maintenance'],
    report_damage: [false],
    damage_assignment_id: [null as number | null],
    damage_severity: ['minor'],
    damage_description: [''],
    damage_cost: [0 as number],
    damage_condition: ['damaged']
  });

  lines: any[] = [];
  assignments: Array<{ assignment_id: number; line_id: number; unit_id: number; label: string }> = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<RentalsReservationReturnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: RentalReservationReturnDialogData
  ) {
    this.lines = this.buildLines(data?.reservation);
    this.assignments = this.buildAssignments(data?.assignments);
    const firstLineId = this.lines[0]?.id || null;
    const firstAssignmentId = this.filteredAssignments(firstLineId)[0]?.assignment_id || this.assignments[0]?.assignment_id || null;
    if (data?.partialOnly) {
      this.form.patchValue({ mode: 'partial', line_id: firstLineId, quantity: 1, damage_assignment_id: firstAssignmentId });
    } else {
      this.form.patchValue({ line_id: firstLineId, quantity: 1, damage_assignment_id: firstAssignmentId });
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

  get maintenanceEnabled(): boolean {
    return !!this.form.get('send_to_maintenance')?.value;
  }

  get damageEnabled(): boolean {
    return !!this.form.get('report_damage')?.value;
  }

  filteredAssignments(lineId?: number | null): Array<{ assignment_id: number; line_id: number; unit_id: number; label: string }> {
    const targetLineId = Number(lineId || this.form.get('line_id')?.value || 0);
    const mode = String(this.form.get('mode')?.value || 'full');
    if (this.partialOnly || mode === 'partial') {
      return this.assignments.filter((assignment) => assignment.line_id === targetLineId);
    }
    return [...this.assignments];
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
    const payload: any = { mode };
    if (mode === 'full') {
      payload.return_lines = [];
    } else {
      const lineId = Number(this.form.get('line_id')?.value || 0);
      const quantity = Number(this.form.get('quantity')?.value || 0);
      if (!lineId || quantity <= 0) {
        this.form.markAllAsTouched();
        return;
      }
      payload.return_lines = [{ line_id: lineId, quantity }];
    }

    const returnAssignments = this.resolveReturnedAssignments(payload.return_lines, mode);

    if (this.maintenanceEnabled) {
      payload.maintenance = {
        enabled: true,
        unit_ids: returnAssignments.map((assignment) => Number(assignment.unit_id)).filter((unitId) => unitId > 0),
        reason: String(this.form.get('maintenance_reason')?.value || '').trim(),
        condition: String(this.form.get('maintenance_condition')?.value || 'maintenance').trim() || 'maintenance'
      };
    }

    if (this.damageEnabled) {
      const damageAssignmentId = Number(this.form.get('damage_assignment_id')?.value || 0);
      const selectedAssignment = returnAssignments.find((assignment) => assignment.assignment_id === damageAssignmentId)
        || this.assignments.find((assignment) => assignment.assignment_id === damageAssignmentId)
        || null;

      if (!selectedAssignment || damageAssignmentId <= 0) {
        this.form.markAllAsTouched();
        return;
      }

      payload.damage = {
        enabled: true,
        assignment_id: damageAssignmentId,
        line_id: Number(selectedAssignment.line_id || 0),
        severity: String(this.form.get('damage_severity')?.value || 'minor'),
        description: String(this.form.get('damage_description')?.value || '').trim(),
        damage_cost: Number(this.form.get('damage_cost')?.value || 0),
        condition: String(this.form.get('damage_condition')?.value || 'damaged'),
        notes: String(this.form.get('damage_description')?.value || '').trim()
      };
    }

    this.dialogRef.close(payload);
  }

  private bindValidators(): void {
    const modeControl = this.form.get('mode');
    const lineControl = this.form.get('line_id');
    const qtyControl = this.form.get('quantity');
    if (!modeControl || !lineControl || !qtyControl) return;
    const maintenanceToggle = this.form.get('send_to_maintenance');
    const maintenanceReason = this.form.get('maintenance_reason');
    const damageToggle = this.form.get('report_damage');
    const damageAssignment = this.form.get('damage_assignment_id');
    const damageDescription = this.form.get('damage_description');
    const damageCost = this.form.get('damage_cost');

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

      if (maintenanceToggle?.value) {
        maintenanceReason?.setValidators([Validators.required, Validators.minLength(3)]);
      } else {
        maintenanceReason?.clearValidators();
      }
      maintenanceReason?.updateValueAndValidity({ emitEvent: false });

      if (damageToggle?.value) {
        damageAssignment?.setValidators([Validators.required]);
        damageDescription?.setValidators([Validators.required, Validators.minLength(3)]);
        damageCost?.setValidators([Validators.required, Validators.min(0)]);
      } else {
        damageAssignment?.clearValidators();
        damageDescription?.clearValidators();
        damageCost?.clearValidators();
      }
      damageAssignment?.updateValueAndValidity({ emitEvent: false });
      damageDescription?.updateValueAndValidity({ emitEvent: false });
      damageCost?.updateValueAndValidity({ emitEvent: false });

      const selectedLineId = Number(lineControl.value || 0);
      const availableAssignments = this.filteredAssignments(selectedLineId);
      const currentDamageAssignmentId = Number(damageAssignment?.value || 0);
      if (!availableAssignments.some((assignment) => assignment.assignment_id === currentDamageAssignmentId)) {
        damageAssignment?.setValue(availableAssignments[0]?.assignment_id || null, { emitEvent: false });
      }
    };

    apply();
    modeControl.valueChanges.subscribe(() => apply());
    lineControl.valueChanges.subscribe(() => apply());
    maintenanceToggle?.valueChanges.subscribe(() => apply());
    damageToggle?.valueChanges.subscribe(() => apply());
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

  private buildAssignments(assignments: any): Array<{ assignment_id: number; line_id: number; unit_id: number; label: string }> {
    const source = Array.isArray(assignments) ? assignments : [];
    return source
      .map((assignment: any) => ({
        assignment_id: Number(assignment?.id || 0),
        line_id: Number(assignment?.rental_reservation_line_id || assignment?.line_id || 0),
        unit_id: Number(assignment?.rental_unit_id || assignment?.unit_id || 0),
        label: String(
          assignment?.label
          || assignment?.variant_name
          || assignment?.item_name
          || assignment?.line_label
          || `Unidad #${assignment?.rental_unit_id || assignment?.unit_id || '?'}`
        ).trim()
      }))
      .filter((assignment) => assignment.assignment_id > 0 && assignment.line_id > 0 && assignment.unit_id > 0);
  }

  private resolveReturnedAssignments(returnLines: any[], mode: string): Array<{ assignment_id: number; line_id: number; unit_id: number; label: string }> {
    if (this.partialOnly || mode === 'partial') {
      const lineId = Number(returnLines?.[0]?.line_id || this.form.get('line_id')?.value || 0);
      const quantity = Math.max(1, Number(returnLines?.[0]?.quantity || this.form.get('quantity')?.value || 1));
      return this.filteredAssignments(lineId).slice(0, quantity);
    }
    return [...this.assignments];
  }
}
