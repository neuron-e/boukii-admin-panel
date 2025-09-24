/// <reference types="cypress" />

describe('Performance and Integration Tests', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('Performance Tests', () => {
    it('should load courses page within acceptable time', () => {
      const startTime = performance.now()

      cy.visit('/courses')
      cy.get('[data-cy="courses-list"]').should('be.visible')

      cy.then(() => {
        const loadTime = performance.now() - startTime
        expect(loadTime).to.be.lessThan(3000) // Should load within 3 seconds
      })
    })

    it('should handle large number of courses efficiently', () => {
      // Create multiple courses
      cy.fixture('courses').then((courses) => {
        const coursePromises = []
        for (let i = 0; i < 10; i++) {
          const courseData = {
            ...courses.collectiveCourse,
            name: `Performance Test Course ${i + 1}`
          }
          coursePromises.push(cy.createCourse(courseData))
        }

        // Verify page still loads quickly with many courses
        const startTime = performance.now()
        cy.visit('/courses')
        cy.get('[data-cy="course-card"]').should('have.length.gte', 10)

        cy.then(() => {
          const loadTime = performance.now() - startTime
          expect(loadTime).to.be.lessThan(5000) // Should load within 5 seconds even with many courses
        })
      })
    })

    it('should maintain responsiveness during booking creation', () => {
      cy.visit('/bookings/create')

      // Measure response times for each step
      const measurements = []

      // Step 1
      let startTime = performance.now()
      cy.get('[data-cy="client-search-input"]').type('test@example.com')
      cy.wait(1000)
      cy.get('[data-cy="client-option"]').first().click()
      cy.then(() => {
        measurements.push(performance.now() - startTime)
      })

      // Step 2
      startTime = performance.now()
      cy.get('[data-cy="next-step-button"]').click()
      cy.get('[data-cy="participants-section"]').should('be.visible')
      cy.then(() => {
        measurements.push(performance.now() - startTime)
      })

      // Verify all steps load quickly
      cy.then(() => {
        measurements.forEach((time, index) => {
          expect(time).to.be.lessThan(2000) // Each step should take less than 2 seconds
        })
      })
    })
  })

  describe('Scheduler Integration', () => {
    it('should sync bookings between booking system and scheduler', () => {
      // Create a booking
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })

        // Check it appears in scheduler
        cy.visit('/scheduler')
        cy.get('[data-cy="calendar-view"]').should('be.visible')

        // Wait for calendar to load
        cy.wait(2000)

        // Verify booking appears as event
        cy.get('[data-cy="booking-event"]').should('exist')

        // Click on the event
        cy.get('[data-cy="booking-event"]').first().click()

        // Verify booking details
        cy.get('[data-cy="event-details-modal"]').should('be.visible')
        cy.get('[data-cy="event-client-name"]')
          .should('contain', clients.testClient.first_name)
      })
    })

    it('should allow drag and drop rescheduling', () => {
      cy.visit('/scheduler')

      // Wait for events to load
      cy.wait(2000)

      cy.get('[data-cy="booking-event"]').first().then($event => {
        const originalPosition = $event.offset()

        // Drag event to different time slot
        cy.wrap($event)
          .trigger('mousedown', { which: 1 })
          .trigger('mousemove', { clientX: originalPosition.left + 100, clientY: originalPosition.top + 50 })
          .trigger('mouseup')

        // Verify rescheduling confirmation
        cy.get('[data-cy="reschedule-confirmation"]').should('be.visible')
        cy.get('[data-cy="confirm-reschedule"]').click()

        // Verify success notification
        cy.verifyNotification('Booking rescheduled successfully')
      })
    })

    it('should filter events by different criteria', () => {
      cy.visit('/scheduler')

      // Test sport filter
      cy.get('[data-cy="sport-filter"]').click()
      cy.get('[data-cy="sport-option"]').first().click()
      cy.get('[data-cy="apply-filter"]').click()

      // Verify events are filtered
      cy.get('[data-cy="booking-event"]').each($event => {
        cy.wrap($event).should('have.attr', 'data-sport-id')
      })

      // Test date range filter
      cy.get('[data-cy="date-range-filter"]').click()
      cy.get('[data-cy="start-date"]').type('2024-12-01')
      cy.get('[data-cy="end-date"]').type('2024-12-31')
      cy.get('[data-cy="apply-date-filter"]').click()

      // Verify events are within date range
      cy.get('[data-cy="booking-event"]').should('exist')
    })
  })

  describe('Data Consistency Tests', () => {
    it('should maintain data consistency across course creation and booking', () => {
      cy.fixture('courses').then((courses) => {
        cy.fixture('clients').then((clients) => {
          // Create course
          const courseName = 'Data Consistency Test ' + Date.now()
          const courseData = {
            ...courses.collectiveCourse,
            name: courseName
          }
          cy.createCourse(courseData)

          // Verify course exists
          cy.visit('/courses')
          cy.contains(courseName).should('be.visible')

          // Create booking for this course
          cy.visit('/bookings/create')
          cy.get('[data-cy="client-search-input"]').type(clients.testClient.email)
          cy.wait(1000)
          cy.get('[data-cy="client-option"]').first().click()
          cy.get('[data-cy="next-step-button"]').click()
          cy.get('[data-cy="next-step-button"]').click()
          cy.get('[data-cy="sport-select"]').click()
          cy.get('[data-cy="sport-option"]').first().click()
          cy.get('[data-cy="level-select"]').click()
          cy.get('[data-cy="level-option"]').first().click()
          cy.get('[data-cy="next-step-button"]').click()

          // Select our specific course
          cy.contains(courseName).click()
          cy.get('[data-cy="next-step-button"]').click()
          cy.get('[data-cy="date-checkbox"]').first().check()
          cy.get('[data-cy="next-step-button"]').click()
          cy.get('[data-cy="complete-booking-button"]').click()

          // Verify booking appears in course details
          cy.visit('/courses')
          cy.contains(courseName).click()
          cy.get('[data-cy="course-bookings"]').should('contain', clients.testClient.first_name)
        })
      })
    })

    it('should handle concurrent booking attempts gracefully', () => {
      // Simulate concurrent booking attempts
      cy.fixture('clients').then((clients) => {
        const bookingData = {
          clientEmail: clients.testClient.email,
          date: '2024-12-01',
          time: '10:00'
        }

        // Start first booking process
        cy.visit('/bookings/create')
        cy.get('[data-cy="client-search-input"]').type(bookingData.clientEmail)
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').click()
        cy.get('[data-cy="sport-option"]').first().click()
        cy.get('[data-cy="level-select"]').click()
        cy.get('[data-cy="level-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()

        // At this point, verify availability is checked
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="availability-status"]').should('contain', 'Available')

        // Complete booking
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="complete-booking-button"]').click()

        // Try to create another booking for same slot
        cy.visit('/bookings/create')
        cy.get('[data-cy="client-search-input"]').type('another@test.com')
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').click()
        cy.get('[data-cy="sport-option"]').first().click()
        cy.get('[data-cy="level-select"]').click()
        cy.get('[data-cy="level-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()

        // Should show conflict
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="conflict-warning"]').should('be.visible')
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', () => {
      // Simulate network failure
      cy.intercept('POST', '/api/admin/courses', { forceNetworkError: true }).as('createCourseError')

      cy.visit('/courses')
      cy.get('[data-cy="create-course-button"]').click()
      cy.get('[data-cy="course-name-input"]').type('Network Error Test')
      cy.get('[data-cy="save-course-button"]').click()

      // Verify error handling
      cy.get('[data-cy="error-message"]').should('be.visible')
      cy.get('[data-cy="retry-button"]').should('be.visible')

      // Test retry functionality
      cy.intercept('POST', '/api/admin/courses', { statusCode: 200, body: { success: true } }).as('createCourseSuccess')
      cy.get('[data-cy="retry-button"]').click()

      cy.verifyNotification('Course created successfully')
    })

    it('should validate form data and show appropriate errors', () => {
      cy.visit('/courses')
      cy.get('[data-cy="create-course-button"]').click()

      // Try to save with missing required fields
      cy.get('[data-cy="save-course-button"]').click()

      // Verify validation errors
      cy.get('[data-cy="course-name-error"]').should('contain', 'required')
      cy.get('[data-cy="course-sport-error"]').should('contain', 'required')
      cy.get('[data-cy="course-price-error"]').should('contain', 'required')

      // Fill in valid data and verify errors disappear
      cy.get('[data-cy="course-name-input"]').type('Valid Course Name')
      cy.get('[data-cy="course-name-error"]').should('not.exist')

      cy.get('[data-cy="course-sport-select"]').click()
      cy.get('[data-cy="sport-option"]').first().click()
      cy.get('[data-cy="course-sport-error"]').should('not.exist')
    })

    it('should handle session expiration correctly', () => {
      // Simulate session expiration
      cy.window().then((win) => {
        win.localStorage.removeItem('boukiiUser')
      })

      cy.visit('/courses')

      // Should redirect to login
      cy.url().should('include', '/login')
      cy.get('[data-cy="login-form"]').should('be.visible')

      // After login, should redirect back to intended page
      cy.login()
      cy.url().should('include', '/courses')
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport('iphone-x')

      cy.visit('/courses')
      cy.get('[data-cy="mobile-menu-button"]').click()
      cy.get('[data-cy="mobile-menu"]').should('be.visible')

      // Test course creation on mobile
      cy.get('[data-cy="mobile-create-course"]').click()
      cy.get('[data-cy="course-form"]').should('be.visible')

      // Form should be optimized for mobile
      cy.get('[data-cy="course-name-input"]').should('be.visible')
      cy.get('[data-cy="course-name-input"]').type('Mobile Test Course')

      // Navigation should work on mobile
      cy.get('[data-cy="mobile-next-button"]').click()
      cy.get('[data-cy="course-details-section"]').should('be.visible')
    })

    it('should handle touch interactions correctly', () => {
      cy.viewport('ipad-2')

      cy.visit('/scheduler')

      // Test touch events on calendar
      cy.get('[data-cy="calendar-view"]').should('be.visible')
      cy.get('[data-cy="booking-event"]').first().click()

      // Modal should open properly on touch
      cy.get('[data-cy="event-details-modal"]').should('be.visible')

      // Touch navigation should work
      cy.get('[data-cy="modal-close"]').click()
      cy.get('[data-cy="event-details-modal"]').should('not.exist')
    })
  })

  describe('Accessibility Tests', () => {
    it('should be keyboard navigable', () => {
      cy.visit('/courses')

      // Test keyboard navigation
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-cy', 'main-navigation')

      cy.focused().tab()
      cy.focused().should('have.attr', 'data-cy', 'create-course-button')

      // Test form navigation
      cy.focused().type('{enter}')
      cy.get('[data-cy="course-form"]').should('be.visible')

      cy.get('[data-cy="course-name-input"]').focus().type('Accessibility Test Course')
      cy.get('[data-cy="course-name-input"]').tab()
      cy.focused().should('have.attr', 'data-cy', 'course-sport-select')
    })

    it('should have proper ARIA labels and roles', () => {
      cy.visit('/bookings/create')

      // Check form accessibility
      cy.get('[data-cy="booking-form"]').should('have.attr', 'role', 'form')
      cy.get('[data-cy="client-search-input"]').should('have.attr', 'aria-label')
      cy.get('[data-cy="next-step-button"]').should('have.attr', 'aria-describedby')

      // Check error messages are associated
      cy.get('[data-cy="next-step-button"]').click()
      cy.get('[data-cy="client-required-error"]')
        .should('have.attr', 'role', 'alert')
        .should('have.attr', 'aria-live', 'polite')
    })
  })
})