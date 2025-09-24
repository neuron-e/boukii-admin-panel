/// <reference types="cypress" />

describe('Booking Management Tests', () => {
  beforeEach(() => {
    cy.login()
    // Create test courses
    cy.fixture('courses').then((courses) => {
      cy.createCourse(courses.collectiveCourse)
      cy.createCourse(courses.privateCourse)
      cy.createCourse(courses.flexibleCourse)
    })
  })

  describe('Booking Creation - Complete Flow', () => {
    it('should complete full booking flow for collective course', () => {
      cy.fixture('clients').then((clients) => {
        cy.visit('/bookings/create')

        // Step 1: Client Selection
        cy.get('[data-cy="client-search-input"]').type(clients.testClient.email)
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()

        // Verify client is selected
        cy.get('[data-cy="selected-client-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)

        cy.get('[data-cy="next-step-button"]').click()

        // Step 2: Participants Selection
        cy.get('[data-cy="participants-section"]').should('be.visible')
        cy.get('[data-cy="participants-count"]').should('contain', '1')

        // Can add more participants for collective courses
        cy.get('[data-cy="add-participant-button"]').click()
        cy.get('[data-cy="participant-name-1"]').type('Ana García')
        cy.get('[data-cy="participant-age-1"]').type('25')

        cy.get('[data-cy="next-step-button"]').click()

        // Step 3: Sport and Level Selection
        cy.get('[data-cy="sport-select"]').select('1') // Tennis
        cy.get('[data-cy="level-select"]').select('1') // Beginner
        cy.get('[data-cy="next-step-button"]').click()

        // Step 4: Course Selection
        cy.get('[data-cy="course-tab-collective"]').should('have.class', 'active')
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="course-selection-summary"]').should('be.visible')
        cy.get('[data-cy="next-step-button"]').click()

        // Step 5: Details Configuration
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="date-checkbox"]').first().should('be.checked')

        // Verify duration field is working (Bug Fix #1)
        cy.get('[data-cy="duration-field"]').should('be.visible')
        cy.get('[data-cy="duration-field"]').should('not.be.empty')
        cy.get('[data-cy="duration-field"]').should('have.value', '1h')

        // Select hour
        cy.get('[data-cy="hour-select"]').select('10:00')

        // Add extras if available
        cy.get('[data-cy="extras-section"]').then($extras => {
          if ($extras.is(':visible')) {
            cy.get('[data-cy="extra-checkbox"]').first().check()
          }
        })

        cy.get('[data-cy="next-step-button"]').click()

        // Step 6: Observations
        cy.get('[data-cy="client-observations"]').type('Reserva creada automáticamente por test')
        cy.get('[data-cy="school-observations"]').type('Notas internas del test')

        cy.get('[data-cy="complete-booking-button"]').click()
        cy.verifyNotification('Booking created successfully')

        // Verify booking appears in bookings list
        cy.visit('/bookings')
        cy.get('[data-cy="booking-row"]').should('contain', clients.testClient.first_name)
      })
    })

    it('should handle private flexible course booking with duration selection', () => {
      cy.fixture('clients').then((clients) => {
        cy.visit('/bookings/create')

        // Navigate to private course selection
        cy.get('[data-cy="client-search-input"]').type(clients.testClient.email)
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').select('1')
        cy.get('[data-cy="level-select"]').select('1')
        cy.get('[data-cy="next-step-button"]').click()

        // Select private course tab
        cy.get('[data-cy="course-tab-private"]').click()
        cy.get('[data-cy="course-card"]').contains('Flexible').click()
        cy.get('[data-cy="next-step-button"]').click()

        // Configure flexible course details
        cy.get('[data-cy="date-input"]').type('2024-12-20')
        cy.get('[data-cy="hour-select"]').select('14:00')

        // Test duration selection for flexible course (Bug Fix #1)
        cy.get('[data-cy="duration-select"]').should('be.visible')
        cy.get('[data-cy="duration-select"] option').should('have.length.greaterThan', 1)
        cy.get('[data-cy="duration-select"]').select('1h')

        // Verify price updates based on duration and participants
        cy.get('[data-cy="price-preview"]').should('be.visible')
        cy.get('[data-cy="price-preview"]').should('contain', '€')

        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="complete-booking-button"]').click()
        cy.verifyNotification('Booking created successfully')
      })
    })

    it('should handle collective flexible course with correct date selection logic', () => {
      cy.fixture('clients').then((clients) => {
        cy.visit('/bookings/create')

        // Navigate to collective flexible course
        cy.get('[data-cy="client-search-input"]').type(clients.testClient.email)
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').select('1')
        cy.get('[data-cy="level-select"]').select('1')
        cy.get('[data-cy="next-step-button"]').click()

        // Select collective flexible course
        cy.get('[data-cy="course-tab-collective"]').click()
        cy.get('[data-cy="course-card"]').contains('Flexible').click()
        cy.get('[data-cy="next-step-button"]').click()

        // Test flexible date selection (Bug Fix #2)
        cy.get('[data-cy="flex-date-item"]').should('have.length.greaterThan', 0)

        // Test checkbox behavior is not inverted
        cy.get('[data-cy="flex-date-checkbox"]').first().should('not.be.checked')
        cy.get('[data-cy="flex-date-checkbox"]').first().check()
        cy.get('[data-cy="flex-date-checkbox"]').first().should('be.checked')

        // Verify extras become enabled when date is selected
        cy.get('[data-cy="extras-select"]').should('not.be.disabled')

        // Test unchecking works correctly
        cy.get('[data-cy="flex-date-checkbox"]').first().uncheck()
        cy.get('[data-cy="flex-date-checkbox"]').first().should('not.be.checked')
        cy.get('[data-cy="extras-select"]').should('be.disabled')

        // Check again and continue
        cy.get('[data-cy="flex-date-checkbox"]').first().check()
        cy.get('[data-cy="flex-date-checkbox"]').first().should('be.checked')

        // Select second date to test multiple dates
        cy.get('[data-cy="flex-date-checkbox"]').eq(1).check()
        cy.get('[data-cy="flex-date-checkbox"]').eq(1).should('be.checked')

        // Verify no duplicate dates (Bug Fix #2)
        cy.get('[data-cy="flex-date-item"]').then($items => {
          const dates = []
          $items.each((index, item) => {
            const dateText = Cypress.$(item).find('[data-cy="date-text"]').text()
            dates.push(dateText)
          })
          const uniqueDates = [...new Set(dates)]
          expect(dates.length).to.equal(uniqueDates.length)
        })

        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="complete-booking-button"]').click()
        cy.verifyNotification('Booking created successfully')
      })
    })
  })

  describe('Booking Summary and Client Consistency', () => {
    it('should maintain correct client throughout booking process (Bug Fix #3)', () => {
      cy.fixture('clients').then((clients) => {
        // Create initial booking
        cy.createBooking({
          clientEmail: clients.testClient.email
        })

        cy.visit('/bookings')
        cy.get('[data-cy="booking-row"]').first().click()

        // Verify correct client is displayed in summary
        cy.get('[data-cy="booking-client-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)

        cy.get('[data-cy="booking-summary-client-email"]')
          .should('contain', clients.testClient.email)

        // Store original client name for comparison
        cy.get('[data-cy="booking-client-name"]').invoke('text').as('originalClientName')

        // Add second activity
        cy.get('[data-cy="add-activity-button"]').click()

        // Verify client header still shows correct client during activity creation
        cy.get('[data-cy="client-header-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)

        // Skip client selection (should use same client)
        cy.get('[data-cy="skip-client-selection"]').click()
        cy.get('[data-cy="next-step-button"]').click()

        // Complete second activity
        cy.get('[data-cy="sport-select"]').select('1')
        cy.get('[data-cy="level-select"]').select('1')
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="save-activity-button"]').click()

        // Return to summary and verify client hasn't changed
        cy.get('[data-cy="return-to-summary-button"]').click()
        cy.get('@originalClientName').then((originalName) => {
          cy.get('[data-cy="booking-client-name"]').should('contain', originalName)
        })

        // Edit first activity and verify client consistency is maintained
        cy.get('[data-cy="edit-activity-button"]').first().click()
        cy.get('[data-cy="back-to-summary-button"]').click()
        cy.get('@originalClientName').then((originalName) => {
          cy.get('[data-cy="booking-client-name"]').should('contain', originalName)
        })
      })
    })

    it('should handle multiple activities with same client correctly', () => {
      cy.fixture('clients').then((clients) => {
        cy.visit('/bookings/create')

        // Create first activity
        cy.get('[data-cy="client-search-input"]').type(clients.testClient.email)
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').select('1')
        cy.get('[data-cy="level-select"]').select('1')
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="save-and-create-new-button"]').click()

        // Verify we're creating second activity with same client
        cy.get('[data-cy="current-client-display"]')
          .should('contain', clients.testClient.first_name)

        // Complete second activity
        cy.get('[data-cy="next-step-button"]').click() // Skip participants
        cy.get('[data-cy="sport-select"]').select('2') // Different sport
        cy.get('[data-cy="level-select"]').select('1')
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="complete-booking-button"]').click()

        // Verify summary shows both activities with same client
        cy.visit('/bookings')
        cy.get('[data-cy="booking-row"]').first().click()

        cy.get('[data-cy="activity-item"]').should('have.length', 2)
        cy.get('[data-cy="booking-client-name"]')
          .should('contain', clients.testClient.first_name)
      })
    })
  })

  describe('Booking Editing and Updates', () => {
    beforeEach(() => {
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })
      })
    })

    it('should edit booking details successfully', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()
      cy.get('[data-cy="edit-booking-button"]').click()

      // Verify we're in edit mode
      cy.url().should('include', '/bookings/update')

      // Edit observations
      cy.get('[data-cy="client-observations"]').clear()
      cy.get('[data-cy="client-observations"]').type('Observaciones actualizadas desde test')

      // Edit activity details
      cy.get('[data-cy="edit-activity-button"]').first().click()
      cy.get('[data-cy="next-step-button"]').click() // Skip to details
      cy.get('[data-cy="next-step-button"]').click()
      cy.get('[data-cy="next-step-button"]').click()
      cy.get('[data-cy="next-step-button"]').click()

      // Change hour
      cy.get('[data-cy="hour-select"]').select('15:00')
      cy.get('[data-cy="next-step-button"]').click()
      cy.get('[data-cy="save-activity-button"]').click()

      // Save booking
      cy.get('[data-cy="save-booking-button"]').click()
      cy.verifyNotification('Booking updated successfully')

      // Verify changes are saved
      cy.reload()
      cy.get('[data-cy="client-observations"]').should('contain', 'Observaciones actualizadas')
    })

    it('should handle booking cancellation', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      cy.get('[data-cy="booking-actions-menu"]').click()
      cy.get('[data-cy="cancel-booking-option"]').click()

      // Fill cancellation details
      cy.get('[data-cy="cancellation-modal"]').should('be.visible')
      cy.get('[data-cy="cancellation-reason"]').select('client_request')
      cy.get('[data-cy="cancellation-notes"]').type('Cancelación por solicitud del cliente')
      cy.get('[data-cy="refund-amount"]').clear().type('50.00')

      cy.get('[data-cy="confirm-cancellation"]').click()
      cy.verifyNotification('Booking cancelled successfully')

      // Verify booking status is updated
      cy.get('[data-cy="booking-status"]').should('contain', 'Cancelled')
      cy.get('[data-cy="cancellation-badge"]').should('be.visible')
    })
  })

  describe('Payment Processing', () => {
    beforeEach(() => {
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })
      })
    })

    it('should process cash payment', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      cy.get('[data-cy="pay-booking-button"]').click()

      // Select cash payment
      cy.get('[data-cy="payment-method-cash"]').click()
      cy.get('[data-cy="payment-amount"]').should('be.visible')
      cy.get('[data-cy="payment-received-checkbox"]').check()

      cy.get('[data-cy="process-payment-button"]').click()
      cy.verifyNotification('Payment processed successfully')

      // Verify payment status is updated
      cy.get('[data-cy="payment-status"]').should('contain', 'Paid')
      cy.get('[data-cy="payment-method-display"]').should('contain', 'Cash')
    })

    it('should handle online payment', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      cy.get('[data-cy="pay-booking-button"]').click()

      // Select online payment
      cy.get('[data-cy="payment-method-online"]').click()
      cy.get('[data-cy="generate-payment-link"]').click()

      // Verify payment link is generated
      cy.get('[data-cy="payment-link"]').should('be.visible')
      cy.get('[data-cy="copy-payment-link"]').click()
      cy.verifyNotification('Payment link copied to clipboard')

      // Send payment link by email
      cy.get('[data-cy="send-payment-email"]').click()
      cy.verifyNotification('Payment link sent by email')
    })

    it('should apply vouchers and discounts', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      // Apply voucher
      cy.get('[data-cy="apply-voucher-button"]').click()
      cy.get('[data-cy="voucher-code-input"]').type('TEST20')
      cy.get('[data-cy="apply-voucher"]').click()

      // Verify voucher is applied
      cy.get('[data-cy="voucher-discount"]').should('be.visible')
      cy.get('[data-cy="total-after-discount"]').should('be.visible')

      // Apply additional discount
      cy.get('[data-cy="apply-discount-button"]').click()
      cy.get('[data-cy="discount-type"]').select('percentage')
      cy.get('[data-cy="discount-value"]').type('10')
      cy.get('[data-cy="discount-reason"]').type('Descuento por fidelidad')
      cy.get('[data-cy="apply-discount"]').click()

      // Verify total is recalculated
      cy.get('[data-cy="final-total"]').should('be.visible')
    })
  })

  describe('Booking Conflicts and Validation', () => {
    it('should detect and handle booking conflicts', () => {
      cy.fixture('clients').then((clients) => {
        // Create first booking
        cy.createBooking({
          clientEmail: clients.testClient.email,
          date: '2024-12-25',
          time: '10:00'
        })

        // Try to create conflicting booking
        cy.visit('/bookings/create')
        cy.get('[data-cy="client-search-input"]').type('another@test.com')
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').select('1')
        cy.get('[data-cy="level-select"]').select('1')
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()

        // Try to select same date and time
        cy.get('[data-cy="date-input"]').type('2024-12-25')
        cy.get('[data-cy="hour-select"]').select('10:00')

        // Should show conflict warning
        cy.get('[data-cy="conflict-warning"]').should('be.visible')
        cy.get('[data-cy="conflict-message"]')
          .should('contain', 'time slot is already booked')

        // Should suggest alternative times
        cy.get('[data-cy="suggested-times"]').should('be.visible')
        cy.get('[data-cy="suggested-time-option"]').first().click()

        // Conflict should be resolved
        cy.get('[data-cy="conflict-warning"]').should('not.exist')
        cy.get('[data-cy="availability-confirmed"]').should('be.visible')
      })
    })

    it('should validate participant age restrictions', () => {
      cy.fixture('courses').then((courses) => {
        // Create course with age restrictions
        cy.createCourse({
          ...courses.collectiveCourse,
          name: 'Adult Only Course',
          min_age: 18,
          max_age: 65
        })
      })

      cy.visit('/bookings/create')
      cy.get('[data-cy="client-search-input"]').type('child@test.com')
      cy.wait(1000)
      cy.get('[data-cy="client-option"]').first().click()
      cy.get('[data-cy="next-step-button"]').click()

      // Add child participant
      cy.get('[data-cy="add-participant-button"]').click()
      cy.get('[data-cy="participant-name-1"]').type('Child User')
      cy.get('[data-cy="participant-age-1"]').type('12')
      cy.get('[data-cy="next-step-button"]').click()

      cy.get('[data-cy="sport-select"]').select('1')
      cy.get('[data-cy="level-select"]').select('1')
      cy.get('[data-cy="next-step-button"]').click()

      // Select age-restricted course
      cy.contains('Adult Only Course').click()

      // Should show age restriction warning
      cy.get('[data-cy="age-restriction-warning"]').should('be.visible')
      cy.get('[data-cy="age-restriction-message"]')
        .should('contain', 'does not meet age requirements')
    })

    it('should validate course capacity', () => {
      // Create course with limited capacity
      cy.fixture('courses').then((courses) => {
        cy.createCourse({
          ...courses.collectiveCourse,
          name: 'Limited Capacity Course',
          max_participants: 2
        })
      })

      // Create bookings to fill capacity
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email,
          participants: 2
        })
      })

      // Try to create another booking
      cy.visit('/bookings/create')
      cy.get('[data-cy="client-search-input"]').type('test2@example.com')
      cy.wait(1000)
      cy.get('[data-cy="client-option"]').first().click()
      cy.get('[data-cy="next-step-button"]').click()
      cy.get('[data-cy="next-step-button"]').click()
      cy.get('[data-cy="sport-select"]').select('1')
      cy.get('[data-cy="level-select"]').select('1')
      cy.get('[data-cy="next-step-button"]').click()

      // Course should show as full
      cy.get('[data-cy="course-card"]').contains('Limited Capacity Course').within(() => {
        cy.get('[data-cy="course-full-badge"]').should('be.visible')
        cy.get('[data-cy="course-unavailable"]').should('exist')
      })
    })
  })

  describe('Bulk Operations', () => {
    beforeEach(() => {
      // Create multiple bookings for bulk operations
      cy.fixture('clients').then((clients) => {
        for (let i = 0; i < 3; i++) {
          cy.createBooking({
            clientEmail: `test${i}@example.com`
          })
        }
      })
    })

    it('should select and cancel multiple bookings', () => {
      cy.visit('/bookings')

      // Select multiple bookings
      cy.get('[data-cy="booking-checkbox"]').each($checkbox => {
        cy.wrap($checkbox).check()
      })

      // Bulk cancel
      cy.get('[data-cy="bulk-actions-menu"]').click()
      cy.get('[data-cy="bulk-cancel-option"]').click()

      cy.get('[data-cy="bulk-cancel-modal"]').should('be.visible')
      cy.get('[data-cy="bulk-cancel-reason"]').select('administrative')
      cy.get('[data-cy="bulk-cancel-notes"]').type('Cancelación masiva por test')
      cy.get('[data-cy="confirm-bulk-cancel"]').click()

      cy.verifyNotification('3 bookings cancelled successfully')

      // Verify all selected bookings are cancelled
      cy.get('[data-cy="booking-row"]').each($row => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="booking-status"]').should('contain', 'Cancelled')
        })
      })
    })

    it('should export booking data', () => {
      cy.visit('/bookings')

      // Select date range for export
      cy.get('[data-cy="export-date-from"]').type('2024-12-01')
      cy.get('[data-cy="export-date-to"]').type('2024-12-31')

      // Export to Excel
      cy.get('[data-cy="export-bookings-button"]').click()
      cy.get('[data-cy="export-format-excel"]').click()
      cy.get('[data-cy="confirm-export"]').click()

      cy.verifyNotification('Export started. Download will begin shortly.')

      // Verify download was triggered
      cy.readFile('cypress/downloads/bookings.xlsx').should('exist')
    })
  })

  describe('Integration with External Systems', () => {
    it('should sync with calendar systems', () => {
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })
      })

      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      // Export to Google Calendar
      cy.get('[data-cy="calendar-sync-button"]').click()
      cy.get('[data-cy="export-google-calendar"]').click()

      cy.verifyNotification('Calendar event created successfully')

      // Export ICS file
      cy.get('[data-cy="export-ics"]').click()
      cy.readFile('cypress/downloads/booking.ics').should('exist')
    })

    it('should send automatic notifications', () => {
      cy.visit('/settings/notifications')

      // Enable booking confirmation emails
      cy.get('[data-cy="booking-confirmation-enabled"]').check()
      cy.get('[data-cy="booking-reminder-enabled"]').check()
      cy.get('[data-cy="save-notification-settings"]').click()

      // Create booking and verify notifications are sent
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })
      })

      // Check notification log
      cy.visit('/admin/notification-log')
      cy.get('[data-cy="notification-entry"]').first().should('contain', 'Booking confirmation')
    })
  })
})