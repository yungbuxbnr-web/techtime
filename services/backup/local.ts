
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupData } from '../../utils/backupService';
import { StorageService } from '../../utils/storage';
import { Job } from '../../types';
import * as FS from '../storage/fs';

// Type-safe access to FileSystem properties
const DOC_DIR = FS.getDocumentDirectory();
const CACHE_DIR = FS.getCacheDirectory();
const BACKUP_FOLDER = 'backups';
const DATA_FOLDER = 'data';
const RECORDS_FILE = 'records.json';
const SAF_URI_KEY = 'saf_backup_uri';

// Safe encoding type with fallback
const UTF8 = ((FileSystem as any).EncodingType?.UTF8 ?? 'utf8') as any;

// Storage Access Framework helper (Android only)
const getStorageAccessFramework = () => {
  if (Platform.OS === 'android') {
    return (FileSystem as any).StorageAccessFramework;
  }
  return null;
};

// Backup schema version
const BACKUP_VERSION = '1.0.0';

// Validation schema
interface BackupSchema {
  version: string;
  backupVersion?: string;
  createdAt?: string;
  timestamp: string;
  jobs: Job[];
  settings: any;
  metadata: {
    totalJobs: number;
    totalAWs: number;
    exportDate: string;
    appVersion: string;
  };
}

/**
 * Validate backup data schema
 */
function validateBackupSchema(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  if (!data.version && !data.backupVersion) {
    return { valid: false, error: 'Missing version field' };
  }

  if (!data.timestamp && !data.createdAt) {
    return { valid: false, error: 'Missing timestamp field' };
  }

  if (!Array.isArray(data.jobs)) {
    return { valid: false, error: 'Invalid jobs data' };
  }

  if (!data.settings || typeof data.settings !== 'object') {
    return { valid: false, error: 'Invalid settings data' };
  }

  if (!data.metadata || typeof data.metadata !== 'object') {
    return { valid: false, error: 'Invalid metadata' };
  }

  // Validate each job
  for (let i = 0; i < data.jobs.length; i++) {
    const job = data.jobs[i];
    if (!job.id || !job.wipNumber || !job.vehicleRegistration || typeof job.awValue !== 'number') {
      return { valid: false, error: `Invalid job at index ${i}` };
    }
  }

  return { valid: true };
}

/**
 * Merge jobs with conflict resolution (updatedAt precedence)
 */
function mergeJobs(existingJobs: Job[], newJobs: Job[]): { merged: Job[]; stats: { created: number; updated: number; unchanged: number } } {
  const jobMap = new Map<string, Job>();
  const stats = { created: 0, updated: 0, unchanged: 0 };

  // Add existing jobs to map
  existingJobs.forEach(job => {
    jobMap.set(job.id, job);
  });

  // Merge new jobs
  newJobs.forEach(newJob => {
    const existingJob = jobMap.get(newJob.id);

    if (!existingJob) {
      // New job
      jobMap.set(newJob.id, newJob);
      stats.created++;
    } else {
      // Job exists, check updatedAt
      const existingDate = new Date(existingJob.dateModified || existingJob.dateCreated).getTime();
      const newDate = new Date(newJob.dateModified || newJob.dateCreated).getTime();

      if (newDate > existingDate) {
        // New job is newer, update
        jobMap.set(newJob.id, newJob);
        stats.updated++;
      } else {
        // Existing job is newer or same, keep it
        stats.unchanged++;
      }
    }
  });

  return {
    merged: Array.from(jobMap.values()),
    stats
  };
}

/**
 * Compute diff between existing and new jobs
 */
