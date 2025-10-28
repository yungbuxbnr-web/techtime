
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import NotificationToast from '../components/NotificationToast';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const generateHelpPDFHTML = useCallback(() => {
    const currentDate = new Date().toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Technician Records - Complete User Guide</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              color: #333;
              line-height: 1.6;
              font-size: 13px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
              border: 1px solid #e8eaed;
            }
            .header {
              background: linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #34a853 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
              position: relative;
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #ea4335 0%, #fbbc04 25%, #34a853 50%, #4285f4 75%, #9c27b0 100%);
            }
            .header h1 {
              margin: 0 0 8px 0;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -1px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .header h2 {
              margin: 0 0 12px 0;
              font-size: 18px;
              font-weight: 400;
              opacity: 0.95;
            }
            .header .date-time {
              font-size: 12px;
              opacity: 0.9;
              margin: 0;
            }
            .content {
              padding: 30px;
            }
            .section {
              margin-bottom: 28px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 20px;
              font-weight: 700;
              color: #1a73e8;
              margin: 0 0 12px 0;
              padding-bottom: 8px;
              border-bottom: 2px solid #e8eaed;
            }
            .subsection-title {
              font-size: 16px;
              font-weight: 600;
              color: #333;
              margin: 16px 0 8px 0;
            }
            .description {
              font-size: 13px;
              color: #555;
              line-height: 1.7;
              margin-bottom: 12px;
            }
            .feature-list {
              margin: 12px 0;
              padding-left: 0;
              list-style: none;
            }
            .feature-list li {
              padding: 8px 0 8px 28px;
              position: relative;
              font-size: 13px;
              color: #555;
              line-height: 1.6;
            }
            .feature-list li::before {
              content: '✓';
              position: absolute;
              left: 8px;
              color: #34a853;
              font-weight: 700;
              font-size: 14px;
            }
            .step-list {
              margin: 12px 0;
              padding-left: 0;
              list-style: none;
              counter-reset: step-counter;
            }
            .step-list li {
              padding: 10px 0 10px 36px;
              position: relative;
              font-size: 13px;
              color: #555;
              line-height: 1.6;
              counter-increment: step-counter;
            }
            .step-list li::before {
              content: counter(step-counter);
              position: absolute;
              left: 8px;
              top: 10px;
              background: #1a73e8;
              color: white;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 11px;
            }
            .info-box {
              background: linear-gradient(135deg, #e8f0fe 0%, #f1f8e9 100%);
              border-left: 4px solid #1a73e8;
              padding: 16px;
              margin: 16px 0;
              border-radius: 8px;
            }
            .info-box-title {
              font-size: 14px;
              font-weight: 700;
              color: #1a73e8;
              margin: 0 0 8px 0;
            }
            .info-box-text {
              font-size: 12px;
              color: #555;
              line-height: 1.6;
              margin: 4px 0;
            }
            .warning-box {
              background: #fff3cd;
              border-left: 4px solid #ff9800;
              padding: 16px;
              margin: 16px 0;
              border-radius: 8px;
            }
            .warning-box-title {
              font-size: 14px;
              font-weight: 700;
              color: #ff9800;
              margin: 0 0 8px 0;
            }
            .warning-box-text {
              font-size: 12px;
              color: #555;
              line-height: 1.6;
              margin: 4px 0;
            }
            .tip-box {
              background: #e8f5e9;
              border-left: 4px solid #34a853;
              padding: 16px;
              margin: 16px 0;
              border-radius: 8px;
            }
            .tip-box-title {
              font-size: 14px;
              font-weight: 700;
              color: #34a853;
              margin: 0 0 8px 0;
            }
            .tip-box-text {
              font-size: 12px;
              color: #555;
              line-height: 1.6;
              margin: 4px 0;
            }
            .footer {
              padding: 24px 30px;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border-top: 1px solid #e8eaed;
              text-align: center;
            }
            .signature {
              font-size: 16px;
              font-weight: 700;
              color: #1a73e8;
              margin: 0 0 8px 0;
            }
            .app-version {
              font-size: 11px;
              color: #5f6368;
              margin: 0 0 12px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .disclaimer {
              font-size: 10px;
              color: #9aa0a6;
              margin: 12px 0 0 0;
              font-style: italic;
              line-height: 1.4;
            }
            @media print {
              body { 
                background: white; 
                padding: 15px;
              }
              .container { 
                box-shadow: none; 
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📖 Technician Records</h1>
              <h2>Complete User Guide & Documentation</h2>
              <div class="date-time">Generated on ${currentDate} at ${currentTime}</div>
            </div>
            
            <div class="content">
              <!-- Introduction -->
              <div class="section">
                <div class="section-title">🎯 Introduction</div>
                <p class="description">
                  Welcome to the Technician Records App! This comprehensive guide will help you understand all features and functionalities of the application. The app is designed specifically for vehicle technicians to track jobs, calculate work hours using AWs (Allocated Work Units), and generate professional reports while maintaining full GDPR compliance.
                </p>
                <div class="info-box">
                  <div class="info-box-title">💡 What is an AW?</div>
                  <p class="info-box-text">
                    AW stands for Allocated Work Unit. By default, 1 AW equals 5 minutes of work time. This standardized unit helps you accurately track and calculate job durations. You can customize this conversion in the Metrics & Formulas settings.
                  </p>
                  <p class="info-box-text">
                    <strong>Example:</strong> A job with 12 AWs = 12 × 5 minutes = 60 minutes (1 hour)
                  </p>
                </div>
              </div>

              <!-- Getting Started -->
              <div class="section">
                <div class="section-title">🚀 Getting Started</div>
                
                <div class="subsection-title">First Time Setup</div>
                <ol class="step-list">
                  <li>Launch the app and you'll be greeted with the PIN authentication screen</li>
                  <li>Enter the default PIN: <strong>3101</strong></li>
                  <li>You'll be taken to the Dashboard (Home screen)</li>
                  <li>Navigate to Settings to customize your PIN and monthly target hours</li>
                  <li>Set up biometric authentication (fingerprint/Face ID) for quick access</li>
                </ol>

                <div class="tip-box">
                  <div class="tip-box-title">💡 Pro Tip</div>
                  <p class="tip-box-text">
                    Change your PIN immediately after first login for enhanced security. Go to Settings → Security Settings → Update PIN.
                  </p>
                </div>
              </div>

              <!-- Dashboard Overview -->
              <div class="section">
                <div class="section-title">🏠 Dashboard (Home Screen)</div>
                <p class="description">
                  The Dashboard is your command center, displaying real-time statistics and progress tracking.
                </p>

                <div class="subsection-title">Key Features</div>
                <ul class="feature-list">
                  <li><strong>Monthly Target Circle:</strong> Shows your progress toward the monthly target hours (default: 180 hours). Tap to view detailed statistics including sold hours and target breakdown.</li>
                  <li><strong>Efficiency Circle:</strong> Displays your efficiency percentage based on sold hours vs. available hours. Tap to see detailed calculations and performance metrics.</li>
                  <li><strong>Quick Stats:</strong> View total jobs, total AWs, and total time at a glance</li>
                  <li><strong>Add Job Button:</strong> Quick access to log new jobs</li>
                  <li><strong>Job Records Button:</strong> Access advanced search and filtering</li>
                </ul>

                <div class="info-box">
                  <div class="info-box-title">📊 Understanding Efficiency</div>
                  <p class="info-box-text">
                    Efficiency is calculated as: (Sold Hours ÷ Available Hours) × 100
                  </p>
                  <p class="info-box-text">
                    <strong>Sold Hours:</strong> Total hours from completed jobs (AWs × AW time conversion ÷ 60)
                  </p>
                  <p class="info-box-text">
                    <strong>Available Hours:</strong> Working hours available to date (weekdays only, 8 AM - 5 PM with 30-min lunch, minus absences)
                  </p>
                  <p class="info-box-text">
                    <strong>Color Coding:</strong> Green (65-100%), Yellow (31-64%), Red (0-30%)
                  </p>
                  <p class="info-box-text">
                    <strong>Note:</strong> You can customize these thresholds in Metrics & Formulas settings
                  </p>
                </div>
              </div>

              <!-- Adding Jobs -->
              <div class="section">
                <div class="section-title">➕ Adding Jobs</div>
                <p class="description">
                  Log your completed jobs quickly and efficiently with all necessary details.
                </p>

                <div class="subsection-title">How to Add a Job</div>
                <ol class="step-list">
                  <li>Tap the "Add Job" button on the Dashboard or Jobs screen</li>
                  <li>Enter the WIP Number (5-digit format, e.g., 12345)</li>
                  <li>Enter the Vehicle Registration (e.g., ABC123)</li>
                  <li>Select AWs from the dropdown (0-100)</li>
                  <li>Add optional notes about the job</li>
                  <li>Tap "Save Job" to record the entry</li>
                </ol>

                <div class="info-box">
                  <div class="info-box-title">📝 Job Entry Fields</div>
                  <p class="info-box-text">
                    <strong>WIP Number:</strong> Work In Progress number (required, 5 digits)
                  </p>
                  <p class="info-box-text">
                    <strong>Vehicle Registration:</strong> Vehicle reg number (required, GDPR compliant)
                  </p>
                  <p class="info-box-text">
                    <strong>AWs:</strong> Allocated Work Units (required, 0-100)
                  </p>
                  <p class="info-box-text">
                    <strong>Notes:</strong> Optional job description or comments
                  </p>
                  <p class="info-box-text">
                    <strong>Date & Time:</strong> Automatically recorded when you save
                  </p>
                </div>

                <div class="tip-box">
                  <div class="tip-box-title">⌨️ Keyboard Tip</div>
                  <p class="tip-box-text">
                    The app automatically adjusts the screen when the keyboard appears, ensuring text fields are always visible while typing.
                  </p>
                </div>
              </div>

              <!-- Jobs Screen -->
              <div class="section">
                <div class="section-title">📋 Jobs Screen</div>
                <p class="description">
                  View, edit, and manage all your recorded jobs organized by month.
                </p>

                <div class="subsection-title">Features</div>
                <ul class="feature-list">
                  <li><strong>Monthly View:</strong> Jobs are organized by month with clear separators</li>
                  <li><strong>Month Navigation:</strong> Use arrow buttons to browse different months</li>
                  <li><strong>Job Details:</strong> Each job shows WIP, registration, AWs, time, notes, and date</li>
                  <li><strong>Edit Jobs:</strong> Tap any job to edit its details</li>
                  <li><strong>Delete Jobs:</strong> Swipe or tap delete to remove jobs (with confirmation)</li>
                  <li><strong>Quick Add:</strong> Add new jobs directly from this screen</li>
                </ul>
              </div>

              <!-- Job Records Screen -->
              <div class="section">
                <div class="section-title">🔍 Job Records (Advanced Search)</div>
                <p class="description">
                  Powerful search and filtering capabilities to find specific jobs quickly.
                </p>

                <div class="subsection-title">Search & Filter Options</div>
                <ul class="feature-list">
                  <li><strong>Search Bar:</strong> Search by WIP number, vehicle registration, or notes</li>
                  <li><strong>Filter by WIP:</strong> Sort and filter by WIP number</li>
                  <li><strong>Filter by Registration:</strong> Find all jobs for a specific vehicle</li>
                  <li><strong>Filter by AWs:</strong> Sort jobs by AW value</li>
                  <li><strong>Filter by Date:</strong> Sort chronologically</li>
                  <li><strong>Real-time Results:</strong> Search results update as you type</li>
                </ul>
              </div>

              <!-- Statistics Screen -->
              <div class="section">
                <div class="section-title">📊 Statistics Screen</div>
                <p class="description">
                  Detailed analytics and performance metrics with job selection capabilities.
                </p>

                <div class="subsection-title">Features</div>
                <ul class="feature-list">
                  <li><strong>Monthly Target Stats:</strong> View sold hours vs. target hours</li>
                  <li><strong>Efficiency Metrics:</strong> Detailed efficiency calculations and breakdowns</li>
                  <li><strong>Job Selection:</strong> Select individual jobs to calculate specific totals</li>
                  <li><strong>Select All/Clear:</strong> Bulk selection tools</li>
                  <li><strong>Real-time Calculations:</strong> Stats update immediately when jobs are edited</li>
                  <li><strong>Visual Indicators:</strong> Color-coded efficiency ratings</li>
                </ul>
              </div>

              <!-- Settings -->
              <div class="section">
                <div class="section-title">⚙️ Settings</div>
                <p class="description">
                  Customize your app experience and manage your data.
                </p>

                <div class="subsection-title">Appearance</div>
                <ul class="feature-list">
                  <li><strong>Theme Toggle:</strong> Switch between light and dark mode</li>
                  <li><strong>Automatic Saving:</strong> Theme preference is saved automatically</li>
                </ul>

                <div class="subsection-title">Monthly Target Hours</div>
                <ul class="feature-list">
                  <li><strong>Set Target:</strong> Customize your monthly work hours goal (default: 180)</li>
                  <li><strong>Target Info:</strong> View equivalent weekly and daily hours</li>
                  <li><strong>Progress Tracking:</strong> Dashboard circles update based on your target</li>
                </ul>

                <div class="subsection-title">Absence Logger</div>
                <p class="description">
                  Track absences and automatically adjust your hours calculations.
                </p>
                <ul class="feature-list">
                  <li><strong>Number of Days:</strong> Select 1-31 absent days</li>
                  <li><strong>Absence Type:</strong> Half Day (4.25h) or Full Day (8.5h)</li>
                  <li><strong>Deduction Type:</strong> Choose between:
                    <ul style="margin-top: 8px; padding-left: 20px;">
                      <li style="padding: 4px 0;">Monthly Target Hours - Reduces your monthly target permanently</li>
                      <li style="padding: 4px 0;">Total Available Hours - Reduces hours for efficiency calculations</li>
                    </ul>
                  </li>
                  <li><strong>Preview:</strong> See calculation before confirming</li>
                  <li><strong>Auto Reset:</strong> Absence hours reset each new month</li>
                </ul>

                <div class="info-box">
                  <div class="info-box-title">🏖️ Absence Calculation Example</div>
                  <p class="info-box-text">
                    2 Full Days absent = 2 × 8.5 hours = 17 hours deducted
                  </p>
                  <p class="info-box-text">
                    If deducting from Monthly Target: 180h - 17h = 163h new target
                  </p>
                  <p class="info-box-text">
                    If deducting from Available Hours: Efficiency calculation adjusts automatically
                  </p>
                </div>

                <div class="subsection-title">Security Settings</div>
                <ul class="feature-list">
                  <li><strong>Change PIN:</strong> Update your security PIN (minimum 4 digits)</li>
                  <li><strong>PIN Confirmation:</strong> Must confirm new PIN to prevent errors</li>
                  <li><strong>Secure Storage:</strong> PIN is encrypted and stored securely</li>
                  <li><strong>Biometric Authentication:</strong> Enable fingerprint or Face ID login</li>
                  <li><strong>Fallback Option:</strong> PIN always available as backup</li>
                </ul>

                <div class="subsection-title">Backup & Import</div>
                <ul class="feature-list">
                  <li><strong>Setup Backup Folder:</strong> Ensure proper permissions for local backups</li>
                  <li><strong>Create Local Backup:</strong> Save backup files to device (Documents/techtrace/)</li>
                  <li><strong>Import Local Backup:</strong> Restore data from backup files</li>
                  <li><strong>Import from File:</strong> Pick JSON backup files from anywhere on device</li>
                  <li><strong>Share Backup:</strong> Transfer to another device via any sharing method</li>
                  <li><strong>Google Drive Backup:</strong> Cloud backup and restore functionality</li>
                  <li><strong>Import & Tally:</strong> Analyze backup data with detailed statistics</li>
                </ul>

                <div class="warning-box">
                  <div class="warning-box-title">⚠️ Important: Backup Regularly</div>
                  <p class="warning-box-text">
                    Always create backups before clearing data or switching devices. Backups are essential for data recovery and device migration.
                  </p>
                  <p class="warning-box-text">
                    Local backups are stored in Documents/techtrace/ folder. Use "Setup Backup Folder" to ensure proper permissions.
                  </p>
                  <p class="warning-box-text">
                    The backup process now includes verification steps to ensure data integrity.
                  </p>
                </div>

                <div class="subsection-title">Metrics & Formulas</div>
                <p class="description">
                  Customize the calculation formulas used throughout the app.
                </p>
                <ul class="feature-list">
                  <li><strong>AW Time Conversion:</strong> Define how many minutes equal one AW (default: 5)</li>
                  <li><strong>Working Hours per Day:</strong> Set standard working hours (default: 8.5)</li>
                  <li><strong>Target AWs per Hour:</strong> Set performance targets (default: 12)</li>
                  <li><strong>Efficiency Thresholds:</strong> Customize color-coding thresholds</li>
                  <li><strong>Green Threshold:</strong> Excellent performance level (default: 65%)</li>
                  <li><strong>Yellow Threshold:</strong> Average performance level (default: 31%)</li>
                  <li><strong>Reset to Defaults:</strong> Restore original formula values</li>
                  <li><strong>App Restart Required:</strong> Changes take effect after restarting the app</li>
                </ul>

                <div class="info-box">
                  <div class="info-box-title">🧮 Efficiency Formula Explained</div>
                  <p class="info-box-text">
                    <strong>Formula:</strong> Efficiency % = (Total Sold Hours / Total Available Hours) × 100
                  </p>
                  <p class="info-box-text">
                    <strong>Total Sold Hours:</strong> Sum of all job hours (AWs × AW conversion / 60)
                  </p>
                  <p class="info-box-text">
                    <strong>Total Available Hours:</strong> Weekdays from 1st to current date × Hours per Day - Absence Hours
                  </p>
                  <p class="info-box-text">
                    <strong>Weekdays:</strong> Monday to Friday only (8 AM - 5 PM with 30-min lunch = 8.5h)
                  </p>
                  <p class="info-box-text">
                    <strong>Example:</strong> 1000 AWs in 20 working days = (1000 × 5 / 60) / (20 × 8.5) × 100 = 49.02%
                  </p>
                </div>
              </div>

              <!-- Export Reports -->
              <div class="section">
                <div class="section-title">📄 Export Reports</div>
                <p class="description">
                  Generate professional PDF reports with comprehensive statistics and efficiency graphs.
                </p>

                <div class="subsection-title">Export Options</div>
                <ul class="feature-list">
                  <li><strong>Daily Export:</strong> Today's jobs (8.5h target)</li>
                  <li><strong>Weekly Export:</strong> Current week's jobs (45h target)</li>
                  <li><strong>Monthly Export:</strong> Selected month's jobs (180h target)</li>
                  <li><strong>Complete History:</strong> All recorded jobs</li>
                </ul>

                <div class="subsection-title">PDF Features</div>
                <ul class="feature-list">
                  <li>Professional styling with modern design</li>
                  <li>Comprehensive summary statistics</li>
                  <li>Visual efficiency graph</li>
                  <li>Performance metrics (utilization, efficiency, AWs per hour)</li>
                  <li>Detailed job table with all information</li>
                  <li>Complete totals section</li>
                  <li>Digital signature by Buckston Rugge</li>
                  <li>GDPR compliant (vehicle registrations only)</li>
                </ul>

                <div class="subsection-title">Sharing Options</div>
                <ul class="feature-list">
                  <li><strong>Share to Apps:</strong> Email, cloud storage, messaging apps</li>
                  <li><strong>Save to Backup:</strong> Store in backup folder for device migration</li>
                  <li><strong>Choose Folder:</strong> Select custom location on device</li>
                  <li><strong>Save to Storage:</strong> Save directly to device storage (requires permission)</li>
                </ul>
              </div>

              <!-- Tips & Best Practices -->
              <div class="section">
                <div class="section-title">💡 Tips & Best Practices</div>
                
                <div class="tip-box">
                  <div class="tip-box-title">🎯 Maximize Efficiency</div>
                  <p class="tip-box-text">
                    • Log jobs immediately after completion for accurate time tracking
                  </p>
                  <p class="tip-box-text">
                    • Review your efficiency circle daily to monitor performance
                  </p>
                  <p class="tip-box-text">
                    • Aim for 12 AWs per hour for optimal efficiency (100%)
                  </p>
                  <p class="tip-box-text">
                    • Use the statistics screen to identify trends and patterns
                  </p>
                  <p class="tip-box-text">
                    • Customize formulas in Metrics & Formulas to match your workflow
                  </p>
                </div>

                <div class="tip-box">
                  <div class="tip-box-title">📊 Data Management</div>
                  <p class="tip-box-text">
                    • Create weekly backups to prevent data loss
                  </p>
                  <p class="tip-box-text">
                    • Use "Setup Backup Folder" before creating first backup
                  </p>
                  <p class="tip-box-text">
                    • Verify backup files after creation (app does this automatically)
                  </p>
                  <p class="tip-box-text">
                    • Use Google Drive backup for automatic cloud storage
                  </p>
                  <p class="tip-box-text">
                    • Export monthly reports for record keeping
                  </p>
                  <p class="tip-box-text">
                    • Review and clean up old jobs periodically
                  </p>
                  <p class="tip-box-text">
                    • Test restore process occasionally to ensure backups work
                  </p>
                </div>

                <div class="tip-box">
                  <div class="tip-box-title">🔒 Security</div>
                  <p class="tip-box-text">
                    • Change default PIN immediately after first login
                  </p>
                  <p class="tip-box-text">
                    • Use a memorable but secure PIN (avoid 0000, 1234, etc.)
                  </p>
                  <p class="tip-box-text">
                    • Enable biometric authentication for quick access
                  </p>
                  <p class="tip-box-text">
                    • Never share your PIN with others
                  </p>
                  <p class="tip-box-text">
                    • The app stores only vehicle registrations (GDPR compliant)
                  </p>
                </div>
              </div>

              <!-- Troubleshooting -->
              <div class="section">
                <div class="section-title">🔧 Troubleshooting</div>
                
                <div class="subsection-title">Common Issues & Solutions</div>
                
                <div class="info-box">
                  <div class="info-box-title">❓ Forgot PIN</div>
                  <p class="info-box-text">
                    If you forget your PIN, you'll need to clear app data and start fresh. Make sure you have a backup before doing this. Contact support if you need assistance recovering data.
                  </p>
                </div>

                <div class="info-box">
                  <div class="info-box-title">❓ Statistics Not Updating</div>
                  <p class="info-box-text">
                    The statistics screen updates automatically when you navigate to it. If stats seem incorrect, try navigating away and back to the screen to refresh the data.
                  </p>
                </div>

                <div class="info-box">
                  <div class="info-box-title">❓ PDF Export Not Working</div>
                  <p class="info-box-text">
                    Ensure you have granted storage permissions in Settings. If sharing fails, try the "Share to Apps" option which works without storage permission.
                  </p>
                </div>

                <div class="info-box">
                  <div class="info-box-title">❓ Backup/Restore Issues</div>
                  <p class="info-box-text">
                    Use "Setup Backup Folder" in Settings to ensure proper permissions. The app will verify the backup folder is writable and create it if needed. For Google Drive backup, make sure you're authenticated and have selected a backup folder.
                  </p>
                </div>

                <div class="info-box">
                  <div class="info-box-title">❓ Backup Verification Failed</div>
                  <p class="info-box-text">
                    If backup verification fails, the backup file may be corrupted. Try creating a new backup. Ensure you have sufficient storage space on your device.
                  </p>
                </div>

                <div class="info-box">
                  <div class="info-box-title">❓ Formula Changes Not Applied</div>
                  <p class="info-box-text">
                    After changing formulas in Metrics & Formulas, you must restart the app for changes to take full effect. Close the app completely and reopen it.
                  </p>
                </div>
              </div>

              <!-- GDPR Compliance -->
              <div class="section">
                <div class="section-title">🔒 GDPR Compliance</div>
                <p class="description">
                  This app is designed with privacy and data protection in mind.
                </p>

                <div class="info-box">
                  <div class="info-box-title">🛡️ Data Protection</div>
                  <p class="info-box-text">
                    • Only vehicle registration numbers are stored (no personal customer data)
                  </p>
                  <p class="info-box-text">
                    • All data is stored locally on your device
                  </p>
                  <p class="info-box-text">
                    • No data is transmitted to external servers (except Google Drive backups if you choose)
                  </p>
                  <p class="info-box-text">
                    • You have full control over your data (export, backup, delete)
                  </p>
                  <p class="info-box-text">
                    • Backups are encrypted and secure
                  </p>
                  <p class="info-box-text">
                    • No tracking or analytics data is collected
                  </p>
                </div>
              </div>

              <!-- Support -->
              <div class="section">
                <div class="section-title">📞 Support & Contact</div>
                <p class="description">
                  Need help or have questions? Here's how to get support:
                </p>

                <ul class="feature-list">
                  <li>Review this user guide for detailed instructions</li>
                  <li>Check the troubleshooting section for common issues</li>
                  <li>Export this guide as PDF for offline reference</li>
                  <li>Share this guide with team members for training</li>
                </ul>

                <div class="info-box">
                  <div class="info-box-title">📱 App Information</div>
                  <p class="info-box-text">
                    <strong>App Name:</strong> Technician Records
                  </p>
                  <p class="info-box-text">
                    <strong>Version:</strong> 1.0.0
                  </p>
                  <p class="info-box-text">
                    <strong>Platform:</strong> React Native + Expo
                  </p>
                  <p class="info-box-text">
                    <strong>Designed for:</strong> Vehicle Technicians
                  </p>
                  <p class="info-box-text">
                    <strong>Features:</strong> Job tracking, efficiency calculations, backup & restore, customizable formulas
                  </p>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="signature">✍️ Digitally Signed by Buckston Rugge</div>
              <div class="app-version">Technician Records App v1.0.0</div>
              <div class="disclaimer">
                This user guide is provided for reference and training purposes.<br/>
                All features and functionalities are subject to updates and improvements.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }, []);

  const handleExportToPDF = useCallback(async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      showNotification('Generating help guide PDF...', 'info');

      const htmlContent = generateHelpPDFHTML();
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });

      console.log('Help guide PDF generated at:', uri);

      // Share the PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Technician Records User Guide',
          UTI: 'com.adobe.pdf',
        });
        showNotification('Help guide exported successfully! 📄', 'success');
      } else {
        showNotification('Sharing not available on this platform', 'error');
      }
    } catch (error) {
      console.log('Error exporting help guide:', error);
      showNotification('Error exporting help guide. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, showNotification, generateHelpPDFHTML]);

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
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Help & User Guide</Text>
        <TouchableOpacity 
          onPress={handleExportToPDF} 
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          disabled={isExporting}
        >
          <Text style={styles.exportButtonText}>
            {isExporting ? '⏳ Exporting...' : '📄 Export to PDF'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Introduction</Text>
          <Text style={styles.description}>
            Welcome to the Technician Records App! This comprehensive guide will help you understand all features and functionalities of the application. The app is designed specifically for vehicle technicians to track jobs, calculate work hours using AWs (Allocated Work Units), and generate professional reports while maintaining full GDPR compliance.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>💡 What is an AW?</Text>
            <Text style={styles.infoBoxText}>
              AW stands for Allocated Work Unit. By default, 1 AW equals 5 minutes of work time. This standardized unit helps you accurately track and calculate job durations. You can customize this conversion in the Metrics & Formulas settings.
            </Text>
            <Text style={styles.infoBoxText}>
              Example: A job with 12 AWs = 12 × 5 minutes = 60 minutes (1 hour)
            </Text>
          </View>
        </View>

        {/* Getting Started */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Getting Started</Text>
          <Text style={styles.subsectionTitle}>First Time Setup</Text>
          <Text style={styles.stepText}>1. Launch the app and you&apos;ll be greeted with the PIN authentication screen</Text>
          <Text style={styles.stepText}>2. Enter the default PIN: 3101</Text>
          <Text style={styles.stepText}>3. You&apos;ll be taken to the Dashboard (Home screen)</Text>
          <Text style={styles.stepText}>4. Navigate to Settings to customize your PIN and monthly target hours</Text>
          <Text style={styles.stepText}>5. Set up biometric authentication (fingerprint/Face ID) for quick access</Text>
          
          <View style={styles.tipBox}>
            <Text style={styles.tipBoxTitle}>💡 Pro Tip</Text>
            <Text style={styles.tipBoxText}>
              Change your PIN immediately after first login for enhanced security. Go to Settings → Security Settings → Update PIN.
            </Text>
          </View>
        </View>

        {/* Dashboard Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏠 Dashboard (Home Screen)</Text>
          <Text style={styles.description}>
            The Dashboard is your command center, displaying real-time statistics and progress tracking.
          </Text>
          
          <Text style={styles.subsectionTitle}>Key Features</Text>
          <Text style={styles.featureText}>- Monthly Target Circle: Shows your progress toward the monthly target hours (default: 180 hours). Tap to view detailed statistics.</Text>
          <Text style={styles.featureText}>- Efficiency Circle: Displays your efficiency percentage based on sold hours vs. available hours. Tap to see detailed calculations.</Text>
          <Text style={styles.featureText}>- Quick Stats: View total jobs, total AWs, and total time at a glance</Text>
          <Text style={styles.featureText}>- Add Job Button: Quick access to log new jobs</Text>
          <Text style={styles.featureText}>- Job Records Button: Access advanced search and filtering</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>📊 Understanding Efficiency</Text>
            <Text style={styles.infoBoxText}>
              Efficiency = (Sold Hours ÷ Available Hours) × 100
            </Text>
            <Text style={styles.infoBoxText}>
              Sold Hours: Total hours from completed jobs (AWs × AW conversion ÷ 60)
            </Text>
            <Text style={styles.infoBoxText}>
              Available Hours: Working hours available to date (weekdays only, 8 AM - 5 PM with 30-min lunch, minus absences)
            </Text>
            <Text style={styles.infoBoxText}>
              Color Coding: Green (65-100%), Yellow (31-64%), Red (0-30%)
            </Text>
            <Text style={styles.infoBoxText}>
              Note: You can customize these thresholds in Metrics & Formulas settings
            </Text>
          </View>
        </View>

        {/* Metrics & Formulas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📐 Metrics & Formulas</Text>
          <Text style={styles.description}>
            Customize the calculation formulas used throughout the app to match your specific workflow and requirements.
          </Text>
          
          <Text style={styles.subsectionTitle}>Customizable Formulas</Text>
          <Text style={styles.featureText}>- AW Time Conversion: Define how many minutes equal one AW (default: 5)</Text>
          <Text style={styles.featureText}>- Working Hours per Day: Set standard working hours (default: 8.5)</Text>
          <Text style={styles.featureText}>- Target AWs per Hour: Set performance targets (default: 12)</Text>
          <Text style={styles.featureText}>- Efficiency Thresholds: Customize color-coding thresholds</Text>
          <Text style={styles.featureText}>- Green Threshold: Excellent performance level (default: 65%)</Text>
          <Text style={styles.featureText}>- Yellow Threshold: Average performance level (default: 31%)</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>🧮 Efficiency Formula Explained</Text>
            <Text style={styles.infoBoxText}>
              Formula: Efficiency % = (Total Sold Hours / Total Available Hours) × 100
            </Text>
            <Text style={styles.infoBoxText}>
              Total Sold Hours: Sum of all job hours (AWs × AW conversion / 60)
            </Text>
            <Text style={styles.infoBoxText}>
              Total Available Hours: Weekdays from 1st to current date × Hours per Day - Absence Hours
            </Text>
            <Text style={styles.infoBoxText}>
              Weekdays: Monday to Friday only (8 AM - 5 PM with 30-min lunch = 8.5h)
            </Text>
            <Text style={styles.infoBoxText}>
              Example: 1000 AWs in 20 working days = (1000 × 5 / 60) / (20 × 8.5) × 100 = 49.02%
            </Text>
          </View>
          
          <View style={styles.tipBox}>
            <Text style={styles.tipBoxTitle}>⚠️ Important</Text>
            <Text style={styles.tipBoxText}>
              After changing formulas, you must restart the app for changes to take full effect. Close the app completely and reopen it.
            </Text>
          </View>
        </View>

        {/* Backup & Restore */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup & Restore</Text>
          <Text style={styles.description}>
            Protect your data with comprehensive backup options and easy restore functionality.
          </Text>
          
          <Text style={styles.subsectionTitle}>Local Backup Features</Text>
          <Text style={styles.featureText}>- Setup Backup Folder: Ensure proper permissions for local backups</Text>
          <Text style={styles.featureText}>- Create Local Backup: Save backup files to device (Documents/techtrace/)</Text>
          <Text style={styles.featureText}>- Automatic Verification: Backups are verified after creation</Text>
          <Text style={styles.featureText}>- Import Local Backup: Restore data from backup files</Text>
          <Text style={styles.featureText}>- Import from File: Pick JSON backup files from anywhere on device</Text>
          <Text style={styles.featureText}>- Share Backup: Transfer to another device via any sharing method</Text>
          
          <Text style={styles.subsectionTitle}>Cloud Backup Features</Text>
          <Text style={styles.featureText}>- Google Drive Backup: Cloud backup and restore functionality</Text>
          <Text style={styles.featureText}>- Import & Tally: Analyze backup data with detailed statistics</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>📁 Backup Process</Text>
            <Text style={styles.infoBoxText}>
              1. Request storage permissions
            </Text>
            <Text style={styles.infoBoxText}>
              2. Verify directory is writable
            </Text>
            <Text style={styles.infoBoxText}>
              3. Create backup folder if needed
            </Text>
            <Text style={styles.infoBoxText}>
              4. Load all data from storage
            </Text>
            <Text style={styles.infoBoxText}>
              5. Create backup data structure
            </Text>
            <Text style={styles.infoBoxText}>
              6. Write backup files (timestamped + latest)
            </Text>
            <Text style={styles.infoBoxText}>
              7. Verify backup file integrity
            </Text>
            <Text style={styles.infoBoxText}>
              8. Confirm successful backup
            </Text>
          </View>
          
          <View style={styles.tipBox}>
            <Text style={styles.tipBoxTitle}>💡 Best Practices</Text>
            <Text style={styles.tipBoxText}>
              • Create weekly backups to prevent data loss
            </Text>
            <Text style={styles.tipBoxText}>
              • Use &quot;Setup Backup Folder&quot; before creating first backup
            </Text>
            <Text style={styles.tipBoxText}>
              • Verify backup files after creation (app does this automatically)
            </Text>
            <Text style={styles.tipBoxText}>
              • Test restore process occasionally to ensure backups work
            </Text>
            <Text style={styles.tipBoxText}>
              • Keep multiple backup copies in different locations
            </Text>
          </View>
        </View>

        {/* Troubleshooting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Troubleshooting</Text>
          
          <Text style={styles.subsectionTitle}>Backup Issues</Text>
          <Text style={styles.featureText}>- Use &quot;Setup Backup Folder&quot; to ensure proper permissions</Text>
          <Text style={styles.featureText}>- Check available storage space on device</Text>
          <Text style={styles.featureText}>- Verify backup file exists in Documents/techtrace/</Text>
          <Text style={styles.featureText}>- If verification fails, try creating a new backup</Text>
          
          <Text style={styles.subsectionTitle}>Formula Changes</Text>
          <Text style={styles.featureText}>- Restart app after changing formulas</Text>
          <Text style={styles.featureText}>- Use &quot;Reset to Defaults&quot; if calculations seem incorrect</Text>
          <Text style={styles.featureText}>- Historical data will be recalculated using new formulas</Text>
        </View>

        {/* Export Button at Bottom */}
        <View style={styles.exportSection}>
          <Text style={styles.exportSectionTitle}>📤 Share This Guide</Text>
          <Text style={styles.exportSectionDescription}>
            Export this complete user guide as a PDF to share with team members, keep for offline reference, or print for easy access.
          </Text>
          <TouchableOpacity 
            onPress={handleExportToPDF} 
            style={[styles.exportButtonLarge, isExporting && styles.exportButtonDisabled]}
            disabled={isExporting}
          >
            <Text style={styles.exportButtonLargeText}>
              {isExporting ? '⏳ Generating PDF...' : '📄 Export Complete Guide to PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.signature}>✍️ Digitally Signed by Buckston Rugge</Text>
          <Text style={styles.appVersion}>Technician Records App v1.0.0</Text>
          <Text style={styles.disclaimer}>
            This user guide is provided for reference and training purposes.
            All features and functionalities are subject to updates and improvements.
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
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  exportButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  stepText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
  },
  infoBox: {
    backgroundColor: colors.backgroundAlt,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  tipBox: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#34a853',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  tipBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34a853',
    marginBottom: 8,
  },
  tipBoxText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 4,
  },
  exportSection: {
    marginBottom: 32,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  exportSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  exportSectionDescription: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.95,
  },
  exportButtonLarge: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  exportButtonLargeText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginBottom: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  signature: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  appVersion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
