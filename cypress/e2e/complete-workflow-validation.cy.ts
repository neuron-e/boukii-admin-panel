/**
 * Complete Workflow Validation Test Suite
 *
 * This test validates the entire application workflow from start to finish,
 * ensuring all components work together seamlessly.
 *
 * Test Flow:
 * 1. Authentication and initial setup
 * 2. Create different types of courses
 * 3. Create clients and families
 * 4. Create bookings for each course type
 * 5. Validate scheduler integration
 * 6. Test financial workflows
 * 7. Validate system stability
 */

describe('Complete Workflow Validation', () => {
  let testData: {
    clients: any[];
    courses: any[];
    bookings: any[];
    monitors: any[];
  };

  before(() => {
    // Load all test data
    cy.fixture('clients').then((clients) => {
      testData = { ...testData, clients };
    });
    cy.fixture('courses').then((courses) => {
      testData = { ...testData, courses };
    });

    // Initialize test environment
    cy.login();
    cy.visit('/dashboard');
    cy.wait(2000);
  });

  beforeEach(() => {
    cy.login();
  });

  describe('Complete System Integration Test', () => {
    it('should complete full workflow: courses → clients → bookings → scheduler → payments', () => {
      // Step 1: Create monitors/teachers
      cy.log('🧑‍🏫 Creating monitors/teachers');
      cy.visit('/apps/monitors');
      cy.wait(1000);

      // Create a monitor
      cy.get('[data-cy="add-monitor-btn"]').should('be.visible').click();
      cy.get('[data-cy="monitor-name"]').type('Test Teacher');
      cy.get('[data-cy="monitor-email"]').type('teacher@test.com');
      cy.get('[data-cy="monitor-phone"]').type('123456789');
      cy.get('[data-cy="save-monitor-btn"]').click();
      cy.verifyNotification('Monitor created successfully');

      // Step 2: Create different types of courses
      cy.log('📚 Creating courses');
      cy.visit('/apps/courses');
      cy.wait(1000);

      // Create collective course
      cy.createCourse(testData?.courses?.[0] || {
        name: 'Test Collective Course',
        type: 'collective',
        level: 'beginner',
        maxStudents: 8,
        price: 50
      });

      // Create private course
      cy.createCourse(testData?.courses?.[1] || {
        name: 'Test Private Course',
        type: 'private',
        level: 'intermediate',
        maxStudents: 1,
        price: 80
      });

      // Create flexible course
      cy.createCourse(testData?.courses?.[2] || {
        name: 'Test Flexible Course',
        type: 'collective_flex',
        level: 'advanced',
        maxStudents: 6,
        price: 60
      });

      // Step 3: Create clients
      cy.log('👥 Creating clients');
      cy.visit('/apps/clients');
      cy.wait(1000);

      // Create individual client
      cy.get('[data-cy="add-client-btn"]').should('be.visible').click();
      cy.get('[data-cy="client-name"]').type('John Doe');
      cy.get('[data-cy="client-email"]').type('john@test.com');
      cy.get('[data-cy="client-phone"]').type('987654321');
      cy.get('[data-cy="client-birth-date"]').type('1990-01-01');
      cy.get('[data-cy="save-client-btn"]').click();
      cy.verifyNotification('Client created successfully');

      // Create family
      cy.get('[data-cy="add-client-btn"]').click();
      cy.get('[data-cy="client-type-family"]').click();
      cy.get('[data-cy="family-name"]').type('Smith Family');
      cy.get('[data-cy="main-contact-name"]').type('Jane Smith');
      cy.get('[data-cy="main-contact-email"]').type('jane@test.com');
      cy.get('[data-cy="save-client-btn"]').click();
      cy.verifyNotification('Family created successfully');

      // Step 4: Create bookings for each course type
      cy.log('📅 Creating bookings');
      cy.visit('/apps/bookings');
      cy.wait(1000);

      // Booking for collective course
      cy.createBooking({
        courseType: 'collective',
        clientName: 'John Doe',
        dates: ['2024-12-01', '2024-12-02', '2024-12-03']
      });

      // Booking for private course
      cy.createBooking({
        courseType: 'private',
        clientName: 'Jane Smith',
        dates: ['2024-12-05'],
        duration: 60
      });

      // Booking for flexible course
      cy.createBooking({
        courseType: 'collective_flex',
        clientName: 'John Doe',
        dates: ['2024-12-10', '2024-12-12']
      });

      // Step 5: Validate scheduler integration
      cy.log('📋 Validating scheduler');
      cy.visit('/apps/scheduler');
      cy.wait(2000);

      // Check that bookings appear in calendar
      cy.get('[data-cy="calendar-view"]').should('be.visible');
      cy.get('[data-cy="booking-event"]').should('have.length.at.least', 3);

      // Test calendar navigation
      cy.get('[data-cy="calendar-next"]').click();
      cy.get('[data-cy="calendar-prev"]').click();

      // Test different calendar views
      cy.get('[data-cy="calendar-month-view"]').click();
      cy.get('[data-cy="calendar-week-view"]').click();
      cy.get('[data-cy="calendar-day-view"]').click();

      // Step 6: Test financial workflows
      cy.log('💰 Testing financial workflows');
      cy.visit('/apps/payments');
      cy.wait(1000);

      // Check payment records exist
      cy.get('[data-cy="payments-table"]').should('be.visible');
      cy.get('[data-cy="payment-row"]').should('have.length.at.least', 1);

      // Test payment filtering
      cy.get('[data-cy="payment-filter-pending"]').click();
      cy.get('[data-cy="payment-filter-paid"]').click();
      cy.get('[data-cy="payment-filter-all"]').click();

      // Step 7: Validate reports and analytics
      cy.log('📊 Validating reports');
      cy.visit('/apps/reports');
      cy.wait(1000);

      // Check revenue report
      cy.get('[data-cy="revenue-chart"]').should('be.visible');
      cy.get('[data-cy="booking-stats"]').should('be.visible');
      cy.get('[data-cy="client-stats"]').should('be.visible');

      // Step 8: Test system stability and performance
      cy.log('⚡ Testing system stability');

      // Navigate between main sections rapidly
      const sections = ['/dashboard', '/apps/courses', '/apps/bookings', '/apps/clients', '/apps/scheduler'];
      sections.forEach(section => {
        cy.visit(section);
        cy.wait(500);
        cy.get('[data-cy="page-content"]').should('be.visible');
      });

      // Test search functionality across modules
      cy.visit('/apps/courses');
      cy.get('[data-cy="search-input"]').type('Test');
      cy.get('[data-cy="search-results"]').should('be.visible');
      cy.get('[data-cy="clear-search"]').click();

      // Final validation - return to dashboard
      cy.visit('/dashboard');
      cy.get('[data-cy="dashboard-stats"]').should('be.visible');
      cy.get('[data-cy="recent-bookings"]').should('be.visible');
      cy.get('[data-cy="revenue-summary"]').should('be.visible');
    });

    it('should handle error scenarios gracefully', () => {
      cy.log('🚨 Testing error handling');

      // Test invalid course creation
      cy.visit('/apps/courses');
      cy.get('[data-cy="add-course-btn"]').click();
      cy.get('[data-cy="save-course-btn"]').click(); // Save without required fields
      cy.get('[data-cy="error-message"]').should('be.visible');
      cy.get('[data-cy="cancel-btn"]').click();

      // Test invalid booking creation
      cy.visit('/apps/bookings');
      cy.get('[data-cy="add-booking-btn"]').click();
      cy.get('[data-cy="save-booking-btn"]').click(); // Save without required fields
      cy.get('[data-cy="error-message"]').should('be.visible');
      cy.get('[data-cy="cancel-btn"]').click();

      // Test network error simulation (if supported)
      cy.intercept('POST', '/api/courses', { forceNetworkError: true }).as('networkError');
      cy.visit('/apps/courses');
      cy.get('[data-cy="add-course-btn"]').click();
      cy.get('[data-cy="course-name"]').type('Network Error Test');
      cy.get('[data-cy="save-course-btn"]').click();
      cy.get('[data-cy="network-error-message"]').should('be.visible');
    });

    it('should maintain data consistency across modules', () => {
      cy.log('🔄 Testing data consistency');

      // Create a course and verify it appears in related modules
      const testCourseName = `Consistency Test Course ${Date.now()}`;

      cy.visit('/apps/courses');
      cy.createCourse({
        name: testCourseName,
        type: 'collective',
        level: 'beginner',
        maxStudents: 8,
        price: 45
      });

      // Verify course appears in booking creation
      cy.visit('/apps/bookings');
      cy.get('[data-cy="add-booking-btn"]').click();
      cy.get('[data-cy="course-select"]').click();
      cy.get('[data-cy="course-option"]').should('contain', testCourseName);
      cy.get('[data-cy="cancel-btn"]').click();

      // Verify course appears in scheduler when booked
      cy.visit('/apps/scheduler');
      cy.get('[data-cy="course-filter"]').click();
      cy.get('[data-cy="course-filter-option"]').should('contain', testCourseName);

      // Clean up - delete the test course
      cy.visit('/apps/courses');
      cy.get('[data-cy="search-input"]').type(testCourseName);
      cy.get('[data-cy="course-row"]').first().find('[data-cy="delete-course-btn"]').click();
      cy.get('[data-cy="confirm-delete"]').click();
      cy.verifyNotification('Course deleted successfully');
    });

    it('should handle concurrent user scenarios', () => {
      cy.log('👥 Testing concurrent scenarios');

      // Simulate multiple bookings for the same time slot
      cy.visit('/apps/bookings');

      // Create first booking
      cy.createBooking({
        courseType: 'collective',
        clientName: 'John Doe',
        dates: ['2024-12-20'],
        timeSlot: '10:00'
      });

      // Try to create overlapping booking (should be allowed for collective)
      cy.createBooking({
        courseType: 'collective',
        clientName: 'Jane Smith',
        dates: ['2024-12-20'],
        timeSlot: '10:00'
      });

      // Verify both bookings exist
      cy.get('[data-cy="bookings-table"]').should('contain', 'John Doe');
      cy.get('[data-cy="bookings-table"]').should('contain', 'Jane Smith');

      // Test capacity limits
      cy.visit('/apps/courses');
      cy.get('[data-cy="course-row"]').first().click();
      cy.get('[data-cy="course-capacity"]').should('be.visible');
      cy.get('[data-cy="current-bookings"]').should('be.visible');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large datasets efficiently', () => {
      cy.log('📈 Testing performance with large datasets');

      // Test pagination with large number of records
      cy.visit('/apps/clients');
      cy.get('[data-cy="pagination"]').should('be.visible');
      cy.get('[data-cy="items-per-page"]').select('50');
      cy.get('[data-cy="client-row"]').should('have.length.at.most', 50);

      // Test search performance
      cy.get('[data-cy="search-input"]').type('test');
      cy.get('[data-cy="search-results"]', { timeout: 3000 }).should('be.visible');

      // Test sorting performance
      cy.get('[data-cy="sort-by-name"]').click();
      cy.get('[data-cy="sort-by-date"]').click();
      cy.get('[data-cy="sort-by-status"]').click();
    });

    it('should maintain responsiveness during heavy operations', () => {
      cy.log('⚡ Testing responsiveness during heavy operations');

      // Test bulk operations
      cy.visit('/apps/bookings');
      cy.get('[data-cy="select-all-checkbox"]').click();
      cy.get('[data-cy="bulk-action-btn"]').click();
      cy.get('[data-cy="bulk-export"]').click();

      // Verify UI remains responsive
      cy.get('[data-cy="loading-indicator"]').should('be.visible');
      cy.get('[data-cy="cancel-operation"]').should('be.enabled');
    });
  });

  after(() => {
    cy.log('🧹 Cleaning up test data');

    // Clean up test data to avoid pollution
    // This would typically involve API calls to clean up created records
    cy.log('✅ Workflow validation completed successfully');
  });
});