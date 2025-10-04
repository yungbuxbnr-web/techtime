
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { commonStyles, colors } from '../styles/commonStyles';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';

export default function AddJobScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [wipNumber, setWipNumber] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [awValue, setAwValue] = useState(1);
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isEditing, setIsEditing] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const wipRef = useRef<TextInput>(null);
  const vehicleRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  useEffect(() => {
    checkAuth();
    if (editId) {
      loadJobForEditing(editId);
    }
  }, [editId]);

  const loadJobForEditing = async (jobId: string) => {
    try {
      const jobs = await StorageService.getJobs();
      const jobToEdit = jobs.find(job => job.id === jobId);
      if (jobToEdit) {
        setEditingJob(jobToEdit);
        setIsEditing(true);
        setWipNumber(jobToEdit.wipNumber);
        setVehicleRegistration(jobToEdit.vehicleRegistration);
        setAwValue(jobToEdit.awValue);
        setNotes(jobToEdit.notes || '');
        console.log('Loaded job for editing:', jobToEdit.wipNumber);
      } else {
        showNotification('Job not found', 'error');
        router.back();
      }
    } catch (error) {
      console.log('Error loading job for editing:', error);
      showNotification('Error loading job', 'error');
      router.back();
    }
  };

  const checkAuth = async () => {
    try {
      const settings = await StorageService.getSettings();
      if (!settings.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
      }
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/auth');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  };

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const validateForm = () => {
    if (!wipNumber.trim()) {
      showNotification('Please enter a WIP number', 'error');
      wipRef.current?.focus();
      return false;
    }

    if (wipNumber.length !== 5 || !/^\d+$/.test(wipNumber)) {
      showNotification('WIP number must be exactly 5 digits', 'error');
      wipRef.current?.focus();
      return false;
    }

    if (!vehicleRegistration.trim()) {
      showNotification('Please enter vehicle registration', 'error');
      vehicleRef.current?.focus();
      return false;
    }

    if (awValue < 0 || awValue > 100) {
      showNotification('AW value must be between 0 and 100', 'error');
      return false;
    }

    return true;
  };

  const handleSaveJob = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const timeInMinutes = CalculationService.calculateTimeFromAWs(awValue);
      
      if (isEditing && editingJob) {
        // Update existing job
        const updatedJob: Job = {
          ...editingJob,
          wipNumber: wipNumber.trim(),
          vehicleRegistration: vehicleRegistration.trim().toUpperCase(),
          awValue,
          timeInMinutes,
          notes: notes.trim(),
          // Keep original dateCreated, but update dateModified
          dateModified: new Date().toISOString(),
        };

        await StorageService.updateJob(updatedJob);
        showNotification('Job updated successfully!', 'success');
        console.log('Job updated:', updatedJob.wipNumber);
      } else {
        // Create new job
        const newJob: Job = {
          id: Date.now().toString(),
          wipNumber: wipNumber.trim(),
          vehicleRegistration: vehicleRegistration.trim().toUpperCase(),
          awValue,
          timeInMinutes,
          notes: notes.trim(),
          dateCreated: new Date().toISOString(),
        };

        await StorageService.saveJob(newJob);
        showNotification('Job saved successfully!', 'success');
        console.log('New job saved:', newJob.wipNumber);
      }

      // Clear form after successful save
      setTimeout(() => {
        setWipNumber('');
        setVehicleRegistration('');
        setAwValue(1);
        setNotes('');
        router.back();
      }, 1500);

    } catch (error) {
      console.log('Error saving job:', error);
      showNotification('Error saving job. Please try again.', 'error');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={commonStyles.title}>
            {isEditing ? 'Edit Job' : 'Add New Job'}
          </Text>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WIP Number *</Text>
              <TextInput
                ref={wipRef}
                style={styles.input}
                value={wipNumber}
                onChangeText={setWipNumber}
                placeholder="Enter 5-digit WIP number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                returnKeyType="next"
                onSubmitEditing={() => vehicleRef.current?.focus()}
              />
              <Text style={styles.helperText}>Must be exactly 5 digits</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Registration *</Text>
              <TextInput
                ref={vehicleRef}
                style={styles.input}
                value={vehicleRegistration}
                onChangeText={setVehicleRegistration}
                placeholder="Enter vehicle registration"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                returnKeyType="next"
                onSubmitEditing={() => notesRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>AW Value *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={awValue}
                  onValueChange={setAwValue}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {Array.from({ length: 101 }, (_, i) => (
                    <Picker.Item key={i} label={`${i} AW${i !== 1 ? 's' : ''}`} value={i} />
                  ))}
                </Picker>
              </View>
              <Text style={styles.helperText}>
                1 AW = 5 minutes • Selected: {CalculationService.formatTime(CalculationService.calculateTimeFromAWs(awValue))}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                ref={notesRef}
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveJob}
            >
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update Job' : 'Save Job'}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleBack}
              >
                <Text style={styles.cancelButtonText}>Cancel Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 48,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  pickerItem: {
    fontSize: 16,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
