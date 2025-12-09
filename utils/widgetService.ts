
import { NativeModules, Platform } from 'react-native';

const { WidgetModule } = NativeModules;

/**
 * Widget Service
 * 
 * Provides methods to update the Android home screen widget with efficiency data.
 */
export const WidgetService = {
  /**
   * Update the widget with current efficiency data
   * 
   * @param efficiency - Efficiency percentage (0-100)
   * @param soldHours - Total sold hours
   * @param availableHours - Total available hours
   * @param totalAws - Total AWs
   */
  updateWidget(
    efficiency: number,
    soldHours: number,
    availableHours: number,
    totalAws: number
  ): void {
    if (Platform.OS !== 'android') {
      console.log('[WidgetService] Widget updates are only supported on Android');
      return;
    }

    if (!WidgetModule) {
      console.log('[WidgetService] WidgetModule not available');
      return;
    }

    try {
      WidgetModule.updateWidget(
        Math.round(efficiency),
        soldHours,
        availableHours,
        totalAws
      );
      console.log('[WidgetService] Widget updated successfully:', {
        efficiency: Math.round(efficiency),
        soldHours: soldHours.toFixed(2),
        availableHours: availableHours.toFixed(2),
        totalAws,
      });
    } catch (error) {
      console.log('[WidgetService] Error updating widget:', error);
    }
  },

  /**
   * Check if widget module is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && WidgetModule !== undefined;
  },
};
