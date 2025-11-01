
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { StorageService } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function IndexScreen() {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasName, setHasName] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      console.log('[Index] Checking initial setup...');
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Setup check timeout')), 5000);
      });

      const setupPromise = (async () => {
        // First check if technician name is set
        const technicianName = await StorageService.getTechnicianName();
        console.log('[Index] Technician name:', technicianName);
        
        if (!technicianName) {
          // No name set, redirect to name setup
          console.log('[Index] No technician name set, redirecting to set-name');
          setHasName(false);
          setIsAuthenticated(false);
          return;
        }

        // Name is set, check authentication
        setHasName(true);
        const settings = await StorageService.getSettings();
        console.log('[Index] Authentication status:', settings.isAuthenticated);
        setIsAuthenticated(settings.isAuthenticated || false);
      })();

      await Promise.race([setupPromise, timeoutPromise]);
    } catch (error: any) {
      console.log('[Index] Error checking initial setup:', error);
      
      if (error.message === 'Setup check timeout') {
        console.log('[Index] Setup check timed out, defaulting to auth screen');
        setError('Loading timed out');
      }
      
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
        {error && (
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
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
  errorText: {
    marginTop: 16,
    fontSize: 14,
  },
});
