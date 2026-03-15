import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalItemDialogData {
  mode: 'create' | 'edit';
  row?: any;
  categories: any[];
  subcategories: any[];
  brands: any[];
  models: any[];
  warehouses: any[];
  pricingRules: any[];
}

@Component({
  selector: 'vex-rental-item-dialog',
  templateUrl: './rentals-item-dialog.component.html',
  styleUrls: ['./rentals-item-dialog.component.scss']
})
export class RentalsItemDialogComponent {
  private readonly subcategoriesByCategory = new Map<number, any[]>();
  subcategorySearch = '';

  form = this.fb.group({
    category_id: [null, Validators.required],
    subcategory_id: [null],
    item_name: ['', Validators.required],
    brand_id: [null],
    model_id: [null],
    variant_name: ['', Validators.required],
    size_label: [''],
    quantity: [1, [Validators.required, Validators.min(1)]],
    condition: ['excellent', Validators.required],
    purchase_date: [''],
    last_maintenance_date: [''],
    half_day_price: [0],
    full_day_price: [0],
    week_price: [0],
    warehouse_id: [null],
    barcode: [''],
    sku: [''],
    serial_prefix: [''],
    tags: [''],
    notes: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<RentalsItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: RentalItemDialogData
  ) {
    this.buildSubcategoryCache();
    this.form.get('category_id')?.valueChanges.subscribe((value) => this.handleCategoryChanged(Number(value || 0) || null));
    this.form.get('brand_id')?.valueChanges.subscribe((value) => this.handleBrandChanged(Number(value || 0) || null));
    this.prefill();
  }

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  get title(): string {
    return this.isEdit ? 'Edit Equipment Item' : 'Add Equipment Item';
  }

  get subtitle(): string {
    return this.isEdit ? 'Update equipment information' : 'Create a new equipment item';
  }

  get filteredSubcategories(): any[] {
    const categoryId = Number(this.form.get('category_id')?.value || 0);
    if (!categoryId) return [];
    const rows = this.subcategoriesByCategory.get(categoryId) || [];
    const query = String(this.subcategorySearch || '').trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row?.name, row?.pathLabel]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .includes(query)
    );
  }

  get hasCategorySelected(): boolean {
    return !!Number(this.form.get('category_id')?.value || 0);
  }

  get filteredModels(): any[] {
    const selectedBrandId = Number(this.form.get('brand_id')?.value || 0) || null;
    const rows = (this.data.models || []).filter((model) => {
      if (!selectedBrandId) return true;
      return Number(model?.brand_id || 0) === selectedBrandId;
    });
    return [...rows].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  openNativeDatePicker(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    const picker = (target as any).showPicker;
    if (typeof picker === 'function') {
      try {
        picker.call(target);
      } catch {
        // Browser may block showPicker in some contexts; fallback to native behavior.
      }
    }
  }

  subcategoryOptionLabel(subcategory: any): string {
    return String(subcategory?.pathLabel || subcategory?.name || '').trim();
  }

  subcategoryDepth(subcategory: any): number {
    return Math.max(0, Number(subcategory?.depth || 0));
  }

  onSubcategoryOpenedChange(opened: boolean): void {
    if (!opened) {
      this.subcategorySearch = '';
    }
  }

  onSubcategorySearchKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
  }

  private prefill(): void {
    if (!this.isEdit || !this.data.row) return;

    const row = this.data.row;
    const ruleBy = (period: string) =>
      this.data.pricingRules.find((pricingRule) =>
        Number(pricingRule.variant_id) === Number(row.id) &&
        String(pricingRule.period_type || '').toLowerCase() === period
      ) ||
      this.data.pricingRules.find((pricingRule) =>
        Number(pricingRule.item_id) === Number(row.item_id) &&
        String(pricingRule.period_type || '').toLowerCase() === period
      );

    this.form.patchValue({
      category_id: row?.item?.category_id ?? null,
      subcategory_id: row?.subcategory_id ?? row?.subcategory?.id ?? null,
      item_name: row?.item?.name ?? row?.name ?? '',
      brand_id: this.resolveBrandId(row),
      model_id: this.resolveModelId(row),
      variant_name: row?.name ?? '',
      size_label: row?.size_label ?? '',
      quantity: Number(row?.total || 1),
      condition: row?.condition || 'excellent',
      purchase_date: row?.purchase_date || row?.item?.purchase_date || '',
      last_maintenance_date: row?.last_maintenance_date || row?.item?.last_maintenance_date || '',
      half_day_price: Number(ruleBy('half_day')?.price || 0),
      full_day_price: Number(ruleBy('full_day')?.price || 0),
      week_price: Number(ruleBy('week')?.price || 0),
      warehouse_id: row?.warehouse_id ?? null,
      barcode: row?.barcode ?? '',
      sku: row?.sku ?? '',
      serial_prefix: row?.serial_prefix ?? row?.item?.serial_prefix ?? '',
      tags: this.stringifyTags(row?.item?.tags),
      notes: row?.notes ?? row?.item?.notes ?? ''
    });

    this.handleBrandChanged(Number(this.form.get('brand_id')?.value || 0) || null);
  }

  private stringifyTags(raw: any): string {
    if (Array.isArray(raw)) {
      return raw
        .map((entry) => (typeof entry === 'string' ? entry : String(entry?.name || '')))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .join(', ');
    }
    if (typeof raw === 'string') {
      return raw;
    }
    return '';
  }

  private subcategoryPathLabel(subcategoryId: number, categoryId: number): string {
    if (!subcategoryId) return '';
    const byId = new Map<number, any>();
    this.data.subcategories
      .filter((subcategory) => Number(subcategory?.category_id || 0) === Number(categoryId || 0))
      .forEach((subcategory) => byId.set(Number(subcategory?.id || 0), subcategory));

    const labels: string[] = [];
    let cursor = byId.get(Number(subcategoryId));
    let guard = 0;
    while (cursor && guard < 50) {
      const name = String(cursor?.name || '').trim();
      if (name) labels.unshift(name);
      const parentId = Number(cursor?.parent_id || 0);
      if (!parentId) break;
      cursor = byId.get(parentId);
      guard++;
    }

    return labels.join(' / ') || String(byId.get(Number(subcategoryId))?.name || '').trim();
  }

  private handleBrandChanged(brandId: number | null): void {
    const selectedModelId = Number(this.form.get('model_id')?.value || 0);
    if (!selectedModelId) return;
    const model = (this.data.models || []).find((entry) => Number(entry?.id || 0) === selectedModelId);
    if (!model) {
      this.form.patchValue({ model_id: null }, { emitEvent: false });
      return;
    }
    if (brandId && Number(model?.brand_id || 0) !== brandId) {
      this.form.patchValue({ model_id: null }, { emitEvent: false });
    }
  }

  private resolveBrandId(row: any): number | null {
    const item = row?.item || {};
    const direct = Number(item?.brand_id || 0);
    if (direct > 0) return direct;
    const brandName = String(item?.brand || '').trim().toLowerCase();
    if (!brandName) return null;
    const matched = (this.data.brands || []).find((brand) => String(brand?.name || '').trim().toLowerCase() === brandName);
    return matched?.id ? Number(matched.id) : null;
  }

  private resolveModelId(row: any): number | null {
    const item = row?.item || {};
    const direct = Number(item?.model_id || 0);
    if (direct > 0) return direct;
    const modelName = String(item?.model || '').trim().toLowerCase();
    if (!modelName) return null;
    const brandId = this.resolveBrandId(row);
    const matched = (this.data.models || []).find((model) => {
      const sameName = String(model?.name || '').trim().toLowerCase() === modelName;
      if (!sameName) return false;
      if (!brandId) return true;
      return Number(model?.brand_id || 0) === brandId;
    });
    return matched?.id ? Number(matched.id) : null;
  }

  private handleCategoryChanged(categoryId: number | null): void {
    this.subcategorySearch = '';
    const selectedSubcategoryId = Number(this.form.get('subcategory_id')?.value || 0);
    if (!selectedSubcategoryId) return;
    const rows = categoryId ? (this.subcategoriesByCategory.get(categoryId) || []) : [];
    const existsInCategory = rows.some((entry) => Number(entry?.id || 0) === selectedSubcategoryId);
    if (!existsInCategory) {
      this.form.patchValue({ subcategory_id: null }, { emitEvent: false });
    }
  }

  private buildSubcategoryCache(): void {
    this.subcategoriesByCategory.clear();
    const byCategory = new Map<number, any[]>();
    for (const subcategory of this.data.subcategories || []) {
      const categoryId = Number(subcategory?.category_id || 0);
      if (!categoryId) continue;
      const rows = byCategory.get(categoryId) || [];
      rows.push(subcategory);
      byCategory.set(categoryId, rows);
    }

    byCategory.forEach((rows, categoryId) => {
      const normalized = rows
        .map((subcategory) => ({
          ...subcategory,
          pathLabel: this.subcategoryPathLabel(Number(subcategory?.id || 0), categoryId),
          depth: String(this.subcategoryPathLabel(Number(subcategory?.id || 0), categoryId)).split('/').length - 1
        }))
        .sort((a, b) =>
          String(a?.pathLabel || a?.name || '').localeCompare(
            String(b?.pathLabel || b?.name || ''),
            'es',
            { sensitivity: 'base' }
          )
        );
      this.subcategoriesByCategory.set(categoryId, normalized);
    });
  }
}

