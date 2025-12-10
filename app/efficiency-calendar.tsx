
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Platform, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import ProgressCircle from '../components/ProgressCircle';
import NotificationToast from '../components/NotificationToast';

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface DayData {
  date: Date;
  jobs: Job[];
  totalAWs: number;
  totalSoldHours: number;
  availableHours: number;
  efficiency: number;
}

interface MonthData {
  month: number;
  year: number;
  totalAWs: number;
  totalSoldHours: number;
  availableHours: number;
  efficiency: number;
  days: DayData[];
}

export default function EfficiencyCalendarScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [settings, setSettings] = useState({ targetHours: 180, absenceHours: 0 });
  
  const swipeAnimation = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode]);

  const loadData = async () => {
    try {
      const [jobsData, settingsData] = await Promise.all([
        StorageService.getJobs(),
        StorageService.getSettings()
      ]);
      
      setJobs(jobsData);
      
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const absenceHours = (settingsData.absenceMonth === currentMonth && settingsData.absenceYear === currentYear) 
        ? (settingsData.absenceHours || 0) 
        : 0;
      
      setSettings({
        targetHours: settingsData.targetHours || 180,
        absenceHours
      });

      calculateMonthData(jobsData, currentDate, absenceHours);
    } catch (error) {
      console.log('Error loading calendar data:', error);
      showNotification('Error loading data', 'error');
    }
  };

  const calculateMonthData = (allJobs: Job[], date: Date, absenceHours: number) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthJobs = allJobs.filter(job => {
      const jobDate = new Date(job.dateCreated);
      return jobDate.getMonth() === month && jobDate.getFullYear() === year;
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayJobs = monthJobs.filter(job => {
        const jobDate = new Date(job.dateCreated);
        return jobDate.getDate() === day;
      });

      const totalAWs = dayJobs.reduce((sum, job) => sum + job.awValue, 0);
      const totalSoldHours = CalculationService.awsToHours(totalAWs);
      
      const dayOfWeek = dayDate.getDay();
      const availableHours = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 8.5 : 0;
      
      const efficiency = availableHours > 0 ? Math.round((totalSoldHours / availableHours) * 100) : 0;

      days.push({
        date: dayDate,
        jobs: dayJobs,
        totalAWs,
        totalSoldHours,
        availableHours,
        efficiency
      });
    }

    const totalAWs = monthJobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalSoldHours = CalculationService.awsToHours(totalAWs);
    const availableHours = CalculationService.calculateAvailableHoursToDate(month, year, absenceHours);
    const efficiency = CalculationService.calculateEfficiency(totalAWs, month, year, absenceHours);

    setMonthData({
      month,
      year,
      totalAWs,
      totalSoldHours,
      availableHours,
      efficiency,
      days
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          navigatePrevious();
        } else if (gestureState.dx < -50) {
          navigateNext();
        }
      },
    })
  ).current;

  const navigatePrevious = () => {
    Animated.timing(swipeAnimation, {
      toValue: width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      swipeAnimation.setValue(0);
      if (viewMode === 'month') {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      } else if (viewMode === 'year') {
        setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
      } else if (viewMode === 'week') {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
      } else if (viewMode === 'day') {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
      }
    });
  };

  const navigateNext = () => {
    Animated.timing(swipeAnimation, {
      toValue: -width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      swipeAnimation.setValue(0);
      if (viewMode === 'month') {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      } else if (viewMode === 'year') {
        setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
      } else if (viewMode === 'week') {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
      } else if (viewMode === 'day') {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
      }
    });
  };

  const renderDayView = () => {
    if (!monthData) return null;

    const dayData = monthData.days.find(d => d.date.getDate() === currentDate.getDate());
    if (!dayData) return null;

    const efficiencyColor = CalculationService.getEfficiencyColor(dayData.efficiency);
    const targetHoursPercentage = dayData.availableHours > 0 
      ? Math.min((dayData.totalSoldHours / dayData.availableHours) * 100, 100)
      : 0;

    return (
      <ScrollView style={styles.viewContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.viewTitle, { color: colors.text }]}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>

        <View style={styles.circlesContainer}>
          <View style={styles.circleWrapper}>
            <ProgressCircle
              percentage={dayData.efficiency}
              size={140}
              strokeWidth={12}
              color={efficiencyColor}
            />
            <Text style={[styles.circleLabel, { color: colors.text }]}>Efficiency</Text>
            <Text style={[styles.circleValue, { color: efficiencyColor }]}>{dayData.efficiency}%</Text>
          </View>

          <View style={styles.circleWrapper}>
            <ProgressCircle
              percentage={targetHoursPercentage}
              size={120}
              strokeWidth={10}
              color={colors.primary}
            />
            <Text style={[styles.circleLabel, { color: colors.text }]}>Hours</Text>
            <Text style={[styles.circleValue, { color: colors.primary }]}>
              {dayData.totalSoldHours.toFixed(1)}h
            </Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Day Summary</Text>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total AWs:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dayData.totalAWs}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sold Hours:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dayData.totalSoldHours.toFixed(2)}h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Available Hours:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dayData.availableHours.toFixed(1)}h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Jobs Completed:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dayData.jobs.length}</Text>
          </View>
        </View>

        {dayData.jobs.length > 0 && (
          <View style={[styles.jobsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Jobs ({dayData.jobs.length})</Text>
            {dayData.jobs.map((job, index) => (
              <View key={job.id} style={[styles.jobItem, { borderBottomColor: colors.border }]}>
                <View style={styles.jobHeader}>
                  <Text style={[styles.jobWip, { color: colors.text }]}>WIP: {job.wipNumber}</Text>
                  <Text style={[styles.jobAws, { color: colors.primary }]}>{job.awValue} AWs</Text>
                </View>
                <Text style={[styles.jobReg, { color: colors.textSecondary }]}>{job.vehicleRegistration}</Text>
                {job.notes && (
                  <Text style={[styles.jobNotes, { color: colors.textSecondary }]}>{job.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderWeekView = () => {
    if (!monthData) return null;

    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays: DayData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayData = monthData.days.find(d => 
        d.date.getDate() === date.getDate() && 
        d.date.getMonth() === date.getMonth()
      );

      if (dayData) {
        weekDays.push(dayData);
      } else {
        weekDays.push({
          date,
          jobs: [],
          totalAWs: 0,
          totalSoldHours: 0,
          availableHours: (date.getDay() >= 1 && date.getDay() <= 5) ? 8.5 : 0,
          efficiency: 0
        });
      }
    }

    const weekTotalAWs = weekDays.reduce((sum, day) => sum + day.totalAWs, 0);
    const weekTotalSoldHours = weekDays.reduce((sum, day) => sum + day.totalSoldHours, 0);
    const weekAvailableHours = weekDays.reduce((sum, day) => sum + day.availableHours, 0);
    const weekEfficiency = weekAvailableHours > 0 ? Math.round((weekTotalSoldHours / weekAvailableHours) * 100) : 0;
    const efficiencyColor = CalculationService.getEfficiencyColor(weekEfficiency);

    return (
      <ScrollView style={styles.viewContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.viewTitle, { color: colors.text }]}>
          Week of {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Week Summary</Text>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total AWs:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{weekTotalAWs}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sold Hours:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{weekTotalSoldHours.toFixed(2)}h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Available Hours:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{weekAvailableHours.toFixed(1)}h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Efficiency:</Text>
            <Text style={[styles.statValue, { color: efficiencyColor }]}>{weekEfficiency}%</Text>
          </View>
        </View>

        <View style={styles.weekGrid}>
          {weekDays.map((dayData, index) => {
            const isToday = dayData.date.toDateString() === new Date().toDateString();
            const dayEfficiencyColor = CalculationService.getEfficiencyColor(dayData.efficiency);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDayCard,
                  { backgroundColor: colors.card, borderColor: isToday ? colors.primary : colors.border }
                ]}
                onPress={() => {
                  setCurrentDate(dayData.date);
                  setViewMode('day');
                }}
              >
                <Text style={[styles.weekDayName, { color: colors.textSecondary }]}>
                  {dayData.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.weekDayDate, { color: colors.text }]}>
                  {dayData.date.getDate()}
                </Text>
                <View style={styles.weekDayCircle}>
                  <ProgressCircle
                    percentage={dayData.efficiency}
                    size={60}
                    strokeWidth={6}
                    color={dayEfficiencyColor}
                  />
                </View>
                <Text style={[styles.weekDayAws, { color: colors.textSecondary }]}>
                  {dayData.totalAWs} AWs
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderMonthView = () => {
    if (!monthData) return null;

    const daysInMonth = monthData.days.length;
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const efficiencyColor = CalculationService.getEfficiencyColor(monthData.efficiency);
    const targetHoursPercentage = settings.targetHours > 0 
      ? Math.min((monthData.totalSoldHours / settings.targetHours) * 100, 100)
      : 0;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const calendarDays: (DayData | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }

    calendarDays.push(...monthData.days);

    return (
      <ScrollView style={styles.viewContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.viewTitle, { color: colors.text }]}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>

        <View style={styles.circlesContainer}>
          <View style={styles.circleWrapper}>
            <ProgressCircle
              percentage={monthData.efficiency}
              size={140}
              strokeWidth={12}
              color={efficiencyColor}
            />
            <Text style={[styles.circleLabel, { color: colors.text }]}>Efficiency</Text>
            <Text style={[styles.circleValue, { color: efficiencyColor }]}>{monthData.efficiency}%</Text>
          </View>

          <View style={styles.circleWrapper}>
            <ProgressCircle
              percentage={targetHoursPercentage}
              size={120}
              strokeWidth={10}
              color={colors.primary}
            />
            <Text style={[styles.circleLabel, { color: colors.text }]}>Target Progress</Text>
            <Text style={[styles.circleValue, { color: colors.primary }]}>
              {monthData.totalSoldHours.toFixed(1)}h / {settings.targetHours}h
            </Text>
          </View>
        </View>

        <View style={[styles.calendarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.calendarHeader}>
            {dayNames.map((name, index) => (
              <Text key={index} style={[styles.dayName, { color: colors.textSecondary }]}>
                {name}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((dayData, index) => {
              if (!dayData) {
                return <View key={`empty-${index}`} style={styles.calendarDay} />;
              }

              const isToday = dayData.date.toDateString() === new Date().toDateString();
              const dayEfficiencyColor = CalculationService.getEfficiencyColor(dayData.efficiency);
              
              const progressPercentage = dayData.availableHours > 0 
                ? Math.min((dayData.totalSoldHours / dayData.availableHours) * 100, 100)
                : 0;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    isToday && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setCurrentDate(dayData.date);
                    setViewMode('day');
                  }}
                >
                  <Text style={[styles.calendarDayNumber, { color: colors.text }]}>
                    {dayData.date.getDate()}
                  </Text>
                  {dayData.availableHours > 0 && (
                    <View style={styles.doubleCircleContainer}>
                      <View style={styles.outerCircle}>
                        <ProgressCircle
                          percentage={dayData.efficiency}
                          size={42}
                          strokeWidth={4}
                          color={dayEfficiencyColor}
                        />
                      </View>
                      <View style={styles.innerCircle}>
                        <ProgressCircle
                          percentage={progressPercentage}
                          size={28}
                          strokeWidth={3}
                          color={colors.primary}
                        />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Month Summary</Text>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total AWs:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{monthData.totalAWs}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sold Hours:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{monthData.totalSoldHours.toFixed(2)}h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Available Hours:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{monthData.availableHours.toFixed(1)}h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Target Hours:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{settings.targetHours}h</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = [];

    for (let month = 0; month < 12; month++) {
      const monthJobs = jobs.filter(job => {
        const jobDate = new Date(job.dateCreated);
        return jobDate.getMonth() === month && jobDate.getFullYear() === year;
      });

      const totalAWs = monthJobs.reduce((sum, job) => sum + job.awValue, 0);
      const totalSoldHours = CalculationService.awsToHours(totalAWs);
      const availableHours = CalculationService.calculateAvailableHoursToDate(month, year, 0);
      const efficiency = availableHours > 0 ? Math.round((totalSoldHours / availableHours) * 100) : 0;

      months.push({
        month,
        year,
        totalAWs,
        totalSoldHours,
        availableHours,
        efficiency,
        jobCount: monthJobs.length
      });
    }

    return (
      <ScrollView style={styles.viewContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.viewTitle, { color: colors.text }]}>{year}</Text>

        <View style={styles.yearGrid}>
          {months.map((monthData, index) => {
            const efficiencyColor = CalculationService.getEfficiencyColor(monthData.efficiency);
            const monthName = new Date(year, index, 1).toLocaleDateString('en-US', { month: 'short' });
            const isCurrentMonth = index === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.yearMonthCard,
                  { backgroundColor: colors.card, borderColor: isCurrentMonth ? colors.primary : colors.border }
                ]}
                onPress={() => {
                  setCurrentDate(new Date(year, index, 1));
                  setViewMode('month');
                }}
              >
                <Text style={[styles.yearMonthName, { color: colors.text }]}>{monthName}</Text>
                <View style={styles.yearMonthCircle}>
                  <ProgressCircle
                    percentage={monthData.efficiency}
                    size={70}
                    strokeWidth={7}
                    color={efficiencyColor}
                  />
                </View>
                <Text style={[styles.yearMonthAws, { color: colors.textSecondary }]}>
                  {monthData.totalAWs} AWs
                </Text>
                <Text style={[styles.yearMonthJobs, { color: colors.textSecondary }]}>
                  {monthData.jobCount} jobs
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      case 'year':
        return renderYearView();
      default:
        return null;
    }
  };

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
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Efficiency Calendar</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.viewModeButtons}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'day' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.viewModeText, { color: viewMode === 'day' ? '#ffffff' : colors.text }]}>
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'week' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.viewModeText, { color: viewMode === 'week' ? '#ffffff' : colors.text }]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'month' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.viewModeText, { color: viewMode === 'month' ? '#ffffff' : colors.text }]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'year' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('year')}
          >
            <Text style={[styles.viewModeText, { color: viewMode === 'year' ? '#ffffff' : colors.text }]}>
              Year
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={navigatePrevious}
          >
            <Text style={[styles.navButtonText, { color: colors.text }]}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={navigateNext}
          >
            <Text style={[styles.navButtonText, { color: colors.text }]}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={[styles.content, { transform: [{ translateX: swipeAnimation }] }]}
        {...panResponder.panHandlers}
      >
        {renderContent()}
      </Animated.View>
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
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  viewTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  circleWrapper: {
    alignItems: 'center',
  },
  circleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  circleValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  jobItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobWip: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobAws: {
    fontSize: 14,
    fontWeight: '700',
  },
  jobReg: {
    fontSize: 13,
    marginBottom: 2,
  },
  jobNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  weekDayCard: {
    width: '30%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  weekDayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  weekDayDate: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  weekDayCircle: {
    marginBottom: 8,
  },
  weekDayAws: {
    fontSize: 11,
  },
  calendarContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 8,
  },
  calendarDayNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  doubleCircleContainer: {
    position: 'relative',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  outerCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingBottom: 24,
  },
  yearMonthCard: {
    width: '30%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  yearMonthName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  yearMonthCircle: {
    marginBottom: 8,
  },
  yearMonthAws: {
    fontSize: 11,
    marginBottom: 2,
  },
  yearMonthJobs: {
    fontSize: 11,
  },
});
