
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { router } from 'expo-router';
import { CalculationService } from '../utils/calculations';
import { Job, MonthlyStats } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useFocusEffect } from '@react-navigation/native';
import ProgressCircle from '../components/ProgressCircle';
import { StorageService } from '../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, BackHandler, Alert, Platform, useWindowDimensions } from 'react-native';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [technicianName, setTechnicianName] = useState('Buckston Rugge');
  const backPressCount = useRef(0);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [jobsData, settings] = await Promise.all([
        StorageService.getJobs(),
        StorageService.getSettings()
      ]);
      
      setJobs(jobsData);
      setTechnicianName(settings.technicianName || 'Buckston Rugge');
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const stats = CalculationService.calculateMonthlyStats(jobsData, currentMonth, currentYear);
      setMonthlyStats(stats);
      
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.log('Error loading dashboard data:', error);
      showNotification('Error loading data', 'error');
    }
  }, [showNotification]);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const settings = await StorageService.getSettings();
      if (!settings.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      await loadData();
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/auth');
    }
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      checkAuthAndLoadData();
      
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        backPressCount.current += 1;
        
        if (backPressCount.current === 1) {
          showNotification('Press back again to exit', 'info');
          setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);
          return true;
        }
        
        if (backPressCount.current === 2) {
          BackHandler.exitApp();
          return true;
        }
        
        return true;
      });

      return () => {
        backHandler.remove();
        backPressCount.current = 0;
      };
    }, [checkAuthAndLoadData, showNotification])
  );

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const navigateToJobs = () => {
    router.push('/jobs');
  };

  const navigateToAddJob = () => {
    router.push('/add-job');
  };

  const navigateToStatistics = () => {
    router.push('/statistics');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const navigateToJobRecords = () => {
    router.push('/job-records');
  };

  const navigateToStats = (type: string) => {
    router.push(`/stats?type=${type}`);
  };

  const toggleOptionsMenu = () => {
    setShowOptionsMenu(!showOptionsMenu);
  };

  const handleCheckForUpdates = async () => {
    try {
      if (Platform.OS === 'web') {
        showNotification('Updates are not available on web', 'info');
        return;
      }

      showNotification('Checking for updates...', 'info');
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        showNotification('Update available! Downloading...', 'info');
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Ready',
          'A new update has been downloaded. Restart the app to apply it.',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Restart Now', 
              onPress: async () => {
                await Updates.reloadAsync();
              }
            }
          ]
        );
      } else {
        showNotification('You are on the latest version', 'success');
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
      showNotification('Error checking for updates', 'error');
    }
    setShowOptionsMenu(false);
  };

  if (!monthlyStats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const efficiency = monthlyStats.efficiency || 0;
  const efficiencyColor = CalculationService.getEfficiencyColor(efficiency);
  const utilizationPercentage = monthlyStats.utilizationPercentage || 0;

  const styles = createStyles(colors, efficiencyColor, isLandscape);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Technician Records</Text>
          <Text style={styles.subtitle}>{technicianName}</Text>
        </View>
        <TouchableOpacity 
          style={styles.optionsButton}
          onPress={toggleOptionsMenu}
        >
          <Text style={styles.optionsButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {showOptionsMenu && (
        <View style={styles.optionsMenu}>
          <TouchableOpacity 
            style={styles.optionsMenuItem}
            onPress={handleCheckForUpdates}
          >
            <Text style={styles.optionsMenuText}>🔄 Check for Updates</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.optionsMenuItem}
            onPress={() => {
              setShowOptionsMenu(false);
              navigateToSettings();
            }}
          >
            <Text style={styles.optionsMenuText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Circles */}
        <View style={styles.progressSection}>
          <TouchableOpacity 
            style={styles.progressCard}
            onPress={() => navigateToStats('monthly')}
          >
            <Text style={styles.progressTitle}>Monthly Target</Text>
            <ProgressCircle
              percentage={utilizationPercentage}
              size={isLandscape ? 120 : 140}
              strokeWidth={isLandscape ? 10 : 12}
              color={colors.primary}
            />
            <Text style={styles.progressLabel}>
              {monthlyStats.totalSoldHours?.toFixed(1)}h / {monthlyStats.targetHours}h
            </Text>
            <Text style={styles.progressSubtext}>
              {utilizationPercentage.toFixed(0)}% Complete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.progressCard}
            onPress={() => navigateToStats('efficiency')}
          >
            <Text style={styles.progressTitle}>Efficiency</Text>
            <ProgressCircle
              percentage={efficiency}
              size={isLandscape ? 120 : 140}
              strokeWidth={isLandscape ? 10 : 12}
              color={efficiencyColor}
            />
            <Text style={styles.progressLabel}>
              {efficiency.toFixed(0)}%
            </Text>
            <Text style={[styles.progressSubtext, { color: efficiencyColor }]}>
              {CalculationService.getEfficiencyStatus(efficiency)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigateToStats('jobs')}
          >
            <Text style={styles.statValue}>{monthlyStats.totalJobs}</Text>
            <Text style={styles.statLabel}>Jobs This Month</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigateToStats('aws')}
          >
            <Text style={styles.statValue}>{monthlyStats.totalAWs}</Text>
            <Text style={styles.statLabel}>Total AWs</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigateToStats('time')}
          >
            <Text style={styles.statValue}>
              {CalculationService.formatTime(monthlyStats.totalTime)}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigateToStats('remaining')}
          >
            <Text style={styles.statValue}>
              {Math.max(0, (monthlyStats.totalAvailableHours || 0) - (monthlyStats.totalSoldHours || 0)).toFixed(1)}h
            </Text>
            <Text style={styles.statLabel}>Hours Remaining</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryAction]}
            onPress={navigateToAddJob}
          >
            <Text style={styles.actionButtonIcon}>➕</Text>
            <Text style={styles.actionButtonText}>Add Job</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={navigateToJobs}
          >
            <Text style={styles.actionButtonIcon}>📋</Text>
            <Text style={styles.actionButtonText}>View Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={navigateToJobRecords}
          >
            <Text style={styles.actionButtonIcon}>📊</Text>
            <Text style={styles.actionButtonText}>Job Records</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={navigateToStatistics}
          >
            <Text style={styles.actionButtonIcon}>📈</Text>
            <Text style={styles.actionButtonText}>Statistics</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {jobs.slice(0, 3).map((job) => (
            <View key={job.id} style={styles.recentJobCard}>
              <View style={styles.recentJobHeader}>
                <Text style={styles.recentJobWip}>WIP: {job.wipNumber}</Text>
                <Text style={styles.recentJobAw}>{job.awValue} AWs</Text>
              </View>
              <Text style={styles.recentJobReg}>{job.vehicleRegistration}</Text>
              <Text style={styles.recentJobTime}>
                {CalculationService.formatTime(job.timeInMinutes)}
              </Text>
            </View>
          ))}
          {jobs.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No jobs recorded yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap &quot;Add Job&quot; to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToJobs}>
          <Text style={styles.navText}>Jobs</Text>
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

