
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupData } from './backupService';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google Drive API configuration
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// Storage keys for persistent data
const GOOGLE_DRIVE_TOKEN_KEY = 'google_drive_token';
const GOOGLE_DRIVE_REFRESH_TOKEN_KEY = 'google_drive_refresh_token';
const GOOGLE_DRIVE_TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';
const GOOGLE_DRIVE_FOLDER_KEY = 'google_drive_backup_folder';
const GOOGLE_DRIVE_CONFIG_KEY = 'google_drive_config';

// You'll need to get these from Google Cloud Console
// For now, using placeholder values - user needs to set these up
// IMPORTANT: Replace these with your actual Google Cloud Console credentials
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';

// For development/testing, you can temporarily use these example values:
// const GOOGLE_CLIENT_ID = '123456789-abcdefghijklmnop.apps.googleusercontent.com';
// const GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';

export interface GoogleDriveAuthResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  mimeType?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  path: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
}

export const GoogleDriveService = {
  // Configuration management
  async saveConfig(config: GoogleDriveConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(GOOGLE_DRIVE_CONFIG_KEY, JSON.stringify(config));
      console.log('Google Drive config saved');
    } catch (error) {
      console.log('Error saving Google Drive config:', error);
      throw error;
    }
  },

  async getConfig(): Promise<GoogleDriveConfig | null> {
    try {
      const configJson = await AsyncStorage.getItem(GOOGLE_DRIVE_CONFIG_KEY);
      if (configJson) {
        return JSON.parse(configJson);
      }
      return null;
    } catch (error) {
      console.log('Error getting Google Drive config:', error);
      return null;
    }
  },

  // Token management with refresh token support
  async saveToken(token: string, refreshToken?: string, expiresIn?: number): Promise<void> {
    try {
      await AsyncStorage.setItem(GOOGLE_DRIVE_TOKEN_KEY, token);
      
      if (refreshToken) {
        await AsyncStorage.setItem(GOOGLE_DRIVE_REFRESH_TOKEN_KEY, refreshToken);
      }
      
      if (expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        await AsyncStorage.setItem(GOOGLE_DRIVE_TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
      
      console.log('Google Drive token saved');
    } catch (error) {
      console.log('Error saving Google Drive token:', error);
      throw error;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(GOOGLE_DRIVE_TOKEN_KEY);
    } catch (error) {
      console.log('Error getting Google Drive token:', error);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(GOOGLE_DRIVE_REFRESH_TOKEN_KEY);
    } catch (error) {
      console.log('Error getting refresh token:', error);
      return null;
    }
  },

  async isTokenExpired(): Promise<boolean> {
    try {
      const expiryTimeStr = await AsyncStorage.getItem(GOOGLE_DRIVE_TOKEN_EXPIRY_KEY);
      if (!expiryTimeStr) {
        return true;
      }
      
      const expiryTime = parseInt(expiryTimeStr, 10);
      const now = Date.now();
      
      // Consider token expired if it expires in less than 5 minutes
      return now >= (expiryTime - 300000);
    } catch (error) {
      console.log('Error checking token expiry:', error);
      return true;
    }
  },

  async refreshAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      console.log('Refreshing access token...');
      
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available. Please sign in again.'
        };
      }

      const config = await this.getConfig();
      const clientId = config?.clientId || GOOGLE_CLIENT_ID;
      const clientSecret = config?.clientSecret || GOOGLE_CLIENT_SECRET;

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
      });

      if (response.ok) {
        const data = await response.json();
        await this.saveToken(data.access_token, undefined, data.expires_in);
        console.log('Access token refreshed successfully');
        return {
          success: true,
          accessToken: data.access_token,
        };
      } else {
        const errorText = await response.text();
        console.log('Error refreshing token:', errorText);
        return {
          success: false,
          error: 'Failed to refresh token. Please sign in again.',
        };
      }
    } catch (error) {
      console.log('Error refreshing access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async getValidToken(): Promise<string | null> {
    try {
      const token = await this.getToken();
      if (!token) {
        return null;
      }

      const isExpired = await this.isTokenExpired();
      if (isExpired) {
        console.log('Token expired, attempting to refresh...');
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.success && refreshResult.accessToken) {
          return refreshResult.accessToken;
        }
        return null;
      }

      return token;
    } catch (error) {
      console.log('Error getting valid token:', error);
      return null;
    }
  },

  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        GOOGLE_DRIVE_TOKEN_KEY,
        GOOGLE_DRIVE_REFRESH_TOKEN_KEY,
        GOOGLE_DRIVE_TOKEN_EXPIRY_KEY
      ]);
      console.log('Google Drive tokens cleared');
    } catch (error) {
      console.log('Error clearing Google Drive token:', error);
    }
  },

  // Folder management
  async saveSelectedFolder(folder: GoogleDriveFolder): Promise<void> {
    try {
      await AsyncStorage.setItem(GOOGLE_DRIVE_FOLDER_KEY, JSON.stringify(folder));
      console.log('Google Drive backup folder saved:', folder.name);
    } catch (error) {
      console.log('Error saving Google Drive folder:', error);
      throw error;
    }
  },

  async getSelectedFolder(): Promise<GoogleDriveFolder | null> {
    try {
      const folderJson = await AsyncStorage.getItem(GOOGLE_DRIVE_FOLDER_KEY);
      if (folderJson) {
        return JSON.parse(folderJson);
      }
      return null;
    } catch (error) {
      console.log('Error getting Google Drive folder:', error);
      return null;
    }
  },

  async clearSelectedFolder(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GOOGLE_DRIVE_FOLDER_KEY);
      console.log('Google Drive backup folder cleared');
    } catch (error) {
      console.log('Error clearing Google Drive folder:', error);
    }
  },

  // Authentication
  async authenticate(): Promise<GoogleDriveAuthResult> {
    try {
      console.log('Starting Google Drive authentication...');

      // Check if we have saved config
      const config = await this.getConfig();
      const clientId = config?.clientId || GOOGLE_CLIENT_ID;
      const clientSecret = config?.clientSecret || GOOGLE_CLIENT_SECRET;

      // Check if client ID is configured
      if (clientId === 'YOUR_GOOGLE_CLIENT_ID' || !clientId) {
        return {
          success: false,
          error: 'Google Drive integration not configured. Please set up Google Cloud Console credentials in the setup guide.'
        };
      }

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'techtime',
        useProxy: true,
      });

      console.log('Redirect URI:', redirectUri);

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const request = new AuthSession.AuthRequest({
        clientId,
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

      console.log('Auth result type:', result.type);

      if (result.type === 'success' && result.params.code) {
        console.log('Authorization code received, exchanging for token...');
        
        // Exchange code for access token
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            clientSecret,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier || '',
            },
          },
          discovery
        );

        console.log('Token exchange successful');

        // Save token with refresh token
        await this.saveToken(
          tokenResult.accessToken,
          tokenResult.refreshToken,
          tokenResult.expiresIn
        );

        console.log('Google Drive authentication successful');
        return {
          success: true,
          accessToken: tokenResult.accessToken,
        };
      } else if (result.type === 'error') {
        console.log('Google Drive authentication error:', result.error);
        return {
          success: false,
          error: result.error?.message || 'Authentication failed',
        };
      } else {
        console.log('Google Drive authentication cancelled');
        return {
          success: false,
          error: 'Authentication cancelled',
        };
      }
    } catch (error) {
      console.log('Error during Google Drive authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error',
      };
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getValidToken();
    return token !== null;
  },

  // Get current access token
  async getCurrentToken(): Promise<string | null> {
    return await this.getValidToken();
  },

  // List folders for selection
  async listFolders(accessToken: string, parentId?: string): Promise<{ success: boolean; folders: GoogleDriveFile[]; message?: string }> {
    try {
      console.log('Listing folders from Google Drive...');

      const query = parentId 
        ? `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
        : `mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await fetch(
        `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&orderBy=name`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Found folders on Google Drive:', result.files.length);
        return {
          success: true,
          folders: result.files || [],
        };
      } else {
        const errorText = await response.text();
        console.log('Error listing Google Drive folders:', errorText);
        
        // Check if token is invalid
        if (response.status === 401) {
          return {
            success: false,
            folders: [],
            message: 'Authentication expired. Please sign in again.',
          };
        }
        
        return {
          success: false,
          folders: [],
          message: `Failed to list folders: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      console.log('Error listing Google Drive folders:', error);
      return {
        success: false,
        folders: [],
        message: `Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  // Create a new folder
  async createFolder(accessToken: string, folderName: string, parentId?: string): Promise<{ success: boolean; folder?: GoogleDriveFile; message: string }> {
    try {
      console.log('Creating folder on Google Drive:', folderName);

      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      };

      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (response.ok) {
        const folder = await response.json();
        console.log('Folder created successfully:', folder.id);
        return {
          success: true,
          folder,
          message: `Folder "${folderName}" created successfully!`,
        };
      } else {
        const errorText = await response.text();
        console.log('Error creating folder:', errorText);
        return {
          success: false,
          message: `Failed to create folder: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      console.log('Error creating folder:', error);
      return {
        success: false,
        message: `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  // Upload backup to Google Drive (to selected folder)
  async uploadBackup(accessToken: string, backupData: BackupData, folderId?: string): Promise<{ success: boolean; message: string; fileId?: string }> {
    try {
      console.log('Uploading backup to Google Drive...');

      // Use selected folder if available
      const selectedFolder = await this.getSelectedFolder();
      const targetFolderId = folderId || selectedFolder?.id;

      const fileName = `techtrace_backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileContent = JSON.stringify(backupData, null, 2);

      // Create file metadata
      const metadata = {
        name: fileName,
        parents: targetFolderId ? [targetFolderId] : [], // Upload to selected folder or root
        description: `TechTrace backup created on ${new Date().toLocaleDateString()}`,
      };

      // Create multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

      const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBody,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Backup uploaded successfully to Google Drive:', result.id);
        
        const folderInfo = selectedFolder ? `\nFolder: ${selectedFolder.name}` : '\nFolder: Root';
        
        return {
          success: true,
          message: `Backup uploaded successfully to Google Drive!${folderInfo}\n\nFile: ${fileName}\nJobs backed up: ${backupData.jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}`,
          fileId: result.id,
        };
      } else {
        const errorText = await response.text();
        console.log('Error uploading to Google Drive:', errorText);
        
        // Check if token is invalid
        if (response.status === 401) {
          return {
            success: false,
            message: 'Authentication expired. Please sign in again.',
          };
        }
        
        return {
          success: false,
          message: `Failed to upload backup to Google Drive: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      console.log('Error uploading backup to Google Drive:', error);
      return {
        success: false,
        message: `Failed to upload backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  // List backups from Google Drive (from selected folder)
  async listBackups(accessToken: string, folderId?: string): Promise<{ success: boolean; files: GoogleDriveFile[]; message?: string }> {
    try {
      console.log('Listing backups from Google Drive...');

      // Use selected folder if available
      const selectedFolder = await this.getSelectedFolder();
      const targetFolderId = folderId || selectedFolder?.id;

      let query = "name contains 'techtrace_backup' and mimeType='application/json' and trashed=false";
      if (targetFolderId) {
        query += ` and '${targetFolderId}' in parents`;
      }

      const response = await fetch(
        `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Found backups on Google Drive:', result.files.length);
        return {
          success: true,
          files: result.files || [],
        };
      } else {
        const errorText = await response.text();
        console.log('Error listing Google Drive files:', errorText);
        
        // Check if token is invalid
        if (response.status === 401) {
          return {
            success: false,
            files: [],
            message: 'Authentication expired. Please sign in again.',
          };
        }
        
        return {
          success: false,
          files: [],
          message: `Failed to list backups: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      console.log('Error listing Google Drive backups:', error);
      return {
        success: false,
        files: [],
        message: `Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  // Download backup from Google Drive
  async downloadBackup(accessToken: string, fileId: string): Promise<{ success: boolean; data?: BackupData; message: string }> {
    try {
      console.log('Downloading backup from Google Drive:', fileId);

      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const backupContent = await response.text();
        const backupData: BackupData = JSON.parse(backupContent);

        // Validate backup data structure
        if (!backupData.jobs || !backupData.settings || !backupData.metadata) {
          return {
            success: false,
            message: 'Invalid backup file format. The backup file appears to be corrupted.',
          };
        }

        console.log('Backup downloaded successfully from Google Drive');
        return {
          success: true,
          data: backupData,
          message: `Backup downloaded successfully!\n\nJobs found: ${backupData.jobs.length}\nTotal AWs: ${backupData.metadata.totalAWs}\nBackup date: ${new Date(backupData.timestamp).toLocaleDateString()}`,
        };
      } else {
        const errorText = await response.text();
        console.log('Error downloading from Google Drive:', errorText);
        
        // Check if token is invalid
        if (response.status === 401) {
          return {
            success: false,
            message: 'Authentication expired. Please sign in again.',
          };
        }
        
        return {
          success: false,
          message: `Failed to download backup: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      console.log('Error downloading backup from Google Drive:', error);
      return {
        success: false,
        message: `Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  // Delete backup from Google Drive
  async deleteBackup(accessToken: string, fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Deleting backup from Google Drive:', fileId);

      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok || response.status === 204) {
        console.log('Backup deleted successfully from Google Drive');
        return {
          success: true,
          message: 'Backup deleted successfully from Google Drive',
        };
      } else {
        const errorText = await response.text();
        console.log('Error deleting from Google Drive:', errorText);
        
        // Check if token is invalid
        if (response.status === 401) {
          return {
            success: false,
            message: 'Authentication expired. Please sign in again.',
          };
        }
        
        return {
          success: false,
          message: `Failed to delete backup: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      console.log('Error deleting backup from Google Drive:', error);
      return {
        success: false,
        message: `Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  // Check if Google Drive is configured
  async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return (config?.clientId && config.clientId !== 'YOUR_GOOGLE_CLIENT_ID') ||
           (GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID');
  },

  // Get configuration instructions
  getConfigurationInstructions(): string {
    return `To enable Google Drive backup, you need to:

1. Go to Google Cloud Console (console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add your app's redirect URI
6. Update the credentials in the setup guide

For detailed instructions, visit:
https://developers.google.com/drive/api/quickstart/nodejs`;
  },

  // Sign out and clear all data
  async signOut(): Promise<void> {
    try {
      await this.clearToken();
      await this.clearSelectedFolder();
      console.log('Google Drive sign out completed');
    } catch (error) {
      console.log('Error during Google Drive sign out:', error);
    }
  },
};
