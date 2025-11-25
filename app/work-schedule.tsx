
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { TimeTrackingService, WorkScheduleSettings } from '../utils/timeTrackingService';
import { NotificationService } from '../utils/notificationService';
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
    saturdayFrequency: 0,
    nextSaturday: undefined,
  });
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [showSaturdayPicker, setShowSaturdayPicker] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const loadedSettings = await TimeTrackingService.getSettings();
      setSettings(loadedSettings);
      console.log('Work schedule settings loaded:', loadedSettings);
    } catch (error) {
      console.log('Error loading work schedule settings:', error);
      showNotification('Error loading settings', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const calculateNextSaturday = (frequency: number): string | undefined => {
    if (frequency === 0) return undefined;
    
    const today = new Date();
    const currentDay = today.getDay();
    
    // Calculate days until next Saturday (6 = Saturday)
    let daysUntilSaturday = (6 - currentDay + 7) % 7;
    if (daysUntilSaturday === 0) daysUntilSaturday = 7; // If today is Saturday, get next Saturday
    
    const nextSat = new Date(today);
    nextSat.setDate(today.getDate() + daysUntilSaturday);
    
    return nextSat.toISOString();
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

      // Check if at least one work day is selected (excluding Saturday if it's frequency-based)
      const regularWorkDays = settings.workDays.filter(d => d !== 6);
      if (regularWorkDays.length === 0 && settings.saturdayFrequency === 0) {
        showNotification('Please select at least one work day', 'error');
        return;
      }

      // Calculate next Saturday if frequency is set
      const nextSaturday = calculateNextSaturday(settings.saturdayFrequency || 0);
      const updatedSettings = { ...settings, nextSaturday };

      await TimeTrackingService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      
      // Schedule background notifications
      await NotificationService.scheduleWorkNotifications(updatedSettings);
      
      showNotification('Work schedule settings saved successfully. Notifications scheduled!', 'success');
      console.log('Work schedule settings saved:', updatedSettings);
    } catch (error) {
      console.log('Error saving work schedule settings:', error);
      showNotification('Error saving settings', 'error');
    }
  };

  const toggleWorkDay = (day: number) => {
    // Don't allow toggling Saturday directly if frequency is set
    if (day === 6 && settings.saturdayFrequency && settings.saturdayFrequency > 0) {
      showNotification('Saturday is managed by frequency setting', 'info');
      return;
    }

    setSettings(prev => {
      const workDays = prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day].sort();
      return { ...prev, workDays };
    });
  };

  const handleSaturdayFrequencyChange = (frequency: number) => {
    setSettings(prev => {
      let workDays = [...prev.workDays];
      
      if (frequency === 0) {
        // Remove Saturday from work days
        workDays = workDays.filter(d => d !== 6);
      } else {
        // Add Saturday to work days if not already there
        if (!workDays.includes(6)) {
          workDays = [...workDays, 6].sort();
        }
      }
      
      return { 
        ...prev, 
        saturdayFrequency: frequency,
        workDays 
      };
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

  const getSaturdayFrequencyLabel = (frequency: number): string => {
    if (frequency === 0) return 'Never work Saturdays';
    if (frequency === 1) return 'Every Saturday';
    return `Every ${frequency} weeks (1 in ${frequency})`;
  };

  const formatNextSaturday = (): string => {
    if (!settings.nextSaturday || !settings.saturdayFrequency || settings.saturdayFrequency === 0) {
      return 'N/A';
    }
    
    const date = new Date(settings.nextSaturday);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
              const isSaturday = day === 6;
              const isSaturdayManaged = isSaturday && settings.saturdayFrequency && settings.saturdayFrequency > 0;
              
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    isSaturdayManaged && styles.dayButtonManaged,
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
                  {isSaturdayManaged && (
                    <Text style={styles.dayButtonBadge}>📅</Text>
                  )}
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

        {/* Saturday Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📆 Saturday Work Frequency</Text>
          <Text style={styles.sectionDescription}>
            Configure how often you work on Saturdays (e.g., 1 in 3 weeks)
          </Text>

          {Platform.OS === 'ios' ? (
            <>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowSaturdayPicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {getSaturdayFrequencyLabel(settings.saturdayFrequency || 0)}
                </Text>
                <Text style={styles.pickerButtonIcon}>▼</Text>
              </TouchableOpacity>
              
              <Modal
                visible={showSaturdayPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSaturdayPicker(false)}
              >
                <TouchableOpacity 
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowSaturdayPicker(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalContent}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Saturday Frequency</Text>
                      <TouchableOpacity
                        style={styles.modalDoneButton}
                        onPress={() => setShowSaturdayPicker(false)}
                      >
                        <Text style={styles.modalDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <Picker
                      selectedValue={settings.saturdayFrequency || 0}
                      onValueChange={(itemValue) => handleSaturdayFrequencyChange(itemValue)}
                      style={styles.iosPicker}
                      itemStyle={styles.iosPickerItem}
                    >
                      <Picker.Item label="Never work Saturdays" value={0} />
                      <Picker.Item label="Every Saturday" value={1} />
                      <Picker.Item label="Every 2 weeks (1 in 2)" value={2} />
                      <Picker.Item label="Every 3 weeks (1 in 3)" value={3} />
                      <Picker.Item label="Every 4 weeks (1 in 4)" value={4} />
                      <Picker.Item label="Every 5 weeks (1 in 5)" value={5} />
                      <Picker.Item label="Every 6 weeks (1 in 6)" value={6} />
                    </Picker>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={settings.saturdayFrequency || 0}
                onValueChange={(itemValue) => handleSaturdayFrequencyChange(itemValue)}
                style={styles.picker}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Never work Saturdays" value={0} color={colors.text} />
                <Picker.Item label="Every Saturday" value={1} color={colors.text} />
                <Picker.Item label="Every 2 weeks (1 in 2)" value={2} color={colors.text} />
                <Picker.Item label="Every 3 weeks (1 in 3)" value={3} color={colors.text} />
                <Picker.Item label="Every 4 weeks (1 in 4)" value={4} color={colors.text} />
                <Picker.Item label="Every 5 weeks (1 in 5)" value={5} color={colors.text} />
                <Picker.Item label="Every 6 weeks (1 in 6)" value={6} color={colors.text} />
              </Picker>
            </View>
          )}

          {settings.saturdayFrequency && settings.saturdayFrequency > 0 && (
            <View style={styles.nextSaturdayBox}>
              <Text style={styles.nextSaturdayLabel}>📅 Next Working Saturday:</Text>
              <Text style={styles.nextSaturdayValue}>{formatNextSaturday()}</Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Set to &quot;Never&quot; if you don&apos;t work Saturdays
            </Text>
            <Text style={styles.infoText}>
              📆 Set to &quot;Every 3 weeks&quot; for 1 in 3 Saturday rotation
            </Text>
            <Text style={styles.infoText}>
              🔄 The app will automatically track your Saturday schedule
            </Text>
          </View>
        </View>

        {/* Notifications Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Background Notifications</Text>
          <Text style={styles.sectionDescription}>
            Automatic notifications will be sent for:
          </Text>
          
          <View style={styles.notificationList}>
            <View style={styles.notificationItem}>
              <Text style={styles.notificationIcon}>🏢</Text>
              <Text style={styles.notificationText}>Work Start - When your work day begins</Text>
            </View>
            <View style={styles.notificationItem}>
              <Text style={styles.notificationIcon}>🍽️</Text>
              <Text style={styles.notificationText}>Lunch Start - When your lunch break begins</Text>
            </View>
            <View style={styles.notificationItem}>
              <Text style={styles.notificationIcon}>⏰</Text>
              <Text style={styles.notificationText}>Lunch End - When your lunch break ends</Text>
            </View>
            <View style={styles.notificationItem}>
              <Text style={styles.notificationIcon}>🎉</Text>
              <Text style={styles.notificationText}>Work End - When your work day is complete</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📱 Notifications are scheduled automatically when you save your work schedule
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
              <Text style={styles.summaryLabel}>Saturday Frequency:</Text>
              <Text style={styles.summaryValue}>
                {getSaturdayFrequencyLabel(settings.saturdayFrequency || 0)}
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
            - Time tracking runs automatically in the background
          </Text>
          <Text style={styles.infoText}>
            - Progress is calculated second by second
          </Text>
          <Text style={styles.infoText}>
            - Lunch time is shown in a different color
          </Text>
          <Text style={styles.infoText}>
            - Only tracks time on selected work days
          </Text>
          <Text style={styles.infoText}>
            - Saturday frequency allows flexible scheduling
          </Text>
          <Text style={styles.infoText}>
            - Background notifications alert you for work events
          </Text>
          <Text style={styles.infoText}>
            - View live stats by tapping the progress bar on the dashboard
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
    position: 'relative',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonManaged: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
  },
  dayButtonBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
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
  nextSaturdayBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextSaturdayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  nextSaturdayValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  notificationList: {
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
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
