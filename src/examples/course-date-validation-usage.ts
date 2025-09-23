// EJEMPLO DE USO DEL SERVICIO DE VALIDACIÓN DE FECHAS DE CURSO
// Este archivo muestra cómo integrar las validaciones en cualquier componente

import { Component } from '@angular/core';
import { CourseDateValidationService, CourseDateModificationRequest } from '../service/course-date-validation.service';
import { ApiCrudService } from '../service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'example-course-edit',
  template: `<!-- Ejemplo de template -->`
})
export class ExampleCourseEditComponent {

  constructor(
    private courseDateValidation: CourseDateValidationService,
    private crudService: ApiCrudService,
    private snackBar: MatSnackBar
  ) {}

  // EJEMPLO 1: Eliminar una fecha de curso
  async deleteCourseDate(courseId: number, dateId: number): Promise<void> {
    const request: CourseDateModificationRequest = {
      courseId,
      dateId,
      action: 'delete'
    };

    // El servicio mostrará automáticamente los diálogos necesarios
    const canProceed = await this.courseDateValidation
      .showCourseDateModificationDialog(request)
      .toPromise();

    if (canProceed) {
      // Solo proceder si el usuario confirmó o no hay reservas
      this.crudService.delete(`/admin/course-dates`, dateId).subscribe({
        next: () => {
          this.snackBar.open('Fecha eliminada correctamente', '', { duration: 3000 });
          this.refreshCourseData();
        },
        error: (error) => {
          this.snackBar.open('Error al eliminar la fecha', '', { duration: 3000 });
        }
      });
    }
  }

  // EJEMPLO 2: Modificar una fecha de curso
  async updateCourseDate(courseId: number, dateId: number, newDate: string, newTime: string): Promise<void> {
    const request: CourseDateModificationRequest = {
      courseId,
      dateId,
      action: 'update',
      newDate,
      newTime
    };

    const canProceed = await this.courseDateValidation
      .showCourseDateModificationDialog(request)
      .toPromise();

    if (canProceed) {
      const updateData = {
        date: newDate,
        hour_start: newTime
      };

      this.crudService.update(`/admin/course-dates`, updateData, dateId).subscribe({
        next: () => {
          this.snackBar.open('Fecha actualizada correctamente', '', { duration: 3000 });
          this.refreshCourseData();
        },
        error: (error) => {
          this.snackBar.open('Error al actualizar la fecha', '', { duration: 3000 });
        }
      });
    }
  }

  // EJEMPLO 3: Validación antes de eliminar múltiples fechas
  async deleteMultipleDates(courseId: number, dateIds: number[]): Promise<void> {
    // Validar todas las fechas primero
    const validations = await this.courseDateValidation
      .validateMultipleCourseDates(courseId, dateIds)
      .toPromise();

    const cannotDelete = Object.entries(validations!)
      .filter(([_, validation]) => !validation.canDelete)
      .map(([dateId, validation]) => ({
        dateId: parseInt(dateId),
        bookingCount: validation.affectedBookings.length
      }));

    if (cannotDelete.length > 0) {
      const message = `No se pueden eliminar ${cannotDelete.length} fecha(s) porque tienen reservas activas:

${cannotDelete.map(item => `- Fecha ID ${item.dateId}: ${item.bookingCount} reserva(s)`).join('\n')}

Primero debe cancelar o reasignar estas reservas.`;

      // Mostrar error personalizado
      this.snackBar.open('Algunas fechas no se pueden eliminar', '', { duration: 5000 });
      return;
    }

    // Si todas las fechas se pueden eliminar, proceder
    for (const dateId of dateIds) {
      await this.deleteCourseDate(courseId, dateId);
    }
  }

  // EJEMPLO 4: Validación manual (sin diálogos automáticos)
  async checkCourseDateBeforeAction(courseId: number, dateId: number): Promise<void> {
    const validation = await this.courseDateValidation
      .validateCourseDateModification(courseId, dateId)
      .toPromise();

    if (validation!.affectedBookings.length > 0) {
      console.log(`Esta fecha afecta a ${validation!.affectedBookings.length} reservas:`);
      validation!.affectedBookings.forEach(booking => {
        console.log(`- ${booking.client?.first_name} ${booking.client?.last_name}`);
      });

      // Aquí puedes implementar tu propia lógica personalizada
      // sin usar los diálogos automáticos del servicio
    }
  }

  private refreshCourseData(): void {
    // Implementar recarga de datos del curso
  }
}

// EJEMPLO DE INTEGRACIÓN EN MÓDULO
/*
@NgModule({
  declarations: [ExampleCourseEditComponent],
  imports: [
    // ... otros imports
  ],
  providers: [
    CourseDateValidationService
  ]
})
export class CourseEditModule { }
*/

// GUÍA DE IMPLEMENTACIÓN:
/*

1. DÓNDE USAR ESTE SERVICIO:
   - Formularios de edición de cursos
   - Calendarios de gestión de fechas
   - Componentes de configuración de horarios
   - Cualquier lugar donde se modifiquen fechas de curso

2. MÉTODOS PRINCIPALES:
   - showCourseDateModificationDialog(): Para uso directo con diálogos automáticos
   - validateCourseDateModification(): Para validación manual
   - validateMultipleCourseDates(): Para operaciones masivas

3. INTEGRACIÓN RECOMENDADA:
   - Inyectar el servicio en el constructor
   - Llamar al método apropiado antes de cualquier modificación
   - Manejar el resultado boolean para proceder o cancelar

4. PERSONALIZACIÓN:
   - Los mensajes se pueden personalizar en el servicio
   - Los diálogos usan los componentes existentes de Material
   - Se pueden agregar más validaciones específicas

*/