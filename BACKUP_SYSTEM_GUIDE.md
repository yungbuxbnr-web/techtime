
# TechTime Backup System - Complete Implementation Guide

## Overview

This document describes the comprehensive, cross-platform backup system implemented for the TechTime app. The system supports local backups, Google Drive integration, and robust data management with schema validation and conflict resolution.

## Architecture

### Core Components

1. **File System Service** (`services/storage/fs.ts`)
   - Low-level file system operations
   - Android SAF (Storage Access Framework) support
   - Cross-platform file management

2. **Local Backup Service** (`services/backup/local.ts`)
   - Local backup creation and import
   - PDF report generation
   - Data merging with conflict resolution
   - Schema validation

3. **Google Drive Service** (`services/backup/drive.ts`)
   - OAuth authentication
   - Backup upload/download
   - Retry logic with exponential backoff
   - Token refresh management

## Features

### 1. Local Backups

#### Sandbox Storage (All Platforms)
- **Location**: `FileSystem.documentDirectory/backups/`
- **Format**: JSON + PDF summary
- **Encoding**: UTF-8
- **Versioning**: Timestamped filenames (`backup_YYYY-MM-DD-HHmmss.json`)

#### Android SAF Support
- **Setup**: User selects external folder via SAF
- **Permissions**: No legacy storage permissions required
- **Export**: Automatic copy to external folder when configured
- **URI Persistence**: Saved in AsyncStorage for reuse

#### iOS Sandbox
- **Location**: App Documents folder (iCloud-compatible)
- **Export**: Share sheet for each export
- **No SAF**: iOS doesn't support permanent external folder access

### 2. Google Drive Backups

#### OAuth Authentication
- **Scope**: `https://www.googleapis.com/auth/drive.file`
- **Flow**: Authorization Code with PKCE
- **Token Refresh**: Automatic with exponential backoff
- **Configuration**: Client ID and Secret stored securely

#### Folder Management
- **Folder Name**: "TechTrace Backups"
- **Auto-Creation**: Created if doesn't exist
- **Caching**: Folder ID cached for performance

#### Upload/Download
- **Format**: Multipart upload (metadata + JSON body)
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Handling**: 429 (rate limit) and 5xx (server errors)
- **Validation**: Schema validation on download

### 3. Data Management

#### Schema Validation
```typescript
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
```

#### Conflict Resolution
- **Strategy**: `updatedAt` precedence
- **Merge Logic**: 
  - New jobs: Added to dataset
  - Existing jobs: Newer version wins
  - Unchanged jobs: Kept as-is

#### Diff Computation
- **Created**: Jobs in backup but not in local data
- **Updated**: Jobs with newer `updatedAt` in backup
- **Unchanged**: Jobs with same or older `updatedAt`

### 4. Backup Operations

#### Create Local Backup
1. Gather all app data (jobs, settings, technician name)
2. Add backup metadata (version, timestamp, totals)
3. Write JSON to sandbox (`backups/` folder)
4. Generate PDF summary with job details
5. (Android) Export copy to SAF folder if configured

#### Import Local Backup
1. Open file picker (SAF on Android, DocumentPicker on iOS)
2. Read and parse JSON file
3. Validate schema
4. Compute diff with existing data
5. Show summary (created/updated/unchanged)
6. User confirms merge
7. Merge data with conflict resolution

#### Import from File (JSON/PDF)
1. Open file picker for any JSON/PDF file
2. If JSON: Process as backup import
3. If PDF: Preview/share only (no data import)

#### Share Backup (App-to-App)
1. Get latest backup from sandbox
2. Open share sheet
3. User selects destination (Drive, Dropbox, Email, etc.)

#### Create JSON Backup for Sharing
1. Create fresh backup in cache
2. Open share sheet immediately
3. Clean up cache file after sharing

### 5. Google Drive Operations

#### Backup to Drive
1. Authenticate (or refresh token)
2. Get/create "TechTrace Backups" folder
3. Create backup data
4. Upload via multipart request
5. Retry on 429/5xx errors

#### Import & Tally from Drive
1. Authenticate
2. List backups in folder
3. User selects backup
4. Download and validate
5. Compute comprehensive statistics:
   - Job stats (total, AWs, time, average)
   - Date range analysis
   - Monthly breakdown
   - Vehicle breakdown
   - WIP breakdown
   - Performance metrics
6. Show summary report
7. User confirms merge
8. Merge data

### 6. Setup & Configuration

#### Setup Backup Folder (Android)
1. Request SAF directory permissions
2. User selects folder
3. Save URI to AsyncStorage
4. Show confirmation with URI

#### Setup Backup Folder (iOS)
1. Show info sheet explaining sandbox storage
2. No action required (automatic)

#### Test Backup
1. Create small test backup
2. Write to sandbox
3. Read back and validate
4. (Android) Test SAF write if configured
5. Clean up test files
6. Report results

### 7. Error Handling

#### Validation Errors
- **Schema Mismatch**: Clear error message with field name
- **Corrupted Data**: Prevent import, show first error
- **Version Mismatch**: Warning but allow import

#### Network Errors
- **401 Unauthorized**: Prompt re-authentication
- **429 Rate Limit**: Retry with exponential backoff
- **5xx Server Error**: Retry with exponential backoff
- **Network Timeout**: Show actionable error message

#### File System Errors
- **Permission Denied**: Guide user to grant permissions
- **No Space**: Show storage space error
- **File Not Found**: Clear error message

### 8. User Experience

#### Progress Indicators
- Loading spinners during operations
- Progress messages ("Creating backup...", "Uploading...")
- Success toasts with details

