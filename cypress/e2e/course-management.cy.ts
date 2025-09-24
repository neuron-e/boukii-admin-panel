/// <reference types="cypress" />

describe('Course Management Tests', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('Course Creation', () => {
    it('should create a collective course with all required fields', () => {
      cy.visit('/courses')
      cy.get('[data-cy="create-course-button"]').click()

      // Basic information
      cy.get('[data-cy="course-name-input"]').type('Curso Colectivo Automatizado')
      cy.get('[data-cy="course-sport-select"]').select('1') // Tennis
      cy.get('[data-cy="course-type-select"]').select('1') // Collective
      cy.get('[data-cy="course-price-input"]').type('45.00')
      cy.get('[data-cy="course-currency-select"]').select('EUR')
      cy.get('[data-cy="course-duration-input"]').type('1h')
      cy.get('[data-cy="course-max-participants-input"]').type('8')

      // Add course dates
      cy.get('[data-cy="course-date-0"]').type('2024-12-15')
      cy.get('[data-cy="course-start-time-0"]').type('10:00')
      cy.get('[data-cy="course-end-time-0"]').type('11:00')

      // Add second date
      cy.get('[data-cy="add-course-date-button"]').click()
      cy.get('[data-cy="course-date-1"]').type('2024-12-16')
      cy.get('[data-cy="course-start-time-1"]').type('10:00')
      cy.get('[data-cy="course-end-time-1"]').type('11:00')

      // Save course
      cy.get('[data-cy="save-course-button"]').click()
      cy.verifyNotification('Course created successfully')

      // Verify course appears in list
      cy.get('[data-cy="courses-list"]').should('contain', 'Curso Colectivo Automatizado')
    })

    it('should create a private flexible course with price ranges', () => {
      cy.visit('/courses')
      cy.get('[data-cy="create-course-button"]').click()

      // Basic information
      cy.get('[data-cy="course-name-input"]').type('Curso Privado Flexible')
      cy.get('[data-cy="course-sport-select"]').select('1')
      cy.get('[data-cy="course-type-select"]').select('2') // Private
      cy.get('[data-cy="course-flexible-checkbox"]').check()

      // Configure price ranges for flexible course
      cy.get('[data-cy="price-range-section"]').should('be.visible')

      // 30 minutes range
      cy.get('[data-cy="price-range-0-duration"]').type('30m')
      cy.get('[data-cy="price-range-0-1-participant"]').type('25.00')
      cy.get('[data-cy="price-range-0-2-participants"]').type('40.00')
      cy.get('[data-cy="price-range-0-3-participants"]').type('55.00')

      // Add 1 hour range
      cy.get('[data-cy="add-price-range-button"]').click()
      cy.get('[data-cy="price-range-1-duration"]').type('1h')
      cy.get('[data-cy="price-range-1-1-participant"]').type('50.00')
      cy.get('[data-cy="price-range-1-2-participants"]').type('80.00')
      cy.get('[data-cy="price-range-1-3-participants"]').type('110.00')

      // Course dates (flexible availability)
      cy.get('[data-cy="course-date-0"]').type('2024-12-15')
      cy.get('[data-cy="course-start-time-0"]').type('09:00')
      cy.get('[data-cy="course-end-time-0"]').type('18:00')

      cy.get('[data-cy="save-course-button"]').click()
      cy.verifyNotification('Course created successfully')

      // Verify flexible badge appears
      cy.get('[data-cy="course-card"]').first().within(() => {
        cy.get('[data-cy="course-flexible-badge"]').should('be.visible')
      })
    })

    it('should validate required fields and show appropriate errors', () => {
      cy.visit('/courses')
      cy.get('[data-cy="create-course-button"]').click()

      // Try to save without filling required fields
      cy.get('[data-cy="save-course-button"]').click()

      // Verify validation errors
      cy.get('[data-cy="course-name-error"]').should('contain', 'required')
      cy.get('[data-cy="course-sport-error"]').should('contain', 'required')
      cy.get('[data-cy="course-type-error"]').should('contain', 'required')
      cy.get('[data-cy="course-price-error"]').should('contain', 'required')

      // Fill fields one by one and verify errors disappear
      cy.get('[data-cy="course-name-input"]').type('Test Course')
      cy.get('[data-cy="course-name-error"]').should('not.exist')

      cy.get('[data-cy="course-sport-select"]').select('1')
      cy.get('[data-cy="course-sport-error"]').should('not.exist')

      cy.get('[data-cy="course-type-select"]').select('1')
      cy.get('[data-cy="course-type-error"]').should('not.exist')

      // For collective courses, price should be simple input
      cy.get('[data-cy="course-price-input"]').type('50.00')
      cy.get('[data-cy="course-price-error"]').should('not.exist')

      // Continue with remaining required fields
      cy.get('[data-cy="course-duration-input"]').type('1h')
      cy.get('[data-cy="course-max-participants-input"]').type('10')

      // Add at least one date
      cy.get('[data-cy="course-date-0"]').type('2024-12-20')
      cy.get('[data-cy="course-start-time-0"]').type('14:00')
      cy.get('[data-cy="course-end-time-0"]').type('15:00')

      // Now save should work
      cy.get('[data-cy="save-course-button"]').click()
      cy.verifyNotification('Course created successfully')
    })

    it('should handle course extras configuration', () => {
      cy.visit('/courses')
      cy.get('[data-cy="create-course-button"]').click()

      // Fill basic course info
      cy.get('[data-cy="course-name-input"]').type('Course with Extras')
      cy.get('[data-cy="course-sport-select"]').select('1')
      cy.get('[data-cy="course-type-select"]').select('1')
      cy.get('[data-cy="course-price-input"]').type('40.00')
      cy.get('[data-cy="course-duration-input"]').type('1h')
      cy.get('[data-cy="course-max-participants-input"]').type('6')

      // Add course extras
      cy.get('[data-cy="course-extras-section"]').within(() => {
        cy.get('[data-cy="add-extra-button"]').click()

        cy.get('[data-cy="extra-0-name"]').type('Material de práctica')
        cy.get('[data-cy="extra-0-description"]').type('Raquetas y pelotas incluidas')
        cy.get('[data-cy="extra-0-price"]').type('10.00')
        cy.get('[data-cy="extra-0-quantity-type"]').select('per_person')

        // Add second extra
        cy.get('[data-cy="add-extra-button"]').click()
        cy.get('[data-cy="extra-1-name"]').type('Seguro de cancelación')
        cy.get('[data-cy="extra-1-description"]').type('Cobertura completa')
        cy.get('[data-cy="extra-1-price"]').type('5.00')
        cy.get('[data-cy="extra-1-quantity-type"]').select('per_booking')
      })

      // Add date
      cy.get('[data-cy="course-date-0"]').type('2024-12-18')
      cy.get('[data-cy="course-start-time-0"]').type('16:00')
      cy.get('[data-cy="course-end-time-0"]').type('17:00')

      cy.get('[data-cy="save-course-button"]').click()
      cy.verifyNotification('Course created successfully')

      // Verify extras are saved
      cy.get('[data-cy="course-card"]').first().click()
      cy.get('[data-cy="course-extras-list"]').should('contain', 'Material de práctica')
      cy.get('[data-cy="course-extras-list"]').should('contain', 'Seguro de cancelación')
    })
  })

  describe('Course Editing', () => {
    beforeEach(() => {
      // Create a test course first
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.collectiveCourse)
      })
    })

    it('should edit course basic information', () => {
      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().click()
      cy.get('[data-cy="edit-course-button"]').click()

      // Update course information
      cy.get('[data-cy="course-name-input"]').clear().type('Curso Actualizado')
      cy.get('[data-cy="course-price-input"]').clear().type('55.00')
      cy.get('[data-cy="course-max-participants-input"]').clear().type('12')

      cy.get('[data-cy="save-course-button"]').click()
      cy.verifyNotification('Course updated successfully')

      // Verify changes are reflected
      cy.get('[data-cy="course-detail-name"]').should('contain', 'Curso Actualizado')
      cy.get('[data-cy="course-detail-price"]').should('contain', '55.00')
    })

    it('should add and remove course dates', () => {
      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().click()
      cy.get('[data-cy="edit-course-button"]').click()

      // Add new date
      cy.get('[data-cy="add-course-date-button"]').click()
      const newDateIndex = 2
      cy.get(`[data-cy="course-date-${newDateIndex}"]`).type('2024-12-25')
      cy.get(`[data-cy="course-start-time-${newDateIndex}"]`).type('11:00')
      cy.get(`[data-cy="course-end-time-${newDateIndex}"]`).type('12:00')

      // Remove first date
      cy.get('[data-cy="remove-date-0"]').click()
      cy.get('[data-cy="confirm-remove-date"]').click()

      cy.get('[data-cy="save-course-button"]').click()
      cy.verifyNotification('Course updated successfully')

      // Verify date changes
      cy.get('[data-cy="course-dates-list"]').should('contain', '2024-12-25')
      cy.get('[data-cy="course-dates-list"]').should('not.contain', 'original-date')
    })

    it('should modify course levels and groups', () => {
      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().click()
      cy.get('[data-cy="edit-course-button"]').click()

      // Navigate to levels section
      cy.get('[data-cy="course-levels-tab"]').click()

      // Add new level
      cy.get('[data-cy="add-level-button"]').click()
      cy.get('[data-cy="level-select"]').select('2') // Intermediate level
      cy.get('[data-cy="add-selected-level"]').click()

      // Configure level details
      cy.get('[data-cy="level-2-max-participants"]').type('8')
      cy.get('[data-cy="level-2-min-participants"]').type('3')

      cy.get('[data-cy="save-course-button"]').click()
      cy.verifyNotification('Course updated successfully')

      // Verify level was added
      cy.get('[data-cy="course-levels-section"]').should('contain', 'Intermediate')
    })
  })

  describe('Course Deletion and Archive', () => {
    beforeEach(() => {
      cy.fixture('courses').then((courses) => {
        cy.createCourse({
          ...courses.collectiveCourse,
          name: 'Course to Delete'
        })
      })
    })

    it('should archive course instead of deleting when it has bookings', () => {
      // First create a booking for the course
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })
      })

      cy.visit('/courses')
      cy.contains('Course to Delete').parent('[data-cy="course-card"]').within(() => {
        cy.get('[data-cy="course-actions-menu"]').click()
        cy.get('[data-cy="delete-course-option"]').click()
      })

      // Should show archive confirmation instead of delete
      cy.get('[data-cy="archive-course-modal"]').should('be.visible')
      cy.get('[data-cy="archive-course-reason"]').should('contain', 'has active bookings')
      cy.get('[data-cy="confirm-archive-course"]').click()

      cy.verifyNotification('Course archived successfully')

      // Verify course is archived but still visible in archived filter
      cy.get('[data-cy="course-filter-archived"]').click()
      cy.get('[data-cy="courses-list"]').should('contain', 'Course to Delete')
      cy.get('[data-cy="course-archived-badge"]').should('be.visible')
    })

    it('should delete course when it has no bookings', () => {
      cy.visit('/courses')
      cy.contains('Course to Delete').parent('[data-cy="course-card"]').within(() => {
        cy.get('[data-cy="course-actions-menu"]').click()
        cy.get('[data-cy="delete-course-option"]').click()
      })

      // Should show delete confirmation
      cy.get('[data-cy="delete-course-modal"]').should('be.visible')
      cy.get('[data-cy="confirm-delete-course"]').click()

      cy.verifyNotification('Course deleted successfully')

      // Verify course is no longer in list
      cy.get('[data-cy="courses-list"]').should('not.contain', 'Course to Delete')
    })
  })

  describe('Course Filtering and Search', () => {
    beforeEach(() => {
      // Create multiple courses with different characteristics
      cy.fixture('courses').then((courses) => {
        cy.createCourse({
          ...courses.collectiveCourse,
          name: 'Tennis Beginner',
          sport_id: 1
        })
        cy.createCourse({
          ...courses.privateCourse,
          name: 'Padel Advanced',
          sport_id: 2
        })
        cy.createCourse({
          ...courses.flexibleCourse,
          name: 'Swimming Flexible',
          sport_id: 3
        })
      })
    })

    it('should filter courses by sport', () => {
      cy.visit('/courses')

      // Filter by Tennis
      cy.get('[data-cy="sport-filter"]').select('1')
      cy.get('[data-cy="apply-filters"]').click()

      cy.get('[data-cy="course-card"]').should('have.length', 1)
      cy.get('[data-cy="courses-list"]').should('contain', 'Tennis Beginner')
      cy.get('[data-cy="courses-list"]').should('not.contain', 'Padel Advanced')
      cy.get('[data-cy="courses-list"]').should('not.contain', 'Swimming Flexible')
    })

    it('should filter courses by type', () => {
      cy.visit('/courses')

      // Filter by Private courses
      cy.get('[data-cy="course-type-filter"]').select('2')
      cy.get('[data-cy="apply-filters"]').click()

      cy.get('[data-cy="courses-list"]').should('contain', 'Padel Advanced')
      cy.get('[data-cy="courses-list"]').should('not.contain', 'Tennis Beginner')
    })

    it('should search courses by name', () => {
      cy.visit('/courses')

      cy.get('[data-cy="course-search-input"]').type('Swimming')
      cy.get('[data-cy="search-courses-button"]').click()

      cy.get('[data-cy="course-card"]').should('have.length', 1)
      cy.get('[data-cy="courses-list"]').should('contain', 'Swimming Flexible')
    })

    it('should show no results message when no courses match filters', () => {
      cy.visit('/courses')

      cy.get('[data-cy="course-search-input"]').type('NonexistentCourse')
      cy.get('[data-cy="search-courses-button"]').click()

      cy.get('[data-cy="no-courses-message"]').should('be.visible')
      cy.get('[data-cy="no-courses-message"]').should('contain', 'No courses found')
    })

    it('should clear filters and show all courses', () => {
      cy.visit('/courses')

      // Apply some filters
      cy.get('[data-cy="sport-filter"]').select('1')
      cy.get('[data-cy="course-type-filter"]').select('2')
      cy.get('[data-cy="apply-filters"]').click()

      // Clear filters
      cy.get('[data-cy="clear-filters-button"]').click()

      // Should show all courses again
      cy.get('[data-cy="course-card"]').should('have.length.gte', 3)
    })
  })

  describe('Course Level Management - Bug Fix #4 Validation', () => {
    it('should show students in course levels correctly', () => {
      // Create course with bookings to ensure students exist
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.collectiveCourse)
      })

      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })
      })

      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().click()

      // Verify course levels section is visible
      cy.get('[data-cy="course-levels-section"]').should('be.visible')

      // Verify levels are displayed and some have students
      cy.get('[data-cy="level-item"]').should('have.length.greaterThan', 0)

      // Check for levels with students (should be visible and active)
      cy.get('[data-cy="level-item"]').each(($level) => {
        cy.wrap($level).within(() => {
          // If level has students, it should be visible and active
          cy.get('[data-cy="level-students-count"]').invoke('text').then((countText) => {
            const studentCount = parseInt(countText) || 0
            if (studentCount > 0) {
              cy.get('[data-cy="level-visible-badge"]').should('exist')
              cy.get('[data-cy="level-active-badge"]').should('exist')

              // Click to expand and see students
              cy.root().click()
              cy.get('[data-cy="level-students-list"]').should('be.visible')
              cy.get('[data-cy="student-item"]').should('have.length', studentCount)

              // Verify student information is displayed
              cy.get('[data-cy="student-item"]').first().within(() => {
                cy.get('[data-cy="student-name"]').should('be.visible')
                cy.get('[data-cy="student-name"]').should('not.be.empty')
              })
            }
          })
        })
      })
    })

    it('should handle empty levels correctly', () => {
      // Create a course without any bookings
      cy.fixture('courses').then((courses) => {
        cy.createCourse({
          ...courses.collectiveCourse,
          name: 'Empty Course ' + Date.now()
        })
      })

      cy.visit('/courses')
      cy.contains('Empty Course').click()

      // Verify levels exist but are not marked as active
      cy.get('[data-cy="level-item"]').should('have.length.greaterThan', 0)

      cy.get('[data-cy="level-item"]').each(($level) => {
        cy.wrap($level).within(() => {
          // Levels without students should not show active badges
          cy.get('[data-cy="level-active-badge"]').should('not.exist')
          cy.get('[data-cy="level-visible-badge"]').should('not.exist')
          cy.get('[data-cy="level-students-count"]').should('contain', '0')
        })
      })
    })

    it('should update level visibility when students are added or removed', () => {
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.collectiveCourse)
      })

      // Initially no students
      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().click()

      // Verify level is not active initially
      cy.get('[data-cy="level-item"]').first().within(() => {
        cy.get('[data-cy="level-active-badge"]').should('not.exist')
      })

      // Add a booking (which adds a student to a level)
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testClient.email
        })
      })

      // Refresh course detail page
      cy.reload()

      // Now level should be active
      cy.get('[data-cy="level-item"]').first().within(() => {
        cy.get('[data-cy="level-active-badge"]').should('exist')
        cy.get('[data-cy="level-visible-badge"]').should('exist')
        cy.get('[data-cy="level-students-count"]').should('not.contain', '0')
      })
    })
  })

  describe('Course Duplication', () => {
    beforeEach(() => {
      cy.fixture('courses').then((courses) => {
        cy.createCourse(courses.collectiveCourse)
      })
    })

    it('should duplicate course with all settings', () => {
      cy.visit('/courses')
      cy.get('[data-cy="course-card"]').first().within(() => {
        cy.get('[data-cy="course-actions-menu"]').click()
        cy.get('[data-cy="duplicate-course-option"]').click()
      })

      cy.get('[data-cy="duplicate-course-modal"]').should('be.visible')
      cy.get('[data-cy="new-course-name"]').clear().type('Duplicated Course')
      cy.get('[data-cy="confirm-duplicate"]').click()

      cy.verifyNotification('Course duplicated successfully')

      // Verify duplicated course exists
      cy.get('[data-cy="courses-list"]').should('contain', 'Duplicated Course')

      // Verify it has same settings as original
      cy.contains('Duplicated Course').click()
      cy.get('[data-cy="course-detail-type"]').should('contain', 'Colectivo')
      cy.get('[data-cy="course-detail-price"]').should('contain', '45.00')
    })
  })

  describe('Responsive Design', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport('iphone-x')
      cy.visit('/courses')

      // Mobile navigation should work
      cy.get('[data-cy="mobile-menu-button"]').click()
      cy.get('[data-cy="mobile-create-course"]').click()

      // Form should be mobile-optimized
      cy.get('[data-cy="course-form"]').should('be.visible')
      cy.get('[data-cy="course-name-input"]').should('be.visible')

      // Mobile-specific elements
      cy.get('[data-cy="mobile-save-button"]').should('be.visible')
    })

    it('should work correctly on tablet devices', () => {
      cy.viewport('ipad-2')
      cy.visit('/courses')

      // Tablet layout should show course cards in grid
      cy.get('[data-cy="course-grid"]').should('have.class', 'tablet-grid')
      cy.get('[data-cy="course-card"]').should('be.visible')
    })
  })
})