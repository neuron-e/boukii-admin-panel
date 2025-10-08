import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CourseInterval, WeeklyPattern } from '../../../interfaces/course-interval.interface';
import { CourseIntervalsService } from '../../../../service/course-intervals.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'vex-course-intervals-manager',
  templateUrl: './course-intervals-manager.component.html',
  styleUrls: ['./course-intervals-manager.component.scss']
})
export class CourseIntervalsManagerComponent implements OnInit {
  @Input() courseId: number;
  @Input() configMode: 'unified' | 'independent' = 'unified';
  @Input() courseStartDate: string;
  @Input() courseEndDate: string;
  @Input() isFlexible: boolean = false;
  @Output() intervalsChanged = new EventEmitter<CourseInterval[]>();

  intervals: CourseInterval[] = [];
  intervalForm: FormGroup;
  editingIntervalId: number | null = null;
  showForm: boolean = false;
  loading: boolean = false;

  // Days of week for weekly pattern
  weekDays = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  constructor(
    private fb: FormBuilder,
    private intervalsService: CourseIntervalsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.courseId) {
      this.loadIntervals();
    }
  }

  initForm(): void {
    this.intervalForm = this.fb.group({
      name: ['', Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      config_mode: ['inherit', Validators.required],
      date_generation_method: [null],
      consecutive_days_count: [null],
      weekly_pattern: this.fb.group({
        monday: [false],
        tuesday: [false],
        wednesday: [false],
        thursday: [false],
        friday: [false],
        saturday: [false],
        sunday: [false]
      }),
      booking_mode: ['flexible', Validators.required]
    });

    // Watch config_mode changes
    this.intervalForm.get('config_mode').valueChanges.subscribe(mode => {
      this.onConfigModeChange(mode);
    });

    // Watch date_generation_method changes
    this.intervalForm.get('date_generation_method').valueChanges.subscribe(method => {
      this.onDateGenerationMethodChange(method);
    });
  }

  loadIntervals(): void {
    this.loading = true;
    this.intervalsService.getIntervalsByCourse(this.courseId).subscribe({
      next: (response) => {
        this.intervals = response.data || [];
        this.intervalsChanged.emit(this.intervals);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading intervals:', error);
        this.snackBar.open('Error al cargar intervalos', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onConfigModeChange(mode: 'inherit' | 'custom'): void {
    const dateGenMethod = this.intervalForm.get('date_generation_method');
    const consecutiveDays = this.intervalForm.get('consecutive_days_count');
    const weeklyPattern = this.intervalForm.get('weekly_pattern');

    if (mode === 'custom') {
      dateGenMethod.setValidators([Validators.required]);
    } else {
      dateGenMethod.clearValidators();
      dateGenMethod.setValue(null);
      consecutiveDays.setValue(null);
      this.resetWeeklyPattern();
    }

    dateGenMethod.updateValueAndValidity();
  }

  onDateGenerationMethodChange(method: string): void {
    const consecutiveDays = this.intervalForm.get('consecutive_days_count');
    const weeklyPattern = this.intervalForm.get('weekly_pattern');

    // Reset validations
    consecutiveDays.clearValidators();
    consecutiveDays.setValue(null);
    this.resetWeeklyPattern();

    if (method === 'consecutive') {
      consecutiveDays.setValidators([Validators.required, Validators.min(1)]);
    } else if (method === 'weekly') {
      // Weekly pattern will be validated separately
    }

    consecutiveDays.updateValueAndValidity();
  }

  resetWeeklyPattern(): void {
    const pattern = this.intervalForm.get('weekly_pattern') as FormGroup;
    this.weekDays.forEach(day => {
      pattern.get(day.key).setValue(false);
    });
  }

  showAddForm(): void {
    this.editingIntervalId = null;
    this.intervalForm.reset({
      config_mode: 'inherit',
      booking_mode: this.isFlexible ? 'flexible' : 'package',
      start_date: this.courseStartDate,
      end_date: this.courseEndDate
    });
    this.resetWeeklyPattern();
    this.showForm = true;
  }

  editInterval(interval: CourseInterval): void {
    this.editingIntervalId = interval.id;
    this.intervalForm.patchValue({
      name: interval.name,
      start_date: interval.start_date,
      end_date: interval.end_date,
      config_mode: interval.config_mode,
      date_generation_method: interval.date_generation_method,
      consecutive_days_count: interval.consecutive_days_count,
      booking_mode: interval.booking_mode
    });

    if (interval.weekly_pattern) {
      this.intervalForm.patchValue({
        weekly_pattern: interval.weekly_pattern
      });
    }

    this.showForm = true;
  }

  cancelEdit(): void {
    this.showForm = false;
    this.editingIntervalId = null;
    this.intervalForm.reset();
  }

  saveInterval(): void {
    if (this.intervalForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const formData = this.intervalForm.value;

    // Validate dates
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      this.snackBar.open('La fecha de inicio debe ser anterior a la fecha de fin', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validate weekly pattern if method is 'weekly'
    if (formData.config_mode === 'custom' && formData.date_generation_method === 'weekly') {
      const hasSelectedDay = Object.values(formData.weekly_pattern).some(value => value === true);
      if (!hasSelectedDay) {
        this.snackBar.open('Debes seleccionar al menos un día de la semana', 'Cerrar', { duration: 3000 });
        return;
      }
    }

    const intervalData: Partial<CourseInterval> = {
      course_id: this.courseId,
      ...formData,
      display_order: this.editingIntervalId !== null
        ? this.intervals.find(i => i.id === this.editingIntervalId)?.display_order
        : this.intervals.length
    };

    this.loading = true;

    const saveObservable = this.editingIntervalId !== null
      ? this.intervalsService.updateInterval(this.editingIntervalId, intervalData)
      : this.intervalsService.createInterval(intervalData);

    saveObservable.subscribe({
      next: (response) => {
        const savedIntervalId = response.data?.id || this.editingIntervalId;

        // If custom config mode and has a date generation method, generate dates automatically
        if (formData.config_mode === 'custom' && formData.date_generation_method && savedIntervalId) {
          this.intervalsService.generateDates(savedIntervalId).subscribe({
            next: (generateResponse) => {
              this.snackBar.open(
                `Intervalo guardado y ${generateResponse.data?.dates_generated || 0} fechas generadas`,
                'Cerrar',
                { duration: 3000 }
              );
              this.loadIntervals();
              this.cancelEdit();
            },
            error: (error) => {
              console.error('Error generating dates:', error);
              this.snackBar.open(
                'Intervalo guardado pero error al generar fechas',
                'Cerrar',
                { duration: 3000 }
              );
              this.loadIntervals();
              this.cancelEdit();
            }
          });
        } else {
          this.snackBar.open(
            this.editingIntervalId !== null ? 'Intervalo actualizado' : 'Intervalo creado',
            'Cerrar',
            { duration: 3000 }
          );
          this.loadIntervals();
          this.cancelEdit();
        }
      },
      error: (error) => {
        console.error('Error saving interval:', error);
        this.snackBar.open('Error al guardar intervalo', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  deleteInterval(interval: CourseInterval): void {
    if (!confirm(`¿Estás seguro de eliminar el intervalo "${interval.name}"?`)) {
      return;
    }

    this.loading = true;
    this.intervalsService.deleteInterval(interval.id).subscribe({
      next: () => {
        this.snackBar.open('Intervalo eliminado', 'Cerrar', { duration: 3000 });
        this.loadIntervals();
      },
      error: (error) => {
        console.error('Error deleting interval:', error);
        this.snackBar.open('Error al eliminar intervalo', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  drop(event: CdkDragDrop<CourseInterval[]>): void {
    moveItemInArray(this.intervals, event.previousIndex, event.currentIndex);

    // Update display_order for all intervals
    const reorderedIntervals = this.intervals.map((interval, index) => ({
      id: interval.id,
      display_order: index
    }));

    this.loading = true;
    this.intervalsService.reorderIntervals(this.courseId, reorderedIntervals).subscribe({
      next: () => {
        this.snackBar.open('Orden actualizado', 'Cerrar', { duration: 2000 });
        this.intervalsChanged.emit(this.intervals);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error reordering intervals:', error);
        this.snackBar.open('Error al reordenar intervalos', 'Cerrar', { duration: 3000 });
        this.loadIntervals(); // Reload to reset order
      }
    });
  }

  get isIndependentMode(): boolean {
    return this.configMode === 'independent';
  }

  get isCustomConfig(): boolean {
    return this.intervalForm.get('config_mode').value === 'custom';
  }

  get selectedDateGenerationMethod(): string {
    return this.intervalForm.get('date_generation_method').value;
  }

  getMethodLabel(method: string): string {
    const labels = {
      'first_day': 'Solo primer día',
      'consecutive': 'Días consecutivos',
      'weekly': 'Patrón semanal',
      'manual': 'Manual'
    };
    return labels[method] || method;
  }
}
