
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

// Helper function to get document directory with proper type handling
const getDocumentDirectory = (): string | null => {
  try {
    // Use type assertion to access documentDirectory
    const fs = FileSystem as any;
    const docDir = fs.documentDirectory || null;
    console.log('Document directory:', docDir);
    return docDir;
  } catch (error) {
    console.log('Error accessing document directory:', error);
    return null;
  }
};

// Helper function to get cache directory with proper type handling
const getCacheDirectory = (): string | null => {
  try {
    // Use type assertion to access cacheDirectory
    const fs = FileSystem as any;
    const cacheDir = fs.cacheDirectory || null;
    console.log('Cache directory:', cacheDir);
    return cacheDir;
  } catch (error) {
    console.log('Error accessing cache directory:', error);
    return null;
  }
};

// Helper function to get encoding type with proper type handling
const getEncodingType = () => {
  try {
    // Use type assertion to access EncodingType
    const fs = FileSystem as any;
    return fs.EncodingType?.UTF8 || 'utf8';
  } catch (error) {
    console.log('Error accessing encoding type:', error);
    return 'utf8';
  }
};

// Helper function to get available directories with fallback
const getAvailableDirectory = (): { directory: string; type: 'document' | 'cache' } | null => {
  // Try document directory first
  const documentDir = getDocumentDirectory();
  if (documentDir) {
    console.log('Using document directory:', documentDir);
    return { directory: documentDir, type: 'document' };
  }
  
  // Fallback to cache directory
  const cacheDir = getCacheDirectory();
  if (cacheDir) {
    console.log('Document directory not available, using cache directory:', cacheDir);
    return { directory: cacheDir, type: 'cache' };
  }
  
  console.log('No file system directory available');
  return null;
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
    await FileSystem.writeAsStringAsync(testFilePath, 'test', { encoding: getEncodingType() });
    await FileSystem.deleteAsync(testFilePath, { idempotent: true });
    console.log('Directory is writable:', directoryPath);
    return true;
  } catch (error) {
    console.log('Directory not writable:', directoryPath, error);
    return false;
  }
};

