
# Monthly Absence Reset Feature

## Overview

The app now automatically resets absence records at the beginning of each new month. This ensures that absence tracking is always current and relevant to the active month.

## How It Works

### Automatic Detection

The app checks for a new month whenever:

- The Dashboard screen loads or is focused
- The Jobs screen loads or is focused  
- The Settings screen loads or is focused

### Reset Logic

When a new month is detected:

1. The system compares the current month/year with the stored `absenceMonth` and `absenceYear` in settings
2. If they differ, it automatically:
   - Resets `absenceHours` to 0
   - Updates `absenceMonth` to the current month
   - Updates `absenceYear` to the current year
3. A success notification is shown to the user on the Dashboard (only)

### User Notification

When the Dashboard detects a new month and resets absence records, the user sees:

```
🗓️ New month detected!

Absence records have been automatically reset for [Current Month] [Year].

Previous month: [Previous Month] [Year]
```

## Technical Implementation

### New Service: `MonthlyResetService`

Location: `utils/monthlyReset.ts`

#### Key Functions

**`checkAndResetIfNewMonth()`**
- Checks if we're in a new month
- Resets absence records if needed
- Returns detailed information about the reset

**`getCurrentMonthAbsenceHours()`**
- Returns absence hours for the current month only
- Returns 0 if stored month differs from current month

**`forceReset()`**
- Manually resets absence records (for testing or manual reset)

**`getAbsenceTrackingStatus()`**
- Returns comprehensive status of absence tracking
- Useful for debugging and status displays

### Integration Points

The monthly reset check is integrated into:

1. **Dashboard** (`app/dashboard.tsx`)
   - Checks on load and shows notification if reset occurs
   - Runs before loading jobs data

2. **Jobs Screen** (`app/jobs.tsx`)
   - Checks silently on load
   - No notification shown (to avoid duplicate notifications)

3. **Settings Screen** (`app/settings.tsx`)
   - Checks silently on load
   - Ensures settings are current when user views them

## Data Structure

### AppSettings Interface

The following fields track absence data:

```typescript
interface AppSettings {
  // ... other fields
  absenceHours?: number;      // Total absence hours for tracked month
  absenceMonth?: number;       // Month being tracked (0-11)
  absenceYear?: number;        // Year being tracked
}
```

## User Experience

### First Time Use

When absence tracking is used for the first time:
- System initializes tracking for the current month
- Sets `absenceHours` to 0
- No notification shown

### Monthly Transition

When the calendar month changes:
- User opens the app
- Dashboard automatically detects the new month
- Absence hours reset to 0 for the new month
- User sees a friendly notification explaining the reset
- Previous month's data is logged for reference

### Absence Logging

When logging absence in Settings:
- System checks if we're in the same month as stored
- If different month detected, resets first
- Then applies the new absence entry
- Calculations use current month's absence hours only

## Benefits

1. **Automatic Management**: No manual intervention needed
2. **Always Current**: Absence data is always for the current month
3. **Clean Slate**: Each month starts fresh
4. **Transparent**: Users are informed when resets occur
5. **Reliable**: Multiple check points ensure consistency

## Edge Cases Handled

### Month Boundary

- If user opens app on the 1st of a new month, reset happens immediately
- Previous month's absence data is not carried over

### Year Boundary

- December → January transition is handled correctly
- Year is updated along with month

### Multiple Opens

- If app is opened multiple times in the same month, no duplicate resets
- Reset only occurs once per month transition

### Absence Logging Across Months

- If user logs absence after month has changed, system resets first
- New absence is logged to the current month only

## Console Logging

The system logs detailed information for debugging:

```
[MonthlyReset] New month detected! Resetting absence records.
[MonthlyReset] Previous: January 2025, Absence: 17.00h
[MonthlyReset] Current: February 2025
[Dashboard] Monthly reset completed: { wasReset: true, ... }
```

## Testing

To test the monthly reset feature:

1. **Manual Testing**:
   - Log some absence hours in Settings
   - Change device date to next month
   - Open Dashboard
   - Verify notification appears and absence hours are reset

2. **Force Reset** (for development):
   ```typescript
   await MonthlyResetService.forceReset();
   ```

3. **Check Status**:
   ```typescript
   const status = await MonthlyResetService.getAbsenceTrackingStatus();
   console.log(status);
   ```

## Future Enhancements

Potential improvements for future versions:

1. **History Tracking**: Store previous months' absence data
2. **Reports**: Generate absence reports across multiple months
3. **Notifications**: Optional reminder notifications for absence logging
4. **Settings Toggle**: Allow users to disable auto-reset if desired
5. **Manual Reset Button**: Add UI button to manually trigger reset

## Related Files

- `utils/monthlyReset.ts` - Core reset service
- `app/dashboard.tsx` - Primary integration point with user notification
- `app/jobs.tsx` - Silent integration point
- `app/settings.tsx` - Silent integration point + absence logging
- `utils/calculations.ts` - Uses absence hours in efficiency calculations
- `types/index.ts` - AppSettings interface definition

## Summary

The monthly reset feature provides automatic, transparent, and reliable management of absence records. It ensures that absence tracking is always relevant to the current month, improving the accuracy of efficiency calculations and providing a better user experience.
