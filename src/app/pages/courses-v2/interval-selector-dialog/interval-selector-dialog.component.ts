import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface IntervalSelectorData {
  intervals: any[];
  title: string;
  message: string;
}

@Component({
  selector: 'app-interval-selector-dialog',
  templateUrl: './interval-selector-dialog.component.html',
  styleUrls: ['./interval-selector-dialog.component.scss']
})
export class IntervalSelectorDialogComponent {
  selectedIntervalIndex: number | 'all' = 'all';

  constructor(
    public dialogRef: MatDialogRef<IntervalSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IntervalSelectorData
  ) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    this.dialogRef.close(this.selectedIntervalIndex);
  }
}
