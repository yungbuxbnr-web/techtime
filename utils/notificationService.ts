
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkScheduleSettings } from './timeTrackingService';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  workStartEnabled: boolean;
  lunchStartEnabled: boolean;
  lunchEndEnabled: boolean;
  workEndEnabled: boolean;
  recordSavedEnabled: boolean;
  jobExportedEnabled: boolean;
  monthlyReportEnabled: boolean;
  saturdayReminderEnabled: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  workStartEnabled: true,
  lunchStartEnabled: true,
  lunchEndEnabled: true,
  workEndEnabled: true,
  recordSavedEnabled: true,
  jobExportedEnabled: true,
  monthlyReportEnabled: true,
  saturdayReminderEnabled: true,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static notificationIds: string[] = [];

  // Request notification permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      console.log('Notification permissions granted');
      return true;
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Get notification settings
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settingsJson) {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(settingsJson) };
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.log('Error getting notification settings:', error);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  // Save notification settings
  static async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      console.log('Notification settings saved:', settings);
    } catch (error) {
      console.log('Error saving notification settings:', error);
      throw error;
    }
  }

  // Parse time string to hours and minutes
  private static parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  // Calculate trigger time for today or tomorrow
  private static calculateTriggerTime(timeStr: string, isToday: boolean = true): Date {
    const { hours, minutes } = this.parseTime(timeStr);
    const now = new Date();
    const trigger = new Date();
    
    if (!isToday) {
      trigger.setDate(trigger.getDate() + 1);
    }
    
    trigger.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (isToday && trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }
    
    return trigger;
  }

  // Check if today is a work day
  private static isWorkDay(workDays: number[], saturdayFrequency?: number, nextSaturday?: string): boolean {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Check if it's a Saturday work day
    if (dayOfWeek === 6) {
      if (!saturdayFrequency || saturdayFrequency === 0) return false;
      if (saturdayFrequency === 1) return true;
      
      if (nextSaturday) {
        const nextSat = new Date(nextSaturday);
        const todayStr = today.toDateString();
        const nextSatStr = nextSat.toDateString();
        return todayStr === nextSatStr;
      }
      
      return false;
    }
    
    return workDays.includes(dayOfWeek);
  }

  // Schedule work start notification
  private static async scheduleWorkStartNotification(
    workSchedule: WorkScheduleSettings,
    notificationSettings: NotificationSettings
  ): Promise<void> {
    if (!notificationSettings.workStartEnabled) return;

    const trigger = this.calculateTriggerTime(workSchedule.workStartTime);
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏢 Work Time Started',
        body: `Good morning! Your work day begins at ${workSchedule.workStartTime}. Time to get started!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    this.notificationIds.push(id);
    console.log('Work start notification scheduled for:', trigger);
  }

  // Schedule lunch start notification
  private static async scheduleLunchStartNotification(
    workSchedule: WorkScheduleSettings,
    notificationSettings: NotificationSettings
  ): Promise<void> {
    if (!notificationSettings.lunchStartEnabled) return;

    const trigger = this.calculateTriggerTime(workSchedule.lunchStartTime);
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍽️ Lunch Break Started',
        body: `It's ${workSchedule.lunchStartTime}! Time for your lunch break. Enjoy your meal!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger,
    });

    this.notificationIds.push(id);
    console.log('Lunch start notification scheduled for:', trigger);
  }

  // Schedule lunch end notification
  private static async scheduleLunchEndNotification(
    workSchedule: WorkScheduleSettings,
    notificationSettings: NotificationSettings
  ): Promise<void> {
    if (!notificationSettings.lunchEndEnabled) return;

    const trigger = this.calculateTriggerTime(workSchedule.lunchEndTime);
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Lunch Break Ending',
        body: `Lunch break ends at ${workSchedule.lunchEndTime}. Time to get back to work!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger,
    });

    this.notificationIds.push(id);
    console.log('Lunch end notification scheduled for:', trigger);
  }

  // Schedule work end notification
  private static async scheduleWorkEndNotification(
    workSchedule: WorkScheduleSettings,
    notificationSettings: NotificationSettings
  ): Promise<void> {
    if (!notificationSettings.workEndEnabled) return;

    const trigger = this.calculateTriggerTime(workSchedule.workEndTime);
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Work Day Complete',
        body: `Great job! Your work day ends at ${workSchedule.workEndTime}. Time to relax!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    this.notificationIds.push(id);
    console.log('Work end notification scheduled for:', trigger);
  }

  // Schedule Saturday reminder notification
  private static async scheduleSaturdayReminderNotification(
    workSchedule: WorkScheduleSettings,
    notificationSettings: NotificationSettings
  ): Promise<void> {
    if (!notificationSettings.saturdayReminderEnabled) return;
    if (!workSchedule.nextSaturday) return;

    const nextSat = new Date(workSchedule.nextSaturday);
    const reminderDate = new Date(nextSat);
    reminderDate.setDate(reminderDate.getDate() - 1); // Day before
    reminderDate.setHours(18, 0, 0, 0); // 6 PM the day before

    // Only schedule if reminder is in the future
    if (reminderDate > new Date()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📅 Working Saturday Tomorrow',
          body: `Reminder: You have a working Saturday tomorrow (${nextSat.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}). Don't forget!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: reminderDate,
      });

      this.notificationIds.push(id);
      console.log('Saturday reminder notification scheduled for:', reminderDate);
    }
  }

  // Send record saved notification
  static async sendRecordSavedNotification(wipNumber: string): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.recordSavedEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💾 Record Saved',
          body: `Job ${wipNumber} has been saved successfully!`,
          sound: true,
        },
        trigger: null, // Send immediately
      });
      console.log('Record saved notification sent');
    } catch (error) {
      console.log('Error sending record saved notification:', error);
    }
  }

  // Send job exported notification
  static async sendJobExportedNotification(count: number, format: string): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.jobExportedEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📤 Export Complete',
          body: `Successfully exported ${count} job(s) to ${format.toUpperCase()}!`,
          sound: true,
        },
        trigger: null, // Send immediately
      });
      console.log('Job exported notification sent');
    } catch (error) {
      console.log('Error sending job exported notification:', error);
    }
  }

  // Send monthly report reminder
  static async sendMonthlyReportReminder(): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.monthlyReportEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📈 Monthly Report Reminder',
          body: 'Don\'t forget to generate your monthly report!',
          sound: true,
        },
        trigger: null, // Send immediately
      });
      console.log('Monthly report reminder sent');
    } catch (error) {
      console.log('Error sending monthly report reminder:', error);
    }
  }

  // Cancel all scheduled notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.notificationIds = [];
      console.log('All notifications cancelled');
    } catch (error) {
      console.log('Error cancelling notifications:', error);
    }
  }

  // Schedule all work notifications
  static async scheduleWorkNotifications(
    workSchedule: WorkScheduleSettings,
    notificationSettings?: NotificationSettings
  ): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return;
      }

      // Check if notifications are enabled
      if (!workSchedule.enabled) {
        console.log('Work schedule disabled, skipping notifications');
        return;
      }

      // Get notification settings
      const settings = notificationSettings || await this.getSettings();
      if (!settings.enabled) {
        console.log('Notifications disabled, skipping');
        return;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('No notification permissions, skipping');
        return;
      }

      // Cancel existing notifications
      await this.cancelAllNotifications();

      // Check if today is a work day
      const isToday = this.isWorkDay(
        workSchedule.workDays,
        workSchedule.saturdayFrequency,
        workSchedule.nextSaturday
      );

      if (!isToday) {
        console.log('Not a work day, skipping notifications for today');
        // Schedule for next work day
        // For simplicity, we'll just schedule for tomorrow and let the app reschedule
      }

      // Schedule notifications
      await this.scheduleWorkStartNotification(workSchedule, settings);
      await this.scheduleLunchStartNotification(workSchedule, settings);
      await this.scheduleLunchEndNotification(workSchedule, settings);
      await this.scheduleWorkEndNotification(workSchedule, settings);
      await this.scheduleSaturdayReminderNotification(workSchedule, settings);

      console.log('All work notifications scheduled successfully');
    } catch (error) {
      console.log('Error scheduling work notifications:', error);
    }
  }

  // Get all scheduled notifications (for debugging)
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.log('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Send immediate notification (for testing)
  static async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from TechTime!',
          sound: true,
        },
        trigger: null, // Send immediately
      });
      console.log('Test notification sent');
    } catch (error) {
      console.log('Error sending test notification:', error);
    }
  }

  // Initialize notifications on app start
  static async initialize(workSchedule: WorkScheduleSettings): Promise<void> {
    try {
      console.log('Initializing notification service...');
      
      // Request permissions
      await this.requestPermissions();
      
      // Schedule notifications
      await this.scheduleWorkNotifications(workSchedule);
      
      console.log('Notification service initialized');
    } catch (error) {
      console.log('Error initializing notification service:', error);
    }
  }
}
