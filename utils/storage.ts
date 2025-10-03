
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Job, AppSettings } from '../types';
import { Platform } from 'react-native';

const JOBS_KEY = 'jobs';
const SETTINGS_KEY = 'settings';

export const StorageService = {
  // Jobs
  async getJobs(): Promise<Job[]> {
    try {
      const jobsJson = await AsyncStorage.getItem(JOBS_KEY);
      return jobsJson ? JSON.parse(jobsJson) : [];
    } catch (error) {
      console.log('Error getting jobs:', error);
      return [];
    }
  },

  async saveJob(job: Job): Promise<void> {
    try {
      const jobs = await this.getJobs();
      const existingIndex = jobs.findIndex(j => j.id === job.id);
      
      if (existingIndex >= 0) {
        jobs[existingIndex] = job;
      } else {
        jobs.push(job);
      }
      
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
      console.log('Job saved successfully:', job.wipNumber);
    } catch (error) {
      console.log('Error saving job:', error);
      throw error;
    }
  },

  async saveJobs(jobs: Job[]): Promise<void> {
    try {
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
      console.log('Jobs saved successfully:', jobs.length);
    } catch (error) {
      console.log('Error saving jobs:', error);
      throw error;
    }
  },

  async deleteJob(jobId: string): Promise<void> {
    try {
      const jobs = await this.getJobs();
      const filteredJobs = jobs.filter(job => job.id !== jobId);
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(filteredJobs));
      console.log('Job deleted successfully:', jobId);
    } catch (error) {
      console.log('Error deleting job:', error);
      throw error;
    }
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      return settingsJson ? JSON.parse(settingsJson) : { pin: '3101', isAuthenticated: false };
    } catch (error) {
      console.log('Error getting settings:', error);
      return { pin: '3101', isAuthenticated: false };
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

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([JOBS_KEY, SETTINGS_KEY]);
      console.log('All data cleared successfully');
    } catch (error) {
      console.log('Error clearing data:', error);
      throw error;
    }
  },

  // Enhanced storage functionality with folder selection
  async selectFolderAndSaveFile(fileUri: string, fileName: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // On web, we can't select folders, so just download the file
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return 'Downloaded to default folder';
      }

      // For mobile platforms, use document picker to select directory
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
        multiple: false,
      });

      if (result.canceled) {
        throw new Error('Folder selection cancelled');
      }

      // Get the directory from the selected file
      const selectedFile = result.assets[0];
      const directoryPath = selectedFile.uri.substring(0, selectedFile.uri.lastIndexOf('/'));
      
      // Copy the file to the selected directory
      const destinationPath = `${directoryPath}/${fileName}`;
      await FileSystem.copyAsync({
        from: fileUri,
        to: destinationPath,
      });

      console.log('File saved to selected folder:', destinationPath);
      return destinationPath;
    } catch (error) {
      console.log('Error saving file to selected folder:', error);
      throw error;
    }
  },

  async saveFileToCustomLocation(fileUri: string, fileName: string): Promise<string> {
    try {
      if (Platform.OS === 'android') {
        // On Android, try to use the system file picker to select a save location
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/*',
          copyToCacheDirectory: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedPath = result.assets[0].uri;
          const directoryPath = selectedPath.substring(0, selectedPath.lastIndexOf('/'));
          const destinationPath = `${directoryPath}/${fileName}`;
          
          await FileSystem.copyAsync({
            from: fileUri,
            to: destinationPath,
          });
          
          return destinationPath;
        }
      }

      // Fallback: save to documents directory
      const documentsDirectory = FileSystem.documentDirectory;
      if (!documentsDirectory) {
        throw new Error('Documents directory not available');
      }

      const destinationPath = `${documentsDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: fileUri,
        to: destinationPath,
      });

      return destinationPath;
    } catch (error) {
      console.log('Error saving file to custom location:', error);
      throw error;
    }
  }
};
