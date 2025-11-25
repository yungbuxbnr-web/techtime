
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type-safe access to FileSystem properties with null checks
const DOC_DIR = (FileSystem as any).documentDirectory as string | null;
const CACHE_DIR = (FileSystem as any).cacheDirectory as string | null;
const UTF8 = ((FileSystem as any).EncodingType?.UTF8 ?? 'utf8') as any;

// Storage Access Framework helper (Android only)
const getStorageAccessFramework = () => {
  if (Platform.OS === 'android') {
    return (FileSystem as any).StorageAccessFramework;
  }
  return null;
};

const SAF_URI_KEY = 'saf_backup_uri';

/**
 * Get a safe cache directory path, falling back to document directory if cache is not available
 */
export function getSafeCacheDirectory(): string {
  if (CACHE_DIR) {
    return CACHE_DIR;
  }
  if (DOC_DIR) {
    console.log('[FS] Cache directory not available, using document directory');
    return DOC_DIR;
  }
  throw new Error('Neither cache nor document directory is available');
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    if (!FileSystem.getInfoAsync) {
      throw new Error('FileSystem.getInfoAsync is not available');
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
    const jsonString = JSON.stringify(data, null, 2);
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: UTF8
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
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: UTF8
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
      encoding: UTF8
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
 * Get document directory path
 */
export function getDocumentDirectory(): string {
  if (!DOC_DIR) {
    throw new Error('Document directory is not available');
  }
  return DOC_DIR;
}

/**
 * Get cache directory path (with fallback to document directory)
 */
export function getCacheDirectory(): string {
  return getSafeCacheDirectory();
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
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
