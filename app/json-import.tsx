
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
  importJsonProgressively,
  ImportProgress,
  JsonJobInput,
} from '../src/services/jsonImportService';

export default function JSONImportScreen() {
  const { colors } = useTheme();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false,
  });
  const [currentJobDisplay, setCurrentJobDisplay] = useState<JsonJobInput | null>(null);

  const handlePickAndImportJSON = useCallback(async () => {
    try {
      setImporting(true);
      setCurrentJobDisplay(null);
      setProgress(null);
      
      console.log('[JSON Import] Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[JSON Import] Document picker cancelled');
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
      console.log('[JSON Import] JSON file selected:', file.name, file.uri);
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        setNotification({
          message: 'Please select a JSON file',
          type: 'error',
          visible: true,
        });
        setImporting(false);
        return;
      }
      
      // Start progressive import
      const importResult = await importJsonProgressively(
        file.uri,
        (progressUpdate: ImportProgress) => {
          setProgress(progressUpdate);
          
          // Update current job display
          if (progressUpdate.currentJobData && progressUpdate.status === 'importing') {
            setCurrentJobDisplay(progressUpdate.currentJobData);
          }
        }
      );

      console.log('[JSON Import] Import complete:', importResult);
      
      setNotification({
        message: `Successfully imported ${importResult.imported} jobs! (${importResult.skipped} skipped, ${importResult.errors} errors)`,
        type: 'success',
        visible: true,
      });
      
      // Navigate to jobs screen after a short delay
      setTimeout(() => {
        router.replace('/jobs');
      }, 3000);
      
    } catch (error) {
      console.error('[JSON Import] Error importing JSON:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Unable to read JSON file. Please make sure this is a Tech Records JSON export.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setNotification({
        message: errorMessage,
        type: 'error',
        visible: true,
      });
      
      // Reset progress on error
      setProgress(null);
      setCurrentJobDisplay(null);
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
        <Text style={[styles.title, { color: colors.text }]}>Import Tech Records JSON</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!importing && !progress && (
          <React.Fragment>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardIcon, { color: colors.primary }]}>📋</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Import JSON Backup</Text>
              
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                Upload a Tech Records JSON file to automatically import job records with original date & time, WIP, reg, VHC, description and AWs.
              </Text>

              <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Expected JSON Format:</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {`{`}{'\n'}
                  {'  '}&quot;jobs&quot;: [{'\n'}
                  {'    '}{`{`}{'\n'}
                  {'      '}&quot;wipNumber&quot;: &quot;26933&quot;,{'\n'}
                  {'      '}&quot;vehicleReg&quot;: &quot;WA70XYH&quot;,{'\n'}
                  {'      '}&quot;vhcStatus&quot;: &quot;NONE&quot;,{'\n'}
                  {'      '}&quot;description&quot;: &quot;All discs and pads&quot;,{'\n'}
                  {'      '}&quot;aws&quot;: 24,{'\n'}
                  {'      '}&quot;jobDateTime&quot;: &quot;2025-11-28T16:18:00.000Z&quot;{'\n'}
                  {'    '}{`}`}{'\n'}
                  {'  '}]{'\n'}
                  {`}`}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handlePickAndImportJSON}
                disabled={importing}
              >
                <Text style={styles.buttonText}>
                  {importing ? '⏳ Processing...' : '📋 Select & Import JSON'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.featuresTitle, { color: colors.text }]}>Features:</Text>
              <View style={styles.featuresList}>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Job-by-job import with live progress
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Supports up to 1,000 jobs per import
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Real-time progress bar and status
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Automatic duplicate detection
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Preserves original date & time
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ VHC status mapping (GREEN/ORANGE/RED/NONE)
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Automatic AWS to time conversion (1 AW = 5 min)
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  ✓ Takes as long as needed to complete
                </Text>
              </View>
            </View>

            <View style={[styles.troubleshootCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.troubleshootTitle, { color: colors.text }]}>Troubleshooting:</Text>
              <Text style={[styles.troubleshootText, { color: colors.textSecondary }]}>
                If you get an error, please check:{'\n\n'}
                • The file is a valid JSON file (not corrupted){'\n'}
                • The JSON contains a &quot;jobs&quot; array{'\n'}
                • Each job has required fields (wipNumber, vehicleReg){'\n'}
                • The file size is reasonable (under 50MB){'\n'}
                • The JSON syntax is correct (no trailing commas, proper quotes)
              </Text>
            </View>
          </React.Fragment>
        )}

        {importing && progress && (
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              {progress.status === 'parsing' && '📖 Parsing JSON...'}
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
                Job {progress.currentJob} of {progress.totalJobs}
              </Text>
            )}

            <Text style={[styles.progressMessage, { color: colors.textSecondary }]}>
              {progress.message}
            </Text>

            {/* Current Job Display */}
            {currentJobDisplay && progress.status === 'importing' && (
              <View style={[styles.currentJobCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.currentJobTitle, { color: colors.text }]}>
                  Current Job:
                </Text>
                <View style={styles.jobDetailsRow}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textSecondary }]}>WIP:</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.text }]}>
                    {currentJobDisplay.wipNumber}
                  </Text>
                </View>
                <View style={styles.jobDetailsRow}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textSecondary }]}>Reg:</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.text }]}>
                    {currentJobDisplay.vehicleReg}
                  </Text>
                </View>
                <View style={styles.jobDetailsRow}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textSecondary }]}>VHC:</Text>
                  <View
                    style={[
                      styles.vhcBadge,
                      { backgroundColor: getVhcColor(currentJobDisplay.vhcStatus) },
                    ]}
                  >
                    <Text style={styles.vhcBadgeText}>{currentJobDisplay.vhcStatus}</Text>
                  </View>
                </View>
                <View style={styles.jobDetailsRow}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textSecondary }]}>AWs:</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.primary }]}>
                    {currentJobDisplay.aws} ({currentJobDisplay.aws * 5} min)
                  </Text>
                </View>
                <View style={styles.jobDetailsRow}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textSecondary }]}>Description:</Text>
                  <Text
                    style={[styles.jobDetailValue, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {currentJobDisplay.description || 'No description'}
                  </Text>
                </View>
                <View style={styles.jobDetailsRow}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textSecondary }]}>Date:</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.textSecondary }]}>
                    {new Date(currentJobDisplay.jobDateTime).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
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
                    setCurrentJobDisplay(null);
                    setImporting(false);
                  }}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Complete state */}
            {progress.status === 'complete' && (
              <View style={[styles.completeBox, { backgroundColor: colors.background, borderColor: colors.success }]}>
                <Text style={[styles.completeIcon, { color: colors.success }]}>✅</Text>
                <Text style={[styles.completeText, { color: colors.success }]}>
                  Import completed successfully!
                </Text>
                <Text style={[styles.completeDetails, { color: colors.textSecondary }]}>
                  Redirecting to Jobs screen...
                </Text>
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
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
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
  troubleshootCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  troubleshootText: {
    fontSize: 14,
    lineHeight: 22,
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
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressCount: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  currentJobCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  currentJobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  jobDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 100,
  },
  jobDetailValue: {
    fontSize: 14,
    flex: 1,
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
  completeBox: {
    marginTop: 24,
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  completeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  completeText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  completeDetails: {
    fontSize: 14,
    textAlign: 'center',
  },
});
