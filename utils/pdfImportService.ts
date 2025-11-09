
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
</write file>

Now I need to update the settings screen to properly handle the PDF import with a preview and confirmation dialog:

<write file="app/settings.tsx">
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { StorageService, pickBackupDir, writeJson, shareFile, pickJsonFile, readJson } from '../utils/storage';
import { BackupService, BackupData } from '../utils/backupService';
import { BiometricService } from '../utils/biometricService';
import { PDFImportService } from '../utils/pdfImportService';
import { CalculationService } from '../utils/calculations';
import { MonthlyResetService } from '../utils/monthlyReset';
import { AppSettings, Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import GoogleDriveBackup from '../components/GoogleDriveBackup';
import GoogleDriveImportTally from '../components/GoogleDriveImportTally';
import SimpleBottomSheet from '../components/BottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import { LocalBackupService } from '../services/backup/local';

export default function SettingsScreen() {
  const { theme, colors, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({ pin: '3101', isAuthenticated: false, targetHours: 180, absenceHours: 0, theme: 'light' });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicianName, setTechnicianName] = useState('');
  const [newTechnicianName, setNewTechnicianName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [targetHours, setTargetHours] = useState('180');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isImportInProgress, setIsImportInProgress] = useState(false);
  const [isShareInProgress, setIsShareInProgress] = useState(false);
  const [isJsonShareInProgress, setIsJsonShareInProgress] = useState(false);
  const [isTestingBackup, setIsTestingBackup] = useState(false);
  const [backupLocation, setBackupLocation] = useState<string>('Loading...');
  const [showGoogleDriveBackup, setShowGoogleDriveBackup] = useState(false);
  const [showImportTally, setShowImportTally] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

  // Import preview modal
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<BackupData | null>(null);

  // Absence logger dropdown states
  const [numberOfAbsentDays, setNumberOfAbsentDays] = useState<number>(1);
  const [absenceType, setAbsenceType] = useState<'half' | 'full'>('full');
  const [deductionType, setDeductionType] = useState<'monthly' | 'available'>('monthly');
  
  // iOS picker modal states
  const [showDaysPicker, setShowDaysPicker] = useState(false);
  const [showAbsenceTypePicker, setShowAbsenceTypePicker] = useState(false);
  const [showDeductionTypePicker, setShowDeductionTypePicker] = useState(false);

  const isDarkMode = theme === 'dark';

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [settingsData, jobsData, name] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getJobs(),
        StorageService.getTechnicianName()
      ]);
      setSettings(settingsData);
      setJobs(jobsData);
      setTechnicianName(name || '');
      setNewTechnicianName(name || '');
      setNewPin(settingsData.pin);
      setConfirmPin(settingsData.pin);
      setTargetHours(String(settingsData.targetHours || 180));
      console.log('Settings and jobs loaded successfully');
    } catch (error) {
      console.log('Error loading data:', error);
      showNotification('Error loading data', 'error');
    }
  }, [showNotification]);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const settingsData = await StorageService.getSettings();
      if (!settingsData.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      
      // Check for monthly reset
      try {
        const resetResult = await MonthlyResetService.checkAndResetIfNewMonth();
        if (resetResult.wasReset) {
          console.log('[Settings] Monthly reset completed:', resetResult);
        }
      } catch (resetError) {
        console.log('[Settings] Error checking monthly reset:', resetError);
        // Don't block loading if reset check fails
      }
      
      await loadData();
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/auth');
    }
  }, [loadData]);

  useEffect(() => {
    checkAuthAndLoadData();
    checkBiometricAvailability();
    loadBackupLocation();
  }, [checkAuthAndLoadData]);

  const loadBackupLocation = async () => {
    try {
      const location = await LocalBackupService.getBackupLocation();
      if (location.success) {
        if (location.type === 'saf') {
          setBackupLocation(`External: ${location.location.substring(0, 50)}...`);
        } else {
          setBackupLocation('Sandbox: Documents/backups/');
        }
      }
    } catch (error) {
      console.log('Error loading backup location:', error);
      setBackupLocation('Unknown');
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await BiometricService.isAvailable();
      setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const types = await BiometricService.getSupportedTypes();
        setBiometricTypes(types);
        console.log('Biometric authentication available:', types);
      }
    } catch (error) {
      console.log('Error checking biometric availability:', error);
    }
  };

  const handleUpdateTechnicianName = useCallback(async () => {
    const trimmedName = newTechnicianName.trim();
    
    if (!trimmedName) {
      showNotification('Please enter your name', 'error');
      return;
    }

    if (trimmedName.length < 2) {
      showNotification('Name must be at least 2 characters', 'error');
      return;
    }

    if (trimmedName.length > 50) {
      showNotification('Name must be less than 50 characters', 'error');
      return;
    }

    try {
      await StorageService.setTechnicianName(trimmedName);
      setTechnicianName(trimmedName);
      showNotification(`Name updated to ${trimmedName}`, 'success');
      console.log('Technician name updated:', trimmedName);
    } catch (error) {
      console.log('Error updating technician name:', error);
      showNotification('Error updating name', 'error');
    }
  }, [newTechnicianName, showNotification]);

  const handleToggleTheme = useCallback(async () => {
    try {
      await toggleTheme();
      const newTheme = theme === 'light' ? 'dark' : 'light';
      showNotification(`Switched to ${newTheme} mode`, 'success');
      console.log('Theme updated to:', newTheme);
    } catch (error) {
      console.log('Error updating theme:', error);
      showNotification('Error updating theme', 'error');
    }
  }, [theme, toggleTheme, showNotification]);

  const handleUpdatePin = useCallback(async () => {
    if (!newPin || newPin.length < 4) {
      showNotification('PIN must be at least 4 digits', 'error');
      return;
    }

    if (newPin !== confirmPin) {
      showNotification('PINs do not match', 'error');
      return;
    }

    try {
      const updatedSettings = { ...settings, pin: newPin };
      await StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      showNotification('PIN updated successfully', 'success');
      console.log('PIN updated successfully');
    } catch (error) {
      console.log('Error updating PIN:', error);
      showNotification('Error updating PIN', 'error');
    }
  }, [newPin, confirmPin, settings, showNotification]);

  const handleUpdateTargetHours = useCallback(async () => {
    const hours = parseFloat(targetHours);
    
    if (isNaN(hours) || hours <= 0) {
      showNotification('Please enter a valid number of hours', 'error');
      return;
    }

    if (hours > 744) {
      showNotification('Target hours cannot exceed 744 hours per month', 'error');
      return;
    }

    try {
      const updatedSettings = { ...settings, targetHours: hours };
      await StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      showNotification(`Monthly target updated to ${hours} hours`, 'success');
      console.log('Target hours updated successfully:', hours);
    } catch (error) {
      console.log('Error updating target hours:', error);
      showNotification('Error updating target hours', 'error');
    }
  }, [targetHours, settings, showNotification]);

  const handleLogAbsence = useCallback(async () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const hoursPerDay = absenceType === 'half' ? 4.25 : 8.5;
    const absenceHours = numberOfAbsentDays * hoursPerDay;
    
    const absenceTypeText = absenceType === 'half' ? 'Half Day' : 'Full Day';
    const dayLabel = numberOfAbsentDays === 1 
      ? `${numberOfAbsentDays} ${absenceTypeText}` 
      : `${numberOfAbsentDays} ${absenceTypeText}s`;
    
    // Check if we need to reset absence hours for a new month
    let currentAbsenceHours = settings.absenceHours || 0;
    if (settings.absenceMonth !== currentMonth || settings.absenceYear !== currentYear) {
      // New month, reset absence hours
      currentAbsenceHours = 0;
      console.log('New month detected, resetting absence hours');
    }
    
    if (deductionType === 'monthly') {
      // Deduct from monthly target hours
      const currentTarget = settings.targetHours || 180;
      const newTargetHours = Math.max(0, currentTarget - absenceHours);
      
      Alert.alert(
        'Log Absence - Monthly Target',
        `This will deduct ${absenceHours.toFixed(2)} hours from your monthly target hours:\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay} hours = ${absenceHours.toFixed(2)} hours\n\n📈 Monthly Target Update:\nCurrent Target: ${currentTarget} hours\nAbsence Deduction: -${absenceHours.toFixed(2)} hours\nNew Monthly Target: ${newTargetHours.toFixed(2)} hours\n\n✅ The monthly target progress circle will update automatically.\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Absence',
            style: 'default',
            onPress: async () => {
              try {
                const updatedSettings = { 
                  ...settings, 
                  targetHours: newTargetHours,
                  absenceMonth: currentMonth,
                  absenceYear: currentYear
                };
                await StorageService.saveSettings(updatedSettings);
                setSettings(updatedSettings);
                setTargetHours(String(newTargetHours));
                showNotification(`Absence logged! New monthly target: ${newTargetHours.toFixed(2)}h`, 'success');
                console.log('Absence logged successfully. New target:', newTargetHours);
              } catch (error) {
                console.log('Error logging absence:', error);
                showNotification('Error logging absence', 'error');
              }
            }
          }
        ]
      );
    } else {
      // Deduct from total available hours (for efficiency calculations)
      const newAbsenceHours = currentAbsenceHours + absenceHours;
      
      Alert.alert(
        'Log Absence - Available Hours',
        `This will deduct ${absenceHours.toFixed(2)} hours from your total available hours (used in efficiency calculations):\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay} hours = ${absenceHours.toFixed(2)} hours\n\n⏰ Available Hours Update:\nCurrent Absence This Month: ${currentAbsenceHours.toFixed(2)} hours\nNew Absence Deduction: +${absenceHours.toFixed(2)} hours\nTotal Absence This Month: ${newAbsenceHours.toFixed(2)} hours\n\n✅ The efficiency circle will update automatically.\n(This will NOT affect your monthly target hours)\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Absence',
            style: 'default',
            onPress: async () => {
              try {
                const updatedSettings = { 
                  ...settings, 
                  absenceHours: newAbsenceHours,
                  absenceMonth: currentMonth,
                  absenceYear: currentYear
                };
                await StorageService.saveSettings(updatedSettings);
                setSettings(updatedSettings);
                showNotification(`Absence logged! Total absence: ${newAbsenceHours.toFixed(2)}h`, 'success');
                console.log('Absence logged successfully. Total absence hours:', newAbsenceHours);
              } catch (error) {
                console.log('Error logging absence:', error);
                showNotification('Error logging absence', 'error');
              }
            }
          }
        ]
      );
    }
  }, [settings, numberOfAbsentDays, absenceType, deductionType, showNotification]);

  const handleSignOut = useCallback(async () => {
    try {
      const updatedSettings = { ...settings, isAuthenticated: false };
      await StorageService.saveSettings(updatedSettings);
      console.log('User signed out');
      router.replace('/auth');
    } catch (error) {
      console.log('Error signing out:', error);
      showNotification('Error signing out', 'error');
    }
  }, [settings, showNotification]);

  const handleClearAllData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all jobs and reset settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              showNotification('All data cleared successfully', 'success');
              console.log('All data cleared');
              setTimeout(() => {
                router.replace('/auth');
              }, 1500);
            } catch (error) {
              console.log('Error clearing data:', error);
              showNotification('Error clearing data', 'error');
            }
          }
        }
      ]
    );
  }, [showNotification]);

  const handleEnsureBackupFolder = useCallback(async () => {
    showNotification('Setting up backup folder...', 'info');

    try {
      const result = await LocalBackupService.setupBackupFolder();
      
      if (result.success) {
        showNotification(result.message, 'success');
        await loadBackupLocation();
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.log('Error setting up backup folder:', error);
      showNotification('Error setting up backup folder', 'error');
    }
  }, [showNotification]);

  const handleClearBackupFolder = useCallback(async () => {
    if (Platform.OS !== 'android') {
      showNotification('This feature is Android-only', 'info');
      return;
    }

    Alert.alert(
      'Clear Backup Folder',
      'This will remove the external backup folder configuration. You can set up a new folder afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await LocalBackupService.clearBackupFolder();
              if (result.success) {
                showNotification(result.message, 'success');
                await loadBackupLocation();
              } else {
                showNotification(result.message, 'error');
              }
            } catch (error) {
              console.log('Error clearing backup folder:', error);
              showNotification('Error clearing backup folder', 'error');
            }
          }
        }
      ]
    );
  }, [showNotification]);

  const handleTestBackup = useCallback(async () => {
    if (isTestingBackup) return;

    setIsTestingBackup(true);
    showNotification('Running backup test...', 'info');

    try {
      const result = await LocalBackupService.testBackup();
      
      if (result.success) {
        showNotification(result.message, 'success');
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.log('Error testing backup:', error);
      showNotification('Unexpected error during backup test', 'error');
    } finally {
      setIsTestingBackup(false);
    }
  }, [isTestingBackup, showNotification]);

  const handleCreateBackup = useCallback(async () => {
    if (isBackupInProgress) return;
    
    setIsBackupInProgress(true);
    showNotification('Creating backup...', 'info');

    try {
      // Get saved directory URI
      const dir = await StorageService.getBackupDirectoryUri();
      
      // Get all app data
      const appData = await StorageService.getAllData();
      
      // Create filename with timestamp
      const timestamp = Date.now();
      const fileName = `techtracer-${timestamp}.json`;
      
      // Write JSON file
      const uri = await writeJson(dir, fileName, appData);
      
      // Share the file
      await shareFile(uri);
      
      showNotification(
        `✅ Backup created successfully!\n\n📄 File: ${fileName}\n📊 Jobs: ${appData.jobs.length}\n⏱️ Total AWs: ${appData.metadata.totalAWs}\n\nThe share sheet has opened. You can save to Drive, Files, or any other app.`,
        'success'
      );
      console.log('Backup created and shared successfully');
    } catch (error) {
      console.log('Error creating backup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('No directory permission')) {
        showNotification(
          '❌ No backup folder selected.\n\nPlease use "Setup Backup Folder" first to select where to save backups.',
          'error'
        );
      } else {
        showNotification(`Error creating backup: ${errorMessage}`, 'error');
      }
    } finally {
      setIsBackupInProgress(false);
    }
  }, [isBackupInProgress, showNotification]);

  const handleImportBackup = useCallback(async () => {
    if (isImportInProgress) return;

    Alert.alert(
      'Import Backup',
      'This will replace all current data with the backup data. Make sure you have a backup file (backup.json) in the Documents/techtrace/ folder.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: async () => {
            setIsImportInProgress(true);
            showNotification('Importing backup...', 'info');

            try {
              const importResult = await BackupService.importBackup();
              
              if (!importResult.success || !importResult.data) {
                showNotification(importResult.message, 'error');
                console.log('Import failed:', importResult.message);
                setIsImportInProgress(false);
                return;
              }

              Alert.alert(
                'Confirm Import',
                `${importResult.message}\n\nThis will replace all current data. Continue?`,
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => setIsImportInProgress(false) },
                  {
                    text: 'Import',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const restoreResult = await BackupService.restoreFromBackup(importResult.data as BackupData);
                        
                        if (restoreResult.success) {
                          showNotification(restoreResult.message, 'success');
                          console.log('Data restored successfully');
                          
                          setTimeout(() => {
                            router.replace('/auth');
                          }, 2000);
                        } else {
                          showNotification(restoreResult.message, 'error');
                          console.log('Restore failed:', restoreResult.message);
                        }
                      } catch (error) {
                        console.log('Error restoring backup:', error);
                        showNotification('Unexpected error restoring backup', 'error');
                      } finally {
                        setIsImportInProgress(false);
                      }
                    }
                  }
                ]
              );
            } catch (error) {
              console.log('Error importing backup:', error);
              showNotification('Unexpected error importing backup', 'error');
              setIsImportInProgress(false);
            }
          }
        }
      ]
    );
  }, [isImportInProgress, showNotification]);

  const handleImportFromFile = useCallback(async () => {
    if (isImportInProgress) return;

    setIsImportInProgress(true);
    showNotification('Opening file picker...', 'info');

    try {
      // Use PDF import service to pick and import file
      const result = await PDFImportService.importFile();
      
      if (!result.success) {
        showNotification(result.message || 'Import cancelled', 'info');
        setIsImportInProgress(false);
        return;
      }

      if (!result.data) {
        showNotification('No data found in file', 'error');
        setIsImportInProgress(false);
        return;
      }

      // Show preview modal
      setImportPreviewData(result.data);
      setShowImportPreview(true);
      setIsImportInProgress(false);
      
    } catch (error) {
      console.log('Error importing file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error importing file: ${errorMessage}`, 'error');
      setIsImportInProgress(false);
    }
  }, [isImportInProgress, showNotification]);

  const handleConfirmImport = useCallback(async () => {
    if (!importPreviewData) return;

    setShowImportPreview(false);
    setIsImportInProgress(true);
    showNotification('Importing data...', 'info');

    try {
      // Import the data
      await StorageService.importJobs(importPreviewData);
      
      const totalAWs = importPreviewData.jobs.reduce((sum, job) => sum + job.awValue, 0);
      const totalTime = importPreviewData.jobs.reduce((sum, job) => sum + job.timeInMinutes, 0);
      const hours = Math.floor(totalTime / 60);
      const minutes = totalTime % 60;
      
      showNotification(
        `✅ Data imported successfully!\n\n📊 Jobs imported: ${importPreviewData.jobs.length}\n⏱️ Total AWs: ${totalAWs}\n🕐 Total time: ${hours}h ${minutes}m\n\n🔐 Please sign in again to access the app.`,
        'success'
      );
      console.log('Data imported successfully');
      
      setTimeout(() => {
        router.replace('/auth');
      }, 2000);
    } catch (error) {
      console.log('Error importing data:', error);
      showNotification('Error importing data', 'error');
    } finally {
      setIsImportInProgress(false);
      setImportPreviewData(null);
    }
  }, [importPreviewData, showNotification]);

  const handleCancelImport = useCallback(() => {
    setShowImportPreview(false);
    setImportPreviewData(null);
    showNotification('Import cancelled', 'info');
  }, [showNotification]);

  const handleShareBackup = useCallback(async () => {
    if (isShareInProgress) return;
    
    setIsShareInProgress(true);
    showNotification('Preparing backup for sharing...', 'info');

    try {
      const result = await BackupService.shareBackup();
      
      if (result.success) {
        showNotification(result.message, 'success');
        console.log('Backup shared successfully');
      } else {
        showNotification(result.message, 'error');
        console.log('Share failed:', result.message);
      }
    } catch (error) {
      console.log('Error sharing backup:', error);
      showNotification('Unexpected error sharing backup', 'error');
    } finally {
      setIsShareInProgress(false);
    }
  }, [isShareInProgress, showNotification]);

  const handleCreateJsonBackup = useCallback(async () => {
    if (isJsonShareInProgress) return;
    
    setIsJsonShareInProgress(true);
    showNotification('Creating JSON backup for sharing...', 'info');

    try {
      const result = await LocalBackupService.createAndShareJsonBackup();
      
      if (result.success) {
        showNotification(result.message, 'success');
        console.log('JSON backup created and shared successfully');
      } else {
        showNotification(result.message, 'error');
        console.log('JSON backup failed:', result.message);
      }
    } catch (error) {
      console.log('Error creating JSON backup:', error);
      showNotification('Unexpected error creating JSON backup', 'error');
    } finally {
      setIsJsonShareInProgress(false);
    }
  }, [isJsonShareInProgress, showNotification]);

  const handleToggleBiometric = useCallback(async () => {
    try {
      if (settings.biometricEnabled) {
        // Disable biometric
        const result = await BiometricService.disableBiometricLogin();
        if (result.success) {
          const updatedSettings = { ...settings, biometricEnabled: false };
          await StorageService.saveSettings(updatedSettings);
          setSettings(updatedSettings);
          showNotification(result.message, 'success');
        } else {
          showNotification(result.message, 'error');
        }
      } else {
        // Enable biometric
        const result = await BiometricService.enableBiometricLogin();
        if (result.success) {
          const updatedSettings = { ...settings, biometricEnabled: true };
          await StorageService.saveSettings(updatedSettings);
          setSettings(updatedSettings);
          showNotification(result.message, 'success');
        } else {
          showNotification(result.message, 'error');
        }
      }
    } catch (error) {
      console.log('Error toggling biometric:', error);
      showNotification('Error updating biometric settings', 'error');
    }
  }, [settings, showNotification]);

  const navigateToExport = useCallback(() => {
    router.push('/export');
  }, []);

  const navigateToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, []);

  const navigateToJobs = useCallback(() => {
    router.push('/jobs');
  }, []);

  const totalJobs = jobs.length;
  const totalAWs = jobs.reduce((sum, job) => sum + job.awValue, 0);
  const totalMinutes = totalAWs * 5;
  const totalTime = CalculationService.formatTime(totalMinutes);

  // Get current month's absence hours
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthAbsenceHours = (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) 
    ? (settings.absenceHours || 0) 
    : 0;

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <View style={styles.header}>
        <Text style={[commonStyles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        
        {/* Technician Name Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Technician Profile</Text>
          <Text style={styles.sectionDescription}>
            Your name appears throughout the app and on exported reports
          </Text>
          
          <Text style={styles.label}>Current Name</Text>
          <View style={styles.currentNameDisplay}>
            <Text style={styles.currentNameText}>{technicianName || 'Not set'}</Text>
          </View>
          
          <Text style={styles.label}>New Name</Text>
          <TextInput
            style={styles.input}
            value={newTechnicianName}
            onChangeText={setNewTechnicianName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={50}
          />
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleUpdateTechnicianName}
          >
            <Text style={styles.buttonText}>🔄 Update Name</Text>
          </TouchableOpacity>
        </View>

        {/* Theme Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Appearance</Text>
          <Text style={styles.sectionDescription}>
            Choose between light and dark theme
          </Text>
          
          <View style={styles.themeToggleContainer}>
            <View style={styles.themeToggleLeft}>
              <Text style={styles.themeToggleLabel}>☀️ Light Mode</Text>
              <Text style={styles.themeToggleSubtext}>
                {isDarkMode ? 'Switch to light theme' : 'Currently active'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDarkMode ? colors.background : colors.background}
            />
            <View style={styles.themeToggleRight}>
              <Text style={styles.themeToggleLabel}>🌙 Dark Mode</Text>
              <Text style={styles.themeToggleSubtext}>
                {isDarkMode ? 'Currently active' : 'Switch to dark theme'}
              </Text>
            </View>
          </View>
        </View>

        {/* Data Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Data Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalJobs}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalAWs}</Text>
              <Text style={styles.statLabel}>Total AWs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalTime}</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
          </View>
        </View>

        {/* Monthly Target Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Monthly Target Hours</Text>
          <Text style={styles.sectionDescription}>
            Set your monthly work hours target. This is used to calculate your progress and utilization percentage.
          </Text>
          
          <Text style={styles.label}>Target Hours per Month</Text>
          <TextInput
            style={styles.input}
            value={targetHours}
            onChangeText={setTargetHours}
            placeholder="Enter target hours (e.g., 180)"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            maxLength={5}
          />
          
          <View style={styles.targetInfo}>
            <Text style={styles.infoText}>
              💡 Current target: {settings.targetHours || 180} hours/month
            </Text>
            <Text style={styles.infoText}>
              📅 This equals {Math.round((settings.targetHours || 180) / 4.33)} hours/week
            </Text>
            <Text style={styles.infoText}>
              ⏰ Or about {Math.round((settings.targetHours || 180) / 22)} hours/day (22 working days)
            </Text>
            {currentMonthAbsenceHours > 0 && (
              <Text style={[styles.infoText, { color: colors.error, fontWeight: '600' }]}>
                🏖️ Total absence this month: {currentMonthAbsenceHours.toFixed(2)} hours
              </Text>
            )}
          </View>
          
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdateTargetHours}>
            <Text style={styles.buttonText}>🔄 Update Target Hours</Text>
          </TouchableOpacity>

          {/* Absence Logger Section */}
          <View style={styles.absenceLoggerSection}>
            <Text style={styles.absenceLoggerTitle}>🏖️ Absence Logger</Text>
            <Text style={styles.absenceLoggerDescription}>
              Log absences to automatically adjust your hours. Choose whether to deduct from monthly target hours or total available hours for efficiency calculations.
            </Text>
            
            {/* Number of Absent Days Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Number of Absent Days</Text>
              {Platform.OS === 'ios' ? (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDaysPicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {numberOfAbsentDays} {numberOfAbsentDays === 1 ? 'day' : 'days'}
                    </Text>
                    <Text style={styles.pickerButtonIcon}>▼</Text>
                  </TouchableOpacity>
                  
                  <Modal
                    visible={showDaysPicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDaysPicker(false)}
                  >
                    <TouchableOpacity 
                      style={styles.modalOverlay}
                      activeOpacity={1}
                      onPress={() => setShowDaysPicker(false)}
                    >
                      <TouchableOpacity 
                        style={styles.modalContent}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                      >
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Number of Days</Text>
                          <TouchableOpacity
                            style={styles.modalDoneButton}
                            onPress={() => setShowDaysPicker(false)}
                          >
                            <Text style={styles.modalDoneText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <Picker
                          selectedValue={numberOfAbsentDays}
                          onValueChange={(itemValue) => setNumberOfAbsentDays(itemValue)}
                          style={styles.iosPicker}
                          itemStyle={styles.iosPickerItem}
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <Picker.Item 
                              key={day} 
                              label={`${day} ${day === 1 ? 'day' : 'days'}`} 
                              value={day}
                            />
                          ))}
                        </Picker>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>
                </>
              ) : (
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={numberOfAbsentDays}
                    onValueChange={(itemValue) => setNumberOfAbsentDays(itemValue)}
                    style={styles.picker}
                    dropdownIconColor={colors.text}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <Picker.Item 
                        key={day} 
                        label={`${day} ${day === 1 ? 'day' : 'days'}`} 
                        value={day}
                        color={colors.text}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            {/* Absence Type Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Absence Type</Text>
              {Platform.OS === 'ios' ? (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowAbsenceTypePicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {absenceType === 'half' ? 'Half Day (4.25 hours)' : 'Full Day (8.5 hours)'}
                    </Text>
                    <Text style={styles.pickerButtonIcon}>▼</Text>
                  </TouchableOpacity>
                  
                  <Modal
                    visible={showAbsenceTypePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAbsenceTypePicker(false)}
                  >
                    <TouchableOpacity 
                      style={styles.modalOverlay}
                      activeOpacity={1}
                      onPress={() => setShowAbsenceTypePicker(false)}
                    >
                      <TouchableOpacity 
                        style={styles.modalContent}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                      >
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Absence Type</Text>
                          <TouchableOpacity
                            style={styles.modalDoneButton}
                            onPress={() => setShowAbsenceTypePicker(false)}
                          >
                            <Text style={styles.modalDoneText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <Picker
                          selectedValue={absenceType}
                          onValueChange={(itemValue) => setAbsenceType(itemValue)}
                          style={styles.iosPicker}
                          itemStyle={styles.iosPickerItem}
                        >
                          <Picker.Item 
                            label="Half Day (4.25 hours)" 
                            value="half"
                          />
                          <Picker.Item 
                            label="Full Day (8.5 hours)" 
                            value="full"
                          />
                        </Picker>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>
                </>
              ) : (
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={absenceType}
                    onValueChange={(itemValue) => setAbsenceType(itemValue)}
                    style={styles.picker}
                    dropdownIconColor={colors.text}
                  >
                    <Picker.Item 
                      label="Half Day (4.25 hours)" 
                      value="half"
                      color={colors.text}
                    />
                    <Picker.Item 
                      label="Full Day (8.5 hours)" 
                      value="full"
                      color={colors.text}
                    />
                  </Picker>
                </View>
              )}
            </View>

            {/* Deduction Type Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Deduction Type</Text>
              {Platform.OS === 'ios' ? (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDeductionTypePicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {deductionType === 'monthly' ? 'Monthly Target Hours' : 'Total Available Hours'}
                    </Text>
                    <Text style={styles.pickerButtonIcon}>▼</Text>
                  </TouchableOpacity>
                  
                  <Modal
                    visible={showDeductionTypePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDeductionTypePicker(false)}
                  >
                    <TouchableOpacity 
                      style={styles.modalOverlay}
                      activeOpacity={1}
                      onPress={() => setShowDeductionTypePicker(false)}
                    >
                      <TouchableOpacity 
                        style={styles.modalContent}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                      >
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Deduction Type</Text>
                          <TouchableOpacity
                            style={styles.modalDoneButton}
                            onPress={() => setShowDeductionTypePicker(false)}
                          >
                            <Text style={styles.modalDoneText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <Picker
                          selectedValue={deductionType}
                          onValueChange={(itemValue) => setDeductionType(itemValue)}
                          style={styles.iosPicker}
                          itemStyle={styles.iosPickerItem}
                        >
                          <Picker.Item 
                            label="Monthly Target Hours" 
                            value="monthly"
                          />
                          <Picker.Item 
                            label="Total Available Hours" 
                            value="available"
                          />
                        </Picker>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>
                </>
              ) : (
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={deductionType}
                    onValueChange={(itemValue) => setDeductionType(itemValue)}
                    style={styles.picker}
                    dropdownIconColor={colors.text}
                  >
                    <Picker.Item 
                      label="Monthly Target Hours" 
                      value="monthly"
                      color={colors.text}
                    />
                    <Picker.Item 
                      label="Total Available Hours" 
                      value="available"
                      color={colors.text}
                    />
                  </Picker>
                </View>
              )}
              <Text style={styles.dropdownHint}>
                {deductionType === 'monthly' 
                  ? '📊 Will reduce your monthly target hours (affects progress circle)' 
                  : '⏰ Will reduce available hours for efficiency calculations (affects efficiency circle)'}
              </Text>
            </View>

            {/* Absence Preview */}
            <View style={styles.absencePreview}>
              <Text style={styles.previewLabel}>📋 Absence Calculation Preview:</Text>
              <Text style={styles.previewText}>
                {numberOfAbsentDays} {numberOfAbsentDays === 1 ? 'day' : 'days'} × {absenceType === 'half' ? '4.25' : '8.5'} hours = {(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours deducted
              </Text>
              <View style={styles.previewCalculation}>
                {deductionType === 'monthly' ? (
                  <>
                    <Text style={styles.previewCalcText}>
                      Current Target: {(settings.targetHours || 180).toFixed(2)} hours
                    </Text>
                    <Text style={styles.previewCalcText}>
                      Absence Deduction: -{(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours
                    </Text>
                    <View style={styles.previewDivider} />
                    <Text style={styles.previewHighlight}>
                      New Monthly Target: {Math.max(0, (settings.targetHours || 180) - (numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5))).toFixed(2)} hours
                    </Text>
                    <Text style={[styles.previewNote, { color: colors.textSecondary }]}>
                      ℹ️ This will affect your monthly target progress circle
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.previewCalcText}>
                      Current Absence This Month: {currentMonthAbsenceHours.toFixed(2)} hours
                    </Text>
                    <Text style={styles.previewCalcText}>
                      New Absence Deduction: +{(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours
                    </Text>
                    <View style={styles.previewDivider} />
                    <Text style={styles.previewHighlight}>
                      Total Absence This Month: {(currentMonthAbsenceHours + (numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5))).toFixed(2)} hours
                    </Text>
                    <Text style={[styles.previewNote, { color: colors.textSecondary }]}>
                      ℹ️ This will affect your efficiency calculations only
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Log Absence Button */}
            <TouchableOpacity 
              style={[styles.button, styles.logAbsenceButton]} 
              onPress={handleLogAbsence}
            >
              <Text style={styles.buttonText}>✅ Log Absence & Update Hours</Text>
            </TouchableOpacity>

            <View style={styles.absenceLoggerInfo}>
              <Text style={styles.infoTitle}>ℹ️ How Absence Logging Works:</Text>
              <Text style={styles.infoText}>
                - Half Day = 4.25 hours deducted
              </Text>
              <Text style={styles.infoText}>
                - Full Day = 8.5 hours deducted
              </Text>
              <Text style={styles.infoText}>
                - Monthly Target Hours: Reduces your monthly target permanently
              </Text>
              <Text style={styles.infoText}>
                - Total Available Hours: Reduces hours for efficiency calculations
              </Text>
              <Text style={styles.infoText}>
                - Progress circles update automatically based on deduction type
              </Text>
              <Text style={styles.infoText}>
                - Absence hours reset automatically each new month
              </Text>
              <Text style={styles.infoText}>
                - Example: 2 full days absent = 17h deducted from selected type
              </Text>
            </View>
          </View>
        </View>

        {/* Backup & Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup & Import</Text>
          <Text style={styles.sectionDescription}>
            Create backups for device migration and restore data from previous backups.
          </Text>

          {/* Current Backup Location */}
          <View style={styles.backupLocationBox}>
            <Text style={styles.backupLocationLabel}>📍 Current Backup Location:</Text>
            <Text style={styles.backupLocationText}>{backupLocation}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.googleDriveButton]}
            onPress={() => setShowGoogleDriveBackup(true)}
          >
            <Text style={styles.buttonText}>☁️ Google Drive Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.tallyButton]}
            onPress={() => setShowImportTally(true)}
          >
            <Text style={styles.buttonText}>📊 Import & Tally from Google Drive</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.setupButton]}
            onPress={handleEnsureBackupFolder}
          >
            <Text style={styles.buttonText}>📁 Setup Backup Folder</Text>
          </TouchableOpacity>

          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClearBackupFolder}
            >
              <Text style={styles.buttonText}>🗑️ Clear Backup Folder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.testButton, isTestingBackup && styles.buttonDisabled]}
            onPress={handleTestBackup}
            disabled={isTestingBackup}
          >
            <Text style={styles.buttonText}>
              {isTestingBackup ? '⏳ Testing...' : '🧪 Test Backup'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.backupButton, isBackupInProgress && styles.buttonDisabled]}
            onPress={handleCreateBackup}
            disabled={isBackupInProgress}
          >
            <Text style={styles.buttonText}>
              {isBackupInProgress ? '⏳ Creating Backup...' : '📤 Create Local Backup'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.importButton, isImportInProgress && styles.buttonDisabled]}
            onPress={handleImportBackup}
            disabled={isImportInProgress}
          >
            <Text style={styles.buttonText}>
              {isImportInProgress ? '⏳ Importing...' : '📥 Import Local Backup'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.filePickerButton, isImportInProgress && styles.buttonDisabled]}
            onPress={handleImportFromFile}
            disabled={isImportInProgress}
          >
            <Text style={styles.buttonText}>
              {isImportInProgress ? '⏳ Importing...' : '📂 Import from File (JSON/PDF)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.shareButton, isShareInProgress && styles.buttonDisabled]}
            onPress={handleShareBackup}
            disabled={isShareInProgress}
          >
            <Text style={styles.buttonText}>
              {isShareInProgress ? '⏳ Preparing...' : '📤 Share Backup (App-to-App)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.jsonBackupButton, isJsonShareInProgress && styles.buttonDisabled]}
            onPress={handleCreateJsonBackup}
            disabled={isJsonShareInProgress}
          >
            <Text style={styles.buttonText}>
              {isJsonShareInProgress ? '⏳ Creating...' : '📋 Create JSON Backup for Sharing'}
            </Text>
          </TouchableOpacity>

          <View style={styles.backupInfo}>
            <Text style={styles.infoTitle}>📁 Backup & Import Information</Text>
            <Text style={styles.infoText}>
              - Local backups: Sandbox (Documents/backups/)
            </Text>
            {Platform.OS === 'android' && (
              <Text style={styles.infoText}>
                - Android SAF: Optional external folder export
              </Text>
            )}
            <Text style={styles.infoText}>
              - Google Drive: Cloud backup & restore with OAuth
            </Text>
            <Text style={styles.infoText}>
              - Import & Tally: Analyze backup data with detailed statistics
            </Text>
            <Text style={styles.infoText}>
              - Import from File: Pick JSON/PDF backup files from anywhere
            </Text>
            <Text style={styles.infoText}>
              - PDF Import: Extracts WIP, Reg, AWS, Time, Date & Description
            </Text>
            <Text style={styles.infoText}>
              - Share Backup: Transfer to another device via any sharing method
            </Text>
            <Text style={styles.infoText}>
              - Create JSON Backup: Quick JSON export for sharing to any app
            </Text>
            <Text style={styles.infoText}>
              - Test Backup: Verify backup system is working correctly
            </Text>
            <Text style={styles.infoText}>
              - Schema Validation: All backups are validated before import
            </Text>
            <Text style={styles.infoText}>
              - Conflict Resolution: Newer data wins during merge
            </Text>
            <Text style={styles.infoText}>
              - UTF-8 Encoding: All backups use UTF-8 for compatibility
            </Text>
          </View>
        </View>

        {/* Metrics & Formulas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📐 Metrics & Formulas</Text>
          <Text style={styles.sectionDescription}>
            Customize the calculation formulas used throughout the app for AWs, efficiency, and performance metrics.
          </Text>
          <TouchableOpacity style={[styles.button, styles.metricsButton]} onPress={() => router.push('/metrics')}>
            <Text style={styles.buttonText}>⚙️ Edit Formulas</Text>
          </TouchableOpacity>
        </View>

        {/* PIN Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Security Settings</Text>
          <Text style={styles.label}>New PIN</Text>
          <TextInput
            style={styles.input}
            value={newPin}
            onChangeText={setNewPin}
            placeholder="Enter new PIN"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <Text style={styles.label}>Confirm PIN</Text>
          <TextInput
            style={styles.input}
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="Confirm new PIN"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdatePin}>
            <Text style={styles.buttonText}>🔄 Update PIN</Text>
          </TouchableOpacity>

          {/* Biometric Authentication */}
          {biometricAvailable && (
            <View style={styles.biometricSection}>
              <View style={styles.biometricHeader}>
                <View style={styles.biometricInfo}>
                  <Text style={styles.biometricTitle}>
                    {biometricTypes.includes('Face ID') ? '👤' : '👆'} Biometric Login
                  </Text>
                  <Text style={styles.biometricSubtext}>
                    {biometricTypes.join(' or ')} available
                  </Text>
                </View>
                <Switch
                  value={settings.biometricEnabled || false}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={settings.biometricEnabled ? colors.background : colors.background}
                />
              </View>
              <Text style={styles.biometricDescription}>
                Enable biometric authentication for quick and secure access to the app. You can still use your PIN as a fallback.
              </Text>
            </View>
          )}
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Export Data</Text>
          <Text style={styles.sectionDescription}>
            Generate professional PDF reports of your job records.
          </Text>
          <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={navigateToExport}>
            <Text style={styles.buttonText}>📊 Export Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
          
          <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearAllData}>
            <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Help & Support</Text>
          <Text style={styles.sectionDescription}>
            Access the complete user guide with detailed instructions on how to use every feature of the app. Export the guide as PDF for offline reference or sharing.
          </Text>
          <TouchableOpacity style={[styles.button, styles.helpButton]} onPress={() => router.push('/help')}>
            <Text style={styles.buttonText}>📖 Open User Guide</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          <Text style={styles.aboutText}>
            Technician Records App v1.0.0
          </Text>
          <Text style={styles.aboutText}>
            Professional job tracking for vehicle technicians
          </Text>
          <Text style={styles.aboutText}>
            GDPR Compliant • Secure • Reliable
          </Text>
          <Text style={styles.signature}>
            ✍️ Digitally signed by {technicianName || 'Technician'}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={navigateToDashboard}>
          <Text style={styles.navButtonText}>🏠 Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToJobs}>
          <Text style={styles.navButtonText}>📋 Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
          <Text style={[styles.navButtonText, styles.activeNavButtonText]}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Import Preview Modal */}
      <Modal
        visible={showImportPreview}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelImport}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalContent}>
            <ScrollView style={styles.previewModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.previewModalTitle}>📋 Import Preview</Text>
              
              {importPreviewData && (
                <>
                  <View style={styles.previewSummary}>
                    <Text style={styles.previewSummaryTitle}>📊 Summary</Text>
                    <Text style={styles.previewSummaryText}>
                      Jobs: {importPreviewData.jobs.length}
                    </Text>
                    <Text style={styles.previewSummaryText}>
                      Total AWs: {importPreviewData.metadata.totalAWs}
                    </Text>
                    <Text style={styles.previewSummaryText}>
                      Total Time: {CalculationService.formatTime(importPreviewData.metadata.totalTime || 0)}
                    </Text>
                  </View>

                  <View style={styles.previewJobsList}>
                    <Text style={styles.previewJobsTitle}>📝 Jobs to Import (First 10)</Text>
                    {importPreviewData.jobs.slice(0, 10).map((job, index) => (
                      <View key={job.id} style={styles.previewJobItem}>
                        <Text style={styles.previewJobNumber}>#{index + 1}</Text>
                        <View style={styles.previewJobDetails}>
                          <Text style={styles.previewJobText}>
                            WIP: {job.wipNumber} | Reg: {job.vehicleRegistration}
                          </Text>
                          <Text style={styles.previewJobText}>
                            AWs: {job.awValue} | Time: {CalculationService.formatTime(job.timeInMinutes)}
                          </Text>
                          {job.notes && (
                            <Text style={styles.previewJobNotes} numberOfLines={2}>
                              {job.notes}
                            </Text>
                          )}
                          <Text style={styles.previewJobDate}>
                            {new Date(job.dateCreated).toLocaleDateString()} {new Date(job.dateCreated).toLocaleTimeString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {importPreviewData.jobs.length > 10 && (
                      <Text style={styles.previewMoreJobs}>
                        ... and {importPreviewData.jobs.length - 10} more jobs
                      </Text>
                    )}
                  </View>

                  <View style={styles.previewWarning}>
                    <Text style={styles.previewWarningText}>
                      ⚠️ This will replace all current data with the imported data. Make sure to create a backup first if needed.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.previewModalButtons}>
              <TouchableOpacity
                style={[styles.previewModalButton, styles.previewCancelButton]}
                onPress={handleCancelImport}
              >
                <Text style={styles.previewModalButtonText}>❌ Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewModalButton, styles.previewConfirmButton]}
                onPress={handleConfirmImport}
              >
                <Text style={styles.previewModalButtonText}>✅ Confirm Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Google Drive Backup Bottom Sheet */}
      <SimpleBottomSheet
        isVisible={showGoogleDriveBackup}
        onClose={() => setShowGoogleDriveBackup(false)}
      >
        <GoogleDriveBackup onClose={() => setShowGoogleDriveBackup(false)} />
      </SimpleBottomSheet>

      {/* Import & Tally Bottom Sheet */}
      <SimpleBottomSheet
        isVisible={showImportTally}
        onClose={() => setShowImportTally(false)}
      >
        <GoogleDriveImportTally onClose={() => setShowImportTally(false)} />
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeToggleLeft: {
    flex: 1,
  },
  themeToggleRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  themeToggleSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: 16,
  },
  currentNameDisplay: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  targetInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  absenceLoggerSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  absenceLoggerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  absenceLoggerDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: colors.text,
  },
  pickerButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  pickerButtonIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  iosPicker: {
    width: '100%',
    height: 216,
  },
  iosPickerItem: {
    fontSize: 18,
    height: 216,
    color: colors.text,
  },
  dropdownHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  absencePreview: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  previewCalculation: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  previewCalcText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  previewHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  previewNote: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  logAbsenceButton: {
    backgroundColor: '#e74c3c',
    marginBottom: 16,
  },
  absenceLoggerInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  googleDriveButton: {
    backgroundColor: '#4285f4',
  },
  tallyButton: {
    backgroundColor: '#9c27b0',
  },
  setupButton: {
    backgroundColor: '#ff9800',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  testButton: {
    backgroundColor: '#9c27b0',
  },
  backupButton: {
    backgroundColor: '#34a853',
  },
  backupLocationBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  backupLocationText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  importButton: {
    backgroundColor: '#6c757d',
  },
  filePickerButton: {
    backgroundColor: '#17a2b8',
  },
  shareButton: {
    backgroundColor: '#28a745',
  },
  jsonBackupButton: {
    backgroundColor: '#20c997',
  },
  metricsButton: {
    backgroundColor: '#6f42c1',
  },
  exportButton: {
    backgroundColor: colors.primary,
  },
  helpButton: {
    backgroundColor: '#9c27b0',
  },
  signOutButton: {
    backgroundColor: '#ff9800',
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  biometricSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  biometricInfo: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  biometricSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  biometricDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backupInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  signature: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  activeNavButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewModalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  previewModalScroll: {
    maxHeight: '100%',
  },
  previewModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewSummary: {
    padding: 20,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  previewSummaryText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 6,
  },
  previewJobsList: {
    padding: 20,
  },
  previewJobsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  previewJobItem: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewJobNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 12,
    minWidth: 30,
  },
  previewJobDetails: {
    flex: 1,
  },
  previewJobText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  previewJobNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  previewJobDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  previewMoreJobs: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  previewWarning: {
    padding: 20,
    backgroundColor: colors.error + '20',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  previewWarningText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 20,
  },
  previewModalButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  previewModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCancelButton: {
    backgroundColor: colors.textSecondary,
  },
  previewConfirmButton: {
    backgroundColor: colors.primary,
  },
  previewModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
