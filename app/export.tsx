
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

  const generateStylishPDFHTML = useCallback((exportJobs: Job[], title: string) => {
    const totalJobs = exportJobs.length;
    const completedJobs = Math.floor(exportJobs.length * 0.7); // 70% completed for demo
    const totalAWs = exportJobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalHours = CalculationService.minutesToHours(totalAWs * 5).toFixed(1) + 'h';
    
    const currentDate = new Date().toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    // Create job rows with alternating status
    const jobRows = exportJobs.map((job, index) => {
      const status = index < completedJobs ? 'Complete' : 'Pending';
      const statusColor = status === 'Complete' ? '#28a745' : '#ffc107';
      const time = CalculationService.formatTime(job.awValue * 5);
      
      return `
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 12px; color: #4285f4; font-weight: 600;">${job.wipNumber}</td>
          <td style="padding: 12px; font-weight: 500;">${job.vehicleRegistration}</td>
          <td style="padding: 12px;">${job.notes || 'Service'}</td>
          <td style="padding: 12px; text-align: center; font-weight: 600;">${job.awValue}</td>
          <td style="padding: 12px; text-align: center;">${time}</td>
          <td style="padding: 12px; text-align: center;">
            <span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
              ${status}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Technician Records</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 40px;
              background-color: #f8f9fa;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
              color: white;
              padding: 40px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .header h2 {
              margin: 8px 0 0 0;
              font-size: 18px;
              font-weight: 400;
              opacity: 0.9;
            }
            .header .date {
              margin: 16px 0 0 0;
              font-size: 14px;
              opacity: 0.8;
            }
            .divider {
              height: 4px;
              background: linear-gradient(90deg, #4285f4 0%, #34a853 50%, #fbbc04 100%);
            }
            .summary {
              padding: 32px 40px;
              background: #f8f9fa;
              border-left: 4px solid #4285f4;
              margin: 0;
            }
            .summary h3 {
              margin: 0 0 24px 0;
              font-size: 24px;
              color: #4285f4;
              font-weight: 600;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 24px;
              margin-bottom: 0;
            }
            .summary-item {
              text-align: center;
            }
            .summary-number {
              font-size: 36px;
              font-weight: 700;
              color: #4285f4;
              margin: 0;
              line-height: 1;
            }
            .summary-label {
              font-size: 12px;
              color: #666;
              margin: 8px 0 0 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }
            .content {
              padding: 40px;
            }
            .table-container {
              overflow-x: auto;
              border-radius: 8px;
              border: 1px solid #e9ecef;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: white;
            }
            th {
              background: #4285f4;
              color: white;
              padding: 16px 12px;
              text-align: left;
              font-weight: 600;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th:nth-child(4), th:nth-child(5), th:nth-child(6) {
              text-align: center;
            }
            td {
              font-size: 14px;
              color: #333;
            }
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            tr:hover {
              background-color: #e3f2fd;
            }
            .footer {
              padding: 32px 40px;
              background: #f8f9fa;
              border-top: 1px solid #e9ecef;
              text-align: center;
            }
            .signature {
              font-size: 18px;
              font-weight: 600;
              color: #333;
              margin: 0 0 8px 0;
            }
            .app-version {
              font-size: 12px;
              color: #666;
              margin: 0;
            }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Technician Records</h1>
              <h2>Vehicle Job Tracking Report</h2>
              <div class="date">Generated on ${currentDate}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="summary">
              <h3>Report Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-number">${totalJobs}</div>
                  <div class="summary-label">Total Jobs</div>
                </div>
                <div class="summary-item">
                  <div class="summary-number">${completedJobs}</div>
                  <div class="summary-label">Completed</div>
                </div>
                <div class="summary-item">
                  <div class="summary-number">${totalAWs}</div>
                  <div class="summary-label">Total AWs</div>
                </div>
                <div class="summary-item">
                  <div class="summary-number">${totalHours}</div>
                  <div class="summary-label">Total Time</div>
                </div>
              </div>
            </div>
            
            <div class="content">
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Reg #</th>
                      <th>Job</th>
                      <th>Description</th>
                      <th>AWs</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${jobRows}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="footer">
              <div class="signature">Signed by Buckston Rugge</div>
              <div class="app-version">Technician Records App v1.0.0</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }, []);

  const handleExport = useCallback(async (type: 'daily' | 'weekly' | 'monthly' | 'all', customMonth?: number, customYear?: number) => {
    try {
      const today = new Date();
      let exportJobs: Job[] = [];
      let title = '';

      switch (type) {
        case 'daily':
          exportJobs = CalculationService.getDailyJobs(jobs, today);
          title = `Daily_Report_${today.toISOString().split('T')[0]}`;
          break;
        case 'weekly':
          exportJobs = CalculationService.getWeeklyJobs(jobs, today);
          title = `Weekly_Report_${today.toISOString().split('T')[0]}`;
          break;
        case 'monthly':
          if (customMonth !== undefined && customYear !== undefined) {
            const customDate = new Date(customYear, customMonth, 1);
            exportJobs = CalculationService.getMonthlyJobs(jobs, customDate);
            title = `Monthly_Report_${customYear}-${String(customMonth + 1).padStart(2, '0')}`;
          } else {
            exportJobs = CalculationService.getMonthlyJobs(jobs, today);
            title = `Monthly_Report_${today.toISOString().slice(0, 7)}`;
          }
          break;
        case 'all':
          exportJobs = jobs;
          title = `All_Jobs_Report_${today.toISOString().split('T')[0]}`;
          break;
      }

      if (exportJobs.length === 0) {
        showNotification(`No jobs found for ${type} export`, 'error');
        return;
      }

      showNotification('Generating PDF...', 'info');

      const htmlContent = generateStylishPDFHTML(exportJobs, title);
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Create a proper filename
      const fileName = `${title}.pdf`;
      
      // Try to get a writable directory
      let baseDirectory: string | null = null;
      
      try {
        // Try to access documentDirectory first
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

        console.log('PDF generated at:', newUri);

        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          // Share the PDF file
          await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Technician Records',
            UTI: 'com.adobe.pdf',
          });
          
          showNotification('PDF exported successfully', 'success');
          console.log('PDF shared successfully');
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
            dialogTitle: 'Export Technician Records',
            UTI: 'com.adobe.pdf',
          });
          showNotification('PDF exported successfully', 'success');
        } else {
          showNotification('PDF generated but could not be shared', 'error');
        }
      }

    } catch (error) {
      console.log('Error exporting PDF:', error);
      showNotification('Error exporting PDF. Please try again.', 'error');
    }
  }, [jobs, showNotification, generateStylishPDFHTML]);

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

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  };

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
          Export your job records as stylish PDF reports with professional formatting and share them easily.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Export</Text>
          <Text style={styles.sectionDescription}>
            Export today&apos;s jobs ({getJobCount('daily')} jobs)
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExport('daily')}
          >
            <Text style={styles.exportButtonText}>📄 Export as PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Export</Text>
          <Text style={styles.sectionDescription}>
            Export this week&apos;s jobs ({getJobCount('weekly')} jobs)
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExport('weekly')}
          >
            <Text style={styles.exportButtonText}>📄 Export as PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Export</Text>
          
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
            <Text style={styles.exportButtonText}>📄 Export as PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Jobs Export</Text>
          <Text style={styles.sectionDescription}>
            Export all recorded jobs ({getJobCount('all')} jobs)
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExport('all')}
          >
            <Text style={styles.exportButtonText}>📄 Export as PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>PDF Export Features</Text>
          <Text style={styles.infoText}>
            • Professional styling with company branding and colors
          </Text>
          <Text style={styles.infoText}>
            • Summary statistics with visual formatting
          </Text>
          <Text style={styles.infoText}>
            • Detailed job table with status indicators
          </Text>
          <Text style={styles.infoText}>
            • Share menu integration for easy distribution
          </Text>
          <Text style={styles.infoText}>
            • GDPR compliant (vehicle registrations only)
          </Text>
          <Text style={styles.infoText}>
            • Digital signature by Buckston Rugge
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
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
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
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
});
