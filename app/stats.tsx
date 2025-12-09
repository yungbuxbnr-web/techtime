
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import ProgressCircle from '../components/ProgressCircle';
import { useTheme } from '../contexts/ThemeContext';

export default function StatsScreen() {
  const { colors } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [targetHours, setTargetHours] = useState(180);
  const [absenceHours, setAbsenceHours] = useState(0);
  
  // Month navigation state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const loadJobs = useCallback(async () => {
    try {
      const [jobsData, settings] = await Promise.all([
        StorageService.getJobs(),
        StorageService.getSettings()
      ]);
      setJobs(jobsData);
      setTargetHours(settings.targetHours || 180);
      
      // Get absence hours for the selected month
      const currentAbsenceHours = (settings.absenceMonth === selectedMonth && settings.absenceYear === selectedYear) 
        ? (settings.absenceHours || 0) 
        : 0;
      setAbsenceHours(currentAbsenceHours);
    } catch (error) {
      console.log('Error loading jobs:', error);
    }
  }, [selectedMonth, selectedYear]);

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

  useEffect(() => {
    checkAuthAndLoadJobs();
  }, [checkAuthAndLoadJobs]);

  const handleBack = () => {
    router.back();
  };

  // Month navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    // Don't allow navigation beyond current month
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
    
    if (isCurrentMonth) {
      return; // Already at current month
    }

    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  };

  const getMonthName = (month: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month];
  };

  const getStatsData = () => {
    // Filter jobs for the selected month
    const monthlyJobs = CalculationService.getJobsByMonth(jobs, selectedMonth, selectedYear);
    const totalAWs = monthlyJobs.reduce((sum, job) => sum + job.awValue, 0);
    const totalTime = totalAWs * 5; // minutes
    const totalSoldHours = CalculationService.calculateSoldHours(totalAWs);
    const totalAvailableHours = CalculationService.calculateAvailableHoursToDate(selectedMonth, selectedYear, absenceHours);
    const efficiency = CalculationService.calculateEfficiency(totalAWs, selectedMonth, selectedYear, absenceHours);

    const today = new Date();
    const dailyJobs = CalculationService.getDailyJobs(monthlyJobs, today);
    const weeklyJobs = CalculationService.getWeeklyJobs(monthlyJobs, today);

    switch (type) {
      case 'hours':
        // Monthly Target Hours Statistics
        const hoursRemaining = Math.max(0, targetHours - totalSoldHours);
        const targetProgress = targetHours > 0 
          ? Math.min((totalSoldHours / targetHours) * 100, 100)
          : 0;
        
        return {
          title: 'Monthly Target Hours',
          mainValue: `${totalSoldHours.toFixed(1)}h`,
          mainLabel: `of ${targetHours}h Target`,
          showProgress: true,
          progressPercentage: targetProgress,
          progressColor: targetProgress >= 100 ? colors.success : colors.primary,
          details: [
            { label: 'Monthly Target', value: `${targetHours}h` },
            { label: 'Currently Sold Hours', value: `${totalSoldHours.toFixed(2)}h` },
            { label: 'Hours Remaining', value: `${hoursRemaining.toFixed(2)}h` },
            { label: 'Progress', value: `${targetProgress.toFixed(1)}%` },
            { label: 'Total AWs This Month', value: `${totalAWs} AWs` },
            { label: 'Total Jobs This Month', value: `${monthlyJobs.length} jobs` },
          ],
          additionalInfo: {
            title: 'Breakdown',
            items: [
              { label: 'Total Jobs', value: `${monthlyJobs.length} jobs` },
              { label: 'Total AWs', value: `${totalAWs} AWs` },
              { label: 'Total Time', value: CalculationService.formatTime(totalTime) },
            ]
          }
        };

      case 'efficiency':
        // Efficiency Statistics
        const efficiencyColor = CalculationService.getEfficiencyColor(efficiency);
        const efficiencyStatus = CalculationService.getEfficiencyStatus(efficiency);
        
        return {
          title: 'Efficiency Statistics',
          mainValue: `${efficiency}%`,
          mainLabel: efficiencyStatus,
          showProgress: true,
          progressPercentage: efficiency,
          progressColor: efficiencyColor,
          details: [
            { label: 'Efficiency', value: `${efficiency}%`, highlight: true, color: efficiencyColor },
            { label: 'Total Sold Hours', value: `${totalSoldHours.toFixed(2)}h` },
            { label: 'Total Available Hours', value: `${totalAvailableHours.toFixed(2)}h` },
            { label: 'Absence Hours Deducted', value: `${absenceHours}h` },
            { label: 'Total AWs', value: `${totalAWs} AWs` },
            { label: 'Calculation', value: `(${totalSoldHours.toFixed(2)}h ÷ ${totalAvailableHours.toFixed(2)}h) × 100` },
          ],
          additionalInfo: {
            title: 'Efficiency Ranges',
            items: [
              { label: 'Excellent (Green)', value: '65% - 100%', color: '#4CAF50' },
              { label: 'Average (Yellow)', value: '31% - 64%', color: '#FFC107' },
              { label: 'Needs Improvement (Red)', value: '0% - 30%', color: '#F44336' },
            ]
          }
        };
      
      case 'aws':
        return {
          title: 'Total AWs Breakdown',
          mainValue: totalAWs.toString(),
          mainLabel: `Total AWs for ${getMonthName(selectedMonth)} ${selectedYear}`,
          details: [
            { label: 'Total AWs', value: `${totalAWs} AWs` },
            { label: 'Total Jobs', value: `${monthlyJobs.length} jobs` },
            { label: 'Total Time', value: CalculationService.formatTime(totalTime) },
            { label: 'Average AWs per Job', value: monthlyJobs.length > 0 ? `${(totalAWs / monthlyJobs.length).toFixed(1)} AWs` : '0 AWs' },
          ]
        };
      
      case 'time':
        return {
          title: 'Time Logged Breakdown',
          mainValue: CalculationService.formatTime(totalTime),
          mainLabel: `Total Time for ${getMonthName(selectedMonth)} ${selectedYear}`,
          details: [
            { label: 'Total Time', value: CalculationService.formatTime(totalTime) },
            { label: 'Total AWs', value: `${totalAWs} AWs` },
            { label: 'Total Jobs', value: `${monthlyJobs.length} jobs` },
            { label: 'Average Time per Job', value: monthlyJobs.length > 0 ? CalculationService.formatTime(totalTime / monthlyJobs.length) : '0h 0m' },
          ]
        };
      
      case 'jobs':
        return {
          title: 'Jobs Completed Breakdown',
          mainValue: monthlyJobs.length.toString(),
          mainLabel: `Jobs for ${getMonthName(selectedMonth)} ${selectedYear}`,
          details: [
            { label: 'Total Jobs', value: `${monthlyJobs.length} jobs` },
            { label: 'Total AWs', value: `${totalAWs} AWs` },
            { label: 'Total Time', value: CalculationService.formatTime(totalTime) },
            { label: 'Average AWs per Job', value: monthlyJobs.length > 0 ? `${(totalAWs / monthlyJobs.length).toFixed(1)} AWs` : '0 AWs' },
          ]
        };
      
      case 'remaining':
        const remainingHours = Math.max(0, targetHours - totalSoldHours);
        const remainingMinutes = remainingHours * 60;
        const targetProgressRemaining = targetHours > 0 
          ? Math.min((totalSoldHours / targetHours) * 100, 100)
          : 0;
        
        return {
          title: 'Hours Remaining',
          mainValue: `${remainingHours.toFixed(1)}h`,
          mainLabel: `Hours Left for ${getMonthName(selectedMonth)} ${selectedYear}`,
          details: [
            { label: 'Target Hours', value: `${targetHours}h` },
            { label: 'Completed', value: `${totalSoldHours.toFixed(2)}h` },
            { label: 'Remaining', value: `${remainingHours.toFixed(2)}h` },
            { label: 'Progress', value: `${targetProgressRemaining.toFixed(1)}%` },
          ]
        };
      
      default:
        return {
          title: 'Statistics',
          mainValue: '0',
          mainLabel: 'No Data',
          details: []
        };
    }
  };

  const statsData = getStatsData();
  const monthlyJobs = CalculationService.getJobsByMonth(jobs, selectedMonth, selectedYear);
  const styles = createStyles(colors);

  // Show month navigation for hours and efficiency types
  const showMonthNavigation = type === 'hours' || type === 'efficiency';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{statsData.title}</Text>
      </View>

      {showMonthNavigation && (
        <View style={styles.monthNavigationContainer}>
          <TouchableOpacity 
            onPress={goToPreviousMonth} 
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.monthDisplayContainer}>
            <Text style={styles.monthDisplayText}>
              {getMonthName(selectedMonth)} {selectedYear}
            </Text>
            {!isCurrentMonth() && (
              <TouchableOpacity onPress={goToCurrentMonth} style={styles.currentMonthButton}>
                <Text style={styles.currentMonthButtonText}>Current Month</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={goToNextMonth} 
            style={[
              styles.monthNavButton,
              isCurrentMonth() && styles.monthNavButtonDisabled
            ]}
            disabled={isCurrentMonth()}
          >
            <Text style={[
              styles.monthNavButtonText,
              isCurrentMonth() && styles.monthNavButtonTextDisabled
            ]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainStat}>
          <Text style={[
            styles.mainValue,
            statsData.progressColor && { color: statsData.progressColor }
          ]}>
            {statsData.mainValue}
          </Text>
          <Text style={styles.mainLabel}>{statsData.mainLabel}</Text>
        </View>

        {statsData.showProgress && (
          <View style={styles.progressSection}>
            <ProgressCircle
              percentage={statsData.progressPercentage || 0}
              size={150}
              strokeWidth={12}
              color={statsData.progressColor || colors.primary}
            />
            <Text style={[
              styles.progressText,
              statsData.progressColor && { color: statsData.progressColor }
            ]}>
              {statsData.progressPercentage?.toFixed(1)}%
            </Text>
          </View>
        )}

        {type === 'remaining' && (
          <View style={styles.progressSection}>
            <ProgressCircle
              percentage={statsData.progressPercentage || 0}
              size={150}
              strokeWidth={12}
              color={(statsData.progressPercentage || 0) >= 100 ? colors.success : colors.primary}
            />
            <Text style={styles.progressText}>
              {(statsData.progressPercentage || 0).toFixed(1)}% Complete
            </Text>
          </View>
        )}

        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Detailed Breakdown</Text>
          {statsData.details.map((detail, index) => (
            <View key={index} style={[
              styles.detailRow,
              detail.highlight && styles.detailRowHighlight
            ]}>
              <Text style={[
                styles.detailLabel,
                detail.highlight && styles.detailLabelBold
              ]}>
                {detail.label}
              </Text>
              <Text style={[
                styles.detailValue,
                detail.highlight && styles.detailValueBold,
                detail.color && { color: detail.color }
              ]}>
                {detail.value}
              </Text>
            </View>
          ))}
        </View>

        {statsData.additionalInfo && (
          <View style={styles.additionalInfoSection}>
            <Text style={styles.sectionTitle}>{statsData.additionalInfo.title}</Text>
            {statsData.additionalInfo.items.map((item, index) => (
              <View key={index} style={styles.additionalInfoRow}>
                <Text style={[
                  styles.additionalInfoLabel,
                  item.color && { color: item.color }
                ]}>
                  {item.label}
                </Text>
                <Text style={[
                  styles.additionalInfoValue,
                  item.color && { color: item.color }
                ]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {type === 'jobs' && monthlyJobs.length > 0 && (
          <View style={styles.recentJobsSection}>
            <Text style={styles.sectionTitle}>Jobs for {getMonthName(selectedMonth)} {selectedYear}</Text>
            {monthlyJobs
              .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
              .slice(0, 10)
              .map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.wipNumber}>WIP: {job.wipNumber}</Text>
                    <Text style={styles.jobDate}>
                      {new Date(job.dateCreated).toLocaleDateString('en-GB')}
                    </Text>
                  </View>
                  <View style={styles.jobDetails}>
                    <Text style={styles.jobDetail}>
                      {job.vehicleRegistration} • {job.awValue} AWs • {CalculationService.formatTime(job.timeInMinutes)}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {type === 'aws' && (
          <View style={styles.awDistributionSection}>
            <Text style={styles.sectionTitle}>AW Distribution for {getMonthName(selectedMonth)} {selectedYear}</Text>
            <View style={styles.distributionGrid}>
              {[
                { range: '1-10 AWs', jobs: monthlyJobs.filter(j => j.awValue >= 1 && j.awValue <= 10) },
                { range: '11-25 AWs', jobs: monthlyJobs.filter(j => j.awValue >= 11 && j.awValue <= 25) },
                { range: '26-50 AWs', jobs: monthlyJobs.filter(j => j.awValue >= 26 && j.awValue <= 50) },
                { range: '51+ AWs', jobs: monthlyJobs.filter(j => j.awValue >= 51) },
              ].map((category, index) => (
                <View key={index} style={styles.distributionCard}>
                  <Text style={styles.distributionRange}>{category.range}</Text>
                  <Text style={styles.distributionCount}>{category.jobs.length} jobs</Text>
                  <Text style={styles.distributionTotal}>
                    {category.jobs.reduce((sum, job) => sum + job.awValue, 0)} AWs
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  monthNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthNavButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  monthNavButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  monthNavButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  monthNavButtonTextDisabled: {
    color: colors.textSecondary,
  },
  monthDisplayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  monthDisplayText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  currentMonthButton: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  currentMonthButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainStat: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  mainValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  mainLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
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
  detailsSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRowHighlight: {
    backgroundColor: colors.background,
    marginHorizontal: -8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderBottomWidth: 0,
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  detailLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  detailValueBold: {
    fontSize: 18,
    fontWeight: '700',
  },
  additionalInfoSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  additionalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  additionalInfoLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  additionalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  recentJobsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  wipNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  jobDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobDetails: {
    marginTop: 4,
  },
  jobDetail: {
    fontSize: 14,
    color: colors.text,
  },
  awDistributionSection: {
    marginBottom: 24,
  },
  distributionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  distributionCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  distributionRange: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  distributionCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  distributionTotal: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
