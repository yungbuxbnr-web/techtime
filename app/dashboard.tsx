
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job, MonthlyStats } from '../types';
import NotificationToast from '../components/NotificationToast';
import ProgressCircle from '../components/ProgressCircle';

export default function DashboardScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalAWs: 0,
    totalTime: 0,
    totalJobs: 0,
    targetHours: 180,
    utilizationPercentage: 0
  });
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  useFocusEffect(
    useCallback(() => {
      loadData();
      console.log('Dashboard focused, loading data');
    }, [])
  );

  const loadData = async () => {
    try {
      const jobsData = await StorageService.getJobs();
      setJobs(jobsData);
      const stats = CalculationService.calculateMonthlyStats(jobsData);
      setMonthlyStats(stats);
      console.log('Dashboard data loaded:', { jobs: jobsData.length, stats });
    } catch (error) {
      console.log('Error loading data:', error);
      showNotification('Error loading data', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  };

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const navigateToJobs = () => {
    router.push('/jobs');
  };

  const navigateToAddJob = () => {
    router.push('/add-job');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const navigateToStats = (type: string) => {
    router.push(`/stats?type=${type}`);
  };

  return (
    <ImageBackground
      source={require('../assets/images/daebef9d-f2fa-4b34-88c6-4226954942a0.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={commonStyles.container}>
          <NotificationToast
            message={notification.message}
            type={notification.type}
            visible={notification.visible}
            onHide={hideNotification}
          />
          
          <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Technician Records</Text>
              <Text style={styles.subtitle}>Buckston Rugge</Text>
            </View>

            <View style={styles.progressSection}>
              <ProgressCircle
                percentage={monthlyStats.utilizationPercentage}
                size={120}
                strokeWidth={8}
                color={colors.primary}
              />
              <Text style={styles.progressText}>
                {monthlyStats.utilizationPercentage.toFixed(1)}% Monthly Progress
              </Text>
              <Text style={styles.progressSubtext}>
                {CalculationService.formatTime(monthlyStats.totalTime)} / {monthlyStats.targetHours}h
              </Text>
            </View>

            <View style={styles.statsGrid}>
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
                <Text style={styles.statLabel}>Time Logged</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigateToStats('jobs')}
              >
                <Text style={styles.statValue}>{monthlyStats.totalJobs}</Text>
                <Text style={styles.statLabel}>Jobs Completed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigateToStats('remaining')}
              >
                <Text style={styles.statValue}>
                  {CalculationService.formatTime((monthlyStats.targetHours * 60) - monthlyStats.totalTime)}
                </Text>
                <Text style={styles.statLabel}>Hours Remaining</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[commonStyles.button, styles.primaryButton]}
                onPress={navigateToAddJob}
              >
                <Text style={commonStyles.buttonText}>Add Job</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[commonStyles.button, styles.secondaryButton]}
                onPress={navigateToJobs}
              >
                <Text style={[commonStyles.buttonText, { color: colors.text }]}>View All Jobs</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => {}}>
              <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={navigateToJobs}>
              <Text style={styles.navText}>Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={navigateToSettings}>
              <Text style={styles.navText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  progressSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
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
