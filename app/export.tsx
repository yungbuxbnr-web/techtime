
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function ExportScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const jobsData = await StorageService.getJobs();
      setJobs(jobsData);
      console.log('Loaded jobs for export:', jobsData.length);
    } catch (error) {
      console.log('Error loading jobs:', error);
      showNotification('Error loading jobs', 'error');
    }
  }, [showNotification]);

  const checkAuthAndLoadJobs = useCallback(async () => {
    try {
      const settings = await StorageService.getSettings();
      if (!settings.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      await loadJobs();
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/auth');
    }
  }, [loadJobs]);

  useEffect(() => {
    checkAuthAndLoadJobs();
  }, [checkAuthAndLoadJobs]);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const getMonthName = useCallback((month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }, []);

  const generateStylishPDFHTML = useCallback((exportJobs: Job[], title: string, reportType: string) => {
    const totalJobs = exportJobs.length;
    const totalAWs = exportJobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalMinutes = totalAWs * 5;
    const totalHours = CalculationService.minutesToHours(totalMinutes);
    const formattedTotalTime = CalculationService.formatTime(totalMinutes);
    
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

    // Sort jobs by date (newest first)
    const sortedJobs = [...exportJobs].sort((a, b) => 
      new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );

    // Create job rows with proper formatting
    const jobRows = sortedJobs.map((job, index) => {
      const time = CalculationService.formatTime(job.awValue * 5);
      const jobDate = new Date(job.dateCreated).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const jobTime = new Date(job.dateCreated).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 14px 12px; color: #1a73e8; font-weight: 700; font-size: 15px;">${job.wipNumber}</td>
          <td style="padding: 14px 12px; font-weight: 600; color: #333;">${job.vehicleRegistration}</td>
          <td style="padding: 14px 12px; color: #555; max-width: 200px; word-wrap: break-word;">${job.notes || 'Standard Service'}</td>
          <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #1a73e8; font-size: 16px;">${job.awValue}</td>
          <td style="padding: 14px 12px; text-align: center; font-weight: 600; color: #333;">${time}</td>
          <td style="padding: 14px 12px; text-align: center; font-size: 13px; color: #666;">${jobDate}<br/><span style="font-size: 11px; color: #999;">${jobTime}</span></td>
        </tr>
      `;
    }).join('');

    // Calculate average AWs per job
    const avgAWs = totalJobs > 0 ? (totalAWs / totalJobs).toFixed(1) : '0';
    
    // Calculate efficiency metrics
    const targetAWsPerHour = 12; // Assuming 12 AWs per hour as target
    const actualAWsPerHour = totalHours > 0 ? (totalAWs / totalHours).toFixed(1) : '0';
    const efficiency = totalHours > 0 ? Math.min(((totalAWs / totalHours) / targetAWsPerHour) * 100, 100).toFixed(0) : '0';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Technician Records - ${reportType}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              margin: 0;
              padding: 30px;
              background-color: #ffffff;
              color: #333;
              line-height: 1.5;
              font-size: 14px;
            }
            .container {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
              border: 1px solid #e8eaed;
            }
            .header {
              background: linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #34a853 100%);
              color: white;
              padding: 48px 40px;
              text-align: center;
              position: relative;
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 6px;
              background: linear-gradient(90deg, #ea4335 0%, #fbbc04 25%, #34a853 50%, #4285f4 75%, #9c27b0 100%);
            }
            .header h1 {
              margin: 0 0 8px 0;
              font-size: 36px;
              font-weight: 700;
              letter-spacing: -1px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .header h2 {
              margin: 0 0 16px 0;
              font-size: 20px;
              font-weight: 400;
              opacity: 0.95;
              letter-spacing: 0.5px;
            }
            .header .report-type {
              background: rgba(255, 255, 255, 0.2);
              padding: 8px 16px;
              border-radius: 20px;
              display: inline-block;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 16px;
              backdrop-filter: blur(10px);
            }
            .header .date-time {
              font-size: 14px;
              opacity: 0.9;
              margin: 0;
            }
            .summary {
              padding: 40px;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border-bottom: 1px solid #e8eaed;
            }
            .summary h3 {
              margin: 0 0 32px 0;
              font-size: 28px;
              color: #1a73e8;
              font-weight: 700;
              text-align: center;
              letter-spacing: -0.5px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 24px;
              margin-bottom: 32px;
            }
            .summary-item {
              text-align: center;
              background: white;
              padding: 24px 16px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              border: 1px solid #e8eaed;
              transition: transform 0.2s ease;
            }
            .summary-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
            }
            .summary-number {
              font-size: 42px;
              font-weight: 800;
              color: #1a73e8;
              margin: 0 0 8px 0;
              line-height: 1;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            .summary-label {
              font-size: 13px;
              color: #5f6368;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            .efficiency-section {
              background: linear-gradient(135deg, #e8f0fe 0%, #f1f8e9 100%);
              padding: 24px;
              border-radius: 12px;
              margin-top: 24px;
              border: 1px solid #dadce0;
            }
            .efficiency-title {
              font-size: 18px;
              font-weight: 700;
              color: #1a73e8;
              margin: 0 0 16px 0;
              text-align: center;
            }
            .efficiency-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }
            .efficiency-item {
              text-align: center;
              background: white;
              padding: 16px;
              border-radius: 8px;
              border: 1px solid #e8eaed;
            }
            .efficiency-number {
              font-size: 24px;
              font-weight: 700;
              color: #34a853;
              margin: 0 0 4px 0;
            }
            .efficiency-label {
              font-size: 11px;
              color: #5f6368;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }
            .content {
              padding: 40px;
            }
            .table-title {
              font-size: 24px;
              font-weight: 700;
              color: #1a73e8;
              margin: 0 0 24px 0;
              text-align: center;
              letter-spacing: -0.5px;
            }
            .table-container {
              overflow-x: auto;
              border-radius: 12px;
              border: 1px solid #e8eaed;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: white;
            }
            th {
              background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
              color: white;
              padding: 18px 12px;
              text-align: left;
              font-weight: 700;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-bottom: 3px solid #1557b0;
            }
            th:nth-child(4), th:nth-child(5), th:nth-child(6) {
              text-align: center;
            }
            td {
              font-size: 14px;
              color: #333;
              border-bottom: 1px solid #f1f3f4;
            }
            tr:nth-child(even) {
              background-color: #fafbfc;
            }
            tr:hover {
              background-color: #e8f0fe;
              transition: background-color 0.2s ease;
            }
            .totals-section {
              background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
              color: white;
              padding: 32px 40px;
              text-align: center;
            }
            .totals-title {
              font-size: 24px;
              font-weight: 700;
              margin: 0 0 24px 0;
              letter-spacing: -0.5px;
            }
            .totals-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 24px;
            }
            .totals-item {
              background: rgba(255, 255, 255, 0.15);
              padding: 20px;
              border-radius: 12px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .totals-number {
              font-size: 32px;
              font-weight: 800;
              margin: 0 0 8px 0;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .totals-label {
              font-size: 14px;
              opacity: 0.9;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            .footer {
              padding: 32px 40px;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border-top: 1px solid #e8eaed;
              text-align: center;
            }
            .signature {
              font-size: 20px;
              font-weight: 700;
              color: #1a73e8;
              margin: 0 0 8px 0;
              letter-spacing: -0.5px;
            }
            .app-version {
              font-size: 12px;
              color: #5f6368;
              margin: 0 0 16px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .disclaimer {
              font-size: 11px;
              color: #9aa0a6;
              margin: 16px 0 0 0;
              font-style: italic;
              line-height: 1.4;
            }
            @media print {
              body { 
                background: white; 
                padding: 20px;
              }
              .container { 
                box-shadow: none; 
                border: none;
              }
              .summary-item:hover,
              tr:hover {
                transform: none;
                background-color: inherit;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="report-type">${reportType} Report</div>
              <h1>Technician Records</h1>
              <h2>Professional Vehicle Service Tracking</h2>
              <div class="date-time">Generated on ${currentDate} at ${currentTime}</div>
            </div>
            
            <div class="summary">
              <h3>📊 Report Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-number">${totalJobs}</div>
                  <div class="summary-label">Total Jobs</div>
                </div>
                <div class="summary-item">
                  <div class="summary-number">${totalAWs}</div>
                  <div class="summary-label">Total AWs</div>
                </div>
                <div class="summary-item">
                  <div class="summary-number">${totalHours.toFixed(1)}h</div>
                  <div class="summary-label">Total Hours</div>
                </div>
                <div class="summary-item">
                  <div class="summary-number">${avgAWs}</div>
                  <div class="summary-label">Avg AWs/Job</div>
                </div>
              </div>
              
              <div class="efficiency-section">
                <div class="efficiency-title">⚡ Performance Metrics</div>
                <div class="efficiency-grid">
                  <div class="efficiency-item">
                    <div class="efficiency-number">${actualAWsPerHour}</div>
                    <div class="efficiency-label">AWs per Hour</div>
                  </div>
                  <div class="efficiency-item">
                    <div class="efficiency-number">${efficiency}%</div>
                    <div class="efficiency-label">Efficiency</div>
                  </div>
                  <div class="efficiency-item">
                    <div class="efficiency-number">${formattedTotalTime}</div>
                    <div class="efficiency-label">Total Time</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="content">
              <div class="table-title">🔧 Detailed Job Records</div>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>WIP Number</th>
                      <th>Vehicle Reg</th>
                      <th>Job Description</th>
                      <th>AWs</th>
                      <th>Time</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${jobRows}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="totals-section">
              <div class="totals-title">📈 Final Totals</div>
              <div class="totals-grid">
                <div class="totals-item">
                  <div class="totals-number">${totalJobs}</div>
                  <div class="totals-label">Jobs Completed</div>
                </div>
                <div class="totals-item">
                  <div class="totals-number">${totalAWs}</div>
                  <div class="totals-label">Total AWs</div>
                </div>
                <div class="totals-item">
                  <div class="totals-number">${formattedTotalTime}</div>
                  <div class="totals-label">Total Time</div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="signature">✍️ Digitally Signed by Buckston Rugge</div>
              <div class="app-version">Technician Records App v1.0.0</div>
              <div class="disclaimer">
                This report contains vehicle registration data only in compliance with GDPR regulations.<br/>
                Generated automatically by the Technician Records mobile application.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }, [getMonthName]);

  const handleExport = useCallback(async (type: 'daily' | 'weekly' | 'monthly' | 'all', customMonth?: number, customYear?: number) => {
    try {
      const today = new Date();
      let exportJobs: Job[] = [];
      let title = '';
      let reportType = '';

      switch (type) {
        case 'daily':
          exportJobs = CalculationService.getDailyJobs(jobs, today);
          title = `Daily_Report_${today.toISOString().split('T')[0]}`;
          reportType = 'Daily';
          break;
        case 'weekly':
          exportJobs = CalculationService.getWeeklyJobs(jobs, today);
          title = `Weekly_Report_${today.toISOString().split('T')[0]}`;
          reportType = 'Weekly';
          break;
        case 'monthly':
          if (customMonth !== undefined && customYear !== undefined) {
            const customDate = new Date(customYear, customMonth, 1);
            exportJobs = CalculationService.getMonthlyJobs(jobs, customDate);
            title = `Monthly_Report_${customYear}-${String(customMonth + 1).padStart(2, '0')}`;
            reportType = `Monthly - ${getMonthName(customMonth)} ${customYear}`;
          } else {
            exportJobs = CalculationService.getMonthlyJobs(jobs, today);
            title = `Monthly_Report_${today.toISOString().slice(0, 7)}`;
            reportType = `Monthly - ${getMonthName(today.getMonth())} ${today.getFullYear()}`;
          }
          break;
        case 'all':
          exportJobs = jobs;
          title = `All_Jobs_Report_${today.toISOString().split('T')[0]}`;
          reportType = 'Complete History';
          break;
      }

      if (exportJobs.length === 0) {
        showNotification(`No jobs found for ${type} export`, 'error');
        return;
      }

      showNotification('Generating stylish PDF report...', 'info');

      const htmlContent = generateStylishPDFHTML(exportJobs, title, reportType);
      
      // Generate PDF with high quality settings
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

      // Create a proper filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const fileName = `TechRecords_${reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
      
      // Try to get a writable directory - using proper property access
      let baseDirectory: string | null = null;
      
      try {
        // Access the properties directly from FileSystem
        if (FileSystem.documentDirectory) {
          baseDirectory = FileSystem.documentDirectory;
        } else if (FileSystem.cacheDirectory) {
          baseDirectory = FileSystem.cacheDirectory;
        }
      } catch (error) {
        console.log('Error accessing FileSystem directories:', error);
      }
      
      if (!baseDirectory) {
        console.log('No directory available for file storage');
        showNotification('File storage not available on this device', 'error');
        return;
      }
      
      const newUri = `${baseDirectory}${fileName}`;
      
      try {
        // Move the file to a permanent location
        await FileSystem.moveAsync({
          from: uri,
          to: newUri,
        });

        console.log('Stylish PDF generated at:', newUri);

        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          // Share the PDF file
          await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Export ${reportType} Report - Technician Records`,
            UTI: 'com.adobe.pdf',
          });
          
          showNotification(`${reportType} PDF exported successfully! 📄`, 'success');
          console.log('Stylish PDF shared successfully');
        } else {
          showNotification('PDF generated but sharing not available', 'info');
          console.log('Sharing not available on this platform');
        }
      } catch (moveError) {
        console.log('Error moving file:', moveError);
        // If move fails, try to share the original file
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Export ${reportType} Report - Technician Records`,
            UTI: 'com.adobe.pdf',
          });
          showNotification(`${reportType} PDF exported successfully! 📄`, 'success');
        } else {
          showNotification('PDF generated but could not be shared', 'error');
        }
      }

    } catch (error) {
      console.log('Error exporting PDF:', error);
      showNotification('Error exporting PDF. Please try again.', 'error');
    }
  }, [jobs, showNotification, generateStylishPDFHTML, getMonthName]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const getJobCount = useCallback((type: 'daily' | 'weekly' | 'monthly' | 'all', customMonth?: number, customYear?: number) => {
    const today = new Date();
    let count = 0;

    switch (type) {
      case 'daily':
        count = CalculationService.getDailyJobs(jobs, today).length;
        break;
      case 'weekly':
        count = CalculationService.getWeeklyJobs(jobs, today).length;
        break;
      case 'monthly':
        if (customMonth !== undefined && customYear !== undefined) {
          const customDate = new Date(customYear, customMonth, 1);
          count = CalculationService.getMonthlyJobs(jobs, customDate).length;
        } else {
          count = CalculationService.getMonthlyJobs(jobs, today).length;
        }
        break;
      case 'all':
        count = jobs.length;
        break;
    }

    return count;
  }, [jobs]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (direction === 'prev') {
      newMonth = selectedMonth - 1;
      if (newMonth < 0) {
        newMonth = 11;
        newYear = selectedYear - 1;
      }
    } else {
      newMonth = selectedMonth + 1;
      if (newMonth > 11) {
        newMonth = 0;
        newYear = selectedYear + 1;
      }
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const goToCurrentMonth = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  };

  return (
    <SafeAreaView style={commonStyles.container}>
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
        <Text style={commonStyles.title}>Export Data</Text>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Export your job records as stylish PDF reports with professional formatting, detailed tables, and comprehensive totals.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Daily Export</Text>
          <Text style={styles.sectionDescription}>
            Export today&apos;s jobs ({getJobCount('daily')} jobs)
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExport('daily')}
          >
            <Text style={styles.exportButtonText}>📄 Generate Daily PDF Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Weekly Export</Text>
          <Text style={styles.sectionDescription}>
            Export this week&apos;s jobs ({getJobCount('weekly')} jobs)
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExport('weekly')}
          >
            <Text style={styles.exportButtonText}>📄 Generate Weekly PDF Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Monthly Export</Text>
          
          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => handleMonthChange('prev')}
            >
              <Text style={styles.monthButtonText}>←</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.currentMonthButton}
              onPress={goToCurrentMonth}
            >
              <Text style={styles.monthText}>
                {getMonthName(selectedMonth)} {selectedYear}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => handleMonthChange('next')}
            >
              <Text style={styles.monthButtonText}>→</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionDescription}>
            Export jobs for {getMonthName(selectedMonth)} {selectedYear} ({getJobCount('monthly', selectedMonth, selectedYear)} jobs)
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExport('monthly', selectedMonth, selectedYear)}
          >
            <Text style={styles.exportButtonText}>📄 Generate Monthly PDF Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Complete History Export</Text>
          <Text style={styles.sectionDescription}>
            Export all recorded jobs ({getJobCount('all')} jobs)
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExport('all')}
          >
            <Text style={styles.exportButtonText}>📄 Generate Complete PDF Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>✨ Enhanced PDF Features</Text>
          <Text style={styles.infoText}>
            • 🎨 Professional styling with modern design and company branding
          </Text>
          <Text style={styles.infoText}>
            • 📊 Comprehensive summary statistics with visual formatting
          </Text>
          <Text style={styles.infoText}>
            • 📋 Detailed job table with all information organized clearly
          </Text>
          <Text style={styles.infoText}>
            • 📈 Performance metrics and efficiency calculations
          </Text>
          <Text style={styles.infoText}>
            • 🔢 Complete totals section at the bottom of each report
          </Text>
          <Text style={styles.infoText}>
            • 📱 Share menu integration for easy distribution
          </Text>
          <Text style={styles.infoText}>
            • 🔒 GDPR compliant (vehicle registrations only)
          </Text>
          <Text style={styles.infoText}>
            • ✍️ Digital signature by Buckston Rugge
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthButton: {
    backgroundColor: colors.card,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  currentMonthButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  exportButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfButton: {
    backgroundColor: colors.primary,
  },
  exportButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
  },
});
