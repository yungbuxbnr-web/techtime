
import * as FileSystem from 'expo-file-system/legacy';
import { StorageService } from '../../utils/storage';

export interface PdfJobInput {
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
  currentJobData: PdfJobInput | null;
  status: 'parsing' | 'importing' | 'complete' | 'error';
  message: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

function normaliseVhc(vhcStatusRaw: string): 'GREEN' | 'ORANGE' | 'RED' | 'NONE' {
  const normalised = vhcStatusRaw?.toUpperCase().replace(/\//g, '').replace(/\s/g, '').trim();
  
  if (normalised === 'GREEN') {
    return 'GREEN';
  } else if (normalised === 'ORANGE' || normalised === 'AMBER') {
    return 'ORANGE';
  } else if (normalised === 'RED') {
    return 'RED';
  } else if (normalised === 'N' || normalised === 'NA') {
    return 'NONE';
  } else {
    return 'NONE';
  }
}

function makeIsoFromDateTime(date: string, time: string): string {
  try {
    const dateParts = date.split('/');
    if (dateParts.length !== 3) {
      console.warn('[PDF Import] Invalid date format:', date);
      return new Date().toISOString();
    }
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    
    const timeParts = time.split(':');
    if (timeParts.length !== 2) {
      console.warn('[PDF Import] Invalid time format:', time);
      return new Date(year, month, day).toISOString();
    }
    
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    
    const dateObj = new Date(year, month, day, hour, minute);
    
    return dateObj.toISOString();
  } catch (error) {
    console.error('[PDF Import] Error parsing date/time:', error);
    return new Date().toISOString();
  }
}

async function extractPdfText(pdfUri: string): Promise<string> {
  try {
    console.log('[Progressive Import] Reading PDF file...');
    
    const base64Content = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const binaryString = atob(base64Content);
    
    const textPattern = /\(([^)]+)\)/g;
    const texts: string[] = [];
    let match;
    
    while ((match = textPattern.exec(binaryString)) !== null) {
      const text = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      
      if (text.trim() && text.length > 1) {
        texts.push(text);
      }
    }
    
    const extractedText = texts.join(' ');
    console.log(`[Progressive Import] Extracted ${extractedText.length} characters from PDF`);
    
    return extractedText;
  } catch (error) {
    console.error('[Progressive Import] Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

function convertJobInputToJob(jobInput: PdfJobInput) {
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
      type: 'pdf' as const,
      importedAt: new Date().toISOString(),
    },
  };
}

function isDuplicateJob(jobInput: PdfJobInput, existingJobs: any[]): boolean {
  return existingJobs.some(
    (job) =>
      job.wipNumber === jobInput.wipNumber &&
      job.startedAt === jobInput.jobDateTime
  );
}

export async function importPdfProgressively(
  pdfUri: string,
  onProgress: ProgressCallback
): Promise<{ imported: number; skipped: number; errors: number }> {
  try {
    // Step 1: Extract text from PDF
    onProgress({
      currentJob: 0,
      totalJobs: 0,
      percentage: 0,
      currentJobData: null,
      status: 'parsing',
      message: 'Extracting text from PDF...',
    });

    const text = await extractPdfText(pdfUri);
    
    if (!text || text.length < 50) {
      throw new Error('Insufficient text extracted from PDF');
    }
    
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    
    // Step 2: Parse all job records first to get total count
    onProgress({
      currentJob: 0,
      totalJobs: 0,
      percentage: 5,
      currentJobData: null,
      status: 'parsing',
      message: 'Parsing job records...',
    });

    const jobPattern = /(\d{5})\s+([A-Z0-9]{4,8})\s+(Green|Orange|Red|N\/?A?)\s*(.*?)\s*(\d+)\s*h\s+(\d+)\s*m\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/gi;
    
    const jobs: PdfJobInput[] = [];
    let match;
    
    while ((match = jobPattern.exec(normalizedText)) !== null) {
      try {
        const [
          ,
          wipNumber,
          vehicleReg,
          vhcStatusRaw,
          descriptionRaw,
          awsString,
          ,
          date,
          time,
        ] = match;
        
        const aws = parseInt(awsString, 10);
        const description = descriptionRaw.trim().replace(/\s+/g, ' ');
        const vhcStatus = normaliseVhc(vhcStatusRaw);
        const jobDateTime = makeIsoFromDateTime(date, time);
        
        const jobInput: PdfJobInput = {
          wipNumber,
          vehicleReg: vehicleReg.toUpperCase().replace(/\s/g, ''),
          vhcStatus,
          description,
          aws,
          jobDateTime,
        };
        
        jobs.push(jobInput);
      } catch (error) {
        console.error('[Progressive Import] Error parsing job:', error);
      }
    }
    
    if (jobs.length === 0) {
      throw new Error('No jobs found in PDF');
    }

    console.log(`[Progressive Import] Found ${jobs.length} jobs to import`);

    // Step 3: Import jobs one by one
    const existingJobs = await StorageService.getJobs();
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jobs.length; i++) {
      const jobInput = jobs[i];
      const percentage = 10 + Math.floor((i / jobs.length) * 90);

      try {
        // Check for duplicates
        if (isDuplicateJob(jobInput, existingJobs)) {
          console.log(`[Progressive Import] Skipping duplicate: WIP ${jobInput.wipNumber}`);
          skippedCount++;
          
          onProgress({
            currentJob: i + 1,
            totalJobs: jobs.length,
            percentage,
            currentJobData: jobInput,
            status: 'importing',
            message: `Skipped duplicate: ${jobInput.wipNumber} - ${jobInput.vehicleReg}`,
          });
          
          // Small delay to show the progress
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Convert and save job
        const job = convertJobInputToJob(jobInput);
        await StorageService.saveJob(job);
        existingJobs.push(job);
        importedCount++;

        console.log(`[Progressive Import] Imported job ${i + 1}/${jobs.length}: WIP ${jobInput.wipNumber}`);

        // Update progress
        onProgress({
          currentJob: i + 1,
          totalJobs: jobs.length,
          percentage,
          currentJobData: jobInput,
          status: 'importing',
          message: `Added: ${jobInput.wipNumber} - ${jobInput.vehicleReg} (${jobInput.aws} AWs)`,
        });

        // Small delay to show the progress and prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`[Progressive Import] Error importing job ${i + 1}:`, error);
        errorCount++;
        
        onProgress({
          currentJob: i + 1,
          totalJobs: jobs.length,
          percentage,
          currentJobData: jobInput,
          status: 'importing',
          message: `Error: ${jobInput.wipNumber} - ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 4: Complete
    onProgress({
      currentJob: jobs.length,
      totalJobs: jobs.length,
      percentage: 100,
      currentJobData: null,
      status: 'complete',
      message: `Import complete! Added ${importedCount}, skipped ${skippedCount}, errors ${errorCount}`,
    });

    return {
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error('[Progressive Import] Fatal error:', error);
    
    onProgress({
      currentJob: 0,
      totalJobs: 0,
      percentage: 0,
      currentJobData: null,
      status: 'error',
      message: error instanceof Error ? error.message : 'Import failed',
    });
    
    throw error;
  }
}
