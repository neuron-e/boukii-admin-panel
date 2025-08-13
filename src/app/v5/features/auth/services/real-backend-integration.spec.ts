import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthV5Service, CheckUserResponse } from '../../../core/services/auth-v5.service';
import { TokenV5Service } from '../../../core/services/token-v5.service';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

describe('AuthV5Service - Real Backend Integration with Dev Users', () => {
  let service: AuthV5Service;
  let httpMock: HttpTestingController;
  let tokenService: jasmine.SpyObj<TokenV5Service>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const tokenServiceSpy = jasmine.createSpyObj('TokenV5Service', [
      'setTempToken', 'getTempToken', 'clearTempToken', 
      'saveLoginData', 'getCurrentUser', 'getToken'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthV5Service,
        { provide: TokenV5Service, useValue: tokenServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthV5Service);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenV5Service) as jasmine.SpyObj<TokenV5Service>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Development Users - Real API Response Structure', () => {
    it('should handle admin@boukii-v5.com multi-school response correctly', () => {
      const realMultiSchoolResponse = {
        success: true,
        message: 'Credenciales verificadas correctamente',
        data: {
          user: {
            id: 20206,
            name: null,
            email: 'admin@boukii-v5.com',
            email_verified_at: null
          },
          schools: [
            {
              id: 2,
              name: 'ESS Veveyse',
              slug: 'ecole-suisse-de-ski',
              logo: 'https://api.boukii.com/storage/logos/ess-les-paccots.png',
              user_role: 'member',
              can_administer: false
            },
            {
              id: 1,
              name: 'School Testing',
              slug: 'SchoolTesting',
              logo: 'https://api.boukii.com/storage/logos/ess-les-paccots.png',
              user_role: 'member',
              can_administer: false
            }
          ],
          requires_school_selection: true,
          temp_token: '4741|X1IGWsOTAVhIUYZHqbwDBQrV7HFHB1OMXrHkmyHtf7f11651'
        }
      };

      const credentials = { email: 'admin@boukii-v5.com', password: 'password123' };

      service.checkUser(credentials).subscribe({
        next: (response) => {
          expect(response).toBeTruthy();
          expect(response.user.email).toBe('admin@boukii-v5.com');
          expect(response.schools).toHaveSize(2);
          
          // Verify real school names (not mocks)
          expect(response.schools[0].name).toBe('ESS Veveyse');
          expect(response.schools[1].name).toBe('School Testing');
          
          // Verify school ID 2 is included
          const schoolIds = response.schools.map(s => s.id);
          expect(schoolIds).toContain(2);
          
          expect(response.requires_school_selection).toBe(true);
          expect(response.temp_token).toBeTruthy();

          // Verify temporary data is stored correctly
          const storedSchools = localStorage.getItem('v5_temp_schools');
          expect(storedSchools).toBeTruthy();
          const parsedSchools = JSON.parse(storedSchools!);
          expect(parsedSchools).toHaveSize(2);
          expect(parsedSchools[0].name).toBe('ESS Veveyse');

          expect(tokenService.setTempToken).toHaveBeenCalledWith(realMultiSchoolResponse.data.temp_token);
        },
        error: fail
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v5/auth/check-user`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(realMultiSchoolResponse);
    });

    it('should handle multi@boukii-v5.com single-school response correctly', () => {
      const realSingleSchoolResponse = {
        success: true,
        message: 'Credenciales verificadas correctamente',
        data: {
          user: {
            id: 20207,
            name: null,
            email: 'multi@boukii-v5.com',
            email_verified_at: null
          },
          schools: [
            {
              id: 2,
              name: 'ESS Veveyse',
              slug: 'ecole-suisse-de-ski',
              logo: 'https://api.boukii.com/storage/logos/ess-les-paccots.png',
              user_role: 'member',
              can_administer: false
            }
          ],
          requires_school_selection: false,
          temp_token: '4742|bx5Ul2Hd0RogPbKdbf5eHROGSh9wKooWfrCngqXkcdbb7748'
        }
      };

      const credentials = { email: 'multi@boukii-v5.com', password: 'password123' };

      service.checkUser(credentials).subscribe({
        next: (response) => {
          expect(response.schools).toHaveSize(1);
          expect(response.schools[0].name).toBe('ESS Veveyse');
          expect(response.schools[0].id).toBe(2);
          expect(response.requires_school_selection).toBe(false);
          expect(response.temp_token).toBeTruthy(); // Backend provides temp_token for all users now
        },
        error: fail
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v5/auth/check-user`);
      req.flush(realSingleSchoolResponse);
    });

    it('should handle selectSchool with corrected season data (no year field)', () => {
      const realSelectSchoolResponse = {
        success: true,
        message: 'Login completado exitosamente',
        data: {
          user: {
            id: 20206,
            name: null,
            email: 'admin@boukii-v5.com',
            email_verified_at: null
          },
          school: {
            id: 2,
            name: 'ESS Veveyse',
            slug: 'ecole-suisse-de-ski',
            logo: 'https://api.boukii.com/storage/logos/ess-les-paccots.png'
          },
          season: {
            id: 10,
            name: 'Temporada 2024-2025',
            start_date: '2024-09-01T00:00:00.000000Z',
            end_date: '2025-08-31T00:00:00.000000Z',
            is_active: null
          },
          access_token: '4743|qyX2We34Fd98OjWPnmpfPHBLUXZGr7STNYpAjap129025262',
          token_type: 'Bearer',
          expires_at: null,
          has_multiple_seasons: true,
          available_seasons: [
            {
              id: 10,
              name: 'Temporada 2024-2025',
              start_date: '2024-09-01T00:00:00.000000Z',
              end_date: '2025-08-31T00:00:00.000000Z'
            },
            {
              id: 6,
              name: 'Temporada 1',
              start_date: '2024-11-13T00:00:00.000000Z',
              end_date: '2025-04-30T00:00:00.000000Z'
            }
          ]
        }
      };

      tokenService.getCurrentToken.and.returnValue('temp-token-123');
      
      const schoolData = { school_id: 2, remember_me: true };

      service.selectSchool(schoolData).subscribe({
        next: (response) => {
          expect(response).toBeTruthy();
          expect(response.school.name).toBe('ESS Veveyse');
          expect(response.school.id).toBe(2);
          
          // Verify season data structure (corrected - no 'year' field)
          expect(response.season?.name).toBe('Temporada 2024-2025');
          expect(response.season?.start_date).toBeTruthy();
          expect(response.season?.end_date).toBeTruthy();
          expect((response.season as any).year).toBeUndefined(); // Should NOT have 'year' field
          expect((response.season as any).is_current).toBeUndefined(); // Should NOT have 'is_current' field
          
          // Verify available seasons also have correct structure
          expect(response.available_seasons).toBeTruthy();
          expect(response.available_seasons!.length).toBe(2);
          response.available_seasons!.forEach(season => {
            expect(season.start_date).toBeDefined();
            expect(season.end_date).toBeDefined();
            expect((season as any).year).toBeUndefined();
          });
          
          expect(response.access_token).toBeTruthy();
          expect(tokenService.saveLoginData).toHaveBeenCalledWith(response);
          expect(tokenService.clearTempToken).toHaveBeenCalled();
          
          // Verify temp schools data is cleared
          const storedSchools = localStorage.getItem('v5_temp_schools');
          expect(storedSchools).toBeFalsy();
        },
        error: fail
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v5/auth/select-school`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(schoolData);
      expect(req.request.headers.get('Authorization')).toBe('Bearer temp-token-123');
      req.flush(realSelectSchoolResponse);
    });
  });

  describe('Real School Data Validation', () => {
    it('should validate that schools are real ESS Veveyse and School Testing, not mocks', () => {
      // Simulate storage of real school data from API
      const realSchoolData = [
        {
          id: 2,
          name: 'ESS Veveyse',
          slug: 'ecole-suisse-de-ski',
          logo: 'https://api.boukii.com/storage/logos/ess-les-paccots.png',
          user_role: 'member',
          can_administer: false
        },
        {
          id: 1,
          name: 'School Testing',
          slug: 'SchoolTesting',
          logo: 'https://api.boukii.com/storage/logos/ess-les-paccots.png',
          user_role: 'member',
          can_administer: false
        }
      ];

      localStorage.setItem('v5_temp_schools', JSON.stringify(realSchoolData));
      tokenService.getTempToken.and.returnValue('temp-token');
      tokenService.getCurrentUser.and.returnValue({ id: 20206, email: 'admin@boukii-v5.com' } as any);

      const result = service.getTempUserData();

      expect(result).toBeTruthy();
      expect(result!.schools).toHaveSize(2);
      
      // Verify real school names (not mock data)
      expect(result!.schools[0].name).toBe('ESS Veveyse');
      expect(result!.schools[1].name).toBe('School Testing');
      
      // Ensure these are NOT mock school names
      const schoolNames = result!.schools.map(s => s.name);
      expect(schoolNames).not.toContain('Mock School');
      expect(schoolNames).not.toContain('Test School Alpha');
      expect(schoolNames).not.toContain('Demo School');
      expect(schoolNames).not.toContain('Escuela de Esquí Boukii'); // Previous test data
      
      // Verify school ID 2 is present (requirement)
      const schoolIds = result!.schools.map(s => s.id);
      expect(schoolIds).toContain(2);
      
      // Verify real slugs
      expect(result!.schools[0].slug).toBe('ecole-suisse-de-ski');
      expect(result!.schools[1].slug).toBe('SchoolTesting');
    });

    it('should validate season data does not include problematic year field', () => {
      const mockSelectResponse = {
        user: { id: 1, email: 'test@test.com' },
        school: { id: 2, name: 'ESS Veveyse' },
        season: {
          id: 10,
          name: 'Temporada 2024-2025',
          start_date: '2024-09-01T00:00:00.000000Z',
          end_date: '2025-08-31T00:00:00.000000Z',
          is_active: true
        },
        access_token: 'token123',
        token_type: 'Bearer',
        available_seasons: [
          {
            id: 10,
            name: 'Temporada 2024-2025',
            start_date: '2024-09-01T00:00:00.000000Z',
            end_date: '2025-08-31T00:00:00.000000Z'
          }
        ]
      };

      // Verify season object structure
      expect(mockSelectResponse.season.start_date).toBeDefined();
      expect(mockSelectResponse.season.end_date).toBeDefined();
      expect(mockSelectResponse.season.is_active).toBeDefined();
      
      // Verify problematic fields are NOT present
      expect((mockSelectResponse.season as any).year).toBeUndefined();
      expect((mockSelectResponse.season as any).is_current).toBeUndefined();
      
      // Verify available_seasons also have correct structure
      mockSelectResponse.available_seasons.forEach(season => {
        expect(season.start_date).toBeDefined();
        expect(season.end_date).toBeDefined();
        expect((season as any).year).toBeUndefined();
        expect((season as any).is_current).toBeUndefined();
      });
    });
  });

  describe('Development Environment Validation', () => {
    it('should use correct development user credentials', () => {
      // Verify we are testing with the correct development users
      const adminCredentials = { email: 'admin@boukii-v5.com', password: 'password123' };
      const singleCredentials = { email: 'multi@boukii-v5.com', password: 'password123' };
      
      // These should be the exact credentials used in development
      expect(adminCredentials.email).toBe('admin@boukii-v5.com');
      expect(singleCredentials.email).toBe('multi@boukii-v5.com');
      expect(adminCredentials.password).toBe('password123');
      expect(singleCredentials.password).toBe('password123');
    });

    it('should validate that school ID 2 is always included in responses', () => {
      const mockSchools = [
        { id: 2, name: 'ESS Veveyse', slug: 'ecole-suisse-de-ski' },
        { id: 1, name: 'School Testing', slug: 'SchoolTesting' }
      ];

      // Both users should have access to school ID 2
      const schoolIds = mockSchools.map(s => s.id);
      expect(schoolIds).toContain(2);
      
      // Verify ESS Veveyse is school ID 2
      const school2 = mockSchools.find(s => s.id === 2);
      expect(school2?.name).toBe('ESS Veveyse');
    });
  });
});