import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { RentalsItemDialogComponent } from './rentals-item-dialog.component';
import { RentalsReservationReturnDialogComponent } from './rentals-reservation-return-dialog.component';
import { RentalsDamageDialogComponent } from './rentals-damage-dialog.component';
import { RentalsPaymentDialogComponent } from './rentals-payment-dialog.component';
import { RentalsReasonDialogComponent } from './rentals-reason-dialog.component';
import { ConfirmDialogComponent } from 'src/@vex/components/confirm-dialog/confirm-dialog.component';
import { firstValueFrom } from 'rxjs';
import { RentalService } from 'src/service/rental.service';

import { RentalUiStatusKey } from 'src/app/shared/rental-status.util';

type RentalsView = 'inventory' | 'booking' | 'list' | 'catalog' | 'add-equipment';
type PeriodType = 'season' | 'half_day' | 'full_day' | 'multi_day' | 'week';
type ClientMode = 'existing' | 'new';
type ScanTarget = 'barcode' | 'sku';
type LinePeriodConfig = {
  period_type: PeriodType;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
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
};

@Component({
  selector: 'vex-rentals-v2',
  templateUrl: './rentals-v2.component.html',
  styleUrls: ['./rentals-v2.component.scss']
})
export class RentalsV2Component implements OnInit, OnDestroy {
  @ViewChild('scannerVideo') scannerVideo?: ElementRef<HTMLVideoElement>;

  loading = false;
  loadingReservations = false;
  view: RentalsView = 'inventory';

  categories: any[] = [];
  subcategories: any[] = [];
  brands: any[] = [];
  models: any[] = [];
  items: any[] = [];
  variants: any[] = [];
  units: any[] = [];
  warehouses: any[] = [];
  pickupPoints: any[] = [];
  stockMovements: any[] = [];
  pricingRules: any[] = [];
  reservations: any[] = [];
  clients: any[] = [];
  private pendingReservationId: number | null = null;

  categoryFilter: number | 'all' = 'all';
  subcategoryFilter: number | 'all' = 'all';

  inventorySearch = '';
  catalogCategorySearch = '';
  catalogSubcategorySearch = '';
  catalogBrandSearch = '';
  catalogModelSearch = '';
  catalogWarehouseSearch = '';
  catalogPickupPointSearch = '';
  maintenanceSearch = '';
  maintenanceStatusFilter: 'all' | 'maintenance' | 'available' | 'assigned' = 'all';
  stockMovementSearch = '';
  bookingSearch = '';
  clientMode: ClientMode = 'existing';
  bookingCategoryFilter: number | 'all' = 'all';
  listSearch = '';
  listStatus = 'all';
  listPeriod: 'all' | 'today' | 'upcoming' | 'past' = 'all';
  reservationPage = 1;
  readonly reservationPageSize = 10;

  selectedItems: Record<number, number> = {};
  linePeriods: Record<number, LinePeriodConfig> = {};
  selectedInventoryRow: any | null = null;
  selectedReservation: any | null = null;
  bookingExpandedGroups: number[] = [];
  bookingPeriodAdvancedOpen = false;
  pricingQuote: RentalPricingQuote | null = null;
  quoteLoading = false;
  private quoteRequestId = 0;

  // Integrated mode: linked booking_id from query params
  linkedBookingId: number | null = null;

  scanning = false;
  scanTarget: ScanTarget = 'barcode';
  scannerError = '';
  private scannerStream: MediaStream | null = null;
  private scannerIntervalId: any = null;

  bookingForm = this.fb.group({
    client_id: this.fb.control<number | null>(null, Validators.required),
    pickup_point_id: this.fb.control<number | null>(null, Validators.required),
    return_point_id: this.fb.control<number | null>(null),
    period_type: this.fb.control<PeriodType>('full_day', Validators.required),
    start_date: this.fb.control<string>('', Validators.required),
    end_date: this.fb.control<string>('', Validators.required),
    start_time: this.fb.control<string>('09:00'),
    end_time: this.fb.control<string>('17:00')
  });

  newClientForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['']
  });

  readonly periodButtons: Array<{ value: PeriodType; label: string; hint: string }> = [
    { value: 'season', label: 'rentals.period_season', hint: 'rentals.period_season_hint' },
    { value: 'half_day', label: 'rentals.period_half_day', hint: 'rentals.period_half_day_hint' },
    { value: 'full_day', label: 'rentals.period_full_day', hint: 'rentals.period_full_day_hint' },
    { value: 'multi_day', label: 'rentals.period_multi_day', hint: 'rentals.period_multi_day_hint' },
    { value: 'week', label: 'rentals.period_week', hint: 'rentals.period_week_hint' }
  ];

  addEquipmentForm = this.fb.group({
    category_id: [null, Validators.required],
    subcategory_id: [null],
    subcategory_name: [''],
    item_name: ['', Validators.required],
    brand_id: this.fb.control<number | null>(null),
    model_id: this.fb.control<number | null>(null),
    variant_name: ['', Validators.required],
    size_label: [''],
    sku: [''],
    barcode: [''],
    serial_prefix: [''],
    condition: ['excellent'],
    warehouse_id: [null],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  catalogCategoryForm = this.fb.group({
    name: ['', Validators.required],
    active: [true]
  });

  catalogSubcategoryForm = this.fb.group({
    category_id: this.fb.control<number | null>(null, Validators.required),
    parent_id: this.fb.control<number | null>(null),
    name: ['', Validators.required],
    active: [true]
  });

  catalogBrandForm = this.fb.group({
    name: ['', Validators.required],
    active: [true]
  });

  catalogModelForm = this.fb.group({
    brand_id: this.fb.control<number | null>(null),
    name: ['', Validators.required],
    active: [true]
  });

  warehouseForm = this.fb.group({
    name: ['', Validators.required],
    code: [''],
    address: [''],
    active: [true]
  });

  pickupPointForm = this.fb.group({
    warehouse_id: this.fb.control<number | null>(null),
    name: ['', Validators.required],
    address: [''],
    allow_pickup: [true],
    allow_return: [true],
    active: [true]
  });

  maintenanceActionForm = this.fb.group({
    reason: ['', Validators.required],
    condition: ['']
  });

  editingCategoryId: number | null = null;
  editingSubcategoryId: number | null = null;
  editingBrandId: number | null = null;
  editingModelId: number | null = null;
  editingWarehouseId: number | null = null;
  editingPickupPointId: number | null = null;
  showArchivedWarehouses = false;
  showArchivedPickupPoints = false;
  maintenanceActionUnit: any | null = null;
  maintenanceActionMode: 'set' | 'release' | null = null;
  maintenanceHistoryLoading = false;
  maintenanceHistory: any[] = [];
  stockMovementFilters = {
    movement_type: '',
    warehouse_id: null as number | null,
    user_id: null as number | null,
    item_id: null as number | null,
    variant_id: null as number | null,
    date_from: '',
    date_to: ''
  };
  addEquipmentCreateBrandOpen = false;
  addEquipmentCreateModelOpen = false;
  addEquipmentCreateBrandName = '';
  addEquipmentCreateModelName = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly rentalService: RentalService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.syncViewWithRoute();
    this.loadAll();
    this.applyRouteQueryState(this.route.snapshot.queryParams);
    this.route.queryParams.subscribe((params) => this.applyRouteQueryState(params));
    this.bookingForm.get('period_type')?.valueChanges.subscribe((value) => {
      this.applyPeriodPreset((value as PeriodType) || 'full_day');
      void this.refreshPricingQuote();
    });
    this.bookingForm.get('start_date')?.valueChanges.subscribe(() => {
      const period = (this.bookingForm.get('period_type')?.value as PeriodType) || 'full_day';
      this.applyPeriodPreset(period);
      void this.refreshPricingQuote();
    });
    this.bookingForm.get('end_date')?.valueChanges.subscribe(() => void this.refreshPricingQuote());
    this.bookingForm.get('start_time')?.valueChanges.subscribe(() => void this.refreshPricingQuote());
    this.bookingForm.get('end_time')?.valueChanges.subscribe(() => void this.refreshPricingQuote());
    this.addEquipmentForm.get('brand_id')?.valueChanges.subscribe((value) => this.onAddEquipmentBrandChanged(Number(value || 0) || null));
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private applyRouteQueryState(params: any): void {
    const bookingId = params['booking_id'];
    const clientId = params['client_id'];
    const reservationId = Number(params['reservation_id'] || 0);
    const status = String(params['status'] || '').trim().toLowerCase();
    const date = String(params['date'] || '').trim().toLowerCase();

    this.linkedBookingId = bookingId ? Number(bookingId) : null;
    this.listStatus = status && ['pending', 'active', 'overdue', 'completed'].includes(status) ? status : 'all';
    this.listPeriod = date && ['today', 'upcoming', 'past'].includes(date) ? (date as any) : 'all';

    if (bookingId) {
      this.setView('booking');
      const patchValues: any = {};
      if (clientId) patchValues['client_id'] = Number(clientId);
      // Pre-fill dates from booking context
      const startDate = params['start_date'];
      const endDate = params['end_date'];
      if (startDate) patchValues['start_date'] = startDate;
      if (endDate) patchValues['end_date'] = endDate;
      if (Object.keys(patchValues).length) {
        this.bookingForm.patchValue(patchValues);
      }
      return;
    }

    if (reservationId > 0) {
      this.pendingReservationId = reservationId;
      this.view = 'list';
      this.reservationPage = 1;
      this.loadReservations();
      return;
    }

    if (status || date) {
      this.view = 'list';
      this.reservationPage = 1;
      this.loadReservations();
    }
  }

  get totalEquipment(): number {
    return this.variants.length;
  }

  get totalAvailable(): number {
    return this.units.filter((u) => (u?.status || '').toLowerCase() === 'available').length;
  }

  get totalRented(): number {
    return this.units.filter((u) => (u?.status || '').toLowerCase() === 'assigned').length;
  }

  get utilizationRate(): number {
    const total = this.units.length || 1;
    return Math.round((this.totalRented / total) * 100);
  }

  get selectedPeriodType(): PeriodType {
    return (this.bookingForm.get('period_type')?.value as PeriodType) || 'full_day';
  }

  get pendingCount(): number {
    return this.reservations.filter((reservation) => this.reservationUiStatusKey(reservation) === 'pending').length;
  }

  get activeCount(): number {
    return this.reservations.filter((reservation) => this.reservationUiStatusKey(reservation) === 'active').length;
  }

  get overdueCount(): number {
    return this.reservations.filter((reservation) => this.reservationUiStatusKey(reservation) === 'overdue').length;
  }

  get completedCount(): number {
    return this.reservations.filter((reservation) => this.reservationUiStatusKey(reservation) === 'completed').length;
  }

  get selectedTotalItems(): number {
    return Object.values(this.selectedItems).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  get selectedRows(): any[] {
    return Object.entries(this.selectedItems)
      .map(([variantId, qty]) => {
        const numericVariantId = Number(variantId);
        return {
          row: this.inventoryRows.find((r) => Number(r.id) === numericVariantId),
          qty: Number(qty),
          linePeriod: this.getLinePeriod(numericVariantId),
          customPeriod: this.lineUsesCustom(numericVariantId)
        };
      })
      .filter((entry) => !!entry.row && entry.qty > 0)
      .map((entry) => ({
        ...entry.row,
        selectedQty: entry.qty,
        linePeriod: entry.linePeriod,
        customPeriod: entry.customPeriod
      }));
  }

  get inventoryRows(): any[] {
    return this.filteredInventoryRows;
  }

  get filteredCatalogCategories(): any[] {
    const q = (this.catalogCategorySearch || '').trim().toLowerCase();
    const rows = [...this.categories];
    if (!q) return rows.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
    return rows
      .filter((row) => String(row?.name || '').toLowerCase().includes(q))
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
  }

  get categoryTreeCards(): any[] {
    return this.filteredCatalogCategories.map((category) => {
      const categoryId = Number(category?.id || 0);
      const children = this.subcategories
        .filter((row) => Number(row?.category_id || 0) === categoryId)
        .map((row) => ({
          ...row,
          pathLabel: this.subcategoryPathLabel(Number(row?.id || 0), categoryId),
          depth: this.subcategoryDepth(Number(row?.id || 0), categoryId),
          childCount: this.subcategories.filter((candidate) => Number(candidate?.parent_id || 0) === Number(row?.id || 0)).length,
          itemCount: this.items.filter((item) => Number(item?.subcategory_id || 0) === Number(row?.id || 0)).length
        }))
        .sort((a, b) => String(a?.pathLabel || '').localeCompare(String(b?.pathLabel || ''), 'es', { sensitivity: 'base' }));

      return {
        ...category,
        children,
        activeChildren: children.filter((row) => !!row?.active).length,
        itemCount: this.items.filter((item) => Number(item?.category_id || 0) === categoryId).length
      };
    });
  }

  get filteredCatalogSubcategories(): any[] {
    const q = (this.catalogSubcategorySearch || '').trim().toLowerCase();
    const rows = this.subcategories.map((row) => ({
      ...row,
      categoryName: this.categoryName(Number(row?.category_id || 0)),
      parentName: this.subcategoryPathLabel(Number(row?.parent_id || 0), Number(row?.category_id || 0)),
      pathLabel: this.subcategoryPathLabel(Number(row?.id || 0), Number(row?.category_id || 0)),
      depth: this.subcategoryDepth(Number(row?.id || 0), Number(row?.category_id || 0))
    }));
    const filtered = !q
      ? rows
      : rows.filter((row) =>
          [row?.name, row?.categoryName, row?.parentName, row?.pathLabel]
            .map((v) => String(v || '').toLowerCase())
            .join(' ')
            .includes(q)
        );
    return filtered.sort((a, b) => String(a?.pathLabel || '').localeCompare(String(b?.pathLabel || ''), 'es', { sensitivity: 'base' }));
  }

  get filteredCatalogBrands(): any[] {
    const q = (this.catalogBrandSearch || '').trim().toLowerCase();
    const rows = [...(this.brands || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
    if (!q) return rows;
    return rows.filter((row) => String(row?.name || '').toLowerCase().includes(q));
  }

  get filteredCatalogModels(): any[] {
    const q = (this.catalogModelSearch || '').trim().toLowerCase();
    const rows = [...(this.models || [])]
      .map((row) => ({
        ...row,
        brand_name: this.brandName(Number(row?.brand_id || 0))
      }))
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
    if (!q) return rows;
    return rows.filter((row) => [row?.name, row?.brand_name].map((v) => String(v || '').toLowerCase()).join(' ').includes(q));
  }

  get catalogBrandCards(): any[] {
    return this.filteredCatalogBrands.map((brand) => {
      const brandId = Number(brand?.id || 0);
      const relatedModels = this.models.filter((row) => Number(row?.brand_id || 0) === brandId);
      const relatedItems = this.items.filter((item) => Number(item?.brand_id || 0) === brandId);
      return {
        ...brand,
        model_count: relatedModels.length,
        active_model_count: relatedModels.filter((row) => !!row?.active).length,
        item_count: relatedItems.length,
        legacy_item_count: relatedItems.filter((item) => String(item?.brand || '').trim() && !Number(item?.brand_id || 0)).length
      };
    });
  }

  get catalogLegacyBrandModelItems(): any[] {
    return this.items
      .filter((item) => {
        const brandText = String(item?.brand || '').trim();
        const modelText = String(item?.model || '').trim();
        return (!!brandText && !Number(item?.brand_id || 0)) || (!!modelText && !Number(item?.model_id || 0));
      })
      .map((item) => ({
        id: Number(item?.id || 0),
        name: String(item?.name || item?.title || `#${item?.id || '-'}`),
        brand: String(item?.brand || '').trim(),
        model: String(item?.model || '').trim(),
        resolved_brand: this.brandName(Number(item?.brand_id || 0)),
        resolved_model: this.modelNameById(Number(item?.model_id || 0) || null) || '-',
        category_name: this.categoryName(Number(item?.category_id || 0))
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es', { sensitivity: 'base' }));
  }

  get filteredCatalogWarehouses(): any[] {
    const q = (this.catalogWarehouseSearch || '').trim().toLowerCase();
    const rows = [...(this.warehouses || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
    if (!q) return rows;
    return rows.filter((row) => [row?.name, row?.code, row?.address].map((v) => String(v || '').toLowerCase()).join(' ').includes(q));
  }

  get filteredCatalogPickupPoints(): any[] {
    const q = (this.catalogPickupPointSearch || '').trim().toLowerCase();
    const rows = [...(this.pickupPoints || [])]
      .map((row) => ({
        ...row,
        warehouse_name: this.warehouseNameById(Number(row?.warehouse_id || 0))
      }))
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
    if (!q) return rows;
    return rows.filter((row) => [row?.name, row?.address, row?.warehouse_name].map((v) => String(v || '').toLowerCase()).join(' ').includes(q));
  }

  get warehouseOpsCards(): any[] {
    return this.filteredCatalogWarehouses.map((warehouse) => {
      const warehouseId = Number(warehouse?.id || 0);
      const unitCount = this.units.filter((unit) => Number(unit?.warehouse_id || 0) === warehouseId).length;
      const maintenanceCount = this.units.filter(
        (unit) => Number(unit?.warehouse_id || 0) === warehouseId && String(unit?.status || '').toLowerCase() === 'maintenance'
      ).length;
      const pickupCount = this.pickupPoints.filter((point) => Number(point?.warehouse_id || 0) === warehouseId && !point?.deleted_at).length;
      return {
        ...warehouse,
        unit_count: unitCount,
        maintenance_count: maintenanceCount,
        pickup_count: pickupCount
      };
    });
  }

  get pickupPointOpsCards(): any[] {
    return this.filteredCatalogPickupPoints.map((point) => ({
      ...point,
      warehouse_name: this.warehouseNameById(Number(point?.warehouse_id || 0)),
      capability_label: this.pickupPointCapabilityLabel(point)
    }));
  }

  get maintenanceKpis(): Array<{ key: string; label: string; value: number }> {
    return [
      { key: 'all', label: 'Total units', value: this.units.length },
      {
        key: 'maintenance',
        label: 'In maintenance',
        value: this.units.filter((row) => String(row?.status || '').toLowerCase() === 'maintenance').length
      },
      {
        key: 'available',
        label: 'Available',
        value: this.units.filter((row) => String(row?.status || '').toLowerCase() === 'available').length
      },
      {
        key: 'assigned',
        label: 'Assigned',
        value: this.units.filter((row) => String(row?.status || '').toLowerCase() === 'assigned').length
      }
    ];
  }

  get filteredMaintenanceUnits(): any[] {
    const query = String(this.maintenanceSearch || '').trim().toLowerCase();
    return this.units
      .map((unit) => {
        const variant = this.variants.find((row) => Number(row?.id || 0) === Number(unit?.variant_id || 0)) || unit?.variant || null;
        const item = this.items.find((row) => Number(row?.id || 0) === Number(variant?.item_id || unit?.item_id || 0)) || unit?.item || null;
        const warehouseName = this.warehouseNameById(Number(unit?.warehouse_id || 0));
        return {
          ...unit,
          variant_name: String(variant?.name || variant?.sku || `#${unit?.variant_id || '-'}`),
          item_name: String(item?.name || item?.title || '-'),
          warehouse_name: warehouseName,
          status_key: String(unit?.status || '').toLowerCase(),
          status_label: this.titleizeText(unit?.status || 'unknown'),
          condition_label: this.titleizeText(unit?.condition || 'unknown')
        };
      })
      .filter((unit) => {
        if (this.maintenanceStatusFilter !== 'all' && unit.status_key !== this.maintenanceStatusFilter) {
          return false;
        }
        if (!query) return true;
        return [unit?.id, unit?.item_name, unit?.variant_name, unit?.warehouse_name, unit?.status_label, unit?.condition_label]
          .map((value) => String(value || '').toLowerCase())
          .join(' ')
          .includes(query);
      })
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }

  get stockMovementTypeSummary(): Array<{ key: string; label: string; value: number }> {
    const counts = new Map<string, number>();
    for (const row of this.stockMovements || []) {
      const key = String(row?.movement_type || 'other').toLowerCase();
      counts.set(key, Number(counts.get(key) || 0) + Number(row?.quantity || 0 || 1));
    }
    return Array.from(counts.entries())
      .map(([key, value]) => ({ key, label: this.stockMovementTypeLabel(key), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }

  get filteredStockMovements(): any[] {
    const query = String(this.stockMovementSearch || '').trim().toLowerCase();
    return (this.stockMovements || [])
      .map((movement) => {
        const quantity = Number(movement?.quantity || 0);
        const variantName = String(movement?.variant_name || movement?.variant?.name || `#${movement?.variant_id || '-'}`);
        const itemName = this.resolveStockMovementItemName(movement);
        const warehouseName = String(movement?.warehouse_name || this.warehouseNameById(Number(movement?.warehouse_id || 0)) || '-');
        const actorName = String(movement?.actor_name || '-');
        const movementType = String(movement?.movement_type || '').toLowerCase();
        return {
          ...movement,
          display_date: String(movement?.occurred_at || movement?.created_at || '-'),
          type_key: movementType,
          type_label: this.stockMovementTypeLabel(movementType),
          direction_class: this.stockMovementDirectionClass(movementType),
          quantity_label: `${quantity > 0 ? '+' : ''}${quantity}`,
          item_name: itemName,
          variant_name: variantName,
          warehouse_name: warehouseName,
          actor_name: actorName
        };
      })
      .filter((movement) => {
        if (!query) return true;
        return [
          movement?.display_date,
          movement?.type_label,
          movement?.item_name,
          movement?.variant_name,
          movement?.warehouse_name,
          movement?.actor_name,
          movement?.reference,
          movement?.notes
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ')
          .includes(query);
      });
  }

  get stockMovementActors(): any[] {
    const byId = new Map<number, any>();
    for (const row of this.stockMovements || []) {
      const actorId = Number(row?.user_id || 0);
      if (actorId > 0 && !byId.has(actorId)) {
        byId.set(actorId, {
          id: actorId,
          name: row?.actor_name || `#${actorId}`
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  get inventoryBaseRows(): any[] {
    return this.buildInventoryRows();
  }

  private buildInventoryRows(): any[] {
    return this.variants.map((variant) => {
      const item = this.items.find((i) => i.id === variant.item_id) || null;
      const available = this.units.filter((u) => u.variant_id === variant.id && (u.status || '').toLowerCase() === 'available').length;
      const total = this.units.filter((u) => u.variant_id === variant.id).length;
      const subcategoryName = (variant?.subcategory?.name || variant.size_group || '').trim();

      return {
        ...variant,
        item,
        available,
        total,
        subcategoryName
      };
    });
  }

  private get filteredInventoryRows(): any[] {
    const query = (this.inventorySearch || '').toLowerCase().trim();
    const selectedCategory = this.categoryFilter;
    const selectedSubcategory = this.subcategoryFilter;

    return this.buildInventoryRows()
      .filter((row) => {
        if (selectedCategory !== 'all' && row.item?.category_id !== selectedCategory) return false;
        if (selectedSubcategory !== 'all' && Number(row?.subcategory_id || row?.subcategory?.id || 0) !== Number(selectedSubcategory)) return false;
        if (!query) return true;
        const haystack = [
          row.name,
          row.subcategoryName,
          row.size_label,
          row.sku,
          row.barcode,
          this.rowBarcode(row),
          row.item?.name,
          row.item?.brand,
          row.item?.model
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
  }

  get bookingRows(): any[] {
    const query = (this.bookingSearch || '').toLowerCase().trim();
    const selectedCategory = this.bookingCategoryFilter;
    return this.inventoryBaseRows
      .filter((row) => row.available > 0)
      .filter((row) => {
        if (selectedCategory !== 'all' && row.item?.category_id !== selectedCategory) return false;
        if (!query) return true;
        const haystack = [row.name, row.item?.name, row.item?.brand, row.item?.model, row.subcategoryName, row.size_label]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
  }

  get bookingGroups(): any[] {
    const groups: Record<number, any> = {};
    for (const row of this.bookingRows) {
      const itemId = Number(row.item?.id || row.item_id || 0);
      if (!itemId) continue;
      if (!groups[itemId]) {
        groups[itemId] = {
          id: itemId,
          item: row.item,
          variants: [],
          totalAvailable: 0,
          selectedCount: 0,
          selectedQty: 0
        };
      }
      groups[itemId].variants.push(row);
      groups[itemId].totalAvailable += Number(row.available || 0);
      const qty = this.selectedQuantity(row.id);
      if (qty > 0) {
        groups[itemId].selectedCount += 1;
        groups[itemId].selectedQty += qty;
      }
    }
    return Object.values(groups);
  }

  isBookingGroupExpanded(groupId: number): boolean {
    return this.bookingExpandedGroups.includes(groupId);
  }

  setMaintenanceStatusFilter(key: string): void {
    const normalized = String(key || '').toLowerCase();
    if (normalized === 'available' || normalized === 'assigned' || normalized === 'maintenance' || normalized === 'all') {
      this.maintenanceStatusFilter = normalized;
      return;
    }
    this.maintenanceStatusFilter = 'all';
  }

  toggleBookingGroup(groupId: number): void {
    if (this.bookingExpandedGroups.includes(groupId)) {
      this.bookingExpandedGroups = this.bookingExpandedGroups.filter((id) => id !== groupId);
      return;
    }
    this.bookingExpandedGroups = [...this.bookingExpandedGroups, groupId];
  }

  toggleBookingPeriodAdvanced(): void {
    this.bookingPeriodAdvancedOpen = !this.bookingPeriodAdvancedOpen;
  }

  get filteredReservations(): any[] {
    const query = (this.listSearch || '').toLowerCase().trim();
    const rows = this.reservations.filter((reservation) => {
      const uiStatus = this.reservationUiStatusKey(reservation);
      if (this.listStatus !== 'all' && uiStatus !== this.listStatus) return false;
      if (!this.matchesPeriodFilter(reservation)) return false;
      if (!query) return true;
      const client = this.reservationClient(reservation);
      const haystack = [
        reservation?.reference,
        reservation?.status,
        uiStatus,
        client?.first_name,
        client?.last_name,
        client?.email
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
    return rows.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }

  get pagedReservations(): any[] {
    const start = (this.reservationPage - 1) * this.reservationPageSize;
    return this.filteredReservations.slice(start, start + this.reservationPageSize);
  }

  get totalReservationPages(): number {
    return Math.max(1, Math.ceil(this.filteredReservations.length / this.reservationPageSize));
  }

  get availableSubcategories(): string[] {
    const selectedCategory = this.categoryFilter;
    const fromRows = this.inventoryRows.map((row) => (row.subcategoryName || '').trim()).filter((name) => !!name);
    const fromCatalog = this.subcategories
      .filter((subcategory) => selectedCategory === 'all' || subcategory.category_id === selectedCategory)
      .map((subcategory) => this.subcategoryPathLabel(Number(subcategory?.id || 0), Number(subcategory?.category_id || 0)))
      .filter((name) => !!name);
    return Array.from(new Set([...fromRows, ...fromCatalog])).sort((a, b) => a.localeCompare(b));
  }

  get filteredSubcategoriesForForm(): any[] {
    const categoryId = Number(this.addEquipmentForm.get('category_id')?.value || 0);
    if (!categoryId) return [];
    return this.subcategories
      .filter((subcategory) => Number(subcategory.category_id) === categoryId)
      .map((subcategory) => ({
        ...subcategory,
        pathLabel: this.subcategoryPathLabel(Number(subcategory?.id || 0), categoryId)
      }))
      .sort((a, b) => String(a?.pathLabel || a?.name || '').localeCompare(String(b?.pathLabel || b?.name || ''), 'es', { sensitivity: 'base' }));
  }

  get filteredModelsForAddEquipment(): any[] {
    const selectedBrandId = Number(this.addEquipmentForm.get('brand_id')?.value || 0) || null;
    const rows = (this.models || []).filter((model) => {
      if (!selectedBrandId) return true;
      return Number(model?.brand_id || 0) === selectedBrandId;
    });
    return [...rows].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
  }

  get parentSubcategoryOptionsForForm(): any[] {
    const categoryId = Number(this.catalogSubcategoryForm.get('category_id')?.value || 0);
    if (!categoryId) return [];
    const currentId = Number(this.editingSubcategoryId || 0);
    const blocked = currentId ? this.descendantSubcategoryIds(currentId, categoryId) : new Set<number>();
    return this.subcategories
      .filter((subcategory) => Number(subcategory?.category_id || 0) === categoryId)
      .filter((subcategory) => Number(subcategory?.id || 0) !== currentId)
      .filter((subcategory) => !blocked.has(Number(subcategory?.id || 0)))
      .map((subcategory) => ({
        ...subcategory,
        pathLabel: this.subcategoryPathLabel(Number(subcategory?.id || 0), categoryId)
      }))
      .sort((a, b) => String(a?.pathLabel || a?.name || '').localeCompare(String(b?.pathLabel || b?.name || ''), 'es', { sensitivity: 'base' }));
  }

  setView(view: RentalsView): void {
    this.view = view;
    if (view === 'list') this.loadReservations();
    if (view === 'catalog') void this.loadOperationalData();
    if (view !== 'add-equipment') this.stopScanner();
    if (view === 'list') {
      this.reservationPage = 1;
      this.selectedReservation = null;
    }
    this.navigateForView(view);
  }

  private syncViewWithRoute(): void {
    const url = this.router.url || '';
    if (url.includes('/rentals/booking')) {
      this.view = 'booking';
      return;
    }
    if (url.includes('/rentals/list')) {
      this.view = 'list';
      this.loadReservations();
      return;
    }
    if (url.includes('/rentals/catalog')) {
      this.view = 'catalog';
      return;
    }
    if (url.includes('/rentals/advanced')) {
      this.view = 'catalog';
      return;
    }
    this.view = 'inventory';
  }

  private navigateForView(view: RentalsView): void {
    const current = this.router.url || '';
    if (view === 'booking') {
      if (!current.includes('/rentals/reservation/create')) {
        this.router.navigate(['/rentals/reservation/create']);
      }
      return;
    }
    if (view === 'list') {
      if (!current.includes('/rentals/list')) {
        this.router.navigate(['/rentals/list']);
      }
      return;
    }
    if (view === 'catalog') {
      if (!current.includes('/rentals/catalog')) {
        this.router.navigate(['/rentals/catalog']);
      }
      return;
    }
    if (view === 'inventory') {
      if (!current.endsWith('/rentals')) {
        this.router.navigate(['/rentals']);
      }
    }
  }

  setCategoryFilter(value: number | 'all'): void {
    this.categoryFilter = value;
    this.subcategoryFilter = 'all';
  }

  setSubcategoryFilter(value: number | 'all'): void {
    this.subcategoryFilter = value;
  }

  subcategoryCountByCategory(categoryId: number): number {
    return this.subcategories.filter((row) => Number(row?.category_id || 0) === Number(categoryId || 0)).length;
  }

  startEditCategory(category: any): void {
    this.editingCategoryId = Number(category?.id || 0) || null;
    this.catalogCategoryForm.patchValue({
      name: String(category?.name || '').trim(),
      active: Boolean(category?.active ?? true)
    });
  }

  resetCategoryForm(): void {
    this.editingCategoryId = null;
    this.catalogCategoryForm.reset({ name: '', active: true });
  }

  async submitCategoryForm(): Promise<void> {
    if (this.catalogCategoryForm.invalid) {
      this.catalogCategoryForm.markAllAsTouched();
      return;
    }
    const payload = {
      name: String(this.catalogCategoryForm.get('name')?.value || '').trim(),
      active: Boolean(this.catalogCategoryForm.get('active')?.value ?? true)
    };
    try {
      if (this.editingCategoryId) {
        const updated = await this.getData(this.rentalService.updateCategory(this.editingCategoryId, payload));
        const id = Number(updated?.id || this.editingCategoryId);
        this.categories = this.categories.map((row) => (Number(row?.id || 0) === id ? { ...row, ...updated, ...payload } : row));
        this.toast('rentals.updated_successfully');
      } else {
        const created = await this.getData(this.rentalService.createCategory(payload));
        if (created?.id) this.categories = [...this.categories, created];
        this.toast('rentals.created_successfully');
      }
      this.resetCategoryForm();
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  async deleteCategoryRow(category: any): Promise<void> {
    const id = Number(category?.id || 0);
    if (!id) return;
    const confirmed = await this.openRentalConfirmDialog(
      'Eliminar categoría',
      `¿Eliminar categoría "${category?.name || '#'+id}"?`,
      'Eliminar'
    );
    if (!confirmed) return;
    try {
      await this.getData(this.rentalService.deleteCategory(id));
      this.categories = this.categories.filter((row) => Number(row?.id || 0) !== id);
      this.subcategories = this.subcategories.filter((row) => Number(row?.category_id || 0) !== id);
      if (this.editingCategoryId === id) this.resetCategoryForm();
      this.toast('rentals.deleted_successfully');
    } catch (error) {
      this.toastCrudError(error, 'rentals.delete_error');
    }
  }

  startEditSubcategory(subcategory: any): void {
    this.editingSubcategoryId = Number(subcategory?.id || 0) || null;
    this.catalogSubcategoryForm.patchValue({
      category_id: Number(subcategory?.category_id || 0) || null,
      parent_id: Number(subcategory?.parent_id || 0) || null,
      name: String(subcategory?.name || '').trim(),
      active: Boolean(subcategory?.active ?? true)
    });
  }

  resetSubcategoryForm(): void {
    this.editingSubcategoryId = null;
    this.catalogSubcategoryForm.reset({ category_id: null, parent_id: null, name: '', active: true });
  }

  async submitSubcategoryForm(): Promise<void> {
    if (this.catalogSubcategoryForm.invalid) {
      this.catalogSubcategoryForm.markAllAsTouched();
      return;
    }
    const payload = {
      category_id: Number(this.catalogSubcategoryForm.get('category_id')?.value || 0),
      parent_id: Number(this.catalogSubcategoryForm.get('parent_id')?.value || 0) || null,
      name: String(this.catalogSubcategoryForm.get('name')?.value || '').trim(),
      active: Boolean(this.catalogSubcategoryForm.get('active')?.value ?? true)
    };
    if (!payload.category_id) {
      this.toast('rentals.validation_error');
      return;
    }
    if (this.editingSubcategoryId && Number(payload.parent_id || 0) === Number(this.editingSubcategoryId)) {
      this.toast('rentals.validation_error');
      return;
    }
    try {
      if (this.editingSubcategoryId) {
        const updated = await this.getData(this.rentalService.updateSubcategory(this.editingSubcategoryId, payload));
        const id = Number(updated?.id || this.editingSubcategoryId);
        this.subcategories = this.subcategories.map((row) => (Number(row?.id || 0) === id ? { ...row, ...updated, ...payload } : row));
        this.toast('rentals.updated_successfully');
      } else {
        const created = await this.getData(this.rentalService.createSubcategory(payload));
        if (created?.id) this.subcategories = [...this.subcategories, created];
        this.toast('rentals.created_successfully');
      }
      this.resetSubcategoryForm();
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  async deleteSubcategoryRow(subcategory: any): Promise<void> {
    const id = Number(subcategory?.id || 0);
    if (!id) return;
    const confirmed = await this.openRentalConfirmDialog(
      'Eliminar subcategoría',
      `¿Eliminar subcategoría "${subcategory?.name || '#'+id}"?`,
      'Eliminar'
    );
    if (!confirmed) return;
    try {
      await this.getData(this.rentalService.deleteSubcategory(id));
      this.subcategories = this.subcategories.filter((row) => Number(row?.id || 0) !== id);
      if (this.editingSubcategoryId === id) this.resetSubcategoryForm();
      this.toast('rentals.deleted_successfully');
    } catch (error) {
      this.toastCrudError(error, 'rentals.delete_error');
    }
  }

  startEditBrand(brand: any): void {
    this.editingBrandId = Number(brand?.id || 0) || null;
    this.catalogBrandForm.patchValue({
      name: String(brand?.name || '').trim(),
      active: Boolean(brand?.active ?? true)
    });
  }

  resetBrandForm(): void {
    this.editingBrandId = null;
    this.catalogBrandForm.reset({ name: '', active: true });
  }

  async submitBrandForm(): Promise<void> {
    if (this.catalogBrandForm.invalid) {
      this.catalogBrandForm.markAllAsTouched();
      return;
    }
    const payload = {
      name: String(this.catalogBrandForm.get('name')?.value || '').trim(),
      active: Boolean(this.catalogBrandForm.get('active')?.value ?? true)
    };
    try {
      if (this.editingBrandId) {
        const updated = await this.getData(this.rentalService.updateBrand(this.editingBrandId, payload));
        const id = Number(updated?.id || this.editingBrandId);
        this.brands = this.brands.map((row) => (Number(row?.id || 0) === id ? { ...row, ...updated, ...payload } : row));
        this.toast('rentals.updated_successfully');
      } else {
        const created = await this.getData(this.rentalService.createBrand(payload));
        if (created?.id) this.brands = [...this.brands, created];
        this.toast('rentals.created_successfully');
      }
      this.resetBrandForm();
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  async deleteBrandRow(brand: any): Promise<void> {
    const id = Number(brand?.id || 0);
    if (!id) return;
    const confirmed = await this.openRentalConfirmDialog(
      'Eliminar marca',
      `¿Eliminar marca "${brand?.name || '#' + id}"?`,
      'Eliminar'
    );
    if (!confirmed) return;
    try {
      await this.getData(this.rentalService.deleteBrand(id));
      this.brands = this.brands.filter((row) => Number(row?.id || 0) !== id);
      this.models = this.models.filter((row) => Number(row?.brand_id || 0) !== id);
      if (this.editingBrandId === id) this.resetBrandForm();
      if (Number(this.catalogModelForm.get('brand_id')?.value || 0) === id) {
        this.catalogModelForm.patchValue({ brand_id: null });
      }
      this.toast('rentals.deleted_successfully');
    } catch (error) {
      this.toastCrudError(error, 'rentals.delete_error');
    }
  }

  startEditModel(model: any): void {
    this.editingModelId = Number(model?.id || 0) || null;
    this.catalogModelForm.patchValue({
      brand_id: Number(model?.brand_id || 0) || null,
      name: String(model?.name || '').trim(),
      active: Boolean(model?.active ?? true)
    });
  }

  resetModelForm(): void {
    this.editingModelId = null;
    this.catalogModelForm.reset({ brand_id: null, name: '', active: true });
  }

  async submitModelForm(): Promise<void> {
    if (this.catalogModelForm.invalid) {
      this.catalogModelForm.markAllAsTouched();
      return;
    }
    const payload = {
      brand_id: Number(this.catalogModelForm.get('brand_id')?.value || 0) || null,
      name: String(this.catalogModelForm.get('name')?.value || '').trim(),
      active: Boolean(this.catalogModelForm.get('active')?.value ?? true)
    };
    try {
      if (this.editingModelId) {
        const updated = await this.getData(this.rentalService.updateModel(this.editingModelId, payload));
        const id = Number(updated?.id || this.editingModelId);
        this.models = this.models.map((row) => (Number(row?.id || 0) === id ? { ...row, ...updated, ...payload } : row));
        this.toast('rentals.updated_successfully');
      } else {
        const created = await this.getData(this.rentalService.createModel(payload));
        if (created?.id) this.models = [...this.models, created];
        this.toast('rentals.created_successfully');
      }
      this.resetModelForm();
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  toggleAddEquipmentCreateBrand(): void {
    this.addEquipmentCreateBrandOpen = !this.addEquipmentCreateBrandOpen;
    if (!this.addEquipmentCreateBrandOpen) this.addEquipmentCreateBrandName = '';
  }

  toggleAddEquipmentCreateModel(): void {
    this.addEquipmentCreateModelOpen = !this.addEquipmentCreateModelOpen;
    if (!this.addEquipmentCreateModelOpen) this.addEquipmentCreateModelName = '';
  }

  async createBrandInlineForAddEquipment(): Promise<void> {
    const name = String(this.addEquipmentCreateBrandName || '').trim();
    if (!name) {
      this.toast('rentals.validation_error');
      return;
    }
    try {
      const created = await this.getData(this.rentalService.createBrand({ name, active: true }));
      if (!created?.id) {
        this.toast('rentals.create_error');
        return;
      }
      this.brands = [...this.brands, created].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
      this.addEquipmentForm.patchValue({
        brand_id: Number(created.id),
        model_id: null
      });
      this.addEquipmentCreateBrandName = '';
      this.addEquipmentCreateBrandOpen = false;
      this.toast('rentals.created_successfully');
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  async createModelInlineForAddEquipment(): Promise<void> {
    const name = String(this.addEquipmentCreateModelName || '').trim();
    const brandId = Number(this.addEquipmentForm.get('brand_id')?.value || 0) || null;
    if (!name) {
      this.toast('rentals.validation_error');
      return;
    }
    if (!brandId) {
      this.toast('Selecciona una marca antes de crear un modelo');
      return;
    }
    try {
      const created = await this.getData(this.rentalService.createModel({ name, brand_id: brandId, active: true }));
      if (!created?.id) {
        this.toast('rentals.create_error');
        return;
      }
      this.models = [...this.models, created].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
      this.addEquipmentForm.patchValue({ model_id: Number(created.id) });
      this.addEquipmentCreateModelName = '';
      this.addEquipmentCreateModelOpen = false;
      this.toast('rentals.created_successfully');
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  async deleteModelRow(model: any): Promise<void> {
    const id = Number(model?.id || 0);
    if (!id) return;
    const confirmed = await this.openRentalConfirmDialog(
      'Eliminar modelo',
      `¿Eliminar modelo "${model?.name || '#' + id}"?`,
      'Eliminar'
    );
    if (!confirmed) return;
    try {
      await this.getData(this.rentalService.deleteModel(id));
      this.models = this.models.filter((row) => Number(row?.id || 0) !== id);
      if (this.editingModelId === id) this.resetModelForm();
      this.toast('rentals.deleted_successfully');
    } catch (error) {
      this.toastCrudError(error, 'rentals.delete_error');
    }
  }

  startEditWarehouse(row: any): void {
    this.editingWarehouseId = Number(row?.id || 0) || null;
    this.warehouseForm.patchValue({
      name: String(row?.name || '').trim(),
      code: String(row?.code || '').trim(),
      address: String(row?.address || '').trim(),
      active: Boolean(row?.active ?? true)
    });
  }

  resetWarehouseForm(): void {
    this.editingWarehouseId = null;
    this.warehouseForm.reset({ name: '', code: '', address: '', active: true });
  }

  async submitWarehouseForm(): Promise<void> {
    if (this.warehouseForm.invalid) {
      this.warehouseForm.markAllAsTouched();
      return;
    }
    const payload = {
      name: String(this.warehouseForm.get('name')?.value || '').trim(),
      code: String(this.warehouseForm.get('code')?.value || '').trim(),
      address: String(this.warehouseForm.get('address')?.value || '').trim(),
      active: Boolean(this.warehouseForm.get('active')?.value ?? true)
    };
    try {
      if (this.editingWarehouseId) {
        const updated = await this.getData(this.rentalService.updateWarehouse(this.editingWarehouseId, payload));
        const id = Number(updated?.id || this.editingWarehouseId);
        this.warehouses = this.warehouses.map((row) => (Number(row?.id || 0) === id ? { ...row, ...updated, ...payload } : row));
        this.toast('rentals.updated_successfully');
      } else {
        const created = await this.getData(this.rentalService.createWarehouse(payload));
        if (created?.id) this.warehouses = [...this.warehouses, created];
        this.toast('rentals.created_successfully');
      }
      this.resetWarehouseForm();
      await this.loadInventoryData();
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  async deleteWarehouseRow(row: any): Promise<void> {
    const id = Number(row?.id || 0);
    if (!id) return;
    const isArchived = !!row?.deleted_at;
    const confirmed = await this.openRentalConfirmDialog(
      isArchived ? 'Restaurar almacén' : 'Archivar almacén',
      isArchived ? '¿Restaurar almacén?' : '¿Archivar almacén?',
      isArchived ? 'Restaurar' : 'Archivar'
    );
    if (!confirmed) return;
    try {
      if (isArchived) {
        await this.getData(this.rentalService.restoreWarehouse(id));
      } else {
        await this.getData(this.rentalService.deleteWarehouse(id));
      }
      this.toast(isArchived ? 'rentals.updated_successfully' : 'rentals.deleted_successfully');
      await this.loadWarehouseData();
    } catch (error) {
      this.toastCrudError(error, 'rentals.delete_error');
    }
  }

  toggleArchivedWarehouses(show: boolean): void {
    this.showArchivedWarehouses = !!show;
    void this.loadWarehouseData();
  }

  startEditPickupPoint(row: any): void {
    this.editingPickupPointId = Number(row?.id || 0) || null;
    this.pickupPointForm.patchValue({
      warehouse_id: Number(row?.warehouse_id || 0) || null,
      name: String(row?.name || '').trim(),
      address: String(row?.address || '').trim(),
      allow_pickup: Boolean(row?.allow_pickup ?? true),
      allow_return: Boolean(row?.allow_return ?? true),
      active: Boolean(row?.active ?? true)
    });
  }

  resetPickupPointForm(): void {
    this.editingPickupPointId = null;
    this.pickupPointForm.reset({
      warehouse_id: null,
      name: '',
      address: '',
      allow_pickup: true,
      allow_return: true,
      active: true
    });
  }

  async submitPickupPointForm(): Promise<void> {
    if (this.pickupPointForm.invalid) {
      this.pickupPointForm.markAllAsTouched();
      return;
    }
    const payload = {
      warehouse_id: Number(this.pickupPointForm.get('warehouse_id')?.value || 0) || null,
      name: String(this.pickupPointForm.get('name')?.value || '').trim(),
      address: String(this.pickupPointForm.get('address')?.value || '').trim(),
      allow_pickup: Boolean(this.pickupPointForm.get('allow_pickup')?.value ?? true),
      allow_return: Boolean(this.pickupPointForm.get('allow_return')?.value ?? true),
      active: Boolean(this.pickupPointForm.get('active')?.value ?? true)
    };
    try {
      if (this.editingPickupPointId) {
        const updated = await this.getData(this.rentalService.updatePickupPoint(this.editingPickupPointId, payload));
        const id = Number(updated?.id || this.editingPickupPointId);
        this.pickupPoints = this.pickupPoints.map((row) => (Number(row?.id || 0) === id ? { ...row, ...updated, ...payload } : row));
        this.toast('rentals.updated_successfully');
      } else {
        const created = await this.getData(this.rentalService.createPickupPoint(payload));
        if (created?.id) this.pickupPoints = [...this.pickupPoints, created];
        this.toast('rentals.created_successfully');
      }
      this.resetPickupPointForm();
      await this.loadPickupPointData();
    } catch (error) {
      this.toastCrudError(error, 'rentals.create_error');
    }
  }

  async deletePickupPointRow(row: any): Promise<void> {
    const id = Number(row?.id || 0);
    if (!id) return;
    const isArchived = !!row?.deleted_at;
    const confirmed = await this.openRentalConfirmDialog(
      isArchived ? 'Restaurar punto de recogida' : 'Archivar punto de recogida',
      isArchived ? '¿Restaurar punto de recogida?' : '¿Archivar punto de recogida?',
      isArchived ? 'Restaurar' : 'Archivar'
    );
    if (!confirmed) return;
    try {
      if (isArchived) {
        await this.getData(this.rentalService.restorePickupPoint(id));
      } else {
        await this.getData(this.rentalService.deletePickupPoint(id));
      }
      this.toast(isArchived ? 'rentals.updated_successfully' : 'rentals.deleted_successfully');
      await this.loadPickupPointData();
    } catch (error) {
      this.toastCrudError(error, 'rentals.delete_error');
    }
  }

  toggleArchivedPickupPoints(show: boolean): void {
    this.showArchivedPickupPoints = !!show;
    void this.loadPickupPointData();
  }

  beginUnitMaintenanceAction(row: any, mode: 'set' | 'release'): void {
    this.maintenanceActionUnit = row;
    this.maintenanceActionMode = mode;
    this.maintenanceActionForm.reset({
      reason: '',
      condition: String(row?.condition || '')
    });
    this.loadUnitMaintenanceHistory(row?.id);
  }

  viewUnitMaintenanceHistory(row: any): void {
    this.maintenanceActionUnit = row;
    this.maintenanceActionMode = null;
    this.maintenanceActionForm.reset({
      reason: '',
      condition: String(row?.condition || '')
    });
    this.loadUnitMaintenanceHistory(row?.id);
  }

  cancelUnitMaintenanceAction(): void {
    this.maintenanceActionMode = null;
    this.maintenanceActionForm.reset({
      reason: '',
      condition: String(this.maintenanceActionUnit?.condition || '')
    });
  }

  closeMaintenancePanel(): void {
    this.maintenanceActionUnit = null;
    this.maintenanceActionMode = null;
    this.maintenanceHistory = [];
    this.maintenanceActionForm.reset({ reason: '', condition: '' });
  }

  async submitUnitMaintenanceAction(): Promise<void> {
    const unit = this.maintenanceActionUnit;
    const mode = this.maintenanceActionMode;
    if (!unit || !mode || this.maintenanceActionForm.invalid) {
      this.maintenanceActionForm.markAllAsTouched();
      return;
    }
    const reason = String(this.maintenanceActionForm.value.reason || '').trim();
    if (!reason) {
      this.maintenanceActionForm.controls.reason.setErrors({ required: true });
      return;
    }
    const condition = String(this.maintenanceActionForm.value.condition || unit?.condition || '');
    try {
      const action$ = mode === 'set'
        ? this.rentalService.setUnitMaintenance(unit.id, reason, condition)
        : this.rentalService.releaseUnitMaintenance(unit.id, reason, condition);
      await this.getData(action$);
      this.toast(mode === 'set' ? 'rentals.status_updated' : 'rentals.updated_successfully');
      await Promise.all([this.loadInventoryData(), this.loadOperationalData()]);
      this.loadUnitMaintenanceHistory(unit.id);
      this.maintenanceActionMode = null;
      this.maintenanceActionForm.reset({
        reason: '',
        condition
      });
    } catch (error) {
      this.toastCrudError(error, 'rentals.update_error');
    }
  }

  applyStockMovementFilters(): void {
    void this.loadOperationalData();
  }

  clearStockMovementFilters(): void {
    this.stockMovementFilters = {
      movement_type: '',
      warehouse_id: null,
      user_id: null,
      item_id: null,
      variant_id: null,
      date_from: '',
      date_to: ''
    };
    void this.loadOperationalData();
  }

  selectInventoryRow(row: any): void {
    this.selectedInventoryRow = row;
  }

  setBookingCategoryFilter(value: number | 'all'): void {
    this.bookingCategoryFilter = value;
  }

  openCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  setClientMode(mode: ClientMode): void {
    this.clientMode = mode;
    const clientIdControl = this.bookingForm.get('client_id');
    if (mode === 'new') {
      clientIdControl?.clearValidators();
      clientIdControl?.updateValueAndValidity();
      this.bookingForm.patchValue({ client_id: null });
    } else {
      clientIdControl?.setValidators([Validators.required]);
      clientIdControl?.updateValueAndValidity();
    }
  }

  async createNewClient(): Promise<void> {
    if (this.newClientForm.invalid) {
      this.newClientForm.markAllAsTouched();
      this.toast('rentals.new_client_validation_error');
      return;
    }

    const formValue = this.newClientForm.value;
    const payload = {
      first_name: String(formValue.first_name || '').trim(),
      last_name: String(formValue.last_name || '').trim(),
      email: String(formValue.email || '').trim(),
      phone: String(formValue.phone || '').trim()
    };

    try {
      const created: any = await this.getData(this.rentalService.createClient(payload));
      const client = this.extractCreatedClient(created);
      if (!client?.id) {
        this.toast('rentals.new_client_create_error');
        return;
      }

      const schoolId = this.currentSchoolId();
      if (schoolId) {
        try {
          await this.getData(this.rentalService.linkClientToSchool({
            client_id: Number(client.id),
            school_id: schoolId,
            accepted_at: new Date().toISOString()
          }));
        } catch {
          // Linking may already exist or be implicit depending on backend configuration.
        }
      }

      const normalizedClient = {
        ...client,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone
      };

      this.clients = this.mergeClientInList(normalizedClient);
      this.bookingForm.get('client_id')?.setValue(Number(normalizedClient.id) as any);
      this.clientMode = 'existing';
      this.newClientForm.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
      });
      this.toast('rentals.new_client_created');
    } catch {
      this.toast('rentals.new_client_create_error');
    }
  }

  private mergeClientInList(client: any): any[] {
    const next = [...(this.clients || [])];
    const index = next.findIndex((entry) => Number(entry?.id || 0) === Number(client?.id || 0));
    if (index >= 0) {
      next[index] = { ...next[index], ...client };
    } else {
      next.unshift(client);
    }
    return next.sort((a, b) => {
      const aName = `${a?.first_name || ''} ${a?.last_name || ''}`.trim().toLowerCase();
      const bName = `${b?.first_name || ''} ${b?.last_name || ''}`.trim().toLowerCase();
      return aName.localeCompare(bName);
    });
  }

  private extractCreatedClient(response: any): any {
    if (!response) return null;
    if (response?.id) return response;
    if (response?.data?.id) return response.data;
    if (response?.data?.data?.id) return response.data.data;
    return null;
  }

  private currentSchoolId(): number | null {
    const userRaw = localStorage.getItem('boukiiUser');
    if (!userRaw) return null;
    try {
      const user = JSON.parse(userRaw);
      const fromCurrent = Number(user?.school?.id || user?.school_id || 0);
      if (fromCurrent > 0) return fromCurrent;
      const fromList = Number(user?.schools?.[0]?.id || 0);
      return fromList > 0 ? fromList : null;
    } catch {
      return null;
    }
  }

  private schoolCurrencyFromUser(): string {
    const userRaw = localStorage.getItem('boukiiUser');
    if (!userRaw) return '';
    try {
      const user = JSON.parse(userRaw);
      return this.resolveCurrencyCandidate(
        user?.school?.taxes?.currency,
        user?.school?.currency,
        user?.schools?.[0]?.taxes?.currency,
        user?.schools?.[0]?.currency
      );
    } catch {
      return '';
    }
  }


  openDetail(row: any): void {
    const itemId = Number(row?.item?.id || row?.item_id || 0);
    const variantId = Number(row?.id || 0);
    if (!itemId) return;
    this.router.navigate(['/rentals/item', itemId], {
      queryParams: variantId ? { variant: variantId } : undefined
    });
  }

  openCreateEquipmentDialog(): void {
    const dialogRef = this.dialog.open(RentalsItemDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        mode: 'create',
        categories: this.categories,
        subcategories: this.subcategories,
        brands: this.brands,
        models: this.models,
        warehouses: this.warehouses,
        pricingRules: this.pricingRules
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.persistDialog('create', result).catch(() => this.toast('rentals.create_error'));
    });
  }

  openEditEquipmentDialog(row: any): void {
    const itemId = Number(row?.item?.id || row?.item_id || 0);
    const variantId = Number(row?.id || 0);
    if (!itemId || !variantId) return;
    this.router.navigate(['/rentals/item', itemId], {
      queryParams: {
        variant: variantId,
        edit: 1
      }
    });
  }

  private async persistDialog(mode: 'create' | 'edit', payload: any, row?: any): Promise<void> {
    if (mode === 'create') {
      await this.addEquipmentFromDialog(payload);
      return;
    }

    if (!row?.id || !row?.item_id) {
      this.toast('rentals.status_error');
      return;
    }

    await this.getData(this.rentalService.updateItem(Number(row.item_id), {
      category_id: Number(payload.category_id),
      name: payload.item_name,
      brand_id: payload.brand_id ? Number(payload.brand_id) : null,
      model_id: payload.model_id ? Number(payload.model_id) : null,
      brand: this.brandNameById(payload.brand_id ? Number(payload.brand_id) : null),
      model: this.modelNameById(payload.model_id ? Number(payload.model_id) : null),
      tags: this.normalizeTagsInput(payload.tags),
      purchase_date: payload.purchase_date || null,
      last_maintenance_date: payload.last_maintenance_date || null,
      active: true
    }));

    await this.getData(this.rentalService.updateVariant(Number(row.id), {
      item_id: Number(row.item_id),
      subcategory_id: payload.subcategory_id ? Number(payload.subcategory_id) : null,
      name: payload.variant_name,
      size_group: this.subcategoryNameById(payload.subcategory_id ? Number(payload.subcategory_id) : null),
      size_label: payload.size_label,
      sku: payload.sku,
      barcode: payload.barcode,
      purchase_date: payload.purchase_date || null,
      last_maintenance_date: payload.last_maintenance_date || null,
      active: true
    }));

    await this.upsertPricing(Number(row.id), Number(payload.half_day_price || 0), Number(payload.full_day_price || 0), Number(payload.week_price || 0));

    this.toast('rentals.status_updated');
    await this.loadInventoryData();
  }

  private async addEquipmentFromDialog(payload: any): Promise<void> {
    const categoryId = Number(payload.category_id);

    const createdItem: any = await this.getData(this.rentalService.createItem({
      category_id: categoryId,
      name: payload.item_name,
      brand_id: payload.brand_id ? Number(payload.brand_id) : null,
      model_id: payload.model_id ? Number(payload.model_id) : null,
      brand: this.brandNameById(payload.brand_id ? Number(payload.brand_id) : null),
      model: this.modelNameById(payload.model_id ? Number(payload.model_id) : null),
      tags: this.normalizeTagsInput(payload.tags),
      purchase_date: payload.purchase_date || null,
      last_maintenance_date: payload.last_maintenance_date || null,
      active: true
    }));

    const itemId = Number(createdItem?.id);
    if (!itemId) {
      this.toast('rentals.create_error');
      return;
    }

    const createdVariant: any = await this.getData(this.rentalService.createVariant({
      item_id: itemId,
      subcategory_id: payload.subcategory_id ? Number(payload.subcategory_id) : null,
      name: payload.variant_name,
      size_group: this.subcategoryNameById(payload.subcategory_id ? Number(payload.subcategory_id) : null),
      size_label: payload.size_label,
      sku: payload.sku,
      barcode: payload.barcode || payload.sku || null,
      purchase_date: payload.purchase_date || null,
      last_maintenance_date: payload.last_maintenance_date || null,
      active: true
    }));

    const variantId = Number(createdVariant?.id);
    if (!variantId) {
      this.toast('rentals.create_error');
      return;
    }

    await this.upsertPricing(variantId, Number(payload.half_day_price || 0), Number(payload.full_day_price || 0), Number(payload.week_price || 0));

    const warehouseId = payload.warehouse_id ? Number(payload.warehouse_id) : null;
    const quantity = Number(payload.quantity || 1);
    if (warehouseId && quantity > 0) {
      const serialPrefix = (payload.serial_prefix || '').trim();
      const unitCalls = Array.from({ length: quantity }, (_, index) =>
        this.getData(this.rentalService.createUnit({
          variant_id: variantId,
          warehouse_id: warehouseId,
          status: 'available',
          condition: payload.condition,
          serial: serialPrefix ? `${serialPrefix}-${String(index + 1).padStart(3, '0')}` : null
        }))
      );
      await Promise.all(unitCalls);
    }

    this.toast('rentals.create_success');
    await this.loadInventoryData();
  }

  private async upsertPricing(variantId: number, halfDay: number, fullDay: number, week: number): Promise<void> {
    const defaultCurrency = this.bookingEstimateCurrency || this.schoolCurrencyFromUser();
    const periodPrices: Array<{ period: string; price: number }> = [
      { period: 'half_day', price: halfDay },
      { period: 'full_day', price: fullDay },
      { period: 'week', price: week }
    ];

    for (const line of periodPrices) {
      if (!line.price || line.price <= 0) continue;
      const existing = this.pricingRules.find((rule) => Number(rule.variant_id) === Number(variantId) && rule.period_type === line.period);
      if (existing?.id) {
        await this.getData(this.rentalService.updatePricingRule(Number(existing.id), {
          variant_id: variantId,
          period_type: line.period,
          price: line.price,
          currency: this.resolveCurrencyCandidate(existing.currency, defaultCurrency),
          active: true
        }));
      } else {
        await this.getData(this.rentalService.createPricingRule({
          variant_id: variantId,
          period_type: line.period,
          price: line.price,
          currency: defaultCurrency,
          active: true
        }));
      }
    }
  }
  setPeriodType(period: PeriodType): void {
    this.bookingForm.patchValue({ period_type: period });
  }

  deleteInventoryRow(row: any): void {
    const variantId = Number(row?.id || 0);
    if (!variantId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.translateService.instant('rentals.delete_confirm_title'),
        message: this.translateService.instant('rentals.delete_confirm_message'),
        confirmText: this.translateService.instant('rentals.delete_confirm_button'),
        cancelText: this.translateService.instant('rentals.cancel'),
        isError: true,
        variant: 'rental'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.rentalService.deleteVariant(variantId).subscribe({
        next: () => {
          this.toast('rentals.status_updated');
          if (this.selectedInventoryRow?.id === variantId) {
            this.selectedInventoryRow = null;
          }
          void this.loadInventoryData();
        },
        error: (error: any) => {
          const backendMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.message ||
            '';
          if (backendMessage) {
            this.snackBar.open(String(backendMessage), 'OK', { duration: 3800 });
            return;
          }
          this.toast('rentals.status_error');
        }
      });
    });
  }

  setItemQuantity(variantId: number, quantity: number): void {
    const row = this.inventoryRows.find((r) => Number(r.id) === Number(variantId));
    const available = Number(row?.available || 0);
    const clampedQuantity = Math.min(Math.max(Number(quantity || 0), 0), Math.max(available, 0));
    if (!clampedQuantity || clampedQuantity <= 0) {
      delete this.selectedItems[variantId];
      delete this.linePeriods[variantId];
      void this.refreshPricingQuote();
      return;
    }
    this.selectedItems[variantId] = clampedQuantity;
    void this.refreshPricingQuote();
  }

  selectedQuantity(variantId: number): number {
    return Number(this.selectedItems[variantId] || 0);
  }

  clearSelectedItems(): void {
    this.selectedItems = {};
    this.linePeriods = {};
    this.pricingQuote = null;
  }

  addOneItem(row: any): void {
    const current = this.selectedQuantity(row.id);
    this.setItemQuantity(row.id, current + 1);
  }

  removeOneItem(row: any): void {
    const current = this.selectedQuantity(row.id);
    this.setItemQuantity(row.id, current - 1);
  }

  removeSelectedRow(row: any): void {
    delete this.selectedItems[row.id];
    delete this.linePeriods[row.id];
    void this.refreshPricingQuote();
  }

  async addEquipment(): Promise<void> {
    if (this.addEquipmentForm.invalid) {
      this.toast('rentals.validation_error');
      return;
    }

    try {
      const form = this.addEquipmentForm.value;
      const categoryId = Number(form.category_id);
      const warehouseId = form.warehouse_id ? Number(form.warehouse_id) : null;
      const quantity = Number(form.quantity || 1);

      const createdItem: any = await this.getData(this.rentalService.createItem({
        category_id: categoryId,
        name: form.item_name,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        model_id: form.model_id ? Number(form.model_id) : null,
        brand: this.brandNameById(form.brand_id ? Number(form.brand_id) : null),
        model: this.modelNameById(form.model_id ? Number(form.model_id) : null),
        active: true
      }));
      const itemId = Number(createdItem?.id);
      if (!itemId) {
        this.toast('rentals.create_error');
        return;
      }

      const subcategoryId = await this.resolveSubcategoryForForm(categoryId);

      const createdVariant: any = await this.getData(this.rentalService.createVariant({
        item_id: itemId,
        subcategory_id: subcategoryId,
        name: form.variant_name,
        size_group: form.subcategory_name || this.subcategoryNameById(subcategoryId) || null,
        size_label: form.size_label,
        sku: form.sku,
        barcode: form.barcode || form.sku || null,
        active: true
      }));
      const variantId = Number(createdVariant?.id);
      if (!variantId) {
        this.toast('rentals.create_error');
        return;
      }

      if (warehouseId && quantity > 0) {
        const serialPrefix = (form.serial_prefix || '').trim();
        const unitCalls = Array.from({ length: quantity }, (_, index) =>
          this.getData(this.rentalService.createUnit({
            variant_id: variantId,
            warehouse_id: warehouseId,
            status: 'available',
            condition: form.condition,
            serial: serialPrefix ? `${serialPrefix}-${String(index + 1).padStart(3, '0')}` : null
          }))
        );
        await Promise.all(unitCalls);
      }

      this.toast('rentals.create_success');
      this.addEquipmentForm.reset({
        condition: 'excellent',
        brand_id: null,
        model_id: null,
        quantity: 1
      });
      await this.loadInventoryData();
      this.setView('inventory');
    } catch (error) {
      this.toast('rentals.create_error');
    }
  }

  createReservation(): void {
    if (this.clientMode === 'new') {
      this.toast('rentals.client_must_be_created');
      return;
    }
    if (this.bookingForm.invalid || this.selectedTotalItems <= 0 || this.quoteLoading) {
      this.toast('rentals.validation_error');
      return;
    }
    if (!this.pricingQuote) {
      this.toast('rentals.validation_error');
      return;
    }

    const formValue = this.bookingForm.value;
    const payload: any = {
      client_id: formValue.client_id,
      pickup_point_id: formValue.pickup_point_id,
      return_point_id: formValue.return_point_id,
      start_date: formValue.start_date,
      end_date: formValue.end_date,
      start_time: formValue.start_time,
      end_time: formValue.end_time,
      period_type: formValue.period_type,
      ...(this.linkedBookingId ? { booking_id: this.linkedBookingId } : {}),
      lines: Object.entries(this.selectedItems).map(([variantId, qty]) => {
        const numericVariantId = Number(variantId);
        const row = this.inventoryRows.find((candidate) => Number(candidate.id) === numericVariantId);
        const linePeriod = this.getLinePeriod(numericVariantId);
        return {
          item_id: row?.item_id || null,
          variant_id: numericVariantId,
          quantity: Number(qty),
          period_type: linePeriod.period_type,
          start_date: linePeriod.start_date,
          end_date: linePeriod.end_date,
          start_time: linePeriod.start_time,
          end_time: linePeriod.end_time
        };
      })
    };

    this.rentalService.createReservation(payload).subscribe({
      next: () => {
        this.toast('rentals.create_success');
        this.bookingForm.reset({
          period_type: 'full_day',
          start_time: '09:00',
          end_time: '17:00'
        });
        this.clearSelectedItems();
        const wasLinked = !!this.linkedBookingId;
        const linkedId = this.linkedBookingId;
        this.linkedBookingId = null;
        void this.loadInventoryData();
        if (wasLinked && linkedId) {
          this.router.navigate([`/bookings/update/${linkedId}`]);
        } else {
          this.setView('list');
        }
      },
      error: () => this.toast('rentals.create_error')
    });
  }

  updateReservationStatus(reservation: any, status: string): void {
    this.rentalService.updateReservation(reservation.id, { status }).subscribe({
      next: () => {
        this.toast('rentals.status_updated');
        this.loadReservations();
      },
      error: () => this.toast('rentals.status_error')
    });
  }

  markReservationReturned(reservation: any): void {
    this.rentalService.returnUnits(reservation.id, {}).subscribe({
      next: () => {
        this.toast('rentals.status_updated');
        this.loadReservations();
      },
      error: () => this.toast('rentals.status_error')
    });
  }

  processReservationReturn(reservation: any): void {
    const dialogRef = this.dialog.open(RentalsReservationReturnDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {
        reservation: this.selectedReservation && Number(this.selectedReservation?.id || 0) === Number(reservation?.id || 0)
          ? this.selectedReservation
          : reservation,
        partialOnly: false
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      if (result.mode === 'partial' && Array.isArray(result.return_lines)) {
        this.rentalService.returnUnits(Number(reservation.id), { return_lines: result.return_lines }).subscribe({
          next: () => {
            this.toast('rentals.status_updated');
            this.loadReservations();
          },
          error: () => this.toast('rentals.status_error')
        });
        return;
      }
      this.markReservationReturned(reservation);
    });
  }

  markReservationPartiallyReturned(reservation: any): void {
    const reservationId = Number(reservation?.id || 0);
    if (!reservationId) return;

    const openPartialDialog = (sourceReservation: any) => {
      const dialogRef = this.dialog.open(RentalsReservationReturnDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        data: {
          reservation: sourceReservation,
          partialOnly: true
        }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (!result || result.mode !== 'partial' || !Array.isArray(result.return_lines)) return;
        this.rentalService.returnUnits(reservationId, { return_lines: result.return_lines }).subscribe({
          next: () => {
            this.toast('rentals.status_updated');
            this.loadReservations();
          },
          error: () => this.toast('rentals.status_error')
        });
      });
    };

    if (this.selectedReservation && Number(this.selectedReservation?.id || 0) === reservationId) {
      openPartialDialog(this.selectedReservation);
      return;
    }

    this.rentalService.getReservation(reservationId).subscribe({
      next: (response: any) => {
        const payload = response?.data?.data ?? response?.data ?? response ?? null;
        openPartialDialog(payload || reservation);
      },
      error: () => this.toast('rentals.status_error')
    });
  }

  autoAssignReservation(reservation: any): void {
    this.rentalService.autoAssign(reservation.id).subscribe({
      next: () => {
        this.toast('rentals.status_updated');
        this.loadReservations();
      },
      error: () => this.toast('rentals.status_error')
    });
  }

  cancelReservation(reservation: any): void {
    const status = this.reservationUiStatusKey(reservation);
    if (status !== 'pending') {
      this.toast('rentals.cancel_only_pending');
      return;
    }

    const dialogRef = this.dialog.open(RentalsReasonDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {
        title: 'Cancelar reserva',
        message: 'Añade un motivo de cancelación. Se registrará en el historial de la reserva.',
        label: 'Motivo de cancelación',
        placeholder: this.translateService.instant('rentals.cancel_reason_prompt') || 'Motivo opcional',
        confirmText: 'Cancelar reserva',
        cancelText: this.translateService.instant('rentals.cancel') || 'Cancelar',
        required: false
      }
    });

    dialogRef.afterClosed().subscribe((reason: string | null) => {
      if (reason === null) return;

      this.rentalService.cancelReservation(Number(reservation.id), reason).subscribe({
        next: () => {
          this.toast('rentals.cancel_success');
          this.loadReservations();
          if (this.selectedReservation && Number(this.selectedReservation.id) === Number(reservation.id)) {
            this.selectedReservation = null;
          }
        },
        error: (err: any) => {
          const msg = err?.error?.message || this.translateService.instant('rentals.cancel_error');
          this.snackBar.open(msg, 'OK', { duration: 3500 });
        }
      });
    });
  }

  private async openRentalConfirmDialog(title: string, message: string, confirmText = 'Confirmar'): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title,
        message,
        confirmText,
        cancelText: this.translateService.instant('rentals.cancel') || 'Cancelar',
        isError: /eliminar|archivar/i.test(title),
        variant: 'rental'
      }
    });

    return Boolean(await firstValueFrom(dialogRef.afterClosed()));
  }

  reservationEvents: any[] = [];
  loadingEvents = false;

  loadReservationEvents(reservationId: number): void {
    this.loadingEvents = true;
    this.rentalService.getReservationEvents(reservationId).subscribe({
      next: (response: any) => {
        this.reservationEvents = response?.data ?? [];
        this.loadingEvents = false;
      },
      error: () => {
        this.reservationEvents = [];
        this.loadingEvents = false;
      }
    });
  }

  nextReservationPage(): void {
    this.reservationPage = Math.min(this.totalReservationPages, this.reservationPage + 1);
  }

  prevReservationPage(): void {
    this.reservationPage = Math.max(1, this.reservationPage - 1);
  }

  exportReservationsCsv(): void {
    const rows = this.filteredReservations.map((reservation) => {
      const client = this.reservationClient(reservation);
      return {
        id: Number(reservation?.id || 0),
        reference: String(reservation?.reference || ''),
        status: this.reservationUiStatusKey(reservation),
        client_name: this.clientLabel(client),
        client_email: String(client?.email || ''),
        start_date: this.dateOnly(reservation?.start_date),
        end_date: this.dateOnly(reservation?.end_date),
        pickup_time: this.reservationPickupTime(reservation),
        items: this.reservationTotalItems(reservation),
        total: this.reservationTotalPrice(reservation),
        currency: this.reservationCurrency(reservation)
      };
    });

    const header = [
      'id',
      'reference',
      'status',
      'client_name',
      'client_email',
      'start_date',
      'end_date',
      'pickup_time',
      'items',
      'total',
      'currency'
    ];

    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.id,
          this.escapeCsv(row.reference),
          this.escapeCsv(row.status),
          this.escapeCsv(row.client_name),
          this.escapeCsv(row.client_email),
          this.escapeCsv(row.start_date),
          this.escapeCsv(row.end_date),
          this.escapeCsv(row.pickup_time),
          row.items,
          Number(row.total || 0).toFixed(2),
          this.escapeCsv(row.currency)
        ].join(',')
      )
    ];

    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = this.todayDateString().replace(/-/g, '');
    link.href = url;
    link.download = `rental_reservations_${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  selectReservation(reservation: any): void {
    this.selectedReservation = reservation;
    this.openReservationDetails(reservation);
  }

  openReservationDetails(reservation: any): void {
    const reservationId = Number(reservation?.id || 0);
    if (!reservationId) return;
    this.router.navigate(['/rentals/reservation', reservationId]);
  }

  openLinkedBooking(reservation: any): void {
    const bookingId = Number(reservation?.booking_id || 0);
    if (!bookingId) return;
    this.router.navigate(['/bookings/update', bookingId]);
  }

  contactReservationCustomer(reservation: any): void {
    const client = this.reservationClient(reservation);
    const email = String(client?.email || '').trim();
    const phone = String(client?.phone || client?.mobile || '').trim();
    if (email) {
      window.open(`mailto:${email}`, '_blank');
      return;
    }
    if (phone) {
      window.open(`tel:${phone}`, '_self');
      return;
    }
    this.toast('rentals.no_contact_info');
  }

  editReservation(reservation: any): void {
    const reservationId = Number(reservation?.id || 0);
    if (!reservationId) return;
    this.router.navigate(['/rentals/reservation', reservationId, 'edit']);
  }

  markReservationPickedUp(reservation: any): void {
    const reservationId = Number(reservation?.id || 0);
    if (!reservationId) return;

    this.rentalService.autoAssign(reservationId).subscribe({
      next: () => {
        this.rentalService.updateReservation(reservationId, { status: 'active' }).subscribe({
          next: () => {
            this.toast('rentals.status_updated');
            this.loadReservations();
          },
          error: () => this.toast('rentals.status_error')
        });
      },
      error: () => this.toast('rentals.status_error')
    });
  }

  canMarkPickedUp(reservation: any): boolean {
    return this.reservationUiStatusKey(reservation) === 'pending';
  }

  canProcessReturn(reservation: any): boolean {
    const status = this.reservationUiStatusKey(reservation);
    return status === 'active' || status === 'overdue';
  }

  canContactCustomer(reservation: any): boolean {
    const status = this.reservationUiStatusKey(reservation);
    return status === 'active' || status === 'overdue';
  }

  canReportDamage(reservation: any): boolean {
    const status = this.reservationUiStatusKey(reservation);
    return status === 'completed' || status === 'overdue';
  }

  reportReservationDamage(reservation: any): void {
    const reservationId = Number(reservation?.id || 0);
    if (!reservationId) return;

    const lines = this.reservationLines(reservation).map((line: any) => ({
      id: Number(line.id),
      label: line.variant_name || line.name || `Line #${line.id}`
    }));

    const dialogRef = this.dialog.open(RentalsDamageDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: { reservation, lines }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.rentalService.registerDamage(reservationId, result).subscribe({
        next: () => this.toast('rentals.damage_reported'),
        error: () => this.toast('rentals.damage_report_error')
      });
    });
  }

  openPaymentDialog(reservation: any, tab: 'manual' | 'paylink' | 'deposit' = 'manual'): void {
    const dialogRef = this.dialog.open(RentalsPaymentDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      data: { reservation, tab }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action) this.loadReservations();
    });
  }

  reservationLines(reservation: any): any[] {
    if (!reservation) return [];
    if (Array.isArray(reservation?.lines)) return reservation.lines;
    if (Array.isArray(reservation?.lines_preview)) return reservation.lines_preview;
    if (Array.isArray(reservation?.items)) return reservation.items;
    if (Array.isArray(reservation?.rental_items)) return reservation.rental_items;
    return [];
  }

  reservationTotalItems(reservation: any): number {
    const lines = this.reservationLines(reservation);
    if (lines.length) {
      return lines.reduce((sum, line) => {
        return sum + Number(line?.quantity || line?.qty || 0);
      }, 0);
    }
    const fallback = Number(
      reservation?.items_count ??
      reservation?.line_items_count ??
      reservation?.lines_count ??
      0
    );
    return Number.isFinite(fallback) ? fallback : 0;
  }

  reservationClient(reservation: any): any {
    if (reservation?.client) return reservation.client;
    const clientId = Number(reservation?.client_id || 0);
    if (!clientId) return null;
    return this.clients.find((client) => Number(client?.id || 0) === clientId) || null;
  }

  reservationLineLabel(line: any): string {
    const explicitVariantName = String(line?.variant_name || '').trim();
    const explicitItemName = String(line?.item_name || '').trim();
    if (explicitVariantName) return explicitVariantName;
    if (explicitItemName) return explicitItemName;

    const variantId = Number(line?.variant_id || 0);
    const variant = variantId ? this.variants.find((candidate) => Number(candidate?.id || 0) === variantId) : null;
    const itemId = Number(line?.item_id || 0);
    const item = itemId ? this.items.find((candidate) => Number(candidate?.id || 0) === itemId) : null;
    const variantName = String(variant?.name || '').trim();
    const itemName = String(item?.name || '').trim();
    return variantName || itemName || `#${line?.id || '-'}`;
  }

  reservationLineSize(line: any): string {
    const explicitSize = String(line?.variant_size_label || line?.size_label || '').trim();
    if (explicitSize) return explicitSize;

    const variantId = Number(line?.variant_id || 0);
    const variant = variantId ? this.variants.find((candidate) => Number(candidate?.id || 0) === variantId) : null;
    return String(variant?.size_label || '').trim() || '-';
  }

  reservationLineSubtitle(line: any): string {
    const brand = String(line?.item_brand || '').trim();
    const model = String(line?.item_model || '').trim();
    const sku = String(line?.variant_sku || line?.sku || '').trim();

    const left = [brand, model].filter(Boolean).join(' · ');
    if (left && sku) return `${left} · ${sku}`;
    if (left) return left;
    if (sku) return sku;
    return '';
  }

  reservationLinePeriod(line: any, reservation: any): string {
    const start = line?.start_date || reservation?.start_date || '-';
    const end = line?.end_date || reservation?.end_date || '-';
    return `${start} → ${end}`;
  }

  reservationTotalPrice(reservation: any): number {
    return Number(
      reservation?.total_price ??
        reservation?.total ??
        reservation?.amount_total ??
        reservation?.price_total ??
        0
    );
  }

  reservationCurrency(reservation: any): string {
    return reservation?.currency || this.bookingEstimateCurrency;
  }

  reservationUiStatusKey(reservation: any): RentalUiStatusKey {
    const rawStatus = String(reservation?.status || '').toLowerCase();
    if (['completed', 'returned'].includes(rawStatus)) {
      return 'completed';
    }
    if (['cancelled', 'canceled'].includes(rawStatus)) {
      return 'cancelled';
    }
    if (this.isReservationOverdue(reservation)) {
      return 'overdue';
    }
    if (['pending'].includes(rawStatus)) {
      return 'pending';
    }
    if (['active', 'assigned', 'checked_out', 'partial_return'].includes(rawStatus)) {
      return 'active';
    }
    return 'pending';
  }

  reservationDateRangeLabel(reservation: any): string {
    const start = this.dateOnly(reservation?.start_date);
    const end = this.dateOnly(reservation?.end_date);
    if (!start && !end) return '-';
    const startLabel = start ? this.formatDateShort(start) : '-';
    const endLabel = end ? this.formatDateShort(end) : '-';
    return `${startLabel} - ${endLabel}`;
  }

  reservationDurationDays(reservation: any): number {
    const start = this.dateOnly(reservation?.start_date);
    const end = this.dateOnly(reservation?.end_date);
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 1;
    return Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
  }

  reservationPickupTime(reservation: any): string {
    const time = String(
      reservation?.pickup_time ||
      reservation?.start_time ||
      reservation?.hour_start ||
      ''
    ).trim();
    if (!time) return '';
    const withSeconds = /^(\d{1,2}):(\d{2})(?::\d{2})$/;
    const match = time.match(withSeconds);
    if (match) {
      const hour = String(Number(match[1])).padStart(2, '0');
      return `${hour}:${match[2]}`;
    }
    return time;
  }

  reservationDepositValue(reservation: any): number {
    return Number(
      reservation?.deposit_amount ??
      reservation?.deposit_total ??
      reservation?.deposit ??
      reservation?.payment?.deposit ??
      0
    );
  }

  private formatDateShort(dateText: string): string {
    if (!dateText) return '-';
    const date = new Date(dateText);
    if (isNaN(date.getTime())) return dateText;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  }

  private escapeCsv(value: any): string {
    const text = String(value ?? '');
    if (!text.includes(',') && !text.includes('"') && !text.includes('\n')) {
      return text;
    }
    return `"${text.replace(/"/g, '""')}"`;
  }

  matchesPeriodFilter(reservation: any): boolean {
    if (this.listPeriod === 'all') return true;
    const today = this.todayDateString();
    const startDate = this.dateOnly(reservation?.start_date);
    const endDate = this.dateOnly(reservation?.end_date);

    if (!startDate && !endDate) {
      return this.listPeriod === 'upcoming' ? false : true;
    }

    if (this.listPeriod === 'today') {
      const from = startDate || endDate || today;
      const to = endDate || startDate || today;
      return from <= today && to >= today;
    }
    if (this.listPeriod === 'upcoming') {
      const from = startDate || endDate || '';
      return !!from && from > today;
    }
    if (this.listPeriod === 'past') {
      const to = endDate || startDate || '';
      return !!to && to < today;
    }
    return true;
  }

  private isReservationOverdue(reservation: any): boolean {
    const rawStatus = String(reservation?.status || '').toLowerCase();
    if (['completed', 'returned'].includes(rawStatus)) return false;
    const endDate = this.dateOnly(reservation?.end_date);
    if (!endDate) return false;
    return endDate < this.todayDateString();
  }

  private dateOnly(value: any): string {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.slice(0, 10);
  }

  private todayDateString(): string {
    return this.toDateInput(new Date());
  }

  private normalizeTagsInput(raw: any): string[] {
    if (Array.isArray(raw)) {
      return raw
        .map((entry) => String(entry || '').trim())
        .filter((entry) => entry.length > 0);
    }
    const text = String(raw || '').trim();
    if (!text) return [];
    return text
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  categoryName(categoryId: number | null): string {
    if (!categoryId) return '-';
    return this.categories.find((category) => Number(category?.id || 0) === Number(categoryId))?.name || `#${categoryId}`;
  }

  categoryCount(categoryId: number): number {
    return this.inventoryBaseRows.filter((row) => row.item?.category_id === categoryId).length;
  }

  groupTotalUnits(group: any): number {
    if (!group?.variants?.length) return 0;
    return group.variants.reduce((sum: number, row: any) => sum + Number(row?.total || 0), 0);
  }

  subcategoryCount(subcategory: string): number {
    const target = (subcategory || '').trim().toLowerCase();
    if (!target) return 0;
    return this.inventoryRows.filter((row) => (row?.subcategoryName || '').trim().toLowerCase() === target).length;
  }

  categoryIcon(name: string): string {
    const key = (name || '').toLowerCase();
    if (key.includes('ski')) return 'downhill_skiing';
    if (key.includes('snow')) return 'snowboarding';
    if (key.includes('boot') || key.includes('access')) return 'hiking';
    if (key.includes('cloth') || key.includes('jack')) return 'checkroom';
    return 'inventory_2';
  }

  categoryEmoji(name: string): string {
    const key = (name || '').toLowerCase();
    if (key.includes('ski')) return '⛷️';
    if (key.includes('snow')) return '🏂';
    if (key.includes('boot') || key.includes('access')) return '🎿';
    if (key.includes('cloth') || key.includes('jack')) return '🧥';
    if (key.includes('helmet')) return '⛑️';
    return '🧰';
  }

  rowPriceLabel(row: any): string {
    const rule =
      this.pricingRules.find((pricingRule) => pricingRule.variant_id === row.id) ||
      this.pricingRules.find((pricingRule) => pricingRule.item_id === row.item_id);
    if (!rule) return '-';
    return `${rule.price} ${this.resolveCurrencyCandidate(rule.currency, this.bookingEstimateCurrency)}`;
  }

  rowPriceLines(row: any): Array<{ label: string; price: number; currency: string }> {
    const byVariant = this.pricingRules.filter((pricingRule) => Number(pricingRule.variant_id) === Number(row.id));
    const byItem = this.pricingRules.filter((pricingRule) => Number(pricingRule.item_id) === Number(row.item_id));
    const rules = byVariant.length ? byVariant : byItem;
    const labels: Record<string, string> = {
      half_day: '½ day',
      full_day: '1 day',
      multi_day: 'Multi-day',
      week: 'Week',
      season: 'Season'
    };
    const order = ['half_day', 'full_day', 'week', 'multi_day', 'season'];
    const uniqueByPeriod: Record<string, any> = {};
    rules
      .filter((rule) => !!rule?.price)
      .filter((rule) => rule?.active === undefined || rule?.active === true || Number(rule?.active) === 1)
      .forEach((rule) => {
        const period = String(rule?.period_type || '').toLowerCase().trim();
        if (!period) return;
        const previous = uniqueByPeriod[period];
        if (!previous || Number(rule?.id || 0) > Number(previous?.id || 0)) {
          uniqueByPeriod[period] = rule;
        }
      });

    return Object.values(uniqueByPeriod)
      .sort((a: any, b: any) => {
        const left = order.indexOf(String(a?.period_type || '').toLowerCase());
        const right = order.indexOf(String(b?.period_type || '').toLowerCase());
        return (left < 0 ? Number.MAX_SAFE_INTEGER : left) - (right < 0 ? Number.MAX_SAFE_INTEGER : right);
      })
      .map((rule) => ({
        label: labels[rule.period_type] || rule.period_type,
        price: Number(rule.price || 0),
        currency: rule.currency || this.bookingEstimateCurrency
      }));
  }

  rowUnitPrice(row: any, periodType?: PeriodType): number {
    const byVariant = this.pricingRules.filter((pricingRule) => Number(pricingRule.variant_id) === Number(row.id));
    const byItem = this.pricingRules.filter((pricingRule) => Number(pricingRule.item_id) === Number(row.item_id));
    const exact =
      (periodType ? byVariant.find((pricingRule) => pricingRule.period_type === periodType) : null) ||
      (periodType ? byItem.find((pricingRule) => pricingRule.period_type === periodType) : null);
    const fallback = byVariant[0] || byItem[0];
    const rule = exact || fallback;
    return Number(rule?.price || 0);
  }

  rowUnitCurrency(row: any, periodType?: PeriodType): string {
    const byVariant = this.pricingRules.filter((pricingRule) => Number(pricingRule.variant_id) === Number(row.id));
    const byItem = this.pricingRules.filter((pricingRule) => Number(pricingRule.item_id) === Number(row.item_id));
    const exact =
      (periodType ? byVariant.find((pricingRule) => pricingRule.period_type === periodType) : null) ||
      (periodType ? byItem.find((pricingRule) => pricingRule.period_type === periodType) : null);
    const fallback = byVariant[0] || byItem[0];
    const rule = exact || fallback;
    return rule?.currency || this.bookingEstimateCurrency;
  }

  get bookingDurationDays(): number {
    const startDate = this.bookingForm.get('start_date')?.value as string;
    const endDate = this.bookingForm.get('end_date')?.value as string;
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }

  get bookingEstimateTotal(): number {
    return Number(this.pricingQuote?.subtotal || 0);
  }

  bookingLineTotal(row: any): number {
    return Number(this.findQuoteLineByVariantId(Number(row?.id || 0))?.line_total || 0);
  }

  get bookingEstimateCurrency(): string {
    if (this.pricingQuote?.currency) {
      return this.pricingQuote.currency;
    }
    const firstRule = this.pricingRules.find((rule) => !!rule?.currency);
    return this.resolveCurrencyCandidate(firstRule?.currency, this.schoolCurrencyFromUser());
  }

  rowCondition(row: any): string {
    const relevantUnits = this.units.filter((unit) => unit.variant_id === row.id);
    if (!relevantUnits.length) return '-';
    return relevantUnits[0]?.condition || '-';
  }

  rowConditionLabel(row: any): string {
    const condition = String(this.rowCondition(row) || '').toLowerCase();
    if (condition === 'excellent') return 'rentals.condition_label_excellent';
    if (condition === 'good') return 'rentals.condition_label_good';
    if (condition === 'fair') return 'rentals.condition_label_fair';
    return condition ? condition : '-';
  }

  rowPrimaryPrice(row: any): { label: string; price: number; currency: string } | null {
    const lines = this.rowPriceLines(row);
    return lines.find((l: any) => l.label === '1 day') || lines[0] || null;
  }

  rowBarcode(row: any): string {
    return row?.barcode || this.units.find((unit) => unit.variant_id === row.id && !!unit.serial)?.serial || row?.sku || `RV-${row?.id}`;
  }

  inventoryQrData(row: any): string {
    if (!row) return '';
    return JSON.stringify({
      variant_id: row.id,
      item_id: row.item_id,
      sku: row.sku || null,
      barcode: this.rowBarcode(row),
      category: this.categoryName(row.item?.category_id || null),
      subcategory: row.subcategoryName || null,
      size: row.size_label || null
    });
  }

  clientLabel(client: any): string {
    if (!client) return '-';
    return `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || `#${client.id}`;
  }

  trackById(_: number, row: any): number {
    return row?.id;
  }

  async startScanner(target: ScanTarget): Promise<void> {
    this.scannerError = '';
    this.scanTarget = target;

    if (!('BarcodeDetector' in window)) {
      this.scannerError = 'rentals.scanner_not_supported';
      this.toast('rentals.scanner_not_supported');
      return;
    }

    try {
      this.stopScanner();
      this.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        }
      });

      const video = this.scannerVideo?.nativeElement;
      if (!video) {
        this.stopScanner();
        return;
      }

      video.srcObject = this.scannerStream;
      await video.play();
      this.scanning = true;

      const BarcodeDetectorAny: any = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorAny({
        formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39']
      });

      this.scannerIntervalId = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (!codes || !codes.length) return;
          const raw = codes[0]?.rawValue;
          if (!raw) return;
          this.addEquipmentForm.patchValue({
            [this.scanTarget]: raw
          });
          this.stopScanner();
          this.toast('rentals.scanner_success');
        } catch (error) {
          this.scannerError = 'rentals.scanner_error';
        }
      }, 350);
    } catch (error) {
      this.scannerError = 'rentals.scanner_permission_error';
      this.toast('rentals.scanner_permission_error');
      this.stopScanner();
    }
  }

  stopScanner(): void {
    if (this.scannerIntervalId) {
      clearInterval(this.scannerIntervalId);
      this.scannerIntervalId = null;
    }
    if (this.scannerStream) {
      this.scannerStream.getTracks().forEach((track) => track.stop());
      this.scannerStream = null;
    }
    const video = this.scannerVideo?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    this.scanning = false;
  }

  loadAll(): void {
    this.loading = true;

    Promise.all([
      this.loadReferenceData(),
      this.loadInventoryData(),
      this.view === 'catalog' ? this.loadOperationalData() : Promise.resolve()
    ])
      .then(() => {
        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
        this.toast('rentals.load_error');
      });
  }

  private async loadReferenceData(): Promise<void> {
    const [categories, subcategories, brands, models, clients] = await Promise.all([
      this.wrapPaged(this.rentalService.listCategories({ per_page: 300 })),
      this.wrapPaged(this.rentalService.listSubcategories({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listBrands({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listModels({ per_page: 1000 })),
      this.wrapPaged(this.rentalService.listClients({ per_page: 300 }))
    ]);
    this.categories = categories;
    this.subcategories = subcategories;
    this.brands = brands;
    this.models = models;
    this.clients = clients;
  }

  private async loadInventoryData(): Promise<void> {
    const [items, variants, units, warehouses, pickupPoints, pricingRules] = await Promise.all([
      this.wrapPaged(this.rentalService.listItems({ per_page: 1000 })),
      this.wrapPaged(this.rentalService.listVariants({ per_page: 2000 })),
      this.wrapPaged(this.rentalService.listUnits({ per_page: 3000 })),
      this.wrapPaged(this.rentalService.listWarehouses(this.getWarehousesQueryFilters())),
      this.wrapPaged(this.rentalService.listPickupPoints(this.getPickupPointsQueryFilters())),
      this.wrapPaged(this.rentalService.listPricingRules({ per_page: 1000 }))
    ]);
    this.items = items;
    this.variants = variants;
    this.units = units;
    this.warehouses = warehouses;
    this.pickupPoints = pickupPoints;
    this.pricingRules = pricingRules;
  }

  private async loadWarehouseData(): Promise<void> {
    this.warehouses = await this.wrapPaged(this.rentalService.listWarehouses(this.getWarehousesQueryFilters()));
  }

  private async loadPickupPointData(): Promise<void> {
    this.pickupPoints = await this.wrapPaged(this.rentalService.listPickupPoints(this.getPickupPointsQueryFilters()));
  }

  private async loadOperationalData(): Promise<void> {
    this.stockMovements = await this.wrapPaged(this.rentalService.listStockMovements(this.getStockMovementsQueryFilters()));
  }

  private loadReservations(): void {
    this.loadingReservations = true;
    this.wrapPaged(this.rentalService.listReservations({ per_page: 400 }))
      .then((reservations) => {
        this.reservations = reservations;
        this.tryOpenReservationFromQuery();
        this.loadingReservations = false;
      })
      .catch(() => {
        this.loadingReservations = false;
        this.toast('rentals.load_error');
      });
  }

  private tryOpenReservationFromQuery(): void {
    const reservationId = Number(this.pendingReservationId || 0);
    if (!reservationId || !Array.isArray(this.reservations) || this.reservations.length === 0) return;
    const reservation = this.reservations.find((row: any) => Number(row?.id || 0) === reservationId);
    if (!reservation) return;
    this.pendingReservationId = null;
    this.openReservationDetails(reservation);
  }

  private applyPeriodPreset(period: PeriodType): void {
    const startDate = this.bookingForm.get('start_date')?.value;
    if (!startDate) return;
    const start = new Date(startDate as string);
    const end = new Date(start);

    switch (period) {
      case 'half_day':
        this.bookingForm.patchValue({ end_date: this.toDateInput(start), end_time: '13:00' }, { emitEvent: false });
        break;
      case 'full_day':
        this.bookingForm.patchValue({ end_date: this.toDateInput(start), end_time: '17:00' }, { emitEvent: false });
        break;
      case 'week':
        end.setDate(end.getDate() + 6);
        this.bookingForm.patchValue({ end_date: this.toDateInput(end), end_time: '17:00' }, { emitEvent: false });
        break;
      case 'season':
        end.setMonth(end.getMonth() + 4);
        this.bookingForm.patchValue({ end_date: this.toDateInput(end), end_time: '17:00' }, { emitEvent: false });
        break;
      default:
        break;
    }
  }

  lineUsesCustom(variantId: number): boolean {
    return !!this.linePeriods[Number(variantId)];
  }

  toggleLineCustomPeriod(variantId: number, enabled: boolean): void {
    const id = Number(variantId);
    if (!enabled) {
      delete this.linePeriods[id];
      void this.refreshPricingQuote();
      return;
    }
    this.linePeriods[id] = this.buildDefaultLinePeriod();
    void this.refreshPricingQuote();
  }

  updateLinePeriodField(variantId: number, field: keyof LinePeriodConfig, value: string): void {
    const id = Number(variantId);
    const current = this.getLinePeriod(id);
    const next: LinePeriodConfig = { ...current, [field]: value };
    if (field === 'period_type') {
      this.linePeriods[id] = this.applyPeriodPresetToLine(next);
      void this.refreshPricingQuote();
      return;
    }
    if (!this.lineUsesCustom(id)) return;
    this.linePeriods[id] = next;
    void this.refreshPricingQuote();
  }

  getLinePeriod(variantId: number): LinePeriodConfig {
    const id = Number(variantId);
    return this.linePeriods[id] || this.buildDefaultLinePeriod();
  }

  periodDurationDays(period: LinePeriodConfig): number {
    const startDate = period?.start_date;
    const endDate = period?.end_date;
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }

  private buildDefaultLinePeriod(): LinePeriodConfig {
    const periodType = ((this.bookingForm.get('period_type')?.value as PeriodType) || 'full_day');
    const value: LinePeriodConfig = {
      period_type: periodType,
      start_date: (this.bookingForm.get('start_date')?.value as string) || '',
      end_date: (this.bookingForm.get('end_date')?.value as string) || '',
      start_time: (this.bookingForm.get('start_time')?.value as string) || '09:00',
      end_time: (this.bookingForm.get('end_time')?.value as string) || '17:00'
    };
    return this.applyPeriodPresetToLine(value);
  }

  private applyPeriodPresetToLine(line: LinePeriodConfig): LinePeriodConfig {
    const base = { ...line };
    if (!base.start_date) return base;
    const start = new Date(base.start_date);
    if (isNaN(start.getTime())) return base;
    const end = new Date(start);

    switch (base.period_type) {
      case 'half_day':
        base.end_date = this.toDateInput(start);
        base.end_time = base.start_time && base.start_time < '12:30' ? '13:00' : '17:00';
        break;
      case 'full_day':
        base.end_date = this.toDateInput(start);
        base.end_time = '17:00';
        break;
      case 'week':
        end.setDate(end.getDate() + 6);
        base.end_date = this.toDateInput(end);
        base.end_time = '17:00';
        break;
      case 'season':
        end.setMonth(end.getMonth() + 4);
        base.end_date = this.toDateInput(end);
        base.end_time = '17:00';
        break;
      default:
        break;
    }
    return base;
  }

  private async refreshPricingQuote(): Promise<void> {
    if (!this.selectedRows.length) {
      this.pricingQuote = null;
      this.quoteLoading = false;
      return;
    }

    const payload = this.buildQuotePayload();
    if (!payload) {
      this.pricingQuote = null;
      this.quoteLoading = false;
      return;
    }

    const requestId = ++this.quoteRequestId;
    this.quoteLoading = true;

    try {
      const response: any = await firstValueFrom(this.rentalService.quoteReservation(payload));
      if (requestId !== this.quoteRequestId) return;
      const data = response?.data?.data ?? response?.data ?? null;
      this.pricingQuote = data ? this.normalizeQuote(data) : null;
    } catch {
      if (requestId !== this.quoteRequestId) return;
      this.pricingQuote = null;
    } finally {
      if (requestId === this.quoteRequestId) {
        this.quoteLoading = false;
      }
    }
  }

  private buildQuotePayload(): any | null {
    const formValue = this.bookingForm.value;
    if (!formValue.start_date || !formValue.end_date || !this.selectedRows.length) {
      return null;
    }

    return {
      start_date: formValue.start_date,
      end_date: formValue.end_date,
      start_time: formValue.start_time,
      end_time: formValue.end_time,
      period_type: formValue.period_type,
      lines: Object.entries(this.selectedItems).map(([variantId, qty]) => {
        const numericVariantId = Number(variantId);
        const row = this.inventoryRows.find((candidate) => Number(candidate.id) === numericVariantId);
        const linePeriod = this.getLinePeriod(numericVariantId);
        return {
          item_id: row?.item_id || null,
          variant_id: numericVariantId,
          quantity: Number(qty),
          period_type: linePeriod.period_type,
          start_date: linePeriod.start_date,
          end_date: linePeriod.end_date,
          start_time: linePeriod.start_time,
          end_time: linePeriod.end_time
        };
      })
    };
  }

  private normalizeQuote(quote: any): RentalPricingQuote {
    const fallbackCurrency = this.resolveCurrencyCandidate(quote?.currency, this.schoolCurrencyFromUser());
    return {
      currency: String(fallbackCurrency || ''),
      subtotal: Number(quote?.subtotal || 0),
      discount_total: Number(quote?.discount_total || 0),
      tax_total: Number(quote?.tax_total || 0),
      total: Number(quote?.total || quote?.subtotal || 0),
      total_quantity: Number(quote?.total_quantity || 0),
      period: {
        start_date: String(quote?.period?.start_date || ''),
        end_date: String(quote?.period?.end_date || ''),
        start_time: String(quote?.period?.start_time || ''),
        end_time: String(quote?.period?.end_time || ''),
        rental_days: Number(quote?.period?.rental_days || 0)
      },
      lines: Array.isArray(quote?.lines) ? quote.lines.map((line: any) => ({
        item_id: line?.item_id ?? null,
        variant_id: Number(line?.variant_id || 0),
        quantity: Number(line?.quantity || 0),
        currency: String(this.resolveCurrencyCandidate(line?.currency, quote?.currency, fallbackCurrency)),
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
      })) : []
    };
  }

  findQuoteLineByVariantId(variantId: number): RentalPricingQuoteLine | undefined {
    return this.pricingQuote?.lines?.find((line) => Number(line.variant_id) === Number(variantId));
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private wrapPaged(obs: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      obs.subscribe({
        next: (response: any) => {
          if (Array.isArray(response)) {
            resolve(response);
            return;
          }
          const data = response?.data?.data ?? response?.data ?? [];
          resolve(Array.isArray(data) ? data : []);
        },
        error: reject
      });
    });
  }

  private async getData(obs: any): Promise<any> {
    const response: any = await firstValueFrom(obs);
    return response?.data?.data ?? response?.data ?? null;
  }

  private subcategoryNameById(subcategoryId: number | null): string | null {
    if (!subcategoryId) return null;
    return this.subcategories.find((subcategory) => Number(subcategory.id) === Number(subcategoryId))?.name || null;
  }

  brandName(brandId: number): string {
    if (!brandId) return '-';
    const matched = this.brands.find((brand) => Number(brand?.id || 0) === Number(brandId));
    return String(matched?.name || '-');
  }

  warehouseNameById(warehouseId: number): string {
    if (!warehouseId) return '-';
    const matched = this.warehouses.find((warehouse) => Number(warehouse?.id || 0) === Number(warehouseId));
    return String(matched?.name || '-');
  }

  modelUsageCount(modelId: number): number {
    return this.items.filter((item) => Number(item?.model_id || 0) === Number(modelId)).length;
  }

  private brandNameById(brandId: number | null): string {
    if (!brandId) return '';
    return String(this.brands.find((brand) => Number(brand?.id || 0) === Number(brandId))?.name || '').trim();
  }

  private modelNameById(modelId: number | null): string {
    if (!modelId) return '';
    return String(this.models.find((model) => Number(model?.id || 0) === Number(modelId))?.name || '').trim();
  }

  private titleizeText(value: string): string {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  pickupPointCapabilityLabel(point: any): string {
    const allowsPickup = !!point?.allow_pickup;
    const allowsReturn = !!point?.allow_return;
    if (allowsPickup && allowsReturn) return 'Recogida y devolución';
    if (allowsPickup) return 'Solo recogida';
    if (allowsReturn) return 'Solo devolución';
    return 'Operación inactiva';
  }

  stockMovementTypeLabel(value: string): string {
    const key = String(value || '').toLowerCase();
    const labels: Record<string, string> = {
      in: 'Entrada',
      out: 'Salida',
      transfer: 'Transferencia',
      adjustment: 'Ajuste',
      assign: 'Asignado',
      return: 'Devuelto',
      damage: 'Daño',
      maintenance_set: 'Entrada a mantenimiento',
      maintenance_release: 'Salida de mantenimiento'
    };
    return labels[key] || this.titleizeText(key || 'other');
  }

  stockMovementDirectionClass(value: string): string {
    const key = String(value || '').toLowerCase();
    if (['in', 'return', 'maintenance_release'].includes(key)) return 'positive';
    if (['out', 'assign', 'damage', 'maintenance_set'].includes(key)) return 'negative';
    return 'neutral';
  }

  private resolveStockMovementItemName(movement: any): string {
    const direct = String(movement?.item_name || movement?.item?.name || '').trim();
    if (direct) return direct;
    const variant = this.variants.find((row) => Number(row?.id || 0) === Number(movement?.variant_id || 0));
    const item = this.items.find((row) => Number(row?.id || 0) === Number(variant?.item_id || 0));
    return String(item?.name || item?.title || '-');
  }

  subcategoryOptionLabel(subcategory: any): string {
    return String(subcategory?.pathLabel || subcategory?.name || '').trim();
  }

  private subcategoryPathLabel(subcategoryId: number, categoryId: number): string {
    if (!subcategoryId) return '';
    const byId = new Map<number, any>();
    this.subcategories
      .filter((subcategory) => Number(subcategory?.category_id || 0) === Number(categoryId || 0))
      .forEach((subcategory) => byId.set(Number(subcategory?.id || 0), subcategory));

    const labels: string[] = [];
    let cursor = byId.get(Number(subcategoryId));
    const visited = new Set<number>();
    let guard = 0;
    while (cursor && guard < 50) {
      const cursorId = Number(cursor?.id || 0);
      if (cursorId > 0 && visited.has(cursorId)) {
        break;
      }
      if (cursorId > 0) {
        visited.add(cursorId);
      }
      const name = String(cursor?.name || '').trim();
      if (name) labels.unshift(name);
      const parentId = Number(cursor?.parent_id || 0);
      if (!parentId) break;
      cursor = byId.get(parentId);
      guard++;
    }

    return labels.join(' / ') || String(byId.get(Number(subcategoryId))?.name || '').trim();
  }

  private subcategoryDepth(subcategoryId: number, categoryId: number): number {
    if (!subcategoryId) return 0;
    const byId = new Map<number, any>();
    this.subcategories
      .filter((subcategory) => Number(subcategory?.category_id || 0) === Number(categoryId || 0))
      .forEach((subcategory) => byId.set(Number(subcategory?.id || 0), subcategory));

    let depth = 0;
    let cursor = byId.get(Number(subcategoryId));
    const visited = new Set<number>();
    let guard = 0;
    while (cursor && guard < 50) {
      const cursorId = Number(cursor?.id || 0);
      if (cursorId > 0 && visited.has(cursorId)) {
        break;
      }
      if (cursorId > 0) {
        visited.add(cursorId);
      }
      const parentId = Number(cursor?.parent_id || 0);
      if (!parentId) break;
      const parent = byId.get(parentId);
      if (!parent) break;
      depth++;
      cursor = parent;
      guard++;
    }
    return depth;
  }

  private descendantSubcategoryIds(rootId: number, categoryId: number): Set<number> {
    const childrenByParent = new Map<number, number[]>();
    this.subcategories
      .filter((subcategory) => Number(subcategory?.category_id || 0) === Number(categoryId || 0))
      .forEach((subcategory) => {
        const parentId = Number(subcategory?.parent_id || 0);
        if (!parentId) {
          return;
        }
        const list = childrenByParent.get(parentId) || [];
        list.push(Number(subcategory?.id || 0));
        childrenByParent.set(parentId, list);
      });

    const blocked = new Set<number>();
    const queue: number[] = [Number(rootId || 0)];
    while (queue.length) {
      const current = Number(queue.shift() || 0);
      if (!current) {
        continue;
      }
      const children = childrenByParent.get(current) || [];
      children.forEach((childId) => {
        if (blocked.has(childId)) {
          return;
        }
        blocked.add(childId);
        queue.push(childId);
      });
    }
    return blocked;
  }

  private getWarehousesQueryFilters(): Record<string, any> {
    return {
      per_page: 500,
      include_archived: this.showArchivedWarehouses ? 1 : undefined
    };
  }

  private getPickupPointsQueryFilters(): Record<string, any> {
    return {
      per_page: 500,
      include_archived: this.showArchivedPickupPoints ? 1 : undefined
    };
  }

  private getStockMovementsQueryFilters(): Record<string, any> {
    return {
      per_page: 1000,
      movement_type: this.stockMovementFilters.movement_type || undefined,
      warehouse_id: this.stockMovementFilters.warehouse_id || undefined,
      user_id: this.stockMovementFilters.user_id || undefined,
      item_id: this.stockMovementFilters.item_id || undefined,
      variant_id: this.stockMovementFilters.variant_id || undefined,
      date_from: this.stockMovementFilters.date_from || undefined,
      date_to: this.stockMovementFilters.date_to || undefined
    };
  }

  private loadUnitMaintenanceHistory(unitId: number | null | undefined): void {
    const id = Number(unitId || 0);
    if (!id) {
      this.maintenanceHistory = [];
      this.maintenanceHistoryLoading = false;
      return;
    }
    this.maintenanceHistoryLoading = true;
    this.rentalService.getUnitMaintenanceHistory(id).subscribe({
      next: (response: any) => {
        const rows = response?.data?.data ?? response?.data ?? [];
        this.maintenanceHistory = Array.isArray(rows) ? rows : [];
        this.maintenanceHistoryLoading = false;
      },
      error: () => {
        this.maintenanceHistory = [];
        this.maintenanceHistoryLoading = false;
      }
    });
  }

  private toastCrudError(error: any, fallbackKey: string): void {
    const backendMessage = this.extractBackendErrorMessage(error);
    if (backendMessage) {
      this.snackBar.open(backendMessage, 'OK', { duration: 3800 });
      return;
    }
    this.toast(fallbackKey);
  }

  private extractBackendErrorMessage(error: any): string | null {
    const direct = String(error?.error?.message || error?.message || '').trim();
    if (direct) return direct;

    const errors = error?.error?.errors;
    if (errors && typeof errors === 'object') {
      const firstField = Object.keys(errors)[0];
      const firstMessage = firstField ? errors[firstField]?.[0] : null;
      const text = String(firstMessage || '').trim();
      if (text) return text;
    }

    return null;
  }

  private async resolveSubcategoryForForm(categoryId: number): Promise<number | null> {
    const subcategoryId = Number(this.addEquipmentForm.get('subcategory_id')?.value || 0);
    if (subcategoryId) {
      return subcategoryId;
    }

    const subcategoryName = (this.addEquipmentForm.get('subcategory_name')?.value || '').trim();
    if (!subcategoryName) {
      return null;
    }

    const existing = this.subcategories.find(
      (subcategory) =>
        Number(subcategory.category_id) === Number(categoryId) &&
        (subcategory.name || '').toLowerCase() === subcategoryName.toLowerCase()
    );
    if (existing?.id) {
      return Number(existing.id);
    }

    const created = await this.getData(
      this.rentalService.createSubcategory({
        category_id: categoryId,
        name: subcategoryName,
        active: true
      })
    );
    if (created?.id) {
      this.subcategories = [...this.subcategories, created];
      return Number(created.id);
    }
    return null;
  }

  private toast(message: string): void {
    const translated = this.translateService.instant(message);
    this.snackBar.open(translated, 'OK', { duration: 2800 });
  }

  private resolveCurrencyCandidate(...candidates: any[]): string {
    const detected = candidates
      .map((candidate) => String(candidate || '').trim().toUpperCase())
      .find((candidate) => candidate.length > 0);
    return detected || '';
  }

  private onAddEquipmentBrandChanged(brandId: number | null): void {
    const modelId = Number(this.addEquipmentForm.get('model_id')?.value || 0);
    if (!modelId) return;
    const model = this.models.find((entry) => Number(entry?.id || 0) === modelId);
    if (!model) {
      this.addEquipmentForm.patchValue({ model_id: null }, { emitEvent: false });
      return;
    }
    if (brandId && Number(model?.brand_id || 0) !== brandId) {
      this.addEquipmentForm.patchValue({ model_id: null }, { emitEvent: false });
    }
  }
}
