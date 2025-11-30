
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSIONS_REQUESTED_KEY = 'permissions_requested';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export interface AllPermissionsStatus {
  notifications: PermissionStatus;
  backgroundFetch: PermissionStatus;
  mediaLibrary: PermissionStatus;
}

/**
 * Permissions Service
 * Handles all app permissions including notifications, background execution, and storage
 */
export class PermissionsService {
  
  /**
   * Request notification permissions
   */
  static async requestNotificationPermissions(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        console.log('[Permissions] Notifications not supported on web');
        return {
          granted: false,
          canAskAgain: false,
          status: 'unsupported'
        };
      }

      console.log('[Permissions] Requesting notification permissions...');
      
      const { status: existingStatus, canAskAgain: existingCanAskAgain } = 
        await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      let canAskAgain = existingCanAskAgain;

      if (existingStatus !== 'granted') {
        const { status, canAskAgain: newCanAskAgain } = 
          await Notifications.requestPermissionsAsync();
        finalStatus = status;
        canAskAgain = newCanAskAgain;
      }

      const granted = finalStatus === 'granted';
      
      console.log('[Permissions] Notification permissions:', {
        granted,
        status: finalStatus,
        canAskAgain
      });

      return {
        granted,
        canAskAgain,
        status: finalStatus
      };
    } catch (error) {
      console.log('[Permissions] Error requesting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'error'
      };
    }
  }

  /**
   * Request background fetch permissions
   * Note: Background fetch doesn't require explicit user permission on iOS/Android
   * but we check if it's available and enabled
   */
  static async requestBackgroundFetchPermissions(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        console.log('[Permissions] Background fetch not supported on web');
        return {
          granted: false,
          canAskAgain: false,
          status: 'unsupported'
        };
      }

      console.log('[Permissions] Checking background fetch availability...');
      
      const status = await BackgroundFetch.getStatusAsync();
      
      let statusText = 'unknown';
      let granted = false;
      let canAskAgain = false;

      switch (status) {
        case BackgroundFetch.BackgroundFetchStatus.Available:
          statusText = 'available';
          granted = true;
          canAskAgain = false;
          break;
        case BackgroundFetch.BackgroundFetchStatus.Denied:
          statusText = 'denied';
          granted = false;
          canAskAgain = false;
          break;
        case BackgroundFetch.BackgroundFetchStatus.Restricted:
          statusText = 'restricted';
          granted = false;
          canAskAgain = false;
          break;
      }

      console.log('[Permissions] Background fetch status:', {
        granted,
        status: statusText,
        canAskAgain
      });

      return {
        granted,
        canAskAgain,
        status: statusText
      };
    } catch (error) {
      console.log('[Permissions] Error checking background fetch permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'error'
      };
    }
  }

  /**
   * Request media library (storage) permissions
   */
  static async requestMediaLibraryPermissions(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        console.log('[Permissions] Media library not required on web');
        return {
          granted: true,
          canAskAgain: false,
          status: 'granted'
        };
      }

      console.log('[Permissions] Requesting media library permissions...');
      
      const { status: existingStatus, canAskAgain: existingCanAskAgain } = 
        await MediaLibrary.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      let canAskAgain = existingCanAskAgain;

      if (existingStatus !== 'granted') {
        const { status, canAskAgain: newCanAskAgain } = 
          await MediaLibrary.requestPermissionsAsync();
        finalStatus = status;
        canAskAgain = newCanAskAgain;
      }

      const granted = finalStatus === 'granted';
      
      console.log('[Permissions] Media library permissions:', {
        granted,
        status: finalStatus,
        canAskAgain
      });

      return {
        granted,
        canAskAgain,
        status: finalStatus
      };
    } catch (error) {
      console.log('[Permissions] Error requesting media library permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'error'
      };
    }
  }

  /**
   * Request all permissions at once
   */
  static async requestAllPermissions(): Promise<AllPermissionsStatus> {
    console.log('[Permissions] Requesting all permissions...');
    
    const [notifications, backgroundFetch, mediaLibrary] = await Promise.all([
      this.requestNotificationPermissions(),
      this.requestBackgroundFetchPermissions(),
      this.requestMediaLibraryPermissions()
    ]);

    const allPermissions = {
      notifications,
      backgroundFetch,
      mediaLibrary
    };

    console.log('[Permissions] All permissions status:', allPermissions);
    
    return allPermissions;
  }

  /**
   * Check all permissions status without requesting
   */
  static async checkAllPermissions(): Promise<AllPermissionsStatus> {
    try {
      if (Platform.OS === 'web') {
        return {
          notifications: { granted: false, canAskAgain: false, status: 'unsupported' },
          backgroundFetch: { granted: false, canAskAgain: false, status: 'unsupported' },
          mediaLibrary: { granted: true, canAskAgain: false, status: 'granted' }
        };
      }

      const [notificationStatus, backgroundStatus, mediaStatus] = await Promise.all([
        Notifications.getPermissionsAsync(),
        BackgroundFetch.getStatusAsync(),
        MediaLibrary.getPermissionsAsync()
      ]);

      const notifications: PermissionStatus = {
        granted: notificationStatus.status === 'granted',
        canAskAgain: notificationStatus.canAskAgain,
        status: notificationStatus.status
      };

      const backgroundFetch: PermissionStatus = {
        granted: backgroundStatus === BackgroundFetch.BackgroundFetchStatus.Available,
        canAskAgain: false,
        status: backgroundStatus === BackgroundFetch.BackgroundFetchStatus.Available 
          ? 'available' 
          : backgroundStatus === BackgroundFetch.BackgroundFetchStatus.Denied 
            ? 'denied' 
            : 'restricted'
      };

      const mediaLibrary: PermissionStatus = {
        granted: mediaStatus.status === 'granted',
        canAskAgain: mediaStatus.canAskAgain,
        status: mediaStatus.status
      };

      return {
        notifications,
        backgroundFetch,
        mediaLibrary
      };
    } catch (error) {
      console.log('[Permissions] Error checking permissions:', error);
      return {
        notifications: { granted: false, canAskAgain: false, status: 'error' },
        backgroundFetch: { granted: false, canAskAgain: false, status: 'error' },
        mediaLibrary: { granted: false, canAskAgain: false, status: 'error' }
      };
    }
  }

  /**
   * Show permission explanation dialog
   */
  static showPermissionExplanation(
    permissionType: 'notifications' | 'background' | 'storage' | 'all'
  ): void {
    let title = '';
    let message = '';

    switch (permissionType) {
      case 'notifications':
        title = '🔔 Notification Permission';
        message = 'TechTime needs notification permission to:\n\n' +
          '• Send work schedule reminders\n' +
          '• Notify you about work start/end times\n' +
          '• Alert you about lunch breaks\n' +
          '• Confirm when records are saved\n' +
          '• Remind you about Saturday work days\n\n' +
          'You can customize which notifications you receive in Settings.';
        break;
      
      case 'background':
        title = '⏰ Background Execution';
        message = 'TechTime needs background execution permission to:\n\n' +
          '• Keep time tracking accurate\n' +
          '• Send scheduled notifications on time\n' +
          '• Update work schedule automatically\n' +
          '• Maintain notification schedules\n\n' +
          'This ensures you never miss important work reminders.';
        break;
      
      case 'storage':
        title = '💾 Storage Permission';
        message = 'TechTime needs storage permission to:\n\n' +
          '• Save exported PDF reports\n' +
          '• Save exported Excel files\n' +
          '• Store job records securely\n' +
          '• Import job data from files\n\n' +
          'Your data stays on your device and is never shared.';
        break;
      
      case 'all':
        title = '🔐 App Permissions';
        message = 'TechTime needs the following permissions:\n\n' +
          '🔔 Notifications - For work reminders and alerts\n' +
          '⏰ Background Execution - For accurate time tracking\n' +
          '💾 Storage - To save and import job records\n\n' +
          'All permissions are optional, but recommended for the best experience.\n\n' +
          'Your data is stored locally and never shared.';
        break;
    }

    Alert.alert(title, message, [{ text: 'Got it', style: 'default' }]);
  }

  /**
   * Show settings redirect dialog for denied permissions
   */
  static showSettingsRedirectDialog(
    permissionType: 'notifications' | 'background' | 'storage'
  ): void {
    let title = '';
    let message = '';

    switch (permissionType) {
      case 'notifications':
        title = 'Notification Permission Denied';
        message = 'Notification permission is required for work reminders and alerts.\n\n' +
          'Please enable notifications in your device settings.';
        break;
      
      case 'background':
        title = 'Background Execution Restricted';
        message = 'Background execution is restricted on your device.\n\n' +
          'This may affect time tracking and notification delivery.\n\n' +
          'Please check your device settings.';
        break;
      
      case 'storage':
        title = 'Storage Permission Denied';
        message = 'Storage permission is required to save and import job records.\n\n' +
          'Please enable storage access in your device settings.';
        break;
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        }
      ]
    );
  }

  /**
   * Request permissions with user-friendly flow
   */
  static async requestPermissionsWithExplanation(): Promise<AllPermissionsStatus> {
    // Show explanation first
    return new Promise((resolve) => {
      Alert.alert(
        '🔐 App Permissions',
        'TechTime needs a few permissions to work properly:\n\n' +
        '🔔 Notifications - Work reminders and alerts\n' +
        '⏰ Background Execution - Accurate time tracking\n' +
        '💾 Storage - Save and import job records\n\n' +
        'All permissions are optional but recommended.\n\n' +
        'Your data stays on your device and is never shared.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              const status = await this.checkAllPermissions();
              resolve(status);
            }
          },
          {
            text: 'Continue',
            onPress: async () => {
              const status = await this.requestAllPermissions();
              
              // Show results
              const deniedPermissions: string[] = [];
              if (!status.notifications.granted && Platform.OS !== 'web') {
                deniedPermissions.push('Notifications');
              }
              if (!status.backgroundFetch.granted && Platform.OS !== 'web') {
                deniedPermissions.push('Background Execution');
              }
              if (!status.mediaLibrary.granted && Platform.OS !== 'web') {
                deniedPermissions.push('Storage');
              }

              if (deniedPermissions.length > 0) {
                Alert.alert(
                  'Some Permissions Denied',
                  `The following permissions were not granted:\n\n${deniedPermissions.join('\n')}\n\n` +
                  'You can enable them later in Settings to unlock all features.',
                  [{ text: 'OK', style: 'default' }]
                );
              } else if (Platform.OS !== 'web') {
                Alert.alert(
                  '✅ All Set!',
                  'All permissions granted successfully. You can now enjoy all features of TechTime!',
                  [{ text: 'Great!', style: 'default' }]
                );
              }

              resolve(status);
            }
          }
        ]
      );
    });
  }

  /**
   * Mark that permissions have been requested (for first-time setup)
   */
  static async markPermissionsRequested(): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
      console.log('[Permissions] Marked permissions as requested');
    } catch (error) {
      console.log('[Permissions] Error marking permissions as requested:', error);
    }
  }

  /**
   * Check if permissions have been requested before
   */
  static async havePermissionsBeenRequested(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(PERMISSIONS_REQUESTED_KEY);
      return value === 'true';
    } catch (error) {
      console.log('[Permissions] Error checking if permissions requested:', error);
      return false;
    }
  }

  /**
   * Request permissions on first app launch
   */
  static async requestPermissionsOnFirstLaunch(): Promise<void> {
    try {
      const alreadyRequested = await this.havePermissionsBeenRequested();
      
      if (!alreadyRequested && Platform.OS !== 'web') {
        console.log('[Permissions] First launch detected, requesting permissions...');
        await this.requestPermissionsWithExplanation();
        await this.markPermissionsRequested();
      } else {
        console.log('[Permissions] Permissions already requested or running on web');
      }
    } catch (error) {
      console.log('[Permissions] Error requesting permissions on first launch:', error);
    }
  }

  /**
   * Get permission summary for display
   */
  static async getPermissionSummary(): Promise<string> {
    const status = await this.checkAllPermissions();
    
    const lines: string[] = [];
    
    if (Platform.OS !== 'web') {
      lines.push(`🔔 Notifications: ${status.notifications.granted ? '✅ Granted' : '❌ Denied'}`);
      lines.push(`⏰ Background: ${status.backgroundFetch.granted ? '✅ Available' : '❌ Restricted'}`);
      lines.push(`💾 Storage: ${status.mediaLibrary.granted ? '✅ Granted' : '❌ Denied'}`);
    } else {
      lines.push('Running on web - permissions not applicable');
    }
    
    return lines.join('\n');
  }
}
