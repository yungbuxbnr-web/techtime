
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { GoogleDriveService, GoogleDriveConfig } from '../utils/googleDriveService';
import NotificationToast from './NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

interface GoogleDriveSetupProps {
  onClose?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GoogleDriveSetup: React.FC<GoogleDriveSetupProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, visible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const openGoogleCloudConsole = () => {
    Linking.openURL('https://console.cloud.google.com/');
  };

  const openDriveAPIGuide = () => {
    Linking.openURL('https://developers.google.com/drive/api/quickstart/nodejs');
  };

  const handleSaveConfig = useCallback(async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      showNotification('Please enter both Client ID and Client Secret', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const config: GoogleDriveConfig = {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      };

      await GoogleDriveService.saveConfig(config);
      showNotification('Google Drive configuration saved successfully!', 'success');
      
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (error) {
      console.log('Error saving config:', error);
      showNotification('Failed to save configuration', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, clientSecret, onClose]);

  const loadExistingConfig = useCallback(async () => {
    try {
      const config = await GoogleDriveService.getConfig();
      if (config) {
        setClientId(config.clientId);
        setClientSecret(config.clientSecret);
        showNotification('Existing configuration loaded', 'info');
      }
    } catch (error) {
      console.log('Error loading config:', error);
    }
  }, []);

  React.useEffect(() => {
    loadExistingConfig();
  }, [loadExistingConfig]);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Google Drive Setup</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Quick Setup Guide</Text>
          <Text style={styles.stepText}>
            Follow these steps to enable Google Drive backup:
          </Text>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepDescription}>
              Go to Google Cloud Console and create a new project (or select existing)
            </Text>
          </View>
          
          <TouchableOpacity style={styles.linkButton} onPress={openGoogleCloudConsole}>
            <Text style={styles.linkButtonText}>🌐 Open Google Cloud Console</Text>
          </TouchableOpacity>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepDescription}>
              Enable the Google Drive API for your project
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepDescription}>
              Create OAuth 2.0 credentials (Web application type)
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>4.</Text>
            <Text style={styles.stepDescription}>
              Add authorized redirect URIs (use the Expo development URL)
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>5.</Text>
            <Text style={styles.stepDescription}>
              Copy your Client ID and Client Secret and enter them below
            </Text>
          </View>

          <TouchableOpacity style={styles.linkButton} onPress={openDriveAPIGuide}>
            <Text style={styles.linkButtonText}>📖 Detailed Setup Guide</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 Configuration</Text>
          
          <Text style={styles.label}>Client ID</Text>
          <TextInput
            style={styles.input}
            value={clientId}
            onChangeText={setClientId}
            placeholder="Enter your Google OAuth Client ID"
            placeholderTextColor={colors.textSecondary}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Client Secret</Text>
          <TextInput
            style={styles.input}
            value={clientSecret}
            onChangeText={setClientSecret}
            placeholder="Enter your Google OAuth Client Secret"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.saveButton, (!clientId.trim() || !clientSecret.trim()) && styles.saveButtonDisabled]}
            onPress={handleSaveConfig}
            disabled={isLoading || !clientId.trim() || !clientSecret.trim()}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? '⏳ Saving...' : '💾 Save Configuration'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Important Notes</Text>
          
          <View style={styles.noteItem}>
            <Text style={styles.noteIcon}>🔒</Text>
            <Text style={styles.noteText}>
              Your credentials are stored securely on your device and never shared
            </Text>
          </View>

          <View style={styles.noteItem}>
            <Text style={styles.noteIcon}>🌐</Text>
            <Text style={styles.noteText}>
              Make sure to add the correct redirect URIs in your Google Cloud Console
            </Text>
          </View>

          <View style={styles.noteItem}>
            <Text style={styles.noteIcon}>📱</Text>
            <Text style={styles.noteText}>
              You only need to set this up once per device
            </Text>
          </View>

          <View style={styles.noteItem}>
            <Text style={styles.noteIcon}>🔄</Text>
            <Text style={styles.noteText}>
              After setup, you can select a backup folder and all future backups will go there automatically
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🆘 Need Help?</Text>
          <Text style={styles.helpText}>
            If you encounter issues during setup:
          </Text>
          <Text style={styles.helpText}>
            • Make sure the Google Drive API is enabled
          </Text>
          <Text style={styles.helpText}>
            • Check that your redirect URIs are correct
          </Text>
          <Text style={styles.helpText}>
            • Verify your OAuth credentials are for a "Web application"
          </Text>
          <Text style={styles.helpText}>
            • Try creating a new set of credentials if needed
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  stepText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 10,
    minWidth: 20,
  },
  stepDescription: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  linkButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  linkButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 15,
    minHeight: 40,
  },
  saveButton: {
    backgroundColor: colors.success || colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 10,
    minWidth: 25,
  },
  noteText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default GoogleDriveSetup;
