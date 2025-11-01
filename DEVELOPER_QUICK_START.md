
# TechTime Backup System - Developer Quick Start

## 🚀 Quick Start

### 1. Install Dependencies

All required dependencies are already in `package.json`:

```json
{
  "expo-file-system": "^19.0.17",
  "expo-document-picker": "^14.0.7",
  "expo-sharing": "^14.0.7",
  "expo-auth-session": "^7.0.8",
  "expo-print": "^15.0.7",
  "@react-native-async-storage/async-storage": "^2.2.0"
}
```

### 2. File Structure

```
services/
├── storage/
│   └── fs.ts                 # NEW: File system utilities
└── backup/
    ├── local.ts              # UPDATED: Local backup service
    └── drive.ts              # NEW: Google Drive service

app/
└── settings.tsx              # UPDATED: Settings UI
```

### 3. Basic Usage

#### Create Local Backup

```typescript
import { LocalBackupService } from '../services/backup/local';

// Create backup
const result = await LocalBackupService.createLocalBackup();

if (result.success) {
  console.log('Backup created:', result.filePath);
  console.log('PDF created:', result.pdfPath);
} else {
  console.log('Error:', result.message);
}
```

#### Import Local Backup

```typescript
// Import backup
const result = await LocalBackupService.importLocalBackup();

if (result.success && result.data) {
  // Show diff
  console.log('Created:', result.diff?.created.length);
  console.log('Updated:', result.diff?.updated.length);
  console.log('Unchanged:', result.diff?.unchanged.length);
  
  // Merge data
  const mergeResult = await LocalBackupService.mergeBackup(result.data);
  console.log('Merge stats:', mergeResult.stats);
}
```

#### Google Drive Backup

```typescript
import { DriveBackupService } from '../services/backup/drive';

// Authenticate
const authResult = await DriveBackupService.authenticate();

if (authResult.success && authResult.accessToken) {
  // Upload backup
  const uploadResult = await DriveBackupService.uploadBackup(
    authResult.accessToken,
    backupData
  );
  
  console.log('Upload result:', uploadResult.message);
}
```

### 4. Platform-Specific Code

#### Android SAF

```typescript
import { Platform } from 'react-native';
import * as FS from '../services/storage/fs';

if (Platform.OS === 'android') {
  // Setup SAF
  const result = await LocalBackupService.setupBackupFolder();
  
  // Get SAF URI
  const safUri = await FS.getSafUri();
  
  // Create file in SAF directory
  if (safUri) {
    const fileUri = await FS.safCreateFile(safUri, 'backup.json', 'application/json');
    await FS.safWriteText(fileUri, JSON.stringify(data));
  }
}
```

#### iOS Sandbox

```typescript
import * as FS from '../services/storage/fs';

// Always use sandbox on iOS
const backupDir = `${FS.getDocumentDirectory()}backups/`;
await FS.ensureDir(backupDir);
await FS.writeJson(`${backupDir}backup.json`, data);
```

### 5. Error Handling

```typescript
try {
  const result = await LocalBackupService.createLocalBackup();
  
  if (result.success) {
    // Success
    showNotification(result.message, 'success');
  } else {
    // Failure
    showNotification(result.message, 'error');
  }
} catch (error) {
  // Unexpected error
  console.log('Unexpected error:', error);
  showNotification('Unexpected error occurred', 'error');
}
```

### 6. Schema Validation

```typescript
// Validate backup data
const validation = validateBackupSchema(backupData);

if (!validation.valid) {
  console.log('Validation error:', validation.error);
  return;
}

// Proceed with import
```

### 7. Conflict Resolution

```typescript
// Merge jobs with conflict resolution
const existingJobs = await StorageService.getJobs();
const mergeResult = mergeJobs(existingJobs, backupData.jobs);

console.log('Created:', mergeResult.stats.created);
console.log('Updated:', mergeResult.stats.updated);
console.log('Unchanged:', mergeResult.stats.unchanged);

// Save merged jobs
await StorageService.saveJobs(mergeResult.merged);
```

### 8. Testing

```typescript
// Run test backup
const result = await LocalBackupService.testBackup();

if (result.success) {
  console.log('✅ All tests passed');
} else {
  console.log('❌ Test failed:', result.message);
}
```

## 📚 API Reference

### LocalBackupService

