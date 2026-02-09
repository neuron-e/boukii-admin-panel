import { Component, OnInit } from '@angular/core';
import { DateTime } from 'luxon';
import { trackById } from '../../../../utils/track-by';
import { AdminNotificationService } from '../../../../../app/services/admin-notification.service';

@Component({
  selector: 'vex-toolbar-notifications-dropdown',
  templateUrl: './toolbar-notifications-dropdown.component.html',
  styleUrls: ['./toolbar-notifications-dropdown.component.scss']
})
export class ToolbarNotificationsDropdownComponent implements OnInit {

  notifications: any[] = [];
  loading = false;

  trackById = trackById;

  constructor(public notificationsService: AdminNotificationService) { }

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;
    this.notificationsService.list({ perPage: 10 }).subscribe({
      next: (response: any) => {
        this.notifications = response?.data || [];
        this.loading = false;
        this.notificationsService.refreshUnreadCount();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  markRead(notification: any) {
    if (!notification?.id || notification?.read_at) {
      return;
    }

    this.notificationsService.markRead(notification.id).subscribe({
      next: () => {
        notification.read_at = new Date().toISOString();
        this.notificationsService.refreshUnreadCount();
      }
    });
  }

  markAllRead() {
    this.notificationsService.markAllRead().subscribe({
      next: () => {
        this.loadNotifications();
      }
    });
  }

  formatDate(value: any) {
    if (!value) {
      return '';
    }
    return DateTime.fromISO(value).toFormat('dd/MM/yyyy HH:mm');
  }

  getTitle(notification: any) {
    return notification?.title || 'Notification';
  }

  getBody(notification: any) {
    return notification?.body || '';
  }
}
