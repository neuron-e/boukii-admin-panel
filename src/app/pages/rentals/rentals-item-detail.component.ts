import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { RentalService } from 'src/service/rental.service';
import { RentalsItemDialogComponent } from './rentals-item-dialog.component';
import { ConfirmDialogComponent } from 'src/@vex/components/confirm-dialog/confirm-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import * as QRCode from 'qrcode';

@Component({
  selector: 'vex-rentals-item-detail',
  templateUrl: './rentals-item-detail.component.html',
  styleUrls: ['./rentals-item-detail.component.scss']
})
export class RentalsItemDetailComponent implements OnInit {
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;
  loading = false;
  imageUploading = false;
  itemId = 0;
  legacyVariantId = 0;

  data: any = null;
  item: any = null;
  variant: any = null;
  variants: any[] = [];
  units: any[] = [];
  pricingRules: any[] = [];
  history: any[] = [];
  services: any[] = [];
  analytics: any = null;
  itemImages: any[] = [];
  selectedImageUrl = '';
  categories: any[] = [];
  subcategories: any[] = [];
  warehouses: any[] = [];
  private pendingAutoEdit = false;

  createVariantExpanded = false;
  createVariantSaving = false;
  editingVariantId: number | null = null;
  serviceEditorExpanded = false;
  serviceSaving = false;
  createVariantForm: any = {
    name: '',
    size_label: '',
    sku: '',
    barcode: '',
    quantity: 1,
    condition: 'good',
    warehouse_id: null,
    half_day_price: 0,
    full_day_price: 0,
    week_price: 0,
    purchase_price: 0,
    sale_price: 0
  };

  activeTab: 'variants' | 'services' | 'history' | 'analytics' = 'variants';
  serviceForm: any = {
    id: null,
    name: '',
    description: '',
    price: 0,
    duration_minutes: 0,
    is_required: false,
    active: true
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rentalService: RentalService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.ensureLookupsLoaded();

    this.itemId = Number(this.route.snapshot.paramMap.get('itemId') || 0);
    this.legacyVariantId = Number(this.route.snapshot.paramMap.get('variantId') || 0);
    const queryVariant = Number(this.route.snapshot.queryParamMap.get('variant') || 0);
    this.pendingAutoEdit = Number(this.route.snapshot.queryParamMap.get('edit') || 0) === 1;

    if (this.itemId > 0) {
      this.loadByItem(this.itemId, queryVariant > 0 ? queryVariant : null);
      return;
    }

    if (this.legacyVariantId > 0) {
      this.loadFromLegacyVariant(this.legacyVariantId);
      return;
    }

    this.snackBar.open('Invalid rental product', 'OK', { duration: 2500 });
    this.back();
  }

  back(): void {
    this.router.navigate(['/rentals']);
  }

  switchTab(tab: 'variants' | 'services' | 'history' | 'analytics'): void {
    this.activeTab = tab;
  }

  startCreateService(): void {
    this.serviceForm = {
      id: null,
      name: '',
      description: '',
      price: 0,
      duration_minutes: 0,
      is_required: false,
      active: true
    };
  }

  toggleServiceEditor(expanded?: boolean): void {
    const nextState = typeof expanded === 'boolean' ? expanded : !this.serviceEditorExpanded;
    this.serviceEditorExpanded = nextState;
    if (!nextState) {
      this.startCreateService();
    }
  }

  editService(service: any): void {
    this.serviceForm = {
      id: service?.id || null,
      name: service?.name || '',
      description: service?.description || '',
      price: Number(service?.price || 0),
      duration_minutes: Number(service?.duration_minutes || 0),
      is_required: !!service?.is_required,
      active: !!service?.active
    };
    this.serviceEditorExpanded = true;
  }

