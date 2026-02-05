type CourseTab = 'collective' | 'private'

const startBookingForClient = (clientEmail: string) => {
  cy.visit('/bookings/create')
  cy.get('[data-cy="client-search-input"]').clear().type(clientEmail)
  cy.wait(1000)
  cy.get('[data-cy="client-option"]').first().click()
  cy.get('[data-cy="next-step-button"]').click()
}

const configureParticipants = (extraParticipants = 0) => {
  cy.get('[data-cy="participants-section"]').should('be.visible')
  for (let index = 1; index <= extraParticipants; index += 1) {
    cy.get('[data-cy="add-participant-button"]').click()
    cy.get(`[data-cy="participant-name-${index}"]`).type(`QA Participante ${index}`)
    cy.get(`[data-cy="participant-age-${index}"]`).type(`${20 + index}`)
  }
  cy.get('[data-cy="next-step-button"]').click()
}

const selectSportAndLevel = (sportId = '1', levelId = '1') => {
  cy.get('[data-cy="sport-select"]').select(sportId)
  cy.get('[data-cy="level-select"]').select(levelId)
  cy.get('[data-cy="next-step-button"]').click()
}

const selectCourseFromTab = (courseName: string, tab: CourseTab) => {
  const tabSelector =
    tab === 'collective' ? '[data-cy="course-tab-collective"]' : '[data-cy="course-tab-private"]'
  cy.get(tabSelector).click()
  cy.get('[data-cy="course-card"]').contains(courseName).should('be.visible').click()
  cy.get('[data-cy="next-step-button"]').click()
}

const moveToSummaryAndFinish = (notes: string) => {
  cy.get('[data-cy="client-observations"]').should('be.visible').clear().type(notes)
  cy.get('[data-cy="complete-booking-button"]').click()
  cy.verifyNotification('Booking created successfully')
}

const openBookingSummary = (courseName: string) => {
  cy.visit('/bookings')
  cy.contains('[data-cy="booking-row"]', courseName, { timeout: 30000 })
    .should('be.visible')
    .click()
}

const pickFirstAvailableHour = () => {
  cy.get('[data-cy="hour-select"]').then(($select) => {
    const $options = $select.find('option').not('[disabled]')
    const targetIndex = $options.length > 1 ? 1 : 0
    const $target = $options.eq(targetIndex)
    if ($target.length === 0) {
      return
    }
    const value = ($target.attr('value') || $target.text()).trim()
    cy.wrap($select).select(value)
  })
}

const selectAvailableMonitor = (): Cypress.Chainable<string | undefined> => {
  return cy
    .get('[data-cy="monitor-select"], [data-cy="instructor-select"]')
    .then(($selects) => {
      const $visible = $selects.filter(':visible')
      const $targetSelect = $visible.length ? $visible.eq(0) : $selects.eq(0)
      if ($targetSelect.length === 0) {
        return undefined
      }
      const $options = $targetSelect.find('option').not('[disabled]')
      if ($options.length === 0) {
        return undefined
      }
      const optionIndex = $options.length > 1 ? 1 : 0
      const $option = $options.eq(optionIndex)
      const label = $option.text().trim()
      const value = ($option.attr('value') || label).trim()
      cy.wrap($targetSelect).select(value)
      return label
    })
}

