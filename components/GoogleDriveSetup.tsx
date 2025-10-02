
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { colors } from '../styles/commonStyles';

interface GoogleDriveSetupProps {
  onClose?: () => void;
}

const GoogleDriveSetup: React.FC<GoogleDriveSetupProps> = ({ onClose }) => {
  const openGoogleCloudConsole = () => {
    Linking.openURL('https://console.cloud.google.com/');
  };

  const openDriveAPIGuide = () => {
    Linking.openURL('https://developers.google.com/drive/api/quickstart/nodejs');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Google Drive Setup</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Setup Instructions</Text>
          <Text style={styles.description}>
            To enable Google Drive backup, you need to configure Google Cloud Console credentials. 
            This is a one-time setup process.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 1: Create Google Cloud Project</Text>
          <Text style={styles.stepDescription}>
            • Go to Google Cloud Console
            {'\n'}• Create a new project or select an existing one
            {'\n'}• Note down your project ID
          </Text>
          <TouchableOpacity style={styles.linkButton} onPress={openGoogleCloudConsole}>
            <Text style={styles.linkButtonText}>🌐 Open Google Cloud Console</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 2: Enable Google Drive API</Text>
          <Text style={styles.stepDescription}>
            • In your Google Cloud project, go to "APIs & Services" → "Library"
            {'\n'}• Search for "Google Drive API"
            {'\n'}• Click on it and press "Enable"
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 3: Create OAuth 2.0 Credentials</Text>
          <Text style={styles.stepDescription}>
            • Go to "APIs & Services" → "Credentials"
            {'\n'}• Click "Create Credentials" → "OAuth 2.0 Client IDs"
            {'\n'}• Choose "Web application" as application type
            {'\n'}• Add authorized redirect URIs:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>https://auth.expo.io/@your-username/your-app-slug</Text>
            <Text style={styles.codeText}>exp://localhost:19000/--/</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 4: Configure App Credentials</Text>
          <Text style={styles.stepDescription}>
            • Copy your Client ID and Client Secret
            {'\n'}• Update the credentials in googleDriveService.ts:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>const GOOGLE_CLIENT_ID = 'your-client-id';</Text>
            <Text style={styles.codeText}>const GOOGLE_CLIENT_SECRET = 'your-client-secret';</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 5: Test the Integration</Text>
          <Text style={styles.stepDescription}>
            • Rebuild your app after updating the credentials
            {'\n'}• Try the "Sign in to Google Drive" button
            {'\n'}• Grant permissions when prompted
            {'\n'}• Test backup and restore functionality
          </Text>
        </View>

        <View style={styles.warningSection}>
          <Text style={styles.warningTitle}>⚠️ Important Notes</Text>
          <Text style={styles.warningText}>
            • Keep your Client Secret secure and never commit it to version control
            {'\n'}• For production apps, consider using environment variables
            {'\n'}• The OAuth consent screen may need verification for public use
            {'\n'}• Test thoroughly before deploying to users
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.guideButton} onPress={openDriveAPIGuide}>
            <Text style={styles.guideButtonText}>📚 View Official Google Drive API Guide</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.troubleshootTitle}>🔧 Troubleshooting</Text>
          <Text style={styles.troubleshootText}>
            <Text style={styles.bold}>Authentication fails:</Text>
            {'\n'}• Check that redirect URIs are correctly configured
            {'\n'}• Ensure Google Drive API is enabled
            {'\n'}• Verify Client ID and Secret are correct
            {'\n\n'}
            <Text style={styles.bold}>Upload/Download fails:</Text>
            {'\n'}• Check internet connection
            {'\n'}• Verify Google Drive API quotas
            {'\n'}• Ensure proper scopes are requested
            {'\n\n'}
            <Text style={styles.bold}>App crashes:</Text>
            {'\n'}• Check console logs for detailed error messages
            {'\n'}• Ensure all dependencies are properly installed
            {'\n'}• Verify the backup data format is correct
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  codeBlock: {
    backgroundColor: colors.backgroundAlt,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
  },
  linkButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  linkButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  guideButton: {
    backgroundColor: colors.success,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  guideButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  warningSection: {
    backgroundColor: colors.warning + '20',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  troubleshootText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: colors.text,
  },
});

export default GoogleDriveSetup;
