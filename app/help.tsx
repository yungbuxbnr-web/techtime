
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import NotificationToast from '../components/NotificationToast';

export default function HelpScreen() {
  const { colors } = useTheme();
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isExporting, setIsExporting] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const generatePDFContent = (): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechTime - Complete User Guide</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    h1 {
      color: #2563eb;
      font-size: 32px;
      margin-bottom: 10px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    
    h2 {
      color: #1e40af;
      font-size: 24px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #2563eb;
      padding-left: 15px;
    }
    
    h3 {
      color: #1e3a8a;
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    ul, ol {
      margin-left: 25px;
      margin-bottom: 15px;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .feature-box {
      background-color: #f0f9ff;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .tip-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .warning-box {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    
    .toc {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .toc-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #1e40af;
    }
    
    .toc-item {
      margin-left: 15px;
      margin-bottom: 8px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      h2 {
        page-break-after: avoid;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>📱 TechTime - Complete User Guide</h1>
  <p><strong>Professional Job Tracking for Vehicle Technicians</strong></p>
  <p><em>Version 1.0.0 | Last Updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>

  <div class="toc">
    <div class="toc-title">📋 Table of Contents</div>
    <div class="toc-item">1. Introduction & Overview</div>
    <div class="toc-item">2. Getting Started</div>
    <div class="toc-item">3. Dashboard & Home Screen</div>
    <div class="toc-item">4. Job Management</div>
    <div class="toc-item">5. Time Tracking & Work Schedule</div>
    <div class="toc-item">6. Reports & Export</div>
    <div class="toc-item">7. Backup & Data Management</div>
    <div class="toc-item">8. Settings & Customization</div>
    <div class="toc-item">9. Tips & Best Practices</div>
    <div class="toc-item">10. Troubleshooting</div>
  </div>

  <div class="section">
    <h2>1. Introduction & Overview</h2>
    <p>TechTime is a comprehensive job tracking application designed specifically for vehicle technicians. It helps you log jobs, track time using AWs (Allocated Work units), generate professional reports, and monitor your monthly work hours efficiently.</p>
    
    <div class="feature-box">
      <h3>✨ Key Features</h3>
      <ul>
        <li><strong>Job Tracking:</strong> Log jobs with WIP numbers, vehicle registrations, AWs, and notes</li>
        <li><strong>Time Calculation:</strong> Automatic time calculation (1 AW = 5 minutes)</li>
        <li><strong>Live Time Tracking:</strong> Real-time work hour tracking with progress visualization</li>
        <li><strong>Professional Reports:</strong> Generate PDF and Excel reports with charts</li>
        <li><strong>Monthly Monitoring:</strong> Track progress against 180-hour monthly target</li>
        <li><strong>GDPR Compliant:</strong> Only stores vehicle registration numbers</li>
        <li><strong>Secure:</strong> PIN and biometric authentication</li>
        <li><strong>Backup & Restore:</strong> Multiple backup options including Google Drive</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>2. Getting Started</h2>
    
    <h3>🔐 First Launch & Authentication</h3>
    <p>When you first launch TechTime, you'll be prompted to set up your account:</p>
    <ol>
      <li><strong>Set Your Name:</strong> Enter your full name (e.g., "Buckston Rugge")</li>
      <li><strong>Create PIN:</strong> Set a 4-6 digit PIN for security (default: 3101)</li>
      <li><strong>Enable Biometrics (Optional):</strong> Use Face ID or fingerprint for quick access</li>
    </ol>
    
    <div class="tip-box">
      <strong>💡 Tip:</strong> Write down your PIN in a secure location. If you forget it, you'll need to reinstall the app and lose all data.
    </div>
    
    <h3>📱 Navigation</h3>
    <p>The app uses a bottom navigation bar with three main sections:</p>
    <ul>
      <li><strong>🏠 Home:</strong> Dashboard with stats and progress tracking</li>
      <li><strong>📋 Jobs:</strong> View and manage all your job records</li>
      <li><strong>⚙️ Settings:</strong> Configure app settings, backup, and export</li>
    </ul>
  </div>

  <div class="section">
    <h2>3. Dashboard & Home Screen</h2>
    
    <h3>📊 Overview</h3>
    <p>The dashboard provides a comprehensive view of your work statistics:</p>
    
    <div class="feature-box">
      <h3>Dashboard Components</h3>
      <ul>
        <li><strong>Live Clock:</strong> Real-time clock synchronized with your device</li>
        <li><strong>Work Progress Bar:</strong> Visual representation of daily work hours (8 AM - 5 PM)</li>
        <li><strong>Monthly Progress Circle:</strong> Shows hours worked vs. 180-hour target</li>
        <li><strong>Efficiency Circle:</strong> Displays your work efficiency percentage</li>
        <li><strong>Quick Stats:</strong> Total jobs, AWs, time logged, and hours remaining</li>
      </ul>
    </div>
    
    <h3>⏰ Live Time Tracking</h3>
    <p>Tap the work progress bar to view detailed time statistics:</p>
    <ul>
      <li>Available hours timer (counts second by second)</li>
      <li>Time elapsed in the day</li>
      <li>Time remaining in the day</li>
      <li>Work progress percentage</li>
      <li>Current schedule details</li>
    </ul>
    
    <div class="tip-box">
      <strong>💡 Tip:</strong> The time tracking runs in the background and updates every second, giving you real-time insights into your workday.
    </div>
  </div>

  <div class="section">
    <h2>4. Job Management</h2>
    
    <h3>➕ Adding a New Job</h3>
    <p>To add a new job record:</p>
    <ol>
      <li>Tap the <strong>"Add Job"</strong> button on the dashboard</li>
      <li>Enter the <strong>WIP Number</strong> (5-digit format)</li>
      <li>Enter the <strong>Vehicle Registration</strong></li>
      <li>Select <strong>AW Value</strong> from the dropdown (0-100)</li>
      <li>Add <strong>Notes</strong> (optional)</li>
      <li>Tap <strong>"Save"</strong> or use the quick save button next to the scan button</li>
    </ol>
    
    <div class="feature-box">
      <h3>📸 Job Card Scanning</h3>
      <p>Use the scan feature to automatically extract job information:</p>
      <ol>
        <li>Tap the <strong>"Scan Job Card"</strong> button</li>
        <li>Take a photo of the job card</li>
        <li>The app will automatically extract WIP number and registration</li>
        <li>Review and edit the extracted information</li>
        <li>Add AWs and save</li>
      </ol>
    </div>
    
    <h3>✏️ Editing Jobs</h3>
    <p>To edit an existing job:</p>
    <ol>
      <li>Go to the <strong>Jobs</strong> tab</li>
      <li>Tap on the job you want to edit</li>
      <li>Modify any field including date and time</li>
      <li>Tap <strong>"Save Changes"</strong></li>
    </ol>
    
    <h3>🗑️ Deleting Jobs</h3>
    <p>To delete a job:</p>
    <ol>
      <li>Open the job details</li>
      <li>Tap the <strong>"Delete"</strong> button</li>
      <li>Confirm the deletion</li>
    </ol>
    
    <div class="warning-box">
      <strong>⚠️ Warning:</strong> Deleted jobs cannot be recovered unless you have a backup.
    </div>
    
    <h3>🔍 Viewing Job Records</h3>
    <p>The Jobs tab displays all your job records with:</p>
    <ul>
      <li>WIP number and vehicle registration</li>
      <li>AW value and calculated time</li>
      <li>Date and time of entry</li>
      <li>Optional notes</li>
    </ul>
  </div>

  <div class="section">
    <h2>5. Time Tracking & Work Schedule</h2>
    
    <h3>⚙️ Configuring Work Schedule</h3>
    <p>Set up your work schedule in Settings → Edit Work Schedule:</p>
    
    <div class="feature-box">
      <h3>Work Schedule Settings</h3>
      <ul>
        <li><strong>Work Hours:</strong> Set start time (e.g., 08:00) and end time (e.g., 17:00)</li>
        <li><strong>Lunch Break:</strong> Configure lunch start (e.g., 12:00) and end (e.g., 13:00)</li>
        <li><strong>Work Days:</strong> Select which days you work (Mon-Sun)</li>
        <li><strong>Saturday Frequency:</strong> Set how often you work Saturdays (e.g., 1 in 3)</li>
        <li><strong>Enable/Disable:</strong> Turn time tracking on or off</li>
      </ul>
    </div>
    
    <h3>📆 Saturday Frequency</h3>
    <p>Configure your Saturday work schedule:</p>
    <ul>
      <li><strong>Never:</strong> Don't work Saturdays</li>
      <li><strong>Every Saturday:</strong> Work every Saturday</li>
      <li><strong>Every 2 weeks (1 in 2):</strong> Work alternate Saturdays</li>
      <li><strong>Every 3 weeks (1 in 3):</strong> Work one Saturday every three weeks</li>
      <li>And more options up to every 6 weeks</li>
    </ul>
    
    <p>The app automatically tracks your next working Saturday and updates the schedule accordingly.</p>
    
    <h3>📊 Time Stats Page</h3>
    <p>Access detailed time statistics by tapping the work progress bar:</p>
    <ul>
      <li><strong>Available Hours Timer:</strong> Live counter showing total available hours (8 AM - 5 PM)</li>
      <li><strong>Time Elapsed:</strong> How much of the workday has passed</li>
      <li><strong>Time Remaining:</strong> How much time is left in the workday</li>
      <li><strong>Progress Circles:</strong> Visual representation of day and work progress</li>
      <li><strong>Status Indicators:</strong> Work day, work hours, and lunch break status</li>
    </ul>
    
    <div class="tip-box">
      <strong>💡 Tip:</strong> All time statistics update every second in real-time, synchronized with your device clock.
    </div>
  </div>

  <div class="section">
    <h2>6. Reports & Export</h2>
    
    <h3>📄 Export Options</h3>
    <p>Generate professional reports from Settings → Export Reports:</p>
    
    <div class="feature-box">
      <h3>Available Export Formats</h3>
      <ul>
        <li><strong>Daily Report:</strong> Jobs completed today</li>
        <li><strong>Weekly Report:</strong> Jobs from the past 7 days</li>
        <li><strong>Monthly Report:</strong> Current month's jobs</li>
        <li><strong>All Jobs Report:</strong> Complete job history grouped by month</li>
      </ul>
    </div>
    
    <h3>📊 PDF Reports</h3>
    <p>PDF reports include:</p>
    <ul>
      <li>Professional header with your name</li>
      <li>Date range and report type</li>
      <li>Detailed job list with WIP, registration, AWs, and time</li>
      <li>Summary statistics (total jobs, AWs, time)</li>
      <li>Monthly separators for "All Jobs" reports</li>
      <li>Digital signature</li>
    </ul>
    
    <h3>📈 Excel Reports</h3>
    <p>Excel exports include:</p>
    <ul>
      <li>Detailed job data in spreadsheet format</li>
      <li>Pie charts showing job distribution</li>
      <li>AW distribution analysis</li>
      <li>Utilization percentage</li>
      <li>Sortable and filterable data</li>
    </ul>
    
    <div class="tip-box">
      <strong>💡 Tip:</strong> Share reports directly from the app to email, cloud storage, or any other app.
    </div>
  </div>

  <div class="section">
    <h2>7. Backup & Data Management</h2>
    
    <h3>💾 Backup Options</h3>
    <p>TechTime offers multiple backup solutions to keep your data safe:</p>
    
    <div class="feature-box">
      <h3>Backup Methods</h3>
      <ol>
        <li><strong>Local Backup:</strong> Save to device storage (Documents/backups/)</li>
        <li><strong>External Folder (Android):</strong> Save to SD card or external storage</li>
        <li><strong>Google Drive Backup:</strong> Cloud backup with OAuth authentication</li>
        <li><strong>JSON Backup:</strong> Quick export for sharing to any app</li>
        <li><strong>App-to-App Sharing:</strong> Transfer backup to another device</li>
      </ol>
    </div>
    
    <h3>☁️ Google Drive Backup</h3>
    <p>To use Google Drive backup:</p>
    <ol>
      <li>Go to Settings → Backup & Import</li>
      <li>Tap <strong>"Google Drive Backup"</strong></li>
      <li>Sign in with your Google account</li>
      <li>Grant necessary permissions</li>
      <li>Tap <strong>"Create Backup"</strong> to save to Drive</li>
      <li>Use <strong>"Restore from Drive"</strong> to recover data</li>
    </ol>
    
    <h3>📥 Importing Data</h3>
    <p>Import data from backups:</p>
    <ul>
      <li><strong>Import Local Backup:</strong> Restore from Documents folder</li>
      <li><strong>Import from File:</strong> Pick JSON backup from anywhere</li>
      <li><strong>Import PDF:</strong> Extract jobs from PDF reports</li>
      <li><strong>Import & Tally:</strong> Analyze backup data with statistics</li>
    </ul>
    
    <div class="warning-box">
      <strong>⚠️ Important:</strong> Always create a backup before major changes or device migration. Importing will replace all current data.
    </div>
    
    <h3>🧪 Testing Backups</h3>
    <p>Use the <strong>"Test Backup"</strong> feature to verify your backup system is working correctly before you need it.</p>
  </div>

  <div class="section">
    <h2>8. Settings & Customization</h2>
    
    <h3>👤 Technician Profile</h3>
    <ul>
      <li>Update your name (appears on reports)</li>
      <li>Change your PIN</li>
      <li>Enable/disable biometric authentication</li>
    </ul>
    
    <h3>🎨 Appearance</h3>
    <ul>
      <li>Toggle between light and dark mode</li>
      <li>Theme preference is saved automatically</li>
    </ul>
    
    <h3>🎯 Monthly Target Hours</h3>
    <ul>
      <li>Set your monthly work hours target (default: 180 hours)</li>
      <li>View target breakdown (hours/week, hours/day)</li>
      <li>Track progress on the dashboard</li>
    </ul>
    
    <h3>🏖️ Absence Logger</h3>
    <p>Log absences to adjust your hours:</p>
    <ul>
      <li>Select number of absent days</li>
      <li>Choose absence type (half day = 4.25h, full day = 8.5h)</li>
      <li>Select deduction type:
        <ul>
          <li><strong>Monthly Target Hours:</strong> Reduces monthly target permanently</li>
          <li><strong>Total Available Hours:</strong> Reduces hours for efficiency calculations</li>
        </ul>
      </li>
      <li>Preview calculation before confirming</li>
      <li>Absence hours reset automatically each month</li>
    </ul>
    
    <h3>📐 Metrics & Formulas</h3>
    <p>Customize calculation formulas (Settings → Edit Formulas):</p>
    <ul>
      <li>AW to time conversion</li>
      <li>Efficiency calculations</li>
      <li>Performance metrics</li>
    </ul>
  </div>

  <div class="section">
    <h2>9. Tips & Best Practices</h2>
    
    <div class="tip-box">
      <h3>💡 Pro Tips</h3>
      <ul>
        <li><strong>Regular Backups:</strong> Create a backup at least once a week</li>
        <li><strong>Consistent Logging:</strong> Log jobs immediately after completion</li>
        <li><strong>Use Scanning:</strong> Save time by scanning job cards instead of manual entry</li>
        <li><strong>Check Time Stats:</strong> Review your time stats daily to stay on track</li>
        <li><strong>Monthly Review:</strong> Export monthly reports for record-keeping</li>
        <li><strong>Verify Data:</strong> Use Import & Tally to verify backup data integrity</li>
        <li><strong>Update Schedule:</strong> Keep your work schedule current for accurate tracking</li>
        <li><strong>Use Notes:</strong> Add notes to jobs for future reference</li>
      </ul>
    </div>
    
    <h3>⚡ Efficiency Tips</h3>
    <ul>
      <li>Use the quick save button next to the scan button for faster job entry</li>
      <li>Enable biometric authentication for instant access</li>
      <li>Set up Google Drive for automatic cloud backups</li>
      <li>Use the absence logger to maintain accurate monthly targets</li>
      <li>Tap progress circles on the dashboard for detailed breakdowns</li>
    </ul>
  </div>

  <div class="section">
    <h2>10. Troubleshooting</h2>
    
    <h3>❓ Common Issues</h3>
    
    <div class="feature-box">
      <h3>🔐 Authentication Issues</h3>
      <p><strong>Problem:</strong> Forgot PIN</p>
      <p><strong>Solution:</strong> Unfortunately, there's no PIN recovery. You'll need to reinstall the app. Make sure to create regular backups to prevent data loss.</p>
      
      <p><strong>Problem:</strong> Biometric not working</p>
      <p><strong>Solution:</strong> Disable and re-enable biometric authentication in Settings. Ensure your device's biometric settings are configured correctly.</p>
    </div>
    
    <div class="feature-box">
      <h3>📊 Data Issues</h3>
      <p><strong>Problem:</strong> Jobs not appearing</p>
      <p><strong>Solution:</strong> Check if you're viewing the correct time period. Try refreshing the jobs list by navigating away and back.</p>
      
      <p><strong>Problem:</strong> Incorrect time calculations</p>
      <p><strong>Solution:</strong> Verify your work schedule settings. Ensure times are in 24-hour format (HH:mm).</p>
    </div>
    
    <div class="feature-box">
      <h3>💾 Backup Issues</h3>
      <p><strong>Problem:</strong> Backup fails</p>
      <p><strong>Solution:</strong> Ensure you have sufficient storage space. For external backups, verify folder permissions. Use "Test Backup" to diagnose issues.</p>
      
      <p><strong>Problem:</strong> Import fails</p>
      <p><strong>Solution:</strong> Verify the backup file is valid JSON format. Check that the file isn't corrupted. Try using "Import from File" instead of "Import Local Backup".</p>
    </div>
    
    <div class="feature-box">
      <h3>⏰ Time Tracking Issues</h3>
      <p><strong>Problem:</strong> Time not updating</p>
      <p><strong>Solution:</strong> Ensure time tracking is enabled in Settings → Edit Work Schedule. Check that today is set as a work day.</p>
      
      <p><strong>Problem:</strong> Saturday not tracking</p>
      <p><strong>Solution:</strong> Verify Saturday frequency is set correctly. Check that today matches your next working Saturday.</p>
    </div>
    
    <h3>🆘 Getting Help</h3>
    <p>If you encounter issues not covered here:</p>
    <ol>
      <li>Check your work schedule and settings configuration</li>
      <li>Try creating a backup and reinstalling the app</li>
      <li>Ensure your device OS is up to date</li>
      <li>Review this guide for detailed instructions</li>
    </ol>
  </div>

  <div class="section">
    <h2>📱 Technical Specifications</h2>
    
    <h3>System Requirements</h3>
    <ul>
      <li><strong>Platform:</strong> iOS 13.0+ / Android 6.0+</li>
      <li><strong>Storage:</strong> Minimum 50MB free space</li>
      <li><strong>Permissions:</strong> Camera (for scanning), Storage (for backups)</li>
    </ul>
    
    <h3>Data Storage</h3>
    <ul>
      <li><strong>Local Storage:</strong> All data stored securely on device</li>
      <li><strong>GDPR Compliant:</strong> Only vehicle registrations stored (no personal customer data)</li>
      <li><strong>Encryption:</strong> PIN and biometric authentication</li>
    </ul>
    
    <h3>Calculations</h3>
    <ul>
      <li><strong>AW Conversion:</strong> 1 AW = 5 minutes</li>
      <li><strong>Work Day:</strong> 8 AM - 5 PM (9 hours total)</li>
      <li><strong>Lunch Break:</strong> 12 PM - 1 PM (1 hour)</li>
      <li><strong>Net Work Time:</strong> 8 hours per day (excluding lunch)</li>
      <li><strong>Monthly Target:</strong> 180 hours (default, customizable)</li>
    </ul>
  </div>

  <div class="section">
    <h2>📝 Glossary</h2>
    
    <ul>
      <li><strong>AW (Allocated Work):</strong> Unit of work measurement (1 AW = 5 minutes)</li>
      <li><strong>WIP Number:</strong> Work In Progress number (5-digit job identifier)</li>
      <li><strong>Registration:</strong> Vehicle registration number</li>
      <li><strong>Efficiency:</strong> Percentage of available hours utilized</li>
      <li><strong>Utilization:</strong> Percentage of monthly target hours completed</li>
      <li><strong>Time Tracking:</strong> Automatic monitoring of work hours</li>
      <li><strong>Saturday Frequency:</strong> How often you work Saturdays (e.g., 1 in 3)</li>
    </ul>
  </div>

  <div class="footer">
    <p><strong>TechTime - Professional Job Tracking</strong></p>
    <p>Version 1.0.0 | GDPR Compliant | Secure | Reliable</p>
    <p>© ${new Date().getFullYear()} TechTime. All rights reserved.</p>
    <p><em>This guide was generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</em></p>
  </div>
</body>
</html>
    `;
  };

  const handleExportPDF = async () => {
    if (isExporting) return;

    setIsExporting(true);
    showNotification('Generating PDF user guide...', 'info');

    try {
      const htmlContent = generatePDFContent();
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('PDF generated:', uri);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share TechTime User Guide',
          UTI: 'com.adobe.pdf',
        });
        showNotification('User guide exported successfully!', 'success');
      } else {
        showNotification('Sharing is not available on this device', 'error');
      }
    } catch (error) {
      console.log('Error exporting PDF:', error);
      showNotification('Error exporting user guide', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>User Guide</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>📱</Text>
          <Text style={styles.heroTitle}>TechTime User Guide</Text>
          <Text style={styles.heroSubtitle}>
            Complete documentation for professional job tracking
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }, isExporting && styles.buttonDisabled]}
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            <Text style={styles.exportButtonIcon}>📄</Text>
            <View style={styles.exportButtonContent}>
              <Text style={styles.exportButtonText}>
                {isExporting ? 'Generating PDF...' : 'Export as PDF'}
              </Text>
              <Text style={styles.exportButtonSubtext}>
                Share complete guide to any app
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Table of Contents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Table of Contents</Text>
          <View style={styles.tocList}>
            <Text style={styles.tocItem}>1. Introduction & Overview</Text>
            <Text style={styles.tocItem}>2. Getting Started</Text>
            <Text style={styles.tocItem}>3. Dashboard & Home Screen</Text>
            <Text style={styles.tocItem}>4. Job Management</Text>
            <Text style={styles.tocItem}>5. Time Tracking & Work Schedule</Text>
            <Text style={styles.tocItem}>6. Reports & Export</Text>
            <Text style={styles.tocItem}>7. Backup & Data Management</Text>
            <Text style={styles.tocItem}>8. Settings & Customization</Text>
            <Text style={styles.tocItem}>9. Tips & Best Practices</Text>
            <Text style={styles.tocItem}>10. Troubleshooting</Text>
          </View>
        </View>

        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction & Overview</Text>
          <Text style={styles.paragraph}>
            TechTime is a comprehensive job tracking application designed specifically for vehicle technicians. 
            It helps you log jobs, track time using AWs (Allocated Work units), generate professional reports, 
            and monitor your monthly work hours efficiently.
          </Text>
          
          <View style={styles.featureBox}>
            <Text style={styles.featureTitle}>✨ Key Features</Text>
            <Text style={styles.bulletPoint}>• Job Tracking with WIP numbers and registrations</Text>
            <Text style={styles.bulletPoint}>• Automatic time calculation (1 AW = 5 minutes)</Text>
            <Text style={styles.bulletPoint}>• Live time tracking with second-by-second updates</Text>
            <Text style={styles.bulletPoint}>• Professional PDF and Excel reports</Text>
            <Text style={styles.bulletPoint}>• Monthly progress monitoring (180-hour target)</Text>
            <Text style={styles.bulletPoint}>• Privacy-focused data storage (no personal customer data)</Text>
            <Text style={styles.bulletPoint}>• PIN and biometric authentication</Text>
            <Text style={styles.bulletPoint}>• Multiple backup options including Google Drive</Text>
          </View>
        </View>

        {/* Getting Started */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Getting Started</Text>
          
          <Text style={styles.subsectionTitle}>🔐 First Launch & Authentication</Text>
          <Text style={styles.paragraph}>
            When you first launch TechTime, you&apos;ll be prompted to set up your account:
          </Text>
          <Text style={styles.bulletPoint}>1. Set Your Name: Enter your full name</Text>
          <Text style={styles.bulletPoint}>2. Create PIN: Set a 4-6 digit PIN (default: 3101)</Text>
          <Text style={styles.bulletPoint}>3. Enable Biometrics: Optional Face ID or fingerprint</Text>
          
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 Tip: Write down your PIN in a secure location. If you forget it, you&apos;ll need to 
              reinstall the app and lose all data.
            </Text>
          </View>
          
          <Text style={styles.subsectionTitle}>📱 Navigation</Text>
          <Text style={styles.paragraph}>
            The app uses a bottom navigation bar with three main sections:
          </Text>
          <Text style={styles.bulletPoint}>• 🏠 Home: Dashboard with stats and progress</Text>
          <Text style={styles.bulletPoint}>• 📋 Jobs: View and manage job records</Text>
          <Text style={styles.bulletPoint}>• ⚙️ Settings: Configure app and backup</Text>
        </View>

        {/* Dashboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Dashboard & Home Screen</Text>
          
          <Text style={styles.paragraph}>
            The dashboard provides a comprehensive view of your work statistics:
          </Text>
          
          <View style={styles.featureBox}>
            <Text style={styles.featureTitle}>Dashboard Components</Text>
            <Text style={styles.bulletPoint}>• Live Clock: Real-time synchronized clock</Text>
            <Text style={styles.bulletPoint}>• Work Progress Bar: Daily hours visualization</Text>
            <Text style={styles.bulletPoint}>• Monthly Progress: Hours vs. 180-hour target</Text>
            <Text style={styles.bulletPoint}>• Efficiency Circle: Work efficiency percentage</Text>
            <Text style={styles.bulletPoint}>• Quick Stats: Jobs, AWs, time, hours remaining</Text>
          </View>
          
          <Text style={styles.subsectionTitle}>⏰ Live Time Tracking</Text>
          <Text style={styles.paragraph}>
            Tap the work progress bar to view detailed time statistics with second-by-second updates:
          </Text>
          <Text style={styles.bulletPoint}>• Available hours timer (8 AM - 5 PM)</Text>
          <Text style={styles.bulletPoint}>• Time elapsed in the day</Text>
          <Text style={styles.bulletPoint}>• Time remaining in the day</Text>
          <Text style={styles.bulletPoint}>• Work progress percentage</Text>
          <Text style={styles.bulletPoint}>• Current schedule details</Text>
        </View>

        {/* Job Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Job Management</Text>
          
          <Text style={styles.subsectionTitle}>➕ Adding a New Job</Text>
          <Text style={styles.bulletPoint}>1. Tap &quot;Add Job&quot; button</Text>
          <Text style={styles.bulletPoint}>2. Enter WIP Number (5-digit format)</Text>
          <Text style={styles.bulletPoint}>3. Enter Vehicle Registration</Text>
          <Text style={styles.bulletPoint}>4. Select AW Value (0-100)</Text>
          <Text style={styles.bulletPoint}>5. Add Notes (optional)</Text>
          <Text style={styles.bulletPoint}>6. Tap &quot;Save&quot; or use quick save button</Text>
          
          <View style={styles.featureBox}>
            <Text style={styles.featureTitle}>📸 Job Card Scanning</Text>
            <Text style={styles.paragraph}>
              Use the scan feature to automatically extract job information from job cards. 
              The app will extract WIP number and registration, then you can add AWs and save.
            </Text>
          </View>
          
          <Text style={styles.subsectionTitle}>✏️ Editing & Deleting Jobs</Text>
          <Text style={styles.paragraph}>
            Tap any job in the Jobs tab to edit or delete it. You can modify all fields including 
            date and time.
          </Text>
          
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Warning: Deleted jobs cannot be recovered unless you have a backup.
            </Text>
          </View>
        </View>

        {/* Time Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Time Tracking & Work Schedule</Text>
          
          <Text style={styles.subsectionTitle}>⚙️ Configuring Work Schedule</Text>
          <Text style={styles.paragraph}>
            Set up your work schedule in Settings → Edit Work Schedule:
          </Text>
          <Text style={styles.bulletPoint}>• Work Hours: Start and end times (24-hour format)</Text>
          <Text style={styles.bulletPoint}>• Lunch Break: Lunch start and end times</Text>
          <Text style={styles.bulletPoint}>• Work Days: Select which days you work</Text>
          <Text style={styles.bulletPoint}>• Saturday Frequency: Configure Saturday schedule</Text>
          <Text style={styles.bulletPoint}>• Enable/Disable: Turn time tracking on or off</Text>
          
          <Text style={styles.subsectionTitle}>📆 Saturday Frequency</Text>
          <Text style={styles.paragraph}>
            Configure how often you work Saturdays:
          </Text>
          <Text style={styles.bulletPoint}>• Never: Don&apos;t work Saturdays</Text>
          <Text style={styles.bulletPoint}>• Every Saturday: Work every Saturday</Text>
          <Text style={styles.bulletPoint}>• Every 2-6 weeks: Work 1 in 2, 1 in 3, etc.</Text>
          
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 Tip: The app automatically tracks your next working Saturday and updates the schedule.
            </Text>
          </View>
        </View>

        {/* Reports & Export */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Reports & Export</Text>
          
          <Text style={styles.paragraph}>
            Generate professional reports from Settings → Export Reports:
          </Text>
          
          <View style={styles.featureBox}>
            <Text style={styles.featureTitle}>Available Export Formats</Text>
            <Text style={styles.bulletPoint}>• Daily Report: Today&apos;s jobs</Text>
            <Text style={styles.bulletPoint}>• Weekly Report: Past 7 days</Text>
            <Text style={styles.bulletPoint}>• Monthly Report: Current month</Text>
            <Text style={styles.bulletPoint}>• All Jobs: Complete history by month</Text>
          </View>
          
          <Text style={styles.subsectionTitle}>📊 PDF Reports</Text>
          <Text style={styles.paragraph}>
            PDF reports include professional formatting, job details, summary statistics, and digital signature.
          </Text>
          
          <Text style={styles.subsectionTitle}>📈 Excel Reports</Text>
          <Text style={styles.paragraph}>
            Excel exports include detailed data, pie charts, AW distribution, and utilization analysis.
          </Text>
        </View>

        {/* Backup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Backup & Data Management</Text>
          
          <View style={styles.featureBox}>
            <Text style={styles.featureTitle}>Backup Methods</Text>
            <Text style={styles.bulletPoint}>1. Local Backup: Device storage</Text>
            <Text style={styles.bulletPoint}>2. External Folder: SD card (Android)</Text>
            <Text style={styles.bulletPoint}>3. Google Drive: Cloud backup</Text>
            <Text style={styles.bulletPoint}>4. JSON Backup: Quick export</Text>
            <Text style={styles.bulletPoint}>5. App-to-App: Device transfer</Text>
          </View>
          
          <Text style={styles.subsectionTitle}>☁️ Google Drive Backup</Text>
          <Text style={styles.paragraph}>
            Sign in with your Google account to enable cloud backup and restore functionality.
          </Text>
          
          <Text style={styles.subsectionTitle}>📥 Importing Data</Text>
          <Text style={styles.paragraph}>
            Import from local backups, files, PDFs, or use Import & Tally for detailed analysis.
          </Text>
          
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Important: Always create a backup before major changes. Importing replaces all current data.
            </Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Settings & Customization</Text>
          
          <Text style={styles.subsectionTitle}>👤 Technician Profile</Text>
          <Text style={styles.bulletPoint}>• Update your name</Text>
          <Text style={styles.bulletPoint}>• Change your PIN</Text>
          <Text style={styles.bulletPoint}>• Enable/disable biometrics</Text>
          
          <Text style={styles.subsectionTitle}>🎨 Appearance</Text>
          <Text style={styles.bulletPoint}>• Toggle light/dark mode</Text>
          
          <Text style={styles.subsectionTitle}>🎯 Monthly Target Hours</Text>
          <Text style={styles.bulletPoint}>• Set monthly target (default: 180 hours)</Text>
          <Text style={styles.bulletPoint}>• View breakdown (hours/week, hours/day)</Text>
          
          <Text style={styles.subsectionTitle}>🏖️ Absence Logger</Text>
          <Text style={styles.paragraph}>
            Log absences to adjust your hours:
          </Text>
          <Text style={styles.bulletPoint}>• Select number of days and type (half/full)</Text>
          <Text style={styles.bulletPoint}>• Choose deduction type (monthly target or available hours)</Text>
          <Text style={styles.bulletPoint}>• Preview calculation before confirming</Text>
          <Text style={styles.bulletPoint}>• Absence hours reset monthly</Text>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Tips & Best Practices</Text>
          
          <View style={styles.tipBox}>
            <Text style={styles.featureTitle}>💡 Pro Tips</Text>
            <Text style={styles.bulletPoint}>• Create backups weekly</Text>
            <Text style={styles.bulletPoint}>• Log jobs immediately after completion</Text>
            <Text style={styles.bulletPoint}>• Use scanning for faster entry</Text>
            <Text style={styles.bulletPoint}>• Check time stats daily</Text>
            <Text style={styles.bulletPoint}>• Export monthly reports for records</Text>
            <Text style={styles.bulletPoint}>• Keep work schedule current</Text>
            <Text style={styles.bulletPoint}>• Use notes for future reference</Text>
          </View>
        </View>

        {/* Troubleshooting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Troubleshooting</Text>
          
          <Text style={styles.subsectionTitle}>🔐 Authentication Issues</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Forgot PIN:</Text> No recovery available. Reinstall app and restore from backup.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Biometric not working:</Text> Disable and re-enable in Settings.
          </Text>
          
          <Text style={styles.subsectionTitle}>📊 Data Issues</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Jobs not appearing:</Text> Check time period filter and refresh.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Incorrect calculations:</Text> Verify work schedule settings.
          </Text>
          
          <Text style={styles.subsectionTitle}>💾 Backup Issues</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Backup fails:</Text> Check storage space and permissions. Use &quot;Test Backup&quot;.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Import fails:</Text> Verify file format and integrity.
          </Text>
          
          <Text style={styles.subsectionTitle}>⏰ Time Tracking Issues</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Time not updating:</Text> Enable time tracking and verify work days.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Saturday not tracking:</Text> Check Saturday frequency setting.
          </Text>
        </View>

        {/* Technical Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Technical Specifications</Text>
          
          <Text style={styles.subsectionTitle}>System Requirements</Text>
          <Text style={styles.bulletPoint}>• Platform: iOS 13.0+ / Android 6.0+</Text>
          <Text style={styles.bulletPoint}>• Storage: Minimum 50MB free space</Text>
          <Text style={styles.bulletPoint}>• Permissions: Camera, Storage</Text>
          
          <Text style={styles.subsectionTitle}>Data Storage</Text>
          <Text style={styles.bulletPoint}>• Local storage on device</Text>
          <Text style={styles.bulletPoint}>• GDPR compliant (no personal customer data)</Text>
          <Text style={styles.bulletPoint}>• PIN and biometric encryption</Text>
          
          <Text style={styles.subsectionTitle}>Calculations</Text>
          <Text style={styles.bulletPoint}>• 1 AW = 5 minutes</Text>
          <Text style={styles.bulletPoint}>• Work Day: 8 AM - 5 PM (9 hours)</Text>
          <Text style={styles.bulletPoint}>• Lunch: 12 PM - 1 PM (1 hour)</Text>
          <Text style={styles.bulletPoint}>• Net Work Time: 8 hours/day</Text>
          <Text style={styles.bulletPoint}>• Monthly Target: 180 hours (customizable)</Text>
        </View>

        {/* Glossary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Glossary</Text>
          
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>AW (Allocated Work):</Text> Unit of work (1 AW = 5 minutes)
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>WIP Number:</Text> Work In Progress number (5-digit job ID)
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Registration:</Text> Vehicle registration number
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Efficiency:</Text> Percentage of available hours utilized
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Utilization:</Text> Percentage of monthly target completed
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Time Tracking:</Text> Automatic work hours monitoring
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Saturday Frequency:</Text> How often you work Saturdays
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>TechTime - Professional Job Tracking</Text>
          <Text style={styles.footerText}>Version 1.0.0 | Privacy Focused | Secure | Reliable</Text>
          <Text style={styles.footerText}>© {new Date().getFullYear()} TechTime. All rights reserved.</Text>
          <Text style={styles.footerDate}>
            Guide generated on {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  exportButtonIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  exportButtonSubtext: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
    marginLeft: 8,
  },
  bold: {
    fontWeight: '700',
  },
  tocList: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tocItem: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 8,
    marginLeft: 8,
  },
  featureBox: {
    backgroundColor: colors.backgroundAlt,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  tipBox: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    fontWeight: '600',
  },
  footerSection: {
    marginTop: 32,
    marginBottom: 32,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  footerDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
