import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * MEJORA CRÍTICA: Servicio de persistencia de estado para reservas
 *
 * Funcionalidades:
 * - Autoguardado en localStorage
 * - Recuperación automática de sesiones
 * - Sincronización entre tabs del navegador
 * - Limpieza automática de datos obsoletos
 */
@Injectable({
  providedIn: 'root'
})
export class BookingPersistenceService {
  private readonly STORAGE_KEY_PREFIX = 'boukii_booking_draft_';
  private readonly EXPIRY_HOURS = 24; // Expirar borradores después de 24 horas
  private readonly SYNC_EVENT = 'boukii_booking_sync';

  // Observable para sincronización entre tabs
  private syncSubject = new BehaviorSubject<any>(null);
  public syncUpdate$ = this.syncSubject.asObservable();

  constructor() {
    // Configurar listener para sincronización entre tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));

    // Limpieza automática al inicializar
    this.cleanExpiredDrafts();
  }

  /**
   * Guardar estado actual del formulario de reserva
   */
  saveDraft(bookingId: string, formData: any, metadata?: any): void {
    const draft = {
      data: formData,
      metadata: metadata || {},
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      version: '2.0'
    };

    const key = this.getStorageKey(bookingId);

    try {
      localStorage.setItem(key, JSON.stringify(draft));

      // Notificar a otras tabs sobre el cambio
      this.broadcastSync({
        action: 'draft_saved',
        bookingId,
        timestamp: draft.timestamp
      });

      console.log('📝 Borrador guardado:', bookingId);
    } catch (error) {
      console.warn('Error al guardar borrador:', error);
      this.handleStorageError(error);
    }
  }

  /**
   * Recuperar estado guardado del formulario
   */
  loadDraft(bookingId: string): any | null {
    const key = this.getStorageKey(bookingId);

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft = JSON.parse(stored);

      // Verificar si el borrador ha expirado
      if (this.isDraftExpired(draft)) {
        this.removeDraft(bookingId);
        return null;
      }

      // Verificar si pertenece al usuario actual
      if (draft.userId !== this.getCurrentUserId()) {
        console.warn('Borrador pertenece a otro usuario');
        return null;
      }

      console.log('📋 Borrador cargado:', bookingId);
      return draft;
    } catch (error) {
      console.warn('Error al cargar borrador:', error);
      this.removeDraft(bookingId);
      return null;
    }
  }

  /**
   * Eliminar borrador específico
   */
  removeDraft(bookingId: string): void {
    const key = this.getStorageKey(bookingId);
    localStorage.removeItem(key);

    this.broadcastSync({
      action: 'draft_removed',
      bookingId,
      timestamp: Date.now()
    });

    console.log('🗑️ Borrador eliminado:', bookingId);
  }

  /**
   * Listar todos los borradores del usuario actual
   */
  listDrafts(): Array<{id: string, metadata: any, timestamp: number}> {
    const drafts = [];
    const userId = this.getCurrentUserId();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.STORAGE_KEY_PREFIX)) continue;

        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const draft = JSON.parse(stored);

        // Filtrar por usuario y verificar expiración
        if (draft.userId === userId && !this.isDraftExpired(draft)) {
          const bookingId = key.replace(this.STORAGE_KEY_PREFIX, '');
          drafts.push({
            id: bookingId,
            metadata: draft.metadata,
            timestamp: draft.timestamp
          });
        } else if (this.isDraftExpired(draft)) {
          // Limpiar borradores expirados encontrados
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Error al listar borradores:', error);
    }

    return drafts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Limpiar todos los borradores expirados
   */
  cleanExpiredDrafts(): void {
    const keysToRemove = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.STORAGE_KEY_PREFIX)) continue;

        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const draft = JSON.parse(stored);
        if (this.isDraftExpired(draft)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      if (keysToRemove.length > 0) {
        console.log(`🧹 Limpieza completada: ${keysToRemove.length} borradores expirados eliminados`);
      }
    } catch (error) {
      console.warn('Error en limpieza de borradores:', error);
    }
  }

  /**
   * Verificar si existe un borrador para una reserva específica
   */
  hasDraft(bookingId: string): boolean {
    const draft = this.loadDraft(bookingId);
    return draft !== null;
  }

  /**
   * Obtener información resumida de un borrador sin cargarlo completamente
   */
  getDraftInfo(bookingId: string): {exists: boolean, timestamp?: number, isExpired?: boolean} {
    const key = this.getStorageKey(bookingId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return { exists: false };
    }

    try {
      const draft = JSON.parse(stored);
      return {
        exists: true,
        timestamp: draft.timestamp,
        isExpired: this.isDraftExpired(draft)
      };
    } catch {
      return { exists: false };
    }
  }

  // Métodos privados

  private getStorageKey(bookingId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${bookingId}`;
  }

  private getCurrentUserId(): string {
    try {
      const user = JSON.parse(localStorage.getItem('boukiiUser') || '{}');
      return user.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  private isDraftExpired(draft: any): boolean {
    if (!draft.timestamp) return true;

    const expiryTime = draft.timestamp + (this.EXPIRY_HOURS * 60 * 60 * 1000);
    return Date.now() > expiryTime;
  }

  private broadcastSync(data: any): void {
    // Usar dispatchEvent para comunicación entre tabs
    const event = new CustomEvent(this.SYNC_EVENT, { detail: data });
    window.dispatchEvent(event);

    // También usar localStorage para compatibilidad
    localStorage.setItem('boukii_sync_temp', JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
    localStorage.removeItem('boukii_sync_temp');
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'boukii_sync_temp' && event.newValue) {
      try {
        const syncData = JSON.parse(event.newValue);
        this.syncSubject.next(syncData);
      } catch (error) {
        console.warn('Error al procesar sincronización:', error);
      }
    }
  }

  private handleStorageError(error: any): void {
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ Espacio de almacenamiento agotado, ejecutando limpieza');
      this.cleanExpiredDrafts();

      // Intentar eliminar algunos borradores antiguos si sigue lleno
      const drafts = this.listDrafts();
      if (drafts.length > 10) {
        drafts.slice(-5).forEach(draft => this.removeDraft(draft.id));
      }
    }
  }
}