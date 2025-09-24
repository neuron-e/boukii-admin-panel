# 🔧 Flex Course Issues - Analysis & Fix Plan

## Problems Identified:

### 1. Booking #5559 (Johana García) not showing in course view
- **Issue**: Collective FLEX booking not appearing in course detail
- **Cause**: Relationship structure different for flex courses
- **Impact**: Clients can't see their bookings in course view

### 2. Incorrect booking count (6/54 instead of 1/54)
- **Issue**: Wrong reservation count for collective flex courses
- **Cause**: Counting individual dates instead of unique bookings
- **Impact**: Misleading capacity information

### 3. Flex course logic inconsistency
- **Issue**: Fixed courses should book ALL dates automatically
- **Cause**: Missing automatic date assignment for flex courses
- **Impact**: Manual booking required for each date

## Data Structure Analysis:

```
Collective FLEX Structure:
Course (449)
  └── course_dates (multiple dates)
      └── course_groups (levels/groups)
          └── course_subgroups (capacity groups)
              └── booking_users (actual reservations)

Normal Course Structure:
Course → booking_users (direct relationship)
```

## Fix Strategy:

1. **Fix booking display in course view**
   - Update course-detail component to properly fetch flex bookings
   - Modify relationship loading for collective flex courses

2. **Fix booking count logic**
   - Change counting from individual dates to unique bookings
   - Implement proper capacity calculation for flex courses

3. **Implement automatic date assignment**
   - When booking flex course, automatically assign ALL dates
   - Update booking creation logic for flex courses

## Files to Modify:

1. `course-detail.component.ts` - Fix booking loading
2. `bookings.component.ts` - Fix counting logic
3. `booking-create-update.component.ts` - Fix flex booking creation
4. `aio-table.component.ts` - Update filtering for flex courses

## Expected Outcome:

- Johana García's booking #5559 appears in course view
- Count shows "1/54" (1 booking, 54 total capacity)
- Flex bookings automatically reserve all course dates