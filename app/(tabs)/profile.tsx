
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import { StorageService } from "@/utils/storage";
import { CalculationService } from "@/utils/calculations";
import { AppSettings, Job } from "@/types";
import NotificationToast from "@/components/NotificationToast";
import ProfileSettings from "@/components/ProfileSettings";
import AbsenceLogger from "@/components/AbsenceLogger";
import SecuritySettings from "@/components/SecuritySettings";

export default function ProfileScreen() {
  const { theme, colors, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({ 
    pin: '3101', 
    isAuthenticated: false, 
    targetHours: 180, 
    absenceHours: 0, 
    theme: 'light' 
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicianName, setTechnicianName] = useState('');
  const [notification, setNotification] = useState({ 
    visible: false, 
    message: '', 
    type: 'info' as const 
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const isMounted = useRef(true);
  const isNavigating = useRef(false);
  const navigationTimeout = useRef<NodeJS.Timeout | null>(null);

  const isDarkMode = theme === 'dark';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
      }
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
        console.log('[Profile] Data loaded successfully');
      }
    } catch (error) {
      console.log('[Profile] Error loading data:', error);
      if (isMounted.current) {
        showNotification('Error loading data', 'error');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleTheme = useCallback(async () => {
    try {
      await toggleTheme();
      const newTheme = theme === 'light' ? 'dark' : 'light';
      showNotification(`Switched to ${newTheme} mode`, 'success');
      console.log('[Profile] Theme updated to:', newTheme);
    } catch (error) {
      console.log('[Profile] Error updating theme:', error);
      showNotification('Error updating theme', 'error');
    }
  }, [theme, toggleTheme, showNotification]);

  const handleSignOut = useCallback(async () => {
    try {
      const updatedSettings = { ...settings, isAuthenticated: false };
      await StorageService.saveSettings(updatedSettings);
      console.log('[Profile] User signed out');
      if (isMounted.current) {
        router.replace('/auth');
      }
    } catch (error) {
      console.log('[Profile] Error signing out:', error);
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
              console.log('[Profile] All data cleared');
              setTimeout(() => {
                if (isMounted.current) {
                  router.replace('/auth');
                }
              }, 1500);
            } catch (error) {
              console.log('[Profile] Error clearing data:', error);
              showNotification('Error clearing data', 'error');
            }
          }
        }
      ]
    );
  }, [showNotification]);

  const safeNavigate = useCallback((path: string) => {
    if (isNavigating.current) {
      console.log('[Profile] Navigation already in progress, ignoring');
      return;
    }
    
    if (!isMounted.current) {
      console.log('[Profile] Component unmounted, canceling navigation');
      return;
    }
    
    isNavigating.current = true;
    
    try {
      console.log('[Profile] Navigating to:', path);
      router.push(path);
      
      navigationTimeout.current = setTimeout(() => {
        isNavigating.current = false;
      }, 1000);
    } catch (error) {
      console.log('[Profile] Navigation error:', error);
      isNavigating.current = false;
      showNotification('Navigation error. Please try again.', 'error');
    }
  }, [showNotification]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.title, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalJobs = jobs.length;
  const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
  const totalMinutes = totalAWs * 5;
  const totalTime = CalculationService.formatTime(totalMinutes);
  const securityEnabled = settings.pin && settings.pin !== 'DISABLED';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Profile & Settings</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Technician Profile */}
        <ProfileSettings
          technicianName={technicianName}
          onUpdate={async (name) => {
            try {
              await StorageService.setTechnicianName(name);
              if (isMounted.current) {
                setTechnicianName(name);
                showNotification(`Name updated to ${name}`, 'success');
              }
            } catch (error) {
              console.log('[Profile] Error updating name:', error);
              showNotification('Error updating name', 'error');
            }
          }}
          colors={colors}
        />

        {/* Theme Settings */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🎨 Appearance</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose between light and dark theme
          </Text>
          
          <View style={[styles.themeToggleContainer, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
            <View style={styles.themeToggleLeft}>
              <Text style={[styles.themeToggleLabel, { color: colors.text }]}>☀️ Light Mode</Text>
              <Text style={[styles.themeToggleSubtext, { color: colors.textSecondary }]}>
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
              <Text style={[styles.themeToggleLabel, { color: colors.text }]}>🌙 Dark Mode</Text>
              <Text style={[styles.themeToggleSubtext, { color: colors.textSecondary }]}>
                {isDarkMode ? 'Currently active' : 'Switch to dark theme'}
              </Text>
            </View>
          </View>
        </View>

        {/* Data Summary */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Data Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{totalJobs}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Jobs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{totalAWs}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total AWs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{totalTime}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Time</Text>
            </View>
          </View>
        </View>

        {/* Absence Logger */}
        <AbsenceLogger
          settings={settings}
          onUpdate={async (updatedSettings) => {
            try {
              await StorageService.saveSettings(updatedSettings);
              if (isMounted.current) {
                setSettings(updatedSettings);
                showNotification('Settings updated successfully', 'success');
              }
            } catch (error) {
              console.log('[Profile] Error updating settings:', error);
              showNotification('Error updating settings', 'error');
            }
          }}
          colors={colors}
        />

        {/* Work Schedule & Time Tracking */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⏰ Work Schedule & Time Tracking</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Configure your work hours, lunch breaks, and work days. Enable automatic time tracking to monitor your daily progress.
          </Text>
          <TouchableOpacity style={[styles.button, styles.metricsButton]} onPress={() => safeNavigate('/work-schedule')}>
            <Text style={styles.buttonText}>📅 Edit Work Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* App Permissions */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔐 App Permissions</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Manage app permissions for notifications, background execution, and storage access. View permission status and request missing permissions.
          </Text>
          <TouchableOpacity style={[styles.button, styles.permissionsButton]} onPress={() => safeNavigate('/permissions')}>
            <Text style={styles.buttonText}>🔓 Manage Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Preferences */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔔 Notification Preferences</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Customize notification settings, choose which notifications to receive, and test notification delivery.
          </Text>
          <TouchableOpacity style={[styles.button, styles.metricsButton]} onPress={() => safeNavigate('/notification-settings')}>
            <Text style={styles.buttonText}>🔔 Notification Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics & Formulas */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📐 Metrics & Formulas</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
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
            try {
              await StorageService.saveSettings(updatedSettings);
              if (isMounted.current) {
                setSettings(updatedSettings);
                showNotification('Security settings updated', 'success');
              }
            } catch (error) {
              console.log('[Profile] Error updating security:', error);
              showNotification('Error updating security settings', 'error');
            }
          }}
          colors={colors}
        />

        {/* Export & Import Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📄 Export & Import Data</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Export job records to PDF or JSON, or import jobs from a JSON file.
          </Text>
          <TouchableOpacity style={[styles.button, styles.exportButton, { backgroundColor: colors.primary }]} onPress={() => safeNavigate('/export-reports')}>
            <Text style={styles.buttonText}>📊 Export Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.importButton]} onPress={() => safeNavigate('/import-jobs')}>
            <Text style={styles.buttonText}>📥 Import Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Danger Zone</Text>
          
          {securityEnabled && (
            <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
              <Text style={styles.buttonText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.button, styles.dangerButton, { backgroundColor: colors.error }]} onPress={handleClearAllData}>
            <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>❓ Help & Support</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Access the complete user guide with detailed instructions on how to use every feature of the app, including security settings.
          </Text>
          <TouchableOpacity style={[styles.button, styles.helpButton]} onPress={() => safeNavigate('/help')}>
            <Text style={styles.buttonText}>📖 Open User Guide</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ℹ️ About</Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            Technician Records App v1.0.0
          </Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            Professional job tracking for vehicle technicians
          </Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            Privacy Focused • Secure • Reliable
          </Text>
          <Text style={[styles.signature, { color: colors.primary }]}>
            ✍️ Digitally signed by {technicianName || 'Technician'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  themeToggleSubtext: {
    fontSize: 12,
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
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  signature: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
});
