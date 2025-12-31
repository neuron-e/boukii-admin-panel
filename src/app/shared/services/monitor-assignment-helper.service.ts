import { formatDate } from '@angular/common';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';
import {
  MonitorPartialAvailabilityDialogComponent,
  MonitorPartialAvailabilityDialogData
} from '../dialogs/monitor-partial-availability/monitor-partial-availability-dialog.component';

export interface MonitorAssignmentSlot {
  date: string;
  startTime: string;
  endTime: string;
  degreeId?: number | null;
  sportId?: number | null;
  label?: string;
  context?: {
    [key: string]: any;
    currentMonitorName?: string | null;
    currentMonitorId?: number | null;
    conflicts?: string[];
  };
}

export interface MonitorAvailabilityCheckResult {
  available: MonitorAssignmentSlot[];
  blocked: MonitorAssignmentSlot[];
}

@Injectable({
  providedIn: 'root'
})
export class MonitorAssignmentHelperService {
  constructor(
    private crudService: ApiCrudService,
    private dialog: MatDialog,
    private translateService: TranslateService
  ) {}

  async checkMonitorAvailabilityForSlots(
    monitorId: number | null,
    slots: MonitorAssignmentSlot[],
    context?: { bookingUserIds?: number[]; subgroupIds?: number[]; courseId?: number | null }
  ): Promise<MonitorAvailabilityCheckResult> {
    if (!monitorId || slots.length === 0) {
      return { available: slots, blocked: [] };
    }

    const dedupedSlots: MonitorAssignmentSlot[] = [];
    const seen = new Set<string>();
    slots.forEach(slot => {
      const date = slot?.date ?? '';
      const start = slot?.startTime ?? '';
      const end = slot?.endTime ?? slot?.startTime ?? '';
      const key = `${date}-${start}-${end}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      dedupedSlots.push(slot);
    });

    const available: MonitorAssignmentSlot[] = [];
    const blocked: MonitorAssignmentSlot[] = [];

    const batchSize = 10;
    for (let i = 0; i < dedupedSlots.length; i += batchSize) {
      const batch = dedupedSlots.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (slot) => {
          if (!slot.date || !slot.startTime) {
            return { slot, available: false };
          }

          try {
            const payload = {
              date: slot.date,
              hour_start: slot.startTime,
              hour_end: slot.endTime || slot.startTime
            };
            const response: any = await firstValueFrom(
              this.crudService.post(`/admin/monitors/available/${monitorId}`, payload)
            );
            return { slot, available: response?.data?.available === true };
          } catch {
            return { slot, available: false };
          }
        })
      );

      for (const result of results) {
        if (result.available) {
          available.push(result.slot);
        } else {
          blocked.push(result.slot);
        }
      }
    }

    const dedupeSlots = (items: MonitorAssignmentSlot[]): MonitorAssignmentSlot[] => {
      const seenKeys = new Set<string>();
      const result: MonitorAssignmentSlot[] = [];
      items.forEach(item => {
        const date = item?.date ?? '';
        const start = item?.startTime ?? '';
        const end = item?.endTime ?? item?.startTime ?? '';
        const key = `${date}-${start}-${end}`;
        if (seenKeys.has(key)) {
          return;
        }
        seenKeys.add(key);
        result.push(item);
      });
      return result;
    };

    return { available: dedupeSlots(available), blocked: dedupeSlots(blocked) };
  }

  async confirmPartialAvailability(
    monitorName: string,
    result: MonitorAvailabilityCheckResult
  ): Promise<boolean> {
    if (!result.blocked.length) {
      return true;
    }

    const currentMonitorLabel = this.translateService.instant('monitor_assignment.partial.current_monitor');
    const conflictLabel = this.translateService.instant('monitor_assignment.partial.conflict_reason');
    const currentMonitorPrefix = currentMonitorLabel !== 'monitor_assignment.partial.current_monitor' ? currentMonitorLabel : 'Current: ';
    const conflictPrefix = conflictLabel !== 'monitor_assignment.partial.conflict_reason' ? conflictLabel : 'Busy on';

    const formatAvailable = (slot: MonitorAssignmentSlot): string => {
      const base = slot.label ?? slot.date;
      const monitorName = slot.context?.currentMonitorName ?? slot.context?.currentMonitor?.name ?? null;
      return monitorName ? `${base} · ${currentMonitorPrefix}${monitorName}` : base;
    };

    const formatBlocked = (slot: MonitorAssignmentSlot): string => {
      const base = slot.label ?? slot.date;
      const conflicts = Array.isArray(slot.context?.conflicts) ? slot.context?.conflicts : [];
      return conflicts.length ? `${base} · ${conflictPrefix} ${conflicts.join(', ')}` : base;
    };

    const dialogData: MonitorPartialAvailabilityDialogData = {
      monitorName,
      availableDates: result.available.map(formatAvailable),
      blockedDates: result.blocked.map(formatBlocked)
    };

    const dialogRef = this.dialog.open(MonitorPartialAvailabilityDialogComponent, {
      width: '520px',
      data: dialogData
    });

    const selection = await firstValueFrom(dialogRef.afterClosed());
    return selection === 'continue';
  }

  formatSlotLabel(date: string, startTime?: string, endTime?: string): string {
    if (!date) {
      return '';
    }
    const locale = this.translateService.currentLang || 'es-ES';
    let label: string;
    try {
      label = formatDate(date, 'dd/MM/yyyy', locale);
    } catch {
      label = date;
    }
    if (!startTime && !endTime) {
      return label;
    }
    const times = [startTime, endTime].filter(Boolean).join(' - ');
    return `${label} (${times})`;
  }
}
