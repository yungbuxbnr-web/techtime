
/* eslint-disable import/namespace */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Job, AppSettings } from '../types';
import { Platform } from 'react-native';

const SAF = FileSystem.StorageAccessFramework;

const JOBS_KEY = 'jobs';
const SETTINGS_KEY = 'settings';
const BACKUP_DIRECTORY_URI_KEY = 'backup.dirUri';

const defaultSettings: AppSettings = {
  pin: '3101',
  isAuthenticated: false,
  targetHours: 180,
  theme: 'light',
};

// ============================================
// FILE SYSTEM UTILITIES (SAF on Android, documentDirectory on iOS)
// ============================================

export async function pickBackupDirectory(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      const res = await SAF.requestDirectoryPermissionsAsync();
      return res.granted ? res.directoryUri ?? null : null;
    } else {
      // iOS: use documentDirectory (no picker needed)
      return FileSystem.documentDirectory || null;
    }
  } catch (error) {
    console.log('Error picking backup directory:', error);
    return null;
  }
}

export async function writeJsonToDirectory(
  dirUri: string | null,
  fileName: string,
  jsonObj: unknown
): Promise<string> {
  try {
    const data = JSON.stringify(jsonObj, null, 2);

    if (Platform.OS === 'android') {
      const targetDir = dirUri ?? (await pickBackupDirectory());
      if (!targetDir) throw new Error('No directory permission');
      const fileUri = await SAF.createFileAsync(
        targetDir,
        fileName,
        'application/json'
      );
      await SAF.writeAsStringAsync(fileUri, data);
      console.log('JSON file written successfully (Android):', fileUri);
      return fileUri;
    }

    // iOS (and web/native fallback)
    const base =
      FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
    if (!base) throw new Error('No writable directory available');
    const fileUri = base + fileName;
    await FileSystem.writeAsStringAsync(fileUri, data);
    console.log('JSON file written successfully (iOS):', fileUri);
    return fileUri;
  } catch (error) {
    console.log('Error writing JSON to directory:', error);
    throw error;
  }
}

export async function shareFile(fileUri: string): Promise<void> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
      console.log('File shared successfully');
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.log('Error sharing file:', error);
    throw error;
  }
}

export async function pickJsonFile(): Promise<string | null> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return null;
    const uri = res.assets?.[0]?.uri;
    console.log('JSON file picked:', uri);
    return uri ?? null;
  } catch (error) {
    console.log('Error picking JSON file:', error);
    return null;
  }
}

export async function readJsonFromUri<T = any>(uri: string): Promise<T> {
  try {
    const content = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(content) as T;
    console.log('JSON file read successfully from URI');
    return parsed;
  } catch (error) {
    console.log('Error reading JSON from URI:', error);
    throw error;
  }
}

// Legacy function names for backward compatibility
export async function pickBackupDir(): Promise<string | null> {
  return pickBackupDirectory();
}

export async function writeJson(dirUri: string | null, name: string, data: any): Promise<string> {
  return writeJsonToDirectory(dirUri, name, data);
}

export async function readJson(uri: string): Promise<any> {
  return readJsonFromUri(uri);
}

// ============================================
// STORAGE SERVICE (AsyncStorage for app data)
// ============================================

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
          isAuthenticated: false,
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
          isAuthenticated: false,
        };
        await this.saveSettings(newSettings);
      }
      
      console.log('Data imported successfully');
    } catch (error) {
      console.log('Error importing data:', error);
      throw error;
    }
  },

  // Get all data for backup
  async getAllData(): Promise<any> {
    try {
      const jobs = await this.getJobs();
      const settings = await this.getSettings();
      
      return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        jobs,
        settings: {
          ...settings,
          isAuthenticated: false,
        },
        metadata: {
          totalJobs: jobs.length,
          totalAWs: jobs.reduce((sum, job) => sum + job.awValue, 0),
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0',
        },
      };
    } catch (error) {
      console.log('Error getting all data:', error);
      throw error;
    }
  },

  // Import jobs from backup data
  async importJobs(data: any): Promise<void> {
    try {
      if (data.jobs && Array.isArray(data.jobs)) {
        await this.saveJobs(data.jobs);
        console.log('Jobs imported successfully:', data.jobs.length);
      }
      
      if (data.settings) {
        const currentSettings = await this.getSettings();
        const newSettings = {
          ...currentSettings,
          ...data.settings,
          isAuthenticated: false,
        };
        await this.saveSettings(newSettings);
        console.log('Settings imported successfully');
      }
    } catch (error) {
      console.log('Error importing jobs:', error);
      throw error;
    }
  },
};