  saveService(): void {
    if (this.serviceSaving) return;
    if (!this.variant?.id || !this.serviceForm?.name?.trim()) {
      this.snackBar.open('Service name is required', 'OK', { duration: 2200 });
      return;
    }
    this.serviceSaving = true;

    const payload = {
      variant_id: Number(this.variant.id),
      name: this.serviceForm.name.trim(),
      description: (this.serviceForm.description || '').trim(),
      price: Number(this.serviceForm.price || 0),
      currency: this.schoolCurrency,
      duration_minutes: Number(this.serviceForm.duration_minutes || 0),
      is_required: !!this.serviceForm.is_required,
      active: !!this.serviceForm.active
    };

    const req = this.serviceForm.id
      ? this.rentalService.updateVariantService(Number(this.serviceForm.id), payload)
      : this.rentalService.createVariantService(payload);

    req.subscribe({
      next: () => {
        this.snackBar.open('Service saved', 'OK', { duration: 1800 });
        this.serviceSaving = false;
        this.serviceEditorExpanded = false;
        this.startCreateService();
        this.loadByItem(this.itemId, Number(this.variant?.id || 0));
      },
      error: () => {
        this.serviceSaving = false;
        this.snackBar.open('Error saving service', 'OK', { duration: 2200 });
      }
    });
  }

  removeService(service: any): void {
    if (!service?.id) return;
    this.rentalService.deleteVariantService(Number(service.id)).subscribe({
      next: () => {
        this.snackBar.open('Service deleted', 'OK', { duration: 1800 });
        if (Number(this.serviceForm?.id || 0) === Number(service.id)) {
          this.startCreateService();
        }
        this.loadByItem(this.itemId, Number(this.variant?.id || 0));
      },
      error: () => this.snackBar.open('Error deleting service', 'OK', { duration: 2200 })
    });
  }

  toggleCreateVariant(): void {
    const nextState = !this.createVariantExpanded;
    this.createVariantExpanded = nextState;
    if (!nextState) {
      this.resetCreateVariantForm();
    }
  }

  createVariant(): void {
    if (this.createVariantSaving) return;
    const name = String(this.createVariantForm?.name || '').trim();
    const quantity = Number(this.createVariantForm?.quantity || 0);
    if (!this.itemId || !name || quantity <= 0) {
      this.snackBar.open('Variant name and quantity are required', 'OK', { duration: 2200 });
      return;
    }
    this.createVariantSaving = true;

    if (this.editingVariantId && this.editingVariantId > 0) {
      this.updateVariantFromForm(this.editingVariantId, quantity);
      return;
    }

    const variantPayload: any = {
      item_id: this.itemId,
      subcategory_id: this.variant?.subcategory_id || null,
      name,
      size_group: this.createVariantForm?.size_label || null,
      size_label: this.createVariantForm?.size_label || null,
      sku: this.createVariantForm?.sku || null,
      barcode: this.createVariantForm?.barcode || null,
      active: true
    };

    this.rentalService.createVariant(variantPayload).subscribe({
      next: (response: any) => {
        const created = this.extractPayload(response);
        const variantId = Number(created?.id || 0);
        if (!variantId) {
          this.snackBar.open('Variant created but no id returned', 'OK', { duration: 2600 });
          this.createVariantSaving = false;
          this.loadByItem(this.itemId, null);
          return;
        }

        const unitsCalls = Array.from({ length: quantity }).map((_, idx) =>
          this.rentalService.createUnit({
            variant_id: variantId,
            warehouse_id: this.resolveCreateVariantWarehouseId(),
            serial: this.generateSerial(variantId, idx + 1),
            status: 'available',
            condition: this.createVariantForm?.condition || 'good',
            notes: null
          })
        );

        (unitsCalls.length ? forkJoin(unitsCalls) : of([])).subscribe({
          next: async () => {
            try {
              await this.upsertVariantPricing(variantId, {
                half_day_price: Number(this.createVariantForm?.half_day_price || 0),
                full_day_price: Number(this.createVariantForm?.full_day_price || 0),
                week_price: Number(this.createVariantForm?.week_price || 0)
              });
            } catch {
              // Keep flow resilient even if pricing persistence fails.
            }

            this.snackBar.open('Variant created', 'OK', { duration: 2000 });
            this.createVariantSaving = false;
            this.createVariantExpanded = false;
            this.resetCreateVariantForm();
            this.loadByItem(this.itemId, variantId);
          },
          error: () => {
            this.createVariantSaving = false;
            this.snackBar.open('Variant created, but unit creation failed', 'OK', { duration: 2600 });
            this.loadByItem(this.itemId, variantId);
          }
        });
      },
      error: () => {
        this.createVariantSaving = false;
        this.snackBar.open('Error creating variant', 'OK', { duration: 2200 });
      }
    });
  }

  get availableCount(): number {
    return Number(this.analytics?.available_units || 0);
  }

  get totalCount(): number {
    return Number(this.analytics?.total_units || 0);
  }

