/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom commands for V5 testing
Cypress.Commands.add('clearAuthData', () => {
  cy.clearLocalStorage([
    'boukii_v5_token',
    'boukii_v5_user', 
    'boukii_v5_school',
    'boukii_v5_season',
    'boukii_v5_temp_token'
  ]);
});

Cypress.Commands.add('mockV5AuthAPIs', () => {
  cy.intercept('POST', '**/api/v5/auth/initial-login', { 
    fixture: 'v5/auth/initial-login.json' 
  }).as('initialLogin');
  
  cy.intercept('POST', '**/api/v5/auth/select-school', { 
    fixture: 'v5/auth/select-school.json' 
  }).as('selectSchool');
  
  cy.intercept('GET', '**/api/v5/auth/me', { 
    fixture: 'v5/auth/me.json' 
  }).as('getUserInfo');
});

declare global {
  namespace Cypress {
    interface Chainable {
      clearAuthData(): Chainable<void>;
      mockV5AuthAPIs(): Chainable<void>;
    }
  }
}