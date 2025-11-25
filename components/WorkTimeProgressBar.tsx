
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { TimeTrackingService, TimeStats } from '../utils/timeTrackingService';
import { useTheme } from '../contexts/ThemeContext';

export default function WorkTimeProgressBar() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<TimeStats | null>(null);

  useEffect(() => {
    // Load initial stats
    loadStats();

    // Start live tracking
    const handleStatsUpdate = (newStats: TimeStats) => {
      setStats(newStats);
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
    } catch (error) {
      console.log('Error loading time stats:', error);
    }
  };

  const handlePress = () => {
    try {
      console.log('[WorkTimeProgressBar] Navigating to time-stats');
      router.push('/time-stats');
    } catch (error) {
      console.log('[WorkTimeProgressBar] Navigation error:', error);
    }
  };

  if (!stats || !stats.isWorkDay) {
    return null;
  }

  const formatTime = (seconds: number) => TimeTrackingService.formatTime(seconds);

  // Calculate progress bar segments
  const totalSeconds = stats.totalWorkSeconds + stats.totalLunchSeconds;
  const workBeforeLunchSeconds = Math.min(
    stats.elapsedWorkSeconds,
    (stats.lunchStartTime.getTime() - stats.workStartTime.getTime()) / 1000
  );
  const lunchSeconds = stats.elapsedLunchSeconds;
  const workAfterLunchSeconds = Math.max(0, stats.elapsedWorkSeconds - workBeforeLunchSeconds);

  const workBeforeLunchPercentage = (workBeforeLunchSeconds / totalSeconds) * 100;
  const lunchPercentage = (lunchSeconds / totalSeconds) * 100;
  const workAfterLunchPercentage = (workAfterLunchSeconds / totalSeconds) * 100;

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.title}>⏰ Today&apos;s Work Progress</Text>
        <Text style={styles.subtitle}>
          {stats.isWorkTime ? '🟢 Active' : stats.isLunchTime ? '🟡 Lunch' : '⚪ Inactive'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          {/* Work before lunch */}
          {workBeforeLunchPercentage > 0 && (
            <View
              style={[
                styles.progressSegment,
                {
                  width: `${workBeforeLunchPercentage}%`,
                  backgroundColor: colors.success,
                }
              ]}
            />
          )}
          
          {/* Lunch */}
          {lunchPercentage > 0 && (
            <View
              style={[
                styles.progressSegment,
                {
                  width: `${lunchPercentage}%`,
                  backgroundColor: colors.warning,
                  marginLeft: workBeforeLunchPercentage > 0 ? 0 : undefined,
                }
              ]}
            />
          )}
          
          {/* Work after lunch */}
          {workAfterLunchPercentage > 0 && (
            <View
              style={[
                styles.progressSegment,
                {
                  width: `${workAfterLunchPercentage}%`,
                  backgroundColor: colors.success,
                }
              ]}
            />
          )}
        </View>
      </View>

      {/* Time Labels */}
      <View style={styles.timeLabels}>
        <View style={styles.timeLabel}>
          <Text style={styles.timeLabelText}>
            {stats.workStartTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
          </Text>
        </View>
        <View style={styles.timeLabel}>
          <Text style={styles.timeLabelText}>
            {stats.workEndTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.success }]} />
          <Text style={styles.statLabel}>Work</Text>
          <Text style={styles.statValue}>
            {formatTime(stats.elapsedWorkSeconds)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.statLabel}>Lunch</Text>
          <Text style={styles.statValue}>
            {formatTime(stats.elapsedLunchSeconds)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.textSecondary }]} />
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={styles.statValue}>
            {formatTime(stats.remainingWorkSeconds)}
          </Text>
        </View>
      </View>

      {/* Progress Percentage */}
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {stats.progressPercentage.toFixed(1)}% Complete
        </Text>
        <Text style={styles.tapHint}>
          👆 Tap for detailed stats
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 24,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressSegment: {
    height: '100%',
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
  },
  timeLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  progressInfo: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  tapHint: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
