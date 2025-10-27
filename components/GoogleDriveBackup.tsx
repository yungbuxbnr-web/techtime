
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { BackupService, BackupData } from '../utils/backupService';
import { StorageService, writeJsonToDirectory, shareFile } from '../utils/storage';
import NotificationToast from './NotificationToast';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GoogleDriveBackupProps {
  onClose?: () => void;
}

const GoogleDriveBackup: React.FC<GoogleDriveBackupProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, visible: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const handleBackupToGoogleDrive = async () => {
    setIsLoading(true);
    try {
      console.log('Creating backup for Google Drive...');

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

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const fileName = `techtracer-backup-${timestamp}.json`;

      // Get saved backup directory (Android only)
      const savedDirUri = await AsyncStorage.getItem('backup.dirUri');

      // Write JSON file
      const fileUri = await writeJsonToDirectory(savedDirUri, fileName, backupData);
      console.log('Backup file created:', fileUri);

      // Share the file - user can choose Google Drive from the share sheet
      await shareFile(fileUri);

      showNotification(
        `Backup created successfully!\n\nJobs: ${backupData.jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}\n\nSelect Google Drive from the share menu to save your backup.`,
        'success'
      );

      console.log('Backup shared successfully');
    } catch (error) {
      console.log('Error creating backup for Google Drive:', error);
      showNotification(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const styles = createStyles(colors, screenHeight);

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
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Simple Google Drive Backup</Text>
          <Text style={styles.description}>
            This feature creates a backup file and opens your device&apos;s share menu. 
            From there, you can select Google Drive to save your backup.
          </Text>
          
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>📱 How it works:</Text>
            <Text style={styles.instructionStep}>1. Tap &quot;Create Backup&quot; below</Text>
            <Text style={styles.instructionStep}>2. A share menu will appear</Text>
            <Text style={styles.instructionStep}>3. Select &quot;Google Drive&quot; from the options</Text>
            <Text style={styles.instructionStep}>4. Choose a folder and save</Text>
          </View>

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Tips:</Text>
            <Text style={styles.tipText}>
              - Make sure you have the Google Drive app installed
            </Text>
            <Text style={styles.tipText}>
              - You can also save to other cloud services like Dropbox, OneDrive, etc.
            </Text>
            <Text style={styles.tipText}>
              - To restore, download the backup file and use &quot;Import from File (JSON)&quot; in Settings
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleBackupToGoogleDrive}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <>
              <Text style={styles.buttonIcon}>☁️</Text>
              <Text style={styles.buttonText}>Create Backup</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>📝 Note:</Text>
          <Text style={styles.noteText}>
            This simplified approach doesn&apos;t require any Google API setup or authentication. 
            It uses your device&apos;s native sharing capabilities to save files to Google Drive or any other cloud service you have installed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, screenHeight: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxHeight: screenHeight * 0.95,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '300',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  instructionStep: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  tipsBox: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  noteSection: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 40,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

export default GoogleDriveBackup;
