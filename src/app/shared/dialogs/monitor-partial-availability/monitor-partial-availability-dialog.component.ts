import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface MonitorPartialAvailabilityDialogData {
  monitorName: string;
  availableDates: string[];
  blockedDates: string[];
}

export type MonitorPartialAvailabilityDialogResult = 'continue' | 'cancel';

@Component({
  selector: 'vex-monitor-partial-availability-dialog',
  templateUrl: './monitor-partial-availability-dialog.component.html',
  styleUrls: ['./monitor-partial-availability-dialog.component.scss']
})
export class MonitorPartialAvailabilityDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<MonitorPartialAvailabilityDialogComponent, MonitorPartialAvailabilityDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: MonitorPartialAvailabilityDialogData
  ) {}

  continueOnlyAvailable(): void {
    this.dialogRef.close('continue');
  }

  cancel(): void {
    this.dialogRef.close('cancel');
  }
}