#### Success Messages
- File names and locations
- Job counts and totals
- Diff summaries (created/updated/unchanged)
- Next steps guidance

#### Error Messages
- Clear description of what went wrong
- Actionable steps to resolve
- Technical details for debugging

## Platform-Specific Considerations

### Android
- **SAF**: Full support for external folder access
- **Permissions**: No legacy storage permissions needed
- **Export**: Automatic copy to external folder
- **Platform Guards**: All SAF code wrapped in `Platform.OS === 'android'`

### iOS
- **Sandbox**: All backups in app Documents folder
- **iCloud**: Compatible with iCloud backup
- **Share Sheet**: Used for each export
- **No SAF**: No SAF references in iOS code

## Security & Privacy

### Data Protection
- **No Personal Data**: Only vehicle registrations stored
- **GDPR Compliant**: No customer personal information
- **Secure Storage**: AsyncStorage for sensitive data
- **Auth State**: Never backed up

### Token Management
- **Secure Storage**: Tokens in AsyncStorage
- **Auto Refresh**: Tokens refreshed before expiry
- **Expiry Tracking**: 5-minute buffer before expiry
- **Clear on Logout**: All tokens cleared

## Testing

### Test Backup Function
```typescript
await LocalBackupService.testBackup();
```

Tests:
1. ✓ Write test (sandbox)
2. ✓ Read test (sandbox)
3. ✓ Validation test
4. ✓ Cleanup test
5. ✓ SAF test (Android only)

### Manual Testing Checklist
- [ ] Create local backup (sandbox)
- [ ] Create local backup (Android SAF)
- [ ] Import local backup
- [ ] Merge with conflict resolution
- [ ] Share backup via share sheet
- [ ] Google Drive authentication
- [ ] Upload to Google Drive
- [ ] List backups from Google Drive
- [ ] Download from Google Drive
- [ ] Import & Tally from Google Drive
- [ ] Test backup function
- [ ] Setup backup folder (Android)
- [ ] Clear backup folder (Android)
- [ ] Import from file (JSON)
- [ ] Import from file (PDF)

## Configuration

### Environment Variables
```bash
NODE_ENV=production
```

### Google Drive Setup
1. Go to Google Cloud Console
2. Create project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URIs
6. Copy Client ID and Client Secret
7. Save in app settings

### Gradle Configuration (Android)
```properties
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m
kotlin.daemon.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1024m
org.gradle.workers.max=1
```

## API Reference

### LocalBackupService

```typescript
// Setup backup folder
await LocalBackupService.setupBackupFolder();

// Get backup location
await LocalBackupService.getBackupLocation();

// Clear backup folder (Android)
await LocalBackupService.clearBackupFolder();

// Test backup
await LocalBackupService.testBackup();

// Create local backup
await LocalBackupService.createLocalBackup();

// Import local backup
await LocalBackupService.importLocalBackup();

// Merge backup
await LocalBackupService.mergeBackup(backupData);

// Import from file
await LocalBackupService.importFromFile();

// Share backup
await LocalBackupService.shareBackup();

// Create JSON backup for sharing
await LocalBackupService.createAndShareJsonBackup();
```

### DriveBackupService

```typescript
// Save configuration
await DriveBackupService.saveConfig({ clientId, clientSecret });

// Authenticate
await DriveBackupService.authenticate();

// Check authentication
await DriveBackupService.isAuthenticated();

// Upload backup
await DriveBackupService.uploadBackup(accessToken, backupData);

// List backups
await DriveBackupService.listBackups(accessToken);

// Download backup
await DriveBackupService.downloadBackup(accessToken, fileId);

// Delete backup
await DriveBackupService.deleteBackup(accessToken, fileId);

// Sign out
await DriveBackupService.signOut();
```

### File System Service

```typescript
// Ensure directory exists
await FS.ensureDir(dirPath);

// Write JSON
await FS.writeJson(filePath, data);

// Read JSON
const data = await FS.readJson(filePath);

// Check existence
const exists = await FS.exists(path);

// Get latest backup
const latestBackup = await FS.getLatestBackup(dirPath);

// Android SAF operations
await FS.safCreateFile(dirUri, fileName, mimeType);
await FS.safWriteText(fileUri, content);
await FS.getSafUri();
await FS.setSafUri(uri);
await FS.clearSafUri();
```

## Troubleshooting

### Common Issues

#### "Storage Access Framework not available"
- **Cause**: Android SAF not available on device
- **Solution**: Use sandbox storage instead

#### "Permission denied"
- **Cause**: User denied folder access
- **Solution**: Re-run setup and grant permissions

#### "Invalid backup file format"
- **Cause**: Corrupted or incompatible backup file
- **Solution**: Use a valid backup file

#### "Authentication expired"
- **Cause**: Google Drive token expired
- **Solution**: Re-authenticate

#### "Failed to refresh token"
- **Cause**: Refresh token invalid or expired
- **Solution**: Sign out and re-authenticate

## Future Enhancements

### Planned Features
- [ ] Automatic scheduled backups
- [ ] Backup encryption
- [ ] Backup compression
- [ ] Incremental backups
- [ ] Cloud provider selection (Dropbox, OneDrive)
- [ ] Backup history management
- [ ] Backup verification
- [ ] Backup restore preview

### Performance Optimizations
- [ ] Lazy loading for large backups
- [ ] Streaming for large files
- [ ] Background backup processing
- [ ] Backup size optimization

## Conclusion

This backup system provides a robust, cross-platform solution for data backup and restore in the TechTime app. It supports both local and cloud backups, with comprehensive error handling, validation, and conflict resolution. The system is designed to be user-friendly while maintaining data integrity and security.

For questions or issues, refer to the inline code documentation or contact the development team.
