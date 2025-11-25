
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Type definitions
export type FsResult = { success: boolean; message?: string };

// Base paths - using legacy API
const BASE_DIR = FileSystem.documentDirectory + 'techtrace/';
const BACKUP_DIR = BASE_DIR + 'backups/';
const PDF_DIR = BASE_DIR + 'pdfs/';

// Safe encoding type
const UTF8 = FileSystem.EncodingType.UTF8;

/**
 * Ensure all required directories exist
 */
export async function ensureDirectoriesExist(): Promise<FsResult> {
  try {
    console.log('[FileSystem] Ensuring directories exist...');
    
    // Check and create BASE_DIR
    const baseInfo = await FileSystem.getInfoAsync(BASE_DIR);
    if (!baseInfo.exists) {
      console.log('[FileSystem] Creating BASE_DIR:', BASE_DIR);
      await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
    }
    
    // Check and create BACKUP_DIR
    const backupInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!backupInfo.exists) {
      console.log('[FileSystem] Creating BACKUP_DIR:', BACKUP_DIR);
      await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    }
    
    // Check and create PDF_DIR
    const pdfInfo = await FileSystem.getInfoAsync(PDF_DIR);
    if (!pdfInfo.exists) {
      console.log('[FileSystem] Creating PDF_DIR:', PDF_DIR);
      await FileSystem.makeDirectoryAsync(PDF_DIR, { intermediates: true });
    }
    
    console.log('[FileSystem] All directories ready');
    return { success: true, message: 'All directories created successfully' };
  } catch (error: any) {
    console.error('[FileSystem] Error ensuring directories:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to create directories' 
    };
  }
}

/**
 * Write backup file with timestamp
 */
export async function writeBackupFile(content: string): Promise<FsResult & { path?: string }> {
  try {
    console.log('[FileSystem] Writing backup file...');
    
    // Ensure directories exist
    const dirResult = await ensureDirectoriesExist();
    if (!dirResult.success) {
      return { success: false, message: dirResult.message };
    }
    
    // Create timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = BACKUP_DIR + `backup-${timestamp}.json`;
    
    // Write file
    await FileSystem.writeAsStringAsync(path, content, { encoding: UTF8 });
    console.log('[FileSystem] Backup file written:', path);
    
    // Verify file was created
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'Backup file was not created successfully' 
      };
    }
    
    console.log('[FileSystem] Backup file verified, size:', info.size, 'bytes');
    return { 
      success: true, 
      path,
      message: `Backup created successfully (${(info.size / 1024).toFixed(2)} KB)` 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error writing backup file:', error);
    return { 
      success: false, 
      message: error?.message || 'Unknown backup write error' 
    };
  }
}

/**
 * List all backup files (sorted by timestamp, newest first)
 */
export async function listBackupFiles(): Promise<string[]> {
  try {
    console.log('[FileSystem] Listing backup files...');
    
    // Ensure directories exist
    await ensureDirectoriesExist();
    
    // Read directory
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    
    // Filter JSON files and sort by name (timestamp in name)
    const backupFiles = files
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // Newest first
    
    // Return full paths
    const fullPaths = backupFiles.map(f => BACKUP_DIR + f);
    
    console.log('[FileSystem] Found', fullPaths.length, 'backup files');
    return fullPaths;
  } catch (error) {
    console.error('[FileSystem] Error listing backup files:', error);
    return [];
  }
}

/**
 * Read backup file and parse JSON
 */
export async function readBackupFile(path: string): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    console.log('[FileSystem] Reading backup file:', path);
    
    // Check if file exists
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'Backup file does not exist' 
      };
    }
    
    // Read file content
    const content = await FileSystem.readAsStringAsync(path, { encoding: UTF8 });
    
    // Check if content is empty
    if (!content || content.trim().length === 0) {
      return { 
        success: false, 
        message: 'Backup file is empty' 
      };
    }
    
    // Parse JSON
    const data = JSON.parse(content);
    
    console.log('[FileSystem] Backup file read successfully');
    return { 
      success: true, 
      data,
      message: 'Backup loaded successfully' 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error reading backup file:', error);
    
    if (error instanceof SyntaxError) {
      return { 
        success: false, 
        message: 'Invalid JSON format in backup file' 
      };
    }
    
    return { 
      success: false, 
      message: error?.message || 'Backup read error' 
    };
  }
}

