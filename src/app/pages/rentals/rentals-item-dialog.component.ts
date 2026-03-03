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
    half_day_price: [0],
    full_day_price: [0],
    week_price: [0],
    warehouse_id: [null],
    barcode: [''],
    sku: [''],
    serial_prefix: [''],
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
    return this.data.subcategories.filter((subcategory) => Number(subcategory.category_id) === categoryId);
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

  private prefill(): void {
    if (!this.isEdit || !this.data.row) return;

    const row = this.data.row;
    const ruleBy = (period: string) =>
      this.data.pricingRules.find((pricingRule) => Number(pricingRule.variant_id) === Number(row.id) && pricingRule.period_type === period);

    this.form.patchValue({
      category_id: row?.item?.category_id ?? null,
      subcategory_id: row?.subcategory?.id ?? null,
      item_name: row?.item?.name ?? row?.name ?? '',
      brand: row?.item?.brand ?? '',
      model: row?.item?.model ?? '',
      variant_name: row?.name ?? '',
      size_label: row?.size_label ?? '',
      quantity: Number(row?.total || 1),
      condition: row?.condition || 'excellent',
      half_day_price: Number(ruleBy('half_day')?.price || 0),
      full_day_price: Number(ruleBy('full_day')?.price || 0),
      week_price: Number(ruleBy('week')?.price || 0),
      warehouse_id: row?.warehouse_id ?? null,
      barcode: row?.barcode ?? '',
      sku: row?.sku ?? '',
      serial_prefix: row?.serial_prefix ?? '',
      notes: row?.notes ?? ''
    });
  }
}

