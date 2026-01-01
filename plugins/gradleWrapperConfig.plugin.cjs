
const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Enhanced plugin to configure Gradle properties for both local and CI builds
 * Detects CI environment and applies appropriate settings to prevent cache locking
 * 
 * This plugin is designed to be safe and never throw errors during config generation
 */
const withGradleWrapperConfig = (config) => {
  try {
    return withGradleProperties(config, (config) => {
      try {
        config.modResults = config.modResults || [];
        
        // Safely detect if we're in a CI environment
        const isCI = 
          (typeof process !== 'undefined' && process.env && (
            process.env.CI === 'true' || 
            process.env.EAS_BUILD === 'true' || 
            process.env.CONTINUOUS_INTEGRATION === 'true'
          )) || false;

        // Network timeout settings for better reliability
        const networkSettings = [
          { type: 'property', key: 'systemProp.org.gradle.internal.http.connectionTimeout', value: '120000' },
          { type: 'property', key: 'systemProp.org.gradle.internal.http.socketTimeout', value: '120000' },
          { type: 'property', key: 'systemProp.http.socketTimeout', value: '120000' },
          { type: 'property', key: 'systemProp.http.connectionTimeout', value: '120000' },
        ];

        // Memory settings for Gradle - increased for react-native-reanimated
        const memorySettings = [
          { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx6144m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8 -XX:+UseG1GC -XX:ReservedCodeCacheSize=512m' },
        ];

        // CI-specific settings: Disable daemons and parallel builds to prevent cache locking
        const ciSettings = isCI ? [
          { type: 'property', key: 'org.gradle.daemon', value: 'false' },
          { type: 'property', key: 'org.gradle.parallel', value: 'false' },
          { type: 'property', key: 'org.gradle.configureondemand', value: 'false' },
          { type: 'property', key: 'org.gradle.caching', value: 'false' },
          { type: 'property', key: 'org.gradle.vfs.watch', value: 'false' },
          { type: 'property', key: 'org.gradle.configuration-cache', value: 'false' },
          { type: 'property', key: 'org.gradle.unsafe.configuration-cache', value: 'false' },
          { type: 'property', key: 'org.gradle.configuration-cache.problems', value: 'warn' },
        ] : [
          // Local development settings: Enable daemons for faster builds
          { type: 'property', key: 'org.gradle.daemon', value: 'true' },
          { type: 'property', key: 'org.gradle.parallel', value: 'true' },
          { type: 'property', key: 'org.gradle.configureondemand', value: 'true' },
          { type: 'property', key: 'org.gradle.caching', value: 'true' },
          { type: 'property', key: 'org.gradle.daemon.idletimeout', value: '3600000' },
          // CRITICAL: DISABLE configuration cache - it causes "failed to configure project" errors
          { type: 'property', key: 'org.gradle.configuration-cache', value: 'false' },
          { type: 'property', key: 'org.gradle.unsafe.configuration-cache', value: 'false' },
          { type: 'property', key: 'org.gradle.configuration-cache.problems', value: 'warn' },
        ];

        // React Native specific settings
        const rnSettings = [
          { type: 'property', key: 'android.useAndroidX', value: 'true' },
          { type: 'property', key: 'android.enableJetifier', value: 'true' },
          { type: 'property', key: 'hermesEnabled', value: 'true' },
          // Prevent Kotlin auto-upgrade
          { type: 'property', key: 'kotlin.stdlib.default.dependency', value: 'false' },
        ];

        const allSettings = [...networkSettings, ...memorySettings, ...ciSettings, ...rnSettings];

        // Remove existing settings to avoid duplicates (but preserve newArchEnabled, kotlinVersion, and kspVersion)
        config.modResults = config.modResults.filter(
          item => {
            // Keep newArchEnabled, kotlinVersion, kotlin.version, and kspVersion - they're managed by other plugins
            if (item.key === 'newArchEnabled' || 
                item.key === 'kotlinVersion' || 
                item.key === 'kotlin.version' ||
                item.key === 'kspVersion') {
              return true;
            }
            // Remove if we're about to set it
            return !allSettings.some(setting => setting.key === item.key);
          }
        );

        // Add all settings
        config.modResults.push(...allSettings);

        return config;
      } catch (innerError) {
        console.error('⚠️ Error in Gradle plugin inner function:', innerError.message);
        return config;
      }
    });
  } catch (outerError) {
    console.error('⚠️ Error in Gradle plugin outer function:', outerError.message);
    return config;
  }
};

module.exports = withGradleWrapperConfig;
