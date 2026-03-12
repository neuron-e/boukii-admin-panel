import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiCrudService } from './crud.service';
import { ApiResponse } from 'src/app/interface/api-response';

@Injectable({
  providedIn: 'root'
})
export class RentalService {
  private readonly policySubject = new BehaviorSubject<any | null>(null);

  constructor(private crudService: ApiCrudService) {}

  private getSchoolId(): number | null {
    const userRaw = localStorage.getItem('boukiiUser');
    if (!userRaw) return null;
    try {
      const user = JSON.parse(userRaw);
      const idFromCurrent = Number(user?.school?.id || user?.school_id || 0);
      if (idFromCurrent > 0) return idFromCurrent;
      const idFromList = Number(user?.schools?.[0]?.id || 0);
      return idFromList > 0 ? idFromList : null;
    } catch {
      return null;
    }
  }

  private withSchool(filters: Record<string, any> = {}): Record<string, any> {
    const schoolId = this.getSchoolId();
    return schoolId ? { ...filters, school_id: schoolId } : { ...filters };
  }

  // Catalog
  listCategories(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/categories', [], this.withSchool(filters));
  }

  createCategory(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/categories', this.withSchool(payload));
  }

  updateCategory(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/categories', payload, id);
  }

  deleteCategory(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/categories', id);
  }

  listSubcategories(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/subcategories', [], this.withSchool(filters));
  }

  createSubcategory(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/subcategories', this.withSchool(payload));
  }

  updateSubcategory(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/subcategories', payload, id);
  }

  deleteSubcategory(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/subcategories', id);
  }

  listItems(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/items', [], this.withSchool(filters));
  }

  listTags(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/tags', [], this.withSchool(filters));
  }

  createTag(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/tags', this.withSchool(payload));
  }

  createItem(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/items', this.withSchool(payload));
  }

  updateItem(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/items', payload, id);
  }