describe('Bookings Happy Path – QA matrix', () => {
  beforeEach(() => {
    cy.loginAsAdmin()
  })

  it('ADM-BKG-001 – crear reserva de curso colectivo fijo (happy path)', () => {
    // QA Case: ADM-BKG-001 (Admin – Bookings – Happy-path colectivo fijo)
    cy.fixture('courses').then((courses) => {
      const courseName = `${courses.collectiveCourse.name} QA-${Date.now()}`
      const collectiveCourse = {
        ...courses.collectiveCourse,
        name: courseName,
        is_flexible: false
      }

      cy.createCourse(collectiveCourse)

      cy.fixture('clients').then((clients) => {
        const client = clients.testClient

        startBookingForClient(client.email)
        configureParticipants(1)
        selectSportAndLevel()
        selectCourseFromTab(courseName, 'collective')

        cy.get('[data-cy="date-checkbox"]').first().check()
        pickFirstAvailableHour()
        cy.get('[data-cy="next-step-button"]').click()

        moveToSummaryAndFinish('ADM-BKG-001 – QA reserva colectivo fijo')

        openBookingSummary(courseName)
        cy.get('[data-cy="booking-client-name"]').should('contain', client.first_name)
        cy.get('[data-cy="booking-date"]').should('exist').and('not.be.empty')
        cy.contains(courseName).should('be.visible')
      })
    })
  })

  it('ADM-BKG-002 – crear reserva de curso colectivo flexible con varias fechas', () => {
    // QA Case: ADM-BKG-002 (Admin – Bookings – Happy-path colectivo flexible)
    const selectedDates: string[] = []

    const captureDateLabel = (index: number) => {
      cy.get('[data-cy="flex-date-item"]')
        .eq(index)
        .find('[data-cy="date-text"]')
        .invoke('text')
        .then((text) => {
          selectedDates[index] = text.trim()
        })
    }

    cy.fixture('courses').then((courses) => {
      const courseName = `${courses.flexibleCourse.name} QA-${Date.now()}`
      const flexibleCourse = {
        ...courses.flexibleCourse,
        name: courseName,
        is_flexible: true,
        dates: [
          { date: '2024-12-05', startTime: '09:00', endTime: '11:00' },
          { date: '2024-12-06', startTime: '09:00', endTime: '11:00' },
          { date: '2024-12-07', startTime: '09:00', endTime: '11:00' }
        ]
      }

      cy.createCourse(flexibleCourse)

      cy.fixture('clients').then((clients) => {
        startBookingForClient(clients.testClient.email)
        configureParticipants()
        selectSportAndLevel()
        selectCourseFromTab(courseName, 'collective')

        cy.get('[data-cy="flex-date-item"]').should('have.length.at.least', 2)

        captureDateLabel(0)
        cy.get('[data-cy="flex-date-checkbox"]').eq(0).check()
        captureDateLabel(1)
        cy.get('[data-cy="flex-date-checkbox"]').eq(1).check()
        cy.get('[data-cy="flex-date-checkbox"]:checked').should('have.length.at.least', 2)

        cy.get('[data-cy="next-step-button"]').click()
        moveToSummaryAndFinish('ADM-BKG-002 – QA reserva flexible multi-fecha')

        openBookingSummary(courseName)
        cy.then(() => {
          selectedDates.filter(Boolean).forEach((dateLabel) => {
            cy.contains(dateLabel).should('exist')
          })
        })
      })
    })
  })

  it('ADM-BKG-003 – crear reserva privada con monitor y extras', () => {
    // QA Case: ADM-BKG-003 (Admin – Bookings – Happy-path privado)
    let monitorName = ''
    let totalPrice = ''

    cy.fixture('courses').then((courses) => {
      const courseName = `${courses.privateCourse.name} QA-${Date.now()}`
      const privateCourse = {
        ...courses.privateCourse,
        name: courseName,
        course_type: 2,
        is_flexible: false
      }

      cy.createCourse(privateCourse)

      cy.fixture('clients').then((clients) => {
        startBookingForClient(clients.testClient.email)
        configureParticipants()
        selectSportAndLevel()
        selectCourseFromTab(courseName, 'private')

        cy.get('[data-cy="date-input"]').clear().type('2024-12-20')
        pickFirstAvailableHour()

        selectAvailableMonitor().then((label) => {
          if (label) {
            monitorName = label
          }
        })

        cy.get('[data-cy="price-preview"]')
          .invoke('text')
          .then((text) => {
            totalPrice = text.trim()
          })

        cy.get('[data-cy="extra-checkbox"]').then(($extras) => {
          if ($extras.length) {
            cy.wrap($extras.first()).check({ force: true })
            cy.get('[data-cy="price-preview"]')
              .invoke('text')
              .then((text) => {
                const updatedPrice = text.trim()
                if (updatedPrice) {
                  expect(updatedPrice).not.to.equal(totalPrice)
                  totalPrice = updatedPrice
                }
              })
          }
        })

        cy.get('[data-cy="next-step-button"]').click()
        moveToSummaryAndFinish('ADM-BKG-003 – QA reserva privada con monitor')

        openBookingSummary(courseName)
        cy.then(() => {
          if (monitorName) {
            cy.contains(monitorName).should('exist')
          }
          if (totalPrice) {
            cy.contains(totalPrice).should('exist')
          }
        })
      })
    })
  })
})
