
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { PDFImportService } from '../utils/pdfImportService';
import { StorageService } from '../utils/storage';
import { PDFImportProgress, PDFImportResult } from '../types';
import NotificationToast from '../components/NotificationToast';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMP_IMPORT_KEY = '@pdf_import_temp_data';

export default function PDFImportScreen() {
  const { colors } = useTheme();
  const [progress, setProgress] = useState<PDFImportProgress>({
    status: 'idle',
    currentRow: 0,
    totalRows: 0,
    message: '',
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('');

  const handlePickPDF = useCallback(async () => {
    try {
      // Pick PDF file
      const pickResult = await PDFImportService.pickPDFFile();
      
      if (!pickResult.success || !pickResult.uri || !pickResult.name) {
        if (pickResult.message !== 'File selection cancelled') {
          setNotification({
            message: pickResult.message || 'Failed to pick PDF file',
            type: 'error',
          });
        }
        return;
      }

      // Start parsing
      setProgress({
        status: 'parsing',
        currentRow: 0,
        totalRows: 0,
        message: 'Loading PDF file...',
      });
      setCurrentStage('Text Layer Extraction');

      // Load existing jobs for de-duplication
      const existingJobs = await StorageService.getJobs();

      // Import and parse PDF
      const result: PDFImportResult = await PDFImportService.importFromPDF(
        pickResult.uri,
        pickResult.name,
        existingJobs,
        (progressUpdate) => {
          setProgress(progressUpdate);
          
          // Update stage based on progress
          if (progressUpdate.message.includes('hash')) {
            setCurrentStage('File Analysis');
          } else if (progressUpdate.message.includes('text layer')) {
            setCurrentStage('Text Layer Extraction');
          } else if (progressUpdate.message.includes('table')) {
            setCurrentStage('Table Detection');
          } else if (progressUpdate.message.includes('Parsing row')) {
            setCurrentStage('Data Parsing');
          }
        }
      );

      // Store result temporarily for preview screen
      await AsyncStorage.setItem(TEMP_IMPORT_KEY, JSON.stringify(result));

      setProgress({
        status: 'complete',
        currentRow: result.rows.length,
        totalRows: result.rows.length,
        message: 'Parsing complete!',
      });

      // Always navigate to preview, even if no rows found
      if (result.rows.length === 0) {
        Alert.alert(
          'No Data Found',
          `Could not extract job data from the PDF.\n\n` +
          `Rows found: ${result.summary.totalRows}\n` +
          `Valid rows: ${result.summary.validRows}\n\n` +
          `You can view the detailed parse log to understand what went wrong.`,
          [
            {
              text: 'View Log',
              onPress: () => {
                router.push('/pdf-import-preview');
              },
            },
            {
              text: 'Try Again',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Show summary and navigate
        const confidence = result.rows.reduce((sum, r) => sum + r.confidence, 0) / result.rows.length;
        
        Alert.alert(
          'PDF Parsed Successfully',
          `Found ${result.rows.length} job records:\n\n` +
          `• Valid rows: ${result.summary.validRows}\n` +
          `• Invalid rows: ${result.summary.invalidRows}\n` +
          `• Duplicates: ${result.summary.duplicates}\n` +
          `• Confidence: ${(confidence * 100).toFixed(0)}%\n\n` +
          'Review and edit the data before importing.',
          [
            {
              text: 'Review',
              onPress: () => {
                router.push('/pdf-import-preview');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[PDF Import] Error importing PDF:', error);
      setProgress({
        status: 'error',
        currentRow: 0,
        totalRows: 0,
        message: 'An error occurred',
      });
      setNotification({
        message: error instanceof Error ? error.message : 'Failed to import PDF',
        type: 'error',
      });
    }
  }, []);

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'idle':
        return '📄';
      case 'parsing':
        return '⚙️';
      case 'preview':
        return '👁️';
      case 'importing':
        return '📥';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📄';
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'idle':
        return 'Ready to import';
      case 'parsing':
        return 'Parsing PDF...';
      case 'preview':
        return 'Review data';
      case 'importing':
        return 'Importing jobs...';
      case 'complete':
        return 'Import complete!';
      case 'error':
        return 'Import failed';
      default:
        return 'Ready';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Import PDF → Jobs</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardIcon, { color: colors.primary }]}>{getStatusIcon()}</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{getStatusText()}</Text>
          
          {progress.status === 'idle' && (
            <>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                Upload a technician PDF to automatically create or update multiple job records.
              </Text>

              <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Expected PDF Format:</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  • WIP Number (5 digits){'\n'}
                  • Vehicle Registration (UK plate){'\n'}
                  • VHC Status (Red/Orange/Green/N/A){'\n'}
                  • Job Description{'\n'}
                  • AWS (numeric){'\n'}
                  • Work Time (e.g., "2h 0m"){'\n'}
                  • Job Date (DD/MM/YYYY){'\n'}
                  • Job Time (HH:mm)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handlePickPDF}
              >
                <Text style={styles.buttonText}>📄 Select PDF File</Text>
              </TouchableOpacity>
            </>
          )}

          {progress.status === 'parsing' && (
            <>
              <View style={[styles.stageCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.stageTitle, { color: colors.text }]}>Current Stage:</Text>
                <Text style={[styles.stageName, { color: colors.primary }]}>{currentStage}</Text>
              </View>
              
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              
              <Text style={[styles.progressText, { color: colors.text }]}>
                {progress.message}
              </Text>
              
              {progress.totalRows > 0 && (
                <>
                  <Text style={[styles.progressDetail, { color: colors.textSecondary }]}>
                    Processing row {progress.currentRow} of {progress.totalRows}
                  </Text>
                  
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${(progress.currentRow / progress.totalRows) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </>
              )}
            </>
          )}

          {progress.status === 'complete' && (
            <>
              <Text style={[styles.successText, { color: '#4CAF50' }]}>
                {progress.message}
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handlePickPDF}
              >
                <Text style={styles.buttonText}>Import Another PDF</Text>
              </TouchableOpacity>
            </>
          )}

          {progress.status === 'error' && (
            <>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {progress.message}
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handlePickPDF}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[styles.pipelineCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.pipelineTitle, { color: colors.text }]}>Multi-Stage Pipeline:</Text>
          <View style={styles.pipelineStages}>
            <View style={styles.pipelineStage}>
              <Text style={[styles.pipelineStageNumber, { color: colors.primary }]}>1</Text>
              <View style={styles.pipelineStageContent}>
                <Text style={[styles.pipelineStageName, { color: colors.text }]}>Text Layer</Text>
                <Text style={[styles.pipelineStageDesc, { color: colors.textSecondary }]}>
                  Extract text from PDF vector layer
                </Text>
              </View>
            </View>
            
            <View style={styles.pipelineStage}>
              <Text style={[styles.pipelineStageNumber, { color: colors.primary }]}>2</Text>
              <View style={styles.pipelineStageContent}>
                <Text style={[styles.pipelineStageName, { color: colors.text }]}>Table Detection</Text>
                <Text style={[styles.pipelineStageDesc, { color: colors.textSecondary }]}>
                  Identify and parse table rows
                </Text>
              </View>
            </View>
            
            <View style={styles.pipelineStage}>
              <Text style={[styles.pipelineStageNumber, { color: colors.primary }]}>3</Text>
              <View style={styles.pipelineStageContent}>
                <Text style={[styles.pipelineStageName, { color: colors.text }]}>Data Parsing</Text>
                <Text style={[styles.pipelineStageDesc, { color: colors.textSecondary }]}>
                  Extract and validate fields
                </Text>
              </View>
            </View>
            
            <View style={styles.pipelineStage}>
              <Text style={[styles.pipelineStageNumber, { color: colors.primary }]}>4</Text>
              <View style={styles.pipelineStageContent}>
                <Text style={[styles.pipelineStageName, { color: colors.text }]}>Preview</Text>
                <Text style={[styles.pipelineStageDesc, { color: colors.textSecondary }]}>
                  Review and edit before import
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Features:</Text>
          <View style={styles.featuresList}>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Automatic data extraction from PDF tables
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Multi-line cell handling
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Split time value merging
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ OCR typo correction
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Confidence scoring for each row
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ De-duplication and update detection
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Editable preview before import
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Bulk editing tools
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ UK plate validation
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Timezone-aware date parsing
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Detailed parse logs
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ CSV export of parsed data
            </Text>
          </View>
        </View>
      </ScrollView>

      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onHide={() => setNotification(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoBox: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 200,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  stageCard: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  stageTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stageName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 24,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  progressDetail: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  pipelineCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pipelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pipelineStages: {
    gap: 16,
  },
  pipelineStage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pipelineStageNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  pipelineStageContent: {
    flex: 1,
  },
  pipelineStageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pipelineStageDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    lineHeight: 20,
  },
});
