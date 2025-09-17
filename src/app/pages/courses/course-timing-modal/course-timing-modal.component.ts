import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';

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

  // UI state
  selectedDate: any = null;
  loading = false;

  // Data
  students: any[] = [];
  private studentTimes: Record<string | number, Array<{ id?: any; time_ms: number; lap_no?: number; status?: string }>> = {};
  private unsavedChanges = new Set<string>();

  constructor(
    private dialogRef: MatDialogRef<CourseTimingModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Safely map incoming data
    if (this.data) {
      this.groupLevel = this.data.groupLevel ?? null;
      this.subGroup = this.data.subGroup ?? null;
      this.courseId = this.data.courseId ?? undefined;
      this.courseDates = Array.isArray(this.data.courseDates) ? this.data.courseDates : [];
      if (this.courseDates.length > 0) {
        this.selectedDate = this.courseDates[0];
      }
      // Optional: students list provided by parent
      this.students = Array.isArray(this.data.students) ? this.data.students : [];
    }
  }

  onDateChange(): void {
    // Placeholder for reloading data per date
    // Keep implementation minimal to avoid compile errors
  }

  close(): void {
    this.dialogRef.close();
  }

  exportTimes(): void {
    // Minimal CSV export for current selected date (stub)
    const rows = [['student_id', 'time_ms', 'lap_no', 'status']];
    this.students.forEach(s => {
      const times = this.getStudentTimes(s.id);
      times.forEach(t => rows.push([s.id, t.time_ms, t.lap_no ?? 1, t.status ?? 'valid'] as any));
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'times.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  getStudentTimes(studentId: string | number): Array<{ id?: any; time_ms: number; lap_no?: number; status?: string }> {
    return this.studentTimes[studentId] ?? [];
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

  deleteTime(timeId: any): void {
    // Find and remove the time from studentTimes
    for (const studentId in this.studentTimes) {
      const times = this.studentTimes[studentId];
      const index = times.findIndex(t => t.id === timeId);
      if (index !== -1) {
        times.splice(index, 1);
        this.unsavedChanges.add(studentId);
        break;
      }
    }
  }

  formatTime(ms: number): string {
    if (!ms || ms <= 0) return '00:00.000';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${this.pad2(minutes)}:${this.pad2(seconds)}.${this.pad3(millis)}`;
  }

  private pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
  private pad3(n: number): string {
    if (n < 10) return `00${n}`;
    if (n < 100) return `0${n}`;
    return `${n}`;
  }

  getStatusClass(status?: string): string {
    switch ((status || 'valid').toLowerCase()) {
      case 'invalid': return 'status-invalid';
      case 'dns': return 'status-dns';
      case 'dnf': return 'status-dnf';
      default: return 'status-valid';
    }
  }

  getStatusText(status?: string): string {
    switch ((status || 'valid').toLowerCase()) {
      case 'invalid': return 'timing.invalid';
      case 'dns': return 'timing.dns';
      case 'dnf': return 'timing.dnf';
      default: return 'timing.valid';
    }
  }

  getAge(birthDate?: string): number {
    if (!birthDate) return 0;
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  }

  getCountryName(code?: string): string {
    return code || '';
  }

  getStudentTimeByLap(studentId: string | number, lapNo: number): any {
    const times = this.getStudentTimes(studentId);
    return times.find(t => t.lap_no === lapNo) || null;
  }

  getBestTime(studentId: string | number): string {
    const times = this.getStudentTimes(studentId).filter(t => t.status === 'valid');
    if (times.length === 0) return '--';
    const bestMs = Math.min(...times.map(t => t.time_ms));
    return this.formatTime(bestMs);
  }

  hasUnsavedChanges(): boolean {
    return this.unsavedChanges.size > 0;
  }

  saveAllTimes(): void {
    // TODO: Implement API call to save all times
    console.log('Saving all times:', this.studentTimes);
    // For now, just clear unsaved changes
    this.unsavedChanges.clear();
    // TODO: Add actual API integration
  }

  private getStudentName(time: any): string {
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
