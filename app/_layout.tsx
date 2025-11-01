
import { Stack, useGlobalSearchParams } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StorageService } from '../utils/storage';
import { ThemeProvider } from '../contexts/ThemeContext';

const STORAGE_KEY = 'emulated_device';
const INIT_TIMEOUT = 10000; // 10 seconds max for initialization

export default function RootLayout() {
  const actualInsets = useSafeAreaInsets();
  const { emulate } = useGlobalSearchParams<{ emulate?: string }>();
  const [storedEmulate, setStoredEmulate] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, [emulate]);

  const initializeApp = async () => {
    const timeoutId = setTimeout(() => {
      console.log('[RootLayout] Initialization timeout - forcing ready state');
      setError('Initialization took too long, continuing anyway...');
      setIsReady(true);
    }, INIT_TIMEOUT);

    try {
      console.log('[RootLayout] Initializing app...');
      
      // Set up global error logging first
      setupErrorLogging();
      console.log('[RootLayout] Error logging initialized');

      // Reset authentication on app launch to require PIN entry
      await resetAuthentication();
      console.log('[RootLayout] Authentication reset complete');

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

      console.log('[RootLayout] App initialized successfully');
      clearTimeout(timeoutId);
      setIsReady(true);
    } catch (error: any) {
      console.log('[RootLayout] Error initializing app:', error);
      clearTimeout(timeoutId);
      setError(error?.message || 'Initialization error');
      // Still set ready to true to allow app to load
      setIsReady(true);
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

  // Show loading indicator while initializing
  if (!isReady) {
    console.log('[RootLayout] Rendering loading indicator...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading TechTrace...</Text>
      </View>
    );
  }

  // Show error if initialization failed but continue
  if (error) {
    console.log('[RootLayout] Initialization had errors but continuing:', error);
  }

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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
});
