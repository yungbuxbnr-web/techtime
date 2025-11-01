
# TechTime Backup & Restore - User Guide

## Quick Start

### Creating Your First Backup

1. **Open Settings** → Tap the ⚙️ Settings tab
2. **Scroll to Backup & Import** section
3. **Tap "Create Local Backup"** → Creates backup in app storage
4. **Success!** You'll see a confirmation with backup details

### Restoring from Backup

1. **Open Settings** → Tap the ⚙️ Settings tab
2. **Scroll to Backup & Import** section
3. **Tap "Import Local Backup"** → Select your backup file
4. **Review Changes** → See what will be created/updated
5. **Confirm** → Your data is restored!

## Backup Options

### 📱 Local Backups (Recommended)

**What it does:**
- Saves your data to your phone's storage
- Creates both JSON (data) and PDF (report) files
- Works offline

**How to use:**
1. Tap "Create Local Backup"
2. Backup is saved automatically
3. Use "Share Backup" to send to another device

**Android Extra:**
- Tap "Setup Backup Folder" to choose external folder
- Backups will be saved to both app storage AND your chosen folder
- Great for easy access via file manager

### ☁️ Google Drive Backup

**What it does:**
- Saves your data to Google Drive cloud storage
- Access from any device
- Automatic folder organization

**How to use:**
1. Tap "Google Drive Backup"
2. Sign in with your Google account
3. Backup is uploaded to "TechTrace Backups" folder
4. Done!

**To restore:**
1. Tap "Import & Tally from Google Drive"
2. Sign in if needed
3. Select backup file
4. Review detailed statistics
5. Confirm to restore

### 📤 Share Backup (Quick Transfer)

**What it does:**
- Instantly share backup to any app
- Send via email, messaging, cloud storage
- Perfect for device migration

**How to use:**
1. Tap "Share Backup (App-to-App)"
2. Choose destination (Email, Drive, Dropbox, etc.)
3. Send!

### 📋 Create JSON Backup for Sharing

**What it does:**
- Creates a fresh backup and opens share menu
- Lightweight JSON file
- Easy to send anywhere

**How to use:**
1. Tap "Create JSON Backup for Sharing"
2. Choose where to save/send
3. Done!

## Android-Specific Features

### Setup Backup Folder

**Why use it:**
- Save backups to external storage (SD card, USB)
- Easy access via file manager
- Automatic export on every backup

**How to set up:**
1. Tap "Setup Backup Folder"
2. Choose folder (e.g., Documents/TechTime)
3. Grant permission
4. All future backups will be saved there too!

**To change folder:**
1. Tap "Setup Backup Folder" again
2. Choose new folder

## iOS-Specific Features

### Automatic iCloud Backup

**What it does:**
- App data is automatically backed up to iCloud
- Restores when you set up a new iPhone
- No action needed!

**Note:**
- iOS doesn't allow permanent external folder access
- Use "Share Backup" to save to Files app or iCloud Drive

## Import Options

### Import Local Backup

**Use when:**
- Restoring from previous backup
- Migrating to new device
- Recovering deleted data

**Steps:**
1. Tap "Import Local Backup"
2. Select backup file
3. Review changes (new/updated/unchanged jobs)
4. Confirm to merge

### Import from File (JSON/PDF)

**Use when:**
- Importing backup from email/cloud
- Restoring from shared backup
- Viewing PDF reports

**Steps:**
1. Tap "Import from File (JSON/PDF)"
2. Select file
3. If JSON: Review and import
4. If PDF: Preview/share only

### Import & Tally from Google Drive

**Use when:**
- Restoring from Google Drive
- Analyzing backup statistics
- Comparing multiple backups

**Steps:**
1. Tap "Import & Tally from Google Drive"
2. Sign in if needed
3. Select backup file
4. View detailed statistics:
   - Total jobs, AWs, time
   - Monthly breakdown
   - Vehicle breakdown
   - Performance metrics
5. Confirm to import

## Understanding Backup Data

### What's Included in Backups

✅ **Included:**
- All job records (WIP, registration, AWs, notes, dates)
- Settings (PIN, target hours, formulas)
- Technician name
- Absence records
- VHC color data

