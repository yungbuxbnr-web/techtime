
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import NotificationToast from '../components/NotificationToast';

export default function AuthScreen() {
  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState('3101');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await StorageService.getSettings();
      setCorrectPin(settings.pin);
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const handlePinSubmit = async () => {
    if (pin === correctPin) {
      try {
        const settings = await StorageService.getSettings();
        await StorageService.saveSettings({ ...settings, isAuthenticated: true });
        showNotification('Access Granted', 'success');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } catch (error) {
        console.log('Error saving authentication:', error);
        showNotification('Authentication Error', 'error');
      }
    } else {
      showNotification('Incorrect PIN', 'error');
      setPin('');
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
      source={{ uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' }}
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
            <View style={styles.authCard}>
              <Text style={styles.title}>Technician Records</Text>
              <Text style={styles.subtitle}>Buckston Rugge</Text>
              
              <Text style={styles.label}>Enter PIN to continue</Text>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={setPin}
                placeholder="Enter PIN"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                onSubmitEditing={handlePinSubmit}
              />
              
              <TouchableOpacity
                style={[commonStyles.button, styles.submitButton]}
                onPress={handlePinSubmit}
              >
                <Text style={commonStyles.buttonText}>Sign In</Text>
              </TouchableOpacity>
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
    backgroundColor: colors.overlay,
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
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  pinInput: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
    width: '100%',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 24,
  },
  submitButton: {
    width: '100%',
  },
});
