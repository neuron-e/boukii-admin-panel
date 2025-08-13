import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthV5Service, CheckUserResponse } from '../../../core/services/auth-v5.service';
import { TokenV5Service } from '../../../core/services/token-v5.service';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

describe('AuthV5Service - Real Integration Tests', () => {
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

  describe('Real Backend Response Structure', () => {
    it('should handle real multi-school checkUser response correctly', () => {
      const realBackendResponse = {
        success: true,
        message: 'Credenciales verificadas correctamente',
        data: {
          user: {
            id: 1,
            name: null,
            email: 'admin@boukii-v5.com',
            email_verified_at: null
          },
          schools: [
            {
              id: 1,
              name: 'Escuela de Esquí Boukii',
              slug: 'escuela-esqui-boukii',
              logo: 'boukii-logo.png',
              user_role: 'member',
              can_administer: false
            },
            {
              id: 2,
              name: 'Escuela Multi Deportes',
              slug: 'escuela-multi-deportes',
              logo: 'multi-logo.png',
              user_role: 'member',
              can_administer: false
            }
          ],
          requires_school_selection: true,
          temp_token: '5|87ksv557kjES2aLK7Df04Z0xDYvnn2tLcgY7MncY23a9f2f8'
        }
      };

      const credentials = { email: 'admin@boukii-v5.com', password: 'password123' };

      service.checkUser(credentials).subscribe({
        next: (response) => {
          expect(response).toBeTruthy();
          expect(response.user.email).toBe('admin@boukii-v5.com');
          expect(response.schools).toHaveSize(2);
          expect(response.schools[0].name).toBe('Escuela de Esquí Boukii');
          expect(response.schools[1].name).toBe('Escuela Multi Deportes');
          expect(response.requires_school_selection).toBe(true);
          expect(response.temp_token).toBeTruthy();

          // Verify temporary data is stored
          const storedSchools = localStorage.getItem('v5_temp_schools');
          expect(storedSchools).toBeTruthy();
          const parsedSchools = JSON.parse(storedSchools!);
          expect(parsedSchools).toHaveSize(2);
          expect(parsedSchools[0].name).toBe('Escuela de Esquí Boukii');

          expect(tokenService.setTempToken).toHaveBeenCalledWith(realBackendResponse.data.temp_token);
        },
        error: fail
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v5/auth/check-user`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(realBackendResponse);
    });

    it('should handle real selectSchool response with corrected Season fields', () => {
      const realSelectSchoolResponse = {
        success: true,
        message: 'Login completado exitosamente',
        data: {
          user: {
            id: 1,
            name: null,
            email: 'admin@boukii-v5.com',
            email_verified_at: null
          },
          school: {
            id: 2,
            name: 'Escuela Multi Deportes',
            slug: 'escuela-multi-deportes',
            logo: 'multi-logo.png'
          },
          season: {
            id: 2,
            name: 'Temporada 2024-2025',
            start_date: '2024-09-01T00:00:00.000000Z',
            end_date: '2025-08-31T00:00:00.000000Z',
            is_active: true
          },
          access_token: '6|OtZWOD3cdp5hr6Iqf5JJQEcMxcVyLmF7SywkeM0Q10f25d75',
          token_type: 'Bearer',
          expires_at: null,
          has_multiple_seasons: false,
          available_seasons: []
        }
      };

      tokenService.getCurrentToken.and.returnValue('temp-token-123');
      
      const schoolData = { school_id: 2, remember_me: true };

      service.selectSchool(schoolData).subscribe({
        next: (response) => {
          expect(response).toBeTruthy();
          expect(response.school.name).toBe('Escuela Multi Deportes');
          expect(response.season?.name).toBe('Temporada 2024-2025');
          expect(response.season?.start_date).toBeTruthy();
          expect(response.season?.end_date).toBeTruthy();
          expect(response.season?.is_active).toBe(true);
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

    it('should handle single school user flow correctly', () => {
      const singleSchoolResponse = {
        success: true,
        message: 'Credenciales verificadas correctamente',
        data: {
          user: {
            id: 2,
            name: null,
            email: 'multi@boukii-v5.com',
            email_verified_at: null
          },
          schools: [
            {
              id: 2,
              name: 'Escuela Multi Deportes',
              slug: 'escuela-multi-deportes',
              logo: 'multi-logo.png',
              user_role: 'member',
              can_administer: false
            }
          ],
          requires_school_selection: false,
          temp_token: '7|xyz789temp'
        }
      };

      const credentials = { email: 'multi@boukii-v5.com', password: 'password123' };

      service.checkUser(credentials).subscribe({
        next: (response) => {
          expect(response.schools).toHaveSize(1);
          expect(response.schools[0].name).toBe('Escuela Multi Deportes');
          expect(response.requires_school_selection).toBe(false);
          expect(response.temp_token).toBeTruthy(); // Backend always provides temp_token now
        },
        error: fail
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v5/auth/check-user`);
      req.flush(singleSchoolResponse);
    });
  });

  describe('School Data Validation', () => {
    it('should validate that schools have required fields from real API', () => {
      // Simulate storage of real school data
      const realSchoolData = [
        {
          id: 1,
          name: 'Escuela de Esquí Boukii',
          slug: 'escuela-esqui-boukii',
          logo: 'boukii-logo.png',
          user_role: 'member',
          can_administer: false
        }
      ];

      localStorage.setItem('v5_temp_schools', JSON.stringify(realSchoolData));
      tokenService.getTempToken.and.returnValue('temp-token');
      tokenService.getCurrentUser.and.returnValue({ id: 1, email: 'test@test.com' } as any);

      const result = service.getTempUserData();

      expect(result).toBeTruthy();
      expect(result!.schools).toHaveSize(1);
      expect(result!.schools[0].name).toBe('Escuela de Esquí Boukii');
      expect(result!.schools[0].slug).toBe('escuela-esqui-boukii');
      expect(result!.schools[0].logo).toBe('boukii-logo.png');
      expect(result!.schools[0].user_role).toBe('member');
      expect(result!.schools[0].can_administer).toBe(false);
    });
  });
});