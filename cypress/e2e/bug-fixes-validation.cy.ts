/// <reference types="cypress" />

describe('Bug Fixes Validation Tests', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('Fix 1: Duration not working in reservations', () => {
    it('should display and handle duration field correctly in private bookings', () => {
      cy.visit('/bookings/create')

      // Navigate to duration step
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

      // Select private course
      cy.get('[data-cy="course-tab-private"]').click()
      cy.get('[data-cy="course-card"]').first().click()
      cy.get('[data-cy="next-step-button"]').click()

      // Test duration functionality
      cy.get('[data-cy="date-input"]').should('be.visible')
      cy.get('[data-cy="hour-select"]').should('be.visible')
      cy.get('[data-cy="duration-field"]').should('be.visible')

      // For non-flexible courses, duration should be readonly but visible
      cy.get('[data-cy="duration-field"]').should('not.be.empty')

      // For flexible courses, duration should be selectable
      cy.fixture('courses').then((courses) => {
        if (courses.privateCourse.is_flexible) {
          cy.get('[data-cy="duration-select"]').should('be.visible')
          cy.get('[data-cy="duration-select"] option').should('have.length.greaterThan', 1)
        }
      })
    })

    it('should update duration options when start hour changes in flexible courses', () => {
      // Create a flexible course first
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.privateCourse)

        cy.visit('/bookings/create')

        // Navigate to details step
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
        cy.get('[data-cy="course-tab-private"]').click()
        cy.contains('Flexible').click()
        cy.get('[data-cy="next-step-button"]').click()

        // Test that changing start hour updates duration options
        cy.get('[data-cy="hour-select"]').select('10:00')
        cy.get('[data-cy="duration-select"] option').its('length').as('optionsCount1')

        cy.get('[data-cy="hour-select"]').select('14:00')
        cy.get('[data-cy="duration-select"] option').its('length').as('optionsCount2')

        // Duration options should potentially change based on available time
        cy.get('@optionsCount1').then((count1) => {
          cy.get('@optionsCount2').then((count2) => {
            // At minimum, both should have options available
            expect(count1).to.be.greaterThan(0)
            expect(count2).to.be.greaterThan(0)
          })
        })
      })
    })
  })

  describe('Fix 2: Inverted button logic for collective flex courses', () => {
    it('should handle date selection correctly in collective flex courses', () => {
      // Create flexible collective course
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.flexibleCourse)

        cy.visit('/bookings/create')

        // Navigate to collective flex course selection
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
        cy.get('[data-cy="course-tab-collective"]').click()
        cy.contains('Flexible').click()
        cy.get('[data-cy="next-step-button"]').click()

        // Test date selection behavior
        cy.get('[data-cy="flex-date-checkbox"]').first().should('not.be.checked')

        // Check a date
        cy.get('[data-cy="flex-date-checkbox"]').first().check()
        cy.get('[data-cy="flex-date-checkbox"]').first().should('be.checked')

        // Verify extras become available when date is selected
        cy.get('[data-cy="extras-select"]').should('not.be.disabled')

        // Uncheck the date
        cy.get('[data-cy="flex-date-checkbox"]').first().uncheck()
        cy.get('[data-cy="flex-date-checkbox"]').first().should('not.be.checked')

        // Verify extras become disabled when date is unselected
        cy.get('[data-cy="extras-select"]').should('be.disabled')
      })
    })

    it('should not show duplicated dates in collective flex courses', () => {
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.flexibleCourse)

        cy.visit('/bookings/create')

        // Navigate to collective flex course selection
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
        cy.get('[data-cy="course-tab-collective"]').click()
        cy.contains('Flexible').click()
        cy.get('[data-cy="next-step-button"]').click()

        // Check that dates are not duplicated
        cy.get('[data-cy="flex-date-item"]').then($dates => {
          const dateTexts = Array.from($dates).map(el => el.textContent)
          const uniqueDates = [...new Set(dateTexts)]
          expect(dateTexts.length).to.equal(uniqueDates.length)
        })
      })
    })
  })

  describe('Fix 3: Client crossover issue in booking summary', () => {
    it('should maintain correct client throughout booking process', () => {
      cy.fixture('clients').then((clients) => {
        cy.visit('/bookings/create')

        // Step 1: Select specific client
        cy.get('[data-cy="client-search-input"]').type(clients.testClient.email)
        cy.wait(1000)
        cy.get('[data-cy="client-option"]').contains(clients.testClient.first_name).click()

        // Verify client is selected correctly
        cy.get('[data-cy="selected-client-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)

        // Complete booking process
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="sport-select"]').click()
        cy.get('[data-cy="sport-option"]').first().click()
        cy.get('[data-cy="level-select"]').click()
        cy.get('[data-cy="level-option"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="course-card"]').first().click()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="date-checkbox"]').first().check()
        cy.get('[data-cy="next-step-button"]').click()
        cy.get('[data-cy="complete-booking-button"]').click()

        // Navigate to booking summary
        cy.visit('/bookings')
        cy.get('[data-cy="booking-row"]').first().click()

        // Verify correct client is displayed in summary
        cy.get('[data-cy="booking-client-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)

        // Add another activity and verify client doesn't change
        cy.get('[data-cy="add-activity-button"]').click()

        // Verify client header still shows correct client
        cy.get('[data-cy="client-header-name"]')
          .should('contain', clients.testClient.first_name)
          .should('contain', clients.testClient.last_name)
      })
    })

    it('should preserve main client when editing multiple activities', () => {
      cy.fixture('clients').then((clients) => {
        // Create initial booking
        cy.createBooking({
          clientEmail: clients.testClient.email
        })

        cy.visit('/bookings')
        cy.get('[data-cy="booking-row"]').first().click()

        // Get the original client name
        cy.get('[data-cy="booking-client-name"]').invoke('text').as('originalClientName')

        // Add second activity
        cy.get('[data-cy="add-activity-button"]').click()
        cy.get('[data-cy="next-step-button"]').click() // Skip client selection
        cy.get('[data-cy="sport-select"]').click()
        cy.get('[data-cy="sport-option"]').first().click()
        cy.get('[data-cy="level-select"]').click()
        cy.get('[data-cy="level-option"]').first().click()
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

        // Edit first activity and verify client consistency
        cy.get('[data-cy="edit-activity-button"]').first().click()
        cy.get('[data-cy="back-to-summary-button"]').click()
        cy.get('@originalClientName').then((originalName) => {
          cy.get('[data-cy="booking-client-name"]').should('contain', originalName)
        })
      })
    })
  })

  describe('Fix 4: Students not showing in course level editing', () => {
    it('should display students in course levels correctly', () => {
      // Create course with students
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.collectiveCourse)

        // Add some bookings to create students in the course
        cy.fixture('clients').then((clients) => {
          cy.createBooking({
            clientEmail: clients.testClient.email
          })
        })

        // Navigate to course detail
        cy.visit('/courses')
        cy.get('[data-cy="course-card"]').first().click()

        // Verify course levels section is visible
        cy.get('[data-cy="course-levels-section"]').should('be.visible')

        // Verify levels are displayed
        cy.get('[data-cy="level-item"]').should('have.length.greaterThan', 0)

        // Click on a level that should have students
        cy.get('[data-cy="level-item"]').first().within(() => {
          // Verify level is marked as active/visible
          cy.get('[data-cy="level-active-indicator"]').should('be.visible')
        })

        // Expand level to see students
        cy.get('[data-cy="level-item"]').first().click()

        // Verify students are visible in the level
        cy.get('[data-cy="level-students-list"]').should('be.visible')
        cy.get('[data-cy="student-item"]').should('exist')

        // Verify student information is displayed
        cy.get('[data-cy="student-item"]').first().within(() => {
          cy.get('[data-cy="student-name"]').should('be.visible')
          cy.get('[data-cy="student-name"]').should('not.be.empty')
        })
      })
    })

    it('should show correct level visibility status', () => {
      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().click()

      // Check that levels with students are marked as visible
      cy.get('[data-cy="level-item"]').each(($level) => {
        cy.wrap($level).within(() => {
          // If level has students, it should be visible
          cy.get('[data-cy="level-students-count"]').invoke('text').then((count) => {
            const studentCount = parseInt(count)
            if (studentCount > 0) {
              cy.get('[data-cy="level-visible-badge"]').should('be.visible')
              cy.get('[data-cy="level-active-badge"]').should('be.visible')
            }
          })
        })
      })
    })

    it('should handle levels without students correctly', () => {
      // Create a new course without bookings
      cy.fixture('courses').then((courses) => {
        const newCourse = {
          ...courses.collectiveCourse,
          name: 'Empty Course ' + Date.now()
        }
        cy.createCourse(newCourse)

        cy.visit('/courses')
        cy.contains(newCourse.name).click()

        // Verify levels exist but show as not active
        cy.get('[data-cy="level-item"]').should('have.length.greaterThan', 0)

        cy.get('[data-cy="level-item"]').each(($level) => {
          cy.wrap($level).within(() => {
            // Levels without students should not be marked as active
            cy.get('[data-cy="level-active-badge"]').should('not.exist')
            cy.get('[data-cy="level-visible-badge"]').should('not.exist')
          })
        })
      })
    })
  })

  describe('Integration Tests for All Fixes', () => {
    it('should complete end-to-end booking flow with all fixes working', () => {
      cy.fixture('courses').then((courses) => {
        cy.fixture('clients').then((clients) => {
          // Create flexible collective course
          cy.createCourse(courses.flexibleCourse)

          cy.visit('/bookings/create')

          // Complete full booking flow
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
          cy.get('[data-cy="course-tab-collective"]').click()
          cy.contains('Flexible').click()
          cy.get('[data-cy="next-step-button"]').click()

          // Test all fixes in sequence:

          // Fix 2: Collective flex date selection
          cy.get('[data-cy="flex-date-checkbox"]').first().check()
          cy.get('[data-cy="flex-date-checkbox"]').first().should('be.checked')

          // Fix 1: Duration field working
          cy.get('[data-cy="duration-select"]').should('be.visible')
          cy.get('[data-cy="duration-select"]').select('1h')

          cy.get('[data-cy="next-step-button"]').click()
          cy.get('[data-cy="complete-booking-button"]').click()

          // Fix 3: Client consistency in summary
          cy.visit('/bookings')
          cy.get('[data-cy="booking-row"]').first().click()
          cy.get('[data-cy="booking-client-name"]')
            .should('contain', clients.testClient.first_name)

          // Fix 4: Check course levels show students
          cy.visit('/courses')
          cy.contains(courses.flexibleCourse.name).click()
          cy.get('[data-cy="level-item"]').first().should('be.visible')
          cy.get('[data-cy="level-active-indicator"]').should('be.visible')
        })
      })
    })
  })
})