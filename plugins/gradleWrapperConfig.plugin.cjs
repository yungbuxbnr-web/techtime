
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

        // Only log in non-CI environments to avoid polluting build logs
        if (!isCI && typeof console !== 'undefined' && console.log) {
          console.log(`🔧 Configuring Gradle for ${isCI ? 'CI' : 'local'} environment`);
        }

        // Network timeout settings for better reliability
        const networkSettings = [
          { type: 'property', key: 'systemProp.org.gradle.internal.http.connectionTimeout', value: '120000' },
          { type: 'property', key: 'systemProp.org.gradle.internal.http.socketTimeout', value: '120000' },
          { type: 'property', key: 'systemProp.http.socketTimeout', value: '120000' },
          { type: 'property', key: 'systemProp.http.connectionTimeout', value: '120000' },
        ];

        // Memory settings for Gradle
        const memorySettings = [
          { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8' },
        ];

        // CI-specific settings: Disable daemons and parallel builds to prevent cache locking
        const ciSettings = isCI ? [
          { type: 'property', key: 'org.gradle.daemon', value: 'false' },
          { type: 'property', key: 'org.gradle.parallel', value: 'false' },
          { type: 'property', key: 'org.gradle.configureondemand', value: 'false' },
          { type: 'property', key: 'org.gradle.caching', value: 'false' },
          { type: 'property', key: 'org.gradle.vfs.watch', value: 'false' },
        ] : [
          // Local development settings: Enable daemons for faster builds
          { type: 'property', key: 'org.gradle.daemon', value: 'true' },
          { type: 'property', key: 'org.gradle.parallel', value: 'true' },
          { type: 'property', key: 'org.gradle.configureondemand', value: 'true' },
          { type: 'property', key: 'org.gradle.caching', value: 'true' },
          { type: 'property', key: 'org.gradle.daemon.idletimeout', value: '3600000' },
        ];

        const allSettings = [...networkSettings, ...memorySettings, ...ciSettings];

        // Remove existing settings to avoid duplicates
        config.modResults = config.modResults.filter(
          item => !allSettings.some(setting => setting.key === item.key)
        );

        // Add all settings
        config.modResults.push(...allSettings);

        // Only log in non-CI environments
        if (!isCI && typeof console !== 'undefined' && console.log) {
          console.log('✅ Gradle configuration applied successfully');
        }

        return config;
      } catch (innerError) {
        // If there's an error in the inner function, log it and return the config unchanged
        if (typeof console !== 'undefined' && console.error) {
          console.error('⚠️ Error in Gradle plugin inner function:', innerError.message);
        }
        return config;
      }
    });
  } catch (outerError) {
    // If there's an error in the outer function, log it and return the config unchanged
    if (typeof console !== 'undefined' && console.error) {
      console.error('⚠️ Error in Gradle plugin outer function:', outerError.message);
    }
    return config;
  }
};

module.exports = withGradleWrapperConfig;
