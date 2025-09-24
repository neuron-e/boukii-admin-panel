/// <reference types="cypress" />

describe('System Settings and Configuration Tests', () => {
  beforeEach(() => {
    cy.login()
  })

  describe('School Configuration', () => {
    it('should update school basic information', () => {
      cy.visit('/settings/school')

      // Basic information
      cy.get('[data-cy="school-name"]').clear().type('Academia de Tenis Premium')
      cy.get('[data-cy="school-description"]').clear().type('La mejor academia de tenis de la ciudad')
      cy.get('[data-cy="school-email"]').clear().type('info@tennispremium.com')
      cy.get('[data-cy="school-phone"]').clear().type('+34912345678')
      cy.get('[data-cy="school-website"]').clear().type('https://www.tennispremium.com')

      // Address information
      cy.get('[data-cy="school-address"]').clear().type('Calle del Deporte 100')
      cy.get('[data-cy="school-city"]').clear().type('Madrid')
      cy.get('[data-cy="school-postal-code"]').clear().type('28001')
      cy.get('[data-cy="school-country"]').select('ES')

      // Business information
      cy.get('[data-cy="tax-id"]').clear().type('B12345678')
      cy.get('[data-cy="registration-number"]').clear().type('REG-2024-001')

      cy.get('[data-cy="save-school-settings"]').click()
      cy.verifyNotification('School settings updated successfully')

      // Verify changes are reflected in header
      cy.get('[data-cy="school-name-header"]').should('contain', 'Academia de Tenis Premium')
    })

    it('should configure business hours and availability', () => {
      cy.visit('/settings/school')
      cy.get('[data-cy="business-hours-tab"]').click()

      // Configure weekday hours
      cy.get('[data-cy="monday-enabled"]').check()
      cy.get('[data-cy="monday-open"]').clear().type('08:00')
      cy.get('[data-cy="monday-close"]').clear().type('22:00')

      cy.get('[data-cy="tuesday-enabled"]').check()
      cy.get('[data-cy="tuesday-open"]').clear().type('08:00')
      cy.get('[data-cy="tuesday-close"]').clear().type('22:00')

      // Weekend hours
      cy.get('[data-cy="saturday-enabled"]').check()
      cy.get('[data-cy="saturday-open"]').clear().type('09:00')
      cy.get('[data-cy="saturday-close"]').clear().type('20:00')

      cy.get('[data-cy="sunday-enabled"]').uncheck()

      // Holiday configuration
      cy.get('[data-cy="add-holiday"]').click()
      cy.get('[data-cy="holiday-date"]').type('2024-12-25')
      cy.get('[data-cy="holiday-name"]').type('Navidad')
      cy.get('[data-cy="holiday-type"]').select('closed')

      cy.get('[data-cy="save-business-hours"]').click()
      cy.verifyNotification('Business hours updated successfully')

      // Verify hours appear in booking system
      cy.visit('/bookings/create')
      cy.get('[data-cy="time-slot-08-00"]').should('be.visible')
      cy.get('[data-cy="time-slot-23-00"]').should('not.exist')
    })

    it('should manage sports and levels', () => {
      cy.visit('/settings/sports')

      // Add new sport
      cy.get('[data-cy="add-sport-button"]').click()
      cy.get('[data-cy="sport-name"]').type('Pádel')
      cy.get('[data-cy="sport-description"]').type('Deporte de raqueta en pista cerrada')
      cy.get('[data-cy="sport-icon"]').selectFile('cypress/fixtures/padel-icon.svg')

      cy.get('[data-cy="save-sport"]').click()
      cy.verifyNotification('Sport added successfully')

      // Add levels for the sport
      cy.get('[data-cy="sport-item"]').contains('Pádel').within(() => {
        cy.get('[data-cy="manage-levels-button"]').click()
      })

      // Add beginner level
      cy.get('[data-cy="add-level-button"]').click()
      cy.get('[data-cy="level-name"]').type('Principiante')
      cy.get('[data-cy="level-description"]').type('Jugadores que se inician en el pádel')
      cy.get('[data-cy="level-color"]').type('#4CAF50')
      cy.get('[data-cy="level-order"]').type('1')

      cy.get('[data-cy="save-level"]').click()

      // Add intermediate level
      cy.get('[data-cy="add-level-button"]').click()
      cy.get('[data-cy="level-name"]').type('Intermedio')
      cy.get('[data-cy="level-description"]').type('Jugadores con conocimientos básicos')
      cy.get('[data-cy="level-color"]').type('#FF9800')
      cy.get('[data-cy="level-order"]').type('2')

      cy.get('[data-cy="save-level"]').click()

      // Verify levels appear in booking system
      cy.visit('/bookings/create')
      cy.get('[data-cy="sport-select"]').select('Pádel')
      cy.get('[data-cy="level-select"]').should('contain', 'Principiante')
      cy.get('[data-cy="level-select"]').should('contain', 'Intermedio')
    })

    it('should configure facilities and courts', () => {
      cy.visit('/settings/facilities')

      // Add tennis court
      cy.get('[data-cy="add-facility-button"]').click()
      cy.get('[data-cy="facility-name"]').type('Pista de Tenis 1')
      cy.get('[data-cy="facility-type"]').select('tennis_court')
      cy.get('[data-cy="facility-capacity"]').type('4')
      cy.get('[data-cy="facility-surface"]').select('clay')

      // Equipment and features
      cy.get('[data-cy="facility-lighting"]').check()
      cy.get('[data-cy="facility-covered"]').uncheck()
      cy.get('[data-cy="facility-air-conditioning"]').uncheck()

      // Availability
      cy.get('[data-cy="facility-available-sports"]').select(['tennis'])
      cy.get('[data-cy="facility-booking-advance"]').type('14') // days

      cy.get('[data-cy="save-facility"]').click()
      cy.verifyNotification('Facility added successfully')

      // Add maintenance schedule
      cy.get('[data-cy="facility-item"]').first().within(() => {
        cy.get('[data-cy="facility-maintenance"]').click()
      })

      cy.get('[data-cy="add-maintenance"]').click()
      cy.get('[data-cy="maintenance-date"]').type('2024-12-20')
      cy.get('[data-cy="maintenance-type"]').select('deep_cleaning')
      cy.get('[data-cy="maintenance-duration"]').type('4') // hours
      cy.get('[data-cy="maintenance-notes"]').type('Limpieza profunda mensual')

      cy.get('[data-cy="save-maintenance"]').click()

      // Verify facility appears in scheduler
      cy.visit('/scheduler')
      cy.get('[data-cy="view-mode-facilities"]').click()
      cy.get('[data-cy="facility-row"]').should('contain', 'Pista de Tenis 1')
    })
  })

  describe('Payment Configuration', () => {
    it('should configure payment methods and processors', () => {
      cy.visit('/settings/payments')

      // Enable payment methods
      cy.get('[data-cy="payment-cash-enabled"]').check()
      cy.get('[data-cy="payment-card-enabled"]').check()
      cy.get('[data-cy="payment-transfer-enabled"]').check()
      cy.get('[data-cy="payment-online-enabled"]').check()

      // Configure Stripe
      cy.get('[data-cy="stripe-settings"]').click()
      cy.get('[data-cy="stripe-public-key"]').type('pk_test_mock_key')
      cy.get('[data-cy="stripe-secret-key"]').type('sk_test_mock_key')
      cy.get('[data-cy="stripe-webhook-secret"]').type('whsec_mock_secret')

      cy.get('[data-cy="test-stripe-connection"]').click()
      cy.get('[data-cy="connection-status"]').should('contain', 'Connected')

      // Configure PayPal
      cy.get('[data-cy="paypal-settings"]').click()
      cy.get('[data-cy="paypal-client-id"]').type('mock_paypal_client_id')
      cy.get('[data-cy="paypal-client-secret"]').type('mock_paypal_secret')
      cy.get('[data-cy="paypal-sandbox"]').check()

      // Payment terms
      cy.get('[data-cy="payment-terms"]').select('net_15')
      cy.get('[data-cy="late-fee-percentage"]').type('5')
      cy.get('[data-cy="grace-period-days"]').type('7')

      cy.get('[data-cy="save-payment-settings"]').click()
      cy.verifyNotification('Payment settings updated successfully')
    })

    it('should configure pricing and discounts policies', () => {
      cy.visit('/settings/pricing')

      // Default pricing
      cy.get('[data-cy="default-currency"]').select('EUR')
      cy.get('[data-cy="tax-rate"]').clear().type('21')
      cy.get('[data-cy="tax-included"]').check()

      // Early bird discounts
      cy.get('[data-cy="early-bird-enabled"]').check()
      cy.get('[data-cy="early-bird-days"]').type('7')
      cy.get('[data-cy="early-bird-percentage"]').type('10')

      // Family discounts
      cy.get('[data-cy="family-discount-enabled"]').check()
      cy.get('[data-cy="second-child-discount"]').type('15')
      cy.get('[data-cy="third-child-discount"]').type('25')

      // Loyalty program
      cy.get('[data-cy="loyalty-program-enabled"]').check()
      cy.get('[data-cy="loyalty-points-ratio"]').type('100') // 1 point per 100 EUR
      cy.get('[data-cy="loyalty-discount-ratio"]').type('20') // 20 points = 1 EUR

      cy.get('[data-cy="save-pricing-settings"]').click()
      cy.verifyNotification('Pricing settings updated successfully')

      // Verify discounts are applied in booking
      cy.fixture('clients').then((clients) => {
        cy.createBooking({
          clientEmail: clients.testFamily.main_client.email,
          utilizers: 2
        })

        cy.visit('/bookings')
        cy.get('[data-cy="booking-row"]').first().click()
        cy.get('[data-cy="family-discount-applied"]').should('be.visible')
      })
    })
  })

  describe('Communication Settings', () => {
    it('should configure email settings and templates', () => {
      cy.visit('/settings/communications')

      // SMTP configuration
      cy.get('[data-cy="smtp-host"]').clear().type('smtp.gmail.com')
      cy.get('[data-cy="smtp-port"]').clear().type('587')
      cy.get('[data-cy="smtp-username"]').clear().type('admin@school.com')
      cy.get('[data-cy="smtp-password"]').clear().type('secure_password')
      cy.get('[data-cy="smtp-encryption"]').select('tls')

      cy.get('[data-cy="test-email-connection"]').click()
      cy.verifyNotification('Email connection test successful')

      // Configure email templates
      cy.get('[data-cy="email-templates-tab"]').click()

      // Booking confirmation template
      cy.get('[data-cy="template-booking-confirmation"]').click()
      cy.get('[data-cy="template-subject"]').clear().type('Confirmación de Reserva - {{course_name}}')
      cy.get('[data-cy="template-body"]').clear().type(`
        Hola {{client_name}},

        Tu reserva ha sido confirmada:
        - Curso: {{course_name}}
        - Fecha: {{booking_date}}
        - Hora: {{booking_time}}
        - Monitor: {{monitor_name}}

        ¡Te esperamos!
        {{school_name}}
      `)

      cy.get('[data-cy="save-template"]').click()

      // Test template with sample data
      cy.get('[data-cy="test-template"]').click()
      cy.get('[data-cy="template-preview"]').should('contain', 'Confirmación de Reserva')
    })

    it('should configure SMS notifications', () => {
      cy.visit('/settings/communications')
      cy.get('[data-cy="sms-settings-tab"]').click()

      // SMS provider configuration
      cy.get('[data-cy="sms-provider"]').select('twilio')
      cy.get('[data-cy="twilio-account-sid"]').type('mock_account_sid')
      cy.get('[data-cy="twilio-auth-token"]').type('mock_auth_token')
      cy.get('[data-cy="twilio-phone-number"]').type('+34600123456')

      cy.get('[data-cy="test-sms-connection"]').click()
      cy.verifyNotification('SMS connection test successful')

      // SMS templates
      cy.get('[data-cy="sms-reminder-template"]').clear().type(
        'Hola {{client_name}}, recordatorio: tienes clase de {{course_name}} mañana a las {{time}}. ¡Te esperamos!'
      )

      // SMS automation rules
      cy.get('[data-cy="auto-sms-booking-confirmation"]').check()
      cy.get('[data-cy="auto-sms-reminder"]').check()
      cy.get('[data-cy="reminder-hours-before"]').type('24')
      cy.get('[data-cy="auto-sms-cancellation"]').check()

      cy.get('[data-cy="save-sms-settings"]').click()
      cy.verifyNotification('SMS settings updated successfully')
    })

    it('should configure notification preferences', () => {
      cy.visit('/settings/notifications')

      // Admin notifications
      cy.get('[data-cy="admin-notifications"]').within(() => {
        cy.get('[data-cy="notify-new-booking"]').check()
        cy.get('[data-cy="notify-cancellation"]').check()
        cy.get('[data-cy="notify-payment-received"]').check()
        cy.get('[data-cy="notify-low-availability"]').check()
      })

      // Client notifications
      cy.get('[data-cy="client-notifications"]').within(() => {
        cy.get('[data-cy="booking-confirmation"]').check()
        cy.get('[data-cy="booking-reminder"]').check()
        cy.get('[data-cy="payment-reminder"]').check()
        cy.get('[data-cy="class-cancellation"]').check()
        cy.get('[data-cy="newsletter"]').check()
      })

      // Monitor notifications
      cy.get('[data-cy="monitor-notifications"]').within(() => {
        cy.get('[data-cy="schedule-changes"]').check()
        cy.get('[data-cy="new-assignments"]').check()
        cy.get('[data-cy="student-cancellations"]').check()
      })

      cy.get('[data-cy="save-notification-settings"]').click()
      cy.verifyNotification('Notification settings updated successfully')
    })
  })

  describe('Security and Access Control', () => {
    it('should configure password policies', () => {
      cy.visit('/settings/security')

      // Password requirements
      cy.get('[data-cy="min-password-length"]').clear().type('8')
      cy.get('[data-cy="require-uppercase"]').check()
      cy.get('[data-cy="require-lowercase"]').check()
      cy.get('[data-cy="require-numbers"]').check()
      cy.get('[data-cy="require-symbols"]').check()

      // Session settings
      cy.get('[data-cy="session-timeout"]').clear().type('120') // minutes
      cy.get('[data-cy="max-concurrent-sessions"]').clear().type('3')
      cy.get('[data-cy="force-password-change"]').clear().type('90') // days

      // Login attempt limits
      cy.get('[data-cy="max-login-attempts"]').clear().type('5')
      cy.get('[data-cy="lockout-duration"]').clear().type('30') // minutes

      cy.get('[data-cy="save-security-settings"]').click()
      cy.verifyNotification('Security settings updated successfully')

      // Test password validation
      cy.visit('/admin/users')
      cy.get('[data-cy="create-user-button"]').click()
      cy.get('[data-cy="user-password"]').type('weak')
      cy.get('[data-cy="password-strength"]').should('contain', 'Weak')

      cy.get('[data-cy="user-password"]').clear().type('StrongP@ssw0rd!')
      cy.get('[data-cy="password-strength"]').should('contain', 'Strong')
    })

    it('should configure two-factor authentication', () => {
      cy.visit('/settings/security')
      cy.get('[data-cy="two-factor-tab"]').click()

      // Enable 2FA for admin accounts
      cy.get('[data-cy="require-2fa-admin"]').check()
      cy.get('[data-cy="require-2fa-monitors"]').uncheck()

      // 2FA methods
      cy.get('[data-cy="2fa-authenticator-app"]').check()
      cy.get('[data-cy="2fa-sms"]').check()
      cy.get('[data-cy="2fa-email"]').uncheck()

      // Backup codes
      cy.get('[data-cy="backup-codes-enabled"]').check()
      cy.get('[data-cy="backup-codes-count"]').clear().type('10')

      cy.get('[data-cy="save-2fa-settings"]').click()
      cy.verifyNotification('Two-factor authentication settings updated')

      // Test 2FA setup for user
      cy.visit('/profile/security')
      cy.get('[data-cy="setup-2fa"]').click()
      cy.get('[data-cy="qr-code"]').should('be.visible')
      cy.get('[data-cy="backup-codes"]').should('be.visible')
    })

    it('should manage API access and webhooks', () => {
      cy.visit('/settings/api')

      // Create API key
      cy.get('[data-cy="create-api-key"]').click()
      cy.get('[data-cy="api-key-name"]').type('Mobile App Integration')
      cy.get('[data-cy="api-key-permissions"]').select(['read_bookings', 'create_bookings'])
      cy.get('[data-cy="api-key-expires"]').type('2025-12-31')

      cy.get('[data-cy="generate-api-key"]').click()
      cy.get('[data-cy="api-key-value"]').should('be.visible')
      cy.get('[data-cy="copy-api-key"]').click()

      // Configure webhooks
      cy.get('[data-cy="webhooks-tab"]').click()
      cy.get('[data-cy="add-webhook"]').click()

      cy.get('[data-cy="webhook-name"]').type('External System Integration')
      cy.get('[data-cy="webhook-url"]').type('https://external-system.com/webhook')
      cy.get('[data-cy="webhook-events"]').select(['booking_created', 'booking_cancelled', 'payment_received'])
      cy.get('[data-cy="webhook-secret"]').type('webhook_secret_key')

      cy.get('[data-cy="save-webhook"]').click()

      // Test webhook
      cy.get('[data-cy="test-webhook"]').click()
      cy.get('[data-cy="webhook-test-result"]').should('contain', 'Success')
    })
  })

  describe('Backup and Data Management', () => {
    it('should configure automated backups', () => {
      cy.visit('/settings/backup')

      // Backup schedule
      cy.get('[data-cy="backup-enabled"]').check()
      cy.get('[data-cy="backup-frequency"]').select('daily')
      cy.get('[data-cy="backup-time"]').clear().type('02:00')

      // Backup storage
      cy.get('[data-cy="backup-storage"]').select('aws_s3')
      cy.get('[data-cy="aws-access-key"]').type('mock_access_key')
      cy.get('[data-cy="aws-secret-key"]').type('mock_secret_key')
      cy.get('[data-cy="aws-bucket"]').type('school-backups')
      cy.get('[data-cy="aws-region"]').select('eu-west-1')

      // Retention policy
      cy.get('[data-cy="backup-retention-days"]').clear().type('30')
      cy.get('[data-cy="backup-compression"]').check()
      cy.get('[data-cy="backup-encryption"]').check()

      cy.get('[data-cy="save-backup-settings"]').click()
      cy.verifyNotification('Backup settings updated successfully')

      // Test backup
      cy.get('[data-cy="test-backup"]').click()
      cy.get('[data-cy="backup-progress"]').should('be.visible')
      cy.get('[data-cy="backup-complete"]').should('be.visible')
    })

    it('should manage data retention policies', () => {
      cy.visit('/settings/data-retention')

      // Client data retention
      cy.get('[data-cy="client-data-retention"]').clear().type('7') // years
      cy.get('[data-cy="inactive-client-retention"]').clear().type('3') // years

      // Booking data retention
      cy.get('[data-cy="booking-data-retention"]').clear().type('10') // years
      cy.get('[data-cy="cancelled-booking-retention"]').clear().type('2') // years

      // Financial data retention
      cy.get('[data-cy="financial-data-retention"]').clear().type('10') // years (legal requirement)
      cy.get('[data-cy="payment-data-retention"]').clear().type('7') // years

      // Log data retention
      cy.get('[data-cy="system-log-retention"]').clear().type('1') // year
      cy.get('[data-cy="audit-log-retention"]').clear().type('5') // years

      // Automated cleanup
      cy.get('[data-cy="auto-cleanup-enabled"]').check()
      cy.get('[data-cy="cleanup-schedule"]').select('monthly')

      cy.get('[data-cy="save-retention-settings"]').click()
      cy.verifyNotification('Data retention settings updated successfully')
    })

    it('should handle data import/export', () => {
      cy.visit('/settings/data-management')

      // Export all data
      cy.get('[data-cy="export-all-data"]').click()
      cy.get('[data-cy="export-format"]').select('json')
      cy.get('[data-cy="include-media-files"]').check()
      cy.get('[data-cy="encrypt-export"]').check()

      cy.get('[data-cy="generate-export"]').click()
      cy.get('[data-cy="export-progress"]').should('be.visible')
      cy.verifyNotification('Data export completed')

      // Import data
      cy.get('[data-cy="import-data-tab"]').click()
      cy.get('[data-cy="import-file"]').selectFile('cypress/fixtures/school-data.json')
      cy.get('[data-cy="import-mode"]').select('merge') // vs 'replace'

      cy.get('[data-cy="preview-import"]').click()
      cy.get('[data-cy="import-summary"]').should('be.visible')

      cy.get('[data-cy="confirm-import"]').click()
      cy.verifyNotification('Data import completed successfully')
    })
  })

  describe('Integration Settings', () => {
    it('should configure calendar integrations', () => {
      cy.visit('/settings/integrations')

      // Google Calendar
      cy.get('[data-cy="google-calendar-enabled"]').check()
      cy.get('[data-cy="google-calendar-id"]').type('school@domain.com')
      cy.get('[data-cy="sync-direction"]').select('bidirectional')

      // Outlook integration
      cy.get('[data-cy="outlook-enabled"]').check()
      cy.get('[data-cy="outlook-tenant-id"]').type('mock_tenant_id')
      cy.get('[data-cy="outlook-client-id"]').type('mock_client_id')

      // Sync settings
      cy.get('[data-cy="sync-frequency"]').select('every_hour')
      cy.get('[data-cy="sync-past-days"]').clear().type('7')
      cy.get('[data-cy="sync-future-days"]').clear().type('90')

      cy.get('[data-cy="save-calendar-settings"]').click()
      cy.verifyNotification('Calendar integration settings saved')

      // Test sync
      cy.get('[data-cy="test-calendar-sync"]').click()
      cy.get('[data-cy="sync-status"]').should('contain', 'Successful')
    })

    it('should configure CRM integrations', () => {
      cy.visit('/settings/integrations')
      cy.get('[data-cy="crm-tab"]').click()

      // HubSpot integration
      cy.get('[data-cy="hubspot-enabled"]').check()
      cy.get('[data-cy="hubspot-api-key"]').type('mock_hubspot_key')
      cy.get('[data-cy="hubspot-portal-id"]').type('12345678')

      // Sync settings
      cy.get('[data-cy="sync-contacts"]').check()
      cy.get('[data-cy="sync-deals"]').check()
      cy.get('[data-cy="sync-activities"]').check()

      // Field mapping
      cy.get('[data-cy="map-client-fields"]').click()
      cy.get('[data-cy="hubspot-first-name"]').select('firstname')
      cy.get('[data-cy="hubspot-last-name"]').select('lastname')
      cy.get('[data-cy="hubspot-email"]').select('email')
      cy.get('[data-cy="hubspot-phone"]').select('phone')

      cy.get('[data-cy="save-crm-settings"]').click()
      cy.verifyNotification('CRM integration configured successfully')
    })

    it('should configure marketing integrations', () => {
      cy.visit('/settings/integrations')
      cy.get('[data-cy="marketing-tab"]').click()

      // Mailchimp integration
      cy.get('[data-cy="mailchimp-enabled"]').check()
      cy.get('[data-cy="mailchimp-api-key"]').type('mock_mailchimp_key')
      cy.get('[data-cy="mailchimp-list-id"]').type('mock_list_id')

      // Auto-subscribe settings
      cy.get('[data-cy="auto-subscribe-new-clients"]').check()
      cy.get('[data-cy="auto-subscribe-active-clients"]').check()
      cy.get('[data-cy="auto-unsubscribe-inactive"]').check()
      cy.get('[data-cy="inactive-threshold-months"]').clear().type('6')

      // Google Analytics
      cy.get('[data-cy="google-analytics-enabled"]').check()
      cy.get('[data-cy="ga-tracking-id"]').type('UA-123456789-1')
      cy.get('[data-cy="track-bookings"]').check()
      cy.get('[data-cy="track-payments"]').check()

      cy.get('[data-cy="save-marketing-settings"]').click()
      cy.verifyNotification('Marketing integrations configured')
    })
  })

  describe('System Monitoring and Maintenance', () => {
    it('should view system health and performance', () => {
      cy.visit('/admin/system-health')

      // System metrics
      cy.get('[data-cy="system-status"]').should('contain', 'Healthy')
      cy.get('[data-cy="cpu-usage"]').should('be.visible')
      cy.get('[data-cy="memory-usage"]').should('be.visible')
      cy.get('[data-cy="disk-usage"]').should('be.visible')

      // Database performance
      cy.get('[data-cy="db-connection-pool"]').should('be.visible')
      cy.get('[data-cy="query-performance"]').should('be.visible')
      cy.get('[data-cy="slow-queries"]').should('be.visible')

      // Application metrics
      cy.get('[data-cy="active-users"]').should('be.visible')
      cy.get('[data-cy="response-times"]').should('be.visible')
      cy.get('[data-cy="error-rates"]').should('be.visible')

      // Recent logs
      cy.get('[data-cy="recent-errors"]').should('be.visible')
      cy.get('[data-cy="recent-warnings"]').should('be.visible')
    })

    it('should configure monitoring alerts', () => {
      cy.visit('/admin/monitoring')

      // Performance alerts
      cy.get('[data-cy="cpu-alert-threshold"]').clear().type('80')
      cy.get('[data-cy="memory-alert-threshold"]').clear().type('85')
      cy.get('[data-cy="response-time-threshold"]').clear().type('2000') // ms

      // Business alerts
      cy.get('[data-cy="failed-payment-threshold"]').clear().type('5')
      cy.get('[data-cy="booking-error-threshold"]').clear().type('10')
      cy.get('[data-cy="email-failure-threshold"]').clear().type('20')

      // Alert channels
      cy.get('[data-cy="alert-email"]').check()
      cy.get('[data-cy="alert-email-address"]').clear().type('admin@school.com')
      cy.get('[data-cy="alert-sms"]').check()
      cy.get('[data-cy="alert-phone"]').clear().type('+34600123456')

      cy.get('[data-cy="save-monitoring-settings"]').click()
      cy.verifyNotification('Monitoring alerts configured')

      // Test alert
      cy.get('[data-cy="test-alert"]').click()
      cy.verifyNotification('Test alert sent successfully')
    })

    it('should perform system maintenance tasks', () => {
      cy.visit('/admin/maintenance')

      // Database maintenance
      cy.get('[data-cy="optimize-database"]').click()
      cy.get('[data-cy="maintenance-progress"]').should('be.visible')
      cy.verifyNotification('Database optimization completed')

      // Clear caches
      cy.get('[data-cy="clear-application-cache"]').click()
      cy.verifyNotification('Application cache cleared')

      cy.get('[data-cy="clear-image-cache"]').click()
      cy.verifyNotification('Image cache cleared')

      // Update system
      cy.get('[data-cy="check-updates"]').click()
      cy.get('[data-cy="available-updates"]').should('be.visible')

      // Schedule maintenance window
      cy.get('[data-cy="schedule-maintenance"]').click()
      cy.get('[data-cy="maintenance-date"]').type('2024-12-25')
      cy.get('[data-cy="maintenance-time"]').type('02:00')
      cy.get('[data-cy="maintenance-duration"]').type('4') // hours
      cy.get('[data-cy="maintenance-description"]').type('Monthly system maintenance')

      cy.get('[data-cy="schedule-maintenance-window"]').click()
      cy.verifyNotification('Maintenance window scheduled')
    })
  })
})