
import { Dimensions, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface ScreenResolution {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  isTablet: boolean;
  deviceType: 'phone' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelDensity: 'ldpi' | 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';
}

export const ScreenResolutionService = {
  // Get current screen resolution and device info
  getCurrentResolution(): ScreenResolution {
    const { width, height } = Dimensions.get('window');
    const { scale, fontScale } = Dimensions.get('screen');
    
    // Determine if device is tablet
    const isTablet = this.isTabletDevice(width, height, scale);
    
    // Determine device type
    const deviceType = this.getDeviceType(width, height, isTablet);
    
    // Determine orientation
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Determine pixel density
    const pixelDensity = this.getPixelDensity(scale);
    
    return {
      width,
      height,
      scale,
      fontScale,
      isTablet,
      deviceType,
      orientation,
      pixelDensity
    };
  },

  // Check if device is tablet based on screen dimensions and scale
  isTabletDevice(width: number, height: number, scale: number): boolean {
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    
    // Calculate physical dimensions in inches
    const minInches = minDimension / (160 * scale);
    const maxInches = maxDimension / (160 * scale);
    
    // Consider it a tablet if the smaller dimension is >= 7 inches
    // or if the aspect ratio suggests a tablet form factor
    const isLargeScreen = minInches >= 7;
    const aspectRatio = maxDimension / minDimension;
    const isTabletAspectRatio = aspectRatio < 2.0; // Tablets usually have less extreme aspect ratios
    
    // Additional check for common tablet resolutions
    const commonTabletSizes = [
      { w: 768, h: 1024 }, // iPad
      { w: 800, h: 1280 }, // Android tablets
      { w: 1200, h: 1920 }, // Large Android tablets
      { w: 834, h: 1194 }, // iPad Air
      { w: 1024, h: 1366 }, // iPad Pro
    ];
    
    const isCommonTabletSize = commonTabletSizes.some(size => 
      (Math.abs(width - size.w) < 50 && Math.abs(height - size.h) < 50) ||
      (Math.abs(width - size.h) < 50 && Math.abs(height - size.w) < 50)
    );
    
    return isLargeScreen || (isTabletAspectRatio && minInches >= 5.5) || isCommonTabletSize;
  },

  // Determine device type
  getDeviceType(width: number, height: number, isTablet: boolean): 'phone' | 'tablet' | 'desktop' {
    if (Platform.OS === 'web') {
      // On web, consider it desktop if screen is very large
      const minDimension = Math.min(width, height);
      if (minDimension >= 1024) return 'desktop';
      if (isTablet) return 'tablet';
      return 'phone';
    }
    
    return isTablet ? 'tablet' : 'phone';
  },

  // Get pixel density category
  getPixelDensity(scale: number): 'ldpi' | 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi' {
    if (scale <= 0.75) return 'ldpi';
    if (scale <= 1.0) return 'mdpi';
    if (scale <= 1.5) return 'hdpi';
    if (scale <= 2.0) return 'xhdpi';
    if (scale <= 3.0) return 'xxhdpi';
    return 'xxxhdpi';
  },

  // Get device info using react-native-device-info
  async getDeviceInfo() {
    try {
      const deviceInfo = {
        deviceId: await DeviceInfo.getDeviceId(),
        brand: await DeviceInfo.getBrand(),
        model: await DeviceInfo.getModel(),
        systemName: await DeviceInfo.getSystemName(),
        systemVersion: await DeviceInfo.getSystemVersion(),
        isTablet: await DeviceInfo.isTablet(),
        hasNotch: await DeviceInfo.hasNotch(),
        deviceType: await DeviceInfo.getDeviceType(),
      };
      
      return deviceInfo;
    } catch (error) {
      console.log('Error getting device info:', error);
      return null;
    }
  },

  // Listen for orientation changes
  addOrientationChangeListener(callback: (resolution: ScreenResolution) => void) {
    const subscription = Dimensions.addEventListener('change', () => {
      const newResolution = this.getCurrentResolution();
      callback(newResolution);
    });
    
    return subscription;
  },

  // Get responsive breakpoints
  getBreakpoints() {
    const { width } = Dimensions.get('window');
    
    return {
      isSmall: width < 576,
      isMedium: width >= 576 && width < 768,
      isLarge: width >= 768 && width < 992,
      isExtraLarge: width >= 992,
      isTabletPortrait: width >= 768 && width < 1024,
      isTabletLandscape: width >= 1024,
    };
  },

  // Get safe layout dimensions for different device types
  getSafeLayoutDimensions(): { width: number; height: number; padding: number } {
    const resolution = this.getCurrentResolution();
    const { width, height } = resolution;
    
    let padding = 16; // Default padding
    
    if (resolution.isTablet) {
      padding = 24; // More padding for tablets
    }
    
    if (resolution.deviceType === 'desktop') {
      padding = 32; // Even more padding for desktop
    }
    
    return {
      width: width - (padding * 2),
      height: height - (padding * 2),
      padding
    };
  }
};
