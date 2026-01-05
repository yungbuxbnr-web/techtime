
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

const AbsenceLogger: React.FC<AbsenceLoggerProps> = ({ settings, onUpdate, colors }) => {
  const [absenceType, setAbsenceType] = useState<'full' | 'half'>('full');
  const [showPicker, setShowPicker] = useState(false);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleSettings | null>(null);

  useEffect(() => {
    loadWorkSchedule();
  }, []);

  const loadWorkSchedule = async () => {
    const schedule = await TimeTrackingService.getWorkSchedule();
    setWorkSchedule(schedule);
  };

  const handleLogAbsence = async () => {
    if (!workSchedule) {
      Alert.alert('Error', 'Work schedule not loaded');
      return;
    }

    const hoursToAdd = absenceType === 'full' 
      ? TimeTrackingService.calculateFullDayHours(workSchedule)
      : TimeTrackingService.calculateHalfDayHours(workSchedule);

    const updatedSettings = {
      ...settings,
      absenceHours: (settings.absenceHours || 0) + hoursToAdd,
    };

    await onUpdate(updatedSettings);
    Alert.alert('Success', `${absenceType === 'full' ? 'Full' : 'Half'} day absence logged: ${hoursToAdd.toFixed(2)} hours`);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Log Absence</Text>
      
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.pickerButtonText, { color: colors.text }]}>
          {absenceType === 'full' ? 'Full Day' : 'Half Day'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logButton, { backgroundColor: colors.primary }]}
        onPress={handleLogAbsence}
      >
        <Text style={styles.logButtonText}>Log Absence</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Picker
              selectedValue={absenceType}
              onValueChange={(value) => {
                setAbsenceType(value);
                setShowPicker(false);
              }}
            >
              <Picker.Item label="Full Day" value="full" />
              <Picker.Item label="Half Day" value="half" />
            </Picker>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pickerButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  logButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 16,
  },
});

export default AbsenceLogger;
