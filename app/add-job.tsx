
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
  frequency: number; // How many times this combination has been used
  totalAWs: number; // Total AWs for this combination
}

export default function AddJobScreen() {
  const { colors } = useTheme();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [wipNumber, setWipNumber] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [awValue, setAwValue] = useState(1);
  const [notes, setNotes] = useState('');
  const [vhcColor, setVhcColor] = useState<'green' | 'orange' | 'red' | null>(null);
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
  
  // Debounce timers for suggestions
  const wipDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const regDebounceTimer = useRef<NodeJS.Timeout | null>(null);

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
        setVhcColor(jobToEdit.vhcColor || null);
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

  // Enhanced: Create indexed maps with frequency tracking
  const jobIndexes = useMemo(() => {
    const wipMap = new Map<string, JobSuggestion>();
    const regMap = new Map<string, JobSuggestion>();
    const combinationMap = new Map<string, JobSuggestion>(); // Track WIP+Reg combinations

    // Process all jobs to build frequency data
    allJobs.forEach(job => {
      const combinationKey = `${job.wipNumber}|${job.vehicleRegistration.toUpperCase()}`;
      
      // Track WIP number frequency
      if (wipMap.has(job.wipNumber)) {
        const existing = wipMap.get(job.wipNumber)!;
        existing.frequency += 1;
        existing.totalAWs += job.awValue;
        if (new Date(job.dateCreated) > new Date(existing.lastUsed)) {
          existing.lastUsed = job.dateCreated;
          existing.awValue = job.awValue; // Use most recent AW value
        }
      } else {
        wipMap.set(job.wipNumber, {
          wipNumber: job.wipNumber,
          vehicleRegistration: job.vehicleRegistration,
          awValue: job.awValue,
          lastUsed: job.dateCreated,
          frequency: 1,
          totalAWs: job.awValue,
        });
      }
      
      // Track registration number frequency
      const regKey = job.vehicleRegistration.toUpperCase();
      if (regMap.has(regKey)) {
        const existing = regMap.get(regKey)!;
        existing.frequency += 1;
        existing.totalAWs += job.awValue;
        if (new Date(job.dateCreated) > new Date(existing.lastUsed)) {
          existing.lastUsed = job.dateCreated;
          existing.wipNumber = job.wipNumber; // Use most recent WIP
          existing.awValue = job.awValue;
        }
      } else {
        regMap.set(regKey, {
          wipNumber: job.wipNumber,
          vehicleRegistration: job.vehicleRegistration,
          awValue: job.awValue,
          lastUsed: job.dateCreated,
          frequency: 1,
          totalAWs: job.awValue,
        });
      }

      // Track exact combinations
      if (combinationMap.has(combinationKey)) {
        const existing = combinationMap.get(combinationKey)!;
        existing.frequency += 1;
        existing.totalAWs += job.awValue;
        if (new Date(job.dateCreated) > new Date(existing.lastUsed)) {
          existing.lastUsed = job.dateCreated;
          existing.awValue = job.awValue;
        }
      } else {
        combinationMap.set(combinationKey, {
          wipNumber: job.wipNumber,
          vehicleRegistration: job.vehicleRegistration,
          awValue: job.awValue,
          lastUsed: job.dateCreated,
          frequency: 1,
          totalAWs: job.awValue,
        });
      }
    });

    return { wipMap, regMap, combinationMap };
  }, [allJobs]);

  // Enhanced: Generate WIP number suggestions with smart sorting - ONLY when user types
  const generateWipSuggestions = useCallback((input: string) => {
    // Clear any existing timer
    if (wipDebounceTimer.current) {
      clearTimeout(wipDebounceTimer.current);
    }

    // Don't show suggestions if input is empty or only whitespace
    if (!input || input.trim().length === 0) {
      setWipSuggestions([]);
      setShowWipSuggestions(false);
      return;
    }

    // Debounce: wait 300ms after user stops typing
    wipDebounceTimer.current = setTimeout(() => {
      console.log('Generating WIP suggestions for:', input);
      const suggestions: JobSuggestion[] = [];
      
      // First, check for exact combination match (repeat job)
      const exactMatches: JobSuggestion[] = [];
      jobIndexes.combinationMap.forEach((suggestion, key) => {
        const [wip] = key.split('|');
        if (wip === input) {
          exactMatches.push(suggestion);
        }
      });

      // If we have exact matches, prioritize them
      if (exactMatches.length > 0) {
        exactMatches.sort((a, b) => {
          // Sort by frequency first (repeat jobs)
          if (b.frequency !== a.frequency) {
            return b.frequency - a.frequency;
          }
          // Then by recency
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });
        suggestions.push(...exactMatches);
      }

      // Then add prefix matches
      jobIndexes.wipMap.forEach((suggestion, wipNum) => {
        if (wipNum.startsWith(input) && wipNum !== input) {
          suggestions.push(suggestion);
        }
      });

      // Smart sorting for prefix matches
      suggestions.sort((a, b) => {
        // Exact match gets highest priority
        const aExact = a.wipNumber === input ? 1 : 0;
        const bExact = b.wipNumber === input ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        // Then by frequency (repeat jobs)
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        
        // Finally by recency
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      const topSuggestions = suggestions.slice(0, 5);
      setWipSuggestions(topSuggestions);
      setShowWipSuggestions(topSuggestions.length > 0);
      
      if (topSuggestions.length > 0) {
        console.log(`Found ${topSuggestions.length} WIP suggestions, top frequency: ${topSuggestions[0].frequency}x`);
      }
    }, 300); // 300ms debounce delay
  }, [jobIndexes.wipMap, jobIndexes.combinationMap]);

  // Enhanced: Generate registration number suggestions with smart sorting - ONLY when user types
  const generateRegSuggestions = useCallback((input: string) => {
    // Clear any existing timer
    if (regDebounceTimer.current) {
      clearTimeout(regDebounceTimer.current);
    }

    // Don't show suggestions if input is empty or only whitespace
    if (!input || input.trim().length === 0) {
      setRegSuggestions([]);
      setShowRegSuggestions(false);
      return;
    }

    // Debounce: wait 300ms after user stops typing
    regDebounceTimer.current = setTimeout(() => {
      console.log('Generating registration suggestions for:', input);
      const upperInput = input.toUpperCase();
      const suggestions: JobSuggestion[] = [];

      // Check for exact matches first (repeat customer)
      const exactMatches: JobSuggestion[] = [];
      jobIndexes.regMap.forEach((suggestion, regKey) => {
        if (regKey === upperInput) {
          exactMatches.push(suggestion);
        }
      });

      // If we have exact matches, prioritize them
      if (exactMatches.length > 0) {
        exactMatches.sort((a, b) => {
          // Sort by frequency first (repeat customers)
          if (b.frequency !== a.frequency) {
            return b.frequency - a.frequency;
          }
          // Then by recency
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });
        suggestions.push(...exactMatches);
      }

      // Then add partial matches
      jobIndexes.regMap.forEach((suggestion, regKey) => {
        if (regKey.includes(upperInput) && regKey !== upperInput) {
          suggestions.push(suggestion);
        }
      });

      // Smart sorting for partial matches
      suggestions.sort((a, b) => {
        // Exact match gets priority
        const aExact = a.vehicleRegistration.toUpperCase() === upperInput ? 1 : 0;
        const bExact = b.vehicleRegistration.toUpperCase() === upperInput ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        // Starts with input gets priority
        const aStarts = a.vehicleRegistration.toUpperCase().startsWith(upperInput) ? 1 : 0;
        const bStarts = b.vehicleRegistration.toUpperCase().startsWith(upperInput) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        
        // Then by frequency (repeat customers)
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        
        // Finally by recency
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      const topSuggestions = suggestions.slice(0, 5);
      setRegSuggestions(topSuggestions);
      setShowRegSuggestions(topSuggestions.length > 0);
      
      if (topSuggestions.length > 0) {
        console.log(`Found ${topSuggestions.length} registration suggestions, top frequency: ${topSuggestions[0].frequency}x`);
      }
    }, 300); // 300ms debounce delay
  }, [jobIndexes.regMap]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (wipDebounceTimer.current) {
        clearTimeout(wipDebounceTimer.current);
      }
      if (regDebounceTimer.current) {
        clearTimeout(regDebounceTimer.current);
      }
    };
  }, []);

  const handleWipNumberChange = (text: string) => {
    setWipNumber(text);
    generateWipSuggestions(text);
  };

  const handleVehicleRegistrationChange = (text: string) => {
    setVehicleRegistration(text);
    generateRegSuggestions(text);
  };

  const selectWipSuggestion = (suggestion: JobSuggestion) => {
    setWipNumber(suggestion.wipNumber);
    setVehicleRegistration(suggestion.vehicleRegistration);
    setAwValue(suggestion.awValue);
    setShowWipSuggestions(false);
    
    const message = suggestion.frequency > 1 
      ? `Loaded repeat job (${suggestion.frequency}x previously)`
      : 'Previous job details loaded';
    showNotification(message, 'info');
    console.log('Selected WIP suggestion:', suggestion.wipNumber, 'Frequency:', suggestion.frequency);
  };

  const selectRegSuggestion = (suggestion: JobSuggestion) => {
    setWipNumber(suggestion.wipNumber);
    setVehicleRegistration(suggestion.vehicleRegistration);
    setAwValue(suggestion.awValue);
    setShowRegSuggestions(false);
    
    const message = suggestion.frequency > 1 
      ? `Loaded repeat customer (${suggestion.frequency}x previously)`
      : 'Previous job details loaded';
    showNotification(message, 'info');
    console.log('Selected registration suggestion:', suggestion.vehicleRegistration, 'Frequency:', suggestion.frequency);
  };

  const handleVhcColorSelect = (color: 'green' | 'orange' | 'red') => {
    if (vhcColor === color) {
      setVhcColor(null);
      console.log('VHC color deselected');
    } else {
      setVhcColor(color);
      console.log('VHC color selected:', color);
    }
  };

  const getVhcColorValue = (color: 'green' | 'orange' | 'red'): string => {
    switch (color) {
      case 'green':
        return '#4CAF50';
      case 'orange':
        return '#FF9800';
      case 'red':
        return '#F44336';
    }
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
        const updatedJob: Job = {
          ...editingJob,
          wipNumber: wipNumber.trim(),
          vehicleRegistration: vehicleRegistration.trim().toUpperCase(),
          awValue,
          timeInMinutes,
          notes: notes.trim(),
          vhcColor: vhcColor,
          dateModified: new Date().toISOString(),
        };

        await StorageService.updateJob(updatedJob);
        showNotification('Job updated successfully!', 'success');
        console.log('Job updated:', updatedJob.wipNumber);
      } else {
        const newJob: Job = {
          id: Date.now().toString(),
          wipNumber: wipNumber.trim(),
          vehicleRegistration: vehicleRegistration.trim().toUpperCase(),
          awValue,
          timeInMinutes,
          notes: notes.trim(),
          vhcColor: vhcColor,
          dateCreated: new Date().toISOString(),
        };

        await StorageService.saveJob(newJob);
        
        // Check if this is a repeat job
        const combinationKey = `${newJob.wipNumber}|${newJob.vehicleRegistration}`;
        const isRepeat = jobIndexes.combinationMap.has(combinationKey);
        
        if (isRepeat) {
          const frequency = jobIndexes.combinationMap.get(combinationKey)!.frequency + 1;
          showNotification(`Repeat job saved! (${frequency}x total)`, 'success');
        } else {
          showNotification('Job saved successfully!', 'success');
        }
        
        console.log('New job saved:', newJob.wipNumber, 'Is repeat:', isRepeat);
      }

      setTimeout(() => {
        setWipNumber('');
        setVehicleRegistration('');
        setAwValue(1);
        setNotes('');
        setVhcColor(null);
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
            {/* WIP Number Input with Dropdown Suggestions */}
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
                onFocus={() => {
                  if (wipNumber.trim().length > 0) {
                    generateWipSuggestions(wipNumber);
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow tap on suggestion
                  setTimeout(() => setShowWipSuggestions(false), 200);
                }}
              />
              <Text style={styles.helperText}>Must be exactly 5 digits</Text>
              
              {/* WIP Suggestions Dropdown - appears directly below input */}
              {showWipSuggestions && wipSuggestions.length > 0 && (
                <View style={styles.suggestionsDropdown}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderText}>
                      Matching Jobs from Records
                    </Text>
                  </View>
                  <ScrollView 
                    style={styles.suggestionsScrollView}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {wipSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.suggestionItem,
                          index === wipSuggestions.length - 1 && styles.suggestionItemLast
                        ]}
                        onPress={() => selectWipSuggestion(suggestion)}
                      >
                        <View style={styles.suggestionContent}>
                          <View style={styles.suggestionMain}>
                            <View style={styles.suggestionTopRow}>
                              <Text style={styles.suggestionWip}>WIP: {suggestion.wipNumber}</Text>
                              {suggestion.frequency > 1 && (
                                <View style={styles.frequencyBadge}>
                                  <Text style={styles.frequencyText}>
                                    {suggestion.frequency}x
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.suggestionReg}>{suggestion.vehicleRegistration}</Text>
                          </View>
                          <View style={styles.suggestionDetails}>
                            <Text style={styles.suggestionAw}>{suggestion.awValue} AW{suggestion.awValue !== 1 ? 's' : ''}</Text>
                            <Text style={styles.suggestionDate}>{formatDate(suggestion.lastUsed)}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Vehicle Registration Input with Dropdown Suggestions */}
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
                onFocus={() => {
                  if (vehicleRegistration.trim().length > 0) {
                    generateRegSuggestions(vehicleRegistration);
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow tap on suggestion
                  setTimeout(() => setShowRegSuggestions(false), 200);
                }}
              />
              
              {/* Registration Suggestions Dropdown - appears directly below input */}
              {showRegSuggestions && regSuggestions.length > 0 && (
                <View style={styles.suggestionsDropdown}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderText}>
                      Matching Vehicles from Records
                    </Text>
                  </View>
                  <ScrollView 
                    style={styles.suggestionsScrollView}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {regSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.suggestionItem,
                          index === regSuggestions.length - 1 && styles.suggestionItemLast
                        ]}
                        onPress={() => selectRegSuggestion(suggestion)}
                      >
                        <View style={styles.suggestionContent}>
                          <View style={styles.suggestionMain}>
                            <View style={styles.suggestionTopRow}>
                              <Text style={styles.suggestionReg}>{suggestion.vehicleRegistration}</Text>
                              {suggestion.frequency > 1 && (
                                <View style={styles.frequencyBadge}>
                                  <Text style={styles.frequencyText}>
                                    {suggestion.frequency}x
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.suggestionWip}>WIP: {suggestion.wipNumber}</Text>
                          </View>
                          <View style={styles.suggestionDetails}>
                            <Text style={styles.suggestionAw}>{suggestion.awValue} AW{suggestion.awValue !== 1 ? 's' : ''}</Text>
                            <Text style={styles.suggestionDate}>{formatDate(suggestion.lastUsed)}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
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
                    <TouchableOpacity 
                      style={styles.modalOverlay}
                      activeOpacity={1}
                      onPress={() => setShowAwPicker(false)}
                    >
                      <TouchableOpacity 
                        style={styles.modalContent}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                      >
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
                          itemStyle={styles.iosPickerItem}
                        >
                          {Array.from({ length: 101 }, (_, i) => (
                            <Picker.Item 
                              key={i} 
                              label={`${i} AW${i !== 1 ? 's' : ''}`} 
                              value={i}
                            />
                          ))}
                        </Picker>
                      </TouchableOpacity>
                    </TouchableOpacity>
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
              <Text style={styles.label}>Vehicle Health Check (Optional)</Text>
              <Text style={styles.helperText}>Select a color to indicate vehicle condition</Text>
              <View style={styles.vhcContainer}>
                <TouchableOpacity
                  style={[
                    styles.vhcButton,
                    { backgroundColor: getVhcColorValue('green') },
                    vhcColor === 'green' && styles.vhcButtonSelected
                  ]}
                  onPress={() => handleVhcColorSelect('green')}
                >
                  <Text style={styles.vhcButtonText}>
                    {vhcColor === 'green' ? '✓' : ''} Green
                  </Text>
                  <Text style={styles.vhcButtonSubtext}>Good Condition</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.vhcButton,
                    { backgroundColor: getVhcColorValue('orange') },
                    vhcColor === 'orange' && styles.vhcButtonSelected
                  ]}
                  onPress={() => handleVhcColorSelect('orange')}
                >
                  <Text style={styles.vhcButtonText}>
                    {vhcColor === 'orange' ? '✓' : ''} Orange
                  </Text>
                  <Text style={styles.vhcButtonSubtext}>Needs Attention</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.vhcButton,
                    { backgroundColor: getVhcColorValue('red') },
                    vhcColor === 'red' && styles.vhcButtonSelected
                  ]}
                  onPress={() => handleVhcColorSelect('red')}
                >
                  <Text style={styles.vhcButtonText}>
                    {vhcColor === 'red' ? '✓' : ''} Red
                  </Text>
                  <Text style={styles.vhcButtonSubtext}>Urgent</Text>
                </TouchableOpacity>
              </View>
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
  vhcContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  vhcButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  vhcButtonSelected: {
    borderColor: '#ffffff',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  vhcButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  vhcButtonSubtext: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.9,
    textAlign: 'center',
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
  // Suggestions Dropdown Styles - appears below input
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 280,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 8,
    zIndex: 1000,
  },
  suggestionsHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  suggestionsHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsScrollView: {
    maxHeight: 240,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionMain: {
    flex: 1,
  },
  suggestionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionWip: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  suggestionReg: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  suggestionDetails: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  suggestionAw: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  frequencyBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  frequencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
