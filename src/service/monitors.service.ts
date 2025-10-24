import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiCrudService } from './crud.service';

export interface MonitorTransferPayload {
  monitor_id: number | null;
  booking_users: number[];
  subgroup_id?: number | null;
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

