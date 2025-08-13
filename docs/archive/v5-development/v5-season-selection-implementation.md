# V5 Season Selection Implementation Guide

This document provides a comprehensive guide for implementing the V5 season selection feature in the Boukii system.

## Overview

V5 introduces a new authentication flow that handles users who don't have valid seasons assigned to their school. Instead of failing authentication, the system now guides users through a season selection process.

## Key Features

- **Initial Login**: Authentication without season requirement
- **Season Selection Interface**: User-friendly season picker
- **New Season Creation**: Ability to create seasons during login
- **Automatic Season Assignment**: Users are assigned to selected/created seasons
- **Context Header Propagation**: X-School-ID and X-Season-ID headers for multi-tenant requests
- **Enhanced Token Management**: Tokens store school and season context
- **Comprehensive Testing**: Laravel, Angular, and E2E test coverage

## Architecture Changes

### Database Schema Updates

#### 1. User Season Roles Enhancement
```sql
-- Add tracking fields for season assignments
ALTER TABLE user_season_roles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE user_season_roles ADD COLUMN assigned_at TIMESTAMP NULL;
ALTER TABLE user_season_roles ADD COLUMN assigned_by BIGINT UNSIGNED NULL;

-- Add foreign key for assignment tracking
ALTER TABLE user_season_roles 
ADD CONSTRAINT fk_user_season_roles_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;
```

#### 2. Seasons Table Enhancement
```sql
-- Add status tracking for seasons
ALTER TABLE seasons ADD COLUMN is_current BOOLEAN DEFAULT FALSE;
ALTER TABLE seasons ADD COLUMN is_historical BOOLEAN DEFAULT FALSE;

-- Add performance indexes
CREATE INDEX idx_seasons_school_dates ON seasons(school_id, start_date, end_date);
CREATE INDEX idx_seasons_current_active ON seasons(is_current, is_active);
```

#### 3. Personal Access Tokens Enhancement
```sql
-- Add context information to tokens
ALTER TABLE personal_access_tokens ADD COLUMN school_id BIGINT UNSIGNED NULL;
ALTER TABLE personal_access_tokens ADD COLUMN season_id BIGINT UNSIGNED NULL;
ALTER TABLE personal_access_tokens ADD COLUMN context_data JSON NULL;

-- Add foreign key constraints
ALTER TABLE personal_access_tokens 
ADD CONSTRAINT fk_tokens_school_id 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE personal_access_tokens 
ADD CONSTRAINT fk_tokens_season_id 
FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;
```

### Backend Implementation

#### 1. New Controllers and Methods

**AuthV5Controller** enhancements:
- `initialLogin()`: Handles login without season requirement
- `selectSeason()`: Completes authentication with season selection

#### 2. Request Validation

**InitialLoginV5Request**:
```php
public function rules(): array
{
    return [
        'email' => 'required|email',
        'password' => 'required|string',
        'school_id' => 'required|integer|exists:schools,id',
        'remember_me' => 'boolean'
    ];
}
```

**SelectSeasonV5Request**:
```php
public function rules(): array
{
    return [
        'season_id' => 'required_without:create_new_season|integer|exists:seasons,id',
        'create_new_season' => 'boolean',
        'new_season_data' => 'required_if:create_new_season,true|array',
        'new_season_data.name' => 'required_if:create_new_season,true|string|min:3|max:255',
        'new_season_data.start_date' => 'required_if:create_new_season,true|date',
        'new_season_data.end_date' => 'required_if:create_new_season,true|date|after:new_season_data.start_date'
    ];
}
```

#### 3. Business Logic

The season selection process:

1. **Initial Login**: Validates user credentials and school
2. **Season Check**: Determines if user has valid season assignment
3. **Season Selection**: User chooses from available seasons or creates new one
4. **Assignment**: User is assigned to selected/created season
5. **Token Enhancement**: Final token includes school and season context

### Frontend Implementation

#### 1. Service Layer

**AuthV5Service** new methods:
- `initialLogin()`: Performs login without season
- `selectSeason()`: Completes authentication with season selection
- `getAvailableSeasons()`: Fetches available seasons for school

**TokenV5Service** enhancements:
- `savePartialLoginData()`: Stores temporary login state
- Enhanced context management for school/season data

#### 2. HTTP Interceptor

**AuthV5Interceptor** automatically adds:
- `X-School-ID` header
- `X-Season-ID` header  
- `X-Client-Version` header
- `X-Client-Type` header

#### 3. Component Structure

**Season Selection Component** (to be implemented):
- Season card display
- New season creation form
- Loading states and error handling
- Accessibility features

### Route Configuration

#### Backend Routes
```php
// routes/api/v5.php
Route::post('/auth/initial-login', [AuthV5Controller::class, 'initialLogin'])
    ->name('v5.auth.initial-login');

Route::post('/auth/select-season', [AuthV5Controller::class, 'selectSeason'])
    ->name('v5.auth.select-season')
    ->middleware(['auth:sanctum']);
```

#### Frontend Routes  
```typescript
// auth-routing.module.ts
{
  path: 'select-season',
  component: SeasonSelectionComponent,
  canActivate: [TempTokenGuard]
}
```

