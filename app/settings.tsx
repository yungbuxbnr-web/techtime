
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { AppSettings } from '../types';
import NotificationToast from '../components/NotificationToast';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({ pin: '3101', isAuthenticated: false });
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await StorageService.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.log('Error loading settings:', error);
      showNotification('Error loading settings', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  };

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const handleUpdatePin = async () => {
    if (!newPin.trim()) {
      showNotification('Please enter a new PIN', 'error');
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      showNotification('PIN must be 4 digits', 'error');
      return;
    }

    if (newPin !== confirmPin) {
      showNotification('PINs do not match', 'error');
      return;
    }

    try {
      const updatedSettings = { ...settings, pin: newPin };
      await StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      setNewPin('');
      setConfirmPin('');
      showNotification('PIN updated successfully', 'success');
    } catch (error) {
      console.log('Error updating PIN:', error);
      showNotification('Error updating PIN', 'error');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSettings = { ...settings, isAuthenticated: false };
              await StorageService.saveSettings(updatedSettings);
              router.replace('/auth');
            } catch (error) {
              console.log('Error signing out:', error);
              showNotification('Error signing out', 'error');
            }
          }
        }
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all jobs and reset settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              showNotification('All data cleared successfully', 'success');
              setTimeout(() => {
                router.replace('/auth');
              }, 1500);
            } catch (error) {
              console.log('Error clearing data:', error);
              showNotification('Error clearing data', 'error');
            }
          }
        }
      ]
    );
  };

  const navigateToExport = () => {
    router.push('/export');
  };

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  const navigateToJobs = () => {
    router.push('/jobs');
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={commonStyles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change PIN</Text>
            <Text style={styles.cardDescription}>
              Current PIN: {settings.pin.replace(/./g, '•')}
            </Text>
            
            <TextInput
              style={commonStyles.input}
              value={newPin}
              onChangeText={setNewPin}
              placeholder="Enter new PIN"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
            
            <TextInput
              style={commonStyles.input}
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="Confirm new PIN"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
            
            <TouchableOpacity
              style={[commonStyles.button, styles.updateButton]}
              onPress={handleUpdatePin}
            >
              <Text style={commonStyles.buttonText}>Update PIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity
            style={[styles.card, styles.actionCard]}
            onPress={navigateToExport}
          >
            <Text style={styles.cardTitle}>Export Data</Text>
            <Text style={styles.cardDescription}>
              Export jobs as PDF or Excel files
            </Text>
            <Text style={styles.actionText}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.card, styles.actionCard, styles.dangerCard]}
            onPress={handleClearAllData}
          >
            <Text style={[styles.cardTitle, styles.dangerText]}>Clear All Data</Text>
            <Text style={styles.cardDescription}>
              Permanently delete all jobs and settings
            </Text>
            <Text style={[styles.actionText, styles.dangerText]}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Technician Records</Text>
            <Text style={styles.cardDescription}>
              Personal job tracking application for Buckston Rugge
            </Text>
            <Text style={styles.versionText}>Version 1.0.0</Text>
            <Text style={styles.signatureText}>— Buckston Rugge</Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[commonStyles.button, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={[commonStyles.buttonText, styles.signOutText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={navigateToDashboard}>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToJobs}>
          <Text style={styles.navText}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={[styles.navText, styles.navTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dangerCard: {
    borderColor: colors.error,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  dangerText: {
    color: colors.error,
  },
  updateButton: {
    marginTop: 16,
  },
  versionText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  signatureText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.text,
    marginTop: 8,
    textAlign: 'right',
  },
  signOutButton: {
    backgroundColor: colors.error,
  },
  signOutText: {
    color: colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
