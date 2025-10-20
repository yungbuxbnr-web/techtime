
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  const checkAuthAndLoadJobs = useCallback(async () => {
    try {
      const settings = await StorageService.getSettings();
      if (!settings.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      const jobsData = await StorageService.getJobs();
      setJobs(jobsData);
      console.log('Statistics loaded:', jobsData.length, 'jobs');
    } catch (error) {
      console.log('Error loading jobs:', error);
      router.replace('/auth');
    }
  }, []);

  useEffect(() => {
    checkAuthAndLoadJobs();
  }, [checkAuthAndLoadJobs]);

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const toggleJobSelection = (jobId: string) => {
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobs(newSelection);
  };

  const selectAllJobs = () => {
    const allJobIds = new Set(jobs.map(job => job.id));
    setSelectedJobs(allJobIds);
    setShowSelectionModal(false);
  };

  const clearSelection = () => {
    setSelectedJobs(new Set());
    setShowSelectionModal(false);
  };

  const calculateSelectedHours = () => {
    const selected = jobs.filter(job => selectedJobs.has(job.id));
    const totalMinutes = selected.reduce((sum, job) => sum + job.timeInMinutes, 0);
    return CalculationService.minutesToHours(totalMinutes);
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
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate current month statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyJobs = CalculationService.getJobsByMonth(jobs, currentMonth, currentYear);
  const totalAWs = monthlyJobs.reduce((sum, job) => sum + job.awValue, 0);
  const totalSoldHours = CalculationService.calculateSoldHours(totalAWs);
  const totalAvailableHours = CalculationService.calculateAvailableHoursToDate(currentMonth, currentYear);
  const efficiency = CalculationService.calculateEfficiency(totalAWs, currentMonth, currentYear);
  const efficiencyColor = CalculationService.getEfficiencyColor(efficiency);
  const efficiencyStatus = CalculationService.getEfficiencyStatus(efficiency);

  // Calculate daily and weekly stats
  const today = new Date();
  const dailyJobs = CalculationService.getDailyJobs(jobs, today);
  const weeklyJobs = CalculationService.getWeeklyJobs(jobs, today);

  const dailyAWs = dailyJobs.reduce((sum, job) => sum + job.awValue, 0);
  const weeklyAWs = weeklyJobs.reduce((sum, job) => sum + job.awValue, 0);

  const styles = createStyles(colors, efficiencyColor);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.wholeView, { backgroundColor: colors.background }]}>
        <NotificationToast
          message={notification.message}
          type={notification.type}
          visible={notification.visible}
          onHide={hideNotification}
        />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Statistics</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Efficiency Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Efficiency</Text>
            <View style={styles.efficiencyCard}>
              <View style={styles.efficiencyHeader}>
                <Text style={styles.efficiencyPercentage}>{efficiency}%</Text>
                <Text style={[styles.efficiencyStatus, { color: efficiencyColor }]}>
                  {efficiencyStatus}
                </Text>
              </View>
              <View style={styles.efficiencyDetails}>
                <View style={styles.efficiencyRow}>
                  <Text style={styles.efficiencyLabel}>Total AW:</Text>
                  <Text style={styles.efficiencyValue}>{totalAWs}</Text>
                </View>
                <View style={styles.efficiencyRow}>
                  <Text style={styles.efficiencyLabel}>Sold Hours:</Text>
                  <Text style={styles.efficiencyValue}>{totalSoldHours.toFixed(2)}h</Text>
                </View>
                <View style={styles.efficiencyRow}>
                  <Text style={styles.efficiencyLabel}>Available Hours:</Text>
                  <Text style={styles.efficiencyValue}>{totalAvailableHours.toFixed(2)}h</Text>
                </View>
                <View style={styles.efficiencyRow}>
                  <Text style={styles.efficiencyLabel}>Remaining Hours:</Text>
                  <Text style={styles.efficiencyValue}>
                    {Math.max(0, totalAvailableHours - totalSoldHours).toFixed(2)}h
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Period Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Period Statistics</Text>
            
            <View style={styles.periodCard}>
              <Text style={styles.periodTitle}>Today</Text>
              <View style={styles.periodStats}>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>Jobs</Text>
                  <Text style={styles.periodStatValue}>{dailyJobs.length}</Text>
                </View>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>AWs</Text>
                  <Text style={styles.periodStatValue}>{dailyAWs}</Text>
                </View>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>Hours</Text>
                  <Text style={styles.periodStatValue}>
                    {CalculationService.calculateSoldHours(dailyAWs).toFixed(2)}h
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.periodCard}>
              <Text style={styles.periodTitle}>This Week</Text>
              <View style={styles.periodStats}>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>Jobs</Text>
                  <Text style={styles.periodStatValue}>{weeklyJobs.length}</Text>
                </View>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>AWs</Text>
                  <Text style={styles.periodStatValue}>{weeklyAWs}</Text>
                </View>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>Hours</Text>
                  <Text style={styles.periodStatValue}>
                    {CalculationService.calculateSoldHours(weeklyAWs).toFixed(2)}h
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.periodCard}>
              <Text style={styles.periodTitle}>This Month</Text>
              <View style={styles.periodStats}>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>Jobs</Text>
                  <Text style={styles.periodStatValue}>{monthlyJobs.length}</Text>
                </View>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>AWs</Text>
                  <Text style={styles.periodStatValue}>{totalAWs}</Text>
                </View>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>Hours</Text>
                  <Text style={styles.periodStatValue}>{totalSoldHours.toFixed(2)}h</Text>
                </View>
              </View>
            </View>
          </View>

          {/* All Time Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Time</Text>
            <View style={styles.allTimeCard}>
              <View style={styles.allTimeStat}>
                <Text style={styles.allTimeValue}>{jobs.length}</Text>
                <Text style={styles.allTimeLabel}>Total Jobs</Text>
              </View>
              <View style={styles.allTimeStat}>
                <Text style={styles.allTimeValue}>
                  {jobs.reduce((sum, job) => sum + job.awValue, 0)}
                </Text>
                <Text style={styles.allTimeLabel}>Total AWs</Text>
              </View>
              <View style={styles.allTimeStat}>
                <Text style={styles.allTimeValue}>
                  {CalculationService.calculateSoldHours(
                    jobs.reduce((sum, job) => sum + job.awValue, 0)
                  ).toFixed(1)}h
                </Text>
                <Text style={styles.allTimeLabel}>Total Hours</Text>
              </View>
            </View>
          </View>

          {/* Job Selection */}
          {selectedJobs.size > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selected Jobs</Text>
              <View style={styles.selectionCard}>
                <Text style={styles.selectionText}>
                  {selectedJobs.size} jobs selected
                </Text>
                <Text style={styles.selectionHours}>
                  {calculateSelectedHours().toFixed(2)} hours
                </Text>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearSelection}
                >
                  <Text style={styles.clearButtonText}>Clear Selection</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Recent Jobs */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Jobs</Text>
              <TouchableOpacity onPress={() => setShowSelectionModal(true)}>
                <Text style={styles.selectLink}>Select Jobs</Text>
              </TouchableOpacity>
            </View>
            {jobs.slice(0, 10).map(job => (
              <TouchableOpacity
                key={job.id}
                style={[
                  styles.jobCard,
                  selectedJobs.has(job.id) && styles.jobCardSelected
                ]}
                onPress={() => toggleJobSelection(job.id)}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobWip}>WIP: {job.wipNumber}</Text>
                  <Text style={styles.jobAw}>{job.awValue} AWs</Text>
                </View>
                <Text style={styles.jobReg}>{job.vehicleRegistration}</Text>
                <View style={styles.jobFooter}>
                  <Text style={styles.jobDate}>
                    {formatDate(job.dateCreated)} • {formatTime(job.dateCreated)}
                  </Text>
                  <Text style={styles.jobTime}>
                    {CalculationService.formatTime(job.timeInMinutes)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Selection Modal */}
        <Modal
          visible={showSelectionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSelectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Job Selection</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={selectAllJobs}
              >
                <Text style={styles.modalButtonText}>Select All Jobs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={clearSelection}
              >
                <Text style={styles.modalButtonText}>Clear Selection</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSelectionModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, efficiencyColor: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wholeView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  selectLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  efficiencyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  efficiencyHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  efficiencyPercentage: {
    fontSize: 48,
    fontWeight: '700',
    color: efficiencyColor,
  },
  efficiencyStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  efficiencyDetails: {
    gap: 8,
  },
  efficiencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  efficiencyLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  efficiencyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  periodCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  periodStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  periodStat: {
    alignItems: 'center',
  },
  periodStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  periodStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  allTimeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allTimeStat: {
    alignItems: 'center',
  },
  allTimeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  allTimeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectionHours: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobWip: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  jobAw: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  jobReg: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalButtonCancel: {
    backgroundColor: colors.textSecondary,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
