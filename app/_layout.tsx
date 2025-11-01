
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StorageService } from '../utils/storage';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout() {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[RootLayout] Initializing app...');
      
      // Set up global error logging first
      setupErrorLogging();
      console.log('[RootLayout] Error logging initialized');

      // Reset authentication on app launch to require PIN entry
      await resetAuthentication();
      console.log('[RootLayout] Authentication reset complete');

      console.log('[RootLayout] App initialized successfully');
    } catch (error: any) {
      console.log('[RootLayout] Error initializing app:', error);
      // Don't block app loading on initialization errors
    }
  };

  const resetAuthentication = async () => {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, isAuthenticated: false });
      console.log('[RootLayout] Authentication reset - PIN required on app launch');
    } catch (error) {
      console.log('[RootLayout] Error resetting authentication:', error);
      // Don't throw - this is not critical
    }
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="set-name" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="jobs" />
            <Stack.Screen name="add-job" />
            <Stack.Screen name="statistics" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="export" />
            <Stack.Screen name="stats" />
            <Stack.Screen name="job-records" />
            <Stack.Screen name="help" />
            <Stack.Screen name="metrics" />
          </Stack>
        </GestureHandlerRootView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
