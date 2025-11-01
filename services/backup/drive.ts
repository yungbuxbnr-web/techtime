
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupData } from '../../utils/backupService';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google Drive API configuration
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FOLDER_NAME = 'TechTrace Backups';

// Storage keys
const TOKEN_KEY = 'google_drive_token';
const REFRESH_TOKEN_KEY = 'google_drive_refresh_token';
const TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';
const FOLDER_ID_KEY = 'google_drive_folder_id';
const CONFIG_KEY = 'google_drive_config';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export interface DriveConfig {
  clientId: string;
  clientSecret: string;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, attempt);
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable (429, 5xx)
      if (error instanceof Response) {
        const status = error.status;
        if (status === 429 || (status >= 500 && status < 600)) {
          const delay = getRetryDelay(attempt);
          console.log(`[Drive] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await sleep(delay);
          continue;
        }
      }
      
      // Non-retryable error, throw immediately
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

export const DriveBackupService = {
  /**
   * Save configuration
   */
  async saveConfig(config: DriveConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      console.log('[Drive] Config saved');
    } catch (error) {
      console.log('[Drive] Error saving config:', error);
      throw error;
    }
  },

  /**
   * Get configuration
   */
  async getConfig(): Promise<DriveConfig | null> {
    try {
      const configJson = await AsyncStorage.getItem(CONFIG_KEY);
      return configJson ? JSON.parse(configJson) : null;
    } catch (error) {
      console.log('[Drive] Error getting config:', error);
      return null;
    }
  },

  /**
   * Save tokens
   */
  async saveTokens(accessToken: string, refreshToken?: string, expiresIn?: number): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      
      if (expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
      
      console.log('[Drive] Tokens saved');
    } catch (error) {
      console.log('[Drive] Error saving tokens:', error);
      throw error;
    }
  },

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.log('[Drive] Error getting access token:', error);
      return null;
    }
  },

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.log('[Drive] Error getting refresh token:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    try {
      const expiryTimeStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
      if (!expiryTimeStr) {
        return true;
      }
      
      const expiryTime = parseInt(expiryTimeStr, 10);
      const now = Date.now();
      
      // Consider expired if less than 5 minutes remaining
      return now >= (expiryTime - 300000);
    } catch (error) {
      console.log('[Drive] Error checking token expiry:', error);
      return true;
    }
  },

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      console.log('[Drive] Refreshing access token...');
      
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      const config = await this.getConfig();
      if (!config) {
        return {
          success: false,
          error: 'No configuration found'
        };
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${config.clientId}&client_secret=${config.clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
      });

      if (response.ok) {
        const data = await response.json();
        await this.saveTokens(data.access_token, undefined, data.expires_in);
        console.log('[Drive] Access token refreshed');
        return {
          success: true,
          accessToken: data.access_token,
        };
      } else {
        const errorText = await response.text();
        console.log('[Drive] Error refreshing token:', errorText);
        return {
          success: false,
          error: 'Failed to refresh token',
        };
      }
    } catch (error) {
      console.log('[Drive] Error refreshing access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidToken(): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }

      const isExpired = await this.isTokenExpired();
      if (isExpired) {
        console.log('[Drive] Token expired, refreshing...');
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.success && refreshResult.accessToken) {
          return refreshResult.accessToken;
        }
        return null;
      }

      return token;
    } catch (error) {
      console.log('[Drive] Error getting valid token:', error);
      return null;
    }
  },

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY]);
      console.log('[Drive] Tokens cleared');
    } catch (error) {
      console.log('[Drive] Error clearing tokens:', error);
    }
  },

  /**
   * Authenticate with Google Drive
   */
  async authenticate(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      console.log('[Drive] Starting authentication...');

      const config = await this.getConfig();
      if (!config || !config.clientId || config.clientId === 'YOUR_GOOGLE_CLIENT_ID') {
        return {
          success: false,
          error: 'Google Drive not configured. Please set up credentials in Settings.',
        };
      }

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'techtime',
        useProxy: true,
      });

      console.log('[Drive] Redirect URI:', redirectUri);

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const request = new AuthSession.AuthRequest({
        clientId: config.clientId,
        scopes: [GOOGLE_DRIVE_SCOPE],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const result = await request.promptAsync(discovery);

      console.log('[Drive] Auth result type:', result.type);

      if (result.type === 'success' && result.params.code) {
        console.log('[Drive] Authorization code received, exchanging for token...');
        
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier || '',
            },
          },
          discovery
        );

        console.log('[Drive] Token exchange successful');

        await this.saveTokens(
          tokenResult.accessToken,
          tokenResult.refreshToken,
          tokenResult.expiresIn
        );

        console.log('[Drive] Authentication successful');
        return {
          success: true,
          accessToken: tokenResult.accessToken,
        };
      } else if (result.type === 'error') {
        console.log('[Drive] Authentication error:', result.error);
        return {
          success: false,
          error: result.error?.message || 'Authentication failed',
        };
      } else {
        console.log('[Drive] Authentication cancelled');
        return {
          success: false,
          error: 'Authentication cancelled',
        };
      }
    } catch (error) {
      console.log('[Drive] Error during authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Find or create backup folder
   */
  async getOrCreateBackupFolder(accessToken: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      // Check if we have a cached folder ID
      const cachedFolderId = await AsyncStorage.getItem(FOLDER_ID_KEY);
      if (cachedFolderId) {
        // Verify folder still exists
        const verifyResponse = await fetch(
          `${GOOGLE_DRIVE_API_BASE}/files/${cachedFolderId}?fields=id,name`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (verifyResponse.ok) {
          console.log('[Drive] Using cached folder ID:', cachedFolderId);
          return { success: true, folderId: cachedFolderId };
        }
      }

      // Search for existing folder
      const searchQuery = `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchResponse = await retryWithBackoff(async () => {
        const response = await fetch(
          `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw response;
        }

        return response;
      });

      const searchResult = await searchResponse.json();

      if (searchResult.files && searchResult.files.length > 0) {
        const folderId = searchResult.files[0].id;
        await AsyncStorage.setItem(FOLDER_ID_KEY, folderId);
        console.log('[Drive] Found existing folder:', folderId);
        return { success: true, folderId };
      }

      // Create new folder
      const createResponse = await retryWithBackoff(async () => {
        const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: BACKUP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
          }),
        });

        if (!response.ok) {
          throw response;
        }

        return response;
      });

      const folder = await createResponse.json();
      await AsyncStorage.setItem(FOLDER_ID_KEY, folder.id);
      console.log('[Drive] Created new folder:', folder.id);
      return { success: true, folderId: folder.id };

    } catch (error) {
      console.log('[Drive] Error getting/creating folder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to access folder',
      };
    }
  },

  /**
   * Upload backup to Google Drive
   */
  async uploadBackup(
    accessToken: string,
    backupData: BackupData
  ): Promise<{ success: boolean; fileId?: string; message: string }> {
    try {
      console.log('[Drive] Uploading backup...');

      // Get or create backup folder
      const folderResult = await this.getOrCreateBackupFolder(accessToken);
      if (!folderResult.success || !folderResult.folderId) {
        return {
          success: false,
          message: folderResult.error || 'Failed to access backup folder',
        };
      }

      const fileName = `techtrace_backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileContent = JSON.stringify(backupData, null, 2);

      // Create multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        parents: [folderResult.folderId],
        description: `TechTrace backup created on ${new Date().toLocaleDateString()}`,
      };

      const multipartBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelim;

      const uploadResponse = await retryWithBackoff(async () => {
        const response = await fetch(
          `${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartBody,
          }
        );

        if (!response.ok) {
          throw response;
        }

        return response;
      });

      const result = await uploadResponse.json();
      console.log('[Drive] Backup uploaded successfully:', result.id);

      return {
        success: true,
        fileId: result.id,
        message: `✅ Backup uploaded to Google Drive!\n\nFolder: ${BACKUP_FOLDER_NAME}\nFile: ${fileName}\nJobs: ${backupData.jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}`,
      };

    } catch (error) {
      console.log('[Drive] Error uploading backup:', error);
      return {
        success: false,
        message: `Failed to upload backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  /**
   * List backups from Google Drive
   */
  async listBackups(accessToken: string): Promise<{ success: boolean; files: DriveFile[]; message?: string }> {
    try {
      console.log('[Drive] Listing backups...');

      // Get backup folder
      const folderResult = await this.getOrCreateBackupFolder(accessToken);
      if (!folderResult.success || !folderResult.folderId) {
        return {
          success: false,
          files: [],
          message: folderResult.error || 'Failed to access backup folder',
        };
      }

      const query = `'${folderResult.folderId}' in parents and mimeType='application/json' and trashed=false`;

      const listResponse = await retryWithBackoff(async () => {
        const response = await fetch(
          `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw response;
        }

        return response;
      });

      const result = await listResponse.json();
      console.log('[Drive] Found backups:', result.files.length);

      return {
        success: true,
        files: result.files || [],
      };

    } catch (error) {
      console.log('[Drive] Error listing backups:', error);
      return {
        success: false,
        files: [],
        message: `Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  /**
   * Download backup from Google Drive
   */
  async downloadBackup(
    accessToken: string,
    fileId: string
  ): Promise<{ success: boolean; data?: BackupData; message: string }> {
    try {
      console.log('[Drive] Downloading backup:', fileId);

      const downloadResponse = await retryWithBackoff(async () => {
        const response = await fetch(
          `${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw response;
        }

        return response;
      });

      const backupContent = await downloadResponse.text();
      const backupData: BackupData = JSON.parse(backupContent);

      // Validate backup data
      if (!backupData.jobs || !backupData.settings || !backupData.metadata) {
        return {
          success: false,
          message: 'Invalid backup file format',
        };
      }

      console.log('[Drive] Backup downloaded successfully');
      return {
        success: true,
        data: backupData,
        message: `✅ Backup downloaded!\n\nJobs: ${backupData.jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}\nDate: ${new Date(backupData.timestamp).toLocaleDateString()}`,
      };

    } catch (error) {
      console.log('[Drive] Error downloading backup:', error);
      return {
        success: false,
        message: `Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  /**
   * Delete backup from Google Drive
   */
  async deleteBackup(
    accessToken: string,
    fileId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Drive] Deleting backup:', fileId);

      await retryWithBackoff(async () => {
        const response = await fetch(
          `${GOOGLE_DRIVE_API_BASE}/files/${fileId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok && response.status !== 204) {
          throw response;
        }

        return response;
      });

      console.log('[Drive] Backup deleted successfully');
      return {
        success: true,
        message: 'Backup deleted successfully',
      };

    } catch (error) {
      console.log('[Drive] Error deleting backup:', error);
      return {
        success: false,
        message: `Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getValidToken();
    return token !== null;
  },

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await this.clearTokens();
      await AsyncStorage.removeItem(FOLDER_ID_KEY);
      console.log('[Drive] Signed out');
    } catch (error) {
      console.log('[Drive] Error signing out:', error);
    }
  },
};
