
# Testing the Monthly Reset Feature

## Quick Test Guide

### Test 1: Check Current Status

Open the app and check the console logs. You should see:

```
[MonthlyReset] Same month (February 2025), no reset needed
```

### Test 2: Simulate Month Change

**Method 1: Change Device Date**

1. Log some absence hours in Settings (e.g., 2 full days = 17 hours)
2. Note the current month and absence hours
3. Close the app completely
4. Change your device date to the 1st of next month
5. Open the app
6. You should see a notification on Dashboard:
   ```
   🗓️ New month detected!
   
   Absence records have been automatically reset for March 2025.
   
   Previous month: February 2025
   ```
7. Go to Settings and verify absence hours are now 0
8. Change device date back to current date

**Method 2: Use Developer Tools (if available)**

If you have access to React Native DevTools or can add temporary code:

```typescript
// Temporarily add to dashboard.tsx for testing
const testMonthReset = async () => {
  const settings = await StorageService.getSettings();
  // Set to previous month
  await StorageService.saveSettings({
    ...settings,
    absenceMonth: new Date().getMonth() - 1,
    absenceYear: new Date().getFullYear(),
    absenceHours: 25.5
  });
  console.log('Test data set - reload app to trigger reset');
};
```

### Test 3: Verify Absence Logging

1. Go to Settings → Absence Logger
2. Log 1 full day absence
3. Note the calculation preview shows correct hours
4. Confirm the absence
5. Check Dashboard - efficiency should reflect the absence
6. Go back to Settings - verify absence hours are saved

### Test 4: Cross-Month Absence Logging

1. Set device date to last day of current month
2. Log some absence hours (e.g., 8.5 hours)
3. Change device date to 1st of next month
4. Open app - should see reset notification
5. Go to Settings - absence hours should be 0
6. Log new absence for new month
7. Verify it's tracked separately from previous month

### Test 5: Multiple Screen Navigation

1. Open Dashboard (reset check happens)
2. Navigate to Jobs (reset check happens)
3. Navigate to Settings (reset check happens)
4. Verify no duplicate notifications
5. Verify only one reset occurs

## Expected Behaviors

### ✅ Correct Behaviors

- Reset happens automatically when month changes
- User sees notification on Dashboard only (not on other screens)
- Absence hours reset to 0 for new month
- Previous month's data is logged in console
- Efficiency calculations use current month's absence hours
- No errors or crashes during reset

### ❌ Incorrect Behaviors to Watch For

- Multiple reset notifications
- Absence hours not resetting
- App crashes when month changes
- Efficiency calculations using old absence data
- Reset happening multiple times in same month

## Console Log Examples

### Successful Reset

```
[MonthlyReset] New month detected! Resetting absence records.
[MonthlyReset] Previous: January 2025, Absence: 17.00h
[MonthlyReset] Current: February 2025
[Dashboard] Monthly reset completed: {
  wasReset: true,
  message: 'Absence records reset for new month: February 2025',
  previousMonth: 0,
  previousYear: 2025,
  currentMonth: 1,
  currentYear: 2025
}
```

### No Reset Needed

```
[MonthlyReset] Same month (February 2025), no reset needed
[Dashboard] No monthly reset needed
```

### First Time Initialization

```
[MonthlyReset] Initializing absence tracking for first time
```

## Verification Checklist

- [ ] Reset occurs automatically when month changes
- [ ] Notification appears on Dashboard
- [ ] Absence hours reset to 0
- [ ] Console logs show correct previous and current month
- [ ] Settings screen shows 0 absence hours after reset
- [ ] New absence can be logged in new month
- [ ] Efficiency calculations are correct after reset
- [ ] No duplicate resets occur
- [ ] No errors in console
- [ ] App remains stable after reset

## Troubleshooting

### Reset Not Happening

**Check:**
- Is the device date correct?
- Are you opening the Dashboard, Jobs, or Settings screen?
- Check console logs for errors
- Verify `absenceMonth` and `absenceYear` in AsyncStorage

**Fix:**
```typescript
// Force reset manually (temporary code)
await MonthlyResetService.forceReset();
```

### Duplicate Notifications

**Check:**
- Are you navigating between screens rapidly?
- Is the notification being triggered multiple times?

**Fix:**
- Notification only shows on Dashboard
- Other screens check silently

### Absence Hours Not Resetting

**Check:**
- Verify the reset function is being called
- Check console logs for errors
- Inspect AsyncStorage data

**Fix:**
```typescript
// Check current status
const status = await MonthlyResetService.getAbsenceTrackingStatus();
console.log('Status:', status);
```

## Manual Testing Script

For comprehensive testing, follow this sequence:

```
1. Fresh Start
   - Clear app data
   - Open app
   - Sign in
   - Verify no absence data

2. Log Absence
   - Go to Settings
   - Log 2 full days (17 hours)
   - Verify it's saved
   - Check Dashboard efficiency

3. Simulate Month Change
   - Close app
   - Change device date to next month
   - Open app
   - Verify reset notification
   - Check absence hours = 0

4. Log New Month Absence
   - Go to Settings
   - Log 1 full day (8.5 hours)
   - Verify it's tracked for new month
   - Check Dashboard efficiency

5. Navigate Between Screens
   - Dashboard → Jobs → Settings → Dashboard
   - Verify no duplicate resets
   - Verify data consistency

6. Restore Date
   - Change device date back to current
   - Verify app still works correctly
```

## Success Criteria

The feature is working correctly if:

1. ✅ Absence records reset automatically each new month
2. ✅ User is notified of the reset (Dashboard only)
3. ✅ Previous month's data is logged for reference
4. ✅ New absence can be logged immediately after reset
5. ✅ Efficiency calculations are accurate
6. ✅ No crashes or errors occur
7. ✅ Reset happens exactly once per month transition
8. ✅ All screens show consistent data

## Notes

- The reset is designed to be transparent and automatic
- Users don't need to do anything manually
- The feature works across app restarts
- Data is preserved in AsyncStorage
- Console logs provide detailed debugging information