```typescript
// Setup
setupBackupFolder(): Promise<{ success: boolean; message: string; uri?: string }>
getBackupLocation(): Promise<{ success: boolean; location: string; type: 'sandbox' | 'saf' }>
clearBackupFolder(): Promise<{ success: boolean; message: string }>
testBackup(): Promise<{ success: boolean; message: string }>

// Backup
createLocalBackup(): Promise<LocalBackupResult>
importLocalBackup(): Promise<{ success: boolean; message: string; data?: BackupData; diff?: Diff }>
mergeBackup(backupData: BackupData): Promise<{ success: boolean; message: string; stats?: Stats }>

// Import/Export
importFromFile(): Promise<{ success: boolean; message: string; data?: BackupData; isPdf?: boolean }>
shareBackup(): Promise<{ success: boolean; message: string }>
createAndShareJsonBackup(): Promise<{ success: boolean; message: string }>
```

### DriveBackupService

```typescript
// Configuration
saveConfig(config: DriveConfig): Promise<void>
getConfig(): Promise<DriveConfig | null>

// Authentication
authenticate(): Promise<{ success: boolean; accessToken?: string; error?: string }>
isAuthenticated(): Promise<boolean>
refreshAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }>
getValidToken(): Promise<string | null>
signOut(): Promise<void>

// Backup Operations
uploadBackup(accessToken: string, backupData: BackupData): Promise<{ success: boolean; fileId?: string; message: string }>
listBackups(accessToken: string): Promise<{ success: boolean; files: DriveFile[]; message?: string }>
downloadBackup(accessToken: string, fileId: string): Promise<{ success: boolean; data?: BackupData; message: string }>
deleteBackup(accessToken: string, fileId: string): Promise<{ success: boolean; message: string }>
```

### File System Service

```typescript
// Directory Operations
ensureDir(dirPath: string): Promise<void>
exists(path: string): Promise<boolean>
listFiles(dirPath: string): Promise<string[]>

// File Operations
writeJson(filePath: string, data: any): Promise<void>
readJson<T>(filePath: string): Promise<T>
deleteFile(filePath: string): Promise<void>
copyFile(from: string, to: string): Promise<void>
moveFile(from: string, to: string): Promise<void>
getFileInfo(filePath: string): Promise<FileInfo>

// Backup Utilities
getLatestBackup(dirPath: string): Promise<string | null>

// Android SAF (Android only)
safCreateFile(dirUri: string, fileName: string, mimeType?: string): Promise<string | null>
safWriteText(fileUri: string, content: string): Promise<void>
getSafUri(): Promise<string | null>
setSafUri(uri: string): Promise<void>
clearSafUri(): Promise<void>

// Paths
getDocumentDirectory(): string
getCacheDirectory(): string
```

## 🔧 Configuration

### Google Drive Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URIs:
   - `https://auth.expo.io/@your-username/your-app-slug`
   - `exp://localhost:8081`
6. Copy Client ID and Client Secret
7. Save in app:

```typescript
await DriveBackupService.saveConfig({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});
```

### Android Gradle Configuration

Ensure these settings in `android/gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m
kotlin.daemon.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1024m
org.gradle.workers.max=1
```

### Environment Variables

Set in your build environment:

```bash
NODE_ENV=production
```

## 🐛 Debugging

### Enable Logging

All services use `console.log` for debugging:

```typescript
// File system operations
console.log('[FS] Creating directory:', dirPath);

// Backup operations
console.log('=== CREATING LOCAL BACKUP ===');

// Google Drive operations
console.log('[Drive] Uploading backup...');
```

### Common Issues

#### "Storage Access Framework not available"
- **Cause**: Android SAF not available
- **Solution**: Use sandbox storage instead

#### "Permission denied"
- **Cause**: User denied folder access
- **Solution**: Re-run setup and grant permissions

#### "Invalid backup file format"
- **Cause**: Corrupted or incompatible backup
- **Solution**: Use a valid backup file

#### "Authentication expired"
- **Cause**: Google Drive token expired
- **Solution**: Re-authenticate

## 📖 Further Reading

- [BACKUP_SYSTEM_GUIDE.md](./BACKUP_SYSTEM_GUIDE.md) - Complete implementation guide
- [USER_BACKUP_GUIDE.md](./USER_BACKUP_GUIDE.md) - User guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation summary

## 🤝 Contributing

When adding new backup features:

1. Add to appropriate service (`local.ts` or `drive.ts`)
2. Update UI in `settings.tsx`
3. Add tests
4. Update documentation
5. Test on both Android and iOS

## 📝 License

This backup system is part of the TechTime app and follows the same license.

---

**Happy coding! 🚀**
