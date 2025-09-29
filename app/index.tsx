
import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { StorageService } from '../utils/storage';

export default function IndexScreen() {
  useEffect(() => {
    // Always reset authentication status on app start to ensure PIN is required every time
    resetAuthStatus();
  }, []);

  const resetAuthStatus = async () => {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, isAuthenticated: false });
      console.log('Authentication status reset - PIN required on every app launch');
    } catch (error) {
      console.log('Error resetting auth status:', error);
    }
  };

  // Always redirect to auth screen on app start to require PIN entry
  return <Redirect href="/auth" />;
}
