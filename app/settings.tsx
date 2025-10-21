
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { StorageService } from '../utils/storage';
import { BackupService, BackupData } from '../utils/backupService';
import { BiometricService } from '../utils/biometricService';
import { PDFImportService } from '../utils/pdfImportService';
import { CalculationService } from '../utils/calculations';
import { AppSettings, Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import GoogleDriveBackup from '../components/GoogleDriveBackup';
import GoogleDriveImportTally from '../components/GoogleDriveImportTally';
import SimpleBottomSheet from '../components/BottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen() {
  const { theme, colors, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({ pin: '3101', isAuthenticated: false, targetHours: 180, absenceHours: 0, theme: 'light' });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [targetHours, setTargetHours] = useState('180');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isImportInProgress, setIsImportInProgress] = useState(false);
  const [showGoogleDriveBackup, setShowGoogleDriveBackup] = useState(false);
  const [showImportTally, setShowImportTally] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

  // Absence logger dropdown states
  const [numberOfAbsentDays, setNumberOfAbsentDays] = useState<number>(1);
  const [absenceType, setAbsenceType] = useState<'half' | 'full'>('full');
  const [deductionType, setDeductionType] = useState<'monthly' | 'available'>('monthly');

  const isDarkMode = theme === 'dark';

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
    checkBiometricAvailability();
  }, [checkAuthAndLoadData]);

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

  const handleToggleTheme = useCallback(async () => {
    try {
      await toggleTheme();
      const newTheme = theme === 'light' ? 'dark' : 'light';
      showNotification(`Switched to ${newTheme} mode`, 'success');
      console.log('Theme updated to:', newTheme);
    } catch (error) {
      console.log('Error updating theme:', error);
      showNotification('Error updating theme', 'error');
    }
  }, [theme, toggleTheme, showNotification]);

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

    if (hours > 744) {
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

  const handleLogAbsence = useCallback(async () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const hoursPerDay = absenceType === 'half' ? 4.25 : 8.5;
    const absenceHours = numberOfAbsentDays * hoursPerDay;
    
    const absenceTypeText = absenceType === 'half' ? 'Half Day' : 'Full Day';
    const dayLabel = numberOfAbsentDays === 1 
      ? `${numberOfAbsentDays} ${absenceTypeText}` 
      : `${numberOfAbsentDays} ${absenceTypeText}s`;
    
    // Check if we need to reset absence hours for a new month
    let currentAbsenceHours = settings.absenceHours || 0;
    if (settings.absenceMonth !== currentMonth || settings.absenceYear !== currentYear) {
      // New month, reset absence hours
      currentAbsenceHours = 0;
      console.log('New month detected, resetting absence hours');
    }
    
    if (deductionType === 'monthly') {
      // Deduct from monthly target hours
      const currentTarget = settings.targetHours || 180;
      const newTargetHours = Math.max(0, currentTarget - absenceHours);
      
      Alert.alert(
        'Log Absence - Monthly Target',
        `This will deduct ${absenceHours.toFixed(2)} hours from your monthly target hours:\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay} hours = ${absenceHours.toFixed(2)} hours\n\n📈 Monthly Target Update:\nCurrent Target: ${currentTarget} hours\nAbsence Deduction: -${absenceHours.toFixed(2)} hours\nNew Monthly Target: ${newTargetHours.toFixed(2)} hours\n\n✅ The monthly target progress circle will update automatically.\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Absence',
            style: 'default',
            onPress: async () => {
              try {
                const updatedSettings = { 
                  ...settings, 
                  targetHours: newTargetHours,
                  absenceMonth: currentMonth,
                  absenceYear: currentYear
                };
                await StorageService.saveSettings(updatedSettings);
                setSettings(updatedSettings);
                setTargetHours(String(newTargetHours));
                showNotification(`Absence logged! New monthly target: ${newTargetHours.toFixed(2)}h`, 'success');
                console.log('Absence logged successfully. New target:', newTargetHours);
              } catch (error) {
                console.log('Error logging absence:', error);
                showNotification('Error logging absence', 'error');
              }
            }
          }
        ]
      );
    } else {
      // Deduct from total available hours (for efficiency calculations)
      const newAbsenceHours = currentAbsenceHours + absenceHours;
      
      Alert.alert(
        'Log Absence - Available Hours',
        `This will deduct ${absenceHours.toFixed(2)} hours from your total available hours (used in efficiency calculations):\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay} hours = ${absenceHours.toFixed(2)} hours\n\n⏰ Available Hours Update:\nCurrent Absence This Month: ${currentAbsenceHours.toFixed(2)} hours\nNew Absence Deduction: +${absenceHours.toFixed(2)} hours\nTotal Absence This Month: ${newAbsenceHours.toFixed(2)} hours\n\n✅ The efficiency circle will update automatically.\n(This will NOT affect your monthly target hours)\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Absence',
            style: 'default',
            onPress: async () => {
              try {
                const updatedSettings = { 
                  ...settings, 
                  absenceHours: newAbsenceHours,
                  absenceMonth: currentMonth,
                  absenceYear: currentYear
                };
                await StorageService.saveSettings(updatedSettings);
                setSettings(updatedSettings);
                showNotification(`Absence logged! Total absence: ${newAbsenceHours.toFixed(2)}h`, 'success');
                console.log('Absence logged successfully. Total absence hours:', newAbsenceHours);
              } catch (error) {
                console.log('Error logging absence:', error);
                showNotification('Error logging absence', 'error');
              }
            }
          }
        ]
      );
    }
  }, [settings, numberOfAbsentDays, absenceType, deductionType, showNotification]);

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
              const importResult = await BackupService.importBackup();
              
              if (!importResult.success || !importResult.data) {
                showNotification(importResult.message, 'error');
                console.log('Import failed:', importResult.message);
                setIsImportInProgress(false);
                return;
              }

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

  const handleImportFromFile = useCallback(async () => {
    if (isImportInProgress) return;

    setIsImportInProgress(true);
    showNotification('Opening file picker...', 'info');

    try {
      const importResult = await PDFImportService.importFile();
      
      if (!importResult.success || !importResult.data) {
        showNotification(importResult.message || 'Failed to import file', 'error');
        console.log('Import failed:', importResult.message);
        setIsImportInProgress(false);
        return;
      }

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
      console.log('Error importing file:', error);
      showNotification('Unexpected error importing file', 'error');
      setIsImportInProgress(false);
    }
  }, [isImportInProgress, showNotification]);

  const handleShareBackup = useCallback(async () => {
    try {
      showNotification('Creating shareable backup...', 'info');
      
      const result = await BackupService.createBackup();
      
      if (!result.success || !result.filePath) {
        showNotification(result.message, 'error');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        showNotification('Sharing is not available on this device', 'error');
        return;
      }

      // Share the backup file
      await Sharing.shareAsync(result.filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share Backup File',
      });

      showNotification('Backup file ready to share!', 'success');
      console.log('Backup file shared successfully');
    } catch (error) {
      console.log('Error sharing backup:', error);
      showNotification('Error sharing backup file', 'error');
    }
  }, [showNotification]);

  const handleToggleBiometric = useCallback(async () => {
    try {
      if (settings.biometricEnabled) {
        // Disable biometric
        const result = await BiometricService.disableBiometricLogin();
        if (result.success) {
          const updatedSettings = { ...settings, biometricEnabled: false };
          await StorageService.saveSettings(updatedSettings);
          setSettings(updatedSettings);
          showNotification(result.message, 'success');
        } else {
          showNotification(result.message, 'error');
        }
      } else {
        // Enable biometric
        const result = await BiometricService.enableBiometricLogin();
        if (result.success) {
          const updatedSettings = { ...settings, biometricEnabled: true };
          await StorageService.saveSettings(updatedSettings);
          setSettings(updatedSettings);
          showNotification(result.message, 'success');
        } else {
          showNotification(result.message, 'error');
        }
      }
    } catch (error) {
      console.log('Error toggling biometric:', error);
      showNotification('Error updating biometric settings', 'error');
    }
  }, [settings, showNotification]);

  const navigateToExport = useCallback(() => {
    router.push('/export');
  }, []);

  const navigateToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, []);

  const navigateToJobs = useCallback(() => {
    router.push('/jobs');
  }, []);

  const totalJobs = jobs.length;
  const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
  const totalMinutes = totalAWs * 5;
  const totalTime = CalculationService.formatTime(totalMinutes);

  // Get current month's absence hours
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthAbsenceHours = (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) 
    ? (settings.absenceHours || 0) 
    : 0;

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <View style={styles.header}>
        <Text style={[commonStyles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        
        {/* Theme Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Appearance</Text>
          <Text style={styles.sectionDescription}>
            Choose between light and dark theme
          </Text>
          
          <View style={styles.themeToggleContainer}>
            <View style={styles.themeToggleLeft}>
              <Text style={styles.themeToggleLabel}>☀️ Light Mode</Text>
              <Text style={styles.themeToggleSubtext}>
                {isDarkMode ? 'Switch to light theme' : 'Currently active'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDarkMode ? colors.background : colors.background}
            />
            <View style={styles.themeToggleRight}>
              <Text style={styles.themeToggleLabel}>🌙 Dark Mode</Text>
              <Text style={styles.themeToggleSubtext}>
                {isDarkMode ? 'Currently active' : 'Switch to dark theme'}
              </Text>
            </View>
          </View>
        </View>

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
          <Text style={styles.sectionTitle}>🎯 Monthly Target Hours</Text>
          <Text style={styles.sectionDescription}>
            Set your monthly work hours target. This is used to calculate your progress and utilization percentage.
          </Text>
          
          <Text style={styles.label}>Target Hours per Month</Text>
          <TextInput
            style={styles.input}
            value={targetHours}
            onChangeText={setTargetHours}
            placeholder="Enter target hours (e.g., 180)"
            placeholderTextColor={colors.textSecondary}
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
            {currentMonthAbsenceHours > 0 && (
              <Text style={[styles.infoText, { color: colors.error, fontWeight: '600' }]}>
                🏖️ Total absence this month: {currentMonthAbsenceHours.toFixed(2)} hours
              </Text>
            )}
          </View>
          
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdateTargetHours}>
            <Text style={styles.buttonText}>🔄 Update Target Hours</Text>
          </TouchableOpacity>

          {/* Absence Logger Section */}
          <View style={styles.absenceLoggerSection}>
            <Text style={styles.absenceLoggerTitle}>🏖️ Absence Logger</Text>
            <Text style={styles.absenceLoggerDescription}>
              Log absences to automatically adjust your hours. Choose whether to deduct from monthly target hours or total available hours for efficiency calculations.
            </Text>
            
            {/* Number of Absent Days Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Number of Absent Days</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={numberOfAbsentDays}
                  onValueChange={(itemValue) => setNumberOfAbsentDays(itemValue)}
                  style={styles.picker}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <Picker.Item key={day} label={`${day} ${day === 1 ? 'day' : 'days'}`} value={day} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Absence Type Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Absence Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={absenceType}
                  onValueChange={(itemValue) => setAbsenceType(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Half Day (4.25 hours)" value="half" />
                  <Picker.Item label="Full Day (8.5 hours)" value="full" />
                </Picker>
              </View>
            </View>

            {/* Deduction Type Dropdown - NEW */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Deduction Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={deductionType}
                  onValueChange={(itemValue) => setDeductionType(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Monthly Target Hours" value="monthly" />
                  <Picker.Item label="Total Available Hours" value="available" />
                </Picker>
              </View>
              <Text style={styles.dropdownHint}>
                {deductionType === 'monthly' 
                  ? '📊 Will reduce your monthly target hours (affects progress circle)' 
                  : '⏰ Will reduce available hours for efficiency calculations (affects efficiency circle)'}
              </Text>
            </View>

            {/* Absence Preview */}
            <View style={styles.absencePreview}>
              <Text style={styles.previewLabel}>📋 Absence Calculation Preview:</Text>
              <Text style={styles.previewText}>
                {numberOfAbsentDays} {numberOfAbsentDays === 1 ? 'day' : 'days'} × {absenceType === 'half' ? '4.25' : '8.5'} hours = {(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours deducted
              </Text>
              <View style={styles.previewCalculation}>
                {deductionType === 'monthly' ? (
                  <>
                    <Text style={styles.previewCalcText}>
                      Current Target: {(settings.targetHours || 180).toFixed(2)} hours
                    </Text>
                    <Text style={styles.previewCalcText}>
                      Absence Deduction: -{(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours
                    </Text>
                    <View style={styles.previewDivider} />
                    <Text style={styles.previewHighlight}>
                      New Monthly Target: {Math.max(0, (settings.targetHours || 180) - (numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5))).toFixed(2)} hours
                    </Text>
                    <Text style={[styles.previewNote, { color: colors.textSecondary }]}>
                      ℹ️ This will affect your monthly target progress circle
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.previewCalcText}>
                      Current Absence This Month: {currentMonthAbsenceHours.toFixed(2)} hours
                    </Text>
                    <Text style={styles.previewCalcText}>
                      New Absence Deduction: +{(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours
                    </Text>
                    <View style={styles.previewDivider} />
                    <Text style={styles.previewHighlight}>
                      Total Absence This Month: {(currentMonthAbsenceHours + (numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5))).toFixed(2)} hours
                    </Text>
                    <Text style={[styles.previewNote, { color: colors.textSecondary }]}>
                      ℹ️ This will affect your efficiency calculations only
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Log Absence Button */}
            <TouchableOpacity 
              style={[styles.button, styles.logAbsenceButton]} 
              onPress={handleLogAbsence}
            >
              <Text style={styles.buttonText}>✅ Log Absence & Update Hours</Text>
            </TouchableOpacity>

            <View style={styles.absenceLoggerInfo}>
              <Text style={styles.infoTitle}>ℹ️ How Absence Logging Works:</Text>
              <Text style={styles.infoText}>
                • Half Day = 4.25 hours deducted
              </Text>
              <Text style={styles.infoText}>
                • Full Day = 8.5 hours deducted
              </Text>
              <Text style={styles.infoText}>
                • Monthly Target Hours: Reduces your monthly target permanently
              </Text>
              <Text style={styles.infoText}>
                • Total Available Hours: Reduces hours for efficiency calculations
              </Text>
              <Text style={styles.infoText}>
                • Progress circles update automatically based on deduction type
              </Text>
              <Text style={styles.infoText}>
                • Absence hours reset automatically each new month
              </Text>
              <Text style={styles.infoText}>
                • Example: 2 full days absent = 17h deducted from selected type
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
          
          <TouchableOpacity
            style={[styles.button, styles.googleDriveButton]}
            onPress={() => setShowGoogleDriveBackup(true)}
          >
            <Text style={styles.buttonText}>☁️ Google Drive Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.tallyButton]}
            onPress={() => setShowImportTally(true)}
          >
            <Text style={styles.buttonText}>📊 Import & Tally from Google Drive</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.setupButton]}
            onPress={handleEnsureBackupFolder}
          >
            <Text style={styles.buttonText}>📁 Setup Backup Folder</Text>
          </TouchableOpacity>
          
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

          <TouchableOpacity
            style={[styles.button, styles.filePickerButton, isImportInProgress && styles.buttonDisabled]}
            onPress={handleImportFromFile}
            disabled={isImportInProgress}
          >
            <Text style={styles.buttonText}>
              {isImportInProgress ? '⏳ Importing...' : '📂 Import from File (JSON/PDF)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.shareButton]}
            onPress={handleShareBackup}
          >
            <Text style={styles.buttonText}>📤 Share Backup (App-to-App)</Text>
          </TouchableOpacity>

          <View style={styles.backupInfo}>
            <Text style={styles.infoTitle}>📁 Backup & Import Information</Text>
            <Text style={styles.infoText}>
              - Local backups: Documents/techtrace/
            </Text>
            <Text style={styles.infoText}>
              - Google Drive: Cloud backup & restore
            </Text>
            <Text style={styles.infoText}>
              - Import & Tally: Analyze backup data with detailed statistics
            </Text>
            <Text style={styles.infoText}>
              - Import from File: Pick JSON backup files from anywhere
            </Text>
            <Text style={styles.infoText}>
              - Share Backup: Transfer to another device via any sharing method
            </Text>
            <Text style={styles.infoText}>
              - Use &quot;Setup Backup Folder&quot; to ensure proper permissions
            </Text>
          </View>
        </View>

        {/* Metrics & Formulas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📐 Metrics & Formulas</Text>
          <Text style={styles.sectionDescription}>
            Customize the calculation formulas used throughout the app for AWs, efficiency, and performance metrics.
          </Text>
          <TouchableOpacity style={[styles.button, styles.metricsButton]} onPress={() => router.push('/metrics')}>
            <Text style={styles.buttonText}>⚙️ Edit Formulas</Text>
          </TouchableOpacity>
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
          
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdatePin}>
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

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Help & Support</Text>
          <Text style={styles.sectionDescription}>
            Access the complete user guide with detailed instructions on how to use every feature of the app. Export the guide as PDF for offline reference or sharing.
          </Text>
          <TouchableOpacity style={[styles.button, styles.helpButton]} onPress={() => router.push('/help')}>
            <Text style={styles.buttonText}>📖 Open User Guide</Text>
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

const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
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
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeToggleLeft: {
    flex: 1,
  },
  themeToggleRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  themeToggleSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.text,
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
  absenceLoggerSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  absenceLoggerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  absenceLoggerDescription: {
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
    color: colors.text,
  },
  dropdownHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  absencePreview: {
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
    marginBottom: 12,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  previewCalculation: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  previewCalcText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  previewHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  previewNote: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  logAbsenceButton: {
    backgroundColor: '#e74c3c',
    marginBottom: 16,
  },
  absenceLoggerInfo: {
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
  filePickerButton: {
    backgroundColor: '#17a2b8',
  },
  shareButton: {
    backgroundColor: '#28a745',
  },
  metricsButton: {
    backgroundColor: '#6f42c1',
  },
  exportButton: {
    backgroundColor: colors.primary,
  },
  helpButton: {
    backgroundColor: '#9c27b0',
  },
  signOutButton: {
    backgroundColor: '#ff9800',
  },
  dangerButton: {
    backgroundColor: colors.error,
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
  buttonText: {
    color: '#ffffff',
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
    color: '#ffffff',
    fontWeight: '600',
  },
});
