
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function SetNameScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState<'name' | 'pin'>('name');
  const [technicianName, setTechnicianNameInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const handleNameContinue = useCallback(() => {
    const trimmedName = technicianName.trim();
    
    if (!trimmedName) {
      showNotification('Please enter your name', 'error');
      return;
    }

    if (trimmedName.length < 2) {
      showNotification('Name must be at least 2 characters', 'error');
      return;
    }

    if (trimmedName.length > 50) {
      showNotification('Name must be less than 50 characters', 'error');
      return;
    }

    console.log('Name validated, moving to PIN setup');
    setStep('pin');
  }, [technicianName, showNotification]);

  const handlePinSetup = useCallback(async () => {
    if (!newPin || newPin.length < 4) {
      showNotification('PIN must be at least 4 digits', 'error');
      return;
    }

    if (newPin !== confirmPin) {
      showNotification('PINs do not match', 'error');
      return;
    }

    try {
      // Save technician name
      await StorageService.setTechnicianName(technicianName.trim());
      
      // Save PIN in settings
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ 
        ...settings, 
        pin: newPin,
        isAuthenticated: false 
      });
      
      showNotification(`Welcome, ${technicianName.trim()}! Your PIN has been set.`, 'success');
      console.log('Setup complete - name and PIN saved');
      
      // Navigate to auth screen after a short delay
      setTimeout(() => {
        router.replace('/auth');
      }, 1500);
    } catch (error) {
      console.log('Error during setup:', error);
      showNotification('Error saving setup. Please try again.', 'error');
    }
  }, [technicianName, newPin, confirmPin, showNotification]);

  const handleBack = useCallback(() => {
    if (step === 'pin') {
      setStep('name');
      setNewPin('');
      setConfirmPin('');
    }
  }, [step]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 'name' ? (
          <>
            <View style={styles.header}>
              <Text style={styles.icon}>👤</Text>
              <Text style={styles.title}>Welcome to Technician Records</Text>
              <Text style={styles.subtitle}>
                Let&apos;s get started by setting up your profile
              </Text>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepText}>Step 1 of 2</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>What&apos;s your name?</Text>
              <Text style={styles.description}>
                This will be displayed throughout the app and on exported reports
              </Text>
              
              <TextInput
                style={styles.input}
                value={technicianName}
                onChangeText={setTechnicianNameInput}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
                returnKeyType="next"
                onSubmitEditing={handleNameContinue}
              />

              <TouchableOpacity
                style={[styles.button, !technicianName.trim() && styles.buttonDisabled]}
                onPress={handleNameContinue}
                disabled={!technicianName.trim()}
              >
                <Text style={styles.buttonText}>Continue to PIN Setup</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                💡 You can change your name anytime in Settings
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.icon}>🔐</Text>
              <Text style={styles.title}>Set Your Security PIN</Text>
              <Text style={styles.subtitle}>
                Create a PIN to secure your job records and data
              </Text>
              <View style={styles.stepIndicator}>
                <View style={styles.stepDot} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
              </View>
              <Text style={styles.stepText}>Step 2 of 2</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Create Your PIN</Text>
              <Text style={styles.description}>
                Choose a 4-6 digit PIN that you&apos;ll remember. You&apos;ll need this to access the app.
              </Text>
              
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter PIN (4-6 digits)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                returnKeyType="next"
              />

              <Text style={styles.label}>Confirm Your PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Re-enter PIN"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handlePinSetup}
              />

              <View style={styles.securityInfo}>
                <Text style={styles.securityInfoTitle}>🔒 Security Information</Text>
                <Text style={styles.securityInfoText}>
                  • Your PIN protects all your job records and data
                </Text>
                <Text style={styles.securityInfoText}>
                  • Write down your PIN in a secure location
                </Text>
                <Text style={styles.securityInfoText}>
                  • You can change or disable your PIN later in Settings
                </Text>
                <Text style={styles.securityInfoText}>
                  • If you forget your PIN, you&apos;ll need to reinstall the app
                </Text>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleBack}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, (!newPin || !confirmPin) && styles.buttonDisabled]}
                  onPress={handlePinSetup}
                  disabled={!newPin || !confirmPin}
                >
                  <Text style={styles.buttonText}>Complete Setup</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                💡 You can enable biometric authentication (Face ID/Fingerprint) later in Settings
              </Text>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    backgroundColor: colors.card,
    color: colors.text,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  securityInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  securityInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    boxShadow: 'none',
    elevation: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
