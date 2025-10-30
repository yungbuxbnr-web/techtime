
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function JobsScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const filterJobsByMonth = useCallback((jobsData: Job[], month: number, year: number) => {
    const filtered = jobsData.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate.getMonth() === month && jobDate.getFullYear() === year;
    });
    setFilteredJobs(filtered);
    console.log(`Filtered jobs for ${month + 1}/${year}:`, filtered.length);
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const jobsData = await StorageService.getJobs();
      // Sort jobs by date (newest first)
      const sortedJobs = jobsData.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
      setJobs(sortedJobs);
      filterJobsByMonth(sortedJobs, selectedMonth, selectedYear);
    } catch (error) {
      console.log('Error loading jobs:', error);
      showNotification('Error loading jobs', 'error');
    }
  }, [showNotification, selectedMonth, selectedYear, filterJobsByMonth]);

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

  useFocusEffect(
    useCallback(() => {
      checkAuthAndLoadJobs();
    }, [checkAuthAndLoadJobs])
  );

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const handleDeleteJob = (job: Job) => {
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete job ${job.wipNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteJob(job.id);
              showNotification('Job deleted successfully', 'success');
              loadJobs();
            } catch (error) {
              console.log('Error deleting job:', error);
              showNotification('Error deleting job', 'error');
            }
          }
        }
      ]
    );
  };

  const handleEditJob = (job: Job) => {
    // Navigate to edit job (we can use the same add-job screen with job data)
    router.push(`/add-job?editId=${job.id}`);
  };

  const navigateToAddJob = () => {
    router.push('/add-job');
  };

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  const navigateToStatistics = () => {
    router.push('/statistics');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
    filterJobsByMonth(jobs, newMonth, newYear);
  };

  const goToCurrentMonth = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    filterJobsByMonth(jobs, currentMonth, currentYear);
  };

  const getVhcColorValue = (color: 'green' | 'orange' | 'red' | null | undefined): string => {
    if (!color) return 'transparent';
    switch (color) {
      case 'green':
        return '#4CAF50';
      case 'orange':
        return '#FF9800';
      case 'red':
        return '#F44336';
      default:
        return 'transparent';
    }
  };

  const monthlyTotals = filteredJobs.reduce(
    (totals, job) => ({
      jobs: totals.jobs + 1,
      aws: totals.aws + job.awValue,
      time: totals.time + job.timeInMinutes,
    }),
    { jobs: 0, aws: 0, time: 0 }
  );

  const styles = createStyles(colors, isLandscape);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={navigateToAddJob}
        >
          <Text style={styles.addButtonText}>+ Add Job</Text>
        </TouchableOpacity>
      </View>

      {/* Month Filter Section */}
      <View style={styles.monthFilter}>
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
          <Text style={styles.jobCountText}>
            {filteredJobs.length} jobs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => handleMonthChange('next')}
        >
          <Text style={styles.monthButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Summary */}
      {filteredJobs.length > 0 && (
        <View style={styles.monthlySummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{monthlyTotals.jobs}</Text>
            <Text style={styles.summaryLabel}>Jobs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{monthlyTotals.aws}</Text>
            <Text style={styles.summaryLabel}>AWs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{CalculationService.formatTime(monthlyTotals.time)}</Text>
            <Text style={styles.summaryLabel}>Time</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No jobs recorded for {getMonthName(selectedMonth)} {selectedYear}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Tap &quot;Add Job&quot; to record your first job
            </Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {filteredJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                {/* VHC Color Indicator */}
                {job.vhcColor && (
                  <View 
                    style={[
                      styles.vhcIndicator, 
                      { backgroundColor: getVhcColorValue(job.vhcColor) }
                    ]} 
                  />
                )}
                
                <View style={styles.jobHeader}>
                  <View style={styles.jobHeaderLeft}>
                    <Text style={styles.wipNumber}>WIP: {job.wipNumber}</Text>
                    {job.vhcColor && (
                      <View style={styles.vhcBadge}>
                        <View 
                          style={[
                            styles.vhcBadgeDot, 
                            { backgroundColor: getVhcColorValue(job.vhcColor) }
                          ]} 
                        />
                        <Text style={styles.vhcBadgeText}>
                          VHC: {job.vhcColor.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.jobActions}>
                    <TouchableOpacity
                      onPress={() => handleEditJob(job)}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteJob(job)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.jobDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vehicle:</Text>
                    <Text style={styles.detailValue}>{job.vehicleRegistration}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>AWs:</Text>
                    <Text style={styles.detailValue}>{job.awValue}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>
                      {CalculationService.formatTime(job.timeInMinutes)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(job.dateCreated)}</Text>
                  </View>
                  
                  {job.notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{job.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={navigateToDashboard}>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={[styles.navText, styles.navTextActive]}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToStatistics}>
          <Text style={styles.navText}>Statistics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToSettings}>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isLandscape: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: isLandscape ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: isLandscape ? 24 : 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  monthFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: isLandscape ? 12 : 16,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthButton: {
    backgroundColor: colors.card,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  currentMonthButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  monthText: {
    fontSize: isLandscape ? 16 : 18,
    fontWeight: '600',
    color: colors.text,
  },
  jobCountText: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  monthlySummary: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: isLandscape ? 12 : 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: isLandscape ? 16 : 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: isLandscape ? 11 : 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  jobsList: {
    paddingVertical: isLandscape ? 12 : 16,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 12 : 16,
    marginBottom: isLandscape ? 8 : 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  vhcIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isLandscape ? 8 : 12,
    paddingLeft: 8,
  },
  jobHeaderLeft: {
    flex: 1,
  },
  wipNumber: {
    fontSize: isLandscape ? 16 : 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  vhcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  vhcBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  vhcBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  jobActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  jobDetails: {
    gap: isLandscape ? 6 : 8,
    paddingLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.text,
    marginTop: 4,
    lineHeight: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: isLandscape ? 8 : 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: isLandscape ? 6 : 8,
  },
  navText: {
    fontSize: isLandscape ? 14 : 16,
    fontWeight: '500',
    color: colors.text,
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
