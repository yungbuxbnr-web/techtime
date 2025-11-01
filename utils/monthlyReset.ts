
import { StorageService } from './storage';
import { AppSettings } from '../types';

/**
 * Monthly Reset Service
 * Automatically resets absence records when a new month is detected
 */
export const MonthlyResetService = {
  /**
   * Check if we're in a new month and reset absence records if needed
   * This should be called when the app loads or when the dashboard is focused
   */
  async checkAndResetIfNewMonth(): Promise<{
    wasReset: boolean;
    message: string;
    previousMonth?: number;
    previousYear?: number;
    currentMonth: number;
    currentYear: number;
  }> {
    try {
      const settings = await StorageService.getSettings();
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Check if absence tracking has been initialized
      const hasAbsenceTracking = settings.absenceMonth !== undefined && settings.absenceYear !== undefined;

      if (!hasAbsenceTracking) {
        // First time - initialize absence tracking for current month
        console.log('[MonthlyReset] Initializing absence tracking for first time');
        const updatedSettings: AppSettings = {
          ...settings,
          absenceMonth: currentMonth,
          absenceYear: currentYear,
          absenceHours: 0,
        };
        await StorageService.saveSettings(updatedSettings);
        
        return {
          wasReset: false,
          message: 'Absence tracking initialized',
          currentMonth,
          currentYear,
        };
      }

      // Check if we're in a new month
      const isNewMonth = settings.absenceMonth !== currentMonth || settings.absenceYear !== currentYear;

      if (isNewMonth) {
        // New month detected - reset absence hours
        const previousMonth = settings.absenceMonth;
        const previousYear = settings.absenceYear;
        const previousAbsenceHours = settings.absenceHours || 0;

        console.log(`[MonthlyReset] New month detected! Resetting absence records.`);
        console.log(`[MonthlyReset] Previous: ${this.getMonthName(previousMonth || 0)} ${previousYear}, Absence: ${previousAbsenceHours.toFixed(2)}h`);
        console.log(`[MonthlyReset] Current: ${this.getMonthName(currentMonth)} ${currentYear}`);

        const updatedSettings: AppSettings = {
          ...settings,
          absenceMonth: currentMonth,
          absenceYear: currentYear,
          absenceHours: 0, // Reset absence hours for new month
        };
        await StorageService.saveSettings(updatedSettings);

        return {
          wasReset: true,
          message: `Absence records reset for new month: ${this.getMonthName(currentMonth)} ${currentYear}`,
          previousMonth: previousMonth || 0,
          previousYear: previousYear || currentYear,
          currentMonth,
          currentYear,
        };
      }

      // Same month - no reset needed
      console.log(`[MonthlyReset] Same month (${this.getMonthName(currentMonth)} ${currentYear}), no reset needed`);
      return {
        wasReset: false,
        message: 'No reset needed - same month',
        currentMonth,
        currentYear,
      };
    } catch (error) {
      console.log('[MonthlyReset] Error checking/resetting month:', error);
      throw error;
    }
  },

  /**
   * Get the current absence hours for the current month
   * Returns 0 if we're in a different month than what's stored
   */
  async getCurrentMonthAbsenceHours(): Promise<number> {
    try {
      const settings = await StorageService.getSettings();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // If the stored month/year matches current month/year, return absence hours
      if (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) {
        return settings.absenceHours || 0;
      }

      // Different month - return 0
      return 0;
    } catch (error) {
      console.log('[MonthlyReset] Error getting current month absence hours:', error);
      return 0;
    }
  },

  /**
   * Force reset absence records (for testing or manual reset)
   */
  async forceReset(): Promise<void> {
    try {
      const settings = await StorageService.getSettings();
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const updatedSettings: AppSettings = {
        ...settings,
        absenceMonth: currentMonth,
        absenceYear: currentYear,
        absenceHours: 0,
      };
      await StorageService.saveSettings(updatedSettings);
      console.log('[MonthlyReset] Forced reset completed');
    } catch (error) {
      console.log('[MonthlyReset] Error forcing reset:', error);
      throw error;
    }
  },

  /**
   * Get month name from month number (0-11)
   */
  getMonthName(month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month] || 'Unknown';
  },

  /**
   * Get a summary of the current absence tracking status
   */
  async getAbsenceTrackingStatus(): Promise<{
    currentMonth: number;
    currentYear: number;
    trackedMonth: number | undefined;
    trackedYear: number | undefined;
    absenceHours: number;
    isCurrentMonth: boolean;
    monthName: string;
  }> {
    try {
      const settings = await StorageService.getSettings();
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const isCurrentMonth = settings.absenceMonth === currentMonth && settings.absenceYear === currentYear;

      return {
        currentMonth,
        currentYear,
        trackedMonth: settings.absenceMonth,
        trackedYear: settings.absenceYear,
        absenceHours: settings.absenceHours || 0,
        isCurrentMonth,
        monthName: this.getMonthName(currentMonth),
      };
    } catch (error) {
      console.log('[MonthlyReset] Error getting absence tracking status:', error);
      throw error;
    }
  },
};
