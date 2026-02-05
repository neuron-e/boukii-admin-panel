import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface MonitorAssignmentSyncEvent {
  sourceId: string;
  courseId?: number | null;
  monitorId?: number | null;
  slotKeys?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MonitorAssignmentSyncService {
  private readonly changesSubject = new Subject<MonitorAssignmentSyncEvent>();

  get changes$(): Observable<MonitorAssignmentSyncEvent> {
    return this.changesSubject.asObservable();
  }

  broadcastChange(event: MonitorAssignmentSyncEvent): void {
    this.changesSubject.next(event);
  }
}
