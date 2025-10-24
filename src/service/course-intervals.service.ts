import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { CourseInterval } from '../app/interfaces/course-interval.interface';

@Injectable({
  providedIn: 'root'
})
export class CourseIntervalsService {
  private apiUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all intervals for a specific course
   */
  getIntervalsByCourse(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/course-intervals?course_id=${courseId}`);
  }

  /**
   * Get a specific interval by ID
   */
  getInterval(intervalId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/course-intervals/${intervalId}`);
  }

  /**
   * Create a new interval
   */
  createInterval(intervalData: Partial<CourseInterval>): Observable<any> {
    return this.http.post(`${this.apiUrl}/course-intervals`, intervalData);
  }

  /**
   * Update an existing interval
   */
  updateInterval(intervalId: number, intervalData: Partial<CourseInterval>): Observable<any> {
    return this.http.put(`${this.apiUrl}/course-intervals/${intervalId}`, intervalData);
  }

  /**
   * Delete an interval
   */
  deleteInterval(intervalId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/course-intervals/${intervalId}`);
  }

  /**
   * Reorder intervals for a course
   */
  reorderIntervals(courseId: number, intervals: Array<{id: number, display_order: number}>): Observable<any> {
    return this.http.post(`${this.apiUrl}/course-intervals/reorder`, {
      course_id: courseId,
      intervals: intervals
    });
  }

  /**
   * Generate dates for an interval based on its configuration
   */
  generateDates(intervalId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/course-intervals/${intervalId}/generate-dates`, {});
  }

  /**
   * Retrieve discount rules for a specific interval.
   */
  getIntervalDiscounts(intervalId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/course-intervals/${intervalId}/discounts`);
  }

  /**
   * Save discount rules for a specific interval.
   */
  saveIntervalDiscounts(
    intervalId: number,
    discounts: Array<{ days: number; type: 'percentage' | 'fixed'; value: number }>
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/course-intervals/${intervalId}/discounts`, {
      discounts
    });
  }

  /**
   * Helper: Generate default interval name
   */
  generateIntervalName(index: number, startDate?: string, endDate?: string): string {
    if (startDate && endDate) {
      return `Intervalo ${index + 1}: ${startDate} - ${endDate}`;
    }
    return `Intervalo ${index + 1}`;
  }

  /**
   * Helper: Validate interval dates don't overlap
   */
  validateNoOverlap(intervals: CourseInterval[]): { valid: boolean, message?: string } {
    const sorted = [...intervals].sort((a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (new Date(current.end_date) >= new Date(next.start_date)) {
        return {
          valid: false,
          message: `Los intervalos "${current.name}" y "${next.name}" se solapan`
        };
      }
    }

    return { valid: true };
  }
}
