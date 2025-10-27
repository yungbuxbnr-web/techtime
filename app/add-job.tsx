
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

interface JobSuggestion {
  wipNumber: string;
  vehicleRegistration: string;
  awValue: number;
  lastUsed: string;
}

export default function AddJobScreen() {
  const { colors } = useTheme();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [wipNumber, setWipNumber] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [awValue, setAwValue] = useState(1);
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  const [isEditing, setIsEditing] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [wipSuggestions, setWipSuggestions] = useState<JobSuggestion[]>([]);
  const [regSuggestions, setRegSuggestions] = useState<JobSuggestion[]>([]);
  const [showWipSuggestions, setShowWipSuggestions] = useState(false);
  const [showRegSuggestions, setShowRegSuggestions] = useState(false);
  const [showAwPicker, setShowAwPicker] = useState(false);

  const wipRef = useRef<TextInput>(null);
  const vehicleRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

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

  const loadAllJobs = useCallback(async () => {
    try {
      const jobs = await StorageService.getJobs();
      setAllJobs(jobs);
      console.log('Loaded all jobs for suggestions:', jobs.length);
    } catch (error) {
      console.log('Error loading jobs:', error);
    }
  }, []);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  const loadJobForEditing = useCallback(async (jobId: string) => {
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
  }, [showNotification]);

  useEffect(() => {
    checkAuth();
    loadAllJobs();
    if (editId) {
      loadJobForEditing(editId);
    }
  }, [editId, loadJobForEditing, loadAllJobs]);

  // Optimized: Create indexed maps for faster lookups (iOS performance improvement)
  const jobIndexes = useMemo(() => {
    const wipMap = new Map<string, JobSuggestion>();
    const regMap = new Map<string, JobSuggestion>();

    // Process jobs in reverse order (most recent first)
    for (let i = allJobs.length - 1; i >= 0; i--) {
      const job = allJobs[i];
      
      // Index by WIP number
      if (!wipMap.has(job.wipNumber)) {
        wipMap.set(job.wipNumber, {
          wipNumber: job.wipNumber,
          vehicleRegistration: job.vehicleRegistration,
          awValue: job.awValue,
          lastUsed: job.dateCreated,
        });
      }
      
      // Index by registration number
      const regKey = job.vehicleRegistration.toUpperCase();
      if (!regMap.has(regKey)) {
        regMap.set(regKey, {
          wipNumber: job.wipNumber,
          vehicleRegistration: job.vehicleRegistration,
          awValue: job.awValue,
          lastUsed: job.dateCreated,
        });
      }
    }

    return { wipMap, regMap };
  }, [allJobs]);

  // Optimized: Generate WIP number suggestions with debouncing
  const generateWipSuggestions = useCallback((input: string) => {
    if (!input || input.length === 0) {
      setWipSuggestions([]);
      setShowWipSuggestions(false);
      return;
    }

    // Use indexed map for O(n) lookup instead of O(n²)
    const suggestions: JobSuggestion[] = [];
    
    jobIndexes.wipMap.forEach((suggestion, wipNum) => {
      if (wipNum.startsWith(input) && wipNum !== input && suggestions.length < 5) {
        suggestions.push(suggestion);
      }
    });

    // Sort by most recent
    suggestions.sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );

    setWipSuggestions(suggestions);
    setShowWipSuggestions(suggestions.length > 0);
  }, [jobIndexes.wipMap]);

  // Optimized: Generate registration number suggestions with debouncing
  const generateRegSuggestions = useCallback((input: string) => {
    if (!input || input.length === 0) {
      setRegSuggestions([]);
      setShowRegSuggestions(false);
      return;
    }

    const upperInput = input.toUpperCase();
    const suggestions: JobSuggestion[] = [];

    // Use indexed map for faster lookup
    jobIndexes.regMap.forEach((suggestion, regKey) => {
      if (regKey.includes(upperInput) && regKey !== upperInput && suggestions.length < 5) {
        suggestions.push(suggestion);
      }
    });

    // Sort by most recent
    suggestions.sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );

    setRegSuggestions(suggestions);
    setShowRegSuggestions(suggestions.length > 0);
  }, [jobIndexes.regMap]);

  const handleWipNumberChange = (text: string) => {
    setWipNumber(text);
    // Debounce for iOS performance
    if (Platform.OS === 'ios') {
      setTimeout(() => generateWipSuggestions(text), 100);
    } else {
      generateWipSuggestions(text);
    }
  };

  const handleVehicleRegistrationChange = (text: string) => {
    setVehicleRegistration(text);
    // Debounce for iOS performance
    if (Platform.OS === 'ios') {
      setTimeout(() => generateRegSuggestions(text), 100);
    } else {
      generateRegSuggestions(text);
    }
  };

  const selectWipSuggestion = (suggestion: JobSuggestion) => {
    setWipNumber(suggestion.wipNumber);
    setVehicleRegistration(suggestion.vehicleRegistration);
    setAwValue(suggestion.awValue);
    setShowWipSuggestions(false);
    showNotification('Previous job details loaded', 'info');
    console.log('Selected WIP suggestion:', suggestion.wipNumber);
  };

  const selectRegSuggestion = (suggestion: JobSuggestion) => {
    setWipNumber(suggestion.wipNumber);
    setVehicleRegistration(suggestion.vehicleRegistration);
    setAwValue(suggestion.awValue);
    setShowRegSuggestions(false);
    showNotification('Previous job details loaded', 'info');
    console.log('Selected registration suggestion:', suggestion.vehicleRegistration);
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
      const timeInMinutes = awValue * 5;
      
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
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
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
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
                onChangeText={handleWipNumberChange}
                placeholder="Enter 5-digit WIP number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                returnKeyType="next"
                onSubmitEditing={() => vehicleRef.current?.focus()}
                onFocus={() => generateWipSuggestions(wipNumber)}
                onBlur={() => setTimeout(() => setShowWipSuggestions(false), 200)}
              />
              {showWipSuggestions && wipSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsHeader}>Previous Jobs</Text>
                  {wipSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectWipSuggestion(suggestion)}
                    >
                      <View style={styles.suggestionContent}>
                        <View style={styles.suggestionMain}>
                          <Text style={styles.suggestionWip}>WIP: {suggestion.wipNumber}</Text>
                          <Text style={styles.suggestionReg}>{suggestion.vehicleRegistration}</Text>
                        </View>
                        <View style={styles.suggestionDetails}>
                          <Text style={styles.suggestionAw}>{suggestion.awValue} AW{suggestion.awValue !== 1 ? 's' : ''}</Text>
                          <Text style={styles.suggestionDate}>{formatDate(suggestion.lastUsed)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.helperText}>Must be exactly 5 digits</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Registration *</Text>
              <TextInput
                ref={vehicleRef}
                style={styles.input}
                value={vehicleRegistration}
                onChangeText={handleVehicleRegistrationChange}
                placeholder="Enter vehicle registration"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                returnKeyType="next"
                onSubmitEditing={() => notesRef.current?.focus()}
                onFocus={() => generateRegSuggestions(vehicleRegistration)}
                onBlur={() => setTimeout(() => setShowRegSuggestions(false), 200)}
              />
              {showRegSuggestions && regSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsHeader}>Previous Vehicles</Text>
                  {regSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectRegSuggestion(suggestion)}
                    >
                      <View style={styles.suggestionContent}>
                        <View style={styles.suggestionMain}>
                          <Text style={styles.suggestionReg}>{suggestion.vehicleRegistration}</Text>
                          <Text style={styles.suggestionWip}>WIP: {suggestion.wipNumber}</Text>
                        </View>
                        <View style={styles.suggestionDetails}>
                          <Text style={styles.suggestionAw}>{suggestion.awValue} AW{suggestion.awValue !== 1 ? 's' : ''}</Text>
                          <Text style={styles.suggestionDate}>{formatDate(suggestion.lastUsed)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>AW Value *</Text>
              {Platform.OS === 'ios' ? (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowAwPicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {awValue} AW{awValue !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.pickerButtonIcon}>▼</Text>
                  </TouchableOpacity>
                  
                  <Modal
                    visible={showAwPicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAwPicker(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select AW Value</Text>
                          <TouchableOpacity
                            style={styles.modalDoneButton}
                            onPress={() => setShowAwPicker(false)}
                          >
                            <Text style={styles.modalDoneText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <Picker
                          selectedValue={awValue}
                          onValueChange={(value) => setAwValue(value)}
                          style={styles.iosPicker}
                        >
                          {Array.from({ length: 101 }, (_, i) => (
                            <Picker.Item 
                              key={i} 
                              label={`${i} AW${i !== 1 ? 's' : ''}`} 
                              value={i}
                              color={colors.text}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </Modal>
                </>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={awValue}
                    onValueChange={setAwValue}
                    style={styles.picker}
                    dropdownIconColor={colors.text}
                  >
                    {Array.from({ length: 101 }, (_, i) => (
                      <Picker.Item 
                        key={i} 
                        label={`${i} AW${i !== 1 ? 's' : ''}`} 
                        value={i}
                        color={colors.text}
                      />
                    ))}
                  </Picker>
                </View>
              )}
              <Text style={styles.helperText}>
                1 AW = 5 minutes • Selected: {CalculationService.formatTime(awValue * 5)}
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
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
    position: 'relative',
    zIndex: 1,
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
  pickerButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
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
    paddingBottom: 34,
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
    backgroundColor: colors.card,
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
    color: '#ffffff',
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
  suggestionsContainer: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    maxHeight: 250,
    zIndex: 1000,
    elevation: 5,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
  },
  suggestionsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionMain: {
    flex: 1,
  },
  suggestionWip: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  suggestionReg: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  suggestionDetails: {
    alignItems: 'flex-end',
  },
  suggestionAw: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
