
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupData } from '../../utils/backupService';
import { StorageService } from '../../utils/storage';
import { Job } from '../../types';

const BACKUP_FOLDER = 'backups';
const SAF_URI_KEY = 'saf_backup_uri';

// Storage Access Framework (Android only)
const SAF = Platform.OS === 'android' ? FileSystem.StorageAccessFramework : null;

export interface LocalBackupResult {
  success: boolean;
  message: string;
  filePath?: string;
  pdfPath?: string;
}

export const LocalBackupService = {
  /**
   * Setup backup folder - Android uses SAF, iOS uses documentDirectory
   */
  async setupBackupFolder(): Promise<{ success: boolean; message: string; uri?: string }> {
    try {
      if (Platform.OS === 'android' && SAF) {
        console.log('[Android] Requesting SAF directory permissions...');
        
        const permissions = await SAF.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          return {
            success: false,
            message: 'Permission denied. Please grant folder access to create backups.'
          };
        }
        
        const uri = permissions.directoryUri;
        if (uri) {
          await AsyncStorage.setItem(SAF_URI_KEY, uri);
          console.log('[Android] SAF URI saved:', uri);
          
          return {
            success: true,
            message: '✅ Backup folder configured!\n\nYou can now create backups to your selected folder.',
            uri
          };
        }
        
        return {
          success: false,
          message: 'Failed to get folder URI. Please try again.'
        };
      } else {
        // iOS: Show info sheet
        console.log('[iOS] Showing backup folder info...');
        
        return {
          success: true,
          message: '📱 iOS Backup Information\n\niOS doesn\'t allow permanent external folder access. Backups are saved to:\n\n📁 On My iPhone › TechTime › Documents › backups\n\nWhen exporting, you\'ll be prompted to choose a location each time (Files, iCloud Drive, etc.).',
          uri: FileSystem.documentDirectory || undefined
        };
      }
    } catch (error) {
      console.log('Error setting up backup folder:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Get SAF URI (Android only)
   */
  async getSafUri(): Promise<string | null> {
    if (Platform.OS !== 'android') {
      return null;
    }
    
    try {
      return await AsyncStorage.getItem(SAF_URI_KEY);
    } catch (error) {
      console.log('Error getting SAF URI:', error);
      return null;
    }
  },

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory(): Promise<{ success: boolean; path: string | null }> {
    try {
      const baseDir = FileSystem.documentDirectory;
      if (!baseDir) {
        return { success: false, path: null };
      }
      
      const backupDir = `${baseDir}${BACKUP_FOLDER}/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (!dirInfo.exists) {
        console.log('Creating backup directory:', backupDir);
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }
      
      return { success: true, path: backupDir };
    } catch (error) {
      console.log('Error ensuring backup directory:', error);
      return { success: false, path: null };
    }
  },

  /**
   * Generate PDF summary of backup data
   */
  async generatePdfSummary(backupData: BackupData): Promise<string> {
    const { jobs, metadata, timestamp } = backupData;
    
    // Group jobs by month
    const jobsByMonth: { [key: string]: Job[] } = {};
    jobs.forEach(job => {
      const date = new Date(job.dateCreated);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!jobsByMonth[monthKey]) {
        jobsByMonth[monthKey] = [];
      }
      jobsByMonth[monthKey].push(job);
    });
    
    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
          }
          h2 {
            color: #34495e;
            margin-top: 30px;
            border-bottom: 2px solid #95a5a6;
            padding-bottom: 5px;
          }
          .summary {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .summary-item {
            margin: 8px 0;
            font-size: 14px;
          }
          .summary-label {
            font-weight: bold;
            color: #2c3e50;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th {
            background: #3498db;
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 12px;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
            font-size: 11px;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .vhc-green { background: #d4edda; }
          .vhc-orange { background: #fff3cd; }
          .vhc-red { background: #f8d7da; }
          .month-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            border-top: 1px solid #bdc3c7;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <h1>TechTime Backup Summary</h1>
        
        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Backup Date:</span> ${new Date(timestamp).toLocaleString()}
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Jobs:</span> ${metadata.totalJobs}
          </div>
          <div class="summary-item">
            <span class="summary-label">Total AWs:</span> ${metadata.totalAWs}
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Time:</span> ${Math.floor(metadata.totalAWs * 5 / 60)}h ${(metadata.totalAWs * 5) % 60}m
          </div>
          <div class="summary-item">
            <span class="summary-label">App Version:</span> ${metadata.appVersion}
          </div>
        </div>
        
        ${Object.entries(jobsByMonth)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([monthKey, monthJobs]) => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            const monthAWs = monthJobs.reduce((sum, job) => sum + job.awValue, 0);
            const monthTime = monthAWs * 5;
            
            return `
              <div class="month-section">
                <h2>${monthName}</h2>
                <p><strong>${monthJobs.length} jobs</strong> • ${monthAWs} AWs • ${Math.floor(monthTime / 60)}h ${monthTime % 60}m</p>
                
                <table>
                  <thead>
                    <tr>
                      <th>WIP</th>
                      <th>Registration</th>
                      <th>AWs</th>
                      <th>Time</th>
                      <th>VHC</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${monthJobs.map(job => {
                      const time = job.awValue * 5;
                      const vhcClass = job.vhcColor ? `vhc-${job.vhcColor}` : '';
                      const vhcDisplay = job.vhcColor ? job.vhcColor.toUpperCase() : '-';
                      
                      return `
                        <tr class="${vhcClass}">
                          <td>${job.wipNumber}</td>
                          <td>${job.vehicleRegistration}</td>
                          <td>${job.awValue}</td>
                          <td>${Math.floor(time / 60)}h ${time % 60}m</td>
                          <td>${vhcDisplay}</td>
                          <td>${new Date(job.dateCreated).toLocaleDateString()}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}
        
        <div class="footer">
          <p>Generated by TechTime • ${new Date().toLocaleString()}</p>
          <p>Technician Records - Buckston Rugge</p>
        </div>
      </body>
      </html>
    `;
    
    return html;
  },

  /**
   * Create local backup (JSON + PDF)
   */
  async createLocalBackup(): Promise<LocalBackupResult> {
    try {
      console.log('=== CREATING LOCAL BACKUP ===');
      
      // Ensure backup directory exists
      const dirResult = await this.ensureBackupDirectory();
      if (!dirResult.success || !dirResult.path) {
        return {
          success: false,
          message: 'Failed to create backup directory'
        };
      }
      
      // Get all app data
      const jobs = await StorageService.getJobs();
      const settings = await StorageService.getSettings();
      
      const timestamp = new Date().toISOString();
      const timestampForFile = timestamp.replace(/[:.]/g, '-').split('.')[0];
      
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp,
        jobs,
        settings: {
          ...settings,
          isAuthenticated: false
        },
        metadata: {
          totalJobs: jobs.length,
          totalAWs: jobs.reduce((sum, job) => sum + job.awValue, 0),
          exportDate: timestamp,
          appVersion: '1.0.0'
        }
      };
      
      // Create JSON backup
      const jsonFileName = `${timestampForFile}.json`;
      const jsonPath = `${dirResult.path}${jsonFileName}`;
      
      await FileSystem.writeAsStringAsync(
        jsonPath,
        JSON.stringify(backupData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      console.log('✓ JSON backup created:', jsonPath);
      
      // Generate PDF summary
      const pdfHtml = await this.generatePdfSummary(backupData);
      const pdfResult = await Print.printToFileAsync({
        html: pdfHtml,
        base64: false
      });
      
      // Move PDF to backup directory
      const pdfFileName = `${timestampForFile}.pdf`;
      const pdfPath = `${dirResult.path}${pdfFileName}`;
      
      await FileSystem.moveAsync({
        from: pdfResult.uri,
        to: pdfPath
      });
      
      console.log('✓ PDF summary created:', pdfPath);
      
      return {
        success: true,
        message: `✅ Backup created successfully!\n\n📄 JSON: ${jsonFileName}\n📑 PDF: ${pdfFileName}\n📁 Location: ${BACKUP_FOLDER}/\n📊 Jobs: ${jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}`,
        filePath: jsonPath,
        pdfPath
      };
      
    } catch (error) {
      console.log('Error creating local backup:', error);
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Import local backup
   */
  async importLocalBackup(): Promise<{ success: boolean; message: string; data?: BackupData }> {
    try {
      console.log('=== IMPORTING LOCAL BACKUP ===');
      
      let fileUri: string | null = null;
      
      if (Platform.OS === 'android') {
        // Android: Try SAF first, then fallback to DocumentPicker
        const safUri = await this.getSafUri();
        
        if (safUri && SAF) {
          console.log('[Android] Using SAF to pick file...');
          
          try {
            // List files in SAF directory
            const files = await SAF.readDirectoryAsync(safUri);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            if (jsonFiles.length === 0) {
              console.log('[Android] No JSON files in SAF directory, falling back to DocumentPicker');
            } else {
              // For simplicity, use the most recent file
              // In a real implementation, you'd show a picker UI
              const latestFile = jsonFiles.sort().reverse()[0];
              fileUri = `${safUri}/${latestFile}`;
              console.log('[Android] Selected file from SAF:', fileUri);
            }
          } catch (safError) {
            console.log('[Android] SAF error, falling back to DocumentPicker:', safError);
          }
        }
        
        // Fallback to DocumentPicker
        if (!fileUri) {
          console.log('[Android] Using DocumentPicker...');
          const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true
          });
          
          if (!result.canceled && result.assets && result.assets.length > 0) {
            fileUri = result.assets[0].uri;
          }
        }
      } else {
        // iOS: Use DocumentPicker
        console.log('[iOS] Using DocumentPicker...');
        const result = await DocumentPicker.getDocumentAsync({
          type: ['public.json', 'public.plain-text', 'public.data'],
          copyToCacheDirectory: true
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          fileUri = result.assets[0].uri;
        }
      }
      
      if (!fileUri) {
        return {
          success: false,
          message: 'No file selected'
        };
      }
      
      // Read and parse JSON
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      const backupData: BackupData = JSON.parse(content);
      
      // Validate schema
      if (!backupData.version || !backupData.timestamp || !backupData.jobs || !backupData.settings) {
        return {
          success: false,
          message: 'Invalid backup file format. Missing required fields.'
        };
      }
      
      if (!Array.isArray(backupData.jobs)) {
        return {
          success: false,
          message: 'Invalid backup file format. Jobs data is corrupted.'
        };
      }
      
      console.log('✓ Backup file validated');
      
      return {
        success: true,
        message: `✅ Backup loaded successfully!\n\n📊 Jobs: ${backupData.jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n📅 Backup date: ${new Date(backupData.timestamp).toLocaleDateString()}`,
        data: backupData
      };
      
    } catch (error) {
      console.log('Error importing local backup:', error);
      return {
        success: false,
        message: `Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Import from file (JSON/PDF)
   */
  async importFromFile(): Promise<{ success: boolean; message: string; data?: BackupData; isPdf?: boolean }> {
    try {
      console.log('=== IMPORTING FROM FILE ===');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'ios' 
          ? ['public.json', 'public.plain-text', 'com.adobe.pdf', 'public.data']
          : ['application/json', 'application/pdf', 'text/plain', '*/*'],
        copyToCacheDirectory: true
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          message: 'No file selected'
        };
      }
      
      const file = result.assets[0];
      const fileUri = file.uri;
      const fileName = file.name || 'unknown';
      
      console.log('Selected file:', fileName);
      
      // Check if PDF
      if (fileName.toLowerCase().endsWith('.pdf')) {
        console.log('PDF file detected');
        
        // For PDF, just preview/share
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Preview/Share PDF Backup'
          });
        }
        
        return {
          success: true,
          message: '📑 PDF file opened for preview/sharing',
          isPdf: true
        };
      }
      
      // For JSON, import/merge
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      const backupData: BackupData = JSON.parse(content);
      
      // Validate schema
      if (!backupData.jobs || !Array.isArray(backupData.jobs)) {
        return {
          success: false,
          message: 'Invalid JSON format. Missing or invalid jobs data.'
        };
      }
      
      return {
        success: true,
        message: `✅ JSON file loaded successfully!\n\n📊 Jobs: ${backupData.jobs.length}`,
        data: backupData,
        isPdf: false
      };
      
    } catch (error) {
      console.log('Error importing from file:', error);
      return {
        success: false,
        message: `Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Share backup (app-to-app)
   */
  async shareBackup(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== SHARING BACKUP ===');
      
      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        return {
          success: false,
          message: 'Sharing is not available on this device'
        };
      }
      
      // Get backup directory
      const dirResult = await this.ensureBackupDirectory();
      if (!dirResult.success || !dirResult.path) {
        return {
          success: false,
          message: 'Backup directory not found. Please create a backup first.'
        };
      }
      
      // List backup files
      const files = await FileSystem.readDirectoryAsync(dirResult.path);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
      const pdfFiles = files.filter(f => f.endsWith('.pdf')).sort().reverse();
      
      if (jsonFiles.length === 0) {
        return {
          success: false,
          message: 'No backup files found. Please create a backup first.'
        };
      }
      
      // Get latest JSON and PDF
      const latestJson = `${dirResult.path}${jsonFiles[0]}`;
      const latestPdf = pdfFiles.length > 0 ? `${dirResult.path}${pdfFiles[0]}` : null;
      
      // Share JSON
      await Sharing.shareAsync(latestJson, {
        mimeType: 'application/json',
        dialogTitle: 'Share Backup (JSON)',
        UTI: 'public.json'
      });
      
      // Optionally share PDF if available
      if (latestPdf) {
        const sharePdf = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Share PDF Summary?',
            'Would you also like to share the PDF summary?',
            [
              { text: 'No', onPress: () => resolve(false) },
              { text: 'Yes', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (sharePdf) {
          await Sharing.shareAsync(latestPdf, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Backup (PDF)',
            UTI: 'com.adobe.pdf'
          });
        }
      }
      
      return {
        success: true,
        message: '✅ Backup shared successfully!'
      };
      
    } catch (error) {
      console.log('Error sharing backup:', error);
      
      // Check if user cancelled
      if (error instanceof Error && error.message.toLowerCase().includes('cancel')) {
        return {
          success: false,
          message: 'Sharing cancelled'
        };
      }
      
      return {
        success: false,
        message: `Failed to share backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};
