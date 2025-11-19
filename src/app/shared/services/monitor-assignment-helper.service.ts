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
  context?: Record<string, any>;
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
    slots: MonitorAssignmentSlot[]
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
        const response: any = await firstValueFrom(
          this.crudService.post('/admin/monitors/available', {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime || slot.startTime,
            minimumDegreeId: slot.degreeId,
            sportId: slot.sportId
          })
        );
        const list = Array.isArray(response?.data) ? response.data : [];
        if (list.some((monitor: any) => monitor?.id === monitorId)) {
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

    const dialogData: MonitorPartialAvailabilityDialogData = {
      monitorName,
      availableDates: result.available.map(slot => slot.label ?? slot.date),
      blockedDates: result.blocked.map(slot => slot.label ?? slot.date)
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
