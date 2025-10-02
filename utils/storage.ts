
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, AppSettings } from '../types';

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
  }
};
