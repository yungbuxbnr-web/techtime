
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { MonthlyResetService } from '../utils/monthlyReset';
import { AppSettings, Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';
import AbsenceLogger from '../components/AbsenceLogger';
import SecuritySettings from '../components/SecuritySettings';
import ProfileSettings from '../components/ProfileSettings';

export default function SettingsScreen() {
  const { theme, colors, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({ pin: '3101', isAuthenticated: false, targetHours: 180, absenceHours: 0, theme: 'light' });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicianName, setTechnicianName] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isLoading, setIsLoading] = useState(true);
  
  const isMounted = useRef(true);
  const isNavigating = useRef(false);

  const isDarkMode = theme === 'dark';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    if (isMounted.current) {
      setNotification({ visible: true, message, type });
    }
  }, []);

  const hideNotification = useCallback(() => {
    if (isMounted.current) {
      setNotification(prev => ({ ...prev, visible: false }));
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [settingsData, jobsData, name] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getJobs(),
        StorageService.getTechnicianName()
      ]);
      
      if (isMounted.current) {
        setSettings(settingsData);
        setJobs(jobsData);
        setTechnicianName(name || '');
        console.log('Settings and jobs loaded successfully');
      }
    } catch (error) {
      console.log('Error loading data:', error);
      if (isMounted.current) {
        showNotification('Error loading data', 'error');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [showNotification]);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const settingsData = await StorageService.getSettings();
      
      // Only check authentication if security is enabled
      if (settingsData.pin && settingsData.pin !== 'DISABLED' && !settingsData.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      
      // Check for monthly reset
      try {
        const resetResult = await MonthlyResetService.checkAndResetIfNewMonth();
        if (resetResult.wasReset) {
          console.log('[Settings] Monthly reset completed:', resetResult);
        }
      } catch (resetError) {
        console.log('[Settings] Error checking monthly reset:', resetError);
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

  const safeNavigate = useCallback((path: string) => {
    if (isNavigating.current) {
      console.log('Navigation already in progress');
      return;
    }
    
    isNavigating.current = true;
    
    try {
      router.push(path);
    } catch (error) {
      console.log('Navigation error:', error);
      isNavigating.current = false;
      showNotification('Navigation error. Please try again.', 'error');
    }
  }, [showNotification]);

  const navigateToDashboard = useCallback(() => {
    safeNavigate('/dashboard');
  }, [safeNavigate]);

  const navigateToJobs = useCallback(() => {
    safeNavigate('/jobs');
  }, [safeNavigate]);

  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[commonStyles.title, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalJobs = jobs.length;
  const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
  const totalMinutes = totalAWs * 5;
  const totalTime = CalculationService.formatTime(totalMinutes);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthAbsenceHours = (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) 
    ? (settings.absenceHours || 0) 
    : 0;

  const styles = createStyles(colors);
  const securityEnabled = settings.pin && settings.pin !== 'DISABLED';

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
        
        {/* Technician Profile */}
        <ProfileSettings
          technicianName={technicianName}
          onUpdate={async (name) => {
            await StorageService.setTechnicianName(name);
            setTechnicianName(name);
            showNotification(`Name updated to ${name}`, 'success');
          }}
          colors={colors}
        />

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

        {/* Absence Logger */}
        <AbsenceLogger
          settings={settings}
          onUpdate={async (updatedSettings) => {
            await StorageService.saveSettings(updatedSettings);
            setSettings(updatedSettings);
            showNotification('Settings updated successfully', 'success');
          }}
          colors={colors}
        />

        {/* Work Schedule & Time Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Work Schedule & Time Tracking</Text>
          <Text style={styles.sectionDescription}>
            Configure your work hours, lunch breaks, and work days. Enable automatic time tracking to monitor your daily progress.
          </Text>
          <TouchableOpacity style={[styles.button, styles.metricsButton]} onPress={() => safeNavigate('/work-schedule')}>
            <Text style={styles.buttonText}>📅 Edit Work Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* App Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 App Permissions</Text>
          <Text style={styles.sectionDescription}>
            Manage app permissions for notifications, background execution, and storage access. View permission status and request missing permissions.
          </Text>
          <TouchableOpacity style={[styles.button, styles.permissionsButton]} onPress={() => safeNavigate('/permissions')}>
            <Text style={styles.buttonText}>🔓 Manage Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notification Preferences</Text>
          <Text style={styles.sectionDescription}>
            Customize notification settings, choose which notifications to receive, and test notification delivery.
          </Text>
          <TouchableOpacity style={[styles.button, styles.metricsButton]} onPress={() => safeNavigate('/notification-settings')}>
            <Text style={styles.buttonText}>🔔 Notification Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics & Formulas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📐 Metrics & Formulas</Text>
          <Text style={styles.sectionDescription}>
            Customize the calculation formulas used throughout the app for AWs, efficiency, and performance metrics.
          </Text>
          <TouchableOpacity style={[styles.button, styles.metricsButton]} onPress={() => safeNavigate('/metrics')}>
            <Text style={styles.buttonText}>⚙️ Edit Formulas</Text>
          </TouchableOpacity>
        </View>

        {/* Security Settings */}
        <SecuritySettings
          settings={settings}
          onUpdate={async (updatedSettings) => {
            await StorageService.saveSettings(updatedSettings);
            setSettings(updatedSettings);
            showNotification('Security settings updated', 'success');
          }}
          colors={colors}
        />

        {/* Export & Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Export & Import Data</Text>
          <Text style={styles.sectionDescription}>
            Export job records to PDF or JSON, or import jobs from a JSON file.
          </Text>
          <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={() => safeNavigate('/export-reports')}>
            <Text style={styles.buttonText}>📊 Export Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.importButton]} onPress={() => safeNavigate('/import-jobs')}>
            <Text style={styles.buttonText}>📥 Import Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
          
          {securityEnabled && (
            <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
              <Text style={styles.buttonText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearAllData}>
            <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Help & Support</Text>
          <Text style={styles.sectionDescription}>
            Access the complete user guide with detailed instructions on how to use every feature of the app, including security settings.
          </Text>
          <TouchableOpacity style={[styles.button, styles.helpButton]} onPress={() => safeNavigate('/help')}>
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
            Privacy Focused • Secure • Reliable
          </Text>
          <Text style={styles.signature}>
            ✍️ Digitally signed by {technicianName || 'Technician'}
          </Text>
        </View>
        
        {/* Bottom padding to avoid content being hidden behind bottom nav */}
        <View style={{ height: 100 }} />
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
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
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricsButton: {
    backgroundColor: '#6f42c1',
  },
  permissionsButton: {
    backgroundColor: '#3b82f6',
  },
  exportButton: {
    backgroundColor: colors.primary,
  },
  importButton: {
    backgroundColor: '#10b981',
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
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
