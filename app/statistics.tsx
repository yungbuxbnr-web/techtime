
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';

export default function StatisticsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [calculationResult, setCalculationResult] = useState({
    totalJobs: 0,
    totalAWs: 0,
    totalTime: 0,
    totalHours: '',
    calculation: ''
  });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const loadJobs = useCallback(async () => {
    try {
      const jobsData = await StorageService.getJobs();
      // Sort jobs by date (newest first)
      const sortedJobs = jobsData.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
      setJobs(sortedJobs);
      console.log('Statistics loaded:', sortedJobs.length, 'jobs');
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

  const toggleJobSelection = (jobId: string) => {
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobs(newSelection);
    console.log('Job selection toggled:', jobId, 'Total selected:', newSelection.size);
  };

  const selectAllJobs = () => {
    const allJobIds = new Set(jobs.map(job => job.id));
    setSelectedJobs(allJobIds);
    showNotification(`Selected all ${jobs.length} jobs`, 'success');
  };

  const clearSelection = () => {
    setSelectedJobs(new Set());
    showNotification('Selection cleared', 'info');
  };

  const calculateSelectedHours = () => {
    const selectedJobsData = jobs.filter(job => selectedJobs.has(job.id));
    
    if (selectedJobsData.length === 0) {
      showNotification('Please select jobs to calculate', 'info');
      return;
    }

    const totalAWs = selectedJobsData.reduce((sum, job) => sum + job.awValue, 0);
    const totalTime = selectedJobsData.reduce((sum, job) => sum + job.timeInMinutes, 0);
    const totalJobs = selectedJobsData.length;
    const totalHours = CalculationService.formatTime(totalTime);

    // Create calculation breakdown
    const calculationBreakdown = selectedJobsData.map(job => 
      `WIP ${job.wipNumber}: ${job.awValue} AWs × 5 min = ${job.timeInMinutes} min`
    ).join('\n');

    const calculation = `${calculationBreakdown}\n\nTotal: ${totalAWs} AWs × 5 min = ${totalTime} min = ${totalHours}`;

    setCalculationResult({
      totalJobs,
      totalAWs,
      totalTime,
      totalHours,
      calculation
    });

    setShowCalculationModal(true);
    console.log('Calculation completed for', totalJobs, 'jobs:', totalHours);
  };

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  const navigateToJobs = () => {
    router.push('/jobs');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <Text style={commonStyles.title}>Statistics & Calculator</Text>
      </View>

      {/* Selection Controls */}
      <View style={styles.controlsSection}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedJobs.size} of {jobs.length} jobs selected
          </Text>
        </View>
        
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={selectAllJobs}
          >
            <Text style={styles.controlButtonText}>Select All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={clearSelection}
          >
            <Text style={styles.controlButtonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.calculateButton]}
            onPress={calculateSelectedHours}
          >
            <Text style={styles.calculateButtonText}>Calculate Hours</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jobs Table */}
      <ScrollView style={styles.tableContainer} showsVerticalScrollIndicator={false}>
        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No jobs available</Text>
            <Text style={commonStyles.textSecondary}>
              Add some jobs to view statistics
            </Text>
          </View>
        ) : (
          <>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.checkboxColumn}>
                <Text style={styles.headerText}>✓</Text>
              </View>
              <View style={styles.wipColumn}>
                <Text style={styles.headerText}>WIP</Text>
              </View>
              <View style={styles.regColumn}>
                <Text style={styles.headerText}>Registration</Text>
              </View>
              <View style={styles.awColumn}>
                <Text style={styles.headerText}>AWs</Text>
              </View>
              <View style={styles.timeColumn}>
                <Text style={styles.headerText}>Time</Text>
              </View>
              <View style={styles.dateColumn}>
                <Text style={styles.headerText}>Date</Text>
              </View>
            </View>

            {/* Table Rows */}
            {jobs.map((job, index) => (
              <TouchableOpacity
                key={job.id}
                style={[
                  styles.tableRow,
                  selectedJobs.has(job.id) && styles.selectedRow,
                  index % 2 === 0 && styles.evenRow
                ]}
                onPress={() => toggleJobSelection(job.id)}
              >
                <View style={styles.checkboxColumn}>
                  <View style={[
                    styles.checkbox,
                    selectedJobs.has(job.id) && styles.checkedBox
                  ]}>
                    {selectedJobs.has(job.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.wipColumn}>
                  <Text style={styles.cellText}>{job.wipNumber}</Text>
                </View>
                
                <View style={styles.regColumn}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {job.vehicleRegistration}
                  </Text>
                </View>
                
                <View style={styles.awColumn}>
                  <Text style={styles.cellText}>{job.awValue}</Text>
                </View>
                
                <View style={styles.timeColumn}>
                  <Text style={styles.cellText}>
                    {CalculationService.formatTime(job.timeInMinutes)}
                  </Text>
                </View>
                
                <View style={styles.dateColumn}>
                  <Text style={styles.cellTextSmall}>
                    {formatDate(job.dateCreated)}
                  </Text>
                  <Text style={styles.cellTextSmall}>
                    {formatTime(job.dateCreated)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Calculation Modal */}
      <Modal
        visible={showCalculationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalculationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Results</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalculationModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.resultSummary}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Selected Jobs:</Text>
                  <Text style={styles.resultValue}>{calculationResult.totalJobs}</Text>
                </View>
                
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Total AWs:</Text>
                  <Text style={styles.resultValue}>{calculationResult.totalAWs}</Text>
                </View>
                
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Total Time:</Text>
                  <Text style={styles.resultValue}>{calculationResult.totalHours}</Text>
                </View>
              </View>
              
              <View style={styles.calculationDetails}>
                <Text style={styles.calculationTitle}>Calculation Breakdown:</Text>
                <Text style={styles.calculationText}>{calculationResult.calculation}</Text>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowCalculationModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={navigateToDashboard}>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToJobs}>
          <Text style={styles.navText}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={[styles.navText, styles.navTextActive]}>Statistics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToSettings}>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  controlsSection: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectionInfo: {
    marginBottom: 12,
  },
  selectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  calculateButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  calculateButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  evenRow: {
    backgroundColor: colors.backgroundAlt,
  },
  selectedRow: {
    backgroundColor: colors.primaryLight || '#e3f2fd',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  checkboxColumn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wipColumn: {
    width: 60,
    justifyContent: 'center',
  },
  regColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  awColumn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeColumn: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateColumn: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  cellText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  cellTextSmall: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkedBox: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.backgroundAlt,
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 300,
  },
  resultSummary: {
    marginBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  calculationDetails: {
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 8,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  calculationText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  modalButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
