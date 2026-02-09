import { Injectable } from '@angular/core';
import { BehaviorSubject, map, tap } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';

@Injectable({
  providedIn: 'root'
})
export class AdminNotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private crud: ApiCrudService) {}

  list(params: any = {}) {
    return this.crud.get('/admin/notifications', [], params);
  }

  getUnreadCount() {
    return this.crud.get('/admin/notifications/unread-count').pipe(
      map((response: any) => response?.data?.count ?? 0),
      tap((count: number) => this.unreadCountSubject.next(count))
    );
  }

  refreshUnreadCount() {
    return this.getUnreadCount().subscribe();
  }

  markRead(id: number) {
    return this.crud.post(`/admin/notifications/${id}/read`, {});
  }

  markAllRead() {
    return this.crud.post('/admin/notifications/read-all', {});
  }
}
