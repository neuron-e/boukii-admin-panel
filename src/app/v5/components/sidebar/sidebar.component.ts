import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationType } from '../../shared/components/notification-badge/notification-badge.component';

interface Notification {
  count: number;
  type: NotificationType;
}

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  route: string;
  enabled: boolean;
  notification?: Notification;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Output() navigate = new EventEmitter<void>();

  isCollapsed = false;

  menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: 'dashboard',
      label: 'Dashboard',
      route: '/v5',
      enabled: true,
      notification: { count: 1, type: 'warning' }
    },
    {
      key: 'reservas',
      icon: 'event_note',
      label: 'Reservas',
      route: '/v5/bookings',
      enabled: true,
      notification: { count: 11, type: 'info' }
    },
    {
      key: 'clients',
      icon: 'people',
      label: 'Clientes',
      route: '/v5/clients',
      enabled: true,
      notification: { count: 3, type: 'success' }
    },
    {
      key: 'planner',
      icon: 'calendar_today',
      label: 'Planificador',
      route: '/v5/planner',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'monitors',
      icon: 'supervisor_account',
      label: 'Monitores',
      route: '/v5/monitors',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'courses',
      icon: 'school',
      label: 'Cursos y Actividades',
      route: '/v5/courses',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'equipment',
      icon: 'inventory',
      label: 'Alquiler de Material',
      route: '/v5/equipment',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'bonos',
      icon: 'card_giftcard',
      label: 'Bonos y códigos',
      route: '/v5/bonuses',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'communication',
      icon: 'chat',
      label: 'Comunicación',
      route: '/v5/communications',
      enabled: true,
      notification: { count: 5, type: 'error' }
    },
    {
      key: 'pagos',
      icon: 'payment',
      label: 'Pagos',
      route: '/v5/payments',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'reportes',
      icon: 'assessment',
      label: 'Reportes',
      route: '/v5/reports',
      enabled: true,
      notification: { count: 1, type: 'success' }
    },
    {
      key: 'admins',
      icon: 'admin_panel_settings',
      label: 'Administradores',
      route: '/v5/admins',
      enabled: true,
      notification: { count: 2, type: 'warning' }
    },
    {
      key: 'analytics',
      icon: 'analytics',
      label: 'Analytics',
      route: '/v5/analytics',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'seasons',
      icon: 'schedule',
      label: 'Temporadas',
      route: '/v5/seasons',
      enabled: true,
      notification: { count: 0, type: 'info' }
    },
    {
      key: 'configuracion',
      icon: 'settings',
      label: 'Configuración', 
      route: '/v5/settings',
      enabled: true,
      notification: { count: 0, type: 'info' }
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) {
      this.isCollapsed = JSON.parse(savedState);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebarCollapsed', JSON.stringify(this.isCollapsed));
  }

  isActive(route: string): boolean {
    // Special case for dashboard - match both /v5 and /v5/dashboard (includes legacy /v5/welcome)
    if (route === '/v5') {
      return this.router.url === '/v5' || 
             this.router.url === '/v5/dashboard' ||
             this.router.url.startsWith('/v5/dashboard') ||
             this.router.url === '/v5/welcome' ||
             this.router.url.startsWith('/v5/welcome');
    }
    
    // Special case for seasons - ensure proper matching including subroutes
    if (route === '/v5/seasons') {
      return this.router.url === '/v5/seasons' ||
             this.router.url.startsWith('/v5/seasons/');
    }
    
    return this.router.url === route || 
           (route !== '/v5' && this.router.url.startsWith(route));
  }

  onNavigate(item: MenuItem): void {
    if (item.enabled) {
      this.navigate.emit();
    }
  }

  getNotificationTooltip(key: string, notification: Notification): string {
    const tooltips: Record<string, string> = {
      dashboard: `${notification.count} alertas críticas pendientes`,
      reservas: `${notification.count} nuevas reservas por confirmar`,
      clients: `${notification.count} nuevos clientes por revisar`,
      planner: `${notification.count} conflictos de horario urgentes`,
      monitors: `${notification.count} monitor(es) reportado(s) como ausente(s)`,
      courses: `${notification.count} curso(s) nuevo(s) por revisar`,
      equipment: `${notification.count} producto(s) con bajo stock o por revisar`,
      bonos: `${notification.count} bono(s) próximo(s) a vencer`,
      communication: `${notification.count} mensaje(s) fallido(s) o borrador(es)`,
      pagos: `${notification.count} pago(s) pendiente(s) o rechazado(s)`,
      reportes: `${notification.count} reporte(s) listo(s) para descargar`,
      admins: `${notification.count} solicitud(es) de acceso pendiente(s)`,
      analytics: `${notification.count} reporte(s) de analytics pendiente(s)`,
      configuracion: `${notification.count} actualización(es) pendiente(s)`
    };
    
    return tooltips[key] || `${notification.count} elemento(s) pendiente(s)`;
  }

  openSupport(): void {
    // Implement support functionality
    console.log('Opening support...');
    // Could open a modal, navigate to support page, or open external link
  }
}