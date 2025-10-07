
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import { StorageService } from './storage';
import { Job, AppSettings } from '../types';
import { Platform } from 'react-native';

const BACKUP_FOLDER_NAME = 'techtrace';
const BACKUP_FILE_NAME = 'backup.json';

export interface BackupData {
  version: string;
  timestamp: string;
  jobs: Job[];
  settings: AppSettings;
  metadata: {
    totalJobs: number;
    totalAWs: number;
    exportDate: string;
    appVersion: string;
  };
}

// Helper function to get available directories with fallback
const getAvailableDirectory = (): { directory: string; type: 'document' | 'cache' } => {
  // Try document directory first
  if (FileSystem.documentDirectory) {
    console.log('Using document directory:', FileSystem.documentDirectory);
    return { directory: FileSystem.documentDirectory, type: 'document' };
  }
  
  // Fallback to cache directory
  if (FileSystem.cacheDirectory) {
    console.log('Document directory not available, using cache directory:', FileSystem.cacheDirectory);
    return { directory: FileSystem.cacheDirectory, type: 'cache' };
  }
  
  throw new Error('No file system directory available');
};

// Request storage permissions with better error handling
const requestStoragePermissions = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Requesting storage permissions...');
    
    if (Platform.OS === 'android') {
      // Request media library permissions for Android
      const { status, granted } = await MediaLibrary.requestPermissionsAsync();
      
      console.log('Permission status:', status, 'granted:', granted);
      
      if (status === 'granted' || granted) {
        console.log('Storage permissions granted');
        return { success: true, message: 'Storage permissions granted' };
      } else if (status === 'denied') {
        return { 
          success: false, 
          message: 'Storage permissions denied. Please enable storage access in your device settings to create backup folders.' 
        };
      } else {
        return { 
          success: false, 
          message: 'Storage permissions are required to create backup folders. Please grant permissions when prompted.' 
        };
      }
    } else {
      // iOS doesn't require explicit permissions for document directory
      console.log('iOS - no explicit permissions needed for document directory');
      return { success: true, message: 'Permissions not required on iOS' };
    }
  } catch (error) {
    console.log('Error requesting storage permissions:', error);
    return { 
      success: false, 
      message: `Failed to request permissions: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

// Check if directory is writable
const checkDirectoryWritable = async (directoryPath: string): Promise<boolean> => {
  try {
    const testFilePath = `${directoryPath}test_write.tmp`;
    await FileSystem.writeAsStringAsync(testFilePath, 'test', { encoding: FileSystem.EncodingType.UTF8 });
    await FileSystem.deleteAsync(testFilePath, { idempotent: true });
    return true;
  } catch (error) {
    console.log('Directory not writable:', error);
    return false;
  }
};

export const BackupService = {
  async requestPermissions(): Promise<{ success: boolean; message: string }> {
    return await requestStoragePermissions();
  },

  async createBackup(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      console.log('Starting backup process...');
      
      // First, request permissions
      const permissionResult = await requestStoragePermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }

      // Get available directory
      let directoryInfo;
      try {
        directoryInfo = getAvailableDirectory();
      } catch (error) {
        console.log('No file system directory available:', error);
        return { 
          success: false, 
          message: 'File system not available on this device. Cannot create local backups.' 
        };
      }

      const { directory, type } = directoryInfo;

      // Check if directory is writable
      const isWritable = await checkDirectoryWritable(directory);
      if (!isWritable) {
        return {
          success: false,
          message: `Cannot write to ${type} directory. Please check storage permissions and available space.`
        };
      }

      // Create techtrace folder if it doesn't exist
      const backupFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
      
      try {
        const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
        
        if (!folderInfo.exists) {
          console.log('Creating backup folder at:', backupFolderPath);
          await FileSystem.makeDirectoryAsync(backupFolderPath, { intermediates: true });
          
          // Verify folder was created successfully
          const verifyFolderInfo = await FileSystem.getInfoAsync(backupFolderPath);
          if (!verifyFolderInfo.exists) {
            return { 
              success: false, 
              message: 'Failed to create backup folder. Please check storage permissions and available space.' 
            };
          }
          console.log('Backup folder created successfully');
        } else {
          console.log('Backup folder already exists');
        }
      } catch (folderError) {
        console.log('Error with backup folder:', folderError);
        return { 
          success: false, 
          message: `Failed to access backup folder: ${folderError instanceof Error ? folderError.message : 'Unknown error'}` 
        };
      }

      // Get all data from storage
      const jobs = await StorageService.getJobs();
      const settings = await StorageService.getSettings();

      // Calculate metadata
      const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
      const currentDate = new Date().toISOString();

      // Create backup data structure
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: currentDate,
        jobs,
        settings: {
          ...settings,
          isAuthenticated: false // Don't backup authentication state
        },
        metadata: {
          totalJobs: jobs.length,
          totalAWs,
          exportDate: currentDate,
          appVersion: '1.0.0'
        }
      };

      // Create backup file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupFileName = `backup_${timestamp}.json`;
      const backupFilePath = `${backupFolderPath}${backupFileName}`;

      // Write backup data to file
      try {
        await FileSystem.writeAsStringAsync(
          backupFilePath,
          JSON.stringify(backupData, null, 2),
          { encoding: FileSystem.EncodingType.UTF8 }
        );
        console.log('Backup file written successfully');
      } catch (writeError) {
        console.log('Error writing backup file:', writeError);
        return { 
          success: false, 
          message: `Failed to write backup file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}` 
        };
      }

      // Also create a latest backup file for easy access
      const latestBackupPath = `${backupFolderPath}${BACKUP_FILE_NAME}`;
      try {
        await FileSystem.writeAsStringAsync(
          latestBackupPath,
          JSON.stringify(backupData, null, 2),
          { encoding: FileSystem.EncodingType.UTF8 }
        );
        console.log('Latest backup file written successfully');
      } catch (latestWriteError) {
        console.log('Error writing latest backup file:', latestWriteError);
        // Don't fail the entire backup if latest file fails
      }

      const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
      console.log('Backup created successfully at:', backupFilePath);
      
      return {
        success: true,
        message: `Backup created successfully!\n\nLocation: ${directoryTypeText}/${BACKUP_FOLDER_NAME}/\nFile: ${backupFileName}\nJobs backed up: ${jobs.length}\nTotal AWs: ${totalAWs}${type === 'cache' ? '\n\nNote: Saved to cache directory. For permanent storage, ensure document directory access.' : ''}`,
        filePath: backupFilePath
      };

    } catch (error) {
      console.log('Error creating backup:', error);
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  async importBackup(): Promise<{ success: boolean; message: string; data?: BackupData }> {
    try {
      console.log('Starting import process...');
      
      // Get available directory
      let directoryInfo;
      try {
        directoryInfo = getAvailableDirectory();
      } catch (error) {
        console.log('No file system directory available:', error);
        return { 
          success: false, 
          message: 'File system not available on this device. Cannot access local backups.' 
        };
      }

      const { directory, type } = directoryInfo;

      // Check if techtrace folder exists
      const backupFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
        console.log('Backup folder does not exist');
        return { 
          success: false, 
          message: `No backup folder found. Please create a backup first or ensure the ${BACKUP_FOLDER_NAME} folder exists in ${directoryTypeText}.` 
        };
      }

      // Check if backup file exists
      const backupFilePath = `${backupFolderPath}${BACKUP_FILE_NAME}`;
      const fileInfo = await FileSystem.getInfoAsync(backupFilePath);
      
      if (!fileInfo.exists) {
        console.log('Backup file does not exist');
        return { 
          success: false, 
          message: `No backup file found in the ${BACKUP_FOLDER_NAME} folder. Please ensure ${BACKUP_FILE_NAME} exists.` 
        };
      }

      // Read backup file
      const backupContent = await FileSystem.readAsStringAsync(backupFilePath, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Parse backup data
      const backupData: BackupData = JSON.parse(backupContent);

      // Validate backup data structure
      if (!backupData.jobs || !backupData.settings || !backupData.metadata) {
        console.log('Invalid backup file structure');
        return { 
          success: false, 
          message: 'Invalid backup file format. The backup file appears to be corrupted.' 
        };
      }

      console.log('Backup data loaded successfully:', {
        jobs: backupData.jobs.length,
        totalAWs: backupData.metadata.totalAWs,
        backupDate: backupData.timestamp
      });

      return {
        success: true,
        message: `Backup file loaded successfully!\n\nJobs found: ${backupData.jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}\nBackup date: ${new Date(backupData.timestamp).toLocaleDateString()}`,
        data: backupData
      };

    } catch (error) {
      console.log('Error importing backup:', error);
      return {
        success: false,
        message: `Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  async restoreFromBackup(backupData: BackupData): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Starting restore process...');

      // Clear existing data first
      await StorageService.clearAllData();
      console.log('Cleared existing data');

      // Restore jobs
      for (const job of backupData.jobs) {
        await StorageService.saveJob(job);
      }
      console.log('Restored jobs:', backupData.jobs.length);

      // Restore settings (but keep authentication state as false)
      const settingsToRestore = {
        ...backupData.settings,
        isAuthenticated: false
      };
      await StorageService.saveSettings(settingsToRestore);
      console.log('Restored settings');

      return {
        success: true,
        message: `Data restored successfully!\n\nJobs restored: ${backupData.jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}\n\nPlease sign in again to access the app.`
      };

    } catch (error) {
      console.log('Error restoring backup:', error);
      return {
        success: false,
        message: `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  async listBackupFiles(): Promise<{ success: boolean; files: string[]; message?: string }> {
    try {
      let directoryInfo;
      try {
        directoryInfo = getAvailableDirectory();
      } catch (error) {
        return { success: false, files: [], message: 'File system not available' };
      }

      const { directory } = directoryInfo;
      const backupFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        return { success: false, files: [], message: 'Backup folder does not exist' };
      }

      const files = await FileSystem.readDirectoryAsync(backupFolderPath);
      const backupFiles = files.filter(file => file.endsWith('.json'));
      
      console.log('Found backup files:', backupFiles);
      return { success: true, files: backupFiles };

    } catch (error) {
      console.log('Error listing backup files:', error);
      return { success: false, files: [], message: 'Error accessing backup folder' };
    }
  },

  async getBackupFolderPath(): Promise<string | null> {
    try {
      const { directory } = getAvailableDirectory();
      return `${directory}${BACKUP_FOLDER_NAME}/`;
    } catch (error) {
      console.log('Error getting backup folder path:', error);
      return null;
    }
  },

  async ensureBackupFolderExists(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Ensuring backup folder exists...');
      
      // First, request permissions
      const permissionResult = await requestStoragePermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }

      // Get available directory
      let directoryInfo;
      try {
        directoryInfo = getAvailableDirectory();
      } catch (error) {
        console.log('No file system directory available:', error);
        return { 
          success: false, 
          message: 'File system not available on this device. Cannot create backup folders.' 
        };
      }

      const { directory, type } = directoryInfo;

      // Check if directory is writable
      const isWritable = await checkDirectoryWritable(directory);
      if (!isWritable) {
        return {
          success: false,
          message: `Cannot write to ${type} directory. Please check storage permissions and available space.`
        };
      }

      const backupFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        try {
          await FileSystem.makeDirectoryAsync(backupFolderPath, { intermediates: true });
          console.log('Created backup folder at:', backupFolderPath);
          
          // Verify folder was created
          const verifyInfo = await FileSystem.getInfoAsync(backupFolderPath);
          if (!verifyInfo.exists) {
            return { 
              success: false, 
              message: 'Failed to create backup folder. Please check storage permissions and available space.' 
            };
          }
          
          const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
          return { 
            success: true, 
            message: `Backup folder created successfully!\n\nLocation: ${directoryTypeText}/${BACKUP_FOLDER_NAME}/\n\nYou can now create backups.${type === 'cache' ? '\n\nNote: Using cache directory. For permanent storage, ensure document directory access.' : ''}` 
          };
        } catch (createError) {
          console.log('Error creating backup folder:', createError);
          return {
            success: false,
            message: `Failed to create backup folder: ${createError instanceof Error ? createError.message : 'Unknown error'}\n\nPlease check storage permissions in your device settings.`
          };
        }
      } else {
        console.log('Backup folder already exists at:', backupFolderPath);
        const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
        return { 
          success: true, 
          message: `Backup folder already exists!\n\nLocation: ${directoryTypeText}/${BACKUP_FOLDER_NAME}/` 
        };
      }
    } catch (error) {
      console.log('Error ensuring backup folder exists:', error);
      return {
        success: false,
        message: `Failed to ensure backup folder exists: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  // New method to save backup to custom location using document picker
  async saveFileToCustomLocation(content: string, filename: string): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      console.log('Saving backup to custom location...');
      
      // For now, we'll save to the available directory and inform the user
      // Document picker for saving files is limited on mobile platforms
      
      let directoryInfo;
      try {
        directoryInfo = getAvailableDirectory();
      } catch (error) {
        return { 
          success: false, 
          message: 'File system not available on this device.' 
        };
      }

      const { directory, type } = directoryInfo;
      const filePath = `${directory}${filename}`;
      
      await FileSystem.writeAsStringAsync(
        filePath,
        content,
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
      
      return {
        success: true,
        message: `Backup saved successfully!\n\nLocation: ${directoryTypeText}/${filename}\n\nYou can access this file through your device's file manager.`,
        filePath
      };

    } catch (error) {
      console.log('Error saving file to custom location:', error);
      return {
        success: false,
        message: `Failed to save backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};
</write file>

Now let me also update the storage service to use the proper FileSystem API:

<write file="utils/storage.ts">
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Job, AppSettings } from '../types';

const JOBS_KEY = 'jobs';
const SETTINGS_KEY = 'settings';

const defaultSettings: AppSettings = {
  pin: '3101',
  isAuthenticated: false,
  targetHours: 180,
};

// Helper function to get available directory with fallback
const getAvailableDirectory = (): string => {
  if (FileSystem.documentDirectory) {
    return FileSystem.documentDirectory;
  }
  if (FileSystem.cacheDirectory) {
    return FileSystem.cacheDirectory;
  }
  throw new Error('No file system directory available');
};

export const StorageService = {
  // Jobs management
  async getJobs(): Promise<Job[]> {
    try {
      const jobsJson = await AsyncStorage.getItem(JOBS_KEY);
      if (jobsJson) {
        const jobs = JSON.parse(jobsJson);
        console.log('Retrieved jobs from storage:', jobs.length);
        return jobs;
      }
      return [];
    } catch (error) {
      console.log('Error getting jobs:', error);
      return [];
    }
  },

  async saveJob(job: Job): Promise<void> {
    try {
      const existingJobs = await this.getJobs();
      const updatedJobs = [...existingJobs, job];
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(updatedJobs));
      console.log('Job saved successfully:', job.wipNumber);
    } catch (error) {
      console.log('Error saving job:', error);
      throw error;
    }
  },

  async updateJob(updatedJob: Job): Promise<void> {
    try {
      const existingJobs = await this.getJobs();
      const jobIndex = existingJobs.findIndex(job => job.id === updatedJob.id);
      
      if (jobIndex === -1) {
        throw new Error('Job not found');
      }

      existingJobs[jobIndex] = updatedJob;
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(existingJobs));
      console.log('Job updated successfully:', updatedJob.wipNumber);
    } catch (error) {
      console.log('Error updating job:', error);
      throw error;
    }
  },

  async deleteJob(jobId: string): Promise<void> {
    try {
      const existingJobs = await this.getJobs();
      const filteredJobs = existingJobs.filter(job => job.id !== jobId);
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(filteredJobs));
      console.log('Job deleted successfully:', jobId);
    } catch (error) {
      console.log('Error deleting job:', error);
      throw error;
    }
  },

  async saveJobs(jobs: Job[]): Promise<void> {
    try {
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
      console.log('All jobs saved successfully:', jobs.length);
    } catch (error) {
      console.log('Error saving jobs:', error);
      throw error;
    }
  },

  // Settings management
  async getSettings(): Promise<AppSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        return { ...defaultSettings, ...settings };
      }
      return defaultSettings;
    } catch (error) {
      console.log('Error getting settings:', error);
      return defaultSettings;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('Settings saved successfully');
    } catch (error) {
      console.log('Error saving settings:', error);
      throw error;
    }
  },

  // File operations
  async saveToFile(content: string, filename: string, allowFolderSelection: boolean = false): Promise<string> {
    try {
      let targetDirectory = getAvailableDirectory();
      
      if (allowFolderSelection) {
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: 'application/*',
            copyToCacheDirectory: false,
          });
          
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedUri = result.assets[0].uri;
            // Extract directory from selected file URI
            const lastSlash = selectedUri.lastIndexOf('/');
            if (lastSlash !== -1) {
              targetDirectory = selectedUri.substring(0, lastSlash + 1);
            }
          }
        } catch (pickerError) {
          console.log('Folder selection failed, using default directory:', pickerError);
          // Continue with default directory
        }
      }

      const fileUri = `${targetDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('File saved successfully to:', fileUri);
      return fileUri;
    } catch (error) {
      console.log('Error saving file:', error);
      throw error;
    }
  },

  async readFromFile(uri: string): Promise<string> {
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log('File read successfully from:', uri);
      return content;
    } catch (error) {
      console.log('Error reading file:', error);
      throw error;
    }
  },

  async fileExists(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch (error) {
      console.log('Error checking file existence:', error);
      return false;
    }
  },

  async deleteFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri);
      console.log('File deleted successfully:', uri);
    } catch (error) {
      console.log('Error deleting file:', error);
      throw error;
    }
  },

  // Data management
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([JOBS_KEY, SETTINGS_KEY]);
      console.log('All data cleared successfully');
    } catch (error) {
      console.log('Error clearing data:', error);
      throw error;
    }
  },

  async exportData(): Promise<string> {
    try {
      const jobs = await this.getJobs();
      const settings = await this.getSettings();
      
      const exportData = {
        jobs,
        settings: {
          ...settings,
          isAuthenticated: false, // Don't export authentication state
        },
        exportDate: new Date().toISOString(),
        version: '1.0',
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.log('Error exporting data:', error);
      throw error;
    }
  },

  async importData(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.jobs && Array.isArray(importData.jobs)) {
        await this.saveJobs(importData.jobs);
      }
      
      if (importData.settings) {
        const currentSettings = await this.getSettings();
        const newSettings = {
          ...currentSettings,
          ...importData.settings,
          isAuthenticated: false, // Always require re-authentication after import
        };
        await this.saveSettings(newSettings);
      }
      
      console.log('Data imported successfully');
    } catch (error) {
      console.log('Error importing data:', error);
      throw error;
    }
  },

  // Backup and restore
  async createBackup(): Promise<string> {
    try {
      const exportData = await this.exportData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `techtimetracking_backup_${timestamp}.json`;
      
      const backupUri = await this.saveToFile(exportData, filename, true);
      console.log('Backup created successfully:', backupUri);
      return backupUri;
    } catch (error) {
      console.log('Error creating backup:', error);
      throw error;
    }
  },

  async restoreFromBackup(backupUri: string): Promise<void> {
    try {
      const backupData = await this.readFromFile(backupUri);
      await this.importData(backupData);
      console.log('Backup restored successfully');
    } catch (error) {
      console.log('Error restoring backup:', error);
      throw error;
    }
  },

  // New method to save file to custom location with better error handling
  async saveFileToCustomLocation(content: string, filename: string): Promise<string> {
    try {
      console.log('Saving file to custom location...');
      
      const directory = getAvailableDirectory();
      const filePath = `${directory}${filename}`;
      
      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('File saved successfully to:', filePath);
      return filePath;
    } catch (error) {
      console.log('Error saving file to custom location:', error);
      throw error;
    }
  },

  // New method to select folder and save file (limited on mobile)
  async selectFolderAndSaveFile(content: string, filename: string): Promise<string> {
    try {
      console.log('Attempting to save file with folder selection...');
      
      // On mobile platforms, we can't really select a folder for saving
      // So we'll save to the available directory and inform the user
      const directory = getAvailableDirectory();
      const filePath = `${directory}${filename}`;
      
      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('File saved to available directory:', filePath);
      return filePath;
    } catch (error) {
      console.log('Error saving file with folder selection:', error);
      throw error;
    }
  }
};
</write file>

