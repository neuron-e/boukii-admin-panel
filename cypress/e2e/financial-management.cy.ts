/// <reference types="cypress" />

describe('Financial Management Tests', () => {
  beforeEach(() => {
    cy.login()
    // Create test data
    cy.fixture('courses').then((courses) => {
      cy.createCourse(courses.collectiveCourse)
      cy.createCourse(courses.privateCourse)
    })
    cy.fixture('clients').then((clients) => {
      cy.createBooking({
        clientEmail: clients.testClient.email
      })
    })
  })

  describe('Payment Processing', () => {
    it('should process cash payment for booking', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      // Verify payment is pending
      cy.get('[data-cy="payment-status"]').should('contain', 'Pending')
      cy.get('[data-cy="total-amount"]').invoke('text').as('totalAmount')

      cy.get('[data-cy="process-payment-button"]').click()

      // Select cash payment
      cy.get('[data-cy="payment-method-cash"]').click()
      cy.get('@totalAmount').then(amount => {
        cy.get('[data-cy="payment-amount"]').should('have.value', amount.replace(/[^\d.]/g, ''))
      })

      cy.get('[data-cy="payment-received-checkbox"]').check()
      cy.get('[data-cy="payment-notes"]').type('Pago en efectivo recibido')

      cy.get('[data-cy="confirm-payment"]').click()
      cy.verifyNotification('Payment processed successfully')

      // Verify payment status updated
      cy.get('[data-cy="payment-status"]').should('contain', 'Paid')
      cy.get('[data-cy="payment-method-display"]').should('contain', 'Cash')
      cy.get('[data-cy="payment-date"]').should('be.visible')
    })

    it('should generate and send payment links for online payment', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      cy.get('[data-cy="process-payment-button"]').click()

      // Select online payment
      cy.get('[data-cy="payment-method-online"]').click()
      cy.get('[data-cy="payment-provider"]').select('stripe')

      cy.get('[data-cy="generate-payment-link"]').click()
      cy.verifyNotification('Payment link generated successfully')

      // Verify payment link is displayed
      cy.get('[data-cy="payment-link"]').should('be.visible')
      cy.get('[data-cy="payment-link"]').should('contain', 'https://')

      // Copy payment link
      cy.get('[data-cy="copy-payment-link"]').click()
      cy.verifyNotification('Payment link copied to clipboard')

      // Send by email
      cy.get('[data-cy="send-payment-email"]').click()
      cy.get('[data-cy="email-subject"]').should('not.be.empty')
      cy.get('[data-cy="email-body"]').should('contain', 'payment link')
      cy.get('[data-cy="send-email"]').click()

      cy.verifyNotification('Payment link sent successfully')

      // Send by SMS
      cy.get('[data-cy="send-payment-sms"]').click()
      cy.get('[data-cy="sms-message"]').should('contain', 'payment link')
      cy.get('[data-cy="send-sms"]').click()

      cy.verifyNotification('Payment SMS sent successfully')
    })

    it('should handle partial payments', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      cy.get('[data-cy="total-amount"]').invoke('text').then(totalText => {
        const totalAmount = parseFloat(totalText.replace(/[^\d.]/g, ''))

        cy.get('[data-cy="process-payment-button"]').click()

        // Enable partial payment
        cy.get('[data-cy="partial-payment-checkbox"]').check()

        // Pay 50% of total
        const partialAmount = (totalAmount * 0.5).toFixed(2)
        cy.get('[data-cy="payment-amount"]').clear().type(partialAmount)

        cy.get('[data-cy="payment-method-cash"]').click()
        cy.get('[data-cy="payment-received-checkbox"]').check()
        cy.get('[data-cy="payment-notes"]').type('Pago parcial - 50% del total')

        cy.get('[data-cy="confirm-payment"]').click()
        cy.verifyNotification('Partial payment processed successfully')

        // Verify remaining balance
        cy.get('[data-cy="payment-status"]').should('contain', 'Partially Paid')
        cy.get('[data-cy="remaining-balance"]').should('contain', partialAmount)
        cy.get('[data-cy="payment-history"]').should('contain', partialAmount)

        // Pay remaining amount
        cy.get('[data-cy="pay-remaining-button"]').click()
        cy.get('[data-cy="payment-method-card"]').click()
        cy.get('[data-cy="confirm-payment"]').click()

        cy.verifyNotification('Payment completed successfully')
        cy.get('[data-cy="payment-status"]').should('contain', 'Fully Paid')
      })
    })

    it('should process refunds', () => {
      // First create a paid booking
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      // Process payment first
      cy.get('[data-cy="process-payment-button"]').click()
      cy.get('[data-cy="payment-method-cash"]').click()
      cy.get('[data-cy="payment-received-checkbox"]').check()
      cy.get('[data-cy="confirm-payment"]').click()

      // Now process refund
      cy.get('[data-cy="booking-actions"]').click()
      cy.get('[data-cy="process-refund"]').click()

      cy.get('[data-cy="refund-modal"]').should('be.visible')
      cy.get('[data-cy="refund-reason"]').select('client_cancellation')
      cy.get('[data-cy="refund-type"]').select('partial')
      cy.get('[data-cy="refund-percentage"]').clear().type('80')
      cy.get('[data-cy="refund-notes"]').type('Cancelación con 48h de antelación')

      cy.get('[data-cy="calculate-refund"]').click()
      cy.get('[data-cy="refund-amount"]').should('be.visible')

      cy.get('[data-cy="process-refund-button"]').click()
      cy.verifyNotification('Refund processed successfully')

      // Verify refund is recorded
      cy.get('[data-cy="payment-status"]').should('contain', 'Refunded')
      cy.get('[data-cy="refund-history"]').should('contain', '80%')
    })
  })

  describe('Invoicing', () => {
    it('should generate invoice for booking', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      cy.get('[data-cy="generate-invoice-button"]').click()

      // Invoice details modal
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
      cy.get('[data-cy="invoice-date"]').should('not.be.empty')
      cy.get('[data-cy="invoice-number"]').should('not.be.empty')

      // Verify invoice content
      cy.get('[data-cy="invoice-client-info"]').should('be.visible')
      cy.get('[data-cy="invoice-booking-details"]').should('be.visible')
      cy.get('[data-cy="invoice-line-items"]').should('be.visible')
      cy.get('[data-cy="invoice-total"]').should('be.visible')

      // Apply discount
      cy.get('[data-cy="add-discount-button"]').click()
      cy.get('[data-cy="discount-type"]').select('percentage')
      cy.get('[data-cy="discount-value"]').type('10')
      cy.get('[data-cy="discount-reason"]').type('Descuento por fidelidad')
      cy.get('[data-cy="apply-discount"]').click()

      // Verify discount is applied
      cy.get('[data-cy="discount-line"]').should('be.visible')
      cy.get('[data-cy="invoice-total"]').should('contain', 'descuento')

      cy.get('[data-cy="generate-invoice"]').click()
      cy.verifyNotification('Invoice generated successfully')

      // Verify invoice is available for download
      cy.get('[data-cy="download-invoice"]').click()
      cy.readFile('cypress/downloads/invoice.pdf').should('exist')

      // Send invoice by email
      cy.get('[data-cy="send-invoice-email"]').click()
      cy.verifyNotification('Invoice sent by email')
    })

    it('should manage invoice series and numbering', () => {
      cy.visit('/admin/invoicing')

      // Configure invoice series
      cy.get('[data-cy="invoice-settings-tab"]').click()
      cy.get('[data-cy="invoice-prefix"]').clear().type('INV-2024-')
      cy.get('[data-cy="invoice-start-number"]').clear().type('1001')
      cy.get('[data-cy="invoice-format"]').select('prefix-number')

      cy.get('[data-cy="save-invoice-settings"]').click()
      cy.verifyNotification('Invoice settings saved')

      // Create new invoice and verify numbering
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()
      cy.get('[data-cy="generate-invoice-button"]').click()

      cy.get('[data-cy="invoice-number"]').should('contain', 'INV-2024-1001')
    })

    it('should handle tax calculations', () => {
      cy.visit('/admin/tax-settings')

      // Configure tax rates
      cy.get('[data-cy="default-tax-rate"]').clear().type('21')
      cy.get('[data-cy="tax-name"]').clear().type('IVA')
      cy.get('[data-cy="tax-included"]').check()
      cy.get('[data-cy="save-tax-settings"]').click()

      // Generate invoice and verify tax calculation
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()
      cy.get('[data-cy="generate-invoice-button"]').click()

      cy.get('[data-cy="invoice-subtotal"]').should('be.visible')
      cy.get('[data-cy="invoice-tax-line"]').should('contain', 'IVA (21%)')
      cy.get('[data-cy="invoice-total"]').should('be.visible')

      // Verify tax calculation is correct
      cy.get('[data-cy="invoice-subtotal"]').invoke('text').then(subtotalText => {
        const subtotal = parseFloat(subtotalText.replace(/[^\d.]/g, ''))
        const expectedTax = subtotal * 0.21

        cy.get('[data-cy="invoice-tax-amount"]').invoke('text').then(taxText => {
          const actualTax = parseFloat(taxText.replace(/[^\d.]/g, ''))
          expect(actualTax).to.be.closeTo(expectedTax, 0.01)
        })
      })
    })
  })

  describe('Financial Reporting', () => {
    beforeEach(() => {
      // Create multiple bookings for reporting
      cy.fixture('clients').then((clients) => {
        for (let i = 0; i < 5; i++) {
          cy.createBooking({
            clientEmail: `report-test-${i}@example.com`
          })
        }
      })
    })

    it('should generate daily revenue report', () => {
      cy.visit('/reports/financial')

      // Select daily report
      cy.get('[data-cy="report-type"]').select('daily-revenue')
      cy.get('[data-cy="report-date"]').type('2024-12-15')

      cy.get('[data-cy="generate-report"]').click()

      // Verify report content
      cy.get('[data-cy="report-summary"]').should('be.visible')
      cy.get('[data-cy="total-revenue"]').should('be.visible')
      cy.get('[data-cy="total-bookings"]').should('be.visible')
      cy.get('[data-cy="payment-methods-breakdown"]').should('be.visible')

      // Verify chart is displayed
      cy.get('[data-cy="revenue-chart"]').should('be.visible')

      // Export report
      cy.get('[data-cy="export-report"]').click()
      cy.get('[data-cy="export-format"]').select('excel')
      cy.get('[data-cy="confirm-export"]').click()

      cy.readFile('cypress/downloads/daily-revenue-report.xlsx').should('exist')
    })

    it('should generate monthly financial summary', () => {
      cy.visit('/reports/financial')

      cy.get('[data-cy="report-type"]').select('monthly-summary')
      cy.get('[data-cy="report-month"]').select('2024-12')

      cy.get('[data-cy="generate-report"]').click()

      // Verify comprehensive monthly data
      cy.get('[data-cy="monthly-metrics"]').within(() => {
        cy.get('[data-cy="total-revenue"]').should('be.visible')
        cy.get('[data-cy="total-refunds"]').should('be.visible')
        cy.get('[data-cy="net-revenue"]').should('be.visible')
        cy.get('[data-cy="average-booking-value"]').should('be.visible')
        cy.get('[data-cy="total-taxes"]').should('be.visible')
      })

      // Sport breakdown
      cy.get('[data-cy="sport-revenue-breakdown"]').should('be.visible')
      cy.get('[data-cy="course-type-breakdown"]').should('be.visible')

      // Payment method analysis
      cy.get('[data-cy="payment-method-chart"]').should('be.visible')

      // Monthly trends
      cy.get('[data-cy="monthly-trend-chart"]').should('be.visible')
    })

    it('should generate client revenue report', () => {
      cy.visit('/reports/financial')

      cy.get('[data-cy="report-type"]').select('client-revenue')
      cy.get('[data-cy="date-range-start"]').type('2024-12-01')
      cy.get('[data-cy="date-range-end"]').type('2024-12-31')

      cy.get('[data-cy="generate-report"]').click()

      // Verify client ranking
      cy.get('[data-cy="top-clients-table"]').should('be.visible')
      cy.get('[data-cy="client-revenue-row"]').should('have.length.gte', 1)

      // Sort by revenue
      cy.get('[data-cy="sort-by-revenue"]').click()
      cy.get('[data-cy="client-revenue-row"]').first().within(() => {
        cy.get('[data-cy="client-revenue"]').invoke('text').as('topRevenue')
      })

      // Verify sorting
      cy.get('[data-cy="client-revenue-row"]').eq(1).within(() => {
        cy.get('[data-cy="client-revenue"]').invoke('text').then(secondRevenue => {
          cy.get('@topRevenue').then(topRevenue => {
            const top = parseFloat(topRevenue.replace(/[^\d.]/g, ''))
            const second = parseFloat(secondRevenue.replace(/[^\d.]/g, ''))
            expect(top).to.be.gte(second)
          })
        })
      })
    })

    it('should generate tax report for accounting', () => {
      cy.visit('/reports/tax')

      cy.get('[data-cy="tax-period"]').select('Q4-2024')
      cy.get('[data-cy="tax-report-type"]').select('vat-summary')

      cy.get('[data-cy="generate-tax-report"]').click()

      // Verify tax calculations
      cy.get('[data-cy="tax-summary"]').within(() => {
        cy.get('[data-cy="taxable-revenue"]').should('be.visible')
        cy.get('[data-cy="tax-collected"]').should('be.visible')
        cy.get('[data-cy="tax-rate"]').should('contain', '21%')
        cy.get('[data-cy="net-revenue"]').should('be.visible')
      })

      // Monthly breakdown
      cy.get('[data-cy="monthly-tax-breakdown"]').should('be.visible')

      // Export for accountant
      cy.get('[data-cy="export-for-accountant"]').click()
      cy.readFile('cypress/downloads/tax-report-Q4-2024.xlsx').should('exist')
    })
  })

  describe('Vouchers and Discounts', () => {
    it('should create and manage vouchers', () => {
      cy.visit('/admin/vouchers')

      cy.get('[data-cy="create-voucher-button"]').click()

      // Basic voucher information
      cy.get('[data-cy="voucher-code"]').type('SUMMER2024')
      cy.get('[data-cy="voucher-name"]').type('Descuento Verano 2024')
      cy.get('[data-cy="voucher-type"]').select('percentage')
      cy.get('[data-cy="voucher-value"]').type('20')

      // Validity period
      cy.get('[data-cy="voucher-start-date"]').type('2024-06-01')
      cy.get('[data-cy="voucher-end-date"]').type('2024-08-31')

      // Usage limits
      cy.get('[data-cy="voucher-max-uses"]').type('100')
      cy.get('[data-cy="voucher-max-per-client"]').type('1')
      cy.get('[data-cy="voucher-min-amount"]').type('50.00')

      // Applicable courses
      cy.get('[data-cy="voucher-courses"]').select(['1', '2'])
      cy.get('[data-cy="voucher-sports"]').select(['1'])

      cy.get('[data-cy="save-voucher"]').click()
      cy.verifyNotification('Voucher created successfully')

      // Verify voucher appears in list
      cy.get('[data-cy="vouchers-list"]').should('contain', 'SUMMER2024')
    })

    it('should apply voucher to booking', () => {
      // Create voucher first
      cy.visit('/admin/vouchers')
      cy.get('[data-cy="create-voucher-button"]').click()
      cy.get('[data-cy="voucher-code"]').type('TEST20')
      cy.get('[data-cy="voucher-type"]').select('percentage')
      cy.get('[data-cy="voucher-value"]').type('20')
      cy.get('[data-cy="voucher-start-date"]').type('2024-12-01')
      cy.get('[data-cy="voucher-end-date"]').type('2024-12-31')
      cy.get('[data-cy="save-voucher"]').click()

      // Apply to booking
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      cy.get('[data-cy="apply-voucher-button"]').click()
      cy.get('[data-cy="voucher-code-input"]').type('TEST20')
      cy.get('[data-cy="apply-voucher"]').click()

      // Verify voucher is applied
      cy.get('[data-cy="voucher-applied"]').should('be.visible')
      cy.get('[data-cy="voucher-discount"]').should('contain', '20%')
      cy.get('[data-cy="total-after-discount"]').should('be.visible')

      // Verify original total vs discounted total
      cy.get('[data-cy="original-total"]').invoke('text').then(originalText => {
        const original = parseFloat(originalText.replace(/[^\d.]/g, ''))

        cy.get('[data-cy="total-after-discount"]').invoke('text').then(discountedText => {
          const discounted = parseFloat(discountedText.replace(/[^\d.]/g, ''))
          const expectedDiscount = original * 0.2
          expect(original - discounted).to.be.closeTo(expectedDiscount, 0.01)
        })
      })
    })

    it('should handle voucher validation and restrictions', () => {
      cy.visit('/bookings')
      cy.get('[data-cy="booking-row"]').first().click()

      // Try invalid voucher code
      cy.get('[data-cy="apply-voucher-button"]').click()
      cy.get('[data-cy="voucher-code-input"]').type('INVALID123')
      cy.get('[data-cy="apply-voucher"]').click()

      cy.get('[data-cy="voucher-error"]').should('contain', 'Invalid voucher code')

      // Try expired voucher
      cy.get('[data-cy="voucher-code-input"]').clear().type('EXPIRED2023')
      cy.get('[data-cy="apply-voucher"]').click()

      cy.get('[data-cy="voucher-error"]').should('contain', 'Voucher has expired')

      // Try voucher with minimum amount restriction
      cy.get('[data-cy="voucher-code-input"]').clear().type('MIN100')
      cy.get('[data-cy="apply-voucher"]').click()

      cy.get('[data-cy="voucher-error"]').should('contain', 'Minimum amount required')
    })
  })

  describe('Financial Analytics', () => {
    it('should display revenue dashboard', () => {
      cy.visit('/dashboard/financial')

      // Key metrics widgets
      cy.get('[data-cy="today-revenue"]').should('be.visible')
      cy.get('[data-cy="monthly-revenue"]').should('be.visible')
      cy.get('[data-cy="pending-payments"]').should('be.visible')
      cy.get('[data-cy="refunds-total"]').should('be.visible')

      // Charts
      cy.get('[data-cy="revenue-trend-chart"]').should('be.visible')
      cy.get('[data-cy="payment-methods-pie"]').should('be.visible')
      cy.get('[data-cy="monthly-comparison-chart"]').should('be.visible')

      // Recent transactions
      cy.get('[data-cy="recent-transactions"]').should('be.visible')
      cy.get('[data-cy="transaction-row"]').should('have.length.gte', 1)
    })

    it('should analyze profitability by course type', () => {
      cy.visit('/analytics/profitability')

      // Course type comparison
      cy.get('[data-cy="course-type-filter"]').select('all')
      cy.get('[data-cy="date-range"]').select('last-3-months')
      cy.get('[data-cy="apply-filters"]').click()

      // Profitability metrics
      cy.get('[data-cy="collective-courses-profit"]').should('be.visible')
      cy.get('[data-cy="private-courses-profit"]').should('be.visible')
      cy.get('[data-cy="profit-margin-chart"]').should('be.visible')

      // Cost breakdown
      cy.get('[data-cy="cost-breakdown"]').within(() => {
        cy.get('[data-cy="monitor-costs"]').should('be.visible')
        cy.get('[data-cy="facility-costs"]').should('be.visible')
        cy.get('[data-cy="overhead-costs"]').should('be.visible')
      })

      // ROI analysis
      cy.get('[data-cy="roi-analysis"]').should('be.visible')
      cy.get('[data-cy="most-profitable-courses"]').should('be.visible')
    })

    it('should forecast revenue trends', () => {
      cy.visit('/analytics/forecasting')

      // Historical data analysis
      cy.get('[data-cy="historical-period"]').select('12-months')
      cy.get('[data-cy="generate-forecast"]').click()

      // Forecast results
      cy.get('[data-cy="forecast-chart"]').should('be.visible')
      cy.get('[data-cy="forecast-confidence"]').should('be.visible')
      cy.get('[data-cy="seasonal-trends"]').should('be.visible')

      // Scenario analysis
      cy.get('[data-cy="scenario-analysis"]').within(() => {
        cy.get('[data-cy="optimistic-scenario"]').should('be.visible')
        cy.get('[data-cy="realistic-scenario"]').should('be.visible')
        cy.get('[data-cy="pessimistic-scenario"]').should('be.visible')
      })

      // Recommendations
      cy.get('[data-cy="revenue-recommendations"]').should('be.visible')
    })
  })

  describe('Integration with Accounting Systems', () => {
    it('should export data for QuickBooks', () => {
      cy.visit('/integrations/accounting')

      // Configure QuickBooks export
      cy.get('[data-cy="accounting-system"]').select('quickbooks')
      cy.get('[data-cy="export-format"]').select('iif')
      cy.get('[data-cy="date-range-start"]').type('2024-12-01')
      cy.get('[data-cy="date-range-end"]').type('2024-12-31')

      // Select accounts mapping
      cy.get('[data-cy="revenue-account"]').select('4001-Course-Revenue')
      cy.get('[data-cy="tax-account"]').select('2200-Sales-Tax-Payable')
      cy.get('[data-cy="receivables-account"]').select('1200-Accounts-Receivable')

      cy.get('[data-cy="export-to-quickbooks"]').click()
      cy.verifyNotification('QuickBooks export completed')

      cy.readFile('cypress/downloads/quickbooks-export.iif').should('exist')
    })

    it('should sync with payment processors', () => {
      cy.visit('/integrations/payments')

      // Configure Stripe integration
      cy.get('[data-cy="payment-processor"]').select('stripe')
      cy.get('[data-cy="stripe-api-key"]').type('sk_test_mock_key')
      cy.get('[data-cy="stripe-webhook-url"]').should('not.be.empty')

      cy.get('[data-cy="test-connection"]').click()
      cy.get('[data-cy="connection-status"]').should('contain', 'Connected')

      // Sync transactions
      cy.get('[data-cy="sync-transactions"]').click()
      cy.get('[data-cy="sync-date-range"]').select('last-week')
      cy.get('[data-cy="start-sync"]').click()

      cy.verifyNotification('Transaction sync completed')

      // Verify synced transactions
      cy.visit('/transactions')
      cy.get('[data-cy="transaction-source"]').should('contain', 'Stripe')
    })
  })
})