/**
 * Get the latest backup file path
 */
export async function getLatestBackupFile(): Promise<string | null> {
  try {
    const backupFiles = await listBackupFiles();
    if (backupFiles.length === 0) {
      return null;
    }
    return backupFiles[0]; // Already sorted newest first
  } catch (error) {
    console.error('[FileSystem] Error getting latest backup:', error);
    return null;
  }
}

/**
 * Write PDF file with timestamp
 */
export async function writePDFFile(pdfUri: string, filename?: string): Promise<FsResult & { path?: string }> {
  try {
    console.log('[FileSystem] Writing PDF file...');
    
    // Ensure directories exist
    const dirResult = await ensureDirectoriesExist();
    if (!dirResult.success) {
      return { success: false, message: dirResult.message };
    }
    
    // Create filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const finalFilename = filename || `export-${timestamp}.pdf`;
    const path = PDF_DIR + finalFilename;
    
    // Copy PDF to PDF directory
    await FileSystem.copyAsync({
      from: pdfUri,
      to: path,
    });
    
    console.log('[FileSystem] PDF file written:', path);
    
    // Verify file was created
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'PDF file was not created successfully' 
      };
    }
    
    console.log('[FileSystem] PDF file verified, size:', info.size, 'bytes');
    return { 
      success: true, 
      path,
      message: `PDF saved successfully (${(info.size / 1024).toFixed(2)} KB)` 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error writing PDF file:', error);
    return { 
      success: false, 
      message: error?.message || 'Unknown PDF write error' 
    };
  }
}

/**
 * List all PDF files (sorted by timestamp, newest first)
 */
export async function listPDFFiles(): Promise<string[]> {
  try {
    console.log('[FileSystem] Listing PDF files...');
    
    // Ensure directories exist
    await ensureDirectoriesExist();
    
    // Read directory
    const files = await FileSystem.readDirectoryAsync(PDF_DIR);
    
    // Filter PDF files and sort by name (timestamp in name)
    const pdfFiles = files
      .filter(f => f.endsWith('.pdf'))
      .sort()
      .reverse(); // Newest first
    
    // Return full paths
    const fullPaths = pdfFiles.map(f => PDF_DIR + f);
    
    console.log('[FileSystem] Found', fullPaths.length, 'PDF files');
    return fullPaths;
  } catch (error) {
    console.error('[FileSystem] Error listing PDF files:', error);
    return [];
  }
}

/**
 * Delete a file
 */
export async function deleteFile(path: string): Promise<FsResult> {
  try {
    console.log('[FileSystem] Deleting file:', path);
    
    // Check if file exists
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'File does not exist' 
      };
    }
    
    // Delete file
    await FileSystem.deleteAsync(path, { idempotent: true });
    
    console.log('[FileSystem] File deleted successfully');
    return { 
      success: true, 
      message: 'File deleted successfully' 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error deleting file:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to delete file' 
    };
  }
}

/**
 * Get file info
 */
export async function getFileInfo(path: string): Promise<{ success: boolean; info?: FileSystem.FileInfo; message?: string }> {
  try {
    console.log('[FileSystem] Getting file info:', path);
    
    const info = await FileSystem.getInfoAsync(path);
    
    if (!info.exists) {
      return { 
        success: false, 
        message: 'File does not exist' 
      };
    }
    
    console.log('[FileSystem] File info retrieved');
    return { 
      success: true, 
      info,
      message: 'File info retrieved successfully' 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error getting file info:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to get file info' 
    };
  }
}

/**
 * Copy a file
 */
export async function copyFile(from: string, to: string): Promise<FsResult> {
  try {
    console.log('[FileSystem] Copying file from', from, 'to', to);
    
    // Check if source file exists
    const info = await FileSystem.getInfoAsync(from);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'Source file does not exist' 
      };
    }
    
    // Copy file
    await FileSystem.copyAsync({ from, to });
    
    console.log('[FileSystem] File copied successfully');
    return { 
      success: true, 
      message: 'File copied successfully' 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error copying file:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to copy file' 
    };
  }
}

/**
 * Move a file
 */