Now let me update the settings screen to provide better user feedback and handle the improved backup service:

<write file="app/settings.tsx">
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
import GoogleDriveImportTally from '../components/GoogleDriveImportTally';
import SimpleBottomSheet from '../components/BottomSheet';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({ pin: '3101', isAuthenticated: false });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isImportInProgress, setIsImportInProgress] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  const [showGoogleDriveBackup, setShowGoogleDriveBackup] = useState(false);
  const [showImportTally, setShowImportTally] = useState(false);

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

  const handleEnsureBackupFolder = useCallback(async () => {
    if (isSetupInProgress) return;
    
    setIsSetupInProgress(true);
    showNotification('Setting up backup folder and checking permissions...', 'info');

    try {
      const result = await BackupService.ensureBackupFolderExists();
      
      if (result.success) {
        showNotification(result.message, 'success');
        console.log('Backup folder setup completed successfully');
      } else {
        showNotification(result.message, 'error');
        console.log('Failed to setup backup folder:', result.message);
        
        // Provide additional guidance for permission issues
        if (result.message.includes('permissions')) {
          setTimeout(() => {
            Alert.alert(
              'Permission Required',
              'To create local backups, please:\n\n1. Go to your device Settings\n2. Find this app in Apps/Application Manager\n3. Grant Storage/Files permissions\n4. Try again',
              [{ text: 'OK' }]
            );
          }, 2000);
        }
      }
    } catch (error) {
      console.log('Error setting up backup folder:', error);
      showNotification('Unexpected error setting up backup folder', 'error');
    } finally {
      setIsSetupInProgress(false);
    }
  }, [isSetupInProgress, showNotification]);

  const handleCreateBackup = useCallback(async () => {
    if (isBackupInProgress) return;
    
    setIsBackupInProgress(true);
    showNotification('Creating local backup...', 'info');

    try {
      const result = await BackupService.createBackup();
      
      if (result.success) {
        showNotification(result.message, 'success');
        console.log('Backup created successfully');
      } else {
        showNotification(result.message, 'error');
        console.log('Backup failed:', result.message);
        
        // Provide guidance for common issues
        if (result.message.includes('directory not available')) {
          setTimeout(() => {
            Alert.alert(
              'Storage Issue',
              'Local storage is not available on this device. Please try:\n\n1. Use Google Drive backup instead\n2. Ensure your device has available storage space\n3. Check app permissions',
              [{ text: 'OK' }]
            );
          }, 2000);
        } else if (result.message.includes('permissions')) {
          setTimeout(() => {
            Alert.alert(
              'Permission Required',
              'Storage permission is needed to create backups. Please:\n\n1. Tap "Setup Backup Folder" first\n2. Grant storage permissions when prompted\n3. Try creating backup again',
              [{ text: 'OK' }]
            );
          }, 2000);
        }
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
      'Import Local Backup',
      'This will replace all current data with the backup data. Make sure you have a backup file (backup.json) in the backup folder.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: async () => {
            setIsImportInProgress(true);
            showNotification('Importing local backup...', 'info');

            try {
              // First, try to load the backup file
              const importResult = await BackupService.importBackup();
              
              if (!importResult.success || !importResult.data) {
                showNotification(importResult.message, 'error');
                console.log('Import failed:', importResult.message);
                
                // Provide guidance for common issues
                if (importResult.message.includes('No backup folder found')) {
                  setTimeout(() => {
                    Alert.alert(
                      'No Backup Found',
                      'No backup folder or file was found. Please:\n\n1. Create a backup first, or\n2. Ensure you have a backup.json file in the backup folder\n3. Use "Setup Backup Folder" to check permissions',
                      [{ text: 'OK' }]
                    );
                  }, 2000);
                }
                
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

          {/* Import & Tally from Google Drive */}
          <TouchableOpacity
            style={[styles.button, styles.tallyButton]}
            onPress={() => setShowImportTally(true)}
          >
            <Text style={styles.buttonText}>📊 Import & Tally from Google Drive</Text>
          </TouchableOpacity>
          
          {/* Backup Folder Setup */}
          <TouchableOpacity
            style={[styles.button, styles.setupButton, isSetupInProgress && styles.buttonDisabled]}
            onPress={handleEnsureBackupFolder}
            disabled={isSetupInProgress}
          >
            <Text style={styles.buttonText}>
              {isSetupInProgress ? '⏳ Setting Up...' : '📁 Setup Backup Folder'}
            </Text>
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
              • <Text style={styles.infoHighlight}>Setup Backup Folder:</Text> Ensures proper permissions and creates backup directory
            </Text>
            <Text style={styles.infoText}>
              • <Text style={styles.infoHighlight}>Local Backups:</Text> Saved to device storage (Documents or Cache folder)
            </Text>
            <Text style={styles.infoText}>
              • <Text style={styles.infoHighlight}>Google Drive:</Text> Cloud backup with automatic sync and folder selection
            </Text>
            <Text style={styles.infoText}>
              • <Text style={styles.infoHighlight}>Import & Tally:</Text> Analyze backup data with detailed statistics
            </Text>
            <Text style={styles.infoText}>
              • <Text style={styles.infoHighlight}>Troubleshooting:</Text> If local backup fails, try Setup Backup Folder first
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
  infoHighlight: {
    fontWeight: '600',
    color: colors.text,
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
