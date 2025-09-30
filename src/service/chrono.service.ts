import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, interval, fromEvent } from 'rxjs';
import { map, retry, catchError, takeUntil, startWith, switchMap } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface TimingSummary {
  course_id: number;
  course_date_id: number;
  students: TimingStudent[];
  ranking: RankingEntry[];
}

export interface TimingStudent {
  booking_user_id: number;
  name: string;
  bib?: string;
  last_time_ms?: number;
  best_time_ms?: number;
  laps: number;
  status: string;
  times: TimingTime[];
}

export interface TimingTime {
  id: number;
  lap_no: number;
  time_ms: number;
  status: string;
  created_at: string;
}

export interface RankingEntry {
  booking_user_id: number;
  name: string;
  best_time_ms: number;
}

export interface TimingEvent {
  type: 'timing' | 'ping';
  data: any;
}

export interface ChronoState {
  summary: TimingSummary | null;
  lastEvent: TimingTime | null;
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class ChronoService {
  private apiUrl = environment.baseUrl + '/api';
  
  // Estados
  private stateSubject = new BehaviorSubject<ChronoState>({
    summary: null,
    lastEvent: null,
    isConnected: false,
    isReconnecting: false,
    error: null,
    lastUpdate: null
  });
  
  // Control de conexiones
  private eventSource: EventSource | null = null;
  private pollingSubscription: any = null;
  private destroySubject = new Subject<void>();
  
  // Configuración
  private pollingInterval = 3000; // 3 segundos
  private reconnectDelay = 2000; // 2 segundos
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  
  constructor(private http: HttpClient) {}
  
  /**
   * Observable del estado del cronómetro
   */
  get state$(): Observable<ChronoState> {
    return this.stateSubject.asObservable();
  }
  
  /**
   * Conecta al stream de eventos para un curso/fecha específico
   */
  connectToTiming(courseId: number, courseDateId: number): Observable<ChronoState> {
    this.disconnect(); // Limpiar conexiones previas
    
    // Obtener summary inicial
    this.getSummary(courseId, courseDateId).subscribe({
      next: (summary) => {
        this.updateState({ 
          summary, 
          lastUpdate: new Date(),
          error: null 
        });
        
        // Intentar conectar SSE, con fallback a polling
        this.connectSSE(courseId, courseDateId);
      },
      error: (error) => {
        console.error('Error obteniendo summary inicial:', error);
        this.updateState({ 
          error: 'Error cargando datos iniciales',
          isConnected: false 
        });
      }
    });
    
    return this.state$;
  }
  
  /**
   * Obtiene el resumen inicial del cronometraje
   */
  private getSummary(courseId: number, courseDateId: number): Observable<TimingSummary> {
    const params = new HttpParams()
      .set('course_id', courseId.toString())
      .set('course_date_id', courseDateId.toString());
    
    return this.http.get<TimingSummary>(`${this.apiUrl}/admin/timing/summary`, { params });
  }
  
  /**
   * Conecta via Server-Sent Events
   */
  private connectSSE(courseId: number, courseDateId: number): void {
    const sseUrl = `${this.apiUrl}/admin/timing/stream?course_id=${courseId}&course_date_id=${courseDateId}`;
    
    try {
      this.eventSource = new EventSource(sseUrl, {
        withCredentials: true
      });
      
      this.eventSource.onopen = () => {
        // SSE conectado
        this.reconnectAttempts = 0;
        this.updateState({ 
          isConnected: true, 
          isReconnecting: false,
          error: null 
        });
      };
      
      this.eventSource.addEventListener('timing', (event) => {
        try {
          const timingData = JSON.parse(event.data);
          this.processTimingEvent(timingData);
        } catch (error) {
          console.error('Error parsing timing event:', error);
        }
      });
      
      this.eventSource.addEventListener('ping', (event) => {
        console.debug('SSE ping received');
      });
      
      this.eventSource.onerror = (error) => {
        console.warn('SSE error:', error);
        this.updateState({ isConnected: false });
        
        // Intentar reconectar o cambiar a polling
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.updateState({ isReconnecting: true });
          
          setTimeout(() => {
            this.connectSSE(courseId, courseDateId);
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
        } else {
          // Max SSE reconnect attempts reached, falling back to polling
          this.fallbackToPolling(courseId, courseDateId);
        }
      };
      
    } catch (error) {
      console.error('Error creating EventSource:', error);
      this.fallbackToPolling(courseId, courseDateId);
    }
  }
  
  /**
   * Fallback a polling cuando SSE no está disponible
   */
  private fallbackToPolling(courseId: number, courseDateId: number): void {
    console.log('🔄 Cambiando a modo polling');
    
    this.updateState({ 
      isConnected: false, 
      isReconnecting: false,
      error: 'Modo polling activo (SSE no disponible)'
    });
    
    this.pollingSubscription = interval(this.pollingInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.getSummary(courseId, courseDateId)),
        takeUntil(this.destroySubject),
        catchError((error) => {
          console.error('Error en polling:', error);
          this.updateState({ error: 'Error en polling' });
          return [];
        })
      )
      .subscribe({
        next: (summary) => {
          this.updateState({ 
            summary,
            lastUpdate: new Date(),
            isConnected: true,
            error: 'Modo polling activo'
          });
        }
      });
  }
  
  /**
   * Procesa un evento de timing recibido via SSE
   */
  private processTimingEvent(eventData: any): void {
    const currentState = this.stateSubject.value;
    
    if (!currentState.summary) return;
    
    // Clonar el summary actual
    const updatedSummary = { ...currentState.summary };
    
    // Encontrar el estudiante
    const studentIndex = updatedSummary.students.findIndex(
      s => s.booking_user_id === eventData.booking_user_id
    );
    
    if (studentIndex === -1) return;
    
    // Actualizar el estudiante
    const student = { ...updatedSummary.students[studentIndex] };
    
    // Agregar o actualizar el tiempo
    const existingTimeIndex = student.times.findIndex(
      t => t.lap_no === eventData.lap_no
    );
    
    const newTime: TimingTime = {
      id: eventData.id,
      lap_no: eventData.lap_no,
      time_ms: eventData.time_ms,
      status: eventData.status,
      created_at: new Date().toISOString()
    };
    
    if (existingTimeIndex >= 0) {
      student.times[existingTimeIndex] = newTime;
    } else {
      student.times.push(newTime);
    }
    
    // Recalcular estadísticas del estudiante
    student.laps = student.times.length;
    student.last_time_ms = eventData.time_ms;
    
    const validTimes = student.times
      .filter(t => t.status === 'valid' && t.time_ms > 0)
      .map(t => t.time_ms);
      
    student.best_time_ms = validTimes.length > 0 ? Math.min(...validTimes) : undefined;
    student.status = eventData.status;
    
    // Actualizar en el array
    updatedSummary.students[studentIndex] = student;
    
    // Recalcular ranking
    updatedSummary.ranking = updatedSummary.students
      .filter(s => s.best_time_ms && s.best_time_ms > 0)
      .map(s => ({
        booking_user_id: s.booking_user_id,
        name: s.name,
        best_time_ms: s.best_time_ms!
      }))
      .sort((a, b) => a.best_time_ms - b.best_time_ms);
    
    // Actualizar estado
    this.updateState({
      summary: updatedSummary,
      lastEvent: newTime,
      lastUpdate: new Date()
    });
    
    console.log('✓ Evento procesado:', {
      student: student.name,
      lap: newTime.lap_no,
      time: this.formatTime(newTime.time_ms),
      status: newTime.status
    });
  }
  
  /**
   * Desconecta de todos los streams
   */
  disconnect(): void {
    // Cerrar SSE
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Detener polling
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    
    // Reset estado
    this.updateState({
      isConnected: false,
      isReconnecting: false,
      error: null
    });
    
    this.destroySubject.next();
  }
  
  /**
   * Actualiza el estado interno
   */
  private updateState(partial: Partial<ChronoState>): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...partial };
    this.stateSubject.next(newState);
  }
  
  /**
   * Formatea tiempo en milisegundos a string legible
   */
  formatTime(ms: number | null | undefined): string {
    if (!ms || ms <= 0) return '--:--';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    } else {
      return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
    }
  }
  
  /**
   * Obtiene el estado actual
   */
  getCurrentState(): ChronoState {
    return this.stateSubject.value;
  }
  
  /**
   * Limpiar recursos al destruir el servicio
   */
  ngOnDestroy(): void {
    this.disconnect();
    this.destroySubject.complete();
  }
}