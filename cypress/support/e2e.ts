// ***********************************************************
// This file is processed and loaded automatically before your test files.
// You can read more here: https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configure global behavior
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  return true
})

// Add custom assertions
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
      createCourse(courseData: any): Chainable<void>
      createBooking(bookingData: any): Chainable<void>
      waitForApiResponse(alias: string, timeout?: number): Chainable<void>
      verifyNotification(message: string): Chainable<void>
    }
  }
}