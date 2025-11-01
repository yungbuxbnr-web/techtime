
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { StorageService } from '../utils/storage';
import { CalculationService } from '../utils/calculations';
import { Job } from '../types';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';
import CameraModal from '../features/scan/CameraModal';
import ScanResultSheet from '../features/scan/ScanResultSheet';
import { scanRegistration, scanJobCard } from '../services/scan/pipeline';
import { isOCRConfigured, getOCRStatusMessage } from '../services/ocr';
import { ScanResult } from '../services/scan/pipeline';

interface JobSuggestion {
  wipNumber: string;
  vehicleRegistration: string;
  awValue: number;
  lastUsed: string;
  frequency: number;
  totalAWs: number;
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

  // Scanning state
  const [showRegCamera, setShowRegCamera] = useState(false);
  const [showJobCardCamera, setShowJobCardCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanResult, setShowScanResult] = useState(false);
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());

  const wipRef = useRef<TextInput>(null);
  const vehicleRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  
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

  const jobIndexes = useMemo(() => {
    const wipMap = new Map<string, JobSuggestion>();
    const regMap = new Map<string, JobSuggestion>();
    const combinationMap = new Map<string, JobSuggestion>();

    allJobs.forEach(job => {
      const combinationKey = `${job.wipNumber}|${job.vehicleRegistration.toUpperCase()}`;
      
      if (wipMap.has(job.wipNumber)) {
        const existing = wipMap.get(job.wipNumber)!;
        existing.frequency += 1;
        existing.totalAWs += job.awValue;
        if (new Date(job.dateCreated) > new Date(existing.lastUsed)) {
          existing.lastUsed = job.dateCreated;
          existing.awValue = job.awValue;
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
      
      const regKey = job.vehicleRegistration.toUpperCase();
      if (regMap.has(regKey)) {
        const existing = regMap.get(regKey)!;
        existing.frequency += 1;
        existing.totalAWs += job.awValue;
        if (new Date(job.dateCreated) > new Date(existing.lastUsed)) {
          existing.lastUsed = job.dateCreated;
          existing.wipNumber = job.wipNumber;
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

  const generateWipSuggestions = useCallback((input: string) => {
    if (wipDebounceTimer.current) {
      clearTimeout(wipDebounceTimer.current);
    }

    if (!input || input.trim().length === 0) {
      setWipSuggestions([]);
      setShowWipSuggestions(false);
      return;
    }

    wipDebounceTimer.current = setTimeout(() => {
      console.log('Generating WIP suggestions for:', input);
      const suggestions: JobSuggestion[] = [];
      
      const exactMatches: JobSuggestion[] = [];
      jobIndexes.combinationMap.forEach((suggestion, key) => {
        const [wip] = key.split('|');
        if (wip === input) {
          exactMatches.push(suggestion);
        }
      });

      if (exactMatches.length > 0) {
        exactMatches.sort((a, b) => {
          if (b.frequency !== a.frequency) {
            return b.frequency - a.frequency;
          }
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });
        suggestions.push(...exactMatches);
      }

      jobIndexes.wipMap.forEach((suggestion, wipNum) => {
        if (wipNum.startsWith(input) && wipNum !== input) {
          suggestions.push(suggestion);
        }
      });

      suggestions.sort((a, b) => {
        const aExact = a.wipNumber === input ? 1 : 0;
        const bExact = b.wipNumber === input ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      const topSuggestions = suggestions.slice(0, 5);
      setWipSuggestions(topSuggestions);
      setShowWipSuggestions(topSuggestions.length > 0);
      
      if (topSuggestions.length > 0) {
        console.log(`Found ${topSuggestions.length} WIP suggestions, top frequency: ${topSuggestions[0].frequency}x`);
      }
    }, 300);
  }, [jobIndexes.wipMap, jobIndexes.combinationMap]);

  const generateRegSuggestions = useCallback((input: string) => {
    if (regDebounceTimer.current) {
      clearTimeout(regDebounceTimer.current);
    }

    if (!input || input.trim().length === 0) {
      setRegSuggestions([]);
      setShowRegSuggestions(false);
      return;
    }

    regDebounceTimer.current = setTimeout(() => {
      console.log('Generating registration suggestions for:', input);
      const upperInput = input.toUpperCase();
      const suggestions: JobSuggestion[] = [];

      const exactMatches: JobSuggestion[] = [];
      jobIndexes.regMap.forEach((suggestion, regKey) => {
        if (regKey === upperInput) {
          exactMatches.push(suggestion);
        }
      });

      if (exactMatches.length > 0) {
        exactMatches.sort((a, b) => {
          if (b.frequency !== a.frequency) {
            return b.frequency - a.frequency;
          }
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });
        suggestions.push(...exactMatches);
      }

      jobIndexes.regMap.forEach((suggestion, regKey) => {
        if (regKey.includes(upperInput) && regKey !== upperInput) {
          suggestions.push(suggestion);
        }
      });

      suggestions.sort((a, b) => {
        const aExact = a.vehicleRegistration.toUpperCase() === upperInput ? 1 : 0;
        const bExact = b.vehicleRegistration.toUpperCase() === upperInput ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        const aStarts = a.vehicleRegistration.toUpperCase().startsWith(upperInput) ? 1 : 0;
        const bStarts = b.vehicleRegistration.toUpperCase().startsWith(upperInput) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      const topSuggestions = suggestions.slice(0, 5);
      setRegSuggestions(topSuggestions);
      setShowRegSuggestions(topSuggestions.length > 0);
      
      if (topSuggestions.length > 0) {
        console.log(`Found ${topSuggestions.length} registration suggestions, top frequency: ${topSuggestions[0].frequency}x`);
      }
    }, 300);
  }, [jobIndexes.regMap]);

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
    setUserEditedFields(prev => new Set(prev).add('wip'));
    generateWipSuggestions(text);
  };

  const handleVehicleRegistrationChange = (text: string) => {
    setVehicleRegistration(text);
    setUserEditedFields(prev => new Set(prev).add('reg'));
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

  // Scan Registration
  const handleScanReg = () => {
    if (!isOCRConfigured()) {
      Alert.alert(
        'OCR Not Configured',
        getOCRStatusMessage() + '\n\nYou can still enter the registration manually.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowRegCamera(true);
  };

  const handleRegCapture = async (uri: string) => {
    setShowRegCamera(false);
    setIsScanning(true);
    
    try {
      console.log('[AddJob] Scanning registration from:', uri);
      const result = await scanRegistration(uri);
      
      if (result.reg) {
        // Check if user has manually edited the field
        if (userEditedFields.has('reg') && vehicleRegistration.trim().length > 0) {
          Alert.alert(
            'Overwrite Registration?',
            `Replace "${vehicleRegistration}" with "${result.reg.value}"?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Replace',
                onPress: () => {
                  setVehicleRegistration(result.reg!.value);
                  showNotification('Registration updated from scan', 'success');
                },
              },
            ]
          );
        } else {
          setVehicleRegistration(result.reg.value);
          showNotification(
            `Registration detected: ${result.reg.value} (${Math.round(result.reg.confidence * 100)}% confidence)`,
            'success'
          );
        }
      } else {
        showNotification('No registration detected. Please try again or enter manually.', 'info');
      }
    } catch (error: any) {
      console.log('[AddJob] Error scanning registration:', error);
      
      if (error.message === 'OCR_OFFLINE') {
        Alert.alert(
          'No Internet Connection',
          'OCR requires an internet connection. Please check your connection and try again, or enter the registration manually.',
          [{ text: 'OK' }]
        );
      } else if (error.message === 'OCR_TIMEOUT') {
        Alert.alert(
          'Scan Timeout',
          'The scan took too long. Please try again with better lighting or enter manually.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Scan Failed',
          'Failed to scan registration. Please try again or enter manually.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Scan Job Card
  const handleScanJobCard = () => {
    if (!isOCRConfigured()) {
      Alert.alert(
        'OCR Not Configured',
        getOCRStatusMessage() + '\n\nYou can still enter the details manually.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Scan Job Card',
      'Choose how to scan the job card:',
      [
        {
          text: 'Take Photo',
          onPress: () => setShowJobCardCamera(true),
        },
        {
          text: 'Choose from Files',
          onPress: handlePickJobCardFile,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handlePickJobCardFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('[AddJob] Selected file:', uri);
        
        // Check if it's a PDF
        if (uri.toLowerCase().endsWith('.pdf')) {
          Alert.alert(
            'PDF Not Supported',
            'Please take a photo of the job card instead. PDF scanning is not yet supported.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        await handleJobCardCapture(uri);
      }
    } catch (error) {
      console.log('[AddJob] Error picking file:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const handleJobCardCapture = async (uri: string) => {
    setShowJobCardCamera(false);
    setIsScanning(true);
    
    try {
      console.log('[AddJob] Scanning job card from:', uri);
      const result = await scanJobCard(uri);
      
      if (result.reg || result.wip || result.jobNo) {
        setScanResult(result);
        setShowScanResult(true);
      } else {
        showNotification('No data detected. Please try again or enter manually.', 'info');
      }
    } catch (error: any) {
      console.log('[AddJob] Error scanning job card:', error);
      
      if (error.message === 'OCR_OFFLINE') {
        Alert.alert(
          'No Internet Connection',
          'OCR requires an internet connection. Please check your connection and try again, or enter the details manually.',
          [{ text: 'OK' }]
        );
      } else if (error.message === 'OCR_TIMEOUT') {
        Alert.alert(
          'Scan Timeout',
          'The scan took too long. Please try again with better lighting or enter manually.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Scan Failed',
          'Failed to scan job card. Please try again or enter manually.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyScanResult = (data: { reg?: string; wip?: string; jobNo?: string }) => {
    console.log('[AddJob] Applying scan result:', data);
    
    // Check for user-edited fields and confirm overwrite
    const fieldsToOverwrite: string[] = [];
    if (data.reg && userEditedFields.has('reg') && vehicleRegistration.trim().length > 0) {
      fieldsToOverwrite.push('Registration');
    }
    if (data.wip && userEditedFields.has('wip') && wipNumber.trim().length > 0) {
      fieldsToOverwrite.push('WIP Number');
    }
    
    if (fieldsToOverwrite.length > 0) {
      Alert.alert(
        'Overwrite Fields?',
        `You have manually edited: ${fieldsToOverwrite.join(', ')}. Do you want to replace with scanned values?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: () => {
              if (data.reg) setVehicleRegistration(data.reg);
              if (data.wip) setWipNumber(data.wip);
              showNotification('Job details updated from scan', 'success');
            },
          },
        ]
      );
    } else {
      if (data.reg) setVehicleRegistration(data.reg);
      if (data.wip) setWipNumber(data.wip);
      showNotification('Job details updated from scan', 'success');
    }
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
      
      {/* Camera Modals */}
      <CameraModal
        visible={showRegCamera}
        onClose={() => setShowRegCamera(false)}
        onCapture={handleRegCapture}
        title="Scan Registration"
        subtitle="Position the license plate in the frame"
      />
      
      <CameraModal
        visible={showJobCardCamera}
        onClose={() => setShowJobCardCamera(false)}
        onCapture={handleJobCardCapture}
        title="Scan Job Card"
        subtitle="Position the job card in the frame"
      />
      
      {/* Scan Result Sheet */}
      {scanResult && (
        <ScanResultSheet
          visible={showScanResult}
          onClose={() => setShowScanResult(false)}
          onApply={handleApplyScanResult}
          reg={scanResult.reg}
          wip={scanResult.wip}
          jobNo={scanResult.jobNo}
          allCandidates={scanResult.allCandidates}
        />
      )}
      
      {/* Scanning Overlay */}
      {isScanning && (
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.scanningText, { color: colors.text }]}>
              Processing scan...
            </Text>
          </View>
        </View>
      )}
      
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
            {/* WIP Number Input with Scan Button */}
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
                  setTimeout(() => setShowWipSuggestions(false), 200);
                }}
              />
              <Text style={styles.helperText}>Must be exactly 5 digits</Text>
              
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

            {/* Vehicle Registration Input with Scan Button */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Registration *</Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  ref={vehicleRef}
                  style={[styles.input, styles.inputWithIcon]}
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
                    setTimeout(() => setShowRegSuggestions(false), 200);
                  }}
                />
                <TouchableOpacity
                  style={styles.scanIconButton}
                  onPress={handleScanReg}
                >
                  <Text style={styles.scanIconText}>📷</Text>
                </TouchableOpacity>
              </View>
              
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

            {/* Scan Job Card Button */}
            <TouchableOpacity
              style={[styles.scanJobCardButton, { backgroundColor: colors.primary }]}
              onPress={handleScanJobCard}
            >
              <Text style={styles.scanJobCardButtonText}>📄 Scan Job Card</Text>
            </TouchableOpacity>

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
  inputWithButton: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: 56,
  },
  scanIconButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconText: {
    fontSize: 20,
  },
  scanJobCardButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scanJobCardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  scanningContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 16,
  },
  scanningText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});
