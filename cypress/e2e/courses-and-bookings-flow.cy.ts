/// <reference types="cypress" />

describe('Courses and Bookings Complete Flow', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('Course Management', () => {
    it('should create a collective course successfully', () => {
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.collectiveCourse)

        // Verify course appears in course list
        cy.visit('/courses')
        cy.get('[data-cy="course-name"]')
          .should('contain', courses.collectiveCourse.name)

        // Verify course details
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="course-detail-name"]')
          .should('contain', courses.collectiveCourse.name)
        cy.get('[data-cy="course-detail-price"]')
          .should('contain', courses.collectiveCourse.price)
        cy.get('[data-cy="course-detail-type"]')
          .should('contain', 'Colectivo')
      })
    })

    it('should create a private flexible course successfully', () => {
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.privateCourse)

        // Verify flexible course features
        cy.visit('/courses')
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="course-flexible-badge"]').should('be.visible')
        cy.get('[data-cy="course-detail-type"]')
          .should('contain', 'Privado')
      })
    })

    it('should display course levels and students correctly', () => {
      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().click()

      // Verify levels are visible (fix for students not showing in course level editing)
      cy.get('[data-cy="course-levels"]').should('be.visible')
      cy.get('[data-cy="level-item"]').should('have.length.greaterThan', 0)

      // Check that students are visible in levels
      cy.get('[data-cy="level-item"]').first().click()
      cy.get('[data-cy="level-students"]').should('be.visible')
      cy.get('[data-cy="student-item"]').should('exist')
    })
  })

  describe('Booking Flow', () => {
    beforeEach(() => {
      // Create test courses first
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.collectiveCourse)
        cy.createCourse(courses.privateCourse)
      })
    })

    it('should complete full booking flow for collective course', () => {
      cy.fixture('clients').then((clients) => {
        cy.visit('/bookings/create')

        // Step 1: Client Selection
        cy.get('[data-cy="client-search-input"]').type(clients.testClient.email)
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()

        // Step 2: Participants
        cy.get('[data-cy="participants-section"]').should('be.visible')
        cy.get('[data-cy="next-step-button"]').click()

        // Step 3: Sport and Level
        cy.get('[data-cy="sport-select"]').click()
        cy.get('[data-cy="sport-option"]').first().click()
        cy.get('[data-cy="level-select"]').click()
        cy.get('[data-cy="level-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()

        // Step 4: Course Selection
        cy.get('[data-cy="course-tab-collective"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()

        // Step 5: Details - Test duration fix
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="duration-field"]').should('be.visible')
        cy.get('[data-cy="duration-field"]').should('not.be.empty')
        cy.get('[data-cy="hour-select"]').select('10:00')
        cy.get('[data-cy="next-step-button"]').click()

        // Step 6: Observations
        cy.get('[data-cy="client-observations"]').type('Test booking for collective course')
        cy.get('[data-cy="complete-booking-button"]').click()

        // Verify booking creation
        cy.verifyNotification('Booking created successfully')
      })
    })

    it('should handle collective flex courses correctly', () => {
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.flexibleCourse)

        cy.visit('/bookings/create')

        // Navigate to course selection
        cy.get('[data-cy="client-search-input"]').type('test@example.com')
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').click()
        cy.get('[data-cy="sport-option"]').first().click()
        cy.get('[data-cy="level-select"]').click()
        cy.get('[data-cy="level-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()

        // Select flexible course
        cy.get('[data-cy="course-tab-collective"]').click()
        cy.contains('Flexible').click()
        cy.get('[data-cy="next-step-button"]').click()

        // Test date selection for flexible course - fix for inverted button logic
        cy.get('[data-cy="flexible-date-checkbox"]').first().check()

        // Verify the checkbox stays checked (fix for inverted button logic)
        cy.get('[data-cy="flexible-date-checkbox"]').first().should('be.checked')

        // Verify extras are enabled when date is selected
        cy.get('[data-cy="extras-select"]').should('not.be.disabled')

        // Try to uncheck and verify it works correctly
        cy.get('[data-cy="flexible-date-checkbox"]').first().uncheck()
        cy.get('[data-cy="flexible-date-checkbox"]').first().should('not.be.checked')
        cy.get('[data-cy="extras-select"]').should('be.disabled')
      })
    })

    it('should display correct client in booking summary', () => {
      cy.fixture('clients').then((clients) => {
        // Create a booking
        cy.createBooking({
          clientEmail: clients.testClient.email
        })

        // Navigate to booking summary
        cy.visit('/bookings')
        cy.get('[data-cy="booking-row"]').first().click()

        // Verify correct client is displayed (fix for client crossover issue)
        cy.get('[data-cy="booking-summary-client-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)

        // Verify client email matches
        cy.get('[data-cy="booking-summary-client-email"]')
          .should('contain', clients.testClient.email)

        // Test adding another activity and verify client doesn't change
        cy.get('[data-cy="add-activity-button"]').click()
        cy.get('[data-cy="next-step-button"]').click() // Skip client selection

        // Navigate back to summary and verify client is still correct
        cy.get('[data-cy="back-to-summary-button"]').click()
        cy.get('[data-cy="booking-summary-client-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)
      })
    })
  })

  describe('Scheduler/Planner Integration', () => {
    it('should display bookings correctly in scheduler', () => {
      // Create test booking first
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })

        // Navigate to scheduler
        cy.visit('/scheduler')

        // Verify booking appears in calendar
        cy.get('[data-cy="calendar-view"]').should('be.visible')
        cy.get('[data-cy="booking-event"]').should('exist')

        // Click on booking event
        cy.get('[data-cy="booking-event"]').first().click()

        // Verify booking details modal
        cy.get('[data-cy="booking-detail-modal"]').should('be.visible')
        cy.get('[data-cy="booking-detail-client"]')
          .should('contain', clients.testClient.first_name)
      })
    })

    it('should allow editing bookings from scheduler', () => {
      cy.visit('/scheduler')

      // Find and edit a booking
      cy.get('[data-cy="booking-event"]').first().click()
      cy.get('[data-cy="edit-booking-button"]').click()

      // Verify we're in edit mode
      cy.url().should('include', '/bookings/update')

      // Make a change
      cy.get('[data-cy="client-observations"]').clear()
      cy.get('[data-cy="client-observations"]').type('Updated from scheduler')
      cy.get('[data-cy="save-booking-button"]').click()

      // Verify update
      cy.verifyNotification('Booking updated successfully')
    })
  })

  describe('Data Validation and Error Handling', () => {
    it('should validate required fields in course creation', () => {
      cy.visit('/courses')
      cy.get('[data-cy="create-course-button"]').click()

      // Try to save without required fields
      cy.get('[data-cy="save-course-button"]').click()

      // Verify validation errors
      cy.get('[data-cy="validation-error"]').should('be.visible')
      cy.get('[data-cy="course-name-error"]').should('contain', 'required')
    })

    it('should validate duration field works correctly', () => {
      cy.visit('/bookings/create')

      // Navigate through steps to duration field
      cy.get('[data-cy="client-search-input"]').type('test@example.com')
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

      // Test duration field functionality (fix for duration not working)
      cy.get('[data-cy="date-checkbox"]').first().check()
      cy.get('[data-cy="hour-select"]').select('10:00')

      // For flexible courses, duration should be selectable
      cy.get('[data-cy="duration-select"]').should('be.visible')
      cy.get('[data-cy="duration-select"] option').should('have.length.greaterThan', 1)

      // Select a duration
      cy.get('[data-cy="duration-select"]').select('1h')
      cy.get('[data-cy="duration-select"]').should('have.value', '1h')
    })

    it('should handle booking conflicts gracefully', () => {
      // Create overlapping bookings to test conflict resolution
      const bookingData = {
        clientEmail: 'conflict@test.com',
        date: '2024-12-01',
        time: '10:00'
      }

      // Create first booking
      cy.createBooking(bookingData)

      // Try to create conflicting booking
      cy.createBooking(bookingData)

      // Should show conflict warning
      cy.get('[data-cy="conflict-warning"]').should('be.visible')
      cy.get('[data-cy="conflict-message"]')
        .should('contain', 'time slot is already booked')
    })
  })

  describe('Multi-language Support', () => {
    it('should work correctly in different languages', () => {
      // Test Spanish
      cy.get('[data-cy="language-selector"]').click()
      cy.get('[data-cy="language-es"]').click()

      cy.visit('/courses')
      cy.get('[data-cy="page-title"]').should('contain', 'Cursos')

      // Test English
      cy.get('[data-cy="language-selector"]').click()
      cy.get('[data-cy="language-en"]').click()

      cy.get('[data-cy="page-title"]').should('contain', 'Courses')

      // Test French
      cy.get('[data-cy="language-selector"]').click()
      cy.get('[data-cy="language-fr"]').click()

      cy.get('[data-cy="page-title"]').should('contain', 'Cours')
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle multiple course creations efficiently', () => {
      cy.fixture('courses').then((courses) => {
        // Create multiple courses in sequence
        for (let i = 0; i < 5; i++) {
          const courseData = {
            ...courses.collectiveCourse,
            name: `Bulk Course ${i + 1}`
          }
          cy.createCourse(courseData)
        }

        // Verify all courses are listed
        cy.visit('/courses')
        cy.get('[data-cy="course-card"]').should('have.length.gte', 5)
      })
    })

    it('should load booking form within acceptable time', () => {
      const startTime = Date.now()

      cy.visit('/bookings/create')
      cy.get('[data-cy="booking-form"]').should('be.visible')

      cy.then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(5000) // Should load within 5 seconds
      })
    })
  })
})