import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { RentalService } from 'src/service/rental.service';
import { RentalsItemDialogComponent } from './rentals-item-dialog.component';

@Component({
  selector: 'vex-rentals-item-detail',
  templateUrl: './rentals-item-detail.component.html',
  styleUrls: ['./rentals-item-detail.component.scss']
})
export class RentalsItemDetailComponent implements OnInit {
  loading = false;
  variantId = 0;

  data: any = null;
  item: any = null;
  variant: any = null;
  variants: any[] = [];
  units: any[] = [];
  pricingRules: any[] = [];
  history: any[] = [];
  services: any[] = [];
  analytics: any = null;

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
    this.variantId = Number(this.route.snapshot.paramMap.get('variantId') || 0);
    this.load();
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
        this.load();
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
        this.load();
      },
      error: () => this.snackBar.open('Error deleting service', 'OK', { duration: 2200 })
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
    this.router.navigate(['/rentals/item', v.id]);
  }

  deleteVariant(v: any): void {
    if (!v?.id) return;
    this.rentalService.deleteVariant(Number(v.id)).subscribe({
      next: () => {
        this.snackBar.open('Variant deleted', 'OK', { duration: 2000 });
        this.load();
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
            this.load();
          },
          error: () => this.snackBar.open('Error updating variant', 'OK', { duration: 2500 })
        });
      },
      error: () => this.snackBar.open('Error updating item', 'OK', { duration: 2500 })
    });
  }

  private load(): void {
    this.loading = true;

    this.rentalService.getVariant(this.variantId).subscribe({
      next: (response: any) => {
        const payload = response?.data?.data ?? response?.data ?? null;
        this.data = payload;
        this.item = payload?.item || null;
        this.variant = payload?.variant || null;
        this.variants = Array.isArray(payload?.variants) ? payload.variants : [];
        this.units = Array.isArray(payload?.units) ? payload.units : [];
        this.pricingRules = Array.isArray(payload?.pricing_rules) ? payload.pricing_rules : [];
        this.history = Array.isArray(payload?.history) ? payload.history : [];
        this.services = Array.isArray(payload?.services)
          ? payload.services.filter((s: any) => Number(s?.variant_id) === Number(this.variantId))
          : [];
        this.analytics = payload?.analytics || null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error loading equipment detail', 'OK', { duration: 2500 });
      }
    });
  }
}

