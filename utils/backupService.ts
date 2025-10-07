
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
