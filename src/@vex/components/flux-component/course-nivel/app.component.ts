import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiCrudService } from '../../../../service/crud.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-course-detail-nivel',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class CourseDetailCardNivelComponent {

  @Input() courseFormGroup!: UntypedFormGroup
  @Input() checkbox: boolean = false
  @Input() selectedSubgroup: any;
  @Output() changeMonitor = new EventEmitter<any>()
  @Output() viewTimes = new EventEmitter<{ subGroup: any, groupLevel: any }>()

  today: Date = new Date()

  constructor(
    private snackBar: MatSnackBar,
    private crudService: ApiCrudService,
    private translateService: TranslateService
  ) {}

  find = (array: any[], key: string, value: string) => array.find((a: any) => a[key] === value)
  DateISO = (value: string) => value ? new Date(value).toLocaleString().split(" ")[0].replace("/", ".").replace("/", ".") : ''
  DateDiff = (value1: string, value2: string): number => Math.round((new Date(value2).getTime() - new Date(value1).getTime()) / 1000 / 60 / 60 / 24)
  Date = (v: string): Date => new Date(v)
  numUsersArray(value: number): number[] {
    return Array.from({ length: value }, (_, i) => i);
  }
  findBookingUsers(bookingUsers: any[], courseDates: any[], degreeId: number): number {
    if (!bookingUsers || !courseDates) return 0;
    if(!this.courseFormGroup.value.is_flexible) {
      return bookingUsers.filter((user: any) => {
       return courseDates[0].course_groups.some((group: any) =>
          group.degree_id === degreeId && group.id === user.course_group_id)}).length;
    } else {
      return bookingUsers.filter((user: any) => {
        return courseDates.some((date: any) =>
          date.course_groups.some((group: any) => group.degree_id === degreeId && group.id === user.course_group_id)
        );
      }).length;
    }
  }

  countGroups(courseDates: any[], degreeId: number): number {
    return Math.round(courseDates
      .flatMap((date: any) => date.course_groups || []) // Obtener todos los grupos
      .filter((group: any) => group.degree_id === degreeId).length / courseDates.length); // Filtrar por degree_id
  }

  countSubgroups(courseDates: any[], degreeId: number): number {
    return Math.round(
      courseDates
        .flatMap((date: any) => date.course_groups || []) // Obtener todos los grupos
        .filter((group: any) => group.degree_id === degreeId) // Filtrar los grupos por degree_id
        .flatMap((group: any) => group.course_subgroups || []) // Extraer todos los subgrupos dentro de los grupos filtrados
        .filter((subgroup: any) => subgroup.degree_id === degreeId).length / courseDates.length // Filtrar por degree_id y dividir por la cantidad de courseDates
    );
  }

  onTimingClick(subGroup: any, groupLevel: any): void {
    console.log('onTimingClick called with:', { subGroup, groupLevel });
    this.viewTimes.emit({ subGroup, groupLevel });
  }

  // Attendance functionality
  isAttended(user: any): boolean {
    if (!user) return false;
    const a = (user.attended === true || user.attended === 1);
    const b = (user.attendance === true || user.attendance === 1);
    return !!(a || b);
  }

  onAttendanceToggle(user: any, checked: boolean): void {

    if (!user || !user.id) {
      return;
    }

    // Preparar payload similar a teach
    const payload: any = {
      ...user,
      attended: checked,
      attendance: checked
    };

    // Limpiar campos innecesarios
    ['client', 'created_at', 'deleted_at', 'updated_at'].forEach((k) => {
      if (k in payload) delete (payload as any)[k];
    });

    // Actualizar via API
    this.crudService.update('/admin/booking-users', payload, user.id)
      .subscribe({
        next: () => {
          // Actualizar el objeto local
          user.attended = checked;
          user.attendance = checked;

          // Mostrar mensaje de éxito
          this.snackBar.open(
            this.translateService.instant('toast.registered_correctly'),
            '',
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error('Error updating attendance:', error);
          this.snackBar.open(
            'Error al actualizar asistencia',
            '',
            { duration: 3000 }
          );
        }
      });
  }

  // Helper para verificar si la fecha es pasada (para mostrar el checkbox de attendance)
  isDatePast(date: string): boolean {
    if (!date) return false;
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate <= today;
  }

}
