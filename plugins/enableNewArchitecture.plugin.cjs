
/**
 * Expo Config Plugin: Enable New Architecture
 * 
 * This plugin ensures the New Architecture is ENABLED in all relevant places
 * as required by react-native-reanimated 4.1.
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
      
      // Add newArchEnabled=true
      properties.push({
        type: 'property',
        key: 'newArchEnabled',
        value: 'true',
      });
      
      return config;
    } catch (error) {
      console.error('⚠️ Error enabling New Architecture in gradle.properties:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function - wrapped in try-catch for safety
 */
const withEnableNewArchitecture = (config) => {
  try {
    config = withEnabledNewArchGradleProperties(config);
    return config;
  } catch (error) {
    console.error('⚠️ Critical error in New Architecture plugin:', error.message);
    return config;
  }
};

module.exports = withEnableNewArchitecture;