export async function moveFile(from: string, to: string): Promise<FsResult> {
  try {
    console.log('[FileSystem] Moving file from', from, 'to', to);
    
    // Check if source file exists
    const info = await FileSystem.getInfoAsync(from);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'Source file does not exist' 
      };
    }
    
    // Move file
    await FileSystem.moveAsync({ from, to });
    
    console.log('[FileSystem] File moved successfully');
    return { 
      success: true, 
      message: 'File moved successfully' 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error moving file:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to move file' 
    };
  }
}

/**
 * Write a string to a file
 */
export async function writeStringToFile(path: string, content: string): Promise<FsResult> {
  try {
    console.log('[FileSystem] Writing string to file:', path);
    
    await FileSystem.writeAsStringAsync(path, content, { encoding: UTF8 });
    
    // Verify file was created
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'File was not created successfully' 
      };
    }
    
    console.log('[FileSystem] String written to file successfully');
    return { 
      success: true, 
      message: 'File written successfully' 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error writing string to file:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to write file' 
    };
  }
}

/**
 * Read a string from a file
 */
export async function readStringFromFile(path: string): Promise<{ success: boolean; content?: string; message?: string }> {
  try {
    console.log('[FileSystem] Reading string from file:', path);
    
    // Check if file exists
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return { 
        success: false, 
        message: 'File does not exist' 
      };
    }
    
    // Read file content
    const content = await FileSystem.readAsStringAsync(path, { encoding: UTF8 });
    
    console.log('[FileSystem] String read from file successfully');
    return { 
      success: true, 
      content,
      message: 'File read successfully' 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error reading string from file:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to read file' 
    };
  }
}

/**
 * Get base directory paths
 */
export function getBasePaths() {
  return {
    BASE_DIR,
    BACKUP_DIR,
    PDF_DIR,
    DOCUMENT_DIR: FileSystem.documentDirectory,
    CACHE_DIR: FileSystem.cacheDirectory,
  };
}

/**
 * Check if a path exists
 */
export async function exists(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  } catch (error) {
    console.error('[FileSystem] Error checking existence:', error);
    return false;
  }
}

/**
 * Get directory size (total size of all files in directory)
 */
export async function getDirectorySize(dirPath: string): Promise<{ success: boolean; size?: number; message?: string }> {
  try {
    console.log('[FileSystem] Calculating directory size:', dirPath);
    
    // Check if directory exists
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      return { 
        success: false, 
        message: 'Directory does not exist' 
      };
    }
    
    // Read directory
    const files = await FileSystem.readDirectoryAsync(dirPath);
    
    // Calculate total size
    let totalSize = 0;
    for (const file of files) {
      const filePath = dirPath + file;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        totalSize += fileInfo.size || 0;
      }
    }
    
    console.log('[FileSystem] Directory size:', totalSize, 'bytes');
    return { 
      success: true, 
      size: totalSize,
      message: `Directory size: ${(totalSize / 1024).toFixed(2)} KB` 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error calculating directory size:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to calculate directory size' 
    };
  }
}

/**
 * Clean old backup files (keep only the most recent N files)
 */
