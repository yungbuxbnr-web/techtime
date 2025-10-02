
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors } from '../styles/commonStyles';

interface GoogleDriveInstructionsProps {
  onSetupGuide?: () => void;
}

const GoogleDriveInstructions: React.FC<GoogleDriveInstructionsProps> = ({ onSetupGuide }) => {
  const showQuickInstructions = () => {
    Alert.alert(
      'Google Drive Setup Required',
      `To enable Google Drive backup, you need to:

1. Create a Google Cloud Console project
2. Enable the Google Drive API
3. Create OAuth 2.0 credentials
4. Update the app configuration

This is a one-time setup process that requires developer access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Detailed Guide', onPress: onSetupGuide },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>☁️</Text>
      </View>
      
      <Text style={styles.title}>Google Drive Backup</Text>
      <Text style={styles.description}>
        Securely backup your TechTrace data to Google Drive for easy access across devices and protection against data loss.
      </Text>

      <View style={styles.featuresContainer}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🔒</Text>
          <Text style={styles.featureText}>Secure OAuth authentication</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>☁️</Text>
          <Text style={styles.featureText}>Automatic cloud storage</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📱</Text>
          <Text style={styles.featureText}>Cross-device synchronization</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🔄</Text>
          <Text style={styles.featureText}>Easy backup & restore</Text>
        </View>
      </View>

      <View style={styles.setupRequired}>
        <Text style={styles.setupTitle}>⚙️ Setup Required</Text>
        <Text style={styles.setupText}>
          Google Drive integration requires one-time configuration with Google Cloud Console credentials.
        </Text>
      </View>

      <TouchableOpacity style={styles.quickButton} onPress={showQuickInstructions}>
        <Text style={styles.quickButtonText}>ℹ️ Quick Setup Info</Text>
      </TouchableOpacity>

      {onSetupGuide && (
        <TouchableOpacity style={styles.guideButton} onPress={onSetupGuide}>
          <Text style={styles.guideButtonText}>📚 View Complete Setup Guide</Text>
        </TouchableOpacity>
      )}

      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          <Text style={styles.noteLabel}>Note:</Text> This feature requires developer-level setup. 
          Local backup is available immediately without any configuration.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  setupRequired: {
    backgroundColor: colors.warning + '20',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 20,
    width: '100%',
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  setupText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  quickButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  quickButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  guideButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  guideButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  noteContainer: {
    backgroundColor: colors.backgroundAlt,
    padding: 12,
    borderRadius: 6,
    width: '100%',
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    textAlign: 'center',
  },
  noteLabel: {
    fontWeight: '600',
    color: colors.text,
  },
});

export default GoogleDriveInstructions;
