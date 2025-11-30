
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator, Platform } from 'react-native';
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
      setResult({
        success: false,
        message: error?.message || 'Import failed',
        imported: 0,
        skipped: 0,
        errors: 1,
        details: [error?.message || 'Unknown error', error?.stack || ''],
      });
      setShowResultModal(true);
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
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Import Jobs</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📥 Import from JSON</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Import job records from a JSON file. The file must be in the correct format with a &quot;jobs&quot; array.
          </Text>

          <View style={[styles.instructionsCard, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
            <Text style={[styles.instructionTitle, { color: colors.text }]}>✅ Required JSON Format:</Text>
            <View style={[styles.codeBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.codeText, { color: colors.text }]}>{`{
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

            <Text style={[styles.instructionTitle, { color: colors.text }]}>📋 Field Descriptions:</Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              • <Text style={[styles.bold, { color: colors.text }]}>wipNumber</Text>: Work in progress number (required)
            </Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              • <Text style={[styles.bold, { color: colors.text }]}>vehicleReg</Text>: Vehicle registration (required)
            </Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              • <Text style={[styles.bold, { color: colors.text }]}>aws</Text>: AW value as number (required)
            </Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              • <Text style={[styles.bold, { color: colors.text }]}>vhcStatus</Text>: RED, ORANGE, GREEN, or NONE
            </Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              • <Text style={[styles.bold, { color: colors.text }]}>description</Text>: Job description (optional)
            </Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              • <Text style={[styles.bold, { color: colors.text }]}>jobDateTime</Text>: ISO date string (optional)
            </Text>
          </View>
        </View>

        {/* Import Limits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Import Information</Text>
          <View style={[styles.limitsCard, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>• Maximum 1000 jobs per import</Text>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>• Duplicate WIP numbers are allowed</Text>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>• Same job can be imported multiple times</Text>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>• Invalid jobs will be reported in the summary</Text>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>• Import process shows real-time progress</Text>
          </View>
        </View>

        {/* Import Button */}
        {!importing && !progress && (
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: colors.primary }]}
            onPress={handleImport}
          >
            <Text style={styles.importButtonText}>📂 Select JSON File to Import</Text>
          </TouchableOpacity>
        )}

        {/* Progress Display */}
        {importing && progress && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>⏳ Import Progress</Text>
            
            <View style={[styles.progressCard, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressStatus, { color: colors.primary }]}>{progress.status.toUpperCase()}</Text>
                <Text style={[styles.progressPercentage, { color: colors.primary }]}>{getProgressPercentage()}%</Text>
              </View>

              <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${getProgressPercentage()}%`, backgroundColor: colors.primary }
                  ]} 
                />
              </View>

              <Text style={[styles.progressMessage, { color: colors.text }]}>{progress.message}</Text>

              {progress.currentJobData && (
                <View style={[styles.currentJobCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.currentJobTitle, { color: colors.text }]}>Current Job:</Text>
                  <Text style={[styles.currentJobText, { color: colors.textSecondary }]}>WIP: {progress.currentJobData.wipNumber}</Text>
                  <Text style={[styles.currentJobText, { color: colors.textSecondary }]}>Reg: {progress.currentJobData.vehicleReg}</Text>
                  <Text style={[styles.currentJobText, { color: colors.textSecondary }]}>AWs: {progress.currentJobData.aws}</Text>
                </View>
              )}

              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressStatLabel, { color: colors.textSecondary }]}>Current</Text>
                  <Text style={[styles.progressStatValue, { color: colors.primary }]}>{progress.currentJob}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressStatLabel, { color: colors.textSecondary }]}>Total</Text>
                  <Text style={[styles.progressStatValue, { color: colors.primary }]}>{progress.totalJobs}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressStatLabel, { color: colors.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.progressStatValue, { color: colors.primary }]}>{progress.totalJobs - progress.currentJob}</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {result?.success ? '✅ Import Complete' : '❌ Import Failed'}
              </Text>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {result && (
                <>
                  <View style={[styles.resultSummary, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text }]}>Imported:</Text>
                      <Text style={[styles.resultValue, { color: '#10b981' }]}>
                        {result.imported}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text }]}>Skipped:</Text>
                      <Text style={[styles.resultValue, { color: '#f59e0b' }]}>
                        {result.skipped}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text }]}>Errors:</Text>
                      <Text style={[styles.resultValue, { color: '#ef4444' }]}>
                        {result.errors}
                      </Text>
                    </View>
                  </View>

                  {result.details.length > 0 && (
                    <View style={[styles.detailsSection, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
                      <Text style={[styles.detailsTitle, { color: colors.text }]}>Details:</Text>
                      {result.details.slice(0, 20).map((detail, index) => (
                        <Text key={index} style={[styles.detailText, { color: colors.textSecondary }]}>
                          {detail}
                        </Text>
                      ))}
                      {result.details.length > 20 && (
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          ... and {result.details.length - 20} more
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  instructionsCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
  },
  codeBlock: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  limitsCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  limitText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  importButton: {
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
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
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
    letterSpacing: 1,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
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
    marginBottom: 16,
    fontWeight: '500',
  },
  currentJobCard: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  currentJobTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentJobText: {
    fontSize: 12,
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
    marginBottom: 4,
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  resultSummary: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailsSection: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 18,
  },
  modalButton: {
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
