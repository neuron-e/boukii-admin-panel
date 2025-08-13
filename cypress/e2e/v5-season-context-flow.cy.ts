describe('V5 Season Context Flow', () => {
  const testUser = {
    email: 'admin@boukii.test',
    password: 'password123'
  };

  const testSchool = {
    id: 1,
    name: 'Test School V5',
    slug: 'test-school-v5'
  };

  const testSeason = {
    id: 1,
    name: 'Season 2025',
    start_date: '2025-01-01',
    end_date: '2025-12-31'
  };

  beforeEach(() => {
    // Intercept API calls to mock responses
    cy.intercept('POST', '**/api/v5/auth/initial-login', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Login completed successfully',
        data: {
          access_token: 'cypress-test-token-123',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 1,
            name: 'Test User',
            email: testUser.email,
            role: 'admin'
          },
          school: testSchool,
          season: testSeason
        }
      }
    }).as('initialLogin');

    cy.intercept('GET', '**/api/v5/seasons', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Seasons retrieved successfully',
        data: [testSeason]
      }
    }).as('getSeasons');

    cy.intercept('GET', '**/api/v5/seasons/current', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Current season retrieved successfully',
        data: testSeason
      }
    }).as('getCurrentSeason');

    cy.intercept('POST', '**/api/v5/debug-raw-token', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Raw token debug (no middleware)',
        data: {
          authenticated: true,
          user_id: 1,
          user_email: testUser.email,
          token_id: 1,
          token_name: 'auth_v5_test-school-v5_1',
          token_context_data: {
            school_id: testSchool.id,
            school_slug: testSchool.slug,
            season_id: testSeason.id,
            season_name: testSeason.name
          },
          has_school_context: true,
          school_id_in_context: testSchool.id
        }
      }
    }).as('debugToken');
  });

  it('should complete the full V5 season context flow without errors', () => {
    // 1. Visit login page
    cy.visit('/v5/auth/login');
    cy.url().should('include', '/v5/auth/login');

    // 2. Fill login form
    cy.get('[data-cy=email-input]').type(testUser.email);
    cy.get('[data-cy=password-input]').type(testUser.password);
    cy.get('[data-cy=login-button]').click();

    // 3. Wait for login API call
    cy.wait('@initialLogin');

    // 4. Should redirect to dashboard after successful login
    cy.url().should('include', '/v5/dashboard');
    
    // 5. Verify user info is displayed
    cy.get('[data-cy=user-name]').should('contain', 'Test User');
    cy.get('[data-cy=school-name]').should('contain', testSchool.name);
    cy.get('[data-cy=season-name]').should('contain', testSeason.name);

    // 6. Navigate to seasons management
    cy.get('[data-cy=sidebar-seasons]').click();
    cy.url().should('include', '/v5/seasons');

    // 7. Wait for seasons API call - should NOT get "School context is required" error
    cy.wait('@getSeasons');

    // 8. Verify seasons are loaded successfully
    cy.get('[data-cy=seasons-list]').should('be.visible');
    cy.get('[data-cy=season-item]').should('have.length.at.least', 1);
    cy.get('[data-cy=season-item]').first().should('contain', testSeason.name);

    // 9. Test season creation (should work with proper context)
    cy.get('[data-cy=create-season-button]').click();
    cy.get('[data-cy=season-name-input]').type('New Season 2026');
    cy.get('[data-cy=season-start-date]').type('2026-01-01');
    cy.get('[data-cy=season-end-date]').type('2026-12-31');
    
    // Mock the create season API call
    cy.intercept('POST', '**/api/v5/seasons', {
      statusCode: 201,
      body: {
        success: true,
        message: 'Season created successfully',
        data: {
          id: 2,
          name: 'New Season 2026',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          is_active: true
        }
      }
    }).as('createSeason');

    cy.get('[data-cy=save-season-button]').click();
    cy.wait('@createSeason');

    // 10. Verify success notification
    cy.get('[data-cy=notification]').should('contain', 'Season created successfully');
  });

  it('should handle season selection flow when required', () => {
    // Mock a response that requires season selection
    cy.intercept('POST', '**/api/v5/auth/initial-login', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Login successful - season selection required',
        data: {
          access_token: 'cypress-temp-token-456',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          requires_season_selection: true,
          available_seasons: [testSeason],
          user: {
            id: 1,
            name: 'Test User',
            email: testUser.email,
            role: 'admin'
          },
          school: testSchool
        }
      }
    }).as('initialLoginWithSeasonSelection');

    // Mock season selection API
    cy.intercept('POST', '**/api/v5/auth/select-season', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Login completed successfully',
        data: {
          access_token: 'cypress-final-token-789',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 1,
            name: 'Test User',
            email: testUser.email,
            role: 'admin'
          },
          school: testSchool,
          season: testSeason
        }
      }
    }).as('selectSeason');

    // 1. Visit login page and login
    cy.visit('/v5/auth/login');
    cy.get('[data-cy=email-input]').type(testUser.email);
    cy.get('[data-cy=password-input]').type(testUser.password);
    cy.get('[data-cy=login-button]').click();

    cy.wait('@initialLoginWithSeasonSelection');

    // 2. Should redirect to season selection page
    cy.url().should('include', '/v5/auth/season-selection');

    // 3. Select a season
    cy.get('[data-cy=season-option]').first().click();
    cy.get('[data-cy=select-season-button]').click();

    cy.wait('@selectSeason');

    // 4. Should redirect to dashboard after season selection
    cy.url().should('include', '/v5/dashboard');
    cy.get('[data-cy=season-name]').should('contain', testSeason.name);
  });

  it('should maintain context when navigating between pages', () => {
    // Complete login first
    cy.visit('/v5/auth/login');
    cy.get('[data-cy=email-input]').type(testUser.email);
    cy.get('[data-cy=password-input]').type(testUser.password);
    cy.get('[data-cy=login-button]').click();
    cy.wait('@initialLogin');

    // Navigate to different sections and verify context is maintained
    const sections = [
      { route: '/v5/dashboard', selector: '[data-cy=dashboard-header]' },
      { route: '/v5/seasons', selector: '[data-cy=seasons-header]' },
      { route: '/v5/bookings', selector: '[data-cy=bookings-header]' },
      { route: '/v5/courses', selector: '[data-cy=courses-header]' }
    ];

    sections.forEach((section) => {
      cy.visit(section.route);
      cy.url().should('include', section.route);
      
      // Verify school and season context are still available
      cy.get('[data-cy=school-name]').should('contain', testSchool.name);
      cy.get('[data-cy=season-name]').should('contain', testSeason.name);
      
      // Verify page loads successfully (no context errors)
      cy.get(section.selector).should('be.visible');
    });
  });

  it('should handle token refresh with maintained context', () => {
    // Mock token refresh scenario
    let callCount = 0;
    cy.intercept('GET', '**/api/v5/auth/me', (req) => {
      callCount++;
      if (callCount === 1) {
        // First call fails (token expired)
        req.reply({
          statusCode: 401,
          body: {
            success: false,
            message: 'Token expired',
            error_code: 'TOKEN_EXPIRED'
          }
        });
      } else {
        // Second call succeeds (token refreshed)
        req.reply({
          statusCode: 200,
          body: {
            success: true,
            message: 'User info retrieved successfully',
            data: {
              id: 1,
              name: 'Test User',
              email: testUser.email,
              school: testSchool,
              season: testSeason
            }
          }
        });
      }
    }).as('getCurrentUser');

    // Complete login
    cy.visit('/v5/auth/login');
    cy.get('[data-cy=email-input]').type(testUser.email);
    cy.get('[data-cy=password-input]').type(testUser.password);
    cy.get('[data-cy=login-button]').click();
    cy.wait('@initialLogin');

    // Trigger a request that causes token refresh
    cy.get('[data-cy=user-profile-button]').click();
    
    // Should handle token refresh gracefully and maintain context
    cy.wait('@getCurrentUser');
    cy.get('[data-cy=user-name]').should('contain', 'Test User');
    cy.get('[data-cy=school-name]').should('contain', testSchool.name);
  });
});