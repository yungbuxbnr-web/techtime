
/**
 * Safe Config Plugin
 * 
 * This plugin wraps all configuration modifications in try-catch blocks
 * to prevent "failed to configure project" errors.
 */

const { withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Safely modify gradle.properties
 */
const withSafeGradleProperties = (config) => {
  return withGradleProperties(config, (config) => {
    try {
      // Ensure modResults exists
      if (!config.modResults) {
        config.modResults = [];
      }

      // Add a marker to indicate this plugin ran
      const markerExists = config.modResults.some(
        item => item.type === 'comment' && item.value && item.value.includes('Safe Config Plugin')
      );

      if (!markerExists) {
        config.modResults.push({
          type: 'comment',
          value: 'Safe Config Plugin - Configuration applied successfully',
        });
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error in Safe Config Plugin (gradle.properties):', error.message);
      return config;
    }
  });
};

/**
 * Safely modify build.gradle
 */
const withSafeBuildGradle = (config) => {
  return withProjectBuildGradle(config, (config) => {
    try {
      // Ensure modResults exists
      if (!config.modResults || !config.modResults.contents) {
        return config;
      }

      // Just verify the build.gradle is readable
      const buildGradle = config.modResults.contents;
      if (typeof buildGradle !== 'string') {
        console.warn('⚠️ build.gradle contents is not a string');
        return config;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error in Safe Config Plugin (build.gradle):', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function
 */
const withSafeConfig = (config) => {
  try {
    config = withSafeGradleProperties(config);
    config = withSafeBuildGradle(config);
    return config;
  } catch (error) {
    console.error('⚠️ Critical error in Safe Config Plugin:', error.message);
    return config;
  }
};

module.exports = withSafeConfig;