export async function cleanOldBackups(keepCount: number = 10): Promise<FsResult & { deletedCount?: number }> {
  try {
    console.log('[FileSystem] Cleaning old backups, keeping', keepCount, 'most recent...');
    
    // Get all backup files
    const backupFiles = await listBackupFiles();
    
    if (backupFiles.length <= keepCount) {
      console.log('[FileSystem] No old backups to clean');
      return { 
        success: true, 
        deletedCount: 0,
        message: 'No old backups to clean' 
      };
    }
    
    // Delete old backups
    const filesToDelete = backupFiles.slice(keepCount);
    let deletedCount = 0;
    
    for (const file of filesToDelete) {
      const result = await deleteFile(file);
      if (result.success) {
        deletedCount++;
      }
    }
    
    console.log('[FileSystem] Deleted', deletedCount, 'old backup files');
    return { 
      success: true, 
      deletedCount,
      message: `Deleted ${deletedCount} old backup files` 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error cleaning old backups:', error);
    return { 
      success: false, 
      deletedCount: 0,
      message: error?.message || 'Failed to clean old backups' 
    };
  }
}

/**
 * Clean old PDF files (keep only the most recent N files)
 */
export async function cleanOldPDFs(keepCount: number = 20): Promise<FsResult & { deletedCount?: number }> {
  try {
    console.log('[FileSystem] Cleaning old PDFs, keeping', keepCount, 'most recent...');
    
    // Get all PDF files
    const pdfFiles = await listPDFFiles();
    
    if (pdfFiles.length <= keepCount) {
      console.log('[FileSystem] No old PDFs to clean');
      return { 
        success: true, 
        deletedCount: 0,
        message: 'No old PDFs to clean' 
      };
    }
    
    // Delete old PDFs
    const filesToDelete = pdfFiles.slice(keepCount);
    let deletedCount = 0;
    
    for (const file of filesToDelete) {
      const result = await deleteFile(file);
      if (result.success) {
        deletedCount++;
      }
    }
    
    console.log('[FileSystem] Deleted', deletedCount, 'old PDF files');
    return { 
      success: true, 
      deletedCount,
      message: `Deleted ${deletedCount} old PDF files` 
    };
  } catch (error: any) {
    console.error('[FileSystem] Error cleaning old PDFs:', error);
    return { 
      success: false, 
      deletedCount: 0,
      message: error?.message || 'Failed to clean old PDFs' 
    };
  }
}

/**
 * Validate backup data structure
 */
export function validateBackupData(data: any): { valid: boolean; error?: string } {
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
    return { valid: false, error: 'Invalid jobs data - must be an array' };
  }

  if (!data.settings || typeof data.settings !== 'object') {
    return { valid: false, error: 'Invalid settings data' };
  }

  if (!data.metadata || typeof data.metadata !== 'object') {
    return { valid: false, error: 'Invalid metadata' };
  }

  // Validate each job has required fields
  for (let i = 0; i < data.jobs.length; i++) {
    const job = data.jobs[i];
    if (!job.id || !job.wipNumber || !job.vehicleRegistration || typeof job.awValue !== 'number') {
      return { valid: false, error: `Invalid job at index ${i}: missing required fields` };
    }
  }

  return { valid: true };
}

/**
 * Create a backup data structure from app data
 */
export function createBackupData(jobs: any[], settings: any, technicianName?: string): any {
  const timestamp = new Date().toISOString();
  const totalAWs = jobs.reduce((sum, job) => sum + (job.awValue || 0), 0);
  
  return {
    version: '1.0.0',
    backupVersion: '1.0.0',
    timestamp,
    createdAt: timestamp,
    jobs,
    settings: {
      ...settings,
      isAuthenticated: false, // Never backup auth state
      technicianName
    },
    metadata: {
      totalJobs: jobs.length,
      totalAWs,
      exportDate: timestamp,
      appVersion: '1.0.0',
      platform: Platform.OS
    }
  };
}

/**
 * Get backup statistics
 */
export async function getBackupStatistics(): Promise<{
  success: boolean;
  stats?: {
    backupCount: number;
    pdfCount: number;
    totalBackupSize: number;
    totalPdfSize: number;
    oldestBackup?: string;
    newestBackup?: string;
  };
  message?: string;
}> {
  try {
    console.log('[FileSystem] Getting backup statistics...');
    
    // Get backup files
    const backupFiles = await listBackupFiles();
    const pdfFiles = await listPDFFiles();
    
    // Calculate sizes
    const backupSizeResult = await getDirectorySize(BACKUP_DIR);
    const pdfSizeResult = await getDirectorySize(PDF_DIR);
    
    const stats = {
      backupCount: backupFiles.length,
      pdfCount: pdfFiles.length,
      totalBackupSize: backupSizeResult.size || 0,
      totalPdfSize: pdfSizeResult.size || 0,
      oldestBackup: backupFiles.length > 0 ? backupFiles[backupFiles.length - 1] : undefined,
      newestBackup: backupFiles.length > 0 ? backupFiles[0] : undefined
    };
    
    console.log('[FileSystem] Backup statistics:', stats);
    return {
      success: true,
      stats,
      message: 'Statistics retrieved successfully'
    };
  } catch (error: any) {
    console.error('[FileSystem] Error getting backup statistics:', error);
    return {
      success: false,
      message: error?.message || 'Failed to get backup statistics'
    };
  }
}
