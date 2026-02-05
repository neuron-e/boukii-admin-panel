# Booking Price Calculation Flow - Before & After Fix

## BEFORE FIX (Incorrect Behavior)

### Collective Fixed Course (5 days, 100 CHF total)
```
┌─────────────────────────────────────────────────────────────┐
│ form-details-colective-fix.component.ts                     │
│                                                              │
│ createCourseDateGroup() {                                   │
│   return fb.group({                                         │
│     date: [courseDate.date],                                │
│     price: null,           ← BUG: No price set!             │
│     currency: null,        ← BUG: No currency set!          │
│   })                                                         │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Date objects created without price information              │
│                                                              │
│ dates = [                                                    │
│   { date: '2025-11-24', price: null, currency: null },      │
│   { date: '2025-11-25', price: null, currency: null },      │
│   { date: '2025-11-26', price: null, currency: null },      │
│   { date: '2025-11-27', price: null, currency: null },      │
│   { date: '2025-11-28', price: null, currency: null }       │
│ ]                                                            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ bookings-create-update.component.ts                         │
│                                                              │
│ calculateColectivePriceForDates(course, dates) {            │
│   if (!course.is_flexible) {                                │
│     return basePrice; // Should return 100 CHF              │
│   }                                                          │
│   // But dates have no price, so fallback logic triggers    │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ INCORRECT RESULT: 500 CHF (100 × 5 dates)                   │
│                                                              │
│ Display shows each date with 100 CHF:                       │
│ - 2025-11-24: 100 CHF                                       │
│ - 2025-11-25: 100 CHF                                       │
│ - 2025-11-26: 100 CHF                                       │
│ - 2025-11-27: 100 CHF                                       │
│ - 2025-11-28: 100 CHF                                       │
│ Total: 500 CHF ← WRONG!                                     │
└─────────────────────────────────────────────────────────────┘
```

## AFTER FIX (Correct Behavior)

### Collective Fixed Course (5 days, 100 CHF total)
```
┌─────────────────────────────────────────────────────────────┐
│ form-details-colective-fix.component.ts                     │
│                                                              │
│ createCourseDateGroup() {                                   │
│   return fb.group({                                         │
│     date: [courseDate.date],                                │
│     price: this.course.price,      ← FIX: Set from course   │
│     currency: this.course.currency, ← FIX: Set from course  │
│   })                                                         │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Date objects created WITH price information                 │
│                                                              │
│ dates = [                                                    │
│   { date: '2025-11-24', price: 100, currency: 'CHF' },      │
│   { date: '2025-11-25', price: 100, currency: 'CHF' },      │
│   { date: '2025-11-26', price: 100, currency: 'CHF' },      │
│   { date: '2025-11-27', price: 100, currency: 'CHF' },      │
│   { date: '2025-11-28', price: 100, currency: 'CHF' }       │
│ ]                                                            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ bookings-create-update.component.ts                         │
│                                                              │
│ calculateColectivePriceForDates(course, dates) {            │
│   const price = parseFloat(course.price); // 100            │
│   if (!course.is_flexible) {                                │
│     return Math.max(0, price); // Returns 100 CHF ✓         │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ CORRECT RESULT: 100 CHF (fixed price)                       │
│                                                              │
│ Display shows dates included in the fixed price:            │
│ - 2025-11-24: Included in course                            │
│ - 2025-11-25: Included in course                            │
│ - 2025-11-26: Included in course                            │
│ - 2025-11-27: Included in course                            │
│ - 2025-11-28: Included in course                            │
│ Total: 100 CHF ← CORRECT!                                   │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences: Fixed vs Flexible

### Collective FIXED (is_flexible = false)
```
Course Price: 100 CHF
Dates: 5 days
Calculation: 100 CHF (single price, not multiplied)
Result: 100 CHF total
```

### Collective FLEXIBLE (is_flexible = true)
```
Course Price: 100 CHF per date
Dates: 5 days selected
Calculation: 100 CHF × 5 = 500 CHF
Discounts: Applied based on number of dates
Result: 500 CHF (or less with discounts)
```

## Additional Fixes

### DecimalPipe Error Fix
```
BEFORE:
<span class="price">{{date.price}} {{date.currency}}</span>
↓ Could receive string "100.00 CHF" causing pipe error

AFTER:
<span class="price">{{ resolveDatePrice(date) | number:"1.2-2" }} {{date.currency}}</span>
↓ Always receives number, formats correctly as "100.00"
```

### Change Detection Error Fix
```
BEFORE:
ngOnInit() {
  this.setFocusOnClientObs(); ← Called too early
}
ngAfterViewInit() {
  this.setFocusOnClientObs(); ← ViewChild available
}
↓ Causes ExpressionChangedAfterItHasBeenCheckedError

AFTER:
ngOnInit() {
  // No focus call here
}
ngAfterViewInit() {
  this.setFocusOnClientObs(); ← Only called when safe
}
```
