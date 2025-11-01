import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ConfirmModalComponent } from '../../monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import { FormControl, Validators } from '@angular/forms';
import { ApiCrudService } from '../../../../service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'vex-course-timing-modal',
  templateUrl: './course-timing-modal.component.html',
  styleUrls: ['./course-timing-modal.component.scss']
})
export class CourseTimingModalComponent implements OnInit {
  // Passed-in context
  groupLevel: any;
  subGroup: any;
  courseId?: number;
  courseDates: any[] = [];
  bookingUsers: any[] = [];

  // UI state
  selectedDate: any = null;
  loading = false;

  // Data
  students: any[] = [];
  private studentTimes: Record<string | number, Array<{ id?: any; time_ms: number; lap_no?: number; status?: string }>> = {};
  private unsavedChanges = new Set<string>();
  private currentSubgroupId: number | null = null; // Store the dynamic subgroup ID for the selected date

  constructor(
    private dialogRef: MatDialogRef<CourseTimingModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private crudService: ApiCrudService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Safely map incoming data
    if (this.data) {
      this.groupLevel = this.data.groupLevel ?? null;
      this.subGroup = this.data.subGroup ?? null;
      this.courseId = this.data.courseId ?? undefined;
      this.courseDates = Array.isArray(this.data.courseDates) ? this.data.courseDates : [];
      // Booking users global (para filtrar por día)
      this.bookingUsers = Array.isArray(this.data.bookingUsers) ? this.data.bookingUsers : [];

      // Preselección de día si viene indicado
      const selectedId = this.data?.selectedCourseDateId ?? null;
      if (selectedId) {
        this.selectedDate = this.courseDates.find((d: any) => (d?.id ?? d?.course_date_id) === selectedId) || null;
      }
      if (!this.selectedDate && this.courseDates.length > 0) {
        this.selectedDate = this.courseDates[0];
      }

      // Inicializar lista de alumnos para el día seleccionado
      this.refreshStudentsForSelectedDate();

      // Cargar tiempos existentes si los hay
      this.loadExistingTimes();
    }
  }

  onDateChange(): void {
    this.refreshStudentsForSelectedDate();
    this.loadExistingTimes();
  }

