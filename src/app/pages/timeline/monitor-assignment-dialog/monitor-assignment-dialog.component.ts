import { Component, Inject, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { MonitorsService, MonitorTransferPreviewPayload } from 'src/service/monitors.service';

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
  allowMultiScope?: boolean;
  initialScope: MonitorAssignmentScope;
  startDate: string | null;
  endDate: string | null;
  summaryItems?: MonitorAssignmentDialogSummaryItem[];
  targetSubgroupIds?: number[];
  previewContext?: MonitorTransferPreviewPayload | null;
}

export interface MonitorAssignmentDialogSummaryItem {
  value: string | null;
  dateLabel: string;
  levelLabel: string | null;
  currentMonitor: string | null;
  subgroupId: number | null;
}

export interface MonitorAssignmentDialogResult {
  scope: MonitorAssignmentScope;
  startDate: string | null;
  endDate: string | null;
  targetSubgroupIds?: number[];
}

@Component({
  selector: 'vex-monitor-assignment-dialog',
  templateUrl: './monitor-assignment-dialog.component.html',
  styleUrls: ['./monitor-assignment-dialog.component.scss']
})
export class MonitorAssignmentDialogComponent implements OnDestroy {
  readonly dateOptions: MonitorAssignmentDialogDateOption[];
  readonly intervalDateValues: string[];
  readonly hasIntervals: boolean;
  readonly allowAll: boolean;
  readonly multiScopeAllowed: boolean;
  readonly monitorName: string;
  summaryItems: MonitorAssignmentDialogSummaryItem[];
  private allSummaryItems: MonitorAssignmentDialogSummaryItem[];
  private targetSubgroupIds: number[];
  private previewContext: MonitorTransferPreviewPayload | null;
  private previewSubscription?: Subscription;

