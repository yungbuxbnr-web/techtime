
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { StorageService } from './storage';
import { Job, AppSettings } from '../types';
import * as FileSystemService from '../src/services/fileSystemService';

export interface BackupData {
  version: string;
  backupVersion?: string;
  timestamp: string;
  createdAt?: string;
  jobs: Job[];
  settings: AppSettings;
  metadata: {
    totalJobs: number;
    totalAWs: number;
    exportDate: string;
    appVersion: string;
    platform?: string;
  };
}

export const BackupService = {
  /**
   * Create a backup using the centralized file system service
   */
  async createBackup(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      console.log('=== STARTING BACKUP PROCESS (Centralized) ===');
      
      // Step 1: Get all app data
      console.log('Step 1: Loading app data...');
      const jobs = await StorageService.getJobs();
      const settings = await StorageService.getSettings();
      const technicianName = await StorageService.getTechnicianName();
      console.log('✓ Data loaded. Jobs:', jobs.length);

      // Step 2: Create backup data structure using centralized service
      console.log('Step 2: Creating backup data structure...');
      const backupData = FileSystemService.createBackupData(jobs, settings, technicianName || undefined);
      console.log('✓ Backup data structure created');

      // Step 3: Write backup file using centralized service
      console.log('Step 3: Writing backup file...');
      const backupContent = JSON.stringify(backupData, null, 2);
      const result = await FileSystemService.writeBackupFile(backupContent);
      
      if (!result.success) {
        console.error('✗ Failed to write backup file:', result.message);
        return {
          success: false,
          message: result.message || 'Failed to write backup file'
        };
      }
      
      console.log('✓ Backup file written:', result.path);

      // Step 4: Verify backup file integrity
      console.log('Step 4: Verifying backup file integrity...');
      if (result.path) {
        const verificationResult = await FileSystemService.readBackupFile(result.path);
        if (!verificationResult.success) {
          console.error('✗ Backup verification failed:', verificationResult.message);
          return {
            success: false,
            message: `Backup created but verification failed: ${verificationResult.message}`
          };
        }
        
        // Validate backup data structure
        const validation = FileSystemService.validateBackupData(verificationResult.data);
        if (!validation.valid) {
          console.error('✗ Backup validation failed:', validation.error);
          return {
            success: false,
            message: `Backup created but validation failed: ${validation.error}`
          };
        }
        
        console.log('✓ Backup verified and validated successfully');
      }

      // Step 5: Clean old backups (keep last 10)
      console.log('Step 5: Cleaning old backups...');
      const cleanResult = await FileSystemService.cleanOldBackups(10);
      if (cleanResult.success && cleanResult.deletedCount && cleanResult.deletedCount > 0) {
        console.log(`✓ Cleaned ${cleanResult.deletedCount} old backup files`);
      }

      console.log('=== BACKUP PROCESS COMPLETED SUCCESSFULLY ===');
      
      const fileName = result.path ? result.path.split('/').pop() : 'backup.json';
      return {
        success: true,
        message: `✅ Backup created and verified successfully!\n\n📁 Location: techtrace/backups/\n📄 File: ${fileName}\n📊 Jobs backed up: ${jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n💾 ${result.message}${Platform.OS === 'ios' ? '\n\n☁️ Note: Backed up to app Documents folder (iCloud compatible)' : ''}`,
        filePath: result.path
      };

    } catch (error) {
      console.error('✗ BACKUP PROCESS FAILED:', error);
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease ensure:\n• Storage permissions are granted\n• Device has available storage space\n• App has file system access`
      };
    }
  },

  /**
   * Share backup file using the system share sheet
   */
  async shareBackup(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== STARTING SHARE BACKUP PROCESS ===');
      
      // Step 1: Check if sharing is available
      console.log('Step 1: Checking if sharing is available...');
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        console.error('✗ Sharing not available on this device');
        return {
          success: false,
          message: 'Sharing is not available on this device or platform.'
        };
      }
      console.log('✓ Sharing is available');

      // Step 2: Get the latest backup file
      console.log('Step 2: Getting latest backup file...');
      const latestBackup = await FileSystemService.getLatestBackupFile();
      
      if (!latestBackup) {
        console.error('✗ No backup file found');
        return {
          success: false,
          message: 'No backup file found. Please create a backup first.'
        };
      }
      console.log('✓ Latest backup found:', latestBackup);

      // Step 3: Verify the file exists
      console.log('Step 3: Verifying backup file exists...');
      const fileExists = await FileSystemService.exists(latestBackup);
      
      if (!fileExists) {
        console.error('✗ Backup file does not exist');
        return {
          success: false,
          message: 'Backup file was found but cannot be accessed.'
        };
      }
      console.log('✓ Backup file exists');

      // Step 4: Share the backup file
      console.log('Step 4: Opening share dialog...');
      
      await Sharing.shareAsync(latestBackup, {
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
      console.error('✗ SHARE BACKUP PROCESS FAILED:', error);
      
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

  /**
   * Import backup from the latest backup file
   */
  async importBackup(): Promise<{ success: boolean; message: string; data?: BackupData }> {
    try {
      console.log('=== STARTING IMPORT PROCESS ===');
      
      // Step 1: Get the latest backup file
      console.log('Step 1: Getting latest backup file...');
      const latestBackup = await FileSystemService.getLatestBackupFile();
      
      if (!latestBackup) {
        console.error('✗ No backup file found');
        return { 
          success: false, 
          message: 'No backup file found in techtrace/backups/ folder. Please create a backup first.' 
        };
      }
      console.log('✓ Latest backup found:', latestBackup);

      // Step 2: Read and parse backup file
      console.log('Step 2: Reading backup file...');
      const readResult = await FileSystemService.readBackupFile(latestBackup);
      
      if (!readResult.success || !readResult.data) {
        console.error('✗ Failed to read backup file:', readResult.message);
        return {
          success: false,
          message: readResult.message || 'Failed to read backup file'
        };
      }
      
      const backupData: BackupData = readResult.data;
      console.log('✓ Backup file read successfully');

      // Step 3: Validate backup data structure
      console.log('Step 3: Validating backup structure...');
      const validation = FileSystemService.validateBackupData(backupData);
      if (!validation.valid) {
        console.error('✗ Invalid backup file structure:', validation.error);
        return { 
          success: false, 
          message: `Invalid backup file format: ${validation.error}` 
        };
      }
      console.log('✓ Backup structure valid');

      // Step 4: Get file info for display
      const fileInfo = await FileSystemService.getFileInfo(latestBackup);
      const fileSizeKB = fileInfo.info?.size ? (fileInfo.info.size / 1024).toFixed(2) : 'unknown';

      console.log('=== IMPORT PROCESS COMPLETED SUCCESSFULLY ===');

      return {
        success: true,
        message: `✅ Backup file loaded and verified successfully!\n\n📊 Jobs found: ${backupData.jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n📅 Backup date: ${new Date(backupData.timestamp).toLocaleDateString()}\n💾 File size: ${fileSizeKB} KB`,
        data: backupData
      };

    } catch (error) {
      console.error('✗ IMPORT PROCESS FAILED:', error);
      return {
        success: false,
        message: `Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Import backup from a file picker
   */
  async importFromFile(): Promise<{ success: boolean; message: string; data?: BackupData }> {
    try {
      console.log('=== STARTING FILE IMPORT PROCESS ===');
      
      // Step 1: Open file picker
      console.log('Step 1: Opening file picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'ios' 
          ? ['public.json', 'public.plain-text', 'public.data']
          : ['application/json', 'text/plain', 'application/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('✗ File picker cancelled or no file selected');
        return {
          success: false,
          message: 'No file selected'
        };
      }
      
      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name || 'unknown';
      console.log('✓ File selected:', fileName);

      // Step 2: Read and parse the file
      console.log('Step 2: Reading file...');
      const readResult = await FileSystemService.readStringFromFile(fileUri);
      
      if (!readResult.success || !readResult.content) {
        console.error('✗ Failed to read file:', readResult.message);
        return {
          success: false,
          message: readResult.message || 'Failed to read file'
        };
      }
      
      // Parse JSON
      let backupData: BackupData;
      try {
        backupData = JSON.parse(readResult.content);
      } catch (parseError) {
        console.error('✗ Failed to parse JSON:', parseError);
        return {
          success: false,
          message: 'Invalid JSON format in file'
        };
      }
      console.log('✓ File read and parsed successfully');

      // Step 3: Validate backup data structure
      console.log('Step 3: Validating backup structure...');
      const validation = FileSystemService.validateBackupData(backupData);
      if (!validation.valid) {
        console.error('✗ Invalid backup file structure:', validation.error);
        return {
          success: false,
          message: `Invalid backup file format: ${validation.error}`
        };
      }
      console.log('✓ Backup structure valid');

      console.log('=== FILE IMPORT PROCESS COMPLETED SUCCESSFULLY ===');

      return {
        success: true,
        message: `✅ File loaded and verified successfully!\n\n📄 File: ${fileName}\n📊 Jobs found: ${backupData.jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n📅 Backup date: ${new Date(backupData.timestamp).toLocaleDateString()}`,
        data: backupData
      };

    } catch (error) {
      console.error('✗ FILE IMPORT PROCESS FAILED:', error);
      return {
        success: false,
        message: `Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Restore data from backup
   */
  async restoreFromBackup(backupData: BackupData): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== STARTING RESTORE PROCESS ===');

      // Step 1: Validate backup data one more time
      console.log('Step 1: Validating backup data...');
      const validation = FileSystemService.validateBackupData(backupData);
      if (!validation.valid) {
        console.error('✗ Invalid backup data:', validation.error);
        return {
          success: false,
          message: `Invalid backup data: ${validation.error}`
        };
      }
      console.log('✓ Backup data validated');

      // Step 2: Clear existing data
      console.log('Step 2: Clearing existing data...');
      await StorageService.clearAllData();
      console.log('✓ Existing data cleared');

      // Step 3: Restore jobs
      console.log('Step 3: Restoring jobs...');
      await StorageService.saveJobs(backupData.jobs);
      console.log('✓ Jobs restored:', backupData.jobs.length);

      // Step 4: Restore settings
      console.log('Step 4: Restoring settings...');
      const settingsToRestore = {
        ...backupData.settings,
        isAuthenticated: false // Never restore auth state
      };
      await StorageService.saveSettings(settingsToRestore);
      console.log('✓ Settings restored');

      // Step 5: Restore technician name if present
      if (backupData.settings.technicianName) {
        console.log('Step 5: Restoring technician name...');
        await StorageService.setTechnicianName(backupData.settings.technicianName);
        console.log('✓ Technician name restored');
      }

      console.log('=== RESTORE PROCESS COMPLETED SUCCESSFULLY ===');

      return {
        success: true,
        message: `✅ Data restored successfully!\n\n📊 Jobs restored: ${backupData.jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n\n🔐 Please sign in again to access the app.`
      };

    } catch (error) {
      console.error('✗ RESTORE PROCESS FAILED:', error);
      return {
        success: false,
        message: `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Get backup statistics
   */
  async getBackupStatistics(): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
      const result = await FileSystemService.getBackupStatistics();
      
      if (!result.success || !result.stats) {
        return {
          success: false,
          message: result.message || 'Failed to get backup statistics'
        };
      }

      const stats = result.stats;
      const message = `📊 Backup Statistics\n\n` +
        `💾 Backup Files: ${stats.backupCount}\n` +
        `📄 PDF Files: ${stats.pdfCount}\n` +
        `📦 Total Backup Size: ${(stats.totalBackupSize / 1024).toFixed(2)} KB\n` +
        `📑 Total PDF Size: ${(stats.totalPdfSize / 1024).toFixed(2)} KB\n` +
        `📅 Newest Backup: ${stats.newestBackup ? new Date(stats.newestBackup.split('backup-')[1].split('.json')[0].replace(/-/g, ':')).toLocaleString() : 'None'}\n` +
        `📅 Oldest Backup: ${stats.oldestBackup ? new Date(stats.oldestBackup.split('backup-')[1].split('.json')[0].replace(/-/g, ':')).toLocaleString() : 'None'}`;

      return {
        success: true,
        message,
        stats
      };
    } catch (error) {
      console.error('Error getting backup statistics:', error);
      return {
        success: false,
        message: `Failed to get backup statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * List all backup files
   */
  async listBackupFiles(): Promise<{ success: boolean; files: string[]; message?: string }> {
    try {
      const files = await FileSystemService.listBackupFiles();
      
      return {
        success: true,
        files,
        message: `Found ${files.length} backup files`
      };
    } catch (error) {
      console.error('Error listing backup files:', error);
      return {
        success: false,
        files: [],
        message: `Failed to list backup files: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Get backup folder path
   */
  async getBackupFolderPath(): Promise<string | null> {
    const paths = FileSystemService.getBasePaths();
    return paths.BACKUP_DIR;
  },

  /**
   * Ensure backup folder exists
   */
  async ensureBackupFolderExists(): Promise<{ success: boolean; message: string }> {
    const result = await FileSystemService.ensureDirectoriesExist();
    return {
      success: result.success,
      message: result.message || (result.success ? 'Backup folder ready' : 'Failed to create backup folder')
    };
  }
};
