# Sprint Template - Boukii V5

Esta plantilla proporciona una estructura estándar para documentar sprints de desarrollo en Boukii V5.

## 📋 Sprint Overview

### Sprint Information
- **Sprint ID**: YYYY-MM-DD-##
- **Duration**: [Start Date] - [End Date]
- **Sprint Goal**: [Objetivo principal del sprint en 1-2 oraciones]
- **Team**: [Miembros del equipo participantes]

### Sprint Objectives
- [ ] **Primary Goal**: [Objetivo principal]
- [ ] **Secondary Goal**: [Objetivo secundario]
- [ ] **Technical Debt**: [Deuda técnica a abordar]

---

## 🎯 Tasks Breakdown

### High Priority (Must Have)
- [ ] **[Module]**: Task description
  - **Estimate**: X hours
  - **Assignee**: Developer name
  - **Dependencies**: [If any]

### Medium Priority (Should Have)
- [ ] **[Module]**: Task description
  - **Estimate**: X hours
  - **Assignee**: Developer name

### Low Priority (Nice to Have)
- [ ] **[Module]**: Task description
  - **Estimate**: X hours
  - **Assignee**: Developer name

---

## 🛠 Technical Decisions

### Architecture Decisions
- **Decision**: [What was decided]
- **Rationale**: [Why this decision was made]
- **Impact**: [Effect on system/team]

### Technology Choices
- **Frontend**: [Frameworks, libraries, tools]
- **Backend**: [Frameworks, libraries, tools]
- **Database**: [Schema changes, migrations]

### Performance Considerations
- **Optimization**: [Performance improvements]
- **Monitoring**: [Metrics to track]

---

## 📚 Prompts Library

### Useful Prompts for This Sprint

#### Frontend Development
```
Implement [Feature] component for Boukii V5:
- Angular 16 + Vex theme
- Context: school_id and season_id from ContextService
- Permissions: [permission.name] 
- Follow existing patterns in src/app/v5/features/
- Include error handling and loading states
```

#### Backend Development
```
Create V5 API endpoint for [Resource]:
- Extend BaseV5Controller
- Use ContextMiddleware for school/season validation
- Include proper permissions with [permission.name]
- Return standard JSON response format
- Add comprehensive error handling
```

#### Testing
```
Create comprehensive tests for [Feature]:
- Unit tests for service methods
- Integration tests for API endpoints
- E2E tests for complete user flow
- Include context validation and permission testing
```

### Module-Specific Prompts

#### Dashboard
```
Implement dashboard widget for [Metric]:
- Real-time data updates with WebSocket/polling
- Context-aware data (current school/season)
- Responsive design with Vex components
- Include loading skeleton and error states
```

#### Clients Management
```
Build client management interface:
- CRUD operations with proper permissions
- Multi-school client relationships
- Search and filtering capabilities
- Export functionality
```

---

## 📊 Progress Tracking

### Daily Standup Template
```
Yesterday:
- Completed: [Task completed]
- Challenges: [Issues faced]

Today:
- Planning: [Tasks to work on]
- Focus: [Main priority]

Blockers:
- [Any blockers or dependencies]
```

### Weekly Progress
| Task | Status | Progress | Notes |
|------|--------|----------|-------|
| [Task 1] | ✅ Completed | 100% | [Any notes] |
| [Task 2] | 🔄 In Progress | 60% | [Blockers/updates] |
| [Task 3] | ⏳ Pending | 0% | [Waiting for...] |

---

## 🧪 Testing Strategy

### Test Coverage Goals
- [ ] **Unit Tests**: 80% coverage for new code
- [ ] **Integration Tests**: All API endpoints tested
- [ ] **E2E Tests**: Critical user flows covered
- [ ] **Permission Tests**: All role-based access tested

### Testing Checklist
- [ ] Context middleware validation tests
- [ ] Permission system tests
- [ ] Multi-tenant data isolation tests
- [ ] Error handling and edge cases
- [ ] Performance tests for critical paths

### Manual Testing Scenarios
1. **Login Flow**: Test single/multi school scenarios
2. **Context Switching**: Verify school/season selection
3. **Permissions**: Test role-based access control
4. **Data Isolation**: Ensure multi-tenant separation

---

## 🔧 Development Environment

### Setup Requirements
```bash
# Frontend
npm install
npm start

# Backend  
composer install
php artisan migrate
php artisan db:seed --class=V5TestDataSeeder
```

### Test Data
- **Users**: admin@boukii-v5.com, multi@boukii-v5.com
- **Schools**: School ID 2 (primary test school)
- **Seasons**: At least one active season per school

### Useful Commands
```bash
# Frontend
npm run build:development
npm test
npm run e2e

# Backend
php artisan test --group=v5
php artisan route:list --path=v5
php artisan tinker
```

---

## 🚀 Sprint Retrospective

### What Went Well
- [Positive aspects of the sprint]
- [Successful implementations]
- [Team collaboration highlights]

### What Could Be Improved
- [Areas for improvement]
- [Process inefficiencies]
- [Technical challenges]

### Action Items
- [ ] **Process**: [Improvement action]
- [ ] **Technical**: [Technical improvement]
- [ ] **Team**: [Team collaboration improvement]

### Lessons Learned
- **Architecture**: [Architectural insights]
- **Development**: [Development best practices]
- **Testing**: [Testing improvements]

---

## 📈 Metrics & KPIs

### Development Metrics
- **Velocity**: [Story points completed]
- **Code Quality**: [Test coverage, code review feedback]
- **Bug Rate**: [Bugs found vs features delivered]

### Technical Metrics
- **Performance**: [API response times, frontend load times]
- **Reliability**: [Uptime, error rates]
- **Security**: [Security issues identified/resolved]

### Business Metrics
- **Features Delivered**: [Number of features completed]
- **User Impact**: [Features that improve user experience]
- **Technical Debt**: [Technical debt addressed]

---

## 🔗 Resources & Links

### Documentation
- [V5 Overview](./V5_OVERVIEW.md)
- [Architecture Guide](./V5_ARCHITECTURE.md)
- [Auth Flow](./V5_AUTH_FLOW.md)
- [Testing Guide](./TESTING_GUIDE.md)

### Tools & Services
- **Frontend**: http://localhost:4200
- **Backend**: http://api-boukii.test
- **Database**: [Connection details]
- **Monitoring**: [Monitoring tools/dashboards]

### External Resources
- [Angular Documentation](https://angular.io/docs)
- [Laravel Documentation](https://laravel.com/docs)
- [Vex Theme Documentation](https://themes.pixinvent.com/vex-html-bootstrap-admin-template/documentation/)

---

## ✅ Sprint Completion Checklist

### Code Quality
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code coverage meets targets (80%+)
- [ ] Code review completed for all PRs
- [ ] No critical security vulnerabilities
- [ ] Performance benchmarks met

### Documentation
- [ ] API documentation updated
- [ ] Component documentation written
- [ ] Architecture decisions documented
- [ ] Deployment guide updated if needed

### Deployment
- [ ] Staging environment tested
- [ ] Database migrations tested
- [ ] Environment configurations verified
- [ ] Rollback plan prepared

### Handoff
- [ ] Demo prepared for stakeholders
- [ ] Known issues documented
- [ ] Next sprint planning items identified
- [ ] Sprint retrospective completed

---

*Template Version: 1.0*  
*Last Updated: 2025-08-13*  
*Sincronizado automáticamente entre repositorios*