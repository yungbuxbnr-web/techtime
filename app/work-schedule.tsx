
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TimeTrackingService, WorkScheduleSettings } from '../utils/timeTrackingService';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function WorkScheduleScreen() {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<WorkScheduleSettings>({
    workStartTime: '08:00',
    workEndTime: '17:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
    workDays: [1, 2, 3, 4, 5],
    enabled: true,
  });
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await TimeTrackingService.getSettings();
      setSettings(loadedSettings);
      console.log('Work schedule settings loaded:', loadedSettings);
    } catch (error) {
      console.log('Error loading work schedule settings:', error);
      showNotification('Error loading settings', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Validate times
      const workStart = TimeTrackingService['parseTime'](settings.workStartTime);
      const workEnd = TimeTrackingService['parseTime'](settings.workEndTime);
      const lunchStart = TimeTrackingService['parseTime'](settings.lunchStartTime);
      const lunchEnd = TimeTrackingService['parseTime'](settings.lunchEndTime);

      // Check if work end is after work start
      const workStartMinutes = workStart.hours * 60 + workStart.minutes;
      const workEndMinutes = workEnd.hours * 60 + workEnd.minutes;
      if (workEndMinutes <= workStartMinutes) {
        showNotification('Work end time must be after work start time', 'error');
        return;
      }

      // Check if lunch is within work hours
      const lunchStartMinutes = lunchStart.hours * 60 + lunchStart.minutes;
      const lunchEndMinutes = lunchEnd.hours * 60 + lunchEnd.minutes;
      if (lunchStartMinutes < workStartMinutes || lunchEndMinutes > workEndMinutes) {
        showNotification('Lunch time must be within work hours', 'error');
        return;
      }

      // Check if lunch end is after lunch start
      if (lunchEndMinutes <= lunchStartMinutes) {
        showNotification('Lunch end time must be after lunch start time', 'error');
        return;
      }

      // Check if at least one work day is selected
      if (settings.workDays.length === 0) {
        showNotification('Please select at least one work day', 'error');
        return;
      }

      await TimeTrackingService.saveSettings(settings);
      showNotification('Work schedule settings saved successfully', 'success');
      console.log('Work schedule settings saved:', settings);
    } catch (error) {
      console.log('Error saving work schedule settings:', error);
      showNotification('Error saving settings', 'error');
    }
  };

  const toggleWorkDay = (day: number) => {
    setSettings(prev => {
      const workDays = prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day].sort();
      return { ...prev, workDays };
    });
  };

  const handleTimeChange = (field: keyof WorkScheduleSettings, value: string) => {
    // Format time input (HH:mm)
    let formattedValue = value.replace(/[^0-9:]/g, '');
    
    // Auto-add colon after 2 digits
    if (formattedValue.length === 2 && !formattedValue.includes(':')) {
      formattedValue += ':';
    }
    
    // Limit to HH:mm format
    if (formattedValue.length > 5) {
      formattedValue = formattedValue.substring(0, 5);
    }

    setSettings(prev => ({ ...prev, [field]: formattedValue }));
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
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Work Schedule</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enable/Disable Time Tracking */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>⏰ Enable Time Tracking</Text>
              <Text style={styles.switchSubtext}>
                Track your work hours automatically
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => setSettings(prev => ({ ...prev, enabled: value }))}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.enabled ? colors.background : colors.background}
            />
          </View>
        </View>

        {/* Work Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Work Hours</Text>
          <Text style={styles.sectionDescription}>
            Set your daily work start and end times
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={settings.workStartTime}
                onChangeText={(value) => handleTimeChange('workStartTime', value)}
                placeholder="08:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                maxLength={5}
              />
            </View>

            <View style={styles.timeInput}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                value={settings.workEndTime}
                onChangeText={(value) => handleTimeChange('workEndTime', value)}
                placeholder="17:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                maxLength={5}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Use 24-hour format (HH:mm). Example: 08:00 for 8 AM, 17:00 for 5 PM
            </Text>
          </View>
        </View>

        {/* Lunch Break */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Lunch Break</Text>
          <Text style={styles.sectionDescription}>
            Set your lunch break start and end times
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>Lunch Start</Text>
              <TextInput
                style={styles.input}
                value={settings.lunchStartTime}
                onChangeText={(value) => handleTimeChange('lunchStartTime', value)}
                placeholder="12:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                maxLength={5}
              />
            </View>

            <View style={styles.timeInput}>
              <Text style={styles.label}>Lunch End</Text>
              <TextInput
                style={styles.input}
                value={settings.lunchEndTime}
                onChangeText={(value) => handleTimeChange('lunchEndTime', value)}
                placeholder="13:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                maxLength={5}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🍴 Lunch time will be shown in a different color on the progress bar
            </Text>
          </View>
        </View>

        {/* Work Days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Work Days</Text>
          <Text style={styles.sectionDescription}>
            Select the days you work each week
          </Text>

          <View style={styles.daysGrid}>
            {[0, 1, 2, 3, 4, 5, 6].map(day => {
              const isSelected = settings.workDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    { borderColor: colors.border }
                  ]}
                  onPress={() => toggleWorkDay(day)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    isSelected && styles.dayButtonTextSelected,
                    { color: isSelected ? '#ffffff' : colors.text }
                  ]}>
                    {TimeTrackingService.getShortDayName(day)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📌 Selected days: {settings.workDays.map(d => TimeTrackingService.getDayName(d)).join(', ') || 'None'}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Schedule Summary</Text>
          
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Work Hours:</Text>
              <Text style={styles.summaryValue}>
                {settings.workStartTime} - {settings.workEndTime}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Lunch Break:</Text>
              <Text style={styles.summaryValue}>
                {settings.lunchStartTime} - {settings.lunchEndTime}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Work Days:</Text>
              <Text style={styles.summaryValue}>
                {settings.workDays.length} days/week
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Status:</Text>
              <Text style={[
                styles.summaryValue,
                { color: settings.enabled ? colors.success : colors.error }
              ]}>
                {settings.enabled ? '✅ Enabled' : '❌ Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSaveSettings}
        >
          <Text style={styles.saveButtonText}>💾 Save Work Schedule</Text>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ How Time Tracking Works</Text>
          <Text style={styles.infoText}>
            • Time tracking runs automatically in the background
          </Text>
          <Text style={styles.infoText}>
            • Progress is calculated second by second
          </Text>
          <Text style={styles.infoText}>
            • Lunch time is shown in a different color
          </Text>
          <Text style={styles.infoText}>
            • Only tracks time on selected work days
          </Text>
          <Text style={styles.infoText}>
            • View live stats by tapping the progress bar on the dashboard
          </Text>
        </View>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
  },
  infoBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    minWidth: '13%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
  },
  summaryBox: {
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 16,
    marginBottom: 32,
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
});
