
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';

export default function AddJobScreen() {
  const [wipNumber, setWipNumber] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [awValue, setAwValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  
  const scrollViewRef = useRef<ScrollView>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  };

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const validateForm = (): boolean => {
    if (!wipNumber.trim()) {
      showNotification('WIP number is required', 'error');
      return false;
    }
    
    if (wipNumber.length !== 5 || !/^\d{5}$/.test(wipNumber)) {
      showNotification('WIP number must be 5 digits', 'error');
      return false;
    }
    
    if (!vehicleRegistration.trim()) {
      showNotification('Vehicle registration is required', 'error');
      return false;
    }
    
    if (awValue <= 0) {
      showNotification('AW value must be greater than 0', 'error');
      return false;
    }
    
    return true;
  };

  const handleSaveJob = async () => {
    if (!validateForm()) return;

    try {
      const job: Job = {
        id: Date.now().toString(),
        wipNumber: wipNumber.trim(),
        vehicleRegistration: vehicleRegistration.trim().toUpperCase(),
        awValue,
        notes: notes.trim(),
        dateCreated: new Date().toISOString(),
        timeInMinutes: CalculationService.awsToMinutes(awValue)
      };

      await StorageService.saveJob(job);
      showNotification('Job saved successfully', 'success');
      
      // Clear form
      setWipNumber('');
      setVehicleRegistration('');
      setAwValue(0);
      setNotes('');
      
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.log('Error saving job:', error);
      showNotification('Error saving job', 'error');
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Generate AW options (0-100)
  const awOptions = Array.from({ length: 101 }, (_, i) => i);

  return (
    <SafeAreaView style={commonStyles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={commonStyles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={commonStyles.title}>Add New Job</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WIP Number *</Text>
              <TextInput
                style={commonStyles.input}
                value={wipNumber}
                onChangeText={setWipNumber}
                placeholder="Enter 5-digit WIP number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                  }, 100);
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Registration *</Text>
              <TextInput
                style={commonStyles.input}
                value={vehicleRegistration}
                onChangeText={setVehicleRegistration}
                placeholder="Enter vehicle registration"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 100, animated: true });
                  }, 100);
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>AW Value *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={awValue}
                  onValueChange={setAwValue}
                  style={styles.picker}
                >
                  {awOptions.map(value => (
                    <Picker.Item
                      key={value}
                      label={`${value} AW${value !== 1 ? 's' : ''} (${CalculationService.formatTime(CalculationService.awsToMinutes(value))})`}
                      value={value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[commonStyles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter any additional notes"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
            </View>

            <View style={styles.timePreview}>
              <Text style={styles.timePreviewLabel}>Calculated Time:</Text>
              <Text style={styles.timePreviewValue}>
                {CalculationService.formatTime(CalculationService.awsToMinutes(awValue))}
              </Text>
            </View>

            <TouchableOpacity
              style={[commonStyles.button, styles.saveButton]}
              onPress={handleSaveJob}
            >
              <Text style={commonStyles.buttonText}>Save Job</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
  timePreview: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePreviewLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  timePreviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  saveButton: {
    marginTop: 20,
  },
});
