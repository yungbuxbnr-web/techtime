
import { Stack, useGlobalSearchParams } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StorageService } from '../utils/storage';
import { ThemeProvider } from '../contexts/ThemeContext';
import { initializeBackgroundTasks } from '../utils/backgroundTasks';
import { PermissionsService } from '../utils/permissionsService';
import ErrorBoundary from '../components/ErrorBoundary';

const STORAGE_KEY = 'emulated_device';

function RootLayoutContent() {
  const actualInsets = useSafeAreaInsets();
  const { emulate } = useGlobalSearchParams<{ emulate?: string }>();
  const [storedEmulate, setStoredEmulate] = useState<string | null>(null);

  useEffect(() => {
    // Set up global error logging
    setupErrorLogging();

    // Reset authentication on app launch to require PIN entry
    resetAuthentication();

    // Request permissions on first launch
    if (Platform.OS !== 'web') {
      PermissionsService.requestPermissionsOnFirstLaunch().then(() => {
        console.log('[App] Permissions check completed');
      }).catch(error => {
        console.log('[App] Error requesting permissions:', error);
      });
    }

    // Initialize background tasks for time tracking and notifications
    if (Platform.OS !== 'web') {
      initializeBackgroundTasks().then(result => {
        console.log('[App] Background tasks initialization:', result.message);
      }).catch(error => {
        console.log('[App] Error initializing background tasks:', error);
      });
    }

    if (Platform.OS === 'web') {
      // If there's a new emulate parameter, store it
      if (emulate) {
        localStorage.setItem(STORAGE_KEY, emulate);
        setStoredEmulate(emulate);
      } else {
        // If no emulate parameter, try to get from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setStoredEmulate(stored);
        }
      }
    }
  }, [emulate]);

  const resetAuthentication = async () => {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, isAuthenticated: false });
      console.log('[App] Authentication reset - PIN required on app launch');
    } catch (error) {
      console.log('[App] Error resetting authentication:', error);
    }
  };

  let insetsToUse = actualInsets;

  if (Platform.OS === 'web') {
    const simulatedInsets = {
      ios: { top: 47, bottom: 20, left: 0, right: 0 },
      android: { top: 40, bottom: 0, left: 0, right: 0 },
    };

    // Use stored emulate value if available, otherwise use the current emulate parameter
    const deviceToEmulate = storedEmulate || emulate;
    insetsToUse = deviceToEmulate ? simulatedInsets[deviceToEmulate as keyof typeof simulatedInsets] || actualInsets : actualInsets;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="add-job" />
      <Stack.Screen name="statistics" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="export" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="work-schedule" />
      <Stack.Screen name="work-schedule-calendar" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="time-stats" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutContent />
          </GestureHandlerRootView>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
