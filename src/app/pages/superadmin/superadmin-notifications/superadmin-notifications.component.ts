import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SuperadminService } from 'src/app/services/superadmin.service';
import { AngularEditorConfig } from '@kolkov/angular-editor';

type NotificationGroup = {
  id: string;
  title: string;
  body: string;
  recipient_type: string;
  priority: string;
  created_at: string | null;
  sent_at: string | null;
  scheduled_at: string | null;
  total: number;
  read: number;
  schoolIds: number[];
  monitorIds: number[];
  recipientNames: string[];
  schoolNames: string[];
  allSchools: boolean;
  allMonitors: boolean;
  recipientLabel: string;
  schoolLabel: string;
};

@Component({
  selector: 'app-superadmin-notifications',
  templateUrl: './superadmin-notifications.component.html',
  styleUrls: ['./superadmin-notifications.component.scss']
})
export class SuperadminNotificationsComponent implements OnInit {
  loading = false;
  saving = false;
  notifications: any[] = [];
  groupedNotifications: NotificationGroup[] = [];
  schools: any[] = [];
  monitors: any[] = [];
  stats: any = { total_sent: 0, dashboard_sent: 0, app_sent: 0, read_rate: 0 };
  currentPage = 1;
  lastPage = 1;
  perPage = 10;
  totalItems = 0;
  private schoolNameMap = new Map<number, string>();
  private monitorNameMap = new Map<number, string>();
  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    minHeight: '320px',
    height: '320px',
    maxHeight: '480px',
    translate: 'no'
  };

  form = this.fb.group({
    sendToSchools: [true],
    sendToMonitors: [false],
    title: ['', [Validators.required, Validators.maxLength(150)]],
    body: [''],
    priority: ['medium', Validators.required],
    audienceSchoolsAll: [true],
    audienceMonitorsAll: [true],
    school_ids: [[]],
    monitor_ids: [[]],
    scheduleEnabled: [false],
    schedule_at: [''],
    send_push: [true],
  });

  constructor(
    private superadminService: SuperadminService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadNotifications();
    this.loadSchools();
    this.loadMonitors();
  }

  loadNotifications() {
    this.loading = true;
    this.superadminService.listNotifications({ perPage: this.perPage, page: this.currentPage }).subscribe({
      next: (response: any) => {
        this.notifications = response?.data || [];
        this.totalItems = response?.total ?? this.totalItems;
        this.currentPage = response?.current_page ?? this.currentPage;
        this.lastPage = response?.last_page ?? this.lastPage;
        this.groupedNotifications = this.groupNotifications(this.notifications);
        this.updateRecipientLabels();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadStats() {
    this.superadminService.getNotificationStats().subscribe({
      next: (response: any) => {
        this.stats = response?.data ?? this.stats;
      }
    });
  }

  loadSchools() {
    this.superadminService.listSchools({ perPage: 200 }).subscribe({
      next: (response: any) => {
        this.schools = response?.data || [];
        this.schoolNameMap = new Map(this.schools.map((s: any) => [Number(s.id), s.name]));
        this.updateRecipientLabels();
      }
    });
  }

  loadMonitors() {
    this.superadminService.listMonitors({ perPage: 200 }).subscribe({
      next: (response: any) => {
        this.monitors = response?.data || [];
        this.monitorNameMap = new Map(this.monitors.map((m: any) => [Number(m.id), `${m.first_name} ${m.last_name}`.trim()]));
        this.updateRecipientLabels();
      }
    });
  }

  private groupNotifications(items: any[]): NotificationGroup[] {
    const grouped = new Map<string, NotificationGroup>();

    items.forEach((item) => {
      const payload = item?.payload || {};
      const batchId = payload?.batch_id || `single-${item?.id}`;
      const key = String(batchId);
      const existing = grouped.get(key);
      const createdAt = item?.created_at || null;
      const sentAt = item?.sent_at || null;
      const scheduledAt = item?.scheduled_at || null;
      const read = item?.read_at ? 1 : 0;
      const recipientType = item?.recipient_type || payload?.recipient_type || '';
      const allSchools = !!payload?.all_schools;
      const allMonitors = !!payload?.all_monitors;
      const schoolIds = item?.recipient_type === 'school' ? [Number(item?.recipient_id)] : [];
      const monitorIds = item?.recipient_type === 'monitor' ? [Number(item?.recipient_id)] : [];
      const recipientName = payload?.recipient_name ? String(payload.recipient_name) : '';
      const schoolName = payload?.school_name ? String(payload.school_name) : '';

      if (!existing) {
        grouped.set(key, {
          id: key,
          title: item?.title || '',
          body: item?.body || '',
          recipient_type: recipientType,
          priority: payload?.priority || 'medium',
          created_at: createdAt,
          sent_at: sentAt,
          scheduled_at: scheduledAt,
          total: 1,
          read,
          schoolIds,
          monitorIds,
          recipientNames: recipientName ? [recipientName] : [],
          schoolNames: schoolName ? [schoolName] : [],
          allSchools,
          allMonitors,
          recipientLabel: '',
          schoolLabel: '',
        });
        return;
      }

      existing.total += 1;
      existing.read += read;
      existing.allSchools = existing.allSchools || allSchools;
      existing.allMonitors = existing.allMonitors || allMonitors;
      if (schoolIds.length) {
        existing.schoolIds.push(...schoolIds);
      }
      if (monitorIds.length) {
        existing.monitorIds.push(...monitorIds);
      }
      if (recipientName) {
        existing.recipientNames.push(recipientName);
      }
      if (schoolName) {
        existing.schoolNames.push(schoolName);
      }
      if (!existing.created_at && createdAt) {
        existing.created_at = createdAt;
      }
      if (!existing.sent_at && sentAt) {
        existing.sent_at = sentAt;
      }
      if (!existing.scheduled_at && scheduledAt) {
        existing.scheduled_at = scheduledAt;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }

  private updateRecipientLabels() {
    this.groupedNotifications = this.groupedNotifications.map((group) => ({
      ...group,
      recipientLabel: this.buildRecipientLabel(group),
      schoolLabel: this.buildSchoolLabel(group)
    }));
  }

  private buildRecipientLabel(group: NotificationGroup): string {
    if (group.allSchools && group.allMonitors) {
      return 'All schools + all monitors';
    }
    if (group.allSchools) {
      return 'All schools';
    }
    if (group.allMonitors) {
      return 'All monitors';
    }

    if (group.schoolIds.length) {
      const unique = Array.from(new Set(group.schoolIds));
      const names = unique.map((id) => this.schoolNameMap.get(id) || `School #${id}`).filter(Boolean);
      if (names.length <= 3) {
        return names.join(', ');
      }
      return `${names.length} schools`;
    }

    if (group.monitorIds.length) {
      const unique = Array.from(new Set(group.monitorIds));
      const fromPayload = Array.from(new Set(group.recipientNames)).filter(Boolean);
      const names = fromPayload.length
        ? fromPayload
        : unique.map((id) => this.monitorNameMap.get(id) || `Monitor #${id}`).filter(Boolean);
      if (names.length <= 3) {
        return names.join(', ');
      }
      return `${names.length} monitors`;
    }

    return '-';
  }

  private buildSchoolLabel(group: NotificationGroup): string {
    if (group.recipient_type !== 'monitor') {
      return '';
    }
    const names = Array.from(new Set(group.schoolNames)).filter(Boolean);
    if (!names.length) {
      return '';
    }
    if (names.length <= 2) {
      return names.join(', ');
    }
    return `${names.length} schools`;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.lastPage || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadNotifications();
  }

  sendNotification() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.value;
    const sendToSchools = !!values.sendToSchools;
    const sendToMonitors = !!values.sendToMonitors;

    if (!sendToSchools && !sendToMonitors) {
      return;
    }

    const recipientType = sendToSchools && sendToMonitors ? 'both' : (sendToSchools ? 'schools' : 'monitors');
    const scheduleAt = values.scheduleEnabled ? values.schedule_at : null;

    const payload: any = {
      title: values.title,
      body: values.body,
      priority: values.priority,
      recipient_type: recipientType,
      all_schools: !!values.audienceSchoolsAll,
      all_monitors: !!values.audienceMonitorsAll,
      school_ids: values.school_ids || [],
      monitor_ids: values.monitor_ids || [],
      schedule_at: scheduleAt || null,
      send_push: values.send_push,
    };

    this.saving = true;
    this.superadminService.createNotification(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loadNotifications();
        this.loadStats();
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
