
/**
 * Expo Config Plugin: Fix React Extension Build.gradle
 * 
 * This plugin removes the unsupported 'enableBundleCompression' property
 * from the react {} block in android/app/build.gradle.
 * 
 * The enableBundleCompression property is not supported in React Native 0.76.6
 * with the current ReactExtension version used by Expo.
 */

const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Removes the enableBundleCompression line from the react {} block
 * @param {string} buildGradle - The build.gradle content
 * @returns {string} - Modified build.gradle content
 */
function removeEnableBundleCompression(buildGradle) {
  console.log('🔧 Fixing React Extension in build.gradle...');
  
  // Remove the enableBundleCompression line and any surrounding whitespace
  const fixed = buildGradle.replace(
    /\s*enableBundleCompression\s*=\s*[^\n]+\n?/g,
    ''
  );
  
  // Also remove any duplicate empty lines in the react block
  const cleaned = fixed.replace(/(\n\s*){3,}/g, '\n\n');
  
  if (fixed !== buildGradle) {
    console.log('✅ Removed enableBundleCompression from react {} block');
  } else {
    console.log('ℹ️  No enableBundleCompression found (already clean)');
  }
  
  return cleaned;
}

/**
 * Config plugin to fix the React Extension configuration
 */
const withFixedReactExtension = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = removeEnableBundleCompression(
        config.modResults.contents
      );
    }
    return config;
  });
};

module.exports = withFixedReactExtension;