  private refreshStudentsForSelectedDate(): void {
    try {
      if (!this.selectedDate) {
        this.students = [];
        return;
      }

      // PROBLEMA: el subGroup pasado al modal puede tener un ID diferente para cada fecha
      // SOLUCIÓN: encontrar dinámicamente el subgrupo correcto para la fecha seleccionada

      let subgroupId = this.subGroup?.id ?? this.subGroup?.course_subgroup_id ?? null;

      // Intentar encontrar el subgrupo correcto para esta fecha específica
      if (this.selectedDate && this.groupLevel) {
        const courseGroups = Array.isArray((this.selectedDate as any).course_groups)
          ? (this.selectedDate as any).course_groups
          : [];

        const targetGroup = courseGroups.find((g: any) => g.degree_id === this.groupLevel.id);
        if (targetGroup && Array.isArray(targetGroup.course_subgroups)) {
          // Si hay subgrupos para esta fecha/grupo, usar el primero (o encontrar el correcto)
          const subgroupForThisDate = targetGroup.course_subgroups[0]; // Puede necesitar más lógica aquí
          if (subgroupForThisDate?.id) {
            console.log(`Overriding subgroupId from ${subgroupId} to ${subgroupForThisDate.id} for this specific date`);
            subgroupId = subgroupForThisDate.id;
          }
        }
      }

      // Store the detected subgroup ID for use in save operations
      this.currentSubgroupId = subgroupId;

      // El problema: los booking_users globales tienen subgroup_ids incorrectos para cada fecha
      // La solución: usar booking_users_active específicos de la fecha seleccionada

      let students: any[] = [];

      // 1. Primero intentar usar booking_users_active de la fecha seleccionada
      const selectedDateActive = Array.isArray((this.selectedDate as any).booking_users_active)
        ? (this.selectedDate as any).booking_users_active
        : [];

      if (selectedDateActive.length > 0 && this.groupLevel?.id) {
        const filteredByDegree = selectedDateActive.filter((user: any) => {
          return user.degree_id === this.groupLevel.id;
        });

        students = filteredByDegree.map((user: any) => ({
          id: user.client_id ?? user.client?.id ?? user.id,
          first_name: user.client?.first_name ?? user.first_name,
          last_name: user.client?.last_name ?? user.last_name,
          birth_date: user.client?.birth_date ?? user.birth_date,
          country: user.client?.country ?? user.country,
          image: user.client?.image ?? user.image
        }));
      }

      // 2. Fallback: si no hay booking_users_active, intentar con embebidos en course_groups
      if (students.length === 0) {
        const courseGroups = Array.isArray((this.selectedDate as any).course_groups)
          ? (this.selectedDate as any).course_groups
          : [];

        for (const group of courseGroups) {
          if (group.degree_id === this.groupLevel?.id) {
            const subgroups = Array.isArray(group.course_subgroups) ? group.course_subgroups : [];
            for (const subgroup of subgroups) {
              if (subgroup.id === subgroupId) {
                const embeddedUsers = Array.isArray(subgroup.booking_users) ? subgroup.booking_users : [];
                students = embeddedUsers.map((user: any) => ({
                  id: user.client_id ?? user.client?.id ?? user.id,
                  first_name: user.client?.first_name ?? user.first_name,
                  last_name: user.client?.last_name ?? user.last_name,
                  birth_date: user.client?.birth_date ?? user.birth_date,
                  country: user.client?.country ?? user.country,
                  image: user.client?.image ?? user.image
                }));
                break;
              }
            }
          }
        }
      }

      // 3. Último fallback: usar bookingUsers globales - filtrar por degree_id como flux-disponibilidad
      if (students.length === 0 && Array.isArray(this.bookingUsers) && this.groupLevel?.id) {
        const uniqueBookingUsers = this.bookingUsers.filter((user: any, index: any, self: any) =>
          index === self.findIndex((u: any) => u.client_id === user.client_id)
        );

        const filteredByDegree = uniqueBookingUsers.filter((user: any) => {
          return user.degree_id === this.groupLevel.id;
        });

        students = filteredByDegree.map((user: any) => ({
          id: user.client_id ?? user.client?.id,
          first_name: user.client?.first_name,
          last_name: user.client?.last_name,
          birth_date: user.client?.birth_date,
          country: user.client?.country,
          image: user.client?.image
        }));
      }

      this.students = students;
    } catch (e) {
      this.students = [];
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  exportTimes(): void {
    if (!this.hasTimesToExport()) {
      this.snackBar.open('No hay tiempos para exportar', 'OK', { duration: 3000 });
      return;
    }

    // Enhanced CSV export with student names and formatted times
    const rows = [['Student ID', 'Student Name', 'Lap', 'Time (ms)', 'Formatted Time', 'Status']];

    this.students.forEach(student => {
      const times = this.getStudentTimes(student.id);
      if (times.length > 0) {
        times.forEach(time => {
          rows.push([
            student.id.toString(),
            `${student.first_name} ${student.last_name}`,
            (time.lap_no ?? 1).toString(),
            time.time_ms.toString(),
            this.formatTime(time.time_ms),
            time.status ?? 'valid'
          ]);
        });
      }
    });

    // Generate CSV content
    const csv = rows.map(row =>
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    // Create filename with date and course info
    const dateStr = this.selectedDate ? new Date(this.selectedDate.date).toISOString().split('T')[0] : 'unknown';
    const filename = `tiempos_curso_${this.courseId}_fecha_${dateStr}.csv`;

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    this.snackBar.open('CSV exportado exitosamente', 'OK', { duration: 2000 });
  }

  getStudentTimes(studentId: string | number): Array<{ id?: any; time_ms: number; lap_no?: number; status?: string }> {
    return this.studentTimes[studentId] ?? [];
  }

  getSubgroupOrder(): number {
    // Return 1-based index instead of subgroup ID
    if (!this.subGroup || !this.groupLevel?.subgroups) return 1;
    const index = this.groupLevel.subgroups.findIndex((sg: any) => sg.id === this.subGroup.id);
    return index >= 0 ? index + 1 : 1;
  }

  getStudentTimeByLap(studentId: string | number, lapNo: number): any {
    const times = this.getStudentTimes(studentId);
    return times.find(t => t.lap_no === lapNo) || null;
  }

  formatTime(timeMs: number): string {
    if (!timeMs || timeMs <= 0) return '00:00.000';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const millis = timeMs % 1000;
    return `${this.pad2(minutes)}:${this.pad2(seconds)}.${this.pad3(millis)}`;
  }

  getStatusClass(status?: string): string {
    switch ((status || 'valid').toLowerCase()) {
      case 'invalid': return 'status-invalid';
      case 'dns': return 'status-dns';
      case 'dnf': return 'status-dnf';
      default: return 'status-valid';
    }
  }

  getBestTime(studentId: string | number): string {
    const times = this.getStudentTimes(studentId).filter(t => t.status === 'valid');
    if (times.length === 0) return '--';
    const bestMs = Math.min(...times.map(t => t.time_ms));
    return this.formatTime(bestMs);
  }

  getAge(birthDate?: string): number {
    if (!birthDate) return 0;
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  }

  getCountryName(countryCode?: string): string {
    // Simple country code to name mapping
    const countries: { [key: string]: string } = {
      'ES': 'España',
      'FR': 'Francia',
      'CH': 'Suiza',
      'IT': 'Italia',
      'DE': 'Alemania'
    };
    return countries[countryCode || ''] || countryCode || '';
  }

  deleteTime(timeId: any): void {
    // Show confirmation dialog before deleting
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: '¿Estás seguro de que quieres eliminar este tiempo?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performTimeDelete(timeId);
      }
    });
  }

