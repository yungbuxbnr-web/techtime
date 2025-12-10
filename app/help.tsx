
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
  <title>TechTime - About & User Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.7;
      color: #1e293b;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      padding: 40px 20px;
    }
    
    .page-container {
      max-width: 1000px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    
    .header-wrapper {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
      padding: 60px 50px;
      position: relative;
      overflow: hidden;
    }
    
    .header-wrapper::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    
    .header-wrapper::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -5%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      border-radius: 50%;
    }
    
    .header {
      position: relative;
      z-index: 1;
      text-align: center;
    }
    
    .company-logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 42px;
      margin-bottom: 24px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    }
    
    .header h1 {
      font-size: 52px;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 16px;
      letter-spacing: -1.5px;
      text-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    
    .header .subtitle {
      font-size: 22px;
      font-weight: 600;
      color: #e0f2fe;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    
    .header .tagline {
      font-size: 16px;
      font-weight: 500;
      color: #bfdbfe;
      margin-bottom: 24px;
    }
    
    .header-meta {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 28px;
      flex-wrap: wrap;
    }
    
    .header-meta-item {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #bfdbfe;
      font-size: 13px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
      padding: 10px 20px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
    
    .header-meta-icon {
      font-size: 18px;
    }
    
    .content-wrapper {
      padding: 50px;
    }
    
    .about-section {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 40px;
      border: 2px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    .about-title {
      font-size: 32px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 20px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 2px;
      position: relative;
      padding-bottom: 20px;
    }
    
    .about-title::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 5px;
      background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
      border-radius: 3px;
    }
    
    .about-description {
      font-size: 16px;
      color: #475569;
      line-height: 1.8;
      text-align: center;
      margin-bottom: 30px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-top: 30px;
    }
    
    .feature-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      border: 2px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }
    
    .feature-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }
    
    .feature-icon {
      font-size: 36px;
      margin-bottom: 12px;
      display: block;
    }
    
    .feature-title {
      font-size: 18px;
      font-weight: 800;
      color: #1e40af;
      margin-bottom: 10px;
    }
    
    .feature-description {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-icon {
      font-size: 32px;
    }
    
    .subsection-title {
      font-size: 20px;
      font-weight: 700;
      color: #1e40af;
      margin-top: 24px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .subsection-icon {
      font-size: 22px;
    }
    
    p {
      margin-bottom: 14px;
      font-size: 15px;
      color: #334155;
      line-height: 1.7;
    }
    
    ul, ol {
      margin-left: 28px;
      margin-bottom: 18px;
    }
    
    li {
      margin-bottom: 10px;
      font-size: 15px;
      color: #334155;
      line-height: 1.6;
    }
    
    .feature-box {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-left: 5px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
    }
    
    .feature-box-title {
      font-size: 17px;
      font-weight: 800;
      color: #1e40af;
      margin-bottom: 12px;
    }
    
    .tip-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 5px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
    }
    
    .warning-box {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border-left: 5px solid #ef4444;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
    }
    
    .box-text {
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 8px;
    }
    
    .toc {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      border: 2px solid #e5e7eb;
    }
    
    .toc-title {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 20px;
      color: #1e40af;
      text-align: center;
    }
    
    .toc-item {
      margin-left: 20px;
      margin-bottom: 10px;
      font-size: 15px;
      color: #334155;
      font-weight: 500;
    }
    
    .footer {
      margin-top: 60px;
      padding: 50px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      text-align: center;
      color: #ffffff;
    }
    
    .footer-logo {
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 20px;
      backdrop-filter: blur(10px);
    }
    
    .footer p {
      font-size: 14px;
      color: #e0f2fe;
      margin-bottom: 8px;
    }
    
    .footer-brand {
      font-weight: 800;
      color: #ffffff;
      font-size: 18px;
      margin-bottom: 12px;
    }
    
    .signature-section {
      margin-top: 30px;
      padding-top: 30px;
      border-top: 2px solid rgba(255, 255, 255, 0.2);
    }
    
    .signature {
      display: inline-block;
      padding: 16px 40px;
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 700;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .confidential-notice {
      margin-top: 30px;
      padding: 20px;
      background: rgba(254, 243, 199, 0.3);
      border: 2px solid #fbbf24;
      border-radius: 10px;
      font-size: 12px;
      color: #fef3c7;
      font-weight: 600;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    
    .stat-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      border: 2px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    
    .stat-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 900;
      color: #2563eb;
      margin-bottom: 8px;
    }
    
    .stat-label {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      
      .page-container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .feature-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header-wrapper">
      <div class="header">
        <div class="company-logo">🔧</div>
        <h1>TechTime</h1>
        <div class="subtitle">Professional Job Tracking System</div>
        <div class="tagline">Empowering Vehicle Technicians with Precision & Efficiency</div>
        <div class="header-meta">
          <div class="header-meta-item">
            <span class="header-meta-icon">📅</span>
            <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div class="header-meta-item">
            <span class="header-meta-icon">📱</span>
            <span>Version 1.0.0</span>
          </div>
          <div class="header-meta-item">
            <span class="header-meta-icon">🔒</span>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="content-wrapper">
      <div class="about-section">
        <h2 class="about-title">About TechTime</h2>
        <p class="about-description">
          TechTime is a cutting-edge, professional job tracking application meticulously designed for vehicle technicians. 
          Built with precision and user experience at its core, TechTime transforms how technicians manage their workload, 
          track time, and maintain comprehensive records. With advanced features including real-time time tracking, 
          intelligent efficiency calculations, professional reporting, and robust security, TechTime is the ultimate 
          companion for modern automotive professionals.
        </p>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-value">100%</div>
            <div class="stat-label">Privacy Focused</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔒</div>
            <div class="stat-value">Secure</div>
            <div class="stat-label">PIN & Biometric</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value">Real-Time</div>
            <div class="stat-label">Live Tracking</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">☁️</div>
            <div class="stat-value">Cloud</div>
            <div class="stat-label">Backup Ready</div>
          </div>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <span class="feature-icon">📝</span>
            <h3 class="feature-title">Comprehensive Job Tracking</h3>
            <p class="feature-description">
              Log jobs with WIP numbers, vehicle registrations, AW values, and detailed notes. 
              Automatic time calculation (1 AW = 5 minutes) ensures precision in every entry.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">⏰</span>
            <h3 class="feature-title">Live Time Tracking</h3>
            <p class="feature-description">
              Real-time work hour monitoring with second-by-second updates. Track available hours, 
              time elapsed, and progress throughout your workday with visual progress bars.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">📊</span>
            <h3 class="feature-title">Advanced Analytics</h3>
            <p class="feature-description">
              Comprehensive efficiency calculations, monthly progress tracking against 180-hour targets, 
              and detailed performance metrics with visual circle indicators.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">📄</span>
            <h3 class="feature-title">Professional Reports</h3>
            <p class="feature-description">
              Generate stunning PDF and Excel reports with charts, statistics, and professional formatting. 
              Export daily, weekly, monthly, or complete job history with one tap.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">📸</span>
            <h3 class="feature-title">Job Card Scanning</h3>
            <p class="feature-description">
              Advanced OCR technology automatically extracts WIP numbers and vehicle registrations 
              from job cards, saving time and reducing manual entry errors.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">📅</span>
            <h3 class="feature-title">Efficiency Calendar</h3>
            <p class="feature-description">
              Year-long calendar with month-by-month views, daily efficiency circles, and zoom levels 
              (Day, Week, Month, Year). Visualize your performance over time with intuitive graphics.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">🔐</span>
            <h3 class="feature-title">Advanced Security</h3>
            <p class="feature-description">
              PIN protection with 4-6 digit codes, biometric authentication (Face ID/Fingerprint), 
              session management, and encrypted local storage for maximum data protection.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">☁️</span>
            <h3 class="feature-title">Multiple Backup Options</h3>
            <p class="feature-description">
              Local backups, external storage (Android), Google Drive cloud backup with OAuth, 
              JSON exports, and app-to-app sharing for seamless data migration.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">🏖️</span>
            <h3 class="feature-title">Absence Logger</h3>
            <p class="feature-description">
              Log absences with half-day or full-day options. Choose to deduct from monthly target 
              hours or available hours for efficiency calculations. Automatic monthly reset.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">⚙️</span>
            <h3 class="feature-title">Customizable Work Schedule</h3>
            <p class="feature-description">
              Configure work hours, lunch breaks, work days, and Saturday frequency (1 in 2, 1 in 3, etc.). 
              Automatic tracking of next working Saturday with schedule updates.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">🎨</span>
            <h3 class="feature-title">Dark Mode Support</h3>
            <p class="feature-description">
              Beautiful light and dark themes with smooth transitions. Automatic theme persistence 
              and eye-friendly color schemes for all-day use.
            </p>
          </div>
          
          <div class="feature-card">
            <span class="feature-icon">📱</span>
            <h3 class="feature-title">Android Home Widget</h3>
            <p class="feature-description">
              Live efficiency data and time display on your home screen. Real-time updates without 
              opening the app. Quick access to key metrics at a glance.
            </p>
          </div>
        </div>
      </div>

      <div class="toc">
        <div class="toc-title">📋 Complete User Guide Contents</div>
        <div class="toc-item">1. Introduction & Overview</div>
        <div class="toc-item">2. Getting Started & Security Setup</div>
        <div class="toc-item">3. Security Features & PIN Management</div>
        <div class="toc-item">4. Dashboard & Home Screen</div>
        <div class="toc-item">5. Job Management & Scanning</div>
        <div class="toc-item">6. Time Tracking & Work Schedule</div>
        <div class="toc-item">7. Efficiency Calendar</div>
        <div class="toc-item">8. Reports & Export Options</div>
        <div class="toc-item">9. Backup & Data Management</div>
        <div class="toc-item">10. Settings & Customization</div>
        <div class="toc-item">11. Android Home Widget</div>
        <div class="toc-item">12. Tips & Best Practices</div>
        <div class="toc-item">13. Troubleshooting & Support</div>
      </div>

      <div class="section">
        <h2 class="section-title">
          <span class="section-icon">🎯</span>
          Key Features in Detail
        </h2>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">📝</span>
          Job Management
        </h3>
        <p>
          TechTime provides a comprehensive job management system that allows you to log, edit, and track 
          all your work with precision. Each job entry includes WIP number (5-digit format), vehicle registration, 
          AW value (0-100), optional notes, and automatic date/time stamping. The system automatically calculates 
          time based on AWs (1 AW = 5 minutes) and provides instant feedback on job duration.
        </p>
        
        <div class="feature-box">
          <div class="feature-box-title">Job Card Scanning</div>
          <p class="box-text">
            Advanced OCR technology extracts WIP numbers and vehicle registrations from job cards automatically. 
            Simply take a photo, review the extracted data, add AWs, and save. This feature dramatically reduces 
            manual entry time and minimizes errors.
          </p>
        </div>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">⏰</span>
          Live Time Tracking
        </h3>
        <p>
          Real-time work hour monitoring runs continuously in the background, updating every second. The system 
          tracks available hours (8 AM - 5 PM), time elapsed, time remaining, and work progress percentage. 
          Visual progress bars and circles provide instant insights into your daily performance. Tap the progress 
          bar on the dashboard to access detailed time statistics with live counters.
        </p>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">📅</span>
          Efficiency Calendar
        </h3>
        <p>
          The Efficiency Calendar provides a comprehensive year-long view of your performance with multiple zoom 
          levels. Month view displays daily efficiency circles with dual indicators (efficiency and progress), 
          week view shows 7-day summaries with efficiency metrics, day view provides detailed job breakdowns, 
          and year view presents all 12 months with efficiency circles. Swipe gestures and navigation buttons 
          make it easy to browse through time periods.
        </p>
        
        <div class="feature-box">
          <div class="feature-box-title">Calendar Features</div>
          <p class="box-text">
            • Month View: Daily circles showing efficiency (outer) and progress (inner) with percentages below<br>
            • Week View: 7-day grid with efficiency circles and AW totals<br>
            • Day View: Complete job list with efficiency and hours circles<br>
            • Year View: 12-month overview with efficiency circles and job counts<br>
            • Swipe Navigation: Swipe left/right to navigate between periods<br>
            • Today Indicator: Current day highlighted with primary color border
          </p>
        </div>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">📊</span>
          Professional Reports
        </h3>
        <p>
          Generate stunning professional reports in PDF and Excel formats. PDF reports include modern corporate 
          styling with gradient headers, efficiency pie charts with legends, detailed job tables with VHC status 
          badges, summary statistics, and digital signatures. Excel reports provide sortable data, pie charts, 
          AW distribution analysis, and utilization percentages. Export options include daily, weekly, monthly, 
          and complete job history with automatic month grouping.
        </p>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">☁️</span>
          Backup & Data Management
        </h3>
        <p>
          Multiple backup solutions ensure your data is always safe. Local backups save to device storage, 
          external folder backups support SD cards (Android), Google Drive backup provides cloud storage with 
          OAuth authentication, JSON backups enable quick exports, and app-to-app sharing facilitates device 
          transfers. Import options include local backups, file picker, PDF extraction, and Import & Tally 
          for detailed analysis.
        </p>
        
        <div class="warning-box">
          <p class="box-text">
            <strong>⚠️ Important:</strong> Always create regular backups to prevent data loss. We recommend 
            weekly backups to Google Drive for maximum protection. Test your backup system periodically using 
            the "Test Backup" feature.
          </p>
        </div>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">🔐</span>
          Security & Privacy
        </h3>
        <p>
          TechTime prioritizes your data security with multiple layers of protection. PIN authentication requires 
          a 4-6 digit code for app access, biometric authentication supports Face ID and fingerprint login, 
          session management automatically signs out when the app closes, and all data is encrypted and stored 
          locally on your device. The app is fully GDPR compliant, storing only vehicle registration numbers 
          without any personal customer data.
        </p>
        
        <div class="feature-box">
          <div class="feature-box-title">Security Options</div>
          <p class="box-text">
            • PIN Protection: 4-6 digit codes with change capability<br>
            • Biometric Login: Face ID or fingerprint authentication<br>
            • Security Toggle: Enable/disable security as needed<br>
            • Session Management: Automatic sign-out on app close<br>
            • Data Encryption: Secure local storage<br>
            • Privacy Focused: No personal customer data stored
          </p>
        </div>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">⚙️</span>
          Customization & Settings
        </h3>
        <p>
          Extensive customization options allow you to tailor TechTime to your specific needs. Configure work 
          schedule with custom start/end times, lunch breaks, work days, and Saturday frequency. Set monthly 
          target hours (default 180, fully customizable), log absences with half-day or full-day options, 
          choose deduction types (monthly target or available hours), customize calculation formulas, toggle 
          between light and dark themes, and manage notification preferences.
        </p>
        
        <h3 class="subsection-title">
          <span class="subsection-icon">📱</span>
          Android Home Widget
        </h3>
        <p>
          The Android home screen widget displays live efficiency data and current time without opening the app. 
          Real-time updates show your latest efficiency percentage, total AWs, and work progress. The widget 
          automatically refreshes when you open the app, view the dashboard, or modify jobs. Tap the widget to 
          launch TechTime directly to the dashboard.
        </p>
      </div>

      <div class="section">
        <h2 class="section-title">
          <span class="section-icon">💡</span>
          Best Practices & Tips
        </h2>
        
        <div class="tip-box">
          <p class="box-text">
            <strong>💡 Pro Tips for Maximum Efficiency:</strong><br><br>
            • Create weekly backups to Google Drive for cloud protection<br>
            • Log jobs immediately after completion for accurate tracking<br>
            • Use job card scanning to save time and reduce errors<br>
            • Check time stats daily to stay on track with your goals<br>
            • Export monthly reports for record-keeping and analysis<br>
            • Enable biometric authentication for quick, secure access<br>
            • Keep your work schedule current for accurate time tracking<br>
            • Use the absence logger to maintain accurate monthly targets<br>
            • Review the efficiency calendar weekly to identify trends<br>
            • Test your backup system monthly to ensure it works
          </p>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">
          <span class="section-icon">📱</span>
          Technical Specifications
        </h2>
        
        <p><strong>System Requirements:</strong></p>
        <ul>
          <li>Platform: iOS 13.0+ / Android 6.0+</li>
          <li>Storage: Minimum 50MB free space</li>
          <li>Permissions: Camera (scanning), Storage (backups), Notifications</li>
          <li>Internet: Optional (for Google Drive backup only)</li>
        </ul>
        
        <p><strong>Data Storage:</strong></p>
        <ul>
          <li>Local storage: All data stored securely on device</li>
          <li>GDPR compliant: Only vehicle registrations stored</li>
          <li>Encryption: PIN and biometric authentication</li>
          <li>Backup formats: JSON, PDF (import/export)</li>
        </ul>
        
        <p><strong>Calculations:</strong></p>
        <ul>
          <li>AW Conversion: 1 AW = 5 minutes</li>
          <li>Work Day: 8 AM - 5 PM (9 hours total)</li>
          <li>Lunch Break: 12 PM - 1 PM (1 hour)</li>
          <li>Net Work Time: 8 hours per day (excluding lunch)</li>
          <li>Monthly Target: 180 hours (default, customizable)</li>
          <li>Efficiency: (Sold Hours / Available Hours) × 100</li>
        </ul>
      </div>

      <div class="section">
        <h2 class="section-title">
          <span class="section-icon">🎯</span>
          Why Choose TechTime?
        </h2>
        
        <p>
          TechTime stands out as the premier job tracking solution for vehicle technicians, combining powerful 
          features with an intuitive interface. Unlike generic time tracking apps, TechTime is specifically 
          designed for automotive professionals, understanding the unique requirements of workshop environments. 
          The app's focus on privacy (GDPR compliance), security (PIN and biometric authentication), and 
          precision (automatic AW calculations) makes it the ideal choice for professional technicians who 
          demand excellence in their tools.
        </p>
        
        <p>
          With features like live time tracking, efficiency calendars, professional reporting, job card scanning, 
          and comprehensive backup options, TechTime provides everything you need to manage your workload 
          effectively. The app's modern design, dark mode support, and smooth animations create a pleasant 
          user experience, while the robust architecture ensures reliability and performance.
        </p>
        
        <p>
          Whether you're tracking daily jobs, monitoring monthly progress, generating reports for management, 
          or analyzing your efficiency trends, TechTime delivers the tools and insights you need to excel in 
          your profession. Join thousands of technicians who trust TechTime for their job tracking needs.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-logo">🔧</div>
      <p class="footer-brand">TechTime - Professional Job Tracking</p>
      <p>Version 1.0.0 | Privacy Focused | Secure | Reliable</p>
      <p>GDPR Compliant | Encrypted Storage | Professional Grade</p>
      <p>© ${new Date().getFullYear()} TechTime. All rights reserved.</p>
      
      <div class="signature-section">
        <div class="signature">
          ✍️ Digitally Certified Professional Application
        </div>
      </div>
      
      <div class="confidential-notice">
        ⚠️ CONFIDENTIAL DOCUMENT: This guide contains proprietary information about TechTime. 
        Unauthorized distribution or reproduction is prohibited.
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleExportPDF = async () => {
    if (isExporting) return;

    setIsExporting(true);
    showNotification('Generating stylish About PDF...', 'info');

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
          dialogTitle: 'Share TechTime About & User Guide',
          UTI: 'com.adobe.pdf',
        });
        showNotification('About PDF exported successfully!', 'success');
      } else {
        showNotification('Sharing is not available on this device', 'error');
      }
    } catch (error) {
      console.log('Error exporting PDF:', error);
      showNotification('Error exporting About PDF', 'error');
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
        <Text style={styles.title}>About & User Guide</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🔧</Text>
          <Text style={styles.heroTitle}>TechTime</Text>
          <Text style={styles.heroSubtitle}>
            Professional Job Tracking for Vehicle Technicians
          </Text>
          <Text style={styles.heroTagline}>
            Empowering Professionals with Precision & Efficiency
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
                {isExporting ? 'Generating PDF...' : 'Export About & Guide as PDF'}
              </Text>
              <Text style={styles.exportButtonSubtext}>
                Stylish corporate-themed document with complete information
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 About TechTime</Text>
          <Text style={styles.paragraph}>
            TechTime is a cutting-edge, professional job tracking application meticulously designed for vehicle 
            technicians. Built with precision and user experience at its core, TechTime transforms how technicians 
            manage their workload, track time, and maintain comprehensive records.
          </Text>
          <Text style={styles.paragraph}>
            With advanced features including real-time time tracking, intelligent efficiency calculations, 
            professional reporting, job card scanning, efficiency calendars, and robust security, TechTime is 
            the ultimate companion for modern automotive professionals.
          </Text>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Key Features</Text>
          
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📝</Text>
              <Text style={styles.featureTitle}>Comprehensive Job Tracking</Text>
              <Text style={styles.featureDescription}>
                Log jobs with WIP numbers, vehicle registrations, AW values, and notes. Automatic time calculation 
                (1 AW = 5 minutes) ensures precision.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>⏰</Text>
              <Text style={styles.featureTitle}>Live Time Tracking</Text>
              <Text style={styles.featureDescription}>
                Real-time work hour monitoring with second-by-second updates. Track available hours, time elapsed, 
                and progress throughout your workday.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureTitle}>Advanced Analytics</Text>
              <Text style={styles.featureDescription}>
                Comprehensive efficiency calculations, monthly progress tracking against 180-hour targets, and 
                detailed performance metrics.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📄</Text>
              <Text style={styles.featureTitle}>Professional Reports</Text>
              <Text style={styles.featureDescription}>
                Generate stunning PDF and Excel reports with charts, statistics, and professional formatting. 
                Export daily, weekly, monthly, or complete history.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📸</Text>
              <Text style={styles.featureTitle}>Job Card Scanning</Text>
              <Text style={styles.featureDescription}>
                Advanced OCR technology automatically extracts WIP numbers and vehicle registrations from job cards, 
                saving time and reducing errors.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📅</Text>
              <Text style={styles.featureTitle}>Efficiency Calendar</Text>
              <Text style={styles.featureDescription}>
                Year-long calendar with month-by-month views, daily efficiency circles, and zoom levels 
                (Day, Week, Month, Year). Visualize performance over time.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🔐</Text>
              <Text style={styles.featureTitle}>Advanced Security</Text>
              <Text style={styles.featureDescription}>
                PIN protection, biometric authentication (Face ID/Fingerprint), session management, and encrypted 
                local storage for maximum data protection.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>☁️</Text>
              <Text style={styles.featureTitle}>Multiple Backup Options</Text>
              <Text style={styles.featureDescription}>
                Local backups, external storage, Google Drive cloud backup with OAuth, JSON exports, and 
                app-to-app sharing for seamless data migration.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🏖️</Text>
              <Text style={styles.featureTitle}>Absence Logger</Text>
              <Text style={styles.featureDescription}>
                Log absences with half-day or full-day options. Choose to deduct from monthly target hours or 
                available hours. Automatic monthly reset.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>⚙️</Text>
              <Text style={styles.featureTitle}>Customizable Work Schedule</Text>
              <Text style={styles.featureDescription}>
                Configure work hours, lunch breaks, work days, and Saturday frequency. Automatic tracking of 
                next working Saturday with schedule updates.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🎨</Text>
              <Text style={styles.featureTitle}>Dark Mode Support</Text>
              <Text style={styles.featureDescription}>
                Beautiful light and dark themes with smooth transitions. Automatic theme persistence and 
                eye-friendly color schemes for all-day use.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureTitle}>Android Home Widget</Text>
              <Text style={styles.featureDescription}>
                Live efficiency data and time display on your home screen. Real-time updates without opening 
                the app. Quick access to key metrics.
              </Text>
            </View>
          </View>
        </View>

        {/* Why Choose TechTime */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Why Choose TechTime?</Text>
          <Text style={styles.paragraph}>
            TechTime stands out as the premier job tracking solution for vehicle technicians, combining powerful 
            features with an intuitive interface. Unlike generic time tracking apps, TechTime is specifically 
            designed for automotive professionals, understanding the unique requirements of workshop environments.
          </Text>
          <Text style={styles.paragraph}>
            The app&apos;s focus on privacy (GDPR compliance), security (PIN and biometric authentication), and 
            precision (automatic AW calculations) makes it the ideal choice for professional technicians who 
            demand excellence in their tools.
          </Text>
          <Text style={styles.paragraph}>
            With features like live time tracking, efficiency calendars, professional reporting, job card scanning, 
            and comprehensive backup options, TechTime provides everything you need to manage your workload 
            effectively. The app&apos;s modern design, dark mode support, and smooth animations create a pleasant 
            user experience, while the robust architecture ensures reliability and performance.
          </Text>
        </View>

        {/* Technical Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Technical Specifications</Text>
          
          <Text style={styles.subsectionTitle}>System Requirements</Text>
          <Text style={styles.bulletPoint}>• Platform: iOS 13.0+ / Android 6.0+</Text>
          <Text style={styles.bulletPoint}>• Storage: Minimum 50MB free space</Text>
          <Text style={styles.bulletPoint}>• Permissions: Camera, Storage, Notifications</Text>
          <Text style={styles.bulletPoint}>• Internet: Optional (for Google Drive backup only)</Text>
          
          <Text style={styles.subsectionTitle}>Data Storage</Text>
          <Text style={styles.bulletPoint}>• Local storage: All data stored securely on device</Text>
          <Text style={styles.bulletPoint}>• GDPR compliant: Only vehicle registrations stored</Text>
          <Text style={styles.bulletPoint}>• Encryption: PIN and biometric authentication</Text>
          <Text style={styles.bulletPoint}>• Backup formats: JSON, PDF (import/export)</Text>
          
          <Text style={styles.subsectionTitle}>Calculations</Text>
          <Text style={styles.bulletPoint}>• AW Conversion: 1 AW = 5 minutes</Text>
          <Text style={styles.bulletPoint}>• Work Day: 8 AM - 5 PM (9 hours total)</Text>
          <Text style={styles.bulletPoint}>• Lunch Break: 12 PM - 1 PM (1 hour)</Text>
          <Text style={styles.bulletPoint}>• Net Work Time: 8 hours per day (excluding lunch)</Text>
          <Text style={styles.bulletPoint}>• Monthly Target: 180 hours (default, customizable)</Text>
          <Text style={styles.bulletPoint}>• Efficiency: (Sold Hours / Available Hours) × 100</Text>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerIcon}>🔧</Text>
          <Text style={styles.footerTitle}>TechTime - Professional Job Tracking</Text>
          <Text style={styles.footerText}>Version 1.0.0 | Privacy Focused | Secure | Reliable</Text>
          <Text style={styles.footerText}>GDPR Compliant | Encrypted Storage | Professional Grade</Text>
          <Text style={styles.footerText}>© {new Date().getFullYear()} TechTime. All rights reserved.</Text>
          <Text style={styles.footerDate}>
            Document generated on {new Date().toLocaleDateString('en-US', { 
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
    borderRadius: 16,
    padding: 40,
    borderWidth: 2,
    borderColor: colors.border,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  heroIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroTagline: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
    marginLeft: 8,
  },
  featureGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 10,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footerSection: {
    marginTop: 32,
    marginBottom: 32,
    paddingTop: 32,
    paddingBottom: 24,
    borderTopWidth: 3,
    borderTopColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
  },
  footerIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  footerDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
