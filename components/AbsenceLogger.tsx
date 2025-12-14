
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AppSettings } from '../types';

interface AbsenceLoggerProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => Promise<void>;
  colors: any;
}

export default function AbsenceLogger({ settings, onUpdate, colors }: AbsenceLoggerProps) {
  const [numberOfAbsentDays, setNumberOfAbsentDays] = useState<number>(1);
  const [absenceType, setAbsenceType] = useState<'half' | 'full'>('full');
  const [deductionType, setDeductionType] = useState<'monthly' | 'available'>('monthly');
  
  // iOS picker modal states
  const [showDaysPicker, setShowDaysPicker] = useState(false);
  const [showAbsenceTypePicker, setShowAbsenceTypePicker] = useState(false);
  const [showDeductionTypePicker, setShowDeductionTypePicker] = useState(false);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthAbsenceHours = (settings.absenceMonth === currentMonth && settings.absenceYear === currentYear) 
    ? (settings.absenceHours || 0) 
    : 0;

  const handleLogAbsence = () => {
    const hoursPerDay = absenceType === 'half' ? 4.25 : 8.5;
    const absenceHours = numberOfAbsentDays * hoursPerDay;
    
    const absenceTypeText = absenceType === 'half' ? 'Half Day' : 'Full Day';
    const dayLabel = numberOfAbsentDays === 1 
      ? `${numberOfAbsentDays} ${absenceTypeText}` 
      : `${numberOfAbsentDays} ${absenceTypeText}s`;
    
    let currentAbsenceHours = settings.absenceHours || 0;
    if (settings.absenceMonth !== currentMonth || settings.absenceYear !== currentYear) {
      currentAbsenceHours = 0;
      console.log('New month detected, resetting absence hours');
    }
    
    if (deductionType === 'monthly') {
      const currentTarget = settings.targetHours || 180;
      const newTargetHours = Math.max(0, currentTarget - absenceHours);
      
      Alert.alert(
        'Log Absence - Monthly Target',
        `This will deduct ${absenceHours.toFixed(2)} hours from your monthly target hours:\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay} hours = ${absenceHours.toFixed(2)} hours\n\n📈 Monthly Target Update:\nCurrent Target: ${currentTarget} hours\nAbsence Deduction: -${absenceHours.toFixed(2)} hours\nNew Monthly Target: ${newTargetHours.toFixed(2)} hours\n\n✅ The monthly target progress circle will update automatically.\n\nContinue?`,
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
                console.log('Error logging absence:', error);
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
        `This will deduct ${absenceHours.toFixed(2)} hours from your total available hours (used in efficiency calculations):\n\n📊 Calculation:\n${dayLabel} × ${hoursPerDay} hours = ${absenceHours.toFixed(2)} hours\n\n⏰ Available Hours Update:\nCurrent Absence This Month: ${currentAbsenceHours.toFixed(2)} hours\nNew Absence Deduction: +${absenceHours.toFixed(2)} hours\nTotal Absence This Month: ${newAbsenceHours.toFixed(2)} hours\n\n✅ The efficiency circle will update automatically.\n(This will NOT affect your monthly target hours)\n\nContinue?`,
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
                console.log('Error logging absence:', error);
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
                {absenceType === 'half' ? 'Half Day (4.25 hours)' : 'Full Day (8.5 hours)'}
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
                      label="Half Day (4.25 hours)" 
                      value="half"
                    />
                    <Picker.Item 
                      label="Full Day (8.5 hours)" 
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
                label="Half Day (4.25 hours)" 
                value="half"
                color={colors.text}
              />
              <Picker.Item 
                label="Full Day (8.5 hours)" 
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
          {numberOfAbsentDays} {numberOfAbsentDays === 1 ? 'day' : 'days'} × {absenceType === 'half' ? '4.25' : '8.5'} hours = {(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours deducted
        </Text>
        <View style={styles.previewCalculation}>
          {deductionType === 'monthly' ? (
            <>
              <Text style={styles.previewCalcText}>
                Current Target: {(settings.targetHours || 180).toFixed(2)} hours
              </Text>
              <Text style={styles.previewCalcText}>
                Absence Deduction: -{(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours
              </Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewHighlight}>
                New Monthly Target: {Math.max(0, (settings.targetHours || 180) - (numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5))).toFixed(2)} hours
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
                New Absence Deduction: +{(numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5)).toFixed(2)} hours
              </Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewHighlight}>
                Total Absence This Month: {(currentMonthAbsenceHours + (numberOfAbsentDays * (absenceType === 'half' ? 4.25 : 8.5))).toFixed(2)} hours
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
          - Half Day = 4.25 hours deducted
        </Text>
        <Text style={styles.infoText}>
          - Full Day = 8.5 hours deducted
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
          - Example: 2 full days absent = 17h deducted from selected type
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
