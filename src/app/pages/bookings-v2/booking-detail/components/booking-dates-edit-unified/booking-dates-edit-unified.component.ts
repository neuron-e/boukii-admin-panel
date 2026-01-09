import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { ApiCrudService } from '../../../../../../service/crud.service';
import { UtilsService } from '../../../../../../service/utils.service';

export interface BookingEditData {
  course: any;
  utilizers: any[];
  sportLevel: any;
  initialData: any[];
  groupedActivities: any[];
}

export interface PriceChange {
  type: 'add' | 'remove' | 'none';
  oldPrice: number;
  newPrice: number;
  difference: number;
  affectedDates: { date: string; action: 'add' | 'remove' }[];
}

@Component({
  selector: 'app-booking-dates-edit-unified',
  templateUrl: './booking-dates-edit-unified.component.html',
  styleUrls: ['./booking-dates-edit-unified.component.scss']
})
export class BookingDatesEditUnifiedComponent implements OnInit {
  stepForm: FormGroup;
  course: any;
  utilizers: any[];
  utilizersDisplayNames = '';
  sportLevel: any;
  initialData: any[];
  groupedActivities: any[];

  // Course type flags
  isPrivate: boolean = false;
  isCollective: boolean = false;
  isFlex: boolean = false;
  isFix: boolean = false;

  // Intervals and flags
  hasIntervals: boolean = false;
  selectedIntervalId: string | null = null;
  intervals: any[] = [];
  availableDates: any[] = [];

  // Flags from course/interval
  mustBeConsecutive: boolean = false;
  mustStartFromFirst: boolean = false;
  isPackageMode: boolean = false;
  maxSelectableDates: number | null = null;

  // Price calculation
  originalPrice: number = 0;
  currentPrice: number = 0;
  priceChange: PriceChange | null = null;

  // Extras
  posibleExtras: any[] = [];
  totalExtraPrice: number[] = [];

  // Warnings
  warnings: string[] = [];
  errors: string[] = [];

  constructor(
    private fb: FormBuilder,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    public translateService: TranslateService,
    protected utilsService: UtilsService,
    @Inject(MAT_DIALOG_DATA) public data: BookingEditData,
    private dialogRef: MatDialogRef<BookingDatesEditUnifiedComponent>
  ) {
    this.course = data.course;
    this.utilizers = data.utilizers || [];
    this.utilizersDisplayNames = this.computeUtilizersDisplay(this.utilizers);
    this.sportLevel = data.sportLevel;
    this.initialData = data.initialData || [];
    this.groupedActivities = data.groupedActivities || [];
    this.stepForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.detectCourseType();
    this.detectIntervalsAndFlags();
    this.calculateOriginalPrice();
    this.initializeForm();
    this.generateWarnings();
  }

  private computeUtilizersDisplay(utilizers: any[]): string {
    return utilizers
      .map(utilizer => {
        const firstName = utilizer?.first_name ?? '';
        const lastName = utilizer?.last_name ?? '';
        return `${firstName} ${lastName}`.trim();
      })
      .filter(name => name.length > 0)
      .join(', ');
  }

  /**
   * Detecta el tipo de curso (privado/colectivo, flex/fix)
   */
  private detectCourseType(): void {
    this.isPrivate = this.course.course_type === 2;
    this.isCollective = this.course.course_type === 1;
    this.isFlex = this.course.is_flexible === true || this.course.is_flexible === 1;
    this.isFix = !this.isFlex;
  }

  /**
   * Detecta si el curso tiene intervalos y sus flags
   */
  private detectIntervalsAndFlags(): void {
    // Detectar intervalos
    this.intervals = this.course.course_intervals || [];
    this.hasIntervals = this.intervals.length > 0;

    // Si hay initial data, detectar el intervalo seleccionado
    if (this.initialData.length > 0 && this.hasIntervals) {
      const firstDate = this.initialData[0];
      this.selectedIntervalId = this.findIntervalForDate(firstDate.date);
    }

    // Obtener flags del curso o intervalo seleccionado
    const source = this.selectedIntervalId
      ? this.intervals.find(i => this.normalizeIntervalId(i) === this.selectedIntervalId)
      : this.course.course_settings;

    if (source) {
      this.mustBeConsecutive = this.checkMustBeConsecutive(source);
      this.mustStartFromFirst = source.must_start_from_first_day === 1 || source.must_start_from_first_day === true;
      this.isPackageMode = source.booking_mode === 'package';
      this.maxSelectableDates = source.limits_selectable_dates === 1 ? source.max_selectable_dates : null;
    }

    // Obtener extras
    this.posibleExtras = this.course.course_extras || [];
  }