  private performTimeDelete(timeId: any): void {
    let timeToDelete: any = null;
    let studentId: string = '';

    for (const sId in this.studentTimes) {
      const times = this.studentTimes[sId];
      const index = times.findIndex(t => t.id === timeId);
      if (index !== -1) {
        timeToDelete = times[index];
        studentId = sId;
        times.splice(index, 1);
        break;
      }
    }

    if (!timeToDelete) {
      return;
    }

    if (timeToDelete.id && !timeToDelete.id.toString().startsWith('temp_')) {
      this.crudService.delete('/admin/course-timing', timeToDelete.id)
        .subscribe({
          next: () => {
            this.snackBar.open('Tiempo eliminado', 'OK', { duration: 2000 });
          },
          error: (error) => {
            this.snackBar.open('Error al eliminar tiempo', 'OK', { duration: 3000 });
          }
        });
    } else {
      this.unsavedChanges.add(studentId);
    }
  }

  addTime(studentId: string | number, lapNo?: number): void {
    const list = this.studentTimes[studentId] ?? [];
    const newLapNo = lapNo || (list[list.length - 1]?.lap_no ?? 0) + 1;
    const newId = `temp_${studentId}_${newLapNo}_${Date.now()}`;
    list.push({ id: newId, time_ms: 0, lap_no: newLapNo, status: 'valid' });
    this.studentTimes[studentId] = list;
    this.unsavedChanges.add(`${studentId}`);
  }

  editTime(time: any): void {
    const dialogRef = this.dialog.open(EditTimeDialogComponent, {
      width: '400px',
      data: { 
        time: { ...time }, // Clone to avoid direct mutation
        studentName: this.getStudentName(time)
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update the time in our data structure
        for (const studentId in this.studentTimes) {
          const times = this.studentTimes[studentId];
          const index = times.findIndex(t => t.id === time.id);
          if (index !== -1) {
            times[index] = { ...times[index], ...result };
            this.unsavedChanges.add(studentId);
            break;
          }
        }
      }
    });
  }

  private pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
  private pad3(n: number): string {
    if (n < 10) return `00${n}`;
    if (n < 100) return `0${n}`;
    return `${n}`;
  }

  getStatusText(status?: string): string {
    switch ((status || 'valid').toLowerCase()) {
      case 'invalid': return 'timing.invalid';
      case 'dns': return 'timing.dns';
      case 'dnf': return 'timing.dnf';
      default: return 'timing.valid';
    }
  }

  hasUnsavedChanges(): boolean {
    return this.unsavedChanges.size > 0;
  }

  hasTimesToExport(): boolean {
    return this.students.some(student => {
      const times = this.getStudentTimes(student.id);
      return times.length > 0;
    });
  }

