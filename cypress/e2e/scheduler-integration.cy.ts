/// <reference types="cypress" />

describe('Scheduler Integration Tests', () => {
  beforeEach(() => {
    cy.login()
    // Create test data
    cy.fixture('courses').then((courses) => {
      cy.createCourse(courses.collectiveCourse)
      cy.createCourse(courses.privateCourse)
    })
    cy.fixture('clients').then((clients) => {
      cy.createBooking({
        clientEmail: clients.testClient.email
      })
    })
  })

  describe('Calendar View and Navigation', () => {
    it('should load scheduler with all bookings visible', () => {
      cy.visit('/scheduler')

      // Calendar should load
      cy.get('[data-cy="calendar-view"]').should('be.visible')
      cy.get('[data-cy="calendar-loading"]').should('not.exist')

      // Bookings should appear as events
      cy.get('[data-cy="booking-event"]').should('have.length.gte', 1)

      // Event should contain basic booking info
      cy.get('[data-cy="booking-event"]').first().within(() => {
        cy.get('[data-cy="event-time"]').should('be.visible')
        cy.get('[data-cy="event-title"]').should('be.visible')
        cy.get('[data-cy="event-client"]').should('be.visible')
      })
    })

    it('should navigate between different calendar views', () => {
      cy.visit('/scheduler')

      // Test month view
      cy.get('[data-cy="calendar-view-month"]').click()
      cy.get('[data-cy="calendar-view"]').should('have.class', 'month-view')
      cy.get('[data-cy="month-grid"]').should('be.visible')

      // Test week view
      cy.get('[data-cy="calendar-view-week"]').click()
      cy.get('[data-cy="calendar-view"]').should('have.class', 'week-view')
      cy.get('[data-cy="week-grid"]').should('be.visible')
      cy.get('[data-cy="time-slots"]').should('be.visible')

      // Test day view
      cy.get('[data-cy="calendar-view-day"]').click()
      cy.get('[data-cy="calendar-view"]').should('have.class', 'day-view')
      cy.get('[data-cy="day-timeline"]').should('be.visible')

      // Test agenda view
      cy.get('[data-cy="calendar-view-agenda"]').click()
      cy.get('[data-cy="calendar-view"]').should('have.class', 'agenda-view')
      cy.get('[data-cy="agenda-list"]').should('be.visible')
    })

    it('should navigate between dates correctly', () => {
      cy.visit('/scheduler')

      // Get current date
      cy.get('[data-cy="current-date"]').invoke('text').as('currentDate')

      // Navigate to next month
      cy.get('[data-cy="calendar-next"]').click()
      cy.get('[data-cy="current-date"]').invoke('text').should('not.equal', '@currentDate')

      // Navigate to previous month
      cy.get('[data-cy="calendar-prev"]').click()
      cy.get('@currentDate').then(originalDate => {
        cy.get('[data-cy="current-date"]').should('contain', originalDate)
      })

      // Jump to today
      cy.get('[data-cy="calendar-today"]').click()
      cy.get('[data-cy="calendar-today"]').should('have.class', 'active')
    })

    it('should handle date picker navigation', () => {
      cy.visit('/scheduler')

      // Open date picker
      cy.get('[data-cy="calendar-date-picker"]').click()
      cy.get('[data-cy="date-picker-modal"]').should('be.visible')

      // Select specific date
      cy.get('[data-cy="date-picker-month"]').select('2024-12')
      cy.get('[data-cy="date-picker-year"]').select('2024')
      cy.get('[data-cy="date-picker-day"]').contains('15').click()

      cy.get('[data-cy="apply-date"]').click()
      cy.get('[data-cy="current-date"]').should('contain', 'December 15, 2024')
    })
  })

  describe('Event Management', () => {
    it('should display booking details when clicking event', () => {
      cy.visit('/scheduler')

      // Click on booking event
      cy.get('[data-cy="booking-event"]').first().click()

      // Event details modal should open
      cy.get('[data-cy="event-details-modal"]').should('be.visible')

      // Verify booking information is displayed
      cy.get('[data-cy="event-client-name"]').should('be.visible')
      cy.get('[data-cy="event-course-name"]').should('be.visible')
      cy.get('[data-cy="event-date-time"]').should('be.visible')
      cy.get('[data-cy="event-participants"]').should('be.visible')
      cy.get('[data-cy="event-status"]').should('be.visible')

      // Test action buttons
      cy.get('[data-cy="edit-booking-button"]').should('be.visible')
      cy.get('[data-cy="cancel-booking-button"]').should('be.visible')
      cy.get('[data-cy="clone-booking-button"]').should('be.visible')

      // Close modal
      cy.get('[data-cy="modal-close"]').click()
      cy.get('[data-cy="event-details-modal"]').should('not.exist')
    })

    it('should edit booking from scheduler', () => {
      cy.visit('/scheduler')

      // Open event details and edit
      cy.get('[data-cy="booking-event"]').first().click()
      cy.get('[data-cy="edit-booking-button"]').click()

      // Should navigate to booking edit page
      cy.url().should('include', '/bookings/update')

      // Make a change
      cy.get('[data-cy="client-observations"]').clear()
      cy.get('[data-cy="client-observations"]').type('Updated from scheduler')

      cy.get('[data-cy="save-booking-button"]').click()
      cy.verifyNotification('Booking updated successfully')

      // Return to scheduler and verify change
      cy.visit('/scheduler')
      cy.get('[data-cy="booking-event"]').first().click()
      cy.get('[data-cy="event-observations"]').should('contain', 'Updated from scheduler')
    })

    it('should handle drag and drop rescheduling', () => {
      cy.visit('/scheduler')
      cy.get('[data-cy="calendar-view-week"]').click() // Better for drag and drop

      cy.get('[data-cy="booking-event"]').first().then($event => {
        const originalTime = $event.find('[data-cy="event-time"]').text()

        // Drag event to different time slot
        cy.wrap($event)
          .trigger('mousedown', { which: 1 })
          .wait(100)

        // Drop on different time slot (2 hours later)
        cy.get('[data-cy="time-slot-12-00"]')
          .trigger('mousemove')
          .trigger('mouseup')

        // Confirm rescheduling
        cy.get('[data-cy="reschedule-confirmation"]').should('be.visible')
        cy.get('[data-cy="new-time-display"]').should('not.contain', originalTime)
        cy.get('[data-cy="confirm-reschedule"]').click()

        cy.verifyNotification('Booking rescheduled successfully')

        // Verify event appears in new time slot
        cy.get('[data-cy="time-slot-12-00"]').within(() => {
          cy.get('[data-cy="booking-event"]').should('exist')
        })
      })
    })

    it('should create new booking from scheduler', () => {
      cy.visit('/scheduler')

      // Double click on empty time slot
      cy.get('[data-cy="time-slot-14-00"]').dblclick()

      // Quick booking modal should open
      cy.get('[data-cy="quick-booking-modal"]').should('be.visible')

      // Pre-filled date and time
      cy.get('[data-cy="booking-date"]').should('not.be.empty')
      cy.get('[data-cy="booking-time"]').should('have.value', '14:00')

      // Fill quick booking form
      cy.get('[data-cy="client-search"]').type('test@example.com')
      cy.wait(1000)
      cy.get('[data-cy="client-option"]').first().click()

      cy.get('[data-cy="course-quick-select"]').select('1')
      cy.get('[data-cy="participants-quick-select"]').type('2')

      cy.get('[data-cy="create-quick-booking"]').click()
      cy.verifyNotification('Booking created successfully')

      // Verify new booking appears in calendar
      cy.get('[data-cy="time-slot-14-00"]').within(() => {
        cy.get('[data-cy="booking-event"]').should('exist')
      })
    })

    it('should clone existing booking', () => {
      cy.visit('/scheduler')

      // Open event and clone
      cy.get('[data-cy="booking-event"]').first().click()
      cy.get('[data-cy="clone-booking-button"]').click()

      // Clone booking modal
      cy.get('[data-cy="clone-booking-modal"]').should('be.visible')

      // Select new date for cloned booking
      cy.get('[data-cy="clone-date"]').type('2024-12-25')
      cy.get('[data-cy="clone-time"]').type('15:00')

      // Option to change client
      cy.get('[data-cy="change-client-checkbox"]').check()
      cy.get('[data-cy="new-client-search"]').type('newclient@test.com')
      cy.wait(1000)
      cy.get('[data-cy="client-option"]').first().click()

      cy.get('[data-cy="confirm-clone"]').click()
      cy.verifyNotification('Booking cloned successfully')

      // Navigate to cloned date and verify
      cy.get('[data-cy="calendar-date-picker"]').click()
      cy.get('[data-cy="date-picker-day"]').contains('25').click()
      cy.get('[data-cy="apply-date"]').click()

      cy.get('[data-cy="booking-event"]').should('exist')
    })
  })

  describe('Filtering and Search', () => {
    beforeEach(() => {
      // Create bookings with different sports and types
      cy.fixture('courses').then((courses) => {
        cy.createCourse({
          ...courses.collectiveCourse,
          name: 'Tennis Group',
          sport_id: 1
        })
        cy.createCourse({
          ...courses.privateCourse,
          name: 'Padel Private',
          sport_id: 2
        })
      })
    })

    it('should filter events by sport', () => {
      cy.visit('/scheduler')

      // Apply sport filter
      cy.get('[data-cy="filter-panel-toggle"]').click()
      cy.get('[data-cy="sport-filter"]').select('1') // Tennis
      cy.get('[data-cy="apply-filters"]').click()

      // Only tennis events should be visible
      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.attr', 'data-sport-id', '1')
      })

      // Change to show all sports
      cy.get('[data-cy="sport-filter"]').select('all')
      cy.get('[data-cy="apply-filters"]').click()

      // All events should be visible again
      cy.get('[data-cy="booking-event"]').should('have.length.gte', 2)
    })

    it('should filter events by course type', () => {
      cy.visit('/scheduler')

      // Filter by collective courses
      cy.get('[data-cy="filter-panel-toggle"]').click()
      cy.get('[data-cy="course-type-filter"]').select('1')
      cy.get('[data-cy="apply-filters"]').click()

      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.attr', 'data-course-type', '1')
      })

      // Filter by private courses
      cy.get('[data-cy="course-type-filter"]').select('2')
      cy.get('[data-cy="apply-filters"]').click()

      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.attr', 'data-course-type', '2')
      })
    })

    it('should filter events by booking status', () => {
      cy.visit('/scheduler')

      // Filter by confirmed bookings
      cy.get('[data-cy="filter-panel-toggle"]').click()
      cy.get('[data-cy="status-filter"]').select('confirmed')
      cy.get('[data-cy="apply-filters"]').click()

      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.class', 'status-confirmed')
      })

      // Filter by pending bookings
      cy.get('[data-cy="status-filter"]').select('pending')
      cy.get('[data-cy="apply-filters"]').click()

      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.class', 'status-pending')
      })
    })

    it('should filter events by monitor', () => {
      cy.visit('/scheduler')

      // Get list of available monitors
      cy.get('[data-cy="filter-panel-toggle"]').click()
      cy.get('[data-cy="monitor-filter"]').select('1') // First monitor
      cy.get('[data-cy="apply-filters"]').click()

      // Only events with selected monitor should be visible
      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.attr', 'data-monitor-id', '1')
      })
    })

    it('should search events by client name', () => {
      cy.visit('/scheduler')

      cy.get('[data-cy="event-search-input"]').type('Juan')
      cy.get('[data-cy="search-events"]').click()

      // Only events with matching client should be visible
      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).within(() => {
          cy.get('[data-cy="event-client"]').should('contain', 'Juan')
        })
      })

      // Clear search
      cy.get('[data-cy="clear-search"]').click()
      cy.get('[data-cy="booking-event"]').should('have.length.gte', 1)
    })

    it('should apply multiple filters simultaneously', () => {
      cy.visit('/scheduler')

      // Apply multiple filters
      cy.get('[data-cy="filter-panel-toggle"]').click()
      cy.get('[data-cy="sport-filter"]').select('1')
      cy.get('[data-cy="course-type-filter"]').select('1')
      cy.get('[data-cy="status-filter"]').select('confirmed')
      cy.get('[data-cy="apply-filters"]').click()

      // Events should match all filters
      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.attr', 'data-sport-id', '1')
        cy.wrap($event).should('have.attr', 'data-course-type', '1')
        cy.wrap($event).should('have.class', 'status-confirmed')
      })

      // Clear all filters
      cy.get('[data-cy="clear-all-filters"]').click()
      cy.get('[data-cy="booking-event"]').should('have.length.gte', 1)
    })
  })

  describe('Resource Management', () => {
    it('should display monitor availability', () => {
      cy.visit('/scheduler')

      // Switch to resource view
      cy.get('[data-cy="view-mode-resources"]').click()
      cy.get('[data-cy="resource-view"]').should('be.visible')

      // Should show monitors as resources
      cy.get('[data-cy="resource-row"]').should('have.length.gte', 1)
      cy.get('[data-cy="monitor-name"]').should('be.visible')

      // Show monitor availability timeline
      cy.get('[data-cy="monitor-timeline"]').should('be.visible')
      cy.get('[data-cy="available-slot"]').should('exist')
      cy.get('[data-cy="booked-slot"]').should('exist')
    })

    it('should display facility availability', () => {
      cy.visit('/scheduler')

      // Switch to facilities view
      cy.get('[data-cy="view-mode-facilities"]').click()
      cy.get('[data-cy="facility-view"]').should('be.visible')

      // Should show courts/facilities
      cy.get('[data-cy="facility-row"]').should('have.length.gte', 1)
      cy.get('[data-cy="facility-name"]').should('be.visible')

      // Show facility booking timeline
      cy.get('[data-cy="facility-timeline"]').should('be.visible')
      cy.get('[data-cy="facility-available"]').should('exist')
      cy.get('[data-cy="facility-occupied"]').should('exist')
    })

    it('should handle resource conflicts', () => {
      cy.visit('/scheduler')

      // Try to book overlapping time for same monitor
      cy.get('[data-cy="time-slot-10-00"]').dblclick()
      cy.get('[data-cy="quick-booking-modal"]').should('be.visible')

      cy.get('[data-cy="client-search"]').type('conflict@test.com')
      cy.wait(1000)
      cy.get('[data-cy="client-option"]').first().click()

      cy.get('[data-cy="course-quick-select"]').select('1')
      cy.get('[data-cy="monitor-select"]').select('1') // Same monitor as existing booking

      // Should show resource conflict warning
      cy.get('[data-cy="resource-conflict-warning"]').should('be.visible')
      cy.get('[data-cy="conflict-message"]').should('contain', 'Monitor is not available')

      // Should suggest alternative monitors
      cy.get('[data-cy="alternative-monitors"]').should('be.visible')
      cy.get('[data-cy="alternative-monitor"]').first().click()

      // Conflict should be resolved
      cy.get('[data-cy="resource-conflict-warning"]').should('not.exist')
      cy.get('[data-cy="create-quick-booking"]').should('not.be.disabled')
    })
  })

  describe('Export and Print', () => {
    it('should export calendar view to PDF', () => {
      cy.visit('/scheduler')

      cy.get('[data-cy="export-menu"]').click()
      cy.get('[data-cy="export-pdf"]').click()

      // PDF export options
      cy.get('[data-cy="pdf-export-modal"]').should('be.visible')
      cy.get('[data-cy="export-date-range"]').check()
      cy.get('[data-cy="export-start-date"]').type('2024-12-01')
      cy.get('[data-cy="export-end-date"]').type('2024-12-31')
      cy.get('[data-cy="include-details"]').check()

      cy.get('[data-cy="generate-pdf"]').click()
      cy.verifyNotification('PDF export started')

      // Verify download
      cy.readFile('cypress/downloads/schedule.pdf').should('exist')
    })

    it('should print calendar view', () => {
      cy.visit('/scheduler')

      cy.get('[data-cy="print-calendar"]').click()

      // Print preview should open
      cy.get('[data-cy="print-preview"]').should('be.visible')
      cy.get('[data-cy="print-options"]').should('be.visible')

      // Customize print options
      cy.get('[data-cy="print-orientation"]').select('landscape')
      cy.get('[data-cy="print-include-details"]').check()
      cy.get('[data-cy="print-color"]').check()

      // Trigger print (would open browser print dialog in real usage)
      cy.get('[data-cy="confirm-print"]').click()
    })

    it('should export to Excel format', () => {
      cy.visit('/scheduler')

      cy.get('[data-cy="export-menu"]').click()
      cy.get('[data-cy="export-excel"]').click()

      // Excel export options
      cy.get('[data-cy="excel-export-modal"]').should('be.visible')
      cy.get('[data-cy="export-bookings-list"]').check()
      cy.get('[data-cy="export-financial-summary"]').check()
      cy.get('[data-cy="export-monitor-schedule"]').check()

      cy.get('[data-cy="generate-excel"]').click()
      cy.verifyNotification('Excel export completed')

      cy.readFile('cypress/downloads/schedule.xlsx').should('exist')
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport('iphone-x')
      cy.visit('/scheduler')

      // Mobile calendar view should be adapted
      cy.get('[data-cy="mobile-calendar"]').should('be.visible')
      cy.get('[data-cy="mobile-date-nav"]').should('be.visible')

      // Events should be displayed in mobile-friendly format
      cy.get('[data-cy="mobile-event-list"]').should('be.visible')
      cy.get('[data-cy="mobile-event-item"]').should('have.length.gte', 1)

      // Mobile actions should be available
      cy.get('[data-cy="mobile-add-booking"]').should('be.visible')
      cy.get('[data-cy="mobile-filter-toggle"]').should('be.visible')

      // Test mobile event interaction
      cy.get('[data-cy="mobile-event-item"]').first().tap()
      cy.get('[data-cy="mobile-event-actions"]').should('be.visible')
    })

    it('should handle touch gestures on tablet', () => {
      cy.viewport('ipad-2')
      cy.visit('/scheduler')

      // Touch navigation should work
      cy.get('[data-cy="calendar-view"]').swipe('left')
      cy.get('[data-cy="current-date"]').should('not.contain', 'December') // Should advance month

      cy.get('[data-cy="calendar-view"]').swipe('right')
      cy.get('[data-cy="current-date"]').should('contain', 'December') // Should go back

      // Pinch to zoom (simulate)
      cy.get('[data-cy="calendar-view"]').trigger('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 200 }]
      })
      cy.get('[data-cy="calendar-view"]').trigger('touchmove', {
        touches: [{ clientX: 150, clientY: 150 }, { clientX: 150, clientY: 150 }]
      })
      cy.get('[data-cy="calendar-view"]').trigger('touchend')

      // Should zoom in to day view
      cy.get('[data-cy="calendar-view"]').should('have.class', 'day-view')
    })
  })

  describe('Real-time Updates', () => {
    it('should update calendar when bookings change', () => {
      cy.visit('/scheduler')

      // Count initial events
      cy.get('[data-cy="booking-event"]').its('length').as('initialCount')

      // Create new booking in another tab/window (simulate)
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: 'realtime@test.com'
        })
      })

      // Calendar should update automatically
      cy.get('@initialCount').then(count => {
        cy.get('[data-cy="booking-event"]').should('have.length', count + 1)
      })

      // New event should be highlighted
      cy.get('[data-cy="booking-event"]').last().should('have.class', 'newly-created')
    })

    it('should show live availability updates', () => {
      cy.visit('/scheduler')

      // Monitor availability indicator
      cy.get('[data-cy="availability-indicator"]').should('be.visible')
      cy.get('[data-cy="available-slots-count"]').invoke('text').as('initialAvailable')

      // Create booking that affects availability
      cy.get('[data-cy="time-slot-15-00"]').dblclick()
      cy.get('[data-cy="quick-booking-modal"]').should('be.visible')

      cy.get('[data-cy="client-search"]').type('availability@test.com')
      cy.wait(1000)
      cy.get('[data-cy="client-option"]').first().click()
      cy.get('[data-cy="course-quick-select"]').select('1')
      cy.get('[data-cy="create-quick-booking"]').click()

      // Availability should update
      cy.get('@initialAvailable').then(initial => {
        cy.get('[data-cy="available-slots-count"]').should('not.contain', initial)
      })

      // Time slot should show as occupied
      cy.get('[data-cy="time-slot-15-00"]').should('have.class', 'occupied')
    })
  })
})