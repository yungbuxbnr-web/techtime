
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { StorageService } from '../utils/storage';
import NotificationToast from '../components/NotificationToast';
import * as DocumentPicker from 'expo-document-picker';
import {
  parseTechRecordsPdf,
  isDuplicateJob,
  convertJobInputToJob,
  JobInput,
} from '../src/services/pdfImportService';

export default function PDFImportScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handlePickAndImportPDF = useCallback(async () => {
    try {
      setLoading(true);
      setProgress('Selecting PDF file...');
      
      // Pick PDF file
      console.log('[PDF Import] Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[PDF Import] Document picker cancelled');
        setLoading(false);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        setNotification({
          message: 'No file selected',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const file = result.assets[0];
      console.log('[PDF Import] PDF file selected:', file.name, file.uri);
      
      setProgress('Parsing PDF...');
      
      // Parse PDF using centralized service
      const jobs: JobInput[] = await parseTechRecordsPdf(file.uri);
      
      console.log('[PDF Import] Total jobs parsed:', jobs.length);
      
      if (jobs.length > 0) {
        console.log('[PDF Import] First job example:', jobs[0]);
      }
      
      if (jobs.length === 0) {
        setNotification({
          message: 'No jobs found in this PDF – check parser or file format',
          type: 'error',
        });
        setLoading(false);
        return;
      }
      
      setProgress('Checking for duplicates...');
      
      // Load existing jobs
      const existingJobs = await StorageService.getJobs();
      
      // Import jobs with duplicate handling
      let importedCount = 0;
      let skippedCount = 0;
      
      for (const jobInput of jobs) {
        // Check for duplicates
        if (isDuplicateJob(jobInput, existingJobs)) {
          console.log(`[PDF Import] Skipping duplicate: WIP ${jobInput.wipNumber}, Date ${jobInput.jobDateTime}`);
          skippedCount++;
          continue;
        }
        
        // Convert to Job object
        const job = convertJobInputToJob(jobInput);
        
        // Save job
        await StorageService.saveJob(job);
        importedCount++;
        
        setProgress(`Importing jobs: ${importedCount}/${jobs.length - skippedCount}`);
      }
      
      console.log(`[PDF Import] Import complete: ${importedCount} imported, ${skippedCount} skipped`);
      
      // Show success message
      setNotification({
        message: `Imported ${importedCount} jobs from PDF (${skippedCount} skipped as duplicates)`,
        type: 'success',
      });
      
      // Navigate to jobs screen after a delay
      setTimeout(() => {
        router.replace('/jobs');
      }, 2000);
      
    } catch (error) {
      console.error('[PDF Import] Error importing PDF:', error);
      setNotification({
        message: error instanceof Error ? error.message : 'Failed to import PDF',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Import Tech Records PDF</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardIcon, { color: colors.primary }]}>📄</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {loading ? 'Importing...' : 'Import PDF'}
          </Text>
          
          {!loading && (
            <>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                Upload a technician PDF to automatically create job records with the exact original date & time, WIP, reg, VHC, description and AWs.
              </Text>

              <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Expected PDF Format:</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  The PDF should contain a table with columns:{'\n\n'}
                  - WIP NUMBER (5 digits){'\n'}
                  - VEHICLE REG (UK plate){'\n'}
                  - VHC (Green/Orange/Red/N/A){'\n'}
                  - JOB DESCRIPTION{'\n'}
                  - AWS (numeric){'\n'}
                  - TIME (e.g., &quot;2h 0m&quot;){'\n'}
                  - DATE & TIME (DD/MM/YYYY HH:mm)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handlePickAndImportPDF}
              >
                <Text style={styles.buttonText}>📄 Select & Import PDF</Text>
              </TouchableOpacity>
            </>
          )}

          {loading && (
            <>
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              
              {progress && (
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {progress}
                </Text>
              )}
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
              ✓ Preserves original date & time from records
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Duplicate detection (same WIP + date)
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ VHC status mapping (Green/Orange/Red/N/A)
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Automatic AWS to time conversion (1 AW = 5 min)
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ UK registration plate validation
            </Text>
            <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
              ✓ Detailed import logging
            </Text>
          </View>
        </View>

        <View style={[styles.exampleCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.exampleTitle, { color: colors.text }]}>Example PDF Row:</Text>
          <View style={[styles.exampleBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
              26173 L4JSG Green Seatbelt recall, vhc 6 0h 30m 17/11/2025 15:49
            </Text>
          </View>
          <Text style={[styles.exampleDescription, { color: colors.textSecondary }]}>
            This will create a job with:{'\n'}
            • WIP: 26173{'\n'}
            • Reg: L4JSG{'\n'}
            • VHC: Green{'\n'}
            • Description: Seatbelt recall, vhc{'\n'}
            • AWS: 6{'\n'}
            • Date/Time: 17/11/2025 15:49
          </Text>
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
  loader: {
    marginVertical: 24,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
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
  exampleCard: {
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
  exampleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  exampleBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  exampleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
