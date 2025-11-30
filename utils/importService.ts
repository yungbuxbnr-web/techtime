
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Job } from '../types';
import { StorageService } from './storage';
import { Platform } from 'react-native';

export interface ImportProgress {
  status: 'idle' | 'reading' | 'processing' | 'importing' | 'complete' | 'error';
  currentJob: number;
  totalJobs: number;
  currentJobData?: {
    wipNumber: string;
    vehicleReg: string;
    aws: number;
  };
  message: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: number;
  details: string[];
}

/**
 * Import Service
 * Handles importing job data from JSON files
 */
export const ImportService = {
  /**
   * Pick and import JSON file
   */
  async pickAndImportJSON(
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    try {
      console.log('[ImportService] Starting import process...');

      // Update progress: idle
      onProgress?.({
        status: 'idle',
        currentJob: 0,
        totalJobs: 0,
        message: 'Opening file picker...',
      });

      // Pick JSON file
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'ios' 
          ? ['public.json', 'public.plain-text', 'public.data']
          : ['application/json', 'text/plain', 'application/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        console.log('[ImportService] File picker canceled');
        return {
          success: false,
          message: 'Import canceled',
          imported: 0,
          skipped: 0,
          errors: 0,
          details: [],
        };
      }

      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        return {
          success: false,
          message: 'No file selected',
          imported: 0,
          skipped: 0,
          errors: 0,
          details: [],
        };
      }

      console.log('[ImportService] File selected:', uri);

      // Update progress: reading
      onProgress?.({
        status: 'reading',
        currentJob: 0,
        totalJobs: 0,
        message: 'Reading JSON file...',
      });

      // Read and parse JSON file
      const jsonData = await this.readJSONFile(uri);

      // Validate JSON structure
      const validation = this.validateJSONStructure(jsonData);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || 'Invalid JSON format',
          imported: 0,
          skipped: 0,
          errors: 0,
          details: [validation.error || 'Invalid JSON format'],
        };
      }

      // Extract jobs array
      const jobs = jsonData.jobs;
      const totalJobs = jobs.length;

      console.log('[ImportService] Found', totalJobs, 'jobs in JSON file');

      // Check if we exceed the max limit
      if (totalJobs > 1000) {
        return {
          success: false,
          message: `Too many jobs (${totalJobs}). Maximum allowed is 1000.`,
          imported: 0,
          skipped: 0,
          errors: 0,
          details: [`File contains ${totalJobs} jobs, but maximum is 1000`],
        };
      }

      // Update progress: processing
      onProgress?.({
        status: 'processing',
        currentJob: 0,
        totalJobs,
        message: 'Validating jobs...',
      });

      // Import jobs one by one
      return await this.importJobs(jobs, totalJobs, onProgress);
    } catch (error: any) {
      console.error('[ImportService] Import error:', error);
      return {
        success: false,
        message: error?.message || 'Import failed',
        imported: 0,
        skipped: 0,
        errors: 0,
        details: [error?.message || 'Unknown error'],
      };
    }
  },

  /**
   * Read JSON file
   */
  async readJSONFile(uri: string): Promise<any> {
    try {
      // iOS: Verify file exists before reading
      if (Platform.OS === 'ios') {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('File does not exist or is not accessible');
        }
      }

      // Read file content
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!content || content.trim().length === 0) {
        throw new Error('File is empty');
      }

      // Parse JSON
      const data = JSON.parse(content);
      return data;
    } catch (error: any) {
      console.error('[ImportService] Error reading JSON file:', error);
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in file');
      }
      throw error;
    }
  },

  /**
   * Validate JSON structure
   */
  validateJSONStructure(data: any): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid JSON format: not an object' };
    }

    if (!data.jobs) {
      return { valid: false, error: 'Invalid JSON format: missing "jobs" field' };
    }

    if (!Array.isArray(data.jobs)) {
      return { valid: false, error: 'Invalid JSON format: "jobs" must be an array' };
    }

    if (data.jobs.length === 0) {
      return { valid: false, error: 'No jobs found in file' };
    }

    // Validate first job to check structure
    const firstJob = data.jobs[0];
    if (!firstJob.wipNumber || !firstJob.vehicleReg || typeof firstJob.aws !== 'number') {
      return { 
        valid: false, 
        error: 'Invalid job format: missing required fields (wipNumber, vehicleReg, aws)' 
      };
    }

    return { valid: true };
  },

  /**
   * Import jobs one by one
   */
  async importJobs(
    jobs: any[],
    totalJobs: number,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const details: string[] = [];

    // Get existing jobs to check for duplicates
    const existingJobs = await StorageService.getJobs();
    const existingWipNumbers = new Set(existingJobs.map(j => j.wipNumber));

    for (let i = 0; i < jobs.length; i++) {
      const jobData = jobs[i];

      try {
        // Update progress
        onProgress?.({
          status: 'importing',
          currentJob: i + 1,
          totalJobs,
          currentJobData: {
            wipNumber: jobData.wipNumber,
            vehicleReg: jobData.vehicleReg,
            aws: jobData.aws,
          },
          message: `Importing job ${i + 1} of ${totalJobs}: ${jobData.wipNumber}`,
        });

        // Check if job already exists
        if (existingWipNumbers.has(jobData.wipNumber)) {
          console.log(`[ImportService] Skipping duplicate job: ${jobData.wipNumber}`);
          skipped++;
          details.push(`Skipped: ${jobData.wipNumber} (duplicate)`);
          
          // Small delay for visual feedback
          await this.delay(50);
          continue;
        }

        // Create job object
        const job: Job = {
          id: this.generateId(),
          wipNumber: jobData.wipNumber,
          vehicleRegistration: jobData.vehicleReg,
          awValue: jobData.aws,
          notes: jobData.description || '',
          jobDescription: jobData.description || '',
          dateCreated: jobData.jobDateTime || new Date().toISOString(),
          timeInMinutes: jobData.aws * 5,
          vhcStatus: this.normalizeVHCStatus(jobData.vhcStatus),
        };

        // Save job
        await StorageService.saveJob(job);
        
        // Add to existing set to prevent duplicates within the same import
        existingWipNumbers.add(job.wipNumber);
        
        imported++;
        details.push(`Imported: ${job.wipNumber} - ${job.vehicleRegistration}`);
        
        console.log(`[ImportService] Imported job ${i + 1}/${totalJobs}: ${job.wipNumber}`);

        // Small delay for visual feedback (50ms per job)
        await this.delay(50);
      } catch (error: any) {
        console.error(`[ImportService] Error importing job ${i + 1}:`, error);
        errors++;
        details.push(`Error: ${jobData.wipNumber} - ${error?.message || 'Unknown error'}`);
      }
    }

    // Update progress: complete
    onProgress?.({
      status: 'complete',
      currentJob: totalJobs,
      totalJobs,
      message: `Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`,
    });

    console.log('[ImportService] Import complete:', { imported, skipped, errors });

    return {
      success: imported > 0,
      message: `Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`,
      imported,
      skipped,
      errors,
      details,
    };
  },

  /**
   * Normalize VHC status
   */
  normalizeVHCStatus(status: string | undefined): 'Red' | 'Orange' | 'Green' | 'N/A' {
    if (!status) return 'N/A';
    
    const normalized = status.toUpperCase();
    
    if (normalized === 'RED') return 'Red';
    if (normalized === 'ORANGE' || normalized === 'AMBER') return 'Orange';
    if (normalized === 'GREEN') return 'Green';
    
    return 'N/A';
  },

  /**
   * Generate unique ID
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Delay helper
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Validate individual job data
   */
  validateJobData(jobData: any): { valid: boolean; error?: string } {
    if (!jobData.wipNumber || typeof jobData.wipNumber !== 'string') {
      return { valid: false, error: 'Invalid or missing wipNumber' };
    }

    if (!jobData.vehicleReg || typeof jobData.vehicleReg !== 'string') {
      return { valid: false, error: 'Invalid or missing vehicleReg' };
    }

    if (typeof jobData.aws !== 'number' || jobData.aws < 0) {
      return { valid: false, error: 'Invalid or missing aws value' };
    }

    return { valid: true };
  },
};
