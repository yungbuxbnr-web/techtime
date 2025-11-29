
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { TimeTrackingService } from './timeTrackingService';
import { NotificationService } from './notificationService';

const BACKGROUND_FETCH_TASK = 'background-fetch-task';
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

/**
 * Define background fetch task
 * This runs periodically in the background to update time tracking
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('[Background] Running background fetch task...');
    
    // Get work schedule settings
    const settings = await TimeTrackingService.getSettings();
    
    if (settings.enabled) {
      // Check if we need to reschedule notifications
      const now = new Date();
      const isWorkDay = TimeTrackingService['isWorkDay'](
        settings.workDays,
        settings.saturdayFrequency,
        settings.nextSaturday
      );
      
      if (isWorkDay) {
        console.log('[Background] Work day detected, ensuring notifications are scheduled');
        await NotificationService.scheduleWorkNotifications(settings);
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.log('[Background] Error in background fetch task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundFetchAsync() {
  try {
    console.log('[Background] Registering background fetch task...');
    
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    if (isRegistered) {
      console.log('[Background] Task already registered');
      return { success: true, message: 'Background fetch already registered' };
    }
    
    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('[Background] Background fetch task registered successfully');
    return { success: true, message: 'Background fetch registered successfully' };
  } catch (error) {
    console.log('[Background] Error registering background fetch:', error);
    return { 
      success: false, 
      message: `Failed to register background fetch: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundFetchAsync() {
  try {
    console.log('[Background] Unregistering background fetch task...');
    
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    
    console.log('[Background] Background fetch task unregistered');
    return { success: true, message: 'Background fetch unregistered' };
  } catch (error) {
    console.log('[Background] Error unregistering background fetch:', error);
    return { 
      success: false, 
      message: `Failed to unregister background fetch: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Get background fetch status
 */
export async function getBackgroundFetchStatus() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    let statusText = 'Unknown';
    switch (status) {
      case BackgroundFetch.BackgroundFetchStatus.Available:
        statusText = 'Available';
        break;
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        statusText = 'Denied';
        break;
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        statusText = 'Restricted';
        break;
    }
    
    return {
      success: true,
      status: statusText,
      isRegistered,
      message: `Background fetch is ${statusText}. Task ${isRegistered ? 'is' : 'is not'} registered.`
    };
  } catch (error) {
    console.log('[Background] Error getting background fetch status:', error);
    return {
      success: false,
      status: 'Unknown',
      isRegistered: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Initialize background tasks
 * Call this when the app starts
 */
export async function initializeBackgroundTasks() {
  try {
    console.log('[Background] Initializing background tasks...');
    
    // Register background fetch
    const fetchResult = await registerBackgroundFetchAsync();
    console.log('[Background] Background fetch registration:', fetchResult.message);
    
    // Get initial status
    const status = await getBackgroundFetchStatus();
    console.log('[Background] Background fetch status:', status.message);
    
    return {
      success: true,
      message: 'Background tasks initialized successfully'
    };
  } catch (error) {
    console.log('[Background] Error initializing background tasks:', error);
    return {
      success: false,
      message: `Failed to initialize background tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
