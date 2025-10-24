import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CourseInterval, WeeklyPattern } from '../../../interfaces/course-interval.interface';
import { CourseIntervalsService } from '../../../../service/course-intervals.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

interface IntervalDiscountForm {
  id?: number;
  days: number;
  type: 'percentage' | 'fixed';
  value: number;
}

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
  selectedIntervalForDiscounts: CourseInterval | null = null;
  intervalDiscounts: IntervalDiscountForm[] = [];
  discountsLoading = false;
  discountsSaving = false;

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
        const data = Array.isArray(response?.data) ? response.data : [];
        this.intervals = data.map(interval => this.normalizeInterval(interval));
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

  private normalizeInterval(interval: any): CourseInterval {
    const normalized: CourseInterval = {
      ...interval,
      discounts: Array.isArray(interval?.discounts)
        ? interval.discounts.map((discount: any) => ({
            id: discount?.id,
            days: Number(discount?.days ?? discount?.min_days ?? 0) || 1,
            type: discount?.type === 'fixed_amount' ? 'fixed' : (discount?.type ?? 'percentage'),
            value: Number(discount?.value ?? discount?.discount_value ?? 0) || 0
          }))
        : []
    };

    return normalized;
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

  openDiscountsEditor(interval: CourseInterval): void {
    if (!interval?.id) {
      return;
    }

    this.selectedIntervalForDiscounts = interval;
    this.discountsLoading = true;
    this.discountsSaving = false;
    this.intervalDiscounts = [];

    this.intervalsService.getIntervalDiscounts(interval.id).subscribe({
      next: (response) => {
        const discounts = Array.isArray(response?.data) ? response.data : [];
        if (discounts.length > 0) {
          this.intervalDiscounts = discounts.map((discount: any) => this.normalizeIntervalDiscount(discount));
        } else {
          this.intervalDiscounts = [this.createDefaultDiscountRow()];
        }
        this.sortIntervalDiscounts();
        this.discountsLoading = false;
      },
      error: (error) => {
        console.error('Error loading interval discounts:', error);
        this.snackBar.open('Error al cargar los descuentos del intervalo', 'Cerrar', { duration: 3000 });
        this.intervalDiscounts = [this.createDefaultDiscountRow()];
        this.discountsLoading = false;
      }
    });
  }

  closeDiscountsEditor(): void {
    this.selectedIntervalForDiscounts = null;
    this.intervalDiscounts = [];
    this.discountsLoading = false;
    this.discountsSaving = false;
  }

  addDiscountRow(): void {
    this.intervalDiscounts.push(this.createDefaultDiscountRow(this.getNextDiscountDay()));
    this.sortIntervalDiscounts();
  }

  removeDiscountRow(index: number): void {
    if (index < 0 || index >= this.intervalDiscounts.length) {
      return;
    }
    this.intervalDiscounts.splice(index, 1);
  }

  saveIntervalDiscounts(): void {
    if (!this.selectedIntervalForDiscounts?.id) {
      return;
    }

    if (this.intervalDiscounts.length === 0) {
      this.snackBar.open('Añade al menos una regla de descuento', 'Cerrar', { duration: 3000 });
      return;
    }

    const seenDays = new Set<number>();
    for (const discount of this.intervalDiscounts) {
      if (!discount.days || discount.days < 1) {
        this.snackBar.open('Los días deben ser números positivos', 'Cerrar', { duration: 3000 });
        return;
      }
      if (discount.value < 0) {
        this.snackBar.open('El valor del descuento no puede ser negativo', 'Cerrar', { duration: 3000 });
        return;
      }
      if (seenDays.has(discount.days)) {
        this.snackBar.open('No puede haber más de un descuento para el mismo número de días', 'Cerrar', { duration: 4000 });
        return;
      }
      seenDays.add(discount.days);
    }

    const payload = this.intervalDiscounts
      .map(discount => ({
        days: discount.days,
        type: discount.type,
        value: discount.value
      }))
      .sort((a, b) => a.days - b.days);

    this.discountsSaving = true;

    this.intervalsService.saveIntervalDiscounts(this.selectedIntervalForDiscounts.id, payload).subscribe({
      next: () => {
        this.selectedIntervalForDiscounts.discounts = payload.map(item => ({
          days: item.days,
          type: item.type,
          value: item.value
        }));
        this.snackBar.open('Descuentos guardados correctamente', 'Cerrar', { duration: 3000 });
        this.discountsSaving = false;
      },
      error: (error) => {
        console.error('Error saving interval discounts:', error);
        this.snackBar.open('No se pudieron guardar los descuentos', 'Cerrar', { duration: 3000 });
        this.discountsSaving = false;
      }
    });
  }

  get hasDiscountEditor(): boolean {
    return !!this.selectedIntervalForDiscounts;
  }

  private createDefaultDiscountRow(days: number = 2): IntervalDiscountForm {
    return {
      days,
      type: 'percentage',
      value: 10
    };
  }

  private normalizeIntervalDiscount(discount: any): IntervalDiscountForm {
    const rawType = discount?.type ?? discount?.discount_type;
    const normalizedType = rawType === 'fixed' || rawType === 'fixed_amount' ? 'fixed' : 'percentage';

    return {
      id: discount?.id,
      days: Number(discount?.days ?? discount?.min_days ?? 0) || 1,
      type: normalizedType,
      value: Number(discount?.value ?? discount?.discount_value ?? 0) || 0
    };
  }

  private sortIntervalDiscounts(): void {
    this.intervalDiscounts = [...this.intervalDiscounts].sort((a, b) => a.days - b.days);
  }

  private getNextDiscountDay(): number {
    if (this.intervalDiscounts.length === 0) {
      return 2;
    }
    return Math.max(...this.intervalDiscounts.map(discount => discount.days)) + 1;
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
