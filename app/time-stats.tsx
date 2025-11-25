
import React, { useState, useEffect } from 'react';
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

  const styles = createStyles(colors);

  useEffect(() => {
    loadStats();

    const handleStatsUpdate = (newStats: TimeStats) => {
      setStats(newStats);
      setCurrentTime(new Date());
    };

    TimeTrackingService.startLiveTracking(handleStatsUpdate);

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

  // Calculate day progress (8 AM to 5 PM)
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

  // Available hours (8 hours total, excluding 1 hour lunch)
  const totalAvailableHours = 8;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Time Stats</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Time */}
        <View style={styles.clockSection}>
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
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* Status Indicators */}
        <View style={styles.statusSection}>
          <View style={[
            styles.statusCard,
            { backgroundColor: stats.isWorkDay ? colors.success : colors.textSecondary }
          ]}>
            <Text style={styles.statusIcon}>{stats.isWorkDay ? '✅' : '📅'}</Text>
            <Text style={styles.statusText}>
              {stats.isWorkDay ? 'Work Day' : 'Off Day'}
            </Text>
          </View>

          <View style={[
            styles.statusCard,
            { backgroundColor: stats.isWorkTime ? colors.primary : colors.textSecondary }
          ]}>
            <Text style={styles.statusIcon}>{stats.isWorkTime ? '⏰' : '🕐'}</Text>
            <Text style={styles.statusText}>
              {stats.isWorkTime ? 'Work Hours' : 'Off Hours'}
            </Text>
          </View>

          <View style={[
            styles.statusCard,
            { backgroundColor: stats.isLunchTime ? colors.warning : colors.textSecondary }
          ]}>
            <Text style={styles.statusIcon}>{stats.isLunchTime ? '🍽️' : '🍴'}</Text>
            <Text style={styles.statusText}>
              {stats.isLunchTime ? 'Lunch' : 'Working'}
            </Text>
          </View>
        </View>

        {/* Available Hours */}
        <View style={[styles.section, styles.availableHoursSection]}>
          <Text style={styles.sectionTitle}>Available Hours Today</Text>
          <View style={styles.availableHoursDisplay}>
            <Text style={styles.availableHoursValue}>
              {totalAvailableHours.toFixed(1)}
            </Text>
            <Text style={styles.availableHoursUnit}>hours</Text>
          </View>
          <Text style={styles.availableHoursNote}>
            8:00 AM - 5:00 PM (excluding lunch)
          </Text>
        </View>

        {/* Work Progress Circle */}
        <View style={styles.progressSection}>
          <ProgressCircle
            percentage={stats.workProgressPercentage}
            size={200}
            strokeWidth={16}
            color={colors.primary}
          />
          <Text style={styles.progressLabel}>Work Progress</Text>
          <Text style={styles.progressValue}>
            {stats.workProgressPercentage.toFixed(1)}%
          </Text>
        </View>

        {/* Time Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Breakdown</Text>
          
          <View style={styles.timeCard}>
            <View style={styles.timeCardHeader}>
              <Text style={styles.timeCardIcon}>⏳</Text>
              <Text style={styles.timeCardTitle}>Time Elapsed</Text>
            </View>
            <Text style={styles.timeCardValue}>
              {formatTime(elapsedDaySeconds)}
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

          <View style={styles.timeCard}>
            <View style={styles.timeCardHeader}>
              <Text style={styles.timeCardIcon}>⏰</Text>
              <Text style={styles.timeCardTitle}>Time Remaining</Text>
            </View>
            <Text style={styles.timeCardValue}>
              {formatTime(remainingDaySeconds)}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${100 - dayProgressPercentage}%`,
                    backgroundColor: colors.success 
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.timeCard}>
            <View style={styles.timeCardHeader}>
              <Text style={styles.timeCardIcon}>📊</Text>
              <Text style={styles.timeCardTitle}>Total Day Duration</Text>
            </View>
            <Text style={styles.timeCardValue}>
              {formatTime(totalDaySeconds)}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: '100%',
                    backgroundColor: colors.textSecondary 
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Work Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
          
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Work Start</Text>
              <Text style={styles.scheduleValue}>
                {stats.workStartTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Lunch</Text>
              <Text style={styles.scheduleValue}>
                {stats.lunchStartTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })} - {stats.lunchEndTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Work End</Text>
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

        <View style={{ height: 40 }} />
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
  clockSection: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  clockIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  currentDate: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusSection: {
    marginTop: 20,
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
    fontSize: 28,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  availableHoursSection: {
    alignItems: 'center',
  },
  availableHoursDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  availableHoursValue: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  availableHoursUnit: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  availableHoursNote: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  progressLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  progressValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
  },
  timeCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeCardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  timeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeCardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scheduleCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  scheduleValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  settingsButton: {
    marginTop: 20,
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
