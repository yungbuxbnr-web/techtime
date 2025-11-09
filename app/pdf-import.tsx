
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { PDFImportService } from '../utils/pdfImportService';
import { StorageService } from '../utils/storage';
import { PDFImportProgress } from '../types';
import NotificationToast from '../components/NotificationToast';

export default function PDFImportScreen() {
  const { colors } = useTheme();
  const [progress, setProgress] = useState<PDFImportProgress>({
    status: 'idle',
    currentRow: 0,
    totalRows: 0,
    message: '',
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

      // Load existing jobs for de-duplication
      const existingJobs = await StorageService.getJobs();

      // Import and parse PDF
      const result = await PDFImportService.importFromPDF(
        pickResult.uri,
        pickResult.name,
        existingJobs,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      if (!result.success || result.rows.length === 0) {
        setProgress({
          status: 'error',
          currentRow: 0,
          totalRows: 0,
          message: 'Failed to parse PDF',
        });

        Alert.alert(
          'Import Failed',
          'Could not extract job data from the PDF.\n\n' +
          'Please ensure the PDF contains a table with the following columns:\n' +
          '• WIP Number (5 digits)\n' +
          '• Vehicle Registration (UK format)\n' +
          '• VHC Status (Red/Orange/Green/N/A)\n' +
          '• Job Description\n' +
          '• AWS (numeric)\n' +
          '• Work Time (e.g., "2h 0m")\n' +
          '• Job Date (DD/MM/YYYY)\n' +
          '• Job Time (HH:mm)\n\n' +
          'For best results, use a text-based PDF (not scanned images).',
          [
            {
              text: 'View Log',
              onPress: async () => {
                try {
                  const logUri = await PDFImportService.exportParseLog(
                    result.parseLog,
                    pickResult.name
                  );
                  Alert.alert('Parse Log', `Log saved to: ${logUri}`);
                } catch (error) {
                  console.error('Error exporting log:', error);
                }
              },
            },
            { text: 'OK' },
          ]
        );
        return;
      }

      // Store result temporarily and navigate to preview
      // In a real implementation, you'd use a state management solution
      // For now, we'll pass the data through navigation params (limited by size)
      
      setProgress({
        status: 'complete',
        currentRow: result.rows.length,
        totalRows: result.rows.length,
        message: 'Parsing complete!',
      });

      // Show summary
      Alert.alert(
        'PDF Parsed Successfully',
        `Found ${result.rows.length} job records:\n\n` +
        `• Valid rows: ${result.summary.validRows}\n` +
        `• Invalid rows: ${result.summary.invalidRows}\n` +
        `• Duplicates: ${result.summary.duplicates}\n\n` +
        'Review and edit the data before importing.',
        [
          {
            text: 'Review',
            onPress: () => {
              // Navigate to preview screen
              // Note: In production, you'd store this in AsyncStorage or context
              router.push('/pdf-import-preview');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error importing PDF:', error);
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

      <View style={styles.content}>
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
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              <Text style={[styles.progressText, { color: colors.text }]}>
                {progress.message}
              </Text>
              {progress.totalRows > 0 && (
                <Text style={[styles.progressDetail, { color: colors.textSecondary }]}>
                  Processing row {progress.currentRow} of {progress.totalRows}
                </Text>
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

        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Features:</Text>
          <View style={styles.featuresList}>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Automatic data extraction from PDF tables
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Multi-column page detection
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
          </View>
        </View>
      </View>

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
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
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
  featuresCard: {
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
