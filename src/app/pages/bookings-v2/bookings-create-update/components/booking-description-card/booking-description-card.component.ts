import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ChangeMonitorOption } from "src/app/static-data/changeMonitorOptions";
import { LangService } from "src/service/langService";
import { UtilsService } from "src/service/utils.service";
import { TranslateService } from '@ngx-translate/core';
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
  extras?: Record<string, any>[];
}

@Component({
  selector: "booking-description-card",
  templateUrl: "./booking-description-card.component.html",
  styleUrls: ["./booking-description-card.component.scss"],
})
export class BookingDescriptionCard implements OnChanges {
  @Output() editActivity = new EventEmitter();
  @Output() deleteActivity = new EventEmitter();

  @Input() utilizers: any;
  @Input() allLevels: any;
  @Input() sport: any;
  @Input() sportLevel: any;
  @Input() course: any;
  @Input()
  set dates(value: any[]) {
    this._dates = [...(value || [])]; // Crear nueva referencia
    this.extractUniqueMonitors();
    this.refreshIntervalData();
  }

  public _dates: any[] = [];

  get dates(): any[] {
    return this._dates;
  }


  @Input() monitors: any;
  @Input() clientObs: any;
  @Input() schoolObs: any;
  @Input() total: any;
  @Input() summaryMode = false;
  @Input() isDetail = false;
  @Input() index: number = 1;
  uniqueMonitors: any[] = []; // Monitores únicos
  discountInfoList: AppliedDiscountInfo[] = [];
  intervalGroups: IntervalGroup[] = [];

  // Datos formateados desde el servicio (fuente única de verdad)
  formattedData: FormattedActivityData | null = null;

  constructor(
    protected langService: LangService,
    protected utilsService: UtilsService,
    private translateService: TranslateService,
    private bookingDataService: BookingDataService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['course'] && !changes['course'].firstChange) {
      this.refreshIntervalData();
    }
  }

  ngOnInit() {
    this.extractUniqueMonitors();
    this.refreshIntervalData();
  }

  formatDate(date: string) {
    return this.utilsService.formatDate(date);
  }

  hasExtrasForDate(date: any): boolean {
    // Usar el servicio si está disponible
    if (this.bookingDataService) {
      return this.bookingDataService.hasExtrasForDate(date);
    }
    // Fallback: lógica original
    return date.utilizers?.some((utilizer: any) => utilizer.extras && utilizer.extras.length > 0) || false;
  }

  private refreshIntervalData(): void {
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

  getDiscountsForInterval(interval: { discountInfo?: AppliedDiscountInfo[] }): AppliedDiscountInfo[] {
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
    if (this.isCollectiveFixedCourse()) {
      const currency = this.course?.currency || this._dates?.[0]?.currency || '';
      const price = this.getCollectiveFixedCoursePrice();
      return {
        base: price,
        discount: 0,
        final: price,
        currency
      };
    }

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

    if (this.isCollectiveFixedCourse()) {
      const totalDates = this.intervalGroups.reduce((sum, group) => sum + (group.dates?.length || 0), 0);
      const ratio = totalDates > 0 ? targetInterval.dates.length / totalDates : 0;
      const price = this.getCollectiveFixedCoursePrice() * ratio;
      const currency = this.course?.currency || targetInterval.dates[0]?.currency || '';
      const rounded = Number(price.toFixed(2));
      return { base: rounded, discount: 0, final: rounded, currency };
    }

    const base = targetInterval.dates.reduce((sum, date) => sum + this.resolveDatePrice(date), 0);
    const currency = targetInterval.dates[0]?.currency || this.course?.currency || '';

    const discountSource = getApplicableDiscounts(this.course, intervalKey !== 'default' ? intervalKey : undefined);
    const final = applyFlexibleDiscount(base, targetInterval.dates.length, discountSource);
    const discount = Math.max(0, base - final);

    return { base, discount, final, currency };
  }

  public resolveDatePrice(date: any): number {
    const rawValue = date?.price ?? this.course?.price ?? this.course?.minPrice ?? 0;
    const numeric = Number(rawValue);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  calculateDiscountedPrice(date: any, index: number): number {
    let price = parseFloat(date.price) || 0;

    if (this.course && this.course.discounts && !Array.isArray(this.course.discounts)) {
      const discounts = [];
      try {
        const discounts = JSON.parse(this.course.discounts);
      } catch (error) {
        console.error("Error al parsear discounts:", error);
      }
      discounts.forEach(discount => {
        if (discount.date === index + 1) { // Index + 1 porque los índices en arrays comienzan en 0
          price -= (price * (discount.percentage / 100));
        }
      });
    }

    return price;
  }

  private extractUniqueMonitors() {
    // Mantener este método por compatibilidad, pero usar el servicio si está disponible
    if (this.formattedData) {
      this.uniqueMonitors = this.formattedData.monitors.unique;
    } else if (this._dates.length) {
      const allMonitors = this._dates.map((date) => date.monitor).filter((monitor) => !!monitor);
      this.uniqueMonitors = allMonitors.filter(
        (monitor, index, self) => self.findIndex((m) => m.id === monitor.id) === index
      );
    } else {
      this.uniqueMonitors = [];
    }
  }

  isDiscounted(date: any, index: number): boolean {
    const price = parseFloat(date.price);
    if (this.course && this.course.discounts && !Array.isArray(this.course.discounts)) {
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

  sendEditForm(step: number) {
    this.editActivity.emit(
      {
        step: step
      }
    )
  }

  isCollectiveFixedCourse(): boolean {
    return !!this.course && this.course.course_type === 1 && !this.course.is_flexible;
  }

  shouldDisplayDatePrice(): boolean {
    return !this.isCollectiveFixedCourse();
  }

  private getCollectiveFixedCoursePrice(): number {
    const raw = this.course?.price ?? this.course?.minPrice ?? 0;
    const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  protected readonly parseFloat = parseFloat;
}
