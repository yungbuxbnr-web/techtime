
import * as FileSystem from 'expo-file-system/legacy';
import { StorageService } from '../../utils/storage';

export interface JsonJobInput {
  wipNumber: string;
  vehicleReg: string;
  vhcStatus: 'GREEN' | 'ORANGE' | 'RED' | 'NONE';
  description: string;
  aws: number;
  jobDateTime: string;
}

export interface ImportProgress {
  currentJob: number;
  totalJobs: number;
  percentage: number;
  currentJobData: JsonJobInput | null;
  status: 'parsing' | 'importing' | 'complete' | 'error';
  message: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

const MAX_JOBS_LIMIT = 1000;

/**
 * Normalize VHC status from raw string to enum
 */
function normaliseVhc(vhcStatusRaw: string): 'GREEN' | 'ORANGE' | 'RED' | 'NONE' {
  const normalised = vhcStatusRaw?.toUpperCase().replace(/\//g, '').replace(/\s/g, '').trim();
  
  if (normalised === 'GREEN') {
    return 'GREEN';
  } else if (normalised === 'ORANGE' || normalised === 'AMBER') {
    return 'ORANGE';
  } else if (normalised === 'RED') {
    return 'RED';
  } else if (normalised === 'N' || normalised === 'NA' || normalised === 'NONE') {
    return 'NONE';
  } else {
    return 'NONE';
  }
}

/**
 * Extract text from a JSON file
 * 
 * @param uri - The URI of the JSON file
 * @returns Promise<string> - The JSON content as string
 */
export async function getJsonText(uri: string): Promise<string> {
  try {
    console.log('[JSON Import] Starting JSON extraction from:', uri);
    
    // Read file as UTF-8 text
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    if (!content || content.trim().length === 0) {
      throw new Error('Empty JSON file');
    }
    
    console.log('[JSON Import] File read successfully, length:', content.length);
    
    // Validate JSON structure
    try {
      JSON.parse(content);
    } catch (parseError) {
      console.error('[JSON Import] Invalid JSON format:', parseError);
      throw new Error('Invalid JSON format. Please ensure the file contains valid JSON data.');
    }
    
    return content;
  } catch (err: any) {
    console.error('[JSON Import] Failed to extract JSON:', err);
    console.error('[JSON Import] Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    
    // Provide helpful error message
    if (err.message.includes('Invalid JSON format')) {
      throw err;
    }
    
    if (err.message.includes('Empty JSON file')) {
      throw new Error('The selected file is empty. Please select a valid Tech Records JSON export.');
    }
    
    throw new Error(
      'Unable to read JSON file. Please make sure this is a Tech Records JSON export.\n\n' +
      'Common issues:\n' +
      '• File is not a valid JSON file\n' +
      '• File is corrupted or incomplete\n' +
      '• File permissions issue'
    );
  }
}

/**
 * Parse Tech Records JSON and extract job data
 * 
 * @param jsonUri - URI of the JSON file
 * @returns Array of JsonJobInput objects
 */
export async function parseTechRecordsJson(jsonUri: string): Promise<JsonJobInput[]> {
  try {
    console.log('[JSON Import] Starting JSON parsing...');
    
    // Use the getJsonText helper for reliable text extraction
    const text = await getJsonText(jsonUri);
    
    if (!text || text.length < 10) {
      console.warn('[JSON Import] Insufficient text extracted from JSON');
      throw new Error('Could not read JSON text. Please make sure this is a Tech Records JSON export.');
    }
    
    console.log('[JSON Import] Text length:', text.length);
    
    // Parse JSON
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[JSON Import] JSON parse error:', parseError);
      throw new Error('Invalid JSON format. Please ensure the file contains valid JSON data.');
    }
    
    console.log('[JSON Import] JSON parsed successfully');
    console.log('[JSON Import] JSON structure keys:', Object.keys(data));
    
    // EXACT VALIDATION: Must have data.jobs array
    if (!data || !Array.isArray(data.jobs)) {
      console.error('[JSON Import] Invalid structure - expected { jobs: [...] }');
      console.error('[JSON Import] Received keys:', Object.keys(data || {}));
      throw new Error('Invalid Tech Records JSON format. Expected structure: { "jobs": [...] }');
    }
    
    const jobs = data.jobs;
    console.log('[JSON Import] Found jobs array with', jobs.length, 'items');
    
    if (jobs.length === 0) {
      throw new Error('No jobs found in JSON file.');
    }
    
    // Limit to MAX_JOBS_LIMIT
    const jobsToProcess = jobs.slice(0, MAX_JOBS_LIMIT);
    if (jobs.length > MAX_JOBS_LIMIT) {
      console.warn(`[JSON Import] File contains ${jobs.length} jobs. Limiting to ${MAX_JOBS_LIMIT} jobs.`);
    }
    
    // Parse each job
    const parsedJobs: JsonJobInput[] = [];
    let parseErrors = 0;
    
    for (let i = 0; i < jobsToProcess.length; i++) {
      try {
        const jobData = jobsToProcess[i];
        
        // Extract fields - use exact property names from your structure
        const wipNumber = jobData.wipNumber || '';
        const vehicleReg = jobData.vehicleReg || '';
        const vhcStatusRaw = jobData.vhcStatus || 'NONE';
        const description = jobData.description || '';
        const aws = parseInt(String(jobData.aws || '0'), 10);
        const jobDateTime = jobData.jobDateTime || new Date().toISOString();
        
        // Validate required fields
        if (!wipNumber || !vehicleReg) {
          console.warn(`[JSON Import] Skipping job ${i + 1}: missing required fields (wipNumber or vehicleReg)`);
          parseErrors++;
          continue;
        }
        
        // Normalize VHC status
        const vhcStatus = normaliseVhc(vhcStatusRaw);
        
        // Ensure jobDateTime is in ISO format
        let normalizedDateTime: string;
        try {
          normalizedDateTime = new Date(jobDateTime).toISOString();
        } catch (dateError) {
          console.warn(`[JSON Import] Invalid date for job ${i + 1}, using current date`);
          normalizedDateTime = new Date().toISOString();
        }
        
        const jobInput: JsonJobInput = {
          wipNumber: String(wipNumber).trim(),
          vehicleReg: String(vehicleReg).toUpperCase().replace(/\s/g, ''),
          vhcStatus,
          description: String(description).trim(),
          aws: isNaN(aws) ? 0 : aws,
          jobDateTime: normalizedDateTime,
        };
        
        parsedJobs.push(jobInput);
        
        console.log(`[JSON Import] Parsed job ${i + 1}/${jobsToProcess.length}: WIP ${jobInput.wipNumber}, Reg ${jobInput.vehicleReg}, AWS ${jobInput.aws}`);
      } catch (error) {
        console.error(`[JSON Import] Error parsing job ${i + 1}:`, error);
        parseErrors++;
      }
    }
    
    console.log(`[JSON Import] Total jobs parsed: ${parsedJobs.length}, errors: ${parseErrors}`);
    
    if (parsedJobs.length === 0) {
      throw new Error('No valid jobs found in JSON file. Please check the file format.');
    }
    
    if (parsedJobs.length > 0) {
      console.log('[JSON Import] First job example:', parsedJobs[0]);
    }
    
    return parsedJobs;
  } catch (error) {
    console.error('[JSON Import] Error parsing JSON:', error);
    
    // Provide user-friendly error message
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Unable to read JSON file. Please make sure this is a Tech Records JSON export.');
  }
}

/**
 * Check if a job with the same WIP number and date already exists
 */
function isDuplicateJob(jobInput: JsonJobInput, existingJobs: any[]): boolean {
  return existingJobs.some(
    (job) =>
      job.wipNumber === jobInput.wipNumber &&
      job.startedAt === jobInput.jobDateTime
  );
}

/**
 * Convert JsonJobInput to Job object
 */
function convertJobInputToJob(jobInput: JsonJobInput) {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  let vhcStatus: 'Red' | 'Orange' | 'Green' | 'N/A' = 'N/A';
  if (jobInput.vhcStatus === 'RED') {
    vhcStatus = 'Red';
  } else if (jobInput.vhcStatus === 'ORANGE') {
    vhcStatus = 'Orange';
  } else if (jobInput.vhcStatus === 'GREEN') {
    vhcStatus = 'Green';
  } else {
    vhcStatus = 'N/A';
  }
  
  return {
    id: jobId,
    wipNumber: jobInput.wipNumber,
    vehicleRegistration: jobInput.vehicleReg,
    vhcStatus,
    jobDescription: jobInput.description,
    notes: jobInput.description,
    awValue: jobInput.aws,
    timeInMinutes: jobInput.aws * 5,
    startedAt: jobInput.jobDateTime,
    dateCreated: jobInput.jobDateTime,
    source: {
      type: 'json' as const,
      importedAt: new Date().toISOString(),
    },
  };
}

/**
 * Import JSON progressively with job-by-job progress updates
 * Supports up to 1000 jobs and takes as long as needed
 * 
 * @param jsonUri - URI of the JSON file
 * @param onProgress - Callback function to report progress
 * @returns Promise with import results
 */
export async function importJsonProgressively(
  jsonUri: string,
  onProgress: ProgressCallback
): Promise<{ imported: number; skipped: number; errors: number }> {
  try {
    console.log('[JSON Import] Starting import from:', jsonUri);
    
    // Step 1: Extract text from JSON file
    onProgress({
      currentJob: 0,
      totalJobs: 0,
      percentage: 0,
      currentJobData: null,
      status: 'parsing',
      message: 'Reading JSON file...',
    });

    let jobs: JsonJobInput[];
    try {
      jobs = await parseTechRecordsJson(jsonUri);
      console.log('[JSON Import] JSON parsed, found', jobs.length, 'jobs');
    } catch (error) {
      console.error('[JSON Import] JSON parsing failed:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unable to read JSON file. Please make sure this is a Tech Records JSON export.';
      
      onProgress({
        currentJob: 0,
        totalJobs: 0,
        percentage: 0,
        currentJobData: null,
        status: 'error',
        message: errorMessage,
      });
      
      throw error;
    }
    
    if (jobs.length === 0) {
      const errorMsg = 'No jobs found in JSON file. Please check the file format.';
      onProgress({
        currentJob: 0,
        totalJobs: 0,
        percentage: 0,
        currentJobData: null,
        status: 'error',
        message: errorMsg,
      });
      throw new Error(errorMsg);
    }
    
    const totalJobsToImport = jobs.length;
    console.log('[JSON Import] Parsing complete. Found', totalJobsToImport, 'jobs to import');
    
    // Step 2: Import jobs one by one with progress updates
    onProgress({
      currentJob: 0,
      totalJobs: totalJobsToImport,
      percentage: 5,
      currentJobData: null,
      status: 'importing',
      message: `Found ${totalJobsToImport} jobs. Starting import...`,
    });
    
    // Small delay to show the initial message
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const existingJobs = await StorageService.getJobs();
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Import each job with detailed progress
    for (let i = 0; i < totalJobsToImport; i++) {
      const jobInput = jobs[i];
      const percentage = 5 + Math.floor((i / totalJobsToImport) * 90);

      try {
        // Show current job being processed
        onProgress({
          currentJob: i + 1,
          totalJobs: totalJobsToImport,
          percentage,
          currentJobData: jobInput,
          status: 'importing',
          message: `Processing: ${jobInput.wipNumber} - ${jobInput.vehicleReg}`,
        });

        // Small delay to show each job being processed
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check for duplicates
        if (isDuplicateJob(jobInput, existingJobs)) {
          console.log(`[JSON Import] Skipping duplicate: WIP ${jobInput.wipNumber}`);
          skippedCount++;
          
          onProgress({
            currentJob: i + 1,
            totalJobs: totalJobsToImport,
            percentage,
            currentJobData: jobInput,
            status: 'importing',
            message: `Skipped duplicate: ${jobInput.wipNumber} - ${jobInput.vehicleReg}`,
          });
          
          // Delay to show the skip message
          await new Promise(resolve => setTimeout(resolve, 150));
          continue;
        }

        // Convert and save job
        const job = convertJobInputToJob(jobInput);
        await StorageService.saveJob(job);
        existingJobs.push(job);
        importedCount++;

        console.log(`[JSON Import] Imported job ${i + 1}/${totalJobsToImport}: WIP ${jobInput.wipNumber}`);

        // Update progress with success message
        onProgress({
          currentJob: i + 1,
          totalJobs: totalJobsToImport,
          percentage,
          currentJobData: jobInput,
          status: 'importing',
          message: `✓ Added: ${jobInput.wipNumber} - ${jobInput.vehicleReg} (${jobInput.aws} AWs)`,
        });

        // Delay to show the success message and prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`[JSON Import] Error importing job ${i + 1}:`, error);
        errorCount++;
        
        onProgress({
          currentJob: i + 1,
          totalJobs: totalJobsToImport,
          percentage,
          currentJobData: jobInput,
          status: 'importing',
          message: `✗ Error: ${jobInput.wipNumber} - ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        
        // Delay to show the error message
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Step 3: Complete
    const completeMessage = `Import complete! Added ${importedCount}, skipped ${skippedCount}, errors ${errorCount}`;
    console.log('[JSON Import]', completeMessage);
    
    onProgress({
      currentJob: totalJobsToImport,
      totalJobs: totalJobsToImport,
      percentage: 100,
      currentJobData: null,
      status: 'complete',
      message: completeMessage,
    });

    return {
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error('[JSON Import] Fatal error:', error);
    
    // Provide user-friendly error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unable to read JSON file. Please make sure this is a Tech Records JSON export.';
    
    onProgress({
      currentJob: 0,
      totalJobs: 0,
      percentage: 0,
      currentJobData: null,
      status: 'error',
      message: errorMessage,
    });
    
    throw error;
  }
}
