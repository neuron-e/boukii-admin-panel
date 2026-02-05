# Booking System Critical Bug Fixes - 2025-01-17

## Overview
Fixed critical pricing calculation bug in the booking system for collective fixed courses (Colectivo Fix), along with related display and lifecycle errors.

## Main Issue
**Problem**: Collective fixed courses were calculating prices as if they were flexible courses, multiplying the number of dates by the unit price instead of using a single fixed price.

**Example**: A 5-day fixed collective course with 100 CHF total price was incorrectly showing 500 CHF (100 CHF × 5 dates).

## Root Cause Analysis

### 1. Missing Price Data in Fixed Courses
**File**: `/src/app/pages/bookings-v2/bookings-create-update/components/form-details-colective-fix/form-details-colective-fix.component.ts`

**Issue**: Lines 67-68 set price and currency to `null`:
```typescript
price: null,
currency: null,
```

**Impact**: Without price data in the date objects, the calculation logic couldn't properly distinguish between fixed and flexible courses.

**Fix**: Changed to use the course price:
```typescript
price: this.course.price,
currency: this.course.currency,
```

### 2. DecimalPipe Error in Booking Description Card
**File**: `/src/app/pages/bookings-v2/bookings-create-update/components/booking-description-card/booking-description-card.component.html`

**Issue**: Line 195 was displaying raw price values that could be strings like "100.00 CHF":
```html
{{date.price}} {{date.currency}}
```

**Error**: `ERROR RuntimeError: NG02100: InvalidPipeArgument: '100.00 CHF is not a number' for pipe 'DecimalPipe'`

**Fix**: 
1. Made `resolveDatePrice()` method public in the component TypeScript file
2. Updated template to use the method with proper number formatting:
```html
{{ resolveDatePrice(date) | number:"1.2-2" }} {{date.currency}}
```

### 3. ExpressionChangedAfterItHasBeenCheckedError
**File**: `/src/app/pages/bookings-v2/bookings-create-update/components/step-observations/step-observations.component.ts`

**Issue**: `setFocusOnClientObs()` was called in both `ngOnInit` and `ngAfterViewInit`, causing change detection errors.

**Fix**: Removed the call from `ngOnInit`, keeping only the call in `ngAfterViewInit` where the ViewChild is guaranteed to be initialized.

## Verification of Calculation Logic

### Collective Price Calculation
**File**: `/src/app/pages/bookings-v2/bookings-create-update/bookings-create-update.component.ts`

**Method**: `calculateColectivePriceForDates()` (lines 838-872)

**Logic Verified Correct**:
```typescript
if (!course?.is_flexible) {
  return Math.max(0, basePrice);  // Fixed course: single price
}
// Flexible course: multiply by date count and apply discounts
```

The calculation logic was already correct. The bug was solely due to missing price data in the form component.

## Files Modified

1. `/src/app/pages/bookings-v2/bookings-create-update/components/form-details-colective-fix/form-details-colective-fix.component.ts`
   - Lines 67-68: Set `price` and `currency` from course data

2. `/src/app/pages/bookings-v2/bookings-create-update/components/booking-description-card/booking-description-card.component.ts`
   - Line 229: Changed `private resolveDatePrice()` to `public resolveDatePrice()`

3. `/src/app/pages/bookings-v2/bookings-create-update/components/booking-description-card/booking-description-card.component.html`
   - Line 195: Updated to use `resolveDatePrice()` method with number pipe

4. `/src/app/pages/bookings-v2/bookings-create-update/components/step-observations/step-observations.component.ts`
   - Removed duplicate `setFocusOnClientObs()` call from `ngOnInit`

## Remaining Issues (Backend)

### Check Availability 404 Error
**Endpoint**: `/admin/bookings/checkbooking`
**Status**: This is a backend API issue, not addressed in this frontend fix
**Recommendation**: Backend team should verify this endpoint exists and is properly configured

## Expected Behavior After Fix

### Collective Fixed Courses
- Should display a single fixed price regardless of the number of dates
- Example: 5-day course at 100 CHF total = 100 CHF (not 500 CHF)

### Collective Flexible Courses
- Should calculate price per date with discount rules
- Example: 5 dates × 100 CHF = 500 CHF (with potential volume discounts)

### Display
- Prices should always show as properly formatted numbers (e.g., "100.00 CHF")
- No console errors related to DecimalPipe

### User Experience
- No change detection errors during form navigation
- Proper focus management in observations step
- Smooth editing experience when going back to modify bookings

## Testing Recommendations

1. Create a new booking for a collective fixed course
2. Select multiple dates
3. Verify total price equals course fixed price (not price × dates)
4. Edit and go back through the booking flow
5. Verify no console errors appear
6. Check that price displays correctly formatted

## Time Log
- Investigation and fixes: Approximately 1.5 hours
- Date: 2025-01-17
- Agent: fe-admin