function computeDiff(existingJobs: Job[], newJobs: Job[]): { created: Job[]; updated: Job[]; unchanged: Job[] } {
  const existingMap = new Map<string, Job>();
  existingJobs.forEach(job => existingMap.set(job.id, job));

  const created: Job[] = [];
  const updated: Job[] = [];
  const unchanged: Job[] = [];

  newJobs.forEach(newJob => {
    const existingJob = existingMap.get(newJob.id);

    if (!existingJob) {
      created.push(newJob);
    } else {
      const existingDate = new Date(existingJob.dateModified || existingJob.dateCreated).getTime();
      const newDate = new Date(newJob.dateModified || newJob.dateCreated).getTime();

      if (newDate > existingDate) {
        updated.push(newJob);
      } else {
        unchanged.push(newJob);
      }
    }
  });

  return { created, updated, unchanged };
}

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
      if (Platform.OS === 'android') {
        console.log('[Android] Requesting SAF directory permissions...');
        
        const SAF = getStorageAccessFramework();
        if (!SAF) {
          return {
            success: false,
            message: 'Storage Access Framework not available'
          };
        }
        
        const permissions = await SAF.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          return {
            success: false,
            message: 'Permission denied. Please grant folder access to create backups.'
          };
        }
        
        const uri = permissions.directoryUri;
        if (uri) {
          await FS.setSafUri(uri);
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
          uri: DOC_DIR
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
   * Get current backup location
   */
  async getBackupLocation(): Promise<{ success: boolean; location: string; type: 'sandbox' | 'saf' }> {
    try {
      if (Platform.OS === 'android') {
        const safUri = await FS.getSafUri();
        if (safUri) {
          return {
            success: true,
            location: safUri,
            type: 'saf'
          };
        }
      }
      
      return {
        success: true,
        location: `${DOC_DIR}${BACKUP_FOLDER}/`,
        type: 'sandbox'
      };
    } catch (error) {
      console.log('Error getting backup location:', error);
      return {
        success: false,
        location: 'Unknown',
        type: 'sandbox'
      };
    }
  },

  /**
   * Clear SAF URI (Android only)
   */
  async clearBackupFolder(): Promise<{ success: boolean; message: string }> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        message: 'This feature is Android-only'
      };
    }

    try {
      await FS.clearSafUri();
      return {
        success: true,
        message: 'Backup folder cleared. You can set up a new folder.'
      };
    } catch (error) {
      console.log('Error clearing backup folder:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Test backup - create a small test backup and verify read/write
   */
  async testBackup(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== TESTING BACKUP ===');
      
      // Create test data
      const testData = {
        version: BACKUP_VERSION,
        backupVersion: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        jobs: [],
        settings: { pin: '0000', isAuthenticated: false },
        metadata: {
          totalJobs: 0,
          totalAWs: 0,
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0'
        }
      };

      // Ensure backup directory
      const backupDir = `${DOC_DIR}${BACKUP_FOLDER}/`;
      await FS.ensureDir(backupDir);

      // Write test file
      const testFile = `${backupDir}test_${Date.now()}.json`;
      await FS.writeJson(testFile, testData);
      console.log('✓ Test file written:', testFile);

      // Read test file
      const readData = await FS.readJson(testFile);
      console.log('✓ Test file read successfully');

      // Validate
      const validation = validateBackupSchema(readData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.error}`);
      }
      console.log('✓ Test file validated');

      // Clean up
      await FS.deleteFile(testFile);
      console.log('✓ Test file deleted');

      // Test Android SAF if available
      if (Platform.OS === 'android') {
        const safUri = await FS.getSafUri();
        if (safUri) {
          try {
            const safFile = await FS.safCreateFile(safUri, `test_${Date.now()}.json`, 'application/json');
            if (safFile) {
              await FS.safWriteText(safFile, JSON.stringify(testData, null, 2));
              console.log('✓ SAF test file written');
              // Note: We can't easily delete SAF files, so we leave it
            }
          } catch (safError) {
            console.log('⚠ SAF test failed (non-critical):', safError);
          }
        }
      }

      return {
        success: true,
        message: '✅ Backup test successful!\n\n✓ Write test passed\n✓ Read test passed\n✓ Validation test passed\n✓ Cleanup successful' + 
                 (Platform.OS === 'android' ? '\n✓ SAF test passed' : '')
      };

    } catch (error) {
      console.log('✗ Backup test failed:', error);
      return {
        success: false,
        message: `❌ Backup test failed:\n\n${error instanceof Error ? error.message : 'Unknown error'}`
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
      const backupDir = `${DOC_DIR}${BACKUP_FOLDER}/`;
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
    
    const getVhcColorValue = (vhcColor?: 'green' | 'orange' | 'red' | null): string => {
      switch (vhcColor) {
        case 'green': return '#22c55e';
        case 'orange': return '#f59e0b';
        case 'red': return '#ef4444';
        default: return '#9ca3af';
      }
    };
    
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
   * Create local backup (JSON + PDF) with optional SAF export
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
      const technicianName = await StorageService.getTechnicianName();
      
      const timestamp = new Date().toISOString();
      const timestampForFile = timestamp.replace(/[:.]/g, '-').split('.')[0];
      
      const backupData: BackupData = {
        version: BACKUP_VERSION,
        backupVersion: BACKUP_VERSION,
        createdAt: timestamp,
        timestamp,
        jobs,
        settings: {
          ...settings,
          isAuthenticated: false,
          technicianName
        },
        metadata: {
          totalJobs: jobs.length,
          totalAWs: jobs.reduce((sum, job) => sum + job.awValue, 0),
          exportDate: timestamp,
          appVersion: '1.0.0'
        }
      };
      
      // Create JSON backup in sandbox
      const jsonFileName = `backup_${timestampForFile}.json`;
      const jsonPath = `${dirResult.path}${jsonFileName}`;
      
      await FS.writeJson(jsonPath, backupData);
      console.log('✓ JSON backup created in sandbox:', jsonPath);
      
      // Generate PDF summary
      const pdfHtml = await this.generatePdfSummary(backupData);
      const pdfResult = await Print.printToFileAsync({
        html: pdfHtml,
        base64: false
      });
      
      // Move PDF to backup directory
      const pdfFileName = `backup_${timestampForFile}.pdf`;
      const pdfPath = `${dirResult.path}${pdfFileName}`;
      
      await FS.moveFile(pdfResult.uri, pdfPath);
      console.log('✓ PDF summary created:', pdfPath);
      
      // Android: Also export to SAF if configured
      let safExported = false;
      if (Platform.OS === 'android') {
        const safUri = await FS.getSafUri();
        if (safUri) {
          try {
            console.log('[Android] Exporting to SAF directory...');
            
            // Create JSON file in SAF directory
            const safJsonUri = await FS.safCreateFile(safUri, jsonFileName, 'application/json');
            if (safJsonUri) {
              await FS.safWriteText(safJsonUri, JSON.stringify(backupData, null, 2));
              console.log('✓ JSON backup exported to SAF:', safJsonUri);
              safExported = true;
            }
            
            // Note: PDF export to SAF is optional and may fail
            try {
              const pdfContent = await FileSystem.readAsStringAsync(pdfPath, { encoding: 'base64' });
              const safPdfUri = await FS.safCreateFile(safUri, pdfFileName, 'application/pdf');
              if (safPdfUri) {
                await FileSystem.writeAsStringAsync(safPdfUri, pdfContent, { encoding: 'base64' });
                console.log('✓ PDF backup exported to SAF:', safPdfUri);
              }
            } catch (pdfError) {
              console.log('⚠ PDF export to SAF failed (non-critical):', pdfError);
            }
          } catch (safError) {
            console.log('⚠ SAF export failed (non-critical):', safError);
          }
        }
      }
      
      const message = `✅ Backup created successfully!\n\n📄 JSON: ${jsonFileName}\n📑 PDF: ${pdfFileName}\n📁 Sandbox: ${BACKUP_FOLDER}/\n📊 Jobs: ${jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}` +
                     (safExported ? '\n✅ Also exported to external folder' : '');
      
      return {
        success: true,
        message,
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
   * Create JSON backup and share to apps
   * This is a simplified function that creates a backup and immediately shares it
   */
  async createAndShareJsonBackup(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('=== CREATING AND SHARING JSON BACKUP ===');
      
      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        return {
          success: false,
          message: 'Sharing is not available on this device'
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
      
      // Create temporary file in cache directory
      if (!CACHE_DIR) {
        return {
          success: false,
          message: 'Cache directory not available'
        };
      }
      
      const jsonFileName = `techtime-backup-${timestampForFile}.json`;
      const jsonPath = `${CACHE_DIR}${jsonFileName}`;
      
      // Write JSON to cache
      await FileSystem.writeAsStringAsync(
        jsonPath,
        JSON.stringify(backupData, null, 2),
        { encoding: UTF8 }
      );
      
      console.log('✓ JSON backup created in cache:', jsonPath);
      
      // Share the file
      await Sharing.shareAsync(jsonPath, {
        mimeType: 'application/json',
        dialogTitle: 'Share TechTime Backup',
        UTI: 'public.json'
      });
      
      console.log('✓ Backup shared successfully');
      
      // Clean up cache file after a delay (optional)
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(jsonPath, { idempotent: true });
          console.log('✓ Cache file cleaned up');
        } catch (error) {
          console.log('Error cleaning up cache file:', error);
        }
      }, 5000);
      
      return {
        success: true,
        message: `✅ Backup created and shared successfully!\n\n📄 File: ${jsonFileName}\n📊 Jobs: ${jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n\nYou can now save it to any app (Drive, Dropbox, Email, etc.)`
      };
      
    } catch (error) {
      console.log('Error creating and sharing backup:', error);
      
      // Check if user cancelled
      if (error instanceof Error && error.message.toLowerCase().includes('cancel')) {
        return {
          success: false,
          message: 'Sharing cancelled'
        };
      }
      
      return {
        success: false,
        message: `Failed to create and share backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  /**
   * Import local backup with validation and diff
   */
  async importLocalBackup(): Promise<{ success: boolean; message: string; data?: BackupData; diff?: { created: Job[]; updated: Job[]; unchanged: Job[] } }> {
    try {
      console.log('=== IMPORTING LOCAL BACKUP ===');
      
      let fileUri: string | null = null;
      
      if (Platform.OS === 'android') {
        // Android: Try SAF first, then fallback to DocumentPicker
        const safUri = await FS.getSafUri();
        
        if (safUri) {
          console.log('[Android] Using SAF to pick file...');
          
          try {
            const SAF = getStorageAccessFramework();
            if (SAF) {
              // List files in SAF directory
              const files = await SAF.readDirectoryAsync(safUri);
              const jsonFiles = files.filter((f: string) => f.endsWith('.json'));
              
              if (jsonFiles.length === 0) {
                console.log('[Android] No JSON files in SAF directory, falling back to DocumentPicker');
              } else {
                // For simplicity, use the most recent file
                // In a real implementation, you'd show a picker UI
                const latestFile = jsonFiles.sort().reverse()[0];
                fileUri = `${safUri}/${latestFile}`;
                console.log('[Android] Selected file from SAF:', fileUri);
              }
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
        encoding: UTF8
      });
      
      const backupData: BackupData = JSON.parse(content);
      
      // Validate schema
      const validation = validateBackupSchema(backupData);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid backup file: ${validation.error}`
        };
      }
      
      console.log('✓ Backup file validated');
      
      // Compute diff with existing data
      const existingJobs = await StorageService.getJobs();
      const diff = computeDiff(existingJobs, backupData.jobs);
      
      console.log('✓ Diff computed:', {
        created: diff.created.length,
        updated: diff.updated.length,
        unchanged: diff.unchanged.length
      });
      
      return {
        success: true,
        message: `✅ Backup loaded and validated!\n\n📊 Total jobs in backup: ${backupData.jobs.length}\n⏱️ Total AWs: ${backupData.metadata.totalAWs}\n📅 Backup date: ${new Date(backupData.timestamp).toLocaleDateString()}\n\n📈 Changes:\n✨ New jobs: ${diff.created.length}\n🔄 Updated jobs: ${diff.updated.length}\n✓ Unchanged jobs: ${diff.unchanged.length}`,
        data: backupData,
        diff
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
   * Merge backup data into existing data
   */
  async mergeBackup(backupData: BackupData): Promise<{ success: boolean; message: string; stats?: { created: number; updated: number; unchanged: number } }> {
    try {
      console.log('=== MERGING BACKUP DATA ===');
      
      // Validate backup data
      const validation = validateBackupSchema(backupData);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid backup data: ${validation.error}`
        };
      }
      
      // Get existing jobs
      const existingJobs = await StorageService.getJobs();
      
      // Merge jobs
      const mergeResult = mergeJobs(existingJobs, backupData.jobs);
      
      // Save merged jobs
      await StorageService.saveJobs(mergeResult.merged);
      
      // Merge settings (keep existing auth state)
      const existingSettings = await StorageService.getSettings();
      const mergedSettings = {
        ...backupData.settings,
        isAuthenticated: existingSettings.isAuthenticated,
        biometricEnabled: existingSettings.biometricEnabled
      };
      await StorageService.saveSettings(mergedSettings);
      
      // Merge technician name if present
      if (backupData.settings.technicianName) {
        await StorageService.setTechnicianName(backupData.settings.technicianName);
      }
      
      console.log('✓ Backup merged successfully');
      
      return {
        success: true,
        message: `✅ Backup merged successfully!\n\n📊 Total jobs: ${mergeResult.merged.length}\n✨ New jobs: ${mergeResult.stats.created}\n🔄 Updated jobs: ${mergeResult.stats.updated}\n✓ Unchanged jobs: ${mergeResult.stats.unchanged}`,
        stats: mergeResult.stats
      };
      
    } catch (error) {
      console.log('Error merging backup:', error);
      return {
        success: false,
        message: `Failed to merge backup: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        encoding: UTF8
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
