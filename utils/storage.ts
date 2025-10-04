
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

// Helper function to get document directory
const getDocumentDirectory = () => {
  if (FileSystem.documentDirectory) {
    return FileSystem.documentDirectory;
  }
  // Fallback for web or other platforms
  return FileSystem.cacheDirectory || '';
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
      let targetDirectory = getDocumentDirectory();
      
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
};
