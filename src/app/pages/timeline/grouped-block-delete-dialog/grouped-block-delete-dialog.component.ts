import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface GroupedBlockDeleteDialogData {
  title: string;
  message: string;
  dayLabel: string;
  visibleLabel: string;
  cancelLabel: string;
}

@Component({
  selector: 'app-grouped-block-delete-dialog',
  templateUrl: './grouped-block-delete-dialog.component.html',
  styleUrls: ['./grouped-block-delete-dialog.component.scss']
})
export class GroupedBlockDeleteDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<GroupedBlockDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GroupedBlockDeleteDialogData
  ) {}

  chooseDay(): void {
    this.dialogRef.close('day');
  }

  chooseVisible(): void {
    this.dialogRef.close('visible');
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
