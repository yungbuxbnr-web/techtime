
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StorageService } from '../utils/storage';
import { ThemeProvider } from '../contexts/ThemeContext';
import { initializeBackgroundTasks } from '../utils/backgroundTasks';
import { PermissionsService } from '../utils/permissionsService';
import ErrorBoundary from '../components/ErrorBoundary';

function RootLayoutContent() {
  useEffect(() => {
    setupErrorLogging();

    resetAuthentication();

    if (Platform.OS !== 'web') {
      PermissionsService.requestPermissionsOnFirstLaunch().then(() => {
        console.log('[TechTime] Permissions check completed');
      }).catch(error => {
        console.log('[TechTime] Error requesting permissions:', error);
      });
    }

    if (Platform.OS !== 'web') {
      initializeBackgroundTasks().then(result => {
        console.log('[TechTime] Background tasks initialization:', result.message);
      }).catch(error => {
        console.log('[TechTime] Error initializing background tasks:', error);
      });
    }
  }, []);

  const resetAuthentication = async () => {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, isAuthenticated: false });
      console.log('[TechTime] Authentication reset - PIN required on app launch');
    } catch (error) {
      console.log('[TechTime] Error resetting authentication:', error);
    }
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="set-name" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="jobs" options={{ headerShown: false }} />
      <Stack.Screen name="add-job" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="statistics" options={{ headerShown: false }} />
      <Stack.Screen name="stats" options={{ headerShown: false }} />
      <Stack.Screen name="job-records" options={{ headerShown: false }} />
      <Stack.Screen name="export-reports" options={{ headerShown: false }} />
      <Stack.Screen name="import-jobs" options={{ headerShown: false }} />
      <Stack.Screen name="work-schedule" options={{ headerShown: false }} />
      <Stack.Screen name="work-schedule-calendar" options={{ headerShown: false }} />
      <Stack.Screen name="efficiency-calendar" options={{ headerShown: false }} />
      <Stack.Screen name="time-stats" options={{ headerShown: false }} />
      <Stack.Screen name="metrics" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ headerShown: false }} />
      <Stack.Screen name="help" options={{ headerShown: false }} />
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
