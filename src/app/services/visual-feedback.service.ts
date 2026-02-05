import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * MEJORA CRÍTICA: Servicio centralizado para feedback visual mejorado
 *
 * Funcionalidades:
 * - Notificaciones contextuales con iconos y colores
 * - Estados de carga inteligentes por operación
 * - Feedback inmediato con animaciones suaves
 * - Gestión centralizada de estados UI
 * - Auto-ocultado inteligente basado en contexto
 */
@Injectable({
  providedIn: 'root'
})
export class VisualFeedbackService {
  // Estados de carga por operación
  private loadingStates = new Map<string, LoadingState>();
  private loadingSubject = new BehaviorSubject<Map<string, LoadingState>>(new Map());
  public loading$ = this.loadingSubject.asObservable();

  // Estados de UI globales
  private uiStateSubject = new BehaviorSubject<UIState>({
    isProcessing: false,
    currentOperation: null,
    hasErrors: false,
    hasWarnings: false
  });
  public uiState$ = this.uiStateSubject.asObservable();

  // Configuración de tipos de feedback
  private feedbackConfigs: Map<FeedbackType, FeedbackConfig> = new Map([
    ['success', {
      duration: 3000,
      icon: '✅',
      cssClass: 'feedback-success',
      panelClass: 'success-snackbar'
    }],
    ['error', {
      duration: 6000,
      icon: '❌',
      cssClass: 'feedback-error',
      panelClass: 'error-snackbar'
    }],
    ['warning', {
      duration: 4000,
      icon: '⚠️',
      cssClass: 'feedback-warning',
      panelClass: 'warning-snackbar'
    }],
    ['info', {
      duration: 3000,
      icon: 'ℹ️',
      cssClass: 'feedback-info',
      panelClass: 'info-snackbar'
    }],
    ['loading', {
      duration: 0, // Permanente hasta cancelar
      icon: '🔄',
      cssClass: 'feedback-loading',
      panelClass: 'loading-snackbar'
    }],
    ['capacity', {
      duration: 4000,
      icon: '👥',
      cssClass: 'feedback-capacity',
      panelClass: 'capacity-snackbar'
    }],
    ['booking', {
      duration: 3000,
      icon: '📅',
      cssClass: 'feedback-booking',
      panelClass: 'booking-snackbar'
    }]
  ]);

  constructor(private snackBar: MatSnackBar) {}

  /**
   * MÉTODO PRINCIPAL: Mostrar feedback contextual
   */
  show(
    message: string,
    type: FeedbackType = 'info',
    options: Partial<FeedbackOptions> = {}
  ): void {
    const config = this.feedbackConfigs.get(type);
    if (!config) {
      console.warn(`Tipo de feedback no configurado: ${type}`);
      return;
    }

    const finalMessage = options.showIcon !== false
      ? `${config.icon} ${message}`
      : message;

    const snackBarRef = this.snackBar.open(finalMessage, options.action || 'Cerrar', {
      duration: options.duration ?? config.duration,
      horizontalPosition: options.position?.horizontal || 'end',
      verticalPosition: options.position?.vertical || 'top',
      panelClass: [config.panelClass, ...(options.extraClasses || [])]
    });

    // Ejecutar callback de acción si existe
    if (options.onAction) {
      snackBarRef.onAction().subscribe(() => {
        options.onAction!();
      });
    }
  }

  /**
   * MÉTODOS DE CONVENIENCIA para tipos específicos
   */
  success(message: string, options: Partial<FeedbackOptions> = {}): void {
    this.show(message, 'success', options);
  }

  error(message: string, options: Partial<FeedbackOptions> = {}): void {
    this.show(message, 'error', {
      action: 'Reportar',
      onAction: () => console.warn('Error reportado:', message),
      ...options
    });
    this.updateUIState({ hasErrors: true });
  }

  warning(message: string, options: Partial<FeedbackOptions> = {}): void {
    this.show(message, 'warning', options);
    this.updateUIState({ hasWarnings: true });
  }

  info(message: string, options: Partial<FeedbackOptions> = {}): void {
    this.show(message, 'info', options);
  }

  /**
   * MEJORA CRÍTICA: Feedback específico para capacidad de cursos
   */
  capacityFeedback(availableSlots: number, neededSlots: number, courseName: string): void {
    if (availableSlots === 0) {
      this.show(
        `${courseName} está completo. No hay plazas disponibles.`,
        'error',
        {
          action: 'Ver alternativas',
          onAction: () => this.suggestAlternatives(courseName)
        }
      );
    } else if (availableSlots < neededSlots) {
      this.show(
        `Solo quedan ${availableSlots} plaza${availableSlots > 1 ? 's' : ''} en ${courseName}. Necesitas ${neededSlots}.`,
        'warning',
        {
          action: 'Ajustar',
          onAction: () => this.suggestCapacityAdjustment(availableSlots)
        }
      );
    } else {
      const percentage = (availableSlots / (availableSlots + neededSlots)) * 100;
      if (percentage < 25) {
        this.show(
          `¡Últimas plazas! Quedan ${availableSlots} en ${courseName}.`,
          'warning'
        );
      } else {
        this.show(
          `${availableSlots} plazas disponibles en ${courseName}.`,
          'capacity'
        );
      }
    }
  }

