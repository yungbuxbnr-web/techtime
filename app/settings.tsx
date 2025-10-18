
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { BackupService, BackupData } from '../utils/backupService';
import { CalculationService } from '../utils/calculations';
import { AppSettings, Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import GoogleDriveBackup from '../components/GoogleDriveBackup';
import GoogleDriveImportTally from '../components/GoogleDriveImportTally';
import SimpleBottomSheet from '../components/BottomSheet';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({ pin: '3101', isAuthenticated: false, targetHours: 180 });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [targetHours, setTargetHours] = useState('180');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isImportInProgress, setIsImportInProgress] = useState(false);
  const [showGoogleDriveBackup, setShowGoogleDriveBackup] = useState(false);
  const [showImportTally, setShowImportTally] = useState(false);

  // Deduction dropdown states
  const [deductionCount, setDeductionCount] = useState<number>(1);
  const [deductionType, setDeductionType] = useState<'half' | 'full'>('half');

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
      setTargetHours(String(settingsData.targetHours || 180));
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

  const handleUpdateTargetHours = useCallback(async () => {
    const hours = parseFloat(targetHours);
    
    if (isNaN(hours) || hours <= 0) {
      showNotification('Please enter a valid number of hours', 'error');
      return;
    }

    if (hours > 744) { // Max hours in a month (31 days * 24 hours)
      showNotification('Target hours cannot exceed 744 hours per month', 'error');
      return;
    }

    try {
      const updatedSettings = { ...settings, targetHours: hours };
      await StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      showNotification(`Monthly target updated to ${hours} hours`, 'success');
      console.log('Target hours updated successfully:', hours);
    } catch (error) {
      console.log('Error updating target hours:', error);
      showNotification('Error updating target hours', 'error');
    }
  }, [targetHours, settings, showNotification]);

  const handleSaveDeduction = useCallback(async () => {
    const currentTarget = settings.targetHours || 180;
    const deductionHours = deductionType === 'half' ? 4.25 : 8.5;
    const totalDeduction = deductionCount * deductionHours;
    const newTarget = Math.max(0, currentTarget - totalDeduction);
    
    const deductionTypeText = deductionType === 'half' ? 'Half Day' : 'Full Day';
    const deductionLabel = deductionCount === 1 
      ? `${deductionCount} ${deductionTypeText}` 
      : `${deductionCount} ${deductionTypeText}s`;
    
    Alert.alert(
      'Confirm Deduction',
      `This will deduct ${totalDeduction} hours (${deductionLabel}) from your monthly target.\n\nCurrent Target: ${currentTarget} hours\nDeduction: -${totalDeduction} hours\nNew Target: ${newTarget} hours\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          style: 'default',
          onPress: async () => {
            try {
              const updatedSettings = { ...settings, targetHours: newTarget };
              await StorageService.saveSettings(updatedSettings);
              setSettings(updatedSettings);
              setTargetHours(String(newTarget));
              showNotification(`Deducted ${totalDeduction} hours. New target: ${newTarget} hours`, 'success');
              console.log('Deduction saved successfully:', newTarget);
            } catch (error) {
              console.log('Error saving deduction:', error);
              showNotification('Error updating target hours', 'error');
            }
          }
        }
      ]
    );
  }, [settings, deductionCount, deductionType, showNotification]);

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

  const handleEnsureBackupFolder = useCallback(async () => {
    showNotification('Checking backup folder permissions...', 'info');

    try {
      const result = await BackupService.ensureBackupFolderExists();
      
      if (result.success) {
        showNotification(result.message, 'success');
        console.log('Backup folder ensured successfully');
      } else {
        showNotification(result.message, 'error');
        console.log('Failed to ensure backup folder:', result.message);
      }
    } catch (error) {
      console.log('Error ensuring backup folder:', error);
      showNotification('Unexpected error checking backup folder', 'error');
    }
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

        {/* Monthly Target Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Monthly Target</Text>
          <Text style={styles.sectionDescription}>
            Set your monthly work hours target. This is used to calculate your progress and utilization percentage.
          </Text>
          
          <Text style={styles.label}>Target Hours per Month</Text>
          <TextInput
            style={styles.input}
            value={targetHours}
            onChangeText={setTargetHours}
            placeholder="Enter target hours (e.g., 180)"
            keyboardType="numeric"
            maxLength={5}
          />
          
          <View style={styles.targetInfo}>
            <Text style={styles.infoText}>
              💡 Current target: {settings.targetHours || 180} hours/month
            </Text>
            <Text style={styles.infoText}>
              📅 This equals {Math.round((settings.targetHours || 180) / 4.33)} hours/week
            </Text>
            <Text style={styles.infoText}>
              ⏰ Or about {Math.round((settings.targetHours || 180) / 22)} hours/day (22 working days)
            </Text>
          </View>
          
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdateTargetHours}>
            <Text style={styles.buttonText}>🔄 Update Target Hours</Text>
          </TouchableOpacity>

          {/* Deduction Section with Dropdowns */}
          <View style={styles.deductionSection}>
            <Text style={styles.deductionTitle}>⚡ Deduct Time Off</Text>
            <Text style={styles.deductionDescription}>
              Select the number of days and type to deduct from your monthly target
            </Text>
            
            {/* Number of Deductions Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Number of Deductions</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={deductionCount}
                  onValueChange={(itemValue) => setDeductionCount(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="1" value={1} />
                  <Picker.Item label="2" value={2} />
                  <Picker.Item label="3" value={3} />
                  <Picker.Item label="4" value={4} />
                  <Picker.Item label="5" value={5} />
                  <Picker.Item label="6" value={6} />
                  <Picker.Item label="7" value={7} />
                  <Picker.Item label="8" value={8} />
                  <Picker.Item label="9" value={9} />
                  <Picker.Item label="10" value={10} />
                </Picker>
              </View>
            </View>

            {/* Deduction Type Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Deduction Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={deductionType}
                  onValueChange={(itemValue) => setDeductionType(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Half Day (4.25 hours)" value="half" />
                  <Picker.Item label="Full Day (8.5 hours)" value="full" />
                </Picker>
              </View>
            </View>

            {/* Deduction Preview */}
            <View style={styles.deductionPreview}>
              <Text style={styles.previewLabel}>Deduction Preview:</Text>
              <Text style={styles.previewText}>
                {deductionCount} × {deductionType === 'half' ? '4.25' : '8.5'} hours = {(deductionCount * (deductionType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours
              </Text>
              <Text style={styles.previewText}>
                New Target: {Math.max(0, (settings.targetHours || 180) - (deductionCount * (deductionType === 'half' ? 4.25 : 8.5))).toFixed(2)} hours
              </Text>
            </View>

            {/* Save Deduction Button */}
            <TouchableOpacity 
              style={[styles.button, styles.saveDeductionButton]} 
              onPress={handleSaveDeduction}
            >
              <Text style={styles.buttonText}>💾 Save Deduction</Text>
            </TouchableOpacity>

            <View style={styles.deductionInfo}>
              <Text style={styles.infoText}>
                ℹ️ Use the dropdowns above to select how many days to deduct and whether they are half or full days
              </Text>
              <Text style={styles.infoText}>
                • Half Day = 4.25 hours
              </Text>
              <Text style={styles.infoText}>
                • Full Day = 8.5 hours
              </Text>
              <Text style={styles.infoText}>
                • All calculations are based on the monthly target
              </Text>
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

          {/* Import & Tally from Google Drive */}
          <TouchableOpacity
            style={[styles.button, styles.tallyButton]}
            onPress={() => setShowImportTally(true)}
          >
            <Text style={styles.buttonText}>📊 Import & Tally from Google Drive</Text>
          </TouchableOpacity>
          
          {/* Backup Folder Setup */}
          <TouchableOpacity
            style={[styles.button, styles.setupButton]}
            onPress={handleEnsureBackupFolder}
          >
            <Text style={styles.buttonText}>📁 Setup Backup Folder</Text>
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
            <Text style={styles.infoTitle}>📁 Backup & Import Information</Text>
            <Text style={styles.infoText}>
              • Local backups: Documents/techtrace/
            </Text>
            <Text style={styles.infoText}>
              • Google Drive: Cloud backup & restore
            </Text>
            <Text style={styles.infoText}>
              • Import & Tally: Analyze backup data with detailed statistics
            </Text>
            <Text style={styles.infoText}>
              • Use "Setup Backup Folder" to ensure proper permissions
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

      {/* Import & Tally Bottom Sheet */}
      <SimpleBottomSheet
        isVisible={showImportTally}
        onClose={() => setShowImportTally(false)}
      >
        <GoogleDriveImportTally onClose={() => setShowImportTally(false)} />
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
  targetInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deductionSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deductionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  deductionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  deductionPreview: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  saveDeductionButton: {
    backgroundColor: '#2196f3',
    marginBottom: 16,
  },
  deductionInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
  tallyButton: {
    backgroundColor: '#9c27b0',
  },
  setupButton: {
    backgroundColor: '#ff9800',
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
