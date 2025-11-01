
# Monthly Reset Service API Documentation

## Import

```typescript
import { MonthlyResetService } from '../utils/monthlyReset';
```

## Methods

### `checkAndResetIfNewMonth()`

Checks if we're in a new month and resets absence records if needed.

**Returns:** `Promise<ResetResult>`

```typescript
interface ResetResult {
  wasReset: boolean;
  message: string;
  previousMonth?: number;
  previousYear?: number;
  currentMonth: number;
  currentYear: number;
}
```

**Example:**

```typescript
const result = await MonthlyResetService.checkAndResetIfNewMonth();

if (result.wasReset) {
  console.log(`Reset occurred! ${result.message}`);
  console.log(`Previous: ${result.previousMonth}/${result.previousYear}`);
  console.log(`Current: ${result.currentMonth}/${result.currentYear}`);
} else {
  console.log('No reset needed - same month');
}
```

**Use Cases:**
- Call when app loads
- Call when screens are focused
- Call before displaying absence-related data

---

### `getCurrentMonthAbsenceHours()`

Gets the absence hours for the current month only. Returns 0 if stored month differs from current month.

**Returns:** `Promise<number>`

**Example:**

```typescript
const absenceHours = await MonthlyResetService.getCurrentMonthAbsenceHours();
console.log(`Current month absence: ${absenceHours} hours`);

// Use in calculations
const efficiency = calculateEfficiency(totalAWs, month, year, absenceHours);
```

**Use Cases:**
- Getting current absence hours for calculations
- Displaying current month's absence in UI
- Validating absence data before operations

---

### `forceReset()`

Manually resets absence records to 0 for the current month. Useful for testing or manual reset operations.

**Returns:** `Promise<void>`

**Example:**

```typescript
// Force reset (e.g., for testing or user-requested reset)
await MonthlyResetService.forceReset();
console.log('Absence records have been reset');

// Reload data
await loadJobs();
```

**Use Cases:**
- Testing the reset functionality
- Providing a manual reset button in settings
- Recovering from data inconsistencies

---

### `getAbsenceTrackingStatus()`

Gets comprehensive status information about absence tracking.

**Returns:** `Promise<AbsenceStatus>`

```typescript
interface AbsenceStatus {
  currentMonth: number;
  currentYear: number;
  trackedMonth: number | undefined;
  trackedYear: number | undefined;
  absenceHours: number;
  isCurrentMonth: boolean;
  monthName: string;
}
```

**Example:**

```typescript
const status = await MonthlyResetService.getAbsenceTrackingStatus();

console.log(`Current: ${status.monthName} ${status.currentYear}`);
console.log(`Tracked: ${status.trackedMonth}/${status.trackedYear}`);
console.log(`Absence Hours: ${status.absenceHours}`);
console.log(`Is Current Month: ${status.isCurrentMonth}`);

if (!status.isCurrentMonth) {
  console.log('⚠️ Absence data is from a different month!');
}
```

**Use Cases:**
- Debugging absence tracking issues
- Displaying detailed status in settings
- Validating data consistency
- Building admin/debug panels

---

### `getMonthName(month: number)`

Converts month number (0-11) to month name.

**Parameters:**
- `month` (number): Month number (0 = January, 11 = December)

**Returns:** `string`

**Example:**

```typescript
const monthName = MonthlyResetService.getMonthName(0);  // "January"
const currentMonthName = MonthlyResetService.getMonthName(new Date().getMonth());
console.log(`Current month: ${currentMonthName}`);
```

**Use Cases:**
- Displaying month names in UI
- Formatting dates for notifications
- Building month selectors

---

## Integration Examples

### Dashboard Integration

```typescript
// app/dashboard.tsx
const checkMonthlyReset = useCallback(async () => {
  try {
    const resetResult = await MonthlyResetService.checkAndResetIfNewMonth();
    
    if (resetResult.wasReset) {
      const previousMonthName = MonthlyResetService.getMonthName(resetResult.previousMonth || 0);
      const currentMonthName = MonthlyResetService.getMonthName(resetResult.currentMonth);
      
      showNotification(
        `🗓️ New month detected!\n\nAbsence records have been automatically reset for ${currentMonthName} ${resetResult.currentYear}.\n\nPrevious month: ${previousMonthName} ${resetResult.previousYear}`,
        'success'
      );
    }
  } catch (error) {
    console.log('Error checking monthly reset:', error);
  }
}, [showNotification]);

// Call on load
useEffect(() => {
  checkMonthlyReset();
}, [checkMonthlyReset]);
```

### Settings Integration (Silent)

