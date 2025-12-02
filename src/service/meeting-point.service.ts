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
      map(response => {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (Array.isArray(response.data)) return response.data;
        if (response.data && Array.isArray(response.data.data)) return response.data.data;
        return [];
      })
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
