
/**
 * Expo Config Plugin: Disable New Architecture
 * 
 * This plugin ensures the New Architecture is disabled in all relevant places
 * to fix react-native-reanimated 3.16.1 C++ compilation errors.
 * 
 * Errors fixed:
 * - ShadowNode::Shared is deprecated (treated as error due to -Werror)
 * - react/utils/CoreFeatures.h file not found
 * 
 * Root cause: react-native-reanimated 3.16.1 is NOT compatible with RN 0.81.5
 * when New Architecture is enabled. Disabling New Architecture bypasses the
 * Fabric C++ compilation path entirely.
 */

const { withGradleProperties, withAppBuildGradle, withPodfile } = require('@expo/config-plugins');

/**
 * Ensure newArchEnabled=false in gradle.properties
 */
const withDisabledNewArchGradleProperties = (config) => {
  return withGradleProperties(config, (config) => {
    try {
      const properties = config.modResults;
      
      // Remove any existing newArchEnabled property
      const existingIndex = properties.findIndex(
        (prop) => prop.type === 'property' && prop.key === 'newArchEnabled'
      );
      
      if (existingIndex >= 0) {
        properties.splice(existingIndex, 1);
      }
      
      // Add newArchEnabled=false
      properties.push({
        type: 'property',
        key: 'newArchEnabled',
        value: 'false',
      });
      
      console.log('✅ Set newArchEnabled=false in gradle.properties');
      
      return config;
    } catch (error) {
      console.error('⚠️ Error disabling New Architecture in gradle.properties:', error.message);
      return config;
    }
  });
};

/**
 * Ensure New Architecture is disabled in app/build.gradle
 */
const withDisabledNewArchAppBuildGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;
      let modified = false;

      // Check if there's a react {} block with newArchEnabled
      const reactBlockRegex = /react\s*\{[\s\S]*?\}/;
      const newArchEnabledRegex = /newArchEnabled\s*=\s*true/g;
      
      if (reactBlockRegex.test(buildGradle) && newArchEnabledRegex.test(buildGradle)) {
        // Replace newArchEnabled = true with newArchEnabled = false
        buildGradle = buildGradle.replace(newArchEnabledRegex, 'newArchEnabled = false');
        modified = true;
        console.log('✅ Set newArchEnabled=false in app/build.gradle react {} block');
      }

      // Also check for RCT_NEW_ARCH_ENABLED in buildConfigField or other places
      const rctNewArchRegex = /RCT_NEW_ARCH_ENABLED['"]\s*,\s*["']1["']/g;
      if (rctNewArchRegex.test(buildGradle)) {
        buildGradle = buildGradle.replace(rctNewArchRegex, 'RCT_NEW_ARCH_ENABLED", "0"');
        modified = true;
        console.log('✅ Set RCT_NEW_ARCH_ENABLED=0 in app/build.gradle');
      }

      if (modified) {
        config.modResults.contents = buildGradle;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error disabling New Architecture in app/build.gradle:', error.message);
      return config;
    }
  });
};

/**
 * Ensure New Architecture is disabled in iOS Podfile (if present)
 */
const withDisabledNewArchPodfile = (config) => {
  return withPodfile(config, (config) => {
    try {
      let podfile = config.modResults.contents;
      let modified = false;

      // Check for :newArchEnabled => true
      const newArchTrueRegex = /:newArchEnabled\s*=>\s*true/g;
      if (newArchTrueRegex.test(podfile)) {
        podfile = podfile.replace(newArchTrueRegex, ':newArchEnabled => false');
        modified = true;
        console.log('✅ Set :newArchEnabled => false in Podfile');
      }

      // Check for ENV['RCT_NEW_ARCH_ENABLED'] = '1'
      const envNewArchRegex = /ENV\['RCT_NEW_ARCH_ENABLED'\]\s*=\s*['"]1['"]/g;
      if (envNewArchRegex.test(podfile)) {
        podfile = podfile.replace(envNewArchRegex, "ENV['RCT_NEW_ARCH_ENABLED'] = '0'");
        modified = true;
        console.log('✅ Set RCT_NEW_ARCH_ENABLED=0 in Podfile');
      }

      if (modified) {
        config.modResults.contents = podfile;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error disabling New Architecture in Podfile:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function
 */
const withDisableNewArchitecture = (config) => {
  // Disable in gradle.properties
  config = withDisabledNewArchGradleProperties(config);
  
  // Disable in app/build.gradle
  config = withDisabledNewArchAppBuildGradle(config);
  
  // Disable in Podfile (iOS)
  config = withDisabledNewArchPodfile(config);

  return config;
};

module.exports = withDisableNewArchitecture;
