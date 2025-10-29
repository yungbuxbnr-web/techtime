
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { GoogleDriveService, GoogleDriveFile } from '../utils/googleDriveService';
import { ImportTallyService, ImportTallyData } from '../utils/importTallyService';
import NotificationToast from './NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

interface GoogleDriveImportTallyProps {
  onClose?: () => void;
}

const GoogleDriveImportTally: React.FC<GoogleDriveImportTallyProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupFiles, setBackupFiles] = useState<GoogleDriveFile[]>([]);
  const [tallyData, setTallyData] = useState<ImportTallyData | null>(null);
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, visible: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const loadBackupFiles = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const result = await GoogleDriveService.listBackups(token);
      if (result.success) {
        setBackupFiles(result.files);
        if (result.files.length === 0) {
          showNotification('No backup files found in Google Drive', 'info');
        }
      } else {
        showNotification(result.message || 'Failed to load backup files', 'error');
      }
    } catch (error) {
      console.log('Error loading backup files:', error);
      showNotification('Failed to load backup files', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  const checkAuthAndLoadFiles = useCallback(async () => {
    const authenticated = await GoogleDriveService.isAuthenticated();
    if (authenticated) {
      const token = await GoogleDriveService.getCurrentToken();
      if (token) {
        setIsAuthenticated(true);
        setAccessToken(token);
        await loadBackupFiles(token);
      }
    }
  }, [loadBackupFiles]);

  useEffect(() => {
    checkAuthAndLoadFiles();
  }, [checkAuthAndLoadFiles]);

  const handleAuthenticate = async () => {
    setIsLoading(true);
    try {
      const result = await GoogleDriveService.authenticate();
      if (result.success && result.accessToken) {
        setIsAuthenticated(true);
        setAccessToken(result.accessToken);
        showNotification('Successfully authenticated with Google Drive!', 'success');
        await loadBackupFiles(result.accessToken);
      } else {
        showNotification(result.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.log('Authentication error:', error);
      showNotification('Authentication failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportAndTally = async (file: GoogleDriveFile) => {
    if (!accessToken) {
      showNotification('Please authenticate first', 'error');
      return;
    }

    setIsLoading(true);
    setSelectedFile(file);
    try {
      const result = await ImportTallyService.importAndTallyFromGoogleDrive(
        accessToken,
        file.id,
        file.name
      );

      if (result.success && result.data) {
        setTallyData(result.data);
        showNotification(result.message, 'success');
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.log('Error importing and tallying:', error);
      showNotification('Failed to import and tally data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSummaryReport = () => {
    if (!tallyData) return;

    const report = ImportTallyService.generateSummaryReport(tallyData);
    Alert.alert(
      'Import Summary Report',
      report,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Copy Report',
          onPress: () => {
            // In a real app, you'd copy to clipboard
            showNotification('Report copied to clipboard', 'success');
          }
        }
      ],
      { cancelable: true }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const styles = createStyles(colors, screenHeight);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <NotificationToast
          message={notification.message}
          type={notification.type}
          visible={notification.visible}
          onHide={hideNotification}
        />

        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>Import & Tally</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.authSection}>
          <Text style={styles.sectionTitle}>Authentication Required</Text>
          <Text style={styles.description}>
            Sign in to your Google account to import and analyze your TechTrace backup files.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleAuthenticate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign in to Google Drive</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>Import & Tally</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {!tallyData ? (
          <View>
            <Text style={styles.sectionTitle}>Select Backup File to Analyze</Text>
            <Text style={styles.description}>
              Choose a backup file from Google Drive to import and generate detailed statistics.
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => accessToken && loadBackupFiles(accessToken)}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Refresh File List</Text>
            </TouchableOpacity>

            {backupFiles.length > 0 ? (
              <View style={styles.fileList}>
                {backupFiles.map((file) => (
                  <View key={file.id} style={styles.fileItem}>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
                      <Text style={styles.fileDate}>
                        Modified: {formatDate(file.modifiedTime)}
                      </Text>
                      {file.size && (
                        <Text style={styles.fileSize}>
                          Size: {Math.round(parseInt(file.size) / 1024)} KB
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.importButton]}
                      onPress={() => handleImportAndTally(file)}
                      disabled={isLoading}
                    >
                      {isLoading && selectedFile?.id === file.id ? (
                        <ActivityIndicator color={colors.background} size="small" />
                      ) : (
                        <Text style={styles.actionButtonText}>Import</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No backup files found in Google Drive
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Make sure you have created backups and they are uploaded to your Google Drive.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tallyResults}>
            <View style={styles.tallyHeader}>
              <Text style={styles.sectionTitle}>Import Analysis Complete</Text>
              <TouchableOpacity
                style={styles.newAnalysisButton}
                onPress={() => {
                  setTallyData(null);
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.newAnalysisButtonText}>New Analysis</Text>
              </TouchableOpacity>
            </View>

            {/* File Information */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>File Information</Text>
              <Text style={styles.infoText}>Name: {tallyData.backupInfo.fileName}</Text>
              <Text style={styles.infoText}>Size: {tallyData.backupInfo.fileSize}</Text>
              <Text style={styles.infoText}>
                Created: {formatDate(tallyData.backupInfo.createdDate)}
              </Text>
              <Text style={styles.infoText}>
                Modified: {formatDate(tallyData.backupInfo.modifiedDate)}
              </Text>
            </View>

            {/* Job Statistics */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Job Statistics</Text>
              <Text style={styles.statText}>Total Jobs: {tallyData.jobStats.totalJobs}</Text>
              <Text style={styles.statText}>Total AWs: {tallyData.jobStats.totalAWs}</Text>
              <Text style={styles.statText}>Total Time: {tallyData.jobStats.totalTimeFormatted}</Text>
              <Text style={styles.statText}>Average AWs/Job: {tallyData.jobStats.averageAWsPerJob}</Text>
              <Text style={styles.statText}>Date Span: {tallyData.jobStats.dateRange.span}</Text>
            </View>

            {/* Performance Metrics */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Performance Metrics</Text>
              <Text style={styles.statText}>Target Hours: {tallyData.performanceMetrics.targetHours}h</Text>
              <Text style={styles.statText}>Actual Hours: {tallyData.performanceMetrics.actualHours}h</Text>
              <Text style={styles.statText}>Utilization: {tallyData.performanceMetrics.utilizationPercentage}%</Text>
              <Text style={styles.statText}>Remaining: {tallyData.performanceMetrics.remainingHours}h</Text>
              <Text style={[styles.statText, { color: tallyData.performanceMetrics.efficiency === 'Above Target' ? colors.success || colors.primary : tallyData.performanceMetrics.efficiency === 'On Target' ? colors.primary : colors.error || '#DC3545' }]}>
                Efficiency: {tallyData.performanceMetrics.efficiency}
              </Text>
            </View>

            {/* Monthly Breakdown */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Monthly Breakdown</Text>
              {Object.entries(tallyData.monthlyBreakdown)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([monthYear, data]) => (
                  <View key={monthYear} style={styles.breakdownItem}>
                    <Text style={styles.breakdownMonth}>{formatMonthYear(monthYear)}</Text>
                    <Text style={styles.breakdownStats}>
                      {data.jobs} jobs • {data.aws} AWs • {data.timeFormatted}
                    </Text>
                  </View>
                ))}
            </View>

            {/* Top Vehicles */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Top Vehicles by Jobs</Text>
              {Object.entries(tallyData.vehicleBreakdown)
                .sort(([, a], [, b]) => b.jobs - a.jobs)
                .slice(0, 10)
                .map(([registration, data]) => (
                  <View key={registration} style={styles.breakdownItem}>
                    <Text style={styles.breakdownVehicle}>{registration}</Text>
                    <Text style={styles.breakdownStats}>
                      {data.jobs} jobs • {data.aws} AWs • {data.timeFormatted}
                    </Text>
                  </View>
                ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleViewSummaryReport}
              >
                <Text style={styles.buttonText}>View Summary Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, screenHeight: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxHeight: Math.min(screenHeight * 0.92, 800),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '300',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  authSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 200,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  fileList: {
    marginTop: 16,
  },
  fileItem: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  fileDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  importButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tallyResults: {
    flex: 1,
  },
  tallyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  newAnalysisButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newAnalysisButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  statText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
    fontWeight: '500',
    lineHeight: 20,
  },
  breakdownItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  breakdownMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  breakdownVehicle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  breakdownStats: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionButtons: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default GoogleDriveImportTally;
