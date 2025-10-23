
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { BackupData } from './backupService';
import { Job, AppSettings } from '../types';

export const PDFImportService = {
  // Pick a PDF file from device
  async pickPDFFile(): Promise<{ success: boolean; uri?: string; message?: string }> {
    try {
      console.log('Opening document picker for PDF...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picker cancelled');
        return { success: false, message: 'File selection cancelled' };
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('PDF file selected:', file.name, file.uri);
        return { success: true, uri: file.uri };
      }

      return { success: false, message: 'No file selected' };
    } catch (error) {
      console.log('Error picking PDF file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pick file'
      };
    }
  },

  // Pick a JSON backup file from device
  async pickJSONFile(): Promise<{ success: boolean; uri?: string; message?: string }> {
    try {
      console.log('Opening document picker for JSON...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picker cancelled');
        return { success: false, message: 'File selection cancelled' };
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('JSON file selected:', file.name, file.uri);
        return { success: true, uri: file.uri };
      }

      return { success: false, message: 'No file selected' };
    } catch (error) {
      console.log('Error picking JSON file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pick file'
      };
    }
  },

  // Import backup data from JSON file
  async importFromJSON(uri: string): Promise<{ success: boolean; data?: BackupData; message?: string }> {
    try {
      console.log('Reading JSON file from:', uri);
      
      // Read file content - using string encoding directly
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: 'utf8',
      });

      // Parse JSON
      const data: BackupData = JSON.parse(content);

      // Validate backup data structure
      if (!data.jobs || !data.settings || !data.metadata) {
        console.log('Invalid backup file structure');
        return {
          success: false,
          message: 'Invalid backup file format. The file does not contain valid backup data.'
        };
      }

      console.log('Backup data loaded successfully:', {
        jobs: data.jobs.length,
        totalAWs: data.metadata.totalAWs,
        backupDate: data.timestamp
      });

      return {
        success: true,
        data,
        message: `Backup loaded successfully!\n\nJobs: ${data.jobs.length}\nTotal AWs: ${data.metadata.totalAWs}\nBackup date: ${new Date(data.timestamp).toLocaleDateString()}`
      };
    } catch (error) {
      console.log('Error importing from JSON:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import backup'
      };
    }
  },

  // Parse PDF content and extract job details
  parsePDFContent(content: string): Job[] {
    try {
      console.log('Starting PDF content parsing...');
      const jobs: Job[] = [];
      
      // Split content into lines
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log(`Total lines found: ${lines.length}`);
      
      // Find the header row to identify column positions
      let headerIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toUpperCase();
        if (line.includes('WIP') && line.includes('VEHICLE') && line.includes('AWS')) {
          headerIndex = i;
          console.log(`Header found at line ${i}: ${lines[i]}`);
          break;
        }
      }

      if (headerIndex === -1) {
        console.log('Could not find table header in PDF');
        return jobs;
      }

      // Parse data rows (skip header and any separator lines)
      for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip empty lines, separator lines, or footer text
        if (!line || 
            line.match(/^[-=_]+$/) || 
            line.toLowerCase().includes('detailed job records') ||
            line.toLowerCase().includes('page') ||
            line.toLowerCase().includes('total') ||
            line.toLowerCase().includes('buckston rugge')) {
          continue;
        }

        console.log(`Processing line ${i}: ${line}`);
        
        // Try to extract job data using multiple parsing strategies
        const job = this.parseJobLine(line);
        
        if (job) {
          jobs.push(job);
          console.log(`Successfully parsed job: WIP ${job.wipNumber}, Reg ${job.vehicleRegistration}, AWs ${job.awValue}`);
        }
      }

      console.log(`Total jobs parsed: ${jobs.length}`);
      return jobs;
    } catch (error) {
      console.log('Error parsing PDF content:', error);
      return [];
    }
  },

  // Parse a single job line from PDF
  parseJobLine(line: string): Job | null {
    try {
      // Strategy 1: Tab-separated values
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 4) {
          return this.createJobFromParts(parts);
        }
      }

      // Strategy 2: Multiple spaces as separators
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 4) {
        return this.createJobFromParts(parts);
      }

      // Strategy 3: Regex pattern matching for structured data
      // Pattern: WIP_NUMBER VEHICLE_REG DESCRIPTION AWS TIME DATE_TIME
      const pattern = /^(\d{5})\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+(\d+h\s*\d+m)\s+(.+)$/i;
      const match = line.match(pattern);
      
      if (match) {
        const [, wipNumber, vehicleReg, description, aws, time, dateTime] = match;
        return this.createJob(wipNumber, vehicleReg, description, aws, dateTime);
      }

      // Strategy 4: Look for WIP number at start and AWS as number
      const wipMatch = line.match(/^(\d{5})/);
      const awsMatch = line.match(/\b(\d{1,3})\b/g);
      const regMatch = line.match(/\b([A-Z]{2}\d{2}[A-Z]{3}|[A-Z]\d{1,3}[A-Z]{3}|[A-Z]{3}\d{1,4})\b/i);
      
      if (wipMatch && awsMatch && regMatch) {
        const wipNumber = wipMatch[1];
        const vehicleReg = regMatch[1];
        const aws = awsMatch[awsMatch.length - 1]; // Last number is likely AWS
        
        // Extract description (text between reg and AWS)
        const regIndex = line.indexOf(vehicleReg);
        const awsIndex = line.lastIndexOf(aws);
        const description = line.substring(regIndex + vehicleReg.length, awsIndex).trim();
        
        return this.createJob(wipNumber, vehicleReg, description, aws, new Date().toISOString());
      }

      return null;
    } catch (error) {
      console.log('Error parsing job line:', error);
      return null;
    }
  },

  // Create job from parsed parts array
  createJobFromParts(parts: string[]): Job | null {
    try {
      // Expected format: [WIP, REG, DESCRIPTION, AWS, TIME, DATE_TIME]
      // Minimum required: WIP, REG, AWS
      
      if (parts.length < 3) {
        return null;
      }

      const wipNumber = parts[0];
      const vehicleReg = parts[1];
      
      // Find AWS value (should be a number)
      let awsValue = 0;
      let awsIndex = -1;
      
      for (let i = 2; i < parts.length; i++) {
        const parsed = parseInt(parts[i], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
          awsValue = parsed;
          awsIndex = i;
          break;
        }
      }

      if (awsIndex === -1) {
        console.log('Could not find valid AWS value in parts:', parts);
        return null;
      }

      // Description is everything between reg and AWS
      const description = parts.slice(2, awsIndex).join(' ').trim();
      
      // Date/time is after AWS (if available)
      const dateTimeStr = parts.slice(awsIndex + 2).join(' ').trim();
      const dateTime = this.parseDateTimeString(dateTimeStr);

      return this.createJob(wipNumber, vehicleReg, description, awsValue.toString(), dateTime);
    } catch (error) {
      console.log('Error creating job from parts:', error);
      return null;
    }
  },

  // Create a Job object from parsed data
  createJob(
    wipNumber: string,
    vehicleReg: string,
    description: string,
    aws: string,
    dateTimeStr: string
  ): Job | null {
    try {
      // Validate WIP number (should be 5 digits)
      if (!/^\d{5}$/.test(wipNumber)) {
        console.log('Invalid WIP number format:', wipNumber);
        return null;
      }

      // Parse AWS value
      const awValue = parseInt(aws, 10);
      if (isNaN(awValue) || awValue < 0 || awValue > 100) {
        console.log('Invalid AWS value:', aws);
        return null;
      }

      // Clean vehicle registration
      const cleanReg = vehicleReg.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Parse date/time
      const dateCreated = this.parseDateTimeString(dateTimeStr);

      // Calculate time in minutes (1 AW = 5 minutes)
      const timeInMinutes = awValue * 5;

      // Generate unique ID
      const id = `${wipNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const job: Job = {
        id,
        wipNumber,
        vehicleRegistration: cleanReg,
        awValue: awValue,
        notes: description || '',
        dateCreated,
        timeInMinutes
      };

      return job;
    } catch (error) {
      console.log('Error creating job object:', error);
      return null;
    }
  },

  // Parse date/time string from PDF
  parseDateTimeString(dateTimeStr: string): string {
    try {
      if (!dateTimeStr || dateTimeStr.trim().length === 0) {
        return new Date().toISOString();
      }

      // Try to parse various date formats
      // Format 1: DD/MM/YYYY HH:MM
      const format1 = dateTimeStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
      if (format1) {
        const [, day, month, year, hour, minute] = format1;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        return date.toISOString();
      }

      // Format 2: DD/MM/YYYY
      const format2 = dateTimeStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (format2) {
        const [, day, month, year] = format2;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toISOString();
      }

      // Format 3: YYYY-MM-DD HH:MM
      const format3 = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
      if (format3) {
        const [, year, month, day, hour, minute] = format3;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        return date.toISOString();
      }

      // Try native Date parsing as fallback
      const parsedDate = new Date(dateTimeStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }

      // Default to current date if parsing fails
      return new Date().toISOString();
    } catch (error) {
      console.log('Error parsing date/time string:', error);
      return new Date().toISOString();
    }
  },

  // Import from PDF file
  async importFromPDF(uri: string): Promise<{ success: boolean; data?: BackupData; message?: string }> {
    try {
      console.log('Starting PDF import from:', uri);
      
      // Read PDF file as base64
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Decode base64 to text (this works for text-based PDFs)
      // Note: This is a simplified approach. For complex PDFs with images/formatting,
      // a proper PDF parsing library would be needed
      let textContent = '';
      try {
        // Try to decode as UTF-8
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        textContent = decoder.decode(bytes);
      } catch (decodeError) {
        console.log('Error decoding PDF content:', decodeError);
        
        // Fallback: Try to extract text from PDF structure
        // PDFs store text in specific format, we'll try to extract it
        const binaryString = atob(base64Content);
        
        // Look for text content between BT (Begin Text) and ET (End Text) markers
        const textMatches = binaryString.match(/BT\s+(.*?)\s+ET/gs);
        if (textMatches) {
          textContent = textMatches.map(match => {
            // Extract text from PDF text objects
            const textObjects = match.match(/\((.*?)\)/g);
            if (textObjects) {
              return textObjects.map(t => t.replace(/[()]/g, '')).join(' ');
            }
            return '';
          }).join('\n');
        } else {
          // Last resort: extract all printable characters
          textContent = binaryString.replace(/[^\x20-\x7E\n\r\t]/g, '');
        }
      }

      console.log('Extracted text content length:', textContent.length);
      console.log('First 500 characters:', textContent.substring(0, 500));

      if (!textContent || textContent.trim().length === 0) {
        return {
          success: false,
          message: 'Could not extract text from PDF. The PDF might be image-based or encrypted.\n\nPlease use a text-based PDF export or JSON format for importing.'
        };
      }

      // Parse the extracted text content
      const jobs = this.parsePDFContent(textContent);

      if (jobs.length === 0) {
        return {
          success: false,
          message: 'No valid job records found in PDF.\n\nPlease ensure the PDF contains a table with columns:\n- WIP NUMBER\n- VEHICLE REG\n- JOB DESCRIPTION\n- AWS\n- TIME\n- DATE & TIME\n\nFor best results, use JSON format for importing.'
        };
      }

      // Create backup data structure
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        jobs: jobs,
        settings: {
          pin: '3101',
          isAuthenticated: false,
          targetHours: 180,
          theme: 'light'
        },
        metadata: {
          totalJobs: jobs.length,
          totalAWs: jobs.reduce((sum, job) => sum + job.awValue, 0),
          totalTime: jobs.reduce((sum, job) => sum + job.timeInMinutes, 0),
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0'
        }
      };

      console.log('PDF import successful:', {
        jobs: jobs.length,
        totalAWs: backupData.metadata.totalAWs
      });

      return {
        success: true,
        data: backupData,
        message: `PDF imported successfully!\n\nJobs found: ${jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}\n\nPlease review the imported data before confirming.`
      };
    } catch (error) {
      console.log('Error importing from PDF:', error);
      return {
        success: false,
        message: `Failed to import PDF: ${error instanceof Error ? error.message : 'Unknown error'}\n\nFor best results, please use JSON format for importing.`
      };
    }
  },

  // Import any supported file type
  async importFile(): Promise<{ success: boolean; data?: BackupData; message?: string }> {
    try {
      console.log('Opening document picker for any supported file...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picker cancelled');
        return { success: false, message: 'File selection cancelled' };
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected:', file.name, file.mimeType);

        // Check file type and import accordingly
        if (file.mimeType === 'application/json' || file.name.endsWith('.json')) {
          return await this.importFromJSON(file.uri);
        } else if (file.mimeType === 'application/pdf' || file.name.endsWith('.pdf')) {
          return await this.importFromPDF(file.uri);
        } else {
          return {
            success: false,
            message: 'Unsupported file type. Please select a JSON or PDF file.'
          };
        }
      }

      return { success: false, message: 'No file selected' };
    } catch (error) {
      console.log('Error importing file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import file'
      };
    }
  }
};
