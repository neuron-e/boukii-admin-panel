import { Injectable } from '@angular/core';
import { ApiCrudService } from './crud.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MeetingPointService {
  constructor(private crudService: ApiCrudService) {}

  list(filters: Record<string, any> = {}): Observable<any[]> {
    return this.crudService.get('/admin/meeting-points', [], filters).pipe(
      map(response => response.data || [])
    );
  }

  create(data: any) {
    return this.crudService.create('/admin/meeting-points', data);
  }

  update(id: number, data: any) {
    return this.crudService.update('/admin/meeting-points', data, id);
  }

  delete(id: number) {
    return this.crudService.delete('/admin/meeting-points', id);
  }
}
