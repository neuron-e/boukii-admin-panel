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

    const available: MonitorAssignmentSlot[] = [];
    const blocked: MonitorAssignmentSlot[] = [];

    for (const slot of slots) {
      if (!slot.date || !slot.startTime) {
        blocked.push(slot);
        continue;
      }

      try {
        // Check if THIS specific monitor is available (simpler and more direct)
        const payload = {
          date: slot.date,
          hour_start: slot.startTime,
          hour_end: slot.endTime || slot.startTime
        };
        const response: any = await firstValueFrom(
          this.crudService.post(`/admin/monitors/available/${monitorId}`, payload)
        );
        // Direct check: if response.data.available is true, monitor is available
        if (response?.data?.available === true) {
          available.push(slot);
        } else {
          blocked.push(slot);
        }
      } catch {
        blocked.push(slot);
      }
    }

    return { available, blocked };
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
