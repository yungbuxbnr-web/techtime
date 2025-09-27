
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';

export default function ExportScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const jobsData = await StorageService.getJobs();
      setJobs(jobsData);
    } catch (error) {
      console.log('Error loading jobs:', error);
      showNotification('Error loading jobs', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  };

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const generateExportData = (exportJobs: Job[]) => {
    const totalAWs = exportJobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalTime = totalAWs * 5; // minutes
    const totalJobs = exportJobs.length;

    return {
      jobs: exportJobs,
      summary: {
        totalJobs,
        totalAWs,
        totalTime: CalculationService.formatTime(totalTime),
        totalHours: CalculationService.minutesToHours(totalTime).toFixed(2)
      }
    };
  };

  const handleExport = (type: 'daily' | 'weekly' | 'monthly' | 'all', format: 'pdf' | 'excel') => {
    const today = new Date();
    let exportJobs: Job[] = [];
    let title = '';

    switch (type) {
      case 'daily':
        exportJobs = CalculationService.getDailyJobs(jobs, today);
        title = `Daily Report - ${today.toLocaleDateString('en-GB')}`;
        break;
      case 'weekly':
        exportJobs = CalculationService.getWeeklyJobs(jobs, today);
        title = `Weekly Report - Week of ${today.toLocaleDateString('en-GB')}`;
        break;
      case 'monthly':
        exportJobs = CalculationService.getMonthlyJobs(jobs, today);
        title = `Monthly Report - ${today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
        break;
      case 'all':
        exportJobs = jobs;
        title = 'All Jobs Report';
        break;
    }

    if (exportJobs.length === 0) {
      showNotification(`No jobs found for ${type} export`, 'error');
      return;
    }

    const exportData = generateExportData(exportJobs);
    
    // Simulate export process
    Alert.alert(
      'Export Ready',
      `${title}\n\nJobs: ${exportData.summary.totalJobs}\nTotal AWs: ${exportData.summary.totalAWs}\nTotal Time: ${exportData.summary.totalTime}\n\nFormat: ${format.toUpperCase()}\n\nNote: In a production app, this would generate and download the actual file.`,
      [
        { text: 'OK', onPress: () => showNotification('Export completed', 'success') }
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  const getJobCount = (type: 'daily' | 'weekly' | 'monthly' | 'all') => {
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
        count = CalculationService.getMonthlyJobs(jobs, today).length;
        break;
      case 'all':
        count = jobs.length;
        break;
    }

    return count;
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
          Export your job records in PDF or Excel format. Choose the time period and format below.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Export</Text>
          <Text style={styles.sectionDescription}>
            Export today&apos;s jobs ({getJobCount('daily')} jobs)
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.exportButton, styles.pdfButton]}
              onPress={() => handleExport('daily', 'pdf')}
            >
              <Text style={styles.exportButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, styles.excelButton]}
              onPress={() => handleExport('daily', 'excel')}
            >
              <Text style={styles.exportButtonText}>Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Export</Text>
          <Text style={styles.sectionDescription}>
            Export this week&apos;s jobs ({getJobCount('weekly')} jobs)
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.exportButton, styles.pdfButton]}
              onPress={() => handleExport('weekly', 'pdf')}
            >
              <Text style={styles.exportButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, styles.excelButton]}
              onPress={() => handleExport('weekly', 'excel')}
            >
              <Text style={styles.exportButtonText}>Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Export</Text>
          <Text style={styles.sectionDescription}>
            Export this month&apos;s jobs ({getJobCount('monthly')} jobs)
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.exportButton, styles.pdfButton]}
              onPress={() => handleExport('monthly', 'pdf')}
            >
              <Text style={styles.exportButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, styles.excelButton]}
              onPress={() => handleExport('monthly', 'excel')}
            >
              <Text style={styles.exportButtonText}>Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Jobs Export</Text>
          <Text style={styles.sectionDescription}>
            Export all recorded jobs ({getJobCount('all')} jobs)
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.exportButton, styles.pdfButton]}
              onPress={() => handleExport('all', 'pdf')}
            >
              <Text style={styles.exportButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, styles.excelButton]}
              onPress={() => handleExport('all', 'excel')}
            >
              <Text style={styles.exportButtonText}>Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Export Information</Text>
          <Text style={styles.infoText}>
            • PDF exports include job details grouped by month with clear separators
          </Text>
          <Text style={styles.infoText}>
            • Excel exports include pie charts showing job hours, AW distribution, and utilization
          </Text>
          <Text style={styles.infoText}>
            • All exports are GDPR compliant (vehicle registrations only)
          </Text>
          <Text style={styles.infoText}>
            • Weekly exports cover Monday to Sunday of the current week
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfButton: {
    backgroundColor: colors.error,
  },
  excelButton: {
    backgroundColor: colors.success,
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
