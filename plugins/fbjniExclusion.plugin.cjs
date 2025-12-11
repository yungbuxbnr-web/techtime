
const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix duplicate fbjni classes
 * 
 * This plugin excludes the old fbjni-java-only module from all React Native
 * dependencies to prevent duplicate class errors during Android builds.
 * 
 * Error fixed:
 * Duplicate class com.facebook.jni.* found in modules:
 * - fbjni-0.7.0.aar (com.facebook.fbjni:fbjni:0.7.0)
 * - fbjni-java-only-0.3.0.jar (com.facebook.fbjni:fbjni-java-only:0.3.0)
 */

const withFbjniExclusion = (config) => {
  return withAppBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;

      // Step 1: Remove any existing fbjni-java-only implementation if present
      buildGradle = buildGradle.replace(
        /\s*implementation\s+['"]com\.facebook\.fbjni:fbjni-java-only:0\.3\.0['"]\s*/g,
        ''
      );

      // Step 2: Add global exclusion for fbjni-java-only
      const globalExclusionBlock = `
    // Exclude fbjni-java-only globally to prevent duplicate classes
    configurations.all {
        exclude group: 'com.facebook.fbjni', module: 'fbjni-java-only'
    }
`;

      // Check if global exclusion already exists
      if (!buildGradle.includes('configurations.all')) {
        // Find the android block and add the exclusion after it
        const androidBlockRegex = /android\s*\{/;
        if (androidBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            androidBlockRegex,
            `android {${globalExclusionBlock}`
          );
          console.log('✅ Added global fbjni-java-only exclusion to app/build.gradle');
        }
      }

      // Step 3: Add explicit exclusions for known React Native libraries
      const librariesToExclude = [
        'react-native-reanimated',
        'react-native-screens',
        'react-native-gesture-handler',
        'react-native-svg',
        'react-native-webview',
        'react-native-safe-area-context',
      ];

      librariesToExclude.forEach(library => {
        // Check if the library is already in dependencies
        const libraryRegex = new RegExp(`implementation\\(project\\(['"]:\\${library}['"]\\)\\)`, 'g');
        
        if (libraryRegex.test(buildGradle)) {
          // Replace simple implementation with exclusion
          buildGradle = buildGradle.replace(
            libraryRegex,
            `implementation(project(':${library}')) {
        exclude group: 'com.facebook.fbjni', module: 'fbjni-java-only'
    }`
          );
        }
      });

      config.modResults.contents = buildGradle;
      console.log('✅ Applied fbjni exclusions to React Native libraries');

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring fbjni exclusions:', error.message);
      return config;
    }
  });
};

module.exports = withFbjniExclusion;
