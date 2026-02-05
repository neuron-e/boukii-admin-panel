import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-level-selector-dialog',
  templateUrl: './level-selector-dialog.component.html',
  styleUrls: ['./level-selector-dialog.component.scss']
})
export class LevelSelectorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<LevelSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  selectLevel(level: any): void {
    this.dialogRef.close(level);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
