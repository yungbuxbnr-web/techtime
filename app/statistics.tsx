
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import ProgressCircle from '../components/ProgressCircle';
import NotificationToast from '../components/NotificationToast';

export default function StatisticsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [calculationMode, setCalculationMode] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

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
  };

  const clearSelection = () => {
    setSelectedJobs(new Set());
  };

  const calculateSelectedStats = () => {
    const selectedJobsData = jobs.filter(job => selectedJobs.has(job.id));
    if (selectedJobsData.length === 0) {
      showNotification('Please select jobs to calculate', 'info');
      return;
    }

    const totalAWs = selectedJobsData.reduce((sum, job) => sum + job.awValue, 0);
    const totalTime = selectedJobsData.reduce((sum, job) => sum + job.timeInMinutes, 0);
    const totalJobs = selectedJobsData.length;

    Alert.alert(
      'Selected Jobs Statistics',
      `Jobs: ${totalJobs}\nTotal AWs: ${totalAWs}\nTotal Time: ${CalculationService.formatTime(totalTime)}`,
      [{ text: 'OK' }]
    );
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

  const navigateToStats = (type: string) => {
    router.push(`/stats?type=${type}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const monthlyStats = CalculationService.calculateMonthlyStats(jobs);
  const today = new Date();
  const dailyJobs = CalculationService.getDailyJobs(jobs, today);
  const weeklyJobs = CalculationService.getWeeklyJobs(jobs, today);

  return (
    <SafeAreaView style={commonStyles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <View style={styles.header}>
        <Text style={commonStyles.title}>Statistics</Text>
        <TouchableOpacity
          style={styles.calculatorButton}
          onPress={() => setCalculationMode(!calculationMode)}
        >
          <Text style={styles.calculatorButtonText}>
            {calculationMode ? 'View Stats' : 'Calculator'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!calculationMode ? (
          // Statistics View
          <>
            {/* Monthly Progress */}
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Monthly Progress</Text>
              <View style={styles.progressContainer}>
                <ProgressCircle
                  percentage={monthlyStats.utilizationPercentage}
                  size={120}
                  strokeWidth={10}
                  color={monthlyStats.utilizationPercentage >= 100 ? colors.success : colors.primary}
                />
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {monthlyStats.utilizationPercentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.progressSubtext}>
                    {CalculationService.formatTime(monthlyStats.totalTime)} / {monthlyStats.targetHours}h
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigateToStats('aws')}
              >
                <Text style={styles.statValue}>{monthlyStats.totalAWs}</Text>
                <Text style={styles.statLabel}>Total AWs</Text>
                <Text style={styles.statSubtext}>This Month</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigateToStats('time')}
              >
                <Text style={styles.statValue}>
                  {CalculationService.formatTime(monthlyStats.totalTime)}
                </Text>
                <Text style={styles.statLabel}>Time Logged</Text>
                <Text style={styles.statSubtext}>This Month</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigateToStats('jobs')}
              >
                <Text style={styles.statValue}>{monthlyStats.totalJobs}</Text>
                <Text style={styles.statLabel}>Jobs Done</Text>
                <Text style={styles.statSubtext}>This Month</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigateToStats('remaining')}
              >
                <Text style={styles.statValue}>
                  {CalculationService.formatTime(Math.max(0, (monthlyStats.targetHours * 60) - monthlyStats.totalTime))}
                </Text>
                <Text style={styles.statLabel}>Remaining</Text>
                <Text style={styles.statSubtext}>This Month</Text>
              </TouchableOpacity>
            </View>

            {/* Daily & Weekly Stats */}
            <View style={styles.periodStats}>
              <Text style={styles.sectionTitle}>Today & This Week</Text>
              
              <View style={styles.periodCard}>
                <Text style={styles.periodTitle}>Today</Text>
                <View style={styles.periodDetails}>
                  <Text style={styles.periodDetail}>
                    {dailyJobs.length} jobs • {dailyJobs.reduce((sum, job) => sum + job.awValue, 0)} AWs
                  </Text>
                  <Text style={styles.periodDetail}>
                    {CalculationService.formatTime(dailyJobs.reduce((sum, job) => sum + job.timeInMinutes, 0))}
                  </Text>
                </View>
              </View>

              <View style={styles.periodCard}>
                <Text style={styles.periodTitle}>This Week</Text>
                <View style={styles.periodDetails}>
                  <Text style={styles.periodDetail}>
                    {weeklyJobs.length} jobs • {weeklyJobs.reduce((sum, job) => sum + job.awValue, 0)} AWs
                  </Text>
                  <Text style={styles.periodDetail}>
                    {CalculationService.formatTime(weeklyJobs.reduce((sum, job) => sum + job.timeInMinutes, 0))}
                  </Text>
                </View>
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.metricsSection}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Average AWs per Job</Text>
                <Text style={styles.metricValue}>
                  {monthlyStats.totalJobs > 0 ? (monthlyStats.totalAWs / monthlyStats.totalJobs).toFixed(1) : '0'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Average Time per Job</Text>
                <Text style={styles.metricValue}>
                  {monthlyStats.totalJobs > 0 
                    ? CalculationService.formatTime(monthlyStats.totalTime / monthlyStats.totalJobs)
                    : '0h 0m'
                  }
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Jobs per Day (Average)</Text>
                <Text style={styles.metricValue}>
                  {(monthlyStats.totalJobs / new Date().getDate()).toFixed(1)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          // Calculator Mode
          <>
            <View style={styles.calculatorHeader}>
              <Text style={styles.sectionTitle}>Job Calculator</Text>
              <View style={styles.calculatorControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={clearSelection}
                >
                  <Text style={styles.controlButtonText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.controlButton, styles.calculateButton]}
                  onPress={calculateSelectedStats}
                >
                  <Text style={styles.calculateButtonText}>Calculate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedJobs.size > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionText}>
                  {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
                </Text>
              </View>
            )}

            <View style={styles.jobsList}>
              {jobs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No jobs available</Text>
                  <Text style={commonStyles.textSecondary}>
                    Add some jobs to use the calculator
                  </Text>
                </View>
              ) : (
                jobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={[
                      styles.calculatorJobCard,
                      selectedJobs.has(job.id) && styles.selectedJobCard
                    ]}
                    onPress={() => toggleJobSelection(job.id)}
                  >
                    <View style={styles.jobCardHeader}>
                      <Text style={styles.wipNumber}>WIP: {job.wipNumber}</Text>
                      <Text style={styles.jobDate}>{formatDate(job.dateCreated)}</Text>
                    </View>
                    
                    <View style={styles.jobCardDetails}>
                      <Text style={styles.jobCardDetail}>
                        {job.vehicleRegistration} • {job.awValue} AWs • {CalculationService.formatTime(job.timeInMinutes)}
                      </Text>
                    </View>

                    {selectedJobs.has(job.id) && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calculatorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  calculatorButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  progressSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  periodStats: {
    marginBottom: 24,
  },
  periodCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  periodDetails: {
    gap: 4,
  },
  periodDetail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metricsSection: {
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  calculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  calculatorControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  selectionSummary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectionText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  jobsList: {
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  calculatorJobCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  selectedJobCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight || colors.card,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  wipNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  jobDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobCardDetails: {
    marginTop: 4,
  },
  jobCardDetail: {
    fontSize: 14,
    color: colors.text,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: colors.background,
    fontSize: 12,
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
