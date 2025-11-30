
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Job } from '../types';
import { StorageService } from '../utils/storage';
import NotificationToast from '../components/NotificationToast';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Picker } from '@react-native-picker/picker';

export default function PDFImportSummaryScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'date' | 'reg' | 'vhc'>('all');
  const [filterValue, setFilterValue] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const created = parseInt(params.created as string) || 0;
  const updated = parseInt(params.updated as string) || 0;
  const skipped = parseInt(params.skipped as string) || 0;

  useEffect(() => {
    loadImportedJobs();
  }, []);

  const applyFilter = useCallback(() => {
    if (filterType === 'all' || !filterValue) {
      setFilteredJobs(jobs);
      return;
    }

    const filtered = jobs.filter(job => {
      switch (filterType) {
        case 'date':
          return job.startedAt?.includes(filterValue) || job.dateCreated.includes(filterValue);
        
        case 'reg':
          return job.vehicleRegistration.toLowerCase().includes(filterValue.toLowerCase());
        
        case 'vhc':
          return job.vhcStatus === filterValue;
        
        default:
          return true;
      }
    });

    setFilteredJobs(filtered);
  }, [jobs, filterType, filterValue]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const loadImportedJobs = async () => {
    try {
      const allJobs = await StorageService.getJobs();
      
      // Get jobs imported in the last minute (from this import session)
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const importedJobs = allJobs.filter(
        job => job.source?.type === 'pdf' && 
               job.source.importedAt && 
               job.source.importedAt > oneMinuteAgo
      );
      
      setJobs(importedJobs);
    } catch (error) {
      console.error('Error loading imported jobs:', error);
      setNotification({
        message: 'Failed to load imported jobs',
        type: 'error',
      });
    }
  };

  const exportCSV = async () => {
    try {
      // Create CSV content
      const headers = ['WIP Number', 'Vehicle Reg', 'VHC Status', 'Description', 'AWS', 'Minutes', 'Date', 'Time'];
      const rows = filteredJobs.map(job => [
        job.wipNumber,
        job.vehicleRegistration,
        job.vhcStatus || 'N/A',
        job.jobDescription || job.notes || '',
        job.awValue.toString(),
        job.timeInMinutes.toString(),
        new Date(job.startedAt || job.dateCreated).toLocaleDateString('en-GB'),
        new Date(job.startedAt || job.dateCreated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Save to file
      const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!baseDir) {
        throw new Error('No writable directory available');
      }
      
      const fileUri = `${baseDir}import-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Import Summary',
        });
      } else {
        Alert.alert('Success', 'CSV file created but sharing is not available on this device');
      }

      setNotification({
        message: 'CSV exported successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setNotification({
        message: 'Failed to export CSV',
        type: 'error',
      });
    }
  };

  const exportPDF = async () => {
    try {
      Alert.alert('Info', 'PDF export feature coming soon');
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVHCColor = (status?: string): string => {
    switch (status) {
      case 'Red':
        return '#EF4444';
      case 'Orange':
        return '#F59E0B';
      case 'Green':
        return '#22C55E';
      default:
        return '#999';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Import Complete</Text>
        <TouchableOpacity onPress={() => router.replace('/dashboard')}>
          <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Import Summary</Text>
        
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{created}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Created</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#FFC107' }]}>{updated}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Updated</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#999' }]}>{skipped}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Skipped</Text>
          </View>
        </View>

        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }]}
            onPress={exportCSV}
          >
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }]}
            onPress={exportPDF}
          >
            <Text style={styles.exportButtonText}>Export PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.filterCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Jobs</Text>
        
        <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Picker
            selectedValue={filterType}
            onValueChange={setFilterType}
            style={{ color: colors.text }}
          >
            <Picker.Item label="All Jobs" value="all" />
            <Picker.Item label="By Date" value="date" />
            <Picker.Item label="By Registration" value="reg" />
            <Picker.Item label="By VHC Status" value="vhc" />
          </Picker>
        </View>

        {filterType === 'vhc' && (
          <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 12 }]}>
            <Picker
              selectedValue={filterValue}
              onValueChange={setFilterValue}
              style={{ color: colors.text }}
            >
              <Picker.Item label="Select VHC status..." value="" />
              <Picker.Item label="Red" value="Red" />
              <Picker.Item label="Orange" value="Orange" />
              <Picker.Item label="Green" value="Green" />
              <Picker.Item label="N/A" value="N/A" />
            </Picker>
          </View>
        )}
      </View>

      <View style={styles.jobsHeader}>
        <Text style={[styles.jobsTitle, { color: colors.text }]}>
          Imported Jobs ({filteredJobs.length})
        </Text>
      </View>

      <ScrollView style={styles.jobsList}>
        {filteredJobs.map((job, index) => (
          <View
            key={job.id}
            style={[
              styles.jobCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.jobHeader}>
              <View style={styles.jobHeaderLeft}>
                <Text style={[styles.wipNumber, { color: colors.text }]}>
                  WIP: {job.wipNumber}
                </Text>
                <View
                  style={[
                    styles.vhcBadge,
                    { backgroundColor: getVHCColor(job.vhcStatus) },
                  ]}
                >
                  <Text style={styles.vhcText}>{job.vhcStatus || 'N/A'}</Text>
                </View>
              </View>
              <Text style={[styles.regNumber, { color: colors.text }]}>
                {job.vehicleRegistration}
              </Text>
            </View>

            <Text style={[styles.jobDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {job.jobDescription || job.notes || 'No description'}
            </Text>

            <View style={styles.jobFooter}>
              <View style={styles.jobStats}>
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  AWS: {job.awValue}
                </Text>
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  Time: {Math.floor(job.timeInMinutes / 60)}h {job.timeInMinutes % 60}m
                </Text>
              </View>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(job.startedAt || job.dateCreated)} {formatTime(job.startedAt || job.dateCreated)}
              </Text>
            </View>
          </View>
        ))}

        {filteredJobs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No jobs match the current filter
            </Text>
          </View>
        )}
      </ScrollView>

      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onHide={() => setNotification(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  jobsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  jobsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  jobsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  jobCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wipNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vhcBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vhcText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  regNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
