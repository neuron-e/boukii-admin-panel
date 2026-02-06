import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { ApiCrudService } from '../../../../../../service/crud.service';
import { firstValueFrom } from 'rxjs';
import { UtilsService } from '../../../../../../service/utils.service';
import { applyFlexibleDiscount, buildDiscountInfoList, getApplicableDiscounts, resolveIntervalName } from 'src/app/pages/bookings-v2/shared/discount-utils';

export interface BookingEditData {
  course: any;
  utilizers: any[];
  sportLevel: any;
  initialData: any[];
  groupedActivities: any[];
  isPaid?: boolean;
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
  isPaid: boolean = false;
  isEditingContext: boolean = false;

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
  limitedEditMode: boolean = true;

  // Extras
  posibleExtras: any[] = [];
  totalExtraPrice: number[] = [];
  availableMonitorsByIndex: Record<number, any[]> = {};
  loadingMonitorsByIndex: Record<number, boolean> = {};

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
    this.isPaid = data.isPaid ?? false;
    this.isEditingContext = this.initialData.length > 0;
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
    this.limitedEditMode = this.isPrivate && this.isPaid;
  }

  /**
   * Detecta si el curso tiene intervalos y sus flags
   */
  private detectIntervalsAndFlags(): void {
    // Detectar intervalos
    this.intervals = this.course.course_intervals || [];
    this.hasIntervals = this.intervals.length > 0;
    if (!this.hasIntervals) {
      this.intervals = this.buildIntervalsFromSettings();
      this.hasIntervals = this.intervals.length > 0;
    }

    // Si hay initial data, detectar el intervalo seleccionado
    if (this.initialData.length > 0) {
      const firstDate = this.initialData[0];
      if (firstDate?.interval_id && !this.hasIntervals) {
        const courseDates = Array.isArray(this.course?.course_dates) ? this.course.course_dates : [];
        this.intervals = [{
          id: firstDate.interval_id,
          week_number: null,
          name: resolveIntervalName(this.course, String(firstDate.interval_id)) ?? null,
          interval_dates: courseDates.filter((date: any) => String(date.interval_id) === String(firstDate.interval_id))
        }];
        this.hasIntervals = this.intervals.length > 0;
      }
      if (this.hasIntervals) {
        this.selectedIntervalId = this.findIntervalForDate(firstDate.date);
      }
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
    const normalized = this.normalizeDate(dateStr);
    for (const interval of this.intervals) {
      const intervalDates = interval.interval_dates || [];
      if (intervalDates.some((d: any) => this.normalizeDate(d.date) === normalized)) {
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

  private buildIntervalsFromSettings(): any[] {
    const settingsRaw = this.course?.settings;
    let settings = settingsRaw;
    if (typeof settingsRaw === 'string') {
      try {
        settings = JSON.parse(settingsRaw);
      } catch {
        settings = null;
      }
    }
    const intervals = Array.isArray(settings?.intervals) ? settings.intervals : [];
    if (!intervals.length) return [];

    const courseDates = Array.isArray(this.course?.course_dates) ? this.course.course_dates : [];
    return intervals.map((interval: any) => {
      const id = interval?.id ?? interval?.week_number ?? null;
      const intervalDates = courseDates.filter((date: any) => String(date.interval_id) === String(id));
      return {
        id,
        week_number: interval?.week_number ?? null,
        name: interval?.name ?? null,
        interval_dates: intervalDates
      };
    });
  }

  private calculateFlexTotal(dates: any[]): number {
    if (!Array.isArray(dates) || dates.length === 0) {
      return 0;
    }
    const grouped = new Map<string, any[]>();
    dates.forEach((date: any) => {
      const key = date?.interval_id ? String(date.interval_id) : 'default';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(date);
    });

    let total = 0;
    grouped.forEach((datesInInterval, intervalId) => {
      const baseTotal = datesInInterval.reduce((acc: number, date: any) => {
        let value = parseFloat((date?.price ?? this.course?.price ?? this.course?.minPrice ?? 0).toString()) || 0;
        if (Array.isArray(date?.extras) && date.extras.length > 0) {
          const extrasPrice = date.extras.reduce((sum: number, extra: any) =>
            sum + parseFloat(extra.price || 0), 0);
          value += extrasPrice;
        }
        return acc + value;
      }, 0);

      const applicableDiscounts = getApplicableDiscounts(
        this.course,
        intervalId !== 'default' ? intervalId : undefined
      );
      const discountedTotal = applyFlexibleDiscount(baseTotal, datesInInterval.length, applicableDiscounts);
      total += discountedTotal;
    });

    return total;
  }

  /**
   * Calcula el precio original de la reserva
   */
  private calculateOriginalPrice(): void {
    if (this.isFlex) {
      this.originalPrice = this.calculateFlexTotal(this.initialData);
    } else {
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
    }

    this.currentPrice = this.originalPrice;
  }

  /**
   * Inicializa el formulario según el tipo de curso
   */
  private initializeForm(): void {
    if (this.isFix && this.isCollective) {
      this.initializeCollectiveFixForm();
    } else if (this.limitedEditMode) {
      this.initializeEditOnlyForm();
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
   * EDIT ONLY: permite mover fechas existentes sin añadir/quitar ni recalcular precio
   */
  private initializeEditOnlyForm(): void {
    this.availableDates = this.getAvailableDatesForSelection();
    // Ensure current dates are selectable even if not in available list
    const existingDates = new Set(this.availableDates.map(d => d.date));
    this.initialData.forEach((date) => {
      if (date?.date && !existingDates.has(date.date)) {
        this.availableDates.push({
          date: date.date,
          hour_start: date.startHour,
          hour_end: date.endHour
        });
        existingDates.add(date.date);
      }
    });
    this.availableDates = this.availableDates
      .filter(d => d?.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    const datesArray = this.fb.array(
      this.initialData.map((date) => {
        const durationMinutes = this.getDurationMinutes(date.startHour, date.endHour);
        const bookingUser = Array.isArray(date?.booking_users) ? date.booking_users[0] : null;
        const bookingUserId = bookingUser?.id ?? date.booking_user_id ?? date.bookingUserId ?? null;
        const startHour = date.startHour ?? bookingUser?.hour_start ?? date.hour_start ?? '';
        const endHour = date.endHour ?? bookingUser?.hour_end ?? date.hour_end ?? '';
        const monitor = date.monitor ?? bookingUser?.monitor ?? null;
        const monitorId = date.monitor_id ?? bookingUser?.monitor_id ?? monitor?.id ?? null;
        return this.fb.group({
          source: [date],
          date: [date.date, Validators.required],
          startHour: [startHour, Validators.required],
          endHour: [endHour, Validators.required],
          durationMinutes: [durationMinutes],
          lastValidStart: [startHour],
          lastValidEnd: [endHour],
          course_date_id: [date.course_date_id ?? date.course_date?.id ?? null],
          booking_user_id: [bookingUserId],
          monitor_id: [monitorId],
          monitor: [monitor],
          price: [date.price],
          currency: [date.currency],
          extras: [date.extras || []]
        });
      })
    );

    this.stepForm.addControl('edit_dates', datesArray);
    this.priceChange = null;
    if (this.isPrivate) {
      this.editDatesArray.controls.forEach((_, index) => this.loadAvailableMonitors(index));
    }
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

      const hasCapacity = this.isEditingContext ? true : this.checkCapacity(date);

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
      interval_id: [courseDate.interval_id ?? courseDate.interval?.id ?? null],
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
    } else if (this.isFlex && !this.limitedEditMode) {
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
      const dateValue = courseDateGroup.get('date')?.value;
      const isOriginallySelected = this.isDateOriginallySelected(dateValue);
      if (this.isPaid && this.isCollective && this.isFlex && !isOriginallySelected) {
        courseDateGroup.get('selected')?.setValue(false);
        extrasControl?.disable();
        extrasControl?.setValue([]);
        this.snackbar.open(
          this.translateService.instant('snackbar.booking.max_dates_reached'),
          'OK',
          { duration: 3000 }
        );
        return;
      }
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

  private checkLocalOverlap(bookingUsers: any[], ignoreBookingUserIds: number[] = []): boolean {
    for (const activity of this.groupedActivities) {
      for (const bookingUser of bookingUsers) {
        const matchingUtilizer = activity.utilizers?.find(
          (utilizer: any) => utilizer.id === bookingUser.client_id
        );

        if (matchingUtilizer) {
          for (const activityDate of activity.dates) {
            const activityBookingUserId = activityDate.booking_user_id ?? activityDate.id;
            if (ignoreBookingUserIds.includes(activityBookingUserId)) {
              continue;
            }
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

  getIntervalEditGroups(): Array<{ id: string | null; label: string; dates: Array<{ control: FormGroup; index: number }>; discounts: any[] }> {
    const groups = new Map<string, { id: string | null; label: string; dates: Array<{ control: FormGroup; index: number }>; discounts: any[] }>();
    this.courseDatesArray.controls.forEach((control, index) => {
      const intervalId = (control.get('interval_id')?.value ?? null);
      const key = intervalId ? String(intervalId) : 'default';
      if (!groups.has(key)) {
        groups.set(key, {
          id: intervalId,
          label: this.resolveIntervalLabel(intervalId),
          dates: [],
          discounts: []
        });
      }
      groups.get(key)!.dates.push({ control: control as FormGroup, index });
    });

    groups.forEach((group) => {
      const selectedDates = group.dates
        .filter(item => item.control.get('selected')?.value)
        .map(item => ({
          ...item.control.value,
          interval_id: item.control.get('interval_id')?.value ?? null,
          date: item.control.get('date')?.value
        }));
      group.discounts = buildDiscountInfoList(this.course, selectedDates);
    });

    return Array.from(groups.values());
  }

  private resolveIntervalLabel(intervalId: string | null): string {
    if (!intervalId) {
      return this.translateService.instant('interval');
    }
    const fromSettings = resolveIntervalName(this.course, String(intervalId));
    if (fromSettings) return fromSettings;
    const fromIntervals = this.intervals.find(i => String(i.id) === String(intervalId) || String(i.week_number) === String(intervalId));
    return fromIntervals?.name ?? `${this.translateService.instant('interval')} ${intervalId}`;
  }

  isDateOriginallySelected(dateValue: string): boolean {
    const normalized = this.normalizeDate(dateValue);
    return this.initialData.some(d => this.normalizeDate(d.date) === normalized);
  }

  /**
   * Calcula el precio actual y el cambio
   */
  private calculateCurrentPrice(): void {
    if (this.isFlex) {
      const selectedDates = this.courseDatesArray.controls
        .filter(control => control.get('selected')?.value)
        .map((control, index) => ({
          ...control.value,
          extras: control.get('extras')?.value || [],
          price: control.get('price')?.value,
          interval_id: control.get('interval_id')?.value ?? control.get('interval_id')?.value,
          date: control.get('date')?.value
        }));
      this.currentPrice = this.calculateFlexTotal(selectedDates);
    } else {
      this.currentPrice = this.courseDatesArray.controls.reduce((total, control, index) => {
        if (!control.get('selected')?.value) return total;

        let datePrice = parseFloat(control.get('price')?.value || 0);
        datePrice += this.totalExtraPrice[index] || 0;

        return total + datePrice;
      }, 0);
    }

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

  get editDatesArray(): FormArray {
    return this.stepForm.get('edit_dates') as FormArray;
  }

  isSelected(index: number): boolean {
    return this.courseDatesArray.at(index).get('selected')?.value || false;
  }

  formatDate(date: string): string {
    return this.utilsService.formatDate(date);
  }

  isFormValid(): boolean {
    if (this.isFix && this.isCollective) return false;
    if (this.limitedEditMode) return true;
    if (this.errors.length > 0) return false;
    return this.stepForm.valid;
  }

  /**
   * Submit form
   */
  async submitForm(): Promise<void> {
    if (!this.isFormValid() && !this.limitedEditMode) {
      this.snackbar.open(
        this.translateService.instant('please_complete_required_fields'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (this.limitedEditMode) {
      try {
        const isValid = await this.validateEditedDates();
        if (!isValid) return;
        this.dialogRef.close({
          course_dates: this.buildEditedDatesPayload(),
          priceChange: null,
          keepTotal: true,
          total: this.originalPrice
        });
      } catch {
        this.snackbar.open(
          this.translateService.instant('snackbar.booking.payment.error'),
          'OK',
          { duration: 3000 }
        );
      }
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

  private async validateEditedDates(): Promise<boolean> {
    if (!this.editDatesArray || this.editDatesArray.length === 0) {
      this.snackbar.open(
        this.translateService.instant('please_complete_required_fields'),
        'OK',
        { duration: 3000 }
      );
      return false;
    }
    for (let i = 0; i < this.editDatesArray.length; i += 1) {
      const group = this.editDatesArray.at(i) as FormGroup;
      const selectedDate = group.get('date')?.value;
      const dateConfig = this.availableDates.find(d => d.date === selectedDate);
      const durationMinutes = group.get('durationMinutes')?.value ?? 0;
      const startHour = group.get('startHour')?.value;
      if (!selectedDate || !startHour) {
        this.snackbar.open(
          this.translateService.instant('please_complete_required_fields'),
          'OK',
          { duration: 3000 }
        );
        return false;
      }
      if (!this.isPrivate && !this.isStartWithinDateRange(dateConfig, startHour, durationMinutes)) {
        this.snackbar.open(
          this.translateService.instant('snackbar.booking.time_out_of_range'),
          'OK',
          { duration: 3000 }
        );
        return false;
      }
      const isAvailable = await this.checkEditAvailability(i);
      if (!isAvailable) {
        return false;
      }
      if (this.isPrivate) {
        await this.loadAvailableMonitors(i);
        const monitorId = group.get('monitor_id')?.value;
        if (!monitorId) {
          this.snackbar.open(
            this.translateService.instant('snackbar.booking.user_no_monitor'),
            'OK',
            { duration: 3000 }
          );
          return false;
        }
        const list = this.availableMonitorsByIndex[i] || [];
        if (!list.some(m => m.id === monitorId)) {
          this.snackbar.open(
            this.translateService.instant('snackbar.booking.no_match'),
            'OK',
            { duration: 3000 }
          );
          return false;
        }
      }
    }
    return true;
  }

  onEditDateChange(index: number): void {
    const group = this.editDatesArray.at(index) as FormGroup;
    const selectedDate = group.get('date')?.value;
    const dateConfig = this.availableDates.find(d => d.date === selectedDate);
    if (!dateConfig) return;

    const durationMinutes = group.get('durationMinutes')?.value ?? 0;
    if (this.isCollective) {
      group.patchValue({
        startHour: dateConfig.hour_start,
        endHour: dateConfig.hour_end,
        lastValidStart: dateConfig.hour_start,
        lastValidEnd: dateConfig.hour_end
      }, { emitEvent: false });
      return;
    }

    const startHour = dateConfig.hour_start || group.get('startHour')?.value;
    const endHour = this.addMinutesToTime(startHour, durationMinutes);
    group.patchValue({
      startHour,
      endHour,
      lastValidStart: startHour,
      lastValidEnd: endHour
    }, { emitEvent: false });
    if (this.isPrivate) {
      this.loadAvailableMonitors(index);
    }
  }

  onEditTimeChange(index: number): void {
    if (!this.isPrivate) return;
    const group = this.editDatesArray.at(index) as FormGroup;
    const durationMinutes = group.get('durationMinutes')?.value ?? 0;
    const startHour = group.get('startHour')?.value;
    if (!startHour) return;
    const endHour = this.addMinutesToTime(startHour, durationMinutes);
    group.patchValue({ endHour }, { emitEvent: false });
    group.patchValue(
      { lastValidStart: startHour, lastValidEnd: endHour },
      { emitEvent: false }
    );
    if (this.isPrivate) {
      this.loadAvailableMonitors(index);
    }
  }

  private checkEditAvailability(index: number): Promise<boolean> {
    return new Promise(resolve => {
      const group = this.editDatesArray.at(index) as FormGroup;
      const bookingUserIds = this.editDatesArray.controls
        .map(control => (control as FormGroup).get('booking_user_id')?.value)
        .filter(Boolean);
      const bookingUsers = this.utilizers.map(utilizer => ({
        client_id: utilizer.id,
        hour_start: group.get('startHour')?.value,
        hour_end: group.get('endHour')?.value,
        date: moment(group.get('date')?.value).format('YYYY-MM-DD')
      }));

      if (!this.limitedEditMode && this.checkLocalOverlap(bookingUsers, bookingUserIds)) {
        this.snackbar.open(
          this.translateService.instant('snackbar.booking.localOverlap'),
          'OK',
          { duration: 3000 }
        );
        resolve(false);
        return;
      }

      this.crudService.post('/admin/bookings/checkbooking', {
        bookingUsers,
        bookingUserIds
      }).subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.snackbar.open(
              this.translateService.instant('snackbar.booking.localOverlap'),
              'OK',
              { duration: 3000 }
            );
          }
          resolve(!!response?.success);
        },
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

  private buildEditedDatesPayload(): any[] {
    return this.editDatesArray.controls.map((control) => {
      const group = control as FormGroup;
      const source = group.get('source')?.value || {};
      const durationMinutes = group.get('durationMinutes')?.value ?? 0;
      const startHour = group.get('startHour')?.value;
      const endHour = this.isPrivate
        ? this.addMinutesToTime(startHour, durationMinutes)
        : group.get('endHour')?.value;
      const bookingUserId = group.get('booking_user_id')?.value ?? source?.booking_user_id ?? null;
      const dateValue = group.get('date')?.value;
      const normalizedDate = this.normalizeDate(dateValue);
      const selectedDate = this.availableDates.find(d => this.normalizeDate(d.date) === normalizedDate);
      const sourceBookingUser = Array.isArray(source?.booking_users) ? source.booking_users[0] : null;
      const courseDateId = group.get('course_date_id')?.value
        ?? selectedDate?.id
        ?? selectedDate?.course_date_id
        ?? source?.course_date_id
        ?? sourceBookingUser?.course_date_id
        ?? source?.course_date?.id
        ?? null;
      const priceValue = sourceBookingUser?.price ?? source?.price;
      const bookingUsers = Array.isArray(source?.booking_users)
        ? source.booking_users.map((user: any) => ({ id: user.id }))
        : (bookingUserId ? [{ id: bookingUserId }] : []);
      return {
        ...source,
        selected: false,
        booking_users: bookingUsers,
        date: dateValue,
        startHour,
        endHour,
        course_date_id: courseDateId,
        monitor_id: group.get('monitor_id')?.value ?? source?.monitor_id ?? null,
        price: priceValue
      };
    });
  }

  private async loadAvailableMonitors(index: number): Promise<void> {
    if (!this.isPrivate) return;
    const group = this.editDatesArray.at(index) as FormGroup;
    const date = group.get('date')?.value;
    const startHour = group.get('startHour')?.value;
    const durationMinutes = group.get('durationMinutes')?.value ?? 0;
    if (!date || !startHour || durationMinutes <= 0) return;

    const endHour = this.addMinutesToTime(startHour, durationMinutes);
    this.loadingMonitorsByIndex[index] = true;
    const payload = {
      sportId: this.course?.sport_id,
      minimumDegreeId: this.sportLevel?.id,
      startTime: startHour.length <= 5 ? startHour : startHour.replace(':00', ''),
      endTime: endHour.length <= 5 ? endHour : endHour.replace(':00', ''),
      date: moment(date).format('YYYY-MM-DD'),
      clientIds: this.utilizers.map(u => u.id),
      bookingUserIds: this.initialData.map(d => d.id).filter(Boolean)
    };

    try {
      const response: any = await firstValueFrom(this.crudService.post('/admin/monitors/available', payload));
      const list = Array.isArray(response?.data) ? response.data : [];
      const currentMonitor = group.get('monitor')?.value;
      const currentMonitorId = group.get('monitor_id')?.value;
      if (currentMonitorId && currentMonitor && !list.some(m => m.id === currentMonitorId)) {
        list.unshift(currentMonitor);
      }
      this.availableMonitorsByIndex[index] = list;
      if (!this.availableMonitorsByIndex[index].length) {
        this.snackbar.open(this.translateService.instant('snackbar.booking.no_match'), 'OK', { duration: 3000 });
      }
    } catch (error) {
      this.availableMonitorsByIndex[index] = [];
    } finally {
      this.loadingMonitorsByIndex[index] = false;
    }
  }

  getAvailableMonitors(index: number): any[] {
    return this.availableMonitorsByIndex[index] || [];
  }

  private getDurationMinutes(start: string, end: string): number {
    if (!start || !end) return 0;
    const startMoment = moment(start, 'HH:mm');
    const endMoment = moment(end, 'HH:mm');
    return Math.max(0, endMoment.diff(startMoment, 'minutes'));
  }

  private isStartWithinDateRange(dateConfig: any, startHour: string, durationMinutes: number): boolean {
    if (!dateConfig?.hour_start || !dateConfig?.hour_end) return true;
    const rangeStart = this.timeToMinutes(dateConfig.hour_start);
    const rangeEnd = this.timeToMinutes(dateConfig.hour_end);
    const start = this.timeToMinutes(startHour);
    if (rangeStart === null || rangeEnd === null || start === null) return true;
    const maxStart = Math.max(rangeStart, rangeEnd - durationMinutes);
    return start >= rangeStart && start <= maxStart;
  }

  private timeToMinutes(time: string): number | null {
    if (!time) return null;
    const parts = time.split(':').map(part => parseInt(part, 10));
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
    const hours = parts[0];
    const minutes = parts[1];
    return hours * 60 + minutes;
  }

  private addMinutesToTime(start: string, minutes: number): string {
    return moment(start, 'HH:mm').add(minutes, 'minutes').format('HH:mm');
  }

  private normalizeDate(value: string): string {
    if (!value) return '';
    return moment(value).format('YYYY-MM-DD');
  }
}
