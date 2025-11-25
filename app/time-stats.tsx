
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

  // Calculate total day progress (8 AM to 5 PM)
  const dayStartHour = 8;
  const dayEndHour = 17;
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentSecond = currentTime.getSeconds();
  
  const totalDaySeconds = (dayEndHour - dayStartHour) * 3600;
  const elapsedDaySeconds = Math.max(0, 
    (currentHour - dayStartHour) * 3600 + currentMinute * 60 + currentSecond
  );
  const remainingDaySeconds = Math.max(0, totalDaySeconds - elapsedDaySeconds);
  const dayProgressPercentage = Math.min(100, (elapsedDaySeconds / totalDaySeconds) * 100);

  // Calculate available hours (8 AM to 5 PM = 9 hours total, minus 1 hour lunch = 8 hours)
  const totalAvailableSeconds = 8 * 3600; // 8 hours in seconds
  const availableHours = totalAvailableSeconds / 3600; // Convert to hours

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Time Stats</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Time - Synced with Home Page Clock */}
        <View style={styles.section}>
          <Text style={styles.clockIcon}>🕐</Text>
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

        {/* Available Hours Timer - Live Counting */}
        <View style={[styles.section, styles.availableHoursSection]}>
          <Text style={styles.availableHoursTitle}>⏰ Total Available Hours Today</Text>
          <Text style={styles.availableHoursSubtitle}>8:00 AM - 5:00 PM (excluding lunch)</Text>
          <View style={styles.availableHoursDisplay}>
            <Text style={styles.availableHoursValue}>
              {availableHours.toFixed(6)}
            </Text>
            <Text style={styles.availableHoursUnit}>hours</Text>
          </View>
          <Text style={styles.availableHoursNote}>
            💡 This represents your total available work hours for today
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

        {/* Main Progress Circles */}
        <View style={styles.progressSection}>
          <View style={styles.progressCard}>
            <ProgressCircle
              percentage={dayProgressPercentage}
              size={160}
              strokeWidth={14}
              color={colors.primary}
            />
            <Text style={styles.progressLabel}>Day Progress</Text>
            <Text style={styles.progressValue}>
              {dayProgressPercentage.toFixed(1)}%
            </Text>
            <Text style={styles.progressSubtext}>
              8 AM - 5 PM
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
            <Text style={styles.progressSubtext}>
              Excluding Lunch
            </Text>
          </View>
        </View>

        {/* Time Elapsed & Remaining - Live Ticking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Day Time Breakdown</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>⏳ Time Elapsed Today</Text>
              <Text style={styles.detailValue}>
                {formatTime(elapsedDaySeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(elapsedDaySeconds)}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${dayProgressPercentage}%`,
                      backgroundColor: colors.primary 
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>⏰ Time Remaining Today</Text>
              <Text style={styles.detailValue}>
                {formatTime(remainingDaySeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                {formatTimeReadable(remainingDaySeconds)}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${100 - dayProgressPercentage}%`,
                      backgroundColor: colors.error 
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>📊 Total Day Duration</Text>
              <Text style={styles.detailValue}>
                {formatTime(totalDaySeconds)}
              </Text>
              <Text style={styles.detailSubtext}>
                9 hours total
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: '100%',
                      backgroundColor: colors.success 
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Work Time Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💼 Work Time Details</Text>
          
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

        {/* Live Stats Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ Live Stats Information</Text>
          <Text style={styles.infoText}>
            - All times update every second in real-time
          </Text>
          <Text style={styles.infoText}>
            - Available hours timer shows total work hours (8 AM - 5 PM)
          </Text>
          <Text style={styles.infoText}>
            - Time elapsed shows how much of the day has passed
          </Text>
          <Text style={styles.infoText}>
            - Time remaining shows how much of the day is left
          </Text>
          <Text style={styles.infoText}>
            - Clock is synchronized with your device time
          </Text>
          <Text style={styles.infoText}>
            - Progress circles update automatically
          </Text>
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
  clockIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  currentDate: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  availableHoursSection: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  availableHoursTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  availableHoursSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  availableHoursDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  availableHoursValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  availableHoursUnit: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    opacity: 0.9,
  },
  availableHoursNote: {
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.85,
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
  progressSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
    fontVariant: ['tabular-nums'],
  },
  detailSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
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
    fontVariant: ['tabular-nums'],
  },
  infoSection: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  settingsButton: {
    marginTop: 8,
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
