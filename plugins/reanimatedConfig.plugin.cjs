
const { withAppBuildGradle, withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for React Native Reanimated
 * 
 * This plugin ensures proper configuration for react-native-reanimated on Android
 * to prevent build errors related to Node execution and Gradle evaluation.
 */

const withReanimatedConfig = (config) => {
  // Step 1: Add fbjni dependency to android/app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;

      // Check if fbjni dependency already exists
      if (!buildGradle.includes("implementation 'com.facebook.fbjni:fbjni-java-only:0.3.0'")) {
        // Find the dependencies block and add fbjni
        const dependenciesRegex = /dependencies\s*\{/;
        if (dependenciesRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            dependenciesRegex,
            `dependencies {
    // React Native Reanimated - FBJNI dependency
    implementation 'com.facebook.fbjni:fbjni-java-only:0.3.0'`
          );
          config.modResults.contents = buildGradle;
          console.log('✅ Added fbjni dependency to app/build.gradle');
        }
      }

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

  // Step 3: Add Gradle properties for Reanimated
  config = withGradleProperties(config, (config) => {
    try {
      config.modResults = config.modResults || [];

      const reanimatedSettings = [
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

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring gradle.properties:', error.message);
      return config;
    }
  });

  return config;
};

module.exports = withReanimatedConfig;
