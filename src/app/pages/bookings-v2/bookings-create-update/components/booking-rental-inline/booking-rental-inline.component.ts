import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RentalService } from 'src/service/rental.service';

type PeriodType = 'season' | 'half_day' | 'full_day' | 'multi_day' | 'week';

export type BookingRentalInlineDraft = {
  enabled: boolean;
  pickup_point_id: number | null;
  return_point_id: number | null;
  use_booking_dates: boolean;
  custom_start_date: string | null;
  custom_end_date: string | null;
  categoryFilter: number | 'all';
  search: string;
  selectedItems: Record<number, number>;
};

type InventoryRow = {
  id: number;
  item_id: number | null;
  name?: string;
  size_label?: string;
  sku?: string;
  barcode?: string;
  item?: any;
  available: number;
  selectedQty?: number;
};

export type BookingRentalInlineProductSummary = {
  item_id: number;
  name: string;
  brand: string;
  model: string;
  totalQty: number;
  subtotal: number;
  variants: Array<{
    variant_id: number;
    name: string;
    sizeLabel: string;
    quantity: number;
    subtotal: number;
    rentalDays: number;
    unitPrice: number;
    pricingMode: 'per_day' | 'flat';
    appliedPeriodType: PeriodType;
    pricingBasisKey: string;
    currency: string;
  }>;
};

type RentalPricingQuoteLine = {
  item_id: number | null;
  variant_id: number;
  quantity: number;
  currency: string;
  period_type: PeriodType;
  pricing_mode: 'per_day' | 'flat';
  pricing_basis_key: string;
  rental_days: number;
  unit_price: number;
  line_total: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
};

type RentalPricingQuote = {
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  total_quantity: number;
  period: {
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    rental_days: number;
  };
  lines: RentalPricingQuoteLine[];
  groups: BookingRentalInlineProductSummary[];
};

export type BookingRentalInlineSummary = {
  enabled: boolean;
  hasSelection: boolean;
  readyToSubmit: boolean;
  useBookingDates: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  periodType: PeriodType;
  pickupPointId: number | null;
  pickupPointName: string;
  returnPointId: number | null;
  returnPointName: string;
  currency: string;
  totalQuantity: number;
  rentalSubtotal: number;
  rentalDiscountTotal: number;
  rentalTaxTotal: number;
  rentalGrandTotal: number;
  rentalDays: number;
  groups: BookingRentalInlineProductSummary[];
  submission: {
    pickup_point_id: number | null;
    return_point_id: number | null;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    period_type: PeriodType;
    lines: Array<{
      item_id: number | null;
      variant_id: number;
      quantity: number;
      period_type: PeriodType;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
    }>;
  };
};

type InventoryProductGroup = {
  item: any;
  rows: InventoryRow[];
};

@Component({
  selector: 'booking-rental-inline',
  templateUrl: './booking-rental-inline.component.html',
  styleUrls: ['./booking-rental-inline.component.scss']
})
export class BookingRentalInlineComponent implements OnInit, OnChanges {
  @Input() client: any;
  @Input() bookingDates: any[] = [];
  @Input() initialDraft: BookingRentalInlineDraft | null = null;
  @Input() displayMode: 'editor' | 'summary' = 'editor';
  @Output() draftChange = new EventEmitter<BookingRentalInlineDraft>();
  @Output() summaryChange = new EventEmitter<BookingRentalInlineSummary>();

  loading = false;
  enabled = false;

  categories: any[] = [];
  items: any[] = [];
  variants: any[] = [];
  units: any[] = [];
  pickupPoints: any[] = [];
  pricingRules: any[] = [];

  categoryFilter: number | 'all' = 'all';
  search = '';
  pickupPointId: number | null = null;
  returnPointId: number | null = null;
  useBookingDates = true;
  customStartDate: string | null = null;
  customEndDate: string | null = null;
  selectedItems: Record<number, number> = {};
  expandedProductIds = new Set<number>();
  pricingQuote: RentalPricingQuote | null = null;
  quoteLoading = false;
  quoteError = '';

  private draftApplied = false;
  private quoteRequestId = 0;

