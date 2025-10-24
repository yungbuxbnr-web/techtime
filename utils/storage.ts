
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Job, AppSettings } from '../types';
import { Platform } from 'react-native';

const JOBS_KEY = 'jobs';
const SETTINGS_KEY = 'settings';
const BACKUP_DIRECTORY_URI_KEY = 'backup_directory_uri';

const defaultSettings: AppSettings = {
  pin: '3101',
  isAuthenticated: false,
  targetHours: 180,
  theme: 'light',
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

  // Backup directory URI management
  async getBackupDirectoryUri(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(BACKUP_DIRECTORY_URI_KEY);
    } catch (error) {
      console.log('Error getting backup directory URI:', error);
      return null;
    }
  },

  async saveBackupDirectoryUri(uri: string): Promise<void> {
    try {
      await AsyncStorage.setItem(BACKUP_DIRECTORY_URI_KEY, uri);
      console.log('Backup directory URI saved:', uri);
    } catch (error) {
      console.log('Error saving backup directory URI:', error);
      throw error;
    }
  },

  // File operations using new expo-file-system API
  async pickBackupDirectory(): Promise<string | null> {
    try {
      console.log('Opening directory picker...');
      
      if (Platform.OS === 'android') {
        // On Android, use Storage Access Framework
        const directory = await Directory.pickDirectoryAsync();
        if (directory) {
          console.log('Directory selected:', directory.uri);
          await this.saveBackupDirectoryUri(directory.uri);
          return directory.uri;
        }
      } else {
        // On iOS, use document directory
        const docDir = new Directory(Paths.document, 'techtracer-backups');
        docDir.create({ intermediates: true });
        console.log('Using iOS document directory:', docDir.uri);
        await this.saveBackupDirectoryUri(docDir.uri);
        return docDir.uri;
      }
      
      return null;
    } catch (error) {
      console.log('Error picking backup directory:', error);
      throw error;
    }
  },

  async writeJsonToDirectory(directoryUri: string, fileName: string, data: any): Promise<string> {
    try {
      console.log('Writing JSON to directory:', directoryUri, fileName);
      
      const jsonContent = JSON.stringify(data, null, 2);
      
      if (Platform.OS === 'android' && directoryUri.startsWith('content://')) {
        // Android SAF content URI
        const directory = new Directory(directoryUri);
        const file = directory.createFile(fileName, 'application/json');
        file.write(jsonContent);
        console.log('File written successfully (Android SAF):', file.uri);
        return file.uri;
      } else {
        // iOS or regular file URI
        const directory = new Directory(directoryUri);
        const file = new File(directory, fileName);
        file.create({ overwrite: true });
        file.write(jsonContent);
        console.log('File written successfully:', file.uri);
        return file.uri;
      }
    } catch (error) {
      console.log('Error writing JSON to directory:', error);
      throw error;
    }
  },

  async pickJsonFile(): Promise<DocumentPicker.DocumentPickerResult> {
    try {
      console.log('Opening file picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      console.log('File picker result:', result);
      return result;
    } catch (error) {
      console.log('Error picking file:', error);
      throw error;
    }
  },

  async readJsonFromUri(uri: string): Promise<any> {
    try {
      console.log('Reading JSON from URI:', uri);
      
      const file = new File(uri);
      const content = file.textSync();
      const data = JSON.parse(content);
      
      console.log('JSON read successfully');
      return data;
    } catch (error) {
      console.log('Error reading JSON from URI:', error);
      throw error;
    }
  },

  async shareFile(fileUri: string): Promise<void> {
    try {
      console.log('Checking if sharing is available...');
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }
      
      console.log('Sharing file:', fileUri);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share TechTracer Backup',
        UTI: 'public.json',
      });
      
      console.log('File shared successfully');
    } catch (error) {
      console.log('Error sharing file:', error);
      throw error;
    }
  },

  async createBackup(): Promise<string> {
    try {
      console.log('Creating backup...');
      
      // Get all data
      const jobs = await this.getJobs();
      const settings = await this.getSettings();
      
      // Create backup data
      const backupData = {
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
      
      // Write to cache directory first
      const cacheDir = new Directory(Paths.cache, 'backups');
      cacheDir.create({ intermediates: true });
      
      const file = new File(cacheDir, fileName);
      file.create({ overwrite: true });
      file.write(JSON.stringify(backupData, null, 2));
      
      console.log('Backup created successfully:', file.uri);
      return file.uri;
    } catch (error) {
      console.log('Error creating backup:', error);
      throw error;
    }
  },

  async shareBackup(): Promise<void> {
    try {
      console.log('Creating and sharing backup...');
      const backupUri = await this.createBackup();
      await this.shareFile(backupUri);
      console.log('Backup shared successfully');
    } catch (error) {
      console.log('Error sharing backup:', error);
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

  // File system utilities
  async fileExists(uri: string): Promise<boolean> {
    try {
      const file = new File(uri);
      return file.exists;
    } catch (error) {
      console.log('Error checking file existence:', error);
      return false;
    }
  },

  async deleteFile(uri: string): Promise<void> {
    try {
      const file = new File(uri);
      file.delete();
      console.log('File deleted successfully:', uri);
    } catch (error) {
      console.log('Error deleting file:', error);
      throw error;
    }
  },
};
