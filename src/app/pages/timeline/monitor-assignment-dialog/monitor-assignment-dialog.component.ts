import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export type MonitorAssignmentScope = 'single' | 'interval' | 'all' | 'from' | 'range';

export interface MonitorAssignmentDialogDateOption {
  value: string;
  label: string;
}

export interface MonitorAssignmentDialogData {
  monitor: any;
  dates: MonitorAssignmentDialogDateOption[];
  defaultDate: string | null;
  intervalDates: string[];
  hasMultipleIntervals: boolean;
  allowAllOption: boolean;
  initialScope: MonitorAssignmentScope;
  startDate: string | null;
  endDate: string | null;
}

export interface MonitorAssignmentDialogResult {
  scope: MonitorAssignmentScope;
  startDate: string | null;
  endDate: string | null;
}

@Component({
  selector: 'vex-monitor-assignment-dialog',
  templateUrl: './monitor-assignment-dialog.component.html',
  styleUrls: ['./monitor-assignment-dialog.component.scss']
})
export class MonitorAssignmentDialogComponent {
  readonly dateOptions: MonitorAssignmentDialogDateOption[];
  readonly intervalDateValues: string[];
  readonly hasIntervals: boolean;
  readonly allowAll: boolean;
  readonly monitorName: string;

  scope: MonitorAssignmentScope;
  startDate: string | null;
  endDate: string | null;

  constructor(
    private dialogRef: MatDialogRef<MonitorAssignmentDialogComponent, MonitorAssignmentDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: MonitorAssignmentDialogData
  ) {
    this.dateOptions = data.dates ?? [];
    this.intervalDateValues = data.intervalDates ?? [];
    this.hasIntervals = !!data.hasMultipleIntervals && this.intervalDateValues.length > 0;
    this.allowAll = !!data.allowAllOption && this.dateOptions.length > 1;
    this.monitorName = this.resolveMonitorName(data.monitor);

    this.scope = data.initialScope ?? 'single';
    this.startDate = data.startDate ?? data.defaultDate ?? this.dateOptions[0]?.value ?? null;
    this.endDate = data.endDate ?? this.startDate;

    this.applyScopeDefaults(this.scope);
  }

  onScopeChange(value: MonitorAssignmentScope): void {
    this.scope = value;
    this.applyScopeDefaults(value);
  }

  onStartDateChange(value: string): void {
    this.startDate = value;
    if (this.scope === 'from') {
      this.endDate = this.getLastAvailableDate();
    }
    if (this.scope === 'range') {
      this.ensureRangeOrder();
    }
  }

  onEndDateChange(value: string): void {
    this.endDate = value;
    if (this.scope === 'range') {
      this.ensureRangeOrder();
    }
  }

  getAvailableScopes(): MonitorAssignmentScope[] {
    const scopes: MonitorAssignmentScope[] = ['single'];
    if (this.hasIntervals) {
      scopes.push('interval');
    }
    if (this.allowAll) {
      scopes.push('all');
      scopes.push('from');
      scopes.push('range');
    }
    return scopes;
  }

  getSelectedSessionCount(): number {
    if (!this.dateOptions.length) {
      return 0;
    }

    switch (this.scope) {
      case 'single':
        return 1;
      case 'interval':
        return this.intervalDateValues.length || 1;
      case 'all':
        return this.dateOptions.length;
      case 'from': {
        const startIndex = this.findDateIndex(this.startDate);
        return startIndex === -1 ? this.dateOptions.length : this.dateOptions.length - startIndex;
      }
      case 'range': {
        const startIndex = this.findDateIndex(this.startDate);
        const endIndex = this.findDateIndex(this.endDate);
        if (startIndex === -1 || endIndex === -1) {
          return this.dateOptions.length;
        }
        return Math.abs(endIndex - startIndex) + 1;
      }
      default:
        return 1;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    this.dialogRef.close({
      scope: this.scope,
      startDate: this.startDate,
      endDate: this.endDate
    });
  }

  private applyScopeDefaults(scope: MonitorAssignmentScope): void {
    const defaultDate = this.data.defaultDate ?? this.dateOptions[0]?.value ?? null;
    switch (scope) {
      case 'single':
        this.startDate = defaultDate;
        this.endDate = defaultDate;
        break;
      case 'interval':
        if (this.intervalDateValues.length) {
          this.startDate = this.intervalDateValues[0];
          this.endDate = this.intervalDateValues[this.intervalDateValues.length - 1];
        } else {
          this.startDate = defaultDate;
          this.endDate = defaultDate;
        }
        break;
      case 'all':
        this.startDate = this.dateOptions[0]?.value ?? defaultDate;
        this.endDate = this.dateOptions[this.dateOptions.length - 1]?.value ?? defaultDate;
        break;
      case 'from':
        this.startDate = defaultDate ?? this.dateOptions[0]?.value ?? null;
        this.endDate = this.getLastAvailableDate();
        break;
      case 'range':
        if (!this.startDate) {
          this.startDate = defaultDate ?? this.dateOptions[0]?.value ?? null;
        }
        if (!this.endDate) {
          this.endDate = this.dateOptions[this.dateOptions.length - 1]?.value ?? this.startDate;
        }
        this.ensureRangeOrder();
        break;
      default:
        break;
    }
  }

  private ensureRangeOrder(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }
    const startIndex = this.findDateIndex(this.startDate);
    const endIndex = this.findDateIndex(this.endDate);
    if (startIndex !== -1 && endIndex !== -1 && startIndex > endIndex) {
      const temp = this.startDate;
      this.startDate = this.endDate;
      this.endDate = temp;
    }
  }

  private findDateIndex(value: string | null): number {
    if (!value) {
      return -1;
    }
    return this.dateOptions.findIndex(option => option.value === value);
  }

  private getLastAvailableDate(): string | null {
    return this.dateOptions[this.dateOptions.length - 1]?.value ?? null;
  }

  private resolveMonitorName(monitor: any): string {
    if (!monitor) {
      return '';
    }
    const firstName = monitor.first_name ?? monitor.firstName ?? '';
    const lastName = monitor.last_name ?? monitor.lastName ?? '';
    return `${firstName} ${lastName}`.trim();
  }
}