  saveAllTimes(): void {
    if (!this.selectedDate || !this.currentSubgroupId) {
      this.snackBar.open('Error: No hay fecha o subgrupo seleccionado', 'OK', { duration: 3000 });
      return;
    }

    this.loading = true;
    const timesToSave: any[] = [];

    // Preparar datos para guardar
    for (const studentId in this.studentTimes) {
      const times = this.studentTimes[studentId];
      for (const time of times) {
        timesToSave.push({
          student_id: studentId,
          course_id: this.courseId,
          course_date_id: this.selectedDate.id,
          course_subgroup_id: this.currentSubgroupId,
          time_ms: time.time_ms,
          lap_no: time.lap_no || 1,
          status: time.status || 'valid'
        });
      }
    }


    // Llamada API para guardar tiempos
    this.crudService.post('/admin/course-timing', { times: timesToSave })
      .subscribe({
        next: (response: any) => {
          this.snackBar.open('Tiempos guardados exitosamente', 'OK', { duration: 3000 });
          this.unsavedChanges.clear();
          this.loading = false;
          this.loadExistingTimes();
        },
        error: (error) => {
          this.snackBar.open('Error al guardar tiempos', 'OK', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  /**
   * Cargar tiempos existentes para la fecha y subgrupo seleccionados
   */
  loadExistingTimes(): void {
    if (!this.selectedDate || !this.currentSubgroupId || !this.courseId) {
      return;
    }

    const params = `course_id=${this.courseId}`;

    this.crudService.list('/admin/course-timing', 1, 1000, 'asc', 'student_id', `&${params}`)
      .subscribe({
        next: (response: any) => {
          this.loadTimesIntoUI(response.data);
        },
        error: (error) => {
          // No mostrar error al usuario si simplemente no hay tiempos guardados
        }
      });
  }

  /**
   * Cargar tiempos en la interfaz desde los datos de la API
   */
  private loadTimesIntoUI(timesData: any[]): void {
    // Limpiar tiempos existentes
    this.studentTimes = {};
    this.unsavedChanges.clear();

    // Filtrar tiempos por fecha actual y estudiantes disponibles
    const currentStudentIds = this.students.map(s => s.id);
    const filteredTimes = timesData.filter(timeRecord => {
      const matchesStudent = currentStudentIds.includes(timeRecord.student_id);
      const matchesDate = timeRecord.course_date_id === this.selectedDate?.id;
      return matchesStudent && matchesDate;
    });

    // Agrupar por student_id
    const timesByStudent: Record<string, any[]> = {};

    for (const timeRecord of filteredTimes) {
      const studentId = timeRecord.student_id;
      if (!timesByStudent[studentId]) {
        timesByStudent[studentId] = [];
      }

      timesByStudent[studentId].push({
        id: timeRecord.id,
        time_ms: timeRecord.time_ms,
        lap_no: timeRecord.lap_no || 1,
        status: timeRecord.status || 'valid'
      });
    }

    // Cargar en studentTimes
    this.studentTimes = timesByStudent;
  }

  getStudentName(time: any): string {
    // Find student name for the time entry
    for (const student of this.students) {
      const times = this.getStudentTimes(student.id);
      if (times.some(t => t.id === time.id)) {
        return `${student.first_name} ${student.last_name}`;
      }
    }
    return 'Unknown Student';
  }
}

@Component({
  selector: 'edit-time-dialog',
  template: `
    <h1 mat-dialog-title>Editar Tiempo</h1>
    <div mat-dialog-content>
      <p><strong>Estudiante:</strong> {{data.studentName}}</p>
      <p><strong>Vuelta:</strong> {{data.time.lap_no || 1}}</p>
      
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
        <mat-label>Tiempo (minutos)</mat-label>
        <input matInput type="number" [formControl]="minutesControl" min="0" max="59" step="1">
      </mat-form-field>
      
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
        <mat-label>Segundos</mat-label>
        <input matInput type="number" [formControl]="secondsControl" min="0" max="59" step="1">
      </mat-form-field>
      
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
        <mat-label>Milisegundos</mat-label>
        <input matInput type="number" [formControl]="millisecondsControl" min="0" max="999" step="1">
      </mat-form-field>
      
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Estado</mat-label>
        <mat-select [formControl]="statusControl">
          <mat-option value="valid">Válido</mat-option>
          <mat-option value="invalid">Inválido</mat-option>
          <mat-option value="dns">DNS (No se presentó)</mat-option>
          <mat-option value="dnf">DNF (No terminó)</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!isValid()">Guardar</button>
    </div>
  `,
  styles: []
})
export class EditTimeDialogComponent {
  minutesControl = new FormControl(0, [Validators.required, Validators.min(0), Validators.max(59)]);
  secondsControl = new FormControl(0, [Validators.required, Validators.min(0), Validators.max(59)]);
  millisecondsControl = new FormControl(0, [Validators.required, Validators.min(0), Validators.max(999)]);
  statusControl = new FormControl('valid');

  constructor(
    private dialogRef: MatDialogRef<EditTimeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Initialize form with current time values
    const timeMs = data.time.time_ms || 0;
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const milliseconds = timeMs % 1000;
    
    this.minutesControl.setValue(minutes);
    this.secondsControl.setValue(seconds);
    this.millisecondsControl.setValue(milliseconds);
    this.statusControl.setValue(data.time.status || 'valid');
  }

  isValid(): boolean {
    return this.minutesControl.valid && this.secondsControl.valid && 
           this.millisecondsControl.valid && this.statusControl.valid;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.isValid()) {
      const minutes = this.minutesControl.value || 0;
      const seconds = this.secondsControl.value || 0;
      const milliseconds = this.millisecondsControl.value || 0;
      const time_ms = (minutes * 60000) + (seconds * 1000) + milliseconds;
      
      this.dialogRef.close({
        time_ms,
        status: this.statusControl.value
      });
    }
  }
}
