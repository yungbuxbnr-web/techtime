
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Job, AppSettings } from '../types';

export interface BackupData {
  version: string;
  timestamp: string;
  jobs: Job[];
  settings: AppSettings;
  metadata: {
    totalJobs: number;
    totalAWs: number;
    totalTime?: number;
    exportDate: string;
    appVersion: string;
  };
}

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
      
      // Read file content as UTF-8 string
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

  // Extract text from PDF binary content
  extractTextFromPDF(base64Content: string): string {
    try {
      console.log('Extracting text from PDF...');
      
      // Decode base64 to binary string
      const binaryString = atob(base64Content);
      
      // PDF text extraction strategies
      let extractedText = '';
      
      // Strategy 1: Extract text between BT (Begin Text) and ET (End Text) operators
      const btEtPattern = /BT\s+([\s\S]*?)\s+ET/g;
      let match;
      const textBlocks: string[] = [];
      
      while ((match = btEtPattern.exec(binaryString)) !== null) {
        const textBlock = match[1];
        
        // Extract text from Tj and TJ operators
        // Tj: (text) Tj
        // TJ: [(text)] TJ
        const tjPattern = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
        const tjArrayPattern = /\[\s*((?:\([^)]*\)\s*)+)\]\s*TJ/g;
        
        let tjMatch;
        while ((tjMatch = tjPattern.exec(textBlock)) !== null) {
          const text = this.decodePDFString(tjMatch[1]);
          if (text.trim()) {
            textBlocks.push(text);
          }
        }
        
        while ((tjMatch = tjArrayPattern.exec(textBlock)) !== null) {
          const arrayContent = tjMatch[1];
          const textParts = arrayContent.match(/\(([^)]*)\)/g);
          if (textParts) {
            textParts.forEach(part => {
              const text = this.decodePDFString(part.slice(1, -1));
              if (text.trim()) {
                textBlocks.push(text);
              }
            });
          }
        }
      }
      
      extractedText = textBlocks.join(' ');
      
      // Strategy 2: If no text found with BT/ET, try to extract all text-like content
      if (!extractedText || extractedText.length < 100) {
        console.log('Trying alternative text extraction method...');
        
        // Look for text in parentheses (common PDF text format)
        const textPattern = /\(([^)]{2,})\)/g;
        const texts: string[] = [];
        
        while ((match = textPattern.exec(binaryString)) !== null) {
          const text = this.decodePDFString(match[1]);
          if (text.trim() && text.length > 1) {
            texts.push(text);
          }
        }
        
        if (texts.length > 0) {
          extractedText = texts.join(' ');
        }
      }
      
      // Strategy 3: Extract from stream objects
      if (!extractedText || extractedText.length < 100) {
        console.log('Trying stream extraction method...');
        
        const streamPattern = /stream\s+([\s\S]*?)\s+endstream/g;
        const streamTexts: string[] = [];
        
        while ((match = streamPattern.exec(binaryString)) !== null) {
          const streamContent = match[1];
          
          // Try to extract readable text from stream
          const readableText = streamContent.replace(/[^\x20-\x7E\n\r\t]/g, '');
          if (readableText.trim().length > 10) {
            streamTexts.push(readableText);
          }
        }
        
        if (streamTexts.length > 0) {
          extractedText = streamTexts.join('\n');
        }
      }
      
      console.log('Extracted text length:', extractedText.length);
      console.log('First 500 characters:', extractedText.substring(0, 500));
      
      return extractedText;
    } catch (error) {
      console.log('Error extracting text from PDF:', error);
      return '';
    }
  },

  // Decode PDF string (handle escape sequences)
  decodePDFString(str: string): string {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
  },

  // Parse PDF content and extract job details
  parsePDFContent(content: string): Job[] {
    try {
      console.log('Starting PDF content parsing...');
      const jobs: Job[] = [];
      
      // Split content into lines and clean up
      const lines = content
        .split(/[\n\r]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      console.log(`Total lines found: ${lines.length}`);
      
      // Find table data - look for lines with WIP numbers (5 digits)
      const wipPattern = /\b(\d{5})\b/;
      const dataLines: string[] = [];
      
      for (const line of lines) {
        // Skip header lines and separators
        if (
          line.match(/^[-=_]+$/) ||
          line.toLowerCase().includes('performance metrics') ||
          line.toLowerCase().includes('detailed job records') ||
          line.toLowerCase().includes('wip number') ||
          line.toLowerCase().includes('vehicle reg') ||
          line.toLowerCase().includes('page ') ||
          line.toLowerCase().includes('buckston rugge')
        ) {
          continue;
        }
        
        // Check if line contains a WIP number
        if (wipPattern.test(line)) {
          dataLines.push(line);
        }
      }
      
      console.log(`Found ${dataLines.length} potential job lines`);
      
      // Parse each data line
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        console.log(`Parsing line ${i + 1}/${dataLines.length}: ${line.substring(0, 100)}...`);
        
        const job = this.parseJobLine(line);
        
        if (job) {
          jobs.push(job);
          console.log(`✓ Parsed job: WIP ${job.wipNumber}, Reg ${job.vehicleRegistration}, AWs ${job.awValue}, Time ${job.timeInMinutes}m`);
        } else {
          console.log(`✗ Failed to parse line: ${line.substring(0, 100)}...`);
        }
      }
      
      console.log(`Successfully parsed ${jobs.length} jobs from PDF`);
      return jobs;
    } catch (error) {
      console.log('Error parsing PDF content:', error);
      return [];
    }
  },

  // Parse a single job line from PDF
  parseJobLine(line: string): Job | null {
    try {
      // Clean up the line
      const cleanLine = line.trim().replace(/\s+/g, ' ');
      
      // Extract WIP number (5 digits)
      const wipMatch = cleanLine.match(/\b(\d{5})\b/);
      if (!wipMatch) {
        console.log('No WIP number found');
        return null;
      }
      const wipNumber = wipMatch[1];
      
      // Extract vehicle registration (UK format)
      // Formats: AB12CDE, A123BCD, ABC123, ABC1234, etc.
      const regMatch = cleanLine.match(/\b([A-Z]{1,2}\d{1,4}[A-Z]{1,3}|[A-Z]{3}\d{1,4}|[A-Z]{2}\d{2}[A-Z]{3})\b/i);
      if (!regMatch) {
        console.log('No vehicle registration found');
        return null;
      }
      const vehicleReg = regMatch[1].toUpperCase();
      
      // Extract AWS value (should be a number, typically 1-100)
      // Look for standalone numbers that could be AWS values
      const numbers = cleanLine.match(/\b(\d{1,3})\b/g);
      if (!numbers || numbers.length < 2) {
        console.log('Not enough numbers found for AWS');
        return null;
      }
      
      // AWS is typically one of the numbers (not the WIP number)
      let awsValue = 0;
      for (const num of numbers) {
        if (num !== wipNumber) {
          const val = parseInt(num, 10);
          if (val >= 1 && val <= 100) {
            awsValue = val;
            break;
          }
        }
      }
      
      if (awsValue === 0) {
        console.log('No valid AWS value found');
        return null;
      }
      
      // Extract time (format: "1h 20m", "2h 0m", "0h 15m", etc.)
      const timeMatch = cleanLine.match(/(\d+)h\s*(\d+)m/i);
      let timeInMinutes = awsValue * 5; // Default: 1 AW = 5 minutes
      
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        timeInMinutes = hours * 60 + minutes;
      }
      
      // Extract date and time (format: "DD/MM/YYYY HH:MM")
      const dateTimeMatch = cleanLine.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
      let dateCreated = new Date().toISOString();
      
      if (dateTimeMatch) {
        const [, day, month, year, hour, minute] = dateTimeMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        );
        
        if (!isNaN(date.getTime())) {
          dateCreated = date.toISOString();
        }
      }
      
      // Extract job description (text between vehicle reg and AWS)
      let description = '';
      const regIndex = cleanLine.indexOf(vehicleReg);
      const awsString = awsValue.toString();
      
      // Find the AWS value position in the line
      let awsIndex = -1;
      const parts = cleanLine.split(/\s+/);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === awsString) {
          // Make sure this is the AWS value, not part of date/time
          const beforePart = parts[i - 1] || '';
          const afterPart = parts[i + 1] || '';
          
          // AWS should not be preceded by "/" or followed by "h"
          if (!beforePart.includes('/') && !afterPart.startsWith('h')) {
            awsIndex = cleanLine.indexOf(awsString, regIndex);
            break;
          }
        }
      }
      
      if (awsIndex > regIndex) {
        description = cleanLine.substring(regIndex + vehicleReg.length, awsIndex).trim();
        
        // Clean up description
        description = description
          .replace(/\s+/g, ' ')
          .replace(/^\s*[-:,]\s*/, '')
          .trim();
      }
      
      // Generate unique ID
      const id = `${wipNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const job: Job = {
        id,
        wipNumber,
        vehicleRegistration: vehicleReg,
        awValue: awsValue,
        notes: description,
        dateCreated,
        timeInMinutes
      };
      
      return job;
    } catch (error) {
      console.log('Error parsing job line:', error);
      return null;
    }
  },

  // Import from PDF file
  async importFromPDF(uri: string): Promise<{ success: boolean; data?: BackupData; message?: string }> {
    try {
      console.log('Starting PDF import from:', uri);
      
      // Read PDF file as base64
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      
      console.log('PDF file read successfully, size:', base64Content.length);
      
      // Extract text from PDF
      const textContent = this.extractTextFromPDF(base64Content);
      
      if (!textContent || textContent.trim().length === 0) {
        return {
          success: false,
          message: 'Could not extract text from PDF.\n\nThe PDF might be:\n- Image-based (scanned document)\n- Encrypted or password-protected\n- Corrupted\n\nPlease try:\n1. Using a text-based PDF export\n2. Using JSON format for importing\n3. Re-exporting the PDF from the source'
        };
      }
      
      console.log('Text extracted successfully, length:', textContent.length);
      
      // Parse the extracted text content
      const jobs = this.parsePDFContent(textContent);
      
      if (jobs.length === 0) {
        return {
          success: false,
          message: 'No valid job records found in PDF.\n\nPlease ensure the PDF contains a table with:\n- WIP NUMBER (5 digits)\n- VEHICLE REG (UK format)\n- JOB DESCRIPTION\n- AWS (numeric value)\n- TIME (format: 1h 20m)\n- DATE & TIME (format: DD/MM/YYYY HH:MM)\n\nFor best results, use JSON format for importing.'
        };
      }
      
      // Calculate totals
      const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
      const totalTime = jobs.reduce((sum, job) => sum + job.timeInMinutes, 0);
      
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
          totalAWs: totalAWs,
          totalTime: totalTime,
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0'
        }
      };
      
      console.log('PDF import successful:', {
        jobs: jobs.length,
        totalAWs: totalAWs,
        totalTime: totalTime
      });
      
      // Create detailed summary
      const hours = Math.floor(totalTime / 60);
      const minutes = totalTime % 60;
      const timeFormatted = `${hours}h ${minutes}m`;
      
      return {
        success: true,
        data: backupData,
        message: `✅ PDF imported successfully!\n\n📊 Summary:\n- Jobs found: ${jobs.length}\n- Total AWs: ${totalAWs}\n- Total time: ${timeFormatted}\n\n⚠️ Please review the imported data carefully before confirming.\n\nNote: Job descriptions and dates have been extracted from the PDF. Verify accuracy before saving.`
      };
    } catch (error) {
      console.log('Error importing from PDF:', error);
      return {
        success: false,
        message: `Failed to import PDF:\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nFor best results, please use JSON format for importing.`
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
  },
};
