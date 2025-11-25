
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIME_TRACKING_KEY = 'time_tracking_settings';
const TIME_STATE_KEY = 'time_tracking_state';

export interface WorkScheduleSettings {
  workStartTime: string; // HH:mm format (e.g., "08:00")
  workEndTime: string; // HH:mm format (e.g., "17:00")
  lunchStartTime: string; // HH:mm format (e.g., "12:00")
  lunchEndTime: string; // HH:mm format (e.g., "13:00")
  workDays: number[]; // 0-6 (Sunday-Saturday)
  enabled: boolean;
  saturdayFrequency?: number; // 0 = never, 1 = every week, 2 = every 2 weeks, 3 = every 3 weeks, etc.
  nextSaturday?: string; // ISO date string of next working Saturday
}

export interface TimeTrackingState {
  currentSeconds: number; // Seconds since work start
  lastUpdateTimestamp: number; // Unix timestamp
  isWorkDay: boolean;
  isWorkTime: boolean;
  isLunchTime: boolean;
}

export interface TimeStats {
  totalWorkSeconds: number; // Total work seconds (excluding lunch)
  totalLunchSeconds: number; // Total lunch seconds
  elapsedWorkSeconds: number; // Elapsed work seconds
  elapsedLunchSeconds: number; // Elapsed lunch seconds
  remainingWorkSeconds: number; // Remaining work seconds
  remainingLunchSeconds: number; // Remaining lunch seconds
  progressPercentage: number; // Overall progress (0-100)
  workProgressPercentage: number; // Work progress (0-100)
  lunchProgressPercentage: number; // Lunch progress (0-100)
  currentTime: Date;
  workStartTime: Date;
  workEndTime: Date;
  lunchStartTime: Date;
  lunchEndTime: Date;
  isWorkDay: boolean;
  isWorkTime: boolean;
  isLunchTime: boolean;
}

const DEFAULT_SETTINGS: WorkScheduleSettings = {
  workStartTime: '08:00',
  workEndTime: '17:00',
  lunchStartTime: '12:00',
  lunchEndTime: '13:00',
  workDays: [1, 2, 3, 4, 5], // Monday-Friday
  enabled: true,
  saturdayFrequency: 0,
  nextSaturday: undefined,
};

export class TimeTrackingService {
  private static updateInterval: NodeJS.Timeout | null = null;
  private static listeners: Array<(stats: TimeStats) => void> = [];

