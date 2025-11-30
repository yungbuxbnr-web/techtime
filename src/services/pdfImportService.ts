
import * as FileSystem from 'expo-file-system/legacy';
import { Job } from '../types';

// VHC status enum
export enum VhcStatus {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
  NONE = 'NONE',
}

// Job input interface for parsed data
export interface JobInput {
  wipNumber: string;
  vehicleReg: string;
  vhcStatus: VhcStatus;
  description: string;
  aws: number;
  jobDateTime: string; // ISO string
}

/**
 * Normalize VHC status from raw string to enum
 */
function normaliseVhc(vhcStatusRaw: string): VhcStatus {
  const normalised = vhcStatusRaw?.toUpperCase().replace(/\//g, '').replace(/\s/g, '').trim();
  
  switch (normalised) {
    case 'GREEN':
      return VhcStatus.GREEN;
    case 'ORANGE':
    case 'AMBER':
      return VhcStatus.ORANGE;
    case 'RED':
      return VhcStatus.RED;
    case 'N':
    case 'NA':
    case 'N/A':
    case 'NA':
      return VhcStatus.NONE;
    default:
      return VhcStatus.NONE;
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
    // Parse DD/MM/YYYY
    const dateParts = date.split('/');
    if (dateParts.length !== 3) {
      console.warn('[PDF Import] Invalid date format:', date);
      return new Date().toISOString();
    }
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(dateParts[2], 10);
    
    // Parse HH:mm
    const timeParts = time.split(':');
    if (timeParts.length !== 2) {
      console.warn('[PDF Import] Invalid time format:', time);
      return new Date(year, month, day).toISOString();
    }
    
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    
    // Create date in local timezone
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
    
    // Read PDF as base64
    const base64Content = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Decode base64 to binary string
    const binaryString = atob(base64Content);
    
    // Extract text using simple pattern matching
    // Look for text between parentheses in PDF structure
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
 * Expected PDF structure (after text extraction):
 * WIP NUMBER VEHICLE REG VHC JOB DESCRIPTION AWS TIME DATE & TIME
 * 26173 L4JSG Green Seatbelt recall, vhc 6 0h 30m 17/11/2025 15:49
 * 
 * The regex now handles newlines and whitespace variations in the PDF text.
 * 
 * @param pdfUri - URI of the PDF file
 * @returns Array of JobInput objects
 */
export async function parseTechRecordsPdf(pdfUri: string): Promise<JobInput[]> {
  try {
    console.log('[PDF Import] Starting PDF parsing...');
    
    // Extract text from PDF
    const text = await extractPdfText(pdfUri);
    
    if (!text || text.length < 50) {
      console.warn('[PDF Import] Insufficient text extracted from PDF');
      return [];
    }
    
    // Normalize the text: replace multiple spaces/newlines with single space
    const normalizedText = text
      .replace(/\s+/g, ' ')  // Replace all whitespace (including newlines) with single space
      .trim();
    
    console.log('[PDF Import] Normalized text length:', normalizedText.length);
    console.log('[PDF Import] First 500 chars of normalized text:', normalizedText.substring(0, 500));
    
    // Updated regex pattern to match job rows with flexible whitespace
    // Captures: WIP (5 digits), Reg (4-8 chars), VHC, Description (non-greedy), AWS, minutes, Date, Time
    const jobPattern = /(\d{5})\s+([A-Z0-9]{4,8})\s+(Green|Orange|Red|N\/?A?)\s*(.*?)\s*(\d+)\s*h\s+(\d+)\s*m\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/gi;
    
    const jobs: JobInput[] = [];
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
          minutesString, // We ignore this as we calculate from AWS
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
        
        // Parse AWS value
        const aws = parseInt(awsString, 10);
        
        // Clean up description
        const description = descriptionRaw
          .trim()
          .replace(/\s+/g, ' '); // Normalize whitespace
        
        // Normalize VHC status
        const vhcStatus = normaliseVhc(vhcStatusRaw);
        
        // Create ISO datetime
        const jobDateTime = makeIsoFromDateTime(date, time);
        
        // Create JobInput object
        const jobInput: JobInput = {
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
        // Continue to next match
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
  jobInput: JobInput,
  existingJobs: Job[]
): boolean {
  return existingJobs.some(
    (job) =>
      job.wipNumber === jobInput.wipNumber &&
      job.startedAt === jobInput.jobDateTime
  );
}

/**
 * Convert JobInput to Job object
 */
export function convertJobInputToJob(jobInput: JobInput): Job {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Map VhcStatus enum to Job vhcStatus format
  let vhcStatus: 'Red' | 'Orange' | 'Green' | 'N/A' = 'N/A';
  switch (jobInput.vhcStatus) {
    case VhcStatus.RED:
      vhcStatus = 'Red';
      break;
    case VhcStatus.ORANGE:
      vhcStatus = 'Orange';
      break;
    case VhcStatus.GREEN:
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
    timeInMinutes: jobInput.aws * 5, // 1 AW = 5 minutes
    startedAt: jobInput.jobDateTime,
    dateCreated: jobInput.jobDateTime,
    source: {
      type: 'pdf',
      importedAt: new Date().toISOString(),
    },
  };
  
  return job;
}
</write file>

Now let me also update the NotificationToast component to accept the props correctly:

<write file="components/NotificationToast.tsx">
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface NotificationToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onHide: () => void;
}

export default function NotificationToast({ message, type, onHide }: NotificationToastProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  useEffect(() => {
    // Show animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 3 seconds
    const timer = setTimeout(() => {
      hideToast();
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success || '#4CAF50';
      case 'error':
        return colors.error || '#F44336';
      case 'info':
      default:
        return colors.primary;
    }
  };

  const styles = createStyles(colors);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 1000,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
