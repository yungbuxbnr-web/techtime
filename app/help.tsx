
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useTheme } from '../contexts/ThemeContext';
import NotificationToast from '../components/NotificationToast';

export default function HelpScreen() {
  const { colors } = useTheme();
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const generatePDFContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>TechTime User Guide</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 40px;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          h2 {
            color: #1e40af;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          h3 {
            color: #3b82f6;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          p {
            margin-bottom: 10px;
          }
          ul {
            margin-left: 20px;
            margin-bottom: 15px;
          }
          li {
            margin-bottom: 8px;
          }
          .section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 8px;
          }
          .tip {
            background-color: #dbeafe;
            padding: 15px;
            border-left: 4px solid #2563eb;
            margin: 15px 0;
          }
          .warning {
            background-color: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 15px 0;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <h1>📖 TechTime User Guide</h1>
        <p><strong>Professional Job Tracking for Vehicle Technicians</strong></p>
        <p><em>Buckston Rugge Edition</em></p>

        <div class="section">
          <h2>🚀 Getting Started</h2>
          <h3>First Time Setup</h3>
          <ul>
            <li><strong>Set Your Name:</strong> Enter your full name when first launching the app. This appears on reports and throughout the interface.</li>
            <li><strong>Create a PIN:</strong> Set up a 4-6 digit PIN to secure your job records and data.</li>
            <li><strong>Biometric Authentication:</strong> Optionally enable Face ID or Fingerprint authentication in Settings for faster access.</li>
          </ul>
        </div>

        <div class="section">
          <h2>📋 Managing Jobs</h2>
          <h3>Adding a New Job</h3>
          <ul>
            <li>Tap the <strong>+ Add Job</strong> button on the Dashboard or Jobs screen</li>
            <li>Enter the <strong>WIP Number</strong> (5-digit format)</li>
            <li>Enter the <strong>Vehicle Registration</strong></li>
            <li>Select the <strong>AW Value</strong> (Allocated Work units, 0-100)</li>
            <li>Optionally select <strong>VHC Color</strong> (Green/Orange/Red for vehicle health check status)</li>
            <li>Add any <strong>Notes</strong> about the job</li>
            <li>Tap <strong>Save Job</strong> to record it</li>
          </ul>

          <div class="tip">
            <strong>💡 Tip:</strong> 1 AW = 5 minutes of work time. The app automatically calculates total time from AWs.
          </div>

          <h3>Scanning Job Cards</h3>
          <ul>
            <li>Tap the <strong>📷 Scan</strong> button when adding a job</li>
            <li>Take a photo of the job card</li>
            <li>The app will automatically extract WIP number and vehicle registration</li>
            <li>Review and confirm the extracted data</li>
          </ul>

          <h3>Editing Jobs</h3>
          <ul>
            <li>Go to the <strong>Jobs</strong> screen</li>
            <li>Tap on any job to edit it</li>
            <li>Make your changes and tap <strong>Save</strong></li>
          </ul>

          <h3>Deleting Jobs</h3>
          <ul>
            <li>Swipe left on a job in the Jobs list</li>
            <li>Tap the <strong>Delete</strong> button</li>
            <li>Confirm the deletion</li>
          </ul>
        </div>

        <div class="section">
          <h2>📊 Dashboard & Statistics</h2>
          <h3>Dashboard Overview</h3>
          <p>The Dashboard shows your key metrics at a glance:</p>
          <ul>
            <li><strong>Total Jobs:</strong> Number of jobs completed this month</li>
            <li><strong>Total AWs:</strong> Sum of all Allocated Work units</li>
            <li><strong>Total Time:</strong> Calculated work time (AWs × 5 minutes)</li>
            <li><strong>Monthly Progress:</strong> Hours worked vs. target (default 180 hours)</li>
            <li><strong>Efficiency:</strong> Percentage of available hours utilized</li>
          </ul>

          <h3>Viewing Detailed Statistics</h3>
          <ul>
            <li>Tap any stat card on the Dashboard to see detailed breakdowns</li>
            <li>Navigate between months using the arrow buttons</li>
            <li>View job-by-job details in the Statistics screen</li>
          </ul>
        </div>

        <div class="section">
          <h2>📅 Work Schedule & Time Tracking</h2>
          <h3>Setting Your Work Schedule</h3>
          <ul>
            <li>Go to <strong>Settings → Work Schedule</strong></li>
            <li>Select your <strong>Work Days</strong> (Monday-Friday by default)</li>
            <li>Set <strong>Hours Per Day</strong> (e.g., 8 hours)</li>
            <li>Configure <strong>Start Time</strong> and <strong>End Time</strong></li>
            <li>Set <strong>Saturday Frequency</strong> (Never, Every Week, or Alternate Weeks)</li>
          </ul>

          <h3>Logging Absences</h3>
          <ul>
            <li>Go to <strong>Settings → Absence Logger</strong></li>
            <li>Select <strong>Full Day</strong> or <strong>Half Day</strong> absence</li>
            <li>The app automatically adjusts your available hours for the month</li>
            <li>Absence hours are deducted from your monthly target</li>
          </ul>

          <div class="tip">
            <strong>💡 Tip:</strong> Logging absences ensures your efficiency calculations remain accurate by accounting for days you weren't working.
          </div>
        </div>

        <div class="section">
          <h2>📤 Exporting Reports</h2>
          <h3>Export Options</h3>
          <ul>
            <li><strong>Daily:</strong> Export jobs for a specific date</li>
            <li><strong>Weekly:</strong> Export jobs for a selected week</li>
            <li><strong>Monthly:</strong> Export all jobs for a specific month</li>
            <li><strong>All Jobs:</strong> Export your complete job history</li>
          </ul>

          <h3>Export Formats</h3>
          <ul>
            <li><strong>PDF:</strong> Professional formatted report with job details, grouped by date</li>
            <li><strong>Excel:</strong> Spreadsheet with job data, includes charts and statistics</li>
          </ul>

          <h3>How to Export</h3>
          <ul>
            <li>Go to <strong>Settings → Export Reports</strong></li>
            <li>Select the <strong>Export Type</strong> (Daily/Weekly/Monthly/All)</li>
            <li>Choose the <strong>Format</strong> (PDF or Excel)</li>
            <li>Select the date range if applicable</li>
            <li>Tap <strong>Export</strong></li>
            <li>Share or save the generated file</li>
          </ul>
        </div>

        <div class="section">
          <h2>🔐 Security & Privacy</h2>
          <h3>PIN Protection</h3>
          <ul>
            <li>Your PIN protects all job records and data</li>
            <li>Change your PIN in <strong>Settings → Security Settings</strong></li>
            <li>You can disable PIN protection if desired</li>
          </ul>

          <div class="warning">
            <strong>⚠️ Important:</strong> If you forget your PIN, you'll need to reinstall the app, which will delete all data. Write down your PIN in a secure location.
          </div>

          <h3>Biometric Authentication</h3>
          <ul>
            <li>Enable Face ID or Fingerprint in <strong>Settings → Security Settings</strong></li>
            <li>Biometric authentication provides faster access while maintaining security</li>
            <li>You can still use your PIN if biometric authentication fails</li>
          </ul>

          <h3>Data Privacy</h3>
          <ul>
            <li>All data is stored locally on your device</li>
            <li>No personal customer data is stored (GDPR compliant)</li>
            <li>Only vehicle registration numbers are recorded</li>
            <li>Your data is never sent to external servers</li>
          </ul>
        </div>

        <div class="section">
          <h2>⚙️ Settings & Customization</h2>
          <h3>Theme</h3>
          <ul>
            <li>Switch between <strong>Light Mode</strong> and <strong>Dark Mode</strong></li>
            <li>Toggle in <strong>Settings → Appearance</strong></li>
          </ul>

          <h3>Notifications</h3>
          <ul>
            <li>Configure notification preferences in <strong>Settings → Notification Settings</strong></li>
            <li>Enable/disable daily reminders, weekly summaries, and monthly reports</li>
            <li>Test notifications to ensure they're working</li>
          </ul>

          <h3>Metrics & Formulas</h3>
          <ul>
            <li>Customize calculation formulas in <strong>Settings → Metrics & Formulas</strong></li>
            <li>Adjust how AWs, efficiency, and performance are calculated</li>
          </ul>
        </div>

        <div class="section">
          <h2>📱 Tips & Best Practices</h2>
          <ul>
            <li><strong>Regular Backups:</strong> Export your data regularly to keep backups</li>
            <li><strong>Consistent Entry:</strong> Log jobs immediately after completion for accuracy</li>
            <li><strong>Use Scanning:</strong> The camera scanner speeds up data entry</li>
            <li><strong>Review Monthly:</strong> Check your monthly statistics to track performance</li>
            <li><strong>Update Work Schedule:</strong> Keep your work schedule current for accurate efficiency calculations</li>
            <li><strong>Log Absences:</strong> Always log sick days, holidays, and time off</li>
          </ul>
        </div>

        <div class="section">
          <h2>🆘 Troubleshooting</h2>
          <h3>Common Issues</h3>
          <ul>
            <li><strong>Forgot PIN:</strong> Unfortunately, you'll need to reinstall the app. Export your data first if possible.</li>
            <li><strong>Scanner Not Working:</strong> Ensure camera permissions are granted in Settings → Permissions</li>
            <li><strong>Notifications Not Appearing:</strong> Check notification permissions and settings</li>
            <li><strong>Export Failed:</strong> Ensure you have storage permissions and sufficient space</li>
          </ul>

          <h3>Permissions</h3>
          <p>TechTime requires the following permissions:</p>
          <ul>
            <li><strong>Camera:</strong> For scanning job cards</li>
            <li><strong>Notifications:</strong> For reminders and alerts</li>
            <li><strong>Storage:</strong> For exporting reports</li>
          </ul>
          <p>Manage permissions in <strong>Settings → App Permissions</strong></p>
        </div>

        <div class="section">
          <h2>📞 Support</h2>
          <p>For additional help or questions about TechTime:</p>
          <ul>
            <li>Review this user guide regularly</li>
            <li>Check the in-app tooltips and descriptions</li>
            <li>Export this guide as PDF for offline reference</li>
          </ul>
        </div>

        <div class="footer">
          <p><strong>TechTime v1.0.0</strong></p>
          <p>Professional Job Tracking for Vehicle Technicians</p>
          <p>Privacy Focused • Secure • Reliable</p>
          <p>✍️ Digitally signed by Buckston Rugge</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleExportPDF = useCallback(async () => {
    try {
      console.log('[TechTime Help] Generating PDF user guide');
      const htmlContent = generatePDFContent();
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('[TechTime Help] PDF generated:', uri);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'TechTime User Guide',
          UTI: 'com.adobe.pdf',
        });
        showNotification('User guide exported successfully', 'success');
      } else {
        showNotification('Sharing not available on this device', 'error');
      }
    } catch (error) {
      console.log('[TechTime Help] Error exporting PDF:', error);
      showNotification('Error exporting user guide', 'error');
    }
  }, [showNotification]);

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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Help & User Guide</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📖</Text>
          <Text style={styles.sectionTitle}>Welcome to TechTime</Text>
          <Text style={styles.sectionText}>
            TechTime is a professional job tracking application designed specifically for vehicle technicians. 
            This comprehensive guide will help you make the most of all features.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🚀</Text>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <Text style={styles.sectionSubtitle}>First Time Setup</Text>
          <Text style={styles.bulletPoint}>• Set your name for personalization and reports</Text>
          <Text style={styles.bulletPoint}>• Create a secure PIN to protect your data</Text>
          <Text style={styles.bulletPoint}>• Optionally enable biometric authentication</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📋</Text>
          <Text style={styles.sectionTitle}>Managing Jobs</Text>
          <Text style={styles.sectionSubtitle}>Adding Jobs</Text>
          <Text style={styles.bulletPoint}>• Tap + Add Job button</Text>
          <Text style={styles.bulletPoint}>• Enter WIP number (5-digit format)</Text>
          <Text style={styles.bulletPoint}>• Enter vehicle registration</Text>
          <Text style={styles.bulletPoint}>• Select AW value (1 AW = 5 minutes)</Text>
          <Text style={styles.bulletPoint}>• Add optional notes and VHC color</Text>
          
          <Text style={styles.sectionSubtitle}>Scanning Job Cards</Text>
          <Text style={styles.bulletPoint}>• Use the camera scanner for quick entry</Text>
          <Text style={styles.bulletPoint}>• Automatically extracts WIP and registration</Text>
          <Text style={styles.bulletPoint}>• Review and confirm extracted data</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📊</Text>
          <Text style={styles.sectionTitle}>Dashboard & Statistics</Text>
          <Text style={styles.bulletPoint}>• View total jobs, AWs, and time worked</Text>
          <Text style={styles.bulletPoint}>• Track monthly progress vs. target hours</Text>
          <Text style={styles.bulletPoint}>• Monitor efficiency percentage</Text>
          <Text style={styles.bulletPoint}>• Tap any stat for detailed breakdowns</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📅</Text>
          <Text style={styles.sectionTitle}>Work Schedule</Text>
          <Text style={styles.bulletPoint}>• Configure work days and hours</Text>
          <Text style={styles.bulletPoint}>• Set start and end times</Text>
          <Text style={styles.bulletPoint}>• Configure Saturday frequency</Text>
          <Text style={styles.bulletPoint}>• Log absences (full or half day)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📤</Text>
          <Text style={styles.sectionTitle}>Exporting Reports</Text>
          <Text style={styles.bulletPoint}>• Export daily, weekly, monthly, or all jobs</Text>
          <Text style={styles.bulletPoint}>• Choose PDF or Excel format</Text>
          <Text style={styles.bulletPoint}>• Professional formatted reports</Text>
          <Text style={styles.bulletPoint}>• Share or save for records</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🔐</Text>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <Text style={styles.bulletPoint}>• PIN protection for all data</Text>
          <Text style={styles.bulletPoint}>• Optional biometric authentication</Text>
          <Text style={styles.bulletPoint}>• All data stored locally on device</Text>
          <Text style={styles.bulletPoint}>• GDPR compliant (no personal customer data)</Text>
          <Text style={styles.warningText}>
            ⚠️ Important: If you forget your PIN, you'll need to reinstall the app. Write it down securely.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>⚙️</Text>
          <Text style={styles.sectionTitle}>Settings & Customization</Text>
          <Text style={styles.bulletPoint}>• Switch between light and dark themes</Text>
          <Text style={styles.bulletPoint}>• Configure notification preferences</Text>
          <Text style={styles.bulletPoint}>• Customize metrics and formulas</Text>
          <Text style={styles.bulletPoint}>• Manage app permissions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>💡</Text>
          <Text style={styles.sectionTitle}>Tips & Best Practices</Text>
          <Text style={styles.bulletPoint}>• Export data regularly for backups</Text>
          <Text style={styles.bulletPoint}>• Log jobs immediately after completion</Text>
          <Text style={styles.bulletPoint}>• Use camera scanner for faster entry</Text>
          <Text style={styles.bulletPoint}>• Review monthly statistics regularly</Text>
          <Text style={styles.bulletPoint}>• Keep work schedule up to date</Text>
          <Text style={styles.bulletPoint}>• Always log absences and time off</Text>
        </View>

        <View style={styles.exportSection}>
          <Text style={styles.exportTitle}>📄 Export Complete User Guide</Text>
          <Text style={styles.exportText}>
            Download a comprehensive PDF version of this user guide for offline reference.
          </Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
            <Text style={styles.exportButtonText}>📥 Export as PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>TechTime v1.0.0</Text>
          <Text style={styles.footerText}>Professional Job Tracking for Vehicle Technicians</Text>
          <Text style={styles.footerText}>Privacy Focused • Secure • Reliable</Text>
          <Text style={styles.signature}>✍️ Digitally signed by Buckston Rugge</Text>
        </View>

        <View style={{ height: 40 }} />
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
  section: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    lineHeight: 20,
  },
  exportSection: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  exportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  exportText: {
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  exportButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    marginTop: 32,
    marginBottom: 20,
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    textAlign: 'center',
    marginBottom: 4,
  },
  signature: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },
});
