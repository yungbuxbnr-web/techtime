
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { BiometricService } from '../utils/biometricService';
import { AppSettings } from '../types';

interface SecuritySettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => Promise<void>;
  colors: any;
}

export default function SecuritySettings({ settings, onUpdate, colors }: SecuritySettingsProps) {
  const [newPin, setNewPin] = useState(settings.pin);
  const [confirmPin, setConfirmPin] = useState(settings.pin);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [securityEnabled, setSecurityEnabled] = useState(settings.pin && settings.pin !== 'DISABLED');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await BiometricService.isAvailable();
      setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const types = await BiometricService.getSupportedTypes();
        setBiometricTypes(types);
        console.log('Biometric authentication available:', types);
      }
    } catch (error) {
      console.log('Error checking biometric availability:', error);
    }
  };

  const handleUpdatePin = async () => {
    if (!newPin || newPin.length < 4) {
      alert('PIN must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      alert('PINs do not match');
      return;
    }

    try {
      const updatedSettings = { ...settings, pin: newPin };
      await onUpdate(updatedSettings);
      setSecurityEnabled(true);
    } catch (error) {
      console.log('Error updating PIN:', error);
      alert('Error updating PIN');
    }
  };

  const handleToggleSecurity = () => {
    if (securityEnabled) {
      // Disable security
      Alert.alert(
        'Disable Security',
        'This will remove PIN protection and biometric authentication from the app. Anyone with access to your device will be able to view your job records.\n\nAre you sure you want to disable all security?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable Security',
            style: 'destructive',
            onPress: async () => {
              try {
                const updatedSettings = { 
                  ...settings, 
                  pin: 'DISABLED',
                  biometricEnabled: false,
                  isAuthenticated: true 
                };
                await onUpdate(updatedSettings);
                setSecurityEnabled(false);
                setNewPin('');
                setConfirmPin('');
              } catch (error) {
                console.log('Error disabling security:', error);
                alert('Error disabling security');
              }
            }
          }
        ]
      );
    } else {
      // Enable security - prompt for new PIN
      Alert.alert(
        'Enable Security',
        'To enable security, you need to set a new PIN. This will protect your job records and data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set PIN',
            onPress: () => {
              alert('Please enter a new PIN below');
            }
          }
        ]
      );
    }
  };

  const handleToggleBiometric = async () => {
    if (!securityEnabled) {
      alert('Please enable security first to use biometric authentication');
      return;
    }

    try {
      if (settings.biometricEnabled) {
        const result = await BiometricService.disableBiometricLogin();
        if (result.success) {
          const updatedSettings = { ...settings, biometricEnabled: false };
          await onUpdate(updatedSettings);
        } else {
          alert(result.message);
        }
      } else {
        const result = await BiometricService.enableBiometricLogin();
        if (result.success) {
          const updatedSettings = { ...settings, biometricEnabled: true };
          await onUpdate(updatedSettings);
        } else {
          alert(result.message);
        }
      }
    } catch (error) {
      console.log('Error toggling biometric:', error);
      alert('Error updating biometric settings');
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔐 Security Settings</Text>
      <Text style={styles.sectionDescription}>
        Manage PIN protection and biometric authentication. You can enable or disable security features to control access to your job records.
      </Text>

      {/* Security Toggle */}
      <View style={styles.securityToggleContainer}>
        <View style={styles.securityToggleInfo}>
          <Text style={styles.securityToggleTitle}>
            {securityEnabled ? '🔒 Security Enabled' : '🔓 Security Disabled'}
          </Text>
          <Text style={styles.securityToggleSubtext}>
            {securityEnabled 
              ? 'PIN protection is active' 
              : 'App is accessible without PIN'}
          </Text>
        </View>
        <Switch
          value={securityEnabled}
          onValueChange={handleToggleSecurity}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={securityEnabled ? colors.background : colors.background}
        />
      </View>

      {securityEnabled && (
        <>
          <Text style={styles.label}>New PIN</Text>
          <TextInput
            style={styles.input}
            value={newPin}
            onChangeText={setNewPin}
            placeholder="Enter new PIN"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <Text style={styles.label}>Confirm PIN</Text>
          <TextInput
            style={styles.input}
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="Confirm new PIN"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <TouchableOpacity style={styles.button} onPress={handleUpdatePin}>
            <Text style={styles.buttonText}>🔄 Update PIN</Text>
          </TouchableOpacity>

          {/* Biometric Authentication */}
          {biometricAvailable && (
            <View style={styles.biometricSection}>
              <View style={styles.biometricHeader}>
                <View style={styles.biometricInfo}>
                  <Text style={styles.biometricTitle}>
                    {biometricTypes.includes('Face ID') ? '👤' : '👆'} Biometric Login
                  </Text>
                  <Text style={styles.biometricSubtext}>
                    {biometricTypes.join(' or ')} available
                  </Text>
                </View>
                <Switch
                  value={settings.biometricEnabled || false}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={settings.biometricEnabled ? colors.background : colors.background}
                />
              </View>
              <Text style={styles.biometricDescription}>
                Enable biometric authentication for quick and secure access to the app. You can still use your PIN as a fallback.
              </Text>
            </View>
          )}
        </>
      )}

      {!securityEnabled && (
        <View style={styles.securityWarning}>
          <Text style={styles.securityWarningTitle}>⚠️ Security Disabled</Text>
          <Text style={styles.securityWarningText}>
            Your job records are currently accessible without any authentication. Anyone with access to your device can view, edit, or delete your data.
          </Text>
          <Text style={styles.securityWarningText}>
            To enable security, toggle the switch above and set a new PIN.
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  securityToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityToggleInfo: {
    flex: 1,
  },
  securityToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  securityToggleSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  securityWarning: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  securityWarningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 8,
  },
  securityWarningText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  biometricInfo: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  biometricSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  biometricDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
