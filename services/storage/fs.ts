
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// UTF-8 encoding helper - no EncodingType reference
type FsUtf = FileSystem.FileSystemEncoding | 'utf8';
const UTF8: FsUtf = 'utf8';

// Storage Access Framework helper (Android only)
const getStorageAccessFramework = () => {
  if (Platform.OS === 'android') {
    return (FileSystem as any).StorageAccessFramework;
  }
  return null;
};

const SAF_URI_KEY = 'saf_backup_uri';

/**
 * Get document directory path with fallback
 */
export function getDocumentDirectory(): string {
  try {
    const docDir = (FileSystem as any).documentDirectory;
    if (docDir && typeof docDir === 'string') {
      return docDir;
    }
    
    // Fallback to cache directory if document directory is not available
    const cacheDir = (FileSystem as any).cacheDirectory;
    if (cacheDir && typeof cacheDir === 'string') {
      console.log('[FS] Document directory not available, using cache directory');
      return cacheDir;
    }
    
    // Last resort: return empty string (will cause errors but won't crash at module load)
    console.log('[FS] WARNING: No file system directory available');
    return '';
  } catch (error) {
    console.log('[FS] Error accessing document directory:', error);
    return '';
  }
}

/**
 * Get cache directory path with fallback
 */
export function getCacheDirectory(): string {
  try {
    const cacheDir = (FileSystem as any).cacheDirectory;
    if (cacheDir && typeof cacheDir === 'string') {
      return cacheDir;
    }
    
    // Fallback to document directory if cache directory is not available
    const docDir = (FileSystem as any).documentDirectory;
    if (docDir && typeof docDir === 'string') {
      console.log('[FS] Cache directory not available, using document directory');
      return docDir;
    }
    
    // Last resort: return empty string
    console.log('[FS] WARNING: No file system directory available');
    return '';
  } catch (error) {
    console.log('[FS] Error accessing cache directory:', error);
    return '';
  }
}

/**
 * Check if file system is available
 */
export function isFileSystemAvailable(): boolean {
  const docDir = getDocumentDirectory();
  const cacheDir = getCacheDirectory();
  return (docDir && docDir.length > 0) || (cacheDir && cacheDir.length > 0);
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    if (!dirPath || dirPath.length === 0) {
      throw new Error('Invalid directory path');
    }
    
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      console.log('[FS] Creating directory:', dirPath);
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  } catch (error) {
    console.log('[FS] Error ensuring directory:', error);
    throw error;
  }
}

/**
 * Write JSON data to a file
 */
export async function writeJson(filePath: string, data: any): Promise<void> {
  try {
    if (!filePath || filePath.length === 0) {
      throw new Error('Invalid file path');
    }
    
    const jsonString = JSON.stringify(data, null, 2);
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: UTF8 as any
    });
    console.log('[FS] JSON written to:', filePath);
  } catch (error) {
    console.log('[FS] Error writing JSON:', error);
    throw error;
  }
}

/**
 * Read JSON data from a file
 */
export async function readJson<T = any>(filePath: string): Promise<T> {
  try {
    if (!filePath || filePath.length === 0) {
      throw new Error('Invalid file path');
    }
    
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: UTF8 as any
    });
    
    if (!content || content.trim().length === 0) {
      throw new Error('File is empty');
    }
    
    const parsed = JSON.parse(content) as T;
    console.log('[FS] JSON read from:', filePath);
    return parsed;
  } catch (error) {
    console.log('[FS] Error reading JSON:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format in file');
    }
    throw error;
  }
}

/**
 * Check if a file or directory exists
 */
export async function exists(path: string): Promise<boolean> {
  try {
    if (!path || path.length === 0) {
      return false;
    }
    
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  } catch (error) {
    console.log('[FS] Error checking existence:', error);
    return false;
  }
}

/**
 * Get the latest backup file from a directory
 */
export async function getLatestBackup(dirPath: string): Promise<string | null> {
  try {
    if (!dirPath || dirPath.length === 0) {
      return null;
    }
    
    const dirExists = await exists(dirPath);
    if (!dirExists) {
      return null;
    }
    
    const files = await FileSystem.readDirectoryAsync(dirPath);
    const jsonFiles = files
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (jsonFiles.length === 0) {
      return null;
    }
    
    return `${dirPath}${jsonFiles[0]}`;
  } catch (error) {
    console.log('[FS] Error getting latest backup:', error);
    return null;
  }
}

