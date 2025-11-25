
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TimeTrackingService, TimeStats } from '../utils/timeTrackingService';
import ProgressCircle from '../components/ProgressCircle';
import { useTheme } from '../contexts/ThemeContext';

export default function TimeStatsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Create styles at the top level so they're always available
  const styles = createStyles(colors);

  useEffect(() => {
    // Load initial stats
    loadStats();

    // Start live tracking
    const handleStatsUpdate = (newStats: TimeStats) => {
      setStats(newStats);
      setCurrentTime(new Date());
    };

    TimeTrackingService.startLiveTracking(handleStatsUpdate);

    // Cleanup
    return () => {
      TimeTrackingService.stopLiveTracking(handleStatsUpdate);
    };
  }, []);

  const loadStats = async () => {
    try {
      const currentStats = await TimeTrackingService.getCurrentStats();
      setStats(currentStats);
      console.log('Time stats loaded:', currentStats);
    } catch (error) {
      console.log('Error loading time stats:', error);
    }
  };

  if (!stats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Time Stats</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading time stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (seconds: number) => TimeTrackingService.formatTime(seconds);
  const formatTimeReadable = (seconds: number) => TimeTrackingService.formatTimeReadable(seconds);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Time Stats</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Time */}
        <View style={styles.section}>
          <Text style={styles.currentTime}>
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            })}
          </Text>
          <Text style={styles.currentDate}>
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* Status Indicators */}
        <View style={styles.statusSection}>
          <View style={[
            styles.statusCard,
            { backgroundColor: stats.isWorkDay ? colors.success : colors.error }
          ]}>
            <Text style={styles.statusIcon}>{stats.isWorkDay ? '✅' : '❌'}</Text>
            <Text style={styles.statusText}>
              {stats.isWorkDay ? 'Work Day' : 'Non-Work Day'}
            </Text>
          </View>

          <View style={[
            styles.statusCard,
            { backgroundColor: stats.isWorkTime ? colors.success : colors.textSecondary }
          ]}>
            <Text style={styles.statusIcon}>{stats.isWorkTime ? '⏰' : '🕐'}</Text>
            <Text style={styles.statusText}>
              {stats.isWorkTime ? 'Work Hours' : 'Outside Work Hours'}
            </Text>
          </View>

          <View style={[
            styles.statusCard,
            { backgroundColor: stats.isLunchTime ? colors.warning : colors.textSecondary }
          ]}>
            <Text style={styles.statusIcon}>{stats.isLunchTime ? '🍽️' : '🍴'}</Text>
            <Text style={styles.statusText}>
              {stats.isLunchTime ? 'Lunch Break' : 'Not Lunch Time'}
            </Text>
          </View>
        </View>

        {/* Progress Circles */}
        <View style={styles.progressSection}>
          <View style={styles.progressCard}>
            <ProgressCircle
              percentage={stats.progressPercentage}
              size={160}
              strokeWidth={14}
              color={colors.primary}
            />
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressValue}>
              {stats.progressPercentage.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.progressCard}>
            <ProgressCircle
              percentage={stats.workProgressPercentage}
              size={160}
              strokeWidth={14}
              color={colors.success}
            />
            <Text style={styles.progressLabel}>Work Progress</Text>
            <Text style={styles.progressValue}>
              {stats.workProgressPercentage.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.progressCard}>
            <ProgressCircle
              percentage={stats.lunchProgressPercentage}
              size={160}
              strokeWidth={14}
              color={colors.warning}
            />
            <Text style={styles.progressLabel}>Lunch Progress</Text>
            <Text style={styles.progressValue}>
              {stats.lunchProgressPercentage.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Time Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Work Time Details</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Elapsed Work Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(stats.elapsedWorkSeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(stats.elapsedWorkSeconds)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Remaining Work Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(stats.remainingWorkSeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(stats.remainingWorkSeconds)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Total Work Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(stats.totalWorkSeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(stats.totalWorkSeconds)}
              </Text>
            </View>
          </View>
        </View>

        {/* Lunch Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Lunch Break Details</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Elapsed Lunch Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(stats.elapsedLunchSeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(stats.elapsedLunchSeconds)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Remaining Lunch Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(stats.remainingLunchSeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(stats.remainingLunchSeconds)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Total Lunch Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(stats.totalLunchSeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(stats.totalLunchSeconds)}
              </Text>
            </View>
          </View>
        </View>

        {/* Schedule Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Today&apos;s Schedule</Text>
          
          <View style={styles.scheduleBox}>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Work Start:</Text>
              <Text style={styles.scheduleValue}>
                {stats.workStartTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Lunch Start:</Text>
              <Text style={styles.scheduleValue}>
                {stats.lunchStartTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Lunch End:</Text>
              <Text style={styles.scheduleValue}>
                {stats.lunchEndTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Work End:</Text>
              <Text style={styles.scheduleValue}>
                {stats.workEndTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Button */}
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/work-schedule')}
        >
          <Text style={styles.settingsButtonText}>⚙️ Edit Work Schedule</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  currentDate: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusSection: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  progressCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scheduleBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scheduleValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  settingsButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  settingsButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
