import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ChangeMonitorOption } from "src/app/static-data/changeMonitorOptions";
import { LangService } from "src/service/langService";
import { UtilsService } from "src/service/utils.service";
import { MatDialog } from '@angular/material/dialog';
import { FormDetailsPrivateComponent } from '../form-details-private/form-details-private.component';
import { FormDetailsColectiveFlexComponent } from '../form-details-colective-flex/form-details-colective-flex.component';
import { FormDetailsColectiveFixComponent } from '../form-details-colective-fix/form-details-colective-fix.component';
import { StepObservationsComponent } from '../step-observations/step-observations.component';
import { BookingDatesEditUnifiedComponent } from '../booking-dates-edit-unified/booking-dates-edit-unified.component';
import {TranslateService} from '@ngx-translate/core';
import {BookingService} from '../../../../../../service/bookings.service';
import {ApiCrudService} from '../../../../../../service/crud.service';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import { SchoolService } from 'src/service/school.service';
import { finalize } from 'rxjs';
import {
  AppliedDiscountInfo,
  applyFlexibleDiscount,
  buildDiscountInfoList,
  getApplicableDiscounts,
  resolveIntervalName
} from 'src/app/pages/bookings-v2/shared/discount-utils';
import {
  BookingDataService,
  FormattedActivityData,
  IntervalGroup
} from 'src/app/shared/services/booking-data.service';

export interface BookingDescriptionCardDate {
  date: string;
  startHour: string;
  endHour: string;
  price: string;
  currency: string;
  changeMonitorOption?: ChangeMonitorOption;
  monitor?: Record<string, any>;
  utilizer?: Record<string, any>[];
  utilizers?: Record<string, any>[];
  booking_users?: any[];
  extras?: Record<string, any>[];
}

@Component({
  selector: "booking-detail-description-card",
  templateUrl: "./booking-description-card.component.html",
  styleUrls: ["./booking-description-card.component.scss"],
})
export class BookingDescriptionCard implements OnChanges {
  @Output() editActivity = new EventEmitter();
  @Output() deleteActivity = new EventEmitter();

  @Input() utilizers: any;
  @Input() sport: any;
  @Input() sportLevel: any;
  @Input() allLevels: any;
  @Input() course: any;
  @Input() subgroupLabel: string | null = null;
  @Input()
  set dates(value: any[]) {
    this._dates = value || [];
    if (this._dates.length > 0) {
    }
    this.extractUniqueMonitors();
    this.refreshDiscountInfo();
  }

  get dates(): any[] {
    return this._dates;
  }
  @Input() monitors: any;
  @Input() clientObs: any;
  @Input() schoolObs: any;
  @Input() groupedActivities: any;
  @Input() total: any;
  @Input() priceFallback = false;
  @Input() summaryMode = false;
  @Input() isDetail = false;
  @Input() status = 1;
  @Input() index: number = 1;
  @Input() bookingId: number | null = null;
  @Input() isPaid: boolean | null = null;
  uniqueMonitors: any[] = []; // Monitores únicos
  private _dates: any[] = [];
  discountInfoList: AppliedDiscountInfo[] = [];
  intervalGroups: IntervalGroup[] = [];
  private loadingEditData = false;

  // Datos formateados desde el servicio (fuente única de verdad)
  formattedData: FormattedActivityData | null = null;

