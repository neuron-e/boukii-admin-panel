import { adminLoginSelectors } from '../support/commands'

describe('Admin Login', () => {
  const rawEmail = Cypress.env('ADMIN_EMAIL') || 'info@skischulechurwalden.ch'
  const rawPassword = Cypress.env('ADMIN_PASSWORD') || 'SkiSchule2025!'

  const email = rawEmail.trim()
  const password = rawPassword.trim()

  it('ADM-LOGIN-001 – login correcto con credenciales válidas', () => {
    // QA Case: ADM-LOGIN-001 (Smoke de acceso admin)
    cy.loginAsAdmin(email, password)
  })

  it('ADM-LOGIN-002 – login con contraseña incorrecta muestra error', () => {
    cy.visit('/')

    cy.contains('E-Mail').should('be.visible')

    cy.get(adminLoginSelectors.emailInput).first().type(email)
    cy.get(adminLoginSelectors.passwordInput)
      .first()
      .type('ContraseñaIncorrecta123!', { log: false })
    cy.get(adminLoginSelectors.submitButton).first().click()

    cy.url().should('include', 'login')

    cy.contains(/invalid|error|credenciales|usuario o contraseña/i, { timeout: 10000 }).should(
      'be.visible'
    )
  })
})
