
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AppSettings } from '../types';
import { TimeTrackingService, WorkScheduleSettings } from '../utils/timeTrackingService';

interface AbsenceLoggerProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => Promise<void>;
  colors: any;
}

export default function AbsenceLogger({ settings, onUpdate, colors }: AbsenceLoggerProps) {
  const [numberOfAbsentDays, setNumberOfAbsentDays] = useState<number>(1);
  const [absenceType, setAbsenceType] = useState<'half' | 'full'>('full');
  const [deductionType, setDeductionType] = useState<'monthly' | 'available'>('monthly');
  const [workDayHours, setWorkDayHours] = useState<number>(8.5);
  
  // iOS picker modal states
  const [showDaysPicker, setShowDaysPicker] = useState(false);
  const [showAbsenceTypePicker, setShowAbsenceTypePicker] = useState(false);
  const [showDeductionTypePicker, setShowDeductionTypePicker] = useState(false);

  // Load work schedule settings to get work day hours
  useEffect(() => {
    const loadWorkSchedule = async () => {
      try {
        const workSchedule = await TimeTrackingService.getSettings();
        
        // Calculate work day hours from work schedule
        const startTime = TimeTrackingService['parseTime'](workSchedule.workStartTime);
        const endTime = TimeTrackingService['parseTime'](workSchedule.workEndTime);
        const lunchStart = TimeTrackingService['parseTime'](workSchedule.lunchStartTime);
        const lunchEnd = TimeTrackingService['parseTime'](workSchedule.lunchEndTime);
        
        // Calculate total work hours (work hours - lunch hours)
        const workStartMinutes = startTime.hours * 60 + startTime.minutes;
        const workEndMinutes = endTime.hours * 60 + endTime.minutes;
        const lunchStartMinutes = lunchStart.hours * 60 + lunchStart.minutes;
        const lunchEndMinutes = lunchEnd.hours * 60 + lunchEnd.minutes;
        
        const totalWorkMinutes = workEndMinutes - workStartMinutes;
        const lunchMinutes = lunchEndMinutes - lunchStartMinutes;
        const netWorkMinutes = totalWorkMinutes - lunchMinutes;
        const calculatedWorkDayHours = netWorkMinutes / 60;
        
        setWorkDayHours(calculatedWorkDayHours);
        console.log('[AbsenceLogger] Work day hours calculated from schedule:', calculatedWorkDayHours);
      } catch (error) {
        console.log('[AbsenceLogger] Error loading work schedule, using default 8.5 hours:', error);
        setWorkDayHours(8.5); // Fallback to default
      }
    };
    
    loadWorkSchedule();
  }, []);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthAbsenceHours = (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) 
    ? (settings.absenceHours || 0) 
    : 0;

  // Calculate hours per day based on work schedule
  const fullDayHours = workDayHours;
  const halfDayHours = workDayHours / 2;

  const handleLogAbsence = () => {
    const hoursPerDay = absenceType === 'half' ? halfDayHours : fullDayHours;
    const absenceHours = numberOfAbsentDays * hoursPerDay;
    
    const absenceTypeText = absenceType === 'half' ? 'Half Day' : 'Full Day';
    const dayLabel = numberOfAbsentDays === 1 
      ? `${numberOfAbsentDays} ${absenceTypeText}` 
      : `${numberOfAbsentDays} ${absenceTypeText}s`;
    
    let currentAbsenceHours = settings.absenceHours || 0;
    if (settings.absenceMonth !== currentMonth || settings.absenceYear !== currentYear) {
      currentAbsenceHours = 0;
      console.log('[AbsenceLogger] New month detected, resetting absence hours');
    }
    
    if (deductionType === 'monthly') {
      const currentTarget = settings.targetHours || 180;
      const newTargetHours = Math.max(0, currentTarget - absenceHours);
      
      Alert.alert(
        'Log Absence - Monthly Target',
        `This will deduct ${absenceHours.toFixed(2)} hours from your monthly target hours:\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay.toFixed(2)} hours = ${absenceHours.toFixed(2)} hours deducted\n\n📈 Monthly Target Update:\nCurrent Target: ${currentTarget} hours\nAbsence Deduction: -${absenceHours.toFixed(2)} hours\nNew Monthly Target: ${newTargetHours.toFixed(2)} hours\n\n✅ The monthly target progress circle will update automatically.\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Absence',
            style: 'default',
            onPress: async () => {
              try {
                const updatedSettings = { 
                  ...settings, 
                  targetHours: newTargetHours,
                  absenceMonth: currentMonth,
                  absenceYear: currentYear
                };
                await onUpdate(updatedSettings);
              } catch (error) {
                console.log('[AbsenceLogger] Error logging absence:', error);
                alert('Error logging absence');
              }
            }
          }
        ]
      );
    } else {
      const newAbsenceHours = currentAbsenceHours + absenceHours;
      
      Alert.alert(
        'Log Absence - Available Hours',
        `This will deduct ${absenceHours.toFixed(2)} hours from your total available hours (used in efficiency calculations):\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay.toFixed(2)} hours = ${absenceHours.toFixed(2)} hours deducted\n\n⏰ Available Hours Update:\nCurrent Absence This Month: ${currentAbsenceHours.toFixed(2)} hours\nNew Absence Deduction: +${absenceHours.toFixed(2)} hours\nTotal Absence This Month: ${newAbsenceHours.toFixed(2)} hours\n\n✅ The efficiency circle will update automatically.\n(This will NOT affect your monthly target hours)\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Absence',
            style: 'default',
            onPress: async () => {
              try {
                const updatedSettings = { 
                  ...settings, 
                  absenceHours: newAbsenceHours,
                  absenceMonth: currentMonth,
                  absenceYear: currentYear
                };
                await onUpdate(updatedSettings);
              } catch (error) {
                console.log('[AbsenceLogger] Error logging absence:', error);
                alert('Error logging absence');
              }
            }
          }
        ]
      );
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🏖️ Absence Logger</Text>
      <Text style={styles.sectionDescription}>
        Log absences to automatically adjust your hours. Choose whether to deduct from monthly target hours or total available hours for efficiency calculations.
      </Text>
      
      {/* Work Schedule Info */}
      <View style={styles.workScheduleInfo}>
        <Text style={styles.workScheduleInfoTitle}>📋 Current Work Schedule:</Text>
        <Text style={styles.workScheduleInfoText}>
          Full Day = {fullDayHours.toFixed(2)} hours
        </Text>
        <Text style={styles.workScheduleInfoText}>
          Half Day = {halfDayHours.toFixed(2)} hours
        </Text>
        <Text style={styles.workScheduleInfoSubtext}>
          💡 These values are calculated from your work schedule settings
        </Text>
      </View>
      
      {/* Number of Absent Days Dropdown */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Number of Absent Days</Text>
        {Platform.OS === 'ios' ? (
          <>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDaysPicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {numberOfAbsentDays} {numberOfAbsentDays === 1 ? 'day' : 'days'}
              </Text>
              <Text style={styles.pickerButtonIcon}>▼</Text>
            </TouchableOpacity>
            
            <Modal
              visible={showDaysPicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDaysPicker(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDaysPicker(false)}
              >
                <TouchableOpacity 
                  style={styles.modalContent}
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Number of Days</Text>
                    <TouchableOpacity
                      style={styles.modalDoneButton}
                      onPress={() => setShowDaysPicker(false)}
                    >
                      <Text style={styles.modalDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <Picker
                    selectedValue={numberOfAbsentDays}
                    onValueChange={(itemValue) => setNumberOfAbsentDays(itemValue)}
                    style={styles.iosPicker}
                    itemStyle={styles.iosPickerItem}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <Picker.Item 
                        key={day} 
                        label={`${day} ${day === 1 ? 'day' : 'days'}`} 
                        value={day}
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
              selectedValue={numberOfAbsentDays}
              onValueChange={(itemValue) => setNumberOfAbsentDays(itemValue)}
              style={styles.picker}
              dropdownIconColor={colors.text}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <Picker.Item 
                  key={day} 
                  label={`${day} ${day === 1 ? 'day' : 'days'}`} 
                  value={day}
                  color={colors.text}
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* Absence Type Dropdown */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Absence Type</Text>
        {Platform.OS === 'ios' ? (
          <>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowAbsenceTypePicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {absenceType === 'half' 
                  ? `Half Day (${halfDayHours.toFixed(2)} hours)` 
                  : `Full Day (${fullDayHours.toFixed(2)} hours)`}
              </Text>
              <Text style={styles.pickerButtonIcon}>▼</Text>
            </TouchableOpacity>
            
            <Modal
              visible={showAbsenceTypePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowAbsenceTypePicker(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowAbsenceTypePicker(false)}
              >
                <TouchableOpacity 
                  style={styles.modalContent}
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Absence Type</Text>
                    <TouchableOpacity
                      style={styles.modalDoneButton}
                      onPress={() => setShowAbsenceTypePicker(false)}
                    >
                      <Text style={styles.modalDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <Picker
                    selectedValue={absenceType}
                    onValueChange={(itemValue) => setAbsenceType(itemValue)}
                    style={styles.iosPicker}
                    itemStyle={styles.iosPickerItem}
                  >
                    <Picker.Item 
                      label={`Half Day (${halfDayHours.toFixed(2)} hours)`} 
                      value="half"
                    />
                    <Picker.Item 
                      label={`Full Day (${fullDayHours.toFixed(2)} hours)`} 
                      value="full"
                    />
                  </Picker>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </>
        ) : (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={absenceType}
              onValueChange={(itemValue) => setAbsenceType(itemValue)}
              style={styles.picker}
              dropdownIconColor={colors.text}
            >
              <Picker.Item 
                label={`Half Day (${halfDayHours.toFixed(2)} hours)`} 
                value="half"
                color={colors.text}
              />
              <Picker.Item 
                label={`Full Day (${fullDayHours.toFixed(2)} hours)`} 
                value="full"
                color={colors.text}
              />
            </Picker>
          </View>
        )}
      </View>

      {/* Deduction Type Dropdown */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Deduction Type</Text>
        {Platform.OS === 'ios' ? (
          <>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDeductionTypePicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {deductionType === 'monthly' ? 'Monthly Target Hours' : 'Total Available Hours'}
              </Text>
              <Text style={styles.pickerButtonIcon}>▼</Text>
            </TouchableOpacity>
            
            <Modal
              visible={showDeductionTypePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDeductionTypePicker(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDeductionTypePicker(false)}
              >
                <TouchableOpacity 
                  style={styles.modalContent}
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Deduction Type</Text>
                    <TouchableOpacity
                      style={styles.modalDoneButton}
                      onPress={() => setShowDeductionTypePicker(false)}
                    >
                      <Text style={styles.modalDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <Picker
                    selectedValue={deductionType}
                    onValueChange={(itemValue) => setDeductionType(itemValue)}
                    style={styles.iosPicker}
                    itemStyle={styles.iosPickerItem}
                  >
                    <Picker.Item 
                      label="Monthly Target Hours" 
                      value="monthly"
                    />
                    <Picker.Item 
                      label="Total Available Hours" 
                      value="available"
                    />
                  </Picker>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </>
        ) : (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={deductionType}
              onValueChange={(itemValue) => setDeductionType(itemValue)}
              style={styles.picker}
              dropdownIconColor={colors.text}
            >
              <Picker.Item 
                label="Monthly Target Hours" 
                value="monthly"
                color={colors.text}
              />
              <Picker.Item 
                label="Total Available Hours" 
                value="available"
                color={colors.text}
              />
            </Picker>
          </View>
        )}
        <Text style={styles.dropdownHint}>
          {deductionType === 'monthly' 
            ? '📊 Will reduce your monthly target hours (affects progress circle)' 
            : '⏰ Will reduce available hours for efficiency calculations (affects efficiency circle)'}
        </Text>
      </View>

      {/* Absence Preview */}
      <View style={styles.absencePreview}>
        <Text style={styles.previewLabel}>📋 Absence Calculation Preview:</Text>
        <Text style={styles.previewText}>
          {numberOfAbsentDays} {numberOfAbsentDays === 1 ? 'day' : 'days'} × {absenceType === 'half' ? halfDayHours.toFixed(2) : fullDayHours.toFixed(2)} hours = {(numberOfAbsentDays * (absenceType === 'half' ? halfDayHours : fullDayHours)).toFixed(2)} hours deducted
        </Text>
        <View style={styles.previewCalculation}>
          {deductionType === 'monthly' ? (
            <>
              <Text style={styles.previewCalcText}>
                Current Target: {(settings.targetHours || 180).toFixed(2)} hours
              </Text>
              <Text style={styles.previewCalcText}>
                Absence Deduction: -{(numberOfAbsentDays * (absenceType === 'half' ? halfDayHours : fullDayHours)).toFixed(2)} hours
              </Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewHighlight}>
                New Monthly Target: {Math.max(0, (settings.targetHours || 180) - (numberOfAbsentDays * (absenceType === 'half' ? halfDayHours : fullDayHours))).toFixed(2)} hours
              </Text>
              <Text style={[styles.previewNote, { color: colors.textSecondary }]}>
                ℹ️ This will affect your monthly target progress circle
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.previewCalcText}>
                Current Absence This Month: {currentMonthAbsenceHours.toFixed(2)} hours
              </Text>
              <Text style={styles.previewCalcText}>
                New Absence Deduction: +{(numberOfAbsentDays * (absenceType === 'half' ? halfDayHours : fullDayHours)).toFixed(2)} hours
              </Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewHighlight}>
                Total Absence This Month: {(currentMonthAbsenceHours + (numberOfAbsentDays * (absenceType === 'half' ? halfDayHours : fullDayHours))).toFixed(2)} hours
              </Text>
              <Text style={[styles.previewNote, { color: colors.textSecondary }]}>
                ℹ️ This will affect your efficiency calculations only
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Log Absence Button */}
      <TouchableOpacity 
        style={[styles.button, styles.logAbsenceButton]} 
        onPress={handleLogAbsence}
      >
        <Text style={styles.buttonText}>✅ Log Absence & Update Hours</Text>
      </TouchableOpacity>

      <View style={styles.absenceLoggerInfo}>
        <Text style={styles.infoTitle}>ℹ️ How Absence Logging Works:</Text>
        <Text style={styles.infoText}>
          - Half Day = {halfDayHours.toFixed(2)} hours deducted (based on your work schedule)
        </Text>
        <Text style={styles.infoText}>
          - Full Day = {fullDayHours.toFixed(2)} hours deducted (based on your work schedule)
        </Text>
        <Text style={styles.infoText}>
          - Monthly Target Hours: Reduces your monthly target permanently
        </Text>
        <Text style={styles.infoText}>
          - Total Available Hours: Reduces hours for efficiency calculations
        </Text>
        <Text style={styles.infoText}>
          - Progress circles update automatically based on deduction type
        </Text>
        <Text style={styles.infoText}>
          - Absence hours reset automatically each new month
        </Text>
        <Text style={styles.infoText}>
          - Hours are synced with your Work Schedule settings
        </Text>
        <Text style={styles.infoText}>
          - Example: 2 full days absent = {(2 * fullDayHours).toFixed(2)}h deducted from selected type
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
  workScheduleInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderLeftWidth: 4,
  },
  workScheduleInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  workScheduleInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  workScheduleInfoSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
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
  dropdownHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  absencePreview: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  previewCalculation: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  previewCalcText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  previewHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  previewNote: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logAbsenceButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  absenceLoggerInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
});
</write file>

Now let's update the settings screen to reload the absence logger when work schedule changes are saved:

<write file="app/settings.tsx">
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StorageService } from '../utils/storage';
import { AppSettings, Job } from '../types';
import SecuritySettings from '../components/SecuritySettings';
import ProfileSettings from '../components/ProfileSettings';
import AbsenceLogger from '../components/AbsenceLogger';
import NotificationToast from '../components/NotificationToast';
import { MonthlyResetService } from '../utils/monthlyReset';
import { CalculationService } from '../utils/calculations';
import { useTheme } from '../contexts/ThemeContext';

const commonStyles = {
  section: {
    marginBottom: 24,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
};

export default function SettingsScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({
    pin: '3101',
    isAuthenticated: false,
    targetHours: 180,
    theme: 'light',
    biometricEnabled: false,
    absenceHours: 0,
    absenceMonth: undefined,
    absenceYear: undefined,
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const isMounted = useRef(true);
  const [absenceLoggerKey, setAbsenceLoggerKey] = useState(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    if (isMounted.current) {
      setNotification({ visible: true, message, type });
    }
  }, []);

  const hideNotification = useCallback(() => {
    if (isMounted.current) {
      setNotification(prev => ({ ...prev, visible: false }));
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [loadedSettings, loadedJobs] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getJobs()
      ]);
      
      if (isMounted.current) {
        setSettings(loadedSettings);
        setJobs(loadedJobs);
        console.log('[Settings] Data loaded successfully');
      }
    } catch (error) {
      console.log('[Settings] Error loading data:', error);
      if (isMounted.current) {
        showNotification('Error loading settings', 'error');
      }
    }
  }, [showNotification]);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const loadedSettings = await StorageService.getSettings();
      if (!loadedSettings.isAuthenticated) {
        console.log('[Settings] User not authenticated, redirecting to auth');
        if (isMounted.current) {
          router.replace('/auth');
        }
        return;
      }
      await loadData();
    } catch (error) {
      console.log('[Settings] Error checking auth:', error);
      if (isMounted.current) {
        router.replace('/auth');
      }
    }
  }, [loadData]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleUpdateSettings = async (updatedSettings: AppSettings) => {
    try {
      await StorageService.saveSettings(updatedSettings);
      if (isMounted.current) {
        setSettings(updatedSettings);
        showNotification('Settings updated successfully', 'success');
        
        // Force reload the absence logger to pick up new work schedule hours
        setAbsenceLoggerKey(prev => prev + 1);
        console.log('[Settings] Absence logger reloaded with new work schedule');
      }
    } catch (error) {
      console.log('[Settings] Error updating settings:', error);
      if (isMounted.current) {
        showNotification('Error updating settings', 'error');
      }
    }
  };

  const handleResetMonthlyData = () => {
    Alert.alert(
      'Reset Monthly Data',
      'This will reset your monthly target hours and absence hours to default values. Your job records will NOT be affected.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const resetSettings = {
                ...settings,
                targetHours: 180,
                absenceHours: 0,
                absenceMonth: undefined,
                absenceYear: undefined,
              };
              await StorageService.saveSettings(resetSettings);
              if (isMounted.current) {
                setSettings(resetSettings);
                showNotification('Monthly data reset successfully', 'success');
                
                // Reload absence logger
                setAbsenceLoggerKey(prev => prev + 1);
              }
            } catch (error) {
              console.log('[Settings] Error resetting monthly data:', error);
              if (isMounted.current) {
                showNotification('Error resetting monthly data', 'error');
              }
            }
          }
        }
      ]
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete ALL your job records, settings, and data. This action CANNOT be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. All data will be permanently deleted. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await StorageService.clearAllData();
                      if (isMounted.current) {
                        showNotification('All data deleted. Redirecting to setup...', 'success');
                        setTimeout(() => {
                          if (isMounted.current) {
                            router.replace('/auth');
                          }
                        }, 2000);
                      }
                    } catch (error) {
                      console.log('[Settings] Error deleting all data:', error);
                      if (isMounted.current) {
                        showNotification('Error deleting data', 'error');
                      }
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthAbsenceHours = (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) 
    ? (settings.absenceHours || 0) 
    : 0;

  const monthlyStats = CalculationService.calculateMonthlyStats(jobs, settings.targetHours || 180, currentMonthAbsenceHours);

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
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Settings */}
        <ProfileSettings 
          settings={settings} 
          onUpdate={handleUpdateSettings}
          colors={colors}
        />

        {/* Security Settings */}
        <SecuritySettings 
          settings={settings} 
          onUpdate={handleUpdateSettings}
          colors={colors}
        />

        {/* Theme Settings */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🎨 Theme</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose your preferred color theme
          </Text>
          
          <View style={styles.themeRow}>
            <View style={styles.themeLeft}>
              <Text style={[styles.themeLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.themeSubtext, { color: colors.textSecondary }]}>
                {isDarkMode ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDarkMode ? colors.background : colors.background}
            />
          </View>
        </View>

        {/* Work Schedule */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⏰ Work Schedule</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Configure your work hours, days, and time tracking settings
          </Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.push('/work-schedule');
              // When returning from work schedule, reload absence logger
              setTimeout(() => {
                setAbsenceLoggerKey(prev => prev + 1);
              }, 500);
            }}
          >
            <Text style={styles.buttonText}>⚙️ Configure Work Schedule</Text>
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              💡 Set your work hours, lunch breaks, and work days
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              📊 Configure Saturday work frequency (e.g., 1 in 3 weeks)
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              🔔 Enable automatic work notifications
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              📅 Mark annual leave and training days in the calendar
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              ⚠️ Changes to work schedule will automatically update absence calculations
            </Text>
          </View>
        </View>

        {/* Absence Logger - with key to force reload */}
        <AbsenceLogger 
          key={absenceLoggerKey}
          settings={settings} 
          onUpdate={handleUpdateSettings}
          colors={colors}
        />

        {/* Monthly Stats Summary */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Current Month Summary</Text>
          
          <View style={[styles.statsBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Monthly Target Hours:</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {settings.targetHours || 180}h
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Total Sold Hours:</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {monthlyStats.totalSoldHours.toFixed(2)}h
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Absence Hours This Month:</Text>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {currentMonthAbsenceHours.toFixed(2)}h
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.text }]}>Available Hours (After Absence):</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {monthlyStats.totalAvailableHours.toFixed(2)}h
              </Text>
            </View>
            
            <View style={[styles.statRow, styles.statRowHighlight, { backgroundColor: colors.background }]}>
              <Text style={[styles.statLabel, styles.statLabelBold, { color: colors.text }]}>
                Efficiency:
              </Text>
              <Text style={[styles.statValue, styles.statValueBold, { color: CalculationService.getEfficiencyColor(monthlyStats.efficiency) }]}>
                {monthlyStats.efficiency}%
              </Text>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔔 Notifications</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Manage your notification preferences
          </Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/notification-settings')}
          >
            <Text style={styles.buttonText}>⚙️ Configure Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>💾 Data Management</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Import, export, and manage your data
          </Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/export-reports')}
          >
            <Text style={styles.buttonText}>📤 Export Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/import-jobs')}
          >
            <Text style={styles.buttonText}>📥 Import Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={handleResetMonthlyData}
          >
            <Text style={styles.buttonText}>🔄 Reset Monthly Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDeleteAllData}
          >
            <Text style={styles.buttonText}>🗑️ Delete All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Help & About */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ℹ️ Help & About</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Get help and view app information
          </Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/help')}
          >
            <Text style={styles.buttonText}>📖 Help & Documentation</Text>
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              App Version: 1.0.0
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Developed for: Buckston Rugge
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              © 2024 TechTime - All Rights Reserved
            </Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
          <Text style={[styles.navText, { color: colors.text }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/jobs')}>
          <Text style={[styles.navText, { color: colors.text }]}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/statistics')}>
          <Text style={[styles.navText, { color: colors.text }]}>Statistics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('[Settings] Already on Settings')}>
          <Text style={[styles.navText, styles.navTextActive, { color: colors.primary }]}>Settings</Text>
        </TouchableOpacity>
      </View>
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
    ...commonStyles.section,
    marginTop: 24,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  sectionTitle: {
    ...commonStyles.sectionTitle,
  },
  sectionDescription: {
    ...commonStyles.sectionDescription,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLeft: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeSubtext: {
    fontSize: 13,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  warningButton: {
    backgroundColor: '#FFC107',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  statsBox: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statRowHighlight: {
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 14,
  },
  statLabelBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statValueBold: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
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
  },
  navTextActive: {
    fontWeight: '600',
  },
});
