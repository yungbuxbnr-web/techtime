
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
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
  const [technicianName, setTechnicianName] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isShaking, setIsShaking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [hasAttemptedBiometric, setHasAttemptedBiometric] = useState(false);

  const handleBiometricAuth = useCallback(async () => {
    try {
      const result = await BiometricService.authenticate('Authenticate to access TechTime');
      
      if (result.success) {
        const settings = await StorageService.getSettings();
        await StorageService.saveSettings({ ...settings, isAuthenticated: true });
        showNotification('Authentication Successful', 'success');
        console.log('[TechTime] Biometric authentication successful');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } else {
        showNotification(result.error || 'Biometric authentication failed. Please use PIN.', 'error');
        console.log('[TechTime] Biometric authentication failed:', result.error);
      }
    } catch (error) {
      console.log('[TechTime] Error during biometric authentication:', error);
      showNotification('Biometric authentication error. Please use PIN.', 'error');
    }
  }, []);

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const isAvailable = await BiometricService.isAvailable();
      setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const types = await BiometricService.getSupportedTypes();
        setBiometricTypes(types);
        console.log('[TechTime] Biometric authentication available:', types);
        
        // Check if biometric is enabled in settings
        const settings = await StorageService.getSettings();
        const enabled = settings.biometricEnabled || false;
        setBiometricEnabled(enabled);
        
        // Auto-trigger biometric if enabled and not yet attempted
        if (enabled && !hasAttemptedBiometric) {
          setHasAttemptedBiometric(true);
          setTimeout(() => {
            handleBiometricAuth();
          }, 500);
        }
      }
    } catch (error) {
      console.log('[TechTime] Error checking biometric availability:', error);
    }
  }, [handleBiometricAuth, hasAttemptedBiometric]);

  useEffect(() => {
    loadSettings();
    loadTechnicianName();
    checkBiometricAvailability();
    console.log('[TechTime] Auth screen loaded - Authentication required on app start');
  }, [checkBiometricAvailability]);

  const loadSettings = async () => {
    try {
      const settings = await StorageService.getSettings();
      setCorrectPin(settings.pin);
      console.log('[TechTime] Settings loaded, authentication required');
    } catch (error) {
      console.log('[TechTime] Error loading settings:', error);
    }
  };

  const loadTechnicianName = async () => {
    try {
      const name = await StorageService.getTechnicianName();
      if (name) {
        setTechnicianName(name);
        console.log('[TechTime] Technician name loaded:', name);
      }
    } catch (error) {
      console.log('[TechTime] Error loading technician name:', error);
    }
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);
      console.log('[TechTime] PIN entered:', newPin.replace(/./g, '•'));
      
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
    console.log('[TechTime] PIN after delete:', newPin.replace(/./g, '•'));
  };

  const handlePinSubmit = async (pinToCheck?: string) => {
    const currentPin = pinToCheck || pin;
    console.log('[TechTime] Submitting PIN:', currentPin.replace(/./g, '•'), 'Expected:', correctPin.replace(/./g, '•'));
    
    if (currentPin === correctPin) {
      try {
        const settings = await StorageService.getSettings();
        await StorageService.saveSettings({ ...settings, isAuthenticated: true });
        showNotification('Access Granted', 'success');
        console.log('[TechTime] Authentication successful');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } catch (error) {
        console.log('[TechTime] Error saving authentication:', error);
        showNotification('Authentication Error', 'error');
      }
    } else {
      // Enhanced wrong PIN notification with shake animation
      showNotification('Wrong PIN entered. Please try again.', 'error');
      setPin('');
      setIsShaking(true);
      console.log('[TechTime] Incorrect PIN entered');
      
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
        
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>TechTime</Text>
              <Text style={styles.subtitle}>Technician Records – Buckston Rugge</Text>
              {technicianName ? (
                <Text style={styles.welcomeText}>Welcome back, {technicianName}</Text>
              ) : (
                <Text style={styles.welcomeText}>Welcome</Text>
              )}
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
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
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
    minHeight: 400,
  },
  shakeAnimation: {
    transform: [{ translateX: 5 }],
  },
});
