# Frontend Token Service Fix - "Failed to save login data"

## Problem Description

After fixing the backend SQL errors, the frontend was throwing a new error:

```
Error: Failed to save login data
    at TokenV5Service.saveLoginData (token-v5.service.ts:101:13)
    at Object.next (auth-v5.service.ts:457:31)
```

This occurred because there was a mismatch between the data structure sent by the backend and what the frontend expected.

## Root Cause Analysis

### Backend Response Structure (Actual)
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "User", "email": "user@example.com", "role": "admin", "permissions": [] },
    "school": { "id": 1, "name": "School", "slug": "school", "logo": "logo.png" },
    "season": { "id": 1, "name": "Season 2024", "year": 2024, "is_current": true },
    "token": "jwt-token-here",
    "expires_at": "2025-08-08T10:00:00Z",
    "context": {}
  },
  "message": "Login completado correctamente",
  "timestamp": "2025-08-07T10:00:00Z"
}
```

### Frontend Expected Structure (Before Fix)
```typescript
interface LoginResponse {
  access_token: string;  // ❌ Backend sends 'token'
  user: AuthUser;
  school: SchoolContext;
  season: Season;
  expires_at: string;
}
```

### Key Issues Found

1. **Token Field Mismatch**: Backend sends `token`, frontend expected `access_token`
2. **Data Wrapping**: Backend wraps data in `data` object, frontend expected flat structure
3. **Interface Mismatch**: TypeScript interfaces didn't match actual backend response
4. **Missing Null Checks**: No validation for missing required fields

## Solution Implemented

### 1. Updated TypeScript Interfaces

**File**: `src/app/v5/features/auth/models/auth.interface.ts`

```typescript
// ✅ Updated to match actual backend response
export interface AuthUser {
  id: number;
  name: string;        // ✅ Backend sends 'name', not 'first_name'/'last_name'
  email: string;
  role: string;
  permissions: string[];
}

export interface SchoolContext {
  id: number;
  name: string;
  slug: string;
  logo?: string;       // ✅ Backend sends 'logo', not 'logo_url'
}

export interface Season {
  id: number;
  name: string;
  year: number;
  is_current: boolean;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: AuthUser;
    school: SchoolContext;
    season: Season;
    token: string;      // ✅ Correct field name
    expires_at?: string;
    context?: any;
  };
  message: string;
  timestamp: string;
  // Compatibility fallbacks
  user?: AuthUser;
  school?: SchoolContext;
  season?: Season;
  token?: string;
  access_token?: string;
  expires_at?: string;
}
```

### 2. Enhanced Token Service

**File**: `src/app/v5/core/services/token-v5.service.ts`

```typescript
saveLoginData(loginResponse: LoginResponse): void {
  try {
    // ✅ Flexible data extraction - handles both wrapped and flat responses
    const user = loginResponse.data?.user || loginResponse.user;
    const school = loginResponse.data?.school || loginResponse.school;
    const season = loginResponse.data?.season || loginResponse.season;
    const token = loginResponse.data?.token || loginResponse.token || loginResponse.access_token;
    const expiresAt = loginResponse.data?.expires_at || loginResponse.expires_at;

    // ✅ Validation for required fields
    if (!user || !school || !season || !token) {
      console.error('❌ Missing required login data:', {
        hasUser: !!user,
        hasSchool: !!school,
        hasSeason: !!season,
        hasToken: !!token,
        rawResponse: loginResponse
      });
      throw new Error('Incomplete login data received from server');
    }

    // ✅ Save with correct field names
    const tokenData: TokenData = {
      access_token: token,    // ✅ Use extracted token
      token_type: 'Bearer',
      expires_at: expiresAt
    };

    // Rest of the saving logic...
  } catch (error) {
    console.error('❌ Error saving login data:', error);
    throw new Error('Failed to save login data');
  }
}
```

### 3. Key Improvements

1. **Flexible Data Extraction**: Handles both `data.token` and `token` formats
2. **Comprehensive Validation**: Checks for all required fields before proceeding
3. **Better Error Messages**: Detailed logging for debugging
4. **Backward Compatibility**: Falls back to old field names if needed
5. **Type Safety**: Updated interfaces match actual backend response

## Files Modified

1. **Interfaces**: `src/app/v5/features/auth/models/auth.interface.ts`
2. **Token Service**: `src/app/v5/core/services/token-v5.service.ts`
3. **Documentation**: `docs/FRONTEND_TOKEN_SERVICE_FIX.md`

## Expected Results

✅ **Login Data Saving**: No more "Failed to save login data" errors  
✅ **Type Safety**: TypeScript interfaces match backend response  
✅ **Flexibility**: Handles different response formats gracefully  
✅ **Better Debugging**: Detailed error logging for troubleshooting  
✅ **Robust Validation**: Validates all required fields before processing  

## Data Flow Fixed

```
Backend Response → Frontend Token Service → LocalStorage
     ✅              ✅                        ✅
{                   Extracts:               Saves:
  data: {           - user                  - token data
    token: "...",   - school                - user context
    user: {...},    - season                - school context  
    school: {...},  - token                 - season context
    season: {...}   - expires_at
  }
}
```

## Testing

To verify the fix:

1. **Login Flow**: Complete V5 login process should work without errors
2. **Console Logs**: Should see "✅ Login data saved successfully" message
3. **LocalStorage**: Check that all required data is stored correctly
4. **Error Handling**: Invalid responses should show detailed error messages

The frontend token service now correctly handles the backend response structure and should resolve the "Failed to save login data" error.