import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RentalsItemDialogComponent } from './rentals-item-dialog.component';
import { firstValueFrom } from 'rxjs';
import { RentalService } from 'src/service/rental.service';

type RentalsView = 'inventory' | 'booking' | 'list' | 'add-equipment' | 'advanced';
type PeriodType = 'season' | 'half_day' | 'full_day' | 'multi_day' | 'week';
type ScanTarget = 'barcode' | 'sku';

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
  items: any[] = [];
  variants: any[] = [];
  units: any[] = [];
  warehouses: any[] = [];
  pickupPoints: any[] = [];
  pricingRules: any[] = [];
  reservations: any[] = [];
  clients: any[] = [];

  categoryFilter: number | 'all' = 'all';
  subcategoryFilter: string | 'all' = 'all';
  sizeFilter: string | 'all' = 'all';

  inventorySearch = '';
  bookingSearch = '';
  listSearch = '';
  listStatus = 'all';
  reservationPage = 1;
  readonly reservationPageSize = 10;

  selectedItems: Record<number, number> = {};
  selectedInventoryRow: any | null = null;
  selectedReservation: any | null = null;

  scanning = false;
  scanTarget: ScanTarget = 'barcode';
  scannerError = '';
  private scannerStream: MediaStream | null = null;
  private scannerIntervalId: any = null;

  bookingForm = this.fb.group({
    client_id: [null, Validators.required],
    pickup_point_id: [null],
    return_point_id: [null],
    period_type: ['full_day' as PeriodType, Validators.required],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    start_time: ['09:00'],
    end_time: ['17:00']
  });

  readonly periodButtons: Array<{ value: PeriodType; label: string }> = [
    { value: 'season', label: 'rentals.period_season' },
    { value: 'half_day', label: 'rentals.period_half_day' },
    { value: 'full_day', label: 'rentals.period_full_day' },
    { value: 'multi_day', label: 'rentals.period_multi_day' },
    { value: 'week', label: 'rentals.period_week' }
  ];

  addEquipmentForm = this.fb.group({
    category_id: [null, Validators.required],
    subcategory_id: [null],
    subcategory_name: [''],
    item_name: ['', Validators.required],
    brand: [''],
    model: [''],
    variant_name: ['', Validators.required],
    size_label: [''],
    sku: [''],
    barcode: [''],
    serial_prefix: [''],
    condition: ['excellent'],
    warehouse_id: [null],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly rentalService: RentalService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.bookingForm.get('period_type')?.valueChanges.subscribe((value) => {
      this.applyPeriodPreset((value as PeriodType) || 'full_day');
    });
    this.bookingForm.get('start_date')?.valueChanges.subscribe(() => {
      const period = (this.bookingForm.get('period_type')?.value as PeriodType) || 'full_day';
      this.applyPeriodPreset(period);
    });
  }

  ngOnDestroy(): void {
    this.stopScanner();
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
    return this.reservations.filter((r) => (r?.status || '').toLowerCase() === 'pending').length;
  }

  get activeCount(): number {
    return this.reservations.filter((r) => (r?.status || '').toLowerCase() === 'active').length;
  }

  get overdueCount(): number {
    return this.reservations.filter((r) => (r?.status || '').toLowerCase() === 'overdue').length;
  }

  get completedCount(): number {
    return this.reservations.filter((r) => (r?.status || '').toLowerCase() === 'completed').length;
  }

  get selectedTotalItems(): number {
    return Object.values(this.selectedItems).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  get selectedRows(): any[] {
    return Object.entries(this.selectedItems)
      .map(([variantId, qty]) => ({
        row: this.inventoryRows.find((r) => Number(r.id) === Number(variantId)),
        qty: Number(qty)
      }))
      .filter((entry) => !!entry.row && entry.qty > 0)
      .map((entry) => ({
        ...entry.row,
        selectedQty: entry.qty
      }));
  }

  get inventoryRows(): any[] {
    const query = (this.inventorySearch || '').toLowerCase().trim();
    const selectedCategory = this.categoryFilter;
    const selectedSubcategory = this.subcategoryFilter;
    const selectedSize = this.sizeFilter;

    return this.variants
      .map((variant) => {
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
      })
      .filter((row) => {
        if (selectedCategory !== 'all' && row.item?.category_id !== selectedCategory) return false;
        if (selectedSubcategory !== 'all' && row.subcategoryName.toLowerCase() !== selectedSubcategory.toLowerCase()) return false;
        if (selectedSize !== 'all' && (row.size_label || '').toLowerCase() !== selectedSize.toLowerCase()) return false;
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
    return this.inventoryRows
      .filter((row) => row.available > 0)
      .filter((row) => {
        if (!query) return true;
        const haystack = [row.name, row.item?.name, row.item?.brand, row.item?.model, row.subcategoryName]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
  }

  get filteredReservations(): any[] {
    const query = (this.listSearch || '').toLowerCase().trim();
    const rows = this.reservations.filter((reservation) => {
      if (this.listStatus !== 'all' && (reservation?.status || '').toLowerCase() !== this.listStatus) return false;
      if (!query) return true;
      const haystack = [
        reservation?.reference,
        reservation?.status,
        reservation?.client?.first_name,
        reservation?.client?.last_name,
        reservation?.client?.email
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
      .map((subcategory) => (subcategory.name || '').trim())
      .filter((name) => !!name);
    return Array.from(new Set([...fromRows, ...fromCatalog])).sort((a, b) => a.localeCompare(b));
  }

  get availableSizes(): string[] {
    const values = this.inventoryRows.map((row) => (row.size_label || '').trim()).filter((size) => !!size);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }

  get filteredSubcategoriesForForm(): any[] {
    const categoryId = Number(this.addEquipmentForm.get('category_id')?.value || 0);
    if (!categoryId) return [];
    return this.subcategories.filter((subcategory) => Number(subcategory.category_id) === categoryId);
  }

  setView(view: RentalsView): void {
    this.view = view;
    if (view === 'list') this.loadReservations();
    if (view !== 'add-equipment') this.stopScanner();
    if (view === 'list') {
      this.reservationPage = 1;
      this.selectedReservation = null;
    }
  }

  setCategoryFilter(value: number | 'all'): void {
    this.categoryFilter = value;
    this.subcategoryFilter = 'all';
    this.sizeFilter = 'all';
  }

  setSubcategoryFilter(value: string | 'all'): void {
    this.subcategoryFilter = value;
    this.sizeFilter = 'all';
  }

  selectInventoryRow(row: any): void {
    this.selectedInventoryRow = row;
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
    const dialogRef = this.dialog.open(RentalsItemDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        mode: 'edit',
        row,
        categories: this.categories,
        subcategories: this.subcategories,
        warehouses: this.warehouses,
        pricingRules: this.pricingRules
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.persistDialog('edit', result, row).catch(() => this.toast('rentals.status_error'));
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
      brand: payload.brand,
      model: payload.model,
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
      active: true
    }));

    await this.upsertPricing(Number(row.id), Number(payload.half_day_price || 0), Number(payload.full_day_price || 0), Number(payload.week_price || 0));

    this.toast('rentals.status_updated');
    this.loadAll();
  }

  private async addEquipmentFromDialog(payload: any): Promise<void> {
    const categoryId = Number(payload.category_id);

    const createdItem: any = await this.getData(this.rentalService.createItem({
      category_id: categoryId,
      name: payload.item_name,
      brand: payload.brand,
      model: payload.model,
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
    this.loadAll();
  }

  private async upsertPricing(variantId: number, halfDay: number, fullDay: number, week: number): Promise<void> {
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
          currency: existing.currency || 'CHF',
          active: true
        }));
      } else {
        await this.getData(this.rentalService.createPricingRule({
          variant_id: variantId,
          period_type: line.period,
          price: line.price,
          currency: 'CHF',
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
    if (!variantId) {
      return;
    }
    this.rentalService.deleteVariant(variantId).subscribe({
      next: () => {
        this.toast('rentals.status_updated');
        if (this.selectedInventoryRow?.id === variantId) {
          this.selectedInventoryRow = null;
        }
        this.loadAll();
      },
      error: () => this.toast('rentals.status_error')
    });
  }

  setItemQuantity(variantId: number, quantity: number): void {
    const row = this.inventoryRows.find((r) => Number(r.id) === Number(variantId));
    const available = Number(row?.available || 0);
    const clampedQuantity = Math.min(Math.max(Number(quantity || 0), 0), Math.max(available, 0));
    if (!clampedQuantity || clampedQuantity <= 0) {
      delete this.selectedItems[variantId];
      return;
    }
    this.selectedItems[variantId] = clampedQuantity;
  }

  selectedQuantity(variantId: number): number {
    return Number(this.selectedItems[variantId] || 0);
  }

  clearSelectedItems(): void {
    this.selectedItems = {};
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
        brand: form.brand,
        model: form.model,
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
        quantity: 1
      });
      this.loadAll();
      this.setView('inventory');
    } catch (error) {
      this.toast('rentals.create_error');
    }
  }

  createReservation(): void {
    if (this.bookingForm.invalid || this.selectedTotalItems <= 0) {
      this.toast('rentals.validation_error');
      return;
    }

    const formValue = this.bookingForm.value;
    const payload = {
      client_id: formValue.client_id,
      pickup_point_id: formValue.pickup_point_id,
      return_point_id: formValue.return_point_id,
      start_date: formValue.start_date,
      end_date: formValue.end_date,
      start_time: formValue.start_time,
      end_time: formValue.end_time,
      items: Object.entries(this.selectedItems).map(([variantId, qty]) => ({
        variant_id: Number(variantId),
        quantity: Number(qty)
      }))
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
        this.loadAll();
        this.setView('list');
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

  autoAssignReservation(reservation: any): void {
    this.rentalService.autoAssign(reservation.id).subscribe({
      next: () => {
        this.toast('rentals.status_updated');
        this.loadReservations();
      },
      error: () => this.toast('rentals.status_error')
    });
  }

  nextReservationPage(): void {
    this.reservationPage = Math.min(this.totalReservationPages, this.reservationPage + 1);
  }

  prevReservationPage(): void {
    this.reservationPage = Math.max(1, this.reservationPage - 1);
  }

  selectReservation(reservation: any): void {
    this.selectedReservation = reservation;
  }

  reservationLines(reservation: any): any[] {
    if (!reservation) return [];
    if (Array.isArray(reservation?.lines)) return reservation.lines;
    if (Array.isArray(reservation?.items)) return reservation.items;
    if (Array.isArray(reservation?.rental_items)) return reservation.rental_items;
    return [];
  }

  reservationTotalItems(reservation: any): number {
    return this.reservationLines(reservation).reduce((sum, line) => {
      return sum + Number(line?.quantity || line?.qty || 0);
    }, 0);
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

  categoryName(categoryId: number | null): string {
    if (!categoryId) return '-';
    return this.categories.find((category) => category.id === categoryId)?.name || `#${categoryId}`;
  }

  categoryCount(categoryId: number): number {
    return this.inventoryRows.filter((row) => row.item?.category_id === categoryId).length;
  }

  categoryIcon(name: string): string {
    const key = (name || '').toLowerCase();
    if (key.includes('ski')) return 'downhill_skiing';
    if (key.includes('snow')) return 'snowboarding';
    if (key.includes('boot') || key.includes('access')) return 'hiking';
    if (key.includes('cloth') || key.includes('jack')) return 'checkroom';
    return 'inventory_2';
  }

  rowPriceLabel(row: any): string {
    const rule =
      this.pricingRules.find((pricingRule) => pricingRule.variant_id === row.id) ||
      this.pricingRules.find((pricingRule) => pricingRule.item_id === row.item_id);
    if (!rule) return '-';
    return `${rule.price} ${rule.currency || 'CHF'}`;
  }

  rowUnitPrice(row: any): number {
    const rule =
      this.pricingRules.find((pricingRule) => Number(pricingRule.variant_id) === Number(row.id)) ||
      this.pricingRules.find((pricingRule) => Number(pricingRule.item_id) === Number(row.item_id));
    return Number(rule?.price || 0);
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
    return this.selectedRows.reduce((sum, row) => {
      const unitPrice = this.rowUnitPrice(row);
      return sum + unitPrice * Number(row.selectedQty || 0) * this.bookingDurationDays;
    }, 0);
  }

  get bookingEstimateCurrency(): string {
    const firstRule = this.pricingRules.find((rule) => !!rule?.currency);
    return firstRule?.currency || 'CHF';
  }

  rowCondition(row: any): string {
    const relevantUnits = this.units.filter((unit) => unit.variant_id === row.id);
    if (!relevantUnits.length) return '-';
    return relevantUnits[0]?.condition || '-';
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
      this.wrapPaged(this.rentalService.listCategories({ per_page: 300 })),
      this.wrapPaged(this.rentalService.listSubcategories({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listItems({ per_page: 1000 })),
      this.wrapPaged(this.rentalService.listVariants({ per_page: 2000 })),
      this.wrapPaged(this.rentalService.listUnits({ per_page: 3000 })),
      this.wrapPaged(this.rentalService.listWarehouses({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listPickupPoints({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listPricingRules({ per_page: 1000 })),
      this.wrapPaged(this.rentalService.listReservations({ per_page: 400 })),
      this.wrapPaged(this.rentalService.listClients({ per_page: 300 }))
    ])
      .then(([categories, subcategories, items, variants, units, warehouses, pickupPoints, pricingRules, reservations, clients]) => {
        this.categories = categories;
        this.subcategories = subcategories;
        this.items = items;
        this.variants = variants;
        this.units = units;
        this.warehouses = warehouses;
        this.pickupPoints = pickupPoints;
        this.pricingRules = pricingRules;
        this.reservations = reservations;
        this.clients = clients;
        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
        this.toast('rentals.load_error');
      });
  }

  private loadReservations(): void {
    this.loadingReservations = true;
    this.wrapPaged(this.rentalService.listReservations({ per_page: 400 }))
      .then((reservations) => {
        this.reservations = reservations;
        if (!this.selectedReservation && this.filteredReservations.length) {
          this.selectedReservation = this.filteredReservations[0];
        }
        this.loadingReservations = false;
      })
      .catch(() => {
        this.loadingReservations = false;
        this.toast('rentals.load_error');
      });
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
    this.snackBar.open(message, 'OK', { duration: 2800 });
  }
}



