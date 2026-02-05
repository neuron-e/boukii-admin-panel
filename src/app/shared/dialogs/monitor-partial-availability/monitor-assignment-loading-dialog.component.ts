import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface MonitorAssignmentLoadingData {
  message: string;
}

@Component({
  selector: 'vex-monitor-assignment-loading-dialog',
  templateUrl: './monitor-assignment-loading-dialog.component.html',
  styleUrls: ['./monitor-assignment-loading-dialog.component.scss']
})
export class MonitorAssignmentLoadingDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: MonitorAssignmentLoadingData) {}
}
