
const { withAppBuildGradle, withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');
const { execSync } = require('child_process');

/**
 * Expo Config Plugin for React Native Reanimated
 * 
 * This plugin ensures proper configuration for react-native-reanimated on Android
 * to prevent build errors related to Node execution and Gradle evaluation.
 * 
 * Fixes applied:
 * 1. Sets NODE_BINARY in gradle.properties
 * 2. Adds packaging options for .so files
 * 3. Enables reanimatedEnablePackagingOptions in build.gradle
 * 4. Sets proper SDK versions for Gradle 9 compatibility
 */

/**
 * Get the Node.js executable path
 */
function getNodePath() {
  try {
    // Try to get the full path to node
    const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
    if (nodePath) {
      console.log(`✅ Found Node.js at: ${nodePath}`);
      return nodePath;
    }
  } catch (error) {
    console.warn('⚠️ Could not determine Node.js path, using default');
  }
  
  // Fallback to common paths
  const commonPaths = [
    '/usr/local/bin/node',
    '/usr/bin/node',
    '/opt/homebrew/bin/node',
    process.execPath, // Current Node.js executable
  ];
  
  for (const nodePath of commonPaths) {
    try {
      execSync(`${nodePath} --version`, { encoding: 'utf8' });
      console.log(`✅ Using Node.js at: ${nodePath}`);
      return nodePath;
    } catch (error) {
      // Continue to next path
    }
  }
  
  // Ultimate fallback
  console.warn('⚠️ Using fallback Node.js path: node');
  return 'node';
}

const withReanimatedConfig = (config) => {
  // Step 1: Add packaging options to android/app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;

      // Add packaging options for .so files
      if (!buildGradle.includes('pickFirst')) {
        const androidBlockRegex = /android\s*\{/;
        if (androidBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            androidBlockRegex,
            `android {
    packagingOptions {
        pickFirst '**/*.so'
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
    }`
          );
          config.modResults.contents = buildGradle;
          console.log('✅ Added packaging options to app/build.gradle');
        }
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring app/build.gradle:', error.message);
      return config;
    }
  });

  // Step 2: Add reanimatedEnablePackagingOptions to android/build.gradle
  config = withProjectBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;

      // Check if reanimatedEnablePackagingOptions already exists
      if (!buildGradle.includes('reanimatedEnablePackagingOptions')) {
        // Find the buildscript ext block and add the flag
        const extBlockRegex = /buildscript\s*\{[\s\S]*?ext\s*\{/;
        if (extBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            extBlockRegex,
            (match) => `${match}
        reanimatedEnablePackagingOptions = true`
          );
          config.modResults.contents = buildGradle;
          console.log('✅ Added reanimatedEnablePackagingOptions to build.gradle');
        }
      }

      // Ensure proper SDK versions for Gradle 9 compatibility
      if (!buildGradle.includes('compileSdkVersion = 34')) {
        const extBlockRegex = /ext\s*\{/;
        if (extBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            extBlockRegex,
            `ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 21
        compileSdkVersion = 34
        targetSdkVersion = 34
        kotlinVersion = "1.9.22"`
          );
          config.modResults.contents = buildGradle;
          console.log('✅ Updated SDK versions in build.gradle');
        }
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring build.gradle:', error.message);
      return config;
    }
  });

  // Step 3: Add Gradle properties for Reanimated including NODE_BINARY
  config = withGradleProperties(config, (config) => {
    try {
      config.modResults = config.modResults || [];

      // Get the Node.js path
      const nodePath = getNodePath();

      const reanimatedSettings = [
        { type: 'property', key: 'NODE_BINARY', value: nodePath },
        { type: 'property', key: 'reanimated.enablePackagingOptions', value: 'true' },
        { type: 'property', key: 'android.enableJetifier', value: 'true' },
        { type: 'property', key: 'android.useAndroidX', value: 'true' },
      ];

      // Remove existing settings to avoid duplicates
      config.modResults = config.modResults.filter(
        item => !reanimatedSettings.some(setting => setting.key === item.key)
      );

      // Add reanimated settings
      config.modResults.push(...reanimatedSettings);

      console.log('✅ Added Reanimated properties to gradle.properties');
      console.log(`   NODE_BINARY=${nodePath}`);

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring gradle.properties:', error.message);
      return config;
    }
  });

  return config;
};

module.exports = withReanimatedConfig;