  syncItemTags(id: number, tags: any[]): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/items', this.withSchool({ tags }), `${id}/tags`);
  }

  deleteItem(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/items', id);
  }

  // Variants / Units / Stock
  listVariants(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/variants', [], this.withSchool(filters));
  }

  createVariant(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/variants', this.withSchool(payload));
  }

  updateVariant(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/variants', payload, id);
  }

  deleteVariant(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/variants', id);
  }

  listWarehouses(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/warehouses', [], this.withSchool(filters));
  }

  createWarehouse(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/warehouses', this.withSchool(payload));
  }

  updateWarehouse(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/warehouses', payload, id);
  }

  deleteWarehouse(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/warehouses', id);
  }

  listPickupPoints(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/pickup-points', [], this.withSchool(filters));
  }

  createPickupPoint(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/pickup-points', this.withSchool(payload));
  }

  updatePickupPoint(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/pickup-points', payload, id);
  }

  deletePickupPoint(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/pickup-points', id);
  }

  listUnits(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/units', [], this.withSchool(filters));
  }

  createUnit(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/units', this.withSchool(payload));
  }

  updateUnit(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/units', payload, id);
  }

  setUnitMaintenance(id: number, reason: string, condition?: string): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/units/${id}/maintenance`, this.withSchool({ reason, condition }));
  }

  releaseUnitMaintenance(id: number, reason: string, condition?: string): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/units/${id}/maintenance/release`, this.withSchool({ reason, condition }));
  }

  getUnitMaintenanceHistory(id: number): Observable<ApiResponse> {
    return this.crudService.get(`/admin/rentals/units/${id}/maintenance-history`, [], this.withSchool());
  }

  listStockMovements(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/stock-movements', [], this.withSchool(filters));
  }

  deleteUnit(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/units', id);
  }

  // Pricing & policy
  listPricingRules(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/pricing-rules', [], this.withSchool(filters));
  }

  createPricingRule(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/pricing-rules', this.withSchool(payload));
  }

  updatePricingRule(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/pricing-rules', payload, id);
  }

  deletePricingRule(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/pricing-rules', id);
  }

  listVariantServices(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/variant-services', [], this.withSchool(filters));
  }

  createVariantService(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/variant-services', this.withSchool(payload));
  }

  updateVariantService(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/variant-services', payload, id);
  }

  deleteVariantService(id: number): Observable<ApiResponse> {
    return this.crudService.delete('/admin/rentals/variant-services', id);
  }

  getPolicy(): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/policy', [], this.withSchool());
  }

  watchPolicy(): Observable<any | null> {
    return this.policySubject.asObservable();
  }

  refreshPolicy(): Observable<ApiResponse> {
    return this.getPolicy().pipe(
      tap((response: any) => this.policySubject.next(this.extractPolicy(response)))
    );
  }

  updatePolicy(payload: any): Observable<ApiResponse> {
    return this.crudService.post('/admin/rentals/policy', this.withSchool(payload)).pipe(
      tap((response: any) => this.policySubject.next(this.extractPolicy(response)))
    );
  }

  isPolicyEnabled(policy: any): boolean {
    return !!policy?.enabled;
  }

  // Reservations
  listReservations(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/reservations', [], this.withSchool(filters));
  }

  createReservation(payload: any): Observable<ApiResponse> {
    return this.crudService.post('/admin/rentals/reservations', this.withSchool(payload));
  }

  quoteReservation(payload: any): Observable<ApiResponse> {
    return this.crudService.post('/admin/rentals/reservations/quote', this.withSchool(payload));
  }

  updateReservation(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/reservations', payload, id);
  }

  getReservation(id: number): Observable<ApiResponse> {
    return this.crudService.getById('/admin/rentals/reservations', id);
  }

  getVariant(id: number): Observable<ApiResponse> {
    return this.crudService.getById('/admin/rentals/variants', id);
  }

  getItemDetail(id: number, variantId?: number | null): Observable<ApiResponse> {
    const params: Record<string, any> = {};
    if (variantId && Number(variantId) > 0) {
      params.variant_id = Number(variantId);
    }
    return this.crudService.get(`/admin/rentals/items/${id}/detail`, [], this.withSchool(params));
  }

  listItemImages(itemId: number): Observable<ApiResponse> {
    return this.crudService.get(`/admin/rentals/items/${itemId}/images`, [], this.withSchool());
  }

  uploadItemImage(itemId: number, image: string): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/items/${itemId}/images`, this.withSchool({ image }));
  }

  setPrimaryItemImage(itemId: number, imageId: number): Observable<ApiResponse> {
    return this.crudService.update(`/admin/rentals/items/${itemId}/images`, this.withSchool({}), `${imageId}/primary`);
  }

  deleteItemImage(itemId: number, imageId: number): Observable<ApiResponse> {
    return this.crudService.deletePath(`/admin/rentals/items/${itemId}/images/${imageId}`);
  }

  assignUnits(reservationId: number, payload: any): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/reservations/${reservationId}/assign-units`, payload);
  }

  returnUnits(reservationId: number, payload: any): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/reservations/${reservationId}/return-units`, payload);
  }

  autoAssign(reservationId: number): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/reservations/${reservationId}/auto-assign`, this.withSchool({}));
  }

  registerDamage(reservationId: number, payload: any): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/reservations/${reservationId}/damage`, payload);
  }

  cancelReservation(reservationId: number, reason: string = ''): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/reservations/${reservationId}/cancel`, this.withSchool({ cancellation_reason: reason }));
  }

  getReservationEvents(reservationId: number): Observable<ApiResponse> {
    return this.crudService.get(`/admin/rentals/reservations/${reservationId}/events`, [], this.withSchool());
  }

  // Booking integration
  linkToBooking(reservationId: number, bookingId: number): Observable<ApiResponse> {
    return this.crudService.post(`/admin/rentals/reservations/${reservationId}/link-booking`, this.withSchool({ booking_id: bookingId }));
  }

  unlinkFromBooking(reservationId: number): Observable<ApiResponse> {
    return this.crudService.deletePath(`/admin/rentals/reservations/${reservationId}/unlink-booking`);
  }

  listBookingRentals(bookingId: number): Observable<ApiResponse> {
    return this.crudService.get(`/admin/bookings/${bookingId}/rentals`, [], this.withSchool());
  }

  createBookingRental(bookingId: number, payload: any): Observable<ApiResponse> {
    return this.crudService.post(`/admin/bookings/${bookingId}/rentals`, this.withSchool(payload));
  }

  // Dashboard KPIs
  getDashboardRentalSummary(): Observable<ApiResponse> {
    return this.crudService.get('/admin/dashboard/rental-summary', [], this.withSchool());
  }

  // Unified bookings list
  listUnifiedBookings(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/bookings/unified', [], this.withSchool(filters));
  }

  // Client rental history
  getClientRentals(clientId: number, filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get(`/admin/clients/${clientId}/rentals`, [], this.withSchool(filters));
  }

  // ==================== PAYMENTS ====================

  getPaymentInfo(reservationId: number): Observable<ApiResponse> {
    return this.crudService.get(`/admin/rentals/reservations/${reservationId}/payment`, [], this.withSchool());
  }

  registerPayment(reservationId: number, payload: {
    amount: number;
    payment_method: 'cash' | 'card' | 'payrexx_link' | 'payrexx_invoice' | 'invoice';
    notes?: string;
    payrexx_reference?: string;
    currency?: string;
  }): Observable<ApiResponse> {
    return this.crudService.create(`/admin/rentals/reservations/${reservationId}/payment`, this.withSchool(payload));
  }

  createPaylink(reservationId: number, payload: {
    amount?: number;
    client_email?: string;
    send_email?: boolean;
  }): Observable<ApiResponse> {
    return this.crudService.create(`/admin/rentals/reservations/${reservationId}/paylink`, this.withSchool(payload));
  }

  manageDeposit(reservationId: number, payload: {
    action: 'hold' | 'release' | 'forfeit';
    amount?: number;
    notes?: string;
  }): Observable<ApiResponse> {
    return this.crudService.create(`/admin/rentals/reservations/${reservationId}/deposit`, this.withSchool(payload));
  }

  refundPayment(
    reservationId: number,
    payload: {
      amount?: number;
      refund_method?: 'cash' | 'card' | 'payrexx' | 'voucher';
      notes?: string;
      voucher_name?: string;
    } = {}
  ): Observable<ApiResponse> {
    return this.crudService.create(`/admin/rentals/reservations/${reservationId}/refund`, this.withSchool(payload));
  }

  // ==================== ANALYTICS ====================

  getRentalAnalytics(filters: { date_from?: string; date_to?: string; start_date?: string; end_date?: string } = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/analytics', [], this.withSchool(filters));
  }

  exportRentalCsv(filters: { date_from?: string; date_to?: string; start_date?: string; end_date?: string } = {}): void {
    const schoolId = this.getSchoolId();
    const params = new URLSearchParams({ ...(schoolId ? { school_id: String(schoolId) } : {}), ...filters });
    const url = `/admin/rentals/analytics/export?${params.toString()}`;
    this.crudService.getFile(url).subscribe({
      next: (blob: Blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `rental-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      },
      error: () => {
        // Keep export failure non-fatal in the analytics UI.
      }
    });
  }

  // Helpers for rental booking UI
  listClients(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/clients', [], this.withSchool(filters));
  }

  createClient(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/clients', this.withSchool(payload));
  }

  linkClientToSchool(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/clients-schools', payload);
  }

  extractPolicy(response: any): any | null {
    return response?.data?.data ?? response?.data ?? null;
  }
}
