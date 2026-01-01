
/**
 * Expo Config Plugin: Enable New Architecture
 * 
 * This plugin ensures the New Architecture is ENABLED in all relevant places
 * as required by react-native-reanimated 4.0.
 * 
 * react-native-reanimated 4.0 requires New Architecture to be enabled
 * for proper functionality with React Native 0.81.5.
 */

const { withGradleProperties, withAppBuildGradle, withPodfile } = require('@expo/config-plugins');

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
      
      console.log('✅ Set newArchEnabled=true in gradle.properties');
      
      return config;
    } catch (error) {
      console.error('⚠️ Error enabling New Architecture in gradle.properties:', error.message);
      return config;
    }
  });
};

/**
 * Ensure New Architecture is enabled in app/build.gradle
 */
const withEnabledNewArchAppBuildGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;
      let modified = false;

      // Check if there's a react {} block with newArchEnabled
      const reactBlockRegex = /react\s*\{[\s\S]*?\}/;
      const newArchEnabledRegex = /newArchEnabled\s*=\s*false/g;
      
      if (reactBlockRegex.test(buildGradle) && newArchEnabledRegex.test(buildGradle)) {
        // Replace newArchEnabled = false with newArchEnabled = true
        buildGradle = buildGradle.replace(newArchEnabledRegex, 'newArchEnabled = true');
        modified = true;
        console.log('✅ Set newArchEnabled=true in app/build.gradle react {} block');
      }

      // Also check for RCT_NEW_ARCH_ENABLED in buildConfigField or other places
      const rctNewArchRegex = /RCT_NEW_ARCH_ENABLED['"]\s*,\s*["']0["']/g;
      if (rctNewArchRegex.test(buildGradle)) {
        buildGradle = buildGradle.replace(rctNewArchRegex, 'RCT_NEW_ARCH_ENABLED", "1"');
        modified = true;
        console.log('✅ Set RCT_NEW_ARCH_ENABLED=1 in app/build.gradle');
      }

      if (modified) {
        config.modResults.contents = buildGradle;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error enabling New Architecture in app/build.gradle:', error.message);
      return config;
    }
  });
};

/**
 * Ensure New Architecture is enabled in iOS Podfile (if present)
 */
const withEnabledNewArchPodfile = (config) => {
  return withPodfile(config, (config) => {
    try {
      let podfile = config.modResults.contents;
      let modified = false;

      // Check for :newArchEnabled => false
      const newArchFalseRegex = /:newArchEnabled\s*=>\s*false/g;
      if (newArchFalseRegex.test(podfile)) {
        podfile = podfile.replace(newArchFalseRegex, ':newArchEnabled => true');
        modified = true;
        console.log('✅ Set :newArchEnabled => true in Podfile');
      }

      // Check for ENV['RCT_NEW_ARCH_ENABLED'] = '0'
      const envNewArchRegex = /ENV\['RCT_NEW_ARCH_ENABLED'\]\s*=\s*['"]0['"]/g;
      if (envNewArchRegex.test(podfile)) {
        podfile = podfile.replace(envNewArchRegex, "ENV['RCT_NEW_ARCH_ENABLED'] = '1'");
        modified = true;
        console.log('✅ Set RCT_NEW_ARCH_ENABLED=1 in Podfile');
      }

      if (modified) {
        config.modResults.contents = podfile;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error enabling New Architecture in Podfile:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function
 */
const withEnableNewArchitecture = (config) => {
  // Enable in gradle.properties
  config = withEnabledNewArchGradleProperties(config);
  
  // Enable in app/build.gradle
  config = withEnabledNewArchAppBuildGradle(config);
  
  // Enable in Podfile (iOS)
  config = withEnabledNewArchPodfile(config);

  return config;
};

module.exports = withEnableNewArchitecture;
