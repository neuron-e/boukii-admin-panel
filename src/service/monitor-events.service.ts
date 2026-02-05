import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';

export interface MonitorEventPayload {
  monitor_id: number;
  type: string;
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class MonitorEventsService {
  private echo: Echo<any> | null = null;
  private channel: any = null;
  private currentMonitorId: number | null = null;
  private eventsSubject = new Subject<MonitorEventPayload>();

  public monitorEvents$ = this.eventsSubject.asObservable();

  connectForMonitor(monitorId: number): void {
    if (!monitorId) {
      console.warn('[MonitorEventsService] Missing monitorId, skipping Echo connection.');
      return;
    }

    if (this.currentMonitorId === monitorId && this.channel) {
      return;
    }

    if (!this.isEnabled()) {
      console.warn('[MonitorEventsService] Websocket config disabled or incomplete. Enable wsConfig.* in environment.');
      return;
    }

    this.disconnect();
    this.currentMonitorId = monitorId;
    this.echo = this.createEcho();
    this.channel = this.echo?.private(`monitor.${monitorId}`);

    if (!this.channel) {
      console.warn('[MonitorEventsService] Failed to subscribe to monitor channel.');
      return;
    }

    this.channel.listen('.monitor.assigned', (event: any) => {
      console.log('[MonitorEventsService] monitor.assigned', event);
      this.eventsSubject.next(event);
    });

    this.channel.listen('.monitor.removed', (event: any) => {
      console.log('[MonitorEventsService] monitor.removed', event);
      this.eventsSubject.next(event);
    });

    this.channel.error((error: any) => {
      console.error('[MonitorEventsService] Channel error', error);
    });
  }

  disconnect(): void {
    if (this.channel && this.currentMonitorId && this.echo) {
      this.echo.leave(`monitor.${this.currentMonitorId}`);
    }
    this.channel = null;
    this.echo = null;
    this.currentMonitorId = null;
  }

  extractMonitorId(user: any): number | null {
    if (!user) {
      return null;
    }

    if (user.monitor_id) {
      return Number(user.monitor_id);
    }

    if (user.monitors && user.monitors.length > 0 && user.monitors[0].id) {
      return Number(user.monitors[0].id);
    }

    // TODO: adjust mapping if monitor_id comes from another property
    return null;
  }

  private isEnabled(): boolean {
    const cfg = (environment as any).wsConfig || {};
    return cfg.key && cfg.wsHost && cfg.wsPort !== undefined && cfg.enabled !== false;
  }

  private createEcho(): Echo<any> {
    const cfg: any = (environment as any).wsConfig || {};
    const token = this.getAuthToken();

    // Explicitly set Pusher so Echo can find it
    (window as any).Pusher = Pusher;

    return new Echo({
      broadcaster: 'pusher',
      key: cfg.key,
      cluster: cfg.cluster,
      wsHost: cfg.wsHost || cfg.host || window.location.hostname,
      wsPort: cfg.wsPort || cfg.port || 6001,
      forceTLS: cfg.forceTLS ?? false,
      disableStats: cfg.disableStats ?? true,
      enabledTransports: cfg.enabledTransports || ['ws', 'wss'],
      encrypted: cfg.forceTLS ?? false,
      authEndpoint: `${(environment as any).baseUrl ?? ''}/broadcasting/auth`,
      auth: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });
  }

  private getAuthToken(): string | null {
    const raw = localStorage.getItem('boukiiUserToken');
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : parsed?.token ?? null;
    } catch (e) {
      return raw;
    }
  }
}