  private normalizeIntervalId(interval: any): string {
    if (interval.id !== undefined && interval.id !== null) {
      return `interval_${interval.id}`;
    }
    if (interval.week_number !== undefined && interval.week_number !== null) {
      return `week_${interval.week_number}`;
    }
    return '';
  }

  private findIntervalForDate(dateStr: string): string | null {
    for (const interval of this.intervals) {
      const intervalDates = interval.interval_dates || [];
      if (intervalDates.some((d: any) => d.date === dateStr)) {
        return this.normalizeIntervalId(interval);
      }
    }
    return null;
  }

  private checkMustBeConsecutive(source: any): boolean {
    if (source.booking_mode === 'package') return true;
    if (source.config_mode === 'custom' && source.date_generation_method === 'consecutive') return true;
    if (source.consecutive_days === 1 || source.consecutive_days === true) return true;
    return false;
  }

  /**
   * Calcula el precio original de la reserva
   */
  private calculateOriginalPrice(): void {
    this.originalPrice = this.initialData.reduce((total, date) => {
      let datePrice = parseFloat(date.price || this.course.price || 0);

      // Sumar extras
      if (date.extras && date.extras.length > 0) {
        const extrasPrice = date.extras.reduce((sum: number, extra: any) =>
          sum + parseFloat(extra.price || 0), 0);
        datePrice += extrasPrice;
      }

      return total + datePrice;
    }, 0);

    this.currentPrice = this.originalPrice;
  }

  /**
   * Inicializa el formulario según el tipo de curso
   */
  private initializeForm(): void {
    if (this.isFix && this.isCollective) {
      this.initializeCollectiveFixForm();
    } else if (this.isFlex && this.isCollective) {
      this.initializeCollectiveFlexForm();
    } else if (this.isFix && this.isPrivate) {
      this.initializePrivateFixForm();
    } else if (this.isFlex && this.isPrivate) {
      this.initializePrivateFlexForm();
    }
  }

  /**
   * COLECTIVO FIX: No se puede editar fechas, solo cancelar completo
   */
  private initializeCollectiveFixForm(): void {
    this.errors.push(this.translateService.instant('booking_edit_collective_fix_not_editable'));
    // No crear formulario, mostrar solo mensaje
  }

  /**
   * COLECTIVO FLEX: Añadir/quitar fechas con validación de intervalos/flags
   */
  private initializeCollectiveFlexForm(): void {
    const courseDatesArray = this.fb.array(
      this.getAvailableDatesForSelection().map((date, index) => {
        const isInitiallySelected = this.initialData.some(d => d.date === date.date);
        const initialExtras = isInitiallySelected
          ? this.initialData.find(d => d.date === date.date)?.extras || []
          : [];

        return this.createCourseDateGroup(date, isInitiallySelected, initialExtras);
      }),
      this.atLeastOneSelectedValidator
    );

    this.stepForm.addControl('course_dates', courseDatesArray);
    this.totalExtraPrice = new Array(courseDatesArray.length).fill(0);

    // Calcular precios de extras iniciales
    courseDatesArray.controls.forEach((control, index) => {
      this.onExtraChange(index);
    });
  }

  /**
   * PRIVADO FIX: Cambiar fecha/hora de la sesión única
   */
  private initializePrivateFixForm(): void {
    const initialDate = this.initialData[0];

    this.stepForm = this.fb.group({
      date: [initialDate?.date || '', Validators.required],
      startHour: [initialDate?.startHour || '', Validators.required],
      endHour: [initialDate?.endHour || '', Validators.required],
      monitor: [initialDate?.monitor || null]
    });
  }

  /**
   * PRIVADO FLEX: Similar a colectivo flex
   */
  private initializePrivateFlexForm(): void {
    this.initializeCollectiveFlexForm();
  }

  /**
   * Obtiene las fechas disponibles según intervalos y flags
   */
  private getAvailableDatesForSelection(): any[] {
    let dates: any[] = [];

    if (this.hasIntervals && this.selectedIntervalId) {
      // Filtrar fechas del intervalo seleccionado
      const interval = this.intervals.find(i => this.normalizeIntervalId(i) === this.selectedIntervalId);
      dates = interval?.interval_dates || [];
    } else {
      // Todas las fechas del curso
      dates = this.course.course_dates || [];
    }

    // Filtrar fechas futuras con capacidad
    const now = moment();
    return dates.filter(date => {
      const dateMoment = moment(date.date);
      const isToday = dateMoment.isSame(now, 'day');
      const isInFuture = dateMoment.isAfter(now, 'day');
      const hourStartMoment = moment(date.hour_start, 'HH:mm');
      const isValidToday = isToday && hourStartMoment.isAfter(now);

      const hasCapacity = this.checkCapacity(date);

      return (isInFuture || isValidToday) && hasCapacity;
    });
  }

