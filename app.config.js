
/**
 * Expo App Configuration
 * 
 * This file provides better environment variable handling
 * and prevents build failures when NODE_ENV or other variables are not set.
 */

const NODE_ENV = process.env.NODE_ENV || 'production';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';
const isCI = process.env.CI === 'true' || process.env.EAS_BUILD === 'true';

if (isDevelopment && !isCI) {
  console.log('📱 Expo Config - Environment:', NODE_ENV);
}

module.exports = {
  expo: {
    name: process.env.APP_NAME || 'TechTime',
    slug: process.env.APP_SLUG || 'TechTime',
    owner: process.env.EXPO_OWNER || 'bnr',
    version: process.env.APP_VERSION || '1.0.1',
    orientation: 'portrait',
    icon: './assets/images/5c3d6d8a-b297-4144-9fb0-3bacfdd1857a.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'techtime',
    splash: {
      image: './assets/images/5c3d6d8a-b297-4144-9fb0-3bacfdd1857a.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: process.env.IOS_BUNDLE_ID || 'com.bnr.techtime',
      buildNumber: process.env.IOS_BUILD_NUMBER || '1.0.0',
      deploymentTarget: '13.4',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIFileSharingEnabled: true,
        LSSupportsOpeningDocumentsInPlace: true,
        NSFaceIDUsageDescription: 'We use Face ID to securely authenticate you and protect your technician records. This ensures only you can access your sensitive job data.',
        NSPhotoLibraryUsageDescription: 'We need access to save exported reports to your photo library.',
        NSPhotoLibraryAddUsageDescription: 'We need access to save exported reports to your photo library.',
        NSCameraUsageDescription: 'We need access to your camera to scan vehicle registration plates and job cards for quick data entry.',
        UIBackgroundModes: ['fetch', 'remote-notification', 'processing'],
      },
      jsEngine: 'hermes',
      newArchEnabled: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/5c3d6d8a-b297-4144-9fb0-3bacfdd1857a.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
      package: process.env.ANDROID_PACKAGE || 'com.brcarszw.techtracer',
      versionCode: parseInt(process.env.ANDROID_VERSION_CODE || '2', 10),
      compileSdkVersion: 35,
      targetSdkVersion: 35,
      minSdkVersion: 24,
      permissions: [
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
        'CAMERA',
        'POST_NOTIFICATIONS',
        'SCHEDULE_EXACT_ALARM',
        'RECEIVE_BOOT_COMPLETED',
        'WAKE_LOCK',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
        'READ_MEDIA_AUDIO',
      ],
      blockedPermissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              mimeType: 'application/json',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      jsEngine: 'hermes',
      enableProguardInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
      allowBackup: false,
      softwareKeyboardLayoutMode: 'pan',
      newArchEnabled: true,
    },
    web: {
      favicon: './assets/images/5c3d6d8a-b297-4144-9fb0-3bacfdd1857a.png',
      bundler: 'metro',
    },
    plugins: [
      './plugins/enableNewArchitecture.plugin.cjs',
      './plugins/kotlinVersion.plugin.cjs',
      './plugins/gradleWrapperConfig.plugin.cjs',
      './plugins/cppBuildConfig.plugin.cjs',
      './plugins/fbjniExclusion.plugin.cjs',
      './plugins/androidOptimization.plugin.cjs',
      'expo-font',
      'expo-router',
      'expo-web-browser',
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Allow TechTime to use Face ID to authenticate you and protect your technician records. This ensures only you can access your sensitive job data.',
        },
      ],
      'expo-document-picker',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow TechTime to access your camera to scan vehicle registration plates and job cards for quick data entry.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/5c3d6d8a-b297-4144-9fb0-3bacfdd1857a.png',
          color: '#ffffff',
          sounds: [],
          mode: isProduction ? 'production' : 'development',
          enableBackgroundRemoteNotifications: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: process.env.EXPO_PROJECT_ID || undefined,
      },
    },
  },
};