const createStyles = (colors: any, efficiencyColor: string, isLandscape: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
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
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: isLandscape ? 24 : 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: isLandscape ? 14 : 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  optionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionsButtonText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '600',
  },
  optionsMenu: {
    position: 'absolute',
    top: isLandscape ? 60 : 70,
    right: 20,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 5,
    zIndex: 1000,
    minWidth: 200,
  },
  optionsMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionsMenuText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressSection: {
    flexDirection: isLandscape ? 'row' : 'column',
    gap: isLandscape ? 16 : 20,
    marginTop: isLandscape ? 16 : 24,
    marginBottom: isLandscape ? 16 : 24,
  },
  progressCard: {
    flex: isLandscape ? 1 : undefined,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: isLandscape ? 16 : 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  progressTitle: {
    fontSize: isLandscape ? 16 : 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: isLandscape ? 12 : 16,
  },
  progressLabel: {
    fontSize: isLandscape ? 14 : 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: isLandscape ? 12 : 16,
  },
  progressSubtext: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isLandscape ? 12 : 16,
    marginBottom: isLandscape ? 16 : 24,
  },
  statCard: {
    flex: 1,
    minWidth: isLandscape ? '22%' : '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 12 : 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  statValue: {
    fontSize: isLandscape ? 20 : 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: isLandscape ? 11 : 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isLandscape ? 12 : 16,
    marginBottom: isLandscape ? 16 : 24,
  },
  actionButton: {
    flex: 1,
    minWidth: isLandscape ? '22%' : '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 12 : 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonIcon: {
    fontSize: isLandscape ? 28 : 32,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  recentSection: {
    marginBottom: isLandscape ? 16 : 24,
  },
  sectionTitle: {
    fontSize: isLandscape ? 18 : 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: isLandscape ? 12 : 16,
  },
  recentJobCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 12 : 16,
    marginBottom: isLandscape ? 8 : 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  recentJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentJobWip: {
    fontSize: isLandscape ? 14 : 16,
    fontWeight: '700',
    color: colors.text,
  },
  recentJobAw: {
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '600',
    color: colors.primary,
  },
  recentJobReg: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recentJobTime: {
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 24 : 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: isLandscape ? 14 : 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
