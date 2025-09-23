import { Injectable } from '@angular/core';

export interface CourseDateValidationError {
  type: 'duplicate' | 'overlap';
  message: string;
  conflictingDates: any[];
}

export interface CourseDateInfo {
  date: string;
  hour_start: string;
  hour_end?: string;
  duration?: number;
  index?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CourseDateOverlapValidationService {

  constructor() { }

  /**
   * Valida si una nueva fecha entra en conflicto con fechas existentes
   */
  validateNewCourseDate(newDate: CourseDateInfo, existingDates: CourseDateInfo[]): CourseDateValidationError | null {
    // Validar fecha duplicada exacta
    const duplicateError = this.checkForDuplicateDate(newDate, existingDates);
    if (duplicateError) {
      return duplicateError;
    }

    // Validar solapamiento de horarios
    const overlapError = this.checkForTimeOverlap(newDate, existingDates);
    if (overlapError) {
      return overlapError;
    }

    return null;
  }

  /**
   * Valida todas las fechas existentes para encontrar conflictos
   */
  validateAllCourseDates(courseDates: CourseDateInfo[]): CourseDateValidationError[] {
    const errors: CourseDateValidationError[] = [];

    for (let i = 0; i < courseDates.length; i++) {
      const currentDate = { ...courseDates[i], index: i };
      const otherDates = courseDates.slice(i + 1).map((date, idx) => ({ ...date, index: i + idx + 1 }));

      const duplicateError = this.checkForDuplicateDate(currentDate, otherDates);
      if (duplicateError) {
        errors.push(duplicateError);
      }

      const overlapError = this.checkForTimeOverlap(currentDate, otherDates);
      if (overlapError) {
        errors.push(overlapError);
      }
    }

    return errors;
  }

  /**
   * Verifica si hay fechas exactamente duplicadas
   */
  private checkForDuplicateDate(newDate: CourseDateInfo, existingDates: CourseDateInfo[]): CourseDateValidationError | null {
    const duplicates = existingDates.filter(existing =>
      existing.date === newDate.date &&
      existing.hour_start === newDate.hour_start &&
      this.getEndTime(existing) === this.getEndTime(newDate)
    );

    if (duplicates.length > 0) {
      return {
        type: 'duplicate',
        message: `Ya existe una fecha idéntica el ${this.formatDate(newDate.date)} a las ${newDate.hour_start}`,
        conflictingDates: [newDate, ...duplicates]
      };
    }

    return null;
  }

  /**
   * Verifica si hay solapamiento de horarios en el mismo día
   */
  private checkForTimeOverlap(newDate: CourseDateInfo, existingDates: CourseDateInfo[]): CourseDateValidationError | null {
    const sameDayDates = existingDates.filter(existing => existing.date === newDate.date);

    if (sameDayDates.length === 0) {
      return null;
    }

    const newStartTime = this.timeToMinutes(newDate.hour_start);
    const newEndTime = this.timeToMinutes(this.getEndTime(newDate));

    const overlappingDates = sameDayDates.filter(existing => {
      const existingStartTime = this.timeToMinutes(existing.hour_start);
      const existingEndTime = this.timeToMinutes(this.getEndTime(existing));

      // Verificar solapamiento:
      // - La nueva fecha empieza antes de que termine la existente
      // - La nueva fecha termina después de que empiece la existente
      return (newStartTime < existingEndTime && newEndTime > existingStartTime);
    });

    if (overlappingDates.length > 0) {
      const conflictDetails = overlappingDates.map(date =>
        `${date.hour_start} - ${this.getEndTime(date)}`
      ).join(', ');

      return {
        type: 'overlap',
        message: `El horario ${newDate.hour_start} - ${this.getEndTime(newDate)} se solapa con: ${conflictDetails} el ${this.formatDate(newDate.date)}`,
        conflictingDates: [newDate, ...overlappingDates]
      };
    }

    return null;
  }

  /**
   * Calcula la hora de fin basada en hour_end o duration
   */
  private getEndTime(date: CourseDateInfo): string {
    if (date.hour_end) {
      return date.hour_end;
    }

    if (date.duration) {
      return this.addMinutesToTime(date.hour_start, date.duration);
    }

    // Por defecto, asumir 1 hora si no hay información
    return this.addMinutesToTime(date.hour_start, 60);
  }

  /**
   * Agrega minutos a una hora en formato HH:mm
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Convierte tiempo HH:mm a minutos desde medianoche
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Formatea fecha para mostrar al usuario
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Obtiene un mensaje de resumen para múltiples errores
   */
  getValidationSummary(errors: CourseDateValidationError[]): string {
    if (errors.length === 0) {
      return '';
    }

    const duplicateCount = errors.filter(e => e.type === 'duplicate').length;
    const overlapCount = errors.filter(e => e.type === 'overlap').length;

    let summary = 'Se encontraron conflictos en las fechas:';

    if (duplicateCount > 0) {
      summary += `\n• ${duplicateCount} fecha(s) duplicada(s)`;
    }

    if (overlapCount > 0) {
      summary += `\n• ${overlapCount} solapamiento(s) de horario`;
    }

    return summary;
  }
}