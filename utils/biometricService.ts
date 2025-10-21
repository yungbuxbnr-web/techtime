
import * as LocalAuthentication from 'expo-local-authentication';
import { StorageService } from './storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export const BiometricService = {
  // Check if biometric hardware is available
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Biometric hardware available:', hasHardware, 'Enrolled:', isEnrolled);
      return hasHardware && isEnrolled;
    } catch (error) {
      console.log('Error checking biometric availability:', error);
      return false;
    }
  },

  // Get supported authentication types
  async getSupportedTypes(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const typeNames: string[] = [];
      
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        typeNames.push('Fingerprint');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        typeNames.push('Face ID');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        typeNames.push('Iris');
      }
      
      console.log('Supported biometric types:', typeNames);
      return typeNames;
    } catch (error) {
      console.log('Error getting supported types:', error);
      return [];
    }
  },

  // Authenticate user with biometrics
  async authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device'
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to access the app',
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('Biometric authentication successful');
        return { success: true };
      } else {
        console.log('Biometric authentication failed:', result.error);
        return {
          success: false,
          error: result.error || 'Authentication failed'
        };
      }
    } catch (error) {
      console.log('Error during biometric authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Check if biometric login is enabled
  async isBiometricLoginEnabled(): Promise<boolean> {
    try {
      const settings = await StorageService.getSettings();
      return settings.biometricEnabled || false;
    } catch (error) {
      console.log('Error checking biometric login status:', error);
      return false;
    }
  },

  // Enable biometric login
  async enableBiometricLogin(): Promise<{ success: boolean; message: string }> {
    try {
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        return {
          success: false,
          message: 'Biometric authentication is not available on this device. Please ensure you have set up fingerprint or Face ID in your device settings.'
        };
      }

      // Test authentication before enabling
      const authResult = await this.authenticate('Verify your identity to enable biometric login');
      
      if (!authResult.success) {
        return {
          success: false,
          message: authResult.error || 'Authentication failed'
        };
      }

      // Save biometric enabled setting
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, biometricEnabled: true });
      
      console.log('Biometric login enabled successfully');
      return {
        success: true,
        message: 'Biometric login enabled successfully'
      };
    } catch (error) {
      console.log('Error enabling biometric login:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to enable biometric login'
      };
    }
  },

  // Disable biometric login
  async disableBiometricLogin(): Promise<{ success: boolean; message: string }> {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, biometricEnabled: false });
      
      console.log('Biometric login disabled successfully');
      return {
        success: true,
        message: 'Biometric login disabled successfully'
      };
    } catch (error) {
      console.log('Error disabling biometric login:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to disable biometric login'
      };
    }
  },

  // Get security level
  async getSecurityLevel(): Promise<string> {
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      
      switch (level) {
        case LocalAuthentication.SecurityLevel.NONE:
          return 'None';
        case LocalAuthentication.SecurityLevel.SECRET:
          return 'PIN/Pattern';
        case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
          return 'Weak Biometric';
        case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
          return 'Strong Biometric';
        default:
          return 'Unknown';
      }
    } catch (error) {
      console.log('Error getting security level:', error);
      return 'Unknown';
    }
  }
};
