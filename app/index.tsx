
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function IndexScreen() {
  const { colors } = useTheme();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log('[Index] Component mounted, starting initialization');
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('[Index] Timeout reached (3s), forcing navigation to auth');
      if (isChecking) {
        setIsChecking(false);
        router.replace('/auth');
      }
    }, 3000);

    // Start initialization
    initializeApp()
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[Index] Checking initial setup...');
      
      // Check if technician name is set
      const technicianName = await StorageService.getTechnicianName();
      console.log('[Index] Technician name:', technicianName || 'Not set');
      
      if (!technicianName) {
        // No name set, redirect to name setup
        console.log('[Index] Redirecting to /set-name');
        setIsChecking(false);
        router.replace('/set-name');
        return;
      }

      // Name is set, check authentication
      const settings = await StorageService.getSettings();
      console.log('[Index] Authentication status:', settings.isAuthenticated);
      
      if (settings.isAuthenticated) {
        console.log('[Index] Redirecting to /dashboard');
        setIsChecking(false);
        router.replace('/dashboard');
      } else {
        console.log('[Index] Redirecting to /auth');
        setIsChecking(false);
        router.replace('/auth');
      }
    } catch (error: any) {
      console.log('[Index] Error during initialization:', error);
      // On error, default to auth screen
      setIsChecking(false);
      router.replace('/auth');
    }
  };

  // Show loading indicator while checking
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.text }]}>
        Loading TechTrace...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
