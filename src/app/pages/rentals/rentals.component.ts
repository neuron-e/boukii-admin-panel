import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RentalService } from 'src/service/rental.service';

@Component({
  selector: 'vex-rentals',
  templateUrl: './rentals.component.html',
  styleUrls: ['./rentals.component.scss']
})
export class RentalsComponent implements OnInit {
  loading = false;

  readonly defaultPageSize = 8;
  readonly serverPagedTables = new Set<string>([
    'categories',
    'items',
    'variants',
    'warehouses',
    'pickupPoints',
    'units',
    'pricingRules',
    'reservations'
  ]);
  serverPagination: Record<string, { page: number; lastPage: number; total: number; perPage: number }> = {
    categories: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize },
    items: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize },
    variants: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize },
    warehouses: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize },
    pickupPoints: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize },
    units: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize },
    pricingRules: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize },
    reservations: { page: 1, lastPage: 1, total: 0, perPage: this.defaultPageSize }
  };
  tableState: Record<string, { search: string; page: number; pageSize: number; sortKey: string; sortDir: 'asc' | 'desc' }> = {
    categories: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'name', sortDir: 'asc' },
    items: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'name', sortDir: 'asc' },
    variants: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'name', sortDir: 'asc' },
    warehouses: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'name', sortDir: 'asc' },
    pickupPoints: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'name', sortDir: 'asc' },
    units: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'id', sortDir: 'desc' },
    pricingRules: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'id', sortDir: 'desc' },
    reservations: { search: '', page: 1, pageSize: this.defaultPageSize, sortKey: 'id', sortDir: 'desc' }
  };

  editingCategoryId: number | null = null;
  editingItemId: number | null = null;
  editingVariantId: number | null = null;
  editingWarehouseId: number | null = null;
  editingPickupPointId: number | null = null;
  editingUnitId: number | null = null;
  editingPricingRuleId: number | null = null;

  categories: any[] = [];
  items: any[] = [];
  variants: any[] = [];
  warehouses: any[] = [];
  pickupPoints: any[] = [];
  units: any[] = [];
  pricingRules: any[] = [];
  reservations: any[] = [];
  policy: any = null;
  unitFilters = {
    warehouse_id: null as number | null,
    status: '',
    search: ''
  };
  reservationFilters = {
    status: '',
    start_date_from: '',
    start_date_to: '',
    search: ''
  };

  categoryForm = this.fb.group({
    name: ['', Validators.required],
    code: [''],
    description: [''],
    active: [true]
  });

  itemForm = this.fb.group({
    category_id: [null, Validators.required],
    sport_id: [null],
    name: ['', Validators.required],
    brand: [''],
    model: [''],
    description: [''],
    active: [true]
  });

  variantForm = this.fb.group({
    item_id: [null, Validators.required],
    name: ['', Validators.required],
    size_label: [''],
    size_group: [''],
    sku: [''],
    active: [true]
  });

  warehouseForm = this.fb.group({
    name: ['', Validators.required],
    code: [''],
    address: [''],
    active: [true]
  });

  pickupPointForm = this.fb.group({
    warehouse_id: [null],
    name: ['', Validators.required],
    address: [''],
    allow_pickup: [true],
    allow_return: [true],
    active: [true]
  });

  unitForm = this.fb.group({
    variant_id: [null, Validators.required],
    warehouse_id: [null, Validators.required],
    serial: [''],
    status: ['available', Validators.required],
    condition: ['']
  });

  pricingForm = this.fb.group({
    item_id: [null],
    variant_id: [null],
    pricing_type: ['per_day', Validators.required],
    min_quantity: [1],
    price: [0, Validators.required],
    currency: [''],
    start_date: [''],
    end_date: [''],
    active: [true]
  });

  policyForm = this.fb.group({
    deposit_enabled: [false],
    deposit_amount: [0],
    insurance_enabled: [false],
    insurance_fee: [0],
    late_fee_enabled: [false],
    late_fee_per_day: [0],
    currency: ['']
  });

  reservationForm = this.fb.group({
    client_id: [null, Validators.required],
    pickup_point_id: [null],
    return_point_id: [null],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    start_time: [''],
    end_time: [''],
    variant_id: [null, Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  bookingReservationForm = this.fb.group({
    booking_id: [null, Validators.required],
    pickup_point_id: [null],
    return_point_id: [null],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    start_time: [''],
    end_time: [''],
    variant_id: [null, Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    booking_user_id: [null]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly rentalService: RentalService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.pricingForm.patchValue({ currency: this.schoolCurrency });
    this.policyForm.patchValue({ currency: this.schoolCurrency });
    this.loadAll();
  }

  get totalUnitsAvailable(): number {
    return this.units.filter((u) => (u?.status || '').toLowerCase() === 'available').length;
  }

  get totalUnitsAssigned(): number {
    return this.units.filter((u) => (u?.status || '').toLowerCase() === 'assigned').length;
  }

  get pendingReservations(): number {
    return this.reservations.filter((r) => (r?.status || '').toLowerCase() === 'pending').length;
  }

  loadAll(): void {
    this.loading = true;
    Promise.all([
      this.wrapPaged(this.rentalService.listCategories(this.getCategoriesQueryFilters()), 'categories'),
      this.wrapPaged(this.rentalService.listItems(this.getItemsQueryFilters()), 'items'),
      this.wrapPaged(this.rentalService.listVariants(this.getVariantsQueryFilters()), 'variants'),
      this.wrapPaged(this.rentalService.listWarehouses(this.getWarehousesQueryFilters()), 'warehouses'),
      this.wrapPaged(this.rentalService.listPickupPoints(this.getPickupPointsQueryFilters()), 'pickupPoints'),
      this.wrapPaged(this.rentalService.listUnits(this.getUnitsQueryFilters()), 'units'),
      this.wrapPaged(this.rentalService.listPricingRules(this.getPricingRulesQueryFilters()), 'pricingRules'),
      this.wrapPaged(this.rentalService.listReservations(this.getReservationsQueryFilters()), 'reservations'),
      this.wrapObject(this.rentalService.getPolicy())
    ]).then(([categories, items, variants, warehouses, pickupPoints, units, pricingRules, reservations, policy]) => {
      this.categories = categories;
      this.items = items;
      this.variants = variants;
      this.warehouses = warehouses;
      this.pickupPoints = pickupPoints;
      this.units = units;
      this.pricingRules = pricingRules;
      this.reservations = reservations;
      this.policy = policy ?? null;
      if (policy) {
        this.policyForm.patchValue({
          deposit_enabled: !!policy.deposit_enabled,
          deposit_amount: Number(policy.deposit_amount || 0),
          insurance_enabled: !!policy.insurance_enabled,
          insurance_fee: Number(policy.insurance_fee || 0),
          late_fee_enabled: !!policy.late_fee_enabled,
          late_fee_per_day: Number(policy.late_fee_per_day || 0),
          currency: this.resolveCurrencyCandidate(policy.currency, this.schoolCurrency)
        });
      }
      this.loading = false;
    }).catch(() => {
      this.loading = false;
      this.toast('Error loading rentals');
    });
  }

  createCategory(): void {
    if (this.categoryForm.invalid) return;
    const action$ = this.editingCategoryId
      ? this.rentalService.updateCategory(this.editingCategoryId, this.categoryForm.value)
      : this.rentalService.createCategory(this.categoryForm.value);
    action$.subscribe({
      next: () => {
        this.toast(this.editingCategoryId ? 'Category updated' : 'Category created');
        this.editingCategoryId = null;
        this.categoryForm.reset({ active: true });
        this.reloadCategories();
      },
      error: () => this.toast(this.editingCategoryId ? 'Error updating category' : 'Error creating category')
    });
  }

  createItem(): void {
    if (this.itemForm.invalid) return;
    const action$ = this.editingItemId
      ? this.rentalService.updateItem(this.editingItemId, this.itemForm.value)
      : this.rentalService.createItem(this.itemForm.value);
    action$.subscribe({
      next: () => {
        this.toast(this.editingItemId ? 'Item updated' : 'Item created');
        this.editingItemId = null;
        this.itemForm.reset({ active: true });
        this.reloadItems();
      },
      error: () => this.toast(this.editingItemId ? 'Error updating item' : 'Error creating item')
    });
  }

  createVariant(): void {
    if (this.variantForm.invalid) return;
    const action$ = this.editingVariantId
      ? this.rentalService.updateVariant(this.editingVariantId, this.variantForm.value)
      : this.rentalService.createVariant(this.variantForm.value);
    action$.subscribe({
      next: () => {
        this.toast(this.editingVariantId ? 'Variant updated' : 'Variant created');
        this.editingVariantId = null;
        this.variantForm.reset({ active: true });
        this.reloadVariants();
      },
      error: () => this.toast(this.editingVariantId ? 'Error updating variant' : 'Error creating variant')
    });
  }

  createWarehouse(): void {
    if (this.warehouseForm.invalid) return;
    const action$ = this.editingWarehouseId
      ? this.rentalService.updateWarehouse(this.editingWarehouseId, this.warehouseForm.value)
      : this.rentalService.createWarehouse(this.warehouseForm.value);
    action$.subscribe({
      next: () => {
        this.toast(this.editingWarehouseId ? 'Warehouse updated' : 'Warehouse created');
        this.editingWarehouseId = null;
        this.warehouseForm.reset({ active: true });
        this.reloadWarehouses();
      },
      error: () => this.toast(this.editingWarehouseId ? 'Error updating warehouse' : 'Error creating warehouse')
    });
  }

  createPickupPoint(): void {
    if (this.pickupPointForm.invalid) return;
    const action$ = this.editingPickupPointId
      ? this.rentalService.updatePickupPoint(this.editingPickupPointId, this.pickupPointForm.value)
      : this.rentalService.createPickupPoint(this.pickupPointForm.value);
    action$.subscribe({
      next: () => {
        this.toast(this.editingPickupPointId ? 'Pickup point updated' : 'Pickup point created');
        this.editingPickupPointId = null;
        this.pickupPointForm.reset({ allow_pickup: true, allow_return: true, active: true });
        this.reloadPickupPoints();
      },
      error: () => this.toast(this.editingPickupPointId ? 'Error updating pickup point' : 'Error creating pickup point')
    });
  }

  createUnit(): void {
    if (this.unitForm.invalid) return;
    const action$ = this.editingUnitId
      ? this.rentalService.updateUnit(this.editingUnitId, this.unitForm.value)
      : this.rentalService.createUnit(this.unitForm.value);
    action$.subscribe({
      next: () => {
        this.toast(this.editingUnitId ? 'Unit updated' : 'Unit created');
        this.editingUnitId = null;
        this.unitForm.reset({ status: 'available' });
        this.reloadUnits();
      },
      error: () => this.toast(this.editingUnitId ? 'Error updating unit' : 'Error creating unit')
    });
  }

  createPricingRule(): void {
    if (this.pricingForm.invalid) return;
    const action$ = this.editingPricingRuleId
      ? this.rentalService.updatePricingRule(this.editingPricingRuleId, this.pricingForm.value)
      : this.rentalService.createPricingRule(this.pricingForm.value);
    action$.subscribe({
      next: () => {
        this.toast(this.editingPricingRuleId ? 'Pricing rule updated' : 'Pricing rule created');
        this.editingPricingRuleId = null;
        this.pricingForm.reset({ pricing_type: 'per_day', min_quantity: 1, price: 0, currency: this.schoolCurrency, active: true });
        this.reloadPricingRules();
      },
      error: () => this.toast(this.editingPricingRuleId ? 'Error updating pricing rule' : 'Error creating pricing rule')
    });
  }

  savePolicy(): void {
    this.rentalService.updatePolicy(this.policyForm.value).subscribe({
      next: () => this.toast('Policy updated'),
      error: () => this.toast('Error updating policy')
    });
  }

  createStandaloneReservation(): void {
    if (this.reservationForm.invalid) return;
    const form = this.reservationForm.value;
    const payload = {
      client_id: form.client_id,
      pickup_point_id: form.pickup_point_id,
      return_point_id: form.return_point_id,
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,
      items: [
        {
          variant_id: form.variant_id,
          quantity: form.quantity
        }
      ]
    };
    this.rentalService.createReservation(payload).subscribe({
      next: () => {
        this.toast('Standalone rental reservation created');
        this.reservationForm.reset({ quantity: 1 });
        this.reloadReservations();
      },
      error: () => this.toast('Error creating reservation')
    });
  }

  createBookingReservation(): void {
    if (this.bookingReservationForm.invalid) return;
    const form = this.bookingReservationForm.value;
    const bookingId = Number(form.booking_id);
    const payload = {
      pickup_point_id: form.pickup_point_id,
      return_point_id: form.return_point_id,
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,
      items: [
        {
          variant_id: form.variant_id,
          quantity: form.quantity,
          booking_user_id: form.booking_user_id || null
        }
      ]
    };
    this.rentalService.createBookingRental(bookingId, payload).subscribe({
      next: () => {
        this.toast('Booking rental reservation created');
        this.bookingReservationForm.reset({ quantity: 1 });
        this.reloadReservations();
      },
      error: () => this.toast('Error creating booking rental')
    });
  }

  categoryName(id: number | null | undefined): string {
    if (!id) return '-';
    return this.categories.find((c) => c.id === id)?.name || `#${id}`;
  }

  itemName(id: number | null | undefined): string {
    if (!id) return '-';
    return this.items.find((i) => i.id === id)?.name || `#${id}`;
  }

  variantLabel(id: number | null | undefined): string {
    if (!id) return '-';
    const variant = this.variants.find((v) => v.id === id);
    if (!variant) return `#${id}`;
    return `${variant.name}${variant.size_label ? ' - ' + variant.size_label : ''}`;
  }

  warehouseName(id: number | null | undefined): string {
    if (!id) return '-';
    return this.warehouses.find((w) => w.id === id)?.name || `#${id}`;
  }

  pickupPointName(id: number | null | undefined): string {
    if (!id) return '-';
    return this.pickupPoints.find((p) => p.id === id)?.name || `#${id}`;
  }

  reservationItemsCount(reservation: any): number {
    return Array.isArray(reservation?.items) ? reservation.items.length : 0;
  }

  startEditCategory(row: any): void {
    this.editingCategoryId = row.id;
    this.categoryForm.patchValue({
      name: row.name ?? '',
      code: row.code ?? '',
      description: row.description ?? '',
      active: !!row.active
    });
  }

  startEditItem(row: any): void {
    this.editingItemId = row.id;
    this.itemForm.patchValue({
      category_id: row.category_id ?? null,
      sport_id: row.sport_id ?? null,
      name: row.name ?? '',
      brand: row.brand ?? '',
      model: row.model ?? '',
      description: row.description ?? '',
      active: !!row.active
    });
  }

  startEditVariant(row: any): void {
    this.editingVariantId = row.id;
    this.variantForm.patchValue({
      item_id: row.item_id ?? null,
      name: row.name ?? '',
      size_label: row.size_label ?? '',
      size_group: row.size_group ?? '',
      sku: row.sku ?? '',
      active: !!row.active
    });
  }

  startEditWarehouse(row: any): void {
    this.editingWarehouseId = row.id;
    this.warehouseForm.patchValue({
      name: row.name ?? '',
      code: row.code ?? '',
      address: row.address ?? '',
      active: !!row.active
    });
  }

  startEditPickupPoint(row: any): void {
    this.editingPickupPointId = row.id;
    this.pickupPointForm.patchValue({
      warehouse_id: row.warehouse_id ?? null,
      name: row.name ?? '',
      address: row.address ?? '',
      allow_pickup: !!row.allow_pickup,
      allow_return: !!row.allow_return,
      active: !!row.active
    });
  }

  startEditUnit(row: any): void {
    this.editingUnitId = row.id;
    this.unitForm.patchValue({
      variant_id: row.variant_id ?? null,
      warehouse_id: row.warehouse_id ?? null,
      serial: row.serial ?? '',
      status: row.status ?? 'available',
      condition: row.condition ?? ''
    });
  }

  startEditPricingRule(row: any): void {
    this.editingPricingRuleId = row.id;
    this.pricingForm.patchValue({
      item_id: row.item_id ?? null,
      variant_id: row.variant_id ?? null,
      pricing_type: row.pricing_type ?? 'per_day',
      min_quantity: Number(row.min_quantity ?? 1),
      price: Number(row.price ?? 0),
      currency: this.resolveCurrencyCandidate(row.currency, this.schoolCurrency),
      start_date: row.start_date ?? '',
      end_date: row.end_date ?? '',
      active: !!row.active
    });
  }

  cancelCategoryEdit(): void {
    this.editingCategoryId = null;
    this.categoryForm.reset({ active: true });
  }

  cancelItemEdit(): void {
    this.editingItemId = null;
    this.itemForm.reset({ active: true });
  }

  cancelVariantEdit(): void {
    this.editingVariantId = null;
    this.variantForm.reset({ active: true });
  }

  cancelWarehouseEdit(): void {
    this.editingWarehouseId = null;
    this.warehouseForm.reset({ active: true });
  }

  cancelPickupPointEdit(): void {
    this.editingPickupPointId = null;
    this.pickupPointForm.reset({ allow_pickup: true, allow_return: true, active: true });
  }

  cancelUnitEdit(): void {
    this.editingUnitId = null;
    this.unitForm.reset({ status: 'available' });
  }

  cancelPricingRuleEdit(): void {
    this.editingPricingRuleId = null;
    this.pricingForm.reset({ pricing_type: 'per_day', min_quantity: 1, price: 0, currency: this.schoolCurrency, active: true });
  }

  deleteCategory(row: any): void {
    if (!confirm(`Delete category "${row.name}"?`)) return;
    this.rentalService.deleteCategory(row.id).subscribe({
      next: () => {
        if (this.editingCategoryId === row.id) this.cancelCategoryEdit();
        this.toast('Category deleted');
        this.reloadCategories();
      },
      error: () => this.toast('Error deleting category')
    });
  }

  deleteItem(row: any): void {
    if (!confirm(`Delete item "${row.name}"?`)) return;
    this.rentalService.deleteItem(row.id).subscribe({
      next: () => {
        if (this.editingItemId === row.id) this.cancelItemEdit();
        this.toast('Item deleted');
        this.reloadItems();
      },
      error: () => this.toast('Error deleting item')
    });
  }

  deleteVariant(row: any): void {
    if (!confirm(`Delete variant "${row.name}"?`)) return;
    this.rentalService.deleteVariant(row.id).subscribe({
      next: () => {
        if (this.editingVariantId === row.id) this.cancelVariantEdit();
        this.toast('Variant deleted');
        this.reloadVariants();
      },
      error: () => this.toast('Error deleting variant')
    });
  }

  deleteWarehouse(row: any): void {
    if (!confirm(`Delete warehouse "${row.name}"?`)) return;
    this.rentalService.deleteWarehouse(row.id).subscribe({
      next: () => {
        if (this.editingWarehouseId === row.id) this.cancelWarehouseEdit();
        this.toast('Warehouse deleted');
        this.reloadWarehouses();
      },
      error: () => this.toast('Error deleting warehouse')
    });
  }

  deletePickupPoint(row: any): void {
    if (!confirm(`Delete pickup point "${row.name}"?`)) return;
    this.rentalService.deletePickupPoint(row.id).subscribe({
      next: () => {
        if (this.editingPickupPointId === row.id) this.cancelPickupPointEdit();
        this.toast('Pickup point deleted');
        this.reloadPickupPoints();
      },
      error: () => this.toast('Error deleting pickup point')
    });
  }

  deleteUnit(row: any): void {
    if (!confirm(`Delete unit #${row.id}?`)) return;
    this.rentalService.deleteUnit(row.id).subscribe({
      next: () => {
        if (this.editingUnitId === row.id) this.cancelUnitEdit();
        this.toast('Unit deleted');
        this.reloadUnits();
      },
      error: () => this.toast('Error deleting unit')
    });
  }

  deletePricingRule(row: any): void {
    if (!confirm(`Delete pricing rule #${row.id}?`)) return;
    this.rentalService.deletePricingRule(row.id).subscribe({
      next: () => {
        if (this.editingPricingRuleId === row.id) this.cancelPricingRuleEdit();
        this.toast('Pricing rule deleted');
        this.reloadPricingRules();
      },
      error: () => this.toast('Error deleting pricing rule')
    });
  }

  updateReservationStatus(row: any, status: string): void {
    this.rentalService.updateReservation(row.id, { status }).subscribe({
      next: () => {
        this.toast(`Reservation set to ${status}`);
        this.reloadReservations();
      },
      error: () => this.toast('Error updating reservation')
    });
  }

  setSearch(table: string, value: string): void {
    this.tableState[table].search = value;
    this.tableState[table].page = 1;
  }

  setPageSize(table: string, pageSize: number): void {
    this.tableState[table].pageSize = Number(pageSize || this.defaultPageSize);
    this.tableState[table].page = 1;
    if (this.serverPagedTables.has(table)) {
      this.serverPagination[table].page = 1;
      this.serverPagination[table].perPage = this.tableState[table].pageSize;
      this.reloadServerTable(table);
    }
  }

  setSort(table: string, sortKey: string): void {
    const state = this.tableState[table];
    if (state.sortKey === sortKey) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = sortKey;
      state.sortDir = 'asc';
    }
    state.page = 1;
    if (this.serverPagedTables.has(table)) {
      this.serverPagination[table].page = 1;
      this.reloadServerTable(table);
    }
  }

  isSortedBy(table: string, sortKey: string): boolean {
    return this.tableState[table]?.sortKey === sortKey;
  }

  pagedRows(table: string, rows: any[]): any[] {
    if (this.serverPagedTables.has(table)) {
      return rows || [];
    }
    const filtered = this.filteredRows(table, rows);
    const state = this.tableState[table];
    const start = (state.page - 1) * state.pageSize;
    return filtered.slice(start, start + state.pageSize);
  }

  totalPages(table: string, rows: any[]): number {
    if (this.serverPagedTables.has(table)) {
      return Math.max(1, this.serverPagination[table]?.lastPage || 1);
    }
    const total = this.filteredRows(table, rows).length;
    return Math.max(1, Math.ceil(total / this.tableState[table].pageSize));
  }

  filteredCount(table: string, rows: any[]): number {
    if (this.serverPagedTables.has(table)) {
      return this.serverPagination[table]?.total || 0;
    }
    return this.filteredRows(table, rows).length;
  }

  nextPage(table: string, rows: any[]): void {
    if (this.serverPagedTables.has(table)) {
      const max = this.totalPages(table, rows);
      const current = this.serverPagination[table].page;
      if (current < max) {
        this.serverPagination[table].page = current + 1;
        this.tableState[table].page = this.serverPagination[table].page;
        this.reloadServerTable(table);
      }
      return;
    }
    const max = this.totalPages(table, rows);
    this.tableState[table].page = Math.min(max, this.tableState[table].page + 1);
  }

  prevPage(table: string): void {
    if (this.serverPagedTables.has(table)) {
      const current = this.serverPagination[table].page;
      if (current > 1) {
        this.serverPagination[table].page = current - 1;
        this.tableState[table].page = this.serverPagination[table].page;
        this.reloadServerTable(table);
      }
      return;
    }
    this.tableState[table].page = Math.max(1, this.tableState[table].page - 1);
  }

  private filteredRows(table: string, rows: any[]): any[] {
    const q = (this.tableState[table]?.search || '').trim().toLowerCase();
    const filtered = !q ? (rows || []) : (rows || []).filter((row) => this.rowToText(row).includes(q));
    return this.sortRows(table, filtered);
  }

  private sortRows(table: string, rows: any[]): any[] {
    const state = this.tableState[table];
    if (!state?.sortKey) return rows;
    const dir = state.sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = this.readSortValue(a, state.sortKey);
      const bv = this.readSortValue(b, state.sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  private readSortValue(row: any, key: string): any {
    if (!row) return null;
    return key.split('.').reduce((acc, part) => acc?.[part], row);
  }

  private rowToText(row: any): string {
    const values = this.flattenRowValues(row);
    return values.join(' ').toLowerCase();
  }

  private flattenRowValues(row: any): string[] {
    if (row == null) return [];
    if (typeof row === 'string' || typeof row === 'number' || typeof row === 'boolean') return [String(row)];
    if (Array.isArray(row)) return row.flatMap((v) => this.flattenRowValues(v));
    if (typeof row === 'object') return Object.values(row).flatMap((v) => this.flattenRowValues(v));
    return [];
  }

  private reloadCategories(): void {
    this.rentalService.listCategories(this.getCategoriesQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.categories = paged.data;
      this.serverPagination.categories = { page: paged.page, lastPage: paged.lastPage, total: paged.total, perPage: paged.perPage };
      this.tableState.categories.page = paged.page;
      this.tableState.categories.pageSize = paged.perPage;
    });
  }

  private reloadItems(): void {
    this.rentalService.listItems(this.getItemsQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.items = paged.data;
      this.serverPagination.items = { page: paged.page, lastPage: paged.lastPage, total: paged.total, perPage: paged.perPage };
      this.tableState.items.page = paged.page;
      this.tableState.items.pageSize = paged.perPage;
    });
  }

  private reloadVariants(): void {
    this.rentalService.listVariants(this.getVariantsQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.variants = paged.data;
      this.serverPagination.variants = { page: paged.page, lastPage: paged.lastPage, total: paged.total, perPage: paged.perPage };
      this.tableState.variants.page = paged.page;
      this.tableState.variants.pageSize = paged.perPage;
    });
  }

  private reloadWarehouses(): void {
    this.rentalService.listWarehouses(this.getWarehousesQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.warehouses = paged.data;
      this.serverPagination.warehouses = { page: paged.page, lastPage: paged.lastPage, total: paged.total, perPage: paged.perPage };
      this.tableState.warehouses.page = paged.page;
      this.tableState.warehouses.pageSize = paged.perPage;
    });
  }

  private reloadPickupPoints(): void {
    this.rentalService.listPickupPoints(this.getPickupPointsQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.pickupPoints = paged.data;
      this.serverPagination.pickupPoints = { page: paged.page, lastPage: paged.lastPage, total: paged.total, perPage: paged.perPage };
      this.tableState.pickupPoints.page = paged.page;
      this.tableState.pickupPoints.pageSize = paged.perPage;
    });
  }

  private reloadUnits(): void {
    this.rentalService.listUnits(this.getUnitsQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.units = paged.data;
      this.serverPagination.units = {
        page: paged.page,
        lastPage: paged.lastPage,
        total: paged.total,
        perPage: paged.perPage
      };
      this.tableState.units.page = paged.page;
      this.tableState.units.pageSize = paged.perPage;
    });
  }

  private reloadPricingRules(): void {
    this.rentalService.listPricingRules(this.getPricingRulesQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.pricingRules = paged.data;
      this.serverPagination.pricingRules = { page: paged.page, lastPage: paged.lastPage, total: paged.total, perPage: paged.perPage };
      this.tableState.pricingRules.page = paged.page;
      this.tableState.pricingRules.pageSize = paged.perPage;
    });
  }

  private reloadReservations(): void {
    this.rentalService.listReservations(this.getReservationsQueryFilters()).subscribe((res: any) => {
      const paged = this.parsePaged(res);
      this.reservations = paged.data;
      this.serverPagination.reservations = {
        page: paged.page,
        lastPage: paged.lastPage,
        total: paged.total,
        perPage: paged.perPage
      };
      this.tableState.reservations.page = paged.page;
      this.tableState.reservations.pageSize = paged.perPage;
    });
  }

  applyUnitFilters(): void {
    this.tableState.units.page = 1;
    this.reloadUnits();
  }

  clearUnitFilters(): void {
    this.unitFilters = { warehouse_id: null, status: '', search: '' };
    this.tableState.units.page = 1;
    this.reloadUnits();
  }

  applyReservationFilters(): void {
    this.tableState.reservations.page = 1;
    this.reloadReservations();
  }

  clearReservationFilters(): void {
    this.reservationFilters = { status: '', start_date_from: '', start_date_to: '', search: '' };
    this.tableState.reservations.page = 1;
    this.reloadReservations();
  }

  private parse(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  }

  private wrap(obs: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      obs.subscribe({
        next: (res: any) => resolve(this.parse(res)),
        error: reject
      });
    });
  }

  private wrapPaged(obs: any, table: 'categories' | 'items' | 'variants' | 'warehouses' | 'pickupPoints' | 'units' | 'pricingRules' | 'reservations'): Promise<any[]> {
    return new Promise((resolve, reject) => {
      obs.subscribe({
        next: (res: any) => {
          const paged = this.parsePaged(res);
          this.serverPagination[table] = {
            page: paged.page,
            lastPage: paged.lastPage,
            total: paged.total,
            perPage: paged.perPage
          };
          this.tableState[table].page = paged.page;
          this.tableState[table].pageSize = paged.perPage;
          resolve(paged.data);
        },
        error: reject
      });
    });
  }

  private wrapObject(obs: any): Promise<any> {
    return new Promise((resolve, reject) => {
      obs.subscribe({
        next: (res: any) => resolve(res?.data?.data ?? res?.data ?? null),
        error: reject
      });
    });
  }

  private toast(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 2000 });
  }

  private parsePaged(res: any): { data: any[]; page: number; lastPage: number; total: number; perPage: number } {
    const data = this.parse(res);
    const page = Number(res?.current_page || 1);
    const lastPage = Number(res?.last_page || 1);
    const total = Number(res?.total || data.length || 0);
    const perPage = Number(res?.per_page || this.defaultPageSize);
    return { data, page, lastPage, total, perPage };
  }

  private reloadServerTable(table: string): void {
    if (table === 'categories') {
      this.reloadCategories();
      return;
    }
    if (table === 'items') {
      this.reloadItems();
      return;
    }
    if (table === 'variants') {
      this.reloadVariants();
      return;
    }
    if (table === 'warehouses') {
      this.reloadWarehouses();
      return;
    }
    if (table === 'pickupPoints') {
      this.reloadPickupPoints();
      return;
    }
    if (table === 'units') {
      this.reloadUnits();
      return;
    }
    if (table === 'pricingRules') {
      this.reloadPricingRules();
      return;
    }
    if (table === 'reservations') {
      this.reloadReservations();
    }
  }

  private getCategoriesQueryFilters(): Record<string, any> {
    return {
      search: this.tableState.categories.search || undefined,
      sort_by: this.tableState.categories.sortKey,
      sort_dir: this.tableState.categories.sortDir,
      page: this.serverPagination.categories.page,
      per_page: this.tableState.categories.pageSize
    };
  }

  private getItemsQueryFilters(): Record<string, any> {
    return {
      search: this.tableState.items.search || undefined,
      sort_by: this.tableState.items.sortKey,
      sort_dir: this.tableState.items.sortDir,
      page: this.serverPagination.items.page,
      per_page: this.tableState.items.pageSize
    };
  }

  private getVariantsQueryFilters(): Record<string, any> {
    return {
      search: this.tableState.variants.search || undefined,
      sort_by: this.tableState.variants.sortKey,
      sort_dir: this.tableState.variants.sortDir,
      page: this.serverPagination.variants.page,
      per_page: this.tableState.variants.pageSize
    };
  }

  private getWarehousesQueryFilters(): Record<string, any> {
    return {
      search: this.tableState.warehouses.search || undefined,
      sort_by: this.tableState.warehouses.sortKey,
      sort_dir: this.tableState.warehouses.sortDir,
      page: this.serverPagination.warehouses.page,
      per_page: this.tableState.warehouses.pageSize
    };
  }

  private getPickupPointsQueryFilters(): Record<string, any> {
    return {
      search: this.tableState.pickupPoints.search || undefined,
      sort_by: this.tableState.pickupPoints.sortKey,
      sort_dir: this.tableState.pickupPoints.sortDir,
      page: this.serverPagination.pickupPoints.page,
      per_page: this.tableState.pickupPoints.pageSize
    };
  }

  private getPricingRulesQueryFilters(): Record<string, any> {
    return {
      search: this.tableState.pricingRules.search || undefined,
      sort_by: this.tableState.pricingRules.sortKey,
      sort_dir: this.tableState.pricingRules.sortDir,
      page: this.serverPagination.pricingRules.page,
      per_page: this.tableState.pricingRules.pageSize
    };
  }

  private getUnitsQueryFilters(): Record<string, any> {
    return {
      warehouse_id: this.unitFilters.warehouse_id || undefined,
      status: this.unitFilters.status || undefined,
      search: this.unitFilters.search || undefined,
      sort_by: this.tableState.units.sortKey,
      sort_dir: this.tableState.units.sortDir,
      page: this.serverPagination.units.page,
      per_page: this.tableState.units.pageSize
    };
  }

  private getReservationsQueryFilters(): Record<string, any> {
    return {
      status: this.reservationFilters.status || undefined,
      start_date_from: this.reservationFilters.start_date_from || undefined,
      start_date_to: this.reservationFilters.start_date_to || undefined,
      search: this.reservationFilters.search || undefined,
      sort_by: this.tableState.reservations.sortKey,
      sort_dir: this.tableState.reservations.sortDir,
      page: this.serverPagination.reservations.page,
      per_page: this.tableState.reservations.pageSize
    };
  }

  get schoolCurrency(): string {
    const raw = localStorage.getItem('boukiiUser');
    if (!raw) return '';
    try {
      const user = JSON.parse(raw);
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

  private resolveCurrencyCandidate(...candidates: any[]): string {
    const detected = candidates
      .map((candidate) => String(candidate || '').trim().toUpperCase())
      .find((candidate) => candidate.length > 0);
    return detected || '';
  }
}