```typescript
// app/settings.tsx
const checkAuthAndLoadData = useCallback(async () => {
  try {
    const settings = await StorageService.getSettings();
    if (!settings.isAuthenticated) {
      router.replace('/auth');
      return;
    }
    
    // Silent reset check
    try {
      await MonthlyResetService.checkAndResetIfNewMonth();
    } catch (resetError) {
      console.log('Error checking monthly reset:', resetError);
      // Don't block loading if reset check fails
    }
    
    await loadData();
  } catch (error) {
    console.log('Error checking auth:', error);
    router.replace('/auth');
  }
}, [loadData]);
```

### Calculations Integration

```typescript
// utils/calculations.ts
export const CalculationService = {
  async calculateMonthlyStats(jobs: Job[], targetHours: number = 180): Promise<MonthlyStats> {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Get current month's absence hours (automatically handles month changes)
    const absenceHours = await MonthlyResetService.getCurrentMonthAbsenceHours();
    
    // ... rest of calculation logic
    const totalAvailableHours = this.calculateAvailableHoursToDate(
      currentMonth, 
      currentYear, 
      absenceHours
    );
    
    // ... return stats
  }
};
```

### Custom Reset Button (Optional)

```typescript
// app/settings.tsx
const handleManualReset = useCallback(async () => {
  Alert.alert(
    'Reset Absence Records',
    'This will reset all absence hours for the current month to 0. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            await MonthlyResetService.forceReset();
            showNotification('Absence records reset successfully', 'success');
            await loadData();
          } catch (error) {
            console.log('Error resetting:', error);
            showNotification('Error resetting absence records', 'error');
          }
        }
      }
    ]
  );
}, [showNotification, loadData]);

// In render:
<TouchableOpacity 
  style={styles.resetButton} 
  onPress={handleManualReset}
>
  <Text style={styles.buttonText}>🔄 Reset Absence Records</Text>
</TouchableOpacity>
```

### Status Display (Debug/Admin)

```typescript
// app/settings.tsx or debug screen
const [absenceStatus, setAbsenceStatus] = useState<any>(null);

useEffect(() => {
  const loadStatus = async () => {
    const status = await MonthlyResetService.getAbsenceTrackingStatus();
    setAbsenceStatus(status);
  };
  loadStatus();
}, []);

// In render:
{absenceStatus && (
  <View style={styles.statusCard}>
    <Text style={styles.statusTitle}>Absence Tracking Status</Text>
    <Text>Current Month: {absenceStatus.monthName} {absenceStatus.currentYear}</Text>
    <Text>Tracked Month: {absenceStatus.trackedMonth}/{absenceStatus.trackedYear}</Text>
    <Text>Absence Hours: {absenceStatus.absenceHours}h</Text>
    <Text>Is Current: {absenceStatus.isCurrentMonth ? '✅' : '❌'}</Text>
  </View>
)}
```

## Error Handling

All methods include try-catch blocks and log errors to console. Recommended error handling:

```typescript
try {
  const result = await MonthlyResetService.checkAndResetIfNewMonth();
  // Handle result
} catch (error) {
  console.log('Monthly reset error:', error);
  // Don't block app functionality
  // Optionally show user-friendly error message
}
```

## Best Practices

1. **Call on App Load**: Always check for reset when app loads or screens focus
2. **Silent Checks**: Only show notifications on Dashboard, check silently elsewhere
3. **Error Handling**: Don't block app functionality if reset fails
4. **Console Logging**: Keep detailed logs for debugging
5. **User Communication**: Inform users when reset occurs (Dashboard only)
6. **Data Validation**: Always use `getCurrentMonthAbsenceHours()` for calculations
7. **Testing**: Use `forceReset()` for testing, not in production code

## Performance Considerations

- Reset check is fast (< 10ms typically)
- Uses AsyncStorage (local, no network calls)
- Safe to call multiple times (idempotent within same month)
- No impact on app startup time

## Debugging

Enable detailed logging:

```typescript
// Add to any screen for debugging
const debugAbsenceTracking = async () => {
  const status = await MonthlyResetService.getAbsenceTrackingStatus();
  console.log('=== Absence Tracking Debug ===');
  console.log('Current Month:', status.currentMonth, status.monthName);
  console.log('Current Year:', status.currentYear);
  console.log('Tracked Month:', status.trackedMonth);
  console.log('Tracked Year:', status.trackedYear);
  console.log('Absence Hours:', status.absenceHours);
  console.log('Is Current Month:', status.isCurrentMonth);
  console.log('============================');
};

// Call when needed
useEffect(() => {
  debugAbsenceTracking();
}, []);
```

## Summary

The Monthly Reset Service provides a simple, reliable API for managing absence records across month boundaries. It's designed to be:

- **Automatic**: Works without user intervention
- **Transparent**: Logs all operations
- **Safe**: Includes error handling
- **Flexible**: Can be used in multiple ways
- **Testable**: Includes force reset for testing
