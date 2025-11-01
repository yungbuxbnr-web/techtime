
import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { StorageService } from '../utils/storage';

export default function IndexScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasName, setHasName] = useState<boolean | null>(null);

  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      // First check if technician name is set
      const technicianName = await StorageService.getTechnicianName();
      console.log('Checking technician name:', technicianName);
      
      if (!technicianName) {
        // No name set, redirect to name setup
        console.log('No technician name set, redirecting to set-name');
        setHasName(false);
        setIsAuthenticated(false);
        return;
      }

      // Name is set, check authentication
      setHasName(true);
      const settings = await StorageService.getSettings();
      console.log('Checking authentication status:', settings.isAuthenticated);
      setIsAuthenticated(settings.isAuthenticated || false);
    } catch (error) {
      console.log('Error checking initial setup:', error);
      setHasName(false);
      setIsAuthenticated(false);
    }
  };

  // Show nothing while checking
  if (hasName === null || isAuthenticated === null) {
    return null;
  }

  // If no name is set, go to name setup screen
  if (!hasName) {
    console.log('Redirecting to name setup screen');
    return <Redirect href="/set-name" />;
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
