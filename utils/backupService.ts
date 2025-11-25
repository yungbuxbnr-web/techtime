
/* eslint-disable import/namespace */
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { StorageService } from './storage';
import { Job, AppSettings } from '../types';
import { Platform } from 'react-native';
import * as FileSystemService from '../src/services/fileSystemService';

const BACKUP_FOLDER_NAME = 'TechTraceData';
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

// iOS-optimized: Get document directory with proper error handling
const getDocumentDirectory = (): string | null => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Always use documentDirectory (backed up to iCloud if enabled)
      const docDir = FileSystem.documentDirectory;
      if (docDir) {
        console.log('[iOS] Document directory:', docDir);
        return docDir;
      }
    } else {
      // Android: Use documentDirectory
      const docDir = FileSystem.documentDirectory;
      if (docDir) {
        console.log('[Android] Document directory:', docDir);
        return docDir;
      }
    }
    console.log('Document directory not available');
    return null;
  } catch (error) {
    console.log('Error accessing document directory:', error);
    return null;
  }
};

// iOS-optimized: Get cache directory as fallback
const getCacheDirectory = (): string | null => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      console.log('Cache directory:', cacheDir);
      return cacheDir;
    }
    console.log('Cache directory not available');
    return null;
  } catch (error) {
    console.log('Error accessing cache directory:', error);
    return null;
  }
};

// iOS-optimized: Get available directory with iOS preference
const getAvailableDirectory = (): { directory: string; type: 'document' | 'cache' } | null => {
  // iOS: Always prefer document directory (iCloud backup compatible)
  const documentDir = getDocumentDirectory();
  if (documentDir) {
    console.log('Using document directory:', documentDir);
    return { directory: documentDir, type: 'document' };
  }
  
  // Fallback to cache directory (not backed up)
  const cacheDir = getCacheDirectory();
  if (cacheDir) {
    console.log('Document directory not available, using cache directory:', cacheDir);
    return { directory: cacheDir, type: 'cache' };
  }
  
  console.log('No file system directory available');
  return null;
};

