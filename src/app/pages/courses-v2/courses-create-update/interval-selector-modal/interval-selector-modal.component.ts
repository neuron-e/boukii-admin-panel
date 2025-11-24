import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface IntervalSelectorModalData {
  intervals: any[];
  level: any;
  action: 'add-subgroup' | 'remove-subgroup' | 'add-group' | 'remove-group';
  subgroupIndex?: number;
  subgroupDates?: { [intervalId: number]: any[] };
}

export interface IntervalSelectorModalResult {
  selectedIndices: number[];
  selectAll: boolean;
}

@Component({
  selector: 'app-interval-selector-modal',
  template: `
    <h1 mat-dialog-title>Seleccionar Intervalo</h1>
    <div mat-dialog-content>
      <p>Elige los intervalos para el subgrupo {{ ("00" + ((data.subgroupIndex ?? 0) + 1)).slice(-2) }} de {{ data.level?.annotation }} {{ data.level?.level }}</p>
      <mat-checkbox [(ngModel)]="selectAll" (change)="onSelectAllChange()">Todos los intervalos</mat-checkbox>
      <div *ngFor="let interval of data.intervals; let i = index">
        <mat-checkbox [(ngModel)]="selected[i]" [disabled]="selectAll">{{ interval.name || ('Intervalo ' + (i + 1)) }}</mat-checkbox>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-raised-button color="primary" (click)="applySelection()">Aplicar</button>
    </div>
  `
})
export class IntervalSelectorModalComponent {
  selectAll = false;
  selected: boolean[] = [];

  constructor(
    public dialogRef: MatDialogRef<IntervalSelectorModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IntervalSelectorModalData
  ) {
    this.selected = new Array(data.intervals.length).fill(false);
  }

  onSelectAllChange(): void {
    if (this.selectAll) {
      this.selected = new Array(this.data.intervals.length).fill(true);
    } else {
      this.selected = new Array(this.data.intervals.length).fill(false);
    }
  }

  applySelection(): void {
    const result: IntervalSelectorModalResult = {
      selectAll: this.selectAll,
      selectedIndices: this.selectAll
        ? this.data.intervals.map((_: any, idx: number) => idx)
        : this.selected
          .map((v, idx) => v ? idx : -1)
          .filter(idx => idx >= 0)
    };
    this.dialogRef.close(result);
  }
}
