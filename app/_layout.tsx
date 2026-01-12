
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
        console.log('[App] Permissions check completed');
      }).catch(error => {
        console.log('[App] Error requesting permissions:', error);
      });
    }

    if (Platform.OS !== 'web') {
      initializeBackgroundTasks().then(result => {
        console.log('[App] Background tasks initialization:', result.message);
      }).catch(error => {
        console.log('[App] Error initializing background tasks:', error);
      });
    }
  }, []);

  const resetAuthentication = async () => {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, isAuthenticated: false });
      console.log('[App] Authentication reset - PIN required on app launch');
    } catch (error) {
      console.log('[App] Error resetting authentication:', error);
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
    />
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
