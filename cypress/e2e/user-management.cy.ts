/// <reference types="cypress" />

describe('User Management Tests', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('Client Management', () => {
    it('should create a new individual client', () => {
      cy.visit('/clients')
      cy.get('[data-cy="create-client-button"]').click()

      // Basic information
      cy.get('[data-cy="client-type-individual"]').click()
      cy.get('[data-cy="client-first-name"]').type('Carlos')
      cy.get('[data-cy="client-last-name"]').type('Mendoza')
      cy.get('[data-cy="client-email"]').type('carlos.mendoza@test.com')
      cy.get('[data-cy="client-phone"]').type('+34612345678')
      cy.get('[data-cy="client-birth-date"]').type('1988-06-15')

      // Address information
      cy.get('[data-cy="client-address"]').type('Calle Mayor 123')
      cy.get('[data-cy="client-city"]').type('Madrid')
      cy.get('[data-cy="client-postal-code"]').type('28001')
      cy.get('[data-cy="client-country"]').select('ES')

      // Additional information
      cy.get('[data-cy="client-language"]').select('es')
      cy.get('[data-cy="client-emergency-contact"]').type('Ana Mendoza')
      cy.get('[data-cy="client-emergency-phone"]').type('+34687654321')

      // Marketing preferences
      cy.get('[data-cy="accepts-marketing"]').check()
      cy.get('[data-cy="accepts-newsletter"]').check()

      cy.get('[data-cy="save-client-button"]').click()
      cy.verifyNotification('Client created successfully')

      // Verify client appears in list
      cy.visit('/clients')
      cy.get('[data-cy="clients-list"]').should('contain', 'Carlos Mendoza')
    })

    it('should create a family with main client and utilizers', () => {
      cy.visit('/clients')
      cy.get('[data-cy="create-client-button"]').click()

      // Create main client (family head)
      cy.get('[data-cy="client-type-family"]').click()
      cy.get('[data-cy="main-client-first-name"]').type('Patricia')
      cy.get('[data-cy="main-client-last-name"]').type('Rodriguez')
      cy.get('[data-cy="main-client-email"]').type('patricia.rodriguez@test.com')
      cy.get('[data-cy="main-client-phone"]').type('+34623456789')
      cy.get('[data-cy="main-client-birth-date"]').type('1982-03-20')

      // Add first child
      cy.get('[data-cy="add-utilizer-button"]').click()
      cy.get('[data-cy="utilizer-0-first-name"]').type('Sofia')
      cy.get('[data-cy="utilizer-0-last-name"]').type('Rodriguez')
      cy.get('[data-cy="utilizer-0-birth-date"]').type('2012-08-10')
      cy.get('[data-cy="utilizer-0-relationship"]').select('daughter')

      // Add second child
      cy.get('[data-cy="add-utilizer-button"]').click()
      cy.get('[data-cy="utilizer-1-first-name"]').type('Miguel')
      cy.get('[data-cy="utilizer-1-last-name"]').type('Rodriguez')
      cy.get('[data-cy="utilizer-1-birth-date"]').type('2014-11-25')
      cy.get('[data-cy="utilizer-1-relationship"]').select('son')

      // Family address (shared)
      cy.get('[data-cy="family-address"]').type('Avenida de la Paz 456')
      cy.get('[data-cy="family-city"]').type('Barcelona')
      cy.get('[data-cy="family-postal-code"]').type('08001')
      cy.get('[data-cy="family-country"]').select('ES')

      cy.get('[data-cy="save-family-button"]').click()
      cy.verifyNotification('Family created successfully')

      // Verify family appears in list
      cy.visit('/clients')
      cy.get('[data-cy="family-card"]').should('contain', 'Patricia Rodriguez')
      cy.get('[data-cy="family-members"]').should('contain', '2 children')
    })

    it('should edit client information', () => {
      // Create client first
      cy.fixture('clients').then((clients) => {
        cy.visit('/clients')
        cy.get('[data-cy="create-client-button"]').click()

        cy.get('[data-cy="client-type-individual"]').click()
        cy.get('[data-cy="client-first-name"]').type(clients.testClient.first_name)
        cy.get('[data-cy="client-last-name"]').type(clients.testClient.last_name)
        cy.get('[data-cy="client-email"]').type(clients.testClient.email)
        cy.get('[data-cy="client-phone"]').type(clients.testClient.phone)
        cy.get('[data-cy="client-birth-date"]').type(clients.testClient.birth_date)

        cy.get('[data-cy="save-client-button"]').click()
        cy.verifyNotification('Client created successfully')

        // Edit the client
        cy.visit('/clients')
        cy.get('[data-cy="client-card"]').first().click()
        cy.get('[data-cy="edit-client-button"]').click()

        // Update information
        cy.get('[data-cy="client-phone"]').clear().type('+34611222333')
        cy.get('[data-cy="client-address"]').clear().type('Nueva Dirección 789')
        cy.get('[data-cy="client-emergency-contact"]').clear().type('Nuevo Contacto')

        cy.get('[data-cy="save-client-button"]').click()
        cy.verifyNotification('Client updated successfully')

        // Verify changes are saved
        cy.get('[data-cy="client-phone-display"]').should('contain', '+34611222333')
        cy.get('[data-cy="client-address-display"]').should('contain', 'Nueva Dirección 789')
      })
    })

    it('should handle client level assignment and progression', () => {
      cy.fixture('clients').then((clients) => {
        // Create client and assign to course level
        cy.visit('/clients')
        cy.get('[data-cy="client-card"]').first().click()

        // Navigate to levels section
        cy.get('[data-cy="client-levels-tab"]').click()

        // Assign tennis level
        cy.get('[data-cy="add-level-button"]').click()
        cy.get('[data-cy="sport-select"]').select('1') // Tennis
        cy.get('[data-cy="level-select"]').select('1') // Beginner
        cy.get('[data-cy="assign-level"]').click()

        cy.verifyNotification('Level assigned successfully')

        // Verify level appears in client profile
        cy.get('[data-cy="client-levels-list"]').should('contain', 'Tennis - Beginner')
        cy.get('[data-cy="level-progress-indicator"]').should('be.visible')

        // Update level progression
        cy.get('[data-cy="level-item"]').first().within(() => {
          cy.get('[data-cy="update-progress-button"]').click()
        })

        cy.get('[data-cy="progress-modal"]').should('be.visible')
        cy.get('[data-cy="progress-percentage"]').clear().type('75')
        cy.get('[data-cy="progress-notes"]').type('Buen progreso en técnica de golpeo')
        cy.get('[data-cy="next-level-ready"]').check()

        cy.get('[data-cy="save-progress"]').click()
        cy.verifyNotification('Progress updated successfully')

        // Verify progress is displayed
        cy.get('[data-cy="progress-bar"]').should('have.attr', 'style').and('include', '75%')
        cy.get('[data-cy="ready-for-promotion"]').should('be.visible')
      })
    })

    it('should manage client documents and files', () => {
      cy.visit('/clients')
      cy.get('[data-cy="client-card"]').first().click()

      // Navigate to documents section
      cy.get('[data-cy="client-documents-tab"]').click()

      // Upload medical certificate
      cy.get('[data-cy="upload-document-button"]').click()
      cy.get('[data-cy="document-type"]').select('medical_certificate')
      cy.get('[data-cy="document-file"]').selectFile('cypress/fixtures/sample-certificate.pdf')
      cy.get('[data-cy="document-description"]').type('Certificado médico válido hasta 2025')
      cy.get('[data-cy="upload-document"]').click()

      cy.verifyNotification('Document uploaded successfully')

      // Verify document appears in list
      cy.get('[data-cy="documents-list"]').should('contain', 'Medical Certificate')
      cy.get('[data-cy="document-status"]').should('contain', 'Valid')

      // Add photo
      cy.get('[data-cy="upload-photo-button"]').click()
      cy.get('[data-cy="photo-file"]').selectFile('cypress/fixtures/client-photo.jpg')
      cy.get('[data-cy="upload-photo"]').click()

      // Verify photo is displayed
      cy.get('[data-cy="client-photo"]').should('be.visible')
      cy.get('[data-cy="client-photo"]').should('have.attr', 'src').and('include', 'client-photo')
    })

    it('should handle client search and filtering', () => {
      cy.visit('/clients')

      // Search by name
      cy.get('[data-cy="client-search-input"]').type('Carlos')
      cy.get('[data-cy="search-clients"]').click()

      cy.get('[data-cy="client-card"]').should('have.length.gte', 1)
      cy.get('[data-cy="client-name"]').should('contain', 'Carlos')

      // Filter by age range
      cy.get('[data-cy="age-filter-min"]').type('25')
      cy.get('[data-cy="age-filter-max"]').type('40')
      cy.get('[data-cy="apply-age-filter"]').click()

      // Filter by sport level
      cy.get('[data-cy="sport-filter"]').select('1') // Tennis
      cy.get('[data-cy="level-filter"]').select('1') // Beginner
      cy.get('[data-cy="apply-sport-filter"]').click()

      // Filter by membership status
      cy.get('[data-cy="membership-filter"]').select('active')
      cy.get('[data-cy="apply-membership-filter"]').click()

      // Clear all filters
      cy.get('[data-cy="clear-all-filters"]').click()
      cy.get('[data-cy="client-card"]').should('have.length.gte', 1)
    })
  })

  describe('Monitor Management', () => {
    it('should create a new monitor', () => {
      cy.visit('/monitors')
      cy.get('[data-cy="create-monitor-button"]').click()

      // Basic information
      cy.get('[data-cy="monitor-first-name"]').type('Alberto')
      cy.get('[data-cy="monitor-last-name"]').type('Fernandez')
      cy.get('[data-cy="monitor-email"]').type('alberto.fernandez@school.com')
      cy.get('[data-cy="monitor-phone"]').type('+34634567890')
      cy.get('[data-cy="monitor-birth-date"]').type('1985-09-12')

      // Professional information
      cy.get('[data-cy="monitor-license-number"]').type('MON-2024-001')
      cy.get('[data-cy="monitor-specializations"]').select(['tennis', 'padel'])
      cy.get('[data-cy="monitor-experience-years"]').type('8')
      cy.get('[data-cy="monitor-hourly-rate"]').type('35.00')

      // Availability
      cy.get('[data-cy="availability-monday"]').check()
      cy.get('[data-cy="monday-start"]').type('09:00')
      cy.get('[data-cy="monday-end"]').type('18:00')

      cy.get('[data-cy="availability-tuesday"]').check()
      cy.get('[data-cy="tuesday-start"]').type('09:00')
      cy.get('[data-cy="tuesday-end"]').type('18:00')

      // Languages
      cy.get('[data-cy="monitor-languages"]').select(['es', 'en'])

      cy.get('[data-cy="save-monitor-button"]').click()
      cy.verifyNotification('Monitor created successfully')

      // Verify monitor appears in list
      cy.visit('/monitors')
      cy.get('[data-cy="monitors-list"]').should('contain', 'Alberto Fernandez')
    })

    it('should manage monitor schedule and availability', () => {
      cy.visit('/monitors')
      cy.get('[data-cy="monitor-card"]').first().click()

      // Navigate to schedule tab
      cy.get('[data-cy="monitor-schedule-tab"]').click()

      // Add special availability
      cy.get('[data-cy="add-special-availability"]').click()
      cy.get('[data-cy="special-date"]').type('2024-12-24')
      cy.get('[data-cy="special-start-time"]').type('10:00')
      cy.get('[data-cy="special-end-time"]').type('14:00')
      cy.get('[data-cy="special-notes"]').type('Horario especial Nochebuena')

      cy.get('[data-cy="save-special-availability"]').click()

      // Add time off
      cy.get('[data-cy="add-time-off"]').click()
      cy.get('[data-cy="time-off-start"]').type('2024-12-25')
      cy.get('[data-cy="time-off-end"]').type('2024-12-26')
      cy.get('[data-cy="time-off-reason"]').select('vacation')
      cy.get('[data-cy="time-off-notes"]').type('Vacaciones de Navidad')

      cy.get('[data-cy="save-time-off"]').click()

      // Verify changes are reflected in calendar
      cy.get('[data-cy="monitor-calendar"]').within(() => {
        cy.get('[data-cy="special-availability"]').should('be.visible')
        cy.get('[data-cy="time-off-period"]').should('be.visible')
      })
    })

    it('should assign monitors to courses', () => {
      cy.visit('/monitors')
      cy.get('[data-cy="monitor-card"]').first().click()

      // Navigate to courses tab
      cy.get('[data-cy="monitor-courses-tab"]').click()

      // Assign to course
      cy.get('[data-cy="assign-course-button"]').click()
      cy.get('[data-cy="course-select"]').select('1')
      cy.get('[data-cy="course-role"]').select('main_instructor')
      cy.get('[data-cy="assignment-start-date"]').type('2024-12-01')
      cy.get('[data-cy="assignment-end-date"]').type('2024-12-31')

      cy.get('[data-cy="assign-monitor"]').click()
      cy.verifyNotification('Monitor assigned to course successfully')

      // Verify assignment appears
      cy.get('[data-cy="monitor-assignments"]').should('contain', 'Tennis Course')
      cy.get('[data-cy="assignment-role"]').should('contain', 'Main Instructor')
    })

    it('should track monitor performance and reviews', () => {
      cy.visit('/monitors')
      cy.get('[data-cy="monitor-card"]').first().click()

      // Navigate to performance tab
      cy.get('[data-cy="monitor-performance-tab"]').click()

      // Add performance review
      cy.get('[data-cy="add-review-button"]').click()
      cy.get('[data-cy="review-period"]').select('Q4-2024')
      cy.get('[data-cy="teaching-skills"]').select('4') // 1-5 scale
      cy.get('[data-cy="punctuality"]').select('5')
      cy.get('[data-cy="client-feedback"]').select('4')
      cy.get('[data-cy="overall-rating"]').select('4')
      cy.get('[data-cy="review-notes"]').type('Excelente monitor, muy profesional y puntual')

      cy.get('[data-cy="save-review"]').click()

      // View performance metrics
      cy.get('[data-cy="performance-metrics"]').should('be.visible')
      cy.get('[data-cy="average-rating"]').should('contain', '4')
      cy.get('[data-cy="total-classes"]').should('be.visible')
      cy.get('[data-cy="client-satisfaction"]').should('be.visible')
    })
  })

  describe('User Authentication and Permissions', () => {
    it('should manage user roles and permissions', () => {
      cy.visit('/admin/users')

      // Create new admin user
      cy.get('[data-cy="create-user-button"]').click()
      cy.get('[data-cy="user-first-name"]').type('Admin')
      cy.get('[data-cy="user-last-name"]').type('Secundario')
      cy.get('[data-cy="user-email"]').type('admin2@school.com')
      cy.get('[data-cy="user-role"]').select('admin')

      // Set permissions
      cy.get('[data-cy="permission-manage-courses"]').check()
      cy.get('[data-cy="permission-manage-bookings"]').check()
      cy.get('[data-cy="permission-view-reports"]').check()
      cy.get('[data-cy="permission-manage-clients"]').uncheck() // Limited access

      cy.get('[data-cy="save-user"]').click()
      cy.verifyNotification('User created successfully')

      // Verify user appears in list
      cy.get('[data-cy="users-list"]').should('contain', 'Admin Secundario')

      // Test permission enforcement
      cy.login('admin2@school.com', 'temp-password')
      cy.visit('/clients')
      cy.get('[data-cy="access-denied"]').should('be.visible')

      cy.visit('/courses')
      cy.get('[data-cy="courses-list"]').should('be.visible') // Has access
    })

    it('should handle password reset', () => {
      cy.visit('/login')
      cy.get('[data-cy="forgot-password-link"]').click()

      cy.get('[data-cy="reset-email"]').type('user@school.com')
      cy.get('[data-cy="send-reset-link"]').click()

      cy.verifyNotification('Password reset link sent')

      // Simulate clicking reset link (would come from email)
      cy.visit('/reset-password?token=mock-reset-token')

      cy.get('[data-cy="new-password"]').type('NewSecurePassword123')
      cy.get('[data-cy="confirm-password"]').type('NewSecurePassword123')
      cy.get('[data-cy="reset-password-button"]').click()

      cy.verifyNotification('Password reset successfully')
      cy.url().should('include', '/login')
    })

    it('should enforce session timeout', () => {
      cy.login()
      cy.visit('/courses')

      // Simulate session timeout
      cy.window().then((win) => {
        win.localStorage.setItem('session-timeout', Date.now() - 1000)
      })

      // Next page navigation should redirect to login
      cy.visit('/bookings')
      cy.url().should('include', '/login')
      cy.get('[data-cy="session-expired-message"]').should('be.visible')
    })
  })

  describe('Data Import and Export', () => {
    it('should import clients from CSV', () => {
      cy.visit('/clients')
      cy.get('[data-cy="import-clients-button"]').click()

      // Upload CSV file
      cy.get('[data-cy="csv-file-input"]').selectFile('cypress/fixtures/clients-import.csv')

      // Map CSV columns
      cy.get('[data-cy="map-first-name"]').select('First Name')
      cy.get('[data-cy="map-last-name"]').select('Last Name')
      cy.get('[data-cy="map-email"]').select('Email')
      cy.get('[data-cy="map-phone"]').select('Phone')
      cy.get('[data-cy="map-birth-date"]').select('Birth Date')

      cy.get('[data-cy="preview-import"]').click()

      // Review import preview
      cy.get('[data-cy="import-preview"]').should('be.visible')
      cy.get('[data-cy="preview-row"]').should('have.length.gte', 1)

      cy.get('[data-cy="confirm-import"]').click()
      cy.verifyNotification('Clients imported successfully')

      // Verify imported clients appear
      cy.get('[data-cy="clients-list"]').should('contain', 'Imported Client')
    })

    it('should export client data', () => {
      cy.visit('/clients')

      // Select export options
      cy.get('[data-cy="export-clients-button"]').click()
      cy.get('[data-cy="export-format"]').select('excel')
      cy.get('[data-cy="export-date-range"]').check()
      cy.get('[data-cy="export-start-date"]').type('2024-01-01')
      cy.get('[data-cy="export-end-date"]').type('2024-12-31')

      // Select fields to export
      cy.get('[data-cy="export-field-name"]').check()
      cy.get('[data-cy="export-field-email"]').check()
      cy.get('[data-cy="export-field-phone"]').check()
      cy.get('[data-cy="export-field-bookings"]').check()

      cy.get('[data-cy="generate-export"]').click()
      cy.verifyNotification('Export generated successfully')

      cy.readFile('cypress/downloads/clients-export.xlsx').should('exist')
    })
  })

  describe('Communication Tools', () => {
    it('should send bulk emails to clients', () => {
      cy.visit('/clients')

      // Select multiple clients
      cy.get('[data-cy="client-checkbox"]').each($checkbox => {
        cy.wrap($checkbox).check()
      })

      cy.get('[data-cy="bulk-actions"]').click()
      cy.get('[data-cy="send-bulk-email"]').click()

      // Compose email
      cy.get('[data-cy="email-template"]').select('course-reminder')
      cy.get('[data-cy="email-subject"]').clear().type('Recordatorio de clase')
      cy.get('[data-cy="email-body"]').clear().type('Les recordamos su clase programada para mañana')

      // Add personalization
      cy.get('[data-cy="add-personalization"]').click()
      cy.get('[data-cy="personalization-field"]').select('first_name')

      cy.get('[data-cy="send-emails"]').click()
      cy.verifyNotification('Emails sent successfully')

      // Verify email log
      cy.visit('/admin/email-log')
      cy.get('[data-cy="email-entry"]').should('contain', 'Recordatorio de clase')
    })

    it('should send SMS notifications', () => {
      cy.visit('/clients')
      cy.get('[data-cy="client-card"]').first().click()

      cy.get('[data-cy="send-sms-button"]').click()

      // Compose SMS
      cy.get('[data-cy="sms-template"]').select('class-reminder')
      cy.get('[data-cy="sms-message"]').clear().type('Hola {name}, recordatorio de su clase mañana a las {time}')

      cy.get('[data-cy="send-sms"]').click()
      cy.verifyNotification('SMS sent successfully')

      // Verify SMS log
      cy.get('[data-cy="communication-log"]').should('contain', 'SMS sent')
    })
  })

  describe('GDPR Compliance', () => {
    it('should handle data consent and privacy settings', () => {
      cy.visit('/clients')
      cy.get('[data-cy="client-card"]').first().click()

      // Navigate to privacy tab
      cy.get('[data-cy="client-privacy-tab"]').click()

      // Review consent settings
      cy.get('[data-cy="marketing-consent"]').should('be.visible')
      cy.get('[data-cy="data-processing-consent"]').should('be.visible')
      cy.get('[data-cy="photo-consent"]').should('be.visible')

      // Update consent
      cy.get('[data-cy="marketing-consent"]').uncheck()
      cy.get('[data-cy="consent-date"]').should('be.visible')

      cy.get('[data-cy="save-privacy-settings"]').click()
      cy.verifyNotification('Privacy settings updated')

      // Verify consent history
      cy.get('[data-cy="consent-history"]').should('contain', 'Marketing consent withdrawn')
    })

    it('should export client data (GDPR data request)', () => {
      cy.visit('/clients')
      cy.get('[data-cy="client-card"]').first().click()

      cy.get('[data-cy="client-actions"]').click()
      cy.get('[data-cy="export-client-data"]').click()

      // GDPR data export
      cy.get('[data-cy="gdpr-export-modal"]').should('be.visible')
      cy.get('[data-cy="include-bookings"]').check()
      cy.get('[data-cy="include-payments"]').check()
      cy.get('[data-cy="include-communications"]').check()

      cy.get('[data-cy="generate-gdpr-export"]').click()
      cy.verifyNotification('GDPR export generated')

      // Verify comprehensive data file
      cy.readFile('cypress/downloads/client-data-export.json').should('exist')
    })

    it('should handle data deletion requests', () => {
      cy.visit('/clients')
      cy.get('[data-cy="client-card"]').first().click()

      cy.get('[data-cy="client-actions"]').click()
      cy.get('[data-cy="delete-client-data"]').click()

      // Data deletion confirmation
      cy.get('[data-cy="data-deletion-modal"]').should('be.visible')
      cy.get('[data-cy="deletion-reason"]').select('gdpr_request')
      cy.get('[data-cy="deletion-confirmation"]').type('DELETE')

      // Legal retention warning
      cy.get('[data-cy="retention-warning"]').should('contain', 'financial records will be retained')

      cy.get('[data-cy="confirm-deletion"]').click()
      cy.verifyNotification('Client data deletion scheduled')

      // Verify client is marked for deletion
      cy.get('[data-cy="client-status"]').should('contain', 'Pending Deletion')
    })
  })
})