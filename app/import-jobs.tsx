
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ImportService, ImportProgress, ImportResult } from '../utils/importService';
import NotificationToast from '../components/NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

export default function ImportJobsScreen() {
  const { colors } = useTheme();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as const });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ visible: true, message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const handleImport = async () => {
    try {
      setImporting(true);
      setProgress(null);
      setResult(null);

      console.log('[Import] Starting import process...');

      const importResult = await ImportService.pickAndImportJSON((progressData) => {
        setProgress(progressData);
        console.log('[Import] Progress:', progressData);
      });

      setResult(importResult);
      setImporting(false);

      if (importResult.success) {
        setShowResultModal(true);
        showNotification(importResult.message, 'success');
      } else {
        setShowResultModal(true);
        showNotification(importResult.message, 'error');
      }

      console.log('[Import] Import complete:', importResult);
    } catch (error: any) {
      console.error('[Import] Import error:', error);
      setImporting(false);
      showNotification(error?.message || 'Import failed', 'error');
    }
  };

  const handleCloseResult = () => {
    setShowResultModal(false);
    if (result?.success && result.imported > 0) {
      // Navigate back to jobs screen to see imported jobs
      router.replace('/jobs');
    }
  };

  const getProgressPercentage = () => {
    if (!progress || progress.totalJobs === 0) return 0;
    return Math.round((progress.currentJob / progress.totalJobs) * 100);
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
        <Text style={[styles.title, { color: colors.text }]}>Import Jobs</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📥 Import from JSON</Text>
          <Text style={styles.sectionDescription}>
            Import job records from a JSON file. The file must be in the correct format with a &quot;jobs&quot; array.
          </Text>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionTitle}>✅ Required JSON Format:</Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{`{
  "jobs": [
    {
      "wipNumber": "26933",
      "vehicleReg": "WA70XYH",
      "vhcStatus": "NONE",
      "description": "All discs and pads",
      "aws": 24,
      "jobDateTime": "2025-11-28T16:18:00.000Z"
    }
  ]
}`}</Text>
            </View>

            <Text style={styles.instructionTitle}>📋 Field Descriptions:</Text>
            <Text style={styles.instructionText}>• <Text style={styles.bold}>wipNumber</Text>: Work in progress number (required)</Text>
            <Text style={styles.instructionText}>• <Text style={styles.bold}>vehicleReg</Text>: Vehicle registration (required)</Text>
            <Text style={styles.instructionText}>• <Text style={styles.bold}>aws</Text>: AW value as number (required)</Text>
            <Text style={styles.instructionText}>• <Text style={styles.bold}>vhcStatus</Text>: RED, ORANGE, GREEN, or NONE</Text>
            <Text style={styles.instructionText}>• <Text style={styles.bold}>description</Text>: Job description (optional)</Text>
            <Text style={styles.instructionText}>• <Text style={styles.bold}>jobDateTime</Text>: ISO date string (optional)</Text>
          </View>
        </View>

        {/* Import Limits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Import Limits</Text>
          <View style={styles.limitsCard}>
            <Text style={styles.limitText}>• Maximum 1000 jobs per import</Text>
            <Text style={styles.limitText}>• Duplicate WIP numbers will be skipped</Text>
            <Text style={styles.limitText}>• Invalid jobs will be reported in the summary</Text>
            <Text style={styles.limitText}>• Import process shows real-time progress</Text>
          </View>
        </View>

        {/* Import Button */}
        {!importing && !progress && (
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImport}
          >
            <Text style={styles.importButtonText}>📂 Select JSON File to Import</Text>
          </TouchableOpacity>
        )}

        {/* Progress Display */}
        {importing && progress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ Import Progress</Text>
            
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressStatus}>{progress.status.toUpperCase()}</Text>
                <Text style={styles.progressPercentage}>{getProgressPercentage()}%</Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${getProgressPercentage()}%`, backgroundColor: colors.primary }
                  ]} 
                />
              </View>

              <Text style={styles.progressMessage}>{progress.message}</Text>

              {progress.currentJobData && (
                <View style={styles.currentJobCard}>
                  <Text style={styles.currentJobTitle}>Current Job:</Text>
                  <Text style={styles.currentJobText}>WIP: {progress.currentJobData.wipNumber}</Text>
                  <Text style={styles.currentJobText}>Reg: {progress.currentJobData.vehicleReg}</Text>
                  <Text style={styles.currentJobText}>AWs: {progress.currentJobData.aws}</Text>
                </View>
              )}

              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Current</Text>
                  <Text style={styles.progressStatValue}>{progress.currentJob}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Total</Text>
                  <Text style={styles.progressStatValue}>{progress.totalJobs}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Remaining</Text>
                  <Text style={styles.progressStatValue}>{progress.totalJobs - progress.currentJob}</Text>
                </View>
              </View>

              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseResult}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {result?.success ? '✅ Import Complete' : '❌ Import Failed'}
              </Text>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {result && (
                <>
                  <View style={styles.resultSummary}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Imported:</Text>
                      <Text style={[styles.resultValue, { color: colors.success }]}>
                        {result.imported}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Skipped:</Text>
                      <Text style={[styles.resultValue, { color: colors.warning }]}>
                        {result.skipped}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Errors:</Text>
                      <Text style={[styles.resultValue, { color: colors.error }]}>
                        {result.errors}
                      </Text>
                    </View>
                  </View>

                  {result.details.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsTitle}>Details:</Text>
                      {result.details.slice(0, 20).map((detail, index) => (
                        <Text key={index} style={styles.detailText}>
                          {detail}
                        </Text>
                      ))}
                      {result.details.length > 20 && (
                        <Text style={styles.detailText}>
                          ... and {result.details.length - 20} more
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseResult}
            >
              <Text style={styles.modalButtonText}>
                {result?.success && result.imported > 0 ? 'View Jobs' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  instructionsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  instructionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
    color: colors.text,
  },
  codeBlock: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: colors.text,
    lineHeight: 16,
  },
  limitsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  importButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.3)',
    elevation: 4,
  },
  importButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressStatus: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressMessage: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
    fontWeight: '500',
  },
  currentJobCard: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentJobTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  currentJobText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
    elevation: 8,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  resultSummary: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailsSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
