
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, BackHandler, Alert, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job, MonthlyStats } from '../types';
import ProgressCircle from '../components/ProgressCircle';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';
import * as Updates from 'expo-updates';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalJobs: 0,
    totalAWs: 0,
    totalTime: 0,
    totalSoldHours: 0,
    totalAvailableHours: 0,
    targetHours: 180,
    utilizationPercentage: 0,
    efficiency: 0,
  });
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const backPressCount = useRef(0);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const handleExitApp = useCallback(() => {
    Alert.alert(
      'Exit App',
      'Are you sure you want to exit? The app will close completely and you will need to sign in again next time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          onPress: async () => {
            try {
              console.log('Exiting app - resetting authentication...');
              
              // Reset authentication to ensure fresh start next time
              const settings = await StorageService.getSettings();
              await StorageService.saveSettings({ ...settings, isAuthenticated: false });
              console.log('Authentication reset for fresh start');
              
              // Close the app completely
              if (Platform.OS === 'android') {
                // On Android, we can exit the app
                BackHandler.exitApp();
              } else {
                // On iOS, we can't programmatically exit, but we can reload the app
                // This will effectively restart it
                try {
                  await Updates.reloadAsync();
                } catch (reloadError) {
                  console.log('Could not reload app:', reloadError);
                  // If reload fails, just show a message
                  showNotification('Please close the app manually', 'info');
                }
              }
            } catch (error) {
              console.log('Error during app exit:', error);
              // If anything fails, still try to exit on Android
              if (Platform.OS === 'android') {
                BackHandler.exitApp();
              } else {
                showNotification('Please close the app manually', 'info');
              }
            }
          }
        }
      ]
    );
  }, [showNotification]);

  const loadJobs = useCallback(async () => {
    try {
      const [jobsData, settings] = await Promise.all([
        StorageService.getJobs(),
        StorageService.getSettings()
      ]);
      setJobs(jobsData);
      
      // Get current month's absence hours
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const absenceHours = (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) 
        ? (settings.absenceHours || 0) 
        : 0;
      
      const stats = CalculationService.calculateMonthlyStats(jobsData, settings.targetHours || 180, absenceHours);
      setMonthlyStats(stats);
      console.log('Dashboard loaded:', jobsData.length, 'jobs');
      console.log('Stats:', {
        totalAWs: stats.totalAWs,
        soldHours: stats.totalSoldHours?.toFixed(2),
        availableHours: stats.totalAvailableHours?.toFixed(2),
        targetHours: stats.targetHours,
        absenceHours: absenceHours,
        efficiency: stats.efficiency
      });
    } catch (error) {
      console.log('Error loading jobs:', error);
      showNotification('Error loading data', 'error');
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

  useFocusEffect(
    useCallback(() => {
      checkAuthAndLoadJobs();
      
      const onBackPress = () => {
        backPressCount.current += 1;
        
        if (backPressCount.current === 1) {
          showNotification('Press back again to exit', 'info');
          setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);
          return true;
        } else if (backPressCount.current === 2) {
          handleExitApp();
          return true;
        }
        
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => subscription.remove();
    }, [checkAuthAndLoadJobs, showNotification, handleExitApp])
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

  const today = new Date();
  const dailyJobs = CalculationService.getDailyJobs(jobs, today);
  const weeklyJobs = CalculationService.getWeeklyJobs(jobs, today);

  // Get efficiency color
  const efficiency = monthlyStats.efficiency || 0;
  const efficiencyColor = CalculationService.getEfficiencyColor(efficiency);
  const efficiencyStatus = CalculationService.getEfficiencyStatus(efficiency);

  // Calculate target hours progress percentage - FIXED: sold hours out of target hours
  const targetHoursPercentage = monthlyStats.targetHours > 0 
    ? Math.min((monthlyStats.totalSoldHours / monthlyStats.targetHours) * 100, 100)
    : 0;

  const styles = createStyles(colors, efficiencyColor, isLandscape);

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
          <View>
            <Text style={styles.welcomeText}>Technician Records</Text>
            <Text style={styles.nameText}>Buckston Rugge</Text>
          </View>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={toggleOptionsMenu}
          >
            <Text style={styles.optionsButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>

        {showOptionsMenu && (
          <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                navigateToJobRecords();
              }}
            >
              <Text style={styles.optionText}>Job Records</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push('/export');
              }}
            >
              <Text style={styles.optionText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                handleExitApp();
              }}
            >
              <Text style={styles.optionText}>Exit App</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Two Progress Circles Side by Side */}
          <View style={styles.progressSection}>
            {/* Monthly Target Hours Circle - FIXED: Shows sold hours out of target hours */}
            <TouchableOpacity 
              style={styles.progressCircleContainer}
              onPress={() => navigateToStats('hours')}
            >
              <ProgressCircle
                percentage={targetHoursPercentage}
                size={isLandscape ? 120 : 140}
                strokeWidth={12}
                color={colors.primary}
              />
              <View style={styles.progressLabelsContainer}>
                <Text style={styles.progressLabel}>Monthly Target</Text>
                <Text style={styles.progressValue}>
                  {monthlyStats.totalSoldHours.toFixed(1)}h / {monthlyStats.targetHours}h
                </Text>
                <Text style={styles.progressSubtext}>
                  {targetHoursPercentage.toFixed(0)}% Complete
                </Text>
              </View>
            </TouchableOpacity>

            {/* Efficiency Circle */}
            <TouchableOpacity 
              style={styles.progressCircleContainer}
              onPress={() => navigateToStats('efficiency')}
            >
              <ProgressCircle
                percentage={efficiency}
                size={isLandscape ? 120 : 140}
                strokeWidth={12}
                color={efficiencyColor}
              />
              <View style={styles.progressLabelsContainer}>
                <Text style={styles.progressLabel}>Efficiency</Text>
                <Text style={[styles.efficiencyStatus, { color: efficiencyColor }]}>
                  {efficiencyStatus}
                </Text>
                <Text style={[styles.progressValue, { color: efficiencyColor }]}>
                  {efficiency}%
                </Text>
                <Text style={styles.progressSubtext}>
                  {monthlyStats.totalAvailableHours.toFixed(1)}h available
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Efficiency Details Card */}
          <View style={styles.efficiencyCard}>
            <Text style={styles.efficiencyCardTitle}>Monthly Breakdown</Text>
            <View style={styles.efficiencyRow}>
              <Text style={styles.efficiencyLabel}>Total AW:</Text>
              <Text style={styles.efficiencyValue}>{monthlyStats.totalAWs}</Text>
            </View>
            <View style={styles.efficiencyRow}>
              <Text style={styles.efficiencyLabel}>Total Sold Hours:</Text>
              <Text style={styles.efficiencyValue}>
                {(monthlyStats.totalSoldHours || 0).toFixed(2)}h
              </Text>
            </View>
            <View style={styles.efficiencyRow}>
              <Text style={styles.efficiencyLabel}>Monthly Target Hours:</Text>
              <Text style={styles.efficiencyValue}>
                {monthlyStats.targetHours}h
              </Text>
            </View>
            <View style={styles.efficiencyRow}>
              <Text style={styles.efficiencyLabel}>Total Available Hours:</Text>
              <Text style={styles.efficiencyValue}>
                {(monthlyStats.totalAvailableHours || 0).toFixed(2)}h
              </Text>
            </View>
            <View style={[styles.efficiencyRow, styles.efficiencyRowHighlight]}>
              <Text style={[styles.efficiencyLabel, styles.efficiencyLabelBold]}>
                Efficiency:
              </Text>
              <Text style={[styles.efficiencyValue, styles.efficiencyValueBold, { color: efficiencyColor }]}>
                {efficiency}%
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
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
                {Math.max(0, monthlyStats.targetHours - monthlyStats.totalSoldHours).toFixed(1)}h
              </Text>
              <Text style={styles.statLabel}>Hours Remaining</Text>
              <Text style={styles.statSubtext}>To Target</Text>
            </TouchableOpacity>
          </View>

          {/* Today & Week Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Today</Text>
              <Text style={styles.summaryValue}>
                {dailyJobs.length} jobs • {dailyJobs.reduce((sum, job) => sum + job.awValue, 0)} AWs
              </Text>
              <Text style={styles.summaryTime}>
                {CalculationService.formatTime(dailyJobs.reduce((sum, job) => sum + job.timeInMinutes, 0))}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>This Week</Text>
              <Text style={styles.summaryValue}>
                {weeklyJobs.length} jobs • {weeklyJobs.reduce((sum, job) => sum + job.awValue, 0)} AWs
              </Text>
              <Text style={styles.summaryTime}>
                {CalculationService.formatTime(weeklyJobs.reduce((sum, job) => sum + job.timeInMinutes, 0))}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={navigateToAddJob}
            >
              <Text style={styles.primaryActionText}>+ Add New Job</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={navigateToJobRecords}
              >
                <Text style={styles.secondaryActionText}>Job Records</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={navigateToStatistics}
              >
                <Text style={styles.secondaryActionText}>Statistics</Text>
              </TouchableOpacity>
            </View>
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
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, efficiencyColor: string, isLandscape: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wholeView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: isLandscape ? 12 : 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  welcomeText: {
    fontSize: isLandscape ? 14 : 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  nameText: {
    fontSize: isLandscape ? 20 : 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  optionsButton: {
    backgroundColor: colors.card,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  optionsButtonText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  optionsMenu: {
    position: 'absolute',
    top: isLandscape ? 60 : 80,
    right: 20,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 150,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingVertical: isLandscape ? 16 : 32,
    gap: isLandscape ? 12 : 16,
  },
  progressCircleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressLabelsContainer: {
    alignItems: 'center',
    marginTop: isLandscape ? 8 : 16,
  },
  progressLabel: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: isLandscape ? 14 : 16,
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '700',
  },
  progressSubtext: {
    fontSize: isLandscape ? 11 : 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  efficiencyStatus: {
    fontSize: isLandscape ? 11 : 12,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  efficiencyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 12 : 16,
    marginBottom: isLandscape ? 16 : 24,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  efficiencyCardTitle: {
    fontSize: isLandscape ? 14 : 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: isLandscape ? 8 : 12,
  },
  efficiencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isLandscape ? 6 : 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  efficiencyRowHighlight: {
    backgroundColor: colors.background,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  efficiencyLabel: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.textSecondary,
  },
  efficiencyLabelBold: {
    fontSize: isLandscape ? 14 : 16,
    fontWeight: '700',
    color: colors.text,
  },
  efficiencyValue: {
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  efficiencyValueBold: {
    fontSize: isLandscape ? 16 : 18,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isLandscape ? 8 : 12,
    marginBottom: isLandscape ? 16 : 24,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 12 : 16,
    width: isLandscape ? '23%' : '48%',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: isLandscape ? 16 : 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: isLandscape ? 10 : 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  summarySection: {
    flexDirection: isLandscape ? 'row' : 'column',
    gap: isLandscape ? 8 : 12,
    marginBottom: isLandscape ? 16 : 24,
  },
  summaryCard: {
    flex: isLandscape ? 1 : undefined,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: isLandscape ? 12 : 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: isLandscape ? 14 : 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: isLandscape ? 12 : 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryTime: {
    fontSize: isLandscape ? 16 : 18,
    fontWeight: '700',
    color: colors.primary,
  },
  actionsSection: {
    marginBottom: isLandscape ? 16 : 24,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: isLandscape ? 12 : 16,
    alignItems: 'center',
    marginBottom: isLandscape ? 8 : 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: isLandscape ? 16 : 18,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: isLandscape ? 8 : 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: isLandscape ? 10 : 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: isLandscape ? 12 : 14,
    fontWeight: '600',
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
