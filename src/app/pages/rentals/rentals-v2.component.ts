import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { RentalsItemDialogComponent } from './rentals-item-dialog.component';
import { RentalsReservationEditDialogComponent } from './rentals-reservation-edit-dialog.component';
import { RentalsReservationReturnDialogComponent } from './rentals-reservation-return-dialog.component';
import { RentalsDamageDialogComponent } from './rentals-damage-dialog.component';
import { RentalsPaymentDialogComponent } from './rentals-payment-dialog.component';
import { ConfirmDialogComponent } from 'src/@vex/components/confirm-dialog/confirm-dialog.component';
import { firstValueFrom } from 'rxjs';
import { RentalService } from 'src/service/rental.service';

import { RentalUiStatusKey } from 'src/app/shared/rental-status.util';

type RentalsView = 'inventory' | 'booking' | 'list' | 'add-equipment' | 'advanced';
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

  inventorySearch = '';
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
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private applyRouteQueryState(params: any): void {
    const bookingId = params['booking_id'];
    const clientId = params['client_id'];
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
        if (selectedSubcategory !== 'all' && row.subcategoryName.toLowerCase() !== selectedSubcategory.toLowerCase()) return false;
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
      .map((subcategory) => (subcategory.name || '').trim())
      .filter((name) => !!name);
    return Array.from(new Set([...fromRows, ...fromCatalog])).sort((a, b) => a.localeCompare(b));
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
    if (url.includes('/rentals/advanced')) {
      this.view = 'advanced';
      return;
    }
    this.view = 'inventory';
  }

  private navigateForView(view: RentalsView): void {
    const current = this.router.url || '';
    if (view === 'booking') {
      if (!current.includes('/rentals/booking')) {
        this.router.navigate(['/rentals/booking']);
      }
      return;
    }
    if (view === 'list') {
      if (!current.includes('/rentals/list')) {
        this.router.navigate(['/rentals/list']);
      }
      return;
    }
    if (view === 'advanced') {
      if (!current.includes('/rentals/advanced')) {
        this.router.navigate(['/rentals/advanced']);
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

  setSubcategoryFilter(value: string | 'all'): void {
    this.subcategoryFilter = value;
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
    const itemId = Number(row?.item?.id || row?.item_id || 0);
    const variantId = Number(row?.id || 0);
    if (!itemId || !variantId) return;
    this.router.navigate(['/rentals/item', itemId], {
      queryParams: { variant: variantId, edit: 1 }
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
    this.loadAll();
  }

  private async addEquipmentFromDialog(payload: any): Promise<void> {
    const categoryId = Number(payload.category_id);

    const createdItem: any = await this.getData(this.rentalService.createItem({
      category_id: categoryId,
      name: payload.item_name,
      brand: payload.brand,
      model: payload.model,
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
    if (!variantId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.translateService.instant('rentals.delete_confirm_title'),
        message: this.translateService.instant('rentals.delete_confirm_message'),
        confirmText: this.translateService.instant('rentals.delete_confirm_button'),
        cancelText: this.translateService.instant('rentals.cancel'),
        isError: true
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
          this.loadAll();
        },
        error: () => this.toast('rentals.status_error')
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
        this.loadAll();
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

    const reasonKey = 'rentals.cancel_reason_prompt';
    const reason = window.prompt(this.translateService.instant(reasonKey) || 'Cancellation reason (optional):') ?? '';
    if (reason === null) {
      // user pressed Cancel on the prompt
      return;
    }

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

  selectReservation(reservation: any): void {
    this.selectedReservation = reservation;
    this.openReservationDetails(reservation);
  }

  openReservationDetails(reservation: any): void {
    const reservationId = Number(reservation?.id || 0);
    if (!reservationId) return;

    this.selectedReservation = reservation;
    this.reservationEvents = [];
    this.rentalService.getReservation(reservationId).subscribe({
      next: (response: any) => {
        const payload = response?.data?.data ?? response?.data ?? response ?? null;
        if (payload?.id) {
          this.selectedReservation = {
            ...reservation,
            ...payload
          };
        }
      },
      error: () => {}
    });

    this.loadReservationEvents(reservationId);
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

    const dialogRef = this.dialog.open(RentalsReservationEditDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: {
        reservation,
        pickupPoints: this.pickupPoints
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.rentalService.updateReservation(reservationId, result).subscribe({
        next: () => {
          this.toast('rentals.status_updated');
          this.loadReservations();
        },
        error: () => this.toast('rentals.status_error')
      });
    });
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
    const variantId = Number(line?.variant_id || 0);
    const variant = variantId ? this.variants.find((candidate) => Number(candidate?.id || 0) === variantId) : null;
    const itemId = Number(line?.item_id || 0);
    const item = itemId ? this.items.find((candidate) => Number(candidate?.id || 0) === itemId) : null;
    const variantName = String(variant?.name || '').trim();
    const itemName = String(item?.name || '').trim();
    return variantName || itemName || `#${line?.id || '-'}`;
  }

  reservationLineSize(line: any): string {
    const variantId = Number(line?.variant_id || 0);
    const variant = variantId ? this.variants.find((candidate) => Number(candidate?.id || 0) === variantId) : null;
    return String(variant?.size_label || '').trim() || '-';
  }

  reservationLineSubtitle(line: any): string {
    const qty = Number(line?.quantity || line?.qty || 0);
    const status = String(line?.status || '').trim();
    const suffix = status ? ` - ${status}` : '';
    return `${qty} u.${suffix}`;
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

  categoryName(categoryId: number | null): string {
    if (!categoryId) return '-';
    return this.categories.find((category) => category.id === categoryId)?.name || `#${categoryId}`;
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
    return `${rule.price} ${rule.currency || 'CHF'}`;
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
    return firstRule?.currency || 'CHF';
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
      this.wrapPaged(this.rentalService.listCategories({ per_page: 300 })),
      this.wrapPaged(this.rentalService.listSubcategories({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listItems({ per_page: 1000 })),
      this.wrapPaged(this.rentalService.listVariants({ per_page: 2000 })),
      this.wrapPaged(this.rentalService.listUnits({ per_page: 3000 })),
      this.wrapPaged(this.rentalService.listWarehouses({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listPickupPoints({ per_page: 500 })),
      this.wrapPaged(this.rentalService.listPricingRules({ per_page: 1000 })),
      this.wrapPaged(this.rentalService.listClients({ per_page: 300 }))
    ])
      .then(([categories, subcategories, items, variants, units, warehouses, pickupPoints, pricingRules, clients]) => {
        this.categories = categories;
        this.subcategories = subcategories;
        this.items = items;
        this.variants = variants;
        this.units = units;
        this.warehouses = warehouses;
        this.pickupPoints = pickupPoints;
        this.pricingRules = pricingRules;
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
    return {
      currency: String(quote?.currency || 'CHF'),
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
}
