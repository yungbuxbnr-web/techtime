
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import NotificationToast from '../components/NotificationToast';
import * as DocumentPicker from 'expo-document-picker';
import {
  importPdfProgressively,
  ImportProgress,
  PdfJobInput,
} from '../src/services/progressivePdfImportService';

export default function PDFImportScreen() {
  const { colors } = useTheme();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false,
  });
  const [recentJobs, setRecentJobs] = useState<PdfJobInput[]>([]);

  const handlePickAndImportPDF = useCallback(async () => {
    try {
      setImporting(true);
      setRecentJobs([]);
      setProgress(null);
      
      console.log('[PDF Import] Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[PDF Import] Document picker cancelled');
        setImporting(false);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        setNotification({
          message: 'No file selected',
          type: 'error',
          visible: true,
        });
        setImporting(false);
        return;
      }

      const file = result.assets[0];
      console.log('[PDF Import] PDF file selected:', file.name, file.uri);
      
      // Start progressive import
      const importResult = await importPdfProgressively(
        file.uri,
        (progressUpdate: ImportProgress) => {
          setProgress(progressUpdate);
          
          // Keep track of last 5 jobs for display
          if (progressUpdate.currentJobData && progressUpdate.status === 'importing') {
            setRecentJobs(prev => {
              const updated = [progressUpdate.currentJobData!, ...prev];
              return updated.slice(0, 5);
            });
          }
        }
      );

      console.log('[PDF Import] Import complete:', importResult);
      
      setNotification({
        message: `Successfully imported ${importResult.imported} jobs! (${importResult.skipped} skipped, ${importResult.errors} errors)`,
        type: 'success',
        visible: true,
      });
      
      // Navigate to jobs screen after a short delay
      setTimeout(() => {
        router.replace('/jobs');
      }, 2500);
      
    } catch (error) {
      console.error('[PDF Import] Error importing PDF:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Could not read PDF text. Please make sure this is a Tech Records PDF export.';
      
      setNotification({
        message: errorMessage,
        type: 'error',
        visible: true,
      });
      
      // Reset progress on error
      setProgress(null);
      setRecentJobs([]);
    } finally {
      setImporting(false);
    }
  }, []);

  const getStatusColor = (status: ImportProgress['status']) => {
    switch (status) {
      case 'parsing':
        return colors.primary;
      case 'importing':
        return colors.success;
      case 'complete':
        return colors.success;
      case 'error':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getVhcColor = (vhcStatus: string) => {
    switch (vhcStatus) {
      case 'GREEN':
        return '#10b981';
      case 'ORANGE':
        return '#f59e0b';
      case 'RED':
        return '#ef4444';
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Import Tech Records PDF</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!importing && !progress && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardIcon, { color: colors.primary }]}>📄</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Import PDF</Text>
              
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
                disabled={importing}
              >
                <Text style={styles.buttonText}>
                  {importing ? '⏳ Processing...' : '📄 Select & Import PDF'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.featuresTitle, { color: colors.text }]}>Features:</Text>
              <View style={styles.featuresList}>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Real-time progress tracking
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Job-by-job import with live display
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Automatic duplicate detection
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Preserves original date & time
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ VHC status mapping
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Automatic AWS to time conversion
                </Text>
              </View>
            </View>
          </>
        )}

        {importing && progress && (
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              {progress.status === 'parsing' && '📖 Parsing PDF...'}
              {progress.status === 'importing' && '⚙️ Importing Jobs...'}
              {progress.status === 'complete' && '✅ Import Complete!'}
              {progress.status === 'error' && '❌ Import Failed'}
            </Text>

            {/* Progress Bar */}
            <View style={[styles.progressBarContainer, { backgroundColor: colors.background }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: getStatusColor(progress.status),
                    width: `${progress.percentage}%`,
                  },
                ]}
              />
            </View>

            <Text style={[styles.progressPercentage, { color: colors.text }]}>
              {progress.percentage}%
            </Text>

            {progress.totalJobs > 0 && (
              <Text style={[styles.progressCount, { color: colors.textSecondary }]}>
                {progress.currentJob} / {progress.totalJobs} jobs processed
              </Text>
            )}

            <Text style={[styles.progressMessage, { color: colors.textSecondary }]}>
              {progress.message}
            </Text>

            {/* Recent Jobs Display */}
            {recentJobs.length > 0 && (
              <View style={styles.recentJobsContainer}>
                <Text style={[styles.recentJobsTitle, { color: colors.text }]}>
                  Recently Added:
                </Text>
                {recentJobs.map((job, index) => (
                  <View
                    key={`${job.wipNumber}-${index}`}
                    style={[
                      styles.jobItem,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.jobItemHeader}>
                      <Text style={[styles.jobItemWip, { color: colors.text }]}>
                        WIP: {job.wipNumber}
                      </Text>
                      <View
                        style={[
                          styles.vhcBadge,
                          { backgroundColor: getVhcColor(job.vhcStatus) },
                        ]}
                      >
                        <Text style={styles.vhcBadgeText}>{job.vhcStatus}</Text>
                      </View>
                    </View>
                    <Text style={[styles.jobItemReg, { color: colors.textSecondary }]}>
                      {job.vehicleReg}
                    </Text>
                    <Text
                      style={[styles.jobItemDesc, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {job.description}
                    </Text>
                    <View style={styles.jobItemFooter}>
                      <Text style={[styles.jobItemAws, { color: colors.primary }]}>
                        {job.aws} AWs
                      </Text>
                      <Text style={[styles.jobItemTime, { color: colors.textSecondary }]}>
                        {new Date(job.jobDateTime).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Error state */}
            {progress.status === 'error' && (
              <View style={[styles.errorBox, { backgroundColor: colors.background, borderColor: colors.error }]}>
                <Text style={[styles.errorIcon, { color: colors.error }]}>⚠️</Text>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {progress.message}
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setProgress(null);
                    setRecentJobs([]);
                    setImporting(false);
                  }}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
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
  contentContainer: {
    paddingBottom: 100,
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
  progressCard: {
    margin: 16,
    borderRadius: 12,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressCount: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  recentJobsContainer: {
    marginTop: 24,
  },
  recentJobsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  jobItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  jobItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobItemWip: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vhcBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vhcBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobItemReg: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobItemDesc: {
    fontSize: 14,
    marginBottom: 8,
  },
  jobItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobItemAws: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobItemTime: {
    fontSize: 12,
  },
  errorBox: {
    marginTop: 24,
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