  constructor(private readonly rentalService: RentalService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialDraft'] && this.initialDraft && !this.draftApplied) {
      this.applyDraft(this.initialDraft);
    }
  }

  get bookingPeriod(): { startDate: string; endDate: string; startTime: string; endTime: string; periodType: PeriodType } {
    const values = (Array.isArray(this.bookingDates) ? this.bookingDates : [])
      .flatMap((activity: any) => {
        const dates = Array.isArray(activity?.dates) ? activity.dates : [];
        if (dates.length) {
          return dates
            .map((date: any) => date?.date || date?.start_date || null)
            .filter(Boolean);
        }
        return [activity?.date || activity?.start_date || null].filter(Boolean);
      })
      .sort();

    const bookingStartDate = values[0] || '';
    const bookingEndDate = values[values.length - 1] || bookingStartDate;
    const startDate = this.useBookingDates ? bookingStartDate : (this.customStartDate || bookingStartDate);
    const endDate = this.useBookingDates ? bookingEndDate : (this.customEndDate || this.customStartDate || bookingEndDate || startDate);
    const periodType: PeriodType = startDate && endDate && startDate !== endDate ? 'multi_day' : 'full_day';

    return {
      startDate,
      endDate,
      startTime: '09:00',
      endTime: '17:00',
      periodType
    };
  }

  get bookingDateRange(): { startDate: string; endDate: string } {
    const values = (Array.isArray(this.bookingDates) ? this.bookingDates : [])
      .flatMap((activity: any) => {
        const dates = Array.isArray(activity?.dates) ? activity.dates : [];
        if (dates.length) {
          return dates
            .map((date: any) => date?.date || date?.start_date || null)
            .filter(Boolean);
        }
        return [activity?.date || activity?.start_date || null].filter(Boolean);
      })
      .sort();

    const startDate = values[0] || '';
    const endDate = values[values.length - 1] || startDate;
    return { startDate, endDate };
  }

  get inventoryRows(): InventoryRow[] {
    const query = (this.search || '').toLowerCase().trim();
    return this.variants
      .map((variant: any) => {
        const item = this.items.find((candidate: any) => Number(candidate.id) === Number(variant.item_id)) || null;
        const available = this.units.filter(
          (unit: any) => Number(unit.variant_id) === Number(variant.id) && String(unit.status || '').toLowerCase() === 'available'
        ).length;
        return {
          ...variant,
          item,
          available,
          item_id: Number(variant.item_id || item?.id || 0) || null
        } as InventoryRow;
      })
      .filter((row: InventoryRow) => row.available > 0)
      .filter((row: InventoryRow) => this.categoryFilter === 'all' || Number(row.item?.category_id || 0) === Number(this.categoryFilter))
      .filter((row: InventoryRow) => {
        if (!query) return true;
        const haystack = [
          row.name,
          row.size_label,
          row.sku,
          row.barcode,
          row.item?.name,
          row.item?.brand,
          row.item?.model
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
  }

  get groupedInventoryRows(): InventoryProductGroup[] {
    const groups = new Map<number, InventoryProductGroup>();
    this.inventoryRows.forEach((row) => {
      const itemId = Number(row.item?.id || row.item_id || 0);
      if (!itemId) {
        return;
      }
      if (!groups.has(itemId)) {
        groups.set(itemId, {
          item: row.item,
          rows: []
        });
      }
      groups.get(itemId)!.rows.push(row);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((a, b) => String(a.size_label || a.name || '').localeCompare(String(b.size_label || b.name || '')))
      }))
      .sort((a, b) => String(a.item?.name || '').localeCompare(String(b.item?.name || '')));
  }

  get selectedRows(): InventoryRow[] {
    return Object.entries(this.selectedItems)
      .map(([variantId, qty]) => {
        const row = this.inventoryRows.find((candidate) => Number(candidate.id) === Number(variantId))
          || this.buildRowByVariantId(Number(variantId));
        if (!row || Number(qty) <= 0) {
          return null;
        }
        return {
          ...row,
          selectedQty: Number(qty)
        };
      })
      .filter(Boolean) as InventoryRow[];
  }

  get hasSelection(): boolean {
    return this.selectedRows.length > 0;
  }

  get selectionCount(): number {
    return Object.values(this.selectedItems).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  get estimateCurrency(): string {
    if (this.pricingQuote?.currency) {
      return this.pricingQuote.currency;
    }
    const rule = this.pricingRules.find((entry: any) => !!entry?.currency);
    return rule?.currency || 'CHF';
  }

  get estimateTotal(): number {
    return Number(this.pricingQuote?.subtotal || 0);
  }

  get selectedProductGroups(): BookingRentalInlineProductSummary[] {
    return Array.isArray(this.pricingQuote?.groups) ? this.pricingQuote!.groups : [];
  }

  get rentalDays(): number {
    return Number(this.pricingQuote?.period?.rental_days || 0);
  }

  get pickupPointName(): string {
    if (!this.pickupPointId) return '';
    return this.pickupPoints.find((entry: any) => Number(entry.id) === Number(this.pickupPointId))?.name || '';
  }

  get returnPointName(): string {
    if (!this.returnPointId) return '';
    return this.pickupPoints.find((entry: any) => Number(entry.id) === Number(this.returnPointId))?.name || '';
  }

  toggleEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.selectedItems = {};
      this.pricingQuote = null;
      this.quoteError = '';
    }
    void this.recalculatePricingAndEmit();
  }

  setCategoryFilter(value: number | 'all'): void {
    this.categoryFilter = value;
    this.emitDraft();
    this.emitSummary();
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.emitDraft();
    this.emitSummary();
  }

  onPickupPointChange(value: number | null): void {
    this.pickupPointId = value ? Number(value) : null;
    this.emitDraft();
    this.emitSummary();
  }

  onReturnPointChange(value: number | null): void {
    this.returnPointId = value ? Number(value) : null;
    this.emitDraft();
    this.emitSummary();
  }

  onUseBookingDatesChange(value: boolean): void {
    this.useBookingDates = !!value;
    if (this.useBookingDates) {
      this.customStartDate = null;
      this.customEndDate = null;
    } else {
      const fallback = this.bookingDateRange;
      this.customStartDate = this.customStartDate || fallback.startDate || null;
      this.customEndDate = this.customEndDate || fallback.endDate || this.customStartDate || null;
      this.normalizeCustomDateRange();
    }
    void this.recalculatePricingAndEmit();
  }

  onCustomStartDateChange(value: string | null): void {
    this.customStartDate = value || null;
    this.normalizeCustomDateRange();
    void this.recalculatePricingAndEmit();
  }

  onCustomEndDateChange(value: string | null): void {
    this.customEndDate = value || null;
    this.normalizeCustomDateRange();
    void this.recalculatePricingAndEmit();
  }

  toggleProduct(itemId: number): void {
    if (this.expandedProductIds.has(itemId)) {
      this.expandedProductIds.delete(itemId);
    } else {
      this.expandedProductIds.add(itemId);
    }
  }

  isProductExpanded(itemId: number): boolean {
    return this.expandedProductIds.has(itemId);
  }

  getProductSelectedQty(group: InventoryProductGroup): number {
    return group.rows.reduce((sum, row) => sum + this.selectedQuantity(Number(row.id)), 0);
  }

  getProductSubtotal(group: InventoryProductGroup): number {
    return this.selectedProductGroups
      .filter((entry) => Number(entry.item_id) === Number(group.item?.id || 0))
      .reduce((sum, entry) => sum + Number(entry.subtotal || 0), 0);
  }

  addOneItem(row: InventoryRow): void {
    this.setItemQuantity(Number(row.id), this.selectedQuantity(Number(row.id)) + 1);
  }

  removeOneItem(row: InventoryRow): void {
    this.setItemQuantity(Number(row.id), this.selectedQuantity(Number(row.id)) - 1);
  }

  selectedQuantity(variantId: number): number {
    return Number(this.selectedItems[variantId] || 0);
  }

  rowUnitPrice(row: InventoryRow, periodType?: PeriodType): number {
    const byVariant = this.pricingRules.filter((pricingRule: any) => Number(pricingRule.variant_id) === Number(row.id));
    const byItem = this.pricingRules.filter((pricingRule: any) => Number(pricingRule.item_id) === Number(row.item_id));
    const exact =
      (periodType ? byVariant.find((pricingRule: any) => pricingRule.period_type === periodType) : null) ||
      (periodType ? byItem.find((pricingRule: any) => pricingRule.period_type === periodType) : null);
    const fallback = byVariant[0] || byItem[0];
    const rule = exact || fallback;
    return Number(rule?.price || 0);
  }

  bookingLineTotal(row: any): number {
    const quoteLine = this.findQuoteLineByVariantId(Number(row?.id || 0));
    return Number(quoteLine?.line_total || 0);
  }

  isReadyToSubmit(): boolean {
    if (!this.enabled) {
      return true;
    }
    if (!this.hasSelection) {
      return false;
    }
    return !!this.pickupPointId && !!this.pricingQuote && !this.quoteLoading;
  }

  buildReservationPayload(clientId: number, bookingId: number): any {
    const period = this.bookingPeriod;
    this.normalizePickupPointSelection();
    return {
      client_id: clientId,
      booking_id: bookingId,
      pickup_point_id: this.pickupPointId,
      return_point_id: this.returnPointId,
      start_date: period.startDate,
      end_date: period.endDate,
      start_time: period.startTime,
      end_time: period.endTime,
      period_type: period.periodType,
      lines: this.selectedRows.map((row: any) => {
        return {
          item_id: row.item_id,
          variant_id: Number(row.id),
          quantity: Number(row.selectedQty || 0),
          period_type: period.periodType,
          start_date: period.startDate,
          end_date: period.endDate,
          start_time: period.startTime,
          end_time: period.endTime
        };
      })
    };
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    try {
      const [categories, items, variants, units, pickupPoints, pricingRules] = await Promise.all([
        this.wrapPaged(this.rentalService.listCategories({ per_page: 300 })),
        this.wrapPaged(this.rentalService.listItems({ per_page: 1000 })),
        this.wrapPaged(this.rentalService.listVariants({ per_page: 2000 })),
        this.wrapPaged(this.rentalService.listUnits({ per_page: 3000 })),
        this.wrapPaged(this.rentalService.listPickupPoints({ per_page: 500 })),
        this.wrapPaged(this.rentalService.listPricingRules({ per_page: 1000 }))
      ]);

      this.categories = categories;
      this.items = items;
      this.variants = variants;
      this.units = units;
      this.pickupPoints = pickupPoints;
      this.pricingRules = pricingRules;

      if (this.initialDraft && !this.draftApplied) {
        this.applyDraft(this.initialDraft);
      }

      this.normalizePickupPointSelection();

      await this.recalculatePricingAndEmit();
    } finally {
      this.loading = false;
    }
  }

  private setItemQuantity(variantId: number, quantity: number): void {
    const row = this.buildRowByVariantId(variantId);
    const available = Number(row?.available || 0);
    const clamped = Math.min(Math.max(Number(quantity || 0), 0), Math.max(available, 0));
    if (!clamped) {
      delete this.selectedItems[variantId];
      void this.recalculatePricingAndEmit();
      return;
    }
    this.selectedItems[variantId] = clamped;
    this.enabled = true;
    this.expandSelectedProduct(variantId);
    void this.recalculatePricingAndEmit();
  }

  private buildRowByVariantId(variantId: number): InventoryRow | null {
    const variant = this.variants.find((candidate: any) => Number(candidate.id) === Number(variantId));
    if (!variant) return null;
    const item = this.items.find((candidate: any) => Number(candidate.id) === Number(variant.item_id)) || null;
    const available = this.units.filter(
      (unit: any) => Number(unit.variant_id) === Number(variant.id) && String(unit.status || '').toLowerCase() === 'available'
    ).length;
    return {
      ...variant,
      item,
      available,
      item_id: Number(variant.item_id || item?.id || 0) || null
    } as InventoryRow;
  }

  private periodDurationDays(): number {
    const period = this.bookingPeriod;
    if (!period.startDate || !period.endDate) return 1;
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }

  private async wrapPaged(obs: any): Promise<any[]> {
    const response: any = await firstValueFrom(obs);
    const data = response?.data?.data ?? response?.data ?? [];
    return Array.isArray(data) ? data : [];
  }

  private applyDraft(draft: BookingRentalInlineDraft): void {
    this.enabled = !!draft?.enabled;
    this.pickupPointId = draft?.pickup_point_id ? Number(draft.pickup_point_id) : null;
    this.returnPointId = draft?.return_point_id ? Number(draft.return_point_id) : null;
    this.useBookingDates = draft?.use_booking_dates !== false;
    this.customStartDate = draft?.custom_start_date || null;
    this.customEndDate = draft?.custom_end_date || null;
    this.categoryFilter = draft?.categoryFilter ?? 'all';
    this.search = draft?.search || '';
    this.selectedItems = { ...(draft?.selectedItems || {}) };
    Object.keys(this.selectedItems).forEach((variantId) => this.expandSelectedProduct(Number(variantId)));
    this.draftApplied = true;
  }

  private normalizePickupPointSelection(): void {
    const validPickupPointIds = new Set(
      (Array.isArray(this.pickupPoints) ? this.pickupPoints : [])
        .map((pickupPoint: any) => Number(pickupPoint?.id))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    );

    if (!validPickupPointIds.size) {
      this.pickupPointId = null;
      this.returnPointId = null;
      return;
    }

    if (!this.pickupPointId || !validPickupPointIds.has(Number(this.pickupPointId))) {
      this.pickupPointId = Number(this.pickupPoints[0].id);
    }

    if (this.returnPointId && !validPickupPointIds.has(Number(this.returnPointId))) {
      this.returnPointId = null;
    }
  }

  private normalizeCustomDateRange(): void {
    if (this.useBookingDates) {
      return;
    }
    if (!this.customStartDate && this.customEndDate) {
      this.customStartDate = this.customEndDate;
    }
    if (!this.customEndDate && this.customStartDate) {
      this.customEndDate = this.customStartDate;
    }
    if (this.customStartDate && this.customEndDate && this.customEndDate < this.customStartDate) {
      this.customEndDate = this.customStartDate;
    }
  }

  private expandSelectedProduct(variantId: number): void {
    const row = this.buildRowByVariantId(variantId);
    const itemId = Number(row?.item?.id || row?.item_id || 0);
    if (itemId) {
      this.expandedProductIds.add(itemId);
    }
  }

  private async recalculatePricingAndEmit(): Promise<void> {
    this.emitDraft();
    await this.refreshPricingQuote();
    this.emitSummary();
  }

  private emitDraft(): void {
    this.draftChange.emit({
      enabled: this.enabled,
      pickup_point_id: this.pickupPointId,
      return_point_id: this.returnPointId,
      use_booking_dates: this.useBookingDates,
      custom_start_date: this.customStartDate,
      custom_end_date: this.customEndDate,
      categoryFilter: this.categoryFilter,
      search: this.search,
      selectedItems: { ...this.selectedItems }
    });
  }

  private emitSummary(): void {
    const period = this.bookingPeriod;
    const quote = this.pricingQuote;
    this.summaryChange.emit({
      enabled: this.enabled,
      hasSelection: this.hasSelection,
      readyToSubmit: this.isReadyToSubmit(),
      useBookingDates: this.useBookingDates,
      startDate: period.startDate,
      endDate: period.endDate,
      startTime: period.startTime,
      endTime: period.endTime,
      periodType: period.periodType,
      pickupPointId: this.pickupPointId,
      pickupPointName: this.pickupPointName,
      returnPointId: this.returnPointId,
      returnPointName: this.returnPointName,
      currency: this.estimateCurrency,
      totalQuantity: Number(quote?.total_quantity || this.selectionCount || 0),
      rentalSubtotal: Number(quote?.subtotal || 0),
      rentalDiscountTotal: Number(quote?.discount_total || 0),
      rentalTaxTotal: Number(quote?.tax_total || 0),
      rentalGrandTotal: Number(quote?.total || quote?.subtotal || 0),
      rentalDays: Number(quote?.period?.rental_days || 0),
      groups: this.selectedProductGroups,
      submission: {
        pickup_point_id: this.pickupPointId,
        return_point_id: this.returnPointId,
        start_date: period.startDate,
        end_date: period.endDate,
        start_time: period.startTime,
        end_time: period.endTime,
        period_type: period.periodType,
        lines: this.selectedRows.map((row: any) => {
          return {
            item_id: row.item_id,
            variant_id: Number(row.id),
            quantity: Number(row.selectedQty || 0),
            period_type: period.periodType,
            start_date: period.startDate,
            end_date: period.endDate,
            start_time: period.startTime,
            end_time: period.endTime
          };
        })
      }
    });
  }

  private async refreshPricingQuote(): Promise<void> {
    if (!this.enabled || !this.hasSelection) {
      this.pricingQuote = null;
      this.quoteLoading = false;
      this.quoteError = '';
      return;
    }

    const payload = this.buildQuotePayload();
    if (!payload) {
      this.pricingQuote = null;
      this.quoteLoading = false;
      this.quoteError = '';
      return;
    }

    const requestId = ++this.quoteRequestId;
    this.quoteLoading = true;
    this.quoteError = '';

    try {
      const response: any = await firstValueFrom(this.rentalService.quoteReservation(payload));
      if (requestId !== this.quoteRequestId) {
        return;
      }
      const data = response?.data?.data ?? response?.data ?? null;
      this.pricingQuote = data ? this.normalizeQuote(data) : null;
    } catch (error: any) {
      if (requestId !== this.quoteRequestId) {
        return;
      }
      this.pricingQuote = null;
      this.quoteError = String(error?.error?.message || error?.message || 'pricing_error');
    } finally {
      if (requestId === this.quoteRequestId) {
        this.quoteLoading = false;
      }
    }
  }

  private buildQuotePayload(): any | null {
    const period = this.bookingPeriod;
    if (!period.startDate || !period.endDate || !this.selectedRows.length) {
      return null;
    }

    return {
      start_date: period.startDate,
      end_date: period.endDate,
      start_time: period.startTime,
      end_time: period.endTime,
      period_type: period.periodType,
      lines: this.selectedRows.map((row: any) => ({
        item_id: row.item_id,
        variant_id: Number(row.id),
        quantity: Number(row.selectedQty || 0),
        period_type: period.periodType,
        start_date: period.startDate,
        end_date: period.endDate,
        start_time: period.startTime,
        end_time: period.endTime
      }))
    };
  }

  private normalizeQuote(quote: any): RentalPricingQuote {
    const normalizedGroups = Array.isArray(quote?.groups) ? quote.groups.map((group: any) => ({
      item_id: Number(group?.item_id || 0),
      name: String(group?.name || ''),
      brand: String(group?.brand || ''),
      model: String(group?.model || ''),
      totalQty: Number(group?.totalQty || 0),
      subtotal: Number(group?.subtotal || 0),
      variants: Array.isArray(group?.variants) ? group.variants.map((variant: any) => ({
        variant_id: Number(variant?.variant_id || 0),
        name: String(variant?.name || ''),
        sizeLabel: String(variant?.sizeLabel || variant?.name || ''),
        quantity: Number(variant?.quantity || 0),
        subtotal: Number(variant?.subtotal || 0),
        rentalDays: Number(variant?.rentalDays || 0),
        unitPrice: Number(variant?.unitPrice || 0),
        pricingMode: variant?.pricingMode === 'flat' ? 'flat' : 'per_day',
        appliedPeriodType: (variant?.appliedPeriodType || 'full_day') as PeriodType,
        pricingBasisKey: String(variant?.pricingBasisKey || ''),
        currency: String(variant?.currency || quote?.currency || 'CHF')
      })) : []
    })) : [];

    const normalizedLines = Array.isArray(quote?.lines) ? quote.lines.map((line: any) => ({
      item_id: line?.item_id ?? null,
      variant_id: Number(line?.variant_id || 0),
      quantity: Number(line?.quantity || 0),
      currency: String(line?.currency || quote?.currency || 'CHF'),
      period_type: (line?.period_type || 'full_day') as PeriodType,
      pricing_mode: line?.pricing_mode === 'flat' ? 'flat' : 'per_day',
      pricing_basis_key: String(line?.pricing_basis_key || ''),
      rental_days: Number(line?.rental_days || 0),
      unit_price: Number(line?.unit_price || 0),
      line_total: Number(line?.line_total || 0),
      start_date: String(line?.start_date || ''),
      end_date: String(line?.end_date || ''),
      start_time: String(line?.start_time || ''),
      end_time: String(line?.end_time || '')
    })) : [];

    return {
      currency: String(quote?.currency || 'CHF'),
      subtotal: Number(quote?.subtotal || 0),
      discount_total: Number(quote?.discount_total || 0),
      tax_total: Number(quote?.tax_total || 0),
      total: Number(quote?.total || quote?.subtotal || 0),
      total_quantity: Number(quote?.total_quantity || 0),
      period: {
        start_date: String(quote?.period?.start_date || this.bookingPeriod.startDate || ''),
        end_date: String(quote?.period?.end_date || this.bookingPeriod.endDate || ''),
        start_time: String(quote?.period?.start_time || this.bookingPeriod.startTime || ''),
        end_time: String(quote?.period?.end_time || this.bookingPeriod.endTime || ''),
        rental_days: Number(quote?.period?.rental_days || 0)
      },
      lines: normalizedLines,
      groups: normalizedGroups
    };
  }

  private findQuoteLineByVariantId(variantId: number): RentalPricingQuoteLine | undefined {
    return this.pricingQuote?.lines?.find((line) => Number(line.variant_id) === Number(variantId));
  }
}
