import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalItemDialogData {
  mode: 'create' | 'edit';
  row?: any;
  categories: any[];
  subcategories: any[];
  warehouses: any[];
  pricingRules: any[];
}

@Component({
  selector: 'vex-rental-item-dialog',
  templateUrl: './rentals-item-dialog.component.html',
  styleUrls: ['./rentals-item-dialog.component.scss']
})
export class RentalsItemDialogComponent {
  form = this.fb.group({
    category_id: [null, Validators.required],
    subcategory_id: [null],
    item_name: ['', Validators.required],
    brand: [''],
    model: [''],
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
    return this.data.subcategories
      .filter((subcategory) => Number(subcategory.category_id) === categoryId)
      .map((subcategory) => ({
        ...subcategory,
        pathLabel: this.subcategoryPathLabel(Number(subcategory?.id || 0), categoryId)
      }))
      .sort((a, b) => String(a?.pathLabel || a?.name || '').localeCompare(String(b?.pathLabel || b?.name || ''), 'es', { sensitivity: 'base' }));
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
      brand: row?.item?.brand ?? '',
      model: row?.item?.model ?? '',
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
}

