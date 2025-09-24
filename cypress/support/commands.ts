/// <reference types="cypress" />

/**
 * Custom command to login to the application
 */
Cypress.Commands.add('login', (email?: string, password?: string) => {
  const testEmail = email || Cypress.env('TEST_EMAIL')
  const testPassword = password || Cypress.env('TEST_PASSWORD')

  cy.session([testEmail, testPassword], () => {
    cy.visit('/login')
    cy.get('[data-cy="email-input"]').type(testEmail)
    cy.get('[data-cy="password-input"]').type(testPassword)
    cy.get('[data-cy="login-button"]').click()

    // Wait for successful login
    cy.url().should('not.include', '/login')
    cy.get('[data-cy="user-menu"]').should('be.visible')
  })
})

/**
 * Custom command to create a course
 */
Cypress.Commands.add('createCourse', (courseData: any) => {
  const defaultCourseData = {
    name: 'Test Course ' + Date.now(),
    sport_id: 1,
    course_type: 1, // 1: collective, 2: private
    price: '50.00',
    currency: 'EUR',
    duration: '1h',
    max_participants: 10,
    is_flexible: false,
    ...courseData
  }

  cy.visit('/courses')
  cy.get('[data-cy="create-course-button"]').click()

  // Fill basic course information
  cy.get('[data-cy="course-name-input"]').type(defaultCourseData.name)
  cy.get('[data-cy="course-sport-select"]').click()
  cy.get(`[data-cy="sport-option-${defaultCourseData.sport_id}"]`).click()
  cy.get('[data-cy="course-type-select"]').select(defaultCourseData.course_type.toString())
  cy.get('[data-cy="course-price-input"]').type(defaultCourseData.price)
  cy.get('[data-cy="course-duration-input"]').type(defaultCourseData.duration)
  cy.get('[data-cy="course-max-participants-input"]').type(defaultCourseData.max_participants.toString())

  if (defaultCourseData.is_flexible) {
    cy.get('[data-cy="course-flexible-checkbox"]').check()
  }

  // Add course dates
  if (courseData.dates) {
    courseData.dates.forEach((date: any, index: number) => {
      if (index > 0) {
        cy.get('[data-cy="add-course-date-button"]').click()
      }
      cy.get(`[data-cy="course-date-${index}"]`).type(date.date)
      cy.get(`[data-cy="course-start-time-${index}"]`).type(date.startTime)
      cy.get(`[data-cy="course-end-time-${index}"]`).type(date.endTime)
    })
  }

  cy.get('[data-cy="save-course-button"]').click()
  cy.verifyNotification('Course created successfully')
})

/**
 * Custom command to create a booking
 */
Cypress.Commands.add('createBooking', (bookingData: any) => {
  const defaultBookingData = {
    courseId: null,
    clientEmail: 'test@example.com',
    participants: 1,
    ...bookingData
  }

  cy.visit('/bookings/create')

  // Step 1: Select client
  cy.get('[data-cy="client-search-input"]').type(defaultBookingData.clientEmail)
  cy.wait(1000) // Wait for search results
  cy.get('[data-cy="client-option"]').first().click()
  cy.get('[data-cy="next-step-button"]').click()

  // Step 2: Select participants
  cy.get('[data-cy="participants-count"]').should('contain', defaultBookingData.participants)
  cy.get('[data-cy="next-step-button"]').click()

  // Step 3: Select sport and level
  cy.get('[data-cy="sport-select"]').click()
  cy.get('[data-cy="sport-option"]').first().click()
  cy.get('[data-cy="level-select"]').click()
  cy.get('[data-cy="level-option"]').first().click()
  cy.get('[data-cy="next-step-button"]').click()

  // Step 4: Select course and date
  if (defaultBookingData.courseId) {
    cy.get(`[data-cy="course-card-${defaultBookingData.courseId}"]`).click()
  } else {
    cy.get('[data-cy="course-card"]').first().click()
  }
  cy.get('[data-cy="next-step-button"]').click()

  // Step 5: Configure details
  cy.get('[data-cy="date-checkbox"]').first().check()
  cy.get('[data-cy="duration-select"]').should('be.visible')
  cy.get('[data-cy="next-step-button"]').click()

  // Step 6: Add observations
  cy.get('[data-cy="client-observations"]').type('Test booking created by Cypress')
  cy.get('[data-cy="complete-booking-button"]').click()

  cy.verifyNotification('Booking created successfully')
})

/**
 * Custom command to wait for API response
 */
Cypress.Commands.add('waitForApiResponse', (alias: string, timeout: number = 10000) => {
  cy.wait(alias, { timeout })
})

/**
 * Custom command to verify notification messages
 */
Cypress.Commands.add('verifyNotification', (message: string) => {
  cy.get('[data-cy="notification"]', { timeout: 10000 })
    .should('be.visible')
    .and('contain', message)
})