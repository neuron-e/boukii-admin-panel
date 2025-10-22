import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface CourseIntervalGroup {
  id?: number;
  course_id: number;
  course_interval_id: number;
  course_group_id: number;
  max_participants?: number | null;
  active: boolean;
  intervalSubgroups?: CourseIntervalSubgroup[];
}

export interface CourseIntervalSubgroup {
  id?: number;
  course_interval_group_id?: number;
  course_subgroup_id: number;
  max_participants?: number | null;
  active: boolean;
}

export interface IntervalGroupsPayload {
  course_id: number;
  course_interval_id: number;
  groups: Array<{
    course_group_id: number;
    max_participants?: number | null;
    active: boolean;
    subgroups?: Array<{
      course_subgroup_id: number;
      max_participants?: number | null;
      active: boolean;
    }>;
  }>;
}

export interface GlobalGroupsPayload {
  course_id: number;
  groups: Array<{
    course_group_id: number;
    max_participants?: number | null;
    active: boolean;
    subgroups?: Array<{
      course_subgroup_id: number;
      max_participants?: number | null;
      active: boolean;
    }>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class CourseIntervalGroupsService {
  private apiUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get groups configuration for a specific interval
   */
  getGroupsForInterval(intervalId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/course-interval-groups/interval/${intervalId}`);
  }

  /**
   * Get all interval groups for a course (grouped by interval)
   */
  getGroupsForCourse(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/course-interval-groups/course/${courseId}`);
  }

  /**
   * Store or update groups configuration for a specific interval
   */
  storeGroupsForInterval(payload: IntervalGroupsPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/course-interval-groups/interval`, payload);
  }

  /**
   * Apply global groups configuration to all intervals
   */
  applyGlobalGroups(payload: GlobalGroupsPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/course-interval-groups/apply-global`, payload);
  }

  /**
   * Delete groups configuration for a specific interval
   */
  deleteGroupsForInterval(intervalId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/course-interval-groups/interval/${intervalId}`);
  }

  /**
   * Check if a course has interval-specific groups configuration
   */
  hasIntervalGroups(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/course-interval-groups/has-interval-groups/${courseId}`);
  }
}
