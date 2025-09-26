export interface CriticalAlerts {
  reservasHuerfanas: number;        // Reservas que requieren atención
  cursosSinMonitor: number;         // Privados sin monitor asignado
  pagosPendientes: number;          // Bookings paid: false
  conflictosHorarios: number;       // Overlapping bookings
  capacidadCritica: number;         // Cursos >90% ocupación
}

export interface RevenueMetrics {
  ingresosHoy: number;
  ingresosSemana: number;
  ingresosMes: number;
  tendencia: 'up' | 'down' | 'stable';
  comparacionPeriodoAnterior: number; // % change
  moneda: string;
}

export interface OccupancyData {
  cursosPrivados: {
    ocupados: number;
    disponibles: number;
    porcentaje: number;
  };
  cursosColectivos: {
    ocupados: number;
    disponibles: number;
    porcentaje: number;
  };
  total: {
    ocupados: number;
    disponibles: number;
    porcentaje: number;
  };
}

export interface BookingActivity {
  id: number;
  clientName: string;
  courseName: string;
  time: string;
  type: 'private' | 'collective';
  status: 'confirmed' | 'pending' | 'warning';
  monitor?: string;
}

export interface UpcomingActivities {
  proximasHoras: BookingActivity[];     // Próximas 4 horas
  alertasCapacidad: Course[];           // Cursos cerca del límite
  monitorPendiente: BookingActivity[];  // Necesitan monitor urgente
}

export interface Course {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  percentage: number;
  time: string;
}

export interface TrendData {
  reservasUltimos30Dias: number[];
  fechas: string[];
  comparacionPeriodoAnterior: {
    reservas: number;
    ingresos: number;
  };
}

export interface QuickStats {
  reservasHoy: number;
  ingresosHoy: number;
  ocupacionActual: number;
  alertasCriticas: number;
}

export interface DashboardMetrics {
  alertas: CriticalAlerts;
  revenue: RevenueMetrics;
  ocupacion: OccupancyData;
  proximasActividades: UpcomingActivities;
  tendencias: TrendData;
  quickStats: QuickStats;
  lastUpdated: string;
}

export interface NotificationItem {
  id: number;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}