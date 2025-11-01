
// Global error logging for runtime errors

import { Platform } from 'react-native';

// Simple debouncing to prevent duplicate errors
const recentErrors: { [key: string]: boolean } = {};
const clearErrorAfterDelay = (errorKey: string) => {
  setTimeout(() => delete recentErrors[errorKey], 100);
};

// Function to send errors to parent window (React frontend)
const sendErrorToParent = (level: string, message: string, data: any) => {
  // Create a simple key to identify duplicate errors
  const errorKey = `${level}:${message}:${JSON.stringify(data)}`;

  // Skip if we've seen this exact error recently
  if (recentErrors[errorKey]) {
    return;
  }

  // Mark this error as seen and schedule cleanup
  recentErrors[errorKey] = true;
  clearErrorAfterDelay(errorKey);

  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
      window.parent.postMessage({
        type: 'EXPO_ERROR',
        level: level,
        message: message,
        data: data,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        source: 'expo-template'
      }, '*');
    }
  } catch (error) {
    // Silently fail - don't block app
    console.log('Failed to send error to parent:', error);
  }
};

export const setupErrorLogging = () => {
  try {
    console.log('[ErrorLogger] Initializing error logging...');
    
    // Capture unhandled errors in web environment
    if (typeof window !== 'undefined') {
      // Override window.onerror to catch JavaScript errors
      const originalOnError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        const sourceFile = source ? source.split('/').pop() : 'unknown';
        const errorData = {
          message: message,
          source: `${sourceFile}:${lineno}:${colno}`,
          line: lineno,
          column: colno,
          error: error?.stack || error,
          timestamp: new Date().toISOString()
        };

        console.log('Runtime error:', errorData);
        sendErrorToParent('error', 'JavaScript Runtime Error', errorData);
        
        // Call original handler if it exists
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false; // Don't prevent default error handling
      };
      
      // Capture unhandled promise rejections
      if (Platform.OS === 'web') {
        window.addEventListener('unhandledrejection', (event) => {
          const errorData = {
            reason: event.reason,
            timestamp: new Date().toISOString()
          };

          console.log('Unhandled promise rejection:', errorData);
          sendErrorToParent('error', 'Unhandled Promise Rejection', errorData);
        });
      }
    }
    
    console.log('[ErrorLogger] Error logging initialized successfully');
  } catch (error) {
    console.log('[ErrorLogger] Failed to initialize error logging:', error);
    // Don't throw - this is not critical
  }
};
