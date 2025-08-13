# Auth Module

The Auth module handles authentication using season context and role permissions. V5 introduces a new season selection flow for users who don't have valid seasons assigned.

## Authentication Flow

V5 supports two authentication flows:

1. **Direct Login**: For users with valid season assignments
2. **Season Selection Flow**: For users without valid seasons or when seasons need to be selected

## Endpoints

### Initial Login (New in V5)

```http
POST /api/v5/auth/initial-login
```

Performs login without requiring season_id. Used when the user needs to select a season.

Parameters:
- `email` (string, required)
- `password` (string, required)  
- `school_id` (integer, required)
- `remember_me` (boolean, optional, default: false)

Response when season selection is required:
```json
{
  "success": true,
  "message": "Initial login successful",
  "data": {
    "access_token": "temp-token-12345",
    "token_type": "Bearer",
    "expires_at": "2025-01-04T12:00:00Z",
    "requires_season_selection": true,
    "available_seasons": [
      {
        "id": 1,
        "name": "Temporada 2024-2025",
        "start_date": "2024-09-01",
        "end_date": "2025-06-30",
        "is_active": true,
        "is_current": true
      }
    ],
    "user": { /* User fields */ },
    "school": { /* School fields */ }
  }
}
```

Response when user has valid season (completes login automatically):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "final-token-67890",
    "token_type": "Bearer",
    "expires_at": "2025-01-04T18:00:00Z",
    "user": { /* User fields */ },
    "school": { /* School fields */ },
    "season": { /* Season fields */ }
  }
}
```

### Season Selection (New in V5)

```http
POST /api/v5/auth/select-season
```

Completes the authentication flow by selecting or creating a season. Requires temporary token from initial login.

**Select Existing Season:**
```json
{
  "season_id": 1
}
```

**Create New Season:**
```json
{
  "create_new_season": true,
  "new_season_data": {
    "name": "Temporada 2026-2027",
    "start_date": "2026-09-01",
    "end_date": "2027-06-30"
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Season selected successfully",
  "data": {
    "access_token": "final-token-67890",
    "token_type": "Bearer", 
    "expires_at": "2025-01-04T18:00:00Z",
    "user": { /* User fields */ },
    "school": { /* School fields */ },
    "season": { /* Selected/Created season fields */ }
  }
}
```

### Traditional Login (Legacy)

```http
POST /api/v5/auth/login
```

Direct login requiring season_id. Still supported for backward compatibility.

Parameters:
- `email` (string, required)
- `password` (string, required)
- `school_id` (integer, required)
- `season_id` (integer, required)
- `remember_me` (boolean, optional, default: false)

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "token-12345",
    "token_type": "Bearer",
    "expires_at": "2025-01-04T18:00:00Z",
    "user": { /* User fields */ },
    "school": { /* School fields */ },
    "season": { /* Season fields */ }
  }
}
```

### Permissions

```http
GET /api/v5/auth/permissions?season_id={id}
```

Returns an array of permission strings for the authenticated user. Requires the
`season.context` **and** `season.permission` middleware.

### Switch Season Role

```http
POST /api/v5/auth/season/switch
```

Body:
```json
{
  "season_id": 1
}
```

Sets the user's role for the season to `active`. Protected by `season.context`
and `season.permission` middleware.

## Season Context and Headers

V5 authentication includes automatic header propagation for multi-tenant context:

### Context Headers

After successful authentication, all API requests automatically include:

- `X-School-ID`: Current school identifier
- `X-Season-ID`: Current season identifier (after season selection)
- `X-Client-Version`: Frontend client version
- `X-Client-Type`: Application type (angular-admin)

These headers are managed by the Angular AuthV5Interceptor and used by Laravel middleware for request context.

### Token Management

V5 uses enhanced personal access tokens with context data:

```sql
-- personal_access_tokens table enhancements
ALTER TABLE personal_access_tokens ADD COLUMN school_id BIGINT UNSIGNED;
ALTER TABLE personal_access_tokens ADD COLUMN season_id BIGINT UNSIGNED; 
ALTER TABLE personal_access_tokens ADD COLUMN context_data JSON;
```

## Migration Considerations

V5 season selection requires database schema updates:

### User Season Roles Enhancement

```sql
-- user_season_roles table enhancements  
ALTER TABLE user_season_roles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE user_season_roles ADD COLUMN assigned_at TIMESTAMP NULL;
ALTER TABLE user_season_roles ADD COLUMN assigned_by BIGINT UNSIGNED NULL;
```

### Seasons Table Enhancement

```sql
-- seasons table enhancements
ALTER TABLE seasons ADD COLUMN is_current BOOLEAN DEFAULT FALSE;
ALTER TABLE seasons ADD COLUMN is_historical BOOLEAN DEFAULT FALSE;
```

## Error Handling

### Season Selection Errors

**No valid season assigned:**
```json
{
  "success": false,
  "message": "User has no valid season assigned to this school",
  "error_code": "NO_VALID_SEASON",
  "requires_season_selection": true
}
```

**Invalid season selection:**
```json
{
  "success": false,
  "message": "Season not found or not available for selection",
  "error_code": "INVALID_SEASON_SELECTION"
}
```

**Season name already exists:**
```json
{
  "success": false,
  "message": "Season name already exists for this school",
  "error_code": "DUPLICATE_SEASON_NAME"
}
```

**Not authorized to create seasons:**
```json
{
  "success": false,
  "message": "Insufficient permissions to create seasons",
  "error_code": "INSUFFICIENT_PERMISSIONS"
}
```

## Testing

### Laravel Tests

Run season selection tests:
```bash
php artisan test tests/Feature/V5/SeasonSelectionAuthTest.php
php artisan test tests/Feature/V5/MigrationIntegrityTest.php
```

### Frontend Tests

Run Angular unit tests:
```bash
npm test -- --include="**/auth-v5.service.spec.ts"
```

Run Cypress E2E tests:
```bash
npx cypress run --spec="cypress/e2e/v5/auth/season-selection-v5.cy.ts"
```
