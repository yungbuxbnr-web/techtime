
import * as FileSystem from 'expo-file-system/legacy';

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
  
  switch (normalised) {
    case 'GREEN':
      return 'GREEN';
    case 'ORANGE':
    case 'AMBER':
      return 'ORANGE';
    case 'RED':
      return 'RED';
    case 'N':
    case 'NA':
    case 'N/A':
    case 'NA':
      return 'NONE';
    default:
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
 * Extract text from PDF file
 * Uses simple text extraction from PDF structure
 */
async function extractPdfText(pdfUri: string): Promise<string> {
  try {
    console.log('[PDF Import] Reading PDF file...');
    
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
    console.log(`[PDF Import] Extracted ${extractedText.length} characters from PDF`);
    console.log('[PDF Import] First 500 chars:', extractedText.substring(0, 500));
    
    return extractedText;
  } catch (error) {
    console.error('[PDF Import] Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
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
    
    const text = await extractPdfText(pdfUri);
    
    if (!text || text.length < 50) {
      console.warn('[PDF Import] Insufficient text extracted from PDF');
      return [];
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
  switch (jobInput.vhcStatus) {
    case 'RED':
      vhcStatus = 'Red';
      break;
    case 'ORANGE':
      vhcStatus = 'Orange';
      break;
    case 'GREEN':
      vhcStatus = 'Green';
      break;
    default:
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
