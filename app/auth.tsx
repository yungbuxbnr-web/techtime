
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import NotificationToast from '../components/NotificationToast';
import Keypad from '../components/Keypad';

export default function AuthScreen() {
  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState('3101');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    loadSettings();
    console.log('Auth screen loaded - PIN required on app start');
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await StorageService.getSettings();
      setCorrectPin(settings.pin);
      console.log('Settings loaded, PIN required');
    } catch (error) {
      console.log('Error loading settings:', error);
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

  return (
    <ImageBackground
      source={require('../assets/images/daebef9d-f2fa-4b34-88c6-4226954942a0.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={commonStyles.container}>
          <NotificationToast
            message={notification.message}
            type={notification.type}
            visible={notification.visible}
            onHide={hideNotification}
          />
          
          <View style={styles.content}>
            <View style={[styles.authCard, isShaking && styles.shakeAnimation]}>
              <Text style={styles.title}>Technician Records</Text>
              <Text style={styles.subtitle}>Buckston Rugge</Text>
              
              <Text style={styles.label}>Enter PIN to continue</Text>
              
              <Keypad
                pin={pin}
                onNumberPress={handleNumberPress}
                onDeletePress={handleDeletePress}
                onSubmitPress={() => handlePinSubmit()}
                maxLength={4}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
    elevation: 8,
  },
  shakeAnimation: {
    transform: [{ translateX: 5 }],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
});
