# 🎯 Sprint 2025-08-13-15: Prompts Library

Esta biblioteca contiene todos los prompts utilizados durante el sprint, organizados por task y optimizados para reutilización.

## 📚 Prompt Categories

### 🗂️ **Category Index**
- [Data Generation](#data-generation)
- [Backend Development](#backend-development)  
- [Frontend Development](#frontend-development)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 🎲 Data Generation

### **DG-001: Professional Test Data Seeder**
```
Create a comprehensive Laravel seeder for Boukii V5 test data with realistic Swiss ski school data:

REQUIREMENTS:
- Target: School ID 2 (ESS Veveyse)
- 50+ realistic Swiss clients (German, French, Italian names)
- 15+ ski/snowboard courses with real CHF pricing
- 200+ bookings distributed across 6 months (peak in Dec-Mar)
- 8+ monitors with specializations (ski, snowboard, levels)
- Financial data generating impressive dashboard metrics

DATA SPECIFICATIONS:
- Clients: Real Swiss names, phone numbers (+41), addresses
- Courses: "Ski débutant", "Snowboard perfectionnement", private lessons
- Pricing: CHF 45-150 per lesson, realistic Swiss pricing
- Bookings: 70% confirmed, 20% pending, 10% cancelled
- Revenue: CHF 45,000 current season, CHF 38,000 previous
- Seasons: Current (2024-2025) + Previous (2023-2024)

OUTPUT: Complete seeder class ready to execute
```

### **DG-002: Realistic Financial Metrics**
```
Generate realistic financial data for a Swiss ski school dashboard that will create impressive visualizations:

PARAMETERS:
- School: ESS Veveyse (premium ski school)
- Season: 2024-2025 (Dec-Apr peak season)
- Currency: CHF (Swiss Francs)
- Target Revenue: CHF 45,000 for current season

BREAKDOWN REQUIREMENTS:
- Monthly distribution: Dec(20%), Jan(30%), Feb(25%), Mar(15%), Apr(10%)
- Course types: Group(60%), Private(35%), Kids(5%)
- Payment status: Paid(75%), Pending(20%), Refunded(5%)
- Client segments: Locals(40%), Tourists(45%), Corporates(15%)

Create data structure for charts and widgets with realistic variance and trends.
```

---

## 🔧 Backend Development

### **BE-001: Laravel V5 Controller Template**
```
Create a complete Laravel V5 controller following Boukii architecture:

CONTROLLER: {ControllerName}V5Controller
MODEL: {ModelName}
SERVICE: {ServiceName}V5Service

REQUIREMENTS:
- Extend BaseController
- Multi-tenant (school_id filtering)
- Season-aware where applicable
- RESTful endpoints: index, show, store, update, destroy
- Validation using Request classes
- Consistent JSON responses
- Error handling with V5ExceptionHandler
- Logging with v5_enterprise channel

INCLUDE:
- Proper documentation with @OA annotations
- Filtering, searching, pagination
- Permissions middleware integration
- Context middleware (X-School-ID, X-Season-ID)

OUTPUT: Complete controller with all endpoints ready
```

### **BE-002: Laravel Service Layer**
```
Create a comprehensive Laravel service class for business logic:

SERVICE: {ServiceName}V5Service
REPOSITORY: {RepositoryName}V5Repository  
MODEL: {ModelName}

REQUIREMENTS:
- Business logic separation from controller
- Database transactions where needed
- Validation and error handling
- Cache integration where appropriate
- Event dispatching for important actions
- Multi-tenant aware operations
- Season context when relevant

METHODS NEEDED:
- CRUD operations with business validation
- Complex queries and filtering
- Bulk operations where applicable
- Statistical/reporting methods
- Integration with external services if needed

OUTPUT: Complete service class with comprehensive business logic
```

### **BE-003: Database Migration Pattern**
```
Create a Laravel migration for {TableName} following V5 patterns:

REQUIREMENTS:
- Multi-tenant design (school_id foreign key)
- Season relationship where applicable  
- Proper indexes for performance
- Timestamps and soft deletes
- Foreign key constraints
- JSON columns for flexible data where needed

TABLE STRUCTURE:
- Primary key: id (bigint, auto-increment)
- School context: school_id (foreign key to schools)
- Season context: season_id (foreign key to seasons) [if applicable]
- Core fields: [specify based on entity]
- Metadata: created_at, updated_at, deleted_at
- Indexes: [specify based on query patterns]

OUTPUT: Complete migration file ready to execute
```

---

## 🎨 Frontend Development

### **FE-001: Angular V5 Component Template**
```
Create a complete Angular V5 component following Boukii patterns:

COMPONENT: {ComponentName}V5Component
SERVICE: {ServiceName}V5Service
INTERFACE: {InterfaceName}

REQUIREMENTS:
- Angular 16 with TypeScript
- Vex theme integration
- Material Design components
- Reactive forms where applicable
- RxJS observables for data management
- Error handling and loading states
- Responsive design (mobile-first)
- Season context awareness
- Proper OnInit/OnDestroy lifecycle

FEATURES:
- CRUD operations with confirmation dialogs
- Filtering and search functionality
- Pagination with virtual scrolling if needed
- Export functionality where applicable
- Accessibility (ARIA labels, keyboard navigation)

OUTPUT: Complete component with HTML, SCSS, and TypeScript files
```

### **FE-002: Angular Service with API Integration**
```
Create an Angular service for {EntityName} with complete API integration:

SERVICE: {ServiceName}V5Service
API BASE: /api/v5/{entity}
AUTH: X-School-ID and X-Season-ID headers via interceptor

REQUIREMENTS:
- HTTP client with proper error handling
- Observable patterns with RxJS operators
- Caching strategy where appropriate
- Optimistic updates for better UX
- TypeScript interfaces for all data structures
- Season context integration
- Loading state management

METHODS:
- CRUD operations: get, getAll, create, update, delete
- Filtering: getByFilters(filters: FilterInterface)
- Search: search(term: string, filters?: any)
- Bulk operations where applicable
- Export methods: exportToPDF(), exportToExcel()

OUTPUT: Complete service with full API integration
```

### **FE-003: Responsive Dashboard Widget**
```
Create a dashboard widget for {MetricName} with real-time data:

WIDGET: {MetricName}Widget
DATA SOURCE: {ApiEndpoint}
CHART TYPE: {ChartType} using ApexCharts

REQUIREMENTS:
- Real-time data updates (WebSocket or polling)
- Loading skeleton while data loads
- Error state with retry mechanism
- Responsive design (adapts to container size)
- Animations and transitions
- Click interactions for drill-down
- Export chart functionality
- Color scheme matching Vex theme

FEATURES:
- Current period vs previous period comparison
- Percentage change indicators (+/-) 
- Mini charts or sparklines for trends
- Configurable time periods
- Auto-refresh every 5 minutes

OUTPUT: Complete widget component with chart integration
```

---

## 🧪 Testing

### **TE-001: Cypress E2E Test Suite**
```
Create comprehensive Cypress E2E tests for {ModuleName}:

TEST SCOPE: Full user journey through {ModuleName}
USER ROLES: Admin, Manager, User (test each permission level)
DATA: Use seeded test data for consistent results

TEST SCENARIOS:
1. Navigation and access control
2. CRUD operations (Create, Read, Update, Delete)
3. Search and filtering functionality
4. Form validations (client-side and server-side)
5. Error handling and recovery
6. Permission-based feature access
7. Season context switching effects
8. Responsive behavior (desktop, tablet, mobile)

REQUIREMENTS:
- Page Object Model pattern
- Custom commands for common actions
- Data cleanup after tests
- Screenshots on failure
- Performance assertions where relevant
- Accessibility testing with axe-core

OUTPUT: Complete test suite with 95%+ passing rate
```

### **TE-002: Unit Testing Pattern**
```
Create Jest unit tests for {ServiceName}:

TEST TARGET: {ServiceName}V5Service
COVERAGE TARGET: 90%+ code coverage
MOCK STRATEGY: Mock HTTP calls and external dependencies

TEST CATEGORIES:
1. Method functionality tests
2. Error handling and edge cases
3. Input validation testing
4. Observable stream testing (RxJS)
5. Integration with other services
6. Performance testing for heavy operations

REQUIREMENTS:
- Arrange-Act-Assert pattern
- Descriptive test names
- Mock data that mirrors production
- Test isolation (no shared state)
- Performance benchmarks where applicable
- Memory leak detection for observables

OUTPUT: Complete test suite with high coverage and quality
```

---

## 📚 Documentation

### **DOC-001: API Documentation Generator**
```
Generate comprehensive API documentation for {ControllerName}:

FORMAT: OpenAPI 3.0 specification
TOOL: Laravel Swagger/L5-Swagger
AUDIENCE: Frontend developers and integrators

INCLUDE:
- All endpoints with full parameter documentation
- Request/response examples with realistic data
- Error code documentation with examples
- Authentication requirements
- Rate limiting information
- Filtering and pagination examples
- Data validation rules
- Relationship explanations

REQUIREMENTS:
- Interactive documentation (Swagger UI)
- Code examples in multiple languages
- Postman collection export
- Version control for API changes
- Testing directly from documentation

OUTPUT: Complete API documentation ready for publication
```

### **DOC-002: Technical Architecture Document**
```
Create technical architecture documentation for {ModuleName}:

AUDIENCE: Developers, architects, stakeholders
FORMAT: Markdown with diagrams (Mermaid)
SCOPE: {ModuleName} complete architecture

SECTIONS:
1. Architecture Overview (high-level diagram)
2. Data Model (ERD with relationships)
3. API Design (endpoints and patterns)
4. Frontend Architecture (components, services, state)
5. Security Model (authentication, authorization)
6. Performance Considerations
7. Deployment Architecture
8. Monitoring and Logging
9. Error Handling Strategy
10. Future Extensibility

REQUIREMENTS:
- Visual diagrams for complex concepts
- Code examples for key patterns
- Decision justification for architecture choices
- Performance metrics and benchmarks
- Troubleshooting guide

OUTPUT: Comprehensive architectural documentation
```

---

## 🔄 Prompt Usage Guidelines

### **Prompt Customization**
1. Replace `{VariableName}` with specific values
2. Adjust requirements based on specific needs
3. Add context-specific details when necessary
4. Include business rules specific to implementation

### **Quality Checklist**
Before using any prompt, ensure:
- [ ] All variables are replaced with actual values
- [ ] Requirements match current sprint goals
- [ ] Context includes relevant business rules
- [ ] Expected output is clearly defined

### **Prompt Evolution**
- Document prompt modifications in this file
- Update prompts based on lessons learned
- Share effective prompt patterns across team
- Archive outdated prompts for reference

---

*Maintained by: Sprint Team | Last Updated: 13 August 2025*