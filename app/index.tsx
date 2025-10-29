
import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { StorageService } from '../utils/storage';

export default function IndexScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const settings = await StorageService.getSettings();
      console.log('Checking authentication status:', settings.isAuthenticated);
      setIsAuthenticated(settings.isAuthenticated || false);
    } catch (error) {
      console.log('Error checking authentication:', error);
      setIsAuthenticated(false);
    }
  };

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  // If authenticated, go to dashboard, otherwise show PIN screen
  if (isAuthenticated) {
    console.log('User authenticated, redirecting to dashboard');
    return <Redirect href="/dashboard" />;
  } else {
    console.log('User not authenticated, showing PIN screen');
    return <Redirect href="/auth" />;
  }
}
