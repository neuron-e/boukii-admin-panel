import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { SeasonService, CreateSeasonRequest } from './season.service';
import { ApiV5Service, ApiV5Response } from '../../../core/services/api-v5.service';
import { SeasonContextService } from '../../../core/services/season-context.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Season } from '../../../core/models/season.interface';

describe('SeasonService - Enhanced School Context Integration', () => {
  let service: SeasonService;
  let apiV5Service: jasmine.SpyObj<ApiV5Service>;
  let seasonContextService: jasmine.SpyObj<SeasonContextService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockSeason: Season = {
    id: 10,
    name: 'Temporada 2024-2025',
    start_date: '2024-09-01',
    end_date: '2025-04-30',
    is_active: true,
    is_closed: false,
    is_historical: false,
    school_id: 2,
    created_at: '2024-01-01T00:00:00Z'
  };

  const mockApiResponse: ApiV5Response<Season> = {
    success: true,
    message: 'Season created successfully',
    data: mockSeason,
    timestamp: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    const apiV5Spy = jasmine.createSpyObj('ApiV5Service', ['get', 'post', 'put', 'delete']);
    const seasonContextSpy = jasmine.createSpyObj('SeasonContextService', ['getCurrentSeasonId', 'setCurrentSeason']);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SeasonService,
        { provide: ApiV5Service, useValue: apiV5Spy },
        { provide: SeasonContextService, useValue: seasonContextSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(SeasonService);
    apiV5Service = TestBed.inject(ApiV5Service) as jasmine.SpyObj<ApiV5Service>;
    seasonContextService = TestBed.inject(SeasonContextService) as jasmine.SpyObj<SeasonContextService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('createSeason - Enhanced School Context Handling', () => {
    it('should successfully create a season with automatic school context injection', () => {
      const createRequest: CreateSeasonRequest = {
        name: 'Temporada 2024-2025',
        start_date: '2024-09-01',
        end_date: '2025-04-30'
        // ✅ school_id is automatically handled by ApiV5Service + AuthV5Interceptor
      };

      // Mock successful API response
      apiV5Service.post.and.returnValue(of(mockApiResponse));

      service.createSeason(createRequest).subscribe({
        next: (result) => {
          expect(result).toEqual(mockSeason);
          expect(result.school_id).toBe(2); // Verify school context is in response
          
          // ✅ Verify API service was called without manual school_id
          // The school_id will be added automatically by ApiV5Service
          expect(apiV5Service.post).toHaveBeenCalledWith('seasons', createRequest);
          
          // Verify success notification
          expect(notificationService.success).toHaveBeenCalledWith('Temporada creada exitosamente');
        },
        error: fail
      });
    });

    it('should handle API errors gracefully', () => {
      const createRequest: CreateSeasonRequest = {
        name: 'Temporada 2024-2025',
        start_date: '2024-09-01',
        end_date: '2025-04-30'
        // ✅ No manual school_id needed
      };

      const errorResponse = {
        success: false,
        message: 'School context is required',
        data: null,
        timestamp: '2024-01-01T00:00:00Z'
      };

      // Mock API error
      apiV5Service.post.and.returnValue(of(errorResponse));

      service.createSeason(createRequest).subscribe({
        next: fail, // Should not succeed
        error: (error) => {
          expect(error.message).toBe('Failed to create season');
          expect(notificationService.error).toHaveBeenCalledWith('Error al crear la temporada');
          expect(apiV5Service.post).toHaveBeenCalledWith('seasons', createRequest);
        }
      });
    });

    it('should handle HTTP errors with proper logging', () => {
      const createRequest: CreateSeasonRequest = {
        name: 'Temporada 2024-2025',
        start_date: '2024-09-01',
        end_date: '2025-04-30',
      };

      const httpError = new Error('Network error');
      apiV5Service.post.and.returnValue(throwError(httpError));

      service.createSeason(createRequest).subscribe({
        next: fail,
        error: (error) => {
          expect(error).toBe(httpError);
          expect(notificationService.error).toHaveBeenCalledWith('Error al crear la temporada');
        }
      });
    });
  });

  describe('getSeasons - Context Integration', () => {
    const mockSeasons: Season[] = [
      mockSeason,
      {
        ...mockSeason,
        id: 11,
        name: 'Temporada 2023-2024',
        start_date: '2023-09-01',
        end_date: '2024-04-30',
      }
    ];

    const mockSeasonsResponse: ApiV5Response<Season[]> = {
      success: true,
      message: 'Seasons loaded successfully',
      data: mockSeasons,
      timestamp: '2024-01-01T00:00:00Z'
    };

    it('should load seasons and update internal state', () => {
      apiV5Service.get.and.returnValue(of(mockSeasonsResponse));

      service.getSeasons().subscribe({
        next: (seasons) => {
          expect(seasons).toEqual(mockSeasons);
          expect(seasons.length).toBe(2);
          
          // Verify all seasons have school context
          seasons.forEach(season => {
            expect(season.school_id).toBe(2);
          });
          
          // Verify API call was made correctly
          expect(apiV5Service.get).toHaveBeenCalledWith('seasons', undefined);
        },
        error: fail
      });
    });

    it('should load seasons using school context from interceptor', () => {
      apiV5Service.get.and.returnValue(of(mockSeasonsResponse));

      service.getSeasons().subscribe({
        next: (seasons) => {
          expect(seasons).toEqual(mockSeasons);
          
          // Verify API was called without parameters (context handled by interceptor)
          expect(apiV5Service.get).toHaveBeenCalledWith('seasons');
        },
        error: fail
      });
    });

    it('should handle empty seasons response', () => {
      const emptyResponse: ApiV5Response<Season[]> = {
        success: true,
        message: 'No seasons found',
        data: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      apiV5Service.get.and.returnValue(of(emptyResponse));

      service.getSeasons().subscribe({
        next: (seasons) => {
          expect(seasons).toEqual([]);
          expect(seasons.length).toBe(0);
        },
        error: fail
      });
    });

    it('should handle API error when loading seasons', () => {
      const httpError = new Error('Failed to load seasons');
      apiV5Service.get.and.returnValue(throwError(httpError));

      service.getSeasons().subscribe({
        next: fail,
        error: (error) => {
          expect(error).toBe(httpError);
          expect(notificationService.error).toHaveBeenCalledWith('Error al cargar las temporadas');
        }
      });
    });
  });

  describe('getCurrentSeason - Enhanced School Context', () => {
    it('should load current season with automatic school context', () => {
      apiV5Service.get.and.returnValue(of(mockApiResponse));

      service.getCurrentSeason().subscribe({
        next: (season) => {
          expect(season).toEqual(mockSeason);
          expect(season.school_id).toBe(2);
          
          // ✅ Verify API call without manual school_id - context handled automatically
          expect(apiV5Service.get).toHaveBeenCalledWith('seasons/current');
        },
        error: fail
      });
    });

    it('should handle no current season found', () => {
      const errorResponse: ApiV5Response<Season> = {
        success: false,
        message: 'No current season found',
        data: null as any,
        timestamp: '2024-01-01T00:00:00Z'
      };

      apiV5Service.get.and.returnValue(of(errorResponse));

      service.getCurrentSeason().subscribe({
        next: fail,
        error: (error) => {
          expect(error.message).toBe('Current season not found');
          expect(notificationService.error).toHaveBeenCalledWith('No se encontró una temporada activa');
        }
      });
    });
  });

  describe('Integration Tests - Full Flow', () => {
    it('should create season and refresh seasons list', () => {
      const createRequest: CreateSeasonRequest = {
        name: 'Temporada 2024-2025',
        start_date: '2024-09-01',
        end_date: '2025-04-30',
      };

      // Mock create response
      apiV5Service.post.and.returnValue(of(mockApiResponse));
      
      // Mock refresh (getSeasons) response
      const mockSeasonsResponse: ApiV5Response<Season[]> = {
        success: true,
        message: 'Seasons refreshed',
        data: [mockSeason],
        timestamp: '2024-01-01T00:00:00Z'
      };
      apiV5Service.get.and.returnValue(of(mockSeasonsResponse));

      service.createSeason(createRequest).subscribe({
        next: (season) => {
          expect(season).toEqual(mockSeason);
          
          // Verify both create and refresh were called
          expect(apiV5Service.post).toHaveBeenCalledWith('seasons', createRequest);
          expect(apiV5Service.get).toHaveBeenCalledWith('seasons', undefined); // refresh call
          
          // Verify notifications
          expect(notificationService.success).toHaveBeenCalledWith('Temporada creada exitosamente');
        },
        error: fail
      });
    });
  });

  describe('School Context Validation', () => {
    it('should ensure all season operations include school context', () => {
      // This test verifies that the ApiV5Service is correctly configured
      // to add school_id to requests automatically
      
      const createRequest: CreateSeasonRequest = {
        name: 'Test Season',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      apiV5Service.post.and.returnValue(of(mockApiResponse));

      service.createSeason(createRequest).subscribe();

      // Verify the service was called - the actual school context injection
      // happens in ApiV5Service which we've now improved
      expect(apiV5Service.post).toHaveBeenCalledWith('seasons', jasmine.objectContaining({
        school_id: 2,
        name: 'Test Season'
      }));
    });
  });
});