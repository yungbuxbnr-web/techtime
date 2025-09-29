
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import ProgressCircle from '../components/ProgressCircle';

export default function StatsScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);

  const checkAuthAndLoadJobs = async () => {
    try {
      const settings = await StorageService.getSettings();
      if (!settings.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      loadJobs();
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/auth');
    }
  };

  useEffect(() => {
    checkAuthAndLoadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const jobsData = await StorageService.getJobs();
      setJobs(jobsData);
    } catch (error) {
      console.log('Error loading jobs:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getStatsData = () => {
    const monthlyStats = CalculationService.calculateMonthlyStats(jobs);
    const today = new Date();
    const dailyJobs = CalculationService.getDailyJobs(jobs, today);
    const weeklyJobs = CalculationService.getWeeklyJobs(jobs, today);
    const monthlyJobs = CalculationService.getMonthlyJobs(jobs, today);

    switch (type) {
      case 'aws':
        return {
          title: 'Total AWs Breakdown',
          mainValue: monthlyStats.totalAWs.toString(),
          mainLabel: 'Total AWs This Month',
          details: [
            { label: 'Today', value: `${dailyJobs.reduce((sum, job) => sum + job.awValue, 0)} AWs` },
            { label: 'This Week', value: `${weeklyJobs.reduce((sum, job) => sum + job.awValue, 0)} AWs` },
            { label: 'This Month', value: `${monthlyJobs.reduce((sum, job) => sum + job.awValue, 0)} AWs` },
            { label: 'All Time', value: `${jobs.reduce((sum, job) => sum + job.awValue, 0)} AWs` },
          ]
        };
      
      case 'time':
        return {
          title: 'Time Logged Breakdown',
          mainValue: CalculationService.formatTime(monthlyStats.totalTime),
          mainLabel: 'Total Time This Month',
          details: [
            { label: 'Today', value: CalculationService.formatTime(dailyJobs.reduce((sum, job) => sum + job.timeInMinutes, 0)) },
            { label: 'This Week', value: CalculationService.formatTime(weeklyJobs.reduce((sum, job) => sum + job.timeInMinutes, 0)) },
            { label: 'This Month', value: CalculationService.formatTime(monthlyJobs.reduce((sum, job) => sum + job.timeInMinutes, 0)) },
            { label: 'All Time', value: CalculationService.formatTime(jobs.reduce((sum, job) => sum + job.timeInMinutes, 0)) },
          ]
        };
      
      case 'jobs':
        return {
          title: 'Jobs Completed Breakdown',
          mainValue: monthlyStats.totalJobs.toString(),
          mainLabel: 'Jobs This Month',
          details: [
            { label: 'Today', value: `${dailyJobs.length} jobs` },
            { label: 'This Week', value: `${weeklyJobs.length} jobs` },
            { label: 'This Month', value: `${monthlyJobs.length} jobs` },
            { label: 'All Time', value: `${jobs.length} jobs` },
          ]
        };
      
      case 'remaining':
        const remainingMinutes = (monthlyStats.targetHours * 60) - monthlyStats.totalTime;
        return {
          title: 'Hours Remaining',
          mainValue: CalculationService.formatTime(Math.max(0, remainingMinutes)),
          mainLabel: 'Hours Left This Month',
          details: [
            { label: 'Target Hours', value: `${monthlyStats.targetHours}h` },
            { label: 'Completed', value: CalculationService.formatTime(monthlyStats.totalTime) },
            { label: 'Remaining', value: CalculationService.formatTime(Math.max(0, remainingMinutes)) },
            { label: 'Progress', value: `${monthlyStats.utilizationPercentage.toFixed(1)}%` },
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
  const monthlyStats = CalculationService.calculateMonthlyStats(jobs);

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={commonStyles.title}>{statsData.title}</Text>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainStat}>
          <Text style={styles.mainValue}>{statsData.mainValue}</Text>
          <Text style={styles.mainLabel}>{statsData.mainLabel}</Text>
        </View>

        {type === 'remaining' && (
          <View style={styles.progressSection}>
            <ProgressCircle
              percentage={monthlyStats.utilizationPercentage}
              size={150}
              strokeWidth={12}
              color={monthlyStats.utilizationPercentage >= 100 ? colors.success : colors.primary}
            />
            <Text style={styles.progressText}>
              {monthlyStats.utilizationPercentage.toFixed(1)}% Complete
            </Text>
          </View>
        )}

        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Detailed Breakdown</Text>
          {statsData.details.map((detail, index) => (
            <View key={index} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </View>

        {type === 'jobs' && jobs.length > 0 && (
          <View style={styles.recentJobsSection}>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
            {jobs
              .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
              .slice(0, 5)
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
            <Text style={styles.sectionTitle}>AW Distribution</Text>
            <View style={styles.distributionGrid}>
              {[
                { range: '1-10 AWs', jobs: jobs.filter(j => j.awValue >= 1 && j.awValue <= 10) },
                { range: '11-25 AWs', jobs: jobs.filter(j => j.awValue >= 11 && j.awValue <= 25) },
                { range: '26-50 AWs', jobs: jobs.filter(j => j.awValue >= 26 && j.awValue <= 50) },
                { range: '51+ AWs', jobs: jobs.filter(j => j.awValue >= 51) },
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  detailLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
