import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CourseService, CourseGroup, CreateCourseRequest } from './course.service';
import { ApiV5Service, ApiV5Response } from '../../../core/services/api-v5.service';
import { SeasonContextService } from '../../../core/services/season-context.service';

describe('CourseService', () => {
  let service: CourseService;
  let mockApiV5Service: jasmine.SpyObj<ApiV5Service>;
  let mockSeasonContextService: jasmine.SpyObj<SeasonContextService>;

  const mockSeasonId = 1;
  
  const mockCourse: CourseGroup = {
    id: 1,
    season_id: 1,
    name: 'Surf Iniciación',
    description: 'Curso básico de surf para principiantes',
    category: 'Surf',
    level: 'Beginner',
    duration_minutes: 120,
    max_participants: 8,
    min_participants: 2,
    price: 45.00,
    is_active: true,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z'
  };

  const mockCourses: CourseGroup[] = [mockCourse];

  const mockApiResponse = <T>(data: T): ApiV5Response<T> => ({
    success: true,
    message: 'Operation successful',
    data: data,
    timestamp: '2024-01-01T00:00:00Z'
  });

  beforeEach(() => {
    const apiV5Spy = jasmine.createSpyObj('ApiV5Service', ['get', 'post', 'put', 'delete']);
    const seasonSpy = jasmine.createSpyObj('SeasonContextService', ['getCurrentSeasonId']);

    TestBed.configureTestingModule({
      providers: [
        CourseService,
        { provide: ApiV5Service, useValue: apiV5Spy },
        { provide: SeasonContextService, useValue: seasonSpy }
      ]
    });

    service = TestBed.inject(CourseService);
    mockApiV5Service = TestBed.inject(ApiV5Service) as jasmine.SpyObj<ApiV5Service>;
    mockSeasonContextService = TestBed.inject(SeasonContextService) as jasmine.SpyObj<SeasonContextService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCourseGroups', () => {
    it('should return courses with season context', (done) => {
      // Arrange
      const mockResponse = mockApiResponse(mockCourses);
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(mockResponse));

      // Act
      service.getCourseGroups().subscribe(courses => {
        // Assert
        expect(courses).toEqual(mockCourses);
        expect(mockApiV5Service.get).toHaveBeenCalledWith('courses', { season_id: mockSeasonId });
        expect(courses.length).toBe(1);
        expect(courses[0].name).toBe('Surf Iniciación');
        expect(courses[0].category).toBe('Surf');
        expect(courses[0].level).toBe('Beginner');
        done();
      });
    });

    it('should return courses without season context when no season available', (done) => {
      // Arrange
      const mockResponse = mockApiResponse(mockCourses);
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(null);
      mockApiV5Service.get.and.returnValue(of(mockResponse));

      // Act
      service.getCourseGroups().subscribe(courses => {
        // Assert
        expect(courses).toEqual(mockCourses);
        expect(mockApiV5Service.get).toHaveBeenCalledWith('courses', undefined);
        done();
      });
    });

    it('should handle API errors gracefully', (done) => {
      // Arrange
      const errorMessage = 'Server error';
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(throwError(errorMessage));

      // Act & Assert
      service.getCourseGroups().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBe(errorMessage);
          done();
        }
      });
    });

    it('should return empty array when response is not successful', (done) => {
      // Arrange
      const failedResponse: ApiV5Response<CourseGroup[]> = {
        success: false,
        message: 'Failed to load courses',
        data: [],
        timestamp: '2024-01-01T00:00:00Z'
      };
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(failedResponse));

      // Act
      service.getCourseGroups().subscribe(courses => {
        // Assert
        expect(courses).toEqual([]);
        done();
      });
    });
  });

  describe('getCourseById', () => {
    it('should return course by id with season context', (done) => {
      // Arrange
      const courseId = 1;
      const mockResponse = mockApiResponse(mockCourse);
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(mockResponse));

      // Act
      service.getCourseById(courseId).subscribe(course => {
        // Assert
        expect(course).toEqual(mockCourse);
        expect(course.id).toBe(courseId);
        expect(mockApiV5Service.get).toHaveBeenCalledWith(`courses/${courseId}`, { season_id: mockSeasonId });
        done();
      });
    });

    it('should handle course not found error', (done) => {
      // Arrange
      const courseId = 999;
      const notFoundResponse: ApiV5Response<CourseGroup> = {
        success: false,
        message: 'Course not found',
        data: null as any,
        timestamp: '2024-01-01T00:00:00Z'
      };
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(notFoundResponse));

      // Act
      service.getCourseById(courseId).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          // Assert
          expect(error.message).toBe('Course not found');
          done();
        }
      });
    });
  });

  describe('createCourse', () => {
    it('should create course with season context', (done) => {
      // Arrange
      const createRequest: CreateCourseRequest = {
        name: 'Nuevo Curso Windsurf',
        description: 'Curso avanzado de windsurf',
        category: 'Windsurf',
        level: 'Advanced',
        duration_minutes: 90,
        max_participants: 6,
        min_participants: 3,
        price: 65.00
      };
      
      const expectedPayload = {
        ...createRequest,
        season_id: mockSeasonId
      };

      const mockResponse = mockApiResponse({ 
        ...mockCourse, 
        ...createRequest, 
        id: 2,
        season_id: mockSeasonId
      });

      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.post.and.returnValue(of(mockResponse));

      // Act
      service.createCourse(createRequest).subscribe(course => {
        // Assert
        expect(course.name).toBe('Nuevo Curso Windsurf');
        expect(course.category).toBe('Windsurf');
        expect(course.level).toBe('Advanced');
        expect(course.price).toBe(65.00);
        expect(mockApiV5Service.post).toHaveBeenCalledWith('courses', expectedPayload);
        done();
      });
    });

    it('should handle create course failure', (done) => {
      // Arrange
      const createRequest: CreateCourseRequest = {
        name: 'Invalid Course',
        description: '',
        category: 'Surf',
        level: 'Beginner',
        duration_minutes: 60,
        max_participants: 8,
        min_participants: 2,
        price: 40.00
      };

      const failedResponse: ApiV5Response<CourseGroup> = {
        success: false,
        message: 'Validation failed',
        data: null as any,
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.post.and.returnValue(of(failedResponse));

      // Act
      service.createCourse(createRequest).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          // Assert
          expect(error.message).toBe('Failed to create course');
          done();
        }
      });
    });
  });

  describe('updateCourse', () => {
    it('should update course successfully', (done) => {
      // Arrange
      const courseId = 1;
      const updateData: Partial<CourseGroup> = {
        name: 'Surf Iniciación - Actualizado',
        price: 50.00,
        max_participants: 10
      };
      const updatedCourse = { ...mockCourse, ...updateData };
      const mockResponse = mockApiResponse(updatedCourse);
      mockApiV5Service.put.and.returnValue(of(mockResponse));

      // Act
      service.updateCourse(courseId, updateData).subscribe(course => {
        // Assert
        expect(course).toEqual(updatedCourse);
        expect(course.name).toBe(updateData.name);
        expect(course.price).toBe(updateData.price);
        expect(course.max_participants).toBe(updateData.max_participants);
        expect(mockApiV5Service.put).toHaveBeenCalledWith(`courses/${courseId}`, updateData);
        done();
      });
    });

    it('should handle update failure', (done) => {
      // Arrange
      const courseId = 1;
      const updateData = { name: 'Updated Name' };
      const failedResponse: ApiV5Response<CourseGroup> = {
        success: false,
        message: 'Update failed',
        data: null as any,
        timestamp: '2024-01-01T00:00:00Z'
      };
      mockApiV5Service.put.and.returnValue(of(failedResponse));

      // Act
      service.updateCourse(courseId, updateData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          // Assert
          expect(error.message).toBe('Failed to update course');
          done();
        }
      });
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', (done) => {
      // Arrange
      const courseId = 1;
      const mockResponse: ApiV5Response<void> = {
        success: true,
        message: 'Course deleted successfully',
        data: undefined,
        timestamp: '2024-01-01T00:00:00Z'
      };
      mockApiV5Service.delete.and.returnValue(of(mockResponse));

      // Act
      service.deleteCourse(courseId).subscribe(() => {
        // Assert
        expect(mockApiV5Service.delete).toHaveBeenCalledWith(`courses/${courseId}`);
        done();
      });
    });

    it('should handle delete failure', (done) => {
      // Arrange
      const courseId = 1;
      const mockResponse: ApiV5Response<void> = {
        success: false,
        message: 'Cannot delete course with active bookings',
        data: undefined,
        timestamp: '2024-01-01T00:00:00Z'
      };
      mockApiV5Service.delete.and.returnValue(of(mockResponse));

      // Act & Assert
      service.deleteCourse(courseId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to delete course');
          done();
        }
      });
    });

    it('should handle network errors during delete', (done) => {
      // Arrange
      const courseId = 1;
      mockApiV5Service.delete.and.returnValue(throwError('Network timeout'));

      // Act
      service.deleteCourse(courseId).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          // Assert
          expect(error).toBe('Network timeout');
          done();
        }
      });
    });
  });

  describe('logging and console output', () => {
    it('should log successful get operations', (done) => {
      // Arrange
      const consoleSpy = spyOn(console, 'log');
      const mockResponse = mockApiResponse(mockCourses);
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(mockResponse));

      // Act
      service.getCourseGroups().subscribe(() => {
        // Assert
        expect(consoleSpy).toHaveBeenCalledWith('[CourseService] Loaded 1 course groups');
        done();
      });
    });

    it('should log successful create operations', (done) => {
      // Arrange
      const consoleSpy = spyOn(console, 'log');
      const createRequest: CreateCourseRequest = {
        name: 'Test Course',
        description: 'Test',
        category: 'Surf',
        level: 'Beginner',
        duration_minutes: 60,
        max_participants: 8,
        min_participants: 2,
        price: 40.00
      };
      const createdCourse = { ...mockCourse, ...createRequest, id: 2 };
      const mockResponse = mockApiResponse(createdCourse);
      
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.post.and.returnValue(of(mockResponse));

      // Act
      service.createCourse(createRequest).subscribe(() => {
        // Assert
        expect(consoleSpy).toHaveBeenCalledWith('[CourseService] Created course:', createdCourse);
        done();
      });
    });

    it('should log errors for failed operations', (done) => {
      // Arrange
      const consoleErrorSpy = spyOn(console, 'error');
      const errorMessage = 'API failure';
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(throwError(errorMessage));

      // Act
      service.getCourseGroups().subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          // Assert
          expect(consoleErrorSpy).toHaveBeenCalledWith('[CourseService] Error loading course groups:', errorMessage);
          done();
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty course array', (done) => {
      // Arrange
      const emptyResponse = mockApiResponse([]);
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(emptyResponse));

      // Act
      service.getCourseGroups().subscribe(courses => {
        // Assert
        expect(courses).toEqual([]);
        expect(courses.length).toBe(0);
        done();
      });
    });

    it('should handle null response data', (done) => {
      // Arrange
      const nullResponse: ApiV5Response<CourseGroup[]> = {
        success: true,
        message: 'Success but no data',
        data: null as any,
        timestamp: '2024-01-01T00:00:00Z'
      };
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(nullResponse));

      // Act
      service.getCourseGroups().subscribe(courses => {
        // Assert
        expect(courses).toEqual([]);
        done();
      });
    });

    it('should handle courses with complex data structures', (done) => {
      // Arrange
      const complexCourse: CourseGroup = {
        ...mockCourse,
        name: 'Curso con caracteres especiales: àáâäæãåā',
        description: 'Descripción con emojis 🏄‍♂️🌊 y símbolos €$£¥',
        price: 999.99
      };
      const mockResponse = mockApiResponse([complexCourse]);
      mockSeasonContextService.getCurrentSeasonId.and.returnValue(mockSeasonId);
      mockApiV5Service.get.and.returnValue(of(mockResponse));

      // Act
      service.getCourseGroups().subscribe(courses => {
        // Assert
        expect(courses[0].name).toContain('àáâäæãåā');
        expect(courses[0].description).toContain('🏄‍♂️🌊');
        expect(courses[0].price).toBe(999.99);
        done();
      });
    });
  });
});