  private checkCapacity(date: any): boolean {
    if (this.isPrivate) return true; // Privadas siempre tienen capacidad para el mismo cliente

    // Para colectivas, verificar si hay monitor asignado con espacio
    const monitor = this.findMonitor(date);
    return !!monitor;
  }

  private findMonitor(courseDate: any): any {
    const matchingGroup = courseDate.course_groups?.find((group: any) =>
      group.degree_id === this.sportLevel.id
    );

    if (matchingGroup) {
      const availableSubgroup = matchingGroup.course_subgroups?.find((subgroup: any) =>
        (subgroup.booking_users || []).length < subgroup.max_participants
      );
      return availableSubgroup?.monitor || null;
    }

    return null;
  }

  private createCourseDateGroup(courseDate: any, selected: boolean = false, extras: any[] = []): FormGroup {
    const monitor = this.findMonitor(courseDate);
    const group = this.fb.group({
      selected: [selected],
      date: [courseDate.date],
      startHour: [courseDate.hour_start],
      endHour: [courseDate.hour_end],
      price: [parseFloat(this.course.price || 0)],
      currency: [this.course.currency || 'CHF'],
      extras: this.fb.control<any[]>({ value: [], disabled: !selected || !this.posibleExtras.length }),
      monitor: [monitor],
      course_date_id: [courseDate.id]
    });

    if (extras.length > 0) {
      const validExtras = this.posibleExtras.filter(extra =>
        extras.some(initialExtra => initialExtra.id === extra.id)
      );
      const extrasControl = group.get('extras') as FormControl<any[]> | null;
      extrasControl?.patchValue(validExtras);
    }

    return group;
  }

  /**
   * Genera warnings según el tipo de curso y cambios
   */
  private generateWarnings(): void {
    this.warnings = [];

    if (this.isFix && this.isCollective) {
      this.warnings.push(this.translateService.instant('booking_edit_warning_collective_fix'));
    } else if (this.isFlex) {
      this.warnings.push(this.translateService.instant('booking_edit_warning_flex_add_remove'));
    }

    if (this.mustBeConsecutive) {
      this.warnings.push(this.translateService.instant('booking_dates_must_be_consecutive'));
    }

    if (this.mustStartFromFirst) {
      this.warnings.push(this.translateService.instant('booking_must_start_from_first_day'));
    }

    if (this.isPackageMode) {
      this.warnings.push(this.translateService.instant('booking_package_requires_all_dates'));
    }
  }

  /**
   * Validador personalizado: al menos una fecha seleccionada
   */
  private atLeastOneSelectedValidator(formArray: FormArray): { [key: string]: boolean } | null {
    const selectedDates = formArray.controls.some(control => control.get('selected')?.value);
    return selectedDates ? null : { noDatesSelected: true };
  }

  /**
   * Handler: Selección de fecha
   */
  onDateSelect(event: any, index: number): void {
    const isChecked = event.checked;
    const courseDateGroup = this.courseDatesArray.at(index) as FormGroup;
    const extrasControl = courseDateGroup.get('extras');

    if (isChecked) {
      // Validar disponibilidad
      this.checkAvailability(index).then(isAvailable => {
        if (isAvailable) {
          extrasControl?.enable();
          this.validateConsecutiveDates();
          this.calculateCurrentPrice();
        } else {
          courseDateGroup.get('selected')?.setValue(false);
          extrasControl?.disable();
          extrasControl?.setValue([]);
        }
      });
    } else {
      extrasControl?.disable();
      extrasControl?.setValue([]);
      this.calculateCurrentPrice();
    }
  }

  /**
   * Verifica disponibilidad de la fecha (solapamientos, capacidad)
   */
  private checkAvailability(index: number): Promise<boolean> {
    return new Promise(resolve => {
      const courseDateGroup = this.courseDatesArray.at(index) as FormGroup;

      const checkData = {
        bookingUsers: this.utilizers.map(utilizer => ({
          client_id: utilizer.id,
          hour_start: courseDateGroup.get('startHour')?.value,
          hour_end: courseDateGroup.get('endHour')?.value,
          date: moment(courseDateGroup.get('date')?.value).format('YYYY-MM-DD')
        })),
        bookingUserIds: []
      };

      // Verificar solapamiento local
      if (this.checkLocalOverlap(checkData.bookingUsers)) {
        this.snackbar.open(
          this.translateService.instant('snackbar.booking.localOverlap'),
          'OK',
          { duration: 3000 }
        );
        resolve(false);
        return;
      }

      // Verificar en servidor
      this.crudService.post('/admin/bookings/checkbooking', checkData)
        .subscribe({
          next: (response: any) => resolve(response.success),
          error: (error) => {
            const overlapMessage = this.utilsService.formatBookingOverlapMessage(error.error?.data);
            this.snackbar.open(overlapMessage, 'OK', {
              duration: 4000,
              panelClass: ['snackbar-multiline']
            });
            resolve(false);
          }
        });
    });
  }

