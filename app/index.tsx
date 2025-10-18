
import React from 'react';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  // Always redirect to dashboard (home screen) on app start
  return <Redirect href="/dashboard" />;
}
