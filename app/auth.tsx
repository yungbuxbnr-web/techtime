
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import { BiometricService } from '../utils/biometricService';
import NotificationToast from '../components/NotificationToast';
import Keypad from '../components/Keypad';
import { useTheme } from '../contexts/ThemeContext';

export default function AuthScreen() {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState('3101');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isShaking, setIsShaking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const isAvailable = await BiometricService.isAvailable();
      setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const types = await BiometricService.getSupportedTypes();
        setBiometricTypes(types);
        console.log('Biometric authentication available:', types);
        
        // Auto-trigger biometric if enabled
        const settings = await StorageService.getSettings();
        if (settings.biometricEnabled) {
          setTimeout(() => {
            handleBiometricAuth();
          }, 500);
        }
      }
    } catch (error) {
      console.log('Error checking biometric availability:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    checkBiometricAvailability();
    console.log('Auth screen loaded - Authentication required on app start');
  }, [checkBiometricAvailability]);

  const loadSettings = async () => {
    try {
      const settings = await StorageService.getSettings();
      setCorrectPin(settings.pin);
      setBiometricEnabled(settings.biometricEnabled || false);
      console.log('Settings loaded, authentication required');
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await BiometricService.authenticate('Authenticate to access Technician Records');
      
      if (result.success) {
        const settings = await StorageService.getSettings();
        await StorageService.saveSettings({ ...settings, isAuthenticated: true });
        showNotification('Biometric Authentication Successful', 'success');
        console.log('Biometric authentication successful');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } else {
        showNotification(result.error || 'Biometric authentication failed. Please use PIN.', 'error');
        console.log('Biometric authentication failed:', result.error);
      }
    } catch (error) {
      console.log('Error during biometric authentication:', error);
      showNotification('Biometric authentication error. Please use PIN.', 'error');
    }
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);
      console.log('PIN entered:', newPin.replace(/./g, '•'));
      
      // Auto-submit when PIN reaches 4 digits
      if (newPin.length === 4) {
        setTimeout(() => {
          handlePinSubmit(newPin);
        }, 100); // Small delay for better UX
      }
    }
  };

  const handleDeletePress = () => {
    const newPin = pin.slice(0, -1);
    setPin(newPin);
    console.log('PIN after delete:', newPin.replace(/./g, '•'));
  };

  const handlePinSubmit = async (pinToCheck?: string) => {
    const currentPin = pinToCheck || pin;
    console.log('Submitting PIN:', currentPin.replace(/./g, '•'), 'Expected:', correctPin.replace(/./g, '•'));
    
    if (currentPin === correctPin) {
      try {
        const settings = await StorageService.getSettings();
        await StorageService.saveSettings({ ...settings, isAuthenticated: true });
        showNotification('Access Granted', 'success');
        console.log('Authentication successful');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } catch (error) {
        console.log('Error saving authentication:', error);
        showNotification('Authentication Error', 'error');
      }
    } else {
      // Enhanced wrong PIN notification with shake animation
      showNotification('Wrong PIN entered. Please try again.', 'error');
      setPin('');
      setIsShaking(true);
      console.log('Incorrect PIN entered');
      
      // Reset shake animation after a short delay
      setTimeout(() => {
        setIsShaking(false);
      }, 600);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  };

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const getBiometricIcon = () => {
    if (biometricTypes.includes('Face ID')) return '👤';
    if (biometricTypes.includes('Fingerprint')) return '👆';
    if (biometricTypes.includes('Iris')) return '👁️';
    return '🔐';
  };

  const getBiometricLabel = () => {
    if (biometricTypes.length > 0) {
      return `Use ${biometricTypes.join(' or ')}`;
    }
    return 'Use Biometric';
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <NotificationToast
          message={notification.message}
          type={notification.type}
          visible={notification.visible}
          onHide={hideNotification}
        />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Technician Records</Text>
            <Text style={styles.subtitle}>Buckston Rugge</Text>
            <Text style={styles.label}>Enter PIN</Text>
            
            {biometricAvailable && biometricEnabled && (
              <TouchableOpacity 
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
              >
                <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
                <Text style={styles.biometricText}>{getBiometricLabel()}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={[styles.keypadContainer, isShaking && styles.shakeAnimation]}>
            <Keypad
              pin={pin}
              onNumberPress={handleNumberPress}
              onDeletePress={handleDeletePress}
              onSubmitPress={() => handlePinSubmit()}
              maxLength={4}
              hideSubmitButton={true}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  biometricButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  shakeAnimation: {
    transform: [{ translateX: 5 }],
  },
});
