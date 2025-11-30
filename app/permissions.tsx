
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PermissionsService, AllPermissionsStatus } from '../utils/permissionsService';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function PermissionsScreen() {
  const { colors } = useTheme();
  const [permissionsStatus, setPermissionsStatus] = useState<AllPermissionsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadPermissionsStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await PermissionsService.checkAllPermissions();
      setPermissionsStatus(status);
      console.log('[Permissions] Current status:', status);
    } catch (error) {
      console.log('[Permissions] Error loading status:', error);
      showNotification('Error loading permissions status', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadPermissionsStatus();
  }, [loadPermissionsStatus]);

  const handleRequestNotifications = useCallback(async () => {
    try {
      PermissionsService.showPermissionExplanation('notifications');
      
      setTimeout(async () => {
        const result = await PermissionsService.requestNotificationPermissions();
        
        if (result.granted) {
          showNotification('Notification permission granted!', 'success');
        } else if (!result.canAskAgain) {
          PermissionsService.showSettingsRedirectDialog('notifications');
        } else {
          showNotification('Notification permission denied', 'error');
        }
        
        await loadPermissionsStatus();
      }, 500);
    } catch (error) {
      console.log('[Permissions] Error requesting notifications:', error);
      showNotification('Error requesting notification permission', 'error');
    }
  }, [showNotification, loadPermissionsStatus]);

  const handleRequestStorage = useCallback(async () => {
    try {
      PermissionsService.showPermissionExplanation('storage');
      
      setTimeout(async () => {
        const result = await PermissionsService.requestMediaLibraryPermissions();
        
        if (result.granted) {
          showNotification('Storage permission granted!', 'success');
        } else if (!result.canAskAgain) {
          PermissionsService.showSettingsRedirectDialog('storage');
        } else {
          showNotification('Storage permission denied', 'error');
        }
        
        await loadPermissionsStatus();
      }, 500);
    } catch (error) {
      console.log('[Permissions] Error requesting storage:', error);
      showNotification('Error requesting storage permission', 'error');
    }
  }, [showNotification, loadPermissionsStatus]);

  const handleCheckBackground = useCallback(async () => {
    try {
      PermissionsService.showPermissionExplanation('background');
      
      setTimeout(async () => {
        const result = await PermissionsService.requestBackgroundFetchPermissions();
        
        if (!result.granted) {
          PermissionsService.showSettingsRedirectDialog('background');
        }
        
        await loadPermissionsStatus();
      }, 500);
    } catch (error) {
      console.log('[Permissions] Error checking background:', error);
      showNotification('Error checking background execution', 'error');
    }
  }, [showNotification, loadPermissionsStatus]);

  const handleRequestAllPermissions = useCallback(async () => {
    try {
      const status = await PermissionsService.requestPermissionsWithExplanation();
      setPermissionsStatus(status);
      await loadPermissionsStatus();
    } catch (error) {
      console.log('[Permissions] Error requesting all permissions:', error);
      showNotification('Error requesting permissions', 'error');
    }
  }, [showNotification, loadPermissionsStatus]);

  const getStatusIcon = (granted: boolean, status: string) => {
    if (status === 'unsupported') return '➖';
    return granted ? '✅' : '❌';
  };

  const getStatusText = (granted: boolean, status: string) => {
    if (status === 'unsupported') return 'Not Required';
    return granted ? 'Granted' : 'Denied';
  };

  const getStatusColor = (granted: boolean, status: string) => {
    if (status === 'unsupported') return colors.textSecondary;
    return granted ? '#10b981' : colors.error;
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[commonStyles.title, { color: colors.text }]}>Permissions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading permissions status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[commonStyles.title, { color: colors.text }]}>Permissions</Text>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 App Permissions</Text>
          <Text style={styles.sectionDescription}>
            TechTime needs certain permissions to provide the best experience. All permissions are optional, but some features may not work without them.
          </Text>
          <Text style={styles.sectionDescription}>
            Your data stays on your device and is never shared with third parties.
          </Text>
        </View>

        {/* Request All Button */}
        {Platform.OS !== 'web' && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleRequestAllPermissions}
            >
              <Text style={styles.buttonText}>🔓 Request All Permissions</Text>
            </TouchableOpacity>
            <Text style={styles.buttonHint}>
              Request all permissions at once with explanations
            </Text>
          </View>
        )}

        {/* Notifications Permission */}
        <View style={styles.section}>
          <View style={styles.permissionHeader}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>🔔 Notifications</Text>
              <Text style={styles.permissionDescription}>
                Receive work reminders, alerts, and confirmations
              </Text>
            </View>
            <View style={styles.permissionStatus}>
              <Text style={styles.statusIcon}>
                {permissionsStatus && getStatusIcon(
                  permissionsStatus.notifications.granted,
                  permissionsStatus.notifications.status
                )}
              </Text>
              <Text style={[
                styles.statusText,
                { color: permissionsStatus ? getStatusColor(
                  permissionsStatus.notifications.granted,
                  permissionsStatus.notifications.status
                ) : colors.textSecondary }
              ]}>
                {permissionsStatus && getStatusText(
                  permissionsStatus.notifications.granted,
                  permissionsStatus.notifications.status
                )}
              </Text>
            </View>
          </View>

          <View style={styles.permissionDetails}>
            <Text style={styles.detailsTitle}>What this enables:</Text>
            <Text style={styles.detailsText}>• Work start/end reminders</Text>
            <Text style={styles.detailsText}>• Lunch break notifications</Text>
            <Text style={styles.detailsText}>• Record saved confirmations</Text>
            <Text style={styles.detailsText}>• Saturday work reminders</Text>
            <Text style={styles.detailsText}>• Monthly report reminders</Text>
          </View>

          {Platform.OS !== 'web' && !permissionsStatus?.notifications.granted && (
            <TouchableOpacity 
              style={[styles.button, styles.requestButton]} 
              onPress={handleRequestNotifications}
            >
              <Text style={styles.buttonText}>Request Notification Permission</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Background Execution */}
        <View style={styles.section}>
          <View style={styles.permissionHeader}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>⏰ Background Execution</Text>
              <Text style={styles.permissionDescription}>
                Keep time tracking and notifications working in the background
              </Text>
            </View>
            <View style={styles.permissionStatus}>
              <Text style={styles.statusIcon}>
                {permissionsStatus && getStatusIcon(
                  permissionsStatus.backgroundFetch.granted,
                  permissionsStatus.backgroundFetch.status
                )}
              </Text>
              <Text style={[
                styles.statusText,
                { color: permissionsStatus ? getStatusColor(
                  permissionsStatus.backgroundFetch.granted,
                  permissionsStatus.backgroundFetch.status
                ) : colors.textSecondary }
              ]}>
                {permissionsStatus && getStatusText(
                  permissionsStatus.backgroundFetch.granted,
                  permissionsStatus.backgroundFetch.status
                )}
              </Text>
            </View>
          </View>

          <View style={styles.permissionDetails}>
            <Text style={styles.detailsTitle}>What this enables:</Text>
            <Text style={styles.detailsText}>• Accurate time tracking</Text>
            <Text style={styles.detailsText}>• Scheduled notifications</Text>
            <Text style={styles.detailsText}>• Automatic work schedule updates</Text>
            <Text style={styles.detailsText}>• Background notification scheduling</Text>
          </View>

          {Platform.OS !== 'web' && !permissionsStatus?.backgroundFetch.granted && (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.infoButton]} 
                onPress={handleCheckBackground}
              >
                <Text style={styles.buttonText}>Check Background Status</Text>
              </TouchableOpacity>
              <Text style={styles.backgroundNote}>
                ℹ️ Background execution is controlled by your device settings. If restricted, some features may not work as expected.
              </Text>
            </>
          )}
        </View>

        {/* Storage Permission */}
        <View style={styles.section}>
          <View style={styles.permissionHeader}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>💾 Storage Access</Text>
              <Text style={styles.permissionDescription}>
                Save and import job records, export reports
              </Text>
            </View>
            <View style={styles.permissionStatus}>
              <Text style={styles.statusIcon}>
                {permissionsStatus && getStatusIcon(
                  permissionsStatus.mediaLibrary.granted,
                  permissionsStatus.mediaLibrary.status
                )}
              </Text>
              <Text style={[
                styles.statusText,
                { color: permissionsStatus ? getStatusColor(
                  permissionsStatus.mediaLibrary.granted,
                  permissionsStatus.mediaLibrary.status
                ) : colors.textSecondary }
              ]}>
                {permissionsStatus && getStatusText(
                  permissionsStatus.mediaLibrary.granted,
                  permissionsStatus.mediaLibrary.status
                )}
              </Text>
            </View>
          </View>

          <View style={styles.permissionDetails}>
            <Text style={styles.detailsTitle}>What this enables:</Text>
            <Text style={styles.detailsText}>• Save PDF reports to device</Text>
            <Text style={styles.detailsText}>• Save Excel exports</Text>
            <Text style={styles.detailsText}>• Import job data from files</Text>
            <Text style={styles.detailsText}>• Backup and restore data</Text>
          </View>

          {Platform.OS !== 'web' && !permissionsStatus?.mediaLibrary.granted && (
            <TouchableOpacity 
              style={[styles.button, styles.requestButton]} 
              onPress={handleRequestStorage}
            >
              <Text style={styles.buttonText}>Request Storage Permission</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Privacy Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Privacy & Security</Text>
          <Text style={styles.privacyText}>
            <Text style={styles.privacyBold}>Local Storage Only:</Text> All your job records and data are stored locally on your device. Nothing is sent to external servers.
          </Text>
          <Text style={styles.privacyText}>
            <Text style={styles.privacyBold}>No Data Sharing:</Text> Your data is never shared with third parties or uploaded to the cloud.
          </Text>
          <Text style={styles.privacyText}>
            <Text style={styles.privacyBold}>GDPR Compliant:</Text> We only store vehicle registration numbers, no personal customer data.
          </Text>
          <Text style={styles.privacyText}>
            <Text style={styles.privacyBold}>Secure Authentication:</Text> Optional PIN and biometric protection keep your data safe.
          </Text>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Need Help?</Text>
          <Text style={styles.helpText}>
            If you&apos;ve denied a permission and want to enable it later, you&apos;ll need to go to your device settings:
          </Text>
          <Text style={styles.helpText}>
            <Text style={styles.helpBold}>iOS:</Text> Settings → TechTime → Enable permissions
          </Text>
          <Text style={styles.helpText}>
            <Text style={styles.helpBold}>Android:</Text> Settings → Apps → TechTime → Permissions
          </Text>
        </View>

        {/* Refresh Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.button, styles.refreshButton]} 
            onPress={loadPermissionsStatus}
          >
            <Text style={styles.buttonText}>🔄 Refresh Status</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
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
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  permissionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  permissionStatus: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  permissionDetails: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    marginBottom: 8,
  },
  requestButton: {
    backgroundColor: '#10b981',
  },
  infoButton: {
    backgroundColor: '#6366f1',
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backgroundNote: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  privacyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  privacyBold: {
    fontWeight: '700',
    color: colors.text,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  helpBold: {
    fontWeight: '700',
    color: colors.text,
  },
});