  private checkLocalOverlap(bookingUsers: any[]): boolean {
    for (const activity of this.groupedActivities) {
      for (const bookingUser of bookingUsers) {
        const matchingUtilizer = activity.utilizers?.find(
          (utilizer: any) => utilizer.id === bookingUser.client_id
        );

        if (matchingUtilizer) {
          for (const activityDate of activity.dates) {
            const formattedActivityDate = moment(activityDate.date).format('YYYY-MM-DD');
            const formattedBookingDate = moment(bookingUser.date).format('YYYY-MM-DD');

            if (formattedBookingDate === formattedActivityDate) {
              if (bookingUser.hour_start < activityDate.endHour &&
                  activityDate.startHour < bookingUser.hour_end) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Valida que las fechas seleccionadas sean consecutivas (dentro del intervalo)
   */
  private validateConsecutiveDates(): void {
    if (!this.mustBeConsecutive) return;

    const selectedDates = this.getSelectedDates();
    if (selectedDates.length <= 1) return;

    const allAvailableDates = this.getAvailableDatesForSelection().map(d => d.date);
    const sortedSelected = selectedDates.sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );

    // Verificar que sean consecutivas dentro del array de disponibles
    const selectedIndices = sortedSelected.map(date => allAvailableDates.indexOf(date));

    for (let i = 1; i < selectedIndices.length; i++) {
      if (selectedIndices[i] !== selectedIndices[i - 1] + 1) {
        this.errors.push(this.translateService.instant('booking_dates_must_be_consecutive'));
        return;
      }
    }

    // Limpiar error si todo está bien
    this.errors = this.errors.filter(e =>
      e !== this.translateService.instant('booking_dates_must_be_consecutive')
    );
  }

  private getSelectedDates(): string[] {
    return this.courseDatesArray.controls
      .filter(control => control.get('selected')?.value)
      .map(control => control.get('date')?.value);
  }

  /**
   * Calcula el precio actual y el cambio
   */
  private calculateCurrentPrice(): void {
    this.currentPrice = this.courseDatesArray.controls.reduce((total, control, index) => {
      if (!control.get('selected')?.value) return total;

      let datePrice = parseFloat(control.get('price')?.value || 0);
      datePrice += this.totalExtraPrice[index] || 0;

      return total + datePrice;
    }, 0);

    this.calculatePriceChange();
  }

  private calculatePriceChange(): void {
    const difference = this.currentPrice - this.originalPrice;

    if (Math.abs(difference) < 0.01) {
      this.priceChange = null;
      return;
    }

    const selectedDates = this.getSelectedDates();
    const originalDates = this.initialData.map(d => d.date);

    const addedDates = selectedDates.filter(d => !originalDates.includes(d));
    const removedDates = originalDates.filter(d => !selectedDates.includes(d));

    const affectedDates: { date: string; action: 'add' | 'remove' }[] = [
      ...addedDates.map(date => ({ date, action: 'add' as const })),
      ...removedDates.map(date => ({ date, action: 'remove' as const }))
    ];

    this.priceChange = {
      type: difference > 0 ? 'add' : 'remove',
      oldPrice: this.originalPrice,
      newPrice: this.currentPrice,
      difference: Math.abs(difference),
      affectedDates
    };
  }

  /**
   * Handler: Cambio de extras
   */
  onExtraChange(index: number): void {
    const selectedExtras = this.courseDatesArray.at(index).get('extras')?.value || [];
    this.totalExtraPrice[index] = selectedExtras.reduce(
      (acc: number, extra: any) => acc + parseFloat(extra.price || 0),
      0
    );
    this.calculateCurrentPrice();
  }

  /**
   * Getters
   */
  get courseDatesArray(): FormArray {
    return this.stepForm.get('course_dates') as FormArray;
  }

  isSelected(index: number): boolean {
    return this.courseDatesArray.at(index).get('selected')?.value || false;
  }

  formatDate(date: string): string {
    return this.utilsService.formatDate(date);
  }

  isFormValid(): boolean {
    if (this.isFix && this.isCollective) return false;
    if (this.errors.length > 0) return false;
    return this.stepForm.valid;
  }

  /**
   * Submit form
   */
  submitForm(): void {
    if (!this.isFormValid()) {
      this.snackbar.open(
        this.translateService.instant('please_complete_required_fields'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.dialogRef.close({
      ...this.stepForm.value,
      priceChange: this.priceChange
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
