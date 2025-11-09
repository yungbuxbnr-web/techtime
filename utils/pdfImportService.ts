
import * as DocumentPicker from 'expo-document-picker';
import {
  cacheDirectory,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Job, ParsedJobRow, PDFImportResult, ParseLogEntry, PDFImportProgress } from '../types';

// UK plate regex patterns
const UK_PLATE_PATTERNS = [
  /^[A-Z]{2}\d{2}\s?[A-Z]{3}$/i, // AB12 CDE
  /^[A-Z]\d{1,3}\s?[A-Z]{3}$/i, // A123 BCD
  /^[A-Z]{3}\s?\d{1,4}$/i, // ABC 123
  /^[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]$/i, // AB 1234 C
  /^[A-Z]{2}\d{2}\s?[A-Z]{2}\d$/i, // AB12 CD1
];

// VHC status mapping
const VHC_MAPPING: Record<string, 'Red' | 'Orange' | 'Green' | 'N/A'> = {
  'red': 'Red',
  'r': 'Red',
  'orange': 'Orange',
  'amber': 'Orange',
  'o': 'Orange',
  'a': 'Orange',
  'green': 'Green',
  'g': 'Green',
  'n/a': 'N/A',
  'na': 'N/A',
  'n.a': 'N/A',
  'n.a.': 'N/A',
  '': 'N/A',
};

// Common OCR corrections
const OCR_CORRECTIONS: Record<string, string> = {
  're ar': 'rear',
  'fr ont': 'front',
  'bra ke': 'brake',
  'br eak': 'break',
  'sus pension': 'suspension',
  'exha ust': 'exhaust',
  'tyr e': 'tyre',
  'bat tery': 'battery',
  'eng ine': 'engine',
  'clu tch': 'clutch',
  'steer ing': 'steering',
  'oik': 'oil',
  'read': 'rear',
};

// Header keywords to ignore
const HEADER_KEYWORDS = [
  'wip number',
  'vehicle reg',
  'vhc status',
  'vhc',
  'job description',
  'aws',
  'work time',
  'time',
  'job date',
  'job time',
  'date & time',
  'date',
  'page',
  'total',
  'summary',
  'report',
  'technician',
];

