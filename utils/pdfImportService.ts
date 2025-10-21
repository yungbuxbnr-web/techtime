
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

  // Note: Full PDF parsing requires additional libraries that may not work well in React Native
  // For now, we'll focus on JSON import which is more reliable
  // PDF export is already implemented, but PDF import of structured data is complex
  
  // Import from PDF (placeholder - requires PDF parsing library)
  async importFromPDF(uri: string): Promise<{ success: boolean; data?: BackupData; message?: string }> {
    console.log('PDF import requested for:', uri);
    
    // PDF parsing in React Native is complex and requires additional libraries
    // For now, we'll return a message directing users to use JSON format
    return {
      success: false,
      message: 'PDF import is not yet supported. Please export your data as JSON format for importing.\n\nTo create a JSON backup:\n1. Go to Settings\n2. Tap "Create Local Backup"\n3. The backup will be saved as a JSON file\n4. Use "Import Local Backup" or file picker to restore'
    };
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
