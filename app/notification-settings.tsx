
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { NotificationService, NotificationSettings } from '../utils/notificationService';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    workStartEnabled: true,
    lunchStartEnabled: true,
    lunchEndEnabled: true,
    workEndEnabled: true,
    recordSavedEnabled: true,
    jobExportedEnabled: true,
    monthlyReportEnabled: true,
    saturdayReminderEnabled: true,
  });
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [hasPermission, setHasPermission] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await NotificationService.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.log('Error loading notification settings:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.log('Error checking permissions:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        showNotification('Notification permissions granted!', 'success');
      } else {
        showNotification('Notification permissions denied', 'error');
      }
    } catch (error) {
      console.log('Error requesting permissions:', error);
      showNotification('Error requesting permissions', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await NotificationService.saveSettings(settings);
      showNotification('Notification settings saved successfully!', 'success');
      console.log('Notification settings saved:', settings);
    } catch (error) {
      console.log('Error saving notification settings:', error);
      showNotification('Error saving settings', 'error');
    }
  };

  const handleToggleMaster = async (value: boolean) => {
    const newSettings = { ...settings, enabled: value };
    setSettings(newSettings);
    
    if (!value) {
      // Cancel all notifications when disabled
      await NotificationService.cancelAllNotifications();
      showNotification('All notifications cancelled', 'info');
    }
  };

  const handleTestNotification = async () => {
    try {
      if (!hasPermission) {
        showNotification('Please grant notification permissions first', 'error');
        return;
      }

      await NotificationService.sendTestNotification();
      showNotification('Test notification sent!', 'success');
    } catch (error) {
      console.log('Error sending test notification:', error);
      showNotification('Error sending test notification', 'error');
    }
  };

  const handleViewScheduled = async () => {
    try {
      const scheduled = await NotificationService.getScheduledNotifications();
      
      if (scheduled.length === 0) {
        Alert.alert(
          'Scheduled Notifications',
          'No notifications are currently scheduled.\n\nMake sure you have:\n1. Enabled notifications\n2. Set up your work schedule\n3. Saved your work schedule settings',
          [{ text: 'OK' }]
        );
      } else {
        const notificationList = scheduled.map((notif, index) => {
          const trigger = notif.trigger as any;
          const date = trigger?.date ? new Date(trigger.date) : null;
          return `${index + 1}. ${notif.content.title}\n   ${date ? date.toLocaleString() : 'Unknown time'}`;
        }).join('\n\n');

        Alert.alert(
          'Scheduled Notifications',
          `You have ${scheduled.length} notification(s) scheduled:\n\n${notificationList}`,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.log('Error viewing scheduled notifications:', error);
      showNotification('Error viewing scheduled notifications', 'error');
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Permission Status</Text>
          <View style={[
            styles.permissionBox,
            { backgroundColor: hasPermission ? colors.success + '20' : colors.error + '20' }
          ]}>
            <Text style={[
              styles.permissionText,
              { color: hasPermission ? colors.success : colors.error }
            ]}>
              {hasPermission ? '✅ Notifications Enabled' : '❌ Notifications Disabled'}
            </Text>
          </View>
          
          {!hasPermission && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={requestPermissions}
            >
              <Text style={styles.buttonText}>Grant Notification Permissions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>🔔 Enable All Notifications</Text>
              <Text style={styles.switchSubtext}>
                Master switch for all app notifications
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleMaster}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.enabled ? colors.background : colors.background}
            />
          </View>
        </View>

        {/* Work Schedule Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Work Schedule Notifications</Text>
          <Text style={styles.sectionDescription}>
            Notifications related to your daily work schedule
          </Text>

          <View style={styles.notificationToggles}>
            {/* Work Start */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>🏢</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Work Start</Text>
                  <Text style={styles.toggleSubtext}>Notify when work day begins</Text>
                </View>
              </View>
              <Switch
                value={settings.workStartEnabled}
                onValueChange={(value) => setSettings({ ...settings, workStartEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.workStartEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>

            {/* Lunch Start */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>🍽️</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Lunch Start</Text>
                  <Text style={styles.toggleSubtext}>Notify when lunch break begins</Text>
                </View>
              </View>
              <Switch
                value={settings.lunchStartEnabled}
                onValueChange={(value) => setSettings({ ...settings, lunchStartEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.lunchStartEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>

            {/* Lunch End */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>⏰</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Lunch End</Text>
                  <Text style={styles.toggleSubtext}>Notify when lunch break ends</Text>
                </View>
              </View>
              <Switch
                value={settings.lunchEndEnabled}
                onValueChange={(value) => setSettings({ ...settings, lunchEndEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.lunchEndEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>

            {/* Work End */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>🎉</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Work End</Text>
                  <Text style={styles.toggleSubtext}>Notify when work day is complete</Text>
                </View>
              </View>
              <Switch
                value={settings.workEndEnabled}
                onValueChange={(value) => setSettings({ ...settings, workEndEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.workEndEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>

            {/* Saturday Reminder */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>📅</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Saturday Reminder</Text>
                  <Text style={styles.toggleSubtext}>Remind the day before working Saturday</Text>
                </View>
              </View>
              <Switch
                value={settings.saturdayReminderEnabled}
                onValueChange={(value) => setSettings({ ...settings, saturdayReminderEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.saturdayReminderEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>
          </View>
        </View>

        {/* Job Activity Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Job Activity Notifications</Text>
          <Text style={styles.sectionDescription}>
            Notifications for job-related actions
          </Text>

          <View style={styles.notificationToggles}>
            {/* Record Saved */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>💾</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Record Saved</Text>
                  <Text style={styles.toggleSubtext}>Confirm when job is saved</Text>
                </View>
              </View>
              <Switch
                value={settings.recordSavedEnabled}
                onValueChange={(value) => setSettings({ ...settings, recordSavedEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.recordSavedEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>

            {/* Job Exported */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>📤</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Job Exported</Text>
                  <Text style={styles.toggleSubtext}>Confirm when export completes</Text>
                </View>
              </View>
              <Switch
                value={settings.jobExportedEnabled}
                onValueChange={(value) => setSettings({ ...settings, jobExportedEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.jobExportedEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>
          </View>
        </View>

        {/* Report Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Report Notifications</Text>
          <Text style={styles.sectionDescription}>
            Reminders for generating reports
          </Text>

          <View style={styles.notificationToggles}>
            {/* Monthly Report */}
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>📈</Text>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Monthly Report Reminder</Text>
                  <Text style={styles.toggleSubtext}>Remind to generate monthly reports</Text>
                </View>
              </View>
              <Switch
                value={settings.monthlyReportEnabled}
                onValueChange={(value) => setSettings({ ...settings, monthlyReportEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={settings.monthlyReportEnabled ? colors.background : colors.background}
                disabled={!settings.enabled}
              />
            </View>
          </View>
        </View>

        {/* Notification Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Notification Behavior</Text>
          <Text style={styles.sectionDescription}>
            Customize how notifications appear and sound
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Sound and vibration settings are controlled by your device&apos;s system settings
            </Text>
            <Text style={styles.infoText}>
              📱 On Android: Settings → Apps → TechTime → Notifications
            </Text>
            <Text style={styles.infoText}>
              🍎 On iOS: Settings → Notifications → TechTime
            </Text>
          </View>
        </View>

        {/* Test & Debug */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Test & Debug</Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleTestNotification}
            disabled={!hasPermission}
          >
            <Text style={styles.buttonText}>📤 Send Test Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#9c27b0' }]}
            onPress={handleViewScheduled}
          >
            <Text style={styles.buttonText}>📅 View Scheduled Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.success }]}
          onPress={handleSaveSettings}
        >
          <Text style={styles.saveButtonText}>💾 Save Notification Settings</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ About Notifications</Text>
          <Text style={styles.infoText}>
            • Notifications are scheduled based on your work schedule
          </Text>
          <Text style={styles.infoText}>
            • They will only trigger on your configured work days
          </Text>
          <Text style={styles.infoText}>
            • Background refresh ensures notifications work even when the app is closed
          </Text>
          <Text style={styles.infoText}>
            • You can customize sound and vibration in your device settings
          </Text>
          <Text style={styles.infoText}>
            • Notifications respect Do Not Disturb mode
          </Text>
          <Text style={styles.infoText}>
            • Saturday reminders are sent the day before your working Saturday
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
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
  permissionBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  notificationToggles: {
    gap: 16,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  toggleIcon: {
    fontSize: 24,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  toggleSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  button: {
    paddingVertical: 14,
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
  saveButton: {
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
});
