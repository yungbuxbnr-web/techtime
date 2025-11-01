
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { StorageService } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function IndexScreen() {
  const { colors } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [hasName, setHasName] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      console.log('[Index] Checking initial setup...');
      
      // Check if technician name is set
      const technicianName = await StorageService.getTechnicianName();
      console.log('[Index] Technician name:', technicianName || 'Not set');
      
      if (!technicianName) {
        // No name set, redirect to name setup
        console.log('[Index] No technician name set, redirecting to set-name');
        setHasName(false);
        setIsAuthenticated(false);
        setIsReady(true);
        return;
      }

      // Name is set, check authentication
      setHasName(true);
      const settings = await StorageService.getSettings();
      console.log('[Index] Authentication status:', settings.isAuthenticated);
      setIsAuthenticated(settings.isAuthenticated || false);
      setIsReady(true);
    } catch (error: any) {
      console.log('[Index] Error checking initial setup:', error);
      
      // Default to showing auth screen on error
      setHasName(true);
      setIsAuthenticated(false);
      setIsReady(true);
    }
  };

  // Show loading indicator while checking
  if (!isReady) {
    console.log('[Index] Loading initial setup...');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading TechTrace...
        </Text>
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
});
