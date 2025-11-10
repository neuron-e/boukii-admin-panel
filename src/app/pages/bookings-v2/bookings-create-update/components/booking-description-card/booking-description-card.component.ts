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
  intervalGroups: Array<{
    key: string;
    label: string;
    dates: any[];
    discountInfo: AppliedDiscountInfo[];
  }> = [];

  constructor(
    protected langService: LangService,
    protected utilsService: UtilsService,
    private translateService: TranslateService
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
    // Verifica si hay utilizadores para la fecha y si al menos uno tiene extras
    return date.utilizers?.some((utilizer: any) => utilizer.extras && utilizer.extras.length > 0) || false;
  }

  private refreshIntervalData(): void {
    if (this.course && Array.isArray(this._dates) && this._dates.length > 0) {
      this.discountInfoList = buildDiscountInfoList(this.course, this._dates);
    } else {
      this.discountInfoList = [];
    }
    this.rebuildIntervalGroups();
  }

  private rebuildIntervalGroups(): void {
    if (!Array.isArray(this._dates) || this._dates.length === 0) {
      this.intervalGroups = [];
      return;
    }

    const discountByKey = new Map<string, AppliedDiscountInfo[]>();
    this.discountInfoList.forEach(discount => {
      const key = discount.intervalId ? String(discount.intervalId) : 'default';
      if (!discountByKey.has(key)) {
        discountByKey.set(key, []);
      }
      discountByKey.get(key)!.push(discount);
    });

    const groupsMap = new Map<string, {
      key: string;
      label: string;
      dates: any[];
      discountInfo: AppliedDiscountInfo[];
    }>();

    this._dates.forEach(date => {
      const key = date?.interval_id ? String(date.interval_id) : 'default';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label: this.resolveIntervalLabel(key, date),
          dates: [],
          discountInfo: discountByKey.get(key) || []
        });
      }
      groupsMap.get(key)!.dates.push(date);
    });

    this.intervalGroups = Array.from(groupsMap.values());
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

    const discountSource = getApplicableDiscounts(this.course, intervalKey !== 'default' ? intervalKey : undefined);
    const final = applyFlexibleDiscount(base, targetInterval.dates.length, discountSource);
    const discount = Math.max(0, base - final);

    return { base, discount, final, currency };
  }

  private resolveDatePrice(date: any): number {
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
    if (this._dates.length) {
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

  protected readonly parseFloat = parseFloat;
}
