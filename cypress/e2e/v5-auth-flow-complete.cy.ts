describe('V5 Complete Authentication Flow', () => {
  const testUser = {
    email: 'admin@boukii-v5.com',
    password: 'password123'
  };

  const testSchools = [
    {
      id: 1,
      name: 'Test School 1',
      slug: 'test-school-1'
    },
    {
      id: 2,
      name: 'Test School 2', 
      slug: 'test-school-2'
    }
  ];

  const testSeasons = [
    {
      id: 1,
      name: 'Season 2025',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      is_active: true,
      is_closed: false,
      is_historical: false,
      school_id: 2,
      created_at: '2025-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
    cy.clearCookies();

    // Mock the initial login API call
    cy.intercept('POST', '**/api/v5/auth/initial-login', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Login completed successfully',
        data: {
          access_token: 'temp-token-12345',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 1,
            name: 'Test Admin User',
            email: testUser.email,
            role: 'admin'
          },
          schools: testSchools,
          requires_school_selection: true
        }
      }
    }).as('initialLogin');

    // Mock school selection API call
    cy.intercept('POST', '**/api/v5/auth/select-school', {
      statusCode: 200,
      body: {
        success: true,
        message: 'School selected successfully',
        data: {
          access_token: 'permanent-token-67890',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 1,
            name: 'Test Admin User',
            email: testUser.email,
            role: 'admin'
          },
          school: testSchools[1], // Select school 2
          season: testSeasons[0]
        }
      }
    }).as('selectSchool');

    // Mock the /me endpoint for user info validation
    cy.intercept('GET', '**/api/v5/auth/me', {
      statusCode: 200,
      body: {
        success: true,
        message: 'User info retrieved successfully',
        data: {
          user: {
            id: 1,
            name: 'Test Admin User',
            email: testUser.email,
            role: 'admin'
          }
        }
      }
    }).as('getUserInfo');

    // Mock seasons API call
    cy.intercept('GET', '**/api/v5/seasons', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Seasons retrieved successfully',
        data: testSeasons
      }
    }).as('getSeasons');

    // Mock dashboard API calls
    cy.intercept('GET', '**/api/v5/dashboard/stats', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          total_clients: 45,
          total_reservations: 128,
          total_revenue: 15750.50,
          active_courses: 12
        }
      }
    }).as('getDashboardStats');

    cy.intercept('GET', '**/api/v5/dashboard/recent-activity', {
      statusCode: 200,
      body: {
        success: true,
        data: []
      }
    }).as('getRecentActivity');

    cy.intercept('GET', '**/api/v5/dashboard/todays-reservations', {
      statusCode: 200,
      body: {
        success: true,
        data: []
      }
    }).as('getTodaysReservations');
  });

  it('should complete full authentication flow: login -> school selection -> dashboard', () => {
    // Step 1: Visit login page
    cy.visit('/v5/login');
    cy.url().should('include', '/v5/login');

    // Step 2: Fill login form and submit
    cy.get('[data-cy=email-input]', { timeout: 10000 }).should('be.visible').type(testUser.email);
    cy.get('[data-cy=password-input]').should('be.visible').type(testUser.password);
    cy.get('[data-cy=login-button]').should('be.visible').click();

    // Wait for initial login API call
    cy.wait('@initialLogin', { timeout: 10000 });

    // Step 3: Should redirect to school selector since requires_school_selection = true
    cy.url({ timeout: 15000 }).should('include', '/v5/school-selector');
    
    // Verify school selector page loads
    cy.contains('Seleccionar Escuela').should('be.visible');
    cy.get('[data-cy=school-card]').should('have.length', 2);

    // Step 4: Select a school
    cy.get('[data-cy=school-card]').contains('Test School 2').click();
    cy.get('[data-cy=select-school-button]').click();

    // Wait for school selection API call
    cy.wait('@selectSchool', { timeout: 10000 });

    // Step 5: Should redirect to dashboard
    cy.url({ timeout: 15000 }).should('include', '/v5/dashboard');

    // Step 6: Verify dashboard loads successfully
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    
    // Wait for dashboard API calls
    cy.wait('@getDashboardStats');
    cy.wait('@getRecentActivity');
    cy.wait('@getTodaysReservations');

    // Step 7: Verify dashboard content
    cy.get('[data-cy=dashboard-stats]').should('be.visible');
    cy.get('[data-cy=total-clients]').should('contain', '45');
    cy.get('[data-cy=total-reservations]').should('contain', '128');

    // Step 8: Verify authentication state persists
    cy.reload();
    cy.url({ timeout: 10000 }).should('include', '/v5/dashboard');
    cy.contains('Dashboard').should('be.visible');
  });

  it('should handle token localStorage sync correctly', () => {
    cy.visit('/v5/login');
    
    // Complete login
    cy.get('[data-cy=email-input]').type(testUser.email);
    cy.get('[data-cy=password-input]').type(testUser.password);
    cy.get('[data-cy=login-button]').click();
    
    cy.wait('@initialLogin');
    
    // Go to school selector and select school
    cy.url().should('include', '/v5/school-selector');
    cy.get('[data-cy=school-card]').contains('Test School 2').click();
    cy.get('[data-cy=select-school-button]').click();
    
    cy.wait('@selectSchool');
    
    // Verify token is stored in localStorage
    cy.window().then((win) => {
      const token = win.localStorage.getItem('boukii_v5_token');
      expect(token).to.equal('permanent-token-67890');
      
      const user = JSON.parse(win.localStorage.getItem('boukii_v5_user') || '{}');
      expect(user.email).to.equal(testUser.email);
      
      const school = JSON.parse(win.localStorage.getItem('boukii_v5_school') || '{}');
      expect(school.name).to.equal('Test School 2');
      
      const season = JSON.parse(win.localStorage.getItem('boukii_v5_season') || '{}');
      expect(season.name).to.equal('Season 2025');
    });

    // Verify dashboard loads
    cy.url().should('include', '/v5/dashboard');
  });

  it('should handle API errors gracefully', () => {
    // Mock login failure
    cy.intercept('POST', '**/api/v5/auth/initial-login', {
      statusCode: 401,
      body: {
        success: false,
        message: 'Invalid credentials'
      }
    }).as('loginFailure');

    cy.visit('/v5/login');
    
    cy.get('[data-cy=email-input]').type('wrong@email.com');
    cy.get('[data-cy=password-input]').type('wrongpassword');
    cy.get('[data-cy=login-button]').click();
    
    cy.wait('@loginFailure');
    
    // Should show error message
    cy.contains('Invalid credentials').should('be.visible');
    cy.url().should('include', '/v5/login');
  });

  it('should handle /me API response structures correctly', () => {
    // Test different API response structures for /me endpoint
    cy.intercept('GET', '**/api/v5/auth/me', {
      statusCode: 200,
      body: {
        success: true,
        message: 'User info retrieved',
        data: {
          // User directly in data (not data.user)
          id: 1,
          name: 'Direct User',
          email: testUser.email,
          role: 'admin'
        }
      }
    }).as('getUserInfoDirectData');

    cy.visit('/v5/login');
    
    // Complete login flow
    cy.get('[data-cy=email-input]').type(testUser.email);
    cy.get('[data-cy=password-input]').type(testUser.password);
    cy.get('[data-cy=login-button]').click();
    cy.wait('@initialLogin');
    
    cy.get('[data-cy=school-card]').contains('Test School 2').click();
    cy.get('[data-cy=select-school-button]').click();
    cy.wait('@selectSchool');
    
    // Should successfully reach dashboard even with different API structure
    cy.url().should('include', '/v5/dashboard');
    cy.contains('Dashboard').should('be.visible');
  });

  it('should retry authentication on guard failures', () => {
    // Mock initial failure then success for /me endpoint
    let callCount = 0;
    cy.intercept('GET', '**/api/v5/auth/me', (req) => {
      callCount++;
      if (callCount <= 2) {
        // First 2 calls fail
        req.reply({
          statusCode: 500,
          body: { success: false, message: 'Server error' }
        });
      } else {
        // 3rd call succeeds
        req.reply({
          statusCode: 200,
          body: {
            success: true,
            data: {
              user: {
                id: 1,
                name: 'Test User',
                email: testUser.email,
                role: 'admin'
              }
            }
          }
        });
      }
    }).as('getUserInfoRetry');

    // Complete login first
    cy.visit('/v5/login');
    cy.get('[data-cy=email-input]').type(testUser.email);
    cy.get('[data-cy=password-input]').type(testUser.password);
    cy.get('[data-cy=login-button]').click();
    cy.wait('@initialLogin');
    
    cy.get('[data-cy=school-card]').contains('Test School 2').click();
    cy.get('[data-cy=select-school-button]').click();
    cy.wait('@selectSchool');

    // Navigate directly to dashboard to trigger guard
    cy.visit('/v5/dashboard');
    
    // Should eventually succeed after retries
    cy.url({ timeout: 20000 }).should('include', '/v5/dashboard');
    cy.contains('Dashboard').should('be.visible');
  });
});