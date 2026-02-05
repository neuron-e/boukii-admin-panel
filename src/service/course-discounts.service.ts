import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface CourseDiscount {
  id?: number;
  course_id: number;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_days: number;
  valid_from?: string;
  valid_to?: string;
  priority?: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseDiscountsService {
  private apiUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all discounts for a specific course
   */
  getCourseDiscounts(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses/${courseId}/discounts`);
  }

  /**
   * Get a specific discount by ID
   */
  getCourseDiscount(courseId: number, discountId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses/${courseId}/discounts/${discountId}`);
  }

  /**
   * Create a new discount for a course
   */
  createCourseDiscount(courseId: number, discountData: Partial<CourseDiscount>): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses/${courseId}/discounts`, discountData);
  }

  /**
   * Update an existing discount
   */
  updateCourseDiscount(courseId: number, discountId: number, discountData: Partial<CourseDiscount>): Observable<any> {
    return this.http.put(`${this.apiUrl}/courses/${courseId}/discounts/${discountId}`, discountData);
  }

  /**
   * Delete a discount
   */
  deleteCourseDiscount(courseId: number, discountId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${courseId}/discounts/${discountId}`);
  }

  /**
   * Toggle discount active status
   */
  toggleDiscountActive(courseId: number, discountId: number, active: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/courses/${courseId}/discounts/${discountId}`, { active });
  }

  /**
   * Validate discount value based on type
   */
  validateDiscountValue(type: 'percentage' | 'fixed_amount', value: number): { valid: boolean, message?: string } {
    if (type === 'percentage') {
      if (value < 0 || value > 100) {
        return {
          valid: false,
          message: 'El porcentaje debe estar entre 0 y 100'
        };
      }
    } else {
      if (value < 0) {
        return {
          valid: false,
          message: 'El valor no puede ser negativo'
        };
      }
    }
    return { valid: true };
  }

  /**
   * Validate date range
   */
  validateDateRange(validFrom?: string, validTo?: string): { valid: boolean, message?: string } {
    if (validFrom && validTo) {
      const from = new Date(validFrom);
      const to = new Date(validTo);

      if (from >= to) {
        return {
          valid: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de fin'
        };
      }
    }
    return { valid: true };
  }
}