// Verify backup file integrity
const verifyBackupFile = async (filePath: string): Promise<{ valid: boolean; message: string }> => {
  try {
    console.log('Verifying backup file:', filePath);
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      return { valid: false, message: 'Backup file does not exist' };
    }
    
    // Check file size
    if (fileInfo.size === 0) {
      return { valid: false, message: 'Backup file is empty' };
    }
    
    // Read and parse file content
    const content = await FileSystem.readAsStringAsync(filePath, { encoding: getEncodingType() });
    const data = JSON.parse(content);
    
    // Validate structure
    if (!data.version || !data.timestamp || !data.jobs || !data.settings || !data.metadata) {
      return { valid: false, message: 'Backup file has invalid structure' };
    }
    
    console.log('Backup file is valid. Jobs:', data.jobs.length, 'Size:', fileInfo.size, 'bytes');
    return { 
      valid: true, 
      message: `Valid backup file with ${data.jobs.length} jobs (${(fileInfo.size / 1024).toFixed(2)} KB)` 
    };
  } catch (error) {
    console.log('Error verifying backup file:', error);
    return { 
      valid: false, 
      message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

export const BackupService = {
  async requestPermissions(): Promise<{ success: boolean; message: string }> {
    return await requestStoragePermissions();
  },

  async createBackup(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      console.log('=== STARTING BACKUP PROCESS ===');
      
      // Step 1: Request permissions
      console.log('Step 1: Requesting permissions...');
      const permissionResult = await requestStoragePermissions();
      if (!permissionResult.success) {
        console.log('Permission request failed:', permissionResult.message);
        return permissionResult;
      }
      console.log('✓ Permissions granted');

      // Step 2: Get available directory
      console.log('Step 2: Getting available directory...');
      const directoryInfo = getAvailableDirectory();
      
      if (!directoryInfo) {
        console.log('✗ No file system directory available');
        return { 
          success: false, 
          message: 'File system not available on this device. This may happen if:\n\n• Storage permissions are not granted\n• Device storage is full\n• App does not have file system access\n\nPlease check your device settings and try again.' 
        };
      }

      const { directory, type } = directoryInfo;
      console.log('✓ Directory available:', directory);

      // Step 3: Check if directory is writable
      console.log('Step 3: Checking directory write permissions...');
      const isWritable = await checkDirectoryWritable(directory);
      if (!isWritable) {
        console.log('✗ Directory not writable');
        return {
          success: false,
          message: `Cannot write to ${type} directory. Please check:\n\n• Storage permissions are granted\n• Device has available storage space\n• App has write access to storage\n\nTry restarting the app or checking device settings.`
        };
      }
      console.log('✓ Directory is writable');

      // Step 4: Create techtrace folder if it doesn't exist
      console.log('Step 4: Creating/verifying backup folder...');
      const backupFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
      
      try {
        const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
        
        if (!folderInfo.exists) {
          console.log('Creating backup folder at:', backupFolderPath);
          await FileSystem.makeDirectoryAsync(backupFolderPath, { intermediates: true });
          
          // Verify folder was created successfully
          const verifyFolderInfo = await FileSystem.getInfoAsync(backupFolderPath);
          if (!verifyFolderInfo.exists) {
            console.log('✗ Failed to create backup folder');
            return { 
              success: false, 
              message: 'Failed to create backup folder. Please check storage permissions and available space.' 
            };
          }
          console.log('✓ Backup folder created successfully');
        } else {
          console.log('✓ Backup folder already exists');
        }
      } catch (folderError) {
        console.log('✗ Error with backup folder:', folderError);
        return { 
          success: false, 
          message: `Failed to access backup folder: ${folderError instanceof Error ? folderError.message : 'Unknown error'}` 
        };
      }

      // Step 5: Get all data from storage
      console.log('Step 5: Loading data from storage...');
      const jobs = await StorageService.getJobs();
      const settings = await StorageService.getSettings();
      console.log('✓ Data loaded. Jobs:', jobs.length);

      // Step 6: Calculate metadata
      console.log('Step 6: Calculating metadata...');
      const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
      const currentDate = new Date().toISOString();
      console.log('✓ Metadata calculated. Total AWs:', totalAWs);

      // Step 7: Create backup data structure
      console.log('Step 7: Creating backup data structure...');
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
      console.log('✓ Backup data structure created');

      // Step 8: Create backup file with timestamp
      console.log('Step 8: Writing backup files...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupFileName = `backup_${timestamp}.json`;
      const backupFilePath = `${backupFolderPath}${backupFileName}`;

      // Write timestamped backup file
      try {
        await FileSystem.writeAsStringAsync(
          backupFilePath,
          JSON.stringify(backupData, null, 2),
          { encoding: getEncodingType() }
        );
        console.log('✓ Timestamped backup file written:', backupFileName);
      } catch (writeError) {
        console.log('✗ Error writing backup file:', writeError);
        return { 
          success: false, 
          message: `Failed to write backup file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}` 
        };
      }

      // Step 9: Also create a latest backup file for easy access
      console.log('Step 9: Creating latest backup file...');
      const latestBackupPath = `${backupFolderPath}${BACKUP_FILE_NAME}`;
      try {
        await FileSystem.writeAsStringAsync(
          latestBackupPath,
          JSON.stringify(backupData, null, 2),
          { encoding: getEncodingType() }
        );
        console.log('✓ Latest backup file written');
      } catch (latestWriteError) {
        console.log('⚠ Warning: Error writing latest backup file:', latestWriteError);
        // Don't fail the entire backup if latest file fails
      }

      // Step 10: Verify backup file integrity
      console.log('Step 10: Verifying backup file integrity...');
      const verificationResult = await verifyBackupFile(backupFilePath);
      if (!verificationResult.valid) {
        console.log('✗ Backup verification failed:', verificationResult.message);
        return {
          success: false,
          message: `Backup created but verification failed: ${verificationResult.message}`
        };
      }
      console.log('✓ Backup verified successfully');

      const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
      console.log('=== BACKUP PROCESS COMPLETED SUCCESSFULLY ===');
      
      return {
        success: true,
        message: `✅ Backup created and verified successfully!\n\n📁 Location: ${directoryTypeText}/${BACKUP_FOLDER_NAME}/\n📄 File: ${backupFileName}\n📊 Jobs backed up: ${jobs.length}\n⏱️ Total AWs: ${totalAWs}\n💾 ${verificationResult.message}${type === 'cache' ? '\n\n⚠️ Note: Saved to cache directory. For permanent storage, ensure document directory access.' : ''}`,
        filePath: backupFilePath
      };

    } catch (error) {
      console.log('✗ BACKUP PROCESS FAILED:', error);
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease ensure:\n• Storage permissions are granted\n• Device has available storage space\n• App has file system access`
      };
    }
  },

  async importBackup(): Promise<{ success: boolean; message: string; data?: BackupData }> {
    try {
      console.log('=== STARTING IMPORT PROCESS ===');
      
      // Step 1: Get available directory
      console.log('Step 1: Getting available directory...');
      const directoryInfo = getAvailableDirectory();
      
      if (!directoryInfo) {
        console.log('✗ No file system directory available');
        return { 
          success: false, 
          message: 'File system not available on this device. Cannot access local backups.' 
        };
      }

      const { directory, type } = directoryInfo;
      console.log('✓ Directory available:', directory);

      // Step 2: Check if techtrace folder exists
      console.log('Step 2: Checking backup folder...');
      const backupFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
        console.log('✗ Backup folder does not exist');
        return { 
          success: false, 
          message: `No backup folder found. Please create a backup first or ensure the ${BACKUP_FOLDER_NAME} folder exists in ${directoryTypeText}.` 
        };
      }
      console.log('✓ Backup folder exists');

      // Step 3: Check if backup file exists
      console.log('Step 3: Checking backup file...');
      const backupFilePath = `${backupFolderPath}${BACKUP_FILE_NAME}`;
      const fileInfo = await FileSystem.getInfoAsync(backupFilePath);
      
      if (!fileInfo.exists) {
        console.log('✗ Backup file does not exist');
        return { 
          success: false, 
          message: `No backup file found in the ${BACKUP_FOLDER_NAME} folder. Please ensure ${BACKUP_FILE_NAME} exists.` 
        };
      }
      console.log('✓ Backup file exists');

      // Step 4: Verify backup file integrity
      console.log('Step 4: Verifying backup file...');
      const verificationResult = await verifyBackupFile(backupFilePath);
      if (!verificationResult.valid) {
        console.log('✗ Backup verification failed:', verificationResult.message);
        return {
          success: false,
          message: `Backup file verification failed: ${verificationResult.message}`
        };
      }
      console.log('✓ Backup file verified');

      // Step 5: Read backup file
      console.log('Step 5: Reading backup file...');
      const backupContent = await FileSystem.readAsStringAsync(backupFilePath, {
        encoding: getEncodingType()
      });

      // Step 6: Parse backup data
      console.log('Step 6: Parsing backup data...');
      const backupData: BackupData = JSON.parse(backupContent);

      // Step 7: Validate backup data structure
      console.log('Step 7: Validating backup structure...');
      if (!backupData.jobs || !backupData.settings || !backupData.metadata) {
        console.log('✗ Invalid backup file structure');
        return { 
          success: false, 
          message: 'Invalid backup file format. The backup file appears to be corrupted.' 
        };
      }
      console.log('✓ Backup structure valid');

      console.log('=== IMPORT PROCESS COMPLETED SUCCESSFULLY ===');
      console.log('Backup data loaded:', {
        jobs: backupData.jobs.length,
        totalAWs: backupData.metadata.totalAWs,
        backupDate: backupData.timestamp
      });

      return {
        success: true,
        message: `✅ Backup file loaded and verified successfully!\n\n📊 Jobs found: ${backupData.jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n📅 Backup date: ${new Date(backupData.timestamp).toLocaleDateString()}\n💾 ${verificationResult.message}`,
        data: backupData
      };

    } catch (error) {
      console.log('✗ IMPORT PROCESS FAILED:', error);
      return {
        success: false,
        message: `Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  async restoreFromBackup(backupData: BackupData): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== STARTING RESTORE PROCESS ===');

      // Step 1: Clear existing data first
      console.log('Step 1: Clearing existing data...');
      await StorageService.clearAllData();
      console.log('✓ Existing data cleared');

      // Step 2: Restore jobs
      console.log('Step 2: Restoring jobs...');
      for (const job of backupData.jobs) {
        await StorageService.saveJob(job);
      }
      console.log('✓ Jobs restored:', backupData.jobs.length);

      // Step 3: Restore settings (but keep authentication state as false)
      console.log('Step 3: Restoring settings...');
      const settingsToRestore = {
        ...backupData.settings,
        isAuthenticated: false
      };
      await StorageService.saveSettings(settingsToRestore);
      console.log('✓ Settings restored');

      console.log('=== RESTORE PROCESS COMPLETED SUCCESSFULLY ===');

      return {
        success: true,
        message: `✅ Data restored successfully!\n\n📊 Jobs restored: ${backupData.jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n\n🔐 Please sign in again to access the app.`
      };

    } catch (error) {
      console.log('✗ RESTORE PROCESS FAILED:', error);
      return {
        success: false,
        message: `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  async listBackupFiles(): Promise<{ success: boolean; files: string[]; message?: string }> {
    try {
      const directoryInfo = getAvailableDirectory();
      
      if (!directoryInfo) {
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
      const directoryInfo = getAvailableDirectory();
      if (!directoryInfo) {
        return null;
      }
      return `${directoryInfo.directory}${BACKUP_FOLDER_NAME}/`;
    } catch (error) {
      console.log('Error getting backup folder path:', error);
      return null;
    }
  },

  async ensureBackupFolderExists(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== ENSURING BACKUP FOLDER EXISTS ===');
      
      // Step 1: Request permissions
      console.log('Step 1: Requesting permissions...');
      const permissionResult = await requestStoragePermissions();
      if (!permissionResult.success) {
        console.log('✗ Permission request failed');
        return permissionResult;
      }
      console.log('✓ Permissions granted');

      // Step 2: Get available directory
      console.log('Step 2: Getting available directory...');
      const directoryInfo = getAvailableDirectory();
      
      if (!directoryInfo) {
        console.log('✗ No file system directory available');
        return { 
          success: false, 
          message: 'File system not available on this device. Cannot create backup folders.' 
        };
      }

      const { directory, type } = directoryInfo;
      console.log('✓ Directory available:', directory);

      // Step 3: Check if directory is writable
      console.log('Step 3: Checking directory write permissions...');
      const isWritable = await checkDirectoryWritable(directory);
      if (!isWritable) {
        console.log('✗ Directory not writable');
        return {
          success: false,
          message: `Cannot write to ${type} directory. Please check storage permissions and available space.`
        };
      }
      console.log('✓ Directory is writable');

      // Step 4: Create or verify backup folder
      console.log('Step 4: Creating/verifying backup folder...');
      const backupFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      
      if (!folderInfo.exists) {
        try {
          await FileSystem.makeDirectoryAsync(backupFolderPath, { intermediates: true });
          console.log('✓ Created backup folder at:', backupFolderPath);
          
          // Verify folder was created
          const verifyInfo = await FileSystem.getInfoAsync(backupFolderPath);
          if (!verifyInfo.exists) {
            console.log('✗ Failed to verify folder creation');
            return { 
              success: false, 
              message: 'Failed to create backup folder. Please check storage permissions and available space.' 
            };
          }
          
          const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
          console.log('=== BACKUP FOLDER CREATED SUCCESSFULLY ===');
          return { 
            success: true, 
            message: `✅ Backup folder created successfully!\n\n📁 Location: ${directoryTypeText}/${BACKUP_FOLDER_NAME}/\n\n✓ You can now create backups.${type === 'cache' ? '\n\n⚠️ Note: Using cache directory. For permanent storage, ensure document directory access.' : ''}` 
          };
        } catch (createError) {
          console.log('✗ Error creating backup folder:', createError);
          return {
            success: false,
            message: `Failed to create backup folder: ${createError instanceof Error ? createError.message : 'Unknown error'}\n\nPlease check storage permissions in your device settings.`
          };
        }
      } else {
        console.log('✓ Backup folder already exists at:', backupFolderPath);
        const directoryTypeText = type === 'document' ? 'Documents' : 'Cache';
        console.log('=== BACKUP FOLDER VERIFIED ===');
        return { 
          success: true, 
          message: `✅ Backup folder already exists!\n\n📁 Location: ${directoryTypeText}/${BACKUP_FOLDER_NAME}/\n\n✓ Ready for backups.` 
        };
      }
    } catch (error) {
      console.log('✗ ERROR ENSURING BACKUP FOLDER:', error);
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
      
      const directoryInfo = getAvailableDirectory();
      
      if (!directoryInfo) {
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
        { encoding: getEncodingType() }
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