export const PDFImportService = {
  /**
   * Pick a PDF file from device
   */
  async pickPDFFile(): Promise<{ success: boolean; uri?: string; name?: string; message?: string }> {
    try {
      console.log('[PDF Import] Opening document picker...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[PDF Import] Document picker cancelled');
        return { success: false, message: 'File selection cancelled' };
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('[PDF Import] PDF file selected:', file.name, file.uri);
        return { success: true, uri: file.uri, name: file.name };
      }

      return { success: false, message: 'No file selected' };
    } catch (error) {
      console.error('[PDF Import] Error picking PDF file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pick file'
      };
    }
  },

  /**
   * Calculate hash of file content for de-duplication
   */
  async calculateFileHash(uri: string): Promise<string> {
    try {
      const content = await readAsStringAsync(uri, { encoding: 'base64' });
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content
      );
      return hash;
    } catch (error) {
      console.error('[PDF Import] Error calculating file hash:', error);
      return `fallback-${Date.now()}`;
    }
  },

  /**
   * Normalize VHC status
   */
  normalizeVHCStatus(status: string): 'Red' | 'Orange' | 'Green' | 'N/A' {
    const normalized = status.toLowerCase().trim();
    return VHC_MAPPING[normalized] || 'N/A';
  },

  /**
   * Validate UK registration plate
   */
  validateUKPlate(plate: string): { valid: boolean; confidence: number } {
    const cleaned = plate.toUpperCase().replace(/\s/g, '');
    
    for (const pattern of UK_PLATE_PATTERNS) {
      if (pattern.test(cleaned)) {
        return { valid: true, confidence: 1.0 };
      }
    }
    
    // Check if it looks like a plate (letters and numbers)
    if (/^[A-Z0-9]{2,8}$/.test(cleaned)) {
      return { valid: true, confidence: 0.6 };
    }
    
    return { valid: false, confidence: 0 };
  },

  /**
   * Parse work time string to minutes
   * Handles: "2h 0m", "2h 30m", "2:30", "55m", "2h", split lines "0h\n55m"
   */
  parseWorkTime(timeStr: string): number {
    const cleaned = timeStr.toLowerCase().trim().replace(/\n/g, ' ');
    
    // Format: "2h 0m" or "2h 30m"
    const hm = cleaned.match(/(\d+)h\s*(\d+)m/);
    if (hm) {
      return parseInt(hm[1]) * 60 + parseInt(hm[2]);
    }
    
    // Format: "2:30" or "2:00"
    const colon = cleaned.match(/(\d+):(\d+)/);
    if (colon) {
      return parseInt(colon[1]) * 60 + parseInt(colon[2]);
    }
    
    // Format: "55m" or "120m"
    const m = cleaned.match(/(\d+)m/);
    if (m) {
      return parseInt(m[1]);
    }
    
    // Format: "2h" or "3h"
    const h = cleaned.match(/(\d+)h/);
    if (h) {
      return parseInt(h[1]) * 60;
    }
    
    return 0;
  },

  /**
   * Parse date and time to ISO datetime (Europe/London timezone)
   */
  parseDateTime(dateStr: string, timeStr: string): string {
    try {
      // Parse DD/MM/YYYY
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) {
        return new Date().toISOString();
      }
      
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
      const year = parseInt(dateParts[2]);
      
      // Parse HH:mm
      const timeParts = timeStr.split(':');
      if (timeParts.length !== 2) {
        return new Date(year, month, day).toISOString();
      }
      
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);
      
      // Create date in local timezone (Europe/London is handled by device)
      const date = new Date(year, month, day, hour, minute);
      
      return date.toISOString();
    } catch (error) {
      console.error('[PDF Import] Error parsing date/time:', error);
      return new Date().toISOString();
    }
  },

  /**
   * Apply OCR corrections to text
   */
  applyOCRCorrections(text: string): string {
    let corrected = text;
    
    for (const [wrong, right] of Object.entries(OCR_CORRECTIONS)) {
      const regex = new RegExp(wrong, 'gi');
      corrected = corrected.replace(regex, right);
    }
    
    return corrected;
  },

  /**
   * Detect if PDF is scanned (image-based) vs text-based
   */
  detectPDFLayout(text: string): { isScanned: boolean; textDensity: number } {
    const textLength = text.replace(/\s/g, '').length;
    const totalLength = text.length;
    const textDensity = totalLength > 0 ? textLength / totalLength : 0;
    
    // If text density is very low, likely scanned
    const isScanned = textDensity < 0.3;
    
    console.log('[PDF Import] Text density:', textDensity.toFixed(2), 'Scanned:', isScanned);
    
    return { isScanned, textDensity };
  },

  /**
   * Extract text from PDF - Stage A (Text Layer)
   */
  async extractTextFromPDF(uri: string, parseLog: ParseLogEntry[]): Promise<string> {
    try {
      console.log('[PDF Import] Stage A: Extracting text layer from PDF...');
      
      const base64Content = await readAsStringAsync(uri, {
        encoding: 'base64',
      });
      
      const binaryString = atob(base64Content);
      
      let extractedText = '';
      const textBlocks: string[] = [];
      
      // Strategy 1: Extract text between BT (Begin Text) and ET (End Text) operators
      const btEtPattern = /BT\s+([\s\S]*?)\s+ET/g;
      let match;
      
      while ((match = btEtPattern.exec(binaryString)) !== null) {
        const textBlock = match[1];
        
        // Extract text from Tj operators: (text) Tj
        const tjPattern = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
        let tjMatch;
        
        while ((tjMatch = tjPattern.exec(textBlock)) !== null) {
          const text = this.decodePDFString(tjMatch[1]);
          if (text.trim()) {
            textBlocks.push(text);
          }
        }
        
        // Extract text from TJ operators: [(text)] TJ
        const tjArrayPattern = /\[\s*((?:\([^)]*\)\s*)+)\]\s*TJ/g;
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
      
      // Strategy 2: Fallback to simple text extraction
      if (!extractedText || extractedText.length < 100) {
        console.log('[PDF Import] Using fallback text extraction...');
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
      
      console.log(`[PDF Import] Extracted ${extractedText.length} characters from PDF`);
      
      parseLog.push({
        rowIndex: -1,
        level: 'info',
        message: `Stage A: Extracted ${extractedText.length} characters from text layer`,
      });
      
      return extractedText;
    } catch (error) {
      console.error('[PDF Import] Error extracting text from PDF:', error);
      parseLog.push({
        rowIndex: -1,
        level: 'error',
        message: `Stage A failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return '';
    }
  },

  /**
   * Decode PDF string (handle escape sequences)
   */
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

  /**
   * Strip headers and footers from text
   */
  stripHeadersFooters(lines: string[]): string[] {
    return lines.filter(line => {
      const lower = line.toLowerCase().trim();
      
      // Skip empty lines
      if (!lower) return false;
      
      // Skip header keywords
      if (HEADER_KEYWORDS.some(kw => lower === kw || lower.includes(kw + ' |'))) {
        return false;
      }
      
      // Skip separator lines
      if (/^[-=_|+\s]+$/.test(line)) {
        return false;
      }
      
      // Skip page numbers
      if (/^page\s+\d+/i.test(lower)) {
        return false;
      }
      
      return true;
    });
  },

  /**
   * Merge multi-line cells (descriptions that wrap)
   */
  mergeMultiLineCells(lines: string[]): string[] {
    const merged: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line starts with WIP number (new row)
      if (/^\d{5}\b/.test(line)) {
        if (currentLine) {
          merged.push(currentLine);
        }
        currentLine = line;
      } else if (currentLine) {
        // Continuation of previous line
        currentLine += ' ' + line;
      } else {
        // Orphan line, skip
        continue;
      }
    }
    
    if (currentLine) {
      merged.push(currentLine);
    }
    
    return merged;
  },

  /**
   * Parse table rows from extracted text
   */
  parseTableRows(text: string, parseLog: ParseLogEntry[]): string[] {
    console.log('[PDF Import] Parsing table rows...');
    
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
    
    // Strip headers and footers
    const cleanedLines = this.stripHeadersFooters(lines);
    
    // Merge multi-line cells
    const mergedLines = this.mergeMultiLineCells(cleanedLines);
    
    // Filter for lines with WIP numbers
    const rows = mergedLines.filter(line => /\b\d{5}\b/.test(line));
    
    parseLog.push({
      rowIndex: -1,
      level: 'info',
      message: `Found ${rows.length} potential data rows after cleaning`,
    });
    
    console.log(`[PDF Import] Found ${rows.length} data rows`);
    
    return rows;
  },

  /**
   * Extract field from row text using column position hints
   */
  extractField(rowText: string, fieldName: string): string {
    // This is a simplified extraction - in production, you'd use column positions
    const parts = rowText.split(/\s+/);
    
    switch (fieldName) {
      case 'wipNumber':
        const wipMatch = rowText.match(/\b(\d{5})\b/);
        return wipMatch ? wipMatch[1] : '';
      
      case 'vehicleReg':
        for (const part of parts) {
          const validation = this.validateUKPlate(part);
          if (validation.valid) {
            return part.toUpperCase().replace(/\s/g, '');
          }
        }
        return '';
      
      case 'vhcStatus':
        const vhcKeywords = ['red', 'orange', 'amber', 'green'];
        for (const part of parts) {
          const lower = part.toLowerCase();
          if (vhcKeywords.includes(lower)) {
            return this.normalizeVHCStatus(lower);
          }
        }
        return 'N/A';
      
      case 'aws':
        for (const part of parts) {
          if (/^\d{1,3}$/.test(part)) {
            const val = parseInt(part);
            if (val >= 1 && val <= 100) {
              return part;
            }
          }
        }
        return '0';
      
      case 'workTime':
        const timeMatch = rowText.match(/(\d+h\s*\d+m|\d+:\d+|\d+m|\d+h)/i);
        return timeMatch ? timeMatch[0] : '';
      
      case 'jobDate':
        const dateMatch = rowText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        return dateMatch ? dateMatch[0] : '';
      
      case 'jobTime':
        const timeOnlyMatch = rowText.match(/\b(\d{2}):(\d{2})\b/);
        return timeOnlyMatch ? timeOnlyMatch[0] : '';
      
      default:
        return '';
    }
  },

  /**
   * Parse a single row into structured data
   */
  parseRow(
    rowText: string,
    rowIndex: number,
    existingJobs: Job[],
    parseLog: ParseLogEntry[]
  ): ParsedJobRow | null {
    try {
      let confidence = 1.0;
      const validationErrors: string[] = [];
      
      // Extract WIP number
      const wipNumber = this.extractField(rowText, 'wipNumber');
      if (!wipNumber) {
        parseLog.push({
          rowIndex,
          level: 'warning',
          message: 'No WIP number found',
          rawData: rowText,
        });
        confidence *= 0.5;
        validationErrors.push('No WIP number found');
      }
      
      // Extract vehicle registration
      let vehicleReg = this.extractField(rowText, 'vehicleReg');
      let regConfidence = 0;
      
      if (vehicleReg) {
        const validation = this.validateUKPlate(vehicleReg);
        regConfidence = validation.confidence;
        if (!validation.valid) {
          validationErrors.push('Invalid UK registration format');
          confidence *= 0.6;
        } else if (regConfidence < 1.0) {
          validationErrors.push('Registration format uncertain');
          confidence *= 0.8;
        }
      } else {
        validationErrors.push('No vehicle registration found');
        confidence *= 0.5;
      }
      
      // Extract VHC status
      const vhcStatus = this.extractField(rowText, 'vhcStatus') as 'Red' | 'Orange' | 'Green' | 'N/A';
      
      // Extract AWS
      const awsStr = this.extractField(rowText, 'aws');
      const aws = parseInt(awsStr) || 0;
      
      if (aws === 0) {
        validationErrors.push('No valid AWS value found');
        confidence *= 0.6;
      }
      
      // Extract work time
      let workTime = this.extractField(rowText, 'workTime');
      let minutes = 0;
      
      if (workTime) {
        minutes = this.parseWorkTime(workTime);
      } else {
        // Fallback: calculate from AWS
        minutes = aws * 5;
        workTime = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
      }
      
      // Extract date
      let jobDate = this.extractField(rowText, 'jobDate');
      if (!jobDate) {
        jobDate = new Date().toLocaleDateString('en-GB');
        validationErrors.push('No date found, using current date');
        confidence *= 0.7;
      }
      
      // Extract time
      let jobTime = this.extractField(rowText, 'jobTime');
      if (!jobTime) {
        jobTime = '09:00';
        validationErrors.push('No time found, using 09:00');
        confidence *= 0.8;
      }
      
      // Extract job description
      let jobDescription = '';
      
      // Find text between vehicle reg and AWS
      const regIndex = rowText.indexOf(vehicleReg);
      const awsIndex = rowText.indexOf(awsStr, regIndex);
      
      if (regIndex >= 0 && awsIndex > regIndex) {
        jobDescription = rowText.substring(regIndex + vehicleReg.length, awsIndex).trim();
        jobDescription = this.applyOCRCorrections(jobDescription);
        jobDescription = jobDescription.replace(/\s+/g, ' ').trim();
      }
      
      // Parse startedAt
      const startedAt = this.parseDateTime(jobDate, jobTime);
      
      // Determine action (Create/Update/Skip)
      let action: 'Create' | 'Update' | 'Skip' = 'Create';
      let existingJobId: string | undefined;
      
      // Check for duplicates by WIP number
      if (wipNumber) {
        const wipMatch = existingJobs.find(j => j.wipNumber === wipNumber);
        if (wipMatch) {
          action = 'Update';
          existingJobId = wipMatch.id;
        }
      }
      
      // Check for duplicates by vehicleReg + startedAt ± 1 day + aws
      if (action === 'Create' && vehicleReg && aws > 0) {
        const startDate = new Date(startedAt);
        const dayBefore = new Date(startDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dayAfter = new Date(startDate);
        dayAfter.setDate(dayAfter.getDate() + 1);
        
        const similarJob = existingJobs.find(j => {
          const jobDate2 = new Date(j.startedAt || j.dateCreated);
          return (
            j.vehicleRegistration === vehicleReg &&
            j.awValue === aws &&
            jobDate2 >= dayBefore &&
            jobDate2 <= dayAfter
          );
        });
        
        if (similarJob) {
          action = 'Update';
          existingJobId = similarJob.id;
        }
      }
      
      const parsedRow: ParsedJobRow = {
        id: `temp-${rowIndex}-${Date.now()}`,
        wipNumber,
        vehicleReg,
        vhcStatus,
        jobDescription,
        aws,
        minutes,
        workTime,
        jobDate,
        jobTime,
        startedAt,
        confidence,
        action,
        existingJobId,
        rawRow: rowText,
        validationErrors,
      };
      
      parseLog.push({
        rowIndex,
        level: confidence < 0.7 ? 'warning' : 'info',
        message: `Parsed row: WIP ${wipNumber}, Reg ${vehicleReg}, AWS ${aws}, Confidence ${(confidence * 100).toFixed(0)}%`,
      });
      
      return parsedRow;
    } catch (error) {
      parseLog.push({
        rowIndex,
        level: 'error',
        message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rawData: rowText,
      });
      return null;
    }
  },

  /**
   * Calculate overall confidence for the import
   */
  calculateOverallConfidence(rows: ParsedJobRow[]): number {
    if (rows.length === 0) return 0;
    
    const avgConfidence = rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length;
    return avgConfidence;
  },

  /**
   * Import and parse PDF file with multi-stage pipeline
   */
  async importFromPDF(
    uri: string,
    filename: string,
    existingJobs: Job[],
    onProgress?: (progress: PDFImportProgress) => void
  ): Promise<PDFImportResult> {
    const parseLog: ParseLogEntry[] = [];
    
    try {
      console.log('[PDF Import] Starting import pipeline for:', filename);
      
      // Calculate file hash
      onProgress?.({
        status: 'parsing',
        currentRow: 0,
        totalRows: 0,
        message: 'Calculating file hash...',
      });
      
      const hash = await this.calculateFileHash(uri);
      
      parseLog.push({
        rowIndex: -1,
        level: 'info',
        message: `File hash: ${hash.substring(0, 16)}...`,
      });
      
      // Stage A: Extract text from PDF
      onProgress?.({
        status: 'parsing',
        currentRow: 0,
        totalRows: 0,
        message: 'Stage A: Extracting text layer...',
      });
      
      const text = await this.extractTextFromPDF(uri, parseLog);
      
      if (!text || text.length < 50) {
        parseLog.push({
          rowIndex: -1,
          level: 'warning',
          message: 'Insufficient text extracted. PDF may be image-based or encrypted.',
        });
        
        // In production, you would fall back to Stage B (OCR) here
        // For now, we'll return an error with the parse log
        return {
          success: false,
          rows: [],
          filename,
          hash,
          parseLog,
          summary: {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            duplicates: 0,
          },
        };
      }
      
      // Detect layout
      const layout = this.detectPDFLayout(text);
      parseLog.push({
        rowIndex: -1,
        level: 'info',
        message: `Layout detected: ${layout.isScanned ? 'Scanned' : 'Text-based'}, density: ${(layout.textDensity * 100).toFixed(1)}%`,
      });
      
      // Parse table rows
      onProgress?.({
        status: 'parsing',
        currentRow: 0,
        totalRows: 0,
        message: 'Identifying table rows...',
      });
      
      const rawRows = this.parseTableRows(text, parseLog);
      
      if (rawRows.length === 0) {
        parseLog.push({
          rowIndex: -1,
          level: 'error',
          message: 'No data rows found in PDF. Please check the file format.',
        });
        
        return {
          success: false,
          rows: [],
          filename,
          hash,
          parseLog,
          summary: {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            duplicates: 0,
          },
        };
      }
      
      // Parse each row
      const parsedRows: ParsedJobRow[] = [];
      const totalRows = rawRows.length;
      
      for (let i = 0; i < rawRows.length; i++) {
        onProgress?.({
          status: 'parsing',
          currentRow: i + 1,
          totalRows,
          message: `Parsing row ${i + 1} of ${totalRows}...`,
        });
        
        const parsed = this.parseRow(rawRows[i], i, existingJobs, parseLog);
        if (parsed) {
          parsedRows.push(parsed);
        }
        
        // Yield to UI every 10 rows
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(parsedRows);
      
      parseLog.push({
        rowIndex: -1,
        level: 'info',
        message: `Overall confidence: ${(overallConfidence * 100).toFixed(1)}%`,
      });
      
      // Calculate summary
      const validRows = parsedRows.filter(r => r.validationErrors.length === 0).length;
      const invalidRows = parsedRows.length - validRows;
      const duplicates = parsedRows.filter(r => r.action === 'Update').length;
      
      onProgress?.({
        status: 'preview',
        currentRow: totalRows,
        totalRows,
        message: `Parsing complete. Confidence: ${(overallConfidence * 100).toFixed(0)}%`,
      });
      
      // Always return success with parse log, even if confidence is low
      return {
        success: true,
        rows: parsedRows,
        filename,
        hash,
        parseLog,
        summary: {
          totalRows: rawRows.length,
          validRows,
          invalidRows,
          duplicates,
        },
      };
    } catch (error) {
      console.error('[PDF Import] Error importing PDF:', error);
      
      parseLog.push({
        rowIndex: -1,
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      
      // Always return with parse log, never show "Failed to parse PDF"
      return {
        success: false,
        rows: [],
        filename,
        hash: '',
        parseLog,
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          duplicates: 0,
        },
      };
    }
  },

  /**
   * Convert parsed rows to Job objects
   */
  convertRowsToJobs(rows: ParsedJobRow[], filename: string, hash: string): Job[] {
    return rows
      .filter(row => row.action !== 'Skip')
      .map(row => {
        const job: Job = {
          id: row.existingJobId || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          wipNumber: row.wipNumber,
          vehicleRegistration: row.vehicleReg,
          vhcStatus: row.vhcStatus,
          jobDescription: row.jobDescription,
          notes: row.jobDescription,
          awValue: row.aws,
          timeInMinutes: row.minutes,
          startedAt: row.startedAt,
          dateCreated: row.startedAt,
          source: {
            type: 'pdf',
            filename,
            importedAt: new Date().toISOString(),
            hash,
            rawRow: row.rawRow,
          },
        };
        
        return job;
      });
  },

  /**
   * Export parse log as JSON
   */
  async exportParseLog(parseLog: ParseLogEntry[], filename: string): Promise<string> {
    try {
      const logData = {
        filename,
        timestamp: new Date().toISOString(),
        entries: parseLog,
      };
      
      const json = JSON.stringify(logData, null, 2);
      
      // Use documentDirectory with fallback to cacheDirectory
      const baseDir = documentDirectory ?? cacheDirectory;
      if (!baseDir) {
        throw new Error('No writable directory available');
      }
      
      const fileUri = `${baseDir}parse-log-${Date.now()}.json`;
      
      await writeAsStringAsync(fileUri, json, {
        encoding: 'utf8',
      });
      
      return fileUri;
    } catch (error) {
      console.error('[PDF Import] Error exporting parse log:', error);
      throw error;
    }
  },

  /**
   * Export rows as CSV
   */
  async exportRowsCSV(rows: ParsedJobRow[], filename: string): Promise<string> {
    try {
      const headers = [
        'WIP Number',
        'Vehicle Reg',
        'VHC Status',
        'Job Description',
        'AWS',
        'Work Time',
        'Job Date',
        'Job Time',
        'Confidence',
        'Action',
        'Validation Errors',
      ];
      
      const csvRows = rows.map(row => [
        row.wipNumber,
        row.vehicleReg,
        row.vhcStatus,
        row.jobDescription,
        row.aws.toString(),
        row.workTime,
        row.jobDate,
        row.jobTime,
        (row.confidence * 100).toFixed(1) + '%',
        row.action,
        row.validationErrors.join('; '),
      ]);
      
      const csv = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
      
      // Use documentDirectory with fallback to cacheDirectory
      const baseDir = documentDirectory ?? cacheDirectory;
      if (!baseDir) {
        throw new Error('No writable directory available');
      }
      
      const fileUri = `${baseDir}import-rows-${Date.now()}.csv`;
      
      await writeAsStringAsync(fileUri, csv, {
        encoding: 'utf8',
      });
      
      return fileUri;
    } catch (error) {
      console.error('[PDF Import] Error exporting rows CSV:', error);
      throw error;
    }
  },
};
