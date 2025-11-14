import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiCrudService } from './crud.service';

export interface MonitorTransferPayload {
  monitor_id: number | null;
  booking_users: number[];
  subgroup_id: number | null;

  // NUEVO:
  scope?: 'single' | 'interval' | 'all' | 'from' | 'range';
  start_date?: string | null;  // 'YYYY-MM-DD'
  end_date?: string | null;    // 'YYYY-MM-DD'

  // contexto para resolver en backend si booking_users=[]
  course_id?: number | null;
  booking_id?: number | null;
  course_subgroup_id?: number | null;
  course_date_id?: number | null;
  subgroup_ids?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class MonitorsService {

  constructor(private crudService: ApiCrudService) {}

  transferMonitor(payload: MonitorTransferPayload): Observable<any> {
    return this.crudService.post('/admin/planner/monitors/transfer', payload);
  }
}