## Implementation Steps

### Phase 1: Database Migration
1. Run migration files to update schema
2. Seed test data for school ID = 2
3. Verify data integrity with existing records

### Phase 2: Backend Development
1. Implement new authentication methods
2. Add request validation classes
3. Update route definitions
4. Implement season management logic

### Phase 3: Frontend Development  
1. Update AuthV5Service with new methods
2. Enhance TokenV5Service for partial login state
3. Update HTTP interceptor for header propagation
4. Create season selection component (future)

### Phase 4: Testing
1. Laravel unit and feature tests
2. Angular service unit tests
3. Cypress E2E tests for complete flow
4. Manual testing with real data

## Testing Strategy

### 1. Migration Integrity Tests
```php
// tests/Feature/V5/MigrationIntegrityTest.php
- Verify schema changes don't affect legacy data
- Test foreign key constraints
- Validate new column defaults
```

### 2. Authentication Flow Tests
```php
// tests/Feature/V5/SeasonSelectionAuthTest.php  
- Initial login without valid season
- Season selection with existing season
- New season creation
- Error handling and validation
```

### 3. Frontend Service Tests
```typescript
// auth-v5.service.spec.ts
- initialLogin() method behavior
- selectSeason() method behavior  
- getAvailableSeasons() method behavior
- Error handling and loading states
```

### 4. E2E Tests
```typescript
// cypress/e2e/v5/auth/season-selection-v5.cy.ts
- Complete season selection flow
- New season creation flow
- Error scenarios and recovery
- Accessibility and keyboard navigation
```

## Error Handling

### Common Error Scenarios

1. **No Valid Season**: User has no active season assignment
2. **Invalid Season Selection**: Selected season is not available
3. **Duplicate Season Name**: New season name already exists
4. **Insufficient Permissions**: User cannot create seasons
5. **Expired Temporary Token**: Session expired during selection
6. **Network Errors**: Connection issues during API calls

### Error Response Format
```json
{
  "success": false,
  "message": "Human readable error message",  
  "error_code": "MACHINE_READABLE_CODE",
  "data": {
    "validation_errors": {
      "field_name": ["Error message"]
    }
  }
}
```

## Security Considerations

### 1. Token Security
- Temporary tokens have limited lifetime (1 hour)
- Temporary tokens cannot access protected resources
- Final tokens include full context validation

### 2. Permission Validation
- Season creation requires appropriate permissions
- School context is validated on every request
- Season assignments are tracked with audit fields

### 3. Input Validation
- All date inputs are validated for logical consistency
- Season names are sanitized and length-limited
- SQL injection protection through Eloquent ORM

## Performance Considerations

### 1. Database Indexes
- Added indexes for season queries by school and date
- User season role queries optimized with composite indexes
- Token lookups include context indexes

### 2. Caching Strategy
- Available seasons can be cached per school
- User permissions cached during session
- School context cached in token payload

### 3. API Optimization
- Batch queries for season data
- Minimal payload for season selection
- Efficient token validation with context

## Deployment Checklist

### Pre-Deployment
- [ ] Run migration integrity tests
- [ ] Verify test data seeding works
- [ ] Test authentication flows in staging
- [ ] Validate header propagation
- [ ] Check error handling scenarios

### Deployment
- [ ] Run database migrations
- [ ] Deploy backend code
- [ ] Deploy frontend code  
- [ ] Update API documentation
- [ ] Monitor error logs

### Post-Deployment
- [ ] Verify login flows work
- [ ] Test season selection with real users
- [ ] Monitor performance metrics
- [ ] Validate error reporting
- [ ] Collect user feedback

## Troubleshooting

### Common Issues

1. **Migration Fails**: Check existing data conflicts
2. **Authentication Breaks**: Verify token validation middleware
3. **Headers Not Sent**: Check interceptor configuration
4. **Season Selection Errors**: Validate request format and permissions
5. **Performance Issues**: Check database indexes and query optimization

### Debug Tools

1. **Laravel Telescope**: Monitor API requests and database queries
2. **Angular DevTools**: Inspect service state and HTTP calls
3. **Browser Network Tab**: Verify header propagation
4. **Database Query Logs**: Analyze performance bottlenecks

## Future Enhancements

### Planned Features
1. **Season Templates**: Pre-configured season structures
2. **Bulk Season Management**: Create multiple seasons at once
3. **Season Analytics**: Usage statistics and insights
4. **Advanced Permissions**: Granular season-level permissions
5. **Multi-School Support**: Cross-school season management

### Technical Improvements
1. **GraphQL Integration**: More efficient data fetching
2. **Real-time Updates**: WebSocket notifications for season changes
3. **Progressive Web App**: Offline season selection capability
4. **Advanced Caching**: Redis-based session management

## Conclusion

The V5 season selection implementation provides a robust, user-friendly solution for handling multi-tenant authentication with season context. The comprehensive testing strategy ensures reliability, while the modular architecture allows for future enhancements.

For technical support or questions about this implementation, refer to the test files and API documentation, or contact the development team.