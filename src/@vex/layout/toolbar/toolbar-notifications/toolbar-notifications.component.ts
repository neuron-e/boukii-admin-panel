import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PopoverService } from '../../../components/popover/popover.service';
import { ToolbarNotificationsDropdownComponent } from './toolbar-notifications-dropdown/toolbar-notifications-dropdown.component';
import { AdminNotificationService } from '../../../../app/services/admin-notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'vex-toolbar-notifications',
  templateUrl: './toolbar-notifications.component.html',
  styleUrls: ['./toolbar-notifications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarNotificationsComponent implements OnInit, OnDestroy {

  @ViewChild('originRef', { static: true, read: ElementRef }) originRef: ElementRef;

  dropdownOpen: boolean;
  unreadCount = 0;
  private destroyed$ = new Subject<void>();

  constructor(
    private popover: PopoverService,
    private cd: ChangeDetectorRef,
    private notifications: AdminNotificationService
  ) {}

  ngOnInit() {
    const raw = localStorage.getItem('boukiiUser');
    const user = raw ? JSON.parse(raw) : null;
    if (user?.type === 'superadmin' || user?.type === 4) {
      return;
    }

    this.notifications.unreadCount$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((count) => {
        this.unreadCount = count ?? 0;
        this.cd.markForCheck();
      });

    this.notifications.refreshUnreadCount();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  showPopover() {
    this.dropdownOpen = true;
    this.cd.markForCheck();

    const popoverRef = this.popover.open({
      content: ToolbarNotificationsDropdownComponent,
      origin: this.originRef,
      offsetY: 12,
      position: [
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom'
        },
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top',
        },
      ]
    });

    popoverRef.afterClosed$.subscribe(() => {
      this.dropdownOpen = false;
      this.cd.markForCheck();
    });
  }
}