  constructor(
    public translateService: TranslateService,
    public bookingService: BookingService,
    protected langService: LangService,
    protected utilsService: UtilsService,
    public dialog: MatDialog,
    private bookingDataService: BookingDataService,
    private crudService: ApiCrudService,
    private schoolService: SchoolService
  ) {
    this.extractUniqueMonitors();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['course'] && !changes['course'].firstChange) ||
      (changes['dates'] && !changes['dates'].firstChange)) {
      this.refreshDiscountInfo();
    }
  }

  formatDate(date: string) {
    return this.utilsService.formatDate(date);
  }

  private extractUniqueMonitors() {
    // Mantener este método por compatibilidad, pero usar el servicio
    if (this.formattedData) {
      this.uniqueMonitors = this.formattedData.monitors.unique;
    } else if (this.dates.length) {
      const allMonitors = this.dates.map((date) => date.monitor).filter((monitor) => !!monitor);
      this.uniqueMonitors = allMonitors.filter(
        (monitor, index, self) => self.findIndex((m) => m.id === monitor.id) === index
      );
    } else {
      this.uniqueMonitors = [];
    }
  }

  private refreshDiscountInfo(): void {
    // Usar el servicio para formatear todos los datos
    if (this.course && Array.isArray(this._dates) && this._dates.length > 0) {
      this.formattedData = this.bookingDataService.formatActivityData(
        this.course,
        this._dates,
        this.utilizers,
        {
          includeIntervals: true,
          includeDiscounts: true,
          calculateTotals: true,
          extractUniqueMonitors: true,
          groupParticipants: true
        }
      );

      // Actualizar propiedades locales para compatibilidad con el template
      this.discountInfoList = this.formattedData.intervals
        ? this.formattedData.intervals.flatMap(interval => interval.discountInfo)
        : [];
      this.intervalGroups = this.formattedData.intervals || [];
      this.uniqueMonitors = this.formattedData.monitors.unique;
    } else {
      this.formattedData = null;
      this.discountInfoList = [];
      this.intervalGroups = [];
      this.uniqueMonitors = [];
    }
  }

  hasExtrasForDate(date: any): boolean {
    // Usar el servicio si está disponible
    if (this.bookingDataService) {
      return this.bookingDataService.hasExtrasForDate(date);
    }
    // Fallback: lógica original
    return date.utilizers?.some((utilizer: any) => utilizer.extras && utilizer.extras.length > 0) || false;
  }

  private resolveIntervalLabel(key: string, sampleDate: any): string {
    if (sampleDate?.interval_name) {
      return sampleDate.interval_name;
    }
    if (key === 'default') {
      const translated = this.translateService.instant('all_dates');
      return translated && translated !== 'all_dates' ? translated : 'General';
    }
    const resolved = resolveIntervalName(this.course, key);
    return resolved || `${this.translateService.instant('interval')} ${key}`;
  }

  getDiscountsForInterval(interval: { discountInfo: AppliedDiscountInfo[] }): AppliedDiscountInfo[] {
    return interval?.discountInfo || [];
  }

  getGlobalPriceSummary(): { base: number; discount: number; final: number; currency: string } | null {
    // Usar datos del servicio si están disponibles
    if (this.formattedData && this.formattedData.pricing) {
      return {
        base: this.formattedData.pricing.basePrice,
        discount: this.formattedData.pricing.discountAmount,
        final: this.formattedData.pricing.finalPrice,
        currency: this.formattedData.pricing.currency
      };
    }

    // Fallback: lógica original
    if (!Array.isArray(this.intervalGroups) || this.intervalGroups.length === 0) {
      return null;
    }

    let base = 0;
    let discount = 0;
    let final = 0;
    let currency = this.course?.currency || '';

    this.intervalGroups.forEach(interval => {
      const summary = this.getIntervalPriceSummary(interval.key);
      if (summary) {
        base += summary.base;
        discount += summary.discount;
        final += summary.final;
        currency = summary.currency || currency;
      }
    });

    if (base === 0 && final === 0) {
      return null;
    }

    return { base, discount, final, currency };
  }

  getIntervalPriceSummary(intervalKey: string): { base: number; discount: number; final: number; currency: string } | null {
    if (!intervalKey) {
      return null;
    }

    // Usar datos del servicio si están disponibles
    if (this.formattedData && this.formattedData.pricing.breakdown[intervalKey]) {
      const breakdown = this.formattedData.pricing.breakdown[intervalKey];
      return {
        base: breakdown.basePrice,
        discount: breakdown.discountAmount,
        final: breakdown.finalPrice,
        currency: this.formattedData.pricing.currency
      };
    }

    // Fallback: lógica original
    return this.calculateIntervalFinancialSummary(intervalKey);
  }

  private calculateIntervalFinancialSummary(intervalKey: string): { base: number; discount: number; final: number; currency: string } | null {
    if (!this.course || !Array.isArray(this.intervalGroups) || this.intervalGroups.length === 0) {
      return null;
    }

    const targetInterval = this.intervalGroups.find(interval => interval.key === intervalKey);
    if (!targetInterval || !Array.isArray(targetInterval.dates) || targetInterval.dates.length === 0) {
      return null;
    }

    const base = targetInterval.dates.reduce((sum, date) => sum + this.resolveDatePrice(date), 0);
    const currency = targetInterval.dates[0]?.currency || this.course?.currency || '';

    const discountsSource = getApplicableDiscounts(this.course, intervalKey !== 'default' ? intervalKey : undefined);
    const final = applyFlexibleDiscount(base, targetInterval.dates.length, discountsSource);
    const discount = Math.max(0, base - final);

    return { base, discount, final, currency };
  }

  private resolveDatePrice(date: any): number {
    // Intentar primero con el precio de la fecha
    let rawValue = date?.price;

    // Si el precio es 0 o no existe, intentar calcular basándose en el tipo de curso
    if (!rawValue || rawValue === '0' || rawValue === 0) {
      // Para cursos privados flexibles, calcular desde price_range
      if (this.course?.course_type === 2 && this.course?.is_flexible && this.utilizers?.length) {
        const duration = date?.duration;
        const paxCount = this.utilizers.length;

        console.log('🔍 [DETAIL resolveDatePrice] Calculando precio privado flex:', {
          duration,
          paxCount,
          coursePriceRange: this.course.price_range,
          schoolSettings: this.schoolService.schoolSettings
        });

        if (duration) {
          // Intentar primero con el price_range del curso
          let priceRange = null;

          if (this.course.price_range) {
            priceRange = Array.isArray(this.course.price_range)
              ? this.course.price_range
              : (typeof this.course.price_range === 'string' ? JSON.parse(this.course.price_range) : []);
          }

          // Si el curso no tiene price_range o está vacío, usar el de school settings
          if (!priceRange || priceRange.length === 0) {
            const schoolSettings = this.schoolService.schoolSettings;
            console.log('📋 [DETAIL resolveDatePrice] Usando school settings:', schoolSettings);
            if (schoolSettings?.prices_range?.prices) {
              priceRange = schoolSettings.prices_range.prices.map((p: any) => ({
                ...p,
                intervalo: p.intervalo.replace(/^(\d+)h$/, "$1h 0min") // Normalizar formato
              }));
              console.log('✅ [DETAIL resolveDatePrice] Price range desde school:', priceRange);
            }
          }

          // Buscar el intervalo que coincida con la duración
          if (priceRange && priceRange.length > 0) {
            const interval = priceRange.find((range: any) => range.intervalo === duration);
            console.log('🔎 [DETAIL resolveDatePrice] Buscando intervalo:', { duration, found: interval });
            if (interval) {
              const priceForPax = parseFloat(interval[paxCount]) || parseFloat(interval[paxCount.toString()]) || 0;
              console.log('💰 [DETAIL resolveDatePrice] Precio encontrado:', priceForPax);
              rawValue = priceForPax;
            }
          }
        }
      }

      // Si aún no tenemos precio, usar el precio base del curso
      if (!rawValue || rawValue === '0' || rawValue === 0) {
        rawValue = this.course?.price ?? this.course?.minPrice ?? 0;
      }
    }

    const numeric = Number(rawValue);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  getGlobalIndexForDate(date: any): number {
    return this._dates.indexOf(date);
  }

  calculateDiscountedPrice(date: any, index: number): number {
    let price = this.bookingService.calculateDatePrice(this.course, date, true);

    if (this.course && this.course.discounts) {
      let parsedDiscounts: any[] = [];

      if (Array.isArray(this.course.discounts)) {
        parsedDiscounts = this.course.discounts;
      } else {
        try {
          const parsed = JSON.parse(this.course.discounts);
          if (Array.isArray(parsed)) {
            parsedDiscounts = parsed;
          }
        } catch (error) {
          console.error("Error al parsear discounts:", error);
        }
      }

      parsedDiscounts.forEach(discount => {
        if (discount.date === index + 1 && discount.percentage) {
          price -= (price * (discount.percentage / 100));
        }
      });
    }

    return price;
  }

  shouldShowPrice(course: any, date: any, index: number): boolean {
    // Si es course_type !== 1 y no es flexible, mostrar solo en la primera fecha
    if (course.course_type === 1 && !course.is_flexible) {
      return index === 0;
    }

    // En otros casos, mostrar el precio normalmente
    return true;
  }


  isDiscounted(date: any, index: number): boolean {
    const price = parseFloat(date.price);
    if (this.course && this.course.discounts && !Array.isArray(this.course.discounts) ) {
      const discounts = [];
      try {
        const discounts = JSON.parse(this.course.discounts);
      } catch (error) {
        console.error("Error al parsear discounts:", error);
      }
      return discounts.some(discount => discount.date === index + 1); // Index + 1 porque los índices en arrays comienzan en 0
    }
    return false;
  }

  getExtraDescription(dateExtra) {
    return dateExtra.map((extra) => extra?.description).join(", ");
  }

  getExtraName(dateExtra) {
    return dateExtra.map((extra) => extra?.name).join(", ");
  }

  getExtraPrice(dateExtra) {
    return dateExtra.map((extra) => extra?.price).join(", ");
  }

  async sendEditForm(dates: any, course: any, utilizers: any = []) {
    const resolvedCourse = await this.resolveEditCourse(course);
    // Usar el componente unificado para todos los tipos de curso
    this.openUnifiedDatesEditForm(dates, resolvedCourse, utilizers);
  }

  private needsEditCourseData(course: any): boolean {
    if (!course) {
      return false;
    }

    const dates = Array.isArray(course.course_dates) ? course.course_dates : [];
    if (dates.length === 0) {
      return true;
    }

    return !dates.some((date: any) => Array.isArray(date.course_groups));
  }

  private resolveEditCourse(course: any): Promise<any> {
    if (!this.bookingId || !course?.id || !this.needsEditCourseData(course)) {
      return Promise.resolve(course);
    }

    if (this.loadingEditData) {
      return Promise.resolve(course);
    }

    this.loadingEditData = true;
    return new Promise((resolve) => {
      this.crudService
        .get(`/admin/bookings/${this.bookingId}/preview?include_edit=1`)
        .pipe(finalize(() => (this.loadingEditData = false)))
        .subscribe({
          next: (response: any) => {
            const booking = response?.data;
            const match = Array.isArray(booking?.booking_users)
              ? booking.booking_users.find((user: any) => user?.course_id === course.id && user?.course)
              : null;
            resolve(match?.course || course);
          },
          error: () => resolve(course)
        });
    });
  }

  private openUnifiedDatesEditForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(BookingDatesEditUnifiedComponent, {
      width: '800px',
      maxHeight: '90vh',
      panelClass: 'customBookingDialog',
      data: {
        course: course,
        utilizers: utilizers,
        sportLevel: this.sportLevel,
        initialData: dates,
        groupedActivities: this.groupedActivities,
        isPaid: this.isPaid ?? false
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {

        // Actualizar las fechas
        this.dates = result.course_dates || dates;

        // Calcular el nuevo total
        if (result.course_dates) {
          if (result.keepTotal) {
            this.total = (result.total ?? this.total);
          } else {
            this.total = result.course_dates.reduce((acc: number, date: any) => {
              let datePrice = parseFloat(date.price || 0);

              // Sumar extras si existen
              if (date.extras && date.extras.length > 0) {
                const extrasPrice = date.extras.reduce((sum: number, extra: any) =>
                  sum + parseFloat(extra.price || 0), 0);
                datePrice += extrasPrice;
              }

              return acc + datePrice;
            }, 0).toFixed(2);
          }
        }

        result.total = this.total;
        result.priceChange = result.priceChange; // Incluir información de cambio de precio

        // Emitir el evento de edición
        this.editActivity.emit(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }



  private openPrivateDatesForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(FormDetailsPrivateComponent, {
      width: "800px",
      panelClass: "customBookingDialog",
      data: {
        utilizers: utilizers,
        sport: course.sport,
        sportLevel: this.sportLevel,
        course: course,
        groupedActivities: this.groupedActivities,
        initialData: dates
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.dates = result.course_dates;
        this.total = this.dates[0].price
        result.total = this.total;
        this.editActivity.emit(result);
        // Aquí puedes tomar los datos y hacer lo que necesites con ellos
        // Por ejemplo, enviarlos al backend o actualizar la UI
        //this.updateBooking(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }

  private openCollectiveFlexDatesForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(FormDetailsColectiveFlexComponent, {
      width: "800px",
      height: "800px",
      panelClass: "customBookingDialog",
      data: {
        utilizer: utilizers[0],
        sport: course.sport,
        sportLevel: this.sportLevel,
        course: course,
        groupedActivities: this.groupedActivities,
        initialData: dates
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.dates = result.course_dates;
        this.total = this.dates.reduce((acc, date) =>
          acc + parseFloat(date.price), 0).toFixed(2);
        result.total = this.total;
        this.editActivity.emit(result);
        // Aquí puedes tomar los datos y hacer lo que necesites con ellos
        // Por ejemplo, enviarlos al backend o actualizar la UI
        //this.updateBooking(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }

  private openCollectiveFixDatesForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(FormDetailsColectiveFixComponent, {
      width: "800px",
      panelClass: "customBookingDialog",
      data: {
        utilizer: utilizers[0],
        sport: course.sport,
        sportLevel: this.sportLevel,
        course: course,
        groupedActivities: this.groupedActivities,
        initialData: dates
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.dates = result.course_dates;
        this.total = this.dates.reduce((acc, date) =>
          acc + parseFloat(date.price), 0).toFixed(2);
        result.total = this.total;
        this.editActivity.emit(result);
        // Aquí puedes tomar los datos y hacer lo que necesites con ellos
        // Por ejemplo, enviarlos al backend o actualizar la UI
        //this.updateBooking(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }

  openObservationsForm(clientObs: any, schoolObs: any) {
    const dialogRef = this.dialog.open(StepObservationsComponent, {
      width: "800px",
      panelClass: "customBookingDialog",
      data: {
        initialData: {
          clientObs: clientObs,
          schoolObs: schoolObs
        }
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.schoolObs = result.schoolObs;
        this.clientObs = result.clientObs;
        this.editActivity.emit(result);
        //this.updateBooking(result);
      }
    });
  }



  protected readonly parseFloat = parseFloat;
}
