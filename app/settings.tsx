
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { BackupService, BackupData } from '../utils/backupService';
import { CalculationService } from '../utils/calculations';
import { AppSettings, Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import GoogleDriveBackup from '../components/GoogleDriveBackup';
import SimpleBottomSheet from '../components/BottomSheet';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({ pin: '3101', isAuthenticated: false });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isImportInProgress, setIsImportInProgress] = useState(false);
  const [showGoogleDriveBackup, setShowGoogleDriveBackup] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [settingsData, jobsData] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getJobs()
      ]);
      setSettings(settingsData);
      setJobs(jobsData);
      setNewPin(settingsData.pin);
      setConfirmPin(settingsData.pin);
      console.log('Settings and jobs loaded successfully');
    } catch (error) {
      console.log('Error loading data:', error);
      showNotification('Error loading data', 'error');
    }
  }, [showNotification]);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const settingsData = await StorageService.getSettings();
      if (!settingsData.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      await loadData();
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/auth');
    }
  }, [loadData]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleUpdatePin = useCallback(async () => {
    if (!newPin || newPin.length < 4) {
      showNotification('PIN must be at least 4 digits', 'error');
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
      showNotification('PIN updated successfully', 'success');
      console.log('PIN updated successfully');
    } catch (error) {
      console.log('Error updating PIN:', error);
      showNotification('Error updating PIN', 'error');
    }
  }, [newPin, confirmPin, settings, showNotification]);

  const handleSignOut = useCallback(async () => {
    try {
      const updatedSettings = { ...settings, isAuthenticated: false };
      await StorageService.saveSettings(updatedSettings);
      console.log('User signed out');
      router.replace('/auth');
    } catch (error) {
      console.log('Error signing out:', error);
      showNotification('Error signing out', 'error');
    }
  }, [settings, showNotification]);

  const handleClearAllData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all jobs and reset settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              showNotification('All data cleared successfully', 'success');
              console.log('All data cleared');
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
  }, [showNotification]);

  const handleCreateBackup = useCallback(async () => {
    if (isBackupInProgress) return;
    
    setIsBackupInProgress(true);
    showNotification('Creating backup...', 'info');

    try {
      const result = await BackupService.createBackup();
      
      if (result.success) {
        showNotification(result.message, 'success');
        console.log('Backup created successfully');
      } else {
        showNotification(result.message, 'error');
        console.log('Backup failed:', result.message);
      }
    } catch (error) {
      console.log('Error creating backup:', error);
      showNotification('Unexpected error creating backup', 'error');
    } finally {
      setIsBackupInProgress(false);
    }
  }, [isBackupInProgress, showNotification]);

  const handleImportBackup = useCallback(async () => {
    if (isImportInProgress) return;

    Alert.alert(
      'Import Backup',
      'This will replace all current data with the backup data. Make sure you have a backup file (backup.json) in the Documents/techtrace/ folder.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: async () => {
            setIsImportInProgress(true);
            showNotification('Importing backup...', 'info');

            try {
              // First, try to load the backup file
              const importResult = await BackupService.importBackup();
              
              if (!importResult.success || !importResult.data) {
                showNotification(importResult.message, 'error');
                console.log('Import failed:', importResult.message);
                setIsImportInProgress(false);
                return;
              }

              // Show confirmation with backup details
              Alert.alert(
                'Confirm Import',
                `${importResult.message}\n\nThis will replace all current data. Continue?`,
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => setIsImportInProgress(false) },
                  {
                    text: 'Import',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const restoreResult = await BackupService.restoreFromBackup(importResult.data as BackupData);
                        
                        if (restoreResult.success) {
                          showNotification(restoreResult.message, 'success');
                          console.log('Data restored successfully');
                          
                          // Redirect to auth after successful import
                          setTimeout(() => {
                            router.replace('/auth');
                          }, 2000);
                        } else {
                          showNotification(restoreResult.message, 'error');
                          console.log('Restore failed:', restoreResult.message);
                        }
                      } catch (error) {
                        console.log('Error restoring backup:', error);
                        showNotification('Unexpected error restoring backup', 'error');
                      } finally {
                        setIsImportInProgress(false);
                      }
                    }
                  }
                ]
              );
            } catch (error) {
              console.log('Error importing backup:', error);
              showNotification('Unexpected error importing backup', 'error');
              setIsImportInProgress(false);
            }
          }
        }
      ]
    );
  }, [isImportInProgress, showNotification]);

  const navigateToExport = useCallback(() => {
    router.push('/export');
  }, []);

  const navigateToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, []);

  const navigateToJobs = useCallback(() => {
    router.push('/jobs');
  }, []);

  // Calculate stats for display
  const totalJobs = jobs.length;
  const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
  const totalMinutes = totalAWs * 5;
  const totalTime = CalculationService.formatTime(totalMinutes);

  return (
    <SafeAreaView style={commonStyles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <View style={styles.header}>
        <Text style={commonStyles.title}>Settings</Text>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        
        {/* Data Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Data Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalJobs}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalAWs}</Text>
              <Text style={styles.statLabel}>Total AWs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalTime}</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
          </View>
        </View>

        {/* Backup & Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup & Import</Text>
          <Text style={styles.sectionDescription}>
            Create backups for device migration and restore data from previous backups.
          </Text>
          
          {/* Google Drive Backup */}
          <TouchableOpacity
            style={[styles.button, styles.googleDriveButton]}
            onPress={() => setShowGoogleDriveBackup(true)}
          >
            <Text style={styles.buttonText}>☁️ Google Drive Backup</Text>
          </TouchableOpacity>
          
          {/* Local Backup */}
          <TouchableOpacity
            style={[styles.button, styles.backupButton, isBackupInProgress && styles.buttonDisabled]}
            onPress={handleCreateBackup}
            disabled={isBackupInProgress}
          >
            <Text style={styles.buttonText}>
              {isBackupInProgress ? '⏳ Creating Backup...' : '📤 Create Local Backup'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.importButton, isImportInProgress && styles.buttonDisabled]}
            onPress={handleImportBackup}
            disabled={isImportInProgress}
          >
            <Text style={styles.buttonText}>
              {isImportInProgress ? '⏳ Importing...' : '📥 Import Local Backup'}
            </Text>
          </TouchableOpacity>

          <View style={styles.backupInfo}>
            <Text style={styles.infoTitle}>📁 Local Backup Location</Text>
            <Text style={styles.infoText}>
              Backups are saved to: Documents/techtrace/
            </Text>
            <Text style={styles.infoText}>
              • backup.json - Latest backup file
            </Text>
            <Text style={styles.infoText}>
              • backup_YYYY-MM-DD.json - Dated backups
            </Text>
          </View>
        </View>

        {/* PIN Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Security Settings</Text>
          <Text style={styles.label}>New PIN</Text>
          <TextInput
            style={styles.input}
            value={newPin}
            onChangeText={setNewPin}
            placeholder="Enter new PIN"
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
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdatePin}>
            <Text style={styles.buttonText}>🔄 Update PIN</Text>
          </TouchableOpacity>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Export Data</Text>
          <Text style={styles.sectionDescription}>
            Generate professional PDF reports of your job records.
          </Text>
          <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={navigateToExport}>
            <Text style={styles.buttonText}>📊 Export Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
          
          <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearAllData}>
            <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          <Text style={styles.aboutText}>
            Technician Records App v1.0.0
          </Text>
          <Text style={styles.aboutText}>
            Professional job tracking for vehicle technicians
          </Text>
          <Text style={styles.aboutText}>
            GDPR Compliant • Secure • Reliable
          </Text>
          <Text style={styles.signature}>
            ✍️ Digitally signed by Buckston Rugge
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={navigateToDashboard}>
          <Text style={styles.navButtonText}>🏠 Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToJobs}>
          <Text style={styles.navButtonText}>📋 Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
          <Text style={[styles.navButtonText, styles.activeNavButtonText]}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Google Drive Backup Bottom Sheet */}
      <SimpleBottomSheet
        isVisible={showGoogleDriveBackup}
        onClose={() => setShowGoogleDriveBackup(false)}
      >
        <GoogleDriveBackup onClose={() => setShowGoogleDriveBackup(false)} />
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
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
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  googleDriveButton: {
    backgroundColor: '#4285f4',
  },
  backupButton: {
    backgroundColor: '#34a853',
  },
  importButton: {
    backgroundColor: '#6c757d',
  },
  exportButton: {
    backgroundColor: colors.primary,
  },
  signOutButton: {
    backgroundColor: '#ff9800',
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  backupInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  signature: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  activeNavButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
});