❌ **Not Included:**
- Authentication state (you'll need to sign in again)
- Biometric settings (for security)
- Google Drive credentials

### Backup File Format

**JSON File:**
```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "jobs": [...],
  "settings": {...},
  "metadata": {
    "totalJobs": 150,
    "totalAWs": 1800,
    "exportDate": "2024-01-15T10:30:00.000Z",
    "appVersion": "1.0.0"
  }
}
```

**PDF File:**
- Summary statistics
- Monthly breakdown
- Job details by month
- Color-coded VHC status

## Merge Behavior

### How Data is Merged

When you import a backup, the app intelligently merges data:

**New Jobs (Created):**
- Jobs in backup but not in your current data
- Added to your records

**Updated Jobs:**
- Jobs that exist in both
- Newer version wins (based on modification date)

**Unchanged Jobs:**
- Jobs that are the same or older in backup
- Your current version is kept

**Example:**
```
Current data: 100 jobs
Backup data: 120 jobs
Result:
  ✨ 20 new jobs created
  🔄 5 jobs updated
  ✓ 95 jobs unchanged
  📊 Total: 120 jobs
```

## Best Practices

### Regular Backups

**Recommended Schedule:**
- 📅 **Daily**: If you add many jobs
- 📅 **Weekly**: For regular use
- 📅 **Monthly**: Minimum recommendation
- 📅 **Before Updates**: Always backup before app updates

### Multiple Backup Locations

**Recommended Setup:**
1. **Local Backup**: For quick restore
2. **Google Drive**: For cloud safety
3. **Shared Copy**: Email yourself a copy

### Testing Your Backups

**Monthly Test:**
1. Tap "Test Backup" in Settings
2. Verify all tests pass
3. If any fail, contact support

## Troubleshooting

### "No backup file found"

**Solution:**
- Create a backup first using "Create Local Backup"
- Check if backup folder exists

### "Invalid backup file format"

**Solution:**
- File may be corrupted
- Try a different backup file
- Create a fresh backup

### "Permission denied" (Android)

**Solution:**
- Tap "Setup Backup Folder" again
- Grant folder access permission
- Choose a different folder if needed

### "Authentication expired" (Google Drive)

**Solution:**
- Tap "Google Drive Backup" again
- Sign in with your Google account
- Grant permissions

### "Failed to import backup"

**Solution:**
- Check file is valid JSON
- Ensure file isn't corrupted
- Try "Import from File" instead

## FAQ

### Q: How much space do backups use?

**A:** Very little! A typical backup with 100 jobs is about 50-100 KB (JSON) + 200-500 KB (PDF).

### Q: Can I have multiple backups?

**A:** Yes! Each backup is timestamped. You can keep as many as you want.

### Q: Will importing delete my current data?

**A:** No! Importing merges data intelligently. Newer versions win, nothing is deleted.

### Q: Can I backup to Dropbox/OneDrive?

**A:** Yes! Use "Share Backup" and choose your cloud service.

### Q: Do I need internet for backups?

**A:** No for local backups. Yes for Google Drive backups.

### Q: Can I view backups on my computer?

**A:** Yes! JSON files can be opened in any text editor. PDF files open in any PDF reader.

### Q: What if I lose my phone?

**A:** If you have a Google Drive backup or emailed backup, you can restore on a new device!

### Q: Can I edit backup files?

**A:** Not recommended. Manual edits may corrupt the file. Use the app's import/export features.

## Support

### Need Help?

1. **Test Backup**: Tap "Test Backup" to diagnose issues
2. **Check Logs**: Look for error messages in notifications
3. **Try Again**: Many issues resolve with a retry
4. **Contact Support**: Include error message and steps to reproduce

### Reporting Issues

When reporting backup issues, include:
- Device type (Android/iOS)
- App version
- Error message
- Steps to reproduce
- Backup file size (if relevant)

## Tips & Tricks

### 💡 Pro Tips

1. **Name Your Backups**: Backups are auto-named with timestamps
2. **Regular Schedule**: Set a reminder to backup weekly
3. **Multiple Locations**: Keep backups in 2-3 places
4. **Test Restores**: Occasionally test importing a backup
5. **Before Big Changes**: Always backup before clearing data

### 🚀 Advanced Users

1. **JSON Editing**: You can edit JSON backups in a text editor (advanced)
2. **Batch Import**: Import multiple backups to merge data
3. **Data Analysis**: Use JSON files for custom analysis
4. **Automation**: Use "Share Backup" to automate cloud uploads

## Conclusion

Backups are your safety net! Regular backups ensure you never lose your valuable job records. Take 30 seconds each week to create a backup – your future self will thank you! 🎉

---

**Remember:** 
- ✅ Backup regularly
- ✅ Test your backups
- ✅ Keep multiple copies
- ✅ Store in different locations

**Happy tracking! 📊**
