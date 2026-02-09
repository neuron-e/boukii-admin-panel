import { Component, OnInit } from '@angular/core';
import { AdminNotificationService } from '../../services/admin-notification.service';

@Component({
  selector: 'vex-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  filtered: any[] = [];
  selected: any = null;
  loading = false;
  unreadOnly = false;
  search = '';

  constructor(private notificationsService: AdminNotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;
    this.notificationsService.list({ perPage: 100 }).subscribe({
      next: (response: any) => {
        this.notifications = response?.data || [];
        this.applyFilters();
        this.loading = false;
        this.notificationsService.refreshUnreadCount();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters() {
    const term = this.search.trim().toLowerCase();
    this.filtered = this.notifications.filter((item) => {
      if (this.unreadOnly && item.read_at) {
        return false;
      }
      if (!term) {
        return true;
      }
      return String(item.title || '').toLowerCase().includes(term)
        || String(item.body || '').toLowerCase().includes(term);
    });
    if (this.selected && !this.filtered.find((n) => n.id === this.selected.id)) {
      this.selected = null;
    }
  }

  toggleUnread() {
    this.unreadOnly = !this.unreadOnly;
    this.applyFilters();
  }

  selectNotification(item: any) {
    this.selected = item;
    if (item?.id && !item.read_at) {
      this.notificationsService.markRead(item.id).subscribe({
        next: () => {
          item.read_at = new Date().toISOString();
          this.notificationsService.refreshUnreadCount();
        }
      });
    }
  }

  markAllRead() {
    this.notificationsService.markAllRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) => ({ ...item, read_at: new Date().toISOString() }));
        this.applyFilters();
        this.notificationsService.refreshUnreadCount();
      }
    });
  }

  getBodyHtml(item: any): string {
    return item?.payload?.body_html || item?.body || '';
  }
}
