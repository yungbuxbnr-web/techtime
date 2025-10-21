
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { GoogleDriveService, GoogleDriveFile, GoogleDriveFolder } from '../utils/googleDriveService';
import { BackupService, BackupData } from '../utils/backupService';
import { StorageService } from '../utils/storage';
import NotificationToast from './NotificationToast';
import GoogleDriveSetup from './GoogleDriveSetup';
import GoogleDriveInstructions from './GoogleDriveInstructions';
import GoogleDriveFolderSelector from './GoogleDriveFolderSelector';
import { useTheme } from '../contexts/ThemeContext';

interface GoogleDriveBackupProps {
  onClose?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GoogleDriveBackup: React.FC<GoogleDriveBackupProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupFiles, setBackupFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<GoogleDriveFolder | null>(null);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, visible: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadSelectedFolder = useCallback(async () => {
    try {
      const folder = await GoogleDriveService.getSelectedFolder();
      setSelectedFolder(folder);
    } catch (error) {
      console.log('Error loading selected folder:', error);
    }
  }, []);

  const loadBackupFiles = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const result = await GoogleDriveService.listBackups(token);
      if (result.success) {
        setBackupFiles(result.files);
        if (result.files.length === 0) {
          showNotification('No backups found in the selected folder', 'info');
        }
      } else {
        showNotification(result.message || 'Failed to load backups', 'error');
      }
    } catch (error) {
      console.log('Error loading backup files:', error);
      showNotification('Failed to load backups', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  const checkConfiguration = useCallback(async () => {
    const configured = await GoogleDriveService.isConfigured();
    setIsConfigured(configured);
    
    if (!configured) {
      showNotification(
        'Google Drive integration requires setup. Please configure your Google Cloud Console credentials.',
        'info'
      );
    } else {
      // Check if user is already authenticated
      const authenticated = await GoogleDriveService.isAuthenticated();
      if (authenticated) {
        const token = await GoogleDriveService.getCurrentToken();
        if (token) {
          setIsAuthenticated(true);
          setAccessToken(token);
          await loadSelectedFolder();
          await loadBackupFiles(token);
        }
      }
    }
  }, [showNotification, loadSelectedFolder, loadBackupFiles]);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  const handleAuthenticate = async () => {
    if (!isConfigured) {
      Alert.alert(
        'Configuration Required',
        'Google Drive integration is not configured. You need to set up Google Cloud Console credentials first.\n\nWould you like to view the setup guide?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Setup Guide', onPress: () => setShowSetupGuide(true) }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await GoogleDriveService.authenticate();
      if (result.success && result.accessToken) {
        setIsAuthenticated(true);
        setAccessToken(result.accessToken);
        showNotification('Successfully authenticated with Google Drive!', 'success');
        await loadSelectedFolder();
        await loadBackupFiles(result.accessToken);
      } else {
        showNotification(result.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.log('Authentication error:', error);
      showNotification('Authentication failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFolder = () => {
    if (!accessToken) {
      showNotification('Please authenticate first', 'error');
      return;
    }
    setShowFolderSelector(true);
  };

  const handleFolderSelected = async (folder: GoogleDriveFolder) => {
    try {
      await GoogleDriveService.saveSelectedFolder(folder);
      setSelectedFolder(folder);
      showNotification(`Backup folder set to: ${folder.path}`, 'success');
      
      // Reload backups from the new folder
      if (accessToken) {
        await loadBackupFiles(accessToken);
      }
    } catch (error) {
      console.log('Error saving selected folder:', error);
      showNotification('Failed to save folder selection', 'error');
    }
  };

  const handleBackupToGoogleDrive = async () => {
    if (!accessToken) {
      showNotification('Please authenticate first', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Create local backup first
      const localBackupResult = await BackupService.createBackup();
      if (!localBackupResult.success) {
        showNotification(localBackupResult.message, 'error');
        return;
      }

      // Get backup data
      const jobs = await StorageService.getJobs();
      const settings = await StorageService.getSettings();

      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        jobs,
        settings: {
          ...settings,
          isAuthenticated: false, // Don't backup authentication state
        },
        metadata: {
          totalJobs: jobs.length,
          totalAWs: jobs.reduce((sum, job) => sum + job.awValue, 0),
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0',
        },
      };

      // Upload to Google Drive (will use selected folder automatically)
      const uploadResult = await GoogleDriveService.uploadBackup(accessToken, backupData);
      if (uploadResult.success) {
        showNotification(uploadResult.message, 'success');
        await loadBackupFiles(accessToken); // Refresh the list
      } else {
        showNotification(uploadResult.message, 'error');
      }
    } catch (error) {
      console.log('Error backing up to Google Drive:', error);
      showNotification('Failed to backup to Google Drive', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreFromGoogleDrive = async (fileId: string, fileName: string) => {
    if (!accessToken) {
      showNotification('Please authenticate first', 'error');
      return;
    }

    Alert.alert(
      'Restore Backup',
      `Are you sure you want to restore from "${fileName}"?\n\nThis will replace all current data and you will need to sign in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const downloadResult = await GoogleDriveService.downloadBackup(accessToken, fileId);
              if (downloadResult.success && downloadResult.data) {
                const restoreResult = await BackupService.restoreFromBackup(downloadResult.data);
                if (restoreResult.success) {
                  showNotification(restoreResult.message, 'success');
                  // Close the component after successful restore
                  setTimeout(() => {
                    onClose?.();
                  }, 2000);
                } else {
                  showNotification(restoreResult.message, 'error');
                }
              } else {
                showNotification(downloadResult.message, 'error');
              }
            } catch (error) {
              console.log('Error restoring from Google Drive:', error);
              showNotification('Failed to restore from Google Drive', 'error');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBackup = async (fileId: string, fileName: string) => {
    if (!accessToken) {
      showNotification('Please authenticate first', 'error');
      return;
    }

    Alert.alert(
      'Delete Backup',
      `Are you sure you want to delete "${fileName}" from Google Drive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const deleteResult = await GoogleDriveService.deleteBackup(accessToken, fileId);
              if (deleteResult.success) {
                showNotification(deleteResult.message, 'success');
                await loadBackupFiles(accessToken); // Refresh the list
              } else {
                showNotification(deleteResult.message, 'error');
              }
            } catch (error) {
              console.log('Error deleting backup from Google Drive:', error);
              showNotification('Failed to delete backup', 'error');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Google Drive? You will need to authenticate again for future backups.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await GoogleDriveService.signOut();
              setIsAuthenticated(false);
              setAccessToken(null);
              setSelectedFolder(null);
              setBackupFiles([]);
              showNotification('Signed out of Google Drive', 'info');
            } catch (error) {
              console.log('Error signing out:', error);
              showNotification('Error signing out', 'error');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const styles = createStyles(colors);

  if (showSetupGuide) {
    return <GoogleDriveSetup onClose={() => setShowSetupGuide(false)} />;
  }

  if (showFolderSelector && accessToken) {
    return (
      <GoogleDriveFolderSelector
        accessToken={accessToken}
        onFolderSelected={handleFolderSelected}
        onClose={() => setShowFolderSelector(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Google Drive Backup</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isConfigured && (
          <GoogleDriveInstructions onSetupGuide={() => setShowSetupGuide(true)} />
        )}

        {!isAuthenticated ? (
          <View style={styles.authSection}>
            <Text style={styles.sectionTitle}>Authentication Required</Text>
            <Text style={styles.description}>
              Sign in to your Google account to backup and restore your TechTrace data to Google Drive.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleAuthenticate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign in to Google Drive</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authenticatedSection}>
            <Text style={styles.sectionTitle}>Backup & Restore</Text>
            
            {/* Folder Selection */}
            <View style={styles.folderSection}>
              <Text style={styles.folderLabel}>Backup Folder:</Text>
              <View style={styles.folderInfo}>
                <Text style={styles.folderPath}>
                  {selectedFolder ? selectedFolder.path : 'Root (not selected)'}
                </Text>
                <TouchableOpacity
                  style={styles.selectFolderButton}
                  onPress={handleSelectFolder}
                  disabled={isLoading}
                >
                  <Text style={styles.selectFolderButtonText}>
                    {selectedFolder ? 'Change' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.folderDescription}>
                {selectedFolder 
                  ? 'All backups will be saved to this folder automatically.'
                  : 'Select a folder to organize your backups. You can create new folders during selection.'
                }
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleBackupToGoogleDrive}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={styles.buttonText}>Backup to Google Drive</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => accessToken && loadBackupFiles(accessToken)}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Refresh Backup List</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
              disabled={isLoading}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            {backupFiles.length > 0 && (
              <View style={styles.backupList}>
                <Text style={styles.sectionTitle}>Available Backups</Text>
                {backupFiles.map((file) => (
                  <View key={file.id} style={styles.backupItem}>
                    <View style={styles.backupInfo}>
                      <Text style={styles.backupName}>{file.name}</Text>
                      <Text style={styles.backupDate}>
                        {formatDate(file.modifiedTime)}
                      </Text>
                      {file.size && (
                        <Text style={styles.backupSize}>
                          {Math.round(parseInt(file.size) / 1024)} KB
                        </Text>
                      )}
                    </View>
                    <View style={styles.backupActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.restoreButton]}
                        onPress={() => handleRestoreFromGoogleDrive(file.id, file.name)}
                        disabled={isLoading}
                      >
                        <Text style={styles.actionButtonText}>Restore</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteBackup(file.id, file.name)}
                        disabled={isLoading}
                      >
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  authSection: {
    alignItems: 'center',
  },
  authenticatedSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  folderSection: {
    backgroundColor: colors.cardBackground,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  folderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  folderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  folderPath: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  selectFolderButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectFolderButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  folderDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutButton: {
    backgroundColor: colors.error || '#DC3545',
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  backupList: {
    marginTop: 20,
    marginBottom: 20,
  },
  backupItem: {
    backgroundColor: colors.cardBackground,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupInfo: {
    marginBottom: 10,
  },
  backupName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  backupDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  backupSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: colors.success || colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error || '#DC3545',
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GoogleDriveBackup;
