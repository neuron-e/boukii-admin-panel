import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { RentalService } from 'src/service/rental.service';
import { RentalsPaymentDialogComponent } from './rentals-payment-dialog.component';

@Component({
  selector: 'vex-rentals-reservation-edit',
  templateUrl: './rentals-reservation-edit.component.html',
  styleUrls: ['./rentals-reservation-edit.component.scss']
})
export class RentalsReservationEditComponent implements OnInit {
  mode: 'create' | 'edit' = 'edit';
  loading = true;
  saving = false;
  reservationId = 0;
  reservation: any = null;
  financialReconciliation: any = null;
  paymentInfo: any = null;
  loadingPayment = false;
  pickupPoints: any[] = [];
  clients: any[] = [];
  categories: any[] = [];
  subcategories: any[] = [];
  variants: any[] = [];
  units: any[] = [];
  pricingRules: any[] = [];
  itemsForAddLine: any[] = [];
  itemsCatalogById = new Map<number, any>();
  selectedAddLineItemId: number | null = null;
  selectedAddLineItem: any = null;
  selectedAddLineVariant: any = null;
  editableLines: any[] = [];
  equipmentSearch = '';
  equipmentCategoryFilter: number | 'all' = 'all';
  expandedEquipmentGroupIds: number[] = [];
  groupVariantSearch: Record<number, string> = {};
  equipmentGroupsView: any[] = [];
  newLineVariantId: number | null = null;
  newLineQty = 1;
  readonly periodTypeOptions: Array<{ value: string; label: string }> = [
    { value: 'season', label: 'Temporada' },
    { value: 'half_day', label: 'Medio Día' },
    { value: 'full_day', label: 'Día Completo' },
    { value: 'multi_day', label: 'Varios Días' },
    { value: 'week', label: 'Semana' },
  ];

  form = this.fb.group({
    client_id: [null, Validators.required],
    pickup_point_id: [null, Validators.required],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    start_time: ['09:00', Validators.required],
    end_time: ['17:00', Validators.required],
    status: ['pending', Validators.required],
    period_type: ['full_day', Validators.required],
    notes: ['']
  });

