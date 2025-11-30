
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import NotificationToast from '../components/NotificationToast';
import { TimeTrackingService } from '../utils/timeTrackingService';

const WORK_CALENDAR_KEY = 'work_calendar_data';

interface WorkCalendarData {
  [yearMonth: string]: {
    [day: number]: {
      isWorkDay: boolean;
      reason?: 'annual_leave' | 'external_training' | 'work';
    };
  };
}

export default function WorkScheduleCalendarScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const mode = params.mode as string | undefined;
  const isSaturdayMode = mode === 'saturday';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<WorkCalendarData>({});
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      const data = await AsyncStorage.getItem(WORK_CALENDAR_KEY);
      if (data) {
        setCalendarData(JSON.parse(data));
      }
    } catch (error) {
      console.log('Error loading calendar data:', error);
    }
  };

  const saveCalendarData = async (data: WorkCalendarData) => {
    try {
      await AsyncStorage.setItem(WORK_CALENDAR_KEY, JSON.stringify(data));
      setCalendarData(data);
    } catch (error) {
      console.log('Error saving calendar data:', error);
      showNotification('Error saving calendar data', 'error');
    }
  };

  const getYearMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleSaturdaySelection = async (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    // Check if it's a Saturday
    if (selectedDate.getDay() !== 6) {
      showNotification('Please select a Saturday', 'error');
      return;
    }

    // Check if it's in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      showNotification('Please select a future Saturday', 'error');
      return;
    }

    // Save the selected Saturday
    try {
      const settings = await TimeTrackingService.getSettings();
      const updatedSettings = {
        ...settings,
        nextSaturday: selectedDate.toISOString(),
      };
      await TimeTrackingService.saveSettings(updatedSettings);
      
      showNotification(
        `Next working Saturday set to ${selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        'success'
      );
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.log('Error saving Saturday selection:', error);
      showNotification('Error saving selection', 'error');
    }
  };

  const toggleDayStatus = (day: number) => {
    if (isSaturdayMode) {
      handleSaturdaySelection(day);
      return;
    }

    const yearMonthKey = getYearMonthKey(currentDate);
    const currentData = { ...calendarData };
    
    if (!currentData[yearMonthKey]) {
      currentData[yearMonthKey] = {};
    }

    const currentStatus = currentData[yearMonthKey][day];
    
    // Cycle through: work -> annual_leave -> external_training -> (remove)
    if (!currentStatus || !currentStatus.isWorkDay) {
      // Set as work day
      currentData[yearMonthKey][day] = { isWorkDay: true, reason: 'work' };
    } else if (currentStatus.reason === 'work') {
      // Set as annual leave
      currentData[yearMonthKey][day] = { isWorkDay: false, reason: 'annual_leave' };
    } else if (currentStatus.reason === 'annual_leave') {
      // Set as external training
      currentData[yearMonthKey][day] = { isWorkDay: false, reason: 'external_training' };
    } else {
      // Remove marking
      delete currentData[yearMonthKey][day];
    }

    saveCalendarData(currentData);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const yearMonthKey = getYearMonthKey(currentDate);
    const monthData = calendarData[yearMonthKey] || {};

    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Day headers
    const headers = dayNames.map((name, index) => (
      <View key={`header-${index}`} style={styles.dayHeader}>
        <Text style={[styles.dayHeaderText, { color: colors.text }]}>{name}</Text>
      </View>
    ));

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.dayCell} />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = monthData[day];
      const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isSaturday = cellDate.getDay() === 6;
      const isToday = 
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      let backgroundColor = colors.card;
      let borderColor = colors.border;
      let textColor = colors.text;
      let icon = '';

      if (isSaturdayMode) {
        // Saturday selection mode
        if (isSaturday) {
          backgroundColor = colors.primary + '20';
          borderColor = colors.primary;
          icon = '📅';
        } else {
          backgroundColor = colors.backgroundAlt;
          textColor = colors.textSecondary;
        }
      } else {
        // Regular calendar mode
        if (dayData) {
          if (dayData.isWorkDay && dayData.reason === 'work') {
            backgroundColor = colors.success + '20';
            borderColor = colors.success;
            icon = '✓';
          } else if (dayData.reason === 'annual_leave') {
            backgroundColor = '#ff9800' + '20';
            borderColor = '#ff9800';
            icon = '🏖️';
          } else if (dayData.reason === 'external_training') {
            backgroundColor = '#9c27b0' + '20';
            borderColor = '#9c27b0';
            icon = '📚';
          }
        }
      }

      if (isToday) {
        borderColor = colors.primary;
      }

      days.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.dayCell,
            { backgroundColor, borderColor, borderWidth: 2 }
          ]}
          onPress={() => toggleDayStatus(day)}
          disabled={isSaturdayMode && !isSaturday}
        >
          <Text style={[styles.dayNumber, { color: textColor }]}>{day}</Text>
          {icon && <Text style={styles.dayIcon}>{icon}</Text>}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendar}>
        <View style={styles.dayHeaderRow}>{headers}</View>
        <View style={styles.daysGrid}>{days}</View>
      </View>
    );
  };

  const getMonthStats = () => {
    const yearMonthKey = getYearMonthKey(currentDate);
    const monthData = calendarData[yearMonthKey] || {};
    
    let workDays = 0;
    let annualLeave = 0;
    let externalTraining = 0;

    Object.values(monthData).forEach(dayData => {
      if (dayData.isWorkDay && dayData.reason === 'work') {
        workDays++;
      } else if (dayData.reason === 'annual_leave') {
        annualLeave++;
      } else if (dayData.reason === 'external_training') {
        externalTraining++;
      }
    });

    return { workDays, annualLeave, externalTraining };
  };

  const clearMonth = () => {
    Alert.alert(
      'Clear Month',
      'This will remove all markings for this month. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const yearMonthKey = getYearMonthKey(currentDate);
            const currentData = { ...calendarData };
            delete currentData[yearMonthKey];
            saveCalendarData(currentData);
            showNotification('Month cleared', 'success');
          }
        }
      ]
    );
  };

  const stats = getMonthStats();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isSaturdayMode ? 'Pick Next Working Saturday' : 'Work Calendar'}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isSaturdayMode && (
          <View style={styles.saturdayModeInfo}>
            <Text style={styles.saturdayModeTitle}>📅 Saturday Selection Mode</Text>
            <Text style={styles.saturdayModeText}>
              Tap on any Saturday (highlighted in blue) to set it as your next working Saturday. 
              Only future Saturdays can be selected.
            </Text>
          </View>
        )}

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        {!isSaturdayMode && (
          <>
            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: colors.success + '20', borderColor: colors.success }]} />
                <Text style={styles.legendText}>✓ Work Day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#ff9800' + '20', borderColor: '#ff9800' }]} />
                <Text style={styles.legendText}>🏖️ Annual Leave</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#9c27b0' + '20', borderColor: '#9c27b0' }]} />
                <Text style={styles.legendText}>📚 External Training</Text>
              </View>
            </View>
          </>
        )}

        {/* Calendar */}
        {renderCalendar()}

        {!isSaturdayMode && (
          <>
            {/* Stats */}
            <View style={styles.statsSection}>
              <Text style={styles.statsTitle}>📊 Month Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.workDays}</Text>
                  <Text style={styles.statLabel}>Work Days</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#ff9800' }]}>{stats.annualLeave}</Text>
                  <Text style={styles.statLabel}>Annual Leave</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#9c27b0' }]}>{stats.externalTraining}</Text>
                  <Text style={styles.statLabel}>External Training</Text>
                </View>
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>ℹ️ How to Use</Text>
              <Text style={styles.infoText}>• Tap a day to cycle through: Work → Annual Leave → External Training → Clear</Text>
              <Text style={styles.infoText}>• Work days are marked with ✓</Text>
              <Text style={styles.infoText}>• Annual leave days are marked with 🏖️</Text>
              <Text style={styles.infoText}>• External training days are marked with 📚</Text>
              <Text style={styles.infoText}>• Today is highlighted with a blue border</Text>
              <Text style={styles.infoText}>• Use the arrows to navigate between months</Text>
            </View>

            {/* Clear Button */}
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.error }]}
              onPress={clearMonth}
            >
              <Text style={styles.clearButtonText}>🗑️ Clear This Month</Text>
            </TouchableOpacity>
          </>
        )}
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
  saturdayModeInfo: {
    marginTop: 24,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saturdayModeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  saturdayModeText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '700',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
  },
  legendText: {
    fontSize: 14,
    color: colors.text,
  },
  calendar: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayIcon: {
    fontSize: 12,
    marginTop: 2,
  },
  statsSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  clearButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