  /**
   * MEJORA CRÍTICA: Estados de carga por operación específica
   */
  setLoading(operationId: string, isLoading: boolean, message?: string): void {
    const currentStates = this.loadingStates;

    if (isLoading) {
      currentStates.set(operationId, {
        isLoading: true,
        message: message || 'Cargando...',
        startTime: Date.now()
      });

      // Mostrar feedback visual si es una operación larga
      if (message) {
        this.show(message, 'loading');
      }
    } else {
      const state = currentStates.get(operationId);
      if (state) {
        const duration = Date.now() - state.startTime;
        currentStates.delete(operationId);

        // Cerrar snackbar de loading si existe
        this.snackBar.dismiss();
      }
    }

    this.loadingStates = currentStates;
    this.loadingSubject.next(new Map(currentStates));

    // Actualizar estado global
    this.updateUIState({
      isProcessing: currentStates.size > 0,
      currentOperation: isLoading ? operationId : null
    });
  }

  /**
   * MEJORA CRÍTICA: Feedback para progreso de operaciones
   */
  showProgress(operationId: string, current: number, total: number, itemName: string = 'elementos'): void {
    const percentage = Math.round((current / total) * 100);
    const message = `Procesando ${itemName}... ${current}/${total} (${percentage}%)`;

    this.setLoading(operationId, true, message);

    if (current >= total) {
      setTimeout(() => {
        this.setLoading(operationId, false);
        this.success(`✅ ${total} ${itemName} procesados correctamente`);
      }, 500);
    }
  }

  /**
   * MEJORA CRÍTICA: Validación en tiempo real con feedback inmediato
   */
  validateField(fieldName: string, value: any, validationRules: ValidationRule[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    for (const rule of validationRules) {
      const validation = rule.validator(value);

      if (!validation.isValid) {
        result.isValid = false;
        if (rule.severity === 'error') {
          result.errors.push(validation.message);
        } else {
          result.warnings.push(validation.message);
        }
      }
    }

    // Mostrar feedback inmediato solo para errores críticos
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        this.show(`${fieldName}: ${error}`, 'error', {
          duration: 2000,
          showIcon: false
        });
      });
    }

    return result;
  }

  /**
   * MEJORA CRÍTICA: Feedback para operaciones en lote
   */
  batchOperationFeedback(results: BatchOperationResult[]): void {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (failed.length === 0) {
      this.success(`✅ ${successful.length} operaciones completadas exitosamente`);
    } else if (successful.length === 0) {
      this.error(`❌ ${failed.length} operaciones fallaron`, {
        action: 'Ver detalles',
        onAction: () => this.showBatchErrors(failed)
      });
    } else {
      this.warning(
        `⚠️ ${successful.length} exitosas, ${failed.length} fallidas`,
        {
          action: 'Ver detalles',
          onAction: () => this.showBatchErrors(failed)
        }
      );
    }
  }

  /**
   * Obtener estado de carga de operación específica
   */
  getLoadingState(operationId: string): LoadingState | null {
    return this.loadingStates.get(operationId) || null;
  }

  /**
   * Verificar si alguna operación está en progreso
   */
  isAnyOperationLoading(): boolean {
    return this.loadingStates.size > 0;
  }

  /**
   * Limpiar todos los estados de carga
   */
  clearAllLoading(): void {
    this.loadingStates.clear();
    this.loadingSubject.next(new Map());
    this.updateUIState({
      isProcessing: false,
      currentOperation: null
    });
    this.snackBar.dismiss();
  }

  // Métodos privados

  private updateUIState(updates: Partial<UIState>): void {
    const currentState = this.uiStateSubject.value;
    this.uiStateSubject.next({ ...currentState, ...updates });
  }

  private suggestAlternatives(courseName: string): void {
    this.info(
      `Buscando cursos similares a "${courseName}"...`,
      { duration: 2000 }
    );
    // Aquí iría la lógica para sugerir alternativas
  }

  private suggestCapacityAdjustment(availableSlots: number): void {
    this.info(
      `Considera reducir a ${availableSlots} participante${availableSlots > 1 ? 's' : ''} para esta reserva`,
      { duration: 3000 }
    );
  }

  private showBatchErrors(errors: BatchOperationResult[]): void {
    const errorMessages = errors
      .map(e => `• ${e.itemName}: ${e.error}`)
      .join('\n');

    console.group('🚨 Errores en operación en lote:');
    console.groupEnd();

    this.error('Revisa la consola para ver los detalles de los errores');
  }
}

// Interfaces y tipos

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'capacity' | 'booking';

interface FeedbackConfig {
  duration: number;
  icon: string;
  cssClass: string;
  panelClass: string;
}

interface FeedbackOptions {
  duration: number;
  action: string;
  onAction: () => void;
  position: {
    horizontal: 'start' | 'center' | 'end' | 'left' | 'right';
    vertical: 'top' | 'bottom';
  };
  extraClasses: string[];
  showIcon: boolean;
}

interface LoadingState {
  isLoading: boolean;
  message: string;
  startTime: number;
}

interface UIState {
  isProcessing: boolean;
  currentOperation: string | null;
  hasErrors: boolean;
  hasWarnings: boolean;
}

interface ValidationRule {
  name: string;
  validator: (value: any) => { isValid: boolean; message: string };
  severity: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface BatchOperationResult {
  success: boolean;
  itemName: string;
  error?: string;
}