
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, BackHandler, Alert, Platform } from 'react-native';
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
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // For double-tap back to exit functionality
  const backPressCount = useRef(0);
  const backPressTimer = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const loadData = useCallback(async () => {
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

  // Handle back button press for double-tap to exit
  const handleBackPress = useCallback(() => {
    backPressCount.current += 1;
    console.log('Back button pressed, count:', backPressCount.current);
    
    if (backPressCount.current === 1) {
      showNotification('Press back again to exit app', 'info');
      
      // Reset counter after 2 seconds
      backPressTimer.current = setTimeout(() => {
        backPressCount.current = 0;
        console.log('Back press counter reset');
      }, 2000);
      
      return true; // Prevent default back action
    } else if (backPressCount.current >= 2) {
      // Clear timer and exit app
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
      
      console.log('Double back press detected - exiting app');
      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      }
      return false;
    }
    
    return true;
  }, [showNotification]);

  // Handle exit from options menu
  const handleExitApp = () => {
    Alert.alert(
      'Exit App',
      'Are you sure you want to exit the application?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowOptionsMenu(false),
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            console.log('User confirmed app exit from options menu');
            if (Platform.OS === 'android') {
              BackHandler.exitApp();
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      checkAuthAndLoadData();
      console.log('Dashboard focused, checking auth and loading data');
      
      // Reset back press counter when screen is focused
      backPressCount.current = 0;
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
      
      // Add back handler
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      
      return () => {
        backHandler.remove();
        // Clear timer on unmount
        if (backPressTimer.current) {
          clearTimeout(backPressTimer.current);
        }
        console.log('Dashboard unfocused, back handler removed');
      };
    }, [checkAuthAndLoadData, handleBackPress])
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

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const navigateToStats = (type: string) => {
    router.push(`/stats?type=${type}`);
  };

  const toggleOptionsMenu = () => {
    setShowOptionsMenu(!showOptionsMenu);
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
          
          {/* Options Menu */}
          {showOptionsMenu && (
            <View style={styles.optionsOverlay}>
              <TouchableOpacity 
                style={styles.optionsBackdrop} 
                onPress={() => setShowOptionsMenu(false)}
                activeOpacity={1}
              />
              <View style={styles.optionsMenu}>
                <Text style={styles.optionsTitle}>Options</Text>
                
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    navigateToSettings();
                  }}
                >
                  <Text style={styles.optionText}>Settings</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={handleExitApp}
                >
                  <Text style={[styles.optionText, styles.exitText]}>Exit App</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.optionItem, styles.cancelOption]}
                  onPress={() => setShowOptionsMenu(false)}
                >
                  <Text style={styles.optionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Technician Records</Text>
              <Text style={styles.subtitle}>Buckston Rugge</Text>
              
              {/* Options Button */}
              <TouchableOpacity
                style={styles.optionsButton}
                onPress={toggleOptionsMenu}
              >
                <Text style={styles.optionsButtonText}>⋯</Text>
              </TouchableOpacity>
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
    position: 'relative',
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
  optionsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  optionsButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  optionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  optionsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  optionsMenu: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
    elevation: 8,
  },
  optionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelOption: {
    backgroundColor: colors.backgroundAlt,
    marginTop: 8,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  exitText: {
    color: colors.error,
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
