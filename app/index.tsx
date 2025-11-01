
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

export default function IndexScreen() {
  const { colors } = useTheme();

  useEffect(() => {
    console.log('[Index] Screen loaded - will redirect to auth');
  }, []);

  // Immediately redirect to auth screen
  // The auth screen will handle checking for technician name
  return <Redirect href="/auth" />;
}
