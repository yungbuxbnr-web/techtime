
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

      console.log('[ImportService] Document picker result:', result);

      // Check if user canceled
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

      // Get the file URI
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        console.log('[ImportService] No file URI found');
        return {
          success: false,
          message: 'No file selected',
          imported: 0,
          skipped: 0,
          errors: 0,
          details: ['No file URI found in picker result'],
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
        console.log('[ImportService] Invalid JSON structure:', validation.error);
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
        details: [error?.message || 'Unknown error', error?.stack || ''],
      };
    }
  },

  /**
   * Read JSON file
   */
  async readJSONFile(uri: string): Promise<any> {
    try {
      console.log('[ImportService] Reading file from URI:', uri);

      // iOS: Verify file exists before reading
      if (Platform.OS === 'ios') {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        console.log('[ImportService] File info:', fileInfo);
        
        if (!fileInfo.exists) {
          throw new Error('File does not exist or is not accessible');
        }
      }

      // Read file content
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('[ImportService] File content length:', content?.length || 0);

      if (!content || content.trim().length === 0) {
        throw new Error('File is empty');
      }

      // Parse JSON
      const data = JSON.parse(content);
      console.log('[ImportService] JSON parsed successfully');
      
      return data;
    } catch (error: any) {
      console.error('[ImportService] Error reading JSON file:', error);
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in file. Please check the file structure.');
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
   * Note: Duplicate WIP numbers are now allowed as per user request
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

    for (let i = 0; i < jobs.length; i++) {
      const jobData = jobs[i];

      try {
        // Update progress
        onProgress?.({
          status: 'importing',
          currentJob: i + 1,
          totalJobs,
          currentJobData: {
            wipNumber: jobData.wipNumber || 'Unknown',
            vehicleReg: jobData.vehicleReg || 'Unknown',
            aws: jobData.aws || 0,
          },
          message: `Importing job ${i + 1} of ${totalJobs}: ${jobData.wipNumber || 'Unknown'}`,
        });

        // Validate job data
        const validation = this.validateJobData(jobData);
        if (!validation.valid) {
          console.log(`[ImportService] Invalid job data at index ${i}:`, validation.error);
          skipped++;
          details.push(`Skipped job ${i + 1}: ${jobData.wipNumber || 'Unknown'} - ${validation.error}`);
          
          // Small delay for visual feedback
          await this.delay(50);
          continue;
        }

        // Create job object with unique ID
        const job: Job = {
          id: this.generateId(),
          wipNumber: String(jobData.wipNumber).trim(),
          vehicleRegistration: String(jobData.vehicleReg).trim(),
          awValue: Number(jobData.aws),
          notes: jobData.description ? String(jobData.description).trim() : '',
          jobDescription: jobData.description ? String(jobData.description).trim() : '',
          dateCreated: jobData.jobDateTime || new Date().toISOString(),
          timeInMinutes: Number(jobData.aws) * 5,
          vhcStatus: this.normalizeVHCStatus(jobData.vhcStatus),
        };

        // Save job (duplicates are now allowed)
        await StorageService.saveJob(job);
        
        imported++;
        details.push(`✓ Imported job ${i + 1}: ${job.wipNumber} - ${job.vehicleRegistration} (${job.awValue} AWs)`);
        
        console.log(`[ImportService] Imported job ${i + 1}/${totalJobs}: ${job.wipNumber}`);

        // Small delay for visual feedback (50ms per job)
        await this.delay(50);
      } catch (error: any) {
        console.error(`[ImportService] Error importing job ${i + 1}:`, error);
        errors++;
        details.push(`✗ Error importing job ${i + 1}: ${jobData.wipNumber || 'Unknown'} - ${error?.message || 'Unknown error'}`);
        
        // Continue with next job even if this one fails
        await this.delay(50);
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

    const success = imported > 0;
    const message = success
      ? `Successfully imported ${imported} job${imported === 1 ? '' : 's'}${skipped > 0 ? `, skipped ${skipped}` : ''}${errors > 0 ? `, ${errors} error${errors === 1 ? '' : 's'}` : ''}`
      : `Import failed: ${skipped} skipped, ${errors} error${errors === 1 ? '' : 's'}`;

    return {
      success,
      message,
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
    
    const normalized = String(status).toUpperCase().trim();
    
    if (normalized === 'RED') return 'Red';
    if (normalized === 'ORANGE' || normalized === 'AMBER') return 'Orange';
    if (normalized === 'GREEN') return 'Green';
    if (normalized === 'NONE' || normalized === 'N/A') return 'N/A';
    
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
    // Check wipNumber
    if (!jobData.wipNumber) {
      return { valid: false, error: 'Missing wipNumber' };
    }
    
    const wipNumber = String(jobData.wipNumber).trim();
    if (wipNumber.length === 0) {
      return { valid: false, error: 'Empty wipNumber' };
    }

    // Check vehicleReg
    if (!jobData.vehicleReg) {
      return { valid: false, error: 'Missing vehicleReg' };
    }
    
    const vehicleReg = String(jobData.vehicleReg).trim();
    if (vehicleReg.length === 0) {
      return { valid: false, error: 'Empty vehicleReg' };
    }

    // Check aws
    if (jobData.aws === undefined || jobData.aws === null) {
      return { valid: false, error: 'Missing aws value' };
    }
    
    const aws = Number(jobData.aws);
    if (isNaN(aws)) {
      return { valid: false, error: 'Invalid aws value (not a number)' };
    }
    
    if (aws < 0) {
      return { valid: false, error: 'Invalid aws value (negative)' };
    }
    
    if (aws > 100) {
      return { valid: false, error: 'Invalid aws value (exceeds 100)' };
    }

    // Validate jobDateTime if provided
    if (jobData.jobDateTime) {
      try {
        const date = new Date(jobData.jobDateTime);
        if (isNaN(date.getTime())) {
          return { valid: false, error: 'Invalid jobDateTime format' };
        }
      } catch (error) {
        return { valid: false, error: 'Invalid jobDateTime format' };
      }
    }

    return { valid: true };
  },
};