  // Get settings
  static async getSettings(): Promise<WorkScheduleSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(TIME_TRACKING_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        return { ...DEFAULT_SETTINGS, ...settings };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.log('Error getting time tracking settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  // Save settings
  static async saveSettings(settings: WorkScheduleSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(TIME_TRACKING_KEY, JSON.stringify(settings));
      console.log('Time tracking settings saved:', settings);
    } catch (error) {
      console.log('Error saving time tracking settings:', error);
      throw error;
    }
  }

  // Parse time string to hours and minutes
  private static parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  // Create Date object for today with specific time
  private static createTimeToday(timeStr: string): Date {
    const { hours, minutes } = this.parseTime(timeStr);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Check if today is a Saturday work day based on frequency
  private static isSaturdayWorkDay(settings: WorkScheduleSettings): boolean {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Not Saturday
    if (dayOfWeek !== 6) return false;
    
    // No Saturday frequency set
    if (!settings.saturdayFrequency || settings.saturdayFrequency === 0) return false;
    
    // Every Saturday
    if (settings.saturdayFrequency === 1) return true;
    
    // Check if today matches the next Saturday
    if (settings.nextSaturday) {
      const nextSat = new Date(settings.nextSaturday);
      const todayStr = today.toDateString();
      const nextSatStr = nextSat.toDateString();
      return todayStr === nextSatStr;
    }
    
    return false;
  }

  // Check if current time is within work hours
  static isWorkTime(settings: WorkScheduleSettings): boolean {
    const now = new Date();
    const workStart = this.createTimeToday(settings.workStartTime);
    const workEnd = this.createTimeToday(settings.workEndTime);
    return now >= workStart && now <= workEnd;
  }

  // Check if current time is lunch time
  static isLunchTime(settings: WorkScheduleSettings): boolean {
    const now = new Date();
    const lunchStart = this.createTimeToday(settings.lunchStartTime);
    const lunchEnd = this.createTimeToday(settings.lunchEndTime);
    return now >= lunchStart && now <= lunchEnd;
  }

  // Check if today is a work day
  static isWorkDay(settings: WorkScheduleSettings): boolean {
    const today = new Date().getDay();
    
    // Check if it's a Saturday work day
    if (today === 6) {
      return this.isSaturdayWorkDay(settings);
    }
    
    // Check regular work days
    return settings.workDays.includes(today);
  }

  // Calculate time stats
  static calculateTimeStats(settings: WorkScheduleSettings): TimeStats {
    const now = new Date();
    const workStart = this.createTimeToday(settings.workStartTime);
    const workEnd = this.createTimeToday(settings.workEndTime);
    const lunchStart = this.createTimeToday(settings.lunchStartTime);
    const lunchEnd = this.createTimeToday(settings.lunchEndTime);

    const isWorkDay = this.isWorkDay(settings);
    const isWorkTime = this.isWorkTime(settings);
    const isLunchTime = this.isLunchTime(settings);

    // Calculate total work seconds (excluding lunch)
    const totalWorkMs = workEnd.getTime() - workStart.getTime();
    const lunchDurationMs = lunchEnd.getTime() - lunchStart.getTime();
    const totalWorkSeconds = (totalWorkMs - lunchDurationMs) / 1000;
    const totalLunchSeconds = lunchDurationMs / 1000;

    // Calculate elapsed seconds
    let elapsedWorkSeconds = 0;
    let elapsedLunchSeconds = 0;

    if (isWorkDay && now >= workStart) {
      if (now <= workEnd) {
        // Currently within work hours
        const elapsedMs = now.getTime() - workStart.getTime();
        
        if (now <= lunchStart) {
          // Before lunch
          elapsedWorkSeconds = elapsedMs / 1000;
        } else if (now <= lunchEnd) {
          // During lunch
          const workBeforeLunchMs = lunchStart.getTime() - workStart.getTime();
          elapsedWorkSeconds = workBeforeLunchMs / 1000;
          elapsedLunchSeconds = (now.getTime() - lunchStart.getTime()) / 1000;
        } else {
          // After lunch
          const workBeforeLunchMs = lunchStart.getTime() - workStart.getTime();
          const workAfterLunchMs = now.getTime() - lunchEnd.getTime();
          elapsedWorkSeconds = (workBeforeLunchMs + workAfterLunchMs) / 1000;
          elapsedLunchSeconds = totalLunchSeconds;
        }
      } else {
        // Work day ended
        elapsedWorkSeconds = totalWorkSeconds;
        elapsedLunchSeconds = totalLunchSeconds;
      }
    }

    // Calculate remaining seconds
    const remainingWorkSeconds = Math.max(0, totalWorkSeconds - elapsedWorkSeconds);
    const remainingLunchSeconds = Math.max(0, totalLunchSeconds - elapsedLunchSeconds);

    // Calculate progress percentages
    const workProgressPercentage = totalWorkSeconds > 0 
      ? Math.min(100, (elapsedWorkSeconds / totalWorkSeconds) * 100)
      : 0;
    
    const lunchProgressPercentage = totalLunchSeconds > 0
      ? Math.min(100, (elapsedLunchSeconds / totalLunchSeconds) * 100)
      : 0;

    const totalSeconds = totalWorkSeconds + totalLunchSeconds;
    const elapsedSeconds = elapsedWorkSeconds + elapsedLunchSeconds;
    const progressPercentage = totalSeconds > 0
      ? Math.min(100, (elapsedSeconds / totalSeconds) * 100)
      : 0;

    return {
      totalWorkSeconds,
      totalLunchSeconds,
      elapsedWorkSeconds,
      elapsedLunchSeconds,
      remainingWorkSeconds,
      remainingLunchSeconds,
      progressPercentage,
      workProgressPercentage,
      lunchProgressPercentage,
      currentTime: now,
      workStartTime: workStart,
      workEndTime: workEnd,
      lunchStartTime: lunchStart,
      lunchEndTime: lunchEnd,
      isWorkDay,
      isWorkTime,
      isLunchTime,
    };
  }

  // Format seconds to HH:mm:ss
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Format seconds to readable format (e.g., "2h 30m")
  static formatTimeReadable(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Start live tracking (updates every second)
  static startLiveTracking(callback: (stats: TimeStats) => void): void {
    // Add listener
    this.listeners.push(callback);

    // Start interval if not already running
    if (!this.updateInterval) {
      this.updateInterval = setInterval(async () => {
        const settings = await this.getSettings();
        if (settings.enabled) {
          const stats = this.calculateTimeStats(settings);
          // Notify all listeners
          this.listeners.forEach(listener => listener(stats));
        }
      }, 1000); // Update every second
      console.log('Live time tracking started');
    }
  }

  // Stop live tracking
  static stopLiveTracking(callback?: (stats: TimeStats) => void): void {
    if (callback) {
      // Remove specific listener
      this.listeners = this.listeners.filter(listener => listener !== callback);
    } else {
      // Remove all listeners
      this.listeners = [];
    }

    // Stop interval if no listeners
    if (this.listeners.length === 0 && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Live time tracking stopped');
    }
  }

  // Get current stats without starting live tracking
  static async getCurrentStats(): Promise<TimeStats> {
    const settings = await this.getSettings();
    return this.calculateTimeStats(settings);
  }

  // Get day name from day number
  static getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }

  // Get short day name from day number
  static getShortDayName(day: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  }
}
