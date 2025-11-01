
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function SetNameScreen() {
  const { colors } = useTheme();
  const [technicianName, setTechnicianNameInput] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const handleSaveName = useCallback(async () => {
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

    try {
      await StorageService.setTechnicianName(trimmedName);
      showNotification(`Welcome, ${trimmedName}!`, 'success');
      console.log('Technician name set:', trimmedName);
      
      // Navigate to auth screen after a short delay
      setTimeout(() => {
        router.replace('/auth');
      }, 1500);
    } catch (error) {
      console.log('Error saving technician name:', error);
      showNotification('Error saving name. Please try again.', 'error');
    }
  }, [technicianName, showNotification]);

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
        <View style={styles.header}>
          <Text style={styles.icon}>👤</Text>
          <Text style={styles.title}>Welcome to Technician Records</Text>
          <Text style={styles.subtitle}>
            Let&apos;s get started by setting up your profile
          </Text>
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
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
          />

          <TouchableOpacity
            style={[styles.button, !technicianName.trim() && styles.buttonDisabled]}
            onPress={handleSaveName}
            disabled={!technicianName.trim()}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 You can change your name anytime in Settings
          </Text>
        </View>
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
    paddingTop: 60,
    paddingBottom: 40,
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
    marginBottom: 24,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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
