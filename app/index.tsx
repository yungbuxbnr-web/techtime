
import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { StorageService } from '../utils/storage';

export default function IndexScreen() {
  useEffect(() => {
    // Reset authentication status on app start to ensure PIN is always required
    resetAuthStatus();
  }, []);

  const resetAuthStatus = async () => {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, isAuthenticated: false });
      console.log('Authentication status reset - PIN required');
    } catch (error) {
      console.log('Error resetting auth status:', error);
    }
  };

  // Always redirect to auth screen on app start
  return <Redirect href="/auth" />;
}