  quotePreview: any = null;
  quoteLoading = false;
  private quoteRequestId = 0;
  private availableByVariant = new Map<number, number>();
  private totalByVariant = new Map<number, number>();
  private subcategoryCategoryById = new Map<number, number>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rentalService: RentalService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reservationId = Number(this.route.snapshot.paramMap.get('reservationId') || 0);
    this.mode = this.reservationId > 0 ? 'edit' : 'create';
    this.form.get('period_type')?.valueChanges.subscribe((value) => {
      this.applyPeriodPreset(String(value || 'full_day'));
      void this.refreshQuotePreview();
    });
    this.form.get('start_date')?.valueChanges.subscribe(() => void this.refreshQuotePreview());
    this.form.get('end_date')?.valueChanges.subscribe(() => void this.refreshQuotePreview());
    this.form.get('start_time')?.valueChanges.subscribe(() => void this.refreshQuotePreview());
    this.form.get('end_time')?.valueChanges.subscribe(() => void this.refreshQuotePreview());
    this.form.get('pickup_point_id')?.valueChanges.subscribe(() => void this.refreshQuotePreview());
    this.form.get('client_id')?.valueChanges.subscribe(() => void this.refreshQuotePreview());
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['/rentals/list']);
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload = {
      ...this.form.getRawValue(),
      status: this.mode === 'create' ? 'pending' : this.form.get('status')?.value,
      subtotal: Number(this.quotePreview?.subtotal || 0),
      total: Number(this.quotePreview?.total || 0),
      currency: this.reservationCurrency(),
      lines: this.editableLines.map((line) => ({
        id: Number(line?.id || 0) || undefined,
        item_id: Number(line?.item_id || 0) || undefined,
        variant_id: Number(line?.variant_id || 0) || undefined,
        quantity: Math.max(1, Number(line?.quantity || 1)),
        period_type: String(line?.period_type || this.form.get('period_type')?.value || 'full_day'),
        start_date: this.dateOnly(line?.start_date || this.form.get('start_date')?.value),
        end_date: this.dateOnly(line?.end_date || this.form.get('end_date')?.value),
        start_time: this.timeOnly(line?.start_time || this.form.get('start_time')?.value, '09:00'),
        end_time: this.timeOnly(line?.end_time || this.form.get('end_time')?.value, '17:00'),
      })),
    };
    const request$ = this.isCreateMode()
      ? this.rentalService.createReservation(payload)
      : this.rentalService.updateReservation(this.reservationId, payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        if (this.isCreateMode()) {
          this.toast('Reserva creada');
          this.goBack();
          return;
        }
        this.toast('Reserva actualizada');
        this.reloadReservation();
      },
      error: () => {
        this.saving = false;
        this.toast(this.isCreateMode() ? 'No se pudo crear la reserva' : 'No se pudo actualizar la reserva');
      }
    });
  }

  isCreateMode(): boolean {
    return this.mode === 'create';
  }

  pageTitle(): string {
    return this.isCreateMode() ? 'Nueva Reserva' : 'Editar Reserva';
  }

  reservationClientName(): string {
    const selectedClient = this.selectedClient();
    const client = selectedClient || this.reservation?.client || {};
    const direct = String(this.reservation?.client_name || '').trim();
    const firstName = String(client?.first_name || '').trim();
    const lastName = String(client?.last_name || '').trim();
    return direct || `${firstName} ${lastName}`.trim() || '—';
  }

  reservationClientEmail(): string {
    const selectedClient = this.selectedClient();
    return String(selectedClient?.email || this.reservation?.client?.email || this.reservation?.email || '').trim() || '—';
  }

  reservationClientPhone(): string {
    const selectedClient = this.selectedClient();
    const client = selectedClient || this.reservation?.client || {};
    return String(client?.phone || client?.mobile || this.reservation?.phone || '').trim() || '—';
  }

  reservationLines(): any[] {
    return this.editableLines;
  }

  linePeriodType(line: any): string {
    return String(line?.period_type || this.form.get('period_type')?.value || 'full_day');
  }

  setLinePeriodType(line: any, type: string): void {
    if (!line) return;
    line.period_type = String(type || 'full_day');
    line.start_date = this.dateOnly(line?.start_date || this.form.get('start_date')?.value);
    line.end_date = this.dateOnly(line?.end_date || this.form.get('end_date')?.value);
    line.start_time = this.timeOnly(line?.start_time || this.form.get('start_time')?.value, '09:00');
    line.end_time = this.timeOnly(line?.end_time || this.form.get('end_time')?.value, '17:00');
    void this.refreshQuotePreview();
  }

  reservationLineLabel(line: any): string {
    const explicitVariantName = String(line?.variant_name || '').trim();
    const explicitItemName = String(line?.item_name || '').trim();
    if (explicitVariantName) return explicitVariantName;
    if (explicitItemName) return explicitItemName;
    return String(line?.name || '').trim() || `#${line?.id || '-'}`;
  }

  reservationLineSize(line: any): string {
    const explicitSize = String(line?.variant_size_label || line?.size_label || '').trim();
    if (explicitSize) return explicitSize;
    return '-';
  }

  reservationLineSubtitle(line: any): string {
    const brand = String(line?.item_brand || '').trim();
    const model = String(line?.item_model || '').trim();
    const sku = String(line?.variant_sku || line?.sku || '').trim();
    const parts = [brand, model, sku].filter((part) => part.length > 0);
    return parts.join(' · ');
  }

  increaseLineQty(line: any): void {
    line.quantity = Math.max(1, Number(line?.quantity || 1) + 1);
    this.rebuildEquipmentGroups();
    void this.refreshQuotePreview();
  }

  decreaseLineQty(line: any): void {
    line.quantity = Math.max(1, Number(line?.quantity || 1) - 1);
    this.rebuildEquipmentGroups();
    void this.refreshQuotePreview();
  }

  removeLine(line: any): void {
    this.editableLines = this.editableLines.filter((row) => row !== line);
    this.rebuildEquipmentGroups();
    void this.refreshQuotePreview();
  }

  quoteLineFor(line: any): any | null {
    const rows = Array.isArray(this.quotePreview?.lines) ? this.quotePreview.lines : [];
    const variantId = Number(line?.variant_id || 0);
    if (variantId <= 0) return null;
    return rows.find((row: any) => Number(row?.variant_id || 0) === variantId) || null;
  }

  quoteLineForVariant(variantId: number): any | null {
    const rows = Array.isArray(this.quotePreview?.lines) ? this.quotePreview.lines : [];
    const id = Number(variantId || 0);
    if (id <= 0) return null;
    return rows.find((row: any) => Number(row?.variant_id || 0) === id) || null;
  }

  quoteSubtotal(): number {
    return Number(this.quotePreview?.subtotal || 0);
  }

  quoteTotal(): number {
    return Number(this.quotePreview?.total || 0);
  }

  selectedVariantsCount(): number {
    return this.editableLines.reduce((sum, line) => {
      return sum + (Number(line?.variant_id || 0) > 0 ? 1 : 0);
    }, 0);
  }

  variantLabel(variant: any): string {
    const name = String(variant?.name || '').trim();
    const itemName = String(variant?.item?.name || '').trim();
    const size = String(variant?.size_label || '').trim();
    const sku = String(variant?.sku || '').trim();
    const head = name || itemName || `#${variant?.id || '-'}`;
    const tail = [size, sku].filter((part) => part.length > 0).join(' · ');
    return tail ? `${head} — ${tail}` : head;
  }

  itemLabel(item: any): string {
    const name = String(item?.name || '').trim();
    const brand = String(item?.brand || '').trim();
    const model = String(item?.model || '').trim();
    const tail = [brand, model].filter((part) => part.length > 0).join(' · ');
    return tail ? `${name} — ${tail}` : name || `#${item?.id || '-'}`;
  }

  filteredVariantsForSelectedItem(): any[] {
    const itemId = Number(this.selectedAddLineItemId || 0);
    if (itemId <= 0) return [];
    const query = this.normalizeSearch(this.autocompleteQuery(this.selectedAddLineVariant));
    return this.variants.filter((variant) => {
      const variantItemId = Number(variant?.item_id || variant?.item?.id || 0);
      if (variantItemId !== itemId) return false;
      if (!query) return true;
      return this.normalizeSearch(this.variantLabel(variant)).includes(query);
    });
  }

  onAddLineItemChange(): void {
    this.newLineVariantId = null;
    this.selectedAddLineVariant = null;
  }

  filteredItemsForAddLine(): any[] {
    const query = this.normalizeSearch(this.autocompleteQuery(this.selectedAddLineItem));
    if (!query) return this.itemsForAddLine;
    return this.itemsForAddLine.filter((item) => this.normalizeSearch(this.itemLabel(item)).includes(query));
  }

  itemDisplay = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return this.itemLabel(value);
  };

  variantDisplay = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return this.variantLabel(value);
  };

  onItemInputChange(value: any): void {
    if (!value || typeof value === 'string') {
      this.selectedAddLineItemId = null;
      this.selectedAddLineVariant = null;
      this.newLineVariantId = null;
      return;
    }
    this.onItemSelected(value);
  }

  onVariantInputChange(value: any): void {
    if (!value || typeof value === 'string') {
      this.newLineVariantId = null;
      return;
    }
    this.onVariantSelected(value);
  }

  onItemSelected(item: any): void {
    const itemId = Number(item?.id || 0);
    this.selectedAddLineItemId = itemId > 0 ? itemId : null;
    this.selectedAddLineItem = itemId > 0 ? item : null;
    this.selectedAddLineVariant = null;
    this.newLineVariantId = null;
  }

  onVariantSelected(variant: any): void {
    const variantId = Number(variant?.id || 0);
    this.newLineVariantId = variantId > 0 ? variantId : null;
    this.selectedAddLineVariant = variantId > 0 ? variant : null;
  }

  addLine(): void {
    const variantId = Number(this.newLineVariantId || 0);
    if (variantId <= 0) {
      this.toast('Selecciona un item para añadir');
      return;
    }

    const quantity = Math.max(1, Number(this.newLineQty || 1));
    const variant = this.variants.find((row) => Number(row?.id || 0) === variantId);
    if (!variant) {
      this.toast('No se encontró el item seleccionado');
      return;
    }

    const existing = this.editableLines.find((line) => Number(line?.variant_id || 0) === variantId);
    if (existing) {
      existing.quantity = Math.max(1, Number(existing?.quantity || 1) + quantity);
    } else {
      this.editableLines = [
        ...this.editableLines,
        {
          id: null,
          item_id: Number(variant?.item_id || variant?.item?.id || 0) || null,
          variant_id: variantId,
          quantity,
          variant_name: String(variant?.name || variant?.item?.name || '').trim() || `#${variantId}`,
          variant_size_label: String(variant?.size_label || '').trim(),
          variant_sku: String(variant?.sku || '').trim(),
          item_name: String(variant?.item?.name || variant?.name || '').trim(),
          item_brand: String(variant?.brand || variant?.item?.brand || '').trim(),
          item_model: String(variant?.model || variant?.item?.model || '').trim(),
          period_type: String(this.form.get('period_type')?.value || 'full_day'),
          start_date: this.dateOnly(this.form.get('start_date')?.value),
          end_date: this.dateOnly(this.form.get('end_date')?.value),
          start_time: this.timeOnly(this.form.get('start_time')?.value, '09:00'),
          end_time: this.timeOnly(this.form.get('end_time')?.value, '17:00'),
        },
      ];
    }

    this.newLineVariantId = null;
    this.newLineQty = 1;
    this.selectedAddLineItem = null;
    this.selectedAddLineVariant = null;
    this.selectedAddLineItemId = null;
    this.rebuildEquipmentGroups();
    void this.refreshQuotePreview();
  }

  setEquipmentCategoryFilter(value: number | 'all'): void {
    const normalized = value === 'all' ? 'all' : Number(value || 0);
    this.equipmentCategoryFilter = normalized === 'all' || normalized > 0 ? (normalized as any) : 'all';
    this.rebuildEquipmentGroups();
  }

  isEquipmentCategorySelected(categoryId: any): boolean {
    if (this.equipmentCategoryFilter === 'all') return false;
    return Number(this.equipmentCategoryFilter) === Number(categoryId || 0);
  }

  onEquipmentSearchChange(value: string): void {
    this.equipmentSearch = String(value || '');
    this.rebuildEquipmentGroups();
  }

  toggleEquipmentGroup(groupId: number): void {
    if (!groupId) return;
    if (this.expandedEquipmentGroupIds.includes(groupId)) {
      this.expandedEquipmentGroupIds = this.expandedEquipmentGroupIds.filter((id) => id !== groupId);
      return;
    }
    this.expandedEquipmentGroupIds = [...this.expandedEquipmentGroupIds, groupId];
  }

  isEquipmentGroupExpanded(groupId: number): boolean {
    return this.expandedEquipmentGroupIds.includes(groupId);
  }

  setGroupVariantSearch(groupId: number, value: string): void {
    this.groupVariantSearch[groupId] = String(value || '');
  }

  filteredGroupVariants(group: any): any[] {
    const rows = Array.isArray(group?.variants) ? group.variants : [];
    const query = this.normalizeSearch(this.groupVariantSearch[Number(group?.id || 0)] || '');
    if (!query) return rows;
    return rows.filter((variant) => {
      const haystack = [
        variant?.name,
        variant?.size_label,
        variant?.sku,
        variant?.item_name,
        variant?.item_brand,
        variant?.item_model
      ]
        .map((value) => this.normalizeSearch(value))
        .join(' ');
      return haystack.includes(query);
    });
  }

  private buildEquipmentGroups(): any[] {
    const rows = this.variantsWithItemMeta().filter((variant) => {
      if (this.equipmentCategoryFilter !== 'all' && Number(variant?.category_id || 0) !== Number(this.equipmentCategoryFilter)) {
        return false;
      }

      const query = this.normalizeSearch(this.equipmentSearch);
      if (!query) return true;
      const haystack = [
        variant?.item_name,
        variant?.item_brand,
        variant?.item_model,
        variant?.name,
        variant?.size_label,
        variant?.sku
      ]
        .map((value) => this.normalizeSearch(value))
        .join(' ');
      return haystack.includes(query);
    });

    const groupsByItem = new Map<number, any>();
    rows.forEach((row) => {
      const itemId = Number(row?.item_id || row?.item?.id || 0);
      if (itemId <= 0) return;
      if (!groupsByItem.has(itemId)) {
        groupsByItem.set(itemId, {
          id: itemId,
          item: {
            id: itemId,
            name: String(row?.item_name || row?.item?.name || '').trim(),
            brand: String(row?.item_brand || row?.item?.brand || '').trim(),
            model: String(row?.item_model || row?.item?.model || '').trim(),
            description: String(row?.item?.description || '').trim(),
          },
          variants: [],
        });
      }
      groupsByItem.get(itemId).variants.push(row);
    });

    return Array.from(groupsByItem.values()).map((group) => ({
      ...group,
      selectedQty: group.variants.reduce((sum: number, row: any) => sum + this.selectedQtyForVariant(Number(row?.id || 0)), 0),
      selectedCount: group.variants.reduce((sum: number, row: any) => sum + (this.selectedQtyForVariant(Number(row?.id || 0)) > 0 ? 1 : 0), 0),
      totalAvailable: group.variants.reduce((sum: number, row: any) => sum + this.variantAvailableQty(row), 0),
    }));
  }

  private rebuildEquipmentGroups(): void {
    this.equipmentGroupsView = this.buildEquipmentGroups();
  }

  private rebuildUnitStockMaps(): void {
    this.availableByVariant = new Map<number, number>();
    this.totalByVariant = new Map<number, number>();
    this.units.forEach((unit) => {
      const variantId = Number(unit?.variant_id || 0);
      if (variantId <= 0) return;
      this.totalByVariant.set(variantId, (this.totalByVariant.get(variantId) || 0) + 1);
      if (String(unit?.status || '').toLowerCase() === 'available') {
        this.availableByVariant.set(variantId, (this.availableByVariant.get(variantId) || 0) + 1);
      }
    });
  }

  variantsWithItemMeta(): any[] {
    return this.variants.map((variant) => {
      const itemId = Number(variant?.item_id || variant?.item?.id || 0);
      const catalogItem = this.itemsCatalogById.get(itemId) || null;
      return {
        ...variant,
        item_id: itemId,
        item_name: String(variant?.item?.name || catalogItem?.name || variant?.item_name || '').trim(),
        item_brand: String(variant?.item?.brand || catalogItem?.brand || variant?.brand || '').trim(),
        item_model: String(variant?.item?.model || catalogItem?.model || variant?.model || '').trim(),
        category_id: Number(
          variant?.item?.category_id
          || variant?.item?.category?.id
          || (catalogItem as any)?.category_id
          || this.subcategoryCategoryById.get(Number(variant?.subcategory_id || 0))
          || variant?.category_id
          || 0
        ) || null,
      };
    });
  }

  variantCardTitle(variant: any): string {
    const size = String(variant?.size_label || '').trim();
    const name = String(variant?.name || '').trim();
    if (size && name) return `${size} • ${name}`;
    return size || name || `#${variant?.id || '-'}`;
  }

  variantSubTitle(variant: any): string {
    const sku = String(variant?.sku || '').trim();
    return sku || '-';
  }

  variantAvailableQty(variant: any): number {
    const variantId = Number(variant?.id || 0);
    const fromUnits = this.availableByVariant.get(variantId);
    if (typeof fromUnits === 'number') return Math.max(0, fromUnits);
    const direct = Number(
      variant?.available_qty
      ?? variant?.available
      ?? variant?.qty_available
      ?? variant?.available_units
      ?? variant?.available_stock
      ?? variant?.stock_available
      ?? variant?.in_stock
      ?? -1
    );
    if (direct >= 0) return direct;
    return Number(variant?.quantity ?? variant?.total_quantity ?? variant?.total_units ?? variant?.stock_total ?? 0);
  }

  variantTotalQty(variant: any): number {
    const variantId = Number(variant?.id || 0);
    const fromUnits = this.totalByVariant.get(variantId);
    if (typeof fromUnits === 'number') return Math.max(0, fromUnits);
    const total = Number(
      variant?.total_qty
      ?? variant?.total
      ?? variant?.quantity
      ?? variant?.total_quantity
      ?? variant?.total_units
      ?? variant?.stock_total
      ?? 0
    );
    return total > 0 ? total : this.variantAvailableQty(variant);
  }

  groupPrimaryPrice(group: any): string {
    const first = Array.isArray(group?.variants) ? group.variants[0] : null;
    if (!first) return `- ${this.reservationCurrency()}/día`;
    const byVariant = this.pricingRules.find((rule) => Number(rule?.variant_id || 0) === Number(first?.id || 0) && String(rule?.period_type || '') === 'full_day');
    const byItem = this.pricingRules.find((rule) => Number(rule?.item_id || 0) === Number(first?.item_id || 0) && String(rule?.period_type || '') === 'full_day');
    const unit = Number(
      byVariant?.price ??
      byItem?.price ??
      first?.full_day_price ??
      first?.price_per_day ??
      first?.day_price ??
      first?.price ??
      0
    );
    if (unit <= 0) return `- ${this.reservationCurrency()}/día`;
    return `${unit.toFixed(0)} ${this.reservationCurrency()}/día`;
  }

  categoryEmoji(name: string): string {
    const value = String(name || '').toLowerCase();
    if (value.includes('ski')) return '⛷️';
    if (value.includes('snow')) return '🏂';
    if (value.includes('boot')) return '🥾';
    if (value.includes('access')) return '🎿';
    return '📦';
  }

  selectedQtyForVariant(variantId: number): number {
    if (!variantId) return 0;
    const line = this.editableLines.find((row) => Number(row?.variant_id || 0) === Number(variantId));
    return Math.max(0, Number(line?.quantity || 0));
  }

  selectedProductsCount(): number {
    const unique = new Set<number>();
    this.editableLines.forEach((line) => {
      const itemId = Number(line?.item_id || 0);
      if (itemId > 0) unique.add(itemId);
    });
    return unique.size;
  }

  addVariantSelection(variant: any): void {
    const variantId = Number(variant?.id || 0);
    if (variantId <= 0) return;
    if (!this.canAddVariantSelection(variant)) return;
    const existing = this.editableLines.find((line) => Number(line?.variant_id || 0) === variantId);
    if (existing) {
      existing.quantity = Math.max(1, Number(existing?.quantity || 1) + 1);
      this.rebuildEquipmentGroups();
      void this.refreshQuotePreview();
      return;
    }

    this.editableLines = [
      ...this.editableLines,
      {
        id: null,
        item_id: Number(variant?.item_id || variant?.item?.id || 0) || null,
        variant_id: variantId,
        quantity: 1,
        variant_name: String(variant?.name || variant?.item?.name || '').trim() || `#${variantId}`,
        variant_size_label: String(variant?.size_label || '').trim(),
        variant_sku: String(variant?.sku || '').trim(),
        item_name: String(variant?.item_name || variant?.item?.name || variant?.name || '').trim(),
        item_brand: String(variant?.item_brand || variant?.brand || variant?.item?.brand || '').trim(),
        item_model: String(variant?.item_model || variant?.model || variant?.item?.model || '').trim(),
        period_type: String(this.form.get('period_type')?.value || 'full_day'),
        start_date: this.dateOnly(this.form.get('start_date')?.value),
        end_date: this.dateOnly(this.form.get('end_date')?.value),
        start_time: this.timeOnly(this.form.get('start_time')?.value, '09:00'),
        end_time: this.timeOnly(this.form.get('end_time')?.value, '17:00'),
      },
    ];
    this.rebuildEquipmentGroups();
    void this.refreshQuotePreview();
  }

  removeVariantSelection(variant: any): void {
    const variantId = Number(variant?.id || 0);
    if (variantId <= 0) return;
    const existing = this.editableLines.find((line) => Number(line?.variant_id || 0) === variantId);
    if (!existing) return;
    const nextQty = Math.max(0, Number(existing?.quantity || 0) - 1);
    if (nextQty <= 0) {
      this.editableLines = this.editableLines.filter((line) => Number(line?.variant_id || 0) !== variantId);
    } else {
      existing.quantity = nextQty;
    }
    this.rebuildEquipmentGroups();
    void this.refreshQuotePreview();
  }

  canAddVariantSelection(variant: any): boolean {
    const available = Math.max(0, this.variantAvailableQty(variant));
    const selected = this.selectedQtyForVariant(Number(variant?.id || 0));
    return selected < available;
  }

  paidAmount(): number {
    return Number(
      this.financialReconciliation?.paid_total
      ?? this.paymentInfo?.payment?.amount
      ?? this.reservation?.amount_paid
      ?? this.reservation?.paid_total
      ?? 0
    );
  }

  totalAmount(): number {
    if (this.quotePreview && Number(this.quotePreview?.total || 0) >= 0) {
      return Number(this.quotePreview?.total || 0);
    }
    return Number(
      this.financialReconciliation?.new_total
      ?? this.reservation?.total_price
      ?? this.reservation?.total
      ?? 0
    );
  }

  depositAmount(): number {
    return Number(this.paymentInfo?.deposit_amount ?? this.reservation?.deposit_amount ?? this.reservation?.deposit ?? 0);
  }

  paymentStatusLabel(): string {
    if (this.reconciliationActionRequired() === 'resolve_overpayment') {
      return 'Saldo a favor';
    }
    if (this.reconciliationActionRequired() === 'collect_additional_payment') {
      return 'Pago Pendiente';
    }
    return this.paidAmount() >= this.totalAmount() ? 'Pagado Completamente' : 'Pago Pendiente';
  }

  paymentStatusHint(): string {
    if (this.reconciliationActionRequired() === 'resolve_overpayment') {
      return `Hay ${this.overpaidAmount().toFixed(2)} ${this.reservationCurrency()} a devolver o dejar como crédito`;
    }
    if (this.reconciliationActionRequired() === 'collect_additional_payment') {
      return `Faltan ${this.balanceDue().toFixed(2)} ${this.reservationCurrency()} por cobrar`;
    }
    return this.paidAmount() >= this.totalAmount() ? 'No hay pagos pendientes' : 'Falta saldo por pagar';
  }

  balanceDue(): number {
    if (this.useLiveFinancialPreview()) {
      return Number(Math.max(0, this.totalAmount() - this.paidAmount()));
    }
    const backendValue = Number(this.financialReconciliation?.balance_due ?? NaN);
    if (!Number.isNaN(backendValue)) return Number(Math.max(0, backendValue));
    return Number(Math.max(0, this.totalAmount() - this.paidAmount()));
  }

  overpaidAmount(): number {
    if (this.useLiveFinancialPreview()) {
      return Number(Math.max(0, this.paidAmount() - this.totalAmount()));
    }
    const backendValue = Number(this.financialReconciliation?.overpaid_amount ?? NaN);
    if (!Number.isNaN(backendValue)) return Number(Math.max(0, backendValue));
    return Number(Math.max(0, this.paidAmount() - this.totalAmount()));
  }

  reconciliationActionRequired(): string {
    if (!this.useLiveFinancialPreview()) {
      const backendAction = String(this.financialReconciliation?.action_required || '').trim();
      if (backendAction) return backendAction;
    }
    if (this.overpaidAmount() > 0) return 'resolve_overpayment';
    if (this.balanceDue() > 0) return 'collect_additional_payment';
    return 'none';
  }

  canCollectAdditionalPayment(): boolean {
    return this.reconciliationActionRequired() === 'collect_additional_payment' && this.balanceDue() > 0;
  }

  canResolveOverpayment(): boolean {
    return this.reconciliationActionRequired() === 'resolve_overpayment' && this.overpaidAmount() > 0;
  }

  canKeepCredit(): boolean {
    if (!this.canResolveOverpayment()) return false;
    const allowed = this.allowedReconciliationActions();
    if (!allowed.length) return true;
    return allowed.includes('keep_credit');
  }

  reconciliationDeltaTotal(): number {
    if (!this.useLiveFinancialPreview()) {
      const backendDelta = Number(this.financialReconciliation?.delta_total ?? NaN);
      if (!Number.isNaN(backendDelta)) return backendDelta;
    }
    return Number(this.totalAmount() - this.reconciliationBaseTotal());
  }

  processRefund(): void {
    if (!this.reservation?.id || !this.canResolveOverpayment()) return;
    if (!confirm(`Se registrará reembolso para resolver ${this.overpaidAmount().toFixed(2)} ${this.reservationCurrency()}. ¿Continuar?`)) {
      return;
    }

    this.rentalService.refundPayment(this.reservation.id).subscribe({
      next: () => {
        this.toast('Reembolso procesado');
        this.loadPaymentInfo();
        this.reloadReservation();
      },
      error: (error) => {
        this.toast(error?.error?.message || 'No se pudo procesar el reembolso');
      }
    });
  }

  processKeepCredit(): void {
    if (!this.reservation?.id || !this.canKeepCredit()) return;
    const amount = this.overpaidAmount();
    if (amount <= 0) return;
    if (!confirm(`Se generará un crédito (voucher) de ${amount.toFixed(2)} ${this.reservationCurrency()} para resolver el saldo a favor. ¿Continuar?`)) {
      return;
    }

    this.rentalService.refundPayment(this.reservation.id, {
      amount,
      refund_method: 'voucher',
      voucher_name: `Crédito alquiler ${this.reservation.reference || ('#' + this.reservation.id)}`,
      notes: 'Crédito generado desde conciliación de edición de reserva',
    }).subscribe({
      next: () => {
        this.toast('Crédito generado correctamente');
        this.loadPaymentInfo();
        this.reloadReservation();
      },
      error: (error) => {
        this.toast(error?.error?.message || 'No se pudo generar el crédito');
      }
    });
  }

  paymentHistoryEntries(): Array<{ icon: string; title: string; subtitle: string; amount: number; tone: 'green' | 'blue' | 'gray' }> {
    const entries: Array<{ icon: string; title: string; subtitle: string; amount: number; tone: 'green' | 'blue' | 'gray' }> = [];
    const payment = this.paymentInfo?.payment;
    const depositPayment = this.paymentInfo?.deposit_payment;
    const currency = this.reservationCurrency();

    if (payment) {
      entries.push({
        icon: 'check_circle',
        title: 'Pago Recibido',
        subtitle: this.paymentSubtitle(payment, currency),
        amount: Number(payment?.amount || 0),
        tone: 'green',
      });
    }

    if (depositPayment) {
      const depositStatus = String(this.paymentInfo?.deposit_status || '').toLowerCase();
      entries.push({
        icon: depositStatus === 'released' ? 'task_alt' : 'savings',
        title: depositStatus === 'released' ? 'Depósito Devuelto' : 'Depósito Retenido',
        subtitle: this.paymentSubtitle(depositPayment, currency),
        amount: Number(depositPayment?.amount || 0),
        tone: 'blue',
      });
    }

    const refunds = Array.isArray(this.paymentInfo?.refunds) ? this.paymentInfo.refunds : [];
    refunds.forEach((refund: any) => {
      entries.push({
        icon: 'reply',
        title: `Devolución (${String(refund?.payment_method || 'manual').toUpperCase()})`,
        subtitle: this.paymentSubtitle(refund, currency),
        amount: Number(refund?.amount || 0),
        tone: 'gray',
      });
    });

    return entries;
  }

  openPaymentDialog(): void {
    if (!this.reservation?.id) return;
    const dialogRef = this.dialog.open(RentalsPaymentDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      data: { reservation: this.reservation, liveTotal: this.totalAmount(), tab: 'manual' },
      panelClass: 'rental-payment-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action) {
        this.loadPaymentInfo();
        this.reloadReservation();
      }
    });
  }

  statusOptions(): string[] {
    return ['pending', 'active', 'completed', 'overdue', 'cancelled'];
  }

  setStatus(status: string): void {
    this.form.patchValue({ status });
  }

  
  setPeriodType(type: string): void {
    this.form.patchValue({ period_type: type });
    this.applyPeriodPreset(type);
  }

  isPeriodTypeSelected(type: string): boolean {
    return String(this.form?.value?.period_type || '') === String(type || '');
  }

  getPeriodTypeLabel(): string {
    const type = String(this.form.get('period_type')?.value || '');
    switch (type) {
      case 'season': return 'Temporada (~4 meses)';
      case 'half_day': return 'Medio Día';
      case 'full_day': return 'Día Completo';
      case 'multi_day': return 'Varios Días';
      case 'week': return 'Semana';
      default: return '-';
    }
  }

  durationBadgeClass(): Record<string, boolean> {
    const type = String(this.form.get('period_type')?.value || '');
    return {
      'duration-badge--purple': type === 'half_day' || type === 'full_day',
      'duration-badge--green': type !== 'half_day' && type !== 'full_day',
    };
  }

  onStartDateChange(): void {
    const type = String(this.form.get('period_type')?.value || 'full_day');
    this.applyPeriodPreset(type);
  }

  calculateDurationDays(): number {
    const start = this.dateToDateObject(this.form.get('start_date')?.value);
    const end = this.dateToDateObject(this.form.get('end_date')?.value);
    if (!start || !end) return 0;
    const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(0, diff);
  }

  private applyPeriodPreset(type: string): void {
    let startText = String(this.form.get('start_date')?.value || '').trim();
    if (!startText) {
      startText = this.dateOnly(new Date());
      this.form.patchValue({ start_date: startText });
    }
    const date = this.dateToDateObject(startText);
    if (!date) return;
    const end = new Date(date);

    if (type === 'half_day') {
      this.form.patchValue({ end_date: startText, start_time: '09:00', end_time: '13:00' });
      return;
    }

    if (type === 'full_day') {
      this.form.patchValue({ end_date: startText, start_time: '09:00', end_time: '17:00' });
      return;
    }

    if (type === 'multi_day') {
      end.setDate(end.getDate() + 2);
      this.form.patchValue({ end_date: this.dateOnly(end), start_time: '09:00', end_time: '17:00' });
      return;
    }

    if (type === 'week') {
      end.setDate(end.getDate() + 6);
      this.form.patchValue({ end_date: this.dateOnly(end), start_time: '09:00', end_time: '17:00' });
      return;
    }

    if (type === 'season') {
      end.setDate(end.getDate() + 119);
      this.form.patchValue({ end_date: this.dateOnly(end), start_time: '09:00', end_time: '17:00' });
    }
  }

  private loadData(): void {
    this.loading = true;
    this.rentalService.listCategories({ per_page: 200 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        this.categories = Array.isArray(list) ? list : [];
      },
      error: () => {
        this.categories = [];
      }
    });
    this.rentalService.listSubcategories({ per_page: 600 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        this.subcategories = Array.isArray(list) ? list : [];
        this.subcategoryCategoryById = new Map<number, number>();
        this.subcategories.forEach((subcategory) => {
          const subcategoryId = Number(subcategory?.id || 0);
          const categoryId = Number(subcategory?.category_id || subcategory?.category?.id || 0);
          if (subcategoryId > 0 && categoryId > 0) {
            this.subcategoryCategoryById.set(subcategoryId, categoryId);
          }
        });
        this.rebuildEquipmentGroups();
      },
      error: () => {
        this.subcategories = [];
        this.subcategoryCategoryById = new Map<number, number>();
        this.rebuildEquipmentGroups();
      }
    });
    this.rentalService.listPickupPoints({ page_size: 200 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        this.pickupPoints = Array.isArray(list) ? list : [];
        this.refreshQuotePreviewIfCreate();
      },
      error: () => {
        this.pickupPoints = [];
      }
    });

    this.rentalService.listClients({ per_page: 300 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        this.clients = Array.isArray(list) ? list : [];
        this.refreshQuotePreviewIfCreate();
      },
      error: () => {
        this.clients = [];
      }
    });

    this.rentalService.listVariants({ per_page: 500 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        this.variants = Array.isArray(list) ? list : [];
        this.rebuildItemsForAddLine();
        // UX decision: start fully collapsed, user expands only what they need.
        this.expandedEquipmentGroupIds = [];
        this.rebuildEquipmentGroups();
        this.refreshQuotePreviewIfCreate();
      },
      error: () => {
        this.variants = [];
        this.rebuildItemsForAddLine();
        this.rebuildEquipmentGroups();
        this.refreshQuotePreviewIfCreate();
      }
    });

    this.rentalService.listPricingRules({ per_page: 1000 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        this.pricingRules = Array.isArray(list) ? list : [];
        this.rebuildEquipmentGroups();
      },
      error: () => {
        this.pricingRules = [];
        this.rebuildEquipmentGroups();
      }
    });

    this.rentalService.listUnits({ per_page: 4000 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        this.units = Array.isArray(list) ? list : [];
        this.rebuildUnitStockMaps();
        this.rebuildEquipmentGroups();
      },
      error: () => {
        this.units = [];
        this.rebuildUnitStockMaps();
        this.rebuildEquipmentGroups();
      }
    });

    this.rentalService.listItems({ per_page: 500 }).subscribe({
      next: (resp: any) => {
        const list = resp?.data?.data ?? resp?.data ?? [];
        const rows = Array.isArray(list) ? list : [];
        this.itemsCatalogById = new Map<number, any>();
        rows.forEach((item) => {
          const id = Number(item?.id || 0);
          if (id <= 0) return;
          this.itemsCatalogById.set(id, {
            id,
            name: String(item?.name || '').trim(),
            brand: String(item?.brand || '').trim(),
            model: String(item?.model || '').trim(),
            category_id: Number(item?.category_id || item?.category?.id || 0) || null,
          });
        });
        this.rebuildItemsForAddLine();
        this.rebuildEquipmentGroups();
        this.refreshQuotePreviewIfCreate();
      },
      error: () => {
        this.itemsCatalogById = new Map<number, any>();
        this.rebuildItemsForAddLine();
        this.rebuildEquipmentGroups();
        this.refreshQuotePreviewIfCreate();
      }
    });

    if (this.isCreateMode()) {
      this.loading = false;
      this.form.patchValue({
        status: 'pending',
        period_type: 'full_day',
      });
      this.applyPeriodPreset('full_day');
      this.editableLines = [];
      this.rebuildEquipmentGroups();
      void this.refreshQuotePreview();
      return;
    }

    this.rentalService.getReservation(this.reservationId).subscribe({
      next: (resp: any) => {
        const payload = resp?.data?.data ?? resp?.data ?? resp ?? null;
        this.reservation = payload;
        this.financialReconciliation = payload?.financial_reconciliation || null;
        this.editableLines = this.normalizeLines(
          Array.isArray(payload?.lines)
            ? payload.lines
            : (Array.isArray(payload?.lines_preview) ? payload.lines_preview : [])
        );
        this.rebuildEquipmentGroups();
        this.form.patchValue({
          client_id: payload?.client_id ?? payload?.client?.id ?? null,
          pickup_point_id: payload?.pickup_point_id ?? null,
          start_date: this.dateOnly(payload?.start_date),
          end_date: this.dateOnly(payload?.end_date),
          start_time: this.timeOnly(payload?.start_time, '09:00'),
          end_time: this.timeOnly(payload?.end_time, '17:00'),
          status: String(payload?.status || 'pending').toLowerCase(),
          period_type: this.normalizePeriodType(payload?.period_type, payload?.start_date, payload?.end_date),
          notes: String(payload?.notes || '')
        });
        this.loading = false;
        this.loadPaymentInfo();
        void this.refreshQuotePreview();
      },
      error: () => {
        this.loading = false;
        this.toast('No se pudo cargar la reserva');
        this.goBack();
      }
    });
  }

  private loadPaymentInfo(): void {
    this.loadingPayment = true;
    this.rentalService.getPaymentInfo(this.reservationId).subscribe({
      next: (res: any) => {
        this.paymentInfo = res?.data ?? null;
        this.loadingPayment = false;
      },
      error: () => {
        this.paymentInfo = null;
        this.loadingPayment = false;
      }
    });
  }

  private reloadReservation(): void {
    this.rentalService.getReservation(this.reservationId).subscribe({
      next: (resp: any) => {
        const payload = resp?.data?.data ?? resp?.data ?? resp ?? null;
        this.reservation = payload;
        this.financialReconciliation = payload?.financial_reconciliation || null;
        this.editableLines = this.normalizeLines(
          Array.isArray(payload?.lines)
            ? payload.lines
            : (Array.isArray(payload?.lines_preview) ? payload.lines_preview : [])
        );
        this.rebuildEquipmentGroups();
        void this.refreshQuotePreview();
        this.loadPaymentInfo();
      },
      error: () => {}
    });
  }

  private useLiveFinancialPreview(): boolean {
    if (this.isCreateMode()) return true;
    if (!this.quotePreview) return false;
    return Math.abs(this.totalAmount() - this.reconciliationBaseTotal()) > 0.009;
  }

  private reconciliationBaseTotal(): number {
    const backendTotal = Number(this.financialReconciliation?.new_total ?? NaN);
    if (!Number.isNaN(backendTotal)) return backendTotal;
    return Number(this.reservation?.total_price ?? this.reservation?.total ?? 0);
  }

  private allowedReconciliationActions(): string[] {
    const raw = Array.isArray(this.financialReconciliation?.allowed_actions)
      ? this.financialReconciliation.allowed_actions
      : [];
    return raw
      .map((entry: any) => String(entry || '').toLowerCase().trim())
      .filter((entry: string) => entry.length > 0);
  }

  private dateOnly(value: any): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return '';
    return this.dateOnly(parsed);
  }

  private timeOnly(value: any, fallback: string): string {
    const text = String(value || '').trim();
    if (!text) return fallback;
    return text.slice(0, 5);
  }

  private toast(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 2800 });
  }

  private normalizeLines(lines: any[]): any[] {
    return (Array.isArray(lines) ? lines : [])
      .map((line) => ({
        ...line,
        id: Number(line?.id || 0) || null,
        item_id: Number(line?.item_id || 0) || null,
        variant_id: Number(line?.variant_id || 0) || null,
        quantity: Math.max(1, Number(line?.quantity || line?.qty || 1)),
      }))
      .filter((line) => Number(line?.variant_id || 0) > 0 || Number(line?.item_id || 0) > 0);
  }

  private selectedClient(): any | null {
    const selectedId = Number(this.form?.value?.client_id || 0);
    if (!selectedId) return null;
    return this.clients.find((client) => Number(client?.id || 0) === selectedId) || null;
  }

  isStatusSelected(status: string): boolean {
    return String(this.form?.value?.status || '').toLowerCase() === String(status || '').toLowerCase();
  }

  private dateToDateObject(value: any): Date | null {
    const text = this.dateOnly(value);
    if (!text) return null;
    const [year, month, day] = text.split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private normalizePeriodType(periodType: any, startDate: any, endDate: any): string {
    const raw = String(periodType || '').trim().toLowerCase();
    const allowed = new Set(this.periodTypeOptions.map((option) => option.value));
    if (allowed.has(raw)) return raw;

    const start = this.dateToDateObject(startDate);
    const end = this.dateToDateObject(endDate);
    if (!start || !end) return 'full_day';
    const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
    if (days <= 1) return 'full_day';
    if (days === 7) return 'week';
    if (days >= 100) return 'season';
    return 'multi_day';
  }

  reservationCurrency(): string {
    return String(this.reservation?.currency || this.reservation?.price_currency || 'CHF').trim() || 'CHF';
  }

  private paymentSubtitle(payment: any, currency: string): string {
    const created = String(payment?.created_at || '').trim();
    const method = String(payment?.payment_method || '').trim();
    const status = String(payment?.status || '').trim();
    const parts = [method, status].filter((part) => part.length > 0);
    const right = parts.join(' · ');
    if (created && right) return `${created} · ${right}`;
    if (created) return created;
    if (right) return right;
    return currency;
  }

  private buildItemsForAddLine(variants: any[]): any[] {
    const byId = new Map<number, any>();
    (Array.isArray(variants) ? variants : []).forEach((variant) => {
      const item = variant?.item || {};
      const itemId = Number(variant?.item_id || item?.id || 0);
      if (itemId <= 0 || byId.has(itemId)) return;
      byId.set(itemId, {
        id: itemId,
        name: String(item?.name || variant?.item_name || '').trim() || `#${itemId}`,
        brand: String(item?.brand || variant?.brand || '').trim(),
        model: String(item?.model || variant?.model || '').trim(),
      });
    });
    return Array.from(byId.values()).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));
  }

  private rebuildItemsForAddLine(): void {
    const fromCatalog = Array.from(this.itemsCatalogById.values())
      .filter((item) => Number(item?.id || 0) > 0 && String(item?.name || '').trim().length > 0)
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }));

    if (fromCatalog.length > 0) {
      this.itemsForAddLine = fromCatalog;
      return;
    }

    this.itemsForAddLine = this.buildItemsForAddLine(this.variants);
  }

  private refreshQuotePreviewIfCreate(): void {
    if (!this.isCreateMode()) return;
    void this.refreshQuotePreview();
  }

  async refreshQuotePreview(): Promise<void> {
    const schoolLineItems = this.editableLines
      .map((line) => {
        const variantId = Number(line?.variant_id || 0);
        if (variantId <= 0) return null;
        return {
          item_id: Number(line?.item_id || 0) || undefined,
          variant_id: variantId,
          quantity: Math.max(1, Number(line?.quantity || 1)),
          period_type: String(line?.period_type || this.form.get('period_type')?.value || 'full_day'),
          start_date: this.dateOnly(line?.start_date || this.form.get('start_date')?.value),
          end_date: this.dateOnly(line?.end_date || this.form.get('end_date')?.value),
          start_time: this.timeOnly(line?.start_time || this.form.get('start_time')?.value, '09:00'),
          end_time: this.timeOnly(line?.end_time || this.form.get('end_time')?.value, '17:00'),
        };
      })
      .filter((line) => !!line);

    if (!schoolLineItems.length) {
      this.quotePreview = null;
      return;
    }

    const payload = {
      pickup_point_id: Number(this.form.get('pickup_point_id')?.value || 0) || undefined,
      client_id: Number(this.form.get('client_id')?.value || 0) || undefined,
      period_type: String(this.form.get('period_type')?.value || 'full_day'),
      start_date: this.dateOnly(this.form.get('start_date')?.value),
      end_date: this.dateOnly(this.form.get('end_date')?.value),
      start_time: this.timeOnly(this.form.get('start_time')?.value, '09:00'),
      end_time: this.timeOnly(this.form.get('end_time')?.value, '17:00'),
      lines: schoolLineItems,
    };

    const requestId = ++this.quoteRequestId;
    this.quoteLoading = true;
    this.rentalService.quoteReservation(payload).subscribe({
      next: (response: any) => {
        if (requestId !== this.quoteRequestId) return;
        this.quotePreview = response?.data?.data ?? response?.data ?? null;
        this.quoteLoading = false;
      },
      error: () => {
        if (requestId !== this.quoteRequestId) return;
        // keep last successful quote to avoid flicker while backend/network recovers
        this.quoteLoading = false;
      }
    });
  }

  private normalizeSearch(value: any): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private autocompleteQuery(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return this.itemLabel(value) || this.variantLabel(value) || '';
  }
}