  scope: MonitorAssignmentScope;
  startDate: string | null;
  endDate: string | null;
  summaryLoading = false;
  previewError: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<MonitorAssignmentDialogComponent, MonitorAssignmentDialogResult>,
    private monitorsService: MonitorsService,
    @Inject(MAT_DIALOG_DATA) public data: MonitorAssignmentDialogData
  ) {
    this.dateOptions = data.dates ?? [];
    this.intervalDateValues = data.intervalDates ?? [];
    this.multiScopeAllowed = data.allowMultiScope !== false;
    this.hasIntervals = this.multiScopeAllowed && !!data.hasMultipleIntervals && this.intervalDateValues.length > 0;
    this.allowAll = this.multiScopeAllowed && !!data.allowAllOption && this.dateOptions.length > 1;
    this.monitorName = this.resolveMonitorName(data.monitor);
    this.allSummaryItems = data.summaryItems ?? [];
    this.summaryItems = [...this.allSummaryItems];
    this.targetSubgroupIds = (data.targetSubgroupIds ?? []).filter(id => id != null);
    this.previewContext = data.previewContext ?? null;

    this.scope = data.initialScope ?? 'single';
    this.startDate = data.startDate ?? data.defaultDate ?? this.dateOptions[0]?.value ?? null;
    this.endDate = data.endDate ?? this.startDate;

    this.applyScopeDefaults(this.scope);
    this.handleSelectionChange(true);
  }

  onScopeChange(value: MonitorAssignmentScope): void {
    if (!this.multiScopeAllowed) {
      this.scope = 'single';
      this.applyScopeDefaults('single');
      this.handleSelectionChange();
      return;
    }
    this.scope = value;
    this.applyScopeDefaults(value);
    this.handleSelectionChange();
  }

  onStartDateChange(value: string): void {
    this.startDate = value;
    if (this.scope === 'from') {
      this.endDate = this.getLastAvailableDate();
    }
    if (this.scope === 'range') {
      this.ensureRangeOrder();
    }
    this.handleSelectionChange();
  }

  onEndDateChange(value: string): void {
    this.endDate = value;
    if (this.scope === 'range') {
      this.ensureRangeOrder();
    }
    this.handleSelectionChange();
  }

  getAvailableScopes(): MonitorAssignmentScope[] {
    if (!this.multiScopeAllowed) {
      return ['single'];
    }
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
      endDate: this.endDate,
      targetSubgroupIds: this.targetSubgroupIds ?? []
    });
  }

  ngOnDestroy(): void {
    this.previewSubscription?.unsubscribe();
  }

  private handleSelectionChange(requestPreview = true): void {
    this.emitSummaryUpdate();
    if (requestPreview) {
      this.requestPreviewUpdate();
    }
  }

  private applyScopeDefaults(scope: MonitorAssignmentScope): void {
    if (!this.multiScopeAllowed) {
      this.scope = 'single';
    }
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

  private requestPreviewUpdate(): void {
    if (!this.previewContext) {
      return;
    }

    const payload = this.buildPreviewPayload();
    if (!payload || !payload.start_date) {
      return;
    }

    this.summaryLoading = true;
    this.previewError = null;
    this.previewSubscription?.unsubscribe();

    this.previewSubscription = this.monitorsService.previewMonitorTransfer(payload).subscribe({
      next: response => {
        this.summaryLoading = false;
        const items = this.transformPreviewResponse(this.extractPreviewData(response));
        if (items.length) {
          this.allSummaryItems = items;
          this.targetSubgroupIds = items
            .map(item => item.subgroupId)
            .filter((id): id is number => id != null);
        } else {
          this.allSummaryItems = [];
        }
        this.emitSummaryUpdate();
      },
      error: error => {
        console.error('Error fetching monitor transfer preview', error);
        this.summaryLoading = false;
        this.previewError = 'preview_error';
      }
    });
  }

  private buildPreviewPayload(): MonitorTransferPreviewPayload | null {
    if (!this.previewContext) {
      return null;
    }

    const { start, end } = this.resolvePreviewDateRange();
    if (!start) {
      return null;
    }

    const payload: MonitorTransferPreviewPayload = {
      scope: this.scope,
      start_date: start,
      end_date: end ?? start
    };

    if (this.previewContext.course_id != null) {
      payload.course_id = this.previewContext.course_id;
    }

    if (this.previewContext.subgroup_id != null) {
      payload.subgroup_id = this.previewContext.subgroup_id;
    }
    if (this.previewContext.subgroup_ids?.length) {
      payload.subgroup_ids = this.previewContext.subgroup_ids;
    }

    return payload;
  }

  private resolvePreviewDateRange(): { start: string | null; end: string | null } {
    const fallback = this.data.defaultDate ?? this.dateOptions[0]?.value ?? null;
    const start = this.startDate ?? fallback;

    if (!start) {
      return { start: null, end: null };
    }

    if (this.scope === 'single') {
      return { start, end: start };
    }

    if (this.scope === 'from') {
      return { start, end: this.getLastAvailableDate() ?? start };
    }

    if (this.scope === 'all') {
      return {
        start: this.dateOptions[0]?.value ?? start,
        end: this.getLastAvailableDate() ?? start
      };
    }

    if (this.scope === 'interval' && this.intervalDateValues.length) {
      return {
        start: this.intervalDateValues[0],
        end: this.intervalDateValues[this.intervalDateValues.length - 1]
      };
    }

    return {
      start,
      end: this.endDate ?? start
    };
  }

  private transformPreviewResponse(data: any[]): MonitorAssignmentDialogSummaryItem[] {
    if (!Array.isArray(data)) {
      return [];
    }

    const result: MonitorAssignmentDialogSummaryItem[] = [];

    for (const item of data) {
      // NUEVO: Si el response contiene all_dates_in_subgroup, mostrar TODAS las fechas
      if (Array.isArray(item?.all_dates_in_subgroup) && item.all_dates_in_subgroup.length > 0) {
        // Crear un item por cada fecha en el subgrupo
        item.all_dates_in_subgroup.forEach((dateItem: any) => {
          const value = this.normalizeDateValue(dateItem?.date);

          result.push({
            value,
            dateLabel: this.resolveSummaryDateLabel(value, {
              ...dateItem,
              hour_start: dateItem?.hour_start,
              hour_end: dateItem?.hour_end
            }),
            // Mostrar nivel y monitor en TODAS las fechas del subgrupo
            levelLabel: item?.level_label ?? item?.course?.name ?? null,
            currentMonitor: item?.current_monitor?.name ?? null,
            subgroupId: typeof item?.id === 'number' ? item.id : null
          });
        });
      } else {
        // FALLBACK: Antiguo formato (solo 1 fecha)
        const value = this.normalizeDateValue(item?.date);
        result.push({
          value,
          dateLabel: this.resolveSummaryDateLabel(value, item),
          levelLabel: item?.level_label ?? item?.course?.name ?? null,
          currentMonitor: item?.current_monitor?.name ?? null,
          subgroupId: typeof item?.id === 'number' ? item.id : null
        });
      }
    }

    return result.filter(item => !!item.dateLabel);
  }

  private resolveSummaryDateLabel(value: string | null, item: any): string {
    if (value) {
      const option = this.dateOptions.find(opt => opt.value === value);
      if (option) {
        return option.label;
      }
    }
    const hourStart = item?.hour_start;
    const hourEnd = item?.hour_end;
    const hourLabel = hourStart && hourEnd ? ` (${hourStart} - ${hourEnd})` : '';
    if (value) {
      return `${value}${hourLabel}`;
    }
    return item?.date_label ?? hourLabel.replace(/^ /, '') ?? '';
  }

  private normalizeDateValue(value: any): string | null {
    if (!value) {
      return null;
    }
    const asString = `${value}`;
    return asString.length >= 10 ? asString.slice(0, 10) : asString;
  }

  private extractPreviewData(response: any): any[] {
    if (!response) {
      return [];
    }
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  private emitSummaryUpdate(): void {
    const startIdx = this.findDateIndex(this.startDate);
    const endIdx = this.findDateIndex(this.endDate);
    const inScopeDates: MonitorAssignmentDialogSummaryItem[] = [];
    const pushItem = (option: MonitorAssignmentDialogDateOption) => {
      let match = this.allSummaryItems.find(item => item.value === option.value && this.isTargetedSubgroup(item.subgroupId));
      if (!match) {
        match = this.allSummaryItems.find(item => item.value === option.value || item.dateLabel === option.label);
      }
      if (match) {
        inScopeDates.push(match);
      } else {
        inScopeDates.push({
          value: option.value ?? null,
          dateLabel: option.label,
          levelLabel: null,
          currentMonitor: null,
          subgroupId: null
        });
      }
    };

    if (!this.dateOptions.length) {
      this.summaryItems = [];
      return;
    }

    switch (this.scope) {
      case 'single':
        if (startIdx !== -1) pushItem(this.dateOptions[startIdx]);
        break;
      case 'interval':
      case 'all':
        this.dateOptions.forEach(pushItem);
        break;
      case 'from': {
        const start = startIdx === -1 ? 0 : startIdx;
        for (let i = start; i < this.dateOptions.length; i++) pushItem(this.dateOptions[i]);
        break;
      }
      case 'range': {
        if (startIdx === -1 || endIdx === -1) break;
        const low = Math.min(startIdx, endIdx);
        const high = Math.max(startIdx, endIdx);
        for (let i = low; i <= high && i < this.dateOptions.length; i++) pushItem(this.dateOptions[i]);
        break;
      }
    }

    this.summaryItems = inScopeDates;
  }

  private isTargetedSubgroup(subgroupId: number | null): boolean {
    if (!this.targetSubgroupIds?.length || subgroupId == null) {
      return false;
    }
    return this.targetSubgroupIds.includes(subgroupId);
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
