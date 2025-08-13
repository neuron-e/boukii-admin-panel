/**
 * Simplified test for AuthV5Service user extraction functionality
 * Tests the critical fix for flexible API response handling
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthV5Service } from './auth-v5.service';
import { TokenV5Service } from './token-v5.service';

describe('AuthV5Service - User Extraction', () => {
  let service: AuthV5Service;
  let httpMock: HttpTestingController;
  let tokenServiceSpy: jasmine.SpyObj<TokenV5Service>;

  beforeEach(() => {
    const tokenSpy = jasmine.createSpyObj('TokenV5Service', [
      'updateUserData', 'getToken', 'hasValidToken'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthV5Service,
        { provide: TokenV5Service, useValue: tokenSpy }
      ]
    });

    service = TestBed.inject(AuthV5Service);
    httpMock = TestBed.inject(HttpTestingController);
    tokenServiceSpy = TestBed.inject(TokenV5Service) as jasmine.SpyObj<TokenV5Service>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getCurrentUserInfo - Flexible Response Handling', () => {
    
    it('should extract user from response.data.user (standard structure)', (done) => {
      const mockApiResponse = {
        success: true,
        message: 'User retrieved successfully',
        data: {
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      };

      service.getCurrentUserInfo().subscribe({
        next: (user) => {
          expect(user).toEqual(mockApiResponse.data.user);
          expect(user.email).toBe('test@example.com');
          expect(tokenServiceSpy.updateUserData).toHaveBeenCalledWith(user);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(request => 
        request.url.includes('/api/v5/auth/me')
      );
      req.flush(mockApiResponse);
    });

    it('should extract user from response.data (direct data structure)', (done) => {
      const mockApiResponse = {
        success: true,
        message: 'User retrieved successfully',
        data: {
          id: 1,
          name: 'Direct User',
          email: 'direct@example.com'
        }
      };

      service.getCurrentUserInfo().subscribe({
        next: (user) => {
          expect(user).toEqual(mockApiResponse.data);
          expect(user.email).toBe('direct@example.com');
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(request => 
        request.url.includes('/api/v5/auth/me')
      );
      req.flush(mockApiResponse);
    });

    it('should extract user from response.user (root level structure)', (done) => {
      const mockApiResponse = {
        success: true,
        message: 'User retrieved successfully',
        data: null,
        user: {
          id: 1,
          name: 'Root User',
          email: 'root@example.com'
        }
      };

      service.getCurrentUserInfo().subscribe({
        next: (user) => {
          expect(user).toEqual(mockApiResponse.user);
          expect(user.email).toBe('root@example.com');
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(request => 
        request.url.includes('/api/v5/auth/me')
      );
      req.flush(mockApiResponse);
    });

    it('should handle data with email directly (no nested user)', (done) => {
      const mockApiResponse = {
        success: true,
        message: 'User retrieved successfully', 
        data: {
          id: 1,
          name: 'Direct Email User',
          email: 'direct-email@example.com',
          role: 'admin'
        }
      };

      service.getCurrentUserInfo().subscribe({
        next: (user) => {
          expect(user).toEqual(mockApiResponse.data);
          expect(user.email).toBe('direct-email@example.com');
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(request => 
        request.url.includes('/api/v5/auth/me')
      );
      req.flush(mockApiResponse);
    });

    it('should throw error when no user found in any location', (done) => {
      const mockApiResponse = {
        success: true,
        message: 'No user data',
        data: {}
      };

      service.getCurrentUserInfo().subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('User data not found');
          done();
        }
      });

      const req = httpMock.expectOne(request => 
        request.url.includes('/api/v5/auth/me')
      );
      req.flush(mockApiResponse);
    });

    it('should handle API failure responses', (done) => {
      const mockApiResponse = {
        success: false,
        message: 'Authentication failed',
        data: null
      };

      service.getCurrentUserInfo().subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Authentication failed');
          done();
        }
      });

      const req = httpMock.expectOne(request => 
        request.url.includes('/api/v5/auth/me')
      );
      req.flush(mockApiResponse);
    });

    it('should handle HTTP errors gracefully', (done) => {
      service.getCurrentUserInfo().subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error) => {
          expect(error.status).toBe(401);
          done();
        }
      });

      const req = httpMock.expectOne(request => 
        request.url.includes('/api/v5/auth/me')
      );
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });
});

/**
 * Integration test to verify the complete flow works together
 */
describe('AuthV5Service - Integration Test', () => {
  let service: AuthV5Service;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthV5Service, TokenV5Service]
    });

    service = TestBed.inject(AuthV5Service);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should complete the full user info flow without errors', (done) => {
    const mockResponse = {
      success: true,
      message: 'Success',
      data: {
        user: {
          id: 1,
          name: 'Integration Test User',
          email: 'integration@test.com'
        }
      }
    };

    service.getCurrentUserInfo().subscribe({
      next: (user) => {
        expect(user.email).toBe('integration@test.com');
        expect(user.name).toBe('Integration Test User');
        done();
      },
      error: (error) => {
        console.error('Integration test failed:', error);
        done.fail(error);
      }
    });

    const req = httpMock.expectOne(request => 
      request.url.includes('/api/v5/auth/me')
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});