/**
 * Android SAF: Create a file in the selected directory
 */
export async function safCreateFile(
  dirUri: string,
  fileName: string,
  mimeType: string = 'application/json'
): Promise<string | null> {
  if (Platform.OS !== 'android') {
    console.log('[FS] SAF is Android-only');
    return null;
  }
  
  try {
    const SAF = getStorageAccessFramework();
    if (!SAF) {
      throw new Error('Storage Access Framework not available');
    }
    
    const fileUri = await SAF.createFileAsync(dirUri, fileName, mimeType);
    console.log('[FS] SAF file created:', fileUri);
    return fileUri;
  } catch (error) {
    console.log('[FS] Error creating SAF file:', error);
    throw error;
  }
}

/**
 * Android SAF: Write text to a file
 */
export async function safWriteText(fileUri: string, content: string): Promise<void> {
  if (Platform.OS !== 'android') {
    console.log('[FS] SAF is Android-only');
    return;
  }
  
  try {
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: UTF8 as any
    });
    console.log('[FS] SAF text written to:', fileUri);
  } catch (error) {
    console.log('[FS] Error writing SAF text:', error);
    throw error;
  }
}

/**
 * Android SAF: Get saved directory URI
 */
export async function getSafUri(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  
  try {
    return await AsyncStorage.getItem(SAF_URI_KEY);
  } catch (error) {
    console.log('[FS] Error getting SAF URI:', error);
    return null;
  }
}

/**
 * Android SAF: Save directory URI
 */
export async function setSafUri(uri: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  
  try {
    await AsyncStorage.setItem(SAF_URI_KEY, uri);
    console.log('[FS] SAF URI saved:', uri);
  } catch (error) {
    console.log('[FS] Error saving SAF URI:', error);
    throw error;
  }
}

/**
 * Android SAF: Clear saved directory URI
 */
export async function clearSafUri(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  
  try {
    await AsyncStorage.removeItem(SAF_URI_KEY);
    console.log('[FS] SAF URI cleared');
  } catch (error) {
    console.log('[FS] Error clearing SAF URI:', error);
    throw error;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (!filePath || filePath.length === 0) {
      throw new Error('Invalid file path');
    }
    
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    console.log('[FS] File deleted:', filePath);
  } catch (error) {
    console.log('[FS] Error deleting file:', error);
    throw error;
  }
}

/**
 * Copy a file
 */
export async function copyFile(from: string, to: string): Promise<void> {
  try {
    if (!from || from.length === 0 || !to || to.length === 0) {
      throw new Error('Invalid file paths');
    }
    
    await FileSystem.copyAsync({ from, to });
    console.log('[FS] File copied from', from, 'to', to);
  } catch (error) {
    console.log('[FS] Error copying file:', error);
    throw error;
  }
}

/**
 * Move a file
 */
export async function moveFile(from: string, to: string): Promise<void> {
  try {
    if (!from || from.length === 0 || !to || to.length === 0) {
      throw new Error('Invalid file paths');
    }
    
    await FileSystem.moveAsync({ from, to });
    console.log('[FS] File moved from', from, 'to', to);
  } catch (error) {
    console.log('[FS] Error moving file:', error);
    throw error;
  }
}

/**
 * Get file info
 */
export async function getFileInfo(filePath: string): Promise<FileSystem.FileInfo> {
  try {
    if (!filePath || filePath.length === 0) {
      throw new Error('Invalid file path');
    }
    
    return await FileSystem.getInfoAsync(filePath);
  } catch (error) {
    console.log('[FS] Error getting file info:', error);
    throw error;
  }
}

/**
 * List files in a directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    if (!dirPath || dirPath.length === 0) {
      return [];
    }
    
    const dirExists = await exists(dirPath);
    if (!dirExists) {
      return [];
    }
    
    return await FileSystem.readDirectoryAsync(dirPath);
  } catch (error) {
    console.log('[FS] Error listing files:', error);
    return [];
  }
}
