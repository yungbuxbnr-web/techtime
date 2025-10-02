
import * as FileSystem from 'expo-file-system';
import { StorageService } from './storage';
import { Job, AppSettings } from '../types';

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

export const BackupService = {
  async createBackup(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      console.log('Starting backup process...');
      
      // Check if document directory is available
      if (!FileSystem.documentDirectory) {
        console.log('Document directory not available');
        return { success: false, message: 'Document directory not available on this device' };
      }

      // Create techtrace folder if it doesn't exist
      const backupFolderPath = `${FileSystem.documentDirectory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupFolderPath, { intermediates: true });
        console.log('Created techtrace backup folder');
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
      await FileSystem.writeAsStringAsync(
        backupFilePath,
        JSON.stringify(backupData, null, 2),
        { encoding: 'utf8' }
      );

      // Also create a latest backup file for easy access
      const latestBackupPath = `${backupFolderPath}${BACKUP_FILE_NAME}`;
      await FileSystem.writeAsStringAsync(
        latestBackupPath,
        JSON.stringify(backupData, null, 2),
        { encoding: 'utf8' }
      );

      console.log('Backup created successfully at:', backupFilePath);
      return {
        success: true,
        message: `Backup created successfully!\n\nLocation: Documents/techtrace/\nJobs backed up: ${jobs.length}\nTotal AWs: ${totalAWs}`,
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
      
      // Check if document directory is available
      if (!FileSystem.documentDirectory) {
        console.log('Document directory not available');
        return { success: false, message: 'Document directory not available on this device' };
      }

      // Check if techtrace folder exists
      const backupFolderPath = `${FileSystem.documentDirectory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        console.log('Backup folder does not exist');
        return { success: false, message: 'No backup folder found. Please create a backup first or ensure the techtrace folder exists in Documents.' };
      }

      // Check if backup file exists
      const backupFilePath = `${backupFolderPath}${BACKUP_FILE_NAME}`;
      const fileInfo = await FileSystem.getInfoAsync(backupFilePath);
      
      if (!fileInfo.exists) {
        console.log('Backup file does not exist');
        return { success: false, message: 'No backup file found in the techtrace folder. Please ensure backup.json exists.' };
      }

      // Read backup file
      const backupContent = await FileSystem.readAsStringAsync(backupFilePath, {
        encoding: 'utf8'
      });

      // Parse backup data
      const backupData: BackupData = JSON.parse(backupContent);

      // Validate backup data structure
      if (!backupData.jobs || !backupData.settings || !backupData.metadata) {
        console.log('Invalid backup file structure');
        return { success: false, message: 'Invalid backup file format. The backup file appears to be corrupted.' };
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
      if (!FileSystem.documentDirectory) {
        return { success: false, files: [], message: 'Document directory not available' };
      }

      const backupFolderPath = `${FileSystem.documentDirectory}${BACKUP_FOLDER_NAME}/`;
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
    if (!FileSystem.documentDirectory) {
      return null;
    }
    return `${FileSystem.documentDirectory}${BACKUP_FOLDER_NAME}/`;
  },

  async ensureBackupFolderExists(): Promise<{ success: boolean; message: string }> {
    try {
      if (!FileSystem.documentDirectory) {
        return { success: false, message: 'Document directory not available on this device' };
      }

      const backupFolderPath = `${FileSystem.documentDirectory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupFolderPath, { intermediates: true });
        console.log('Created techtrace backup folder at:', backupFolderPath);
        return { 
          success: true, 
          message: `Backup folder created successfully at:\nDocuments/${BACKUP_FOLDER_NAME}/` 
        };
      } else {
        console.log('Backup folder already exists at:', backupFolderPath);
        return { 
          success: true, 
          message: `Backup folder already exists at:\nDocuments/${BACKUP_FOLDER_NAME}/` 
        };
      }
    } catch (error) {
      console.log('Error ensuring backup folder exists:', error);
      return {
        success: false,
        message: `Failed to create backup folder: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};
