import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { RentalService } from 'src/service/rental.service';
import { RentalsItemDialogComponent } from './rentals-item-dialog.component';

@Component({
  selector: 'vex-rentals-item-detail',
  templateUrl: './rentals-item-detail.component.html',
  styleUrls: ['./rentals-item-detail.component.scss']
})
export class RentalsItemDetailComponent implements OnInit {
  loading = false;
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
  private pendingAutoEdit = false;

  createVariantExpanded = false;
  createVariantForm: any = {
    name: '',
    size_label: '',
    sku: '',
    barcode: '',
    quantity: 1,
    condition: 'good'
  };

  activeTab: 'variants' | 'services' | 'history' | 'analytics' = 'variants';
  serviceForm: any = {
    id: null,
    name: '',
    description: '',
    price: 0,
    currency: 'CHF',
    active: true
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rentalService: RentalService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
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
    this.serviceForm = { id: null, name: '', description: '', price: 0, currency: 'CHF', active: true };
  }

  editService(service: any): void {
    this.serviceForm = {
      id: service?.id || null,
      name: service?.name || '',
      description: service?.description || '',
      price: Number(service?.price || 0),
      currency: service?.currency || 'CHF',
      active: !!service?.active
    };
  }

  saveService(): void {
    if (!this.variant?.id || !this.serviceForm?.name?.trim()) {
      this.snackBar.open('Service name is required', 'OK', { duration: 2200 });
      return;
    }

    const payload = {
      variant_id: Number(this.variant.id),
      name: this.serviceForm.name.trim(),
      description: (this.serviceForm.description || '').trim(),
      price: Number(this.serviceForm.price || 0),
      currency: this.serviceForm.currency || 'CHF',
      active: !!this.serviceForm.active
    };

    const req = this.serviceForm.id
      ? this.rentalService.updateVariantService(Number(this.serviceForm.id), payload)
      : this.rentalService.createVariantService(payload);

    req.subscribe({
      next: () => {
        this.snackBar.open('Service saved', 'OK', { duration: 1800 });
        this.startCreateService();
        this.loadByItem(this.itemId, Number(this.variant?.id || 0));
      },
      error: () => this.snackBar.open('Error saving service', 'OK', { duration: 2200 })
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
    this.createVariantExpanded = !this.createVariantExpanded;
  }

  createVariant(): void {
    const name = String(this.createVariantForm?.name || '').trim();
    const quantity = Number(this.createVariantForm?.quantity || 0);
    if (!this.itemId || !name || quantity <= 0) {
      this.snackBar.open('Variant name and quantity are required', 'OK', { duration: 2200 });
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
          this.loadByItem(this.itemId, null);
          return;
        }

        const unitsCalls = Array.from({ length: quantity }).map((_, idx) =>
          this.rentalService.createUnit({
            variant_id: variantId,
            warehouse_id: this.pickPreferredWarehouseId(),
            serial: this.generateSerial(variantId, idx + 1),
            status: 'available',
            condition: this.createVariantForm?.condition || 'good',
            notes: null
          })
        );

        (unitsCalls.length ? forkJoin(unitsCalls) : of([])).subscribe({
          next: () => {
            this.snackBar.open('Variant created', 'OK', { duration: 2000 });
            this.createVariantExpanded = false;
            this.createVariantForm = {
              name: '',
              size_label: '',
              sku: '',
              barcode: '',
              quantity: 1,
              condition: 'good'
            };
            this.loadByItem(this.itemId, variantId);
          },
          error: () => {
            this.snackBar.open('Variant created, but unit creation failed', 'OK', { duration: 2600 });
            this.loadByItem(this.itemId, variantId);
          }
        });
      },
      error: () => this.snackBar.open('Error creating variant', 'OK', { duration: 2200 })
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

  get mainImageUrl(): string {
    return this.imageCandidates[0] || '';
  }

  get imageCandidates(): string[] {
    const raw = [
      this.variant?.image_url,
      this.item?.image_url,
      this.variant?.image,
      this.item?.image,
      this.variant?.photo_url,
      this.item?.photo_url
    ].filter((value) => typeof value === 'string' && !!String(value).trim()) as string[];
    return Array.from(new Set(raw.map((value) => value.trim())));
  }

  editCurrentProduct(): void {
    if (!this.variant) return;

    const dialogRef = this.dialog.open(RentalsItemDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        mode: 'edit',
        row: this.variant,
        categories: this.item?.category_id ? [{ id: this.item.category_id, name: this.item.category_name || 'Category' }] : [],
        subcategories: this.variant?.subcategory ? [{ id: this.variant?.subcategory_id, name: this.variant.subcategory.name, category_id: this.item?.category_id }] : [],
        warehouses: [],
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
    this.rentalService.deleteVariant(Number(v.id)).subscribe({
      next: () => {
        this.snackBar.open('Variant deleted', 'OK', { duration: 2000 });
        this.loadByItem(this.itemId, null);
      },
      error: () => this.snackBar.open('Error deleting variant', 'OK', { duration: 2500 })
    });
  }

  private updateCurrentVariant(payload: any): void {
    if (!this.variant?.id || !this.variant?.item_id) return;

    this.rentalService.updateItem(Number(this.variant.item_id), {
      category_id: Number(payload.category_id || this.item?.category_id),
      name: payload.item_name,
      brand: payload.brand,
      model: payload.model,
      active: true
    }).subscribe({
      next: () => {
        this.rentalService.updateVariant(Number(this.variant.id), {
          item_id: Number(this.variant.item_id),
          subcategory_id: payload.subcategory_id ? Number(payload.subcategory_id) : null,
          name: payload.variant_name,
          size_label: payload.size_label,
          sku: payload.sku,
          barcode: payload.barcode,
          active: true
        }).subscribe({
          next: () => {
            this.snackBar.open('Product updated', 'OK', { duration: 2000 });
            this.loadByItem(this.itemId, Number(this.variant?.id || 0));
          },
          error: () => this.snackBar.open('Error updating variant', 'OK', { duration: 2500 })
        });
      },
      error: () => this.snackBar.open('Error updating item', 'OK', { duration: 2500 })
    });
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

        const preferredVariantId = Number(selectedVariantId || payload?.selected_variant?.id || 0);
        this.variant = this.variants.find((v) => Number(v?.id || 0) === preferredVariantId) || payload?.selected_variant || this.variants[0] || null;

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

  private pickPreferredWarehouseId(): number | null {
    const preferred = this.units.find((unit: any) => Number(unit?.variant_id || 0) === Number(this.variant?.id || 0) && Number(unit?.warehouse_id || 0) > 0);
    if (preferred) return Number(preferred.warehouse_id);
    const firstWithWarehouse = this.units.find((unit: any) => Number(unit?.warehouse_id || 0) > 0);
    return firstWithWarehouse ? Number(firstWithWarehouse.warehouse_id) : null;
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
