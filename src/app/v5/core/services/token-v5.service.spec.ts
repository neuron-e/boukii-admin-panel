import { TestBed } from '@angular/core/testing';
import { TokenV5Service } from './token-v5.service';

describe('TokenV5Service', () => {
  let service: TokenV5Service;
  let localStorageMock: { [key: string]: string };

  // Mock localStorage
  beforeEach(() => {
    localStorageMock = {};
    
    // Mock localStorage methods
    spyOn(localStorage, 'getItem').and.callFake((key: string): string | null => {
      return localStorageMock[key] || null;
    });
    
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string): void => {
      localStorageMock[key] = value;
    });
    
    spyOn(localStorage, 'removeItem').and.callFake((key: string): void => {
      delete localStorageMock[key];
    });

    spyOn(localStorage, 'clear').and.callFake((): void => {
      localStorageMock = {};
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenV5Service);
  });

  afterEach(() => {
    localStorageMock = {};
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('localStorage sync functionality', () => {
    const mockToken = '1234|test-token-abcd';
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const mockSchool = { id: 2, name: 'Test School', slug: 'test-school' };
    const mockSeason = { id: 3, name: 'Test Season', start_date: '2025-01-01', end_date: '2025-12-31', is_active: true };

    it('should sync token from localStorage to BehaviorSubject on getToken()', () => {
      // Arrange: Put token in localStorage but not in subject
      localStorageMock['boukii_v5_token'] = mockToken;
      
      // Act: Call getToken which should sync from localStorage
      const result = service.getToken();
      
      // Assert: Should return the token and sync the subject
      expect(result).toBe(mockToken);
      expect(service.token$.value).toBe(mockToken);
    });

    it('should sync user, school, and season when syncing token', () => {
      // Arrange: Put all data in localStorage
      localStorageMock['boukii_v5_token'] = mockToken;
      localStorageMock['boukii_v5_user'] = JSON.stringify(mockUser);
      localStorageMock['boukii_v5_school'] = JSON.stringify(mockSchool);
      localStorageMock['boukii_v5_season'] = JSON.stringify(mockSeason);
      
      // Act: Call getToken which should sync everything
      service.getToken();
      
      // Assert: All subjects should be synced
      expect(service.user$.value).toEqual(mockUser);
      expect(service.school$.value).toEqual(mockSchool);
      expect(service.season$.value).toEqual(mockSeason);
    });

    it('should return stored token even if subject is null', () => {
      // Arrange: Token in localStorage, subject is null
      localStorageMock['boukii_v5_token'] = mockToken;
      
      // Force subject to be null (simulating desync)
      (service as any).tokenSubject.next(null);
      
      // Act
      const result = service.getToken();
      
      // Assert: Should find and return stored token
      expect(result).toBe(mockToken);
    });

    it('should handle empty localStorage gracefully', () => {
      // Arrange: No data in localStorage
      localStorageMock = {};
      
      // Act
      const result = service.getToken();
      
      // Assert: Should return null
      expect(result).toBeNull();
    });

    it('should validate token correctly', () => {
      // Arrange: Valid token
      localStorageMock['boukii_v5_token'] = mockToken;
      
      // Act
      const hasValidToken = service.hasValidToken();
      
      // Assert: Should be true (token exists and not expired)
      expect(hasValidToken).toBe(true);
    });

    it('should return false for hasValidToken when no token exists', () => {
      // Arrange: No token
      localStorageMock = {};
      
      // Act
      const hasValidToken = service.hasValidToken();
      
      // Assert: Should be false
      expect(hasValidToken).toBe(false);
    });
  });

  describe('saveLoginData functionality', () => {
    const mockLoginData = {
      user: { id: 1, name: 'Test User', email: 'test@example.com' },
      school: { id: 2, name: 'Test School', slug: 'test-school' },
      season: { id: 3, name: 'Test Season', start_date: '2025-01-01', end_date: '2025-12-31', is_active: true },
      access_token: '5678|permanent-token-xyz'
    };

    it('should save login data to localStorage and update subjects', (done) => {
      // Act
      service.saveLoginData(mockLoginData).subscribe({
        next: (result) => {
          // Assert: Should save to localStorage
          expect(localStorageMock['boukii_v5_token']).toBe(mockLoginData.access_token);
          expect(localStorageMock['boukii_v5_user']).toBe(JSON.stringify(mockLoginData.user));
          expect(localStorageMock['boukii_v5_school']).toBe(JSON.stringify(mockLoginData.school));
          expect(localStorageMock['boukii_v5_season']).toBe(JSON.stringify(mockLoginData.season));
          
          // Assert: Should update subjects
          expect(service.token$.value).toBe(mockLoginData.access_token);
          expect(service.user$.value).toEqual(mockLoginData.user);
          expect(service.school$.value).toEqual(mockLoginData.school);
          expect(service.season$.value).toEqual(mockLoginData.season);
          
          expect(result.success).toBe(true);
          done();
        },
        error: done.fail
      });
    });

    it('should clear temporary token when saving permanent data', (done) => {
      // Arrange: Set temporary token first
      localStorageMock['boukii_v5_temp_token'] = 'temp-token-123';
      
      // Act
      service.saveLoginData(mockLoginData).subscribe({
        next: () => {
          // Assert: Temporary token should be cleared
          expect(localStorageMock['boukii_v5_temp_token']).toBeUndefined();
          done();
        },
        error: done.fail
      });
    });

    it('should handle missing token in login data', (done) => {
      const invalidLoginData = { ...mockLoginData };
      delete (invalidLoginData as any).access_token;
      
      service.saveLoginData(invalidLoginData as any).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('access_token');
          done();
        }
      });
    });
  });

  describe('clearAll functionality', () => {
    it('should clear all localStorage data and reset subjects', () => {
      // Arrange: Set some data
      localStorageMock['boukii_v5_token'] = 'test-token';
      localStorageMock['boukii_v5_user'] = JSON.stringify({ id: 1, name: 'Test' });
      localStorageMock['boukii_v5_temp_token'] = 'temp-token';
      
      // Update subjects
      (service as any).tokenSubject.next('test-token');
      (service as any).userSubject.next({ id: 1, name: 'Test' });
      
      // Act
      service.clearAll();
      
      // Assert: localStorage should be cleared
      expect(localStorageMock['boukii_v5_token']).toBeUndefined();
      expect(localStorageMock['boukii_v5_user']).toBeUndefined();
      expect(localStorageMock['boukii_v5_temp_token']).toBeUndefined();
      
      // Assert: Subjects should be reset
      expect(service.token$.value).toBeNull();
      expect(service.user$.value).toBeNull();
    });
  });

  describe('temporary token functionality', () => {
    it('should save and retrieve temporary token', () => {
      const tempToken = 'temp-1234|test-temp-token';
      
      // Act: Save temporary token
      service.saveTempToken(tempToken);
      
      // Assert: Should be stored and retrievable
      expect(localStorageMock['boukii_v5_temp_token']).toBe(tempToken);
      expect(service.getTempToken()).toBe(tempToken);
    });

    it('should clear temporary token', () => {
      // Arrange: Set temporary token
      localStorageMock['boukii_v5_temp_token'] = 'temp-token';
      
      // Act
      service.clearTempToken();
      
      // Assert: Should be cleared
      expect(localStorageMock['boukii_v5_temp_token']).toBeUndefined();
      expect(service.getTempToken()).toBeNull();
    });
  });

  describe('constructor initialization', () => {
    it('should initialize subjects from localStorage on service creation', () => {
      // This test recreates the service to test constructor behavior
      const token = 'init-token-123';
      const user = { id: 1, name: 'Init User', email: 'init@test.com' };
      
      // Arrange: Put data in localStorage before service creation
      localStorageMock['boukii_v5_token'] = token;
      localStorageMock['boukii_v5_user'] = JSON.stringify(user);
      
      // Act: Create new service instance
      const newService = new TokenV5Service();
      
      // Assert: Should initialize subjects from localStorage
      expect(newService.token$.value).toBe(token);
      expect(newService.user$.value).toEqual(user);
    });

    it('should handle constructor initialization errors gracefully', () => {
      // Arrange: Invalid JSON in localStorage
      localStorageMock['boukii_v5_user'] = 'invalid-json{';
      
      // Act: Should not throw error
      expect(() => {
        new TokenV5Service();
      }).not.toThrow();
    });
  });
});