// iOS-optimized: Request storage permissions
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
      // iOS: No explicit permissions needed for document directory
      console.log('[iOS] No explicit permissions needed for document directory');
      return { success: true, message: 'iOS: Permissions not required for document directory' };
    }
  } catch (error) {
    console.log('Error requesting storage permissions:', error);
    return { 
      success: false, 
      message: `Failed to request permissions: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

// iOS-optimized: Check if directory is writable
const checkDirectoryWritable = async (directoryPath: string): Promise<boolean> => {
  try {
    const testFilePath = `${directoryPath}test_write_${Date.now()}.tmp`;
    await FileSystem.writeAsStringAsync(testFilePath, 'test', { 
      encoding: FileSystem.EncodingType.UTF8
    });
    await FileSystem.deleteAsync(testFilePath, { idempotent: true });
    console.log('Directory is writable:', directoryPath);
    return true;
  } catch (error) {
    console.log('Directory not writable:', directoryPath, error);
    return false;
  }
};

// iOS-optimized: Verify backup file integrity
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
    const content = await FileSystem.readAsStringAsync(filePath, { 
      encoding: FileSystem.EncodingType.UTF8
    });
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

// iOS-optimized: Get operating folder path
const getOperatingFolderPath = async (): Promise<string | null> => {
  try {
    const directoryInfo = getAvailableDirectory();
    if (!directoryInfo) {
      return null;
    }
    
    const operatingFolderPath = `${directoryInfo.directory}${BACKUP_FOLDER_NAME}/`;
    console.log('[Operating Folder] Path:', operatingFolderPath);
    return operatingFolderPath;
  } catch (error) {
    console.log('Error getting operating folder path:', error);
    return null;
  }
};

// iOS-optimized: Ensure operating folder exists
const ensureOperatingFolderExists = async (): Promise<{ success: boolean; path: string | null; message: string }> => {
  try {
    console.log('=== ENSURING OPERATING FOLDER EXISTS ===');
    
    const directoryInfo = getAvailableDirectory();
    if (!directoryInfo) {
      return { 
        success: false, 
        path: null,
        message: 'File system not available on this device' 
      };
    }

    const { directory, type } = directoryInfo;
    const operatingFolderPath = `${directory}${BACKUP_FOLDER_NAME}/`;
    
    // Check if folder exists
    const folderInfo = await FileSystem.getInfoAsync(operatingFolderPath);
    
    if (!folderInfo.exists) {
      console.log('[Operating Folder] Creating folder at:', operatingFolderPath);
      await FileSystem.makeDirectoryAsync(operatingFolderPath, { intermediates: true });
      
      // Verify creation
      const verifyInfo = await FileSystem.getInfoAsync(operatingFolderPath);
      if (!verifyInfo.exists) {
        return { 
          success: false, 
          path: null,
          message: 'Failed to create operating folder' 
        };
      }
      
      console.log('[Operating Folder] Created successfully');
      return { 
        success: true, 
        path: operatingFolderPath,
        message: `Operating folder created at ${type === 'document' ? 'Documents' : 'Cache'}/${BACKUP_FOLDER_NAME}/` 
      };
    } else {
      console.log('[Operating Folder] Already exists');
      return { 
        success: true, 
        path: operatingFolderPath,
        message: `Operating folder exists at ${type === 'document' ? 'Documents' : 'Cache'}/${BACKUP_FOLDER_NAME}/` 
      };
    }
  } catch (error) {
    console.log('[Operating Folder] Error:', error);
    return { 
      success: false, 
      path: null,
      message: `Failed to ensure operating folder: ${error instanceof Error ? error.message : 'Unknown error'}` 
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
      
      // Step 1: Ensure operating folder exists
      console.log('Step 1: Ensuring operating folder exists...');
      const folderResult = await ensureOperatingFolderExists();
      if (!folderResult.success || !folderResult.path) {
        console.log('✗ Failed to ensure operating folder');
        return { 
          success: false, 
          message: folderResult.message 
        };
      }
      console.log('✓ Operating folder ready:', folderResult.path);

      // Step 2: Check if directory is writable
      console.log('Step 2: Checking directory write permissions...');
      const isWritable = await checkDirectoryWritable(folderResult.path);
      if (!isWritable) {
        console.log('✗ Directory not writable');
        return {
          success: false,
          message: 'Cannot write to operating folder. Please check storage permissions and available space.'
        };
      }
      console.log('✓ Directory is writable');

      // Step 3: Get all data from storage
      console.log('Step 3: Loading data from storage...');
      const jobs = await StorageService.getJobs();
      const settings = await StorageService.getSettings();
      console.log('✓ Data loaded. Jobs:', jobs.length);

      // Step 4: Calculate metadata
      console.log('Step 4: Calculating metadata...');
      const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
      const currentDate = new Date().toISOString();
      console.log('✓ Metadata calculated. Total AWs:', totalAWs);

      // Step 5: Create backup data structure
      console.log('Step 5: Creating backup data structure...');
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: currentDate,
        jobs,
        settings: {
          ...settings,
          isAuthenticated: false
        },
        metadata: {
          totalJobs: jobs.length,
          totalAWs,
          exportDate: currentDate,
          appVersion: '1.0.0'
        }
      };
      console.log('✓ Backup data structure created');

      // Step 6: Create backup files using centralized file system service
      console.log('Step 6: Writing backup files using centralized service...');
      const backupContent = JSON.stringify(backupData, null, 2);
      const result = await FileSystemService.writeBackupFile(backupContent);
      
      if (!result.success) {
        console.log('✗ Failed to write backup file:', result.message);
        return {
          success: false,
          message: result.message || 'Failed to write backup file'
        };
      }
      
      console.log('✓ Backup file written:', result.path);

      // Step 7: Also create a latest backup file in operating folder
      console.log('Step 7: Creating latest backup file in operating folder...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupFileName = `backup_${timestamp}.json`;
      const backupFilePath = `${folderResult.path}${backupFileName}`;

      await FileSystem.writeAsStringAsync(
        backupFilePath,
        backupContent,
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      console.log('✓ Timestamped backup file written:', backupFileName);

      const latestBackupPath = `${folderResult.path}${BACKUP_FILE_NAME}`;
      await FileSystem.writeAsStringAsync(
        latestBackupPath,
        backupContent,
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      console.log('✓ Latest backup file written');

      // Step 8: Verify backup file integrity
      console.log('Step 8: Verifying backup file integrity...');
      const verificationResult = await verifyBackupFile(backupFilePath);
      if (!verificationResult.valid) {
        console.log('✗ Backup verification failed:', verificationResult.message);
        return {
          success: false,
          message: `Backup created but verification failed: ${verificationResult.message}`
        };
      }
      console.log('✓ Backup verified successfully');

      console.log('=== BACKUP PROCESS COMPLETED SUCCESSFULLY ===');
      
      return {
        success: true,
        message: `✅ Backup created and verified successfully!\n\n📁 Location: ${BACKUP_FOLDER_NAME}/\n📄 File: ${backupFileName}\n📊 Jobs backed up: ${jobs.length}\n⏱️ Total AWs: ${totalAWs}\n💾 ${verificationResult.message}${Platform.OS === 'ios' ? '\n\n☁️ Note: Backed up to app Documents folder (iCloud compatible)' : ''}`,
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

  async shareBackup(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== STARTING SHARE BACKUP PROCESS ===');
      
      // Step 1: Check if sharing is available
      console.log('Step 1: Checking if sharing is available...');
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        console.log('✗ Sharing not available on this device');
        return {
          success: false,
          message: 'Sharing is not available on this device or platform.'
        };
      }
      console.log('✓ Sharing is available');

      // Step 2: Create a fresh backup
      console.log('Step 2: Creating backup for sharing...');
      const backupResult = await BackupService.createBackup();
      
      if (!backupResult.success || !backupResult.filePath) {
        console.log('✗ Failed to create backup for sharing');
        return {
          success: false,
          message: backupResult.message || 'Failed to create backup file for sharing'
        };
      }
      console.log('✓ Backup created at:', backupResult.filePath);

      // Step 3: Verify the file exists
      console.log('Step 3: Verifying backup file exists...');
      const fileInfo = await FileSystem.getInfoAsync(backupResult.filePath);
      
      if (!fileInfo.exists) {
        console.log('✗ Backup file does not exist');
        return {
          success: false,
          message: 'Backup file was created but cannot be found.'
        };
      }
      console.log('✓ Backup file exists, size:', fileInfo.size, 'bytes');

      // Step 4: Share the backup file
      console.log('Step 4: Opening share dialog...');
      
      await Sharing.shareAsync(backupResult.filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share TechTrace Backup',
        UTI: 'public.json'
      });

      console.log('=== SHARE BACKUP PROCESS COMPLETED ===');
      
      return {
        success: true,
        message: '✅ Backup file shared successfully!\n\nYou can now:\n• Save to cloud storage (Drive, Dropbox, etc.)\n• Send via email or messaging apps\n• Transfer to another device\n• Save to Files app'
      };

    } catch (error) {
      console.log('✗ SHARE BACKUP PROCESS FAILED:', error);
      
      // Check if user cancelled
      if (error instanceof Error && 
          (error.message.includes('cancel') || 
           error.message.includes('dismiss') ||
           error.message.includes('abort'))) {
        return {
          success: false,
          message: 'Sharing cancelled by user.'
        };
      }
      
      return {
        success: false,
        message: `Failed to share backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  async importBackup(): Promise<{ success: boolean; message: string; data?: BackupData }> {
    try {
      console.log('=== STARTING IMPORT PROCESS ===');
      
      // Step 1: Get operating folder path
      console.log('Step 1: Getting operating folder path...');
      const operatingFolderPath = await getOperatingFolderPath();
      
      if (!operatingFolderPath) {
        console.log('✗ Operating folder not available');
        return { 
          success: false, 
          message: 'Operating folder not available. Please create a backup first.' 
        };
      }
      console.log('✓ Operating folder path:', operatingFolderPath);

      // Step 2: Check if backup file exists
      console.log('Step 2: Checking backup file...');
      const backupFilePath = `${operatingFolderPath}${BACKUP_FILE_NAME}`;
      const fileInfo = await FileSystem.getInfoAsync(backupFilePath);
      
      if (!fileInfo.exists) {
        console.log('✗ Backup file does not exist');
        return { 
          success: false, 
          message: `No backup file found in ${BACKUP_FOLDER_NAME} folder. Please create a backup first.` 
        };
      }
      console.log('✓ Backup file exists');

      // Step 3: Verify backup file integrity
      console.log('Step 3: Verifying backup file...');
      const verificationResult = await verifyBackupFile(backupFilePath);
      if (!verificationResult.valid) {
        console.log('✗ Backup verification failed:', verificationResult.message);
        return {
          success: false,
          message: `Backup file verification failed: ${verificationResult.message}`
        };
      }
      console.log('✓ Backup file verified');

      // Step 4: Read backup file using centralized service
      console.log('Step 4: Reading backup file using centralized service...');
      const readResult = await FileSystemService.readBackupFile(backupFilePath);
      
      if (!readResult.success || !readResult.data) {
        console.log('✗ Failed to read backup file:', readResult.message);
        return {
          success: false,
          message: readResult.message || 'Failed to read backup file'
        };
      }
      
      const backupData: BackupData = readResult.data;
      console.log('✓ Backup file read successfully');

      // Step 5: Validate backup data structure
      console.log('Step 5: Validating backup structure...');
      if (!backupData.jobs || !backupData.settings || !backupData.metadata) {
        console.log('✗ Invalid backup file structure');
        return { 
          success: false, 
          message: 'Invalid backup file format. The backup file appears to be corrupted.' 
        };
      }
      console.log('✓ Backup structure valid');

      console.log('=== IMPORT PROCESS COMPLETED SUCCESSFULLY ===');

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

      // Step 1: Clear existing data
      console.log('Step 1: Clearing existing data...');
      await StorageService.clearAllData();
      console.log('✓ Existing data cleared');

      // Step 2: Restore jobs
      console.log('Step 2: Restoring jobs...');
      for (const job of backupData.jobs) {
        await StorageService.saveJob(job);
      }
      console.log('✓ Jobs restored:', backupData.jobs.length);

      // Step 3: Restore settings
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
      const operatingFolderPath = await getOperatingFolderPath();
      
      if (!operatingFolderPath) {
        return { success: false, files: [], message: 'Operating folder not available' };
      }

      const folderInfo = await FileSystem.getInfoAsync(operatingFolderPath);
      
      if (!folderInfo.exists) {
        return { success: false, files: [], message: 'Operating folder does not exist' };
      }

      const files = await FileSystem.readDirectoryAsync(operatingFolderPath);
      const backupFiles = files.filter(file => file.endsWith('.json'));
      
      console.log('Found backup files:', backupFiles);
      return { success: true, files: backupFiles };

    } catch (error) {
      console.log('Error listing backup files:', error);
      return { success: false, files: [], message: 'Error accessing operating folder' };
    }
  },

  async getBackupFolderPath(): Promise<string | null> {
    return await getOperatingFolderPath();
  },

  async ensureBackupFolderExists(): Promise<{ success: boolean; message: string }> {
    const result = await ensureOperatingFolderExists();
    return {
      success: result.success,
      message: result.message
    };
  }
};