  get reservedCount(): number {
    return Number(this.analytics?.reserved_units || 0);
  }

  get maintenanceCount(): number {
    return Number(this.analytics?.maintenance_units || 0);
  }

  get inventoryValue(): number {
    const fromAnalytics = Number(this.analytics?.inventory_value || 0);
    if (fromAnalytics > 0) return fromAnalytics;

    const candidates = this.variants
      .map((variant) => Number(variant?.purchase_price || variant?.cost_price || variant?.price || 0))
      .filter((price) => price > 0);
    const avgPrice = candidates.length ? candidates.reduce((sum, price) => sum + price, 0) / candidates.length : 0;
    return Number(this.totalCount || 0) * avgPrice;
  }

  get productTags(): string[] {
    const source = this.item?.tags;
    if (Array.isArray(source)) {
      return source
        .map((value) => {
          if (typeof value === 'string') return value;
          if (value && typeof value === 'object') return String(value.name || '');
          return '';
        })
        .map((value) => String(value || '').trim())
        .filter((value) => value.length > 0);
    }
    if (typeof source === 'string') {
      const trimmed = source.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((value) => String(value || '').trim()).filter((value) => value.length > 0);
        }
      } catch {
        // Fall through to CSV parsing.
      }
      return trimmed
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    }
    return [];
  }

  get mainImageUrl(): string {
    if (this.selectedImageUrl && this.imageCandidates.includes(this.selectedImageUrl)) {
      return this.selectedImageUrl;
    }
    return this.imageCandidates[0] || '';
  }

  get imageCandidates(): string[] {
    const galleryImages = this.itemImages
      .map((image) => String(image?.image_url || '').trim())
      .filter((image) => !!image);

    const fallback = [
      this.variant?.image_url,
      this.item?.image_url,
      this.variant?.image,
      this.item?.image,
      this.variant?.photo_url,
      this.item?.photo_url
    ].filter((value) => typeof value === 'string' && !!String(value).trim()) as string[];

    return Array.from(new Set([...galleryImages, ...fallback.map((value) => value.trim())]));
  }

  selectImage(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    const image = this.itemImages.find((row) => String(row?.image_url || '').trim() === imageUrl);
    if (!image || image?.is_primary) {
      return;
    }

    this.rentalService.setPrimaryItemImage(Number(this.item?.id || 0), Number(image.id)).subscribe({
      next: () => {
        this.itemImages = this.itemImages.map((row) => ({
          ...row,
          is_primary: Number(row?.id || 0) === Number(image.id)
        }));
      }
    });
  }

  isPrimaryImage(imageUrl: string): boolean {
    const image = this.itemImages.find((row) => String(row?.image_url || '').trim() === imageUrl);
    return !!image?.is_primary;
  }

  imageCanBeDeleted(imageUrl: string): boolean {
    return this.itemImages.some((row) => String(row?.image_url || '').trim() === imageUrl);
  }

  deleteImageByUrl(imageUrl: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const image = this.itemImages.find((row) => String(row?.image_url || '').trim() === imageUrl);
    if (!image?.id || !this.item?.id) {
      return;
    }

    this.rentalService.deleteItemImage(Number(this.item.id), Number(image.id)).subscribe({
      next: () => {
        this.itemImages = this.itemImages.filter((row) => Number(row?.id || 0) !== Number(image.id));
        if (this.selectedImageUrl === imageUrl) {
          const primary = this.itemImages.find((row) => !!row?.is_primary);
          this.selectedImageUrl = String(primary?.image_url || this.itemImages[0]?.image_url || '');
        }
        this.snackBar.open('Image deleted', 'OK', { duration: 1800 });
      },
      error: () => this.snackBar.open('Error deleting image', 'OK', { duration: 2500 })
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !this.item?.id) {
      return;
    }

    if (this.itemImages.length >= 6) {
      this.snackBar.open('Máximo 6 imágenes por producto', 'OK', { duration: 2600 });
      if (input) input.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select a valid image file', 'OK', { duration: 2500 });
      if (input) input.value = '';
      return;
    }

    const reader = new FileReader();
    this.imageUploading = true;
    reader.onload = () => {
      const imageData = typeof reader.result === 'string' ? reader.result : '';
      if (!imageData) {
        this.imageUploading = false;
        this.snackBar.open('Image could not be processed', 'OK', { duration: 2500 });
        if (input) input.value = '';
        return;
      }

      this.rentalService.uploadItemImage(Number(this.item.id), imageData).subscribe({
        next: (response: any) => {
          const created = this.extractPayload(response);
          if (created?.id) {
            this.itemImages = [...this.itemImages, created]
              .sort((left: any, right: any) => Number(right?.is_primary || 0) - Number(left?.is_primary || 0));
            if (!this.selectedImageUrl || created?.is_primary) {
              this.selectedImageUrl = String(created?.image_url || '');
            }
          }
          this.imageUploading = false;
          this.snackBar.open('Image uploaded', 'OK', { duration: 1800 });
          if (input) input.value = '';
        },
        error: () => {
          this.imageUploading = false;
          this.snackBar.open('Error uploading image', 'OK', { duration: 2500 });
          if (input) input.value = '';
        }
      });
    };
    reader.onerror = () => {
      this.imageUploading = false;
      this.snackBar.open('Image could not be read', 'OK', { duration: 2500 });
      if (input) input.value = '';
    };
    reader.readAsDataURL(file);
  }

  editCurrentProduct(): void {
    if (!this.variant) return;

    const unitSample = this.units.find((unit: any) => Number(unit?.variant_id || 0) === Number(this.variant?.id || 0)) || null;
    const dialogRow = {
      ...this.variant,
      item: this.item,
      item_id: this.item?.id ?? this.variant?.item_id,
      quantity: this.units.filter((unit: any) => Number(unit?.variant_id || 0) === Number(this.variant?.id || 0)).length || 1,
      warehouse_id: unitSample?.warehouse_id ?? null,
      condition: unitSample?.condition || this.variant?.condition || 'excellent',
      notes: this.variant?.notes ?? unitSample?.notes ?? ''
    };

    const dialogRef = this.dialog.open(RentalsItemDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        mode: 'edit',
        row: dialogRow,
        categories: this.categories,
        subcategories: this.subcategories,
        warehouses: this.warehouses,
        pricingRules: this.pricingRules
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.updateCurrentVariant(result);
    });
  }

  exportProduct(): void {
    const rows = this.variants.map((v) => {
      const inventory = v.inventory || {};
      return [v.name, v.sku || '', v.size_label || '', inventory.available || 0, inventory.total || 0].join(',');
    });
    const csv = ['name,sku,size,available,total', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.item?.name || 'rental-item'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  openVariantDetail(v: any): void {
    if (!v?.id) return;
    this.variant = v;
    this.syncVariantScopedData();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: v.id },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  deleteVariant(v: any): void {
    if (!v?.id) return;

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
      this.rentalService.deleteVariant(Number(v.id)).subscribe({
        next: () => {
          this.snackBar.open('Variant deleted', 'OK', { duration: 2000 });
          this.loadByItem(this.itemId, null);
        },
        error: (error: any) => {
          const backendMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.message ||
            '';
          this.snackBar.open(backendMessage || 'Error deleting variant', 'OK', { duration: 3200 });
        }
      });
    });
  }

  editVariant(v: any): void {
    const pricingRules = Array.isArray(v?.pricing_rules) ? v.pricing_rules : [];
    const getPrice = (periodType: string): number =>
      Number(pricingRules.find((rule: any) => String(rule?.period_type || '').toLowerCase() === periodType)?.price || 0);

    const inventory = v?.inventory || {};
    const unitSample = this.units.find((unit: any) => Number(unit?.variant_id || 0) === Number(v?.id || 0));
    this.editingVariantId = Number(v?.id || 0);
    this.createVariantExpanded = true;
    this.createVariantForm = {
      ...this.createVariantForm,
      name: v?.name || '',
      size_label: v?.size_label || '',
      sku: v?.sku || '',
      barcode: v?.barcode || '',
      quantity: Number(inventory?.total || this.units.filter((unit: any) => Number(unit?.variant_id || 0) === Number(v?.id || 0)).length || 1),
      condition: this.getVariantCondition(v),
      warehouse_id: Number(unitSample?.warehouse_id || 0) || null,
      half_day_price: getPrice('half_day'),
      full_day_price: getPrice('full_day'),
      week_price: getPrice('week'),
      purchase_price: this.getVariantPurchasePrice(v),
      sale_price: this.getVariantSalePrice(v)
    };
  }

  async downloadVariantQr(v: any): Promise<void> {
    const codeValue = String(v?.barcode || v?.sku || `RV-${v?.id || ''}`).trim();
    if (!codeValue) {
      this.snackBar.open('Variant code not available', 'OK', { duration: 2200 });
      return;
    }

    try {
      const dataUrl = await QRCode.toDataURL(codeValue, {
        width: 720,
        margin: 2
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${String(v?.sku || v?.name || 'variant').replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      link.click();
    } catch {
      this.snackBar.open('Unable to generate QR', 'OK', { duration: 2200 });
    }
  }

  getVariantCondition(v: any): string {
    const fromVariant = String(v?.condition || '').trim().toLowerCase();
    if (fromVariant) return fromVariant;

    const sampleUnit = this.units.find((unit: any) => Number(unit?.variant_id || 0) === Number(v?.id || 0));
    const fromUnit = String(sampleUnit?.condition || '').trim().toLowerCase();
    return fromUnit || 'good';
  }

  getVariantPurchasePrice(v: any): number {
    return Number(v?.purchase_price || v?.cost_price || 0);
  }

  getVariantSalePrice(v: any): number {
    return Number(
      v?.sale_price ||
      v?.sell_price ||
      v?.resale_price ||
      0
    );
  }

  getVariantSaleDisplay(v: any): string {
    const value = this.getVariantSalePrice(v);
    return value > 0 ? `${value.toFixed(0)} ${this.getVariantCurrency(v)}` : '-';
  }

  getVariantCurrency(v: any): string {
    const pricingRules = Array.isArray(v?.pricing_rules) ? v.pricing_rules : [];
    const ruleCurrency = pricingRules.find((rule: any) => !!String(rule?.currency || '').trim())?.currency;
    return this.resolveCurrencyCandidate(v?.currency, ruleCurrency, this.schoolCurrency);
  }

  getHistorySku(h: any): string {
    if (h?.sku) return String(h.sku);
    const fromVariants = this.variants.find((v: any) => Number(v?.id || 0) === Number(h?.variant_id || 0));
    if (fromVariants?.sku) return String(fromVariants.sku);
    return String(this.variant?.sku || '-');
  }

  getHistoryVariantName(h: any): string {
    if (h?.variant_name) return String(h.variant_name);
    const fromVariants = this.variants.find((v: any) => Number(v?.id || 0) === Number(h?.variant_id || 0));
    if (fromVariants?.name) return String(fromVariants.name);
    return String(this.variant?.name || '');
  }

  openHistoryReservation(h: any): void {
    const reservationId = Number(h?.reservation_id || 0);
    if (!reservationId) return;
    this.router.navigate(['/rentals/reservation', reservationId, 'edit']);
  }

  getVariantWarehouseLabel(v: any): string {
    const explicit = this.resolveText(v?.warehouse_name, v?.warehouse_location, v?.rack);
    if (explicit) return explicit;

    const unit = this.units.find((row: any) => Number(row?.variant_id || 0) === Number(v?.id || 0));
    const warehouseId = Number(unit?.warehouse_id || 0);
    if (warehouseId > 0) {
      const warehouse = this.warehouses.find((row: any) => Number(row?.id || 0) === warehouseId);
      const warehouseName = this.resolveText(warehouse?.name, warehouse?.code);
      if (warehouseName) return warehouseName;
    }

    return '';
  }

  getVariantRentalPriceSummary(v: any): string {
    const pricingRules = Array.isArray(v?.pricing_rules) ? v.pricing_rules : [];
    if (!pricingRules.length) return '-';

    const byPeriod = new Map<string, any>();
    pricingRules.forEach((rule: any) => {
      const period = String(rule?.period_type || '').toLowerCase();
      if (!period || byPeriod.has(period)) return;
      byPeriod.set(period, rule);
    });

    const ordered = ['half_day', 'full_day', 'week', 'season']
      .map((period) => byPeriod.get(period))
      .filter(Boolean);
    const fallback = ordered.length ? ordered : pricingRules.slice(0, 3);
    const pieces = fallback.map((rule: any) => {
      const amount = Number(rule?.price || 0);
      const currency = this.resolveCurrencyCandidate(rule?.currency, this.getVariantCurrency(v));
      return `${amount.toFixed(0)} ${currency}`;
    });
    return pieces.join(' / ') || '-';
  }

  get schoolCurrency(): string {
    const firstRuleCurrency = this.pricingRules.find((rule: any) => !!String(rule?.currency || '').trim())?.currency;
    return this.resolveCurrencyCandidate(
      this.item?.currency,
      this.analytics?.currency,
      this.variant?.currency,
      firstRuleCurrency,
      this.serviceForm?.currency,
      this.schoolCurrencyFromUser
    );
  }

  get schoolCurrencyFromUser(): string {
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

  private async updateCurrentVariant(payload: any): Promise<void> {
    if (!this.variant?.id || !this.variant?.item_id) return;

    try {
      await firstValueFrom(this.rentalService.updateItem(Number(this.variant.item_id), {
        category_id: Number(payload.category_id || this.item?.category_id),
        name: payload.item_name,
        brand: payload.brand,
        model: payload.model,
        tags: this.normalizeTagsInput(payload.tags),
        description: this.item?.description || null,
        image: this.item?.image || this.item?.image_url || null,
        active: true
      }));

      await firstValueFrom(this.rentalService.updateVariant(Number(this.variant.id), {
        item_id: Number(this.variant.item_id),
        subcategory_id: payload.subcategory_id ? Number(payload.subcategory_id) : null,
        name: payload.variant_name,
        size_label: payload.size_label,
        sku: payload.sku,
        barcode: payload.barcode,
        serial_prefix: payload.serial_prefix || null,
        purchase_date: payload.purchase_date || null,
        last_maintenance_date: payload.last_maintenance_date || null,
        notes: payload.notes || null,
        active: true
      }));

      await this.upsertVariantPricing(Number(this.variant.id), payload);
      await this.syncVariantUnits(Number(this.variant.id), payload);

      this.snackBar.open('Product updated', 'OK', { duration: 2200 });
      this.loadByItem(this.itemId, Number(this.variant?.id || 0));
    } catch (error: any) {
      const backendMessage =
        error?.error?.message ||
        error?.error?.error ||
        error?.message ||
        'Error updating product';
      this.snackBar.open(String(backendMessage), 'OK', { duration: 3200 });
    }
  }

  private loadFromLegacyVariant(variantId: number): void {
    this.loading = true;
    this.rentalService.getVariant(variantId).subscribe({
      next: (response: any) => {
        const payload = this.extractPayload(response);
        const itemId = Number(payload?.item?.id || payload?.item_id || 0);
        if (!itemId) {
          this.loading = false;
          this.snackBar.open('Invalid rental product', 'OK', { duration: 2500 });
          this.back();
          return;
        }

        this.itemId = itemId;
        this.router.navigate(['/rentals/item', itemId], {
          queryParams: { variant: variantId },
          replaceUrl: true
        });

        this.loadByItem(itemId, variantId, false);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error loading equipment detail', 'OK', { duration: 2500 });
      }
    });
  }

  private loadByItem(itemId: number, selectedVariantId: number | null, allowVariantFallback = true): void {
    this.loading = true;
    this.itemId = itemId;

    this.rentalService.getItemDetail(itemId, selectedVariantId).subscribe({
      next: (response: any) => {
        const payload = this.extractPayload(response);
        this.data = payload;
        this.item = payload?.item || null;
        this.variants = Array.isArray(payload?.variants) ? payload.variants : [];
        this.units = Array.isArray(payload?.units) ? payload.units : [];
        this.pricingRules = Array.isArray(payload?.pricing_rules) ? payload.pricing_rules : [];
        this.history = Array.isArray(payload?.history) ? payload.history : [];
        this.analytics = payload?.analytics || null;
        this.itemImages = Array.isArray(payload?.images) ? payload.images : [];

        const preferredVariantId = Number(selectedVariantId || payload?.selected_variant?.id || 0);
        this.variant = this.variants.find((v) => Number(v?.id || 0) === preferredVariantId) || payload?.selected_variant || this.variants[0] || null;
        const primaryImage = this.itemImages.find((image: any) => !!image?.is_primary);
        this.selectedImageUrl = String(primaryImage?.image_url || this.itemImages[0]?.image_url || this.selectedImageUrl || '');

        this.syncVariantScopedData();
        this.loading = false;
        if (this.pendingAutoEdit && this.variant) {
          this.pendingAutoEdit = false;
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { edit: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
          setTimeout(() => this.editCurrentProduct(), 0);
        }
      },
      error: () => {
        if (allowVariantFallback) {
          this.loadFromLegacyVariant(itemId);
          return;
        }
        this.loading = false;
        this.snackBar.open('Error loading equipment detail', 'OK', { duration: 2500 });
      }
    });
  }

  private syncVariantScopedData(): void {
    const currentVariantId = Number(this.variant?.id || 0);
    this.services = (Array.isArray(this.data?.services) ? this.data.services : [])
      .filter((service: any) => Number(service?.variant_id || 0) === currentVariantId);
  }

  private async upsertVariantPricing(variantId: number, payload: any): Promise<void> {
    const priceByPeriod: Record<string, number> = {
      half_day: Number(payload?.half_day_price || 0),
      full_day: Number(payload?.full_day_price || 0),
      week: Number(payload?.week_price || 0)
    };

    for (const [periodType, price] of Object.entries(priceByPeriod)) {
      const existingRule = this.pricingRules.find((rule: any) =>
        Number(rule?.variant_id || 0) === variantId &&
        String(rule?.period_type || '').toLowerCase() === periodType
      );

      if (existingRule?.id) {
        await firstValueFrom(this.rentalService.updatePricingRule(Number(existingRule.id), {
          variant_id: variantId,
          period_type: periodType,
          price,
          currency: this.resolveCurrencyCandidate(existingRule?.currency, this.schoolCurrency),
          active: true
        }));
      } else if (price > 0) {
        await firstValueFrom(this.rentalService.createPricingRule({
          item_id: Number(this.item?.id || 0),
          variant_id: variantId,
          period_type: periodType,
          price,
          currency: this.schoolCurrency,
          active: true
        }));
      }
    }
  }

  private updateVariantFromForm(variantId: number, quantity: number): void {
    const payload = {
      subcategory_id: this.variant?.subcategory_id || null,
      name: String(this.createVariantForm?.name || '').trim(),
      size_group: this.createVariantForm?.size_label || null,
      size_label: this.createVariantForm?.size_label || null,
      sku: this.createVariantForm?.sku || null,
      barcode: this.createVariantForm?.barcode || null,
      active: true
    };

    this.rentalService.updateVariant(variantId, payload).subscribe({
      next: async () => {
        try {
          await this.upsertVariantPricing(variantId, {
            half_day_price: Number(this.createVariantForm?.half_day_price || 0),
            full_day_price: Number(this.createVariantForm?.full_day_price || 0),
            week_price: Number(this.createVariantForm?.week_price || 0)
          });
          await this.syncVariantUnits(variantId, {
            quantity,
            warehouse_id: this.resolveCreateVariantWarehouseId(),
            condition: this.createVariantForm?.condition || 'good',
            sku: this.createVariantForm?.sku || null,
            serial_prefix: this.createVariantForm?.sku || this.createVariantForm?.name || null,
            notes: null
          });
        } catch (error: any) {
          const backendMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.message ||
            '';
          this.snackBar.open(backendMessage || 'Error updating variant', 'OK', { duration: 3200 });
          this.createVariantSaving = false;
          return;
        }

        this.createVariantSaving = false;
        this.createVariantExpanded = false;
        this.editingVariantId = null;
        this.resetCreateVariantForm();
        this.snackBar.open('Variant updated', 'OK', { duration: 2000 });
        this.loadByItem(this.itemId, variantId);
      },
      error: (error: any) => {
        this.createVariantSaving = false;
        const backendMessage =
          error?.error?.message ||
          error?.error?.error ||
          error?.message ||
          '';
        this.snackBar.open(backendMessage || 'Error updating variant', 'OK', { duration: 3200 });
      }
    });
  }

  private resolveCurrencyCandidate(...candidates: any[]): string {
    const detected = candidates
      .map((candidate) => String(candidate || '').trim().toUpperCase())
      .find((candidate) => candidate.length > 0);

    return detected || '';
  }

  private resolveText(...candidates: any[]): string {
    const detected = candidates
      .map((candidate) => String(candidate || '').trim())
      .find((candidate) => candidate.length > 0);
    return detected || '';
  }

  private async syncVariantUnits(variantId: number, payload: any): Promise<void> {
    const existingUnits = this.units.filter((unit: any) => Number(unit?.variant_id || 0) === variantId);
    const desiredQuantity = Math.max(1, Number(payload?.quantity || existingUnits.length || 1));
    const warehouseId = payload?.warehouse_id ? Number(payload.warehouse_id) : null;
    const condition = String(payload?.condition || 'excellent');
    const notes = payload?.notes || null;
    const serialPrefix = String(payload?.serial_prefix || payload?.sku || this.variant?.sku || `RV-${variantId}`)
      .trim()
      .replace(/\s+/g, '-')
      .toUpperCase()
      .slice(0, 20);

    for (const unit of existingUnits) {
      await firstValueFrom(this.rentalService.updateUnit(Number(unit.id), {
        variant_id: variantId,
        warehouse_id: warehouseId ?? unit?.warehouse_id ?? null,
        serial: unit?.serial || `${serialPrefix}-${String(unit.id).padStart(4, '0')}`,
        status: unit?.status || 'available',
        condition,
        notes
      }));
    }

    if (desiredQuantity > existingUnits.length) {
      const toCreate = desiredQuantity - existingUnits.length;
      for (let index = 0; index < toCreate; index += 1) {
        await firstValueFrom(this.rentalService.createUnit({
          variant_id: variantId,
          warehouse_id: warehouseId,
          serial: `${serialPrefix}-${Date.now().toString().slice(-6)}-${String(index + 1).padStart(2, '0')}`,
          status: 'available',
          condition,
          notes
        }));
      }
      return;
    }

    if (desiredQuantity < existingUnits.length) {
      const toRemove = existingUnits.length - desiredQuantity;
      const removableUnits = existingUnits.filter((unit: any) =>
        String(unit?.status || '').toLowerCase() === 'available'
      );

      if (removableUnits.length < toRemove) {
        throw new Error('No se puede reducir cantidad porque hay unidades no disponibles en reservas activas.');
      }

      const sortedRemovable = [...removableUnits].sort((a: any, b: any) => Number(b?.id || 0) - Number(a?.id || 0));
      const selectedToRemove = sortedRemovable.slice(0, toRemove);
      for (const unit of selectedToRemove) {
        await firstValueFrom(this.rentalService.deleteUnit(Number(unit.id)));
      }
    }
  }

  private ensureLookupsLoaded(): void {
    if (this.categories.length && this.subcategories.length && this.warehouses.length) {
      return;
    }

    forkJoin([
      this.rentalService.listCategories({ per_page: 500 }),
      this.rentalService.listSubcategories({ per_page: 500 }),
      this.rentalService.listWarehouses({ per_page: 500 })
    ]).subscribe({
      next: ([categoriesRes, subcategoriesRes, warehousesRes]) => {
        this.categories = this.extractRows(categoriesRes);
        this.subcategories = this.extractRows(subcategoriesRes);
        this.warehouses = this.extractRows(warehousesRes);
      }
    });
  }

  private extractRows(response: any): any[] {
    const payload = this.extractPayload(response);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }
    return [];
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

  private pickPreferredWarehouseId(): number | null {
    const preferred = this.units.find((unit: any) => Number(unit?.variant_id || 0) === Number(this.variant?.id || 0) && Number(unit?.warehouse_id || 0) > 0);
    if (preferred) return Number(preferred.warehouse_id);
    const firstWithWarehouse = this.units.find((unit: any) => Number(unit?.warehouse_id || 0) > 0);
    return firstWithWarehouse ? Number(firstWithWarehouse.warehouse_id) : null;
  }

  private resolveCreateVariantWarehouseId(): number | null {
    const selected = Number(this.createVariantForm?.warehouse_id || 0);
    if (selected > 0) return selected;
    return this.pickPreferredWarehouseId();
  }

  private resetCreateVariantForm(): void {
    this.editingVariantId = null;
    this.createVariantForm = {
      name: '',
      size_label: '',
      sku: '',
      barcode: '',
      quantity: 1,
      condition: 'good',
      warehouse_id: null,
      half_day_price: 0,
      full_day_price: 0,
      week_price: 0,
      purchase_price: 0,
      sale_price: 0
    };
  }

  private generateSerial(variantId: number, offset: number): string {
    const prefix = String(this.createVariantForm?.sku || this.createVariantForm?.name || `VAR-${variantId}`)
      .replace(/\s+/g, '-')
      .toUpperCase()
      .slice(0, 16);
    const stamp = Date.now().toString().slice(-6);
    return `${prefix}-${stamp}-${String(offset).padStart(2, '0')}`;
  }

  private extractPayload(response: any): any {
    return response?.data?.data ?? response?.data ?? response ?? null;
  }
}

