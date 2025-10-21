
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { StorageService } from '../utils/storage';
import NotificationToast from '../components/NotificationToast';

interface FormulaSettings {
  awToMinutes: number; // 1 AW = X minutes (default 5)
  hoursPerDay: number; // Working hours per day (default 8.5)
  targetAWsPerHour: number; // Target AWs per hour (default 12)
  efficiencyGreenThreshold: number; // Green efficiency threshold (default 65)
  efficiencyYellowThreshold: number; // Yellow efficiency threshold (default 31)
}

export default function MetricsScreen() {
  const { colors } = useTheme();
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });
  
  // Formula settings
  const [awToMinutes, setAwToMinutes] = useState('5');
  const [hoursPerDay, setHoursPerDay] = useState('8.5');
  const [targetAWsPerHour, setTargetAWsPerHour] = useState('12');
  const [efficiencyGreenThreshold, setEfficiencyGreenThreshold] = useState('65');
  const [efficiencyYellowThreshold, setEfficiencyYellowThreshold] = useState('31');

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadFormulas = useCallback(async () => {
    try {
      const settings = await StorageService.getSettings();
      const formulas = settings.formulas || {};
      
      setAwToMinutes(String(formulas.awToMinutes || 5));
      setHoursPerDay(String(formulas.hoursPerDay || 8.5));
      setTargetAWsPerHour(String(formulas.targetAWsPerHour || 12));
      setEfficiencyGreenThreshold(String(formulas.efficiencyGreenThreshold || 65));
      setEfficiencyYellowThreshold(String(formulas.efficiencyYellowThreshold || 31));
      
      console.log('Formulas loaded successfully');
    } catch (error) {
      console.log('Error loading formulas:', error);
      showNotification('Error loading formulas', 'error');
    }
  }, [showNotification]);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const settings = await StorageService.getSettings();
      if (!settings.isAuthenticated) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }
      await loadFormulas();
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/auth');
    }
  }, [loadFormulas]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleSaveFormulas = useCallback(async () => {
    try {
      // Validate inputs
      const awToMin = parseFloat(awToMinutes);
      const hoursDay = parseFloat(hoursPerDay);
      const targetAWs = parseFloat(targetAWsPerHour);
      const greenThreshold = parseFloat(efficiencyGreenThreshold);
      const yellowThreshold = parseFloat(efficiencyYellowThreshold);

      if (isNaN(awToMin) || awToMin <= 0) {
        showNotification('AW to Minutes must be a positive number', 'error');
        return;
      }

      if (isNaN(hoursDay) || hoursDay <= 0 || hoursDay > 24) {
        showNotification('Hours per day must be between 0 and 24', 'error');
        return;
      }

      if (isNaN(targetAWs) || targetAWs <= 0) {
        showNotification('Target AWs per hour must be a positive number', 'error');
        return;
      }

      if (isNaN(greenThreshold) || greenThreshold < 0 || greenThreshold > 100) {
        showNotification('Green threshold must be between 0 and 100', 'error');
        return;
      }

      if (isNaN(yellowThreshold) || yellowThreshold < 0 || yellowThreshold > 100) {
        showNotification('Yellow threshold must be between 0 and 100', 'error');
        return;
      }

      if (yellowThreshold >= greenThreshold) {
        showNotification('Yellow threshold must be less than green threshold', 'error');
        return;
      }

      // Save formulas
      const settings = await StorageService.getSettings();
      const updatedSettings = {
        ...settings,
        formulas: {
          awToMinutes: awToMin,
          hoursPerDay: hoursDay,
          targetAWsPerHour: targetAWs,
          efficiencyGreenThreshold: greenThreshold,
          efficiencyYellowThreshold: yellowThreshold,
        }
      };

      await StorageService.saveSettings(updatedSettings);
      
      showNotification('Formulas saved successfully! Please restart the app for changes to take effect.', 'success');
      console.log('Formulas saved successfully');
    } catch (error) {
      console.log('Error saving formulas:', error);
      showNotification('Error saving formulas', 'error');
    }
  }, [awToMinutes, hoursPerDay, targetAWsPerHour, efficiencyGreenThreshold, efficiencyYellowThreshold, showNotification]);

  const handleResetToDefaults = useCallback(() => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all formulas to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setAwToMinutes('5');
            setHoursPerDay('8.5');
            setTargetAWsPerHour('12');
            setEfficiencyGreenThreshold('65');
            setEfficiencyYellowThreshold('31');
            showNotification('Formulas reset to defaults. Tap Save to apply.', 'info');
          }
        }
      ]
    );
  }, [showNotification]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[commonStyles.title, { color: colors.text }]}>Metrics & Formulas</Text>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📐 Formula Editor</Text>
          <Text style={styles.sectionDescription}>
            Customize the calculation formulas used throughout the app. Changes will take effect after restarting the app.
          </Text>
        </View>

        {/* AW Conversion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ AW Time Conversion</Text>
          <Text style={styles.sectionDescription}>
            Define how many minutes equal one AW (Allocated Work unit).
          </Text>
          
          <Text style={styles.label}>1 AW = X Minutes</Text>
          <TextInput
            style={styles.input}
            value={awToMinutes}
            onChangeText={setAwToMinutes}
            placeholder="5"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
          
          <View style={styles.formulaBox}>
            <Text style={styles.formulaTitle}>Current Formula:</Text>
            <Text style={styles.formulaText}>1 AW = {awToMinutes || '5'} minutes</Text>
            <Text style={styles.formulaText}>1 AW = {((parseFloat(awToMinutes) || 5) / 60).toFixed(4)} hours</Text>
            <Text style={styles.exampleText}>
              Example: 100 AWs = {(parseFloat(awToMinutes) || 5) * 100} minutes = {(((parseFloat(awToMinutes) || 5) * 100) / 60).toFixed(2)} hours
            </Text>
          </View>
        </View>

        {/* Working Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Working Hours per Day</Text>
          <Text style={styles.sectionDescription}>
            Set the standard working hours per day for availability calculations.
          </Text>
          
          <Text style={styles.label}>Hours per Working Day</Text>
          <TextInput
            style={styles.input}
            value={hoursPerDay}
            onChangeText={setHoursPerDay}
            placeholder="8.5"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
          
          <View style={styles.formulaBox}>
            <Text style={styles.formulaTitle}>Current Formula:</Text>
            <Text style={styles.formulaText}>Working Day = {hoursPerDay || '8.5'} hours</Text>
            <Text style={styles.formulaText}>Working Week = {((parseFloat(hoursPerDay) || 8.5) * 5).toFixed(2)} hours (5 days)</Text>
            <Text style={styles.exampleText}>
              Example: 22 working days = {((parseFloat(hoursPerDay) || 8.5) * 22).toFixed(2)} hours
            </Text>
          </View>
        </View>

        {/* Target AWs per Hour */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Target Performance</Text>
          <Text style={styles.sectionDescription}>
            Set the target number of AWs to complete per hour for performance tracking.
          </Text>
          
          <Text style={styles.label}>Target AWs per Hour</Text>
          <TextInput
            style={styles.input}
            value={targetAWsPerHour}
            onChangeText={setTargetAWsPerHour}
            placeholder="12"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
          
          <View style={styles.formulaBox}>
            <Text style={styles.formulaTitle}>Current Formula:</Text>
            <Text style={styles.formulaText}>Target = {targetAWsPerHour || '12'} AWs per hour</Text>
            <Text style={styles.formulaText}>Daily Target = {((parseFloat(targetAWsPerHour) || 12) * (parseFloat(hoursPerDay) || 8.5)).toFixed(2)} AWs</Text>
            <Text style={styles.exampleText}>
              Example: In an 8.5 hour day, target is {((parseFloat(targetAWsPerHour) || 12) * 8.5).toFixed(0)} AWs
            </Text>
          </View>
        </View>

        {/* Efficiency Thresholds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Efficiency Color Thresholds</Text>
          <Text style={styles.sectionDescription}>
            Define the efficiency percentage thresholds for color coding (Green = Excellent, Yellow = Average, Red = Needs Improvement).
          </Text>
          
          <Text style={styles.label}>Green Threshold (Excellent) %</Text>
          <TextInput
            style={styles.input}
            value={efficiencyGreenThreshold}
            onChangeText={setEfficiencyGreenThreshold}
            placeholder="65"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
          
          <Text style={styles.label}>Yellow Threshold (Average) %</Text>
          <TextInput
            style={styles.input}
            value={efficiencyYellowThreshold}
            onChangeText={setEfficiencyYellowThreshold}
            placeholder="31"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
          
          <View style={styles.formulaBox}>
            <Text style={styles.formulaTitle}>Current Thresholds:</Text>
            <View style={styles.thresholdRow}>
              <View style={[styles.colorBox, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.formulaText}>Green (Excellent): {efficiencyGreenThreshold || '65'}% - 100%</Text>
            </View>
            <View style={styles.thresholdRow}>
              <View style={[styles.colorBox, { backgroundColor: '#FFC107' }]} />
              <Text style={styles.formulaText}>Yellow (Average): {efficiencyYellowThreshold || '31'}% - {(parseFloat(efficiencyGreenThreshold) || 65) - 1}%</Text>
            </View>
            <View style={styles.thresholdRow}>
              <View style={[styles.colorBox, { backgroundColor: '#F44336' }]} />
              <Text style={styles.formulaText}>Red (Needs Improvement): 0% - {(parseFloat(efficiencyYellowThreshold) || 31) - 1}%</Text>
            </View>
          </View>
        </View>

        {/* Efficiency Calculation Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧮 Efficiency Calculation</Text>
          <Text style={styles.sectionDescription}>
            Understanding how efficiency is calculated in the app.
          </Text>
          
          <View style={styles.formulaBox}>
            <Text style={styles.formulaTitle}>Formula:</Text>
            <Text style={styles.formulaText}>Efficiency % = (Total Sold Hours / Total Available Hours) × 100</Text>
            <Text style={styles.formulaTitle} style={{ marginTop: 12 }}>Where:</Text>
            <Text style={styles.formulaText}>• Total Sold Hours = Total AWs × (1 AW in hours)</Text>
            <Text style={styles.formulaText}>• Total Available Hours = Weekdays × Hours per Day - Absence Hours</Text>
            <Text style={styles.formulaText}>• Weekdays = Monday to Friday only</Text>
            <Text style={styles.exampleText} style={{ marginTop: 12 }}>
              Example: If you completed 1000 AWs in a month with 20 working days:
              {'\n'}• Sold Hours = 1000 × {((parseFloat(awToMinutes) || 5) / 60).toFixed(4)} = {(1000 * ((parseFloat(awToMinutes) || 5) / 60)).toFixed(2)} hours
              {'\n'}• Available Hours = 20 × {hoursPerDay || '8.5'} = {(20 * (parseFloat(hoursPerDay) || 8.5)).toFixed(2)} hours
              {'\n'}• Efficiency = ({(1000 * ((parseFloat(awToMinutes) || 5) / 60)).toFixed(2)} / {(20 * (parseFloat(hoursPerDay) || 8.5)).toFixed(2)}) × 100 = {((1000 * ((parseFloat(awToMinutes) || 5) / 60)) / (20 * (parseFloat(hoursPerDay) || 8.5)) * 100).toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveFormulas}>
            <Text style={styles.buttonText}>💾 Save Formulas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={handleResetToDefaults}>
            <Text style={styles.buttonText}>🔄 Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Warning */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Important Notes:</Text>
          <Text style={styles.warningText}>
            - Changes to formulas will affect all calculations throughout the app
          </Text>
          <Text style={styles.warningText}>
            - You must restart the app for changes to take full effect
          </Text>
          <Text style={styles.warningText}>
            - Historical data will be recalculated using new formulas
          </Text>
          <Text style={styles.warningText}>
            - Default values are based on standard industry practices
          </Text>
          <Text style={styles.warningText}>
            - Use "Reset to Defaults" if you encounter calculation issues
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
});

const createStyles = (colors: any) => StyleSheet.create({
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
  section: {
    marginBottom: 24,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
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
    marginBottom: 16,
  },
  formulaBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formulaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formulaText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  exampleText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  resetButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 4,
    lineHeight: 18,
  },
});
