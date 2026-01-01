
/**
 * Expo Config Plugin: Enable New Architecture
 * 
 * This plugin ensures the New Architecture is ENABLED in gradle.properties
 * as required by react-native-reanimated 4.1.
 * 
 * CRITICAL: This must be enabled for the app to work properly.
 */

const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Ensure newArchEnabled=true in gradle.properties
 */
const withEnabledNewArchGradleProperties = (config) => {
  return withGradleProperties(config, (config) => {
    try {
      const properties = config.modResults;
      
      // Remove any existing newArchEnabled property
      const existingIndices = [];
      properties.forEach((prop, index) => {
        if (prop.type === 'property' && prop.key === 'newArchEnabled') {
          existingIndices.push(index);
        }
      });
      
      // Remove in reverse order to maintain indices
      existingIndices.reverse().forEach(index => {
        properties.splice(index, 1);
      });
      
      // Add newArchEnabled=true at the end
      properties.push({
        type: 'property',
        key: 'newArchEnabled',
        value: 'true',
      });
      
      console.log('✅ New Architecture enabled in gradle.properties');
      
      return config;
    } catch (error) {
      console.error('⚠️ Error enabling New Architecture:', error.message);
      // Return config anyway to prevent build failure
      return config;
    }
  });
};

/**
 * Main plugin function
 */
const withEnableNewArchitecture = (config) => {
  try {
    config = withEnabledNewArchGradleProperties(config);
    return config;
  } catch (error) {
    console.error('⚠️ Critical error in New Architecture plugin:', error.message);
    // Return config anyway to prevent build failure
    return config;
  }
};

module.exports = withEnableNewArchitecture;
