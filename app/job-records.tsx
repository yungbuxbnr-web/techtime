
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

type FilterField = 'all' | 'reg' | 'wip' | 'jobType';

export default function JobRecordsScreen() {
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState<FilterField>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const jobsData = await StorageService.getJobs();
      const sortedJobs = jobsData.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
      setJobs(sortedJobs);
      setFilteredJobs(sortedJobs);
      console.log('Loaded jobs:', sortedJobs.length);
    } catch (error) {
      console.log('Error loading jobs:', error);
      showNotification('Error loading jobs', 'error');
    }
  }, [showNotification]);

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

  useFocusEffect(
    useCallback(() => {
      checkAuthAndLoadJobs();
    }, [checkAuthAndLoadJobs])
  );

  const filterJobs = useCallback((query: string, field: FilterField) => {
    if (!query.trim()) {
      setFilteredJobs(jobs);
      return;
    }

    const lowerQuery = query.toLowerCase().trim();
    const filtered = jobs.filter(job => {
      switch (field) {
        case 'reg':
          return job.vehicleRegistration.toLowerCase().includes(lowerQuery);
        case 'wip':
          return job.wipNumber.toLowerCase().includes(lowerQuery);
        case 'jobType':
          return job.notes?.toLowerCase().includes(lowerQuery) || false;
        case 'all':
        default:
          return (
            job.vehicleRegistration.toLowerCase().includes(lowerQuery) ||
            job.wipNumber.toLowerCase().includes(lowerQuery) ||
            job.notes?.toLowerCase().includes(lowerQuery) ||
            false
          );
      }
    });

    setFilteredJobs(filtered);
    console.log(`Filtered ${filtered.length} jobs with query "${query}" on field "${field}"`);
  }, [jobs]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterJobs(text, filterField);
  };

  const handleFilterChange = (field: FilterField) => {
    setFilterField(field);
    filterJobs(searchQuery, field);
    setShowFilterModal(false);
  };

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  const navigateToJobs = () => {
    router.push('/jobs');
  };

  const navigateToStatistics = () => {
    router.push('/statistics');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilterLabel = () => {
    switch (filterField) {
      case 'reg':
        return 'Registration';
      case 'wip':
        return 'WIP Number';
      case 'jobType':
        return 'Job Type/Notes';
      case 'all':
      default:
        return 'All Fields';
    }
  };

  const getVhcColorValue = (color: 'green' | 'orange' | 'red' | null | undefined): string => {
    if (!color) return 'transparent';
    switch (color) {
      case 'green':
        return '#4CAF50';
      case 'orange':
        return '#FF9800';
      case 'red':
        return '#F44336';
      default:
        return 'transparent';
    }
  };

  const totalStats = filteredJobs.reduce(
    (totals, job) => ({
      jobs: totals.jobs + 1,
      aws: totals.aws + job.awValue,
      time: totals.time + job.timeInMinutes,
    }),
    { jobs: 0, aws: 0, time: 0 }
  );

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
        <Text style={styles.title}>Job Records</Text>
        <Text style={styles.subtitle}>All Time</Text>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filter Display */}
      <View style={styles.activeFilterContainer}>
        <Text style={styles.activeFilterLabel}>Filter by:</Text>
        <View style={styles.activeFilterBadge}>
          <Text style={styles.activeFilterText}>{getFilterLabel()}</Text>
        </View>
      </View>

      {/* Summary Stats */}
      {filteredJobs.length > 0 && (
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalStats.jobs}</Text>
            <Text style={styles.summaryLabel}>Jobs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalStats.aws}</Text>
            <Text style={styles.summaryLabel}>AWs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{CalculationService.formatTime(totalStats.time)}</Text>
            <Text style={styles.summaryLabel}>Time</Text>
          </View>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'result' : 'results'}
          {searchQuery && ` for "${searchQuery}"`}
        </Text>
      </View>

      {/* Jobs List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No jobs found' : 'No jobs recorded yet'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery 
                ? 'Try adjusting your search or filter' 
                : 'Start by adding your first job'}
            </Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {filteredJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                {/* VHC Color Indicator */}
                {job.vhcColor && (
                  <View 
                    style={[
                      styles.vhcIndicator, 
                      { backgroundColor: getVhcColorValue(job.vhcColor) }
                    ]} 
                  />
                )}
                
                <View style={styles.jobHeader}>
                  <View style={styles.jobHeaderLeft}>
                    <Text style={styles.wipNumber}>WIP: {job.wipNumber}</Text>
                    <Text style={styles.regNumber}>{job.vehicleRegistration}</Text>
                    {job.vhcColor && (
                      <View style={styles.vhcBadge}>
                        <View 
                          style={[
                            styles.vhcBadgeDot, 
                            { backgroundColor: getVhcColorValue(job.vhcColor) }
                          ]} 
                        />
                        <Text style={styles.vhcBadgeText}>
                          VHC: {job.vhcColor.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.jobHeaderRight}>
                    <Text style={styles.awBadge}>{job.awValue} AWs</Text>
                  </View>
                </View>
                
                <View style={styles.jobDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>
                      {CalculationService.formatTime(job.timeInMinutes)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(job.dateCreated)}</Text>
                  </View>
                  
                  {job.notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{job.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Field</Text>
            
            <TouchableOpacity
              style={[styles.filterOption, filterField === 'all' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('all')}
            >
              <Text style={[styles.filterOptionText, filterField === 'all' && styles.filterOptionTextActive]}>
                All Fields
              </Text>
              {filterField === 'all' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, filterField === 'reg' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('reg')}
            >
              <Text style={[styles.filterOptionText, filterField === 'reg' && styles.filterOptionTextActive]}>
                Registration
              </Text>
              {filterField === 'reg' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, filterField === 'wip' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('wip')}
            >
              <Text style={[styles.filterOptionText, filterField === 'wip' && styles.filterOptionTextActive]}>
                WIP Number
              </Text>
              {filterField === 'wip' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, filterField === 'jobType' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('jobType')}
            >
              <Text style={[styles.filterOptionText, filterField === 'jobType' && styles.filterOptionTextActive]}>
                Job Type/Notes
              </Text>
              {filterField === 'jobType' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={navigateToDashboard}>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToJobs}>
          <Text style={styles.navText}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToStatistics}>
          <Text style={styles.navText}>Statistics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={navigateToSettings}>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 20,
    color: '#ffffff',
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeFilterLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  activeFilterBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  jobsList: {
    paddingVertical: 16,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  vhcIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  jobHeaderLeft: {
    flex: 1,
  },
  jobHeaderRight: {
    marginLeft: 12,
  },
  wipNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  regNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  vhcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  vhcBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  vhcBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  awBadge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  jobDetails: {
    gap: 8,
    paddingLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
});
