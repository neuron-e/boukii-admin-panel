import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChronoService, ChronoState, TimingStudent, RankingEntry, TimingTime } from 'src/service/chrono.service';

@Component({
  selector: 'vex-chrono',
  templateUrl: './chrono.component.html',
  styleUrls: ['./chrono.component.scss']
})
export class ChronoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estado del cronometraje
  state: ChronoState | null = null;
  
  // Parámetros de la URL
  courseId: number | null = null;
  courseDateId: number | null = null;
  courseName: string = '';
  courseDate: string = '';
  
  // UI State
  isFullscreen = false;
  showLastEventHighlight = false;
  lastHighlightedStudent: number | null = null;
  currentTime = new Date();
  
  // Configuración de la pantalla
  displayConfig = {
    showBib: true,
    showLaps: true,
    showLastTime: true,
    autoHideControls: false,
    highlightDuration: 3000 // ms
  };
  
  constructor(
    private route: ActivatedRoute,
    public chronoService: ChronoService
  ) {}
  
  ngOnInit(): void {
    // Reloj en tiempo real
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
      });
    
    // Obtener parámetros de la ruta
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.courseId = +params['courseId'];
      this.courseDateId = +params['courseDateId'];
      
      if (this.courseId && this.courseDateId) {
        this.connectToTiming();
      }
    });
    
    // Obtener información adicional de query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.courseName = params['courseName'] || 'Curso';
      this.courseDate = params['courseDate'] || '';
      this.displayConfig.showBib = params['showBib'] !== 'false';
      this.displayConfig.showLaps = params['showLaps'] !== 'false';
      this.displayConfig.showLastTime = params['showLastTime'] !== 'false';
      this.displayConfig.autoHideControls = params['autoHideControls'] === 'true';
    });
    
    // Detectar modo pantalla completa
    this.checkFullscreenStatus();
  }
  
  ngOnDestroy(): void {
    this.chronoService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Conecta al servicio de cronometraje
   */
  private connectToTiming(): void {
    if (!this.courseId || !this.courseDateId) return;
    
    this.chronoService.connectToTiming(this.courseId, this.courseDateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          const previousState = this.state;
          this.state = state;
          
          // Detectar nuevos eventos para highlighting
          if (state.lastEvent && state.lastEvent !== previousState?.lastEvent) {
            this.highlightLastEvent(state.lastEvent);
          }
        },
        error: (error) => {
          console.error('Error en el cronometraje:', error);
        }
      });
  }
  
  /**
   * Resalta el último evento recibido
   */
  private highlightLastEvent(event: TimingTime): void {
    // Encontrar el estudiante del evento
    const student = this.state?.summary?.students.find(
      s => s.times.some(t => t.id === event.id)
    );
    
    if (student) {
      this.lastHighlightedStudent = student.booking_user_id;
      this.showLastEventHighlight = true;
      
      // Quitar highlight después del tiempo configurado
      setTimeout(() => {
        this.showLastEventHighlight = false;
        this.lastHighlightedStudent = null;
      }, this.displayConfig.highlightDuration);
    }
  }
  
  /**
   * Obtiene el estado de conexión para mostrar en UI
   */
  getConnectionStatus(): { icon: string; text: string; class: string } {
    if (!this.state) {
      return { icon: 'sync', text: 'chrono.initializing', class: 'status-loading' };
    }
    
    if (this.state.isReconnecting) {
      return { icon: 'sync', text: 'chrono.reconnecting', class: 'status-reconnecting' };
    }
    
    if (this.state.isConnected) {
      return { icon: 'circle', text: 'chrono.connected', class: 'status-connected' };
    }
    
    return { icon: 'warning', text: 'chrono.disconnected', class: 'status-disconnected' };
  }
  
  /**
   * Obtiene el último tiempo del estudiante
   */
  getStudentLastTime(student: TimingStudent): string {
    if (!student.last_time_ms) return '--';
    return this.chronoService.formatTime(student.last_time_ms);
  }
  
  /**
   * Obtiene el mejor tiempo del estudiante
   */
  getStudentBestTime(student: TimingStudent): string {
    if (!student.best_time_ms) return '--';
    return this.chronoService.formatTime(student.best_time_ms);
  }
  
  /**
   * Obtiene el tiempo del último evento global
   */
  getLastEventTime(): string {
    if (!this.state?.lastEvent) return '--';
    return this.chronoService.formatTime(this.state.lastEvent.time_ms);
  }
  
  /**
   * Obtiene el nombre del estudiante del último evento
   */
  getLastEventStudent(): string {
    if (!this.state?.lastEvent) return '--';
    
    const student = this.state.summary?.students.find(
      s => s.times.some(t => t.id === this.state!.lastEvent!.id)
    );
    
    return student?.name || '--';
  }
  
  /**
   * Verifica si un estudiante debe estar resaltado
   */
  isStudentHighlighted(student: TimingStudent): boolean {
    return this.showLastEventHighlight && 
           student.booking_user_id === this.lastHighlightedStudent;
  }
  
  /**
   * Obtiene la clase CSS para el estado del estudiante
   */
  getStudentStatusClass(student: TimingStudent): string {
    if (this.isStudentHighlighted(student)) {
      return 'student-highlighted';
    }
    
    switch (student.status) {
      case 'valid':
        return 'student-valid';
      case 'invalid':
        return 'student-invalid';
      case 'dns':
        return 'student-dns';
      case 'dnf':
        return 'student-dnf';
      default:
        return 'student-pending';
    }
  }
  
  /**
   * Obtiene la clase CSS para el estado de un tiempo individual
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'valid':
        return 'status-valid';
      case 'invalid':
        return 'status-invalid';
      case 'dns':
        return 'status-dns';
      case 'dnf':
        return 'status-dnf';
      default:
        return 'status-valid';
    }
  }
  
  /**
   * Obtiene el texto del estado del estudiante
   */
  getStudentStatusText(student: TimingStudent): string {
    switch (student.status) {
      case 'valid':
        return '';
      case 'invalid':
        return 'chrono.status.invalid';
      case 'dns':
        return 'chrono.status.dns';
      case 'dnf':
        return 'chrono.status.dnf';
      default:
        return '';
    }
  }
  
  /**
   * Alterna modo pantalla completa
   */
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
      }).catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  }
  
  /**
   * Detecta cambios en el modo pantalla completa
   */
  @HostListener('document:fullscreenchange', [])
  private checkFullscreenStatus(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }
  
  /**
   * Maneja teclas de acceso rápido
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'f':
      case 'F11':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 'Escape':
        if (this.isFullscreen) {
          event.preventDefault();
          this.toggleFullscreen();
        }
        break;
    }
  }
  
  /**
   * Fuerza la reconexión
   */
  forceReconnect(): void {
    if (this.courseId && this.courseDateId) {
      this.chronoService.disconnect();
      this.connectToTiming();
    }
  }
  
  /**
   * Obtiene estadísticas del ranking
   */
  getRankingStats(): { total: number; withTimes: number } {
    if (!this.state?.summary?.students) {
      return { total: 0, withTimes: 0 };
    }
    
    const total = this.state.summary.students.length;
    const withTimes = this.state.summary.ranking.length;
    
    return { total, withTimes };
  }
  
  /**
   * Trackby function para optimizar ngFor
   */
  trackByStudentId(index: number, student: TimingStudent): number {
    return student.booking_user_id;
  }
  
  trackByRankingId(index: number, entry: RankingEntry): number {
    return entry.booking_user_id;
  }

  /**
   * Get status text by status string only
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'valid':
        return '';
      case 'invalid':
        return 'chrono.status.invalid';
      case 'dns':
        return 'chrono.status.dns';
      case 'dnf':
        return 'chrono.status.dnf';
      default:
        return '';
    }
  }
}