
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { StorageService } from '../utils/storage';
import { ExportService, ExportType, ExportFormat, ExportOptions } from '../utils/exportService';
import { Job, AppSettings } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function ExportReportsScreen() {
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [technicianName, setTechnicianName] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  // Export options
  const [exportType, setExportType] = useState<ExportType>('monthly');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = useState<{ start: Date; end: Date }>(
    ExportService.getWeekRange(new Date())
  );

  // iOS picker modals
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [jobsData, settingsData, name] = await Promise.all([
        StorageService.getJobs(),
        StorageService.getSettings(),
        StorageService.getTechnicianName(),
      ]);

      setJobs(jobsData);
      setSettings(settingsData);
      setTechnicianName(name || 'Technician');
      console.log('Export data loaded:', jobsData.length, 'jobs');
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Error loading data', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    if (!settings) {
      showNotification('Settings not loaded', 'error');
      return;
    }

    if (jobs.length === 0) {
      showNotification('No jobs to export', 'error');
      return;
    }

    try {
      setLoading(true);

      // Build export options
      const options: ExportOptions = {
        type: exportType,
        format: exportFormat,
      };

      // Add date-specific options
      if (exportType === 'daily') {
        options.selectedDate = selectedDate;
      } else if (exportType === 'weekly') {
        options.selectedWeek = selectedWeek;
      } else if (exportType === 'monthly') {
        options.selectedMonth = selectedMonth;
        options.selectedYear = selectedYear;
      }

      console.log('[Export] Starting export with options:', options);

      // Perform export
      const result = await ExportService.exportData(
        jobs,
        settings,
        technicianName,
        options
      );

      if (result.success) {
        showNotification(result.message, 'success');
        console.log('[Export] Export successful:', result.fileUri);
      } else {
        showNotification(result.message, 'error');
        console.error('[Export] Export failed:', result.message);
      }
    } catch (error: any) {
      console.error('[Export] Export error:', error);
      showNotification(error?.message || 'Export failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableMonths = () => {
    return ExportService.getAvailableMonths(jobs);
  };

  const getExportTypeLabel = () => {
    switch (exportType) {
      case 'daily':
        return 'Daily Report';
      case 'weekly':
        return 'Weekly Report';
      case 'monthly':
        return 'Monthly Report';
      case 'all':
        return 'Complete History';
      default:
        return 'Select Type';
    }
  };

  const getFormatLabel = () => {
    return exportFormat === 'pdf' ? 'PDF Document' : 'JSON Data';
  };

  const getSelectedMonthLabel = () => {
    const date = new Date(selectedYear, selectedMonth, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const availableMonths = getAvailableMonths();

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
        <Text style={[styles.title, { color: colors.text }]}>Export Reports</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Export Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Export Type</Text>
          <Text style={styles.sectionDescription}>
            Choose the time period for your export
          </Text>

          {Platform.OS === 'ios' ? (
            <>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTypePicker(true)}
              >
                <Text style={styles.pickerButtonText}>{getExportTypeLabel()}</Text>
                <Text style={styles.pickerButtonIcon}>▼</Text>
              </TouchableOpacity>

              <Modal
                visible={showTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTypePicker(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowTypePicker(false)}
                >
                  <TouchableOpacity
                    style={styles.modalContent}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Export Type</Text>
                      <TouchableOpacity
                        style={styles.modalDoneButton}
                        onPress={() => setShowTypePicker(false)}
                      >
                        <Text style={styles.modalDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <Picker
                      selectedValue={exportType}
                      onValueChange={(value) => setExportType(value)}
                      style={styles.iosPicker}
                      itemStyle={styles.iosPickerItem}
                    >
                      <Picker.Item label="Daily Report" value="daily" />
                      <Picker.Item label="Weekly Report" value="weekly" />
                      <Picker.Item label="Monthly Report" value="monthly" />
                      <Picker.Item label="Complete History" value="all" />
                    </Picker>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={exportType}
                onValueChange={(value) => setExportType(value)}
                style={styles.picker}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Daily Report" value="daily" color={colors.text} />
                <Picker.Item label="Weekly Report" value="weekly" color={colors.text} />
                <Picker.Item label="Monthly Report" value="monthly" color={colors.text} />
                <Picker.Item label="Complete History" value="all" color={colors.text} />
              </Picker>
            </View>
          )}
        </View>

        {/* Month Selection (for monthly export) */}
        {exportType === 'monthly' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Select Month</Text>
            <Text style={styles.sectionDescription}>
              Choose which month to export
            </Text>

            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowMonthPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>{getSelectedMonthLabel()}</Text>
                  <Text style={styles.pickerButtonIcon}>▼</Text>
                </TouchableOpacity>

                <Modal
                  visible={showMonthPicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowMonthPicker(false)}
                >
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMonthPicker(false)}
                  >
                    <TouchableOpacity
                      style={styles.modalContent}
                      activeOpacity={1}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Month</Text>
                        <TouchableOpacity
                          style={styles.modalDoneButton}
                          onPress={() => setShowMonthPicker(false)}
                        >
                          <Text style={styles.modalDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <Picker
                        selectedValue={`${selectedYear}-${selectedMonth}`}
                        onValueChange={(value) => {
                          const [year, month] = value.split('-').map(Number);
                          setSelectedYear(year);
                          setSelectedMonth(month);
                        }}
                        style={styles.iosPicker}
                        itemStyle={styles.iosPickerItem}
                      >
                        {availableMonths.map((item) => (
                          <Picker.Item
                            key={`${item.year}-${item.month}`}
                            label={`${item.label} (${item.count} jobs)`}
                            value={`${item.year}-${item.month}`}
                          />
                        ))}
                      </Picker>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              </>
            ) : (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={`${selectedYear}-${selectedMonth}`}
                  onValueChange={(value) => {
                    const [year, month] = value.split('-').map(Number);
                    setSelectedYear(year);
                    setSelectedMonth(month);
                  }}
                  style={styles.picker}
                  dropdownIconColor={colors.text}
                >
                  {availableMonths.map((item) => (
                    <Picker.Item
                      key={`${item.year}-${item.month}`}
                      label={`${item.label} (${item.count} jobs)`}
                      value={`${item.year}-${item.month}`}
                      color={colors.text}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>
        )}

        {/* Export Format Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Export Format</Text>
          <Text style={styles.sectionDescription}>
            Choose the file format for your export
          </Text>

          {Platform.OS === 'ios' ? (
            <>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowFormatPicker(true)}
              >
                <Text style={styles.pickerButtonText}>{getFormatLabel()}</Text>
                <Text style={styles.pickerButtonIcon}>▼</Text>
              </TouchableOpacity>

              <Modal
                visible={showFormatPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFormatPicker(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowFormatPicker(false)}
                >
                  <TouchableOpacity
                    style={styles.modalContent}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Format</Text>
                      <TouchableOpacity
                        style={styles.modalDoneButton}
                        onPress={() => setShowFormatPicker(false)}
                      >
                        <Text style={styles.modalDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <Picker
                      selectedValue={exportFormat}
                      onValueChange={(value) => setExportFormat(value)}
                      style={styles.iosPicker}
                      itemStyle={styles.iosPickerItem}
                    >
                      <Picker.Item label="PDF Document" value="pdf" />
                      <Picker.Item label="JSON Data" value="json" />
                    </Picker>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={exportFormat}
                onValueChange={(value) => setExportFormat(value)}
                style={styles.picker}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="PDF Document" value="pdf" color={colors.text} />
                <Picker.Item label="JSON Data" value="json" color={colors.text} />
              </Picker>
            </View>
          )}

          <View style={styles.formatInfo}>
            {exportFormat === 'pdf' ? (
              <>
                <Text style={styles.infoText}>📄 PDF format creates a stylish, printable report</Text>
                <Text style={styles.infoText}>✅ Perfect for sharing and archiving</Text>
                <Text style={styles.infoText}>📊 Includes summary statistics and job details</Text>
              </>
            ) : (
              <>
                <Text style={styles.infoText}>💾 JSON format exports raw data</Text>
                <Text style={styles.infoText}>✅ Can be imported back into the app</Text>
                <Text style={styles.infoText}>🔄 Perfect for backups and data transfer</Text>
              </>
            )}
          </View>
        </View>

        {/* Export Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Export Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Jobs:</Text>
              <Text style={styles.summaryValue}>{jobs.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Export Type:</Text>
              <Text style={styles.summaryValue}>{getExportTypeLabel()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Format:</Text>
              <Text style={styles.summaryValue}>{getFormatLabel()}</Text>
            </View>
            {exportType === 'monthly' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Period:</Text>
                <Text style={styles.summaryValue}>{getSelectedMonthLabel()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportButton, loading && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.exportButtonText}>
              {exportFormat === 'pdf' ? '📄 Export to PDF' : '💾 Export to JSON'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: colors.text,
  },
  pickerButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  pickerButtonIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  iosPicker: {
    width: '100%',
    height: 216,
  },
  iosPickerItem: {
    fontSize: 18,
    height: 216,
    color: colors.text,
  },
  formatInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.3)',
    elevation: 4,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
