
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.log('[ErrorBoundary] Error caught:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log('[ErrorBoundary] Component error:', error);
    console.log('[ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error details for debugging
    if (Platform.OS !== 'web') {
      console.log('[ErrorBoundary] Stack trace:', error.stack);
      console.log('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = async () => {
    console.log('[ErrorBoundary] Resetting app state...');
    
    try {
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });

      // Navigate back to auth screen
      router.replace('/auth');
    } catch (resetError) {
      console.log('[ErrorBoundary] Error during reset:', resetError);
      
      // If navigation fails, try to reload the app
      if (Platform.OS !== 'web') {
        try {
          await Updates.reloadAsync();
        } catch (reloadError) {
          console.log('[ErrorBoundary] Error reloading app:', reloadError);
        }
      }
    }
  };

  handleReload = async () => {
    console.log('[ErrorBoundary] Reloading app...');
    
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      try {
        await Updates.reloadAsync();
      } catch (error) {
        console.log('[ErrorBoundary] Error reloading app:', error);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>⚠️ Something Went Wrong</Text>
            <Text style={styles.message}>
              The app encountered an unexpected error. Don&apos;t worry, your data is safe.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleReset}
              >
                <Text style={styles.buttonText}>Go to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleReload}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Reload App
                </Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.errorText}>{error.toString()}</Text>
                {error.stack && (
                  <>
                    <Text style={styles.errorTitle}>Stack Trace:</Text>
                    <Text style={styles.errorText}>{error.stack}</Text>
                  </>
                )}
                {errorInfo && errorInfo.componentStack && (
                  <>
                    <Text style={styles.errorTitle}>Component Stack:</Text>
                    <Text style={styles.errorText}>{errorInfo.componentStack}</Text>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  errorDetails: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 300,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
});

export default ErrorBoundary;
