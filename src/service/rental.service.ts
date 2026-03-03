import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiCrudService } from './crud.service';
import { ApiResponse } from 'src/app/interface/api-response';

@Injectable({
  providedIn: 'root'
})
export class RentalService {
  constructor(private crudService: ApiCrudService) {}

  private getSchoolId(): number | null {
    const userRaw = localStorage.getItem('boukiiUser');
    if (!userRaw) return null;
    try {
      const user = JSON.parse(userRaw);
      return user?.schools?.[0]?.id ?? null;
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

  createItem(payload: any): Observable<ApiResponse> {
    return this.crudService.create('/admin/rentals/items', this.withSchool(payload));
  }

  updateItem(id: number, payload: any): Observable<ApiResponse> {
    return this.crudService.update('/admin/rentals/items', payload, id);
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

  updatePolicy(payload: any): Observable<ApiResponse> {
    return this.crudService.post('/admin/rentals/policy', this.withSchool(payload));
  }

  // Reservations
  listReservations(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/rentals/reservations', [], this.withSchool(filters));
  }

  createReservation(payload: any): Observable<ApiResponse> {
    return this.crudService.post('/admin/rentals/reservations', this.withSchool(payload));
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

  // Booking integration
  listBookingRentals(bookingId: number): Observable<ApiResponse> {
    return this.crudService.get(`/admin/bookings/${bookingId}/rentals`, [], this.withSchool());
  }

  createBookingRental(bookingId: number, payload: any): Observable<ApiResponse> {
    return this.crudService.post(`/admin/bookings/${bookingId}/rentals`, this.withSchool(payload));
  }

  // Helpers for rental booking UI
  listClients(filters: Record<string, any> = {}): Observable<ApiResponse> {
    return this.crudService.get('/admin/clients', [], this.withSchool(filters));
  }
}
