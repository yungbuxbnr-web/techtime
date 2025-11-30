
import * as FileSystem from 'expo-file-system/legacy';
import { getPdfText } from '../utils/pdfTextExtractor';

// VHC status enum
export enum VhcStatus {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
  NONE = 'NONE',
}

// Job input interface for parsed data
export interface PdfJobInput {
  wipNumber: string;
  vehicleReg: string;
  vhcStatus: 'GREEN' | 'ORANGE' | 'RED' | 'NONE';
  description: string;
  aws: number;
  jobDateTime: string;
}

// Job interface (matching the app's Job type)
interface Job {
  id: string;
  wipNumber: string;
  vehicleRegistration: string;
  vhcStatus: 'Red' | 'Orange' | 'Green' | 'N/A';
  jobDescription: string;
  notes: string;
  awValue: number;
  timeInMinutes: number;
  startedAt: string;
  dateCreated: string;
  source?: {
    type: string;
    importedAt: string;
  };
}

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
  } else if (normalised === 'N' || normalised === 'NA') {
    return 'NONE';
  } else {
    return 'NONE';
  }
}

/**
 * Convert date and time strings to ISO datetime
 * @param date - Date in DD/MM/YYYY format
 * @param time - Time in HH:mm format
 * @returns ISO datetime string
 */
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

/**
 * Parse Tech Records PDF and extract job data
 * 
 * @param pdfUri - URI of the PDF file
 * @returns Array of PdfJobInput objects
 */
export async function parseTechRecordsPdf(pdfUri: string): Promise<PdfJobInput[]> {
  try {
    console.log('[PDF Import] Starting PDF parsing...');
    
    // Use the new getPdfText helper for reliable text extraction
    const text = await getPdfText(pdfUri);
    
    if (!text || text.length < 50) {
      console.warn('[PDF Import] Insufficient text extracted from PDF');
      throw new Error('Could not read PDF text. Please make sure this is a Tech Records PDF export.');
    }
    
    const normalizedText = text
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('[PDF Import] Normalized text length:', normalizedText.length);
    console.log('[PDF Import] First 500 chars of normalized text:', normalizedText.substring(0, 500));
    
    const jobPattern = /(\d{5})\s+([A-Z0-9]{4,8})\s+(Green|Orange|Red|N\/?A?)\s*(.*?)\s*(\d+)\s*h\s+(\d+)\s*m\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/gi;
    
    const jobs: PdfJobInput[] = [];
    let match;
    let matchCount = 0;
    
    console.log('[PDF Import] Searching for job patterns...');
    
    while ((match = jobPattern.exec(normalizedText)) !== null) {
      matchCount++;
      
      try {
        const [
          fullMatch,
          wipNumber,
          vehicleReg,
          vhcStatusRaw,
          descriptionRaw,
          awsString,
          minutesString,
          date,
          time,
        ] = match;
        
        console.log(`[PDF Import] Match ${matchCount}:`, {
          wipNumber,
          vehicleReg,
          vhcStatusRaw,
          descriptionRaw: descriptionRaw.substring(0, 50),
          awsString,
          date,
          time,
        });
        
        const aws = parseInt(awsString, 10);
        
        const description = descriptionRaw
          .trim()
          .replace(/\s+/g, ' ');
        
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
        
        console.log(`[PDF Import] Parsed job ${matchCount}: WIP ${wipNumber}, Reg ${vehicleReg}, AWS ${aws}, Date ${date} ${time}`);
      } catch (error) {
        console.error(`[PDF Import] Error parsing match ${matchCount}:`, error);
      }
    }
    
    console.log(`[PDF Import] Total jobs parsed: ${jobs.length}`);
    
    if (jobs.length > 0) {
      console.log('[PDF Import] First job example:', jobs[0]);
    } else {
      console.warn('[PDF Import] No jobs found. Sample of normalized text:', normalizedText.substring(0, 1000));
    }
    
    return jobs;
  } catch (error) {
    console.error('[PDF Import] Error parsing PDF:', error);
    
    // Provide user-friendly error message
    if (error instanceof Error && error.message.includes('Failed to extract text from PDF')) {
      throw new Error('Could not read PDF text. Please make sure this is a Tech Records PDF export.');
    }
    
    throw error;
  }
}

/**
 * Check if a job with the same WIP number and date already exists
 */
export function isDuplicateJob(
  jobInput: PdfJobInput,
  existingJobs: Job[]
): boolean {
  return existingJobs.some(
    (job) =>
      job.wipNumber === jobInput.wipNumber &&
      job.startedAt === jobInput.jobDateTime
  );
}

/**
 * Convert PdfJobInput to Job object
 */
export function convertJobInputToJob(jobInput: PdfJobInput): Job {
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
  
  const job: Job = {
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
      type: 'pdf',
      importedAt: new Date().toISOString(),
    },
  };
  
  return job;
}
