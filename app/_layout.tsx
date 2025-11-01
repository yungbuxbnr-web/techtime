
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize app asynchronously without blocking render
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[RootLayout] Starting app initialization...');
      
      // Small delay to ensure all modules are loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('[RootLayout] App initialized successfully');
      setIsReady(true);
    } catch (error: any) {
      console.log('[RootLayout] Error initializing app:', error);
      // Don't block app loading on initialization errors
      setIsReady(true);
    }
  };

  // Show loading screen while initializing
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
