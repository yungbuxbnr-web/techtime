
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { StorageService } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

const SETUP_TIMEOUT = 8000; // 8 seconds max for setup check

export default function IndexScreen() {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasName, setHasName] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    const timeoutId = setTimeout(() => {
      console.log('[Index] Setup check timeout - defaulting to auth screen');
      setError('Setup check timed out');
      setHasName(true);
      setIsAuthenticated(false);
    }, SETUP_TIMEOUT);

    try {
      console.log('[Index] Checking initial setup...');
      
      // First check if technician name is set
      const technicianName = await StorageService.getTechnicianName();
      console.log('[Index] Technician name:', technicianName || 'Not set');
      
      if (!technicianName) {
        // No name set, redirect to name setup
        console.log('[Index] No technician name set, redirecting to set-name');
        clearTimeout(timeoutId);
        setHasName(false);
        setIsAuthenticated(false);
        return;
      }

      // Name is set, check authentication
      setHasName(true);
      const settings = await StorageService.getSettings();
      console.log('[Index] Authentication status:', settings.isAuthenticated);
      clearTimeout(timeoutId);
      setIsAuthenticated(settings.isAuthenticated || false);
    } catch (error: any) {
      console.log('[Index] Error checking initial setup:', error);
      clearTimeout(timeoutId);
      setError(error?.message || 'Setup error');
      
      // Default to showing auth screen on error
      setHasName(true);
      setIsAuthenticated(false);
    }
  };

  // Show loading indicator while checking
  if (hasName === null || isAuthenticated === null) {
    console.log('[Index] Loading initial setup...');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Initializing...
        </Text>
        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }

  // If no name is set, go to name setup screen
  if (!hasName) {
    console.log('[Index] Redirecting to name setup screen');
    return <Redirect href="/set-name" />;
  }

  // If authenticated, go to dashboard, otherwise show PIN screen
  if (isAuthenticated) {
    console.log('[Index] User authenticated, redirecting to dashboard');
    return <Redirect href="/dashboard" />;
  } else {
    console.log('[Index] User not authenticated, showing PIN screen');
    return <Redirect href="/auth" />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
  },
});
